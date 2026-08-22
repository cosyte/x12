/**
 * `get271Eligibility` - extract a typed {@link X12Eligibility} from a
 * parsed X12 005010X279A1 271 Health Care Eligibility Benefit Response.
 * Walks the body via a small state machine guided by the HL tree (the
 * dogfooded loop spec lives in `./loop-spec.ts`). Lenient on parse: every
 * recoverable deviation surfaces as a warning, never a throw. Monetary +
 * quantity fields decode as {@link "../../decimal.js".X12Decimal} (never
 * `parseFloat`). HL parent-pointer integrity is enforced via the shared
 * {@link "../shared/hl.js".validateHl} - mismatches emit
 * `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`; the walker
 * NEVER silently re-numbers the hierarchy.
 *
 * **TRN echo is the safety-critical property of a 271.** Every TRN is
 * captured verbatim onto its enclosing subscriber / dependent so a
 * provider can re-associate the response with the 270 request it sent.
 *
 * **AAA request-validation segments are typed onto the model**, at all four
 * levels, on `result.aaaConditions`. That collection is ALWAYS present and is
 * empty for a document carrying no AAA, so "the payer rejected this inquiry"
 * and "this member has no benefits" are different readings rather than the
 * same empty benefit list. Only the reject reason code and the follow-up
 * action code are read out of the segment, because only those two positions
 * have a recorded source; an element past them warns and is never assigned a
 * meaning. The segments stay on `tx.segments` verbatim exactly as before.
 *
 * Known limitations (documented in CHANGELOG):
 * - **HSD health-service-delivery** detail inside Loop 2110 is not
 *   destructured (the EB benefit line carries the headline fields).
 * - **III injury/illness** + **LS/LE loop markers** are preserved verbatim,
 *   not typed.
 *
 * Spec source: WPC TR3 `005010X279A1` - Health Care Eligibility Benefit
 * Inquiry and Response (270/271).
 */

import type { X12Decimal } from "../../decimal.js";
import { lookupAaaFollowUpAction, lookupAaaRejectReason } from "../../code-lists/aaa.js";
import { lookupServiceType } from "../../code-lists/service-type.js";
import {
  elementDecimal,
  elementOptional,
  elementValue,
  getAllSegmentValues,
  type X12DecimalWarningSink,
  type X12Segment,
} from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import {
  AAA_LEVEL_CONTEXTS,
  aaaLoopUnidentified,
  aaaRejectReasonAbsent,
  aaaSegmentMalformed,
  aaaUnknownCode,
  type X12AaaLevelContext,
  type X12ParseWarning,
} from "../../parser/warnings.js";
import { decodeHl, HL_LEVEL_CODES, validateHl, type X12Hl } from "../shared/hl.js";
import { AAA_CONDITION_LEVELS } from "./types.js";
import type {
  X12AaaCode,
  X12AaaCondition,
  X12AaaConditionLevel,
  X12Eligibility,
  X12EligibilityBenefit,
  X12EligibilityDate,
  X12EligibilityDependent,
  X12EligibilityEntity,
  X12EligibilityMember,
  X12EligibilityReference,
  X12EligibilityServiceType,
  X12EligibilitySubscriber,
  X12EligibilityTrace,
} from "./types.js";

/**
 * Per-level expected parent level for the 271 HL tree. Information source
 * (`20`) has no parent; receiver (`21`) parents to source; subscriber
 * (`22`) parents to receiver; dependent (`23`) parents to subscriber.
 * Violations fire `X12_HL_PARENT_LEVEL_INVALID`. @internal
 */
const EXPECTED_PARENT_LEVEL: Readonly<Record<string, string | undefined>> = Object.freeze({
  [HL_LEVEL_CODES.INFORMATION_SOURCE]: undefined,
  [HL_LEVEL_CODES.INFORMATION_RECEIVER]: HL_LEVEL_CODES.INFORMATION_SOURCE,
  [HL_LEVEL_CODES.SUBSCRIBER]: HL_LEVEL_CODES.INFORMATION_RECEIVER,
  [HL_LEVEL_CODES.DEPENDENT]: HL_LEVEL_CODES.SUBSCRIBER,
});

/**
 * HL-03 level code to the AAA level name this surface reports. A level code
 * outside this map resolves to `undefined`, which is read as "this reader
 * cannot name the level" and NEVER as a default level. @internal
 */
const AAA_LEVEL_BY_HL_CODE: Readonly<Record<string, X12AaaConditionLevel | undefined>> =
  Object.freeze({
    [HL_LEVEL_CODES.INFORMATION_SOURCE]: AAA_CONDITION_LEVELS.INFORMATION_SOURCE,
    [HL_LEVEL_CODES.INFORMATION_RECEIVER]: AAA_CONDITION_LEVELS.INFORMATION_RECEIVER,
    [HL_LEVEL_CODES.SUBSCRIBER]: AAA_CONDITION_LEVELS.SUBSCRIBER,
    [HL_LEVEL_CODES.DEPENDENT]: AAA_CONDITION_LEVELS.DEPENDENT,
  });

/**
 * The HIGHEST AAA element position this reader has a source for. The recorded
 * source establishes AAA-03 as the Reject Reason Code and AAA-04 as the
 * Follow-up Action Code, and establishes nothing about position 5 or beyond,
 * so an element there is reported as occupied and is never read.
 *
 * This is deliberately NOT the segment's maximum element count: that number is
 * a separate structural fact, no source here establishes it, and nothing in
 * this reader needs it. @internal
 */
const AAA_HIGHEST_SOURCED_ELEMENT = 4;

/** AAA-03, the Reject Reason Code position, per the recorded source. @internal */
const AAA_REJECT_REASON_ELEMENT = 3;

/** AAA-04, the Follow-up Action Code position, per the recorded source. @internal */
const AAA_FOLLOW_UP_ACTION_ELEMENT = 4;

/**
 * Extract a typed {@link X12Eligibility} from a 271 transaction set. Pure
 * function - no I/O, no global state. Returns `undefined` only when the
 * input transaction's ST-01 is not `"271"` (mis-routed call); every other
 * deviation is recoverable and surfaces on `result.warnings`.
 *
 * @example
 * ```ts
 * import { parseX12, get271Eligibility } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const group of ix.groups) {
 *   for (const tx of group.transactions) {
 *     if (tx.st.elements[1] !== "271") continue;
 *     const elig = get271Eligibility(ix.delimiters, tx);
 *     for (const sub of elig?.subscribers ?? []) {
 *       sub.traces[0]?.referenceId;        // echoed 270 trace number
 *       sub.benefits[0]?.eligibilityCode;  // "1" (Active Coverage)
 *     }
 *   }
 * }
 * ```
 */
export function get271Eligibility(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12Eligibility | undefined {
  if (tx.st.elements[1] !== "271") return undefined;

  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);

  const hierarchies: X12Hl[] = [];
  const hlIndex: Map<string, X12Hl> = new Map();

  const subscribers: X12EligibilitySubscriber[] = [];
  let currentSource: X12EligibilityEntity | undefined;
  let currentReceiver: X12EligibilityEntity | undefined;
  let currentSubscriber: SubscriberAccumulator | undefined;
  let currentDependent: DependentAccumulator | undefined;
  let currentBenefit: BenefitAccumulator | undefined;
  // Which HL level the walker is currently inside (drives NM1 routing).
  let context: "source" | "receiver" | "subscriber" | "dependent" | "other" = "other";

  // AAA attribution state. `aaaLevel` is the level of the innermost enclosing
  // HL, `undefined` before the first HL and under a level code this surface
  // does not name. `aaaOccurrenceIndex` is that loop's DOCUMENT-WIDE index
  // among occurrences of its own level, assigned when the HL opens and never
  // restarted per enclosing loop. `unleveledAaaCount` is the separate counter
  // for AAA segments whose level is unknown, so two of them are 0 and 1.
  const aaaConditions: X12AaaCondition[] = [];
  const levelOccurrences: Map<X12AaaConditionLevel, number> = new Map();
  let aaaLevel: X12AaaConditionLevel | undefined;
  let aaaHierarchyId: string | undefined;
  let aaaOccurrenceIndex = 0;
  let unleveledAaaCount = 0;

  /** Close the in-flight EB line onto the active member (dependent first). */
  const flushBenefit = (): void => {
    if (currentBenefit === undefined) return;
    const owner = currentDependent ?? currentSubscriber;
    owner?.benefits.push(freezeBenefit(currentBenefit));
    currentBenefit = undefined;
  };

  /** Close the in-flight dependent onto its subscriber. */
  const flushDependent = (): void => {
    flushBenefit();
    if (currentDependent !== undefined && currentSubscriber !== undefined) {
      currentSubscriber.dependents.push(freezeDependent(currentDependent));
    }
    currentDependent = undefined;
  };

  /** Close the in-flight subscriber (with its dependents) onto the result. */
  const flushSubscriber = (): void => {
    flushDependent();
    flushBenefit();
    if (currentSubscriber !== undefined) {
      subscribers.push(freezeSubscriber(currentSubscriber));
    }
    currentSubscriber = undefined;
  };

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    // Every decimal read below routes its `X12_UNPARSEABLE_DECIMAL` here; the
    // helper narrows the position to the failing element itself.
    const sink: X12DecimalWarningSink = { warnings, position };
    switch (seg.id) {
      case "HL": {
        const hl = decodeHl(seg, delimiters);
        hierarchies.push(hl);
        validateHl(hl, hlIndex, EXPECTED_PARENT_LEVEL, position, warnings);
        hlIndex.set(hl.hlId, hl);
        // Open this loop for AAA attribution. The occurrence index is taken
        // HERE, at the HL, so it counts loops rather than AAA segments: two
        // AAA segments under one loop share it, which is what makes them
        // distinguishable by document order alone (AC-8) rather than by key.
        aaaLevel = AAA_LEVEL_BY_HL_CODE[hl.levelCode];
        aaaHierarchyId = hl.hlId === "" ? undefined : hl.hlId;
        if (aaaLevel !== undefined) {
          const seen = levelOccurrences.get(aaaLevel) ?? 0;
          levelOccurrences.set(aaaLevel, seen + 1);
          aaaOccurrenceIndex = seen;
        }
        currentBenefit = undefined;
        if (hl.levelCode === HL_LEVEL_CODES.INFORMATION_SOURCE) {
          flushSubscriber();
          currentSource = undefined;
          currentReceiver = undefined;
          context = "source";
        } else if (hl.levelCode === HL_LEVEL_CODES.INFORMATION_RECEIVER) {
          flushSubscriber();
          currentReceiver = undefined;
          context = "receiver";
        } else if (hl.levelCode === HL_LEVEL_CODES.SUBSCRIBER) {
          flushSubscriber();
          currentSubscriber = openSubscriber(hl, currentSource, currentReceiver);
          context = "subscriber";
        } else if (hl.levelCode === HL_LEVEL_CODES.DEPENDENT) {
          flushDependent();
          currentDependent = openDependent(hl);
          context = "dependent";
        } else {
          flushSubscriber();
          context = "other";
        }
        break;
      }
      case "TRN": {
        const trace = decodeTrn(seg, delimiters);
        const owner = currentDependent ?? currentSubscriber;
        owner?.traces.push(trace);
        break;
      }
      case "NM1": {
        const qualifier = elementValue(seg, 1, delimiters);
        if (currentBenefit !== undefined) {
          // Loop 2120C/D - benefit-related entity (NM1 inside an EB line).
          currentBenefit.relatedEntities.push(decodeEntity(seg, delimiters));
          break;
        }
        if (context === "source") {
          currentSource = decodeEntity(seg, delimiters);
        } else if (context === "receiver") {
          currentReceiver = decodeEntity(seg, delimiters);
        } else if (context === "subscriber" && currentSubscriber !== undefined) {
          if (currentSubscriber.name === undefined) {
            currentSubscriber.name = openMember(seg, delimiters);
          }
        } else if (context === "dependent" && currentDependent !== undefined) {
          if (currentDependent.name === undefined) {
            currentDependent.name = openMember(seg, delimiters);
          }
        }
        void qualifier;
        break;
      }
      case "N3": {
        const member = activeMemberName(currentDependent, currentSubscriber);
        if (member !== undefined && currentBenefit === undefined) {
          for (let n = 1; n <= 2; n += 1) {
            const line = elementOptional(seg, n, delimiters);
            if (line !== undefined) member.addressLines.push(line);
          }
        }
        break;
      }
      case "N4": {
        const member = activeMemberName(currentDependent, currentSubscriber);
        if (member !== undefined && currentBenefit === undefined) {
          member.city = elementOptional(seg, 1, delimiters);
          member.state = elementOptional(seg, 2, delimiters);
          member.postalCode = elementOptional(seg, 3, delimiters);
          member.countryCode = elementOptional(seg, 4, delimiters);
        }
        break;
      }
      case "DMG": {
        const member = activeMemberName(currentDependent, currentSubscriber);
        if (member !== undefined && currentBenefit === undefined) {
          member.dateOfBirth = elementOptional(seg, 2, delimiters);
          member.genderCode = elementOptional(seg, 3, delimiters);
        }
        break;
      }
      case "REF": {
        const ref = decodeRef(seg, delimiters);
        if (currentBenefit !== undefined) currentBenefit.references.push(ref);
        else if (currentDependent !== undefined) currentDependent.references.push(ref);
        else if (currentSubscriber !== undefined) currentSubscriber.references.push(ref);
        break;
      }
      case "DTP": {
        const date = decodeDtp(seg, delimiters);
        if (date === undefined) break;
        if (currentBenefit !== undefined) currentBenefit.dates.push(date);
        else if (currentDependent !== undefined) currentDependent.dates.push(date);
        else if (currentSubscriber !== undefined) currentSubscriber.dates.push(date);
        break;
      }
      case "EB": {
        flushBenefit();
        if (currentSubscriber === undefined && currentDependent === undefined) break;
        currentBenefit = openBenefit(seg, delimiters, sink);
        break;
      }
      case "MSG": {
        if (currentBenefit === undefined) break;
        const text = elementOptional(seg, 1, delimiters);
        if (text !== undefined) currentBenefit.messages.push(text);
        break;
      }
      case "AAA": {
        // The AAA is attributed to the loop that is open at it, and never to
        // the loop's CONTENT: a level whose loop carries nothing else still
        // owns its AAA, and surfacing it here creates no subscriber, no
        // dependent and no hierarchy entry.
        const index = aaaLevel === undefined ? unleveledAaaCount : aaaOccurrenceIndex;
        if (aaaLevel === undefined) unleveledAaaCount += 1;
        aaaConditions.push(
          decodeAaa(seg, delimiters, position, warnings, {
            level: aaaLevel,
            hierarchyId: aaaHierarchyId,
            occurrenceIndex: index,
          }),
        );
        break;
      }
      default: {
        // HSD / III / LS / LE / PER and any other optional segment is
        // preserved on tx.segments verbatim; the v1 surface does not
        // enumerate every segment (additive later).
        break;
      }
    }
  }

  flushSubscriber();

  return Object.freeze({
    subscribers: Object.freeze(subscribers.slice()),
    hierarchies: Object.freeze(hierarchies.slice()),
    // ALWAYS present, empty where the document carried no AAA. An absent
    // field could not be told from a reader that does not surface AAA.
    aaaConditions: Object.freeze(aaaConditions.slice()),
    warnings: Object.freeze(warnings.slice()),
  });
}

/**
 * Decode one AAA request-validation segment into an {@link X12AaaCondition},
 * pushing every diagnostic it raises onto `warnings`.
 *
 * ONLY the two positions with a recorded source are read. Everything else the
 * segment carries stays on `tx.segments` and is assigned no meaning here: an
 * element past the highest sourced position is reported as occupied and never
 * decoded, because a confident wrong reject reason code is the failure this
 * whole surface exists to prevent.
 *
 * @internal
 */
function decodeAaa(
  seg: X12Segment,
  delimiters: Delimiters,
  position: X12Position,
  warnings: X12ParseWarning[],
  key: {
    readonly level: X12AaaConditionLevel | undefined;
    readonly hierarchyId: string | undefined;
    readonly occurrenceIndex: number;
  },
): X12AaaCondition {
  const level: X12AaaLevelContext = key.level ?? AAA_LEVEL_CONTEXTS.UNATTACHED;
  const at = (elementIndex: number): X12Position => ({ ...position, elementIndex });

  // An unidentifiable loop is reported and never papered over: no level is
  // guessed and no hierarchical identifier is synthesized.
  if (key.level === undefined || key.hierarchyId === undefined) {
    warnings.push(aaaLoopUnidentified(position, level));
  }

  const rejectRaw = elementOptional(seg, AAA_REJECT_REASON_ELEMENT, delimiters);
  let rejectReasonCode: X12AaaCode | undefined;
  if (rejectRaw === undefined) {
    warnings.push(aaaRejectReasonAbsent(at(AAA_REJECT_REASON_ELEMENT), level));
  } else {
    const description = lookupAaaRejectReason(rejectRaw)?.description;
    if (description === undefined) {
      warnings.push(aaaUnknownCode(at(AAA_REJECT_REASON_ELEMENT), level));
    }
    rejectReasonCode = Object.freeze({ code: rejectRaw, description });
  }

  const followRaw = elementOptional(seg, AAA_FOLLOW_UP_ACTION_ELEMENT, delimiters);
  let followUpActionCode: X12AaaCode | undefined;
  if (followRaw === undefined) {
    // Absent is surfaced as absent with no stand-in. PRESENT AND EMPTY is a
    // different thing and is the malformation half of the report below.
    if (seg.elements[AAA_FOLLOW_UP_ACTION_ELEMENT] !== undefined) {
      warnings.push(aaaSegmentMalformed(at(AAA_FOLLOW_UP_ACTION_ELEMENT), level));
    }
  } else {
    const description = lookupAaaFollowUpAction(followRaw)?.description;
    if (description === undefined) {
      warnings.push(aaaUnknownCode(at(AAA_FOLLOW_UP_ACTION_ELEMENT), level));
    }
    followUpActionCode = Object.freeze({ code: followRaw, description });
  }

  // An element past the highest sourced position. Raised once per segment and
  // anchored at the FIRST such position, which is where a reader looks.
  if (seg.elements.length > AAA_HIGHEST_SOURCED_ELEMENT + 1) {
    warnings.push(aaaSegmentMalformed(at(AAA_HIGHEST_SOURCED_ELEMENT + 1), level));
  }

  return Object.freeze({
    key: Object.freeze({
      level: key.level,
      hierarchyId: key.hierarchyId,
      occurrenceIndex: key.occurrenceIndex,
    }),
    rejectReasonCode,
    followUpActionCode,
    position,
  });
}

// ---------------------------------------------------------------------------
// Mutable accumulators (frozen into the readonly public shape at the end).
// ---------------------------------------------------------------------------

/** @internal */
interface MemberAccumulator {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly lastName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly addressLines: string[];
  city: string | undefined;
  state: string | undefined;
  postalCode: string | undefined;
  countryCode: string | undefined;
  dateOfBirth: string | undefined;
  genderCode: string | undefined;
}

/** @internal */
interface SubscriberAccumulator {
  readonly hierarchy: X12Hl | undefined;
  readonly informationSource: X12EligibilityEntity | undefined;
  readonly informationReceiver: X12EligibilityEntity | undefined;
  readonly traces: X12EligibilityTrace[];
  name: MemberAccumulator | undefined;
  readonly references: X12EligibilityReference[];
  readonly dates: X12EligibilityDate[];
  readonly benefits: X12EligibilityBenefit[];
  readonly dependents: X12EligibilityDependent[];
}

/** @internal */
interface DependentAccumulator {
  readonly hierarchy: X12Hl | undefined;
  readonly traces: X12EligibilityTrace[];
  name: MemberAccumulator | undefined;
  readonly references: X12EligibilityReference[];
  readonly dates: X12EligibilityDate[];
  readonly benefits: X12EligibilityBenefit[];
}

/** @internal */
interface BenefitAccumulator {
  readonly eligibilityCode: string;
  readonly coverageLevelCode: string | undefined;
  readonly serviceTypeCodes: X12EligibilityServiceType[];
  readonly insuranceTypeCode: string | undefined;
  readonly planCoverageDescription: string | undefined;
  readonly timePeriodQualifier: string | undefined;
  readonly monetaryAmount: X12Decimal | undefined;
  readonly percent: X12Decimal | undefined;
  readonly quantityQualifier: string | undefined;
  readonly quantity: X12Decimal | undefined;
  readonly authorizationRequired: string | undefined;
  readonly inPlanNetwork: string | undefined;
  readonly references: X12EligibilityReference[];
  readonly dates: X12EligibilityDate[];
  readonly messages: string[];
  readonly relatedEntities: X12EligibilityEntity[];
}

/** The mutable member name accumulator of the active person, or undefined. @internal */
function activeMemberName(
  dependent: DependentAccumulator | undefined,
  subscriber: SubscriberAccumulator | undefined,
): MemberAccumulator | undefined {
  return dependent?.name ?? subscriber?.name;
}

// ---------------------------------------------------------------------------
// Openers + decoders.
// ---------------------------------------------------------------------------

/** @internal */
function openSubscriber(
  hierarchy: X12Hl,
  informationSource: X12EligibilityEntity | undefined,
  informationReceiver: X12EligibilityEntity | undefined,
): SubscriberAccumulator {
  return {
    hierarchy,
    informationSource,
    informationReceiver,
    traces: [],
    name: undefined,
    references: [],
    dates: [],
    benefits: [],
    dependents: [],
  };
}

/** @internal */
function openDependent(hierarchy: X12Hl): DependentAccumulator {
  return {
    hierarchy,
    traces: [],
    name: undefined,
    references: [],
    dates: [],
    benefits: [],
  };
}

/** @internal */
function openMember(seg: X12Segment, delimiters: Delimiters): MemberAccumulator {
  return {
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    entityTypeQualifier: elementValue(seg, 2, delimiters),
    lastName: elementOptional(seg, 3, delimiters),
    firstName: elementOptional(seg, 4, delimiters),
    middleName: elementOptional(seg, 5, delimiters),
    suffix: elementOptional(seg, 7, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
    addressLines: [],
    city: undefined,
    state: undefined,
    postalCode: undefined,
    countryCode: undefined,
    dateOfBirth: undefined,
    genderCode: undefined,
  };
}

/** @internal */
function decodeEntity(seg: X12Segment, delimiters: Delimiters): X12EligibilityEntity {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    entityTypeQualifier: elementValue(seg, 2, delimiters),
    name: elementValue(seg, 3, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
  });
}

/** @internal */
function decodeTrn(seg: X12Segment, delimiters: Delimiters): X12EligibilityTrace {
  return Object.freeze({
    traceTypeCode: elementValue(seg, 1, delimiters),
    referenceId: elementValue(seg, 2, delimiters),
    originatingCompanyId: elementOptional(seg, 3, delimiters),
    supplementalReferenceId: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeRef(seg: X12Segment, delimiters: Delimiters): X12EligibilityReference {
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value: elementValue(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

/** @internal */
function decodeDtp(seg: X12Segment, delimiters: Delimiters): X12EligibilityDate | undefined {
  const qualifier = elementOptional(seg, 1, delimiters);
  const value = elementOptional(seg, 3, delimiters);
  if (qualifier === undefined || value === undefined) return undefined;
  return Object.freeze({
    qualifier,
    formatQualifier: elementValue(seg, 2, delimiters),
    value,
  });
}

/** @internal */
function openBenefit(
  seg: X12Segment,
  delimiters: Delimiters,
  sink: X12DecimalWarningSink,
): BenefitAccumulator {
  const serviceTypeCodes: X12EligibilityServiceType[] = [];
  for (const code of getAllSegmentValues(seg, "03", delimiters)) {
    if (code === "") continue;
    serviceTypeCodes.push(
      Object.freeze({ code, description: lookupServiceType(code)?.description }),
    );
  }
  return {
    eligibilityCode: elementValue(seg, 1, delimiters),
    coverageLevelCode: elementOptional(seg, 2, delimiters),
    serviceTypeCodes,
    insuranceTypeCode: elementOptional(seg, 4, delimiters),
    planCoverageDescription: elementOptional(seg, 5, delimiters),
    timePeriodQualifier: elementOptional(seg, 6, delimiters),
    monetaryAmount: elementDecimal(seg, 7, delimiters, sink),
    percent: elementDecimal(seg, 8, delimiters, sink),
    quantityQualifier: elementOptional(seg, 9, delimiters),
    quantity: elementDecimal(seg, 10, delimiters, sink),
    authorizationRequired: elementOptional(seg, 11, delimiters),
    inPlanNetwork: elementOptional(seg, 12, delimiters),
    references: [],
    dates: [],
    messages: [],
    relatedEntities: [],
  };
}

// ---------------------------------------------------------------------------
// Freezing accumulators into the readonly public shape.
// ---------------------------------------------------------------------------

/** @internal */
function freezeMember(acc: MemberAccumulator): X12EligibilityMember {
  const hasAddress =
    acc.addressLines.length > 0 ||
    acc.city !== undefined ||
    acc.state !== undefined ||
    acc.postalCode !== undefined ||
    acc.countryCode !== undefined;
  return Object.freeze({
    entityIdentifierCode: acc.entityIdentifierCode,
    entityTypeQualifier: acc.entityTypeQualifier,
    lastName: acc.lastName,
    firstName: acc.firstName,
    middleName: acc.middleName,
    suffix: acc.suffix,
    idQualifier: acc.idQualifier,
    idCode: acc.idCode,
    address: hasAddress
      ? Object.freeze({
          lines: Object.freeze(acc.addressLines.slice()),
          city: acc.city,
          state: acc.state,
          postalCode: acc.postalCode,
          countryCode: acc.countryCode,
        })
      : undefined,
    dateOfBirth: acc.dateOfBirth,
    genderCode: acc.genderCode,
  });
}

/** @internal */
function freezeBenefit(acc: BenefitAccumulator): X12EligibilityBenefit {
  return Object.freeze({
    eligibilityCode: acc.eligibilityCode,
    coverageLevelCode: acc.coverageLevelCode,
    serviceTypeCodes: Object.freeze(acc.serviceTypeCodes.slice()),
    insuranceTypeCode: acc.insuranceTypeCode,
    planCoverageDescription: acc.planCoverageDescription,
    timePeriodQualifier: acc.timePeriodQualifier,
    monetaryAmount: acc.monetaryAmount,
    percent: acc.percent,
    quantityQualifier: acc.quantityQualifier,
    quantity: acc.quantity,
    authorizationRequired: acc.authorizationRequired,
    inPlanNetwork: acc.inPlanNetwork,
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
    messages: Object.freeze(acc.messages.slice()),
    relatedEntities: Object.freeze(acc.relatedEntities.slice()),
  });
}

/** @internal */
function freezeDependent(acc: DependentAccumulator): X12EligibilityDependent {
  return Object.freeze({
    hierarchy: acc.hierarchy,
    traces: Object.freeze(acc.traces.slice()),
    name: acc.name === undefined ? undefined : freezeMember(acc.name),
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
    benefits: Object.freeze(acc.benefits.slice()),
  });
}

/** @internal */
function freezeSubscriber(acc: SubscriberAccumulator): X12EligibilitySubscriber {
  return Object.freeze({
    hierarchy: acc.hierarchy,
    informationSource: acc.informationSource,
    informationReceiver: acc.informationReceiver,
    traces: Object.freeze(acc.traces.slice()),
    name: acc.name === undefined ? undefined : freezeMember(acc.name),
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
    benefits: Object.freeze(acc.benefits.slice()),
    dependents: Object.freeze(acc.dependents.slice()),
  });
}

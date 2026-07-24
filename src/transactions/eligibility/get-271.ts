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
 * Phase 6 known limitations (documented in CHANGELOG):
 * - **AAA request-validation segments** (rejection reasons at the source /
 *   receiver / subscriber level) are preserved on `tx.segments` verbatim
 *   but not yet typed onto the model.
 * - **HSD health-service-delivery** detail inside Loop 2110 is not
 *   destructured (the EB benefit line carries the headline fields).
 * - **III injury/illness** + **LS/LE loop markers** are preserved verbatim,
 *   not typed.
 *
 * Spec source: WPC TR3 `005010X279A1` - Health Care Eligibility Benefit
 * Inquiry and Response (270/271).
 */

import type { X12Decimal } from "../../decimal.js";
import { lookupServiceType } from "../../code-lists/service-type.js";
import {
  elementDecimal,
  elementOptional,
  elementValue,
  getAllSegmentValues,
  type X12Segment,
} from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
import { decodeHl, HL_LEVEL_CODES, validateHl, type X12Hl } from "../shared/hl.js";
import type {
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
    switch (seg.id) {
      case "HL": {
        const hl = decodeHl(seg, delimiters);
        hierarchies.push(hl);
        validateHl(hl, hlIndex, EXPECTED_PARENT_LEVEL, position, warnings);
        hlIndex.set(hl.hlId, hl);
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
        currentBenefit = openBenefit(seg, delimiters);
        break;
      }
      case "MSG": {
        if (currentBenefit === undefined) break;
        const text = elementOptional(seg, 1, delimiters);
        if (text !== undefined) currentBenefit.messages.push(text);
        break;
      }
      default: {
        // AAA / HSD / III / LS / LE / PER and any other optional segment is
        // preserved on tx.segments verbatim; the v1 surface does not
        // enumerate every segment (additive in later phases).
        break;
      }
    }
  }

  flushSubscriber();

  return Object.freeze({
    subscribers: Object.freeze(subscribers.slice()),
    hierarchies: Object.freeze(hierarchies.slice()),
    warnings: Object.freeze(warnings.slice()),
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
function openBenefit(seg: X12Segment, delimiters: Delimiters): BenefitAccumulator {
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
    monetaryAmount: elementDecimal(seg, 7, delimiters),
    percent: elementDecimal(seg, 8, delimiters),
    quantityQualifier: elementOptional(seg, 9, delimiters),
    quantity: elementDecimal(seg, 10, delimiters),
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

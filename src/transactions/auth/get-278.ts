/**
 * `get278Request` / `get278Response` - extract a typed
 * {@link X12ServicesReview} from a parsed X12 278 Health Care Services
 * Review transaction set (request TR3 `005010X217`, response TR3
 * `005010X216`). Both directions share one lenient HL-tree walk; the entry
 * point only records `direction` on the result. Every recoverable deviation
 * surfaces as a warning, never a throw.
 *
 * **The certification decision is the safety-critical surface.** In a
 * response the `HCR-01` action code (certified / not-certified / pended /
 * modified) is captured verbatim onto the review item - the walker NEVER
 * infers a certification outcome. The HL spine `20 → 21 → 22 → 23` is
 * validated for parent-pointer integrity via the shared
 * {@link "../shared/hl.js".validateHl}; the `EV` / `SS` event + service
 * levels are intentionally tolerant (omitted from the expected-parent map).
 *
 * Phase 7 known limitations (documented in CHANGELOG):
 * - **Detailed 2010E provider sub-loops** (rendering / attending / operating
 *   provider address + secondary IDs) are captured as bare NM1 entities on
 *   {@link X12ServiceReview.providers}, not split by role.
 * - **SV1/SV2/SV3 service-line detail, PWK attachments, HSD
 *   service-delivery, and CRC condition codes** are preserved verbatim on
 *   `tx.segments` but not destructured onto the model.
 *
 * Spec sources: WPC TR3 `005010X217` (request) / `005010X216` (response).
 */

import { resolveHiQualifier, type X12HiCodeSystem } from "../../code-lists/hi-qualifiers.js";
import {
  componentOptional,
  elementOptional,
  elementValue,
  type X12Segment,
} from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import { unknownHiQualifier, type X12ParseWarning } from "../../parser/warnings.js";
import { decodeHl, HL_LEVEL_CODES, validateHl, type X12Hl } from "../shared/hl.js";
import type {
  X12AuthDate,
  X12AuthDiagnosis,
  X12AuthEntity,
  X12AuthHeader,
  X12AuthMember,
  X12AuthReference,
  X12AuthTrace,
  X12ReviewDecision,
  X12ServiceReview,
  X12ServicesReview,
} from "./types.js";

/** 278 patient-event HL level code (X12 0735). @internal */
const HL_LEVEL_PATIENT_EVENT = "EV";
/** 278 service HL level code (X12 0735). @internal */
const HL_LEVEL_SERVICE = "SS";

/**
 * Per-level expected parent level for the 278 HL spine. UMO (`20`) has no
 * parent; requester (`21`) parents to UMO; subscriber (`22`) parents to
 * requester; dependent (`23`) parents to subscriber. The `EV` / `SS` event +
 * service levels are deliberately ABSENT - they attach under a subscriber OR
 * a dependent and clearinghouses vary, so the walker stays tolerant there
 * (an absent key means "unknown level - no synthesized expectation"). @internal
 */
const EXPECTED_PARENT_LEVEL: Readonly<Record<string, string | undefined>> = Object.freeze({
  [HL_LEVEL_CODES.INFORMATION_SOURCE]: undefined,
  [HL_LEVEL_CODES.INFORMATION_RECEIVER]: HL_LEVEL_CODES.INFORMATION_SOURCE,
  [HL_LEVEL_CODES.SUBSCRIBER]: HL_LEVEL_CODES.INFORMATION_RECEIVER,
  [HL_LEVEL_CODES.DEPENDENT]: HL_LEVEL_CODES.SUBSCRIBER,
});

/**
 * Extract a typed {@link X12ServicesReview} from a 278 **request**
 * (`005010X217`). Pure function - no I/O. Returns `undefined` only when the
 * transaction's ST-01 is not `"278"` (mis-routed call); every other
 * deviation is recoverable and surfaces on `result.warnings`.
 *
 * @example
 * ```ts
 * import { parseX12, get278Request } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
 * if (tx !== undefined) {
 *   const req = get278Request(ix.delimiters, tx);
 *   req?.reviews[0]?.requestCategoryCode; // "HS"
 *   req?.reviews[0]?.diagnoses[0]?.code;  // "E1165"
 * }
 * ```
 */
export function get278Request(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12ServicesReview | undefined {
  return walk278(delimiters, tx, "request");
}

/**
 * Extract a typed {@link X12ServicesReview} from a 278 **response**
 * (`005010X216`). Same lenient walk as {@link get278Request}; the `HCR`
 * decision under each event / service review is the response's
 * safety-critical addition. Returns `undefined` only on a mis-routed ST-01.
 *
 * @example
 * ```ts
 * import { parseX12, get278Response } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
 * if (tx !== undefined) {
 *   const resp = get278Response(ix.delimiters, tx);
 *   resp?.reviews[0]?.decision?.actionCode;                 // "A1"
 *   resp?.reviews[0]?.decision?.reviewIdentificationNumber; // "AUTH123456"
 * }
 * ```
 */
export function get278Response(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12ServicesReview | undefined {
  return walk278(delimiters, tx, "response");
}

/** @internal - the shared request/response HL walk. */
function walk278(
  delimiters: Delimiters,
  tx: X12TransactionSet,
  direction: "request" | "response",
): X12ServicesReview | undefined {
  if (tx.st.elements[1] !== "278") return undefined;

  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);

  const hierarchies: X12Hl[] = [];
  const hlIndex: Map<string, X12Hl> = new Map();

  let header: X12AuthHeader | undefined;
  let umo: X12AuthEntity | undefined;
  let requester: X12AuthEntity | undefined;
  let subscriber: MemberAccumulator | undefined;
  let dependent: MemberAccumulator | undefined;

  const reviews: ReviewAccumulator[] = [];
  let currentReview: ReviewAccumulator | undefined;
  let context: "umo" | "requester" | "subscriber" | "dependent" | "event" | "service" | "other" =
    "other";

  const flushReview = (): void => {
    if (currentReview !== undefined) reviews.push(currentReview);
    currentReview = undefined;
  };

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    switch (seg.id) {
      case "BHT": {
        header = decodeBht(seg, delimiters);
        break;
      }
      case "HL": {
        const hl = decodeHl(seg, delimiters);
        hierarchies.push(hl);
        validateHl(hl, hlIndex, EXPECTED_PARENT_LEVEL, position, warnings);
        hlIndex.set(hl.hlId, hl);
        if (hl.levelCode === HL_LEVEL_CODES.INFORMATION_SOURCE) {
          flushReview();
          context = "umo";
        } else if (hl.levelCode === HL_LEVEL_CODES.INFORMATION_RECEIVER) {
          flushReview();
          context = "requester";
        } else if (hl.levelCode === HL_LEVEL_CODES.SUBSCRIBER) {
          flushReview();
          context = "subscriber";
        } else if (hl.levelCode === HL_LEVEL_CODES.DEPENDENT) {
          flushReview();
          context = "dependent";
        } else if (hl.levelCode === HL_LEVEL_PATIENT_EVENT || hl.levelCode === HL_LEVEL_SERVICE) {
          flushReview();
          currentReview = openReview(hl);
          context = hl.levelCode === HL_LEVEL_PATIENT_EVENT ? "event" : "service";
        } else {
          flushReview();
          context = "other";
        }
        break;
      }
      case "NM1": {
        if (context === "umo") {
          umo ??= decodeEntity(seg, delimiters);
        } else if (context === "requester") {
          requester ??= decodeEntity(seg, delimiters);
        } else if (context === "subscriber") {
          subscriber ??= openMember(seg, delimiters);
        } else if (context === "dependent") {
          dependent ??= openMember(seg, delimiters);
        } else if (currentReview !== undefined) {
          currentReview.providers.push(decodeEntity(seg, delimiters));
        }
        break;
      }
      case "DMG": {
        const member =
          context === "dependent" ? dependent : context === "subscriber" ? subscriber : undefined;
        if (member !== undefined) {
          member.dateOfBirth = elementOptional(seg, 2, delimiters);
          member.genderCode = elementOptional(seg, 3, delimiters);
        }
        break;
      }
      case "UM": {
        if (currentReview !== undefined) {
          currentReview.requestCategoryCode = elementOptional(seg, 1, delimiters);
          currentReview.certificationTypeCode = elementOptional(seg, 2, delimiters);
          currentReview.serviceTypeCode = elementOptional(seg, 3, delimiters);
          currentReview.levelOfServiceCode = elementOptional(seg, 6, delimiters);
        }
        break;
      }
      case "HCR": {
        if (currentReview !== undefined) currentReview.decision = decodeHcr(seg, delimiters);
        break;
      }
      case "HI": {
        if (currentReview !== undefined) {
          for (const dx of decodeHiDiagnoses(seg, delimiters, warnings, position)) {
            currentReview.diagnoses.push(dx);
          }
        }
        break;
      }
      case "TRN": {
        if (currentReview !== undefined) currentReview.traces.push(decodeTrn(seg, delimiters));
        break;
      }
      case "REF": {
        if (currentReview !== undefined) currentReview.references.push(decodeRef(seg, delimiters));
        break;
      }
      case "DTP": {
        const date = decodeDtp(seg, delimiters);
        if (date !== undefined && currentReview !== undefined) currentReview.dates.push(date);
        break;
      }
      case "MSG": {
        const text = elementOptional(seg, 1, delimiters);
        if (text !== undefined && currentReview !== undefined) currentReview.messages.push(text);
        break;
      }
      default:
        break;
    }
  }

  flushReview();

  const icr = tx.st.elements[3];

  return Object.freeze({
    direction,
    implementationConventionReference: icr === undefined || icr === "" ? undefined : icr,
    header: header ?? EMPTY_HEADER,
    utilizationManagementOrganization: umo,
    requester,
    subscriber: subscriber === undefined ? undefined : freezeMember(subscriber),
    dependent: dependent === undefined ? undefined : freezeMember(dependent),
    reviews: Object.freeze(reviews.map(freezeReview)),
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
  dateOfBirth: string | undefined;
  genderCode: string | undefined;
}

/** @internal */
interface ReviewAccumulator {
  readonly hierarchy: X12Hl;
  requestCategoryCode: string | undefined;
  certificationTypeCode: string | undefined;
  serviceTypeCode: string | undefined;
  levelOfServiceCode: string | undefined;
  decision: X12ReviewDecision | undefined;
  readonly traces: X12AuthTrace[];
  readonly diagnoses: X12AuthDiagnosis[];
  readonly providers: X12AuthEntity[];
  readonly references: X12AuthReference[];
  readonly dates: X12AuthDate[];
  readonly messages: string[];
}

/** @internal */
const EMPTY_HEADER: X12AuthHeader = Object.freeze({
  structurePurposeCode: "",
  purposeCode: undefined,
  referenceId: undefined,
  date: undefined,
  time: undefined,
  transactionTypeCode: undefined,
});

// ---------------------------------------------------------------------------
// Openers + decoders.
// ---------------------------------------------------------------------------

/** @internal */
function openReview(hierarchy: X12Hl): ReviewAccumulator {
  return {
    hierarchy,
    requestCategoryCode: undefined,
    certificationTypeCode: undefined,
    serviceTypeCode: undefined,
    levelOfServiceCode: undefined,
    decision: undefined,
    traces: [],
    diagnoses: [],
    providers: [],
    references: [],
    dates: [],
    messages: [],
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
    dateOfBirth: undefined,
    genderCode: undefined,
  };
}

/** @internal */
function decodeBht(seg: X12Segment, delimiters: Delimiters): X12AuthHeader {
  return Object.freeze({
    structurePurposeCode: elementValue(seg, 1, delimiters),
    purposeCode: elementOptional(seg, 2, delimiters),
    referenceId: elementOptional(seg, 3, delimiters),
    date: elementOptional(seg, 4, delimiters),
    time: elementOptional(seg, 5, delimiters),
    transactionTypeCode: elementOptional(seg, 6, delimiters),
  });
}

/** @internal */
function decodeEntity(seg: X12Segment, delimiters: Delimiters): X12AuthEntity {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    entityTypeQualifier: elementValue(seg, 2, delimiters),
    name: elementValue(seg, 3, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
  });
}

/** @internal */
function decodeHcr(seg: X12Segment, delimiters: Delimiters): X12ReviewDecision {
  return Object.freeze({
    actionCode: elementValue(seg, 1, delimiters),
    reviewIdentificationNumber: elementOptional(seg, 2, delimiters),
    reasonCode: elementOptional(seg, 3, delimiters),
    secondSurgicalOpinionCode: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeTrn(seg: X12Segment, delimiters: Delimiters): X12AuthTrace {
  return Object.freeze({
    traceTypeCode: elementValue(seg, 1, delimiters),
    referenceId: elementValue(seg, 2, delimiters),
    originatingCompanyId: elementOptional(seg, 3, delimiters),
    supplementalReferenceId: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeRef(seg: X12Segment, delimiters: Delimiters): X12AuthReference {
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value: elementValue(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

/** @internal */
function decodeDtp(seg: X12Segment, delimiters: Delimiters): X12AuthDate | undefined {
  const qualifier = elementOptional(seg, 1, delimiters);
  const value = elementOptional(seg, 3, delimiters);
  if (qualifier === undefined || value === undefined) return undefined;
  return Object.freeze({
    qualifier,
    formatQualifier: elementValue(seg, 2, delimiters),
    value,
  });
}

/** @internal - decode the HI diagnosis composites (up to 12). */
function decodeHiDiagnoses(
  seg: X12Segment,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): X12AuthDiagnosis[] {
  const out: X12AuthDiagnosis[] = [];
  for (let comp = 1; comp <= 12; comp += 1) {
    const qualifier = componentOptional(seg, comp, 1, delimiters);
    const code = componentOptional(seg, comp, 2, delimiters);
    if (qualifier === undefined && code === undefined) continue;
    const resolved = qualifier === undefined ? undefined : resolveHiQualifier(qualifier);
    const codeSystem: X12HiCodeSystem | "unknown" = resolved?.system ?? "unknown";
    if (qualifier !== undefined && resolved === undefined) {
      warnings.push(unknownHiQualifier(position, qualifier));
    }
    out.push(Object.freeze({ qualifier: qualifier ?? "", code: code ?? "", codeSystem }));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Freezing accumulators into the readonly public shape.
// ---------------------------------------------------------------------------

/** @internal */
function freezeMember(acc: MemberAccumulator): X12AuthMember {
  return Object.freeze({
    entityIdentifierCode: acc.entityIdentifierCode,
    entityTypeQualifier: acc.entityTypeQualifier,
    lastName: acc.lastName,
    firstName: acc.firstName,
    middleName: acc.middleName,
    suffix: acc.suffix,
    idQualifier: acc.idQualifier,
    idCode: acc.idCode,
    dateOfBirth: acc.dateOfBirth,
    genderCode: acc.genderCode,
  });
}

/** @internal */
function freezeReview(acc: ReviewAccumulator): X12ServiceReview {
  return Object.freeze({
    hierarchy: acc.hierarchy,
    requestCategoryCode: acc.requestCategoryCode,
    certificationTypeCode: acc.certificationTypeCode,
    serviceTypeCode: acc.serviceTypeCode,
    levelOfServiceCode: acc.levelOfServiceCode,
    decision: acc.decision,
    traces: Object.freeze(acc.traces.slice()),
    diagnoses: Object.freeze(acc.diagnoses.slice()),
    providers: Object.freeze(acc.providers.slice()),
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
    messages: Object.freeze(acc.messages.slice()),
  });
}

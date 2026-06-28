/**
 * `get277Status` / `get277CADisposition` — extract a typed
 * {@link X12ClaimStatusResponse} from a parsed X12 005010 277 Claim Status
 * Response (`005010X212`) or 277CA Claim Acknowledgment (`005010X214`).
 * Both transactions carry `ST-01 = "277"`; they share the HL spine + STC
 * composite and are disambiguated by `ST-03`. A single internal walker
 * serves both; the two public entry points differ only in which `ST-03`
 * they accept.
 *
 * Lenient on parse: every recoverable deviation surfaces as a warning,
 * never a throw. Monetary fields decode as
 * {@link "../../decimal.js".X12Decimal} (never `parseFloat`). HL
 * parent-pointer integrity is enforced via the shared
 * {@link "../shared/hl.js".validateHl} — mismatches emit
 * `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`; the walker
 * NEVER silently re-numbers. Unknown CSCC / CSC codes preserve their
 * verbatim value and emit `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` /
 * `X12_UNKNOWN_CLAIM_STATUS`.
 *
 * Phase 6 known limitations (documented in CHANGELOG):
 * - **QTY / AMT** claim-summary segments (claim count / amount roll-ups in
 *   a 277CA Loop 2200) are preserved on `tx.segments` verbatim but not yet
 *   typed onto the model.
 * - **Per-status free-form MSG** beyond STC-12 is not separately surfaced.
 *
 * Spec source: WPC TR3s `005010X212` (277) + `005010X214` (277CA).
 */

import type { X12Decimal } from "../../decimal.js";
import { lookupClaimStatus } from "../../code-lists/claim-status.js";
import { lookupClaimStatusCategory } from "../../code-lists/claim-status-category.js";
import {
  componentOptional,
  elementDecimal,
  elementOptional,
  elementValue,
  type X12Segment,
} from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import {
  unknownClaimStatus,
  unknownClaimStatusCategory,
  type X12ParseWarning,
} from "../../parser/warnings.js";
import { decodeHl, HL_LEVEL_CODES, validateHl, type X12Hl } from "../shared/hl.js";
import type {
  X12ClaimStatus,
  X12ClaimStatusResponse,
  X12ServiceLineStatus,
  X12StatusCode,
  X12StatusDate,
  X12StatusEntity,
  X12StatusInfo,
  X12StatusMember,
  X12StatusReference,
  X12StatusTrace,
} from "./types.js";

/** TR3 implementation-convention reference for the 277CA acknowledgment. @internal */
const ICR_277CA = "005010X214";

/**
 * Per-level expected parent for the 277 / 277CA HL spine. Source (`20`) has
 * no parent; receiver (`21`) → source; service provider (`19`) → receiver;
 * subscriber (`22`) → provider; dependent (`23`) → subscriber. Violations
 * fire `X12_HL_PARENT_LEVEL_INVALID`. @internal
 */
const EXPECTED_PARENT_LEVEL: Readonly<Record<string, string | undefined>> = Object.freeze({
  [HL_LEVEL_CODES.INFORMATION_SOURCE]: undefined,
  [HL_LEVEL_CODES.INFORMATION_RECEIVER]: HL_LEVEL_CODES.INFORMATION_SOURCE,
  [HL_LEVEL_CODES.PROVIDER_OF_SERVICE]: HL_LEVEL_CODES.INFORMATION_RECEIVER,
  [HL_LEVEL_CODES.SUBSCRIBER]: HL_LEVEL_CODES.PROVIDER_OF_SERVICE,
  [HL_LEVEL_CODES.DEPENDENT]: HL_LEVEL_CODES.SUBSCRIBER,
});

/**
 * Extract a typed {@link X12ClaimStatusResponse} from a 277 / 277CA
 * transaction set. Pure function — no I/O, no global state. Returns
 * `undefined` only when `ST-01` is not `"277"` (mis-routed call); every
 * other deviation is recoverable and surfaces on `result.warnings`. The
 * `transactionType` discriminator is derived from `ST-03`
 * (`005010X214` → `"claim-acknowledgment"`, otherwise `"claim-status"`).
 *
 * @example
 * ```ts
 * import { parseX12, get277Status } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const group of ix.groups) {
 *   for (const tx of group.transactions) {
 *     if (tx.st.elements[1] !== "277") continue;
 *     const status = get277Status(ix.delimiters, tx);
 *     for (const claim of status?.claims ?? []) {
 *       claim.traces[0]?.referenceId;                 // echoed 276 trace
 *       claim.statuses[0]?.statuses[0]?.statusCode;   // "20"
 *     }
 *   }
 * }
 * ```
 */
export function get277Status(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12ClaimStatusResponse | undefined {
  if (tx.st.elements[1] !== "277") return undefined;
  return walk277(delimiters, tx);
}

/**
 * Extract a 277CA Claim Acknowledgment (`005010X214`). Returns `undefined`
 * unless the transaction is a 277 whose `ST-03` is `005010X214` — use
 * {@link get277Status} for the general 277 Claim Status Response. The
 * returned model is the same {@link X12ClaimStatusResponse}; the
 * `transactionType` is always `"claim-acknowledgment"`.
 *
 * @example
 * ```ts
 * import { parseX12, get277CADisposition } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
 * const ack = tx === undefined ? undefined : get277CADisposition(ix.delimiters, tx);
 * ack?.claims[0]?.statuses[0]?.statuses[0]?.categoryCode; // "A1" / "A2" / "A3"
 * ```
 */
export function get277CADisposition(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12ClaimStatusResponse | undefined {
  if (tx.st.elements[1] !== "277") return undefined;
  if (tx.st.elements[3] !== ICR_277CA) return undefined;
  return walk277(delimiters, tx);
}

/**
 * Shared 277 / 277CA walk. The HL spine + STC machinery is identical; the
 * caller's `ST-03` gate decides which public surface admits the
 * transaction. @internal
 */
function walk277(delimiters: Delimiters, tx: X12TransactionSet): X12ClaimStatusResponse {
  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);
  const implementationConventionReference = tx.st.elements[3];
  const transactionType =
    implementationConventionReference === ICR_277CA ? "claim-acknowledgment" : "claim-status";

  const hierarchies: X12Hl[] = [];
  const hlIndex: Map<string, X12Hl> = new Map();

  const claims: X12ClaimStatus[] = [];
  let currentSource: X12StatusEntity | undefined;
  let currentReceiver: X12StatusEntity | undefined;
  let currentProvider: X12StatusEntity | undefined;
  let currentSubscriber: X12StatusMember | undefined;
  let currentDependent: X12StatusMember | undefined;
  let currentClaim: ClaimAccumulator | undefined;
  let currentServiceLine: ServiceLineAccumulator | undefined;
  let context: "source" | "receiver" | "provider" | "subscriber" | "dependent" | "other" = "other";

  const flushServiceLine = (): void => {
    if (currentServiceLine !== undefined && currentClaim !== undefined) {
      currentClaim.serviceLines.push(freezeServiceLine(currentServiceLine));
    }
    currentServiceLine = undefined;
  };

  const flushClaim = (): void => {
    flushServiceLine();
    if (currentClaim !== undefined) claims.push(freezeClaim(currentClaim));
    currentClaim = undefined;
  };

  /** Open a fresh claim accumulator bound to the current HL context. */
  const openClaim = (): ClaimAccumulator => ({
    informationSource: currentSource,
    informationReceiver: currentReceiver,
    serviceProvider: currentProvider,
    subscriber: currentSubscriber,
    dependent: currentDependent,
    traces: [],
    statuses: [],
    references: [],
    dates: [],
    serviceLines: [],
  });

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };
    switch (seg.id) {
      case "HL": {
        flushClaim();
        const hl = decodeHl(seg, delimiters);
        hierarchies.push(hl);
        validateHl(hl, hlIndex, EXPECTED_PARENT_LEVEL, position, warnings);
        hlIndex.set(hl.hlId, hl);
        if (hl.levelCode === HL_LEVEL_CODES.INFORMATION_SOURCE) {
          currentSource = undefined;
          currentReceiver = undefined;
          currentProvider = undefined;
          currentSubscriber = undefined;
          currentDependent = undefined;
          context = "source";
        } else if (hl.levelCode === HL_LEVEL_CODES.INFORMATION_RECEIVER) {
          currentReceiver = undefined;
          currentProvider = undefined;
          currentSubscriber = undefined;
          currentDependent = undefined;
          context = "receiver";
        } else if (hl.levelCode === HL_LEVEL_CODES.PROVIDER_OF_SERVICE) {
          currentProvider = undefined;
          currentSubscriber = undefined;
          currentDependent = undefined;
          context = "provider";
        } else if (hl.levelCode === HL_LEVEL_CODES.SUBSCRIBER) {
          currentSubscriber = undefined;
          currentDependent = undefined;
          context = "subscriber";
        } else if (hl.levelCode === HL_LEVEL_CODES.DEPENDENT) {
          currentDependent = undefined;
          context = "dependent";
        } else {
          context = "other";
        }
        break;
      }
      case "NM1": {
        if (currentClaim !== undefined) break;
        switch (context) {
          case "source":
            currentSource = decodeEntity(seg, delimiters);
            break;
          case "receiver":
            currentReceiver = decodeEntity(seg, delimiters);
            break;
          case "provider":
            currentProvider = decodeEntity(seg, delimiters);
            break;
          case "subscriber":
            currentSubscriber = decodeMember(seg, delimiters);
            break;
          case "dependent":
            currentDependent = decodeMember(seg, delimiters);
            break;
          case "other":
            break;
        }
        break;
      }
      case "TRN": {
        // A claim-level reassociation trace opens a new Loop 2200.
        flushClaim();
        currentClaim = openClaim();
        currentClaim.traces.push(decodeTrn(seg, delimiters));
        break;
      }
      case "STC": {
        const info = decodeStc(seg, delimiters, warnings, position);
        if (currentServiceLine !== undefined) {
          currentServiceLine.statuses.push(info);
        } else {
          // A 277CA provider-level batch ack may emit STC with no TRN —
          // open a claim on first STC so the status is never dropped.
          if (currentClaim === undefined) currentClaim = openClaim();
          currentClaim.statuses.push(info);
        }
        break;
      }
      case "SVC": {
        flushServiceLine();
        if (currentClaim === undefined) currentClaim = openClaim();
        currentServiceLine = openServiceLine(seg, delimiters);
        break;
      }
      case "REF": {
        const ref = decodeRef(seg, delimiters);
        if (currentServiceLine !== undefined) currentServiceLine.references.push(ref);
        else if (currentClaim !== undefined) currentClaim.references.push(ref);
        break;
      }
      case "DTP": {
        const date = decodeDtp(seg, delimiters);
        if (date === undefined) break;
        if (currentServiceLine !== undefined) currentServiceLine.dates.push(date);
        else if (currentClaim !== undefined) currentClaim.dates.push(date);
        break;
      }
      default: {
        // BHT / QTY / AMT / PER / LX and any other optional segment is
        // preserved on tx.segments verbatim; the v1 surface does not
        // enumerate every segment.
        break;
      }
    }
  }

  flushClaim();

  return Object.freeze({
    transactionType,
    implementationConventionReference,
    claims: Object.freeze(claims.slice()),
    hierarchies: Object.freeze(hierarchies.slice()),
    warnings: Object.freeze(warnings.slice()),
  });
}

// ---------------------------------------------------------------------------
// Mutable accumulators (frozen into the readonly public shape at the end).
// ---------------------------------------------------------------------------

/** @internal */
interface ClaimAccumulator {
  readonly informationSource: X12StatusEntity | undefined;
  readonly informationReceiver: X12StatusEntity | undefined;
  readonly serviceProvider: X12StatusEntity | undefined;
  readonly subscriber: X12StatusMember | undefined;
  readonly dependent: X12StatusMember | undefined;
  readonly traces: X12StatusTrace[];
  readonly statuses: X12StatusInfo[];
  readonly references: X12StatusReference[];
  readonly dates: X12StatusDate[];
  readonly serviceLines: X12ServiceLineStatus[];
}

/** @internal */
interface ServiceLineAccumulator {
  readonly serviceIdQualifier: string | undefined;
  readonly procedureCode: string | undefined;
  readonly modifiers: string[];
  readonly lineChargeAmount: X12Decimal | undefined;
  readonly linePaymentAmount: X12Decimal | undefined;
  readonly revenueCode: string | undefined;
  readonly statuses: X12StatusInfo[];
  readonly references: X12StatusReference[];
  readonly dates: X12StatusDate[];
}

// ---------------------------------------------------------------------------
// Segment decoders.
// ---------------------------------------------------------------------------

/** @internal */
function decodeEntity(seg: X12Segment, delimiters: Delimiters): X12StatusEntity {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    entityTypeQualifier: elementValue(seg, 2, delimiters),
    name: elementValue(seg, 3, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
  });
}

/** @internal */
function decodeMember(seg: X12Segment, delimiters: Delimiters): X12StatusMember {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    entityTypeQualifier: elementValue(seg, 2, delimiters),
    lastName: elementOptional(seg, 3, delimiters),
    firstName: elementOptional(seg, 4, delimiters),
    middleName: elementOptional(seg, 5, delimiters),
    suffix: elementOptional(seg, 7, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
  });
}

/** @internal */
function decodeTrn(seg: X12Segment, delimiters: Delimiters): X12StatusTrace {
  return Object.freeze({
    traceTypeCode: elementValue(seg, 1, delimiters),
    referenceId: elementValue(seg, 2, delimiters),
    originatingCompanyId: elementOptional(seg, 3, delimiters),
    supplementalReferenceId: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeRef(seg: X12Segment, delimiters: Delimiters): X12StatusReference {
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value: elementValue(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

/** @internal */
function decodeDtp(seg: X12Segment, delimiters: Delimiters): X12StatusDate | undefined {
  const qualifier = elementOptional(seg, 1, delimiters);
  const value = elementOptional(seg, 3, delimiters);
  if (qualifier === undefined || value === undefined) return undefined;
  return Object.freeze({
    qualifier,
    formatQualifier: elementValue(seg, 2, delimiters),
    value,
  });
}

/**
 * Decode an STC segment into one {@link X12StatusInfo}. STC-01 / STC-10 /
 * STC-11 are each a C043 Health Care Claim Status composite (CSCC : CSC :
 * entity); the headline date / action / amounts live in STC-02..06; the
 * free-form message in STC-12. @internal
 */
function decodeStc(
  seg: X12Segment,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): X12StatusInfo {
  const statuses: X12StatusCode[] = [];
  for (const elementIndex of [1, 10, 11]) {
    const code = decodeStatusComposite(seg, elementIndex, delimiters, warnings, position);
    if (code !== undefined) statuses.push(code);
  }
  return Object.freeze({
    statusEffectiveDate: elementOptional(seg, 2, delimiters),
    actionCode: elementOptional(seg, 3, delimiters),
    totalChargeAmount: elementDecimal(seg, 4, delimiters),
    paymentAmount: elementDecimal(seg, 5, delimiters),
    adjudicationDate: elementOptional(seg, 6, delimiters),
    message: elementOptional(seg, 12, delimiters),
    statuses: Object.freeze(statuses),
  });
}

/**
 * Decode one C043 Health Care Claim Status composite at element N. Returns
 * `undefined` when both the category and status components are absent
 * (so STC-10 / STC-11 on a single-status STC don't synthesize empties).
 * Unknown CSCC / CSC codes are preserved verbatim and emit their
 * respective warnings. @internal
 */
function decodeStatusComposite(
  seg: X12Segment,
  n: number,
  delimiters: Delimiters,
  warnings: X12ParseWarning[],
  position: X12Position,
): X12StatusCode | undefined {
  const categoryCode = componentOptional(seg, n, 1, delimiters);
  const statusCode = componentOptional(seg, n, 2, delimiters);
  const entityCode = componentOptional(seg, n, 3, delimiters);
  if (categoryCode === undefined && statusCode === undefined) return undefined;
  const category = categoryCode === undefined ? undefined : lookupClaimStatusCategory(categoryCode);
  if (categoryCode !== undefined && category === undefined) {
    warnings.push(unknownClaimStatusCategory(position, categoryCode));
  }
  const status = statusCode === undefined ? undefined : lookupClaimStatus(statusCode);
  if (statusCode !== undefined && status === undefined) {
    warnings.push(unknownClaimStatus(position, statusCode));
  }
  return Object.freeze({
    categoryCode: categoryCode ?? "",
    categoryDescription: category?.description,
    statusCode: statusCode ?? "",
    statusDescription: status?.description,
    entityCode,
  });
}

/** @internal */
function openServiceLine(seg: X12Segment, delimiters: Delimiters): ServiceLineAccumulator {
  const modifiers: string[] = [];
  for (let comp = 3; comp <= 6; comp += 1) {
    const m = componentOptional(seg, 1, comp, delimiters);
    if (m !== undefined) modifiers.push(m);
  }
  return {
    serviceIdQualifier: componentOptional(seg, 1, 1, delimiters),
    procedureCode: componentOptional(seg, 1, 2, delimiters),
    modifiers,
    lineChargeAmount: elementDecimal(seg, 2, delimiters),
    linePaymentAmount: elementDecimal(seg, 3, delimiters),
    revenueCode: elementOptional(seg, 4, delimiters),
    statuses: [],
    references: [],
    dates: [],
  };
}

// ---------------------------------------------------------------------------
// Freezing accumulators into the readonly public shape.
// ---------------------------------------------------------------------------

/** @internal */
function freezeServiceLine(acc: ServiceLineAccumulator): X12ServiceLineStatus {
  return Object.freeze({
    serviceIdQualifier: acc.serviceIdQualifier,
    procedureCode: acc.procedureCode,
    modifiers: Object.freeze(acc.modifiers.slice()),
    lineChargeAmount: acc.lineChargeAmount,
    linePaymentAmount: acc.linePaymentAmount,
    revenueCode: acc.revenueCode,
    statuses: Object.freeze(acc.statuses.slice()),
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
  });
}

/** @internal */
function freezeClaim(acc: ClaimAccumulator): X12ClaimStatus {
  return Object.freeze({
    informationSource: acc.informationSource,
    informationReceiver: acc.informationReceiver,
    serviceProvider: acc.serviceProvider,
    subscriber: acc.subscriber,
    dependent: acc.dependent,
    traces: Object.freeze(acc.traces.slice()),
    statuses: Object.freeze(acc.statuses.slice()),
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
    serviceLines: Object.freeze(acc.serviceLines.slice()),
  });
}

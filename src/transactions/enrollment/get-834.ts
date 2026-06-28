/**
 * `get834Header` + `get834Enrollments` — extract a typed 834 Benefit
 * Enrollment and Maintenance (`005010X220A1`) from a parsed transaction set.
 * The header (BGN + sponsor/payer) is a small synchronous read; the
 * member-level detail is a **stream** — `get834Enrollments` is an
 * `AsyncIterable` yielding one {@link X12Enrollment} per `INS` loop so a
 * consumer never holds the whole roster in memory at once.
 *
 * Lenient on parse: every recoverable deviation is preserved verbatim,
 * never thrown. Maintenance type (`INS-03` / `HD-01`, X12 0875) is the
 * safety-critical field — the verbatim code is ALWAYS preserved and the
 * parser NEVER infers an action for an unknown code; it raises
 * `X12_834_UNKNOWN_MAINTENANCE_TYPE` on the affected member instead.
 *
 * Streaming caveat (honest limitation): the member stream iterates over an
 * ALREADY-parsed `X12TransactionSet`, so the file is still parsed into
 * `tx.segments` up front. The memory win is on the RESULT side — a consumer
 * processing a hundreds-of-MB 834 holds one decoded member at a time, not
 * the whole decoded roster. A true file→iterator streaming parser is a v2
 * item (see roadmap Phase 2 streaming invariant).
 *
 * Spec source: WPC TR3 `005010X220A1`.
 */

import { lookupMaintenanceType } from "../../code-lists/maintenance-type.js";
import {
  collectElementValues,
  elementDecimal,
  elementOptional,
  elementValue,
  type X12Segment,
} from "../../parser/segment.js";
import type { Delimiters, X12Position, X12TransactionSet } from "../../parser/types.js";
import { unknownMaintenanceType, type X12ParseWarning } from "../../parser/warnings.js";
import type {
  X12CoordinationOfBenefits,
  X12Enrollment,
  X12EnrollmentAddress,
  X12EnrollmentAmount,
  X12EnrollmentDate,
  X12EnrollmentHeader,
  X12EnrollmentMember,
  X12EnrollmentParty,
  X12EnrollmentReference,
  X12HealthCoverage,
} from "./types.js";

/** Slice the ST..SE body once, dropping the ST (and SE if present). @internal */
function enrollmentBody(tx: X12TransactionSet): readonly X12Segment[] {
  return tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);
}

/**
 * Extract the 834 header — BGN + sponsor (`N1*P5`) + payer (`N1*IN`).
 * Pure function. Returns `undefined` only if the input transaction's ST-01
 * is not `"834"` (mis-routed call). Stops collecting header parties at the
 * first `INS` (member-level detail) — those belong to the member stream.
 *
 * @example
 * ```ts
 * import { parseX12, get834Header } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
 * const header = tx === undefined ? undefined : get834Header(ix.delimiters, tx);
 * header?.sponsor?.name;
 * ```
 */
export function get834Header(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): X12EnrollmentHeader | undefined {
  if (tx.st.elements[1] !== "834") return undefined;

  const warnings: X12ParseWarning[] = [];
  const references: X12EnrollmentReference[] = [];
  const dates: X12EnrollmentDate[] = [];
  let purpose = "";
  let referenceId: string | undefined;
  let date: string | undefined;
  let time: string | undefined;
  let actionCode: string | undefined;
  let sponsor: X12EnrollmentParty | undefined;
  let payer: X12EnrollmentParty | undefined;

  for (const seg of enrollmentBody(tx)) {
    if (seg.id === "INS") break; // member-level detail begins — header is done.
    switch (seg.id) {
      case "BGN": {
        purpose = elementValue(seg, 1, delimiters);
        referenceId = elementOptional(seg, 2, delimiters);
        date = elementOptional(seg, 3, delimiters);
        time = elementOptional(seg, 4, delimiters);
        actionCode = elementOptional(seg, 8, delimiters);
        break;
      }
      case "N1": {
        const qualifier = elementValue(seg, 1, delimiters);
        const party = decodeN1(seg, delimiters);
        if (qualifier === "P5") sponsor = party;
        else if (qualifier === "IN") payer = party;
        break;
      }
      case "REF": {
        references.push(decodeRef(seg, delimiters));
        break;
      }
      case "DTP": {
        const d = decodeDtp(seg, delimiters);
        if (d !== undefined) dates.push(d);
        break;
      }
      default:
        break;
    }
  }

  return Object.freeze({
    transactionSetPurposeCode: purpose,
    referenceId,
    date,
    time,
    actionCode,
    sponsor,
    payer,
    references: Object.freeze(references.slice()),
    dates: Object.freeze(dates.slice()),
    warnings: Object.freeze(warnings.slice()),
  });
}

/**
 * Stream the 834 member-level detail loops — one {@link X12Enrollment} per
 * `INS` segment. For a non-834 transaction the iterable yields nothing.
 * Async-generator typed so the contract leaves room for a future
 * file→iterator streaming source; the v1 implementation iterates the
 * already-parsed `tx.segments` synchronously under the hood.
 *
 * @example
 * ```ts
 * import { parseX12, get834Enrollments } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
 * if (tx !== undefined) {
 *   for await (const member of get834Enrollments(ix.delimiters, tx)) {
 *     member.maintenanceTypeCode;      // "021"
 *     member.member?.idCode;           // verbatim member id
 *   }
 * }
 * ```
 */
export async function* get834Enrollments(
  delimiters: Delimiters,
  tx: X12TransactionSet,
): AsyncIterable<X12Enrollment> {
  if (tx.st.elements[1] !== "834") return;
  // Yield to the microtask queue so the iterator is genuinely async — a
  // consumer's `for await` interleaves with other work even on the v1
  // in-memory source. (Also satisfies the no-bare-async-generator lint.)
  await Promise.resolve();

  const body = enrollmentBody(tx);
  let current: EnrollmentAccumulator | undefined;
  let currentCoverage: HealthCoverageAccumulator | undefined;

  const flushCoverage = (): void => {
    if (current !== undefined && currentCoverage !== undefined) {
      current.healthCoverages.push(freezeCoverage(currentCoverage));
    }
    currentCoverage = undefined;
  };

  for (let i = 0; i < body.length; i += 1) {
    const seg = body[i];
    if (seg === undefined) continue;
    const position: X12Position = { segmentIndex: i + 1, transactionIndex: 0 };

    if (seg.id === "INS") {
      if (current !== undefined) {
        flushCoverage();
        yield freezeEnrollment(current);
      }
      current = openEnrollment(seg, delimiters, position);
      currentCoverage = undefined;
      continue;
    }
    if (current === undefined) continue; // pre-INS header segments — not ours.

    switch (seg.id) {
      case "NM1": {
        // Member name (Loop 2100A). The first IL member name on the loop is
        // the member; other NM1 qualifiers (custodial parent, responsible
        // person) stay verbatim on tx.segments in v1.
        const qualifier = elementValue(seg, 1, delimiters);
        if (qualifier === "IL" && current.member === undefined) {
          current.member = decodeNm1(seg, delimiters);
        }
        break;
      }
      case "DMG": {
        if (current.member !== undefined) {
          current.member = withDemographics(
            current.member,
            elementOptional(seg, 2, delimiters),
            elementOptional(seg, 3, delimiters),
          );
        }
        break;
      }
      case "N3": {
        if (current.member !== undefined) {
          const lines = collectElementValues(seg, 1, 2, delimiters);
          current.member = withAddress(
            current.member,
            withLines(current.member.address ?? EMPTY_ADDRESS, lines),
          );
        }
        break;
      }
      case "N4": {
        if (current.member !== undefined) {
          current.member = withAddress(
            current.member,
            mergeAddress(current.member.address ?? EMPTY_ADDRESS, decodeN4(seg, delimiters)),
          );
        }
        break;
      }
      case "HD": {
        flushCoverage();
        currentCoverage = openCoverage(seg, delimiters, position, current.warnings);
        break;
      }
      case "COB": {
        current.coordinationOfBenefits.push(decodeCob(seg, delimiters));
        break;
      }
      case "REF": {
        current.references.push(decodeRef(seg, delimiters));
        break;
      }
      case "DTP": {
        const date = decodeDtp(seg, delimiters);
        if (date === undefined) break;
        if (currentCoverage !== undefined) currentCoverage.dates.push(date);
        else current.dates.push(date);
        break;
      }
      case "AMT": {
        if (currentCoverage === undefined) break;
        const amount = decodeAmt(seg, delimiters);
        if (amount !== undefined) currentCoverage.amounts.push(amount);
        break;
      }
      default:
        break;
    }
  }

  if (current !== undefined) {
    flushCoverage();
    yield freezeEnrollment(current);
  }
}

// ---------------------------------------------------------------------------
// Internal accumulators (mutable during the walk, frozen at the end).
// ---------------------------------------------------------------------------

/** Mutable in-flight Loop 2000 member detail. @internal */
interface EnrollmentAccumulator {
  readonly subscriberIndicator: string | undefined;
  readonly relationshipCode: string | undefined;
  readonly maintenanceTypeCode: string;
  readonly maintenanceTypeDescription: string | undefined;
  readonly maintenanceReasonCode: string | undefined;
  readonly benefitStatusCode: string | undefined;
  readonly employmentStatusCode: string | undefined;
  member: X12EnrollmentMember | undefined;
  readonly references: X12EnrollmentReference[];
  readonly dates: X12EnrollmentDate[];
  readonly healthCoverages: X12HealthCoverage[];
  readonly coordinationOfBenefits: X12CoordinationOfBenefits[];
  readonly warnings: X12ParseWarning[];
}

/** Mutable in-flight Loop 2300 health coverage. @internal */
interface HealthCoverageAccumulator {
  readonly maintenanceTypeCode: string | undefined;
  readonly maintenanceTypeDescription: string | undefined;
  readonly insuranceLineCode: string | undefined;
  readonly planCoverageDescription: string | undefined;
  readonly coverageLevelCode: string | undefined;
  readonly dates: X12EnrollmentDate[];
  readonly amounts: X12EnrollmentAmount[];
}

/** @internal */
function openEnrollment(
  seg: X12Segment,
  delimiters: Delimiters,
  position: X12Position,
): EnrollmentAccumulator {
  const maintenanceTypeCode = elementValue(seg, 3, delimiters);
  const entry = maintenanceTypeCode === "" ? undefined : lookupMaintenanceType(maintenanceTypeCode);
  const warnings: X12ParseWarning[] = [];
  if (maintenanceTypeCode !== "" && entry === undefined) {
    warnings.push(unknownMaintenanceType(position, maintenanceTypeCode));
  }
  return {
    subscriberIndicator: elementOptional(seg, 1, delimiters),
    relationshipCode: elementOptional(seg, 2, delimiters),
    maintenanceTypeCode,
    maintenanceTypeDescription: entry?.description,
    maintenanceReasonCode: elementOptional(seg, 4, delimiters),
    benefitStatusCode: elementOptional(seg, 5, delimiters),
    employmentStatusCode: elementOptional(seg, 8, delimiters),
    member: undefined,
    references: [],
    dates: [],
    healthCoverages: [],
    coordinationOfBenefits: [],
    warnings,
  };
}

/** @internal */
function freezeEnrollment(acc: EnrollmentAccumulator): X12Enrollment {
  return Object.freeze({
    subscriberIndicator: acc.subscriberIndicator,
    relationshipCode: acc.relationshipCode,
    maintenanceTypeCode: acc.maintenanceTypeCode,
    maintenanceTypeDescription: acc.maintenanceTypeDescription,
    maintenanceReasonCode: acc.maintenanceReasonCode,
    benefitStatusCode: acc.benefitStatusCode,
    employmentStatusCode: acc.employmentStatusCode,
    member: acc.member,
    references: Object.freeze(acc.references.slice()),
    dates: Object.freeze(acc.dates.slice()),
    healthCoverages: Object.freeze(acc.healthCoverages.slice()),
    coordinationOfBenefits: Object.freeze(acc.coordinationOfBenefits.slice()),
    warnings: Object.freeze(acc.warnings.slice()),
  });
}

/** @internal */
function openCoverage(
  seg: X12Segment,
  delimiters: Delimiters,
  position: X12Position,
  warnings: X12ParseWarning[],
): HealthCoverageAccumulator {
  const maintenanceTypeCode = elementOptional(seg, 1, delimiters);
  let maintenanceTypeDescription: string | undefined;
  if (maintenanceTypeCode !== undefined) {
    const entry = lookupMaintenanceType(maintenanceTypeCode);
    if (entry === undefined) warnings.push(unknownMaintenanceType(position, maintenanceTypeCode));
    maintenanceTypeDescription = entry?.description;
  }
  return {
    maintenanceTypeCode,
    maintenanceTypeDescription,
    insuranceLineCode: elementOptional(seg, 3, delimiters),
    planCoverageDescription: elementOptional(seg, 4, delimiters),
    coverageLevelCode: elementOptional(seg, 5, delimiters),
    dates: [],
    amounts: [],
  };
}

/** @internal */
function freezeCoverage(acc: HealthCoverageAccumulator): X12HealthCoverage {
  return Object.freeze({
    maintenanceTypeCode: acc.maintenanceTypeCode,
    maintenanceTypeDescription: acc.maintenanceTypeDescription,
    insuranceLineCode: acc.insuranceLineCode,
    planCoverageDescription: acc.planCoverageDescription,
    coverageLevelCode: acc.coverageLevelCode,
    dates: Object.freeze(acc.dates.slice()),
    amounts: Object.freeze(acc.amounts.slice()),
  });
}

// ---------------------------------------------------------------------------
// Segment decoders.
// ---------------------------------------------------------------------------

/** @internal */
function decodeN1(seg: X12Segment, delimiters: Delimiters): X12EnrollmentParty {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    name: elementValue(seg, 2, delimiters),
    idQualifier: elementOptional(seg, 3, delimiters),
    idCode: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeNm1(seg: X12Segment, delimiters: Delimiters): X12EnrollmentMember {
  return Object.freeze({
    entityIdentifierCode: elementValue(seg, 1, delimiters),
    lastName: elementOptional(seg, 3, delimiters),
    firstName: elementOptional(seg, 4, delimiters),
    middleName: elementOptional(seg, 5, delimiters),
    suffix: elementOptional(seg, 7, delimiters),
    idQualifier: elementOptional(seg, 8, delimiters),
    idCode: elementOptional(seg, 9, delimiters),
    dateOfBirth: undefined,
    genderCode: undefined,
    address: undefined,
  });
}

/** @internal */
function decodeN4(seg: X12Segment, delimiters: Delimiters): X12EnrollmentAddress {
  return Object.freeze({
    lines: Object.freeze([]),
    city: elementOptional(seg, 1, delimiters),
    state: elementOptional(seg, 2, delimiters),
    postalCode: elementOptional(seg, 3, delimiters),
    countryCode: elementOptional(seg, 4, delimiters),
  });
}

/** @internal */
function decodeRef(seg: X12Segment, delimiters: Delimiters): X12EnrollmentReference {
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value: elementValue(seg, 2, delimiters),
    description: elementOptional(seg, 3, delimiters),
  });
}

/**
 * Decode a DTP date. DTP-01 qualifier, DTP-02 format qualifier (`D8` single
 * / `RD8` range), DTP-03 the verbatim date or range. Skipped if DTP-03 is
 * absent. @internal
 */
function decodeDtp(seg: X12Segment, delimiters: Delimiters): X12EnrollmentDate | undefined {
  const value = elementOptional(seg, 3, delimiters);
  if (value === undefined) return undefined;
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    value,
  });
}

/** @internal */
function decodeAmt(seg: X12Segment, delimiters: Delimiters): X12EnrollmentAmount | undefined {
  const amount = elementDecimal(seg, 2, delimiters);
  if (amount === undefined) return undefined;
  return Object.freeze({
    qualifier: elementValue(seg, 1, delimiters),
    amount,
  });
}

/** @internal */
function decodeCob(seg: X12Segment, delimiters: Delimiters): X12CoordinationOfBenefits {
  return Object.freeze({
    payerResponsibility: elementOptional(seg, 1, delimiters),
    referenceId: elementOptional(seg, 2, delimiters),
    coordinationOfBenefitsCode: elementOptional(seg, 3, delimiters),
  });
}

// ---------------------------------------------------------------------------
// Member / address mutators (immutable — return a new member with the change).
// ---------------------------------------------------------------------------

const EMPTY_ADDRESS: X12EnrollmentAddress = Object.freeze({
  lines: Object.freeze([]),
  city: undefined,
  state: undefined,
  postalCode: undefined,
  countryCode: undefined,
});

/** @internal */
function withDemographics(
  member: X12EnrollmentMember,
  dateOfBirth: string | undefined,
  genderCode: string | undefined,
): X12EnrollmentMember {
  return Object.freeze({ ...member, dateOfBirth, genderCode });
}

/** @internal */
function withAddress(
  member: X12EnrollmentMember,
  address: X12EnrollmentAddress,
): X12EnrollmentMember {
  return Object.freeze({ ...member, address });
}

/** @internal */
function withLines(address: X12EnrollmentAddress, lines: readonly string[]): X12EnrollmentAddress {
  return Object.freeze({ ...address, lines: Object.freeze([...address.lines, ...lines]) });
}

/** @internal */
function mergeAddress(
  base: X12EnrollmentAddress,
  fromN4: X12EnrollmentAddress,
): X12EnrollmentAddress {
  return Object.freeze({
    lines: base.lines,
    city: fromN4.city ?? base.city,
    state: fromN4.state ?? base.state,
    postalCode: fromN4.postalCode ?? base.postalCode,
    countryCode: fromN4.countryCode ?? base.countryCode,
  });
}

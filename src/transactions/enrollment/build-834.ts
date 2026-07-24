/**
 * `build834` - pure-function builder for a 005010X220A1 Benefit Enrollment
 * and Maintenance transaction (834). NEVER auto-sends, NEVER opens a socket,
 * NEVER touches the filesystem. The library mechanically emits the
 * enrollment it is told; a spec that carries a maintenance type code the
 * library cannot vouch for, or that cannot form a self-consistent 834, is
 * REFUSED via {@link "./build-errors.js".Enrollment834BuildError}.
 *
 * Maintenance type (`INS-03` / `HD-01`, X12 Code Source 875) is the 834's
 * safety primitive - the builder emits the supplied code VERBATIM (never
 * inferred, never normalized) and REFUSES a code outside the validated
 * subset. The read side ({@link "./get-834.js".get834Enrollments}) is
 * lenient - an unknown code on a *received* 834 is WARNED, never rejected,
 * because the parser must surface what arrived. The builder is strict: it
 * will not WRITE an action a downstream enrollment system would mis-apply.
 *
 * Output shape: a complete {@link X12Interchange} wrapping a single GS..GE
 * functional group (GS-01 `"BE"`) containing a single ST..SE 834
 * transaction set (ST-03 `005010X220A1`), spec-clean and round-trippable
 * through {@link parseX12}. The builder emits segments in TR3 loop order so
 * a well-formed spec round-trips through `get834Header` /
 * `get834Enrollments` field-for-field.
 */

import { ENROLLMENT_834_BUILD_ERROR_CODES, Enrollment834BuildError } from "./build-errors.js";
import type {
  Build834AddressSpec,
  Build834CoverageSpec,
  Build834DateSpec,
  Build834HeaderSpec,
  Build834MemberNameSpec,
  Build834MemberSpec,
  Build834PartySpec,
  Build834ReferenceSpec,
  Build834Spec,
} from "./build-834-types.js";
import { lookupMaintenanceType } from "../../code-lists/maintenance-type.js";
import { parseX12 } from "../../parser/index.js";
import type { X12Interchange } from "../../parser/types.js";
import { escapeRelease } from "../../parser/release.js";

/** GS-08 / ST-03 version + release emitted for every 834 - the WPC TR3 `005010X220A1`. @internal */
const X220A1_VERSION_RELEASE = "005010X220A1";

/** GS-01 functional identifier code for the 834. `BE` = Benefit Enrollment and Maintenance. @internal */
const X12_834_FUNCTIONAL_ID = "BE";

/** GS-07 standards agency code - `X` for ASC X12. @internal */
const X12_AGENCY_CODE = "X";

/** Default NM1-01 for a member name - the read side captures only the insured. @internal */
const MEMBER_DEFAULT_ENTITY_ID = "IL";

/** Default DTP-02 date/time format qualifier - single CCYYMMDD date. @internal */
const DTP_DEFAULT_FORMAT = "D8";

/**
 * `build834` - assemble a 005010X220A1 834 around the supplied spec.
 *
 * Refused via {@link "./build-errors.js".Enrollment834BuildError}:
 * - an `INS-03` or `HD-01` maintenance type code outside the validated X12
 *   875 subset → `X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE`;
 * - no member loop, an empty (required) `INS-03`, or an over-long (> 9 char)
 *   interchange control number → `X12_834_BUILD_INVALID_SPEC`.
 *
 * @example
 * ```ts
 * import { build834 } from "@cosyte/x12";
 * const ix = build834({
 *   envelope: {
 *     senderId: "EMPLOYERCO", receiverId: "MEDPAY",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   header: {
 *     transactionSetPurposeCode: "00",
 *     sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
 *     payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
 *   },
 *   members: [{
 *     subscriberIndicator: "Y", relationshipCode: "18", maintenanceTypeCode: "021",
 *     member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
 *     healthCoverages: [{ maintenanceTypeCode: "021", insuranceLineCode: "HLT" }],
 *   }],
 * });
 * ```
 */
export function build834(spec: Build834Spec): X12Interchange {
  const { envelope } = spec;

  // ---- Structural + maintenance-type preconditions ----------------------

  enforceStructuralSpec(spec);

  // ---- Delimiter resolution + escape helper -----------------------------

  const elementSeparator = envelope.elementSeparator ?? "*";
  const repetitionSeparator = envelope.repetitionSeparator ?? "^";
  const componentSeparator = envelope.componentSeparator ?? ":";
  const segmentTerminator = envelope.segmentTerminator ?? "~";
  const delimiters = {
    element: elementSeparator,
    repetition: repetitionSeparator,
    component: componentSeparator,
    segment: segmentTerminator,
  };
  const esc = (value: string): string => escapeRelease(value, delimiters);

  /**
   * Join already-escaped element strings into a segment, dropping trailing
   * empty elements (interior empties are positionally meaningful and kept).
   */
  const seg = (parts: readonly string[]): string => {
    let end = parts.length;
    while (end > 1 && parts[end - 1] === "") end -= 1;
    return parts.slice(0, end).join(elementSeparator) + segmentTerminator;
  };

  // ---- ISA envelope -----------------------------------------------------

  const senderQualifier = envelope.senderQualifier ?? "ZZ";
  const receiverQualifier = envelope.receiverQualifier ?? "ZZ";
  const usageIndicator = envelope.usageIndicator ?? "P";
  const interchangeControlNumber = padControl(envelope.interchangeControlNumber, 9);
  const isa =
    [
      "ISA",
      "00", // ISA-01
      pad(" ", 10), // ISA-02
      "00", // ISA-03
      pad(" ", 10), // ISA-04
      pad(senderQualifier, 2), // ISA-05
      pad(envelope.senderId, 15), // ISA-06
      pad(receiverQualifier, 2), // ISA-07
      pad(envelope.receiverId, 15), // ISA-08
      pad(envelope.interchangeDate, 6), // ISA-09 - YYMMDD
      pad(envelope.interchangeTime, 4), // ISA-10 - HHMM
      repetitionSeparator, // ISA-11
      "00501", // ISA-12
      interchangeControlNumber, // ISA-13
      "0", // ISA-14
      usageIndicator, // ISA-15
      componentSeparator, // ISA-16
    ].join(elementSeparator) + segmentTerminator;

  // ---- GS / ST ----------------------------------------------------------

  const groupDate = envelope.groupDate ?? expandYY(envelope.interchangeDate);
  const groupTime = envelope.groupTime ?? envelope.interchangeTime;
  const applicationSenderCode = envelope.applicationSenderCode ?? envelope.senderId;
  const applicationReceiverCode = envelope.applicationReceiverCode ?? envelope.receiverId;

  const gs = seg([
    "GS",
    X12_834_FUNCTIONAL_ID, // GS-01 - "BE"
    esc(applicationSenderCode), // GS-02
    esc(applicationReceiverCode), // GS-03
    groupDate, // GS-04 - CCYYMMDD
    groupTime, // GS-05 - HHMM
    esc(envelope.groupControlNumber), // GS-06
    X12_AGENCY_CODE, // GS-07
    X220A1_VERSION_RELEASE, // GS-08
  ]);

  const stControlNumber = envelope.transactionSetControlNumber;
  const st = seg(["ST", "834", esc(stControlNumber), X220A1_VERSION_RELEASE]);

  // ---- Body segments ----------------------------------------------------

  const body: string[] = [];
  emitHeader(spec.header, body, seg, esc);
  for (const member of spec.members) emitMember(member, body, seg, esc);

  // ---- SE / GE / IEA ----------------------------------------------------

  // SE-01 counts every segment in the set, ST and SE inclusive.
  const seCount = body.length + 2;
  const se = seg(["SE", String(seCount), esc(stControlNumber)]);
  const ge = seg(["GE", "1", esc(envelope.groupControlNumber)]);
  const iea = seg(["IEA", "1", interchangeControlNumber]);

  const raw = isa + gs + st + body.join("") + se + ge + iea;

  // Final round-trip through `parseX12` so the returned interchange is
  // bit-identical with the parsed form every other helper consumes.
  return parseX12(raw);
}

// ---------------------------------------------------------------------------
// Structural + maintenance-type guards.
// ---------------------------------------------------------------------------

/**
 * Refuse a structurally impossible spec, and any unknown maintenance type,
 * before any emit. Maintenance codes are X12 control codes (never PHI), so
 * the offending code is named in the message; member ids / names never
 * appear. @internal
 */
function enforceStructuralSpec(spec: Build834Spec): void {
  if (spec.members.length === 0) {
    throw new Enrollment834BuildError(
      ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_INVALID_SPEC,
      "build834: at least one member loop (INS) is required.",
    );
  }
  for (let m = 0; m < spec.members.length; m += 1) {
    const member = spec.members[m];
    if (member === undefined) continue;
    if (member.maintenanceTypeCode === "") {
      throw new Enrollment834BuildError(
        ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_INVALID_SPEC,
        `build834: member at index ${String(m)} has an empty INS-03 maintenance type code (required).`,
      );
    }
    if (lookupMaintenanceType(member.maintenanceTypeCode) === undefined) {
      throw new Enrollment834BuildError(
        ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE,
        `build834: member at index ${String(m)} has an unknown INS-03 maintenance type code "${member.maintenanceTypeCode}" (outside X12 Code Source 875).`,
      );
    }
    for (let c = 0; c < (member.healthCoverages ?? []).length; c += 1) {
      const coverage = member.healthCoverages?.[c];
      if (coverage === undefined) continue;
      const hd01 = coverage.maintenanceTypeCode;
      if (hd01 !== undefined && hd01 !== "" && lookupMaintenanceType(hd01) === undefined) {
        throw new Enrollment834BuildError(
          ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE,
          `build834: coverage at member[${String(m)}].healthCoverages[${String(c)}] has an unknown HD-01 maintenance type code "${hd01}" (outside X12 Code Source 875).`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Segment emitters. Each pushes spec-clean segment strings onto `body` in
// TR3 005010X220A1 loop order so the result round-trips through `get834*`.
// ---------------------------------------------------------------------------

/** Emit the header - BGN + sponsor (N1*P5) + payer (N1*IN) + REF* + DTP*. @internal */
function emitHeader(
  header: Build834HeaderSpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  // BGN-08 (action code) is positionally pinned at element 8; interior
  // elements 5..7 are emitted empty and held in place by the action code.
  body.push(
    seg([
      "BGN",
      esc(header.transactionSetPurposeCode),
      esc(header.referenceId ?? ""),
      esc(header.date ?? ""),
      esc(header.time ?? ""),
      "", // BGN-05 time zone code
      "", // BGN-06 original reference number
      "", // BGN-07 transaction type code
      esc(header.actionCode ?? ""), // BGN-08
    ]),
  );
  if (header.sponsor !== undefined) body.push(emitParty(header.sponsor, seg, esc));
  if (header.payer !== undefined) body.push(emitParty(header.payer, seg, esc));
  for (const ref of header.references ?? []) body.push(emitRef(ref, seg, esc));
  for (const date of header.dates ?? []) body.push(emitDate(date, seg, esc));
}

/** Emit a Loop 1000 party (N1). @internal */
function emitParty(
  party: Build834PartySpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg([
    "N1",
    esc(party.entityIdentifierCode),
    esc(party.name),
    esc(party.idQualifier ?? ""),
    esc(party.idCode ?? ""),
  ]);
}

/**
 * Emit a Loop 2000 member - INS + (NM1 + DMG + N3/N4) + REF* + DTP* + COB* +
 * Loop 2300 coverages. Member DTPs are emitted BEFORE the first HD so the
 * read side attaches them to the member (a DTP inside an open coverage loop
 * binds to that coverage). @internal
 */
function emitMember(
  member: Build834MemberSpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  // INS-08 (employment status) is positionally pinned at element 8.
  body.push(
    seg([
      "INS",
      esc(member.subscriberIndicator ?? ""),
      esc(member.relationshipCode ?? ""),
      esc(member.maintenanceTypeCode), // INS-03 - emitted verbatim
      esc(member.maintenanceReasonCode ?? ""),
      esc(member.benefitStatusCode ?? ""),
      "", // INS-06 medicare plan code
      "", // INS-07 cobra qualifying event code
      esc(member.employmentStatusCode ?? ""), // INS-08
    ]),
  );

  if (member.member !== undefined) emitMemberName(member.member, body, seg, esc);
  for (const ref of member.references ?? []) body.push(emitRef(ref, seg, esc));
  for (const date of member.dates ?? []) body.push(emitDate(date, seg, esc));
  for (const cob of member.coordinationOfBenefits ?? []) {
    body.push(
      seg([
        "COB",
        esc(cob.payerResponsibility ?? ""),
        esc(cob.referenceId ?? ""),
        esc(cob.coordinationOfBenefitsCode ?? ""),
      ]),
    );
  }
  for (const coverage of member.healthCoverages ?? []) emitCoverage(coverage, body, seg, esc);
}

/** Emit the member name - NM1*IL + DMG (when dob/gender present) + N3/N4. @internal */
function emitMemberName(
  name: Build834MemberNameSpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  body.push(
    seg([
      "NM1",
      esc(name.entityIdentifierCode ?? MEMBER_DEFAULT_ENTITY_ID),
      "1", // NM1-02 entity type qualifier - person
      esc(name.lastName ?? ""),
      esc(name.firstName ?? ""),
      esc(name.middleName ?? ""),
      "", // NM1-06 name prefix
      esc(name.suffix ?? ""),
      esc(name.idQualifier ?? ""),
      esc(name.idCode ?? ""),
    ]),
  );
  if (name.dateOfBirth !== undefined || name.genderCode !== undefined) {
    body.push(seg(["DMG", "D8", esc(name.dateOfBirth ?? ""), esc(name.genderCode ?? "")]));
  }
  emitAddress(name.address, body, seg, esc);
}

/** Emit N3 + N4 for a member address block, only the present lines / fields. @internal */
function emitAddress(
  address: Build834AddressSpec | undefined,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  if (address === undefined) return;
  if (address.lines.length > 0) {
    body.push(seg(["N3", ...address.lines.map(esc)]));
  }
  if (
    address.city !== undefined ||
    address.state !== undefined ||
    address.postalCode !== undefined ||
    address.countryCode !== undefined
  ) {
    body.push(
      seg([
        "N4",
        esc(address.city ?? ""),
        esc(address.state ?? ""),
        esc(address.postalCode ?? ""),
        esc(address.countryCode ?? ""),
      ]),
    );
  }
}

/** Emit a Loop 2300 coverage - HD + DTP* + AMT*. @internal */
function emitCoverage(
  coverage: Build834CoverageSpec,
  body: string[],
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): void {
  body.push(
    seg([
      "HD",
      esc(coverage.maintenanceTypeCode ?? ""), // HD-01 - emitted verbatim
      "", // HD-02 maintenance reason code
      esc(coverage.insuranceLineCode ?? ""),
      esc(coverage.planCoverageDescription ?? ""),
      esc(coverage.coverageLevelCode ?? ""),
    ]),
  );
  for (const date of coverage.dates ?? []) body.push(emitDate(date, seg, esc));
  for (const amount of coverage.amounts ?? []) {
    body.push(seg(["AMT", esc(amount.qualifier), esc(amount.amount.toString())]));
  }
}

/** @internal */
function emitRef(
  ref: Build834ReferenceSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg(["REF", esc(ref.qualifier), esc(ref.value), esc(ref.description ?? "")]);
}

/** @internal */
function emitDate(
  date: Build834DateSpec,
  seg: (parts: readonly string[]) => string,
  esc: (value: string) => string,
): string {
  return seg([
    "DTP",
    esc(date.qualifier),
    esc(date.formatQualifier ?? DTP_DEFAULT_FORMAT),
    esc(date.value),
  ]);
}

// ---------------------------------------------------------------------------
// String helpers - mirror the `build835` emit primitives.
// ---------------------------------------------------------------------------

/** @internal */
function pad(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return value + " ".repeat(width - value.length);
  return value.slice(0, width);
}

/**
 * Zero-pad a control number to `width` chars (ISA-13 / IEA-02 are always 9).
 * Throws {@link Enrollment834BuildError} if the value already exceeds the
 * width - a silently-truncated control number would break ISA-13↔IEA-02
 * reconciliation. @internal
 */
function padControl(value: string, width: number): string {
  if (value.length === width) return value;
  if (value.length < width) return "0".repeat(width - value.length) + value;
  throw new Enrollment834BuildError(
    ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_INVALID_SPEC,
    `build834: control number "${value}" exceeds the ${String(width)}-char spec limit.`,
  );
}

/**
 * Expand a 6-digit YYMMDD into CCYYMMDD for GS-04. Years `00`–`49` are 21st
 * century, `50`–`99` are 20th. A value already in CCYYMMDD form passes
 * through unchanged. @internal
 */
function expandYY(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  if (Number.isNaN(yy)) return yymmdd;
  const century = yy < 50 ? "20" : "19";
  return century + yymmdd;
}

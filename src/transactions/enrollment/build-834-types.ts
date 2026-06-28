/**
 * Spec types for the 834 domain builder ({@link "./build-834.js".build834}).
 * The spec mirrors the {@link "./types.js".X12EnrollmentHeader} +
 * {@link "./types.js".X12Enrollment} read models field-for-field, MINUS the
 * fields `get834*` *derives* (the looked-up `maintenanceTypeDescription`)
 * and minus the read-only `warnings` arrays. Everything a caller must supply
 * is here; everything the library can look up or compute is not.
 *
 * Money is {@link "../../decimal.js".X12Decimal} throughout — never `number`
 * (float arithmetic destroys cents). Construct values with
 * `X12Decimal.fromString("125.00")`.
 *
 * Maintenance type (`INS-03` / `HD-01`, X12 Code Source 875) is the
 * safety-critical field — the builder emits the supplied code VERBATIM and
 * REFUSES a code outside the validated subset (see {@link
 * "./build-errors.js".Enrollment834BuildError}).
 *
 * Spec source: WPC TR3 `005010X220A1`. The builder emits segments in TR3
 * loop order and round-trips back through `get834Header` /
 * `get834Enrollments`, so a well-formed spec is reproduced field-for-field.
 */

import type { X12Decimal } from "../../decimal.js";

/**
 * Interchange + group + transaction identity for the built 834. The builder
 * fixes GS-01 to `"BE"` (Benefit Enrollment and Maintenance) and the
 * version/release to `"005010X220A1"` (the 834 functional group + TR3) so
 * the caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build834EnvelopeSpec } from "@cosyte/x12";
 * const env: Build834EnvelopeSpec = {
 *   senderId: "EMPLOYERCO", receiverId: "MEDPAY",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build834EnvelopeSpec {
  /** ISA-06 — interchange sender id (padded to 15 on emit). */
  readonly senderId: string;
  /** ISA-08 — interchange receiver id (padded to 15 on emit). */
  readonly receiverId: string;
  /** ISA-09 — interchange date YYMMDD. */
  readonly interchangeDate: string;
  /** ISA-10 — interchange time HHMM. */
  readonly interchangeTime: string;
  /** ISA-13 / IEA-02 — interchange control number (zero-padded to 9 on emit). */
  readonly interchangeControlNumber: string;
  /** GS-06 / GE-02 — group control number. */
  readonly groupControlNumber: string;
  /** ST-02 / SE-02 — transaction set control number. */
  readonly transactionSetControlNumber: string;
  /** ISA-05 — interchange sender qualifier. Default `"ZZ"`. */
  readonly senderQualifier?: string;
  /** ISA-07 — interchange receiver qualifier. Default `"ZZ"`. */
  readonly receiverQualifier?: string;
  /** ISA-15 — usage indicator (`P` production, `T` test). Default `"P"`. */
  readonly usageIndicator?: string;
  /** GS-02 — application sender code. Default: the interchange sender id. */
  readonly applicationSenderCode?: string;
  /** GS-03 — application receiver code. Default: the interchange receiver id. */
  readonly applicationReceiverCode?: string;
  /** GS-04 — group date CCYYMMDD. Default: century-expanded ISA-09. */
  readonly groupDate?: string;
  /** GS-05 — group time HHMM. Default: the interchange time. */
  readonly groupTime?: string;
  /** Element separator (ISA byte 4). Default `"*"`. */
  readonly elementSeparator?: string;
  /** Repetition separator (ISA-11). Default `"^"`. */
  readonly repetitionSeparator?: string;
  /** Component (sub-element) separator (ISA-16). Default `":"`. */
  readonly componentSeparator?: string;
  /** Segment terminator (ISA byte 106). Default `"~"`. */
  readonly segmentTerminator?: string;
}

/**
 * N1 party — sponsor (Loop 1000A, `N1*P5`) or payer (Loop 1000B, `N1*IN`).
 * Mirrors {@link "./types.js".X12EnrollmentParty}.
 *
 * @example
 * ```ts
 * import type { Build834PartySpec } from "@cosyte/x12";
 * const sponsor: Build834PartySpec = {
 *   entityIdentifierCode: "P5", name: "EMPLOYER CO", idQualifier: "FI", idCode: "FEIN123",
 * };
 * ```
 */
export interface Build834PartySpec {
  /** N1-01 — entity identifier code (`P5` sponsor / `IN` payer). */
  readonly entityIdentifierCode: string;
  /** N1-02 — party name. */
  readonly name: string;
  /** N1-03 — identification code qualifier. */
  readonly idQualifier?: string;
  /** N1-04 — identification code. */
  readonly idCode?: string;
}

/**
 * REF supplemental identifier on the header or a member. Mirrors {@link
 * "./types.js".X12EnrollmentReference}. `description` (REF-03) is emitted
 * only when supplied.
 *
 * @example
 * ```ts
 * import type { Build834ReferenceSpec } from "@cosyte/x12";
 * const ref: Build834ReferenceSpec = { qualifier: "0F", value: "MBR0001" };
 * ```
 */
export interface Build834ReferenceSpec {
  /** REF-01 — reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 — reference identification value. */
  readonly value: string;
  /** REF-03 — description (situational). */
  readonly description?: string;
}

/**
 * DTP date on a member or a health-coverage loop. Mirrors {@link
 * "./types.js".X12EnrollmentDate}. `value` (DTP-03) is the verbatim
 * CCYYMMDD or range; `formatQualifier` (DTP-02) defaults to `"D8"` (single
 * date) — pass `"RD8"` for a range. The read model surfaces only the
 * qualifier + value, so the format qualifier does not affect a round-trip.
 *
 * @example
 * ```ts
 * import type { Build834DateSpec } from "@cosyte/x12";
 * const d: Build834DateSpec = { qualifier: "356", value: "20260101" };
 * ```
 */
export interface Build834DateSpec {
  /** DTP-01 — date/time qualifier (`356` eligibility begin, `357` end, …). */
  readonly qualifier: string;
  /** DTP-02 — date/time format qualifier. Default `"D8"`. */
  readonly formatQualifier?: string;
  /** DTP-03 — verbatim CCYYMMDD or range. */
  readonly value: string;
}

/**
 * AMT amount on a health-coverage loop. Mirrors {@link
 * "./types.js".X12EnrollmentAmount}.
 *
 * @example
 * ```ts
 * import type { Build834AmountSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const a: Build834AmountSpec = { qualifier: "P3", amount: X12Decimal.fromString("125.00")! };
 * ```
 */
export interface Build834AmountSpec {
  /** AMT-01 — amount qualifier code (`P3` premium, `B9` co-insurance, …). */
  readonly qualifier: string;
  /** AMT-02 — monetary amount. */
  readonly amount: X12Decimal;
}

/**
 * N3 + N4 address block on a member. Mirrors {@link
 * "./types.js".X12EnrollmentAddress}.
 *
 * @example
 * ```ts
 * import type { Build834AddressSpec } from "@cosyte/x12";
 * const a: Build834AddressSpec = {
 *   lines: ["100 MAIN ST"], city: "COLUMBUS", state: "OH", postalCode: "43004",
 * };
 * ```
 */
export interface Build834AddressSpec {
  /** N3 address lines (1-2). */
  readonly lines: readonly string[];
  /** N4-01 — city. */
  readonly city?: string;
  /** N4-02 — state / province. */
  readonly state?: string;
  /** N4-03 — postal code. */
  readonly postalCode?: string;
  /** N4-04 — country code. */
  readonly countryCode?: string;
}

/**
 * Loop 2100A member name (`NM1*IL`) + demographics (`DMG`) + address
 * (`N3`/`N4`). Mirrors {@link "./types.js".X12EnrollmentMember}. PHI
 * surface: every field carries PHI. `entityIdentifierCode` defaults to
 * `"IL"` (insured) — the read side captures only the IL member name, so a
 * different qualifier would not round-trip.
 *
 * @example
 * ```ts
 * import type { Build834MemberNameSpec } from "@cosyte/x12";
 * const m: Build834MemberNameSpec = {
 *   lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001",
 *   dateOfBirth: "19850515", genderCode: "F",
 * };
 * ```
 */
export interface Build834MemberNameSpec {
  /** NM1-01 — entity identifier code. Default `"IL"` (insured). */
  readonly entityIdentifierCode?: string;
  /** NM1-03 — last name. */
  readonly lastName?: string;
  /** NM1-04 — first name. */
  readonly firstName?: string;
  /** NM1-05 — middle name. */
  readonly middleName?: string;
  /** NM1-07 — name suffix. */
  readonly suffix?: string;
  /** NM1-08 — identification code qualifier (`34` SSN, `ZZ` mutually defined, …). */
  readonly idQualifier?: string;
  /** NM1-09 — identification code (verbatim member id). */
  readonly idCode?: string;
  /** DMG-02 — date of birth (CCYYMMDD). */
  readonly dateOfBirth?: string;
  /** DMG-03 — gender code (`M` / `F` / `U`). */
  readonly genderCode?: string;
  /** N3 + N4 address block. */
  readonly address?: Build834AddressSpec;
}

/**
 * Loop 2320 coordination of benefits (`COB`). Mirrors {@link
 * "./types.js".X12CoordinationOfBenefits}.
 *
 * @example
 * ```ts
 * import type { Build834CoordinationOfBenefitsSpec } from "@cosyte/x12";
 * const c: Build834CoordinationOfBenefitsSpec = {
 *   payerResponsibility: "P", referenceId: "OTHERGRP-1", coordinationOfBenefitsCode: "1",
 * };
 * ```
 */
export interface Build834CoordinationOfBenefitsSpec {
  /** COB-01 — payer responsibility (`P` primary, `S` secondary, `T` tertiary). */
  readonly payerResponsibility?: string;
  /** COB-02 — the other payer's group / policy number. */
  readonly referenceId?: string;
  /** COB-03 — coordination of benefits code. */
  readonly coordinationOfBenefitsCode?: string;
}

/**
 * Loop 2300 health coverage (`HD`) plus its dates (`DTP`) and amounts
 * (`AMT`). Mirrors {@link "./types.js".X12HealthCoverage}.
 * `maintenanceTypeCode` (HD-01, X12 875) is validated when present — an
 * unknown code is REFUSED.
 *
 * @example
 * ```ts
 * import type { Build834CoverageSpec } from "@cosyte/x12";
 * const c: Build834CoverageSpec = {
 *   maintenanceTypeCode: "021", insuranceLineCode: "HLT",
 *   planCoverageDescription: "GOLD PPO", coverageLevelCode: "FAM",
 *   dates: [{ qualifier: "348", value: "20260101" }],
 * };
 * ```
 */
export interface Build834CoverageSpec {
  /** HD-01 — maintenance type code (X12 875; validated when present). */
  readonly maintenanceTypeCode?: string;
  /** HD-03 — insurance line code (`HLT`, `DEN`, `VIS`, …). */
  readonly insuranceLineCode?: string;
  /** HD-04 — plan coverage description. */
  readonly planCoverageDescription?: string;
  /** HD-05 — coverage level code (`IND`, `FAM`, `EMP`, …). */
  readonly coverageLevelCode?: string;
  /** DTP coverage dates. */
  readonly dates?: readonly Build834DateSpec[];
  /** AMT coverage amounts. */
  readonly amounts?: readonly Build834AmountSpec[];
}

/**
 * One Loop 2000 member-level detail (`INS`) — a single member's enrollment
 * action. Mirrors {@link "./types.js".X12Enrollment} minus the looked-up
 * `maintenanceTypeDescription`. `maintenanceTypeCode` (INS-03, X12 875) is
 * REQUIRED and safety-critical — it is emitted verbatim and an unknown code
 * is REFUSED.
 *
 * @example
 * ```ts
 * import type { Build834MemberSpec } from "@cosyte/x12";
 * const member: Build834MemberSpec = {
 *   subscriberIndicator: "Y", relationshipCode: "18", maintenanceTypeCode: "021",
 *   member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
 *   healthCoverages: [{ maintenanceTypeCode: "021", insuranceLineCode: "HLT" }],
 * };
 * ```
 */
export interface Build834MemberSpec {
  /** INS-01 — subscriber indicator (`Y` subscriber / `N` dependent). */
  readonly subscriberIndicator?: string;
  /** INS-02 — relationship code (`18` self, `01` spouse, `19` child, …). */
  readonly relationshipCode?: string;
  /** INS-03 — maintenance type code (X12 875; required, validated). */
  readonly maintenanceTypeCode: string;
  /** INS-04 — maintenance reason code. */
  readonly maintenanceReasonCode?: string;
  /** INS-05 — benefit status code (`A` active, `C` COBRA, …). */
  readonly benefitStatusCode?: string;
  /** INS-08 — employment status code (`FT`, `PT`, …). */
  readonly employmentStatusCode?: string;
  /** Loop 2100A member name + DMG + address. */
  readonly member?: Build834MemberNameSpec;
  /** REF supplemental identifiers (subscriber id, group/policy). */
  readonly references?: readonly Build834ReferenceSpec[];
  /** DTP member-level dates (eligibility begin / end). */
  readonly dates?: readonly Build834DateSpec[];
  /** Loop 2320 coordination of benefits. */
  readonly coordinationOfBenefits?: readonly Build834CoordinationOfBenefitsSpec[];
  /** Loop 2300 health coverages. */
  readonly healthCoverages?: readonly Build834CoverageSpec[];
}

/**
 * The 834 header — BGN beginning segment + sponsor (`N1*P5`) + payer
 * (`N1*IN`) + header REF / DTP. Mirrors {@link
 * "./types.js".X12EnrollmentHeader} minus the read-only `warnings`.
 *
 * @example
 * ```ts
 * import type { Build834HeaderSpec } from "@cosyte/x12";
 * const header: Build834HeaderSpec = {
 *   transactionSetPurposeCode: "00", referenceId: "FILE-202606", date: "20260601",
 *   sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
 *   payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
 * };
 * ```
 */
export interface Build834HeaderSpec {
  /** BGN-01 — transaction set purpose code (`00` original, `15` re-submission, …). */
  readonly transactionSetPurposeCode: string;
  /** BGN-02 — reference identification (the file / batch id). */
  readonly referenceId?: string;
  /** BGN-03 — transaction set creation date (CCYYMMDD). */
  readonly date?: string;
  /** BGN-04 — transaction set creation time (HHMM). */
  readonly time?: string;
  /** BGN-08 — action code (`2` change / `4` verify / `RX` replace, …). */
  readonly actionCode?: string;
  /** Loop 1000A sponsor (N1*P5). */
  readonly sponsor?: Build834PartySpec;
  /** Loop 1000B payer (N1*IN). */
  readonly payer?: Build834PartySpec;
  /** Header REF identifiers. */
  readonly references?: readonly Build834ReferenceSpec[];
  /** Header DTP dates. */
  readonly dates?: readonly Build834DateSpec[];
}

/**
 * The full input to {@link "./build-834.js".build834}: the envelope, the
 * header, and ≥ 1 member loop. A well-formed spec round-trips through
 * `get834Header` / `get834Enrollments` field-for-field; a spec with an
 * unknown maintenance type or a missing member loop is REFUSED with an
 * {@link "./build-errors.js".Enrollment834BuildError}.
 *
 * @example
 * ```ts
 * import { build834, type Build834Spec } from "@cosyte/x12";
 * const spec: Build834Spec = {
 *   envelope: {
 *     senderId: "EMPLOYERCO", receiverId: "MEDPAY",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   header: {
 *     transactionSetPurposeCode: "00", referenceId: "FILE-202606", date: "20260601",
 *     sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
 *     payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
 *   },
 *   members: [
 *     {
 *       subscriberIndicator: "Y", relationshipCode: "18", maintenanceTypeCode: "021",
 *       member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
 *       healthCoverages: [{ maintenanceTypeCode: "021", insuranceLineCode: "HLT" }],
 *     },
 *   ],
 * };
 * const ix = build834(spec);
 * ```
 */
export interface Build834Spec {
  /** Interchange / group / transaction identity. */
  readonly envelope: Build834EnvelopeSpec;
  /** BGN header + sponsor / payer parties. */
  readonly header: Build834HeaderSpec;
  /** Loop 2000 member-level detail (≥ 1 required). */
  readonly members: readonly Build834MemberSpec[];
}

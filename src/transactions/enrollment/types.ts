/**
 * Typed model for an X12 `005010X220A1` 834 Benefit Enrollment and
 * Maintenance transaction. Split into a sync {@link X12EnrollmentHeader}
 * (the BGN header + sponsor / payer parties) and a stream of
 * {@link X12Enrollment} member-level detail loops — one per `INS` segment —
 * yielded by {@link "./get-834.js".get834Enrollments} as an
 * `AsyncIterable`. The 834 is the bulky open-enrollment workhorse (files
 * can run to hundreds of MB), so the member surface is a stream, not an
 * array: a consumer processes one member at a time and never holds the
 * whole roster in memory at once.
 *
 * Maintenance type (`INS-03` / `HD-01`, X12 0875) is the safety-critical
 * field — add / change / terminate / reinstate. The verbatim code is
 * ALWAYS preserved and the parser NEVER infers an action for an unknown
 * code (it raises `X12_834_UNKNOWN_MAINTENANCE_TYPE` instead). Every
 * member NM1 / DMG field carries PHI; surfaced verbatim, never echoed in a
 * warning, never normalized.
 *
 * Spec source: WPC TR3 `005010X220A1`. Segment-level references in JSDoc
 * are 1-indexed against that TR3.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

/**
 * Decoded 834 header — the BGN Beginning Segment plus the sponsor
 * (`N1*P5`) and payer (`N1*IN`) parties. Returned by
 * {@link "./get-834.js".get834Header}; the per-member stream is separate
 * so a consumer can read the file-level context without draining the
 * (potentially huge) member roster.
 *
 * @example
 * ```ts
 * import type { X12EnrollmentHeader } from "@cosyte/x12";
 * declare const h: X12EnrollmentHeader;
 * h.transactionSetPurposeCode; // "00" original
 * h.sponsor?.name;             // "EMPLOYER CO"
 * h.payer?.name;               // "MEDPAY INSURANCE"
 * ```
 */
export interface X12EnrollmentHeader {
  readonly transactionSetPurposeCode: string;
  readonly referenceId: string | undefined;
  readonly date: string | undefined;
  readonly time: string | undefined;
  readonly actionCode: string | undefined;
  readonly sponsor: X12EnrollmentParty | undefined;
  readonly payer: X12EnrollmentParty | undefined;
  readonly references: readonly X12EnrollmentReference[];
  readonly dates: readonly X12EnrollmentDate[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * Decoded Loop 1000 party (sponsor `N1*P5`, payer `N1*IN`, TPA/broker
 * `N1*BO`/`N1*TV`). Organizational PII, not member PHI.
 *
 * @example
 * ```ts
 * import type { X12EnrollmentParty } from "@cosyte/x12";
 * declare const p: X12EnrollmentParty;
 * p.entityIdentifierCode; // "P5" plan sponsor
 * p.name;                 // "EMPLOYER CO"
 * p.idCode;               // "FEIN123" (verbatim)
 * ```
 */
export interface X12EnrollmentParty {
  readonly entityIdentifierCode: string;
  readonly name: string;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * One decoded Loop 2000 member-level detail (`INS`) — a single member's
 * enrollment action. Carries the member identity (Loop 2100A NM1 + DMG +
 * address), the supplemental ids (REF — subscriber id, group/policy), the
 * dates (DTP — eligibility begin/end), the health-coverage loops (Loop
 * 2300 HD), and the coordination-of-benefits loops (Loop 2320 COB). Any
 * recoverable deviation (e.g. an unknown maintenance type) is surfaced on
 * `warnings` for THIS member only.
 *
 * @example
 * ```ts
 * import type { X12Enrollment } from "@cosyte/x12";
 * declare const e: X12Enrollment;
 * e.maintenanceTypeCode;            // "021" addition
 * e.maintenanceTypeDescription;     // "Addition"
 * e.member?.lastName;               // verbatim member surname
 * e.healthCoverages[0]?.insuranceLineCode; // "HLT"
 * ```
 */
export interface X12Enrollment {
  readonly subscriberIndicator: string | undefined;
  readonly relationshipCode: string | undefined;
  readonly maintenanceTypeCode: string;
  readonly maintenanceTypeDescription: string | undefined;
  readonly maintenanceReasonCode: string | undefined;
  readonly benefitStatusCode: string | undefined;
  readonly employmentStatusCode: string | undefined;
  readonly member: X12EnrollmentMember | undefined;
  readonly references: readonly X12EnrollmentReference[];
  readonly dates: readonly X12EnrollmentDate[];
  readonly healthCoverages: readonly X12HealthCoverage[];
  readonly coordinationOfBenefits: readonly X12CoordinationOfBenefits[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * Decoded Loop 2100A member name (`NM1*IL`) + demographic (`DMG`) +
 * address (`N3`/`N4`). PHI surface: every field carries PHI.
 *
 * @example
 * ```ts
 * import type { X12EnrollmentMember } from "@cosyte/x12";
 * declare const m: X12EnrollmentMember;
 * m.lastName;     // verbatim
 * m.idCode;       // verbatim member id
 * m.dateOfBirth;  // "19850515" (CCYYMMDD, verbatim)
 * m.genderCode;   // "F"
 * ```
 */
export interface X12EnrollmentMember {
  readonly entityIdentifierCode: string;
  readonly lastName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly dateOfBirth: string | undefined;
  readonly genderCode: string | undefined;
  readonly address: X12EnrollmentAddress | undefined;
}

/**
 * Decoded N3 + N4 address block attached to a member. `lines` is the N3
 * address lines (1-2 entries); `city` / `state` / `postalCode` come from
 * N4. All verbatim — no normalization.
 *
 * @example
 * ```ts
 * import type { X12EnrollmentAddress } from "@cosyte/x12";
 * declare const a: X12EnrollmentAddress;
 * a.lines[0];   // "100 MAIN ST"
 * a.city;       // "COLUMBUS"
 * ```
 */
export interface X12EnrollmentAddress {
  readonly lines: readonly string[];
  readonly city: string | undefined;
  readonly state: string | undefined;
  readonly postalCode: string | undefined;
  readonly countryCode: string | undefined;
}

/**
 * Decoded Loop 2300 health coverage (`HD`) plus its attached dates (`DTP`)
 * and monetary amounts (`AMT`). `insuranceLineCode` is HD-03 (`HLT`, `DEN`,
 * `VIS`, …); `maintenanceTypeCode` is HD-01 — the per-coverage echo of the
 * member action, validated against the same X12 0875 snapshot as INS-03.
 *
 * @example
 * ```ts
 * import type { X12HealthCoverage } from "@cosyte/x12";
 * declare const c: X12HealthCoverage;
 * c.insuranceLineCode;       // "HLT"
 * c.planCoverageDescription; // "GOLD PPO"
 * c.dates[0]?.qualifier;     // "348" benefit begin
 * ```
 */
export interface X12HealthCoverage {
  readonly maintenanceTypeCode: string | undefined;
  readonly maintenanceTypeDescription: string | undefined;
  readonly insuranceLineCode: string | undefined;
  readonly planCoverageDescription: string | undefined;
  readonly coverageLevelCode: string | undefined;
  readonly dates: readonly X12EnrollmentDate[];
  readonly amounts: readonly X12EnrollmentAmount[];
}

/**
 * Decoded Loop 2320 coordination of benefits (`COB`). `payerResponsibility`
 * is COB-01 (`P` primary, `S` secondary, `T` tertiary); `referenceId` is
 * COB-02 (the other payer's group/policy number); `serviceTypeCode` is
 * COB-03.
 *
 * @example
 * ```ts
 * import type { X12CoordinationOfBenefits } from "@cosyte/x12";
 * declare const c: X12CoordinationOfBenefits;
 * c.payerResponsibility; // "P"
 * c.referenceId;         // "OTHERGRP-1"
 * ```
 */
export interface X12CoordinationOfBenefits {
  readonly payerResponsibility: string | undefined;
  readonly referenceId: string | undefined;
  readonly coordinationOfBenefitsCode: string | undefined;
}

/**
 * Decoded REF — supplemental identifier (subscriber id `0F`, group/policy
 * `1L`, member id `23`, …). `qualifier` is the X12 reference-identification
 * qualifier; `value` is the verbatim id.
 *
 * @example
 * ```ts
 * import type { X12EnrollmentReference } from "@cosyte/x12";
 * declare const r: X12EnrollmentReference;
 * r.qualifier; // "0F" subscriber number
 * r.value;     // "MBR0001"
 * ```
 */
export interface X12EnrollmentReference {
  readonly qualifier: string;
  readonly value: string;
  readonly description: string | undefined;
}

/**
 * Decoded DTP date attached to a member or a health-coverage loop.
 * `qualifier` is the date/time qualifier (DTP-01); `value` is the verbatim
 * CCYYMMDD or range (DTP-03). No normalization.
 *
 * @example
 * ```ts
 * import type { X12EnrollmentDate } from "@cosyte/x12";
 * declare const d: X12EnrollmentDate;
 * d.qualifier; // "356" eligibility begin
 * d.value;     // "20260101"
 * ```
 */
export interface X12EnrollmentDate {
  readonly qualifier: string;
  readonly value: string;
}

/**
 * Decoded AMT amount attached to a health-coverage loop. `qualifier` is the
 * amount qualifier (AMT-01 — `"P3"` premium, `"B9"` co-insurance, …);
 * `amount` is {@link "../../decimal.js".X12Decimal} (NEVER `number`).
 *
 * @example
 * ```ts
 * import type { X12EnrollmentAmount } from "@cosyte/x12";
 * declare const a: X12EnrollmentAmount;
 * a.qualifier;          // "P3"
 * a.amount.toString();  // "125.00"
 * ```
 */
export interface X12EnrollmentAmount {
  readonly qualifier: string;
  readonly amount: X12Decimal;
}

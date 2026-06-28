/**
 * Typed model for an X12 005010X279A1 271 Health Care Eligibility Benefit
 * Response. The shape is the public contract of {@link
 * "./get-271.js".get271Eligibility} — adding fields is backward-
 * compatible; renaming fields is breaking. Monetary + quantity fields are
 * {@link "../../decimal.js".X12Decimal} (NEVER `number` — float arithmetic
 * destroys cents on a benefit amount).
 *
 * **TRN echo is the #1 safety property of a 271.** The response MUST echo
 * the requesting 270's TRN trace numbers verbatim so a provider can
 * re-associate the answer with the question. The walker captures every
 * TRN onto its enclosing subscriber / dependent without re-numbering — see
 * {@link X12EligibilityTrace}.
 *
 * Spec source: WPC TR3 `005010X279A1` — Health Care Eligibility Benefit
 * Inquiry and Response (270/271). Segment-level references in JSDoc are
 * 1-indexed against that TR3.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
import type { X12Hl } from "../shared/hl.js";

/**
 * Top-level result of {@link "./get-271.js".get271Eligibility}. Carries
 * every subscriber loop (each with its enclosing information-source payer
 * and information-receiver provider, its echoed TRN traces, name, and
 * eligibility/benefit lines), the verbatim HL hierarchy, and every warning
 * surfaced during the walk.
 *
 * @example
 * ```ts
 * import { parseX12, get271Eligibility } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
 * if (tx !== undefined) {
 *   const elig = get271Eligibility(ix.delimiters, tx);
 *   for (const sub of elig.subscribers) {
 *     sub.traces[0]?.referenceId;       // echoed 270 trace number
 *     sub.benefits[0]?.eligibilityCode; // "1" (Active Coverage)
 *   }
 * }
 * ```
 */
export interface X12Eligibility {
  readonly subscribers: readonly X12EligibilitySubscriber[];
  readonly hierarchies: readonly X12Hl[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * One subscriber (Loop 2000C / 2100C). Holds the enclosing information
 * source (Loop 2100A payer) and information receiver (Loop 2100B provider)
 * resolved from the HL tree, the verbatim echoed TRN traces, the
 * subscriber name + demographics, and the eligibility/benefit lines.
 * Non-subscriber patients hang off {@link dependents}.
 *
 * @example
 * ```ts
 * import type { X12EligibilitySubscriber } from "@cosyte/x12";
 * declare const s: X12EligibilitySubscriber;
 * s.informationSource?.name;   // "MEDPAY INSURANCE"
 * s.name?.lastName;            // "DOE"
 * s.dependents.length;         // 0
 * ```
 */
export interface X12EligibilitySubscriber {
  readonly hierarchy: X12Hl | undefined;
  readonly informationSource: X12EligibilityEntity | undefined;
  readonly informationReceiver: X12EligibilityEntity | undefined;
  readonly traces: readonly X12EligibilityTrace[];
  readonly name: X12EligibilityMember | undefined;
  readonly references: readonly X12EligibilityReference[];
  readonly dates: readonly X12EligibilityDate[];
  readonly benefits: readonly X12EligibilityBenefit[];
  readonly dependents: readonly X12EligibilityDependent[];
}

/**
 * One dependent (Loop 2000D / 2100D) — a patient who is not the subscriber
 * (relationship is carried at the HL level). Same benefit-bearing shape as
 * a subscriber minus the nested dependents.
 *
 * @example
 * ```ts
 * import type { X12EligibilityDependent } from "@cosyte/x12";
 * declare const d: X12EligibilityDependent;
 * d.name?.firstName;            // "JUNIOR"
 * d.benefits[0]?.coverageLevelCode; // "IND"
 * ```
 */
export interface X12EligibilityDependent {
  readonly hierarchy: X12Hl | undefined;
  readonly traces: readonly X12EligibilityTrace[];
  readonly name: X12EligibilityMember | undefined;
  readonly references: readonly X12EligibilityReference[];
  readonly dates: readonly X12EligibilityDate[];
  readonly benefits: readonly X12EligibilityBenefit[];
}

/**
 * A non-person entity (payer in Loop 2100A, provider in Loop 2100B, or a
 * benefit-related entity in Loop 2120C). Decoded from an NM1 — no
 * demographics, just the organization / provider name + identifier.
 *
 * @example
 * ```ts
 * import type { X12EligibilityEntity } from "@cosyte/x12";
 * declare const e: X12EligibilityEntity;
 * e.entityIdentifierCode; // "PR" (payer) / "1P" (provider)
 * e.name;                 // "MEDPAY INSURANCE"
 * e.idCode;               // "00123"
 * ```
 */
export interface X12EligibilityEntity {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly name: string;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * A person (subscriber / dependent) decoded from NM1 + the optional DMG
 * demographics + N3/N4 address. `idCode` is the member identifier (NM1-09)
 * — synthetic-only in fixtures.
 *
 * @example
 * ```ts
 * import type { X12EligibilityMember } from "@cosyte/x12";
 * declare const m: X12EligibilityMember;
 * m.lastName;     // "DOE"
 * m.dateOfBirth;  // "19800101" (DMG-02, CCYYMMDD)
 * m.genderCode;   // "F"
 * ```
 */
export interface X12EligibilityMember {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly lastName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly address: X12EligibilityAddress | undefined;
  readonly dateOfBirth: string | undefined;
  readonly genderCode: string | undefined;
}

/**
 * A reassociation trace (TRN). **The verbatim echo of the requesting 270's
 * trace number** — `referenceId` (TRN-02) is the value a provider matches
 * against the trace it sent. The walker NEVER mutates it.
 *
 * @example
 * ```ts
 * import type { X12EligibilityTrace } from "@cosyte/x12";
 * declare const t: X12EligibilityTrace;
 * t.traceTypeCode; // "2" (referenced — added by the payer in the 271)
 * t.referenceId;   // "ELIG20260627001" (echoed verbatim from the 270)
 * ```
 */
export interface X12EligibilityTrace {
  readonly traceTypeCode: string;
  readonly referenceId: string;
  readonly originatingCompanyId: string | undefined;
  readonly supplementalReferenceId: string | undefined;
}

/**
 * One eligibility-or-benefit line (EB, Loop 2110C/2110D). EB-01 is the
 * eligibility code (`1` Active Coverage, `6` Inactive, `I` Non-Covered,
 * …); EB-03 carries one-or-more Service Type Codes (each looked up against
 * the bundled snapshot). Monetary + percent + quantity are
 * {@link X12Decimal}. The walker preserves the verbatim EB-01 even when no
 * description resolves.
 *
 * @example
 * ```ts
 * import type { X12EligibilityBenefit } from "@cosyte/x12";
 * declare const b: X12EligibilityBenefit;
 * b.eligibilityCode;          // "1"
 * b.serviceTypeCodes[0]?.code; // "30"
 * b.inPlanNetwork;            // "Y"
 * b.monetaryAmount?.toString(); // "1000.00"
 * ```
 */
export interface X12EligibilityBenefit {
  readonly eligibilityCode: string;
  readonly coverageLevelCode: string | undefined;
  readonly serviceTypeCodes: readonly X12EligibilityServiceType[];
  readonly insuranceTypeCode: string | undefined;
  readonly planCoverageDescription: string | undefined;
  readonly timePeriodQualifier: string | undefined;
  readonly monetaryAmount: X12Decimal | undefined;
  readonly percent: X12Decimal | undefined;
  readonly quantityQualifier: string | undefined;
  readonly quantity: X12Decimal | undefined;
  readonly authorizationRequired: string | undefined;
  readonly inPlanNetwork: string | undefined;
  readonly references: readonly X12EligibilityReference[];
  readonly dates: readonly X12EligibilityDate[];
  readonly messages: readonly string[];
  readonly relatedEntities: readonly X12EligibilityEntity[];
}

/**
 * A decoded Service Type Code (EB-03, X12 external code source 1365). The
 * verbatim code is always preserved; `description` resolves from the
 * bundled snapshot (or `undefined` when outside the subset).
 *
 * @example
 * ```ts
 * import type { X12EligibilityServiceType } from "@cosyte/x12";
 * declare const st: X12EligibilityServiceType;
 * st.code;        // "30"
 * st.description; // "Health Benefit Plan Coverage"
 * ```
 */
export interface X12EligibilityServiceType {
  readonly code: string;
  readonly description: string | undefined;
}

/**
 * A REF supplemental identifier attached to a subscriber, dependent, or
 * benefit line. `qualifier` is REF-01; `value` is REF-02.
 *
 * @example
 * ```ts
 * import type { X12EligibilityReference } from "@cosyte/x12";
 * declare const r: X12EligibilityReference;
 * r.qualifier; // "6P" (group number)
 * r.value;     // "GRP0001"
 * ```
 */
export interface X12EligibilityReference {
  readonly qualifier: string;
  readonly value: string;
  readonly description: string | undefined;
}

/**
 * A DTP date / date-range attached to a subscriber, dependent, or benefit
 * line. `qualifier` is DTP-01 (e.g. `307` Eligibility, `291` Plan); `value`
 * is DTP-03 in the DTP-02 format (`D8` `CCYYMMDD` / `RD8` range).
 *
 * @example
 * ```ts
 * import type { X12EligibilityDate } from "@cosyte/x12";
 * declare const d: X12EligibilityDate;
 * d.qualifier;       // "307"
 * d.formatQualifier; // "D8"
 * d.value;           // "20260101"
 * ```
 */
export interface X12EligibilityDate {
  readonly qualifier: string;
  readonly formatQualifier: string;
  readonly value: string;
}

/**
 * A postal address (N3 + N4) attached to a subscriber / dependent name.
 *
 * @example
 * ```ts
 * import type { X12EligibilityAddress } from "@cosyte/x12";
 * declare const a: X12EligibilityAddress;
 * a.lines[0];   // "123 MAIN ST"
 * a.city;       // "ANYTOWN"
 * a.state;      // "CA"
 * a.postalCode; // "90001"
 * ```
 */
export interface X12EligibilityAddress {
  readonly lines: readonly string[];
  readonly city: string | undefined;
  readonly state: string | undefined;
  readonly postalCode: string | undefined;
  readonly countryCode: string | undefined;
}

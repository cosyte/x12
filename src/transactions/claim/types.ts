/**
 * Typed model for an X12 005010 837 Healthcare Claim - the three sibling
 * TR3s (`005010X222A2` Professional / `005010X223A3` Institutional /
 * `005010X224A2` Dental). The shape is the public contract of
 * `get837Claims()` - adding fields is backward-compatible; renaming
 * fields is breaking.
 *
 * Spec source: WPC TR3s for X222A2 / X223A3 / X224A2 plus the X12 005010
 * base specification (envelope + segment definitions).
 *
 * All monetary fields use {@link "../../decimal.js".X12Decimal} (NEVER
 * `number` - float arithmetic destroys cents at scale). All dates are
 * preserved verbatim alongside their `formatQualifier` so the consumer
 * can branch on `D8` (CCYYMMDD) vs `RD8` (date range) without re-parsing.
 *
 * Variant discrimination. {@link X12Claim837Variant} drives the
 * service-line discriminated union ({@link X12_837ServiceLine}). The
 * walker reads ST-03's implementation convention reference (X222A2 /
 * X223A3 / X224A2) where present; otherwise infers from service-line
 * segment id (SV1 → P, SV2 → I, SV3 → D); otherwise marks the variant
 * `"unknown"` and emits `X12_837_UNKNOWN_VARIANT`.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
import type { X12RemitAdjustment } from "../remit/types.js";
import type { X12HiCategory, X12HiCodeSystem } from "../../code-lists/hi-qualifiers.js";

/**
 * 837 variant - discriminator for the service-line union and for any
 * variant-specific helper logic. `"unknown"` covers transactions where
 * neither ST-03 nor a service-line segment id resolved the variant.
 *
 * @example
 * ```ts
 * import type { X12Claim837Variant } from "@cosyte/x12";
 * const v: X12Claim837Variant = "P";
 * ```
 */
export type X12Claim837Variant = "P" | "I" | "D" | "unknown";

/**
 * The top-level result returned by `get837Claims()`. Carries the submitter
 * (Loop 1000A) and receiver (Loop 1000B) parties, the HL hierarchy walk
 * (Loops 2000A/B/C - every HL segment captured with parent-pointer
 * provenance), every claim payment loop (Loop 2300), and every warning
 * surfaced during the walk - including the safety-critical
 * `X12_HL_PARENT_MISMATCH` and `X12_HL_PARENT_LEVEL_INVALID`.
 *
 * @example
 * ```ts
 * import { parseX12, get837Claims } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
 * if (tx !== undefined) {
 *   const sub = get837Claims(ix.delimiters, tx);
 *   sub?.variant;             // "P" | "I" | "D" | "unknown"
 *   sub?.claims.length;       // count of CLM segments encountered
 *   for (const claim of sub?.claims ?? []) {
 *     claim.totalCharge.toString();
 *     claim.diagnoses[0]?.codeSystem;  // "ICD-10-CM" etc.
 *   }
 * }
 * ```
 */
export interface X12_837Submission {
  readonly variant: X12Claim837Variant;
  readonly implementationConventionReference: string | undefined;
  readonly submitter: X12ClaimEntity | undefined;
  readonly receiver: X12ClaimEntity | undefined;
  readonly hierarchies: readonly X12HierarchicalLevel[];
  readonly claims: readonly X12Claim[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * One HL segment captured during the walk. The 837 HL hierarchy is the
 * safety primitive: HL-01 is this level's id (sequential within the
 * transaction); HL-02 is the parent's id (empty when this is a top-level
 * HL); HL-03 is the level code (`20` Information Source = billing
 * provider, `22` Subscriber, `23` Dependent/patient); HL-04 is `1` when
 * any HL below it claims this as its parent, `0` otherwise.
 *
 * **Parent-pointer integrity is the #1 safety property.** The walker
 * validates HL-02 references an earlier-emitted HL-01 in the same
 * transaction AND that the parent's HL-03 level is consistent with this
 * level (20 → 22; 22 → 23). Violations emit
 * `X12_HL_PARENT_MISMATCH` and `X12_HL_PARENT_LEVEL_INVALID` -
 * the parser NEVER silently re-numbers.
 *
 * @example
 * ```ts
 * import type { X12HierarchicalLevel } from "@cosyte/x12";
 * declare const hl: X12HierarchicalLevel;
 * hl.hlId;           // "1" (sequential within the transaction)
 * hl.parentHlId;     // undefined for billing-provider top level
 * hl.levelCode;      // "20"
 * hl.hasChild;       // "1"
 * ```
 */
export interface X12HierarchicalLevel {
  readonly hlId: string;
  readonly parentHlId: string | undefined;
  readonly levelCode: string;
  readonly hasChild: string;
}

/**
 * Generic NM1 entity used throughout the 837. Covers billing provider
 * (`85`), pay-to address (`87`), submitter (`41`), receiver (`40`),
 * subscriber name (`IL`), patient name (`QC`), payer (`PR`), and the long
 * tail of 2310 / 2330 / 2420 provider / payer / facility roles. The
 * `entityIdentifierCode` discriminates the role; consumers branching on
 * roles should compare against the X12 0098 code list.
 *
 * PHI surface: `lastName`/`firstName`/`idCode` carry PHI when the role is
 * a person (subscriber, patient, rendering provider as an individual).
 * Surfaced verbatim - the parser never echoes them in warnings.
 *
 * @example
 * ```ts
 * import type { X12ClaimEntity } from "@cosyte/x12";
 * declare const e: X12ClaimEntity;
 * e.entityIdentifierCode; // "85" billing provider
 * e.name;                 // verbatim NM1-03
 * e.idQualifier;          // "XX" (NPI)
 * e.idCode;               // verbatim NPI
 * ```
 */
export interface X12ClaimEntity {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly name: string;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly address: X12ClaimAddress | undefined;
  readonly contacts: readonly X12ClaimContact[];
  readonly references: readonly X12ClaimReference[];
}

/**
 * Decoded N3 + N4 address block attached to an entity. Same shape as the
 * 835's address (intentional - symmetry across helpers). All fields
 * verbatim, no normalization.
 *
 * @example
 * ```ts
 * import type { X12ClaimAddress } from "@cosyte/x12";
 * declare const a: X12ClaimAddress;
 * a.lines[0];   // "123 PROVIDER WAY"
 * a.city;       // "CLEVELAND"
 * a.state;      // "OH"
 * a.postalCode; // "44113"
 * ```
 */
export interface X12ClaimAddress {
  readonly lines: readonly string[];
  readonly city: string | undefined;
  readonly state: string | undefined;
  readonly postalCode: string | undefined;
  readonly countryCode: string | undefined;
}

/**
 * Decoded PER contact segment. `contactFunctionCode` = `IC` (Information
 * Contact), `BL` (Technical), `AP` (Accounts Payable Contact); each
 * carries up to 3 communication channels (`TE` telephone, `EM` email,
 * `FX` fax, `EX` extension).
 *
 * @example
 * ```ts
 * import type { X12ClaimContact } from "@cosyte/x12";
 * declare const c: X12ClaimContact;
 * c.contactFunctionCode;                // "IC"
 * c.communications[0]?.qualifier;       // "TE"
 * c.communications[0]?.value;            // "5551234567"
 * ```
 */
export interface X12ClaimContact {
  readonly contactFunctionCode: string;
  readonly name: string | undefined;
  readonly communications: readonly { readonly qualifier: string; readonly value: string }[];
}

/**
 * Decoded REF segment - additional identifier on an entity or claim.
 * Verbatim across the table; the qualifier vocabulary depends on the
 * context (`EI` Employer ID at the billing provider, `D9` Claim Number on
 * an other-payer reference, `G1` Prior Authorization, etc.).
 *
 * @example
 * ```ts
 * import type { X12ClaimReference } from "@cosyte/x12";
 * declare const r: X12ClaimReference;
 * r.qualifier; // "EI"
 * r.value;     // "123456789"
 * ```
 */
export interface X12ClaimReference {
  readonly qualifier: string;
  readonly value: string;
  readonly description: string | undefined;
}

/**
 * Decoded DTP date - claim-level or service-line-level. `formatQualifier`
 * is DTP-02 (`D8` single-date CCYYMMDD; `RD8` date range
 * CCYYMMDD-CCYYMMDD). `value` is DTP-03 verbatim - the parser never
 * normalizes the literal.
 *
 * Date-qualifier vocabulary on 837 (X12 374): `472` Service Date, `434`
 * Statement Date, `435` Admission Date (837I), `096` Discharge Date
 * (837I), `431` Onset of Current Illness, `454` Initial Treatment Date,
 * `297` Last Worked Date, etc.
 *
 * @example
 * ```ts
 * import type { X12ClaimDate } from "@cosyte/x12";
 * declare const d: X12ClaimDate;
 * d.qualifier;       // "472"
 * d.formatQualifier; // "D8"
 * d.value;           // "20260601"
 * ```
 */
export interface X12ClaimDate {
  readonly qualifier: string;
  readonly formatQualifier: string;
  readonly value: string;
}

/**
 * Decoded HI diagnosis or procedure composite. ONE entry per HI composite
 * (HI-01..HI-12); the parser surfaces the verbatim qualifier AND the
 * resolved {@link X12HiCodeSystem} so consumers can branch by system
 * without re-deriving the mapping. The `category` discriminates the role
 * (diagnosis / procedure / NUBC code-set entry).
 *
 * `poaIndicator` (Present-on-Admission) is HI-NN-9 - 837I institutional
 * inpatient only. CMS-mandated values: `Y` Yes, `N` No, `U` Insufficient
 * documentation, `W` Clinically undetermined, `1` Exempt from POA
 * reporting. Verbatim - the parser preserves the value, never validates
 * against the spec list (Phase 9 profile may layer enforcement).
 *
 * @example
 * ```ts
 * import type { X12ClaimHiCode } from "@cosyte/x12";
 * declare const dx: X12ClaimHiCode;
 * dx.qualifier;     // "ABK" - principal diagnosis ICD-10-CM
 * dx.codeSystem;    // "ICD-10-CM"
 * dx.category;      // "principal-diagnosis"
 * dx.code;          // "J45.50"
 * dx.poaIndicator;  // "Y" (837I only)
 * ```
 */
export interface X12ClaimHiCode {
  readonly qualifier: string;
  readonly codeSystem: X12HiCodeSystem;
  readonly category: X12HiCategory;
  readonly code: string;
  readonly dateQualifier: string | undefined;
  readonly date: string | undefined;
  readonly monetaryAmount: X12Decimal | undefined;
  readonly quantity: X12Decimal | undefined;
  readonly versionId: string | undefined;
  readonly poaIndicator: string | undefined;
}

/**
 * Decoded NTE note - free-text annotation. `noteReferenceCode` (NTE-01)
 * classifies the note ('ADD' Additional Information, 'CER' Certification,
 * 'DCP' Goals/Rehabilitation/Discharge Plans, 'DGN' Diagnosis, 'DME' DME,
 * 'MED' Medications, etc., X12 code list 363).
 *
 * NOTE: NTE-02 is free text supplied by the provider - it may include
 * incidental PHI (a patient name in a clinical note). Surfaced verbatim
 * for fidelity; the parser flags this surface in JSDoc but never
 * redacts. Consumers should treat NTE-02 as PHI-bearing.
 *
 * @example
 * ```ts
 * import type { X12ClaimNote } from "@cosyte/x12";
 * declare const n: X12ClaimNote;
 * n.noteReferenceCode; // "ADD"
 * n.description;       // verbatim - may include incidental PHI
 * ```
 */
export interface X12ClaimNote {
  readonly noteReferenceCode: string;
  readonly description: string;
}

/**
 * Decoded AMT segment - supplemental claim amount (patient-paid amount,
 * coverage amount, etc.). `qualifier` from X12 522. Surfaced verbatim;
 * never folded into a computed total (the 837 has no on-spec balance
 * invariant analogous to the 835's CLP balance).
 *
 * @example
 * ```ts
 * import type { X12ClaimAmount } from "@cosyte/x12";
 * declare const a: X12ClaimAmount;
 * a.qualifier;          // "F5" patient amount paid
 * a.amount.toString();  // "25.00"
 * ```
 */
export interface X12ClaimAmount {
  readonly qualifier: string;
  readonly amount: X12Decimal;
}

/**
 * Decoded SBR - Subscriber Information (Loop 2000B's primary trigger). Or
 * decoded PAT - Patient Information when the patient is the subscriber.
 *
 * - `payerResponsibilityCode` (SBR-01 / X12 1138): `P` Primary, `S`
 *   Secondary, `T` Tertiary, etc. Drives COB ordering.
 * - `individualRelationshipCode` (SBR-02 / PAT-01 / X12 1069): `18` Self,
 *   `01` Spouse, `19` Child, `G8` Other Insured.
 * - `groupNumber` (SBR-03), `groupName` (SBR-04).
 * - `claimFilingIndicator` (SBR-09 / X12 1032): `MC` Medicaid, `MB`
 *   Medicare Part B, `BL` BlueCross/BlueShield, `CI` Commercial, etc.
 *
 * @example
 * ```ts
 * import type { X12SubscriberInfo } from "@cosyte/x12";
 * declare const s: X12SubscriberInfo;
 * s.payerResponsibilityCode;  // "P"
 * s.individualRelationshipCode; // "18" self
 * s.claimFilingIndicator;     // "MB"
 * ```
 */
export interface X12SubscriberInfo {
  readonly payerResponsibilityCode: string | undefined;
  readonly individualRelationshipCode: string | undefined;
  readonly groupNumber: string | undefined;
  readonly groupName: string | undefined;
  readonly claimFilingIndicator: string | undefined;
}

/**
 * A claim's subscriber or patient - the NM1 entity plus the SBR/PAT
 * metadata that wraps it.
 *
 * @example
 * ```ts
 * import type { X12ClaimMember } from "@cosyte/x12";
 * declare const m: X12ClaimMember;
 * m.entity.name;             // verbatim subscriber name (PHI)
 * m.info.claimFilingIndicator; // "MB"
 * ```
 */
export interface X12ClaimMember {
  readonly entity: X12ClaimEntity;
  readonly info: X12SubscriberInfo;
}

/**
 * Decoded Loop 2320 - Other Subscriber Information. Captures the SBR-01
 * payer responsibility code and the associated other-subscriber / other-
 * payer NM1 entities; Phase 5 records the surface so a consumer knows
 * COB exists. Detailed CAS / OI / MOA breakdown inside Loop 2320 is
 * deferred to Phase 9 (it tracks one payer's specific adjudication and
 * is rarely needed for outbound claim creation).
 *
 * @example
 * ```ts
 * import type { X12OtherSubscriber } from "@cosyte/x12";
 * declare const o: X12OtherSubscriber;
 * o.payerResponsibilityCode; // "S" secondary
 * o.otherSubscriber?.name;    // verbatim
 * o.otherPayer?.name;         // verbatim
 * ```
 */
export interface X12OtherSubscriber {
  readonly payerResponsibilityCode: string;
  readonly individualRelationshipCode: string | undefined;
  readonly claimFilingIndicator: string | undefined;
  readonly otherSubscriber: X12ClaimEntity | undefined;
  readonly otherPayer: X12ClaimEntity | undefined;
}

/**
 * Decoded CLM claim header + every claim-scoped loop. The `variant`
 * mirrors the parent submission's variant; the `serviceLines` discriminate
 * on the same variant so a consumer can do a single switch.
 *
 * PHI surface: `claimId` (provider's patient-account number), the
 * subscriber/patient NM1 entities, member ID on subscriber/patient, NTE
 * notes. All surfaced verbatim; warnings never echo values.
 *
 * @example
 * ```ts
 * import type { X12Claim } from "@cosyte/x12";
 * declare const c: X12Claim;
 * c.variant;                    // "P" / "I" / "D" / "unknown"
 * c.claimId;                    // CLM-01 (patient account number)
 * c.totalCharge.toString();     // CLM-02 as X12Decimal
 * c.diagnoses[0]?.codeSystem;   // "ICD-10-CM"
 * c.serviceLines.length;        // count of LX/SVx loops
 * ```
 */
export interface X12Claim {
  readonly variant: X12Claim837Variant;
  readonly hierarchy: X12HierarchicalLevel | undefined;
  readonly billingProvider: X12ClaimEntity | undefined;
  readonly payToAddress: X12ClaimAddress | undefined;
  readonly payToPlan: X12ClaimEntity | undefined;
  readonly subscriber: X12ClaimMember | undefined;
  readonly payer: X12ClaimEntity | undefined;
  readonly patient: X12ClaimMember | undefined;
  readonly claimId: string;
  readonly totalCharge: X12Decimal;
  readonly placeOfServiceCode: string | undefined;
  readonly facilityCodeQualifier: string | undefined;
  readonly claimFrequencyCode: string | undefined;
  readonly providerSignatureOnFile: string | undefined;
  readonly providerAcceptAssignment: string | undefined;
  readonly benefitsAssignment: string | undefined;
  readonly releaseOfInformationCode: string | undefined;
  readonly dates: readonly X12ClaimDate[];
  readonly diagnoses: readonly X12ClaimHiCode[];
  readonly procedures: readonly X12ClaimHiCode[];
  readonly otherHi: readonly X12ClaimHiCode[];
  readonly notes: readonly X12ClaimNote[];
  readonly amounts: readonly X12ClaimAmount[];
  readonly references: readonly X12ClaimReference[];
  readonly providers: readonly X12ClaimEntity[];
  readonly otherSubscribers: readonly X12OtherSubscriber[];
  readonly serviceLines: readonly X12_837ServiceLine[];
}

/**
 * Service-line discriminated union - one variant per TR3. The walker
 * picks the variant from the segment id (`SV1` → P, `SV2` → I, `SV3` →
 * D). When an `LX` opens a service line with no SVx segment that follows
 * before the next LX / SE, the line is dropped (an `X12_UNEXPECTED_SEGMENT`
 * warning will have already fired if the body content was structurally
 * impossible).
 *
 * @example
 * ```ts
 * import type { X12_837ServiceLine } from "@cosyte/x12";
 * declare const sl: X12_837ServiceLine;
 * switch (sl.variant) {
 *   case "P": sl.procedureCode; sl.diagnosisPointers; break;
 *   case "I": sl.revenueCode; break;
 *   case "D": sl.toothInformation; break;
 * }
 * ```
 */
export type X12_837ServiceLine =
  | X12_837ServiceLineProfessional
  | X12_837ServiceLineInstitutional
  | X12_837ServiceLineDental;

/** Fields shared across every service-line variant. @internal */
export interface X12_837ServiceLineBase {
  readonly lineNumber: string;
  readonly charge: X12Decimal;
  readonly units: X12Decimal;
  readonly unitOfMeasure: string | undefined;
  readonly placeOfServiceCode: string | undefined;
  readonly dates: readonly X12ClaimDate[];
  readonly references: readonly X12ClaimReference[];
  readonly amounts: readonly X12ClaimAmount[];
  readonly notes: readonly X12ClaimNote[];
  readonly providers: readonly X12ClaimEntity[];
  readonly drug: X12LineDrug | undefined;
  readonly adjudications: readonly X12LineAdjudication[];
}

/**
 * 837P service line (SV1). `procedureQualifier` is the HCPCS / CPT
 * qualifier (typically `HC` for HCPCS / CPT-4; `ER` jurisdiction-specific
 * procedure code; `IV` HIPPS-based rate code); `procedureCode` is the
 * verbatim code; `modifiers` are the 1-4 procedure modifiers from
 * SV1-01-3 through SV1-01-6 (e.g. `25`, `59`, `LT`, `RT`).
 *
 * `diagnosisPointers` carry up to 4 pointers (SV1-07's composite of
 * positional indexes into the claim's HI diagnoses). The pointer `"1"`
 * refers to the first principal-diagnosis HI composite, `"2"` the second,
 * etc.; verbatim string preserved.
 *
 * @example
 * ```ts
 * import type { X12_837ServiceLineProfessional } from "@cosyte/x12";
 * declare const sl: X12_837ServiceLineProfessional;
 * sl.procedureQualifier;     // "HC"
 * sl.procedureCode;          // "99213"
 * sl.modifiers;              // ["25"]
 * sl.diagnosisPointers;      // ["1"]
 * sl.placeOfServiceCode;     // "11" office (overrides claim-level)
 * sl.charge.toString();      // "150.00"
 * ```
 */
export interface X12_837ServiceLineProfessional extends X12_837ServiceLineBase {
  readonly variant: "P";
  readonly procedureQualifier: string;
  readonly procedureCode: string;
  readonly modifiers: readonly string[];
  readonly diagnosisPointers: readonly string[];
  readonly emergencyIndicator: string | undefined;
  readonly epsdtIndicator: string | undefined;
  readonly familyPlanningIndicator: string | undefined;
}

/**
 * 837I service line (SV2). Institutional lines lead with a `revenueCode`
 * (SV2-01, NUBC 4-digit revenue code - what *kind* of service this is);
 * the procedure code (HCPCS) and modifiers in SV2-02 are situational.
 * `nonCoveredCharge` (SV2-07) is the portion of the line the provider
 * has marked as not covered before the payer adjudicates.
 *
 * @example
 * ```ts
 * import type { X12_837ServiceLineInstitutional } from "@cosyte/x12";
 * declare const sl: X12_837ServiceLineInstitutional;
 * sl.revenueCode;                 // "0260" IV therapy
 * sl.procedureCode;               // "J7030"
 * sl.charge.toString();           // "780.00"
 * sl.nonCoveredCharge?.toString();// "0.00"
 * ```
 */
export interface X12_837ServiceLineInstitutional extends X12_837ServiceLineBase {
  readonly variant: "I";
  readonly revenueCode: string;
  readonly procedureQualifier: string | undefined;
  readonly procedureCode: string | undefined;
  readonly modifiers: readonly string[];
  readonly serviceLineRate: X12Decimal | undefined;
  readonly nonCoveredCharge: X12Decimal | undefined;
}

/**
 * 837D service line (SV3). Dental lines carry the ADA-coded procedure
 * (qualifier `AD`, CDT code) plus optional tooth + surface detail
 * captured on the per-line TOO segments (Loop 2400 in X224A2).
 *
 * @example
 * ```ts
 * import type { X12_837ServiceLineDental } from "@cosyte/x12";
 * declare const sl: X12_837ServiceLineDental;
 * sl.procedureQualifier;     // "AD"
 * sl.procedureCode;          // "D2391" composite resin
 * sl.charge.toString();      // "180.00"
 * sl.toothInformation[0]?.toothCode;       // "14"
 * sl.toothInformation[0]?.surfaces;         // ["O"]
 * ```
 */
export interface X12_837ServiceLineDental extends X12_837ServiceLineBase {
  readonly variant: "D";
  readonly procedureQualifier: string;
  readonly procedureCode: string;
  readonly modifiers: readonly string[];
  readonly oralCavityArea: readonly string[];
  readonly toothInformation: readonly X12ToothInformation[];
  readonly prosthesisCrownInlayCode: string | undefined;
}

/**
 * Decoded TOO - Tooth Information (837D Loop 2400). `qualifier` is the
 * tooth-numbering code list (`JP` ADA Universal Tooth Numbering, `JO`
 * ANSI / ISO 3950 / FDI). `toothCode` is the verbatim tooth identifier;
 * `surfaces` are the per-surface codes (`M` mesial, `O` occlusal, `D`
 * distal, etc.) from TOO-03's composite components.
 *
 * @example
 * ```ts
 * import type { X12ToothInformation } from "@cosyte/x12";
 * declare const t: X12ToothInformation;
 * t.qualifier;     // "JP"
 * t.toothCode;     // "14"
 * t.surfaces;      // ["O"]
 * ```
 */
export interface X12ToothInformation {
  readonly qualifier: string;
  readonly toothCode: string;
  readonly surfaces: readonly string[];
}

/**
 * Decoded LIN + CTP - Drug Identification (837P Loop 2410). Surfaces the
 * NDC and the optional dispensed-quantity + UCUM unit. `qualifier`
 * = `N4` NDC (overwhelmingly common), `EN` EAN/UCC-13, `HI` HIBC.
 *
 * @example
 * ```ts
 * import type { X12LineDrug } from "@cosyte/x12";
 * declare const d: X12LineDrug;
 * d.qualifier;                // "N4"
 * d.code;                     // verbatim NDC
 * d.quantity?.toString();     // "1.50"
 * d.unitOfMeasure;            // "ML" UCUM milliliter
 * ```
 */
export interface X12LineDrug {
  readonly qualifier: string;
  readonly code: string;
  readonly quantity: X12Decimal | undefined;
  readonly unitOfMeasure: string | undefined;
}

/**
 * Decoded SVD + adjacent CAS / DTP - Line Adjudication Information (Loop
 * 2430). Captures another payer's prior adjudication of THIS line so the
 * downstream payer has the COB context. The `adjustments` re-use the
 * remit `X12RemitAdjustment` shape since the CAS semantics are identical
 * to those on the 835.
 *
 * `procedureCode` is SVD-03-2 (verbatim) - the adjudicated procedure
 * code as the other payer recorded it. May differ from the line's SV
 * procedure code if the other payer remapped.
 *
 * @example
 * ```ts
 * import type { X12LineAdjudication } from "@cosyte/x12";
 * declare const a: X12LineAdjudication;
 * a.otherPayerId;             // "84320" (the other payer's id)
 * a.amountPaid.toString();    // "50.00"
 * a.procedureCode;            // "99213"
 * a.adjustments[0]?.groupCode;// "CO"
 * a.dateAdjudicated;          // "20260520" CCYYMMDD verbatim
 * ```
 */
export interface X12LineAdjudication {
  readonly otherPayerId: string;
  readonly amountPaid: X12Decimal;
  readonly procedureQualifier: string | undefined;
  readonly procedureCode: string | undefined;
  readonly paidUnits: X12Decimal | undefined;
  readonly adjustments: readonly X12RemitAdjustment[];
  readonly dateAdjudicated: string | undefined;
}

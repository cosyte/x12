/**
 * Spec types for the 837 domain builders ({@link "./build-837.js".build837P}
 * / {@link "./build-837.js".build837I} / {@link "./build-837.js".build837D}).
 * The spec mirrors the {@link "./types.js".X12_837Submission} read model
 * field-for-field, MINUS the fields `get837Claims` *derives* (HI
 * `codeSystem` / `category`, the read-only `warnings` array) and minus the
 * HL spine itself — the builder COMPUTES the HL hierarchy from the nested
 * billing-provider → subscriber → patient tree, so a caller never hand-codes
 * HL-01 ids, HL-02 parent pointers, or HL-04 has-child flags. That makes a
 * structurally inconsistent spine unrepresentable.
 *
 * Money is {@link "../../decimal.js".X12Decimal} throughout — never `number`
 * (float arithmetic destroys cents). Construct with
 * `X12Decimal.fromString("150.00")`.
 *
 * Spec source: WPC TR3s `005010X222A2` (Professional), `005010X223A3`
 * (Institutional), `005010X224A2` (Dental). The builder emits segments in
 * TR3 loop order and round-trips back through `get837Claims`, so a
 * well-formed spec is reproduced field-for-field.
 */

import type { X12Decimal } from "../../decimal.js";

/**
 * Interchange + group + transaction identity for the built 837. The builder
 * fixes GS-01 to `"HC"` and the ST-03 / GS-08 version to the variant's TR3
 * (`005010X222A2` / `X223A3` / `X224A2`) so the caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build837EnvelopeSpec } from "@cosyte/x12";
 * const env: Build837EnvelopeSpec = {
 *   senderId: "SUBMITTER", receiverId: "RECEIVER",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build837EnvelopeSpec {
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
  /** BHT-03 — originator application reference id. Default: the transaction set control number. */
  readonly transactionReferenceId?: string;
  /** BHT-04 — transaction creation date CCYYMMDD. Default: the group date. */
  readonly transactionDate?: string;
  /** BHT-05 — transaction creation time HHMM. Default: the group time. */
  readonly transactionTime?: string;
  /** BHT-06 — claim/encounter indicator (`CH` chargeable, `RP` reporting). Default `"CH"`. */
  readonly claimOrEncounterIndicator?: string;
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
 * N3 + N4 address block on an entity. Mirrors {@link
 * "./types.js".X12ClaimAddress}.
 *
 * @example
 * ```ts
 * import type { Build837AddressSpec } from "@cosyte/x12";
 * const a: Build837AddressSpec = {
 *   lines: ["123 BILLING WAY"], city: "CLEVELAND", state: "OH", postalCode: "44113",
 * };
 * ```
 */
export interface Build837AddressSpec {
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
 * PER contact on an entity (Loop 1000A submitter, etc.). Each contact may
 * carry up to three communication channels. Mirrors {@link
 * "./types.js".X12ClaimContact}.
 *
 * @example
 * ```ts
 * import type { Build837ContactSpec } from "@cosyte/x12";
 * const per: Build837ContactSpec = {
 *   contactFunctionCode: "IC",
 *   name: "JANE SUBMITTER",
 *   communications: [{ qualifier: "TE", value: "5551234567" }],
 * };
 * ```
 */
export interface Build837ContactSpec {
  /** PER-01 — contact function code (`IC` information contact, …). */
  readonly contactFunctionCode: string;
  /** PER-02 — contact name. */
  readonly name?: string;
  /** Up to 3 communication channels (PER-03/04, 05/06, 07/08). */
  readonly communications?: readonly { readonly qualifier: string; readonly value: string }[];
}

/**
 * REF additional identifier on an entity / claim / service line. Mirrors
 * {@link "./types.js".X12ClaimReference}. `description` (REF-03) is emitted
 * only when supplied.
 *
 * @example
 * ```ts
 * import type { Build837ReferenceSpec } from "@cosyte/x12";
 * const ref: Build837ReferenceSpec = { qualifier: "EI", value: "987654321" };
 * ```
 */
export interface Build837ReferenceSpec {
  /** REF-01 — reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 — reference identification value. */
  readonly value: string;
  /** REF-03 — description (situational). */
  readonly description?: string;
}

/**
 * NM1 entity used throughout the 837 — submitter (`41`), receiver (`40`),
 * billing provider (`85`), subscriber (`IL`), payer (`PR`), patient (`QC`),
 * and the 2310x / 2420x provider roles. Mirrors {@link
 * "./types.js".X12ClaimEntity}.
 *
 * Note: when used as a claim-level (2310x) or service-line (2420x) provider,
 * only the NM1 fields round-trip through `get837Claims`; an attached
 * `address` / `contacts` / `references` is emitted but the read side does
 * not re-surface it on the provider (a documented Phase 5 read limitation).
 *
 * @example
 * ```ts
 * import type { Build837EntitySpec } from "@cosyte/x12";
 * const billing: Build837EntitySpec = {
 *   entityIdentifierCode: "85", entityTypeQualifier: "2",
 *   name: "BILLING CLINIC INC", idQualifier: "XX", idCode: "1234567890",
 *   address: { lines: ["123 BILLING WAY"], city: "CLEVELAND", state: "OH", postalCode: "44113" },
 *   references: [{ qualifier: "EI", value: "987654321" }],
 * };
 * ```
 */
export interface Build837EntitySpec {
  /** NM1-01 — entity identifier code. */
  readonly entityIdentifierCode: string;
  /** NM1-02 — entity type qualifier (`1` person, `2` non-person). */
  readonly entityTypeQualifier: string;
  /** NM1-03 — last name / organization name. */
  readonly name: string;
  /** NM1-04 — first name (person). */
  readonly firstName?: string;
  /** NM1-05 — middle name (person). */
  readonly middleName?: string;
  /** NM1-07 — name suffix (person). */
  readonly suffix?: string;
  /** NM1-08 — identification code qualifier (`XX` NPI, `MI` member id, …). */
  readonly idQualifier?: string;
  /** NM1-09 — identification code. */
  readonly idCode?: string;
  /** N3 + N4 address block. */
  readonly address?: Build837AddressSpec;
  /** PER contacts. */
  readonly contacts?: readonly Build837ContactSpec[];
  /** REF additional identifiers. */
  readonly references?: readonly Build837ReferenceSpec[];
}

/**
 * DTP date — claim-level or service-line-level. Mirrors {@link
 * "./types.js".X12ClaimDate}.
 *
 * @example
 * ```ts
 * import type { Build837DateSpec } from "@cosyte/x12";
 * const d: Build837DateSpec = { qualifier: "472", formatQualifier: "D8", value: "20260601" };
 * ```
 */
export interface Build837DateSpec {
  /** DTP-01 — date/time qualifier (`472` service, `431` onset, …). */
  readonly qualifier: string;
  /** DTP-02 — date/time format qualifier (`D8` CCYYMMDD, `RD8` range). */
  readonly formatQualifier: string;
  /** DTP-03 — the date value verbatim. */
  readonly value: string;
}

/**
 * One HI diagnosis / procedure composite. Mirrors {@link
 * "./types.js".X12ClaimHiCode} minus the looked-up `codeSystem` / `category`
 * (the builder emits the qualifier; the read side resolves the system).
 *
 * @example
 * ```ts
 * import type { Build837HiCodeSpec } from "@cosyte/x12";
 * const dx: Build837HiCodeSpec = { qualifier: "ABK", code: "J20.9" };
 * ```
 */
export interface Build837HiCodeSpec {
  /** Composite component 1 — code-list qualifier (`ABK`, `ABF`, `BBR`, …). */
  readonly qualifier: string;
  /** Composite component 2 — the diagnosis / procedure code. */
  readonly code: string;
  /** Composite component 3 — date/time format qualifier (situational). */
  readonly dateQualifier?: string;
  /** Composite component 4 — date value (situational). */
  readonly date?: string;
  /** Composite component 5 — monetary amount (situational). */
  readonly monetaryAmount?: X12Decimal;
  /** Composite component 6 — quantity (situational). */
  readonly quantity?: X12Decimal;
  /** Composite component 7 — version id (situational). */
  readonly versionId?: string;
  /** Composite component 9 — present-on-admission indicator (837I). */
  readonly poaIndicator?: string;
}

/**
 * NTE free-text note. Mirrors {@link "./types.js".X12ClaimNote}. NTE-02 may
 * carry incidental PHI — synthetic-only fixtures.
 *
 * @example
 * ```ts
 * import type { Build837NoteSpec } from "@cosyte/x12";
 * const n: Build837NoteSpec = { noteReferenceCode: "ADD", description: "SUPPLEMENTAL INFO" };
 * ```
 */
export interface Build837NoteSpec {
  /** NTE-01 — note reference code (`ADD`, `CER`, …). */
  readonly noteReferenceCode: string;
  /** NTE-02 — free text. */
  readonly description: string;
}

/**
 * AMT supplemental amount on a claim / service line. Mirrors {@link
 * "./types.js".X12ClaimAmount}.
 *
 * @example
 * ```ts
 * import type { Build837AmountSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const amt: Build837AmountSpec = { qualifier: "F5", amount: X12Decimal.fromString("25.00")! };
 * ```
 */
export interface Build837AmountSpec {
  /** AMT-01 — amount qualifier code. */
  readonly qualifier: string;
  /** AMT-02 — monetary amount. */
  readonly amount: X12Decimal;
}

/**
 * One CAS adjustment triple inside a Loop 2430 line adjudication. Mirrors
 * the remit `X12RemitAdjustment` shape (CAS semantics are identical).
 *
 * @example
 * ```ts
 * import type { Build837AdjustmentSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const cas: Build837AdjustmentSpec = { groupCode: "CO", reasonCode: "45", amount: X12Decimal.fromString("20.00")! };
 * ```
 */
export interface Build837AdjustmentSpec {
  /** CAS-01 — claim adjustment group code (`CO`, `PR`, `OA`, `PI`). */
  readonly groupCode: string;
  /** Adjustment reason code (CARC). */
  readonly reasonCode: string;
  /** Adjustment amount. */
  readonly amount: X12Decimal;
  /** Adjustment quantity (situational). */
  readonly quantity?: X12Decimal;
}

/**
 * SVD + adjacent CAS / DTP — Loop 2430 Line Adjudication Information (a prior
 * payer's adjudication of this line, for COB). Mirrors {@link
 * "./types.js".X12LineAdjudication}.
 *
 * @example
 * ```ts
 * import type { Build837AdjudicationSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const svd: Build837AdjudicationSpec = {
 *   otherPayerId: "PAYER02", amountPaid: X12Decimal.fromString("50.00")!,
 *   procedureQualifier: "HC", procedureCode: "99213",
 *   adjustments: [{ groupCode: "CO", reasonCode: "45", amount: X12Decimal.fromString("20.00")! }],
 *   dateAdjudicated: "20260520",
 * };
 * ```
 */
export interface Build837AdjudicationSpec {
  /** SVD-01 — other payer identifier. */
  readonly otherPayerId: string;
  /** SVD-02 — amount the other payer paid for this line. */
  readonly amountPaid: X12Decimal;
  /** SVD-03-1 — adjudicated procedure qualifier. */
  readonly procedureQualifier?: string;
  /** SVD-03-2 — adjudicated procedure code. */
  readonly procedureCode?: string;
  /** SVD-05 — paid units of service. */
  readonly paidUnits?: X12Decimal;
  /** CAS adjustments under this adjudication. */
  readonly adjustments?: readonly Build837AdjustmentSpec[];
  /** DTP*573 — adjudication / payment date (CCYYMMDD). */
  readonly dateAdjudicated?: string;
}

/**
 * LIN + CTP — Loop 2410 Drug Identification (837P). Mirrors {@link
 * "./types.js".X12LineDrug}.
 *
 * @example
 * ```ts
 * import type { Build837DrugSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const drug: Build837DrugSpec = {
 *   qualifier: "N4", code: "00093721410",
 *   quantity: X12Decimal.fromString("1.5")!, unitOfMeasure: "ML",
 * };
 * ```
 */
export interface Build837DrugSpec {
  /** LIN-02 — product id qualifier (`N4` NDC, …). */
  readonly qualifier: string;
  /** LIN-03 — the drug code (NDC). */
  readonly code: string;
  /** CTP-04 — dispensed quantity (situational). */
  readonly quantity?: X12Decimal;
  /** CTP-05-1 — UCUM unit of measure (situational). */
  readonly unitOfMeasure?: string;
}

/**
 * TOO — Tooth Information (837D Loop 2400). Mirrors {@link
 * "./types.js".X12ToothInformation}.
 *
 * @example
 * ```ts
 * import type { Build837ToothSpec } from "@cosyte/x12";
 * const too: Build837ToothSpec = { qualifier: "JP", toothCode: "14", surfaces: ["O"] };
 * ```
 */
export interface Build837ToothSpec {
  /** TOO-01 — tooth-numbering code list qualifier (`JP` ADA universal, …). */
  readonly qualifier: string;
  /** TOO-02 — tooth identifier. */
  readonly toothCode: string;
  /** TOO-03 — per-surface codes (`M`, `O`, `D`, …). */
  readonly surfaces?: readonly string[];
}

/** Fields shared across every service-line variant spec. */
export interface Build837ServiceLineBaseSpec {
  /** LX-01 — line number. Default: the 1-based index within the claim. */
  readonly lineNumber?: string;
  /** SVx charge amount. */
  readonly charge: X12Decimal;
  /** SVx units of service. */
  readonly units?: X12Decimal;
  /** SVx unit/basis-of-measurement code (`UN`, `MJ`, …). */
  readonly unitOfMeasure?: string;
  /** DTP service-line dates. */
  readonly dates?: readonly Build837DateSpec[];
  /** Line-level REF identifiers. */
  readonly references?: readonly Build837ReferenceSpec[];
  /** Line-level AMT amounts. */
  readonly amounts?: readonly Build837AmountSpec[];
  /** Line-level NTE notes. */
  readonly notes?: readonly Build837NoteSpec[];
  /** Loop 2420 service-line provider names (NM1 fields round-trip). */
  readonly providers?: readonly Build837EntitySpec[];
  /** Loop 2430 line adjudications. */
  readonly adjudications?: readonly Build837AdjudicationSpec[];
}

/**
 * 837P service line (SV1). Mirrors {@link
 * "./types.js".X12_837ServiceLineProfessional}.
 *
 * @example
 * ```ts
 * import type { Build837ServiceLineProfessionalSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const sl: Build837ServiceLineProfessionalSpec = {
 *   variant: "P", procedureQualifier: "HC", procedureCode: "99213",
 *   modifiers: ["25"], charge: X12Decimal.fromString("150.00")!,
 *   unitOfMeasure: "UN", units: X12Decimal.fromString("1")!,
 *   diagnosisPointers: ["1"], dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260601" }],
 * };
 * ```
 */
export interface Build837ServiceLineProfessionalSpec extends Build837ServiceLineBaseSpec {
  readonly variant: "P";
  /** SV1-01-1 — procedure qualifier (`HC` HCPCS/CPT, …). */
  readonly procedureQualifier: string;
  /** SV1-01-2 — procedure code. */
  readonly procedureCode: string;
  /** SV1-01-3..6 — procedure modifiers. */
  readonly modifiers?: readonly string[];
  /** SV1-05 — place of service (overrides claim-level). */
  readonly placeOfServiceCode?: string;
  /** SV1-07 — diagnosis code pointers (1-4). */
  readonly diagnosisPointers?: readonly string[];
  /** SV1-09 — emergency indicator. */
  readonly emergencyIndicator?: string;
  /** SV1-11 — EPSDT indicator. */
  readonly epsdtIndicator?: string;
  /** SV1-12 — family planning indicator. */
  readonly familyPlanningIndicator?: string;
  /** Loop 2410 drug identification. */
  readonly drug?: Build837DrugSpec;
}

/**
 * 837I service line (SV2). Mirrors {@link
 * "./types.js".X12_837ServiceLineInstitutional}.
 *
 * @example
 * ```ts
 * import type { Build837ServiceLineInstitutionalSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const sl: Build837ServiceLineInstitutionalSpec = {
 *   variant: "I", revenueCode: "0120", procedureQualifier: "HC", procedureCode: "99221",
 *   charge: X12Decimal.fromString("1500.00")!, unitOfMeasure: "UN", units: X12Decimal.fromString("1")!,
 * };
 * ```
 */
export interface Build837ServiceLineInstitutionalSpec extends Build837ServiceLineBaseSpec {
  readonly variant: "I";
  /** SV2-01 — NUBC revenue code. */
  readonly revenueCode: string;
  /** SV2-02-1 — procedure qualifier (situational). */
  readonly procedureQualifier?: string;
  /** SV2-02-2 — procedure code (situational). */
  readonly procedureCode?: string;
  /** SV2-02-3..6 — procedure modifiers. */
  readonly modifiers?: readonly string[];
  /** SV2-06 — line item rate. */
  readonly serviceLineRate?: X12Decimal;
  /** SV2-07 — non-covered charge amount. */
  readonly nonCoveredCharge?: X12Decimal;
}

/**
 * 837D service line (SV3). Mirrors {@link
 * "./types.js".X12_837ServiceLineDental}.
 *
 * @example
 * ```ts
 * import type { Build837ServiceLineDentalSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const sl: Build837ServiceLineDentalSpec = {
 *   variant: "D", procedureQualifier: "AD", procedureCode: "D2391",
 *   charge: X12Decimal.fromString("180.00")!, units: X12Decimal.fromString("1")!,
 *   placeOfServiceCode: "11", toothInformation: [{ qualifier: "JP", toothCode: "14", surfaces: ["O"] }],
 * };
 * ```
 */
export interface Build837ServiceLineDentalSpec extends Build837ServiceLineBaseSpec {
  readonly variant: "D";
  /** SV3-01-1 — procedure qualifier (`AD` ADA/CDT). */
  readonly procedureQualifier: string;
  /** SV3-01-2 — procedure code. */
  readonly procedureCode: string;
  /** SV3-01-3..6 — procedure modifiers. */
  readonly modifiers?: readonly string[];
  /** SV3-03 — place of service. */
  readonly placeOfServiceCode?: string;
  /** SV3-04 — oral cavity area designation codes. */
  readonly oralCavityArea?: readonly string[];
  /** SV3-05 — prosthesis / crown / inlay code. */
  readonly prosthesisCrownInlayCode?: string;
  /** Loop 2400 TOO tooth information. */
  readonly toothInformation?: readonly Build837ToothSpec[];
}

/**
 * Service-line spec — discriminated union keyed by `variant`. Every line in
 * a `build837P` spec must be `"P"`, etc.; a mismatch is REFUSED.
 *
 * @example
 * ```ts
 * import type { Build837ServiceLineSpec } from "@cosyte/x12";
 * declare const sl: Build837ServiceLineSpec;
 * if (sl.variant === "P") sl.diagnosisPointers;
 * ```
 */
export type Build837ServiceLineSpec =
  | Build837ServiceLineProfessionalSpec
  | Build837ServiceLineInstitutionalSpec
  | Build837ServiceLineDentalSpec;

/**
 * Loop 2320 Other Subscriber Information (COB surface). Mirrors {@link
 * "./types.js".X12OtherSubscriber}.
 *
 * @example
 * ```ts
 * import type { Build837OtherSubscriberSpec } from "@cosyte/x12";
 * const oth: Build837OtherSubscriberSpec = {
 *   payerResponsibilityCode: "S", individualRelationshipCode: "01",
 *   otherSubscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "SPOUSE" },
 *   otherPayer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "SECONDARY PLAN" },
 * };
 * ```
 */
export interface Build837OtherSubscriberSpec {
  /** SBR-01 — payer responsibility code (`P`/`S`/`T`). */
  readonly payerResponsibilityCode: string;
  /** SBR-02 — individual relationship code. */
  readonly individualRelationshipCode?: string;
  /** SBR-09 — claim filing indicator code. */
  readonly claimFilingIndicator?: string;
  /** NM1*IL / NM1*QC — the other subscriber. */
  readonly otherSubscriber?: Build837EntitySpec;
  /** NM1*PR — the other payer. */
  readonly otherPayer?: Build837EntitySpec;
}

/**
 * Loop 2300 claim. The builder REFUSES a claim with an empty `claimId` or no
 * service lines (a CLM requires ≥ 1 LX/SVx loop). Mirrors {@link
 * "./types.js".X12Claim} minus the HL-resolved context the spine supplies.
 *
 * @example
 * ```ts
 * import type { Build837ClaimSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const claim: Build837ClaimSpec = {
 *   claimId: "PT-ACCT-001", totalCharge: X12Decimal.fromString("150.00")!,
 *   placeOfServiceCode: "11", facilityCodeQualifier: "B", claimFrequencyCode: "1",
 *   providerSignatureOnFile: "Y", providerAcceptAssignment: "A",
 *   benefitsAssignment: "Y", releaseOfInformationCode: "Y",
 *   diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
 *   serviceLines: [{
 *     variant: "P", procedureQualifier: "HC", procedureCode: "99213",
 *     charge: X12Decimal.fromString("150.00")!, unitOfMeasure: "UN",
 *     units: X12Decimal.fromString("1")!, diagnosisPointers: ["1"],
 *   }],
 * };
 * ```
 */
export interface Build837ClaimSpec {
  /** CLM-01 — patient account / claim id. */
  readonly claimId: string;
  /** CLM-02 — total claim charge amount. */
  readonly totalCharge: X12Decimal;
  /** CLM-05-1 — place of service code. */
  readonly placeOfServiceCode?: string;
  /** CLM-05-2 — facility code qualifier. */
  readonly facilityCodeQualifier?: string;
  /** CLM-05-3 — claim frequency type code. */
  readonly claimFrequencyCode?: string;
  /** CLM-06 — provider/supplier signature on file. */
  readonly providerSignatureOnFile?: string;
  /** CLM-07 — provider accept assignment code. */
  readonly providerAcceptAssignment?: string;
  /** CLM-08 — benefits assignment certification indicator. */
  readonly benefitsAssignment?: string;
  /** CLM-09 — release of information code. */
  readonly releaseOfInformationCode?: string;
  /** DTP claim-level dates. */
  readonly dates?: readonly Build837DateSpec[];
  /** HI diagnoses. */
  readonly diagnoses?: readonly Build837HiCodeSpec[];
  /** HI procedures. */
  readonly procedures?: readonly Build837HiCodeSpec[];
  /** HI other code-set entries (value information, condition, occurrence, …). */
  readonly otherHi?: readonly Build837HiCodeSpec[];
  /** NTE claim-level notes. */
  readonly notes?: readonly Build837NoteSpec[];
  /** AMT claim-level amounts. */
  readonly amounts?: readonly Build837AmountSpec[];
  /** REF claim-level identifiers. */
  readonly references?: readonly Build837ReferenceSpec[];
  /** Loop 2310x claim provider names (NM1 fields round-trip). */
  readonly providers?: readonly Build837EntitySpec[];
  /** Loop 2320 other subscribers. */
  readonly otherSubscribers?: readonly Build837OtherSubscriberSpec[];
  /** Loop 2400 service lines (≥ 1 required). */
  readonly serviceLines: readonly Build837ServiceLineSpec[];
}

/**
 * SBR — Subscriber Information for a Loop 2000B subscriber. Mirrors {@link
 * "./types.js".X12SubscriberInfo}.
 *
 * @example
 * ```ts
 * import type { Build837SubscriberInfoSpec } from "@cosyte/x12";
 * const info: Build837SubscriberInfoSpec = {
 *   payerResponsibilityCode: "P", individualRelationshipCode: "18",
 *   groupNumber: "GROUP123", claimFilingIndicator: "MB",
 * };
 * ```
 */
export interface Build837SubscriberInfoSpec {
  /** SBR-01 — payer responsibility code (`P`/`S`/`T`). */
  readonly payerResponsibilityCode: string;
  /** SBR-02 — individual relationship code (`18` self, …). */
  readonly individualRelationshipCode?: string;
  /** SBR-03 — group / policy number. */
  readonly groupNumber?: string;
  /** SBR-04 — group name. */
  readonly groupName?: string;
  /** SBR-09 — claim filing indicator code. */
  readonly claimFilingIndicator?: string;
}

/**
 * Loop 2000C dependent patient (patient ≠ subscriber). Emits an HL level-23
 * child of the enclosing subscriber HL, computed by the builder. Requires
 * ≥ 1 claim.
 *
 * @example
 * ```ts
 * import type { Build837PatientSpec } from "@cosyte/x12";
 * declare const claim: import("@cosyte/x12").Build837ClaimSpec;
 * const pat: Build837PatientSpec = {
 *   individualRelationshipCode: "19",
 *   patient: { entityIdentifierCode: "QC", entityTypeQualifier: "1", name: "CHILD", firstName: "TEST" },
 *   claims: [claim],
 * };
 * ```
 */
export interface Build837PatientSpec {
  /** PAT-01 — individual relationship code (`19` child, …). */
  readonly individualRelationshipCode?: string;
  /** NM1*QC — the patient. */
  readonly patient: Build837EntitySpec;
  /** Loop 2300 claims under this patient. */
  readonly claims: readonly Build837ClaimSpec[];
}

/**
 * Loop 2000B subscriber. Emits an HL level-22 child of the enclosing billing
 * provider HL, computed by the builder. Carries either direct `claims`
 * (patient = subscriber, SBR-02 `18`) or dependent `patients`.
 *
 * @example
 * ```ts
 * import type { Build837SubscriberSpec } from "@cosyte/x12";
 * declare const claim: import("@cosyte/x12").Build837ClaimSpec;
 * const sub: Build837SubscriberSpec = {
 *   info: { payerResponsibilityCode: "P", individualRelationshipCode: "18", claimFilingIndicator: "MB" },
 *   subscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "PATIENT", firstName: "TEST", idQualifier: "MI", idCode: "MEMBER001" },
 *   payer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER ONE", idQualifier: "PI", idCode: "PAYER01" },
 *   claims: [claim],
 * };
 * ```
 */
export interface Build837SubscriberSpec {
  /** SBR subscriber information. */
  readonly info: Build837SubscriberInfoSpec;
  /** NM1*IL — the subscriber. */
  readonly subscriber: Build837EntitySpec;
  /** NM1*PR — the payer. */
  readonly payer: Build837EntitySpec;
  /** Loop 2300 claims directly under the subscriber (patient = subscriber). */
  readonly claims?: readonly Build837ClaimSpec[];
  /** Loop 2000C dependent patients. */
  readonly patients?: readonly Build837PatientSpec[];
}

/**
 * Loop 2000A billing provider. Emits an HL level-20 top-of-tree node,
 * computed by the builder. Requires ≥ 1 subscriber.
 *
 * @example
 * ```ts
 * import type { Build837BillingProviderSpec } from "@cosyte/x12";
 * declare const sub: import("@cosyte/x12").Build837SubscriberSpec;
 * const bp: Build837BillingProviderSpec = {
 *   provider: {
 *     entityIdentifierCode: "85", entityTypeQualifier: "2", name: "BILLING CLINIC INC",
 *     idQualifier: "XX", idCode: "1234567890",
 *     address: { lines: ["123 BILLING WAY"], city: "CLEVELAND", state: "OH", postalCode: "44113" },
 *     references: [{ qualifier: "EI", value: "987654321" }],
 *   },
 *   subscribers: [sub],
 * };
 * ```
 */
export interface Build837BillingProviderSpec {
  /** NM1*85 — the billing provider. */
  readonly provider: Build837EntitySpec;
  /** NM1*87 — pay-to address (N3/N4 round-trip; the name is not re-surfaced). */
  readonly payToAddress?: Build837AddressSpec;
  /** NM1*PE — pay-to plan (837I only). */
  readonly payToPlan?: Build837EntitySpec;
  /** Loop 2000B subscribers (≥ 1 required). */
  readonly subscribers: readonly Build837SubscriberSpec[];
}

/**
 * The full input to {@link "./build-837.js".build837P} / `build837I` /
 * `build837D`: the envelope, the submitter (Loop 1000A) + receiver (Loop
 * 1000B), and the nested billing-provider → subscriber → (claims | patient)
 * tree from which the builder COMPUTES the HL spine. A well-formed spec
 * round-trips through `get837Claims` field-for-field; a structurally
 * impossible tree is REFUSED with a {@link
 * "./build-errors.js".Claim837BuildError}.
 *
 * @example
 * ```ts
 * import { build837P, X12Decimal, type Build837Spec } from "@cosyte/x12";
 * const spec: Build837Spec = {
 *   envelope: {
 *     senderId: "SUBMITTER", receiverId: "RECEIVER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   submitter: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "SUBMITTER ONE", idQualifier: "46", idCode: "SUB001" },
 *   receiver: { entityIdentifierCode: "40", entityTypeQualifier: "2", name: "RECEIVER ONE", idQualifier: "46", idCode: "REC001" },
 *   billingProviders: [{
 *     provider: { entityIdentifierCode: "85", entityTypeQualifier: "2", name: "BILLING CLINIC INC", idQualifier: "XX", idCode: "1234567890" },
 *     subscribers: [{
 *       info: { payerResponsibilityCode: "P", individualRelationshipCode: "18", claimFilingIndicator: "MB" },
 *       subscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "PATIENT", firstName: "TEST", idQualifier: "MI", idCode: "MEMBER001" },
 *       payer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER ONE", idQualifier: "PI", idCode: "PAYER01" },
 *       claims: [{
 *         claimId: "PT-ACCT-001", totalCharge: X12Decimal.fromString("150.00")!,
 *         diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
 *         serviceLines: [{ variant: "P", procedureQualifier: "HC", procedureCode: "99213", charge: X12Decimal.fromString("150.00")!, unitOfMeasure: "UN", units: X12Decimal.fromString("1")!, diagnosisPointers: ["1"] }],
 *       }],
 *     }],
 *   }],
 * };
 * const ix = build837P(spec);
 * ```
 */
export interface Build837Spec {
  /** Interchange / group / transaction identity. */
  readonly envelope: Build837EnvelopeSpec;
  /** Loop 1000A submitter (NM1*41). */
  readonly submitter: Build837EntitySpec;
  /** Loop 1000B receiver (NM1*40). */
  readonly receiver: Build837EntitySpec;
  /** Loop 2000A billing providers (≥ 1 required). */
  readonly billingProviders: readonly Build837BillingProviderSpec[];
}

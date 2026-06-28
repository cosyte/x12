/**
 * Spec types for the 835 domain builder ({@link
 * "./build-835.js".build835}). The spec mirrors the {@link
 * "./types.js".X12Remittance} read model field-for-field, MINUS the
 * fields `get835` *derives* (code-list descriptions such as
 * `claimStatusDescription` / `reasonDescription` / a remark's
 * `description`) and minus the read-only `warnings` array. Everything a
 * caller must supply is here; everything the library can look up or
 * compute is not.
 *
 * Money is {@link "../../decimal.js".X12Decimal} throughout — never
 * `number` (float arithmetic destroys cents, and the balance guard relies
 * on exact `BigInt`-backed equality). Construct values with
 * `X12Decimal.fromString("450.00")`.
 *
 * Spec source: WPC TR3 `005010X221A1`. The builder emits segments in TR3
 * loop order and round-trips back through `get835`, so a balanced spec is
 * reproduced field-for-field.
 */

import type { X12Decimal } from "../../decimal.js";

/**
 * Interchange + group + transaction identity for the built 835. Mirrors
 * the `build999` envelope spec; the builder fixes GS-01 to `"HP"` and the
 * version/release to `"005010X221A1"` (the 835 functional group + TR3) so
 * the caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build835EnvelopeSpec } from "@cosyte/x12";
 * const env: Build835EnvelopeSpec = {
 *   senderId: "MEDICARE", receiverId: "SUBMITTER",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build835EnvelopeSpec {
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
 * BPR financial-information / payment header. `totalActualPayment` is the
 * sum the bank moved — it is the right-hand side of the top-of-remit
 * balance invariant `BPR-02 == Σ(CLP-04) − Σ(PLB)` the builder enforces.
 *
 * @example
 * ```ts
 * import type { Build835PaymentSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const bpr: Build835PaymentSpec = {
 *   transactionHandlingCode: "I",
 *   totalActualPayment: X12Decimal.fromString("450.00")!,
 *   creditDebitFlag: "C",
 *   method: "ACH",
 *   paymentDate: "20260601",
 * };
 * ```
 */
export interface Build835PaymentSpec {
  /** BPR-01 — transaction handling code (`I` remittance + payment, `H` notification, …). */
  readonly transactionHandlingCode: string;
  /** BPR-02 — total actual provider payment amount. */
  readonly totalActualPayment: X12Decimal;
  /** BPR-03 — credit/debit flag (`C` credit, `D` debit). */
  readonly creditDebitFlag: string;
  /** BPR-04 — payment method (`ACH`, `CHK`, `NON`, `BOP`, `FWT`). */
  readonly method: string;
  /** BPR-05 — payment format code (situational). */
  readonly paymentFormatCode?: string;
  /** BPR-16 — payment effective date (CCYYMMDD). */
  readonly paymentDate: string;
}

/**
 * TRN reassociation trace. At least one is required by the TR3 (it pairs
 * the 835 to the payment artifact a cash-poster reconciles against).
 *
 * @example
 * ```ts
 * import type { Build835TraceSpec } from "@cosyte/x12";
 * const trn: Build835TraceSpec = {
 *   traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678",
 * };
 * ```
 */
export interface Build835TraceSpec {
  /** TRN-01 — trace type code (`1` current transaction trace numbers). */
  readonly traceTypeCode: string;
  /** TRN-02 — reference identification (the trace / check number). */
  readonly referenceId: string;
  /** TRN-03 — originating company identifier. */
  readonly originatingCompanyId?: string;
  /** TRN-04 — originating company supplemental code. */
  readonly originatingCompanySupplementalCode?: string;
}

/**
 * N3 + N4 address block on a party. Mirrors {@link
 * "./types.js".X12RemitAddress}.
 *
 * @example
 * ```ts
 * import type { Build835AddressSpec } from "@cosyte/x12";
 * const a: Build835AddressSpec = {
 *   lines: ["123 PAYER WAY"], city: "BALTIMORE", state: "MD", postalCode: "21244",
 * };
 * ```
 */
export interface Build835AddressSpec {
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
 * REF additional identifier on a party / claim / service line. Mirrors
 * {@link "./types.js".X12RemitReference}. `description` (REF-03) is
 * emitted only when supplied.
 *
 * @example
 * ```ts
 * import type { Build835ReferenceSpec } from "@cosyte/x12";
 * const ref: Build835ReferenceSpec = { qualifier: "TJ", value: "123456789" };
 * ```
 */
export interface Build835ReferenceSpec {
  /** REF-01 — reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 — reference identification value. */
  readonly value: string;
  /** REF-03 — description (situational). */
  readonly description?: string;
}

/**
 * PER contact on a party (Loop 1000A/1000B). Each contact may carry up to
 * three communication channels. Mirrors {@link
 * "./types.js".X12RemitContact}.
 *
 * @example
 * ```ts
 * import type { Build835ContactSpec } from "@cosyte/x12";
 * const per: Build835ContactSpec = {
 *   contactFunctionCode: "BL",
 *   name: "JANE COORDINATOR",
 *   communications: [{ qualifier: "TE", value: "5551234567" }],
 * };
 * ```
 */
export interface Build835ContactSpec {
  /** PER-01 — contact function code (`BL` technical, `CX` claim office, …). */
  readonly contactFunctionCode: string;
  /** PER-02 — contact name. */
  readonly name?: string;
  /** Up to 3 communication channels (PER-03/04, 05/06, 07/08). */
  readonly communications?: readonly { readonly qualifier: string; readonly value: string }[];
}

/**
 * N1 party — payer (Loop 1000A, `entityIdentifierCode: "PR"`) or payee
 * (Loop 1000B, `"PE"`). Mirrors {@link "./types.js".X12RemitParty}.
 *
 * @example
 * ```ts
 * import type { Build835PartySpec } from "@cosyte/x12";
 * const payer: Build835PartySpec = {
 *   entityIdentifierCode: "PR", name: "MEDICARE PART A",
 *   address: { lines: ["123 PAYER WAY"], city: "BALTIMORE", state: "MD", postalCode: "21244" },
 * };
 * ```
 */
export interface Build835PartySpec {
  /** N1-01 — entity identifier code (`PR` payer / `PE` payee). */
  readonly entityIdentifierCode: string;
  /** N1-02 — party name. */
  readonly name: string;
  /** N1-03 — identification code qualifier. */
  readonly idQualifier?: string;
  /** N1-04 — identification code. */
  readonly idCode?: string;
  /** N3 + N4 address block. */
  readonly address?: Build835AddressSpec;
  /** REF additional identifiers. */
  readonly additionalIdentifiers?: readonly Build835ReferenceSpec[];
  /** PER contacts. */
  readonly contacts?: readonly Build835ContactSpec[];
}

/**
 * NM1 person on a claim — patient (`QC`), subscriber (`IL`), or corrected
 * patient (`74`). Mirrors {@link "./types.js".X12RemitPerson}. NM1-02
 * (entity type qualifier) is emitted as `"1"` (person).
 *
 * @example
 * ```ts
 * import type { Build835PersonSpec } from "@cosyte/x12";
 * const patient: Build835PersonSpec = {
 *   entityIdentifierCode: "QC", lastName: "PATIENT", firstName: "TEST",
 *   idQualifier: "MI", idCode: "MEMBER001",
 * };
 * ```
 */
export interface Build835PersonSpec {
  /** NM1-01 — entity identifier code (`QC` patient / `IL` insured / `74` corrected). */
  readonly entityIdentifierCode: string;
  /** NM1-03 — last name / organization name. */
  readonly lastName?: string;
  /** NM1-04 — first name. */
  readonly firstName?: string;
  /** NM1-05 — middle name. */
  readonly middleName?: string;
  /** NM1-07 — name suffix. */
  readonly suffix?: string;
  /** NM1-08 — identification code qualifier (`MI`, `34`, …). */
  readonly idQualifier?: string;
  /** NM1-09 — identification code. */
  readonly idCode?: string;
}

/**
 * NM1 provider on a claim — service provider (`82`). Mirrors {@link
 * "./types.js".X12RemitProvider}. NM1-02 is emitted as `"2"`
 * (non-person / organization).
 *
 * @example
 * ```ts
 * import type { Build835ProviderSpec } from "@cosyte/x12";
 * const prov: Build835ProviderSpec = {
 *   entityIdentifierCode: "82", name: "RENDERING PROVIDER INC",
 *   idQualifier: "XX", idCode: "1234567890",
 * };
 * ```
 */
export interface Build835ProviderSpec {
  /** NM1-01 — entity identifier code (`82` service provider). */
  readonly entityIdentifierCode: string;
  /** NM1-03 — organization name. */
  readonly name?: string;
  /** NM1-08 — identification code qualifier (`XX` NPI). */
  readonly idQualifier?: string;
  /** NM1-09 — identification code. */
  readonly idCode?: string;
}

/**
 * One CAS adjustment (one reason / amount / quantity triple under a group
 * code). Mirrors {@link "./types.js".X12RemitAdjustment} minus the
 * looked-up `reasonDescription`. The builder re-chunks adjustments that
 * share a `groupCode` into CAS segments (≤ 6 triples each).
 *
 * @example
 * ```ts
 * import type { Build835AdjustmentSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const cas: Build835AdjustmentSpec = {
 *   groupCode: "PR", reasonCode: "1", amount: X12Decimal.fromString("50.00")!,
 * };
 * ```
 */
export interface Build835AdjustmentSpec {
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
 * One remark (LQ). Mirrors {@link "./types.js".X12RemitRemark} minus the
 * looked-up `description`. Emitted as `LQ*{system}*{code}`. Note: the read
 * side also surfaces MIA/MOA remark codes as `system: "HE"` remarks — the
 * builder emits all remarks via LQ, so a round-trip reproduces the
 * `{ system, code }` pair (the equivalent model), not the original
 * MIA/MOA segment.
 *
 * @example
 * ```ts
 * import type { Build835RemarkSpec } from "@cosyte/x12";
 * const lq: Build835RemarkSpec = { system: "HE", code: "N4" };
 * ```
 */
export interface Build835RemarkSpec {
  /** LQ-01 — code list qualifier code (`HE` healthcare remark / RARC, …). */
  readonly system: string;
  /** LQ-02 — industry code value. */
  readonly code: string;
}

/**
 * AMT supplemental amount on a claim / service line. Mirrors {@link
 * "./types.js".X12RemitAmount}.
 *
 * @example
 * ```ts
 * import type { Build835AmountSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const amt: Build835AmountSpec = { qualifier: "B6", amount: X12Decimal.fromString("450.00")! };
 * ```
 */
export interface Build835AmountSpec {
  /** AMT-01 — amount qualifier code (`AU`, `B6`, …). */
  readonly qualifier: string;
  /** AMT-02 — monetary amount. */
  readonly amount: X12Decimal;
}

/**
 * Loop 2110 service-line spec. Subject to the per-line balance invariant
 * `SVC-02 == SVC-03 + Σ(line CAS)` — the builder REFUSES an out-of-balance
 * line. Mirrors {@link "./types.js".X12RemitServiceLine}.
 *
 * @example
 * ```ts
 * import type { Build835ServiceLineSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const line: Build835ServiceLineSpec = {
 *   productServiceIdQualifier: "HC", productServiceId: "99213",
 *   chargeAmount: X12Decimal.fromString("500.00")!,
 *   paymentAmount: X12Decimal.fromString("450.00")!,
 *   adjustments: [{ groupCode: "PR", reasonCode: "1", amount: X12Decimal.fromString("50.00")! }],
 * };
 * ```
 */
export interface Build835ServiceLineSpec {
  /** SVC-01-1 — product/service ID qualifier (`HC`, `AD`, `N4`, `WK`, `IV`). */
  readonly productServiceIdQualifier: string;
  /** SVC-01-2 — product/service ID (the procedure code). */
  readonly productServiceId: string;
  /** SVC-01-3..6 — procedure modifiers. */
  readonly modifiers?: readonly string[];
  /** SVC-02 — line item charge amount. */
  readonly chargeAmount: X12Decimal;
  /** SVC-03 — line item provider payment amount. */
  readonly paymentAmount: X12Decimal;
  /** SVC-05 — revenue code (institutional). */
  readonly revenueCode?: string;
  /** SVC-07 — units of service paid. */
  readonly paidUnitsOfService?: X12Decimal;
  /** SVC-06-2 — original (submitted) product/service ID. */
  readonly originalServiceId?: string;
  /** SVC-06-1 — original product/service ID qualifier. */
  readonly originalServiceIdQualifier?: string;
  /** Service date start (DTM*150, or single DTM*472 when start == end). */
  readonly serviceDateStart?: string;
  /** Service date end (DTM*151). */
  readonly serviceDateEnd?: string;
  /** Line-level CAS adjustments. */
  readonly adjustments?: readonly Build835AdjustmentSpec[];
  /** Line-level REF identifiers. */
  readonly references?: readonly Build835ReferenceSpec[];
  /** Line-level AMT amounts. */
  readonly amounts?: readonly Build835AmountSpec[];
  /** Line-level LQ remarks. */
  readonly remarks?: readonly Build835RemarkSpec[];
}

/**
 * Loop 2100 claim-payment spec. Subject to the claim balance invariant
 * `CLP-03 == CLP-04 + Σ(claim CAS + line CAS)` — the builder REFUSES an
 * out-of-balance claim. Mirrors {@link "./types.js".X12RemitClaim} minus
 * the looked-up `claimStatusDescription`.
 *
 * @example
 * ```ts
 * import type { Build835ClaimSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const claim: Build835ClaimSpec = {
 *   patientControlNumber: "PT-ACCT-001", claimStatusCode: "1",
 *   totalChargeAmount: X12Decimal.fromString("500.00")!,
 *   totalPaymentAmount: X12Decimal.fromString("450.00")!,
 *   patientResponsibilityAmount: X12Decimal.fromString("50.00")!,
 * };
 * ```
 */
export interface Build835ClaimSpec {
  /** CLP-01 — patient control number. */
  readonly patientControlNumber: string;
  /** CLP-02 — claim status code. */
  readonly claimStatusCode: string;
  /** CLP-03 — total submitted charge amount. */
  readonly totalChargeAmount: X12Decimal;
  /** CLP-04 — total claim payment amount. */
  readonly totalPaymentAmount: X12Decimal;
  /** CLP-05 — patient responsibility amount (informational, not balanced). */
  readonly patientResponsibilityAmount: X12Decimal;
  /** CLP-06 — claim filing indicator code. */
  readonly claimFilingIndicatorCode?: string;
  /** CLP-07 — payer claim control number. */
  readonly payerClaimControlNumber?: string;
  /** CLP-08-1 — facility type code. */
  readonly facilityTypeCode?: string;
  /** CLP-08-3 — claim frequency code. */
  readonly claimFrequencyCode?: string;
  /** Claim-level CAS adjustments. */
  readonly adjustments?: readonly Build835AdjustmentSpec[];
  /** NM1*QC patient. */
  readonly patient?: Build835PersonSpec;
  /** NM1*IL subscriber. */
  readonly subscriber?: Build835PersonSpec;
  /** NM1*74 corrected patient. */
  readonly correctedPatient?: Build835PersonSpec;
  /** NM1*82 service provider. */
  readonly serviceProvider?: Build835ProviderSpec;
  /** A second NM1*82 (rendering provider). */
  readonly renderingProvider?: Build835ProviderSpec;
  /** DTM*232 statement-from date. */
  readonly servicePeriodStart?: string;
  /** DTM*233 statement-to date. */
  readonly servicePeriodEnd?: string;
  /** Claim-level REF identifiers. */
  readonly references?: readonly Build835ReferenceSpec[];
  /** Claim-level AMT amounts. */
  readonly amounts?: readonly Build835AmountSpec[];
  /** Claim-level LQ remarks. */
  readonly remarks?: readonly Build835RemarkSpec[];
  /** Loop 2110 service lines. */
  readonly serviceLines?: readonly Build835ServiceLineSpec[];
}

/**
 * PLB provider-level adjustment. **Sign convention (raw EDI):** a POSITIVE
 * amount REDUCES the provider payment (take-back / recoupment); a NEGATIVE
 * amount ADDS to it (interest / advance). The top-of-remit invariant
 * `BPR-02 == Σ(CLP-04) − Σ(PLB)` relies on this sign. Mirrors {@link
 * "./types.js".X12RemitProviderAdjustment}.
 *
 * @example
 * ```ts
 * import type { Build835ProviderAdjustmentSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const plb: Build835ProviderAdjustmentSpec = {
 *   providerId: "1234567890", fiscalPeriodDate: "20261231",
 *   reasonCode: "WO", subCode: "PRIOR-CLAIM-X", amount: X12Decimal.fromString("50.00")!,
 * };
 * ```
 */
export interface Build835ProviderAdjustmentSpec {
  /** PLB-01 — provider identifier. */
  readonly providerId: string;
  /** PLB-02 — fiscal period date (CCYYMMDD). */
  readonly fiscalPeriodDate: string;
  /** Adjustment reason code (PLB composite component 1). */
  readonly reasonCode: string;
  /** Adjustment reference / sub code (PLB composite component 2). */
  readonly subCode?: string;
  /** Adjustment amount (raw EDI sign). */
  readonly amount: X12Decimal;
}

/**
 * The full input to {@link "./build-835.js".build835}: the envelope, the
 * payment header, ≥ 1 trace, optional payer/payee parties, the claims, and
 * optional provider-level adjustments. A balanced spec round-trips through
 * `get835` field-for-field; an imbalanced one is REFUSED with a {@link
 * "./build-errors.js".Remit835BuildError}.
 *
 * @example
 * ```ts
 * import { build835, X12Decimal, type Build835Spec } from "@cosyte/x12";
 * const spec: Build835Spec = {
 *   envelope: {
 *     senderId: "MEDICARE", receiverId: "SUBMITTER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   payment: {
 *     transactionHandlingCode: "I",
 *     totalActualPayment: X12Decimal.fromString("450.00")!,
 *     creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
 *   },
 *   traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
 *   claims: [
 *     {
 *       patientControlNumber: "PT-ACCT-001", claimStatusCode: "1",
 *       totalChargeAmount: X12Decimal.fromString("500.00")!,
 *       totalPaymentAmount: X12Decimal.fromString("450.00")!,
 *       patientResponsibilityAmount: X12Decimal.fromString("50.00")!,
 *       adjustments: [{ groupCode: "PR", reasonCode: "1", amount: X12Decimal.fromString("50.00")! }],
 *     },
 *   ],
 * };
 * const ix = build835(spec);
 * ```
 */
export interface Build835Spec {
  /** Interchange / group / transaction identity. */
  readonly envelope: Build835EnvelopeSpec;
  /** BPR payment header. */
  readonly payment: Build835PaymentSpec;
  /** TRN traces (≥ 1 required). */
  readonly traces: readonly Build835TraceSpec[];
  /** Loop 1000A payer party (N1*PR). */
  readonly payer?: Build835PartySpec;
  /** Loop 1000B payee party (N1*PE). */
  readonly payee?: Build835PartySpec;
  /** Loop 2100 claim payments. */
  readonly claims: readonly Build835ClaimSpec[];
  /** PLB provider-level adjustments. */
  readonly providerAdjustments?: readonly Build835ProviderAdjustmentSpec[];
}

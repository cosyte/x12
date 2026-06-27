/**
 * Typed model for an X12 005010X221A1 835 Healthcare Claim Payment/Advice
 * (ERA). The shape is the public contract of `get835()` — adding fields is
 * backward-compatible; renaming fields is breaking. All monetary fields
 * are {@link "../../decimal.js".X12Decimal} (NEVER `number` — float
 * arithmetic destroys cents on a real-world remit).
 *
 * Spec source: WPC TR3 `005010X221A1` — Healthcare Claim Payment/Advice
 * (835). Segment-level references in JSDoc are 1-indexed against that TR3.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

/**
 * The top-level result returned by {@link "./get-835.js".get835}. Carries
 * the payment header (BPR), the trace (TRN), payer + payee identification
 * (Loop 1000A/1000B), every claim payment loop (Loop 2100 → Loop 2110),
 * provider-level adjustments (PLB), and every warning surfaced during the
 * walk — including the safety-critical {@link
 * "../../parser/warnings.js".WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH}.
 *
 * @example
 * ```ts
 * import { parseX12, get835 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
 * if (tx !== undefined) {
 *   const remit = get835(ix.delimiters, tx);
 *   remit.payment.totalActualPayment.toString();
 *   for (const claim of remit.claims) {
 *     claim.totalChargeAmount.toString();
 *     claim.totalPaymentAmount.toString();
 *   }
 * }
 * ```
 */
export interface X12Remittance {
  readonly payment: X12RemitPaymentHeader;
  readonly traces: readonly X12RemitTrace[];
  readonly payer: X12RemitParty | undefined;
  readonly payee: X12RemitParty | undefined;
  readonly claims: readonly X12RemitClaim[];
  readonly providerAdjustments: readonly X12RemitProviderAdjustment[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * Decoded BPR — Financial Information / payment header. The PAYMENT
 * MOVEMENT primitive: actual payment amount, credit/debit flag, method
 * (`ACH`/`CHK`/`NON`/`BOP`/`FWT`), payment date. **`totalActualPayment`
 * is the sum the bank actually moved** — `Σ(claim CLP-04) + Σ(PLB
 * adjustments) === BPR-02` is the top-level balance invariant.
 *
 * @example
 * ```ts
 * import type { X12RemitPaymentHeader } from "@cosyte/x12";
 * declare const p: X12RemitPaymentHeader;
 * p.totalActualPayment.toString(); // "945.00"
 * p.method;                         // "ACH"
 * p.paymentDate;                    // "20260601" (CCYYMMDD, verbatim)
 * ```
 */
export interface X12RemitPaymentHeader {
  readonly transactionHandlingCode: string;
  readonly totalActualPayment: X12Decimal;
  /**
   * BPR-03 credit/debit flag. Spec-defined values: `"C"` (credit — money
   * to provider, the normal case) or `"D"` (debit — refund / chargeback,
   * uncommon). The field is typed as `string` to preserve verbatim any
   * non-spec value from a quirky payer; consumers branching on it should
   * compare against the literals.
   */
  readonly creditDebitFlag: string;
  readonly method: string;
  readonly paymentFormatCode: string | undefined;
  readonly paymentDate: string;
}

/**
 * Decoded TRN — Reassociation Trace Number. Pairs the 835 to the
 * originating payer's payment artifact (ACH trace, check number) so a
 * cash-poster can reconcile. `referenceId` is the trace number a bank
 * statement / ACH addenda will carry; `originatingCompanyId` is the
 * payer's CMS-assigned (or proprietary) routing identifier.
 *
 * @example
 * ```ts
 * import type { X12RemitTrace } from "@cosyte/x12";
 * declare const t: X12RemitTrace;
 * t.traceTypeCode;             // "1" — Current Transaction Trace Numbers
 * t.referenceId;               // e.g. "12345" (verbatim)
 * t.originatingCompanyId;      // e.g. "1512345678"
 * ```
 */
export interface X12RemitTrace {
  readonly traceTypeCode: string;
  readonly referenceId: string;
  readonly originatingCompanyId: string | undefined;
  readonly originatingCompanySupplementalCode: string | undefined;
}

/**
 * Decoded Loop 1000A (Payer Identification) or Loop 1000B (Payee
 * Identification) party. The shape is uniform across both loops so a
 * consumer can iterate by role. PHI surface here: payer/payee names +
 * addresses + contact info are PII (payee may be an individual provider)
 * but NOT PHI in the §164.514 sense — patient identity lives on the
 * per-claim level.
 *
 * @example
 * ```ts
 * import type { X12RemitParty } from "@cosyte/x12";
 * declare const payer: X12RemitParty;
 * payer.name;     // "PAYER NAME"
 * payer.idCode;   // "12345" (NAIC / NPI / payer ID, verbatim)
 * ```
 */
export interface X12RemitParty {
  readonly entityIdentifierCode: string;
  readonly name: string;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly address: X12RemitAddress | undefined;
  readonly additionalIdentifiers: readonly X12RemitReference[];
  readonly contacts: readonly X12RemitContact[];
}

/**
 * Decoded N3 + N4 address block attached to a party. `lines` is the N3
 * address lines (1-2 entries); `city`/`state`/`postalCode` come from N4.
 * All fields verbatim — no normalization (no proper-casing, no
 * postal-code canonicalization).
 *
 * @example
 * ```ts
 * import type { X12RemitAddress } from "@cosyte/x12";
 * declare const a: X12RemitAddress;
 * a.lines[0];     // "123 PAYER WAY"
 * a.city;         // "ANYTOWN"
 * a.state;        // "OH"
 * a.postalCode;   // "44113"
 * ```
 */
export interface X12RemitAddress {
  readonly lines: readonly string[];
  readonly city: string | undefined;
  readonly state: string | undefined;
  readonly postalCode: string | undefined;
  readonly countryCode: string | undefined;
}

/**
 * Decoded REF segment — additional identifier (Tax ID, payer ID,
 * supplemental). `qualifier` is the X12 reference-identification
 * qualifier (`"2U"` payer ID, `"TJ"` Tax ID, `"EV"` participant
 * receiver, `"D9"` claim number, …); `value` is the verbatim ID. Used on
 * payer / payee loops and on per-claim contexts.
 *
 * @example
 * ```ts
 * import type { X12RemitReference } from "@cosyte/x12";
 * declare const r: X12RemitReference;
 * r.qualifier; // "TJ"
 * r.value;     // "123456789"
 * ```
 */
export interface X12RemitReference {
  readonly qualifier: string;
  readonly value: string;
  readonly description: string | undefined;
}

/**
 * Decoded PER contact segment. `contactFunctionCode` = `"BL"`
 * (Technical), `"CX"` (Payers' Claim Office), etc.; each contact may
 * carry up to 3 communication channels (TE/EX/EM/FX).
 *
 * @example
 * ```ts
 * import type { X12RemitContact } from "@cosyte/x12";
 * declare const c: X12RemitContact;
 * c.contactFunctionCode;       // "BL"
 * c.name;                       // "JANE COORDINATOR"
 * c.communications[0]?.qualifier; // "TE"
 * c.communications[0]?.value;     // "5551234567"
 * ```
 */
export interface X12RemitContact {
  readonly contactFunctionCode: string;
  readonly name: string | undefined;
  readonly communications: readonly { readonly qualifier: string; readonly value: string }[];
}

/**
 * Decoded Loop 2100 — Claim Payment Information. The clinical-claim
 * unit: one provider-billed claim adjudicated by the payer. **Carries
 * the per-claim balance invariant** (`totalPaymentAmount +
 * patientResponsibilityAmount + Σ(claim-level adjustments) ===
 * totalChargeAmount`); a mismatch fires
 * `X12_835_REMIT_BALANCE_MISMATCH` and is NEVER silently rebalanced.
 *
 * PHI surface: `patientControlNumber` (provider's account number),
 * `payerClaimControlNumber`, the patient name on NM1*QC, and member ID
 * on NM1*IL all carry PHI; the parser surfaces them verbatim, never
 * echoes them in warnings, and never normalizes.
 *
 * @example
 * ```ts
 * import type { X12RemitClaim } from "@cosyte/x12";
 * declare const c: X12RemitClaim;
 * c.patientControlNumber;          // "PT-ACCT-001"
 * c.totalChargeAmount.toString();  // "500.00"
 * c.totalPaymentAmount.toString(); // "450.00"
 * c.claimStatusCode;               // "1" — Processed as Primary
 * c.serviceLines.length;           // count of SVC loops
 * ```
 */
export interface X12RemitClaim {
  readonly patientControlNumber: string;
  readonly claimStatusCode: string;
  readonly claimStatusDescription: string | undefined;
  readonly totalChargeAmount: X12Decimal;
  readonly totalPaymentAmount: X12Decimal;
  readonly patientResponsibilityAmount: X12Decimal;
  readonly claimFilingIndicatorCode: string | undefined;
  readonly payerClaimControlNumber: string | undefined;
  readonly facilityTypeCode: string | undefined;
  readonly claimFrequencyCode: string | undefined;
  readonly adjustments: readonly X12RemitAdjustment[];
  readonly patient: X12RemitPerson | undefined;
  readonly subscriber: X12RemitPerson | undefined;
  readonly correctedPatient: X12RemitPerson | undefined;
  readonly serviceProvider: X12RemitProvider | undefined;
  readonly renderingProvider: X12RemitProvider | undefined;
  readonly servicePeriodStart: string | undefined;
  readonly servicePeriodEnd: string | undefined;
  readonly references: readonly X12RemitReference[];
  readonly amounts: readonly X12RemitAmount[];
  readonly remarks: readonly X12RemitRemark[];
  readonly serviceLines: readonly X12RemitServiceLine[];
}

/**
 * Decoded CAS adjustment. One CAS segment carries up to 6 adjustment
 * triples (reason code + amount + optional quantity) all under the same
 * `groupCode` (CAS-01). The walker flattens these so each
 * {@link X12RemitAdjustment} is ONE adjustment, not one segment.
 *
 * **`groupCode` is the safety primitive** — see
 * {@link "../../code-lists/cagc.js".CLAIM_ADJUSTMENT_GROUP_CODES}. `CO`
 * = provider write-off; `PR` = patient owes; `OA` / `PI` = other / payer
 * edit. `reasonCode` is the CARC value (verbatim); `reasonDescription`
 * is from the bundled snapshot or `undefined` if outside the subset.
 *
 * @example
 * ```ts
 * import type { X12RemitAdjustment } from "@cosyte/x12";
 * declare const a: X12RemitAdjustment;
 * a.groupCode;             // "PR" (patient responsibility)
 * a.reasonCode;            // "1" (deductible)
 * a.reasonDescription;     // "Deductible Amount"
 * a.amount.toString();     // "50.00"
 * ```
 */
export interface X12RemitAdjustment {
  readonly groupCode: string;
  readonly reasonCode: string;
  readonly reasonDescription: string | undefined;
  readonly amount: X12Decimal;
  readonly quantity: X12Decimal | undefined;
}

/**
 * Decoded NM1 person — patient, subscriber, or corrected patient. The
 * `idQualifier` distinguishes member ID (`MI`), Social Security
 * (`34` — rare, regulated), payer ID, etc. PHI surface: every field on
 * a person model carries PHI.
 *
 * @example
 * ```ts
 * import type { X12RemitPerson } from "@cosyte/x12";
 * declare const p: X12RemitPerson;
 * p.entityIdentifierCode; // "QC" patient / "IL" insured / "74" corrected patient
 * p.lastName;             // verbatim
 * p.idQualifier;          // "MI"
 * p.idCode;               // "MEMBER123"
 * ```
 */
export interface X12RemitPerson {
  readonly entityIdentifierCode: string;
  readonly lastName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * Decoded NM1 provider — service provider (`82`), rendering provider
 * (`82` in some contexts), crossover carrier (`TT`), other payer
 * (`PR` / `GB`), etc. Same shape as a person but the qualifier semantics
 * are organizational.
 *
 * @example
 * ```ts
 * import type { X12RemitProvider } from "@cosyte/x12";
 * declare const r: X12RemitProvider;
 * r.entityIdentifierCode; // "82" service provider
 * r.name;                 // "RENDERING PROVIDER INC"
 * r.idQualifier;          // "XX" (NPI)
 * r.idCode;               // "1234567890"
 * ```
 */
export interface X12RemitProvider {
  readonly entityIdentifierCode: string;
  readonly name: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * Decoded AMT segment — supplemental claim or service amount (allowed
 * charge, late filing penalty, capitation payment, etc.). `qualifier`
 * names which amount (`AU` coverage amount, `B6` allowed actual, …).
 * Surfaced verbatim; never folded into the balance invariant (which
 * checks only CLP / CAS / PLB / SVC fields).
 *
 * @example
 * ```ts
 * import type { X12RemitAmount } from "@cosyte/x12";
 * declare const a: X12RemitAmount;
 * a.qualifier; // "B6"
 * a.amount.toString(); // "450.00"
 * ```
 */
export interface X12RemitAmount {
  readonly qualifier: string;
  readonly amount: X12Decimal;
}

/**
 * Decoded remark segment (LQ at claim or service level). `system` is the
 * LQ-01 industry code system (`"HE"` healthcare remark codes /
 * RARC, `"RX"` reject-reason, etc.); `code` is the verbatim value;
 * `description` comes from the bundled RARC snapshot for `HE` codes,
 * `undefined` otherwise. Unknown HE codes also emit
 * `X12_UNKNOWN_RARC`.
 *
 * @example
 * ```ts
 * import type { X12RemitRemark } from "@cosyte/x12";
 * declare const r: X12RemitRemark;
 * r.system;        // "HE"
 * r.code;          // "N4"
 * r.description;   // "Missing/incomplete/invalid prior insurance carrier(s) EOB."
 * ```
 */
export interface X12RemitRemark {
  readonly system: string;
  readonly code: string;
  readonly description: string | undefined;
}

/**
 * Decoded Loop 2110 — Service Payment Information. One per service line
 * adjudicated. Line-level CAS adjustments roll up into the claim-level
 * balance invariant (`Σ(SVC paid) + Σ(line CAS) === CLP-04`); a mismatch
 * fires `X12_835_REMIT_BALANCE_MISMATCH` on the parent claim.
 *
 * `productServiceIdQualifier` is the SVC-01-1 procedure-code system
 * (`HC` HCPCS/CPT, `AD` ADA dental, `N4` NDC, `WK` Advanced Billing
 * Concepts, `IV` HIPPS rate code, …); `productServiceId` is the verbatim
 * code. The qualifier governs interpretation — **misreading it picks
 * the wrong code system** and corrupts the clinical context.
 *
 * @example
 * ```ts
 * import type { X12RemitServiceLine } from "@cosyte/x12";
 * declare const s: X12RemitServiceLine;
 * s.productServiceIdQualifier; // "HC"
 * s.productServiceId;          // "99213"
 * s.chargeAmount.toString();   // "150.00"
 * s.paymentAmount.toString();  // "135.00"
 * ```
 */
export interface X12RemitServiceLine {
  readonly productServiceIdQualifier: string;
  readonly productServiceId: string;
  readonly modifiers: readonly string[];
  readonly chargeAmount: X12Decimal;
  readonly paymentAmount: X12Decimal;
  readonly revenueCode: string | undefined;
  readonly paidUnitsOfService: X12Decimal | undefined;
  readonly originalServiceId: string | undefined;
  readonly originalServiceIdQualifier: string | undefined;
  readonly serviceDateStart: string | undefined;
  readonly serviceDateEnd: string | undefined;
  readonly adjustments: readonly X12RemitAdjustment[];
  readonly references: readonly X12RemitReference[];
  readonly amounts: readonly X12RemitAmount[];
  readonly remarks: readonly X12RemitRemark[];
}

/**
 * Decoded PLB — Provider-Level Adjustment. Off-claim adjustments
 * (recoupments, interest, capitation, write-offs) that move money at
 * the provider level, not the claim level. Each PLB segment carries up
 * to 6 adjustment triples (reason + amount); the walker flattens these
 * so each {@link X12RemitProviderAdjustment} is one adjustment.
 *
 * **Sign convention:** a POSITIVE PLB amount REDUCES the provider's
 * payment (recoupment / take-back); a NEGATIVE PLB amount ADDS to the
 * payment (interest / advance payment). The 835 balance invariant
 * `Σ(claim CLP-04) + Σ(PLB amounts) === BPR-02` works because PLB
 * amounts already carry the correct sign.
 *
 * `reasonCode` is the **composite** PLB reason code (the qualifier +
 * optional reference together, e.g. `WO:123456` for "withholding for
 * claim 123456"); `subCode` carries the optional second component.
 *
 * @example
 * ```ts
 * import type { X12RemitProviderAdjustment } from "@cosyte/x12";
 * declare const p: X12RemitProviderAdjustment;
 * p.providerId;      // "1234567890" (NPI)
 * p.fiscalPeriodDate; // "20261231"
 * p.reasonCode;       // "WO" (withholding)
 * p.subCode;          // "123456" (related-claim reference)
 * p.amount.toString();// "50.00"
 * ```
 */
export interface X12RemitProviderAdjustment {
  readonly providerId: string;
  readonly fiscalPeriodDate: string;
  readonly reasonCode: string;
  readonly subCode: string | undefined;
  readonly amount: X12Decimal;
}

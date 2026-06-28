/**
 * Typed model for an X12 005010X218 820 Payment Order / Remittance Advice
 * (premium payment). The shape is the public contract of
 * {@link "./get-820.js".get820Payments} — adding fields is
 * backward-compatible; renaming fields is breaking. All monetary fields are
 * {@link "../../decimal.js".X12Decimal} (NEVER `number` — float arithmetic
 * destroys cents on a real-world premium remittance).
 *
 * Spec source: WPC TR3 `005010X218` — Payroll Deducted and Other Group
 * Premium Payment for Insurance Products (820). Segment-level references in
 * JSDoc are 1-indexed against that TR3.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

/**
 * The top-level result returned by {@link "./get-820.js".get820Payments}.
 * Carries the payment header (BPR), reassociation traces (TRN), the premium
 * receiver + remitter parties (Loop 1000A / 1000B), every organization /
 * individual remittance detail loop (Loop 2000 → RMR / ADX), and every
 * warning surfaced during the walk.
 *
 * @example
 * ```ts
 * import { parseX12, get820Payments } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
 * if (tx !== undefined) {
 *   const prem = get820Payments(ix.delimiters, tx);
 *   prem.payment.totalPremiumAmount.toString();
 *   for (const r of prem.remittances) {
 *     r.openItems[0]?.amountPaid.toString();
 *   }
 * }
 * ```
 */
export interface X12PremiumPayments {
  readonly payment: X12PremiumPaymentHeader;
  readonly traces: readonly X12PremiumTrace[];
  readonly receiver: X12PremiumParty | undefined;
  readonly remitter: X12PremiumParty | undefined;
  readonly remittances: readonly X12PremiumRemittance[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * Decoded BPR — Financial Information / payment header (identical segment
 * shape to the 835). `totalPremiumAmount` is BPR-02, the aggregate premium
 * the bank actually moved; `method` is BPR-04 (`ACH` / `CHK` / `NON` / …).
 *
 * @example
 * ```ts
 * import type { X12PremiumPaymentHeader } from "@cosyte/x12";
 * declare const p: X12PremiumPaymentHeader;
 * p.totalPremiumAmount.toString(); // "12500.00"
 * p.method;                         // "ACH"
 * p.paymentDate;                    // "20260601" (CCYYMMDD, verbatim)
 * ```
 */
export interface X12PremiumPaymentHeader {
  readonly transactionHandlingCode: string;
  readonly totalPremiumAmount: X12Decimal;
  /**
   * BPR-03 credit/debit flag. Spec-defined `"C"` (credit) or `"D"` (debit);
   * typed `string` to preserve any verbatim non-spec value from a quirky
   * sender.
   */
  readonly creditDebitFlag: string;
  readonly method: string;
  readonly paymentFormatCode: string | undefined;
  readonly paymentDate: string;
}

/**
 * Decoded TRN — Reassociation Trace Number. Pairs the 820 to the
 * originating ACH / check artifact so the receiver can reconcile the
 * premium deposit. `referenceId` is the trace number a bank statement / ACH
 * addenda will carry.
 *
 * @example
 * ```ts
 * import type { X12PremiumTrace } from "@cosyte/x12";
 * declare const t: X12PremiumTrace;
 * t.traceTypeCode;        // "1" — Current Transaction Trace Numbers
 * t.referenceId;          // e.g. "PREM-202606" (verbatim)
 * ```
 */
export interface X12PremiumTrace {
  readonly traceTypeCode: string;
  readonly referenceId: string;
  readonly originatingCompanyId: string | undefined;
  readonly originatingCompanySupplementalCode: string | undefined;
}

/**
 * Decoded Loop 1000A (Premium Receiver, `N1*PE`) or Loop 1000B (Premium
 * Payer / Remitter, `N1*PR` / `N1*RM`) party. Uniform shape so a consumer
 * can read both by role. Names + addresses here are PII (organizational),
 * not PHI in the §164.514 sense — member identity lives on the per-member
 * remittance detail.
 *
 * @example
 * ```ts
 * import type { X12PremiumParty } from "@cosyte/x12";
 * declare const payer: X12PremiumParty;
 * payer.name;     // "EMPLOYER CO"
 * payer.idCode;   // "FEIN123" (verbatim)
 * ```
 */
export interface X12PremiumParty {
  readonly entityIdentifierCode: string;
  readonly name: string;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly address: X12PremiumAddress | undefined;
  readonly references: readonly X12PremiumReference[];
}

/**
 * Decoded N3 + N4 address block attached to a party. `lines` is the N3
 * address lines (1-2 entries); `city` / `state` / `postalCode` come from
 * N4. All verbatim — no normalization.
 *
 * @example
 * ```ts
 * import type { X12PremiumAddress } from "@cosyte/x12";
 * declare const a: X12PremiumAddress;
 * a.lines[0];   // "500 CORPORATE BLVD"
 * a.city;       // "COLUMBUS"
 * ```
 */
export interface X12PremiumAddress {
  readonly lines: readonly string[];
  readonly city: string | undefined;
  readonly state: string | undefined;
  readonly postalCode: string | undefined;
  readonly countryCode: string | undefined;
}

/**
 * Decoded REF segment — supplemental identifier (master policy number, plan
 * id, version). `qualifier` is the X12 reference-identification qualifier;
 * `value` is the verbatim id.
 *
 * @example
 * ```ts
 * import type { X12PremiumReference } from "@cosyte/x12";
 * declare const r: X12PremiumReference;
 * r.qualifier; // "38" (master policy number)
 * r.value;     // "POL-0001"
 * ```
 */
export interface X12PremiumReference {
  readonly qualifier: string;
  readonly value: string;
  readonly description: string | undefined;
}

/**
 * Decoded DTM date attached to the header or a remittance loop. `qualifier`
 * is the date/time qualifier (DTM-01); `value` is the verbatim CCYYMMDD
 * (DTM-02). No normalization.
 *
 * @example
 * ```ts
 * import type { X12PremiumDate } from "@cosyte/x12";
 * declare const d: X12PremiumDate;
 * d.qualifier; // "582" (report period)
 * d.value;     // "20260601"
 * ```
 */
export interface X12PremiumDate {
  readonly qualifier: string;
  readonly value: string;
}

/**
 * Decoded Loop 2000 remittance entry — one organization-summary (`ENT`) or
 * individual (`NM1`) remittance. Carries the open-item references (RMR), the
 * adjustments (ADX), and any REF / DTM context. The entity / individual
 * name fields carry PII / PHI (member name + id) — surfaced verbatim, never
 * echoed in a warning, never normalized.
 *
 * @example
 * ```ts
 * import type { X12PremiumRemittance } from "@cosyte/x12";
 * declare const r: X12PremiumRemittance;
 * r.individual?.lastName;          // verbatim member surname
 * r.openItems[0]?.referenceId;     // policy / invoice number
 * r.openItems[0]?.amountPaid.toString(); // "250.00"
 * ```
 */
export interface X12PremiumRemittance {
  readonly entity: X12PremiumEntity | undefined;
  readonly individual: X12PremiumPerson | undefined;
  readonly references: readonly X12PremiumReference[];
  readonly dates: readonly X12PremiumDate[];
  readonly openItems: readonly X12PremiumOpenItem[];
  readonly adjustments: readonly X12PremiumAdjustment[];
}

/**
 * Decoded ENT — Entity (organization-summary remittance). `assignedNumber`
 * is ENT-01; the entity is identified by ENT-02 (entity id code) plus the
 * ENT-03 / ENT-04 qualifier + id. All verbatim.
 *
 * @example
 * ```ts
 * import type { X12PremiumEntity } from "@cosyte/x12";
 * declare const e: X12PremiumEntity;
 * e.assignedNumber;          // "1"
 * e.entityIdentifierCode;    // "2J" (correspondent)
 * e.idCode;                  // "GRP-0001"
 * ```
 */
export interface X12PremiumEntity {
  readonly assignedNumber: string | undefined;
  readonly entityIdentifierCode: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * Decoded NM1 individual (member) inside an individual remittance loop. PHI
 * surface: every field carries PHI.
 *
 * @example
 * ```ts
 * import type { X12PremiumPerson } from "@cosyte/x12";
 * declare const p: X12PremiumPerson;
 * p.entityIdentifierCode; // "IL" insured
 * p.lastName;             // verbatim
 * p.idQualifier;          // "34" SSN / "ZZ" mutually defined
 * p.idCode;               // verbatim member id
 * ```
 */
export interface X12PremiumPerson {
  readonly entityIdentifierCode: string;
  readonly lastName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * Decoded RMR — Remittance Advice Accounts Receivable Open Item Reference.
 * The premium-line unit: a policy / invoice reference plus the amount paid
 * and (optionally) the amount due. `qualifier` is RMR-01 (reference id
 * qualifier — `"11"` account number, `"IK"` invoice, `"AZ"` health-insurance
 * policy number); `referenceId` is RMR-02; `amountPaid` is RMR-04;
 * `amountDue` is RMR-05.
 *
 * @example
 * ```ts
 * import type { X12PremiumOpenItem } from "@cosyte/x12";
 * declare const o: X12PremiumOpenItem;
 * o.qualifier;             // "AZ"
 * o.referenceId;           // "POL-0001"
 * o.amountPaid.toString(); // "250.00"
 * ```
 */
export interface X12PremiumOpenItem {
  readonly qualifier: string;
  readonly referenceId: string;
  readonly paymentActionCode: string | undefined;
  readonly amountPaid: X12Decimal;
  readonly amountDue: X12Decimal | undefined;
}

/**
 * Decoded ADX — Adjustment to a premium remittance. `amount` is ADX-01
 * (signed monetary adjustment); `reasonCode` is ADX-02 (adjustment reason —
 * `"52"` credit memo, `"53"` debit memo, …); the optional
 * `referenceQualifier` / `referenceId` (ADX-03 / ADX-04) tie the adjustment
 * to a prior item.
 *
 * @example
 * ```ts
 * import type { X12PremiumAdjustment } from "@cosyte/x12";
 * declare const a: X12PremiumAdjustment;
 * a.amount.toString(); // "-25.00"
 * a.reasonCode;        // "53"
 * ```
 */
export interface X12PremiumAdjustment {
  readonly amount: X12Decimal;
  readonly reasonCode: string;
  readonly referenceQualifier: string | undefined;
  readonly referenceId: string | undefined;
}

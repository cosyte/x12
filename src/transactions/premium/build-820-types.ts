/**
 * Spec types for the 820 domain builder ({@link "./build-820.js".build820}).
 * The spec mirrors the {@link "./types.js".X12PremiumPayments} read model
 * field-for-field, MINUS the read-only `warnings` array. Everything a caller
 * must supply is here; everything the library can compute (the envelope
 * counts, the segment terminators) is not.
 *
 * Money is {@link "../../decimal.js".X12Decimal} throughout — never `number`
 * (float arithmetic destroys cents on a real-world premium remittance).
 * Construct values with `X12Decimal.fromString("250.00")`.
 *
 * Spec source: WPC TR3 `005010X218` — Payroll Deducted and Other Group
 * Premium Payment for Insurance Products (820). The builder emits segments
 * in TR3 loop order and round-trips back through `get820Payments`, so a
 * well-formed spec is reproduced field-for-field.
 */

import type { X12Decimal } from "../../decimal.js";

/**
 * Interchange + group + transaction identity for the built 820. The builder
 * fixes GS-01 to `"RA"` (Payment Order / Remittance Advice) and the
 * version/release to `"005010X218"` (the 820 functional group + TR3) so the
 * caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build820EnvelopeSpec } from "@cosyte/x12";
 * const env: Build820EnvelopeSpec = {
 *   senderId: "EMPLOYERCO", receiverId: "MEDPAY",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build820EnvelopeSpec {
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
 * BPR financial-information / payment header. `totalPremiumAmount` is the
 * aggregate premium the bank moved (BPR-02). Identical segment shape to the
 * 835 — but the 820 carries no balance equation, so this total is emitted
 * verbatim, never reconciled against the remittance open items.
 *
 * @example
 * ```ts
 * import type { Build820PaymentSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const bpr: Build820PaymentSpec = {
 *   transactionHandlingCode: "I",
 *   totalPremiumAmount: X12Decimal.fromString("12500.00")!,
 *   creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
 * };
 * ```
 */
export interface Build820PaymentSpec {
  /** BPR-01 — transaction handling code (`I` remittance + payment, `H` notification, …). */
  readonly transactionHandlingCode: string;
  /** BPR-02 — total premium amount the bank moved. */
  readonly totalPremiumAmount: X12Decimal;
  /** BPR-03 — credit/debit flag (`C` credit, `D` debit). */
  readonly creditDebitFlag: string;
  /** BPR-04 — payment method (`ACH`, `CHK`, `NON`, …). */
  readonly method: string;
  /** BPR-05 — payment format code (situational). */
  readonly paymentFormatCode?: string;
  /** BPR-16 — payment effective date (CCYYMMDD). */
  readonly paymentDate: string;
}

/**
 * TRN reassociation trace — pairs the 820 to the originating ACH / check so
 * the receiver can reconcile the premium deposit. At least one is required
 * (TR3 005010X218 mandates the header TRN).
 *
 * @example
 * ```ts
 * import type { Build820TraceSpec } from "@cosyte/x12";
 * const trn: Build820TraceSpec = {
 *   traceTypeCode: "1", referenceId: "PREM-202606", originatingCompanyId: "1512345678",
 * };
 * ```
 */
export interface Build820TraceSpec {
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
 * "./types.js".X12PremiumAddress}.
 *
 * @example
 * ```ts
 * import type { Build820AddressSpec } from "@cosyte/x12";
 * const a: Build820AddressSpec = {
 *   lines: ["500 CORPORATE BLVD"], city: "COLUMBUS", state: "OH", postalCode: "43004",
 * };
 * ```
 */
export interface Build820AddressSpec {
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
 * REF supplemental identifier on a party or remittance loop. Mirrors {@link
 * "./types.js".X12PremiumReference}. `description` (REF-03) is emitted only
 * when supplied.
 *
 * @example
 * ```ts
 * import type { Build820ReferenceSpec } from "@cosyte/x12";
 * const ref: Build820ReferenceSpec = { qualifier: "38", value: "POL-0001" };
 * ```
 */
export interface Build820ReferenceSpec {
  /** REF-01 — reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 — reference identification value. */
  readonly value: string;
  /** REF-03 — description (situational). */
  readonly description?: string;
}

/**
 * DTM date attached to a remittance loop. Mirrors {@link
 * "./types.js".X12PremiumDate}. The 820 carries dates only inside a
 * remittance loop — a header-level DTM is not part of the typed surface.
 *
 * @example
 * ```ts
 * import type { Build820DateSpec } from "@cosyte/x12";
 * const d: Build820DateSpec = { qualifier: "582", value: "20260601" };
 * ```
 */
export interface Build820DateSpec {
  /** DTM-01 — date/time qualifier. */
  readonly qualifier: string;
  /** DTM-02 — verbatim CCYYMMDD date. */
  readonly value: string;
}

/**
 * Loop 1000A premium receiver (`N1*PE`) or Loop 1000B premium payer /
 * remitter (`N1*PR` / `N1*RM`). Mirrors {@link "./types.js".X12PremiumParty}.
 *
 * @example
 * ```ts
 * import type { Build820PartySpec } from "@cosyte/x12";
 * const remitter: Build820PartySpec = {
 *   entityIdentifierCode: "PR", name: "EMPLOYER CO", idQualifier: "FI", idCode: "FEIN123",
 * };
 * ```
 */
export interface Build820PartySpec {
  /** N1-01 — entity identifier code (`PE` receiver / `PR` / `RM` remitter). */
  readonly entityIdentifierCode: string;
  /** N1-02 — party name. */
  readonly name: string;
  /** N1-03 — identification code qualifier. */
  readonly idQualifier?: string;
  /** N1-04 — identification code. */
  readonly idCode?: string;
  /** N3 + N4 address block. */
  readonly address?: Build820AddressSpec;
  /** REF supplemental identifiers. */
  readonly references?: readonly Build820ReferenceSpec[];
}

/**
 * ENT entity — opens an organization-summary remittance loop (Loop 2000A).
 * Mirrors {@link "./types.js".X12PremiumEntity}. All elements optional; the
 * ENT's role is to open the loop.
 *
 * @example
 * ```ts
 * import type { Build820EntitySpec } from "@cosyte/x12";
 * const e: Build820EntitySpec = {
 *   assignedNumber: "1", entityIdentifierCode: "2J", idQualifier: "94", idCode: "GRP-0001",
 * };
 * ```
 */
export interface Build820EntitySpec {
  /** ENT-01 — assigned number. */
  readonly assignedNumber?: string;
  /** ENT-02 — entity identifier code. */
  readonly entityIdentifierCode?: string;
  /** ENT-03 — identification code qualifier. */
  readonly idQualifier?: string;
  /** ENT-04 — identification code. */
  readonly idCode?: string;
}

/**
 * NM1 individual (member) inside a remittance loop. Mirrors {@link
 * "./types.js".X12PremiumPerson}. PHI surface: every field carries PHI. The
 * builder emits NM1-02 (entity type qualifier) as `"1"` (person); the read
 * side does not interpret it.
 *
 * @example
 * ```ts
 * import type { Build820PersonSpec } from "@cosyte/x12";
 * const p: Build820PersonSpec = {
 *   entityIdentifierCode: "IL", lastName: "DOE", firstName: "JANE",
 *   idQualifier: "34", idCode: "MBR0001",
 * };
 * ```
 */
export interface Build820PersonSpec {
  /** NM1-01 — entity identifier code (`IL` insured, …). */
  readonly entityIdentifierCode: string;
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
}

/**
 * RMR open item — the premium line unit: a policy / invoice reference plus
 * the amount paid and (optionally) the amount due. Mirrors {@link
 * "./types.js".X12PremiumOpenItem}. At least one of `qualifier` /
 * `referenceId` must be non-empty (an RMR with no identity is dropped on the
 * read side, so the builder refuses it).
 *
 * @example
 * ```ts
 * import type { Build820OpenItemSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const o: Build820OpenItemSpec = {
 *   qualifier: "AZ", referenceId: "POL-0001", amountPaid: X12Decimal.fromString("250.00")!,
 * };
 * ```
 */
export interface Build820OpenItemSpec {
  /** RMR-01 — reference id qualifier (`11`, `IK`, `AZ`, …). */
  readonly qualifier: string;
  /** RMR-02 — reference id (policy / invoice number). */
  readonly referenceId: string;
  /** RMR-03 — payment action code (situational). */
  readonly paymentActionCode?: string;
  /** RMR-04 — amount paid. */
  readonly amountPaid: X12Decimal;
  /** RMR-05 — amount due / original (situational). */
  readonly amountDue?: X12Decimal;
}

/**
 * ADX adjustment to a premium remittance. Mirrors {@link
 * "./types.js".X12PremiumAdjustment}.
 *
 * @example
 * ```ts
 * import type { Build820AdjustmentSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const a: Build820AdjustmentSpec = {
 *   amount: X12Decimal.fromString("-25.00")!, reasonCode: "53",
 * };
 * ```
 */
export interface Build820AdjustmentSpec {
  /** ADX-01 — signed monetary adjustment. */
  readonly amount: X12Decimal;
  /** ADX-02 — adjustment reason code (`52` credit memo, `53` debit memo, …). */
  readonly reasonCode: string;
  /** ADX-03 — reference qualifier (situational). */
  readonly referenceQualifier?: string;
  /** ADX-04 — reference id (situational). */
  readonly referenceId?: string;
}

/**
 * One Loop 2000 remittance — an organization summary (`entity`), an
 * individual (`individual`), or both. Mirrors {@link
 * "./types.js".X12PremiumRemittance}. Structural preconditions the builder
 * enforces so the loop round-trips through `get820Payments`:
 * - at least one of `entity` / `individual` must be present (a remittance
 *   needs an `ENT` or `NM1` to open its loop), and
 * - at least one `openItems` entry must be present (a premium remittance
 *   always carries an `RMR` line; an item-less loop would also merge into a
 *   following individual remittance on the read side).
 *
 * @example
 * ```ts
 * import type { Build820RemittanceSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const r: Build820RemittanceSpec = {
 *   individual: { entityIdentifierCode: "IL", lastName: "DOE", idQualifier: "34", idCode: "MBR0001" },
 *   openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: X12Decimal.fromString("250.00")! }],
 * };
 * ```
 */
export interface Build820RemittanceSpec {
  /** ENT entity (Loop 2000A organization summary). */
  readonly entity?: Build820EntitySpec;
  /** NM1 individual (member). */
  readonly individual?: Build820PersonSpec;
  /** REF supplemental identifiers for the loop. */
  readonly references?: readonly Build820ReferenceSpec[];
  /** DTM dates for the loop. */
  readonly dates?: readonly Build820DateSpec[];
  /** RMR open items (≥ 1 required). */
  readonly openItems: readonly Build820OpenItemSpec[];
  /** ADX adjustments for the loop. */
  readonly adjustments?: readonly Build820AdjustmentSpec[];
}

/**
 * The full input to {@link "./build-820.js".build820}: the envelope, the
 * payment header, ≥ 1 trace, optional receiver / remitter parties, and ≥ 1
 * remittance loop. A well-formed spec round-trips through `get820Payments`
 * field-for-field; a structurally impossible one is REFUSED with a {@link
 * "./build-errors.js".Premium820BuildError}.
 *
 * @example
 * ```ts
 * import { build820, X12Decimal, type Build820Spec } from "@cosyte/x12";
 * const spec: Build820Spec = {
 *   envelope: {
 *     senderId: "EMPLOYERCO", receiverId: "MEDPAY",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   payment: {
 *     transactionHandlingCode: "I",
 *     totalPremiumAmount: X12Decimal.fromString("250.00")!,
 *     creditDebitFlag: "C", method: "ACH", paymentDate: "20260601",
 *   },
 *   traces: [{ traceTypeCode: "1", referenceId: "PREM-202606" }],
 *   remitter: { entityIdentifierCode: "PR", name: "EMPLOYER CO" },
 *   receiver: { entityIdentifierCode: "PE", name: "MEDPAY INSURANCE" },
 *   remittances: [
 *     {
 *       individual: { entityIdentifierCode: "IL", lastName: "DOE", idQualifier: "34", idCode: "MBR0001" },
 *       openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: X12Decimal.fromString("250.00")! }],
 *     },
 *   ],
 * };
 * const ix = build820(spec);
 * ```
 */
export interface Build820Spec {
  /** Interchange / group / transaction identity. */
  readonly envelope: Build820EnvelopeSpec;
  /** BPR payment header. */
  readonly payment: Build820PaymentSpec;
  /** TRN traces (≥ 1 required). */
  readonly traces: readonly Build820TraceSpec[];
  /** Loop 1000A premium receiver (N1*PE). */
  readonly receiver?: Build820PartySpec;
  /** Loop 1000B premium payer / remitter (N1*PR / N1*RM). */
  readonly remitter?: Build820PartySpec;
  /** Loop 2000 remittance detail (≥ 1 required). */
  readonly remittances: readonly Build820RemittanceSpec[];
}

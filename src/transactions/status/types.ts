/**
 * Typed model for the X12 005010 claim-status family - 277 Health Care
 * Claim Status Response (`005010X212`) and 277CA Claim Acknowledgment
 * (`005010X214`). Both share `ST-01 = "277"`, the STC composite, and the
 * HL hierarchy; they are disambiguated by `ST-03` (the implementation
 * convention reference). The shared shape is the public contract of
 * {@link "./get-277.js".get277Status} / {@link
 * "./get-277.js".get277CADisposition} - adding fields is backward-
 * compatible; renaming fields is breaking. Monetary fields are
 * {@link "../../decimal.js".X12Decimal} (NEVER `number`).
 *
 * **Status-code fidelity is the safety property here.** A wrong CSCC
 * (category) or CSC (status) silently misattributes *why* a claim was
 * rejected / pended, sending a provider's correction workflow down the
 * wrong path. The walker surfaces the verbatim category + status codes and
 * the bundled descriptions (when known); codes outside the bundled subset
 * keep their verbatim value and emit `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` /
 * `X12_UNKNOWN_CLAIM_STATUS`.
 *
 * Spec source: WPC TR3s `005010X212` (277 Claim Status) + `005010X214`
 * (277CA Claim Acknowledgment).
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
import type { X12Hl } from "../shared/hl.js";

/**
 * Top-level result of the 277 / 277CA walker. Claims are flattened: each
 * {@link X12ClaimStatus} carries its enclosing information source (payer),
 * information receiver, service provider, and subscriber / dependent
 * context resolved from the HL tree, mirroring how `get835` flattens claim
 * payment loops.
 *
 * @example
 * ```ts
 * import { parseX12, get277Status } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
 * if (tx !== undefined) {
 *   const status = get277Status(ix.delimiters, tx);
 *   for (const claim of status?.claims ?? []) {
 *     claim.traces[0]?.referenceId;                  // echoed 276 trace
 *     claim.statuses[0]?.statuses[0]?.categoryCode;  // "A2" (acknowledgment)
 *   }
 * }
 * ```
 */
export interface X12ClaimStatusResponse {
  readonly transactionType: "claim-status" | "claim-acknowledgment";
  readonly implementationConventionReference: string | undefined;
  readonly claims: readonly X12ClaimStatus[];
  readonly hierarchies: readonly X12Hl[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * One claim status-tracking loop (Loop 2200). A claim opens on a TRN
 * (claim-level reassociation trace) or - in a 277CA provider-level batch
 * acknowledgment - on a standalone STC. Carries the resolved HL context,
 * the echoed traces, the decoded STC statuses, supplemental REF / DTP, and
 * any service-line statuses (Loop 2220).
 *
 * @example
 * ```ts
 * import type { X12ClaimStatus } from "@cosyte/x12";
 * declare const c: X12ClaimStatus;
 * c.serviceProvider?.name;   // "ANYTOWN CLINIC"
 * c.subscriber?.lastName;    // "DOE"
 * c.statuses[0]?.totalChargeAmount?.toString(); // "150.00"
 * ```
 */
export interface X12ClaimStatus {
  readonly informationSource: X12StatusEntity | undefined;
  readonly informationReceiver: X12StatusEntity | undefined;
  readonly serviceProvider: X12StatusEntity | undefined;
  readonly subscriber: X12StatusMember | undefined;
  readonly dependent: X12StatusMember | undefined;
  readonly traces: readonly X12StatusTrace[];
  readonly statuses: readonly X12StatusInfo[];
  readonly references: readonly X12StatusReference[];
  readonly dates: readonly X12StatusDate[];
  readonly serviceLines: readonly X12ServiceLineStatus[];
}

/**
 * A non-person entity decoded from an NM1 - the payer (Loop 2100A),
 * information receiver (2100B), or service provider (2100C).
 *
 * @example
 * ```ts
 * import type { X12StatusEntity } from "@cosyte/x12";
 * declare const e: X12StatusEntity;
 * e.entityIdentifierCode; // "PR" / "41" / "1P"
 * e.name;                 // "MEDPAY INSURANCE"
 * e.idCode;               // "00123"
 * ```
 */
export interface X12StatusEntity {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly name: string;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * A person (subscriber Loop 2100D / dependent Loop 2100E) decoded from an
 * NM1. `idCode` is the member identifier (NM1-09) - synthetic-only in
 * fixtures.
 *
 * @example
 * ```ts
 * import type { X12StatusMember } from "@cosyte/x12";
 * declare const m: X12StatusMember;
 * m.lastName; // "DOE"
 * m.idCode;   // "MBR0001"
 * ```
 */
export interface X12StatusMember {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly lastName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * A reassociation trace (TRN). For a 277 claim status, **`referenceId`
 * (TRN-02) echoes the requesting 276's trace number verbatim** so the
 * provider can re-associate the answer. The walker never mutates it.
 *
 * @example
 * ```ts
 * import type { X12StatusTrace } from "@cosyte/x12";
 * declare const t: X12StatusTrace;
 * t.traceTypeCode; // "2"
 * t.referenceId;   // "CLAIM20260627001"
 * ```
 */
export interface X12StatusTrace {
  readonly traceTypeCode: string;
  readonly referenceId: string;
  readonly originatingCompanyId: string | undefined;
  readonly supplementalReferenceId: string | undefined;
}

/**
 * One decoded STC segment - the headline status fields plus the up-to-three
 * {@link X12StatusCode} composites (STC-01, STC-10, STC-11). A single claim
 * (or service line) can carry multiple STC segments; each becomes one
 * `X12StatusInfo`.
 *
 * @example
 * ```ts
 * import type { X12StatusInfo } from "@cosyte/x12";
 * declare const s: X12StatusInfo;
 * s.statusEffectiveDate;        // "20260627"
 * s.totalChargeAmount?.toString(); // "150.00"
 * s.statuses[0]?.statusCode;    // "20"
 * ```
 */
export interface X12StatusInfo {
  readonly statusEffectiveDate: string | undefined;
  readonly actionCode: string | undefined;
  readonly totalChargeAmount: X12Decimal | undefined;
  readonly paymentAmount: X12Decimal | undefined;
  readonly adjudicationDate: string | undefined;
  readonly message: string | undefined;
  readonly statuses: readonly X12StatusCode[];
}

/**
 * One Health Care Claim Status composite (C043, STC-01 / STC-10 / STC-11).
 * Pairs a **CSCC** (Claim Status Category Code, X12 source 507) with a
 * **CSC** (Claim Status Code, X12 source 508) and the responsible entity.
 * The verbatim codes are always preserved; descriptions resolve from the
 * bundled snapshots (or `undefined` outside the subset).
 *
 * @example
 * ```ts
 * import type { X12StatusCode } from "@cosyte/x12";
 * declare const c: X12StatusCode;
 * c.categoryCode;        // "A7" (rejected/invalid)
 * c.statusCode;          // "21" (Missing or invalid information)
 * c.statusDescription;   // "Missing or invalid information."
 * c.entityCode;          // "85" (billing provider)
 * ```
 */
export interface X12StatusCode {
  readonly categoryCode: string;
  readonly categoryDescription: string | undefined;
  readonly statusCode: string;
  readonly statusDescription: string | undefined;
  readonly entityCode: string | undefined;
}

/**
 * A REF supplemental identifier on a claim or service-line status (e.g.
 * REF*1K payer claim control number, REF*BLT bill type).
 *
 * @example
 * ```ts
 * import type { X12StatusReference } from "@cosyte/x12";
 * declare const r: X12StatusReference;
 * r.qualifier; // "1K"
 * r.value;     // "PCN0001"
 * ```
 */
export interface X12StatusReference {
  readonly qualifier: string;
  readonly value: string;
  readonly description: string | undefined;
}

/**
 * A DTP date / date-range on a claim or service-line status (e.g. DTP*472
 * service date, DTP*050 received date).
 *
 * @example
 * ```ts
 * import type { X12StatusDate } from "@cosyte/x12";
 * declare const d: X12StatusDate;
 * d.qualifier;       // "472"
 * d.formatQualifier; // "RD8"
 * d.value;           // "20260601-20260601"
 * ```
 */
export interface X12StatusDate {
  readonly qualifier: string;
  readonly formatQualifier: string;
  readonly value: string;
}

/**
 * One service-line status (Loop 2220). Triggered by an SVC; carries the
 * procedure / revenue identification, line amounts, and its own STC
 * statuses + REF / DTP.
 *
 * @example
 * ```ts
 * import type { X12ServiceLineStatus } from "@cosyte/x12";
 * declare const l: X12ServiceLineStatus;
 * l.procedureCode;                 // "99213"
 * l.lineChargeAmount?.toString();  // "150.00"
 * l.statuses[0]?.statuses[0]?.statusCode; // "20"
 * ```
 */
export interface X12ServiceLineStatus {
  readonly serviceIdQualifier: string | undefined;
  readonly procedureCode: string | undefined;
  readonly modifiers: readonly string[];
  readonly lineChargeAmount: X12Decimal | undefined;
  readonly linePaymentAmount: X12Decimal | undefined;
  readonly revenueCode: string | undefined;
  readonly statuses: readonly X12StatusInfo[];
  readonly references: readonly X12StatusReference[];
  readonly dates: readonly X12StatusDate[];
}

/**
 * Typed model for the 277 Health Care Claim Request for Additional
 * Information, implementation guide `006020X313`: a health plan asking a
 * provider for documentation about a claim it already holds.
 *
 * **This is not a claim status answer, and the type says so.** The reading
 * labels itself `"request-for-additional-information"`, carries no `claims`
 * list and no claim status or claim acknowledgment label, and is neither
 * assignable to nor from {@link "../status/types.js".X12ClaimStatusResponse}.
 * Code written for a status answer cannot be handed a documentation request by
 * accident, and a documentation request cannot be read as a denial with no
 * reason.
 *
 * **What is typed is the base X12 006020 277, and no TR3 usage is asserted.**
 * The implementation guide is sold and no carried source states which
 * qualifiers or segments it makes required, so every code and qualifier is
 * carried verbatim and nothing here decides that a code is valid for the guide.
 * A segment this model does not type (SBR, PAT, DMG, the PWK loops, TOO) stays
 * verbatim on the transaction set.
 *
 * **An absent element is `undefined`, never a stand-in.** No date is completed,
 * no code defaulted and no amount read as zero.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

/**
 * A 277 request for additional information read by
 * `get277RequestForAdditionalInformation`: the BHT header and every
 * hierarchical level in document order, each carrying the entities and the
 * claim-level requests sent under it.
 *
 * @example
 * ```ts
 * import { parseX12, get277RequestForAdditionalInformation } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions[0];
 * const rfai = tx === undefined ? undefined : get277RequestForAdditionalInformation(ix.delimiters, tx);
 * rfai?.transactionType; // "request-for-additional-information"
 * rfai?.levels[0]?.requests[0]?.statuses[0]?.codes[0]?.codeListQualifier; // "LOI"
 * ```
 */
export interface X12AdditionalInformationRequest {
  /** Always `"request-for-additional-information"`. Never a claim status label. */
  readonly transactionType: "request-for-additional-information";
  /** ST-03, decoded of any release escape. */
  readonly implementationConventionReference: string | undefined;
  /** The BHT, or `undefined` where the transaction set carries none. */
  readonly header: X12AdditionalInformationRequestHeader | undefined;
  /** Every HL, in document order. Empty where the transaction set carries none. */
  readonly levels: readonly X12AdditionalInformationRequestLevel[];
  /** Every warning raised while reading, anchored at the segment it concerns. */
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * The BHT Beginning of Hierarchical Transaction, every element verbatim.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestHeader } from "@cosyte/x12";
 * declare const h: X12AdditionalInformationRequestHeader;
 * h.referenceId; // BHT-03, as sent
 * ```
 */
export interface X12AdditionalInformationRequestHeader {
  /** BHT-01, hierarchical structure code. */
  readonly hierarchicalStructureCode: string | undefined;
  /** BHT-02, transaction set purpose code. */
  readonly transactionSetPurposeCode: string | undefined;
  /** BHT-03, reference identification. */
  readonly referenceId: string | undefined;
  /** BHT-04, date, as sent. */
  readonly date: string | undefined;
  /** BHT-05, time, as sent. */
  readonly time: string | undefined;
  /** BHT-06, transaction type code. */
  readonly transactionTypeCode: string | undefined;
}

/**
 * One HL hierarchical level, with the NM1 entities of its name loops and the
 * claim-level requests sent under it. The HL elements are verbatim and are
 * never re-numbered or re-parented; which level a code names is the sender's,
 * because no carried source states the guide's level codes.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestLevel } from "@cosyte/x12";
 * declare const level: X12AdditionalInformationRequestLevel;
 * level.levelCode;               // HL-03, as sent
 * level.entities[0]?.idCode;     // NM1-09, as sent
 * level.requests.length;         // claim-level requests under this level
 * ```
 */
export interface X12AdditionalInformationRequestLevel {
  /** HL-01, hierarchical id number. */
  readonly id: string | undefined;
  /** HL-02, hierarchical parent id number. */
  readonly parentId: string | undefined;
  /** HL-03, hierarchical level code. */
  readonly levelCode: string | undefined;
  /** HL-04, hierarchical child code. */
  readonly childCode: string | undefined;
  /** Every NM1 sent under this level before its first claim-level request. */
  readonly entities: readonly X12AdditionalInformationRequestEntity[];
  /** Every claim-level request sent under this level, in document order. */
  readonly requests: readonly X12AdditionalInformationRequestClaim[];
}

/**
 * One NM1 Individual or Organizational Name, the elements a party is named and
 * identified by, verbatim.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestEntity } from "@cosyte/x12";
 * declare const e: X12AdditionalInformationRequestEntity;
 * e.entityIdentifierCode; // NM1-01
 * e.lastOrOrganizationName; // NM1-03
 * ```
 */
export interface X12AdditionalInformationRequestEntity {
  /** NM1-01, entity identifier code. */
  readonly entityIdentifierCode: string | undefined;
  /** NM1-02, entity type qualifier. */
  readonly entityTypeQualifier: string | undefined;
  /** NM1-03, last name or organization name. */
  readonly lastOrOrganizationName: string | undefined;
  /** NM1-04, first name. */
  readonly firstName: string | undefined;
  /** NM1-05, middle name. */
  readonly middleName: string | undefined;
  /** NM1-06, name prefix. */
  readonly namePrefix: string | undefined;
  /** NM1-07, name suffix. */
  readonly nameSuffix: string | undefined;
  /** NM1-08, identification code qualifier. */
  readonly idQualifier: string | undefined;
  /** NM1-09, identification code. */
  readonly idCode: string | undefined;
}

/**
 * One claim-level request (the 2200 loop): the TRN that opens it, and the
 * STC, REF, DTP, QTY and AMT segments and SVC service lines sent under it.
 * A request opened by an STC or SVC with no TRN before it carries an empty
 * `traces` list rather than an invented one.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestClaim } from "@cosyte/x12";
 * declare const r: X12AdditionalInformationRequestClaim;
 * r.references.find((ref) => ref.qualifier === "1K")?.value; // payer claim control number
 * r.statuses[0]?.codes[0]?.statusCode;                        // the requested item's code
 * ```
 */
export interface X12AdditionalInformationRequestClaim {
  /** The TRN that opened this request; empty where an STC or SVC opened it. */
  readonly traces: readonly X12AdditionalInformationRequestTrace[];
  /** Every claim-level STC, in document order. */
  readonly statuses: readonly X12AdditionalInformationRequestStatus[];
  /** Every claim-level REF, in document order. */
  readonly references: readonly X12AdditionalInformationRequestReference[];
  /** Every claim-level DTP, in document order. */
  readonly dates: readonly X12AdditionalInformationRequestDate[];
  /** Every QTY, in document order. */
  readonly quantities: readonly X12AdditionalInformationRequestQuantity[];
  /** Every AMT, in document order. */
  readonly amounts: readonly X12AdditionalInformationRequestAmount[];
  /** Every SVC service line, in document order. */
  readonly serviceLines: readonly X12AdditionalInformationRequestServiceLine[];
}

/**
 * One TRN Trace, verbatim.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestTrace } from "@cosyte/x12";
 * declare const t: X12AdditionalInformationRequestTrace;
 * t.referenceId; // TRN-02
 * ```
 */
export interface X12AdditionalInformationRequestTrace {
  /** TRN-01, trace type code. */
  readonly traceTypeCode: string | undefined;
  /** TRN-02, reference identification. */
  readonly referenceId: string | undefined;
  /** TRN-03, originating company identifier. */
  readonly originatingCompanyId: string | undefined;
  /** TRN-04, supplemental reference identification. */
  readonly supplementalReferenceId: string | undefined;
}

/**
 * One STC Status Information segment: its up to three C043 composites
 * (STC-01, STC-10, STC-11) and its other elements, verbatim.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestStatus } from "@cosyte/x12";
 * declare const s: X12AdditionalInformationRequestStatus;
 * s.codes[0]?.categoryCode; // C043-01 of STC-01
 * s.totalChargeAmount?.toString(); // STC-04, exact
 * ```
 */
export interface X12AdditionalInformationRequestStatus {
  /** The C043 composites present, STC-01 first, then STC-10 and STC-11. */
  readonly codes: readonly X12AdditionalInformationRequestStatusCode[];
  /** STC-02, the status effective date, as sent. */
  readonly statusEffectiveDate: string | undefined;
  /** STC-03, action code. */
  readonly actionCode: string | undefined;
  /** STC-04, total charge amount. */
  readonly totalChargeAmount: X12Decimal | undefined;
  /** STC-05, amount paid. */
  readonly paymentAmount: X12Decimal | undefined;
  /** STC-06, paid date, as sent. */
  readonly paymentDate: string | undefined;
  /** STC-07, payment method code. */
  readonly paymentMethodCode: string | undefined;
  /** STC-08, check issue date, as sent. */
  readonly checkIssueDate: string | undefined;
  /** STC-09, check number. */
  readonly checkNumber: string | undefined;
  /** STC-12, free-form message text. */
  readonly message: string | undefined;
}

/**
 * One C043 Health Care Claim Status composite, all four components verbatim.
 *
 * C043-04 names the code source of C043-02. Where it is non-empty, C043-02 is a
 * code from that source (a LOINC code naming the attachment requested, say) and
 * is NOT looked up in the claim status code list, so `statusDescription` is
 * `undefined` and no unknown-claim-status warning is raised for it. Where it is
 * empty, C043-02 is a claim status code and is described from the bundled list
 * when the list has it. C043-01 is always a claim status category code.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestStatusCode } from "@cosyte/x12";
 * declare const c: X12AdditionalInformationRequestStatusCode;
 * c.codeListQualifier; // "LOI" where C043-02 is a LOINC code
 * c.statusDescription; // undefined whenever codeListQualifier is present
 * ```
 */
export interface X12AdditionalInformationRequestStatusCode {
  /** C043-01, the claim status category code. */
  readonly categoryCode: string | undefined;
  /** The bundled description of C043-01, where the list has it. */
  readonly categoryDescription: string | undefined;
  /** C043-02, a code from the source C043-04 names, or a claim status code. */
  readonly statusCode: string | undefined;
  /** The claim status description of C043-02; only where C043-04 is empty. */
  readonly statusDescription: string | undefined;
  /** C043-03, entity identifier code. */
  readonly entityCode: string | undefined;
  /** C043-04, the code list qualifier naming the source of C043-02. */
  readonly codeListQualifier: string | undefined;
}

/**
 * One REF Reference Information, verbatim. A REF short of either element is
 * still carried, with the absent one `undefined`.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestReference } from "@cosyte/x12";
 * declare const r: X12AdditionalInformationRequestReference;
 * r.qualifier; // REF-01
 * r.value;     // REF-02
 * ```
 */
export interface X12AdditionalInformationRequestReference {
  /** REF-01, reference identification qualifier. */
  readonly qualifier: string | undefined;
  /** REF-02, reference identification. */
  readonly value: string | undefined;
  /** REF-03, description. */
  readonly description: string | undefined;
}

/**
 * One DTP date or period, verbatim: the value keeps exactly the precision and
 * format the sender stated, and the format qualifier that says which is carried
 * beside it. A partial date is never completed.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestDate } from "@cosyte/x12";
 * declare const d: X12AdditionalInformationRequestDate;
 * d.formatQualifier; // "RD8"
 * d.value;           // "20260501-20260502"
 * ```
 */
export interface X12AdditionalInformationRequestDate {
  /** DTP-01, date or time qualifier. */
  readonly qualifier: string | undefined;
  /** DTP-02, date time period format qualifier. */
  readonly formatQualifier: string | undefined;
  /** DTP-03, the date or period, as sent. */
  readonly value: string | undefined;
}

/**
 * One QTY Quantity Information, the quantity exact.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestQuantity } from "@cosyte/x12";
 * declare const q: X12AdditionalInformationRequestQuantity;
 * q.quantity?.toString(); // QTY-02, exact
 * ```
 */
export interface X12AdditionalInformationRequestQuantity {
  /** QTY-01, quantity qualifier. */
  readonly qualifier: string | undefined;
  /** QTY-02, the quantity; `undefined` where absent or not a decimal. */
  readonly quantity: X12Decimal | undefined;
}

/**
 * One AMT Monetary Amount Information, the amount exact.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestAmount } from "@cosyte/x12";
 * declare const a: X12AdditionalInformationRequestAmount;
 * a.amount?.toString(); // AMT-02, exact
 * ```
 */
export interface X12AdditionalInformationRequestAmount {
  /** AMT-01, amount qualifier code. */
  readonly qualifier: string | undefined;
  /** AMT-02, the amount; `undefined` where absent or not a decimal. */
  readonly amount: X12Decimal | undefined;
}

/**
 * One SVC service line (the 2220 loop) and the STC, REF and DTP segments sent
 * under it.
 *
 * @example
 * ```ts
 * import type { X12AdditionalInformationRequestServiceLine } from "@cosyte/x12";
 * declare const l: X12AdditionalInformationRequestServiceLine;
 * l.procedureCode;                // SVC-01-2
 * l.lineChargeAmount?.toString(); // SVC-02, exact
 * ```
 */
export interface X12AdditionalInformationRequestServiceLine {
  /** SVC-01-1, product or service id qualifier. */
  readonly serviceIdQualifier: string | undefined;
  /** SVC-01-2, the procedure or service code. */
  readonly procedureCode: string | undefined;
  /** SVC-01-3 to SVC-01-6, the modifiers present, in order. */
  readonly modifiers: readonly string[];
  /** SVC-02, line charge amount. */
  readonly lineChargeAmount: X12Decimal | undefined;
  /** SVC-03, line payment amount. */
  readonly linePaymentAmount: X12Decimal | undefined;
  /** SVC-04, revenue code. */
  readonly revenueCode: string | undefined;
  /** SVC-05, quantity. */
  readonly quantity: X12Decimal | undefined;
  /** SVC-07, original units of service count. */
  readonly unitsOfService: X12Decimal | undefined;
  /** Every STC sent under this line. */
  readonly statuses: readonly X12AdditionalInformationRequestStatus[];
  /** Every REF sent under this line. */
  readonly references: readonly X12AdditionalInformationRequestReference[];
  /** Every DTP sent under this line. */
  readonly dates: readonly X12AdditionalInformationRequestDate[];
}

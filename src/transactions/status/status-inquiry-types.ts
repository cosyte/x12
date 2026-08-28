/**
 * Typed model for an X12 005010X212 276 Health Care Claim Status Request - the
 * REQUEST half of the pair whose response half is
 * {@link "./types.js".X12ClaimStatusResponse}. The shape is the public contract
 * of {@link "./get-276.js".get276StatusInquiry}: adding fields is
 * backward-compatible, renaming fields is breaking.
 *
 * **The hierarchy is nested here, and on the response model it is flat.** A 276
 * is read to find out what was asked and of whom, so the parent-child
 * relationship the sender transmitted is the model: an information source
 * carries its receivers, a receiver carries its service providers, a provider
 * carries its subscribers, a subscriber carries its dependents.
 * `get277Status` flattens the same spine onto a claim list with its enclosing
 * payer, receiver and provider copied on, because a response is read
 * claim-first. Both keep every declared HL verbatim on `hierarchies`.
 *
 * **A level attaches where its own HL-02 says, and nowhere else.** This reader
 * never re-parents a level onto whichever one happened to be open and never
 * re-numbers a pointer: a level whose declared parent does not resolve is
 * reported and left off the tree rather than attached somewhere plausible. See
 * {@link "./get-276.js".get276StatusInquiry} for the rule and the codes.
 *
 * Every value below is the transmitted bytes of its element or component,
 * post-`?`-unescape and otherwise unchanged: no case folding, no trim, no
 * padding, no code-list substitution and no default. A composite is exposed as
 * its separated components and never as one joined string, so two documents
 * differing only in their declared delimiters decode to equal models.
 *
 * Spec source: WPC TR3 `005010X212` - Health Care Claim Status Request and
 * Response (276/277). Segment-level references in JSDoc are 1-indexed against
 * that TR3.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
import type { X12Hl } from "../shared/hl.js";

/**
 * Top-level result of {@link "./get-276.js".get276StatusInquiry}. Carries the
 * transaction header, the information-source roots of the transmitted
 * hierarchy, every declared HL verbatim, and every warning raised while
 * walking.
 *
 * @example
 * ```ts
 * import { parseX12, get276StatusInquiry } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "276");
 * if (tx !== undefined) {
 *   const inquiry = get276StatusInquiry(ix.delimiters, tx);
 *   const sub =
 *     inquiry?.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
 *   sub?.claims[0]?.trace?.referenceId; // the trace a 277 echoes back
 * }
 * ```
 */
export interface X12StatusInquiry {
  readonly header: X12StatusInquiryHeader | undefined;
  readonly informationSources: readonly X12StatusInquirySource[];
  readonly hierarchies: readonly X12Hl[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * The BHT beginning-of-hierarchical-transaction header. `purposeCode` (BHT-02)
 * is `13` on a request; `referenceId` (BHT-03) is the submitter's own
 * identifier for the request.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryHeader } from "@cosyte/x12";
 * declare const h: X12StatusInquiryHeader;
 * h.hierarchicalStructureCode; // "0010"
 * h.purposeCode;               // "13"
 * ```
 */
export interface X12StatusInquiryHeader {
  /** BHT-01 - hierarchical structure code. */
  readonly hierarchicalStructureCode: string;
  /** BHT-02 - transaction set purpose code. */
  readonly purposeCode: string;
  /** BHT-03 - submitter transaction identifier. */
  readonly referenceId: string | undefined;
  /** BHT-04 - transaction creation date, CCYYMMDD. */
  readonly date: string | undefined;
  /** BHT-05 - transaction creation time. */
  readonly time: string | undefined;
}

/**
 * One information source (Loop 2000A / 2100A) - the payer the request is put
 * to. The root of a transmitted hierarchy: HL-03 is `20` and HL-02 is absent.
 *
 * @example
 * ```ts
 * import type { X12StatusInquirySource } from "@cosyte/x12";
 * declare const s: X12StatusInquirySource;
 * s.name?.lastNameOrOrganizationName; // "MEDPAY INSURANCE"
 * s.receivers.length;                 // 1
 * ```
 */
export interface X12StatusInquirySource {
  readonly hierarchy: X12Hl;
  readonly name: X12StatusInquiryName | undefined;
  readonly receivers: readonly X12StatusInquiryReceiver[];
}

/**
 * One information receiver (Loop 2000B / 2100B) - the party the answer goes
 * back to. HL-03 is `21` and its HL-02 names an information source.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryReceiver } from "@cosyte/x12";
 * declare const r: X12StatusInquiryReceiver;
 * r.name?.idCode;      // the receiver's identifier
 * r.providers.length;  // 1
 * ```
 */
export interface X12StatusInquiryReceiver {
  readonly hierarchy: X12Hl;
  readonly name: X12StatusInquiryName | undefined;
  readonly providers: readonly X12StatusInquiryProvider[];
}

/**
 * One service provider (Loop 2000C / 2100C) - the provider whose claim is being
 * asked about. HL-03 is `19` and its HL-02 names an information receiver. This
 * level is the one the 270's spine does NOT have, and it is why the claim-status
 * pair carries five levels where the eligibility pair carries four.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryProvider } from "@cosyte/x12";
 * declare const p: X12StatusInquiryProvider;
 * p.name?.idCode;        // the provider's NPI as transmitted
 * p.subscribers.length;  // 1
 * ```
 */
export interface X12StatusInquiryProvider {
  readonly hierarchy: X12Hl;
  readonly name: X12StatusInquiryName | undefined;
  readonly subscribers: readonly X12StatusInquirySubscriber[];
}

/**
 * One subscriber (Loop 2000D / 2100D / 2200D) - the member the claim was filed
 * under, or the member a dependent hangs under. HL-03 is `22`.
 *
 * @example
 * ```ts
 * import type { X12StatusInquirySubscriber } from "@cosyte/x12";
 * declare const s: X12StatusInquirySubscriber;
 * s.name?.idCode;                 // member identifier as transmitted
 * s.claims[0]?.trace?.referenceId; // the trace a 277 echoes back
 * s.dependents.length;            // 0
 * ```
 */
export interface X12StatusInquirySubscriber {
  readonly hierarchy: X12Hl;
  readonly name: X12StatusInquiryName | undefined;
  readonly claims: readonly X12StatusInquiryClaim[];
  readonly dependents: readonly X12StatusInquiryDependent[];
}

/**
 * One dependent (Loop 2000E / 2100E / 2200E) - a patient who cannot be
 * identified as a subscriber in their own right. HL-03 is `23`. Carries its OWN
 * name, demographics and claims and is never merged onto the subscriber it
 * hangs under.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryDependent } from "@cosyte/x12";
 * declare const d: X12StatusInquiryDependent;
 * d.name?.firstName; // "BABY"
 * d.claims.length;   // the dependent's own claims
 * ```
 */
export interface X12StatusInquiryDependent {
  readonly hierarchy: X12Hl;
  readonly name: X12StatusInquiryName | undefined;
  readonly claims: readonly X12StatusInquiryClaim[];
}

/**
 * An NM1 name loop, plus the DMG demographics that follow it. ONE type covers
 * every level, because NM1 is one segment: NM1-03 is "name last or organization
 * name", so a payer fills it and a member fills it, and splitting the type by
 * level would mean this reader deciding which kind of party a level holds.
 * `entityTypeQualifier` (NM1-02) is the sender's own statement of that (`1`
 * person, `2` non-person) and is preserved verbatim.
 *
 * **No postal address is surfaced here, deliberately.** The response reader
 * beside this one surfaces none either, so the two directions of this family
 * agree; an N3 or N4 a sender transmits stays verbatim on `tx.segments`.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryName } from "@cosyte/x12";
 * declare const n: X12StatusInquiryName;
 * n.entityIdentifierCode;       // "IL" subscriber / "PR" payer / "1P" provider
 * n.lastNameOrOrganizationName; // "DOE" or "MEDPAY INSURANCE"
 * n.dateOfBirth;                // "19850515" (DMG-02, CCYYMMDD)
 * ```
 */
export interface X12StatusInquiryName {
  /** NM1-01 - entity identifier code. */
  readonly entityIdentifierCode: string;
  /** NM1-02 - entity type qualifier (`1` person, `2` non-person). */
  readonly entityTypeQualifier: string;
  /** NM1-03 - last name, or the organization name for a non-person. */
  readonly lastNameOrOrganizationName: string | undefined;
  /** NM1-04 - first name. */
  readonly firstName: string | undefined;
  /** NM1-05 - middle name. */
  readonly middleName: string | undefined;
  /** NM1-07 - name suffix. */
  readonly suffix: string | undefined;
  /** NM1-08 - identification code qualifier. */
  readonly idQualifier: string | undefined;
  /** NM1-09 - identification code. */
  readonly idCode: string | undefined;
  /** DMG-02 - date of birth. */
  readonly dateOfBirth: string | undefined;
  /** DMG-03 - gender code. */
  readonly genderCode: string | undefined;
}

/**
 * One claim the submitter is asking about (Loop 2200D / 2200E), opened by the
 * TRN that carries its trace. Carries the identifiers, submitted amounts, dates
 * and service lines transmitted under that trace.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryClaim } from "@cosyte/x12";
 * declare const c: X12StatusInquiryClaim;
 * c.trace?.referenceId;       // "STATUS20260601001"
 * c.references[0]?.qualifier; // "1K" (payer claim control number)
 * c.serviceLines.length;      // 1
 * ```
 */
export interface X12StatusInquiryClaim {
  /** TRN - the trace the answering 277 echoes back verbatim. */
  readonly trace: X12StatusInquiryTrace | undefined;
  /** REF identifiers transmitted under this claim. */
  readonly references: readonly X12StatusInquiryReference[];
  /** AMT amount rows transmitted under this claim. */
  readonly amounts: readonly X12StatusInquiryAmount[];
  /** DTP date rows transmitted under this claim. */
  readonly dates: readonly X12StatusInquiryDate[];
  /** Loop 2210 service lines transmitted under this claim. */
  readonly serviceLines: readonly X12StatusInquiryServiceLine[];
}

/**
 * A reassociation trace (TRN) transmitted with the request. **TRN-02 is the
 * value the answering 277 must echo verbatim**, which is what lets the
 * submitter match the answer to this question.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryTrace } from "@cosyte/x12";
 * declare const t: X12StatusInquiryTrace;
 * t.traceTypeCode; // "1" (current transaction trace numbers)
 * t.referenceId;   // "STATUS20260601001"
 * ```
 */
export interface X12StatusInquiryTrace {
  /** TRN-01 - trace type code. */
  readonly traceTypeCode: string;
  /** TRN-02 - the trace number a 277 echoes back. */
  readonly referenceId: string;
  /** TRN-03 - originating company identifier. */
  readonly originatingCompanyId: string | undefined;
  /** TRN-04 - supplemental reference identifier. */
  readonly supplementalReferenceId: string | undefined;
}

/**
 * A REF supplemental identifier on a claim or on a service line (e.g. `REF*1K`
 * payer claim control number, `REF*BLT` bill type, `REF*FJ` line item control
 * number).
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryReference } from "@cosyte/x12";
 * declare const r: X12StatusInquiryReference;
 * r.qualifier; // "1K"
 * r.value;     // "PCN0001"
 * ```
 */
export interface X12StatusInquiryReference {
  /** REF-01 - reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 - reference identification. */
  readonly value: string;
  /** REF-03 - description. */
  readonly description: string | undefined;
}

/**
 * An AMT amount row on a claim (e.g. `AMT*T3` total submitted charges). A row
 * and not a slot: an AMT reaching the reader with no decodable amount builds no
 * row at all and reports the loss, so an empty `amounts` list can be told apart
 * from an amount this reader could build no row from.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryAmount } from "@cosyte/x12";
 * declare const a: X12StatusInquiryAmount;
 * a.qualifier;          // "T3"
 * a.amount.toString();  // "150.00"
 * ```
 */
export interface X12StatusInquiryAmount {
  /** AMT-01 - amount qualifier code. */
  readonly qualifier: string;
  /** AMT-02 - the monetary amount, NEVER a JavaScript `number`. */
  readonly amount: X12Decimal;
}

/**
 * A DTP date or date range on a claim or a service line. `formatQualifier`
 * (DTP-02) is the element that says WHICH: `D8` is a single `CCYYMMDD` date and
 * `RD8` a `CCYYMMDD-CCYYMMDD` range. It is preserved verbatim beside the value,
 * so a consumer never has to infer which one a `value` holds.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryDate } from "@cosyte/x12";
 * declare const d: X12StatusInquiryDate;
 * d.qualifier;       // "472" (service date)
 * d.formatQualifier; // "D8" or "RD8"
 * d.value;           // "20260520"
 * ```
 */
export interface X12StatusInquiryDate {
  /** DTP-01 - date/time qualifier. */
  readonly qualifier: string;
  /** DTP-02 - date/time period format qualifier (`D8` single, `RD8` range). */
  readonly formatQualifier: string;
  /** DTP-03 - the date or range, in the DTP-02 format. */
  readonly value: string;
}

/**
 * One service line the request asks about (Loop 2210), opened by an SVC.
 *
 * **Which SVC elements this reader surfaces is a property of the READ, stated
 * as one.** It surfaces SVC-01 as its separated components, SVC-02 as the line
 * charge, SVC-04 as the revenue code and SVC-07 as the units of service count -
 * the same four the 277 reader beside it surfaces for the same segment. SVC-03,
 * SVC-05 and SVC-06 are left unread: this is the REQUEST direction, where a
 * submitter states what it billed rather than what was paid, and a slot named
 * for a payment on a question nobody has answered yet would invite a consumer to
 * read one. A sender that transmits them keeps them verbatim on `tx.segments`.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryServiceLine } from "@cosyte/x12";
 * declare const l: X12StatusInquiryServiceLine;
 * l.procedure?.code;              // "99213"
 * l.lineChargeAmount?.toString(); // "150.00"
 * l.unitsOfService?.toString();   // "1"
 * ```
 */
export interface X12StatusInquiryServiceLine {
  /** SVC-01 - the billed procedure, as its separated components. */
  readonly procedure: X12StatusInquiryProcedure | undefined;
  /** SVC-02 - line item charge amount. */
  readonly lineChargeAmount: X12Decimal | undefined;
  /** SVC-04 - revenue code. */
  readonly revenueCode: string | undefined;
  /** SVC-07 - units of service count. */
  readonly unitsOfService: X12Decimal | undefined;
  /** REF identifiers transmitted under this service line. */
  readonly references: readonly X12StatusInquiryReference[];
  /** DTP date rows transmitted under this service line. */
  readonly dates: readonly X12StatusInquiryDate[];
}

/**
 * The SVC-01 composite medical procedure identifier, exposed as its SEPARATED
 * components. It is never handed back as one joined string: the component
 * separator is framing, so joining it into a value would make two documents that
 * differ only in their declared delimiters decode to different models.
 *
 * @example
 * ```ts
 * import type { X12StatusInquiryProcedure } from "@cosyte/x12";
 * declare const p: X12StatusInquiryProcedure;
 * p.qualifier;    // "HC" (SVC-01-1, product/service id qualifier)
 * p.code;         // "99213" (SVC-01-2)
 * p.modifiers[0]; // "25" (SVC-01-3 onward)
 * ```
 */
export interface X12StatusInquiryProcedure {
  /** SVC-01-1 - product or service id qualifier. */
  readonly qualifier: string;
  /** SVC-01-2 - the procedure code. */
  readonly code: string | undefined;
  /** SVC-01-3 through SVC-01-6 - procedure modifiers, in transmitted order. */
  readonly modifiers: readonly string[];
  /** SVC-01-7 - procedure description. */
  readonly description: string | undefined;
}

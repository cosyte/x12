/**
 * Typed model for an X12 005010X279A1 270 Health Care Eligibility Benefit
 * Inquiry - the REQUEST half of the pair whose response half is
 * {@link "./types.js".X12Eligibility}. The shape is the public contract of
 * {@link "./get-270.js".get270Inquiry}: adding fields is backward-compatible,
 * renaming fields is breaking.
 *
 * **The hierarchy is nested here, and on the response model it is flat.**
 * A 270 is read to find out what was asked and of whom, so the parent-child
 * relationship the sender transmitted is the model: an information source
 * carries its receivers, a receiver carries its subscribers, a subscriber
 * carries its dependents. `get271Eligibility` flattens the same tree onto a
 * subscriber list with its enclosing payer and provider copied on, because a
 * response is read benefit-first. Both keep every declared HL verbatim on
 * `hierarchies`.
 *
 * **A level attaches where its own HL-02 says, and nowhere else.** This
 * reader never re-parents a level onto whichever one happened to be open and
 * never re-numbers a pointer: a level whose declared parent does not resolve
 * is reported and left off the tree rather than attached somewhere plausible.
 * See {@link "./get-270.js".get270Inquiry} for the rule and the codes.
 *
 * Every value below is the transmitted bytes of its element or component,
 * post-`?`-unescape and otherwise unchanged: no case folding, no trim, no
 * padding, no code-list substitution and no default. A composite is exposed as
 * its separated components and never as one joined string, so two documents
 * differing only in their declared delimiters decode to equal models.
 *
 * Spec source: WPC TR3 `005010X279A1` - Health Care Eligibility Benefit
 * Inquiry and Response (270/271). Segment-level references in JSDoc are
 * 1-indexed against that TR3.
 */

import type { X12ParseWarning } from "../../parser/warnings.js";
import type { X12Hl } from "../shared/hl.js";

/**
 * Top-level result of {@link "./get-270.js".get270Inquiry}. Carries the
 * transaction header, the information-source roots of the transmitted
 * hierarchy, every declared HL verbatim, and every warning raised while
 * walking.
 *
 * @example
 * ```ts
 * import { parseX12, get270Inquiry } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "270");
 * if (tx !== undefined) {
 *   const inquiry = get270Inquiry(ix.delimiters, tx);
 *   const sub = inquiry?.informationSources[0]?.receivers[0]?.subscribers[0];
 *   sub?.traces[0]?.referenceId;                    // trace the provider sent
 *   sub?.inquiries[0]?.serviceTypeCodes[0]?.code;   // "30"
 * }
 * ```
 */
export interface X12Inquiry {
  readonly header: X12InquiryHeader | undefined;
  readonly informationSources: readonly X12InquirySource[];
  readonly hierarchies: readonly X12Hl[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * The BHT beginning-of-hierarchical-transaction header. `purposeCode`
 * (BHT-02) is `13` on a request; `referenceId` (BHT-03) is the submitter's
 * own identifier for the inquiry.
 *
 * @example
 * ```ts
 * import type { X12InquiryHeader } from "@cosyte/x12";
 * declare const h: X12InquiryHeader;
 * h.hierarchicalStructureCode; // "0022"
 * h.purposeCode;               // "13"
 * ```
 */
export interface X12InquiryHeader {
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
 * One information source (Loop 2000A / 2100A) - the payer the inquiry is put
 * to. The root of a transmitted hierarchy: HL-03 is `20` and HL-02 is absent.
 *
 * @example
 * ```ts
 * import type { X12InquirySource } from "@cosyte/x12";
 * declare const s: X12InquirySource;
 * s.name?.lastNameOrOrganizationName; // "MEDPAY INSURANCE"
 * s.receivers.length;                 // 1
 * ```
 */
export interface X12InquirySource {
  readonly hierarchy: X12Hl;
  readonly name: X12InquiryName | undefined;
  readonly references: readonly X12InquiryReference[];
  readonly receivers: readonly X12InquiryReceiver[];
}

/**
 * One information receiver (Loop 2000B / 2100B) - the provider asking. HL-03
 * is `21` and its HL-02 names an information source.
 *
 * @example
 * ```ts
 * import type { X12InquiryReceiver } from "@cosyte/x12";
 * declare const r: X12InquiryReceiver;
 * r.name?.idCode;        // the asking provider's identifier
 * r.subscribers.length;  // 1
 * ```
 */
export interface X12InquiryReceiver {
  readonly hierarchy: X12Hl;
  readonly name: X12InquiryName | undefined;
  readonly references: readonly X12InquiryReference[];
  readonly subscribers: readonly X12InquirySubscriber[];
}

/**
 * One subscriber (Loop 2000C / 2100C / 2110C) - the member the inquiry is
 * about, or the member a dependent hangs under. HL-03 is `22`.
 *
 * @example
 * ```ts
 * import type { X12InquirySubscriber } from "@cosyte/x12";
 * declare const s: X12InquirySubscriber;
 * s.name?.idCode;                        // member identifier as transmitted
 * s.inquiries[0]?.serviceTypeCodes[0];   // requested service type
 * s.dependents.length;                   // 0
 * ```
 */
export interface X12InquirySubscriber {
  readonly hierarchy: X12Hl;
  readonly traces: readonly X12InquiryTrace[];
  readonly name: X12InquiryName | undefined;
  readonly references: readonly X12InquiryReference[];
  readonly dates: readonly X12InquiryDate[];
  readonly inquiries: readonly X12InquiryRequest[];
  readonly dependents: readonly X12InquiryDependent[];
}

/**
 * One dependent (Loop 2000D / 2100D / 2110D) - a patient who cannot be
 * identified as a subscriber in their own right. HL-03 is `23`. Carries its
 * OWN traces and inquiries and is never merged onto the subscriber it hangs
 * under.
 *
 * @example
 * ```ts
 * import type { X12InquiryDependent } from "@cosyte/x12";
 * declare const d: X12InquiryDependent;
 * d.name?.firstName;    // "BABY"
 * d.inquiries.length;   // the dependent's own requested service types
 * ```
 */
export interface X12InquiryDependent {
  readonly hierarchy: X12Hl;
  readonly traces: readonly X12InquiryTrace[];
  readonly name: X12InquiryName | undefined;
  readonly references: readonly X12InquiryReference[];
  readonly dates: readonly X12InquiryDate[];
  readonly inquiries: readonly X12InquiryRequest[];
}

/**
 * An NM1 name loop, plus the N3 / N4 address and DMG demographics that follow
 * it. ONE type covers every level, because NM1 is one segment: NM1-03 is
 * "name last or organization name", so a payer fills it and a member fills it,
 * and splitting the type by level would mean this reader deciding which kind
 * of party a level holds. `entityTypeQualifier` (NM1-02) is the sender's own
 * statement of that (`1` person, `2` non-person) and is preserved verbatim.
 *
 * @example
 * ```ts
 * import type { X12InquiryName } from "@cosyte/x12";
 * declare const n: X12InquiryName;
 * n.entityIdentifierCode;          // "IL" subscriber / "PR" payer / "1P" provider
 * n.lastNameOrOrganizationName;    // "DOE" or "MEDPAY INSURANCE"
 * n.dateOfBirth;                   // "19850515" (DMG-02, CCYYMMDD)
 * ```
 */
export interface X12InquiryName {
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
  /** N3 + N4 postal address, absent when the level transmitted neither. */
  readonly address: X12InquiryAddress | undefined;
  /** DMG-02 - date of birth. */
  readonly dateOfBirth: string | undefined;
  /** DMG-03 - gender code. */
  readonly genderCode: string | undefined;
}

/**
 * A postal address (N3 + N4) attached to a name loop.
 *
 * @example
 * ```ts
 * import type { X12InquiryAddress } from "@cosyte/x12";
 * declare const a: X12InquiryAddress;
 * a.lines[0];   // "100 MAIN ST"
 * a.postalCode; // "43215"
 * ```
 */
export interface X12InquiryAddress {
  readonly lines: readonly string[];
  readonly city: string | undefined;
  readonly state: string | undefined;
  readonly postalCode: string | undefined;
  readonly countryCode: string | undefined;
}

/**
 * A reassociation trace (TRN) transmitted with the inquiry. **TRN-02 is the
 * value the answering 271 must echo verbatim**, which is what lets the
 * provider match the answer to this question.
 *
 * @example
 * ```ts
 * import type { X12InquiryTrace } from "@cosyte/x12";
 * declare const t: X12InquiryTrace;
 * t.traceTypeCode; // "1" (current transaction trace numbers)
 * t.referenceId;   // "ELIG20260601001"
 * ```
 */
export interface X12InquiryTrace {
  /** TRN-01 - trace type code. */
  readonly traceTypeCode: string;
  /** TRN-02 - the trace number a 271 echoes back. */
  readonly referenceId: string;
  /** TRN-03 - originating company identifier. */
  readonly originatingCompanyId: string | undefined;
  /** TRN-04 - supplemental reference identifier. */
  readonly supplementalReferenceId: string | undefined;
}

/**
 * A REF supplemental identifier on a level or on an inquiry.
 *
 * @example
 * ```ts
 * import type { X12InquiryReference } from "@cosyte/x12";
 * declare const r: X12InquiryReference;
 * r.qualifier; // "6P" (group number)
 * r.value;     // "GROUP0001"
 * ```
 */
export interface X12InquiryReference {
  /** REF-01 - reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 - reference identification. */
  readonly value: string;
  /** REF-03 - description. */
  readonly description: string | undefined;
}

/**
 * A DTP date or date range. `formatQualifier` (DTP-02) is the element that
 * says WHICH: `D8` is a single `CCYYMMDD` date and `RD8` a
 * `CCYYMMDD-CCYYMMDD` range. It is preserved verbatim beside the value, so a
 * consumer never has to infer which one a `value` holds.
 *
 * @example
 * ```ts
 * import type { X12InquiryDate } from "@cosyte/x12";
 * declare const d: X12InquiryDate;
 * d.qualifier;       // "291" (plan) / "307" (eligibility)
 * d.formatQualifier; // "D8" or "RD8"
 * d.value;           // "20260601"
 * ```
 */
export interface X12InquiryDate {
  /** DTP-01 - date/time qualifier. */
  readonly qualifier: string;
  /** DTP-02 - date/time period format qualifier (`D8` single, `RD8` range). */
  readonly formatQualifier: string;
  /** DTP-03 - the date or range, in the DTP-02 format. */
  readonly value: string;
}

/**
 * One eligibility or benefit inquiry (`EQ`, Loop 2110C / 2110D) - a single
 * thing the provider asked about, with the REF identifiers and DTP dates
 * transmitted under it.
 *
 * @example
 * ```ts
 * import type { X12InquiryRequest } from "@cosyte/x12";
 * declare const q: X12InquiryRequest;
 * q.serviceTypeCodes[0]?.code;        // "30"
 * q.serviceTypeCodes[0]?.description; // "Health Benefit Plan Coverage"
 * q.coverageLevelCode;                // "IND"
 * ```
 */
export interface X12InquiryRequest {
  /** EQ-01 - one or more requested Service Type Codes (a repeating element). */
  readonly serviceTypeCodes: readonly X12InquiryServiceType[];
  /** EQ-02 - the requested procedure, as its separated components. */
  readonly procedure: X12InquiryProcedure | undefined;
  /** EQ-03 - coverage level code. */
  readonly coverageLevelCode: string | undefined;
  /** EQ-04 - insurance type code. */
  readonly insuranceTypeCode: string | undefined;
  /** EQ-05 - diagnosis code pointers, as separated components. */
  readonly diagnosisCodePointers: readonly string[];
  /** REF identifiers transmitted under this inquiry. */
  readonly references: readonly X12InquiryReference[];
  /** DTP dates transmitted under this inquiry. */
  readonly dates: readonly X12InquiryDate[];
}

/**
 * A requested Service Type Code (EQ-01, X12 external code source 1365). The
 * verbatim `code` is ALWAYS preserved; `description` resolves from the
 * bundled snapshot the 271 reader already consumes, and is `undefined`
 * outside it. The code is never replaced by its description.
 *
 * @example
 * ```ts
 * import type { X12InquiryServiceType } from "@cosyte/x12";
 * declare const st: X12InquiryServiceType;
 * st.code;        // "30"
 * st.description; // "Health Benefit Plan Coverage"
 * ```
 */
export interface X12InquiryServiceType {
  readonly code: string;
  readonly description: string | undefined;
}

/**
 * The EQ-02 composite medical procedure identifier, exposed as its SEPARATED
 * components. It is never handed back as one joined string: the component
 * separator is framing, so joining it into a value would make two documents
 * that differ only in their declared delimiters decode to different models.
 *
 * @example
 * ```ts
 * import type { X12InquiryProcedure } from "@cosyte/x12";
 * declare const p: X12InquiryProcedure;
 * p.qualifier;    // "HC" (EQ-02-1, product/service id qualifier)
 * p.code;         // "99213" (EQ-02-2)
 * p.modifiers[0]; // "25" (EQ-02-3 onward)
 * ```
 */
export interface X12InquiryProcedure {
  /** EQ-02-1 - product or service id qualifier. */
  readonly qualifier: string;
  /** EQ-02-2 - the procedure code. */
  readonly code: string | undefined;
  /** EQ-02-3 through EQ-02-6 - procedure modifiers, in transmitted order. */
  readonly modifiers: readonly string[];
  /** EQ-02-7 - procedure description. */
  readonly description: string | undefined;
}

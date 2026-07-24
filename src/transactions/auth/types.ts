/**
 * Typed model for the X12 278 Health Care Services Review - Request for
 * Review (TR3 `005010X217`) and Response (TR3 `005010X216`). Both directions
 * share one structural shape: {@link X12ServicesReview} is returned by both
 * {@link "./get-278.js".get278Request} and {@link
 * "./get-278.js".get278Response}; `direction` records which entry point
 * produced it. The leniently-walked HL tree (UMO → requester → subscriber →
 * dependent → patient-event → service) hangs the per-event review items off
 * {@link X12ServicesReview.reviews}.
 *
 * **The certification decision is the safety-critical surface of a 278
 * response.** `HCR-01` (action code: `A1` certified, `A3` not certified,
 * `A4` pended, `A6` modified, …) is captured verbatim onto
 * {@link X12ReviewDecision} - the parser NEVER infers a certification
 * outcome and NEVER normalizes the code. A request echoes its `TRN` trace so
 * the response can be re-associated, exactly as 270/271 and 276/277 do.
 *
 * Spec sources: WPC TR3 `005010X217` (request) / `005010X216` (response).
 * Segment-level references in JSDoc are 1-indexed against those TR3s.
 */

import type { X12HiCodeSystem } from "../../code-lists/hi-qualifiers.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
import type { X12Hl } from "../shared/hl.js";

/**
 * Top-level result of {@link "./get-278.js".get278Request} /
 * {@link "./get-278.js".get278Response}. Carries the BHT header, the four
 * named HL parties (UMO, requester, subscriber, dependent) resolved from the
 * hierarchy, every per-event / per-service review item, the verbatim HL
 * tree, and the warnings surfaced during the walk.
 *
 * @example
 * ```ts
 * import { parseX12, get278Response } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
 * if (tx !== undefined) {
 *   const review = get278Response(ix.delimiters, tx);
 *   review?.reviews[0]?.decision?.actionCode; // "A1" (certified)
 * }
 * ```
 */
export interface X12ServicesReview {
  readonly direction: "request" | "response";
  readonly implementationConventionReference: string | undefined;
  readonly header: X12AuthHeader;
  readonly utilizationManagementOrganization: X12AuthEntity | undefined;
  readonly requester: X12AuthEntity | undefined;
  readonly subscriber: X12AuthMember | undefined;
  readonly dependent: X12AuthMember | undefined;
  readonly reviews: readonly X12ServiceReview[];
  readonly hierarchies: readonly X12Hl[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * The BHT beginning-of-hierarchical-transaction header. `purposeCode`
 * (BHT-02) is `00` (original) / `18` (reissue); `transactionTypeCode`
 * (BHT-06) distinguishes a request (`RT` / cancel) from administrative
 * variants.
 *
 * @example
 * ```ts
 * import type { X12AuthHeader } from "@cosyte/x12";
 * declare const h: X12AuthHeader;
 * h.referenceId; // "AUTH-202606"
 * h.date;        // "20260601" (BHT-04, CCYYMMDD)
 * ```
 */
export interface X12AuthHeader {
  readonly structurePurposeCode: string;
  readonly purposeCode: string | undefined;
  readonly referenceId: string | undefined;
  readonly date: string | undefined;
  readonly time: string | undefined;
  readonly transactionTypeCode: string | undefined;
}

/**
 * A non-person entity (UMO in Loop 2010A, requester in Loop 2010B, or a
 * provider attached to a review). Decoded from an NM1 - name + identifier,
 * no demographics.
 *
 * @example
 * ```ts
 * import type { X12AuthEntity } from "@cosyte/x12";
 * declare const e: X12AuthEntity;
 * e.entityIdentifierCode; // "X3" (UMO) / "1P" (provider)
 * e.name;                 // "UTILIZATION REVIEW CO"
 * ```
 */
export interface X12AuthEntity {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly name: string;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * A person (subscriber Loop 2010C / dependent Loop 2010D) decoded from NM1 +
 * the optional DMG demographics. `idCode` (NM1-09) is the member identifier
 * - synthetic-only in fixtures.
 *
 * @example
 * ```ts
 * import type { X12AuthMember } from "@cosyte/x12";
 * declare const m: X12AuthMember;
 * m.lastName;    // "DOE"
 * m.dateOfBirth; // "19850515" (DMG-02, CCYYMMDD)
 * ```
 */
export interface X12AuthMember {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly lastName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly dateOfBirth: string | undefined;
  readonly genderCode: string | undefined;
}

/**
 * One services-review item - a patient-event HL (`EV`, Loop 2000E) or a
 * service HL (`SS`, Loop 2000F). Carries the `UM` review information, the
 * optional `HCR` decision (response only), echoed `TRN` traces, `HI`
 * diagnoses, attached provider NM1s, and the supplemental REF/DTP/MSG.
 *
 * @example
 * ```ts
 * import type { X12ServiceReview } from "@cosyte/x12";
 * declare const r: X12ServiceReview;
 * r.requestCategoryCode;        // "HS" (health services review) / "AR" (admission review)
 * r.certificationTypeCode;      // "I" (initial) / "R" (renewal)
 * r.decision?.actionCode;       // "A1" (certified) - response only
 * ```
 */
export interface X12ServiceReview {
  readonly hierarchy: X12Hl | undefined;
  readonly requestCategoryCode: string | undefined;
  readonly certificationTypeCode: string | undefined;
  readonly serviceTypeCode: string | undefined;
  readonly levelOfServiceCode: string | undefined;
  readonly decision: X12ReviewDecision | undefined;
  readonly traces: readonly X12AuthTrace[];
  readonly diagnoses: readonly X12AuthDiagnosis[];
  readonly providers: readonly X12AuthEntity[];
  readonly references: readonly X12AuthReference[];
  readonly dates: readonly X12AuthDate[];
  readonly messages: readonly string[];
}

/**
 * The HCR Health Care Services Review decision (response only, Loop 2000E /
 * 2000F). **`actionCode` (HCR-01) is the certification outcome and is
 * preserved verbatim** - the parser never infers an outcome.
 * `reviewIdentificationNumber` (HCR-02) is the authorization / certification
 * number a provider quotes back to the payer.
 *
 * @example
 * ```ts
 * import type { X12ReviewDecision } from "@cosyte/x12";
 * declare const d: X12ReviewDecision;
 * d.actionCode;                 // "A1" (certified in total)
 * d.reviewIdentificationNumber; // "AUTH123456"
 * d.reasonCode;                 // "0" (HCR-03, free-form decision reason)
 * ```
 */
export interface X12ReviewDecision {
  readonly actionCode: string;
  readonly reviewIdentificationNumber: string | undefined;
  readonly reasonCode: string | undefined;
  readonly secondSurgicalOpinionCode: string | undefined;
}

/**
 * A reassociation trace (TRN). A 278 request carries a trace the response
 * echoes verbatim so the requester can re-associate the certification
 * outcome with the request it sent - the walker NEVER mutates it.
 *
 * @example
 * ```ts
 * import type { X12AuthTrace } from "@cosyte/x12";
 * declare const t: X12AuthTrace;
 * t.traceTypeCode; // "1" (current transaction)
 * t.referenceId;   // "AUTHREQ-202606-0001"
 * ```
 */
export interface X12AuthTrace {
  readonly traceTypeCode: string;
  readonly referenceId: string;
  readonly originatingCompanyId: string | undefined;
  readonly supplementalReferenceId: string | undefined;
}

/**
 * One diagnosis from an HI segment (Loop 2000E). `qualifier` (HI-0x-01) is
 * the X12 code-source qualifier (e.g. `ABK` ICD-10-CM principal); `code`
 * (HI-0x-02) is the diagnosis code. `codeSystem` resolves the qualifier
 * against the bundled `HI_QUALIFIERS` snapshot - `"unknown"` (with an
 * `X12_UNKNOWN_HI_QUALIFIER` warning) when the qualifier is outside it. The
 * verbatim qualifier + code are always preserved.
 *
 * @example
 * ```ts
 * import type { X12AuthDiagnosis } from "@cosyte/x12";
 * declare const dx: X12AuthDiagnosis;
 * dx.qualifier;  // "ABK"
 * dx.code;       // "E1165"
 * dx.codeSystem; // "ICD-10-CM"
 * ```
 */
export interface X12AuthDiagnosis {
  readonly qualifier: string;
  readonly code: string;
  readonly codeSystem: X12HiCodeSystem | "unknown";
}

/**
 * A REF supplemental identifier attached to a review item. `qualifier` is
 * REF-01; `value` is REF-02.
 *
 * @example
 * ```ts
 * import type { X12AuthReference } from "@cosyte/x12";
 * declare const r: X12AuthReference;
 * r.qualifier; // "BB" (authorization number)
 * r.value;     // "PRIORAUTH-1"
 * ```
 */
export interface X12AuthReference {
  readonly qualifier: string;
  readonly value: string;
  readonly description: string | undefined;
}

/**
 * A DTP date / date-range attached to a review item. `qualifier` is DTP-01
 * (e.g. `435` admission, `472` service); `value` is DTP-03 in the DTP-02
 * format (`D8` `CCYYMMDD` / `RD8` range).
 *
 * @example
 * ```ts
 * import type { X12AuthDate } from "@cosyte/x12";
 * declare const d: X12AuthDate;
 * d.qualifier;       // "472"
 * d.formatQualifier; // "D8"
 * d.value;           // "20260601"
 * ```
 */
export interface X12AuthDate {
  readonly qualifier: string;
  readonly formatQualifier: string;
  readonly value: string;
}

/**
 * Barrel for the eligibility pair of TR3 `005010X279A1`: the 270 Health Care
 * Eligibility Benefit INQUIRY and the 271 RESPONSE. Both directions have a
 * per-transaction reader and a matching domain builder, and both are exported
 * here. Types surface the typed result shapes; the loop specs are exported so
 * consumers can introspect or extend either HL hierarchy.
 *
 * @example
 * ```ts
 * import { parseX12, get270Inquiry, get271Eligibility } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const tx of ix.groups[0]?.transactions ?? []) {
 *   const inquiry = get270Inquiry(ix.delimiters, tx);   // undefined unless a 270
 *   const response = get271Eligibility(ix.delimiters, tx); // undefined unless a 271
 *   inquiry?.informationSources[0]?.receivers[0]?.subscribers[0]?.inquiries.length;
 *   response?.subscribers[0]?.traces[0]?.referenceId; // the 270 trace, echoed
 * }
 * ```
 */

export { get270Inquiry, parse270Inquiries } from "./get-270.js";
export { build270 } from "./build-270.js";
export {
  ELIGIBILITY_270_BUILD_ERROR_CODES,
  Eligibility270BuildError,
  type Eligibility270BuildErrorCode,
} from "./build-270-errors.js";
export type {
  Build270AddressSpec,
  Build270DateSpec,
  Build270DependentSpec,
  Build270EnvelopeSpec,
  Build270HeaderSpec,
  Build270InformationReceiverSpec,
  Build270InformationSourceSpec,
  Build270InquirySpec,
  Build270NameSpec,
  Build270ProcedureSpec,
  Build270ReferenceSpec,
  Build270ServiceTypeSpec,
  Build270Spec,
  Build270SubscriberSpec,
  Build270TraceSpec,
} from "./build-270-types.js";
export {
  INQUIRY_270_LOOP_2000A,
  INQUIRY_270_LOOP_2000B,
  INQUIRY_270_LOOP_2000C,
  INQUIRY_270_LOOP_2000D,
  INQUIRY_270_LOOP_2100C,
  INQUIRY_270_LOOP_2100D,
  INQUIRY_270_LOOP_2110,
} from "./loop-spec-270.js";
export type {
  X12Inquiry,
  X12InquiryAddress,
  X12InquiryDate,
  X12InquiryDependent,
  X12InquiryHeader,
  X12InquiryName,
  X12InquiryProcedure,
  X12InquiryReceiver,
  X12InquiryReference,
  X12InquiryRequest,
  X12InquiryServiceType,
  X12InquirySource,
  X12InquirySubscriber,
  X12InquiryTrace,
} from "./inquiry-types.js";

export { get271Eligibility } from "./get-271.js";
export { build271 } from "./build-271.js";
export {
  ELIGIBILITY_271_BUILD_ERROR_CODES,
  Eligibility271BuildError,
  type Eligibility271BuildErrorCode,
} from "./build-errors.js";
export type {
  Build271AddressSpec,
  Build271BenefitSpec,
  Build271DateSpec,
  Build271DependentSpec,
  Build271EntitySpec,
  Build271EnvelopeSpec,
  Build271InformationReceiverSpec,
  Build271InformationSourceSpec,
  Build271MemberSpec,
  Build271ReferenceSpec,
  Build271ServiceTypeSpec,
  Build271Spec,
  Build271SubscriberSpec,
  Build271TraceSpec,
} from "./build-271-types.js";
export {
  ELIGIBILITY_271_LOOP_2000A,
  ELIGIBILITY_271_LOOP_2000B,
  ELIGIBILITY_271_LOOP_2000C,
  ELIGIBILITY_271_LOOP_2000D,
  ELIGIBILITY_271_LOOP_2100C,
  ELIGIBILITY_271_LOOP_2100D,
  ELIGIBILITY_271_LOOP_2110,
} from "./loop-spec.js";
export type {
  X12Eligibility,
  X12EligibilityAddress,
  X12EligibilityBenefit,
  X12EligibilityDate,
  X12EligibilityDependent,
  X12EligibilityEntity,
  X12EligibilityMember,
  X12EligibilityReference,
  X12EligibilityServiceType,
  X12EligibilitySubscriber,
  X12EligibilityTrace,
} from "./types.js";

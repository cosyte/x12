/**
 * Barrel for the claim-status family - TR3s `005010X212` (the 276 Health Care
 * Claim Status REQUEST and the 277 Claim Status RESPONSE, one document
 * covering both directions) and `005010X214` (277CA Claim Acknowledgment).
 * **The family now covers both directions**: the 276 request has a
 * per-transaction reader and a matching domain builder, and so do the 277 and
 * the 277CA.
 *
 * The 277 and the 277CA both carry `ST-01 = "277"` and share the HL spine +
 * STC composite; they are disambiguated by `ST-03`. {@link get277Status}
 * accepts either; {@link get277CADisposition} accepts only the 277CA
 * convention reference. The 276 carries `ST-01 = "276"` and is claimed by
 * {@link get276StatusInquiry} alone. Types surface the typed result shapes; the
 * loop specs are exported so consumers can introspect either HL hierarchy.
 *
 * @example
 * ```ts
 * import { parseX12, get276StatusInquiry, get277Status } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const tx of ix.groups[0]?.transactions ?? []) {
 *   const request = get276StatusInquiry(ix.delimiters, tx); // undefined unless a 276
 *   const response = get277Status(ix.delimiters, tx);       // undefined unless a 277
 *   request?.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0]
 *     ?.claims[0]?.trace?.referenceId;                      // the trace sent
 *   response?.claims[0]?.traces[0]?.referenceId;            // that trace, echoed
 * }
 * ```
 */

export { get276StatusInquiry, parse276StatusInquiries } from "./get-276.js";
export { build276 } from "./build-276.js";
export {
  CLAIM_STATUS_276_BUILD_ERROR_CODES,
  ClaimStatus276BuildError,
  type ClaimStatus276BuildErrorCode,
} from "./build-276-errors.js";
export type {
  Build276AmountSpec,
  Build276ClaimSpec,
  Build276DateSpec,
  Build276DependentSpec,
  Build276EnvelopeSpec,
  Build276HeaderSpec,
  Build276InformationReceiverSpec,
  Build276InformationSourceSpec,
  Build276NameSpec,
  Build276ProcedureSpec,
  Build276ProviderSpec,
  Build276ReferenceSpec,
  Build276ServiceLineSpec,
  Build276Spec,
  Build276SubscriberSpec,
  Build276TraceSpec,
} from "./build-276-types.js";
export {
  STATUS_276_LOOP_2000A,
  STATUS_276_LOOP_2000B,
  STATUS_276_LOOP_2000C,
  STATUS_276_LOOP_2000D,
  STATUS_276_LOOP_2000E,
  STATUS_276_LOOP_2200,
  STATUS_276_LOOP_2210,
} from "./loop-spec-276.js";
export type {
  X12StatusInquiry,
  X12StatusInquiryAmount,
  X12StatusInquiryClaim,
  X12StatusInquiryDate,
  X12StatusInquiryDependent,
  X12StatusInquiryHeader,
  X12StatusInquiryName,
  X12StatusInquiryProcedure,
  X12StatusInquiryProvider,
  X12StatusInquiryReceiver,
  X12StatusInquiryReference,
  X12StatusInquiryServiceLine,
  X12StatusInquirySource,
  X12StatusInquirySubscriber,
  X12StatusInquiryTrace,
} from "./status-inquiry-types.js";

export { get277Status, get277CADisposition } from "./get-277.js";
export { build277, build277CA } from "./build-277.js";
export {
  CLAIM_STATUS_277_BUILD_ERROR_CODES,
  ClaimStatus277BuildError,
  type ClaimStatus277BuildErrorCode,
} from "./build-errors.js";
export type {
  Build277ClaimSpec,
  Build277DateSpec,
  Build277DependentSpec,
  Build277EntitySpec,
  Build277EnvelopeSpec,
  Build277InformationReceiverSpec,
  Build277InformationSourceSpec,
  Build277MemberSpec,
  Build277ProviderSpec,
  Build277ReferenceSpec,
  Build277ServiceLineSpec,
  Build277Spec,
  Build277StatusCodeSpec,
  Build277StatusSpec,
  Build277SubscriberSpec,
  Build277TraceSpec,
} from "./build-277-types.js";
export {
  STATUS_277_LOOP_2000A,
  STATUS_277_LOOP_2000B,
  STATUS_277_LOOP_2000C,
  STATUS_277_LOOP_2000D,
  STATUS_277_LOOP_2000E,
  STATUS_277_LOOP_2200,
  STATUS_277_LOOP_2220,
} from "./loop-spec.js";
export type {
  X12ClaimStatus,
  X12ClaimStatusResponse,
  X12ServiceLineStatus,
  X12StatusCode,
  X12StatusDate,
  X12StatusEntity,
  X12StatusInfo,
  X12StatusMember,
  X12StatusReference,
  X12StatusTrace,
} from "./types.js";

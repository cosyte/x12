/**
 * Barrel for the claims attachments pair, the two implementation guides 45 CFR
 * 162.920(a)(19) and (a)(20) name and 45 CFR 162.2002 adopts for the period on
 * and after May 26, 2028: the 277 Health Care Claim Request for Additional
 * Information (`006020X313`), a health plan asking for documentation, and the
 * 275 Additional Information to Support a Health Care Claim or Encounter
 * (`006020X314`), a provider answering with it. Each has a reader and a
 * builder.
 *
 * @example
 * ```ts
 * import { parseX12, get277RequestForAdditionalInformation, get275Attachments } from "@cosyte/x12";
 * const ix = parseX12(buffer);
 * for (const tx of ix.groups[0]?.transactions ?? []) {
 *   const request = get277RequestForAdditionalInformation(ix.delimiters, tx); // a 006020X313 277 only
 *   const answer = get275Attachments(ix.delimiters, tx);                       // a 275
 * }
 * ```
 */

export { get277RequestForAdditionalInformation } from "./get-277-rfai.js";
export { build277RequestForAdditionalInformation } from "./build-277-rfai.js";
export { get275Attachments } from "./get-275.js";
export { build275 } from "./build-275.js";
export {
  ATTACHMENT_275_BUILD_ERROR_CODES,
  Attachment275BuildError,
  RFAI_277_BUILD_ERROR_CODES,
  Rfai277BuildError,
  type Attachment275BuildErrorCode,
  type Rfai277BuildErrorCode,
} from "./build-errors.js";
export {
  RFAI_277_LOOP_1000,
  RFAI_277_LOOP_2000,
  RFAI_277_LOOP_2100,
  RFAI_277_LOOP_2200,
  RFAI_277_LOOP_2220,
} from "./loop-spec-277-rfai.js";
export { X12AttachmentData } from "./attachment-types.js";
export type {
  X12Attachment,
  X12AttachmentBeginning,
  X12AttachmentEntity,
  X12AttachmentLine,
  X12AttachmentReference,
  X12AttachmentStatus,
  X12AttachmentStatusCode,
  X12AttachmentSubmission,
  X12AttachmentTrace,
} from "./attachment-types.js";
export type {
  X12AdditionalInformationRequest,
  X12AdditionalInformationRequestAmount,
  X12AdditionalInformationRequestClaim,
  X12AdditionalInformationRequestDate,
  X12AdditionalInformationRequestEntity,
  X12AdditionalInformationRequestHeader,
  X12AdditionalInformationRequestLevel,
  X12AdditionalInformationRequestQuantity,
  X12AdditionalInformationRequestReference,
  X12AdditionalInformationRequestServiceLine,
  X12AdditionalInformationRequestStatus,
  X12AdditionalInformationRequestStatusCode,
  X12AdditionalInformationRequestTrace,
} from "./rfai-types.js";
export type {
  Build277RfaiAmountSpec,
  Build277RfaiDateSpec,
  Build277RfaiEntitySpec,
  Build277RfaiEnvelopeSpec,
  Build277RfaiHeaderSpec,
  Build277RfaiLevelSpec,
  Build277RfaiQuantitySpec,
  Build277RfaiReferenceSpec,
  Build277RfaiRequestSpec,
  Build277RfaiServiceLineSpec,
  Build277RfaiServiceSpec,
  Build277RfaiSpec,
  Build277RfaiStatusCodeSpec,
  Build277RfaiStatusSpec,
  Build277RfaiTraceSpec,
} from "./build-277-rfai-types.js";
export type {
  Build275AttachmentSpec,
  Build275BeginningSpec,
  Build275EntitySpec,
  Build275EnvelopeSpec,
  Build275LineSpec,
  Build275ReferenceSpec,
  Build275Spec,
  Build275StatusCodeSpec,
  Build275StatusSpec,
  Build275TraceSpec,
} from "./build-275-types.js";

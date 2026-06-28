/**
 * Barrel for the 277 / 277CA claim-status family — TR3s `005010X212`
 * (277 Health Care Claim Status Response) and `005010X214` (277CA Claim
 * Acknowledgment). Both carry `ST-01 = "277"` and share the HL spine +
 * STC composite; they are disambiguated by `ST-03`. {@link get277Status}
 * accepts either; {@link get277CADisposition} accepts only the 277CA
 * convention reference. Types surface the typed result shape; the loop
 * specs are exported so consumers can introspect the HL hierarchy.
 *
 * @example
 * ```ts
 * import { parseX12, get277Status } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
 * const status = tx === undefined ? undefined : get277Status(ix.delimiters, tx);
 * status?.claims[0]?.traces[0]?.referenceId; // echoed 276 trace
 * ```
 */

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

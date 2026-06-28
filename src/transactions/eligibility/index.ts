/**
 * Barrel for the 271 Health Care Eligibility Benefit Response surface —
 * TR3 `005010X279A1`. The public entry point is {@link get271Eligibility};
 * types surface the typed result shape; the loop specs are exported so
 * consumers can introspect or extend the HL hierarchy.
 *
 * @example
 * ```ts
 * import { parseX12, get271Eligibility } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
 * const elig = tx === undefined ? undefined : get271Eligibility(ix.delimiters, tx);
 * elig?.subscribers[0]?.traces[0]?.referenceId; // echoed 270 trace
 * ```
 */

export { get271Eligibility } from "./get-271.js";
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

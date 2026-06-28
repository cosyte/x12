/**
 * Barrel for the 278 Health Care Services Review surface — request TR3
 * `005010X217` (via {@link get278Request}) and response TR3 `005010X216`
 * (via {@link get278Response}). Both return the same {@link X12ServicesReview}
 * shape; `direction` records which entry point produced it. The loop specs
 * are exported so consumers can introspect or extend the HL hierarchy.
 *
 * @example
 * ```ts
 * import { parseX12, get278Request, get278Response } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
 * if (tx !== undefined) {
 *   const resp = get278Response(ix.delimiters, tx);
 *   resp?.reviews[0]?.decision?.actionCode; // "A1" (certified)
 * }
 * ```
 */

export { get278Request, get278Response } from "./get-278.js";
export {
  AUTH_278_LOOP_2000A,
  AUTH_278_LOOP_2000B,
  AUTH_278_LOOP_2000C,
  AUTH_278_LOOP_2000D,
  AUTH_278_LOOP_2000E,
  AUTH_278_LOOP_2000F,
} from "./loop-spec.js";
export type {
  X12AuthDate,
  X12AuthDiagnosis,
  X12AuthEntity,
  X12AuthHeader,
  X12AuthMember,
  X12AuthReference,
  X12AuthTrace,
  X12ReviewDecision,
  X12ServiceReview,
  X12ServicesReview,
} from "./types.js";

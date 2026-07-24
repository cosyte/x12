/**
 * Public barrel for the `@cosyte/x12` profile subsystem (Phase 9). Assembles
 * the `profiles` namespace object and re-exports the public profile API:
 * `defineProfile`, `setDefaultProfile`, `getDefaultProfile`,
 * `partitionWarnings`, the `X12ProfileError` class, and the supporting types.
 *
 * Contract (mirrors hl7): individual built-ins are NOT top-level named
 * exports - consumers reach them via `profiles.availity`, `profiles.bcbsCommon`
 * ("availity" is too generic for a top-level export).
 *
 * **Shipped built-ins are intentionally few.** Per the locked hard rule, a
 * built-in profile may only ship quirks grounded in a real Tier-2 fixture
 * demonstrating the deviation. The roadmap's `changeHealthcare`, `medicareFFS`,
 * `waystar`, and `trizetto` are DEFERRED - the current corpus has no fixture
 * exhibiting a parser-relevant deviation unique to them (the Medicare fixtures
 * are canonical `:` baselines, not deviations). They land as corpus accrues;
 * see KNOWN-LIMITATIONS.md.
 */

export { defineProfile } from "./define.js";
export { setDefaultProfile, getDefaultProfile } from "./default.js";
export { partitionWarnings } from "./apply.js";
export type { X12WarningPartition } from "./apply.js";
export { X12ProfileError } from "./errors.js";
export type {
  X12Profile,
  X12ProfileDescription,
  X12ProfileEffect,
  X12ProfileQuirk,
  X12ProfileSpec,
} from "./types.js";

import { availity } from "./availity.js";
import { bcbsCommon } from "./bcbsCommon.js";

/**
 * Namespace object exposing the shipped built-in profiles. Each is authored
 * via the public `defineProfile()` API and grounded in a real Tier-2 fixture.
 *
 * @example
 * ```ts
 * import { parseX12, profiles } from "@cosyte/x12";
 * const ix = parseX12(raw, { profile: profiles.availity });
 * ix.profile?.name; // "availity"
 * ```
 */
export const profiles = Object.freeze({
  availity,
  bcbsCommon,
}) as {
  readonly availity: typeof availity;
  readonly bcbsCommon: typeof bcbsCommon;
};

/**
 * Public type surface for the `defineLoopSpec()` API. A {@link LoopSpec}
 * is a declarative description of a TR3 loop (e.g. `Loop 2300` in 837P /
 * `Loop 2110` in 835): which segments belong to it, in what order, with
 * what cardinality, and which child loops nest inside it. Phase 2 ships the
 * API and types only — built-in transaction loop specs for the 12 v1
 * transactions are authored through this same public API in Phases 3+
 * (the dogfooding gate locked in `documentation/repos/x12.md`).
 *
 * Naming convention: `id` is a human-readable loop identifier (`"2300"` for
 * 837 Loop 2300, `"2110"` for 835 Loop 2110, `"GROUP_2000A"` for an HL
 * group). `trigger` is the segment id that OPENS the loop — the segment
 * the walker looks for to know a new loop iteration has begun. `segments`
 * lists every spec'd segment in the loop body in TR3 order (including the
 * trigger as the first entry). `children` lists nested child loops; they
 * are searched after the parent's body so a TR3-cited sequence is
 * preserved.
 */

/**
 * Cardinality of a segment or child loop inside its parent. Mirrors TR3
 * spelling so the spec reads like the implementation guide:
 *
 * - `required` — the segment/loop MUST appear at least once.
 * - `situational` — the segment/loop MAY appear when its situational rule
 *   triggers; the parser does not enforce the rule itself but loop-walker
 *   warnings (Phase 3+) reference it.
 * - `optional` — the segment/loop MAY appear in any usage.
 *
 * @example
 * ```ts
 * import type { LoopUsage } from "@cosyte/x12";
 * const usage: LoopUsage = "required";
 * ```
 */
export type LoopUsage = "required" | "situational" | "optional";

/**
 * Repetition count for a segment or child loop inside its parent. `">1"`
 * means many (TR3 typically writes `>1` to mean "no cap"). A finite max
 * surfaces as the numeric value. Phase 2 stores the value; Phase 3+'s
 * loop walker uses it for over-limit warnings.
 *
 * @example
 * ```ts
 * import type { LoopMax } from "@cosyte/x12";
 * const single: LoopMax = 1;
 * const many: LoopMax = ">1";
 * ```
 */
export type LoopMax = number | ">1";

/**
 * A segment slot inside a loop body. Carries the segment id, its TR3
 * usage + cardinality, and an optional position label (e.g. `"Loop 2300
 * #2"`) used by Phase 3+ loop-walker diagnostics. Stored verbatim by
 * `defineLoopSpec`; no validation beyond the structural shape so consumers
 * can author payer-specific segment specs without re-deriving each rule.
 *
 * @example
 * ```ts
 * import type { LoopSegmentSpec } from "@cosyte/x12";
 * const clm: LoopSegmentSpec = { id: "CLM", usage: "required", max: 1 };
 * ```
 */
export interface LoopSegmentSpec {
  readonly id: string;
  readonly usage: LoopUsage;
  readonly max: LoopMax;
  readonly position?: string;
  readonly description?: string;
}

/**
 * A declarative loop description used by Phase 3+ transaction extractors
 * and consumer-authored payer profiles alike. Frozen by `defineLoopSpec`
 * so a `LoopSpec` is safe to share across calls.
 *
 * @example
 * ```ts
 * import { defineLoopSpec } from "@cosyte/x12";
 * const Loop2300 = defineLoopSpec({
 *   id: "2300",
 *   description: "837 Claim Information",
 *   trigger: "CLM",
 *   segments: [
 *     { id: "CLM", usage: "required", max: 1 },
 *     { id: "DTP", usage: "situational", max: ">1" },
 *     { id: "HI",  usage: "situational", max: ">1" },
 *   ],
 * });
 * ```
 */
export interface LoopSpec {
  readonly id: string;
  readonly trigger: string;
  readonly description?: string;
  readonly segments: readonly LoopSegmentSpec[];
  readonly children: readonly LoopSpec[];
}

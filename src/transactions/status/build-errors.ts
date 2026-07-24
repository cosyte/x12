/**
 * Thrown errors raised by the 277 / 277CA domain builders ({@link
 * "./build-277.js".build277} / {@link "./build-277.js".build277CA}).
 * Distinct from the general `X12BuildError` (a structurally impossible
 * envelope): {@link ClaimStatus277BuildError} is raised when a claim-status
 * spec cannot form a valid HL hierarchy, or a per-loop structural
 * precondition fails.
 *
 * The HL spine is the 277's safety primitive - the builder OWNS it,
 * computing every HL-01 id, HL-02 parent pointer (20 → 21 → 19 → 22 → 23),
 * and HL-04 has-child flag from the nested informationSources → receivers →
 * providers → subscribers → (dependents) tree, so a structurally
 * inconsistent hierarchy is *unrepresentable* and SE-01 is correct by
 * construction.
 *
 * The read side ({@link "./get-277.js".get277Status}) is lenient - a real
 * 277 with a broken HL parent pointer is WARNED, never rejected. The builder
 * takes the opposite stance: it REFUSES rather than emit a hierarchy a
 * downstream consumer would have to repair. A caller that must reproduce a
 * knowingly-malformed payer artifact drops to the general
 * `buildInterchange`, which applies no domain guard.
 */

/**
 * Stable string codes for every {@link ClaimStatus277BuildError}. Locked
 * here so consumers can narrow exhaustively on `err.code`; additions-only
 * thereafter (renaming any code is a breaking change).
 *
 * - `X12_277_BUILD_INVALID_HIERARCHY` - the nested tree cannot form a valid
 *   277 HL spine (no sources, a source with no receiver, a receiver with no
 *   provider, a provider with no subscriber, a subscriber with neither
 *   claims nor dependents, a dependent with no claim). The message carries
 *   structural indices + counts only - never a member id / name.
 * - `X12_277_BUILD_INVALID_SPEC` - a non-hierarchy precondition failed (a
 *   claim that would not materialize on read - no trace, no statuses, no
 *   service lines; a status whose first composite has no category code; an
 *   over-long ISA-13 control number).
 *
 * @example
 * ```ts
 * import { CLAIM_STATUS_277_BUILD_ERROR_CODES, ClaimStatus277BuildError, build277 } from "@cosyte/x12";
 * try {
 *   build277(spec);
 * } catch (err) {
 *   if (
 *     err instanceof ClaimStatus277BuildError &&
 *     err.code === CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY
 *   ) {
 *     // the hierarchy is impossible - fix the tree, do not emit
 *   }
 * }
 * ```
 */
export const CLAIM_STATUS_277_BUILD_ERROR_CODES = {
  X12_277_BUILD_INVALID_HIERARCHY: "X12_277_BUILD_INVALID_HIERARCHY",
  X12_277_BUILD_INVALID_SPEC: "X12_277_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link CLAIM_STATUS_277_BUILD_ERROR_CODES}. Used
 * as {@link ClaimStatus277BuildError}.`code`.
 */
export type ClaimStatus277BuildErrorCode =
  (typeof CLAIM_STATUS_277_BUILD_ERROR_CODES)[keyof typeof CLAIM_STATUS_277_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-277.js".build277} / {@link
 * "./build-277.js".build277CA} when the supplied claim-status spec cannot be
 * emitted as a conformant, self-consistent 277 - most importantly when its
 * nested tree cannot form a valid HL hierarchy. Carries a stable `code` for
 * programmatic narrowing. Deliberately does NOT extend `X12ParseError` or
 * `X12BuildError` - the domain-refusal distinction matters at the type
 * level.
 *
 * @example
 * ```ts
 * import { ClaimStatus277BuildError } from "@cosyte/x12";
 * try {
 *   build277(spec);
 * } catch (err) {
 *   if (err instanceof ClaimStatus277BuildError) {
 *     // err.code is one of CLAIM_STATUS_277_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class ClaimStatus277BuildError extends Error {
  public readonly code: ClaimStatus277BuildErrorCode;

  /** @internal */
  public constructor(code: ClaimStatus277BuildErrorCode, message: string) {
    super(message);
    this.name = "ClaimStatus277BuildError";
    this.code = code;
  }
}

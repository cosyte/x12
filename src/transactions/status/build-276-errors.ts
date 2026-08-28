/**
 * Thrown errors raised by the 276 domain builder ({@link
 * "./build-276.js".build276}). A sibling of {@link
 * "./build-errors.js".ClaimStatus277BuildError} rather than a widening of it: a
 * consumer catching a `277` error out of `build276` would be reading a name
 * that lies about which direction refused, and renaming the shipped 277 class
 * to cover both would be a breaking change to a published surface. One class
 * per direction, additions only - the same call
 * {@link "../eligibility/build-270-errors.js".Eligibility270BuildError} makes
 * beside the 271's class.
 *
 * The HL spine is the request's safety primitive, so the builder OWNS it,
 * computing every HL-01 id, HL-02 parent pointer (20 to 21 to 19 to 22 to 23)
 * and HL-04 has-child flag from the nested informationSources / receivers /
 * providers / subscribers / (dependents) tree. A structurally inconsistent
 * hierarchy is therefore unrepresentable and SE-01 is correct by construction.
 *
 * The read side ({@link "./get-276.js".get276StatusInquiry}) is lenient: a real
 * 276 with a broken HL pointer is WARNED, never rejected. The builder takes the
 * opposite stance and REFUSES rather than emit something a downstream consumer
 * would have to repair. A caller that must reproduce a knowingly-malformed
 * artifact drops to `buildInterchange`, which applies no domain guard.
 */

/**
 * Stable string codes for every {@link ClaimStatus276BuildError}. Locked here
 * so consumers can narrow exhaustively on `err.code`; additions-only thereafter
 * (renaming any code is a breaking change).
 *
 * - `X12_276_BUILD_INVALID_HIERARCHY` - the nested tree cannot form a valid 276
 *   HL spine (no information sources, a source with no receiver, a receiver
 *   with no service provider, a provider with no subscriber), or a list slot
 *   was handed something that is not a list. The message carries structural
 *   indices and counts only, never a member id, a name, a trace value or a
 *   claim number.
 * - `X12_276_BUILD_INVALID_SPEC` - a non-hierarchy precondition failed: an
 *   over-long interchange control number, an empty control number, a non-string
 *   element value, or a level the builder cannot emit spec-clean (a level with
 *   no name loop, a level that asks about no claim, or a claim that asks
 *   nothing).
 *
 * @example
 * ```ts
 * import { CLAIM_STATUS_276_BUILD_ERROR_CODES, ClaimStatus276BuildError, build276 } from "@cosyte/x12";
 * try {
 *   build276(spec);
 * } catch (err) {
 *   if (
 *     err instanceof ClaimStatus276BuildError &&
 *     err.code === CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_HIERARCHY
 *   ) {
 *     // the hierarchy is impossible - fix the tree, do not emit
 *   }
 * }
 * ```
 */
export const CLAIM_STATUS_276_BUILD_ERROR_CODES = {
  X12_276_BUILD_INVALID_HIERARCHY: "X12_276_BUILD_INVALID_HIERARCHY",
  X12_276_BUILD_INVALID_SPEC: "X12_276_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link CLAIM_STATUS_276_BUILD_ERROR_CODES}. Used as
 * {@link ClaimStatus276BuildError}.`code`.
 */
export type ClaimStatus276BuildErrorCode =
  (typeof CLAIM_STATUS_276_BUILD_ERROR_CODES)[keyof typeof CLAIM_STATUS_276_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-276.js".build276} when the supplied request spec
 * cannot be emitted as a conformant, self-consistent 276. Carries a stable
 * `code` for programmatic narrowing. Deliberately does NOT extend
 * `X12ParseError` or `X12BuildError`: the domain-refusal distinction matters at
 * the type level.
 *
 * @example
 * ```ts
 * import { ClaimStatus276BuildError, build276 } from "@cosyte/x12";
 * try {
 *   build276(spec);
 * } catch (err) {
 *   if (err instanceof ClaimStatus276BuildError) {
 *     // err.code is one of CLAIM_STATUS_276_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class ClaimStatus276BuildError extends Error {
  public readonly code: ClaimStatus276BuildErrorCode;

  /** @internal */
  public constructor(code: ClaimStatus276BuildErrorCode, message: string) {
    super(message);
    this.name = "ClaimStatus276BuildError";
    this.code = code;
  }
}

/**
 * Thrown errors raised by the 270 domain builder ({@link
 * "./build-270.js".build270}). A sibling of {@link
 * "./build-errors.js".Eligibility271BuildError} rather than a widening of it:
 * a consumer catching a `271` error out of `build270` would be reading a name
 * that lies about which direction refused, and renaming the shipped 271 class
 * to cover both would be a breaking change to a published surface. One class
 * per direction, additions only.
 *
 * The HL spine is the inquiry's safety primitive, so the builder OWNS it,
 * computing every HL-01 id, HL-02 parent pointer (20 to 21 to 22 to 23) and
 * HL-04 has-child flag from the nested
 * informationSources / receivers / subscribers / (dependents) tree. A
 * structurally inconsistent hierarchy is therefore unrepresentable and SE-01
 * is correct by construction.
 *
 * The read side ({@link "./get-270.js".get270Inquiry}) is lenient: a real 270
 * with a broken HL pointer is WARNED, never rejected. The builder takes the
 * opposite stance and REFUSES rather than emit something a downstream consumer
 * would have to repair. A caller that must reproduce a knowingly-malformed
 * artifact drops to `buildInterchange`, which applies no domain guard.
 */

/**
 * Stable string codes for every {@link Eligibility270BuildError}. Locked here
 * so consumers can narrow exhaustively on `err.code`; additions-only
 * thereafter (renaming any code is a breaking change).
 *
 * - `X12_270_BUILD_INVALID_HIERARCHY` - the nested tree cannot form a valid
 *   270 HL spine (no information sources, a source with no receiver, a
 *   receiver with no subscriber), or a list slot was handed something that is
 *   not a list. The message carries structural indices and counts only, never
 *   a member id, a name or a trace value.
 * - `X12_270_BUILD_INVALID_SPEC` - a non-hierarchy precondition failed: an
 *   over-long interchange control number, an empty control number, a
 *   non-string element value, or a level the builder cannot emit spec-clean
 *   (a subscriber or dependent with no name loop, or with no eligibility
 *   inquiry to ask).
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_270_BUILD_ERROR_CODES, Eligibility270BuildError, build270 } from "@cosyte/x12";
 * try {
 *   build270(spec);
 * } catch (err) {
 *   if (
 *     err instanceof Eligibility270BuildError &&
 *     err.code === ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY
 *   ) {
 *     // the hierarchy is impossible - fix the tree, do not emit
 *   }
 * }
 * ```
 */
export const ELIGIBILITY_270_BUILD_ERROR_CODES = {
  X12_270_BUILD_INVALID_HIERARCHY: "X12_270_BUILD_INVALID_HIERARCHY",
  X12_270_BUILD_INVALID_SPEC: "X12_270_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link ELIGIBILITY_270_BUILD_ERROR_CODES}. Used
 * as {@link Eligibility270BuildError}.`code`.
 */
export type Eligibility270BuildErrorCode =
  (typeof ELIGIBILITY_270_BUILD_ERROR_CODES)[keyof typeof ELIGIBILITY_270_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-270.js".build270} when the supplied inquiry spec
 * cannot be emitted as a conformant, self-consistent 270. Carries a stable
 * `code` for programmatic narrowing. Deliberately does NOT extend
 * `X12ParseError` or `X12BuildError`: the domain-refusal distinction matters
 * at the type level.
 *
 * @example
 * ```ts
 * import { Eligibility270BuildError, build270 } from "@cosyte/x12";
 * try {
 *   build270(spec);
 * } catch (err) {
 *   if (err instanceof Eligibility270BuildError) {
 *     // err.code is one of ELIGIBILITY_270_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class Eligibility270BuildError extends Error {
  public readonly code: Eligibility270BuildErrorCode;

  /** @internal */
  public constructor(code: Eligibility270BuildErrorCode, message: string) {
    super(message);
    this.name = "Eligibility270BuildError";
    this.code = code;
  }
}

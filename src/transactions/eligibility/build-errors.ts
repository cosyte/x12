/**
 * Thrown errors raised by the 271 domain builder ({@link
 * "./build-271.js".build271}). Distinct from the general `X12BuildError`
 * (a structurally impossible envelope): {@link Eligibility271BuildError} is
 * raised when an eligibility-response spec cannot form a valid HL
 * hierarchy, or a per-level structural precondition fails.
 *
 * The HL spine is the 271's safety primitive — the builder OWNS it,
 * computing every HL-01 id, HL-02 parent pointer (20 → 21 → 22 → 23), and
 * HL-04 has-child flag from the nested
 * informationSources → receivers → subscribers → (dependents) tree, so a
 * structurally inconsistent hierarchy is *unrepresentable* and SE-01 is
 * correct by construction.
 *
 * The read side ({@link "./get-271.js".get271Eligibility}) is lenient — a
 * real 271 with a broken HL parent pointer is WARNED, never rejected. The
 * builder takes the opposite stance: it REFUSES rather than emit a
 * hierarchy a downstream consumer would have to repair. A caller that must
 * reproduce a knowingly-malformed payer artifact drops to the general
 * `buildInterchange`, which applies no domain guard.
 */

/**
 * Stable string codes for every {@link Eligibility271BuildError}. Locked
 * here so consumers can narrow exhaustively on `err.code`; additions-only
 * thereafter (renaming any code is a breaking change).
 *
 * - `X12_271_BUILD_INVALID_HIERARCHY` — the nested tree cannot form a valid
 *   271 HL spine (no information sources, a source with no receiver, a
 *   receiver with no subscriber). The message carries structural indices +
 *   counts only — never a member id / name (PHI discipline).
 * - `X12_271_BUILD_INVALID_SPEC` — a non-hierarchy precondition failed (an
 *   over-long ISA-13 interchange control number).
 *
 * @example
 * ```ts
 * import { ELIGIBILITY_271_BUILD_ERROR_CODES, Eligibility271BuildError, build271 } from "@cosyte/x12";
 * try {
 *   build271(spec);
 * } catch (err) {
 *   if (
 *     err instanceof Eligibility271BuildError &&
 *     err.code === ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_HIERARCHY
 *   ) {
 *     // the hierarchy is impossible — fix the tree, do not emit
 *   }
 * }
 * ```
 */
export const ELIGIBILITY_271_BUILD_ERROR_CODES = {
  X12_271_BUILD_INVALID_HIERARCHY: "X12_271_BUILD_INVALID_HIERARCHY",
  X12_271_BUILD_INVALID_SPEC: "X12_271_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link ELIGIBILITY_271_BUILD_ERROR_CODES}. Used
 * as {@link Eligibility271BuildError}.`code`.
 */
export type Eligibility271BuildErrorCode =
  (typeof ELIGIBILITY_271_BUILD_ERROR_CODES)[keyof typeof ELIGIBILITY_271_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-271.js".build271} when the supplied eligibility
 * spec cannot be emitted as a conformant, self-consistent 271 — most
 * importantly when its nested tree cannot form a valid HL hierarchy. Carries
 * a stable `code` for programmatic narrowing. Deliberately does NOT extend
 * `X12ParseError` or `X12BuildError` — the domain-refusal distinction
 * matters at the type level.
 *
 * @example
 * ```ts
 * import { Eligibility271BuildError } from "@cosyte/x12";
 * try {
 *   build271(spec);
 * } catch (err) {
 *   if (err instanceof Eligibility271BuildError) {
 *     // err.code is one of ELIGIBILITY_271_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class Eligibility271BuildError extends Error {
  public readonly code: Eligibility271BuildErrorCode;

  /** @internal */
  public constructor(code: Eligibility271BuildErrorCode, message: string) {
    super(message);
    this.name = "Eligibility271BuildError";
    this.code = code;
  }
}

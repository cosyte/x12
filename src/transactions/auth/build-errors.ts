/**
 * Thrown errors raised by the 278 domain builders ({@link
 * "./build-278.js".build278Request} / {@link
 * "./build-278.js".build278Response}). Distinct from the general
 * `X12BuildError` (a structurally impossible envelope): {@link
 * ServicesReview278BuildError} is raised when a services-review spec cannot
 * form a valid HL hierarchy, or a per-loop / certification precondition
 * fails.
 *
 * The HL spine is the 278's safety primitive — the builder OWNS it,
 * computing every HL-01 id, HL-02 parent pointer (20 → 21 → 22 → 23), and
 * HL-04 has-child flag from the nested UMO → requester → subscriber →
 * (dependent) → reviews tree, so a structurally inconsistent hierarchy is
 * *unrepresentable* and SE-01 is correct by construction.
 *
 * The read side ({@link "./get-278.js".get278Request}) is lenient — a real
 * 278 with a broken HL parent pointer is WARNED, never rejected. The builder
 * takes the opposite stance: it REFUSES rather than emit a hierarchy a
 * downstream consumer would have to repair. A caller that must reproduce a
 * knowingly-malformed payer artifact drops to the general `buildInterchange`,
 * which applies no domain guard.
 */

/**
 * Stable string codes for every {@link ServicesReview278BuildError}. Locked
 * here so consumers can narrow exhaustively on `err.code`; additions-only
 * thereafter (renaming any code is a breaking change).
 *
 * - `X12_278_BUILD_INVALID_HIERARCHY` — the nested tree cannot form a valid
 *   278 HL spine (a subscriber with neither a review nor a dependent; a
 *   dependent with no review). The message carries structural indices +
 *   counts only — never a member id / name.
 * - `X12_278_BUILD_INVALID_SPEC` — a non-hierarchy precondition failed (a
 *   review with no `requestCategoryCode`; a request spec carrying an `HCR`
 *   certification decision — `HCR` is response-only; a response review with a
 *   decision whose `actionCode` is empty; an over-long ISA-13 control
 *   number).
 *
 * @example
 * ```ts
 * import { AUTH_278_BUILD_ERROR_CODES, ServicesReview278BuildError, build278Response } from "@cosyte/x12";
 * try {
 *   build278Response(spec);
 * } catch (err) {
 *   if (
 *     err instanceof ServicesReview278BuildError &&
 *     err.code === AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_HIERARCHY
 *   ) {
 *     // the hierarchy is impossible — fix the tree, do not emit
 *   }
 * }
 * ```
 */
export const AUTH_278_BUILD_ERROR_CODES = {
  X12_278_BUILD_INVALID_HIERARCHY: "X12_278_BUILD_INVALID_HIERARCHY",
  X12_278_BUILD_INVALID_SPEC: "X12_278_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link AUTH_278_BUILD_ERROR_CODES}. Used as
 * {@link ServicesReview278BuildError}.`code`.
 */
export type ServicesReview278BuildErrorCode =
  (typeof AUTH_278_BUILD_ERROR_CODES)[keyof typeof AUTH_278_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-278.js".build278Request} / {@link
 * "./build-278.js".build278Response} when the supplied services-review spec
 * cannot be emitted as a conformant, self-consistent 278 — most importantly
 * when its nested tree cannot form a valid HL hierarchy, or when a response's
 * `HCR` certification action is missing the verbatim `actionCode` the builder
 * is forbidden to infer. Carries a stable `code` for programmatic narrowing.
 * Deliberately does NOT extend `X12ParseError` or `X12BuildError` — the
 * domain-refusal distinction matters at the type level.
 *
 * @example
 * ```ts
 * import { ServicesReview278BuildError } from "@cosyte/x12";
 * try {
 *   build278Request(spec);
 * } catch (err) {
 *   if (err instanceof ServicesReview278BuildError) {
 *     // err.code is one of AUTH_278_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class ServicesReview278BuildError extends Error {
  public readonly code: ServicesReview278BuildErrorCode;

  /** @internal */
  public constructor(code: ServicesReview278BuildErrorCode, message: string) {
    super(message);
    this.name = "ServicesReview278BuildError";
    this.code = code;
  }
}

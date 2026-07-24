/**
 * Thrown errors raised by the 837 domain builders ({@link
 * "./build-837.js".build837P} / {@link "./build-837.js".build837I} / {@link
 * "./build-837.js".build837D}). Distinct from the general `X12BuildError`
 * (a structurally impossible envelope): `Claim837BuildError` is raised when
 * a CLAIM spec is structurally impossible to emit as a conformant 837 -
 * most importantly when the nested billing-provider → subscriber →
 * (claims | patient) tree cannot form a valid HL hierarchy spine.
 *
 * The HL spine is the 837's safety primitive. The read side
 * (`get837Claims`) is lenient - a real, payer-issued 837 with a broken HL
 * parent pointer is WARNED (`X12_HL_PARENT_MISMATCH`), never rejected,
 * because the parser must surface what actually arrived. The builder takes
 * the opposite stance: rather than emit a hierarchy a downstream payer
 * would have to repair (or silently mis-route a claim to the wrong
 * subscriber), it REFUSES. Because the builder COMPUTES the spine from the
 * tree (it never accepts caller-supplied HL ids / parent pointers), the
 * only way to reach an impossible spine is an empty / childless node - and
 * those are refused here before any segment is emitted.
 */

/**
 * Stable string codes for every {@link Claim837BuildError}. Locked here so
 * consumers can narrow exhaustively on `err.code`; additions-only
 * thereafter (renaming any code is a breaking change).
 *
 * - `X12_837_BUILD_INVALID_HIERARCHY` - the billing-provider → subscriber →
 *   (claims | patient) tree cannot form a valid HL spine: no billing
 *   providers, a billing provider with no subscribers, a subscriber with
 *   neither direct claims nor dependent patients, or a dependent patient
 *   with no claims.
 * - `X12_837_BUILD_INVALID_SPEC` - a non-hierarchy structural precondition
 *   failed: an empty `claimId`, a claim with no service lines, a service
 *   line whose `variant` does not match the builder, an empty procedure /
 *   revenue code, or an over-length control number.
 *
 * @example
 * ```ts
 * import { CLAIM_837_BUILD_ERROR_CODES, Claim837BuildError, build837P } from "@cosyte/x12";
 * try {
 *   build837P(spec);
 * } catch (err) {
 *   if (
 *     err instanceof Claim837BuildError &&
 *     err.code === CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_HIERARCHY
 *   ) {
 *     // the HL spine is impossible - fix the tree, do not emit
 *   }
 * }
 * ```
 */
export const CLAIM_837_BUILD_ERROR_CODES = {
  X12_837_BUILD_INVALID_HIERARCHY: "X12_837_BUILD_INVALID_HIERARCHY",
  X12_837_BUILD_INVALID_SPEC: "X12_837_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link CLAIM_837_BUILD_ERROR_CODES}. Used as
 * {@link Claim837BuildError}.`code`.
 */
export type Claim837BuildErrorCode =
  (typeof CLAIM_837_BUILD_ERROR_CODES)[keyof typeof CLAIM_837_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-837.js".build837P} / `build837I` / `build837D`
 * when the supplied claim spec cannot be emitted as a conformant,
 * self-consistent 837 - most importantly when the HL hierarchy spine is
 * structurally impossible. Carries a stable `code` for programmatic
 * narrowing. Messages are PHI-clean: they name structural positions
 * (indices, level codes) and counts, never patient names or member ids.
 *
 * @example
 * ```ts
 * import { Claim837BuildError } from "@cosyte/x12";
 * try {
 *   build837P(spec);
 * } catch (err) {
 *   if (err instanceof Claim837BuildError) {
 *     // err.code is one of CLAIM_837_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class Claim837BuildError extends Error {
  public readonly code: Claim837BuildErrorCode;

  /** @internal */
  public constructor(code: Claim837BuildErrorCode, message: string) {
    super(message);
    this.name = "Claim837BuildError";
    this.code = code;
  }
}

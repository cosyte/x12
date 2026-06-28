/**
 * Thrown errors raised by the 820 domain builder ({@link
 * "./build-820.js".build820}). Distinct from the general `X12BuildError` (a
 * structurally impossible envelope): {@link Premium820BuildError} is raised
 * when a premium-payment spec cannot be emitted as a conformant,
 * self-consistent 820 — most importantly when a remittance loop has no
 * segment that can open it (neither an `ENT` organization summary nor an
 * `NM1` individual), or carries no `RMR` open item.
 *
 * The read side ({@link "./get-820.js".get820Payments}) is lenient — a real
 * 820 with a stray, un-openable RMR / DTM is preserved verbatim, never
 * rejected. The builder takes the opposite stance: it REFUSES rather than
 * emit a remittance a downstream cash-poster would silently drop. A caller
 * that must reproduce a knowingly-malformed payer artifact drops to the
 * general `buildInterchange`, which applies no domain guard.
 *
 * The 820 carries no hard TR3 balance equation (the BPR-02 premium total is
 * not required to equal Σ of the RMR open items the way an 835 must
 * balance), so the builder emits all monetary amounts verbatim and does NOT
 * raise a balance-mismatch refusal.
 */

/**
 * Stable string codes for every {@link Premium820BuildError}. Locked here so
 * consumers can narrow exhaustively on `err.code`; additions-only thereafter
 * (renaming any code is a breaking change).
 *
 * - `X12_820_BUILD_INVALID_SPEC` — a structural precondition failed: no TRN
 *   trace, no remittance loop, a remittance with neither an `ENT` entity nor
 *   an `NM1` individual to open it, a remittance with no `RMR` open item, an
 *   open item with no identity (empty qualifier + reference id), or an
 *   over-long ISA-13 interchange control number. The message carries
 *   structural indices + counts only — never a member id / name (PHI
 *   discipline).
 *
 * @example
 * ```ts
 * import { PREMIUM_820_BUILD_ERROR_CODES, Premium820BuildError, build820 } from "@cosyte/x12";
 * try {
 *   build820(spec);
 * } catch (err) {
 *   if (
 *     err instanceof Premium820BuildError &&
 *     err.code === PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC
 *   ) {
 *     // the remittance structure is impossible — fix the spec, do not emit
 *   }
 * }
 * ```
 */
export const PREMIUM_820_BUILD_ERROR_CODES = {
  X12_820_BUILD_INVALID_SPEC: "X12_820_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link PREMIUM_820_BUILD_ERROR_CODES}. Used as
 * {@link Premium820BuildError}.`code`.
 */
export type Premium820BuildErrorCode =
  (typeof PREMIUM_820_BUILD_ERROR_CODES)[keyof typeof PREMIUM_820_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-820.js".build820} when the supplied premium
 * spec cannot be emitted as a conformant, self-consistent 820. Carries a
 * stable `code` for programmatic narrowing. Deliberately does NOT extend
 * `X12ParseError` or `X12BuildError` — the domain-refusal distinction
 * matters at the type level.
 *
 * @example
 * ```ts
 * import { Premium820BuildError } from "@cosyte/x12";
 * try {
 *   build820(spec);
 * } catch (err) {
 *   if (err instanceof Premium820BuildError) {
 *     // err.code is one of PREMIUM_820_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class Premium820BuildError extends Error {
  public readonly code: Premium820BuildErrorCode;

  /** @internal */
  public constructor(code: Premium820BuildErrorCode, message: string) {
    super(message);
    this.name = "Premium820BuildError";
    this.code = code;
  }
}

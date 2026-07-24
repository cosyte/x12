/**
 * Thrown errors raised by the 835 domain builder ({@link
 * "./build-835.js".build835}). Distinct from the general
 * `X12BuildError` (a structurally impossible envelope) and from
 * `AckBuildError` (the 999/TA1 disposition guard): `Remit835BuildError`
 * is raised when a remittance spec is *clinically* impossible - most
 * importantly, when the supplied amounts do not satisfy the TR3
 * 005010X221A1 §1.10.2 balance equations.
 *
 * Money is the largest blast radius in a remit. The read side (`get835`)
 * is lenient - a real, payer-issued, out-of-balance 835 is WARNED, never
 * rejected, because the parser must surface what actually arrived. The
 * builder takes the opposite stance, exactly as `build999` refuses to
 * fabricate an `Accept` against an error list: a library that EMITS an
 * out-of-balance remit would be telling a downstream provider that money
 * math holds when it does not - a cash-posting hazard. So `build835`
 * REFUSES an imbalanced spec rather than emit it. A caller that must
 * reproduce a knowingly-imbalanced payer artifact (e.g. for a regression
 * fixture) drops to the general `buildInterchange`, which applies no
 * domain guard.
 */

/**
 * Stable string codes for every {@link Remit835BuildError}. Locked here so
 * consumers can narrow exhaustively on `err.code`; additions-only
 * thereafter (renaming any code is a breaking change).
 *
 * - `X12_835_BUILD_BALANCE_MISMATCH` - a spec violated one of the three
 *   §1.10.2 balance invariants (service-line `SVC-02 == SVC-03 + Σ(line
 *   CAS)`, claim `CLP-03 == CLP-04 + Σ(claim+line CAS)`, or top-of-remit
 *   `BPR-02 == Σ(CLP-04) − Σ(PLB)`). The message names the invariant,
 *   the spec'd vs computed totals, and the delta - numeric values only,
 *   never PHI.
 * - `X12_835_BUILD_INVALID_SPEC` - a structural precondition failed (no
 *   trace supplied, a claim with no patient-control number, etc.).
 *
 * @example
 * ```ts
 * import { REMIT_835_BUILD_ERROR_CODES, Remit835BuildError, build835 } from "@cosyte/x12";
 * try {
 *   build835(spec);
 * } catch (err) {
 *   if (
 *     err instanceof Remit835BuildError &&
 *     err.code === REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_BALANCE_MISMATCH
 *   ) {
 *     // the remit does not balance - fix the amounts, do not emit
 *   }
 * }
 * ```
 */
export const REMIT_835_BUILD_ERROR_CODES = {
  X12_835_BUILD_BALANCE_MISMATCH: "X12_835_BUILD_BALANCE_MISMATCH",
  X12_835_BUILD_INVALID_SPEC: "X12_835_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link REMIT_835_BUILD_ERROR_CODES}. Used as
 * {@link Remit835BuildError}.`code`.
 */
export type Remit835BuildErrorCode =
  (typeof REMIT_835_BUILD_ERROR_CODES)[keyof typeof REMIT_835_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-835.js".build835} when the supplied remittance
 * spec cannot be emitted as a conformant, self-consistent 835 - most
 * importantly when it fails a §1.10.2 balance invariant. Carries a stable
 * `code` for programmatic narrowing. Deliberately does NOT extend
 * `X12ParseError` or `X12BuildError` - the domain-refusal distinction
 * matters at the type level.
 *
 * @example
 * ```ts
 * import { Remit835BuildError } from "@cosyte/x12";
 * try {
 *   build835(spec);
 * } catch (err) {
 *   if (err instanceof Remit835BuildError) {
 *     // err.code is one of REMIT_835_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class Remit835BuildError extends Error {
  public readonly code: Remit835BuildErrorCode;

  /** @internal */
  public constructor(code: Remit835BuildErrorCode, message: string) {
    super(message);
    this.name = "Remit835BuildError";
    this.code = code;
  }
}

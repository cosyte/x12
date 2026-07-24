/**
 * Thrown errors raised by the 834 domain builder ({@link
 * "./build-834.js".build834}). Distinct from the general `X12BuildError` (a
 * structurally impossible envelope): {@link Enrollment834BuildError} is
 * raised when an enrollment spec cannot be emitted as a conformant,
 * self-consistent 834 - most importantly when a member or coverage carries a
 * maintenance type code (`INS-03` / `HD-01`, X12 Code Source 875) the
 * builder cannot vouch for.
 *
 * Maintenance type is the safety-critical field of the 834: misreading a
 * termination (`024`) as a change (`001`) leaves a member enrolled who the
 * sponsor dropped, or drops a member the sponsor kept. The read side
 * ({@link "./get-834.js".get834Enrollments}) is lenient - an unknown
 * maintenance code on a *received* 834 is WARNED (the verbatim code is still
 * surfaced) so a consumer sees exactly what arrived. The builder takes the
 * opposite stance: it REFUSES to EMIT an action it cannot name, rather than
 * write a maintenance code a downstream enrollment system would mis-apply. A
 * caller that must reproduce a knowingly-nonstandard payer artifact drops to
 * {@link "../../builder/build-interchange.js".buildInterchange}, which
 * applies no domain guard.
 */

/**
 * Stable string codes for every {@link Enrollment834BuildError}. Locked here
 * so consumers can narrow exhaustively on `err.code`; additions-only
 * thereafter (renaming any code is a breaking change).
 *
 * - `X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE` - an `INS-03` or `HD-01`
 *   maintenance type code falls outside the X12 Code Source 875 subset the
 *   library validates against. The message carries the structural index of
 *   the affected member / coverage and the offending code (an X12 control
 *   code, never PHI).
 * - `X12_834_BUILD_INVALID_SPEC` - a non-maintenance precondition failed: no
 *   member loop, an empty (required) `INS-03`, or an over-long ISA-13
 *   interchange control number. The message carries structural indices +
 *   counts only - never a member id / name (PHI discipline).
 *
 * @example
 * ```ts
 * import { ENROLLMENT_834_BUILD_ERROR_CODES, Enrollment834BuildError, build834 } from "@cosyte/x12";
 * try {
 *   build834(spec);
 * } catch (err) {
 *   if (
 *     err instanceof Enrollment834BuildError &&
 *     err.code === ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE
 *   ) {
 *     // the maintenance action is unrecognized - fix the code, do not emit
 *   }
 * }
 * ```
 */
export const ENROLLMENT_834_BUILD_ERROR_CODES = {
  X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE: "X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE",
  X12_834_BUILD_INVALID_SPEC: "X12_834_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link ENROLLMENT_834_BUILD_ERROR_CODES}. Used
 * as {@link Enrollment834BuildError}.`code`.
 */
export type Enrollment834BuildErrorCode =
  (typeof ENROLLMENT_834_BUILD_ERROR_CODES)[keyof typeof ENROLLMENT_834_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-834.js".build834} when the supplied enrollment
 * spec cannot be emitted as a conformant, self-consistent 834 - most
 * importantly when a maintenance type code is outside the validated X12 875
 * subset. Carries a stable `code` for programmatic narrowing. Deliberately
 * does NOT extend `X12ParseError` or `X12BuildError` - the domain-refusal
 * distinction matters at the type level.
 *
 * @example
 * ```ts
 * import { Enrollment834BuildError } from "@cosyte/x12";
 * try {
 *   build834(spec);
 * } catch (err) {
 *   if (err instanceof Enrollment834BuildError) {
 *     // err.code is one of ENROLLMENT_834_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class Enrollment834BuildError extends Error {
  public readonly code: Enrollment834BuildErrorCode;

  /** @internal */
  public constructor(code: Enrollment834BuildErrorCode, message: string) {
    super(message);
    this.name = "Enrollment834BuildError";
    this.code = code;
  }
}

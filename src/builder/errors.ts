/**
 * Thrown errors emitted by the general-purpose interchange builder
 * (`buildInterchange`). Distinct from `X12ParseError` (the parser stays
 * lenient and never throws on real-world input) and from `AckBuildError`
 * (the ack-specific disposition guard): `X12BuildError` is raised when the
 * caller hands the builder a structurally impossible envelope spec - an
 * over-long ISA-13 control number, a malformed segment spec, and the like.
 * Surfacing these as a thrown, code-tagged error keeps the bug at the call
 * site rather than emitting a silently-malformed interchange.
 */

/**
 * Stable string codes for every {@link X12BuildError}. Locked here so
 * consumers can narrow on `err.code` exhaustively; additions-only thereafter
 * (renaming any code is a breaking change).
 *
 * - `X12_BUILD_INVALID_SPEC` - a spec field violated a structural constraint
 *   the builder cannot recover from (an ISA-13 / IEA-02 control number longer
 *   than the 9-char fixed width, a segment spec with no segment id, etc.).
 *
 * @example
 * ```ts
 * import { X12_BUILD_ERROR_CODES, X12BuildError } from "@cosyte/x12";
 * try {
 *   buildInterchange(spec);
 * } catch (err) {
 *   if (err instanceof X12BuildError && err.code === X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC) {
 *     // application bug - the envelope spec is structurally impossible
 *   }
 * }
 * ```
 */
export const X12_BUILD_ERROR_CODES = {
  X12_BUILD_INVALID_SPEC: "X12_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link X12_BUILD_ERROR_CODES}. Used as
 * {@link X12BuildError}.`code`.
 */
export type X12BuildErrorCode = (typeof X12_BUILD_ERROR_CODES)[keyof typeof X12_BUILD_ERROR_CODES];

/**
 * Thrown by {@link "./build-interchange.js".buildInterchange} when the
 * supplied envelope spec is structurally impossible. Carries a stable `code`
 * for programmatic narrowing. Deliberately does NOT extend `X12ParseError`
 * - the parser-vs-builder distinction matters at the type level.
 *
 * @example
 * ```ts
 * import { X12BuildError } from "@cosyte/x12";
 * try {
 *   buildInterchange({ ...spec, interchangeControlNumber: "0123456789" });
 * } catch (err) {
 *   if (err instanceof X12BuildError) {
 *     // err.code is one of X12_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class X12BuildError extends Error {
  public readonly code: X12BuildErrorCode;

  /** @internal */
  public constructor(code: X12BuildErrorCode, message: string) {
    super(message);
    this.name = "X12BuildError";
    this.code = code;
  }
}

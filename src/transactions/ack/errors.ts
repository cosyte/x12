/**
 * Thrown errors emitted by the X12 acknowledgment builders (`build999`,
 * `buildTA1`). Distinct from `X12ParseError` - the parsers stay lenient
 * (Postel's Law) and never throw on a real-world acknowledgment, but the
 * builders DO throw when the caller asks the library to fabricate an
 * inconsistent disposition. The safety invariant the library enforces:
 *
 * > A library can mechanically build the disposition it is told. It MUST
 * > NOT silently fabricate an `Accept` against a non-empty error list,
 * > because doing so would lie to the inbound sender that their input
 * > passed when it did not - a real downstream patient-safety hazard.
 *
 * This file is the chokepoint for that refusal.
 */

/**
 * Stable string codes for every `AckBuildError` thrown by the
 * acknowledgment builders. Locked here so consumers can narrow on
 * `err.code` exhaustively. Additions-only thereafter; renaming any of
 * these codes is a breaking change.
 *
 * - `X12_ACK_INVALID_DISPOSITION` - A disposition was supplied that does
 *   not match {@link "./codes.js".X12AckDispositionCode} (or
 *   {@link "./codes.js".Ta1AckCode} for `buildTA1`).
 * - `X12_ACK_INVALID_SPEC` - A spec field violated a structural constraint
 *   the builder cannot recover from (e.g., an ISA-13 control number longer
 *   than the spec's 9-char limit).
 * - `X12_ACK_ACCEPT_WITH_ERRORS` - An `A` disposition was supplied
 *   alongside non-empty per-transaction errors or a transaction-set whose
 *   own disposition is not `A`. Refused - accept must mean accept. Use
 *   `E` for "accepted, errors noted" or `R` for "rejected" instead.
 * - `X12_ACK_COUNT_MISMATCH` - The functional-level
 *   `numberOfTransactionSets` / `numberReceived` / `numberAccepted` are
 *   internally inconsistent (e.g., accepted > received) or do not match
 *   the supplied `transactionResponses` list.
 * - `X12_TA1_ACCEPT_WITH_NOTE` - A TA1 `A` ack code was supplied with a
 *   note code other than `000` (no error). Refused for the same safety
 *   reason: an accept cannot cite a non-zero note.
 *
 * @example
 * ```ts
 * import { ACK_BUILD_ERROR_CODES, AckBuildError } from "@cosyte/x12";
 * try {
 *   buildSomeAck();
 * } catch (err) {
 *   if (err instanceof AckBuildError && err.code === ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS) {
 *     // application bug - never silently accept with errors
 *   }
 * }
 * ```
 */
export const ACK_BUILD_ERROR_CODES = {
  X12_ACK_INVALID_DISPOSITION: "X12_ACK_INVALID_DISPOSITION",
  X12_ACK_INVALID_SPEC: "X12_ACK_INVALID_SPEC",
  X12_ACK_ACCEPT_WITH_ERRORS: "X12_ACK_ACCEPT_WITH_ERRORS",
  X12_ACK_COUNT_MISMATCH: "X12_ACK_COUNT_MISMATCH",
  X12_TA1_ACCEPT_WITH_NOTE: "X12_TA1_ACCEPT_WITH_NOTE",
} as const;

/**
 * String-literal union over {@link ACK_BUILD_ERROR_CODES}. Used as
 * `AckBuildError.code`.
 */
export type AckBuildErrorCode = (typeof ACK_BUILD_ERROR_CODES)[keyof typeof ACK_BUILD_ERROR_CODES];

/**
 * Thrown by `build999` / `buildTA1` when the caller asks the library to
 * fabricate an inconsistent acknowledgment (most notably an accept paired
 * with errors). Carries a stable `code` for programmatic narrowing.
 *
 * Throwing here is the documented contract for the cosyte ack archetype:
 * the library mechanically builds the disposition it is told; if the
 * disposition is internally inconsistent it refuses, surfacing the bug at
 * the call site rather than silently lying to the inbound sender.
 *
 * `AckBuildError` deliberately does NOT extend `X12ParseError` - the
 * parser-vs-builder distinction matters at the type level (a parser catch
 * should never catch a builder bug, and vice versa).
 *
 * @example
 * ```ts
 * import { AckBuildError, ACK_BUILD_ERROR_CODES } from "@cosyte/x12";
 * try {
 *   build999({ ... ack: { ..., functional: { disposition: "A", ... } }, ... });
 * } catch (err) {
 *   if (err instanceof AckBuildError) {
 *     // err.code is one of ACK_BUILD_ERROR_CODES
 *   }
 * }
 * ```
 */
export class AckBuildError extends Error {
  public readonly code: AckBuildErrorCode;

  /**
   * Construct a new `AckBuildError`. Both fields required so every thrower
   * pins a stable code.
   *
   * @internal
   */
  public constructor(code: AckBuildErrorCode, message: string) {
    super(message);
    this.name = "AckBuildError";
    this.code = code;
  }
}

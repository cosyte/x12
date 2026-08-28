/**
 * Thrown errors raised by the bundled code-list queries. Today there is exactly
 * one: the date-aware validity query refuses a document date it cannot read as
 * a calendar day.
 *
 * Why a throw rather than a fourth answer. The three-state result already
 * carries `indeterminate` for "the shipped data cannot decide", and folding a
 * caller's malformed input into that state would blur two different things: a
 * gap in what this package knows about a code, and a bug at the call site.
 * A refusal keeps the second where it belongs, and it keeps the guarantee that
 * every {@link "./meta.js".CodeValidityResult} answers a question about a real
 * calendar day.
 */

import { renderCallerJson } from "../builder/caller-value.js";

/**
 * Stable string codes for every {@link X12CodeListError}. Locked here so
 * consumers can narrow on `err.code` exhaustively; additions-only thereafter
 * (renaming any code is a breaking change).
 *
 * - `X12_CODE_LIST_INVALID_DOCUMENT_DATE` - the document date supplied to a
 *   date-aware code-list query was not a calendar day in `YYYY-MM-DD` or
 *   `CCYYMMDD` form.
 *
 * @example
 * ```ts
 * import { X12_CODE_LIST_ERROR_CODES, X12CodeListError, checkCarcValidity } from "@cosyte/x12";
 * try {
 *   checkCarcValidity("1", "2026-6-27");
 * } catch (err) {
 *   if (
 *     err instanceof X12CodeListError &&
 *     err.code === X12_CODE_LIST_ERROR_CODES.X12_CODE_LIST_INVALID_DOCUMENT_DATE
 *   ) {
 *     // application bug - the date was never a calendar day
 *   }
 * }
 * ```
 */
export const X12_CODE_LIST_ERROR_CODES = {
  X12_CODE_LIST_INVALID_DOCUMENT_DATE: "X12_CODE_LIST_INVALID_DOCUMENT_DATE",
} as const;

/**
 * String-literal union over {@link X12_CODE_LIST_ERROR_CODES}. Used as
 * {@link X12CodeListError}.`code`.
 */
export type X12CodeListErrorCode =
  (typeof X12_CODE_LIST_ERROR_CODES)[keyof typeof X12_CODE_LIST_ERROR_CODES];

/**
 * Thrown by the date-aware code-list queries when the supplied document date is
 * not a calendar day this package can read. Carries a stable `code` for
 * programmatic narrowing and the rejected value, so a caller can see WHICH
 * value was refused without re-deriving it from the message.
 *
 * Deliberately does NOT extend `X12ParseError` or `X12BuildError`: nothing here
 * parses a document or builds one, and the three are meant to stay tellable
 * apart at the type level.
 *
 * @example
 * ```ts
 * import { X12CodeListError, checkRarcValidity } from "@cosyte/x12";
 * try {
 *   checkRarcValidity("N4", "not-a-date");
 * } catch (err) {
 *   if (err instanceof X12CodeListError) {
 *     err.rejectedValue; // '"not-a-date"'
 *   }
 * }
 * ```
 */
export class X12CodeListError extends Error {
  public readonly code: X12CodeListErrorCode;

  /**
   * The refused value as it appears in `message`: a BOUNDED rendering, not the
   * caller's own object. It goes through the same renderer and the same ceiling
   * every other refusal in this library uses, so an over-long value cannot make
   * an unbounded `Error.message`, and `null`, `"null"` and an absent value stay
   * tellable apart.
   */
  public readonly rejectedValue: string;

  /** @internal */
  public constructor(code: X12CodeListErrorCode, message: string, rejectedValue: string) {
    super(message);
    this.name = "X12CodeListError";
    this.code = code;
    this.rejectedValue = rejectedValue;
  }
}

/**
 * Build the refusal for a document date that is not a calendar day. The single
 * construction site for {@link X12CodeListError}, so the message wording and
 * the bounded rendering cannot drift apart between call sites.
 *
 * @internal
 */
export function invalidDocumentDate(value: unknown): X12CodeListError {
  const rendered = renderCallerJson(value);
  return new X12CodeListError(
    X12_CODE_LIST_ERROR_CODES.X12_CODE_LIST_INVALID_DOCUMENT_DATE,
    `Document date must be a calendar day in YYYY-MM-DD or CCYYMMDD form, received ${rendered}.`,
    rendered,
  );
}

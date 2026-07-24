/**
 * Fatal error taxonomy for the `@cosyte/x12` parser pipeline. Four Tier-3
 * codes cover every unrecoverable structural failure in Phase 1; anything
 * less severe is a Tier-2 warning (see `./warnings.ts`). `X12ParseError` is
 * thrown directly; consumers narrow via the `code` discriminant. The set is
 * locked at 4 and is additions-only thereafter - adding a code is a
 * breaking-change tripwire (see `test/warning-codes.snapshot.test.ts`).
 */

import type { X12Position } from "./types.js";

/**
 * Stable string codes for every Tier-3 fatal `parseX12` may throw. Phase 1
 * locks the registry at four codes: anything else MUST be a Tier-2 warning.
 * Consumers narrow on `err.code` to react to specific structural failures.
 *
 * @example
 * ```ts
 * import { parseX12, FATAL_CODES, X12ParseError } from "@cosyte/x12";
 * try {
 *   parseX12("");
 * } catch (err) {
 *   if (err instanceof X12ParseError && err.code === FATAL_CODES.X12_EMPTY_INPUT) {
 *     // handle empty input
 *   }
 * }
 * ```
 */
export const FATAL_CODES = {
  X12_NO_ISA_HEADER: "X12_NO_ISA_HEADER",
  X12_ISA_TOO_SHORT: "X12_ISA_TOO_SHORT",
  X12_INVALID_DELIMITERS: "X12_INVALID_DELIMITERS",
  X12_EMPTY_INPUT: "X12_EMPTY_INPUT",
} as const;

/**
 * Discriminant type for `X12ParseError.code`. Narrowing a caught error by
 * this code lets consumers write exhaustive `switch` blocks (enabled by the
 * `switch-exhaustiveness-check` lint rule) and guarantees a typo-free
 * comparison against the `FATAL_CODES` registry.
 *
 * @example
 * ```ts
 * import type { X12FatalCode } from "@cosyte/x12";
 * function describe(code: X12FatalCode): string {
 *   switch (code) {
 *     case "X12_EMPTY_INPUT":
 *       return "input was empty";
 *     case "X12_NO_ISA_HEADER":
 *       return "missing ISA";
 *     case "X12_ISA_TOO_SHORT":
 *       return "ISA truncated";
 *     case "X12_INVALID_DELIMITERS":
 *       return "bad ISA delimiters";
 *   }
 * }
 * ```
 */
export type X12FatalCode = (typeof FATAL_CODES)[keyof typeof FATAL_CODES];

/**
 * Maximum chars retained on `X12ParseError.snippet`. The snippet may carry
 * PHI/PII when parsing real interchanges - keeping it bounded limits the
 * blast radius and pairs with the documented consumer-redaction boundary.
 * Roadmap §7 (PHI posture) sets the upper bound at ~64 chars; we cap at 63
 * + the 1-char Unicode ellipsis = 64 total.
 *
 * @internal
 */
const SNIPPET_MAX_INPUT = 63;

/**
 * Build a bounded snippet of input for attachment to a fatal error.
 * Truncates to {@link SNIPPET_MAX_INPUT} chars + a 1-char Unicode ellipsis
 * so the returned string is never longer than 64 chars.
 *
 * @internal
 */
export function snippet(input: string): string {
  return input.length > SNIPPET_MAX_INPUT ? input.slice(0, SNIPPET_MAX_INPUT) + "…" : input;
}

/**
 * Thrown by `parseX12` when the input violates one of the 4 unrecoverable
 * Tier-3 structural rules (missing ISA, truncated ISA, invalid ISA
 * delimiters, or empty input). Carries positional context plus a short
 * snippet of the offending input so consumers can log actionable errors.
 *
 * @remarks
 * Snippets may contain PHI/PII when parsing real interchanges (member IDs
 * appear in ISA-06/08 only as trading-partner IDs, not patient identity -
 * but real claim/eligibility bodies elsewhere in the input can carry PHI).
 * Redact at the call site if required by your compliance posture. The
 * library does not redact snippets itself.
 *
 * @example
 * ```ts
 * import { parseX12, X12ParseError } from "@cosyte/x12";
 * try {
 *   parseX12("");
 * } catch (err) {
 *   if (err instanceof X12ParseError && err.code === "X12_EMPTY_INPUT") {
 *     // handle empty input - err.position, err.snippet available
 *   }
 * }
 * ```
 */
export class X12ParseError extends Error {
  public readonly code: X12FatalCode;
  public readonly position: X12Position;
  public readonly snippet: string;

  /**
   * Construct a new `X12ParseError`. All four fields are required so every
   * thrower populates full positional context.
   *
   * @internal
   */
  public constructor(
    code: X12FatalCode,
    message: string,
    position: X12Position,
    snippetText: string,
  ) {
    super(message);
    this.name = "X12ParseError";
    this.code = code;
    this.position = position;
    this.snippet = snippetText;
  }
}

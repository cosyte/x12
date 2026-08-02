/**
 * The single route a caller-supplied value takes into a `build*` refusal
 * message.
 *
 * ## Why this exists
 *
 * The parse side closed its equivalent hole first: no warning factory takes a
 * value parameter at all, and `message` is a lookup into the frozen
 * `ALL_WARNING_MESSAGES` table, so a *document's* bytes cannot reach a
 * diagnostic (`PHI-WARNING-MESSAGE-LEAK`). The builder side is the mirror
 * image with one material asymmetry, and the claim made here is deliberately
 * narrower because of it:
 *
 * > **A builder refusal echoes the CALLER's value, not the document's.** The
 * > caller already holds that value - they just passed it in - so bounding it
 * > is **robustness and log hygiene, not redaction**. This module does not
 * > make a builder refusal PHI-safe, and nothing in this library claims it
 * > does. If a caller puts PHI in a control number, the refusal will show up
 * > to {@link BUILD_REFUSAL_VALUE_MAX_LENGTH} characters of it.
 *
 * What it does guarantee is that `Error.message` from a `build*` refusal has a
 * **fixed ceiling**. Before this, sixteen refusal sites across ten builder
 * modules interpolated a caller value verbatim, so a 120,000-character control
 * number produced a 120,066-byte `X12BuildError.message` - measured on this
 * tree, and the length grows without limit with the input. An unbounded
 * `Error.message` is a real operational hazard independent of PHI: it is what
 * gets serialized into a log line, a crash report, or a JSON error envelope.
 *
 * ## What is bounded and what is not
 *
 * - **Bounded:** the number of characters. The rendered fragment never exceeds
 *   {@link BUILD_REFUSAL_VALUE_MAX_RENDERED}.
 * - **NOT escaped, and this is not an oversight.** The surviving characters are
 *   whatever the caller supplied, including a segment terminator, a quote, or a
 *   newline. A refusal message is therefore bounded but not guaranteed to be a
 *   single log line. Escaping was considered and left out: it would expand the
 *   rendered length by up to 6x per character for a hazard the caller creates
 *   in their own data, and this slice makes the claim it can support and no
 *   wider.
 *
 * @see `src/parser/errors.ts` for the parse-side `SNIPPET_MAX_INPUT` bound this
 * mirrors, which is the one deliberate place a *document's* bytes are copied.
 */

/**
 * How many characters of a caller-supplied value survive into a `build*`
 * refusal message. Set to mirror the parser's own `SNIPPET_MAX_INPUT` (63),
 * so the two bounded copies in this library agree rather than each picking a
 * number. Comfortably wider than every slot it guards: an ISA-13 / IEA-02
 * control number is 9, a TA1-05 note code 3, an ST-01 transaction set id 3, an
 * 834 maintenance type 2-3, an 837 service-line variant 1.
 *
 * @example
 * ```ts
 * import { BUILD_REFUSAL_VALUE_MAX_LENGTH } from "@cosyte/x12";
 * BUILD_REFUSAL_VALUE_MAX_LENGTH; // 63
 * ```
 */
export const BUILD_REFUSAL_VALUE_MAX_LENGTH = 63;

/**
 * Widest possible decimal rendering of a JavaScript string's `length`. V8's
 * maximum string length is 2^32 - 2 on 64-bit builds, which is ten digits, so
 * the ` (N characters)` suffix cannot exceed this. Stated rather than assumed
 * because {@link BUILD_REFUSAL_VALUE_MAX_RENDERED} is asserted as an exact
 * ceiling in the suite. @internal
 */
const MAX_LENGTH_DIGITS = 10;

/**
 * Hard ceiling, in characters, on the fragment {@link renderCallerValue}
 * returns: {@link BUILD_REFUSAL_VALUE_MAX_LENGTH} surviving characters, two
 * quotes, one ellipsis, and the ` (N characters)` suffix at its widest.
 *
 * A refusal message's total length is this plus the site's own fixed template
 * text, so every `build*` refusal message is bounded by a constant. The suite
 * proves that by driving a 120,000-character value into every caller-value
 * slot and asserting the resulting `Error.message` stays under a fixed bound.
 *
 * @example
 * ```ts
 * import { BUILD_REFUSAL_VALUE_MAX_RENDERED } from "@cosyte/x12";
 * BUILD_REFUSAL_VALUE_MAX_RENDERED; // 92
 * ```
 */
export const BUILD_REFUSAL_VALUE_MAX_RENDERED =
  BUILD_REFUSAL_VALUE_MAX_LENGTH + 2 + 1 + " ( characters)".length + MAX_LENGTH_DIGITS;

/**
 * Render a caller-supplied value as a bounded, quoted fragment for a `build*`
 * refusal message. **This is the only sanctioned route a caller value takes
 * into a thrown message**, and `test/builder-refusal-bounds.test.ts` scans
 * `src/` to prove no other route exists - a seventeenth refusal site that
 * interpolates a value directly reds that test.
 *
 * Returns the value quoted when it fits, and otherwise the first
 * {@link BUILD_REFUSAL_VALUE_MAX_LENGTH} characters, an ellipsis, and the true
 * length - the length is the diagnostically useful part when the value is
 * over-long, since that is usually *why* the builder refused.
 *
 * @example
 * ```ts
 * import { renderCallerValue } from "@cosyte/x12";
 * renderCallerValue("000000001");        // '"000000001"'
 * renderCallerValue("9".repeat(120000)); // '"999…" (120000 characters)'
 * ```
 */
export function renderCallerValue(value: string): string {
  if (value.length <= BUILD_REFUSAL_VALUE_MAX_LENGTH) return `"${value}"`;
  return `"${value.slice(0, BUILD_REFUSAL_VALUE_MAX_LENGTH)}…" (${String(value.length)} characters)`;
}

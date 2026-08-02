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
 * > **A builder refusal echoes a value the CALLER passed in, which is usually
 * > but NOT ALWAYS their own.** They just handed it to the builder, so bounding
 * > it is **robustness and log hygiene, not redaction**. This module does not
 * > make a builder refusal PHI-safe, and nothing in this library claims it
 * > does. If a caller puts PHI in a control number, the refusal will show up
 * > to {@link BUILD_REFUSAL_VALUE_MAX_LENGTH} characters of it.
 *
 * **Do not state that dichotomy categorically, because the ack builders break
 * it.** `build999` renders the AK2-02 transaction-set control number and
 * `buildTA1` exists to echo an inbound ISA-13: TR3 005010X231A1 requires AK2-02
 * to be a verbatim copy of the acknowledged transaction set's ST-02, so on the
 * ack path a *document's* bytes reach the spec by the standard's own design,
 * and from there a refusal message. They are envelope control numbers rather
 * than clinical content, and they are bounded here like everything else - but
 * "the value is always the caller's own" is false, and this library should not
 * say it.
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
 * Widest decimal rendering of a JavaScript string's `length` this bound allows
 * for. Measured on the Node 22 this package targets,
 * `buffer.constants.MAX_STRING_LENGTH` is 536,870,888 (2^29 - 24), which is
 * **nine** digits; ten is carried deliberately as one digit of headroom against
 * a future engine limit, not because any engine needs it today. An earlier
 * revision of this comment claimed 2^32 - 2, which is simply wrong - the
 * conclusion erred conservative, but the stated ground did not hold. @internal
 */
const MAX_LENGTH_DIGITS = 10;

/**
 * Hard ceiling, in characters, on the fragment {@link renderCallerValue}
 * returns: {@link BUILD_REFUSAL_VALUE_MAX_LENGTH} surviving characters, two
 * quotes, one ellipsis, and the ` (N characters)` suffix at its widest.
 *
 * **This is the bound on the FRAGMENT, not on the message.** A refusal message
 * is this plus the site's own fixed template text, which differs per site, so
 * the message is bounded by a constant but not by *this* constant. Measured on
 * this tree: a 120,000-character control number gives an 86-character fragment
 * and a **150-character** `X12BuildError.message` from `buildInterchange`. Do
 * not quote the ceiling as though it were a message length - an earlier
 * revision of the docs did exactly that, reporting "now 90 bytes" for a message
 * that is 150. The suite asserts the fragment against this constant and each
 * message against its own site.
 *
 * @example
 * ```ts
 * import { BUILD_REFUSAL_VALUE_MAX_RENDERED } from "@cosyte/x12";
 * BUILD_REFUSAL_VALUE_MAX_RENDERED; // 90
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
export function renderCallerValue(value: string | number): string {
  const text = coerce(value);
  if (text.length <= BUILD_REFUSAL_VALUE_MAX_LENGTH) return `"${text}"`;
  return `"${text.slice(0, BUILD_REFUSAL_VALUE_MAX_LENGTH)}…" (${String(text.length)} characters)`;
}

/**
 * Coerce defensively before measuring.
 *
 * **This is not belt-and-braces; it is a regression this function caused once.**
 * Every one of these sites previously interpolated the value into a template
 * literal, which coerces anything. Reading `.length` and `.slice` directly does
 * not: a JavaScript or JSON-driven caller who passes a *number* where the types
 * say `string` - a control number off `JSON.parse`, say - turned a typed,
 * code-tagged `X12BuildError` into an uncaught `TypeError` with no `code` at
 * all, which is precisely the surface this library tells consumers to branch
 * on. A TypeScript caller could not reach it; the published `@cosyte/cli` path
 * could. The refusal must survive whatever it is handed, so coercion never
 * throws either. @internal
 */
function coerce(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    // A `toString` that throws (a null-prototype object, a hostile proxy).
    return "[unrenderable value]";
  }
}

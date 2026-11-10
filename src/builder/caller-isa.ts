/**
 * The single route a caller value takes into a fixed-width ISA element.
 *
 * ASC X12 .5 fixes every ISA element at a width, and the ISA is positional: a
 * receiver reads ISA-06 as bytes 36 to 50 whatever they hold. Each builder
 * used to carry a private `pad` that filled a short value with spaces and
 * sliced a long one down to the width, with no warning and no error. Measured
 * before this module:
 *
 * ```text
 * buildInterchange({ ...spec, interchangeDate: "20250101" }).isa.elements[9] === "202501"
 * ```
 *
 * The interchange was well-formed, reconciled, and named a date the caller
 * never gave. An over-long sender or receiver id, qualifier or time was cut
 * the same way. Builders refuse what they cannot emit exactly, so an over-long
 * value now refuses here, with the calling builder's own typed error.
 *
 * A value that is not a string refuses too. `pad(1, 15)` used to reach
 * `value.slice` and throw an untyped `TypeError`; with the slice gone it would
 * have padded nothing and emitted a short ISA, which is worse, so the type is
 * checked first.
 *
 * What this does NOT check: the content. A value carrying the element
 * separator still reaches the wire as that byte, as `KNOWN-LIMITATIONS.md`
 * records, and an empty value still pads to all spaces.
 */

import { describeCallerValue } from "./caller-string.js";

/**
 * Pad a caller value to its fixed ISA width with trailing spaces, refusing one
 * that is not a string or is longer than the width.
 *
 * The refusal names the builder, the spec field and the ISA element, and the
 * value's length, never the value itself.
 *
 * @param value the caller-supplied value, typed as a string and not trusted to
 * be one
 * @param width the fixed width ASC X12 .5 gives the element
 * @param element the ISA element, e.g. `"ISA-06"`. A library-owned literal.
 * @param field the spec property the caller sets, e.g. `"senderId"`. A
 * library-owned literal, never caller text.
 * @param at a library-owned locator naming the builder, e.g. `"build837"`
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
export function padIsaElement(
  value: string,
  width: number,
  element: string,
  field: string,
  at: string,
  refuse: (message: string) => never,
): string {
  if (typeof value !== "string") {
    refuse(
      `${at}: ${field} must be a string, but received ${describeCallerValue(value)}. ` +
        `${element} is a fixed-width ISA element and this builder never coerces one, so nothing ` +
        `is emitted. Convert ${field} at the call site.`,
    );
  }
  if (value.length > width) {
    refuse(
      `${at}: ${field} is ${String(value.length)} characters, and ${element} holds ` +
        `${String(width)}. This builder never cuts a value to fit, so nothing is emitted. ` +
        `Shorten ${field} at the call site.`,
    );
  }
  return value + " ".repeat(width - value.length);
}

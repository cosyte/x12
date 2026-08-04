/**
 * The **structural backstop** under `caller-string.ts` and `caller-decimal.ts`:
 * every element of every emitted segment is a real string, checked at the join,
 * on every route into the document.
 *
 * ## Why this exists, which is a claim problem and not only a code one
 *
 * `caller-string.ts` guards values routed through a builder's `esc` helper, and
 * it says so in a deliberately un-falsifiable form because **two consecutive
 * adversarial rounds published an exhaustive census of the slots that bypass
 * `esc` and both were measured false** - first "the single route a
 * caller-supplied element value takes into an emitted segment", then "SEVEN
 * string-typed positions". Each round found one more. The remedy on round three
 * was to cut the claim back rather than grow the census, which was right, but it
 * left the library with a disclosure where a property belonged: *some* slots are
 * guarded, and finding another unguarded one is "expected and not a new
 * finding".
 *
 * A census is the wrong instrument. This module is the right one: `esc` is
 * **optional** on any given slot, but the join is not - a segment that is not
 * joined is not emitted. Guarding here makes the statement structural, so it
 * cannot be falsified by finding one more slot, because one more slot still
 * joins.
 *
 * ## What it does and does not claim
 *
 * > **No non-string value reaches an element of a segment emitted through a
 * > builder's `seg` / `joinSeg` helper.**
 *
 * **Read the `seg` / `joinSeg` qualifier literally, because a refuter measured a
 * draft of this file that dropped it.** That draft said "any builder emits", and
 * `buildTA1` does not use either helper: it emits `["TA1", ...five caller
 * values].join(sep)` directly, with no `esc` and no `pad`, so nothing checks it
 * and a numeric or `undefined` TA1-01 is emitted silently. That is
 * `PRE-EXISTING` and unchanged here; it is named below and pinned in
 * `test/builder-segment-type.test.ts` rather than papered over. The lesson is
 * the same one the census drafts taught: the qualifier is the claim.
 *
 * Deliberately **not** claimed:
 *
 * - **It is a type guard, not an escape.** A `string` carrying an active
 *   delimiter still passes here and is still emitted verbatim if the slot did
 *   not route through `esc`; `build999` with `groupControlNumber: "1*BOGUS"`
 *   shifting GS-07/GS-08 by one is a *different* defect, closed on the named
 *   slots by routing them through `esc` in this same slice, and this module
 *   would not have caught it. Type and delimiter safety are separate
 *   properties and only one of them is structural.
 * - **`buildTA1` is outside it**, per the paragraph above. TA1-01 is data
 *   element I12, the interchange control number echoed from ISA-13 and the
 *   reassociation key back to the acknowledged interchange, so a silently empty
 *   one is not a small thing. Filed as its own item; widening this guard into a
 *   public builder is a behaviour change that deserves its own graded slice.
 * - **The fixed-width ISA line is outside it.** Every builder assembles ISA by
 *   `[...].join(elementSeparator)` directly, not through `seg`, because its
 *   elements are `pad`ed to width rather than escaped. Those slots remain as
 *   `caller-string.ts` discloses them: `pad(1, 15)` throws an untyped
 *   `TypeError` and `padControl(1, 9)` throws a typed but misleadingly-worded
 *   refusal. Both terminate, neither is silent, and neither is improved here.
 *
 * ## It names the element position, which `esc` cannot
 *
 * `caller-string.ts` records as a limit that its refusal names the **builder**,
 * not the slot, because `esc` is unary and threading a locator through every
 * invocation would be that many chances to mislabel one. The join does not have
 * that problem: it holds the whole segment, so `parts[0]` is the segment id and
 * index `i` is element `i` by the X12 1-indexed convention. `"build999: HL-03"`
 * costs nothing here and is derived, so it cannot drift out of step with the
 * emitted order the way a hand-written locator would.
 *
 * @see `test/builder-segment-type.test.ts` - the source gate that requires
 * every builder's segment joiner to run this check.
 */

import { renderCallerValue } from "./caller-value.js";

/**
 * Describe a wrong-typed element without echoing it unbounded. Same shape and
 * same reasoning as the sibling describers in `caller-string.ts` and
 * `caller-decimal.ts`; shares {@link renderCallerValue} so the bound on what
 * reaches an `Error.message` stays one number in one place.
 * @internal
 */
function describeSegmentValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "object") return Array.isArray(value) ? "an array" : "an object";
  if (type === "function") return "a function";
  return `a ${type} (${renderCallerValue(value as string)})`;
}

/**
 * Name a slot the way the X12 spec does - `"HL-03"`, `"AK9-01"` - from the
 * segment id at `parts[0]` and the element's own index.
 *
 * The segment id is caller-influenced only in `buildInterchange`, where a
 * {@link "./types.js".SegmentSpec} is `[segmentId, ...elements]` supplied
 * wholesale. So it is bounded through {@link renderCallerValue} rather than
 * interpolated, and a non-string id degrades to a positional locator instead of
 * rendering as `"undefined-03"`.
 * @internal
 */
function locateSlot(parts: readonly string[], index: number): string {
  const id = parts[0];
  const position = String(index).padStart(2, "0");
  if (typeof id !== "string" || id.length === 0) return `element ${String(index)}`;
  return `${renderCallerValue(id)}-${position}`;
}

/**
 * Require every element of a segment to be a real string before it is joined
 * into the document, and refuse with the calling builder's own typed error if
 * one is not.
 *
 * Checks `parts[0]` (the segment id) too, at index 0, because
 * `buildInterchange` takes it from the caller. Returns `void` rather than the
 * array: unlike {@link "./caller-string.js".requireCallerString} there is
 * nothing to narrow, and every caller already holds `parts`.
 *
 * @param parts the assembled segment as `[segmentId, ...elements]`, typed
 * `readonly string[]` and not trusted to be one
 * @param at a library-owned locator naming the builder, e.g. `"build999"`.
 * Never caller text.
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
export function requireCallerSegment(
  parts: readonly string[],
  at: string,
  refuse: (message: string) => never,
): void {
  // Iterated, not indexed against `.length`, and that is a correctness point
  // rather than a style one - it is the same defect this module exists to stop,
  // one layer up. An index loop bounded on the array's own `length` property,
  // run over a forged array-like whose `length` is `undefined`, compares `0`
  // against `undefined`, gets false, and runs zero iterations - so the guard
  // would report every segment clean without examining one element of it.
  // `for...of` on the same object throws instead.
  // `test/builder-array-bounds.test.ts` refused the indexed draft.
  let index = 0;
  for (const part of parts) {
    if (typeof part !== "string") {
      refuse(
        `${at}: ${locateSlot(parts, index)} must be a string, but received ${describeSegmentValue(part)}. ` +
          `Values are never coerced - a JavaScript number cannot carry a leading-zero identifier, ` +
          `so converting here could emit a different value than the caller sent. Convert at the call site.`,
      );
    }
    index += 1;
  }
}

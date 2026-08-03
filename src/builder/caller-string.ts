/**
 * The single route a caller-supplied element value takes **through a builder's
 * `esc` helper**, and the decision it encodes: **a non-string reaching `esc` is
 * refused, never coerced.**
 *
 * **Read that scope literally, because an earlier draft of this line said "the
 * single route a caller-supplied ELEMENT VALUE takes into an emitted segment"
 * and adversarial review was right to reject it.** Two measured classes of
 * element value do not pass through here at all, and both are enumerated under
 * "What this does NOT cover" below. This module is the chokepoint on `esc`, not
 * on emission.
 *
 * ## The defect this exists to stop, which is a silently DROPPED identifier
 *
 * `src/builder/caller-value.ts` bounds what a refusal *says*.
 * `src/builder/caller-array.ts` bounds whether a refusal *happens* when a
 * caller forges a list. This module bounds whether an element the caller
 * supplied and routed through `esc` actually *reaches the document*.
 *
 * Every builder escaped its element values through one helper:
 *
 * ```ts
 * const esc = (value: string): string => escapeRelease(value, delimiters);
 * ```
 *
 * `escapeRelease` opens with `if (value.length === 0) return value;` and then
 * loops to `value.length`. On a **number** `.length` is `undefined`:
 * `undefined === 0` is false, so the early return does not fire, and
 * `i < undefined` is false, so the loop body never runs. The function returns
 * the empty accumulator. **A number handed to a string element is emitted as
 * `""`, with no warning and no error.**
 *
 * Measured on this tree at base commit `143a6ea`, with `build835` and an
 * otherwise-balanced remit:
 *
 * ```text
 * patientControlNumber: "PT-ACCT-001"  ->  CLP*PT-ACCT-001*1*500.00*450.00*...
 * patientControlNumber: 1              ->  CLP**1*500.00*450.00*...        warnings = 0
 * ```
 *
 * The interchange is frozen, successful-looking, and missing **CLP-01**, which
 * TR3 005010X221A1 Loop 2100 marks required and which is the reassociation key
 * back to the 837's CLM-01. Losing it silently breaks the claim-to-payment
 * link. The same `esc` helper carries every string element of all nine
 * builders, so the class is not one field.
 *
 * **The builder's own required-field guard does not catch it, and that is the
 * sharpest part.** `build-835.ts` refuses `patientControlNumber === ""` by
 * name. A number is not `""`, so it passes the guard, and *then* becomes `""`
 * one line later inside `esc`. The library already decided this element may not
 * be empty; the type confusion walks around the decision.
 *
 * ## Why REFUSE and not coerce
 *
 * Both are defensible in the abstract and the base state was neither, which is
 * why the remedy was filed as a decision. Refusal wins on four measured
 * grounds:
 *
 * 1. **Coercion would mint a *different* identifier, which is worse than a
 *    missing one.** A caller whose JSON carried `"0012345"` as a number has
 *    already lost the leading zeros before the library sees it;
 *    `String(12345)` emits a well-formed identifier that is **not the one the
 *    caller sent**. An absent CLP-01 fails reassociation loudly at the payer; a
 *    silently renumbered one reassociates to the **wrong claim**. Given the
 *    choice between dropping a patient identifier and inventing a plausible
 *    one, a healthcare library must do neither, and refusing is the only option
 *    that does neither.
 * 2. **A JavaScript number has no X12 lexical form.** `String(1e21)` is
 *    `"1e+21"`, `String(NaN)` is `"NaN"`, `String(0.1 + 0.2)` is
 *    `"0.30000000000000004"`, and `String(-0)` is `"0"`. None are valid in an
 *    `AN`, `ID` or `Nn` element. Coercion would emit every one of them without
 *    a warning. **And this is not hypothetical in this package: the 36 `esc`
 *    slots that read `.toString()` off an `X12Decimal` emit exactly those three
 *    strings today for a raw `number`, measured and unchanged by this slice.**
 *    See "What this does NOT cover". `X12Decimal` is the sanctioned route for
 *    numeric content, so a bare `number` in an element slot is never the right
 *    thing to have been handed - but passing one is not currently refused
 *    everywhere either, and this module should not imply that it is.
 * 3. **No caller who was getting the value into the document is broken by
 *    refusing.** The objection to refusal is that JS/JSON callers pass numbers
 *    today - but what they get today is a document with the field gone. There
 *    is no numeric path that works and would stop working. **One measured
 *    exception, which is why this is not phrased absolutely:** a boxed
 *    `new String("PT-ACCT-001")` built cleanly at base (it has `.length` and
 *    `.charAt`) and is refused here, because `typeof` it is `"object"`.
 *    Refusing it is the right call, but it did previously build.
 * 4. **Emit is the strict half of this library by standing convention.**
 *    Postel's Law is applied deliberately asymmetrically here: lenient on
 *    parse, spec-clean on emit. Coercing a caller's mistake into a document is
 *    leniency on the wrong side of that line.
 *
 * ## The `#51` asymmetry is deliberate, not an inconsistency
 *
 * `X12-BUILDER-BOUNDS` (`#51`) made {@link
 * "./caller-value.js".renderCallerValue} **coerce** for exactly this caller
 * mistake, and this module **refuses** it. Same package, same wrong type,
 * opposite answer - because the two functions have opposite obligations:
 *
 * - `renderCallerValue` renders a **diagnostic**. If it throws, it replaces a
 *   typed, code-tagged error with an uncaught `TypeError` carrying no `code`,
 *   destroying the very surface consumers are told to branch on. Its duty is to
 *   **survive anything**.
 * - `esc` renders **document content**. If it invents, the caller ships a claim
 *   or a remittance carrying a value they never supplied. Its duty is to
 *   **invent nothing**.
 *
 * A refusal message must never fail; a document must never lie. Those pull in
 * opposite directions on purpose.
 *
 * ## What this does NOT cover, measured rather than assumed
 *
 * - **The ISA/GS fixed-width slots do not go through `esc`.** They go through
 *   each module's `pad` / `padControl`, and a number there already terminates
 *   rather than emitting empty: `pad(1, 15)` throws an untyped `TypeError`
 *   (`value.slice is not a function`) and `padControl(1, 9)` throws the
 *   module's typed refusal with the **misleading** text "exceeds the 9-char
 *   spec limit". Both are wrong in their own way and neither is silent, so they
 *   are a different defect from this one. Unchanged here and disclosed in
 *   `KNOWN-LIMITATIONS.md`.
 * - **`buildTA1` has no `esc` at all** - every TA1 element is fixed-width and
 *   goes through `pad`. It is outside this chokepoint by construction, not by
 *   omission.
 * - **SEVEN string-typed element positions never call `esc` at all**, so this
 *   chokepoint never sees them and a number is still emitted verbatim with
 *   `warnings.length === 0`. Measured identical at base `143a6ea` and at head:
 *   `build999`'s `envelope.groupControlNumber` (GS-06 / GE-02) gives
 *   `GS*FA*…*12345*X*005010X231A1` and `GE*1*12345`; its
 *   `envelope.transactionSetControlNumber` (ST-02 / SE-02) gives `ST*999*12345*…`
 *   and `SE*6*12345`; its `functionalGroup.disposition` (AK9-01) gives
 *   `AK9*12345*1*1*1`; `response.disposition` (IK5-01) and `build278`'s
 *   `review.levelCode` (HL-03) are the same shape. **AK9-01 is the sharpest:**
 *   it is an `ID` element bound to X12 code source 715, so `12345` tells a
 *   receiver nothing about whether the group was accepted, and `build999`'s own
 *   `X12_ACK_ACCEPT_WITH_ERRORS` guard compares `disposition === "A"`, which a
 *   number walks past exactly the way it walked past `build835`'s
 *   `patientControlNumber === ""`. **This is the same mechanism as the filed
 *   defect, in a builder this slice otherwise fixes.** It is `PRE-EXISTING`,
 *   outside the item's stated `esc()` scope, unchanged here, pinned in
 *   `test/builder-string-type.test.ts` and disclosed in `KNOWN-LIMITATIONS.md`.
 * - **THIRTY-SIX `esc` slots read `.toString()` off what the types say is an
 *   `X12Decimal`**, so a raw `number` arrives here already a string and is
 *   passed through. Counted comment-stripped on this tree: 12 in `build-837`,
 *   12 in `build-835`, 4 in `build-820`, 4 in `build-277`, 3 in `build-271`, 1
 *   in `build-834`. Measured identical at base and head, `warnings.length === 0`
 *   in all three: a `patientResponsibilityAmount` of `0.1 + 0.2` emits
 *   `CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…`, `1e21` emits
 *   `…*1e+21*…`, and `NaN` emits `…*NaN*…`. Closing this is a different
 *   decision from the one this module makes (whether an element slot may take
 *   anything but an `X12Decimal` instance), so it is disclosed, not fixed.
 * - **The refusal names the BUILDER, not the element position.** `esc` is unary
 *   and invoked **411 times on 378 lines** across the nine modules (counted
 *   comment-stripped on this tree, `ctx.esc(...)` included, and pinned by the
 *   gate so the figure cannot drift); threading a per-slot locator through every
 *   one of them would be 411 opportunities to mislabel a slot, which is a worse
 *   trade than a message that names the builder and echoes the offending value
 *   bounded. Stated as a limit rather than claimed away. **An earlier draft
 *   published "378 call sites", which is the LINE count.**
 *
 * @see `test/builder-string-type.test.ts` - the source gate that requires every
 * builder module to build its `esc` through {@link makeCallerEscaper}.
 */

import type { Delimiters } from "../parser/types.js";
import { escapeRelease } from "../parser/release.js";

import { renderCallerValue } from "./caller-value.js";

/**
 * Describe a wrong-typed element value without echoing it unbounded.
 *
 * Deliberately a second describer rather than a reuse of
 * `caller-array.ts`'s `describeShape`: that one exists to explain why a value
 * is not a *list* ("an array-like object with length 3"), and its phrasings
 * would read as nonsense here. What is shared is the part that matters -
 * {@link renderCallerValue}, so the bound on what reaches an `Error.message` is
 * one number in one place.
 *
 * An `object` or `function` is described by type ALONE and never echoed.
 * `Object.prototype.toString` reads `Symbol.toStringTag`, and a caller can set
 * that to a 120,000-character string; `String(value)` runs a caller-supplied
 * `toString`. Neither is worth running to name a type that is already wrong.
 * @internal
 */
function describeCallerValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "object") return Array.isArray(value) ? "an array" : "an object";
  if (type === "function") return "a function";
  // `renderCallerValue` coerces in a try/catch and never throws, so a `symbol`
  // (which a template literal would throw on) and a `bigint` are both safe.
  return `a ${type} (${renderCallerValue(value as string)})`;
}

/**
 * Require a caller-supplied element value to be a real string before it is
 * escaped into a segment, and refuse with the calling builder's own typed error
 * if it is not.
 *
 * `refuse` is passed in rather than thrown from here for the same reason
 * {@link "./caller-array.js".requireCallerArray} takes one: each builder owns a
 * distinct error class and error code that consumers branch on
 * (`Remit835BuildError` / `X12_835_BUILD_INVALID_SPEC` and its eight siblings),
 * and a shared helper throwing a shared error would quietly widen every one of
 * those contracts. Its return type is `never`, so a caller that forgets to
 * throw is a type error rather than a fall-through.
 *
 * **`null` and `undefined` are refused here, and that is the opposite of
 * `requireCallerArray`** - which answers both as "absent" because every site it
 * replaced read `x.dates ?? []`. No `esc` site has an absent-means-empty
 * default: an optional element is already resolved to `""` or omitted from the
 * segment before it reaches `esc`, and at base `escapeRelease(null)` and
 * `escapeRelease(undefined)` both threw an untyped `TypeError`. Turning those
 * two into a typed, code-tagged refusal is a strict improvement and no
 * previously-building spec changes behaviour.
 *
 * @param value the caller-supplied element value, typed as a string and not
 * trusted to be one
 * @param at a library-owned locator naming the builder, e.g. `"build835"`.
 * Never caller text.
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
export function requireCallerString(
  value: string,
  at: string,
  refuse: (message: string) => never,
): string {
  if (typeof value === "string") return value;
  refuse(
    `${at}: every element value must be a string, but received ${describeCallerValue(value)}. ` +
      `Values are never coerced - a JavaScript number cannot carry a leading-zero identifier, ` +
      `so converting here could emit a different value than the caller sent. Convert at the call site.`,
  );
}

/**
 * Build a builder's `esc` helper: check the type, then escape.
 *
 * Every one of the nine builder modules constructs its escaper here rather than
 * writing `(value) => escapeRelease(value, delimiters)` inline, so the decision
 * above is applied at one site and `test/builder-string-type.test.ts` can prove
 * it by scanning for the shape.
 *
 * @param delimiters the resolved delimiter set for this interchange
 * @param at a library-owned locator naming the builder, e.g. `"build835"`
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
export function makeCallerEscaper(
  delimiters: Delimiters,
  at: string,
  refuse: (message: string) => never,
): (value: string) => string {
  return (value: string): string =>
    escapeRelease(requireCallerString(value, at, refuse), delimiters);
}

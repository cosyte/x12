/**
 * The single route a caller-supplied element value takes **through a builder's
 * `esc` helper**, and the decision it encodes: **a non-string reaching `esc` is
 * refused, never coerced.**
 *
 * **Read that scope literally, because an earlier draft of this line said "the
 * single route a caller-supplied ELEMENT VALUE takes into an emitted segment"
 * and adversarial review was right to reject it.** Element values that do not
 * pass through here are described under "What this does NOT cover" below, in
 * examples rather than a list, and the reason that section refuses to enumerate
 * them is written there. This module is the chokepoint on `esc`, not on
 * emission.
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
 * link. The same `esc` helper carried every string element of every builder
 * that declared one, so the class was not one field. (No count here: this
 * module publishes none, on the rule that a count beside the gate that asserts
 * it drifts. `test/builder-string-type.test.ts` holds them.)
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
 *    a warning. **And this was not hypothetical in this package: the `esc`
 *    slots that read `.toString()` off an `X12Decimal` emitted exactly those
 *    three strings for a raw `number`, disclosed and unfixed by this slice and
 *    closed by `X12-DECIMAL-BYPASSES-THE-GUARD`** - see "What this does NOT
 *    cover". `X12Decimal` is the sanctioned route for numeric content, so a
 *    bare `number` in an element slot is never the right thing to have been
 *    handed.
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
 * ## What this does NOT cover, and why this section is deliberately NOT a census
 *
 * **Two consecutive adversarial rounds published an exhaustive, counted list of
 * the slots that bypass this chokepoint, and BOTH were measured false** - first
 * "the single route a caller-supplied element value takes into an emitted
 * segment", then "SEVEN string-typed positions". Each round found more (GS-04,
 * GS-05, GS-07 and `build837`'s LX-01 among them). Growing the count a third
 * time is the runaway ADR 0016 exists to stop, so the claim was cut back to the
 * form that cannot be falsified by finding one more:
 *
 * > **This module guards values routed through a builder's `esc` helper.**
 *
 * That is still exactly what this module does, and `esc` is still optional on
 * any given slot. What changed is what sits underneath it.
 *
 * ### `X12-DECIMAL-BYPASSES-THE-GUARD` replaced the disclosure with a property
 *
 * The three shapes this section used to disclose as live, `PRE-EXISTING` and
 * deliberately unfixed are now closed, and two of them by structure rather than
 * by enumeration:
 *
 * - **`esc` slots that read `.toString()` off what the types say is an
 *   `X12Decimal`** handed a raw `number` here already a string, so it was
 *   passed through: a `patientResponsibilityAmount` of `0.1 + 0.2` emitted
 *   `CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…`, `1e21` emitted
 *   `…*1e+21*…`, `NaN` emitted `…*NaN*…`, and an 837 service-line `units` of
 *   `0.1 + 0.2` emitted `SV1*HC:99213*150.00*UN*0.30000000000000004***1`, all
 *   with `warnings.length === 0`. Every one now routes through the builder's
 *   `escDec`, over {@link "./caller-decimal.js".requireCallerDecimal}.
 *   **A draft of this bullet said "THIRTY-SIX, and this one IS counted, because
 *   the gate asserts the census file by file". That was the same mistake one
 *   layer down** - the gate asserted a SAME-LINE regex, which pins a figure
 *   against drift and establishes nothing about the property, and `build-837`
 *   alone had three reads it could not see. The replacement gate does not count:
 *   it requires that **no `.toString()` read reaches an element except through
 *   `escDec` / `decStr`**, which one more slot cannot falsify.
 * - **The string-typed slots that never called `esc` at all** - `build999`'s
 *   `groupControlNumber` (GS-06 / GE-02), `transactionSetControlNumber`
 *   (ST-02 / SE-02), `disposition` (AK9-01 and IK5-01) and `groupResponsibleAgency`
 *   (GS-07); `groupDate` / `groupTime` (GS-04 / GS-05) in all seven domain
 *   builders; the 278's `levelCode` (HL-03); the 837's `lineNumber` (LX-01) -
 *   are now routed through `esc`. AK9-01 was the sharpest of them: an `ID`
 *   element bound to X12 code list 715, so a number told a receiver nothing
 *   about whether the group was accepted, and `build999`'s own
 *   `X12_ACK_ACCEPT_WITH_ERRORS` guard compares `disposition === "A"`, which a
 *   number walked past exactly the way it walked past `build835`'s
 *   `patientControlNumber === ""`.
 * - **And underneath both**, {@link "./caller-segment.js".requireCallerSegment}
 *   type-checks every element at the segment join, on every route **through a
 *   builder's `seg` / `joinSeg` helper**. That is the statement this section
 *   could never make by listing: `esc` is optional on a slot, the join is not.
 *   Keep the qualifier - `buildTA1` uses no joiner, and a draft that
 *   dropped it published a false completeness claim in six places.
 *
 * ### What is still NOT claimed
 *
 * - **Type safety is structural; delimiter safety is per-slot.** A `string`
 *   carrying an active delimiter in a slot that skipped `esc` is still emitted
 *   verbatim - the segment guard would pass it, because it is a string. Only
 *   the slots named above were routed, and that is a list, with a list's
 *   weakness. `build999` with `groupControlNumber: "1*BOGUS"` shifting
 *   GS-07/GS-08 by one is the shape to look for.
 * - **The ISA fixed-width slots go through `pad` / `padControl`, not `esc`, and
 *   not through the segment join either** - every builder assembles ISA with a
 *   direct `.join()`. `pad(1, 15)` throws an untyped `TypeError` (`value.slice
 *   is not a function`) and `padControl(1, 9)` throws the module's typed
 *   refusal with the **misleading** text "exceeds the 9-char spec limit". Those
 *   two terminate, which is better than emitting silently, and neither is
 *   improved here. **`buildTA1` had no `esc` at all and no segment joiner
 *   either, and `X12-TA1-EMIT-NOT-RELEASE-AWARE` gave it the escaper** - it
 *   still emits its five caller-supplied elements with a direct `.join()`, so
 *   the joiner half of that sentence stands and the type check now comes from
 *   here instead. What made it worth closing was not the type hole: an
 *   unreleased delimiter in TA1-01 shifted TA1-04, and `parseTA1` narrows an
 *   out-of-enum TA1-04 to `R`, so an Accept this library emitted read back as
 *   a Reject. A long-standing draft of this line said "every TA1 element being
 *   fixed-width", which is false in both halves: the module imports no `pad`,
 *   and every element comes from the caller.
 *
 * One limit of the guard itself, rather than of its scope:
 *
 * - **The refusal names the BUILDER, not the element position.** `esc` is unary
 *   and invoked several hundred times across the ten modules that declare one.
 *   **The count is DELETED from this prose rather than corrected, and that is
 *   the rule** (`documentation/conventions.md`): this line published "406 times
 *   on 377 lines" while the gate asserted a different pair, so it had already
 *   drifted, and a count duplicated beside the gate that asserts it drifts
 *   again. `test/builder-string-type.test.ts` holds both figures. Threading a
 *   per-slot locator through every invocation would be one opportunity per
 *   invocation to mislabel a slot, which is a worse
 *   trade than a message that names the builder and the offending TYPE. Stated
 *   as a limit rather than claimed away, and `REFUSAL-MESSAGE-PHI-ECHO` made it
 *   a sharper limit rather than a smaller one: the echoed value used to stand in
 *   for the slot, and it no longer does. **An earlier draft
 *   published "378 call sites", which is the LINE count.**
 *   {@link "./caller-segment.js".requireCallerSegment} does **not** carry this
 *   limit - it holds the whole segment, so it derives `"HL-03"` from `parts[0]`
 *   and the index - which is the other reason the two guards are worth having
 *   side by side.
 *
 * @see `test/builder-string-type.test.ts` - the source gate that requires every
 * builder module to build its `esc` through {@link makeCallerEscaper}.
 */

import { isVisibleDelimiterChar } from "../parser/delimiters.js";
import type { Delimiters } from "../parser/types.js";
import { escapeRelease, RELEASE_CHAR } from "../parser/release.js";

/**
 * Describe a wrong-typed element value without echoing it at all.
 *
 * Deliberately a second describer rather than a reuse of
 * `caller-array.ts`'s `describeShape`: that one exists to explain why a value
 * is not a *list* ("an array-like object with length 3"), and its phrasings
 * would read as nonsense here.
 *
 * **Every value is described by type ALONE and never echoed, and that is
 * `REFUSAL-MESSAGE-PHI-ECHO`'s decision rather than a style choice.** An
 * `object` or `function` was already type-only, because
 * `Object.prototype.toString` reads `Symbol.toStringTag` and a caller can set
 * that to a 120,000-character string, and `String(value)` runs a
 * caller-supplied `toString`. A *primitive* used to render its value through
 * {@link "./caller-value.js".renderCallerValue} - bounded to 90 characters, but
 * **not redacted** -
 * and this is the guard that stands on **every string element of every
 * builder**, `CLP-01` and `NM1-09` included. Measured on this tree: a
 * `JSON.parse`d 835 spec whose `patientControlNumber` arrived as the number
 * `900412345678` refused with that patient-account number inside
 * `Error.message`, and an 834 whose member `idCode` arrived as a number put the
 * member id there. A slot-generic guard cannot know which slot it is standing
 * on, so it cannot know whether the primitive it is about to echo is a control
 * number or a patient identifier - which is exactly why it may not echo one.
 *
 * The type is what the caller has to act on in any case: the remedy for every
 * arm here is the same, and it is named in the message.
 *
 * **Exported for {@link "./caller-control-number.js".requireControlNumber} and
 * for nothing else.** That guard needed the same PHI-safe description and the
 * alternative was a THIRD describer beside this one and `caller-array.ts`'s
 * `describeShape`. A control number is exactly the kind of primitive the
 * paragraph above refuses to echo, so sharing this one is what keeps that
 * decision in a single place rather than re-deciding it per guard.
 *
 * **What it costs, stated rather than argued away:** this refusal names the
 * BUILDER and not the slot (see the limit recorded at the bottom of the module
 * doc above), so with the value gone a caller holding a large spec has neither.
 * {@link "./caller-segment.js".requireCallerSegment} names the slot and is the
 * better diagnostic wherever it is the guard that fires; threading a locator
 * through every unary `esc` invocation is the trade that module doc rejects,
 * and this slice did not reopen it.
 * @internal
 */
export function describeCallerValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "object") return Array.isArray(value) ? "an array" : "an object";
  if (type === "function") return "a function";
  return `a ${type}`;
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
 * The four roles a caller declares a delimiter for, in ISA order, each paired
 * with the name the refusal uses. Ordered so a set with more than one
 * degenerate role reads in the order the ISA transmits them. @internal
 */
const DELIMITER_ROLES = [
  ["element", "element separator"],
  ["repetition", "repetition separator"],
  ["component", "component separator"],
  ["segment", "segment terminator"],
] as const;

/**
 * Refuse a delimiter set in which the release character is also a delimiter,
 * because on such a set this builder cannot emit a document it can read back.
 *
 * ## The property, which is not a list of trigger bytes
 *
 * {@link "../parser/release.js".escapeRelease} protects a byte by **prefixing**
 * `?` to it. When `?` is itself one of the four delimiters, that prefix is
 * structure, so the protection becomes the thing it was protecting against. The
 * inverse holds at the same time and needs no caller value at all: a builder
 * joins composites with the component separator and repetitions with the
 * repetition separator, so when either of those IS `?` the library's own
 * structural join is emitted as an escape sequence.
 *
 * **Two mechanisms, and only the first has anything to do with a caller's
 * value.** The filed defect named the first and reached three roles; measured,
 * the class is four roles and the second mechanism fires on documents in which
 * no value carries any trigger byte at all.
 *
 * Measured on this tree at base commit `51de7b2`, `warnings: []` on every row:
 *
 * ```text
 * elementSeparator "?"    buildInterchange ["CLM","PATIENT?ACCT","150.00"]
 *                           reads ["CLM","PATIENT","","ACCT","150.00"]
 * segmentTerminator "?"   buildInterchange ["CLM","PAT*ACCT","150.00"]
 *                           CLM-01 reads "PAT", a phantom segment follows
 * componentSeparator "?"  build837P, every document, no trigger byte
 *                           SV1-01-2 (the procedure code) reads undefined
 *                           HI-01-2 (the diagnosis code) reads undefined
 * repetitionSeparator "?" build271, every document, no trigger byte
 *                           EB-03 "30"+"1" reads as one code "30?1"
 * ```
 *
 * ## Why REFUSE, and why the whole set rather than the values that trip
 *
 * Refusing follows the call {@link "./caller-control-number.js".requireControlNumber}
 * made for an empty control number: 005010 settles neither, and the tiebreak is
 * CONSISTENCY with the guards this package already carries on emit plus the
 * standing rule that emit is the strict half. A warning would have to travel
 * the read registry, which `#83` was refuted for.
 *
 * Guarding the VALUES that trip instead was rejected on measurement, not taste.
 * It cannot reach the second mechanism at all - there is no offending value in
 * an 837 whose procedure code is lost - and it would leave a caller with an
 * instruction they cannot act on, which is the value-level mitigation this
 * item's own history had refuted for protecting nobody.
 *
 * ## What this deliberately does NOT do
 *
 * - **It tests the DECLARED VALUE for equality with `?`, and that is the whole
 *   of it. It is not a guarantee about the documents this library can
 *   compose.** State the bound as a property of the SET, never of the document.
 *   The separate question of whether a declared value is even SHAPED like a
 *   delimiter is {@link requireWellShapedDelimiters}, which runs after this one.
 * - **The read side is untouched.** `parseX12` still accepts every degenerate
 *   set, and `src/parser/segment.ts`'s element-role guard still frames such a
 *   document. Documents this library emitted before this guard exist, and
 *   Postel's Law puts them on the lenient half.
 * - **`serializeX12` is not guarded**, and that is the same distinction: it
 *   re-emits a set a SENDER declared, out of a model that was parsed, so
 *   refusing there would refuse round-tripping an inbound document. Measured:
 *   a degenerate interchange still serializes byte-identically.
 *
 * @param delimiters the resolved delimiter set for this interchange
 * @param at a library-owned locator naming the builder, e.g. `"build835"`
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
function requireEscapableDelimiters(
  delimiters: Delimiters,
  at: string,
  refuse: (message: string) => never,
): void {
  const degenerate = DELIMITER_ROLES.filter(([role]) => delimiters[role] === RELEASE_CHAR).map(
    ([, name]) => name,
  );
  if (degenerate.length === 0) return;
  const roles =
    degenerate.length === 1
      ? `the ${degenerate[0] ?? ""}`
      : `the ${degenerate.slice(0, -1).join(", the ")} and the ${degenerate[degenerate.length - 1] ?? ""}`;
  refuse(
    `${at}: "${RELEASE_CHAR}" is the X12 release character and cannot also be ${roles}. ` +
      `An escape is written by prefixing "${RELEASE_CHAR}" to the byte it protects, so on this set the ` +
      `protection is emitted as structure; and a composite or a repetition joined with ` +
      `"${RELEASE_CHAR}" is emitted as an escape. Neither reads back, and no element value avoids it. ` +
      `Declare a delimiter set in which no role is "${RELEASE_CHAR}".`,
  );
}

/**
 * Refuse a delimiter set whose roles are not SHAPED like delimiters: each must
 * be a string of exactly one visible character, and the four must be mutually
 * distinct.
 *
 * ## The rule is not invented here - it is the READ side's, applied outward
 *
 * {@link "../parser/delimiters.js".detectDelimiters} already decides what a
 * delimiter is for this package, and it decides it as a **Tier-3 fatal**: it
 * reads one character at each of four FIXED ISA positions, requires each to satisfy
 * {@link "../parser/delimiters.js".isVisibleDelimiterChar}, and requires the
 * four to be distinct - otherwise `X12_INVALID_DELIMITERS`, thrown even in
 * lenient mode. This guard applies that same predicate, imported rather than
 * restated, to the set a CALLER declares. **A builder that composes a document
 * its own parser refuses to read is disagreeing with itself**, and that is the
 * whole argument. No normalisation rule is invented and none is needed: nothing
 * is trimmed, coerced, substituted or padded, and a set that does not satisfy
 * the read side's own predicate is refused rather than repaired.
 *
 * The one-character requirement is structural rather than conventional. The ISA
 * is fixed-width per ASC X12 .5: ISA-11, ISA-16 and the terminator each occupy
 * ONE fixed position, and {@link "../parser/types.js".Delimiters} records
 * exactly one character per role. A multi-character value cannot be transmitted
 * as a delimiter at all - the question is only whether the caller is told.
 *
 * 🛑 **It is a UTF-16 CODE-UNIT rule, not a byte rule, and the difference is a
 * residual this does NOT close.** `String.prototype.length` and the read side's
 * `charAt` both count code units, so a character that is one code unit but
 * several BYTES on the wire satisfies this guard and still displaces every ISA
 * position downstream of it. Measured at head, `warnings: []`:
 * `buildInterchange({ componentSeparator: "§" })` builds, and a
 * byte-oriented receiver reads ISA-16 as `0xC2` and the terminator as `0xA7`.
 * `"’"` - the smart-quote a companion-guide PDF gives you instead of `'` -
 * does the same. **Do not grow this guard to reach it**: an encoding-width rule
 * is a decision nobody here has made, and the read side counts code units too,
 * so moving one side alone would re-open the drift this guard exists to close.
 * Never restate the bound in BYTES; every draft of this module that did was
 * measured false the same way.
 *
 * ## Three mechanisms, measured at base `a21f8ea`, and they are NOT one defect
 *
 * ```text
 * LENGTH. No claim is made about WHICH roles were silent, and that is
 * deliberate: two successive drafts published an asymmetry ("the segment
 * terminator alone", then "alone among the nine that end in parseX12") and the
 * gate falsified both. What is published is what was run.
 *   build837P { segmentTerminator: "~~" }  warnings: []
 *     31 segment rows in a transaction whose SE-01 declares 16; every other
 *     row is a phantom with id "" that no caller wrote.
 *   buildInterchange { componentSeparator: ":~" }  warnings: []
 *     a two-character value at a role a draft called safe. The reader sees a
 *     well-formed ISA, the builder's own appended terminator becomes an
 *     uncounted empty segment, and because escapeRelease compares against the
 *     declared TWO-character value, === never matched and NO element value was
 *     escaped against ":" or "~" either.
 *
 * TYPE, and the joiner and the escaper end up disagreeing
 *   build837P { componentSeparator: 1 }    warnings: []
 *     `Array.prototype.join` coerces the number to "1" and the document frames
 *     on it, but `escapeRelease` compares delimiters with `===` and a number
 *     never equals a character, so NO caller value is escaped against it:
 *     SV1*HC199213 reads SV1-01-2 as "992", not the procedure code 99213, and
 *     CLM-05's place-of-service composite emits as "111B11".
 *   build271 { repetitionSeparator: 1 }    warnings: []
 *     EB*1**3011 - EB-03's two service type codes no longer read back as two.
 *
 * NO NET AT ALL, at buildTA1 - EVERY role, EVERY shape, all 32 cells
 *   buildTA1 with { elementSeparator: "" } returned
 *     TA10000000012606011200A000 - one undelimited blob fusing the
 *     reassociation key, date, time, disposition and note code.
 *   buildTA1 with { elementSeparator: "||" } returned
 *     TA1||000000001||260601||1200||A||000, and inside an ISA - which can
 *     declare only "|" - that Accept reads back with TA1-01 EMPTY and
 *     ackCode "R", parse warnings 0. 🩺 An Accept emitting as a Reject is
 *     X12-TA1-EMIT-NOT-RELEASE-AWARE's safety class reached by the LENGTH
 *     mechanism, at a role no parsing builder was ever silent at.
 *   Every other builder ends in `parseX12`, which caught most mis-shaped sets
 *   by accident; `buildTA1` returns a segment and never parses.
 * ```
 *
 * 🩺 The TYPE mechanism needs no unusual caller value - `99213`, `11` and `30`
 * are ordinary - and a length rule cannot reach it, which is why the two are
 * stated separately. 🛑 **Never publish an asymmetry about WHICH roles were
 * silent, in any qualified form.** Two drafts did and the gate falsified both,
 * the second inside the fix for the first: a mis-shaped set reaches a clean
 * read by more routes than a structural story predicts. **Publish the cells
 * that were run and nothing about the ones that were not.**
 *
 * ## What a caller catches CHANGES, and it changes in both directions
 *
 * Most mis-shaped sets did not build at base: the builder composed the bytes,
 * its own trailing `parseX12` read them back, and an `X12ParseError` with
 * `X12_INVALID_DELIMITERS` escaped out of a `build*` call - the wrong class,
 * carrying a 64-byte `snippet` of the interchange just composed. At head those
 * cells refuse EARLIER with the builder's own typed error and its existing
 * code. So **a consumer catching `X12ParseError` around a `build*` call stops
 * catching, and one catching that builder's own error starts** - no new code is
 * minted, but the class moves, and `#83`'s lesson is that a moved predicate is
 * stated in both directions or not at all.
 *
 * 🛑 **It refuses sets that built with `warnings: []`. No count of them is
 * published** - a draft said "two" and the measurement found more the moment a
 * shape the census had not enumerated (a boxed `new String("|")`) was tried,
 * which is the census-cannot-be-closed rule this package already carries. The
 * one worth naming is `segmentTerminator: "~\r\n"` - a caller asking for
 * line-broken output.
 * Measured at base: the interchange built clean, and the CRLF was NOT on the
 * wire. `parseX12` tolerates a run of CR/LF between segments, so the model
 * recorded `segment: "~"` and `serializeX12` re-emitted without line breaks.
 * The caller never got what they declared; the library silently substituted
 * something else. Refusing is the same call `X12-EMIT-DEGENERATE-RELEASE-DELIMITER`
 * made about specs that built at `0.0.15` - what this library happens to read
 * back was never the bar.
 *
 * ## Why REFUSE, and why after the release-character check
 *
 * Refuse rather than warn, following `X12-EMPTY-CONTROL-NUMBER-FABRICATED` and
 * `X12-EMIT-DEGENERATE-RELEASE-DELIMITER`: a warning would have to travel the
 * READ registry a builder returns, which `#83` was refuted for. No code is
 * minted; each builder refuses with its own.
 *
 * It runs AFTER {@link requireEscapableDelimiters} so that nothing that slice
 * pinned moves. A set with `?` in two roles is both degenerate AND
 * non-distinct; running the release-character check first keeps the message
 * that names the sharper defect. It runs BEFORE
 * {@link "./caller-control-number.js".requireControlNumber} in every builder
 * that has one, for the same reason the escaper does, so on a mis-shaped set a
 * control-number refusal a caller saw at base is reported as this one instead.
 * **A MESSAGE moves, never a code, and the sites are not counted** - that is a
 * property of the ordering, and a total drifts with the next builder.
 *
 * **No refusal echoes the declared value.** The role is named and the defect is
 * described - `REFUSAL-MESSAGE-PHI-ECHO`'s decision, kept even though a
 * delimiter is a structural character rather than an element value, because a
 * slot-generic guard cannot know what a caller put in the slot.
 *
 * @param delimiters the resolved delimiter set for this interchange
 * @param at a library-owned locator naming the builder, e.g. `"build835"`
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
function requireWellShapedDelimiters(
  delimiters: Delimiters,
  at: string,
  refuse: (message: string) => never,
): void {
  // 🛑 The remedy says CHARACTER and never BYTE. The rule is a UTF-16 code-unit
  // rule on both sides (`String.prototype.length` here, `charAt` on read), so a
  // one-code-unit character that is several bytes on the wire satisfies it and
  // still displaces every ISA position after it. That residual is disclosed in
  // the module doc rather than guarded, and the message must not imply
  // otherwise.
  const REMEDY =
    `A delimiter occupies ONE fixed position of the ISA (ISA-11, ISA-16 and the position ` +
    `after it), so this set cannot be transmitted and this library's own parser would reject a ` +
    `document declaring it. Declare four distinct, visible, single-character delimiters.`;

  for (const [role, name] of DELIMITER_ROLES) {
    // The declared value is typed `string` and is not trusted to be one: a
    // JavaScript or JSON caller reaches this slot, and at base a non-string was
    // coerced by the join while `escapeRelease` went on comparing against the
    // uncoerced value.
    const value: unknown = delimiters[role];
    if (typeof value !== "string") {
      refuse(
        `${at}: the ${name} must be a string, but received ${describeCallerValue(value)}. ` +
          `Values are never coerced - a coerced delimiter frames the document while the release ` +
          `escape still compares against what you passed, so no element value is protected from ` +
          `it. ${REMEDY}`,
      );
    }
    if (value.length !== 1) {
      refuse(
        `${at}: the ${name} must be exactly one character, but the declared value is ` +
          `${value.length === 0 ? "empty" : `${String(value.length)} characters long`}. ${REMEDY}`,
      );
    }
    if (!isVisibleDelimiterChar(value)) {
      refuse(
        `${at}: the ${name} must be a visible character, but the declared value is whitespace ` +
          `or a control character. ${REMEDY}`,
      );
    }
  }

  for (const [i, [role, name]] of DELIMITER_ROLES.entries()) {
    const earlier = DELIMITER_ROLES.slice(0, i).find(([r]) => delimiters[r] === delimiters[role]);
    if (earlier !== undefined) {
      refuse(
        `${at}: the ${name} and the ${earlier[1]} are the same character. ` +
          `A reader cannot tell which role a character is playing. ${REMEDY}`,
      );
    }
  }
}

/**
 * Build a builder's `esc` helper: check the delimiter set, then per value check
 * the type and escape.
 *
 * EVERY builder module that declares an `esc` constructs it here rather than
 * writing `(value) => escapeRelease(value, delimiters)` inline, so the decision
 * above is applied at one site and `test/builder-string-type.test.ts` can prove
 * it by scanning for the shape. **That gate holds the count; this line does
 * not, deliberately** - the figure was published here as "nine" and stayed
 * nine when `X12-TA1-EMIT-NOT-RELEASE-AWARE` made it ten.
 *
 * **The delimiter checks are why that gate is worth more than a hand-list.**
 * There are TWO, and both run ONCE, eagerly, when the builder resolves its
 * delimiters - not per value - so they fire on a spec that carries no element
 * values at all, and they reach every builder without naming one. That includes
 * `buildTA1`, which is the only builder with no trailing `parseX12` and so had
 * no accidental net of any kind. {@link requireEscapableDelimiters} asks
 * whether the release character is one of the four;
 * {@link requireWellShapedDelimiters} asks whether the four are shaped like
 * delimiters at all. Each carries its own measurement and its own list of what
 * it deliberately leaves alone.
 *
 * **It runs where the escaper is BUILT, so every guard a builder runs earlier
 * keeps precedence** (`build835`'s balance equations, `build837`'s spine,
 * `build999`'s AK9 counts, `buildTA1`'s `enforceAcceptIsClean`) and a defect a
 * builder would have detected LATER now reports this refusal instead. That is
 * the same trade `X12-EMPTY-CONTROL-NUMBER-FABRICATED` recorded one slice
 * earlier, and it moves a MESSAGE rather than a code: no builder mints a code
 * here, each refuses with its own.
 *
 * **NEVER COUNT WHAT MOVED. A draft published "one report" and it was measured
 * false** - `requireControlNumber` runs after the escaper in EVERY builder that
 * has one, so both mechanisms `X12-EMPTY-CONTROL-NUMBER-FABRICATED` and
 * `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED` shipped are preempted at every
 * one of their slots when the set is also degenerate. Say which guards keep
 * precedence and that everything later yields, which is a property of the
 * ordering; a total of the sites is a census and drifts with the next builder.
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
  requireEscapableDelimiters(delimiters, at, refuse);
  requireWellShapedDelimiters(delimiters, at, refuse);
  return (value: string): string =>
    escapeRelease(requireCallerString(value, at, refuse), delimiters);
}

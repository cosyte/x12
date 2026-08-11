/**
 * The route a caller-supplied **numeric** element value takes into a segment,
 * and the decision it encodes: **a non-`X12Decimal` in an `X12Decimal` slot is
 * refused, never coerced.**
 *
 * This closes the residual `src/builder/caller-string.ts` disclosed and
 * deliberately did not fix.
 *
 * ## The defect
 *
 * `makeCallerEscaper` type-checks what reaches `esc`. But an `X12Decimal` slot
 * does not hand `esc` the caller's value - it hands it `value.toString()`:
 *
 * ```ts
 * esc(claim.patientResponsibilityAmount.toString())
 * ```
 *
 * A raw JavaScript `number` in that slot answers `.toString()` with a perfectly
 * good string, so the value arrives at the chokepoint **already escaped-shaped
 * and already a string**, and the guard never sees it. Measured on this tree,
 * `warnings.length === 0` in every case:
 *
 * ```text
 * patientResponsibilityAmount: 0.1 + 0.2  ->  CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*...
 * patientResponsibilityAmount: 1e21       ->  CLP*PT-ACCT-001*1*500.00*450.00*1e+21*...
 * patientResponsibilityAmount: NaN        ->  CLP*PT-ACCT-001*1*500.00*450.00*NaN*...
 * line.units: 0.1 + 0.2                   ->  SV1*HC:99213*150.00*UN*0.30000000000000004***1
 * ```
 *
 * `"1e+21"` and `"NaN"` are not valid content for an X12 **R**-type element at
 * all - `X12_DECIMAL_RE` in `src/decimal.ts` rejects exponent notation outright,
 * so the library will not *parse* what it just *emitted*.
 * `"0.30000000000000004"` is worse in a different way: it is well-formed, so
 * nothing downstream refuses it, and it silently publishes 17 significant
 * digits into a monetary element the caller meant as `0.30`.
 *
 * ## How this harm differs from the one `caller-string.ts` stops, which is the
 * whole priority call
 *
 * `caller-string.ts` exists because a **required identifier vanished** - CLP-01,
 * the reassociation key back to the 837's CLM-01, silently gone. Nothing here
 * vanishes and nothing is mis-*read*: the library renders faithfully what a
 * JS/JSON caller handed it. The exposure is float noise reaching the wire.
 * That is why this shipped as a disclosed residual rather than stopping `#60`,
 * and it is worth keeping the distinction rather than flattening both into
 * "a numeric value defect".
 *
 * ## Why REFUSE, and why that is not a fresh decision
 *
 * `#60` already decided **refuse, never coerce** for element values, on grounds
 * that carry over unchanged - a JavaScript `number` has no X12 lexical form, and
 * coercing one mints a value the caller did not send. Two grounds are specific
 * to this slot:
 *
 * 1. **`X12Decimal` is already the sanctioned numeric route, by the type.**
 *    Every one of these slots is *typed* `X12Decimal`, and each transaction's
 *    `types.ts` says so in prose too ("NEVER `number` - float arithmetic
 *    silently corrupts money"). A raw `number` here is a caller who defeated
 *    their own type checker; there is no supported numeric path being taken
 *    away.
 * 2. **Coercing would have to pick a rounding, and the library has no basis to
 *    pick one.** `0.1 + 0.2` is `0.30000000000000004`; emitting `0.30` guesses
 *    the caller meant cents, and emitting `0.3` guesses they meant tenths.
 *    Guessing the scale of a monetary amount is precisely the harm
 *    `X12Decimal` was introduced to prevent.
 *
 * ## What this does NOT cover
 *
 * The same discipline `caller-string.ts` states applies here: this module
 * guards values routed through a builder's `escDec` helper. It does not make
 * the envelope safe, it does not cover the fixed-width ISA slots (which go
 * through `pad` / `padControl` and are disclosed in `caller-string.ts`), and
 * it publishes no census of the slots that use it. What *is* structural, and is
 * asserted rather than counted, is the segment-level backstop in
 * {@link "./caller-segment.js".requireCallerSegment}: no non-string reaches an
 * element of a segment emitted **through a builder's `seg` / `joinSeg`
 * helper**, `escDec` included. `buildTA1` uses neither and is outside it; see
 * that module's own scope note. Its five elements ARE type-checked, through
 * `esc` rather than through the join, so
 * what being outside this backstop costs it is the SLOT in the refusal
 * message, not the check.
 *
 * **And one class of `X12Decimal` slot never reaches this guard at all.**
 * `build835` runs `enforceBalance(spec)` before it resolves delimiters, and the
 * balance check calls `X12Decimal` methods on the caller's value. So every slot
 * that is a TERM in the TR3 X221A1 balance equation - BPR-02, CLP-03, CLP-04,
 * CAS-03 - throws an **untyped `TypeError` with no `code`** (one of them saying
 * the caller tampered with a frozen class) before `requireCallerDecimal` can
 * refuse it typed. `PRE-EXISTING`, pinned in `test/builder-decimal-type.test.ts`,
 * and disclosed rather than fixed because reordering `enforceBalance` changes
 * the refusal precedence of an out-of-balance remit, which is its own decision.
 *
 * One limit of the check itself: `instanceof` is the test, so an object built
 * with `Object.create(X12Decimal.prototype)` passes it and then throws
 * `X12Decimal`'s own tampering `TypeError` from `state()`. That is loud, not
 * silent, and forging the prototype of a frozen class is not a caller mistake
 * this module can improve on.
 *
 * ## Why each builder owns a thin `escDec` rather than taking a shared closure
 *
 * `caller-string.ts` hands back a *built* escaper (`makeCallerEscaper`) because
 * `esc` closes over the resolved delimiters, which are per-call. Nothing here
 * needs the delimiters - `escDec` composes with the builder's own `esc` for the
 * escape - so each builder declares a module-level two-line
 * `escDec(value, esc)` over {@link requireCallerDecimal} instead. That keeps the
 * locator and the typed `refuse` where they already live (both are module-level
 * constants in every builder) and threads **nothing** new through the dozens of
 * emit helpers that already take `esc` positionally. The source gate asserts
 * the shape in every builder, so "each file writes its own" does not become
 * "each file writes its own differently".
 *
 * @see `test/builder-decimal-type.test.ts` - the source gate that requires
 * every `X12Decimal` slot to emit through a builder's `escDec`.
 */

import { X12Decimal } from "../decimal.js";

/**
 * Describe a wrong-typed decimal element value without echoing it at all.
 *
 * **This one was the closest call in `REFUSAL-MESSAGE-PHI-ECHO`, and it went
 * the same way as its two siblings.** The argument for keeping the echo was
 * real: the overwhelmingly likely mistake here is a raw `number`, and
 * This guard exists because a `number` renders as
 * `"0.30000000000000004"` / `"1e+21"` / `"NaN"` on the wire, so showing the
 * value looked like the fastest diagnosis. It was kept anyway because:
 *
 * 1. **The three renderings are already in the message**, as library-owned
 *    fixed text. Nothing about the diagnosis depends on echoing the caller's
 *    particular number, and the remedy (`X12Decimal.fromString()` at the call
 *    site) is identical either way.
 * 2. **The line is drawn at what a caller puts in a document ELEMENT, and an
 *    `X12Decimal` slot is one.** That is the whole rule
 *    `REFUSAL-MESSAGE-PHI-ECHO` bought, and it is what makes the array guard's
 *    surviving arms consistent rather than an exception: `caller-array.ts`
 *    still reports a forged array-like's `length` and class tag, which describe
 *    the SHAPE a caller forged and not an element's contents. "An `X12Decimal`
 *    slot holds no identifier" would have been an argument of a different kind
 *    - a fact about today's slots rather than a property of the guard - and
 *    this package has had that kind of census measured false five times.
 *
 * `object` and `function` were already type-only, for the reason
 * `caller-string.ts` gives.
 * @internal
 */
function describeCallerDecimal(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const type = typeof value;
  if (type === "object") return Array.isArray(value) ? "an array" : "an object";
  if (type === "function") return "a function";
  return `a ${type}`;
}

/**
 * Require a caller-supplied numeric element value to be a real
 * {@link X12Decimal} before its lexical form is escaped into a segment, and
 * refuse with the calling builder's own typed error if it is not.
 *
 * `refuse` is passed in for the same reason
 * {@link "./caller-string.js".requireCallerString} takes one: each builder owns
 * a distinct error class and code that consumers branch on, and a shared helper
 * throwing a shared error would quietly widen every one of those contracts.
 *
 * `null` and `undefined` are refused, matching `requireCallerString`. No
 * `escDec` site has an absent-means-zero default - an optional amount is
 * already resolved to `""` (or to the `"0"` default in the 837's SV1-04) before
 * it reaches here.
 *
 * @param value the caller-supplied amount, typed `X12Decimal` and not trusted
 * to be one
 * @param at a library-owned locator naming the builder, e.g. `"build835"`.
 * Never caller text.
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
export function requireCallerDecimal(
  value: X12Decimal,
  at: string,
  refuse: (message: string) => never,
): X12Decimal {
  if (value instanceof X12Decimal) return value;
  refuse(
    `${at}: every numeric element value must be an X12Decimal, but received ${describeCallerDecimal(value)}. ` +
      `Values are never coerced - a JavaScript number has no X12 lexical form (0.1 + 0.2 renders as ` +
      `"0.30000000000000004", 1e21 as "1e+21", NaN as "NaN"), and rounding one here would guess a scale ` +
      `the caller never stated. Build it with X12Decimal.fromString() at the call site.`,
  );
}

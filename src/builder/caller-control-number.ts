/**
 * The route an **envelope control number** takes into an emitted document, and
 * the decision it encodes: **an EMPTY control number is refused, never padded
 * and never emitted as an empty element.**
 *
 * `src/builder/caller-string.ts` bounds whether a caller-supplied element value
 * is a real *string*. This module bounds whether a control number the caller
 * left empty ever reaches the wire.
 *
 * ## The defect this exists to stop, which is a FABRICATED identifier
 *
 * Every builder that assembles an ISA zero-pads its control number to the nine
 * characters ASC X12 .5 fixes ISA-13 at:
 *
 * ```ts
 * const interchangeControlNumber = padControl(spec.interchangeControlNumber, 9);
 * ```
 *
 * `padControl("1", 9)` answering `"000000001"` is the point of the helper. But
 * the same line answers `"000000000"` for `""`, and there is no guard in front
 * of it. Measured on this tree at base commit `28b417f`, through
 * `buildInterchange`, with `interchangeControlNumber: ""`:
 *
 * ```text
 * ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *
 *   250101*1200*^*00501*000000000*0*P*:~ … ~IEA*1*000000000~
 * warnings: []
 * ```
 *
 * The interchange is frozen, well-formed, reconciles ISA-13 against IEA-02, and
 * carries a **nine-digit control number the caller never supplied.** A control
 * number is how an interchange is reconciled and acknowledged: the receiver's
 * TA1 echoes it, their 999 keys off GS-06, and their remittance reassociates
 * through it. A fabricated one does not fail; it succeeds against the **wrong**
 * thing, and the sender has no signal that it happened.
 *
 * The sibling slots do not fabricate, and the difference is worth keeping
 * straight because it is the reason this module names a *class* rather than a
 * site. `groupControlNumber` and `transactionSetControlNumber` reach the wire
 * through `esc`, and `escapeRelease` early-returns on `""`, so the same input
 * lost the required element instead. **The bytes are not the same in every
 * builder and a draft of this paragraph published one measurement as the
 * class**: `buildInterchange` and `build999` join without trimming, so the
 * element goes out empty; the seven domain builders share a `seg` that drops a
 * trailing empty element, so the trailer loses it outright. Measured at the
 * same commit, through `buildInterchange` and through `build834`:
 *
 * ```text
 * buildInterchange  GS*HC*…*1200**X*005010X222A2~ … ~GE*1*~     ST*837**…~ … ~SE*3*~
 * build834          GS*BE*…*1200**X*005010X220A1~ … ~GE*1~      ST*834**…~ … ~SE*21~
 * ```
 *
 * Every one of those emitted `warnings: []`, which is the property that holds
 * across both families and is all this module needs: no diagnostic separated an
 * absent control number from a supplied one, on any channel. Refusing covers
 * both shapes without the message having to know which one it is standing on.
 *
 * ## Why REFUSE and not warn
 *
 * The alternative was a warning on the returned interchange. Refusal wins on
 * four grounds, in the order they were weighed:
 *
 * 1. **The in-package precedent for an empty REQUIRED element is uniform and it
 *    is refusal.** `build835` refuses `patientControlNumber === ""` (CLP-01),
 *    `build837` refuses `claimId === ""` (CLM-01), `build834` refuses
 *    `maintenanceTypeCode === ""`, `build278` refuses `requestCategoryCode === ""`
 *    and `build277` refuses `categoryCode === ""`. Each throws that builder's own
 *    typed, code-tagged error. A control number is the same kind of value as
 *    CLP-01, one level up the envelope, so a different answer here would be an
 *    inconsistency rather than a distinction.
 * 2. **Emit is the strict half of this library.** Postel's Law is applied
 *    asymmetrically on purpose: lenient on parse, spec-clean on emit. Zero-padding
 *    an absent value is not leniency, it is a silent correction, and this package
 *    corrects nothing silently.
 * 3. **A warning would have to travel on the PARSE channel.** A builder returns
 *    `parseX12` of the bytes it just wrote, so its `warnings` array is the read
 *    side's registry. Putting an emit-side caller mistake there would mint a code
 *    on a channel consumers use to grade **inbound** documents, and a widening
 *    that moves a case onto a new code is the one shape this repo has been
 *    refuted for before. A throw has no predicate to break.
 * 4. **A warned document still goes out.** The failure mode being closed is a
 *    caller who did not notice. A warning on a frozen, successful-looking
 *    interchange is exactly what they did not notice the first time.
 *
 * **What refusing costs, stated rather than argued away:** a caller relying on
 * `""` to mean "zero-pad me a control number" is broken by this, deliberately.
 * They were shipping `000000000`, which is a real value a trading partner may
 * already have assigned to something else.
 *
 * ## What this does NOT do
 *
 * - **It does not type-check.** The test is `value === ""` and nothing else, so
 *   **nothing about a non-string changed**, on any route. What each route
 *   already did, typed refusal or bare `TypeError`, is disclosed in
 *   `caller-string.ts` and is not touched or restated here.
 * - **It does not trim.** A whitespace-only control number is NOT refused:
 *   `padControl(" ", 9)` still answers `"00000000 "`. `buildTA1` imports no
 *   `pad` at all, so it emits whatever whitespace it was handed, verbatim.
 *   Trimming would be a normalisation rule, and no source consulted for this
 *   package states one. The in-package guards this mirrors are all byte-strict
 *   `=== ""` for the same reason. This is a real residual, and it is recorded in
 *   `KNOWN-LIMITATIONS.md` rather than claimed away.
 * - **It publishes no census of the slots it guards.** Which slots route through
 *   here is held by `test/builder-control-number-empty.test.ts`, not by this
 *   prose. What this module guarantees is the property: **a control number
 *   routed through {@link requireControlNumber} is refused when empty.**
 *
 * @see `test/builder-control-number-empty.test.ts` - the behavioural gate, one
 * red case per routed slot, plus the drift pin that no builder calls
 * `padControl` on a raw spec field.
 */

/**
 * Require a caller-supplied control number to be non-empty before it is emitted,
 * and refuse with the calling builder's own typed error if it is not.
 *
 * `refuse` is passed in rather than thrown from here for the same reason
 * {@link "./caller-string.js".requireCallerString} takes one: each builder owns a
 * distinct error class and error code that consumers branch on
 * (`Claim837BuildError` / `X12_837_BUILD_INVALID_SPEC` and its siblings), and a
 * shared helper throwing a shared error would quietly widen every one of those
 * contracts. Its return type is `never`, so a caller that forgets to throw is a
 * type error rather than a fall-through.
 *
 * **The message names the slot and the spec field and never the value.** Both
 * are library-owned literals at every call site, so unlike the unary `esc`
 * refusal this one names the position without threading a locator through
 * anything. The value is empty, so there is nothing to echo, and
 * `REFUSAL-MESSAGE-PHI-ECHO`'s rule that a slot-generic guard may not echo a
 * primitive is not reached.
 *
 * **It does NOT name an index.** `buildInterchange` takes many groups and many
 * transactions per group, and this refusal says which slot and which spec
 * property, not which group. That is the same limit the `esc` refusal carries,
 * and threading an index here would be one more opportunity per call site to
 * mislabel one.
 *
 * @param value the caller-supplied control number
 * @param slot the X12 position(s) it is emitted at, e.g. `"ISA-13 / IEA-02"`.
 * A library-owned literal, never caller text.
 * @param field the spec property the caller sets, e.g.
 * `"interchangeControlNumber"`. A library-owned literal, never caller text.
 * @param at a library-owned locator naming the builder, e.g. `"build837"`
 * @param refuse throws the calling module's typed refusal
 *
 * @internal
 */
export function requireControlNumber(
  value: string,
  slot: string,
  field: string,
  at: string,
  refuse: (message: string) => never,
): string {
  if (value !== "") return value;
  refuse(
    `${at}: ${field} is empty. ${slot} is a required control number and this builder never ` +
      `invents one, so nothing is emitted. Supply ${field}.`,
  );
}

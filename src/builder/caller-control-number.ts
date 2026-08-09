/**
 * The route an **envelope control number** takes into an emitted document, and
 * the decision it encodes: **a control number that is not a non-empty string is
 * refused - never padded, never coerced, and never emitted as an empty
 * element.**
 *
 * `src/builder/caller-string.ts` bounds whether a caller-supplied element value
 * routed through `esc` is a real *string*. This module bounds the same question
 * plus emptiness for the control numbers, on **both** routes, because the ISA's
 * fixed-width slots never reach `esc`.
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
 * trailing empty element, so the trailer loses it outright. Measured at the same
 * commit in `buildInterchange` and in all seven domain builders:
 *
 * ```text
 * buildInterchange  GS*HC*…*1200**X*005010X222A2~ … ~GE*1*~     ST*837**…~ … ~SE*3*~
 * build834          GS*BE*…*1200**X*005010X220A1~ … ~GE*1~      ST*834**…~ … ~SE*21~
 * ```
 *
 * Every one of those emitted `warnings: []`, which is the property that holds
 * across both families and is all this module needs: no diagnostic separated an
 * absent control number from a supplied one, on any channel. **State the
 * silence, never "the pair reconciled against itself"** - in the domain
 * builders there is no second element to reconcile with, and a draft published
 * the `buildInterchange` reading as the class. Refusing covers both shapes
 * without the message having to know which one it is standing on.
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
 * ## Why the empty test alone was not enough, which is the TYPE half
 *
 * The first version of this guard tested `value === ""` and nothing else, and
 * `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED` is the hole that left. **A
 * non-string is not `""`, so it walked past the guard and reached `padControl`,
 * where the fabrication this module exists to stop happened anyway.** Measured
 * on this tree at base commit `a226595`, through `buildInterchange`:
 *
 * ```text
 * interchangeControlNumber: []                ISA-13 = 000000000   warnings: []
 * interchangeControlNumber: new String("")    ISA-13 = 000000000   warnings: []
 * interchangeControlNumber: new String("ABC") ISA-13 = 000000ABC   warnings: []
 * ```
 *
 * The first two are the **same fabricated `000000000`** the empty test closed,
 * reached through a different input type. The third is not a fabrication but a
 * **silent coercion**, and it is the one this package had already decided
 * against everywhere else: `makeCallerEscaper` refuses a boxed
 * `new String(...)` by name, so the same value was refused at GS-06 and
 * accepted at ISA-13 in the same call.
 *
 * **The split is by ROUTE.** The slots that reach the wire through `esc` were
 * already type-checked, because `makeCallerEscaper` refuses before escaping;
 * the ISA-13 / IEA-02 slots were not, because the ISA is fixed-width, joined
 * directly, and outside both the escaper and the segment guard. `padControl`
 * reads `.length` and then concatenates, so an array-like of length 0 is
 * indistinguishable from `""` to it.
 *
 * **The test went into the shared guard rather than at the nine `padControl`
 * sites, and that choice has a consequence on the OTHER slots that must not be
 * described as "nothing changed".** Every slot routed through here now refuses
 * a non-string from this guard instead of from `esc`, one step earlier. The
 * error class and code are the same either way - each builder's own
 * `refuseSpec`, so no consumer predicate on a code moves - but **the MESSAGE
 * changed on the `esc`-routed slots too**: `esc`'s refusal names the builder
 * and the offending type and cannot name the slot, while this one names the
 * slot and the spec property as well. That is the reason to prefer one guard
 * over nine copies, and it is a behaviour change to a diagnostic, not a
 * no-op.
 *
 * ## What this does NOT do
 *
 * - **It does not trim.** A whitespace-only control number is NOT refused:
 *   `padControl(" ", 9)` still answers `"00000000 "`. `buildTA1` imports no
 *   `pad` at all, so it emits whatever whitespace it was handed, verbatim.
 *   Trimming would be a normalisation rule, and no source consulted for this
 *   package states one. The in-package guards this mirrors are all byte-strict
 *   `=== ""` for the same reason. This is a real residual, and it is recorded in
 *   `KNOWN-LIMITATIONS.md` rather than claimed away.
 *
 *   **The type test does NOT reach it, and the asymmetry it creates has to be
 *   stated rather than smoothed over.** `new String(" ")` is refused now,
 *   because it is not a string; the primitive `" "` still pads to `"00000000 "`
 *   and still builds. Trimming is the rule that would close the primitive, and
 *   nothing here states one, so it stays open. **Do not read the type test as
 *   having narrowed what an accepted control number may CONTAIN** - it narrows
 *   only what it may BE.
 * - **It does not bound the length either way.** A SHORT control number still
 *   zero-pads (`"1"` -> `"000000001"`), and one longer than the slot still draws
 *   `padControl`'s own "exceeds the N-char spec limit" refusal, unchanged.
 * - **It publishes no census of the slots it guards, and none of the ones it
 *   does not.** Which slots route through here is held by
 *   `test/builder-control-number-empty.test.ts` and
 *   `test/builder-control-number-type.test.ts`, not by this prose. What this
 *   module guarantees is the property: **a control number routed through
 *   {@link requireControlNumber} is refused unless it is a non-empty string.**
 *
 * @see `test/builder-control-number-empty.test.ts` - the behavioural gate, one
 * red case per routed slot, the disclosed precedence move, and a drift pin that
 * reds if one of the nine builders it names by hand loses a guard.
 * @see `test/builder-control-number-type.test.ts` - the type half: the four
 * input shapes that used to build, the diagnostics that moved, and the
 * whitespace residual the type test deliberately does not reach.
 */

import { describeCallerValue } from "./caller-string.js";

/**
 * Require a caller-supplied control number to be a real, non-empty string
 * before it is emitted, and refuse with the calling builder's own typed error
 * if it is not.
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
  if (typeof value !== "string") {
    refuse(
      `${at}: ${field} must be a string, but received ${describeCallerValue(value)}. ` +
        `${slot} is a required control number and this builder never coerces one, so nothing is ` +
        `emitted. Convert ${field} at the call site.`,
    );
  }
  if (value !== "") return value;
  refuse(
    `${at}: ${field} is empty. ${slot} is a required control number and this builder never ` +
      `invents one, so nothing is emitted. Supply ${field}.`,
  );
}

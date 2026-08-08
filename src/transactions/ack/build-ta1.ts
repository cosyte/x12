/**
 * `buildTA1` - pure-function builder for an envelope-level TA1 Interchange
 * Acknowledgment. PURE FUNCTION; NEVER auto-sends. The library mechanically
 * builds the disposition it is told; an `A` ack code paired with a note
 * other than `000` (no error) is REFUSED via `AckBuildError` - the same
 * safety invariant as `build999`.
 *
 * Returns the typed {@link Ta1Segment} (matching the envelope-level shape
 * the Phase 3 envelope walker surfaces on
 * {@link "../../parser/types.js".X12Interchange.ta1Segments}). Callers that
 * want a complete on-the-wire byte stream concatenate `raw` + a segment
 * terminator, or wrap the segment inside their preferred envelope. The
 * library does NOT silently invent envelope bytes around it - the caller's
 * application boundary owns whether the TA1 is embedded in an outbound
 * interchange or sent as a standalone TA1-only interchange.
 *
 * ## 🩺 Why every element is released, and what that changed
 *
 * `raw` used to be `[...five caller values].join(elementSeparator)` with
 * nothing in between, so a caller value carrying an active delimiter took
 * a slot of its own and shifted every element after it down one. TA1-04 is
 * the disposition and TA1-05 the note, so the shift landed the read on the
 * wrong pair, and `parseTA1` narrows an out-of-enum TA1-04 to `R`:
 * **an Accept this library emitted read back as a Reject**, with the TA1-01
 * reassociation key merged into TA1-02 and `warnings: []` on every channel.
 * The inverse is the less safe one and also existed: a `noteCode` of
 * literally `"A"` (a value the type forbids and nothing checks at run time)
 * shifted onto TA1-04 and made a **Reject read back as an Accept**, which a
 * sender never resubmits against.
 *
 * The grounding is inside the package, not in a spec clause, which is the
 * same tiebreak `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` recorded: one
 * function disagreed with itself. This module emitted bytes that this
 * package's own reader decoded into a different disposition than the one
 * the caller asked for, and every other builder already released the same
 * class of element through the same helper.
 *
 * **It changes bytes, and that is the cost that kept it open for a slice.**
 * A value containing none of the four delimiters or the release character
 * is emitted byte-for-byte as before, which is every conformant TA1. A
 * value containing one is now released, so its bytes differ from the ones
 * `0.0.14` and earlier put on the wire. What that costs is stated outright
 * below rather than argued away, and **without a total**: two drafts of this
 * account published a closed one and both were refuted.
 *
 * - **The consumer predicate moves in BOTH directions.** Read the property
 *   rather than a direction list: `parseTA1` of a `buildTA1` output now
 *   reports the disposition and note the CALLER passed, where before it
 *   reported whatever element the shift left in TA1-04. So
 *   `ackCode === "R"` stops firing where an Accept had been shifted onto
 *   it, and starts firing where a Reject had been shifted off it -
 *   `interchangeTime: "12*A"` with `ackCode: "R"` read `"A"` before and
 *   reads `"R"` here, every field a valid member of its union. What is
 *   one-directional is the safety, which is a different statement.
 * - **Only three values in the escaped set ever shifted the segment's own
 *   element framing**: the element separator, the segment terminator, and
 *   a `?` immediately before the separator. **`^` and `:` moved the
 *   dot-path reader instead, and releasing them is a GAIN there.**
 *   `getSegmentValue(ta1, "01")` answered `"0000"` before for a control
 *   number of `"0000^0001"`, truncating the reassociation key to the first
 *   repetition, and answers `"0000^0001"` here; the composite read `"01-1"`
 *   answered `"0000"` for `"0000:0001"`. **The measured pure cost is a
 *   MID-STRING `?`, and only on the surfaces documented as raw**: `raw`,
 *   `elements` and `parseTA1`'s fields read `"0000??0001"` where they read
 *   `"0000?0001"`, while the dot-path read of THAT value unescapes and
 *   answered `"0000?0001"` on both. Read the clause as scoped to the
 *   mid-string `?`, because it is not true of `^` or `:` three sentences
 *   up. **`getSegmentValue` takes an `X12Segment` and `Ta1Segment` carries
 *   no `id`, so add one to read a TA1 through it.** No total is published:
 *   that is what was measured, not a closed account.
 * - **`parseTA1` reads elements RAW, pre-`?`-unescape**, exactly as
 *   `X12Segment.elements` has always documented. So a control number of
 *   `"00000001?"` now reads back as `"00000001??"` rather than as
 *   `"00000001?*260601"`. The disposition is correct where it was
 *   inverted; the key still needs `unescapeRelease` applied by the reader.
 *   That is a property of the read half and is not changed here.
 * - **A caller who was pre-releasing the value themselves** (the remedy
 *   `KNOWN-LIMITATIONS.md` named while this was open) is now escaping
 *   twice: `"00000001??"` in, `"00000001????"` out. The framing and the
 *   disposition stay correct, and this one regresses on BOTH kinds of
 *   surface - the dot-path read answers `"00000001??"` where it answered
 *   `"00000001?"`. Drop the hand-rolled escape.
 *
 * **And an EMPTY control number is still not refused.** `escapeRelease`
 * early-returns on `""` and this module has no required-field guard, so
 * `interchangeControlNumber: ""` emits `TA1**260601*1200*A*000` with no
 * error, here and at every earlier release. Only a NON-string refuses.
 *
 * And the release is scoped to the delimiter set the caller states through
 * {@link BuildTA1Options} - see that interface for why guessing one is a
 * value corruption rather than a safe default.
 */

import type { Delimiters, Ta1Segment } from "../../parser/types.js";

import { TA1_ACK_CODES, type Ta1AckCode, type Ta1NoteCode } from "./codes.js";
import { ACK_BUILD_ERROR_CODES, AckBuildError } from "./errors.js";
import type { BuildTA1Spec } from "./types.js";
import { makeCallerEscaper } from "../../builder/caller-string.js";
import { renderCallerValue } from "../../builder/caller-value.js";

/**
 * `buildTA1` - assemble a TA1 Interchange Acknowledgment segment from the
 * supplied spec. The returned {@link Ta1Segment} carries the 1-indexed
 * 5-element value array (`elements[0]` = `"TA1"`, `elements[1]` =
 * TA1-01, …, `elements[5]` = TA1-05) plus the verbatim wire text on `raw`
 * (no segment terminator appended - that's the envelope's job).
 *
 * Safety guards (refused via {@link AckBuildError}):
 *
 * - `ackCode === "A"` paired with `noteCode !== "000"` →
 *   {@link "./errors.js".ACK_BUILD_ERROR_CODES.X12_TA1_ACCEPT_WITH_NOTE}.
 *   Accept must mean accept. Use `E` (accept with errors) when the
 *   inbound had structural defects you elected to ignore. This one runs
 *   FIRST and its precedence is unchanged.
 * - Any of the five element values that is not a `string` →
 *   {@link "./errors.js".ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC}. This
 *   is not a bonus guard: releasing a value means routing it through
 *   {@link "../../builder/caller-string.js".makeCallerEscaper}, and the
 *   bare `escapeRelease` underneath it returns its empty accumulator for a
 *   `number`, so escaping without the type check would have replaced the
 *   shifted-element defect with a silently VANISHED TA1-01. **A number or
 *   an `undefined` control number used to emit as `TA1*12345*…` (the
 *   number surviving onto `elements`, in a `readonly string[]`) or
 *   `TA1**250101*…`; both now refuse.**
 *
 * @param spec - The TA1 fields. `interchangeControlNumber` echoes the
 *               inbound ISA-13; `interchangeDate` / `interchangeTime` echo
 *               the inbound ISA-09 / ISA-10; `ackCode` is the disposition;
 *               `noteCode` is the note (`000` for no-error pairings).
 * @param options - Optional delimiter overrides for callers building TA1
 *                  segments embedded in non-default envelopes. The
 *                  defaults match the cosyte parser archetype (`*` element,
 *                  `~` segment) - override when wrapping a TA1 in an ISA
 *                  envelope whose declared delimiters differ.
 *
 * @example
 * ```ts
 * import { buildTA1 } from "@cosyte/x12";
 *
 * // Accept (canonical "no error" pairing).
 * const ok = buildTA1({
 *   interchangeControlNumber: "000000001",
 *   interchangeDate: "250101",
 *   interchangeTime: "1200",
 *   ackCode: "A",
 *   noteCode: "000",
 * });
 * ok.raw; // 'TA1*000000001*250101*1200*A*000'
 *
 * // Reject (control number mismatch).
 * const reject = buildTA1({
 *   interchangeControlNumber: "000000007",
 *   interchangeDate: "250101",
 *   interchangeTime: "1200",
 *   ackCode: "R",
 *   noteCode: "001",
 * });
 * ```
 */
export function buildTA1(spec: BuildTA1Spec, options: BuildTA1Options = {}): Ta1Segment {
  enforceAcceptIsClean(spec);

  const delimiters: Delimiters = {
    element: options.elementSeparator ?? "*",
    repetition: options.repetitionSeparator ?? "^",
    component: options.componentSeparator ?? ":",
    segment: options.segmentTerminator ?? "~",
  };
  const esc = makeCallerEscaper(delimiters, "buildTA1", refuseSpec);

  const elements: readonly string[] = Object.freeze([
    "TA1",
    esc(spec.interchangeControlNumber),
    esc(spec.interchangeDate),
    esc(spec.interchangeTime),
    esc(spec.ackCode),
    esc(spec.noteCode),
  ]);
  const raw = elements.join(delimiters.element);
  return Object.freeze({ raw, elements });
}

/**
 * Options accepted by {@link buildTA1}: the delimiter set the returned
 * segment will be read against. Every field is optional and defaults to the
 * cosyte parser archetype (`*` element, `^` repetition, `:` component, `~`
 * segment), which is the same four `build999` takes on
 * {@link "./types.js".Build999EnvelopeSpec}.
 *
 * **The three non-element fields exist for ESCAPING and nothing else.**
 * `buildTA1` still emits no segment terminator, no repetition and no
 * composite. It has to know them because a caller value carrying one of
 * them has to be released, and because escaping a byte that is NOT a
 * delimiter where the segment lands corrupts the value: `unescapeRelease`
 * preserves `?X` verbatim for any `X` outside the declared set, so a value
 * released against a guessed delimiter comes back carrying a stray `?`.
 * **If you embed a TA1 in an envelope whose delimiters are not the
 * archetype, state them here** - the defaults are an assumption this
 * function cannot verify, exactly as they were before it escaped anything.
 */
export interface BuildTA1Options {
  readonly elementSeparator?: string;
  readonly repetitionSeparator?: string;
  readonly componentSeparator?: string;
  readonly segmentTerminator?: string;
}

/**
 * Throw this module's typed refusal for a spec field the builder cannot
 * emit. `X12_ACK_INVALID_SPEC` is the existing code for exactly this
 * ("a spec field violated a structural constraint the builder cannot
 * recover from") and is reused rather than joined by a new one: a consumer
 * does not have to ACT differently on a wrong-typed TA1 element than on
 * `build999`'s wrong-typed one, and minting a code because the CAUSE
 * differs is what moves cases off predicates consumers already wrote.
 *
 * @internal
 */
function refuseSpec(message: string): never {
  throw new AckBuildError(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC, message);
}

/**
 * Refuse a fabricated `A` (accept) paired with a non-`000` note code.
 *
 * @internal
 */
function enforceAcceptIsClean(spec: BuildTA1Spec): void {
  if (spec.ackCode === TA1_ACK_CODES.A && spec.noteCode !== "000") {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_TA1_ACCEPT_WITH_NOTE,
      `buildTA1: TA1-04 was "A" (Accept) but TA1-05 carried note ${renderCallerValue(spec.noteCode)}. An accept must cite "000" (no error). Use ackCode "E" (accept, errors noted) when the inbound had defects you elected to ignore.`,
    );
  }
}

// Type-only re-exports for callers wanting just the TA1 surface.
export type { Ta1AckCode, Ta1NoteCode };

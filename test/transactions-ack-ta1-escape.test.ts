/**
 * `X12-TA1-EMIT-NOT-RELEASE-AWARE`: an Accept `TA1` this library emitted read
 * back as a REJECT, and the emit half is what changed.
 *
 * ## The defect
 *
 * `buildTA1` joined its five caller-supplied elements with the element
 * separator and released none of them. A value carrying an active delimiter
 * therefore took a slot of its own and shifted every element after it down
 * one. TA1-04 is the disposition and TA1-05 the note, so the read landed on
 * the wrong pair, and `parseTA1` narrows an out-of-enum TA1-04 to `R`.
 * Measured on this tree at base commit `e8f34b9`, with `parseX12` + `parseTA1`
 * over `ISA … <the TA1 buildTA1 returned> … IEA`:
 *
 * ```text
 * interchangeControlNumber   raw                                 read ackCode  read TA1-01          warnings
 * "000000001"                TA1*000000001*260601*1200*A*000     "A"           "000000001"          []
 * "00000001?"                TA1*00000001?*260601*1200*A*000     "R"           "00000001?*260601"   []
 * "0000*0001"                TA1*0000*0001*260601*1200*A*000     "R"           "0000"               []
 * "0000~0001"                TA1*0000~0001*260601*1200*A*000     "R"           "0000"               [X12_UNEXPECTED_SEGMENT]
 * ```
 *
 * Three of the four are an Accept this library emitted reading back as a
 * Reject, on the element that reassociates the acknowledgment. The `*` and `~`
 * rows did that on EVERY released version; the `?` row is the one
 * `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` opened, because before it the
 * envelope splitter was a plain `String.prototype.split`.
 *
 * **🩺 And the inverse is the less safe direction.** The read narrows an
 * out-of-enum TA1-04 to `R`, so a well-typed shift always lands on Reject -
 * but `noteCode` is checked by the type system and by nothing at run time, so
 * a `noteCode` of literally `"A"` shifted onto TA1-04 and made a **Reject read
 * back as an Accept**. A sender who reads an Accept does not resubmit.
 *
 * ## Why the fix is grounded, given that 005010 does not settle it
 *
 * The same way `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`'s was: **one function
 * disagreeing with itself, inside this package.** `buildTA1` emitted bytes
 * that this package's own reader decoded into a different disposition than the
 * caller asked for, while every other builder already released the same class
 * of element through the same helper. That is a fact about this tree, not a
 * clause anyone here has read, and it is stated that way on purpose.
 *
 * ## What it costs, pinned rather than argued away
 *
 * Escaping changes bytes this library already put on the wire, which is why
 * `#96` left it. The change is bounded to values that carry a delimiter or the
 * release character, so every conformant TA1 is byte-identical. **Two drafts
 * of this file published a CLOSED account of what it costs and pass 1 refuted
 * the second, so the costs below are named without a total** - finding one
 * more is expected and is not a new finding:
 *
 * - **The consumer predicate moves in BOTH directions**, exactly as `#96`'s
 *   did. `ackCode === "R"` stops firing where an Accept had been shifted onto
 *   it and STARTS firing where a Reject had been shifted off it, and the
 *   second needs no run-time-only value to reach.
 * - **Only three values in the escaped set ever shifted an element.** A
 *   mid-string `?`, a `:` and a `^` round-tripped at base and no longer do,
 *   for no framing gain, and so does a caller who was hand-rolling the escape.
 * - **A caller who embeds a TA1 in a NON-archetype envelope without stating
 *   its delimiters** gets a stray `?` where the value was previously verbatim,
 *   which is why `BuildTA1Options` gained the other three separators rather
 *   than the escape being run against a guess.
 * - **An EMPTY control number is still not refused**, here or at any earlier
 *   release. Only a non-string refuses.
 */

import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  buildTA1,
  parseTA1,
  parseX12,
  unescapeRelease,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

const ISA = buildIsa();

const ACCEPT = {
  interchangeDate: "260601",
  interchangeTime: "1200",
  ackCode: "A",
  noteCode: "000",
} as const;

/** Emit a TA1, wrap it in a TA1-only interchange, read it back. */
function roundTrip(spec: Parameters<typeof buildTA1>[0]): {
  readonly raw: string;
  readonly ackCode: string | undefined;
  readonly controlNumber: string | undefined;
  readonly noteCode: string | undefined;
  readonly warnings: readonly string[];
} {
  const ta1 = buildTA1(spec);
  const parsed = parseX12(`${ISA}${ta1.raw}~IEA*0*000000001~`);
  const read = parseTA1(parsed);
  return {
    raw: ta1.raw,
    ackCode: read?.ackCode,
    controlNumber: read?.interchangeControlNumber,
    noteCode: read?.noteCode,
    warnings: parsed.warnings.map((w) => w.code),
  };
}

describe("X12-TA1-EMIT-NOT-RELEASE-AWARE: an Accept this library emits no longer reads back as a Reject", () => {
  it("🩺 closes all three shift shapes, and the whole warning channel stays empty", () => {
    // Every row asserts the WHOLE warnings array, so none of these can pass by
    // matching a code that happens to be absent.
    expect(roundTrip({ ...ACCEPT, interchangeControlNumber: "00000001?" })).toEqual({
      raw: "TA1*00000001??*260601*1200*A*000", // was TA1*00000001?*260601*1200*A*000
      ackCode: "A", // was "R"
      controlNumber: "00000001??", // was "00000001?*260601"
      noteCode: "000", // was undefined
      warnings: [],
    });
    expect(roundTrip({ ...ACCEPT, interchangeControlNumber: "0000*0001" })).toEqual({
      raw: "TA1*0000?*0001*260601*1200*A*000", // was TA1*0000*0001*260601*1200*A*000
      ackCode: "A", // was "R"
      controlNumber: "0000?*0001", // was "0000"
      noteCode: "000",
      warnings: [],
    });
    expect(roundTrip({ ...ACCEPT, interchangeControlNumber: "0000~0001" })).toEqual({
      raw: "TA1*0000?~0001*260601*1200*A*000", // was TA1*0000~0001*260601*1200*A*000
      ackCode: "A", // was "R"
      controlNumber: "0000?~0001", // was "0000"
      noteCode: "000",
      warnings: [], // was ["X12_UNEXPECTED_SEGMENT"]
    });
  });

  it("🩺 closes the INVERSE, which is the less safe direction: a Reject no longer reads back as an Accept", () => {
    // `noteCode: "A"` is forbidden by the type and checked by nothing at run
    // time, which is the whole point - it is what a JS or JSON caller can
    // reach. At base the shift put that "A" on TA1-04 and the read answered
    // Accept for a segment whose disposition element said "R".
    const read = roundTrip({
      interchangeControlNumber: "00000001?",
      interchangeDate: "260601",
      interchangeTime: "1200",
      ackCode: "R",
      noteCode: "A" as never,
    });
    expect(read.ackCode).toBe("R"); // was "A"
    expect(read.raw).toBe("TA1*00000001??*260601*1200*R*A");
    // The note is still not a member of the TA1 note code list, so the typed
    // narrow still collapses. Nothing here fabricates one.
    expect(read.noteCode).toBeUndefined();
    expect(read.warnings).toEqual([]);
  });

  it("is the negative control: a GENUINE Reject still reads back as a Reject", () => {
    // Without this the suite above is satisfied by a change that simply made
    // everything read Accept.
    expect(
      roundTrip({
        interchangeControlNumber: "000000007",
        interchangeDate: "260601",
        interchangeTime: "1200",
        ackCode: "R",
        noteCode: "001",
      }),
    ).toEqual({
      raw: "TA1*000000007*260601*1200*R*001",
      ackCode: "R",
      controlNumber: "000000007",
      noteCode: "001",
      warnings: [],
    });
  });

  it("🛑 leaves every conformant TA1 byte-identical, which bounds what changed on the wire", () => {
    // The reason this slice was deferrable and the reason it is shippable are
    // the same fact: escaping only moves bytes for a value carrying one of the
    // four delimiters or the release character. TA1-01 echoes ISA-13, TA1-02 /
    // TA1-03 echo ISA-09 / ISA-10, and TA1-04 / TA1-05 are code list values,
    // so none of a conformant acknowledgment's five elements changes.
    for (const controlNumber of ["000000001", "000000007", "ABC123XYZ", "0"]) {
      const ta1 = buildTA1({ ...ACCEPT, interchangeControlNumber: controlNumber });
      expect(ta1.raw).toBe(`TA1*${controlNumber}*260601*1200*A*000`);
      expect(ta1.raw).not.toContain("?");
    }
  });
});

describe("X12-TA1-EMIT-NOT-RELEASE-AWARE: the two costs, disclosed and pinned", () => {
  it("🩺 the key reads back RAW, so it still needs unescapeRelease - the READ half is unchanged", () => {
    // `parseTA1` reads elements verbatim, exactly as `X12Segment.elements` has
    // always documented. Closing the disposition inversion does NOT make the
    // round trip an identity on a released value, and this slice deliberately
    // does not touch the read half: unescaping there would move every TA1 a
    // consumer already reads.
    const read = roundTrip({ ...ACCEPT, interchangeControlNumber: "00000001?" });
    expect(read.controlNumber).toBe("00000001??");
    expect(read.controlNumber).not.toBe("00000001?");
    // What the consumer does about it, which is the documented route:
    const d = { element: "*", repetition: "^", component: ":", segment: "~" };
    expect(unescapeRelease(read.controlNumber ?? "", d, () => {}, { segmentIndex: 0 })).toBe(
      "00000001?",
    );
  });

  it("🛑 the values that get LONGER bytes for no framing gain, which is not one class", () => {
    // A draft of this file called the hand-rolled-escape caller "the one class
    // whose bytes get worse" and pass 1 refuted it. Only THREE values in the
    // escaped set ever shifted a TA1 element: `*`, `~`, and a `?` immediately
    // before the separator. A MID-STRING `?`, a `:` and a `^` were emitted
    // verbatim at base and round-tripped through this package's own reader;
    // here they are released, the disposition is unaffected, and the
    // reassociation key stops round-tripping. Released anyway because the
    // alternative is an escaper that is a SUBSET of `escapeRelease`, which puts
    // this module back outside the chokepoint. Pinned as the trade it is.
    expect(roundTrip({ ...ACCEPT, interchangeControlNumber: "0000?0001" })).toMatchObject({
      raw: "TA1*0000??0001*260601*1200*A*000", // was TA1*0000?0001*260601*1200*A*000
      ackCode: "A", // "A" at base too - no framing was ever at stake here
      controlNumber: "0000??0001", // was "0000?0001"
    });
    expect(roundTrip({ ...ACCEPT, interchangeControlNumber: "0000:0001" })).toMatchObject({
      raw: "TA1*0000?:0001*260601*1200*A*000",
      ackCode: "A",
      controlNumber: "0000?:0001", // was "0000:0001"
    });
    expect(roundTrip({ ...ACCEPT, interchangeControlNumber: "0000^0001" })).toMatchObject({
      raw: "TA1*0000?^0001*260601*1200*A*000",
      ackCode: "A",
      controlNumber: "0000?^0001", // was "0000^0001"
    });
  });

  it('🛑 the predicate moves in BOTH directions: `ackCode === "R"` STARTS firing here', () => {
    // A draft published "one direction only, nothing starts" and pass 1 refuted
    // it in one probe. The property is that head reports the disposition the
    // CALLER passed and base reported whatever the shift left in slot 4, so
    // every predicate over `ackCode` gains cases as well as losing them. Note
    // there is no `as never` anywhere here: every field is a valid member of
    // its own union, so this needs no run-time-only value to reach.
    const read = roundTrip({
      interchangeControlNumber: "000000001",
      interchangeDate: "260601",
      interchangeTime: "12*A",
      ackCode: "R",
      noteCode: "001",
    });
    expect(read.raw).toBe("TA1*000000001*260601*12?*A*R*001"); // was TA1*000000001*260601*12*A*R*001
    expect(read.ackCode).toBe("R"); // was "A" - a consumer rejecting on "R" now rejects this
    expect(read.controlNumber).toBe("000000001");
  });

  it("does NOT refuse an empty control number, and never did", () => {
    // `escapeRelease` early-returns on `""` and `buildTA1` has no
    // required-field guard, unlike `build835`'s `patientControlNumber`. Only a
    // NON-string refuses. Pinned so "a silently empty TA1-01 is no longer
    // possible" cannot be written again: a draft of `caller-segment.ts` wrote
    // it and pass 1 refuted it.
    expect(buildTA1({ ...ACCEPT, interchangeControlNumber: "" }).raw).toBe(
      "TA1**260601*1200*A*000",
    );
    expect(buildTA1({ ...ACCEPT, interchangeControlNumber: "   " }).raw).toBe(
      "TA1*   *260601*1200*A*000",
    );
  });

  it("🩺 a caller who was hand-rolling the escape now escapes twice", () => {
    // `KNOWN-LIMITATIONS.md` told callers to "escape or reject a `?` yourself"
    // while this was open. The disposition was already correct for them and
    // stays correct, and the key gains the extra pair. Pinned so the
    // instruction to drop the hand-rolled escape cannot quietly go stale.
    const read = roundTrip({ ...ACCEPT, interchangeControlNumber: "00000001??" });
    expect(read.raw).toBe("TA1*00000001????*260601*1200*A*000");
    expect(read.ackCode).toBe("A");
    expect(read.controlNumber).toBe("00000001????");
  });

  it("🛑 releases against the delimiters the caller STATES, because guessing one corrupts a value", () => {
    // A caller embedding a TA1 in an envelope terminated by `^`: a `~` in the
    // value is NOT a delimiter there, and releasing it would insert a `?`
    // before a byte `unescapeRelease` preserves verbatim, so the value would
    // come back carrying a stray `?`. Stating the set is what makes the escape
    // right instead of a guess.
    const nonArchetype = {
      elementSeparator: "|",
      repetitionSeparator: "+",
      componentSeparator: "!",
      segmentTerminator: "^",
    } as const;
    expect(buildTA1({ ...ACCEPT, interchangeControlNumber: "0000~0001" }, nonArchetype).raw).toBe(
      "TA1|0000~0001|260601|1200|A|000",
    );
    // And the byte that IS a delimiter there is released, on the same call.
    expect(buildTA1({ ...ACCEPT, interchangeControlNumber: "0000^0001" }, nonArchetype).raw).toBe(
      "TA1|0000?^0001|260601|1200|A|000",
    );

    // The cost of NOT stating it, which is the defaults being an assumption
    // this function cannot verify. Unchanged in KIND from before the escape
    // existed - the defaults were already documented as the cosyte archetype -
    // but it now has a byte-level consequence, so it is pinned rather than
    // claimed away.
    expect(
      buildTA1({ ...ACCEPT, interchangeControlNumber: "0000~0001" }, { elementSeparator: "|" }).raw,
    ).toBe("TA1|0000?~0001|260601|1200|A|000");
  });
});

describe("X12-TA1-EMIT-NOT-RELEASE-AWARE: the type check the escape required", () => {
  // Not a bonus guard. `makeCallerEscaper` is the only route to the release
  // helper that type-checks first, and the bare `escapeRelease` underneath it
  // returns its empty accumulator for a `number` - so escaping WITHOUT the
  // check would have traded a shifted TA1-01 for a vanished one.

  it("🩺 refuses a non-string element instead of coercing it onto the model", () => {
    // At base `elements[1]` came back as the NUMBER 12345, inside a value
    // typed `readonly string[]`, and `raw` read TA1*12345*260601*1200*A*000.
    const run = (): unknown =>
      buildTA1({ ...ACCEPT, interchangeControlNumber: 12345 as unknown as string });
    // Assert the MESSAGE, not the class: `toThrow(AckBuildError)` passes on an
    // unrelated refusal, which is how four cases in a sibling slice went
    // vacuous.
    expect(run).toThrow(/buildTA1: every element value must be a string, but received a number/u);
    try {
      run();
      expect.unreachable("buildTA1 accepted a numeric element");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
      expect((err as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC);
      // The refusal names the TYPE and never echoes the value: this guard
      // stands on TA1-01, which is a partner control number.
      expect((err as AckBuildError).message).not.toContain("12345");
    }
  });

  it("🩺 refuses an absent control number, which used to emit the key away silently", () => {
    // `TA1**250101*1200*A*000` was the base behaviour and was named as a live
    // hazard in three places. An absent reassociation key is not recoverable
    // by the receiver.
    expect(() =>
      buildTA1({ ...ACCEPT, interchangeControlNumber: undefined as unknown as string }),
    ).toThrow(/buildTA1: every element value must be a string, but received undefined/u);
    expect(() =>
      buildTA1({ ...ACCEPT, interchangeControlNumber: null as unknown as string }),
    ).toThrow(/buildTA1: every element value must be a string, but received null/u);
  });

  it("leaves the accept-with-note refusal FIRST, so no existing refusal moves code", () => {
    // `enforceAcceptIsClean` still runs before anything is escaped. A spec
    // that trips both guards must still report the disposition one, or a
    // consumer branching on X12_TA1_ACCEPT_WITH_NOTE goes blind.
    try {
      buildTA1({
        interchangeControlNumber: 12345 as unknown as string,
        interchangeDate: "260601",
        interchangeTime: "1200",
        ackCode: "A",
        noteCode: "001",
      });
      expect.unreachable("buildTA1 accepted an Accept carrying a non-000 note");
    } catch (err) {
      expect((err as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_TA1_ACCEPT_WITH_NOTE);
    }
  });
});

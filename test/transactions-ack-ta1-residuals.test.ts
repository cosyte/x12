/**
 * `X12-TA1-RESIDUALS`: the two acknowledgment-path residuals the TA1 arc left
 * open, closed as one slice because they are the same disagreement seen from
 * each end.
 *
 * ## What was measured at base `67f1831`, and the filed line was a FLOOR
 *
 * The backlog filed **two** slots dropping silently on `""` (TA1-02, TA1-03).
 * The census is **four** - TA1-02, TA1-03, TA1-04 and TA1-05 - and it is one
 * mechanism: `escapeRelease` early-returns on `""` and `buildTA1` carried a
 * required-field guard for TA1-01 alone. Every cell `warnings: []`.
 *
 * The read half is the other end of the same arc. `X12-TA1-EMIT-NOT-RELEASE-
 * AWARE` made `buildTA1` release all five caller elements; `parseTA1` kept
 * reading the escaped bytes, so the round trip through this package's own
 * emit and read halves was NOT an identity on any value carrying a delimiter
 * or the release character - measured on six values, six not equal, every one
 * `warnings: []`. The same elements read through `getSegmentValue` answered
 * the caller's string on all six, because every dot-path read already
 * unescapes, and so does `parse999` on the IK4-01 composite in this same
 * directory. 🛑 A clause calling `parseTA1` "the only typed reader in the
 * package that did not" is DELETED, not reworded - it was measured false.
 *
 * ## The grounding, and what it deliberately is NOT
 *
 * Both halves stand on **this package disagreeing with itself** - a build spec
 * whose type declares five required strings emitting an absent element, and a
 * reader answering with the escape where every sibling reader answers with the
 * value. Neither stands on a TR3 usage clause, and nothing here asserts one.
 *
 * **No normalisation rule is introduced.** A whitespace-only element still
 * builds at all five slots, by design and unchanged: trimming is a
 * normalisation rule and no source consulted for this package states one. The
 * controls below pin that residual so it cannot be closed by accident.
 *
 * **The read half stays lenient.** An out-of-enum TA1-04 that is not empty
 * still narrows to `R`, and this slice bounds ABSENCE on the emit side only.
 */

import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  buildTA1,
  getSegmentValue,
  parseTA1,
  parseX12,
  type X12Segment,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

const ISA = buildIsa();
const D = { element: "*", repetition: "^", component: ":", segment: "~" } as const;

const ACCEPT = {
  interchangeControlNumber: "000000001",
  interchangeDate: "260601",
  interchangeTime: "1200",
  ackCode: "A",
  noteCode: "000",
} as const;

/** The same spec with a REJECT disposition, so `enforceAcceptIsClean` cannot mask a slot. */
const REJECT = { ...ACCEPT, ackCode: "R", noteCode: "001" } as const;

/** Read a TA1 back through the FULL public route - bytes, `parseX12`, `parseTA1`. */
function readBack(raw: string) {
  const ix = parseX12(`${ISA}${raw}~IEA*0*000000001~`);
  return { ta1: parseTA1(ix), warnings: ix.warnings };
}

/** `Ta1Segment` carries no `id`, so a dot-path read of one needs it added. */
function withId(elements: readonly string[]): X12Segment {
  return Object.freeze({ id: "TA1", raw: elements.join("*"), elements });
}

describe("X12-TA1-RESIDUALS, read half: the decoded fields are post-`?`-unescape", () => {
  // The five values are the ones the emit half releases. Each is a value the
  // caller stated; at base each came back carrying the escape.
  const cases: ReadonlyArray<readonly [string, string]> = [
    ["the release character", "00000001?"],
    ["the element separator", "0000*0001"],
    ["the segment terminator", "0000~0001"],
    ["the component separator", "0000:0001"],
    ["the repetition separator", "0000^0001"],
  ];

  for (const [label, value] of cases) {
    it(`🩺 round-trips TA1-01 carrying ${label} - the reassociation key matches what was passed`, () => {
      const built = buildTA1({ ...ACCEPT, interchangeControlNumber: value });
      const { ta1, warnings } = readBack(built.raw);
      // The decoded field IS the caller's value. At base it was the escaped
      // form, which matches no ISA-13.
      expect(ta1?.interchangeControlNumber).toBe(value);
      // And it agrees with the dot-path read, which already unescaped at base.
      expect(getSegmentValue(withId(ta1?.raw.elements ?? []), "01", D)).toBe(value);
      // `raw` is untouched and still carries the escape.
      expect(ta1?.raw.elements[1]).toBe(built.elements[1]);
      expect(ta1?.ackCode).toBe("A");
      expect(warnings).toEqual([]);
    });
  }

  it("🩺 all five decoded fields unescape, not TA1-01 alone", () => {
    // Read from BYTES rather than through a builder, so this asserts the READ
    // and never a refusal. Each element carries `?*`, a released element
    // separator, in a different slot.
    const { ta1, warnings } = readBack("TA1*0000?*01*2606?*01*12?*00*?*A*0?*00");
    expect(ta1?.interchangeControlNumber).toBe("0000*01");
    expect(ta1?.interchangeDate).toBe("2606*01");
    expect(ta1?.interchangeTime).toBe("12*00");
    // TA1-04 is `*A` after the unescape, which is not a member of I13, so the
    // documented fail-safe narrow still collapses it to `R`. The read half's
    // leniency is unchanged; only the bytes it decodes from are.
    expect(ta1?.ackCode).toBe("R");
    expect(ta1?.noteCodeRaw).toBe("0*00");
    expect(ta1?.noteCode).toBeUndefined();
    expect(warnings).toEqual([]);
  });

  it("is the negative control: a value with no `?` is byte-identical on both surfaces", () => {
    // Without this, an unescape that mangled ordinary values would still pass
    // every case above.
    const { ta1, warnings } = readBack("TA1*000000001*260601*1200*A*000");
    expect(ta1?.interchangeControlNumber).toBe("000000001");
    expect(ta1?.interchangeDate).toBe("260601");
    expect(ta1?.interchangeTime).toBe("1200");
    expect(ta1?.ackCode).toBe("A");
    expect(ta1?.noteCodeRaw).toBe("000");
    expect(ta1?.raw.elements).toEqual(["TA1", "000000001", "260601", "1200", "A", "000"]);
    expect(warnings).toEqual([]);
  });

  it("is the second negative control: `?X` outside the delimiter set is PRESERVED, not eaten", () => {
    // `unescapeRelease` keeps `?X` verbatim for any `X` outside the declared
    // set. A reader that stripped every `?` would pass the cases above and
    // silently delete a byte here.
    const { ta1, warnings } = readBack("TA1*0000?X0001*260601*1200*A*000");
    expect(ta1?.interchangeControlNumber).toBe("0000?X0001");
    expect(warnings).toEqual([]);
  });

  it("🛑 the unescape runs against the INTERCHANGE's declared set, not the archetype", () => {
    // On an envelope declaring `|` as the element separator, `?|` is an escape
    // and `?*` is not. Reading against the archetype would invert both cells.
    const isa = buildIsa({ element: "|", component: "!", repetition: "+", segment: "^" });
    const ix = parseX12(`${isa}TA1|0000?|0001|260601|1200|A|000^IEA|0|000000001^`);
    const ta1 = parseTA1(ix);
    expect(ta1?.interchangeControlNumber).toBe("0000|0001");

    const ix2 = parseX12(`${isa}TA1|0000?*0001|260601|1200|A|000^IEA|0|000000001^`);
    expect(parseTA1(ix2)?.interchangeControlNumber).toBe("0000?*0001");
  });
});

describe("X12-TA1-RESIDUALS, emit half: an empty required TA1 element is refused", () => {
  // FOUR slots, not the two the item filed. One case per slot; each asserts the
  // MESSAGE and not merely the class, because `expect(run).toThrow(AckBuildError)`
  // passes on an unrelated refusal - the trap `X12-DECIMAL-BYPASSES-THE-GUARD`
  // recorded after four of six cases were vacuous that way.
  const slots: ReadonlyArray<readonly [keyof typeof ACCEPT, string]> = [
    ["interchangeDate", "TA1-02"],
    ["interchangeTime", "TA1-03"],
    ["ackCode", "TA1-04"],
    ["noteCode", "TA1-05"],
  ];

  for (const [field, slot] of slots) {
    it(`🩺 refuses an empty ${slot} (${field}), which BUILT with warnings: [] at base`, () => {
      // `noteCode` has to be probed against a non-Accept disposition, or
      // `enforceAcceptIsClean` reaches it first and the case measures that
      // guard instead. That masking is real and is pinned as a control below.
      const spec = { ...REJECT, [field]: "" as never };
      const run = (): unknown => buildTA1(spec);
      expect(run).toThrow(AckBuildError);
      expect(run).toThrow(`buildTA1: ${field} is empty. ${slot} is a required element`);
      try {
        run();
        expect.unreachable("buildTA1 should have refused");
      } catch (e) {
        expect((e as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC);
        // The refusal names the slot and the spec property and never a value.
        expect((e as AckBuildError).message).not.toContain('""');
      }
    });
  }

  it("is the negative control: every slot populated still builds, and reads back intact", () => {
    const built = buildTA1(ACCEPT);
    expect(built.raw).toBe("TA1*000000001*260601*1200*A*000");
    const { ta1, warnings } = readBack(built.raw);
    expect(ta1?.ackCode).toBe("A");
    expect(ta1?.noteCode).toBe("000");
    expect(warnings).toEqual([]);
  });

  it("⚖️ does NOT trim: a whitespace-only element still builds, at every slot", () => {
    // Disclosed, not fixed. Trimming is a normalisation rule and no source
    // consulted for this package states one - the same call
    // `X12-EMPTY-CONTROL-NUMBER-FABRICATED` made at TA1-01, held here so the
    // two guards cannot drift apart.
    for (const field of [
      "interchangeControlNumber",
      "interchangeDate",
      "interchangeTime",
      "ackCode",
    ] as const) {
      const built = buildTA1({ ...REJECT, [field]: " " as never });
      expect(built.elements).toContain(" ");
    }
    expect(buildTA1({ ...REJECT, noteCode: " " as never }).raw).toBe(
      "TA1*000000001*260601*1200*R* ",
    );
  });

  it("🛑 does NOT narrow what a non-empty element may CONTAIN", () => {
    // An out-of-enum TA1-04 is not what this guard is about. It still builds,
    // and the read half's documented fail-safe narrow still answers `R` - the
    // same answer it gives for the empty one, which is exactly why the claim
    // here is about ABSENCE and carries no story about the readback.
    const built = buildTA1({ ...ACCEPT, ackCode: "X" as never });
    expect(built.raw).toBe("TA1*000000001*260601*1200*X*000");
    expect(readBack(built.raw).ta1?.ackCode).toBe("R");
  });
});

describe("X12-TA1-RESIDUALS: the guards that were already here keep their precedence", () => {
  it("🛑 `enforceAcceptIsClean` still runs FIRST, so an Accept with an empty note reports ITS code", () => {
    const run = (): unknown => buildTA1({ ...ACCEPT, noteCode: "" as never });
    expect(run).toThrow(/TA1-04 was "A" \(Accept\) but TA1-05 carried note/);
    try {
      run();
      expect.unreachable("buildTA1 should have refused");
    } catch (e) {
      expect((e as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_TA1_ACCEPT_WITH_NOTE);
    }
  });

  it("🛑 TA1-01 still draws the CONTROL-NUMBER refusal, not the new one", () => {
    expect(() => buildTA1({ ...ACCEPT, interchangeControlNumber: "" })).toThrow(
      "buildTA1: interchangeControlNumber is empty. TA1-01 is a required control number",
    );
  });

  it("🛑 a wrong-TYPED element still draws the escaper's refusal, at every slot", () => {
    // Every `esc` call runs before any emptiness test and in the same order as
    // at base, so no spec that refused at base refuses differently at head.
    // This is what pins that: an empty TA1-02 paired with a numeric TA1-04
    // still reports the TYPE refusal.
    expect(() => buildTA1({ ...REJECT, interchangeDate: "", noteCode: 1 as never })).toThrow(
      "every element value must be a string, but received a number",
    );
    expect(() => buildTA1({ ...ACCEPT, interchangeTime: undefined as never })).toThrow(
      "every element value must be a string, but received undefined",
    );
  });

  it("🛑 a delimiter set with `?` in any role is still refused ahead of all of it", () => {
    expect(() => buildTA1({ ...ACCEPT, interchangeDate: "" }, { componentSeparator: "?" })).toThrow(
      /release character/i,
    );
  });
});

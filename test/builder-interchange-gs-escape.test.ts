/**
 * `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE`: `buildInterchange` releases
 * GS-04, GS-05 and GS-07, so the interchange it hands back reports the values
 * the caller passed.
 *
 * ## What was measured at base `837d4bc`
 *
 * `buildGroup` mapped `esc` over GS-01, GS-02, GS-03, GS-06 and GS-08 and
 * emitted GS-04 (`groupDate`), GS-05 (`groupTime`) and GS-07
 * (`responsibleAgencyCode`) RAW. `buildInterchange` returns `parseX12` of the
 * bytes it just wrote, so a caller value carrying an active delimiter in one of
 * those three slots took a slot of its own and shifted every element after it
 * down one - inside a single function call, with the read half doing exactly
 * what it is documented to do:
 *
 * ```text
 * groupDate "2026*0601"          GS-06 read "1200", GS-08 read "X"
 *                                warnings: [X12_CONTROL_NUMBER_MISMATCH]
 * groupTime "12*00"              GS-06 read "00",   GS-08 read "X"
 *                                warnings: [X12_CONTROL_NUMBER_MISMATCH]
 * responsibleAgencyCode "X*Y"    GS-08 read "Y";    warnings: []
 * groupTime "12~00"              the GS segment ENDED mid-element; the ST/SE
 *                                pair became orphans
 * groupDate "20260601?"          GS-04 merged with GS-05, GS-08 gone entirely
 * ```
 *
 * **The `responsibleAgencyCode` row is the sharp one: nothing was raised on any
 * channel.** GS-06 kept its own slot, so GS-06 and GE-02 still reconciled and
 * no control-number warning fired; what moved was GS-08, the version /
 * release / industry identifier code, which is the slot
 * `X12-837-EMIT-IDENTIFIER-FIXED` made the caller state.
 *
 * ## The grounding is inside the package, not in a spec clause
 *
 * The same tiebreak `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` and
 * `X12-TA1-EMIT-NOT-RELEASE-AWARE` recorded, and it is NOT re-derived here as a
 * spec fact: one function disagreed with itself, and every one of the seven
 * domain builders already released these same three slots through its own
 * `esc`. `SegmentSpec`'s documented contract says the builder applies the
 * release escape so an active delimiter inside a value survives.
 *
 * ## 🛑 It changes bytes, and the property is the thing to read
 *
 * A value containing none of the four delimiters and no `?` is emitted
 * byte-for-byte as before, which is every conformant GS-04 / GS-05 / GS-07.
 * A value containing one is released, so its bytes differ from what `0.0.15`
 * and earlier put on the wire.
 *
 * **The property: the interchange `buildInterchange` returns now reports the
 * GS-04 / GS-05 / GS-07 values the CALLER passed, where before it reported
 * whatever the shift left in each slot.** No direction list is published - two
 * drafts of the sibling slices' cost bullets published one and both were
 * refuted. What IS narrower here than in either sibling, and is checkable
 * rather than argued: **no reader moved.** `src/parser/` is untouched, so an
 * inbound document from a trading partner decodes exactly as it did at
 * `0.0.15`; what changed is the bytes this library emits and therefore how its
 * own output reads back.
 *
 * **Only `*` and `~` ever shifted the segment's own element framing, plus a `?`
 * immediately before the separator.** `^` and `:` moved the DOT-PATH reader
 * instead, and releasing them is a GAIN there - pinned below. The measured pure
 * cost is a MID-STRING `?`, and only on the surfaces documented as raw. No
 * total is published: that is what was measured, not a closed account.
 *
 * ## The type check was kept where it names the slot
 *
 * Routing these three through `esc` alone would have traded a shifted element
 * for a worse diagnostic. `esc` is unary, so its refusal can only name the
 * BUILDER; `requireCallerSegment` holds the whole segment and derives
 * `"GS"-04`. `buildGroup` therefore type-checks the UNESCAPED GS parts before
 * escaping them, and `joinSeg`'s own call stays as the structural backstop.
 * Pinned below, because the sibling slice's lesson was exactly this shape: do
 * not trade one defect for a different one on the way past.
 */

import { describe, expect, it } from "vitest";

import {
  buildInterchange,
  getSegmentValue,
  parseX12,
  X12BuildError,
  type X12Interchange,
  type X12Segment,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

const VERSION_RELEASE = "005010X222A2";

/** One group, one transaction, with the group fields under test overridable. */
function build(group: Record<string, unknown>): X12Interchange {
  return buildInterchange({
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groups: [
      {
        functionalIdCode: "HC",
        groupControlNumber: "1",
        versionRelease: VERSION_RELEASE,
        transactions: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            segments: [["CLM", "PTACCT", "150.00"]],
          },
        ],
        ...group,
      },
    ],
  });
}

/** The GS the call returned, as something `getSegmentValue` will read. */
function gsOf(ix: X12Interchange): X12Segment {
  const gs = ix.groups[0]?.gs;
  // `GsSegment` carries no `id`, so a dot-path read of one needs one added.
  return Object.freeze({ id: "GS", raw: gs?.raw ?? "", elements: gs?.elements ?? [] });
}

const D = { element: "*", repetition: "^", component: ":", segment: "~" } as const;

describe("X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE: the three raw GS slots", () => {
  it("🩺 GS-07 was the SILENT one: an agency code carrying a separator took GS-08's slot", () => {
    // At base this emitted `…*1*X*Y*005010X222A2` - ten entries - and the
    // returned interchange answered GS-08 as "Y" with an EMPTY warning array,
    // because GS-06 kept its slot and still reconciled against GE-02. GS-08 is
    // the version / release / industry identifier code.
    const ix = build({ responsibleAgencyCode: "X*Y" });
    const gs = gsOf(ix);
    expect(gs.raw).toBe("GS*HC*SENDER*RECEIVER*20260601*1200*1*X?*Y*005010X222A2");
    expect(gs.elements).toHaveLength(9); // ten at base
    expect(getSegmentValue(gs, "07", D)).toBe("X*Y"); // "X" at base
    expect(getSegmentValue(gs, "08", D)).toBe(VERSION_RELEASE); // "Y" at base
    // Whole array, so this cannot pass vacuously.
    expect(ix.warnings.map((w) => w.code)).toEqual([]);
  });

  it("🩺 GS-04 carrying a separator no longer displaces the group control number", () => {
    // At base: `…*2026*0601*1200*1*X*…`, GS-06 read "1200" and GS-08 read "X",
    // with X12_CONTROL_NUMBER_MISMATCH raised against a GE-02 that had never
    // disagreed with the caller's group control number.
    const ix = build({ groupDate: "2026*0601" });
    const gs = gsOf(ix);
    expect(gs.raw).toBe("GS*HC*SENDER*RECEIVER*2026?*0601*1200*1*X*005010X222A2");
    expect(getSegmentValue(gs, "04", D)).toBe("2026*0601"); // "2026" at base
    expect(getSegmentValue(gs, "06", D)).toBe("1"); // "1200" at base
    expect(getSegmentValue(gs, "08", D)).toBe(VERSION_RELEASE); // "X" at base
    expect(ix.warnings.map((w) => w.code)).toEqual([]); // [MISMATCH] at base
  });

  it("🩺 GS-05 carrying the SEGMENT TERMINATOR no longer ends the GS mid-element", () => {
    // The widest shape of the three: at base the terminator closed the GS after
    // GS-05's first two bytes, so the group never opened and the ST / SE pair
    // fell out as orphans.
    const ix = build({ groupTime: "12~00" });
    const gs = gsOf(ix);
    expect(gs.raw).toBe("GS*HC*SENDER*RECEIVER*20260601*12?~00*1*X*005010X222A2");
    expect(getSegmentValue(gs, "05", D)).toBe("12~00");
    expect(ix.groups[0]?.transactions).toHaveLength(1); // zero at base
    expect(ix.orphanSegments).toEqual([]);
    expect(ix.warnings.map((w) => w.code)).toEqual([]); // two codes at base
  });

  it("a `?` immediately before the separator: this arc's own shape, on the emit side", () => {
    // `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` made `?*` frame as ONE element
    // on the read side, which is what turned a trailing literal `?` in one of
    // these three slots into a merged element. Releasing it restores the
    // framing AND makes the dot-path read answer the caller's value.
    const ix = build({ groupDate: "20260601?" });
    const gs = gsOf(ix);
    expect(gs.raw).toBe("GS*HC*SENDER*RECEIVER*20260601??*1200*1*X*005010X222A2");
    expect(getSegmentValue(gs, "04", D)).toBe("20260601?"); // "20260601*1200" at base
    expect(getSegmentValue(gs, "08", D)).toBe(VERSION_RELEASE); // undefined at base
    expect(ix.warnings.map((w) => w.code)).toEqual([]); // [MISMATCH] at base
  });
});

describe("X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE: what it costs and what it gains", () => {
  it("a conformant GS is byte-identical, which is the bound on the byte change", () => {
    // Nothing in this row carries a delimiter or a `?`, so nothing is released.
    // This is the control that keeps the cost bullet honest: the change is
    // scoped to values that were already going to frame wrongly.
    const ix = build({});
    expect(gsOf(ix).raw).toBe("GS*HC*SENDER*RECEIVER*20260601*1200*1*X*005010X222A2");
    expect(ix.warnings.map((w) => w.code)).toEqual([]);
  });

  it("`^` and `:` never shifted the framing - they moved the DOT-PATH reader, and this is a gain", () => {
    // Neither is an element separator or a segment terminator, so the GS framed
    // identically at base. What they did was truncate the dot-path read: `^` is
    // the repetition separator, so `getSegmentValue(gs, "07")` answered
    // repetition 0 alone, and `:` is the component separator, so the composite
    // read answered component 1 alone. Both now round-trip.
    const caret = gsOf(build({ responsibleAgencyCode: "X^Y" }));
    expect(caret.raw).toBe("GS*HC*SENDER*RECEIVER*20260601*1200*1*X?^Y*005010X222A2");
    expect(getSegmentValue(caret, "07", D)).toBe("X^Y"); // "X" at base

    const colon = gsOf(build({ responsibleAgencyCode: "X:Y" }));
    expect(colon.raw).toBe("GS*HC*SENDER*RECEIVER*20260601*1200*1*X?:Y*005010X222A2");
    expect(getSegmentValue(colon, "07-1", D)).toBe("X:Y"); // "X" at base
  });

  it("🩺 the measured pure cost is a MID-STRING `?`, and only on the surfaces documented as raw", () => {
    // `X12Segment.elements` has always been documented pre-`?`-unescape, so a
    // consumer reading the raw element sees the doubled `?` where it saw one.
    // The dot-path read unescapes and is unchanged, which is the whole reason
    // this row is a raw-surface cost and not a value change.
    const ix = build({ groupDate: "2026?0601" });
    const gs = gsOf(ix);
    expect(gs.elements[4]).toBe("2026??0601"); // "2026?0601" at base
    expect(getSegmentValue(gs, "04", D)).toBe("2026?0601"); // unchanged from base
    expect(ix.warnings.map((w) => w.code)).toEqual([]);
  });

  it("a caller who was pre-releasing the value themselves is now escaping twice", () => {
    // The same regression `X12-TA1-EMIT-NOT-RELEASE-AWARE` recorded on its own
    // half, stated rather than argued away: drop the hand-rolled escape. At
    // base the dot-path read of this value answered "2026*0601", which is what
    // such a caller intended.
    const gs = gsOf(build({ groupDate: "2026?*0601" }));
    expect(gs.raw).toBe("GS*HC*SENDER*RECEIVER*2026???*0601*1200*1*X*005010X222A2");
    expect(getSegmentValue(gs, "04", D)).toBe("2026?*0601"); // "2026*0601" at base
  });
});

describe("X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE: negative controls", () => {
  it("a GENUINE control-number mismatch still raises, so silencing the code would fail here", () => {
    // Every closure pin above asserts an EMPTY warning array, so a change that
    // simply stopped raising X12_CONTROL_NUMBER_MISMATCH would pass all of
    // them. `buildInterchange` cannot emit a disagreeing GS-06 / GE-02 pair -
    // both come from one spec field - so the control is built from bytes.
    const parsed = parseX12(
      `${buildIsa()}GS*HC*S*R*20260601*1200*1*X*005010X222A2~ST*837*0001~CLM*PTACCT*150.00~SE*3*0001~GE*1*9~IEA*1*000000001~`,
    );
    expect(parsed.warnings.map((w) => w.code)).toEqual(["X12_CONTROL_NUMBER_MISMATCH"]);
  });

  it("a DIFFERENT guide reference still reads as itself, so a hard-coded GS-08 would fail here", () => {
    // The GS-07 pin above asserts GS-08 answers `VERSION_RELEASE`. This is the
    // control that makes that assertion mean "the caller's value" rather than
    // "the constant this file happens to use".
    const ix = build({ responsibleAgencyCode: "X*Y", versionRelease: "005010X223A2" });
    expect(getSegmentValue(gsOf(ix), "08", D)).toBe("005010X223A2");
  });
});

describe("X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE: the refusal still names the slot", () => {
  // `esc` names the BUILDER and nothing else, so escaping these three without
  // moving the type check would have degraded `"GS"-04 must be a string` into
  // `every element value must be a string`. `buildGroup` runs
  // `requireCallerSegment` over the UNESCAPED parts to keep the better one.
  //
  // **Most of this block is GREEN at base and that is the point of it** - these
  // are PRESERVATION controls, not closure pins. They fail if the escape is
  // added the obvious way, which is the outcome they exist to stop. The one
  // exception is the GS-02 case, which IS a head-vs-base change and says so.
  const messageOf = (group: Record<string, unknown>): string => {
    try {
      build(group);
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
    return "";
  };

  it("a numeric GS-04 refuses with the slot named, and does not echo the value", () => {
    const message = messageOf({ groupDate: 20_260_601 });
    expect(message).toContain('buildInterchange: "GS"-04 must be a string, but received a number.');
    expect(message).not.toContain("20260601");
  });

  it("the five slots that ALREADY escaped gained the slot name, which is a change and is stated", () => {
    // Moving the type check one step earlier is not free of consequence for
    // GS-01 / GS-02 / GS-03 / GS-06 / GS-08 either: those went through `esc`
    // at base, so a wrong-typed one refused with the BUILDER-named message and
    // now refuses with the slot-named one. Strictly better, still redacted,
    // still the same class and code - but it is a message change on slots this
    // slice was not about, so it is pinned rather than left to be discovered.
    const message = messageOf({ applicationSenderCode: 1234 });
    expect(message).toContain('buildInterchange: "GS"-02 must be a string, but received a number.');
    expect(message).not.toContain("1234"); // "every element value must be a string" at base
  });

  it("a numeric GS-05 and a numeric GS-07 name their own slots too", () => {
    expect(messageOf({ groupTime: 1200 })).toContain('buildInterchange: "GS"-05 must be a string');
    expect(messageOf({ responsibleAgencyCode: 1 })).toContain(
      'buildInterchange: "GS"-07 must be a string',
    );
  });

  it("the refusal is the builder's own typed error, not an untyped TypeError", () => {
    let thrown: unknown;
    try {
      build({ responsibleAgencyCode: {} });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(X12BuildError);
    expect((thrown as { code?: unknown }).code).toBe("X12_BUILD_INVALID_SPEC");
    expect((thrown as Error).message).toContain(
      '"GS"-07 must be a string, but received an object.',
    );
  });

  it("🩺 `null` and `undefined` in these three slots are ABSENT, not refused, and that did not move", () => {
    // All three resolve through `??` before they are ever seen - GS-04 falls
    // back to the century-expanded ISA date, GS-05 to the ISA time, GS-07 to
    // `"X"` - so a `null` is a caller saying "use the default" and reaches
    // neither guard. Stated because the guard above would otherwise read as
    // covering every wrong value in the slot, and it does not. Unchanged from
    // base; nothing here made it so.
    const ix = build({ groupDate: null, groupTime: undefined, responsibleAgencyCode: null });
    expect(gsOf(ix).raw).toBe("GS*HC*SENDER*RECEIVER*20260601*1200*1*X*005010X222A2");
  });

  it("a well-typed spec still builds, so the guard is not refusing everything", () => {
    expect(() => build({ groupDate: "20260601", responsibleAgencyCode: "X" })).not.toThrow();
  });
});

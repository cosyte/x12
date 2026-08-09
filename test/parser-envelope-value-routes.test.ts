/**
 * `X12-ENVELOPE-VALUE-ROUTES`: what a caller actually does to read the logical
 * value of an ENVELOPE element, and what no doc may tell them to do.
 *
 * ## The defect, and the filed line was a floor for the EIGHTH slice running
 *
 * `getSegmentValue` takes an {@link X12Segment}, which requires `id`.
 * `IsaSegment`, `IeaSegment`, `GsSegment`, `GeSegment`, `Ta1Segment` and the
 * INLINE ST/SE types on `X12TransactionSet` declare only `raw` and `elements`,
 * so passing any one of them is `TS2345`. Filed as ONE type (`gs`) and TWO
 * prescriptions; measured as SEVEN types and NINE prescriptions in six files.
 *
 * ## Why the signature was NOT widened, which was the decision
 *
 * `getSegmentValue`'s body never reads `id`. It reads `segment.elements`, so
 * widening the parameter to an `elements`-only structural type is free,
 * non-breaking, and emits nothing. It was still refused, on one measurement:
 * the function unescapes UNCONDITIONALLY, and the ISA is documented as
 * positional, where a `?` is content and never an escape. Widening admits
 * `IsaSegment` and so makes a silently wrong read of ISA-13, the reassociation
 * key, COMPILE. A capability that is right on six envelope types and silently
 * wrong on the seventh is not an ergonomic win. The claim was cut instead, and
 * no runtime line moved.
 *
 * ## The gate this file is
 *
 * `pnpm typecheck` covers `test/`, so the `@ts-expect-error` assertions below
 * RED if that signature is ever widened. Every finding in this lineage has been
 * a claim defect in a prose carrier and no test gated that class; these do, for
 * this one claim. Widening the signature is not forbidden by this file, it is
 * made loud: the assertion must be DELETED, which is where the ISA question has
 * to be answered.
 *
 * ## The cells, and no story about which member is special
 *
 * Two routes reach an envelope element's decoded text and BOTH are already
 * published in-tree. They are not interchangeable and neither is universal.
 * The cells are below; read them rather than a rule about them.
 */

import { describe, expect, it } from "vitest";

import {
  getSegmentValue,
  parseX12,
  unescapeRelease,
  type Delimiters,
  type X12Segment,
} from "../src/index.js";

const D: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };
const POS = { segmentIndex: 0 } as const;
const sink = (): void => {};

/** Route B: add the `id` the envelope types do not carry. `build-ta1.ts` says "add one". */
function withId(
  id: string,
  seg: { readonly raw: string; readonly elements: readonly string[] },
): X12Segment {
  return Object.freeze({ id, raw: seg.raw, elements: seg.elements });
}

function isaWith(isa13: string): string {
  return (
    `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       ` +
    `*260809*1200*^*00501*${isa13}*0*P*:~` +
    "GS*HC*S*R*20260809*1200*1*X*005010X222A1~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~"
  );
}

/** GS-04 carries a released `*`; GS-07 carries a REAL repetition; a TA1 rides along. */
const MIXED =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260809*1200*^*00501*000000001*0*P*:~" +
  "GS*HC*S*R*2026?*0601*1200*1*A^B*005010X222A1~ST*837*0001~SE*2*0001~GE*1*1~" +
  "TA1*0000?^0001*260809*1200*A*000~IEA*1*000000001~";

describe("X12-ENVELOPE-VALUE-ROUTES: no envelope type is an X12Segment", () => {
  it("🛑 all SEVEN envelope-level types are TS2345 (this REDS if the signature is widened)", () => {
    const ix = parseX12(MIXED);
    // 🛑 EVERY RECEIVER BELOW IS NARROWED TO A NON-OPTIONAL VALUE FIRST, AND
    // THAT IS LOAD-BEARING. Handed `ix.iea` or `ix.groups[0]?.gs` directly,
    // six of these seven assertions stay "expected errors" under a WIDENED
    // signature - for `undefined`, not for the missing `id` - and the gate is
    // vacuous. Measured: the first draft of this test reported ONE unused
    // directive under the mutation instead of seven.
    const { isa, iea, ta1Segments, groups } = ix;
    const group = groups[0];
    const tx = group?.transactions[0];
    const ta1 = ta1Segments[0];
    if (iea === undefined || group === undefined || tx === undefined || ta1 === undefined) {
      throw new Error("fixture: the interchange is malformed");
    }
    const { gs, ge } = group;
    const { st, se } = tx;
    if (ge === undefined || se === undefined) throw new Error("fixture: the group is malformed");

    // Each assertion pins the measured `TS2345`, "Property 'id' is missing".
    // Filed as one type; this is the whole census. The calls run fine at
    // RUNTIME - the defect is entirely in the type, which is exactly why a
    // prose carrier could prescribe one for four slices without anyone noticing.
    // @ts-expect-error - IsaSegment carries no `id`.
    expect(getSegmentValue(isa, "13", D)).toBe("000000001");
    // @ts-expect-error - IeaSegment carries no `id`.
    expect(getSegmentValue(iea, "02", D)).toBe("000000001");
    // @ts-expect-error - GsSegment carries no `id`.
    expect(getSegmentValue(gs, "01", D)).toBe("HC");
    // @ts-expect-error - GeSegment carries no `id`.
    expect(getSegmentValue(ge, "02", D)).toBe("1");
    // @ts-expect-error - Ta1Segment carries no `id`.
    expect(getSegmentValue(ta1, "04", D)).toBe("A");
    // @ts-expect-error - the INLINE ST type on X12TransactionSet carries no `id`.
    expect(getSegmentValue(st, "01", D)).toBe("837");
    // @ts-expect-error - the INLINE SE type on X12TransactionSet carries no `id`.
    expect(getSegmentValue(se, "02", D)).toBe("0001");
  });

  it("a BODY segment is an X12Segment and needs no wrap - the in-tree control", () => {
    const ix = parseX12(MIXED);
    const st = ix.groups[0]?.transactions[0]?.segments[0];
    expect(st?.id).toBe("ST");
    expect(getSegmentValue(st as X12Segment, "01", D)).toBe("837");
  });
});

describe("X12-ENVELOPE-VALUE-ROUTES: the two routes, and they are NOT interchangeable", () => {
  it("both routes decode a released delimiter, and agree", () => {
    const ix = parseX12(MIXED);
    const gs = ix.groups[0]?.gs;
    expect(gs?.elements[4]).toBe("2026?*0601"); // raw, as documented
    expect(unescapeRelease(gs?.elements[4] ?? "", D, sink, POS)).toBe("2026*0601");
    expect(getSegmentValue(withId("GS", gs ?? { raw: "", elements: [] }), "04", D)).toBe(
      "2026*0601",
    );
    expect(ix.warnings.map((w) => w.code)).toEqual([]);
  });

  it("🩺 on a REAL repetition they answer DIFFERENT things, so neither is 'the' route", () => {
    const ix = parseX12(MIXED);
    const gs = ix.groups[0]?.gs;
    expect(gs?.elements[7]).toBe("A^B");
    // Route A answers the whole decoded element.
    expect(unescapeRelease(gs?.elements[7] ?? "", D, sink, POS)).toBe("A^B");
    // Route B answers repetition 0, because that is what a bare dot-path means.
    expect(getSegmentValue(withId("GS", gs ?? { raw: "", elements: [] }), "07", D)).toBe("A");
    // A claim that one of them "is the route" is therefore false in both directions.
  });

  it("a TA1 element decodes the same on both routes", () => {
    const ix = parseX12(MIXED);
    const ta1 = ix.ta1Segments[0];
    expect(ta1?.elements[1]).toBe("0000?^0001");
    expect(unescapeRelease(ta1?.elements[1] ?? "", D, sink, POS)).toBe("0000^0001");
    expect(getSegmentValue(withId("TA1", ta1 ?? { raw: "", elements: [] }), "01", D)).toBe(
      "0000^0001",
    );
  });
});

describe("X12-ENVELOPE-VALUE-ROUTES: the ISA cells, published as cells", () => {
  // 🛑 NO STORY ABOUT WHICH MEMBER IS SPECIAL. "The ISA is positional so raw IS
  // the value" was falsified in `#110` by the re-indexing row below, and "a
  // raw-vs-unescapeRelease cell on the ISA is a TAUTOLOGY that detects nothing"
  // is falsified by the first row. Both were written here before. Read the grid.
  const cells: ReadonlyArray<readonly [string, number, string, string]> = [
    // transmitted ISA-13, arity, elements[13], both decoded routes
    ["000000??1", 17, "000000??1", "000000?1"],
    ["0000?*001", 18, "0000?", "0000?"],
    ["00000001?", 17, "00000001?", "00000001?"],
  ];

  for (const [isa13, arity, raw, decoded] of cells) {
    it(`ISA-13 ${JSON.stringify(isa13)}: arity ${arity}, raw ${raw}, decoded ${decoded}`, () => {
      const ix = parseX12(isaWith(isa13));
      const isa = ix.isa;
      expect(isa.elements.length).toBe(arity);
      expect(isa.elements[13]).toBe(raw);
      expect(unescapeRelease(isa.elements[13] ?? "", D, sink, POS)).toBe(decoded);
      expect(getSegmentValue(withId("ISA", isa), "13", D)).toBe(decoded);
    });
  }

  it("🩺 no route measured answers the TRANSMITTED ISA-13 on all three cells", () => {
    // Row 1: both decoded routes drop a `?` the sender transmitted as content.
    // Row 2: `decodeIsa` split on the element separator, so `elements[13]` is a
    //        PREFIX and ISA-16 re-indexed off `":"`. All three routes are wrong.
    // Row 3: all three agree.
    // That is the measurement. It is why this slice prescribes NO route for the
    // ISA rather than naming one, and why the signature was not widened.
    const reindexed = parseX12(isaWith("0000?*001"));
    expect(reindexed.isa.elements.length).toBe(18); // 17 documented
    expect(reindexed.isa.elements[16]).toBe("P"); // ISA-16 is ":"; this is ISA-15's value
    const clean = parseX12(isaWith("000000??1"));
    expect(clean.isa.elements[13]).toBe("000000??1");
    expect(unescapeRelease(clean.isa.elements[13] ?? "", D, sink, POS)).not.toBe("000000??1");
    // `X12_CONTROL_NUMBER_MISMATCH` on both is the FIXTURE (IEA-02 is the plain
    // number), not a finding of this slice.
  });
});

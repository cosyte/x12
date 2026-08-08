/**
 * `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`: the envelope segments' element
 * splitter now honours the `?`-release-character escape, as the body splitter
 * and the segment-terminator scanner already did.
 *
 * ## What was measured at base
 *
 * `src/parser/envelope.ts`'s `splitElements` was a plain `String.prototype.split`
 * on the element separator, so a RELEASED separator inside a `GS` / `GE` / `ST` /
 * `SE` / `IEA` / `TA1` element still ended that element and shifted every element
 * after it down a slot. Measured straight through `parseX12` on the base tree:
 *
 * ```text
 * GS*HC*SEND?*ER*RECV*20260601*1200*1*X*005010X222A1   -> 10 elements, GS-08 = "X"
 *                                                        warnings: [X12_CONTROL_NUMBER_MISMATCH]
 * GS*HC*S*R*20260601*1200*1*X*005010?*X222A1          -> 10 elements, GS-08 = "005010?"
 *                                                        warnings: []
 * ST*837*00?*01*005010X222A1                          ->  5 elements, ST-03 = "01"
 * CLM*PT?*ACCT*150.00                                 ->  3 elements (the BODY control: held)
 * ```
 *
 * The blast radius is envelope FRAMING. No dose, code system, monetary amount or
 * patient identifier is mis-read, because the body splitter was already correct -
 * that is why this was not stop-the-line and why it got its own slice.
 *
 * ## Why it is a defect and not a tolerance
 *
 * The package's own emit half releases these elements. `buildInterchange` maps
 * `esc` over GS-02 / GS-03 / GS-06 / GS-08 and ST-01 / ST-02 / ST-03 (and GE-02 /
 * SE-02), and then RETURNS `parseX12` of the bytes it just wrote. So a caller
 * passing `applicationSenderCode: "SEND*ER"` got back a model, from a single
 * call, whose GS-08 answered `"X"` - the GS-07 responsible agency code - with an
 * empty warning array. The two halves of one function disagreed. `SegmentSpec`'s
 * documented contract ("Element values are LOGICAL - the builder applies the
 * `?`-release-character escape on emit so any active delimiter inside a value
 * survives") was true of the emit and false of the read.
 *
 * ## The two things this slice deliberately does NOT do
 *
 * 1. **It does not unescape.** Tokens stay RAW, exactly as
 *    `X12Segment.elements` has always documented, so `elements.join(sep)` still
 *    reproduces the segment byte for byte and `serializeX12`'s count
 *    substitution is unaffected.
 * 2. **It does not touch the ISA.** The ISA is fixed-width per ASC X12 .5 and
 *    is split positionally; a `?` in an ISA element is content. Pinned below.
 */

import { describe, expect, it } from "vitest";

import { buildInterchange as buildInterchangeApi, parseX12, serializeX12 } from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

const ISA = buildIsa();

/** Assemble an interchange around one GS / ST / SE / GE pair. */
function ix(gs: string, st: string, se = "SE*3*0001", ge = "GE*1*1"): string {
  return `${ISA}${gs}~${st}~CLM*PT?*ACCT*150.00~${se}~${ge}~IEA*1*000000001~`;
}

const GS_PLAIN = "GS*HC*S*R*20260601*1200*1*X*005010X222A1";
const ST_PLAIN = "ST*837*0001*005010X222A1";

describe("X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE: a released separator no longer splits an envelope segment", () => {
  it("🩺 GS-02 carrying a released separator no longer shifts GS-08 out of GS-07's slot", () => {
    const parsed = parseX12(ix("GS*HC*SEND?*ER*RECV*20260601*1200*1*X*005010X222A1", ST_PLAIN));
    const gs = parsed.groups[0]?.gs;
    // Nine entries: "GS" plus GS-01..GS-08. Ten at base.
    expect(gs?.elements).toHaveLength(9);
    // RAW, pre-unescape - the same contract `X12Segment.elements` states.
    expect(gs?.elements[2]).toBe("SEND?*ER");
    expect(gs?.elements[7]).toBe("X");
    expect(gs?.elements[8]).toBe("005010X222A1");
    // The spurious mismatch is gone WITH the shift: GS-06 and GE-02 always did
    // agree, the parser was reading GS-06 out of GS-05's slot.
    expect(parsed.warnings).toEqual([]);
  });

  it("🩺 GS-08 carrying a released separator is answered whole", () => {
    const parsed = parseX12(ix("GS*HC*S*R*20260601*1200*1*X*005010?*X222A1", ST_PLAIN));
    const gs = parsed.groups[0]?.gs;
    expect(gs?.elements).toHaveLength(9);
    expect(gs?.elements[8]).toBe("005010?*X222A1");
    expect(parsed.warnings).toEqual([]);
  });

  it("🩺 ST-02 carrying a released separator no longer shifts ST-03", () => {
    const parsed = parseX12(ix(GS_PLAIN, "ST*837*00?*01*005010X222A1", "SE*3*00?*01"));
    const st = parsed.groups[0]?.transactions[0]?.st;
    expect(st?.elements).toHaveLength(4);
    expect(st?.elements[2]).toBe("00?*01");
    expect(st?.elements[3]).toBe("005010X222A1");
    // ST-02 and SE-02 carry the same released bytes, so the pair reconciles.
    expect(parsed.warnings).toEqual([]);
  });

  it("🩺 the GE / SE / IEA trailers reconcile against a released control number", () => {
    const parsed = parseX12(
      ix(
        "GS*HC*S*R*20260601*1200*1?*2*X*005010X222A1",
        "ST*837*0001*005010X222A1",
        "SE*3*0001",
        "GE*1*1?*2",
      ),
    );
    expect(parsed.groups[0]?.gs.elements[6]).toBe("1?*2");
    expect(parsed.groups[0]?.ge?.elements[2]).toBe("1?*2");
    expect(parsed.groups[0]?.ge?.elements[1]).toBe("1");
    expect(parsed.warnings).toEqual([]);
  });

  it("the BODY element is unchanged - it was always the control", () => {
    const parsed = parseX12(ix(GS_PLAIN, ST_PLAIN));
    const clm = parsed.groups[0]?.transactions[0]?.segments.find((s) => s.id === "CLM");
    expect(clm?.elements).toEqual(["CLM", "PT?*ACCT", "150.00"]);
  });
});

describe("X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE: the ISA is deliberately NOT release-split", () => {
  it("🩺 a `?` one byte before an ISA separator is CONTENT, and the ISA still reads 17 entries", () => {
    // ISA-06 is fixed at 15 bytes, so `SENDER?` padded to 15 puts a `?` inside
    // the element, not adjacent to the separator. `SENDER12345678?` puts it
    // immediately before ISA byte 4's separator - the case that would collapse
    // the segment if the ISA were release-split.
    const isa = buildIsa({ senderId: "SENDER12345678?" });
    const parsed = parseX12(`${isa}${GS_PLAIN}~${ST_PLAIN}~SE*2*0001~GE*1*1~IEA*1*000000001~`);
    // "ISA" + 16 fixed-width elements. A release-aware split would swallow the
    // separator after ISA-06 and return 16.
    expect(parsed.isa.elements).toHaveLength(17);
    expect(parsed.isa.elements[6]).toBe("SENDER12345678?");
    expect(parsed.isa.elements[12]).toBe("00501");
    expect(parsed.isa.elements[13]).toBe("000000001");
    // ISA-13 still reconciles against IEA-02, which it could not if the split
    // had shifted.
    expect(parsed.warnings).toEqual([]);
    // And the ISA round-trips byte-exact, as it always must.
    expect(parsed.isa.raw).toBe(isa);
  });

  it("a degenerate delimiter set whose element separator IS the release character still frames", () => {
    // `detectDelimiters` reads the element separator positionally out of ISA
    // byte 4 and rejects only control characters and a non-distinct set, so `?`
    // is admissible there. When the separator IS `?` it cannot also escape, and
    // `splitElements` falls back to the literal split - the identical guard
    // `findUnescapedTerminator` already carries for the terminator.
    const isa = buildIsa({ element: "?" });
    const parsed = parseX12(
      `${isa}GS?HC?S?R?20260601?1200?1?X?005010X222A1~ST?837?0001~SE?2?0001~GE?1?1~IEA?1?000000001~`,
    );
    expect(parsed.delimiters.element).toBe("?");
    expect(parsed.groups[0]?.gs.elements).toHaveLength(9);
    expect(parsed.groups[0]?.gs.elements[8]).toBe("005010X222A1");
    expect(parsed.groups[0]?.transactions[0]?.st.elements[1]).toBe("837");
    expect(parsed.warnings).toEqual([]);
  });
});

describe("X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE: what does NOT change", () => {
  // Only `?` + the ELEMENT SEPARATOR frames differently. Every other release
  // sequence inside an envelope element framed identically before and after,
  // because a plain split and a release-aware split agree on all of them.
  const unchanged: readonly (readonly [string, string, string])[] = [
    ["a doubled release character", "1??2", "1??2"],
    ["a released component separator", "1?:2", "1?:2"],
    ["a released repetition separator", "1?^2", "1?^2"],
    ["a release character before an ordinary byte", "1?A2", "1?A2"],
    ["a released segment terminator", "1?~2", "1?~2"],
  ];

  it.each(unchanged)("%s in GS-06 frames as one element, before and after", (_name, sent, read) => {
    const parsed = parseX12(
      ix(`GS*HC*S*R*20260601*1200*${sent}*X*005010X222A1`, ST_PLAIN, "SE*3*0001", `GE*1*${sent}`),
    );
    expect(parsed.groups[0]?.gs.elements).toHaveLength(9);
    expect(parsed.groups[0]?.gs.elements[6]).toBe(read);
    expect(parsed.groups[0]?.gs.elements[8]).toBe("005010X222A1");
    expect(parsed.warnings).toEqual([]);
  });

  it("🛑 NO case moves onto a NEW warning code; the only channel change is a code that STOPS firing", () => {
    // The rule this lineage was built on: a widening that moves a case onto a
    // NEW code blinds every consumer predicate written against the old one. This
    // slice mints no code. The one channel-visible change is SUBTRACTIVE - a
    // `X12_CONTROL_NUMBER_MISMATCH` that fired only because the parser was
    // reading a control number out of its neighbour's slot stops firing, because
    // the control numbers always did agree. Disclosed in `KNOWN-LIMITATIONS.md`:
    // a consumer that REJECTS on that code will now accept such a document.
    const shifted = parseX12(ix("GS*HC*SEND?*ER*RECV*20260601*1200*1*X*005010X222A1", ST_PLAIN));
    expect(shifted.warnings).toEqual([]);

    // The control, on the SAME code, so the assertion above is not vacuous: a
    // genuine GS-06 / GE-02 disagreement still raises it.
    const genuine = parseX12(ix(GS_PLAIN, ST_PLAIN, "SE*3*0001", "GE*1*9"));
    expect(genuine.warnings.map((w) => w.code)).toEqual(["X12_CONTROL_NUMBER_MISMATCH"]);
  });
});

describe("X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE: the package's own emit half agrees with its read half", () => {
  const spec = {
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groups: [
      {
        functionalIdCode: "HC",
        applicationSenderCode: "SEND*ER",
        applicationReceiverCode: "RECV",
        groupDate: "20260601",
        groupTime: "1200",
        groupControlNumber: "1",
        versionRelease: "005010X222A1",
        transactions: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            implementationConventionReference: "005010X222A1",
            segments: [["CLM", "PTACCT", "150.00"]],
          },
        ],
      },
    ],
  } as const;

  it("🩺 `buildInterchange` no longer disagrees with itself about what it emitted", () => {
    const built = buildInterchangeApi(spec);
    const gs = built.groups[0]?.gs;
    // The emit half already released the separator; only the read half was wrong.
    expect(gs?.raw).toBe("GS*HC*SEND?*ER*RECV*20260601*1200*1*X*005010X222A1");
    expect(gs?.elements).toHaveLength(9);
    expect(gs?.elements[2]).toBe("SEND?*ER");
    // At base this answered "X", the GS-07 responsible agency code.
    expect(gs?.elements[8]).toBe("005010X222A1");
    expect(built.warnings).toEqual([]);
  });

  it("the round trip is a fixed point and re-parses to the same model", () => {
    const built = buildInterchangeApi(spec);
    const once = serializeX12(built);
    expect(serializeX12(parseX12(once))).toBe(once);
    const again = parseX12(once);
    expect(again.groups[0]?.gs.elements).toEqual(built.groups[0]?.gs.elements);
    expect(again.warnings.map((w) => w.code)).toEqual(built.warnings.map((w) => w.code));
  });

  it("elements still join back to the verbatim segment, which the count substitution depends on", () => {
    const built = buildInterchangeApi(spec);
    const gs = built.groups[0]?.gs;
    expect(gs?.elements.join("*")).toBe(gs?.raw);
    // `{ specClean: true, recomputeCounts: true }` rebuilds GE-01 / SE-01 /
    // IEA-01 by substituting into that element array, so a token that did not
    // rejoin verbatim would corrupt the trailer.
    const clean = serializeX12(built, { specClean: true, recomputeCounts: true });
    expect(clean).toContain("GS*HC*SEND?*ER*RECV*20260601*1200*1*X*005010X222A1~");
    expect(clean).toContain("GE*1*1~");
  });
});

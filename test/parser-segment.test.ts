/**
 * Unit tests for {@link decodeSegment} + the dot-path resolvers
 * {@link getSegmentValue} / {@link getAllSegmentValues}. Phase 2's
 * structural-model surface - verified against hand-authored segments
 * shaped like real X12 healthcare segments (NM1, HI, BPR, CLP, etc.) so a
 * downstream helper authored in Phases 4+ can rely on these primitives.
 */

import { describe, expect, it } from "vitest";

import { decodeSegment, getAllSegmentValues, getSegmentValue } from "../src/parser/segment.js";
import type { Delimiters, X12Position } from "../src/parser/types.js";
import type { X12ParseWarning } from "../src/parser/warnings.js";

const D: Delimiters = {
  element: "*",
  repetition: "^",
  component: ":",
  segment: "~",
};
const POS: X12Position = { segmentIndex: 0, interchangeIndex: 0 };

function noop(_w: X12ParseWarning): void {
  /* intentionally empty */
}

describe("decodeSegment - structural decode", () => {
  it("decodes a simple segment into id + 1-indexed elements", () => {
    const seg = decodeSegment("NM1*IL*1*DOE*JANE", D, noop, POS);
    expect(seg.id).toBe("NM1");
    expect(seg.elements[0]).toBe("NM1");
    expect(seg.elements[1]).toBe("IL");
    expect(seg.elements[2]).toBe("1");
    expect(seg.elements[3]).toBe("DOE");
    expect(seg.elements[4]).toBe("JANE");
  });
  it("preserves the raw segment text verbatim for byte-exact round-trip", () => {
    const raw = "BHT*0019*00*REF*20250101*1200*CH";
    const seg = decodeSegment(raw, D, noop, POS);
    expect(seg.raw).toBe(raw);
  });
  it("freezes the elements array (immutable)", () => {
    const seg = decodeSegment("NM1*IL*1*DOE", D, noop, POS);
    expect(Object.isFrozen(seg)).toBe(true);
    expect(Object.isFrozen(seg.elements)).toBe(true);
  });
  it("decodes an empty input into an empty-id, single-element segment", () => {
    const seg = decodeSegment("", D, noop, POS);
    expect(seg.id).toBe("");
    expect(seg.elements).toEqual([""]);
  });
  it("preserves `?<delim>` verbatim in the raw element text (decode is lazy)", () => {
    const seg = decodeSegment("REF*EA*ID?*WITH?*STAR", D, noop, POS);
    // Element split honors the escape - the `?*` does not split.
    expect(seg.elements[2]).toBe("ID?*WITH?*STAR");
  });
  it("warns DANGLING_RELEASE_CHAR on a trailing bare `?` at the last element", () => {
    const warnings: X12ParseWarning[] = [];
    // NM1*IL*1*DOE? → elements ["NM1","IL","1","DOE?"]; the dangling `?` is
    // on the last element, internal index 3 (which is TR3 NM1-03).
    decodeSegment("NM1*IL*1*DOE?", D, (w) => warnings.push(w), POS);
    expect(warnings.map((w) => w.code)).toContain("X12_DANGLING_RELEASE_CHAR");
    expect(warnings[0]?.position.elementIndex).toBe(3);
  });
  it("does NOT warn when a trailing `?` is the second half of a `??` pair", () => {
    const warnings: X12ParseWarning[] = [];
    decodeSegment("NM1*IL*1*DOE??", D, (w) => warnings.push(w), POS);
    expect(warnings).toHaveLength(0);
  });
});

describe("getSegmentValue - dot-path traversal", () => {
  it("resolves an element by 1-indexed position", () => {
    const seg = decodeSegment("NM1*IL*1*DOE*JANE*A", D, noop, POS);
    expect(getSegmentValue(seg, "01", D)).toBe("IL");
    expect(getSegmentValue(seg, "03", D)).toBe("DOE");
    expect(getSegmentValue(seg, "05", D)).toBe("A");
  });
  it("resolves a composite sub-element with `-N`", () => {
    // HI*ABK:J45.50*ABF:I10 - HI-01 composite carries qualifier + code.
    const seg = decodeSegment("HI*ABK:J45.50*ABF:I10", D, noop, POS);
    expect(getSegmentValue(seg, "01-1", D)).toBe("ABK");
    expect(getSegmentValue(seg, "01-2", D)).toBe("J45.50");
    expect(getSegmentValue(seg, "02-1", D)).toBe("ABF");
    expect(getSegmentValue(seg, "02-2", D)).toBe("I10");
  });
  it("resolves repetitions with `[N]` (0-indexed)", () => {
    // Element 1 repeats: foo^bar^baz; element 2 is single.
    const seg = decodeSegment("EQ*30^35^88*X", D, noop, POS);
    expect(getSegmentValue(seg, "01[0]", D)).toBe("30");
    expect(getSegmentValue(seg, "01[1]", D)).toBe("35");
    expect(getSegmentValue(seg, "01[2]", D)).toBe("88");
    expect(getSegmentValue(seg, "01", D)).toBe("30");
    expect(getSegmentValue(seg, "02[0]", D)).toBe("X");
  });
  it("resolves component inside a specific repetition", () => {
    const seg = decodeSegment("HI*ABK:J45.50^ABF:I10", D, noop, POS);
    expect(getSegmentValue(seg, "01[0]-1", D)).toBe("ABK");
    expect(getSegmentValue(seg, "01[1]-1", D)).toBe("ABF");
    expect(getSegmentValue(seg, "01[1]-2", D)).toBe("I10");
  });
  it("returns undefined for an out-of-range element / component / repetition", () => {
    const seg = decodeSegment("NM1*IL*1*DOE", D, noop, POS);
    expect(getSegmentValue(seg, "99", D)).toBeUndefined();
    expect(getSegmentValue(seg, "01-9", D)).toBeUndefined();
    expect(getSegmentValue(seg, "01[5]", D)).toBeUndefined();
  });
  it("applies `?`-unescape on the decoded leaf value", () => {
    const seg = decodeSegment("REF*EA*ID?*WITH?*STAR", D, noop, POS);
    expect(getSegmentValue(seg, "02", D)).toBe("ID*WITH*STAR");
  });
  it("works without an explicit emit (default no-op suppresses warnings on reads)", () => {
    // Reading via the default emit parameter exercises the in-module
    // `noop` fallback so a caller that only wants the leaf value isn't
    // forced to thread a warning handler through every call site.
    const seg = decodeSegment("NM1*IL*1*DOE?", D, noop, POS);
    expect(getSegmentValue(seg, "01", D)).toBe("IL");
    // Element 3 ends in a bare `?` - the default emit silently swallows
    // the dangling-release warning emitted on read; the returned value
    // is byte-faithful (the unpaired `?` is preserved).
    expect(getSegmentValue(seg, "03", D)).toBe("DOE?");
    expect(getAllSegmentValues(seg, "01", D)).toEqual(["IL"]);
  });
  it("throws TypeError on a malformed path (caller bug)", () => {
    const seg = decodeSegment("NM1*IL*1*DOE", D, noop, POS);
    expect(() => getSegmentValue(seg, "", D)).toThrow(TypeError);
    expect(() => getSegmentValue(seg, "abc", D)).toThrow(TypeError);
    expect(() => getSegmentValue(seg, "01-", D)).toThrow(TypeError);
    expect(() => getSegmentValue(seg, "01[", D)).toThrow(TypeError);
    expect(() => getSegmentValue(seg, "01[a]", D)).toThrow(TypeError);
    expect(() => getSegmentValue(seg, "01-1junk", D)).toThrow(TypeError);
  });
});

describe("getAllSegmentValues - all repetitions / components", () => {
  it("returns every repetition's element text when no `-N` is given", () => {
    const seg = decodeSegment("EQ*30^35^88", D, noop, POS);
    expect(getAllSegmentValues(seg, "01", D)).toEqual(["30", "35", "88"]);
  });
  it("returns every repetition's Nth component when `-N` is given", () => {
    const seg = decodeSegment("HI*ABK:J45.50^ABF:I10^APR:0HQ00ZZ", D, noop, POS);
    expect(getAllSegmentValues(seg, "01-1", D)).toEqual(["ABK", "ABF", "APR"]);
    expect(getAllSegmentValues(seg, "01-2", D)).toEqual(["J45.50", "I10", "0HQ00ZZ"]);
  });
  it("returns a single-entry array when both `[N]` and `-N` are specified", () => {
    const seg = decodeSegment("HI*ABK:J45.50^ABF:I10", D, noop, POS);
    expect(getAllSegmentValues(seg, "01[1]-2", D)).toEqual(["I10"]);
  });
  it("returns an empty array for an out-of-range element", () => {
    const seg = decodeSegment("NM1*IL*1*DOE", D, noop, POS);
    expect(getAllSegmentValues(seg, "99", D)).toEqual([]);
  });
});

/**
 * Unit tests for the X12 release-character (`?`) escape pair -
 * `unescapeRelease` / `escapeRelease` / `splitWithRelease`. The pair is
 * the byte-level core of Phase 2's lossless round-trip property; if these
 * mis-handle a delimiter byte sequence, every downstream layer mis-reads
 * it. So this suite covers the spec'd cases (`?~`, `?*`, `?:`, `?^`, `??`)
 * plus the lenient-tolerance cases (`?A` preserved verbatim; trailing `?`
 * preserved AND warned).
 */

import { describe, expect, it } from "vitest";

import { RELEASE_CHAR, escapeRelease, unescapeRelease } from "../src/parser/release.js";
import { splitWithRelease } from "../src/parser/release.js";
import type { Delimiters, X12Position } from "../src/parser/types.js";
import type { X12ParseWarning } from "../src/parser/warnings.js";

const D: Delimiters = {
  element: "*",
  repetition: "^",
  component: ":",
  segment: "~",
};
const POS: X12Position = { segmentIndex: 0, interchangeIndex: 0 };

function emitter(): { warnings: X12ParseWarning[]; emit: (w: X12ParseWarning) => void } {
  const warnings: X12ParseWarning[] = [];
  return { warnings, emit: (w) => warnings.push(w) };
}

describe("RELEASE_CHAR is the X12 convention", () => {
  it("is `?` per ASC X12 standard", () => {
    expect(RELEASE_CHAR).toBe("?");
  });
});

describe("unescapeRelease - release character semantics", () => {
  it("decodes ?<delim> → literal delimiter for all four delimiters", () => {
    const { emit, warnings } = emitter();
    expect(unescapeRelease("a?*b", D, emit, POS)).toBe("a*b");
    expect(unescapeRelease("a?^b", D, emit, POS)).toBe("a^b");
    expect(unescapeRelease("a?:b", D, emit, POS)).toBe("a:b");
    expect(unescapeRelease("a?~b", D, emit, POS)).toBe("a~b");
    expect(warnings).toHaveLength(0);
  });
  it("decodes ?? → literal ?", () => {
    const { emit, warnings } = emitter();
    expect(unescapeRelease("a??b", D, emit, POS)).toBe("a?b");
    // 4 `?`s = 2 escape pairs = 2 literal `?` bytes, no dangling.
    expect(unescapeRelease("????", D, emit, POS)).toBe("??");
    expect(warnings).toHaveLength(0);
  });
  it("treats an odd-count `?` run as N/2 literal `?`s plus a dangling tail", () => {
    const { emit, warnings } = emitter();
    // 5 `?`s = 2 escape pairs (giving "??") + 1 trailing bare `?`.
    expect(unescapeRelease("?????", D, emit, POS)).toBe("???");
    expect(warnings.map((w) => w.code)).toEqual(["X12_DANGLING_RELEASE_CHAR"]);
  });
  it("preserves ?<non-delim-non-?> verbatim (Postel's-Law tolerance)", () => {
    const { emit, warnings } = emitter();
    expect(unescapeRelease("a?Xb", D, emit, POS)).toBe("a?Xb");
    expect(unescapeRelease("a?Yb?Z", D, emit, POS)).toBe("a?Yb?Z");
    expect(warnings).toHaveLength(0);
  });
  it("warns DANGLING_RELEASE_CHAR on trailing bare `?` and preserves it verbatim", () => {
    const { emit, warnings } = emitter();
    expect(unescapeRelease("hello?", D, emit, POS)).toBe("hello?");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe("X12_DANGLING_RELEASE_CHAR");
  });
  it("fast-paths inputs without any release character", () => {
    const { emit, warnings } = emitter();
    expect(unescapeRelease("plain data", D, emit, POS)).toBe("plain data");
    expect(warnings).toHaveLength(0);
  });
  it("handles a long ?? run unambiguously", () => {
    const { emit, warnings } = emitter();
    // 6 `?` = three literal `?` characters; no dangling.
    expect(unescapeRelease("??????", D, emit, POS)).toBe("???");
    expect(warnings).toHaveLength(0);
  });
});

describe("escapeRelease - emit-side spec-clean escaping", () => {
  it("escapes the four delimiters and the release character", () => {
    expect(escapeRelease("a*b^c:d~e?f", D)).toBe("a?*b?^c?:d?~e??f");
  });
  it("passes through inputs with no special bytes", () => {
    expect(escapeRelease("hello world", D)).toBe("hello world");
  });
  it("returns empty for empty input", () => {
    expect(escapeRelease("", D)).toBe("");
  });
});

describe("escape/unescape round-trip - lossless for any value", () => {
  it("round-trips a mix of delimiters and release characters", () => {
    const original = "patient*Doe^Jane:1980~?escape?";
    const { emit } = emitter();
    const back = unescapeRelease(escapeRelease(original, D), D, emit, POS);
    expect(back).toBe(original);
  });
});

describe("splitWithRelease - single-byte delimiter split honors `?<delim>`", () => {
  it("does not split on an escaped delimiter", () => {
    expect(splitWithRelease("a*b?*c*d", "*")).toEqual(["a", "b?*c", "d"]);
  });
  it("does split on real delimiters", () => {
    expect(splitWithRelease("a*b*c", "*")).toEqual(["a", "b", "c"]);
  });
  it("returns the full string when the delimiter is absent", () => {
    expect(splitWithRelease("plain", "*")).toEqual(["plain"]);
  });
  it('returns [""] for empty input (matches String.split contract)', () => {
    expect(splitWithRelease("", "*")).toEqual([""]);
  });
  it("preserves trailing `?` verbatim (caller surfaces dangling warning)", () => {
    expect(splitWithRelease("a*b?", "*")).toEqual(["a", "b?"]);
  });
});

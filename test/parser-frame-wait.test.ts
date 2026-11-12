/**
 * What a segment the stream has not framed yet waits for: `frameSettled` names it, and `awaitMore`
 * tells from the next piece of input alone whether framing may go further. These are what let
 * `readTransactionSets` search a segment that spans many chunks once rather than again from its
 * start on each chunk. Every text is synthetic.
 */

import { describe, expect, it } from "vitest";

import { awaitMore, frameSettled, type FrameWait } from "../src/parser/envelope.js";
import type { Delimiters } from "../src/parser/types.js";

const D: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };

const terminator = (released: boolean, term = "~"): FrameWait => ({
  kind: "terminator",
  term,
  released,
});

describe("frameSettled names what the segment it stopped at waits for", () => {
  it("waits for a terminator, with the release characters at the end counted in pairs", () => {
    expect(frameSettled("REF*A*B", 0, D)).toEqual({
      segments: [],
      next: 0,
      wait: terminator(false),
    });
    expect(frameSettled("REF*A~REF*B?", 0, D)).toEqual({
      segments: ["REF*A"],
      next: 6,
      wait: terminator(true),
    });
    expect(frameSettled("REF*A~REF*B??", 0, D).wait).toEqual(terminator(false));
    expect(frameSettled("REF*A~REF*B???", 0, D).wait).toEqual(terminator(true));
    // A released terminator ends no segment and breaks the run.
    expect(frameSettled("REF*B?~?", 0, D).wait).toEqual(terminator(true));
    // Nothing left after the last terminator: nothing pending.
    expect(frameSettled("REF*A~\r\n", 0, D)).toEqual({
      segments: ["REF*A"],
      next: 8,
      wait: terminator(false),
    });
  });

  it("counts only the release characters after the segment's start", () => {
    // Framing from inside a run of release characters counts the run from where framing starts.
    expect(frameSettled("REF*A~???", 6, D).wait).toEqual(terminator(true));
    expect(frameSettled("REF*A~???", 7, D).wait).toEqual(terminator(false));
  });

  it("waits for the declared span of a binary segment, then for a terminator after it", () => {
    // BIN-01 declares five octets from offset 6: the span ends at 11, and its terminator is there.
    expect(frameSettled("BIN*5*ab~", 0, D)).toEqual({
      segments: [],
      next: 0,
      wait: { kind: "length", length: 12 },
    });
    expect(frameSettled("REF*A~BIN*5*ab~", 0, D)).toEqual({
      segments: ["REF*A"],
      next: 6,
      wait: { kind: "length", length: 12 },
    });
    // Every byte of the span is here, and the one after it is not.
    expect(frameSettled("BIN*2*~?", 0, D).wait).toEqual({ kind: "length", length: 9 });
    // The span has arrived and holds no terminator after it yet. The search for one starts at the
    // span's end: a release character inside the span escapes nothing after it.
    expect(frameSettled("BIN*2*~??", 0, D).wait).toEqual(terminator(true));
    expect(frameSettled("BIN*2*~?x?", 0, D).wait).toEqual(terminator(true));
    expect(frameSettled("BIN*2*~?x??", 0, D).wait).toEqual(terminator(false));
    expect(frameSettled("BIN*2*~?x???", 0, D).wait).toEqual(terminator(true));
    expect(frameSettled("BIN*2*~?~", 0, D)).toEqual({
      segments: ["BIN*2*~?"],
      next: 9,
      wait: terminator(false),
    });
  });
});

describe("awaitMore reads the next piece alone", () => {
  it("lets framing go on once a binary segment's span and the byte after it are here", () => {
    const wait: FrameWait = { kind: "length", length: 12 };
    expect(awaitMore(wait, "x", 11)).toBe(wait);
    expect(awaitMore(wait, "x", 12)).toBeUndefined();
    expect(awaitMore(wait, "x", 13)).toBeUndefined();
  });

  it("lets framing go on once a piece holds a terminator no release character escapes", () => {
    expect(awaitMore(terminator(false), "ab~", 9)).toBeUndefined();
    expect(awaitMore(terminator(false), "~", 9)).toBeUndefined();
    expect(awaitMore(terminator(true), "~a~", 9)).toBeUndefined();
    expect(awaitMore(terminator(false), "a?~b", 9)).toEqual(terminator(false));
    expect(awaitMore(terminator(true), "~ab", 9)).toEqual(terminator(false));
    expect(awaitMore(terminator(false), "a??~", 9)).toBeUndefined();
  });

  it("carries a release character pending at the end of a piece to the next", () => {
    expect(awaitMore(terminator(false), "ab?", 9)).toEqual(terminator(true));
    expect(awaitMore(terminator(false), "ab??", 9)).toEqual(terminator(false));
    expect(awaitMore(terminator(false), "?", 9)).toEqual(terminator(true));
    // The piece's first character is escaped, so a release character there escapes nothing.
    expect(awaitMore(terminator(true), "?", 9)).toEqual(terminator(false));
    expect(awaitMore(terminator(true), "??", 9)).toEqual(terminator(true));
    expect(awaitMore(terminator(true), "a?", 9)).toEqual(terminator(true));
    const pending = terminator(true);
    expect(awaitMore(pending, "", 9)).toBe(pending);
  });

  it("finds a release character terminator, which escapes nothing", () => {
    expect(awaitMore(terminator(false, "?"), "ab?", 9)).toBeUndefined();
    expect(awaitMore(terminator(false, "?"), "ab", 9)).toEqual(terminator(false, "?"));
  });
});

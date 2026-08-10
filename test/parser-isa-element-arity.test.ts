/**
 * `X12-ISA-ELEMENT-ARITY`: `decodeIsa` splits the ISA element area on the
 * element separator, and the comment above it used to assert that this yields
 * "exactly 17 entries by construction". It does not. `detectDelimiters`
 * verifies the separator at all 16 fixed 005010 byte positions, which makes 17
 * a FLOOR: an ISA element value carrying that byte splits again, so the element
 * comes back a prefix and everything after it is displaced. `isa.elements.length`
 * is the only measure here of how far, and more than one element can do it - the
 * two-element row below is pinned because the first draft of this slice published
 * "displaced by one" as a rule in nine carriers and a gate falsified it.
 *
 * **This file publishes the cells and states no rule over which element is
 * special.** The census below runs all 16 fixed elements and shows 14 of them
 * reproduce; the two that do not are ISA-11 and ISA-16, which ARE the in-band
 * repetition and component separator declarations, so planting the element
 * separator there collides with them and `detectDelimiters` refuses at Tier-3
 * first. That is a boundary of the probe, not a property of those elements.
 *
 * **Nothing is re-framed and no existing warning is suppressed.** A byte that
 * is both an element's content under the ISA's fixed widths and the separator
 * declared in-band has two readings; the interchange is not 005010-conformant
 * either way and nothing anyone here has read settles which reading to take, so
 * the parser reports that the header did not frame and leaves `isa.elements`
 * exactly as the split produced it. The displaced-value rows below are pinned
 * for that reason: they are what the parser still answers, not a fix.
 *
 * **The ordering claim is scoped to `parseX12`'s channel and pinned that way.**
 * `serializeX12(ix, { specClean: true })` runs its own ISA-13 / IEA-02
 * reconciliation off `isa.elements[13]` with no arity awareness and never raises
 * this code, so its absence there is not evidence the header framed. That is
 * pre-existing and is pinned here as a disclosure, not fixed.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  X12ParseError,
  buildInterchange,
  parseX12,
  serializeX12,
} from "../src/index.js";
import { buildInterchange as buildRawInterchange, buildIsa } from "./_helpers/envelope.js";

/**
 * Zero-indexed byte positions of the 16 ISA element separators, per
 * `DELIMITER_POSITIONS` / `detectDelimiters`. Element `n` occupies the bytes
 * between separator `n - 1` and separator `n`; ISA-16 runs from the last
 * separator to byte 104, the byte before the segment terminator.
 */
const SEPARATOR_POSITIONS = [3, 6, 17, 20, 31, 34, 50, 53, 69, 76, 81, 83, 89, 99, 101, 103];

/** Byte span (inclusive) of fixed ISA element `n`, 1-based. */
function elementSpan(n: number): { readonly start: number; readonly end: number } {
  const start = (SEPARATOR_POSITIONS[n - 1] ?? -1) + 1;
  const end = n === 16 ? 104 : (SEPARATOR_POSITIONS[n] ?? 0) - 1;
  return { start, end };
}

/**
 * A conformant interchange whose ISA-`n` carries the element separator as its
 * LAST byte. Overwriting a byte rather than inserting one keeps the ISA exactly
 * 106 bytes, so `X12_ISA_TOO_SHORT` cannot be what is being measured.
 */
function withSeparatorInElement(n: number): string {
  const conformant = buildRawInterchange();
  const { end } = elementSpan(n);
  return conformant.slice(0, end) + "*" + conformant.slice(end + 1);
}

const CONFORMANT = buildRawInterchange();

describe("X12_ISA_EXTRA_ELEMENT_SEPARATOR: the ISA split has an arity check", () => {
  it("does not fire on a conformant interchange, which splits into ISA plus 16 elements", () => {
    const ix = parseX12(CONFORMANT);
    expect(ix.isa.elements).toHaveLength(17);
    expect(ix.warnings).toEqual([]);
  });

  it("censuses all 16 fixed ISA elements: 14 report the extra separator, 2 are Tier-3 first", () => {
    const rows = [];
    for (let n = 1; n <= 16; n++) {
      const raw = withSeparatorInElement(n);
      try {
        const ix = parseX12(raw);
        rows.push({
          element: n,
          parts: ix.isa.elements.length,
          codes: ix.warnings.map((w) => w.code),
        });
      } catch (err) {
        rows.push({
          element: n,
          parts: 0,
          codes: [(err as X12ParseError).code],
        });
      }
    }

    // Published as measured. The first code on every framing row is the new
    // one: `decodeEnvelope` raises it ahead of the ISA-derived checks that read
    // `elements[12]` and `elements[13]` by index, because when it fires those
    // two may be reading a displaced element rather than the one they name.
    expect(rows).toEqual([
      {
        element: 1,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 2,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 3,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 4,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 5,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 6,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 7,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 8,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 9,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 10,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      { element: 11, parts: 0, codes: ["X12_INVALID_DELIMITERS"] },
      {
        element: 12,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_PRE_005010", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      {
        element: 13,
        parts: 18,
        codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR", "X12_CONTROL_NUMBER_MISMATCH"],
      },
      { element: 14, parts: 18, codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR"] },
      { element: 15, parts: 18, codes: ["X12_ISA_EXTRA_ELEMENT_SEPARATOR"] },
      { element: 16, parts: 0, codes: ["X12_INVALID_DELIMITERS"] },
    ]);
  });

  it("ISA-14 and ISA-15 were reported on NO channel at all before this code existed", () => {
    // The two rows whose only warning is the new one. At base these parsed
    // with `warnings: []` while ISA-15, the test/production usage indicator,
    // read empty instead of "P".
    for (const n of [14, 15]) {
      const ix = parseX12(withSeparatorInElement(n));
      expect(ix.warnings.map((w) => w.code)).toEqual([
        WARNING_CODES.X12_ISA_EXTRA_ELEMENT_SEPARATOR,
      ]);
      expect(ix.isa.elements[15]).toBe("");
    }
  });

  it("pins the displaced reads it reports rather than correcting them", () => {
    // ISA-13, the interchange control number and the reassociation key: the
    // transmitted value is a prefix and ISA-14 has taken its trailing byte.
    const cn = parseX12(withSeparatorInElement(13));
    expect(cn.isa.elements[13]).toBe("00000000");
    expect(cn.isa.elements[14]).toBe("");

    // ISA-06, a sender id: everything from ISA-12 on shifts by one place, so
    // `elements[12]` answers the repetition separator and X12_PRE_005010 fires
    // on an interchange that declares "00501" at ISA-12's own fixed offset.
    const sender = parseX12(withSeparatorInElement(6));
    expect(sender.isa.elements[12]).toBe("^");
    expect(sender.isa.elements[13]).toBe("00501");
    expect(sender.isa.elements[15]).toBe("0");
  });

  it("displaces by TWO when two elements carry the separator, so no rule says `by one`", () => {
    // The falsifier for the first draft's published rule. Two plants, ISA-06 and
    // ISA-13, on one interchange.
    const conformant = buildRawInterchange();
    const e6 = elementSpan(6).end;
    const e13 = elementSpan(13).end;
    const raw =
      conformant.slice(0, e6) +
      "*" +
      conformant.slice(e6 + 1, e13) +
      "*" +
      conformant.slice(e13 + 1);
    const ix = parseX12(raw);

    expect(ix.isa.elements).toHaveLength(19);
    expect(ix.warnings.map((w) => w.code)).toEqual([
      WARNING_CODES.X12_ISA_EXTRA_ELEMENT_SEPARATOR,
      WARNING_CODES.X12_PRE_005010,
      WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
    ]);
    // ISA-15, the test/production usage indicator, has moved TWO places: its
    // transmitted byte at the fixed offset is "P" and `elements[15]` is neither
    // that nor ISA-14's value.
    expect(ix.isa.raw[102]).toBe("P");
    expect(ix.isa.elements[16]).toBe("0");
    expect(ix.isa.elements[15]).toBe("");
  });

  it("scopes the ordering claim: `serializeX12` never raises this code", () => {
    // Pre-existing and disclosed, not fixed. `serializeX12`'s spec-clean
    // reconciliation reads `isa.elements[13]`, which on a displaced ISA is some
    // other element, so it reports a control-number mismatch on an interchange
    // whose transmitted ISA-13 span equals IEA-02 byte for byte - and the arity
    // warning never reaches that channel at all.
    const ix = parseX12(withSeparatorInElement(6));
    const { start, end } = elementSpan(13);
    expect(ix.isa.raw.slice(start, end + 1)).toBe(ix.iea?.elements[2]);

    const seen: string[] = [];
    serializeX12(ix, { specClean: true, onWarning: (w) => seen.push(w.code) });
    expect(seen).toEqual([WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH]);
  });

  it("keeps all 106 ISA bytes verbatim on `isa.raw`, which is the route back", () => {
    const raw = withSeparatorInElement(13);
    const ix = parseX12(raw);
    expect(ix.isa.raw).toBe(raw.slice(0, 106));
    expect(ix.isa.raw).toHaveLength(106);
    // The transmitted ISA-13 is recoverable from the fixed byte span even
    // though the split lost it. Recovering it is the CALLER's decision: this
    // library does not make it, because the byte has two readings.
    const { start, end } = elementSpan(13);
    expect(ix.isa.raw.slice(start, end + 1)).toBe("00000000*");
  });

  it("does not depend on the planted byte sitting next to a real separator", () => {
    // The census plants the separator at each element's LAST byte, which puts
    // it adjacent to the real separator that follows. A byte in the MIDDLE of
    // ISA-13 behaves the same way, so the census is not measuring adjacency.
    const conformant = buildRawInterchange();
    const { start, end } = elementSpan(13);
    const mid = start + 4;
    const raw = conformant.slice(0, mid) + "*" + conformant.slice(mid + 1);
    const ix = parseX12(raw);
    expect(ix.isa.elements).toHaveLength(18);
    expect(ix.warnings.map((w) => w.code)).toEqual([
      WARNING_CODES.X12_ISA_EXTRA_ELEMENT_SEPARATOR,
      WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
    ]);
    expect(ix.isa.elements[13]).toBe("0000");
    expect(ix.isa.raw.slice(start, end + 1)).toBe("0000*0001");
  });

  it("escalates under strict mode, ahead of the displaced-value diagnostics", () => {
    expect(() => parseX12(withSeparatorInElement(6), { strict: true })).toThrow(X12ParseError);
    try {
      parseX12(withSeparatorInElement(6), { strict: true });
      expect.unreachable("strict mode must escalate");
    } catch (err) {
      expect((err as X12ParseError).code).toBe(WARNING_CODES.X12_ISA_EXTRA_ELEMENT_SEPARATOR);
      expect((err as X12ParseError).snippet).toBe("");
    }
  });

  it("carries a registry message that echoes no document bytes", () => {
    const ix = parseX12(withSeparatorInElement(9));
    const w = ix.warnings[0];
    expect(w).toBeDefined();
    expect(ALL_WARNING_MESSAGES.has(w?.message ?? "")).toBe(true);
    expect(w?.position).toEqual({ segmentIndex: 0, interchangeIndex: 0 });
  });

  it("a probe that plants the separator on a NON-element byte does not fire it", () => {
    // Negative control for the probe itself: the ISA carries plenty of bytes
    // that are not inside a fixed element at all... except that it does not.
    // Byte 105 is the segment terminator, and every other byte in 0..104 is
    // either "ISA", a separator, or element content. So the control is the
    // conformant document plus a body element carrying the separator, which
    // is an ordinary delimited segment and frames on its own rules.
    const ix = parseX12(buildRawInterchange({ transactionBody: ["NM1*IL*1*DOE*JANE"] }));
    expect(ix.warnings.map((w) => w.code)).toEqual([]);
  });
});

describe("the build side reaches the same check, because `buildInterchange` re-parses its own bytes", () => {
  const base = {
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "250101",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groups: [],
  };

  it("a control number carrying the element separator was silent, and is not now", () => {
    // The sharpest cell on this side, and it needs no reader at all: the ISA
    // fixed-width slots go through `pad` / `padControl` and never through the
    // caller escaper, so the byte reaches the wire. `buildInterchange` then
    // parses what it wrote, reads ISA-13 as "0000" and ISA-15 as "0" instead
    // of "P", and IEA-02 is displaced the SAME way - so the control-number
    // reconciliation agreed with the misreading and the whole thing came back
    // `warnings: []`.
    const ix = buildInterchange({ ...base, interchangeControlNumber: "0000*0001" });
    expect(ix.warnings.map((w) => w.code)).toEqual([WARNING_CODES.X12_ISA_EXTRA_ELEMENT_SEPARATOR]);
    expect(ix.isa.elements[13]).toBe("0000");
    expect(ix.isa.elements[15]).toBe("0");
  });

  it("still emits nothing on a clean spec", () => {
    const ix = buildInterchange({ ...base });
    expect(ix.warnings).toEqual([]);
    expect(ix.isa.elements).toHaveLength(17);
  });

  it("this is a REPORT, not a build-side guard: the bytes are still emitted", () => {
    // `buildInterchange` does not refuse an ISA slot carrying the element
    // separator, and this slice does not make it. That is the build-side twin,
    // filed rather than folded in: it is a decision about refusing on emit,
    // which is the opposite side from the one measured here.
    const ix = buildInterchange({ ...base, senderId: "AB*CD" });
    expect(ix.isa.raw).toContain("AB*CD");
  });
});

describe("the helper the census is built from", () => {
  it("writes an override verbatim into its fixed span", () => {
    const isa = buildIsa({ controlNumber: "0000*0001" });
    expect(isa).toHaveLength(106);
    expect(isa.slice(90, 99)).toBe("0000*0001");
  });
});

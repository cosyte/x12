/**
 * BDS and BIN binary data framed by the octet count its length element
 * declares (BDS-02 / BIN-01), not by delimiter scanning. Every test names the
 * acceptance criterion it grades (`AC-n`).
 *
 * Every interchange here is assembled in code from synthetic bytes: an ISA
 * from `buildIsa` declaring `00501` (so `X12_PRE_005010` never muddies a
 * warning assertion), one functional group, and one transaction set whose body
 * is the segment under test plus a trailing `REF` whose survival shows the
 * segments after a binary segment are intact.
 */

import { Buffer } from "node:buffer";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  WARNING_CODES,
  elementValue,
  getAllSegmentValues,
  getSegmentValue,
  parseX12,
  serializeX12,
  type X12Interchange,
  type X12ParseWarning,
  type X12Segment,
  type X12WarningCode,
} from "../src/index.js";

import { buildInterchange } from "./_helpers/envelope.js";

/** The four codes this change adds: "a binary framing warning". */
const BINARY_CODES: readonly X12WarningCode[] = [
  WARNING_CODES.X12_BINARY_DATA_TRUNCATED,
  WARNING_CODES.X12_BINARY_LENGTH_INVALID,
  WARNING_CODES.X12_BINARY_LENGTH_MISMATCH,
  WARNING_CODES.X12_BINARY_LENGTH_UNVERIFIABLE,
];

/** The segment after the binary one, whose survival AC-1 checks. */
const AFTER = "REF*ZZ*SYNTHAFTER";

/** Position of the binary segment in every interchange here: ISA 0, GS 1, ST 2. */
const BINARY_SEGMENT_INDEX = 3;

interface Layout {
  readonly id: "BDS" | "BIN";
  /** Everything between the id and the length element, separator included. */
  readonly head: string;
  readonly lengthIndex: number;
  readonly dataIndex: number;
}

const BDS: Layout = { id: "BDS", head: "*B64", lengthIndex: 2, dataIndex: 3 };
const BIN: Layout = { id: "BIN", head: "", lengthIndex: 1, dataIndex: 2 };
const LAYOUTS = [BDS, BIN] as const;

/** `BDS*B64*<length>*<data>` or `BIN*<length>*<data>`, unterminated. */
function binarySegment(layout: Layout, length: string, data: string): string {
  return `${layout.id}${layout.head}*${length}*${data}`;
}

/** A compact interchange whose transaction body is `body`, SE-01 counted. */
function interchange(body: readonly string[]): string {
  return buildInterchange({
    functionalIdCode: "PI",
    transactionSetId: "275",
    versionRelease: "005010X210",
    transactionBody: body,
  });
}

/** The interchange as the bytes a `Buffer` caller would hand over. */
function latin1(text: string): Buffer {
  return Buffer.from(text, "latin1");
}

function onlyTransaction(ix: X12Interchange): {
  segments: readonly X12Segment[];
  rawSegments: readonly string[];
} {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("fixture produced no transaction set");
  return tx;
}

function binarySegmentOf(ix: X12Interchange): X12Segment {
  const seg = onlyTransaction(ix).segments[1];
  if (seg === undefined) throw new Error("fixture produced no binary segment");
  return seg;
}

function codes(warnings: readonly X12ParseWarning[]): X12WarningCode[] {
  return warnings.map((w) => w.code);
}

function specCleanWarnings(ix: X12Interchange): X12ParseWarning[] {
  const out: X12ParseWarning[] = [];
  serializeX12(ix, { specClean: true, onWarning: (w) => out.push(w) });
  return out;
}

/**
 * Every delimiter role of the `*^:~` set, the release character (once
 * before the terminator and once as the FINAL octet), CR and LF.
 */
const DELIMITER_PAYLOAD = "a*b^c:d~e?~f\rg\nh??i?";

describe("AC-1: the binary data element is read as exactly the declared length", () => {
  for (const layout of LAYOUTS) {
    it(`AC-1: a ${layout.id} data element carrying every delimiter, a final ?, CR and LF is one element`, () => {
      const segment = binarySegment(layout, String(DELIMITER_PAYLOAD.length), DELIMITER_PAYLOAD);
      const raw = interchange([segment, AFTER]);
      const ix = parseX12(raw);
      const seg = binarySegmentOf(ix);

      expect(seg.id).toBe(layout.id);
      expect(seg.raw).toBe(segment);
      expect(seg.elements).toHaveLength(layout.dataIndex + 1);
      expect(seg.elements[layout.dataIndex]).toBe(DELIMITER_PAYLOAD);

      // The transaction's segments after it are intact.
      const tx = onlyTransaction(ix);
      expect(tx.rawSegments).toEqual(["ST*275*0001", segment, AFTER, "SE*4*0001"]);
      expect(tx.segments.map((s) => s.id)).toEqual(["ST", layout.id, "REF", "SE"]);

      // No framing, count, placement or trailer warning, on either channel.
      const all = [...ix.warnings, ...specCleanWarnings(ix)];
      for (const code of [
        WARNING_CODES.X12_SEGMENT_COUNT_MISMATCH,
        WARNING_CODES.X12_UNEXPECTED_SEGMENT,
        WARNING_CODES.X12_MISSING_SE,
        ...BINARY_CODES,
      ]) {
        expect(codes(all)).not.toContain(code);
      }
      expect(all).toEqual([]);
    });

    it(`AC-1: a ${layout.id} Buffer payload holding every octet 0x00 to 0xFF is read whole`, () => {
      const payload = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
      const [before, after] = interchange([binarySegment(layout, "256", "\u0000"), AFTER]).split(
        "\u0000",
      );
      const bytes = Buffer.concat([latin1(before ?? ""), payload, latin1(after ?? "")]);
      const ix = parseX12(bytes);
      const seg = binarySegmentOf(ix);

      expect(seg.elements).toHaveLength(layout.dataIndex + 1);
      expect(latin1(seg.elements[layout.dataIndex] ?? "").equals(payload)).toBe(true);
      expect(onlyTransaction(ix).segments.map((s) => s.id)).toEqual(["ST", layout.id, "REF", "SE"]);
      expect([...ix.warnings, ...specCleanWarnings(ix)]).toEqual([]);
    });
  }
});

describe("AC-2: input that ends before the declared length", () => {
  for (const layout of LAYOUTS) {
    for (const declared of ["100", "999999999999999"]) {
      it(`AC-2: a ${layout.id} declaring ${declared} octets over a 3-octet tail warns and reads nothing past the end`, () => {
        // The input simply stops inside the data: no SE, GE or IEA follows.
        const cut = interchange([binarySegment(layout, declared, "\u0000")]).split("\u0000")[0];
        const text = `${cut ?? ""}a~b`;
        for (const input of [text, latin1(text)]) {
          let ix: X12Interchange | undefined;
          expect(() => {
            ix = parseX12(input);
          }).not.toThrow();
          if (ix === undefined) throw new Error("unreachable");
          const truncated = ix.warnings.filter(
            (w) => w.code === WARNING_CODES.X12_BINARY_DATA_TRUNCATED,
          );
          expect(truncated).toHaveLength(1);
          expect(truncated[0]?.position.segmentIndex).toBe(BINARY_SEGMENT_INDEX);
          expect(truncated[0]?.position.elementIndex).toBe(layout.dataIndex);
          // Only the octets that are present, and every one of them.
          expect(binarySegmentOf(ix).elements[layout.dataIndex]).toBe("a~b");
        }
      });
    }
  }
});

describe("AC-3: an absent, empty or malformed length element", () => {
  /** A data element that a count would keep whole and a delimiter scan splits. */
  const DATA = "ab*cd~ef";

  /** The same interchange with the segment id swapped for one nobody frames by count. */
  const asOrdinary = (raw: string, layout: Layout): string =>
    raw.replace(`~${layout.id}${layout.head}`, `~ZZZ${layout.head}`);

  const cases: readonly { name: string; segment: (l: Layout) => string; length?: string }[] = [
    {
      name: "absent (the segment ends after the id or the filter)",
      segment: (l) => `${l.id}${l.head}`,
    },
    { name: "empty", segment: (l) => binarySegment(l, "", DATA), length: "" },
    { name: "signed +", segment: (l) => binarySegment(l, "+5", DATA), length: "+5" },
    { name: "signed -", segment: (l) => binarySegment(l, "-5", DATA), length: "-5" },
    { name: "decimal", segment: (l) => binarySegment(l, "5.0", DATA), length: "5.0" },
    { name: "leading space", segment: (l) => binarySegment(l, " 5", DATA), length: " 5" },
    { name: "trailing space", segment: (l) => binarySegment(l, "5 ", DATA), length: "5 " },
    { name: "a letter", segment: (l) => binarySegment(l, "5x", DATA), length: "5x" },
    {
      name: "16 digits, over DE 784's 15",
      segment: (l) => binarySegment(l, "0000000000000005", DATA),
      length: "0000000000000005",
    },
  ];

  for (const layout of LAYOUTS) {
    for (const c of cases) {
      it(`AC-3: a ${layout.id} length element that is ${c.name} warns and is framed as any other segment`, () => {
        const raw = interchange([c.segment(layout), AFTER]);
        const ix = parseX12(raw);

        const invalid = ix.warnings.filter(
          (w) => w.code === WARNING_CODES.X12_BINARY_LENGTH_INVALID,
        );
        expect(invalid).toHaveLength(1);
        expect(invalid[0]?.position.segmentIndex).toBe(BINARY_SEGMENT_INDEX);
        expect(invalid[0]?.position.elementIndex).toBe(layout.lengthIndex);

        // The length element on the model is the sender's bytes, unchanged.
        expect(binarySegmentOf(ix).elements[layout.lengthIndex]).toBe(c.length);

        // Framed exactly as a segment of an ordinary id is: no count derived
        // from the data, and none from where a terminator happens to fall.
        const ordinary = onlyTransaction(parseX12(asOrdinary(raw, layout)));
        const tx = onlyTransaction(ix);
        expect(tx.rawSegments.map((s) => s.replace(layout.id, "ZZZ"))).toEqual(
          ordinary.rawSegments,
        );
        expect(tx.segments.map((s) => s.elements.slice(1))).toEqual(
          ordinary.segments.map((s) => s.elements.slice(1)),
        );
      });
    }

    it(`AC-3: a ${layout.id} length with leading zeros is a valid integer and raises nothing`, () => {
      const segment = binarySegment(layout, "0008", DATA);
      const ix = parseX12(interchange([segment, AFTER]));
      expect(binarySegmentOf(ix).elements[layout.dataIndex]).toBe(DATA);
      expect(binarySegmentOf(ix).elements[layout.lengthIndex]).toBe("0008");
      expect(ix.warnings).toEqual([]);
    });

    it(`AC-3: a ${layout.id} length of exactly 15 digits is honoured`, () => {
      const segment = binarySegment(layout, "000000000000008", DATA);
      const ix = parseX12(interchange([segment, AFTER]));
      expect(binarySegmentOf(ix).elements[layout.dataIndex]).toBe(DATA);
      expect(ix.warnings).toEqual([]);
    });
  }
});

describe("AC-4: serializeX12 writes a parsed BDS or BIN back unchanged", () => {
  const DELIMITERS = ["*", "^", ":", "~", "?", "\r", "\n"] as const;

  it("AC-4: round trips random binary payloads, each holding a delimiter, default and spec-clean", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LAYOUTS),
        fc.uint8Array({ minLength: 0, maxLength: 120 }),
        fc.constantFrom(...DELIMITERS),
        fc.nat(),
        (layout, bytes, delimiter, at) => {
          const noise = Buffer.from(bytes).toString("latin1");
          const cut = at % (noise.length + 1);
          const payload = noise.slice(0, cut) + delimiter + noise.slice(cut);
          const segment = binarySegment(layout, String(payload.length), payload);
          const raw = interchange([segment, AFTER]);

          for (const input of [raw, latin1(raw)]) {
            const ix = parseX12(input);
            expect(ix.warnings).toEqual([]);

            const emitted = serializeX12(ix);
            expect(emitted).toBe(raw);
            // The length element written equals the octet count of the data written.
            expect(emitted).toContain(`~${layout.id}${layout.head}*${String(payload.length)}*`);
            expect(emitted).toContain(`${segment}~`);
            expect(latin1(payload)).toHaveLength(payload.length);

            const warnings: X12ParseWarning[] = [];
            const clean = serializeX12(ix, {
              specClean: true,
              recomputeCounts: true,
              onWarning: (w) => warnings.push(w),
            });
            expect(clean).toBe(raw);
            expect(warnings).toEqual([]);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("AC-5: a declared span not followed by the segment terminator", () => {
  for (const layout of LAYOUTS) {
    it(`AC-5: a ${layout.id} length SHORTER than its data warns, keeps the span, and loses no byte`, () => {
      const segment = binarySegment(layout, "4", "abcdefgh");
      const raw = interchange([segment, AFTER]);
      const ix = parseX12(raw);

      expect(codes(ix.warnings)).toEqual([WARNING_CODES.X12_BINARY_LENGTH_MISMATCH]);
      expect(ix.warnings[0]?.position.segmentIndex).toBe(BINARY_SEGMENT_INDEX);
      expect(ix.warnings[0]?.position.elementIndex).toBe(layout.dataIndex);
      expect(binarySegmentOf(ix).elements[layout.dataIndex]).toBe("abcd");
      // The bytes after the span stay on the segment's raw text.
      expect(binarySegmentOf(ix).raw).toBe(segment);
      expect(serializeX12(ix)).toBe(raw);
    });

    it(`AC-5: a ${layout.id} length LONGER than its data warns, keeps the span, and loses no byte`, () => {
      // Twelve octets declared over four: the span runs through the terminator
      // and into the segment after it, and the byte after the span is `X`.
      const raw = interchange([binarySegment(layout, "12", "abcd"), "REF*ZZ*XY"]);
      const ix = parseX12(raw);

      const mismatch = ix.warnings.filter(
        (w) => w.code === WARNING_CODES.X12_BINARY_LENGTH_MISMATCH,
      );
      expect(mismatch).toHaveLength(1);
      expect(mismatch[0]?.position.segmentIndex).toBe(BINARY_SEGMENT_INDEX);
      expect(binarySegmentOf(ix).elements[layout.dataIndex]).toBe("abcd~REF*ZZ*");
      expect(serializeX12(ix)).toBe(raw);
    });

    it(`AC-5: a ${layout.id} declaring octets with no data element warns and is framed by its delimiters`, () => {
      const segment = `${layout.id}${layout.head}*12`;
      const raw = interchange([segment, AFTER]);
      const ix = parseX12(raw);

      expect(codes(ix.warnings)).toEqual([WARNING_CODES.X12_BINARY_LENGTH_MISMATCH]);
      expect(ix.warnings[0]?.position.segmentIndex).toBe(BINARY_SEGMENT_INDEX);
      expect(onlyTransaction(ix).rawSegments).toEqual(["ST*275*0001", segment, AFTER, "SE*4*0001"]);
      expect(serializeX12(ix)).toBe(raw);
    });
  }
});

describe("AC-6: a string span holding a code unit above U+00FF", () => {
  for (const layout of LAYOUTS) {
    for (const payload of ["a€b", "a\u{1F600}b"]) {
      it(`AC-6: a ${layout.id} string span holding ${JSON.stringify(payload)} warns and is carried verbatim`, () => {
        const ix = parseX12(
          interchange([binarySegment(layout, String(payload.length), payload), AFTER]),
        );

        expect(codes(ix.warnings)).toEqual([WARNING_CODES.X12_BINARY_LENGTH_UNVERIFIABLE]);
        expect(ix.warnings[0]?.position.segmentIndex).toBe(BINARY_SEGMENT_INDEX);
        expect(ix.warnings[0]?.position.elementIndex).toBe(layout.dataIndex);
        expect(binarySegmentOf(ix).elements[layout.dataIndex]).toBe(payload);
        expect(onlyTransaction(ix).segments.map((s) => s.id)).toEqual([
          "ST",
          layout.id,
          "REF",
          "SE",
        ]);
      });

      it(`AC-6: the same ${layout.id} payload ${JSON.stringify(payload)} passed as a Buffer raises no such warning`, () => {
        const octets = Buffer.from(payload, "utf8");
        const text = interchange([binarySegment(layout, String(octets.length), payload), AFTER]);
        const ix = parseX12(Buffer.from(text, "utf8"));

        expect(codes(ix.warnings)).not.toContain(WARNING_CODES.X12_BINARY_LENGTH_UNVERIFIABLE);
        expect(ix.warnings).toEqual([]);
        expect(latin1(binarySegmentOf(ix).elements[layout.dataIndex] ?? "").equals(octets)).toBe(
          true,
        );
      });
    }

    it(`AC-6: a ${layout.id} string span whose highest code unit is U+00FF raises nothing`, () => {
      const payload = "aÿb";
      const ix = parseX12(interchange([binarySegment(layout, "3", payload), AFTER]));
      expect(ix.warnings).toEqual([]);
      expect(binarySegmentOf(ix).elements[layout.dataIndex]).toBe(payload);
    });
  }
});

describe("AC-7: the segment value readers return the data element verbatim", () => {
  /** Release sequences, a repetition and a component, and a final `?`. */
  const PAYLOAD = "p?*q??r^s:t?";

  for (const layout of LAYOUTS) {
    it(`AC-7: getSegmentValue and elementValue on ${layout.id}-${String(layout.dataIndex).padStart(2, "0")} neither unescape nor split`, () => {
      const ix = parseX12(
        interchange([binarySegment(layout, String(PAYLOAD.length), PAYLOAD), AFTER]),
      );
      const seg = binarySegmentOf(ix);
      const path = String(layout.dataIndex).padStart(2, "0");
      const emitted: X12ParseWarning[] = [];
      const collect = (w: X12ParseWarning): void => {
        emitted.push(w);
      };

      expect(getSegmentValue(seg, path, ix.delimiters, collect)).toBe(PAYLOAD);
      expect(elementValue(seg, layout.dataIndex, ix.delimiters)).toBe(PAYLOAD);
      expect(getAllSegmentValues(seg, path, ix.delimiters, collect)).toEqual([PAYLOAD]);
      // A `?` in the data is data: no dangling-release warning on the read.
      expect(emitted).toEqual([]);
    });

    it(`AC-7: ${layout.id} binary data has one repetition and one component, itself`, () => {
      const ix = parseX12(
        interchange([binarySegment(layout, String(PAYLOAD.length), PAYLOAD), AFTER]),
      );
      const seg = binarySegmentOf(ix);
      const path = String(layout.dataIndex).padStart(2, "0");

      expect(getSegmentValue(seg, `${path}[0]`, ix.delimiters)).toBe(PAYLOAD);
      expect(getSegmentValue(seg, `${path}-1`, ix.delimiters)).toBe(PAYLOAD);
      expect(getSegmentValue(seg, `${path}[1]`, ix.delimiters)).toBeUndefined();
      expect(getSegmentValue(seg, `${path}-2`, ix.delimiters)).toBeUndefined();
      expect(getAllSegmentValues(seg, `${path}[1]`, ix.delimiters)).toEqual([]);
      expect(getAllSegmentValues(seg, `${path}-2`, ix.delimiters)).toEqual([]);
    });
  }
});

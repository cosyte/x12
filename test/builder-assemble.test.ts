/**
 * Builders make the interchange they return from the segments they wrote, not by parsing their
 * own bytes, and answer exactly what parsing those bytes answers.
 *
 * `parseX12` is wrapped here to count the calls a build makes. A build whose bytes hold no release
 * character and no binary segment makes none; one that does still parses, and either way the
 * result equals `parseX12` of the serialized bytes, warnings included. The full proof that nothing
 * a caller sees moved is `test/output-equivalence.test.ts`.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as ParserModule from "../src/parser/index.js";

const calls = vi.hoisted(() => ({ parse: 0 }));

vi.mock("../src/parser/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof ParserModule>();
  return {
    ...actual,
    parseX12: (...args: Parameters<typeof actual.parseX12>) => {
      calls.parse += 1;
      return actual.parseX12(...args);
    },
  };
});

import {
  ack999Spec,
  attachment275Spec,
  claim837ISpec,
  claim837PSpec,
  eligibility271Spec,
  inquiry270Spec,
  remit835Spec,
} from "../bench/corpus.mjs";
import { SegmentLog, builtInterchange } from "../src/builder/assemble.js";
import {
  X12Decimal,
  build270,
  build271,
  build275,
  build835,
  build837I,
  build837P,
  build999,
  buildInterchange,
  serializeX12,
} from "../src/index.js";
import type { InterchangeSpec, X12Interchange } from "../src/index.js";
import { parseX12 } from "../src/parser/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`not a decimal: ${value}`);
  return d;
}

/** `ix` and `parseX12` of its serialized bytes, compared as plain data, frozenness aside. */
function expectReadsAsItsBytes(ix: X12Interchange): void {
  const before = calls.parse;
  const reread = parseX12(serializeX12(ix));
  calls.parse = before;
  expect(ix).toStrictEqual(reread);
  expect(ix.warnings).toStrictEqual(reread.warnings);
}

const SPEC: InterchangeSpec = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "250101",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groups: [
    {
      functionalIdCode: "HC",
      groupControlNumber: "1",
      versionRelease: "005010X222A2",
      transactions: [
        {
          transactionSetIdCode: "837",
          transactionSetControlNumber: "0001",
          segments: [
            ["BHT", "0019", "00", "REF"],
            ["SE", "9", "0001"],
          ],
        },
      ],
    },
  ],
};

beforeEach(() => {
  calls.parse = 0;
});

describe("builders make their interchange from the segments they wrote", () => {
  it.each([
    ["build835", () => build835(remit835Spec(dec, 1, 4))],
    ["build837P", () => build837P(claim837PSpec(dec, 1, 4))],
    ["build837I", () => build837I(claim837ISpec(dec, 1, 4))],
    ["build270", () => build270(inquiry270Spec(dec, 1))],
    ["build271", () => build271(eligibility271Spec(dec, 1, 4))],
    ["build999", () => build999(ack999Spec(dec, 1, 2))],
    ["buildInterchange", () => buildInterchange(SPEC)],
  ])("%s does not parse its own bytes", (_name, build) => {
    const ix = build();
    expect(calls.parse).toBe(0);
    expectReadsAsItsBytes(ix);
  });

  it("still reports what the bytes mean: an SE a caller put inside a body", () => {
    const ix = buildInterchange(SPEC);
    // The caller's SE closes the set, so the builder's own SE is the one left over.
    expect(ix.warnings.map((w) => w.code)).toEqual(["X12_UNEXPECTED_SEGMENT"]);
    expect(ix.orphanSegments.map((o) => o.raw)).toEqual(["SE*4*0001"]);
  });

  it("parses the bytes where a release character or a binary segment is in them", () => {
    const released = buildInterchange({
      ...SPEC,
      groups: [
        {
          functionalIdCode: "HC",
          groupControlNumber: "1",
          versionRelease: "005010X222A2",
          transactions: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "1",
              segments: [["REF", "A*B"]],
            },
          ],
        },
      ],
    });
    expect(calls.parse).toBe(1);
    expectReadsAsItsBytes(released);
    const attachment = build275(attachment275Spec(dec, 1, 40));
    expect(calls.parse).toBe(2);
    expectReadsAsItsBytes(attachment);
  });
});

describe("builtInterchange", () => {
  const isa =
    "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~";

  it("keeps the parts a segment was joined from as its elements", () => {
    const log = new SegmentLog();
    const parts = ["REF", "EA", "X"];
    const gs = log.record(
      ["GS", "HC", "A", "B", "20250101", "1200", "1", "X", "V"],
      "GS*HC*A*B*20250101*1200*1*X*V",
      "~",
    );
    const st = log.record(["ST", "837", "1"], "ST*837*1", "~");
    const ref = log.record(parts, "REF*EA*X", "~");
    const rest = "SE*3*1~GE*1*1~IEA*1*000000001~";
    const ix = builtInterchange(isa, [gs, st, ref, rest], log);
    expect(calls.parse).toBe(0);
    expect(ix.groups[0]?.transactions[0]?.segments[1]?.elements).toBe(parts);
    expect(Object.isFrozen(parts)).toBe(true);
    expect(ix).toStrictEqual(parseX12(isa + gs + st + ref + rest));
  });

  it("splits a part that holds the element separator, as the reader would", () => {
    const log = new SegmentLog();
    const text = log.record(["REF", "E*A"], "REF*E*A", "~");
    const ix = builtInterchange(isa, ["GS*HC~ST*1*1~", text, "SE*3*1~GE*1~IEA*1*000000001~"], log);
    expect(ix.groups[0]?.transactions[0]?.segments[1]?.elements).toEqual(["REF", "E", "A"]);
    expect(ix).toStrictEqual(parseX12(`${isa}GS*HC~ST*1*1~REF*E*A~SE*3*1~GE*1~IEA*1*000000001~`));
  });

  it("skips an empty entry, and splits a logged segment whose parts do not split back", () => {
    const log = new SegmentLog();
    const none = log.record([], "", "~");
    const odd = log.record(["REF", 7 as unknown as string], "REF*7", "~");
    const rest = "SE*4*1~GE*1~IEA*1*000000001~";
    const ix = builtInterchange(isa, ["", "GS*HC~ST*1*1~", none, odd, rest], log);
    expect(calls.parse).toBe(0);
    expect(ix.groups[0]?.transactions[0]?.segments[2]?.elements).toEqual(["REF", "7"]);
    expect(ix).toStrictEqual(parseX12(`${isa}GS*HC~ST*1*1~~REF*7~${rest}`));
  });

  it.each([
    ["delimiters the reader refuses", ["GS*HC~IEA*0*000000001~"], `${isa.slice(0, 104)}*~`],
    ["a segment that opens with a line break", ["GS*HC~\nREF*A~IEA*0*000000001~"]],
    ["a segment that opens with a carriage return", ["\rGS*HC~IEA*0*000000001~"]],
    ["text that does not end on the terminator", ["GS*HC~IEA*0*000000001"]],
    ["a binary segment", ["GS*HC~ST*1*1~BIN*3*A~B~SE*3*1~GE*1~IEA*1*000000001~"]],
    ["an ISA that does not read", ["GS*HC~IEA*0*000000001~"], "ISA*00"],
  ])("parses the bytes for %s", (_label, emitted, head = isa) => {
    const log = new SegmentLog();
    let built: unknown;
    let parsed: unknown;
    try {
      built = builtInterchange(head, emitted, log);
    } catch (error) {
      built = error;
    }
    expect(calls.parse).toBe(1);
    try {
      parsed = parseX12(head + emitted.join(""));
    } catch (error) {
      parsed = error;
    }
    expect(built).toStrictEqual(parsed);
  });
});

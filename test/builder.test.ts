/**
 * Unit tests for the Phase 8 general-purpose interchange builder
 * (`buildInterchange`). The builder owns every envelope mechanic — ISA layout,
 * GS/GE/SE/IEA control segments, and the SE-01 / GE-01 / IEA-01 counts — so a
 * caller supplies only identity + body segments. These tests lock that the
 * built interchange round-trips through the parser with ZERO warnings (a
 * builder that emits a self-inconsistent envelope is a bug), that the counts
 * are computed correctly, and that structurally impossible specs are refused.
 */

import { describe, expect, it } from "vitest";

import {
  buildInterchange,
  parseX12,
  serializeX12,
  X12_BUILD_ERROR_CODES,
  X12BuildError,
  type InterchangeSpec,
} from "../src/index.js";

function minimalSpec(overrides: Partial<InterchangeSpec> = {}): InterchangeSpec {
  return {
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
            implementationConventionReference: "005010X222A2",
            segments: [["BHT", "0019", "00", "REF", "20250101", "1200", "CH"]],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("buildInterchange: envelope mechanics", () => {
  it("builds a self-consistent interchange the parser reads with zero warnings", () => {
    const ix = buildInterchange(minimalSpec());
    expect(ix.warnings).toHaveLength(0);
    expect(ix.groups).toHaveLength(1);
    expect(ix.groups[0]?.transactions).toHaveLength(1);
  });

  it("computes SE-01 (ST + body + SE), GE-01, and IEA-01 correctly", () => {
    const out = serializeX12(buildInterchange(minimalSpec()));
    expect(out).toContain("SE*3*0001~"); // ST + BHT + SE
    expect(out).toContain("GE*1*1~");
    expect(out).toContain("IEA*1*000000001~");
  });

  it("preserves the 106-byte ISA and pads the control number to 9", () => {
    const ix = buildInterchange(minimalSpec({ interchangeControlNumber: "42" }));
    expect(ix.isa.raw).toHaveLength(106);
    expect(ix.isa.elements[13]).toBe("000000042");
    expect(ix.iea?.elements[2]).toBe("000000042");
  });

  it("round-trips: serialize(buildInterchange(spec)) re-parses with zero warnings", () => {
    const ix = buildInterchange(minimalSpec());
    const reparsed = parseX12(serializeX12(ix));
    expect(reparsed.warnings).toHaveLength(0);
  });

  it("honours custom delimiters", () => {
    const ix = buildInterchange(minimalSpec({ elementSeparator: "|", segmentTerminator: "'" }));
    expect(ix.delimiters.element).toBe("|");
    expect(ix.delimiters.segment).toBe("'");
    expect(ix.warnings).toHaveLength(0);
  });

  it("truncates an over-long fixed-width ISA field to its column count", () => {
    // senderId exceeds the 15-char ISA-06 column; the builder truncates it so
    // the ISA stays exactly 106 bytes rather than overrunning the envelope.
    const ix = buildInterchange(minimalSpec({ senderId: "SENDERIDWAYTOOLONG" }));
    expect(ix.isa.raw).toHaveLength(106);
    expect(ix.isa.elements[6]).toBe("SENDERIDWAYTOOL"); // first 15 chars
  });

  it("escapes active delimiters inside body element values", () => {
    const ix = buildInterchange(
      minimalSpec({
        groups: [
          {
            functionalIdCode: "HC",
            groupControlNumber: "1",
            versionRelease: "005010X222A2",
            transactions: [
              {
                transactionSetIdCode: "837",
                transactionSetControlNumber: "0001",
                segments: [["NM1", "IL", "1", "DOE*JANE"]],
              },
            ],
          },
        ],
      }),
    );
    expect(ix.warnings).toHaveLength(0);
    // The body NM1-03 round-trips to the literal value despite the embedded "*".
    const body = ix.groups[0]?.transactions[0]?.segments.find((s) => s.id === "NM1");
    expect(body?.elements[3]).toBe("DOE?*JANE"); // stored raw (escaped); unescaped on read
  });
});

describe("buildInterchange: refusals", () => {
  it("throws X12BuildError on an over-long ISA-13 control number", () => {
    expect(() => buildInterchange(minimalSpec({ interchangeControlNumber: "0123456789" }))).toThrow(
      X12BuildError,
    );
    try {
      buildInterchange(minimalSpec({ interchangeControlNumber: "0123456789" }));
    } catch (err) {
      expect(err).toBeInstanceOf(X12BuildError);
      expect((err as X12BuildError).code).toBe(X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC);
    }
  });

  it("throws X12BuildError on a segment spec with no segment id", () => {
    expect(() =>
      buildInterchange(
        minimalSpec({
          groups: [
            {
              functionalIdCode: "HC",
              groupControlNumber: "1",
              versionRelease: "005010X222A2",
              transactions: [
                {
                  transactionSetIdCode: "837",
                  transactionSetControlNumber: "0001",
                  segments: [[""]],
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow(X12BuildError);
  });
});

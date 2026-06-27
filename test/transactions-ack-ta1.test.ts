/**
 * Unit tests for the envelope-level TA1 Interchange Acknowledgment Phase
 * 3 surface — `parseTA1` + `buildTA1`. Covers:
 *
 * - Three Tier-1 fixtures (accept; accept-with-errors; reject-on-control-
 *   number-mismatch). Each fixture is a TA1-only interchange (ISA → TA1
 *   → IEA with no GS) — the canonical form for a TA1 transmitted in
 *   isolation per the ASC X12 standard.
 * - The TA1-only interchange parses to a `groups: []` shape with the TA1
 *   surfaced on `interchange.ta1Segments` and NO `X12_UNEXPECTED_SEGMENT`
 *   warning (TA1 is envelope-level by spec).
 * - `buildTA1` safety guard: `A` ack code + non-`000` note code throws.
 * - PHI safety: TA1 carries no PHI by design (control numbers + date + time
 *   + structural codes only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  buildTA1,
  parseTA1,
  parseX12,
  TA1_ACK_CODES,
  TA1_NOTE_CODES,
  WARNING_CODES,
} from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "ack");

function readFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
}

// ---------------------------------------------------------------------------
// Tier-1 fixtures.
// ---------------------------------------------------------------------------

describe("parseTA1 — Tier-1 fixtures", () => {
  it("decodes a clean accept (TA1*...*A*000)", () => {
    const ix = parseX12(readFixture("ta1-accept.edi"));
    expect(ix.ta1Segments).toHaveLength(1);
    expect(ix.groups).toHaveLength(0);
    const unexpected = ix.warnings.filter((w) => w.code === WARNING_CODES.X12_UNEXPECTED_SEGMENT);
    expect(unexpected).toHaveLength(0);
    const ta1 = parseTA1(ix);
    expect(ta1).not.toBeUndefined();
    if (ta1 === undefined) return;
    expect(ta1.interchangeControlNumber).toBe("000000019");
    expect(ta1.interchangeDate).toBe("250101");
    expect(ta1.interchangeTime).toBe("1200");
    expect(ta1.ackCode).toBe(TA1_ACK_CODES.A);
    expect(ta1.noteCode).toBe(TA1_NOTE_CODES["000"]);
    expect(ta1.noteCodeRaw).toBe("000");
  });

  it("decodes an accept-with-errors (TA1*...*E*016)", () => {
    const ix = parseX12(readFixture("ta1-accept-with-errors.edi"));
    const ta1 = parseTA1(ix);
    expect(ta1).not.toBeUndefined();
    if (ta1 === undefined) return;
    expect(ta1.ackCode).toBe(TA1_ACK_CODES.E);
    expect(ta1.noteCode).toBe(TA1_NOTE_CODES["016"]);
  });

  it("decodes a reject for control-number mismatch (TA1*...*R*001)", () => {
    const ix = parseX12(readFixture("ta1-reject-control-mismatch.edi"));
    const ta1 = parseTA1(ix);
    expect(ta1).not.toBeUndefined();
    if (ta1 === undefined) return;
    expect(ta1.ackCode).toBe(TA1_ACK_CODES.R);
    expect(ta1.noteCode).toBe(TA1_NOTE_CODES["001"]);
  });

  it("returns undefined when the interchange has no TA1", () => {
    const raw =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000099*0*P*:~" +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
      "ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000099~";
    const ix = parseX12(raw);
    expect(parseTA1(ix)).toBeUndefined();
  });
});

describe("envelope walker — TA1 capture", () => {
  it("captures an envelope-level TA1 onto interchange.ta1Segments verbatim", () => {
    const raw =
      "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1200*^*00501*000000050*0*P*:~" +
      "TA1*000000019*250101*1200*A*000~" +
      "IEA*0*000000050~";
    const ix = parseX12(raw);
    expect(ix.ta1Segments).toHaveLength(1);
    const ta1Seg = ix.ta1Segments[0];
    expect(ta1Seg?.raw).toBe("TA1*000000019*250101*1200*A*000");
    expect(ta1Seg?.elements).toEqual(["TA1", "000000019", "250101", "1200", "A", "000"]);
    // No unexpected-segment warning — TA1 at envelope level is spec-conformant.
    expect(ix.warnings.filter((w) => w.code === WARNING_CODES.X12_UNEXPECTED_SEGMENT)).toHaveLength(
      0,
    );
  });

  it("flags a TA1 found inside an open functional group as unexpected", () => {
    const raw =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000099*0*P*:~" +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
      "TA1*000000019*250101*1200*A*000~" +
      "ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000099~";
    const ix = parseX12(raw);
    const unexpected = ix.warnings.filter((w) => w.code === WARNING_CODES.X12_UNEXPECTED_SEGMENT);
    expect(unexpected.length).toBeGreaterThanOrEqual(1);
    expect(unexpected[0]?.message).toContain("TA1");
    expect(ix.ta1Segments).toHaveLength(0); // not captured at envelope level
  });
});

// ---------------------------------------------------------------------------
// `buildTA1` happy paths + safety guard.
// ---------------------------------------------------------------------------

describe("buildTA1 — happy paths", () => {
  it("emits a spec-clean A*000 segment for an accept", () => {
    const ta1 = buildTA1({
      interchangeControlNumber: "000000019",
      interchangeDate: "250101",
      interchangeTime: "1200",
      ackCode: "A",
      noteCode: "000",
    });
    expect(ta1.raw).toBe("TA1*000000019*250101*1200*A*000");
    expect(ta1.elements).toEqual(["TA1", "000000019", "250101", "1200", "A", "000"]);
    expect(Object.isFrozen(ta1)).toBe(true);
  });

  it("emits an E*016 segment for accept-with-errors", () => {
    const ta1 = buildTA1({
      interchangeControlNumber: "000000019",
      interchangeDate: "250101",
      interchangeTime: "1200",
      ackCode: "E",
      noteCode: "016",
    });
    expect(ta1.elements[4]).toBe("E");
    expect(ta1.elements[5]).toBe("016");
  });

  it("emits an R*001 segment for reject-on-control-number-mismatch", () => {
    const ta1 = buildTA1({
      interchangeControlNumber: "000000019",
      interchangeDate: "250101",
      interchangeTime: "1200",
      ackCode: "R",
      noteCode: "001",
    });
    expect(ta1.elements[4]).toBe("R");
    expect(ta1.elements[5]).toBe("001");
  });
});

describe("buildTA1 — safety guard", () => {
  it("refuses A paired with a non-000 note (X12_TA1_ACCEPT_WITH_NOTE)", () => {
    try {
      buildTA1({
        interchangeControlNumber: "000000019",
        interchangeDate: "250101",
        interchangeTime: "1200",
        ackCode: "A",
        noteCode: "001",
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
      if (err instanceof AckBuildError) {
        expect(err.code).toBe(ACK_BUILD_ERROR_CODES.X12_TA1_ACCEPT_WITH_NOTE);
      }
    }
  });

  it("allows A paired with 000 (the canonical clean accept)", () => {
    expect(() =>
      buildTA1({
        interchangeControlNumber: "000000019",
        interchangeDate: "250101",
        interchangeTime: "1200",
        ackCode: "A",
        noteCode: "000",
      }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// PHI safety — TA1 carries no PHI by construction.
// ---------------------------------------------------------------------------

describe("TA1 — PHI safety", () => {
  it("an emitted TA1 contains only structural fields (control number, date, time, codes)", () => {
    const ta1 = buildTA1({
      interchangeControlNumber: "000000019",
      interchangeDate: "250101",
      interchangeTime: "1200",
      ackCode: "R",
      noteCode: "025",
    });
    expect(ta1.raw).not.toMatch(/\d{3}-\d{2}-\d{4}/u); // SSN shape
    expect(ta1.raw).not.toMatch(/[A-Z]{2,}\^/u); // name composite shape
    // Every element is from a well-defined structural field.
    expect(ta1.elements.length).toBe(6);
  });
});

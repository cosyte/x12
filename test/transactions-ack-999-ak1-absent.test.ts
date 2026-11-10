/**
 * A 999 whose AK1 the reader had to fill in says so.
 *
 * `parse999` always resolves an `ak1`. Where the transaction set carries no
 * AK1, it reads `functionalIdCode` and `groupControlNumber` as empty strings
 * and `versionRelease` as undefined. That AK1 is what ties the 999 to the
 * functional group it answers, and before this the reader filled it in with
 * `warnings: []`, so a 999 that named no group looked like one that named an
 * empty one. The fill-in now carries `X12_999_AK1_ABSENT`, at the ST.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ALL_WARNING_MESSAGES, ack999Ak1Absent, parse999, type X12Ack999 } from "../src/index.js";

const GOLDEN = readFileSync(join(__dirname, "fixtures", "golden", "999.edi"), "utf8").trimEnd();

/** The golden 999 with its body replaced and SE-01 recounted. */
function withBody(body: readonly string[]): string {
  const start = GOLDEN.indexOf("~AK1*");
  const end = GOLDEN.indexOf("~SE*");
  const tail = GOLDEN.slice(end).replace(/^~SE\*\d+\*/u, `~SE*${String(body.length + 2)}*`);
  const joined = body.length === 0 ? "" : `~${body.join("~")}`;
  return `${GOLDEN.slice(0, start)}${joined}${tail}`;
}

function read(raw: string): X12Ack999 {
  const ack = parse999(raw);
  if (ack === undefined) throw new Error("no 999 in the fixture");
  return ack;
}

const AK2 = "AK2*837*0001*005010X222A2";

describe("parse999 warns when it fills in the AK1", () => {
  it("raises nothing on the golden 999, which carries its AK1", () => {
    const ack = read(GOLDEN);
    expect(ack.ak1.groupControlNumber).toBe("1");
    expect(ack.warnings.map((w) => w.code)).toEqual([]);
  });

  it("warns at the ST when the AK1 is missing, and still reads an empty AK1", () => {
    const ack = read(withBody([AK2, "IK5*A", "AK9*A*1*1*1"]));
    expect(ack.ak1).toEqual({
      functionalIdCode: "",
      groupControlNumber: "",
      versionRelease: undefined,
    });
    expect(ack.transactionResponses.map((r) => r.ik5.disposition)).toEqual(["A"]);
    expect(ack.ak9.disposition).toBe("A");
    expect(ack.warnings).toEqual([
      {
        code: "X12_999_AK1_ABSENT",
        message: ack999Ak1Absent({ segmentIndex: 0 }).message,
        position: { segmentIndex: 0, transactionIndex: 0 },
      },
    ]);
  });

  it("warns for the AK1 and the AK9 when the body is empty", () => {
    const ack = read(withBody([]));
    expect(ack.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      ["X12_999_AK1_ABSENT", 0],
      ["X12_999_AK9_ABSENT", 0],
    ]);
  });

  it("does not warn for an AK1 the sender sent with empty elements", () => {
    // Nothing is filled in there: the empty values are the sender's own, and
    // the raw segment says so.
    const ack = read(withBody(["AK1**", AK2, "IK5*A", "AK9*A*1*1*1"]));
    expect(ack.ak1.functionalIdCode).toBe("");
    expect(ack.warnings.map((w) => w.code)).toEqual([]);
  });

  it("does not warn for an AK1 that arrives after the AK2", () => {
    const ack = read(withBody([AK2, "AK1*HC*1*005010X222A2", "IK5*A", "AK9*A*1*1*1"]));
    expect(ack.ak1.groupControlNumber).toBe("1");
    expect(ack.warnings.map((w) => w.code)).toEqual([]);
  });

  it("builds its message from the registry and echoes nothing", () => {
    const at = { segmentIndex: 0, transactionIndex: 0 };
    const warning = ack999Ak1Absent(at);
    expect(warning.code).toBe("X12_999_AK1_ABSENT");
    expect(ALL_WARNING_MESSAGES.has(warning.message)).toBe(true);
    expect(warning.position).toBe(at);
  });
});

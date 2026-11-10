/**
 * A 999 whose disposition the reader had to fill in says so.
 *
 * `parse999` resolves a fail-safe model: an AK2 response that never reaches
 * its IK5, and a functional group that never reaches its AK9, each read as a
 * reject (`R`) with no syntax error codes, and a missing AK9's three counts
 * read 0. The reader's own comments said it warned when it did that. It did
 * not: `warnings` came back empty, so a reject the sender never sent was
 * indistinguishable from one they did. Each fill-in now carries a warning, at
 * the AK2 whose IK5 is missing or at the ST when the AK9 is.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  ack999Ak9Absent,
  ack999Ik5Absent,
  parse999,
  type X12Ack999,
} from "../src/index.js";

const GOLDEN = readFileSync(join(__dirname, "fixtures", "golden", "999.edi"), "utf8").trimEnd();

/** The golden 999 with its body replaced and SE-01 recounted. */
function withBody(body: readonly string[]): string {
  const start = GOLDEN.indexOf("~AK1*");
  const end = GOLDEN.indexOf("~SE*");
  const tail = GOLDEN.slice(end).replace(/^~SE\*\d+\*/u, `~SE*${String(body.length + 2)}*`);
  return `${GOLDEN.slice(0, start)}~${body.join("~")}${tail}`;
}

function read(raw: string): X12Ack999 {
  const ack = parse999(raw);
  if (ack === undefined) throw new Error("no 999 in the fixture");
  return ack;
}

const AK1 = "AK1*HC*1*005010X222A2";
const AK2 = (control: string): string => `AK2*837*${control}*005010X222A2`;

describe("parse999 warns when it fills in a disposition", () => {
  it("raises nothing on the golden 999, which carries every IK5 and its AK9", () => {
    const ack = read(GOLDEN);
    expect(ack.warnings.map((w) => w.code)).toEqual([]);
  });

  it("warns at the ST when the AK9 is missing, and still reads a reject", () => {
    const ack = read(withBody([AK1, AK2("0001"), "IK5*A"]));
    expect(ack.ak9.disposition).toBe("R");
    expect(ack.ak9.numberOfReceivedTransactionSets).toBe(0);
    expect(ack.warnings).toEqual([
      {
        code: WARNING_CODES.X12_999_AK9_ABSENT,
        message: ack999Ak9Absent({ segmentIndex: 0 }).message,
        position: { segmentIndex: 0, transactionIndex: 0 },
      },
    ]);
  });

  it("warns at the AK2 when its IK5 is missing before the AK9", () => {
    const ack = read(withBody([AK1, AK2("0001"), "AK9*R*1*1*0"]));
    expect(ack.transactionResponses[0]?.ik5.disposition).toBe("R");
    expect(ack.warnings).toEqual([
      {
        code: WARNING_CODES.X12_999_IK5_ABSENT,
        message: ack999Ik5Absent({ segmentIndex: 0 }).message,
        position: { segmentIndex: 2, transactionIndex: 0 },
      },
    ]);
  });

  it("warns at the first AK2 when a second AK2 opens before its IK5", () => {
    const ack = read(withBody([AK1, AK2("0001"), AK2("0002"), "IK5*A", "AK9*P*2*2*1"]));
    expect(ack.transactionResponses.map((r) => r.ik5.disposition)).toEqual(["R", "A"]);
    expect(ack.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      [WARNING_CODES.X12_999_IK5_ABSENT, 2],
    ]);
  });

  it("warns twice when the set ends on an AK2 with neither its IK5 nor the AK9", () => {
    const ack = read(withBody([AK1, AK2("0001"), "IK5*A", AK2("0002")]));
    expect(ack.transactionResponses.map((r) => r.ik5.disposition)).toEqual(["A", "R"]);
    expect(ack.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      [WARNING_CODES.X12_999_IK5_ABSENT, 4],
      [WARNING_CODES.X12_999_AK9_ABSENT, 0],
    ]);
  });

  it("builds each message from the registry and echoes nothing", () => {
    const at = { segmentIndex: 3, transactionIndex: 0 };
    for (const warning of [ack999Ik5Absent(at), ack999Ak9Absent(at)]) {
      expect(ALL_WARNING_MESSAGES.has(warning.message)).toBe(true);
      expect(warning.position).toBe(at);
    }
  });
});

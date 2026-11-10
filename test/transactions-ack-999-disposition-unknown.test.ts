/**
 * A 999 disposition the reader could not read says so.
 *
 * `parse999` narrows IK5-01 (or a legacy AK5-01) and AK9-01 to the seven
 * dispositions of code list 715. One it cannot narrow, because it is absent,
 * empty or another value, reads as a reject (`R`), fail-safe. The reader's own
 * doc comment said that fallback warned. It did not: `warnings` came back
 * empty, so a reject the reader made up looked like one the sender sent. Each
 * fallback now carries a warning at the segment, element 1.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  ack999Ak9DispositionUnknown,
  ack999Ik5DispositionUnknown,
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
const AK2 = "AK2*837*0001*005010X222A2";
const KNOWN = ["A", "E", "P", "R", "M", "W", "X"] as const;

describe("parse999 warns when it cannot read a disposition", () => {
  it("raises nothing for any of the seven known codes, at the IK5 or the AK9", () => {
    for (const code of KNOWN) {
      const ack = read(withBody([AK1, AK2, `IK5*${code}`, `AK9*${code}*1*1*1`]));
      expect(ack.transactionResponses[0]?.ik5.disposition).toBe(code);
      expect(ack.ak9.disposition).toBe(code);
      expect(ack.warnings.map((w) => w.code)).toEqual([]);
    }
  });

  it("warns at the IK5, element 1, when IK5-01 is not a known code, and still reads a reject", () => {
    const ack = read(withBody([AK1, AK2, "IK5*Z", "AK9*A*1*1*1"]));
    expect(ack.transactionResponses[0]?.ik5.disposition).toBe("R");
    expect(ack.ak9.disposition).toBe("A");
    expect(ack.warnings).toEqual([
      {
        code: "X12_999_IK5_DISPOSITION_UNKNOWN",
        message: ack999Ik5DispositionUnknown({ segmentIndex: 0 }).message,
        position: { segmentIndex: 3, transactionIndex: 0, elementIndex: 1 },
      },
    ]);
  });

  it("warns at the AK9, element 1, when AK9-01 is not a known code, and still reads a reject", () => {
    const ack = read(withBody([AK1, AK2, "IK5*A", "AK9*Z*1*1*1"]));
    expect(ack.transactionResponses[0]?.ik5.disposition).toBe("A");
    expect(ack.ak9.disposition).toBe("R");
    expect(ack.ak9.numberOfAcceptedTransactionSets).toBe(1);
    expect(ack.warnings).toEqual([
      {
        code: "X12_999_AK9_DISPOSITION_UNKNOWN",
        message: ack999Ak9DispositionUnknown({ segmentIndex: 0 }).message,
        position: { segmentIndex: 4, transactionIndex: 0, elementIndex: 1 },
      },
    ]);
  });

  it("warns for an empty or absent disposition the same way", () => {
    const ack = read(withBody([AK1, AK2, "IK5", AK2, "IK5**5", "AK9**2*2*0"]));
    expect(ack.transactionResponses.map((r) => r.ik5.disposition)).toEqual(["R", "R"]);
    expect(ack.ak9.disposition).toBe("R");
    expect(ack.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      ["X12_999_IK5_DISPOSITION_UNKNOWN", 3],
      ["X12_999_IK5_DISPOSITION_UNKNOWN", 5],
      ["X12_999_AK9_DISPOSITION_UNKNOWN", 6],
    ]);
  });

  it("compares exactly, so a lower-case code is not a known one", () => {
    const ack = read(withBody([AK1, AK2, "IK5*a", "AK9*a*1*1*1"]));
    expect(ack.warnings.map((w) => w.code)).toEqual([
      "X12_999_IK5_DISPOSITION_UNKNOWN",
      "X12_999_AK9_DISPOSITION_UNKNOWN",
    ]);
  });

  it("warns on a legacy AK5 the same as on an IK5", () => {
    const ack = read(withBody([AK1, AK2, "AK5*Z", "AK9*A*1*1*1"]));
    expect(ack.transactionResponses[0]?.ik5.disposition).toBe("R");
    expect(ack.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      ["X12_999_IK5_DISPOSITION_UNKNOWN", 3],
    ]);
  });

  it("keeps the absent-IK5 warning distinct from an unreadable IK5-01", () => {
    // The first AK2 has no IK5 at all; the second has one that says nothing
    // the reader knows. Both read as a reject, and each says which it is.
    const ack = read(withBody([AK1, AK2, AK2, "IK5*Z", "AK9*R*2*2*0"]));
    expect(ack.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      ["X12_999_IK5_ABSENT", 2],
      ["X12_999_IK5_DISPOSITION_UNKNOWN", 4],
    ]);
  });

  it("builds each message from the registry and echoes nothing", () => {
    const at = { segmentIndex: 3, transactionIndex: 0, elementIndex: 1 };
    for (const warning of [ack999Ik5DispositionUnknown(at), ack999Ak9DispositionUnknown(at)]) {
      expect(ALL_WARNING_MESSAGES.has(warning.message)).toBe(true);
      expect(warning.position).toBe(at);
    }
  });
});

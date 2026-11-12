/**
 * The shared transaction helpers under `src/transactions/shared/`, at the
 * branches the reader suites reach without telling one answer from another:
 * an HL whose level needs a parent but states none, and the inputs a caller
 * outside TypeScript can hand the date conversion surface. Every value here is
 * synthetic.
 */

import { describe, expect, it } from "vitest";

import { WARNING_CODES, toDate, toISO, toObject, type X12DateValue } from "../src/index.js";
import { validateHl, type X12Hl } from "../src/transactions/shared/hl.js";
import type { X12ParseWarning } from "../src/parser/warnings.js";

const POSITION = Object.freeze({ segmentIndex: 3, transactionIndex: 0 });

/** The 271 map's shape: a subscriber needs a receiver parent, a source is top-level. */
const EXPECTED_PARENT: Readonly<Record<string, string | undefined>> = Object.freeze({
  "20": undefined,
  "21": "20",
  "22": "21",
});

function hl(hlId: string, parentHlId: string | undefined, levelCode: string): X12Hl {
  return Object.freeze({ hlId, parentHlId, levelCode, hasChild: "0" });
}

describe("validateHl", () => {
  const index = new Map<string, X12Hl>([
    ["1", hl("1", undefined, "20")],
    ["2", hl("2", "1", "21")],
  ]);

  it("warns X12_HL_PARENT_MISMATCH once for a level that needs a parent and states none", () => {
    const warnings: X12ParseWarning[] = [];
    validateHl(hl("3", undefined, "22"), index, EXPECTED_PARENT, POSITION, warnings);
    expect(warnings.map((w) => w.code)).toEqual([WARNING_CODES.X12_HL_PARENT_MISMATCH]);
    expect(warnings[0]?.position).toBe(POSITION);
  });

  it("raises nothing for the same level under the parent its map names", () => {
    const warnings: X12ParseWarning[] = [];
    validateHl(hl("3", "2", "22"), index, EXPECTED_PARENT, POSITION, warnings);
    expect(warnings).toEqual([]);
  });
});

describe("the date conversion surface, handed what TypeScript would refuse", () => {
  const day: X12DateValue = { formatQualifier: "D8", value: "20260601" };

  it("answers undefined for an offset given as a numeric string, never coercing it", () => {
    for (const offset of ["0", "-300"]) {
      const options = { assumeOffsetMinutes: offset as unknown as number };
      expect(() => toDate(day, options)).not.toThrow();
      expect(toDate(day, options), offset).toBeUndefined();
    }
    // The same day with the number is an instant, so the string alone is refused.
    expect(toDate(day, { assumeOffsetMinutes: 0 })?.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("answers undefined from all three for a D8 value that is not a string", () => {
    const carrier = { formatQualifier: "D8", value: 20260601 as unknown as string };
    for (const [name, fn] of [
      ["toObject", toObject],
      ["toISO", toISO],
    ] as const) {
      expect(() => fn(carrier), name).not.toThrow();
      expect(fn(carrier), name).toBeUndefined();
    }
    expect(toDate(carrier, { assumeOffsetMinutes: 0 })).toBeUndefined();
  });

  it("answers undefined from all three for a D8 carrier with no value", () => {
    const carrier: X12DateValue = { formatQualifier: "D8" };
    expect(toObject(carrier)).toBeUndefined();
    expect(toISO(carrier)).toBeUndefined();
    expect(toDate(carrier, { assumeOffsetMinutes: 0 })).toBeUndefined();
  });
});

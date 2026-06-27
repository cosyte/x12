/**
 * Unit tests for `X12Decimal` — the Phase 4 string-backed decimal type.
 * Covers:
 *
 * - Parsing valid and invalid lexical forms (incl. empty → undefined).
 * - Round-trip preservation via `toString()` from `fromString`.
 * - Canonical rendering from `fromBigInt` (incl. zero-padding at scale).
 * - Mathematical arithmetic correctness (add / subtract across scales).
 * - Cross-scale equality (`"0.00"` equals `"0"`).
 * - Sign handling (`signum`, `isZero`, `abs`, `negate`).
 * - Three-way compare across scales.
 * - Lossy `toNumber()` (truthy / reasonable values only — no precision claim).
 */

import { describe, expect, it } from "vitest";

import { X12Decimal } from "../src/index.js";

/** Test helper: assert `fromString` succeeded; throw a clear error otherwise. */
function decimal(raw: string): X12Decimal {
  const d = X12Decimal.fromString(raw);
  if (d === undefined)
    throw new Error(`X12Decimal.fromString(${JSON.stringify(raw)}) returned undefined`);
  return d;
}

describe("X12Decimal.fromString — parsing", () => {
  it.each([
    ["1234.56", "1234.56"],
    ["-1234.56", "-1234.56"],
    ["0", "0"],
    ["0.00", "0.00"],
    ["-0.00", "-0.00"],
    [".50", ".50"],
    ["1234", "1234"],
    ["1234.", "1234."],
    ["+50", "+50"],
  ])("accepts %j and preserves the lexical form on toString", (input, expected) => {
    expect(decimal(input).toString()).toBe(expected);
  });

  it.each(["", "1,234.56", "1e6", "1.2.3", "abc", " 50", "50 ", "10/20", ".", "-", "+", "+."])(
    "rejects %j (returns undefined)",
    (input) => {
      expect(X12Decimal.fromString(input)).toBeUndefined();
    },
  );
});

describe("X12Decimal — signum / isZero / abs / negate", () => {
  it("treats every zero (any scale, any sign) as signum 0", () => {
    expect(decimal("0").signum()).toBe(0);
    expect(decimal("0.00").signum()).toBe(0);
    expect(decimal("-0.00").signum()).toBe(0);
    expect(X12Decimal.ZERO.signum()).toBe(0);
  });

  it("reports signum 1 for positive, -1 for negative", () => {
    expect(decimal("0.01").signum()).toBe(1);
    expect(decimal("-0.01").signum()).toBe(-1);
    expect(decimal("50.00").signum()).toBe(1);
    expect(decimal("-50.00").signum()).toBe(-1);
  });

  it("isZero matches signum 0 for every zero variant", () => {
    expect(decimal("0").isZero()).toBe(true);
    expect(decimal("0.00").isZero()).toBe(true);
    expect(decimal("0.01").isZero()).toBe(false);
  });

  it("abs drops the leading - and returns the magnitude at the same scale", () => {
    expect(decimal("-50.00").abs().toString()).toBe("50.00");
    expect(decimal("50.00").abs().toString()).toBe("50.00");
    expect(decimal("-50.00").abs()).not.toBe(decimal("-50.00"));
  });

  it("negate flips sign for non-zero; zero is its own negation", () => {
    expect(decimal("50.00").negate().toString()).toBe("-50.00");
    expect(decimal("-50.00").negate().toString()).toBe("50.00");
    const zero = X12Decimal.ZERO;
    expect(zero.negate()).toBe(zero);
  });
});

describe("X12Decimal — add / subtract", () => {
  it("adds two same-scale values exactly", () => {
    expect(decimal("450.00").add(decimal("50.00")).toString()).toBe("500.00");
  });

  it("adds the canonical 0.1 + 0.2 to 0.3 exactly (never 0.30000000000000004)", () => {
    expect(decimal("0.1").add(decimal("0.2")).toString()).toBe("0.3");
  });

  it("aligns scales — adding 100 and 0.50 yields 100.50 at the higher scale", () => {
    expect(decimal("100").add(decimal("0.50")).toString()).toBe("100.50");
  });

  it("subtracts two same-scale values exactly", () => {
    expect(decimal("500.00").subtract(decimal("50")).toString()).toBe("450.00");
  });

  it("subtracts to negative when right > left", () => {
    expect(decimal("10.00").subtract(decimal("25.50")).toString()).toBe("-15.50");
  });

  it("subtract preserves the higher scale", () => {
    expect(decimal("100").subtract(decimal("0.50")).toString()).toBe("99.50");
  });
});

describe("X12Decimal — equals / compareTo across scales", () => {
  it("equates 0 / 0.00 / -0.00 mathematically (true) while toString differs", () => {
    const a = decimal("0");
    const b = decimal("0.00");
    const c = decimal("-0.00");
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(true);
    expect(b.toString()).not.toBe(a.toString());
  });

  it("equates 50 to 50.00 (cross-scale, math equality)", () => {
    expect(decimal("50").equals(decimal("50.00"))).toBe(true);
  });

  it("compareTo gives -1 / 0 / 1 across scales and signs", () => {
    const a = decimal("10");
    const b = decimal("9.99");
    const c = decimal("10.0");
    const neg = decimal("-1");
    expect(a.compareTo(b)).toBe(1);
    expect(b.compareTo(a)).toBe(-1);
    expect(a.compareTo(c)).toBe(0);
    expect(neg.compareTo(a)).toBe(-1);
    expect(a.compareTo(neg)).toBe(1);
    expect(X12Decimal.ZERO.compareTo(X12Decimal.ZERO)).toBe(0);
  });
});

describe("X12Decimal.fromBigInt — canonical rendering", () => {
  it.each([
    [123456n, 2, "1234.56"],
    [-50n, 0, "-50"],
    [0n, 2, "0.00"],
    [5n, 2, "0.05"],
    [50n, 1, "5.0"],
    [0n, 0, "0"],
  ])("renders BigInt %s at scale %s as %j", (value, scale, expected) => {
    expect(X12Decimal.fromBigInt(value, scale).toString()).toBe(expected);
  });

  it("rejects a negative scale", () => {
    expect(() => X12Decimal.fromBigInt(1n, -1)).toThrow(RangeError);
  });

  it("rejects a non-integer scale", () => {
    expect(() => X12Decimal.fromBigInt(1n, 1.5)).toThrow(RangeError);
  });
});

describe("X12Decimal.toNumber — lossy conversion", () => {
  it("returns a JS number close to the underlying value", () => {
    expect(decimal("1234.56").toNumber()).toBeCloseTo(1234.56);
    expect(decimal("-50.00").toNumber()).toBeCloseTo(-50);
    expect(decimal("0").toNumber()).toBe(0);
  });
});

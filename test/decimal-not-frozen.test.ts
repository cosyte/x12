/**
 * An `X12Decimal` is not frozen, and its value still cannot change.
 *
 * Instances used to be frozen at construction. The value lives in read-only private fields that
 * nothing outside the class reaches, so the freeze guarded no value a caller reads, and it was
 * about two fifths of every construction, which a typed reader does for every amount it reads.
 * What a caller can see now: `Object.isFrozen` answers `false`, and a property added to an
 * instance stays on that object (and so shows in `Object.keys` and `JSON.stringify` of it).
 * Neither touches the value.
 */

import { describe, expect, it } from "vitest";

import { X12Decimal, get835, parseX12 } from "../src/index.js";
import { remit835Text } from "../bench/corpus.mjs";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`not a decimal: ${value}`);
  return d;
}

describe("X12Decimal instances", () => {
  it("are not frozen and have no own properties", () => {
    for (const d of [
      dec("12.50"),
      X12Decimal.ZERO,
      dec("1").add(dec("2")),
      dec("-0.10").negate(),
    ]) {
      expect(Object.isFrozen(d)).toBe(false);
      expect(Object.getOwnPropertyNames(d)).toEqual([]);
      expect(Object.getOwnPropertySymbols(d)).toEqual([]);
    }
  });

  it("keep their value when a caller adds a property", () => {
    const d = dec("12.50");
    const other = dec("12.50");
    expect(Reflect.set(d, "x", 1)).toBe(true);
    expect((d as unknown as Record<string, unknown>)["x"]).toBe(1);
    expect(d.toString()).toBe("12.50");
    expect(d.equals(other)).toBe(true);
    expect(d.compareTo(other)).toBe(0);
    expect(d.add(other).toString()).toBe("25.00");
    // The added property is the caller's own, and shows where an own property does.
    expect(JSON.stringify(d)).toBe('{"x":1}');
    expect(JSON.stringify(other)).toBe("{}");
  });

  it("keep their value against an attempt to replace a method or the prototype's", () => {
    const d = dec("3.10");
    expect(Reflect.set(d, "toString", () => "9")).toBe(true);
    expect(X12Decimal.prototype.toString.call(d)).toBe("3.10");
    expect(d.add(X12Decimal.ZERO).toString()).toBe("3.10");
  });

  it("are what a typed reader returns", () => {
    const ix = parseX12(remit835Text(0, 2));
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no transaction set");
    const remit = get835(ix.delimiters, tx);
    if (remit === undefined) throw new Error("no remittance");
    const paid = remit.claims[0]?.totalPaymentAmount;
    expect(paid).toBeInstanceOf(X12Decimal);
    expect(Object.isFrozen(paid)).toBe(false);
    expect(Object.isFrozen(remit.claims)).toBe(true);
  });
});

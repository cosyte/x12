/**
 * Property tests for `X12Decimal` — Phase 4. Locks the arithmetic
 * invariants that make this type safe for 835 balance checks:
 *
 * - Round-trip: `fromString(s).toString() === s` for every spec-shaped
 *   lexical form.
 * - Additive identity: `x + 0 === x` and `0 + x === x` (math equality).
 * - Commutative add: `a + b === b + a`.
 * - Subtraction-by-addition: `(a + b) - b === a` (math equality, scale
 *   may differ).
 * - Negation involution: `negate(negate(x)) === x` (math equality).
 * - Sign consistency: `abs(x).signum() ∈ {0, 1}`; `signum(negate(x))
 *   === -signum(x)` for non-zero.
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { X12Decimal } from "../../src/index.js";

const X12_DECIMAL_LEXICAL_RE = /^([+-])?(\d*)(?:\.(\d*))?$/u;

/**
 * Generate a spec-shaped X12 R-type decimal string that the parser will
 * accept. Combines an optional sign, an integer body (0–10 digits), and
 * an optional fractional body (0–6 digits). Excludes strings that lack
 * any digit (covered by negative-case tests elsewhere).
 */
const arbitraryDecimalString: fc.Arbitrary<string> = fc
  .record({
    sign: fc.constantFrom("", "-", "+"),
    intPart: fc.stringMatching(/^\d{0,10}$/u),
    hasDot: fc.boolean(),
    fracPart: fc.stringMatching(/^\d{0,6}$/u),
  })
  .map(({ sign, intPart, hasDot, fracPart }) => {
    const body = hasDot ? intPart + "." + fracPart : intPart;
    return body.length === 0 || body === "." ? "0" : sign + body;
  })
  .filter((s) => X12_DECIMAL_LEXICAL_RE.test(s) && /\d/u.test(s));

const arbitraryX12Decimal: fc.Arbitrary<X12Decimal> = arbitraryDecimalString.map((s) => {
  const d = X12Decimal.fromString(s);
  if (d === undefined) throw new Error(`arbitrary produced invalid decimal: ${s}`);
  return d;
});

describe("X12Decimal — round-trip lexical preservation", () => {
  it("fromString(s).toString() === s for every spec-shaped decimal", () => {
    fc.assert(
      fc.property(arbitraryDecimalString, (s) => {
        const d = X12Decimal.fromString(s);
        if (d === undefined) return;
        expect(d.toString()).toBe(s);
      }),
      { numRuns: 500 },
    );
  });
});

describe("X12Decimal — additive structure", () => {
  it("0 is the additive identity (math equality)", () => {
    fc.assert(
      fc.property(arbitraryX12Decimal, (x) => {
        expect(x.add(X12Decimal.ZERO).equals(x)).toBe(true);
        expect(X12Decimal.ZERO.add(x).equals(x)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("addition is commutative (math equality)", () => {
    fc.assert(
      fc.property(arbitraryX12Decimal, arbitraryX12Decimal, (a, b) => {
        expect(a.add(b).equals(b.add(a))).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("(a + b) - b === a (math equality, scales may differ)", () => {
    fc.assert(
      fc.property(arbitraryX12Decimal, arbitraryX12Decimal, (a, b) => {
        expect(a.add(b).subtract(b).equals(a)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

describe("X12Decimal — sign + negation", () => {
  it("negate(negate(x)) === x (math equality)", () => {
    fc.assert(
      fc.property(arbitraryX12Decimal, (x) => {
        expect(x.negate().negate().equals(x)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("abs(x).signum() is 0 or 1; abs(x) >= 0", () => {
    fc.assert(
      fc.property(arbitraryX12Decimal, (x) => {
        const absSig = x.abs().signum();
        expect(absSig === 0 || absSig === 1).toBe(true);
        expect(x.abs().compareTo(X12Decimal.ZERO) >= 0).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("signum(negate(x)) === -signum(x) for non-zero x", () => {
    fc.assert(
      fc.property(arbitraryX12Decimal, (x) => {
        if (x.isZero()) return;
        expect(x.negate().signum()).toBe(x.signum() === 1 ? -1 : 1);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * `X12Decimal` — the string-backed decimal type for every X12 monetary,
 * quantity, or percentage field. **NEVER `parseFloat`** — float
 * representation silently destroys cents at scale (`0.1 + 0.2 !== 0.3`); on
 * an 835 claim, a dropped decimal is the wrong dollar amount in someone's
 * cash post. `X12Decimal` preserves the inbound lexical form verbatim for
 * byte-exact round-trip and exposes exact `BigInt`-backed arithmetic for
 * balance invariants (Phase 4 acceptance: CLP-04 + CLP-05 + ΣCAS = CLP-03;
 * ΣSVC paid + ΣCAS = CLP-04; Σclaim CLP-04 + PLB = BPR-02).
 *
 * Internal representation:
 *
 * - `raw` — the verbatim inbound text (e.g. `"1234.56"`, `"-50"`, `"0.00"`).
 *   `toString()` returns this so a parse → serialize round-trip is byte-
 *   exact.
 * - `scaled` — unsigned `BigInt` of the digits with the decimal point
 *   removed (e.g. `123456n` for `"1234.56"`). Combined with `scale` and
 *   `signum` this fully captures the numeric value.
 * - `scale` — count of fractional digits (the position of the decimal
 *   point, from the right). `"1234.56"` → 2; `"-50"` → 0; `"0.00"` → 2.
 * - `signum` — `-1` / `0` / `1`; `0` for any zero value regardless of sign
 *   in the inbound text (so `"0.00"`, `"-0.00"`, and `"0"` all expose
 *   `signum() === 0`).
 *
 * Arithmetic aligns scales by padding the lower-scale operand with zeros,
 * then performs `BigInt` add/subtract; the result's `scale` is `max(scaleA,
 * scaleB)` and its `raw` is reconstructed from the resulting scaled magnitude
 * (arithmetic results lose the inbound lexical form by design — only direct
 * `fromString` preserves it).
 *
 * X12 R-type (real) elements use an EXPLICIT decimal point (per ASC X12
 * dictionary). Empty string → `undefined` (not zero) — "not supplied" and
 * "zero dollars" are spec-distinct.
 */

/**
 * Validated lexical shape for an X12 R-type decimal. Permits optional
 * leading sign (`-` or `+`); the integer part is optional (the X12
 * standard allows the leading zero to be omitted, so `".50"` is valid);
 * the fractional part is optional. After matching we require **at least
 * one digit** across the integer + fractional groups so a bare `"."` or
 * `"-"` does not parse. Rejects multiple decimal points, embedded
 * whitespace, thousands separators (X12 forbids `,` thousand-separators),
 * and exponent notation.
 * @internal
 */
const X12_DECIMAL_RE = /^([+-])?(\d*)(?:\.(\d*))?$/u;

/**
 * Internal frozen state for an `X12Decimal`. Held in a `WeakMap` keyed off
 * the instance so the public surface exposes only methods (no readable
 * `#raw` field that downstream tooling might over-trust without going
 * through `toString()`). Mirrors hl7's `Hl7Message` private-state pattern.
 * @internal
 */
interface DecimalState {
  readonly raw: string;
  readonly scaled: bigint;
  readonly scale: number;
  readonly signum: -1 | 0 | 1;
}

/** @internal */
const STATE = new WeakMap<X12Decimal, DecimalState>();

/**
 * String-backed decimal for X12 R-type elements. Immutable; arithmetic
 * returns a new {@link X12Decimal}. Equality is mathematical (`"0.00"`
 * equals `"0"`), not lexical — use `toString()` for byte-exact comparison.
 *
 * @example
 * ```ts
 * import { X12Decimal } from "@cosyte/x12";
 * const charge = X12Decimal.fromString("500.00");
 * const paid   = X12Decimal.fromString("450.00");
 * const due    = charge?.subtract(paid!);
 * due?.toString();  // "50.00"
 * due?.isZero();    // false
 * ```
 */
export class X12Decimal {
  /**
   * Construct a new `X12Decimal` directly from state. Internal — call
   * `fromString` / `fromBigInt` / `ZERO` instead from outside the module.
   * @internal
   */
  private constructor(state: DecimalState) {
    STATE.set(this, state);
    Object.freeze(this);
  }

  /**
   * Decode an X12 R-type decimal element into an `X12Decimal`, or
   * `undefined` when the input is empty or does not match the shape
   * `[+-]?digits(.digits?)?`. **Empty string returns `undefined`, never
   * zero** — "not supplied" and "zero" are spec-distinct.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("1234.56")?.toString(); // "1234.56"
   * X12Decimal.fromString("-50")?.signum();       // -1
   * X12Decimal.fromString("");                    // undefined
   * X12Decimal.fromString("1,234.56");            // undefined (X12 forbids thousands sep)
   * ```
   */
  public static fromString(raw: string): X12Decimal | undefined {
    if (raw.length === 0) return undefined;
    const m = X12_DECIMAL_RE.exec(raw);
    if (m === null) return undefined;
    const signChar = m[1];
    const intPart = m[2] ?? "";
    const fracPart = m[3] ?? "";
    // Require at least one digit across the integer + fractional groups
    // — `"."`, `"-"`, `"+"`, `"+."` are not valid decimals.
    if (intPart.length === 0 && fracPart.length === 0) return undefined;
    const scale = fracPart.length;
    const digits = intPart + fracPart;
    const magnitude = digits.length === 0 ? 0n : BigInt(digits);
    const signum: -1 | 0 | 1 = magnitude === 0n ? 0 : signChar === "-" ? -1 : 1;
    return new X12Decimal({ raw, scaled: magnitude, scale, signum });
  }

  /**
   * Construct an `X12Decimal` from a `BigInt` magnitude + scale (decimal
   * places). Useful when arithmetic produces a result whose lexical form
   * the caller wants to control. `raw` is rendered canonically (sign +
   * integer + optional `.fraction`).
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromBigInt(123456n, 2).toString();  // "1234.56"
   * X12Decimal.fromBigInt(-50n, 0).toString();     // "-50"
   * X12Decimal.fromBigInt(0n, 2).toString();       // "0.00"
   * ```
   */
  public static fromBigInt(value: bigint, scale: number): X12Decimal {
    if (!Number.isInteger(scale) || scale < 0) {
      throw new RangeError(
        `X12Decimal scale must be a non-negative integer; got ${String(scale)}.`,
      );
    }
    const signum: -1 | 0 | 1 = value === 0n ? 0 : value < 0n ? -1 : 1;
    const magnitude = value < 0n ? -value : value;
    const raw = renderCanonical(signum, magnitude, scale);
    return new X12Decimal({ raw, scaled: magnitude, scale, signum });
  }

  /**
   * Canonical zero with `scale: 0` — `"0"`. Used as the additive identity
   * for balance reductions. Use `X12Decimal.fromBigInt(0n, n)` for a zero
   * at a specific scale.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.ZERO.toString();      // "0"
   * X12Decimal.ZERO.isZero();        // true
   * ```
   */
  public static readonly ZERO: X12Decimal = new X12Decimal({
    raw: "0",
    scaled: 0n,
    scale: 0,
    signum: 0,
  });

  /**
   * Return the verbatim lexical form (for {@link X12Decimal.fromString})
   * or the canonical rendering (for arithmetic results / `fromBigInt`).
   * Round-trip is byte-exact when the value was produced by `fromString`.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("0050.00")?.toString();  // "0050.00" (verbatim)
   * X12Decimal.fromBigInt(5000n, 2).toString();    // "50.00" (canonical)
   * ```
   */
  public toString(): string {
    return state(this).raw;
  }

  /**
   * Lossy conversion to JS `number`. **JSDoc warns:** `number` cannot
   * represent every X12 monetary value exactly (`0.1 + 0.2 !== 0.3`).
   * Helpers return `X12Decimal`, not `number`; use this only for display
   * or when the loss is acceptable. Magnitudes large enough to lose
   * precision (> `Number.MAX_SAFE_INTEGER` after scaling) still convert
   * without throwing — silently lossy.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("1234.56")?.toNumber(); // 1234.56 (typically exact)
   * X12Decimal.fromString("0.1")?.toNumber();     // 0.1 (lossy at higher precision)
   * ```
   */
  public toNumber(): number {
    return parseFloat(state(this).raw);
  }

  /**
   * `-1` / `0` / `1` indicating the sign of the value. Zero values
   * (including `"0.00"` and `"-0.00"`) always return `0`.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("-50")?.signum();   // -1
   * X12Decimal.fromString("0.00")?.signum();  // 0
   * X12Decimal.fromString("0.01")?.signum();  // 1
   * ```
   */
  public signum(): -1 | 0 | 1 {
    return state(this).signum;
  }

  /**
   * True when this value is exactly zero (any scale).
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("0.00")?.isZero();  // true
   * X12Decimal.fromString("-50")?.isZero();   // false
   * ```
   */
  public isZero(): boolean {
    return state(this).signum === 0;
  }

  /**
   * Absolute value. Scale and lexical form may change (canonical rendering
   * drops the leading `-`).
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("-50.00")?.abs().toString();  // "50.00"
   * ```
   */
  public abs(): X12Decimal {
    const s = state(this);
    if (s.signum >= 0) return this;
    return X12Decimal.fromBigInt(s.scaled, s.scale);
  }

  /**
   * Arithmetic negation. `abs() === negate()` for negative values; for
   * positive values flips sign; zero is its own negation.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("50.00")?.negate().toString();   // "-50.00"
   * X12Decimal.fromString("-50.00")?.negate().toString();  // "50.00"
   * ```
   */
  public negate(): X12Decimal {
    const s = state(this);
    if (s.signum === 0) return this;
    return X12Decimal.fromBigInt(s.signum === 1 ? -s.scaled : s.scaled, s.scale);
  }

  /**
   * Add two `X12Decimal` values exactly. Result scale is
   * `max(this.scale, other.scale)`; result lexical form is canonical.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * const a = X12Decimal.fromString("0.1")!;
   * const b = X12Decimal.fromString("0.2")!;
   * a.add(b).toString();  // "0.3" — exact, never 0.30000000000000004
   * ```
   */
  public add(other: X12Decimal): X12Decimal {
    const a = state(this);
    const b = state(other);
    const [aligned, scale] = alignScales(a, b);
    const sum = aligned.aSigned + aligned.bSigned;
    return X12Decimal.fromBigInt(sum, scale);
  }

  /**
   * Subtract `other` from `this` exactly. Result scale is
   * `max(this.scale, other.scale)`.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("500.00")!.subtract(X12Decimal.fromString("50")!).toString();
   * // "450.00"
   * ```
   */
  public subtract(other: X12Decimal): X12Decimal {
    const a = state(this);
    const b = state(other);
    const [aligned, scale] = alignScales(a, b);
    const diff = aligned.aSigned - aligned.bSigned;
    return X12Decimal.fromBigInt(diff, scale);
  }

  /**
   * Mathematical equality across scales (`"0.00"` equals `"0"`). For
   * byte-exact comparison use `a.toString() === b.toString()`.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * const a = X12Decimal.fromString("0.00")!;
   * const b = X12Decimal.fromString("0")!;
   * a.equals(b);                  // true
   * a.toString() === b.toString();// false ("0.00" vs "0")
   * ```
   */
  public equals(other: X12Decimal): boolean {
    return this.compareTo(other) === 0;
  }

  /**
   * Three-way compare: `-1` if `this < other`, `0` if equal, `1` if
   * `this > other`. Mathematical compare across scales.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("10")!.compareTo(X12Decimal.fromString("9.99")!); // 1
   * ```
   */
  public compareTo(other: X12Decimal): -1 | 0 | 1 {
    const a = state(this);
    const b = state(other);
    if (a.signum !== b.signum) return a.signum < b.signum ? -1 : 1;
    if (a.signum === 0) return 0;
    const [aligned] = alignScales(a, b);
    if (aligned.aSigned === aligned.bSigned) return 0;
    return aligned.aSigned < aligned.bSigned ? -1 : 1;
  }
}

/** Pull frozen state from the `WeakMap`. Throws on a tampered instance. @internal */
function state(d: X12Decimal): DecimalState {
  const s = STATE.get(d);
  if (s === undefined) {
    throw new TypeError("X12Decimal instance has no internal state — was it tampered with?");
  }
  return s;
}

/**
 * Align two scales for arithmetic: pad the lower-scale operand with zeros
 * (multiply by `10^delta`) so both become integers at the higher scale,
 * then signed by `signum`. Returns the signed `BigInt` operands + the
 * shared scale. @internal
 */
function alignScales(
  a: DecimalState,
  b: DecimalState,
): [{ aSigned: bigint; bSigned: bigint }, number] {
  const scale = Math.max(a.scale, b.scale);
  const aPad = scale - a.scale;
  const bPad = scale - b.scale;
  const aScaled = a.scaled * powTen(aPad);
  const bScaled = b.scaled * powTen(bPad);
  const aSigned = a.signum === -1 ? -aScaled : aScaled;
  const bSigned = b.signum === -1 ? -bScaled : bScaled;
  return [{ aSigned, bSigned }, scale];
}

/** `10n ** BigInt(n)` for non-negative `n`. @internal */
function powTen(n: number): bigint {
  let p = 1n;
  for (let i = 0; i < n; i += 1) p *= 10n;
  return p;
}

/**
 * Render a `(signum, unsigned scaled, scale)` triple into the canonical
 * decimal text — sign + integer part + optional `.` + zero-padded fraction.
 * Always renders the full fractional width so `(0n, 2)` → `"0.00"` (the
 * canonical X12 R-type "zero dollars at cent precision" shape).
 * @internal
 */
function renderCanonical(signum: -1 | 0 | 1, magnitude: bigint, scale: number): string {
  const digits = magnitude.toString();
  let body: string;
  if (scale === 0) {
    body = digits;
  } else if (digits.length <= scale) {
    body = "0." + digits.padStart(scale, "0");
  } else {
    const cut = digits.length - scale;
    body = digits.slice(0, cut) + "." + digits.slice(cut);
  }
  return signum === -1 ? "-" + body : body;
}

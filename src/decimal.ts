/**
 * `X12Decimal` - the string-backed decimal type for every X12 monetary,
 * quantity, or percentage field. **NEVER `parseFloat`** - float
 * representation silently destroys cents at scale (`0.1 + 0.2 !== 0.3`); on
 * an 835 claim, a dropped decimal is the wrong dollar amount in someone's
 * cash post. `X12Decimal` preserves the inbound lexical form verbatim for
 * byte-exact round-trip and exposes exact `BigInt`-backed arithmetic for
 * the 835 balance invariants (`SVC-02 == SVC-03 + Σ(line CAS)`;
 * `CLP-03 == CLP-04 + Σ(claim CAS + line CAS)`;
 * `BPR-02 == Σ(CLP-04) - Σ(PLB amounts)`, each PLB amount in its raw EDI sign).
 *
 * Internal representation:
 *
 * - `raw` - the verbatim inbound text (e.g. `"1234.56"`, `"-50"`, `"0.00"`).
 *   `toString()` returns this so a parse → serialize round-trip is byte-
 *   exact.
 * - `scaled` - unsigned `BigInt` of the digits with the decimal point
 *   removed (e.g. `123456n` for `"1234.56"`). Combined with `scale` and
 *   `signum` this fully captures the numeric value.
 * - `scale` - count of fractional digits (the position of the decimal
 *   point, from the right). `"1234.56"` → 2; `"-50"` → 0; `"0.00"` → 2.
 * - `signum` - `-1` / `0` / `1`; `0` for any zero value regardless of sign
 *   in the inbound text (so `"0.00"`, `"-0.00"`, and `"0"` all expose
 *   `signum() === 0`).
 *
 * Arithmetic aligns scales by padding the lower-scale operand with zeros,
 * then performs `BigInt` add/subtract; the result's `scale` is `max(scaleA,
 * scaleB)` and its `raw` is reconstructed from the resulting scaled magnitude
 * (arithmetic results lose the inbound lexical form by design - only direct
 * `fromString` preserves it).
 *
 * X12 R-type (real) elements use an EXPLICIT decimal point (per ASC X12
 * dictionary). Empty string → `undefined` (not zero) - "not supplied" and
 * "zero dollars" are spec-distinct.
 */

/**
 * The validated lexical shape for an X12 R-type decimal is
 * `[+-]?digits*(.digits*)?`: an optional leading sign (`-` or `+`); the
 * integer part is optional (the X12 standard allows the leading zero to be
 * omitted, so `".50"` is valid); the fractional part is optional. At least one
 * digit is required across the integer and fractional parts, so a bare `"."`
 * or `"-"` does not parse. Multiple decimal points, embedded whitespace,
 * thousands separators (X12 forbids `,` thousand-separators) and exponent
 * notation are rejected. A digit is an ASCII `0` to `9`. `fromString` reads the
 * shape with a scan rather than a regular expression, so a read allocates only
 * the digits it keeps.
 *
 * The state of an `X12Decimal` is four private class fields: `raw` (the
 * verbatim or canonical text), `scaled` (the unsigned digits with the decimal
 * point removed), `scale` (the count of fractional digits) and `signum`. The
 * public surface exposes only methods (no readable `raw` field that downstream
 * tooling might over-trust without going through `toString()`), and an object
 * that is not an `X12Decimal` built by this class has none of them. Mirrors
 * hl7's `Hl7Message` private-state pattern.
 *
 * The state used to live in a module `WeakMap` keyed off the instance, which
 * cost an ephemeron entry and a state record for every decimal read: reading a
 * large remittance spent more time there than anywhere else. Private fields
 * keep the guarantees: nothing outside the class reads or replaces them, a
 * forged instance (`Object.create(X12Decimal.prototype)`) throws the same
 * `TypeError` it did, and every instance is frozen with no own properties.
 */

/**
 * The shape above as a regular expression, which {@link X12Decimal.fromString}
 * still applies to a value that is not a string. @internal
 */
const X12_DECIMAL_RE = /^([+-])?(\d*)(?:\.(\d*))?$/u;

/**
 * The body `sumDecimals` runs, set by the class's static block (declared here,
 * before the class, so the block can assign it). @internal
 */
let sumBody: (terms: readonly (X12Decimal | undefined)[]) => X12Decimal | undefined;

/** The message every method throws for an object that is not an `X12Decimal`. @internal */
const TAMPERED = "X12Decimal instance has no internal state - was it tampered with?";

/** Whether `code` is an ASCII digit. @internal */
function isDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39;
}

/**
 * String-backed decimal for X12 R-type elements. Immutable; arithmetic
 * returns a new {@link X12Decimal}. Equality is mathematical (`"0.00"`
 * equals `"0"`), not lexical - use `toString()` for byte-exact comparison.
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
   * Construct a new `X12Decimal` directly from state. Internal - call
   * `fromString` / `fromBigInt` / `ZERO` instead from outside the module.
   * @internal
   */
  private constructor(raw: string, scaled: bigint, scale: number, signum: -1 | 0 | 1) {
    this.#raw = raw;
    this.#scaled = scaled;
    this.#scale = scale;
    this.#signum = signum;
    Object.freeze(this);
  }

  /** The verbatim or canonical text. @internal */
  readonly #raw: string;
  /** The unsigned digits with the decimal point removed. @internal */
  readonly #scaled: bigint;
  /** The count of fractional digits. @internal */
  readonly #scale: number;
  /** `-1`, `0` or `1`; `0` for every zero. @internal */
  readonly #signum: -1 | 0 | 1;

  /**
   * `d` itself, once it is known to be an `X12Decimal` this class built.
   * Throws `TypeError` for anything else: an object made with
   * `Object.create(X12Decimal.prototype)`, or a value a JavaScript caller
   * passed where a decimal belongs.
   * @internal
   */
  static #checked(d: X12Decimal): X12Decimal {
    if (typeof d !== "object" || d === null || !(#raw in d)) throw new TypeError(TAMPERED);
    return d;
  }

  /**
   * Decode an X12 R-type decimal element into an `X12Decimal`, or
   * `undefined` when the input is empty or does not match the shape
   * `[+-]?digits(.digits?)?`. **Empty string returns `undefined`, never
   * zero** - "not supplied" and "zero" are spec-distinct.
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
    const length = raw.length;
    if (length === 0) return undefined;
    // A JavaScript caller is not held to the `string` type. What a non-string
    // reads as is decided by the regular expression this scan replaced, so it
    // still decides it, unchanged.
    if (typeof raw !== "string") return X12Decimal.#fromNonString(raw);
    let i = 0;
    const first = raw.charCodeAt(0);
    const negative = first === 0x2d;
    if (negative || first === 0x2b) i = 1;
    const intStart = i;
    while (i < length && isDigit(raw.charCodeAt(i))) i += 1;
    const intEnd = i;
    let fracStart = i;
    if (i < length && raw.charCodeAt(i) === 0x2e) {
      i += 1;
      fracStart = i;
      while (i < length && isDigit(raw.charCodeAt(i))) i += 1;
    }
    // Anything left is outside the shape: a second point, a space, a comma.
    if (i !== length) return undefined;
    const scale = length - fracStart;
    // Require at least one digit across the integer + fractional groups
    // - `"."`, `"-"`, `"+"`, `"+."` are not valid decimals.
    if (intEnd === intStart && scale === 0) return undefined;
    const digits =
      scale === 0
        ? raw.slice(intStart, intEnd)
        : raw.slice(intStart, intEnd) + raw.slice(fracStart, length);
    const magnitude = BigInt(digits);
    const signum: -1 | 0 | 1 = magnitude === 0n ? 0 : negative ? -1 : 1;
    return new X12Decimal(raw, magnitude, scale, signum);
  }

  /**
   * {@link X12Decimal.fromString} of a value that is not a string, as it has
   * always read one: `RegExp.prototype.exec` converts it to text, and the
   * instance keeps the value itself as its `raw`.
   * @internal
   */
  static #fromNonString(raw: string): X12Decimal | undefined {
    const m = X12_DECIMAL_RE.exec(raw);
    if (m === null) return undefined;
    /* v8 ignore next -- `(\d*)` always participates in the match, so group 2 is never undefined */
    const intPart = m[2] ?? "";
    const fracPart = m[3] ?? "";
    if (intPart.length === 0 && fracPart.length === 0) return undefined;
    const magnitude = BigInt(intPart + fracPart);
    const signum: -1 | 0 | 1 = magnitude === 0n ? 0 : m[1] === "-" ? -1 : 1;
    return new X12Decimal(raw, magnitude, fracPart.length, signum);
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
    return new X12Decimal(raw, magnitude, scale, signum);
  }

  /**
   * Canonical zero with `scale: 0` - `"0"`. Used as the additive identity
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
  public static readonly ZERO: X12Decimal = new X12Decimal("0", 0n, 0, 0);

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
    return X12Decimal.#checked(this).#raw;
  }

  /**
   * Lossy conversion to JS `number`. **JSDoc warns:** `number` cannot
   * represent every X12 monetary value exactly (`0.1 + 0.2 !== 0.3`).
   * Helpers return `X12Decimal`, not `number`; use this only for display
   * or when the loss is acceptable. Magnitudes large enough to lose
   * precision (> `Number.MAX_SAFE_INTEGER` after scaling) still convert
   * without throwing - silently lossy.
   *
   * @example
   * ```ts
   * import { X12Decimal } from "@cosyte/x12";
   * X12Decimal.fromString("1234.56")?.toNumber(); // 1234.56 (typically exact)
   * X12Decimal.fromString("0.1")?.toNumber();     // 0.1 (lossy at higher precision)
   * ```
   */
  public toNumber(): number {
    return parseFloat(X12Decimal.#checked(this).#raw);
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
    return X12Decimal.#checked(this).#signum;
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
    return X12Decimal.#checked(this).#signum === 0;
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
    const s = X12Decimal.#checked(this);
    if (s.#signum >= 0) return this;
    return X12Decimal.fromBigInt(s.#scaled, s.#scale);
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
    const s = X12Decimal.#checked(this);
    if (s.#signum === 0) return this;
    return X12Decimal.fromBigInt(s.#signum === 1 ? -s.#scaled : s.#scaled, s.#scale);
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
   * a.add(b).toString();  // "0.3" - exact, never 0.30000000000000004
   * ```
   */
  public add(other: X12Decimal): X12Decimal {
    const a = X12Decimal.#checked(this);
    const b = X12Decimal.#checked(other);
    const scale = Math.max(a.#scale, b.#scale);
    return X12Decimal.fromBigInt(
      X12Decimal.#signedAt(a, scale) + X12Decimal.#signedAt(b, scale),
      scale,
    );
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
    const a = X12Decimal.#checked(this);
    const b = X12Decimal.#checked(other);
    const scale = Math.max(a.#scale, b.#scale);
    return X12Decimal.fromBigInt(
      X12Decimal.#signedAt(a, scale) - X12Decimal.#signedAt(b, scale),
      scale,
    );
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
    const a = X12Decimal.#checked(this);
    const b = X12Decimal.#checked(other);
    if (a.#signum !== b.#signum) return a.#signum < b.#signum ? -1 : 1;
    if (a.#signum === 0) return 0;
    const scale = Math.max(a.#scale, b.#scale);
    const aSigned = X12Decimal.#signedAt(a, scale);
    const bSigned = X12Decimal.#signedAt(b, scale);
    if (aSigned === bSigned) return 0;
    return aSigned < bSigned ? -1 : 1;
  }

  /**
   * The signed value of `d` as an integer at `scale` (no smaller than its
   * own): the lower-scale operand of an operation is padded with zeros
   * (multiplied by `10^delta`) so both become integers at the higher scale,
   * then signed by `signum`. A value already at `scale` is not multiplied.
   * @internal
   */
  static #signedAt(d: X12Decimal, scale: number): bigint {
    const pad = scale - d.#scale;
    const magnitude = pad === 0 ? d.#scaled : d.#scaled * powTen(pad);
    return d.#signum === -1 ? -magnitude : magnitude;
  }

  static {
    // The body of `sumDecimals`, inside the class so it can read the private
    // fields, and kept off the class itself so it adds nothing to the public
    // surface.
    sumBody = (terms) => {
      if (terms.length === 0) return X12Decimal.ZERO;
      let total = 0n;
      let scale = 0;
      for (let i = 0; i < terms.length; i += 1) {
        const term = terms[i];
        if (term === undefined) return undefined;
        const d = X12Decimal.#checked(term);
        if (d.#scale > scale) {
          total *= powTen(d.#scale - scale);
          scale = d.#scale;
        }
        total += X12Decimal.#signedAt(d, scale);
      }
      return X12Decimal.fromBigInt(total, scale);
    };
  }
}

/**
 * `terms` added in order, starting from `X12Decimal.ZERO`, or `undefined` the
 * moment one of them is `undefined`: exactly
 * `terms.reduce((acc, t) => acc.add(t), X12Decimal.ZERO)` with that early
 * return, the same value, scale and text and the same `TypeError` for a term
 * that is not an `X12Decimal`, but without a new instance and a rendered text
 * for every partial sum. An empty list answers `X12Decimal.ZERO` itself.
 *
 * Not exported from the package: the balance checks are its only caller.
 * @internal
 */
export function sumDecimals(terms: readonly (X12Decimal | undefined)[]): X12Decimal | undefined {
  return sumBody(terms);
}

/** `10n ** BigInt(n)` for non-negative `n`. @internal */
function powTen(n: number): bigint {
  let p = 1n;
  for (let i = 0; i < n; i += 1) p *= 10n;
  return p;
}

/**
 * Render a `(signum, unsigned scaled, scale)` triple into the canonical
 * decimal text - sign + integer part + optional `.` + zero-padded fraction.
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

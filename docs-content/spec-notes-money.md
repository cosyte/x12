---
id: spec-notes-money
title: Decimal-exact money
sidebar_label: Decimal-exact money
sidebar_position: 4
---

# Decimal-exact money

Every monetary, percentage, and quantity field in `@cosyte/x12` decodes as an **`X12Decimal`**, never
a JavaScript `number`. This is not a nicety — it is a correctness boundary. An EDI remittance is a
financial instrument; representing `0.10 + 0.20` as a binary float (`0.30000000000000004`) and posting
the difference is the money-handling analog of mis-reading a dose.

> **The rule:** `@cosyte/x12` **never** calls `parseFloat` on an EDI amount, and neither should you.
> Read the `X12Decimal`, do exact arithmetic on it, and format it back to a string.

## What `X12Decimal` is

`X12Decimal` is a string-backed, `BigInt`-exact fixed-point number: it holds the unscaled integer and
a scale, so the value is preserved to the exact number of decimal places the wire carried. It exposes
only methods (the internals are non-enumerable), and construction is total — `fromString` returns
`undefined` for a non-numeric string rather than throwing or silently coercing:

```ts runnable
import { X12Decimal } from "@cosyte/x12";

const a = X12Decimal.fromString("0.10")!;
const b = X12Decimal.fromString("0.20")!;

// Exact — no binary-float drift.
a.add(b).toString(); // => "0.30"

// The verbatim string is preserved, decimal places and all.
X12Decimal.fromString("450.00")!.toString(); // => "450.00"

// A non-numeric input is rejected, not coerced.
X12Decimal.fromString("not a number"); // => undefined
```

## The operations you need

`X12Decimal` covers the arithmetic a posting or balance check requires — all exact, all returning new
immutable instances:

```ts runnable
import { X12Decimal } from "@cosyte/x12";

const charge = X12Decimal.fromString("500.00")!;
const paid = X12Decimal.fromString("450.00")!;

charge.subtract(paid).toString(); // => "50.00"
paid.negate().toString(); // => "-450.00"
charge.equals(paid); // => false
paid.isZero(); // => false
X12Decimal.ZERO.isZero(); // => true

// compareTo returns -1 | 0 | 1
paid.compareTo(charge); // => -1
```

`signum()` gives the sign as `-1 | 0 | 1`, `abs()` the magnitude, and `toNumber()` exists as a
deliberate, lossy escape hatch — use it only for display math you will never post from.

## Why the 835 balance is decimal-exact

The 835 reader runs the TR3 X221A1 §1.10.2 balance invariants entirely in `X12Decimal`, so the check
is exact rather than float-approximate:

- **Service line:** `SVC-03` line paid + Σ(line `CAS` adjustments) = `SVC-02` line charge.
- **Claim:** `CLP-04` claim paid + Σ(**all** `CAS` in the claim — both claim-level and every nested
  line) = `CLP-03` claim charge. Patient responsibility (`CLP-05`) is **not a separate term** in this
  equation — it is informational, and it equals the sum of the `PR`-group `CAS` adjustments, which are
  already inside that Σ. Adding it again would double-count.
- **Remit total:** `BPR-02` = Σ(`CLP-04` claim payments) − Σ(`PLB` provider-level adjustments), where
  `PLB` amounts carry the raw EDI sign (a positive `PLB` is a take-back).

On a mismatch the reader emits `X12_835_REMIT_BALANCE_MISMATCH` and **preserves the inbound values
verbatim** — it never rebalances. The `build835` builder reuses those same authoritative validators
and **refuses** to emit an out-of-balance remit (`Remit835BuildError`), so the read guard and the emit
guard share one source of truth. See [Tolerance tiers](./spec-notes-tolerance) for the warn-never-fix
rule, and the [Cookbook](./cookbook) for the full posting recipe.

## Sign discipline

Amounts carry the sign the wire gave them, and the library never flips it for you. In the 835 top-line
equation a positive `PLB` reduces the payment (a take-back); in an 837 line adjudication the CAS group
codes tell you the direction. Read the sign, don't assume it — the same discipline that keeps the
`groupCode` a value you read rather than infer.

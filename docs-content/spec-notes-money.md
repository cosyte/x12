---
id: spec-notes-money
title: Decimal-exact money
sidebar_label: Decimal-exact money
sidebar_position: 4
---

# Decimal-exact money

Every monetary, percentage, and quantity field in `@cosyte/x12` decodes as an **`X12Decimal`**, never
a JavaScript `number`. This is not a nicety. It is a correctness boundary. An EDI remittance is a
financial instrument; representing `0.10 + 0.20` as a binary float (`0.30000000000000004`) and posting
the difference is the money-handling analog of mis-reading a dose.

> **The rule:** `@cosyte/x12` **never** calls `parseFloat` on an EDI amount, and neither should you.
> Read the `X12Decimal`, do exact arithmetic on it, and format it back to a string.

> **On the BUILD side this is enforced, not just a convention.** The builder specs type their
> monetary and quantity fields as `X12Decimal`, so a TypeScript caller cannot hand them anything
> else. A JavaScript or JSON-driven caller can, and every one of those slots now type-checks before
> emitting: a raw `number` is **refused** rather than rendered. It used to be rendered: `0.1 + 0.2`
> reached an 835's CLP-05 as `0.30000000000000004` with `warnings.length === 0`. Build the
> `X12Decimal` yourself at your boundary; the library will not round for you, because choosing
> between `0.30` and `0.3` is a decision about your money, not ours.
>
> **One caveat on the error you get.** Most slots refuse with that builder's typed, code-tagged
> error. `build835`'s balance-equation amounts do not: the balance guard runs first and calls
> `X12Decimal` methods on your value, so any amount it reads as a term of one of the three TR3
> X221A1 §1.10.2 invariants throws a plain `TypeError` with no `code`: `payment.totalActualPayment`,
> `claim.totalChargeAmount`, `claim.totalPaymentAmount`, every `adjustments[].amount`,
> `serviceLine.chargeAmount`, `serviceLine.paymentAmount` and `providerAdjustments[].amount`. It
> still refuses; it just refuses untyped. Every other `X12Decimal` field refuses typed. See
> `KNOWN-LIMITATIONS.md`.

## What `X12Decimal` is

`X12Decimal` is a string-backed, `BigInt`-exact fixed-point number: it holds the unscaled integer and
a scale, so the value is preserved to the exact number of decimal places the wire carried. It exposes
only methods (the internals are non-enumerable), and construction is total. `fromString` returns
`undefined` for a non-numeric string rather than throwing or silently coercing:

```ts runnable
import { X12Decimal } from "@cosyte/x12";

const a = X12Decimal.fromString("0.10")!;
const b = X12Decimal.fromString("0.20")!;

// Exact: no binary-float drift.
a.add(b).toString(); // => "0.30"

// The verbatim string is preserved, decimal places and all.
X12Decimal.fromString("450.00")!.toString(); // => "450.00"

// A non-numeric input is rejected, not coerced.
X12Decimal.fromString("not a number"); // => undefined
```

## An amount this library cannot read never reads as `0`

`X12Decimal.fromString` returning `undefined` is only half the story: the readers have to put
*something* on the model. Through `0.0.12` every monetary and quantity slot was typed `X12Decimal`,
which cannot express "did not decode", so a claim's `totalPaymentAmount`, a service line's
`chargeAmount` and an 837's `totalCharge` all fell back to `X12Decimal.ZERO`. A consumer reading the
model could not tell that `0` from a zero the sender did state.

**As of `0.0.13` no reader substitutes `X12Decimal.ZERO` for a value it did not decode.** Every slot
that used to get one is `X12Decimal | undefined` and reads `undefined` instead. That is a breaking
type change on the read model, and it is the point of it: the two facts are spec-distinct and now
the model says which one you have. Read it as a rule about the substitution rather than as a census
of the model: a row whose amount does not decode is sometimes dropped whole instead, and no total is
published here.

An element that is present and does not match the shape `X12Decimal` decodes also emits
**`X12_UNPARSEABLE_DECIMAL`**, carrying the failing element in `position.elementIndex`, so the two
routes to `undefined` stay distinguishable:

```ts runnable
import { parseX12, get835, WARNING_CODES } from "@cosyte/x12";

// BPR-02 carries a thousands separator, which X12 forbids in an R-type element.
const raw =
  "ISA*00*          *00*          *ZZ*PAYER          *ZZ*PROVIDER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HP*PAYER*PROVIDER*20260601*1200*1*X*005010X221A1~" +
  "ST*835*0001~" +
  "BPR*I*1,234.56*C*ACH*CCP*01*1*DA*1*1*20260601~" +
  "TRN*1*T1*1~" +
  "SE*4*0001~GE*1*1~IEA*1*000000001~";

const ix = parseX12(raw);
const tx = ix.groups[0]!.transactions[0]!;
const remit = get835(ix.delimiters, tx)!;

// The slot decoded nothing, and says so.
remit.payment.totalActualPayment; // => undefined

// The warning says WHY: the sender put bytes there and they did not decode.
remit.warnings.some((w) => w.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL); // => true
```

Three things to hold onto:

- **`undefined` means "this library decoded no value", not "the sender sent nothing".** Both routes
  land there. Gate on the warning to tell them apart, and gate on `undefined` itself before you post
  an amount, exactly as you would on a balance mismatch.
- **An *absent* element is a different fact and does not warn.** It reads `undefined` with no
  diagnostic. The warning fires only when the sender put bytes there and this library could not read
  them. Read the guarantee in exactly that direction:
  an unwarned value **at an element a reader decoded** is what the sender sent. It is not a promise
  about every slot on the model, because a slot a reader never read cannot warn. The known instance
  of that in this library, an 837 service line whose `SVx` never decoded because it does not match
  the variant the submission resolved to, leaves `charge` and `units` `undefined` and is announced by
  its own warning, **`X12_837_SERVICE_LINE_NOT_DECODED`**, anchored at the `LX` that opened the line.
  No census of never-read slots is published here, on purpose: the rule is what holds.
- **The 835 balance invariants do not sum an absent term.** Where any term of a TR3 X221A1 §1.10.2
  equation is `undefined`, the equation is reported as **`X12_835_BALANCE_NOT_EVALUABLE`** rather
  than as a mismatch: nothing was measured out of balance, and substituting `0` for the missing term
  would be this library asserting a total nobody sent.
- **On an optional slot the same warning disambiguates `undefined`.** A `paidUnitsOfService` of
  `undefined` used to mean either "the payer omitted it" or "the payer sent something unreadable".
  With a warning at that element index, it means the second; without one, the first.

The bytes themselves are never in the message (they are consumer-controlled, and a monetary element
is exactly where a mis-mapped identifier lands). Read them off `tx.segments[…].raw` when you need
them. If you are walking segments yourself rather than using a `get*` reader, `readElementDecimal`
gives you the same distinction in-band, as `{ value, status }` with `status` one of `"decoded"` /
`"absent"` / `"unparseable"`.

## The operations you need

`X12Decimal` covers the arithmetic a posting or balance check requires, all exact, all returning new
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
deliberate, lossy escape hatch. Use it only for display math you will never post from.

## Why the 835 balance is decimal-exact

The 835 reader runs the TR3 X221A1 §1.10.2 balance invariants entirely in `X12Decimal`, so the check
is exact rather than float-approximate:

- **Service line:** `SVC-03` line paid + Σ(line `CAS` adjustments) = `SVC-02` line charge.
- **Claim:** `CLP-04` claim paid + Σ(**all** `CAS` in the claim, both claim-level and every nested
  line) = `CLP-03` claim charge. Patient responsibility (`CLP-05`) is **not a separate term** in this
  equation. It is informational, and it equals the sum of the `PR`-group `CAS` adjustments, which are
  already inside that Σ. Adding it again would double-count.
- **Remit total:** `BPR-02` = Σ(`CLP-04` claim payments) − Σ(`PLB` provider-level adjustments), where
  `PLB` amounts carry the raw EDI sign (a positive `PLB` is a take-back).

On a mismatch the reader emits `X12_835_REMIT_BALANCE_MISMATCH` and **preserves the inbound values
verbatim**. It never rebalances. The `build835` builder reuses those same authoritative validators
and **refuses** to emit an out-of-balance remit (`Remit835BuildError`), so the read guard and the emit
guard share one source of truth. See [Tolerance tiers](./spec-notes-tolerance) for the warn-never-fix
rule, and the [Cookbook](./cookbook) for the full posting recipe.

## Sign discipline

Amounts carry the sign the wire gave them, and the library never flips it for you. In the 835 top-line
equation a positive `PLB` reduces the payment (a take-back); in an 837 line adjudication the CAS group
codes tell you the direction. Read the sign, don't assume it: the same discipline that keeps the
`groupCode` a value you read rather than infer.

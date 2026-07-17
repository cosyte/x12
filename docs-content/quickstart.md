---
id: quickstart
title: Quickstart
sidebar_position: 1
---

# Quickstart

This page gives you a first useful result: read an **835** remittance advice (the electronic EOB) and
pull out the money — the payment header, each claim's charge/paid/patient-responsibility split, and the
CARC adjustment reasons — in a few lines. The 835 is the #1 thing an integration consultant is handed,
so it is the fastest way to see the library earn its keep.

The reader is **lenient** — vendor quirks become stable-coded `warnings`, never silent failures — and
money is decimal-exact throughout (`X12Decimal`, BigInt-backed; **never `parseFloat` an EDI amount**).

> Every interchange below is **synthetic**: fabricated names, obviously-fake IDs, pre-2024 control
> numbers. X12 healthcare data is PHI; a fixture must never hold a real one.

## Parse an 835 and read the money

`parseX12` decodes the interchange; `get835(delimiters, tx)` walks an 835 transaction set into a typed
`X12Remittance` (or returns `undefined` if the transaction set is not an 835).

```ts runnable
import { parseX12, get835 } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*CLINIC001      " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HP*MEDPAY*CLINIC001*20260601*1200*1*X*005010X221A1~" +
  "ST*835*0001~" +
  "BPR*I*450.00*C*ACH*CCP*01*021000021*DA*1234567*1512345678**01*021000021*DA*98765*20260601~" +
  "TRN*1*0012345*1512345678~" +
  "N1*PR*MEDICARE PART A~" +
  "N1*PE*SAMPLE CLINIC INC*XX*1234567890~" +
  "LX*1~" +
  "CLP*PT-ACCT-001*1*500.00*450.00*50.00*MB*CLAIMREF001*11~" +
  "NM1*QC*1*PATIENT*TEST****MI*MEMBER001~" +
  "SVC*HC:99213*500.00*450.00~" +
  "CAS*PR*1*50.00~" +
  "SE*11*0001~GE*1*1~IEA*1*000000001~";

const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
const remit = tx ? get835(ix.delimiters, tx) : undefined;
if (remit === undefined) throw new Error("not an 835");

// Payment header — the money-movement primitive.
remit.payment.totalActualPayment.toString(); // => "450.00"
remit.payment.creditDebitFlag; // => "C"
remit.payment.method; // => "ACH"
remit.traces[0]?.referenceId; // => "0012345"

// Per claim: your account number echoed back, and the charge/paid/responsibility split.
const claim = remit.claims[0];
claim?.patientControlNumber; // => "PT-ACCT-001"
claim?.totalChargeAmount.toString(); // => "500.00"
claim?.totalPaymentAmount.toString(); // => "450.00"
claim?.patientResponsibilityAmount.toString(); // => "50.00"

// Per service line: the CARC adjustment — group code is the safety-critical field.
const line = claim?.serviceLines[0];
line?.productServiceId; // => "99213"
const adj = line?.adjustments[0];
adj?.groupCode; // => "PR"
adj?.reasonCode; // => "1"
adj?.amount.toString(); // => "50.00"
```

The `groupCode` (`PR` = patient responsibility, `CO` = contractual obligation, …) is what tells you
who owes the money — never infer it, read it. The `reasonDescription` on each adjustment is prefilled
from the bundled CARC snapshot when the code is recognized; an unrecognized code is preserved verbatim
and raises `X12_UNKNOWN_CARC` (the value is never dropped).

## Respect the balance warning

The walker runs the TR3 X221A1 §1.10.2 balance invariants and emits `X12_835_REMIT_BALANCE_MISMATCH`
on a mismatch — it **never silently rebalances**. Gate your posting on it:

```ts runnable
import { parseX12, get835, WARNING_CODES } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*CLINIC001      " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HP*MEDPAY*CLINIC001*20260601*1200*1*X*005010X221A1~" +
  "ST*835*0001~" +
  "BPR*I*450.00*C*ACH*CCP*01*021000021*DA*1234567*1512345678**01*021000021*DA*98765*20260601~" +
  "TRN*1*0012345*1512345678~" +
  "N1*PR*MEDICARE PART A~" +
  "N1*PE*SAMPLE CLINIC INC*XX*1234567890~" +
  "LX*1~" +
  "CLP*PT-ACCT-001*1*500.00*450.00*50.00*MB*CLAIMREF001*11~" +
  "NM1*QC*1*PATIENT*TEST****MI*MEMBER001~" +
  "SVC*HC:99213*500.00*450.00~" +
  "CAS*PR*1*50.00~" +
  "SE*11*0001~GE*1*1~IEA*1*000000001~";

const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
const remit = get835(ix.delimiters, tx!)!;

const outOfBalance = remit.warnings.some(
  (w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
);
outOfBalance; // => false

if (outOfBalance) {
  // Do NOT auto-post. Route to a human — the payer's numbers don't add up.
}
```

## Unrecoverable input throws — everything else is a warning

Only four structurally unrecoverable conditions throw a typed `X12ParseError` (empty input, no ISA
header, a truncated ISA, or unrecoverable delimiters). Vendor quirks never throw; they collect on
`.warnings`:

```ts runnable throws
import { parseX12 } from "@cosyte/x12";

// Not an X12 interchange at all — a structural fatal, not a tolerated quirk.
parseX12("this is not an X12 interchange"); // throws X12ParseError (X12_NO_ISA_HEADER)
```

## Next

- [Cookbook](./cookbook) — recipes for the 277CA reject routing, the 271 TRN-echo round-trip, the 837
  claim walk, the 999 acknowledgment, and warning triage.
- [Core Concepts](./spec-notes-envelope) — the envelope/loop model, the transaction sets, the
  tolerance tiers, and decimal-exact money.
- [Troubleshooting & known limitations](./troubleshooting) — fatal codes, the fail-safe rules, and
  what v1 does not do.

> **About runnable examples.** The blocks tagged ` ```ts runnable ` above are extracted by the test
> suite, executed against the built package, and their `// =>` results asserted — so a documented
> example can never silently drift from the code (`docSnippetSuite()`, the documentation analog of the
> parser conformance runners). Blocks shown as plain ` ```ts ` are illustrative.

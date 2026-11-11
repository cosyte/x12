---
id: quickstart
title: Quickstart
sidebar_label: Quickstart
description: "Read an 835 remittance advice and pull out the payment, each claim's money, and the adjustment reasons in a few lines."
---

# Quickstart

This page gives you a first useful result: read an **835** remittance advice (the electronic EOB) and
pull out the money (the payment header, each claim's charge/paid/patient-responsibility split, and the
CARC adjustment reasons) in a few lines. The 835 is the document an integration is most often handed
first, so it is the quickest way to see what the library does.

The reader is **lenient** (vendor quirks become stable-coded `warnings`, never silent failures) and
money is decimal-exact throughout (`X12Decimal`, BigInt-backed; **never `parseFloat` an EDI amount**).

> Every interchange below is **synthetic**: fabricated names, invented ids, made-up control
> numbers. X12 healthcare data is PHI; a fixture must never hold a real one.

## Parse an 835 and read the money

`parseX12` decodes the interchange; `get835(delimiters, tx)` walks an 835 transaction set into a typed
`X12Remittance` (or returns `undefined` if the transaction set is not an 835).

```ts runnable
import { parseX12, get835 } from "@cosyte/x12";

const raw = `ISA*00*          *00*          *ZZ*MEDICARE       *ZZ*SUBMITTER      *260601*1200*^*00501*000000001*0*P*:~
GS*HP*MEDICARE*SUBMITTER*20260601*1200*1*X*005010X221A1~
ST*835*0001~
BPR*I*450.00*C*ACH*CCP*01*123456789*DA*987654321*1512345678**01*111111111*DA*222222222*20260601~
TRN*1*0012345*1512345678~
DTM*405*20260601~
N1*PR*MEDICARE PART A~
N3*123 PAYER WAY~
N4*BALTIMORE*MD*21244~
PER*BL*JANE COORDINATOR*TE*5551234567~
N1*PE*SAMPLE CLINIC INC~
N3*456 PROVIDER LN~
N4*CLEVELAND*OH*44113~
REF*TJ*123456789~
LX*1~
CLP*PT-ACCT-001*1*500.00*450.00*50.00*MC*PAYER-CLAIM-001*11*1~
NM1*QC*1*PATIENT*TEST*A***MI*MEMBER001~
NM1*82*2*RENDERING PROVIDER INC*****XX*1234567890~
DTM*232*20260501~
DTM*233*20260501~
SVC*HC:99213*500.00*450.00**1~
DTM*472*20260501~
CAS*PR*1*50.00~
REF*6R*LINE-CTRL-001~
SE*23*0001~
GE*1*1~
IEA*1*000000001~`;

const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
const remit = tx ? get835(ix.delimiters, tx) : undefined;
if (remit === undefined) throw new Error("not an 835");

// Payment header: the money-movement primitive.
remit.payment.totalActualPayment?.toString(); // => "450.00"
remit.payment.creditDebitFlag; // => "C"
remit.payment.method; // => "ACH"
remit.traces[0]?.referenceId; // => "0012345"

// Per claim: your account number echoed back, and the charge/paid/responsibility split.
const claim = remit.claims[0];
claim?.patientControlNumber; // => "PT-ACCT-001"
claim?.totalChargeAmount?.toString(); // => "500.00"
claim?.totalPaymentAmount?.toString(); // => "450.00"
claim?.patientResponsibilityAmount?.toString(); // => "50.00"

// Per service line: the CARC adjustment. Group code is the safety-critical field.
const line = claim?.serviceLines[0];
line?.productServiceId; // => "99213"
const adj = line?.adjustments[0];
adj?.groupCode; // => "PR"
adj?.reasonCode; // => "1"
adj?.amount?.toString(); // => "50.00"
```

The `groupCode` (`PR` = patient responsibility, `CO` = contractual obligation, …) is what tells you
who owes the money. Never infer it, read it. The `reasonDescription` on each adjustment is prefilled
from the bundled CARC snapshot when the code is recognized; an unrecognized code is preserved verbatim
and raises `X12_UNKNOWN_CARC` (the value is never dropped).

## Respect the balance warning

The reader runs the 835 implementation guide's balance equations (`005010X221A1`, section 1.10.2)
and emits `X12_835_REMIT_BALANCE_MISMATCH` on a mismatch. It **never silently rebalances**. **Gate on two codes, not one:** where a term of an
equation is `undefined` the equation cannot be run at all and you get
`X12_835_BALANCE_NOT_EVALUABLE` instead, which is a document you must not post automatically either. Through
`0.0.12` that case collapsed to zero and raised the mismatch, so a gate written against the mismatch
alone stops firing on it when you upgrade.

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

const doNotPost = remit.warnings.some(
  (w) =>
    w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH ||
    w.code === WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE,
);
doNotPost; // => false

if (doNotPost) {
  // Do NOT auto-post. Route to a human: either the payer's numbers don't add
  // up, or an amount one of the equations needs did not decode at all.
}
```

## Unrecoverable input throws: everything else is a warning

Only four structurally unrecoverable conditions throw a typed `X12ParseError` (empty input, no ISA
header, a truncated ISA, or unrecoverable delimiters). Vendor quirks never throw; they collect on
`.warnings`:

```ts runnable throws
import { parseX12 } from "@cosyte/x12";

// Not an X12 interchange at all: a structural fatal, not a tolerated quirk.
parseX12("this is not an X12 interchange"); // throws X12ParseError (X12_NO_ISA_HEADER)
```

## Next

- [Post an 835 remittance](./post-a-remittance.md): every claim and line, the remark codes, the
  balance gate, and the CORE code combination check.
- The other how-to guides, one task each:
  [route 277CA and 277 responses](./route-claim-status-responses.md),
  [answer a 270 with a 271](./answer-an-eligibility-inquiry.md),
  [read 270 and 276 inquiries](./read-inquiries.md),
  [read and build 837 claims](./read-and-build-claims.md),
  [read a 278 decision](./read-a-services-review.md),
  [read an 834 roster](./read-an-enrollment-roster.md),
  [read 999, 997 and TA1 acknowledgments](./read-acknowledgments.md),
  [answer an attachment request](./answer-an-attachment-request.md),
  [build and serialize X12](./emit-and-serialize.md), and [handle warnings](./handle-warnings.md).
- [The envelope and loop model](./spec-notes-envelope.md) and
  [Tolerance tiers and warning codes](./spec-notes-tolerance.md): the model behind every reader.
- [Troubleshooting and known limitations](./troubleshooting.md): the common symptoms, and what this
  package does not do.

Every TypeScript sample on these pages is run by the package's test suite against the built
package, and its `// =>` values are checked, so a sample cannot drift from the code.

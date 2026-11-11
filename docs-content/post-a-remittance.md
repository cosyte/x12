---
id: post-a-remittance
title: Post an 835 remittance
sidebar_label: Post an 835 remittance
description: "Walk each claim and service line of an 835, read the adjustment and remark codes, and refuse to post a remittance that does not balance."
---

# Post an 835 remittance

You have a remittance advice (the electronic EOB) and need to post the cash: walk each claim and
service line, read the CARC and RARC adjustment reasons, and refuse to post a remittance that does
not balance.

`get835(delimiters, tx)` returns a typed
[`X12Remittance`](./api/src.md#x12remittance), or `undefined` when the transaction set is not an 835. Every amount is an [`X12Decimal`](./api/src.md#x12decimal), exact to the digits the payer
sent; never `parseFloat` an EDI amount. [Decimal-exact money](./spec-notes-money.md) says why.

> Every interchange below is **synthetic**: fabricated names, invented ids, made-up control
> numbers. X12 healthcare data is PHI; a fixture must never hold a real one.

## Read the payment, the claims and the adjustments

```ts runnable
import { parseX12, get835, lookupCarc, lookupRarc } from "@cosyte/x12";

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
  "LQ*HE*N4~" +
  "SE*12*0001~GE*1*1~IEA*1*000000001~";

const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
const remit = tx ? get835(ix.delimiters, tx) : undefined;
if (remit === undefined) throw new Error("not an 835");

// The payment header: the money movement itself.
remit.payment.totalActualPayment?.toString(); // => "450.00"
remit.payment.creditDebitFlag; // => "C"
remit.payment.method; // => "ACH"
remit.traces[0]?.referenceId; // => "0012345"
remit.payee?.name; // => "SAMPLE CLINIC INC"

// Each claim: your account number echoed back, and the money split.
const claim = remit.claims[0];
claim?.patientControlNumber; // => "PT-ACCT-001"
claim?.totalChargeAmount?.toString(); // => "500.00"
claim?.totalPaymentAmount?.toString(); // => "450.00"
claim?.patientResponsibilityAmount?.toString(); // => "50.00"

// Each service line, and the adjustments (CAS) and remarks (LQ) on it.
const line = claim?.serviceLines[0];
line?.productServiceId; // => "99213"
line?.paymentAmount?.toString(); // => "450.00"

const adjustment = line?.adjustments[0];
adjustment?.groupCode; // => "PR"
adjustment?.reasonCode; // => "1"
adjustment?.amount?.toString(); // => "50.00"
adjustment?.reasonDescription; // => undefined

const remark = line?.remarks[0];
remark?.code; // => "N4"
remark?.description; // => "Missing/incomplete/invalid prior insurance carrier(s) EOB."

// RARC ships its descriptions; CARC ships its codes and no description text, so
// you supply your own (this text is made up for the example).
lookupRarc("N4")?.description === remark?.description; // => true
lookupCarc("1")?.description; // => undefined
lookupCarc("1", { descriptions: { "1": "Your own text for code 1" } })?.description; // => "Your own text for code 1"
```

The `groupCode` (`PR`: the patient owes it, `CO`: the provider's contract writes it off, and so on) is what tells
you who owes the money. Read it; never infer it. A CARC or RARC code outside the bundled snapshot
is kept verbatim with no description, and raises `X12_UNKNOWN_CARC` or `X12_UNKNOWN_RARC`: a stale
snapshot gives a missing description, never a wrong code. A CARC code inside the snapshot also has
no description: only lists whose own redistribution record says `permitted` ship description text,
and of the bundled lists that is RARC alone.

## Refuse to post a remittance that does not balance

The reader runs three balance equations over the 835 and warns on a mismatch. It never rebalances; the payer's values stand.

- **Claim:** `CLP-04 + Σ(claim CAS + line CAS) == CLP-03`.
- **Service line:** `SVC-03 + Σ(line CAS) == SVC-02`.
- **Remittance:** `BPR-02 == Σ(CLP-04) - Σ(PLB)`.

Gate on two codes, not one. `X12_835_REMIT_BALANCE_MISMATCH` says the numbers do not add up.
`X12_835_BALANCE_NOT_EVALUABLE` says a term of an equation is `undefined` on the model, so the
equation was not run at all; that is equally a remittance you must not post automatically.
Through `0.0.12` that case collapsed to zero and raised the mismatch, so a gate written against the
mismatch alone stops firing on it when you upgrade.

```ts runnable
import { parseX12, get835, WARNING_CODES } from "@cosyte/x12";

// The claim says 500.00 charged and 400.00 paid, and its one adjustment is 50.00.
const raw =
  "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*CLINIC001      " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HP*MEDPAY*CLINIC001*20260601*1200*1*X*005010X221A1~" +
  "ST*835*0001~" +
  "BPR*I*400.00*C*ACH*CCP*01*021000021*DA*1234567*1512345678**01*021000021*DA*98765*20260601~" +
  "TRN*1*0012345*1512345678~" +
  "LX*1~" +
  "CLP*PT-ACCT-001*1*500.00*400.00*50.00*MB*CLAIMREF001*11~" +
  "CAS*PR*1*50.00~" +
  "SE*7*0001~GE*1*1~IEA*1*000000001~";

const ix = parseX12(raw);
const tx = ix.groups[0]?.transactions[0];
const remit = tx ? get835(ix.delimiters, tx) : undefined;
if (remit === undefined) throw new Error("not an 835");

const doNotPost = remit.warnings.some(
  (w) =>
    w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH ||
    w.code === WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE,
);
doNotPost; // => true

// The payer's values stand: nothing was rebalanced.
remit.claims[0]?.totalPaymentAmount?.toString(); // => "400.00"
```

When `doNotPost` is true, route the remittance to a person: either the payer's numbers do not add
up, or an amount one of the equations needs did not decode. The message names the equation and no
amount; the values are on the model.

## Check an adjustment against the CORE Code Combinations table you supply

CAQH CORE Operating Rule 360 conveys why a claim was adjusted by the combined use of a group code,
a reason code and optionally one or more remark codes, and its CORE Code Combinations table lists
the combinations it expects for each of four CORE-defined business scenarios.
[`checkCoreCodeCombination`](./api/src.md#checkcorecodecombination) answers whether one
adjustment's combination is in **your** copy of that table for a scenario you name. It answers that
one question about that one adjustment, and nothing about the remittance as a whole.

**You supply the table and name its version.** No CORE table, excerpt, or default ships with this
package. CAQH CORE revises the table several times a year and publishes it under its own notice,
so the version your posting system follows is yours to load, and the label you give it comes back
beside every answer.

```ts runnable
import {
  CORE_BUSINESS_SCENARIOS,
  checkCoreCodeCombination,
  type CoreCodeCombinationTable,
} from "@cosyte/x12";

// YOUR table, loaded from the CORE Code Combinations version you follow. These
// rows are invented for the example: no CORE table ships with this package.
const table: CoreCodeCombinationTable = {
  version: "our-transcription-2026-02",
  rows: [
    { scenario: "scenario-3", groupCode: "CO", reasonCode: "ZZ901" },
    { scenario: "scenario-3", groupCode: "CO", reasonCode: "ZZ901", remarkCode: "ZZ-R1" },
  ],
};
// You name the scenario; nothing here infers one.
const scenario = CORE_BUSINESS_SCENARIOS.SERVICE_NOT_COVERED;

// In a posting loop these are an adjustment and the remarks you pair with it.
const adjustment = { groupCode: "CO", reasonCode: "ZZ901" };
const remarks = [{ system: "HE", code: "ZZ-R1" }];

const listed = checkCoreCodeCombination({ table, scenario, adjustment, remarks });
listed.outcome; // => "in-table"
listed.tableVersion; // => "our-transcription-2026-02"

// A remark the table does not list with this pair.
const unlisted = checkCoreCodeCombination({
  table,
  scenario,
  adjustment,
  remarks: [{ system: "HE", code: "ZZ-R2" }],
});
unlisted.outcome; // => "not-in-table"

// No table at all: unevaluated, which is NOT permission to post.
const noTable = checkCoreCodeCombination({ scenario, adjustment });
noTable; // => { outcome: "unevaluated", reason: "no-table", tableVersion: undefined }
```

**Three answers, and `unevaluated` is not permitted.** `in-table` means the table has a row for that
scenario, group code, and reason code, and lists every remark you passed with them; with no
remarks, a row for the pair suffices. `not-in-table` means the table has rows for the scenario and
this combination is not among them, including a combination the table lists only under another
scenario. `unevaluated` means the check could not decide, and `reason` says why: no table, a
scenario outside the four, no rows for that scenario, an empty group or reason code, or a remark
that is not an `HE` remark code (an LQ `RX` reject reason, for instance). Gate on `in-table`; a
gate written as "post unless `not-in-table`" posts every combination the check could not judge.

**What it leaves to you.** You choose the scenario. The 835 carries remarks per claim and per
service line rather than per adjustment, so you choose which remarks accompany the adjustment.
Codes are compared exactly as written, with no case folding and no trimming. It judges one
adjustment per call, does not say which remark was missing from the table, does not check a code's
effective dates, and does not evaluate a scenario a health plan defines for itself or the retail
pharmacy variant that pairs a reason code with an NCPDP reject code. A malformed table (no version
label, a row with an empty code or an unknown scenario) throws `CoreCodeCombinationTableError` with
the code `X12_CORE_COMBINATION_TABLE_INVALID`, and its message names the field and the row index,
never a value from your table.

## Related

- [Decimal-exact money](./spec-notes-money.md): the balance equations, and why an amount that does
  not decode reads `undefined` rather than zero.
- [Handle warnings](./handle-warnings.md): triage everything else the reader tolerated.
- [Warning and error codes](./warning-and-error-codes.md#x12_835_remit_balance_mismatch): the
  balance codes' messages.
- Reference: [`get835`](./api/src.md#get835), [`X12Remittance`](./api/src.md#x12remittance),
  [`lookupCarc`](./api/src.md#lookupcarc), [`lookupRarc`](./api/src.md#lookuprarc).

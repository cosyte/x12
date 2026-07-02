---
id: cookbook
title: Cookbook
sidebar_position: 2
---

# Cookbook

Task-oriented recipes for the transactions you actually get handed. Each one is: here's the problem,
here's the code, here's what you get back. Every symbol below is a real `@cosyte/x12` export — no
pseudo-API. All sample EDI is **synthetic** (fabricated names, obviously-fake ids, pre-2024 control
numbers); never paste a real interchange into a doc.

The parser is **lenient by default** — vendor deviations become warnings with a stable code, not
failures. Read [Getting started](intro) first for the envelope model; the recipes here assume you can
already get a parsed interchange.

---

## 1. Parse an 835 ERA and post payments

**The problem:** you have a remittance advice (electronic EOB) and need to post the cash — walk each
claim and service line, read the CARC/RARC adjustments, and refuse to post an out-of-balance remit.

`get835(delimiters, tx)` returns a typed `X12Remittance`, or `undefined` if the transaction set isn't
an 835. Money is `X12Decimal` throughout (BigInt-exact — **never `parseFloat` an EDI amount**).

```ts
import { parseX12, get835, lookupCarc, lookupRarc, WARNING_CODES } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*MEDPAY          *ZZ*CLINIC001       " +
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

// Payment header — the money movement primitive.
remit.payment.totalActualPayment.toString(); // "450.00"
remit.payment.creditDebitFlag; // "C"
remit.payment.method; // "ACH"
remit.traces[0]?.referenceId; // "0012345" — reassociation trace (EFT number)

for (const claim of remit.claims) {
  claim.patientControlNumber; // "PT-ACCT-001" — your account number, echoed back
  claim.totalChargeAmount.toString(); // "500.00"
  claim.totalPaymentAmount.toString(); // "450.00"
  claim.patientResponsibilityAmount.toString(); // "50.00"

  for (const line of claim.serviceLines) {
    line.productServiceId; // "99213"
    line.paymentAmount.toString(); // "450.00"

    // CARC — Claim Adjustment Reason Code. `reasonDescription` is prefilled
    // from the bundled snapshot; fall back to lookupCarc for the raw entry.
    for (const adj of line.adjustments) {
      adj.groupCode; // "PR" — patient responsibility (the safety-critical field)
      adj.reasonCode; // "1"
      adj.reasonDescription ?? lookupCarc(adj.reasonCode)?.description; // "Deductible..."
      adj.amount.toString(); // "50.00"
    }

    // RARC — Remittance Advice Remark Code (LQ*HE), if present.
    for (const remark of line.remarks) {
      remark.code; // "N4"
      remark.description ?? lookupRarc(remark.code)?.description;
    }
  }
}
```

**Respect the balance warning.** The walker runs the TR3 X221A1 §1.10.2 balance invariants
(`totalPaymentAmount + patientResponsibilityAmount + Σ(adjustments) === totalChargeAmount`, and the
top-of-remit `BPR-02 == Σ(CLP-04) - Σ(PLB)`) and emits `X12_835_REMIT_BALANCE_MISMATCH` on a
mismatch. It **never silently rebalances** — the inbound values stand. Gate your posting on it:

```ts
const outOfBalance = remit.warnings.some(
  (w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
);
if (outOfBalance) {
  // Do NOT auto-post. Route to a human — the payer's numbers don't add up.
}
```

---

## 2. Parse a 277CA and route rejections

**The problem:** a clearinghouse sent back a 277CA claim acknowledgment for a batch you submitted. You
need to know, per claim, whether it was **accepted** into adjudication or **rejected** at the front
door — and route the rejects for rework.

`get277CADisposition(delimiters, tx)` admits only the X214 convention and returns an
`X12ClaimStatusResponse`. The status lives in STC triples: **CSCC** (category, source 507) +
**CSC** (status, source 508) + entity. Category `A1`/`A2` = acknowledged/accepted; `A7`/`A6` = rejected.

```ts
import { parseX12, get277CADisposition } from "@cosyte/x12";

const ix = parseX12(raw277ca);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
const ack = tx ? get277CADisposition(ix.delimiters, tx) : undefined;
if (ack === undefined) throw new Error("not a 277CA (005010X214)");

const rejected: string[] = [];
for (const claim of ack.claims) {
  claim.traces[0]?.referenceId; // echoes your submitted TRN — reassociate here
  const stc = claim.statuses[0]?.statuses[0];
  if (stc === undefined) continue;

  stc.categoryCode; // "A2" accepted | "A7" rejected
  stc.statusCode; // e.g. "20" (accepted for processing) | "21" (missing/invalid)
  stc.statusDescription; // "Accepted for processing." | "Missing or invalid information."
  stc.entityCode; // e.g. "PR" | "85" (which entity the status is about)

  // A1/A2 = accepted into the adjudication system; anything else is a reject.
  const accepted = stc.categoryCode === "A1" || stc.categoryCode === "A2";
  if (!accepted) rejected.push(claim.traces[0]?.referenceId ?? "(no trace)");
}

// `rejected` now holds the traces to pull and rework.
```

`get277Status` decodes the plain 277 (X212) response the same way; it admits either convention, while
`get277CADisposition` refuses a non-X214 transaction (returns `undefined`). Unknown category/status
codes are preserved verbatim and raise `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` /
`X12_UNKNOWN_CLAIM_STATUS` — the code is never dropped.

---

## 3. Build a 271, then parse it — the TRN-echo round-trip

**The problem:** you're the payer side and need to emit an eligibility **response**, then prove the
reassociation contract holds: the 271 echoes the requesting 270's TRN-02 **verbatim** so the provider
can match your answer to their question. There is no `build270` in v1 (the 270 inquiry is a read-only
surface); the round-trip you can demonstrate today is `build271` → `get271Eligibility`.

`build271(spec)` computes the HL spine for you (source → receiver → subscriber → dependent) and
**refuses** a structurally impossible hierarchy via `Eligibility271BuildError`. It returns a frozen
`X12Interchange` — it never auto-sends, opens a socket, or touches the filesystem.

```ts
import { parseX12, build271, get271Eligibility, X12Decimal, type Build271Spec } from "@cosyte/x12";

const traceFromThe270 = "ELIG20220627001"; // <- pulled from the inbound 270's TRN-02

const spec: Build271Spec = {
  envelope: {
    senderId: "MEDPAY",
    receiverId: "PROVIDER",
    interchangeDate: "220601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  informationSources: [
    {
      entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
      receivers: [
        {
          entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
          subscribers: [
            {
              traces: [{ traceTypeCode: "2", referenceId: traceFromThe270 }], // echo it back
              name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
              benefits: [
                {
                  eligibilityCode: "1", // active coverage
                  coverageLevelCode: "IND",
                  serviceTypeCodes: [{ code: "30" }],
                  monetaryAmount: X12Decimal.fromString("1000.00")!,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const ix = build271(spec);

// Round-trip it back through the reader:
const tx = ix.groups[0]?.transactions[0];
const elig = tx ? get271Eligibility(ix.delimiters, tx) : undefined;

// The safety-critical reassociation property holds byte-for-byte:
elig?.subscribers[0]?.traces[0]?.referenceId === traceFromThe270; // true
elig?.subscribers[0]?.name?.lastName; // "DOE"
elig?.subscribers[0]?.benefits[0]?.eligibilityCode; // "1"
```

The same pattern (`build277` / `build277CA` echoing the 276's trace) covers claim-status responses.

---

## 4. Parse an 837 claim — variant, hierarchy, diagnoses

**The problem:** you received a claim and need to know which flavor it is (Professional / Institutional
/ Dental), walk the HL hierarchy (billing provider → subscriber → claim), and read the diagnosis codes
with their code-system provenance.

`get837Claims(delimiters, tx)` returns an `X12_837Submission`. Variant is resolved from the ST-03
implementation-convention reference (`X222A2` → P, `X223A3` → I, `X224A2` → D), with an SVx fallback;
an unresolvable one raises `X12_837_UNKNOWN_VARIANT`.

```ts
import { parseX12, get837Claims, HL_LEVEL_CODES, WARNING_CODES } from "@cosyte/x12";

const ix = parseX12(raw837);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
const sub = tx ? get837Claims(ix.delimiters, tx) : undefined;
if (sub === undefined) throw new Error("not an 837");

sub.variant; // "P" | "I" | "D"

// Walk the HL hierarchy. HL-02 parent pointers are validated, never
// re-numbered; a broken pointer surfaces as X12_HL_PARENT_MISMATCH.
for (const hl of sub.hierarchies) {
  hl.hlId; // "1", "2", ...
  hl.parentHlId; // undefined at the top (Information Source)
  hl.levelCode; // compare against HL_LEVEL_CODES.*
  const isSource = hl.levelCode === HL_LEVEL_CODES.INFORMATION_SOURCE;
  const isSubscriber = hl.levelCode === HL_LEVEL_CODES.SUBSCRIBER;
}

for (const claim of sub.claims) {
  claim.billingProvider?.name; // "BILLING CLINIC INC"
  claim.billingProvider?.idCode; // "1234567890" (NPI)
  claim.subscriber?.info.claimFilingIndicator; // "MB" (Medicare Part B)

  // HI diagnoses — the qualifier tells you the code system AND the role.
  for (const dx of claim.diagnoses) {
    dx.qualifier; // "ABK" (principal ICD-10-CM), "ABF" (other), "ABJ" (admitting)...
    dx.codeSystem; // "ICD-10-CM" | "ICD-10-PCS" | ... | "unknown"
    dx.category; // "principal-diagnosis" | "other-diagnosis" | ...
  }

  for (const line of claim.serviceLines) {
    // Variant-discriminated union: narrow on `line.variant` before reading SVx fields.
    if (line.variant === "P") line.diagnosisPointers; // e.g. ["1"]
  }
}

// An unknown HI qualifier is preserved verbatim (codeSystem: "unknown") + warns.
const unknownHi = sub.warnings.some((w) => w.code === WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER);
```

---

## 5. Parse a 999 acknowledgment — disposition + segment errors

**The problem:** you submitted an 837 and got a 999 back. Was the batch accepted? If not, which
segments and elements failed, and where?

`parse999(raw)` takes the raw bytes directly (it parses the envelope for you) and returns an
`X12Ack999`, or `undefined` if there's no 999 in the interchange.

```ts
import { parse999, isAcceptDisposition, X12_ACK_DISPOSITION_CODES } from "@cosyte/x12";

const ack = parse999(raw999);
if (ack === undefined) throw new Error("no 999 in interchange");

// AK9 — the functional-group disposition + counts.
ack.ak9.disposition; // "A" accepted | "E" accepted-with-errors | "R" rejected | ...
ack.ak9.numberOfReceivedTransactionSets; // e.g. 1
ack.ak9.numberOfAcceptedTransactionSets; // e.g. 0

// One boolean for "did this pass?": accept dispositions are A / E / P.
if (!isAcceptDisposition(ack.ak9.disposition)) {
  // The group was rejected — dig into the per-transaction responses.
}

for (const response of ack.transactionResponses) {
  response.ak2.transactionSetIdCode; // "837"
  response.ak2.transactionSetControlNumber; // "0001" — matches your ST-02
  response.ik5.disposition; // per-transaction disposition (=== X12_ACK_DISPOSITION_CODES.R?)

  // IK3 — segment-level error notes.
  for (const segNote of response.segmentNotes) {
    segNote.ik3.segmentIdCode; // "NM1" — which segment
    segNote.ik3.segmentPositionInTransactionSet; // 8
    segNote.ik3.loopIdentifier; // "2010BA"
    segNote.ik3.syntaxErrorCode; // "8" (segment has data element errors)

    // IK4 — element-level notes nested under the segment.
    for (const elemNote of segNote.elementNotes) {
      elemNote.ik4.position.element; // 1
      elemNote.ik4.position.component; // 2 (composite subelement)
      elemNote.ik4.syntaxErrorCode; // "7" (invalid code value)
    }
  }
}
```

`X12_ACK_DISPOSITION_CODES` is the code registry if you prefer explicit comparisons
(`ack.ak9.disposition === X12_ACK_DISPOSITION_CODES.R`). The TA1 interchange ack has a parallel pair,
`parseTA1(ix)` / `buildTA1(spec)`.

---

## 6. Handle warnings — the lenient, never-throw contract

**The problem:** you want to log or triage every tolerated deviation without your pipeline throwing on
a vendor quirk. `@cosyte/x12` is liberal on input: **only four Tier-3 structural errors ever throw**;
everything else is a warning carrying a stable code and positional context.

Every warning is collected on the returned model (`ix.warnings`, `remit.warnings`, `sub.warnings`,
…). You can also stream them live via the `onWarning` callback:

```ts
import { parseX12, WARNING_CODES, type X12ParseWarning } from "@cosyte/x12";

const seen: X12ParseWarning[] = [];
const ix = parseX12(raw, {
  onWarning: (w) => {
    seen.push(w);
    // w.code — a stable string from WARNING_CODES
    // w.message — bounded, PHI-free (never echoes names/ids/dates)
    // w.position — where in the interchange it occurred
  },
});

// Or read them after the fact:
for (const w of ix.warnings) {
  if (w.code === WARNING_CODES.X12_PRE_005010) {
    // sender is on a pre-005010 version family — tolerated, not fatal
  }
}
```

**Escalate when you want strictness.** Pass `{ strict: true }` to turn every tolerated deviation into
a thrown `X12ParseError` carrying the same warning code — useful for a spec-conformance gate on a
trusted trading partner.

**The four fatal codes.** These are unrecoverable structural corruption and always throw an
`X12ParseError` regardless of `strict`:

```ts
import { parseX12, FATAL_CODES, X12ParseError } from "@cosyte/x12";

try {
  parseX12(maybeGarbage);
} catch (err) {
  if (err instanceof X12ParseError) {
    switch (err.code) {
      case FATAL_CODES.X12_EMPTY_INPUT: // nothing to parse
      case FATAL_CODES.X12_NO_ISA_HEADER: // not an X12 interchange at all
      case FATAL_CODES.X12_ISA_TOO_SHORT: // ISA truncated below 106 bytes
      case FATAL_CODES.X12_INVALID_DELIMITERS: // delimiters unrecoverable from ISA
        // A malformed interchange — the bytes aren't X12.
        break;
    }
  }
}
```

Everything a real-world payer or clearinghouse does short of that — miscounts, dangling release chars,
unknown CARC/RARC/HI codes, HL parent mismatches, balance mismatches, pre-005010 versions — is a
warning you triage, not an exception you catch.

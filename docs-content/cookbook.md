---
id: cookbook
title: Cookbook
sidebar_position: 10
---

# Cookbook

Task-oriented recipes for the transactions you actually get handed. Each one is: here's the problem,
here's the code, here's what you get back. Every symbol below is a real `@cosyte/x12` export, no
pseudo-API. All sample EDI is **synthetic** (fabricated names, obviously-fake ids, pre-2024 control
numbers); never paste a real interchange into a doc.

The parser is **lenient by default**: vendor deviations become warnings with a stable code, not
failures. Read [Getting started](intro) first for the envelope model; the recipes here assume you can
already get a parsed interchange.

---

## 1. Parse an 835 ERA and post payments

**The problem:** you have a remittance advice (electronic EOB) and need to post the cash. Walk each
claim and service line, read the CARC/RARC adjustments, and refuse to post an out-of-balance remit.

`get835(delimiters, tx)` returns a typed `X12Remittance`, or `undefined` if the transaction set isn't
an 835. Money is `X12Decimal` throughout (BigInt-exact, **never `parseFloat` an EDI amount**).

```ts
import { parseX12, get835, lookupCarc, lookupRarc, WARNING_CODES } from "@cosyte/x12";

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

// Payment header: the money movement primitive.
remit.payment.totalActualPayment?.toString(); // "450.00"
remit.payment.creditDebitFlag; // "C"
remit.payment.method; // "ACH"
remit.traces[0]?.referenceId; // "0012345": reassociation trace (EFT number)

for (const claim of remit.claims) {
  claim.patientControlNumber; // "PT-ACCT-001": your account number, echoed back
  claim.totalChargeAmount?.toString(); // "500.00"
  claim.totalPaymentAmount?.toString(); // "450.00"
  claim.patientResponsibilityAmount?.toString(); // "50.00"

  for (const line of claim.serviceLines) {
    line.productServiceId; // "99213"
    line.paymentAmount?.toString(); // "450.00"

    // CARC: Claim Adjustment Reason Code. `reasonDescription` is prefilled
    // from the bundled snapshot; fall back to lookupCarc for the raw entry.
    for (const adj of line.adjustments) {
      adj.groupCode; // "PR": patient responsibility (the safety-critical field)
      adj.reasonCode; // "1"
      adj.reasonDescription ?? lookupCarc(adj.reasonCode)?.description; // "Deductible..."
      adj.amount?.toString(); // "50.00"
    }

    // RARC: Remittance Advice Remark Code (LQ*HE), if present.
    for (const remark of line.remarks) {
      remark.code; // "N4"
      remark.description ?? lookupRarc(remark.code)?.description;
    }
  }
}
```

**Respect the balance warning.** The walker runs the TR3 X221A1 §1.10.2 balance invariants (the
claim-level `CLP-04 + Σ(claim CAS + line CAS) == CLP-03`, the per-line
`SVC-03 + Σ(line CAS) == SVC-02`, and the top-of-remit `BPR-02 == Σ(CLP-04) - Σ(PLB)`) and emits
`X12_835_REMIT_BALANCE_MISMATCH` on a mismatch. It **never silently rebalances**. The inbound values
stand. **Gate on two codes, not one:** where a term of an equation is `undefined` the equation cannot
be run and you get `X12_835_BALANCE_NOT_EVALUABLE` instead, which is equally a document you must not
auto-post. Through `0.0.12` that case collapsed to zero and raised the mismatch, so a gate written
against the mismatch alone stops firing on it when you upgrade:

```ts
const doNotPost = remit.warnings.some(
  (w) =>
    w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH ||
    w.code === WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE,
);
if (doNotPost) {
  // Do NOT auto-post. Route to a human. Either the payer's numbers don't add
  // up, or an amount one of the equations needs did not decode at all.
}
```

---

## 2. Parse a 277CA and route rejections

**The problem:** a clearinghouse sent back a 277CA claim acknowledgment for a batch you submitted. You
need to know, per claim, whether it was **accepted** into adjudication or **rejected** at the front
door, and route the rejects for rework.

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
  claim.traces[0]?.referenceId; // echoes your submitted TRN, reassociate here
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
`X12_UNKNOWN_CLAIM_STATUS`. The code is never dropped.

### The plain 277 (X212): a status answer, with the charge it is about

The X212 response carries the same STC triple plus the claim-level totals and the Loop 2220 service
lines, and it echoes the requesting 276's `TRN-02` so you can reassociate:

```ts runnable
import { parseX12, get277Status } from "@cosyte/x12";

const raw277 = [
  "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000010*0*P*:~",
  "GS*HN*MEDPAY*ANYTOWNCLINIC*20260601*1200*10*X*005010X212~",
  "ST*277*0001*005010X212~",
  "BHT*0010*08*STATUS-001*20260601*1200*DG~",
  "HL*1**20*1~",
  "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
  "HL*2*1*21*1~",
  "NM1*41*2*ANYTOWN CLINIC*****46*RECVR01~",
  "HL*3*2*19*1~",
  "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
  "HL*4*3*22*0~",
  "NM1*IL*1*DOE*JANE****MI*MBR0001~",
  "TRN*2*ECHO-276-TRACE-001~",
  "STC*A2:20:PR*20260601*WQ*150~",
  "REF*1K*PCN0001~",
  "DTP*472*D8*20260520~",
  "SVC*HC:99213*150*0****1~",
  "STC*A2:20*20260601~",
  "REF*FJ*LINE001~",
  "DTP*472*D8*20260520~",
  "SE*19*0001~",
  "GE*1*10~",
  "IEA*1*000000010~",
].join("\n");

const ix277 = parseX12(raw277);
const tx277 = ix277.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
const response = tx277 ? get277Status(ix277.delimiters, tx277) : undefined;

response?.transactionType; // => "claim-status"

// Reassociate on the trace you submitted, never on a name or a date.
const statusClaim = response?.claims[0];
statusClaim?.traces[0]?.referenceId; // => "ECHO-276-TRACE-001"
statusClaim?.references[0]?.value; // => "PCN0001"

// The claim-level STC: the triple, plus what the status is ABOUT.
const info = statusClaim?.statuses[0];
info?.actionCode; // => "WQ"
info?.totalChargeAmount?.toString(); // => "150"
info?.statuses[0]?.categoryCode; // => "A2"
info?.statuses[0]?.statusCode; // => "20"
info?.statuses[0]?.statusDescription; // => "Accepted for processing."

// Loop 2220 carries the per-line answer.
statusClaim?.serviceLines[0]?.procedureCode; // => "99213"
statusClaim?.serviceLines[0]?.statuses[0]?.statuses[0]?.statusCode; // => "20"
```

---

## 3. Build a 271, then parse it: the TRN-echo round-trip

**The problem:** you're the payer side and need to emit an eligibility **response**, then prove the
reassociation contract holds: the 271 echoes the requesting 270's TRN-02 **verbatim** so the provider
can match your answer to their question. The inquiry side has its own pair, `build270` and
`get270Inquiry`, so both ends of the exchange are typed; this recipe stays on the response half and
demonstrates `build271` → `get271Eligibility`.

`build271(spec)` computes the HL spine for you (source → receiver → subscriber → dependent) and
**refuses** a structurally impossible hierarchy via `Eligibility271BuildError`. It returns a frozen
`X12Interchange`. It never auto-sends, opens a socket, or touches the filesystem.

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
      entity: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        name: "MEDPAY INSURANCE",
        idQualifier: "PI",
        idCode: "00123",
      },
      receivers: [
        {
          entity: {
            entityIdentifierCode: "1P",
            entityTypeQualifier: "2",
            name: "ANYTOWN CLINIC",
            idQualifier: "XX",
            idCode: "1234567890",
          },
          subscribers: [
            {
              traces: [{ traceTypeCode: "2", referenceId: traceFromThe270 }], // echo it back
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastName: "DOE",
                firstName: "JANE",
                idQualifier: "MI",
                idCode: "MBR0001",
              },
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

### 🩺 Telling a rejected inquiry from a member with no benefits

**The problem:** an empty benefit list has two completely different meanings. Either the payer
answered and this member has no benefits of the kind you asked about, or the payer never processed
your inquiry at all and said why, in an `AAA` request-validation segment. Reporting the second as the
first tells a patient they have no coverage when nobody ever checked.

`elig.aaaConditions` is the difference. It is **always present** and it is **empty** for a response
that carries no `AAA`, so a present-and-empty collection is a stated zero rather than a reader that
does not look. Each entry names the level the payer rejected at, the loop occurrence it belongs to,
and the payer's own reject reason and follow-up action codes, echoed **verbatim**.

The bundled description snapshots for those two code lists ship **empty**: their maintaining
organisation requires permission for the use of its work products and none has been obtained, so this
package ships the code and no description rather than a description nobody recorded terms for. The
code is never lost, and every unrecognised one raises `X12_271_AAA_UNKNOWN_CODE` beside it.

```ts runnable
import { parseX12, get271Eligibility } from "@cosyte/x12";

const raw271 = [
  "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
  "GS*HB*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X279A1~",
  "ST*271*0001*005010X279A1~",
  "BHT*0022*11*TXN-REF-001*20260601*1200~",
  "HL*1**20*1~",
  "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
  "HL*2*1*21*1~",
  "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
  "HL*3*2*22*0~",
  "NM1*IL*1*DOE*JANE****MI*MBR0001~",
  "AAA*N**72*C~",
  "SE*10*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("\n");

const ix271 = parseX12(raw271);
const tx271 = ix271.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
const response = tx271 ? get271Eligibility(ix271.delimiters, tx271) : undefined;

// No benefits came back. Do NOT read that as "no coverage" without this check:
response?.subscribers[0]?.benefits.length; // => 0
response?.aaaConditions.length; // => 1

// The payer rejected, and here is where and why. Codes are verbatim.
response?.aaaConditions[0]?.key.level; // => "subscriber"
response?.aaaConditions[0]?.key.hierarchyId; // => "3"
response?.aaaConditions[0]?.key.occurrenceIndex; // => 0
response?.aaaConditions[0]?.rejectReasonCode?.code; // => "72"
response?.aaaConditions[0]?.followUpActionCode?.code; // => "C"

// The bundled snapshot is empty, so the description is absent rather than guessed.
response?.aaaConditions[0]?.rejectReasonCode?.description; // => undefined
```

A response with no `AAA` gives you `aaaConditions.length === 0`, and THAT is the empty benefit list
you can report as "no benefits of that kind". The `AAA` segments stay on `tx.segments` verbatim as
they always did; nothing moved off it to build this.

---

## 4. Read the inquiry side: a 270 and a 276

**The problem:** you are the payer or the clearinghouse, and what arrives is the **question** rather
than the answer. A 270 asks whether a member is covered; a 276 asks what happened to a claim. Both
are hierarchical documents, and the answer you send back has to reassociate to the trace the
submitter chose.

Write "270" and "276" separately when you describe this. They are two different implementation
guides (`005010X279A1` and `005010X212`), each with a reader and a builder of its own, and one paired
label over two halves is how this documentation was wrong about them once already.

### The 270 eligibility inquiry

`get270Inquiry(delimiters, tx)` walks one transaction set; `parse270Inquiries(raw)` takes the raw
bytes and gives you every 270 in the interchange, in transmitted order. The hierarchy is presented as
the sender declared it: source, receiver, subscriber, and a dependent as **its own level** rather
than flattened onto the subscriber it hangs under.

```ts runnable
import { parse270Inquiries } from "@cosyte/x12";

const raw270 = [
  "ISA*00*          *00*          *ZZ*ANYTOWNCLINIC  *ZZ*MEDPAY         *260601*1200*^*00501*000000001*0*P*:~",
  "GS*HS*ANYTOWNCLINIC*MEDPAY*20260601*1200*1*X*005010X279A1~",
  "ST*270*0001*005010X279A1~",
  "BHT*0022*13*REQ-0001*20260601*1200~",
  "HL*1**20*1~",
  "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
  "HL*2*1*21*1~",
  "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
  "HL*3*2*22*0~",
  "TRN*1*ELIG20260601001*9SAMPLEORG~",
  "NM1*IL*1*DOE*JANE*A***MI*MBR0001~",
  "N3*100 MAIN ST~",
  "N4*COLUMBUS*OH*43215~",
  "DMG*D8*19850515*F~",
  "DTP*291*D8*20260601~",
  "EQ*30^35*HC:99213:25*IND~",
  "SE*15*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("\n");

const inquiry = parse270Inquiries(raw270)[0];

inquiry?.header?.purposeCode; // => "13"

// This interchange is pretty-printed, and the 270 reader SAYS SO rather than
// absorbing it in silence: the shared parse consumes the CR / LF run before
// the next segment opens, so it is part of no element, nothing on the model
// records it, and `serializeX12` cannot put it back. The typed model is
// otherwise identical to the compact form's.
inquiry?.warnings.map((w) => w.code); // => ["X12_270_INTER_SEGMENT_LINE_BREAK"]

const asked = inquiry?.informationSources[0]?.receivers[0]?.subscribers[0];

// The trace you must echo on the 271 you send back.
asked?.traces[0]?.referenceId; // => "ELIG20260601001"

asked?.name?.lastNameOrOrganizationName; // => "DOE"
asked?.name?.idCode; // => "MBR0001"
asked?.name?.dateOfBirth; // => "19850515"

// EQ-01 repeats, so the service types come back as a list, and the bundled
// snapshot fills a description in beside the code without ever replacing it.
const request = asked?.inquiries[0];
request?.serviceTypeCodes.map((s) => s.code); // => ["30", "35"]
request?.serviceTypeCodes[0]?.description; // => "Health Benefit Plan Coverage"

// EQ-02 is a composite, and comes back as separated components rather than
// one joined string: the separator is framing and appears in no value.
request?.procedure?.qualifier; // => "HC"
request?.procedure?.code; // => "99213"
request?.procedure?.modifiers; // => ["25"]
```

**Read that line-break code's bound literally: CR and LF, and nothing else.** Whitespace that is not
CR or LF, a space or a tab between segments, is not consumed by the shared interchange parse at all.
It becomes part of the next segment's identifier, the functional group never frames, and
`parse270Inquiries` answers the **empty list**, with the loss reported on the interchange's own
warning channel rather than on a 270's. The code is raised once per transaction set however many
runs the document carries, and it is raised on the 270 path only.

**The declared HL parent pointers are preserved verbatim and never re-numbered.** A level whose
declared parent does not resolve is left off the tree, together with everything beneath it, and the
loss is reported (`X12_270_LEVEL_DETACHED`) rather than re-parented onto whichever level happened to
be open. Check `inquiry.warnings` before you conclude a subscriber had no dependents.

### The 276 claim status request

`get276StatusInquiry(delimiters, tx)` and `parse276StatusInquiries(raw)` are the same pair one guide
over. The 276 adds a provider level (`19`) between the receiver and the subscriber, and each claim
carries the `TRN-02` the 277 has to echo:

```ts runnable
import { parse276StatusInquiries } from "@cosyte/x12";

const raw276 = [
  "ISA*00*          *00*          *ZZ*ANYTOWNCLINIC  *ZZ*MEDPAY         *260601*1200*^*00501*000000011*0*P*:~",
  "GS*HR*ANYTOWNCLINIC*MEDPAY*20260601*1200*11*X*005010X212~",
  "ST*276*0001*005010X212~",
  "BHT*0010*13*STATUS-0001*20260601*1200~",
  "HL*1**20*1~",
  "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
  "HL*2*1*21*1~",
  "NM1*41*2*ANYTOWN CLINIC*****46*RECVR01~",
  "HL*3*2*19*1~",
  "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
  "HL*4*3*22*0~",
  "NM1*IL*1*DOE*JANE*A***MI*MBR0001~",
  "DMG*D8*19850515*F~",
  "TRN*1*STATUS20260601001*9SAMPLEORG~",
  "REF*1K*PCN0001~",
  "AMT*T3*150~",
  "DTP*472*D8*20260520~",
  "SVC*HC:99213:25*150*****1~",
  "REF*FJ*LINE001~",
  "DTP*472*D8*20260520~",
  "SE*19*0001~",
  "GE*1*11~",
  "IEA*1*000000011~",
].join("\n");

const statusRequest = parse276StatusInquiries(raw276)[0];

statusRequest?.warnings.map((w) => w.code); // => []
statusRequest?.hierarchies.map((h) => h.levelCode); // => ["20", "21", "19", "22"]

const subscriber = statusRequest?.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
subscriber?.name?.idCode; // => "MBR0001"

const askedAbout = subscriber?.claims[0];

// The trace the 277 must echo back, verbatim.
askedAbout?.trace?.referenceId; // => "STATUS20260601001"
askedAbout?.references.map((r) => [r.qualifier, r.value]); // => [["1K", "PCN0001"]]

// Money is X12Decimal here too, on the request side as much as the response.
askedAbout?.amounts[0]?.amount.toString(); // => "150"

const askedLine = askedAbout?.serviceLines[0];
askedLine?.procedure?.code; // => "99213"
askedLine?.lineChargeAmount?.toString(); // => "150"
askedLine?.unitsOfService?.toString(); // => "1"
```

The 276 reader attaches a level by its **own** HL-02 and by nothing else, exactly as the 270 does, so
a dangling pointer, a pointer naming a level of the wrong kind, and a parent chain that returns to
itself each leave that level and its subtree off the model, reported and never re-parented. The two
readers' warning codes are **siblings, never one widened set** (`X12_270_*` and `X12_276_*`): gate on
the one belonging to the document you are reading, and do not assume a code one of them raises has a
counterpart on the other. The line-break report above is exactly that case: it exists on the 270 path
and on no other, which is why the same pretty-printed framing leaves this 276 with an empty warning
list. A 276 short of what a row is built from has reports of its own instead
(`X12_276_REFERENCE_ROW_DROPPED` for a `REF` missing either element, `X12_276_DATE_ROW_DROPPED` for a
`DTP` missing its qualifier or its value), because each of those is a record rather than a slot and
there is no half a row to keep.

---

## 5. Parse an 837 claim: variant, hierarchy, diagnoses

**The problem:** you received a claim and need to know which flavor it is (Professional / Institutional
/ Dental), walk the HL hierarchy (billing provider → subscriber → claim), and read the diagnosis codes
with their code-system provenance.

`get837Claims(delimiters, tx)` returns an `X12_837Submission`. Variant is resolved from the ST-03
implementation-convention reference (an `X222` guide → P, `X223` → I, `X224` → D), with an SVx
fallback; an unresolvable one raises `X12_837_UNKNOWN_VARIANT`.

**🩺 Which references resolve changed in this release, and it changes how some already-published files
decode.** Through `0.0.13` the reader recognised exactly three: `005010X222A2`, `005010X223A3` and
`005010X224A2`. That set contained **none** of the identifiers HIPAA adopts at 45 CFR 162.1102, and
it was missing `005010X222A1` and `005010X223A2`, which are what CMS and state Medicaid companion
guides require in ST-03 on production professional and institutional claims. So a conformant 837P
declaring `005010X222A1` resolved to nothing and fell through to the SVx fallback, where one stray
`SV2` re-typed the whole submission. The reader now recognises each base guide and each of its
published errata. **If you read 837 files on `0.0.13` or earlier, re-check any routing you drove off
`submission.variant`, and any predicate you wrote on `X12_837_UNKNOWN_VARIANT` or
`X12_837_AMBIGUOUS_VARIANT`:** on a file whose ST-03 is now recognised, the variant can differ,
neither code fires any more, and **a service line whose `SVx` kind disagrees with the declaration is
no longer decoded** - its `charge` and `units` read `undefined`, the rest of the service segment is
undecoded, and `X12_837_SERVICE_LINE_NOT_DECODED` is raised at that line's `LX`, on a document that
may have been silent before. **Gate on the warning, not on a slot:** an undecoded line SEEDS its
identity fields, so `procedureCode` is `""` on a P or D line and `revenueCode` is `""` on an I one. Read all of that as **one property and not a closed list**: where ST-03 is recognised,
the document's own declaration decides the variant instead of its first service segment. The set is a list of cited identifiers, never a pattern: a reference
outside it, in a different case, or padded still falls through exactly as before.

**🩺 When the fallback is what decided and the body contradicts itself, that is reported too.** The
fallback takes the **first** `SV1` / `SV2` / `SV3` in the transaction body, whether or not a Loop 2400
was open at it, so one stray `SV2` ahead of a Professional claim re-types the whole submission
Institutional. Where the body carries service segments for more than one variant and the fallback is
what resolved it, `X12_837_AMBIGUOUS_VARIANT` is raised at the `ST`: `submission.variant` is a guess
between contradictory evidence, and **which segment is the stray one is not decided**, because this
reader cannot tell a stray service segment from a conformant one. Re-read with the `type` option to
decode against a variant you trust. Read the bound as a property of the **resolution**: a `type` you
pass, or an `ST-03` naming a known convention, means no guess was made and the code is not raised
however mixed the body is. It is additive, so every existing warning on such a document still fires
exactly where it did.

The reference wins over the segments when the two disagree, and the `type` option wins over both. A
service line whose `SVx` then does not match is **not** decoded (reading an `SV2` into a Professional
line would mis-read the charge), so its `charge` and `units` read `undefined` and
`X12_837_SERVICE_LINE_NOT_DECODED` is raised against the `LX` that opened it. Gate on that warning
before you post a line amount, alongside `X12_837_SERVICE_SEGMENT_REPEATED` (a **second** service
segment inside one Loop 2400: the line carries only the last matching one, so a charge and a
procedure code the sender also sent are not on the model - see below), `X12_UNPARSEABLE_DECIMAL` (the
`SVx` decoded but the amount
itself did not) and `X12_AMOUNT_ROW_DROPPED` (an `AMT` whose own amount decoded nothing, so the
whole supplemental-amount row is off the model - off the **line** where one is open, and off the
claim otherwise). Gate on `X12_STATED_AMOUNT_DISCARDED` beside it: an `AMT` arriving while a Loop
2430 adjudication is open decodes fine and is discarded anyway, so that row is off the model even
though nothing failed to read. That is specific to this route: read the code's own bounds before
generalising it, because its other route reports rows whose bytes may not decode at all. The two are disjoint and never name the same
segment. None of them is a complete account of every way an
amount can fail to reach the model, and
[Decimal-exact money](./spec-notes-money) states the guarantee in the only direction it holds.

A third code covers one more way a line goes missing: `X12_837_SERVICE_LINE_DROPPED`, raised at an
`LX` that opened no Loop 2400, either because no `CLM` was open or because the variant is not one of
`P` / `I` / `D`. **An empty `serviceLines` is therefore not on its own evidence that the claim had
none** - check the warning channel before concluding it. Read that code's scope literally: it is
anchored at the `LX`, so an `SVx` arriving with **no Loop 2400 open** is reported by a fourth code,
`X12_837_SERVICE_SEGMENT_WITHOUT_LX`, anchored at the service segment itself (through `0.0.9` that
case was dropped silently). It does
**not** travel with `X12_837_UNKNOWN_VARIANT` (a caller-supplied `type` outside the union reaches the
same route without it, so read `submission.variant`); and what becomes of a `DTP` / `AMT` /
`NTE` / `REF` after a dropped `LX` is route-dependent, so do not assume it is simply absent (see
[Troubleshooting](./troubleshooting) and the package's `KNOWN-LIMITATIONS.md`).

A fifth code covers the cost of that route. Where the dropped `LX` had **no `CLM` open** and landed
inside an entity loop, it closes that loop, so an `N3` / `N4` / `PER` / `REF` following it reaches no
party at all while nothing since has opened a loop, which the next `NM1` / `HL` / `CLM` does. Each such segment raises
`X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, anchored at the segment itself. Read its bound literally:
it reports only that route, and only for that stretch, so it is not a
general "this segment reached no party" report. It reports that the segment reached **no** party, and
not that it would otherwise have reached one: this reader surfaces neither a `PER` on a patient nor
one on a pay-to address on any release, so on those the alternative was also no party. The bytes stay verbatim on `tx.segments`, which is
still the only complete account of the document.

**🩺 A sixth code covers the one that costs money on a line that decoded perfectly well.** Where a
second `SV1` / `SV2` / `SV3` arrives inside a Loop 2400 that is **already open**,
`X12_837_SERVICE_SEGMENT_REPEATED` is raised at that repeated segment. The line carries one service
segment's worth of slots, so it holds what the **last** segment matching the resolved variant wrote,
and every decoder writes all of the slots its kind writes: `SV1*HC:99213*8500*…` followed by
`SV1*HC:99999*12*…` leaves one line reading `charge` `12` and `procedureCode` `99999`, and through
`0.0.13` it did so with `warnings: []`. Where the repeat's own charge element is **absent** it writes
`undefined` over the amount the first one stated, and `X12_837_SERVICE_LINE_NOT_DECODED` does **not**
fire there, because a service segment did decode. A repeat whose kind does not match the resolved
variant is read into nothing and overwrites nothing, and is reported the same way. **Which of them the
sender meant is not decided** - this reader cannot tell a stray service segment from a conformant one -
and the decode is byte-for-byte what it was at `0.0.13`, so gate on the code and read the segments off
`tx.segments` rather than expecting the model to reconcile them. It never names the same segment as
`X12_837_SERVICE_SEGMENT_WITHOUT_LX`, which requires that **no** Loop 2400 be open where this one
requires that one is. Read that as disjointness and not as coverage: a service segment following an
`LX` that opened no line is named by neither, because `X12_837_SERVICE_LINE_DROPPED` at that `LX`
already reports the loss.

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

  // HI diagnoses: the qualifier tells you the code system AND the role.
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

### 🩺 Building one: declare the guide your partner asked for

`build837P` / `build837I` / `build837D` default ST-03 and GS-08 to `005010X222A2` / `005010X223A3` /
`005010X224A2`. **Those defaults are not what every partner accepts** - CMS and several state
Medicaid companion guides require `005010X222A1` on professional and `005010X223A2` on institutional
claims, and a partner on one of those rejects a file declaring the default. Which published guide
identifier a partner accepts is a **partner fact rather than a spec fact**, so this library will not
choose for you: state it on the envelope and one value reaches both elements.

```ts runnable
import { build837P, get837Claims, X12Decimal, type Build837Spec } from "@cosyte/x12";

const spec: Build837Spec = {
  envelope: {
    senderId: "SUBMITTER",
    receiverId: "RECEIVER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
    // Omit this and you get 005010X222A2, exactly as before it existed.
    implementationConventionReference: "005010X222A1",
  },
  submitter: {
    entityIdentifierCode: "41",
    entityTypeQualifier: "2",
    name: "SUBMITTER ONE",
    idQualifier: "46",
    idCode: "SUB001",
  },
  receiver: {
    entityIdentifierCode: "40",
    entityTypeQualifier: "2",
    name: "RECEIVER ONE",
    idQualifier: "46",
    idCode: "REC001",
  },
  billingProviders: [
    {
      provider: {
        entityIdentifierCode: "85",
        entityTypeQualifier: "2",
        name: "BILLING CLINIC INC",
        idQualifier: "XX",
        idCode: "1234567890",
      },
      subscribers: [
        {
          info: {
            payerResponsibilityCode: "P",
            individualRelationshipCode: "18",
            claimFilingIndicator: "MB",
          },
          subscriber: {
            entityIdentifierCode: "IL",
            entityTypeQualifier: "1",
            name: "PATIENT",
            firstName: "TEST",
            idQualifier: "MI",
            idCode: "MEMBER001",
          },
          payer: {
            entityIdentifierCode: "PR",
            entityTypeQualifier: "2",
            name: "PAYER ONE",
            idQualifier: "PI",
            idCode: "PAYER01",
          },
          claims: [
            {
              claimId: "PT-ACCT-001",
              totalCharge: X12Decimal.fromString("150.00")!,
              diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
              serviceLines: [
                {
                  variant: "P",
                  procedureQualifier: "HC",
                  procedureCode: "99213",
                  charge: X12Decimal.fromString("150.00")!,
                  unitOfMeasure: "UN",
                  units: X12Decimal.fromString("1")!,
                  diagnosisPointers: ["1"],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const built = build837P(spec);

// One value, BOTH elements - GS-08 and ST-03 never disagree.
built.groups[0]?.gs.elements[8]; // => "005010X222A1"
built.groups[0]?.transactions[0]?.st.elements[3]; // => "005010X222A1"

// And it still reads back as a Professional claim, charge intact.
const builtTx = built.groups[0]?.transactions[0];
const readBack = builtTx ? get837Claims(built.delimiters, builtTx) : undefined;
readBack?.variant; // => "P"
readBack?.claims[0]?.serviceLines[0]?.charge?.toString(); // => "150.00"
```

**What it refuses of its own**, all `Claim837BuildError` with code `X12_837_BUILD_INVALID_SPEC`, and
no refusal message echoes the value you passed: an **empty** reference (a trailing empty element is
not emitted, so it would delete ST-03 and GS-08 rather than send them empty); one carrying an
**active delimiter or the release character** (this library's own reader would now carry it - the
envelope splitter honours the release escape in current releases - but a
trading partner's parser is not obliged to, and a guide identifier has no legitimate use for a
delimiter, so the refusal is kept); and one this library's own reader resolves to a **different 837 variant**, such as
`005010X223A2` handed to `build837P`, which would emit a file declaring one variant and carrying
another's service segments. Those are on top of the element-type guard every string slot in every
builder already has, which refuses a non-string with the same code, so read the list as what this
field adds rather than as everything that can refuse.

**Anything else is emitted as given.** The set of published errata is not provably exhaustive, so an
identifier this library does not recognise is your call, not an error - with one honest cost: on
reading such a file back, this library falls through to the `SVx` scan for the variant, exactly as it
does for any unrecognised ST-03. The **length** is not bounded either, and the two elements' maxima
differ: GS-08 is data element 480 (`AN 1/12`), ST-03 is element 1705 (`AN 1/35`).

**🩺 A guard on this element still cannot make the element trustworthy, but the reason narrowed.**
An active delimiter in a _different_ envelope field (a control number, an application sender code)
used to split its own segment and shift every element after it, so ST-03 and GS-08 were read out of
a neighbour's slot, mostly with nothing warned. A **release-escaped** one no longer does: the
envelope splitter honours the escape, so a sender who escapes correctly is now read correctly. An
**unescaped** one still ends its element, because that is what a delimiter is, and no refusal here
can reach it. **And that change is symmetric**: an envelope element ending in a **literal `?`** now
merges with its successor, which can destroy ST-03 outright and send the document to the `SVx`
variant fallback. The full behaviour change on already-published decoding, both directions, is
measured in `KNOWN-LIMITATIONS.md`.

---

## 6. Read a 278 services review: the certification decision

**The problem:** you asked a utilization management organization to authorize a service, and the 278
response came back. You need the **certification action** (was it certified, pended, denied?) and the
authorization number to put on the claim you are about to send.

`get278Request(delimiters, tx)` and `get278Response(delimiters, tx)` read the two directions of one
implementation guide. Both are 278s, so route on the direction the model reports rather than on
`ST-01` alone; a reader hands back `undefined` for a transaction it does not decode.

**The `HCR-01` certification action is the field this library places verbatim and never infers.** It
is response-only: a request carries no decision at all, and `review.decision` is `undefined` there
rather than defaulted to anything.

```ts runnable
import { parseX12, get278Response } from "@cosyte/x12";

const raw278 = [
  "ISA*00*          *00*          *ZZ*UMOPAYER       *ZZ*SUBMITTER      *260601*1230*^*00501*000000002*0*P*:~",
  "GS*HI*UMOPAYER*SUBMITTER*20260601*1230*1*X*005010X216~",
  "ST*278*0002*005010X216~",
  "BHT*0078*11*AUTHRESP-202606*20260601*1230~",
  "HL*1**20*1~",
  "NM1*X3*2*UTILIZATION REVIEW CO*****PI*UMO001~",
  "HL*2*1*21*1~",
  "NM1*1P*2*RENDERING CLINIC*****XX*1234567893~",
  "HL*3*2*22*1~",
  "NM1*IL*1*DOE*JANE****MI*MBR0001~",
  "DMG*D8*19850515*F~",
  "HL*4*3*EV*1~",
  "TRN*1*AUTHREQ-202606-0001*9SUBMITTER~",
  "UM*HS*I*1~",
  "HCR*A1*AUTH123456~",
  "DTP*472*RD8*20260601-20260605~",
  "HI*ABK:E1165~",
  "SE*16*0002~",
  "GE*1*1~",
  "IEA*1*000000002~",
].join("");

const ix278 = parseX12(raw278);
const tx278 = ix278.groups[0]?.transactions.find((t) => t.st.elements[1] === "278");
const review278 = tx278 ? get278Response(ix278.delimiters, tx278) : undefined;

review278?.direction; // => "response"
review278?.warnings.length; // => 0
review278?.utilizationManagementOrganization?.name; // => "UTILIZATION REVIEW CO"
review278?.subscriber?.idCode; // => "MBR0001"

const review = review278?.reviews[0];

// The trace that reassociates this answer to the request you sent.
review?.traces[0]?.referenceId; // => "AUTHREQ-202606-0001"
review?.requestCategoryCode; // => "HS"
review?.certificationTypeCode; // => "I"

// HCR-01: the certification action, verbatim, never inferred from anything else.
review?.decision?.actionCode; // => "A1"
review?.decision?.reviewIdentificationNumber; // => "AUTH123456"

// The diagnosis carries its code system, resolved from the HI qualifier.
review?.diagnoses[0]?.qualifier; // => "ABK"
review?.diagnoses[0]?.code; // => "E1165"
review?.diagnoses[0]?.codeSystem; // => "ICD-10-CM"
```

**One thing to know before you build a 278 rather than read one.** Every `HL-03` in this library is a
library constant chosen by tree position, with a single exception: `Build278ReviewSpec.levelCode`,
which you supply and which the guides limit to `EV` (patient event) and `SS` (service). A level
outside those two emits a perfectly well-formed document whose review loop no reader opens, so the
review **and its certification decision** would come back absent with no warning. `build278Request`
and `build278Response` therefore **refuse** an out-of-enum level rather than emit a document that
loses it. Omit `levelCode` and it defaults to `EV`.

---

## 7. Walk an 834 enrollment roster: one member at a time

**The problem:** a plan sponsor sent a benefit enrollment and maintenance file. You need the header
(who sponsored it, who the payer is), then each member, each member's coverage, and above all what to
**do** with each one: add, change, or terminate.

The 834 splits into two calls, because the two halves have different shapes.
`get834Header(delimiters, tx)` is a small synchronous read that stops at the first `INS`.
`get834Enrollments(delimiters, tx)` is an **async iterable** yielding one decoded member per `INS`
loop, so a consumer of a large roster holds one member at a time rather than the whole decoded file.

```ts runnable
import { parseX12, get834Header, get834Enrollments, type X12Enrollment } from "@cosyte/x12";

const raw834 = [
  "ISA*00*          *00*          *ZZ*EMPLOYERCO     *ZZ*MEDPAY         *260601*1200*^*00501*000000001*0*P*:~",
  "GS*BE*EMPLOYERCO*MEDPAY*20260601*1200*1*X*005010X220A1~",
  "ST*834*0001~",
  "BGN*00*ENR-202606*20260601*1200****2~",
  "REF*38*POLICY-0001~",
  "DTP*007*D8*20260601~",
  "N1*P5*EMPLOYER CO*FI*444556666~",
  "N1*IN*MEDPAY INSURANCE*FI*111223333~",
  "INS*Y*18*021*EC*A***FT~",
  "REF*0F*MBR0001~",
  "REF*1L*GROUP-0001~",
  "DTP*356*D8*20260101~",
  "NM1*IL*1*DOE*JANE*A***MI*MBR0001~",
  "N3*100 MAIN ST~",
  "N4*COLUMBUS*OH*43215~",
  "DMG*D8*19850515*F~",
  "HD*021**HLT*GOLD PPO*FAM~",
  "DTP*348*D8*20260101~",
  "AMT*P3*125.00~",
  "INS*N*01*024*XN*A***TE~",
  "REF*0F*MBR0002~",
  "NM1*IL*1*ROE*JOHN****MI*MBR0002~",
  "DMG*D8*19900101*M~",
  "HD*024**DEN~",
  "DTP*349*D8*20260531~",
  "SE*23*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("");

const ix834 = parseX12(raw834);
const tx834 = ix834.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
if (tx834 === undefined) throw new Error("no 834 in interchange");

const header = get834Header(ix834.delimiters, tx834);
header?.transactionSetPurposeCode; // => "00"
header?.referenceId; // => "ENR-202606"
header?.sponsor?.name; // => "EMPLOYER CO"
header?.payer?.name; // => "MEDPAY INSURANCE"

// One member at a time, in transmitted order.
const members: X12Enrollment[] = [];
for await (const member of get834Enrollments(ix834.delimiters, tx834)) members.push(member);

members.length; // => 2

// INS-03 is the maintenance type: the safety-critical field of this document.
// The verbatim code is ALWAYS on the model; the description is looked up beside
// it and never in place of it.
const added = members[0];
added?.subscriberIndicator; // => "Y"
added?.maintenanceTypeCode; // => "021"
added?.maintenanceTypeDescription; // => "Addition"
added?.member?.lastName; // => "DOE"
added?.member?.idCode; // => "MBR0001"

// Coverage sits under the member, with its own dates and amounts. Money is
// X12Decimal here as everywhere.
added?.healthCoverages[0]?.insuranceLineCode; // => "HLT"
added?.healthCoverages[0]?.planCoverageDescription; // => "GOLD PPO"
added?.healthCoverages[0]?.amounts[0]?.amount.toString(); // => "125.00"

const terminated = members[1];
terminated?.maintenanceTypeCode; // => "024"
terminated?.maintenanceTypeDescription; // => "Cancellation or Termination"
terminated?.healthCoverages[0]?.insuranceLineCode; // => "DEN"
```

**Never infer an action for a maintenance-type code this library does not recognise.** An unknown
`INS-03` or `HD-01` keeps its verbatim code, gets **no** description, and raises
`X12_834_UNKNOWN_MAINTENANCE_TYPE` on **that member's own** `warnings` rather than on the
interchange's. Terminating coverage because a code did not resolve is the harm this rule exists to
prevent, so gate on the warning and route the member to a human.

Two honest bounds on the stream. It iterates an **already-parsed** transaction set, so the file is
fully parsed into `tx.segments` before iteration begins: the memory win is on the result side, not
the input side, and this is not a byte-streaming reader for arbitrarily large files. And a coverage
`AMT` whose amount does not decode loses its whole row, reported by `X12_AMOUNT_ROW_DROPPED` on that
member.

---

## 8. Parse a 999 acknowledgment: disposition + segment errors

**The problem:** you submitted an 837 and got a 999 back. Was the batch accepted? If not, which
segments and elements failed, and where?

`parse999(raw)` takes the raw bytes directly (it parses the envelope for you) and returns an
`X12Ack999`, or `undefined` if there's no 999 in the interchange.

```ts
import { parse999, isAcceptDisposition, X12_ACK_DISPOSITION_CODES } from "@cosyte/x12";

const ack = parse999(raw999);
if (ack === undefined) throw new Error("no 999 in interchange");

// AK9: the functional-group disposition + counts.
ack.ak9.disposition; // "A" accepted | "E" accepted-with-errors | "R" rejected | ...
ack.ak9.numberOfReceivedTransactionSets; // e.g. 1
ack.ak9.numberOfAcceptedTransactionSets; // e.g. 0

// One boolean for "did this pass?": accept dispositions are A / E / P.
if (!isAcceptDisposition(ack.ak9.disposition)) {
  // The group was rejected. Dig into the per-transaction responses.
}

for (const response of ack.transactionResponses) {
  response.ak2.transactionSetIdCode; // "837"
  response.ak2.transactionSetControlNumber; // "0001": matches your ST-02
  response.ik5.disposition; // per-transaction disposition (=== X12_ACK_DISPOSITION_CODES.R?)

  // IK3: segment-level error notes.
  for (const segNote of response.segmentNotes) {
    segNote.ik3.segmentIdCode; // "NM1": which segment
    segNote.ik3.segmentPositionInTransactionSet; // 8
    segNote.ik3.loopIdentifier; // "2010BA"
    segNote.ik3.syntaxErrorCode; // "8" (segment has data element errors)

    // IK4: element-level notes nested under the segment.
    for (const elemNote of segNote.elementNotes) {
      elemNote.ik4.position.element; // 1
      elemNote.ik4.position.component; // 2 (composite subelement)
      elemNote.ik4.syntaxErrorCode; // "7" (invalid code value)
    }
  }
}
```

`X12_ACK_DISPOSITION_CODES` is the code registry if you prefer explicit comparisons
(`ack.ak9.disposition === X12_ACK_DISPOSITION_CODES.R`).

### The TA1 interchange acknowledgment sits one envelope out

A 999 acknowledges a functional group. A **TA1** acknowledges the **interchange** itself: it says
whether the ISA / IEA envelope was readable at all, and it is the answer you get when the file never
reached the point of having a functional group to report on. It has its own pair, `parseTA1(ix)` and
`buildTA1(spec)`, and `parseTA1` takes the parsed interchange rather than raw bytes because a TA1 is
an envelope-level segment.

```ts runnable
import { parseX12, parseTA1, isAcceptDisposition, TA1_ACK_CODES } from "@cosyte/x12";

// An interchange carrying nothing but a TA1: no functional group at all.
const rawTa1 =
  "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         " +
  "*220101*1230*^*00501*000000020*0*P*:~" +
  "TA1*000000019*220101*1200*A*000~" +
  "IEA*0*000000020~";

const ixTa1 = parseX12(rawTa1);
const ta1 = parseTA1(ixTa1);

ixTa1.groups.length; // => 0
ta1?.interchangeControlNumber; // => "000000019"
ta1?.ackCode; // => TA1_ACK_CODES.A
ta1?.noteCodeRaw; // => "000"

// TA1-01 is the reassociation key: it echoes the ISA-13 of the interchange
// being acknowledged, verbatim, and is how you match this answer to the file
// you sent. It is NOT this interchange's own control number.
ta1?.interchangeControlNumber === ixTa1.isa.elements[13]; // => false

// One boolean for "did the envelope pass?", shared with the 999 dispositions.
isAcceptDisposition(ta1?.ackCode ?? ""); // => true

// The five decoded fields are post-`?`-unescape; `ta1.raw` is the segment as
// transmitted, so do not apply `unescapeRelease` to the decoded ones yourself.
ta1?.raw.raw; // => "TA1*000000019*220101*1200*A*000"
```

`buildTA1` is the emit half, and it is a pure function like every other builder: it never auto-sends,
opens a socket, or touches the filesystem. It refuses an empty element at all five slots rather than
emitting a short segment, and it releases an active delimiter in a value rather than letting it shift
the disposition element. What it cannot verify is the envelope you will embed the segment in, so
state your delimiter set on `BuildTA1Options` if it differs from the default, or a value carrying a
byte that is a delimiter there and not here comes back with a stray release character.

---

## 9. Handle warnings: the lenient, never-throw contract

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
    // w.code: a stable string from WARNING_CODES
    // w.message: a frozen-registry entry, never built from your document
    // w.position: where in the interchange it occurred
  },
});

// Or read them after the fact:
for (const w of ix.warnings) {
  if (w.code === WARNING_CODES.X12_PRE_005010) {
    // sender is on a pre-005010 version family: tolerated, not fatal
  }
}
```

**Escalate when you want strictness.** Pass `{ strict: true }` to turn every tolerated deviation into
a thrown `X12ParseError` carrying the same warning code, useful for a spec-conformance gate on a
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
        // A malformed interchange: the bytes aren't X12.
        break;
    }
  }
}
```

Everything a real-world payer or clearinghouse does short of that (miscounts, dangling release chars,
unknown CARC/RARC/HI codes, HL parent mismatches, balance mismatches, pre-005010 versions) is a
warning you triage, not an exception you catch.

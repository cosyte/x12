---
id: route-claim-status-responses
title: Route 277CA acknowledgments and 277 status responses
sidebar_label: Route 277 and 277CA responses
description: "Read a 277CA to learn which submitted claims were accepted or rejected, and a 277 to read a payer's answer to a claim status request."
---

# Route 277CA acknowledgments and 277 status responses

Two different documents arrive as a 277, and each has its own reader:

- A **277CA** (implementation guide `005010X214`) acknowledges a batch of claims you submitted:
  per claim, was it accepted into adjudication or rejected at the front door?
  `get277CADisposition(delimiters, tx)` reads it, and returns `undefined` for any 277 that does not
  declare that guide.
- A **277** status response (`005010X212`) answers a 276 claim status request.
  `get277Status(delimiters, tx)` reads it, and admits either guide.

Both return an [`X12ClaimStatusResponse`](./api/src.md#x12claimstatusresponse). The status
lives in STC triples: a claim status category code (CSCC), a claim status code (CSC), and the
entity the status is about.

## Route the rejections in a 277CA

Categories `A1` and `A2` mean acknowledged and accepted into adjudication; anything else is a
reject to rework.

```ts runnable
import { parseX12, get277CADisposition } from "@cosyte/x12";

const raw277ca = [
  "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*CLEARINGHOUSE  *260601*1200*^*00501*000000020*0*P*:~",
  "GS*HN*MEDPAY*CLEARINGHOUSE*20260601*1200*20*X*005010X214~",
  "ST*277*0001*005010X214~",
  "BHT*0085*08*277CA-BATCH-001*20260601*1200*TH~",
  "HL*1**20*1~",
  "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
  "HL*2*1*21*1~",
  "NM1*41*2*CLEARINGHOUSE INC*****46*CLRHS01~",
  "TRN*1*BATCH-2026-06-01-001~",
  "STC*A1:19:PR*20260601*WQ*5000~",
  "QTY*90*1~",
  "AMT*YU*5000~",
  "HL*3*2*19*1~",
  "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
  "TRN*2*PROVIDER-CLAIM-TRACE-001~",
  "STC*A2:20:PR*20260601*WQ*150~",
  "REF*1K*PCN20260601001~",
  "DTP*050*D8*20260601~",
  "HL*4*3*22*0~",
  "NM1*IL*1*DOE*JANE****MI*MBR0001~",
  "TRN*2*CLAIM-TRACE-REJECT-001~",
  "STC*A7:21:PR*20260601*U*150~",
  "REF*1K*PCN20260601002~",
  "SE*22*0001~",
  "GE*1*20~",
  "IEA*1*000000020~",
].join("\n");

const ix = parseX12(raw277ca);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
const ack = tx ? get277CADisposition(ix.delimiters, tx) : undefined;
if (ack === undefined) throw new Error("not a 277CA (005010X214)");

ack.transactionType; // => "claim-acknowledgment"

const rejected: string[] = [];
for (const claim of ack.claims) {
  const stc = claim.statuses[0]?.statuses[0];
  if (stc === undefined) continue;
  // A1 / A2 = accepted into the adjudication system; anything else is a reject.
  const accepted = stc.categoryCode === "A1" || stc.categoryCode === "A2";
  if (!accepted) rejected.push(claim.traces[0]?.referenceId ?? "(no trace)");
}

// The trace you submitted comes back, so reassociate on it.
// The trace numbers, read and never printed. Synthetic value:
rejected; // => ["CLAIM-TRACE-REJECT-001"]

const reject = ack.claims[2]?.statuses[0]?.statuses[0];
reject?.categoryCode; // => "A7"
reject?.statusCode; // => "21"
reject?.statusDescription; // => undefined
reject?.entityCode; // => "PR"
```

Each claim's `traces` echo the `TRN-02` you submitted. An unknown category or status code is kept
verbatim and raises `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` or `X12_UNKNOWN_CLAIM_STATUS`; the code is
never dropped.

## Read a 277 status response

The `005010X212` response carries the same STC triple plus the claim-level totals and the Loop
2220 service lines, and it echoes the requesting 276's `TRN-02` so you can reassociate:

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
// A trace number, read and never printed. Synthetic value:
statusClaim?.traces[0]?.referenceId; // => "ECHO-276-TRACE-001"
// Read, never printed: the claim number identifies the patient's claim. Synthetic value:
statusClaim?.references[0]?.value; // => "PCN0001"

// The claim-level STC: the triple, plus what the status is ABOUT.
const info = statusClaim?.statuses[0];
info?.actionCode; // => "WQ"
info?.totalChargeAmount?.toString(); // => "150"
info?.statuses[0]?.categoryCode; // => "A2"
info?.statuses[0]?.statusCode; // => "20"
info?.statuses[0]?.statusDescription; // => undefined

// Loop 2220 carries the per-line answer.
statusClaim?.serviceLines[0]?.procedureCode; // => "99213"
statusClaim?.serviceLines[0]?.statuses[0]?.statuses[0]?.statusCode; // => "20"
```

To send these documents rather than read them, `build277` and `build277CA` echo the 276's trace
the same way `build271` echoes a 270's; [Answer an eligibility inquiry](./answer-an-eligibility-inquiry.md)
shows the pattern.

## Related

- [Read eligibility and claim status inquiries](./read-inquiries.md): the 276 these responses answer.
- [Tolerance tiers and warning codes](./spec-notes-tolerance.md): what the readers tolerate.
- Reference: [`get277CADisposition`](./api/src.md#get277cadisposition),
  [`get277Status`](./api/src.md#get277status),
  [`X12ClaimStatusResponse`](./api/src.md#x12claimstatusresponse).

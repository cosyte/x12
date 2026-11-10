---
id: read-an-enrollment-roster
title: Read an 834 enrollment roster
sidebar_label: Read an 834 roster
description: "Read an 834's sponsor and payer, then each member one at a time, with the maintenance type that says whether to add, change or terminate."
---

# Read an 834 enrollment roster

A plan sponsor sent a benefit enrollment and maintenance file. You need the header
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

**Never infer an action for a maintenance-type code this library does not recognize.** An unknown
`INS-03` or `HD-01` keeps its verbatim code, gets **no** description, and raises
`X12_834_UNKNOWN_MAINTENANCE_TYPE` on **that member's own** `warnings` rather than on the
interchange's. Terminating coverage because a code did not resolve is the harm this rule exists to
prevent, so gate on the warning and route the member to a human.

Two honest bounds on the stream. It iterates an **already-parsed** transaction set, so the file is
fully parsed into `tx.segments` before iteration begins: the memory win is on the result side, not
the input side, and this is not a byte-streaming reader for arbitrarily large files. And a coverage
`AMT` whose amount does not decode loses its whole row, reported by `X12_AMOUNT_ROW_DROPPED` on that
member.

## Related

- [Decimal-exact money](./spec-notes-money.md): why a coverage amount that does not decode reads
  `undefined`.
- Reference: [`get834Header`](./api/README.md#get834header),
  [`get834Enrollments`](./api/README.md#get834enrollments),
  [`lookupMaintenanceType`](./api/README.md#lookupmaintenancetype).

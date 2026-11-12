---
id: read-an-enrollment-roster
title: Read and build an 834 enrollment roster
sidebar_label: Read and build an 834 roster
description: "Read an 834's sponsor, payer and each member with the maintenance type that says add, change or terminate, and build one that reads back."
---

# Read and build an 834 enrollment roster

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
// The roster's reference number, read and never printed. Synthetic value:
header?.referenceId; // => "ENR-202606"
header?.sponsor?.name; // => "EMPLOYER CO"
header?.payer?.name; // => "MEDPAY INSURANCE"

// One member at a time, in transmitted order.
const members: X12Enrollment[] = [];
for await (const member of get834Enrollments(ix834.delimiters, tx834)) members.push(member);

members.length; // => 2

// INS-03 is the maintenance type: the safety-critical field of this document.
// The verbatim code is ALWAYS on the model. The INS-03 list ships no
// description text, so the description beside it is undefined.
const added = members[0];
added?.subscriberIndicator; // => "Y"
added?.maintenanceTypeCode; // => "021"
added?.maintenanceTypeDescription; // => undefined
// Read, never printed: the member's name and id identify a person. Synthetic values:
added?.member?.lastName; // => "DOE"
added?.member?.idCode; // => "MBR0001"

// Coverage sits under the member, with its own dates and amounts. Money is
// X12Decimal here as everywhere.
added?.healthCoverages[0]?.insuranceLineCode; // => "HLT"
added?.healthCoverages[0]?.planCoverageDescription; // => "GOLD PPO"
added?.healthCoverages[0]?.amounts[0]?.amount.toString(); // => "125.00"

const terminated = members[1];
terminated?.maintenanceTypeCode; // => "024"
terminated?.maintenanceTypeDescription; // => undefined
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

## Build a roster and read it back

`build834(spec)` writes `GS-01` `BE` and `005010X220A1` in `GS-08` and `ST-03`, counts the
segments, and returns an `X12Interchange`; it sends nothing and touches no file. The maintenance
type is written as given, never inferred, and the builder is stricter than the reader: an `INS-03`
or `HD-01` code outside the bundled list is **refused** with
`X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE`, because a roster that tells an enrollment system to do
something it cannot name is the harm the reader's warning exists to catch. No member, or an empty
`INS-03`, is refused with `X12_834_BUILD_INVALID_SPEC`. Both come as an
[`Enrollment834BuildError`](./api/src.md#enrollment834builderror).

```ts runnable
import {
  build834,
  Enrollment834BuildError,
  get834Enrollments,
  get834Header,
  X12Decimal,
  type Build834Spec,
  type X12Enrollment,
} from "@cosyte/x12";

const spec: Build834Spec = {
  envelope: {
    senderId: "EMPLOYERCO",
    receiverId: "MEDPAY",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  header: {
    transactionSetPurposeCode: "00",
    referenceId: "ENR-202606",
    date: "20260601",
    sponsor: {
      entityIdentifierCode: "P5",
      name: "EMPLOYER CO",
      idQualifier: "FI",
      idCode: "444556666",
    },
    payer: {
      entityIdentifierCode: "IN",
      name: "MEDPAY INSURANCE",
      idQualifier: "FI",
      idCode: "111223333",
    },
  },
  members: [
    {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021", // add
      benefitStatusCode: "A",
      member: { lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
      references: [{ qualifier: "0F", value: "MBR0001" }],
      healthCoverages: [
        {
          maintenanceTypeCode: "021",
          insuranceLineCode: "HLT",
          planCoverageDescription: "GOLD PPO",
          coverageLevelCode: "FAM",
          dates: [{ qualifier: "348", value: "20260101" }],
          amounts: [{ qualifier: "P3", amount: X12Decimal.fromString("125.00")! }],
        },
      ],
    },
  ],
};

const built = build834(spec);
built.groups[0]?.gs.elements[1]; // => "BE"
built.groups[0]?.transactions[0]?.st.elements[3]; // => "005010X220A1"

const tx = built.groups[0]?.transactions[0];
if (tx === undefined) throw new Error("no 834 built");
get834Header(built.delimiters, tx)?.sponsor?.name; // => "EMPLOYER CO"

const members: X12Enrollment[] = [];
for await (const member of get834Enrollments(built.delimiters, tx)) members.push(member);
members[0]?.maintenanceTypeCode; // => "021"
members[0]?.maintenanceTypeDescription; // => undefined
members[0]?.healthCoverages[0]?.amounts[0]?.amount.toString(); // => "125.00"
members[0]?.warnings.length; // => 0

// A maintenance type outside the bundled list is refused, never written.
let refused: string | undefined;
try {
  build834({ ...spec, members: [{ ...spec.members[0]!, maintenanceTypeCode: "999" }] });
} catch (err) {
  if (err instanceof Enrollment834BuildError) refused = err.code;
}
refused; // => "X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE"
```

## Related

- [Decimal-exact money](./spec-notes-money.md): why a coverage amount that does not decode reads
  `undefined`.
- Reference: [`get834Header`](./api/src.md#get834header),
  [`get834Enrollments`](./api/src.md#get834enrollments),
  [`build834`](./api/src.md#build834), [`Build834Spec`](./api/src.md#build834spec),
  [`Enrollment834BuildError`](./api/src.md#enrollment834builderror),
  [`lookupMaintenanceType`](./api/src.md#lookupmaintenancetype).

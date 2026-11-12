---
id: acknowledge-an-interchange
title: Acknowledge an interchange with a TA1 and a 999
sidebar_label: Acknowledge an interchange
description: "Derive the TA1 and the 999 you send back from what the parser found, then build them."
---

# Acknowledge an interchange with a TA1 and a 999

You received an interchange and owe the sender an answer: a TA1 about its envelope, and a 999 for
each functional group in it. `parseX12` already found every problem we check, as warnings.
`deriveTA1Spec` and `derive999Spec` turn those warnings into the specs `buildTA1` and `build999`
take, so you do not map them by hand.

## What a derived acknowledgment checks

Only what this package checks: the interchange envelope and the syntax of the ASC X12 base
standard. That is control numbers that agree between header and trailer, counts that agree, trailers
that arrived, segments where the envelope puts them, and release characters and binary lengths that
frame. We never check implementation guide usage (a required segment missing, a code outside a
guide's list, a loop repeated too often), so a derived 999 never reports it. If you validate a guide,
add your findings to the spec we return before you build it.

So a derived accept means the envelope and the base syntax read clean, and nothing more. It does not
mean the file meets the implementation guide or any payer's companion guide.

Each warning code has one row in `ACK_WARNING_MAPPINGS`: the code a TA1 or a 999 carries for it, or
the reason it carries none.

| Warning                           | Where it sits                     | What the acknowledgment says                |
| --------------------------------- | --------------------------------- | ------------------------------------------- |
| `X12_CONTROL_NUMBER_MISMATCH`     | ISA-13 and IEA-02                 | TA1 `R`, note `001`                         |
| `X12_GROUP_COUNT_MISMATCH`        | IEA-01                            | TA1 `R`, note `021`                         |
| `X12_MISSING_IEA`                 | the interchange                   | TA1 `R`, note `023`                         |
| `X12_UNEXPECTED_SEGMENT`          | outside every transaction set     | TA1 `R`, note `024`                         |
| `X12_ISA_EXTRA_ELEMENT_SEPARATOR` | the ISA                           | TA1 `R`, note `026`                         |
| `X12_MISSING_GE`                  | a functional group                | AK9 `R`, AK9-05 `3`                         |
| `X12_CONTROL_NUMBER_MISMATCH`     | GS-06 and GE-02                   | AK9 `R`, AK9-05 `4`                         |
| `X12_TRANSACTION_COUNT_MISMATCH`  | GE-01                             | AK9 `R`, AK9-05 `5`                         |
| `X12_MISSING_SE`                  | a transaction set                 | IK5 `R`, IK5-02 `2`                         |
| `X12_CONTROL_NUMBER_MISMATCH`     | ST-02 and SE-02                   | IK5 `R`, IK5-02 `3`                         |
| `X12_UNEXPECTED_SEGMENT`          | a TA1 inside a transaction set    | IK3-04 `2`, IK5 `R` with IK5-02 `5`         |
| `X12_DANGLING_RELEASE_CHAR`       | a segment of a transaction set    | IK3-04 `8` and IK4-03 `6`, IK5 `R` with `5` |
| `X12_BINARY_DATA_TRUNCATED`       | a BDS or BIN of a transaction set | IK3-04 `8` and IK4-03 `4`, IK5 `R` with `5` |
| `X12_BINARY_LENGTH_INVALID`       | a BDS or BIN of a transaction set | IK3-04 `8`, no IK4, IK5 `R` with `5`        |
| `X12_BINARY_LENGTH_MISMATCH`      | a BDS or BIN of a transaction set | IK3-04 `8`, no IK4, IK5 `R` with `5`        |

A segment outside every transaction set includes one whose first element is empty
(`*TESTDATA*MORE~`): `parseX12` keeps it as an orphan and warns `X12_UNEXPECTED_SEGMENT` as it does
for any other, so the TA1 rejects it with note `024` and the 999 for its group leaves it to the
TA1.

Nothing else is reported, and each row of the table says why:

- `X12_PRE_005010`: which versions you support is your trading partner agreement, and the parse
  reads the interchange either way.
- `X12_TRAILING_GARBAGE`: the bytes follow the IEA, so they are not part of the interchange you
  acknowledge. Parse and acknowledge them on their own.
- `X12_BINARY_LENGTH_UNVERIFIABLE`: a limit of reading a string, not a defect the sender made.
- `X12_DANGLING_RELEASE_CHAR` outside a transaction set: it sits in a segment already reported as
  unexpected.
- `X12_SEGMENT_COUNT_MISMATCH`: `serializeX12` raises it, never `parseX12`, so SE-01 is not checked
  against the segment count.
- Every other code: a typed reader raises it, about guide usage or content, never `parseX12`.

Both functions return `reported` and `unreported` beside the spec, so nothing the parse found
disappears in silence: each warning in the acknowledgment's scope is in exactly one of the two.

## Answer a clean interchange

```ts runnable
import {
  build999,
  buildTA1,
  derive999Spec,
  deriveTA1Spec,
  parse999,
  parseX12,
  serializeX12,
} from "@cosyte/x12";

// A synthetic claim batch: one functional group of one 837, every count and control number agreeing.
const inbound = [
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260601*1200*^*00501*000000001*0*P*:~",
  "GS*HC*SUBMITTER*RECEIVER*20260601*1200*7*X*005010X222A1~",
  "ST*837*0001*005010X222A1~",
  "BHT*0019*00*TESTREF1*20260601*1200*CH~",
  "SE*3*0001~",
  "GE*1*7~",
  "IEA*1*000000001~",
].join("");
const received = parseX12(inbound);

// The TA1 echoes ISA-13, ISA-09 and ISA-10 and accepts.
const ta1 = deriveTA1Spec(received);
ta1.spec.ackCode; // => "A"
// Read, never printed: the segment echoes the inbound control number. Synthetic values:
buildTA1(ta1.spec).raw; // => "TA1*000000001*260601*1200*A*000"

// The 999 for group 0 accepts its transaction set. The envelope is the 999's own.
const ack = derive999Spec(received, {
  envelope: {
    senderId: "RECEIVER",
    receiverId: "SUBMITTER",
    interchangeDate: "260601",
    interchangeTime: "1205",
    interchangeControlNumber: "000000101",
    groupControlNumber: "101",
    transactionSetControlNumber: "0101",
  },
});
ack.spec.functionalGroup.disposition; // => "A"
ack.reported; // => []

// The sender reads back what we built.
const read = parse999(serializeX12(build999(ack.spec)));
read?.ak9.disposition; // => "A"
read?.ak1.groupControlNumber; // => "7"
```

## Reject what does not hold together

Here the second transaction set closes with an SE-02 that is not its ST-02. The 999 rejects that
set with IK5-02 `3`, accepts the first, and partially accepts the group.

```ts runnable
import {
  build999,
  derive999Spec,
  deriveTA1Spec,
  parse999,
  parseX12,
  serializeX12,
} from "@cosyte/x12";

const inbound = [
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260601*1200*^*00501*000000002*0*P*:~",
  "GS*HC*SUBMITTER*RECEIVER*20260601*1200*8*X*005010X222A1~",
  "ST*837*0001*005010X222A1~",
  "BHT*0019*00*TESTREF1*20260601*1200*CH~",
  "SE*3*0001~",
  "ST*837*0002*005010X222A1~",
  "BHT*0019*00*TESTREF2*20260601*1200*CH~",
  "SE*3*0009~",
  "GE*2*8~",
  "IEA*1*000000002~",
].join("");
const received = parseX12(inbound);

// The envelope holds together, so the TA1 accepts.
deriveTA1Spec(received).spec.ackCode; // => "A"

const ack = derive999Spec(received, {
  envelope: {
    senderId: "RECEIVER",
    receiverId: "SUBMITTER",
    interchangeDate: "260601",
    interchangeTime: "1205",
    interchangeControlNumber: "000000102",
    groupControlNumber: "102",
    transactionSetControlNumber: "0102",
  },
});
ack.spec.functionalGroup.disposition; // => "P"
ack.spec.functionalGroup.numberOfAcceptedTransactionSets; // => 1
ack.spec.functionalGroup.transactionResponses[1]?.syntaxErrorCodes; // => ["3"]

const read = parse999(serializeX12(build999(ack.spec)));
read?.transactionResponses[1]?.ik5.disposition; // => "R"
```

An envelope that does not hold together rejects at the TA1. Here IEA-02 names a control number its
ISA-13 does not.

```ts runnable
import { deriveTA1Spec, parseX12, WARNING_CODES } from "@cosyte/x12";

const inbound = [
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260601*1200*^*00501*000000003*0*P*:~",
  "GS*HC*SUBMITTER*RECEIVER*20260601*1200*9*X*005010X222A1~",
  "ST*837*0001*005010X222A1~",
  "BHT*0019*00*TESTREF1*20260601*1200*CH~",
  "SE*3*0001~",
  "GE*1*9~",
  "IEA*1*000000009~",
].join("");

const ta1 = deriveTA1Spec(parseX12(inbound));
ta1.spec.ackCode; // => "R"
ta1.spec.noteCode; // => "001"
ta1.reported[0]?.code === WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH; // => true
```

## Decide what you send

The spec is plain data, so you can change it before you build it:

- A TA1 carries one note. With several interchange findings, the first in parse order is reported
  and the others are in `unreported`.
- Every mapped finding rejects, and nothing derives `E` (accepted with errors noted). An `E` tells
  the sender we took the data and not to resend it, which is unsafe when a finding may mean data was
  lost or misread. If you know a finding lost nothing, set `ackCode` on the TA1 spec, or the
  disposition on the 999 spec, to `E` yourself.
- `derive999Spec` acknowledges one group, `groupIndex` (0 when omitted). Call it once per group in
  `interchange.groups`, each with its own envelope and control numbers.
- We never copy a value into IK4-04, write no CTX, and leave IK3-03 (the loop) out: loops belong to
  the implementation guide.
- A segment finding needs the position `parseX12` recorded for its transaction set. A transaction
  set you built by hand or copied has none, so the set is rejected with IK5-02 `5` but without an IK3,
  and the warning is in `unreported`.
- An empty GS-06 or ST-02 is echoed as it is, and `build999` refuses the spec rather than
  acknowledge something the sender cannot identify.

The runnable example
[`examples/acknowledge-from-parse.ts`](https://github.com/cosyte/x12/blob/main/examples/acknowledge-from-parse.ts)
does this end to end.

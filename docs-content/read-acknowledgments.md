---
id: read-acknowledgments
title: Read 999 and TA1 acknowledgments
sidebar_label: Read 999 and TA1 acknowledgments
description: "Read a 999's group and transaction dispositions with the segment and element errors, and a TA1's answer about the interchange envelope."
---

# Read 999 and TA1 acknowledgments

You submitted an 837 and got a 999 back. Was the batch accepted? If not, which segments and
elements failed, and where?

## Read a 999

`parse999(raw)` takes the raw bytes directly (it parses the envelope for you) and returns an
`X12Ack999`, or `undefined` if there's no 999 in the interchange.

```ts runnable
import { parse999, isAcceptDisposition, X12_ACK_DISPOSITION_CODES } from "@cosyte/x12";

// The answer to an 837 whose subscriber name segment had a bad element.
const raw999 = [
  "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1230*^*00501*000000011*0*P*:~",
  "GS*FA*RECEIVER*SENDER*20250101*1230*11*X*005010X231A1~",
  "ST*999*0011*005010X231A1~",
  "AK1*HC*2*005010X222A2~",
  "AK2*837*0002*005010X222A2~",
  "IK3*NM1*8*2010BA*8~",
  "IK4*1:2*66*7~",
  "IK5*E~",
  "AK9*E*1*1*1~",
  "SE*7*0011~",
  "GE*1*11~",
  "IEA*1*000000011~",
].join("\n");

const ack = parse999(raw999);
if (ack === undefined) throw new Error("no 999 in interchange");

// AK9: the functional group's disposition and counts.
ack.ak9.disposition; // => "E"
ack.ak9.numberOfReceivedTransactionSets; // => 1
ack.ak9.numberOfAcceptedTransactionSets; // => 1

// One boolean for "did this pass?": the accept dispositions are A, E and P.
isAcceptDisposition(ack.ak9.disposition); // => true
ack.ak9.disposition === X12_ACK_DISPOSITION_CODES.E; // => true

// Per transaction set: which one, and its own disposition.
const response = ack.transactionResponses[0];
response?.ak2.transactionSetIdCode; // => "837"
response?.ak2.transactionSetControlNumber; // => "0002"
response?.ik5.disposition; // => "E"

// IK3: the segment that had the error, and where.
const segmentNote = response?.segmentNotes[0];
segmentNote?.ik3.segmentIdCode; // => "NM1"
segmentNote?.ik3.segmentPositionInTransactionSet; // => 8
segmentNote?.ik3.loopIdentifier; // => "2010BA"
segmentNote?.ik3.syntaxErrorCode; // => "8"

// IK4: the element inside it, down to the component.
const elementNote = segmentNote?.elementNotes[0];
elementNote?.ik4.position.element; // => 1
elementNote?.ik4.position.component; // => 2
elementNote?.ik4.syntaxErrorCode; // => "7"

ack.warnings; // => []
```

A 999 that stops short still reads, fail-safe. A response whose `IK5` never arrived reads
`ik5.disposition` as `R`, and a 999 with no `AK9` reads `ak9.disposition` as `R` with all three
counts at 0. That reject is ours, not the sender's, and `ack.warnings` says so: `X12_999_IK5_ABSENT`
at the `AK2` whose `IK5` is missing, and `X12_999_AK9_ABSENT` at the `ST`. A disposition the reader
cannot read (absent, empty, or not one of `A`, `E`, `P`, `R`, `M`, `W`, `X`) reads as `R` too, with
`X12_999_IK5_DISPOSITION_UNKNOWN` or `X12_999_AK9_DISPOSITION_UNKNOWN` at that segment. Check for
them before you resubmit on a reject. A 999 with no `AK1` reads `ak1.functionalIdCode` and `ak1.groupControlNumber`
as empty strings, and `X12_999_AK1_ABSENT` at the `ST` says the 999 named no group: do not match it to
one of yours by those empty values.

## Read a TA1 interchange acknowledgment

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
ta1 !== undefined && isAcceptDisposition(ta1.ackCode); // => true

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

## Related

- [Warning and error codes](./warning-and-error-codes.md#x12_999_ik5_absent): the 999 reader's
  fail-safe warnings.
- Reference: [`parse999`](./api/README.md#parse999), [`parseTA1`](./api/README.md#parseta1),
  [`buildTA1`](./api/README.md#buildta1), [`build999`](./api/README.md#build999).

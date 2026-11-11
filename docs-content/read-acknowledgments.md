---
id: read-acknowledgments
title: Read 999, 997 and TA1 acknowledgments
sidebar_label: Read 999, 997 and TA1 acknowledgments
description: "Read the dispositions and errors a 999 or a 997 reports, build a 997, and read a TA1's answer about the envelope."
---

# Read 999, 997 and TA1 acknowledgments

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

## Read and build a 997

Some trading partners still answer with a **997 Functional Acknowledgment** instead of a 999. It
sits on the same segments: `AK1` and `AK9` for the functional group, `AK2` for each transaction set,
and `AK3`, `AK4` and `AK5` where the 999 has `IK3`, `IK4` and `IK5`. No implementation guide names
it, so we read and write it to the ASC X12 base standard alone: GS-08 is `005010`, the `ST` carries
no `ST-03`, and no declared guide is checked. `parse997(raw)` returns an `X12Ack997`, or `undefined`
if there is no 997 in the interchange.

The 997 reader fills nothing in, where the 999 reader fills in a reject. An absent `AK1`, `AK5` or
`AK9` reads as `undefined`, and a disposition outside its code list reads as an `undefined`
`disposition` beside `dispositionRaw`, the code as sent. A segment out of order, or one the 997
does not define (a `CTX`, an `IK5`), is not read. Each case warns, so check
`disposition === "A"` rather than "not rejected".

```ts runnable
import { build997, parse997, serializeX12, WARNING_CODES } from "@cosyte/x12";

// The answer to two 837s: the first accepted, the second rejected on a bad NM1 element.
const raw997 = [
  "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1230*^*00501*000000022*0*P*:~",
  "GS*FA*RECEIVER*SENDER*20250101*1230*22*X*005010~",
  "ST*997*0022~",
  "AK1*HC*4*005010X222A2~",
  "AK2*837*0004~",
  "AK5*A~",
  "AK2*837*0005~",
  "AK3*NM1*8*2010BA*8~",
  "AK4*3*66*7~",
  "AK5*R*5~",
  "AK9*P*2*2*1~",
  "SE*10*0022~",
  "GE*1*22~",
  "IEA*1*000000022~",
].join("\n");

const ack = parse997(raw997);
if (ack === undefined) throw new Error("no 997 in interchange");

ack.ak1?.groupControlNumber; // => "4"
ack.ak9?.disposition; // => "P"
ack.ak9?.numberOfAcceptedTransactionSets; // => 1

const rejected = ack.transactionResponses[1];
rejected?.ak2.transactionSetControlNumber; // => "0005"
rejected?.ak5?.disposition; // => "R"
rejected?.segmentNotes[0]?.ak3.segmentIdCode; // => "NM1"
rejected?.segmentNotes[0]?.elementNotes[0]?.syntaxErrorCode; // => "7"
ack.warnings; // => []

// A code outside list 717 is carried as sent, never read as a reject or an accept.
const odd = parse997(raw997.replace("AK5*A~", "AK5*Q~"));
odd?.transactionResponses[0]?.ak5?.disposition; // => undefined
odd?.transactionResponses[0]?.ak5?.dispositionRaw; // => "Q"
odd?.warnings[0]?.code === WARNING_CODES.X12_997_AK5_DISPOSITION_UNKNOWN; // => true

// build997 writes the same document back from a spec.
const built = build997({
  envelope: {
    senderId: "RECEIVER",
    receiverId: "SENDER",
    interchangeDate: "250101",
    interchangeTime: "1230",
    interchangeControlNumber: "000000022",
    groupControlNumber: "22",
    transactionSetControlNumber: "0022",
  },
  functionalGroup: {
    functionalIdCode: "HC",
    groupControlNumber: "4",
    versionRelease: "005010X222A2",
    disposition: "P",
    numberOfTransactionSets: 2,
    numberOfReceivedTransactionSets: 2,
    numberOfAcceptedTransactionSets: 1,
    transactionResponses: [
      { transactionSetIdCode: "837", transactionSetControlNumber: "0004", disposition: "A" },
      {
        transactionSetIdCode: "837",
        transactionSetControlNumber: "0005",
        disposition: "R",
        syntaxErrorCodes: ["5"],
        segmentErrors: [
          {
            segmentIdCode: "NM1",
            segmentPositionInTransactionSet: 8,
            loopIdentifier: "2010BA",
            syntaxErrorCode: "8",
            elementErrors: [
              { position: { element: 3 }, dataElementReferenceNumber: "66", syntaxErrorCode: "7" },
            ],
          },
        ],
      },
    ],
  },
});
serializeX12(built) === raw997.replaceAll("\n", ""); // => true
```

`build997` refuses what the 999 builder refuses (an accept paired with errors, AK9 counts that
disagree, an empty control number) and what a 997 adds: an `AK9-01` outside code list 715, an
`AK5-01` outside code list 717 (which has no `P`: partial acceptance is stated for the group), a
count or position that is not a whole number, an empty `AK4-03`, and `contexts` on any segment or
element error, inherited ones included. A 999 error list type-checks as a 997 one, but the 997 has
no `CTX` segment, and `build997` never writes one whatever its spec holds. It reads your spec once,
so a getter cannot answer the checks one way and the writer another. The `AK3-04`, `AK4-03` and
syntax error codes you supply are written as given, escaped; no code table checks them.

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
  fail-safe warnings, and [the 997 reader's](./warning-and-error-codes.md#x12_997_ak5_absent).
- Reference: [`parse999`](./api/src.md#parse999), [`parseTA1`](./api/src.md#parseta1),
  [`buildTA1`](./api/src.md#buildta1), [`build999`](./api/src.md#build999).

---
id: answer-an-attachment-request
title: Answer a request for additional information with a 275
sidebar_label: Answer an attachment request
description: "Read a 277 request for additional information, then build the 275 that carries the requested document back, with its trace echoed."
---

# Answer a request for additional information with a 275

A health plan needs documentation before it can adjudicate a claim, so it sends a **277 request for
additional information** (implementation guide `006020X313`). The provider answers with a **275**
(`006020X314`) that carries each document as the binary data of a `BDS` segment. These are the two
claims attachments guides that 45 CFR 162.2002 adopts for the period on and after May 26, 2028.

**For these two guides the base X12 006020 structure is typed, and no implementation-guide usage is
checked.** The guides are sold, and no source this package carries states which segments,
qualifiers or codes they require, so the readers carry every code and qualifier verbatim and decide
nothing about whether it is valid for the guide, and the builders write exactly what you give them.
[KNOWN-LIMITATIONS.md](https://github.com/cosyte/x12/blob/main/KNOWN-LIMITATIONS.md) lists what
else they leave open.

## Read the request

`get277RequestForAdditionalInformation(delimiters, tx)` reads a 277 that declares `006020X313`. It
labels itself a request, never a claim status response, and carries each HL level as sent:

```ts runnable
import { parseX12, get277RequestForAdditionalInformation } from "@cosyte/x12";

const rawRequest = [
  "ISA*00*          *00*          *ZZ*PAYER01        *ZZ*CLINIC01       *260601*1200*^*00501*000000101*0*P*:~",
  "GS*HN*PAYER01*CLINIC01*20260601*1200*101*X*006020X313~",
  "ST*277*0001*006020X313~",
  "BHT*0010*08*RFAI-0001*20260601*1200*DG~",
  "HL*1**20*1~",
  "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
  "HL*2*1*21*1~",
  "NM1*41*2*CLINIC ONE*****46*RECVR01~",
  "HL*3*2*19*1~",
  "NM1*1P*2*CLINIC ONE*****XX*1234567890~",
  "HL*4*3*22*0~",
  "NM1*QC*1*DOE*JANE*A***MI*MBR0001~",
  "TRN*1*TRACE-0001*9SUBMITTER~",
  "STC*R0:18842-5::LOI*20260601*WQ*150.00~",
  "REF*1K*PCN0001~",
  "REF*EJ*PT-ACCT-001~",
  "SE*16*0001~",
  "GE*1*101~",
  "IEA*1*000000101~",
].join("");

const ix = parseX12(rawRequest);
const tx = ix.groups[0]?.transactions[0];
const request = tx ? get277RequestForAdditionalInformation(ix.delimiters, tx) : undefined;
if (request === undefined) throw new Error("not a 277 request for additional information");

request.transactionType; // => "request-for-additional-information"
request.warnings; // => []
request.levels.map((level) => level.levelCode); // => ["20", "21", "19", "22"]

// The claim-level request sits on the patient's level.
const asked = request.levels[3]?.requests[0];

// The trace your 275 answers, and the claim it is about.
asked?.traces[0]?.referenceId; // => "TRACE-0001"
asked?.references.map((r) => [r.qualifier, r.value]); // => [["1K", "PCN0001"], ["EJ", "PT-ACCT-001"]]

// What is being asked for: STC-01 here names a LOINC code (qualifier LOI).
const code = asked?.statuses[0]?.codes[0];
code?.categoryCode; // => "R0"
code?.statusCode; // => "18842-5"
code?.codeListQualifier; // => "LOI"
asked?.statuses[0]?.totalChargeAmount?.toString(); // => "150.00"
```

The request reader validates no hierarchy: each HL is carried with HL-01 to HL-04 as sent, no
parent pointer is checked, and no level code is expected.

## Build the 275 that answers it

`build275(spec)` writes one `LX` line per entry of `lines`, each with its `TRN`, `STC` and `REF`
and then one `BDS` per attachment, and sets each `BDS-02` to the true octet count of the data you
give it. It refuses only what would make a `BDS-02` untrue or a `BDS` empty: no attachment, empty
data, a filter code that is not three characters, or a character above U+00FF.

```ts runnable
import { build275, get275Attachments, parseX12, serializeX12 } from "@cosyte/x12";

const built = build275({
  envelope: {
    senderId: "CLINIC01",
    receiverId: "PAYER01",
    interchangeDate: "260602",
    interchangeTime: "0900",
    interchangeControlNumber: "000000202",
    groupControlNumber: "202",
    transactionSetControlNumber: "0001",
  },
  beginning: { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001" },
  entities: [
    {
      entityIdentifierCode: "PR",
      entityTypeQualifier: "2",
      lastOrOrganizationName: "PAYER ONE",
      idQualifier: "PI",
      idCode: "PAYER01",
    },
  ],
  lines: [
    {
      // Echo the request's trace and claim, and say which request this answers.
      trace: { traceTypeCode: "2", referenceId: "TRACE-0001" },
      status: { codes: [{ categoryCode: "R0", statusCode: "18842-5", codeListQualifier: "LOI" }] },
      references: [{ qualifier: "1K", value: "PCN0001" }],
      // The document, already base64-encoded by you: the filter code says so.
      attachments: [{ filterCode: "B64", data: "U1lOVEhFVElDIE5PVEU=" }],
    },
  ],
});

const text = serializeX12(built);
text.includes("ST*275*0001*006020X314~"); // => true
text.includes("BDS*B64*20*U1lOVEhFVElDIE5PVEU=~"); // => true

// Read it back the way the plan will.
const ix = parseX12(Buffer.from(text, "latin1"));
const tx = ix.groups[0]?.transactions[0];
const reading = tx ? get275Attachments(ix.delimiters, tx) : undefined;
const attachment = reading?.attachments[0];

attachment?.filterCode; // => "B64"
attachment?.declaredLength; // => "20"
attachment?.lengthVerified; // => true
attachment?.line?.traces[0]?.referenceId; // => "TRACE-0001"

// The data refuses to print: a log line carries its size, never its octets.
String(attachment?.data); // => "[X12AttachmentData: 20 octets withheld]"
JSON.stringify({ data: attachment?.data }); // => '{"data":"[X12AttachmentData: 20 octets withheld]"}'
attachment?.data.readOctets(); // => "U1lOVEhFVElDIE5PVEU="
```

Three things to hold onto:

- **An attachment is octets, and a string is not.** Pass an interchange carrying attachments to
  `parseX12` as a `Buffer`, which is read one character per octet, and write `serializeX12`'s
  output as latin1, as above. Encoding a character above U+007F as UTF-8 makes two octets of one,
  and `BDS-02` stops being true of what was sent.
- **Nothing inside an attachment is decoded.** `BDS-01` names a filter the sender applied (`B64`
  here); this package applies none, in either direction.
- **ISA-12 is not decided here.** Both builders write this package's default, `00501`, unless you
  supply `interchangeControlVersion`, and both readers key on `ST-03` and `GS-08`, never on ISA-12.

## Related

- [The envelope and loop model](./spec-notes-envelope.md#binary-segments-bds-and-bin): how a `BDS`
  is framed by its declared length.
- [Keeping PHI out of logs](./keeping-phi-out-of-logs.md): why only the attachment data refuses to
  print, and every other field is a plain string.
- Reference: [`get277RequestForAdditionalInformation`](./api/README.md#get277requestforadditionalinformation),
  [`build275`](./api/README.md#build275), [`get275Attachments`](./api/README.md#get275attachments),
  [`X12AttachmentData`](./api/README.md#x12attachmentdata).

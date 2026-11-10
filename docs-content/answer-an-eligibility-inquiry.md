---
id: answer-an-eligibility-inquiry
title: Answer an eligibility inquiry with a 271
sidebar_label: Answer an eligibility inquiry
description: "Build a 271 that echoes the inquiry's trace, read it back, and tell a rejected inquiry apart from a member with no benefits."
---

# Answer an eligibility inquiry with a 271

You are the payer side and need to send an eligibility **response**, and the provider has to be
able to match your answer to their question. The 271 echoes the requesting 270's `TRN-02`
**verbatim**; that trace is the reassociation key. [Read eligibility and claim status
inquiries](./read-inquiries.md) shows how to read the 270 the trace comes from.

## Build the 271 and read it back

`build271(spec)` computes the HL spine for you (source, receiver, subscriber, dependent) and
**refuses** a structurally impossible hierarchy with an `Eligibility271BuildError`. It returns a
frozen `X12Interchange`, and it never sends anything, opens a socket, or touches the filesystem.

```ts runnable
import {
  build271,
  get271Eligibility,
  serializeX12,
  X12Decimal,
  type Build271Spec,
} from "@cosyte/x12";

const traceFromThe270 = "ELIG20220627001"; // pulled from the inbound 270's TRN-02

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

// Read it back through the reader:
const tx = ix.groups[0]?.transactions[0];
const elig = tx ? get271Eligibility(ix.delimiters, tx) : undefined;

// The reassociation key comes back byte for byte.
elig?.subscribers[0]?.traces[0]?.referenceId === traceFromThe270; // => true
elig?.subscribers[0]?.name?.lastName; // => "DOE"
elig?.subscribers[0]?.benefits[0]?.eligibilityCode; // => "1"
elig?.subscribers[0]?.benefits[0]?.monetaryAmount?.toString(); // => "1000.00"

// serializeX12 gives you the bytes to send.
serializeX12(ix).includes(`TRN*2*${traceFromThe270}~`); // => true
```

`build277` and `build277CA` follow the same pattern for claim status responses, echoing the 276's
trace.

## Tell a rejected inquiry from a member with no benefits

An empty benefit list has two different meanings. Either the payer answered and this member has
no benefits of the kind you asked about, or the payer never processed your inquiry at all and said
why, in an `AAA` request validation segment. Reporting the second as the first tells a patient they
have no coverage when nobody checked.

`elig.aaaConditions` is the difference. It is **always present** and it is **empty** for a response
that carries no `AAA`, so a present and empty collection is a stated zero rather than a reader that
does not look. Each entry names the level the payer rejected at, the loop occurrence it belongs
to, and the payer's own reject reason and follow-up action codes, echoed **verbatim**.

The bundled description snapshots for those two code lists ship **empty**: their maintaining
organization requires permission for the use of its work products and none has been obtained, so
this package ships the code and no description rather than a description nobody recorded terms
for. The code is never lost, and every unrecognized one raises `X12_271_AAA_UNKNOWN_CODE` beside it.

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

A response with no `AAA` gives you `aaaConditions.length === 0`, and only then is an empty benefit
list one you can report as "no benefits of that kind". The `AAA` segments also stay on
`tx.segments` verbatim.

## Related

- [The 80/20 transaction sets](./spec-notes-transaction-sets.md): the field each set preserves
  verbatim, the 271's trace among them.
- [Build and serialize X12](./emit-and-serialize.md): what every builder refuses.
- Reference: [`build271`](./api/README.md#build271),
  [`get271Eligibility`](./api/README.md#get271eligibility),
  [`Build271Spec`](./api/README.md#build271spec).

---
id: read-a-services-review
title: Read and build a 278 services review
sidebar_label: Read and build a 278
description: "Read the certification decision and authorization number out of a 278 response, and build the request and the response that answers it."
---

# Read and build a 278 services review

You asked a utilization management organization to authorize a service, and the 278 response
came back. You need the **certification action** (was it certified, pended, denied?) and the
authorization number to put on the claim you are about to send.

`get278Request(delimiters, tx)` and `get278Response(delimiters, tx)` read the two directions of one
implementation guide, `005010X217`. Both are 278s, so route on the direction the model reports
rather than on `ST-01` alone; a reader hands back `undefined` for a transaction it does not decode.
A 278 declaring any other guide is still read, and carries `X12_GUIDE_NOT_IMPLEMENTED`; that
includes `005010X216`, the 278 notification guide.

**The `HCR-01` certification action is the field this library places verbatim and never infers.** It
is response-only: a request carries no decision at all, and `review.decision` is `undefined` there
rather than defaulted to anything.

```ts runnable
import { parseX12, get278Response } from "@cosyte/x12";

const raw278 = [
  "ISA*00*          *00*          *ZZ*UMOPAYER       *ZZ*SUBMITTER      *260601*1230*^*00501*000000002*0*P*:~",
  "GS*HI*UMOPAYER*SUBMITTER*20260601*1230*1*X*005010X217~",
  "ST*278*0002*005010X217~",
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

## Build a request, then the response that answers it

`build278Request(spec)` and `build278Response(spec)` take one spec shape,
[`Build278Spec`](./api/README.md#build278spec), declare `005010X217` in `GS-08` and `ST-03`, compute
the HL spine (organization, requester, subscriber, optional dependent, review), and return an
`X12Interchange`. Neither one sends anything, opens a socket or touches the filesystem.

The certification decision belongs to the response alone: `build278Request` **refuses** a review
that carries a `decision`, and `build278Response` refuses a decision with an empty action code. The
response writes the `HCR-01` action code you give it, as given, and the reader hands it back the same.

Every `HL-03` in this library is a library constant chosen by tree position, with a single
exception: `Build278ReviewSpec.levelCode`, which you supply and which the guides limit to `EV`
(patient event) and `SS` (service). A level outside those two emits a perfectly well-formed document
whose review loop no reader opens, so the review **and its certification decision** would come back
absent with no warning. Both builders therefore **refuse** an out-of-enum level rather than emit a
document that loses it. Omit `levelCode` and it defaults to `EV`.

```ts runnable
import {
  build278Request,
  build278Response,
  get278Request,
  get278Response,
  serializeX12,
  ServicesReview278BuildError,
  type Build278Spec,
} from "@cosyte/x12";

const request: Build278Spec = {
  envelope: {
    senderId: "SUBMITTER",
    receiverId: "UMOPAYER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "AUTHREQ-202606" },
  utilizationManagementOrganization: {
    entityIdentifierCode: "X3",
    entityTypeQualifier: "2",
    name: "UTILIZATION REVIEW CO",
    idQualifier: "PI",
    idCode: "UMO001",
  },
  requester: {
    entityIdentifierCode: "1P",
    entityTypeQualifier: "2",
    name: "RENDERING CLINIC",
    idQualifier: "XX",
    idCode: "1234567893",
  },
  subscriber: {
    member: {
      entityIdentifierCode: "IL",
      entityTypeQualifier: "1",
      lastName: "DOE",
      firstName: "JANE",
      idQualifier: "MI",
      idCode: "MBR0001",
    },
    reviews: [
      {
        requestCategoryCode: "HS",
        certificationTypeCode: "I",
        serviceTypeCode: "1",
        traces: [
          {
            traceTypeCode: "1",
            referenceId: "AUTHREQ-202606-0001",
            originatingCompanyId: "9SUBMITTER",
          },
        ],
        diagnoses: [{ qualifier: "ABK", code: "E1165" }],
      },
    ],
  },
};

const sent = build278Request(request);
sent.groups[0]?.transactions[0]?.st.elements[3]; // => "005010X217"

const sentTx = sent.groups[0]?.transactions[0];
const asRead = sentTx ? get278Request(sent.delimiters, sentTx) : undefined;
asRead?.direction; // => "request"
asRead?.warnings.length; // => 0
asRead?.reviews[0]?.hierarchy?.levelCode; // => "EV"
asRead?.reviews[0]?.decision; // => undefined

// The response reuses the request's parties and trace and adds the decision.
const response: Build278Spec = {
  ...request,
  envelope: { ...request.envelope, senderId: "UMOPAYER", receiverId: "SUBMITTER" },
  header: { ...request.header, purposeCode: "11", referenceId: "AUTHRESP-202606" },
  subscriber: {
    ...request.subscriber,
    reviews: [
      {
        ...request.subscriber.reviews![0]!,
        decision: { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" },
      },
    ],
  },
};

const answered = build278Response(response);
const answeredTx = answered.groups[0]?.transactions[0];
const decision = answeredTx ? get278Response(answered.delimiters, answeredTx) : undefined;
decision?.direction; // => "response"
decision?.reviews[0]?.traces[0]?.referenceId; // => "AUTHREQ-202606-0001"
decision?.reviews[0]?.decision?.actionCode; // => "A1"
decision?.reviews[0]?.decision?.reviewIdentificationNumber; // => "AUTH123456"
serializeX12(answered).includes("HCR*A1*AUTH123456~"); // => true

// A decision on a request is refused, not written.
let refused: string | undefined;
try {
  build278Request(response);
} catch (err) {
  if (err instanceof ServicesReview278BuildError) refused = err.code;
}
refused; // => "X12_278_BUILD_INVALID_SPEC"
```

## Related

- [The 80/20 transaction sets](./spec-notes-transaction-sets.md#the-readerbuilder-symmetry): why
  the review level is the one value check on the builder side.
- Reference: [`get278Response`](./api/README.md#get278response),
  [`get278Request`](./api/README.md#get278request),
  [`build278Request`](./api/README.md#build278request),
  [`build278Response`](./api/README.md#build278response),
  [`Build278Spec`](./api/README.md#build278spec),
  [`ServicesReview278BuildError`](./api/README.md#servicesreview278builderror).

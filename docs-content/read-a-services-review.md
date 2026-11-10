---
id: read-a-services-review
title: Read a 278 services review decision
sidebar_label: Read a 278 decision
description: "Read the certification decision and the authorization number out of a 278 services review response."
---

# Read a 278 services review decision

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

## Before you build a 278

Every `HL-03` in this library is a
library constant chosen by tree position, with a single exception: `Build278ReviewSpec.levelCode`,
which you supply and which the guides limit to `EV` (patient event) and `SS` (service). A level
outside those two emits a perfectly well-formed document whose review loop no reader opens, so the
review **and its certification decision** would come back absent with no warning. `build278Request`
and `build278Response` therefore **refuse** an out-of-enum level rather than emit a document that
loses it. Omit `levelCode` and it defaults to `EV`.

## Related

- [The 80/20 transaction sets](./spec-notes-transaction-sets.md#the-readerbuilder-symmetry): why
  the review level is the one value check on the builder side.
- Reference: [`get278Response`](./api/README.md#get278response),
  [`get278Request`](./api/README.md#get278request),
  [`build278Response`](./api/README.md#build278response).

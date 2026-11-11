---
id: intro
title: Getting started
sidebar_label: Overview
description: "Parse real-world healthcare X12 and read fields out of it without first reading the standard or a TR3."
---

# @cosyte/x12

An ASC X12 EDI parser, serializer and builder for Node.js and TypeScript, published on npm under
MIT with zero runtime dependencies. It reads a real-world, vendor-quirky healthcare interchange into
typed models, so you can read the money out of an 835, an 837 or a 271 without first reading the X12
standard or a TR3 implementation guide, and it builds each of those transaction sets through a
builder that refuses what it cannot write exactly. Its API shape, profile system and lenient parsing
mirror [`@cosyte/hl7`](https://docs.cosyte.com/hl7).

**Who it is for:** the engineer with one 835 to post, one 271 to answer, or one 837 to send, who
needs the amounts to be exactly right rather than approximately right.

**What it is not:** a translator for non-healthcare transaction sets, an EDIFACT parser, a transport
(no AS2, SFTP or MLLP), or a validator that proves conformance to an implementation guide. The
[non-goals](./troubleshooting.md#scope-non-goals-for-v1) are listed with the known limitations.

> **Status:** the 0.1 line, published on npm and public. The exported readers, builders, types and
> warning codes are the surface we keep stable, and below 1.0 a breaking change is called out in the
> changelog with its migration. `npm view @cosyte/x12 version` is the source of truth for the
> current version.

## The transaction sets it covers

The HIPAA **005010** healthcare transaction sets, each with a lenient reader and a domain builder:

- **270**: eligibility inquiry
- **271**: eligibility response
- **276**: claim status request
- **277**: claim status response, and **277CA** claim acknowledgment
- **278**: services review, request and response
- **820**: premium payment
- **834**: benefit enrollment and maintenance
- **835**: claim payment and advice (remittance, ERA)
- **837P / 837I / 837D**: professional, institutional and dental claims
- **999 / 997 / TA1**: implementation, functional and interchange acknowledgments

And the two claims attachments guides 45 CFR 162.2002 adopts for the period on and after May 26,
2028, also read and built: the **277 request for additional information** (`006020X313`) and the
**275** that answers it (`006020X314`). For those two the base X12 006020 structure is typed and no
implementation-guide usage is checked.

[The 80/20 transaction sets](./spec-notes-transaction-sets.md) maps each set to its reader, its
builder and the field it preserves verbatim, and `X12_TR3_CONFORMANCE` is the machine-readable
answer to which implementation guide each one follows.

## Install and smoke-test

```bash
npm install @cosyte/x12
```

Confirm the package resolves and a real entry point is callable. Decode the smallest useful
interchange (an ISA/IEA envelope) and read the version symbol back:

```ts runnable
import { parseX12, VERSION } from "@cosyte/x12";

typeof VERSION; // => "string"

const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "IEA*0*000000001~";

const ix = parseX12(raw);

ix.isa.elements[6]?.trim(); // => "SENDER"
ix.delimiters.element; // => "*"
ix.warnings; // => []
```

If that resolves and returns, the install is good. [Installation](./installation.md) has the
prerequisites and module-system notes, and the [Quickstart](./quickstart.md) gets you a first useful
result.

## The model in one paragraph

The parser is **lenient by default**: a vendor deviation becomes a warning carrying a stable code
and its position, not a failure, and only four unrecoverable structural errors ever throw. The
builders are the opposite: they **refuse** a spec they cannot emit exactly rather than silently
corrupt it. Money is decimal-exact end to end (`X12Decimal`, BigInt-backed): **never `parseFloat`
an EDI amount**. [The envelope and loop model](./spec-notes-envelope.md) and
[Tolerance tiers and warning codes](./spec-notes-tolerance.md) explain the rest.

## Where to go next

- [Quickstart](./quickstart.md): parse an 835 remittance and read the money in a few lines.
- **How-to guides**, one task each: [post an 835](./post-a-remittance.md),
  [route 277CA and 277 responses](./route-claim-status-responses.md),
  [answer a 270 with a 271](./answer-an-eligibility-inquiry.md),
  [read 270 and 276 inquiries](./read-inquiries.md),
  [read and build 837 claims](./read-and-build-claims.md),
  [read and build a 278 review](./read-a-services-review.md),
  [read and build an 834 roster](./read-an-enrollment-roster.md),
  [read and build an 820 premium payment](./read-and-build-a-premium-payment.md),
  [read 999, 997 and TA1 acknowledgments](./read-acknowledgments.md),
  [answer an attachment request](./answer-an-attachment-request.md),
  [build and serialize X12](./emit-and-serialize.md),
  [describe a partner with a profile](./profiles.md), [handle warnings](./handle-warnings.md), and
  [read dates](./read-dates.md).
- **Explanation**: [the envelope and loop model](./spec-notes-envelope.md),
  [the transaction sets](./spec-notes-transaction-sets.md),
  [tolerance tiers](./spec-notes-tolerance.md), [decimal-exact money](./spec-notes-money.md), and
  [keeping PHI out of logs](./keeping-phi-out-of-logs.md).
- **Reference**: [warning and error codes](./warning-and-error-codes.md), and the
  [API reference](./api/README.md), generated from the source for every export.
- [Troubleshooting and known limitations](./troubleshooting.md): the common symptoms, and what this
  package does not do.
- [Testing and quality](./testing-and-quality.md) and [Performance](./performance.md): how we test
  it and what we measure.

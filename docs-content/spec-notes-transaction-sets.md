---
id: spec-notes-transaction-sets
title: The 80/20 transaction sets
description: "The map of the 005010 transaction sets this package covers, with the reader and the builder for each."
sidebar_label: The transaction sets
---

# The 80/20 transaction sets

X12 defines hundreds of transaction sets; HIPAA mandates a small handful for healthcare, and a smaller
handful again carry the overwhelming majority of real integration traffic. `@cosyte/x12` covers the
HIPAA **005010** healthcare sets and the two **006020** claims attachments guides, and nothing else.
Every set in the map below ships a lenient **reader** and a domain **builder**. This page is the map: what each set is, which
function reads it, which builds it, and the one field each one preserves _verbatim_ because getting
it wrong causes harm.

> **Both inquiry directions are in the map.** The 270 eligibility inquiry and the 276 claim status
> request each have a reader and a builder of their own. The 276 and the 277 are the two halves of
> one implementation guide (`005010X212`), and each half has its own reader and builder.

> **Depth tracks the code.** Every function named below is a shipped export. Where a set has a
> read-side limitation (e.g. 837 claim-/line-level provider addresses), it is called out in
> [Troubleshooting and known limitations](./troubleshooting.md), not glossed over.

## The map

| Set                    | What it is                                               | Read                                              | Build                                     | Preserved verbatim                                                                                             |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **270**                | Eligibility inquiry                                      | `get270Inquiry` / `parse270Inquiries`             | `build270`                                | the declared HL parent pointers, never re-numbered and never re-parented                                       |
| **271**                | Eligibility response                                     | `get271Eligibility`                               | `build271`                                | the 270's `TRN-02` trace, echoed onto the 271 (reassociation)                                                  |
| **276**                | Claim status request                                     | `get276StatusInquiry` / `parse276StatusInquiries` | `build276`                                | the declared HL parent pointers, never re-numbered and never re-parented; the `TRN-02` trace the 277 must echo |
| **277**                | Claim status response                                    | `get277Status`                                    | `build277`                                | the 276's trace; the STC category/status/entity triple                                                         |
| **277CA**              | Claim acknowledgment                                     | `get277CADisposition`                             | `build277CA`                              | per-claim accept/reject disposition + your submitted trace                                                     |
| **278**                | Services review request / response                       | `get278Request` / `get278Response`                | `build278Request` / `build278Response`    | the `HCR-01` certification action (response), never inferred                                                   |
| **820**                | Premium payment                                          | `get820Payments`                                  | `build820`                                | monetary amounts (emitted as-is; no balance equation)                                                          |
| **834**                | Benefit enrollment and maintenance                       | `get834Header` / `get834Enrollments`              | `build834`                                | the `INS-03` / `HD-01` maintenance-type code (X12 0875)                                                        |
| **835**                | Claim payment / advice (ERA)                             | `get835`                                          | `build835`                                | every monetary field; the balance is checked, never rebalanced                                                 |
| **837P / 837I / 837D** | Professional / institutional / dental claims             | `get837Claims`                                    | `build837P` / `build837I` / `build837D`   | the HL hierarchy; HI diagnosis qualifier → code system                                                         |
| **999**                | Implementation acknowledgment                            | `parse999`                                        | `build999`                                | per-segment / per-element syntax error notes                                                                   |
| **997**                | Functional acknowledgment (base standard, no guide)      | `parse997`                                        | `build997`                                | AK5 and AK9 dispositions, unknown codes carried as sent; nothing filled in                                     |
| **TA1**                | Interchange acknowledgment                               | `parseTA1`                                        | `buildTA1`                                | the interchange acknowledgment + note codes                                                                    |
| **277 RFAI**           | Request for additional information (`006020X313`)        | `get277RequestForAdditionalInformation`           | `build277RequestForAdditionalInformation` | every code and qualifier, carried as sent; no guide usage is checked                                           |
| **275**                | Additional information to support a claim (`006020X314`) | `get275Attachments`                               | `build275`                                | each attachment's data, octet for octet, held so it cannot be printed by accident                              |

## Routing: which set is this?

An interchange can carry multiple functional groups and transaction sets. Route on **GS-01** (the
functional identifier) and **ST-01** (the transaction set ID), then hand the transaction to the
matching reader:

```ts runnable
import { parseX12, get835 } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*CLINIC001      " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HP*MEDPAY*CLINIC001*20260601*1200*1*X*005010X221A1~" +
  "ST*835*0001~" +
  "BPR*I*450.00*C*ACH*CCP*01*021000021*DA*1234567*1512345678**01*021000021*DA*98765*20260601~" +
  "TRN*1*0012345*1512345678~" +
  "SE*3*0001~GE*1*1~IEA*1*000000001~";

const ix = parseX12(raw);
const group = ix.groups[0];

group?.gs.elements[1]; // => "HP"

// Find the 835 transaction and decode it. A reader returns `undefined` for a
// mis-routed transaction, so this pattern is safe across mixed interchanges.
const tx = group?.transactions.find((t) => t.st.elements[1] === "835");
const remit = tx ? get835(ix.delimiters, tx) : undefined;

remit?.traces[0]?.referenceId; // => "0012345"
```

Every set in the map has at least one worked example on this site, in the how-to guides. The
general emit surface those domain builders sit on top of is
[Build and serialize X12](./emit-and-serialize.md).

## The reader/builder symmetry

Every builder is tested through its reader: what `build835(spec)` emits, serialized and parsed
again, is read back by `get835` and compared with the spec. That symmetry is the correctness
contract: a builder that emitted something its own reader could not read back would fail those
tests.
The builders are **pure functions**: they never auto-send, open a socket, or touch the filesystem, and
they **refuse** a structurally impossible spec with a typed error rather than emitting corruption.

**One place that symmetry is enforced by a value check rather than by construction: the 278's review
level.** Every HL-03 in the library is a library constant chosen by tree position, with a single
exception, `Build278ReviewSpec.levelCode`, which you supply and which the TR3s limit to `EV` (patient
event) and `SS` (service). A level outside those two emits a perfectly well-formed document, but the
review loop it opens is one no reader opens, so `get278Response` returns the review **and its `HCR-01`
certification decision** as absent, with no warning. Nothing is misread (no decision comes back as a
different decision, and the bytes stay on `tx.segments`), but the certification action is the field
this library places verbatim and never infers, so `build278Request` / `build278Response` **refuse** an
out-of-enum level (`X12_278_BUILD_INVALID_SPEC`) rather than emit a document that loses it. An omitted
`levelCode` still defaults to `EV`.

## What is out of scope (v1)

- **Non-healthcare sets**: 850 (purchase order), 856 (ASN), 810 (invoice), 204 (load tender), etc.
- **The EDIFACT syntax family**: a different standard entirely.
- **Transport**: AS2, SFTP, MLLP-style delivery. This is a parser/serializer, not a comms stack.
- **Pre-005010 field maps.** Pre-005010 input is _tolerated and flagged_ (`X12_PRE_005010`), not
  decoded against those older guides.
- **The 4010 variants and the 4010 277U.** We do not build readers or builders for the 004010
  versions of the 835, the 837, the 270/271, the 276/277, the 278, the 834 or the 820, or for the
  4010 277U unsolicited claim status. This is a decision, not a gap we plan to close. Their 005010
  replacements are what we read and build: the 277 claim status response (`005010X212`) answers a
  276, and the 277CA claim acknowledgment (`005010X214`) does the acknowledgment work the 277U was
  used for. If you still receive 4010 traffic, translate it to 005010 before it reaches this
  package, or use a parser that reads 4010.

The interchange of a 4010 document still parses and carries `X12_PRE_005010`, so its envelope and
raw segments stay readable. A typed reader returns no reading for one of its transaction sets: it
answers `undefined` (or an empty list, or no yielded member), exactly as it does for a transaction set
of another ST-01, because its values would be read off 005010 element positions the 4010 guide
defines differently. The same holds for any declared guide a reader does not implement. The
declaration is ST-03, else GS-08, and the guides each reader implements are its rows of
`X12_TR3_CONFORMANCE`. Whether to refuse is decided on the declaration trimmed of surrounding
whitespace and upper-cased, so a 005010 guide declared with padding or in lower case is still read,
with [`X12_GUIDE_NOT_IMPLEMENTED`](./warning-and-error-codes.md#x12_guide_not_implemented) on the
reading because that warning compares exactly. A refused transaction set carries no warning of its
own; for a 4010 document, `X12_PRE_005010` on the interchange is the sign.

A 4010 transaction set that declares nothing (no ST-03 and an empty GS-08) cannot be told from a
005010 one, so it is still read, with
[`X12_GUIDE_NOT_DECLARED`](./warning-and-error-codes.md#x12_guide_not_declared) on the reading. Do
not trust such a reading where `X12_PRE_005010` is on the interchange.

```ts runnable
import { get277CADisposition, get277Status, parseX12 } from "@cosyte/x12";

// A 4010 277U: ISA-12 is 00401, GS-08 declares 004010X070, and the ST has no ST-03.
const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*U*00401*000000001*0*P*:~" +
  "GS*HN*SENDER*RECEIVER*20260601*1200*1*X*004010X070~" +
  "ST*277*0001~" +
  "BHT*0010*08*BATCH1*20260601*1200*DG~" +
  "SE*3*0001~" +
  "GE*1*1~" +
  "IEA*1*000000001~";

const ix = parseX12(raw);
ix.warnings.map((w) => w.code); // => ["X12_PRE_005010"]

const tx = ix.groups[0]!.transactions[0]!;
tx.st.elements[1]; // => "277"

// 004010X070 is a guide neither 277 reader implements: no reading.
get277Status(ix.delimiters, tx); // => undefined
get277CADisposition(ix.delimiters, tx); // => undefined
```

See [Troubleshooting and known limitations](./troubleshooting.md) for the full non-goals list.

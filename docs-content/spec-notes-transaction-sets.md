---
id: spec-notes-transaction-sets
title: The 80/20 transaction sets
sidebar_label: The transaction sets
sidebar_position: 2
---

# The 80/20 transaction sets

X12 defines hundreds of transaction sets; HIPAA mandates a small handful for healthcare, and a smaller
handful again carry the overwhelming majority of real integration traffic. `@cosyte/x12` covers the
HIPAA **005010** healthcare sets and nothing else. Every set in the map below ships a lenient
**reader** and a spec-clean domain **builder**. This page is the map: what each set is, which
function reads it, which builds it, and the one field each one preserves *verbatim* because getting
it wrong causes harm.

> **The 270 and 276 inquiries are not in the map, and that is not an omission.** There is no
> `get270` / `get276` reader and no `build270` / `build276` builder. Both parse into segments,
> composites, and dot-paths like any other X12 input, but neither decodes into a typed model on
> either side. Only their responses (271, 277) do.

> **Depth tracks the code.** Every function named below is a shipped export. Where a set has a
> read-side limitation (e.g. 837 claim-/line-level provider addresses), it is called out in
> [Troubleshooting & known limitations](./troubleshooting), not glossed over.

## The map

| Set | What it is | Read | Build | Preserved verbatim |
|---|---|---|---|---|
| **271** | Eligibility response | `get271Eligibility` | `build271` | the 270's `TRN-02` trace, echoed onto the 271 (reassociation) |
| **277** | Claim status response | `get277Status` | `build277` | the 276's trace; the STC category/status/entity triple |
| **277CA** | Claim acknowledgment | `get277CADisposition` | `build277CA` | per-claim accept/reject disposition + your submitted trace |
| **278** | Services review request / response | `get278Request` / `get278Response` | `build278Request` / `build278Response` | the `HCR-01` certification action (response), never inferred |
| **820** | Premium payment | `get820Payments` | `build820` | monetary amounts (emitted as-is; no balance equation) |
| **834** | Benefit enrollment & maintenance | `get834Header` / `get834Enrollments` | `build834` | the `INS-03` / `HD-01` maintenance-type code (X12 0875) |
| **835** | Claim payment / advice (ERA) | `get835` | `build835` | every monetary field; the balance is checked, never rebalanced |
| **837P / 837I / 837D** | Professional / institutional / dental claims | `get837Claims` | `build837P` / `build837I` / `build837D` | the HL hierarchy; HI diagnosis qualifier → code system |
| **999** | Implementation acknowledgment | `parse999` | `build999` | per-segment / per-element syntax error notes |
| **TA1** | Interchange acknowledgment | `parseTA1` | `buildTA1` | the interchange acknowledgment + note codes |

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

## The reader/builder symmetry

Every builder round-trips through its reader: `get835(parseX12(serializeX12(build835(spec))))`
reproduces the spec field-for-field. That symmetry is the correctness contract: a builder that
emitted something its own reader could not read back would be caught by the round-trip property tests.
The builders are **pure functions**: they never auto-send, open a socket, or touch the filesystem, and
they **refuse** a structurally impossible spec with a typed error rather than emitting corruption.

**One place that symmetry is enforced by a value check rather than by construction: the 278's review
level.** Every HL-03 in the library is a library constant chosen by tree position, with a single
exception - `Build278ReviewSpec.levelCode`, which you supply and which the TR3s limit to `EV` (patient
event) and `SS` (service). A level outside those two emits a perfectly well-formed document, but the
review loop it opens is one no reader opens, so `get278Response` returns the review **and its `HCR-01`
certification decision** as absent, with no warning. Nothing is mis-read - no decision comes back as a
different decision, and the bytes stay on `tx.segments` - but the certification action is the field
this library places verbatim and never infers, so `build278Request` / `build278Response` **refuse** an
out-of-enum level (`X12_278_BUILD_INVALID_SPEC`) rather than emit a document that loses it. An omitted
`levelCode` still defaults to `EV`.

## What is out of scope (v1)

- **Non-healthcare sets**: 850 (purchase order), 856 (ASN), 810 (invoice), 204 (load tender), etc.
- **The EDIFACT syntax family**: a different standard entirely.
- **Transport**: AS2, SFTP, MLLP-style delivery. This is a parser/serializer, not a comms stack.
- **Pre-005010 field maps.** Pre-005010 input is *tolerated and flagged* (`X12_PRE_005010`), not
  decoded against those older guides.

See [Troubleshooting & known limitations](./troubleshooting) for the full non-goals list.

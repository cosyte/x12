---
id: spec-notes-envelope
title: The envelope & loop model
sidebar_label: Envelope & loop model
sidebar_position: 1
---

# The envelope & loop model

Every X12 interchange is a set of **nested envelopes**. Understanding the four levels — and the loop
structure inside a transaction — is the whole mental model; once you have it, every reader in this
library reads the same way.

## The four envelope levels

```
ISA ─ interchange header (the outermost envelope; fixed-width, 106 bytes)
│  GS ─ functional group header (groups same-type transactions)
│  │  ST ─ transaction set header (one business document: an 835, an 837, …)
│  │  │   … body segments (BPR, CLP, SVC, NM1, …)
│  │  SE ─ transaction set trailer (segment count + control number)
│  GE ─ functional group trailer (transaction count + control number)
IEA ─ interchange trailer (group count + control number)
```

`parseX12` decodes this whole tree into an immutable `X12Interchange`:

- `ix.isa` / `ix.iea` — the interchange envelope (`IsaSegment` / `IeaSegment`).
- `ix.groups[]` — one `X12FunctionalGroup` per GS..GE, each with `.gs` / `.ge`.
- `ix.groups[i].transactions[]` — one `X12TransactionSet` per ST..SE, each with `.st` / `.se` and the
  decoded body `.segments`.

```ts runnable
import { parseX12 } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*CLINIC001      " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HP*MEDPAY*CLINIC001*20260601*1200*1*X*005010X221A1~" +
  "ST*835*0001~" +
  "BPR*I*450.00*C*ACH*CCP*01*021000021*DA*1234567*1512345678**01*021000021*DA*98765*20260601~" +
  "SE*3*0001~GE*1*1~IEA*1*000000001~";

const ix = parseX12(raw);

ix.isa.elements[6].trim(); // => "MEDPAY"
ix.groups[0]?.gs.elements[1]; // => "HP"
ix.groups[0]?.transactions[0]?.st.elements[1]; // => "835"
```

## Delimiters are detected, never assumed

X12 does not fix its delimiters — the sender declares them, and clearinghouses vary. `@cosyte/x12`
detects all four from fixed byte positions in the ISA, so you never configure them:

- **Element separator** — ISA byte 3 (classically `*`).
- **Repetition separator** — ISA-11 (position 82; classically `^` in 005010).
- **Component (sub-element) separator** — ISA-16 (the byte before the segment terminator; classically
  `:`, but Medicare and some BCBS plans use others).
- **Segment terminator** — the byte immediately after ISA-16 (classically `~`).

`ix.delimiters` carries the detected set; every reader and the `getSegmentValue` dot-path resolver use
it, so a partner who ships `|` elements and `\` components parses with no special handling.

## Segments, elements, composites, repetitions

Inside a transaction, every body segment is an immutable `X12Segment`: a segment `id` (`BPR`, `CLP`,
`NM1`, …) plus **1-indexed** `elements`. The `?`-release-character escape is honored losslessly
(`?~` → a literal `~`, `?*` → `*`, `??` → `?`).

The `getSegmentValue(seg, path, delimiters)` dot-path resolver walks the three axes:

- **Elements** — `"03"` is the third element.
- **Composites** — `"03-1"` is the first sub-element of element 3 (`-N` is 1-indexed).
- **Repetitions** — `"03[0]"` is the first repetition of element 3 (`[N]` is 0-indexed).

```ts runnable
import { parseX12, getSegmentValue } from "@cosyte/x12";

const raw =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HC*SENDER*RECEIVER*20260601*1200*1*X*005010X222A2~" +
  "ST*837*0001~" +
  "HI*ABK:J45.50*ABF:E11.9~" +
  "SE*2*0001~GE*1*1~IEA*1*000000001~";

const ix = parseX12(raw);
const hi = ix.groups[0]?.transactions[0]?.segments.find((s) => s.id === "HI");

getSegmentValue(hi!, "01-1", ix.delimiters); // => "ABK"
getSegmentValue(hi!, "01-2", ix.delimiters); // => "J45.50"
getSegmentValue(hi!, "02-1", ix.delimiters); // => "ABF"
```

## Loops: the repeating sub-structures

Above the segment sits the **loop** — a repeating group of segments that models a business entity (a
claim, a service line, a subscriber). The TR3 implementation guides define each transaction's loop
hierarchy; the per-transaction readers (`get835`, `get837Claims`, …) walk those loops for you and hand
back a typed tree, so you rarely touch raw segments.

When you *do* need to describe a loop yourself — or understand how the built-ins are authored — the
public `defineLoopSpec()` API is the same one the library uses internally (a dogfooding gate: the
built-in specs like `REMIT_835_LOOP_2100` are authored through it):

```ts runnable
import { defineLoopSpec } from "@cosyte/x12";

const Loop2300 = defineLoopSpec({
  id: "2300",
  description: "837 Claim Information",
  trigger: "CLM",
  segments: [
    { id: "CLM", usage: "required", max: 1 },
    { id: "DTP", usage: "situational", max: ">1" },
    { id: "HI", usage: "situational", max: ">1" },
  ],
});

Loop2300.trigger; // => "CLM"
Loop2300.id; // => "2300"
```

Many claims transactions (837, 271, 277, 278) also nest an **HL hierarchy** — an explicit
parent-pointer tree (`HL` segments) layered on top of the loops. The readers validate those pointers
for integrity and **never silently re-number** a broken one; see
[The tolerance tiers](./spec-notes-tolerance).

---
id: spec-notes-envelope
title: The envelope & loop model
sidebar_label: Envelope & loop model
sidebar_position: 1
---

# The envelope & loop model

Every X12 interchange is a set of **nested envelopes**. Understanding the four levels (and the loop
structure inside a transaction) is the whole mental model; once you have it, every reader in this
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

- `ix.isa` / `ix.iea`: the interchange envelope (`IsaSegment` / `IeaSegment`).
- `ix.groups[]`: one `X12FunctionalGroup` per GS..GE, each with `.gs` / `.ge`.
- `ix.groups[i].transactions[]`: one `X12TransactionSet` per ST..SE, each with `.st` / `.se` and the
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

X12 does not fix its delimiters. The sender declares them, and clearinghouses vary. `@cosyte/x12`
detects all four from fixed byte positions in the ISA, so you never configure them:

- **Element separator**: ISA byte 3 (classically `*`).
- **Repetition separator**: ISA-11 (position 82; classically `^` in 005010).
- **Component (sub-element) separator**: ISA-16 (the byte before the segment terminator; classically
  `:`, but Medicare and some BCBS plans use others).
- **Segment terminator**: the byte immediately after ISA-16 (classically `~`).

`ix.delimiters` carries the detected set; every reader and the `getSegmentValue` dot-path resolver use
it, so a partner who ships `|` elements and `\` components parses with no special handling.

## Line endings between segments

X12 is a single-line format, but most senders write a line break after every segment terminator so the
file is readable. `parseX12` absorbs it: **one optional CR followed by one optional LF** after each
terminator, so `~\r\n`, `~\r` and `~\n` all parse to the same interchange. You never configure this,
and it never warns.

The break is discarded rather than recorded, and that has one consequence worth knowing before you
diff an emit against its input:

```ts runnable
import { parseX12, serializeX12 } from "@cosyte/x12";

const prettyPrinted =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~\n" +
  "GS*HC*SENDER*RECEIVER*20260601*1200*1*X*005010X222A2~\n" +
  "ST*837*0001~\nSE*1*0001~\nGE*1*1~\nIEA*1*000000001~\n";

const emitted = serializeX12(parseX12(prettyPrinted));

// The line breaks are gone, so the emit is the compact form:
emitted === prettyPrinted; // => false
emitted.includes("\n"); // => false

// What DOES hold, and is what the round trip is for. The emit is a fixed
// point, so serializing it again is a byte-level no-op:
emitted === serializeX12(parseX12(emitted)); // => true
```

`serializeX12` is **byte-faithful for the segments on the model**: each of those comes back verbatim,
including element padding, composite structure, and `?`-release escapes. Anything the parser did not
record does not come back, and line breaks are only the most common of several such things.

**`serialize(parse(s)) === s` is not guaranteed in general**, and having no line breaks is not enough
to make it hold. Six constructs are known not to survive:

1. **Line breaks between segments**, as above. Silent.
2. **Segments outside a transaction** (a stray segment between `GE` and `IEA`, say). These raise
   `X12_UNEXPECTED_SEGMENT` on the first parse but are not kept, so they are absent from the emit, and
   **the warning does not recur when the emit is re-parsed**.
3. **A doubled segment terminator** outside a transaction. Silent.
4. **A missing final terminator**, which the emit supplies. Silent.
5. **Post-IEA `trailingBytes`**, re-joined from segment slices rather than preserved verbatim.
6. **TA1 position.** A TA1 that appeared **after** a functional group is collected onto
   `ix.ta1Segments` and emitted immediately after the ISA, so the emit **reorders** it. Silent, and
   unlike 1 to 5 nothing is lost: the model and the warning stream both round-trip identically. This
   library takes no position on where ASC X12 requires a TA1 to sit.

Cases 2 to 6 all break the round trip on inputs containing no line breaks at all, and **four of the
six (1, 3, 4, 6) produce no warning**, so a clean `ix.warnings` does not tell you a round trip will be
byte-exact. In the other direction, **do not use `serializeX12(parseX12(source))` as a normalization
step before comparing warnings**, because case 2 discards a warning along with its segment.

What is **measured**, across the 56 fixtures committed to this repository: every emit is a fixed point
and re-parses to an identical model with an identical warning stream; the 14 fixtures carrying no line
breaks return byte-identical; and the 42 pretty-printed ones differ from their source by **line breaks
and nothing else** (no element value lost, altered, reordered, or re-escaped). Two caveats bound how
far that sweep can be pushed: the corpus contains **no instance of cases 2 to 6**, and **13 of the 14
byte-identical fixtures are `golden/*.edi`**, which are serializer output by construction, so
`envelope/no-trailing-crlf.edi` is the only independent witness. That is why the six cases are
enumerated here rather than left to the sweep.

So for a file whose only irregularity is pretty-printing, the round trip is safe to build on for data
and not for a byte-level diff, and diffing your emit against `serializeX12(parseX12(source))` is the
way to ignore the line-break noise. For a file that raises `X12_UNEXPECTED_SEGMENT`, treat the first
parse's warnings as the authority and do not re-derive them from the emit.

One edge worth stating plainly, because the tolerance is one CR plus one LF: a **blank line** between
segments (`~\n\n`) exceeds it. The stray break opens a segment whose name is unrecognized, so it is
**reported** as `X12_UNEXPECTED_SEGMENT`, but it is not recovered, and by case 2 everything it
displaced is dropped as well. On a uniformly double-spaced file that is the entire interchange body.
The warning is the only signal you get, so do not ignore it.

## Segments, elements, composites, repetitions

Inside a transaction, every body segment is an immutable `X12Segment`: a segment `id` (`BPR`, `CLP`,
`NM1`, …) plus **1-indexed** `elements`. The `?`-release-character escape is honored losslessly
(`?~` → a literal `~`, `?*` → `*`, `??` → `?`).

The `getSegmentValue(seg, path, delimiters)` dot-path resolver walks the three axes:

- **Elements**: `"03"` is the third element.
- **Composites**: `"03-1"` is the first sub-element of element 3 (`-N` is 1-indexed).
- **Repetitions**: `"03[0]"` is the first repetition of element 3 (`[N]` is 0-indexed).

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

Above the segment sits the **loop**: a repeating group of segments that models a business entity (a
claim, a service line, a subscriber). The TR3 implementation guides define each transaction's loop
hierarchy; the per-transaction readers (`get835`, `get837Claims`, …) walk those loops for you and hand
back a typed tree, so you rarely touch raw segments.

When you *do* need to describe a loop yourself, or understand how the built-ins are authored, the
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

Many claims transactions (837, 271, 277, 278) also nest an **HL hierarchy**: an explicit
parent-pointer tree (`HL` segments) layered on top of the loops. The readers validate those pointers
for integrity and **never silently re-number** a broken one; see
[The tolerance tiers](./spec-notes-tolerance).

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

### When an ISA element carries the element separator

Detection verifies the element separator at all 16 fixed ISA positions, which makes 17 the **floor**
on how many parts the header splits into, not the count. An ISA element value carrying that same byte
splits again: that element comes back a prefix and everything after it is displaced, so the control
number, the usage indicator and the version can each answer some other element's value. **How far is
not derivable from `isa.elements`** - more than one element can carry an extra separator, and one
sitting between two of them is displaced less than one sitting after both - so `isa.raw` plus the
fixed widths is the only route back. `@cosyte/x12` reports this as
`X12_ISA_EXTRA_ELEMENT_SEPARATOR` and **re-frames nothing** - the byte is both
content under the ISA's fixed widths and the separator the segment declares in-band, the
interchange is not 005010-conformant either way, and nothing settles which reading is right. All 106
bytes stay on `isa.raw`, so the transmitted span of any element is recoverable if you decide it should
be.

`parseX12` raises this ahead of the warnings it raises after it, so when you see it in `ix.warnings`,
treat those as provisional. **That is a statement about `ix.warnings` and `onWarning` only.**
`serializeX12(ix, { specClean: true })` reconciles ISA-13 against IEA-02 off `isa.elements[13]` with
no arity awareness and never raises this code, so on that channel a lone
`X12_CONTROL_NUMBER_MISMATCH` can be a displaced read, and the absence of this warning is not
evidence the header framed.

### When a delimiter is `?`

`?` is the conventional X12 release character, and this library treats it as one. It is also
admissible at any of the four delimiter positions, because nothing in the ISA layout reserves it, so
a sender can declare it as structure. **One byte cannot both separate and escape**, so wherever a
role is declared as `?`, the splitter for that role stops treating `?` as an escape and splits
literally: the segment terminator, an envelope segment's elements, and a body segment's elements.
Bounds worth knowing if you meet such a set, and this is not a closed account of what one can do to a
document. A `?` **repetition or component** separator still does not split, so
`getSegmentValue(seg, "01-2", ix.delimiters)` will not resolve against it. With `?` as the
**element** separator, a segment ending in an empty last element puts a `?` immediately before the
terminator, which the terminator scan still reads as an escape, so that segment merges with the one
after it and you get `X12_MISSING_SE`.

**🩺 On the emit side a `?` in ANY of the four roles is REFUSED, and that is the asymmetry: lenient
on parse, strict on emit.** Every builder - `buildInterchange`, the seven per-TR3 domain builders,
`build999` and `buildTA1` - refuses such a set with its own existing typed error, naming the role.
The reason is that one byte cannot both separate and escape on the way out either, and there is
nothing a caller can do about it at the value level:

- An escape is written by **prefixing** `?` to the byte it protects, so where `?` is a delimiter the
  protection is emitted as structure.
- A **composite or a repetition** is joined with the separator you declared, so where that separator
  is `?` the library's own structural join is emitted as an escape. **This one needs no value of
  yours at all** - an 837 with a `?` component separator emitted `SV1-01-2` (the procedure code) and
  `HI-01-2` (the diagnosis code) fused into the preceding component on every document, silently.

If you must exchange with a partner who declares `?` as structure, you can still **read** their
traffic: `parseX12` accepts every such set, and `serializeX12` re-emits one byte for byte. The
read-side bounds above are unchanged by the refusal.

**What the refusal is, exactly: an equality test on the delimiter you declare.** Read it as a
property of the SET you declare, never as a guarantee about the documents this library can compose.

**A second refusal sits beside it: a delimiter must be SHAPED like one.** Each of the four roles must
be a string of exactly one visible character, and the four must be mutually distinct - the same
predicate `parseX12` applies to an inbound ISA, where failing it is the fatal
`X12_INVALID_DELIMITERS`. So `segmentTerminator: "~~"`, an empty or whitespace delimiter, a numeric
one, and a set that uses one character in two roles are all refused on emit. Some of those used to
build with `warnings: []`, including `segmentTerminator: "~\r\n"` - if you were declaring that to get
line-broken output, it never produced any: line breaks between segments are tolerated on READ, so the
model recorded `~` and `serializeX12` emitted none.

**It counts UTF-16 code units, not bytes**, so a single-code-unit character that is several bytes on
the wire (`"\u00a7"`, or the smart quote `"\u2019"` a companion-guide PDF gives you instead of `'`)
still builds and still displaces every ISA position after it. Declare delimiters from the basic
single-byte set. All of it is recorded in `KNOWN-LIMITATIONS.md`.

## Line endings between segments

X12 is a single-line format, but most senders write a line break after every segment terminator so the
file is readable. `parseX12` absorbs it: **any run of CR / LF bytes** between segments, so `~\r\n`,
`~\r`, `~\n`, a double-spaced `~\n\n`, and a doubled-in-transit `~\r\r\n` all parse to the same
interchange. All 15 CR/LF sequences of length 0 to 3 frame identically. You never configure this, and
it never warns.

A run of CR / LF between segments can never be structural, which is what makes absorbing an unbounded
one safe: `parseX12` refuses any ASCII control character (CR and LF among them) at **all four**
delimiter positions, the segment terminator included, as the Tier-3 fatal `X12_INVALID_DELIMITERS`.
So a line break is never itself a delimiter. Note the terminator is the byte immediately **after**
ISA-16, as stated above; ISA-16 is the component separator. (This describes what this library does.
It takes no position on what ASC X12 permits between segments.)

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
2. **A doubled segment terminator** outside a transaction. It delimits a zero-length segment carrying
   no elements, so there is nothing to retain. Silent.
3. **A missing final terminator**, which the emit supplies. Silent.
4. **Post-IEA `trailingBytes`**, re-joined from segment slices rather than preserved verbatim.
5. **TA1 position.** A TA1 that appeared **after** a functional group is collected onto
   `ix.ta1Segments` and emitted immediately after the ISA, so the emit **reorders** it. Silent, and
   unlike the others nothing is lost: the model and the warning stream both round-trip identically.
   It is also the only construct that moves something _else_ - a segment outside a transaction is
   placed correctly relative to the groups but not relative to a TA1 hoisted past it. This library
   takes no position on where ASC X12 requires a TA1 to sit.
6. **A segment whose first element is empty (`*A*B~`), outside a transaction.** It has no id for the
   envelope walker to dispatch on, so it is skipped entirely: absent from the model, absent from the
   emit, and it does not even raise `X12_UNEXPECTED_SEGMENT`. Silent, and the only case here that
   loses a value with no diagnostic at all. Inside an open transaction the same segment is kept and
   re-emitted normally.

**A segment outside a transaction is not on that list.** It is kept on `ix.orphanSegments` and
re-emitted at its structural anchor, so the segment, its value and its `X12_UNEXPECTED_SEGMENT`
warning all survive the round trip. See
[Segments outside a transaction](#segments-outside-a-transaction) below.

Cases 2 to 6 all break the round trip on inputs containing no line breaks at all, and **five of the
six (1, 2, 3, 5, 6) produce no warning**, so a clean `ix.warnings` does not tell you a round trip
will be byte-exact; only case 4 warns.

What is **measured**, across every fixture committed to this repository: each emit is a fixed point
and re-parses to an identical model with an identical warning stream; the fixtures carrying no line
breaks return byte-identical; and the pretty-printed ones differ from their source by **line breaks
and nothing else** (no element value lost, altered, reordered, or re-escaped). No corpus size is
quoted: it moves with every fixture added, and the suite re-derives the sweep from the tree on every
run. Two caveats bound how far that sweep can be pushed: the corpus contains **no instance of cases 2
to 6** and no orphan at all, and **all but one of the byte-identical fixtures are `golden/*.edi`**,
which are serializer output by construction, so `envelope/no-trailing-crlf.edi` is the only
independent witness. That is why the six cases are enumerated here rather than left to the sweep.

So for a file whose only irregularity is pretty-printing, the round trip is safe to build on for data
and not for a byte-level diff, and diffing your emit against `serializeX12(parseX12(source))` is the
way to ignore the line-break noise.

## Segments outside a transaction

The envelope grammar binds body segments to an open `ST..SE` transaction set. A segment that arrives
outside one has nowhere to go in `ix.groups`. The positions that do this are a stray segment between
`GE` and `IEA`, a body segment between an `SE` and its group's `GE`, a body segment between `GS` and
the first `ST`, an `ST` with no open group, an `SE` that closes nothing, a `GE` that closes nothing,
and a `TA1` inside an open group.

That last one is the exception to this section's title. `TA1` is envelope-level by spec, so a `TA1`
inside an open group lands on `ix.orphanSegments` even when it arrived **between an `ST` and its
`SE`** - and it is lifted out of that transaction's `segments` and `rawSegments`. For a document
containing such a `TA1`, `ix.groups` is not the whole typed model. That is long-standing behaviour;
what changed is that the segment is retained and re-emitted rather than discarded. It is also the one
orphan that is anchored _inside_ a transaction, so it is the case any re-emission design has to get
right - see the second example below.

Each raises `X12_UNEXPECTED_SEGMENT`, is retained verbatim on `ix.orphanSegments`, and is re-emitted
at the structural `anchor` recorded alongside it:

```ts runnable
import { parseX12, serializeX12 } from "@cosyte/x12";

const withStray =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HC*SENDER*RECEIVER*20260601*1200*1*X*005010X222A2~" +
  "ST*837*0001~SE*2*0001~GE*1*1~" +
  "REF*ZZ*VENDORTAG~" + // outside every transaction
  "IEA*1*000000001~";

const ix = parseX12(withStray);

// Reported, and kept. The value is still reachable:
ix.orphanSegments.length; // => 1
ix.orphanSegments[0]?.segment.id; // => "REF"
ix.orphanSegments[0]?.context; // => "body-outside-transaction"

// `segmentIndex` is the join key back to the warning that describes it:
const warning = ix.warnings.find((w) => w.code === "X12_UNEXPECTED_SEGMENT");
warning?.position.segmentIndex === ix.orphanSegments[0]?.segmentIndex; // => true

// And it comes back in the emit, byte for byte, with its warning:
const round = serializeX12(ix);
round === withStray; // => true
parseX12(round).orphanSegments.length; // => 1

// `anchor` is the structural slot it goes back into - after the one group
// that closed, before the IEA.
ix.orphanSegments[0]?.anchor.kind; // => "interchange"
```

Two things this deliberately does **not** do. An orphan is not decoded by any `get*` reader. And a
`TA1` inside an open group is **not** added to `ix.ta1Segments` (that surface means "envelope-level
TA1", and `parseTA1` reads it). Retention and re-emission are not promotion: the segment is kept and
put back where it was, not moved into a position the grammar says it does not occupy.

**Placement is by `anchor`, never by `segmentIndex`, and the difference is the whole correctness
argument.** `segmentIndex` is an index into the **input** stream, and the emit is not in input order:
it hoists `ta1Segments` ahead of the groups (case 5 above), and a doubled terminator's zero-length
segment occupies an input index that is never emitted. Replaying an orphan by input index therefore
splices it into whatever occupies that slot in the output. Measured on a two-group interchange with a
`TA1` after the first group, that put a stray segment **inside** an 835's `ST..SE` body between `CLP`
and `SE`, where re-parsing raised no warning at all and `get835` would have walked it as claim
content; a stray `SE` closed the transaction early and corrupted SE-01. An `anchor` names a slot in
the typed tree instead - which group, which transaction, which offset inside it - and a slot in the
tree is invariant under both reorderings, because it does not mention bytes. Use `segmentIndex` to
join an orphan to its warning; never use it to place one.

```ts runnable
import { parseX12, serializeX12 } from "@cosyte/x12";

// A TA1 *between* an ST and its SE: the one orphan that is anchored inside an
// open transaction rather than beside one.
const inTx =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HP*SENDER*RECEIVER*20260601*1200*1*X*005010X221A1~" +
  // SE-01 is 4: four physical segments sit between the ST and the SE.
  "ST*835*0001~CLP*ACCT1*1*100*0~TA1*000000001*260601*1200*A*000~SE*4*0001~" +
  "GE*1*1~IEA*1*000000001~";

const lifted = parseX12(inTx);
lifted.orphanSegments[0]?.anchor.kind; // => "transaction"

// It is lifted OUT of the transaction body, and stays out on the round trip:
lifted.groups[0]?.transactions[0]?.rawSegments.length; // => 3
serializeX12(lifted) === inTx; // => true
```

Those last two numbers are both right, and the gap between them is the point. `rawSegments` is **3**
because the walker lifted the `TA1` off the transaction, while SE-01 is **4** because four segments
are physically present between the `ST` and the `SE`, which is what X12.6 counts. `{ specClean: true }`
reconciles against the emitted bytes, so it counts the re-emitted orphan and agrees with the `4`;
reconciling against `rawSegments` alone would "correct" a right count into a wrong one.

`orphanSegments` is empty for a well-formed interchange, so a non-empty one is itself the signal that
the sender's framing did not match the envelope grammar. Check it alongside `ix.warnings`.

**Treat an orphan as PHI when you log it.** A warning `message` is a lookup into a frozen registry and
its metadata is positional, so the whole `ix.warnings` array is safe to log. An orphan is not the same
kind of thing: it carries the sender's bytes verbatim, exactly as `tx.rawSegments` and `isa.raw` do,
and nothing guarantees a segment outside a transaction is free of patient data. Log `context` and
`segmentIndex`, which name the rule that broke and where to look, rather than the whole entry.

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

When you _do_ need to describe a loop yourself, or understand how the built-ins are authored, the
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

---
id: emit-and-serialize
title: Building and serializing X12
sidebar_label: Building and serializing
sidebar_position: 8
---

# Building and serializing X12

The read side is only half of `@cosyte/x12`. The emit side ships too, and it is two layers:

- **`serializeX12(ix)`** turns any `X12Interchange` back into bytes. It is the exact inverse of
  `parseX12` for every segment the parser recorded, and it is what you use when you already have an
  interchange in hand: one you parsed, or one a builder composed.
- **`buildInterchange(spec)`** composes an interchange from nothing. It owns the envelope mechanics
  (the ISA fixed-width layout, the GS / GE / ST / SE / IEA control segments, and the SE-01 / GE-01 /
  IEA-01 counts), so you never hand-count a segment total. The per-guide domain builders (`build835`,
  `build837P`, `build271`, …) all sit on top of it; this page is the floor they stand on.

> Every interchange below is **synthetic**: fabricated names, obviously-fake ids, pre-2024 control
> numbers. X12 healthcare data is PHI; a fixture must never hold a real one.

## The asymmetry: liberal on read, conservative on emit

The parser is lenient. The builders are not, and that is deliberate (Postel's Law). Where the parser
meets a structure it cannot decode it **preserves the bytes and warns**; where a builder meets a spec
it cannot emit conformantly it **refuses with a typed error rather than silently corrupting the
document**. Nothing is ever quietly corrected on the way out. A wrong element position on a claim is
a wrong payment, so emitting something plausible and wrong is the one outcome the emit side is built
to make impossible.

Concretely, a builder refuses rather than guesses when:

- a **delimiter set is not shaped like one**: each of the four roles must be exactly one visible
  character and the four must be mutually distinct;
- a delimiter is **`?`** in any of the four roles, because one byte cannot both separate and escape,
  so the library's own structural join would be emitted as an escape (and the escape as structure);
- a **required control number is empty**, which used to be zero-padded into a control number nobody
  sent;
- a slot typed `X12Decimal` is handed a raw `number`, which is how `0.1 + 0.2` used to reach a
  monetary element as `0.30000000000000004`.

Each refusal is a typed, code-tagged error (`X12BuildError` from `buildInterchange`, and each domain
builder's own class), so you branch on `err.code` rather than on a message.

## Compose an interchange

```ts runnable
import { buildInterchange, parseX12, serializeX12 } from "@cosyte/x12";

const ix = buildInterchange({
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groups: [
    {
      functionalIdCode: "HC",
      groupControlNumber: "1",
      versionRelease: "005010X222A2",
      transactions: [
        {
          transactionSetIdCode: "837",
          transactionSetControlNumber: "0001",
          implementationConventionReference: "005010X222A2",
          segments: [["BHT", "0019", "00", "SUBMIT-0001", "20260601", "1200", "CH"]],
        },
      ],
    },
  ],
});

const emitted = serializeX12(ix);

// The counts are computed, never supplied: ST + BHT + SE is three segments.
emitted.includes("ST*837*0001*005010X222A2~"); // => true
emitted.includes("SE*3*0001~"); // => true
emitted.includes("GE*1*1~"); // => true
emitted.endsWith("IEA*1*000000001~"); // => true

// The emit is a fixed point: re-parsing and re-emitting is a byte-level no-op.
serializeX12(parseX12(emitted)) === emitted; // => true
```

Element values on a `SegmentSpec` are **logical**, not framed: the builder applies the `?`-release
escape on emit, so a value carrying an active delimiter survives instead of splitting its own
segment. The segment id (element 0) is emitted verbatim, because a segment id is the library's and
not caller content.

## What a refusal looks like

`?` is the conventional X12 release character. Declaring it as one of the four delimiters is
admissible on the wire, and `parseX12` reads such an interchange happily. Emitting one is refused,
because the library would have to write its own structural joins as escapes:

```ts runnable
import { buildInterchange, X12BuildError, X12_BUILD_ERROR_CODES } from "@cosyte/x12";

let refusal: X12BuildError | undefined;
try {
  buildInterchange({
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    componentSeparator: "?",
    groups: [],
  });
} catch (err) {
  if (err instanceof X12BuildError) refusal = err;
}

// Refused, with a code to branch on - not emitted with a warning attached.
refusal !== undefined; // => true
refusal?.code; // => X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC
```

The refusal is an equality test on the delimiter set you declare. Read it as a property of that set
and never as a guarantee about every document the library can compose: it says this set is
unemittable, not that any other set is safe.

## Byte fidelity, and its two silent limits

`serializeX12` is **byte-faithful for the segments on the model**. Each comes back verbatim,
including element padding, composite structure and `?`-release escapes, in the order the model holds
it. Anything the parser never recorded does not come back, so **`serialize(parse(s)) === s` is not
guaranteed**, and a file with no line breaks is not thereby safe.

Two of those are the ones to know, because both are **silent**: nothing warns, so a clean
`ix.warnings` is not evidence that a round trip will be byte-exact.

1. **Line breaks between segments.** The parser absorbs any run of CR / LF bytes after a segment
   terminator and the model has nowhere to record it, so a pretty-printed or double-spaced source
   emits as its compact form.
2. **A doubled segment terminator** outside a transaction. It delimits a zero-length segment
   carrying no elements, so there is nothing to retain and nothing to put back.

```ts runnable
import { parseX12, serializeX12 } from "@cosyte/x12";

// The `GE*1*1~~` is a doubled terminator: a zero-length segment between the
// group trailer and the IEA.
const doubled =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HC*SENDER*RECEIVER*20260601*1200*1*X*005010X222A2~" +
  "ST*837*0001~SE*2*0001~GE*1*1~~" +
  "IEA*1*000000001~";

const ix = parseX12(doubled);
const emitted = serializeX12(ix);

// Not reproduced, and nothing said so:
emitted === doubled; // => false
ix.warnings.length; // => 0

// What does hold is the fixed point, which is what the round trip is for.
emitted === serializeX12(parseX12(emitted)); // => true
```

The full list is six constructs, enumerated with the rest of the emit contract in
[Line endings between segments](./spec-notes-envelope), and the canonical statement of the boundary
is the package's `KNOWN-LIMITATIONS.md`.

## Reconciling an envelope you did not write

By default `serializeX12` reconciles nothing: it reproduces the model. Pass `{ specClean: true }` and
it **checks** the envelope counts and the three control-number pairs (ISA-13 against IEA-02, GS-06
against GE-02, ST-02 against SE-02), surfacing any mismatch through `onWarning`. It still does not
correct one. Substituting the recomputed SE-01 / GE-01 / IEA-01 counts is a second, separate opt-in
(`{ recomputeCounts: true }`), which is **inert without `specClean`**, and control numbers are
identity rather than derived, so they are **never** rewritten, only flagged.

```ts runnable
import { parseX12, serializeX12, type X12ParseWarning } from "@cosyte/x12";

// SE-01 declares two segments; three are present. The sender's count is stale.
const stale =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~" +
  "GS*HC*SENDER*RECEIVER*20260601*1200*1*X*005010X222A2~" +
  "ST*837*0001~BHT*0019*00*SUBMIT-0001*20260601*1200*CH~SE*2*0001~" +
  "GE*1*1~IEA*1*000000001~";

const seen: X12ParseWarning[] = [];
const emitted = serializeX12(parseX12(stale), {
  specClean: true,
  onWarning: (w) => seen.push(w),
});

// Reported...
seen.some((w) => w.code === "X12_SEGMENT_COUNT_MISMATCH"); // => true

// ...and NOT corrected. The sender's SE-01 stands in the bytes.
emitted.includes("SE*2*0001~"); // => true
```

## Where to go next

- [The 80/20 transaction sets](./spec-notes-transaction-sets): the builder each set is emitted
  through, and the field each one preserves verbatim.
- [Cookbook](./cookbook): worked builder recipes, including the 271 TRN-echo round trip and the 837
  guide-identifier envelope.
- [Decimal-exact money](./spec-notes-money): why a monetary slot refuses a raw `number` rather than
  rounding it.
- [Trading-partner profiles](./profiles): describing what a partner actually sends, on the read side.

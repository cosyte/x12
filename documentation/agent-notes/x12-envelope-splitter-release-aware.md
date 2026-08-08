# `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` (2026-08-08)

The envelope segments' element splitter now honours the `?`-release-character escape. One line of
behaviour, one function, and the whole slice is the argument for why it is allowed to change how
already-published documents decode.

Base tree: `1b71733` (`#95`). Provenance for every spec statement below: ASC X12 .5 (the ISA's
fixed-width layout) and this package's own already-shipped release handling in
`src/parser/release.ts` and `src/parser/segment.ts`. **No TR3 is cited and none is needed** - the
decision rests on the package's internal inconsistency, not on a clause anybody here has read. The
`?`-as-release-character convention is itself recorded in `release.ts` as a CONVENTION: 005010 does
not transmit a release character as a fifth ISA delimiter.

## What was wrong

`src/parser/envelope.ts`'s `splitElements` was `segment.split(delimiters.element)`. It serves every
envelope segment - `GS`, `GE`, `ST`, `SE`, `IEA`, `TA1`, and the dispatch name of anything the walker
has to place - so a RELEASED element separator still ended the element and shifted every element
after it down a slot. Measured through `parseX12` on the base tree:

```text
GS*HC*S*R*20260601*1200*1*X*005010?*X222A1~   ten elements, GS-08 read "005010?"
applicationSenderCode "SEND*ER"               GS-08 read "X", the GS-07 agency code
                                              warnings: [X12_CONTROL_NUMBER_MISMATCH]
groupControlNumber    "1*2"                   GS-08 read "X";  warnings: []
transactionSetControlNumber "00*01"           ST-03 read "01"; warnings: []
CLM*PT?*ACCT*150.00~                          three elements - the BODY control, always correct
```

Three of the package's four framing decisions were already release-aware: `findUnescapedTerminator`
for the segment terminator, `decodeSegment` (via `splitWithRelease`) for body elements, and
`getSegmentValue` for repetitions and components. This one was the odd one out, and nothing in the
module said so.

## 🩺 The grounding that made this shippable, and it is INSIDE the package

Do not reach for a spec citation first. The decisive evidence is that **the emit half already
released these elements and the read half did not honour it, inside one function call.**

`buildInterchange` maps `esc` (the release escaper) over GS-02, GS-03, GS-06, GS-08, ST-01, ST-02,
ST-03, GE-02 and SE-02, and then **returns `parseX12(raw)` of the bytes it just wrote**. So:

```text
buildInterchange({ ..., applicationSenderCode: "SEND*ER", versionRelease: "005010X222A1" })
  emitted   GS*HC*SEND?*ER*RECV*20260601*1200*1*X*005010X222A1     <- correct
  returned  gs.elements.length === 10, gs.elements[8] === "X"      <- wrong, warnings: []
```

`SegmentSpec`'s own JSDoc states the contract the read half broke: "Element values are LOGICAL - the
builder applies the `?`-release-character escape on emit so any active delimiter inside a value
survives." True of the emit, false of the read.

## 🛑 The already-published-decoding call, made explicitly

This is the reason the residual sat open for a slice. The rule everywhere else in this repo is that
changing how a published document decodes is its own decision. It was taken as follows, and the
reasoning is what a future slice should re-read rather than re-derive:

1. **The changed class is exactly one and it is narrow.** An envelope segment carrying a `?`
   immediately before the element separator. `??`, `?:`, `?^`, `?~` and `?A` in an envelope element
   frame identically under a plain split and a release-aware split, so they are untouched. Pinned as
   invariance controls that are GREEN on both trees - which is the point of them.
2. **🛑 THE CLASS IS SYMMETRIC. A first draft of this note said "every document in that class decoded
   WRONGLY before" and a refuter measured it FALSE.** A `?` before the separator has two readings and
   005010 does not transmit which the sender meant. Where the sender ESCAPED a delimiter, base framed
   it wrongly and head frames it correctly: a CORRECTION. Where the sender sent a LITERAL `?` as the
   element's last byte, base framed it correctly and head merges the element with its successor, so
   the segment loses its LAST element: a REGRESSION. `GS*HC*SUB1*RCV?*20260601*1200*000000123*X*005010X222A1`
   reads nine entries at base and **eight** here, GS-06 answering `"X"` and GS-08 gone.
3. **No code is minted, and `X12_CONTROL_NUMBER_MISMATCH` moves in BOTH DIRECTIONS.** The same first
   draft claimed the channel change was "subtractive, never additive"; that is false for the same
   reason. Where the shift displaced a control number it stops firing (**a consumer that rejects on
   that code now accepts such a document**); where a literal `?` newly displaces one it STARTS firing
   (**and that consumer now rejects a document `0.0.14` accepted**). Both directions are disclosed
   and pinned. This is the `#83` class exactly: a predicate written against a code goes wrong when a
   slice moves cases across it, and the package's own docs are such a consumer.
4. **🩺 The regression direction reaches money, by one route, and it must not be understated.** ST-03
   is what `X12-VARIANT-ICR-UNGROUNDED` made authoritative for the 837 variant, so an ST-02 ending in
   a literal `?` destroys ST-03 and the document re-enters the `SVx` fallback. Measured: an 837
   declaring `005010X222A1` whose only service segment is an `SV2` read `variant` `"P"`, `charge`
   `undefined` and `X12_837_SERVICE_LINE_NOT_DECODED` at base, and reads `variant` `"I"` with
   `charge` `150.00` and that warning SILENT here. **A warned non-decode became a decoded amount**,
   which is the fail-safe direction inverted. Pinned.
5. **What the decision actually rests on, and it is CONSISTENCY rather than the spec.** The two
   readings are mutually exclusive; nothing in 005010 picks between them. `decodeSegment` has read
   BODY elements the escape-wins way on **every released version** - `REF*EA*RCV?*NEXT` is two
   elements at base and here - and `buildInterchange` escapes on emit. So this makes the envelope
   obey the package's ONE rule instead of a second one, and it makes a single function stop
   disagreeing with itself. The body control is pinned, and it is what makes this a fact rather than
   a preference.
6. **The exposure is INBOUND partner bytes only.** Anything this library emitted escapes a literal
   `?` as `??`, so its own output round-trips unaffected on both trees.

## 🩺 Two exemptions, each with its own red control

- **The ISA is NOT release-split, deliberately.** ASC X12 .5 makes the ISA fixed-width: the
  separators sit at known byte offsets, which is exactly what lets `detectDelimiters` recover the
  delimiter set from an interchange before anything is parsed. A `?` in an ISA element is content.
  Release-splitting it would let a `?` one byte before a separator swallow that separator and return
  fewer than 17 entries on a **well-formed** ISA. `buildInterchange` states the same rule from the
  emit side ("pad each element, never escape - the separators are the ISA's own structural bytes,
  declared in-band"). Pinned with an ISA-06 of `SENDER12345678?`, which puts the `?` immediately
  before the separator.
- **A degenerate delimiter set whose element separator IS `?`.** `detectDelimiters` reads the element
  separator positionally out of ISA byte 4 and rejects only control characters and a non-distinct
  set, so `?` is admissible there, and such an interchange framed correctly at base.
  `splitWithRelease` has **no** guard for this (its `RELEASE_CHAR` branch wins, so nothing splits at
  all), while `findUnescapedTerminator` has carried one for the terminator all along. Without the
  same guard in `splitElements` this slice would have INTRODUCED a regression on that set. It is
  added, and removing it reds its own test.

  **Note what was deliberately NOT done:** the guard went into `splitElements`, not into
  `splitWithRelease`. Fixing it in the shared helper would also change `decodeSegment`, `parse-999`
  and every repetition / component split, where the same hole is **PRE-EXISTING** - a body segment
  under a `?` element separator does not frame at base either. That is a wider blast radius than
  this slice's claim, so it stays a backlog line.

## What was retracted rather than reworded

Two committed tests and four documents asserted the old behaviour as a DISCLOSURE. A disclosure that
becomes false is retracted, not softened:

- `test/transactions-claim-837-emit-identifier.test.ts` had "🩺 THE REASON, MEASURED: escaping does
  not protect ST-03 or GS-08" and "🩺 DISCLOSED, NOT GUARDED: a delimiter in ANOTHER envelope field
  shifts these two". Both now pin the corrected framing, and a THIRD test was added because the
  retraction leaves a live question: `build837`'s refusal of an active delimiter in the guide
  identifier was justified by "escaping does not help here", which is now false. **The refusal is
  kept anyway and that is a decision, not an oversight** - a partner's parser is not obliged to be
  release-aware, a published guide identifier has no legitimate use for a delimiter, and widening an
  emit surface is its own slice. The new test pins the refusal so it cannot quietly disappear on the
  strength of the retraction.
- The pending changeset `.changeset/olive-pugs-repeat.md` carried the falsified paragraph. **Corrected
  by DELETION, never by rewording** - a changeset freezes permanently into `CHANGELOG.md` (ADR 0001),
  so a false sentence beats the letter of "do not touch another slice's". Same call as `#85` on
  `#84`'s and as `dicom#91`.
- `CHANGELOG.md` `[Unreleased]`, `KNOWN-LIMITATIONS.md` and `docs-content/cookbook.md` each stated it
  twice over.

## The probe discipline this slice used

The probe ran against `/workspace/x12` **and** against `@cosyte/hl7` as a negative control, where it
must report INAPPLICABLE (no `parseX12` / `buildInterchange` export). A probe that cannot fail
measures nothing. The other half of that discipline, on record from `#73`: **a probe that disagrees
with the model's own shape measures nothing either** - read the shape off the types before writing
the walk.

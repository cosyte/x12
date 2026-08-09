# x12 - an Accept `TA1` this library emitted read back as a Reject (`X12-TA1-EMIT-NOT-RELEASE-AWARE`)

The emit-side slice `#96` (`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`,
`x12-envelope-release-split.md`) named as its sharpest residual and deliberately did not take. Its
reason was one sentence and it was the whole difficulty: **escaping in `buildTA1` changes bytes
already on the wire.** This slice weighed that and took it. Read `x12-envelope-release-split.md`
first; this file is the extension, not a restatement.

## The defect, measured

`buildTA1` joined its five caller-supplied elements with the element separator and released none of
them, so a value carrying an active delimiter took a slot of its own and shifted every element after
it down one. TA1-04 is the disposition, TA1-05 the note, and `parseTA1` narrows an out-of-enum
TA1-04 to `R`. Measured at base `e8f34b9` with `parseX12` + `parseTA1` over
`ISA … <what buildTA1 returned> … IEA`, `ackCode` `"A"` and `noteCode` `"000"` throughout:

```text
icn            raw                                 read ackCode  read TA1-01          warnings
"000000001"    TA1*000000001*260601*1200*A*000     "A"           "000000001"          []
"00000001?"    TA1*00000001?*260601*1200*A*000     "R"           "00000001?*260601"   []
"0000*0001"    TA1*0000*0001*260601*1200*A*000     "R"           "0000"               []
"0000~0001"    TA1*0000~0001*260601*1200*A*000     "R"           "0000"               [X12_UNEXPECTED_SEGMENT]
```

**🩺 `#96` named the `?` row. The `*` and `~` rows are the same inversion and were live on EVERY
released version** - they need no release-aware splitter, because a bare delimiter has always ended
its element. That is the finding that made the slice bigger than the residual as filed, and it is the
argument against reading `#96`'s framing as "a regression this arc introduced": one third of the class
is new, two thirds are as old as the builder.

**🩺 The inverse is the less safe direction and it is not symmetric with the first.** The read narrows
an out-of-enum TA1-04 to `R`, so every WELL-TYPED shift lands on Reject - fail-safe. But `noteCode`
is `Ta1NoteCode` to the type system and unchecked at run time, so a JS or JSON caller can supply
literally `"A"`, which the shift moves onto TA1-04: **a Reject reads back as an Accept**, and a
sender who reads an Accept does not resubmit.

## The decision, and the direction the consumer predicate moves

**The grounding is INSIDE the package, exactly as `#96`'s was, and it is not a spec fact.** Nobody
here has read a 005010 clause that settles what a `?` before a separator means; `#96` recorded that
the class is symmetric and broke the tie on consistency with `decodeSegment`. **Do not re-derive that
as spec.** What grounds *this* slice is narrower and is a fact about this tree: `buildTA1` emitted
bytes that this package's own reader decoded into a **different disposition than the caller asked
for**, while every other builder already released the same class of element through the same helper.
One function disagreeing with itself, which is the same shape `#96` used.

**🛑 THE PREDICATE MOVES IN BOTH DIRECTIONS, exactly as `#96`'s did. A draft of this note said "ONE
direction, nothing starts" and pass 1 refuted it in one probe.** No code is minted and no case moves
onto a new code, so **state the PROPERTY and derive the directions from it, never list them:**

> At head, `parseTA1` of a `buildTA1` output reports the disposition and note **the caller passed**.
> At base it reported whatever element the shift left in slot 4, which could be the caller's, a
> coincidental in-enum value, or an out-of-enum one the read narrows to `"R"`.

Because base was arbitrary, every predicate over `ta1.ackCode` gains cases as well as losing them:

- `ackCode === "R"` **stops** firing where an Accept was shifted onto it (`"0000*0001"`,
  `"0000~0001"`, `"00000001?"` in TA1-01);
- `ackCode === "R"` **starts** firing where a Reject was shifted OFF it - and this needs no
  type-forbidden value at all: `interchangeTime: "12*A"` with `ackCode: "R"` read `"A"` at base and
  reads `"R"` here, every field a valid member of its union;
- `ackCode === "A"` moves the same two ways.

The direction of SAFETY is what is one-way, and it is a different sentence: nothing at head reports a
disposition the caller did not ask for. **Do not compress that into "the predicate moves one way."**

## The cost, which is bytes, bounded

- **A value containing none of the four delimiters and no `?` is emitted byte-for-byte as before**,
  and that is every conformant TA1: TA1-01 echoes ISA-13, TA1-02 / TA1-03 echo ISA-09 / ISA-10, and
  TA1-04 / TA1-05 are code list values. Pinned.
- **🛑 WHAT RELEASING THE REST OF THE SET COSTS - AND TWO DRAFTS OF THIS BULLET WERE REFUTED, THE
  SECOND BY THE CORRECTION TO THE FIRST.** Pass 1 killed "the one class whose bytes get worse"; the
  replacement said the remaining values were released "for no framing gain" and pass 2 measured that
  **inverted**. What is actually true, measured on both trees:
  - Only `*`, `~` and a `?` IMMEDIATELY BEFORE the separator ever shifted the segment's own element
    framing. That much survives.
  - **`^` and `:` moved this package's DOT-PATH reader, and releasing them is a GAIN there.**
    `getSegmentValue(ta1, "01")` answered **`"0000"`** at base for a control number of
    `"0000^0001"` - the reassociation key silently truncated to repetition 0, because that reader
    splits repetitions with `splitWithRelease` - and answers `"0000^0001"` here. The composite read
    `"01-1"` answered `"0000"` at base for `"0000:0001"` and answers the whole value here.
  - **The measured pure cost is a MID-STRING `?`, and only on the surfaces documented as RAW.**
    `raw`, `elements` and `parseTA1`'s fields read `"0000??0001"` where they read `"0000?0001"`;
    every dot-path read unescapes and answered `"0000?0001"` on BOTH trees.
  - **A caller who was hand-rolling the escape regresses on both kinds of surface** - the remedy
    `KNOWN-LIMITATIONS.md` published while this was open. `"00000001??"` in, `TA1*00000001????*…`
    out, and `getSegmentValue` answering `"00000001??"` where it answered `"00000001?"`.
  - **`getSegmentValue` takes an `X12Segment` and `Ta1Segment` carries no `id`**, so every dot-path
    example above needs one added. The runtime never reads it; the types do.
  - **NO TOTAL IS PUBLISHED. This is what was measured, not a closed account** - which is the lesson
    of the two refuted drafts, not a hedge added after them.
- **Releasing `:` and `^` was a DECISION BEFORE it was measured to be a gain, and the argument that
  carried it stands on its own.** `?` has no choice: `escapeRelease` / `unescapeRelease` are a
  bijective pair only if the release character is ALWAYS released, so releasing it conditionally on
  position would break the invariant the fix rests on. `:` and `^` did have a choice, and the
  alternative was a bespoke escaper that is a SUBSET of `escapeRelease` - which puts `buildTA1` back
  outside `makeCallerEscaper`, the chokepoint whose absence this whole class came from, and which
  `test/builder-string-type.test.ts` requires of every builder module. **Record that ordering
  honestly: uniformity was the reason, the dot-path gain was found afterwards by a refuter, and the
  slice does not get to claim it foresaw it.**
- **🩺 The READ half did not move and must not be read as if it had.** `parseTA1` reads elements RAW,
  pre-`?`-unescape, exactly as `X12Segment.elements` has always documented, so `"00000001?"` now
  reads back as `"00000001??"` rather than as `"00000001?*260601"`. **The disposition is correct
  where it was inverted; the round trip is still not an identity on a released value.** Unescaping on
  the read side would move every TA1 a consumer already reads and is a different slice.

## 🛑 Why the release is scoped to a delimiter set the CALLER states

`BuildTA1Options` gained `repetitionSeparator` / `componentSeparator` / `segmentTerminator` beside
the existing `elementSeparator` - the same four `Build999EnvelopeSpec` already takes, so this is the
ack family's existing shape rather than invented API. **They exist for escaping and nothing else;
`buildTA1` still emits no terminator, no repetition and no composite.**

The reason is a defect the obvious implementation would have introduced. `escapeRelease` releases the
four delimiters it is handed plus `?`, and `unescapeRelease` preserves `?X` verbatim for any `X`
outside the reader's declared set. So releasing against a **guessed** delimiter inserts a `?` before a
byte that is not a delimiter where the segment lands, and the value comes back carrying a stray `?` -
a silent corruption of a reassociation key that was correct before. Escaping the element separator
alone would have left the `~` row above open; escaping the archetype set unconditionally would have
minted that corruption for every non-archetype caller. Stating the set is the only option that does
neither. **The defaults are still the cosyte archetype and the function cannot verify them** - that
is unchanged in kind from before it escaped anything, but it now has a byte-level consequence, so it
is pinned rather than claimed away.

## The type check was a PREREQUISITE, not a bonus

Routing the five elements through `makeCallerEscaper` is what makes them released, and it type-checks
first. Writing `escapeRelease(value, delimiters)` inline instead would have reintroduced
`X12-NUMERIC-VALUE-EMITS-EMPTY` exactly: the bare helper returns its **empty accumulator** for a
`number`, so the slice would have replaced a shifted TA1-01 with a **vanished** one. It also would
have red `test/builder-string-type.test.ts`'s "leaves `escapeRelease` reachable only from the
chokepoint".

So a non-string element now refuses with `AckBuildError` / **`X12_ACK_INVALID_SPEC`, an EXISTING
code**. No new code was minted: a consumer does not have to act differently on a wrong-typed TA1
element than on `build999`'s, and minting one because the CAUSE differs is what moves cases off
predicates consumers already wrote. At base a numeric control number emitted `TA1*12345*…` with the
**number surviving onto `elements`, inside a value typed `readonly string[]`**, and an absent one
emitted `TA1**250101*…`. **`enforceAcceptIsClean` still runs FIRST**, so a spec tripping both guards
still reports `X12_TA1_ACCEPT_WITH_NOTE` and no existing refusal moves code. Pinned.

## What was retracted rather than reworded

Seven committed tests and eight documents asserted the old behaviour as a disclosure or as a
justification. A disclosure that becomes false is retracted, not softened:

- `.changeset/rare-hoops-smoke.md` (`#96`'s, still pending on `main`) carried the falsified
  `buildTA1` paragraph. **Corrected by DELETION, never by rewording**, and the `CHANGELOG.md`
  `[Unreleased]` copy of it the same way. `.changeset/olive-pugs-repeat.md` (`#95`'s) was read and
  falsifies nothing here - it is about `build837`'s guide identifier.
- `test/parser-envelope-release-split.test.ts` pinned the inversion as `#96`'s sharpest disclosure.
  It now pins the closure and hands the case to `test/transactions-ack-ta1-escape.test.ts`; the
  `buildInterchange` GS-04 / GS-05 / GS-07 half stayed there until
  `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` closed it and rewrote that pin too.
- `test/builder-segment-type.test.ts` pinned "emits a non-string TA1-01 with no error and no
  warning" and "also admits an unescaped delimiter". **Both now pin the closure.** Its source gate
  keyed on `.join(elementSeparator)` and now keys on `.join(delimiters.element)`.
- `test/builder-string-type.test.ts` asserted NINE escaper declarations with `build-ta1.ts` pinned as
  the deliberate absence, on a justification ("every TA1 element is fixed-width and goes through
  `pad`") that `caller-string.ts` had already measured false in both halves. TEN now.
- `test/builder-refusal-bounds.test.ts`'s refusal-site count moved by one; the module count did not,
  because `build-ta1.ts` already raised.
- `src/builder/caller-string.ts`, `caller-segment.ts`, `caller-decimal.ts`, `parse-ta1.ts`,
  `KNOWN-LIMITATIONS.md` (three sites), `docs-content/troubleshooting.md` and
  `documentation/agent-notes.md` each carried a form of "`buildTA1` escapes nothing" or "nothing
  checks it". **The `seg` / `joinSeg` qualifier is UNCHANGED and must stay** - `buildTA1` still uses
  no joiner, and what that still costs it is the **slot** in the refusal message, which names the
  builder and never `TA1-01`.

**🩺 And a count was DELETED rather than corrected.** `documentation/agent-notes.md` published "`esc`
is unary and invoked 411 times on 378 lines" while the gate asserted 407 - already drifted, in a file
whose whole lesson is that a count duplicated in prose drifts. The prose figure is gone; the gate
still asserts both numbers.

## The probe discipline

The probe ran under a `mktemp -d` path unique to this repo and process, and against `@cosyte/hl7` as
a negative control, where it must report INAPPLICABLE (no `buildTA1` / `parseTA1` pair). A probe that
cannot fail measures nothing.

## Deferred, each its own line

- **`buildInterchange` still does not escape GS-04, GS-05 or GS-07.** Same class, different builder,
  still pinned in `test/parser-envelope-release-split.test.ts`. **CLOSED by
  `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` (2026-08-08)** - `agent-notes/x12-interchange-gs-escape.md`.
- **`buildTA1` still has no segment joiner**, so `requireCallerSegment` never names its slot.
- **`parseTA1` does not unescape**, so a released TA1-01 reads back carrying its `?`. Read-side
  widening, would move every TA1 a consumer already reads.
- **`splitWithRelease` has no degenerate-`?`-separator guard for BODY segments** (`PRE-EXISTING`,
  wider blast radius than the envelope case `#96` closed), and a mid-segment **dangling `?`** raises
  no `X12_DANGLING_RELEASE_CHAR` in envelope or body. Untouched here.

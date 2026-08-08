---
"@cosyte/x12": patch
---

🩺 `buildTA1` now release-escapes its five caller-supplied elements, so an Accept acknowledgment this
library emits no longer reads back as a Reject (`X12-TA1-EMIT-NOT-RELEASE-AWARE`).

`buildTA1` joined the five values with the element separator and escaped none of them, so a value
carrying an active delimiter took a slot of its own and shifted every element after it down one.
TA1-04 is the disposition, TA1-05 the note, and `parseTA1` narrows an out-of-enum TA1-04 to `R`. An
`interchangeControlNumber` of `"0000*0001"` with `ackCode` `"A"` and `noteCode` `"000"` emitted
`TA1*0000*0001*260601*1200*A*000` and read back `ackCode` `"R"`, control number `"0000"`,
`warnings: []` on every channel. **An Accept acknowledgment this library emitted read back as a
Reject, on the element that reassociates it.** The `*` and `~` shapes did that on every released
version; the `?` shape is the one the release-aware envelope splitter opened. **The inverse exists
and is the less safe direction:** the read narrows an out-of-enum TA1-04 to `R`, so a well-typed
shift always lands on Reject, but `noteCode` is checked by the type system and by nothing at run
time, so a `noteCode` of literally `"A"` shifted onto TA1-04 and made a Reject read back as an
Accept. All of it now reads back the disposition that was emitted.

**🛑 It changes bytes this library already put on the wire, and that is the cost.** A value
containing none of the four delimiters and no `?` is emitted byte-for-byte as before, which is every
conformant TA1: TA1-01 echoes ISA-13, TA1-02 / TA1-03 echo ISA-09 / ISA-10, and TA1-04 / TA1-05 are
code list values. A value containing one is now released.

**No warning code is added and no case moves onto a new code, but the consumer predicate MOVES IN
BOTH DIRECTIONS.** `parseTA1` of a `buildTA1` output now reports the disposition and note the caller
passed; before, it reported whatever element the shift left in TA1-04, which could be the caller's, a
coincidental in-enum value, or an out-of-enum one narrowed to `"R"`. So `ackCode === "R"` **stops**
firing where an Accept had been shifted onto it, and **starts** firing where a Reject had been
shifted off it: `interchangeTime: "12*A"` with `ackCode: "R"` read `"A"` before and reads `"R"` now,
with every field a valid member of its union. `ackCode === "A"` moves the same two ways. What is
one-directional is the safety, which is a different statement: nothing now reports a disposition the
caller did not ask for.

**What releasing the rest of the set costs, and where it does not cost.** Only `*`, `~` and a `?`
immediately before the separator ever shifted the segment's own element framing. `^` and `:` moved
the dot-path reader instead, and releasing them is a gain there: `getSegmentValue(ta1, "01")`
answered `"0000"` before for a control number of `"0000^0001"`, silently truncating the
reassociation key to the first repetition, and answers `"0000^0001"` now; the composite read
`"01-1"` answered `"0000"` for `"0000:0001"` and answers the whole value now. The measured pure cost
is a mid-string `?`, and only on the surfaces documented as raw: `raw`, `elements` and `parseTA1`'s
fields read `"0000??0001"` where they read `"0000?0001"`, while every dot-path read unescapes and
answered `"0000?0001"` on both. No total is published. If you were escaping the value yourself, as
`KNOWN-LIMITATIONS.md` advised while this was open, drop that: you are now escaping twice, on both
kinds of surface.

**The read half did not move.** `parseTA1` still reads elements RAW, pre-`?`-unescape, exactly as
`X12Segment.elements` has always documented, so a control number of `"00000001?"` now reads back as
`"00000001??"` rather than as `"00000001?*260601"`. Apply `unescapeRelease` if you need the value
rather than the bytes.

`BuildTA1Options` gained `repetitionSeparator`, `componentSeparator` and `segmentTerminator` beside
the existing `elementSeparator`, the same four `build999` already takes. They exist for escaping and
nothing else: `buildTA1` still emits no segment terminator. Escaping against a guessed delimiter set
is a value corruption rather than a safe default, because `unescapeRelease` preserves `?X` verbatim
for any `X` outside the reader's set, so state the separators if you embed a TA1 in an envelope that
declares different ones. The defaults are unchanged and are the cosyte archetype.

A non-string element now refuses with `AckBuildError` and the existing `X12_ACK_INVALID_SPEC` code.
That is a prerequisite of the escape rather than a separate guard: releasing a value routes it
through the escape helper, and the bare `escapeRelease` underneath it returns its empty accumulator
for a `number`, so escaping without the type check would have replaced a shifted TA1-01 with a
vanished one. A numeric `interchangeControlNumber` emitted `TA1*12345*…` before, with the number
surviving onto `elements` inside a value typed `readonly string[]`, and an absent one emitted
`TA1**250101*…`. The accept-with-note refusal still runs first and still reports
`X12_TA1_ACCEPT_WITH_NOTE`. Measured in `KNOWN-LIMITATIONS.md`.

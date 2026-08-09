# `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` (2026-08-08)

`buildInterchange` released GS-01, GS-02, GS-03, GS-06 and GS-08 on emit and wrote GS-04, GS-05 and
GS-07 raw. It returns `parseX12` of the bytes it just wrote, so **one function disagreed with itself** on
three of its own slots. This note carries the measurement, the decisions and the limits; the
imperatives are in `CLAUDE.md`.

Ninth slice of the `X12-837-RESIDUALS` release-escaping lineage, after
`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` (the read half) and `X12-TA1-EMIT-NOT-RELEASE-AWARE` (the
`buildTA1` half). Both of those named this residual in their own "deferred" sections.

## What was measured at base `837d4bc`

One `buildInterchange` call, one group, `versionRelease: "005010X222A2"`, `groupControlNumber: "1"`,
reading the interchange the same call returned:

```text
groupDate "2026*0601"           GS-06 read "1200", GS-08 read "X"
                                warnings: [X12_CONTROL_NUMBER_MISMATCH]
groupTime "12*00"               GS-06 read "00",   GS-08 read "X"
                                warnings: [X12_CONTROL_NUMBER_MISMATCH]
responsibleAgencyCode "X*Y"     GS-08 read "Y";    warnings: []
groupTime "12~00"               the GS ENDED mid-element; the ST/SE pair became orphans
groupDate "20260601?"           GS-04 merged with GS-05, GS-08 gone entirely
responsibleAgencyCode "X^Y"     framing fine; the dot-path read of GS-07 read "X"
responsibleAgencyCode "X:Y"     framing fine; the composite read "07-1" read "X"
```

**🩺 The GS-07 row is the sharp one, because nothing was raised on any channel.** GS-06 kept its own
slot, so GS-06 and GE-02 still reconciled and no control-number warning fired. What moved was GS-08,
the version / release / industry identifier code, which is the slot `X12-837-EMIT-IDENTIFIER-FIXED`
had just made the caller state.

## The grounding is inside the package, not in a spec clause

Same tiebreak the two sibling slices recorded, and **not re-derived here as a spec fact**:

- `buildInterchange` returns `parseX12` of its own output, so the disagreement is internal and
  measurable without reading a TR3.
- **The sibling-builder precedent is NOT uniform, and a draft that said it was got REFUTED in pass
  1.** Measured on this tree: the domain builders release GS-04 and GS-05 through their own `esc`;
  **GS-07 is a CALLER value in `build999` alone** and is released there, while the rest stamp a
  module constant into GS-07 and route it nowhere. So the precedent covers two of these three slots
  broadly and the third in one builder - **and GS-07, the slot whose base defect raised nothing on
  any channel, is the one with the least of it.** Do not compress this back into "the domain builders
  already released these same three slots"; that sentence shipped to five surfaces including the
  CHANGELOG and was measured false. **Publish no count of the builders either** - a draft said
  "seven" and enumerated eight files in its own parenthetical.
- `SegmentSpec`'s own JSDoc promises the builder applies the release escape so an active delimiter
  inside a value survives.

## 🛑 It changes bytes, and the property is what to read

A value containing none of the four delimiters and no `?` is emitted byte-for-byte as before, which
is every conformant GS-04 / GS-05 / GS-07. A value containing one is released, so its bytes differ
from what `0.0.15` and earlier put on the wire.

**The property: the interchange `buildInterchange` returns now reports the GS-04 / GS-05 / GS-07
values the CALLER passed, where before it reported whatever the shift left in each slot.** No
direction list is published; two drafts of the sibling slices' cost bullets published one and both
were refuted.

**What IS narrower here than in either sibling, and is checkable rather than argued: no reader
moved.** **🛑 SAY "NO EXECUTABLE LINE UNDER `src/parser/` CHANGED", NEVER "THE PARSER IS UNTOUCHED"
- pass 2 measured the file-level form false, because this slice's own remedy for finding 5 corrected
a stale census in `src/parser/envelope.ts`'s JSDoc.** The operative claim survives and is the one to
publish: an inbound document from a trading partner decodes exactly as it did at `0.0.15`. `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` changed how already-published documents
DECODE; this one changes what this library EMITS, and therefore how its own output reads back. Do not
flatten the two into one sentence.

**🛑 STATE THE DELIMITER SET BY ROLE, NEVER BY BYTE - a draft said "only `*` and `~`" and pass 1
refuted it in one probe.** `InterchangeSpec` lets the caller declare all four, so which BYTES shift
is a property of the DECLARED set: with `elementSeparator: "|"` and `segmentTerminator: "!"`, a GS-07
of `"X|Y"` took GS-08's slot at base and `"X*Y"` was inert. The property, which holds for any set:
**only the ELEMENT SEPARATOR and the SEGMENT TERMINATOR ever shifted the segment's own element
framing, plus a `?` immediately before the element separator.** The **repetition** and **component**
separators moved the DOT-PATH reader instead, and releasing them is a **gain** there: on the default
set it answered `"X"` at base for `"X^Y"`, truncating to repetition 0, and
the composite read `"07-1"` answered `"X"` for `"X:Y"`. **The measured pure cost is a MID-STRING `?`,
on the surfaces documented as raw only** - `gs.elements[4]` reads `"2026??0601"` where it read
`"2026?0601"`, while the dot-path read of that value unescapes and is unchanged. Recorded in that
order, and **no total is published**: that is what was measured, not a closed account.

**A caller who was pre-releasing the value themselves is now escaping twice.** `"2026?*0601"` in
gives `2026???*0601` out, and the dot-path read answers `"2026?*0601"` where it answered
`"2026*0601"`. Drop the hand-rolled escape. Same regression the `buildTA1` half recorded on its own
side, pinned here rather than re-argued.

## ⚖️ The implementation decision: type-check BEFORE escaping, not at the join

Routing the three slots through `esc` and stopping there would have **traded a shifted element for a
worse diagnostic.** `esc` is unary, so its refusal can only name the BUILDER;
`requireCallerSegment` holds the whole segment and derives `"GS"-04`. At base those three were the
package's one live route where the segment guard fired FIRST rather than as a backstop, and
`test/builder-refusal-phi.test.ts` had a committed case saying exactly that.

So `buildGroup` runs `requireCallerSegment` over the **unescaped** GS parts, then maps `esc` over
every one of them except element 0 (the trap below), and `joinSeg`'s own call stays where it is as
the structural backstop. This is the same shape
as `X12-TA1-EMIT-NOT-RELEASE-AWARE`'s "route through `makeCallerEscaper`, not bare `escapeRelease`":
the escape is not the whole job, and the way past it is where the second defect gets introduced.

**Consequence, pinned rather than left to be found:** GS-01 / GS-02 / GS-03 / GS-06 / GS-08 already
went through `esc`, so a wrong-typed one refused with the builder-named message at base and refuses
with the slot-named one here. Strictly better, same class, same code, still redacted - but it is a
message change on slots this slice was not about.

**And the escape runs AFTER `expandYY`, never before.** That helper decides on `length === 6`, and a
released value is longer than the one the caller supplied.

## 🩺 `null` and `undefined` in these three slots are ABSENT, not refused

All three resolve through `??` before either guard sees them - GS-04 to the century-expanded ISA
date, GS-05 to the ISA time, GS-07 to `"X"`. So neither guard covers a nullish value in them, and the
refusal pins must not be read as covering every wrong value in the slot. Unchanged from base; nothing
here made it so, and it is pinned so the claim stays scoped.

## The count gate moved DOWN while the coverage widened

`test/builder-string-type.test.ts` pins the `esc` invocation count, and it moved DOWN across this
slice while the coverage widened: `buildGroup` used to invoke `esc` once per already-escaped GS slot,
on one line each, and now maps one `esc` over the GS parts array. **That assertion is a drift
detector and has never measured coverage** - a falling count is not evidence of a shrinking guard.
**🩺 THE FIGURES ARE NOT REPEATED HERE, DELIBERATELY.** A draft of this section published them beside
the sentence telling the reader never to quote them anywhere else, which is the exact duplication
`caller-string.ts` records as the thing that drifts. They are published in that test file's own
header and asserted in the same file, so prose cannot drift from code. Read them there.

## What this does NOT close, stated without a census

- **`buildInterchange`'s IEA-02** does not go through `esc`. It is `padControl`ed and it must stay
  byte-equal to the fixed-width ISA-13 it reconciles against, so releasing one and not the other is a
  decision of its own and not a line of code. Untouched here.
- **The segment id is never escaped, and that is a RULE this slice had to learn.** A draft mapped
  `esc` over element 0 and pass 1 measured it: `esc` releases against the delimiter set the CALLER
  declared, `InterchangeSpec` screens the four only for whitespace, control characters, emptiness and
  distinctness, so a `componentSeparator` of `"S"` turned the literal `"GS"` into `G?S` - the group
  header stopped being a `GS`, `groups.length` went 1 -> 0, five segments fell out as orphans, and
  two warning codes started firing on a spec that built clean at `0.0.15`. `GE` / `ST` / `SE` / `IEA`
  already followed the rule, and the module's own ISA comment states it. **🛑 STATE THE RULE FOR A
  LITERAL ID ONLY.** A draft wrote "a segment id is a structural byte this library owns, not caller
  content" and pass 2 measured it false inside this same module: a `SegmentSpec` body segment is
  `[segmentId, ...elements]` supplied wholesale and `buildTransaction` routes that id through `esc`,
  which `caller-segment.ts` already says out loud.
- **The fixed-width ISA slots** are outside both guards, exactly as `caller-string.ts` and
  `KNOWN-LIMITATIONS.md` already disclose. `pad(1, 15)` still throws an untyped `TypeError` and
  `padControl(1, 9)` still throws the misleadingly-worded typed refusal.
- **A mid-segment dangling `?`** still raises no `X12_DANGLING_RELEASE_CHAR`, in envelope or body.
- **`splitWithRelease` still has no degenerate-`?`-separator guard for BODY segments.**
  **CLOSED 2026-08-09 by `X12-BODY-DEGENERATE-RELEASE-SEPARATOR`** - the guard went into
  `decodeSegment`, per ROLE (element only), not into `splitWithRelease`:
  `agent-notes/x12-body-degenerate-release-separator.md`.
- **`parseTA1` still does not unescape**, and an **empty** control number is still not refused.
- **`PRE-EXISTING`, filed by pass 2 and NOT closed here:** `SegmentSpec`'s JSDoc says the segment id
  (`spec[0]`) is emitted verbatim, and `buildTransaction` has released it since before this slice -
  identical at `837d4bc` and at head, so it cannot be this slice's defect. Not stop-the-line: a body
  id carrying a declared delimiter comes out `?`-prefixed and the walker rejects it loudly as an
  orphan with `X12_UNEXPECTED_SEGMENT`, so it is noisy rather than a silently wrong clinical value.
  Whether the contract or the code is wrong is a decision, which is why it is filed.

**No closed account of what still bypasses the escaper is published here.** Three consecutive drafts
of the sibling module's census were measured false, each by someone finding one more; the standing
rule is to cut the claim back rather than grow the list. Finding one more is expected and is not a
new finding.

## The probe discipline

The base / head probe ran from a scratch path unique to this repo AND this process, and the same
script was run against `@cosyte/hl7`'s build as a negative control, where it must report
INAPPLICABLE (no `buildInterchange` / `parseX12` pair). A probe that cannot fail measures nothing.

## Tests

`test/builder-interchange-gs-escape.test.ts` owns the slice. `test/parser-envelope-release-split.test.ts`
had a committed test asserting the base behaviour as a DISCLOSURE and it was **rewritten into a
closure pin**, the same remedy `X12-TA1-EMIT-NOT-RELEASE-AWARE` applied to its own disclosure - a
committed test that asserts what the tree no longer does is a false disclosure with a green tick
beside it.

The segment-id rule and the by-ROLE delimiter property each have their own pins, both added in the
pass-1 remedy.

Every closure pin sits against a negative control:

- a conformant GS is **byte-identical**, so a blanket escape fails;
- a **genuine** GS-06 / GE-02 disagreement, built from bytes because `buildInterchange` cannot emit
  one, still raises `X12_CONTROL_NUMBER_MISMATCH` - so a change that merely silenced the code fails
  every empty-array assertion above it;
- a **different** guide reference still reads as itself, so a hard-coded GS-08 fails;
- the refusal-message block is **green at base on purpose** - those are PRESERVATION controls, and
  they go red against the naive fix (escape without moving the type check), which is the outcome they
  exist to stop. Measured: 4 red.

Warning-channel assertions are `toEqual` on the whole array, per the standing rule.

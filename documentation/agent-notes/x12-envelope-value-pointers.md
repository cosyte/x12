# `X12-ENVELOPE-VALUE-POINTERS` - a JSDoc that points a consumer at an envelope element index for a value

Item `X12-837-RESIDUALS`, slice `X12-ENVELOPE-VALUE-POINTERS`. Base `61b5981` (`#109`).
`conformance-refuter`: **`REFUTED` -> `NOT REFUTED`, 2 passes.** Last verified 2026-08-09.

`#109` closed this class for ST-03: a typed reader published `tx.st.elements[3]` pre-`?`-unescape,
the framed element text rather than the value the sender stated. `#109` found the same shape in
`src/parser/warnings.ts` and deliberately did not absorb it. This is that slice.

## The census - the filed line was a floor for the SEVENTH slice running, and it is STILL a floor

**Filed: 2 pointers (`st.elements[2]`, `gs.elements[6]`) at `warnings.ts:450-455`.**
**Cut here: 11 pointers, in 4 JSDoc blocks, in 2 files.**
**🛑 AND THE SWEEP DID NOT BOUND THE CLASS** - `src/parser/types.ts` carries more of the same,
enumerated under "the eighth floor" below, found by the gate and NOT closed here. **No completion
claim and no total is published: this slice cut what it measured and filed the rest.**

The mechanism is one sentence of `X12Segment`'s own contract, which the envelope types inherit in
practice: **element values are stored RAW (pre-`?`-unescape)**. A pointer that says "read it here
when you need the values" therefore hands over framed bytes.

### The defect cells, measured from bytes

One interchange, control numbers and counts carrying a released element separator (`?*`), read at
both surfaces. `decoded` is `unescapeRelease(raw, delimiters, noop, pos)`.

| site | pointer | promises | raw | decoded | differs |
|---|---|---|---|---|---|
| `warnings.ts:454` | `iea.elements[2]` | "the values" | `"0000?*001"` | `"0000*001"` | **YES** |
| `warnings.ts:454` | `gs.elements[6]` | "the values" | `"000?*99"` | `"000*99"` | **YES** |
| `warnings.ts:454` | `ge.elements[2]` | "the values" | `"000?*99"` | `"000*99"` | **YES** |
| `warnings.ts:454` | `st.elements[2]` | "the values" | `"000?*11"` | `"000*11"` | **YES** |
| `warnings.ts:455` | `se.elements[2]` | "the values" | `"000?*11"` | `"000*11"` | **YES** |
| `warnings.ts:453` | `isa.elements[13]` | "the values" | `"0000?"` | - | see the ISA note below |
| `warnings.ts:504` | `iea.elements[1]` | "both numbers" | `"?*1"` | `"*1"` | **YES** |
| `warnings.ts:524` | `ge.elements[1]` | "both numbers" | `"?*1"` | `"*1"` | **YES** |
| `serialize.ts:87` | `se.elements[1]` | "the declared and actual values" | `"?*2"` | `"*2"` | **YES** |
| `serialize.ts:87` | `ge.elements[1]` | same sentence | `"?*1"` | `"*1"` | **YES** |
| `serialize.ts:88` | `iea.elements[1]` | same sentence | `"?*1"` | `"*1"` | **YES** |

**⚠ These are the cells that were RUN, not a closed set of shapes.** One released element separator
per slot; no other shape is claimed.

### The in-tree control - pointers that are CORRECT and were left alone

A pointer that LABELS its surface as raw is not this defect. Measured and untouched (head line
numbers):

| site | pointer | label that makes it correct |
|---|---|---|
| `codes.ts:226`, `codes.ts:308`, `parse-ta1.ts:90`, `ack/types.ts:252` | `raw.elements[5]` | "is the byte surface" |
| `envelope.ts:236` | `gs.elements[8]` | "the sender's bytes rather than a normalization" |
| `segment.ts:97`, `warnings.ts:678` | `seg.elements[0]` | "carry them verbatim" |

## 🛑 The ISA is NOT a control, and the first draft of this note said it was

**A draft of this slice published: "the ISA is fixed-width and split POSITIONALLY, so a `?` in it is
content and the raw text IS the value." The gate falsified it and it is deleted, not reworded.**

Be exact about which half fell, because the other half is true and is stated elsewhere in the tree.
**True, and untouched:** the ISA is exempt from `?`-release - `unescapeRelease` is never applied on
that path, so a `?` in an ISA element is content (`KNOWN-LIMITATIONS.md:311`,
`parse-ta1.ts:49`, `envelope.ts:59`). **The consequence the draft missed is that this makes a
raw-vs-unescape cell on the ISA a tautology, not a control.**

**False:** "the raw text IS the value", and the arity the split is claimed to guarantee. `decodeIsa`
(`src/parser/envelope.ts:81`) does:

```ts
const parts = isaHead.split(delimiters.element);
```

The comment above it asserts "exactly 17 entries by construction because the element-separator-position
guard in `delimiters.ts` already verified the layout". Measured on the census document, whose ISA-13
is `0000?*001`, that does not hold:

```text
isa.elements.length   18          (types.ts:134 documents 17 entries)
isa.elements[13]      "0000?"     neither the field's bytes nor its value
isa.elements[14]      "001"
isa.elements[15]      "0"         where ISA-15 is documented
isa.elements[16]      "P"         where ISA-16 is documented
isa.elements[17]      ":"
```

So the draft's control row - raw `"0000?"` against `unescapeRelease("0000?")` = `"0000?"`, "differs:
no" - was a **tautology**. Comparing a value against its own unescape on the one segment where
unescape is never applied cannot detect anything, least of all the shift that is actually present.
**`PRE-EXISTING`** (reproduces at `61b5981`), filed below.

🩺 **`isa.elements[13]` was therefore cut from `warnings.ts` with the other five, on the ordinary
ground that the sentence promised "the values" and this pointer does not always yield one** - not
because the ISA is a special case. The draft additionally called it "untouched" in the changeset
while listing it among the deleted; that contradiction is gone.

🩺 **This was the FOURTH story about which member of a set is special to be falsified in this
lineage** - `#107` had three. The item's rule is exact and was not followed the first time: publish
the cells you ran and no story about them.

## What shipped - deletion, and nothing else

Four cuts, all in JSDoc, four `git diff` hunks in `src/`:

1. `warnings.ts` - the whole trailing sentence naming six indices "when you need the values".
2. `warnings.ts` (`groupCountMismatch`) - the parenthetical naming `iea.elements[1]`.
3. `warnings.ts` (`transactionCountMismatch`) - the parenthetical naming `ge.elements[1]`.
4. `serialize.ts` - the whole trailing sentence naming three indices.

**Nothing grew the code.** No accessor was added, no guard, no test assertion. The lineage's standing
rule is that every finding here is a claim defect in a prose carrier and the answer is to CUT.

**🛑 The `#109` pass-2 trap applied: a remedy can be one word deep, so re-read the whole sentence a
clause lived in.** Cuts 2 and 3 are parentheticals naming TWO things - one raw element index
(`iea.elements[1]`) and one genuinely decoded count (`ix.groups.length`). Deleting only the raw half
would leave "Both numbers stay on the model (`ix.groups.length`)", a sentence naming one of two. The
whole parenthetical went, and the surviving sentence - "Both numbers stay on the model and neither is
silently corrected" - is true and complete.

The sentence at `warnings.ts:429` already tells a consumer that "the bytes stay on the model", so the
cut removes a FALSE promise about values without removing the true statement about bytes.

## ✅ Does the change move a decision? NO, and the control is byte-level

The `#109` standard is to measure both branches rather than assert. Here the measurement is stronger
than a branch table, because there is no branch:

- **The diff is comment-only.** Every changed line begins `* ` inside a JSDoc block; `git diff -U0`
  filtered for non-comment lines returns nothing. 4 insertions, 10 deletions.
- **The emitted JS is byte-identical.** Built base and head with the repo's own `tsup` config:
  `dist/index.mjs` `0b30ed3ac6c30fe4e0936b0c161141ba` and `dist/index.cjs`
  `011750a54527c3043e4fcd273a35828d` on BOTH trees. Nothing a consumer executes moved.

Only the emitted `.d.ts` prose differs, which is the intended change.

## 🔴 `PRE-EXISTING`, measured here, NOT absorbed (ADR 0016 rule 2)

### The eighth floor: `src/parser/types.ts` carries the same pointer, unlabelled

Found by the gate, not by this slice's sweep. The `@example` blocks and prose of the envelope types
name element indices for values with no raw label at all:

```text
types.ts:142   isa.elements[13]; // ISA-13 - interchange control number
types.ts:160   iea.elements[2];  // IEA-02 - must equal ISA-13
types.ts:179   gs.elements[6];   // GS-06 - group control number
types.ts:197   ge.elements[2];   // GE-02 - must equal GS-06
types.ts:228   ta1.elements[1];  // TA1-01 - echoes inbound ISA-13
```

plus matching prose at `types.ts:154`, `:171`, `:190` and `:212`. All ship in `dist/index.d.ts`.
`types.ts:142` belongs on this list precisely because of the ISA section above: `isa.elements[13]` is
not always the value either.
Measured on the same document as the table above, these are the identical cells: `iea.elements[2]`
`"0000?*001"` vs `"0000*001"`, `gs.elements[6]` `"000?*99"` vs `"000*99"`, `ge.elements[2]` the same,
`ta1.elements[1]` `"0000?*001"` vs `"0000*001"`.

🩺 **`ta1.elements[1]` is the sharp one.** TA1-01 is data element I12, the reassociation key. A
consumer following the shipped `@example` compares framed bytes to the ISA-13 being acknowledged and
concludes the acknowledgement belongs to a different interchange - the harm `#108` closed *inside*
`parseTA1`, still reachable by the route the type's own docs prescribe.

**`PRE-EXISTING`**: `src/parser/types.ts` is untouched by this slice (`git diff 61b5981 --
src/parser/types.ts` is empty), so the pointers reproduce on the base. The **introduced** defect was
this note's completion claim, and that claim is cut rather than the sweep grown, per the item's rule.

**🛑 Why the sweep missed them, which is the reusable part:** the grep was anchored on a backtick
(`` `gs.elements[ ``). These are bare inside `@example` code fences. A wording sweep that anchors on
markup misses the carrier that ships as an example, and an example is the form a consumer copies.

### `getSegmentValue` cannot read an envelope segment at all

It takes an `X12Segment`, which requires `id`. `IsaSegment`, `IeaSegment`, `GsSegment`, `GeSegment`,
`Ta1Segment` and the inline ST/SE types on `X12TransactionSet` declare only `raw` and `elements`.
Measured with the repo's own compiler settings:

```
error TS2345: Argument of type 'GsSegment' is not assignable to parameter of type 'X12Segment'.
  Property 'id' is missing in type 'GsSegment' but required in type 'X12Segment'.
```

Identical for `IsaSegment` and `Ta1Segment`. So there is no ergonomic decoded read for an envelope
element; `unescapeRelease(gs.elements[6], d, sink, pos)` on the string is the only route.

Disclosed in-tree already at `build-ta1.ts:67`, `agent-notes/x12-ta1-emit-escape.md:91` and in
`CHANGELOG.md`'s `0.0.15` entry (no line number: this slice's own `[Unreleased]` entry moves it, and
a citation a remedy makes stale is `#109` pass 3's failure mode), so it reproduces on the base. **`KNOWN-LIMITATIONS.md:308` still tells a consumer
to "read through `getSegmentValue`" for the logical value of a `gs` element, which does not
compile.** Left standing deliberately: correcting it means either widening a public signature or
writing a new disclosure, and both are decisions of their own size.

### Two more, surfaced by pass 2

- **`src/parser/warnings.ts:482`** - "The declared version stays on `isa.elements[12]`", an unlabelled
  envelope value pointer **in a file this slice swept**, left standing. It was treated as correct on
  the draft's ISA reasoning, and that reasoning fell; it belongs with the eighth floor. Untouched by
  this slice, reproduces at `61b5981`.
- **`.changeset/tidy-lamps-argue.md:46`** - a **pending** changeset that reports
  `getSegmentValue` answering for a GS-07, the call measured above as a `TS2345` on a `GsSegment`.
  **It freezes into `CHANGELOG.md` on release.** Tracked at base and belonging to another slice, so
  it is filed rather than absorbed - but it is the one item on this list with a deadline.

### The ISA element split has no arity check

`decodeIsa` splits on the element separator and its comment asserts "exactly 17 entries by
construction". An ISA-13 carrying a raw separator yields 18 and silently re-indexes ISA-14/15/16, so
the usage indicator reads `"0"`. Reproduces at `61b5981`. **Not `STOP-THE-LINE`:** the document does
raise `X12_CONTROL_NUMBER_MISMATCH`, the shift lands on control and routing rather than on a dose, a
code or a clinical identifier, and the input is non-conformant (an ISA-13 cannot carry an
unescapable separator, since the ISA honours no escape).

## ⚖️ Why the `X12Segment.elements` mis-citations were NOT folded in

The item offered `parse-ta1.ts:41` and `KNOWN-LIMITATIONS.md:306` as a possible fold-in, **if and only
if the census showed the same defect.** Measured, they are not, on three counts:

| | this slice's defect | the mis-citations |
|---|---|---|
| truth value | the pointer's promise is FALSE (raw != value) | the statement is TRUE - `gs.elements` and TA1 raw elements ARE raw, measured |
| direction | points a consumer TOWARD a raw index for a value | points a consumer AWAY from raw elements for values |
| remedy | delete the pointer | correct a citation target, or document rawness on the envelope types |

`parse-ta1.ts:41` says the TA1 `raw` surface behaves "exactly as `X12Segment.elements` documents", and
`KNOWN-LIMITATIONS.md:306` says values are raw "exactly as `X12Segment.elements` has always
documented". Both are attribution defects: `Ta1Segment` and `GsSegment` are not `X12Segment`, and
neither of their own JSDoc blocks says anything about raw-versus-decoded, so the citation is the only
grounding and it names a type that does not govern. That is a real defect and it is **filed, not
absorbed** - a citation-grounding problem, not a value-pointer one. Folding it in would have mixed
two remedies in one slice and, at `KNOWN-LIMITATIONS.md:306`, dragged in the public-signature question
above.

🩺 **The eighth floor above sharpens this rather than changing it:** the reason those citations are
the only grounding is exactly that the envelope types document nothing about rawness. Whoever takes
that slice should weigh labelling the five types (which is what `#109` did for `X12TransactionSet` in
this same file) against deleting the examples.

## The claim sweep - by WORDING, tree-wide, not file by file

The falsified wording is "read ... off the model when you need the values" and the two "both numbers
stay on the model (`<index>`)" parentheticals. Swept across the whole tree:

- `src/` - the three sentences and two parentheticals cut. **The sweep was NOT clean:** an
  `@example`-fenced instance of the same class survives in `src/parser/types.ts`, filed above.
- `README.md`, `KNOWN-LIMITATIONS.md`, all `docs-content/` pages (**which ship**) - no instance of the
  falsified wording. The `docs-content` uses of `elements[n]` are worked examples with a stated input
  and a shown output (`st.elements[1] === "835"` for routing, `isa.elements[6].trim()`), correct for
  the input shown, and not general promises that an index yields a value.
- **The pending carriers**: nine changesets and the `[Unreleased]` CHANGELOG. **The whole
  `CHANGELOG.md` head is still `[Unreleased]`, so anything written into it FREEZES on release**; this
  slice's own entry and changeset were corrected **by deletion** after pass 1, never reworded.
- `dist/` carries the old JSDoc but is **gitignored** and regenerated by the build, so it is not a
  committed carrier.
- `CLAUDE.md` - carried no instance of the wording; it gained this slice's trap.

## The gate

**Pass 1: `REFUTED`.** One blocker and two majors, every one a claim defect in a prose carrier, and
every remedy a deletion:

1. **`INTRODUCED` blocker** - the census did not bound the class (`src/parser/types.ts`, five
   carriers), while the changeset, CHANGELOG and this note published "no JSDoc points a consumer at
   an envelope `elements[n]` for a value **any more**", a bounded census, and "**Re-grepped clean**".
   **Remedy: every completion claim CUT, the eighth floor filed. The sweep was not grown.**
2. **`INTRODUCED` major** - the "THE ISA IS THE CONTROL / split positionally" story, falsified above.
   **Remedy: the story DELETED in all four carriers, its tautological control row removed.**
3. **`INTRODUCED` major** - `isa.elements[13]` was published as both deleted and untouched in the same
   changeset entry. **Remedy: deleted, and it goes away with the ISA story.**
4. **`INTRODUCED` minor** - "3 SITES" contradicted this note's own "Four cuts" and the 4 measured
   hunks. Corrected to what was counted.
5. **`INTRODUCED` minor** - two stale head-tree line citations (`warnings.ts:682` -> `678`,
   `:484` -> `:482`), made stale by this slice's own net deletion. This is `#109` pass 3's failure
   mode repeating: a remedy makes its own citations stale.
6. **`PRE-EXISTING` major** - the ISA arity hole, filed above, not blocking.

Claims the gate verified and that held: the comment-only diff, the verbatim relocation, the ratchet
arithmetic, all 11 deleted-pointer cells, every other file citation, and no PHI in the diff or
fixtures.

**Pass 2: `NOT REFUTED`**, run against the remedy diff by a fresh context. All six pass-1 findings
re-checked and holding; **no fresh `INTRODUCED` blocker inside the remedy**, no cut-back recommended.
Three `INTRODUCED` minors, all folded in as deletions and none needing a re-grade:

- **A compressed cell in `CLAUDE.md` named five pointers by one pointer's bytes** and was false for
  three of them (`iea.elements[2]` is `"0000?*001"`, `st`/`se` are `"000?*11"`), and it wrote
  "ISA-15/16 shift" where the shipped carriers correctly say ISA-14/15/16 re-index. **Deleted down to
  one accurate cell plus a pointer to this note's table**, with a standing instruction not to restate
  the cells there. The shipped carriers were measured correct.
- **"five more" contradicted this note's own enumeration**, which also omitted `types.ts:142`. The
  count is **deleted** and `types.ts:142` added to the list.
- **`CHANGELOG.md:1495` is a base line number**; head is `:1532`, moved by this remedy's own
  `[Unreleased]` insertion. **The line number is deleted.** This is exactly `#109` pass 3's mode: a
  remedy making its own citations stale.

🩺 **Pass 2's standing worry, recorded because it is the right one:** `CLAUDE.md` is where every
compression in this lineage lands, it is the always-read carrier, and both of its findings were one
word deep. Every finding across both passes was again a claim defect in a prose carrier; the parser
half was never refuted, and no test in this repo gates that class.

## The ratchet

`x12/CLAUDE.md` was at **49,886 against a 49,886 entry - ZERO headroom**. Paid by relocating **two**
traps in full and verbatim, each diffed byte-identical against the inline text before the inline copy
was condensed:

- `X12-EMIT-DELIMITER-SHAPE-UNCHECKED` -> `agent-notes/x12-emit-delimiter-shape-unchecked.md`
- `X12-TA1-RESIDUALS` -> `agent-notes/x12-ta1-residuals.md` (the second was needed once the pass-1
  remedy grew the trap with the eighth floor and the ISA falsification)

The file now sits at **49,583**. **No trap was deleted and no sentence was weakened to fit** - when
the first correction did not fit, the answer was a second relocation, not a shorter claim. The budget
hook refused that write, which is the mechanism working.

**`REPO_CLAUDE.x12` in the umbrella is owed a lowering to 49,583.** This slice is scoped to the
submodule and did not touch the umbrella, so it is left to the coordinator.

## Discipline 3 - crew / knowledgebase

**No shipped runtime message changed and no public field's decoding changed** - the emitted JS is
byte-identical, so there is nothing here a `crew` skill or a `knowledgebase` doc could be reading that
has moved. The `.d.ts` prose changed only by deletion of false guidance. **`#109`'s two queued items
under `CREW-KB-SURFACE-DEBT` still stand and are not discharged by this slice.**

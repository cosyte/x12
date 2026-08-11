# `X12-ISA-VALUE-POINTERS` (2026-08-11)

Closes the ISA half of the semicolon item `#116` filed as **"`types.ts`'s ISA block +
`warnings.ts:482`'s `isa.elements[12]`"**, and left explicitly open for a later slice because its own
remedy would have rested on a mechanism claim it could not make.

Provenance: this repo's own source tree at `bab2a41` and at the head of this slice, measured (every
cell, every census, every control) with `tsx` against `src/`, never inferred. The only spec
statements the diff adds are that ISA-12 is the interchange control version number with `00501` the
HIPAA-mandated baseline and that ISA-13 is the interchange control number reconciled against IEA-02;
both were already in this tree at base (`envelope.ts`, `warnings.ts`, `KNOWN-LIMITATIONS.md`) and
neither is newly derived here. **No TR3 is cited and none is needed** - the defect rests on this
package disagreeing with itself, not on a clause anybody here has read.

**Read side. Nothing on the build side moved. No behaviour moved at all: the diff is comment-only and
the emitted JS is byte-identical base to head.**

## The re-measurement, which killed one filed line before it built anything

The filed line above the ISA one - **`src/parser/types.ts`'s `@example` indices ship in
`dist/index.d.ts`, `ta1.elements[1]` sharpest** - is **STALE, not a floor.** `#116` (`f0295a2`)
closed it. On this tree all four non-ISA envelope types carry the raw label and their fences point at
raw text:

```text
types.ts:166   iea.elements[2];    // raw text of IEA-02 (post-element-split, pre-?-unescape)
types.ts:190   gs.elements[6];     // raw text of GS-06 (post-element-split, pre-?-unescape)
types.ts:213   ge.elements[2];     // raw text of GE-02 (post-element-split, pre-?-unescape)
types.ts:252   ta1.elements[1];    // raw text of TA1-01 (post-element-split, pre-?-unescape)
types.ts:278   tx.st.elements[1];  // ST-01 - transaction set ID (e.g. "835")   <- CONTROL, see below
```

The last row is not a defect, by `#116`'s RULE rather than by its grid: `X12TransactionSet` carries
`#109`'s label ("the strings are PRE-`?`-unescape") in its own prose, and a pointer that LABELS its
surface raw is correct and was left alone. **`#116` measured `st.elements[2]` (ST-02) as its control
row and never measured this line**, so the rule is applied here, not inherited. It is listed because
a census that omits the one carrier `#116` had to argue about reads more complete than it is.

Only `IsaSegment` still promised values, which is exactly the half `#116` filed with
`warnings.ts:482`. **Re-measuring cut a slice here rather than adding one**, the second time in this
lineage (`#108` deleted a hole `#102` had already closed).

## The defect

Two carriers, both rendering into `dist/index.d.ts` and `dist/index.d.cts`, which ship:

- **`src/parser/warnings.ts`**, `pre005010`'s JSDoc: *"The declared version stays on
  `isa.elements[12]`."*
- **`src/parser/types.ts`**, `IsaSegment`: *"`elements` is the 16 ISA values, 1-indexed (`elements[1]`
  is ISA-01, ..., `elements[16]` is ISA-16)"*, and the fence's
  `isa.elements[12]; // ISA-12 - version, expected "00501"` /
  `isa.elements[13]; // ISA-13 - interchange control number`.

`isa.elements` holds raw byte text. A pointer promising the value hands over something else, and on
the `pre005010` block it does so in the one situation the warning it documents is about.

## The cells

`parseX12` on one 005010 interchange per row, plus two `buildInterchange` rows for the emit-then-read
direction. **Count the rows; no total is published, here or anywhere. `warnings: []` does NOT attach
to this grid** - the displacement rows raise codes, and that is printed per row rather than asserted
over the grid.

```text
construction                         cell          stated / at that ISA offset  elements[n]  warnings
spec-clean                           elements[12]  "00501"                      "00501"      []
spec-clean                           elements[13]  "000000001"                  "000000001"  []
ISA-12 declares 00401                elements[12]  "00401"                      "00401"      X12_PRE_005010
ISA-06 carries `*`                   elements[12]  "00501"                      "^"          X12_ISA_EXTRA_ELEMENT_SEPARATOR,X12_PRE_005010,X12_CONTROL_NUMBER_MISMATCH
ISA-06 carries `*`                   elements[13]  "000000001"                  "00501"      X12_ISA_EXTRA_ELEMENT_SEPARATOR,X12_PRE_005010,X12_CONTROL_NUMBER_MISMATCH
ISA-13 carries `*`                   elements[12]  "00501"                      "00501"      X12_ISA_EXTRA_ELEMENT_SEPARATOR
ISA-13 carries `*`                   elements[13]  "0000*0001"                  "0000"       X12_ISA_EXTRA_ELEMENT_SEPARATOR
ISA-13 carries `?`                   elements[13]  "00000001?"                  "00000001?"  X12_CONTROL_NUMBER_MISMATCH
this library's own emit, stated " "  elements[13]  " "                          "00000000 "  []
this library's own emit, stated "1"  elements[13]  "1"                          "000000001"  []
```

Read the `pre005010` row against its own docblock: the interchange declares `00501` at ISA-12's own
fixed offset, `X12_PRE_005010` fires anyway, and the sentence the consumer is holding says the
declared version is on `elements[12]`, which answers `"^"`. **That is a consequence, not a mechanism**
- see below.

The `ISA-13 carries ?` row is the one that shows the four siblings' label is the wrong label here:
raw is `"00000001?"` and the `?` is content, because the ISA split is deliberately not release-aware
(`KNOWN-LIMITATIONS.md`, `decodeIsa`'s own docblock, `buildInterchange` from the emit side). Its
`X12_CONTROL_NUMBER_MISMATCH` is the fixture - IEA-02 is an ordinary segment and unescapes - and not
a finding.

The two `buildInterchange` rows are this library's own emit: `padControl` pads, so `elements[13]`
carries bytes the caller did not state. **No trim, disclosed and not fixed** (`X12-EMPTY-CONTROL-NUMBER-FABRICATED`).

## 🛑 No mechanism is named, and no closed set of them

**Fixed-width padding and arity displacement each falsify a cell on their own**, on documents that
share nothing: the padding cell needs no `?` and no anomaly (`#116`'s gate measured
`isa.elements[6] = "SENDER         "` on a spec-clean file, `warnings: []`), and the displacement
cells need no padding. `#116` attributed the ISA cells to `decodeIsa`'s arity check and the gate
falsified it in one measurement; that was **the fifth which-member-is-special story in this lineage**.
A sixth is not written here in either direction. **Two are measured, a third is not ruled out, and the
label added below names none of them.** Nothing here says which ISA element is special, which
mechanism is the reason, or that the set of reasons is closed.

## The remedy

**Deletion on one carrier, the label on the other**, and the split is stated rather than summarised:

| carrier | what the diff does |
|---|---|
| `warnings.ts`, `pre005010` | the sentence *"The declared version stays on `isa.elements[12]`"* DELETED outright, nothing put back. The block already says what the guard tests. |
| `types.ts`, `IsaSegment` prose | *"the 16 ISA values"* DELETED; the TR3 semantics for ISA-12 and ISA-13 KEPT, restated at SEGMENT level where they are true, exactly as `#116` did on `IeaSegment` / `GsSegment` / `GeSegment`; the raw label ADDED; the 1-indexed mapping SCOPED to a 17-entry split rather than deleted, since it is true there and is the only account of the field. |
| `types.ts`, `IsaSegment` `@example` | both value-promise pointers REPLACED by one indexed pointer with a raw-text comment plus a `.raw` pointer - **the same two-line shape the four sibling fences already carry**, at the same slot they carry it (IEA-02, GS-06, GE-02, TA1-01 and now ISA-13 are all the control-number slot). Uniformity, not a judgement about ISA-13. |

**🛑 The label is NOT the siblings' label.** They read *"Element values are stored RAW,
pre-`?`-unescape"*. Copying that onto the ISA would ship a false sentence, because the ISA split is
not release-aware. The ISA label says **RAW** and stops there, which covers padding, `?`-as-content
and displacement without naming any of them.

**What is NOT done:**

- **No route is named as THE route** for reading an ISA element. `#111` measured that framing false
  and `#116` declined to state any rule over the ISA; nothing here states one.
- **The 1-indexed mapping is not deleted.** Only the unconditional form was false. It is scoped, and
  the scope points at `X12_ISA_EXTRA_ELEMENT_SEPARATOR`, which `#117` added and which reports the
  other case. **No shift is quantified** (`X12-ISA-ELEMENT-ARITY`: never "by one", never off
  `elements.length`).
- **No test was added.** The class is a claim defect in a prose carrier and no test gates it, which
  is this lineage's standing measurement. `check:no-internal-refs`, which eleven siblings run and
  `x12` does not, remains its own slice and is not absorbed.

## The sweep, and what its anchor cannot see

Anchor 1, the wide one, deliberately NOT backtick-anchored (the exact failure `#110` published
"re-grepped clean" over):

```
git ls-files | grep -v '^dist/' | xargs rg -n 'elements\[[0-9]+\]'
# at base bab2a41: 483 hits over 342 tracked files
```

Anchor 2, the falsified clauses themselves, tree-wide over the same file list: `declared version
stays`, `16 ISA values`, `is ISA-01`, `expected "00501"`, `ISA-13 - interchange control number`.
**Measured at base `bab2a41`**, outside the two carriers the diff opens, those five literals hit
exactly two lines, both in `documentation/agent-notes/x12-envelope-value-pointers.md` (`:143` and
`:200`), where they QUOTE the base text as the filed residual. The record, not a carrier. At head
this note, the `[Unreleased]` entry and the changeset quote the same base text, for the same reason.

**🛑 That is a result about five clause literals, not about the defect.** `#116`'s gate found a carrier
its ten-literal sweep never named, and the paragraph summarising that sweep is what made it look
accounted for. **No claim is made that the errata set is exhaustive, and no count of pointers is
published as a closed total. Finding one more is expected and is not a new finding.**

**What the anchors CANNOT see, stated as part of the claim:**

- a pointer with a non-literal index (`elements[i]`, `elements[n]`) - the regex requires digits;
- a pointer in prose that never writes the bracket form ("the thirteenth element", "element 13");
- a pointer reached by a different accessor (`raw.slice(84, 89)`, a dot-path string);
- a value-promise about an ISA element that names no index at all - **and the runtime warning message
  below is exactly that shape, found by reading rather than by either anchor**;
- anything in `dist/` (excluded as derived) and anything untracked;
- a promise split across a JSDoc line wrap between the identifier and its bracket.

**🩺 `grep -c` against a file has been measured in this container to report no match on a file `rg`
finds hits in.** Every zero above was taken with `rg` and re-taken with a `node` read of the file, and
both agreed.

## Controls

- **Comment-only.** `git diff -U0 -- src/` with every ` * ` comment line filtered out is EMPTY.
- **Emitted JS byte-identical base to head.** `dist/index.mjs` `4898ca0cccd204345ae1c2254d7c21bc`,
  `dist/index.cjs` `7b544863ba4e79c5a4b08dfcd0cbd91b`, the same before and after, built from both
  trees. **This control has force here** because the slice edits `src/parser/warnings.ts`, which
  exports `pre005010` at run time; on `src/parser/types.ts` alone it would be near-vacuous, and
  `#116`'s gate said so.
- **The shipping carrier DID change, and the falsified clauses are gone from it.** `dist/index.d.ts`
  and `dist/index.d.cts` both `9e396f5ae8e1882342237949c2b4b129` -> `0d7fe1f926f77a69bbccaf9deaac9c24`.
  Each of the four clause literals: **1 occurrence in each twin at base, 0 at head**, measured with
  `rg` and with a `node` read.
- **The base tree was restored by file copy, never `git checkout --`.**

## Filed, not absorbed (ADR 0016 rule 2)

- **🩺 `WARNING_MESSAGES.X12_PRE_005010` carries the same overclaim at RUN TIME.** It reads *"ISA-12
  declares a version other than the HIPAA baseline `00501` ... The declared version is preserved
  verbatim on the model."* The first clause is falsified by the `ISA-06 carries *` row above, on which
  ISA-12 declares `00501` at its own fixed offset. **PRE-EXISTING**, reproduces on the base,
  untouched here: a runtime message is a published surface with a snapshot test, a different carrier
  and a different review path from a comment, and moving it is a behaviour decision that needs its own
  slice. The `pre005010` docblock's twin of the same clause (*"Emitted when ISA-12 declares any
  version other than `00501`"*) is **deliberately left in agreement with it** rather than corrected in
  one carrier only.
- **The `docs-content/` value comments** `#116` filed at `cookbook.md`, `spec-notes-envelope.md` and
  `spec-notes-transaction-sets.md`, and `spec-notes-envelope.md:74`, remain their own rows.
- **`parseTA1` has no `index` parameter**; the TA1-04 / TA1-05 code-list citations remain UNGROUNDED
  with a live `I12`/`I13` namespace collision one directory away. **Do not ground either by reasoning,
  by analogy, or from `codes.ts`, and do not propose a source scan.**
- **Porting `check:no-internal-refs`.** The seven `PRE-EXISTING` are untouched.

## The budget

`x12/CLAUDE.md` was AT its ratchet with zero headroom (derived: file size equalled
`REPO_CLAUDE.x12` in the umbrella's `.claude/hooks/doc-budget.mjs`). **Paid by relocating
`X12-VARIANT-LOOKUP-PROTOTYPE` in full into `agent-notes/x12-variant-lookup-prototype.md` FIRST**:
the base block's heading through its last bullet, `CLAUDE.md:305-337`, `diff`ed against the relocated
body and **byte-identical (2,913 == 2,913)**, before the inline copy was condensed to the short form.
The blank line that separated it from the next `###` is not part of the block and stayed in
`CLAUDE.md`.
**No trap deleted, no sentence weakened, the ratchet not raised.** Derive the current figure; do not
trust one written here. **`REPO_CLAUDE.x12` is owed a lowering to match** - this slice is scoped to
the submodule and did not touch the umbrella, so that is left to the coordinator, as `#110`, `#111`
and `#116` also left it.

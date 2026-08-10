# `X12-ENVELOPE-VALUE-EXAMPLES` (2026-08-10)

Closes the residual `#110` filed as **"the eighth floor"** and `#111` re-filed verbatim as
`src/parser/types.ts`'s `@example` indices, the eighth floor (**`ta1.elements[1]` sharpest**)`.

**Read side.** Nothing on the build side moved. No behaviour moved at all: the diff is comment-only
and the emitted JS is byte-identical base to head.

## The defect

`Iea`/`Gs`/`Ge`/`Ta1` each declare only `raw` + `elements`. Their JSDoc named each index and then
named the VALUE that index holds - "IEA-02 interchange control number - must match ISA-13",
"GS-06 group control number", "TA1-01 (echoes the prior interchange's ISA-13 control number)" - and
repeated the promise inside an `@example` fence. **Element values are stored RAW, pre-`?`-unescape.**
So a consumer following the shipped example compares FRAMED BYTES to the value it is reconciling
against, and the comparison fails on a value the sender stated perfectly legally.

The carrier is **`dist/index.d.ts` (and `dist/index.d.cts`), which ships.** An `@example` is the
form a consumer copies, so this is not an internal comment defect.

`ta1.elements[1]` is the sharp one **as a consequence, not as a mechanism**: TA1-01 is data element
I12, the reassociation key, and `#108` already fixed exactly this harm INSIDE `parseTA1`. The type's
own docs were the remaining route to it, so the package disagreed with itself.

## The measurement

The non-ISA envelope cells `src/parser/types.ts` documents, on one interchange in which each carries
the sender-intended value `A*B`, written on the wire in released form `A?*B`. Run against `0dd68b2`
with `parseX12`. **Count the rows; no total is published, here or anywhere.**

```text
carrier                        slot                          raw       intended  rawIsValue
Ta1Segment  prose+example      elements[1] TA1-01 ctrl-num   "A?*B"    "A*B"     false
Ta1Segment  prose              elements[2] TA1-02 date       "A?*B"    "A*B"     false
Ta1Segment  prose              elements[3] TA1-03 time       "A?*B"    "A*B"     false
Ta1Segment  prose+example      elements[4] TA1-04 ack code   "A?*B"    "A*B"     false
Ta1Segment  prose              elements[5] TA1-05 note code  "A?*B"    "A*B"     false
GsSegment   prose+example      elements[1] GS-01 func id     "A?*B"    "A*B"     false
GsSegment   prose+example      elements[6] GS-06 ctrl-num    "A?*B"    "A*B"     false
GsSegment   prose              elements[8] GS-08 version     "A?*B"    "A*B"     false
GeSegment   prose              elements[1] GE-01 tx count    "A?*B"    "A*B"     false
GeSegment   prose+example      elements[2] GE-02 ctrl-num    "A?*B"    "A*B"     false
IeaSegment  prose              elements[1] IEA-01 grp count  "A?*B"    "A*B"     false
IeaSegment  prose+example      elements[2] IEA-02 ctrl-num   "A?*B"    "A*B"     false
X12FunctionalGroup  example    group.gs.elements[1] GS-01    "A?*B"    "A*B"     false
X12TxSet    CONTROL (labelled) st.elements[2] ST-02          "A?*B"    "A*B"     false
```

The last row is the CONTROL, not a defect: `X12TransactionSet` carries `#109`'s label ("the strings
are PRE-`?`-unescape"), and a pointer that LABELS its surface raw is correct. **It diverges exactly
like the others and is fine, which is the whole point of the label** - the divergence is not the
defect, the unlabelled promise is.

**🛑 `warnings: []` DOES NOT ATTACH TO THIS GRID, AND A DRAFT SAID IT DID.** This construction reads:

```text
[X12_TRANSACTION_COUNT_MISMATCH, X12_GROUP_COUNT_MISMATCH, X12_CONTROL_NUMBER_MISMATCH]
```

**GE-01, IEA-01 and IEA-02 are ROWS in the grid and are the count / control-number slots**, so no
interchange built to this construction can be silent - the released value is exactly what stops them
reconciling. The silent evidence is the round trip below, not this grid. A draft attached
`warnings: []` to the grid in four carriers and the gate falsified it.

The round-trip cells, `buildTA1` then `parseX12` + `parseTA1`, reproducing `parse-ta1.ts`'s own
table on this tree:

```text
stated ctrl-num  emitted TA1                          elements[1]    parseTA1()     warnings
"000000001"      TA1*000000001*260601*1200*A*000      "000000001"    "000000001"    []
"0000*0001"      TA1*0000?*0001*260601*1200*A*000     "0000?*0001"   "0000*0001"    []
"0000~0001"      TA1*0000?~0001*260601*1200*A*000     "0000?~0001"   "0000~0001"    []
"0000:0001"      TA1*0000?:0001*260601*1200*A*000     "0000?:0001"   "0000:0001"    []
"0000^0001"      TA1*0000?^0001*260601*1200*A*000     "0000?^0001"   "0000^0001"    []
"00000001?"      TA1*00000001??*260601*1200*A*000     "00000001??"   "00000001?"    []
```

Five of six rows: the pointer the type's `@example` prescribes answers a value matching no ISA-13,
while `parseTA1` on the same bytes answers the stated one. **Every row `warnings: []`.**

## 🛑 The filed line was a FLOOR, for the ninth time, in three independent ways

1. **It named the `@example` indices. The PROSE paragraph above each `@example` carries the
   identical value-promise** and was never filed. This is the lineage's own shape - the fence is the
   measurement, the paragraph about it is the claim - and here BOTH were defective.
2. **It named `types.ts`; it did not name which types.** The same defect stands in `IeaSegment`,
   `GsSegment`, `GeSegment`, `Ta1Segment` **and `X12FunctionalGroup`, a carrier the filed
   five-item enumeration never names at all** - and, outside `types.ts`, in `parseX12`'s own
   `@example` (`src/parser/index.ts`), on the package's primary export.
3. **"`ta1.elements[1]` sharpest" is true only as a consequence claim.** The same released value
   falsifies every row, so cutting TA1 alone would have left the defect standing on every
   UNLABELLED row. **🛑 Not "every other row": the ST-02 row is the labelled CONTROL and carries no
   defect, as this note says forty lines above.** A draft wrote the wider form here while fixing a
   wrong COUNT in the same paragraph, which is the same error in the other currency - **a quantifier
   over a table is a claim exactly as a total is.** **No story about which member is special is
   published here; the cells are.**

## The remedy

**The LABEL, which is `#109`'s precedent in this same file and which `#110` explicitly left open for
this slice** ("weigh labelling the five types against deleting the examples").

**🛑 CHECK THIS AGAINST THE DIFF, NOT THIS PARAGRAPH - a draft's summary said "the LABEL, never a
corrected pointer" while the diff corrected four pointers in place.** What the diff actually does,
per carrier:

| carrier | what happened in the diff |
|---|---|
| `IeaSegment`, `GsSegment`, `GeSegment`, `Ta1Segment` prose | the `elements[n]` = VALUE mapping DELETED; the TR3 semantics KEPT, restated at SEGMENT level where they are true; the raw label ADDED |
| the same four `@example` fences | ONE pointer KEPT at its index, its value comment REPLACED by `// raw text of ... (post-element-split, pre-?-unescape)`, and a `.raw` pointer ADDED |
| `GsSegment` and `Ta1Segment` `@example` fences, additionally | a SECOND pointer DELETED outright - `gs.elements[1]` and `ta1.elements[4]`. **A draft's version of this table said the fences kept "the pointer" and never mentioned these two, so the table meant to be diff-checked was itself short two rows.** |
| `X12FunctionalGroup`'s `@example` | the GS pointer DELETED outright, nothing put back |
| `parseX12`'s `@example` (`src/parser/index.ts`) | the value comment `// "HC"` REPLACED by the raw label |

So this is a **replacement remedy on five carriers and a deletion on one**, not a pure deletion.
That is legitimate here only because `#110` left the choice open for this slice and because the
carriers OWED the consumer the semantics they were the only home for. **It is not the shape `#110`
used, and calling it that was the error.**

**What is NOT done:**

- **No route is named as THE route.** `#111` measured that framing false. `Ta1Segment` gains only
  facts `parse-ta1.ts` already states: `parseTA1`'s five decoded fields are POST-`?`-unescape while
  `raw`/`elements` are not, **and that it decodes the FIRST TA1 only**.
- **`X12FunctionalGroup`'s pointer is DELETED, not labelled.** Its subject is the group; GS element
  semantics belong to `GsSegment`, which the field's own type resolves to. `#111` rejected
  "disclosed elsewhere in the same file" as a defence, so a second label here would be a duplicate.
  A draft put `group.gs.raw` back in its place, which was the same duplication in a quieter form;
  that line is gone.
- **The slot mapping is KEPT** (`elements[2]` = IEA-02). That clause is TRUE. Only the value clause
  was false, and only it was cut.

## 🛑 The ISA is deliberately untouched, and stays filed

`types.ts`'s ISA block and `warnings.ts:482`'s `isa.elements[12]` are the other half of the same
filed semicolon item. **They are NOT taken here, and NO MECHANISM IS NAMED FOR THEM.**

**🛑 A draft of this note DID name one** - it attributed the ISA cells to `decodeIsa`'s missing
arity check rather than `?`-release, and then claimed two sentences later to be stating no rule.
The gate falsified it in one measurement, on a **spec-clean interchange with no `?` anywhere and no
arity anomaly**:

```text
isa.elements[6] = "SENDER         "   isa.elements[8] = "RECEIVER       "   warnings: []
```

Fixed-width space padding: neither the arity check nor `?`-release. This package's own shipped docs
already work around it (`docs-content/intro.md` and `spec-notes-envelope.md` both write
`ix.isa.elements[6].trim()`). **That attribution was the FIFTH which-member-is-special story in
this lineage and it is DELETED, not reworded.**

**No rule over the ISA is stated here, in either direction, and no mechanism is assigned to it.**
The four cells are in `x12-envelope-value-routes.md`; read them there. The reason this slice does
not take the ISA is that its remedy would have to rest on such a claim, and none is available.

## The sweep, and what its anchor cannot see

`git ls-files | grep -v '^dist/' | xargs grep -n 'elements\[[0-9]\+\]'` - **409 hits, deliberately
NOT backtick-anchored**, which is the exact failure `#110` published "re-grepped clean" over. Then
the falsified clauses themselves, tree-wide: `must equal ISA-13`, `must match ISA-13`,
`must equal GS-06`, `must match GE-02`, `echoes inbound ISA-13`, `echoes the prior interchange`,
`GS-01 - functional ID code`, `GS-06 - group control number`, `GE-02 - must`, `IEA-02 - must`.

On the ten literal clauses, outside `src/parser/types.ts`, that leaves three classes, all correct:

- `documentation/agent-notes/x12-envelope-value-pointers.md` - QUOTES the base text as the filed
  residual. The record, not a carrier.
- `src/transactions/ack/build-999.ts:214` - `"FA", // GS-01 - functional ID code "FA" for ack`. A
  literal id **this library writes** on the EMIT side, labelling its own constant. Not a pointer at
  a read.
- `test/serialize.test.ts:370-371` - a test comment explaining index arithmetic while asserting raw
  bytes. Tests assert raw deliberately.

**🛑 THAT IS A RESULT ABOUT TEN LITERAL CLAUSES, NOT ABOUT THE DEFECT.** A draft let it read as the
latter, and the gate immediately found a carrier neither the literals nor the exclusion list named:
**`src/parser/index.ts`'s `parseX12` `@example`, `// "HC"` on `gs.elements[1]`, shipping in
`dist/index.d.ts` on the package's PRIMARY export.** It is taken here, because leaving it would have
shipped a `.d.ts` saying "stored RAW" on `GsSegment` and handing out `// "HC"` a few hundred lines
later. **The wider `elements[[0-9]+]` anchor DID see it; the ten-literal sweep did not, and the
paragraph summarising the ten-literal sweep is what made it look accounted for.**

Still unnamed by any remedy here, same shape, filed below: `docs-content/cookbook.md:477-478`,
`docs-content/spec-notes-envelope.md:47`, `docs-content/spec-notes-transaction-sets.md:62` - each a
`// => "value"` at an envelope `elements[n]` in a carrier that SHIPS to the docs site.

**What the anchor CANNOT see, stated as part of the claim:**

- a pointer with a non-literal index (`elements[i]`, `elements[n]`) - the regex requires digits;
- a pointer in prose that never writes the bracket form ("the thirteenth element", "element 13");
- a pointer reached by a different accessor (`raw.split("*")[13]`, a dot-path string like `"13"`);
- a value-promise about an envelope element that never names an index at all;
- anything in `dist/` (excluded as derived) and anything untracked;
- a promise split across a JSDoc line wrap between the identifier and its bracket.

**No claim is made that the errata set is exhaustive, and no count of pointers is published as a
closed total.** Finding one more is expected and is not a new finding.

## 🛑 What the gate refuted, pass 1, and it was every summary and no cell

The conformance gate returned **REFUTED** on pass 1 with five MAJORs. **It reproduced the grid and
the TA1 round trip exactly and could not fault a single measured cell.** Every finding was a
sentence asserting a property OVER the grid, or the one place two predecessor slices said not to
state a rule. Recorded here because it is the ninth consecutive instance of this repo's own rule and
the first where the remedy's summary, not the remedy, was the defect:

1. **"Each of those types declares only `raw` and `elements`"** - false for `X12FunctionalGroup`,
   which declares `gs`/`ge`/`transactions`. The load-bearing premise of the whole argument, broken
   by adding a carrier to the subject list and not re-reading the sentence after it. **In both
   freezing twins.**
2. **`warnings: []` attached to the grid** - false; GE-01, IEA-01 and IEA-02 are rows in it.
3. **A published count** - and it was wrong twice over, totalling a set the sentence excluded while
   omitting `iea.elements[2]`, the one `@example` cell the enumeration was supposed to be about.
4. **The ISA mechanism attribution** - falsified by fixed-width space padding on a spec-clean file.
5. **`parseTA1(ix)?.interchangeControlNumber` added to the `Ta1Segment` `@example`** - `parseTA1`
   reads `ta1Segments[0]` only, so on the multi-TA1 inbound the same block documents, "the decoded
   TA1-01" is a DIFFERENT acknowledgment's reassociation key, `warnings: []`. **A remedy for a
   reassociation defect reintroducing a reassociation defect, in the shipping carrier.**

**The lesson is narrower than "check your claims": four of the five were sentences ADDED to
summarise a measurement that was already correct.** The convergent move was deletion in every case
except (5), where the added line was cut back out.

## Controls

- **Comment-only.** `git diff -U0 0dd68b2 -- src/` filtered of ` * ` comment lines is EMPTY. Two
  files, 51 insertions / 29 deletions, all JSDoc.
- **Emitted JS byte-identical base to head.** `dist/index.mjs`
  `889eff0d03237391005f588e743028cc`, `dist/index.cjs` `ff712a5bb08da14202054ad825978fbb`, the same
  before and after. **🛑 This control is near-VACUOUS on `src/parser/types.ts` alone**, which has
  zero runtime exports, so no JSDoc edit there could ever move the JS - the gate said so. It has
  force here only because the slice also edits `src/parser/index.ts`, which does export at run time.
  **Do not cite it as proof of anything on a types-only diff.**
- **The shipping carrier DID change.** `dist/index.d.ts` `3432e5ad...` -> `86af26fd...`.
- **The ISA block is untouched, checked directly rather than inferred.**
  `git diff 0dd68b2 -- src/parser/types.ts | grep -c 'isa\.elements\['` is **0**, and no
  `isa.elements[...]` pointer differs between the base and head `.d.ts`. Note that removed IEA and
  TA1 lines DO mention ISA-13/ISA-09/ISA-10, so "no ISA in the diff" would be the wrong check and a
  draft made it.
- **No test was added.** The class is a claim defect in a prose carrier and **no test gates it** -
  the gate's five MAJORs landed against a fully green suite, which is the whole demonstration. The
  thing that would gate it is `check:no-internal-refs`, which **eleven siblings run and x12 does
  not**; porting it remains its own slice and is not absorbed here.

## Filed, not absorbed (ADR 0016 rule 2)

- **`types.ts`'s ISA block + `warnings.ts:482`'s `isa.elements[12]`**, alongside `decodeIsa`'s
  missing arity check, which `#111` promoted to the blocking question for any envelope-reader
  widening. **Filed with NO mechanism named** - see above for why one is not available.
- **The `docs-content/` value comments** at `cookbook.md:477-478`, `spec-notes-envelope.md:47` and
  `spec-notes-transaction-sets.md:62`. They ship to the docs site rather than to `dist/`, which is a
  different carrier and a different review path; **`spec-notes-envelope.md:74` is already filed
  separately as `#111`'s named weakest cell**, so that page is going to be opened anyway.
- **`parseTA1` has no `index` parameter.** `parse-ta1.ts` tells a reader to "pass `index` to read
  the Nth" and no such parameter exists, so a multi-TA1 inbound has no published route to the Nth
  acknowledgment. `PRE-EXISTING`; found by the gate on this slice, not fixed by it.
- **🩺 `PRE-EXISTING`: the TA1-04 / TA1-05 code-list numbers are UNGROUNDED, and there is a live
  namespace collision one directory away.** `src/parser/types.ts` cites TA1-04 as code list **I13**
  and TA1-05 as **I18**, at origin and unchanged by this slice. The gate believes TA1-04 is **I17**
  and that **I13 is Acknowledgment Requested (ISA-14, `0`/`1`)**, could reach no primary source from
  this container, and found **zero in-tree grounding for either reading** - so it lowered the
  finding rather than assert it, which is the correct discipline and is why nothing here resolves
  it. Meanwhile `src/transactions/ack/codes.ts:163-164` uses **I12 and I13 for the 999 IK403
  implementation-error codes**, a different code list sharing the same identifiers in the same
  directory. **That collision is exactly how a mis-citation of this shape survives review.**
  **🛑 DO NOT GROUND THIS BY REASONING, BY ANALOGY, OR FROM `codes.ts` - and DO NOT PROPOSE A SOURCE
  SCAN, refused in writing in `x12/CLAUDE.md`.** A code-system citation is the class where being
  wrong can harm someone, so it needs a real source and a slice of its own.
  **What this slice DID do about it: it stopped the propagation.** A draft carried "the I13 / I18
  code-list citations" into `CHANGELOG.md` and the pending changeset, **neither of which carried it
  at base and one of which FREEZES ON RELEASE.** Both now say "the code-list citations" with no
  numbers, and a newly added "TA1-01 is data element I12" was cut from `types.ts` as well. **The
  citation is left exactly where it already lived and nowhere else.**
- **`parse-ta1.ts` / `KNOWN-LIMITATIONS.md` mis-citing `X12Segment.elements`** - unchanged by this
  slice, and note it is now MORE nearly true, since the envelope types finally say what
  `X12Segment` says. It is still its own slice.
- **Porting `check:no-internal-refs`.**
- The seven `PRE-EXISTING` are untouched; **item 7 (raw-vs-decoded in the amount-row codes' recovery
  advice) is the adjacent one and was deliberately NOT absorbed** - different carrier.

## The budget

`x12/CLAUDE.md` was AT its ratchet with zero headroom. **Paid by relocating
`X12-ENVELOPE-VALUE-ROUTES` in full into `agent-notes/x12-envelope-value-routes.md` FIRST**, diffed
**byte-identical (3,095 == 3,095)** before the inline copy was condensed to the short form. **No
trap deleted, no sentence weakened, the ratchet not raised.** Derive the current figure; do not
trust one written here. **`REPO_CLAUDE.x12` is owed a lowering to match** - this slice is scoped to
the submodule and did not touch the umbrella, so that is left to the coordinator, as `#110` and
`#111` also left it.

# `X12-ENVELOPE-VALUE-ROUTES` - what a caller actually does to read an envelope element

From `X12-837-RESIDUALS`. Base `8778cf7` (`#110`). The successor to `X12-ENVELOPE-VALUE-POINTERS`,
which filed this and named the deadline. Last verified 2026-08-09.

`#110` cut every doc that pointed a consumer at an envelope `elements[n]` **for a value**. It left
open the other half: the carriers that told them what to do **instead**, and those named a call that
does not compile.

## The sweep, and its anchor is part of its claim

**Pattern 1:** the bare literal `getSegmentValue`, case-insensitive, **unanchored**, over
`git ls-files` (every tracked file, no extension filter, no backtick, `.changeset/`, `CHANGELOG.md`,
`docs-content/`, `test/` and `src/` included). **Pattern 2:** the literal `dot-path` / `dotpath`, same
scope, to catch a carrier that describes the reader without naming it. Then a receiver filter,
`getSegmentValue\((gs|ta1|isa|iea|ge|st|se|tx\.)`, over the same set.

**What the sweep CANNOT see, stated rather than left implied:**

- a carrier that describes the reader in words that use **neither** literal ("the resolver", "read
  the value off it", "the accessor"). Nothing was found by eye either, but the pattern does not cover it.
- `dist/`, which is **untracked here**, so `git ls-files` excludes it. It is generated from `src/`,
  and `src/` was swept, but the sweep did not read the built artifact.
- a receiver bound to a differently-named local (`const seg = ix.groups[0].gs`). The receiver filter
  is by IDENTIFIER, so an aliased envelope segment reads as a body segment to it. **`#110`'s lesson
  applied: this is the successor to "the grep anchored on a backtick".**

## The census grid - the filed line was a floor again, in both halves

**On the TYPES the filed line understated the MEASUREMENT, not the enumeration.** Three carriers at
base (`CLAUDE.md:125-126`, `.changeset/olive-comets-point.md:40-41`,
`x12-envelope-value-pointers.md:171-172`) already NAMED all seven, and the backlog line says
"envelope types", plural. What `#110` actually measured with the compiler was **three**
(`GsSegment`, `IsaSegment`, `Ta1Segment`); this slice measured **all seven**. A draft here said
_"filed as one type"_ and that is **false, deleted rather than reworded.**

**`getSegmentValue` takes an `X12Segment`, which requires `id`.** Measured with the repo's own
compiler, one probe per type, `error TS2345: Property 'id' is missing`:

| envelope-level type              | reached as          | `TS2345`                 |
| -------------------------------- | ------------------- | ------------------------ |
| `IsaSegment`                     | `ix.isa`            | yes                      |
| `IeaSegment`                     | `ix.iea`            | yes                      |
| `GsSegment`                      | `group.gs`          | yes ⬅ the only one filed |
| `GeSegment`                      | `group.ge`          | yes                      |
| `Ta1Segment`                     | `ix.ta1Segments[n]` | yes                      |
| inline ST on `X12TransactionSet` | `tx.st`             | yes                      |
| inline SE on `X12TransactionSet` | `tx.se`             | yes                      |

**The prose carriers, by base line number.** ⏳ = freezes into `CHANGELOG.md` on release.
**13 rows, 14 sites, 9 files.** Count the rows rather than trusting a summary figure; a draft here
published "9 prescriptions in 6 files" against a grid of ten rows, and the gate caught it.

**🛑 THREE DRAFTS OF A PARAGRAPH SUMMARISING THE `remedy` COLUMN WERE FALSIFIED IN A ROW AND NO
FOURTH IS WRITTEN. Read the column against `git diff 8778cf7..HEAD`; that is the only claim about it
this note makes.** The one rule that is not bookkeeping: **the ⏳ carriers freeze on release, and
those are DELETED, never substituted.**

| #   | carrier                                              | receiver                          | remedy                                                |
| --- | ---------------------------------------------------- | --------------------------------- | ----------------------------------------------------- |
| 1   | `KNOWN-LIMITATIONS.md:308`                           | `gs`                              | REPLACED with the two routes that work ⬅ filed        |
| 2   | `.changeset/tidy-lamps-argue.md:46` ⏳               | GS-07                             | DELETED ⬅ filed, the deadline                         |
| 3   | `KNOWN-LIMITATIONS.md:481`                           | `getSegmentValue(gs, "07")`       | SUBSTITUTED (`it`)                                    |
| 4   | `CHANGELOG.md:1452` ⏳                               | `getSegmentValue(gs, "07")`       | DELETED                                               |
| 5   | `KNOWN-LIMITATIONS.md:40`                            | TA1-01                            | DELETED                                               |
| 6   | `CHANGELOG.md:132` ⏳                                | TA1-01                            | DELETED                                               |
| 7   | `.changeset/tidy-herons-decode.md:24` ⏳             | TA1-01                            | DELETED                                               |
| 8   | `src/transactions/ack/parse-ta1.ts:63`               | TA1-01                            | DELETED (a `//` body comment)                         |
| 9   | `agent-notes/x12-interchange-gs-escape.md:25`, `:78` | `getSegmentValue(gs, "07")`       | both SUBSTITUTED (`the dot-path read of GS-07`; `it`) |
| 10  | `agent-notes/x12-ta1-residuals.md:131`               | `getSegmentValue(tx.st, "03", d)` | SUBSTITUTED (`the dot-path read of ST-03`)            |
| 11  | `agent-notes/x12-ta1-residuals.md:41`                | TA1 table column header           | SUBSTITUTED (`dot-path read`)                         |
| 12  | `agent-notes/x12-ta1-emit-escape.md:230`             | `getSegmentValue(ta1, "01")`      | SUBSTITUTED (`it`)                                    |
| 13  | `test/transactions-ack-ta1-residuals.test.ts:18`     | TA1                               | DELETED                                               |

Row 4 was a substitution until the gate caught it, and it is a ⏳ carrier, so it is now the deletion
the rule requires: the clause naming the call went, and the composite read two clauses later carries
the measurement.

Rows 11, 12 and 13 were added by the gate, and rows 11 and 12 are the instructive ones. **Row 11 is
the shape of row 9 in a different file** (a `getSegmentValue` column in a measurement table) and a
draft dropped it while publishing a completeness claim, which is `#110`'s pass-1 blocker recurring
one slice later. **Row 12 was excused by a rule this note states as "same section or JSDoc block"
and then applied as "same file"**, 139 lines apart. The rule is now applied as stated.

**Left alone, and the rule that decided it: a call is DISCLOSED when the wrap requirement is stated
for THAT receiver type in the same section or JSDoc block.** These are the in-tree controls:

| carrier                                        | receiver | its disclosure               |
| ---------------------------------------------- | -------- | ---------------------------- |
| `KNOWN-LIMITATIONS.md:554`, `:566`             | `ta1`    | `:560-561`, same bullet list |
| `CHANGELOG.md:1526`, `:1535` ⏳                | `ta1`    | `:1532-1533`, same paragraph |
| `src/transactions/ack/build-ta1.ts:59`         | `ta1`    | `:67-68`, same JSDoc         |
| `agent-notes/x12-ta1-emit-escape.md:79`, `:90` | `ta1`    | `:91`, same bullet list      |

**Reached by the sweep and NOT defects. Two drafts published a breakdown of which pattern reached
which site and the gate falsified both, on counts and on file names; no third breakdown is written,
and no figure is quoted.** The durable facts, which do not go stale: the **receiver filter** is by
IDENTIFIER, so it matches a local named `gs` or `ta1` whatever its type, and it MISSES one named for
the case instead of the segment (`caret`, `colon`, `asDotPath`, `dotPath(...)`) or reached through a
member expression (`ix.groups[0]?.gs as X12Segment`). **Pattern 1, the bare literal, is what reaches
those.** In every test hit either pattern returns, the receiver is **already a wrapped `X12Segment`**
(`gsOf()`, `withId()`, `dotPath()`, or an explicit `as X12Segment`), so the calls compile and are
in-tree controls rather than carriers. **The asymmetry is the reusable part: a receiver filter alone
would not have found them.**
Naming `getSegmentValue` with **no receiver at all** is likewise not this defect:
`agent-notes/x12-ta1-residuals.md:60`, `agent-notes/x12-envelope-release-split.md:32`,
`agent-notes/x12-st03-read-not-release-aware.md:56`.
`agent-notes/x12-envelope-value-pointers.md:205` is a correct RECORD of the defect and is the
artifact, not a carrier of it.

**Body-segment and unbound receivers, correct and untouched:** `src/parser/segment.ts:288-290` and
`:426`/`:445`/`:466`; `src/transactions/ack/parse-999.ts:348`/`:364`; `CHANGELOG.md:1393`, `:3672`;
`KNOWN-LIMITATIONS.md:365`; `documentation/agent-notes.md:3409`.
**`docs-content/spec-notes-envelope.md:307-329` is the sharpest control:** it ships, it uses the
resolver, and its own scoping sentence at `:303` binds it to **body** segments (_"Inside a
transaction, every body segment is an immutable `X12Segment`"_). The doc that ships already had it right.

**One borderline, left standing and named rather than quietly kept:**
`docs-content/spec-notes-envelope.md:74` writes `getSegmentValue(seg, "01-2", ix.delimiters)` with
`seg` **unbound**, two sentences after one that enumerates envelope segments' elements. It prescribes
no envelope receiver, so it is outside the defect as defined. It is the weakest cell in this grid.

## 🛑 The shape decision: the claim was cut, the signature was NOT widened

Both answers were honest and they are materially different. **This is the evidence, not a default.**

**Widening is the cheap side, and it really is cheap.** `getSegmentValue`'s body never reads `id`. It
reads `segment.elements` (and `segment.elements[0]`, for the warning locus only). Widening the
parameter to an `elements`-only structural type is **non-breaking** (a wider parameter accepts
everything the narrower did), **type-level only**, and emits nothing. Measured: it compiles, and the
whole suite stays green.

**It was refused on one measurement.** `getSegmentValue` unescapes **unconditionally**. Its only ISA
awareness is the warning LOCUS (`segment.elements[0] === "ISA"` at `segment.ts:315-318`), **not an
exemption.** The ISA is documented as positional, where `?` is content and never an escape
(`KNOWN-LIMITATIONS.md:311`; `buildInterchange` pads each ISA element and never escapes one). So
widening admits `IsaSegment` and makes a **silently wrong read of ISA-13, the reassociation key,
compile**. A capability that is right on six envelope types and silently wrong on the seventh is not
an ergonomic win; it is a new mis-read surface offered as convenience.

**And the capability is not missing.** Two routes already work and both are already published
in-tree, which is why this is a claim defect and not a gap:

- **Route A:** `unescapeRelease(gs.elements[6], d, sink, pos)`. `unescapeRelease` is a public export
  (`src/index.ts:96`). Four required arguments, no defaults.
- **Route B:** add the `id` and take the dot-path. Prescribed in-tree at `build-ta1.ts:68` (_"so add
  one to read a TA1 through it"_) and `KNOWN-LIMITATIONS.md:561`, and it is what **this repo's own
  tests** do (`gsOf()` in `builder-interchange-gs-escape.test.ts:139`, `withId()` in
  `transactions-ack-ta1-residuals.test.ts:75`).

Both compile under the repo's own settings. **So the grounding is this package disagreeing with
itself** - one file saying "add an `id`" while another says `unescapeRelease` "is the only route" -
and never a TR3 clause. Same grounding shape as `#109`.

## 🛑 Two `#110` claims are measured FALSE here, and both were mine to inherit

1. **"So there is NO decoded read for an envelope element; `unescapeRelease` on the string is the
   only route."** (`CLAUDE.md:127-128`, `agent-notes/x12-envelope-value-pointers.md:181-182`, and
   `.changeset/olive-comets-point.md:42` + `CHANGELOG.md:42` in the softer _"is the route"_ form.)
   **There are two, Route B is prescribed in-tree, and neither is universal** (below). A closed claim
   over an open set, which is this repo's most reliably wrong sentence shape.
2. **"a raw-vs-`unescapeRelease` cell on [the ISA] is a TAUTOLOGY that detects nothing."**
   (`CLAUDE.md:137-138`.) **`unescapeRelease` does not know the ISA is exempt.** On an ISA-13 of
   `"000000??1"`: raw `"000000??1"`, unescaped `"000000?1"`. The cell differs. That claim is what
   kept the ISA out of `#110`'s grid, and it is the reason the ISA row below had never been run.

Both are deleted **inline and on the record** in the relocated copy, because a revert re-publishes
claims. Neither is reworded.

## The cells, and NO story about which member is special

**Route A vs Route B**, `warnings: []` on every row:

| element                  | raw            | Route A `unescapeRelease` | Route B wrap + dot-path | transmitted   |
| ------------------------ | -------------- | ------------------------- | ----------------------- | ------------- |
| GS-04, a released `*`    | `"2026?*0601"` | `"2026*0601"`             | `"2026*0601"`           | `"2026*0601"` |
| GS-07, a REAL repetition | `"A^B"`        | `"A^B"`                   | **`"A"`**               | `"A^B"`       |
| TA1-01, a released `^`   | `"0000?^0001"` | `"0000^0001"`             | `"0000^0001"`           | `"0000^0001"` |

**The two routes answer different questions.** Route B truncates to repetition 0, because that is what
a bare dot-path means. **Neither "is the route".**

**The ISA rows**, which no route reads correctly across the set:

| transmitted ISA-13 | arity  | `elements[13]` | Route A          | Route B          | `elements[16]` |
| ------------------ | ------ | -------------- | ---------------- | ---------------- | -------------- |
| `"000000??1"`      | 17     | `"000000??1"`  | **`"000000?1"`** | **`"000000?1"`** | `":"`          |
| `"0000?*001"`      | **18** | **`"0000?"`**  | **`"0000?"`**    | **`"0000?"`**    | **`"P"`**      |
| `"00000001?"`      | 17     | `"00000001?"`  | `"00000001?"`    | `"00000001?"`    | `":"`          |

Row 1: both decoded routes drop a `?` the sender transmitted as content. Row 2 (`#110`'s, re-run
here): `decodeIsa` split on the element separator, `elements[13]` is a **prefix**, and ISA-16
re-indexed off `":"` onto ISA-15's `"P"` - **all three surfaces wrong.** Row 3: all three agree.
`X12_CONTROL_NUMBER_MISMATCH` on these rows is the **fixture** (IEA-02 carries the plain number), not
a finding.

**🩺 A FOURTH ISA CELL, FOUND BY THE GATE, AND IT NEEDS NO RELEASE CHARACTER AT ALL.** On a fully
conformant interchange with no `?` anywhere, Route B answers **`""` for ISA-11** (raw `"^"`), because
a bare dot-path splits on the repetition separator and takes repetition 0. `PRE-EXISTING`. It is the
strongest cell here, because the other three all need a `?`.

**🛑 That is the measurement, and NO RULE IS DERIVED FROM IT - not even a negative one.** The three
`?`-bearing rows are a `?`-shaped sample and ISA-11 is a different mechanism; between them they do
not license _"neither route is right on an ISA element"_, which a draft of this slice published
unhedged in the shipped `KNOWN-LIMITATIONS.md` and which the gate falsified with row 3 and with the
plain ISA-06 / ISA-08 / ISA-16 of any conformant interchange. **That sentence is deleted, not
reworded.** _"The ISA is positional so raw IS the value"_ was the FOURTH falsified
which-member-is-special story in this lineage (`#110`) and row 2 is why; a fifth is not being
written here in the opposite direction. This slice prescribes **no route for the ISA**, states no
rule about the ISA, and files the question with `decodeIsa`'s missing arity check where it belongs.

## What shipped

**No runtime line changed.** The 13 grid rows above, plus the two false `#110` claims.
`src/parser/segment.ts` is byte-identical to `HEAD` (diffed, twice, after each mutation was
reverted **by file copy**). `dist/index.mjs`, `index.cjs` and `index.d.ts` are byte-identical base to
head, built from both trees and compared with `cmp`.

**One thing was ADDED, deliberately, and it is not a deletion:**
`test/parser-envelope-value-routes.test.ts`. Every finding in this lineage has been a claim defect in
a prose carrier and **no test gated that class.** These do, for this one claim:
`pnpm typecheck` covers `test/`, so **seven `@ts-expect-error` assertions RED if the signature is
ever widened.** Widening is not forbidden by the file; it is made loud, because the assertions must
be deleted, and that is where the ISA question has to be answered.

**🩺 The mutation control caught this test being VACUOUS before it shipped, which is the part worth
reading.** The first draft passed the receivers as `ix.iea`, `ix.groups[0]?.gs` and so on. Under the
widening mutation it reported **ONE** unused directive, not seven: six assertions were still
"expected errors" for `undefined`, **not** for the missing `id`. Narrowing every receiver to a
non-optional value first makes the mutation report **all seven**. That is the difference between a
gate and a green vacuous test, and it is the exact class `#107` was caught on.

## ⚖️ The `X12Segment.elements` mis-citations: re-measured, and STILL not folded in

`parse-ta1.ts:41` and `KNOWN-LIMITATIONS.md:306` mis-cite `X12Segment.elements` for types that are
not one. `KNOWN-LIMITATIONS.md:306` is **two lines above the prescription this slice was filed for,
in the same bullet**, so it was re-measured rather than inherited.

**Not folded in.** Grounds:

1. **Their statement is TRUE** (those elements really are raw) where the prescription is FALSE.
2. **`parse-ta1.ts:41` is its twin**, sharing the mechanism. Folding in only the `KNOWN-LIMITATIONS`
   half splits a filed slice across two PRs and leaves the two carriers disagreeing.
3. **My remedy does not touch or depend on it** - measured: `:306`'s citation and `:307-308`'s
   prescription are independent sentences, and the second was cut without the first moving.

**🛑 `#110`'s THIRD ground is WITHDRAWN, and that is a correction to the note that filed this.** It
argued their remedy _"is a corrected citation target, not a deletion"_. A deletion **is** available:
dropping _"exactly as `X12Segment.elements` has always documented"_ leaves a true sentence. The
conclusion survives on grounds 1 and 2; the reasoning did not.

## 🔴 Open, filed not absorbed (ADR 0016 rule 2)

- **`decodeIsa`'s split has no arity check.** Row 2 above is it, re-measured at this base:
  `"exactly 17 entries by construction"` does not hold, and ISA-14/15/16 re-index silently. **This is
  now the blocking question for any future widening of `getSegmentValue`**, so it is no longer just a
  disclosure.
- `src/parser/types.ts`'s `@example` indices, the eighth floor (**`ta1.elements[1]` sharpest**);
  `warnings.ts:482`'s `isa.elements[12]`.
- `docs-content/spec-notes-envelope.md:74`, the borderline cell above.
- The three ST-03 keys; `?~` swallowing the terminator; the `noop` sink;
  `src/builder/caller-string.ts:493`; the seven `PRE-EXISTING` in the umbrella's `repos/x12.md`.
- **The grounding limit stays unclaimed.** No count is published anywhere here and no source is cited
  for any normalisation rule. No source scan was proposed.

## Discipline 3 - crew / knowledgebase

**Nothing new is owed.** No shipped runtime message changed and no public field's decoding changed;
the emitted JS is byte-identical. The `.d.ts` prose is untouched by this slice (the one `src/` edit is
a `//` comment inside a function body, which does not reach `dist/index.d.ts`).
**`#109`'s two `CREW-KB-SURFACE-DEBT` items stand undischarged.**

## The budget

`x12/CLAUDE.md` **49,583 -> paid by relocating `X12-ENVELOPE-VALUE-POINTERS` in full into
`agent-notes/x12-envelope-value-pointers.md` FIRST**, diffed **byte-identical (2,997 == 2,997)**
before the inline copy was condensed, and only then were the two false clauses deleted inline in the
relocated copy, each with its own on-the-record marker. **No trap deleted, no sentence weakened, the
ratchet not raised.** Derive the current figure; do not trust one written here.
**`REPO_CLAUDE.x12` in the umbrella is owed a lowering to match.** This slice is scoped to the
submodule and did not touch the umbrella, so that is left to the coordinator.

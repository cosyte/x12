# @cosyte/x12: Project Guide for Claude

## Project

**`@cosyte/x12`**: an ASC X12 EDI parser + utility library (Node/TS, MIT), the payer-side sibling of
**[`@cosyte/hl7`](../hl7)** at `../hl7` - API shape, profile system and lenient-parser philosophy are
deliberately mirrored, so **when in doubt on an API decision, check how `hl7` solved it.** The
identity paragraph, the north star and the sibling section are in
`documentation/agent-notes/claude-md-relocated-narrative.md`.

## ▶ Read this before you touch the parser: `documentation/agent-notes*`

**Every `###` heading in "Traps" below names the section carrying that trap's measurement, its
sources and its reasoning - open it before you act on the line.** Most are in
[`documentation/agent-notes.md`](documentation/agent-notes.md), itself budgeted, so the newest are
their own files under `documentation/agent-notes/` (mechanism: relocated narrative §7). **A trap
deleted to hit a number is the one failure mode this bound exists to prevent.** **Never quote this
file's number here, read `REPO_CLAUDE` in the umbrella's `.claude/hooks/doc-budget.mjs`.** **A new
trap here is PAID FOR BY RELOCATING FIRST**, and the entry is LOWERED as the relocation lands, never
raised to meet it.

## Status

Pre-alpha `0.0.x`, **published** to npm from a public repo. **Never quote a version here:**
`npm view @cosyte/x12 version` is the only source of truth.

- **Read scope is decoded for** 270, 271, 277 / 277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1.
- **Emit scope is complete for every transaction that has a reader**: general (`serializeX12` +
  `buildInterchange`) plus a per-TR3 domain builder for each, and the pure-function `build999` /
  `buildTA1`, each layering the safety-critical per-TR3 invariants (balance, certification,
  maintenance-type fidelity, count reconciliation) on the general builder.
- **🩺 The 276 inquiry direction has NO typed model on either side** - no `get276`, no `build276`,
  no 276 dispatch anywhere in `src/`. It parses into segments and dot-paths like any other input.
  **Never describe the v1 read or emit scope as "276/277" complete, and NEVER write the paired
  "270/271" label for it either** - the 270 half shipped and the 276 half did not, and one label for
  both is how the README and the docs site were wrong until `ASSETS-P8`. **270 read AND emit shipped
  together** (`get270Inquiry` / `parse270Inquiries` / `build270`), because emit scope is complete
  wherever read scope is. 🩺 The 270 reader attaches a level by its OWN HL-02 and by nothing else:
  a pointer that does not resolve leaves that level and its whole subtree OFF the tree, warned, never
  re-parented onto whichever level was open.
  Why: `documentation/agent-notes.md#published-scope-the-270-and-276-gap`
- **Warning registry: additions-only, and NEVER quote its size here** - the count on this line was
  stale twice. Derive it: the codes are exported as `ALL_WARNING_MESSAGES`, and the four Tier-3
  fatals are enumerated under Engineering Guardrails below.
- **Profile system** (`defineProfile()`, `profiles`) shipped Phase 9; **PHI commit-gate** armed
  (`pnpm phi-scan`). **Phase histories 1-9 are in `documentation/agent-notes.md`** - read the phase
  section before changing a surface it built.

## v1 Scope Snapshot

HIPAA sets at **005010** (errata hooks); list at `documentation/agent-notes.md#v1-scope-snapshot`.
Non-healthcare (850/856/810/204), EDIFACT, AS2/SFTP and pre-005010 are out. **It is the v1 SCOPE
declaration, NOT a list of what SHIPPED** - see Status: the 270 and 276 have no typed model.

## Tech Stack (the shared `@cosyte/*` standard)

**The toolchain is INHERITED by depending on the published `@cosyte/*` config packages, never by
copying files.** Source of truth: the meta-repo's `documentation/conventions.md`; per-tool summary:
`documentation/agent-notes.md#tech-stack-the-shared-cosyte-standard`. **The `attw` script is
`scripts/attw.mjs`, NEVER the bare CLI** (`ASSETS-P8` trap below). **Runtime deps: ZERO.**

## Engineering Guardrails

- No `any`, no unjustified `as` (use `unknown` and narrow). JSDoc with `@example` on every public export. Immutable by default; mutate only via `setElement` / `addSegment` / `addLoopIteration` / `removeSegment`. No `console.*` in library code - throw typed errors or return results. Short, testable functions over parsing blobs.
- Postel's Law: parser liberal (lenient default + stable codes with positional context), serializer conservative. **Be exact, because the README said it loosely until ASSETS-P8** (long form: `documentation/agent-notes/claude-md-relocated-narrative.md`). The domain builders emit spec-clean by construction, but `serializeX12` is byte-faithful **only for the segments the parser recorded on the model**: **`serialize(parse(s)) === s` is NOT guaranteed, and "my file has no line breaks" is NOT sufficient** - `KNOWN-LIMITATIONS.md` is the canonical list, most of it needing no line break and silent. `{ specClean: true }` reconciles the envelope and WARNS; `recomputeCounts` is **inert without `specClean`**. Nothing is ever silently corrected.
- Fatal only for unrecoverable structural corruption (4 Tier-3 codes: `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`). Everything else warns.
- Coverage target: ≥ 90% on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/`.
- Built-in loop specs + profiles are authored through the same public API (`defineLoopSpec()`, `defineProfile()`): dogfooding gate.
- HIPAA code lists ship as versioned data snapshots. An update is a release event, never a runtime fetch. `codeLists.meta.snapshotDate` is the freshness surface.
- Acknowledgments (`build999`, `buildTA1`, `parse999`) are pure: never auto-send, never open a socket, never touch the filesystem.
- **No em dashes (`U+2014`). Ever.** Founder directive. Gated by `pnpm check:no-emdash` and `.github/workflows/no-emdash.yml`, which scans tracked files **AND your PR title, PR body and commit messages** - this repo squash-merges, so those land on `main`. **Never re-encode the character**: rewrite with a period, colon, comma or parentheses.

## Traps

**Each was paid for; each `###` names the section carrying its measurement, sources and refutation
history. Do not act on a line here without reading it. 🩺 = getting it wrong mis-states a clinical
or financial value on the wire.**

### `X12-NO-INTERNAL-REFS-GATE` (2026-08-11) · `agent-notes/x12-no-internal-refs-gate.md`

**`pnpm check:no-internal-refs` now GATES the class every accuracy finding in this repo's review
history has belonged to: a claim in a prose carrier, which no test could fail on.**
**🛑 THE PORT WAS NOT A COPY AND YOU MUST NOT RE-TRANSCRIBE THE SIBLING FILE OVER IT.** Every sibling
excludes `X12-\d{3}[A-Z]?|X12-\d{6}` as a standards designation. **HERE `X12` IS ALSO OUR OWN ITEM
PREFIX AND THE TWO SPELLINGS OVERLAP** (`X12-837P` the guide, `X12-837-RESIDUALS` the item, sharing
the head `X12-837`), **so that exclusion swallows our identifiers whole. COUNTED, TWO TOOLS
AGREEING: all 141 tree-wide matches were INTERNAL IDS, the hyphenated standards spelling occurred
ZERO times, and the sibling line printed OK over SIX live violations on shipping carriers.** Bare
`837P` / `005010X222A1` is this corpus's spelling and the gate now REDS on the hyphenated form.
**🛑 A POSITIVE SELF-TEST SAMPLE IS DISJUNCTIVE AND THEREFORE VACUOUS BY DEFAULT** - `grep -q` stops
at the first match, so the control that restored the sibling exclusion printed OK because `CCDA-P7`
sat in the same sample. Rule 1's FIRST arm has five spellings asserted ALONE; **keep it that way, and
DO NOT READ THE SELF-TESTS AS PROVING "each rule still matches what it bans": MOST ALTERNATIVES,
INCLUDING RULE 1's SECOND ARM, ARE ASSERTED BY NOTHING - MEASURED, NAMED IN residual (xv), LIVE AND
NOT CLOSED. PUBLISH NO PROPORTION FOR IT** - a draft did and a second reviewer could not reproduce
it under any defensible way of counting an alternative. A NEGATIVE sample is conjunctive and has no
such failure mode. **🛑 `KNOWN-LIMITATIONS.md` IS IN `files` AND IS SCANNED.**
**🛑 REMEDIATE BY TRANSLATION, NEVER BY DELETING A DOC COMMENT** (JSDoc with `@example` on every
public export is a guardrail neither lint nor coverage protects), and repair the head when you strip
an identifier off the front. **🛑 THE GATE READS `src/` DOC COMMENTS, NEVER `dist/`, AND NEVER A
STRING LITERAL** - five code-list `meta.note` values ship build-order framing as an EXPORTED RUNTIME
VALUE, `PRE-EXISTING` and FILED; a runtime value is a different carrier from a comment. **ZERO ON
THE RULES IS NOT ZERO ON THE FOUNDER'S RULE:** six phase lines survived the first sweep with every
rule green, two of them the PLURAL `Phases`, which rule 2 cannot see. It catches identifiers, not
English about our process, so **the reviewer still owns half the rule.**
**🛑 QUOTE NO COUNT TAKEN ON ANOTHER REPO'S TREE, AND DELETE A DRIFTING ONE RATHER THAN CORRECT IT.**

### 🩺 `X12-PRE-005010-RUNTIME-MESSAGE` (2026-08-11) · `agent-notes/x12-pre-005010-runtime-message.md`

**🩺 Open it before you touch `WARNING_MESSAGES`, `pre005010` or the ISA-12 guard: the message
asserted what ISA-12 DECLARES while the guard reads the TWELFTH ELEMENT OF THE SPLIT, and THREE
constructions fire it with ISA-12 reading `00501` at its own fixed offset. 🛑 "THE DECLARED VERSION"
CARRIES THE SAME PRESUPPOSITION AND MOVED WITH IT - not style. 🛑 A RUNTIME MESSAGE IS A DIFFERENT
CARRIER: THE EMITTED JS CHANGES HERE, the inverse of the comment-only control, and it is the FIRST
row in this lineage A TEST GATES - the base message REDS the file, so KEEP THE NEGATIVE CONTROL.
🛑 NAME NO MECHANISM: the `ISA-13 carries *` row has an extra separator and stays SILENT. 🛑 THE
GUARD STILL READS THE SPLIT, NOT THE FIXED OFFSET - PRE-EXISTING AND FILED; moving it changes WHICH
interchanges raise the code. 🛑 ECHO NOTHING - a static registry lookup, and the census pins it.**

### 🩺 `X12-ISA-VALUE-POINTERS` (2026-08-11) · `agent-notes/x12-isa-value-pointers.md`

**🩺 Open it before you write ANY pointer at an `isa.elements[n]`: `IsaSegment`'s block and
`pre005010`'s JSDoc promised VALUES and handed back RAW BYTE TEXT in `dist/index.d.ts`, which SHIPS, and
`#116` deliberately left the ISA half of its own filed line for this slice. 🛑 DO NOT COPY THE FOUR
SIBLINGS' LABEL - `pre-?-unescape` is FALSE ON THE ISA, whose split is deliberately NOT release-aware
(`?` is content). 🛑 NAME NO MECHANISM AND NO CLOSED SET OF THEM: fixed-width padding and arity
displacement each falsify a cell alone, so neither is THE reason and a third is not ruled out. 🛑 THE
1-INDEXED MAPPING IS SCOPED, NEVER DELETED, AND NEVER QUANTIFIED. That diff is COMMENT-ONLY with
`dist/index.mjs`/`.cjs` BYTE-IDENTICAL; its run-time twin is the trap above.**

### 🩺 `X12-ENVELOPE-VALUE-EXAMPLES` (2026-08-10) · `agent-notes/x12-envelope-value-examples.md`

**🩺 Open it before you write ANY `@example` or prose pointer at an envelope `elements[n]`:
`Iea`/`Gs`/`Ge`/`Ta1` and `X12FunctionalGroup` PROMISED VALUES and hand back FRAMED BYTES, and the
carrier is `dist/index.d.ts`, which SHIPS - an example is the form a consumer COPIES, which is why a
backtick-anchored sweep never saw them. 🛑 EVERY DOCUMENTED NON-ISA CELL IN THE NOTE'S GRID IS
FALSIFIED BY ONE RELEASED VALUE - COUNT ITS ROWS, PUBLISH NO TOTAL (a draft published one, in four
carriers, and it was wrong), AND TELL NO STORY ABOUT WHICH IS SPECIAL: "`ta1.elements[1]` sharpest"
survives ONLY as a CONSEQUENCE (TA1-01 is the reassociation key and `parseTA1` already reads it
right, so the package disagrees with itself), NEVER as a mechanism. 🛑 DO NOT ATTACH `warnings: []`
TO THAT GRID - GE-01 and IEA-01 are ROWS IN IT and are the count slots, so that construction ALWAYS
warns; it is the TA1 ROUND TRIP that is silent. 🛑 THE ISA IS DELIBERATELY UNTOUCHED AND STAYS FILED
WITH `warnings.ts:482`, AND NO MECHANISM IS NAMED FOR IT: a draft attributed its cells to
`decodeIsa`'s ARITY CHECK and the gate falsified that with FIXED-WIDTH SPACE PADDING on a spec-clean
file, the FIFTH which-member-is-special story here. The remedy is the LABEL `X12Segment` already
carries; the diff is COMMENT-ONLY and `dist/index.mjs`/`.cjs` BYTE-IDENTICAL base to head.**

### 🩺 `X12-EMPTY-CONTROL-NUMBER-FABRICATED` (2026-08-09) · `agent-notes/x12-empty-control-number.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap two below.
**🩺 Open it before you touch `padControl`, `requireControlNumber` or any control-number slot:
`padControl("", 9)` FABRICATED `000000000` into ISA-13/IEA-02 and the interchange RECONCILED with
`warnings: []`, INVENT and LOSE are two mechanisms and not one, and 🛑 THERE IS NO TRIM - whitespace
still pads, DISCLOSED AND NOT FIXED, because a trim is a normalisation rule and no source states
one.**

### 🩺 `X12-BODY-DEGENERATE-RELEASE-SEPARATOR` (2026-08-09) · `agent-notes/x12-body-degenerate-release-separator.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap two below.
**🩺 Open it before you touch `decodeSegment`, `splitWithRelease` or any framing role: on
`elementSeparator: "?"` a BODY segment came back as ONE element with id `(non-spec)` while the
ENVELOPE framed correctly and every count reconciled, `warnings: []`. 🛑 PER ROLE, ON READ - DO NOT
HOIST IT INTO `splitWithRelease`; and `?~` STILL SWALLOWS THE TERMINATOR, `PRE-EXISTING` AND OPEN.**

### 🩺 `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` (2026-08-09) · `agent-notes/x12-emit-degenerate-release-delimiter.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ST03-READ-NOT-RELEASE-AWARE` trap below.
**🩺 Open it before you touch `makeCallerEscaper`, any builder's `refuseSpec` or the read side of a
degenerate set: a delimiter set with `?` in ANY of FOUR roles is refused on emit, there are TWO
mechanisms and the second needs NO caller value (`build837P` fused the procedure and diagnosis codes
on EVERY document), and 🛑 THE READ SIDE AND `serializeX12` ARE UNTOUCHED, DELIBERATELY.**

### 🩺 `X12-EMIT-DELIMITER-SHAPE-UNCHECKED` (2026-08-09) · `agent-notes/x12-emit-delimiter-shape-unchecked.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-POINTERS` trap below.
**🩺 Open it before you touch `requireWellShapedDelimiters`, any builder's delimiter handling or
`buildTA1`: a delimiter must be ONE VISIBLE CHARACTER and the four distinct, there are THREE
mechanisms filed as one (LENGTH, TYPE - the JOIN coerces where the ESCAPE does not - and `buildTA1`
having NO net at all, which read an Accept back as a REJECT), the rule counts UTF-16 CODE UNITS AND
NOT BYTES, and 🛑 PUBLISH NO ASYMMETRY ABOUT WHICH ROLES WERE SILENT - three drafts did and the gate
falsified every one.**

### 🩺 `X12-ENVELOPE-VALUE-POINTERS` (2026-08-09) · `agent-notes/x12-envelope-value-pointers.md`

**RELOCATED IN FULL 2026-08-09 to pay for the trap below, VERBATIM EXCEPT TWO CLAUSES THE TRAP BELOW
MEASURED FALSE - deleted inline and ON THE RECORD, because a revert re-publishes claims.**
**🩺 Open it before you point a consumer at any envelope `elements[n]`: those are RAW, so a pointer
promising "the values" hands over FRAMED BYTES; filed as 2 pointers in 1 file, CUT 11 pointers / 4
JSDoc blocks / 2 files; THE REMEDY IS DELETION, NEVER A CORRECTED POINTER; a pointer that LABELS its
surface raw is CORRECT and was left alone; and 🛑 `types.ts`'s `@example` indices are the EIGHTH
FLOOR, FILED NOT CLOSED - A GREP ANCHORED ON A BACKTICK MISSES THEM, they sit bare in the fences.**

### 🩺 `X12-ENVELOPE-VALUE-ROUTES` (2026-08-09) · `agent-notes/x12-envelope-value-routes.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-EXAMPLES` trap above.
**🩺 Open it before you point a doc at an envelope element, name a read route, or WIDEN AN ENVELOPE
READER'S SIGNATURE: NO DOC MAY NAME `getSegmentValue` AS THE READ OF AN ENVELOPE ELEMENT (all seven
envelope types declare only `raw`+`elements`, so the call is `TS2345`), 🛑 THE SIGNATURE WAS NOT
WIDENED AND THAT WAS THE DECISION - it is free and non-breaking and it would make a SILENTLY WRONG
ISA READ COMPILE, THERE ARE TWO ROUTES AND THEY DISAGREE ON A REPETITION so neither "is the route",
🛑 COUNT THE NOTE'S ROWS, DO NOT QUOTE A FIGURE, 🛑 ON THE ISA READ THE FOUR CELLS AND STATE NO RULE
OVER THEM IN EITHER DIRECTION, NOT EVERY REMEDY WAS A DELETION (check the `remedy` column against
the DIFF, never the summary word), A DELETION CAN STRAND THE SENTENCE'S SUBJECT IN BOTH TWINS, and
`parse-ta1.ts` / `KNOWN-LIMITATIONS.md` MIS-CITING `X12Segment.elements` is STILL FILED, NOT FOLDED
IN.**

### 🩺 `X12-ST03-READ-NOT-RELEASE-AWARE` (2026-08-09) · `agent-notes/x12-st03-read-not-release-aware.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-ROUTES` trap above, on that trap's SECOND relocation.
**🩺 Open it before you touch `decodeSt03`, any typed reader's `implementationConventionReference` or
an ST-03 key: every reader publishes it POST-`?`-unescape through ONE `decodeSt03`, filed as three
readers and measured as FOUR raw reads in THREE files reached by FIVE public readers, GROUNDED ON
THIS PACKAGE DISAGREEING WITH ITSELF and never on a TR3 clause; 🛑 THE THREE ST-03 TESTS STILL KEY ON
THE RAW TEXT, DELIBERATELY, and moving one is a different slice; NO NORMALISATION AND NO NEW WARNING,
THE SINK IS A NO-OP; and 🛑 PUBLISH THE CELLS, NEVER A STORY ABOUT WHICH READER IS SPECIAL.**

### 🩺 `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` (2026-08-08) · `agent-notes/x12-interchange-gs-escape.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-ROUTES` trap above.
**🩺 Open it before you touch `buildInterchange`, `esc` or any GS slot: GS-04 / GS-05 / GS-07 are
RELEASED on emit and GS-07 WAS THE SILENT ONE (`"X*Y"` took GS-08's slot, `warnings: []`), 🛑 NEVER
ESCAPE ELEMENT 0 BECAUSE A SEGMENT ID IS OURS AND NOT CALLER CONTENT, and TYPE-CHECK BEFORE
ESCAPING.**

### 🩺 `X12-TA1-RESIDUALS` (2026-08-09) · `agent-notes/x12-ta1-residuals.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-POINTERS` trap above.
**🩺 Open it before you touch `parseTA1`, `buildTA1`'s element guards or any TA1 slot: the five
decoded fields are POST-`?`-unescape while `raw` is the verbatim byte surface, an empty TA1-02..05 is
REFUSED on emit (FILED AS TWO SLOTS, MEASURED AS FOUR), 🛑 READ TA1-05's CELL AGAINST A NON-ACCEPT
DISPOSITION OR `enforceAcceptIsClean` REACHES IT FIRST, and PUBLISH THE CELLS, NEVER A STORY ABOUT
WHICH SLOT IS SPECIAL - whitespace still builds at all five, no source grounds a trim.**

### 🩺 `X12-TA1-EMIT-NOT-RELEASE-AWARE` (2026-08-08) · `agent-notes/x12-ta1-emit-escape.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, EXCEPT ONE CLAUSE THE SUCCESSOR MEASURED FALSE, WHICH IS
DELETED INLINE AND ON THE RECORD** - it paid for the trap above. **🩺 Open it before you touch
`buildTA1`, `BuildTA1Options` or any TA1 element: an unreleased delimiter shifted TA1-04 and an
Accept this library emitted read back as a REJECT, the INVERSE is the less safe one, and the
predicate moves BOTH ways - state the property, never the directions, and never total the cost.**

### 🩺 `X12-VARIANT-ICR-UNGROUNDED` + `X12-837-EMIT-IDENTIFIER-FIXED` (2026-08-08) · `agent-notes/x12-{variant-icr-ungrounded,837-emit-identifier-fixed}.md`

- **🩺 `VARIANT_BY_ICR` MISSED EVERY 45 CFR 162.1102 IDENTIFIER AND BOTH COMPANION-GUIDE ONES**, so
  the `SVx` fallback was the NORMAL path on production 837P/I and `X12_837_UNKNOWN_VARIANT` accused
  CONFORMANT files. **EVERY KEY NAMES ITS SOURCE; the later errata are the WEAKEST leg.**
- **🛑 A BEHAVIOUR CHANGE ON PUBLISHED DECODING. STATE IT AS ONE PROPERTY, NEVER A LIST OF
  CONSEQUENCES** - a draft published three, a refuter found a fourth; the set is in the notes. The
  property: **where ST-03 resolves, THE DECLARATION DECIDES, NOT THE FIRST `SVx`**, so a disagreeing
  line STOPS DECODING (`X12_837_SERVICE_LINE_NOT_DECODED`) and both variant codes STOP firing.
  Opposite call to `#87`/`#88`: **evidence was IN ST-03, ignored.** **The fallback is NOT
  narrowed, precedence unchanged** - only WHICH documents reach it did.
- **CITED IDENTIFIERS, NEVER A PATTERN, EITHER SIDE** - no trim/case-fold/prefix.
  **NO COUNT, NEVER ENUMERATE THE SET IN A MESSAGE** - a tripwire reds on a quoted TR3 id.
- **🩺 EMIT TAKES `Build837EnvelopeSpec.implementationConventionReference` INTO BOTH ST-03/GS-08;
  THE DEFAULTS DO NOT MOVE** (a PARTNER fact). **REFUSE ON DISAGREEMENT, NOT ON ABSENCE.**
  **🩺 A `?` BEFORE A GS/ST SEPARATOR IS ONE ELEMENT: A FIX IF ESCAPED, A REGRESSION IF LITERAL.
  ISA EXEMPT** - `agent-notes/x12-envelope-release-split.md`.

### 🩺 `X12-ISA-ELEMENT-ARITY` (2026-08-10) · `agent-notes/x12-isa-element-arity.md`

**🩺 Open it before you touch `decodeIsa`, the ISA split, or any read of an ISA `elements[n]`: 17 IS
A FLOOR AND NEVER THE COUNT (`detectDelimiters` bounds the split from BELOW only), so an ISA element
carrying the ELEMENT SEPARATOR displaces what follows it - 🛑 NEVER QUANTIFY THE SHIFT. Not "by
one", and NOT from `isa.elements.length` either: it is POSITION-DEPENDENT, and `isa.raw` plus the
fixed widths is the only route back. Each quantifier was a MAJOR (passes 1 and 2, the second INSIDE
the first's remedy) - DELETE, never substitute. 🛑 THE
FILED LINE NAMED ISA-13 AND 14 OF 16 REPRODUCE; the two that do not ARE the in-band
repetition/component declarations, so the plant collides with them - A BOUNDARY OF THE PROBE, NEVER A
PROPERTY OF THOSE ELEMENTS, AND TELL NO STORY ABOUT WHICH IS SPECIAL. 🛑 SCOPE THE ORDERING CLAIM TO
`ix.warnings`: `serializeX12` RECONCILES ISA-13 OFF `elements[13]` AND NEVER RAISES THIS CODE, so its
absence there is NOT evidence the header framed (pass-1 major, `PRE-EXISTING` behaviour, an
INTRODUCED overclaim). 🛑 IT IS A REPORT, NOT A REPAIR: nothing is re-framed, NO existing warning is
suppressed or narrowed, and `isa.raw` is the route back - the byte has TWO READINGS and no source
settles which. 🛑 THIS DOES NOT CLOSE THE `types.ts` `@example` CELLS: `#116`'s gate already
falsified attributing those to this check, and their mechanism is FIXED-WIDTH SPACE PADDING. THE
EMIT SIDE IS UNGUARDED AND FILED - the ISA slots never reach the caller escaper.**

### 🩺 `X12-837-SV1-OVERWRITE` (2026-08-08) · `agent-notes/x12-837-sv1-overwrite.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the trap above.
**🩺 Open it before you touch a service-line slot or `X12_837_SERVICE_SEGMENT_REPEATED`: a 2nd `SVx`
in an OPEN Loop 2400 REPLACES the 1st element for element, `warnings: []` through `0.0.13`, 🛑
LAST-WINS IS NOT NARROWED, the code is SCOPED TO THE LINE and fires DECODED OR NOT, and A BLIND
CONSUMER WAS THIS REPO'S OWN DOCS - SWEEP EVERY MONEY PAGE, NOT THE RECIPE ALONE.**

### 🩺 `X12-837-AMBIGUOUS-VARIANT` (2026-08-08) · `documentation/agent-notes/x12-837-ambiguous-variant.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-ROUTES` trap above.
**🩺 Open it before you touch `X12_837_AMBIGUOUS_VARIANT` or the `SVx` fallback: the fallback is NOT
narrowed and this closed ONLY the silence, 🛑 NEVER PICK A WINNER because a stray `SVx` and a
conformant one are indistinguishable, and ADDITIVITY HERE IS INVARIANCE, NEVER A LIST OF WHAT ELSE
YOU WILL SEE.**

### 🩺 `X12-AMT-ADX-ABSENT-AMOUNT` + `X12-STATED-AMOUNT-DISCARDED` (2026-08-07) · `documentation/agent-notes/x12-{amt-adx-absent-amount,stated-amount-discarded}.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED, THE PAIR KEPT WHOLE IN THE FIRST SLUG** -
it paid for the `X12-ISA-ELEMENT-ARITY` trap at the top of this list.
**🩺 Open it before you touch `AMT`/`ADX`/`RMR` handling, `X12_AMOUNT_ROW_DROPPED` or
`X12_STATED_AMOUNT_DISCARDED`: an `AMT`/`ADX` is a RECORD AND NOT A SLOT so an absent amount drops
the whole row, the TWO codes are DISJOINT and never one segment, 🛑 SAY ABSENT AND NEVER "does not
decode", 🛑 NEVER CLAIM THE BYTES ARE DECODABLE (the `RMR` guard is a PRESENCE test), and 🛑 STATE
THE BOUND AS A PROPERTY OF THE READ AND NEVER OF CONTROL FLOW - "nothing open means silent" is FALSE
and NO LOOP OPEN is a DIFFERENT loss that stays silent.**

### 🩺 `X12-837-SV-UNDEFINED-DECIMAL` (2026-08-07) · `documentation/agent-notes/x12-837-sv-undefined-decimal.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ISA-ELEMENT-ARITY` trap at the top of this list.
**🩺 Open it before you touch an `X12Decimal | undefined` slot, `X12_835_BALANCE_NOT_EVALUABLE` or
`Build837ServiceLineSpec.units`: an undecoded TERM makes a §1.10.2 equation UNEVALUABLE and never a
mismatch, an EMPTY adjustment list is NOT an absent term, PUBLISH NO SLOT CENSUS, 🛑 A WIDENING THAT
MOVES A CASE ONTO A NEW CODE BLINDS EVERY PREDICATE ON THE OLD ONE AND THIS PACKAGE'S OWN DOCS ARE
SUCH A CONSUMER - SWEEP EVERY RECIPE AND PIN IT, and SV3-06's TR3 usage is NOT grounded.**

### 🩺 `X12-PAY-TO-FUSION` (2026-08-07) · `documentation/agent-notes/x12-pay-to-fusion.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ISA-ELEMENT-ARITY` trap at the top of this list.
**🩺 Open it before you touch `payToAddress`, `attachContact` or `X12_837_PAY_TO_ADDRESS_REPEATED`:
each `NM1*87` OPENS ITS OWN ACCUMULATOR and occurrences are NEVER MERGED, 🛑 AN EMPTIED SLOT IS NOT A
NEUTRAL ABSENCE BECAUSE THE EMIT SIDE READS IT, the code counts within ONE Loop 2000A and a LATCHING
counter flags a conformant second billing provider, and NEVER write "a second party's NAME".**

### 🩺 `X12-837-LOOP-RESIDUALS` (2026-08-05) · `agent-notes/x12-837-loop-residuals.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-PRE-005010-RUNTIME-MESSAGE` trap at the top of this list.
**🩺 Open it before you touch an `LX`, a service-line drop or `X12_837_UNKNOWN_VARIANT`: THREE codes
in ONE family separated by their ANCHOR (`NOT_DECODED` / `DROPPED` at the `LX`, `SERVICE_SEGMENT_WITHOUT_LX`
at the SEGMENT because it CANNOT anchor there, never one twice, one document CAN carry all three, and
its condition is "no line open" and NEVER "the file has no `LX`"), 🩺 NEVER DECODE THE ORPHAN `SVx`
BUT NEVER WRITE IT DOES NOT NAME THE VARIANT (measured false, `PRE-EXISTING`), the suppression is
SCOPED and a LATCHING one silences every later orphan, and 🩺 ANCHOR `X12_837_UNKNOWN_VARIANT` AT THE
`ST` WITH NO `elementIndex`; ROUTE 1s DISCARD IS A TRADE, NEVER WIDENED, and NEVER cite
`X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` - it WARNS and retains.**

### 🩺 `X12-277-SVC07-NOT-DECODED` (2026-08-05) · `documentation/agent-notes.md#x12-277-svc07-not-decoded-2026-08-05`

- **🩺 277 `SVC-07` is usage `R` in X212, `S` in X214.** Read + emitted as `unitsOfService`;
  `build277` REFUSES a line without it, `build277CA` takes the same spec. An EMPTY one is still
  short a required element; **defaulting a count is inventing.**
- **🩺 SVC-05 / SVC-06 are `N` in BOTH 277 TR3s: emitted empty, left UNREAD** (the 835's SVC-05 IS
  its paid count). The TR3s NAME SVC-07 differently; ONE field carries both.
- **🩺 ONE usage fixed; a line is NOT thereby conformant. PUBLISH NO CENSUS: `SVC-01`/`SVC-02` are
  `R` in X212 and STILL optional, `SVC-03` too, READ side silent. CUT BACK, NEVER GUARD MORE.**

### 🩺 `X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05) · `agent-notes/x12-variant-lookup-prototype.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ISA-VALUE-POINTERS` trap at the top of this list. **🩺 Open it before you touch any lookup keyed
by DOCUMENT BYTES, `X12_837_SERVICE_LINE_DROPPED`, the `LX` case or a warning-channel assertion: a
table literal inherits `Object.prototype` so EVERY OWN PROPERTY of it resolved TRUTHY,
`Object.freeze` DOES NOT HELP, `in` IS NOT THE SAFE FORM, 🛑 NAME THE SET AND NEVER THE MEMBERS, and
NO SOURCE SCAN SHIPS.**

### 🩺 `X12-837-SV-SILENT-ZERO` (2026-08-05) · `agent-notes/x12-837-sv-silent-zero.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-PRE-005010-RUNTIME-MESSAGE` trap at the top of this list, on that trap's SECOND relocation.
**🩺 Open it before you touch a Loop 2400 line, `X12_837_SERVICE_LINE_NOT_DECODED` or a charge/units
slot: a line closed with NO `SVx` decoded for the RESOLVED variant warns at its `LX` (BOTH causes: a
foreign `SVx`, and none at all), THIS CLOSED ONLY THE SILENCE, 🩺 NEVER decode the `SVx` that IS
present nor let it flip the variant (units are `SV1-04`/`SV2-05`/**`SV3-06`**, `SV3-05` is the
PROSTHESIS code and three comments said units), `opts.type` is a CALLER INSTRUCTION so the warning
ATTRIBUTES NOTHING, anchor the `LX` and never the `SVx`, and 🩺 THE RESIDUAL TEST DID NOT GO RED AND
THAT WAS THE FINDING - pin the WHOLE channel, BOTH sides, only BYTES make these.**

### 🩺 `X12-QUANTITY-SILENT-DEFAULTS` (2026-08-05) · `agent-notes/x12-quantity-silent-defaults.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-NO-INTERNAL-REFS-GATE` trap at the top of this list, on that trap's THIRD relocation.
**🩺 Open it before you touch a decimal read, `X12_UNPARSEABLE_DECIMAL` or the optional warning
sink: a PRESENT decimal that does not decode warns at its `position.elementIndex` in all six
readers and an ABSENT one warns nothing, both pinned. 🩺 NEVER INVERT IT INTO "an unwarned value is
one the sender sent" - a slot a reader never read CANNOT warn, and three shipped docs carried the
bare form; the guarantee is unwarned AT AN ELEMENT A READER DECODED. PUBLISH NO CENSUS OF THE
FALLBACK OUTCOMES, ONE message with NO discriminant, and assert nothing about what X12.6 type R
permits. The 835 balance invariant is NOT a net (it names an equation, never an element). The sink
is an OPTIONAL 4th arg and the public helpers stay silent without one, held by a source scan
counting TOP-LEVEL ARGS and never a `, sink)` regex - A GREEN SUITE PROVED NOTHING, because no
fixture holds an unparseable decimal and a round trip CANNOT make one.**

### 🩺 `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (2026-08-04) · `agent-notes/x12-svc-element-map-off-by-one.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list. **🩺 Open it before you touch the 835 `SVC` map, `paidUnitsOfService` or
`originalUnitsOfService`: a round trip cannot test an element map and only bytes can, and checking a
spec claim against this repo's own implementation is NOT a check.**

### 🩺 `X12-DECIMAL-BYPASSES-THE-GUARD` (2026-08-04) · `agent-notes/x12-decimal-bypasses-the-guard.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-NO-INTERNAL-REFS-GATE` trap below.
**🩺 Open it before you touch `escDec`, `requireCallerDecimal`, `requireCallerSegment`,
`enforceBalance` or any `X12Decimal` slot: every such slot emits through `escDec` over
`requireCallerDecimal`, and 🩺 REFUSE, NEVER ROUND - guessing the scale of money is what
`X12Decimal` exists to prevent. TYPE safety is STRUCTURAL and DELIMITER safety is PER-SLOT: never
write the unqualified form, and never re-publish the completeness claim (its FOURTH iteration was
still wrong). `build835`'s balance-equation amounts refuse UNTYPED and every other `X12Decimal`
field refuses TYPED. 🩺 STATE THE RULE AND NAME SPEC FIELDS, NEVER ELEMENT NUMBERS - two remedies
published a closed list and an element-number list and both were measured wrong. `buildTA1` uses
NEITHER `seg` NOR `joinSeg`, the fixed-width ISA line is outside BOTH guards, ASSERT THE MESSAGE and
never the class (four of six cases were vacuous that way), never bound a loop with
`i < parts.length` over a caller array-like, and the pinned `esc` counts are MEASUREMENTS, not
rules.**

### 🩺 `X12-NUMERIC-VALUE-EMITS-EMPTY` (2026-08-03) · `agent-notes/x12-numeric-value-emits-empty.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-NO-INTERNAL-REFS-GATE` trap at the top of this list, on that trap's SECOND relocation.
**🩺 Open it before you touch `makeCallerEscaper`, `escapeRelease`, `renderCallerValue` or any
builder's `esc`: every builder that declares an `esc` takes it from `makeCallerEscaper`, which
type-checks first and refuses with the calling module's own typed, code-tagged error - NO COUNT
HERE, the gate holds it and "nine" outlived the ninth. 🩺 REFUSE, NEVER COERCE, and that is the
whole item: coercion mints a DIFFERENT identifier and reassociating to the wrong claim is worse than
failing to reassociate, so check the TYPE and never the sentinel. The `renderCallerValue` COERCES /
`esc` REFUSES asymmetry is DELIBERATE (survive anything vs invent nothing). 🛑 NEVER PUBLISH AN
EXHAUSTIVE CENSUS OF WHAT BYPASSES THE CHOKEPOINT - three drafts did and a refuter measured all
three false by finding one more each time; CUT THE CLAIM BACK, DO NOT GROW THE CENSUS, and finding
one more is expected rather than a new finding. A gate asserting a same-line REGEX pins against
drift and says nothing about the property. Exported `escapeRelease` THROWS `TypeError` on a
non-string now, and "no working caller is broken" was too absolute.**

### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` (2026-08-03) · `agent-notes/parser-testtimeout-asserts-an-idle-box.md`

**RELOCATED IN FULL 2026-08-08, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list. **🩺 Open it before you touch `testTimeout`, a timing figure or `attw-gate`: it is NOT the
liveness net people assume** - an infinite synchronous loop gives NO verdict and wedges the worker.

### 🩺 The `phi-scan` gate · `PHI-SCAN-SYMLINK-BLIND-ON-BOTH-ROUTES` (2026-08-03), `PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT` + `PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL` (2026-08-06), `PHI-SCAN-WALK-ROOT-SCOPE` (2026-08-08) · one `agent-notes.md` section per id, the last `agent-notes/phi-scan-walk-root-scope.md`, + `#phi-commit-gate-armed-2026-06-28`

- **🩺 Both enumerating routes REFUSE a symlink (exit 2), naming every offender**; neither FOLLOWS an
  ENTRY it enumerated. Say ENTRY, not "anything": **a walk ROOT that is itself a link IS followed** -
  a superset - **🔴 and NOTHING under it is RECONCILED**, so an EMPTIED target reads **exit 0**.
  PRE-EXISTING, OPEN; `PHI-SCAN-WALK-ROOT-SCOPE` MOVED IT UP A LEVEL, not closed. **The closure is
  "within the declared roots", NOT a universal. A refusal NEVER reports the link target** - a
  diagnostic ABOUT a leak is a PHI surface.
- **▶ 🩺 THE `--staged` ARGV IS THE GATE, EVERY FLAG LOAD-BEARING; NEVER SHORTEN IT. ONE RULE: DO NOT
  TRUST THE CALLER'S GIT CONFIG.** Five holes, all exit 0 over PHI, closed by
  `--no-renames --ignore-submodules=none --diff-filter=AMTUB`. **`U` is closed by the FILTER, not
  `--no-renames`; never conflate them. Never add `-M`, `-C` or `--find-copies-harder`** - each
  re-empties it. **No test may run `git merge`**; stage the conflict with `update-index`.
  **QUOTE THE CLASSIFICATION, NEVER THE LETTER: a broken pair is `B` WHATEVER LETTER IT PRINTS.
  NEVER RECORD A SIMILARITY SCORE** - it drifts; **DELETE a drifting number, never correct it.**
  **"Strict superset" REFUTED; EQUAL absent a rename/copy/gitlink/unmerged path.**
- **▶ 🩺 ALL MODE OWES AN ACCOUNT OF ITS ROOTS. TWO RULES, NEITHER IMPLIES THE OTHER, BECAUSE
  EXISTENCE IS NOT OBSERVATION:** a declared directory must BE one, and every tracked non-`.md` file
  under a walk root must have been ENUMERATED against `git ls-files`. Both exit 2. **A COUNT CANNOT
  DO IT. 🛑 `REQUIRED_DIRECTORIES` IS NOT `WALK_ROOTS`; NEVER FOLD IT BACK IN** - walk roots must
  stay DISJOINT (nested ones double-report), that list need not be; folding them cost a grid cell.
  **SAY "A DIRECTORY", NEVER "ENUMERABLE"** - a TYPE check; an unreadable one throws uncaught at
  **exit 1** (PRE-EXISTING). **CUT THE CLAIM BACK, NEVER GROW THE GUARD.** A root's OWN index entry
  is EXEMPT (relocated narrative §9); **its control MUST COMMIT its corpus.** `git check-ignore`
  reads the INDEX: a TRACKED ignored file is SCANNED, its absence REFUSES; no git, REFUSE.
  **RE-DERIVE EVERY EXIT CODE PER REPO** - a regular-file root is **2** here (was **1**, uncaught),
  **2** in `hl7`, **1** in `terminology` by a DIFFERENT mechanism.
- **Synthetic tokens are POSITIVELY DECLARED in `scripts/phi-allow-list.txt`, byte-strict, no inline
  header; a whole-file bypass needs `--allow-fixture` AND an entry in `phi-scan-overrides.md`.
  🛑 AN ENTRY IS GLOBAL AND ROUTE-BLIND** - it clears that literal on `--staged`, the
  COMMIT-BLOCKING route, too. **Fix a plausible name in the FIXTURE, never by declaring it.**
- **▶ 🩺 `PHI-SCAN-WALK-ROOT-SCOPE` IS TWO SIDES, EACH "IN ADDITION TO", NEVER "INSTEAD OF".** Roots
  `test` + `src`, `--staged` `test/**` + `src/**`, both widened **BY UNION**; **NO exemption on any
  route** (`dicom#98`). Enumerating buys **only the `scanCommonShapes` floor - THREE detectors, not
  the two a draft named** (`REF*SY`'s **UNDASHED** SSN is not segment-aware).
  **DERIVE THE CENSUS FROM `git ls-files`; PUBLISH NO COUNT HERE.** **`looksLikeX12` asks whether the
  file _IS_ an interchange**, so inline `.ts` fixtures holding segment text reached NO segment-aware
  detector; `scanEmbeddedSegments` is the other side. **IT IS A TRIPWIRE, NOT A PARSER: NEVER PUBLISH
  A CLOSED COUNT OF WHAT IT MISSES** - a draft said "four bounds", a refuter found two more in one
  pass. **🩺 `'` MUST NOT BE A RUN STOP** - it TRUNCATED the run, losing a surname AND whatever
  followed it - **but its absence has a PRICE, so never write that the shape predicates "handle" the
  overrun.** **`\p{L}` buys MIXED-SCRIPT elements ONLY** - `nameTokens` still drops a token with no
  ASCII letter, on BOTH routes. Its narrowings are **EMBEDDED-ONLY; `.edi` is unchanged.**
  **A BUILDER SPEC OBJECT is segment text to nobody** - found by hand-reading, not by the gate.
- **▶ 🛑 THIS GATE'S OWN CONTROLS ARE ASSEMBLED WITH `seg(...)`, NEVER LITERAL SEGMENT TEXT; WRITE
  THE NEXT ONE THE SAME WAY.** Declaring them disarms the detector they prove; a literal-path
  exemption would have to reach `--staged` or the file could never be committed again. **STILL OPEN:
  the enumerate-then-read race, the reason being DIRECTION** (relocated narrative §9) - x12 escaped
  it by a **scope accident**, and **this widening reintroduced it.**

### 🩺 `X12-CALLER-VALUE-RESIDUALS` (2026-08-02) · `agent-notes/x12-caller-value-residuals.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of
this list. **🩺 Open it before you touch `renderCallerValue`, `renderCallerJson`,
`requireCallerArray` or any indexed loop bound in a `build*` module: a forged array-like coerces to
`Infinity` and the builder SPINS FOREVER instead of refusing, and removing a guard WEDGES its
negative control rather than reddening it.**

### `X12-BUILDER-BOUNDS` (2026-08-02) · `agent-notes/x12-builder-bounds.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list. **Open it before you touch `renderCallerValue`, `BUILD_REFUSAL_VALUE_MAX_RENDERED` or any
`build*` refusal message: a fragment is BOUNDED, NOT redacted, and `segmentIndex: 0` is the `ST`,
never a neutral sentinel.**

### 🩺 `X12-ORPHAN-REEMIT` (2026-08-02) · `agent-notes/x12-orphan-reemit.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list. **🩺 Open it before you touch orphan placement or `SE-01`: an orphan is placed by its ANCHOR
and NEVER by `segmentIndex`, and `SE-01` counts the BYTES THE SERIALIZER WRITES, not the model rows.**

### 🩺 `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` (2026-08-02) · `agent-notes/x12-segment-outside-transaction-dropped.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of
this list. **🩺 Open it before you touch orphan placement or retention: an orphan is RETAINED on
`orphanSegments` and NEVER replayed at its recorded `segmentIndex`, which indexes the INPUT stream
and splices it into whatever occupies that slot on emit.**

### 🩺 `PHI-WARNING-MESSAGE-LEAK` (2026-07-31) · `documentation/agent-notes.md#phi-warning-message-leak-2026-07-31`

- **🩺 NO warning factory takes a value parameter.** Each takes an `X12Position` plus, where one code
  covers several situations, a library-owned discriminant (`CONTROL_NUMBER_PAIRS` /
  `UNEXPECTED_SEGMENT_CONTEXTS` / `BALANCE_INVARIANTS` / `REQUIRED_LOOPS`), and `message` is a lookup
  into a frozen table exported as `ALL_WARNING_MESSAGES`.
- **🩺 Shape-validate-then-echo CANNOT hold for a control number**, whose grammar is whatever the
  trading partner sent (what leaked, and where: relocated narrative §8).
- **`snippet` stays on the four Tier-3 fatals and nowhere else** - a strict-mode escalation used to
  carry 64 bytes of the interchange.
- **`X12Segment.id` is bounded to the segment-id grammar with a `NON_SPEC_SEGMENT_ID` sentinel**
  (what it was: relocated narrative §8).
- **The deliverable is the SLOT TABLE, not the fix.** `test/_helpers/phi-slots.ts` sweeps every
  consumer-controlled slot via `assertNoDiagnosticPhiLeak`; **the GREEN ones are the point of writing
  the table before the fix** (never quote its size - derive it). **Registry membership is asserted
  SEPARATELY**, which is what catches a factory nobody extended the table for.
- **`^0.0.1` resolves EXACTLY on npm for a `0.0.x`.**
- **The shipped disclosure was wrong in several places at once** (relocated narrative §7).
  **Correct the disclosure in the same commit as the fix that makes the new wording true.**

### 🩺 Per-transaction invariants that shipped with the phases · `agent-notes/per-transaction-invariants.md`

**RELOCATED IN FULL 2026-08-08, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-TA1-EMIT-NOT-RELEASE-AWARE` trap above, under this file's own ratchet (relocate first, lower the
entry as it lands, never raise). **Open that file before you change any surface a phase built; the
imperatives are live and they are THERE, not here.** What is in it, so you know when you need it:
v1 profiles are DESCRIPTIVE and a quirk with no Tier-2 fixture is FORBIDDEN; the profile API diverges
from `hl7` deliberately; the 820 carries no balance equation and `build820` never refuses one;
maintenance type is the 834's safety primitive and the 278 certification decision is response-only;
TRN echo is VERBATIM and never fabricated; the HL spine is COMPUTED per builder, with the 278's EV/SS
review level the ONE caller-supplied HL-03; the read side never silently re-numbers a broken HL
pointer; composite-emitting builders emit the envelope INLINE; `splitSegments` is release-aware;
control NUMBERS are identity and are never rewritten; every money / percent / quantity field is
`X12Decimal`; the 835 is NEVER silently rebalanced and PLB carries the RAW EDI sign; an unknown code
is preserved and warned, never normalized (NAME THE RULE, NEVER THE MEMBERS); acks are structurally
PHI-free and never auto-send; `build999` / `buildTA1` refusals; per-builder refusal messages carry
structural locators ONLY, stated PER BUILDER; NO caller guard echoes a caller's element value; the
`?`-release escape is honored losslessly; and `KNOWN-LIMITATIONS.md` is the canonical read-side list.

### `ASSETS-P8`: the `attw` gate lies · `agent-notes/assets-p8-attw-gate.md`

**RELOCATED IN FULL 2026-08-08, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list, with the section above. **🩺 `attw` prints "does not contain types" and EXITS 0**, so the
`attw` script is `scripts/attw.mjs`, a wrapper, NEVER the bare CLI - a broken publish reported as a
pass. Open that file before you touch `scripts/attw.mjs`, `verify.sh` or the attw gate test.

## Standing disciplines (every change)

**Three are the meta-repo's, mirrored from its `documentation/conventions.md`, which is the source of
truth**: docs follow code; version + changelog (a Changeset, `patch`, `0.0.x`) every meaningful
change; and the crew / knowledgebase feedback loop. Their full text is in
`documentation/agent-notes/claude-md-relocated-narrative.md`.

**A fourth is this repo's own, added by `CLAUDE-MD-AUDIT`:** narrative from an incident, a refutation
or a shipped phase goes in **`documentation/agent-notes.md`**, or, once THAT file is on its own
budget, in **`documentation/agent-notes/<slug>.md`**; only its imperative comes back here. **The
ratchet is a ceiling, not a target** - `hl7`, the parser this one mirrors, is 8 KB. **Relocate BEFORE
you write the trap, and pay any trap the last slice left owed** - two consecutive slices did not, and
by the third there were five bytes left and three traps owed.

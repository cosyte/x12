# @cosyte/x12: Project Guide for Claude

## Project

**`@cosyte/x12`**: an ASC X12 EDI parser + utility library (Node/TS, MIT), the payer-side sibling of **[`@cosyte/hl7`](../hl7)**, whose
API shape, profile system and lenient-parser philosophy are deliberately mirrored, so **when in doubt on an API decision, check how
`hl7` solved it.** Identity, north star and siblings: `documentation/agent-notes/claude-md-relocated-narrative.md`.

## ▶ Read this before you touch the parser: `documentation/agent-notes*`

**Every `###` in "Traps" names the section carrying that trap's measurement, sources and reasoning. Open it before you act on the line,
because ONLY THE IMPERATIVE COMES BACK HERE.** Most are in [`documentation/agent-notes.md`](documentation/agent-notes.md), itself
budgeted, so the newest are their own files under `documentation/agent-notes/`. **A trap deleted to hit a number is the one failure
mode this bound exists to prevent. Never quote this file's line ceiling here** - it is declared in the config repo's
`drift-manifest.json` (`baselines.package.groups.agentDoc`) and graded by `drift-check.js`. **A new trap is PAID FOR BY RELOCATING
FIRST**; the pre-compression file is verbatim at relocated narrative §11.

## Status

Pre-alpha `0.0.x`, **published** to npm from a public repo. **Never quote a version here:** `npm view @cosyte/x12 version` is the only
source of truth.

- **Read scope is decoded for** 270, 271, 276, 277 / 277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1.
- **Emit scope is complete for every transaction that has a reader**: general (`serializeX12` + `buildInterchange`) plus a per-TR3
  domain builder for each, and the pure-function `build999` / `buildTA1`, each layering the safety-critical per-TR3 invariants
  (balance, certification, maintenance-type fidelity, count reconciliation) on the general builder.
- **🩺 BOTH inquiry directions ship, read AND emit** (`get276StatusInquiry` / `parse276StatusInquiries` / `build276` beside the 270
  trio). **Never re-add a "no typed model for the 276" claim and never write one paired label over two halves**; derive scope from
  `X12_TR3_CONFORMANCE`, never from prose. **🩺 The 270 and 276 readers each attach a level by its OWN HL-02 and nothing else**, so an
  unresolved pointer leaves that level and its subtree OFF the tree, warned, never re-parented, and their warning codes and build-error
  classes are SIBLINGS, never one widened set. Why: `documentation/agent-notes.md#published-scope-the-270-and-276-inquiry-directions`
- **Warning registry: additions-only, and NEVER quote its size here** (stale twice) - derive it from `ALL_WARNING_MESSAGES`. **Profile
  system** shipped Phase 9; **PHI commit-gate** armed. **Phase histories 1-9 are in `documentation/agent-notes.md`** - read the phase
  section before changing a surface it built.

## v1 Scope Snapshot

HIPAA sets at **005010** (errata hooks); list at `documentation/agent-notes.md#v1-scope-snapshot`. Non-healthcare (850/856/810/204),
EDIFACT, AS2/SFTP and pre-005010 are out. **It is the v1 SCOPE declaration, NOT a list of what SHIPPED** - `X12_TR3_CONFORMANCE` is the
derived answer to that.

## Tech Stack (the shared `@cosyte/*` standard)

**The toolchain is INHERITED by depending on the published `@cosyte/*` config packages, never by copying files.** Source of truth: the
meta-repo's `documentation/conventions.md`; per-tool summary: `documentation/agent-notes.md#tech-stack-the-shared-cosyte-standard`.
**The `attw` script is `scripts/attw.mjs`, NEVER the bare CLI** (`ASSETS-P8` below). **Runtime deps: ZERO.**

## Engineering Guardrails

- No `any`, no unjustified `as` (use `unknown` and narrow). JSDoc with `@example` on every public export. Immutable by default; mutate only via `setElement` / `addSegment` / `addLoopIteration` / `removeSegment`. No `console.*` in library code - throw typed errors or return results. Short, testable functions over parsing blobs.
- Postel's Law: parser liberal (lenient default + stable codes with positional context), serializer conservative. **Be exact, because the README said it loosely until ASSETS-P8** (long form: `documentation/agent-notes/claude-md-relocated-narrative.md`). The domain builders emit spec-clean by construction, but `serializeX12` is byte-faithful **only for the segments the parser recorded on the model**: **`serialize(parse(s)) === s` is NOT guaranteed, and "my file has no line breaks" is NOT sufficient** - `KNOWN-LIMITATIONS.md` is the canonical list, most of it needing no line break and silent. `{ specClean: true }` reconciles the envelope and WARNS; `recomputeCounts` is **inert without `specClean`**. Nothing is ever silently corrected.
- Fatal only for unrecoverable structural corruption (4 Tier-3 codes: `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`). Everything else warns. Coverage target: ≥ 90% on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/`.
- Built-in loop specs + profiles are authored through the same public API (`defineLoopSpec()`, `defineProfile()`): dogfooding gate. HIPAA code lists ship as versioned data snapshots; an update is a release event, never a runtime fetch, and `codeLists.meta.snapshotDate` is the freshness surface. Acknowledgments (`build999`, `buildTA1`, `parse999`) are pure: never auto-send, never open a socket, never touch the filesystem.
- **No em dashes (`U+2014`). Ever.** Founder directive. Gated by `pnpm check:no-emdash` and `.github/workflows/no-emdash.yml`, which scans tracked files **AND your PR title, PR body and commit messages** - this repo squash-merges, so those land on `main`.

## Traps

**Each was paid for. Do not act on a line here without reading the section its `###` names. 🩺 = getting it wrong mis-states a clinical
or financial value on the wire.**

### `X12-NO-INTERNAL-REFS-GATE` (2026-08-11) · `agent-notes/x12-no-internal-refs-gate.md`

**🛑 NEVER RE-TRANSCRIBE THE SIBLING EXCLUSION `X12-\d{3}[A-Z]?|X12-\d{6}`: `X12` is ALSO our item prefix and it swallows our
identifiers whole. 🛑 A POSITIVE SELF-TEST SAMPLE IS DISJUNCTIVE AND THEREFORE VACUOUS: keep rule 1's first arm asserting five
spellings ALONE and PUBLISH NO PROPORTION for the rest (residual (xv), live). 🛑 REMEDIATE BY TRANSLATION, NEVER BY DELETING A DOC
COMMENT. It reads `src/` DOC COMMENTS, never `dist/`; ZERO ON THE RULES IS NOT ZERO ON THE FOUNDER'S RULE.**

### 🩺 `X12-PRE-005010-RUNTIME-MESSAGE` (2026-08-11) · `agent-notes/x12-pre-005010-runtime-message.md`

**🩺 Never assert what ISA-12 DECLARES: the guard reads the TWELFTH ELEMENT OF THE SPLIT and "the declared version" carries the same
presupposition. 🛑 A RUNTIME MESSAGE IS A DIFFERENT CARRIER, so KEEP THE NEGATIVE CONTROL, NAME NO MECHANISM, ECHO NOTHING.**

### 🩺 `X12-ISA-VALUE-POINTERS` (2026-08-11) · `agent-notes/x12-isa-value-pointers.md`

**🩺 A pointer at an `isa.elements[n]` promises VALUES and hands back RAW BYTE TEXT in `dist/index.d.ts`, which SHIPS. 🛑 DO NOT COPY
THE FOUR SIBLINGS' LABEL - `pre-?-unescape` is FALSE ON THE ISA, whose split is deliberately NOT release-aware. 🛑 NAME NO MECHANISM
AND NO CLOSED SET.**

### 🩺 `X12-ENVELOPE-VALUE-EXAMPLES` (2026-08-10) · `agent-notes/x12-envelope-value-examples.md`

**🩺 `Iea`/`Gs`/`Ge`/`Ta1` and `X12FunctionalGroup` `@example`s promise VALUES and hand back FRAMED BYTES, in `dist/index.d.ts`, which
SHIPS. 🛑 COUNT THE ROWS, PUBLISH NO TOTAL, TELL NO STORY ABOUT WHICH IS SPECIAL; DO NOT ATTACH `warnings: []` TO THAT GRID (GE-01 and
IEA-01 ALWAYS warn; the TA1 round trip is the silent one); THE ISA IS DELIBERATELY UNTOUCHED.**

### 🩺 `X12-EMPTY-CONTROL-NUMBER-FABRICATED` (2026-08-09) · `agent-notes/x12-empty-control-number.md`

**🩺 An empty control number FABRICATED `000000000` into ISA-13/IEA-02 and the interchange RECONCILED with `warnings: []`; INVENT and
LOSE are two mechanisms, not one. 🛑 THERE IS NO TRIM: whitespace still pads, DISCLOSED AND NOT FIXED, because no source states one.**

### 🩺 `X12-BODY-DEGENERATE-RELEASE-SEPARATOR` (2026-08-09) · `agent-notes/x12-body-degenerate-release-separator.md`

**🩺 On `elementSeparator: "?"` a BODY segment came back as ONE element with id `(non-spec)` while the ENVELOPE framed and every count
reconciled. 🛑 PER ROLE, ON READ - DO NOT HOIST IT INTO `splitWithRelease`; `?~` STILL SWALLOWS THE TERMINATOR, OPEN.**

### 🩺 `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` (2026-08-09) · `agent-notes/x12-emit-degenerate-release-delimiter.md`

**🩺 A delimiter set with `?` in ANY of FOUR roles is refused on emit; there are TWO mechanisms and the second needs NO caller value.
🛑 THE READ SIDE AND `serializeX12` ARE UNTOUCHED, DELIBERATELY.**

### 🩺 `X12-EMIT-DELIMITER-SHAPE-UNCHECKED` (2026-08-09) · `agent-notes/x12-emit-delimiter-shape-unchecked.md`

**🩺 A delimiter must be ONE VISIBLE CHARACTER and the four distinct; THREE mechanisms are filed as one (LENGTH, TYPE, and `buildTA1`
having NO net at all); the rule counts UTF-16 CODE UNITS, NOT BYTES. 🛑 PUBLISH NO ASYMMETRY ABOUT WHICH ROLES WERE SILENT.**

### 🩺 `X12-ENVELOPE-VALUE-POINTERS` (2026-08-09) · `agent-notes/x12-envelope-value-pointers.md`

**🩺 Envelope `elements[n]` are RAW, so a pointer promising "the values" hands over FRAMED BYTES; THE REMEDY IS DELETION, NEVER A
CORRECTED POINTER, and one that LABELS its surface raw is CORRECT. 🛑 `types.ts`'s `@example` indices are the EIGHTH FLOOR, FILED NOT
CLOSED.**

### 🩺 `X12-ENVELOPE-VALUE-ROUTES` (2026-08-09) · `agent-notes/x12-envelope-value-routes.md`

**🩺 NO DOC MAY NAME `getSegmentValue` AS THE READ OF AN ENVELOPE ELEMENT (all seven types declare only `raw`+`elements`, so the call
is `TS2345`). 🛑 THE SIGNATURE WAS NOT WIDENED AND THAT WAS THE DECISION, since it would make a SILENTLY WRONG ISA READ COMPILE, and
the TWO ROUTES DISAGREE ON A REPETITION so neither "is the route". 🛑 STATE NO RULE OVER THE FOUR ISA CELLS.**

### 🩺 `X12-ST03-READ-NOT-RELEASE-AWARE` (2026-08-09) · `agent-notes/x12-st03-read-not-release-aware.md`

**🩺 Every reader publishes ST-03 POST-`?`-unescape through ONE `decodeSt03`, GROUNDED ON THIS PACKAGE DISAGREEING WITH ITSELF and
never on a TR3 clause. 🛑 THE THREE ST-03 TESTS STILL KEY ON THE RAW TEXT, DELIBERATELY; NO NORMALISATION AND NO NEW WARNING.**

### 🩺 `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` (2026-08-08) · `agent-notes/x12-interchange-gs-escape.md`

**🩺 GS-04 / GS-05 / GS-07 are RELEASED on emit and GS-07 WAS THE SILENT ONE. 🛑 NEVER ESCAPE ELEMENT 0, because a segment id is OURS
and not caller content, and TYPE-CHECK BEFORE ESCAPING.**

### 🩺 `X12-TA1-RESIDUALS` (2026-08-09) · `agent-notes/x12-ta1-residuals.md`

**🩺 The five decoded TA1 fields are POST-`?`-unescape while `raw` is the verbatim byte surface, and an empty TA1-02..05 is REFUSED on
emit (FILED AS TWO SLOTS, MEASURED AS FOUR). 🛑 READ TA1-05's CELL AGAINST A NON-ACCEPT DISPOSITION OR `enforceAcceptIsClean` REACHES
IT FIRST.**

### 🩺 `X12-TA1-EMIT-NOT-RELEASE-AWARE` (2026-08-08) · `agent-notes/x12-ta1-emit-escape.md`

**🩺 An unreleased delimiter shifted TA1-04 and an Accept this library emitted read back as a REJECT; the INVERSE is the less safe one
and the predicate moves BOTH ways, so state the property, never the directions, and never total the cost.**

### 🩺 `X12-VARIANT-ICR-UNGROUNDED` + `X12-837-EMIT-IDENTIFIER-FIXED` (2026-08-08) · `agent-notes/x12-variant-icr-ungrounded.md`, `agent-notes/x12-837-emit-identifier-fixed.md`

**🩺 `VARIANT_BY_ICR` MISSED EVERY 45 CFR 162.1102 IDENTIFIER and EVERY KEY NAMES ITS SOURCE. 🛑 STATE ONE PROPERTY, NEVER A LIST OF
CONSEQUENCES: where ST-03 resolves, THE DECLARATION DECIDES, NOT THE FIRST `SVx`, and the fallback is NOT narrowed. CITED IDENTIFIERS,
NEVER A PATTERN; NEVER ENUMERATE THE SET IN A MESSAGE. 🩺 EMIT REFUSES ON DISAGREEMENT, NOT ON ABSENCE.**

### 🩺 `X12-ISA-ELEMENT-ARITY` (2026-08-10) · `agent-notes/x12-isa-element-arity.md`

**🩺 17 IS A FLOOR AND NEVER THE COUNT, so an ISA element carrying the ELEMENT SEPARATOR displaces what follows it. 🛑 NEVER QUANTIFY
THE SHIFT, not "by one" and NOT from `isa.elements.length`: it is POSITION-DEPENDENT and `isa.raw` is the only route back. 🛑 THE TWO
THAT DO NOT REPRODUCE ARE the in-band repetition/component declarations: A BOUNDARY OF THE PROBE. 🛑 IT IS A REPORT, NOT A REPAIR; THE
EMIT SIDE IS UNGUARDED.**

### 🩺 `X12-837-SV1-OVERWRITE` (2026-08-08) · `agent-notes/x12-837-sv1-overwrite.md`

**🩺 A 2nd `SVx` in an OPEN Loop 2400 REPLACES the 1st element for element, `warnings: []` through `0.0.13`. 🛑 LAST-WINS IS NOT
NARROWED, `X12_837_SERVICE_SEGMENT_REPEATED` is SCOPED TO THE LINE and fires DECODED OR NOT, and SWEEP EVERY MONEY PAGE.**

### 🩺 `X12-837-AMBIGUOUS-VARIANT` (2026-08-08) · `documentation/agent-notes/x12-837-ambiguous-variant.md`

**🩺 `X12_837_AMBIGUOUS_VARIANT` closed ONLY the silence and the `SVx` fallback is NOT narrowed. 🛑 NEVER PICK A WINNER, because a
stray `SVx` and a conformant one are indistinguishable, and ADDITIVITY HERE IS INVARIANCE, NEVER A LIST OF WHAT ELSE YOU WILL SEE.**

### 🩺 `X12-AMT-ADX-ABSENT-AMOUNT` + `X12-STATED-AMOUNT-DISCARDED` (2026-08-07) · `documentation/agent-notes/x12-amt-adx-absent-amount.md`, `documentation/agent-notes/x12-stated-amount-discarded.md`

**🩺 An `AMT`/`ADX` is a RECORD AND NOT A SLOT, so an absent amount drops the whole row, and `X12_AMOUNT_ROW_DROPPED` /
`X12_STATED_AMOUNT_DISCARDED` are DISJOINT and never one segment. 🛑 SAY ABSENT, NEVER "does not decode"; NEVER CLAIM THE BYTES ARE
DECODABLE; STATE THE BOUND AS A PROPERTY OF THE READ AND NEVER OF CONTROL FLOW, because NO LOOP OPEN is a DIFFERENT, silent loss.**

### 🩺 `X12-837-SV-UNDEFINED-DECIMAL` (2026-08-07) · `documentation/agent-notes/x12-837-sv-undefined-decimal.md`

**🩺 An undecoded TERM makes a §1.10.2 equation UNEVALUABLE and never a mismatch, an EMPTY adjustment list is NOT an absent term, and
PUBLISH NO SLOT CENSUS. 🛑 A WIDENING THAT MOVES A CASE ONTO A NEW CODE BLINDS EVERY PREDICATE ON THE OLD ONE - SWEEP EVERY RECIPE AND
PIN IT.**

### 🩺 `X12-PAY-TO-FUSION` (2026-08-07) · `documentation/agent-notes/x12-pay-to-fusion.md`

**🩺 Each `NM1*87` OPENS ITS OWN ACCUMULATOR and occurrences are NEVER MERGED. 🛑 AN EMPTIED SLOT IS NOT A NEUTRAL ABSENCE, because the
emit side reads it; `X12_837_PAY_TO_ADDRESS_REPEATED` counts within ONE Loop 2000A; NEVER write "a second party's NAME".**

### 🩺 `X12-837-LOOP-RESIDUALS` (2026-08-05) · `agent-notes/x12-837-loop-residuals.md`

**🩺 THREE codes in ONE family separated by their ANCHOR (`NOT_DECODED` / `DROPPED` at the `LX`, `SERVICE_SEGMENT_WITHOUT_LX` at the
SEGMENT), never one twice, and the condition is "no line open" and NEVER "the file has no `LX`". 🩺 NEVER DECODE THE ORPHAN `SVx` BUT
NEVER WRITE THAT IT DOES NOT NAME THE VARIANT; ANCHOR `X12_837_UNKNOWN_VARIANT` AT THE `ST`.**

### 🩺 `X12-277-SVC07-NOT-DECODED` (2026-08-05) · `documentation/agent-notes.md#x12-277-svc07-not-decoded-2026-08-05`

**🩺 277 `SVC-07` is usage `R` in X212, `S` in X214**, read and emitted as `unitsOfService`, and `build277` REFUSES a line without it
because **defaulting a count is inventing**. **🩺 SVC-05 / SVC-06 are `N` in BOTH 277 TR3s: emitted empty, left UNREAD. 🩺 ONE usage
fixed; a line is NOT thereby conformant. PUBLISH NO CENSUS. CUT BACK, NEVER GUARD MORE.**

### 🩺 `X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05) · `agent-notes/x12-variant-lookup-prototype.md`

**🩺 A table literal keyed by DOCUMENT BYTES inherits `Object.prototype`, so EVERY OWN PROPERTY of it resolved TRUTHY; `Object.freeze`
DOES NOT HELP and `in` IS NOT THE SAFE FORM. 🛑 NAME THE SET AND NEVER THE MEMBERS, and NO SOURCE SCAN SHIPS.**

### 🩺 `X12-837-SV-SILENT-ZERO` (2026-08-05) · `agent-notes/x12-837-sv-silent-zero.md`

**🩺 A line closed with NO `SVx` decoded for the RESOLVED variant warns at its `LX` (BOTH causes) and this closed ONLY the silence. 🩺
NEVER decode the `SVx` that IS present nor let it flip the variant: units are `SV1-04`/`SV2-05`/**`SV3-06`** and `SV3-05` is the
PROSTHESIS code. `opts.type` is a CALLER INSTRUCTION so the warning ATTRIBUTES NOTHING; anchor the `LX`.**

### 🩺 `X12-QUANTITY-SILENT-DEFAULTS` (2026-08-05) · `agent-notes/x12-quantity-silent-defaults.md`

**🩺 A PRESENT decimal that does not decode warns at its `position.elementIndex` in all six readers and an ABSENT one warns nothing,
both pinned. 🩺 NEVER INVERT THAT INTO "an unwarned value is one the sender sent": a slot a reader never read CANNOT warn, so the
guarantee is unwarned AT AN ELEMENT A READER DECODED. PUBLISH NO CENSUS OF THE FALLBACK OUTCOMES. The sink is an OPTIONAL 4th arg held
by a source scan counting TOP-LEVEL ARGS.**

### 🩺 `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (2026-08-04) · `agent-notes/x12-svc-element-map-off-by-one.md`

**🩺 A round trip cannot test the 835 `SVC` element map and only bytes can, and checking a spec claim against this repo's own
implementation is NOT a check.**

### 🩺 `X12-DECIMAL-BYPASSES-THE-GUARD` (2026-08-04) · `agent-notes/x12-decimal-bypasses-the-guard.md`

**🩺 Every `X12Decimal` slot emits through `escDec` over `requireCallerDecimal`, and 🩺 REFUSE, NEVER ROUND: guessing the scale of
money is what `X12Decimal` exists to prevent. TYPE safety is STRUCTURAL and DELIMITER safety is PER-SLOT, so never write the
unqualified form. 🩺 NAME SPEC FIELDS, NEVER ELEMENT NUMBERS; `buildTA1` uses NEITHER `seg` NOR `joinSeg`.**

### 🩺 `X12-NUMERIC-VALUE-EMITS-EMPTY` (2026-08-03) · `agent-notes/x12-numeric-value-emits-empty.md`

**🩺 Every builder's `esc` comes from `makeCallerEscaper`, which type-checks first and refuses with a typed, code-tagged error. 🩺
REFUSE, NEVER COERCE: coercion mints a DIFFERENT identifier, so check the TYPE and never the sentinel; the `renderCallerValue` COERCES
/ `esc` REFUSES asymmetry is DELIBERATE. 🛑 PUBLISH NO CENSUS OF WHAT BYPASSES THE CHOKEPOINT.**

### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` (2026-08-03) · `agent-notes/parser-testtimeout-asserts-an-idle-box.md`

**🩺 `testTimeout` is NOT the liveness net people assume** - an infinite synchronous loop gives NO verdict and wedges the worker.

### 🩺 The `phi-scan` gate · `PHI-SCAN-SYMLINK-BLIND-ON-BOTH-ROUTES` (2026-08-03), `PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT` + `PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL` (2026-08-06), `PHI-SCAN-WALK-ROOT-SCOPE` (2026-08-08) · one `agent-notes.md` section per id, the last `agent-notes/phi-scan-walk-root-scope.md`, + `#phi-commit-gate-armed-2026-06-28`

- **🩺 Both enumerating routes REFUSE a symlink (exit 2), naming every offender**; neither FOLLOWS an ENTRY it enumerated. Say ENTRY, not "anything": **a walk ROOT that is itself a link IS followed** and **🔴 NOTHING under it is RECONCILED**, so an EMPTIED target reads **exit 0** (OPEN). **A refusal NEVER reports the link target.**
- **▶ 🩺 THE `--staged` ARGV IS THE GATE, EVERY FLAG LOAD-BEARING; NEVER SHORTEN IT. ONE RULE: DO NOT TRUST THE CALLER'S GIT CONFIG.** Five holes, all exit 0 over PHI, closed by `--no-renames --ignore-submodules=none --diff-filter=AMTUB`. **`U` is closed by the FILTER; never add `-M`, `-C` or `--find-copies-harder`; RECORD NO SIMILARITY SCORE.**
- **▶ 🩺 ALL MODE OWES AN ACCOUNT OF ITS ROOTS. TWO RULES, NEITHER IMPLYING THE OTHER:** a declared directory must BE one, and every tracked non-`.md` file under a walk root must have been ENUMERATED against `git ls-files`. Both exit 2. **A COUNT CANNOT DO IT. 🛑 `REQUIRED_DIRECTORIES` IS NOT `WALK_ROOTS`; NEVER FOLD IT BACK IN** - walk roots must stay DISJOINT. **SAY "A DIRECTORY", NEVER "ENUMERABLE". RE-DERIVE EVERY EXIT CODE PER REPO.**
- **Synthetic tokens are POSITIVELY DECLARED in `scripts/phi-allow-list.txt`, byte-strict; a whole-file bypass needs `--allow-fixture` AND an entry in `phi-scan-overrides.md`. 🛑 AN ENTRY IS GLOBAL AND ROUTE-BLIND. Fix a plausible name in the FIXTURE, never by declaring it.**
- **▶ 🩺 `PHI-SCAN-WALK-ROOT-SCOPE` IS TWO SIDES, EACH "IN ADDITION TO", NEVER "INSTEAD OF".** Roots `test` + `src`, `--staged` `test/**` + `src/**`, both widened **BY UNION**, **NO exemption on any route**. Enumerating buys **only the `scanCommonShapes` floor, THREE detectors and not two**; **`looksLikeX12` asks whether the file _IS_ an interchange**, so `scanEmbeddedSegments` is the other side. **IT IS A TRIPWIRE, NOT A PARSER: PUBLISH NO CLOSED COUNT OF WHAT IT MISSES. 🩺 `'` MUST NOT BE A RUN STOP**, but its absence has a PRICE. **`\p{L}` buys MIXED-SCRIPT ONLY.**
- **▶ 🛑 THIS GATE'S OWN CONTROLS ARE ASSEMBLED WITH `seg(...)`, NEVER LITERAL SEGMENT TEXT; WRITE THE NEXT ONE THE SAME WAY.** **The
  enumerate-then-read race is CLOSED (2026-09-05):** a run that ENUMERATED a target and never READ it, which is what an
  `--allow-fixture` withdrawal does, reports its hits and THEN refuses at the invocation code, distinct from the hits code. **🛑 THE
  REFUSAL MUST STAY AFTER THE HITS ARE REPORTED**, and **a run carrying no `--allow-fixture` is unchanged on every route.**

### 🩺 `X12-CALLER-VALUE-RESIDUALS` (2026-08-02) · `agent-notes/x12-caller-value-residuals.md`

**🩺 A forged array-like coerces to `Infinity` and the builder SPINS FOREVER instead of refusing, and removing a guard WEDGES its
negative control rather than reddening it.**

### `X12-BUILDER-BOUNDS` (2026-08-02) · `agent-notes/x12-builder-bounds.md`

**In a `build*` refusal message a fragment is BOUNDED, NOT redacted, and `segmentIndex: 0` is the `ST`, never a neutral sentinel.**

### 🩺 `X12-ORPHAN-REEMIT` (2026-08-02) · `agent-notes/x12-orphan-reemit.md`

**🩺 An orphan is placed by its ANCHOR and NEVER by `segmentIndex`, and `SE-01` counts the BYTES THE SERIALIZER WRITES, not the model
rows.**

### 🩺 `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` (2026-08-02) · `agent-notes/x12-segment-outside-transaction-dropped.md`

**🩺 An orphan is RETAINED on `orphanSegments` and NEVER replayed at its recorded `segmentIndex`, which indexes the INPUT stream and
splices it into whatever occupies that slot on emit.**

### 🩺 `PHI-WARNING-MESSAGE-LEAK` (2026-07-31) · `documentation/agent-notes.md#phi-warning-message-leak-2026-07-31`

**🩺 NO warning factory takes a value parameter:** each takes an `X12Position` plus a library-owned discriminant, and `message` is a
lookup into `ALL_WARNING_MESSAGES`. **🩺 Shape-validate-then-echo CANNOT hold for a control number. `snippet` stays on the four Tier-3
fatals and nowhere else; `X12Segment.id` is bounded with a `NON_SPEC_SEGMENT_ID` sentinel. The deliverable is the SLOT TABLE, not the
fix:** `test/_helpers/phi-slots.ts` sweeps every consumer-controlled slot and **registry membership is asserted SEPARATELY**.

### 🩺 Per-transaction invariants that shipped with the phases · `agent-notes/per-transaction-invariants.md`

**Open that file before you change any surface a phase built; the imperatives are live and they are THERE, not here.** In it: v1
profiles are DESCRIPTIVE and a quirk with no Tier-2 fixture is FORBIDDEN; maintenance type is the 834's safety primitive and the 278
certification decision is response-only; TRN echo is VERBATIM; the HL spine is COMPUTED per builder; control NUMBERS are identity;
every money / percent / quantity field is `X12Decimal`; the 835 is NEVER silently rebalanced and PLB carries the RAW EDI sign; an
unknown code is preserved and warned, never normalized.

### `ASSETS-P8`: the `attw` gate lies · `agent-notes/assets-p8-attw-gate.md`

**🩺 `attw` prints "does not contain types" and EXITS 0**, so the `attw` script is `scripts/attw.mjs`, a wrapper, NEVER the bare CLI -
a broken publish reported as a pass.

## Standing disciplines (every change)

**Three are the meta-repo's, mirrored from its `documentation/conventions.md`, which is the source of truth**: docs follow code;
version + changelog (a Changeset, `patch`, `0.0.x`) every meaningful change; and the crew / knowledgebase feedback loop. Full text:
`documentation/agent-notes/claude-md-relocated-narrative.md`.

**A fourth is this repo's own, added by `CLAUDE-MD-AUDIT`:** narrative from an incident, a refutation or a shipped phase goes in
**`documentation/agent-notes.md`**, or, once THAT file is on its own budget, in **`documentation/agent-notes/<slug>.md`**; only its
imperative comes back here. **The ratchet is a ceiling, not a target** - `hl7`, the parser this one mirrors, is 8 KB. **Relocate BEFORE
you write the trap, and pay any trap the last slice left owed.**

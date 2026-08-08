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

- **Read scope is decoded for** 271, 277 / 277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1.
- **Emit scope is complete for every transaction that has a reader**: general (`serializeX12` +
  `buildInterchange`) plus a per-TR3 domain builder for each, and the pure-function `build999` /
  `buildTA1`, each layering the safety-critical per-TR3 invariants (balance, certification,
  maintenance-type fidelity, count reconciliation) on the general builder.
- **🩺 The 270 and 276 inquiry directions have NO typed model on either side** - no `get270` /
  `get276`, no `build270` / `build276`, no 270 or 276 dispatch anywhere in `src/`. They parse into
  segments and dot-paths like any other input. **Never describe the
  v1 read or emit scope as "270/271" or "276/277" complete** - that claim was on the README and the
  docs site until `ASSETS-P8` corrected it.
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

### 🩺 `X12-TA1-EMIT-NOT-RELEASE-AWARE` (2026-08-08) · `agent-notes/x12-ta1-emit-escape.md`

- **🩺 `buildTA1` RELEASES ALL FIVE CALLER ELEMENTS NOW, SO AN ACCEPT THIS LIBRARY EMITS NO LONGER
  READS BACK AS A REJECT.** A bare delimiter took its own slot and shifted TA1-04, which the read
  narrows out-of-enum to `R`. **`*` AND `~` DID IT ON EVERY RELEASE; ONLY THE `?` SHAPE IS `#96`'s -
  never restate the class as something that arc introduced. THE INVERSE IS THE LESS SAFE ONE:** a
  type-forbidden `noteCode` of `"A"` shifted onto TA1-04 made a **REJECT READ ACCEPT**, and nobody
  resubmits against an Accept.
- **🛑 IT CHANGES BYTES ALREADY ON THE WIRE. THAT IS `#96`'s STATED COST, WEIGHED AND TAKEN, NOT AN
  OVERSIGHT CORRECTED.** Bounded: no delimiter and no `?` means byte-identical, which is every
  conformant TA1. **THE PREDICATE MOVES ONE WAY ONLY** - a spurious `R` and a spurious `A` both STOP
  firing, nothing starts - **so do NOT copy `#96`'s two-directional wording onto it.** A caller who
  hand-rolled the escape now escapes TWICE. **THE READ HALF DID NOT MOVE:** `parseTA1` is still
  pre-`?`-unescape, so a released key still reads back carrying its `?`.
- **🛑 RELEASE ONLY AGAINST THE DELIMITER SET THE CALLER STATES** (`BuildTA1Options` took
  `Build999EnvelopeSpec`'s other three; they exist for ESCAPING and `buildTA1` still emits no
  terminator). `unescapeRelease` keeps `?X` verbatim, so releasing against a GUESSED delimiter
  corrupts a reassociation key that was correct. **THE DEFAULTS ARE THE ARCHETYPE AND CANNOT BE
  VERIFIED.**
- **THE TYPE CHECK IS A PREREQUISITE, NOT A BONUS:** bare `escapeRelease` returns `""` for a
  `number`, so escaping without the chokepoint trades a shifted TA1-01 for a VANISHED one.
  **EXISTING `X12_ACK_INVALID_SPEC`, NO NEW CODE; `enforceAcceptIsClean` STILL RUNS FIRST.**
  **THE `seg`/`joinSeg` QUALIFIER IS UNCHANGED** - still no joiner, so the refusal names the BUILDER
  and never `TA1-01`.

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

### 🩺 `X12-837-SV1-OVERWRITE` (2026-08-08) · `documentation/agent-notes/x12-837-sv1-overwrite.md`

- **🩺 A LINE HOLDS ONE SERVICE SEGMENT'S SLOTS AND EVERY DECODER WRITES ALL OF ITS OWN**, so a 2nd
  `SVx` in an OPEN Loop 2400 REPLACES the 1st: `8500` -> `12`, CPT `99213` -> `99999`, `warnings: []`
  through `0.0.13`. **An ABSENT charge element on the repeat writes `undefined` over a STATED amount
  and `X12_837_SERVICE_LINE_NOT_DECODED` does NOT fire: a segment DID decode.**
- **🛑 LAST-WINS IS NOT NARROWED, ELEMENT FOR ELEMENT.** Same call as `#87`/`#71`: a stray `SVx` and a
  conformant one are indistinguishable, and first-wins changes how PUBLISHED documents decode.
- **`X12_837_SERVICE_SEGMENT_REPEATED` at the REPEAT, no `elementIndex`, once per repeat, SCOPED TO
  THE LINE.** Fires on ANY kind, DECODED OR NOT: keying it on `serviceSegmentDecoded`, or latching
  it, each reds its own control.
- **🛑 A BLIND CONSUMER WAS THIS REPO'S OWN DOCS, NOTHING HAVING MOVED ONTO A NEW CODE:** the
  post-a-line-amount gate named FOUR codes and `spec-notes-money` "the known instance", NONE firing
  here. **SWEEP EVERY MONEY PAGE, NOT THE RECIPE ALONE; PIN IT.**
- **The message ASSERTS NO TR3 USAGE and depends on NO variant resolving**, which is why
  `X12-VARIANT-ICR-UNGROUNDED` could correct that table without touching this code.

### 🩺 `X12-837-AMBIGUOUS-VARIANT` (2026-08-08) · `documentation/agent-notes/x12-837-ambiguous-variant.md`

- **🩺 THE `SVx` FALLBACK IS NOT NARROWED AND MUST NOT BE; THIS CLOSED ONLY THE SILENCE.**
  `X12_837_AMBIGUOUS_VARIANT` at the `ST`, NO `elementIndex`, ONCE per transaction, ONLY where the
  fallback DECIDED and the body names more than one variant. **A caller `type` or a resolving
  `ST-03` means NO guess, so it is NOT raised however mixed the body is: a property of the
  RESOLUTION, never of the document.**
- **🩺 NEVER PICK A WINNER: a stray `SVx` and a conformant one are indistinguishable here**, and
  first-wins takes the first, open Loop 2400 or not. Choosing would be inventing.
- **🩺 ADDITIVITY HERE IS INVARIANCE, NEVER A LIST OF WHAT ELSE YOU WILL SEE.** The frozen message
  said "a service segment with no line open still raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX`"; a
  refuter measured it FALSE - a stray `LX` suppresses it. Say only: whatever was raised is still
  raised, same position. Pinned CHANNEL-WIDE with this filtered out. **Never with
  `X12_837_UNKNOWN_VARIANT`.** **NO LONGER SOLE:** a foreign `SVx` inside an already-decoded Loop 2400
  raises `X12_837_SERVICE_SEGMENT_REPEATED` at itself (trap above).

### 🩺 `X12-AMT-ADX-ABSENT-AMOUNT` + `X12-STATED-AMOUNT-DISCARDED` (2026-08-07) · `documentation/agent-notes/x12-{amt-adx-absent-amount,stated-amount-discarded}.md`

- **🩺 AN `AMT`/`ADX` IS A RECORD, NOT A SLOT: no decoded amount (AMT-02, ADX-01) = NO ROW, qualifier
  and reason code gone with it.** `X12_AMOUNT_ROW_DROPPED` at the SEGMENT, **NO `elementIndex`**; the
  834's goes on the **MEMBER's** `warnings`. **The 835 and 837 attach an `AMT` to the open LINE
  first, so the lost row is often LINE-level; never call that site "claim-level".**
- **🩺 SAY ABSENT, NEVER "does not decode"** (the wider form cost a pass-2 minor): only ABSENT was
  silent, UNPARSEABLE already warned. **Both raise it, NOTHING MOVED off `X12_UNPARSEABLE_DECIMAL`**,
  and whether one sits at the same `segmentIndex` separates them.
- **🩺 TWO AMOUNT-ROW CODES, DISJOINT, NEVER ONE SEGMENT.** The dropped one needs an amount element
  that DECODED NO VALUE; `X12_STATED_AMOUNT_DISCARDED` needs one the sender POPULATED, discarded for
  a reason that is NOT about the amount. Two routes, ONE message, NO discriminant: an 820 `RMR` with
  BOTH identity elements empty, and an 837 `AMT` under an open `SVD`. SEGMENT, no `elementIndex`.
  **SEPARATE BECAUSE REUSE WOULD FALSIFY A PUBLISHED SEPARATOR ON MONEY** (the dropped code's own
  message says an unaccompanied instance means the sender stated NO amount). It closed an INVERSION:
  under an open `SVD` the ABSENT amount warned and the STATED one did not, so the report sat exactly
  where LESS was lost.
- **🩺 NEVER CLAIM THE BYTES ARE DECODABLE - a pass-1 major.** The `RMR` guard is a
  PRESENCE test, never a decode, so **NO `X12_UNPARSEABLE_DECIMAL` even on unreadable bytes** and it
  fires on `1,234.56` too; deciding by decode would mint it where it never fired. Only the `AMT`
  route guarantees a value.
- **🩺 STATE THE BOUND AS A PROPERTY OF THE READ, NEVER OF CONTROL FLOW. "Nothing open means silent"
  is FALSE** - the 835/837 decode BEFORE looking for somewhere to attach, so an absent amount with no
  claim open DOES warn; the 834/820 return first and stay silent. **NO LOOP OPEN is a DIFFERENT loss
  and STAYS SILENT** (834 `AMT` no `HD`, 820 `ADX` no remittance, 835/837 `AMT` before any claim), so
  never widen to "a stated amount row is always reported"; a bare `RMR~` and one stating only RMR-03
  are silent too. **The INVERSION SURVIVES at the 835/837 sites ONLY**
  (`PRE-EXISTING`). **An empty filtered array asserts NOTHING.**

### 🩺 `X12-837-SV-UNDEFINED-DECIMAL` (2026-08-07) · `documentation/agent-notes/x12-837-sv-undefined-decimal.md`

- **🩺 A slot reads `X12Decimal | undefined` EXACTLY where a reader could substitute `ZERO`; a STATED
  zero still reads `0` and KEEPS ITS LEXICAL FORM. PUBLISH NO SLOT CENSUS.**
  **`X12_835_BALANCE_NOT_EVALUABLE`: an undecoded TERM makes a §1.10.2 equation UNEVALUABLE, NEVER a
  mismatch; an EMPTY adjustment list is NOT an absent term** - it sums to `ZERO`.
- **🛑 A WIDENING THAT MOVES A CASE ONTO A NEW CODE BLINDS EVERY PREDICATE ON THE OLD ONE, AND THIS
  PACKAGE'S OWN DOCS ARE SUCH A CONSUMER** - the "do NOT auto-post" recipe gated on
  `X12_835_REMIT_BALANCE_MISMATCH` alone went base `true` / head `false`. **Sweep every recipe, the
  troubleshooting table and `CHANGELOG.md`; PIN THE SWEEP.**
- **🩺 `Build837ServiceLineSpec.units` is REQUIRED and the builder REFUSES rather than emitting `0`.
  SV3-06's TR3 usage is NOT grounded - never claim it is.**

### 🩺 `X12-PAY-TO-FUSION` (2026-08-07) · `documentation/agent-notes/x12-pay-to-fusion.md`

- **🩺 EACH `NM1*87` OPENS ITS OWN ACCUMULATOR; OCCURRENCES ARE NEVER MERGED.** The LAST that STATES
  an address takes the slot; one that states NONE does **not** blank one that did.
- **🛑 AN EMPTIED SLOT IS NOT A NEUTRAL ABSENCE - THE EMIT SIDE READS IT** (Loop 2010AB is gated on
  `payToAddress !== undefined`), so "states an address" IS **what `emitAddress` would write a segment
  for**, ONE predicate shared both ways. **"A write happened" is a property of the SEGMENT STREAM and
  was refuted.** Disclosed cost: a repeat stating only PART re-emits only that part, and restoring
  the earlier occurrence's street lines IS the fusion.
- **`X12_837_PAY_TO_ADDRESS_REPEATED` at the 2nd+ `NM1*87` in ONE Loop 2000A**, no `elementIndex`,
  counter reset at that loop's `HL` (a latching one flags a conformant second billing provider).
  **NEVER write "a second party's NAME" - measured false.** `PRE-EXISTING`: with a `CLM` open it
  lands in `claim.providers` instead.

### 🩺 `X12-837-LOOP-RESIDUALS` (2026-08-05) · `documentation/agent-notes.md#x12-837-loop-residuals-2026-08-05`

- **🩺 THREE CODES, ONE FAMILY; THE ANCHOR SEPARATES THEM.** `NOT_DECODED` = line IS on the model,
  seeded zeros; `DROPPED` = an `LX` put it on NO claim; **`SERVICE_SEGMENT_WITHOUT_LX` = an
  `SVx` with NO LINE OPEN**. The first two anchor at the `LX`; the third **cannot**, so it takes
  the segment. **Never one twice - one document CAN carry all three.**
  **Its condition is "no line open", NEVER "the file has no `LX`"** - an earlier claim's `LX` is one.
- **🩺 NEVER DECODE THE ORPHAN `SVx`** (reading one into a line never opened mis-READS money).
  **But NEVER write it does not name the VARIANT - measured false:** the fallback scans the whole
  body, orphans included, so a stray `SV2` re-types it. `PRE-EXISTING`, not narrowed.
- **The suppression is SCOPED, not latched** - a flag beside each `serviceLineDropped`, cleared in
  `flushServiceLine`. **A latching one silences every later orphan.**
- **🩺 ANCHOR `X12_837_UNKNOWN_VARIANT` AT THE `ST` (`tx.segments[0]`), NEVER THE `BHT`; NO
  `elementIndex` (an absent ST-03 has no element 3). ROUTE 1's DISCARD IS A TRADE: a stray `LX` in
  an ENTITY loop LOSES its `N3`/`N4`/`REF`/`PER`, each WARNED AT ITSELF
  (`X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`); NEVER WIDEN IT, other unattached routes stay
  SILENT. NEVER write "nothing after an `LX` addresses the last party", and NEVER cite
  `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` - it WARNS and retains.**

### 🩺 `X12-277-SVC07-NOT-DECODED` (2026-08-05) · `documentation/agent-notes.md#x12-277-svc07-not-decoded-2026-08-05`

- **🩺 277 `SVC-07` is usage `R` in X212, `S` in X214.** Read + emitted as `unitsOfService`;
  `build277` REFUSES a line without it, `build277CA` takes the same spec. An EMPTY one is still
  short a required element; **defaulting a count is inventing.**
- **🩺 SVC-05 / SVC-06 are `N` in BOTH 277 TR3s: emitted empty, left UNREAD** (the 835's SVC-05 IS
  its paid count). The TR3s NAME SVC-07 differently; ONE field carries both.
- **🩺 ONE usage fixed; a line is NOT thereby conformant. PUBLISH NO CENSUS: `SVC-01`/`SVC-02` are
  `R` in X212 and STILL optional, `SVC-03` too, READ side silent. CUT BACK, NEVER GUARD MORE.**

### 🩺 `X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05) · `documentation/agent-notes.md#x12-variant-lookup-prototype-2026-08-05`

- **🩺 A lookup keyed by DOCUMENT BYTES is built with `wireLookup` (`Object.create(null)`) where this
  package declares the table, and read through `Object.hasOwn` where it does not.** A literal
  inherits `Object.prototype`, so EVERY OWN PROPERTY of it resolved TRUTHY. **`Object.freeze` DOES
  NOT HELP and is why this passed review** - it seals OWN properties only. **🩺 NAME THE SET, NEVER
  THE MEMBERS:** a draft published EIGHT across six surfaces; the engine has TWELVE. **Cut back,
  never grow a census.**
- **🩺 What it destroyed, strictly more than `#67`: relocated narrative §8**, and four more sites
  probe by probe in the agent-notes section. **🩺 `in` IS NOT THE SAFE FORM** - it walks the prototype chain. Reach for
  `Object.hasOwn`.
- **271 / 277 / 278 were NEVER exposed and their literal tables are LEFT ALONE:** `shared/hl.ts` has
  always guarded with `hasOwnProperty`; the 837's LOCAL `validateHl` copy did not. **Do not "finish
  the job" there.** **NO SOURCE SCAN SHIPS, DELIBERATELY** (the reason it cannot work here:
  relocated narrative §9). The defence derives its keys from
  `Object.getOwnPropertyNames(Object.prototype)` AT RUN TIME, UNFILTERED.
- **`X12_837_SERVICE_LINE_DROPPED` is a NEW code, NOT `#67`'s renamed.** Two routes (no `CLM` open,
  or the variant is not P/I/D), one message, no discriminant. The family is the trap below.
- **🩺 STATE ITS THREE BOUNDS; DRAFTS PUBLISHED ALL THREE FALSE.** It does **NOT** travel with
  `X12_837_UNKNOWN_VARIANT` (an out-of-enum caller `type` reaches route 2 without it - read
  `submission.variant`); an **`SVx` with NO `LX` at all is a DIFFERENT code** (the trap below); and a
  trailing `DTP`/`AMT`/`NTE`/`REF` is **ROUTE-DEPENDENT** (claim open: onto the claim; no claim: all
  four discarded). **Never state that unqualified** - two drafts did, opposite ways.
- **🩺 DO NOT RESTRUCTURE THE `LX` CASE; LET NO ROUTE OUT OF IT SKIP `activeEntity = undefined`**
  (trap below). **State no count of how it differs from a base - two drafts did, both wrong.**
- **🩺 EVERY WARNING-CHANNEL ASSERTION IS `toEqual` ON THE WHOLE ARRAY** - `#67`'s residual pinned a
  value plus the absence of a DIFFERENT code and stayed green. Pair every lying document with an
  honest control. **State the property, never an absolute about a matcher
  NAME** - published twice, false both times, the second inside the fix for the first.
- **Every guard has its own red negative control. Re-derive a red/green census by RUNNING head's
  suite against a base tree, never by arithmetic** - a partitioned form was wrong four ways, and a
  suite total quoted here goes stale the next slice. Derive it.
- **🩺 The ABSENT `SV1-02` deferred here is CLOSED: `X12-837-SV-UNDEFINED-DECIMAL`, its own trap below.**

### 🩺 `X12-837-SV-SILENT-ZERO` (2026-08-05) · `documentation/agent-notes.md#x12-837-sv-silent-zero-2026-08-05`

- **🩺 An 837 Loop 2400 line closed with NO `SVx` decoded for the resolved variant warns
  `X12_837_SERVICE_LINE_NOT_DECODED` at its `LX`.** BOTH causes: a foreign `SVx`, and none at all.
- **🩺 THIS slice closed only the SILENCE.** `charge`/`units` read `undefined`, and this warning
  still says WHY - `undefined` alone does NOT separate it from a decoded `SVx` whose charge element
  was absent.
- **🩺 NEVER decode the `SVx` that IS present, nor let it flip the line's variant.** The charge is
  `SV1-02`/`SV2-03` and the units `SV1-04`/`SV2-05`/**`SV3-06`** (`SV3-05` is the prosthesis code -
  three comments said units and were corrected), so that mis-READS money. `opts.type` is a caller
  instruction, so **the warning attributes nothing**: a `type` can disagree with a clean document.
- **Anchor the `LX`, never the `SVx`** (the no-`SVx` case has none); no `elementIndex`.
- **🩺 THE RESIDUAL TEST DID NOT GO RED, AND THAT IS THE FINDING.** **Pin the WHOLE channel, BOTH
  sides.**
- **Only bytes make these; no round trip can.** 4 leak probes + 2 controls, both ways: deleting one
  flag-set reds a control.
- **🩺 `X12-837-SV-UNDEFINED-DECIMAL` CLOSED THE `0`** - its own trap above.

### 🩺 `X12-QUANTITY-SILENT-DEFAULTS` (2026-08-05) · `documentation/agent-notes.md#x12-quantity-silent-defaults-2026-08-05`

- **🩺 A PRESENT decimal that does not decode emits `X12_UNPARSEABLE_DECIMAL` at its
  `position.elementIndex`, in all six readers; an ABSENT one emits nothing.** Both pinned.
- **🩺 THIS slice closed only the SILENCE; `X12-837-SV-UNDEFINED-DECIMAL` closed the `0`.**
- **🩺 NEVER INVERT IT INTO "an unwarned value is one the sender sent". A slot a reader never read
  cannot warn**; three shipped docs carried the bare form. Guarantee: unwarned **at an element a
  reader decoded**. The 837 instance of the other kind is the trap above.
- **PUBLISH NO CENSUS OF THE FALLBACK OUTCOMES.** The
  RULE holds: a property of the READ, not the USE.
- **ONE message, NO discriminant** (where a `ZERO`/`NOT_DECODED` pair was wrong: relocated narrative
  §8). **And assert nothing about what X12.6 type R permits;** nobody here has read it, so the
  message says "could not decode".
- **The 835 balance invariant is NOT a net: it names an equation, never an element, and exists in no
  other reader.**
- **The sink is an OPTIONAL 4th arg; the public helpers stay silent without one**, held by a source
  scan counting TOP-LEVEL ARGS, never a `, sink)` regex. **A green suite proved nothing: no fixture
  holds an unparseable decimal and a round trip CANNOT make one.**

### 🩺 `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (2026-08-04) · `documentation/agent-notes.md#x12-svc-element-map-off-by-one-2026-08-04`

- **🩺 The 835 SVC map is `revenueCode` -> SVC-04 (element 234, the NUBC revenue code, a **string**),
  `paidUnitsOfService` -> SVC-05 (element 380, Units of Service **PAID** Count) and
  `originalUnitsOfService` -> SVC-07 (element 380, **ORIGINAL** Units of Service Count). Never move
  them back.**
- **Never fix a mis-read position while leaving its sibling element unread** - that turns a mis-read
  into a **fresh silent drop**. **Retention is non-decreasing, on purpose.**
- **🩺 A round trip cannot test an element map; only bytes can** - it is green for ANY pair of
  positions the two modules agree on. `test/transactions-remit-835-svc-element-map.test.ts` pins the
  map literally. **Never weaken those to round trips.**
- **🩺 Checking a spec claim against this repo's own implementation is NOT a check** - it only proves
  the two agree, which is exactly how the wrong map survived. Ground an element number OUTSIDE the
  repo (sources in `KNOWN-LIMITATIONS.md`). **TR3 005010X221A1 is paid for and nobody here has read
  it.**
- **Never default an absent SVC-05 to one.** X221A1 is _reported_ to assume one, secondhand and from
  no clause anyone here read. Fabricating a count is inventing.
- **`undefined` still means "not decoded", not "absent"** - the next trap says what tells them apart.
- **🩺 835s this library emitted at `0.0.9` or earlier are non-conformant and should be re-emitted**
  (the mechanism: relocated narrative §8).

### 🩺 `X12-DECIMAL-BYPASSES-THE-GUARD` (2026-08-04) · `documentation/agent-notes.md#x12-decimal-bypasses-the-guard-2026-08-04`

- **Every `X12Decimal` slot emits through the builder's `escDec` over `requireCallerDecimal`.** How a raw
  `number` in such a slot used to bypass that guard, and what went out on the wire: relocated
  narrative §8.
- **🩺 Refuse, never round:** guessing the scale of money is what `X12Decimal` exists to prevent
  (relocated narrative §8).
- **Do not flatten this with `#60`.** `#60` existed because a required identifier VANISHED. Nothing
  vanishes here and nothing is mis-_read_; the exposure is float noise on the wire.
- **Type safety is structural; DELIMITER safety is per-slot. Never write the unqualified form.**
  `requireCallerSegment` type-checks every element of every segment emitted **through a builder's
  `seg`/`joinSeg` helper**. A `string` carrying an active delimiter in a slot that skipped `esc` is
  still emitted verbatim.
- **The raw slots routed through `esc`: delimiter-safe and type-checked, value-constrained only where
  a trap below says so. ONLY these were routed** (the enumeration: relocated narrative §7). **The
  residual delimiter injection is NOT stop-the-line** - it fails at the receiver and mints no wrong
  clinical value. Do not escalate it as if it did.
- **`buildTA1` uses NEITHER `seg` NOR `joinSeg`; it DOES use `esc` now** (trap above), and no `pad`.
  TA1-01 is data element I12, the reassociation key. **This was the FOURTH iteration of the
  completeness claim; do not write the unqualified form again.**
- **The fixed-width ISA line is joined directly and is outside BOTH guards.** Both throws terminate and
  neither is silent (which throws what: relocated narrative §8).
- **`build835`'s balance-equation amounts refuse UNTYPED, and every other `X12Decimal` field refuses
  TYPED.** `enforceBalance(spec)` runs BEFORE the escaper is built, so `requireCallerDecimal` is
  unreachable on anything it reads.
- **🩺 STATE THE RULE, AND NAME SPEC FIELDS - NEVER ELEMENT NUMBERS.** A slot refuses untyped exactly
  when the balance guard reads it as a term of one of the three §1.10.2 invariants (line, claim,
  top-of-remit) in `src/transactions/remit/balance.ts`. **The terms are ENUMERATED in relocated narrative §8, because a count
  without its list cannot self-correct; read them there and never re-derive them.** Two successive
  remedies published a closed list and an element-number list and both were measured wrong. Both arms are pinned on one fixture, so moving a slot between them reds the gate.
- **Assert the MESSAGE, not the class, in every builder-refusal test** - including the disclosure
  pins. `expect(run).toThrow(Remit835BuildError)` passes on an unrelated refusal; four of six new
  cases were vacuous that way.
- **Never bound a loop with `i < parts.length` over a caller array-like; iterate with `for...of`,
  which throws** (the forged shape and what it reported: relocated narrative §9). **The scanner is
  not comment-stripped for that rule**, so writing the bad shape in a comment reds it too.
- **The pinned `esc` counts, and why "X12 code source 715" was wrong, are MEASUREMENTS and not
  rules** - agent-notes section; read them there before quoting either.

### 🩺 `X12-NUMERIC-VALUE-EMITS-EMPTY` (2026-08-03) · `documentation/agent-notes.md#x12-numeric-value-emits-empty-2026-08-03`

- **🩺 All nine builders take `esc` from `makeCallerEscaper` (`src/builder/caller-string.ts`), which
  type-checks first and refuses with the calling module's own typed, code-tagged error.**
  What `escapeRelease` read, and the `CLP-01` reassociation key it vanished: relocated narrative §8.
- **🩺 Refuse, never coerce, and that is the whole item.** Coercion mints a _different_ identifier: a
  payload carrying `"0012345"` as a number already lost its leading zeros, and reassociating to the
  wrong claim is worse than failing to reassociate. **The builder's own required-field guard is
  defeated by a number** (the instance: relocated narrative §7). Check the type, not the sentinel.
- **The `#51` asymmetry is deliberate, not an inconsistency.** `renderCallerValue` **coerces**;
  `esc` **refuses**. _Survive anything_ vs _invent nothing_.
- **🩺 NEVER PUBLISH AN EXHAUSTIVE CENSUS OF WHAT BYPASSES THE CHOKEPOINT.** Three drafts did; a
  refuter measured all three false, each time by finding one more. **Cut the claim back, do not grow
  the census. Finding one more is expected and is not a new finding. No total is published.**
- **A gate that asserts a same-line REGEX pins against drift and says nothing about the property.**
  `build-837` alone has three off-line `.toString()` reads the regex misses.
- **Public surface:** exported `escapeRelease` now **throws `TypeError`** on a non-string instead of
  returning `""`; nothing in the library can reach it, because the builders refuse first. **"No
  working caller is broken" was too absolute:** a boxed `new String(...)` built at base, refused now.

### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` (2026-08-03) · `documentation/agent-notes.md#parser-testtimeout-asserts-an-idle-box-2026-08-03`

- **No timeout value changed; that is the finding, not an omission.**
- **Count BOTH trees; never reuse one census for the other.**
- **Re-derive this box's capacity; never inherit a figure.** The item's numbers are stale.
- **Interleave BASE/HEAD runs, two rounds each. Never one.**
- **The `tsx` -> `node` substitution is pinned as an EQUIVALENCE, not assumed. Scope it:** `paths`
  mode only (why: relocated narrative §8).
- **The global `testTimeout` stays at 10 s on purpose**, and **do not upgrade the `10.0 s` reading
  into a proven crossing** - the reporter rounds. The 834 stream's figures: relocated narrative §8.
- **🩺 `testTimeout` is NOT the liveness net people assume.** An **infinite synchronous** loop gives
  **NO VERDICT AT ALL** and wedges the worker. A liveness regression here reads as an ABSENT verdict,
  not a red one, and no value of `testTimeout` changes that. The defence is the source scan in
  `test/builder-array-bounds.test.ts`.
- **`test/scripts/attw-gate.test.ts` is deliberately left alone** - pinning the REAL binary is the
  point of it.

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

### 🩺 `X12-CALLER-VALUE-RESIDUALS` (2026-08-02) · `documentation/agent-notes.md#x12-caller-value-residuals-2026-08-02`

- **Every caller-value hole across the `src/profiles/validate.ts` refusal sites routes through
  `renderCallerValue` or `renderCallerJson`. Derive both counts; never quote them here.**
- **`renderCallerJson` keeps `JSON.stringify` and bounds its OUTPUT; it never throws and fabricates
  no closing quote. `X12ProfileError.profileName` is deliberately NOT bounded**, asserted as a test
  (both reasons: relocated narrative §9).
- **🩺 Every indexed loop bound in a builder comes from a `requireCallerArray` binding.** A forged
  `{ length: "9".repeat(120000) }` coerces to `Infinity` and the builder **spins forever instead of
  refusing**; most probes HUNG at base. Both censuses are in the agent-notes section.
- **`requireCallerArray` takes the module's own `refuse` callback, never a shared throw** - each
  builder owns a distinct error class and code consumers branch on.
- **`requireCallerArray` answers `null` as ABSENT** (why: relocated narrative §7). **`build835`'s
  `claims` is the measured exception**, pinned by a test.
- **Scope the claim: a forged non-array is availability, not `STOP-THE-LINE`** - nothing decodes a
  document differently. **`for...of` sites throw `TypeError: ... is not iterable` with NO `code`**;
  those sites and the reachability: relocated narrative §9. Disclosed, pinned.
- **`test/builder-array-bounds.test.ts` keys on the OPERAND, never on the property NAME** - that is
  the mistake `#51`'s allowlist made twice. Its scan strips comments first.
- **🩺 The negative control found something worse than a red: removing a `requireCallerArray` call
  WEDGES the test rather than failing it** (why: relocated narrative §8). **That is the argument for
  keeping the source scan exhaustive rather than trusting the examples.**
- **Drive the shipped table, not a side probe**, and **every figure this area publishes is a
  MEASUREMENT, not a maximum** (the figures and the `QUIRK_ID_RE` correction: relocated narrative §7).
- **Known and NOT claimed away:** bounding a message here **redacts nothing**, the survivors are
  **not escaped**, the bound is UTF-16 **code units, not bytes**, both scans are syntactic tripwires
  and not proofs, and **neither gate scans indexed loops outside the `build*` scope** (the four
  places: relocated narrative §9).

### `X12-BUILDER-BOUNDS` (2026-08-02) · `documentation/agent-notes.md#x12-builder-bounds-2026-08-02`

- **Every caller-supplied value in a `build*` refusal message goes through `renderCallerValue`**
  (`src/builder/caller-value.ts`), capping the rendered **fragment** at
  `BUILD_REFUSAL_VALUE_MAX_RENDERED` = **90**. All three names are public.
- **A type is NOT a runtime guarantee** (the four holes the item's census missed: relocated
  narrative). **State a ceiling as a ceiling and a measurement as a
  measurement:** 90 is the ceiling on the FRAGMENT, and three published figures were wrong once.
- **This is NOT `PHI-WARNING-MESSAGE-LEAK` on the emit side; escaping was deliberately NOT done, so
  a refusal message is bounded but one log line is not; and the caller-vs-document dichotomy is NOT
  categorical.** Long form + the two counterexamples: relocated narrative §7.
- **`test/builder-refusal-bounds.test.ts` must never allow `String(...)` or `String(<expr>.length)`;
  what remains allowed is a single-letter loop index and the `width` literal only** (the two
  allowlists that leaked: relocated narrative §8). **Negative controls run both ways.**
- **🩺 `segmentIndex: 0` is NOT a neutral sentinel: `tx.segments[0]` is the `ST`.** The remit-total
  balance warning now carries the BPR's own 1-based body index, and `balance.ts`'s doc was corrected
  with the code. **The build-side `segmentIndex: 0` was filed as the same defect and is not one**
  (why, and what fabricating one would have named: relocated narrative §9).
- **`renderCallerValue` coerces and never throws** (the draft that did not: relocated narrative).
- **Assert SE-01 outright, never trust it**: a repeatedly-hit tripwire.

### 🩺 `X12-ORPHAN-REEMIT` (2026-08-02) · `documentation/agent-notes.md#x12-orphan-reemit-2026-08-02`

- **🩺 `serializeX12` places every orphan by `X12OrphanSegment.anchor` and NEVER by `segmentIndex`.
  The fix is the ANCHOR, not the re-emission.** An anchor names a SLOT of the typed tree, so it
  survives both reorderings the emit performs; a raw input index cannot. The three corners are in the
  agent-notes section.
- **🩺 SE-01 must count the BYTES THE SERIALIZER WRITES, not the model rows** (X12.6: "segments
  included in the transaction set, including ST and SE"). What the undercount did: relocated narrative
  §7. `segCount` now adds every orphan
  flushed between the `ST` and the `SE`. GE-01/IEA-01 are unaffected: an orphan is never a `GS`.
- **`KNOWN-LIMITATIONS.md` holds the canonical not-reproduced list; derive its size.**
- **Case 6 (the empty-first-element segment `*A*B~` outside a transaction) is deliberately NOT in
  scope** (why, and what closing it would mint: relocated narrative §8).
- **Retention and placement are NOT promotion:** no `get*` reader sees an orphan, and a `TA1` in a
  group still does not join `ta1Segments`.
- **State the four kept regression assertions at the MODEL level, not the byte level.** A
  `ta1-inside-group` orphan IS written back between the `ST` and the `SE`, so "never lands inside a
  transaction" would be simply false.

### 🩺 `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` (2026-08-02) · `documentation/agent-notes.md#x12-segment-outside-transaction-dropped-2026-08-02`

- **🩺 A segment the envelope walker cannot place is RETAINED on `X12Interchange.orphanSegments`, not
  discarded.** All orphans go through one `recordOrphan` chokepoint so the warning and the retained
  segment can never disagree; `segmentIndex` is the join key back to `position.segmentIndex`.
- **🩺 Line-break tolerance is 15 of 15 CR/LF sequences of length 0 to 3.** What 4 of 15 cost:
  relocated narrative §8.
- **🩺 NEVER replay an orphan at its recorded `segmentIndex`. Read the refutation before touching the
  emit again.** `segmentIndex` indexes the INPUT stream and the emit is not in input order, so replay
  splices the orphan into whatever occupies that slot; the three corruption shapes measured, and why
  trading a warned omission for silent structural corruption is the wrong direction here: relocated
  narrative.
  **The defect is in the ADDRESSING SCHEME and comes straight back if anyone reaches for
  `segmentIndex`.**
- **A segment with an empty first element, outside a transaction, is dropped with NO warning at all** -
  the only construct on the list with no diagnostic whatsoever. Inside an open transaction the same
  segment round-trips normally.
- **Neither a doubled terminator nor a segment with an empty first element is recorded.**
- **The `X12_UNEXPECTED_SEGMENT` messages were corrected** - they said the segment was not retained,
  now false. Nothing became fatal.

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

### `ASSETS-P8`: the `attw` gate lies · `documentation/agent-notes.md#assets-p8-the-attw-wrapper`

- **🩺 `attw` prints "does not contain types" and EXITS 0, so the `attw` script is `scripts/attw.mjs`,
  a wrapper, NEVER the bare CLI** (the upstream line that does it: relocated narrative §8). For a
  package that ships types it means the declarations were **not in the tarball**: a broken publish reported as a pass.
- **`scripts/verify.sh` needs no change; do not touch it** - it propagates the step's status
  faithfully; the step is what lies to it.
- **The timing supplies the condition; the exit code is the defect** (the `tsup` build interval:
  relocated narrative §7). **Re-measure per repo; do not carry a sibling's figure over.** The answer
  is **not** a lock, a lease or a build queue (ADR 0015): the gate has to be able to say its own
  inputs were missing, whatever removed them.
- **Keep BOTH nets in `scripts/attw.mjs`; they catch different things** - the preflight and the
  post-check, and what each one catches that the other structurally cannot: relocated narrative §9.
- **The post-check reads a string, so anything that could hide it is REFUSED by option name,
  wholesale, not by value** (four routes; a nonexistent `--config-path` blinds nothing).
- **`test/scripts/attw-gate.test.ts` pins the upstream exit-0 itself**, so an `attw` upgrade reds the
  suite instead of letting the net go quietly slack.
- **The port is NOT finished org-wide, including `config/scripts/parser-template/`, which
  `scaffold-parser.mjs` mints new parsers from.** Derive the set; never trust a count.

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

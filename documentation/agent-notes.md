# x12 agent notes

The relocated narrative from `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the cursor, the
rules, and every trap as a one-line imperative; each of those lines points at the section
here that carries the measurement, the refutation, and the reasoning behind it.

Relocated 2026-08-04 under `CLAUDE-MD-AUDIT`, per the amendment to the meta-repo's
`documentation/decisions/0023-doc-budgets.md`. **Nothing here was edited.** Read the section
before you touch the code it describes: these paragraphs each cost a defect or a refuted
claim to learn, and several of them name a remedy that was tried and refuted.

## Contents

- [CLAUDE-MD-AUDIT (2026-08-04)](#claude-md-audit-2026-08-04)
- [Tech stack: the shared @cosyte/\* standard](#tech-stack-the-shared-cosyte-standard)
- [v1 scope snapshot](#v1-scope-snapshot)
- [PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT (2026-08-06)](#phi-scan-rename-blind-at-precommit-2026-08-06)
- [PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL (2026-08-06)](#phi-scan-observed-nothing-is-global-2026-08-06)
- [REFUSAL-MESSAGE-PHI-ECHO (2026-08-06)](#refusal-message-phi-echo-2026-08-06)
- [X12-DISCARD-AFTER-STRAY-LX (2026-08-06)](#x12-discard-after-stray-lx-2026-08-06)
- [X12-837-SV-UNDEFINED-DECIMAL (2026-08-07)](agent-notes/x12-837-sv-undefined-decimal.md) - closes
  the `0` left open by the three decimal sections below
- [X12-PAY-TO-FUSION (2026-08-07)](agent-notes/x12-pay-to-fusion.md) - closes the one below
- [X12-837-LOOP-RESIDUALS: the pay-to-address fusion, cut back (2026-08-07)](#x12-837-loop-residuals-the-pay-to-address-fusion-cut-back-2026-08-07)
- [X12-837-LOOP-RESIDUALS (2026-08-05)](#x12-837-loop-residuals-2026-08-05)
- [X12-277-SVC07-NOT-DECODED (2026-08-05)](#x12-277-svc07-not-decoded-2026-08-05)
- [X12-VARIANT-LOOKUP-PROTOTYPE (2026-08-05)](#x12-variant-lookup-prototype-2026-08-05)
- [X12-837-SV-SILENT-ZERO (2026-08-05)](#x12-837-sv-silent-zero-2026-08-05)
- [X12-QUANTITY-SILENT-DEFAULTS (2026-08-05)](#x12-quantity-silent-defaults-2026-08-05)
- [X12-SVC-ELEMENT-MAP-OFF-BY-ONE (2026-08-04)](#x12-svc-element-map-off-by-one-2026-08-04)
- [X12-DECIMAL-BYPASSES-THE-GUARD (2026-08-04)](#x12-decimal-bypasses-the-guard-2026-08-04)
- [X12-NUMERIC-VALUE-EMITS-EMPTY (2026-08-03)](#x12-numeric-value-emits-empty-2026-08-03)
- [PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX (2026-08-03)](#parser-testtimeout-asserts-an-idle-box-2026-08-03)
- [PHI-SCAN-SYMLINK-BLIND-ON-BOTH-ROUTES (2026-08-03)](#phi-scan-symlink-blind-on-both-routes-2026-08-03)
- [X12-CALLER-VALUE-RESIDUALS (2026-08-02)](#x12-caller-value-residuals-2026-08-02)
- [X12-BUILDER-BOUNDS (2026-08-02)](#x12-builder-bounds-2026-08-02)
- [X12-ORPHAN-REEMIT (2026-08-02)](#x12-orphan-reemit-2026-08-02)
- [X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED (2026-08-02)](#x12-segment-outside-transaction-dropped-2026-08-02)
- [PHI-WARNING-MESSAGE-LEAK (2026-07-31)](#phi-warning-message-leak-2026-07-31)
- [Phase 9: profiles and quirk attribution](#phase-9-profiles-and-quirk-attribution)
- [Phase 8f: build820 and build834](#phase-8f-build820-and-build834)
- [Phase 8e: build278Request and build278Response](#phase-8e-build278request-and-build278response)
- [Phase 8d: build271, build277, build277CA](#phase-8d-build271-build277-build277ca)
- [Phase 8c: build837P, build837I, build837D](#phase-8c-build837p-build837i-build837d)
- [Phase 8b: build835](#phase-8b-build835)
- [Phase 8: serializer and general builder](#phase-8-serializer-and-general-builder)
- [Phase 7: 278, 834, 820 readers](#phase-7-278-834-820-readers)
- [Phase 6: 271, 277, 277CA readers](#phase-6-271-277-277ca-readers)
- [Phase 5: 837 P/I/D reader](#phase-5-837-pid-reader)
- [Phase 4: 835 ERA reader](#phase-4-835-era-reader)
- [Phase 3: 999 and TA1 acknowledgments](#phase-3-999-and-ta1-acknowledgments)
- [Phase 2: syntactic core](#phase-2-syntactic-core)
- [Phase 1: envelope decoder](#phase-1-envelope-decoder)
- [Phase E: shared engineering standard](#phase-e-shared-engineering-standard)
- [PHI commit-gate armed (2026-06-28)](#phi-commit-gate-armed-2026-06-28)
- [Published scope: the 270 and 276 gap](#published-scope-the-270-and-276-gap)
- [ASSETS-P8: the attw wrapper](#assets-p8-the-attw-wrapper)

## CLAUDE-MD-AUDIT (2026-08-04)

The reasoning behind this archive and the bound on `CLAUDE.md`, relocated out of `CLAUDE.md`
itself on 2026-08-05 to pay for the `X12-837-SV-SILENT-ZERO` trap. Verbatim:

- **This file used to be 106,994 bytes.** The narrative that made it that big - the per-incident
  write-ups, the shipped-phase histories, the measurements, and every refutation that killed a
  remedy - is now in `documentation/agent-notes.md`, verbatim and unedited, under headings named for
  the item that produced them. Relocated 2026-08-04 under `CLAUDE-MD-AUDIT` (meta-repo
  `documentation/decisions/0023-doc-budgets.md`, 2026-08-04 amendment). **This file's size is bounded
  at write time by the umbrella's `.claude/hooks/doc-budget.mjs`. Never quote its number here - read
  `REPO_CLAUDE` in the hook**, because the bound is a **per-repo ratchet** set at each file's
  measured size **+2,000**, not a uniform cap. A uniform 90,000 was built first and reversed the same
  day: it would have made five repos shrink-only while workers were mid-flight in them. **The +2,000
  is load-bearing, not slack - a new TRAP must always be addable in one line; a new essay must not.**
  **The ratchet must be LOWERED as a relocation lands, or it is a rubber stamp** - lowering x12's
  entry to fit this file is part of landing this change and belongs in the umbrella, not here.

- **Nothing was deleted.** What stays there is the cursor, the rules, and every trap, each compressed
  to one imperative line. **Every `###` heading in "Traps" names the section of `agent-notes.md` that
  carries that trap's measurement, its sources, and the reasoning - open it before you act on the
  line.** These paragraphs each cost a defect or a refuted claim to learn, and several name a remedy
  that was tried, shipped, and then refuted.

- **The relocation is itself paid for, both ways.** `X12-837-SV-SILENT-ZERO` (2026-08-05) needed a
  trap block and `CLAUDE.md` stood at 52,992 against a 53,000 ratchet, so this section moved here
  first and the trap went in against the room it freed. That is the intended shape: **the entry is
  never raised to meet a new trap.** The umbrella owes the matching ratchet drop.

## Tech stack: the shared `@cosyte/*` standard

Relocated out of `CLAUDE.md` on 2026-08-06, alongside the v1 scope list below, to pay
for the `PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT` trap. **The two load-bearing halves stayed
behind in `CLAUDE.md`**: the toolchain is inherited by depending on the published
`@cosyte/*` config packages rather than by copying files, and the `attw` script is
`scripts/attw.mjs` and never the bare CLI. The meta-repo's `documentation/conventions.md`
is the source of truth for all of it; this was always a summary.

- **Language:** TypeScript (strict, full rigor set incl. `noUncheckedIndexedAccess`) via
  `@cosyte/tsconfig`. **Target ES2023**. The shared base sets `verbatimModuleSyntax: false`.
- **Build:** dual ESM + CJS + `.d.ts` via `tsup` (`@cosyte/tsup-config`); `attw` is a
  publish gate (per-condition types: `.d.ts` for `import`, `.d.cts` for `require`).
- **Node:** **>= 22** (CI matrix 22 + 24, via the reusable pipeline).
- **Package manager:** `pnpm@10`.
- **Lint/format:** **ESLint 10** + unified `typescript-eslint` (type-checked) via
  `@cosyte/eslint-config`; Prettier via `@cosyte/prettier-config`. Lint at `--max-warnings=0`.
- **Testing:** **Vitest 4** + v8 coverage (`@cosyte/vitest-config`), per-directory >= 90
  gates (armed globally; per-dir gates get listed in `vitest.config.ts` as parser code lands).
- **CI/CD:** thin callers of the reusable `cosyte/.github` workflows. Migrated in Phase E;
  the per-directory >= 90 coverage gate was first armed on `src/parser/`. See
  `#phase-e-shared-engineering-standard`.
- **Runtime deps:** **Zero.** Node stdlib only.
- **License:** MIT

## v1 scope snapshot

Relocated out of `CLAUDE.md` on 2026-08-06 to pay for the
`PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT` trap, under the standing rule that a new trap
there is paid for by relocating first. **Its imperative stayed behind in `CLAUDE.md`
and is the load-bearing half: this is the v1 SCOPE declaration, not a list of what
has SHIPPED.** The `Status` section carries the sharper form, that the 270 and 276
inquiry directions have no typed model on either side.

HIPAA healthcare transaction sets at version **005010** (with errata hooks for
`005010X279A1`, `005010X221A1`, etc.):

- **270 / 271** Eligibility Inquiry / Response
- **276 / 277** Claim Status Inquiry / Response (incl. 277CA)
- **278** Services Review (Request + Response)
- **820** Premium Payment
- **834** Benefit Enrollment & Maintenance
- **835** Healthcare Claim Payment/Advice (ERA)
- **837P / 837I / 837D** Professional / Institutional / Dental Claims
- **999** Implementation Acknowledgment (parse + build)
- **TA1** Interchange Acknowledgment (parse + build)

Non-healthcare (850/856/810/204), EDIFACT, AS2/SFTP transport, and pre-005010 are
out of v1 scope.

## PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT (2026-08-06)

- **🩺 FIVE KINDS OF STAGED CHANGE COULD LEAVE `--staged`'s LIST WITHOUT A BYTE
  OF THE INDEX CHANGING, AND ALL FIVE EXITED 0 OVER PHI.** The pre-commit hook is
  `pnpm phi-scan --staged`. It enumerated with
  `git diff --cached --raw -z --diff-filter=AMT`. Every measurement below was
  taken on this box at git 2.39.5, on a throwaway repo laid out like this one,
  against the same synthetic name-bearing `.edi` payload the symlink section
  uses, which as an ordinary add is a hit at exit 1.

  **RE-DERIVED FOR THIS REPO, NOT PORTED.** Eleven siblings closed this item
  first and each shipped a different subset of the remedy: `hl7` carries
  `--no-renames` and `AMTUB` but not `--ignore-submodules=none`,
  `terminology` carries `--no-renames` and `--ignore-submodules=none` but stops
  at `AMTU`. x12 measured all five holes open and closes all five. **Two
  residuals a sibling recorded were measured NOT to apply here in the shape they
  were written**, which is the whole argument for re-deriving: see the
  still-open list at the end.

  **THE FIVE, EACH RED BEFORE AND GREEN AFTER:**
  - **`R` (rename).** Detection is on by default and neither `AM` nor `AMT`
    returns `R`. `git mv` of an already-committed **link** into
    `test/fixtures/` staged as a single TWO-PATH record at mode `120000`;
    renaming a fixture while substituting a real-looking surname staged as a
    two-path record at mode `100644`. Both: `OK - no hits`, **exit 0**. Now
    **exit 2** (the link, by kind) and **exit 1** (the surname, on the NM1 name
    detector).
    **▶ NO SIMILARITY SCORE IS RECORDED ANYWHERE IN THIS SLICE, ON PURPOSE, AND
    THAT INCLUDES AN EXACT-MATCH ONE.** A score moves with the fixture: this
    repo's substituted-name case measured a different one from the number `hl7`
    published for its own, and the ecosystem has already paid once for a score
    ported between two repos whose fixtures differ. **A score that drifts with
    the fixture has no right value, so it is DELETED rather than corrected.**
    What is load-bearing is that the record has TWO PATHS.
    **▶ AND THE ABSOLUTE IS WHAT A DRAFT KEPT BREAKING.** Successive drafts wrote
    this sentence while recording exact-match scores in the same paragraph, in
    four artifacts at once, then wrote it again while recording the scores from
    the FIRST contradiction as evidence of it. Two refuter passes measured it.
    **The absolute is the thing worth keeping, so the digits go - including the
    digits in a sentence about digits. Do not reintroduce one to illustrate this
    rule.**
  - **`C` (copy).** Under `diff.renames=copies`, copying a PHI-bearing file from
    outside the roots INTO `test/fixtures/` staged as a genuine two-path `C`
    record and was dropped identically. **A distinct hole, not the same one:**
    nothing moves and
    the source stays put. **Copy detection only considers sources touched by the
    same diff**, so the probe must modify the source too, or git emits a plain
    `A` and the case proves nothing.
  - **A GITLINK ERASED BY `diff.ignoreSubmodules=all`.** With that in the
    caller's config the record vanished from `--raw` ENTIRELY (**exit 0**), where
    the same index without it is refused at exit 2 by the mode check that already
    existed. Nothing in the index differs between the two runs.
  - **AN UNMERGED PATH.** Returned by neither `AM` nor `AMT`. Recorded at one or
    more of stages 1/2/3 and never at stage 0, so
    `git show :<path>` fails outright (`fatal: path ... is in the index, but not
at stage 0`). **Exit 0** over an index the route could not read. Git refuses
    to commit while a path is unmerged, so this was **never a route to a
    committed leak**; what it was is a gate attesting clean over a state it never
    observed, and this command is run by hand and from scripts too.
  - **A PAIR BROKEN BY `-B`.**

  **🩺 THE `-B` MECHANISM: QUOTE THE CLASSIFICATION, NOT THE LETTER.** The claim
  that "a `B` record `AMTU` drops" is WRONG and was corrected upstream by
  `hl7#86`. Measured here: a wholly rewritten in-scope fixture under `-B` prints
  `:100644 100644 <sha> <sha> M<score>`, **one path, an `M` with a break score**,
  which `RAW_RECORD` parses happily, so a reader checking raw git concludes
  `AMTU` keeps it. **It does not: `--diff-filter` classifies a broken pair as
  `B` WHATEVER LETTER IT PRINTS.** Same index all three ways:
  `-B --diff-filter=AMTU` returns EMPTY, `--diff-filter=B` and
  `--diff-filter=AMTUB` each return the record. End to end, over a staged dashed
  SSN: the scanner with `-B` injected exits **0** on an `AMTU` filter and **1**
  on `AMTUB`.
  **▶ THE BREAK NEEDS BULK.** A short fixture with zero lines in common does NOT
  break: probes at 6 lines printed a plain `M` under every `-B` spelling tried
  (`-B`, `-B/10%`, `-B50%/10%`, `-B100%`). The pinned case uses a 200-segment
  body. **The score is not asserted and no digits are quoted.**
  **▶ `-B` IS THE PERMISSIVE HALF OF A DIRECTIVE**, which is how a false
  clearance for it survived elsewhere: a "do not add `-M`/`-C`" paragraph that
  also says `-B` is inert tells the next porter that injecting it is safe.
  **Before the broken-pair case existed, injecting `-B` reddened nothing**, so
  the old pin (`-B` is inert FOR A RENAME, which is true) could not fail.

  **THE REMEDY IS ONE RULE, NOT FIVE FIXES: STOP TRUSTING THE CALLER'S GIT
  CONFIG.** The argv is now
  `git diff --cached --raw -z --no-renames --ignore-submodules=none
--diff-filter=AMTUB`. `--no-renames` makes a two-path record UNEMITTABLE, so
  the rename and copy destinations arrive as single-path `A` and the sources as
  `D` the filter drops. **The two-field stride is therefore STRUCTURAL rather
  than conditional**, and the unparseable-record refusal stays as a backstop, not
  the guarantee. Verified under `diff.renames=true|copies|false|1` and
  `diff.renameLimit=1`: every setting yields the same single-path `A` and the
  same verdict. **`-M`, `-C` and `--find-copies-harder` each turn detection back
  on over the top and re-empty the route** (measured; pinned as a test, not left
  to a comment).

  **▶ "STRICT SUPERSET" IS REFUTED AND IS NOT WRITTEN ANYWHERE IN THIS SLICE.**
  The two enumerations are **EQUAL** whenever nothing is renamed, copied,
  unmerged, or a gitlink hidden by `diff.ignoreSubmodules`, and larger only when
  one of those is present. **State that precondition in FULL:** a draft wrote
  "when nothing is renamed or copied", which is `--no-renames`'s half of it and
  is FALSE with an unmerged path or an erased gitlink in the index (measured both
  ways). Pinned by a test that compares the old argv's bytes with the new argv's
  on an index carrying none of the four.

  **`U` IS REFUSED, NOT SCANNED, AND HAS ITS OWN MESSAGE.** An unmerged record's
  destination mode is `000000`, so routing it through `refuseUnscannable` would
  refuse it with a sentence about symbolic links and gitlinks that is FALSE for
  it. `refuseUnmerged` runs FIRST and the mode check runs over what is left.
  Asserted both ways: the unmerged refusal must not contain `a symbolic link` or
  `a git mode-000000 entry`.

  **`B` COSTS THE ENUMERATION NOTHING TODAY**, because git only breaks a pair
  when `-B` is given, so with the flag absent `AMTU` and `AMTUB` enumerate
  identically. That is why it is the remedy rather than a warning: it stops the
  flag being a silent blindfold if anyone adds it.

  **NEGATIVE CONTROLS.** Seven of the ten new cases are RED on the base scanner
  and green on head. The three that are green on both are deliberate held-in-
  place controls: the `-M`/`-C`/`--find-copies-harder` case (a claim about git,
  not about the scanner), the old-equals-new enumeration case, and an unmerged
  path OUTSIDE the route's scope, which must still NOT refuse.

  **OPEN AT THE TIME, MEASURED RATHER THAN INHERITED. Do not port a sibling's
  residual list over these. Two are SINCE CLOSED and are marked so rather than
  deleted, because the measurement is what a later reader needs:**
  - **CLOSED (2026-08-06, the section below): a scan that observed NOTHING was
    still reported clean.** With `test/fixtures` absent, or with BOTH walk roots
    absent, all-mode printed `OK - no hits` at **exit 0**
    (`PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL`);
  - **a tracked file directly under `test/` is enumerated by NEITHER route** -
    exit 0 on `--staged` and on the all-mode walk over a payload that hits as an
    ordinary fixture (`PHI-SCAN-WALK-ROOT-SCOPE`). **STILL OPEN**, and the
    section below says why the reconciliation there does not reach it;
  - **an index entry at exactly a scan root's own path matches no `--staged`
    clause**, because every clause tests a `<root>/` PREFIX. A regular blob
    staged at exactly `test/fixtures` carrying the payload: **exit 0**. **STILL
    OPEN**, same reason;
  - **CLOSED (2026-08-06, the section below). 🩺 x12's exit code for a WALK ROOT
    replaced by a regular file was 1, and it was an UNCAUGHT `ENOTDIR` from
    `readdirSync`, not a refusal.** `hl7` measured **2** and `terminology` **1**
    for their versions of this shape. **Measure it per repo; the number is not
    portable and neither is the mechanism.** It was nonzero, so it was not a
    false clean, but it was not the clean refusal the symlink work established
    either. It is now **exit 2**, named;
  - the **enumerate-then-read race** in all mode, unchanged, for the reason the
    symlink section gives: its remedy TOLERATES a failed read while this one
    NARROWS what the enumeration admits. **STILL OPEN.**

  No library code changed and no published type changed.

## PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL (2026-08-06)

### The defect: the sweep could not tell "found nothing" from "opened nothing"

`pnpm phi-scan` with no arguments is the all-mode sweep, and it is the BACKSTOP
for everything the pre-commit route misses. It walks two roots, `test/fixtures`
and `src`, collects hits, and prints `OK - no hits` at exit 0 when the hit list
is empty. **An empty hit list was produced identically by a corpus it read and
found clean and by a corpus it never opened.**

Every figure below is measured in **this** repository, on a throwaway repo laid
out like this one, against a synthetic `.edi` payload whose NM1 person name, DMG
date of birth, PER phone and `REF*SY` SSN are **hits at exit 1** when the
same bytes are actually read. **Nothing is ported.** Three shapes:

- **a MISSING root.** With both walk roots absent, and with `test/fixtures`
  alone absent, `walk()` returned at its `existsSync` guard and the sweep printed
  `OK - no hits` at **exit 0**. **This is the shape that can be true for the
  entire life of a repository:** a root that never existed makes the gate read
  clean on every run it ever makes, and no run looks wrong. `terminology` is the
  worst instance of it anywhere in the org, where `test/fixtures` had never
  existed at all;
- **an EMPTIED root.** With both roots present but their files removed from disk
  while still in the index, **exit 0** over a corpus whose committed bytes are
  hits. Also measured one file at a time: a single tracked fixture removed from
  disk, the rest of the corpus present and clean, **exit 0**;
- **a root that is NOT A DIRECTORY.** With `test/fixtures` replaced by a regular
  file carrying the payload, `readdirSync` threw an **UNCAUGHT `ENOTDIR`** and
  the process ended at **exit 1**. Same for `src`. A root that is a **FIFO** ends
  the same way (`statSync` on a FIFO does not block; only opening one does), so
  the gate does not hang. **🩺 EXIT 1 IS THIS SCANNER'S CODE FOR "HITS FOUND",**
  so a caller that branches on the code reads a crash as a finding, and what it
  gets on stderr is a Node stack trace rather than anything actionable.

### 🩺 THE NUMBER AND THE MECHANISM ARE BOTH NON-PORTABLE

`hl7` measures **2** for its version of the regular-file root and `terminology`
measures **1** by a **different** mechanism. **x12 measured 1, by an uncaught
`ENOTDIR` from `readdirSync`, and measures 2 since the remedy below.** Read all
three as measurements of three different scanners rather than as one fact about
the shape, and re-derive every one of them per repo rather than quoting this
line. The same warning applies in the other direction: `hl7` measured two ported
residuals as **not open there at all**.

### The remedy: two rules, and the second is not implied by the first

**EXISTENCE IS NOT OBSERVATION.** Refusing a MISSING root leaves the other half,
because an emptied root exists and still opens nothing; and reconciling only
leaves the first half, because a root that never existed has nothing tracked
under it to reconcile. So both ship together:

1. **`refuseUnusableRoots()`** requires each declared root in `WALK_ROOTS` to BE
   a directory, before the walk starts. `rootProblem` uses a single `statSync` in
   a try/catch rather than `existsSync`, **because `existsSync` answers the wrong
   question in both directions that matter**: it is TRUE for a regular-file root
   (which `readdirSync` then throws on) and FALSE for a dangling symlink (which
   is a missing root, not a present one). `err.code` is an engine-owned token;
   `statKind` is a closed set.
2. **`reconcileObserved()`** requires every tracked, non-`.md` file under a root
   to have been one of the files the walk actually enumerated, comparing the
   walk's output against `git ls-files -z -- test/fixtures src`.

Both refuse at **exit 2** and **name every offender**, which is the rule
`refuseUnscannable` already follows: a developer who has to re-run the gate once
per file learns to distrust it.

### 🩺 SAY "BE A DIRECTORY", NEVER "BE ENUMERABLE"

**A draft of this slice said "enumerable" and a refuter measured it FALSE.** The
count of places it said so is deliberately not recorded: it drifted between three
surfaces before anyone noticed, and this repo's rule is to delete a drifting
number rather than correct it. `refuseUnusableRoots` asks `isDirectory()`, which is a check on the
root's TYPE and not on whether the root can be read. Measured, `test/fixtures` at
mode `000` over a committed PHI payload: **uncaught `EACCES` from `readdirSync`,
exit 1, identically at base and at head** - verbatim the shape the regular-file
root used to have. An unreadable **subdirectory** under a root, and the window
between `refuseUnusableRoots` and `walk`, end the same way.

**That class is PRE-EXISTING and is DISCLOSED, not closed.** Closing it means
tolerating or classifying a failed directory read, which is the deferred
enumerate-then-read remedy pulling in the same direction. **The claim was CUT
BACK to what the code checks; the guard was NOT grown.** That is the same
discipline `X12-NUMERIC-VALUE-EMITS-EMPTY` and `X12-DECIMAL-BYPASSES-THE-GUARD`
already cost this repo.

### 🩺 A TRACKED WALK-ROOT SYMLINK: THE ROOT'S OWN INDEX ENTRY IS EXEMPT

**A root that is itself a symbolic link to a directory is STILL FOLLOWED.**
`statSync` follows, deliberately, exactly as `existsSync` and `readdirSync` do.

**The first draft broke that, and a refuter measured it.** With the link
COMMITTED, `git ls-files -- test/fixtures` returns the link's **own** path
`test/fixtures`, and the walk only ever yields `test/fixtures/<name>`, so the
reconciliation could never observe it: base **exit 1** (the documented superset
scan, hitting the target's files) became head **exit 2**. Fail-safe, but it
traded a working scan for a refusal and falsified four surfaces saying the
behaviour was unchanged.

`reconcileObserved` now **exempts an index entry at exactly a declared root's own
path**, because such an entry IS the root and not a file under it. **It opens no
clean path:** a root that is a tracked regular file, or a link to one, is refused
by `refuseUnusableRoots` before this runs. It is also the same boundary the
`--staged` route already draws, where an entry at a root's own path matches no
clause; that residual stays open.

**🔴 "IT OPENS NO CLEAN PATH" IS REFUTED. THE CLAIM IS CUT BACK; THE GUARD IS
NOT GROWN.** The sentence above is true about the ROOT ENTRY and was drafted as
though it were true about the whole tree. It is not. When a root is a tracked
link to a DIRECTORY, everything the walk reads through it lives under the
TARGET's own names, and those names are outside the
`git ls-files -- test/fixtures src` pathspec, so the index side of the
comparison is empty for **all of it** rather than for one entry. Measured at
head, `test/fixtures -> ../elsewhere` with a committed `elsewhere/violator.edi`:
present, **exit 1**; removed from disk but still in the index, `OK - no hits` at
**exit 0**, with `git ls-files -- test/fixtures src` returning only
`src/ordinary.ts` and `test/fixtures`. **That is verbatim the EMPTIED-ROOT shape
this section exists to close, alive through the exempted path**, and it is the
one shape the slice ships a dedicated control for.

It is **PRE-EXISTING** - base is exit 0 over the same tree - so it is not a
regression, and it is **disclosed, not closed**: covering it means reconciling
against a second pathspec derived from the link target, which is the same widening
decision as the `test/` scope work below. **So state the closure as "within the
declared roots, as git names them" and NEVER as a universal over any corpus.**
This repo has deleted a self-contradicting universal before (`4a5a943`); the
lesson is that a headline universal with one live counterexample is worse than a
narrower headline, because the counterexample is the shape nobody re-checks.

**🛑 THE CONTROL THAT HOLDS THIS COMMITS ITS CORPUS.** The first draft's control
called `makeRepo()` and never `git add`ed, so `git ls-files` was empty, the
reconciliation was satisfied trivially, and the case was **green by construction
of an untracked corpus** rather than because the property held. That is this
org's `dicom`-lost-four-blockers failure mode wearing a control's clothes. The
case now asserts the premise off raw git first, and it reds if the exemption is
removed.

### 🔴 A DENOMINATOR DOES NOT DETECT THIS, AND THAT REMEDY WAS REFUTED IN `ncpdp`

**A count counts the roots that DID exist.** An emptied root contributes zero and
a total still looks like a total, so `71` against a healthy `122` reads fine. The
only thing that separates "read it and found nothing" from "never opened it" is
naming the corpus from a source OUTSIDE the walk and checking the walk against
it. The index is that source. **This is why the second rule reads `git ls-files`
and not a threshold.**

### 🩺 THE IGNORE RULE, STATED EXACTLY, BECAUSE ITS SHORT FORM IS FALSE

The obvious sentence is "the walk skips gitignored paths, so the reconciliation
does too". **Measured here, that is not what either side does for a TRACKED
path.** `git check-ignore` consults the index by default and answers
**NOT-ignored** for a tracked path even when a `.gitignore` rule names it; only
`--no-index` says otherwise, and this scanner does not pass it. So:

- the walk **SCANS** a tracked-and-ignored file, and the reconciliation
  **REFUSES** when one is missing from disk. That pair is consistent, and **both
  halves are asserted in one test** because the consistency is the claim;
- what the ignore rule really exempts is the **UNTRACKED** ignored file, and such
  a path is never in `git ls-files` at all, so it leaves the expected set on that
  ground rather than through the filter.

**This was found by a negative control, not by reading the code.** The control
was written asserting the short form, went red, and the code turned out to be
right and the claim wrong.

### The one behaviour change outside a git checkout

Where `git ls-files` cannot answer (not a git repository), the sweep now
**refuses at exit 2** where it previously reported clean. **"git could not tell
me" and "git told me there is nothing" are the two answers this whole check
exists to keep apart**, so the first is never allowed to render as the second.
`scripts/` is not in `package.json`'s `files`, so the scanner is not in the
published tarball and every caller is inside a checkout of this repository.

### 🩺 WHY THE `test/` SCOPE RESIDUAL IS NOT CLOSED HERE, AND WHAT CLOSING IT COSTS

`PHI-SCAN-WALK-ROOT-SCOPE` is **still open** and was **re-measured**, not
inherited: a tracked file directly under `test/` is **exit 0 on both routes**,
and an index entry at exactly a scan root's own path is **exit 0 on `--staged`**.

**IT READS AS THOUGH THE RECONCILIATION SHOULD HAVE CLOSED IT, AND IT DOES NOT.**
The reconciliation compares the walk against the index **within the declared
scope**. A path nothing declares in scope is absent from **both** sides of the
comparison, so the check is silent on it. Widening the scope is the remedy, and
it is a slice of its own for three reasons, each measured:

1. **🛑 ENUMERATING THE FILES BUYS THE `scanCommonShapes` FLOOR AND NOTHING
   ELSE.** The recognisers assume **the file IS the document**: `looksLikeX12`
   requires the text to start with `ISA`, and the files under `test/` are `.ts`
   sources whose fixtures are **string literals**. So NM1, DMG, PER and the
   service-date cutoff never run on them, and only `scanCommonShapes` does.

   **🔴 THAT FLOOR IS THREE DETECTORS AND A DRAFT CALLED IT TWO.** Four surfaces
   of this slice said "the dashed-SSN and email floor" and a refuter measured it
   false: `REF*SY` matches `/REF.SY.([0-9]{9})\b/` over raw text, is **not**
   segment-aware, and fires on a bare string literal exactly as the other two do.
   Measured at head, a `.ts` file in a scanned root containing
   `"REF*SY*<nine digits>~"` as an array element: **exit 1**. The wording
   understated the deferred `test/` scope by **precisely the shape a dashed-SSN
   regex cannot see** - an UNDASHED nine-digit SSN - which is the worst direction
   for the disclosure to be wrong in. The census two paragraphs down contained the
   counterexample the whole time: the 8 shapes are 6 dashed-SSN, **1 `REF*SY`**
   and 1 email. **Derive the floor from `scanCommonShapes`, never from prose,
   this sentence included.** **Widening the walk roots and widening the recogniser
   are TWO SIDES, each in addition to the other, never instead of it.** `ncpdp`
   shipped both together for this reason; `mllp` walks `test/` but **excludes
   `.ts`**, which would have closed **none** of `deid`'s 38 files. This cost
   `deid` three refutations.

2. **there is no exclusion surface for the scanner's own corpus.** Measured on
   this package at this commit, a measurement and not a standing figure: the
   current recogniser over the 78 tracked non-fixture files under `test/` finds
   **8 shapes in exactly one file**,
   `test/scripts/phi-scan.test.ts`, which is where this gate's own violator
   payloads live. A whole-file override cannot be wired into `pnpm phi-scan`,
   because a bare `--allow-fixture` **seeds the positional path set and selects
   `paths` mode** (`scanPaths = paths.length > 0 ? paths : [...allowFixtures]`),
   so the gate would scan that one file and nothing else.
3. **the symlink section's standing warning applies:** x12 is out of reach of the
   enumerate-then-read race today only by a **scope accident** of which walk
   roots it has, and **any widening reintroduces it verbatim**. That deferred
   slice would have to be taken with it or disclosed again.

**This change does NOT change that race's reachability:** the reconciliation runs
on the ENUMERATION, before any target is read, and it neither widens a root nor
reads a file.

### The census, derived by running head's suite against base

**17 new cases. 9 RED on the base scanner, 8 green on both.** Never arithmetic:
this is head's test file run against `b07c367`'s `scripts/phi-scan.ts`, re-run
after each round of refutation remedies landed. It was 15 / 8 / 7 before the
second refuter pass added the unmerged-dedup case and the symlinked-root
disclosure; **re-derive it rather than quoting either figure.**

The 8 green-on-both are deliberate held-in-place controls: the symlinked-root
case (the documented superset direction), the symlinked-root DISCLOSURE (an
emptied link target still reading clean, which is green on both because it is
pre-existing and is here to flip when the scope work lands), a fully-opened
corpus still reporting its hits, a healthy corpus still clean, an untracked extra
file, a staged deletion, the `.md` exemption, and an untracked gitignored file.
**Green on both trees is NOT the same as inert:** the symlinked-root case reds
against head with the walk-root exemption removed, which is what makes it a
control rather than a decoration.

**Each rule is independently load-bearing, measured one at a time.** Dropping
only `refuseUnusableRoots()` reds **4**; dropping only `reconcileObserved()` reds
**5**; the two sets are **disjoint** and sum to the 9. Dropping ONLY
`--deduplicate` from the `git ls-files` argv reds exactly **1**, its own case, so
that flag is pinned separately from the rule that uses it. Note that the
missing-root case reds under the first drop on its **message**, not its exit
code, because the reconciliation catches that particular shape too when something
IS tracked under the root. **The case that is a genuine false clean without rule
1 is the NEVER-EXISTED root**, which has nothing tracked under it, and that is
why the two rules ship together rather than one.

**Every case carries an identifier and a non-vacuity assertion.** The
unopened-file cases assert **exit 1 with the payload present** before removing
it, so a green is never green by construction. The refusal messages are asserted
to contain **no** PHI token, and the regular-file-root case additionally asserts
the stderr contains neither `ENOTDIR` nor `readdirSync`, so a crash cannot pass
as a refusal.

No library code changed and no published type changed.

## REFUSAL-MESSAGE-PHI-ECHO (2026-08-06)

### The defect: a stated PHI guarantee that was true on one path and false on another

Every domain builder documents, on its own error codes and in this repo's `CLAUDE.md`, that its
refusal message carries **structural locators, counts and X12 control codes only, and never a
`claimId` (patient-account number), member id, member name, trace, or diagnosis code**.

That is true of the refusal TEMPLATES. Enumerated in the source at `4a5a943`, the 24 sites that
render a caller value through `renderCallerValue` / `renderCallerJson` name: nine over-long control
numbers (one per emitting module), `buildTA1`'s TA1-05 note code, `build834`'s INS-03 and HD-01
maintenance types, `build837`'s service-line variant, `buildInterchange`'s transaction-set id, and
`build999`'s AK9 counts and acknowledged ST-02s. **Not one names an identifier.**

It was **false underneath them.** The four shared caller guards each described a wrong-typed value by
rendering the primitive through `renderCallerValue` - bounded to 90 characters, and **not redacted**:

- `src/builder/caller-string.ts` `describeCallerValue`, on every value routed through a builder's
  `esc`, which is every string element of every builder;
- `src/builder/caller-segment.ts` `describeSegmentValue`, on every element of every segment joined;
- `src/builder/caller-decimal.ts` `describeCallerDecimal`, on every `X12Decimal` slot;
- `src/builder/caller-array.ts` `describeShape`, primitive arm, on every guarded list.

### Measured, with a payload that actually carries an identifier

Run against `dist/` built from `4a5a943`, with the shape `@cosyte/cli` produces from `JSON.parse`:

```text
build835({ claims: [{ patientControlNumber: 900412345678, ... }] })
  -> build835: every element value must be a string, but received a number ("900412345678"). ...
     code = X12_835_BUILD_INVALID_SPEC

build834({ members: [{ member: { idCode: 700998877, ... } }] })
  -> build834: every element value must be a string, but received a number ("700998877"). ...
     code = X12_834_BUILD_INVALID_SPEC
```

**A vacuity note that is the whole reason the payload looks like this.** The sibling `dicom` repo has
lost this class of blocker four times to fixtures that carried no identifier, so the test proved
nothing. Every case in `test/builder-refusal-phi.test.ts` therefore asserts four things: that a
refusal happened, that it is typed with a string `code`, that it still names the offending type, and
only then that the identifier is absent. The identifiers were also chosen against the templates'
own fixed text: the decimal guard's message names `1e21` and `0.30000000000000004` outright, so a
payload of `1` or `0.1 + 0.2` makes the absence assertion meaningless. A first draft of the array
case used `review.dates` on the 278 and passed at BASE, for the wrong reason - that slot is an
optional leaf read with `?? []`, outside `requireCallerArray`'s scope, so the string was iterated
character by character and a different guard refused first. It uses `member.healthCoverages` now,
which `requireCallerArray` really does guard.

### The shipped disclosure named the wrong guard

`CLAUDE.md` said the exception was **`requireCallerSegment`**, and quoted
`build835: CLP-01 must be a string, but received a number (...)`. CLP-01 routes through `esc`, so
**`requireCallerString` refuses first**, and its message names only the builder, not the slot. The
library never emitted the quoted string for that case. The echo was real on both guards, and on the
other two as well; the disclosure was measured against the prose rather than the source.

### The remedy, and why it is "make it true" rather than "reword it"

A guarantee that is true on one path and false on another is not a guarantee. The two honest options
were to make it true or to stop stating it, and stopping would have left a published healthcare
package with strictly less to promise about a `claimId` in an error message. So: **no caller guard
echoes what a caller put in a document ELEMENT.** The string, segment and decimal guards report the
TYPE, and so does the array guard's primitive arm; the segment guard keeps its spec-shaped slot
locator beside it. A guard standing on every element of every builder cannot know whether the
primitive in front of it is a control number or a patient identifier, which is exactly why it may not
echo one.

**Pass 1 refuted the FIRST draft of that sentence and was right.** It read "no SLOT-GENERIC caller
guard echoes a value", published on six surfaces, and `describeShape`'s two OBJECT arms falsify it:
`{ length: "700998877" }` reports `an array-like object with length "700998877"`, and a
`Symbol.toStringTag` of `"900412345678"` reports `a non-array "[object 900412345678]"` - caller text,
bounded to 90, not redacted, from a guard the same sentence says cannot know its slot. The echo
BEHAVIOUR is `PRE-EXISTING` and byte-identical at `4a5a943`; the ABSOLUTE was new, so it was an
introduced overclaim, and the remedy was to correct the sentence rather than grow the guard. **That
is the fifth time in this lineage that the sentence written to fix a claim was itself the finding.**
The line that holds is element contents versus forged-object metadata.

**The decimal guard was the closest call and went with its siblings.** The argument for keeping it:
`X12-DECIMAL-BYPASSES-THE-GUARD` exists because a raw `number` renders as `0.30000000000000004` /
`1e+21` / `NaN` on the wire, and showing the value looked like the fastest diagnosis. It went anyway,
because (1) the message's own fixed text already names those three renderings, so the diagnosis is
intact and the remedy (`X12Decimal.fromString()` at the call site) is identical either way, and (2)
an `X12Decimal` slot IS an element slot, so it is inside the line above. **"An `X12Decimal` slot
holds no identifier today" was the tempting argument and is the wrong KIND of argument** - a fact
about today's slots rather than a property of the guard - and it is also what pass 1 caught the
first draft applying inconsistently: refused here, accepted for `describeShape`'s `length`.

**The segment guard's slot locator is bounded by GRAMMAR now, not by length.** `parts[0]` is
caller-supplied in `buildInterchange`, which takes `[segmentId, ...elements]` wholesale, so it was the
one caller string that could still reach a message. It is admitted only when it matches
`/^[A-Z][A-Z0-9]{1,2}$/`, which caps it at three `[A-Z0-9]` and cannot carry an identifier; anything
else degrades to `element N`. A `renderCallerValue` bound was the draft and redacted nothing: 90
characters of free text in element 0 is 90 characters of whatever the caller parked there. Mirrors
what `PHI-WARNING-MESSAGE-LEAK` did to `X12Segment.id` on the parse side.

### What did NOT change, because whatever points at a deleted claim's place is a new claim

- **The templates still render the values they name by field**, still bounded, still not escaped,
  still not redacted. `README.md`, `KNOWN-LIMITATIONS.md` and `troubleshooting.md` all keep the
  "robustness and log hygiene, not redaction" framing, which was always true and still is.
- `renderCallerValue`, `BUILD_REFUSAL_VALUE_MAX_LENGTH` and `BUILD_REFUSAL_VALUE_MAX_RENDERED` are
  unchanged and still exported. `X12ParseError.snippet` on the four Tier-3 fatals is unchanged.
- `caller-array.ts` keeps the `length` and class-tag arms, bounded. They describe the SHAPE a caller
  forged rather than the content of a document element, and a forged `length` is the input the guard
  exists to stop.
- The `esc` refusal still names the BUILDER and not the slot, and `escDec` likewise. That limit was
  already recorded; this slice made it sharper rather than smaller, because the echoed value used to
  stand in for the slot. Threading a locator through every unary `esc` invocation is the trade
  `caller-string.ts` rejects and this slice did not reopen it. **Only the SEGMENT guard names a slot,
  and any surface that says "the type and the slot" unqualified is wrong** - pass 1 measured four
  consumer-facing surfaces saying exactly that, one of them illustrating it with a slot-less message.

### The 278's HL-03, folded into the same slice

`Build278ReviewSpec.levelCode` is the **one** caller-supplied HL-03 in the library. Every other level
on every builder's spine is a module constant selected by tree position. It is typed `"EV" | "SS"`,
defaulted to `EV`, and routed through `esc` - which type-checks for `string` and escapes delimiters
and **never constrained the value**.

**The failure mode, stated as precisely as it deserves and no more.** `get-278.ts` omits `EV` and `SS`
from `EXPECTED_PARENT_LEVEL` deliberately (they attach under a subscriber OR a dependent and
clearinghouses vary), so an out-of-enum HL-03 falls to the walker's `else` arm, `context` becomes
`"other"`, and the review loop never opens. Measured on bytes, honest document vs the same document
with `*EV*` replaced by `*ZZ*`:

```text
EV : reviews = 1, decision.actionCode = "A1", warnings = []
ZZ : reviews = 0, decision           = absent, warnings = []
     the HCR segment is still on tx.segments; the HL still reads levelCode "ZZ"
```

**It FAILS TO DECODE. It does not decode WRONGLY.** No certification decision comes back as a
different decision, nothing is mis-read, and the bytes are retained. That is the better of the two
failure modes and it should never be written up as the worse one. It is still not a document to emit,
because HCR-01 is a safety-critical field this library places verbatim and never infers, so the
builder refuses - the same stance `build834` takes on a maintenance type it cannot name. Reuses
`X12_278_BUILD_INVALID_SPEC`; no registry or error code was added.

**The guard resolves through the emitter's own `?? DEFAULT_REVIEW_LEVEL`, not `!== undefined`.** That
is not a style point: `null` is what a `JSON.parse`d spec carries for an absent optional, `??` answers
it as absent, and a guard testing `undefined` alone refused a spec the emitter would have defaulted to
`EV` and built cleanly. That is `X12-CALLER-VALUE-RESIDUALS`' recorded regression running the other
way, and this slice's own test caught it before it shipped. Deriving the guard from the same
expression the emitter uses is what keeps the two from disagreeing.

**No caller who was getting the review into the document is broken.** An out-of-enum level never
produced a decodable review, so there is no value that worked and stops working, and a TypeScript
caller cannot reach the arm at all. An omitted or `null` `levelCode` still defaults to `EV`.

**The read side is untouched and its tolerance still matters.** A payer document carrying an
out-of-enum review level still decodes exactly as it did, silently, and closing that needs a new
Tier-2 registry code. Deferred, and named here rather than implied away.

### Red census, derived by running head's suite against a base checkout of `src/`

**25 of the changed and new cases red at base**, across six files. The greens are the honest controls
and are the point of running it: `build835`'s "the same spec builds with a string", the 278's
"leaves EV, SS and an ABSENT level exactly as they were", the byte-level measurement of the decode
gap (which describes base behaviour and must NOT move), and both "the caller values a builder
TEMPLATE names by field are still shown" cases. In `test/builder-refusal-phi.test.ts` alone the split
is 7 red / 3 green.

### Counts that moved and are pinned

`test/builder-refusal-bounds.test.ts` pins the throw-site and caller-value censuses so they cannot
drift. Both moved by exactly one, from the 278 guard's own `throw`: **85 -> 86 throw sites**, and
**23 -> 24 caller-value sites / 28 -> 29 holes**. The four shared guards never appeared in that census
and still do not - they refuse through a callback rather than at a `throw` site the scan can see,
which is a limit the gate has always recorded and is exactly where the hole was.
`test/builder-refusal-phi.test.ts` is the behavioural answer to that limit: it drives the published
entry points, so it observes what a consumer's `catch` block observes.

### A release-body trap that cost a rewrite, and is not trapped anywhere

`.github/scripts/release-notes.mjs` strips an item identifier from a changeset only when it starts
with a known `PROJECT_PREFIXES` entry. `REFUSAL-MESSAGE-PHI-ECHO` does not, so the first draft of both
changesets rendered `(REFUSAL-MESSAGE-PHI-ECHO)` **straight into the public GitHub release body**,
while the `X12-*` ones beside them were translated away. The gate passed it, because the gate enforces
the known banned set and its own header says no rule could catch an unregistered prefix. Caught by
running the real renderer against a simulated version commit before committing; the identifier was
removed from the changeset text. **Anything named with a prefix this ecosystem has not registered has
to be kept out of the changeset by hand.**

## X12-DISCARD-AFTER-STRAY-LX (2026-08-06)

The `#72` trade's owed half. `X12-837-LOOP-RESIDUALS` closed both of its original residuals
by making an `LX` with no `CLM` open close the entity loop it interrupted, which stopped a
line-item control number, a street address and a contact surfacing on a LATER claim's payer.
The cost, disclosed rather than argued away, was that where the `LX` was stray INSIDE an
entity loop, that entity's own conformant `N3` / `N4` / `REF` / `PER` are discarded - and
through `d3b36d9` they were discarded in SILENCE. Six surfaces promised a warning. This is it.

- **THE CODE: `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, the 27th Tier-2 warning, raised at
  the DISCARDED SEGMENT and not at the `LX`.** Three reasons the anchor is the segment. The
  loss is **per segment**, so two `N3`s are two losses and one warning at the `LX` could not
  say how many; the segment is what a consumer resolves back through `tx.segments` to read the
  bytes; and the `LX` already carries `X12_837_SERVICE_LINE_DROPPED`, which reports the
  **service line** and names no entity segment. **That last point is the one a draft of `#72`
  got wrong** - "the loss is already reported at that `LX`" was published in four places and
  measured false. The two codes now sit on one channel reporting different things about the
  same stretch of document, and a case pins the whole array in document order:
  `["LX", "N3", "N4", "REF", "PER"]`, resolved through `tx.segments` rather than by literal.

- **🩺 THE BOUND IS THE DELIVERABLE, NOT THE FIRING. This is NOT a general "entity segment
  reached no party" code and must never be restated as one.** A general one would fire on
  shapes that were silent at `0.0.10` and at `d3b36d9`, which is a guard change nobody has
  decided. The scope is a flag set only on the no-`CLM` `LX` route AND only when an entity
  loop was actually open there, cleared beside every other assignment to `activeEntity`.
  Silences it deliberately does not break, each a committed control: no entity loop open at
  the stray `LX` at all; an `NM1` this walker cannot route (it leaves `activeEntity`
  undefined, and the `N3` after it was silent at base); an intervening `HL`; an intervening
  `CLM`; the OTHER dropped-`LX` route, where a claim IS open and the entity loop was never
  the thing lost; and ordinary attachment with no `LX` in play.

- **THE THREE NON-ENTITY KINDS ARE NOT REPORTED, AND THAT IS THE STATED BOUND.** All seven of
  `DTP` / `AMT` / `NTE` / `REF` / `N3` / `N4` / `PER` are discarded on the no-claim route, but
  only the four entity kinds ever attach to a party; the `DTP` / `AMT` / `NTE` were discarded
  at `0.0.10` too. Reporting them would be a different claim about a different loss, and
  `X12_837_SERVICE_LINE_DROPPED` at the `LX` is what reports that loop.

- **NOTHING ABOUT THE MODEL MOVED. Never write that the discard was fixed.** The segments are
  still discarded, still verbatim on `tx.segments`, and the residual test in
  `transactions-claim-837-loop-residuals.test.ts` that ASSERTS the loss is still green: it
  gained the new codes in its whole-array channel assertion and kept every model assertion.
  Which party a segment after a **stray** `LX` belongs to is still not derivable from the TR3s
  in either direction, so the reader still refuses to attribute it.

- **DO NOT CITE `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED`, EVEN NOW THAT BOTH WARN.** That
  item warns AND **retains on the model** through one `recordOrphan` chokepoint, so its warning
  and its retained segment can never disagree; nothing here puts the discarded segment on the
  typed model, and `tx.segments` retention is unconditional, identical at base, and contributed
  by no part of either change. A `#72` draft cited it as licensing the silence and a pass-2
  refuter refuted that; it is no better as a precedent for the warning. The direction is chosen
  on this library's own invariant, which is that a mis-attribution puts a value on an object
  the sender never put it on and is indistinguishable from real data.

- **THE RED/GREEN CENSUS, RUN AND NOT DERIVED, AND RE-RUN AFTER THE PASS-1 REMEDY ADDED A CASE -
  WHICH IS THE ONLY REASON IT IS RIGHT.** Head's suite against a base checkout of `src/`
  (replaced, not overlaid), across the five files this slice touches: **17 red of 105.** Per
  file: the new suite **7 of 17**, `transactions-claim-837-loop-residuals` **6 of 19**,
  `transactions-claim-837-variant-lookup` **1 of 57**, `warning-codes.snapshot` **2 of 5**,
  `phi-diagnostic-surface` **1 of 7**. **The ten green cases in the new suite are the point of
  writing it that way** - they are the controls, and a control that goes red at base would be
  reporting a silence this slice broke. Head whole-suite: **1,448 passed across 69 files.** The
  pre-remedy figures (16 of 104, the new suite 6 of 16, 1,447 passed) are superseded and are
  recorded here only because this lineage's rule is that a corrected claim is a NEW claim.

- **A RED NEGATIVE CONTROL PER REACHABLE GUARD, WHOLE-SUITE.** Making the reporter never fire
  reds **15**; putting `=` back in place of `||=` at the `LX` reds **1** (the pass-1 case, and
  only it); latching the flag `true` there reds **1**; deleting the clear in the `HL` case reds
  **1**, in the `NM1` case **3**, in the `CLM` case **1**. **Two clears have NO control and the
  reason is stated rather than hidden:** the `SBR` Loop 2320 branch and the `LX` tail both sit past a `currentClaim !==
undefined` check, and the flag can only hold where no claim is open, so neither can run while
  it holds. They are kept beside their assignments so the invariant does not depend on that
  coincidence.

- **THE INVARIANT THE MESSAGE RESTS ON, WRITTEN DOWN BECAUSE NOTHING ENFORCES IT.** The
  reporter tests the flag alone. That is sound only because the flag is cleared next to EVERY
  other assignment to `activeEntity`, so while it holds, `activeEntity` is undefined and the
  attach that just ran was a no-op. **A new `activeEntity` assignment site that does not clear
  it would make the message false** - the segment would have attached, and the warning would
  say it reached no party. A defensive `activeEntity !== undefined` clause was written and then
  removed: it is unreachable today, so it would have shipped as a branch no test could red,
  which this repo's own rule forbids. The invariant is the comment beside the flag and the
  clears beside the assignments.

- **PASS 1 REFUTED, AND THE FINDING WAS A GUARD DEFECT RATHER THAN A CLAIM DEFECT - THE FIRST IN
  THIS LINEAGE.** The flag was set with `=`, not `||=`. A SECOND stray `LX` finds `activeEntity`
  already `undefined` (route 1 nulled it on the first), so the assignment CLEARED a scope still in
  force and re-silenced the exact loss this code exists to name. Measured by the refuter on
  `NM1*PR ~ LX ~ LX ~ N3 ~ REF ~ PER`: released `0.0.10` keeps the payer's address, its `2U` id and
  its contact; base `d3b36d9` and the pre-remedy head both lose all three, and the pre-remedy head
  reported none of it - while six surfaces say the scope ends only where a loop is OPENED, and a
  stray `LX` opens none. Nothing pinned it: the whole suite stayed green under the remedy mutation.
  Fixed with `||=` plus its own red control, which is the only case that reds when the token is put
  back. **The general lesson: a flag whose SET site can run twice needs the second run tested, not
  reasoned about.**

- **PASS 1's SECOND FINDING WAS A CLAIM DEFECT, AND THE REMEDY IS A CUT-BACK RATHER THAN A NARROWER
  GUARD.** The guard also fires where nothing this library's own reset lost: `attachContact` has no
  `patient` / `payToAddress` / `payToPlan` route at all, so a `PER` in Loop 2000C reached the model
  on no release. The direction is fail-safe (the "reached no party" half is true on every route it
  fires), so the guard was left alone and the **claim** was narrowed instead: the registry message,
  `KNOWN-LIMITATIONS.md` and `docs-content/troubleshooting.md` now say it reports that a segment
  reached NO party and **not** that it would have reached one, and the "every release through
  `0.0.10` attached them" universal was cut back to "wherever this reader surfaces that segment kind
  on that party at all". **Do not restore the universal.**

- **PASS 2 NOT REFUTED, AND ITS ONE `INTRODUCED` FINDING WAS THE OTHER HALF OF THE SAME CLAIM.**
  The pass-1 remedy narrowed "every release through `0.0.10` attached them" and left its twin
  standing, the SHIPPED WARNING MESSAGE among them: "one arriving after a later
  `NM1` attaches to that party normally". Measured false by pass 2 on a fully surfaced party - a
  `PER` after `NM1*QC` in Loop 2000C gives `patient.contacts: []` with an empty channel, and the
  same holds for a pay-to address - for the SAME root cause as finding 2, which is that
  `attachContact` and `attachReference` have no route for several `ActiveEntity` kinds. Deleted
  rather than reworded a second time: the scope statement now says the later
  party is outside this code's scope and its trailing segments are silent, and says nothing about
  whether they attach. **NO COUNT OF SURFACES IS PUBLISHED HERE.** The pass-2 remedy published one,
  and pass 3 measured it wrong by finding one more - which is this repo's standing census rule
  (`X12-NUMERIC-VALUE-EMITS-EMPTY`) arriving in a refutation record rather than in a package doc.
  Sweep by grepping the phrase; do not trust a number.

- **PASS 3 REFUTED, ON CLAIM WIDTH ONLY, WHICH IS THE SHAPE ADR 0016's FOUR-PASS RAISE NAMES.**
  The guard was attacked end to end and held: every **other** `activeEntity` assignment site is
  covered by a clear - say OTHER, because the one at `:796` sits under the SET at `:795` and adding
  a clear beside it would silence the whole feature - the `REF` case cannot reach its other two
  routes while the flag holds (both need a `CLM`, which clears it), and the fired warning is never
  false because all four `attach*` helpers return early on `entity === undefined`. Three prose
  findings, all in one direction:
  - **The `X12_837_SERVICE_LINE_DROPPED` row of `docs-content/troubleshooting.md` dropped the
    precondition.** It said each `N3` / `N4` / `PER` / `REF` between that `LX` and the next `NM1`
    raises the new code. The guard is `entityLoopClosedByStrayLx ||= activeEntity !== undefined`,
    so with NO entity loop open at the `LX` nothing is raised, and an intervening `HL` ends the
    scope before the next `NM1` does. **Both are committed fixtures in this slice's own suite**, so
    the row was refuted by the tests shipping beside it. It taught the inverse inference the rest
    of the slice exists to forbid - no warning therefore no loss - which is
    `X12-QUANTITY-SILENT-DEFAULTS`'s "never invert it" in a second reader. The row now states the
    precondition and points at the code's own row for the bound instead of restating it.
  - **The pass-2 sweep missed that same row**, which still carried "its own trailing segments do
    attach". One file, two rows, one edited and one not.
  - **`docs-content/cookbook.md` was never in the pass-2 sweep at all** and still carried the
    counterfactual ("rather than attaching to the one named before it"), the exact claim pass 1
    cut back everywhere else.
    **A UNIVERSAL IN THE PROSE WAS WRONG ON ALL FOUR PASSES. THE CODE WAS NOT: pass 1 found a GUARD
    defect** (`=` for `||=`), and writing "the code graded correct every pass" over that is how a
    lineage talks itself into believing its gate found nothing. ADR 0016's four-pass raise rests on
    slices "refused on claim-width, none on behaviour", so a record that overstates the prose share
    feeds that evidence base a false point. The lesson has stopped being "write the scoped form
    first" and is now **sweep every surface for the phrase before claiming a claim was deleted** -
    three separate passes each found one more copy of the same sentence, in a file the pass before it
    had open.

- **PASS 4 NOT REFUTED, ON THE REMEDY DIFF ONLY, AND IT IS THE CAP.** ADR 0016's 2026-08-02
  amendment raised the ceiling to four for exactly this shape: a slice refused on claim width, whose
  last prose fix would otherwise ship ungraded. It graded `2e80705..865eb3d` and nothing else. Four
  minors, all prose, all fixed here: the cookbook's terminator had been weakened to "opens one"
  ("one" resolves to _party_, and no `HL` or `CLM` opens a party); the pass-3 record dropped the
  word OTHER from "every other `activeEntity` assignment site is covered by a clear", which as
  written invites a maintainer to add a clear at `:796` and silence the feature; the same record
  claimed "the code graded correct every pass" over pass 1's guard defect; and the troubleshooting
  row grew a fresh absolute ("the only place to read it from"). **There is no pass 5.**

- **🩺 PASS 4's ONE MAJOR IS `PRE-EXISTING` AND IS `#72`'s, NOT THIS SLICE'S: `KNOWN-LIMITATIONS.md`
  CONTRADICTS ITSELF ABOUT THIS CONSTRUCT, ~90 LINES APART.** Line 150 still carries a fourth copy
  of the universal pass 2 measured false - "A `NM1` arriving AFTER that `LX` names a party normally,
  and its own trailing segments attach" - while line 244, which this slice wrote, says the opposite
  and is the true one. Byte-identical at `d3b36d9` and untouched by any commit here (`git log -S`
  attributes it to `d3b36d9`), so amendment B restriction 2 keeps it out of this slice: **filed, not
  fixed.** It is not `STOP-THE-LINE` (no value is mis-read, the bytes stay on `tx.segments`, and the
  correct form is on `src/parser/warnings.ts`, `CHANGELOG.md` and troubleshooting row 70), and
  `KNOWN-LIMITATIONS.md` is not in `package.json`'s `files`, so it is not in the tarball - but it IS
  public on GitHub and the shipped warning message points readers at it. **Fix it in its own item;
  the fix is to DELETE the parenthetical, not to reword it a fourth time.**
  **▶ CLOSED** by "The documentation residual, closed (2026-08-06)" under `X12-837-LOOP-RESIDUALS`,
  which deleted it, found three more copies of the same universal (one of them in a pending
  changeset, so it would have shipped into the release body), and put `KNOWN-LIMITATIONS.md` in the
  tarball. **The "not in `files`" half of this bullet is now false and is left standing as the
  record of what was measured on 2026-08-06, not as a current fact.**

- **PHI: the new code has a slot in the table, and it is name-bearing.**
  `test/_helpers/phi-slots.ts` gained a slot planting the marker in an `N3` street address
  inside a payer loop an inserted `LX` then closes, so the marker rides in a segment the
  library refuses to place - which is exactly the segment a "helpful" diagnostic would quote
  back. The factory takes a position and nothing else, and the suite's own non-vacuity check is
  that the expected code really is on the channel for the planted document.

## X12-837-LOOP-RESIDUALS: the pay-to-address fusion, cut back (2026-08-07)

**Filed by the slice that finished the wording sweep and did NOT fix this. Read it before the next
attempt, which should not rediscover any of it.** Two remedies were built and both were refuted, so
per ADR 0016 the unit was cut back rather than given a third. The wording half shipped alone.

**▶ CLOSED** by [`agent-notes/x12-pay-to-fusion.md`](agent-notes/x12-pay-to-fusion.md). Nothing below
became false and nothing here was edited: the two refuted remedies are the record this section
carries.

- **THE DEFECT, MEASURED AT `63a70bc`, WHICH IS PUBLISHED `0.0.11`.** `NM1*87` names the pay-to
  address with no entity object to hold it: `payToAddress` is a bare `X12ClaimAddress` accumulator,
  cleared only at the next Loop 2000A `HL`. A route that assigns a fresh entity leaves the trailing
  `N3` / `N4` a `current.address` of `undefined` to write onto, so their write replaces; the two
  `payToAddress` arms instead write onto whatever the previous `NM1*87` left, `withLines` appending
  and `mergeAddress` falling back. Two `NM1*87`s in one Loop 2000A, each with an `N3` and an `N4`,
  read back
  `{"lines":["1 FIRST PAY TO WAY","2 SECOND PAY TO WAY"],"city":"SHELBYVILLE","state":"IL",`
  `"postalCode":"62565","countryCode":"US"}` - a street from each of two addresses, and a
  `countryCode` off the FIRST `N4` on an address whose own `N4` names no country. `warnings: []`.
  That address is one no sender sent.

- **🩺 REMEDY 1, REFUTED: clear `payToAddress` at the `NM1*87`.** It fixes the fusion and erases the
  address a repeat carrying NO `N3` / `N4` of its own did state, silently. Base kept it.

- **🩺 REMEDY 2, REFUTED INSIDE ITS OWN REMEDY DIFF: replace at the first write after the `NM1*87`,
  via a flag.** Same erasure on a narrower input, because the flag is consumed by a write whether or
  not that write carries a value: `N3~`, `N3**~`, `N4~` and `N4****~` after a repeat each replaced a
  stated address with `{ lines: [] }`, silently. It also falsified the remedy's own shipped
  invariant, "the accumulator moves only when a segment gives it a value".

- **🩺 THE CONSTRAINT BOTH REMEDIES MISSED, AND WHERE THE NEXT ONE STARTS: AN EMPTIED SLOT IS NOT A
  NEUTRAL ABSENCE, BECAUSE THE EMIT SIDE READS IT.** `build837P/I/D` gates Loop 2010AB on
  `payToAddress !== undefined`, and `emitAddress` writes `N3` only for a non-empty `lines` and `N4`
  only for a defined field. So an emptied slot re-emits as **no pay-to loop at all**, a positive
  statement about where the payment goes, and a half-emptied one re-emits a bare `NM1*87` with
  neither `N3` nor `N4`, which is non-conformant where the loop is present. **The emit side is in
  scope for this fix from the start.** Measured through `build837P` + `serializeX12`.

- **DO NOT RESTATE THIS AS THE ENTITY PARTIES' RULE.** A repeated `NM1*PR` with no `N3` leaves a
  payer object whose `address` is `undefined` - the party is on the model and only its address is
  unknown. The pay-to slot has no object, so on it "address unknown" and "no pay-to loop" are the
  same value. A draft's disclosure claimed the symmetry and was refuted on it.

- **AND DO NOT REACH FOR THE NAME.** A draft justified erasing the first address by saying holding it
  would put one party's street under another party's name. Measured false: **no name from an
  `NM1*87` taken by the Loop 2000A route reaches the model** - that route computes the entity and
  discards it, and the builder emits a bare `NM1*87*2`. There is no second party and no second name.
  **Scope it to that route and do not write the unqualified form**, which is false: an `NM1*87`
  arriving while a `CLM` is open never reaches this route at all (the `context.kind === "loop2000A"`
  guard), falls through to the Loop 2310 branch, and its name DOES land, on `claim.providers` - the
  bullet below. A draft published the unqualified form with its own counterexample two bullets down.

- **Two related things measured on the way, neither fixed, neither this item's:** an `NM1*87`
  arriving while a `CLM` is open falls through to the Loop 2310 branch and lands in `claim.providers`
  as a provider role, identical at base; and `attachContact`'s `/* v8 ignore */` comment calls its
  `payToAddress` arm "structurally unreachable in v1", which a `PER` after an `NM1*87` reaches.

## X12-837-LOOP-RESIDUALS (2026-08-05)

The third and last of the ways an 837 service line could go missing with no diagnostic. The
other two closed in `#67` and `#69`; this one was disclosed by both of them and left open,
because both of their codes are anchored at an `LX` and this case is defined by there not
being one.

- **🩺 THE DEFECT, MEASURED AT `0899813`, WHICH IS PUBLISHED `0.0.10` - NOT `0.0.9`.** Every
  past-tense sentence in this slice says `0.0.10` for that reason: a draft said "through
  `0.0.9`" throughout, which tells a consumer on the CURRENT release that they already have
  the fix. Check `git show <base>:package.json` against `npm view`, never the sibling
  bullets, which say `0.0.9` correctly about their OWN earlier bases. An
  `SV1*HC:99213*8500*UN*4***1~` inside an open `CLM` with **no `LX` ahead of it** left
  `claims[0].serviceLines` **empty** and `warnings` **empty**. A charge of 8500, 4 units, a
  procedure code and its modifiers read into nothing, and the claim was indistinguishable
  from one that genuinely had no service lines. The same shape with no `CLM` open either
  was equally silent. Both are pinned as committed cases.

- **🩺 WHY IT NEEDED A NEW CODE RATHER THAN A WIDENING.** `X12_837_SERVICE_LINE_DROPPED`
  reports an `LX` that opened no Loop 2400 and `X12_837_SERVICE_LINE_NOT_DECODED` an `LX`
  whose line was retained undecoded. **Both anchor at the `LX`, and this case has none** -
  there is nothing for either to point at. `X12_837_SERVICE_SEGMENT_WITHOUT_LX` anchors at
  the service segment itself, which is the only segment the case has. The three therefore
  never report the same segment, though a document with several claims can carry all three
  on three distinct segments (a committed case, and the grounding for that sentence in the
  message text - it was written before it was measured and would have been wrong as
  "these codes never co-occur").

- **🩺 THE ORPHAN SEGMENT IS NOT DECODED INTO A LINE, AND THAT IS THE SAFETY DECISION.**
  `SV1-02` and `SV2-03` are both the line charge and `SV1-04` / `SV2-05` / `SV3-06` the
  units, so reading a service segment into a line the walker never opened is how a mis-read
  charge is minted. `#67` settled this direction already: refusing to read is the safe half,
  and doing it silently was the defect.

- **🩺 THE PASS-1 BLOCKER, AND IT WAS A CLAIM DEFECT, NOT A CODE DEFECT: "IT DOES NOT NAME
  THE SUBMISSION'S VARIANT" WAS PUBLISHED AS A MEASURED BOUND AND IS FALSE.** Variant
  resolution runs **before** the walk and, where `ST-03` matches none of the three keys in
  `VARIANT_BY_ICR`, falls back to **the first `SVx` segment id anywhere in `body`** -
  orphans included. Measured on both trees, with an `ST-03` of `005010X222A1`:

  | Document                    | `variant` | The conformant line              |
  | --------------------------- | --------- | -------------------------------- |
  | `CLM~ SV2~ LX*1~ SV1~`      | `"I"`     | `charge` **0**, `units` **0**    |
  | `CLM~ LX*1~ SV1~` (control) | `"P"`     | `charge` **8500**, `units` **4** |

  So one stray `SV2` re-types the whole submission and every conformant `SV1` line in it
  reads zero. **`PRE-EXISTING`, identical at `0899813`** - the slice neither introduced nor
  changed it. **The remedy was to correct the claim on every surface carrying it, NOT to grow
  the guard** (derive the list with `grep`; a count here went stale within the same slice)**:** excluding orphans from the fallback changes how existing documents decode and is
  its own slice, on a published package. The failure that let it through is the one this
  repo keeps paying for: **the test asserting the property ran only under a resolving
  `ST-03`, so its title claimed the general case while its body could observe only the half
  that is true.** It now pins both halves, and the false half carries a control that
  measures the $8,500 the stray segment costs. **Pass 2 then found the corrected sentences
  themselves incomplete: `opts.type` wins BEFORE the ICR and before the segment scan
  (`explicitType ?? variantFromIcr ?? variantFromSegment ?? "unknown"`), so `{ type: "P" }`
  reads that same document correctly - `8500` / `4` / `"99213"`.** Every surface now says so.
  The re-typed line's procedure code is `undefined`, **not** `""`; the `""` on such a line is
  its `revenueCode`. And the ordering matters: the fallback takes the FIRST `SVx`, so a stray
  `SV2` placed AFTER the conformant `SV1` leaves `variant` `"P"` and the charge intact.

- **🩺 THE SECOND PASS-1 FINDING, SAME SHAPE: "NOT PRECEDED BY AN `LX`" IS NOT WHAT THE CODE
  TESTS.** The walker tests "no Loop 2400 open". Measured: `CLM*1~ LX*1~ SV1~ CLM*2~ SV1~`
  raises the code on the second `SV1` while an `LX` sits earlier in the transaction and the
  first claim keeps its decoded line - which also falsifies the "`serviceLines` is empty"
  premise the troubleshooting row was written around. The registry message is public and
  frozen, so this was fixed before the first publish rather than disclosed.

- **THE SUPPRESSION, AND WHY IT IS SCOPED RATHER THAN GLOBAL.** A service segment inside a
  loop an `LX` failed to open must NOT raise this code: the loss is already named, once, at
  the `LX`. That is a single `droppedLineReported` flag, set beside each of the two
  existing `serviceLineDropped` pushes and cleared in `flushServiceLine` - the one place
  `currentServiceLine` is cleared, so the two can never disagree. **A flag that latched
  would silence every later orphan in the transaction**, which is the failure this shape
  invites; the case that pins it is a dropped `LX`, then a fresh `CLM`, then a bare `SVx`,
  and it reds if the reset is removed.

- **THE `LX` CASE'S CONTROL FLOW IS UNCHANGED.** `#69` recorded why: an earlier draft
  returned early on the second route, skipped the `activeEntity` reset, and let a trailing
  bare `N3` / `N4` address the last active party. The only additions here are the two flag
  assignments beside the existing warnings.
  **▶ SUPERSEDED as of "The two original residuals, closed" below**, which added
  `activeEntity = undefined` to route 1. The RULE (do not restructure; let no route skip
  the reset) still holds; the sentence counting what was added does not, and counting is
  what got refuted twice. Do not restore a count here.

- **THE RED/GREEN CENSUS, RUN NOT DERIVED - AND RE-RUN AFTER THE REMEDY ADDED CASES, WHICH
  IS THE ONLY REASON IT IS RIGHT.** Head's final suite against a base checkout of
  `src/transactions/claim/get-837.ts`: **15 of 21 red, 6 green.** A pass-2 finding: the
  remedy's two new cases assert the WHOLE channel including the new code, so both are red at
  base even though the behaviour they pin is pre-existing, and the pre-remedy figure of 13/19
  had gone stale in the document that exists to hold measurements. The 6 green are exactly the
  controls - the same bytes with the `LX` restored, a dropped `LX` reporting once, a
  dropped `LX` with two service segments, a retained-but-undecoded line, a well-formed
  claim, and the verbatim-segments assertion. Two negative controls on the guards
  themselves: removing the `droppedLineReported` check reds 4 cases, removing the reset in
  `flushServiceLine` reds 2. The pre-existing residual that pinned the leaking behaviour
  (`transactions-claim-837-variant-lookup.test.ts`, "still dropped in SILENCE") went red on
  the fix, as it was written to, and now pins the bound that is still true: this is not the
  code `X12_837_SERVICE_LINE_DROPPED` raises.

- **WHAT IS STILL OPEN AND IS NOT THIS SLICE.** An **absent `SV1-02` on a line that DID
  open still reads a confident `0`**, unwarned - it closes only with the deferred
  `X12Decimal | undefined` model change. The **`REF` mis-attribution after a dropped `LX`**
  (a line-item control number landing on the last named party, measured in a later claim's
  payer) is owed its own item. Neither was touched here.
  Three more `PRE-EXISTING` findings the pass-1 refuter raised, all filed rather than fixed:
  the **variant re-typing above** (its own item - and whether `VARIANT_BY_ICR`'s three keys
  are the right errata set is an open question nobody here has grounded against the TR3s); a
  **duplicate or foreign `SVx` INSIDE an opened Loop 2400 is still silent** (a second `SV1`
  overwrites the first's charge, an `SV2` after a decoded `SV1` is discarded, both with
  `warnings: []`, measured identical at base); and **`transactionIndex` is hard-coded `0`**
  in `get-837.ts` and `get-835.ts`, so for a second `ST` in a group the join key names the
  wrong transaction. The new code follows that uniform convention rather than diverging from
  it.

### The two original residuals, closed (2026-08-05)

Both of the residuals this item carried from `#67` / `#69` are **mis-ATTRIBUTION, not loss.**
Neither changed which warning the walker reports: **no code is added, removed, widened or
narrowed** by either, on every case measured. Say CODE and not "channel": residual 2 changes
the `position` the variant warning carries, and a whole-array `toEqual` on the warnings IS
the channel by this repo's own rule, so "the channel is identical" is false as written. What
moved is where a value, or a warning, is said to be. That framing is the whole reason no new warning code was minted for either.

- **🩺 RESIDUAL 1, MEASURED AT `93b2428`: A DROPPED `LX` LEFT THE LAST `NM1` ADDRESSABLE.**
  Route 1 of `X12_837_SERVICE_LINE_DROPPED` (no `CLM` open) `break`s out of the `LX` case
  **before** the `activeEntity = undefined` the other two routes run, so every trailing
  segment that attaches to a named party attached to whichever party the last `NM1` left
  active. Because the payer accumulator is what the NEXT `CLM` opens against, the values
  surfaced on a **later claim's `payer`**, silently. Measured at base on one document:
  `payer.references` carried `{ qualifier: "6R", value: "LINE-CTRL-1" }`, `payer.address`
  carried `1 ORPHAN WAY / SPRINGFIELD IL 62701`, and `payer.contacts` carried a contact.
  At head all three are empty.

- **🩺 IT IS NOT ONLY THE `REF`, AND THE ITEM'S OWN WORDING WOULD HAVE UNDER-STATED IT.**
  The backlog names the `REF` because that is the instance `#69` measured. `N3`, `N4` and
  `PER` reach the same entity mutators through the same `activeEntity` and mis-attributed
  identically. **All four are pinned.** This is the same defect `#69` recorded as a
  rejected DRAFT on route 2, sitting unnoticed on route 1 the whole time - which is why
  the `LX` bullet in `CLAUDE.md` now names route 1 explicitly instead of asserting the
  case is byte-for-byte the base's.

- **🩺 THE DISCARD IS A TRADE AND THE PASS-1 REFUTER MEASURED ITS PRICE. "NOTHING FOLLOWING
  AN `LX` IS STILL ADDRESSED TO THE LAST NAMED PARTY" WAS PUBLISHED IN FOUR PLACES AS
  THOUGH IT WERE A FACT ABOUT DOCUMENTS, AND IT IS A PARSER POLICY WITH NO TR3 CLAUSE
  BEHIND IT.** The TR3s nest Loop 2400 inside Loop 2300 and say nothing about an `LX`
  anywhere else, so which party a segment after a **stray** `LX` belongs to is not
  spec-derivable in either direction. Worse, base mis-attributes **only** when an `NM1`
  precedes the `LX` with no intervening `HL` or `CLM` - which is exactly the
  entity-loop-with-injected-`LX` shape, so **the motivating document class IS the ambiguous
  one.** Measured at head on a stray `LX` inside Loop 2010BB whose following segments are
  conformant payer content: the payer loses `address` (`PO BOX 1 / PAYERTOWN IL 62701`),
  its `2U` `references` entry and its `contacts` entry, all three of which base got right.
  **The loss has its own residual test.** What decides the direction is narrower than a
  clause and narrower than a precedent: a mis-attribution puts a value on an object the
  sender never put it on, indistinguishable from real data, whereas the bytes of a
  discarded segment are still on `tx.segments`.

- **🩺 DO NOT CITE `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` FOR THIS. A PASS-2 REFUTER
  MEASURED THAT THE CITATION POINTS THE OTHER WAY.** A draft of this section wrote
  "trading silent corruption for a retained omission is the direction
  `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` sets". That item WARNS and retains **on the
  model**, through the one `recordOrphan` chokepoint, so the warning and the retained
  segment can never disagree; its own record in this file states the rule with the
  opposite qualifier ("trading a **warned** omission for a silent mis-attribution is the
  direction it FORBIDS"), and it singles out the one construct dropped with no diagnostic
  as a deficiency rather than a norm. **This slice's route-1 discard is UNWARNED**, and its
  "retention" is `tx.segments`, which is unconditional, identical at base, and contributed
  by no part of this change. **No precedent in this repo backs the SILENCE.** It is
  disclosed, not licensed.

- **🩺 AND NO WARNING NAMES THAT LOSS - "THE LOSS IS ALREADY REPORTED AT THAT `LX`" WAS
  ALSO PUBLISHED IN FOUR PLACES AND IS FALSE.** `X12_837_SERVICE_LINE_DROPPED`'s registry
  message reports the **service line's** loss, enumerates only a `DTP` / `AMT` / `NTE` /
  `REF` following the dropped `LX`, and **never mentions `N3` / `N4` / `PER` at all.** A
  different loss plus a pointer to a doc is not the same as reporting this one. **No code
  was minted**, because this item's scope is the two pinned residuals and a Tier-2 addition
  is a guard change; the silence is disclosed and pinned instead, on the same case that
  pins the loss. **Warning on the discard is owed its own item, and a pass-2 refuter named
  it as the alternative exit rather than a defect.** All seven trailing kinds are discarded
  on the no-claim route; a pass-2 refuter re-derived that from the walker rather than from
  the tests, which is the honest grounding, because no single committed case carries all
  seven.

- **THE ROUTE-DEPENDENCE SURVIVES AND MUST KEEP BEING STATED.** With a `CLM` open the
  trailing `DTP` / `AMT` / `NTE` / `REF` still land on the enclosing claim; only the
  no-claim route moved. What changed is that the no-claim route is no longer split
  **within itself** (`DTP`/`AMT`/`NTE` discarded but `REF` re-attributed) - that
  within-route split is the thing three successive drafts got wrong, and it is now gone
  rather than reworded a fourth time.

- **🩺 RESIDUAL 2: `X12_837_UNKNOWN_VARIANT` ANCHORED AT THE `BHT`.** It was built with
  `segmentIndex: 1`. In a transaction-scoped position that is `tx.segments[1]`, and in an
  837 that is the **BHT** - a segment with no part in variant resolution. The variant is
  resolved from **ST-03**, which is `tx.segments[0]`. Verified by resolving the index back
  through `tx.segments` rather than by reading the literal: at base
  `tx.segments[w.position.segmentIndex].id` was `"BHT"`, at head it is `"ST"`. Note
  `segmentIndex: 0` is **not** a neutral sentinel on the read side (the `X12-BUILDER-BOUNDS`
  trap); it names a real segment, and here that segment is the right one.

- **NO `elementIndex`, AND THAT IS MEASURED RATHER THAN PREFERRED.** ST-03 is element 3, so
  an `elementIndex: 3` looks obviously right. It is not: one of this code's two routes is
  an **ST-03 that is absent entirely**, and there `tx.st.elements` is `["ST", "837", "0001"]`
  with `elements[3] === undefined`. Naming an element that is not on the wire is the
  over-claim class this repo keeps being refuted on, so the position stays segment-level.
  Both routes are pinned, including the absent one.

- **THE PASS-1 REFUTER ALSO CAUGHT THE SOURCE COMMENT THE SLICE FORGOT.** The `LX` case's
  header still read "the control flow below is the base's, unchanged: the two
  `warnings.push` calls are the whole behavioural difference" - true at `a33c208`, false at
  head, sitting 21 lines above the statement that falsifies it and inside a block ending
  "do not restructure this." The `CLAUDE.md` bullet and this section had been corrected;
  **the comment a future agent reads FIRST had not.** Corrected prose in the internal docs
  does not correct the code. The comment now states the RULE and no count, because a
  count of it was published three times and was wrong every time; do not restore one.

- **THE CENSUS, RUN NOT DERIVED, AND RE-RUN AFTER THE LAST TEST WAS ADDED.** Head's whole
  suite against a base checkout of `src/transactions/claim/get-837.ts` (replaced, not
  overlaid): **10 of 1,431 red across 2 files.** 9 of the new suite's 19, plus **1
  pre-existing case**: `transactions-claim-837-variant-lookup.test.ts` pinned the `REF`
  landing on the last party, so closing the residual turned it red exactly as it was
  written to. It was rewritten to pin the corrected behaviour, and the bound that is still
  true - the route-dependence itself - is kept. The 10 green in the new suite are exactly
  the controls plus the retention and downstream-decode pins, which is the point of
  writing them before the fix. Head is **1,431 passed across 68 files**. **Every figure in
  this section was re-derived after the pass-1 refuter's two cases were added; the
  pre-refuter set (9 of 1,429, 8 of 17, controls at 6 and 3) is superseded, and it is
  recorded here only because this item's rule is that a corrected claim is a NEW claim.**

- **A RED NEGATIVE CONTROL PER GUARD, WHOLE-SUITE.** Removing route 1's
  `activeEntity = undefined` reds **7**; reverting the anchor to `segmentIndex: 1` reds
  **3**. Neither guard is asserted only by the case that motivated it.

- **🩺 ONE FULL-SUITE RUN IN SIX WENT RED ON AN UNIDENTIFIED CASE AND DID NOT REPRODUCE.**
  Recorded rather than dismissed. This box was running ten concurrent workers, and
  `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` above says exactly what to suspect: the 10 MB+
  834 stream sits AT the global 10 s `testTimeout` and is green only on its own per-test
  ceiling, so a loaded box can tip it. **Do not read a local green as authoritative under
  fleet load** - the PR's own check runs are.

- **WHAT IS STILL OPEN, AND WAS NOT TOUCHED.** The absent `SV1-02` still reading a
  confident `0` (the deferred `X12Decimal | undefined` slice, explicitly not to be started
  inside another item); the `SVx` variant fallback still scanning the whole body, orphans
  included, so one stray `SV2` re-types a submission (warned, not silent, and narrowing it
  would change how already-published documents decode); a duplicate or foreign `SVx`
  **inside** an opened Loop 2400 still silent; and `transactionIndex` still hard-coded `0`.

### The documentation residual, closed (2026-08-06)

`#73`'s pass-4 record filed one `PRE-EXISTING` major against this item: `KNOWN-LIMITATIONS.md`
contradicted itself about one construct, ninety lines apart. This closes it, and the sweep it
implied. **No source file changed. The whole slice is prose plus one `files` entry plus one
packaging gate.**

- **THE CONTRADICTION, RE-VERIFIED HERE RATHER THAN INHERITED.** `git log -S` on the phrase
  attributes it to `d3b36d9` alone, `git show d3b36d9:KNOWN-LIMITATIONS.md` and
  `git show 2397cf2:KNOWN-LIMITATIONS.md` both carry it at line 150, and `#73`'s diff of that file
  touches only 169-180 and 225-262. **Do not take a line number from a handoff.** The parenthetical
  claimed "a `NM1` arriving AFTER that `LX` names a party normally, and its own trailing segments
  attach"; line 244, written by `#73`, says the later party's trailing segments are silent and that
  **whether they attach is a separate question**. The second is the true one.

- **🩺 THE UNIVERSAL IS FALSE IN THE SOURCE, NOT ONLY IN THE PROSE, AND THAT IS WHERE IT WAS
  MEASURED.** `attachContact` has an explicit no-op arm for `patient`, `payToAddress`, `payToPlan`,
  `otherSubscriber`, `otherPayer` and `lineProvider` ("PER is not surfaced on these entities in
  Phase 5"), and `get-837.ts:302` says it in the walker's own words: a later party's trailing
  segments are silent "whether or not they attach (some kinds reach no party on any release)". A
  probe was not needed and would have added nothing a `v8 ignore`d switch arm does not already say
  outright.

- **DELETED, NOT REWORDED A FIFTH TIME.** The parenthetical goes; nothing replaces it. The scope
  question it was reaching for is already answered, **ninety lines below** (which is the same
  distance the item calls the defect), in the entry for the code that owns it, and that entry was
  graded at full strength across four passes. **Writing a fifth wording is the failure mode this
  lineage has paid for four times.**

- **🩺 THE PAST-TENSE FORM IS THE ONE THAT KEEPS SURVIVING, AND MY FIRST SWEEP MISSED TWO OF IT.**
  `#73`'s pass-1 remedy cut "every release through `0.0.10` attached them" back to "wherever this
  reader surfaces that segment kind on that party at all" in `KNOWN-LIMITATIONS.md` and
  troubleshooting row 70, and left the bare form standing elsewhere. Found by my own sweep:
  `KNOWN-LIMITATIONS.md` ("they attached to whichever party the last `NM1` left active"),
  `CHANGELOG.md` ("so the trailing segments were filed against it"), and
  `.changeset/olive-pumas-repeat.md`, **which is what renders into the GitHub release body**, so it
  would have shipped the false form to consumers who never open the repo. **Found only by the
  refuter, after I had claimed the sweep was complete:** the COUNTERFACTUAL in the headline of that
  same changeset and of the `CHANGELOG.md` bullet ("no longer attaches itself to the last named
  party" asserts that it previously did, for every party), on the very line I had just retyped; and
  a copy in **this file**, eight lines above one I had open. **A grep for one phrasing is not a
  sweep for a claim.** The forms this universal has taken so far, so the next sweep greps for all of
  them: "attach", "attached to whichever party", "filed against it", "lands on", "no longer
  attaches".

- **THE REMEDY DIRECTION DIFFERS BY FORM, ON PURPOSE.** The present-tense parenthetical is
  DELETED, because it had been reworded twice. Past-tense copies take the **already-graded**
  qualifier verbatim; where the measured instance sits beside the claim, the claim is cut back to
  that instance instead, and the instance is named as what it is (**a payer**, which does surface
  all three of an address, a reference and a contact). Counterfactual headlines lose the
  counterfactual only: "no longer attaches itself" becomes "does not attach itself", which is true
  on both routes and asserts nothing about `0.0.10`. **Propagating a graded form is not writing a
  new one - but propagating HALF of one is**, which is what the first attempt did at
  `KNOWN-LIMITATIONS.md`: it added the qualifier to the antecedent and left the consequent ("gave
  that party a street address and a contact") universal.

- **`cookbook.md`, `README.md`, `CLAUDE.md` and the warning factories were clean.** The cookbook
  was fixed by `#73`'s passes 3 and 4 and now states the true form outright; the
  `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` message already said "it does not claim it would have
  reached one". The bullet in this file beginning "RESIDUAL 1, MEASURED AT `93b2428`" is **not** a
  copy: it is scoped by "every trailing segment **that attaches to a named party**". Do not
  "correct" it.

- **THE SAME WORDING IS STILL IN `src/` COMMENTS AND IN TEST-FILE HEADERS, AND IS DELIBERATELY LEFT.**
  `get-837.ts`'s `LX` case says a trailing segment "attached to whichever party the last `NM1` left
  active" in two comments, and several 837 test files open the same way. Neither is a
  warning-message factory and neither was in the item's sweep list; touching them would make this a
  source change and cost the "no source file changed" property that makes this slice cheap to grade.
  **`PRE-EXISTING`, filed not fixed, and named here so the next sweep does not have to rediscover
  it.**

- **`KNOWN-LIMITATIONS.md` IS IN `files` NOW, AND THE ARGUMENT IS THE RUNTIME CITATION ALONE.** Two
  shipped registry messages name it ("see KNOWN-LIMITATIONS.md", one clause before each message
  closes - **neither message ENDS there**, both end by sending the reader to `tx.segments`), and the
  tarball did not carry it. Two remedies were available and the choice is recorded rather than
  assumed: **the citation is correct and the packaging was wrong**, because that document is the
  canonical account of what this reader does not reproduce and a consumer holding a code, a
  `position` and a message is exactly who needs it. Deleting the pointer would have left that
  consumer with strictly less, and it would have touched the frozen registry table, a public surface
  with tests on it, to make a documentation problem go away. **The shipped `README.md`'s two
  relative links to this file are NOT part of the argument** and were removed from it: they are
  equally true of `docs-content/`, which stays out, so leaning on them would have been special
  pleading for one file and against another.

- **THE COST IS REAL AND IS NOT ARGUED AWAY: a tarball is immutable per version**, so every claim
  in that document is now permanent at the version carrying it. This document has demonstrably
  carried a wrong claim through four releases. That is an argument for the refuter gate, not for
  withholding the file from the people the warning sends to it.

- **THE LINE IS RUNTIME OUTPUT, AND IT IS DRAWN DELIBERATELY NARROW.** `docs-content/` is cited
  from JSDoc (`envelope.ts:103`) and from `README.md` prose only, never from a message a caller
  sees, so it stays out of `files` and the shipped `README.md`'s relative links to
  `./docs-content/cookbook.md` and `./docs-content/troubleshooting.md` **still do not resolve inside
  an install**. `PRE-EXISTING`, unchanged here, filed not fixed: putting the docs site in the
  tarball is a bigger decision than this item.

- **`test/package-files-cite.test.ts` IS THE TRIPWIRE, AND IT READS THE REGISTRY, NOT THE SOURCE.**
  It scans `ALL_WARNING_MESSAGES` for repo-root `*.md` citations and asserts **both halves**: the
  name is in `files`, AND a file of that name is on disk. Either alone passes while a consumer
  still cannot read the file, which is how the first draft was refuted: it checked membership only,
  so deleting the document from disk left all five green. It deliberately does **not** scan JSDoc,
  comments or `build*` refusal templates: those are not what the library says to a caller, and
  widening it would turn a statement about runtime output into a syntactic scan of prose (`#51`'s
  failure mode). **The pattern is case-INSENSITIVE on purpose** - the first draft matched
  SHOUTY-case names only, so a future message citing `cookbook.md` would have passed in silence.
  Measured against the shipped registry, it matches exactly one name. The helpers are free functions
  over their inputs so the controls can drive them with a table this package does not ship.
  **Measured: removing the `files` entry reds 2 of 6, moving the file off disk reds 1 of 6**; a
  vacuity pin asserts the registry really does cite a document, so the check cannot pass by finding
  nothing.

- **WHAT THE GATE DOES NOT DO, STATED RATHER THAN LEFT TO BE FOUND:** it reads the `files` ARRAY,
  not a built tarball, so it is a statement about the manifest. A directory or glob entry covering a
  cited file would be reported even though `npm pack` would ship it. No such entry exists, and the
  failure direction is a false refusal rather than a false pass, which is the right way round.
  `npm pack --dry-run` was run by hand once and does list the file.

- **THE CHANGESET WAS RENDERED, NOT READ.** `collectHeadlines` + `renderNotes` +
  `assertPublishableNotes` from `cosyte/.github`'s real `scripts/release-notes.mjs`, driven over
  this repo's actual `.changeset/` directory. The bullet renders with **no 🩺** and reads as a
  packaging and documentation change, which is what it is. A consumer-shaped headline here would
  have published a documentation correction as a defect in the parser. **Re-rendered after the
  pass-1 remedy**, because that remedy edited the first sentence of a pending changeset, which is
  exactly the text the renderer turns into a bullet.

- **🩺 THE PASS-1 REFUTER REFUTED THIS SLICE, AND THE LESSON IS THE ONE THE LINEAGE KEEPS BUYING.**
  Two `INTRODUCED` majors, both the same shape: my `CHANGELOG.md` entry claimed the false statement
  "is removed from this file" while the file still carried it in a headline three lines from my own
  edit, and the sweep missed a copy in this file. **A completeness claim about a sweep is itself a
  claim, and it gets refuted like any other.** The entry now says what was cut and names what was
  deliberately left, instead of claiming the class is closed.

- **🩺 PASS 2 NOT REFUTED, ALL EIGHT CLOSED AGAINST SOURCE, AND ITS ONE MINOR IS THE SAME SHAPE A
  THIRD TIME: A NAVIGATION CLAIM.** The pass-1 remedy replaced a false universal with a POINTER,
  and the pointer said the `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` entry states which kinds
  this reader surfaces on which parties. **It states no such thing and says the opposite** -
  "whether they ATTACH is a separate question this code does not answer" - and no per-kind,
  per-party map is published in the documents this package ships. Corrected to say what that entry
  does state, in all three copies, one of which renders into the release body. **The standing
  lesson: when you delete a claim, whatever you leave pointing at its place is a NEW claim and is
  graded as one.** Do not close the gap with a cross-reference you have not opened and read.

- **PASS 3 NOT REFUTED, ON THE PASS-2 REMEDY DIFF ONLY, AND IT IS THE CAP. THERE IS NO PASS 4.**
  Pass 2 was NOT REFUTED, so pass 3 existed only because the pass-2 remedy would otherwise have
  shipped ungraded; it opened no new attacks and found no blocker and no major. **Its two minors
  were the SAME defect a fourth time, one of them inside the sentence written to fix the third.**
  The pass-2 remedy denied that a per-kind, per-party map is published "anywhere in this package's
  documentation" while **this very section**, 121 lines below, prints complete negative rows for
  `PER` and for `REF` off the `attach*` switch arms. Scoped to "the documents this package ships",
  which is what the two tarball-scoped copies already said and is true. The second: this bullet
  originally recorded a pass-3 verdict **before pass 3 had returned**, written by the graded party.
  It is rewritten here from what pass 3 actually returned. **Do not pre-write a gate's verdict, even
  one you expect** - the agent that wrote the work cannot grade it, and a verdict that happens to
  land true is still a verdict nobody issued.

- **WHAT IS STILL OPEN AND WAS DELIBERATELY NOT TOUCHED.** The `X12Decimal | undefined` breaking
  slice (an absent `SV1-02` still reading a confident `0`) was named as not-to-be-started inside
  another item and was not; the one-stray-`SVx`-re-types-a-whole-submission finding is warned and
  filed; no source scan was proposed for the prototype defence; and `docs-content/` stays out of
  the tarball, so the shipped `README.md`'s relative links into it still do not resolve inside an
  install. Pass 2 additionally filed one `PRE-EXISTING` backlog line: under a **non-conformant**
  repeated `NM1*87` inside one Loop 2000A, `attachAddressLines`' `payToAddress` arm APPENDS to the
  surviving accumulator rather than replacing it, so address lines from after a stray `LX` can
  merge with lines from before it. Narrow (an `HL*20` resets `payToAddress`), exotic input, and
  **the sentence that would have to change to describe it is the one the item forbids rewording
  again**, so it belongs in the entry that owns the question, in its own item.

## X12-277-SVC07-NOT-DECODED (2026-08-05)

- **🩺 THE DEFECT: `SVC-07` IS USAGE `R` IN TR3 `005010X212`, AND THIS LIBRARY NEITHER READ NOR
  EMITTED IT, SO EVERY X212 277 IT PRODUCED WITH A LOOP 2220 SERVICE LINE WAS SHORT A REQUIRED
  ELEMENT ON THE WIRE.** `get277Status` read SVC-01 through SVC-04 and stopped; `build277` emitted
  exactly those four. The submitted units count also never reached the model on the way back in.
  `PRE-EXISTING`, disclosed by `#64` and filed not fixed; reproduces at `e3cdf49`. Fixed here.

### Where the usage came from, and the negative control on that measurement

- **Grounded OUTSIDE this repository, because checking a spec claim against this repo's own
  implementation is not a check.** The source is pyx12's committed 005010 maps, fetched at
  `raw.githubusercontent.com/azoner/pyx12/master/pyx12/map/`:
  - `277.5010.X212.xml` - `SVC01=R`, `SVC02=R`, `SVC03=R`, `SVC04=S`, **`SVC05=N`**, **`SVC06=N`**,
    **`SVC07=R`**, element `380`, named **"Units of Service Count"**.
  - `277.5010.X214.xml` - `SVC01=R`, `SVC02=R`, `SVC03=N`, `SVC04=S`, **`SVC05=N`**, **`SVC06=N`**,
    **`SVC07=S`**, named **"Original Units of Service Count"**.
  - **Extract by `<seq>`, never by the `xid` attribute.** A first pass keyed on `xid` and concluded
    the X214 map "has no SVC06 at all"; it has one, and an SVC01, both carried as `<composite>`
    elements with a `<seq>` and NO `xid`. The claim was published in this file and in the new test
    file's header and is corrected here. It never reached the code, which emits SVC-06 empty and is
    right under either reading.
  - **Corroborated by a SECOND, unrelated publisher**, because three files from pyx12 control for
    picking the wrong map and not for pyx12 being wrong, and this usage now drives a hard builder
    refusal: `kputnam/stupidedi`, `lib/stupidedi/transaction_sets/005010/implementations/`, hand
    authored from the TR3s. `X212-HN277.rb` has SVC07 `Required` "Units of Service Count"; the X214
    implementation has it `Situational` "Original Units of Service Count". Both agree with pyx12.
  - `835.5010.X221.A1.xml` - `SVC05=S` "Units of Service **Paid** Count", `SVC07=S` "**Original**
    Units of Service Count". This is the map the 835 reader already implements.
- **The negative control is the two wrong maps, and it fires.** Run the same extraction against
  X214 and X221A1 and SVC-07 comes back `S`, not `R`. That is what makes "usage R" a claim about
  X212 specifically rather than about the SVC segment generally, and it is why `build277CA` is
  deliberately untouched. A control that could not distinguish the three maps would have licensed
  refusing on the 277CA too, which would have been a fresh defect dressed as a fix.
- **The two TR3s NAME the same element differently** ("Units of Service Count" vs "Original Units of
  Service Count") and one model field, `unitsOfService`, carries both. Do not rename it to either
  TR3's wording: the reader is version-agnostic by construction and picking one name would assert
  the wrong TR3 on half the documents it decodes.

### Why the existing suite could not have caught it

- **Every service-line assertion was a `build277` to `get277Status` round trip through ONE
  self-consistent four-element map.** A round trip is green for any subset the two modules agree on,
  including a subset that omits a required element, and it cannot test an element USAGE at all,
  because usage is a property of the TR3 and not of either module. This is the same shape as
  `X12-SVC-ELEMENT-MAP-OFF-BY-ONE`: only bytes can test a map, and only an outside source can test a
  usage.
- **The committed canonical X212 fixture was ITSELF short the element** (`SVC*HC:99213*150*0~`),
  which is part of why nothing noticed. It now reads `SVC*HC:99213*150*0****1~` and the serializer
  golden was regenerated. **The other twelve goldens regenerate byte-identically**, which is the
  control that the fixture edit changed one document and not the emit surface.
- **Measured: 16 of the new file's 21 cases are RED against a clean `c34770c` checkout** (head's
  `test/` tree run against base `src/`), 21 green at head; suite 1,370 to 1,391. **Re-derive by
  RUNNING head's suite against a base checkout, never by arithmetic.** The five green-at-base are
  the negative pins that were already true and are listed so nobody reads them as coverage of the
  fix: SVC-05 stays unread, an absent SVC-07 warns nothing, a 277CA line with no units emits no
  placeholder, and the two fixture-shape pins (which are red against the BASE fixture and green only
  because the measurement copies head's `test/` tree wholesale).

### The decisions, and what each one refuses

- **REFUSE, NEVER DEFAULT.** `build277` throws `ClaimStatus277BuildError` /
  `X12_277_BUILD_INVALID_SPEC` for a line with no `unitsOfService`. Emitting an EMPTY SVC-07 would
  still be short a required element, so "add the field as optional" does not close the item.
  Defaulting to `1` was considered and refused for the same reason `X12-SVC-ELEMENT-MAP-OFF-BY-ONE`
  refused to default an absent 835 SVC-05: a count nobody sent is invented, and a units figure is
  one a payer reprices against.
- **THE REFUSAL IS VERSION-GATED, AND THE GATE IS THREADED THROUGH `enforceStructuralSpec`.**
  `buildClaimStatus` already takes the `ClaimStatusVersion`; it now hands it to
  `enforceStructuralSpec` to `enforceSubscriber` to `enforceClaim`, and the leaf compares against
  `"005010X212"` literally rather than through a boolean, so the reason stays legible at the throw.
  **No new error CODE was added** - the registry stays additions-only and this is the existing
  non-hierarchy-precondition arm.
- **SVC-05 AND SVC-06 ARE EMITTED EMPTY AND STAY UNREAD.** Both are usage `N` in both 277 TR3s.
  `seg` trims trailing empty elements, so a 277CA line with no units emits no placeholder at all
  (`SVC*HC:99213*150.00~`) while an X212 line with units emits `SVC*HC:99213*150.00*****1~`. Reading
  SVC-05 "for symmetry with the 835" would put a quantity on the model that no 277 sender ever
  wrote.
- **The refusal message carries the structural locator and the loop index only** - `locator` and
  `String(l)`, both already sanctioned holes in `test/builder-refusal-bounds.test.ts`. The census
  there moves 84 to 85 sites; the module count stays 11 because `build-277.ts` already raised
  elsewhere. **`test/_helpers/phi-slots.ts` is deliberately NOT extended:** its header already
  excludes `SVC-04..07` as purely-numeric body elements, and what covers them is the
  registry-membership assertion in `test/phi-diagnostic-surface.test.ts`.
- **ASSERT THE MESSAGE, NEVER THE CLASS.** `ClaimStatus277BuildError` covers seven refusals now, so
  `expect(run).toThrow(ClaimStatus277BuildError)` passes on any of them. The new cases assert
  `SVC-07`, `005010X212` and the locator text.
- **The warning channel is pinned as a WHOLE PROJECTED ARRAY** (`warnings.map(code + position)`
  compared with `toEqual`), not as a code plus the absence of a different code, which is the shape
  that let `#67`'s residual stay green. The SVC segment's `position.segmentIndex` is DERIVED from
  the fixture at module load rather than written as a literal.

### Left open, on purpose

- **🩺 PUBLISH NO CENSUS OF WHAT IS STILL UNGUARDED. ONE element's usage was fixed and an emitted
  service line is NOT thereby conformant.** A first draft of this slice's changeset, CHANGELOG and
  `KNOWN-LIMITATIONS.md` opened "Two things this does not fix", and the gate found a third inside
  the very segment the slice repaired: **`SVC-01` and `SVC-02` are BOTH usage `R` in X212 and BOTH
  optional on `Build277ServiceLineSpec`**, so a spec carrying only `unitsOfService` emits
  `SVC*******1~` with no refusal. Loop 2220's `STC` is a required SEGMENT in X212 and the builder
  emits lines with none. **The remedy was to CUT THE CLAIM BACK, NOT to add guards** - the standing
  rule from `X12-NUMERIC-VALUE-EMITS-EMPTY`, and adding them would have made this the general 277
  usage audit the item did not ask for. Finding one more is expected and is not a new finding.
- **🩺 `SVC-03` is usage `R` in X212 and usage `N` in X214, and both builders treat it as optional in
  both.** Found while reading the same two maps. `PRE-EXISTING`, reproduces at `e3cdf49`, filed not
  fixed: a different element with a different asymmetry, X214 forbidding what X212 requires.
- **🩺 The READ side raises NO warning for an X212 277 that arrives with no SVC-07.** The reader
  stays lenient and the model simply carries `undefined`. Saying so needs a new Tier-2 registry code
  and the defect this item names is on the EMIT side. **Do not describe this slice as "the 277 now
  tells you when a required element is missing"** - it does not.
- **`REFUSAL-MESSAGE-PHI-ECHO` was NOT folded in.** `requireCallerSegment` still echoes a non-string
  primitive it refuses, and `build277`'s `seg` routes through it. Untouched here, disclosed, its own
  open item. **[Closed 2026-08-06 by that item](#refusal-message-phi-echo-2026-08-06); the sentence
  above describes the state at `b7d82ca` and the guard named in it was not even the one that fires
  for `CLP-01`.**
- **The `X12Decimal | undefined` breaking slice is still deferred** and this slice does not start
  it. `unitsOfService` is `X12Decimal | undefined` because it is an OPTIONAL slot on a new field,
  not because the model-wide change landed.

## X12-VARIANT-LOOKUP-PROTOTYPE (2026-08-05)

- **🩺 THE DEFECT: A LOOKUP TABLE BUILT AS AN OBJECT LITERAL INHERITS `Object.prototype`, SO A KEY
  READ OFF THE WIRE RESOLVES TRUTHY FOR EVERY OWN PROPERTY OF `Object.prototype`.**
  **`Object.freeze` DOES NOT HELP** and is the reason this looked safe on review: it seals the OWN
  properties and changes nothing about what the prototype chain contributes to a read.
  `VARIANT_BY_ICR` was frozen. Found at base by `#67`'s refuter, disclosed in this file, filed as its
  own item, fixed here.

- **🩺 NAME THE SET, NEVER THE MEMBERS. A DRAFT OF THIS SECTION PUBLISHED EIGHT AND THE ENGINE HAD
  TWELVE**, in `CLAUDE.md`, the CHANGELOG, `KNOWN-LIMITATIONS.md`, the shipped changeset AND
  `src/parser/lookup.ts`'s JSDoc, all at once. The four it missed were `__defineGetter__`,
  `__defineSetter__`, `__lookupGetter__` and `__lookupSetter__`, and all four behave identically to
  `constructor` at every site measured. This is `X12-NUMERIC-VALUE-EMITS-EMPTY`'s rule arriving in a
  new place: **the remedy is to cut the claim back, not to grow the census.** The set is engine- and
  version-dependent, so the only durable form is "every own property of `Object.prototype`".

- **🩺 WHAT IT COST, MEASURED AT `a33c208`, PROBE BY PROBE.** Every row is a literal-EDI probe run
  against the base sha and against head. Every own property of `Object.prototype` behaves
  identically at each site;
  `constructor` is quoted as the representative.

  | Probe                                       | Base (`a33c208`)                                               | Head                                                                        |
  | ------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
  | 837 ST-03 `constructor`, SV1 present        | `variant` a **function**, `serviceLines` **0**, `warnings: []` | `variant` `"P"` via the SVx fallback, 1 line, charge `8500`, `warnings: []` |
  | 837 ST-03 `constructor`, no SVx anywhere    | `variant` a **function**, 0 lines, `warnings: []`              | `["X12_837_UNKNOWN_VARIANT", "X12_837_SERVICE_LINE_DROPPED"]`               |
  | 837, caller `{ type: "p" }`, SV1 present    | 0 lines, `warnings: []`                                        | `["X12_837_SERVICE_LINE_DROPPED"]`, **no unknown-variant code**             |
  | 837 HL-03 `constructor`                     | `["X12_HL_PARENT_LEVEL_INVALID"]`                              | `[]` (matches HL-03 `99`)                                                   |
  | `lookupCarc("constructor")`                 | `{ code: "constructor", description: <function Object> }`      | `undefined`                                                                 |
  | 837 CAS-02 `constructor`                    | `reasonDescription` a **function**, `warnings: []`             | `["X12_UNKNOWN_CARC"]`                                                      |
  | 837 HI-01-1 `constructor`                   | `codeSystem: "unknown"`, `warnings: []`                        | `["X12_UNKNOWN_HI_QUALIFIER"]`                                              |
  | `isClaimAdjustmentGroupCode("constructor")` | `true`                                                         | `false`                                                                     |
  | 271 / 277 HL-03 `constructor`               | `[]`                                                           | `[]` (never exposed - see below)                                            |

- **🩺 THE HEADLINE IS THE ONE THE ITEM NAMED, AND IT IS STRICTLY WORSE THAN `#67`'s.** `#67` closed
  a line that shipped a fabricated `0`. **This one shipped NO LINE AT ALL.** `openServiceLine`
  answers `undefined` for any variant that is not `P` / `I` / `D`, so with `variant` a function the
  `LX` opened no accumulator, the `SVx` after it found nothing to decode into, and the line was
  never pushed onto the claim. Charge, units, procedure code, modifiers, dates, amounts, notes and
  line adjudications, all gone, on every line of every claim, with an empty warning channel.

- **THE FIX IS THE ONE THE ITEM MANDATED, AND THE CHOICE BETWEEN ITS TWO SHAPES IS PRINCIPLED, NOT
  TASTE.** `Object.create(null)` where this package DECLARES the table (`src/parser/lookup.ts`'s
  `wireLookup`, used by the 837's three); `Object.hasOwn` at the read where the table is SUPPLIED to
  the reader and cannot be re-declared (`makeLookup` receives a `CodeListSnapshot`; `HI_QUALIFIERS`
  and `CLAIM_ADJUSTMENT_GROUP_CODES` are `as const` and their keys ARE the exported union type, so
  re-declaring them would destroy the typing). **The table form is preferred wherever it is
  available**, because it protects read sites nobody has written yet; a read-site guard protects
  only the reads that exist today, which is exactly how this survived.

- **🩺 `in` IS NOT THE SAFE FORM AND IT LOOKS LIKE ONE.** `isClaimAdjustmentGroupCode` used
  `value in CLAIM_ADJUSTMENT_GROUP_CODES`. **The `in` operator walks the prototype chain**, so it
  narrowed `constructor` / `toString` / `__proto__` to `ClaimAdjustmentGroupCode`. Anyone reaching
  for a membership test here must reach for `Object.hasOwn`.

- **THE 271 / 277 / 278 READERS WERE NEVER EXPOSED, AND THE REASON IS THE FINDING.** Their
  `EXPECTED_PARENT_LEVEL` tables have the identical literal shape, but they are read only through
  `src/transactions/shared/hl.ts`, whose `validateHl` has always guarded with
  `Object.prototype.hasOwnProperty.call`. **The 837 carries its own local copy of `validateHl` and
  that copy did not.** Measured both ways: 271 and 277 answer `[]` for a `constructor` HL-03 at base
  AND at head. **Their tables are deliberately left as literals** - converting them would be churn
  with no behaviour change, and a diff that changes nothing is a diff a reviewer has to prove
  changes nothing. Do not "finish the job" there without a reason.

- **NO SOURCE SCAN SHIPS, AND THAT IS A DECISION, NOT AN OMISSION.** This repo's instinct is a
  syntactic tripwire (`test/builder-array-bounds.test.ts`, `test/builder-refusal-bounds.test.ts`).
  **It does not work for this shape.** A scan cannot tell a table keyed by DOCUMENT BYTES from one
  keyed by a LIBRARY-OWNED DISCRIMINANT, and `src/parser/warnings.ts` holds four of the latter
  (`CONTROL_NUMBER_PAIR_MESSAGES`, `UNEXPECTED_SEGMENT_MESSAGES`, `BALANCE_INVARIANT_MESSAGES`,
  `REQUIRED_LOOP_MESSAGES`) which are legitimately object literals and must stay that way. Any scan
  would therefore need a per-TABLE allowlist, which is the `#51` allowlist failure mode twice over.
  **The defence is behavioural instead, and it is exhaustive where a scan would not be:** the suite
  derives its key list from `Object.getOwnPropertyNames(Object.prototype)` **at run time**, so a
  future engine adding an inherited member widens the suite with nobody editing a list.

- **THE SECOND FINDING FOLDED IN: AN `LX` THAT OPENS NO LOOP 2400 NOW SAYS SO, AND IT COVERS TWO
  ROUTES.** Route 1, an `LX` before any `CLM` (`claims: []`, `warnings: []` at base, with a
  real charge and units on the wire). Route 2, the residual of the headline fix: a variant that
  honestly does not resolve, where `openServiceLine` answers `undefined` and the line was silently
  never opened even though `X12_837_UNKNOWN_VARIANT` fired for the submission. **Route 2 is why this
  belongs in THIS slice rather than its own** - fixing the lookup converts the prototype case into
  the honest-unknown case, and the honest-unknown case was silent too.

- **🩺 THE CODE HAS THREE BOUNDS AND A DRAFT PUBLISHED ALL THREE WRONG. A REFUTER MEASURED EACH.**
  1. **It does NOT travel with `X12_837_UNKNOWN_VARIANT`.** That code fires only for
     `variant === "unknown"`; route 2 fires for `variant` outside `P` / `I` / `D`. A JavaScript or
     `JSON.parse`d caller passing `{ type: "p" }` against a clean 837P gets `variant "p"`, zero
     lines, and `["X12_837_SERVICE_LINE_DROPPED"]` alone. The shipped message and two docs asserted
     the two codes travel together; since the code deliberately carries NO discriminant, that
     parenthetical was the only route-splitter a consumer had and it pointed at the wrong route.
     **`submission.variant` is the discriminant. Say that.** Same class as `#67`'s refutation: a
     caller-supplied `type` is a caller instruction and the warning must attribute nothing.
  2. **An `SVx` with NO `LX` at all is STILL DROPPED IN SILENCE.** The code is anchored at the `LX`,
     so a service segment that never had one reports nothing on any channel - `$8,500` and 4 units,
     gone, `warnings: []`, with and without an open `CLM`. `PRE-EXISTING`, identical at base,
     disclosed and NOT fixed; it is owed its own umbrella backlog ID. **Never write that the warning
     channel is a complete account of how a service line can go missing.** A draft of the cookbook
     and of `KNOWN-LIMITATIONS.md` did.
  3. **What becomes of a line-level `DTP` / `AMT` / `NTE` / `REF` after a dropped `LX` is
     ROUTE-DEPENDENT, and TWO successive drafts stated it unqualified in OPPOSITE directions.**
     Draft one said the data was "absent"; the remedy for that said it "attaches to the enclosing
     claim"; both were measured false, because each is true on exactly one of the code's two routes.
     With a `CLM` open, the date, amount and note land among the **claim-level** ones. With **no**
     `CLM` open, the `DTP`, `AMT` and `NTE` are **discarded** and a trailing `REF` attaches to
     whichever party the last `NM1` left active **wherever this reader surfaces that segment kind on
     that party at all** - measured, a line-item control number landing in a _later_ claim's
     `payer.references`, and `attachReference` has a no-op arm for `payToAddress` / `payToPlan` /
     `otherSubscriber` / `otherPayer` / `lineProvider`, so after an `NM1*87` it reached no party.
     **The remedy was to CUT THE CLAUSE OUT OF THE SHIPPED
     MESSAGE ENTIRELY**, because a registry message cannot carry a conditional and a consumer reading
     one should not have to. `PRE-EXISTING` walker behaviour;
     both routes pinned by tests, and the `REF` mis-attribution is owed its own umbrella item.

- **🩺 THE `LX` CASE'S CONTROL FLOW IS THE BASE'S, AND THE ONE TIME IT WAS NOT, IT MINTED SILENT
  CORRUPTION.** A draft returned early on route 2 and thereby skipped `activeEntity = undefined`, so
  a trailing bare `N3` / `N4` / `PER` attached its address to whichever party the last `NM1` had left
  active - measured, an address landing on a named other-subscriber that had none at base, with no
  warning. **Trading a warned omission for a silent mis-attribution is the direction
  `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` forbids.** The two `warnings.push` calls are now the
  entire behavioural difference from base, and a test reds if the early return comes back.
  **▶ THAT LAST SENTENCE IS SUPERSEDED** by "The two original residuals, closed", which added
  `activeEntity = undefined` to route 1 for the same reason this bullet gives about route 2. The
  test still reds if the early return comes back. Do not restore a count of the difference.

- **`X12_837_SERVICE_LINE_DROPPED` IS THE 25TH CODE, AND IT IS NOT A RENAME OF `#67`'s.**
  Additions-only, 24 -> 25. **The two report different losses and must never be merged:**
  `X12_837_SERVICE_LINE_NOT_DECODED` means the line **IS** on the model holding seeded zeros;
  `X12_837_SERVICE_LINE_DROPPED` means it is on **no claim at all**. Reusing `#67`'s code would have
  falsified its own shipped message, which states the line is retained. A test pins that exactly one
  of the two fires per `LX`.

- **ONE MESSAGE, NO DISCRIMINANT, FOR THE THIRD ITEM RUNNING.** A `no-claim` / `no-variant`
  discriminant was available and library-owned and was not taken: `submission.variant` and
  `submission.claims` already carry which route fired, and the previous two slices' discriminants
  were each measured wrong at three or more sites. The message names both causes in prose.

- **NOTHING IS FABRICATED FOR A DROPPED LINE.** No claim is synthesized to hold an orphan `LX` and
  no variant is guessed. Both were available and both would put structure on the model the sender
  did not send, which is the failure mode this reader exists to avoid. **Retention is unchanged, not
  increased:** the segments were already verbatim on `tx.segments` and still are.

- **THE MESSAGE ATTRIBUTES NOTHING.** Same discipline as `#67` and `#66`. An `LX` outside a Loop
  2300 is structurally impossible in a conformant 837, but the message describes what THIS LIBRARY
  did (the line is on no claim) rather than what the sender did wrong, because the route-2 half of
  the same code fires on documents that may be perfectly conformant and merely unrecognized.

- **🩺 THE `#67` TRAP WAS THE DESIGN CONSTRAINT ON THE SUITE, AND IT IS WHY EVERY CASE USES
  `toEqual` ON THE WHOLE CHANNEL.** `#67`'s residual test pinned a value plus the absence of a
  DIFFERENT code, both of which stayed true when the leak closed, so every surface predicted a red
  that never came. `dicom`'s carve-out fixture had the identical hole. **Every assertion on the
  warning channel is `toEqual` on the whole array.** **STATE THE PROPERTY, NEVER AN ABSOLUTE ABOUT A
  MATCHER NAME.** "`toContain` appears nowhere in the new suite" was published twice and measured
  false BOTH times - the second time in the very commit that corrected the first, which had itself
  added a new `not.toContain` on an array. The underlying defect the first measurement found was
  real and is fixed: a control read `expect([true, false]).toContain(<boolean>)`, **which passes for
  any boolean**, inside a case titled "still accepts the four spec codes"; it now drives off the
  exported table. **The lesson is that a claim about which matchers a file contains has to be
  re-measured on every edit, so do not make one.** Every
  lying document is paired with an honest
  control in the same slot - an ordinary unrecognized ST-03, an ordinary unknown HL-03, an ordinary
  unknown CARC - because the whole claim is that an inherited key is now INDISTINGUISHABLE from any
  other unrecognized value, and a guard that over-fired would pass the lying half and red the
  control.

- **MEASURED, AND RE-MEASURED TWICE AS THE SUITE GREW: the WHOLE suite is 57 cases, 38 RED against a
  clean `a33c208` checkout and 57 green at head.** Take that as one figure over the whole file and
  do not partition it: a first form said "33 of the first 49", which was wrong four ways at once
  (three of the added cases are ST-03 cases in section 1, not appended; four of the added cases are
  red at base, not three). **Re-derive it by RUNNING the head suite against a base checkout, never
  by arithmetic on an older number.** The pre-existing suite went 1,313 -> 1,370, and the only
  two reds through the whole change were `warning-codes.snapshot.test.ts`'s inline snapshot and its
  length assertion, which is expected for an additions-only registry change and is **not** evidence
  the fix works.

- **EVERY GUARD HAS ITS OWN RED NEGATIVE CONTROL, RUN ONE AT A TIME.** Neutering `wireLookup` back
  to a frozen literal reds 17; removing the `makeLookup` guard reds 8; the `hi-qualifiers` guard, 2;
  reverting `cagc` to `in`, 1; removing the `serviceLineDropped` push, 9 (and 1 in
  `phi-diagnostic-surface`). A guard whose removal reds nothing is a guard the suite is not testing.

- **PHI: `phi-slots.ts` IS 84 SLOTS, AND BOTH NEW ONES ARE OWN SLOTS.** The `LX-01` of a dropped
  line and the `SV1-01-2` procedure code riding on it. The dropped `SVx` is precisely the text a
  future "helpful" message would echo (`dropped: <bytes>`) and on a real 837 it is the procedure
  billed for a named patient. The new message is a frozen registry literal with no interpolation and
  the suite asserts a planted marker appears in no message on any warning.

- **WHAT IS LEFT OPEN, DELIBERATELY.** An **absent** required `SV1-02` still reads a confident `0`
  with no warning (probed at head: `charge` `0`, `warnings: []`). That is unchanged and closes only
  with the deferred `X12Decimal | undefined` breaking model slice, which ripples into `balance.ts`
  and all nine builders. **Never write that an 837 charge can no longer read a fabricated 0.** It
  can, from that route.

- **NO CODE-LIST CONTENT AND NO MESSAGE TEXT CHANGED**, and no model shape changed. The `makeLookup`
  guard runs before the existing `description === undefined` check rather than replacing it, so a
  snapshot that ever declares an own key with an `undefined` value still answers `undefined`.

## X12-837-SV-SILENT-ZERO (2026-08-05)

- **🩺 THE DEFECT: A SERVICE LINE THE READER NEVER READ SHIPPED A FABRICATED `0` CHARGE AND A
  FABRICATED `0` UNITS, ON EVERY CHANNEL, WITH `warnings: []`.** `get837Claims` resolves ONE variant
  for the whole submission (`opts.type` -> ST-03's implementation-convention reference -> the first
  `SVx` segment present -> `"unknown"`). `openServiceLine` seeds `charge` / `units` at
  `X12Decimal.ZERO`, and `decodeSv1` / `decodeSv2` / `decodeSv3` open with
  `if (acc.variant !== "P"/"I"/"D") return;` - **before any element read**. So an `SV2` line on a
  submission that resolved Professional decoded NOTHING: not the charge, not the units, not the
  procedure code, modifiers, unit of measure or place of service. This is the residual
  `X12-QUANTITY-SILENT-DEFAULTS` disclosed and did not fix, and it is the same harm class one level
  up: the decimal sink cannot fire for an element no reader ever reached.

- **🩺 MEASURE THE BASE, PROBE BY PROBE. Four leak paths, two honest controls, run against `d8b5085`
  and against head:**

  | Probe                                         | Base                                                    | Head                                  |
  | --------------------------------------------- | ------------------------------------------------------- | ------------------------------------- |
  | 837I fixture, ST-03 flipped to `005010X222A2` | 2 lines, `charge` `0` / `units` `0`, **`warnings: []`** | 2x `X12_837_SERVICE_LINE_NOT_DECODED` |
  | 837I fixture read with `{ type: "P" }`        | 2 lines, `0` / `0`, **`warnings: []`**                  | 2x `X12_837_SERVICE_LINE_NOT_DECODED` |
  | `LX` with no `SVx` at all                     | 1 line, `0` / `0`, **`warnings: []`**                   | 1x `X12_837_SERVICE_LINE_NOT_DECODED` |
  | 837D fixture read with `{ type: "I" }`        | 1 line, `0` / `0`, **`warnings: []`**                   | 1x `X12_837_SERVICE_LINE_NOT_DECODED` |
  | 837I fixture read as itself (control)         | `charge` `1500`, `units` `1`, `warnings: []`            | unchanged, still silent               |
  | 837P fixture read as itself (control)         | `charge` `150`, `units` `1`, `warnings: []`             | unchanged, still silent               |

  **The controls are half the evidence.** A warning that fired unconditionally passes every row in
  the top half and fails both rows in the bottom half. The negative control ran the other way too:
  deleting the single `acc.serviceSegmentDecoded = true` from `decodeSv1` makes the honest 837P
  control emit the warning, which is what proves the flag, and not something ambient, is the gate.

- **🩺 THE FOURTH PROBE IS NOT IN THE ITEM AND IS THE SAME DEFECT.** The item names the variant /
  `SVx` disagreement. An `LX` carrying **no** `SVx` at all reaches the identical fabricated pair by a
  different route, and a warning keyed on "an `SVx` arrived and was refused" would have missed it
  entirely. **The warning is therefore a property of the LINE at flush - "no service segment was
  ever decoded onto this line" - never of the SVx dispatch.** Same shape as the previous slice's
  rule: a property of the READ, not of the control flow that led there.

- **NOT DECODING THE FOREIGN `SVx` IS CORRECT AND IS NOT WHAT CHANGED. Do not "fix" it by decoding
  the segment that is present.** `SV1-02` and `SV2-03` are both the line charge and `SV1-04` /
  `SV2-05` / `SV3-06` are three different positions for the quantity, so reading an `SV2` into a
  Professional-shaped line would **mis-read money** rather than fail to read it. Refusing to read is
  the safe half. Nor may the line silently adopt the variant of the `SVx` present: `opts.type` is an
  explicit caller instruction and the returned line is a discriminated union the caller narrows on.

- **NO CONTROL FLOW CHANGED AND THE MODEL IS UNCHANGED, ON PURPOSE.** The line is still retained on
  the claim, the resolved variant still wins over a disagreeing `SVx`, every segment stays verbatim
  on `tx.segments`, and `charge` / `units` are still typed `X12Decimal` and still read `0`. **Never
  write "an 837 line can no longer read 0 without the sender having billed 0".** It can; not
  _silently_. Closing that is `X12Decimal | undefined` on the model, which ripples into `balance.ts`
  and all nine builders: the same breaking slice the previous item deferred, still deferred.

- **THE ANCHOR IS THE `LX`, NOT THE `SVx`.** `position.segmentIndex` names the segment that opened
  the line, because the no-`SVx`-at-all case has no `SVx` to point at and an anchor that is
  sometimes absent is worse than one that is always the same. `elementIndex` is deliberately absent:
  no element was read, so there is no failing element to name. Both pinned.

- **ONE MESSAGE, NO DISCRIMINANT.** A `<segment id> x <resolved variant>` discriminant was available
  and library-owned, and was still not taken: it is six message-table entries for a fact
  `tx.segments[position.segmentIndex]` and `submission.variant` already carry, and the previous
  slice's discriminant was measurably wrong at three sites. The message names both causes in prose
  instead.

- **🩺 THE RESIDUAL TEST DID NOT GO RED, AND THAT IS THE FINDING.** The item, the umbrella docs and
  the test's own comment all said closing this hole would red
  `test/parser-decimal-silent-defaults.test.ts` §3b. **It stayed green.** The case asserted
  `charge` `0`, `units` `0`, and `not.toContain(X12_UNPARSEABLE_DECIMAL)` - all three still true,
  because the fix changes neither the model nor the decimal channel. **A pin on "it is silent" that
  never looks at the whole warning channel cannot observe the silence ending.** This is
  `DICOM-ITEM-CROSSES-RESIDUALS`'s lesson arriving verbatim in another repo: the carve-out fixture
  there asserted the leak and never `parseWarnings`. The case is now inverted rather than deleted,
  and pins the new code's presence on the lying document AND its absence on the honest control.

- **The PHI slot table gained the ignored `SVx`, and it is an OWN slot.** The segment the walker
  refused to decode is exactly the text a future "helpful" message would echo back, and on a real
  837 it carries the procedure billed for a named patient. `test/_helpers/phi-slots.ts` is **82**
  slots now; the `13 of 81 red` figure in `PHI-WARNING-MESSAGE-LEAK` below is a measurement of that
  slice against its own base and is not restated.

- **WHERE THE ELEMENT NUMBERS COME FROM, STATED HONESTLY.** The positions this section leans on
  (`SV1-02` / `SV2-03` charge; `SV1-04` / `SV2-05` / `SV3-06` units; `SV3-05` prosthesis / crown /
  inlay) are **this library's own read and emit sides agreeing with each other**, which
  `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` established is NOT a check of a spec claim. **Nobody here has
  read TR3 005010X222A2 / X223A3 / X224A2.** The load-bearing claim survives that gap because it is
  a claim about THIS library: `decodeSv1` and `decodeSv2` read the charge from **different** element
  indexes, so decoding an `SV2` through the `SV1` path mis-reads money whatever the TR3 says. The
  gate's independent read of the 005010 `SVx` layouts corroborated every position listed above
  (there are six of them, and the count is written out because this is the section that corrects an
  off-by-one). **Anything
  stronger than that needs a source outside this repo** (pyx12's `837.5010.X222.A1.xml`, the base
  005010 element dictionary, a published payer companion guide).

- **🩺 PASS 1 NOT REFUTED, AND ALL THREE `INTRODUCED` FINDINGS WERE CLAIM DEFECTS AGAIN.** The
  parser change graded correct and complete against the item's bar on the first pass; the gate could
  not construct a false positive or a false negative, and confirmed the flag cannot be true without
  an attempted read. What failed was, for the fourth item running, the prose shipped alongside it.
  1. **minor - the frozen message asserted non-conformance the library cannot establish.** It said
     the two causes were "both non-conformant". One of this slice's own probes is a **conformant**
     837I read with `{ type: "P" }`: the disagreement is the integrator's option, not a wire defect.
     **The message attributes nothing now** and says outright that which side is wrong is not decided
     here. Same discipline as the previous slice's "assert nothing about what X12.6 type R permits".
  2. **minor - a new `KNOWN-LIMITATIONS.md` bullet published an absolute the base can falsify.** It
     said an unresolvable variant "raises `X12_837_UNKNOWN_VARIANT`" full stop. `VARIANT_BY_ICR` is a
     frozen **object literal**, so it still inherits `Object.prototype`: an ST-03 of `constructor` /
     `valueOf` / `__proto__` resolves truthy, no unknown-variant warning fires, and **every service
     line leaves the model silently**. `PRE-EXISTING`, filed not fixed, and the disclosure is scoped
     rather than the guard grown.
  3. **minor - the cookbook named this code as THE line-amount gate**, omitting
     `X12_UNPARSEABLE_DECIMAL` and the absent-element case. Widened, and pointed at the one page that
     states the guarantee in the only direction it holds.

- **Findings the pass raised that are NOT this slice's, each reproduced at base, disclosed here and
  NOT fixed. Each is owed its own umbrella backlog ID; this repo cannot write one:** the
  prototype-key ST-03 hole above (**major, and it destroys strictly more than the defect this slice
  closed** - every line, every charge, silently); an `LX` / `SVx` arriving before any `CLM` is
  dropped whole with `claims: []` and `warnings: []`; and an absent required `SV1-02` still reading
  a confident `0`, which the deferred `X12Decimal | undefined` slice is where it closes.
  `operations/roadmaps/x12.md` also carries no `Provenance:` field where sibling roadmaps do.

- **Three stale `SV3-05` comments were corrected to the code in this slice, not left.** Two in
  `build-837.ts` and one in this file said `units` sits at `SV3-05`; both the emit and `decodeSv3`
  have always used element 6. The slice was newly publishing `SV3-06`, and shipping both readings in
  one repo is exactly the shape that let the 835 SVC map survive being wrong.

- **Only bytes can produce any of these cases, so the new suite is literal EDI.** `build837` emits
  the `SVx` matching the variant it was asked for, so no round trip can build a line with a foreign
  one or with none at all. The pre-existing suite stayed green through the whole change except the
  registry snapshot: **1,296 passing before, 1,313 after, and the only two reds were
  `warning-codes.snapshot.test.ts`'s inline snapshot and its length assertion.** That is expected
  for an additions-only registry change and is not evidence the fix works.

## X12-QUANTITY-SILENT-DEFAULTS (2026-08-05)

- **🩺 THE DEFECT: `elementDecimalOrZero` TURNED A PRESENT, UNPARSEABLE DECIMAL INTO
  `X12Decimal.ZERO` WITH NO DIAGNOSTIC ON ANY CHANNEL.** `X12Decimal.fromString` correctly returns
  `undefined` for anything outside `[+-]?digits(.digits?)?`, and the helper then defaulted it to
  `X12Decimal.ZERO`. So a payer amount of `1,234.56` (a thousands separator, which X12 forbids in an R-type
  element), `$450.00`, `450.00USD`, `1.2.3`, `450-` or `N/A` read back as `0`, indistinguishable from
  a payer that paid nothing. **A fabricated amount presented as read**, which is the same harm class
  as `#64`'s mis-read count. `PRE-EXISTING`, surfaced by `#64`'s refuter, filed then fixed here.

- **The milder half is the same root cause one type away.** `elementDecimal` answered `undefined`
  for BOTH "the sender omitted this element" and "the sender sent bytes this library could not
  read", also unwarned, so `undefined` at a quantity site meant "not decoded" rather than "absent"
  and no consumer could tell which.

- **🩺 MEASURE THE BASE, PROBE BY PROBE, AND KEEP THE ENUMERATION.** Nine probes, one per site class,
  each substituting a single numeric token into a committed fixture, run against `5a73b37` and
  against head:

  | Probe                    | Base                                                               | Head                                     |
  | ------------------------ | ------------------------------------------------------------------ | ---------------------------------------- |
  | 835 `BPR-02` `1,234.56`  | `totalActualPayment` `0`, only `X12_835_REMIT_BALANCE_MISMATCH`    | + `X12_UNPARSEABLE_DECIMAL` at element 2 |
  | 835 `CLP-04` `450.00USD` | `totalPaymentAmount` `0`, only 2x `X12_835_REMIT_BALANCE_MISMATCH` | + `X12_UNPARSEABLE_DECIMAL` at element 4 |
  | 835 `SVC-05` `1.2.3`     | `paidUnitsOfService` `undefined`, **`warnings: []`**               | `X12_UNPARSEABLE_DECIMAL` at element 5   |
  | 837 `CLM-02` `$150`      | `totalCharge` `0`, **`warnings: []`**                              | `X12_UNPARSEABLE_DECIMAL` at element 2   |
  | 837 `SV1-04` `N/A`       | `units` `0`, **`warnings: []`**                                    | `X12_UNPARSEABLE_DECIMAL` at element 4   |
  | 277 `STC-04` `1,50`      | **`warnings: []`**                                                 | `X12_UNPARSEABLE_DECIMAL` at element 4   |
  | 271 `EB-07` `1 000`      | **`warnings: []`**                                                 | `X12_UNPARSEABLE_DECIMAL` at element 7   |
  | 820 `BPR-02` `12,500.00` | `totalPremiumAmount` `0`, **`warnings: []`**                       | `X12_UNPARSEABLE_DECIMAL` at element 2   |
  | 834 `AMT-02` `125.00USD` | **`warnings: []`**                                                 | `X12_UNPARSEABLE_DECIMAL` on that member |

  **Seven of nine were completely silent at base.** The two that were not are the 835's, and their
  only signal was the balance invariant, **which names an equation and never an element, and exists
  in no other reader**. Do not upgrade that into "the 835 already caught it": it fires only for
  amounts that are terms of a §1.10.2 invariant, so 835 `SVC-05` was silent too.

- **🩺 ONE MESSAGE, NO DISCRIMINANT, AND THAT WAS A CORRECTION MID-BUILD.** A first draft used a
  `DECIMAL_FALLBACKS` discriminant (`ZERO` / `NOT_DECODED`) so the message could say what landed in
  the slot. It was measurably wrong at three sites: 835 `CAS`, 835 `PLB` and 837 `CAS` read with
  `elementDecimal` and then apply `?? X12Decimal.ZERO`, so the `NOT_DECODED` wording would have
  claimed `undefined` where the model shows `0`, and where the triple is skipped neither wording is
  true. **The message now states only what is true of every site: no value was decoded, and whatever
  occupies the slot is a stand-in.** The reader's downstream choice is visible on the model; the
  warning does not try to predict it.

- **The warning is a property of the READ, not of the USE.** It fires whether the decoded slot
  reaches the model, is discarded, or is replaced. That is what makes it countable against the input
  instead of against the walker's control flow, and it is why no control flow changed.

- **NO CONTROL FLOW CHANGED, ON PURPOSE.** The `CAS` / `PLB` skip test is still
  `if (reasonCode === undefined && amount === undefined) continue`. Switching it to a tri-state read
  would have surfaced a fabricated 0-amount adjustment row out of unparseable bytes: a retention
  increase that mints a row nobody sent. The bytes are already on `tx.segments`.

- **🩺 THE MODEL IS UNCHANGED AND THE RESIDUAL IS DISCLOSED, NOT CLAIMED AWAY.** A slot typed
  `X12Decimal` still reads `X12Decimal.ZERO`. A consumer that reads only the model and never looks at
  `.warnings` sees exactly what it saw before. Closing that means `X12Decimal | undefined` on every
  monetary model slot, which ripples into `balance.ts` and all nine builders: a breaking model change
  and its own slice. **Do not restate this slice as "an unparseable amount can no longer read as
  zero".** It can. It can no longer do so _silently_.

- **AN ABSENT ELEMENT DOES NOT WARN, AND THAT IS DELIBERATE.** "Missing means zero" is the documented
  convention of the slots using `elementDecimalOrZero`, and warning on it would fire on almost every
  real 835. Pinned both ways, because the value of the new warning is entirely in it being rare.

- **THE PUBLIC HELPERS TAKE THE SINK AS AN OPTIONAL 4TH ARGUMENT AND ARE SILENT WITHOUT IT.** That
  keeps every existing 3-argument caller compiling. The library's own silence is prevented by
  `test/parser-decimal-silent-defaults.test.ts`, which counts the top-level arguments of every
  `elementDecimal` / `elementDecimalOrZero` call under `src/transactions/` by walking balanced
  parens, after stripping comments. **It keys on the ARGUMENT COUNT, never on a `, sink)` regex** -
  the sink binding is named by its caller, and a name-matching scan is exactly the shape that went
  slack twice in `X12-BUILDER-BOUNDS`. Negative controls run both ways, plus a vacuity check that
  each reader file still contains at least one decimal read.

- **`readElementDecimal` is the pure primitive and the two warning wrappers are thin over it.** One
  place decides what "unparseable" means; the helpers only decide what to do about it. That is what
  makes the tri-state public without a second implementation to drift.

- **🩺 The 834's sink is the MEMBER's warning list, not the transaction's.** `get834Enrollments`
  streams and accumulates per `INS` loop, so the sink is built inside the `AMT` case from
  `current.warnings`. Building it at the top of the walk with a transaction-level array does not
  compile there, and scoping it to the member matches `X12_834_UNKNOWN_MAINTENANCE_TYPE`.

- **The 277's sink is built inside `decodeStc`,** which already carried `warnings` + `position`;
  every other reader builds one per segment at the top of its walk loop.

- **The existing suite stayed green through the whole change** (1,236 tests before the two expected
  snapshot updates). That is not evidence the fix works: **no committed fixture contains an
  unparseable decimal**, which is exactly why the defect survived. The evidence is the nine probes
  above and the literal-EDI cases in the new file, and **a round trip could not have produced any of
  them** - `X12-DECIMAL-BYPASSES-THE-GUARD` made the builders refuse to emit an unparseable decimal,
  so only bytes can make this input.

- **🩺 PASS 1 REFUTED, AND BOTH `INTRODUCED` FINDINGS WERE CLAIM DEFECTS, NOT CODE DEFECTS.** The
  parser change graded correct and complete against the item's bar on the first pass; what failed was
  what shipped alongside it. That is this repo's standing pattern and it held again.
  1. **major - the slice published the INVERSE guarantee, and it is false.** Three consumer-facing
     artifacts said, unqualified, that "a `0` with no warning is a zero the sender sent", one of them
     paired with "gate on the warning". **The warning is a property of a decimal READ; a slot a
     reader never READ cannot warn and still holds whatever its accumulator was seeded with.**
     Measured at head: `get837Claims` seeds `charge` / `units` at `X12Decimal.ZERO`
     (`get-837.ts:1114`) and `decodeSv1` / `decodeSv2` / `decodeSv3` each return before reading
     anything when `acc.variant` does not match, so a wire `8500` / `4 UN` reads back `0` / `0` with
     `warnings: []` - reachable from the wire (ST-03 `005010X222A2` on a file whose lines are `SV2`)
     and from `get837Claims(d, tx, { type: "P" })`. **`PRE-EXISTING`, identical at base, filed as its
     own item, NOT fixed here.** The remedy was to correct the claim, never to grow the guard: the
     guarantee is now stated as **unwarned `0` AT AN ELEMENT A READER DECODED**.
  2. **minor - the published outcome census was three and the true number is four.** The docs
     enumerated `ZERO` slot / optional slot / dropped `CAS`-`PLB` row and asserted "all three". A
     fourth: an `AMT` or `ADX` row is dropped WHOLE even with its qualifier present
     (`AMT*B6*1,234.56` in an 835 line, `ADX*-25.00USD*53*AZ*…` in an 820). The factory's own JSDoc
     had it right in the same commit ("or drop the row entirely") and the shipped prose was narrower.
     **This is `X12-NUMERIC-VALUE-EMITS-EMPTY` verbatim: the remedy is to CUT THE CLAIM BACK, not to
     grow the census. No census is published now.**
  3. **minor - the message asserted a spec fact nobody here has grounded.** It said the bytes "are
     not an X12 R-type decimal". Neither the message, the factory JSDoc, nor `X12_DECIMAL_RE`'s
     comment cites a clause of X12.6, and the test pins `"1e3"` as undecoded. **If type R permits an
     exponent, `1E3` is a conformant 1000 this library reads as `0`** - `PRE-EXISTING` behaviour in
     `X12Decimal.fromString`, untouched, but a NEW assertion. The message now says "could not decode
     as a decimal" and the JSDoc says outright that no clause is cited.

- **Findings the pass raised that are NOT this slice's, each reproduced at base and disclosed here,
  NOT fixed and - as pass 2 measured - NOT YET FILED. Each is owed its own umbrella backlog ID, and
  this repo cannot write one; the coordinator must. Do not read "disclosed" as "tracked":** the 837 variant/`SVx` silent `0` above (major, and the same harm class as this item);
  `X12Decimal.fromString` refusing a space-padded numeric (` 450.00`), so a fixed-width-padding
  sender's every amount reads `0`; and `get820Payments` dropping an `RMR` or `ADX` row when its
  leading qualifier elements are empty (`RMR***PI*500.00*500.00` loses a $500.00 row, `warnings: []`).
  Also queued out-of-repo: the `healthcare-integration:x12-transaction-author` crew skill claims
  `serialize(parse(s)) === s`, which this repo's own `CLAUDE.md` and `KNOWN-LIMITATIONS.md` deny.

- **A sibling changeset was corrected in the same commit.** `.changeset/sour-bottles-repeat.md`
  (`#64`) said `undefined` at a quantity site "raises no warning", which this slice makes false in
  the same release. `KNOWN-LIMITATIONS.md`'s SVC entry said the same and was corrected too.
  **Correct the disclosure in the same commit as the fix that makes the new wording true.**

## X12-SVC-ELEMENT-MAP-OFF-BY-ONE (2026-08-04)

- **🩺 THE 835 SVC ELEMENT MAP WAS OFF BY ONE IN BOTH DIRECTIONS AND IS FIXED
  (2026-08-04, `X12-SVC-ELEMENT-MAP-OFF-BY-ONE`). BREAKING on a published
  surface.** `get835` read `revenueCode` from SVC-05 and `paidUnitsOfService`
  from SVC-07; `build835` wrote them there and hard-coded SVC-04 empty behind a
  comment asserting "revenue code is SVC-05 in X221A1; SVC-04 unused". **That
  comment was wrong.** SVC-04 is the NUBC revenue code (element 234, a
  **string**), SVC-05 is Units of Service **PAID** Count (element 380, a
  **Quantity**), SVC-07 is **ORIGINAL** Units of Service Count (element 380).
  `revenueCode` -> SVC-04, `paidUnitsOfService` -> SVC-05, and
  **`originalUnitsOfService` is NEW** at SVC-07.

  **▶ THE NEW FIELD IS REQUIRED, NOT CONVENIENT.** Element 7 was read at base
  (mislabelled). Fixing only the two positions would have left SVC-07 unread
  and unwritten - **converting a mis-read into a fresh silent drop**, the
  direction this repo's house invariant calls the dangerous one. Retention is
  non-decreasing on purpose.

  **▶ MEASURED, BOTH DIRECTIONS.** Across the six committed remit fixtures plus
  the golden, **8 of 8 service lines** read `revenueCode: "1"` at base - not a
  valid NUBC revenue code, it is the paid count from SVC-05 - with
  `paidUnitsOfService` `undefined`. On emit, revenue code `0300` + 2 paid units
  gave `SVC*HC:99213*600.00*550.00**0300*HC:99212*2`, **a revenue code inside a
  Quantity element**, so a conformant receiver reads 300 units. Head:
  `SVC*HC:99213*600.00*550.00*0300*2*HC:99212`.

  **▶ 🩺 THE WHOLE SUITE STAYED GREEN THROUGH THE FIX, AND THAT IS THE REAL
  FINDING.** All 1,227 tests passed with the corrected map applied. **The item
  predicted `transactions-remit-835-build.test.ts:532-560` would turn red and it
  did not** - it is a `build835` -> `get835` round trip, green for ANY pair of
  positions the two modules agree on, including a wrong one. **A round trip
  cannot test an element map; only bytes can.** The map is pinned literally in
  `test/transactions-remit-835-svc-element-map.test.ts`: **11 of 11 red on
  `e3cdf49`, 11 of 11 green at head.** Do not weaken those to round trips.

  **▶ THE REPO CONTRADICTED ITSELF AND THE 277 WAS RIGHT ALL ALONG.**
  `build277`/`get277Status` use SVC-04, `build-277-types.ts` says so in prose,
  and **every committed 835 fixture is written to the correct map** (`**1` is an
  empty SVC-04 and one unit paid). Only the 835 module disagreed - with itself.
  A cross-transaction test now pins the two together.

  **▶ SOURCES, AND WHAT WAS NOT READ. TR3 005010X221A1 IS PAID AND NOBODY HERE
  HAS READ IT.** Grounded on **pyx12's machine-readable `835.5010.X221.A1.xml`**
  (an independent open-source implementation of the same guide, carries the whole
  table, and is **the source for SVC-04**); X12's own RFI #2163 for SVC-05; the
  base 005010 element dictionary (**SVC-04 is a string and SVC-05/07 are
  Quantities, which rules out a revenue code at SVC-05 on type alone**); and two
  published payer companion guides. Listed with links in `KNOWN-LIMITATIONS.md`.
  **▶ AGREEMENT WITH THE 277 IS CORROBORATING, NOT A SOURCE.** It is what
  surfaced the defect, but checking a spec claim against this repo's own
  implementation only proves the two agree - which is how the wrong map survived.

  **▶ AN ABSENT SVC-05 IS NOT DEFAULTED TO ONE**, though X221A1 is _reported_ to
  assume one (that is the RFI's Description, quoted secondhand, not a clause read
  from the TR3). Fabricating a count the sender did not send is inventing.
  **▶ AND `undefined` MEANS "NOT DECODED", NOT "ABSENT"** - the element may have
  been present and unparseable, which warns nothing. Pre-existing at every
  quantity site; disclosed, not fixed. The **277's** SVC-07 is still not decoded
  either, and per pyx12's map it is **usage R (required) in X212** - so an
  **X212** 277 this library emits **with a service line** is short a required
  element. **Do not widen that:** in **X214** the same element is usage `S`, so
  `build277CA` is unaffected, and a 277 with no service line emits no SVC and is
  missing nothing. `PRE-EXISTING`, reproduces at `e3cdf49`, filed not fixed.
  **▶ 835s THIS LIBRARY EMITTED AT `0.0.9` OR EARLIER ARE NON-CONFORMANT AND
  SHOULD BE RE-EMITTED**: their revenue code sits in SVC-05, so head reads it
  back as a paid quantity (`0300` -> 300 units) with no warning.

## X12-DECIMAL-BYPASSES-THE-GUARD (2026-08-04)

- **🩺 A RAW `number` IN AN `X12Decimal` SLOT NOW REFUSES, AND THE TYPE CHECK IS
  STRUCTURAL RATHER THAN A LIST (2026-08-04, `X12-DECIMAL-BYPASSES-THE-GUARD`).**
  Closes both classes `#60` disclosed and deliberately did not fix.

  **THE DECIMAL HALF.** `makeCallerEscaper` checks what reaches `esc`, but an
  `X12Decimal` slot hands `esc` a `value.toString()`, and a raw `number` answers
  that with a perfectly good string - so it arrived already a string and the
  guard never applied. Measured at `15abbd4`, `warnings.length === 0` every
  time: `patientResponsibilityAmount` of `0.1+0.2` emitted
  `CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…`, `1e21` emitted
  `…*1e+21*…`, `NaN` emitted `…*NaN*…`, `units` reached
  `SV1*HC:99213*150.00*UN*0.30000000000000004***1` and a diagnosis
  `monetaryAmount` reached `HI*ABK:J20.9:::0.30000000000000004`.
  **TWO OF THE THREE RENDERINGS THIS LIBRARY CANNOT PARSE BACK** - `X12_DECIMAL_RE`
  rejects exponent notation and `NaN` - so they did not round-trip. Every slot
  now emits through the builder's `escDec` over `requireCallerDecimal`.
  **REFUSE, NOT ROUND, AND THAT IS THE DECISION:** `0.30` guesses cents, `0.3`
  guesses tenths, and guessing the scale of money is what `X12Decimal` exists to
  prevent. No supported path is taken away - every one of these slots is _typed_
  `X12Decimal` already.

  **▶ THIS IS NOT THE HARM `#60` FIXED AND THE DIFFERENCE IS THE PRIORITY CALL.**
  `#60` existed because a required identifier VANISHED. Nothing vanishes here and
  nothing is mis-_read_; the library renders faithfully what a JS caller handed
  it. The exposure is float noise on the wire. Do not flatten the two.

  **THE RAW-SLOT HALF.** Routed through `esc`: `build999`'s GS-06/GE-02,
  ST-02/SE-02, AK9-01, IK5-01 and GS-07; `groupDate`/`groupTime` (GS-04/GS-05) in
  **all seven** domain builders, not just the 999; `build278`'s HL-03;
  `build837`'s LX-01. That closes their delimiter hole too - `"1*BOGUS"` in a 999
  `groupControlNumber` emitted `GS*FA*…*1*BOGUS*X*005010X231A1`, shifting
  GS-07/GS-08 by one, and now reads `1?*BOGUS`.

  **▶ AND THE PART THAT IS A PROPERTY RATHER THAN A LIST, WHICH IS THE POINT.**
  Three drafts of `#60` published an exhaustive census of the slots that bypass
  `esc` and a refuter measured **all three** false, each time by finding one
  more. A census is the wrong instrument: **`esc` is optional on a slot, the
  segment join is not.** `requireCallerSegment` type-checks every element of
  every segment emitted **through a builder's `seg`/`joinSeg` helper** on every
  route in, so one more slot cannot falsify it.
  It also **names the slot the way the spec does** (`build999: "AK9"-01 must be a
string`), which `esc` cannot, being unary - that limit is gone for the segment
  guard and still stands for `esc`.

  **▶ WHAT IS STILL NOT CLAIMED, AND SAYING SO IS THE POINT OF THE ABOVE.**
  **Type safety is structural; DELIMITER safety is per-slot.** A `string`
  carrying an active delimiter in a slot that skipped `esc` is still emitted
  verbatim - the segment guard passes it, because it is a string. Only the slots
  named above were routed. And the fixed-width **ISA** line is joined directly,
  not through `seg`/`joinSeg`, so it is outside BOTH guards: `pad(1, 15)` still
  throws an untyped `TypeError` and `padControl(1, 9)` still throws the
  misleading "exceeds the 9-char spec limit". Both terminate; neither is silent.

  **▶ THE REFUTER REFUSED PASS 1 ON EXACTLY THIS, AND IT WAS RIGHT.** The first
  draft dropped the `seg`/`joinSeg` qualifier and published "any builder emits"
  in six places. **`buildTA1` uses NEITHER helper** - it joins its five
  caller-supplied elements directly, no `esc`, no `pad` (it imports none) - so
  `TA1**250101*1200*A*000` still emits silently for a numeric or `undefined`
  control number. **TA1-01 is data element I12, the reassociation key back to the
  acknowledged interchange**, so this is the same class `#60` closed and it is
  filed as its own item rather than widened into here. The gate test's first
  rationale for excluding it ("one fixed-width line with no variable elements")
  was **false on both halves** and is corrected. **This was the FOURTH iteration
  of the completeness claim the item exists to stop - do not write the unqualified
  form again.**

  **▶ AND `build835`'s BALANCE-EQUATION AMOUNTS REFUSE UNTYPED, WHICH THE FIRST
  DRAFT ALSO OVERCLAIMED.** `enforceBalance(spec)` runs BEFORE the escaper is
  built and calls `X12Decimal` methods on the caller's value, so
  `requireCallerDecimal` is unreachable on anything it reads: a plain `TypeError`
  with **no `code`**, some saying the value was "tampered with", which is a
  misleading thing to tell someone who passed a number.
  **▶ THE FIRST REMEDY FOR THIS PUBLISHED A CLOSED LIST OF FOUR AND PASS 2
  MEASURED IT INCOMPLETE; THE SECOND NAMED THE SLOTS BY ELEMENT NUMBER AND PASS 3
  FOUND ONE WRONG. THAT IS THE SAME CENSUS FAILURE TWICE INSIDE THE FIX FOR IT.
  STATE THE RULE, AND NAME SPEC FIELDS - NEVER ELEMENT NUMBERS:** a slot refuses
  **untyped exactly when the balance guard reads it as a term of one of the THREE
  §1.10.2 invariants** in `src/transactions/remit/balance.ts` -
  `payment.totalActualPayment`, `claim.totalChargeAmount`,
  `claim.totalPaymentAmount`, every `adjustments[].amount` at claim and line
  level, `serviceLine.chargeAmount`, `serviceLine.paymentAmount`,
  `providerAdjustments[].amount`. Every other `X12Decimal` field refuses
  **typed**. **The element numbers are what went wrong: a draft published
  `serviceLine.paidUnitsOfService` as "SVC-05", and this repo emitted it at
  element 7** (`revenueCode` was what it put at 5). Field names cannot drift
  that way.
  **▶ AND THE CORRECTION ITSELF WAS BACKWARDS, WHICH IS THE SHARPER LESSON.
  THE DRAFT WAS RIGHT AND THE REPO WAS WRONG.** SVC-05 **is** the Units of
  Service Paid Count; the 835 module was off by one in both directions and was
  fixed by `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (see the entry at the top).
  Grading the prose against the code found "one wrong" and filed the
  **conformant** value as the defect, because the code was the thing that was
  wrong. **Checking a spec claim against this repo's own implementation is not
  a check** - it only proves the two agree. Ground an element number in a
  source outside the repo, or state a field name and no number at all. Both
  arms are pinned on one fixture, so moving a slot between them reds
  the gate. Reordering the balance
  guard changes the refusal precedence of an out-of-balance remit, so it is
  disclosed, not fixed.

  **▶ FOUR OF THE SIX NEW BEHAVIOURAL CASES WERE VACUOUS AND THE CLASS-ONLY
  ASSERTION IS WHY.** `expect(run).toThrow(Remit835BuildError)` passes on
  "at least one TRN trace is required" just as happily as on the refusal being
  tested. The four causes, corrected after pass 2 named one of them wrongly:
  `build835` missing `traces` **and** using `paymentMethodCode` for `method`;
  `build820` missing `remittances`; and `build271`/`build277` given FLAT specs
  where both take nested `informationSources -> receivers -> …`. (`build834` and
  `build837P` were the two that were never vacuous - an earlier draft of this
  paragraph blamed 834's `amounts` placement, which was correct all along.)
  **Assert the MESSAGE, not the class**, in every builder-refusal test here -
  including the disclosure pins, where `instanceof TypeError` alone is satisfied
  by any unrelated `TypeError` a mis-named fixture field produces.

  **▶ THE EXISTING ARRAY-BOUNDS GATE CAUGHT A REAL DEFECT IN THE FIRST DRAFT OF
  THE NEW GUARD, AND IT IS WORTH KNOWING.** `for (let i = 0; i < parts.length;
i += 1)` over a forged `{ length: undefined }` array-like compares `0` against
  `undefined`, gets false, runs **zero** iterations, and reports every segment
  clean without examining one element - the same defect this guard exists to
  stop, one layer up. It iterates with `for...of` now, which throws instead.
  **The scanner is not comment-stripped for that rule**, so writing the bad shape
  in a comment reds it too.

  **Counts that moved and are pinned:** `esc` invocations **411 -> 406** on
  **378 -> 377** lines; same-line `esc(x.toString())` **36 -> 5**, and those five
  are the `escDec` declarations themselves. `build-837` also declares `decStr`
  (`escDec` without the escape) because SV1-04/SV2-05/SV3-06 share one `units`
  read and HI's components go through `ctx.comp`, which maps `esc` - escaping
  there would double-release. (That third position read `SV3-05` here and in two
  `build-837.ts` comments until `X12-837-SV-SILENT-ZERO` corrected the prose to
  the code: both the emit and `decodeSv3` have always used element 6, and
  SV3-05 is the prosthesis/crown/inlay code.)

  **Prose defects `#60` shipped, now fixed:** a `## Six limits` heading over five
  limits; "no total is published" asserted while publishing one; the count
  republished **unqualified and understated** on the consumer-facing
  `docs-content/spec-notes-money.md`; and **"X12 code source 715" in five places**
  - 715 is the _data element_ number and its values are a code **list**, which
    this repo's own `src/transactions/ack/codes.ts` had right all along.

## X12-NUMERIC-VALUE-EMITS-EMPTY (2026-08-03)

- **🩺 A NUMBER IN A STRING ELEMENT NOW REFUSES INSTEAD OF EMITTING `""`
  (2026-08-03, `X12-NUMERIC-VALUE-EMITS-EMPTY`). THE DELIVERABLE IS A DECISION,
  AND THE DECISION IS _REFUSE, NEVER COERCE_.** `escapeRelease` read
  `value.length`, `undefined` on a number, so the early return did not fire, the
  loop never ran, and it returned its empty accumulator. **The value vanished
  with no warning and no error.** All nine builders now take their `esc` from
  `makeCallerEscaper` (`src/builder/caller-string.ts`), which type-checks first
  and refuses with the calling module's own typed, code-tagged error.

  **MEASURED AT BASE `143a6ea` BY DRIVING THE SHIPPED TABLE AGAINST A `143a6ea`
  WORKTREE, NOT ASSUMED.** Eight builders, one element each, string arm vs
  number arm: `BPR*A1*450.00 -> BPR**450.00`, `AK2*837*A1*… -> AK2*837**…`,
  `NM1*…*34*A1 -> NM1*…*34`, `ENT**2J*34*A1 -> ENT**2J*34`, `NM1*…*MI*A1 ->
NM1*…*MI`, `NM1*1P*2*A1 -> NM1*1P*2`, `UM*HS*I*A1 -> UM*HS*I`, and
  **`CLM*A1*150.00\*… -> CLM**150.00*…`**. Where the dropped element was
trailing, `seg`'s trailing-empty trim removed it outright, so it is not even
positionally recoverable. **The filed 835 case reproduces exactly**:
`CLP\*\*1*500.00*450.00*50.00*MB*ICN-9001\*11::1`with`warnings.length === 0`.

  **▶ THE 837's CLM-01 IS THE OTHER END OF THE SAME LINK AND WAS IN NO FILED
  RECORD.** CLP-01 reassociates a remittance back to CLM-01; one line could drop
  **both**.

  **▶ THE BUILDER'S OWN REQUIRED-FIELD GUARD WAS DEFEATED, WHICH IS THE SHARPEST
  PART.** `build-835.ts` refuses `patientControlNumber === ""` by name. A number
  is not `""`, so it passed the guard and became `""` one line later.

  **▶ WHY REFUSE AND NOT COERCE, WHICH IS THE WHOLE ITEM.** Coercion mints a
  _different_ identifier: a JSON payload that carried `"0012345"` as a number
  already lost the leading zeros, so `String(12345)` emits a well-formed id that
  is **not the one the caller sent**, and reassociating to the wrong claim is
  worse than failing to reassociate. `String(1e21)` is `"1e+21"`, `String(NaN)`
  is `"NaN"`. None are valid `AN`/`ID`/`Nn` content, and `X12Decimal` is
  already the sanctioned numeric route. No working caller breaks, because the
  numeric path did not work; it silently lost the field.

  **▶ THE `#51` ASYMMETRY IS DELIBERATE, NOT AN INCONSISTENCY.**
  `renderCallerValue` **coerces** for this same caller mistake because a refusal
  message that throws destroys the `code` surface consumers branch on; `esc`
  **refuses** because a document must invent nothing. _Survive anything_ vs
  _invent nothing_. Opposite duties, opposite answers.

  **▶ TWO DRAFTS PUBLISHED AN EXHAUSTIVE COUNTED CENSUS OF WHAT BYPASSES THE
  CHOKEPOINT AND A REFUTER MEASURED BOTH FALSE. THE MECHANISM WAS RIGHT BOTH
  TIMES; THE CLAIM WAS TOO WIDE BOTH TIMES.** First "the single route a
  caller-supplied ELEMENT VALUE takes into an emitted segment", then "SEVEN
  string-typed positions" - each round found more (GS-04, GS-05, GS-07,
  `build837`'s LX-01). **The remedy on round three was to CUT THE CLAIM BACK, not
  to grow the census**, per the refuter's own convergence call: the guard covers
  values routed through `esc`; other positions, including some envelope,
  control-number and line-counter slots, are emitted raw. Not a census. **If you
  find one more, that is expected and is not a new finding.** All of it is
  `PRE-EXISTING` and outside the item's stated `esc()` scope.

  **AND THE THIRD ROUND KILLED THE LAST COUNT TOO.** `esc` slots that read
  `.toString()` off an `X12Decimal` let a raw `number` through as a string, and
  the slice published that class as "THIRTY-SIX, exhaustive, because the gate
  asserts it file by file". **The gate asserts a same-line REGEX, which pins it
  against drift and says nothing about the property** - `build-837` alone has
  three off-line reads the regex misses (`const units = line.units.toString()`
  then `ctx.esc(units)`; two `.toString()`s inside a `ctx.comp([...])` that maps
  `esc`), so `SV1*HC:99213*150.00*UN*0.30000000000000004***1` and
  `HI*ABK:J20.9:::0.30000000000000004` also ship with zero warnings. **The file
  contradicted its own limit 4 twenty lines earlier** ("a strong tripwire for the
  shape this library uses, not a proof"). Head, `warnings.length === 0`: a
  `patientResponsibilityAmount` of `0.1+0.2` emits
  `CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…`, `1e21` emits
  `…*1e+21*…`, `NaN` emits `…*NaN*…` - **the exact three strings this slice's own
  prose names as disqualifying.** Examples, not a census. **No total is
  published, on purpose.**

  **THE SHARPEST KNOWN RAW SLOT IS `build999`'s `functionalGroup.disposition`
  (AK9-01)**, an `ID` element bound to X12 code list 715: `AK9*12345*1*1*1`
  with zero warnings, and `build999`'s own `X12_ACK_ACCEPT_WITH_ERRORS` guard
  compares `disposition === "A"`, which a number walks past exactly as it walked
  past `patientControlNumber === ""`. **Same mechanism, unfixed, in a builder
  this slice otherwise fixes.** Worth its own item together with the
  `PRE-EXISTING` delimiter injection the raw slots admit (`build999` with
  `groupControlNumber: "1*BOGUS"` emits `GS*FA*…*1*BOGUS*X*005010X231A1`, shifting
  GS-07/GS-08 by one; `build837` with `lineNumber: "1*BOGUS"` gives `LX*1*BOGUS`;
  both zero warnings. `build834`'s `groupControlNumber` DOES go through `esc` and
  correctly gives `1?*BOGUS`, which is the difference the helper makes). **Not stop-the-line: these fail at the receiver, they do
  not mint a wrong clinical value.**

  **ALSO NOT FIXED, PINNED AS RESIDUALS:** the fixed-width ISA slots go
  through `pad`/`padControl`, not `esc`. `pad(1, 15)` throws an untyped
  `TypeError` and `padControl(1, 9)` throws a **typed but MISLEADING** "exceeds
  the 9-char spec limit" for a one-digit number. Neither is silent, so neither is
  this defect - but that is a property of those two slots and not of the
  envelope, since GS-04 and GS-05 above are envelope elements and ARE silent.
  `buildTA1` has no `esc` at all (**and no `pad` either - the "every element
  fixed-width" reason recorded here was false in both halves; all five elements
  are caller-supplied and the module imports no `pad`**). And
  the refusal names the **builder, not the element position**: `esc` is unary and
  **invoked 411 times on 378 lines** (comment-stripped, `ctx.esc(...)` included,
  and the gate asserts both numbers). **The first draft published "378 call
  sites", which is the LINE count** - the same class of miscount this repo has
  now shipped twice. And **"no working caller is broken" was too absolute**: a
  boxed `new String("PT-ACCT-001")` built at base and is refused at head.

  **Public surface change:** exported `escapeRelease` now **throws `TypeError`**
  on a non-string instead of returning `""`. A `TypeError` on purpose: it is a
  pure text utility with no spec context to name, and nothing in the library can
  reach it because the builders refuse first.

## PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX (2026-08-03)

- **THE SUITE'S START-UP TAX IS GONE AND `testTimeout` NOW STATES ITS OWN SCOPE
  (2026-08-03, `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX`). NO TIMEOUT VALUE
  CHANGED, AND THAT IS THE FINDING, NOT AN OMISSION.** Test + config only;
  `scripts/phi-scan.ts` and `scripts/attw.mjs` untouched.

  **TRIMMED, NOT BOUNDED.** `test/scripts/phi-scan.test.ts` went from **32 spawns
  across 32 cases, ALL under `tsx`**, to **36 spawns across 33 cases, 34 under
  `node` and 2 under `tsx`**: **30 `tsx` start-ups removed**, 2 kept on purpose in
  the equivalence case. **Counted at RUNTIME with a `spawnSync` shim, on BOTH
  trees.** **▶ AND THE FIRST DRAFT PUBLISHED "34, every one of them" IN FIVE
  PLACES, WHICH IS THE HEAD CENSUS PORTED ONTO THE BASE STATE** - the exact
  "a remedy's prose does not port with its code" trap the item names, committed
  while quoting the rule, and self-contradicted by this slice's own docblock. A
  refuter caught it. **Count both trees, and never reuse one census for the
  other.** The scanner is type-annotated Node that needs erasing and nothing more
  and **Node 22.18 or newer strips types itself**, so the spawns take
  `process.execPath`. Measured on this box (12-CPU cgroup quota,
  `availableParallelism()` **12**, other workers running, load average 8.9 to
  11.3 - **the item's 2.0-CPU / `nproc` 56 figure is STALE, re-derive it, do not
  inherit it**): one start is **441 ms** median under `tsx` against **149 ms**
  under `node`, seven runs each. **Interleaved BASE/HEAD, two rounds each**, so
  the arms share a load condition: that file goes **17.2 / 17.5 s to 8.6 / 8.6 s**
  in-suite, **15.7 s to 6.6 s** alone, and total CPU across workers **58.9 / 58.4 s
  to 50.5 / 49.5 s**. The first attempt at this measurement compared a base run
  and a head run taken an hour apart and showed a **2.4x** whole-suite win that
  was mostly the box getting quieter; **every figure here is interleaved.** Those
  medians **predict 8.2 s and not 9.1 s** (32 conversions at 292 ms, less the 4
  starts the new case adds), so the model is the right shape and **about 11%
  light**; the first draft claimed a 1% fit, which was the miscount again.

  **▶ THE SUBSTITUTION IS PINNED AS AN EQUIVALENCE, NOT ASSUMED.** `pnpm phi-scan`,
  the pre-commit hook and CI still run `tsx`, so one new case drives BOTH runners
  over the same violator and the same clean file and requires the same exit code,
  stdout and stderr. It is the only `tsx` spawn left in the file, and a simulated
  divergence reds it. Nothing else enforces erasable-only syntax: the shared
  `@cosyte/tsconfig` sets no `erasableSyntaxOnly`, and sets
  `verbatimModuleSyntax: FALSE`. **The Node 22.18 floor is likewise unenforced**
  (`engines.node` is `>=22.0.0`, no `.nvmrc`); it fails loudly rather than
  greening wrongly, and CI's `node-version: "22"` resolves past it.
  **SCOPE IT:** it drives `paths` mode only, so it pins exit 0 and exit 1 and
  **NOT** the exit-2 refusals, all-mode, or `--staged`. Deliberate: the only
  plausible divergence is at MODULE LOAD, which cannot be confined to the routes
  it skips. A non-load-time divergence would mean this case is too narrow.

  **▶ SAY WHAT IT BOUGHT AND WHAT IT DID NOT, BECAUSE THE TWO FIGURES DIVERGE.**
  It removed ~8.6 s of CPU and barely moved the critical path
  (**17.2 / 17.5 s to 16.3 / 16.7 s**), which is now `test/scripts/attw-gate.test.ts`.
  **Deliberately left alone, measured not asserted:** one `attw --pack` on a
  trivial two-file package is **1,596 ms** median, of which the real `npm pack` is
  **462 ms** and the rest is attw's own analysis. No runner to substitute, pinning
  the REAL binary is the point of that gate, and its cases already carry 60 s
  ceilings each.

  **▶ THE GLOBAL WAS LEFT AT 10 s ON PURPOSE, AND THE 834 STREAM IS WHY.** The
  three slowest suites already take **per-test** ceilings (834 stream 120 s,
  `attw-gate` 60 s/case, the 81-slot PHI sweep 120 s). The 10 MB+ 834 stream
  measured **8.9 / 10.0 / 9.3 / 9.1 s** across the four interleaved runs: it sits
  **AT the 10 s global**, and is green only on its own ceiling (**24.1 s** under
  heavier load, which is the unambiguous figure). **Do not upgrade the 10.0 s
  reading into a proven crossing** - the reporter rounds, so it is not evidence of
  which side it fell on, and a first draft asserted it anyway. Raising the global to fit
  it hands the same leash to all 1,100-odd tests and makes a genuinely hung test
  look slow rather than broken. The slowest test still under the global is ~1.2 s,
  about 8x headroom.

  **▶ AND IT IS NOT THE LIVENESS NET PEOPLE ASSUME.** Measured on this tree with
  vitest 4.1.4 under a deliberately tiny per-test ceiling: an **async** overrun
  reds at the ceiling; a **finite synchronous** overrun reds but only AFTER the
  work returns, so the verdict is late; an **infinite synchronous** loop gives
  **NO VERDICT AT ALL** and wedges the worker (killed from outside at 45 s, exit
  143, no pass/fail line). That is exactly what `X12-CALLER-VALUE-RESIDUALS` hit,
  where removing a `requireCallerArray` call spins a builder forever. **A liveness
  regression here reads as an ABSENT verdict, not a red one, and no value of
  `testTimeout` changes that** - the defence is the source scan in
  `test/builder-array-bounds.test.ts`.

## PHI-SCAN-SYMLINK-BLIND-ON-BOTH-ROUTES (2026-08-03)

- **🩺 THE PHI SCANNER WAS BLIND TO A SYMLINK ON BOTH ENUMERATING ROUTES, AND
  BOTH NOW REFUSE (2026-08-03, `PHI-SCAN-SYMLINK-BLIND-ON-BOTH-ROUTES`).**
  Ported from the graded `terminology#37`, re-measured here rather than copied.
  Measured on base `5779542` against a throwaway repo laid out like this one,
  with a synthetic name-bearing `.edi` payload (NM1 person name + DMG DOB + PER
  phone off the 555 convention + `REF*SY` SSN + a dashed SSN), which as a plain
  regular file is **exit 1 on the NM1 name detector specifically**:
  - **all mode**: `walk()` enumerates `Dirent.isFile()`, an **lstat** answer, so
    a link is neither a file nor a directory. A link under `test/fixtures`, a
    link under `src/`, and a **linked DIRECTORY** (a whole subtree) each printed
    `OK - no hits` at **exit 0**;
  - **`--staged`**: git stores a link as its **TARGET STRING** under mode
    `120000`, so `git show :<path>` handed back `../../<name>.edi` and never the
    bytes. **Exit 0.**

  Both refuse now (**exit 2**, the existing "could not complete" code), naming
  **every** offender with its own repo-relative path and a scanner-owned kind
  token. **Neither route FOLLOWS an ENTRY it enumerated** - following reads
  bytes the enumeration does not control, and git does not carry them, so a hit
  on them would be a claim about something no commit contains. **Say ENTRY, not
  "anything": a walk ROOT that is itself a link IS followed**, because
  `existsSync`/`readdirSync` both follow. Measured identically at base and head:
  with `test/fixtures` pointing outside, the walk enumerates the target's files
  under their `test/fixtures/*` names and **hits (exit 1)**. That is a superset
  scan, not a blind one, so it is left alone - but the absolute phrasing was
  wrong and a refuter caught it.

  **▶ THE ONE-LETTER BLOCKER, RE-DERIVED ON THIS TREE, NOT INHERITED:**
  `--diff-filter=AM` **drops status `T`**. Replacing a **tracked** regular file
  with a link is neither add nor modify: measured here, `--diff-filter=AM`
  returned **zero rows** while the unfiltered `--raw` showed
  `:100644 120000 <sha> <sha> T`, so the record died before any mode was read
  and the hook passed a mode-`120000` blob **green**. That slice set the filter
  to `AMT` (it is `AMTUB` today, see `PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT`) and
  the route reads `--raw -z` rather than `--name-only`, because the destination
  mode is the only thing separating a staged regular file from a link or a
  gitlink. Admitting `T` also closes the reverse typechange (link → real file
  bearing PHI). **Both directions are pinned, and dropping the `T` reds exactly
  those two tests.**

  **A REFUSAL NEVER REPORTS THE LINK TARGET**, which is working-tree text that
  can itself carry PHI. **That is not hypothetical here:** measured at base, a
  staged link whose target NAME was a dashed-SSN shape exited **1 and printed
  that shape**, because `git show` fed the path text to `scanCommonShapes`. The
  target shape is written out in prose rather than exemplified, because a
  diagnostic ABOUT a PHI leak is itself a PHI surface.

  **SCOPE NARROWED, NOT WIDENED.** The walk still excludes a gitignored entry
  (one boundary, not a second stricter one for links); `--staged` still sees only
  `test/fixtures/**` and `src/**.ts`. **A gitlink already exited 2 at base** - by
  `git show` failing and echoing git's own text - so it is **renamed, not newly
  caught**, and the test asserts the kind token AND the absence of
  `could not read`. **`paths` mode is deliberately untouched because it was never
  blind:** `readFileSync` follows a link, so a named path is scanned and hits
  (measured, exit 1).

  **DELIBERATELY DEFERRED, and the reason is direction:** x12 still carries the
  **enumerate-then-read race** (closed so far in `ccda`/`hl7`/`mllp`/`ncpdp`/
  `synth`). Its remedy TOLERATES a failed read; this one NARROWS what the
  enumeration admits. Shipping both together would mean one commit that both
  widens and narrows the same gate. x12 is also not reachable through it today
  by the same **scope accident** the org survey recorded: the walk roots are
  `test/fixtures` and `src`, so a repo-root `tsup` transient is never enumerated,
  and **this repo's own `test/scripts/phi-scan.test.ts` mkdtemps under
  `os.tmpdir()`, not under a scan root** - unlike `mllp` and `ncpdp`/`synth`,
  which seeded transients inside theirs. Not a measured hang, and **any widening
  of a walk root reintroduces it verbatim.**

  **INHERITED AS DISCLOSURE, NOT SILENTLY RE-CLOSED, AND SINCE CLOSED:** this
  slice left `R`/`C` rename/copy **not enumerated by `--staged` at all**, on the
  reasoning that admitting them needed the two-path record shape handled and was
  therefore a scope decision. **That reasoning was wrong and the disclosure is
  now historical:** `PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT` (2026-08-06) closes it
  with `--no-renames`, at zero stride cost, along with three more holes of the
  same family. Read that section, not this paragraph, for the measurements; the
  R-score quoted here was deleted rather than corrected, because a similarity
  score drifts with the fixture. **Also inherited as disclosure and SINCE
  CLOSED:** this slice left no refuse-a-scan-that-observed-nothing rule
  (`ccda#80`'s, which `terminology` never had either);
  `PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL` (2026-08-06) closes it, together with the
  regular-file walk root, and that section carries the measurements. **Still true
  and unchanged:** **all-mode remains the backstop** for what pre-commit misses,
  so a gap there is a gap at pre-commit and not in CI.

  **Negative controls both ways:** dropping the walk's non-regular branch reds 6
  tests, and `AMT` → `AM` reds the 2 typechange tests. No library code changed
  and no published type changed.

## X12-CALLER-VALUE-RESIDUALS (2026-08-02)

- **The two residuals `X12-BUILDER-BOUNDS` filed are closed: profile
  refusals are bounded, and a forged non-array REFUSES instead of HANGING
  (2026-08-02, `X12-CALLER-VALUE-RESIDUALS`).** Two parts, and **the second
  is the sharper one because it is a LIVENESS defect, not a disclosure one.**

  **(1)** `src/profiles/validate.ts` interpolated caller values into
  `X12ProfileError` verbatim. **Twelve refusal sites hold twenty-three
  caller-value holes**, and all twenty-three now route through
  `renderCallerValue` or the new `renderCallerJson`. **THE FILED FIGURE OF
  120,093 DID NOT REPRODUCE**, exactly as `#51`'s own filed figures did not:
  re-derived by driving the thirteen cases the suite ships against base
  `55ebc66`, the worst message is **360,181 characters**, at the `fixture`
  refusal. **THREE of the thirteen exceed 360,000**, and they are exactly the
  three that name THREE caller values rather than two (profile name + quirk id +
  a `JSON.stringify`d value). Head: the same case measures **431**.

  **▶ AND THE FIRST DRAFT OF THIS SLICE PUBLISHED 240,092, WHICH IS THE
  `sourceCategory` SITE AND NOT THE MAXIMUM.** It came from a side probe rather
  than from the table the suite runs, which is the same error class the item was
  filed to correct, one item later. **Drive the shipped table.** And **431 is a
  measurement at a 120,000-character value, not a maximum**: the
  ` (N characters)` suffix widens with the decimal width of the length, so the
  same refusal measures 434 at 1,000,000 and 437 at 10,000,000. That site's
  derived ceiling is **443**, and the suite asserts every site under 500. `renderCallerJson` exists because the value's
  TYPE is what is wrong at those sites - `null` and `"null"` are different
  mistakes and a coercing renderer flattens them - so it keeps `JSON.stringify`
  and bounds its OUTPUT; it never throws (circular, `BigInt`, hostile `toJSON`)
  and fabricates no closing quote, because JSON does not always open one.
  **`X12ProfileError.profileName` is deliberately NOT bounded** and that is
  asserted as a test: it exists so a consumer can pinpoint which of their
  definitions failed, and truncating it would stop it matching what they passed.

  **▶ AND THE `QUIRK_ID_RE` COMMENT CLAIMED A BOUND THE PATTERN NEVER HAD.**
  It said "2-64 lowercase-alphanumeric chars"; the regex accepts one character
  and accepts 120,000, which is in fact the path to the largest message on the
  tree. **The comment was corrected to the code, not the grammar tightened** -
  rejecting ids that define cleanly today is a separate decision from bounding a
  message.

  **(2) 🩺 THE DOMAIN BUILDERS TOOK THEIR LOOP BOUND FROM A CALLER-SUPPLIED
  `.length`.** A forged `{ length: "9".repeat(120000) }` coerces to `Infinity`
  in `m < spec.members.length`, every element read is `undefined`, every guard
  `continue`s, and the builder **spins forever instead of refusing**. Measured
  at base with a 20-second wall-clock timeout in a child process (a hang cannot
  be observed in-process), over the **nineteen** probes the suite ships:
  **16 HUNG** and 3 threw an untyped `TypeError`. All **32 indexed loops across
  7 builder modules** now take their bound from a `requireCallerArray` binding,
  and at head the same nineteen give **17 typed, code-tagged refusals** (169-194
  characters) and 2 untyped `TypeError`s. **`build835`'s `spec.traces` never
  hung** - it is a `for...of` residual this slice happens to close - and the
  first draft of the gate file claimed it did. **"14 of 16" was wrong too**: no
  shipped table yields sixteen probes.
  **`requireCallerArray` takes the module's `refuse` callback rather than
  throwing a shared error**, because each builder owns a distinct error class
  and code that consumers branch on, and a shared throw would quietly widen all
  nine contracts.

  **▶ A REGRESSION THE FIRST DRAFT CAUSED AND THE REFUTER CAUGHT, AND IT IS
  `#51`'s SHAPE AGAIN: THE FIX WAS WIDER THAN THE CLAIM.** Every site this
  replaced read its optional field as `x.dates ?? []`, and `??` treats `null`
  and `undefined` alike; guarding only `undefined` made `null` a refusal.
  Measured: `build834({ members: [{ ..., healthCoverages: null }] })` **emitted a
  valid 834 at base and drew `X12_834_BUILD_INVALID_SPEC` at the first head** -
  and _inconsistently_, since the same spec still accepted `references: null`,
  which is read with `for...of` and never moved onto the chokepoint. `null` is
  what a `JSON.parse`d payload carries for an absent list, from the exact caller
  class this module exists for. `requireCallerArray` now answers `null` as
  absent and base behaviour is restored; on a REQUIRED array it becomes the
  site's own "at least one X is required" refusal instead of base's untyped
  `TypeError` **for five of the six** (`build834` / `build820` / `build837` /
  `build271` / `build277`). **`build835`'s `claims` is the measured exception**,
  because `enforceBalance` reads `spec.claims.map` rather than the checked
  binding; it is no worse than base and is pinned by a test. The first draft of
  the remedy wrote that sentence unqualified, which is the same claim-width
  error one notch smaller, and pass 2 caught it.

  **▶ SCOPE THE CLAIM. This is a forged NON-ARRAY input, not a mis-read
  clinical value**, so it is not `STOP-THE-LINE`: nothing decodes a document
  differently, no dose / allergy / code system / patient identifier moves, and
  the reachable harm is **availability**. It is unreachable from TypeScript and
  reachable from JavaScript, JSON, and therefore `@cosyte/cli`.

  **▶ DISCLOSED, NOT FIXED, AND IDENTICAL AT BASE AND HEAD:** where a builder
  reads a caller array with `for...of` - `buildInterchange`'s `spec.groups`,
  `build999`'s `functionalGroup.transactionResponses`, and **every optional leaf
  array** (`claim.dates`, `member.references`, `header.references`) - a forged
  list throws `TypeError: ... is not iterable`. It **terminates**, so it is not
  the hang, but it carries **no `code`**. Pinned by tests so it cannot quietly
  become one, and in `KNOWN-LIMITATIONS.md`.

  **THE DELIVERABLE IS TWO SOURCE GATES, and `#51`'s was REUSED rather than
  copied.** `test/builder-refusal-bounds.test.ts` now also sweeps
  `src/profiles/*.ts` and matches `X12ProfileError`, so one allowlist governs
  both halves: **11 modules, 80 throw sites**, of which the builder half is
  **unchanged at 23 bounded sites / 28 holes** and the profile half is **12 / 23**.
  `test/builder-array-bounds.test.ts` is new and scans loop BOUNDS, requiring
  each to be a local produced by `requireCallerArray` - **it keys on the OPERAND,
  never on the property name**, which is the mistake `#51`'s allowlist made
  twice. Its scan strips comments first, because its own first draft flagged
  `caller-array.ts`'s docblock, which quotes the defect verbatim.

  **▶ THE NEGATIVE CONTROL FOUND SOMETHING WORSE THAN A RED.** Reverting one
  loop bound reds the scan by file and line, and reverting one profile
  interpolation reds the message gate by file and line. But **removing the
  `requireCallerArray` call outright does not fail the behavioural test - it
  WEDGES it.** A synchronous infinite loop never yields, so vitest's
  `testTimeout` cannot interrupt it; measured, the run had to be killed from
  outside at 60 seconds with no verdict. **The behavioural cases cannot report
  this regression**, which is the argument for keeping the source scan
  exhaustive rather than trusting the examples.

  **Known and NOT claimed away:** the same limits `#51` wrote down still hold.
  Bounding a message here **redacts nothing** (the caller passed the value in and
  still holds it), so this is not `PHI-WARNING-MESSAGE-LEAK`; the surviving
  characters are **not escaped**; the bound is on UTF-16 **code units, not
  bytes**; and both scans are syntactic tripwires for the shape this library
  uses, not proofs.

  **▶ TWO `PRE-EXISTING` FINDINGS THE REFUTER RAISED, MEASURED, FILED, NOT
  FIXED HERE.**
  **(a) 🩺 `escapeRelease` EMPTIES A NUMERIC CALLER VALUE SILENTLY, AND ONE OF
  THE SLOTS IS THE PATIENT CONTROL NUMBER.** `src/parser/release.ts` reads
  `value.length`; for a `number` that is `undefined`, `i < undefined` is false,
  the loop never runs, and it returns `""`. Reproduced **identically at base
  `55ebc66` and at head**: a `build835` spec with a numeric
  `patientControlNumber` and `payerClaimControlNumber` emits
  `CLP**1*500.00*450.00*50.00*MB**11::1` with **`warnings.length === 0`** and a
  frozen, "successful" interchange. CLP-01 is required by TR3 005010X221A1 Loop
  2100 and is the reassociation key back to the 837's CLM-01, so this is a
  **silently dropped patient identifier on the emit path**. The
  `claim.patientControlNumber === ""` guard does not catch a number. It is the
  same JS/JSON caller `renderCallerValue`'s own `coerce()` JSDoc names as real
  and reachable: `#51` coerced the **renderer** for that caller and left the
  **emitter** dropping the value. **Outside this item and NOT fixed here** - the
  remedy is a decision (coerce like the renderer, or refuse) across every
  `esc()` slot in nine builders, which is its own slice.
  **▶ CLOSED 2026-08-03 by `X12-NUMERIC-VALUE-EMITS-EMPTY`. The decision was
  REFUSE. See the top of this section.**
  **(b)** Neither new gate scans indexed loops outside the `build*` scope
  (`src/loops/define.ts`, `src/profiles/validate.ts`, the `get-*.ts` readers,
  `src/parser/envelope.ts`). Scope gap named, not a measured hang.

## X12-BUILDER-BOUNDS (2026-08-02)

- **Builder refusal messages are BOUNDED, and the 835 remit-total warning
  points at the BPR (2026-08-02, `X12-BUILDER-BOUNDS`).** Two parts.
  **(1)** Caller-supplied values reached `build*` refusal messages verbatim.
  Every route now goes through `renderCallerValue`
  (`src/builder/caller-value.ts`), capping the rendered **fragment** at
  `BUILD_REFUSAL_VALUE_MAX_RENDERED` = **90**; all three names are public so a
  consumer can assert the ceiling.

  **▶ THE CENSUS IN THE ITEM WAS SIXTEEN AND THE TRUE NUMBER IS TWENTY-THREE.**
  Re-derived here: 59 `throw` sites across 10 modules. Sixteen carry a
  caller-supplied **string** (nine over-long control numbers, one per emitting
  module, where the branch fires BECAUSE the value is over-long; seven with no
  length gate at all: `build999`'s ST-02 trace twice, `buildInterchange`'s
  ST-01, `build837`'s line variant, `build834`'s INS-03 + HD-01, `buildTA1`'s
  note code). **SEVEN more are in `build999`, found only by adversarial review,
  over two passes.** Four are the AK9-02 / AK9-03 / AK9-04 counts: typed
  `number`, which is exactly why a census of string-typed slots missed them, and
  the type is not a runtime guarantee, so a `JSON.parse`d spec reached a
  **120,063-character** `AckBuildError.message`. Three are `.length` reads on
  caller-supplied arrays, which a forged `{ length: "9".repeat(120000) }` drove
  to **120,152 characters**, larger than the figure the item was filed on.
  **23 sites, 28 holes** (one refusal names all three counts).

  **▶ THREE PUBLISHED FIGURES WERE WRONG IN THE FIRST DRAFT OF THIS SLICE, IN
  THE SAME RUN THAT WAS TOLD TO RE-DERIVE THEM.** `BUILD_REFUSAL_VALUE_MAX_RENDERED`
  was published as 92 in seven places and evaluates to **90** (63 + 2 quotes +
  1 ellipsis + 14 + 10). And "now produces a 90-byte message" was a **category
  error**: 90 is the ceiling on the interpolated FRAGMENT, while the message is
  the fragment plus the site's own template text. Measured on this tree, the
  `buildInterchange` control-number refusal against a 120,000-character value
  is **120,066 characters at base and 150 now**; the fragment is 86. The filed
  figures of 120,155 / 120,069 did not reproduce at all: they depend on the
  probe payload and which site was hit. **State a ceiling as a ceiling and a
  measurement as a measurement.**

  **▶ MAKE THE CLAIM YOU CAN SUPPORT. This is NOT
  `PHI-WARNING-MESSAGE-LEAK` on the emit side.** There the value was the
  DOCUMENT's, so bounding it was redaction. Here the caller passed it in and
  still holds it, so bounding redacts nothing; what it buys is a fixed ceiling
  on anything reaching a log line, a crash report or a JSON error envelope.
  Escaping was considered and **deliberately not done**, so a refusal message
  is bounded but **not** guaranteed to be one log line. **And the caller-vs-
  document dichotomy is NOT categorical, which the first draft got wrong:** TR3
  005010X231A1 requires AK2-02 to be a verbatim copy of the acknowledged ST-02
  and `buildTA1` echoes an inbound ISA-13, so on the ack path a DOCUMENT's
  control numbers reach a refusal by the standard's own design. Envelope
  control numbers, not clinical content, bounded like the rest, and now said
  out loud in all four docs.

  **The deliverable is the source gate**, `test/builder-refusal-bounds.test.ts`:
  it walks every `throw new *BuildError` in every builder module, extracts every
  interpolation hole, and requires each to be library-computed or wrapped.
  **Its first allowlist was itself the defect it exists to catch** - it admitted
  any `String(...)` on the stated ground that such a hole is a library-computed
  index, while inspecting nothing about the argument, which is precisely how
  the four AK9 counts passed clean. **Its SECOND allowlist was the same mistake
  again:** it admitted `String(<expr>.length)` as "an array length", which
  inspects the property NAME and not the operand, so a forged `{length}` sailed
  through. The `.length` escape is gone and those holes are bounded too; what
  remains allowed is only a single-letter loop index and the `width` literal,
  where no caller expression appears in the hole at all. **Negative controls run
  both ways:** reintroducing an interpolation into `buildTA1` reds three tests
  naming file and line, and reverting one AK9 count reds two. All 23 slots also
  carry a behavioural 120,000-character probe.
  **Known and NOT claimed away:** the gate keys on `throw new *BuildError(` and
  on template holes, so a message composed in a helper, built by `+`
  concatenation, or thrown via a local binding would slip past it. It is a
  strong tripwire for the shape this library actually uses, not a proof. The
  bound is also on UTF-16 **code units**, not bytes (an all-astral value is 86
  units and 152 bytes, and a slice at the bound can split a surrogate pair), so
  every published figure says "characters" deliberately.

  **(2)** The remit-total balance warning's `position.segmentIndex` was a
  literal `0`. **`0` is NOT a neutral sentinel here: `tx.segments[0]` is the
  `ST`**, so a consumer resolving the position landed on the ST. It is now the
  BPR's own 1-based body index (`tx.segments[idx].id === "BPR"`), matching what
  claims and service lines already had; the only remaining `0` is a transaction
  with no BPR at all. **`balance.ts` had documented the old `0` as deliberate**
  ("not a CLP and not the BPR"), so that doc was corrected with the code.

  **▶ THE BUILD-SIDE HALF WAS FILED AS THE SAME DEFECT AND IS NOT ONE.**
  `build-835.ts` also passed `segmentIndex: 0`, but measured: the builder has no
  parsed segment stream to index into (the segments do not exist until after the
  guard has passed), and it consumes only the warning's `.message`, which since
  `#46` is a registry lookup keyed by the invariant and therefore
  position-independent. The position is **inert by construction**, not merely
  unused. Fabricating a plausible index would have named a segment no consumer
  can resolve. It is now `UNANCHORED_BUILD_POSITION`, named and documented, and
  the stale "messages are numeric-only" JSDoc `#46` left there is corrected.

  **A REGRESSION THE BOUND CAUSED AND THE REFUTER CAUGHT:** reading `.length`
  where the base interpolated into a template literal turned a typed,
  code-tagged refusal into an uncaught `TypeError` with no `code`, for any
  JS/JSON caller passing a number where the types say string (`@cosyte/cli` is
  such a caller). `renderCallerValue` now coerces and never throws.

  **SE-01 asserted outright rather than trusted**, per the tripwire this repo
  has hit three times: SE-01 recomputed from the emitted segments, GE-01 and
  IEA-01 from the group and transaction counts, no
  `X12_SEGMENT_COUNT_MISMATCH` under `specClean`, and recomputed counts
  byte-identical to the plain emit. The refuter independently confirmed
  `serializeX12(parseX12(f))` byte-identical at base and head across all 56
  fixtures.

  **PRE-EXISTING, filed not fixed HERE, and CLOSED by
  `X12-CALLER-VALUE-RESIDUALS` (see the entry above):**
  `src/profiles/validate.ts` interpolated caller values unbounded into
  `X12ProfileError`. **The 120,093 figure filed here did not reproduce** on
  re-derivation; the worst measured at base is 360,181.

## X12-ORPHAN-REEMIT (2026-08-02)

- **The round-trip half is closed too: an orphan is re-emitted at a
  STRUCTURAL ANCHOR (2026-08-02, `X12-ORPHAN-REEMIT`).** The bullet below
  closed the model half and deliberately left this open, because the
  obvious remedy was refuted. **The fix is the anchor, not the
  re-emission.** `X12OrphanSegment.anchor` records which slot of the typed
  tree the segment sat in - `{kind:"interchange",groupIndex}`,
  `{kind:"group",groupIndex,transactionIndex}`, or
  `{kind:"transaction",groupIndex,transactionIndex,segmentOffset}` - and
  `serializeX12` places every orphan by that and **never** by
  `segmentIndex`. An index equal to the eventual length means "after the
  last one" (just before the `GE` or `IEA`); `segmentOffset` is never `0`
  because `rawSegments[0]` is the `ST`; and the `transaction` kind is
  reachable **only by a `TA1`**, since anything else arriving inside an
  open `ST..SE` is body content. An anchor survives both reorderings the
  emit performs (the `ta1Segments` hoist, the skipped zero-length segment)
  because it names a slot rather than a byte offset - which is exactly
  what a raw index could not do.
  **Measured, not asserted:** a stray segment inserted at every position
  of a two-group / three-transaction interchange, five segment ids (`ZZ`,
  `SE`, `GE`, `ST`, `TA1`) covering all five orphan `context` values and
  all three anchor kinds. **50 of 50** orphan-producing insertions
  round-trip **byte-exactly** on a base with no envelope `TA1`; on the same
  base _with_ one, **0 of 54** are byte-exact but **54 of 54** are
  byte-identical once the `TA1` is deleted from both sides - the only thing
  that moved is the `TA1`, which moves on that base with no orphan at all.
  Across all 104: transaction bodies, `orphanSegments` (raw + context +
  anchor), `ta1Segments`, `trailingBytes` and the warning multiset are
  unchanged by the round trip, and every emit is a fixed point.
  **The canonical list drops from SEVEN to SIX**, and the count of silent
  constructs stays five - because the construct that left the list is the
  one that _warned_. Only post-IEA `trailingBytes` warns now.
  **DELIBERATELY NOT IN SCOPE, and still on the list as case 6:** the
  empty-first-element segment (`*A*B~`) outside a transaction. It is
  skipped by the walker, so there is nothing on the model to re-emit;
  closing it is a RETENTION change to the `name.length > 0` guard, not a
  round-trip one, and it would mint `X12_UNEXPECTED_SEGMENT` warnings where
  there are none today. Unchanged and byte-identical on base.
  Retention and placement are still **not promotion**: no `get*` reader
  sees an orphan, and a `TA1` inside a group still does not join
  `ta1Segments`. Registry unchanged at 22 codes + 4 fatals; nothing became
  fatal. **The four regression tests from the refuted replay were kept
  verbatim and are green** - they assert an orphan never becomes
  transaction CONTENT (never joins `rawSegments`, which is what every
  `get*` reader walks), never corrupts SE-01 or SE-02, never fabricates or
  truncates a transaction, and never crosses the IEA into `trailingBytes`.
  **State that at the MODEL level, not the byte level:** a
  `ta1-inside-group` orphan IS written back between the `ST` and the `SE`,
  because that is where it came from, so "never lands inside a transaction"
  would be simply false.

  **▶ THE REFUTER FOUND ONE INTRODUCED DEFECT HERE, AND IT WAS SE-01
  AGAIN.** Pass 1 emitted the `TA1` back inside the `ST..SE` while
  `segCount` still counted only `tx.rawSegments`, which excludes the lifted
  `TA1`. So spec-clean mode described bytes it had not written: measured,
  `{specClean, recomputeCounts}` **rewrote a CORRECT `SE*4*` down to
  `SE*3*` over four emitted segments**, and the inverse input (`SE*3*`)
  drew no mismatch warning at all. Base was safe only because it dropped
  the segment, so the model count and the emitted count agreed by
  accident. **SE-01 is "segments included in the transaction set,
  including ST and SE" (X12.6), so it must count the bytes the serializer
  writes, not the model rows** - `segCount` now adds every orphan flushed
  between the `ST` and the `SE`, and an orphan flushed before the `ST` or
  after the `SE` is correctly not counted. Now idempotent under the
  library's own gate: recompute, re-parse, re-reconcile raises nothing and
  is byte-stable. GE-01 and IEA-01 are unaffected, because an orphan is
  never a `GS` and never opens a transaction set.

## X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED (2026-08-02)

- **Silent data loss closed at the MODEL: a segment outside a transaction
  is retained, though still not re-emitted (2026-08-02,
  `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED`).** Two defects, one cause.
  **(1) The envelope walker raised `X12_UNEXPECTED_SEGMENT` for a segment
  it could not place and then DISCARDED it**, so the segment left the
  model, left the emit, and its warning did not recur on a re-parse of
  the emit: a consumer who serialized and re-derived warnings lost both
  the data and the signal. **(2) The line-break tolerance was exactly one
  optional CR then one optional LF**, which admitted **4 of the 15 CR/LF
  sequences of length 0 to 3**; the other 11 left a break in the stream
  that opened an unrecognized segment, so via defect (1) a uniformly
  **double-spaced file lost its ENTIRE interchange body** and returned
  `groups: []`. Measured on base `3017d88`: **4 of 15** sequences framed,
  and **0 of 10** orphan cases retained anything. After: **15/15 and
  10/10** (ten constructed cases over nine distinct positions; one case
  repeats a position with two segments). The fix is a new public surface,
  `X12Interchange.orphanSegments` (`X12OrphanSegment`: `raw`, decoded
  `segment`, `segmentIndex`, and the library-owned `context`
  discriminant), populated through a single `recordOrphan` chokepoint so
  the warning and the retained segment can never disagree.
  **`segmentIndex` is the documented join key** back to the warning's
  `position.segmentIndex`.

  **▶ THE REFUTER KILLED THE RE-EMIT HALF, AND IT WAS RIGHT.** Pass 1
  shipped a `serializeX12` that replayed each orphan at its recorded
  `segmentIndex`, making every enumerated position round-trip byte-exact
  with the warning surviving. **It was unsound.** `segmentIndex` indexes
  the INPUT stream, and the emit is NOT in input order: `ta1Segments` are
  hoisted ahead of the groups, and a doubled terminator's zero-length
  segment occupies an input index that is never emitted. Either shifts
  the output's indices, so replaying by index splices the orphan into
  whatever occupies that slot. **Measured:** on a two-group interchange
  with a TA1 after the first group, a stray `ZZ` landed INSIDE the 835's
  `ST..SE` body between `CLP` and `SE`, and the re-parse raised **no
  warning at all** (`get835` would walk it as claim content); a stray
  `SE` closed the transaction early and corrupted SE-01; with a doubled
  terminator ahead of it the orphan crossed the IEA and became
  `trailingBytes`. **Base merely dropped it.** Trading a warned,
  documented omission for silent structural corruption of a transaction
  body is the wrong direction under this repo's own invariant, so the
  replay was REMOVED rather than patched. Correct placement needs a
  STRUCTURAL anchor on the model (which group and transaction the segment
  followed), not a raw input index. **Filed, not shipped - and shipped in
  the bullet above, as an anchor.** Read the refutation before touching the
  emit again: the defect it names is in the _addressing scheme_, and it
  comes straight back if anyone reaches for `segmentIndex`.

  **▶ PASS 2 (NOT REFUTED) STILL MOVED THE CANONICAL COUNT, from six to
  SEVEN** (and `X12-ORPHAN-REEMIT` then took it back to six by removing a
  _different_ entry - this one stayed). A segment whose first element is
  empty (`*A*B~`), **outside** a
  transaction, has no id for the walker to dispatch on and is dropped from
  the model AND the emit with **no warning at all** - the only construct on
  the list with no diagnostic whatsoever. Long-standing and byte-identical on
  base; what was new was the inconsistency, since this slice disclosed it in
  prose while the numbered list still said six. Inside an open transaction
  the same segment round-trips normally, so the case is specific to the
  outside-a-transaction position. Silent constructs are now **five of
  seven**, not four of six.

  **This does NOT turn anything into a fatal and adds no warning code**
  (registry still 22 + 4 fatals); it removes warnings from double-spaced
  traffic, which previously produced 7 per file. **The five
  `X12_UNEXPECTED_SEGMENT` messages were corrected** - they said the
  segment was not retained, which is now false. Orphans are deliberately
  NOT decoded by any `get*` reader and a TA1 inside a group is
  deliberately NOT added to `ta1Segments`: retention is not placement.
  Neither a doubled terminator nor a segment with an empty first element
  is recorded, both long-standing and now stated rather than implied.

## PHI-WARNING-MESSAGE-LEAK (2026-07-31)

- **PHI diagnostic surface closed: warning messages come from a frozen
  registry (2026-07-31, `PHI-WARNING-MESSAGE-LEAK`).** The single
  distinguishing property from the ecosystem audit
  (`documentation/repos/phi-audit.md`) now holds here: **no warning factory
  takes a value parameter.** Each takes an `X12Position` plus, where one code
  covers several situations, a library-owned discriminant
  (`CONTROL_NUMBER_PAIRS` / `UNEXPECTED_SEGMENT_CONTEXTS` /
  `BALANCE_INVARIANTS` / `REQUIRED_LOOPS`), and `message` is a lookup into a
  frozen table exported as `ALL_WARNING_MESSAGES`. **The previous posture,
  shape-validate-then-echo with a `(non-spec)` fallback, held for the
  code-list slots and could not hold for a control number**, whose grammar is
  whatever the trading partner sent: `X12_CONTROL_NUMBER_MISMATCH` rendered
  BOTH sides verbatim and unbounded on all six ISA-13 / IEA-02 / GS-06 /
  GE-02 / ST-02 / SE-02 slots, and `IEA-01` / `GE-01` / `SE-01` / `ISA-12` /
  the three 835 balance amounts did the same. Also fixed: a strict-mode
  escalation carried 64 bytes of the interchange as `snippet` (now `""`;
  `snippet` stays on the four Tier-3 fatals, the one deliberate exception),
  `X12Segment.id` was an unbounded copy of the segment's first element (now
  bounded to the X12 segment-id grammar with a `NON_SPEC_SEGMENT_ID` sentinel,
  the `hl7`-to-`deid` layering lesson applied here), and
  `X12_INVALID_DELIMITERS` echoed the detected separator byte.
  **The deliverable is the slot table, not the fix**:
  `test/_helpers/phi-slots.ts` declared **81 consumer-controlled slots**
  (82 since `X12-837-SV-SILENT-ZERO` added the ignored `SVx`; the two
  figures below are measurements of THIS slice against its own base and are
  not restated against a later table)
  across the envelope, all six control numbers, the counts, every code-list
  slot, the 835 / 837 / 271 / 277 / 277CA / 278 / 820 / 999 / TA1 bodies, and
  the model identifiers, driven by `assertNoDiagnosticPhiLeak` from
  `@cosyte/test-utils@0.0.2` (the manifest pin had to move off `^0.0.1`,
  which resolves EXACTLY on npm for a `0.0.x`). Measured one slot at a time
  against the base commit: **13 of 81 red**, and the 68 green ones are the
  point of writing it before the fix. Registry membership is asserted
  separately so a factory that starts interpolating again fails without
  anyone extending the table. **The shipped disclosure was wrong in five
  places** (README, `docs-content/troubleshooting.md`,
  `spec-notes-tolerance.md`, `cookbook.md`, `KNOWN-LIMITATIONS.md`): it
  called messages PHI-free by construction and told consumers to log the
  whole `.warnings` array, naming `.snippet` (not a field on a warning) as
  the exception. Corrected in the same commit as the fix that makes the new
  wording true. Warning registry unchanged at 22 codes; fatals at 4.

## Phase 9: profiles and quirk attribution

- **Phase 9: profile system + clearinghouse/payer companion-guide quirk
  attribution shipped (2026-06-28).** A `defineProfile()` API mirroring
  the sibling `@cosyte/hl7` profile shape, plus a `profiles` namespace of
  built-ins, in `src/profiles/`. **v1 profiles are DESCRIPTIVE**: the
  lenient parser is already lossless, so a profile NEVER alters the parse.
  It attaches attribution metadata to the returned interchange
  (`ix.profile`) and powers the one behavioural hook, `partitionWarnings`.
  Profile-on / profile-off divergence is attribution-only: `groups`,
  `warnings`, and `isa` are byte-identical with and without a profile
  (asserted by a divergence test). `defineProfile(spec)` validates
  (fail-fast name → Levenshtein "did you mean?" on unknown keys → quirk
  set), merges any `extends` lineage (flatten + dedupe first-occurrence;
  child wins on quirk-id collision keeping first-seen position; scalar
  `description` last-wins), re-validates the composed set, and returns a
  frozen `X12Profile` whose `describe()` yields a **structured**
  `X12ProfileDescription` bucketed by effect (`relaxes` / `adds` /
  `requires`), deliberately structured DATA, not hl7's formatted string.
  `setDefaultProfile()` / `getDefaultProfile()` hold a process-scoped
  default; an explicit `{ profile }` wins, `{ profile: null }` opts out for
  that call. **The locked HARD RULE ("a profile entry without a Tier-2
  fixture demonstrating the deviation is forbidden; no invented quirks")
  is enforced three ways:** the `fixture` field is required at the type
  level, `defineProfile()` rejects a missing/ill-formed fixture path, and
  the accuracy suite's per-quirk DEMONSTRATOR registry asserts each cited
  fixture actually exhibits its claimed deviation. A shipped quirk with no
  demonstrator FAILS the suite, so a real-but-irrelevant fixture cannot
  slip past. Built-ins ship ONLY where a Tier-2 fixture grounds them:
  `profiles.availity` (payer-loop `REF*2U` + service-line `REF*F8`,
  grounded in `remit/835-availity-quirk.edi`) and `profiles.bcbsCommon`
  (backslash component separator, grounded in
  `envelope/bcbs-subelement.edi`); a generic Medicare-FFS-style profile
  whose only "deviation" is the canonical `:` baseline is DEFERRED rather
  than invented. Built-ins are reachable only through the `profiles`
  namespace, never the top-level export (mirrors hl7). **API divergence
  from hl7, by design:** `describe()` returns structured data (not a
  string), the input type is `X12ProfileSpec`, and `partitionWarnings` is
  x12-only, conscious departures driven by x12's lossless-lenient reality.
  New public exports: `defineProfile`, `setDefaultProfile`,
  `getDefaultProfile`, `partitionWarnings`, `profiles`, `X12ProfileError`,
  and the `X12Profile` / `X12ProfileSpec` / `X12ProfileQuirk` /
  `X12ProfileDescription` / `X12ProfileEffect` / `X12WarningPartition` type
  tree. No new warning codes (registry unchanged at 22). Verify gate green
  across typecheck, lint, format, phi-scan, coverage (per-dir ≥90 incl. the
  new `profiles/` dir), build, attw, and verify:exports.

## Phase 8f: build820 and build834

- **Phase 8f: domain builders `build820` (005010X218 Premium Payment)
  and `build834` (005010X220A1 Benefit Enrollment) shipped
  (2026-06-28). The v1 emit scope is now COMPLETE.** The emit
  counterparts to `get820Payments` and `get834Header` /
  `get834Enrollments`, layering on the Phase 8 general builder and
  mirroring the pure-function `build835` pattern: each NEVER
  auto-sends, opens a socket, or touches the filesystem, and returns a
  frozen `X12Interchange`. `build820(spec)` emits one GS..GE group
  (GS-01 `RA`) wrapping one ST..SE 820 (ST-03 `005010X218`) from a typed
  `Build820Spec` whose monetary fields are `X12Decimal` throughout
  (BigInt-exact, never `parseFloat`); segments emit in TR3 loop order
  (BPR → TRN → Loop 1000A receiver `N1*PE` → Loop 1000B remitter
  `N1*PR`/`N1*RM` → Loop 2000 remittances: ENT / NM1 → REF → DTM → RMR →
  ADX). `build834(spec)` emits one GS..GE group (GS-01 `BE`) wrapping one
  ST..SE 834 (ST-03 `005010X220A1`) from a typed `Build834Spec`
  (envelope + BGN header + sponsor `N1*P5` / payer `N1*IN` + the member
  roster); segments emit in TR3 loop order (BGN → N1 parties → REF → DTP,
  then per member: INS → NM1\*IL + DMG + N3/N4 → REF → DTP → COB → Loop
  2300 HD → DTP → AMT), with member DTPs emitted BEFORE the first HD so
  the read side binds them to the member. Each result round-trips through
  `parseX12` so its reader reproduces a well-formed spec field-for-field.
  **The 820 carries no TR3 balance equation** (BPR-02 is not required to
  equal Σ of the RMR open items), so the builder emits all monetary
  amounts VERBATIM and NEVER raises a balance-mismatch refusal, a
  deliberate contrast with `build835`. **Maintenance type is the 834's
  safety primitive. Emit verbatim, refuse the unknown:** the builder
  places the caller-supplied INS-03 / HD-01 code (X12 Code Source 875)
  into the segment VERBATIM and NEVER infers or normalizes it; where the
  lenient read side only WARNS on an unknown code, the builder REFUSES to
  EMIT an action it cannot name. **Refusal, not silent corruption:**
  `build820` REFUSES via a typed `Premium820BuildError`
  (`X12_820_BUILD_INVALID_SPEC`: no TRN trace, no remittance, a
  remittance with neither an `ENT` nor an `NM1` to open its loop, a
  remittance with no `RMR` open item, an open item with no identity, an
  over-long control number); `build834` REFUSES via a typed
  `Enrollment834BuildError` (`X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE`:
  an INS-03 / HD-01 code outside the X12 875 subset;
  `X12_834_BUILD_INVALID_SPEC`: no member loop, an empty required
  INS-03, an over-long control number). Both messages carry structural
  indices / counts only. `build834` additionally names the offending
  maintenance code (an X12 control code, never PHI), but never a member
  id or name (PHI discipline). New public exports: `build820`,
  `Premium820BuildError`, `PREMIUM_820_BUILD_ERROR_CODES`,
  `Premium820BuildErrorCode`, the `Build820Spec` type tree; `build834`,
  `Enrollment834BuildError`, `ENROLLMENT_834_BUILD_ERROR_CODES`,
  `Enrollment834BuildErrorCode`, and the `Build834Spec` type tree. Verify
  gate green across typecheck, lint, format, phi-scan, coverage (per-dir
  ≥90), build, attw, and verify:exports. **With this change the full v1
  emit scope is complete. Every v1 transaction now has a domain
  builder.**

## Phase 8e: build278Request and build278Response

- **Phase 8e: services-review builders `build278Request` (005010X217
  Request for Review) and `build278Response` (005010X216 Response) shipped
  (2026-06-28).** The emit counterparts to `get278Request` /
  `get278Response`, layering on the Phase 8 general builder and mirroring
  the pure-function `build277` / `build277CA` pattern: each NEVER
  auto-sends, opens a socket, or touches the filesystem, and returns a
  frozen `X12Interchange`. Both share one `buildServicesReview` body
  (GS-01 `HI`, ST-01 `278`) and differ only in ST-03 / GS-08 (`005010X217`
  vs `005010X216`) and the HCR direction gate. They assemble a complete
  interchange from a typed `Build278Spec` (envelope + BHT header + the
  UMO → requester → subscriber → (dependent) → reviews tree); segments
  emit in TR3 loop order (BHT → HL 20 UMO → HL 21 requester → HL 22
  subscriber NM1/DMG → [HL 23 dependent] → HL EV/SS review: TRN → UM →
  HCR → REF → DTP → HI → MSG → provider NM1s, recursing SS service
  reviews under their EV event), and each result round-trips through
  `parseX12` so its reader reproduces a well-formed spec field-for-field.
  **The certification decision is the safety-critical, response-only
  surface:** `build278Response` places the caller-supplied HCR-01
  `actionCode` (`A1` certified / `A3` not-certified / `A4` pended / `A6`
  modified / …) into the segment VERBATIM and NEVER infers, normalizes, or
  upgrades it. The round-tripped `decision.actionCode` is byte-for-byte
  the input; `build278Request` REFUSES a review carrying a decision (HCR is
  response-only) and `build278Response` refuses a decision with an empty
  action code. **The HL spine is computed, never caller-supplied:** the
  builder computes every HL-01 id, HL-02 parent pointer (`20 → 21 → 22 →
23 → EV/SS`), and HL-04 has-child flag from the nested input tree, so a
  structurally inconsistent hierarchy is _unrepresentable_ and SE-01 is
  correct by construction. **Refusal, not silent corruption:** the builder
  REFUSES via a typed `ServicesReview278BuildError`
  (`X12_278_BUILD_INVALID_HIERARCHY`: a subscriber with neither a review
  nor a dependent, a dependent with no review;
  `X12_278_BUILD_INVALID_SPEC`: a review with no request category code, a
  request review carrying an HCR decision, a response decision with an
  empty action code, an over-long control number). The thrown message
  carries structural locators only (`subscriber.review[0]`, level codes),
  never a member name, member id, trace, or diagnosis code (PHI
  discipline). New public exports: `build278Request`, `build278Response`,
  `ServicesReview278BuildError`, `AUTH_278_BUILD_ERROR_CODES`,
  `ServicesReview278BuildErrorCode`, and the `Build278Spec` type tree.
  Verify gate green (typecheck + lint + format + phi-scan + coverage
  per-dir ≥90 + build + attw + verify:exports). **Scope:** the remaining
  domain builders (`build820`, `build834`) layer on this same surface and
  are deferred to chained follow-ups (X12-8f).

## Phase 8d: build271, build277, build277CA

- **Phase 8d: response builders `build271` (005010X279A1 Eligibility
  Benefit Response) and `build277` / `build277CA` (005010X212 Claim
  Status Response / 005010X214 Claim Acknowledgment) shipped
  (2026-06-28).** The response-side emit counterparts to
  `get271Eligibility` / `get277Status` / `get277CADisposition`, layering
  on the Phase 8 general builder and mirroring the pure-function
  `build835` / `build837` pattern: each NEVER auto-sends, opens a
  socket, or touches the filesystem, and returns a frozen
  `X12Interchange`. `build271(spec)` emits one GS..GE group (GS-01 `HB`)
  wrapping one ST..SE 271 (ST-03 `005010X279A1`); `build277` /
  `build277CA` share one `buildClaimStatus` body (GS-01 `HN`) and differ
  only in ST-03 / GS-08 (`005010X212` vs `005010X214`). Monetary /
  percent / quantity fields are `X12Decimal` throughout (BigInt-exact,
  never `parseFloat`). Segments emit in TR3 loop order (271: HL spine →
  TRN → NM1 → N3/N4 → DMG → REF → DTP → EB + nested NM1 / REF / DTP /
  MSG; 277: HL spine → NM1 member → Loop 2200 claim TRN → STC → REF →
  DTP → Loop 2220 SVC → STC / REF / DTP; STC-01/10/11 are C043
  category : status : entity composites), and each result round-trips
  through `parseX12` so its reader reproduces a well-formed spec
  field-for-field. **TRN echo is the safety-critical reassociation
  invariant:** the builder places the caller-supplied trace into TRN-02
  verbatim and NEVER fabricates, normalizes, or mutates it. A build-side
  property test feeds random trace tokens through all three builders and
  asserts the round-tripped `referenceId` is byte-for-byte the input.
  **The HL spine is computed, never caller-supplied:** the builder
  computes every HL-01 id, HL-02 parent pointer, and HL-04 has-child flag
  from the nested input tree (271 spine `20 → 21 → 22 → 23`; 277 / 277CA
  spine `20 → 21 → 19 → 22 → 23`), so a structurally inconsistent
  hierarchy is _unrepresentable_ and SE-01 is correct by construction.
  **Refusal, not silent corruption:** the builder REFUSES a structurally
  impossible spec via a typed `Eligibility271BuildError`
  (`X12_271_BUILD_INVALID_HIERARCHY`: no source / a childless source /
  receiver; `X12_271_BUILD_INVALID_SPEC`: over-long control number) or
  `ClaimStatus277BuildError` (`X12_277_BUILD_INVALID_HIERARCHY`: no
  source / a childless source / receiver / provider / a subscriber with
  neither claim nor dependent / a childless dependent;
  `X12_277_BUILD_INVALID_SPEC`: a claim with no trace / status / service
  line, an STC with no category code, an over-long control number). The
  thrown message carries structural locators only
  (`source[0].receiver[0].provider[0].subscriber[0]`, level codes,
  counts), never a member name, member id, or trace (PHI discipline).
  New public exports: `build271`, `Eligibility271BuildError`,
  `ELIGIBILITY_271_BUILD_ERROR_CODES`, `Eligibility271BuildErrorCode`,
  the `Build271Spec` type tree; `build277`, `build277CA`,
  `ClaimStatus277BuildError`, `CLAIM_STATUS_277_BUILD_ERROR_CODES`,
  `ClaimStatus277BuildErrorCode`, and the `Build277Spec` type tree.
  Verify gate green (typecheck + lint + format + phi-scan + coverage
  per-dir ≥90 + build + attw + verify:exports). **Scope:** the remaining
  domain builders (`build820`, `build834`) layer on this same surface and
  are deferred to chained follow-ups (X12-8f).

## Phase 8c: build837P, build837I, build837D

- **Phase 8c: claim-submission builders `build837P` / `build837I` /
  `build837D` (005010 837 Professional `X222A2` / Institutional `X223A3`
  / Dental `X224A2`) shipped (2026-06-28).** The emit counterpart to
  `get837Claims`, layering on the Phase 8 general builder and mirroring
  the pure-function `build835` pattern: each NEVER auto-sends, opens a
  socket, or touches the filesystem. `build837P/I/D(spec)` assembles a
  complete `X12Interchange` (one GS..GE functional group, GS-01 `HC`,
  wrapping one ST..SE 837, ST-03 per variant) from a typed `Build837Spec`
  whose monetary fields are `X12Decimal` throughout (BigInt-exact, never
  `parseFloat`). Segments emit in TR3 loop order (BHT → Loop 1000A/1000B
  parties → Loop 2000A/B/C HL spine → Loop 2300 claim: CLM / DTP / HI /
  NTE / AMT / REF / 2310 providers / 2320 other subscribers → Loop 2400
  service lines: LX / SVx / DTP / LIN+CTP / TOO / NTE / AMT / REF / 2420
  providers / 2430 SVD+CAS+DTP), one HI composite per HI segment, and
  consecutive same-group line-adjudication CAS triples pack into one
  segment (≤ 6 each); the envelope emits inline (not via
  `buildInterchange`) so a pre-composed composite is never
  double-escaped. The result round-trips through `parseX12` so
  `get837Claims` reproduces a well-formed spec field-for-field. **The HL
  spine is computed, never caller-supplied:** the builder OWNS the 837's
  safety primitive: it computes every HL-01 id, HL-02 parent pointer
  (20 → 22 → 23), HL-03 level, and HL-04 has-child flag from the nested
  billing-provider → subscriber → (claims | patient) tree, so a
  structurally inconsistent hierarchy is _unrepresentable_ and SE-01 is
  correct by construction. **Refusal, not silent corruption:** where the
  lenient read side only WARNS on a broken HL parent pointer, the builder
  REFUSES a structurally impossible spec via a typed `Claim837BuildError`:
  codes `X12_837_BUILD_INVALID_HIERARCHY` (no billing providers, a
  billing provider with no subscriber, a subscriber with neither a direct
  claim nor a dependent patient, a dependent patient with no claim) and
  `X12_837_BUILD_INVALID_SPEC` (empty `claimId`, a claim with no service
  line, a line whose `variant` mismatches the builder, an empty
  procedure / revenue code, an over-long control number). The thrown
  message carries structural locators only
  (`billing[0].subscriber[0].claim[0]`, level codes, counts), never the
  `claimId` (patient-account number) or a member id (PHI discipline). New
  public exports: `build837P`, `build837I`, `build837D`,
  `Claim837BuildError`, `CLAIM_837_BUILD_ERROR_CODES`,
  `Claim837BuildErrorCode`, and the `Build837Spec` type tree. Verify gate
  green (typecheck + lint + format + phi-scan + coverage per-dir ≥90 +
  build + attw + verify:exports). **Known limitation:** claim-/line-level
  provider addresses (Loop 2310/2420 N3/N4) are a documented read-side
  limitation. The NM1 fields round-trip, the address does not. **Scope:**
  the remaining domain builders (`build271`, `build277`, `build278`,
  `build820`, `build834`) layer on this same surface and are deferred to
  chained follow-ups (X12-8d → X12-8f).

## Phase 8b: build835

- **Phase 8b: first domain builder `build835` (005010X221A1 ERA)
  shipped (2026-06-28).** The first per-transaction emit constructor,
  layering the safety-critical TR3 balance invariants on top of the
  Phase 8 general builder and mirroring the pure-function `build999` /
  `buildTA1` pattern: it NEVER auto-sends, opens a socket, or touches
  the filesystem. `build835(spec)` assembles a complete `X12Interchange`
  (one GS..GE functional group, GS-01 `HP`, wrapping one ST..SE 835,
  ST-03 `005010X221A1`) from a typed `Build835Spec` whose monetary
  fields are `X12Decimal` throughout (BigInt-exact, never `parseFloat`).
  Segments emit in TR3 loop order (BPR → TRN → Loop 1000A/1000B parties
  → LX → Loop 2100 claims → Loop 2110 service lines → PLB); composite
  elements (CLP-08, SVC-01, SVC-06, PLB) escape each component then join
  with the raw component separator (the envelope is emitted inline, not
  via `buildInterchange`, precisely to avoid double-escaping a
  pre-composed element); consecutive same-group CAS and same-provider /
  period PLB adjustments pack into one segment (≤ 6 triples / pairs). The
  result round-trips through `parseX12` so `get835` reproduces a balanced
  spec field-for-field. **Refusal, not silent corruption:** where the
  lenient read side only WARNS on an out-of-balance payer artifact, the
  builder REFUSES via a typed `Remit835BuildError`, reusing the
  authoritative read-side validators (`checkServiceLineBalance` /
  `checkClaimBalance` / `checkRemitTotalBalance`) against a materialized
  read model so the emit guard and the parse warning share one source of
  truth: error codes `X12_835_BUILD_BALANCE_MISMATCH` (any §1.10.2
  invariant) and `X12_835_BUILD_INVALID_SPEC` (no TRN trace, empty
  CLP-01, over-long ISA-13). The thrown message carries numeric totals
  only, never a patient-control number or member id (PHI discipline).
  New public exports: `build835`, `Remit835BuildError`,
  `REMIT_835_BUILD_ERROR_CODES`, `Remit835BuildErrorCode`, and the
  `Build835Spec` type tree. **Parser fix surfaced by the round-trip
  review:** `splitSegments` used a naive `indexOf` for the segment
  terminator and split mid-value on a `?`-release-escaped terminator
  (`?~`); it is now release-aware via `findUnescapedTerminator` (a
  degenerate terminator-is-release delimiter set falls back to the
  literal scan), underpinning both the `build835` round-trip and the
  Phase 8 `serialize(parse(s)) === s` fixed point; regression tests at
  the parser (`parser-envelope`) and builder level. Verify gate green
  (typecheck + lint + format + phi-scan + coverage per-dir ≥90,
  `build-835.ts` at 94.6% branches + build + attw + verify:exports).
  **Scope:** this slice is `build835` only. The remaining domain
  builders (`build837P/I/D`, `build271`, `build277` / `277CA`,
  `build278Request/Response`, `build820`, `build834`) layer on this same
  surface and are deferred to chained follow-ups (X12-8c → X12-8f).

## Phase 8: serializer and general builder

- **Phase 8: spec-clean serializer + general interchange builder
  shipped (2026-06-28).** The emit half of the parser. `serializeX12(ix,
opts?)` reconstructs an `X12Interchange` back to bytes from the
  verbatim `.raw` strings: byte-faithful for the segments ON THE MODEL
  by default (`serialize(parse(s)) === s` is NOT guaranteed in general;
  line breaks, segments outside a transaction, a doubled terminator, a
  missing final terminator, post-IEA trailing bytes, and TA1 position are
  each not reproduced, and all but the line breaks fire on inputs with no
  line breaks at all; `KNOWN-LIMITATIONS.md` holds the canonical list.
  Segments outside a transaction are still not RE-EMITTED, but as of
  `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` they are no longer dropped
  from the MODEL; see the Status entry above), and
  with
  `{ specClean: true }` it reconciles the envelope (SE-01 / GE-01 /
  IEA-01 counts + the ISA-13↔IEA-02 / GS-06↔GE-02 / ST-02↔SE-02 control
  pairs), surfacing every mismatch via `onWarning` and NEVER silently
  correcting it. Corrected counts emit only with
  `{ recomputeCounts: true }`, and control NUMBERS are identity, never
  rewritten. `buildInterchange(spec)` is the general, segment-level
  builder: it owns the 106-byte fixed-width ISA, the GS/GE/SE/IEA
  control segments + their counts, escapes active delimiters in body
  values via `?`, and round-trips its output through `parseX12` so the
  result is bit-identical to the parsed form (an internal builder bug
  surfaces as a warning, not silent corruption). Structurally impossible
  specs are REFUSED with a typed `X12BuildError`
  (`X12_BUILD_INVALID_SPEC`: over-long ISA-13, body segment with no
  id). New warning `X12_SEGMENT_COUNT_MISMATCH` is a serializer-only
  diagnostic (the parser never validated SE-01); registry expands
  21 → 22, additions-only, bounded metadata only (H-PHI invariant).
  13 committed round-trip goldens (one per v1 transaction, regenerated
  by `test/scripts/gen-serialize-goldens.ts`) assert
  `serializeX12(parseX12(fixture))` reproduces the golden byte-for-byte;
  `roundTripProperty` (300 runs) + a builder property (200 runs) lock
  serialize idempotency + a self-consistent built envelope. The new
  reconciliation also caught + fixed four latent fixture defects the
  lenient parser never validated (SE-01 miscounts in 837i / 837d / 999;
  a GS-06/GE-02 mismatch in 278-response). Verify gate green across
  typecheck, lint, format, phi-scan, coverage (per-dir ≥90 incl. the new
  `serialize/` + `builder/` dirs), build, attw, verify:exports. 467
  tests total. **Deferred to a follow-up: domain per-transaction
  builders (`build835` / `build837P/I/D` / `build271` / …, the
  safety-critical emit code) layer on top of this general surface.**

## Phase 7: 278, 834, 820 readers

- **Phase 7: 278 Services Review + 834 Enrollment + 820 Premium
  Payment shipped (2026-06-28).** Four read-side helpers round out the
  v1 transaction scope: `get278Request` / `get278Response` (TR3
  `005010X217` / `005010X216`) share one lenient HL-tree walk and differ
  only in the `direction` recorded on the result; `get820Payments` (TR3
  `005010X218`); and the streaming pair `get834Header` +
  `get834Enrollments` (TR3 `005010X220A1`). **Safety-critical fields are
  preserved verbatim and NEVER inferred**: the 278 response `HCR-01`
  certification action lands as-is on each event / service review, and
  the 834 `INS-03` / `HD-01` maintenance type (X12 0875) is preserved
  with an unknown code raising `X12_834_UNKNOWN_MAINTENANCE_TYPE` on the
  affected member only. `get834Enrollments` is an
  `AsyncIterable<X12Enrollment>`: one decoded member per `INS` loop, so
  a consumer holds one member at a time, not the whole roster (streaming
  property test over a 10MB+ synthetic file with early-break; honest
  v1 limitation: the file is still parsed into `tx.segments` up front).
  The 278 HL spine `20 → 21 → 22 → 23` is validated via the shared
  `validateHl`; the `EV` / `SS` event + service levels are deliberately
  tolerant (omitted from the expected-parent map). The 820 surfaces the
  BPR header, TRN traces, receiver (`N1*PE`) + remitter (`N1*PR` /
  `N1*RM`) parties with addresses, and both `ENT` organization-summary
  and bare-`NM1` individual remittances with RMR open items, DTM dates,
  and ADX adjustments. All monetary fields decode as `X12Decimal`. 12
  dogfooded `LoopSpec` artifacts via `defineLoopSpec()` (6 × 278 +
  3 × 820 + 3 × 834). Warning registry expanded by
  `X12_834_UNKNOWN_MAINTENANCE_TYPE` (additions-only), shape-validating
  the echoed code (H-PHI invariant). Synthetic fixtures across all three
  surfaces (278 request / response / comprehensive / edge; 820 canonical
  / edge / loop; 834 canonical / edge) + unit tests. Verify gate green
  across typecheck, lint, format, phi-scan, coverage (per-dir ≥90),
  build, attw, and verify:exports. 407 tests total. **Serialization
  (build side) for all v1 transactions is the next surface (Phase 8).**

## Phase 6: 271, 277, 277CA readers

- **Phase 6: 271 Eligibility + 277 / 277CA Claim Status shipped
  (2026-06-28).** `get271Eligibility(delimiters, tx)` (TR3
  `005010X279A1`), `get277Status(delimiters, tx)` (TR3 `005010X212`),
  and `get277CADisposition(delimiters, tx)` (TR3 `005010X214`). 277 and
  277CA share one internal walk disambiguated by `ST-03`:
  `get277CADisposition` admits only `005010X214`, `get277Status` admits
  either; both return `undefined` only on a mis-routed `ST-01`.
  **TRN echo is locked as the safety-critical reassociation property**:
  a 271 echoes the requesting 270's `TRN-02` verbatim onto its
  subscriber / dependent, a 277 echoes the 276's onto its claim, never
  mutated, normalized, or dropped (round-trip property test). STC
  status-code fidelity: STC-01 / STC-10 / STC-11 (C043) decode into
  verbatim CSCC (source 507) + CSC (source 508) + entity triples;
  unknown codes preserve their value and emit
  `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` / `X12_UNKNOWN_CLAIM_STATUS`. A
  277CA provider-level batch ack opens a claim on a standalone STC (no
  TRN). HL parent-pointer integrity via the shared `validateHl` (271
  spine `20→21→22→23`; 277 / 277CA spine `20→21→19→22→23`). Mismatches
  emit `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`, never
  silently re-numbered. New dated code-list snapshots
  `CLAIM_STATUS_CATEGORY_CODES` / `CLAIM_STATUS_CODES` /
  `SERVICE_TYPE_CODES` (+ lookups) alongside the CARC / RARC family. All
  monetary fields decode as `X12Decimal`. 13 dogfooded `LoopSpec`
  artifacts through `defineLoopSpec()` (7 eligibility + 7 status, Loop
  2200 / 2220 reused across subscriber + dependent). Warning registry
  expanded 18 → 20 (additions-only), both new factories shape-validate
  the echoed code (H-PHI invariant). Shared `X12Hl` exported for result
  types. Six synthetic fixtures (271 canonical + dependent; 277
  canonical + unknown-status; 277CA batch-ack + HL-orphan), unit tests,
  TRN-echo round-trip + byte-flip fuzz. Verify gate green: typecheck +
  lint + format + coverage (per-dir ≥90) + build + attw +
  verify:exports. 361 tests total. **Phase 7+ (278 services review, 834
  enrollment, 820 premium) is the next surface.**

## Phase 5: 837 P/I/D reader

- **Phase 5: 837 Healthcare Claim (Professional / Institutional / Dental)
  shipped (2026-06-27).** `get837Claims(delimiters, tx, opts?)` walks a
  parsed 837 transaction set into the typed `X12_837Submission` model
  across the three sibling TR3s (`005010X222A2` / `X223A3` / `X224A2`).
  Variant detection from ST-03 implementation-convention reference, with
  SVx-segment-id fallback and `X12_837_UNKNOWN_VARIANT` when neither
  resolves. HL hierarchy validated for parent-pointer integrity (`HL-02`
  must reference an earlier `HL-01`; level must match the TR3-required
  parent: `22` → `20`, `23` → `22`). Violations emit
  `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID` and the
  walker NEVER silently re-numbers. HI qualifier → code-system
  provenance via the new `src/code-lists/hi-qualifiers.ts` registry
  (ICD-10-CM principal `ABK` / other `ABF` / admitting `ABJ`;
  ICD-10-PCS `BBQ` / `BBR`; legacy ICD-9 / NUBC / DRG covered); unknown
  qualifiers emit `X12_UNKNOWN_HI_QUALIFIER`, verbatim qualifier + code
  preserved with `codeSystem: "unknown"`. Variant-specific service-line
  union (`X12_837ServiceLineProfessional` SV1 / `…Institutional` SV2 /
  `…Dental` SV3) with diagnosis pointers (P), revenue code + procedure
  (I), and TOO tooth / surface (D). Loop 2410 LIN + CTP drug
  identification (837P). Loop 2430 SVD + CAS + DTP line adjudication
  (COB), re-using `X12RemitAdjustment` + `lookupCarc` from the 835.
  Loop 2320 other-subscriber + other-payer captured at the surface
  level (detailed CAS / OI / MOA inside 2320 deferred to Phase 9). All
  monetary fields decode as `X12Decimal`. 11 dogfooded `LoopSpec`
  artifacts shipped through `defineLoopSpec()`. Five new warning codes
  (`X12_HL_PARENT_MISMATCH`, `X12_HL_PARENT_LEVEL_INVALID`,
  `X12_UNKNOWN_HI_QUALIFIER`, `X12_MISSING_REQUIRED_LOOP`,
  `X12_837_UNKNOWN_VARIANT`) all shape-validate echoed values (H-PHI
  invariant); the `missingRequiredLoop` rationale strings are
  hard-coded literals. Two new exported constants for safety +
  ergonomics: `HL_LEVEL_CODES` and `NM1_QUALIFIERS`. Six new shared
  element-read helpers in `parser/segment.ts` (`elementValue` /
  `elementOptional` / `componentOptional` / `elementDecimal` /
  `elementDecimalOrZero` / `collectElementValues`) hoisted out of both
  walkers. 10 synthetic fixtures (3 Tier-1 canonical per variant + 6
  Tier-2 quirk + 1 comprehensive). Property tests: HL parent-pointer
  verbatim preservation + never-throw + byte-flip fuzz (300 runs ×
  6 fixtures). Verify gate green: typecheck + lint + format + coverage
  (96.91% stmts / 90.61% branches / 97.67% funcs / 98.49% lines;
  per-dir ≥90) + build + attw + verify:exports. 325 tests total.
  **Phase 6 (eligibility + claim status) shipped 2026-06-28. See above.**

## Phase 4: 835 ERA reader

- **Phase 4: 835 Healthcare Claim Payment/Advice (ERA) shipped (2026-06-27).**
  `get835(delimiters, tx)` walks a parsed 835 transaction set into the
  typed `X12Remittance` model: BPR payment header, TRN trace numbers,
  Loop 1000A / 1000B payer + payee parties, Loop 2100 claims (with
  patient / subscriber / service-provider NM1s, CAS adjustments,
  MIA / MOA / LQ remarks, REF / AMT supplemental amounts), Loop 2110
  service lines (with HCPCS / CPT / NDC / revenue-code destructuring,
  line-level CAS / REF / AMT / LQ), and PLB provider-level adjustments.
  All monetary fields decode as the new `X12Decimal`: string-backed,
  `BigInt`-exact arithmetic, **NEVER `parseFloat`**. Three balance
  invariants run after the walk per TR3 X221A1 §1.10.2 (line, claim,
  top-of-remit) and emit `X12_835_REMIT_BALANCE_MISMATCH` on mismatch.
  The model is NEVER silently rebalanced; PLB amounts carry the raw
  EDI sign (positive = take-back, so the top equation is
  `BPR-02 == Σ(CLP-04) - Σ(PLB)`). Bundled WPC + X12-internal code-
  list snapshots ship as versioned data artifacts (`CARC` ~30 codes,
  `RARC` ~15 codes, `CLP_STATUS` 10 codes, `CLAIM_ADJUSTMENT_GROUP_CODES`
  as a frozen 4-value literal union); unknown codes preserve the
  verbatim value and emit `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC`.
  Three built-in `LoopSpec` artifacts (Loop 2000 / 2100 / 2110) ship
  through the public `defineLoopSpec()` API, the dogfooding gate.
  Warning registry expanded 10 → 13 (additions-only); shape-validated
  CARC / RARC echoes mirror the H-PHI invariant from `@cosyte/hl7`.
  Six fixtures (5 Tier-1 synthetic spec-clean + 1 Tier-2 synthetic
  Availity-quirk shape). Property tests: `X12Decimal` algebra invariants
  (round-trip / additive identity / commutativity / subtraction-by-
  addition / negation involution); balance-invariant property
  (balanced ⇒ no warning; imbalanced ⇒ warning + verbatim preservation);
  byte-level 835 fuzz target across every fixture (300 runs each).
  Verify gate green: typecheck + lint + format + coverage (97.7%
  stmts / 91.97% branches / 99.24% funcs / 99.38% lines, per-dir
  ≥90 on `parser/` / `loops/` / `transactions/` / `code-lists/`) +
  build + attw + verify:exports. 269 tests total.

## Phase 3: 999 and TA1 acknowledgments

- **Phase 3 acknowledgments shipped (2026-06-27).** Pure-function 999 + TA1
  parse + build. `parse999(raw)` decodes AK1 → AK2 → (IK3 [→ CTX] (IK4 [→
  CTX])\*)\* → IK5 → AK9 (lenient-accepts legacy `AK3`/`AK4`/`AK5`,
  normalizes onto X231A1). `build999(spec)` assembles a spec-clean
  X12Interchange around the 999; REFUSES `Accept` against a non-empty
  error list (`X12_ACK_ACCEPT_WITH_ERRORS`) and inconsistent AK9 counts
  (`X12_ACK_COUNT_MISMATCH`). Envelope walker captures TA1 verbatim onto
  `X12Interchange.ta1Segments`; `parseTA1(ix)` returns typed `X12AckTA1`;
  `buildTA1(spec)` emits a `Ta1Segment` and REFUSES `A` + non-`000` note
  (`X12_TA1_ACCEPT_WITH_NOTE`). Code-list registries shipped:
  `X12_ACK_DISPOSITION_CODES` (715), `IK3_SYNTAX_ERROR_CODES` (716),
  `IK4_SYNTAX_ERROR_CODES` (723), `TA1_ACK_CODES` (I13), `TA1_NOTE_CODES`
  (I18). Acks are structurally PHI-free by design; `IK4-04`
  (`copyOfBadDataElement`) is documented as a caller-supplied surface
  callers SHOULD omit when bytes are PHI. The library NEVER
  auto-populates it.

## Phase 2: syntactic core

- **Phase 2 syntactic core shipped (2026-06-27).** Every body segment in a transaction is decoded
  into an immutable `X12Segment` (id + 1-indexed elements; raw text preserved on
  `X12TransactionSet.rawSegments`). The `?`-release-character escape is honored losslessly
  (`?~`→`~`, `?*`→`*`, `??`→`?`); dot-path traversal (`getSegmentValue(seg, "03-1")`) walks
  elements, composites (`-N` 1-indexed), and repetitions (`[N]` 0-indexed). Public
  `defineLoopSpec()` API ships. Phases 3+ author their built-in TR3 loops through it. Warning
  registry expanded 8 → 10 (`X12_DANGLING_RELEASE_CHAR`, `X12_UNEXPECTED_SEGMENT`).

## Phase 1: envelope decoder

- **Phase 1 envelope decoder shipped (2026-06-27).** `parseX12()` decodes ISA / GS / GE / IEA, detects
  all four delimiters from fixed ISA byte positions, surfaces stable warning codes + 4 Tier-3 fatal
  codes, and round-trips the ISA byte-exact.

## Phase E: shared engineering standard

- On the shared cosyte engineering standard (migrated Phase E): toolchain inherited from the
  published `@cosyte/*` config packages, CI/release are thin callers of `cosyte/.github`. Per-directory
  ≥90 coverage gate armed on `src/parser/`.

## PHI commit-gate armed (2026-06-28)

- **PHI commit-gate armed (2026-06-28).** A zero-dep, X12-shape-aware
  scanner (`scripts/phi-scan.ts`, `pnpm phi-scan`) refuses fixtures /
  `src/` carrying real-PHI-shaped tokens: NM1 person names + SSN
  qualifier `34`, MI member-id / XX NPI shapes, DMG dates of birth,
  pre-2024 DTP/DTM/BHT/GS dates, dashed SSN / `REF*SY` / non-test
  email. Synthetic tokens are positively declared in
  `scripts/phi-allow-list.txt` (X12 is byte-strict, so no inline header,
  same allow-list model as DICOM's binary `.dcm`); a whole-file
  bypass needs `--allow-fixture` **and** an audit entry in
  `phi-scan-overrides.md`. Runs at pre-commit (`simple-git-hooks
--staged`) and in CI (`run-phi-scan: true`); the `verify.sh` summary
  now shows `phi-scan ✓`.

## Published scope: the 270 and 276 gap

- Pre-alpha `0.0.x`, **published** to npm from a public repo. Never quote a
  version here: `npm view @cosyte/x12 version` is the only source of truth.
  The **read** scope is decoded for 271, 277/277CA, 278, 820, 834, 835,
  837P/I/D, 999, and TA1. **The 270 and 276 inquiry directions have NO typed
  model on either side**: no `get270` / `get276` reader, no `build270` /
  `build276` builder, and no 270 or 276 dispatch anywhere in `src/`. They
  parse into segments and dot-paths like any other X12 input and nothing
  decodes them further, so do not describe the v1 read or emit scope as
  "270/271" or "276/277" complete: that claim was on the README and the
  docs site until ASSETS-P8 corrected it. The general **emit** surface
  (`serializeX12` + `buildInterchange`)
  shipped in Phase 8, and (with Phase 8f) the **domain emit**
  scope is complete for every transaction that has a reader: a per-TR3 domain builder
  (`build835` / `build837P/I/D` / `build271` / `build277` / `277CA` /
  `build278Request` / `build278Response` / `build820` / `build834`, plus
  the pure-function `build999` / `buildTA1` acknowledgments) layering the
  safety-critical per-TR3 invariants (balance, certification,
  maintenance-type fidelity, count reconciliation) on top of the general
  builder.

## ASSETS-P8: the attw wrapper

- **▶ `attw` SAYS "does not contain types" AND EXITS 0, SO THE `attw` SCRIPT IS A WRAPPER, NOT THE BARE CLI.** `getExitCode.js` in `@arethetypeswrong/cli` (0.18.4, the version pinned here) opens with `if (!analysis.types) return 0`. An untyped package is a legitimate npm package, so "no types at all" is a description rather than a problem, and the problem list is never consulted. No `--profile`, `--ignore-rules` or config setting reaches that early return. For a package that ships types it means the declarations were **not in the tarball**, which is a broken publish reported as a pass, and `verify.sh` propagates the step's status faithfully, so the step is what lies to it. **`scripts/verify.sh` needs no change; do not touch it.**
  **The timing supplies the condition, but the exit code is the defect.** Reproduced here on a quiet box with **zero concurrency**, both printing the sentence and exiting 0: `rm -rf dist && attw --pack .`, and `rm -f dist/index.d.ts dist/index.d.cts && attw --pack .`. The second is the realistic one, because `tsup` emits the JS in one pass and the declarations in a later one, so **every** build has an interval where `dist/` holds `.mjs`/`.cjs` and no `.d.ts`. **Measured on this package: 1.92 s** from the first JS entry point to the first declaration file, on one clean `pnpm build`. (The sibling that shipped this fix first measured 4.95 s on its own build. Re-measure per repo; do not carry the figure over.) A concurrent build or a `clean` in the same working tree lands `attw` in that interval. So the answer is **not** a lock, a lease or a build queue (ADR 0015): the gate has to be able to say its own inputs were missing, whatever removed them.
  `scripts/attw.mjs` carries **two nets that catch different things**, so keep both: a **preflight** that every relative path `package.json` promises (`main`, `module`, `types`, `typings`, every string leaf of `exports`) exists and is non-empty, which catches the build interval and **names the missing file**; and a **post-check** on the untyped sentence, which catches what the preflight structurally cannot, namely declarations present on disk but excluded from the tarball by `files`/`.npmignore`. **No instance of that second case has occurred in this repo** yet.
  **The post-check reads a string, so what would hide that string is refused rather than tolerated.** **Four routes were measured against this repo's own binary**, each handing back exit 0 with the sentence absent: `--quiet`, `--format json`, a `.attw.json` setting either (`readConfig()` applies it after argv), and `--config-path` pointed at a file that sets one of them. **The reference this was ported from refused `--config-path` by inference and said so; here it is measured.** Both forms were measured, and they differ: `--config-path` at a **nonexistent** path blinds nothing, because `readConfig()` swallows the `ENOENT` and carries on. The real-file form is the one that blinds, so the test uses it. That choice is belt-and-braces rather than strictly required, and an earlier draft of this line overstated it: the test's `refused wholesale` assertion pins the argv path independently of which form is passed, so either half alone would red with the refusal deleted. The refusal is **by option name, wholesale, not by value**: a harmless `--format` value blinds nothing and is refused anyway, which is the deliberate trade against value-parsing them.
  `test/scripts/attw-gate.test.ts` pins both nets against the real binary, **including the upstream exit-0 itself**, so an `attw` upgrade that rewords the sentence or fixes the exit code reds the suite instead of letting the net go quietly slack. It also pins a **negative control** on a well-formed package and that a real `attw` failure still fails, because a gate that only ever fails is not a gate and one that swallows the status is not one either. **11 of its 13 cases go red with `scripts/attw.mjs` removed** (verified); the two that do not are the upstream pin, which does not exercise the wrapper, and the attw-still-fails case, whose status comparison a missing wrapper happens to satisfy.
  **This is a per-repo script and porting it is not finished org-wide.** Every sibling still invoking the CLI directly carries the same false green, **including `config/scripts/parser-template/`, which `scaffold-parser.mjs` mints new parsers from**, so a port that skips the template leaves the defect being re-minted. Derive the current set rather than trusting a count: `/usr/bin/grep -rl '"attw":' --include=package.json --exclude-dir=node_modules /workspace`.

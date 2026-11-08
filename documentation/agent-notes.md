# x12 agent notes

What does not fit on the `CLAUDE.md` card lives here, in this one file: the measurements, the
refutations and the reasoning behind the rules, and the card points into it as
`documentation/agent-notes.md#<anchor>`. Read the section before you touch the code it
describes: these paragraphs each cost a defect or a refuted claim to learn, and several of them
name a remedy that was tried and refuted.

The narrative was relocated out of `CLAUDE.md` from 2026-08-04 and kept verbatim. On 2026-11-08
the 41 files that sat in `documentation/agent-notes/` were folded in below, each whole under its
own heading, one level down, and the card was cut to the house spec, its full rules moved to
[Rules moved off the card](#rules-moved-off-the-card). Three kinds of text were reworded then and
nothing else: links between the old files now point at the sections here; citations of the
umbrella's size rule (a decision record and a write-time hook, both retired) now say it is
retired, since the card spec in cosyte/config (`documentation/claude-card.md`) sets the budget
now; and this note says that older sections cite the umbrella's `documentation/conventions.md`,
which no longer exists: its rules live in the umbrella's `plans/standards.md` and in
`knowledgebase/06-brand/voice-and-tone.md`.

## Contents

- [Rules moved off the card](#rules-moved-off-the-card): the card's full text before 2026-11-08
- [CLAUDE-MD-AUDIT (2026-08-04)](#claude-md-audit-2026-08-04)
- [Tech stack: the shared @cosyte/\* standard](#tech-stack-the-shared-cosyte-standard)
- [v1 scope snapshot](#v1-scope-snapshot)
- [PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT (2026-08-06)](#phi-scan-rename-blind-at-precommit-2026-08-06)
- [PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL (2026-08-06)](#phi-scan-observed-nothing-is-global-2026-08-06)
- [REFUSAL-MESSAGE-PHI-ECHO (2026-08-06)](#refusal-message-phi-echo-2026-08-06)
- [X12-DISCARD-AFTER-STRAY-LX (2026-08-06)](#x12-discard-after-stray-lx-2026-08-06)
- [X12-837-SV-UNDEFINED-DECIMAL (2026-08-07)](#x12-837-sv-undefined-decimal-2026-08-07) - closes
  the `0` left open by the three decimal sections below
- [X12-PAY-TO-FUSION (2026-08-07)](#x12-pay-to-fusion-2026-08-07) - closes the one below
- [X12-837-LOOP-RESIDUALS: the pay-to-address fusion, cut back (2026-08-07)](#x12-837-loop-residuals-the-pay-to-address-fusion-cut-back-2026-08-07)
- [X12-837-LOOP-RESIDUALS (2026-08-05)](#x12-837-loop-residuals-2026-08-05)
- [X12-277-SVC07-NOT-DECODED (2026-08-05)](#x12-277-svc07-not-decoded-2026-08-05)
- [X12-VARIANT-LOOKUP-PROTOTYPE (2026-08-05)](#x12-variant-lookup-prototype-2026-08-05)
- [X12-837-SV-SILENT-ZERO (2026-08-05)](#x12-837-sv-silent-zero-2026-08-05)
- [X12-QUANTITY-SILENT-DEFAULTS (2026-08-05)](#x12-quantity-silent-defaults-2026-08-05) -
  imperatives relocated 2026-08-11 to [its own section](#x12-quantity-silent-defaults-2026-08-05-1)
- [X12-SVC-ELEMENT-MAP-OFF-BY-ONE (2026-08-04)](#x12-svc-element-map-off-by-one-2026-08-04)
- [X12-NO-INTERNAL-REFS-GATE (2026-08-11)](#x12-no-internal-refs-gate-2026-08-11) - the port,
  its counted divergence from the sibling copies, and the control that caught a vacuous positive
- [X12-DECIMAL-BYPASSES-THE-GUARD (2026-08-04)](#x12-decimal-bypasses-the-guard-2026-08-04) -
  imperatives relocated 2026-08-11 to [its own section](#x12-decimal-bypasses-the-guard-2026-08-04-1)
- [X12-NUMERIC-VALUE-EMITS-EMPTY (2026-08-03)](#x12-numeric-value-emits-empty-2026-08-03) -
  imperatives relocated 2026-08-11 to [its own section](#x12-numeric-value-emits-empty-2026-08-03-1)
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
- [Published scope: the 270 and 276 inquiry directions](#published-scope-the-270-and-276-inquiry-directions)
- [ASSETS-P8: the attw wrapper](#assets-p8-the-attw-wrapper)

Folded in on 2026-11-08 from the files that sat in `documentation/agent-notes/`:

- [`ASSETS-P8`: the `attw` gate lies](#assets-p8-the-attw-gate-lies)
- [x12 - narrative relocated out of `CLAUDE.md` (2026-08-07)](#x12---narrative-relocated-out-of-claudemd-2026-08-07)
- [`PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` (2026-08-03)](#parser-testtimeout-asserts-an-idle-box-2026-08-03-1)
- [x12 - per-transaction invariants that shipped with the phases](#x12---per-transaction-invariants-that-shipped-with-the-phases)
- [`PHI-SCAN-WALK-ROOT-SCOPE` in `@cosyte/x12` (2026-08-08)](#phi-scan-walk-root-scope-in-cosytex12-2026-08-08)
- [`X12-837-AMBIGUOUS-VARIANT` (2026-08-08)](#x12-837-ambiguous-variant-2026-08-08)
- [`X12-837-EMIT-IDENTIFIER-FIXED` (2026-08-08)](#x12-837-emit-identifier-fixed-2026-08-08)
- [`X12-837-LOOP-RESIDUALS` (2026-08-05)](#x12-837-loop-residuals-2026-08-05-1)
- [`X12-837-SV-SILENT-ZERO` (2026-08-05)](#x12-837-sv-silent-zero-2026-08-05-1)
- [`X12-837-SV1-OVERWRITE` (2026-08-08) - a second service segment replaced the first, silently](#x12-837-sv1-overwrite-2026-08-08---a-second-service-segment-replaced-the-first-silently)
- [x12 - the `AMT` / `ADX` absent-amount silent drop (2026-08-07)](#x12---the-amt--adx-absent-amount-silent-drop-2026-08-07)
- [`X12-BODY-DEGENERATE-RELEASE-SEPARATOR` (2026-08-09)](#x12-body-degenerate-release-separator-2026-08-09)
- [`X12-BUILDER-BOUNDS` (2026-08-02)](#x12-builder-bounds-2026-08-02-1)
- [`X12-CALLER-VALUE-RESIDUALS` (2026-08-02)](#x12-caller-value-residuals-2026-08-02-1)
- [`X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED` (2026-08-09)](#x12-control-number-guard-not-type-checked-2026-08-09)
- [`X12-EMIT-DEGENERATE-RELEASE-DELIMITER` (2026-08-09)](#x12-emit-degenerate-release-delimiter-2026-08-09)
- [`X12-EMIT-DELIMITER-SHAPE-UNCHECKED` (2026-08-09)](#x12-emit-delimiter-shape-unchecked-2026-08-09)
- [`X12-EMPTY-CONTROL-NUMBER-FABRICATED` (2026-08-09)](#x12-empty-control-number-fabricated-2026-08-09)
- [`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` (2026-08-08)](#x12-envelope-splitter-not-release-aware-2026-08-08)
- [`X12-ENVELOPE-VALUE-EXAMPLES` (2026-08-10)](#x12-envelope-value-examples-2026-08-10)
- [`X12-ENVELOPE-VALUE-POINTERS` - a JSDoc that points a consumer at an envelope element index for a value](#x12-envelope-value-pointers---a-jsdoc-that-points-a-consumer-at-an-envelope-element-index-for-a-value)
- [`X12-ENVELOPE-VALUE-ROUTES` - what a caller actually does to read an envelope element](#x12-envelope-value-routes---what-a-caller-actually-does-to-read-an-envelope-element)
- [`X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` (2026-08-08)](#x12-interchange-gs-emit-not-release-aware-2026-08-08)
- [`X12-ISA-ELEMENT-ARITY` - the ISA split had no arity check (2026-08-10)](#x12-isa-element-arity---the-isa-split-had-no-arity-check-2026-08-10)
- [`X12-ISA-VALUE-POINTERS` (2026-08-11)](#x12-isa-value-pointers-2026-08-11)
- [`X12-ORPHAN-REEMIT` (2026-08-02)](#x12-orphan-reemit-2026-08-02-1)
- [`X12-PRE-005010-RUNTIME-MESSAGE` (2026-08-11)](#x12-pre-005010-runtime-message-2026-08-11)
- [`X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` (2026-08-02)](#x12-segment-outside-transaction-dropped-2026-08-02-1)
- [`X12-ST03-READ-NOT-RELEASE-AWARE` - the ST-03 readers published the escape](#x12-st03-read-not-release-aware---the-st-03-readers-published-the-escape)
- [x12 - a stated amount discarded anyway (2026-08-07)](#x12---a-stated-amount-discarded-anyway-2026-08-07)
- [`X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (2026-08-04)](#x12-svc-element-map-off-by-one-2026-08-04-1)
- [x12 - an Accept `TA1` this library emitted read back as a Reject (`X12-TA1-EMIT-NOT-RELEASE-AWARE`)](#x12---an-accept-ta1-this-library-emitted-read-back-as-a-reject-x12-ta1-emit-not-release-aware)
- [x12 - the two TA1 residuals the acknowledgment arc left open (`X12-TA1-RESIDUALS`)](#x12---the-two-ta1-residuals-the-acknowledgment-arc-left-open-x12-ta1-residuals)
- [x12 - grounding `VARIANT_BY_ICR` (`X12-VARIANT-ICR-UNGROUNDED`, 2026-08-08)](#x12---grounding-variant_by_icr-x12-variant-icr-ungrounded-2026-08-08)
- [`X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05)](#x12-variant-lookup-prototype-2026-08-05-1)

## Rules moved off the card

On 2026-11-08 the `CLAUDE.md` card was cut to the house spec: at most 60 lines of at most 100
characters, and 5,120 bytes. What follows is the text it carried until then, word for word, so
nothing a rule said was lost. Where it says the shared ladder runs on Node 22 and 24, the matrix
gained Node 26 on 2026-11-08.

### The gate in full

From the repo root, in this order, with pnpm 10.34.5 (the `packageManager` pin). pnpm 12 ignores `pnpm.overrides` and refuses the frozen install, and tests shell out to bare `pnpm`, so where `pnpm --version` prints another version put the pinned one first on PATH: `mkdir -p ~/.pnpm10 && corepack enable --install-directory ~/.pnpm10 pnpm && export PATH="$HOME/.pnpm10:$PATH"`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm phi-scan
pnpm test
pnpm test:coverage
pnpm build
pnpm attw
pnpm typecheck:examples
pnpm lint:examples
pnpm examples
pnpm phi-scan:examples
pnpm check:no-emdash
pnpm check:no-internal-refs
pnpm differential:check
```

The first nine are the shared `cosyte/.github` CI ladder, run on Node 22 and 24. The examples steps and `differential:check` are jobs in `.github/workflows/ci.yml`, and the two `check:` scripts run in workflows of their own. `differential:check` fetches its two pinned Python oracles through `uv` (on PATH), so it needs the network. CI alone also loads `dist/` as ESM and as CJS, runs actionlint (installed by its action) and CodeQL, dry-runs the publish and the pack, and installs the packed tarball into a clean directory.

### The rules in full

Each names the failure that put it here.

- A warning's `message` is a lookup in `ALL_WARNING_MESSAGES`, no warning factory takes a value, and a `build*` refusal bounds the caller value it names: warnings once rendered control numbers verbatim (#46), and a refusal echoed the claim id it refused (#75).
- Never fabricate a value. An absent or undecodable element stays undefined and warns, and a builder refuses an empty one rather than pad it: an unparseable decimal read as 0 (#66), an absent SV1-02 as a confident 0 charge (#83), and an empty control number was emitted as `000000000` (#101).
- A repeated or contested segment never resolves in silence: a second `SVx` in one Loop 2400 replaced the first (#88), and a contested 837 variant was picked with no warning (#87).
- Builders refuse a value they cannot emit exactly; never coerce, round or drop it: a number in a string slot emitted as an empty element (#60), and a raw number in an `X12Decimal` slot emitted `0.30000000000000004` (#63).
- Escape every caller value with the release character on emit, and split release-aware on read: an emitted TA1 Accept read back as a Reject (#97), `buildInterchange` emitted GS elements unescaped (#99), and a released delimiter split an envelope segment on read (#96).
- A table keyed by document bytes resolves through `wireLookup` (`src/parser/lookup.ts`) or `Object.hasOwn`, never a plain read or `in`: ST-03 `constructor` resolved the 837 variant to a function (#69).
- Check an element map against the implementation guide and literal bytes, never against this repo's own reader: the 835 `SVC` map was off by one in both directions and its round trip passed (#64).
- Envelope `raw` and `elements[n]` are raw text, not decoded values, and no doc may promise a value from them: three PRs took such promises back out of the shipped `.d.ts` (#110, #116, #119).
- Derive what the package reads and emits from `X12_TR3_CONFORMANCE`, never from prose or memory: the entry point declared a second 278 guide the package does not conform to (#127).
- A segment outside a transaction stays on `orphanSegments` and re-emits at its `anchor`, never at its input `segmentIndex`: such segments were dropped on read and on emit (#48, #49).
- Bound every loop over a caller value before it runs: a forged array-like `length` coerced to `Infinity` and a builder spun forever (#53), and `testTimeout` cannot catch such a loop because it wedges the worker (#58).
- The `--staged` git argv in `scripts/phi-scan.ts` keeps `--no-renames --ignore-submodules=none --diff-filter=AMTUB`, and the scan takes no path or file-type exemption: a rename, copy or gitlink passed it unseen (#76), and all mode reported clean over files it never opened (#77, #90).
- `pnpm attw` stays `node scripts/attw.mjs`: bare `attw` exits 0 on a tarball that carries no types (#55).
- `README.md`, `KNOWN-LIMITATIONS.md`, `docs-content/` and `/** */` comments in `src/` (they ship in `dist/*.d.ts`) carry no internal identifiers or phase language; translate a hit, never delete the comment: `dist/index.d.ts` shipped 13 item identifiers (#120).
- Never add the sibling repos' `X12-\d{3}[A-Z]?|X12-\d{6}` exclusion to `scripts/check-no-internal-refs.sh`: `X12-` is also our item prefix, and that pattern matched 141 internal identifiers and no standards designation (#120).
- A changeset's first sentence becomes the release headline, so write it for a consumer with no internal identifier: the release gate refused 0.0.14 and 0.0.16 over one and published nothing (#93, #114).
- Never hand-edit `CHANGELOG.md`; a release writes it from the changeset summaries above the frozen hand-written archive: kept by hand, it fell behind npm and never recorded 0.1.2.
- The caller job in `.github/workflows/release.yml` grants every scope the shared release pipeline declares (`pnpm check:release-caller-permissions`): a short grant failed every Release at startup with no logs (#27, #129, #133).
- In `docs-content/`, link a file outside it by its GitHub URL, and keep top-level sidebar categories on the docs site's spine: an escaping relative link broke the site build for eight nights (#125), and two extra categories blocked the 0.1.0 deploy (#159).

## CLAUDE-MD-AUDIT (2026-08-04)

The reasoning behind this archive and the bound on `CLAUDE.md`, relocated out of `CLAUDE.md`
itself on 2026-08-05 to pay for the `X12-837-SV-SILENT-ZERO` trap. Verbatim:

- **This file used to be 106,994 bytes.** The narrative that made it that big - the per-incident
  write-ups, the shipped-phase histories, the measurements, and every refutation that killed a
  remedy - is now in `documentation/agent-notes.md`, verbatim and unedited, under headings named for
  the item that produced them. Relocated 2026-08-04 under `CLAUDE-MD-AUDIT` (meta-repo
  decision on file sizes, since retired, 2026-08-04 amendment). **This file's size is bounded
  at write time by the umbrella's size hook (since retired). Never quote its number here - read
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
`scripts/attw.mjs` and never the bare CLI. The org-wide standards now live in the umbrella's
`plans/standards.md`; this was always a summary.

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

**▶ CLOSED** by [`documentation/agent-notes.md#x12-pay-to-fusion-2026-08-07`](#x12-pay-to-fusion-2026-08-07). Nothing below
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
  The x12 roadmap of the time, since replaced by the umbrella's `plans/`, also carried no
  `Provenance:` field where sibling roadmaps did.

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
  caller-supplied elements directly, no `pad` (it imports none) - so
  `TA1**250101*1200*A*000` emitted silently for a numeric or `undefined` control
  number until `X12-TA1-EMIT-NOT-RELEASE-AWARE` routed the five through `esc`. **TA1-01 is data element I12, the reassociation key back to the
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
  with no warning and no error.** Every builder declaring an `esc` now takes it
  from `makeCallerEscaper` (`src/builder/caller-string.ts`), which type-checks
  first and refuses with the calling module's own typed, code-tagged error.

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
  `buildTA1` had no `esc` at all (**and no `pad` either - the "every element
  fixed-width" reason recorded here was false in both halves**), and
  `X12-TA1-EMIT-NOT-RELEASE-AWARE` gave it one. And
  the refusal names the **builder, not the element position**: `esc` is unary.
  **Its counts are asserted by the gate and NOT quoted here; a count duplicated
  in prose drifts, and this one had.** **The first draft published "378 call
  sites", which is the LINE count** - the same miscount, shipped twice. And **"no working caller is broken" was too absolute**: a
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

- On the shared Cosyte engineering standard (migrated Phase E): toolchain inherited from the
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
--staged`) and in CI (`run-phi-scan: true`); the umbrella's old `verify.sh`
  summary showed `phi-scan ✓`.

## Published scope: the 270 and 276 inquiry directions

- Pre-alpha `0.0.x`, **published** to npm from a public repo. Never quote a
  version here: `npm view @cosyte/x12 version` is the only source of truth.
  The **read** scope is decoded for 270, 271, 276, 277/277CA, 278, 820, 834,
  835, 837P/I/D, 999, and TA1.
  **BOTH inquiry directions are CLOSED now, and the label rule outlives them.**
  `get270Inquiry` / `parse270Inquiries` / `build270` closed the eligibility
  half, and `get276StatusInquiry` / `parse276StatusInquiries` / `build276`
  closed the claim-status half; each pair shipped read and emit together,
  because this package holds emit scope complete wherever read scope is, so a
  reader without its builder was never a landable state.
  **Still write "270" and "276" separately, and never restate a scope line
  from memory.** One paired label over two halves is exactly how these two came
  to be described as one shipped thing when neither was, and the README and the
  docs site carried that wrong until ASSETS-P8 corrected it. The 276 half then
  stayed missing for a whole phase after the 270 shipped, with four carriers
  (`KNOWN-LIMITATIONS.md`, `CLAUDE.md`, the README, the docs site) saying so in
  four slightly different ways, which is the cost of describing a scope in prose
  rather than deriving it. `X12_TR3_CONFORMANCE` is the derived answer and
  `test/tr3-conformance.test.ts` reds when a reader or a builder exists without
  a row.
  **The two directions carry SIBLING warning codes and SIBLING build-error
  classes, never one widened set.** `X12_276_LEVEL_DETACHED` is not
  `X12_270_LEVEL_DETACHED` and `ClaimStatus276BuildError` is not
  `Eligibility270BuildError`: a consumer narrowing on the eligibility name must
  not start seeing claim-status requests on a predicate written for eligibility
  inquiries, and renaming a published error is a breaking change. The one code
  the 276 REUSES is `X12_AMOUNT_ROW_DROPPED`, because that code already names
  exactly that loss for every AMT this library reads and its message scopes
  itself to the row rather than to a transaction.
  **The 276 spine is the 277's and it is one level deeper than the 270's**:
  `20` source, `21` receiver, `19` service provider, `22` subscriber, `23`
  dependent. So "a receiver with no subscriber" is TWO links in this family and
  one in the eligibility family, and the builder refuses both of them.
  **No external oracle exists for the 276 request**, so nothing here claims
  differential conformance: the evidence is the round trip, the committed
  golden, the property suite and the 277's own declarations. The general
  **emit** surface
  (`serializeX12` + `buildInterchange`)
  shipped in Phase 8, and (with Phase 8f) the **domain emit**
  scope is complete for every transaction that has a reader: a per-TR3 domain builder
  (`build835` / `build837P/I/D` / `build270` / `build271` / `build276` / `build277` / `277CA` /
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

## `ASSETS-P8`: the `attw` gate lies

**RELOCATED VERBATIM FROM `CLAUDE.md` 2026-08-08, NOTHING DROPPED**, to pay for the
`X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` trap under that file's own ratchet: relocate first, never
delete a trap, never raise the ceiling. The measurement, sources and refutation history stay in
`documentation/agent-notes.md#assets-p8-the-attw-wrapper`; the imperatives are below and they are
LIVE.

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

## x12 - narrative relocated out of `CLAUDE.md` (2026-08-07)

Relocated to pay for **three** owed trap blocks at once: `X12-PAY-TO-FUSION` and
`X12-837-SV-UNDEFINED-DECIMAL`, which two consecutive slices left unpaid because the file stood at
**52,907 of a 52,912-byte entry** with five bytes of room, and `X12-AMT-ADX-ABSENT-AMOUNT`, the
slice that did the relocating. **A debt like that compounds: with no room, the next defect found
cannot be recorded either**, which is why it was cleared before the new trap was written rather than
after.

It landed here rather than in `documentation/agent-notes.md` for a measured reason: **that file was
itself at 249,982 of a 250,000-byte budget**, so relocating into it would have moved the same problem
one level down and the hook refused the write. This is the same split
`documentation/agent-notes.md#x12-pay-to-fusion-2026-08-07` and `.../x12-837-sv-undefined-decimal.md` already
use.

**The imperatives all stayed behind in `CLAUDE.md`.** What moved is prose that either restates the
meta-repo's own `documentation/conventions.md` or restates the README's pitch. **Nothing was deleted
and no trap was touched** - a trap deleted to hit a number is the one failure mode the bound exists
to prevent (meta-repo decision on file sizes, since retired). The umbrella owes the matching
ratchet drop: it lives in the umbrella's size hook (since retired), not in this repo, and it is **LOWERED on a
shrink, never raised to meet a trap**.

Verbatim, five pieces.

### 1. `## Project` - the identity paragraph and the north star

What stayed behind is a one-line identity plus the pointer to this file.

> **`@cosyte/x12`**: a developer-focused ASC X12 EDI parser + utility library for Node.js/TypeScript,
> published under the Cosyte brand. Open-source (MIT). The payer-side sibling of
> [`@cosyte/hl7`](https://github.com/cosyte/hl7): API shape, profile system, and lenient-parser philosophy are deliberately
> mirrored.
>
> **North star:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and
> pull useful fields out of it in one line, without having read the X12 standard or any TR3
> implementation guide.

### 2. `## Sibling Project`

Folded into the identity line that stayed behind, because it said the same thing twice.

> **`@cosyte/hl7`** lives at `../hl7` and ships a matching API shape for HL7 v2. When in doubt on an
> API decision, check how `@cosyte/hl7` solved it. Symmetry is a feature, not an accident.

### 3. The Postel's-Law guardrail, long form

The load-bearing halves stayed behind in `CLAUDE.md`: `serialize(parse(s)) === s` is NOT guaranteed,
"my file has no line breaks" is not sufficient to make it hold, `KNOWN-LIMITATIONS.md` is the
canonical list of what is not reproduced, `recomputeCounts` is inert without `specClean`, and nothing
is ever silently corrected.

> - Postel's Law: parser is liberal (lenient default + warnings with stable codes and positional
>   context); serializer is conservative. Be exact about what that means, because the README said it
>   loosely until ASSETS-P8: the domain builders emit spec-clean X12 by construction, but
>   `serializeX12` is **byte-faithful by default only for the segments the parser recorded on the
>   model**. `serialize(parse(s)) === s` is NOT guaranteed, and "my file has no line breaks" is not
>   sufficient to make it hold - `KNOWN-LIMITATIONS.md` holds the canonical list of what is not
>   reproduced, most of which needs no line break and is silent. `{ specClean: true }` reconciles the
>   envelope and warns; `{ specClean: true, recomputeCounts: true }` also emits the corrected counts.
>   `recomputeCounts` is inert without `specClean`. Nothing is ever silently corrected.

### 4. `## Standing disciplines (every change)`, disciplines 1 through 3

These are mirrored from the meta-repo's `documentation/conventions.md`, which is the source of truth
for them, so the copy here was always a duplicate. **The fourth discipline stayed behind** and is the
one this repo owns: an incident's narrative goes into `documentation/agent-notes*`, and only its
imperative goes back to `CLAUDE.md`.

> These three bind every change in this repo (mirrored from the Cosyte meta-repo's
> `documentation/conventions.md`):
>
> 1. **Documentation follows code.** A public-surface / stack / status change isn't done until its
>    docs are: this package's own docs (`docs-content/` + JSDoc), and (in the meta-repo) its
>    `documentation/repos/<repo>.md` and the `ecosystem-map.md` status table.
> 2. **Version + changelog every meaningful change.** Add a Changeset (`pnpm changeset`, `patch`
>    during pre-alpha) and keep `CHANGELOG.md`'s `[Unreleased]` current. Stay on `0.0.x` until first
>    alpha.
> 3. **Crew + knowledgebase feedback loop.** When a standard, decision, or public surface changes,
>    flag whether a `crew` skill or `knowledgebase` doc needs creating/updating, never silently skip.

### 5. Per-transaction-invariant bullets, long form

These are traps, not narrative, so **the imperative of every one of them stayed in `CLAUDE.md`** and
only the surrounding explanation moved. No count of them is given here: this repo has been wrong
about a census five separate times and the sections below are the list. They are reproduced whole here so nothing is lost. Full
detail for all of them is still in the phase sections of `documentation/agent-notes.md`,
`#phase-9-profiles-and-quirk-attribution` through `#phase-1-envelope-decoder`.

#### The three profile bullets

> - **🩺 v1 profiles are DESCRIPTIVE: a profile NEVER alters the parse.** `groups`, `warnings` and
>   `isa` are byte-identical with and without one (asserted by a divergence test); it attaches
>   attribution to `ix.profile` and powers the one behavioural hook, `partitionWarnings`.
> - **🩺 HARD RULE, LOCKED: a profile quirk with no Tier-2 fixture demonstrating the deviation is
>   FORBIDDEN. No invented quirks.** Enforced three ways: `fixture` is required at the type level,
>   `defineProfile()` rejects a missing or ill-formed fixture path, and the accuracy suite's
>   per-quirk DEMONSTRATOR registry asserts the cited fixture actually exhibits its claimed
>   deviation, so a real-but-irrelevant fixture cannot slip past. A generic Medicare-FFS profile was
>   DEFERRED rather than invented. Built-ins reach consumers only through the `profiles` namespace,
>   never the top-level export.
> - **The profile API DIVERGES from `hl7` by design, and the divergences are conscious, not drift**
>   (`describe()` returning DATA and not hl7's formatted string, `X12ProfileSpec`, the x12-only
>   `partitionWarnings`), driven by x12's lossless-lenient reality. **"Symmetry is a feature" does
>   not license collapsing these back onto hl7's shapes.**

#### The HL spine, with the four level chains

The chains are the part that moved; the rule and the "no level field on `Build271Spec` or
`Build277Spec`" prohibition stayed behind.

> - **🩺 The HL spine is computed, never caller-supplied. Base stated this per builder and never as a
>   blanket - keep it that way.** `build837P/I/D` OWNS the 837's safety primitive
>   (`20 -> 22 -> 23`); `build271` (`20 -> 21 -> 22 -> 23`), `build277` / `build277CA`
>   (`20 -> 21 -> 19 -> 22 -> 23`) and `build278Request` / `build278Response`
>   (`20 -> 21 -> 22 -> 23 -> EV/SS`) own theirs. All four compute HL-01, HL-02 and HL-04 from the
>   nested input tree and take HL-03 from a module-level `HL_LEVEL` constant selected by tree
>   position, at every level **except** the 278's EV/SS review level. Where the builder owns the
>   field, a structurally inconsistent hierarchy is _unrepresentable_ and SE-01 is correct by
>   construction. **There is no level field on `Build271Spec` or `Build277Spec` and none should be
>   added** - that would destroy the guarantee, not close a gap.

#### The 834 maintenance type

> - **🩺 Maintenance type is the 834's safety primitive: emit verbatim, refuse the unknown.** The
>   builder places the caller's INS-03 / HD-01 code (X12 code source 875) into the segment VERBATIM
>   and NEVER infers or normalizes it. Where the lenient read side only WARNS
>   (`X12_834_UNKNOWN_MAINTENANCE_TYPE` on the affected member only), the builder REFUSES to emit an
>   action it cannot name. On the read side the code is preserved verbatim and the warning is scoped
>   to the affected member only, so one unknown code never invalidates the roster.

#### The caller guards, long form

The rule, the "never re-add a value" prohibition and both of the two things it does NOT say stayed
behind. What moved is the worked example and the locator detail.

> - **🩺 NO CALLER GUARD ECHOES WHAT A CALLER PUT IN AN ELEMENT** - string/segment/decimal and the
>   array guard's PRIMITIVE arm report the TYPE only. A `JSON.parse`d spec used to put a NUMERIC
>   `claimId` or member id in the message, bounded to 90, NOT redacted. **The old disclosure named
>   `requireCallerSegment`; `requireCallerString` fires for `CLP-01`, and both echoed. Never re-add a
>   value, never fold the decimal one back out. And state what this does NOT say, drafted false
>   once:** the array guard STILL renders a forged array-like's `length` and class tag
>   (SHAPE, not element contents). The segment guard's locator admits
>   `parts[0]` by the segment-id GRAMMAR, never by length.

#### The domain-builder refusal message

The enumerated negative list moved; the rule, the "state it PER BUILDER" instruction, the ack-path
exception and the "guarantee about the TEMPLATES" qualifier all stayed behind.

> - **🩺 Every DOMAIN builder's own refusal message carries structural locators, counts and numeric
>   totals only** - never a `claimId` (patient-account number), member id, member name, trace, or
>   diagnosis code. `build834` additionally names the offending maintenance code, an X12 control code
>   and never PHI. **State this per builder, as base did, never as a property of every builder.** One
>   standing exception, the **ack path**: `build999` interpolates the acknowledged ST-02 (AK2-02,
>   verbatim by TR3 005010X231A1) and `buildTA1` its TA1-05 note code (see "the caller-vs-document
>   dichotomy is NOT categorical" above). **The negative list is NOT an absolute PHI guarantee; it is
>   a guarantee about the builder's own TEMPLATES**, which still render control numbers and control
>   codes.

### 6. Trap-bullet explanation relocated by `X12-STATED-AMOUNT-DISCARDED` (2026-08-07)

A second round of relocation, to fund that slice's trap block from a file that stood at **52,730 of a
52,730-byte entry with zero room**. **Every imperative stayed behind in `CLAUDE.md`.** What moved is
measurement and incident history that the trap line no longer needs in order to be actionable, and
that is already carried in `documentation/agent-notes.md` or `documentation/repos/x12.md` in the
meta-repo. **No trap was deleted and no bullet lost its instruction.** Eight pieces, verbatim.

#### `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` - the three measured corruption shapes

The bullet still says NEVER replay an orphan at its recorded `segmentIndex`, still says to read the
refutation first, and still names the addressing scheme as the defect. What moved is what was
measured when the replay was tried:

> measured, a stray `ZZ` landed INSIDE an 835's `ST..SE` body with **no warning at all**, a stray
> `SE` closed the transaction early and corrupted SE-01, and with a doubled terminator ahead of it
> the orphan crossed the IEA. Trading a warned omission for silent structural corruption is the
> wrong direction under this repo's own invariant.

#### `X12-BUILDER-BOUNDS` - the four holes, and the coercion regression

> four holes the item's census missed were `number`-typed AK9 counts, found only by adversarial
> review.

> A draft read `.length` where the base interpolated into a template literal, turning a typed
> refusal into an uncaught `TypeError`.

#### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` - three trailing measurements

The imperatives (count both trees; never reuse one census for the other; interleave BASE/HEAD runs,
two rounds each; do not upgrade the `10.0 s` reading into a proven crossing) all stayed.

> Raising the global hands the same leash to all 1,100-odd tests.

> a draft ported the head census onto the base state while quoting the rule against it.

> the agent-notes section measures what runs an hour apart showed instead.

#### `ASSETS-P8` - what else the gate test pins

> It also pins a negative control on a well-formed package and that a real `attw` failure still
> fails.

#### Per-transaction invariants - how the TRN echo is held

> Locked by round-trip property tests on both sides.

#### `X12-QUANTITY-SILENT-DEFAULTS` - two base measurements

> 7 of 9 base probes were wholly silent, 835 `SVC-05` among them.

> A draft said three, a refuter measured four.

#### `X12-837-LOOP-RESIDUALS` and `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` - two fragments

> Red control on both.

> The suite stayed green through the fix:

#### Pass-1 remedy round, four more fragments

The refuter's `INTRODUCED` major forced a wider trap bullet, and it was funded the same way rather
than by deleting anything. Verbatim:

> `hl7` measured two ported residuals as NOT OPEN at all.

> Opposite duties, opposite answers.

> derive its size there.

> a tripwire this repo has hit repeatedly.

### 7. Trap-bullet narrative relocated by `X12-837-AMBIGUOUS-VARIANT` (2026-08-08)

A third round, to fund that slice's trap block from a file that stood at **52,728 of a
52,728-byte entry with ZERO room** - the entry having been lowered to meet the shrink round 6
bought, exactly as the rule says it should be. **Every imperative stayed behind in `CLAUDE.md`**;
what moved is mechanism and incident history that the trap line does not need in order to be
actionable. **No trap was deleted.** The umbrella still owes the matching ratchet drop, which lives
in the umbrella's size hook (since retired) and is outside this repo. Four pieces, verbatim.

#### The `documentation/agent-notes*` preamble - the mechanism half

What stayed behind is the instruction: open the section a `###` heading names before acting on its
line; the newest sections are their own files under `documentation/agent-notes/`; never quote the
byte number, read `REPO_CLAUDE` in the hook; a new trap is PAID FOR BY RELOCATING FIRST and the
entry is LOWERED as the relocation lands, never raised; and **a trap deleted to hit a number is the
one failure mode this bound exists to prevent**. What moved is the account of how the bound came to
be split in two:

> Most are in [`documentation/agent-notes.md`](#x12-agent-notes); **that file is now on
> its own 250,000-byte budget too**, so the newest ones are their own files under
> `documentation/agent-notes/`. The bound and the per-repo ratchet are at
> `documentation/agent-notes.md#claude-md-audit-2026-08-04`. **Nothing was deleted - a trap deleted
> to hit a number is the one failure mode this bound exists to prevent.** This file is bounded at
> write time by the umbrella's size hook (since retired).

#### `X12-BUILDER-BOUNDS` - why it is not the PHI leak, long form

The bullet still says this is NOT `PHI-WARNING-MESSAGE-LEAK`, still says escaping was deliberately
not done, and still says the caller-vs-document dichotomy is NOT categorical. What moved is the
reasoning and the two counterexamples:

> there the value was the DOCUMENT's so bounding it was redaction; here the caller passed it in and
> still holds it. Escaping was **deliberately not done**, so a refusal message is bounded but
> **not** one log line. **The caller-vs-document dichotomy is NOT categorical** - TR3 005010X231A1
> has AK2-02 copy the acknowledged ST-02, and `buildTA1` echoes an inbound ISA-13.

#### `X12-CALLER-VALUE-RESIDUALS` - why `null` is ABSENT, long form

The bullet still says `requireCallerArray` answers `null` as ABSENT and still names `build835`'s
`claims` as the measured exception. What moved is why:

> Every site it replaced read `x.dates ?? []`, so guarding only `undefined` turned a valid 834 into
> a refusal. `null` is what a `JSON.parse`d payload carries for an absent list.
> (`enforceBalance` reads `spec.claims.map`, not the checked binding); pinned by a test.

#### `X12-CALLER-VALUE-RESIDUALS` - the 431-character measurement

The bullet still says to drive the shipped table rather than a side probe, and still says every
figure here is a measurement rather than a maximum. What moved is the figures themselves, which go
stale and are carried in the agent-notes section anyway:

> **431 is a measurement at a 120,000-character value, not a maximum** (that site's derived ceiling
> is 443; every site is asserted under 500). **The `QUIRK_ID_RE` comment claimed a bound the pattern
> never had.** Corrected the comment to the code, not the grammar to the comment.

#### `X12-DECIMAL-BYPASSES-THE-GUARD` - the enumerated list of raw slots routed through `esc`

The bullet still says the routed raw slots are delimiter-safe and type-checked, still says **only
these were routed**, and still says the residual delimiter injection is NOT stop-the-line. What
moved is the enumeration itself, which is a census of the shape this repo's own rule says to keep
out of `CLAUDE.md`:

> `build999`'s GS-06/GE-02, ST-02/SE-02, AK9-01, IK5-01 and GS-07; `groupDate`/`groupTime`
> (GS-04/GS-05) in **all seven** domain builders, not just the 999; `build278`'s **HL-03** (the one
> that IS, `EV`/`SS`); `build837`'s LX-01.

#### `ASSETS-P8` - the build-interval mechanism, and the second net's zero instances

The two bullets still say to re-measure the interval per repo rather than carrying a sibling's
figure, still say the answer is NOT a lock, a lease or a build queue (ADR 0015), and still say to
keep BOTH nets in `scripts/attw.mjs`. What moved is the mechanism and one piece of history:

> `tsup` emits JS in one pass and declarations in a later one, so **every** build has an interval
> where `dist/` holds `.mjs`/`.cjs` and no `.d.ts` (**1.92 s measured on this package**).

> No instance of that second case has occurred in this repo yet.

#### `PHI-WARNING-MESSAGE-LEAK` - the five wrong places

The bullet still says to correct the disclosure in the same commit as the fix that makes the new
wording true. What moved is the count, which is history:

> **The shipped disclosure was wrong in five places at once** (the five are listed in the
> agent-notes section).

#### `X12-ORPHAN-REEMIT` - what the SE-01 undercount actually did

The bullet still says SE-01 must count the bytes the serializer writes rather than the model rows,
and still cites X12.6. What moved is the incident:

> Pass 1 counted only `tx.rawSegments`, so spec-clean mode **rewrote a CORRECT `SE*4*` down to
> `SE*3*`**.

#### `X12-NUMERIC-VALUE-EMITS-EMPTY` - how the required-field guard was defeated

The bullet still says the builder's own required-field guard is defeated by a number, and still says
to check the TYPE rather than the sentinel. What moved is the instance:

> `build-835.ts` refused `patientControlNumber === ""` by name, and a number is not `""`, so it
> passed and became `""` one line later.

### 8. Trap-bullet narrative relocated by `X12-837-SV1-OVERWRITE` (2026-08-08)

A fourth round, to fund that slice's trap block from a file that stood at **52,723 of a
52,723-byte entry with ZERO room**, the entry having been lowered to meet round 7's shrink.
**Every imperative stayed behind in `CLAUDE.md`**; what moved is mechanism, enumeration and
incident history that the trap line does not need in order to be actionable. **No trap was
deleted.** The umbrella still owes the matching ratchet drop, which lives in
the umbrella's size hook (since retired) and is outside this repo. **No count of the pieces and no NEW byte figure is
published here** - both drifted once already, and a drifting number is deleted rather than
corrected. The subsections below are the list; derive the size with `wc -c x12/CLAUDE.md`.

#### `X12-DECIMAL-BYPASSES-THE-GUARD` - the §1.10.2 balance terms, enumerated

The bullet still says to state the rule and name spec fields rather than element numbers, still
says a slot refuses untyped exactly where the balance guard reads it as a term of one of the three
§1.10.2 invariants in `src/transactions/remit/balance.ts`, and still records that two successive
remedies published a closed list and an element-number list and both were measured wrong. **What
moved is the list itself, which is the thing that lets a wrong count self-correct - read it here,
never re-derive it:**

> `payment.totalActualPayment`, `claim.totalChargeAmount`, `claim.totalPaymentAmount`, every
> `adjustments[].amount` at claim and line level, `serviceLine.chargeAmount`,
> `serviceLine.paymentAmount`, `providerAdjustments[].amount`.

And the reason the second of those two remedies was wrong:

> the second because it graded the prose against this repo's code. Field names cannot drift that way.

#### `X12-DECIMAL-BYPASSES-THE-GUARD` - the fixed-width ISA line's two throws

The bullet still says the ISA line is joined directly and sits outside BOTH guards, and still says
both throws terminate and neither is silent. What moved is which throws what:

> `pad(1, 15)` throws an untyped `TypeError`; `padControl(1, 9)` throws the misleading "exceeds the
> 9-char spec limit".

#### `X12-DECIMAL-BYPASSES-THE-GUARD` - how a raw number bypassed the caller guard

The bullet still says every `X12Decimal` slot emits through the builder's `escDec` over
`requireCallerDecimal`. What moved is the mechanism and what it put on the wire:

> A raw `number` in an `X12Decimal` slot used to reach `esc` already stringified by
> `value.toString()`, so the caller guard never applied and `0.1+0.2`, `1e21` and `NaN` went out on
> the wire.

#### `X12-DECIMAL-BYPASSES-THE-GUARD` - refuse, never round

The bullet still says refuse rather than round, and still says guessing the scale of money is what
`X12Decimal` exists to prevent. What moved is the illustration:

> `0.30` guesses cents, `0.3` guesses tenths.

#### `X12-VARIANT-LOOKUP-PROTOTYPE` - what the prototype hole destroyed

The bullet still says `in` is not the safe form and to reach for `Object.hasOwn`, and still points
at the four further sites in the agent-notes section. What moved is the incident:

> **🩺 It destroyed strictly more than `#67`: an ST-03 of `constructor` made `variant` a FUNCTION,
> so EVERY Loop 2400 left the model with `warnings: []`.**

#### `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` - what 4 of 15 line-break sequences cost

The bullet still states the tolerance as 15 of 15 CR/LF sequences of length 0 to 3. What moved is
the incident:

> It admitted 4 of 15, so a uniformly **double-spaced file lost its ENTIRE interchange body** and
> returned `groups: []`.

#### `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` - why a `0.0.9` 835 must be re-emitted

The bullet still says 835s this library emitted at `0.0.9` or earlier are non-conformant and should
be re-emitted. What moved is the mechanism:

> their revenue code sits in SVC-05, so head reads it back as a paid quantity (`0300` -> 300 units)
> with no warning.

#### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` - the two measurements

The bullets still say the `tsx` -> `node` substitution is pinned as an EQUIVALENCE rather than
assumed and is scoped to `paths` mode only; that the global `testTimeout` stays at 10 s on purpose;
and that the `10.0 s` reading must not be upgraded into a proven crossing, because the reporter
rounds. What moved is why each holds:

> Nothing else enforces erasable-only syntax; the Node 22.18 floor is unenforced.

> The 10 MB+ 834 stream sits AT it and is green only on its own 120 s per-test ceiling.

#### `X12-NUMERIC-VALUE-EMITS-EMPTY` - what `escapeRelease` read

The bullet still says every builder that declares an `esc` takes it from `makeCallerEscaper`, which
type-checks first and refuses with the calling module's own typed, code-tagged error. (It said
"nine" until `X12-TA1-EMIT-NOT-RELEASE-AWARE` made it ten; the count is deleted rather than
re-derived, and `test/builder-string-type.test.ts` holds it.) What moved is the
mechanism and the slot it cost:

> `escapeRelease` read `value.length`, `undefined` on a number, so the value vanished with no
> warning and no error - including `CLP-01`, the reassociation key back to the 837's `CLM-01`.

#### `X12-CALLER-VALUE-RESIDUALS` - why the array-bounds control wedges

The bullet still says the negative control found something worse than a red, that removing a
`requireCallerArray` call WEDGES the test rather than failing it, and that this is the argument for
keeping the source scan exhaustive. What moved is the reason:

> A synchronous infinite loop never yields, so `testTimeout` cannot interrupt it.

#### `X12-QUANTITY-SILENT-DEFAULTS` - where a `ZERO`/`NOT_DECODED` pair was wrong

The bullet still says ONE message, NO discriminant. What moved is the census:

> a `ZERO`/`NOT_DECODED` pair was wrong at 835 `CAS`, 835 `PLB`, 837 `CAS`.

#### `ASSETS-P8` - the upstream line that returns 0

The bullet still says `attw` prints "does not contain types" and EXITS 0, that the `attw` script is
therefore `scripts/attw.mjs` and never the bare CLI, and that for a package which ships types it
means the declarations were not in the tarball. What moved is the upstream source:

> `getExitCode.js` in `@arethetypeswrong/cli` 0.18.4 opens with `if (!analysis.types) return 0` and
> the problem list is never consulted.

#### `PHI-WARNING-MESSAGE-LEAK` - the two things that leaked

The bullets still say shape-validate-then-echo cannot hold for a control number, whose grammar is
whatever the trading partner sent, and still say `X12Segment.id` is bounded to the segment-id
grammar with a `NON_SPEC_SEGMENT_ID` sentinel. What moved is what each was:

> `X12_CONTROL_NUMBER_MISMATCH` rendered both sides verbatim and unbounded on all six
> control-number slots.

> it was an unbounded copy of the segment's first element.

#### `X12-BUILDER-BOUNDS` - the two allowlists that leaked

The bullet still says `test/builder-refusal-bounds.test.ts` must never allow `String(...)` or
`String(<expr>.length)`, still says what remains allowed is a single-letter loop index and the
`width` literal only, and still says negative controls run both ways. What moved is the history:

> Its first allowlist admitted any `String(...)`; its second inspected the property NAME and not the
> operand, so a forged `{length}` sailed through.

#### The `phi-scan` gate - what `-B` prints, and the parser envelope's naive split

The bullets still say to quote the classification and never the letter, because `--diff-filter`
classifies a broken pair as `B` whatever letter it prints; and still say `splitSegments` is
release-aware via `findUnescapedTerminator` and that a degenerate terminator-is-release delimiter
set falls back to the literal scan. What moved is what each looks like:

> `-B` prints **`M`** + a score, one path, which `RAW_RECORD` parses happily.

> A naive `indexOf` split mid-value on a `?`-release-escaped terminator (`?~`).

#### The `phi-scan` gate - the allow-list's byte-strictness, compared

The bullet still says synthetic tokens are POSITIVELY DECLARED in `scripts/phi-allow-list.txt`,
byte-strict and with no inline header, and that a whole-file bypass needs `--allow-fixture` AND an
entry in `phi-scan-overrides.md`. What moved is the sibling it matches:

> as DICOM's `.dcm`

#### `X12-ORPHAN-REEMIT` - why case 6 is out of scope

The bullet still says the empty-first-element segment outside a transaction is deliberately NOT in
scope. What moved is the reason:

> The walker skips it, so there is nothing to re-emit; closing it is a RETENTION change to the
> `name.length > 0` guard and would mint new `X12_UNEXPECTED_SEGMENT`s.

### 9. Trap-bullet narrative relocated by `X12-VARIANT-ICR-UNGROUNDED` (2026-08-08)

`x12/CLAUDE.md` was at 52,710 of 52,710 with zero headroom, and this slice owed a trap. Nine pieces
of narrative moved here **first**; no trap was deleted and the entry in the umbrella's
the umbrella's size hook (since retired) was not raised. Each bullet still carries its imperative; what follows
is only the reasoning behind it.

#### `X12-CALLER-VALUE-RESIDUALS` - why `renderCallerJson` keeps `JSON.stringify`, and why `profileName` is not bounded

The bullet still says `renderCallerJson` bounds its OUTPUT, never throws, fabricates no closing
quote, and that `X12ProfileError.profileName` is deliberately NOT bounded. The two reasons:

> The value's TYPE is what is wrong at those sites, and `null` and `"null"` are different mistakes,
> so the JSON rendering is the point rather than an implementation detail. It survives circular
> references, `BigInt` and a hostile `toJSON`. `profileName` is left unbounded because truncating it
> would stop it matching what the consumer passed, which is the one thing that field is for.

#### `X12-CALLER-VALUE-RESIDUALS` - the `for...of` sites, and the reachability of a forged non-array

The bullet still scopes a forged non-array as availability rather than `STOP-THE-LINE`, and still
says the `for...of` sites throw with no `code`. What moved:

> Unreachable from TypeScript; reachable from JS, from a JSON payload, and from `@cosyte/cli`. The
> `for...of` sites are `buildInterchange`'s `spec.groups`, `build999`'s `transactionResponses`, and
> every optional leaf array; each throws `TypeError: ... is not iterable`. Disclosed, pinned.

#### `X12-CALLER-VALUE-RESIDUALS` - the four scopes neither gate scans

The bullet still says neither gate scans indexed loops outside the `build*` scope. The four:

> `src/loops/define.ts`, `src/profiles/validate.ts`, the `get-*.ts` readers, `src/parser/envelope.ts`.

#### `X12-BUILDER-BOUNDS` - why the build-side `segmentIndex: 0` is not the same defect

The bullet still says it was filed as the same defect and is not one. Why:

> The builder has no parsed segment stream, so the position is `UNANCHORED_BUILD_POSITION`, inert by
> construction. Fabricating an index would have named a segment no consumer can resolve.

#### `ASSETS-P8` - what each of the two `attw` nets catches

The bullet still says to keep BOTH nets in `scripts/attw.mjs`. What each is for:

> The **preflight** checks that every relative path `package.json` promises exists and is non-empty,
> which catches the `tsup` build interval and NAMES the missing file. The **post-check** on the
> untyped sentence catches what the preflight structurally cannot: declarations on disk but excluded
> from the tarball by `files` / `.npmignore`.

#### `X12-DECIMAL-BYPASSES-THE-GUARD` - what a `parts.length` bound over a caller array-like did

The bullet still says never to bound a loop that way and to iterate with `for...of`, which throws:

> A forged `{ length: undefined }` runs **zero** iterations and reports every segment clean.

#### `X12-VARIANT-LOOKUP-PROTOTYPE` - why no source scan can ship for the prototype defence

The bullet still says NO SOURCE SCAN SHIPS, DELIBERATELY. The reason:

> A scan cannot separate a wire-keyed table from a discriminant-keyed one, and `warnings.ts` has four
> of the latter, so it would need a per-TABLE allowlist. That is `#51`'s failure mode.

#### The `phi-scan` gate - why a walk root's own index entry is exempt

The bullet still says such a root's OWN index entry is EXEMPT and that its control must commit its
corpus. Why:

> The walk yields `<root>/<name>` and never `<root>`, so without the exemption the superset scan
> turns an exit 1 into a refusal.

#### The `phi-scan` gate - why the enumerate-then-read race is deferred

The bullet still says the race is deferred and that the reason is DIRECTION:

> Its remedy TOLERATES a failed read; these two rules NARROW what the enumeration admits. Mixing the
> two directions in one change is what makes a widening reintroduce the race verbatim.

### 10. Per-transaction-invariant narrative relocated by `PHI-SCAN-WALK-ROOT-SCOPE` (2026-08-08)

Relocated to pay for that slice's trap block. `CLAUDE.md` stood at **52,708 of a 52,708-byte entry**
with **zero** headroom, and the walk-root-scope slice found a real defect (`REQUIRED_DIRECTORIES`)
that had to be recordable. **The imperatives all stayed behind.** What moved is the long-form
explanation of two bullets in `### 🩺 Per-transaction invariants that shipped with the phases`, a
section whose own header already says the full detail is in the phase sections of
`documentation/agent-notes.md`. **Nothing was deleted and no trap was touched.** The umbrella owes the
matching ratchet drop in the umbrella's size hook (since retired), which is **LOWERED on a shrink, never raised
to meet a trap** - and a drain worker may not write it, so it is reported rather than made.

Verbatim, two pieces.

#### 10.1 The 278's EV/SS review level, the one caller-supplied HL-03

> - **🩺 The one caller-supplied HL-03 is the 278's EV/SS REVIEW level** (`review.levelCode`, default
>   `EV`; `esc` never constrained the value). **Both entry points now REFUSE anything else**
>   (`X12_278_BUILD_INVALID_SPEC`, no new code): the emit is well-formed but opens a loop no reader
>   opens, so the review **and its HCR-01 decision FAIL TO DECODE - they are NOT decoded WRONGLY**, and
>   never write the stronger form. **Resolve via the emitter's own `?? "EV"`, NEVER `!== undefined`** -
>   `null` is absent, and `undefined`-only refused a spec the emitter would have built. Reaches nested
>   and dependent reviews. **Do not restate this as a property of `build278`'s HL-03 generally, and do
>   not write "every builder that has one" over it** - its other four levels are library constants.

#### 10.2 The read side never re-numbers a broken HL pointer

> - **🩺 On the READ side the walker NEVER silently re-numbers a broken HL pointer** - it emits
>   `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`. The 278 `EV` / `SS` levels are
>   deliberately tolerant (omitted from the expected-parent map), which is why nothing on the read side
>   catches an out-of-enum HL-03 on a document this library did not emit. Untouched; a warning needs a
>   new registry code.

#### 10.3 Every DOMAIN builder's own refusal message, and the ack-path exception

> - **🩺 Every DOMAIN builder's own refusal message carries structural locators, counts and numeric
>   totals only** - never an identifier, a name, a trace or a clinical code. **State this PER BUILDER,
>   never as a property of every builder.** Standing exception, the **ack path**:
>   `build999` interpolates the acknowledged ST-02 and `buildTA1` its TA1-05 note code. **The negative
>   list is NOT an absolute PHI guarantee; it is one about the builder's own TEMPLATES**, which still
>   render control numbers and codes.

#### 10.4 No caller guard echoes what a caller put in an element

> - **🩺 NO CALLER GUARD ECHOES WHAT A CALLER PUT IN AN ELEMENT** - string/segment/decimal and the
>   array guard's PRIMITIVE arm report the TYPE only. **Never re-add a value, never fold the decimal
>   one back out. And state what this does NOT say, drafted false once:** the array
>   guard STILL renders a forged array-like's `length` and class tag (SHAPE, not element contents).

#### 10.5 The profile-quirk hard rule, and how it is enforced

> - **🩺 HARD RULE, LOCKED: a profile quirk with no Tier-2 fixture demonstrating the deviation is
>   FORBIDDEN. No invented quirks.** Enforced three ways, incl. a per-quirk DEMONSTRATOR registry, so a
>   real-but-irrelevant fixture cannot slip past. Built-ins reach consumers ONLY via `profiles`.

#### 10.6 Why composing builders emit the envelope inline

> - Emit the envelope INLINE, not via `buildInterchange`, in any domain builder that composes a
>   composite element (835, 837), so a pre-composed composite is never double-escaped. Composites
>   escape each component then join with the RAW component separator.

#### 10.7 The 278 certification decision, and the maintenance-type primitive

> - **🩺 Maintenance type is the 834's safety primitive: emit VERBATIM, refuse the unknown.** The
>   builder places the caller's INS-03 / HD-01 (code source 875) verbatim and NEVER infers or
>   normalizes; where the read side only WARNS (`X12_834_UNKNOWN_MAINTENANCE_TYPE`, **scoped to the
>   affected member only**) the builder REFUSES.
> - **🩺 The 278 certification decision is response-only and never inferred:** `build278Response`
>   places HCR-01 VERBATIM and never normalizes or **upgrades** it; `build278Request` REFUSES a review
>   carrying one.

#### 10.8 Four `phi-scan` imperatives that left `CLAUDE.md` and were not landed anywhere (2026-08-08)

**PASTED VERBATIM FROM `7d50305`'s `CLAUDE.md`, NOT REWRITTEN.** A refuter measured that
`PHI-SCAN-WALK-ROOT-SCOPE`'s compression of that trap section dropped these four outright: they were
removed from `CLAUDE.md` and appeared in no agent-notes file, which is the exact trade the umbrella's retired size decision
exists to prevent and which the note claiming "Nothing was dropped" asserted had not happened. They
govern the `--staged` commit-blocking route's own semantics.

> - **▶ 🩺 THE `--staged` ARGV IS THE GATE AND EVERY FLAG IN IT IS LOAD-BEARING; NEVER SHORTEN IT. ONE
>   RULE: DO NOT TRUST THE CALLER'S GIT CONFIG.** Five holes, all exit 0 over PHI, closed by
>   `--no-renames --ignore-submodules=none --diff-filter=AMTUB`. `T` is what
>   makes the mode check reachable. **`U` is closed by the FILTER, not `--no-renames`; never conflate
>   them**, and it refuses FIRST with its OWN message (mode `000000`). **ZERO stride work. Never add `-M`, `-C` or `--find-copies-harder`** - each
>   re-empties the route. **No test may run `git merge`** - it reds on CI on its own premise; stage the
>   conflict with `update-index`.
> - **▶ 🩺 QUOTE THE CLASSIFICATION, NEVER THE LETTER: `--diff-filter` classifies a broken pair as `B`
>   WHATEVER LETTER IT PRINTS** (what `-B` prints instead: relocated narrative §8). **A short fixture
>   does NOT break; the case needs bulk. NEVER RECORD A SIMILARITY
>   SCORE** - it drifts; **DELETE a drifting number, never correct it.**
>   **"Strict superset" REFUTED; EQUAL absent a rename/copy/gitlink/unmerged path.**
> - **🩺 Both enumerating routes REFUSE a symlink (exit 2), naming every offender**; neither FOLLOWS
>   an ENTRY it enumerated. Say ENTRY, not "anything": **a walk ROOT that is itself a link IS
>   followed** - a superset, not blind. **🔴 AND NOTHING UNDER SUCH A ROOT IS RECONCILED** (its files
>   are outside the `git ls-files` pathspec), so an EMPTIED link target reads **exit 0**.
>   PRE-EXISTING, OPEN: **the closure is "within the declared roots", NOT a universal.** **A refusal
>   NEVER reports the link target:** a diagnostic ABOUT a PHI leak is itself a PHI surface, so
>   describe the shape, never exemplify it.

### 11. The whole pre-compression `CLAUDE.md`, relocated by `S0262-x12-drift-check-phase-2` (2026-09-05)

The estate baseline (`config/drift-manifest.json`, `baselines.package.groups.agentDoc`) declares a
line ceiling for an agent-context doc and `config/scripts/drift-check.js` grades this repo against
it. This file was over that ceiling, so the traps were compressed to their imperatives, exactly as
the standing discipline requires: **narrative moves out and only the imperative comes back**.

**NOTHING WAS DROPPED, AND THIS SECTION IS THE PROOF RATHER THAN A CLAIM.** The whole file as it
stood at `5244254` is quoted below **byte for byte**, 573 lines, inside a fence so that a
reader can diff it against what came back rather than take a summary's word for it. **All 38 `###`
trap headings survived the compression with their own `agent-notes` pointers intact** - a trap
dropped to hit a number is the one failure mode the ceiling exists to prevent - and **every trap's
measurement, sources and refutation history were already in the note its heading names**, which is
why what moved here is CLAUDE.md's own restatement of them and not the measurements themselves.

The two brace-collapsed pointers below (`x12-{variant-icr-ungrounded,837-emit-identifier-fixed}.md`
and `x12-{amt-adx-absent-amount,stated-amount-discarded}.md`) are written out as explicit paths in
the compressed file. **A collapsed pointer resolves to nothing**, so it is a citation a reader cannot
follow and a checker cannot grade.

```markdown
# @cosyte/x12: Project Guide for Claude

## Project

**`@cosyte/x12`**: an ASC X12 EDI parser + utility library (Node/TS, MIT), the payer-side sibling of
**[`@cosyte/hl7`](../hl7)** at `../hl7` - API shape, profile system and lenient-parser philosophy are
deliberately mirrored, so **when in doubt on an API decision, check how `hl7` solved it.** The
identity paragraph, the north star and the sibling section are in
`documentation/agent-notes.md#x12---narrative-relocated-out-of-claudemd-2026-08-07`.

## ▶ Read this before you touch the parser: `documentation/agent-notes*`

**Every `###` heading in "Traps" below names the section carrying that trap's measurement, its
sources and its reasoning - open it before you act on the line.** Most are in
[`documentation/agent-notes.md`](documentation/agent-notes.md), itself budgeted, so the newest are
their own files under `documentation/agent-notes/` (mechanism: relocated narrative §7). **A trap
deleted to hit a number is the one failure mode this bound exists to prevent.** **Never quote this
file's number here, read `REPO_CLAUDE` in the umbrella's size hook (since retired).** **A new
trap here is PAID FOR BY RELOCATING FIRST**, and the entry is LOWERED as the relocation lands, never
raised to meet it.

## Status

Pre-alpha `0.0.x`, **published** to npm from a public repo. **Never quote a version here:**
`npm view @cosyte/x12 version` is the only source of truth.

- **Read scope is decoded for** 270, 271, 276, 277 / 277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1.
- **Emit scope is complete for every transaction that has a reader**: general (`serializeX12` +
  `buildInterchange`) plus a per-TR3 domain builder for each, and the pure-function `build999` /
  `buildTA1`, each layering the safety-critical per-TR3 invariants (balance, certification,
  maintenance-type fidelity, count reconciliation) on the general builder.
- **🩺 BOTH inquiry directions now ship, read AND emit** (`get276StatusInquiry` /
  `parse276StatusInquiries` / `build276` beside the 270 trio). **Never re-add a "no typed model for
  the 276" claim and never write one paired label over two halves** - that is how the README and the
  docs site were wrong until `ASSETS-P8`. Derive the scope from `X12_TR3_CONFORMANCE`, never from
  prose. 🩺 The 270 and 276 readers each attach a level by its OWN HL-02 and by nothing else: a
  pointer that does not resolve leaves that level and its whole subtree OFF the tree, warned, never
  re-parented onto whichever level was open. Their warning codes and build-error classes are
  SIBLINGS, never one widened set.
  Why: `documentation/agent-notes.md#published-scope-the-270-and-276-inquiry-directions`
- **Warning registry: additions-only, and NEVER quote its size here** - the count on this line was
  stale twice. Derive it: the codes are exported as `ALL_WARNING_MESSAGES`, and the four Tier-3
  fatals are enumerated under Engineering Guardrails below.
- **Profile system** (`defineProfile()`, `profiles`) shipped Phase 9; **PHI commit-gate** armed
  (`pnpm phi-scan`). **Phase histories 1-9 are in `documentation/agent-notes.md`** - read the phase
  section before changing a surface it built.

## v1 Scope Snapshot

HIPAA sets at **005010** (errata hooks); list at `documentation/agent-notes.md#v1-scope-snapshot`.
Non-healthcare (850/856/810/204), EDIFACT, AS2/SFTP and pre-005010 are out. **It is the v1 SCOPE
declaration, NOT a list of what SHIPPED** - `X12_TR3_CONFORMANCE` is the derived answer to that.

## Tech Stack (the shared `@cosyte/*` standard)

**The toolchain is INHERITED by depending on the published `@cosyte/*` config packages, never by
copying files.** Source of truth: the meta-repo's `documentation/conventions.md`; per-tool summary:
`documentation/agent-notes.md#tech-stack-the-shared-cosyte-standard`. **The `attw` script is
`scripts/attw.mjs`, NEVER the bare CLI** (`ASSETS-P8` trap below). **Runtime deps: ZERO.**

## Engineering Guardrails

- No `any`, no unjustified `as` (use `unknown` and narrow). JSDoc with `@example` on every public export. Immutable by default; mutate only via `setElement` / `addSegment` / `addLoopIteration` / `removeSegment`. No `console.*` in library code - throw typed errors or return results. Short, testable functions over parsing blobs.
- Postel's Law: parser liberal (lenient default + stable codes with positional context), serializer conservative. **Be exact, because the README said it loosely until ASSETS-P8** (long form: `documentation/agent-notes.md#x12---narrative-relocated-out-of-claudemd-2026-08-07`). The domain builders emit spec-clean by construction, but `serializeX12` is byte-faithful **only for the segments the parser recorded on the model**: **`serialize(parse(s)) === s` is NOT guaranteed, and "my file has no line breaks" is NOT sufficient** - `KNOWN-LIMITATIONS.md` is the canonical list, most of it needing no line break and silent. `{ specClean: true }` reconciles the envelope and WARNS; `recomputeCounts` is **inert without `specClean`**. Nothing is ever silently corrected.
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
  ISA EXEMPT** - `documentation/agent-notes.md#x12-envelope-splitter-not-release-aware-2026-08-08`.

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
`documentation/agent-notes.md#x12---narrative-relocated-out-of-claudemd-2026-08-07`.

**A fourth is this repo's own, added by `CLAUDE-MD-AUDIT`:** narrative from an incident, a refutation
or a shipped phase goes in **`documentation/agent-notes.md`**, or, once THAT file is on its own
budget, in **`documentation/agent-notes/<slug>.md`**; only its imperative comes back here. **The
ratchet is a ceiling, not a target** - `hl7`, the parser this one mirrors, is 8 KB. **Relocate BEFORE
you write the trap, and pay any trap the last slice left owed** - two consecutive slices did not, and
by the third there were five bytes left and three traps owed.
```

## `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` (2026-08-03)

**RELOCATED VERBATIM FROM `CLAUDE.md` 2026-08-08, NOTHING DROPPED**, to pay for the
`X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` trap under that file's own ratchet: relocate first, never
delete a trap, never raise the ceiling. The measurement, sources and refutation history stay in
`documentation/agent-notes.md#parser-testtimeout-asserts-an-idle-box-2026-08-03`; the imperatives are
below and they are LIVE.

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

## x12 - per-transaction invariants that shipped with the phases

**Relocated VERBATIM out of `CLAUDE.md` on 2026-08-08, nothing dropped**, to pay for the
`X12-TA1-EMIT-NOT-RELEASE-AWARE` trap under the ratchet that file states: a new trap is paid for by
relocating first, and the entry is LOWERED as the relocation lands, never raised. This is the
standing discipline's own destination for narrative from a shipped phase. `CLAUDE.md` keeps the
pointer and the list of what is in here; **every imperative below is live and none of it was
softened.**

Full detail for EVERY bullet below is in the phase sections of `documentation/agent-notes.md`, `#phase-9-profiles-and-quirk-attribution` through `#phase-1-envelope-decoder`. Open the phase that shipped the surface before you change it.

- **🩺 v1 profiles are DESCRIPTIVE: a profile NEVER alters the parse.** `groups` / `warnings` / `isa`
  are byte-identical with and without one (divergence test); `partitionWarnings` is the one hook.
- **🩺 HARD RULE, LOCKED: a profile quirk with no Tier-2 fixture demonstrating the deviation is
  FORBIDDEN. No invented quirks.** Enforced three ways; built-ins reach consumers ONLY via
  `profiles` - relocated narrative §10.5.
- **The profile API DIVERGES from `hl7` DELIBERATELY** (`describe()` returns DATA, `X12ProfileSpec`,
  the x12-only `partitionWarnings`). **"Symmetry is a feature" does NOT license collapsing them
  back.** Long form for all three: `claude-md-relocated-narrative.md`.
- **🩺 The 820 carries no TR3 balance equation:** `build820` emits every amount VERBATIM and NEVER
  raises a balance-mismatch refusal, a deliberate contrast with `build835`.
- **🩺 Maintenance type is the 834's safety primitive: emit VERBATIM, refuse the unknown** (the read
  side only WARNS, scoped to the affected member; the builder REFUSES). **🩺 The 278 certification
  decision is response-only and never inferred** - relocated narrative §10.7.
- **🩺 TRN echo is the safety-critical reassociation invariant: the builders place the caller's trace
  into TRN-02 VERBATIM and NEVER fabricate, normalize or mutate it.** Which echoes which: the phase
  sections.
- **🩺 The HL spine is COMPUTED, never caller-supplied. State it PER BUILDER, never as a blanket.**
  All four compute HL-01/02/04 from the nested tree and take HL-03 from a module-level `HL_LEVEL`
  constant, at every level EXCEPT the 278's EV/SS review level, so an inconsistent hierarchy is
  _unrepresentable_. **There is no level field on `Build271Spec` or `Build277Spec` and none should be
  added** - that destroys the guarantee rather than closing a gap. The four level chains: relocated
  narrative.
- **🩺 The one caller-supplied HL-03 is the 278's EV/SS REVIEW level** (`review.levelCode`, default
  `EV`). **Both entry points REFUSE anything else** (`X12_278_BUILD_INVALID_SPEC`, no new code): the
  review **and its HCR-01 decision FAIL TO DECODE - they are NOT decoded WRONGLY**. **Resolve via the
  emitter's own `?? "EV"`, NEVER `!== undefined`.** Reaches nested and dependent reviews. **Do not
  restate it as a property of `build278`'s HL-03 generally, nor write "every builder that has one"
  over it** - long form: relocated narrative §10.1.
- **🩺 On the READ side the walker NEVER silently re-numbers a broken HL pointer** - it emits
  `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`. The 278 `EV` / `SS` levels are
  deliberately tolerant, so nothing on the read side catches an out-of-enum HL-03 on a document this
  library did not emit. Untouched; a warning needs a new code - relocated narrative §10.2.
- **Emit the envelope INLINE, not via `buildInterchange`, in any domain builder that composes a
  composite element** (835, 837), so a pre-composed composite is never double-escaped - relocated
  narrative §10.6.
- **`splitSegments` is release-aware via `findUnescapedTerminator`** (what a naive `indexOf` split
  did: relocated narrative §8). A degenerate terminator-is-release delimiter set falls back to the
  literal scan.
- **Control NUMBERS are identity and are NEVER rewritten** even under `{ specClean: true }`;
  corrected COUNTS emit only with `{ recomputeCounts: true }`, inert without `specClean`. Every
  mismatch surfaces via `onWarning`, never silently corrected.
- **🩺 All monetary / percent / quantity fields decode as `X12Decimal`: string-backed, `BigInt`-exact,
  never `parseFloat`.**
- **🩺 The 835 model is NEVER silently rebalanced.** Three TR3 X221A1 §1.10.2 invariants (line, claim,
  top-of-remit) run after the walk and emit `X12_835_REMIT_BALANCE_MISMATCH`. **PLB amounts carry the
  RAW EDI sign (positive = take-back), so the top equation is `BPR-02 == Σ(CLP-04) - Σ(PLB)`.**
- **🩺 An unknown code preserves its verbatim value and warns; it is never dropped or normalized.**
  **NAME THE RULE, NEVER THE MEMBERS** - derive the codes from `WARNING_CODES`. The HI one keeps the
  verbatim qualifier AND code with `codeSystem: "unknown"`.
- **🩺 Acks are structurally PHI-free by design; `IK4-04` is a caller surface callers SHOULD omit
  when the bytes are PHI, and the library NEVER auto-populates it.**
- **`build999` REFUSES `Accept` with a non-empty error list (`X12_ACK_ACCEPT_WITH_ERRORS`) and bad
  AK9 counts (`X12_ACK_COUNT_MISMATCH`); `buildTA1` REFUSES `A` with a non-`000` note.**
- **🩺 Every DOMAIN builder's own refusal message carries structural locators, counts and numeric
  totals only** - never an identifier, name, trace or clinical code. **State this PER BUILDER, never
  as a property of every builder.** Standing exception, the **ack path** (`build999`, `buildTA1`).
  **It is NOT an absolute PHI guarantee, only one about TEMPLATES** - relocated narrative §10.3.
- **🩺 NO CALLER GUARD ECHOES WHAT A CALLER PUT IN AN ELEMENT** - they report the TYPE only.
  **Never re-add a value, never fold the decimal one back out. What this does NOT say, drafted
  false once:** the array guard STILL renders a forged array-like's `length` and class tag -
  relocated narrative §10.4.
- **The `?`-release escape is honored losslessly**; dot-path traversal walks elements, composites
  (`-N`, 1-indexed) and repetitions (`[N]`, 0-indexed).
- **Known read-side limitations are documented, not accidental, and `KNOWN-LIMITATIONS.md`
  enumerates them.** One worth knowing here: `get834Enrollments` streams per `INS` loop over a file
  **still parsed into `tx.segments` up front** - an honest v1 limitation, not a streaming parser.

## `PHI-SCAN-WALK-ROOT-SCOPE` in `@cosyte/x12` (2026-08-08)

The `x12` leg of the org-wide item. Two sides, each **in addition to** the other, never instead of
it: the **enumeration** (what the routes open) and the **recogniser** (what the scanner can see once
a file is open). Enumerating alone buys the `scanCommonShapes` floor and nothing else.

Also relocated here, under the umbrella's retired size decision, is narrative that used to sit in the `phi-scan` trap section of
`CLAUDE.md`. **DO NOT WRITE "Nothing was dropped" OVER A COMPRESSION - a draft did, and a refuter
measured four imperatives gone from the tree entirely** (`T` in the diff filter, the `U` path's own
message and its zero stride work, "a short fixture does NOT break", and "describe the shape, never
exemplify it"). They are pasted verbatim into `claude-md-relocated-narrative.md` §10.8. The trap in
`CLAUDE.md` keeps the imperative; this file carries the measurement, the sources and the refutation
history.

---

### The figures, and how to re-derive them

**Derive every one of these; never quote a sibling's.** Two `git ls-files` invocations give both
denominators, and the second is the one a draft of this note got wrong first time:

```
git ls-files | wc -l                                   # tracked
git ls-files -- src test | grep -iv '\.md$' | wc -l     # opened by the walk (head)
git ls-files -- src test/fixtures | grep -iv '\.md$' | wc -l   # opened by the walk (base)
```

At base `7d50305`:

|                                              |         |
| -------------------------------------------- | ------- |
| tracked                                      | **306** |
| opened by the walk (`test/fixtures` + `src`) | **163** |
| opened by **neither** route                  | **143** |
| of those, tracked under `test/`              | **85**  |
| `.md` under either walk root                 | **0**   |

At head, **and note the denominator MOVES because this slice adds tracked files of its own** - a
refuter caught a draft of this table quoting base's 306 at head:

|                                     |         |
| ----------------------------------- | ------- |
| tracked                             | **308** |
| opened by the walk (`test` + `src`) | **248** |
| opened by **neither** route         | **60**  |
| of those, tracked under `test/`     | **0**   |

The remaining 60 are outside both roots: `.changeset/`, `.claude/`, `.github/`, `docs-content/`,
`documentation/`, `scripts/`, the root dotfiles and the root markdown. **That is a scope decision and
not this item**, and widening to them is not free: `scripts/phi-scan.ts` and
`scripts/phi-allow-list.txt` are the gate's own source and its declaration file, and every value in
both is a PHI shape by construction.

**Files hand-read: 85** - every file the widening opened, by a class sweep (person names, contact
names, `N3`/`N4` addresses, 10-or-more-digit runs, pre-2024 dates, emails, URLs, org names, `REF`
qualifiers) and then by reading every identifier-bearing line in each. **Nothing patient-identifying
was found.**

### What an EDI segment looks like to this scanner, and why the recogniser needed widening

`looksLikeX12` asks whether the **file IS an interchange**: it must start with `ISA` and be at least
106 bytes. **This package's inline fixtures are `.ts` string literals holding segment text**, so
every one of the 85 files answered false and went down the plain-text branch. On that branch the
scanner ran `scanCommonShapes` and nothing else.

**NAME THE FLOOR AS THREE DETECTORS AND NEVER AS TWO.** `scanCommonShapes` is dashed SSN, the
`REF*SY` **undashed** nine-digit SSN, and a non-test email - all unanchored `matchAll` passes, so all
three DID already reach a bare string literal. A draft of the scanner header said "the dashed-SSN and
email floor" and a refuter measured it false. Everything else - NM1 person name, NM1 member id, NM1
NPI, PER contact name, PER communication number, DMG date of birth, and the pre-2024 service-date
cutoff - is segment-aware and reached none of them.

Measured: the floor alone, over the newly opened 85, found **8 shapes in exactly one file**,
`test/scripts/phi-scan.test.ts`. The segment-aware pass found **44 more across 9 files**. So the
enumeration half on its own would have closed about a sixth of what was there.

`scanEmbeddedSegments` closes it. It finds a segment id from a closed list followed by `*`, takes the
run to the first `~`, `"`, backtick, backslash or newline, removes `${...}` first so an interpolated
fixture keeps its **element positions**, and hands the result to the same checks.

**🛑 What it does not do. THIS IS A SYNTACTIC TRIPWIRE OVER SOURCE TEXT, NOT A PARSER, so the list
below is what has been MEASURED and is explicitly NOT a closed census.** A draft of this note
published it as "four bounds" in four places and pass 1 of the refuter found two more in a single
pass. **Finding one more is expected and is not a new finding. Cut the claim back, never grow the
guard, and publish no count of them** - the rule `X12-NUMERIC-VALUE-EMITS-EMPTY` was refuted three
times for breaking. Each below is pinned by a case:

- **It infers no delimiters.** There is no ISA in an embedded run, so the element separator is taken
  to be `*`. A segment embedded under a non-default separator is not reached.
- **It recognises only the ids the checks consume** (`NM1`, `PER`, `DMG`, `DTP`, `DTM`, `BHT`, `GS`).
- **It does not run on a whole-file interchange.** Those go through `scanX12`, which has real
  delimiters. Running both would report every hit twice, and there is a case asserting it does not.
- **A BRACE-FREE template placeholder is removed before the split** (`/\$\{[^{}]*\}/g`), which
  keeps an interpolated fixture's element positions. **Say the other two halves too, because a draft
  named only the benefit:** the removed bytes leave this pass's view entirely, so a name an
  interpolation holds is never checked; and **the strip is not recursive**, so a placeholder
  containing braces survives and a `"` inside it then truncates the run.
- **A segment split across a concatenation is not reached.** A segment id and its elements written as
  two adjacent string literals is clean where the same bytes unsplit are two hits. Nothing in this
  corpus is written that way today, which is what makes it latent rather than noise.
- **The run stops at the first `"`, backtick, `~`, backslash or newline**, so a segment carrying any
  of those inside an element is truncated there and every later element ceases to exist.
- **🩺 A SEGMENT INSIDE A SINGLE-QUOTED LITERAL OVERRUNS THAT LITERAL'S OWN CLOSING DELIMITER**, and
  the surrounding source lands in the run's LAST element, which the shape predicates then skip. So a
  single-quoted fixture whose id is its final element is not checked: a bare `'NM1…34*<9 digits>'`
  and its `MI` equivalent each exit 0 where the double-quoted form exits 1. Both shapes are ones
  `scanCommonShapes` does **not** cover. This is the price of taking `'` out of the run-stop set and
  it is worth paying, because putting it back trades a rare literal style for every apostrophe
  surname - but **the price is real, and a draft claimed the shape predicates "already handle" the
  overrun when what they do is discard it.**
- **A name token with no ASCII letter in it is dropped by `nameTokens`, on BOTH routes.** So the
  `\p{L}` name class buys only elements in which `nameTokens` still finds an ASCII letter: a wholly
  non-Latin surname is skipped in a `.ts` literal and in an `.edi` file alike. PRE-EXISTING and
  identical at base.
- **The segment ids are matched case-sensitively**, as `scanX12` matches them.
- **It skips a name element that is not name-shaped, and an id element `EMBEDDED_ID_SHAPED` rejects.
  READ THAT PREDICATE; DO NOT PARAPHRASE IT** - three successive descriptions of it were published
  and all three were measured too narrow.** A run found in prose ends at whatever punctuation comes first and
  can swallow the sentence around it: before these two predicates, a fenced doc table in
  `test/builder-string-type.test.ts` reported its arrow column as an SSN-qualified id, and an `NM1`
  quoted in a `//` comment in `test/parser-segment.test.ts` reported the following English word as a
  person name. **Both predicates apply to the EMBEDDED pass only\*\* and the whole-file `.edi` path
  keeps the base rules unchanged, which is asserted with the same bytes on both sides.
- **A fixture expressed as a BUILDER SPEC OBJECT is segment text to nobody.** `{ lastName: "…" }`
  becomes a segment only when the builder runs. **Found by hand-reading, not by the gate**, and pinned
  as a case so the silence is not read as coverage.

### 🩺 Two things a refuter measured and a draft had backwards, both in the leak-hiding direction

**`'` MUST NOT BE A RUN STOP, AND "LETTER" MUST NOT BE `[A-Za-z]`.** The first draft put `'` in the
run-stop set (symmetry with `"`, since both delimit a TypeScript string) and wrote the name class as
`[A-Za-z][A-Za-z' .-]*`. The two contradict each other: nothing carrying an apostrophe could ever be
FRAMED, so the `'` branch of the name class was dead - and the failure was worse than a skip, because
the run was **truncated** at the apostrophe and every later element ceased to exist. Measured then,
every one of these reported clean in a `.ts` literal:

| input                                     | then  | now                          |
| ----------------------------------------- | ----- | ---------------------------- |
| `NM1*IL*1*O'BRIEN*SEAN****MI*W123456789~` | clean | name + member id             |
| `NM1*IL*1*O'BRIEN*SEAN****34*123456789~`  | clean | name + qualifier-34 SSN      |
| `PER*IC*JOHN O'BRIEN*TE*2124440101~`      | clean | contact name + non-555 phone |
| `NM1*IL*1*NUÑEZ*JOSÉ~`                    | clean | both name elements           |

`O'Brien`, `D'Angelo` and `N'Diaye` are exactly the surnames a real de-identification failure drops
into a fixture, and the `scanCommonShapes` floor covers neither the member id nor the qualifier-34
SSN. The disclosure that shipped in the first draft said apostrophes were permitted, which was true
of the class and false of the pass.

**🛑 AND THE SECOND HALF IS NOT WHAT IT LOOKS LIKE. NEVER WRITE "a surname is not an ASCII string, so
the `\p{L}` class catches one" - a draft published exactly that, in four places at once, and pass 2
measured it false.** `nameTokens` filters tokens with `/[A-Za-z]/` and that line is untouched by this
slice, so a token with **no ASCII letter at all** is dropped after the class admits it. Measured at
head, both routes, all exit 0: a Cyrillic name, a Greek one and a Han one. What the class widening
actually buys is the elements the ASCII class rejected while `nameTokens` still finds an ASCII letter
in them - the tilde-n and acute-accent case above - and nothing more. The wholly non-Latin gap is PRE-EXISTING, measures identically on the `.edi` route at base, and
is disclosed rather than closed: widening `nameTokens` would change the whole-file path, which
nothing else in this slice does.

### The one cell of the widening that was NOT additive, and the grid is what found it

`refuseUnusableRoots` iterated the **walk roots**, so while `test/fixtures` was one, deleting it
refused at exit 2. Making `test` the root turned `test/fixtures` into an ordinary subdirectory and,
on a tree whose corpus was **not yet committed**, the same deletion read `OK - no hits` at **EXIT 0**:
the whole fixture corpus gone and the gate clean. `reconcileObserved` covers the committed case and
**only** the committed case, and a rule that holds only under a precondition is not the rule that was
there before.

**`REQUIRED_DIRECTORIES` is the fix, and the shape of it is the lesson: what must BE a directory is a
different question from what the sweep walks, and conflating the two is what made the widening look
additive when one cell of it was not.** The walk roots must stay **disjoint** (nested roots enumerate
a file twice and report every hit twice); the declaration list has no such constraint, because
nothing walks it.

### The exit code for a regular-file root, derived from this repo's own contract

**2.** `refuseUnusableRoots` throws `InvocationError`, and `main`'s `try` around
`buildTargetsForAll` turns that class into `return 2`. **DO NOT PORT THIS.** It is 2 in `hl7`, `fhir`,
`cli` and `dicom`, **1** in `terminology` by a different mechanism, and in `ccda` the state is
**structurally unreachable** because that repo declares no scan-root list at all. Here it was **1**
before the root rules landed, from an uncaught `ENOTDIR` - the code this scanner reserves for "hits
found".

### The three routes, enumerated before anything was called additive

`ccda#103` lost a real detection by arguing an exemption was additive "because no route read a
`.md`", when `paths` ran the same structural predicate. So, for this slice:

| route                            | enumeration change                                   | recogniser change            |
| -------------------------------- | ---------------------------------------------------- | ---------------------------- |
| `all` (`pnpm phi-scan`)          | roots `test/fixtures`+`src` -> `test`+`src`          | gains `scanEmbeddedSegments` |
| `--staged` (pre-commit)          | `test/fixtures/**`+`src/**.ts` -> `test/**`+`src/**` | gains `scanEmbeddedSegments` |
| `paths` (`pnpm phi-scan <file>`) | unchanged (the caller names the file)                | gains `scanEmbeddedSegments` |

Both enumeration changes are **unions**: the old scope is a subtree of the new one, so no path either
route enumerated stops being enumerated. **No exemption was written, on any route.** That is
deliberate: `dicom#98` paid an `INTRODUCED` major for an exemption written as a **predicate** that
reached `--staged` and **subtracted a detection the base had**, and the way to avoid needing one is
for the corpus to be clean rather than excused.

### The base/head grid

35 tree shapes across all three routes, plus 26 allow-list cells (13 payloads on two routes), run
against a base copy of
`scripts/phi-scan.ts` and `scripts/phi-allow-list.txt` taken by **file copy** from `7d50305`.

**Every base `1` is still non-zero. Nothing went `1 -> 0` except the declared allow-list clearances
below.** The changed cells:

| shape                                          | route      | base  | head  |
| ---------------------------------------------- | ---------- | ----- | ----- |
| violator `.edi` directly under `test/`         | all        | 0     | **1** |
| inline-segment `.ts` under `test/`             | all        | 0     | **1** |
| inline-segment `.ts` under `test/property/`    | all        | 0     | **1** |
| inline-segment `.ts` under `src/`              | all        | 0     | **1** |
| violator staged directly under `test/`         | `--staged` | 0     | **1** |
| inline-segment `.ts` staged under `test/`      | `--staged` | 0     | **1** |
| violator staged at `src/notes.md`              | `--staged` | 0     | **1** |
| `test/fixtures` a symlink to a dir holding PHI | all        | 1     | **2** |
| `test/fixtures` a symlink, target emptied      | all        | **0** | **2** |

The last two are the widening's other gain and they are worth stating separately: `test/fixtures`
stopped being a root, so the **entry** rule applies to it and the shape is refused outright instead
of scanned through. **The residual did not close - it moved up one level**, to a link at `test`
itself, and the case that pins it moved with it.

### 🛑 The allow-list additions, and their cost

**AN ALLOW-LIST ENTRY IS GLOBAL AND ROUTE-BLIND.** `synth#49` shipped an `INTRODUCED` major here
because both the author's grid and the scope test were structurally blind to it: adding a token
clears that literal on the **commit-blocking** route too. So the entries are enumerated, and the
route-blindness is pinned from both directions by cases rather than argued.

Twelve `NAME` tokens - `FIRST`, `MEMBER`, `DESK`, `CLINIC`, `SYNTHLAST`, `SYNTHFIRST`, `PROPLAST`,
`PROPFIRST`, `SUBLAST`, `SUBFIRST`, `OLDLAST`, `OLDFIRST` - and four `ID` values - `1987654320` (a
descending-digit NPI placeholder), `SYNTH-MBR-1`, `PROP-MEMBER`, `OLD-MEM`. **22 grid cells go
`1 -> 0`, and all 22 are these.** Every token is a role word or a `<ROLE><POSITION>` coinage from an
inline fixture, hand-read; none is a name anyone has. `LAST` was already declared and `FIRST` was
not, which is the shape of the oversight the widening surfaced.

`isSyntheticMemberId` now consults the declared ids, which it could not before - a member id that
matched none of its shapes could only be cleared by renaming it in every fixture. **That flips no
cell this scanner already reported**: every `ID` entry predating the change is all-digit and so
already matched the third shape.

### 🛑 The scanner's own negative controls are ASSEMBLED, and that is forced

`test/scripts/phi-scan.test.ts` is now inside a walk root. Its payloads are ones the scanner is
**required** to trip on, and there is no way to excuse them that is not worse:

- **declaring the values disarms the exact detector the case proves**, so the case would pass for the
  wrong reason - and the `SMITH` / `ROBERT` / dashed-SSN cases assert **exit 1**, so an allow-list
  entry would turn them red rather than green;
- **a literal-path exemption would have to cover `--staged`**, or nobody could ever commit an edit to
  that file again - and an exemption on the blocking route is `dicom#98`'s defect exactly.

So `seg(...)` builds the framing at run time and **the values stay legible in the source**. Nothing
is obscured: `SMITH`, `ROBERT`, `RIVERA`, `JUANITA` and the SSN digits are all still there to read.
What is absent is a `NM1*` / `DMG*` / `PER*` / `nnn-nn-nnnn` **run** for a scanner to frame. **This is
not a claim that the gate cannot see the file** - it reads it on all three routes, and a case appends
one literal violator to a copy and requires exit 1.

### What was found in the newly opened files

**Nothing patient-identifying.** The corpus is placeholders throughout: `DOE`/`JANE`/`JOHN`/`ROE`/
`BABY`/`JIMMY`/`JUNIOR`/`PARENT`/`CHILD`, `TEST`/`PATIENT`, `LAST`/`FIRST` and its `SUB`/`OLD`/
`SYNTH`/`PROP` variants, `RENDERING DOCTOR`, invented orgs (`BILLING CLINIC INC`, `MEDPAY INSURANCE`,
`PAYER ONE`, `UTILIZATION REVIEW CO`), 555-exchange phones, and addresses at `1 NOWHERE LANE` /
`PO BOX 1` in `SPRINGFIELD` / `SHELBYVILLE` / `ANYTOWN` / `PAYERTOWN`.

**Non-patient, publicly attributable strings are NAMED here rather than scrubbed:** the NDC drug
codes `00093721410` and `00378010401` (public labeler codes, in the 837 drug-identification
fixtures); the CMS test NPI `1234567893`; and `t@example.com`, the git identity a throwaway test repo
commits under. `SMITH` survives in two files as an org name (`SMITH CLINIC`) and a placeholder
surname in a **builder spec object**, both read and neither PHI - and the spec-object one is the
disclosed reach gap above, not a clearance.

**🛑 THE GATE'S OWN TEST FILE HAS HAD THREE DESCRIPTIONS AND ALL THREE WERE MEASURED FALSE.** A list
of which of its values the gate can and cannot see went stale inside one commit; the universal that
replaced it ("all of them are out of the gate's view") was false too, because that file still holds
unassembled literals the embedded pass frames and clears on their values. **Publish the MEASUREMENT
and nothing else, and re-derive it every run:** `pnpm phi-scan` exits 0 over the whole tree,
`test/scripts/phi-scan.test.ts` included. What is true of the ASSEMBLED controls specifically is
written where they are built, not here.

### Residuals, all PRE-EXISTING and all disclosed

- **The path-set-not-bytes escape.** The reconciliation compares path **sets**, not the bytes git
  carries at those paths, so a root swapped for a directory mirroring the tracked names still exits 0
  over decoy contents. The widening makes it **narrower, not worse**: a decoy must now mirror 248
  names rather than 163.
- **A symlinked walk root's target corpus is not reconciled at all.** Moved up a level by this slice;
  not closed.
- **An index entry at exactly a walk root's own path matches no `--staged` clause**, because every
  clause tests a `<root>/` prefix.
- **A walk root that is a directory the process cannot READ** throws an uncaught `EACCES` at exit 1,
  identically at base and head.
- **The enumerate-then-read window** in `all` mode is untouched. `CLAUDE.md` used to say this repo
  escaped it "only by a scope accident of its walk roots" and that **any widening reintroduces it
  verbatim** - which this widening does, over 85 more files. Still deferred, and the reason is still
  direction: the remedy TOLERATES a failed read, which pulls against every other rule here.
- **60 tracked files remain outside both routes at head.** Named above, and **re-derive rather than trusting that number** - it moves with every file the next slice adds.
- **🩺 THIS NOTE CARRIES LITERAL SEGMENT RUNS** in the tables that record what the apostrophe bug
  hid, and it is outside the walk roots today, so nothing scans it. Measured on the `paths` route:
  **a widening to `documentation/` reds the gate on this note.** Latent, named here rather than left
  to be rediscovered by whoever takes the next scope slice.

## `X12-837-AMBIGUOUS-VARIANT` (2026-08-08)

Provenance: this repo's own source tree at `c758bcd` and at `b5dbfce`, measured (every census, every
channel, both trees). The three implementation-convention references are read out of
`VARIANT_BY_ICR` in `src/transactions/claim/get-837.ts`, which is this package's own table and
**not** a grounding of them against a TR3 - nobody here has read one, and this slice asserts no TR3
usage code. The claim that no TR3 rule makes a majority or an in-loop `SVx` authoritative is a
statement that no such grounding exists here, not a citation.

The `X12-837-RESIDUALS` slice that closed the **silence** around the stray-`SVx` re-typing, the
highest-blast-radius of that item's five `PRE-EXISTING` findings. Its own file rather than a section
in `documentation/agent-notes.md`, which stands at 249,982 of a 250,000-byte budget.

### The defect, and what it is NOT

`get837Claims` resolves the 837 variant **before the walk**, as
`explicitType ?? variantFromIcr ?? variantFromSegment`. Absent a caller `type` option, and where
`ST-03` names none of `005010X222A2` / `005010X223A3` / `005010X224A2`, `variantFromSegment` scans
the transaction body and takes the **first** `SV1` / `SV2` / `SV3` in it, **orphans included** - a
service segment with no Loop 2400 open is eligible for the fallback like any other.

So one stray `SV2` ahead of a conformant Professional claim re-types the whole submission
Institutional. `submission.variant` reads `"I"`; `decodeSv1` returns on its variant check, so every
`SV1` line reads `charge` `undefined`, `units` `undefined` and `procedureCode` `undefined`; and a
consumer routing on `submission.variant` sends a Professional claim down an Institutional path.

**That behaviour is `PRE-EXISTING` and is NOT changed here. It reproduces on the CURRENT release:
base `c758bcd` is `0.0.13` and the registry serves `0.0.13`**, and it reaches back at least to
`0.0.10`, where `#71` measured it. Never state the older bound alone - `#71`'s own version claim was
refuted for telling consumers on the current release they already had a fix they did not. Which variant
a document resolves to, which lines decode and which warnings the walk raises are byte-for-byte what
they were at `c758bcd`. What was missing was any report of the **resolution** itself: the line-level
consequences were on the channel and the submission-level typing that produced them was not.

**Why the fallback was not narrowed.** Excluding orphans would change how already-published
documents decode, on a package consumers are running. `#71` reached the same conclusion about the
same code path and its remedy was to correct the claim on every surface rather than narrow the
fallback; this slice adds a report and leaves the decode alone for the same reason.

### The predicate, and why it is the conflict rather than the fallback

The code fires where **the fallback DECIDED** (`opts.type` absent and `ST-03` unresolving) **AND**
the body carries service segments naming more than one variant.

Not "whenever the fallback decides": with every `SVx` in the body naming one variant, the fallback
has nothing contradicting it and the guess is the only reading available. A conflict is exactly the
observable ambiguity, and it is what the reader can measure without deciding anything.

**Which segment is the stray one is deliberately NOT decided.** A stray service segment and a
conformant one are indistinguishable to this reader, first-wins takes the first whether or not a
Loop 2400 was open at it, and no TR3 rule makes a majority or an in-loop position authoritative.
Reporting the conflict is honest; picking a winner would be inventing.

### The anchor

`{ segmentIndex: 0, transactionIndex: 0 }` - the `ST`, which is `tx.segments[0]` and carries the
`ST-03` that would have settled the question. The same anchor as `X12_837_UNKNOWN_VARIANT`, and for
the same reason: the two codes are the two outcomes of one resolution.

**No `elementIndex`.** The conflict is a property of the body rather than of an element, and one
route into the code is an `ST-03` that is absent altogether, where `ST*837*0001~` has no element 3
to name. `segmentIndex: 0` is not a neutral sentinel in this library; a committed test asserts
`tx.segments[0]?.id === "ST"` rather than assuming it.

**Once per transaction**, because there is one resolution per transaction. The scan breaks at the
first disagreement, so the added work is bounded by the distance to it, and the scan is skipped
entirely where a caller `type` or a resolving `ST-03` means `variantFromSegment` would never be read.

### The additivity claim, and how it is pinned

**The rule this lineage was decided on: a widening that moves a case onto a NEW code silently breaks
every consumer predicate written against the OLD one, and the package's own docs are such a
consumer** (`#83` was refuted for exactly that). Nothing moves here. The walk never reads the
conflict flag; the variant every claim and line is decoded against is the one first-wins picked.

Pinned three ways in `test/transactions-claim-837-ambiguous-variant.test.ts`:

1. **Channel-wide `toEqual`** on every case. Never a membership test - a pin that reads one code can
   observe neither a silence ending nor a case moving.
2. **A parameterised additivity block** asserting, for three documents, that the channel with the new
   code _filtered out_ is exactly what `0.0.13` produced.
3. **Six honest controls** that must stay exactly as silent as they were: a single-variant body under
   an unresolvable `ST-03`; a resolving `ST-03` with a mixed body; a caller `type` with a mixed body;
   an out-of-enum caller `type`; no `SVx` at all; and a clean 837P.

### Census

**12 of 20 behavioural cases red** against a base `src/` restored from `c758bcd` **by file copy, not
`git checkout`** (that has silently eaten uncommitted work twice in this ecosystem). The 8 green are
exactly the controls plus the two cases that assert pre-existing behaviour - the recovery under
`{ type: "P" }`, and the pin that the resolved variant is unchanged. Two further cases (the factory
and its `ALL_WARNING_MESSAGES` membership) cannot exist on a base tree at all and are excluded from
the 20 rather than counted as red.

**Negative control: the same probe against `hl7`'s `src/` fails all 20 with
`TypeError: parseX12 is not a function`**, so the measurement is package-specific rather than an
artifact of a shared scratch path.

### One existing test went red, and that is the finding

`test/transactions-claim-837-service-segment-without-lx.test.ts` carried a case titled
`🩺 PRE-EXISTING: an orphan segment DOES feed the variant fallback when ST-03 resolves to nothing`,
pinning the channel as exactly `[WITHOUT_LX, NOT_DECODED]`. It is the test that pinned this silence,
so closing the silence turns it red - expected, not a regression, and the same shape `#67`'s
residual test had. It now pins all three codes, and the title's `PRE-EXISTING:` prefix is dropped
because the **silence** no longer is; the re-typing still is, and the comment says so.

The same test's trailing-`SV2` case (`LX*1~`, `SV1`, `SV2`) gained a channel assertion it did not
have. It was the sharpest document in the slice: the foreign `SV2` reaches a Loop 2400 the `SV1`
already decoded, so `decodeSv2` returned on the variant check and, **when this item landed**,
nothing else reported it: the new code was then the sole entry on that channel.
**`X12-837-SV1-OVERWRITE` has since closed that**, and the case now pins
`[X12_837_AMBIGUOUS_VARIANT, X12_837_SERVICE_SEGMENT_REPEATED]`.

### Pass 1: REFUTED, on a claim inside the frozen public message

**🩺 The `INTRODUCED` major, and it is the sixth consecutive finding in this lineage that was a claim
defect rather than a code defect.** The registry message's closing sentence enumerated what else a
contested document raises: _"a Loop 2400 carrying only a service segment for another variant still
raises `X12_837_SERVICE_LINE_NOT_DECODED` at its own LX, and a service segment arriving with no line
open still raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX` at itself."_ The second clause is **false**,
and false on a document that raises this very code: `reportOrphanServiceSegment` returns early on
`droppedLineReported`, so after a stray `LX` that opened no line, the service segments inside it are
**silent**. That suppression is deliberate, pre-existing and documented in `KNOWN-LIMITATIONS.md`;
the new sentence contradicted the package's own disclosure, in a table this repo treats as public
and frozen.

Measured at head, `ST-03` `005010X222A1`, an `LX` with no `CLM` open followed by `SV1` then `SV2`:
the channel is `[AMBIGUOUS, SERVICE_LINE_DROPPED]` and `X12_837_SERVICE_SEGMENT_WITHOUT_LX` appears
**nowhere**. Twenty whole-channel `toEqual` assertions missed it because no case exercised the
stray-`LX` route.

**Remedy: cut the claim back, do not grow the guard** - the same correction `#70` and `#80` were
forced into. The enumeration is deleted from the message and from the troubleshooting row and
replaced by the invariance statement alone: _whatever this reader raised on such a document before,
it still raises, at the same position, and this one is added beside them_ - explicitly **not** a list
of what else you will see. `CHANGELOG.md` and the changeset carry the same qualifier. **The
stray-`LX` document is now a committed case** pinning the whole channel and the absence of
`X12_837_SERVICE_SEGMENT_WITHOUT_LX` on it. No behaviour changed in the remedy; no guard was added.

Two further `INTRODUCED` minors from the same pass, both fixed here: this file carried no
`Provenance:` field where a sibling agent note does, and it said the defect "reproduces at `0.0.10`"
without saying it reproduces on the **current** release, which is `#71`'s own version trap in
miniature.

### Pass 2: NOT REFUTED

It re-measured the corrected claim rather than reading it - **a corrected claim is a new claim** -
and confirmed both halves on the remedy's own new document: `X12_837_SERVICE_SEGMENT_WITHOUT_LX`
appears on neither tree, and the replacement invariance sentence holds including the position
(`segmentIndex` 8, unmoved). It also swept for a half-deleted falsehood and found none:
`KNOWN-LIMITATIONS.md` and `docs-content/cookbook.md` never carried the enumeration.

One `INTRODUCED` minor, **inside the pass-1 remedy's own prose**, fixed in the ship commit and
therefore **UNGRADED**: this file said the repo's _fixtures_ use `005010X222A1`, which is false - it
is three test files, inline, and no fixture. Corrected below. No third pass was spent on it, per
ADR 0016 and pass 2's own recommendation to land.

### Filed by the refuters, `PRE-EXISTING`, not fixed here

- **🩺 A second `SV1` inside an already-open Loop 2400 silently overwrites the first's money and
  procedure code. PASS 2 RE-MEASURED IT AND ESCALATED IT TO STOP-THE-LINE.** Byte-identical on both
  trees under a resolving `ST-03` `005010X222A2`:
  `LX*1~ SV1*HC:99213*8500*UN*4***1~ SV1*HC:99999*12*UN*1***1~` leaves ONE service line reading
  `charge` `12`, `units` `1` and `procedureCode` `99999`, with **`warnings: []`**. `8500` off the
  wire becomes `12` on the model and CPT `99213` becomes `99999`, on no channel at all. It cannot
  block this slice - it reproduces at base - but **both refuters independently said it should not sit
  behind another disclosure-only slice on this item.** Already named in `X12-837-RESIDUALS` and in
  `documentation/repos/x12.md`; it wants its own item.
- **CLOSED by `X12-VARIANT-ICR-UNGROUNDED` (2026-08-08) -
  `documentation/agent-notes.md#x12---grounding-variant_by_icr-x12-variant-icr-ungrounded-2026-08-08`.** Pass 2's worry was **correct**: the key
  set held none of the identifiers 45 CFR 162.1102 adopts and was missing the two production 837P and
  837I traffic carries, so the `SVx` fallback WAS the normal path. The table is corrected and the
  three test files below now use `004010X098A1`. **This section is left as the dated record it is; read
  the successor note for what is true now.** The rest of this bullet is that record:
- **The `VARIANT_BY_ICR` key set is ungrounded, and pass 2 named it the thing that most worries it.**
  Three of this repo's own **test files** reach for `005010X222A1` inline as the real-world 837P
  `ST-03` that does **not** resolve; `005010X222A1` appears nowhere under `test/fixtures/`, and the
  golden corpus uses the resolving references (`837p.edi` -> `005010X222A2`, `837i.edi` ->
  `005010X223A3`, `837d.edi` -> `005010X224A2`). **Say it that way** - a first draft here said
  "fixtures" and pass 2 measured it false. The substantive worry survives the correction: if the key
  set misses the HIPAA-adopted errata, the `SVx` fallback is the **normal** path on production 837P
  traffic rather than the exception, which changes what this code's message ought to say. **No
  primary source was consulted in either direction and none is claimed** - pass 2 recorded its own
  recollection of the adopted set as `UNDETERMINED` rather than a citation, and the table is
  unchanged from base. Grounding the three references against the WPC / X12 TR3 listing is its own
  unit, and it should come before the next slice on this item.

### Deferred, filed not fixed

- **A foreign or duplicate `SVx` inside an already-decoded Loop 2400.** Deferred here, and **CLOSED
  by `X12-837-SV1-OVERWRITE`**: such a segment now raises `X12_837_SERVICE_SEGMENT_REPEATED` at
  itself, so this item's code is no longer the sole report on that document. The overwrite itself is
  unchanged - the second `SV1` still wins - and only the silence was closed.
- **Narrowing the fallback to skip orphans.** A decode change on a published package; its own slice,
  and it needs an argument this one does not make.
- **`transactionIndex` is hard-coded `0`** in `get-837.ts`. The new warning follows the file's
  existing convention rather than fixing it in passing.
- The four other `PRE-EXISTING` findings in `X12-837-RESIDUALS` are untouched, as is SV3-06's
  ungrounded TR3 usage.

### Relocated from `CLAUDE.md`, 2026-08-10, verbatim

Moved here in full to pay for the new `X12-ENVELOPE-VALUE-ROUTES` trap on deletion remedies. Nothing
is dropped and nothing is shortened; `CLAUDE.md` keeps only the imperative pointer.

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

## `X12-837-EMIT-IDENTIFIER-FIXED` (2026-08-08)

**Provenance.** Every behavioural figure below was measured on this tree with `tsx` against
`src/index.ts` or `parseX12` directly, and each measurement is reproduced beside its claim. The
element definitions cited (480 `AN 1/12` for GS-08, 1705 `AN 1/35` for ST-03) are X12 data-element
dictionary entries, secondhand: **nobody here has read X12.6 or the TR3s**, so they are recorded as
disclosure and nothing refuses on them. The identifier claims this slice depends on are **not
single-source and are not restated here** - the read-side docblock in
`src/transactions/claim/get-837.ts` cites 45 CFR 162.1102(c), two independent state Medicaid
companion guides for the same fact, and X12 RFI #2334, and labels its own weakest leg;
`x12-variant-icr-ungrounded.md` carries the full sourcing. Read that file first.

The emit half of `X12-VARIANT-ICR-UNGROUNDED`. `#89` grounded which `ST-03` implementation
convention references the READER resolves and deliberately left the writer alone; this slice gave
the writer a caller override. Read `x12-variant-icr-ungrounded.md` first: it carries the sources for
the identifiers, and the reason no count of them is published anywhere.

### What was measured at base

Probed on the base tree with `tsx` against `src/index.ts`, reading the SEGMENT ELEMENTS of the
interchange the builder returns rather than a model slot, because the reference is not a model slot
the builder's output exposes:

```text
build837P default                                      -> GS-08=005010X222A2 ST-03=005010X222A2
build837P + envelope.implementationConventionReference -> GS-08=005010X222A2 ST-03=005010X222A2
build837P + envelope.versionRelease                    -> GS-08=005010X222A2 ST-03=005010X222A2
build837I default                                      -> GS-08=005010X223A3 ST-03=005010X223A3
build837D default                                      -> GS-08=005010X224A2 ST-03=005010X224A2
```

Both plausible field names were silently ignored: the value never reached the wire under either. The
same probe run against `hl7` reports `PROBE-INAPPLICABLE`, which is what makes it a measurement of
this package rather than of a spec object.

Two of the three defaults are not what CMS and several state Medicaid companion guides require in
ST-03 and GS-08 on production professional and institutional claims, which ask for `005010X222A1`
and `005010X223A2`. So a partner on one of those guides rejected every 837 this library built, and
the caller had no remedy at all.

### The shape of the fix, and why it is an addition rather than a re-stamp

**Which published guide identifier a trading partner accepts is a PARTNER fact, not a SPEC fact.**
That sentence is the whole item, and it decides everything below:

- **The defaults do not move.** Re-stamping would silently change bytes this library already puts on
  the wire and break the partners it works with today. An existing call is byte-for-byte unchanged,
  and the first test block asserts exactly that, per variant.
- **One field, both elements.** `Build837EnvelopeSpec.implementationConventionReference` writes ST-03
  and GS-08. This builder has always written the same reference to both, and nothing grounds a
  caller making them differ, so the surface does not offer it. `buildInterchange` still takes the two
  separately, because it applies no domain guard at all and never has.
- **Refuse on DISAGREEMENT, never on ABSENCE.** A reference the read table does not carry is emitted
  as given. Nothing makes the published-errata set provably exhaustive - the read side says so and
  publishes no count of it - so refusing an unrecognised identifier would import an exhaustiveness
  claim this package refuses to make on the read side. The honest cost is pinned as a test: on such
  a file this library's own reader falls back to the `SVx` scan, exactly as it does for any
  unrecognised ST-03.

### What it refuses of its own, all `X12_837_BUILD_INVALID_SPEC`

No new error code was minted. The trap from `#83` governs: a code is added when a consumer must ACT
differently, never because the cause differs, and a caller who handed over a bad reference acts the
same way in every case.

**🩺 PUBLISH NO TOTAL, and a first draft published "three" in five places.** A refuter measured it
short by one: a non-string reference (a JSON caller's `null`, or a number) is refused by the shared
`makeCallerEscaper` guard carrying the SAME code, and this slice's own test measures it. That is the
exact shape `X12-NUMERIC-VALUE-EMITS-EMPTY` already banned - "three drafts did; a refuter measured
all three false, each time by finding one more. Cut the claim back, do not grow the census." The
count was removed everywhere rather than incremented, and the list below is framed as what this
FIELD adds on top of the element-type guard every string slot already has.

1. **Empty.** `seg` strips trailing empty elements, so an empty reference does not emit an empty
   ST-03 and GS-08 - it emits segments that do not carry those elements at all. Two required
   elements lost in silence. There is a control test for the mechanism itself: a defaulted `ST` has
   four elements and a defaulted `GS` has nine, so the last element of each is exactly the one at
   risk.
2. **Carrying an active delimiter or the release character.** Detected as "the escaper had to change
   it" rather than by scanning for characters, so it tracks the delimiter set the CALLER chose - a
   `|` is inert under the default delimiters and refused under `elementSeparator: "|"`, and both
   directions are pinned.
3. **A reference this library's own reader resolves to a DIFFERENT variant.** The emitted file would
   declare one variant and carry another's service segments, and `get837Claims` reads the
   declaration ahead of the segments since `#89`, so every service line would come back undecoded
   with `X12_837_SERVICE_LINE_NOT_DECODED`. Same class as the per-claim guard that already refuses a
   service line whose `variant` disagrees with the builder's. It reuses `VARIANT_BY_ICR` itself,
   newly exported `@internal` from `get-837.ts`, so the guard cannot drift from the table it speaks
   for.

**The cross-variant message names the variant THIS BUILDER emits and deliberately not the one the
reference belongs to.** Naming the other one means interpolating a table read with a caller-supplied
KEY into a refusal message, which is the shape `test/builder-refusal-bounds.test.ts` exists to keep
out (`variant` is sanctioned there precisely because it is fixed by the entry point). The caller
chose both the builder and the reference, so the variant the builder emits is enough to act on. A
test pins the absence, so a future edit cannot quietly add the other name back.

**No message quotes a TR3 identifier**, and a test in this slice's file scans all three refusal
messages for the pattern with its own positive control beside it. The registry tripwire from `#89`
scans `ALL_WARNING_MESSAGES` and would not have seen these, because a build refusal is not a
warning.

### 🩺 The finding this slice paid for: escaping does NOT protect ST-03 or GS-08

> **🛑 SUPERSEDED 2026-08-08 by `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`
> (`documentation/agent-notes.md#x12-envelope-splitter-not-release-aware-2026-08-08`). The envelope splitter IS
> release-aware now, so everything in this section and the next describes the tree at `1b71733` and
> not the current one. A release-escaped delimiter no longer splits an envelope segment; an
> UNESCAPED one still ends its element, and `build837`'s refusal was kept anyway. Read the superseding
> note for why. Left standing rather than edited: it is the measurement that paid for that slice.**

The first draft escaped the caller's reference through the builder's `esc` and asserted it
round-tripped. It does not. Measured straight through `parseX12`, so it is grounded on the reader
and not on the builder that now refuses:

```text
GS*HC*S*R*20260601*1200*1*X*005010?*X222A1~  ->  10 elements, GS-08 = "005010?"
ST*837*0001*005010?*X222A1~                  ->   5 elements, ST-03 = "005010?"
CLM*PT?*ACCT*150.00~                         ->   3 elements, CLM-01 = "PT?*ACCT"
ix.warnings                                  ->  []
```

The released element separator still splits the ENVELOPE segments, while the identical construct in
a BODY element holds as one. The envelope segments are read by a splitter that is not
release-aware, and nothing is raised on any channel.

**PRE-EXISTING and deliberately NOT fixed here.** Changing how envelope segments split changes how
already-published documents decode, which is the same call this package makes everywhere else. The
new surface refuses the input it cannot carry; `buildInterchange`'s `versionRelease` and
`implementationConventionReference` still emit it, which is consistent with that builder applying no
domain guard to anything. Recorded in `KNOWN-LIMITATIONS.md` as its own entry.

**🩺 And the refuter widened it, correctly: it is not about these two elements, it is about the
whole envelope segment, because the split SHIFTS every element after it.** Measured on the head
tree through untouched code:

```text
applicationSenderCode "SEND*ER"       -> GS-08 slot [8] reads "X" (the GS-07 agency code)
                                         warnings: [X12_CONTROL_NUMBER_MISMATCH]
groupControlNumber    "1*2"           -> GS-08 slot [8] reads "X";  warnings: []
transactionSetControlNumber "00*01"   -> ST-03 slot [3] reads "01"; warnings: []
```

**So a guard on one element cannot make that element trustworthy**, and the first draft of this
slice's public doc promised "one value reaches both elements" without that caveat. Corrected before
merge in the field's JSDoc, `KNOWN-LIMITATIONS.md`, `CHANGELOG.md`, the changeset and the cookbook.
Two of the three cases above are silent on every channel and the third names a different problem, so
**this wants its own slice**; it is not stop-the-line, because the BODY splitter is release-aware and
no dose, code system or patient identifier is mis-read - the blast radius is envelope framing, and it
takes a caller putting an active delimiter into a control number.

### 🩺 The other finding: a probe that disagrees with the model's own shape

The first draft of the test file walked `sub.billingProviders[0].subscribers[0].claims[0]` to reach a
service line. That is the BUILD SPEC's shape. `X12_837Submission` is FLAT (`claims`, `hierarchies`),
and the walk threw rather than measuring anything. The same mistake is on record in this repo
already, with `patient.address` against a model that nests it under `patient.entity`. **Read the
model's own type before writing the probe, every time.**

The model does expose `implementationConventionReference`, so the round-trip assertions read the
declaration back through `get837Claims` in the model's own shape, not only off the segments.

### Gates this slice legitimately reddened, and what was re-derived

Both are source scans that pin a count, and both say in their own comments that a legitimate builder
edit will red them and that the remedy is to update the number and the prose that publishes it in
the same commit.

- `test/builder-refusal-bounds.test.ts`: throw sites **90 -> 93** (the three refusals above), module
  count unchanged at 11. Its prose said "EIGHTY-SIX sites, ten builder modules with 74" while the
  assertion said 90; both were re-derived from the scan itself, per module, and are now 93 and 81.
- `test/builder-string-type.test.ts`: `esc` invocations **406 -> 407** on **377 -> 378** lines. Its
  prose figure "72 of `build-837`'s 82 are `ctx.esc(`" was true of neither this tree nor the
  previous one; re-derived with the test's own `code()` helper, it is **61 of 75**. **Note the
  coincidence recorded in that file: an anecdote there quotes 378 as a historical mistake, and 378
  is now the true line count again. Do not "correct" either into the other.**

`documentation/agent-notes.md` carried "Threading a locator through 406 unary `esc` invocations" in
a completed slice's narrative. The number was deleted rather than corrected, per this repo's
standing rule for a figure that drifts.

### Negative controls

Every guard reds a control. Measured by mutating the source and re-running this slice's file:

```text
override never read (base behaviour)  -> 22 of 30 fail
delimiter refusal removed             ->  7 of 30 fail
cross-variant refusal removed         ->  6 of 30 fail
empty refusal removed                 ->  2 of 30 fail
restored                              -> 30 pass
```

### What was NOT done

- **The envelope splitter is untouched.** See above; it is a decode-behaviour change on published
  documents, and it wants its own slice with its own grounding.
- **`buildInterchange` gains no domain guard.** It is the documented escape hatch for reproducing a
  knowingly-malformed artifact, and adding one there would take that away.
- **No normalisation of the reference.** No trim, no case-fold, no prefix match, on either side. The
  read table is a list of cited identifiers and no source says to normalise, so a lower-cased
  reference is emitted exactly as handed over, and a test pins that.
- **No count of the errata set is published anywhere**, including in the new refusal messages.
- **No LENGTH bound, disclosed rather than guarded.** GS-08 is data element 480 (`AN 1/12`) and
  ST-03 is element 1705 (`AN 1/35`), so the one place the docs say "one value, both elements" is
  exactly where the two maxima differ. A 35-character reference is emitted verbatim into GS-08 with
  no refusal and no warning. The class is pre-existing and general - `groupControlNumber`
  (element 28, `N0 1/9`), `transactionSetControlNumber` (element 329, `AN 4/9`) and an over-15
  `senderId` are all accepted at base - so bounding this one field alone would be a guard that
  implies a promise the envelope does not keep. Pinned as a disclosure test, not a refusal.

## `X12-837-LOOP-RESIDUALS` (2026-08-05)

> **RELOCATED VERBATIM from `CLAUDE.md` on 2026-08-11 to pay for the
> `X12-PRE-005010-RUNTIME-MESSAGE` trap, nothing dropped.** The narrative it summarises is in
> `documentation/agent-notes.md#x12-837-loop-residuals-2026-08-05`; the imperatives are HERE and are
> live. `CLAUDE.md` keeps only the cursor.

#### 🩺 `X12-837-LOOP-RESIDUALS` (2026-08-05) · `documentation/agent-notes.md#x12-837-loop-residuals-2026-08-05`

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

## `X12-837-SV-SILENT-ZERO` (2026-08-05)

> **RELOCATED VERBATIM from `CLAUDE.md` on 2026-08-11 to pay for the
> `X12-PRE-005010-RUNTIME-MESSAGE` trap, nothing dropped.** The narrative it summarises is in
> `documentation/agent-notes.md#x12-837-sv-silent-zero-2026-08-05`; the imperatives are HERE and are
> live. `CLAUDE.md` keeps only the cursor.

#### 🩺 `X12-837-SV-SILENT-ZERO` (2026-08-05) · `documentation/agent-notes.md#x12-837-sv-silent-zero-2026-08-05`

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

## X12-837-SV-UNDEFINED-DECIMAL (2026-08-07)

Provenance: this repo's own source tree at `c8e81b4` and at `674f616`, measured (every census, every
base/head reading and both emitted segments below are runs, not recollections); the registry text in
`src/parser/warnings.ts`; and the prior slices' sections in `../agent-notes.md`. **No TR3 was read
and no clause of one is cited here** - `005010X221A1` is named only where this repo's existing code
and docs already name it, and the two decisions that could have rested on a usage code
(`SV1-04` / `SV2-05` / `SV3-06`) deliberately do not.

The breaking slice three earlier items deferred by name. Written here rather than in
`../agent-notes.md`, which was at **249,826** of its 250,000-byte budget when this landed, and
rather than in `../../CLAUDE.md`, which was at **52,903** of a 52,912 entry. The per-item shape
(`documentation/agent-notes/<item>.md`) is the one the umbrella's size hook (since retired)
provides for exactly this, and it is bounded on its own.

### The defect, and what it was not

**An absent Required `SV1-02` read a confident `0`.** That is a monetary field on a claim service
line. A consumer looking only at the model could not tell "the sender stated zero" from "the sender
stated nothing", and this library presented the second as the first.

Three prior slices named it and each deliberately left it: `X12-QUANTITY-SILENT-DEFAULTS` warned an
unparseable decimal, `X12-837-SV-SILENT-ZERO` warned a service line whose `SVx` never decoded, and
`X12-837-LOOP-RESIDUALS` restated it as still open. Every one of those closed a **silence** on the
warning channel and left the **`0`** on the model, because closing the `0` is a breaking type
change. That is what this slice is.

### What actually moved: fourteen slots, one rule

The rule is uniform and states nothing about TR3 usage codes, deliberately: **a slot that could hold
a fabricated `X12Decimal.ZERO` is now `X12Decimal | undefined`, and reads `undefined` where this
library decoded no value from the element.** No slot is treated differently for being Required, and
no usage code is asserted anywhere in the change. A rule that had to know which elements are
Required would be a census, and this repo has been refuted for publishing one four times.

The fabrication census, which IS closed and IS enumerable because it is a property of this source
tree rather than of a spec:

| route                                                              | sites | model slots reached   |
| ------------------------------------------------------------------ | ----- | --------------------- |
| `elementDecimalOrZero(...)` in a reader                            | 16    | 12                    |
| `elementDecimal(...) ?? X12Decimal.ZERO` on a `CAS` / `PLB` triple | 3     | 2                     |
| a seeded accumulator or an `EMPTY_HEADER` constant                 | 4     | 3 (all already above) |

Fourteen distinct model slots: `X12Claim.totalCharge` (CLM-02); `X12_837ServiceLineBase.charge` and
`.units` (SV1-02 / SV2-03 / SV3-02 and SV1-04 / SV2-05 / SV3-06);
`X12LineAdjudication.amountPaid` (SVD-02); `X12RemitClaim.totalChargeAmount`, `.totalPaymentAmount`
and `.patientResponsibilityAmount` (CLP-03 / 04 / 05); `X12RemitServiceLine.chargeAmount` and
`.paymentAmount` (SVC-02 / SVC-03); `X12RemitPaymentHeader.totalActualPayment` and
`X12PremiumPaymentHeader.totalPremiumAmount` (BPR-02); `X12PremiumOpenItem.amountPaid` (RMR-04);
`X12RemitAdjustment.amount` (a `CAS` triple, read by the 837 as well as the 835); and
`X12RemitProviderAdjustment.amount` (a `PLB` pair).

**A required `X12Decimal` slot that was NOT widened is not an oversight, and NO LIST OF THEM IS
PUBLISHED.** The rule is the claim: a slot was widened exactly where a reader could substitute
`X12Decimal.ZERO` into it. Where a decoder instead drops the whole record when the amount does not
decode - the `AMT` / `ADX` shape, whose decoders return `undefined` for the row - no fabricated zero
could ever reach the slot, so widening it would have been type churn with no defect behind it.
**A first draft of this file named three such slots and pass 1 measured a fourth**
(`X12EnrollmentAmount.amount`), which is the census failure `CLAUDE.md` records four separate times.
Finding one more is expected and is not a new finding; the claim was cut back rather than the list
grown. **Those rows are dropped with no warning at all, on both trees** (`AMT*AU~` gives
`claim.amounts: []` and `warnings: []`), which is `PRE-EXISTING` and filed below.

### The emit side, answered rather than mentioned

`#82`'s lesson was that a reader-side change which does not answer what the writer then reads is the
shape that gets refuted. Two emit-side facts were measured before deciding anything.

1. **`build837P/I/D` had the SAME defect, in the other direction.** `Build837ServiceLineSpec.units`
   was optional and the emitter did `line.units === undefined ? "0" : decStr(line.units)`. Measured
   on the base tree: a Professional line with no `units` emitted
   `SV1*HC:99213*8500*UN*0*11**1~` - a service unit count no caller supplied. `units` is now
   required and `enforceStructuralSpec` refuses a line without it with
   `X12_837_BUILD_INVALID_SPEC`, naming the structural locator and no caller value.

   **Refuse, not emit-empty.** An empty SV1-04 would round-trip honestly back to `units: undefined`
   as of this slice, which is a real argument for it. It loses to two things: this library's stated
   posture that the parser is liberal and the serializer conservative, and the direct precedent of
   `build277`, which already refuses a service line without `SVC-07` on the grounds that defaulting
   a count is inventing. Neither argument needs a usage code.

2. **Every other builder decimal slot was already required and routed through `escDec`**, so nothing
   else on the emit side changed. `Build835Spec` in particular keeps every balance term as a
   required `X12Decimal`, which is what makes the new not-evaluable path below unreachable from
   TypeScript.

### The 835 balance invariants, and the one new code

`src/transactions/remit/balance.ts` is shared: `get835` calls it on the read side and `build835`'s
`enforceBalance` calls it on the emit side. Widening the terms forced a decision there.

**A term that did not decode makes the equation unevaluable, which is a third outcome and not a
failure.** Reporting `X12_835_REMIT_BALANCE_MISMATCH` would assert a computed inequality that was
never computed; reporting nothing would be a REGRESSION in the warning channel, because through
`0.0.12` an absent `CLP-03` collapsed to zero and _did_ raise a mismatch. So the third outcome got
its own code, `X12_835_BALANCE_NOT_EVALUABLE`, the 29th Tier-2 code, keyed by the same
`BALANCE_INVARIANTS` discriminant the mismatch uses.

- **An EMPTY list is not an absent term.** `sumOptional([])` is `X12Decimal.ZERO`: a claim carrying
  no `CAS` really did state no adjustments. Only a term this library decoded no value from stops the
  equation. Both halves are pinned, because collapsing them would silence every clean claim.
- **`enforceBalance` branches on the code, not on truthiness**, and raises
  `X12_835_BUILD_INVALID_SPEC` for the not-evaluable verdict rather than its balance-mismatch code.
  A JS caller passing `undefined` in a balance slot got an untyped `TypeError` off `undefined.add`
  through `0.0.12`; it is a typed refusal now. **A raw `number` in the same slot still throws an
  untyped `TypeError`, so the dichotomy `test/builder-decimal-type.test.ts` pins ("a slot refuses
  UNTYPED exactly when the balance guard reads it") did not move** - that suite forges `0.1 + 0.2`,
  never `undefined`. **State it as "an untyped `TypeError`", not "the same one":** pass 1 measured
  that on some slots it now comes from `X12Decimal.state()` ("has no internal state - was it
  tampered with?") where base reached `.add is not a function`, because `sumOptional` calls
  `X12Decimal.add(term)` rather than `term.add(...)`. Both forms were already in that suite's
  message regex, which is why it stayed green; the arm a slot lands in is what the rule is about,
  and no slot changed arm.
- The refusal was written as six explicit `throw`s rather than one helper taking a `scope` string.
  A helper would have put `${scope}` in a refusal template, and `test/builder-refusal-bounds.test.ts`
  sanctions holes by NAME - admitting a parameter there weakens a gate that has already gone slack
  twice. The pinned site count moved 86 -> 90 with its comment.

### The census, and the control on the census

**18 of 35 new cases red on `c8e81b4`, 17 green**, measured by restoring the base tree with
`git archive c8e81b4 | tar -x` into a scratch directory (a file copy, not a `git checkout` over the
working tree) and running the head suite against it. **The 17 green are every CONTROL plus the two
`elementDecimalOrZero` cases**, which is the shape that makes the 18 a defect report: a control that
went red on base would mean the fixture, not the reader, was what changed.

Negative control on the measurement itself: the same test file against a restored `hl7` tree
collects **no tests at all** (the imports do not resolve), so the run is demonstrably reading the
tree under test rather than `/workspace/x12`.

**The load-bearing shape is the PAIR, not the absence.** Every read case runs the same document with
the element absent, with the element carrying an explicit zero, and with a real amount. Asserting
only that the absent case answers `undefined` would not catch a reader that started answering
`undefined` for a stated zero as well - the same defect pointing the other way - and the stated-zero
half is green on both trees precisely so it can catch that later.

### What this did NOT close

- **`elementDecimalOrZero` is still exported and still substitutes `X12Decimal.ZERO`.** Its
  documented behaviour is unchanged; what changed is that no reader in this library calls it. Left
  deliberately: it is a public helper, a consumer walking segments itself may still want it, and
  removing it would break a caller for no correctness gain now that nothing in the library inherits
  it.
- **`undefined` still does not say WHY on its own.** Absent and unparseable both land there, and
  only `X12_UNPARSEABLE_DECIMAL` at that `elementIndex` separates them. Likewise an 837 line whose
  `SVx` never decoded reads `undefined` for the same reason a decoded `SVx` with an empty charge
  element does, and only `X12_837_SERVICE_LINE_NOT_DECODED` tells those apart. Never write that
  `undefined` means "the sender omitted it".
- **An `AMT` / `ADX` row whose amount element is ABSENT is dropped with NO warning on any channel.**
  `AMT*AU~` gives `claim.amounts: []` and `warnings: []`, identically on both trees. **Say ABSENT,
  not "does not decode"** - a first draft of this bullet said the wider thing and pass 2 measured it
  false: `AMT*AU*N/A~` and `AMT*AU*1,234.56~` also give `claim.amounts: []` but DO emit
  `X12_UNPARSEABLE_DECIMAL` at `elementIndex` 2, because `decodeAmt` passes the sink. Only the
  absent element is silent, which is the same bound `X12-QUANTITY-SILENT-DEFAULTS` already states
  and which this file contradicted for one commit. `PRE-EXISTING`, and its own slice: closing it
  needs a retention decision and a registry code, neither of which belongs in a type widening.
- **SV3-06's TR3 usage is NOT grounded, and the emit-side refusal does not claim it is.** `units`
  became required for all three variants on one argument that needs no usage code (a serializer may
  not state a count nobody supplied), but nobody here has read X224A2. Pass 1 measured the cost:
  this repo's own `test/fixtures/golden/837d.edi` carries `SV3*AD:D2391**11*OC:MO:DO*5*1`, which
  reads `charge: undefined` and `units: 1`, so it cannot be fed straight back through `build837D`
  without inventing a charge - though `charge` was already a required spec field, so that half is
  unchanged here. An availability trade, recorded rather than argued away; worth a grounding item if
  anyone gets the X224A2 text.
- **The five `PRE-EXISTING` defects filed under `X12-837-RESIDUALS` are untouched** and carried
  forward: the stray `SVx` that re-types a whole submission, the `NM1*87` with a `CLM` open landing
  in `claim.providers`, `attachContact`'s `/* v8 ignore */` `payToAddress` arm, the Loop 2010AB short
  a Required `N3`, and the `NM1*87` in a Loop 2000B with no claim open. ADR 0016 restriction 2: this
  slice is not obliged to fix what it merely fails to fix, and a type widening is exactly the kind of
  change that would have carried them in unnoticed.

### Relocated from `x12/CLAUDE.md`, 2026-08-10, VERBATIM, NOTHING DROPPED

Moved here to pay for the `X12-ISA-ELEMENT-ARITY` trap's pass-1 corrections under this repo's
zero-headroom ratchet. The imperative stays in `CLAUDE.md`; the bullets are the text that was
there, unchanged.


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

## `X12-837-SV1-OVERWRITE` (2026-08-08) - a second service segment replaced the first, silently

The section behind the `CLAUDE.md` trap of the same name. Its own file rather than a section of
`documentation/agent-notes.md`, because that file is on its own budget with almost nothing left.

Base: `159a62c` (`#87`). Byte-identical at `c758bcd` before it, so `#87` neither caused this nor
closed it; it was escalated out of `#87`'s pass 2 as `STOP-THE-LINE` by both refuters.

### The defect, reproduced before anything was changed

Under a resolving `ST-03` of `005010X222A2`, one `LX` followed by

```
SV1*HC:99213*8500*UN*4***1~
SV1*HC:99999*12*UN*1***1~
```

left **one** service line reading `charge` `12`, `units` `1` and `procedureCode` `99999`, with
`warnings: []`. `8500` became `12`. CPT `99213` became `99999`. Nothing was raised on any channel.

Measured the same way on both trees, with a probe that reads the slots off
`submission.claims[].serviceLines[]` exactly as the published model nests them - the `#73` lesson
that a probe disagreeing with the model's own shape measures nothing. **Negative control:** the same
probe against `hl7`'s `src/` fails with `parseX12 is not a function`, so the measurement was of
`x12` and not a stale scratch artifact. Base trees were restored **by file copy** (`git archive`
into a scratch directory), never by `git checkout`.

### The mechanism, and why it is total rather than a merge

`ServiceLineAccumulator` carries **one** service segment's worth of slots, and `decodeSv1` /
`decodeSv2` / `decodeSv3` each assign **every** slot their kind writes - unconditionally, from the
segment in hand. So a second matching service segment does not fill blanks left by the first; it
replaces the lot.

Three corners, each measured and each a committed test:

- **A repeat whose own charge element is ABSENT writes `undefined` over a stated amount.** Post
  `X12-837-SV-UNDEFINED-DECIMAL`, `elementDecimal` answers `undefined` for an absent element, and
  the assignment is unconditional, so `SV1*HC:99214**UN*1***1~` following an `8500` leaves the line
  with no charge at all. **`X12_837_SERVICE_LINE_NOT_DECODED` does NOT fire there**, because
  `serviceSegmentDecoded` is true: a service segment _did_ decode. That makes the new code the only
  thing on the channel that explains the empty slot.
- **A service segment whose kind does not match the resolved variant is read into nothing.**
  `decodeSvN` returns on its variant check, so it overwrites nothing and what it carries reaches no
  part of the typed model. That case was `#87`'s explicitly deferred residual ("a foreign `SVx`
  INSIDE an already-decoded Loop 2400 is silent at the segment").
- **All three variants reach it** on their own segment (`SV1` under P, `SV2` under I, `SV3` under
  D), and so does the caller-`type` route with no `ST-03` at all.

### 🛑 What shipped, and what deliberately did not

`X12_837_SERVICE_SEGMENT_REPEATED`, the 33rd Tier-2 code (additions-only), plus the public factory
`serviceSegmentRepeated(position)`. Raised at the **repeated service segment itself**, carrying **no
`elementIndex`**, **once per repeat**, and only where a Loop 2400 is **open**.

**The decode is NOT narrowed and last-wins is unchanged, element for element.** Which values a
document decodes to are byte-for-byte what they were at `0.0.13`.

- Switching to first-wins would change how **already-published documents decode** - the same call
  `#87` and `#71` made on this same segment family.
- **Which occurrence the sender meant is deliberately not decided**, because a stray service segment
  and a conformant one are indistinguishable to this reader. Disclosing is honest; picking a winner
  would be inventing.
- **Nothing moves onto the new code.** Every existing code fires on exactly the documents it fired
  on before, at the same position, pinned by whole-channel `toEqual` assertions with the new code
  filtered out.

### 🛑 A consumer that was blind, and it was this package's own documentation

`#83` was refuted for a widening that moved a case **off** a code a published recipe gated on. The
mirror-image hazard bit here: the cookbook's "gate before you post a line amount" recipe named
**four** codes (`X12_837_SERVICE_LINE_NOT_DECODED`, `X12_UNPARSEABLE_DECIMAL`,
`X12_AMOUNT_ROW_DROPPED`, `X12_STATED_AMOUNT_DISCARDED`) and **none** of them fires on the overwrite
document. A consumer following it posted `12` for a line the sender also sent as `8500`. Nothing had
moved - the gap was a code that had never existed.

The cookbook, the troubleshooting table and `KNOWN-LIMITATIONS.md` now name this code beside the
other four, and **a committed test pins that the four-code gate misses what the five-code gate
catches**, with a clean single-segment control on which neither fires.

**And the recipe was not the only page.** `docs-content/spec-notes-money.md` named
`X12_837_SERVICE_LINE_NOT_DECODED` as "the known instance" of an 837 charge reading `undefined` from
a slot no reader read, and told a consumer to gate on it. The repeat corner is a second instance by
a different route, on which that code does **not** fire. The page now says so. **Read the rule out
of this: sweeping the RECIPE is not sweeping the DOCS, and a page that names "the known instance" of
anything is a census that the next slice falsifies.** A pass-1 refutation found this page after the
first three surfaces had been swept and called done.

### The message asserts no TR3 usage, and depends on no variant resolving

**`VARIANT_BY_ICR`'s three keys are still grounded against nothing** (`#87` pass 2 recorded its own
recollection as `UNDETERMINED`, not a citation), so nothing in this slice's wording may depend on
which implementation-convention reference resolves. It does not: the message names no ICR, and the
condition is a property of the segment stream inside an open Loop 2400.

It also **asserts no TR3 usage code for the service segment**. The claim is about this reader -
"this reader's line carries one service segment's worth of slots" - in the same spirit as
`X12-QUANTITY-SILENT-DEFAULTS`' rule that nothing here may assert what X12.6 permits, because nobody
here has read it. `X12_837_PAY_TO_ADDRESS_REPEATED`'s message does make a TR3 structural claim; this
one deliberately does not.

### Census and controls

Most of the new suite is red against a base `src/` restored from `159a62c` by file copy, and the
**green are exactly the controls, the never-fires pins and the invariance pins**. **NO COUNT AND NO
PARTITION IS PUBLISHED, DELIBERATELY.** Three drafts of this census shipped a number and all three
were wrong: a partitioned form was wrong four ways once before, the first draft here was stale by
two cases, and the correction was re-broken by the very commit that wrote it, because the suite grew
again in the same commit. **Derive it, by RUNNING head's suite against a base tree, never by
arithmetic and never from this paragraph.** Two existing tests went
red - `transactions-claim-837-service-segment-without-lx.test.ts`'s trailing-`SV2` case and
`transactions-claim-837-ambiguous-variant.test.ts`'s "loser inside an already-decoded line"
additivity case - **and those were the two pins ON this silence, so that is the finding rather than
a regression.** Both were corrected to say what is now true; the second grew an
`ADDED_SINCE_0_0_13` set so the next additive slice does not red it for being additive.

**Two guard negative controls, each run and each red exactly where predicted:**

- keying the report on `serviceSegmentDecoded` instead of "a service segment arrived" re-silences
  the foreign-then-matching pair (2 red);
- latching the flag walk-wide instead of scoping it to the line flags a conformant second line
  (3 red, including the two-`LX` control).

Verify: **11 of 11 steps in `ran:`** (audit, licenses, typecheck, lint, format:check, phi-scan,
check:no-emdash, test:coverage, build, attw, verify:exports), green. **No suite total is published**

- one was, and it went stale inside this slice, for the same reason the census did. Derive it.

### Budget

`x12/CLAUDE.md` entered this slice at **52,723 with zero room** and leaves it smaller, paid for by
relocating narrative into `documentation/agent-notes.md#x12---narrative-relocated-out-of-claudemd-2026-08-07` §8 **first**.
No trap was deleted. `agent-notes.md` untouched, its 18 bytes intact. **NO NEW BYTE FIGURE IS
PUBLISHED HERE, DELIBERATELY:** one was, it went stale inside this slice's own correction commit,
and a drifting number is deleted rather than corrected. **The umbrella still owes the matching
ratchet drop of `REPO_CLAUDE.x12` in the umbrella's size hook (since retired), which is outside this repo:
derive the number from `wc -c x12/CLAUDE.md` at the merged sha.**

### 🔴 What this slice did NOT close

- **`VARIANT_BY_ICR`'s three keys are still ungrounded.** This slice was written so that nothing in
  it depends on them, but the grounding unit `#87` asked for is still owed.
- **The variant fallback is still not narrowed**, deliberately, and neither is last-wins here.
- The other `PRE-EXISTING` residuals in `X12-837-RESIDUALS`: `transactionIndex` hard-coded `0` in
  `get-837.ts`; an `NM1*87` with a `CLM` open landing in `claim.providers`; `attachContact`'s
  "structurally unreachable" `payToAddress` arm; a Loop 2010AB short a Required `N3`; SV3-06's
  ungrounded TR3 usage.

### Relocated from `x12/CLAUDE.md`, 2026-08-10, VERBATIM, NOTHING DROPPED

Moved here to pay for the `X12-ISA-ELEMENT-ARITY` trap under this repo's zero-headroom ratchet. The
imperative stays in `CLAUDE.md`; the bullets are the text that was there, unchanged.

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

## x12 - the `AMT` / `ADX` absent-amount silent drop (2026-08-07)

`X12-837-RESIDUALS`' `AMT` / `ADX` residual, filed by `#83`'s refuters and deferred there because
closing it needs a retention decision and a registry code, neither of which belongs in a type
widening. Split out of `documentation/agent-notes.md` under the umbrella's retired size decision because that file was at
**249,982 of a 250,000-byte budget** and the hook refused the write. **Nothing dropped.**

### The defect

`decodeAmt` (835, 837, 834) and `decodeAdx` (820) answer `undefined` for the **whole row** when the
amount element decodes no value, and every caller then dropped the row. An `AMT` and an `ADX` are not
slots on a bigger record: each one **is** a record, carrying an amount plus the thing the amount is
about. So the qualifier (`AMT-01`) or the adjustment reason code (`ADX-02`), and any reference
qualifier and id, went with the amount.

Reproduced on the base tree at `9db104b`, on all four readers, before anything was designed:

| reader              | segment                        | amount element | at base                              |
| ------------------- | ------------------------------ | -------------- | ------------------------------------ |
| `get835`            | `AMT` (claim and service line) | AMT-02         | `amounts: []`, `warnings: []`        |
| `get837Claims`      | `AMT` (claim and service line) | AMT-02         | `amounts: []`, `warnings: []`        |
| `get834Enrollments` | `AMT` (coverage)               | AMT-02         | `amounts: []`, member `warnings: []` |
| `get820Payments`    | `ADX`                          | ADX-01         | `adjustments: []`, `warnings: []`    |

**▶ 🩺 THE ABSENT / UNPARSEABLE DISTINCTION IS THE WHOLE FILING, AND THE WIDER FORM IS FALSE.** An
**ABSENT** amount element was silent on every channel. A **PRESENT** one holding bytes that do not
decode (`1,234.56`, `$120.00`, `-25.00USD`) was dropped **and warned**, because `decodeAmt` and
`decodeAdx` pass the decimal sink, so `X12_UNPARSEABLE_DECIMAL` fired at that `elementIndex`. Only
the absent route was silent. A first draft of `#83`'s bullet said "does not decode" and pass 2
measured it false; that cost a minor, and it is why this file says ABSENT.

Two of this repo's own fixtures already carried the case and the suite asserted the silence:
`test/fixtures/premium/820-edge.edi` line 17 is a bare `ADX~`, and
`test/fixtures/enrollment/834-edge.edi` line 24 is `AMT*P3~`. Both tests now assert the report.

### The remedy

`X12_AMOUNT_ROW_DROPPED`, the **30th** Tier-2 code (additions-only), plus the public factory
`amountRowDropped(position)`.

- **On the 835 and the 837 the row lost may be a LINE-level one.** Both attach an `AMT` to the open
  service line first and to the claim only when there is none. Pass 1 refuted the slice for calling
  the 837's site "claim-level" on six surfaces; this package's own dogfooded spec declares `AMT`
  situational in Loop 2400 (`src/transactions/claim/loop-spec.ts`), so an X222A1 sales-tax `AMT*T` or
  postage `AMT*F4` on a line is exactly the shape being lost. A consumer told to read `claim.amounts`
  would have found it unchanged and treated the warning as stale.
- **Anchored at the `AMT` / `ADX` itself, with NO `elementIndex`.** One of the two routes into it is
  an absent element, and an absent element has no index to name - the same reason
  `X12_837_UNKNOWN_VARIANT` carries none for an absent ST-03. The segment fixes which element was
  being read anyway (AMT-02 or ADX-01).
- **Raised for BOTH routes.** The report is about the ROW being lost, which is true either way. What
  separates the routes is whether an `X12_UNPARSEABLE_DECIMAL` accompanies it at the same
  `position.segmentIndex`.
- **The 834's lands on the MEMBER's own `warnings`**, following the per-member scoping the decimal
  sink beside it already used. A roster-level report would say a premium was lost without saying
  whose.
- **The call site is the walker, not the decoder.** `decodeAmt` / `decodeAdx` stay pure and the
  warning is pushed where the row would have been attached, so it fires on the decode failure and
  never on the separate attachment failure below.

### The constraint the previous slice paid for, applied here

**🛑 A WIDENING THAT MOVES A CASE ONTO A NEW CODE SILENTLY BLINDS EVERY CONSUMER PREDICATE WRITTEN
AGAINST THE OLD ONE, AND THIS PACKAGE'S OWN DOCS ARE SUCH A CONSUMER.** That is what refuted `#83`
on pass 1. Applied here, the answer is that **nothing moves**: the unparseable route keeps
`X12_UNPARSEABLE_DECIMAL` at the same element on the same document and merely gains a second code
beside it. That is asserted rather than assumed - `test/transactions-amount-row-dropped.test.ts` pins
both halves, that a one-code gate misses the absent-amount document **and** that it still fires
exactly where it always did, including on an unparseable `CLP-04`, which this slice does not touch at
all.

The sweep that goes with it, because "no case moved" is not the same as "no doc went stale":
`KNOWN-LIMITATIONS.md`, `docs-content/spec-notes-money.md`, `docs-content/troubleshooting.md` and
`docs-content/cookbook.md` each carried a sentence of the form _"an absent element does not warn"_ or
_"a row whose amount does not decode is sometimes dropped whole instead"_. Every one is now qualified
to say what it is actually about - `X12_UNPARSEABLE_DECIMAL` specifically, not silence generally.

**A `PRE-EXISTING` doc defect corrected in passing, disclosed rather than folded in:**
`docs-content/cookbook.md` said an undecoded 837 service line "ships `charge` and `units` as `0`".
`#83` made those `undefined` on the same unreleased version, so the page contradicted the money
spec-note it links to. One phrase, in a paragraph this slice was rewriting anyway.

### The census

**16 of 26 new cases red** against a base tree restored from `9db104b` **by file copy** (`git archive
| tar -x` into a scratch directory, never `git checkout` in the live tree - that has silently eaten
uncommitted work twice). The 10 green are exactly the CONTROLs, the BOUNDs, and the additions-only
pin that must be green on both trees:

- **5 CONTROLs**: a stated amount and a stated zero still build a row and still warn nothing, on the
  835, 837, 834 and 820. The **stated zero** half is the one that must not collapse into the absent
  case.
- **4 BOUNDs**: the 835's `AMT` that DOES decode with no claim open; the 834's `AMT` with no `HD`
  open; the 820's `RMR` that states an open item and no amount, whose row survives; and the 820's
  `RMR` that states an amount and NO open item, whose row is dropped whole and silently. All four
  are silent on both trees, deliberately.
- **1 additions-only pin**: the old one-code gate still fires where it fired.

The pass-1 remedy added four cases. Three are red at base, because they assert head behaviour: the
837's LINE-level `AMT`, the "with no claim open an ABSENT amount STILL warns" half of the bound, and
the Loop 2430 inversion, whose head-only half is the report on the undecoded `AMT`. The fourth, the
820 `RMR` with no identity, is a `PRE-EXISTING` disclosure pin and is green on both trees by
design. **No count of them is given without its list**, which is the defect pass 2 caught one
paragraph earlier in a first draft of this same section.

**Negative control:** the same file against an `hl7` tree restored the same way collects all 26 cases
and passes **none** of them - every one dies at `parseX12 is not a function`, because that package's
barrel has no such export. The apparatus is bound to this package's surface and cannot report green
against another one.

**One vacuous green was found and inverted before it shipped.** The "every reader reports it at the
segment and never at an element" sweep iterated a filtered array, and at base that array is empty, so
the `for` body never ran and the case passed having asserted nothing. It now asserts the length
first, which is what turned it red at base. That is the `#63` failure mode (four of six new cases
vacuous) caught by running the census rather than by reading the file.

### Bounds, stated because the wider reading is the tempting one

- **It reports a row whose AMOUNT was read and decoded no value. State it as a property of the READ,
  never of the walker's control flow** - that is what pass 1 refuted. A segment discarded BEFORE its
  amount is read is not on this channel (the 834's `AMT` with no `HD` open, the 820's `ADX` with no
  remittance open), and neither is one whose amount decoded and then found nothing to attach to. But
  **"nothing open means silent" is FALSE**: the 835 and the 837 decode first, so an `AMT` with an
  absent amount and no claim open does raise this code. Measured both ways at head.
- **🔴 An 820 `RMR` is not on this channel, and NOT because its row survives.** `decodeRmr` returns
  `undefined` when `RMR-01` and `RMR-02` are both empty, **before** `RMR-04` is read. So an `RMR`
  that states an open item and no amount keeps its row with `amountPaid` left `undefined` and there
  is nothing to report - but `RMR****150.00*150.00~` is dropped whole with `warnings: []`, taking a
  stated 150.00 payment, its payment-action code and its amount due. **The first draft of this bullet
  published the retention half as if it held for every `RMR`, and pass 1 falsified it with that one
  segment.** `PRE-EXISTING`, identical on both trees, filed as its own item: nothing failed to decode
  there, so covering it is a retention decision this slice defers. Both cases are now pinned.
- **A Loop 2430 `AMT` under an open `SVD` is discarded outright, and the report INVERTS there.** With
  a claim and a line open, the 837's adjudication skip drops an `AMT*EAF*75.00~` (Remaining Patient
  Liability, declared in this package's own Loop 2430 spec) in silence, while `AMT*EAF~` raises this
  code - the warning is present exactly where LESS was lost. A v1 scope limit on the adjudication
  model rather than a failed read. Disclosed and pinned, not widened.
- **The model is unchanged.** No slot was widened, no row is retained that was not retained before.
  This closes the SILENCE only, exactly as `X12-837-SV-SILENT-ZERO` did before
  `X12-837-SV-UNDEFINED-DECIMAL` closed the `0`. Retaining a row with an `amount` of `undefined`
  would be a breaking model change and belongs in its own slice if anyone wants it.
- **No TR3 usage code is asserted.** Nobody here has read X221A1, X222A2, X220A1 or X218 for `AMT` or
  `ADX` usage, and the code does not need one: the argument is that a row the sender wrote left the
  model, which is true whatever the segment's usage is.

### Deliberately not touched

The five other `PRE-EXISTING` findings carried in `X12-837-RESIDUALS` (a stray `SVx` re-typing a
submission; an `NM1*87` with a `CLM` open landing in `claim.providers`; `attachContact`'s
`/* v8 ignore */` arm; a Loop 2010AB short a Required `N3`; an `NM1*87` in Loop 2000B with no claim
open), and **SV3-06's TR3 usage, which is still not grounded** - do not claim it is.

### Relocated from `x12/CLAUDE.md`, 2026-08-10, VERBATIM, NOTHING DROPPED

Moved here to pay for the `X12-ISA-ELEMENT-ARITY` trap's pass-2 correction under this repo's
zero-headroom ratchet. The block covered BOTH this slug and `x12-stated-amount-discarded.md`, and
it is kept whole here rather than split. The imperative stays in `CLAUDE.md`; the bullets are the
text that was there, unchanged.


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

## `X12-BODY-DEGENERATE-RELEASE-SEPARATOR` (2026-08-09)

The measurement, the sources and the reasoning behind the `CLAUDE.md` trap of the same name. Open
this before you touch `decodeSegment`, `splitWithRelease`, `findUnescapedTerminator` or
`splitElements`.

### What was measured at base (`72bafc2`, published `0.0.15` plus two unreleased fixes)

`detectDelimiters` reads the element separator positionally out of ISA byte 4. It rejects ASCII
control characters, DEL, anything matching `\s`, and a non-distinct set of four - and nothing else.
`?` is therefore admissible as ANY of the four delimiters, and `buildInterchange` exposes all four to
a caller under the same screening.

`src/parser/envelope.ts` already handled the degenerate case twice:

- `findUnescapedTerminator` - `if (term.length !== 1 || term === RELEASE_CHAR) return text.indexOf(...)`
- `splitElements` - `if (delimiters.element === RELEASE_CHAR) return segment.split(...)`

`src/parser/segment.ts`'s `decodeSegment` did not. It called `splitWithRelease(raw, delimiters.element)`,
whose loop consumes the byte after every `?` unconditionally, so with `?` AS the element separator no
split ever happened. Measured straight through `parseX12` on an interchange whose ISA declares
`element: "?"`:

```text
ST?837?0001?005010X222A1                 id "(non-spec)", 1 element
NM1?85?2?ACME CLINIC?????XX?1234567893   id "(non-spec)", 1 element
SE?3?0001                                id "(non-spec)", 1 element
warnings: []
```

`boundSegmentId` maps the blob onto `NON_SPEC_SEGMENT_ID` because it fails the segment-id grammar.

**The envelope framed correctly the whole time, and that is what made it silent.** `groups.length`
is 1, the transaction is present, `GE-01`, `IEA-01`, `GS-06`/`GE-02` and `ST-02`/`SE-02` all
reconcile, `warnings` is `[]` - because those all read `splitElements`' output, which was right. Only
the decoded body was wrong, and every reader in this package dispatches on `seg.id`, so a consumer
got an empty claim list out of a document `parseX12` reported as clean.

`buildInterchange` disagreed with itself the same way `#96`, `#97` and `#99` each found it doing: it
returns `parseX12` of the bytes it just wrote, so a caller passing `elementSeparator: "?"` and a
`CLM` got back a model containing no `CLM`.

### The fix, and its exact bound

Two lines in `decodeSegment`, both keyed on `delimiters.element === RELEASE_CHAR`:

1. the element split falls back to `raw.split(delimiters.element)`, and
2. the dangling-release check is skipped.

(2) is not cosmetic. The check keys on a trailing `?`, and with `?` as the separator that byte is an
EMPTY LAST ELEMENT. Without it, `PER?IC?NAME?TE?5551234?` - a well-formed segment - raised
`X12_DANGLING_RELEASE_CHAR` at the same moment the split started producing the right answer. Each
half has its own red control: removing (1) reds seven tests, removing (2) reds exactly one.

### 🛑 Why the guard is at the CALL SITES and not hoisted into `splitWithRelease`

A draft put one line in `splitWithRelease` - `if (sep === RELEASE_CHAR) return input.split(sep)` -
which is smaller and covers all three roles at once. It is wrong, and the reason is on the EMIT side.

`escapeRelease` protects a value by **prefixing `?`** to the byte that needs protecting, and it does
that **whatever role `?` was declared in** - so with `?` as a component separator a literal `?` in a
value is written `??`. At `0.0.15`:

```text
buildInterchange({ componentSeparator: "?" }) with CLM-01 "PATIENT?ACCT"
  emits  CLM*PATIENT??ACCT*150.00
  reads  getSegmentValue(clm, "01") === "PATIENT?ACCT"   warnings: []
```

**That builder call is REFUSED now** (`X12-EMIT-DEGENERATE-RELEASE-DELIMITER`, the emit-side slice
that followed this one) - but the argument for leaving the read side alone SURVIVES the refusal and
gets stronger, because those bytes were emitted and those documents exist. Hoisting the guard would
re-frame that `??` as two empty components and stop reading a value this library itself wrote. It is
the same shape as `#99`'s pass-1 code major (mapping `esc` over the whole parts array broke a spec
that built clean at `0.0.15`), reached from the other side. The repetition role behaves identically.

So: the ELEMENT role is fixed, because there the degenerate behaviour was catastrophic and had no
working counterpart to protect. The REPETITION and COMPONENT roles are left alone on READ, because
there the degenerate behaviour is merely a separator that never splits AND documents emitted at
`0.0.15` depend on it. Deciding those two on EMIT meant deciding `escapeRelease` with them, which is
the different slice named above and is now done: a builder refuses the set rather than the parser
re-reading it.

### 🩺 The refutations: the emit half reaches the ELEMENT role too, and TWO drafts named a trigger instead of the property

**Read this before you write the next sentence about `buildInterchange` and a degenerate set. Two
drafts were refuted here, the second by the correction to the first.**

- **Pass 1.** The "per ROLE" paragraph above rests on the escaper acting **in every role**, and the
  draft then drew the consequence for two of the three. The gate refuted it with a value one
  character away from the control the draft did pin.
- **Pass 2.** The pass-1 remedy named the trigger as _"a value carrying a literal `?`"_ and shipped a
  consumer instruction to _"keep `?` out of your values"_. The gate refuted that by producing one
  more trigger byte, and the instruction protected nobody.

**The property, which one more trigger byte cannot falsify.** `escapeRelease` protects a value by
**prefixing `?`** to the byte that needs protecting - any of `element | repetition | component |
segment | ?`. When `?` IS the element separator, that prefix is itself a separator, so the protection
becomes a split. **No value containing any active delimiter or a literal `?` survives a
`buildInterchange` round trip on `elementSeparator: "?"`, and there is no value-level workaround.**
**It is REFUSED now, in all four roles** - and read the mechanism sentence as one of TWO; the section
at the end of this file says what the other is.

Instances, measured at head, **not a census**:

```text
["CLM","PATIENT?ACCT","150.00"] -> CLM?PATIENT??ACCT?150.00  ["CLM","PATIENT","","ACCT","150.00"]
["HI","ABK:J45.50"]             -> HI?ABK?:J45.50            ["HI","ABK",":J45.50"]
["CLM","ACME^CLINIC","150.00"]  -> CLM?ACME?^CLINIC?150.00   ["CLM","ACME","^CLINIC","150.00"]
["REF","EA","A~B"]              -> REF?EA?A?~B               ["REF","EA","A","~B"]
warnings: [] on every row. At base 72bafc2 every row read ONE `(non-spec)` element,
every dot-path `undefined`.
```

**The round-trip failure is `PRE-EXISTING`; the DIRECTION is not.** A detectable absence became a
confident wrong value with an empty warning array - the one direction
`src/builder/caller-string.ts`'s own module doc forbids. **And it is not always a truncation:** the
`HI` row strands the diagnosis code in a phantom `HI-02`, so `getSegmentValue(hi, "01-2")` answers
`undefined` while `"02"` answers `":J45.50"`. `:` composites are routine in the 837 and the 835, so
this is not the exotic corner the `?` framing implied.

**It is corrected as a CLAIM and deliberately NOT guarded** (conventions.md rule 3, and both refuter
passes said so in as many words). A guard here means deciding `escapeRelease` for a degenerate set
inside a read-side slice, which is how a fix outgrows the thing it fixes. What changed instead: the
test that claimed the builder "no longer disagrees with itself" is retitled to the qualified claim it
can support, the property is pinned by a table of instances that states it is not a census, the
value-level mitigation is **deleted** rather than reworded, and every surface says **THREE** roles
need the emit side decided.

**Not measured, and flagged for that emit-side slice rather than for this one:** only the generic
`buildInterchange` segment-spec route (`buildTransaction`'s `segment.map(esc)`) was probed. The
per-TR3 domain builders were not.

**They were measured in the emit-side slice, and the flag was right to be there: they carry a SECOND
mechanism this section never saw.** A domain builder joins composites with the component separator
and repetitions with the repetition separator, so where either IS `?` the library's own structural
join is emitted as an escape - `build837P` fused `SV1-01-2` and `HI-01-2` into the preceding
component on EVERY document, with no trigger byte in any value. So the property stated above is one
of two, and the sentence _"no value containing any active delimiter or a literal `?` survives"_ is
true and INCOMPLETE: the second mechanism has no offending value at all. Full measurement:
`documentation/agent-notes.md#x12-emit-degenerate-release-delimiter-2026-08-09`.

**The third refutation, smaller and the same shape (pass 1).** The `?~` residual control pinned `raw` and the id
list but not `elements`, and "framing is untouched" read as "nothing about this residual moved". The
read of the merged blob DID move: `PER?IC?NAME?TE?5551234?EX?~SE?3?0001` now frames as
`["PER","IC","NAME","TE","5551234","EX","~SE","3","0001"]`, so `~SE` and the SE's own control number
sit in `PER`'s communication-number slots, where at base they sat inside one `(non-spec)` element
that no walker touched. `X12_MISSING_SE` still fires, so it is not silent. `elements` is pinned now.

### 🩺 The residual this does NOT close, measured

`findUnescapedTerminator` guards its own role only. With `?` as the ELEMENT separator, a segment
ending in an empty last element puts a `?` immediately before the terminator, and the scanner reads
it as an escape:

```text
...ST?837?0001~PER?IC?NAME?TE?5551234?EX?~SE?3?0001~GE?1?1~IEA?1?000000001~

  segments: ST, PER   (PER.raw === "PER?IC?NAME?TE?5551234?EX?~SE?3?0001")
  warnings: [X12_MISSING_SE]
```

`PRE-EXISTING`, and framing rather than decoding, which is the `#96` class and its own call. It is
pinned in `test/parser-segment-degenerate-release-separator.test.ts` as an honest control so it
cannot move unnoticed, and it is disclosed in `KNOWN-LIMITATIONS.md` beside the fix.

### The behaviour-change call

**It changes how an already-published document decodes, deliberately.** The tiebreak is CONSISTENCY
with the two guards this package already carried, NOT a spec clause: 005010 does not transmit a
release character at all, so nothing in it says what a `?` means once a sender has declared `?` as
structure.

**But do not restate `#96`'s symmetry here - it does not hold.** `#96` moved a case between two
defensible readings and had to be reported as symmetric because a literal-`?` sender lost an element
by it. Here the base behaviour is not a reading: a one-element segment with an id of `(non-spec)` is
not an alternative parse of `NM1?85?2?ACME CLINIC`, and no reader in this package could act on it.
There is no direction in which base was right.

The other alternative considered and rejected: refusing the interchange as Tier-3
`X12_INVALID_DELIMITERS` when a delimiter is `?`. It would refuse documents this library currently
accepts AND documents `buildInterchange` currently emits, and it would contradict the two existing
guards, which both chose the literal-split fallback.

### Warning-channel accounting

No code is minted. One is subtracted, in one place - the spurious `X12_DANGLING_RELEASE_CHAR`
above - so the channel change is purely subtractive and only on the degenerate set. Every assertion
in the test file is `toEqual` on the WHOLE array, per the standing rule that pinning a value plus the
absence of a different code stays green through a real regression.

### What was re-measured while picking this slice

The `X12-837-RESIDUALS` "still open" list carried five items. Measured against `72bafc2`:

- **`splitWithRelease` degenerate-`?` guard for BODY segments** - OPEN. This slice.
- **`parseTA1` does not unescape** - OPEN **at `72bafc2`**, and **CLOSED since, by
  `X12-TA1-RESIDUALS`**: the five decoded fields are post-unescape and `raw` is the byte surface.
  This is a dated measurement, not a live claim; read it as one.
- **an EMPTY control number is still not refused** - OPEN, and sharper than "not refused":
  `padControl("", 9)` zero-pads it, so `interchangeControlNumber: ""` emits ISA-13 and IEA-02 as
  `000000000` - a FABRICATED control number, silently, with an empty warning array. An empty
  `groupControlNumber` emits an empty GS-06 / GE-02, and an empty `transactionSetControlNumber` an
  empty ST-02 / SE-02.
- **`buildInterchange` does not escape GS-04/05/07** - **STALE.** Closed by `#99` (`72bafc2`);
  `gs.elements` now reports the caller's values. The backlog item's own "CLOSED THIS ARC" line names
  it while its OPEN list still carried it.
- **a mid-segment dangling `?` raises no `X12_DANGLING_RELEASE_CHAR`** - **NOT REACHABLE AS STATED,
  and it should not be "fixed" without re-deriving it.** A `?` at the end of a non-final element is
  by definition escaping the separator that follows it, so it is never unpaired; and inside a
  terminated stream a segment cannot END with a bare `?` either, because that `?` would escape the
  terminator. The only reachable bare-`?`-with-no-target is at end of input, which `decodeSegment`
  already warns for. What genuinely raises nothing is the `?X` Postel case, which `release.ts`
  documents as deliberate and `KNOWN-LIMITATIONS.md` already records as unchanged - warning on it
  would fire on every literal `?` in an `NTE`.

### The `CLAUDE.md` imperatives, RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED

Moved out of `CLAUDE.md` under that file's own ratchet to pay for the
`X12-EMIT-DELIMITER-SHAPE-UNCHECKED` trap: relocate first, lower the entry as the relocation
lands, never raise the ceiling. These are the live imperatives, unchanged; `CLAUDE.md` now carries
only a pointer to them.

- **🩺 `decodeSegment` FALLS BACK TO A LITERAL SPLIT WHEN THE ELEMENT SEPARATOR IS `?`, AND SKIPS
  THE DANGLING CHECK WITH IT** (a trailing `?` there is an EMPTY LAST ELEMENT). `?` is admissible at
  any delimiter position and `buildInterchange` takes all four, so a BODY segment came back as ONE
  element, id `(non-spec)`, **while the ENVELOPE framed correctly and every count reconciled -
  `warnings: []`, and readers dispatch on `seg.id`, so a clean document gave an EMPTY claim list.**
  THREE SITES NOW; KEEP THEM IN STEP.
- **🛑 PER ROLE, ON READ; DO NOT HOIST IT INTO `splitWithRelease`.** Splitting the other two breaks a
  value WE EMITTED at `0.0.15` (`#99`'s pass-1 major, inverted), and **THAT REASON SURVIVES THE EMIT
  REFUSAL - THOSE DOCUMENTS EXIST.** The emit half is the trap below; **STATE THE PROPERTY, NEVER A
  TRIGGER BYTE - TWO DRAFTS NAMED ONE AND THE GATE PRODUCED ONE MORE EACH TIME.**
- **⚖️ CHANGES PUBLISHED DECODING, ON CONSISTENCY, NOT SPEC - NEVER RESTATE `#96`'s SYMMETRY: A
  `(non-spec)` BLOB IS NOT A SECOND READING.** No code minted; ONE subtracted. **`PRE-EXISTING`,
  OPEN: `?~` still swallows the TERMINATOR. FRAMING UNTOUCHED - BUT THE MERGED BLOB'S READ MOVED
  (`~SE` lands in `PER-06`), SO NEVER SAY "NOTHING MOVED".**

## `X12-BUILDER-BOUNDS` (2026-08-02)

**RELOCATED FROM `CLAUDE.md` 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-BODY-DEGENERATE-RELEASE-SEPARATOR` trap, under that file's own ratchet (relocate first, lower
the entry as the relocation lands, never raise it to meet a new trap).

The imperatives below are LIVE. Open this file before you touch `renderCallerValue`,
`BUILD_REFUSAL_VALUE_MAX_RENDERED`, `test/builder-refusal-bounds.test.ts`, or any refusal message in
a `build*` entry point. The narrative, the measurements and the refutation history stay in
`documentation/agent-notes.md#x12-builder-bounds-2026-08-02`; this file is the imperative half that
used to sit in `CLAUDE.md`.

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

## `X12-CALLER-VALUE-RESIDUALS` (2026-08-02)

**Relocated VERBATIM out of `CLAUDE.md` on 2026-08-09, nothing dropped**, to pay for the
`X12-EMPTY-CONTROL-NUMBER-FABRICATED` trap at the top of that file's list. The imperatives below
are LIVE; the narrative they point at is `documentation/agent-notes.md#x12-caller-value-residuals-2026-08-02`
and `documentation/agent-notes.md#x12---narrative-relocated-out-of-claudemd-2026-08-07`.

Open this before you touch `renderCallerValue`, `renderCallerJson`, `requireCallerArray`, any
indexed loop bound in a `build*` module, or either of the two source scans that hold them.

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

## `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED` (2026-08-09)

The measurement, the sources and the decisions behind the guard. Open this before you touch
`src/builder/caller-control-number.ts`, `padControl`, or any refusal message at a control-number
slot.

> ## The slice was CUT BACK by a founder-directed re-scope, and the pass count did not reset silently
>
> **Cumulative `conformance-refuter` passes across this lineage before the re-scope: three, all
> `REFUTED`** (`61d9af1`, `cd3f963`, `70e494a`), which is the ADR 0016 ceiling. **No pass ever found
> a defect in the guard.** Every finding was a CLAIM defect, and one sentence ate all three passes by
> surviving in a carrier the previous remedy had not opened.
>
> The founder authorised a **strictly smaller** re-scope under ADR 0016's 2026-07-29 amendment: the
> guard, its tests, and a short **count-free** changeset, with **one sweep that greps the SENTENCE
> rather than the reported site.** That reset the budget; this line records the count so the reset is
> not silent.
>
> **What was cut out of the slice rather than qualified again:** the broad documentation correction.
> `CLAUDE.md`, `README.md`, `docs-content/troubleshooting.md`, `KNOWN-LIMITATIONS.md` and
> `CHANGELOG.md` were returned to base and then touched **only** to delete claims. **No `CLAUDE.md`
> trap was written for this item** and no trap was relocated to pay for one; the trap is filed as its
> own follow-up. **Read this file before you touch the guard, because nothing in `CLAUDE.md` will
> send you here yet.**
>
> **Returning `CLAUDE.md` to base is NOT a no-op, and pass 1 of the fresh budget caught it as a
> major.** `#101`'s own trap there asserted *"NO TYPE CHECK"*, *"a non-string is UNCHANGED ON EVERY
> ROUTE"*, and a parenthetical that `padControl(undefined)` throws a bare `TypeError` with no `code` -
> all three true at base and **all three made false by this guard**, in the file every session in this
> repo loads first. The parenthetical was the sharpest, because it exists to correct an
> already-refuted draft and so reads as hard-won. **All three clauses are DELETED**, which is the same
> "touched only to delete claims" operation and is not the deferred trap. **Two adjacent fragments
> went with them, because both were grammatical riders on a deleted claim rather than sentences of
> their own:** *"BYTE-STRICT `=== ""`"*, which was true of the empty arm but reads as *"there is no
> type check"* once the type half exists, and the imperative **`DO NOT RESTATE WHAT EACH ROUTE DOES`**,
> which is **not** false and is restated in `caller-control-number.ts` and twice in this file. **The
> lesson generalises: a revert to base re-publishes every claim the base made, and a slice that
> falsifies one of them owns the deletion.**
>
> **The sweep, and how the carrier list was derived.** The disputed sentence was *"only the
> segment-join guard names the SLOT; `esc`/`escDec` name only the builder"* - true at base, falsified
> by this guard, because the control-number guard names the slot too. Grepping the **claim's wording**
> rather than the reported file found it at base in `README.md`, `KNOWN-LIMITATIONS.md`,
> `CHANGELOG.md`, `docs-content/troubleshooting.md` (which **ships**),
> `test/builder-refusal-phi.test.ts`, `documentation/agent-notes.md#x12---narrative-relocated-out-of-claudemd-2026-08-07` (twice) and
> `documentation/agent-notes.md#x12---per-transaction-invariants-that-shipped-with-the-phases`. **Every one was DELETED rather than reworded**, and
> the enumerating framing around it ("two things this does NOT say") was made count-free rather than
> decremented. **Re-run the grep before you re-add any sentence about which guard names a slot.**
>
> **Not a carrier, checked and left alone:** `CHANGELOG.md` and `documentation/agent-notes.md` each
> say `requireCallerString` refuses first at **`CLP-01`** and names only the builder. `CLP-01` is not
> routed through `requireControlNumber`, so that statement is still true.

### What was filed, and what it measured

`#101` (`a226595`) closed `interchangeControlNumber: ""` at thirty slots and left two
`PRE-EXISTING` findings behind, both re-measured byte-identical at base and head. Its pass 3 rated
the first a **major**:

> `interchangeControlNumber: []` and `new String("")` STILL emit `000000000` with `warnings: []`,
> because the guard is `=== ""` and does not type-check.

That is the item. It is the same fabrication `#101` closed, reached through a different input type.

### The census, at base `a226595`

Probed every one of `#101`'s thirty routed slots against fourteen non-string shapes, plus five more
added after the first sweep to reach the length-9 boundary. The result is uniform across builders and
splits cleanly by **route**, not by builder:

| route                             | slots | base behaviour on a non-string                   |
| --------------------------------- | ----- | ------------------------------------------------ |
| ISA-13 / IEA-02, via `padControl` | 9     | **EXPOSED**, the shapes below emitted a document |
| GS-06 / GE-02, ST-02 / SE-02      | 18    | already refused, typed, the builder's own code   |
| `AK1-02`, `AK2-02`                | 2     | already refused, typed                           |
| `TA1-01`                          | 1     | already refused, typed                           |

**The class is nine, not thirty.** Every non-string probed at the other 21 was already refused at
base, with that builder's own typed error. **Do not compress WHICH guard did it** - `makeCallerEscaper`
is the usual one, `requireCallerSegment` reaches at least one of them first, and a draft that named a
single mechanism was refuted in one probe. What the nine ISA slots have in common is what matters:
the ISA is fixed-width and joined directly, so it is outside both.

#### What the nine slots did, shape by shape

Measured through `buildInterchange` and identical in all nine:

| input                                                           | base                                                        | why                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `[]`                                                            | ISA-13 `000000000`, `warnings: []`                          | `.length === 0`, pad branch, concatenates to `""`                                       |
| `new String("")`                                                | ISA-13 `000000000`, `warnings: []`                          | same                                                                                    |
| `new String("ABC")`                                             | ISA-13 `000000ABC`, `warnings: []`                          | `.length === 3`, pad branch, coerced                                                    |
| `new String(" ")`                                               | ISA-13 `00000000 `, `warnings: []`                          | same                                                                                    |
| `[""]`, `["12345"]`, `["1","2"]`, `["000000001"]`, `{length:0}` | `X12ParseError` / `X12_INVALID_DELIMITERS`                  | a malformed fixed-width ISA the builder's OWN re-parse rejected                         |
| `0`, `{}`, `true`, `Object.create(null)`                        | `X12_BUILD_INVALID_SPEC`, _"exceeds the 9-char spec limit"_ | no `.length`, both comparisons false, fell to the over-long branch                      |
| `undefined`, `null`                                             | bare `TypeError`, no `code`                                 | `.length` read off nothing                                                              |
| `new String("000000001")`, `{length:9}`, 9-element array        | `X12_BUILD_INVALID_SPEC` naming `"IEA"-02`                  | `padControl` returned the object unchanged; `requireCallerSegment` caught it at the IEA |

**Two of those rows fabricate, two coerce, and the rest fail loudly with a misdirected diagnostic.**
Only the first four are safety findings; the rest are why the fix improves more than it fixes.

### The decision: what "not a control number" means

`#101` settled **refuse over warn** on in-package consistency, and that is not reopened here. The
open question was the **predicate**, and there were three candidates: accept only `string`; coerce
then test; or test the coerced form for emptiness.

**Chosen: `typeof value !== "string"` refuses, then `value === ""` refuses.** The tiebreak is the same
one `#101` used, in-package consistency rather than spec: `requireCallerString` on the `esc` route
already refuses a non-string by name and refuses to coerce, with the reason written out at length -
coercion mints a _different_ identifier, and `String(1e21)` is `"1e+21"`. Accepting a boxed string at
ISA-13 while refusing it at GS-06, in the same call, was the inconsistency the measurement exposed.

**What the predicate does NOT cover, stated precisely:**

- **It narrows what a control number may BE, never what it may CONTAIN.** A whitespace-only
  _primitive_ still builds. Trimming would be a normalisation
  rule and **no source consulted for this package states one** - the same grounding limit that
  governs every identifier slice here.
- **The asymmetry that creates is real and must be stated, never smoothed over:** `new String(" ")`
  is refused because it is not a string, and the primitive `" "` is not. Do not describe the type
  test as having closed "whitespace".
- **It does not bound length either way.** A short control number still zero-pads; a long one still
  draws `padControl`'s own refusal.
- **The ISA's other fixed-width slots are not in this class.** `senderId`, `receiverId`,
  `interchangeDate` and `interchangeTime` go through `pad`, not `padControl`, and are guarded by no
  control-number test. `pad(1, 15)` still reaches `value.slice` and throws a bare `TypeError`.
  Measured, unchanged, and left as its own backlog line - it terminates rather than emitting, which
  is a different defect from the silent one this closes.

### The implementation, and why it went in the shared guard

`requireControlNumber` takes the type test, ahead of the empty test. The describer is
`caller-string.ts`'s `describeCallerValue`, **exported rather than copied**: it reports the type and
never echoes the value, which is `REFUSAL-MESSAGE-PHI-ECHO`'s decision, and a third describer beside
that one and `caller-array.ts`'s `describeShape` would have re-decided it per guard.

Putting the test in the shared guard rather than at the nine `padControl` sites is what makes the
refusal name the slot. It also has a consequence on the other 21, below.

### What moved, in both directions

**No error code was minted and no warning code moved.** Every refusal is the class and code that
builder already raised, through its own `refuseSpec` - the same call `#101` made, for the same reason
(`#83` was refuted for a widening that moved a case onto a new code). What did move:

1. **`undefined` / `null` left a JavaScript builtin.** Bare `TypeError` with no `code` at base; the
   builder's typed refusal now. **A consumer catching `TypeError` at that slot stops catching.** This
   is the sharpest move in the slice and the only one that crosses an error _family_.
2. **The ENUMERATED shapes in the table above left `X12_INVALID_DELIMITERS`**, and nothing wider. At
   base the builder wrote a malformed fixed-width ISA and its own `parseX12` of those bytes rejected
   them: a _parse_ error, naming delimiters, for a caller mistake in one named spec field. Nothing is
   written now. 🛑 **NEVER GENERALISE THIS TO "AN ARRAY-LIKE", AND NEVER PUBLISH A COUNT OF THE
   SHAPES.** Two drafts generalised it and one then counted them, and each was refuted on the same
   sentence: `[]` did not reach this route at all and is the FABRICATING case; `{length:9}` and a
   9-element array reached a different refusal again, naming `"IEA"-02`; and the probe set was never
   exhaustive to begin with. The table is the claim; there is no rule and no total.
3. **`0` / `{}` / `true` stop being told they are too long.** Same code, corrected sentence.
4. **The MESSAGE moved at the control-number slots that already refused a non-string.** GS-06 /
   GE-02, ST-02 / SE-02, AK1-02, AK2-02 and TA1-01 now refuse from this guard one step earlier, with
   a message naming the slot and the spec property. **"Nothing else changed" would be false.**
   🛑 **State that as the property and do NOT state what the old message was.** The guards standing
   at those slots are not uniform: `buildInterchange`'s GS-06 sits inside the `gsParts` array
   `requireCallerSegment` holds, so it already answered `buildInterchange: "GS"-06 must be a string`
   at base, while its own ST-02 and every `build999` and `buildTA1` slot answered the escaper's
   builder-only wording. A draft published the escaper reading as the class and pass 1 refuted it in
   one probe. Three existing suites went red on exactly this and were re-pinned:
   `test/transactions-ack-ta1-escape.test.ts`, `test/builder-segment-type.test.ts` and
   `test/builder-string-type.test.ts`. The escaper's own wording is kept pinned on elements that are
   **not** control numbers, so the move reads as a message move at one family of slots rather than as
   the escaper's guard having been replaced.

One existing test pinned the _misleading_ over-length message as a disclosed `PRE-EXISTING`; it now
pins the closure, beside the ISA-06 `pad` case that is **not** closed. Keeping the two side by side is
deliberate.

### Precedence

The test went into the guard the empty test already occupied, at the same site, so it inherits that
precedence rather than establishing a new one. `build999`'s count reconciliation runs ahead of **both**
control-number guards and still wins over both, measured at the envelope slot and at AK1-02. Do not
restate `#101`'s `X12_ACK_COUNT_MISMATCH` -> `X12_ACK_INVALID_SPEC` pairing as though it applied here:
that one turns on a _later_ body-assembly defect, and the count reconciliation is an _earlier_ guard.

### Evidence

Thirty slots, one red case each: the nine ISA-13 / IEA-02 ones plus the fourteen domain GS-06 / ST-02
ones live in the seven domain build suites and in `test/builder-control-number-type.test.ts`; TA1-01
is in `test/transactions-ack-ta1-escape.test.ts`.

**No red/green total is published here, and no list of the files that go red either.** Both were
published once and both were wrong within the same slice, the total twice. The rule this repo already
carries applies: **re-derive the red set by deleting the `typeof` block and RUNNING the suite, never
by arithmetic and never from a figure in prose.** The re-pinned assertions in
`test/builder-string-type.test.ts` and `test/builder-segment-type.test.ts` are part of that set,
which is exactly what a hand-kept list kept missing.

**The claim is the property - a control number routed through `requireControlNumber` is refused
unless it is a non-empty string - and no census of what is NOT routed is published anywhere.**

## `X12-DECIMAL-BYPASSES-THE-GUARD` (2026-08-04)

> **RELOCATED IN FULL from `CLAUDE.md` on 2026-08-11, VERBATIM, NOTHING DROPPED.** It paid for the
> `X12-NO-INTERNAL-REFS-GATE` trap, under this repo's own ratchet: relocate first, lower the entry as
> the relocation lands, never raise it. The narrative it points at stays where it was, in
> `documentation/agent-notes.md#x12-decimal-bypasses-the-guard-2026-08-04`; this file is the
> imperative set that used to sit in `CLAUDE.md` and it is unchanged below.

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

## `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` (2026-08-09)

The measurement, the sources and the reasoning behind the `CLAUDE.md` trap of the same name. Open
this before you touch `makeCallerEscaper`, `escapeRelease`, or any builder's delimiter resolution.

This is the EMIT half of `X12-BODY-DEGENERATE-RELEASE-SEPARATOR` (`#100`), which fixed the read half
and flagged the emit half as its own slice, in three roles and one mechanism. **Both of those figures
were understated, and re-measuring is what found it.**

### The census, at base `51de7b2`

Every row `warnings: []`, every row through a builder that returns `parseX12` of the bytes it just
wrote, so the builder disagreed with itself in each case.

| `?` declared as      | caller value with a trigger byte                                  | the library's OWN structural join |
| -------------------- | ----------------------------------------------------------------- | --------------------------------- |
| element separator    | CORRUPT: value truncated, remainder shifted into phantom elements | (same)                            |
| segment terminator   | CORRUPT: segment ends early, a phantom segment follows            | n/a                               |
| component separator  | scalar value round-trips                                          | **CORRUPT on every document**     |
| repetition separator | scalar value round-trips                                          | **CORRUPT on every document**     |

Verbatim, from the probes:

```text
elementSeparator "?"     buildInterchange ["CLM","PATIENT?ACCT","150.00"]
                           reads ["CLM","PATIENT","","ACCT","150.00"]
segmentTerminator "?"    buildInterchange ["CLM","PAT*ACCT","150.00"]
                           CLM-01 reads "PAT"; the transaction gains segments
                           with ids "" and "(non-spec)" that SE-01 never counted
componentSeparator "?"   build837P, canonical P spec, NO trigger byte anywhere:
                           HI  raw "HI*ABK?J20.9"     01-1 "ABK?J20.9"  01-2 undefined
                           SV1 raw "SV1*HC?99213…"    01-2 undefined
repetitionSeparator "?"  build271, canonical spec, NO trigger byte anywhere:
                           EB  raw "EB*1*IND*30?1…"   03 "30?1"  (two codes, one read)
```

### The two mechanisms, which are not one defect

1. **A caller VALUE the escape cannot protect.** `escapeRelease` protects a byte by PREFIXING `?` to
   it, in whatever role `?` was declared. When `?` is a delimiter, the protection is structure. This
   is the mechanism `#100` named, and it reaches the element separator and the segment terminator.
2. **The library's OWN structural join.** A builder joins composites with the component separator
   and repetitions with the repetition separator. When either IS `?`, the join is emitted as an
   escape sequence and the read side (correctly, for mechanism 1's sake) swallows it. **No caller
   value is involved.** This is the mechanism nobody had measured, because `#100` probed only the
   generic `buildInterchange` segment-spec route and said so.

🩺 Mechanism 2 is the sharper one. `SV1-01-2` is the procedure code and `HI-01-2` is the diagnosis
code; a claim is adjudicated on both. Neither the caller (who reads the builder's own return value)
nor the receiver had any signal.

**They are not one defect and must not be written as one.** Mechanism 1 has an offending value you
can point at; mechanism 2 has none, which is exactly why the value-level mitigation this arc already
refuted could never have worked. Same shape as `#101`'s INVENT / LOSE pair.

### The decision: refuse the SET, at emit only

Four options were on the table.

|                                     | why not                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| warn                                | a warning has to travel the READ registry a builder returns - the inbound-grading widening `#83` was refuted for         |
| guard the values that trip          | cannot reach mechanism 2 at all; leaves a caller an instruction they cannot act on                                       |
| make the read side literal per role | breaks values this library ITSELF emitted through `0.0.15`; `#100` measured that and it is why the read side is per role |
| refuse the set on emit              | taken                                                                                                                    |

**⚖️ REFUSE, not warn, on CONSISTENCY rather than spec.** 005010 does not transmit a release
character at all, so it settles none of this - the same honest position `#96`, `#100` and `#101` each
had to take. What tips it is in-package consistency: emit is the strict half of this library's
Postel's Law by standing convention, and `requireControlNumber` made exactly this call one slice
earlier.

**No code is minted.** Each builder refuses through its own `refuseSpec`, with the code it already
had (`X12_BUILD_INVALID_SPEC`, `X12_ACK_INVALID_SPEC`, `X12_837_BUILD_INVALID_SPEC`, …). Adding one
because the CAUSE differs is what `#85` refused and what moves cases off predicates consumers wrote.

### Where the guard sits, and what that costs

Inside `makeCallerEscaper` (`src/builder/caller-string.ts`), which every builder calls ONCE when it
resolves its delimiters. `test/builder-string-type.test.ts` already requires every builder to build
its `esc` there, so the coverage is structural rather than a hand-list - **but a source gate
establishes nothing about behaviour** (this repo's own recorded finding), so every one of the ten
builders has a behavioural case: `buildInterchange`, `build999` and `buildTA1` in
`test/builder-degenerate-release-delimiter.test.ts`, and the seven domain builders beside the valid
specs they mutate in their own suites. Deleting the one call reds 16 tests across 8 files.

**Precedence, measured base vs head.** Every guard a builder runs earlier keeps precedence -
`build835`'s balance equations, `build837`'s spine, `build999`'s AK9 count invariants and
`buildTA1`'s `enforceAcceptIsClean` all still report first. Everything a builder checks LATER yields
to this refusal. **A MESSAGE moves, never a code**, because each builder's `refuseSpec` is the same
one both guards already used.

**🛑 NEVER COUNT WHAT MOVED. A draft of this section said "one report moved" and the gate measured it
false in one pass.** `requireControlNumber` runs after the escaper in EVERY builder that has one, so
on a degenerate set both mechanisms that arc shipped - `#101`'s empty control number and `#102`'s
non-string one - are preempted at every one of their slots, in builders nobody had probed. That is
this item's own standing trap arriving one slice later: _the filed line has understated the class
every time_, and `build-835.ts` already carries the identical warning from `#99`. **The remedy is the
CLAIM: state which guards keep precedence and that everything later yields, which is a property of
the ordering. A total of the sites is a census and drifts with the next builder.**

### 🛑 It refuses specs that BUILT, and one of them round-tripped

`componentSeparator: "?"` with a scalar value carrying a literal `?` built at `0.0.15` and read back
correctly through this library's own parser. It is refused now.

**That round trip was never the bar.** ISA-11 and ISA-16 transmit the declared set, so a conformant
receiver splits repetitions and components on `?` - and the `??` this library wrote for a literal `?`
reads to that receiver as two empty components. Checking a claim against this repo's own
implementation is not a check; it only proves the two halves agree, which is how the wrong answer
survived. The same is true of the repetition role, where scalar values round-tripped for the simpler
reason that nothing ever split.

### 🛑 The guard is an EQUALITY TEST, and the bound must be stated as one

`delimiters[role] === RELEASE_CHAR`. That is a property of the VALUE A CALLER DECLARES and **not** a
guarantee about what this library can compose - two drafts said the latter (_"no NEW document of that
shape is composed here"_, _"what you cannot do is have this library compose a document against one"_)
and the gate falsified both with one line. **⚠️ Everything in the fence below is BASE `a21f8ea`
behaviour and no longer reproduces - see the superseding note under it:**

```text
buildInterchange({ segmentTerminator: "??" })  -> BUILDS
  ix.delimiters  { element:"*", repetition:"^", component:":", segment:"?" }   warnings: []
  a ["HI","ABK:J45.50"] segment spec comes back as, in order:
    id "ST"          ["ST","837","0001"]
    id ""            [""]
    id "HI"          ["HI","ABK"]          <- the qualifier alone
    id "(non-spec)"  [":J45.50"]           <- the ICD-10 code, where no reader looks
    id ""            [""]
    id "SE"          ["SE","3","0001"]
build837P({ envelope: { segmentTerminator: "??" } }) -> BUILDS; SE-01 declares 22 against 43
  framed segments, 21 of them phantoms, warnings: []
```

Nothing in any builder checked that a delimiter was a single byte, and the ISA line wrote the
declared string straight in, so the transmitted set was degenerate by another route. **Identical at
base, so the BEHAVIOUR was `PRE-EXISTING` and the guard was NOT grown to reach it** - growing a guard
to make an overclaim true is the runaway ADR 0016 exists to stop. What was wrong was the sentence,
and the sentence is what changed here.

> **⚠️ SUPERSEDED, and the transcript above is BASE behaviour, not head.** The wider family - **no
> builder validated the SHAPE of a delimiter at all**, and it was not `?`-specific - was filed and
> then closed by `X12-EMIT-DELIMITER-SHAPE-UNCHECKED`
> (`documentation/agent-notes.md#x12-emit-delimiter-shape-unchecked-2026-08-09`). `segmentTerminator: "??"` is refused now,
> by the LENGTH arm of that separate guard, and the equality test above is still byte-for-byte
> unchanged - which is the whole point of the two being separate guards rather than one grown one.
> **The census that slice ran found THREE mechanisms where this note names one**, and one of them
> (a non-string delimiter, which the join coerces and the escape does not) is unreachable by any
> length rule. Read the transcript in this section as the measurement it was: base `a21f8ea`.

### 🛑 What is deliberately NOT changed

- **The read side.** `parseX12` still accepts every degenerate set, `decodeSegment` still frames a
  degenerate body segment, and `splitWithRelease` is still per role. Documents emitted before this
  guard exist; Postel's Law puts them on the lenient half. The read-side pins in
  `test/parser-segment-degenerate-release-separator.test.ts` are asserted straight from BYTES now,
  not through a builder, because routing them through one would assert the refusal instead of the
  read.
- **`serializeX12`.** It re-emits a set a SENDER declared, out of a model that was parsed, so
  refusing there would refuse round-tripping an inbound document. Measured: a degenerate interchange
  still serializes byte-identically.
- **`escapeRelease` itself.** It is a pure text utility with no builder context, and its behaviour on
  a degenerate set is what the read side depends on. The refusal is at the builder, not in it.

### What was corrected as a CLAIM rather than guarded

The claim swept by wording rather than by file, per `#102`'s finding. Carriers that asserted the
falsified form - _"`buildInterchange({ componentSeparator: "?" })` … today"_, _"do NOT declare `?` as
the ELEMENT separator"_, _"all THREE roles"_: `CLAUDE.md`, `KNOWN-LIMITATIONS.md`,
`docs-content/spec-notes-envelope.md` (**which SHIPS**), `src/parser/release.ts`'s `splitWithRelease`
JSDoc (**source only, and the REASON matters: `src/index.ts` re-exports just `escapeRelease`,
`RELEASE_CHAR` and `unescapeRelease` from this module, so `splitWithRelease` never reaches the public
surface. It is NOT because of `@internal` - nothing sets `stripInternal`, and `RELEASE_CHAR`'s
`@internal` docblock ships verbatim. Two drafts of this parenthesis were wrong: the first said it
DOES ship, the second blamed `@internal`. Check the re-export list, never the tag.**
`escapeRelease`'s JSDoc in the same file DOES ship, so the distinction is real and worth keeping),
`documentation/agent-notes.md#x12-body-degenerate-release-separator-2026-08-09`,
`test/parser-segment-degenerate-release-separator.test.ts`, the pending changeset
`.changeset/olive-doors-repeat.md` and its `[Unreleased]` `CHANGELOG.md` entry. **The two pending
ones were corrected by DELETION, never reworded**, per `documentation/conventions.md` rule 2.

### What this does NOT claim

- **No census of what a degenerate set can do to a document is published.** The table above is
  INSTANCES. Two drafts in `#100` published a trigger byte and were falsified by one more; the form
  that survives is the two mechanisms, and finding a third route through either is expected and is
  not a new finding.
- **Nothing is claimed about what X12 says.** 005010 does not transmit a release character. There is
  no clause behind any of this, on either side.


---

### The `CLAUDE.md` trap section, RELOCATED IN FULL, VERBATIM, NOTHING DROPPED (2026-08-09)

Moved out of `x12/CLAUDE.md` by `X12-ST03-READ-NOT-RELEASE-AWARE` to pay for that slice's own trap,
under this repo's standing rule: relocate BEFORE you write a new trap, never delete one, and never
raise the entry. Nothing here was measured false and nothing is corrected. **The words "below" and
"above" inside it refer to `CLAUDE.md`'s trap ORDERING at the time of the move, not to this file** -
"the SEPARATE shape guard below" is `X12-EMIT-DELIMITER-SHAPE-UNCHECKED`, which still sits inline
there.

#### 🩺 `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` (2026-08-09) · `agent-notes/x12-emit-degenerate-release-delimiter.md`

- **🩺 A DELIMITER SET WITH `?` IN ANY ROLE IS REFUSED ON EMIT, EVERY BUILDER, INSIDE
  `makeCallerEscaper`. FOUR ROLES, NOT THREE - THE SEGMENT TERMINATOR DOES IT TOO** (a released byte
  ends the segment early; a phantom segment follows, uncounted by SE-01).
- **🩺 TWO MECHANISMS, AND THE SECOND HAS NO CALLER VALUE AT ALL: THE LIBRARY'S OWN JOIN.** `esc`
  PREFIXES `?`, so the protection is emitted as structure; and a composite/repetition is JOINED with
  the separator declared, so on `?` the join is emitted as an escape. `build837P` on
  `componentSeparator:"?"` fused **`SV1-01-2` (procedure) and `HI-01-2` (diagnosis) ON EVERY
  DOCUMENT, no trigger byte, `warnings: []`.** **NEVER WRITE THEM AS ONE DEFECT** - a value-level
  guard cannot reach the second, which is why _"keep `?` out of your values"_ protected nobody.
- **⚖️ REFUSE NOT WARN, THE SET NOT THE VALUES, ON CONSISTENCY NOT SPEC; NO CODE MINTED** - each
  builder's own `refuseSpec`. **IT REFUSES SPECS THAT BUILT AT `0.0.15`, ONE OF WHICH ROUND-TRIPPED
  THROUGH OUR OWN PARSER - THAT WAS NEVER THE BAR** (ISA-11/16 transmit the set, so a conformant
  receiver splits on it; checking a claim against our own implementation is not a check).
- **🛑 EVERY EARLIER GUARD KEEPS PRECEDENCE (835 balance, 837 spine, 999 AK9, TA1
  `enforceAcceptIsClean`); EVERYTHING LATER YIELDS, AND `requireControlNumber` IS LATER IN EVERY
  BUILDER, SO BOTH `#101` AND `#102` ARE PREEMPTED AT EVERY SLOT ON A DEGENERATE SET. A MESSAGE
  MOVES, NEVER A CODE. 🛑 NEVER COUNT WHAT MOVED - a draft said "one report" and was measured false.**
- **🛑 IT IS AN EQUALITY TEST ON THE DECLARED VALUE, NOT A GUARANTEE ABOUT DOCUMENTS THIS LIBRARY CAN
  COMPOSE. STATE THE BOUND AS A PROPERTY OF THE SET, NEVER OF THE DOCUMENT.** `"??"` is refused by
  the SEPARATE shape guard below, never by growing this one.
- **🛑 THE READ SIDE AND `serializeX12` ARE UNTOUCHED, DELIBERATELY. PIN A READ-SIDE CASE FROM BYTES,
  NEVER THROUGH A BUILDER** - it asserts the refusal instead of the read. **PUBLISH NO CENSUS OF WHAT
  A DEGENERATE SET DOES: the two mechanisms are the claim, and a third route through either is
  expected.** The source gate proves the chokepoint, NOT the behaviour: all ten builders have their
  own case, and deleting the one call reds 16 tests across 8 files.

## `X12-EMIT-DELIMITER-SHAPE-UNCHECKED` (2026-08-09)

The wider delimiter-validation family, filed from `X12-EMIT-DEGENERATE-RELEASE-DELIMITER`'s pass 2
and closed here. Item `X12-837-RESIDUALS`. Base `a21f8ea`.

The filed line said: *no builder validates a delimiter's shape or length at all, and it is not
`?`-specific - `segmentTerminator: "~~"` desyncs SE-01 with `warnings: []`.* That is one mechanism.
The census found three.

### The census, and it is what separated the mechanisms

10 builders x 4 delimiter roles x 8 shapes, plus a valid control per builder, run against base
`a21f8ea` and again against head. Outcome classes: **REFUSED** (a typed `*BuildError`),
**PARSE-FATAL** (an `X12ParseError` / `X12_INVALID_DELIMITERS` escaping out of the `build*` call from
the builder's own trailing `parseX12`), **BUILT-WARNED**, **BUILT-SILENT** (`warnings: []`).

At base, for the nine builders that end in `parseX12`:

| role | multi-char | empty | whitespace | duplicate | control `\n` | number `1` | array `[]` | `null` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| element | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | BUILT-WARNED | PARSE-FATAL | default |
| repetition | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | **BUILT-SILENT** | PARSE-FATAL | default |
| component | PARSE-FATAL | BUILT-WARNED | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | **BUILT-SILENT** | BUILT-WARNED | default |
| segment | **BUILT-SILENT** | BUILT-WARNED | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | BUILT-WARNED | BUILT-WARNED | default |

🛑 **EVERY CELL IS THE SHAPE THAT WAS RUN, NEVER THE CLASS.** `multi-char` here is the role's default
DOUBLED. A different two-character value in the same cell lands elsewhere: `componentSeparator: ":~"`
is BUILT-SILENT and `":;"` is BUILT-WARNED, where `"::"` is PARSE-FATAL. **Do not read a column as a
verdict on a shape family.**

`buildTA1` is its own row and its own finding: **BUILT on all 32 cells**, with no warnings channel at
all. `null` and `undefined` are the `?? default` and are NOT a defect - they are the control that
stops the type arm from being written as "not a string".

🛑 **THE GRID IS A MEASUREMENT, NOT A CLOSED SET OF SHAPES.** The gate reached a ninth shape this
census had not enumerated - a boxed `new String("|")`, which built silently at base in most cells and
is refused at head by the type arm. **Finding one more shape is expected and is not a new finding**;
publish no total of what built silently, and never read the eight columns as exhaustive.

**REFUSED appears nowhere at base. No builder validated a delimiter's shape in any role.** At head
every non-`null` cell is REFUSED, with each builder's own error class and its own existing code.

### Three mechanisms, and they must never be written as one

**1. LENGTH.** `build837P` with `segmentTerminator: "~~"` built with `warnings: []` and put **31
segment rows on a transaction whose SE-01 declares 16** - every other row a phantom with `id: ""`.

🛑 **NO ASYMMETRY ABOUT WHICH ROLES WERE SILENT IS PUBLISHED, IN ANY QUALIFIED FORM, AND THAT IS THE
DELIVERABLE OF TWO GATE ROUNDS.** Draft one said *"silent at that role and nowhere else"*; the gate
falsified it at `buildTA1`, which ends in no `parseX12`, where `{ elementSeparator: "||" }` returned
`TA1||000000001||260601||1200||A||000` - inside an ISA that can declare only `|`, that reads back
with **TA1-01 EMPTY and `ackCode: "R"`, parse warnings 0: an Accept emitted as a Reject**,
`X12-TA1-EMIT-NOT-RELEASE-AWARE`'s safety class reached by LENGTH. Draft two narrowed it to *"alone
among the nine builders that end in `parseX12`"* **and the gate falsified that too, in one probe, at
a parsing builder:**

```text
buildInterchange { componentSeparator: ":~" }   warnings: []
  ISA-16 reads ":" and the terminator "~", so detectDelimiters sees a well-formed
  header; the builder's OWN appended terminator becomes an uncounted empty segment.
  No element value is escaped against ":".
  🛑 A draft added "or ~, and === never matched" and the gate measured it FALSE:
  segmentTerminator still defaults to "~", so escapeRelease DOES escape "~" here.
  Only ":" is unprotected. Say only what was run.
buildInterchange { componentSeparator: ":;" }   X12_UNEXPECTED_SEGMENT, X12_MISSING_IEA
buildInterchange { componentSeparator: "::" }   FATAL X12_INVALID_DELIMITERS
```

The structural story ("the terminator is appended after the fixed-width ISA, so the other roles shift
a position and fatal") is **wrong**, and the census row `component | multi-char | PARSE-FATAL` is true
only of the doubled shape the census actually ran. **Publish the cells that were run and nothing
about the ones that were not.** A corrected claim is a NEW claim and inherits nothing
(`conventions.md` §3); this one was refuted twice, so the third remedy deletes the paragraph rather
than qualifying it again.

**2. TYPE, where the JOIN coerces and the ESCAPE does not.** `Array.prototype.join` coerces a
non-string delimiter to its digits and the document frames on that byte; `escapeRelease` compares
delimiters with `===`, and a number never equals a character, so **no caller value is escaped against
it**. Measured, `warnings: []` on both rows:

```text
build837P { componentSeparator: 1 }
  SV1*HC199213*150.00*UN*1***1   SV1-01-2 reads "992", not the procedure code 99213
  CLM*CLAIM0001*150.00***111B11*Y*A*Y*Y   CLM-05's place-of-service composite destroyed
build271  { repetitionSeparator: 1 }
  EB*1**3011   EB-03's two service type codes stop reading back as two
```

🩺 No unusual caller value is involved - `99213`, `11`, `30` and `1` are ordinary - and **a length
rule cannot reach this at all**, because `String(1)` is one visible character. Two defects, two arms.

**3. `buildTA1` had NO net, not even the accidental one.** It is the only builder that does not end
in `parseX12`; it returns a `Ta1Segment`. So `elementSeparator: ""` **returned**
`TA10000000012606011200A000` - the reassociation key (data element I12), the date, the time, the
disposition and the note code fused into one undelimited blob - and `elementSeparator: "\n"` returned
a TA1 carrying raw newlines. It reaches the guard only because it takes its `esc` from the same
chokepoint every other builder does.

### What shipped, and why it is a SECOND guard rather than a bigger first one

`requireWellShapedDelimiters` in `src/builder/caller-string.ts`, called from `makeCallerEscaper`
immediately after `requireEscapableDelimiters`. Per role: must be a **string**, of **exactly one**
character, and that character must satisfy **`isVisibleDelimiterChar`**; then the four must be
**mutually distinct**.

**The rule is not invented here - it is the READ side's, imported.** `detectDelimiters` already
decides what a delimiter is for this package, and decides it as a Tier-3 fatal: one character at
each of four fixed ISA positions, each visible, the four distinct, else `X12_INVALID_DELIMITERS`
thrown even
in lenient mode. That predicate was a closure inside `detectDelimiters`; it is now a module-level
`isVisibleDelimiterChar` with two callers and **the read side's behaviour is unchanged** - the
expression is the same. Hoisting it is what stops the emit refusal and the read fatal from drifting
into two different ideas of what a delimiter is, and it is the only reason the emit guard may
describe itself in terms of what this library's own reader accepts. **A builder composing a document
its own parser refuses to read was disagreeing with itself**, and that is the whole argument.

**No normalisation rule is invented and none is needed.** Nothing is trimmed, coerced, substituted or
padded. This matters because the standing limit on this item is that no source states a normalisation
rule - whitespace-only control numbers still pad, unfixed by design, for exactly that reason. A
refusal needs no such source.

**The one-character requirement is structural, not conventional.** The ISA is fixed-width per ASC
X12 .5: ISA-11, ISA-16 and the terminator each occupy one fixed position, and `Delimiters` records
exactly one character per role. A multi-character value cannot be transmitted as a delimiter at all;
the only question was whether the caller was told.

🛑 **IT IS A UTF-16 CODE-UNIT RULE, NOT A BYTE RULE, AND THE DIFFERENCE IS AN UNCLOSED RESIDUAL.**
`String.prototype.length` here and `charAt` on read both count code units, so a character that is one
code unit but several BYTES on the wire passes and still displaces every ISA position after it.
Measured at head, `warnings: []`: `buildInterchange({ componentSeparator: "\u00a7" })` builds, and a
byte-oriented receiver reads ISA-16 as `0xC2` and the terminator as `0xA7`, framing the whole
interchange as one segment. `"\u2019"` - the smart quote a companion-guide PDF hands you instead of
`'` - does the same. **DISCLOSED, NOT GUARDED, and do not grow this guard to reach it:** an
encoding-width rule is a decision nobody here has made, and the read side counts code units too, so
moving one side alone re-opens the drift this guard exists to close. **Never restate the bound in
BYTES** - the first draft of every carrier did, and every one was measured false the same way.

**⚖️ Refuse rather than warn**, following `X12-EMPTY-CONTROL-NUMBER-FABRICATED` and
`X12-EMIT-DEGENERATE-RELEASE-DELIMITER`: a warning would have to travel the READ registry a builder
returns, which `#83` was refuted for. **No code is minted** - each builder refuses with its own.

**It runs AFTER the `?` check, deliberately.** A set with `?` in two roles is both degenerate AND
non-distinct. Running the release-character check first keeps the message that names the sharper
defect and means **nothing `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` pinned moves**; its equality test
is byte-for-byte unchanged. Growing that guard to reach the length family would have been the
"fix outgrows the thing it fixes" runaway ADR 0016 exists to stop.

**No refusal echoes the declared value.** The role is named and the defect described;
`describeCallerValue` supplies type alone on the non-string arm, exactly as every other caller guard
in this package does. The one number a message states is the declared value's LENGTH, which is
bounded, cannot carry an identifier, and is what makes "exactly one character" actionable.

### 🛑 What changes for a caller, in BOTH directions

**The error class moves.** At base, most mis-shaped sets failed as `X12ParseError` /
`X12_INVALID_DELIMITERS` escaping out of a `build*` call - the wrong class for a spec defect, and it
carried a 64-byte `snippet` of the interchange just composed (measured:
`"ISA**00**          **00**          **ZZ**MEDICARE       **ZZ**S…"`). At head those cells refuse
earlier with the builder's own typed error. **A consumer catching `X12ParseError` around a `build*`
call STOPS catching; one catching that builder's own error STARTS.** No new code. Both directions are
pinned, because `#83`'s lesson is that a moved predicate is stated in both or not at all.

**🛑 It refuses shapes that built with `warnings: []`, and NO COUNT OF THEM IS PUBLISHED.** A draft
said "two"; the gate found more as soon as it tried a shape the census had not enumerated (a boxed
`new String("|")`, which `typeof` reports as an object and which head refuses). That is this
package's standing rule about censuses of what bypasses a chokepoint: finding one more is expected
and is not a new finding. The one worth naming is `segmentTerminator: "~\r\n"`, a caller asking for
line-broken output. Measured at base: it built
clean **and the CRLF was never on the wire.** `parseX12` tolerates a run of CR/LF between segments,
so the model recorded `segment: "~"` and `serializeX12` re-emitted with no line breaks. The caller
declared one thing and the library silently did another. Refusing is the same call the previous slice
made about specs that built at `0.0.15`: what this library happens to read back was never the bar.
**Reading a file written that way is unaffected** - only declaring it on emit is.

### 🛑 What is deliberately NOT changed

- **The read side.** `parseX12` still accepts everything it accepted, `detectDelimiters` behaves
  identically, and a document already written with a doubled terminator or CR/LF between segments
  still reads. Postel's Law puts it on the lenient half, and documents this library emitted before
  this guard exist. Pinned from BYTES, never through a builder - routing a read-side pin through a
  builder now asserts the refusal instead of the read.
- **`serializeX12`.** It re-emits a set a SENDER declared, out of a model that was parsed, so
  refusing there would refuse round-tripping an inbound document.
- **A delimiter that is a plain letter or digit.** `componentSeparator: "S"` is one visible character
  and distinct, and `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` already pinned it as a case this
  library must handle. ASC X12 constrains a delimiter by POSITION, not by character class, and
  nothing here decides otherwise. A letter that also appears in the data is a **collision**, not a
  shape defect, and it is not this slice's; `elementSeparator: "1"` warned at base and warns now.
- **The seven `PRE-EXISTING` in the umbrella's `repos/x12.md`**, per ADR 0016 rule 2.

### Still open, each its own slice

- `parseTA1` does not unescape; `TA1-02`/`TA1-03` drop silently on `""`.
- **Encoding width.** The rule above counts UTF-16 code units, so a multi-BYTE single-code-unit
  delimiter still builds. Disclosed above; not guarded here, and not guardable on one side alone.
- Whitespace-only control numbers still pad, unfixed BY DESIGN - a trim is a normalisation rule and
  no source states one.

### The claim sweep

By WORDING across the whole tree, not by file, per the `#102` lesson. The falsified claim was *"no
builder checks that a delimiter is one byte / a length rule is a different slice"*, and it had **nine
carriers in eight files**: `src/builder/caller-string.ts`, `src/parser/release.ts`,
`KNOWN-LIMITATIONS.md`, `docs-content/spec-notes-envelope.md` (**ships**),
`test/builder-degenerate-release-delimiter.test.ts` (its module doc AND a test that asserted the
false behaviour), `documentation/agent-notes.md#x12-emit-degenerate-release-delimiter-2026-08-09`, `CLAUDE.md`,
and **two pending carriers**: `.changeset/lucky-moons-refuse.md` and its `[Unreleased]` `CHANGELOG.md`
entry. **Both pending carriers were corrected BY DELETION, never reworded** - a changeset freezes
permanently into `CHANGELOG.md`. Re-grepped clean.

**The umbrella's `documentation/repos/x12/emit-degenerate-release-delimiter.md` carries the same
claim and was NOT edited here** - this slice is scoped to the submodule. It is owed a correction.

---

### The `CLAUDE.md` trap text, RELOCATED HERE VERBATIM 2026-08-09

Moved out of `CLAUDE.md` in full to pay for the `X12-ENVELOPE-VALUE-POINTERS` trap, under this
repo's own ratchet (relocate first, lower the entry as it lands, never raise). **Nothing is
dropped and nothing is reworded** - a revert re-publishes claims, so the wording is preserved
exactly as it stood at `61b5981`.

- **🩺 A DELIMITER MUST BE A STRING OF EXACTLY ONE VISIBLE CHARACTER, THE FOUR DISTINCT; REFUSED ON
  EMIT BY EVERY BUILDER IN `requireWellShapedDelimiters`. THE RULE IS `detectDelimiters`' OWN,
  IMPORTED NOT RESTATED (`isVisibleDelimiterChar`)** - a builder composing what its own parser FATALS
  on disagreed with itself. **NO NORMALISATION** (nothing trimmed or coerced), so no source is owed.
  **THE READ SIDE DID NOT MOVE.**
- **🩺 THREE MECHANISMS, FILED AS ONE. NEVER WRITE THEM AS ONE.** **LENGTH:** `"~~"` -> 31 rows
  against `SE-01` 16; `componentSeparator: ":~"` reads back through a well-formed ISA. Both
  `warnings: []`. **🛑 PUBLISH NO ASYMMETRY ABOUT WHICH ROLES WERE SILENT, IN ANY QUALIFIED FORM** -
  three drafts did and the gate falsified every one. **STATE THE CELLS THAT WERE RUN.**
  **TYPE: the JOIN coerces, the ESCAPE does not**, so `componentSeparator: 1` framed
  on `"1"` unprotected - `SV1-01-2` read `992`, not `99213`; **A LENGTH RULE CANNOT REACH IT.**
  **`buildTA1` HAD NO NET AT ALL, EVERY ROLE AND SHAPE** (no trailing `parseX12`): `""` RETURNED
  `TA10000000012606011200A000`, `"||"` a TA1 reading back **TA1-01 EMPTY, `ackCode` `R`: AN ACCEPT
  AS A REJECT.** `warnings: []` throughout.
- **🛑 A UTF-16 CODE-UNIT RULE, NOT A BYTE RULE - a one-code-unit MULTI-BYTE separator STILL BUILDS**
  (a byte receiver then reads ISA-16 as `0xC2`). **DISCLOSED, NOT GUARDED; NEVER RESTATE THE BOUND IN
  BYTES** - every first draft did, all false - and **DO NOT MOVE ONE SIDE ALONE**, `charAt` counts
  code units too. **PUBLISH NO COUNT OF WHAT BUILT SILENTLY:** a draft said "two shapes" and a boxed
  `new String("|")` outside the census made it more.
- **🛑 THE ERROR CLASS MOVES, BOTH WAYS; NO CODE MINTED.** Base threw
  `X12ParseError`/`X12_INVALID_DELIMITERS` OUT OF A `build*` CALL; head uses the builder's own.
  **CATCHING THE PARSE CLASS STOPS WORKING, THE BUILD CLASS STARTS - BOTH DIRECTIONS (`#83`).** A
  MESSAGE moves too (`requireControlNumber` is LATER, so `#101`/`#102` yield); **NEVER COUNT SITES.**
- **🛑 IT REFUSES SPECS THAT BUILT WITH `warnings: []`; THE PLAUSIBLE ONE IS
  `segmentTerminator: "~\r\n"`** - which never put a line break on the wire either (CR/LF between
  segments is absorbed on READ, so the model recorded `~`). **READING one is UNAFFECTED.**
- **⚖️ RUNS AFTER THE `?` GUARD SO NOTHING `#106` PINNED MOVES** (a `?` in two roles is degenerate AND
  non-distinct; the sharper message wins). **A LETTER OR DIGIT IS STILL ADMISSIBLE**
  (`componentSeparator: "S"`); one colliding with DATA is a different family, still open.
  **NO REFUSAL ECHOES THE DECLARED VALUE.**

## `X12-EMPTY-CONTROL-NUMBER-FABRICATED` (2026-08-09)

The narrative for the `CLAUDE.md` trap of the same name. Base commit `28b417f` (`0.0.15`).

Provenance: this repo's own source tree at `28b417f` and at the head of this slice, measured (every
byte string, every warning array and every base/head reading below is a run, not a recollection).
**No primary X12 record was read for this slice and it grounds nothing new.** The one spec-shaped
statement it repeats, that ISA-13 is nine characters wide "per ASC X12 .5", is a **pre-existing
in-package assertion** carried by `padControl`, by `build-interchange.ts`'s own ISA comment and by
`test/_helpers/envelope.ts`'s `ISA_WIDTHS`; this slice inherits it and does not verify it. The
refuse-versus-warn call rests on in-package CONSISTENCY, stated as such below, and **not** on any
005010 clause.

### Gate record, including the one UNGRADED commit

Three conformance-refuter passes, the ADR 0016 cap: **REFUTED, REFUTED, NOT REFUTED.**
**No pass found a defect in the CODE.** Every one of the twenty-plus findings was a claim defect,
which is this repo's recorded pattern for a parser slice and is why the prose here is longer than
the fix.

- **Pass 1** (major + five minors): "nothing a consumer branches on changes" was false, because a
  defect detected later in a builder now reports the control-number refusal instead. Plus a
  one-builder measurement published as a class, a fabricated `TA1*   *…`, an `undefined` route that
  does not behave as claimed, an over-sold drift pin, and a missing `Provenance:` field.
- **Pass 2** (major + minor): the finding-2 remedy reached seven surfaces and missed fourteen, and
  half-corrected the public troubleshooting page into a contradiction.
- **Pass 3** (four minors, none blocker or major): converged.

**🛑 One commit after pass 3 is UNGRADED and is disclosed here because it exists.** It is
**deletion only** apart from this section: it removes the "so the required element is LOST" lead-in
(false of GS-06 and ST-02, and the tripwire below it already said so) and the seven `SE*NN` figures
that had been hand-copied to fifteen sites. Nothing was added, no guard moved, no test changed, and
the working state therefore asserts strictly less than the state pass 3 graded, which is ADR 0027's
reason that a deletion-only commit cannot introduce what nobody checked.

### The filed line, and what re-measuring it found

`operations/BACKLOG.md`'s `X12-837-RESIDUALS` carried:

> **An EMPTY control number is not refused:** `padControl("", 9)` zero-pads, so an empty
> `interchangeControlNumber` emits ISA-13/IEA-02 as **`000000000` - a FABRICATED control number,
> silently, `warnings: []`.**

That reproduced exactly. It is also **one slot of a class**, and the class differs by slot, which is
the reason this slice is a census and not a site.

### The census, measured at `28b417f`

Through `buildInterchange`, one variable at a time on an otherwise clean spec:

```text
interchangeControlNumber: ""
  ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*
  000000000*0*P*:~ … ~IEA*1*000000000~                                        warnings: []

groupControlNumber: ""
  GS*HC*SENDER*RECEIVER*20250101*1200**X*005010X222A2~ … ~GE*1*~               warnings: []

transactionSetControlNumber: ""
  ST*837**005010X222A2~ … ~SE*3*~                                             warnings: []
```

Two mechanisms, not one:

- **ISA-13 / IEA-02 FABRICATE.** `padControl` zero-pads to nine characters and nothing stood in front
  of it, so `""` became a nine-digit identifier the caller never supplied. The interchange is frozen,
  well-formed and reconciles.
- **GS-06 / GE-02 and ST-02 / SE-02 LOSE the element.** They reach the wire through `esc`, and
  `escapeRelease` early-returns on `""`.

**🛑 The second mechanism's BYTES differ by builder family, and a draft of this file published one
measurement as the class.** `buildInterchange` and `build999` join without trimming, so the element
goes out empty on both ends of the pair. The seven domain builders share a `seg` that drops a
trailing empty element, so the trailer loses it outright. Measured at the same commit through
`build834`:

```text
groupControlNumber: ""            GS*BE*EMPLOYERCO*MEDPAY*20260601*1200**X*005010X220A1 | GE*1
transactionSetControlNumber: ""   ST*834**005010X220A1 | SE*21
```

Both silent, `warnings: []`. **Say `warnings: []`, never "each pair reconciled against itself"** -
in the domain builders there is no second element to reconcile with. The property that holds across
both families is the silence: no diagnostic on any channel separated an absent control number from a
supplied one.

The fabrication is the worse of the two: an absent identifier fails loudly at the receiver; an
invented one reconciles against the wrong thing.

`#100` had already recorded the sibling half of this while picking its own slice
(`documentation/agent-notes.md#x12-body-degenerate-release-separator-2026-08-09`, "What was re-measured").
This slice agrees with that measurement and extends it to the acknowledgment builders.

#### The ack echoes carry the same class

`build999` and `buildTA1` do not only assemble an envelope; they carry the control numbers of the
document being acknowledged, which is the whole reason a sender can match an ack to what they sent.
Measured at the same commit:

```text
build999, functionalGroup.groupControlNumber: ""         AK1*HC**005010X222A2~
build999, transactionResponses[0].transactionSetControlNumber: ""   AK2*837*~
buildTA1, interchangeControlNumber: ""                   TA1**260601*1200*A*000
```

`buildTA1`'s was already disclosed in `KNOWN-LIMITATIONS.md` as "Unchanged and tracked as its own
item" - this is that item, so leaving it open would have left the disclosure pointing at nothing.
`AK1-02` and `AK2-02` were not disclosed anywhere.

### The decision: REFUSE, not warn

Both were on the table and the item did not settle it. Refusal wins on four grounds, in the order
they were weighed:

1. **The in-package precedent for an empty required element is uniform and it is refusal.**
   `build835` refuses `patientControlNumber === ""` (CLP-01), `build837` refuses `claimId === ""`
   (CLM-01), `build834` refuses `maintenanceTypeCode === ""`, `build278` refuses
   `requestCategoryCode === ""` and `build277` refuses `categoryCode === ""`. Each throws that
   builder's own typed, code-tagged error. A control number is the same kind of value as CLP-01, one
   level up the envelope. This is the same CONSISTENCY tiebreak `#96` used, and it is stated as a
   fact about this tree rather than as a clause anyone here has read: **005010 does not settle
   refuse-versus-warn and nothing in this slice claims it does.**
2. **Emit is the strict half of this library by standing convention.** Lenient on parse, spec-clean
   on emit. Zero-padding an absent value is not leniency, it is a silent correction, and `CLAUDE.md`
   says nothing is ever silently corrected.
3. **A warning would have to travel the READ channel.** A builder returns `parseX12` of the bytes it
   just wrote, so its `warnings` array is the read side's registry. Putting an emit-side caller
   mistake there would mint a code on the channel consumers use to grade **inbound** documents, and a
   widening that moves a case onto a new code blinds every predicate written against the old one -
   the rule `#83` was refuted for. A throw has no predicate to break.
4. **A warned document still goes out.** The failure being closed is a caller who did not notice a
   frozen, successful-looking interchange. A warning on that same interchange is what they did not
   notice the first time.

**What it costs, stated rather than argued away:** a caller relying on `""` to mean "pad me a control
number" is broken by this, deliberately. What they were shipping was `000000000`, a real value a
trading partner may already have assigned to something else.

**`KNOWN-LIMITATIONS.md` committed to neither disposition before this**, which was checked: its TA1
entry recorded the behaviour and named it open, and no page promised the zero-pad as a feature.

### The shape of the fix

One helper, `src/builder/caller-control-number.ts`, on the pattern `caller-string.ts` /
`caller-array.ts` / `caller-segment.ts` already set: it takes the calling module's own `refuse`
callback, so each builder keeps its distinct error class and code and **no new code is minted**.

Thirty call sites: three envelope pairs in each of the nine builders that assemble an ISA, plus
`AK1-02`, `AK2-02` and `TA1-01`. Each has its own red negative control - deleting any single guard
call reds at least one case in that builder's suite, verified by deleting them one at a time and
running the suite between each.

#### Three bounds, all deliberate, all disclosed

- **Byte-strict `=== ""`. No trim.** `padControl(" ", 9)` still answers `"00000000 "`. `buildTA1`
  imports no `pad` at all, so it emits whatever whitespace it was handed, VERBATIM - never write it
  as padded. Trimming is a **normalisation rule** and no source consulted for this
  package states one; the five in-package guards this mirrors are all byte-strict for the same
  reason. Pinned as a test so it cannot quietly change, and disclosed in `KNOWN-LIMITATIONS.md` and
  in `docs-content/troubleshooting.md` as the one shape a caller should still screen for.
- **~~No type check~~ - 🛑 SUPERSEDED 2026-08-09 BY `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED`,
  AND THE REASONING BELOW WAS MEASURED FALSE. READ `documentation/agent-notes.md#x12-control-number-guard-not-type-checked-2026-08-09`
  BEFORE CITING THIS BULLET.** This bound was stated as "nothing about a non-string changed on any
  route", which was true, and justified as _"widening this guard into a type guard would have changed
  a documented message for a defect that is already loud"_ - which was **not**. At the ISA-13 /
  IEA-02 slots the defect was not loud: `[]` and `new String("")` emitted the same fabricated
  `000000000` with `warnings: []`, and `new String("ABC")` was silently coerced. The guard type-checks
  now. What is left of the original caution is real and is recorded in the successor note: several
  diagnostics DID move, including one off a bare `TypeError`, and the refusal message moved at the
  control-number slots that already refused a non-string.
- **A SHORT control number still zero-pads.** The guard is not "ISA-13 must be nine characters":
  `"1"` still emits `000000001`, which is the entire point of `padControl`. Pinned in every suite the
  slice touches, because reading the guard the other way is the obvious mis-generalisation.

#### Placement, and why precedence did not move

Every guard sits at the envelope-assembly site rather than at the top of its builder, so **every
guard that runs BEFORE it keeps its precedence.** Measured: `build835`'s `enforceBalance`,
`build999`'s AK9 count reconciliation, `buildTA1`'s `enforceAcceptIsClean`, the 837's and 277's
hierarchy checks and `build834`'s unknown-maintenance-type refusal all still fire ahead of this one.

**🛑 It does NOT preserve every ordering, and a draft of this file claimed it did.** A defect the
builder detects LATER, during body assembly, now reports the control-number refusal instead, on that
builder's own `*_INVALID_SPEC` code. Measured: `build999` with an empty `interchangeControlNumber`
and six AK9 syntax error codes threw `X12_ACK_COUNT_MISMATCH` at base and throws
`X12_ACK_INVALID_SPEC` at head, so a consumer predicate on that exported code goes base-true /
head-false. **The remedy for that is the CLAIM, never the guard**: moving guards earlier would
destroy the precedence that currently holds correctly. It is disclosed in `CHANGELOG.md`,
`KNOWN-LIMITATIONS.md`, the changeset and `docs-content/troubleshooting.md`.

### What is pinned, and the honest limit of the pin

- `test/builder-control-number-empty.test.ts` - `buildInterchange` (all three pairs), `build999` (all
  three pairs plus both echoes), the whitespace residual, the short-control-number control, and a
  green control fixture per builder so a red case cannot pass on a broken spec.
- Each domain builder's own build suite carries its three envelope cases against the valid spec that
  suite already maintains.
- `test/transactions-ack-ta1-escape.test.ts` - the case that pinned the OPPOSITE assertion now pins
  the refusal, beside the disclosure it replaces.
- **The message is asserted, never only the class.** `toThrow(SomeBuildError)` passes on any
  unrelated refusal in these specs, which is how four of six cases in an earlier slice were vacuous.

**The drift pin is a source regex and establishes nothing about the property.** It requires each of
the NINE named ISA builders to name all three slot literals and to import the guard, so it reds if
one of them loses a guard. **It buys nothing for a tenth builder in a new file** - `ISA_BUILDERS` is
a hand-maintained list, deliberately, so adding one is an edit to that list. A draft of this file and
of the test said the pin covered a tenth builder; it does not. The behavioural cases are the
evidence. This is written down because this repo has been caught before reading a same-line scan as a
proof.

**No census of the slots NOT routed through the guard is published**, here or in the module doc or in
`CLAUDE.md`. Three earlier slices published one and a refuter falsified each by finding one more. The
claim is the property: **a control number routed through `requireControlNumber` is refused when
empty.**

### The `CLAUDE.md` imperatives, RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED

Moved out of `CLAUDE.md` under that file's own ratchet to pay for the
`X12-EMIT-DELIMITER-SHAPE-UNCHECKED` trap: relocate first, lower the entry as the relocation
lands, never raise the ceiling. These are the live imperatives, unchanged; `CLAUDE.md` now carries
only a pointer to them.

- **🩺 AN EMPTY CONTROL NUMBER IS REFUSED ON EMIT NOW, EVERY BUILDER, VIA
  `builder/caller-control-number.ts`.** `padControl("", 9)` FABRICATED `000000000` into ISA-13/IEA-02
  and the interchange RECONCILED, `warnings: []`. **TWO MECHANISMS, ONE CLASS: INVENT and LOSE. A
  DEFECT AT ONE SLOT WAS A CENSUS - the ack ECHOES (`TA1-01`, `AK1-02`, `AK2-02`) carried it too**,
  and `TA1-01` was the disclosure that named this item.
- **🛑 SAY `warnings: []`, NEVER "the pair reconciled against itself" - THE BYTES DIFFER BY FAMILY
  AND A DRAFT PUBLISHED ONE MEASUREMENT AS THE CLASS.** `buildInterchange`/`build999` join untrimmed
  (`GE*1*~`); the SEVEN domain builders' `seg` DROPS a trailing empty, so the trailer loses the
  element outright (`GE*1~`, `SE*21~`). SILENCE is the property that holds across both.
- **🛑 NO TRIM.** Whitespace STILL pads to `00000000 ` and STILL
  builds - **DISCLOSED, NOT FIXED: A TRIM IS A NORMALISATION RULE AND NO SOURCE STATES ONE. `buildTA1`
  IMPORTS NO `pad`, SO IT EMITS WHITESPACE VERBATIM - NEVER WRITE IT AS PADDED.**
  **A SHORT one STILL ZERO-PADS - never read the guard as "ISA-13 must be nine characters".**
- **⚖️ REFUSE NOT WARN, ON CONSISTENCY WITH FIVE IN-PACKAGE `=== ""` GUARDS, NOT ON SPEC** - 005010
  settles neither; a warning would have to travel the READ registry, and a widening onto a NEW CODE
  blinds every predicate (`#83`). **NO NEW CODE; each builder's own `refuseSpec`.**
- **🛑 PLACED AT THE ENVELOPE SITE, SO EVERY _EARLIER_ GUARD KEEPS PRECEDENCE (835 balance, 999 AK9
  counts, TA1 `enforceAcceptIsClean`, the hierarchy checks) - BUT A DEFECT DETECTED _LATER_ NOW
  REPORTS THIS REFUSAL INSTEAD, SO A BUILDER ERROR CODE DID MOVE.** `build999` + empty ISA-13 + six
  AK9 syntax codes: `X12_ACK_COUNT_MISMATCH` at base, `X12_ACK_INVALID_SPEC` at head. **NEVER WRITE
  "nothing a consumer branches on changes" - that was pass 1's MAJOR. THE REMEDY IS THE CLAIM, NEVER
  THE GUARD.**
- 30 sites, EACH with a RED negative control. **THE DRIFT PIN IS A SOURCE REGEX OVER A HAND-LISTED
  NINE AND PROVES NOTHING; IT BUYS NOTHING FOR A TENTH BUILDER IN A NEW FILE.** The behavioural cases
  are the evidence. **PUBLISH NO CENSUS OF WHAT IS NOT ROUTED.**

## `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` (2026-08-08)

The envelope segments' element splitter now honours the `?`-release-character escape. One line of
behaviour, one function, and the whole slice is the argument for why it is allowed to change how
already-published documents decode.

Base tree: `1b71733` (`#95`). Provenance for every spec statement below: ASC X12 .5 (the ISA's
fixed-width layout) and this package's own already-shipped release handling in
`src/parser/release.ts` and `src/parser/segment.ts`. **No TR3 is cited and none is needed** - the
decision rests on the package's internal inconsistency, not on a clause anybody here has read. The
`?`-as-release-character convention is itself recorded in `release.ts` as a CONVENTION: 005010 does
not transmit a release character as a fifth ISA delimiter.

### What was wrong

`src/parser/envelope.ts`'s `splitElements` was `segment.split(delimiters.element)`. It serves every
envelope segment - `GS`, `GE`, `ST`, `SE`, `IEA`, `TA1`, and the dispatch name of anything the walker
has to place - so a RELEASED element separator still ended the element and shifted every element
after it down a slot. Measured through `parseX12` on the base tree:

```text
GS*HC*S*R*20260601*1200*1*X*005010?*X222A1~   ten elements, GS-08 read "005010?"
applicationSenderCode "SEND*ER"               GS-08 read "X", the GS-07 agency code
                                              warnings: [X12_CONTROL_NUMBER_MISMATCH]
groupControlNumber    "1*2"                   GS-08 read "X";  warnings: []
transactionSetControlNumber "00*01"           ST-03 read "01"; warnings: []
CLM*PT?*ACCT*150.00~                          three elements - the BODY control, always correct
```

Three of the package's four framing decisions were already release-aware: `findUnescapedTerminator`
for the segment terminator, `decodeSegment` (via `splitWithRelease`) for body elements, and
`getSegmentValue` for repetitions and components. This one was the odd one out, and nothing in the
module said so.

### 🩺 The grounding that made this shippable, and it is INSIDE the package

Do not reach for a spec citation first. The decisive evidence is that **the emit half already
released these elements and the read half did not honour it, inside one function call.**

`buildInterchange` maps `esc` (the release escaper) over GS-02, GS-03, GS-06, GS-08, ST-01, ST-02,
ST-03, GE-02 and SE-02, and then **returns `parseX12(raw)` of the bytes it just wrote**. So:

```text
buildInterchange({ ..., applicationSenderCode: "SEND*ER", versionRelease: "005010X222A1" })
  emitted   GS*HC*SEND?*ER*RECV*20260601*1200*1*X*005010X222A1     <- correct
  returned  gs.elements.length === 10, gs.elements[8] === "X"      <- wrong, warnings: []
```

`SegmentSpec`'s own JSDoc states the contract the read half broke: "Element values are LOGICAL - the
builder applies the `?`-release-character escape on emit so any active delimiter inside a value
survives." True of the emit, false of the read.

### 🛑 The already-published-decoding call, made explicitly

This is the reason the residual sat open for a slice. The rule everywhere else in this repo is that
changing how a published document decodes is its own decision. It was taken as follows, and the
reasoning is what a future slice should re-read rather than re-derive:

1. **The changed class is exactly one and it is narrow.** An envelope segment carrying a `?`
   immediately before the element separator. `??`, `?:`, `?^`, `?~` and `?A` in an envelope element
   frame identically under a plain split and a release-aware split, so they are untouched. Pinned as
   invariance controls that are GREEN on both trees - which is the point of them.
2. **🛑 THE CLASS IS SYMMETRIC. A first draft of this note said "every document in that class decoded
   WRONGLY before" and a refuter measured it FALSE.** A `?` before the separator has two readings and
   005010 does not transmit which the sender meant. Where the sender ESCAPED a delimiter, base framed
   it wrongly and head frames it correctly: a CORRECTION. Where the sender sent a LITERAL `?` as the
   element's last byte, base framed it correctly and head merges the element with its successor, so
   the segment loses its LAST element: a REGRESSION. `GS*HC*SUB1*RCV?*20260601*1200*000000123*X*005010X222A1`
   reads nine entries at base and **eight** here, GS-06 answering `"X"` and GS-08 gone.
3. **No code is minted, and `X12_CONTROL_NUMBER_MISMATCH` moves in BOTH DIRECTIONS.** The same first
   draft claimed the channel change was "subtractive, never additive"; that is false for the same
   reason. Where the shift displaced a control number it stops firing (**a consumer that rejects on
   that code now accepts such a document**); where a literal `?` newly displaces one it STARTS firing
   (**and that consumer now rejects a document `0.0.14` accepted**). Both directions are disclosed
   and pinned. This is the `#83` class exactly: a predicate written against a code goes wrong when a
   slice moves cases across it, and the package's own docs are such a consumer.
4. **🩺 The regression direction reaches money, by one route, and it must not be understated.** ST-03
   is what `X12-VARIANT-ICR-UNGROUNDED` made authoritative for the 837 variant, so an ST-02 ending in
   a literal `?` destroys ST-03 and the document re-enters the `SVx` fallback. Measured: an 837
   declaring `005010X222A1` whose only service segment is an `SV2` read `variant` `"P"`, `charge`
   `undefined` and `X12_837_SERVICE_LINE_NOT_DECODED` at base, and reads `variant` `"I"` with
   `charge` `150.00` and that warning SILENT here. **A warned non-decode became a decoded amount**,
   which is the fail-safe direction inverted. Pinned.
5. **What the decision actually rests on, and it is CONSISTENCY rather than the spec.** The two
   readings are mutually exclusive; nothing in 005010 picks between them. `decodeSegment` has read
   BODY elements the escape-wins way on **every released version** - `REF*EA*RCV?*NEXT` is two
   elements at base and here. So this makes the envelope obey the package's ONE rule instead of a
   second one, and it makes a single function stop disagreeing with itself. The body control is
   pinned, and it is what makes this a fact rather than a preference. **Do NOT extend that into "so
   the emit half is safe" - item 6 is exactly that mistake, measured.**
6. **🛑 THE EXPOSURE IS NOT INBOUND BYTES ONLY, AND THE REMEDY FOR PASS ONE SAID IT WAS.** That
   sentence shipped on five surfaces and pass two measured it false. Envelope slots routed through
   the builders' release escaper are safe. **Not every emit slot is routed through it, and NO TOTAL
   IS PUBLISHED anywhere** - `X12-NUMERIC-VALUE-EMITS-EMPTY` already banned a bypass census here, and
   pass three caught a draft of this remedy re-publishing one ("two") that was short by at least
   `IEA-02`, which `buildInterchange` and all eight domain builders emit unescaped. **State the
   property, list only what REACHES the regression direction, and expect the list to be incomplete.**
   The routes measured to reach it:
   - **`buildTA1` escapes nothing** - it joins its five caller-supplied elements directly, which
     `CLAUDE.md` already records under `X12-DECIMAL-BYPASSES-THE-GUARD`. TA1-01 echoes the
     acknowledged interchange's ISA-13, and ISA-13 is fixed-width, so a `?` there is content **by
     this slice's own ISA exemption**. Identical bytes on both trees,
     `TA1*00000001?*260601*1200*A*000`, and `parseTA1` reads:

     ```text
     base 1b71733   ackCode "A"   icn "00000001?"           noteCode "000"        warnings: []
     head           ackCode "R"   icn "00000001?*260601"     noteCode undefined    warnings: []
     ```

     **An Accept acknowledgment this library emitted reads back as a Reject**, on the element that
     reassociates it. This is the sharpest instance of the regression direction found anywhere in
     three passes, and it is DISCLOSED rather than guarded: escaping in `buildTA1` would change bytes
     this library already puts on the wire, which is an emit-side decision with its own blast radius
     and its own slice. **That is a deliberate call, not an oversight - record it, do not re-derive it.**

     **🩺 AND DO NOT PUBLISH ONLY THE FAIL-SAFE HALF, which a draft of this remedy did.** `parseTA1`
     narrows an out-of-enum TA1-04 to `R`, so every WELL-TYPED shift lands on Reject and every
     reachable inbound merge position does too. But `noteCode` is type-only (`Ta1NoteCode`, never
     checked at run time - `X12-BUILDER-BOUNDS`: a type is not a runtime guarantee), so a `noteCode`
     of literally `"A"` emits `TA1*00000001?*260601*1200*R*A` and reads back **`ackCode` `"A"`**: a
     **Reject read as an Accept**, whose sender never resubmits. Unreachable from TypeScript and from
     conformant bytes, which is why it is a line rather than a guard - but state BOTH directions.

   - **`buildInterchange` did not escape GS-04, GS-05 or GS-07 at this slice.** A `groupDate` of
     `"2026060?"` emitted `GS*HC*SENDER*RECEIVER*2026060?*1200*1*X*005010X222A1` and its own return
     value read nine elements at base and **eight** here, GS-08 gone, plus
     `X12_CONTROL_NUMBER_MISMATCH`. **Closed by `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE`** -
     `documentation/agent-notes.md#x12-interchange-gs-emit-not-release-aware-2026-08-08`.

   `src/transactions/ack/parse-ta1.ts` carried "no `?`-escape applies - the standard does NOT define
   escaped TA1 content" beside its element reads. Corrected with the code: the READS are still
   verbatim, but the FRAMING is now release-aware like every other envelope segment.

### 🩺 Two exemptions, each with its own red control

- **The ISA is NOT release-split, deliberately.** ASC X12 .5 makes the ISA fixed-width: the
  separators sit at known byte offsets, which is exactly what lets `detectDelimiters` recover the
  delimiter set from an interchange before anything is parsed. A `?` in an ISA element is content.
  Release-splitting it would let a `?` one byte before a separator swallow that separator and return
  fewer than 17 entries on a **well-formed** ISA. `buildInterchange` states the same rule from the
  emit side ("pad each element, never escape - the separators are the ISA's own structural bytes,
  declared in-band"). Pinned with an ISA-06 of `SENDER12345678?`, which puts the `?` immediately
  before the separator.
- **A degenerate delimiter set whose element separator IS `?`.** `detectDelimiters` reads the element
  separator positionally out of ISA byte 4 and rejects only control characters and a non-distinct
  set, so `?` is admissible there, and such an interchange framed correctly at base.
  `splitWithRelease` has **no** guard for this (its `RELEASE_CHAR` branch wins, so nothing splits at
  all), while `findUnescapedTerminator` has carried one for the terminator all along. Without the
  same guard in `splitElements` this slice would have INTRODUCED a regression on that set. It is
  added, and removing it reds its own test.

  **🩺 What this paragraph did NOT say, and it cost a whole transaction body: `decodeSegment` had no
  such guard either**, so a degenerate interchange framed its ENVELOPE correctly here while every
  BODY segment collapsed to one `(non-spec)` element with an empty warning array. Closed 2026-08-09
  by `X12-BODY-DEGENERATE-RELEASE-SEPARATOR`; read
  `documentation/agent-notes.md#x12-body-degenerate-release-separator-2026-08-09` before touching any of the three guards.

  **Note what was deliberately NOT done:** the guard went into `splitElements`, not into
  `splitWithRelease`. Fixing it in the shared helper would also change `decodeSegment`, `parse-999`
  and every repetition / component split, where the same hole is **PRE-EXISTING** - a body segment
  under a `?` element separator does not frame at base either. That is a wider blast radius than
  this slice's claim, so it stays a backlog line.

### What was retracted rather than reworded

Two committed tests and four documents asserted the old behaviour as a DISCLOSURE. A disclosure that
becomes false is retracted, not softened:

- `test/transactions-claim-837-emit-identifier.test.ts` had "🩺 THE REASON, MEASURED: escaping does
  not protect ST-03 or GS-08" and "🩺 DISCLOSED, NOT GUARDED: a delimiter in ANOTHER envelope field
  shifts these two". Both now pin the corrected framing, and a THIRD test was added because the
  retraction leaves a live question: `build837`'s refusal of an active delimiter in the guide
  identifier was justified by "escaping does not help here", which is now false. **The refusal is
  kept anyway and that is a decision, not an oversight** - a partner's parser is not obliged to be
  release-aware, a published guide identifier has no legitimate use for a delimiter, and widening an
  emit surface is its own slice. The new test pins the refusal so it cannot quietly disappear on the
  strength of the retraction.
- The pending changeset `.changeset/olive-pugs-repeat.md` carried the falsified paragraph. **Corrected
  by DELETION, never by rewording** - a changeset freezes permanently into `CHANGELOG.md` (ADR 0001),
  so a false sentence beats the letter of "do not touch another slice's". Same call as `#85` on
  `#84`'s and as `dicom#91`.
- `CHANGELOG.md` `[Unreleased]`, `KNOWN-LIMITATIONS.md` and `docs-content/cookbook.md` each stated it
  twice over.

### The probe discipline this slice used

The probe ran against `/workspace/x12` **and** against `@cosyte/hl7` as a negative control, where it
must report INAPPLICABLE (no `parseX12` / `buildInterchange` export). A probe that cannot fail
measures nothing. The other half of that discipline, on record from `#73`: **a probe that disagrees
with the model's own shape measures nothing either** - read the shape off the types before writing
the walk.

## `X12-ENVELOPE-VALUE-EXAMPLES` (2026-08-10)

Closes the residual `#110` filed as **"the eighth floor"** and `#111` re-filed verbatim as
`src/parser/types.ts`'s `@example` indices, the eighth floor (**`ta1.elements[1]` sharpest**)`.

**Read side.** Nothing on the build side moved. No behaviour moved at all: the diff is comment-only
and the emitted JS is byte-identical base to head.

### The defect

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

### The measurement

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

### 🛑 The filed line was a FLOOR, for the ninth time, in three independent ways

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

### The remedy

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

### 🛑 The ISA is deliberately untouched, and stays filed

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

### The sweep, and what its anchor cannot see

`git ls-files | grep -v '^dist/' | xargs grep -n 'elements\[[0-9]\+\]'` - **409 hits, deliberately
NOT backtick-anchored**, which is the exact failure `#110` published "re-grepped clean" over. Then
the falsified clauses themselves, tree-wide: `must equal ISA-13`, `must match ISA-13`,
`must equal GS-06`, `must match GE-02`, `echoes inbound ISA-13`, `echoes the prior interchange`,
`GS-01 - functional ID code`, `GS-06 - group control number`, `GE-02 - must`, `IEA-02 - must`.

On the ten literal clauses, outside `src/parser/types.ts`, that leaves three classes, all correct:

- `documentation/agent-notes.md#x12-envelope-value-pointers---a-jsdoc-that-points-a-consumer-at-an-envelope-element-index-for-a-value` - QUOTES the base text as the filed
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

### 🛑 What the gate refuted, pass 1, and it was every summary and no cell

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

### Controls

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

### Filed, not absorbed (ADR 0016 rule 2)

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

### The budget

`x12/CLAUDE.md` was AT its ratchet with zero headroom. **Paid by relocating
`X12-ENVELOPE-VALUE-ROUTES` in full into `documentation/agent-notes.md#x12-envelope-value-routes---what-a-caller-actually-does-to-read-an-envelope-element` FIRST**, diffed
**byte-identical (3,095 == 3,095)** before the inline copy was condensed to the short form. **No
trap deleted, no sentence weakened, the ratchet not raised.** Derive the current figure; do not
trust one written here. **`REPO_CLAUDE.x12` is owed a lowering to match** - this slice is scoped to
the submodule and did not touch the umbrella, so that is left to the coordinator, as `#110` and
`#111` also left it.

## `X12-ENVELOPE-VALUE-POINTERS` - a JSDoc that points a consumer at an envelope element index for a value

Item `X12-837-RESIDUALS`, slice `X12-ENVELOPE-VALUE-POINTERS`. Base `61b5981` (`#109`).
`conformance-refuter`: **`REFUTED` -> `NOT REFUTED`, 2 passes.** Last verified 2026-08-09.

`#109` closed this class for ST-03: a typed reader published `tx.st.elements[3]` pre-`?`-unescape,
the framed element text rather than the value the sender stated. `#109` found the same shape in
`src/parser/warnings.ts` and deliberately did not absorb it. This is that slice.

### The census - the filed line was a floor for the SEVENTH slice running, and it is STILL a floor

**Filed: 2 pointers (`st.elements[2]`, `gs.elements[6]`) at `warnings.ts:450-455`.**
**Cut here: 11 pointers, in 4 JSDoc blocks, in 2 files.**
**🛑 AND THE SWEEP DID NOT BOUND THE CLASS** - `src/parser/types.ts` carries more of the same,
enumerated under "the eighth floor" below, found by the gate and NOT closed here. **No completion
claim and no total is published: this slice cut what it measured and filed the rest.**

The mechanism is one sentence of `X12Segment`'s own contract, which the envelope types inherit in
practice: **element values are stored RAW (pre-`?`-unescape)**. A pointer that says "read it here
when you need the values" therefore hands over framed bytes.

#### The defect cells, measured from bytes

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

#### The in-tree control - pointers that are CORRECT and were left alone

A pointer that LABELS its surface as raw is not this defect. Measured and untouched (head line
numbers):

| site | pointer | label that makes it correct |
|---|---|---|
| `codes.ts:226`, `codes.ts:308`, `parse-ta1.ts:90`, `ack/types.ts:252` | `raw.elements[5]` | "is the byte surface" |
| `envelope.ts:236` | `gs.elements[8]` | "the sender's bytes rather than a normalization" |
| `segment.ts:97`, `warnings.ts:678` | `seg.elements[0]` | "carry them verbatim" |

### 🛑 The ISA is NOT a control, and the first draft of this note said it was

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

### What shipped - deletion, and nothing else

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

### ✅ Does the change move a decision? NO, and the control is byte-level

The `#109` standard is to measure both branches rather than assert. Here the measurement is stronger
than a branch table, because there is no branch:

- **The diff is comment-only.** Every changed line begins `* ` inside a JSDoc block; `git diff -U0`
  filtered for non-comment lines returns nothing. 4 insertions, 10 deletions.
- **The emitted JS is byte-identical.** Built base and head with the repo's own `tsup` config:
  `dist/index.mjs` `0b30ed3ac6c30fe4e0936b0c161141ba` and `dist/index.cjs`
  `011750a54527c3043e4fcd273a35828d` on BOTH trees. Nothing a consumer executes moved.

Only the emitted `.d.ts` prose differs, which is the intended change.

### 🔴 `PRE-EXISTING`, measured here, NOT absorbed (ADR 0016 rule 2)

#### The eighth floor: `src/parser/types.ts` carries the same pointer, unlabelled

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

#### `getSegmentValue` cannot read an envelope segment at all

It takes an `X12Segment`, which requires `id`. `IsaSegment`, `IeaSegment`, `GsSegment`, `GeSegment`,
`Ta1Segment` and the inline ST/SE types on `X12TransactionSet` declare only `raw` and `elements`.
Measured with the repo's own compiler settings:

```
error TS2345: Argument of type 'GsSegment' is not assignable to parameter of type 'X12Segment'.
  Property 'id' is missing in type 'GsSegment' but required in type 'X12Segment'.
```

Identical for `IsaSegment` and `Ta1Segment`.
**[FALSE CLAUSE DELETED 2026-08-09 by `X12-ENVELOPE-VALUE-ROUTES`: _"So there is no ergonomic decoded
read for an envelope element; `unescapeRelease(gs.elements[6], d, sink, pos)` on the string is the
only route."_ Two routes work, and the second - add an `id` and use the dot-path - is prescribed
in-tree at `build-ta1.ts:68` and is what this repo's own tests do.]**

Disclosed in-tree already at `build-ta1.ts:67`, `documentation/agent-notes.md#x12---an-accept-ta1-this-library-emitted-read-back-as-a-reject-x12-ta1-emit-not-release-aware:91` and in
`CHANGELOG.md`'s `0.0.15` entry (no line number: this slice's own `[Unreleased]` entry moves it, and
a citation a remedy makes stale is `#109` pass 3's failure mode), so it reproduces on the base. **`KNOWN-LIMITATIONS.md:308` still tells a consumer
to "read through `getSegmentValue`" for the logical value of a `gs` element, which does not
compile.** Left standing deliberately: correcting it means either widening a public signature or
writing a new disclosure, and both are decisions of their own size.

**CLOSED 2026-08-09 by `X12-ENVELOPE-VALUE-ROUTES`** (`documentation/agent-notes.md#x12-envelope-value-routes---what-a-caller-actually-does-to-read-an-envelope-element`),
which took the second option and says why the first was refused. The two sentences above are the
state at `8778cf7` and are kept as the record, not as current fact.

#### Two more, surfaced by pass 2

- **`src/parser/warnings.ts:482`** - "The declared version stays on `isa.elements[12]`", an unlabelled
  envelope value pointer **in a file this slice swept**, left standing. It was treated as correct on
  the draft's ISA reasoning, and that reasoning fell; it belongs with the eighth floor. Untouched by
  this slice, reproduces at `61b5981`.
- **`.changeset/tidy-lamps-argue.md:46`** - a **pending** changeset that reports
  `getSegmentValue` answering for a GS-07, the call measured above as a `TS2345` on a `GsSegment`.
  **It freezes into `CHANGELOG.md` on release.** Tracked at base and belonging to another slice, so
  it is filed rather than absorbed - but it is the one item on this list with a deadline.

#### The ISA element split has no arity check

`decodeIsa` splits on the element separator and its comment asserts "exactly 17 entries by
construction". An ISA-13 carrying a raw separator yields 18 and silently re-indexes ISA-14/15/16, so
the usage indicator reads `"0"`. Reproduces at `61b5981`. **Not `STOP-THE-LINE`:** the document does
raise `X12_CONTROL_NUMBER_MISMATCH`, the shift lands on control and routing rather than on a dose, a
code or a clinical identifier, and the input is non-conformant (an ISA-13 cannot carry an
unescapable separator, since the ISA honours no escape).

### ⚖️ Why the `X12Segment.elements` mis-citations were NOT folded in

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

### The claim sweep - by WORDING, tree-wide, not file by file

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

### The gate

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

### The ratchet

`x12/CLAUDE.md` was at **49,886 against a 49,886 entry - ZERO headroom**. Paid by relocating **two**
traps in full and verbatim, each diffed byte-identical against the inline text before the inline copy
was condensed:

- `X12-EMIT-DELIMITER-SHAPE-UNCHECKED` -> `documentation/agent-notes.md#x12-emit-delimiter-shape-unchecked-2026-08-09`
- `X12-TA1-RESIDUALS` -> `documentation/agent-notes.md#x12---the-two-ta1-residuals-the-acknowledgment-arc-left-open-x12-ta1-residuals` (the second was needed once the pass-1
  remedy grew the trap with the eighth floor and the ISA falsification)

The file now sits at **49,583**. **No trap was deleted and no sentence was weakened to fit** - when
the first correction did not fit, the answer was a second relocation, not a shorter claim. The budget
hook refused that write, which is the mechanism working.

**`REPO_CLAUDE.x12` in the umbrella is owed a lowering to 49,583.** This slice is scoped to the
submodule and did not touch the umbrella, so it is left to the coordinator.

### Discipline 3 - crew / knowledgebase

**No shipped runtime message changed and no public field's decoding changed** - the emitted JS is
byte-identical, so there is nothing here a `crew` skill or a `knowledgebase` doc could be reading that
has moved. The `.d.ts` prose changed only by deletion of false guidance. **`#109`'s two queued items
under `CREW-KB-SURFACE-DEBT` still stand and are not discharged by this slice.**

---

### Relocated here 2026-08-09 from `CLAUDE.md`, to pay for the `X12-ENVELOPE-VALUE-ROUTES` trap

The inline trap block, **verbatim except one clause `X12-ENVELOPE-VALUE-ROUTES` measured false,
deleted inline and recorded below rather than carried over** (a revert re-publishes claims).

#### 🩺 `X12-ENVELOPE-VALUE-POINTERS` (2026-08-09) · `agent-notes/x12-envelope-value-pointers.md`

- **🩺 NO DOC MAY POINT A CONSUMER AT AN ENVELOPE `elements[n]` FOR A VALUE.** Envelope `elements` are
  RAW (pre-`?`-unescape), so a pointer promising "the values" or "both numbers" hands over FRAMED
  BYTES. **FILED AS 2 POINTERS IN 1 FILE; CUT HERE: 11 POINTERS, 4 JSDoc BLOCKS, 2 FILES** (6 at the
  control-number factory, 2 at the count factories, 3 in `serializeX12`'s module doc). One measured
  cell: `gs.elements[6]` reads `"000?*99"` where the value is `"000*99"`. **THE CELLS ARE IN THE
  NOTE; DO NOT RESTATE THEM HERE - a compressed row here named five pointers by one pointer's bytes
  and was measured false for three of them.**
- **🛑 THE REMEDY IS DELETION, NEVER A CORRECTED POINTER.** Nothing was added to make a pointer true;
  the DIFF IS COMMENT-ONLY and the EMITTED JS IS BYTE-IDENTICAL base to head, the control that no
  decision moved. **Re-read the whole sentence a clause lived in** - the parentheticals named one raw
  index AND one decoded count, so half a cut leaves one naming one of two.
- **🩺 `IsaSegment` / `IeaSegment` / `GsSegment` / `GeSegment` / `Ta1Segment` AND THE INLINE ST/SE
  TYPES ARE NOT `X12Segment` - THEY CARRY NO `id`, SO `getSegmentValue` DOES NOT TYPECHECK ON ONE**
  (measured `TS2345`, "Property 'id' is missing"). **`PRE-EXISTING`, DISCLOSED, OPEN, NOT
  ABSORBED** - `KNOWN-LIMITATIONS.md:308` still prescribes `getSegmentValue` on a `gs`.
  **[FALSE CLAUSE DELETED ON RELOCATION, 2026-08-09, `X12-ENVELOPE-VALUE-ROUTES`: _"So there is NO
  decoded read for an envelope element; `unescapeRelease` on the string is the only route."_ There
  are two routes and the second is prescribed in-tree at `build-ta1.ts:68`.]**
- **🛑 THE SWEEP DID NOT BOUND THE CLASS; THE EIGHTH FLOOR IS FILED, NOT CLOSED.**
  `src/parser/types.ts` carries the SAME pointer UNLABELLED in the `@example` of `IeaSegment` /
  `GsSegment` / `GeSegment` / `Ta1Segment` and in four prose blocks, all shipping in
  `dist/index.d.ts`. **`ta1.elements[1]` is the sharp one** - TA1-01 is the reassociation key, so a
  consumer following it compares FRAMED BYTES to an ISA-13. `PRE-EXISTING` at `61b5981`, NOT
  ABSORBED. **A GREP ANCHORED ON A BACKTICK MISSES THEM: they are bare inside `@example`.**
- **🛑 THE ISA IS NOT A CONTROL FOR THIS CLASS, AND A DRAFT SAYING SO WAS FALSIFIED.** It IS exempt
  from `?`-release (that much is true and stays).
  **[FALSE CLAUSE DELETED ON RELOCATION, 2026-08-09, `X12-ENVELOPE-VALUE-ROUTES`: _"so a
  raw-vs-`unescapeRelease` cell on it is a TAUTOLOGY that detects nothing."_ `unescapeRelease` does
  not know the ISA is exempt: on an ISA-13 of `"000000??1"` raw reads `"000000??1"` and the
  unescaped read `"000000?1"`. The cell differs.]** But `decodeIsa` does `isaHead.split(delimiters.element)` and its
  _"exactly 17 by construction"_ DOES NOT HOLD: an ISA-13 of `0000?*001` yields **18**,
  `elements[13]` is `"0000?"`, and ISA-14/15/16 RE-INDEX - so **`isa.elements[13]` raw is NOT always
  the value.** `PRE-EXISTING`. **PUBLISH THE CELLS, NEVER A STORY ABOUT WHICH POINTER IS SPECIAL: this
  was the FOURTH such story falsified in this lineage.**
- A pointer that LABELS its surface raw (`raw.elements[5]` "is the byte surface", `gs.elements[8]`
  "the sender's bytes", `seg.elements[0]` "verbatim") is CORRECT and was left alone.

## `X12-ENVELOPE-VALUE-ROUTES` - what a caller actually does to read an envelope element

From `X12-837-RESIDUALS`. Base `8778cf7` (`#110`). The successor to `X12-ENVELOPE-VALUE-POINTERS`,
which filed this and named the deadline. Last verified 2026-08-09.

`#110` cut every doc that pointed a consumer at an envelope `elements[n]` **for a value**. It left
open the other half: the carriers that told them what to do **instead**, and those named a call that
does not compile.

### The sweep, and its anchor is part of its claim

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

### The census grid - the filed line was a floor again, in both halves

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
| 9   | `documentation/agent-notes.md#x12-interchange-gs-emit-not-release-aware-2026-08-08:25`, `:78` | `getSegmentValue(gs, "07")`       | both SUBSTITUTED (`the dot-path read of GS-07`; `it`) |
| 10  | `documentation/agent-notes.md#x12---the-two-ta1-residuals-the-acknowledgment-arc-left-open-x12-ta1-residuals:131`               | `getSegmentValue(tx.st, "03", d)` | SUBSTITUTED (`the dot-path read of ST-03`)            |
| 11  | `documentation/agent-notes.md#x12---the-two-ta1-residuals-the-acknowledgment-arc-left-open-x12-ta1-residuals:41`                | TA1 table column header           | SUBSTITUTED (`dot-path read`)                         |
| 12  | `documentation/agent-notes.md#x12---an-accept-ta1-this-library-emitted-read-back-as-a-reject-x12-ta1-emit-not-release-aware:230`             | `getSegmentValue(ta1, "01")`      | SUBSTITUTED (`it`)                                    |
| 13  | `test/transactions-ack-ta1-residuals.test.ts:18`     | TA1                               | DELETED                                               |

Row 4 was a substitution until the gate caught it, and it is a ⏳ carrier, so it is now the deletion
the rule requires.

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
| `documentation/agent-notes.md#x12---an-accept-ta1-this-library-emitted-read-back-as-a-reject-x12-ta1-emit-not-release-aware:79`, `:90` | `ta1`    | `:91`, same bullet list      |

**Reached by the sweep and NOT defects. Two drafts published a breakdown of which pattern reached
which site and the gate falsified both, on counts and on file names; no third breakdown is written,
and no figure is quoted.** The durable facts, which do not go stale: the **receiver filter** is by
IDENTIFIER, so it matches a local named `gs` or `ta1` whatever its type, and it MISSES one named for
the case instead of the segment (`caret`, `colon`, `asDotPath`, `dotPath(...)`) or reached through a
member expression (`ix.groups[0]?.gs as X12Segment`). **Pattern 1, the bare literal, is what reaches
those.** **The asymmetry is the reusable part: a receiver filter alone
would not have found them.**
Naming `getSegmentValue` with **no receiver at all** is likewise not this defect:
`documentation/agent-notes.md#x12---the-two-ta1-residuals-the-acknowledgment-arc-left-open-x12-ta1-residuals:60`, `documentation/agent-notes.md#x12-envelope-splitter-not-release-aware-2026-08-08:32`,
`documentation/agent-notes.md#x12-st03-read-not-release-aware---the-st-03-readers-published-the-escape:56`.
`documentation/agent-notes.md#x12-envelope-value-pointers---a-jsdoc-that-points-a-consumer-at-an-envelope-element-index-for-a-value:205` is a correct RECORD of the defect and is the
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

### 🛑 The shape decision: the claim was cut, the signature was NOT widened

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

### 🛑 Two `#110` claims are measured FALSE here, and both were mine to inherit

1. **"So there is NO decoded read for an envelope element; `unescapeRelease` on the string is the
   only route."** (`CLAUDE.md:127-128`, `documentation/agent-notes.md#x12-envelope-value-pointers---a-jsdoc-that-points-a-consumer-at-an-envelope-element-index-for-a-value:181-182`, and
   `.changeset/olive-comets-point.md:42` + `CHANGELOG.md:42` in the softer _"is the route"_ form.)
   **There are two, Route B is prescribed in-tree, and neither is universal** (below). A closed claim
   over an open set, which is this repo's most reliably wrong sentence shape.
2. **"a raw-vs-`unescapeRelease` cell on [the ISA] is a TAUTOLOGY that detects nothing."**
   (`CLAUDE.md:137-138`.) **`unescapeRelease` does not know the ISA is exempt.** On an ISA-13 of
   `"000000??1"`: raw `"000000??1"`, unescaped `"000000?1"`. The cell differs. That claim is what
   kept the ISA out of `#110`'s grid, and it is the reason the ISA row below had never been run.

Both are deleted **inline and on the record** in the relocated copy, because a revert re-publishes
claims. Neither is reworded.

### The cells, and NO story about which member is special

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

### What shipped

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

### ⚖️ The `X12Segment.elements` mis-citations: re-measured, and STILL not folded in

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

### 🔴 Open, filed not absorbed (ADR 0016 rule 2)

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

### 🛑 The gate: FOUR passes, all four `REFUTED`, and this landed under ADR 0027

`conformance-refuter` **REFUTED x4**. The cap is four (ADR 0016 as amended, founder 2026-08-09), so
the fourth pass's prescribed cut-back is **UNGRADED**, and this slice merges under **ADR 0027**.
**Disclosed here, in the commit message and in the PR body**, which is that ADR's condition 5.

Conditions, established rather than asserted:

1. **Four passes spent**, the cap. ADR 0027 is the fallback only because no pass remains; the
   standing order is to spend the pass first, and all four were.
2. **NO PASS EVER REFUTED THE CODE.** Every `INTRODUCED` finding across all four passes was a claim
   defect in a prose carrier. There is no behavioural finding to disqualify the route, and there
   could hardly be one: **no runtime line changed in this slice at all**, and `dist/index.mjs`,
   `index.cjs` and `index.d.ts` are byte-identical to base.
3. **The final remedy is DELETION-ONLY**, checked against the diff and not the summary, because this
   is the condition `#107` failed. `git diff --word-diff` over the whole remedy adds exactly two
   tokens, `DELETION.**` and `requires.`, both a comma or colon becoming a period to close a deleted
   clause - the case pass 3 met and explicitly declined to grade. **No sentence, guard, branch, test
   assertion or figure was added.** A first attempt at the same remedy substituted "SUCCESSIVE" for
   a falsified count; that is a reword, it would have failed condition 3, and it was replaced by the
   deletion.
4. **Pass 4 prescribed exactly this remedy** ("three deletions and one word", naming each site) and
   stated the slice is safe to land: _"NOT a blocker in the safety sense ... the item's own
   deliverable is fully discharged."_ It re-derived the figures independently, re-verifying all 13
   grid cells one carrier at a time against base and re-running every gate, which is what ADR 0027's
   "precedent, not licence" clause requires of the final pass.

**What each pass cost, because the pattern is the point.** Pass 1: four majors. Pass 2: one major,
three minors. Pass 3: two majors, two minors. Pass 4: one major, two minors. **Nineteen findings,
every one a claim defect, and the parser half was never refuted.** `conventions.md` §3 predicts this
for this lineage and it held for a fifth slice running.

**🩺 THE ONE THING WORTH CARRYING FORWARD: three of the four passes found their fresh major in the
PARAGRAPH SUMMARISING A TABLE, never in the table.** The cells survived every pass unamended. What
kept breaking was prose asserting a property OVER them: "every carrier", "all deletions", "no route
reads an ISA element correctly", "in every test hit". **A summary of a measurement is a new and
weaker claim, and in this repo it is the one that fails.** The fourth remedy's answer was to delete
the summaries rather than write a fifth, which is the only move that has ever converged here.

### Discipline 3 - crew / knowledgebase

**Nothing new is owed.** No shipped runtime message changed and no public field's decoding changed;
the emitted JS is byte-identical. The `.d.ts` prose is untouched by this slice (the one `src/` edit is
a `//` comment inside a function body, which does not reach `dist/index.d.ts`).
**`#109`'s two `CREW-KB-SURFACE-DEBT` items stand undischarged.**

### The budget

`x12/CLAUDE.md` **49,583 -> paid by relocating `X12-ENVELOPE-VALUE-POINTERS` in full into
`documentation/agent-notes.md#x12-envelope-value-pointers---a-jsdoc-that-points-a-consumer-at-an-envelope-element-index-for-a-value` FIRST**, diffed **byte-identical (2,997 == 2,997)**
before the inline copy was condensed, and only then were the two false clauses deleted inline in the
relocated copy, each with its own on-the-record marker. **No trap deleted, no sentence weakened, the
ratchet not raised.** Derive the current figure; do not trust one written here.
**`REPO_CLAUDE.x12` in the umbrella is owed a lowering to match.** This slice is scoped to the
submodule and did not touch the umbrella, so that is left to the coordinator.

### The `CLAUDE.md` entry, relocated in full

**RELOCATED VERBATIM 2026-08-10, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-EXAMPLES` trap, the successor slice that closed this note's own
"`src/parser/types.ts`'s `@example` indices, the eighth floor" residual. The inline entry in
`x12/CLAUDE.md` was condensed to the short "open it before you touch" form ONLY after this copy was
diffed byte-identical against it. **Every imperative below is LIVE and it is HERE, not there.**

#### 🩺 `X12-ENVELOPE-VALUE-ROUTES` (2026-08-09) · `agent-notes/x12-envelope-value-routes.md`

- **🩺 NO DOC MAY NAME `getSegmentValue` AS THE READ OF AN ENVELOPE ELEMENT.** It takes an
  `X12Segment`; **ALL SEVEN envelope-level types** (`Isa`/`Iea`/`Gs`/`Ge`/`Ta1` and the INLINE ST/SE
  on `X12TransactionSet`) declare only `raw`+`elements`, so the call is `TS2345`. **`#110` MEASURED
  THREE OF THE SEVEN; THIS MEASURED ALL SEVEN. THE GRID IS IN THE NOTE - COUNT ITS ROWS, DO NOT
  QUOTE A FIGURE: a draft published "9 in 6 files" against its own ten-row grid, AND the gate then
  added THREE MORE ROWS.**
- **🛑 NOT EVERY REMEDY WAS A DELETION.** **FOUR carriers FREEZE on release**
  (two pending changesets AND their `[Unreleased]` CHANGELOG twins - the whole file is
  `[Unreleased]`) and only those are deletion-only; one OWED the consumer a route and is the one
  REPLACEMENT. **CHECK THE `remedy` COLUMN AGAINST THE DIFF, NEVER THE SUMMARY WORD.**
- **🛑 THE SIGNATURE WAS NOT WIDENED, AND THAT WAS THE DECISION.** The body never reads `id`, so
  widening to `elements`-only is FREE, non-breaking and emits nothing - **and it would make a
  SILENTLY WRONG ISA READ COMPILE.** A capability that is right on six types and wrong on the
  seventh is not an ergonomic win. **THE CLAIM WAS CUT; NO CODE MOVED.**
- **🛑 TWO `#110` CLAIMS ARE MEASURED FALSE HERE. (a) "`unescapeRelease` ... IS THE ONLY ROUTE" -
  there are TWO, and the second is prescribed in-tree at `build-ta1.ts:68` ("add one") and is what
  this repo's OWN TESTS do (`gsOf`, `withId`). (b) "a raw-vs-`unescapeRelease` cell on the ISA is a
  TAUTOLOGY that detects nothing" - `unescapeRelease` does not know the ISA is exempt.**
- **🛑 THE TWO ROUTES DISAGREE ON A REPETITION** (a bare dot-path answers repetition 0). **ON THE ISA,
  READ THE FOUR CELLS IN THE NOTE AND STATE NO RULE OVER THEM IN EITHER DIRECTION** - two drafts
  did, and the gate falsified both, the second with a plain ISA-06 / ISA-08 / ISA-16 and with the
  note's own third row. **PUBLISH THE CELLS, NEVER A STORY ABOUT WHICH MEMBER IS SPECIAL.**
- **🛑 A DELETION REMEDY CAN STRAND THE SENTENCE'S SUBJECT, AND THE BROKEN CLAIM THEN SHIPS IN BOTH
  TWINS.** Cutting "read through `getSegmentValue`" mid-sentence left _"the same element, which
  already unescaped"_ - the OPPOSITE of what the entry reports - in `CHANGELOG.md` AND
  `KNOWN-LIMITATIONS.md`.
  **RE-READ EVERY SENTENCE YOU CUT, IN EVERY TWIN, AND CUT THE WHOLE CLAUSE WHEN THE REMAINDER
  CANNOT STAND** - the remedy for this trap tripped it once before it landed.
  `check:no-internal-refs` calls this DECAPITATION; **ELEVEN siblings run it and x12 does NOT**, and
  **it would not have caught these** - it scans neither carrier. Porting it is its OWN slice.
- **⚖️ `parse-ta1.ts:41` / `KNOWN-LIMITATIONS.md:306` MIS-CITE `X12Segment.elements`. RE-MEASURED AND
  STILL NOT FOLDED IN** - their statement is TRUE and they have a twin, so folding half splits a
  filed slice. **`#110`'s third ground (that no deletion remedy exists for them) IS WITHDRAWN: one
  does.**

## `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` (2026-08-08)

`buildInterchange` released GS-01, GS-02, GS-03, GS-06 and GS-08 on emit and wrote GS-04, GS-05 and
GS-07 raw. It returns `parseX12` of the bytes it just wrote, so **one function disagreed with itself** on
three of its own slots. This note carries the measurement, the decisions and the limits; the
imperatives are in `CLAUDE.md`.

Ninth slice of the `X12-837-RESIDUALS` release-escaping lineage, after
`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE` (the read half) and `X12-TA1-EMIT-NOT-RELEASE-AWARE` (the
`buildTA1` half). Both of those named this residual in their own "deferred" sections.

### What was measured at base `837d4bc`

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

### The grounding is inside the package, not in a spec clause

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

### 🛑 It changes bytes, and the property is what to read

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

### ⚖️ The implementation decision: type-check BEFORE escaping, not at the join

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

### 🩺 `null` and `undefined` in these three slots are ABSENT, not refused

All three resolve through `??` before either guard sees them - GS-04 to the century-expanded ISA
date, GS-05 to the ISA time, GS-07 to `"X"`. So neither guard covers a nullish value in them, and the
refusal pins must not be read as covering every wrong value in the slot. Unchanged from base; nothing
here made it so, and it is pinned so the claim stays scoped.

### The count gate moved DOWN while the coverage widened

`test/builder-string-type.test.ts` pins the `esc` invocation count, and it moved DOWN across this
slice while the coverage widened: `buildGroup` used to invoke `esc` once per already-escaped GS slot,
on one line each, and now maps one `esc` over the GS parts array. **That assertion is a drift
detector and has never measured coverage** - a falling count is not evidence of a shrinking guard.
**🩺 THE FIGURES ARE NOT REPEATED HERE, DELIBERATELY.** A draft of this section published them beside
the sentence telling the reader never to quote them anywhere else, which is the exact duplication
`caller-string.ts` records as the thing that drifts. They are published in that test file's own
header and asserted in the same file, so prose cannot drift from code. Read them there.

### What this does NOT close, stated without a census

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
  `documentation/agent-notes.md#x12-body-degenerate-release-separator-2026-08-09`.
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

### The probe discipline

The base / head probe ran from a scratch path unique to this repo AND this process, and the same
script was run against `@cosyte/hl7`'s build as a negative control, where it must report
INAPPLICABLE (no `buildInterchange` / `parseX12` pair). A probe that cannot fail measures nothing.

### Tests

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

### Relocated from `CLAUDE.md`, 2026-08-10, verbatim

Moved here in full to pay for the new `X12-ENVELOPE-VALUE-ROUTES` trap on deletion remedies. Nothing
is dropped and nothing is shortened; `CLAUDE.md` keeps only the imperative pointer.

- **🩺 `buildInterchange` RELEASES GS-04 / GS-05 / GS-07 NOW** - it disagreed with itself. **GS-07
  WAS THE SILENT ONE:** `"X*Y"` took GS-08's slot, `warnings: []`. **🛑 BYTES CHANGE, NO READER
  MOVED - A DIFFERENT SCOPE FROM `#96`. STATE THE PROPERTY** (the model reports what THE CALLER
  PASSED), **NEVER A DIRECTION, A TOTAL, OR A DELIMITER BY BYTE - NAME THE ROLE:** the caller
  declares all four; REPETITION/COMPONENT were a dot-path GAIN, the cost a MID-STRING `?` on RAW.
- **🛑 NEVER ESCAPE ELEMENT 0: A SEGMENT ID IS OURS, NOT CALLER CONTENT.** `esc` uses the CALLER's
  set, so `componentSeparator: "S"` made `"GS"` read `G?S` and the group fell out as orphans.
- **⚖️ TYPE-CHECK BEFORE ESCAPING** - bare `esc` names only the BUILDER, losing `"GS"-04`. **`esc`
  AFTER `expandYY`; `null` HERE IS ABSENT, NOT REFUSED; NO CENSUS, AND THE SIBLING PRECEDENT IS NOT
  UNIFORM - GS-07 IS A CALLER VALUE IN `build999` ALONE.**

## `X12-ISA-ELEMENT-ARITY` - the ISA split had no arity check (2026-08-10)

`X12-837-RESIDUALS`. Read side. The residual was filed by `#111` as *"`decodeIsa`'s split has no
arity check"* and promoted there to **the blocking question for any future widening of an envelope
reader**, so it is closed here before any such widening is considered.

### The claim that was false, and where it lived

`src/parser/envelope.ts`, above the split:

```
// Split into ["ISA", e1, e2, …, e16] - exactly 17 entries by construction
// because the element-separator-position guard in delimiters.ts already
// verified the layout.
```

The cited guard (`detectDelimiters`) verifies the element separator at all 16 fixed 005010 byte
positions. That bounds the split **from below** - it can never come out short - and it never bounded
it from above. An ISA element **value** carrying that same byte splits again, so that element comes
back a **prefix** and everything after it is **displaced**. **🛑 HOW FAR IS NOT DERIVABLE FROM
`parts`, AND NO ARITHMETIC ON IT WORKS** - see the gate record below, where publishing a quantifier
was the pass-1 major AND, in a different form, the pass-2 major inside its own remedy.

`parts.length < 17` is therefore unreachable while `detectDelimiters` is what it is, and the check
shipped is `!== 17` rather than `> 17` so that it does not silently depend on that.

### The census - 16 cells, all run, and the anchor stated

**Instrument.** One conformant interchange from `test/_helpers/envelope.ts`. For each fixed ISA
element `n` in 1..16, **overwrite** (never insert - the ISA has to stay 106 bytes, or
`X12_ISA_TOO_SHORT` is what is being measured) the **last byte of that element's fixed span** with
the element separator `*`, then `parseX12`. Measured against `0.0.16`, which is what npm serves.

| planted in | split parts | warnings at `0.0.16`                              |
| ---------- | ----------- | ------------------------------------------------- |
| ISA-01     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-02     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-03     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-04     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-05     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-06     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-07     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-08     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-09     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-10     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-11     | -           | `X12_INVALID_DELIMITERS` (Tier-3, thrown first)   |
| ISA-12     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-13     | 18          | `X12_CONTROL_NUMBER_MISMATCH`                     |
| ISA-14     | 18          | none                                              |
| ISA-15     | 18          | none                                              |
| ISA-16     | -           | `X12_INVALID_DELIMITERS` (Tier-3, thrown first)   |

**🛑 THE FILED LINE WAS A FLOOR AGAIN.** It named ISA-13 and the consequence *"ISA-14/15/16
re-index silently"*. **14 of the 16 fixed elements reproduce**, and the two that do not **are** the
in-band repetition (ISA-11) and component (ISA-16) separator declarations, so planting the element
separator there collides with a delimiter and `detectDelimiters` refuses at Tier-3 before the split
is ever reached. **That is a boundary of the probe, not a property of those two elements, and no
story is told here about which member is special** - that story has been falsified repeatedly in
this lineage.

**🛑 The silence is not where the filed line put it either.** Exactly two rows carried
`warnings: []` at `0.0.16` (ISA-14 and ISA-15), and eleven rows carried a warning that **named the
wrong thing**, which is a different defect from silence and is the more interesting half:

- The document declares `00501` at ISA-12's **own** fixed byte offset and `X12_PRE_005010` fires
  anyway, because `elements[12]` has become the repetition separator.
- `elements[13]` - the interchange control number, the **reassociation key** - answers `"00501"`.
- `elements[15]` - the **test/production usage indicator** - answers `"0"` (ISA-14's
  acknowledgment-requested value) on a document whose ISA-15 says `P`.

Pinned cells, from `test/parser-isa-element-arity.test.ts`: on the ISA-06 row `elements[12] === "^"`,
`elements[13] === "00501"`, `elements[15] === "0"`; on the ISA-13 row `elements[13] === "00000000"`
and `elements[14] === ""`.

**The census is not measuring adjacency.** Planting at an element's last byte puts the plant next to
the real separator that follows it. A plant in the **middle** of ISA-13 (`"0000*0001"`) behaves
identically: 18 parts, `elements[13] === "0000"`. Pinned separately.

### What shipped

`X12_ISA_EXTRA_ELEMENT_SEPARATOR`, a Tier-2 warning, plus `isaExtraElementSeparator(position)` and
the registry message. `decodeEnvelope` raises it when `isa.elements.length !== 17`, at
`{ segmentIndex: 0, interchangeIndex: 0 }` with **no `elementIndex`**: naming an element index would
be a claim about which fixed element the extra separator belongs to, which is the question that
cannot be answered.

**Additions-only. Nothing is re-framed and no existing warning is suppressed or narrowed.** The
displaced-value rows above are pinned as tests *because* they still happen - the pins are what stops
a later slice from re-framing the ISA without noticing it changed how published documents decode.

**🛑 The reason it re-frames nothing, and it is not timidity.** A byte that is both an element's
content under the ISA's fixed widths and the separator that same segment declares in-band has **two
readings**. The interchange is not 005010-conformant either way, and **no source anyone here has
read says which reading to take** - the same symmetry `#96` recorded for the envelope release split,
where the tiebreaker was consistency with `decodeSegment` and explicitly **not** spec. Choosing here
would be a normalisation rule this package has refused to invent four times.

**The route back is `isa.raw`**, unchanged: all 106 bytes, verbatim, and the ISA's fixed widths make
the transmitted span of any element recoverable from it. Recovering it is the **caller's** decision.

**Ordering is load-bearing, and its scope is part of the claim.** `decodeEnvelope` pushes the new
warning **ahead of** the ISA-12 and ISA-13 checks, because when it fires those two may be reading a
displaced element rather than the one they name. `{ strict: true }` escalates the **first** warning,
so strict mode now throws `X12_ISA_EXTRA_ELEMENT_SEPARATOR` on such an interchange instead of the
displaced-value warning that follows it. That is a behaviour change, on non-conformant input only,
and it is disclosed rather than glossed.

**🛑 That is a statement about `parseX12`'s `ix.warnings` and `onWarning`, and about NOTHING ELSE.**
`serializeX12(ix, { specClean: true })` runs its own ISA-13 / IEA-02 reconciliation off
`interchange.isa.elements[13]` with no arity awareness and **never raises this code at all**. On the
ISA-06 plant it emits `["X12_CONTROL_NUMBER_MISMATCH"]` while the transmitted ISA-13 span
(`isa.raw.slice(90, 99)`) equals IEA-02 **byte for byte** - exactly the "the warning named the wrong
thing" defect this slice exists to flag, on the one channel where the flag cannot appear. The
serializer's behaviour is `PRE-EXISTING` (`src/serialize/serialize.ts` is zero lines of diff) and is
**filed, not fixed**; what was `INTRODUCED` was the universal quantifier over it, and the remedy was
to scope the claim, never to grow the guard. Pinned in the test file.

### ⚖️ Read side, and what the build side does and does not get

**This is a READ-side slice.** `buildInterchange` is untouched: the fixed-width ISA slots go through
`pad` / `padControl` and **never** through `makeCallerEscaper`, so a caller value carrying the
element separator still reaches the wire exactly as before. Refusing one on emit is a build-side
decision and is **not** taken here.

What the read-side check does reach, because `buildInterchange` returns `parseX12` of the bytes it
just wrote, is the sharpest cell in the whole slice and it needs no inbound document at all:

```
buildInterchange({ …, interchangeControlNumber: "0000*0001" })
  at 0.0.16 → isa.elements[13] === "0000",  isa.elements[15] === "0",  warnings: []
  at head   → the same two reads, plus X12_ISA_EXTRA_ELEMENT_SEPARATOR
```

`IEA-02` is written from the **same** caller value, so it is displaced the same way and
`X12_CONTROL_NUMBER_MISMATCH` **agrees with the misreading**. The package emitted bytes, misread its
own bytes, and its own reconciliation check confirmed the misreading - `warnings: []`. Same shape of
grounding as `#96`: one package disagreeing with itself, never a spec clause.

**`senderId: "AB*CD"` and `receiverId: "AB*CD"` do the same thing** and are pinned as unguarded.

### 🛑 What this does NOT close, stated because a draft would claim it

- **It does not close `src/parser/types.ts`'s `@example` indices.** `#116`'s gate already falsified
  attributing those ISA cells to this check: their mechanism is **fixed-width space padding on a
  spec-clean file**, which needs no separator in a value at all. Two different mechanisms, and that
  was the fifth which-member-is-special story in this lineage. That residual stays filed.
- **It does not close the emit side.** Filed above.
- **It states no rule about how to read an ISA element**, in either direction, and prescribes no
  route. `#110`'s and `#111`'s falsified stories are why.
- **The grounding limit stays unclaimed.** No count of the errata set is published anywhere here, no
  source is cited for any normalisation rule, and **no source scan was proposed**.

### 🛑 The gate: pass 1 `REFUTED`, two majors, and both were CLAIM defects with deletion remedies

`conformance-refuter` pass 1 re-ran the 16-cell census independently and reproduced it cell for cell.
**It could not break the guard.** It broke two claims wrapped around the guard, which is the ninth
time running in this lineage that the parser graded correct and the prose did not.

**Major 1, `INTRODUCED`: *"every element after it is displaced by one"* is FALSE, and this package's
own emit path reaches the falsifier.** Two ISA elements can each carry an extra separator. Measured:

```
buildInterchange({ …, senderId: "AB*CD", interchangeControlNumber: "0000*0001" })
  isa.elements.length === 19
  isa.elements[16] === "0"        (ISA-14's acknowledgment-requested value)
  isa.raw[102]      === "P"        (the transmitted ISA-15, the usage indicator)
```

A consumer applying the published rule reads the **test/production usage indicator** and the
**reassociation key** wrong, with nothing on the channel to say so. **The census had only ever
planted ONE separator, and the prose generalised past its own measurement** - `conventions.md`
§"Three rules the diagnostic-widening slices paid for", rule 3, in the act.

**The sweep was tree-wide and the clause was DELETED, not reworded, in nine carriers:**
`src/parser/warnings.ts` (the registry message, which SHIPS in `dist`), `src/parser/envelope.ts`
(twice), `KNOWN-LIMITATIONS.md` and `CHANGELOG.md` (both in `package.json.files`; the changelog
freezes), `.changeset/rare-forks-judge.md` (**freezes on release**), `docs-content/spec-notes-envelope.md`,
`docs-content/troubleshooting.md`, and the test docblock. `isa.elements.length` is the honest carrier
and `git grep "displaced by one" f0295a2` is empty, so every carrier was this slice's own. **The
two-element row became a pinned cell**, so the falsifier is a test rather than a paragraph.
**🛑 But what replaced the clause was a SECOND quantifier, and pass 2 measured it false - see
below. The remedy for a false universal is DELETION, never substitution, and this slice is the worked
example of getting that wrong on the first try.**

**Major 2, `INTRODUCED`: the ordering promise was a false universal.** Scoped, per the section above.

**Minor, `INTRODUCED`: the `CLAUDE.md` trap summarised rows 1-12 as the general property** - *"the
control number answers the VERSION and the usage indicator answers ACK-REQUESTED"*. This slice's
**own pinned cells** falsify it: on the ISA-14 and ISA-15 rows `elements[13]` is the true control
number and `elements[15]` is `""`. **A paragraph summarising a table, exactly the shape three of
`#111`'s four passes found, and deleted rather than qualified.**

**Minor, `INTRODUCED`: an unhedged spec assertion in the two carriers that freeze.** The agent note
and the registry message hedged correctly; `CHANGELOG.md`, the changeset and the troubleshooting row
had dropped it to *"005010 does not say which reading to take"* - a positive claim about a paid
standard nobody here has read, against this item's grounding limit. **The spec attribution is deleted
from all three**; they now say what the hedged carriers say. No source scan was proposed.

**`PRE-EXISTING`, filed not absorbed (ADR 0016 rule 2):** `serializeX12(…, { specClean: true })`
reconciles ISA-13 against IEA-02 off the split array with no arity awareness. Reproduces identically
on `f0295a2`. Not stop-the-line: it warns, it does not silently emit a wrong identifier.

**Not acted on:** the refuter also noted that neither `operations/roadmaps/x12.md` nor this slice
carries a `Provenance:` field. That is an umbrella-side observation about a file outside this repo.

### 🛑 Pass 2 `REFUTED`: the remedy substituted a SECOND false quantifier, and that is the lesson

Pass 2 confirmed all four pass-1 remedies landed and that the relocation was byte-identical. It then
found one `INTRODUCED` major, **inside the remedy**, in the same ten carriers:
*"`isa.elements.length` is the only measure of how far"* / *"two such elements displace by two"*.

**It is false, and the falsifier is this slice's OWN pinned input.** Plant the element separator in
ISA-06 and ISA-13 of one conformant interchange:

```
parts.length 19        (= 17 + 2 extra separators)
[12] "^"          ISA-11  -> moved by ONE
[13] "00501"      ISA-12  -> moved by ONE
[14] "00000000"   ISA-13 prefix
[15] ""           ISA-13 remainder
[16] "0"          ISA-14  -> moved by TWO
[17] "P"          ISA-15  -> moved by TWO
```

**Displacement is POSITION-DEPENDENT.** `isa.elements.length` counts extra separators in total; it
equals the shift only for elements sitting after the LAST plant. A consumer applying the published
rule (`length - 17 = 2`) to this interchange recovers **ISA-12 as `elements[14]` = `"00000000"`, a
truncated interchange control number read as the version**, and **ISA-13 as `elements[15]` = `""`, an
empty reassociation key** - the exact mis-read this slice exists to flag, prescribed by the warning's
own shipped message. The carriers also contradicted themselves two sentences later, where each said
`isa.raw` plus the fixed widths is the route back.

**The remedy is DELETION, and this time no quantifier replaced it.** Every carrier now says only that
an element containing an extra separator comes back a prefix, that everything after it is displaced,
that **how far is not derivable from `isa.elements`**, and that `isa.raw` plus the fixed widths is the
only route back. The two-plant pin was renamed off the falsified rule and now asserts `elements[12]`,
`elements[13]`, `elements[16]` and `elements[17]` **together** - two different shifts on one
interchange, which is the cell that forbids any arithmetic.

**🩺 THE REUSABLE RULE, AND IT COST TWO PASSES: A CORRECTED CLAIM IS A NEW CLAIM. WHEN A GATE
FALSIFIES A UNIVERSAL, DELETE THE QUANTIFIER - DO NOT SUBSTITUTE A NARROWER ONE.** `conventions.md`
§"Three rules the diagnostic-widening slices paid for" says exactly this, and the first remedy broke
it while citing it. **Both of this slice's majors were prose; the guard at `envelope.ts` graded
correct on every pass and neither refuter could break it.**

**Pass 2's other two findings did not contribute to the verdict.** The surviving *"the interchange is
not 005010-conformant either way"* was ranked `PRE-EXISTING` minor and defensible from the fixed-width
layout this repo verifies itself, and is left as filed rather than swept a third time. The missing
`Provenance:` field is umbrella-side and outside this repo.

### Pass 3 `NOT REFUTED`, and the one thing it left standing on purpose

Pass 3 (scope: the pass-2 remedy diff only) re-derived the two-plant grid **from bytes**, independent
of this repo's code, and reproduced it cell for cell; confirmed the quantifier is gone from all ten
carriers and survives only where this note quotes it as falsified; and verified the AMT/ADX
relocation byte-identical. **No `INTRODUCED` blocker or major. The guard graded correct on all three
passes and no refuter could break it.** Two minors, both cleared: a parenthetical **count** in the
`CLAUDE.md` trap (**deleted, not corrected** - a count corrected twice is deleted, and this slice's
whole lesson is delete-never-substitute), and one over-long line in `docs-content/`, which
`format:check` does not glob and so nothing caught.

**🩺 What pass 3 declined to file, recorded here so a future slice does not have to rediscover it.**
The replacement wording is itself a universal negative - *"how far is NOT derivable from
`isa.elements`"* - and it is literally falsifiable: `isa.elements.join(delimiters.element)`
reconstructs the 105-byte element area exactly, after which the fixed widths recover every
transmitted span. Pass 3 did not file it because the direction is **fail-safe** (that route
reproduces `isa.raw` and yields identical values, so no consumer reaches a wrong control number,
version or usage indicator through it) and because re-litigating a prescribed remedy is the runaway
the four-pass cap exists to stop. **If anyone reopens this prose, the honest form is "not derivable
from `isa.elements.length`, nor from an index shift" - not a blanket "no arithmetic works".**

### Evidence

- **Full suite green at head:** 91 files, 2,310 tests (2,308 at the first graded sha).
- **Mutation control on the guard alone** (the `if` in `decodeEnvelope` disabled, everything else at
  head, restored afterwards **by file copy**, never `git checkout`): **6 of the 13 new tests red** at
the graded sha,
  plus the registry-size test, which reds for the code addition rather than for the guard. The new
  tests that stay green under the mutation are the ones measuring base behaviour on purpose - the
  conformant control, the displaced-value pins, `isa.raw` preservation, the helper, and the two
  build-side rows that assert the emit side is **not** guarded.
- **Sweep anchor, and what it cannot see.** `git ls-files | grep -v '^dist/' | xargs grep -ni "17
  entries\|17 parts\|exactly 17\|16 elements\|fixed-width\|fixed width"` over the tracked tree. Two
  live carriers of the falsified arity claim were found and corrected: `src/parser/envelope.ts`'s
  comment and `test/_helpers/envelope.ts`'s *"split on `delimiters.element` it has 17 entries"*
  (**corrected by deleting the falsified clause**, not by rewording it). **It cannot see:** prose
  that states the arity without any of those words; `dist/` and untracked files; a claim split across
  a line wrap; and any claim phrased as a count in words rather than digits. `CHANGELOG.md`'s
  historical entries were left alone - they are dated statements about earlier releases, and one of
  them (`"release-splitting it would collapse a well-formed ISA below its 17 entries"`) is about the
  **release** splitter and is still true.

### Budget

`x12/CLAUDE.md` entered this slice at its ratchet with **zero headroom**. The trap was paid for by
**two verbatim relocations, first**: the `X12-837-SV1-OVERWRITE` bullets into
`documentation/agent-notes.md#x12-837-sv1-overwrite-2026-08-08---a-second-service-segment-replaced-the-first-silently` and the `X12-PAY-TO-FUSION` bullets into
`documentation/agent-notes.md#x12-pay-to-fusion-2026-08-07`. **Nothing was dropped, no trap was deleted, no ceiling was
raised, and no existing sentence was reworded to buy bytes.** The file leaves this slice smaller than
it entered it. **No byte figure is published here** - derive it with `wc -c x12/CLAUDE.md`. **The
umbrella still owes the matching ratchet drop of `REPO_CLAUDE.x12` in the umbrella's size hook (since retired),
which is outside this repo.**

## `X12-ISA-VALUE-POINTERS` (2026-08-11)

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

### The re-measurement, which killed one filed line before it built anything

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

### The defect

Two carriers, both rendering into `dist/index.d.ts` and `dist/index.d.cts`, which ship:

- **`src/parser/warnings.ts`**, `pre005010`'s JSDoc: *"The declared version stays on
  `isa.elements[12]`."*
- **`src/parser/types.ts`**, `IsaSegment`: *"`elements` is the 16 ISA values, 1-indexed (`elements[1]`
  is ISA-01, ..., `elements[16]` is ISA-16)"*, and the fence's
  `isa.elements[12]; // ISA-12 - version, expected "00501"` /
  `isa.elements[13]; // ISA-13 - interchange control number`.

`isa.elements` holds raw byte text. A pointer promising the value hands over something else, and on
the `pre005010` block it does so in the one situation the warning it documents is about.

### The cells

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

### 🛑 No mechanism is named, and no closed set of them

**Fixed-width padding and arity displacement each falsify a cell on their own**, on documents that
share nothing: the padding cell needs no `?` and no anomaly (`#116`'s gate measured
`isa.elements[6] = "SENDER         "` on a spec-clean file, `warnings: []`), and the displacement
cells need no padding. `#116` attributed the ISA cells to `decodeIsa`'s arity check and the gate
falsified it in one measurement; that was **the fifth which-member-is-special story in this lineage**.
A sixth is not written here in either direction. **Two are measured, a third is not ruled out, and the
label added below names none of them.** Nothing here says which ISA element is special, which
mechanism is the reason, or that the set of reasons is closed.

### The remedy

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

### The sweep, and what its anchor cannot see

Anchor 1, the wide one, deliberately NOT backtick-anchored (the exact failure `#110` published
"re-grepped clean" over):

```
git ls-files | grep -v '^dist/' | xargs rg -n 'elements\[[0-9]+\]'
# at base bab2a41: 483 hits over 342 tracked files
```

Anchor 2, the falsified clauses themselves, tree-wide over the same file list: `declared version
stays`, `16 ISA values`, `is ISA-01`, `expected "00501"`, `ISA-13 - interchange control number`.
**Measured at base `bab2a41`**, outside the two carriers the diff opens, those five literals hit
exactly two lines, both in `documentation/agent-notes.md#x12-envelope-value-pointers---a-jsdoc-that-points-a-consumer-at-an-envelope-element-index-for-a-value` (`:143` and
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

### Controls

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

### Filed, not absorbed (ADR 0016 rule 2)

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

### The budget

`x12/CLAUDE.md` was AT its ratchet with zero headroom (derived: file size equalled
`REPO_CLAUDE.x12` in the umbrella's size hook (since retired)). **Paid by relocating
`X12-VARIANT-LOOKUP-PROTOTYPE` in full into `documentation/agent-notes.md#x12-variant-lookup-prototype-2026-08-05-1` FIRST**:
the base block's heading through its last bullet, `CLAUDE.md:305-337`, `diff`ed against the relocated
body and **byte-identical (2,913 == 2,913)**, before the inline copy was condensed to the short form.
The blank line that separated it from the next `###` is not part of the block and stayed in
`CLAUDE.md`.
**No trap deleted, no sentence weakened, the ratchet not raised.** Derive the current figure; do not
trust one written here. **`REPO_CLAUDE.x12` is owed a lowering to match** - this slice is scoped to
the submodule and did not touch the umbrella, so that is left to the coordinator, as `#110`, `#111`
and `#116` also left it.

## `X12-NO-INTERNAL-REFS-GATE` (2026-08-11)

Ported `check:no-internal-refs` into x12. Eleven sibling repos ran this gate and x12 did not, and it
is the only thing in this ecosystem that would fail a build on the defect class this package's
review history is made of: a claim in a prose carrier, remedied by hand every time, gated by
nothing.

Base commit `a3e081d`. Everything below was measured on this tree, with two independent tools
(`grep -oP` driven by `git ls-files -z | xargs -0`, and `rg`) that agreed on every figure. The
cross-check is not ceremony: a count from a single tool is how this lineage has published sweeps
that had not read the whole corpus.

---

### 1. Re-measurement of the filed line, before building to it

The ledger row said the gate is not ported here, that eleven siblings run it, and that it is the
only thing that would gate this defect class. **All three held.**

| claim | re-measured | result |
|---|---|---|
| eleven siblings run it | `check:no-internal-refs` present in `package.json` scripts | hl7, mllp, ccda, ncpdp, astm, fhir, terminology, transform, deid, synth, cli = **11** |
| x12 does not | same probe on x12 | absent |
| nothing else gates the class | x12's script table + workflows | `check:no-emdash` gates one character; nothing reads prose claims |

`dicom` and `config` do not run it either. That is a fact about them and is not this change's
business; it is written down here so the next reader does not re-derive it as if it were a finding.

### 2. The port is not a copy. What the counts forced

The one place this copy must not track its siblings.

**Every sibling excludes `X12-\d{3}[A-Z]?|X12-\d{6}` from the identifier rule**, as a standards
designation a consumer legitimately reads. In every other repo that is correct. In this one `X12` is
*also* the prefix on our own work items, and unlike ccda's case the two are **not disjoint**:
`CCDA-R2.1` (standard) and `CCDA-P7` (item) differ at the character after the hyphen, so a narrow
exclusion separates them; `X12-837P` (guide) and `X12-837-RESIDUALS` (item) share the head
`X12-837`, and `\b` sits between the `7` and the following `-`, so the sibling exclusion consumes
the item identifier whole.

Counted across every tracked file:

| spelling | matches | what they actually are |
|---|---|---|
| `X12-\d{3}[A-Z]?` | **141** | **all 141 internal item identifiers**, in 8 spellings |
| `X12-\d{6}` | **0** | nothing |
| `005010[A-Z]\d{3}` bare | 77 public surface / 265 `src/` | the spelling this corpus really uses |
| `X12-005010`, `X12-837P` hyphenated | **0** | the spelling the exclusion protects |

The eight identifier spellings: `X12-837-LOOP-RESIDUALS` (30), `X12-837-SV-UNDEFINED-DECIMAL` (22),
`X12-837-SV-SILENT-ZERO` (21), `X12-837-RESIDUALS` (19), `X12-837-EMIT-IDENTIFIER-FIXED` (14),
`X12-837-AMBIGUOUS-VARIANT` (13), `X12-837-SV1-OVERWRITE` (11), `X12-277-SVC07-NOT-DECODED` (11).

**Six of them sat on surfaces this gate scans** (3 in `KNOWN-LIMITATIONS.md`, which `files` ships;
3 in `src/` doc comments, which compile into both declaration twins). A verbatim port matched
**none** of the six and would have printed OK over them.

So the `X12-` forms are dropped from `STANDARDS_DESIGNATION` here. **The cost is stated rather than
discovered:** a future page writing `X12-837P` with a hyphen now reds, and the remedy is the bare
form 342 other occurrences already use. That is the same trade rule 2 makes on a bare `Phase III`.

**Zero from a form refuses rather than passes.** `X12-\d{6}` measures zero *and* protects nothing,
so it is gone. The non-`X12` designations (`HL7-V2`, `FHIR-R4`, `DICOM-SR`, `NCPDP-SCRIPT`,
`CCDA-R\d`, `ASTM-E\d+`) also measure zero here, and are **kept** on purpose: they are the shared
org list, they only ever narrow, and diverging from the siblings on them would make the documented
drift residual worse rather than better. Keeping them is a decision, not an omission.

#### The second forced divergence

`SURFACE_PATHS` gains **`KNOWN-LIMITATIONS.md`**. It is the fourth entry in this package's `files`,
so every install receives it, and it held all but two of the identifier hits the gate first found.
`ncpdp` is the only sibling whose surface list already had it.

### 3. The anchor, and what it cannot see

**The pattern.** Six rules, each its own `grep -P` command, over `git ls-files -z`-enumerated paths,
each `./`-prefixed as the list is built, with `-e` before the pattern and `--` after it, stderr
captured per command and any stderr at all refusing the run. `LC_ALL=C.UTF-8` is pinned. Every rule
runs twice: once line by line, once over paragraph-joined and whitespace-squeezed text.

**Cross-checked with a second tool, because `grep -c` has been measured lying in this container.**
Every figure in this note was produced by `grep -oP` and by `rg` independently and they agreed.

**What it cannot see, stated as part of the claim:**

- **`dist/` itself.** Untracked build output; the script does not build. It gates the *source* of the
  published declarations. The proxy holds only because the dts build copies doc text verbatim, and a
  build that began transforming comments would decouple the two silently.
- **`//` and plain `/* */` comments.** They do not reach `dist`. Identifiers are welcome there, by
  the convention, and what is left in `src/` on that basis is deliberate. **No count is published
  for it:** a draft of this change carried two different figures in two carriers and a third
  measurement matched neither, because "a `//` comment carrying bookkeeping" has more than one
  defensible population. Delete a drifting number; never correct it.
- **`CHANGELOG.md` and `.changeset/`.** Both ship or become shipped text, and both are excluded
  because the convention names them as where identifiers belong. That contradiction is
  ecosystem-wide and is not for one repo to settle.
- **File *names*.** The scan reads contents only.
- **English sentences about our process.** No pattern finds "verified in the research pass". The
  gate raises the floor; the reviewer owns the rest of the rule.
- **A violation split by inline markup** (`phase **K**`) rejoins in neither pass.
- **`documentation/agent-notes/...` paths** in doc comments. Rule 5 keys on meta-repo paths only.
  One such citation is live in `src/transactions/claim/get-837.ts`. **Filed, not absorbed:** adding a
  path is a rule change and needs its own negative self-tests.
- **Prefixes not on the list.** A new programme prefix is invisible until someone adds it by hand.
  That is trap (1)'s stated price.
- **Most of its own rule alternatives.** A positive self-test sample is disjunctive, so it proves one
  spelling still matches, not all of them. Measured by deleting one alternative at a time and
  re-running against a seeded live violation, these each printed OK with every self-test green:
  `wave \d+`, `documentation residual`, the `P\d+ safety|documentation` arm, `conventions.md`,
  `ecosystem-map.md`, `operations/plans/`, `BACKLOG.md`, the `open-question` arm, and narrowing the
  ADR rule to its hyphen form. **No proportion is published**, deliberately: a draft said "nine of
  twelve" and a reviewer re-derived a different pair under every defensible way of counting an
  alternative, because the rules nest and a narrowing counts as well as a deletion. The property does
  not drift and the ratio does. **Rule 1 is only PARTLY the exception:** its per-spelling assertions
  cover the five named spellings of its FIRST arm and nothing else, so its second arm
  (`P\d+ safety|documentation`) is in the list above rather than in the exception. Do not read the
  self-tests as proving "each rule still matches what it bans".
- **Source string literals.** The third pass extracts `/** */` blocks only. A `Phase 10` inside an
  EXPORTED STRING reaches `dist/index.mjs` and `dist/index.cjs` rather than the declarations, and a
  consumer reads it at run time. Measured: the `meta.note` field of five bundled code-list snapshots
  carries exactly that, and `CodeListSnapshot.note` is an exported typed field. So the boundary this
  gate draws is **not** "everything a consumer receives"; it is the markdown surface, the npm
  metadata, and the doc comments.

### 4. The cells run, and what they proved

Eight controls. **No story about which is special**; the set is not published as closed.

| # | control | seeded in | result |
|---|---|---|---|
| C1 | item id a sibling copy is blind to | `KNOWN-LIMITATIONS.md` (ships) | RED |
| C2 | item id a sibling copy is blind to | `src/parser/types.ts` doc comment | RED |
| C3 | `X12-837P`, the hyphenated form this port reds on | `docs-content/intro.md` | RED |
| C4 | `phase` / `W` split across a line wrap | `docs-content/intro.md` | RED |
| C5 | identifier in the npm `description` | `package.json` | RED |
| C6 | new unscanned entry in `files` | `package.json` | RED (tripwire) |
| C7 | restore the sibling `X12-` exclusion | the script itself | **see below** |
| C8 | widen rule 1 to case-insensitive | the script itself | RED (self-test) |

Every seeded tree was restored **by file copy from a pre-seed backup, never `git checkout --`**.

#### C7 failed the first time, and that is the most useful thing in this note

Restoring the sibling exclusion **printed OK**. The gate was green while the divergence the whole
port exists for was uncovered.

The cause: **a positive self-test sample is disjunctive.** `grep -q` is satisfied by the first match
and stops. `POSITIVE[0]` held five spellings; `CCDA-P7` matched first; the four `X12-` spellings
after it were asserting nothing. A negative sample does not have this failure mode, because it
asserts that *nothing* matches and every entry is therefore independently load-bearing.

The remedy is `RULE1_MUST_MATCH_ALONE`: each spelling asserted on its own, one sample one token,
against both the markdown rule array and the `src/` one. C7 and C8 now red by name.

**RULE 1 IS NOT THE SPECIAL MEMBER; IT IS THE ONE THAT WAS PARTLY PAID FOR, AND THE SET IS NOT
CLOSED.** A reviewer then measured the same shape across the rest, deleting one alternative at a time
and re-running against a seeded live violation, and named nine that let the gate print OK with every
self-test green. **A second reviewer re-derived the PROPORTION and could not reproduce it**, getting
a different pair under every defensible way of counting an alternative, so the proportion is deleted
and the named members and the property are kept. The same reviewer found that one of those nine, the
`P\d+ safety|documentation` arm, is rule 1's SECOND arm, which the per-spelling assertions do not
cover: **rule 1 is covered for five named spellings of its first arm and for nothing else.** All of
it is disclosed as residual (xv) in the script and in the blind-spot list above, and none of it is
closed here: a per-alternative positive sample per rule is its own change with its own review, and a
port is the wrong place to land it.

### 5. Remediation, and the proof it moved no behaviour

| carrier | before | after |
|---|---|---|
| public surface (14 files) | 23 identifier, 2 phase, 9 jargon (34) | 0 |
| `src/` doc comments (108 files) | 212 hits: 124 phase, 76 identifier, 9 jargon, 2 path, 1 ADR | 0 |
| `dist/index.d.ts` (built) | 13 identifier, 64 phase, 2 jargon, 1 path | 0 on all six rules |
| `dist/index.d.cts` | byte-identical to `.d.ts` | byte-identical to `.d.ts` |
| `dist/index.mjs` | | **byte-identical base to head** |
| `dist/index.cjs` | | **byte-identical base to head** |

`cmp` in both directions, on builds of `a3e081d` and of head. The `src/` half of the diff is
comment-only and moved no runtime byte.

**"0" IN THAT TABLE IS A STATEMENT ABOUT THESE SIX RULES, NOT ABOUT THE FOUNDER'S RULE**, and the
difference was measured rather than assumed. Six lines of phase framing survived the first sweep
inside `dist/index.d.ts` while every rule read zero: four were the disclosed residual (vii) shape
(`phase` followed by punctuation), and two were the PLURAL `Phases 4+` / `downstream phases`, which
rule 2 cannot see at all because it requires `phase[ -]` followed by an alphanumeric. All six were
translated afterwards, so the built declaration file now contains **no occurrence of the word at
all**, both tools agreeing. **The plural form remains UNGATED**: closing it is a rule change and
needs its own negative self-test, so it is disclosed rather than smuggled in.

**52 of the 124 phase hits and 29 of the 76 identifier hits in `src/` were visible only to the
reflowed pass.** A line-scan-only gate would have reported itself complete over 81 live violations.

**Nothing was deleted to get green.** Every hit was translated into what the software does; where an
identifier came off the front of a line the head was repaired. Two pages pointed the reader at the
package's `CLAUDE.md`, which `files` does not ship, and now point at `README.md` and the Cookbook.

### 6. Filed, not absorbed

Found while doing this, reproducing on base, each its own change:

1. **`documentation/agent-notes/...` cited inside a doc comment** that compiles into both declaration
   twins (`src/transactions/claim/get-837.ts`). A consumer cannot open it. Rule 5 does not cover it;
   widening rule 5 is a rule change needing its own negatives.
2. **`KNOWN-LIMITATIONS.md` links `./docs-content/cookbook.md`**, which `files` does not ship, so the
   link dangles inside every installed copy. A dangling-relative-link class, not an
   internal-bookkeeping one, and nothing gates it.
3. **The gate is not a required check.** The org ruleset pins this repo's required contexts and
   `Public-surface gate / no-internal-refs` is not among them, so it reds visibly without blocking a
   merge. Making it required is an org-level change, outside this repo.

## `X12-NUMERIC-VALUE-EMITS-EMPTY` (2026-08-03)

> **RELOCATED IN FULL from `CLAUDE.md` on 2026-08-11, VERBATIM, NOTHING DROPPED.** It paid for the
> `X12-NO-INTERNAL-REFS-GATE` trap, on that trap's SECOND relocation: the hook refused the first
> correction by 70 bytes, and the answer to that is another relocation, never a shorter claim. The
> narrative it points at stays where it was, in
> `documentation/agent-notes.md#x12-numeric-value-emits-empty-2026-08-03`; this file is the
> imperative set that used to sit in `CLAUDE.md` and it is unchanged below.

- **🩺 EVERY builder that declares an `esc` takes it from `makeCallerEscaper`
  (`src/builder/caller-string.ts`), which type-checks first and refuses with the calling module's own
  typed, code-tagged error. NO COUNT HERE - the gate holds it, and "nine" outlived the ninth.**
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

## `X12-ORPHAN-REEMIT` (2026-08-02)

**RELOCATED FROM `CLAUDE.md` 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-BODY-DEGENERATE-RELEASE-SEPARATOR` trap's pass-1 correction, under that file's own ratchet
(relocate first, lower the entry as the relocation lands, never raise it to meet a new trap).

The imperatives below are LIVE. Open this file before you touch `serializeX12`'s orphan placement,
`X12OrphanSegment.anchor`, or the `SE-01` count. The narrative, the measurements and the refutation
history stay in `documentation/agent-notes.md#x12-orphan-reemit-2026-08-02`; this file is the
imperative half that used to sit in `CLAUDE.md`.

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

## X12-PAY-TO-FUSION (2026-08-07)

Relocated out of `../agent-notes.md`, which was at **249,525** of its 250,000-byte budget when this
landed. The archive file keeps the cursor; this file carries the measurement and the reasoning. The
per-item shape (`documentation/agent-notes/<item>.md`) is the one the umbrella's
the umbrella's size hook (since retired) provides for exactly this, and it is bounded on its own.

**The fusion filed by the slice above is CLOSED.** Read that section first: it is the record of the
defect and of the two remedies that were refuted, and this one does not repeat it. Nothing there
became false; what changed is that the third remedy shipped.

- **THE DEFECT REPRODUCED AT `0.0.12` BEFORE ANYTHING WAS TOUCHED, on the same shape the prior slice
  filed.** Two `NM1*87`s in one Loop 2000A, each with an `N3` and an `N4`, read back
  `{"lines":["1 FIRST PAY TO WAY","2 SECOND PAY TO WAY"],"city":"SHELBYVILLE","state":"IL",`
  `"postalCode":"62565","countryCode":"US"}` with `warnings: []`. **The `countryCode` is the sharp
  half**: it comes off the FIRST `N4`, on an address whose own `N4` has four elements and names no
  country, so the fused value is not even a superset of either sender's address.

- **THE EMIT SIDE WAS MEASURED AT BASE TOO, WHICH IS WHAT MADE THE ARGUMENT.** Fed back through
  `build837P` + `serializeX12`, base emits
  `NM1*87*2~N3*1 FIRST PAY TO WAY*2 SECOND PAY TO WAY~N4*SHELBYVILLE*IL*62565*US~` - one Loop 2010AB,
  well-formed, naming a payment destination no sender stated. A defect that only existed on the model
  would be milder than that.

- **🩺 THE REMEDY IS THE MISSING OBJECT IDENTITY, NOT A CLEAR, AND THAT IS WHY IT SURVIVES THE TWO
  REFUTATIONS.** Every other party gets a fresh entity object at its `NM1`, so a trailing `N3` / `N4`
  finds `current.address === undefined` and REPLACES. The pay-to slot had no object, so the two arms
  wrote onto whatever the previous `NM1*87` left. A `pendingPayToAddress` binding, reset at each
  `NM1*87` and read by `getCurrentPayToAddress`, IS that object. **The committed slot is never
  cleared** - which is exactly what remedy 1 did and was refuted for.

- **🩺 THE COMMIT RULE IS STATED IN THE EMIT SIDE'S TERMS, AND THAT IS THE WHOLE ANSWER TO THE
  CONSTRAINT THE TWO REFUTATIONS BOUGHT.** The current occurrence takes the slot when
  `statesAnAddress(next) || payToAddress === undefined`. `statesAnAddress` is defined as "`emitAddress`
  would write at least one segment for this", in `src/transactions/claim/address-segments.ts`, and
  `emitAddress` asks the same module for its own two conditions. So the reader cannot decide an
  address is worth keeping on a rule the writer does not use, and there is no second copy to forget.
  This is the discipline `build835` already uses, where the emit guard reuses the read side's balance
  validators. **Remedy 2 failed precisely because its condition was "a write happened", which is a
  property of the DOCUMENT's segment stream rather than of what the emit would write.**

- **THE `payToAddress === undefined` ARM IS NOT A CONVENIENCE; IT IS WHAT KEEPS THE CONFORMANT CASE
  BYTE-IDENTICAL.** A lone `NM1*87` with a valueless `N3~` reads `{ lines: [] }` at base and re-emits
  a bare `NM1*87*2~`. That is a pre-existing shape, not this item's, and a content-only rule would
  have silently changed it to no pay-to loop at all. Pinned as a control.

- **🩺 THE COST, MEASURED AND DISCLOSED RATHER THAN ARGUED AWAY: a repeat that states only PART of an
  address re-emits only that part.** A second `NM1*87` followed by an `N4` and no `N3` reads
  `{lines: [], city: "SHELBYVILLE", ...}` and emits `NM1*87*2~N4*SHELBYVILLE*IL*62565~`, a Loop 2010AB
  with no `N3`, where base emitted a complete-looking address assembled from two. **Keeping the
  earlier occurrence's street lines there IS the fusion** - one sender's street under another
  sender's city - so a future reader must not "finish the job" by restoring them. In
  `KNOWN-LIMITATIONS.md`, the troubleshooting row and the `CHANGELOG`.

- **THE WARNING IS WHAT MAKES ANY RESOLUTION DEFENSIBLE.** `X12_837_PAY_TO_ADDRESS_REPEATED`, the
  28th Tier-2 code (additions-only), factory `payToAddressRepeated(position)`. The model has ONE slot
  and the document named two addresses, so whatever rule is applied loses one of them; both refuted
  remedies lost one SILENTLY, and that is the word the refutations turned on. Anchored at the
  repeated `NM1*87`, no `elementIndex` (a second occurrence of a segment is not a defect in an element
  of it). Once per repeat. **The counter resets at the Loop 2000A `HL`, beside the slot it guards** -
  a latching one reports a conformant second billing provider as a repeat, and that has its own red
  control.

- **CENSUS, RUN NOT DERIVED: 13 of 27 red** with head's new file run against a base checkout of the
  walker (`src/parser/warnings.ts`, `src/index.ts` and the new `address-segments.ts` copied in so the
  imports resolve; `get-837.ts` and `build-837.ts` left at base). **The 14 green are all labelled
  controls**, and six of them are the "does not erase" model and emit assertions, which MUST be green
  on base: they exist to prove the remedy does not reproduce remedy 1's and remedy 2's refutations,
  so a red there would mean the fix had reintroduced the erasure. **Both figures are the CORRECTED
  file's** - the first version of them, 12 of 26, was measured on a file carrying the vacuous test a
  refuter then found. Re-run, never adjusted by arithmetic.

- **EVERY GUARD HAS ITS OWN RED NEGATIVE CONTROL, and the four are not interchangeable.** Removing
  the per-occurrence reset reds **7**; committing unconditionally reds **4**; latching the counter
  reds **1**; pointing `getCurrentPayToAddress` back at the committed slot reds **7**.

- **🩺 THE ANCHOR PROBE WAS WRONG ON ITS FIRST RUN AND THE MODEL CORRECTED IT** - this repo's
  standing "a probe that disagrees with the model's own shape measures nothing", hit again. It
  asserted `tx.segments[segmentIndex - 1]` and read an `N4`. The walker iterates
  `tx.segments.slice(1)` (the `ST` is dropped) and anchors at `i + 1`, so `segmentIndex` indexes
  `tx.segments` DIRECTLY. Measured against the source, not assumed, and the corrected assertion also
  pins `elements[1] === "87"` so it cannot pass on the wrong segment kind.

- **NOT DONE, AND THE REASON IS THE BYTE BUDGET RATHER THAN A JUDGEMENT ABOUT THE TRAP: this item
  added NO `CLAUDE.md` trap.** That file measured **52,903** against a hook entry of **52,912**, so a
  trap of this one's size had to be paid for by relocating roughly 1,150 bytes first, and the only
  passages carried here verbatim sit inside four unrelated traps - including the `build835` balance
  terms, which `CLAUDE.md` itself says are enumerated "because a count without its list cannot
  self-correct". **Cutting four traps to buy room for a fifth is the exact failure mode the bound
  exists to prevent**, and lowering the entry is an umbrella-owned act outside this slice's scope.
  The imperatives are here instead. **The next agent to work this area should read this section
  before the pay-to route**, and a trap line here is owed the next time that file has room.

- **Two `PRE-EXISTING` findings carried forward UNCHANGED, both filed by `#80`'s refuters and neither
  this item's:** an `NM1*87` arriving while a `CLM` is open never reaches the pay-to route (the
  `context.kind === "loop2000A"` guard) and lands among provider roles, at a level the bullet below
  says never to state as one; and `attachContact`'s `/* v8 ignore */` comment still calls
  its `payToAddress` arm "structurally unreachable in v1", which a `PER` after an `NM1*87` reaches.
  **Neither is warned by the new code and the new code does not claim to reach them.**

- **🩺 THE FIRST OF THOSE TWO HAS A DESTINATION THIS SLICE PUBLISHED WRONG ON TWO SHIPPING SURFACES,
  AND A REFUTER MEASURED IT. NEVER RESTATE IT AS ONE DESTINATION.** The backlog item and the prior
  slice both say the `CLM`-open `NM1*87` "lands in `claim.providers`". Measured here, head and base:
  that holds only where **no Loop 2400 is open**. With one open it lands on that line's
  `serviceLine.providers` instead - `get-837.ts` tests `currentServiceLine` FIRST and only falls to
  `currentClaim` when no line is open - and a provider at line level is TR3 Loop **2420**, not 2310. **NAME THE LOOP, NEVER ITS LETTER SPAN:** a remedy draft wrote `2420A-H`, which is 837P's
  range, on a sentence generalized over P/I/D whose I and D ranges are shorter - the census shape
  `X12-VARIANT-LOOKUP-PROTOTYPE` forbids, committed while fixing a different overclaim. Cut back to
  `2420`, which is how the rest of this repo already writes it.
  The unqualified form was corrected on `KNOWN-LIMITATIONS.md`, `docs-content/troubleshooting.md`
  and the `CHANGELOG` **after** it had shipped in the branch, which is the fifth consecutive slice in
  this lineage where the parser graded correct and the prose did not. **A pre-existing behaviour
  re-described more confidently than it is true is an INTRODUCED defect**, because the confidence is
  new even where the behaviour is not.

- **DEFERRED, EXPLICITLY, AND NOT STARTED HERE: the `X12Decimal | undefined` breaking slice.** An
  absent required `SV1-02` still reads a confident `0`. It is its own unit and touching it inside
  this one is what the item forbids.

### Relocated from `x12/CLAUDE.md`, 2026-08-10, VERBATIM, NOTHING DROPPED

Moved here to pay for the `X12-ISA-ELEMENT-ARITY` trap under this repo's zero-headroom ratchet.
The imperative stays in `CLAUDE.md`; the bullets are the text that was there, unchanged.


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

## `X12-PRE-005010-RUNTIME-MESSAGE` (2026-08-11)

Closes the runtime half of the overclaim `#119` corrected in comments and **deliberately left
standing at run time**, in agreement with `pre005010`'s docblock twin rather than corrected in one
carrier only. That was the right call and it is this slice's starting point.

Provenance: this repo's own source tree at `84c6f11` and at the head of this slice, measured with
`tsx` and with `vitest` against `src/`, never inferred. The only spec statements the diff carries are
that the interchange control version number is ISA-12 with `00501` the HIPAA baseline and that the
ISA is a fixed-width header whose 16 element separators sit at declared byte positions; both were
already in this tree at base (`envelope.ts`, `types.ts`, `KNOWN-LIMITATIONS.md`,
`detectDelimiters`), and neither is newly derived here. **No TR3 is cited and none is needed** - the
defect rests on this package disagreeing with itself.

**Read side. Nothing on the build side moved. No guard, code, position or control flow moved. The
emitted JS is NOT byte-identical here, and that is the point: the carrier is a runtime value.**

### The re-measurement, which held

The filed line reproduces on the base. `parseX12` on one interchange per row, reading ISA-12 at its
own fixed byte offset and again off the element split:

```text
construction             ISA-12 at its fixed offset  elements[12]  X12_PRE_005010  other codes
spec-clean               "00501"                     "00501"       silent          -
ISA-12 declares 00401    "00401"                     "00401"       FIRES           -
ISA-05 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-06 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-08 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-13 carries `*`       "00501"                     "00501"       silent          X12_ISA_EXTRA_ELEMENT_SEPARATOR
```

`#119` published the `ISA-06` row. **Two further constructions falsify the cell on their own and are
not the same element**, which is why no member is named. The `ISA-13 carries *` row is the control
that forbids the shortcut "an extra element separator falsifies the cell": it carries one, and the
code stays silent.

### The defect

The guard is `el(isa.elements, 12) !== "00501"` (`envelope.ts`). The message a consumer reads off
`w.message` was:

> ISA-12 declares a version other than the HIPAA baseline "00501", so the input may diverge from
> 005010 semantics. The declared version is preserved verbatim on the model.

Both halves presuppose a header that framed. The first asserts what ISA-12 declares; on the three
falsifying rows ISA-12 declares `00501` at its own fixed offset and the code fires anyway. The
second calls what the guard read "the declared version"; on those rows it read `"^"`, the in-band
repetition separator, which is not a version at all. **The second half carries the same
presupposition as the first, which is why it moves too and not as a matter of style.**

### 🛑 No mechanism is named, and no closed set of them

Fixed-width padding and arity displacement each falsify a cell on their own, on documents that share
nothing. **Two are measured, a third is not ruled out, and the replacement names none of them**: it
states the condition (`X12_ISA_EXTRA_ELEMENT_SEPARATOR` also present, the header did not split into
`ISA` plus 16 elements) and leaves the account of that condition to the code that owns it. Nothing
here says which ISA element is special, which mechanism is the reason, or that the set is closed.
That story has been falsified five times in this repo and a sixth is not written.

### The remedy

| carrier                                                                | what the diff does                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `warnings.ts`, `WARNING_MESSAGES.X12_PRE_005010`                       | the assertion about ISA-12 and the phrase "the declared version" both go. The replacement names the element the guard read, states that raising the code does NOT establish that the header split into `ISA` plus 16 elements, and points at `isa.raw`. |
| `warnings.ts`, `pre005010` docblock                                    | the twin clause moves with it, so the two carriers stay in agreement.                                                                                                                                                                                   |
| `docs-content/troubleshooting.md`                                      | a THIRD spelling of the same assertion, "ISA-12 declares a version family other than `00501`", on a carrier that ships. Corrected.                                                                                                                      |
| `CHANGELOG.md` `[Unreleased]` and `.changeset/olive-donkeys-attack.md` | `#119`'s "`WARNING_MESSAGES.X12_PRE_005010` is untouched" is falsified by this slice and lands in the SAME release. **Deleted from both**, following `#119`'s own handling of `#116`'s stranded claim.                                                  |

**Deletion to nothing was not available on the message.** The falsified clause is the sentence's
subject, and a message with no subject is the failure mode the envelope-value-routes note names
("a deletion can strand the sentence's subject"). It is SCOPED to what the guard read, the same
remedy `#119` applied to the 1-indexed mapping, and no shift is quantified.

**What is NOT done:**

- **The guard is not moved to the fixed offset.** That is a behaviour change on published decoding:
  it would change which interchanges raise this code, and this row is a message defect. Filed below.
- **No warning is suppressed, narrowed or re-framed, and no code was added.** The census pins that
  the same interchanges raise the same codes at the same positions as before.
- **No value is echoed.** The message stays a static table lookup, asserted by the census.

### The test, which is the difference from every prior slice in this lineage

`test/parser-pre-005010-message.test.ts`. Every accuracy finding in this repo's review history has
been a claim in a prose carrier that no test could fail on. **A runtime message can be failed on.**
The file pins the six cells, pins that more than one construction falsifies the claim, asserts the
message matches none of the three falsified spellings, asserts registry membership, asserts the
position is unchanged, and asserts no consumer byte reaches the message.

**Negative control, run:** the base message copied back over the head one reds the file
(1 failed, 9 passed) on the `ISA-12 declares` assertion; restoring the head greens it (10 passed).
The base file was restored **by file copy, never `git checkout --`**.

### The sweep, and what its anchor cannot see

Anchors, tree-wide over `git ls-files` with `dist/` excluded (untracked here in any case):

```
declares a version | declares any version | declares .{0,20}other than
HIPAA baseline | HIPAA-mandated baseline
```

Every line those anchors return at base is triaged below, because a result whose triage is
unpublished cannot be reconciled by whoever re-runs it. **Count the rows rather than trusting a summary figure; no total is
published**, in this note or anywhere. A draft published one and it was wrong. One row spans two
lines, which the row itself discloses.

| line at base                                              | disposition                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/parser/warnings.ts:278`                              | CARRIER, the runtime message. Corrected.                                                                                       |
| `src/parser/warnings.ts:479-480`                          | CARRIER, the docblock twin, one clause across a hard wrap. Corrected.                                                          |
| `docs-content/troubleshooting.md:80`                      | CARRIER, ships. A third spelling ("version family"). Corrected.                                                                |
| `CHANGELOG.md:179`                                        | CARRIER, `[Unreleased]`, freezes on release. Deleted.                                                                          |
| `documentation/agent-notes.md#x12-isa-value-pointers-2026-08-11:183` | RECORD, not a carrier: it QUOTES the base text as the filed residual. Left standing.                                           |
| `documentation/agent-notes.md#x12-isa-value-pointers-2026-08-11:10`  | NOT a carrier: names `00501` as the HIPAA-mandated baseline, which is true and is not a claim about what any element declares. |
| `src/parser/types.ts:132`                                 | NOT a carrier: `#119`'s own remedy, ISA-12's semantics restated at segment level, where they are true.                         |

`.changeset/` was swept separately and by name, because prose anchors do not reach it:
`olive-donkeys-attack.md` carried the same claim and freezes on release.

**🛑 That is a result about clause literals, not about the defect.** `#116`'s gate found a carrier
its ten-literal sweep never named. **No claim is made that the errata set is exhaustive, and no
count is published as a closed total. Finding one more is expected and is not a new finding.**

**What the anchors CANNOT see, stated as part of the claim:**

- a claim about ISA-12 that never writes "declares" or "baseline" ("the version element", "ISA-12 is
  not 005010");
- the same claim in a code comment introduced with `//`, which no anchor here reads;
- a claim carried by a variable or function NAME rather than by text;
- a claim in the built `dist/` twins, which are derived and untracked, and any untracked file;
- a claim split across a hard wrap between "declares" and its object;
- anything outside this submodule.

**🩺 `grep -c` against a file has been measured in this container to report no match on a file `rg`
finds hits in.** Every count above was taken with `rg` and re-taken with a `node` read, and both
agreed.

### Controls

- **The emitted JS DOES change**, unlike `#119`. `dist/index.mjs` `4898ca0cccd204345ae1c2254d7c21bc`
  -> `2336aacd519e280dd315ace390cd44b9`, `dist/index.cjs` `7b544863ba4e79c5a4b08dfcd0cbd91b` ->
  `3a3b908e7e0e80d1d6d59094c3b7d3a2`, built from both trees. **The base pair reproduces `#119`'s
  published hashes exactly**, which is what establishes that this is its base. **This is the control
  that has force here**: the inverse of `#119`'s, and the reason the row was a different carrier.
- **The change is ONE LINE in each emitted twin** and it is the message string: line 197 of
  `dist/index.mjs`, line 199 of `dist/index.cjs`. Each twin has the same line count at head as at
  base. No guard, no branch and no position moved, which is the diff-level form of "nothing was
  re-framed".
- **The `.d.ts` / `.d.cts` twins are byte-identical to each other** at base
  (`4452179d6c8e91245e3fc22e0388c50a`) and at head (`37613399fb38179adefce20425d9663e`), so the
  corrected docblock reached both.
- **The falsified spellings are gone from all four shipping carriers.** `ISA-12 declares`: 1 -> 0 in
  each of `index.d.ts`, `index.d.cts`, `index.mjs`, `index.cjs`. `the declared version`: 1 -> 0 in
  `index.mjs` and `index.cjs` (0 at base in the declaration twins, where the docblock never carried
  that phrase). Taken with `rg` and re-taken with a `node` read, both agreeing on every zero.
- **The base tree was restored by file copy, never `git checkout --`.**

### Filed, not absorbed (ADR 0016 rule 2)

- **The guard still reads the split rather than the fixed offset.** Moving it is a behaviour change
  on published decoding and needs its own slice, with the `X12_ISA_EXTRA_ELEMENT_SEPARATOR` ordering
  in scope. **PRE-EXISTING**, reproduces on the base, untouched here. **The direction that matters is
  the MISS, not the over-fire**, and it is measured rather than reasoned: **an interchange declaring
  `00401` at ISA-12's own fixed offset can read `elements[12] = "00501"` and leave
  `X12_PRE_005010` SILENT**, with `X12_ISA_EXTRA_ELEMENT_SEPARATOR` and
  `X12_CONTROL_NUMBER_MISMATCH` raised. **The recipe is deliberately not written here**, because a
  draft wrote one that under-determined the plant. Build it the way the census above was built, with
  `parseX12` over a hand-assembled header. Not stop-the-line: the header is loudly non-conformant on
  two other codes and no clinical or financial value is mis-read. **Do not read this as a rule over
  which elements do it, and no mechanism is named.**
- **🩺 `docs-content/cookbook.md` ships the CONVERSE of what this slice corrected**, on a
  consumer-facing surface: a `X12_PRE_005010` branch commented _"sender is on a pre-005010 version
  family: tolerated, not fatal"_. False two independent ways, each alone: the displacement rows above
  (the sender is on 005010 and it fires), and the guard being an inequality, so a LATER family
  (`00602`, `00700`) raises it too, which `pre005010`'s own docblock states. **PRE-EXISTING**,
  reproduces on base, and **the anchors above cannot see it** (it writes neither "declares" nor
  "baseline"), which is that disclosed blind spot paying out. **Its own row.**
- **`src/parser/envelope.ts:344`**, the `// Pre-005010 detection` comment three lines above the guard,
  and the local `const isa12`. Same overclaim, same function. **PRE-EXISTING**, and confirmed NOT in
  the built twins, so it does not ship; `//` comments are a disclosed blind spot of both the anchors
  and `check:no-internal-refs`.
- **`CHANGELOG.md:172`**, `#119`'s own "Measured on 005010 interchanges, one per row", carries the
  same qualifier slip this slice deleted from its own three carriers. It is in `[Unreleased]` and
  freezes on release. **PRE-EXISTING and deliberately NOT absorbed** (ADR 0016 rule 2).
- **`KNOWN-LIMITATIONS.md`'s ISA census** already states the correct account and is a MEASUREMENT.
  Left alone deliberately.
- The `docs-content/` value comments, `spec-notes-envelope.md:74`, the `parse-ta1.ts` /
  `KNOWN-LIMITATIONS.md` `X12Segment.elements` mis-citation, the ST-03 keys, `caller-string.ts:493`,
  the TA1-02 refusal message, the `noop` sink, `?~`, the TA1 whitespace slots, the `specClean` and
  BUILD halves of the ISA arity, the five `meta.note` runtime strings, the disjunctive gate samples,
  the `agent-notes/` path in a shipped doc comment, the `cookbook.md` dead link and the org-ruleset
  gap all remain their own rows, and the `PRE-EXISTING` lines in the umbrella's `repos/x12.md` are untouched.

### The budget

`x12/CLAUDE.md` was AT its ratchet with zero headroom (derived: file size equalled `REPO_CLAUDE.x12`
in the umbrella's size hook (since retired)). Paid by **deleting the clause this slice
falsifies** from the `X12-ISA-VALUE-POINTERS` trap, which is a correction owed anyway and not a
shortening for budget, plus a **verbatim relocation** where that was not enough. **No trap deleted,
no claim weakened, the ratchet not raised.** Derive the current figure; do not trust one written
here. **`REPO_CLAUDE.x12` is owed a lowering to match** - this slice is scoped to the submodule and
did not touch the umbrella, so that is left to the coordinator, as `#110`, `#111`, `#116` and `#119`
also left it.

## `X12-QUANTITY-SILENT-DEFAULTS` (2026-08-05)

> **RELOCATED IN FULL from `CLAUDE.md` on 2026-08-11, VERBATIM, NOTHING DROPPED.** It paid for the
> `X12-NO-INTERNAL-REFS-GATE` trap, on that trap's THIRD relocation: the hook refused the first
> correction by 70 bytes and the second by 78, and the answer to that is another relocation, never a
> shorter claim. The narrative it points at stays where it was, in
> `documentation/agent-notes.md#x12-quantity-silent-defaults-2026-08-05`; this file is the imperative
> set that used to sit in `CLAUDE.md` and it is unchanged below.

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

## `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` (2026-08-02)

**Relocated VERBATIM out of `CLAUDE.md` on 2026-08-09, nothing dropped**, to pay for the
`X12-EMPTY-CONTROL-NUMBER-FABRICATED` trap at the top of that file's list. The imperatives below
are LIVE; the narrative they point at is
`documentation/agent-notes.md#x12-segment-outside-transaction-dropped-2026-08-02` and
`documentation/agent-notes.md#x12---narrative-relocated-out-of-claudemd-2026-08-07`.

Open this before you touch orphan retention, `recordOrphan`, line-break tolerance, or the
`X12_UNEXPECTED_SEGMENT` messages.

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

## `X12-ST03-READ-NOT-RELEASE-AWARE` - the ST-03 readers published the escape

Item `X12-837-RESIDUALS`, slice `X12-ST03-READ-NOT-RELEASE-AWARE`. Base `49e7ac8` (`#108`). Last
verified 2026-08-09.

Filed by `#108`'s gate as `PRE-EXISTING` and left deliberately untouched there: it is what falsified
that slice's *"only typed reader"* claim, and the claim was CUT rather than the readers changed. This
is the slice that changes them.

### The census - re-measured at base, and the filed line was a FLOOR for the SIXTH time running

The backlog filed **three readers**: `get837Claims`, `get277Status`, `get278Request`.

Measured on the base tree: **four raw reads of `tx.st.elements[3]`, in three files, reached by five
public readers.** `walk277` is shared by `get277Status` and `get277CADisposition`; `walk278` is
shared by `get278Request` and `get278Response`; `get277CADisposition` carries a fourth read of its
own, which is an ADMISSION GATE and not a publish.

| # | site | reached by | role at base | in this slice |
|---|---|---|---|---|
| 1 | `claim/get-837.ts:286` | `get837Claims` | PUBLISH + KEY (`VARIANT_BY_ICR`) | publish decoded; key unmoved |
| 2 | `status/get-277.ts:142` (`walk277`) | `get277Status`, `get277CADisposition` | PUBLISH + KEY (`transactionType`) | publish decoded; key unmoved |
| 3 | `status/get-277.ts:130` | `get277CADisposition` | KEY only (admission gate) | untouched |
| 4 | `auth/get-278.ts:257` (`walk278`) | `get278Request`, `get278Response` | PUBLISH only | publish decoded |
| - | `ack/parse-999.ts:220` | `parse999` | PUBLISH, already decoded | the in-tree control, untouched |

**⚠ THE COLUMNS BELOW ARE THE SHAPES THAT WERE RUN, NOT SHAPE CLASSES.** Base and head, from bytes,
on one interchange per transaction set. Every cell `warnings: []` except where the body's own
`X12_MISSING_REQUIRED_LOOP` is present at both.

| ST-03 as framed | base publish (all 5 readers) | head publish | 837 `variant` | 277 `transactionType` | 277CA admitted |
|---|---|---|---|---|---|
| `005010X222A1` | `005010X222A1` | `005010X222A1` | unmoved | unmoved | unmoved |
| absent | `undefined` | `undefined` | unmoved | unmoved | unmoved |
| `""` | `""` / `undefined` (278) | `""` / `undefined` (278) | unmoved | unmoved | unmoved |
| `A??B` | `A??B` | **`A?B`** | unmoved | unmoved | unmoved |
| `A?*B` | `A?*B` | **`A*B`** | unmoved | unmoved | unmoved |
| `A?:B` | `A?:B` | **`A:B`** | unmoved | unmoved | unmoved |
| `A?~B` | `A?~B` | **`A~B`** | unmoved | unmoved | unmoved |
| `A?^B` | `A?^B` | **`A^B`** | unmoved | unmoved | unmoved |
| `A?XB` | `A?XB` | `A?XB` | unmoved | unmoved | unmoved |
| `AB?` (trailing) | `AB?~BHT` | **`AB~BHT`** | unmoved | unmoved | unmoved |
| `005010X21?4`, component `4` | `005010X21?4` | **`005010X214`** | unmoved | unmoved | unmoved |
| `005010?X222A1`, component `X` | `005010?X222A1` | **`005010X222A1`** | unmoved | unmoved | unmoved |

**No story about which reader is special is published.** The `""` row is a cell, not a claim: `""`
collapses to `undefined` in `walk278` and publishes as `""` in the other two, at base and at head
alike. The `AB?` row is the pre-existing `?~`-swallows-the-terminator framing residual showing
through - the element genuinely framed as `AB?~BHT` at base too, and that residual is
`X12-BODY-DEGENERATE-RELEASE-SEPARATOR`'s, still open and NOT absorbed here.

### The grounding, and the limit that stays unclaimed

**This package disagreeing with itself, exactly as `X12-TA1-RESIDUALS` was grounded.** Every
dot-path read - `elementValue`, `elementOptional`, `componentOptional`, all through
`getSegmentValue` - already unescapes, and `parse999` already decodes `AK2-03`, which is the
identically-named field in a sibling reader in the same tree. **No TR3 clause is claimed on either
side, and nothing here asserts what `ST-03` may contain.**

**No source exists for any normalisation rule** and none is introduced: nothing is trimmed,
case-folded or prefix-matched, and a whitespace-only `ST-03` publishes untrimmed. That is the same
reasoning that leaves whitespace-only control numbers padding by design.

### ⚖️ READ SIDE, and which precedent was followed

These are READ-side consumers. The nearest precedent is `#108`'s read half, which **unescaped**, and
that is what was done. `#101`'s *refuse over warn* call is a BUILD-side one and does not transfer: a
warning there would travel the parse channel a builder returns. Nothing is refused here and nothing
warns.

**The sink is a no-op.** `X12_DANGLING_RELEASE_CHAR` is dropped, exactly as `getSegmentValue`'s
default sink, `parseTA1` and `parse999` drop it - so every other element these readers decode drops
it too, and forwarding one at `ST-03` alone would make it the single element in the reader that
reports one. `PRE-EXISTING` and open; **not absorbed** (ADR 0016 rule 2).

### 🛑 The variant question, answered by measurement rather than by argument

`X12-VARIANT-ICR-UNGROUNDED` is what made `ST-03` decide an 837's variant, so the item required this
slice to say whether it moves one. **It does not, and that is a deliberate scope call rather than an
accident.** The three tests that DECIDE - `VARIANT_BY_ICR`, `walk277`'s `transactionType`, and
`get277CADisposition`'s admission gate - still key on the RAW element text.

What was measured, on an 837 whose only service segment is an `SV2` (so the `SVx` fallback resolves
`I`) and whose `ST-03` names the professional guide:

```text
delimiters                 ST-03 framed     decoded          base variant   if the key moved
conventional (* ^ : ~)     005010X222?A1    005010X222?A1    I              I  (no difference)
componentSeparator "X"     005010?X222A1    005010X222A1     I              P
componentSeparator "2"     005010X?222A1    005010X222A1     I              P
repetitionSeparator "A"    005010X222?A1    005010X222A1     I              P
```

On the `P` rows the `SV2` line **stops decoding** and `X12_837_SERVICE_LINE_NOT_DECODED` is raised -
that is the `X12-VARIANT-ICR-UNGROUNDED` property reaching a new set of documents, which is a change
to how an already published document decodes a service line and **materially bigger than a decode
fix.** The 277CA gate behaves the same way: with `componentSeparator: "4"`, `005010X21?4` decodes to
`005010X214`, so keying on the decoded text would admit through `get277CADisposition` a transaction
that returns `undefined` today, and flip `transactionType`.

**The reachability is precise and is worth stating exactly.** Raw and decoded differ only where the
sender escaped a byte the ISA declared as a delimiter, so a keyed decision could move only where a
declared delimiter is itself a character of a keyed identifier - which a letter or digit delimiter
makes admissible (`X12-EMIT-DELIMITER-SHAPE-UNCHECKED` deliberately left those admissible). On the
conventional set it can never move, measured in row 1 above.

**And the direction is one-way.** No identifier in `VARIANT_BY_ICR`, and not `ICR_277CA`, contains a
delimiter or the release character, so raw text equal to one decodes to itself: **nothing that
resolved a variant, or was admitted, at base stops doing so.** Moving the keys can only ADD
resolutions. That is what makes it a separate, weighable slice rather than a regression risk.

### What shipped

One `@internal` helper, `decodeSt03` in `src/transactions/shared/st03.ts`, called at the three
PUBLISH sites. **No warning code minted, no error code minted, no public TYPE changed, and the 277CA
admission gate is not touched at all** - but `X12_837_UNKNOWN_VARIANT`'s frozen MESSAGE TEXT does
change: the word *"verbatim"* is deleted from it, because this slice made it false. A message text is
consumer-visible, so it is disclosed in the changeset, `CHANGELOG.md` and `KNOWN-LIMITATIONS.md`
rather than treated as internal. **The code did not move and none was minted** - which is this repo's
own rule about what may change in a message.

**Mutation controls, by running:**

- Replacing `decodeSt03`'s body with `return raw` **reds this slice's own test file and NO OTHER
  file** - which is itself the finding: nothing in the suite pinned the raw-escape behaviour.
  **No count is published here; two were, and the pass-2 remedy made both stale by adding cells.
  Re-derive it by running.**
- Keying `VARIANT_BY_ICR` and `transactionType` on the DECODED text instead **reds exactly the two
  invariance tests** and nothing else. The invariance assertions are behaviour-sensitive, not
  vacuous.
- Negative control: the census harness run against `hl7`'s `src/` fails with
  `parseX12 is not a function`.

`tsc` exit 0 at head. **No suite total is published: it goes stale inside this slice's own
remedies.** Derive it by running.

### The claim sweep

**By WORDING across the whole tree, not file by file**, which is the `#102` lesson and what `#108`
needed.

**🛑 AND THE FIRST DRAFT OF THIS SECTION WAS ITSELF OVERSTATED, WHICH IS THE PASS-1 FINDING.** It
swept only for the PREDECESSOR's clause and never for clauses the NEW behaviour falsifies, while
claiming a whole-tree sweep. **A sweep is over the wording your change makes false, not over the
wording that made your change necessary.** The gate found four such carriers, three of which SHIP:

- `src/parser/warnings.ts:332`, the frozen `X12_837_UNKNOWN_VARIANT` message, said *"The **verbatim**
  reference is preserved on the model"* - and it fires **preferentially** on the very documents this
  slice changed, because the lookup keys on the raw text so an escaped `ST-03` is almost never in the
  table.
- `src/parser/warnings.ts:902`, the exported `unknown837Variant` JSDoc, which ships in the `.d.ts`.
- Two test comments, in `transactions-claim-837-variant-lookup.test.ts` and
  `transactions-claim-837-ambiguous-variant.test.ts`.
- `CHANGELOG.md` + `KNOWN-LIMITATIONS.md` cited *"exactly as `X12Segment.elements` documents"* for a
  type that is NOT an `X12Segment`, and whose own JSDoc says its elements *"IS decoded at envelope
  time"* - which reads as release-decoded. The citation is deleted and `types.ts` now says what
  "decoded" means there.

**Every remedy is a deletion of the falsified word**, plus one added disclosure sentence naming the
consequence the gate said was never stated: the published reference can name a guide this reader did
not resolve to.

**🛑 PASS 2 THEN FOUND THAT REMEDY WAS ONE WORD DEEP, AND THE LESSON IS THE SHAPE.** Deleting
*"verbatim"* left `X12_837_UNKNOWN_VARIANT` saying *"ST-03's reference is not an identifier this
reader recognises"* and, in the same breath, *"the reference is on the model; read it there"* - a
pointer at a field that on those very documents holds an identifier it DOES recognise, because
recognition reads the FRAMED text and the field is decoded. **The falsity was in the PAIRING, not in
the adjective.** The pointer is deleted from the message and from the `unknown837Variant` JSDoc; the
nuance went into the shipped disclosure rather than into a frozen message, because growing a message
is growth. `X12_837_AMBIGUOUS_VARIANT` carries the same recognition clause and points at SEGMENTS
rather than at the reference, so it needed no change once the pointer was gone.

**And the first disclosure drafted its own boundary wrong**: it said the divergence occurs where
*"neither `X12_837_UNKNOWN_VARIANT` nor `X12_837_AMBIGUOUS_VARIANT` is raised"*, which reads as a
bound. Measured on `componentSeparator: "X"` with `ST-03` framed `005010?X222A1`:

```text
body                          published        variant      warnings
SV1 only                      005010X222A1     P            [MISSING_REQUIRED_LOOP]
SV2 only                      005010X222A1     I            [MISSING_REQUIRED_LOOP]
no SVx at all                 005010X222A1     unknown      [UNKNOWN_VARIANT, MISSING_REQUIRED_LOOP]
SV1 then SV2                  005010X222A1     P            [AMBIGUOUS_VARIANT, MISSING_REQUIRED_LOOP,
                                                             SERVICE_LINE_NOT_DECODED]
```

### Pass 3 - `NOT REFUTED`, and its five minors are all deletions

Pass 3 opened no new attack and found no `INTRODUCED` blocker or major inside the remedy. Its five
minors are folded in **by deletion or narrowing, none by new text**, which is what it prescribed:
the `get-837.ts` comment still bounded the divergence by *"nothing warns"* (false on the two warned
rows, and the shipped disclosure it cited already says so); *"drops the word `verbatim`"* survived in
five carriers as a materially incomplete description of a whole deleted sentence; *"BOTH frozen
messages point at no model field"* overstated, since `X12_837_AMBIGUOUS_VARIANT` points at SEGMENTS,
which are framed and therefore consistent; and this note had published a suite total and a mutation
count that **its own pass-2 remedy made stale by adding two cells.** Both counts are deleted rather
than corrected - this note's own rule, applied to itself.

**🩺 The standing worry, unchanged and worth carrying forward: every finding in this lineage, now
across five slices and three passes here, has been a claim defect in a prose carrier. The parser
half was never refuted in any pass. Three of pass 3's five minors were the remedy falsifying its own
earlier sentences.** The code delta is one five-line helper and three call sites; the prose around it
is the part that keeps breaking.

**The published text differs from the keyed text in all four rows, and the RECOGNITION
disagreement - the code saying `ST-03` named no identifier it recognises while the model field holds
one it does - is warned in two.** Read it that way and not as "the reader resolved to a different
guide": on the `SV1` and `SV1 then SV2` rows the fallback resolves `P`, which IS the guide the
published text names. Both warned rows are pinned in
`test/transactions-st03-release-decode.test.ts`, on the whole warnings array.

The predecessor's clause was *"three more readers publish ST-03 raw"*. It was carried by `CLAUDE.md`,
`src/transactions/ack/parse-ta1.ts`, `test/transactions-ack-ta1-residuals.test.ts` and
`documentation/agent-notes.md#x12---the-two-ta1-residuals-the-acknowledgment-arc-left-open-x12-ta1-residuals`. **It is false in two ways now** - the readers no
longer publish raw, and the count was three where the measurement is four sites / five readers - so
each carrier is corrected, and the count is **deleted rather than restated**, because a live count
goes stale and this repo has been caught by exactly that.

The pending `[Unreleased]` `CHANGELOG.md` entry and the seven pending changesets were checked and
carry none of it, so **nothing had to be corrected by deletion in a frozen carrier this time**. The
shipped `docs-content/` pages were swept for the clause and carry none; `troubleshooting.md` gains
the disclosure because the behaviour is consumer-visible.

### The ratchet

`x12/CLAUDE.md` was at **49,897** with the umbrella's `REPO_CLAUDE.x12` lowered to match, so there
was **zero headroom**. The `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` `###` section was **relocated in
full, verbatim, nothing dropped** into `documentation/agent-notes.md#x12-emit-degenerate-release-delimiter-2026-08-09` first,
with a header recording that its "below" / "above" wording refers to `CLAUDE.md`'s ordering at the
time of the move. Nothing in it was measured false, so nothing in it is corrected. **No trap was
deleted and the entry was not raised.** Derive both numbers rather than trusting one written here.
**The ratchet lowering is OWED** and is an umbrella edit, so it is left to the coordinator.

### 🔴 Open, each its own slice - `PRE-EXISTING`, NOT absorbed (ADR 0016 rule 2)

- **The three ST-03 KEYS still read the raw text.** The measurement above is the case for and
  against moving them; it is a decision, not a defect to be swept up here.
- The `noop` sink drops `X12_DANGLING_RELEASE_CHAR` on these readers, matching `parseTA1` and
  `parse999`.
- `?~` still swallows the segment terminator, so an `ST-03` ending in a bare `?` frames long
  (`X12-BODY-DEGENERATE-RELEASE-SEPARATOR`).
- `src/builder/caller-string.ts:493`'s qualified role-asymmetry line; the TA1-02 usage-vs-type
  refusal message; whitespace building at the five TA1 slots; and the seven `PRE-EXISTING` in the
  umbrella's `repos/x12.md`.

---

### Relocated here 2026-08-09 from `CLAUDE.md`, to pay for the `X12-ENVELOPE-VALUE-ROUTES` trap

The inline trap block, **verbatim, nothing dropped**. The second relocation this slice needed: the
budget hook refused the pass-1 correction at +30 bytes, and the answer was another relocation rather
than a shorter claim.

#### 🩺 `X12-ST03-READ-NOT-RELEASE-AWARE` (2026-08-09) · `agent-notes/x12-st03-read-not-release-aware.md`

- **🩺 EVERY TYPED READER THAT PUBLISHES `implementationConventionReference` PUBLISHES IT
  POST-`?`-UNESCAPE, THROUGH ONE `decodeSt03`. FILED AS THREE READERS; MEASURED AS FOUR RAW READS
  OF `tx.st.elements[3]` IN THREE FILES, REACHED BY FIVE PUBLIC READERS** (`walk277` serves
  `get277Status` AND `get277CADisposition`; `walk278` serves BOTH 278 directions). **GROUNDED ON THIS
  PACKAGE DISAGREEING WITH ITSELF, NEVER ON A TR3 CLAUSE** - every dot-path read already unescaped
  and `parse999` already decoded AK2-03, the same field.
- **🛑 THE THREE `ST-03` TESTS STILL KEY ON THE RAW TEXT, DELIBERATELY; MOVING ONE IS A DIFFERENT
  SLICE:** `VARIANT_BY_ICR`, `walk277`'s `transactionType`, and `get277CADisposition`'s ADMISSION
  GATE. Measured: with `componentSeparator: "X"` an ST-03 of `005010?X222A1` decodes to a guide
  identifier, so keying on the decoded text makes **THE DECLARATION BEAT THE `SVx` FALLBACK**
  (`X12-VARIANT-ICR-UNGROUNDED`'s property) and **STOPS A SERVICE LINE DECODING**. **THE MOVE IS
  ONE-WAY: nothing that resolved or was admitted at base stops** - no identifier keyed on carries a
  delimiter or `?`, so a raw text equal to one decodes to itself.
- **⚖️ NO NORMALISATION AND NO NEW WARNING.** Nothing trimmed or case-folded; whitespace still
  publishes untrimmed. **THE SINK IS A NO-OP**, so `X12_DANGLING_RELEASE_CHAR` is dropped as
  `getSegmentValue`'s default, `parseTA1` and `parse999` drop it - `PRE-EXISTING` and OPEN, not
  absorbed.
- **🛑 PUBLISH THE CELLS, NEVER A STORY ABOUT WHICH READER IS SPECIAL.** Each reader's own `""` /
  absent mapping is UNCHANGED and pinned: `walk278` collapses `""` to `undefined`, the other two
  publish `""`.

## x12 - a stated amount discarded anyway (2026-08-07)

The two silent monetary drops `X12-AMT-ADX-ABSENT-AMOUNT` (`#84`) surfaced, disclosed on five
surfaces and pinned by tests, and deliberately did not fix: **neither is that code's shape.** Both
reproduced on `9db104b` and on `93c1886`. Its own file under `documentation/agent-notes/` rather
than in `documentation/agent-notes.md`, which stands at 249,982 of a 250,000-byte budget and refuses
the write.

### The two defects, measured at `93c1886` before anything was designed

| the wire                                 | what left the model                                   | at base                                 |
| ---------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| 820 `RMR****150.00*150.00~`              | the whole open item: RMR-04 150.00, RMR-05 150.00     | `openItems: []`, `warnings: []`         |
| 820 `RMR***PI*150.00~`                   | the same, plus RMR-03's payment action code           | `openItems: []`, `warnings: []`         |
| 820 `RMR****1,234.56~`                   | the same, and **no `X12_UNPARSEABLE_DECIMAL` either** | `openItems: []`, `warnings: []`         |
| 837 `AMT*EAF*75.00~` under an open `SVD` | a decoded Remaining Patient Liability row             | line and claim `amounts: []`, no report |

**The two causes are different and the harm is one harm.** `decodeRmr` answers `undefined` on ONE
condition, RMR-01 and RMR-02 both empty, and it does so **before** `elementDecimal` is called on
RMR-04 or RMR-05 - so nothing failed to decode and nothing was even attempted. The 837's `AMT` case
is the opposite: `decodeAmt` runs first and succeeds, and the row is then skipped by
`if (currentAdjudication !== undefined) break;`, a v1 scope limit on the adjudication model rather
than a failed read.

### What "the report INVERTS there" turned out to mean, once measured

At base, under an open `SVD`, with a claim and a line open:

| the `AMT`         | what was lost                                       | base report                                          |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------- |
| `AMT*EAF*75.00~`  | the qualifier **and** a stated 75.00                | **nothing**                                          |
| `AMT*EAF~`        | the qualifier only; no amount was ever stated       | `X12_AMOUNT_ROW_DROPPED`                             |
| `AMT*EAF*7,5.00~` | the qualifier; the amount was stated but unreadable | `X12_UNPARSEABLE_DECIMAL` + `X12_AMOUNT_ROW_DROPPED` |

So the channel's report was **monotonically decreasing in what was lost**: the ONLY case that
reached no channel at all was the one where the sender's money was fully legible and fully
discarded, and the two smaller losses each carried a code. That is the inversion, stated exactly.
It is not "the warning is wrong"; `X12_AMOUNT_ROW_DROPPED` is correct on every document it fires on.
It is that a consumer reading the warning channel to decide whether an amount row went missing got
the answer **backwards on the case that costs the most.**

### The decision: a new code, and why not `X12_AMOUNT_ROW_DROPPED`

Reusing the existing code keeps the consumer predicate surface small, which is the default answer
here, and the cause differing is **not** on its own a reason to add one. Two things decided against
it, and neither is "the cause differs":

1. **Reuse would have falsified a separator this package publishes, and that is the LOAD-BEARING
   reason.** The shipped
   `X12_AMOUNT_ROW_DROPPED` message tells a consumer that the presence or absence of an
   `X12_UNPARSEABLE_DECIMAL` at the same `position.segmentIndex` is what separates its two routes,
   so an unaccompanied instance means "the sender stated no amount". Folding `AMT*EAF*75.00~` in
   would make that reading **false on money**: unaccompanied, and a stated 75.00. Correcting a
   published separator is a bigger consumer break than adding a code beside it.
2. **A consumer does act differently, but ONLY on the `AMT` route, and this reason cannot carry the
   argument on its own.** There AMT-02 decoded before the row was skipped, so the value can be read
   back exactly. On the `RMR` route nothing of the kind is true: the row is refused before the
   decode is attempted, so the code lands on `RMR****1,234.56~` exactly as on
   `RMR****150.00*150.00~`. **A first draft published the recoverability reading as the code's
   MEANING, on six shipped surfaces including the changeset, and pass 1 refuted it with that one
   segment.** The remedy was to cut the claim back, not to grow the guard: decoding inside
   `statesAnAmount` to decide would mint `X12_UNPARSEABLE_DECIMAL` on documents that never raised
   it, which is the additivity break this whole lineage exists to avoid.

**One code for both routes, one message, no discriminant**, following this repo's own
`X12_837_SERVICE_LINE_DROPPED` precedent: the two routes call for the same action, so a discriminant
would be surface without a use. The property that covers both, stated as a property of the READ:

> the segment POPULATED its amount element, it arrived while the loop that would carry its row was
> OPEN, and the reader built no row anyway, for a reason that is not a failure to decode that amount.

**The two amount-row codes are disjoint by construction** - one requires an amount element that
decoded no value, the other one the sender populated - so they can never name the same segment, and
the code a consumer receives is itself the discriminant. Pinned.

### The bound, and why it stops where it does

The exclusion is **"no loop open to carry the row"**, and it is a real line rather than a
convenience. Those cases are a document putting an amount segment where this reader has nothing
open, which is a structural anomaly; the two closed here are a **fully open, ordinary context** in
which the reader still discards money. Still silent, unchanged, and disclosed:

- the 834's `AMT` with no `HD` coverage open, and the 820's `ADX` with no remittance open (both
  return before the amount is read);
- the 835's and the 837's `AMT` that DECODES with no claim and no service line open (both fall
  through the attachment chain).

**Do not widen this code into "a stated amount row is always reported".** Two more silences are
deliberate: a bare `RMR~` states nothing, so nothing was lost; and an identity-less `RMR` carrying
only RMR-03 loses a payment action code but no amount, and this code is about a stated AMOUNT.

### Two implementation notes that are load-bearing

- **The `RMR` guard is a PRESENCE test on RMR-04 / RMR-05, not a decode.** Reaching for the decimal
  sink to decide would raise `X12_UNPARSEABLE_DECIMAL` on documents that have never raised it -
  `RMR****1,234.56~` among them - which is precisely the additivity break this lineage was refuted
  for once. **The consequence is published rather than hidden, and it is the sentence pass 1 was
  refuted for getting backwards: on this route no `X12_UNPARSEABLE_DECIMAL` accompanies the report
  even where the bytes are unreadable, so an unaccompanied instance is NOT evidence that the amount
  is postable.** The code asserts nothing whatever about whether the amount would decode. Pinned by
  a case that asserts `X12Decimal.fromString("1,234.56")` is `undefined` beside the warning, so
  re-widening the prose into a promise of decodability reds the suite.
- **The 837 report is placed AFTER the `amount === undefined` branch, not before it.** An
  `AMT*EAF~` under an open `SVD` raised `X12_AMOUNT_ROW_DROPPED` at base and must keep raising
  exactly that; moving it onto the new code would be the "a widening that moves a case onto a new
  code" break. The ordering is what keeps it additive, and it is pinned by two ADDITIONS-ONLY cases
  rather than assumed.

### The census

**15 of 57 collected cases red** against a base tree restored from `93c1886` **by file copy**
(`git archive | tar -x` into a scratch directory, never `git checkout` in the live tree), with head's
three affected test files copied over it. The split:

- `test/transactions-stated-amount-discarded.test.ts`: **11 of 26 red.**
- `test/transactions-amount-row-dropped.test.ts`: **2 red**, both the disclosure pins `#84` wrote for
  these two defects, now inverted to assert the report.
- `test/warning-codes.snapshot.test.ts`: **2 red**, the code set and the additions-only count.

The 15 green in the new file are exactly the CONTROLs, the BOUNDs, the ADDITIONS-ONLY pins and the
one PRE-EXISTING disclosure pin, all of which must be green on both trees. Named, because a count
without its list cannot correct itself: the bare `RMR`; the RMR-03-only `RMR`; the `RMR` with no
remittance loop open; the identified `RMR` that builds a row; the identified `RMR` with no amount,
whose row survives; the `ADX` with no remittance loop open; the ABSENT `AMT-02` under an open `SVD`
keeping the old code alone; the UNPARSEABLE `AMT-02` under an open `SVD` keeping both old codes; the
same `AMT` with no `SVD` open, which lands on the line; the `SVD` row itself still decoding; the
decoded `AMT` with no claim and no line open; the 835's decoded `AMT` before any claim; the 834's
`AMT` with no `HD`; the 835's absent-amount document still raising the old code alone; and the
disclosure that the INVERSION survives at those excluded sites.

**An honest caveat about three of those greens.** The 837-no-claim, 835 and 834 exclusion BOUNDs
assert only the ABSENCE of the new code, and at base `WARNING_CODES.X12_STATED_AMOUNT_DISCARDED` is
`undefined`, so they pass there partly for a reason that does not exist on that tree. Their
load-bearing measurement is at head. The other eleven greens assert real code arrays with `toEqual`
and are load-bearing on both.

**Negative controls, one per guard, both red:** deleting the 820 `RMR` report reds **9** cases;
deleting the 837 adjudication report reds **7**. Three of those overlap, being the cases that sweep
both sites. Measured before the pass-1 remedy, on the 25-case form of the file; the remedy added two
cases and removed none, so the guards' controls are unchanged in kind.

**Wrong-package negative control:** the same file against an `hl7` tree restored the same way
collects every case and passes **none** of them, every one dying at `parseX12 is not a function`.
The apparatus is bound to this package's surface and cannot report green against another one.

### Deliberately not touched

The five other `PRE-EXISTING` findings carried in `X12-837-RESIDUALS` (a stray `SVx` re-typing a
submission; an `NM1*87` with a `CLM` open landing in `claim.providers`; `attachContact`'s
`/* v8 ignore */` arm; a Loop 2010AB short a Required `N3`; an `NM1*87` in Loop 2000B with no claim
open), and **SV3-06's TR3 usage, which is still not grounded** - do not claim it is.

**No TR3 usage code is asserted here either.** Nobody in this repo has read X218 for `RMR` usage or
X222A2 for the Loop 2430 `AMT`, and the argument does not need one: a row the sender wrote left the
model, which is true whatever the segment's usage is. `AMT*EAF` is named as Remaining Patient
Liability on the strength of this package's own dogfooded Loop 2430 spec, not of a TR3 clause.

**🔴 The INVERSION survives at the excluded sites, and that is disclosed rather than left to be
found.** With no claim open, an 835 `AMT*B6~` raises `X12_AMOUNT_ROW_DROPPED` while `AMT*B6*500.00~`
raises nothing at all: the same backwards reading this slice closed under an open `SVD`, one
loop-context over. `PRE-EXISTING`, identical on both trees, pinned by a case that asserts both
halves. Every published bound calls those sites "still silent", which is true; none of them may be
read as saying the channel reads the right way round there. Closing it is the same retention
decision as the rest of the no-loop-open family and belongs in its own slice.

**The model is unchanged.** No slot was widened and no row is retained that was not retained before.
This closes the SILENCE only. Retaining an identity-less `RMR` row, or modelling a Loop 2430 `AMT`,
are retention decisions with their own breaking-change cost and belong in their own slices.

## `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (2026-08-04)

**RELOCATED IN FULL from `CLAUDE.md` 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-EMIT-DEGENERATE-RELEASE-DELIMITER` trap, under that file's own ratchet (relocate first, lower
the entry as the relocation lands, never raise it to meet the trap).

The measurement, the sources and the refutation history are in
`documentation/agent-notes.md#x12-svc-element-map-off-by-one-2026-08-04`. What follows are the
imperatives, exactly as they stood in `CLAUDE.md`.

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

## x12 - an Accept `TA1` this library emitted read back as a Reject (`X12-TA1-EMIT-NOT-RELEASE-AWARE`)

The emit-side slice `#96` (`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`,
`x12-envelope-release-split.md`) named as its sharpest residual and deliberately did not take. Its
reason was one sentence and it was the whole difficulty: **escaping in `buildTA1` changes bytes
already on the wire.** This slice weighed that and took it. Read `x12-envelope-release-split.md`
first; this file is the extension, not a restatement.

### The defect, measured

`buildTA1` joined its five caller-supplied elements with the element separator and released none of
them, so a value carrying an active delimiter took a slot of its own and shifted every element after
it down one. TA1-04 is the disposition, TA1-05 the note, and `parseTA1` narrows an out-of-enum
TA1-04 to `R`. Measured at base `e8f34b9` with `parseX12` + `parseTA1` over
`ISA … <what buildTA1 returned> … IEA`, `ackCode` `"A"` and `noteCode` `"000"` throughout:

```text
icn            raw                                 read ackCode  read TA1-01          warnings
"000000001"    TA1*000000001*260601*1200*A*000     "A"           "000000001"          []
"00000001?"    TA1*00000001?*260601*1200*A*000     "R"           "00000001?*260601"   []
"0000*0001"    TA1*0000*0001*260601*1200*A*000     "R"           "0000"               []
"0000~0001"    TA1*0000~0001*260601*1200*A*000     "R"           "0000"               [X12_UNEXPECTED_SEGMENT]
```

**🩺 `#96` named the `?` row. The `*` and `~` rows are the same inversion and were live on EVERY
released version** - they need no release-aware splitter, because a bare delimiter has always ended
its element. That is the finding that made the slice bigger than the residual as filed, and it is the
argument against reading `#96`'s framing as "a regression this arc introduced": one third of the class
is new, two thirds are as old as the builder.

**🩺 The inverse is the less safe direction and it is not symmetric with the first.** The read narrows
an out-of-enum TA1-04 to `R`, so every WELL-TYPED shift lands on Reject - fail-safe. But `noteCode`
is `Ta1NoteCode` to the type system and unchecked at run time, so a JS or JSON caller can supply
literally `"A"`, which the shift moves onto TA1-04: **a Reject reads back as an Accept**, and a
sender who reads an Accept does not resubmit.

### The decision, and the direction the consumer predicate moves

**The grounding is INSIDE the package, exactly as `#96`'s was, and it is not a spec fact.** Nobody
here has read a 005010 clause that settles what a `?` before a separator means; `#96` recorded that
the class is symmetric and broke the tie on consistency with `decodeSegment`. **Do not re-derive that
as spec.** What grounds _this_ slice is narrower and is a fact about this tree: `buildTA1` emitted
bytes that this package's own reader decoded into a **different disposition than the caller asked
for**, while every other builder already released the same class of element through the same helper.
One function disagreeing with itself, which is the same shape `#96` used.

**🛑 THE PREDICATE MOVES IN BOTH DIRECTIONS, exactly as `#96`'s did. A draft of this note said "ONE
direction, nothing starts" and pass 1 refuted it in one probe.** No code is minted and no case moves
onto a new code, so **state the PROPERTY and derive the directions from it, never list them:**

> At head, `parseTA1` of a `buildTA1` output reports the disposition and note **the caller passed**.
> At base it reported whatever element the shift left in slot 4, which could be the caller's, a
> coincidental in-enum value, or an out-of-enum one the read narrows to `"R"`.

Because base was arbitrary, every predicate over `ta1.ackCode` gains cases as well as losing them:

- `ackCode === "R"` **stops** firing where an Accept was shifted onto it (`"0000*0001"`,
  `"0000~0001"`, `"00000001?"` in TA1-01);
- `ackCode === "R"` **starts** firing where a Reject was shifted OFF it - and this needs no
  type-forbidden value at all: `interchangeTime: "12*A"` with `ackCode: "R"` read `"A"` at base and
  reads `"R"` here, every field a valid member of its union;
- `ackCode === "A"` moves the same two ways.

The direction of SAFETY is what is one-way, and it is a different sentence: nothing at head reports a
disposition the caller did not ask for. **Do not compress that into "the predicate moves one way."**

### The cost, which is bytes, bounded

- **A value containing none of the four delimiters and no `?` is emitted byte-for-byte as before**,
  and that is every conformant TA1: TA1-01 echoes ISA-13, TA1-02 / TA1-03 echo ISA-09 / ISA-10, and
  TA1-04 / TA1-05 are code list values. Pinned.
- **🛑 WHAT RELEASING THE REST OF THE SET COSTS - AND TWO DRAFTS OF THIS BULLET WERE REFUTED, THE
  SECOND BY THE CORRECTION TO THE FIRST.** Pass 1 killed "the one class whose bytes get worse"; the
  replacement said the remaining values were released "for no framing gain" and pass 2 measured that
  **inverted**. What is actually true, measured on both trees:
  - Only `*`, `~` and a `?` IMMEDIATELY BEFORE the separator ever shifted the segment's own element
    framing. That much survives.
  - **`^` and `:` moved this package's DOT-PATH reader, and releasing them is a GAIN there.**
    `getSegmentValue(ta1, "01")` answered **`"0000"`** at base for a control number of
    `"0000^0001"` - the reassociation key silently truncated to repetition 0, because that reader
    splits repetitions with `splitWithRelease` - and answers `"0000^0001"` here. The composite read
    `"01-1"` answered `"0000"` at base for `"0000:0001"` and answers the whole value here.
  - **The measured pure cost is a MID-STRING `?`, and only on the surfaces documented as RAW.**
    `raw` and `elements` read `"0000??0001"` where they read `"0000?0001"`;
    every dot-path read unescapes and answered `"0000?0001"` on BOTH trees.
    **🩺 THIS LIST NAMED `parseTA1`'s FIELDS AS A THIRD SUCH SURFACE AND THAT ENTRY IS DELETED, NOT
    REWORDED** - `X12-TA1-RESIDUALS` made them post-unescape.
  - **A caller who was hand-rolling the escape regresses on both kinds of surface** - the remedy
    `KNOWN-LIMITATIONS.md` published while this was open. `"00000001??"` in, `TA1*00000001????*…`
    out, and `getSegmentValue` answering `"00000001??"` where it answered `"00000001?"`.
  - **`getSegmentValue` takes an `X12Segment` and `Ta1Segment` carries no `id`**, so every dot-path
    example above needs one added. The runtime never reads it; the types do.
  - **NO TOTAL IS PUBLISHED. This is what was measured, not a closed account** - which is the lesson
    of the two refuted drafts, not a hedge added after them.
- **Releasing `:` and `^` was a DECISION BEFORE it was measured to be a gain, and the argument that
  carried it stands on its own.** `?` has no choice: `escapeRelease` / `unescapeRelease` are a
  bijective pair only if the release character is ALWAYS released, so releasing it conditionally on
  position would break the invariant the fix rests on. `:` and `^` did have a choice, and the
  alternative was a bespoke escaper that is a SUBSET of `escapeRelease` - which puts `buildTA1` back
  outside `makeCallerEscaper`, the chokepoint whose absence this whole class came from, and which
  `test/builder-string-type.test.ts` requires of every builder module. **Record that ordering
  honestly: uniformity was the reason, the dot-path gain was found afterwards by a refuter, and the
  slice does not get to claim it foresaw it.**
- **🩺 The READ half did not move IN THIS SLICE, and the sentence that stood here in the present
  tense - "`parseTA1` reads elements RAW, pre-`?`-unescape ... the round trip is still not an
  identity on a released value" - IS DELETED, NOT REWORDED.** It was the accurate record of `#97`
  and is measured false at head. This slice left `"00000001?"` reading back as `"00000001??"` rather
  than as `"00000001?*260601"`; **`X12-TA1-RESIDUALS` is the different slice that closed it**, and
  the decoded fields are post-unescape now. Do not restate the deleted form.

### 🛑 Why the release is scoped to a delimiter set the CALLER states

`BuildTA1Options` gained `repetitionSeparator` / `componentSeparator` / `segmentTerminator` beside
the existing `elementSeparator` - the same four `Build999EnvelopeSpec` already takes, so this is the
ack family's existing shape rather than invented API. **They exist for escaping and nothing else;
`buildTA1` still emits no terminator, no repetition and no composite.**

The reason is a defect the obvious implementation would have introduced. `escapeRelease` releases the
four delimiters it is handed plus `?`, and `unescapeRelease` preserves `?X` verbatim for any `X`
outside the reader's declared set. So releasing against a **guessed** delimiter inserts a `?` before a
byte that is not a delimiter where the segment lands, and the value comes back carrying a stray `?` -
a silent corruption of a reassociation key that was correct before. Escaping the element separator
alone would have left the `~` row above open; escaping the archetype set unconditionally would have
minted that corruption for every non-archetype caller. Stating the set is the only option that does
neither. **The defaults are still the Cosyte archetype and the function cannot verify them** - that
is unchanged in kind from before it escaped anything, but it now has a byte-level consequence, so it
is pinned rather than claimed away.

### The type check was a PREREQUISITE, not a bonus

Routing the five elements through `makeCallerEscaper` is what makes them released, and it type-checks
first. Writing `escapeRelease(value, delimiters)` inline instead would have reintroduced
`X12-NUMERIC-VALUE-EMITS-EMPTY` exactly: the bare helper returns its **empty accumulator** for a
`number`, so the slice would have replaced a shifted TA1-01 with a **vanished** one. It also would
have red `test/builder-string-type.test.ts`'s "leaves `escapeRelease` reachable only from the
chokepoint".

So a non-string element now refuses with `AckBuildError` / **`X12_ACK_INVALID_SPEC`, an EXISTING
code**. No new code was minted: a consumer does not have to act differently on a wrong-typed TA1
element than on `build999`'s, and minting one because the CAUSE differs is what moves cases off
predicates consumers already wrote. At base a numeric control number emitted `TA1*12345*…` with the
**number surviving onto `elements`, inside a value typed `readonly string[]`**, and an absent one
emitted `TA1**250101*…`. **`enforceAcceptIsClean` still runs FIRST**, so a spec tripping both guards
still reports `X12_TA1_ACCEPT_WITH_NOTE` and no existing refusal moves code. Pinned.

### What was retracted rather than reworded

Seven committed tests and eight documents asserted the old behaviour as a disclosure or as a
justification. A disclosure that becomes false is retracted, not softened:

- `.changeset/rare-hoops-smoke.md` (`#96`'s, still pending on `main`) carried the falsified
  `buildTA1` paragraph. **Corrected by DELETION, never by rewording**, and the `CHANGELOG.md`
  `[Unreleased]` copy of it the same way. `.changeset/olive-pugs-repeat.md` (`#95`'s) was read and
  falsifies nothing here - it is about `build837`'s guide identifier.
- `test/parser-envelope-release-split.test.ts` pinned the inversion as `#96`'s sharpest disclosure.
  It now pins the closure and hands the case to `test/transactions-ack-ta1-escape.test.ts`; the
  `buildInterchange` GS-04 / GS-05 / GS-07 half stayed there until
  `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` closed it and rewrote that pin too.
- `test/builder-segment-type.test.ts` pinned "emits a non-string TA1-01 with no error and no
  warning" and "also admits an unescaped delimiter". **Both now pin the closure.** Its source gate
  keyed on `.join(elementSeparator)` and now keys on `.join(delimiters.element)`.
- `test/builder-string-type.test.ts` asserted NINE escaper declarations with `build-ta1.ts` pinned as
  the deliberate absence, on a justification ("every TA1 element is fixed-width and goes through
  `pad`") that `caller-string.ts` had already measured false in both halves. TEN now.
- `test/builder-refusal-bounds.test.ts`'s refusal-site count moved by one; the module count did not,
  because `build-ta1.ts` already raised.
- `src/builder/caller-string.ts`, `caller-segment.ts`, `caller-decimal.ts`, `parse-ta1.ts`,
  `KNOWN-LIMITATIONS.md` (three sites), `docs-content/troubleshooting.md` and
  `documentation/agent-notes.md` each carried a form of "`buildTA1` escapes nothing" or "nothing
  checks it". **The `seg` / `joinSeg` qualifier is UNCHANGED and must stay** - `buildTA1` still uses
  no joiner, and what that still costs it is the **slot** in the refusal message, which names the
  builder and never `TA1-01`.

**🩺 And a count was DELETED rather than corrected.** `documentation/agent-notes.md` published "`esc`
is unary and invoked 411 times on 378 lines" while the gate asserted 407 - already drifted, in a file
whose whole lesson is that a count duplicated in prose drifts. The prose figure is gone; the gate
still asserts both numbers.

### The probe discipline

The probe ran under a `mktemp -d` path unique to this repo and process, and against `@cosyte/hl7` as
a negative control, where it must report INAPPLICABLE (no `buildTA1` / `parseTA1` pair). A probe that
cannot fail measures nothing.

### Deferred, each its own line

- **`buildInterchange` still does not escape GS-04, GS-05 or GS-07.** Same class, different builder,
  still pinned in `test/parser-envelope-release-split.test.ts`. **CLOSED by
  `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` (2026-08-08)** - `documentation/agent-notes.md#x12-interchange-gs-emit-not-release-aware-2026-08-08`.
- **`buildTA1` still has no segment joiner**, so `requireCallerSegment` never names its slot.
- **`parseTA1` does not unescape**, so a released TA1-01 reads back carrying its `?`. Read-side
  widening, would move every TA1 a consumer already reads.
- **`splitWithRelease` has no degenerate-`?`-separator guard for BODY segments** (`PRE-EXISTING`,
  wider blast radius than the envelope case `#96` closed), and a mid-segment **dangling `?`** raises
  no `X12_DANGLING_RELEASE_CHAR` in envelope or body. Untouched here.
  **The first half CLOSED 2026-08-09 by `X12-BODY-DEGENERATE-RELEASE-SEPARATOR`**, in
  `decodeSegment` and for the ELEMENT role only. **The dangling half was re-measured there and is
  NOT REACHABLE AS STATED** - a `?` at the end of a non-final element is escaping the separator
  that follows it, so it is never unpaired; read that entry before acting on this line.

---

## Relocated verbatim from `CLAUDE.md`, 2026-08-09, to pay for the `X12-TA1-RESIDUALS` trap

This is that file's `X12-TA1-EMIT-NOT-RELEASE-AWARE` `###` section, moved here whole under the
ratchet rule (relocate first, lower the entry as the relocation lands, never raise). **Nothing is
dropped except one clause the successor slice measured FALSE, and that deletion is recorded inline
below rather than performed silently** - a revert re-publishes claims, so the record of what was cut
travels with the text.

#### 🩺 `X12-TA1-EMIT-NOT-RELEASE-AWARE` (2026-08-08) · `agent-notes/x12-ta1-emit-escape.md`

- **🩺 `buildTA1` RELEASES ALL FIVE CALLER ELEMENTS NOW, SO AN ACCEPT THIS LIBRARY EMITS NO LONGER
  READS BACK AS A REJECT.** A bare delimiter took its own slot and shifted TA1-04, which the read
  narrows out-of-enum to `R`. **`*` AND `~` DID IT ON EVERY RELEASE; ONLY THE `?` SHAPE IS `#96`'s -
  never restate the class as something that arc introduced. THE INVERSE IS THE LESS SAFE ONE:** a
  type-forbidden `noteCode` of `"A"` shifted onto TA1-04 made a **REJECT READ ACCEPT**, and nobody
  resubmits against an Accept.
- **🛑 IT CHANGES BYTES ALREADY ON THE WIRE. THAT IS `#96`'s STATED COST, WEIGHED AND TAKEN, NOT AN
  OVERSIGHT CORRECTED.** Bounded: no delimiter and no `?` means byte-identical, which is every
  conformant TA1. **THE PREDICATE MOVES BOTH WAYS, LIKE `#96`'s - A DRAFT SAYING "ONE WAY, NOTHING
  STARTS" WAS REFUTED IN ONE PROBE. STATE THE PROPERTY, NEVER THE DIRECTIONS:** head reports the
  disposition THE CALLER PASSED, base reported whatever the shift left in slot 4, so `ackCode === "R"`
  both STOPS and STARTS (`interchangeTime: "12*A"` + `ackCode "R"` read `"A"` at base, all fields
  in-enum). **ONE-WAY IS THE SAFETY, A DIFFERENT SENTENCE.**
- **🛑 TWO DRAFTS OF THE COST BULLET WERE REFUTED, THE SECOND BY THE CORRECTION TO THE FIRST. NEVER
  TOTAL IT.** "The one class that gets worse" (pass 1) and "the rest is released for no framing gain"
  (pass 2, **inverted** by measurement). What holds: only `*`, `~` and a `?` BEFORE the separator
  ever shifted the SEGMENT's framing; **`^` and `:` moved the DOT-PATH reader and releasing them is a
  GAIN** (it answered `"0000"` at base for a TA1-01 of `"0000^0001"`, the key truncated
  to repetition 0); **the measured pure cost is a MID-STRING `?` on the RAW surfaces only**, since
  every dot-path read unescapes. A hand-rolled escape regresses on both.
  **🛑 A CLAUSE HERE READ "THE READ HALF DID NOT MOVE: `parseTA1` IS STILL PRE-`?`-UNESCAPE". IT IS
  DELETED, NOT REWORDED** - `X12-TA1-RESIDUALS` made the decoded fields post-unescape, so it is
  measured false. It was accurate for THIS slice and is not restated in any tense.
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

## x12 - the two TA1 residuals the acknowledgment arc left open (`X12-TA1-RESIDUALS`)

The successor to `X12-TA1-EMIT-NOT-RELEASE-AWARE` (`#97`, `documentation/agent-notes.md#x12---an-accept-ta1-this-library-emitted-read-back-as-a-reject-x12-ta1-emit-not-release-aware`) and
`X12-EMPTY-CONTROL-NUMBER-FABRICATED` (`#101`). Read both first; this file is the extension, not a
restatement. The two halves ship as one slice because they are the two ends of one disagreement:
**this package's emit half releases a TA1 element and its read half decoded the escape rather than
the value**, and the same `escapeRelease("") === ""` early return that hid an empty TA1-01 hid four
more slots.

### 🛑 The census, base `67f1831`, and the filed line was a FLOOR for the fifth slice running

Re-measured before building, per this item's standing rule. The backlog filed **two** slots
(TA1-02, TA1-03). It is **four**.

#### Emit half - `buildTA1`, 5 slots x 7 shapes, every BUILT cell `warnings: []`

| slot                              | `""`             | `" "`     | `undefined`      | `null`  | `1`     | `[]`    | `new String("")` |
| --------------------------------- | ---------------- | --------- | ---------------- | ------- | ------- | ------- | ---------------- |
| TA1-01 `interchangeControlNumber` | REFUSED (`#101`) | **BUILT** | REFUSED (`#102`) | REFUSED | REFUSED | REFUSED | REFUSED          |
| TA1-02 `interchangeDate`          | **BUILT**        | **BUILT** | REFUSED          | REFUSED | REFUSED | REFUSED | REFUSED          |
| TA1-03 `interchangeTime`          | **BUILT**        | **BUILT** | REFUSED          | REFUSED | REFUSED | REFUSED | REFUSED          |
| TA1-04 `ackCode`                  | **BUILT**        | **BUILT** | REFUSED          | REFUSED | REFUSED | REFUSED | REFUSED          |
| TA1-05 `noteCode`                 | **BUILT**        | **BUILT** | REFUSED          | REFUSED | REFUSED | REFUSED | REFUSED          |

⚠ **The columns are the shapes that were RUN, not shape classes** - the `#107` rule. The TA1-05 row
has to be probed against a NON-Accept disposition or `enforceAcceptIsClean` reaches it first and the
cell measures that guard instead; a first pass of this census read TA1-05 as REFUSED for exactly
that reason and it was wrong. The bytes for the four `""` cells:

```text
interchangeDate: ""   TA1*000000001**1200*A*000       interchangeTime: ""  TA1*000000001*260601**A*000
ackCode: ""           TA1*000000001*260601*1200**000  noteCode: ""         TA1*000000001*260601*1200*R*
```

**One mechanism, not several.** `escapeRelease` early-returns on `""`, and `buildTA1` carried a
required-field guard at TA1-01 alone.

#### Read half - `parseTA1` vs. the dot-path read, from BYTES

```text
raw element content        parseTA1 field   dot-path read     warnings
00000001?? (release char)  "00000001??"     "00000001?"       []
0000?*0001 (element sep)   "0000?*0001"     "0000*0001"       []
0000?~0001 (segment term)  "0000?~0001"     "0000~0001"       []
0000?:0001 (component)     "0000?:0001"     "0000:0001"       []
0000?^0001 (repetition)    "0000?^0001"     "0000^0001"       []
0000?X0001 (non-delimiter) "0000?X0001"     "0000?X0001"      []
```

All **five** fields, not TA1-01 alone: the same escape in TA1-02, TA1-03, TA1-04 and TA1-05 read
back carrying its `?` too. Round-tripped through `buildTA1` -> `parseX12` -> `parseTA1`, **six of
six values were not equal to what the caller passed**, `warnings: []` on every row. TA1-01 is the
reassociation key, so those are keys matching no ISA-13.

### ⚖️ The grounding, and what it deliberately is NOT

**Both halves stand on this package disagreeing with itself.** Not on a TR3 usage clause - nobody
here has read one that settles what a TA1 element may contain, and nothing shipped claims one.

- **Read half:** every dot-path read (`getSegmentValue`, and therefore `elementValue` and every
  typed transaction reader that goes through it) already unescaped, and `parse999` unescapes its
  IK4-01 composite **in this same directory**. **🛑 A clause here called `parseTA1` "the only typed
  reader in the package that did not" and is DELETED, not reworded** - see the `PRE-EXISTING` below.
- **Emit half:** `BuildTA1Spec` declares all five properties as required `string`s, `""` is the
  shape that defeats that declaration at run time, and the in-package answer to an empty required
  element is uniformly refusal (`build835` `patientControlNumber`, `build837` `claimId`, `build834`
  `maintenanceTypeCode`, `build278` `requestCategoryCode`, `build277` `categoryCode`, and TA1-01
  itself). **REFUSE and not warn**, for `#101`'s fourth reason unchanged: a builder's `warnings`
  array is the PARSE channel, so a warning would mint an emit-side caller mistake onto the registry
  consumers grade INBOUND documents with - the widening `#83` was refuted for.

### 🛑 What the slice does NOT claim, and each was a live way to overreach

- **No story about which slot is special.** An out-of-enum `ackCode: "X"` reads back as `R` exactly
  as the empty one does. The readback is therefore not what separates them, and the claim published
  is **absence on the emit side and nothing else**. This is the `#107` rule applied before the gate
  rather than after it.
- **No normalisation.** Whitespace still builds at all five slots. A trim is a normalisation rule
  and no source consulted for this package states one - the same call `#101` made at TA1-01, held
  here so the two guards cannot drift apart. Pinned.
- **The read half stays lenient.** The fail-safe narrow of an out-of-enum TA1-04 to `R` is untouched.
  Only the bytes it narrows from moved.
- **No census of other builders' required elements.** This slice measured TA1.
- **Ordering was chosen to move nothing.** All five `esc` calls run before any emptiness test, in
  base's order, so **no spec that was refused at base is refused differently at head** - only four
  cells that BUILT now refuse. Pinned by a case pairing an empty TA1-02 with a numeric TA1-04, which
  still reports the TYPE refusal. **Never count what moved.**
- **The `noop` sink is a disclosed limit, not an oversight.** `parseTA1` returns no warnings channel,
  so `X12_DANGLING_RELEASE_CHAR` from the unescape is dropped. `parse999` drops the same warning from
  the same helper for the same reason.

### 🩺 The carrier sweep, by WORDING across the whole tree

The `#102` lesson, applied. **Three** clauses were falsified. **🛑 No completeness claim and no
method claim is published here, and the reason is that each was published in turn and each was
refuted:** a draft said every carrier had been corrected while clause 3 was still standing in the
file the remedy had just edited, and its replacement claimed a method the same commit did not follow
at a fourth carrier. **The sweep is a discipline, not a proof.** Grep the WORDING, tree-wide, every
time - and note that clause 3 was found by the GATE and not by the sweep that claimed to be
complete.

1. _"the READ half did not move / `parseTA1` is still pre-`?`-unescape"_ - `CLAUDE.md`,
   `KNOWN-LIMITATIONS.md`, `CHANGELOG.md` (the whole file is still `[Unreleased]`, so it is a
   PENDING carrier that freezes on release), `src/transactions/ack/build-ta1.ts`,
   `src/transactions/ack/parse-ta1.ts`, `documentation/agent-notes.md#x12---an-accept-ta1-this-library-emitted-read-back-as-a-reject-x12-ta1-emit-not-release-aware`, and
   `test/transactions-ack-ta1-escape.test.ts`.
2. _"`raw`, `elements` and `parseTA1`'s fields"_ as the enumeration of the raw surfaces - the same
   file set. **This one was found only by grepping the CLAUSE rather than the reported file**, which
   is the whole point of the `#102` rule; a file-by-file sweep would have left it in two places.
3. _"`noteCodeRaw` is preserved VERBATIM"_ - `src/transactions/ack/types.ts`,
   `src/transactions/ack/codes.ts` (both of which ship in the emitted `.d.ts`) and
   `src/transactions/ack/parse-ta1.ts`. The unescape moved that field, so the word is false at head.
   **The first two were found by pass 1 and the third by pass 2, three lines below the line that
   falsifies it and inside the file the pass-1 remedy had just edited** - which is the whole reason
   no completeness claim is published above.

`docs-content/` **ships**: `troubleshooting.md` carries the caller-facing statement and was updated
with the code. Every other page under `docs-content/` was swept for all three clauses and carries
none of them. **No page count is published - derive it from `docs-content/sidebars.json`;** a draft
published one and it was wrong.

### 🔴 `PRE-EXISTING` from the gate - backlog lines, each its own slice, NOT absorbed

ADR 0016 rule 2. Both reproduce at base `67f1831` and neither is a refutation of this slice.

1. **✅ CLOSED by `X12-ST03-READ-NOT-RELEASE-AWARE` - see
   `documentation/agent-notes.md#x12-st03-read-not-release-aware---the-st-03-readers-published-the-escape`.** The finding: typed readers published the model
   field `implementationConventionReference` from `tx.st.elements[3]` PRE-`?`-unescape, the same
   defect shape this slice closed at `parseTA1`. Measured at this slice's head, on
   `ST*837*0001*005010?*X222A1~`: the model field read `"005010?*X222A1"` while
   the dot-path read of ST-03 read `"005010*X222A1"`. **This is what falsified the "only typed
   reader" clause, and the clause was cut rather than the readers changed** - widening this slice to
   reach them is exactly the growth ADR 0016 rule 2 exists to stop. **The count of readers written
   here is DELETED rather than corrected: it was three, the successor measured four raw sites reached
   by five public readers, and a live count in a closed record cannot self-correct.** ST-03 is what
   the variant resolver keys on (`X12-VARIANT-ICR-UNGROUNDED`); the successor weighed it there and
   deliberately left every keyed decision on the raw text.
2. **The refusal message says "TA1-02 is a required element", which reads as a usage assertion**
   while every grounding this package publishes for the guard is the TYPE declaration and not a TR3
   clause. Base's own `requireControlNumber` says "TA1-01 is a required control number" in the same
   voice, so the class predates the slice. **Nobody on this box has grounded TA1-02..05's
   mandatory-or-situational status in a primary source, and nothing here claims one either way.**

### The ratchet

`CLAUDE.md` was at **50,163** on `main` with the umbrella's `REPO_CLAUDE.x12` lowered to match, so
there was zero headroom. The `X12-TA1-EMIT-NOT-RELEASE-AWARE` `###` section was relocated in full
into `documentation/agent-notes.md#x12---an-accept-ta1-this-library-emitted-read-back-as-a-reject-x12-ta1-emit-not-release-aware` first - verbatim except the one clause above, deleted
inline and on the record, because **a revert re-publishes claims**. **Derive both numbers; do not
trust a figure written here.**

---

### The `CLAUDE.md` trap text, RELOCATED HERE VERBATIM 2026-08-09

Moved out of `CLAUDE.md` in full to pay for the `X12-ENVELOPE-VALUE-POINTERS` trap, under this
repo's own ratchet (relocate first, lower the entry as it lands, never raise). **Nothing is
dropped and nothing is reworded** - a revert re-publishes claims, so the wording is preserved
exactly as it stood at `61b5981`.

- **🩺 `parseTA1`'s FIVE DECODED FIELDS ARE POST-`?`-UNESCAPE; `raw` IS THE VERBATIM BYTE SURFACE AND
  IS NOT.** The emit half released and the read half decoded the ESCAPE, so a released TA1-01 came
  back matching NO ISA-13, `warnings: []`. **GROUNDED ON THIS PACKAGE DISAGREEING WITH ITSELF, NEVER
  A TR3 CLAUSE:** every dot-path read already unescaped and so does `parse999` on IK4-01.
  **🛑 A CLAUSE CALLING `parseTA1` "THE ONLY TYPED READER THAT DID NOT" IS DELETED - MEASURED FALSE
  BY THE ST-03 READERS, WHICH ARE THEIR OWN TRAP IN THIS LIST. STATE THE CELLS RUN, NEVER WHICH
  MEMBER IS SPECIAL.** **THE SINK IS `noop`** - no
  `X12_DANGLING_RELEASE_CHAR` here, same as `parse999`.
- **🩺 AN EMPTY TA1-02 / TA1-03 / TA1-04 / TA1-05 IS REFUSED ON EMIT. FILED AS TWO SLOTS, MEASURED AS
  FOUR** (`escapeRelease` early-returns on `""` and TA1-01 had the only required-field guard); each
  BUILT an absent element with `warnings: []`. **🛑 READ TA1-05's CELL AGAINST A NON-ACCEPT
  DISPOSITION OR `enforceAcceptIsClean` REACHES IT FIRST AND YOU MEASURE THAT GUARD** - a first
  census did exactly that. **EXISTING `X12_ACK_INVALID_SPEC`, NO CODE MINTED.**
- **🛑 PUBLISH THE CELLS, NEVER A STORY ABOUT WHICH SLOT IS SPECIAL.** An out-of-enum `ackCode: "X"`
  reads back `R` exactly as the empty one did, so **THE CLAIM IS ABSENCE ON EMIT AND NOTHING ELSE** -
  no narrowing of what a non-empty element may CONTAIN, and the lenient read is unmoved.
- **⚖️ NO NORMALISATION: WHITESPACE STILL BUILDS AT ALL FIVE SLOTS**, as at TA1-01 - a trim is a rule
  and no source states one. **🛑 EVERY EARLIER GUARD KEEPS PRECEDENCE** (`enforceAcceptIsClean`
  first, then TA1-01's control-number refusal, then the escaper's TYPE refusal): **all five `esc`
  calls run BEFORE any emptiness test, so NO SPEC REFUSED AT BASE IS REFUSED DIFFERENTLY.**
  **NEVER COUNT WHAT MOVED.**

## x12 - grounding `VARIANT_BY_ICR` (`X12-VARIANT-ICR-UNGROUNDED`, 2026-08-08)

The item `#87` and `#88` each said had to come before the next 837 slice. Base `668afea`, which is `main` at published `0.0.13`.

**This was commissioned as a GROUNDING unit with two acceptable outcomes: ground the key set from
publicly-citable information, or record with evidence that it cannot be grounded.** It could be
grounded, and the answer is that the shipped table was materially wrong.

### 🛑 What the record was before this, and what it is now

`#87` pass 2 named the ungrounded key set as the thing that most worried it and recorded its own
recollection as **`UNDETERMINED`, explicitly not a citation** - which was the right call. **Nothing
below restates that recollection.** Every identifier here has a source named beside it, and the two
that are weakest say so.

### What was searched

Searched, in this order, for a public statement of which ASC X12N 837 implementation-convention
references are adopted and which appear in ST-03 / GS-08 on real traffic:

1. **45 CFR 162.1102** (the HIPAA transaction-standards adoption record) - `ecfr.gov` redirected
   away; retrieved instead from Cornell LII's copy of the section, read paragraph by paragraph.
2. **govinfo.gov** CFR XML for the same section - 404, not used.
3. **x12.org** - the technical-reports index (does not enumerate identifiers) and
   `x12.org/examples/005010x222`, which does name the base guide.
4. **CMS.gov** companion guides - every direct PDF fetch returned HTTP 403; used only through
   search-result text, and **not relied on as a sole source for anything below**.
5. **Payer companion guides that could actually be retrieved and read**: the Arizona AHCCCS 837
   standard companion guide and the Louisiana Medicaid 5010 EDI general companion guide. Both were
   read as PDFs, not summaries.
6. **A public X12 HIPAA guide catalog** for which errata guides exist as published documents.

### What could be grounded

#### Primary, regulatory - the adoption record

45 CFR 162.1102(c) adopts, for the period from January 1, 2012 through August 14, 2027, "the
standards identified in paragraph (b)(2) of this section". Those standards, quoted from (b)(2):

- **(iii) Professional health care claims.** "ASC X12 Standards for Electronic Data Interchange
  Technical Report Type 3, Health Care Claim: Professional (837), May 2006, **ASC X12N/005010X222**".
- **(iv) Institutional health care claims.** the same TR3 for Institutional, **ASC X12N/005010X223**,
  "and Type 1 Errata to Health Care Claim: Institutional (837) … October 2007,
  **ASC X12N/005010X223A1**".
- **(ii) Dental health care claims.** **ASC X12N/005010X224**, "and Type 1 Errata to Health Care
  Claim: Dental (837) … October 2007, **ASC X12N/005010X224A1**".

**🩺 Cite `(c)`, not `(e)`, and a pass-1 refuter caught this slice citing `(e)`.** Paragraph `(e)` is
prefaced "For the period from **August 14, 2027 through April 14, 2028**" and `(f)` follows it; both
name the same three guides, so the substance was right and the clause was not. The provision in force
on the date this was written is `(c)`, which adopts `(b)(2)`. For a unit whose whole deliverable is
grounding, the wrong paragraph is exactly the defect the unit exists to prevent.

**🛑 The section names no `A2` or `A3` guide anywhere, and it does not name `005010X222A1`.** So the
adoption record cannot ground any of the three keys the table shipped with, and **the shipped table
held none of the five identifiers this record does name.**

#### Primary-adjacent, X12's own site

`x12.org/examples/005010x222` gives the base guide as "837, Health Care Claim: Professional",
identifier `005010X222`. That grounds the stem-to-claim-type mapping directly.

#### What production traffic actually carries, read from payer companion guides

**Arizona AHCCCS 837 standard companion guide**, three separate transaction sections, verbatim:

| section       | GS-08 "Version Identifier Code" | ST-03 "Implementation Convention Reference" |
| ------------- | ------------------------------- | ------------------------------------------- |
| Professional  | `Expect 005010X222A1`           | `Expect 005010X222A1`                       |
| Institutional | `Expect 005010X223A2`           | `Expect 005010X223A2`                       |
| Dental        | `Expect 005010X224A2`           | `Expect 005010X224A2`                       |

**Louisiana Medicaid 5010 EDI general companion guide**, supported-transactions table, verbatim:
"Health Care Claim: Dental `ASC X12N 837-005010X224A2`; Health Care Claim: Professional
`ASC X12N 837-005010X222A1`; Health Care Claim: Institutional `ASC X12N 837-005010X223A2`."

Two independent payers, agreeing, both read from the source document rather than a summary.

#### The weakest leg, and it is labelled as such in the code

`005010X222A2`, `005010X223A3` and `005010X224A3` exist as **published errata guides**. The first
draft of this note cited only a public guide catalog for them and called that the weakest leg; the
pass-1 refuter found a better source and it is used instead. **X12's own RFI #2334 ("5010 - 837
P,I,D-CLM limit") names all three together**, verbatim: "The CLM TR3 Notes in the 005010X222A2,
005010X223A3 and 005010X224A3 TR3s state …". That is X12 naming its own published guides, which is
the strongest available evidence that they exist and are the current errata of each family.

**It is still the weakest leg of the three, and for a different reason than the draft gave.** What it
establishes is existence, not use and not adoption: **these three are NOT adopted by 45 CFR 162.1102,
and no companion guide read for this unit requires any of them.** Two were already in the shipped
table; `005010X224A3` was added because the same RFI names it beside the other two, and never on the
strength of a pattern.

### What could NOT be grounded

- **No primary X12 publication record was reachable** listing every published 837 errata with its
  designation. `x12.org` does not enumerate them publicly and its Glass viewer was not used.
- **No source was found that makes the key set provably exhaustive.** The code therefore says the set
  is not claimed exhaustive, and neither the registry messages nor this note publish a count of it.
- **Nothing grounds a normalisation rule.** No source says an ST-03 may be lower-cased, trimmed or
  matched by prefix, so none of that is done: the table is a literal list and a control pins that
  `005010x222a1`, `" 005010X222A1"` and `005010X222A9` all still fall through.

### 🩺 The frequency claim, and it CHANGED

The item asked whether `X12_837_AMBIGUOUS_VARIANT` is the exception or the normal path. **Measured:
it was the NORMAL path on production professional and institutional traffic through `0.0.13`.** An
837P carrying the ST-03 that CMS and both companion guides above require - `005010X222A1` - resolved
to no variant, fell through to the `SVx` scan, and was typed by whichever service segment came first
in the body, orphans included. `X12_837_UNKNOWN_VARIANT` on such a file was **a fabricated
non-conformance claim about a document that was not non-conformant** - the same failure shape
`X12-VARIANT-LOOKUP-PROTOTYPE` fixed for `HL-03`, where an incomplete wire-keyed table made the
walker accuse a conformant document.

That is also why the fix is a table correction rather than a message re-wording: the honest remedy
for "this fires on the normal path" is to stop firing on the normal path.

### What shipped

`VARIANT_BY_ICR` now holds every identifier cited above: the three base guides, the two adopted
October 2007 errata, the three errata production traffic carries, and the three later published
errata. **Precedence is untouched** - resolution is still
`explicitType ?? variantFromIcr ?? variantFromSegment`, and the order was already right; only the
table was short.

Both frozen registry messages **stopped enumerating the set**. Each named the three keys literally,
so each was wrong the instant the table was grounded, in a string consumers had already read. They
now describe the set and never list it, and `test/transactions-claim-837-variant-icr-grounding.test.ts`
carries a tripwire that reds if any registry message quotes a TR3 identifier again. **That tripwire
has its own negative control**, because a first draft read `ALL_WARNING_MESSAGES` - a `Set` - with
`Object.entries`, which yields `[]`, so it passed while measuring nothing.

### 🛑 This IS a behaviour change on already-published decoding, and it is disclosed as one

The `SVx` fall-back is **not narrowed**: first-wins still takes the first service segment in the
body, orphans included, on every document that still reaches it. What changed is **which documents
reach it**.

**🩺 State it as ONE property and never as a census of consequences. A first draft published a closed
list of three and a pass-1 refuter measured it false by finding a fourth**, which is this repo's
recorded failure mode for exhaustive lists (`X12-NUMERIC-VALUE-EMITS-EMPTY`: three drafts, three
refutations, one more found each time). The property:

> **Where ST-03 is now recognised, the document's own declaration decides the variant instead of its
> first service segment**, and everything downstream follows from that one substitution.

What follows from it, listed as examples and not as a bound:

1. **`submission.variant` can differ** where the first `SVx` disagreed with the declaration. That
   case was a mis-read: the document declared itself and a stray segment overrode it.
2. **`X12_837_AMBIGUOUS_VARIANT` stops firing** on such a document - no guess is made, so there is no
   ambiguity to report.
3. **`X12_837_UNKNOWN_VARIANT` stops firing** on a declared file with no `SVx`.
4. **🩺 A service line whose `SVx` kind disagrees with the declaration is no longer DECODED, and a
   code STARTS firing.** Found by the pass-1 refuter; the readings below were re-measured here rather
   than quoted. Under ST-03 `005010X222A1` with a body whose only service segment is an `SV2`, base
   read `variant "I"`, `charge "7300"`, `units "2"` and `warnings: []`; head reads `variant "P"`,
   `charge` and `units` `undefined`, and `["X12_837_SERVICE_LINE_NOT_DECODED"]` at the line's `LX`.
   **A mis-stamped envelope is an ordinary vendor variant, and this reader can no more tell a
   mis-stamped ST-03 from a conformant one than it can tell a stray `SVx` from a conformant one.**
   The loss is warned rather than silent, and `docs-content/cookbook.md`'s post-a-line-amount gate
   already names `X12_837_SERVICE_LINE_NOT_DECODED` first, so a consumer following the shipped recipe
   catches it. Pinned with the charge value and a whole-channel `toEqual`.

   **🩺 STATE ONLY THE DECIMAL SLOTS AS `undefined`, AND THE POLARITY REVERSES BY VARIANT.** A pass-2
   refuter measured this and it cost four consumer-facing surfaces. An undecoded line SEEDS its
   identity fields, so on a **P** or **D** line `procedureCode` is **`""`** while `revenueCode` is
   absent, and on an **I** line `revenueCode` is **`""`** while `procedureCode` is a PRESENT SLOT
   READING `undefined` (`Object.hasOwn` is true for it, and false for `revenueCode` on P and D).
   **The word is load-bearing here** - `undefined` means not decoded, never absent. Only
   `charge` and `units` are `undefined` on all three. **`KNOWN-LIMITATIONS.md`'s standing sentence
   "`undefined`, not `""`, which on such a line is the `revenueCode`" is about the I case and DOES
   NOT PORT to P or D.** A consumer predicate of `procedureCode === undefined` detects this on
   neither of the two variants this slice is mostly about. Pinned per variant in
   `test/transactions-claim-837-variant-icr-grounding.test.ts`; the earlier draft was green over the
   false claim precisely because the helper asserted `charge` / `units` and nothing else.

   **🛑 And a claim about what a refuter measured is itself a claim.** The draft attributed
   `procedureCode undefined` to the pass-1 refuter "verbatim". The refuter had printed `charge`,
   `units` and `revenueCode` and never read `procedureCode` on that line, so an unmeasured value was
   laundered as measured, and attributed to the gate. **Never write "the refuter measured X" for
   anything you did not watch it print.**

Consequences 2 and 3 blind a consumer predicate written against those codes, and 4 moves a document
onto a code it did not carry, which is the hazard
`#83` was refuted for. It is taken deliberately here and in the opposite direction from `#87` and
`#88`: those two refused to narrow a fall-back because narrowing would change how published documents
decode on evidence the reader does not have. **Here the reader does have the evidence - it is in
ST-03 - and was ignoring it.** Continuing to ignore a document's own declaration to keep two warnings
firing would be preserving a mis-read for the sake of a predicate.

### What this slice did NOT close

- **🩺 The EMIT side is untouched, deliberately, and it is now a named residual.** `build837P` /
  `build837I` / `build837D` stamp `005010X222A2` / `005010X223A3` / `005010X224A2` into ST-03 and
  GS-08 from `VERSION_BY_VARIANT`, and **a caller cannot override it**. Two of those are not what the
  companion guides above require, so a partner that requires `005010X222A1` or `005010X223A2` will
  reject what this builder emits. **Not re-stamped here:** which published guide identifier a trading
  partner accepts is a partner fact, not a spec fact, and changing bytes this library already emitted
  would break the partners it works with today. Disclosed in `KNOWN-LIMITATIONS.md` and in
  `Build837EnvelopeSpec`'s own doc comment; the remedy is a caller-supplied override, which is a
  public-surface addition and its own slice.
- **`SV3-06`'s TR3 usage is still not grounded** and nothing here claims it is. Untouched.
- The five `PRE-EXISTING` residuals in `X12-837-RESIDUALS`. Untouched.
- **`documentation/agent-notes.md` was left alone.** Its `X12-837-LOOP-RESIDUALS (2026-08-05)`
  section measures a document with an ST-03 of `005010X222A1` on both trees. That is a dated archive
  snapshot of a measurement, true when taken, and the same judgement `#88`'s pass-3 refuter applied
  to the "still silent" sentences in that file applies to it. It is also at its budget.

### Census and controls

Head's new suite was run against a base `src/` restored from `668afea` **by file copy, never
`git checkout`**. **12 of 29 cases red at base; the 17 green are exactly the controls** - every "does
not resolve" case, the fall-back-not-narrowed case, the precedence case and the message-shape case.
Note that the three keys the table ALREADY held are red at base too, because every case in section 1
now also asserts the fourth consequence, which base does not produce. **Negative control:** the same
suite against `hl7`'s `src/` fails all 29 with `parseX12 is not a function`, so what was measured was
`x12` and not a stale scratch artifact. **Re-derive both figures by running, never by arithmetic.**

**Three test files stopped using `005010X222A1` as their non-resolving ST-03** and use
`004010X098A1` instead - the 4010 professional addenda reference, named at 45 CFR 162.1102(a)(3), of a
version this library's v1 scope deliberately excludes. **That substitution is the whole reason those
files' 14 cases went red**, and each file's constant carries the reason inline, because when a
document narrates a test, an edit to the test is an edit to the document.

**No census count, no partition of the whole suite and no suite total is published here beyond the
28-case file this slice added, which is a property of that file.** Derive the rest.

## `X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05)

> **RELOCATED VERBATIM from `CLAUDE.md` on 2026-08-11 to pay for the `X12-ISA-VALUE-POINTERS` trap,
> nothing dropped.** The measurement, the sources and the probe-by-probe record stay where they have
> always been, in `documentation/agent-notes.md#x12-variant-lookup-prototype-2026-08-05`; this file
> carries the imperatives that were inline in `CLAUDE.md` until the ratchet needed paying.

#### 🩺 `X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05) · `documentation/agent-notes.md#x12-variant-lookup-prototype-2026-08-05`

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

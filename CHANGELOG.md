# Changelog

All notable changes to `@cosyte/x12` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **README status line corrected to the published reality (README-ORG-SWEEP).** The status line still
  read "pre-alpha (`0.0.x`, not yet published to npm) … the first npm publish is gated on the
  coordinated public launch," which contradicted the npm-version badge and the `pnpm add @cosyte/x12`
  install line already in the same README — the package is published on npm at `0.0.1` from a public
  repo. Rewritten to state that it is published at `0.0.1`, in a public repo, still pre-alpha on the
  `0.0.x`-until-first-alpha ladder; the read/emit scope claim is unchanged. Docs only — no runtime or
  public-API change.

### Added

- **`docs-content/` now ships the full canonical Diátaxis spine (DOCS-CONTENT-P4).** The sidebar was
  Overview-only, with `cookbook.md` authored but orphaned (invisible to every reader). This wires the
  cookbook into **Guides** and adds the rest of the spine every `@cosyte/*` package shares: four new
  **Core Concepts** pages (the envelope/loop model; the 80/20 transaction sets, mapping each shipped
  set to its reader/builder pair and the field it preserves verbatim; the tolerance tiers +
  warning-code model; and decimal-exact money via `X12Decimal`), **Installation** and **Quickstart**
  tutorials (parse an 835 and post the cash), and a **Troubleshooting & known limitations** page (the
  fatal-vs-warn model, a symptom→cause table, PHI-in-logs discipline, and the v1 non-goals). Depth is
  gated to the shipped surface — no unshipped API is documented. Synthetic-only fixtures throughout.
  Docs only — no runtime or public-API change.

### Fixed

- **`scripts/sync-version.mjs` hardened against two latent defects, and gated in CI
  (SYNC-VERSION-HARDENING).** Follow-up hardening on the VERSION-SYNC script; ported byte-identically
  across `hl7`, `x12`, and `mllp`. (1) The version was spliced into `src/index.ts` via
  `String.prototype.replace` with a _replacement string_, which interprets `$&`, `$1`, `` $` ``, etc.,
  so a version like `1.2.3-$&x` would inject the matched text and corrupt the `VERSION` constant while
  exiting 0 — the replacement is now a replacer _function_, whose return value is inserted literally.
  (2) The declaration regex was non-global, so `.replace` silently rewrote the _first_ match; a
  column-0 decoy (e.g. inside a comment) ahead of the real declaration could be edited instead — the
  script now matches globally, asserts exactly one declaration, and exits non-zero loudly otherwise.
  Neither defect is reachable through Changesets today and both previously failed loud rather than
  shipping a lying `VERSION`, so this is hardening, not a fix for an observed break. The
  `format`/`format:check` globs now cover `scripts/**/*.mjs` so the script is prettier-gated in CI
  (the `.mjs` scripts were matched by no format glob before; `scripts/**/*.ts` was already gated).
  Build tooling only — no runtime or public-API change.
- **The `intro.md` status/roadmap section was stale** — it described Phase 1/2 as the frontier and
  listed the now-shipped read + emit + profile surfaces as "coming in later phases." Refreshed to the
  current shipped reality with an honest pre-alpha status banner.
- **A latent malformed-ISA fixture in `cookbook.md`.** The self-contained 835 example's ISA padded
  the sender/receiver IDs to 16 bytes instead of the fixed 15, so the 106-byte ISA was misaligned and
  delimiter detection would reject it. It went unnoticed because the cookbook block was illustrative,
  never executed; making the examples runnable under the doc/code-agreement harness surfaced it.

### Changed

- **Every runnable docs snippet is gated by the shared doc/code-agreement harness.**
  `test/docs-content.test.ts` runs `docSnippetSuite()` (from `@cosyte/vitest-config/snippets`) over
  `docs-content/`, extracting each ` ```ts runnable ` block, compiling it, executing it against the
  **built** ESM artifact, and asserting its inline `// =>` results — so a documented example can never
  silently drift from the shipped code. Bumps the `@cosyte/vitest-config` devDependency to `^0.0.2`
  for its `/snippets` export.

- **The Release workflow can actually start.** `.github/workflows/release.yml` calls the shared
  `cosyte/.github` pipeline, which requests `contents`/`id-token`/`pull-requests: write`, but declared
  no `permissions:` of its own — so it inherited the repo default of `contents: read`. A called
  workflow may only downgrade the caller's `GITHUB_TOKEN`, never escalate it, so GitHub rejected the
  workflow at startup (~1s, no jobs, no logs). Every Release run from June 2026 until now failed this
  way, unnoticed, because a `startup_failure` produces no logs to read. The caller job now declares
  the three scopes explicitly. CI-only — no runtime or API change.

- **The `VERSION` export now tracks `package.json`, and the missing `version`
  script is restored (VERSION-SYNC).** Two latent release bugs, both of which
  would have bitten at the first publish. (1) `VERSION` was hardcoded `"0.0.0"`
  in `src/index.ts` while `changeset version` bumps only `package.json`, so a
  published `0.0.1` would have shipped an export reading `"0.0.0"` — every
  consumer asserting on or logging `VERSION` told the wrong version of the
  parser they were running. New `scripts/sync-version.mjs` rewrites the constant
  from `package.json` (idempotent; exits non-zero if the declaration is renamed
  rather than silently no-op'ing). (2) **No `version` script existed at all** —
  the shared `cosyte/.github` release workflow drives Changesets with
  `version: pnpm run version`, which would have failed with `ERR_PNPM_NO_SCRIPT`,
  so the "Version Packages" PR could never have been opened. The guard in
  `test/sanity.test.ts` was **inverted**: it asserted
  `expect(VERSION).toBe("0.0.0")` — literal against literal — which stays green
  through exactly this drift and goes red on a _correct_ bump. It now compares
  `VERSION` against `package.json` at test time. Ported from `@cosyte/mllp`
  (MLLP-10), in the canonical form `@cosyte/hl7` carries. No version bumped,
  nothing published — still `0.0.0`.

### Added

- **Trademark notice (`TRADEMARKS.md`).** This package names third-party systems to describe what it
  interoperates with; the notice records that cosyte is not affiliated with, endorsed by, or
  sponsored by any of them, that every reference is descriptive, and that the built-in profiles are
  authored from public sources only. Added to `files` so it ships inside the published tarball, not
  just on GitHub. Documentation only — no runtime or API change.

- **Phase 10 — release hardening.** The v1 close-out; no new parser
  surface, just the gates, tooling, and docs that make the package
  trustworthy to publish.
  - **Publish-pipeline proof.** A new `release-dry-run` CI job proves a
    real release would succeed without burning a version or needing
    registry auth — `pnpm publish --dry-run` exercises the publish command
    path and `npm pack --dry-run` asserts the publishable tarball assembles
    with the right `files` set + built `dist/`. The real provenance publish
    stays gated on the public launch.
  - **Nightly amplified fuzz** (`.github/workflows/fuzz.yml`). Re-runs the
    byte-flip / never-throw property targets at a higher iteration count
    (`X12_FUZZ_RUNS`) with a rotating seed (`X12_FUZZ_SEED`) — the deep
    search that would slow the per-commit run — and opens/auto-closes a
    sticky issue on failure. The per-commit suite is unchanged (pinned
    seed, base counts, coverage-stable); a finding is replayable via the
    printed seed. New test helper `fuzzRuns()` scales only the true fuzz
    targets.
  - **`pnpm refresh:code-lists`** (`scripts/refresh-code-lists.ts`). A
    release-event tool that validates every bundled code-list snapshot
    (well-formed `meta` ISO dates, non-empty unique codes + descriptions)
    and prints a freshness audit; its `validateCodeLists()` also runs on
    every `pnpm test`. Full regeneration from the canonical WPC / X12
    sources (`--fetch`) is a redistribution-terms-gated release step that
    prints the source manifest rather than fabricating unreviewed
    descriptions.
  - **Docs.** A task-oriented `docs-content/cookbook.md` and a
    `KNOWN-LIMITATIONS.md` do-not-over-trust statement; the README is now a
    real Quickstart. JSDoc `@example` completeness closed on the last three
    public value-exports (`ISA_MIN_LENGTH`, `DELIMITER_POSITIONS`,
    `RELEASE_CHAR`).
  - **Known limitation carried forward:** an external-oracle differential
    corpus (vs CMS Medicare 835) is not yet wired, pending a
    redistribution-terms review — see `KNOWN-LIMITATIONS.md`.

### Security

- **Dev-dependency advisory remediation (no runtime impact —
  `@cosyte/x12` ships zero runtime dependencies).** Added scoped
  `pnpm.overrides` pinning two transitive **dev/build-time** packages to
  their patched releases: `esbuild` (`>=0.27.3 <0.28.1` → `0.28.1`,
  GHSA dev-server path-traversal — unreachable here: a library build
  via `tsup`/`vitest`, never `esbuild serve`) and the
  `@changesets/parse` copy of `js-yaml` (`>=4.0.0 <4.2.0` → `4.2.0`,
  GHSA-h67p-54hq-rp68 merge-key DoS). The `js-yaml@3.14.2` pulled by
  `read-yaml-file@1.1.0` (via `@manypkg/get-packages` →
  `@changesets/cli`) is **intentionally left** — it calls
  `yaml.safeLoad`, removed/throwing in js-yaml 4, so it cannot be
  force-upgraded without breaking the release tooling; it only parses
  trusted local repo YAML at release time. Verify gate green on the
  upgraded tree.

### Fixed

- **Segment splitting now honours the `?`-release-escaped terminator.**
  `splitSegments` (the envelope tokenizer) used a naive `indexOf` for the
  segment terminator, so a value carrying a literal terminator byte —
  emitted by `escapeRelease` as `?~` — was split mid-value: the segment
  was truncated at the `?`, a phantom empty segment was injected, and the
  round-trip silently corrupted the value (the element splitter
  `splitWithRelease` had always been release-aware; only the segment
  splitter was not). The fix mirrors the element-splitter scan
  (`?` consumes the next byte) so an escaped terminator stays inside its
  value. The Phase 8 `serialize(parse(s)) === s` fixed point and the new
  `build835` round-trip both depend on this. A degenerate delimiter set
  where the terminator IS the release character falls back to the literal
  scan, preserving prior behaviour. Surfaced by the `build835` round-trip
  review.

### Added

- **Profile system — descriptive, fixture-grounded clearinghouse / payer
  companion-guide quirk attribution.** A `defineProfile()` API mirroring
  the sibling `@cosyte/hl7` profile shape, plus a `profiles` namespace of
  built-ins. The parser is already lenient and lossless, so a **v1 profile
  is DESCRIPTIVE**: it attaches attribution metadata to the returned
  `X12Interchange` (`ix.profile`) and powers `partitionWarnings`, but
  NEVER alters the parse — `groups`, `warnings`, and `isa` are
  byte-identical with and without a profile (proven by a divergence test).
  - **`defineProfile(spec)`** validates the spec (fail-fast on name, then
    Levenshtein "did you mean?" hints on unknown option keys, then the
    quirk set), merges any `extends` lineage (flatten + dedupe
    first-occurrence; child wins on quirk-id collision keeping first-seen
    position; scalar `description` last-wins), re-validates the composed
    set, and returns a frozen `X12Profile` whose `describe()` yields a
    structured `X12ProfileDescription` bucketed by effect
    (`relaxes` / `adds` / `requires`) — structured DATA, not hl7's
    formatted string, so consumers can program against it.
  - **The locked HARD RULE — no invented quirks.** Every quirk MUST cite a
    `fixture` (a relative path under `test/fixtures/`) that actually
    EXHIBITS the deviation; the field is required at the type level and
    enforced in `defineProfile()`. The accuracy suite goes further: a
    per-quirk DEMONSTRATOR registry asserts each cited fixture exhibits its
    claimed deviation, and a shipped quirk with no demonstrator FAILS the
    suite — so a real-but-irrelevant fixture cannot slip past.
  - **`setDefaultProfile()` / `getDefaultProfile()`** set a process-scoped
    default applied when a `parseX12` call passes no `profile`. An explicit
    `{ profile }` wins; `{ profile: null }` opts out of the default for
    that call. `partitionWarnings(warnings, profile)` splits a parse's
    warnings into `{ expected, unexpected }` on the union of the profile's
    quirk `expectedWarnings` — the one behavioural hook a v1 profile
    offers.
  - **Built-ins ship ONLY where a Tier-2 fixture grounds them:**
    `profiles.availity` (payer-loop `REF*2U` + service-line `REF*F8`
    additions, grounded in `remit/835-availity-quirk.edi`) and
    `profiles.bcbsCommon` (backslash component separator, grounded in
    `envelope/bcbs-subelement.edi`). Profiles whose only "deviation" would
    be a canonical `:` baseline (e.g. a generic Medicare FFS profile) are
    deliberately DEFERRED rather than invented — shipping them would
    violate the hard rule. Built-ins are reachable only through the
    `profiles` namespace, never the top-level export (mirrors hl7).
  - **API divergence from `@cosyte/hl7`, by design:** `describe()` returns
    structured data (not a string); the input type is `X12ProfileSpec`; and
    `partitionWarnings` is x12-only. These are conscious departures driven
    by x12's lossless-lenient reality, not drift.
  - New public exports: `defineProfile`, `setDefaultProfile`,
    `getDefaultProfile`, `partitionWarnings`, `profiles`, `X12ProfileError`,
    and the `X12Profile` / `X12ProfileSpec` / `X12ProfileQuirk` /
    `X12ProfileDescription` / `X12ProfileEffect` / `X12WarningPartition`
    type tree.
- **Domain builders — `build820` (005010X218 Premium Payment) and
  `build834` (005010X220A1 Benefit Enrollment and Maintenance).** The emit
  counterparts to `get820Payments` and `get834Header` /
  `get834Enrollments`, layered on the Phase 8 general builder and
  mirroring the pure-function `build835` pattern — they NEVER auto-send,
  open a socket, or touch the filesystem, and return a frozen
  `X12Interchange`. Completes the v1 emit scope: every v1 transaction now
  has a domain builder.
  - **`build820(spec)`** assembles a complete interchange (one GS..GE
    group, GS-01 `RA`; one ST..SE 820, ST-03 `005010X218`) from a typed
    `Build820Spec` whose monetary fields are `X12Decimal` throughout
    (BigInt-exact, never `parseFloat`). Segments emit in TR3 loop order
    (BPR → TRN → Loop 1000A receiver `N1*PE` → Loop 1000B remitter
    `N1*PR`/`N1*RM` → Loop 2000 remittances: ENT / NM1 → REF → DTM → RMR →
    ADX), and the output round-trips through `parseX12` so a well-formed
    spec is reproduced field-for-field. **The 820 carries no TR3 balance
    equation** (BPR-02 is not required to equal Σ of the RMR open items),
    so the builder emits all monetary amounts VERBATIM and never raises a
    balance-mismatch refusal — a deliberate contrast with `build835`.
  - **`build834(spec)`** assembles a complete interchange (one GS..GE
    group, GS-01 `BE`; one ST..SE 834, ST-03 `005010X220A1`) from a typed
    `Build834Spec` (envelope + BGN header + sponsor `N1*P5` / payer
    `N1*IN` + the member roster). Segments emit in TR3 loop order (BGN →
    N1 parties → REF → DTP, then per member: INS → NM1\*IL + DMG + N3/N4 →
    REF → DTP → COB → Loop 2300 HD → DTP → AMT). Member DTPs emit BEFORE
    the first HD so the read side binds them to the member, not the
    coverage loop. The output round-trips through `get834Header` /
    `get834Enrollments` field-for-field.
  - **Maintenance type is the 834's safety primitive — emit verbatim,
    refuse the unknown.** The builder places the caller-supplied INS-03 /
    HD-01 code (X12 Code Source 875) into the segment VERBATIM and NEVER
    infers or normalizes it; where the lenient read side only WARNS on an
    unknown code (it must surface what arrived), the builder REFUSES to
    EMIT an action it cannot name, rather than write a maintenance code a
    downstream enrollment system would mis-apply. A build-side property
    test asserts every known code round-trips byte-for-byte and every code
    outside the validated subset is refused.
  - **Refusal, not silent corruption.** `build820` REFUSES a structurally
    impossible spec via a typed `Premium820BuildError`
    (`X12_820_BUILD_INVALID_SPEC` — no TRN trace, no remittance, a
    remittance with neither an `ENT` nor an `NM1` to open its loop, a
    remittance with no `RMR` open item, an open item with no identity, an
    over-long control number). `build834` REFUSES via a typed
    `Enrollment834BuildError`
    (`X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE` — an INS-03 / HD-01 code
    outside the X12 875 subset; `X12_834_BUILD_INVALID_SPEC` — no member
    loop, an empty required INS-03, an over-long control number). Both
    messages carry structural indices / counts only — `build834`
    additionally names the offending maintenance code (an X12 control
    code, never PHI), but never a member id or name (PHI discipline).
  - New public exports: `build820`, `Premium820BuildError`,
    `PREMIUM_820_BUILD_ERROR_CODES`, `Premium820BuildErrorCode`, the
    `Build820Spec` type tree; `build834`, `Enrollment834BuildError`,
    `ENROLLMENT_834_BUILD_ERROR_CODES`, `Enrollment834BuildErrorCode`, and
    the `Build834Spec` type tree.
- **Domain builders — `build278Request` (005010X217 Health Care Services
  Review — Request for Review) and `build278Response` (005010X216 Services
  Review — Response).** The emit counterparts to `get278Request` /
  `get278Response`, layered on the Phase 8 general builder and mirroring
  the pure-function `build277` / `build277CA` pattern — they NEVER
  auto-send, open a socket, or touch the filesystem, and return a frozen
  `X12Interchange`.
  - **`build278Request(spec)` / `build278Response(spec)`** share one
    `buildServicesReview` body (GS-01 `HI`, ST-01 `278`) and differ only
    in ST-03 / GS-08 (`005010X217` vs `005010X216`) and the HCR direction
    gate. They assemble a complete interchange from a typed `Build278Spec`
    (envelope + BHT header + the UMO → requester → subscriber →
    (dependent) → reviews tree). Segments emit in TR3 loop order (BHT →
    HL 20 UMO → HL 21 requester → HL 22 subscriber NM1/DMG → [HL 23
    dependent] → HL EV/SS review: TRN → UM → HCR → REF → DTP → HI → MSG →
    provider NM1s, recursing SS service reviews under their EV event), and
    the output round-trips through `parseX12` so a well-formed spec is
    reproduced field-for-field.
  - **The certification decision is the safety-critical, response-only
    surface.** `build278Response` places the caller-supplied HCR-01
    `actionCode` (`A1` certified / `A3` not-certified / `A4` pended / `A6`
    modified / …) into the segment VERBATIM and NEVER infers, normalizes,
    or upgrades it — the round-tripped `decision.actionCode` is
    byte-for-byte the input. `build278Request` REFUSES a review carrying a
    decision (HCR is response-only); `build278Response` refuses a decision
    with an empty action code.
  - **The HL spine is computed, never caller-supplied.** The builder
    computes every HL-01 id, HL-02 parent pointer (`20 → 21 → 22 → 23 →
EV/SS`), and HL-04 has-child flag from the nested input tree, so an
    inconsistent hierarchy is unrepresentable and SE-01 is correct by
    construction.
  - **Refusal, not silent corruption.** The builder REFUSES a
    structurally impossible spec via a typed `ServicesReview278BuildError`
    (`X12_278_BUILD_INVALID_HIERARCHY` — a subscriber with neither a
    review nor a dependent, a dependent with no review;
    `X12_278_BUILD_INVALID_SPEC` — a review with no request category code,
    a request review carrying an HCR decision, a response decision with an
    empty action code, an over-long control number). The message carries
    structural locators only (`subscriber.review[0]`, level codes) — never
    a member name, member id, trace, or diagnosis code (PHI discipline).
  - New public exports: `build278Request`, `build278Response`,
    `ServicesReview278BuildError`, `AUTH_278_BUILD_ERROR_CODES`,
    `ServicesReview278BuildErrorCode`, and the `Build278Spec` type tree.
- **Domain builders — `build271` (005010X279A1 Eligibility Benefit
  Response) and `build277` / `build277CA` (005010X212 Claim Status
  Response / 005010X214 Claim Acknowledgment).** The response-side emit
  counterparts to `get271Eligibility` / `get277Status` /
  `get277CADisposition`, layered on the Phase 8 general builder and
  mirroring the pure-function `build835` / `build837` pattern — they
  NEVER auto-send, open a socket, or touch the filesystem, and return a
  frozen `X12Interchange`.
  - **`build271(spec)`** assembles a complete interchange (one GS..GE
    group, GS-01 `HB`; one ST..SE 271, ST-03 `005010X279A1`) from a typed
    `Build271Spec` whose monetary / percent / quantity fields are
    `X12Decimal` throughout (BigInt-exact, never `parseFloat`).
    **`build277(spec)` / `build277CA(spec)`** share one `buildClaimStatus`
    body (GS-01 `HN`) and differ only in ST-03 / GS-08 (`005010X212` vs
    `005010X214`). Segments emit in TR3 loop order (271: HL spine → TRN →
    NM1 → N3/N4 → DMG → REF → DTP → EB + nested NM1 / REF / DTP / MSG;
    277: HL spine → NM1 member → Loop 2200 claim TRN → STC → REF → DTP →
    Loop 2220 SVC → STC / REF / DTP), STC C043 composites carry the
    category : status : entity triples, and the output round-trips
    through `parseX12` so a well-formed spec is reproduced field-for-field.
  - **TRN echo is the safety-critical reassociation invariant.** The
    builder places the caller-supplied trace into TRN-02 verbatim and
    NEVER fabricates, normalizes, or mutates it — a build-side property
    test feeds random trace tokens through all three builders and asserts
    the round-tripped `referenceId` is byte-for-byte the input.
  - **The HL spine is computed, never caller-supplied.** The builder
    computes every HL-01 id, HL-02 parent pointer, and HL-04 has-child
    flag from the nested input tree (271 spine `20 → 21 → 22 → 23`;
    277 / 277CA spine `20 → 21 → 19 → 22 → 23`), so an inconsistent
    hierarchy is unrepresentable and SE-01 is correct by construction.
  - **Refusal, not silent corruption.** The builder REFUSES a
    structurally impossible spec via a typed `Eligibility271BuildError`
    (`X12_271_BUILD_INVALID_HIERARCHY` — no source / a childless source /
    a childless receiver; `X12_271_BUILD_INVALID_SPEC` — over-long control
    number) or `ClaimStatus277BuildError`
    (`X12_277_BUILD_INVALID_HIERARCHY` — no source / a childless source /
    receiver / provider / a subscriber with neither claim nor dependent /
    a childless dependent; `X12_277_BUILD_INVALID_SPEC` — a claim with no
    trace / status / service line, an STC with no category code, an
    over-long control number). The message carries structural locators
    only (`source[0].receiver[0].provider[0].subscriber[0]`, level codes,
    counts) — never a member name, member id, or trace (PHI discipline).
  - New public exports: `build271`, `Eligibility271BuildError`,
    `ELIGIBILITY_271_BUILD_ERROR_CODES`, `Eligibility271BuildErrorCode`,
    the `Build271Spec` type tree; `build277`, `build277CA`,
    `ClaimStatus277BuildError`, `CLAIM_STATUS_277_BUILD_ERROR_CODES`,
    `ClaimStatus277BuildErrorCode`, and the `Build277Spec` type tree.
- **Domain builders — `build837P` / `build837I` / `build837D` (005010
  837 Health Care Claim: Professional `X222A2`, Institutional `X223A3`,
  Dental `X224A2`).** The claim-submission emit counterpart to
  `get837Claims`, layered on the Phase 8 general builder and mirroring
  the pure-function `build835` pattern — they NEVER auto-send, open a
  socket, or touch the filesystem.
  - **`build837P/I/D(spec)`** each assemble a complete `X12Interchange`
    (one GS..GE group, GS-01 `HC`; one ST..SE 837, ST-03 per variant)
    from a typed `Build837Spec` whose monetary fields are `X12Decimal`
    throughout (BigInt-exact, never `parseFloat`). Segments emit in TR3
    loop order (BHT → Loop 1000A/1000B parties → Loop 2000A/B/C HL spine
    → Loop 2300 claim → Loop 2400 service lines, incl. 2410 drug / TOO /
    2430 line adjudication) and the output round-trips through `parseX12`
    so a well-formed spec is reproduced by `get837Claims`
    field-for-field. One HI composite emits per HI segment so the read
    side's per-bucket diagnosis/procedure order is preserved; same-group
    line-adjudication CAS triples pack into one CAS segment (≤ 6 each).
  - **The HL spine is computed, never caller-supplied.** The builder
    computes every HL-01 id, HL-02 parent pointer (20 → 22 → 23), and
    HL-04 has-child flag from the nested billing-provider → subscriber →
    (claims | patient) tree, so an inconsistent hierarchy is
    unrepresentable and SE-01 is correct by construction.
  - **Refusal, not silent corruption.** Where `get837Claims` only WARNS
    on a broken HL parent pointer, the builder REFUSES a structurally
    impossible spec via a typed `Claim837BuildError`. Codes:
    `X12_837_BUILD_INVALID_HIERARCHY` (no billing providers / a childless
    billing provider / a subscriber with neither claim nor dependent
    patient / a childless dependent patient) and
    `X12_837_BUILD_INVALID_SPEC` (empty `claimId`, no service line, a
    line whose `variant` mismatches the builder, an empty procedure /
    revenue code, an over-long control number). The message carries
    structural locators only (`billing[0].subscriber[0].claim[0]`, level
    codes, counts) — never the `claimId` or a member id (PHI discipline).
  - New public exports: `build837P`, `build837I`, `build837D`,
    `Claim837BuildError`, `CLAIM_837_BUILD_ERROR_CODES`,
    `Claim837BuildErrorCode`, and the `Build837Spec` type tree.
  - Known limitation: claim-/line-level provider addresses (Loop
    2310/2420 N3/N4) are a documented read-side limitation — the NM1
    fields round-trip, the address does not.
- **Domain builder — `build835` (005010X221A1 ERA).** The first
  per-transaction emit helper layers the safety-critical TR3 invariants
  on top of the Phase 8 general builder, mirroring the pure-function
  `build999` / `buildTA1` pattern — it NEVER auto-sends, opens a socket,
  or touches the filesystem.
  - **`build835(spec)`** assembles a complete `X12Interchange` (one
    GS..GE group, GS-01 `HP`; one ST..SE 835, ST-03 `005010X221A1`) from
    a typed `Build835Spec` whose monetary fields are `X12Decimal`
    throughout (BigInt-exact, never `parseFloat`). Segments emit in TR3
    loop order (BPR → TRN\* → Loop 1000A/1000B parties → LX → Loop 2100
    claims → Loop 2110 service lines → PLB) and the output round-trips
    through `parseX12` so a balanced spec is reproduced by `get835`
    field-for-field. Composites (CLP-08, SVC-01, SVC-06, PLB) escape
    each component then join with the raw component separator — the
    envelope is emitted inline (not via `buildInterchange`) to avoid
    double-escaping a pre-composed element. Same-group CAS and
    same-provider/period PLB adjustments pack into one segment (≤ 6
    triples / pairs); PLB carries the raw EDI sign
    (`BPR-02 == Σ(CLP-04) − Σ(PLB)`).
  - **Refusal, not silent corruption.** Where `get835` only WARNS on an
    out-of-balance payer artifact, the builder REFUSES via a typed
    `Remit835BuildError`, reusing the authoritative read-side validators
    (`checkServiceLineBalance` / `checkClaimBalance` /
    `checkRemitTotalBalance`) against a materialized read model so emit
    guard and parse warning share one source of truth. Codes:
    `X12_835_BUILD_BALANCE_MISMATCH` (any §1.10.2 invariant — line,
    claim, or top-of-remit) and `X12_835_BUILD_INVALID_SPEC` (no TRN
    trace, an empty CLP-01, an over-long ISA-13). The thrown message
    carries numeric totals only — never a patient-control number or
    member id (PHI discipline).
  - **New exports.** `build835`, `Remit835BuildError`,
    `REMIT_835_BUILD_ERROR_CODES`, `Remit835BuildErrorCode`, and the
    `Build835Spec` type tree (`Build835EnvelopeSpec` / `…PaymentSpec` /
    `…TraceSpec` / `…PartySpec` / `…AddressSpec` / `…ReferenceSpec` /
    `…ContactSpec` / `…PersonSpec` / `…ProviderSpec` / `…AdjustmentSpec` /
    `…RemarkSpec` / `…AmountSpec` / `…ServiceLineSpec` / `…ClaimSpec` /
    `…ProviderAdjustmentSpec`).
  - **Known limitation (deferred).** The remaining domain builders
    (`build837P/I/D` / `build271` / `build277` / `build278` /
    `build820` / `build834`) layer on the same general surface and are
    NOT in this change.

- **Phase 8 — spec-clean serializer + general interchange builder (the
  emit half lands).** Two new public surfaces close the read↔write loop.
  - **`serializeX12(interchange, opts?)`** turns any parsed
    `X12Interchange` back into an X12 byte stream. Default mode is
    byte-faithful — reconstructed purely from the verbatim `.raw`
    strings the parser preserved (ISA + terminator, then each
    TA1 / GS / segment / GE / IEA terminator-joined, then any
    `trailingBytes`) — so for a Tier-1 input it reproduces the source
    bytes exactly: the idempotency fixed point
    `serialize(parse(s)) === s`. With `{ specClean: true }` it ALSO
    reconciles the envelope (SE-01 / GE-01 / IEA-01 counts + the
    ISA-13↔IEA-02 / GS-06↔GE-02 / ST-02↔SE-02 control pairs),
    surfacing every mismatch via `opts.onWarning` and NEVER silently
    correcting it. Corrected counts emit only with
    `{ recomputeCounts: true }`; control NUMBERS are identity and are
    NEVER rewritten, only flagged.
  - **`buildInterchange(spec)`** is the general-purpose, segment-level
    builder: given an `InterchangeSpec` it owns every envelope mechanic
    (the 106-byte fixed-width ISA, the GS/GE/SE/IEA control segments,
    and the SE-01 / GE-01 / IEA-01 counts), escapes active delimiters in
    body values via the `?` release char, and round-trips its output
    back through `parseX12` so the returned interchange is bit-identical
    to the parsed form. Structurally impossible specs are REFUSED with a
    typed `X12BuildError` (`X12_BUILD_INVALID_SPEC`) — an over-long
    ISA-13, a body segment with no id.
  - **New warning + exports.** `X12_SEGMENT_COUNT_MISMATCH` is a
    serializer-only diagnostic (the parser never validated SE-01);
    registry expands 21 → 22, additions-only, bounded metadata only
    (H-PHI invariant). New public exports: `serializeX12`,
    `SerializeOptions`, `buildInterchange`, `InterchangeSpec`,
    `FunctionalGroupSpec`, `TransactionSetSpec`, `SegmentSpec`,
    `X12BuildError`, `X12_BUILD_ERROR_CODES`, `X12BuildErrorCode`, and
    the `segmentCountMismatch` factory.
  - **Round-trip goldens** lock the emit surface across all v1
    transactions: 13 committed `test/fixtures/golden/<name>.edi` files
    regenerated by `test/scripts/gen-serialize-goldens.ts`, asserting
    `serializeX12(parseX12(fixture))` reproduces the golden
    byte-for-byte. `roundTripProperty` (300 runs) + a builder property
    (200 runs) assert serialize idempotency and that the builder never
    emits a self-inconsistent envelope.
  - **Latent fixture defects caught + fixed.** The new reconciliation
    surfaced four hand-authored deviations the lenient parser never
    validated (it checks GE-01 / IEA-01 / control pairs but not SE-01):
    SE-01 miscounts in `837i-canonical` (30→33), `837d-canonical`
    (25→26), `999-accept` (5→6), and a GS-06/GE-02 mismatch in
    `278-response` (GS-06 2→1) — an accuracy-gate win.
  - **Known limitation (deferred).** Domain per-transaction builders
    (`build835` / `build837P/I/D` / `build271` / …, the safety-critical
    emit code enforcing per-TR3 balance + certification invariants) are
    NOT in this phase; the general envelope surface they layer on top of
    is.

- **Phase 7 — 278 services review + 834 enrollment + 820 premium
  payment (the v1 transaction scope rounds out).** Four new read-side
  helpers: `get278Request` / `get278Response` (TR3 `005010X217` /
  `005010X216`), `get820Payments` (TR3 `005010X218`), and the streaming
  pair `get834Header` + `get834Enrollments` (TR3 `005010X220A1`).
  - **Safety-critical fields preserved verbatim, never inferred.** The
    278 response `HCR-01` certification action (certified /
    not-certified / pended / modified) is captured as-is on each event /
    service review; the 834 `INS-03` / `HD-01` maintenance type (X12 0875) is preserved and an unknown code raises
    `X12_834_UNKNOWN_MAINTENANCE_TYPE` on the affected member only — no
    action is ever synthesized.
  - **834 streaming.** `get834Enrollments` is an
    `AsyncIterable<X12Enrollment>` yielding one member per `INS` loop;
    a streaming property test drives a 10MB+ synthetic roster with
    early-break. (Honest limitation: v1 still parses into `tx.segments`
    up front — a true file→iterator source is a v2 item.)
  - **278 HL spine** `20 → 21 → 22 → 23` validated via the shared
    `validateHl`; the `EV` / `SS` event + service levels are
    deliberately tolerant (omitted from the expected-parent map).
  - **820** surfaces the BPR payment header, TRN traces, receiver
    (`N1*PE`) + remitter (`N1*PR` / `N1*RM`) parties with addresses, and
    both `ENT` organization-summary and bare-`NM1` individual
    remittances with RMR open items, DTM dates, and ADX adjustments.
  - All monetary fields decode as `X12Decimal` (BigInt-exact, never
    `parseFloat`). 12 dogfooded `LoopSpec` artifacts ship through the
    public `defineLoopSpec()` (6 × 278 + 3 × 820 + 3 × 834). Warning
    registry expanded by `X12_834_UNKNOWN_MAINTENANCE_TYPE`
    (additions-only); its factory shape-validates the echoed code
    (H-PHI invariant). Synthetic fixtures across all three surfaces,
    unit tests, and the 834 streaming property. Serialization is
    Phase 8.
- **PHI commit-gate — a zero-dependency, X12-shape-aware PHI scanner
  (`scripts/phi-scan.ts`, run via `pnpm phi-scan`).** Guards the
  synthetic fixture corpus: it refuses any test fixture or `src/` file
  carrying real-PHI-shaped tokens so a developer cannot commit a
  real-looking interchange by accident. Wired into the pre-commit hook
  (`simple-git-hooks` → `phi-scan --staged`) and CI (the reusable
  `cosyte/.github` pipeline's `run-phi-scan: true`); flips the local
  `scripts/verify.sh` summary from `phi-scan SKIP` to `phi-scan ✓`.
  - **Synthetic allow-list, not an inline header.** X12 `.edi` is
    byte-strict (ISA must start at byte 0), so an inline
    `# synthetic: true` marker is impossible — it would break every
    parser test. Same constraint DICOM hits with binary `.dcm`, so the
    same proven solution: `scripts/phi-allow-list.txt` positively
    declares which names / dates-of-birth / ids / email-domains are
    fake. Any realistic-PHI token outside the allow-list is a hit.
  - **Segment-aware scan** for ISA-detected files: NM1 person-name
    tokens (entity-type-1) and SSN qualifier `34`, MI member-id and XX
    NPI shapes, DMG date-of-birth (any format qualifier, not just
    `D8`), and DTP / DTM / BHT / GS service/transaction dates before 2024. Every file also gets a cross-cutting shape pass (dashed SSN,
    `REF*SY` SSN, non-test email). Non-X12 targets (hand-written
    `src/`, plain text) get the conservative shape pass only, so JSDoc
    `@example` snippets don't trip it.
  - **Audited bypass.** A whole-file `--allow-fixture <path>` is
    rejected unless `phi-scan-overrides.md` carries a matching
    `### <path>` entry, so a silenced file is always a recorded act.
    Every subprocess is `git` via `execFileSync` array args — no shell
    form. Unit tests cover the clean interchange, each violator class,
    the plain-text pass, and both arms of the override gate.

- **Phase 6 — 271 Eligibility Benefit Response + 277 / 277CA Claim
  Status — TR3s `005010X279A1` (270/271), `005010X212` (276/277),
  `005010X214` (277CA).** Three new public walkers:
  `get271Eligibility(delimiters, tx)`, `get277Status(delimiters, tx)`,
  and `get277CADisposition(delimiters, tx)`. 277 and 277CA share one
  internal walk disambiguated by the `ST-03` implementation-convention
  reference — `get277CADisposition` admits only `005010X214`;
  `get277Status` admits either. Each returns `undefined` only on a
  mis-routed call (wrong `ST-01`); every recoverable deviation is a
  warning, never a throw.
  - **TRN echo (safety-critical reassociation).** A 271 echoes the
    requesting 270's `TRN-02` trace verbatim onto its enclosing
    subscriber / dependent, and a 277 echoes the 276's onto its claim,
    so the provider can re-associate the answer with the request it
    sent — the walkers NEVER mutate, normalize, or drop the trace. A
    round-trip property test asserts byte-for-byte echo across an
    arbitrary trace grammar.
  - **Status-code fidelity (277 family).** Each STC composite
    (STC-01 / STC-10 / STC-11, C043) decodes into a verbatim CSCC
    (Claim Status Category Code, X12 source 507) + CSC (Claim Status
    Code, source 508) + responsible-entity triple. Bundled snapshot
    descriptions resolve when known; codes outside the subset preserve
    their verbatim value and emit `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` /
    `X12_UNKNOWN_CLAIM_STATUS`. A 277CA provider-level batch
    acknowledgment opens a claim on a standalone STC (no TRN).
  - **HL parent-pointer integrity.** Enforced through the shared
    `validateHl` primitive — 271 spine `20 → 21 → 22 → 23`; 277 / 277CA
    spine `20 → 21 → 19 → 22 → 23`. A dangling or mis-levelled parent
    emits `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`; the
    walker NEVER silently re-numbers and the verbatim declared parent id
    is preserved.
  - **Bundled code-list snapshots.** `CLAIM_STATUS_CATEGORY_CODES`,
    `CLAIM_STATUS_CODES`, and `SERVICE_TYPE_CODES` ship as dated,
    versioned data artifacts alongside the CARC / RARC family, with
    `lookupClaimStatusCategory` / `lookupClaimStatus` /
    `lookupServiceType`.
  - All monetary fields (EB amounts, STC charge / payment, SVC line
    charge / payment) decode as `X12Decimal`, never `parseFloat`. 13
    dogfooded `LoopSpec` artifacts ship through `defineLoopSpec()`
    (7 eligibility + 7 status; Loop 2200 / 2220 reused across the
    subscriber + dependent branches). Warning registry expanded 18 → 20
    (additions-only); both new factories shape-validate the echoed code
    (H-PHI invariant). Shared `X12Hl` HL primitive exported for the
    result types. Six synthetic fixtures + unit tests + byte-flip fuzz
    (never-throw outside the 4 Tier-3 fatals) across every Phase 6
    fixture.
  - **Known limitations (deferred):** AAA request-validation segments,
    HSD detail, and III / LS / LE markers in the 271, plus QTY / AMT
    claim-summary roll-ups in a 277CA Loop 2200, are preserved on
    `tx.segments` verbatim but not yet typed onto the model.
- **Phase 5 — 837 Healthcare Claim — TR3s `005010X222A2` (Professional),
  `005010X223A3` (Institutional), `005010X224A2` (Dental).** The
  claim-creation surface — the volume side of HIPAA EDI traffic.
  `get837Claims(delimiters, tx, opts?)` walks a parsed 837 transaction
  set into the typed `X12_837Submission` model: variant detection (from
  ST-03 implementation-convention reference, falling back to SVx
  segment id, then to `"unknown"` with `X12_837_UNKNOWN_VARIANT`),
  submitter (Loop 1000A NM1\*41) + receiver (Loop 1000B NM1\*40), the
  full HL hierarchy (Loops 2000A / 2000B / 2000C), every claim header
  (Loop 2300 — CLM with patient account number, total charge,
  composite POS / facility-code-qualifier / claim-frequency-code,
  signature / assignment / benefits / release-of-information
  indicators), and every service line typed by variant (`SV1` →
  professional, `SV2` → institutional, `SV3` → dental).
  - **HL parent-pointer integrity.** The 837 family's safety primitive
    is the HL hierarchy (`HL-01` own id, `HL-02` parent id, `HL-03`
    level code: `20` Information Source / `22` Subscriber / `23`
    Dependent). An off-by-one in `HL-02` is THE #1 837 bug — the
    walker validates that every non-top-level HL's `HL-02` references
    an earlier-emitted `HL-01` AND that the parent's level matches the
    TR3-required parent for this level (`22` → parent `20`; `23` →
    parent `22`). Violations emit `X12_HL_PARENT_MISMATCH` or
    `X12_HL_PARENT_LEVEL_INVALID` — the parser NEVER silently
    re-numbers. The verbatim declared parent id stays on the
    `X12HierarchicalLevel` entry.
  - **HI qualifier → code-system provenance.** `HI` carries
    diagnoses, principal procedures, external cause of injury,
    condition codes, occurrence codes, value codes, and DRG / PR
    groupings under one segment id — with the qualifier (first
    component) governing the code system. The new
    `src/code-lists/hi-qualifiers.ts` ships a frozen `HI_QUALIFIERS`
    registry covering the qualifiers cited across the three TR3s
    (ICD-10-CM diagnoses: `ABK` principal / `ABF` other / `ABJ`
    admitting / `ABN` reason-for-visit / `APR` external-cause;
    legacy ICD-9-CM: `BK` / `BF` / `BJ` / `BN` / `BR`; ICD-10-PCS
    procedures: `BBQ` principal / `BBR` other; legacy ICD-9-PCS:
    `BQ` / `BBA`; DRG: `DR`; NUBC institutional code sets:
    `BG` condition / `BH` occurrence / `BI` occurrence-span / `BE`
    value / `PR` patient-reason). Each `X12ClaimHiCode` carries the
    verbatim qualifier AND the resolved {@link X12HiCodeSystem} +
    {@link X12HiCategory}; unknown qualifiers emit
    `X12_UNKNOWN_HI_QUALIFIER`, preserve the verbatim
    qualifier + code, and resolve to `codeSystem: "unknown"`. Helpers
    `resolveHiQualifier` / `isDiagnosisQualifier` /
    `isProcedureQualifier` ship in the public surface so consumers
    never re-derive the mapping.
  - **Money + identity discipline.** All monetary fields decode as
    `X12Decimal` (CLM-02 total charge, SV1-02 / SV2-03 / SV3-02 line
    charge, AMT amounts, SVD-02 adjudicated amount, CTP-04 drug
    quantity, line SV2-06 service-line rate, SV2-07 non-covered
    charge). All identifiers (NPI on `NM1*..*..*XX*<NPI>`, member id
    on `NM1*IL*..*MI*<MEMBER>`, claim id on CLM-01, patient/subscriber
    relationship code on PAT/SBR) are surfaced verbatim on the model;
    warnings NEVER echo their values (H-PHI invariant inherited from
    `@cosyte/hl7`). All dates carry their format qualifier (`D8`
    single-date `CCYYMMDD`, `RD8` date-range, `DT` for `DTP-435`/`096`
    admission/discharge timestamps) so a consumer can branch without
    re-parsing the literal.
  - **Variant-specific service-line types.** The
    {@link X12_837ServiceLine} discriminated union holds three shapes:
    - `X12_837ServiceLineProfessional` — `procedureQualifier` /
      `procedureCode` / `modifiers` from SV1-01 composite; 1-4
      `diagnosisPointers` from SV1-07; emergency / EPSDT / family-
      planning indicators; optional `drug` (Loop 2410 LIN + CTP NDC +
      UCUM unit).
    - `X12_837ServiceLineInstitutional` — `revenueCode` (NUBC 4-digit
      from SV2-01); optional procedure / modifiers from SV2-02
      composite; `serviceLineRate` (SV2-06); `nonCoveredCharge`
      (SV2-07).
    - `X12_837ServiceLineDental` — ADA CDT `procedureCode` from
      SV3-01; `oralCavityArea` composite from SV3-04; per-line
      `toothInformation` from `TOO*JP` (Universal Tooth Numbering)
      with surface codes from TOO-03's composite components;
      `prosthesisCrownInlayCode` (SV3-05).
  - **Loop 2430 Line Adjudication (COB).** SVD + CAS + DTP land on
    `serviceLine.adjudications` as `X12LineAdjudication[]`. Each
    adjudication ships the other-payer id (SVD-01), amount paid as
    `X12Decimal` (SVD-02), the other payer's procedure code, paid
    units, and any CAS adjustments — re-using `X12RemitAdjustment` /
    `lookupCarc` from the 835 helper since CAS semantics are
    identical.
  - **Loop 2320 Other Subscriber (COB).** Captured at the surface
    level: SBR-01 payer-responsibility code (`P` / `S` / `T`),
    individual relationship, claim filing indicator, and the
    other-subscriber + other-payer NM1 entities. Detailed CAS / OI /
    MOA breakdown inside Loop 2320 is deferred to Phase 9 (companion-
    guide tolerance) — verbatim segments remain on `tx.segments`.
  - **Eleven dogfooded `LoopSpec` artifacts** ship through the public
    `defineLoopSpec()` API — the dogfooding gate locked in Phase 2.
    `CLAIM_837_LOOP_1000A` / `_1000B` (submitter / receiver),
    `CLAIM_837_LOOP_2010AA` (billing provider name), `_2010BA`
    (subscriber name), `_2010BB` (payer name), `_2010CA` (patient
    name), `CLAIM_837P_LOOP_2410` (drug identification), `_LOOP_2430`
    (line adjudication), plus variant-specific
    `CLAIM_837{P,I,D}_LOOP_2000A` / `_2300` / `_2400` trees.
  - **Bundled HI qualifier registry under
    `src/code-lists/hi-qualifiers.ts`** alongside the existing CARC /
    RARC / CLP_STATUS / CAGC snapshots — formally part of the
    code-list family, not a transaction-local table.
  - **Two new exported constants for safety + ergonomics:**
    `HL_LEVEL_CODES` (`INFORMATION_SOURCE` `"20"` / `INFORMATION_RECEIVER`
    `"21"` / `SUBSCRIBER` `"22"` / `DEPENDENT` `"23"`) and
    `NM1_QUALIFIERS` (`SUBMITTER` `"41"` / `RECEIVER` `"40"` /
    `BILLING_PROVIDER` `"85"` / `PAY_TO_ADDRESS` `"87"` /
    `PAY_TO_PLAN` `"PE"` / `SUBSCRIBER` `"IL"` / `PAYER` `"PR"` /
    `PATIENT` `"QC"`) — so the walker (and any consumer Phase 8
    builder) never has to magic-string the safety-critical
    discriminators.
  - **Six new shared element-read helpers in `parser/segment.ts`** —
    `elementValue` / `elementOptional` / `componentOptional` /
    `elementDecimal` / `elementDecimalOrZero` / `collectElementValues`
    — extracted out of the 835 and 837 walkers (both walkers had
    byte-identical copies). New transaction walkers (Phase 6+ 270/271,
    277, 834) inherit them. Public surface — exported via
    `@cosyte/x12`.
  - **Public-surface additions** to the warning stability snapshot:
    `X12_HL_PARENT_MISMATCH`, `X12_HL_PARENT_LEVEL_INVALID`,
    `X12_UNKNOWN_HI_QUALIFIER`, `X12_MISSING_REQUIRED_LOOP`,
    `X12_837_UNKNOWN_VARIANT` (13 → 18 Tier-2 codes; additions-only
    — fatal registry stays at 4). All new warning factories
    (`hlParentMismatch` / `hlParentLevelInvalid` /
    `unknownHiQualifier` / `missingRequiredLoop` /
    `unknown837Variant`) shape-validate echoed values through
    dedicated regex patterns (`/^[0-9]{1,4}$/u` for HL ids,
    `/^[0-9]{2}$/u` for level codes, `/^[A-Z][A-Z0-9]{1,2}$/u` for HI
    qualifiers, `/^[0-9A-Z]{3,6}$/u` for loop ids,
    `/^[0-9A-Z]{3,16}$/u` for ICR) and substitute `(non-spec)` for
    hostile inputs — the H-PHI invariant from `@cosyte/hl7`.
  - **PHI discipline.** Warnings NEVER echo field VALUES; the
    `missingRequiredLoop` rationale strings are hard-coded literals
    (no element interpolation). Patient names / member IDs / NPIs /
    claim numbers are surfaced verbatim on the typed model only — the
    documented consumer-redaction boundary (mirrors hl7 + the 835
    helper). The `X12ClaimNote` JSDoc explicitly flags NTE-02 as
    PHI-bearing (provider-supplied free text). Every Phase 5 fixture
    is synthetic (test names `TEST PATIENT` / `SUB LAST` / `PATIENT
CHILD`; sequential member IDs `MEMBER001`–`MEMBER011` etc.; NPI-
    shaped sequential numbers; obvious test addresses) and matches
    the established 835 fixture conventions.
  - **Known limitations after this phase** (deliberate v1 scope; none
    silent — verbatim segments remain on `tx.segments` for raw
    access):
    - Loop 2320/2330 Other Subscriber / Other Payer captured at the
      surface level only — detailed CAS / OI / MOA inside Loop 2320
      deferred to Phase 9 (companion-guide profile system).
    - Loop 2420 service-line provider names captured verbatim on
      `serviceLine.providers`; per-provider PRV + address not yet
      typed at the line level.
    - CN1 contract information preserved verbatim on `tx.segments`,
      not typed onto the model.
    - Companion-guide enforcement (e.g. Availity's required `REF*EA`
      at the billing provider) deferred to Phase 9 (profile system).
    - 837 **builder** (`build837P` / `I` / `D`) deferred to Phase 8.
  - **Fixtures (10 synthetic).** Three Tier-1 canonical files (one per
    variant). Six Tier-2 quirk fixtures covering HL-orphan (parent id
    missing), unknown HI qualifier, patient HL (Loop 2000C with
    patient ≠ subscriber), institutional pay-to-plan (NM1\*PE),
    unknown variant (ST-03 outside snapshot), empty optionals (NTE /
    AMT / DTP with missing fields, 2320 SBR with empty payer-
    responsibility code), and one comprehensive fixture exercising
    every walker branch (pay-to-address, submitter PER + N3/N4/REF,
    subscriber DMG + REF + PER, 2310 rendering + referring providers,
    2320 other-subscriber + other-payer, 2410 LIN + CTP drug, 2430
    SVD + CAS + DTP adjudication).
  - **Tests.** 56 new tests across 4 new files: unit tests for the
    three Tier-1 variants + HL parent integrity + HI qualifier
    resolution; HI qualifier table unit tests (registry shape,
    diagnosis / procedure classification disjointness); HL hierarchy
    property tests (verbatim preservation, never-throw on every
    fixture); 837 byte-flip fuzz target (300 runs per fixture × 6
    claim fixtures = 1800 mutated inputs, never throws outside the
    four Tier-3 envelope fatals); comprehensive coverage tests
    exercising every walker branch on the comprehensive fixture +
    edge cases. **325 tests total** (up from 269).
  - **Coverage.** Verify gate green: typecheck + lint + format +
    coverage (96.91% stmts / 90.61% branches / 97.67% funcs / 98.49%
    lines globally; per-dir ≥90 on `parser/` + `loops/` +
    `transactions/` + `code-lists/`) + build + attw + verify:exports.
  - **`phi-scan` SKIP** — unchanged from Phase 4. The runtime H-PHI
    invariant is necessary but not sufficient; static fixture
    scanning is tracked as the `X12-PHI-SCAN` backlog follow-up.

### Changed

- **`parser/segment.ts` gains 6 element-read helpers** as Public API:
  `elementValue` / `elementOptional` / `componentOptional` /
  `elementDecimal` / `elementDecimalOrZero` / `collectElementValues`.
  Re-used by the 835 helper (`get835`) and the new 837 helper
  (`get837Claims`) — both walkers previously defined byte-identical
  copies of these inline. Additive; no breaking change.

- **`src/code-lists/` gains `hi-qualifiers.ts`** with `HI_QUALIFIERS`
  / `resolveHiQualifier` / `isDiagnosisQualifier` /
  `isProcedureQualifier` and the `X12HiCategory` / `X12HiCodeSystem`
  / `X12HiQualifier` types. Re-exported from `@cosyte/x12` root.

- **Phase 4 — 835 Healthcare Claim Payment/Advice (ERA) — TR3
  `005010X221A1`.** The cash-posting surface — money, the consultant ask.
  `get835(delimiters, tx)` walks a parsed 835 transaction set into the
  typed `X12Remittance` model: payment header (BPR), trace numbers (TRN),
  payer / payee parties (Loops 1000A / 1000B with address / contact /
  additional identifiers), every claim payment (Loop 2100 — CLP plus
  patient / subscriber / service-provider NM1s, statement-period DTMs,
  CAS adjustments at both claim and service-line scope, MIA / MOA / LQ
  remarks, REF / AMT supplemental amounts), every service line (Loop
  2110 — SVC with HCPCS / CPT / NDC / revenue-code / modifier
  destructuring, service-date DTMs, line-level CAS / REF / AMT / LQ),
  and provider-level adjustments (PLB with multi-pair flattening). The
  loop hierarchy ships as three frozen `LoopSpec` artifacts
  (`REMIT_835_LOOP_2000`, `REMIT_835_LOOP_2100`, `REMIT_835_LOOP_2110`)
  authored through the public `defineLoopSpec()` API — the **dogfooding
  gate** locked in Phase 2. Two payer-side loop specs (1000A / 1000B)
  also ship as introspection artifacts.
  - **Money discipline.** All monetary fields decode as the new
    `X12Decimal` (`src/decimal.ts`): a string-backed decimal type with
    `BigInt`-exact arithmetic. **NEVER `parseFloat`** — float
    representation silently destroys cents at scale; on an 835 a dropped
    decimal is the wrong dollar amount in someone's cash post.
    `X12Decimal` preserves the inbound lexical form for byte-exact
    round-trip (`X12Decimal.fromString("0050.00").toString()` →
    `"0050.00"`), exposes mathematical equality across scales
    (`"0.00".equals("0")` → true), and ships `add` / `subtract` /
    `compareTo` / `abs` / `negate` / `signum` / `isZero` plus a lossy
    `toNumber()` whose JSDoc warns about precision loss. `fromBigInt(value,
scale)` renders canonically with zero-padded fractions; the canonical
    `X12Decimal.ZERO` is the additive identity. Empty inbound element →
    `undefined` (not zero) — "not supplied" and "zero dollars" are
    spec-distinct.
  - **Balance invariants (per TR3 X221A1 §1.10.2 — "Balancing the 835").**
    Three checks run after the walk and emit
    `X12_835_REMIT_BALANCE_MISMATCH` on mismatch — the model is **NEVER
    silently rebalanced**: 1. Line: `SVC-02 === SVC-03 + Σ(line CAS)` per Loop 2110. 2. Claim: `CLP-03 === CLP-04 + Σ(all CAS in claim, claim AND line
level)` — the X12 spec balance. CLP-05 (patient responsibility)
    is informational, NOT part of the balance equation. The
    implementation matches the TR3 §1.10.2 text directly; an earlier
    roadmap sketch (`operations/roadmaps/x12.md` §4) used a slightly
    different decomposition — `src/transactions/remit/balance.ts`
    documents the divergence so the contract stays consistent. 3. Top-of-remit: `BPR-02 === Σ(CLP-04) - Σ(PLB amounts)`. PLB
    amounts are stored with the **raw EDI sign** (positive = take-back
    from provider; negative = credit to provider), so the equation
    _subtracts_ PLB to balance.
    Warning messages echo only the invariant label and `X12Decimal`
    decimal text — never patient identifiers, member ids, or account
    numbers (H-PHI invariant).
  - **CAS triple flattening.** A single CAS segment can carry up to 6
    `(reason, amount, quantity)` triples under one `CAS-01` group code;
    the walker flattens them into individual `X12RemitAdjustment`
    entries. Different group codes (CO / PR / OA / PI) require separate
    CAS segments — they cannot mix inside one — and the decoder honors
    that contract.
  - **Bundled WPC + X12-internal code-list snapshots** (initial
    subsets, pre-launch). Versioned data artifacts at
    `src/code-lists/`; the Phase 10 `pnpm refresh:code-lists` script
    will regen the full lists from canonical sources for the first real
    publish. Each snapshot ships `meta.id` / `meta.snapshotDate` /
    `meta.publishedDate` / `meta.source` so consumers can decide
    whether a stale description matters. Helpers `lookupCarc(code)` /
    `lookupRarc(code)` / `lookupClpStatus(code)` return `{ code,
description }` for known codes, `undefined` otherwise; unknown
    codes preserve the verbatim value on the parsed adjustment AND
    emit `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC`. - `CARC` (Claim Adjustment Reason Codes) — ~30 most commonly
    observed codes (WPC, snapshotDate 2026-06-27). - `RARC` (Remittance Advice Remark Codes) — ~15 most commonly
    observed codes covering both `M`- and `N`-prefix conventions
    (WPC, snapshotDate 2026-06-27). - `CLP_STATUS` (CLP-02 Claim Status Code, X12 Code Source 65) —
    10 dispositions (1 Processed as Primary, 4 Denied, 22 Reversal,
    …). X12-internal list, stable. - `CLAIM_ADJUSTMENT_GROUP_CODES` — the spec-fixed 4 values
    (`CO` / `PR` / `OA` / `PI`) as a frozen literal-union map,
    not a snapshot (this list never grows). `isClaimAdjustmentGroupCode`
    narrows inbound strings.
  - **Public-surface additions** to the warning / fatal stability
    snapshot: `X12_835_REMIT_BALANCE_MISMATCH`,
    `X12_UNKNOWN_CARC`, `X12_UNKNOWN_RARC` (10 → 13 Tier-2 codes;
    additions-only — fatal registry stays at 4). New warning factories
    `remitBalanceMismatch` / `unknownCarc` / `unknownRarc` carry the
    shape-validated echo discipline (CARC / RARC echoes pass
    `/^[A-Z0-9]{1,5}$/u` or collapse to `(non-spec)`).
  - **PHI discipline (H-PHI invariant holds suite-wide).** Warning
    messages never echo field VALUES — only positional context, the
    invariant label, the shape-validated CARC / RARC code, or numeric
    X12Decimal text. Patient names, member ids, NPIs, payer claim
    control numbers, and account numbers are held verbatim on the
    parsed model (consumer-redaction boundary, mirroring hl7's H-PHI
    posture) but never routed through warnings or errors. Every fixture
    is synthetic (Greek-letter patient names, `MEMBER-*` member ids,
    repetitive-digit NPIs); `phi-redaction-review` passed at commit time.
  - **Six fixtures under `test/fixtures/remit/`.** Five Tier-1
    synthetic spec-clean (`835-medicare-canonical.edi`,
    `835-multi-claim.edi`, `835-with-plb.edi`,
    `835-carc-rarc-mix.edi`, `835-imbalance.edi`) and one Tier-2
    synthetic quirk shape (`835-availity-quirk.edi` — REF*2U + REF*F8
    placements). The imbalance fixture is deliberately off-by-$10 to
    prove the balance warning fires and the model preserves the
    verbatim amounts.
  - **Property tests.** `decimal.property.test.ts` locks lexical
    round-trip + additive identity + commutativity + subtraction-by-
    addition + negation involution + sign-consistency invariants (over
    500 runs each). `remit-835-balance.property.test.ts` synthesizes
    balanced and deliberately-imbalanced single-line claims and asserts
    the balance warning fires iff out of balance (100 + 50 runs).
    `remit-835-fuzz.property.test.ts` byte-flips every committed
    fixture 300 times per fixture and asserts `get835` never throws
    outside the 4 Tier-3 fatals — the byte-level fuzz target the
    roadmap calls for.
  - **Coverage gates expanded** to per-directory ≥90 on `parser/`,
    `loops/`, `transactions/`, `code-lists/`. Phase 4 lands the gate
    at **97.7% statements / 91.97% branches / 99.24% functions /
    99.38% lines** globally.
  - **Spec traceability:** TR3 `005010X221A1` for the 835 itself; X12
    Code Source 65 for CLP-02; WPC public-domain lists for CARC / RARC;
    X12 Data Element 1033 for the Claim Adjustment Group Code.
  - **Known limitations after Phase 4:** no 835 _building_ yet (that's
    Phase 8 — round-trip + spec-clean serializer + builder); the
    bundled CARC / RARC are an **initial subset** (`pnpm
refresh:code-lists` arrives in Phase 10); no per-payer profile
    yet (Phase 9); CPT / ICD-10 / NDC descriptions are deliberately
    NOT bundled (license-gated — see `operations/roadmaps/x12.md` §5);
    `X12Decimal` does not yet expose multiply / divide (no balance
    invariant needs them in v1). `phi-scan` script not yet wired for
    x12 — the H-PHI property tests provide runtime coverage; an
    explicit pre-commit phi-scan ships in a future slice (tracked in
    `operations/prompts/x12-phi-scan.md`).

- **Phase 3 — 999 + TA1 acknowledgments (TR3 005010X231A1).** Two
  pure-function ack surfaces ship side-by-side; neither auto-sends, opens
  a socket, or touches the filesystem. The cosyte ack archetype: the
  library MECHANICALLY builds the disposition it is told and REFUSES to
  fabricate an Accept against a non-empty error list. Mirrors hl7's
  upcoming `buildAck` boundary and mllp's commit-contract pattern.
  - **999 (Implementation Acknowledgment) — TR3 005010X231A1.**
    `parse999(raw, opts?)` decodes the AK1 → AK2 → (IK3 [→ CTX] (IK4 [→
    CTX])\*)\* → IK5 → AK9 hierarchy into the typed `X12Ack999`. Standard
    X12 / pre-X231A1 legacy senders that emit `AK3`/`AK4`/`AK5` instead
    of `IK3`/`IK4`/`IK5` are lenient-accepted on parse (normalized onto
    the X231A1 names) per Postel's Law; `build999` always emits the
    X231A1 names. `build999(spec)` assembles a complete `X12Interchange`
    wrapping a single ISA → GS → ST..SE → GE → IEA with one 999 inside,
    spec-clean and round-trippable through `parseX12`.
  - **TA1 (Interchange Acknowledgment) — ASC X12 standard, envelope
    level.** The Phase 1 envelope walker now captures envelope-level
    TA1 segments verbatim onto `X12Interchange.ta1Segments` — TA1
    between ISA and the first GS (the canonical position) is recognized
    as spec-conformant and NO `X12_UNEXPECTED_SEGMENT` warning fires;
    a TA1 inside an open functional group is still flagged as unexpected
    (non-spec). `parseTA1(interchange)` returns the typed `X12AckTA1`
    for the first captured TA1 (or `undefined`). `buildTA1(spec)` emits
    a fixed-position 5-element `Ta1Segment` (`TA101`–`TA105`) — caller
    wraps it in their preferred envelope. Both standalone TA1-only
    interchanges (ISA → TA1 → IEA, no GS) and embedded TA1s round-trip.
  - **Safety guards (refused via `AckBuildError`):** `build999` refuses
    a functional `AK9-01 = 'A'` paired with any per-transaction non-`A`
    response OR any error payload anywhere
    (`X12_ACK_ACCEPT_WITH_ERRORS`); refuses internally inconsistent AK9
    counts (`0 ≤ accepted ≤ received ≤ declared`,
    `responses.length == received`, ≤ 5 syntax error codes on IK5/AK9)
    (`X12_ACK_COUNT_MISMATCH`); refuses an ISA-13 longer than 9 chars
    (`X12_ACK_INVALID_SPEC`). `buildTA1` refuses `TA1-04 = 'A'` paired
    with a non-`000` TA1-05 note code (`X12_TA1_ACCEPT_WITH_NOTE`).
    Four stable `ACK_BUILD_ERROR_CODES` typed as `AckBuildErrorCode`
    discriminate the cases.
  - **Public code-list registries:** `X12_ACK_DISPOSITION_CODES`
    (code list 715: `A`/`E`/`P`/`R`/`M`/`W`/`X`),
    `IK3_SYNTAX_ERROR_CODES` (code list 716, 13 codes),
    `IK4_SYNTAX_ERROR_CODES` (code list 723, 18 codes),
    `TA1_ACK_CODES` (code list I13: `A`/`E`/`R`),
    `TA1_NOTE_CODES` (code list I18: `000`–`028`). String-literal
    unions are exported for exhaustive narrowing. The helper
    `isAcceptDisposition(code)` returns true for `A`/`E`/`P` and false
    for the four reject codes.
  - **PHI discipline (acks are structurally PHI-free by design):**
    Control numbers, segment IDs, position counters, and structural
    error codes ONLY. The one variable-shape surface that COULD carry
    PHI — `IK4-04` (`copyOfBadDataElement`) — is documented on both the
    parsed-model type AND the build-spec type as a caller-supplied
    field that callers SHOULD omit when the offending bytes are PHI.
    The library NEVER auto-populates `IK4-04`. Error messages
    interpolate only control numbers, disposition codes, and count
    integers; no PHI-shape paths. The `phi-redaction-review` crew gate
    passed at commit time; locked `999 — PHI safety` and `TA1 — PHI
safety` test blocks assert no SSN / ISO-date / long-digit-run
    shapes appear in built output.
  - **Three Tier-1 999 fixtures** (`999-accept.edi`,
    `999-accept-with-errors.edi`,
    `999-reject-control-number-mismatch.edi`) and **three Tier-1 TA1
    fixtures** (`ta1-accept.edi`, `ta1-accept-with-errors.edi`,
    `ta1-reject-control-mismatch.edi`). All synthetic, no PHI.
  - **Property tests:** `parse999(build999(spec))` round-trips
    dispositions, counts, and AK1 echo on every clean accept (200
    runs); functional `A` + any non-`A` per-transaction disposition
    throws `AckBuildError` with code `X12_ACK_ACCEPT_WITH_ERRORS` (100
    runs); functional `A` + non-empty AK9 syntax error codes throws the
    same code (100 runs). Locks the Phase 3 safety invariant.
  - **Public-surface additions** to the warning / fatal stability
    snapshot: `Ta1Segment` type on the envelope-level surface;
    `X12Interchange.ta1Segments: readonly Ta1Segment[]` (additive, no
    rename); no new entries to `WARNING_CODES` or `FATAL_CODES`
    (Phase 3 keeps both registries at the Phase-2-locked sizes of 10
    and 4 — additions-only thereafter).
  - **Spec traceability:** TR3 `005010X231A1` (999); ASC X12 standard §
    TA1 Interchange Acknowledgment; code lists 715 / 716 / 723 / I13 / I18.
  - **Known limitations after Phase 3:** Acks reference STRUCTURAL
    errors only — they cannot report semantic / payment errors (those
    live in `277CA` Phase 6 / `835` Phase 4). No multi-TA1 fan-out
    helper (consumers iterate `ta1Segments` directly when more than
    one inbound interchange is being acknowledged). The 999
    transaction-set surface does not yet expose a public Loop-spec
    artifact — Phase 3 hand-walks the AK1/AK2/IK3/IK4/IK5/AK9 hierarchy
    in `parse-999.ts`; the dogfooding gate for `defineLoopSpec` lands
    fully with Phase 4's 835 + Phase 5's 837 work.

- **Phase 2 — syntactic core: segment / element / composite / repetition
  decode + warning registry + `defineLoopSpec`.** Every body segment inside
  a transaction is now decoded into an immutable `X12Segment` carrying its
  id, raw text, and 1-indexed element array. The verbatim source survives
  on `X12TransactionSet.rawSegments` so a byte-exact round-trip is still
  achievable independently of any downstream consumer's reads.
  - **`?`-release-character escape** (`?~` → literal `~`, `?*` → literal
    `*`, `?:` → literal `:`, `?^` → literal `^`, `??` → literal `?`)
    implemented in `unescapeRelease` / `escapeRelease` / `splitWithRelease`
    (zero-dep, single-pass). Pair has a lossless round-trip property:
    `unescapeRelease(escapeRelease(v, d), d) === v` for any value `v` and
    any 4-distinct-delimiter set `d` (500 fast-check runs). An unpaired
    trailing `?` is preserved verbatim AND warned as
    `X12_DANGLING_RELEASE_CHAR`; a `?` followed by a non-delimiter is
    preserved verbatim with no warning (Postel's Law).
  - **Dot-path traversal** — `getSegmentValue(seg, "03-1")` resolves
    composite sub-element 1 of element 3 (both 1-indexed, matching TR3);
    `"03[2]"` resolves the 3rd repetition (0-indexed); `"03[2]-1"` combines
    them. Returns `undefined` for out-of-range paths, throws `TypeError`
    only on malformed path strings (consumer bug). `getAllSegmentValues`
    returns every repetition (or every Nth component) as `readonly string[]`.
  - **Public `defineLoopSpec()` API** for TR3 loop authoring, ships with
    structural validation + a typed `LoopSpecDefinitionError`. Phase 3+
    transaction extractors author their built-in 999 / TA1 / 835 / 837
    loops through the SAME public API consumers use for payer-specific
    loops — the dogfooding gate locked in `documentation/repos/x12.md`.
  - **Warning registry expanded 8 → 10** (additions-only):
    `X12_DANGLING_RELEASE_CHAR` (unpaired `?` at element/segment end;
    bytes are preserved on the parent element) and
    `X12_UNEXPECTED_SEGMENT` (a `GE` with no open `GS`, `SE` with no open
    `ST`, body segment outside any `ST..SE` — cases the Phase 1 walker
    dropped silently). The PUBLIC `WARNING_CODES` snapshot test is the
    breaking-change tripwire — renaming a code is breaking, additions
    are not.
  - **PHI discipline (mirrors hl7's H-PHI invariant):**
    `X12_UNEXPECTED_SEGMENT` SHAPE-VALIDATES the echoed segment id
    against `/^[A-Z][A-Z0-9]{1,2}$/u` and substitutes the literal
    `(non-spec)` for anything else, so hostile input that puts PHI in
    the first slot of a malformed "segment" never has those bytes
    echoed into a warning message. The bytes themselves are preserved
    on the parent container so consumers that want to inspect them can.
  - **Tier-1 fixture** (`syntactic-core-body.edi`) exercises every Phase 2
    surface end-to-end: composites (`HI*ABK:J45.50`), repetitions
    (`EQ*30^35^88`), `?`-release-character escape (`REF*EA*ID?*WITH?*STAR`),
    and straight-element segments (BHT, NM1). Real-world synthetic — no
    PHI. Parses with zero warnings.
  - **Properties:** release-escape round-trip (any value, any delimiters),
    escapeRelease output is fully decodable as `?<reserved>` pairs +
    non-reserved bytes (500 runs each), and a streaming-decode invariant
    (parser output is independent of input chunking — locks the v2
    streaming surface as a non-breaking future addition).
  - **`X12TransactionSet.segments` shape changed** from
    `readonly string[]` to `readonly X12Segment[]`; the raw form moves to
    `X12TransactionSet.rawSegments`. **Pre-alpha `0.0.x` consumers should
    migrate.** Library-internal change; no impact on `ix.warnings`,
    `ix.delimiters`, or the envelope-level accessors.

- **Phase 1 — envelope decoder.** `parseX12()` decodes the ISA / GS / GE / IEA
  interchange envelope from a raw `string` or `Buffer`, detecting all four
  delimiters (`element` byte 4, `repetition` ISA-11, `component` ISA-16,
  `segment` post-ISA-16) from fixed positions inside the ISA itself — the parser
  NEVER assumes a delimiter. Transaction-set bodies inside each ST..SE are kept
  opaque at this phase (raw segment strings, terminator stripped); Phase 2 adds
  segment / element / composite / repetition decode on top.
  - 4 Tier-3 fatal codes (locked, additions-only thereafter): `X12_EMPTY_INPUT`,
    `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`.
  - 8 Tier-2 warning codes (additions-only): `X12_PRE_005010`,
    `X12_CONTROL_NUMBER_MISMATCH` (ISA-13↔IEA-02, GS-06↔GE-02, ST-02↔SE-02),
    `X12_GROUP_COUNT_MISMATCH`, `X12_TRANSACTION_COUNT_MISMATCH`,
    `X12_MISSING_IEA`, `X12_MISSING_GE`, `X12_MISSING_SE`, `X12_TRAILING_GARBAGE`
    (with verbatim `trailingBytes` preserved on the returned interchange).
  - `X12ParseError` carries `code`, `position` (interchange/group/transaction/
    segment/element indices), and a bounded `snippet` (≤ 64 chars) that is the
    documented consumer-redaction boundary. Warning messages NEVER echo field
    values — they carry positional context plus bounded metadata (counts,
    control-number pairs) — mirroring the hl7 H-PHI invariant.
  - Strict mode (`parseX12(raw, { strict: true })`) escalates the first Tier-2
    warning into a thrown `X12ParseError` carrying the warning code.
  - 4 Tier-1 envelope fixtures committed under `test/fixtures/envelope/`
    (canonical Medicare `*^:~`, Availity `^` repetition, BCBS `\` sub-element,
    no-trailing-CRLF). Plus property tests (lenient never throws outside the 4
    fatals, round-trip ISA byte-exact preservation), warning-codes snapshot,
    and a byte-flip envelope fuzz target.
  - Per-directory ≥90 coverage gate armed on `src/parser/` (current: 100%
    statements / 98.75% branches / 100% functions / 100% lines).

### Changed

- Inherits `@cosyte/test-utils` and `fast-check` as devDependencies — the
  conformance-kit runners (`lenientNeverThrowsProperty`) and the property/fuzz
  arbitraries land alongside the Phase 1 envelope code.

### Previously

- Initial repo scaffolding: package metadata, dual ESM + CJS build via `tsup`,
  strict TypeScript, type-checked ESLint with a JSDoc/`@example` gate on public
  exports, Prettier, and Vitest.

### Changed

- Migrated onto the shared cosyte engineering standard (Phase E). The toolchain
  is now inherited from the published `@cosyte/*` config packages instead of
  per-repo copies: `tsup.config.ts` uses `cosyteTsup`, `vitest.config.ts` uses
  `cosyteVitest`, and `eslint.config.js` is the three-line `cosyte` wrapper.
  Bumped to ESLint 10, Vitest 4 (+ `@vitest/coverage-v8` 4), Vite 7, and
  `@types/node` 22; added `@arethetypeswrong/cli` with an `attw --pack .` gate
  wired into `prepublishOnly`. CI and release are now thin callers of the
  reusable `cosyte/.github` workflows (the shared pipeline runs the Node 22 + 24
  matrix). The shared `@cosyte/tsconfig` base sets `verbatimModuleSyntax: false`.
- Removed `.github/dependabot.yml`; org-wide dependency updates will be handled
  by Renovate when it is rolled out.

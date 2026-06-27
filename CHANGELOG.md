# Changelog

All notable changes to `@cosyte/x12` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

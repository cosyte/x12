# Changelog

All notable changes to `@cosyte/x12` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

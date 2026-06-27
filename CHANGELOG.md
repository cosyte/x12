# Changelog

All notable changes to `@cosyte/x12` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

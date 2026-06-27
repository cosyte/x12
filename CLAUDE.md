# @cosyte/x12 — Project Guide for Claude

## Project

**`@cosyte/x12`** — a developer-focused ASC X12 EDI parser + utility library for Node.js/TypeScript, published under the Cosyte brand. Open-source (MIT). The payer-side sibling of [`@cosyte/hl7`](../hl7) — API shape, profile system, and lenient-parser philosophy are deliberately mirrored.

**North star:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line — without having read the X12 standard or any TR3 implementation guide.

## Status

- **Phase 5 — 837 Healthcare Claim (Professional / Institutional / Dental)
  shipped (2026-06-27).** `get837Claims(delimiters, tx, opts?)` walks a
  parsed 837 transaction set into the typed `X12_837Submission` model
  across the three sibling TR3s (`005010X222A2` / `X223A3` / `X224A2`).
  Variant detection from ST-03 implementation-convention reference, with
  SVx-segment-id fallback and `X12_837_UNKNOWN_VARIANT` when neither
  resolves. HL hierarchy validated for parent-pointer integrity (`HL-02`
  must reference an earlier `HL-01`; level must match the TR3-required
  parent: `22` → `20`, `23` → `22`) — violations emit
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
  **Phase 6 — `get271Eligibility`/`get277Status`/`get277CADisposition`
  (eligibility + claim status) is the next safety-critical phase.**
- **Phase 4 — 835 Healthcare Claim Payment/Advice (ERA) shipped (2026-06-27).**
  `get835(delimiters, tx)` walks a parsed 835 transaction set into the
  typed `X12Remittance` model: BPR payment header, TRN trace numbers,
  Loop 1000A / 1000B payer + payee parties, Loop 2100 claims (with
  patient / subscriber / service-provider NM1s, CAS adjustments,
  MIA / MOA / LQ remarks, REF / AMT supplemental amounts), Loop 2110
  service lines (with HCPCS / CPT / NDC / revenue-code destructuring,
  line-level CAS / REF / AMT / LQ), and PLB provider-level adjustments.
  All monetary fields decode as the new `X12Decimal` — string-backed,
  `BigInt`-exact arithmetic, **NEVER `parseFloat`**. Three balance
  invariants run after the walk per TR3 X221A1 §1.10.2 (line, claim,
  top-of-remit) and emit `X12_835_REMIT_BALANCE_MISMATCH` on mismatch
  — the model is NEVER silently rebalanced; PLB amounts carry the raw
  EDI sign (positive = take-back, so the top equation is
  `BPR-02 == Σ(CLP-04) - Σ(PLB)`). Bundled WPC + X12-internal code-
  list snapshots ship as versioned data artifacts (`CARC` ~30 codes,
  `RARC` ~15 codes, `CLP_STATUS` 10 codes, `CLAIM_ADJUSTMENT_GROUP_CODES`
  as a frozen 4-value literal union); unknown codes preserve the
  verbatim value and emit `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC`.
  Three built-in `LoopSpec` artifacts (Loop 2000 / 2100 / 2110) ship
  through the public `defineLoopSpec()` API — the dogfooding gate.
  Warning registry expanded 10 → 13 (additions-only); shape-validated
  CARC / RARC echoes mirror the H-PHI invariant from `@cosyte/hl7`.
  Six fixtures (5 Tier-1 synthetic spec-clean + 1 Tier-2 Availity-
  quirk de-identified). Property tests: `X12Decimal` algebra invariants
  (round-trip / additive identity / commutativity / subtraction-by-
  addition / negation involution); balance-invariant property
  (balanced ⇒ no warning; imbalanced ⇒ warning + verbatim preservation);
  byte-level 835 fuzz target across every fixture (300 runs each).
  Verify gate green: typecheck + lint + format + coverage (97.7%
  stmts / 91.97% branches / 99.24% funcs / 99.38% lines, per-dir
  ≥90 on `parser/` / `loops/` / `transactions/` / `code-lists/`) +
  build + attw + verify:exports. 269 tests total.
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
  callers SHOULD omit when bytes are PHI — the library NEVER
  auto-populates it.
- **Phase 2 syntactic core shipped (2026-06-27).** Every body segment in a transaction is decoded
  into an immutable `X12Segment` (id + 1-indexed elements; raw text preserved on
  `X12TransactionSet.rawSegments`). The `?`-release-character escape is honored losslessly
  (`?~`→`~`, `?*`→`*`, `??`→`?`); dot-path traversal (`getSegmentValue(seg, "03-1")`) walks
  elements, composites (`-N` 1-indexed), and repetitions (`[N]` 0-indexed). Public
  `defineLoopSpec()` API ships — Phases 3+ author their built-in TR3 loops through it. Warning
  registry expanded 8 → 10 (`X12_DANGLING_RELEASE_CHAR`, `X12_UNEXPECTED_SEGMENT`).
- **Phase 1 envelope decoder shipped (2026-06-27).** `parseX12()` decodes ISA / GS / GE / IEA, detects
  all four delimiters from fixed ISA byte positions, surfaces stable warning codes + 4 Tier-3 fatal
  codes, and round-trips the ISA byte-exact.
- On the shared cosyte engineering standard (migrated Phase E) — toolchain inherited from the
  published `@cosyte/*` config packages, CI/release are thin callers of `cosyte/.github`. Per-directory
  ≥90 coverage gate armed on `src/parser/`.
- Pre-alpha `0.0.x`, not published to npm. Next: **Phase 6** —
  `get271Eligibility()` (`005010X279A1`) + `get277Status()` (`005010X212`) +
  `get277CADisposition()` (`005010X214`) for eligibility + claim-status.
  271 MUST echo the requesting 270's TRN verbatim (safety-critical
  reassociation path); 277CA is the high-volume clearinghouse
  acknowledgment, not the same TR3 as 277-as-status. Bundled service-type
  + CSCC / CSC code-list snapshots land alongside the existing CARC /
  RARC / CLP_STATUS / HI_QUALIFIERS family.

## v1 Scope Snapshot

HIPAA healthcare transaction sets at version **005010** (with errata hooks for `005010X279A1`, `005010X221A1`, etc.):

- **270 / 271** Eligibility Inquiry / Response
- **276 / 277** Claim Status Inquiry / Response (incl. 277CA)
- **278** Services Review (Request + Response)
- **820** Premium Payment
- **834** Benefit Enrollment & Maintenance
- **835** Healthcare Claim Payment/Advice (ERA)
- **837P / 837I / 837D** Professional / Institutional / Dental Claims
- **999** Implementation Acknowledgment (parse + build)
- **TA1** Interchange Acknowledgment (parse + build)

Non-healthcare (850/856/810/204), EDIFACT, AS2/SFTP transport, and pre-005010 are out of v1 scope.

## Tech Stack (the shared `@cosyte/*` standard)

x12 mirrors `@cosyte/hl7` (the reference parser) and inherits the canonical toolchain by depending on
the published `@cosyte/*` config packages, not by copying files. The source of truth is the meta-repo's
`documentation/conventions.md` — this is a summary.

- **Language:** TypeScript (strict, full rigor set incl. `noUncheckedIndexedAccess`) via
  `@cosyte/tsconfig`. **Target ES2023**. The shared base sets `verbatimModuleSyntax: false`.
- **Build:** dual ESM + CJS + `.d.ts` via `tsup` (`@cosyte/tsup-config`); `attw` is a publish gate
  (per-condition types: `.d.ts` for `import`, `.d.cts` for `require`).
- **Node:** **>= 22** (CI matrix 22 + 24, via the reusable pipeline).
- **Package manager:** `pnpm@10`.
- **Lint/format:** **ESLint 10** + unified `typescript-eslint` (type-checked) via
  `@cosyte/eslint-config`; Prettier via `@cosyte/prettier-config`. Lint at `--max-warnings=0`.
- **Testing:** **Vitest 4** + v8 coverage (`@cosyte/vitest-config`), per-directory >= 90 gates
  (armed globally now; per-dir gates get listed in `vitest.config.ts` once parser code lands).
- **CI/CD:** thin callers of the reusable `cosyte/.github` workflows.
- **Runtime deps:** **Zero.** Node stdlib only.
- **License:** MIT

## Engineering Guardrails

- No `any`. No unjustified `as` casts. Use `unknown` and narrow.
- JSDoc (with `@example`) on every public export — feeds IntelliSense.
- Immutable by default. Mutation only via explicit methods (`setElement`, `addSegment`, `addLoopIteration`, `removeSegment`).
- No `console.*` in library code. Throw typed errors or return results.
- Short, testable functions over big parsing blobs.
- Postel's Law: parser is liberal (lenient default + warnings with stable codes and positional context); serializer is conservative (always emits spec-clean X12 with recomputed envelope counts where requested).
- Fatal errors only for unrecoverable structural corruption (4 Tier-3 codes: `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`). Everything else is a warning.
- Coverage target: ≥ 90% on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/`.
- Built-in loop specs + profiles must be authored through the same public API (`defineLoopSpec()`, `defineProfile()`) — dogfooding gate.
- HIPAA code lists ship as versioned data snapshots. Code-list updates are a release event, not a runtime fetch. `codeLists.meta.snapshotDate` is the runtime surface for snapshot-freshness checks.
- Acknowledgments (`build999`, `buildTA1`, `parse999`) are pure functions — they never auto-send, never open sockets, never touch the filesystem.

## Sibling Project

**`@cosyte/hl7`** lives at `../hl7` and ships a matching API shape for HL7 v2. When in doubt on an API decision, check how `@cosyte/hl7` solved it — symmetry is a feature, not an accident.

## Standing disciplines (every change)

These three bind every change in this repo (mirrored from the cosyte meta-repo's
`documentation/conventions.md`):

1. **Documentation follows code.** A public-surface / stack / status change isn't done until its
   docs are: this package's own docs (`docs-content/` + JSDoc), and — in the meta-repo — its
   `documentation/repos/<repo>.md` and the `ecosystem-map.md` status table.
2. **Version + changelog every meaningful change.** Add a Changeset (`pnpm changeset`, `patch`
   during pre-alpha) and keep `CHANGELOG.md`'s `[Unreleased]` current. Stay on `0.0.x` until first alpha.
3. **Crew + knowledgebase feedback loop.** When a standard, decision, or public surface changes,
   flag whether a `crew` skill or `knowledgebase` doc needs creating/updating — never silently skip.

Build, lint, format, and TypeScript settings come from the shared `@cosyte/*` config packages
(`@cosyte/tsconfig` · `@cosyte/eslint-config` · `@cosyte/prettier-config`; see
`documentation/conventions.md` → "Canonical toolchain (enforced)"). Node ≥ 22.

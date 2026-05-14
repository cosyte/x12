# @cosyte/x12 — v1 Requirements

All requirements are user-facing behaviors a developer consuming `@cosyte/x12` can verify. REQ-IDs are stable across phases and referenced from `ROADMAP.md` for traceability.

---

## v1 Requirements

### Project Setup & Build (SETUP)

- [x] **SETUP-01** — Developer can run `pnpm install && pnpm build && pnpm test` from a clean clone and all three succeed.
- [x] **SETUP-02** — Package publishes as dual ESM + CJS with a correct `exports` map; consumers on either module system resolve the right entry point.
- [x] **SETUP-03** — Package has zero runtime dependencies in `package.json` (dev deps permitted).
- [x] **SETUP-04** — TypeScript consumers get full IntelliSense (types, JSDoc, `@example` tags) on every public API surface.
- [x] **SETUP-05** — Repo targets Node 18+ and compiles to ES2022 with `"strict": true` and `"noUncheckedIndexedAccess": true`.
- [x] **SETUP-06** — `pnpm lint` and `pnpm typecheck` pass with zero warnings.
- [~] **SETUP-07** — CI runs on Node 18/20/22 matrix for install/typecheck/lint/test/build. *(Workflow file `.github/workflows/ci.yml` complete and YAML-validated locally in Plan 01-04; local-equivalent clean-clone smoke exits 0 in ~10.8 s. The autonomous workflow does NOT push to remote — final SETUP-07 gate closes on the user's first push to GitHub, when the workflow actually runs on a real Actions runner across Node 18/20/22.)*

### Envelope Parsing (ENV)

- [ ] **ENV-01** — `parseX12(raw)` parses any well-formed X12 005010 interchange and returns an `Interchange` object.
- [ ] **ENV-02** — Parser auto-detects all 4 delimiters from the ISA: element separator (ISA position 4), component separator (ISA-16), repetition separator (ISA-11 for 005010+), segment terminator (byte after ISA-16).
- [ ] **ENV-03** — Parser produces a typed envelope tree: `Interchange` (ISA/IEA) → `FunctionalGroup[]` (GS/GE) → `TransactionSet[]` (ST/SE) → `Segment[]` → `Element[] | CompositeElement[] | RepeatingElement[]`.
- [ ] **ENV-04** — `interchange.isa`, `interchange.iea`, `group.gs`, `group.ge`, `tx.st`, `tx.se` expose typed envelope control segments by name.
- [ ] **ENV-05** — Interchange with multiple functional groups and multiple transaction sets per group is decomposed correctly, preserving source order.
- [ ] **ENV-06** — `interchange.controlNumber`, `group.controlNumber`, `tx.controlNumber` return typed control numbers; every envelope level is addressable without knowing positional field numbers.
- [ ] **ENV-07** — Parser handles pre-005010 interchanges (missing repetition separator in ISA-11) by treating repetition as unsupported for that interchange and emitting a warning; core parse still succeeds for non-repeating content.

### Core Parsing & Tolerance (PARSE / TOL)

- [ ] **PARSE-01** — Parser correctly decomposes segments into elements (element separator), composites into sub-elements (component separator), and repeating elements into iterations (repetition separator, 005010+).
- [ ] **PARSE-02** — Parser distinguishes empty elements (`**`) from trailing-omitted elements; explicit empties are preserved, trailing empties are modeled as absent.
- [ ] **PARSE-03** — Parser accepts CR, LF, CRLF, and no-newline segment terminators (delimiter-configurable) and normalizes internally.
- [ ] **PARSE-04** — Parser accepts a `Buffer` input and decodes per the character set implied by ISA-17 (or UTF-8 default); unknown charsets warn and fall back to UTF-8.
- [ ] **PARSE-05** — Parser handles binary segments (BIN/BDS) by reading the declared byte count verbatim and preserving the payload without delimiter interpretation.
- [ ] **PARSE-06** — Parser handles embedded CRLF inside a segment when the segment terminator is not CRLF (real-world deviation).
- [ ] **TOL-01** — Default parse mode is lenient; strict mode via `{ strict: true }` escalates every Tier 2 warning to a thrown `X12ParseError`.
- [ ] **TOL-02** — Tier 3 fatal errors throw `X12ParseError` with stable codes even in lenient mode: `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`. Each error includes `message`, `position`, `snippet`.
- [ ] **TOL-03** — Parser emits Tier 2 warnings with stable codes and positional context (`segmentIndex`, `elementIndex`, `componentIndex`, `repetitionIndex`, `loop`) for at least: `X12_ISA_PADDING_WRONG`, `X12_GS08_VERSION_MISMATCH`, `X12_LOOP_OUT_OF_ORDER`, `X12_UNKNOWN_SEGMENT_IN_LOOP`, `X12_UNKNOWN_SEGMENT`, `X12_TRAILING_EMPTY_ELEMENTS`, `X12_EXTRA_WHITESPACE_IN_ELEMENT`, `X12_REPETITION_SEPARATOR_MISSING`, `X12_EMBEDDED_CRLF_IN_SEGMENT`, `X12_ENVELOPE_COUNT_MISMATCH`, `X12_DELIMITER_NOT_IN_ISA`, `X12_HIPAA_CODE_NOT_RECOGNIZED`, `X12_CHARSET_FALLBACK`.
- [ ] **TOL-04** — `interchange.warnings`, `group.warnings`, `tx.warnings` are always arrays (possibly empty) on the parsed object.
- [ ] **TOL-05** — `onWarning` callback option is invoked for every warning as it is emitted.
- [ ] **TOL-06** — ISA padding wrong length (ISA segment not exactly 106 bytes in 005010) warns `X12_ISA_PADDING_WRONG` but still parses if delimiters are recoverable.
- [ ] **TOL-07** — GS08 version drift versus the ST implementation version warns `X12_GS08_VERSION_MISMATCH` without failing the parse.
- [ ] **TOL-08** — Trailing empty elements are silently trimmed during modeling; `X12_TRAILING_EMPTY_ELEMENTS` fires only when the trim contradicts a TR3 required-element rule (strict mode escalates).
- [ ] **TOL-09** — Unknown segments inside a known loop emit `X12_UNKNOWN_SEGMENT_IN_LOOP` but do not abort loop detection; the segment is attached to the current loop iteration as raw.

### Segment Model & Access (MODEL)

- [ ] **MODEL-01** — `tx.get('CLM01')` resolves an element position on the first matching segment and returns a string (or `undefined` if absent).
- [ ] **MODEL-02** — `tx.get('2300/CLM01')` resolves an element within a loop instance using the loop-qualified segment-path syntax.
- [ ] **MODEL-03** — `tx.get('2400[3]/SV101-2')` supports zero-indexed loop iteration access and sub-element (`-N`) indexing for composites.
- [ ] **MODEL-04** — `tx.segments('NM1')` returns every `NM1` segment in original order as typed `Segment` objects.
- [ ] **MODEL-05** — `Segment.element(n)`, `.elements`, `.name`, and composite access via `.component(n, m)` or `.elements[n].components[m]` cover the full structural surface.
- [ ] **MODEL-06** — Parsed `Interchange` / `FunctionalGroup` / `TransactionSet` are immutable by default; mutation only via explicit methods (`setElement`, `addSegment`, `addLoopIteration`, `removeSegment`).
- [ ] **MODEL-07** — `tx.setElement('CLM01', 'NEW')`, `tx.addSegment('NTE', [...])`, `tx.addLoopIteration('2400', {...})`, and `tx.removeSegment(...)` mutate the transaction set; changes reflect in subsequent reads and serialization.
- [ ] **MODEL-08** — `tx.allSegments()` iterates every segment in the transaction set in original order; `interchange.allSegments()` traverses across all groups/transactions.

### Loop Spec System (LOOP)

- [ ] **LOOP-01** — `defineLoopSpec({ transactionSet, version, loops })` returns a validated `LoopSpec` object describing parent/child loop relationships, loop triggers (e.g., `NM1*IL` → Loop 2010BA), and segment cardinality.
- [ ] **LOOP-02** — Loop-spec registry is populated with built-in specs for all 12 v1 HIPAA transaction sets at version 005010 (with errata hooks: `005010X279A1`, `005010X221A1`, etc.).
- [ ] **LOOP-03** — Built-in loop specs are authored via the public `defineLoopSpec()` API (dogfooding: anything shipped must be expressible through the public API).
- [ ] **LOOP-04** — Parser derives loop boundaries from the active loop spec during parse; `segment.loop` and `segment.loopPath` identify containment (`'2300'`, `'2300/2400[2]'`).
- [ ] **LOOP-05** — `tx.loop('2010BA')` returns the single loop instance (or `undefined`); `tx.loops('2300')` returns all iterations as typed objects exposing their contained segments.
- [ ] **LOOP-06** — Loop iteration addressable by zero-index: `tx.loops('2400')[2]` returns the third service-line loop inside its parent `2300` loop.
- [ ] **LOOP-07** — Unknown or out-of-order loop triggers emit `X12_LOOP_OUT_OF_ORDER` / `X12_UNKNOWN_SEGMENT_IN_LOOP` but do not abort parsing; the parser recovers to the nearest valid loop entry.
- [ ] **LOOP-08** — `defineLoopSpec` throws `LoopSpecDefinitionError` with actionable messages for invalid input (cyclic parent chain, duplicate loop ids at the same level, trigger segment declared in multiple loops at the same level).

### Typed Transaction-Set Overlays (TX)

- [ ] **TX-01** — `tx.is('835')` narrows to `Era` (HealthcarePaymentAdvice) with typed fields; `tx.is('837')` narrows to `Claim` (professional/institutional/dental via structural fan-out), etc.
- [ ] **TX-02** — Overlay shipped for **270 Eligibility Inquiry** (Phase: typed overlay + named helpers for subscriber/dependent/service-type inquiry).
- [ ] **TX-03** — Overlay shipped for **271 Eligibility Response** (`eligibility.coverage.active`, `eligibility.benefits.byServiceType`).
- [ ] **TX-04** — Overlay shipped for **276 Claim Status Inquiry** (`inquiry.claims[]`).
- [ ] **TX-05** — Overlay shipped for **277 Claim Status Response** incl. 277CA Claim Acknowledgment (`status.byClaim`, raw category/code exposed).
- [ ] **TX-06** — Overlay shipped for **278 Services Review** (Request + Response) (`review.request`, `review.response`).
- [ ] **TX-07** — Overlay shipped for **820 Payroll Deducted and Other Group Premium Payment** (`premium.payments`, `premium.adjustments`).
- [ ] **TX-08** — Overlay shipped for **834 Benefit Enrollment & Maintenance** (`enrollment.member.byAction`).
- [ ] **TX-09** — Overlay shipped for **835 Health Care Claim Payment/Advice** (`era.payments.byClaim`, `era.adjustments.byCode`, `era.paymentTotal`).
- [ ] **TX-10** — Overlay shipped for **837 Professional** (`claim.subscriber`, `claim.patient`, `claim.serviceLines`, `claim.diagnoses`, `claim.billing`).
- [ ] **TX-11** — Overlay shipped for **837 Institutional** (same shape as 837P plus institutional-specific fields: statement dates, revenue codes, DRG).
- [ ] **TX-12** — Overlay shipped for **837 Dental** (same shape as 837P plus dental-specific fields: oral cavity area, tooth status, procedure modifiers).
- [ ] **TX-13** — All overlay helpers return `undefined` / empty arrays for missing optional data; never throw.
- [ ] **TX-14** — Every overlay is accessible from the typed `TransactionSet` union via `tx.is(code)` narrowing; raw access via the loop-aware model always remains available.

### Data Types (TYPES)

- [ ] **TYPES-01** — TypeScript interfaces exist and are exported for X12 healthcare composite types commonly reused across overlays: `Reference` (REF), `DateTimePeriod` (DTP), `Name` (NM1), `Address` (N3/N4), `ContactInfo` (PER), `MonetaryAmount` (AMT), `Quantity` (QTY), `Adjustment` (CAS), `ServiceLine` (SV1/SV2/SV3).
- [ ] **TYPES-02** — Typed helpers return parsed instances of these types (e.g. `claim.billing.address` is a parsed `Address`).
- [ ] **TYPES-03** — X12 DT8/RD8/TM date and datetime strings parse to JS `Date` (or date ranges) with valid truncations; raw strings remain accessible.
- [ ] **TYPES-04** — Unparseable dates/datetimes return `undefined` for the `Date` getter (no throw); raw remains accessible.

### Serialization & Round-Trip (SER)

- [ ] **SER-01** — `interchange.toString()` produces spec-clean X12 regardless of quirks in the input (Postel's Law: conservative emitter).
- [ ] **SER-02** — Round-trip `parse → toString → parse` yields an equivalent `Interchange` object for every canonical fixture.
- [ ] **SER-03** — Serializer recomputes envelope counts on serialize when requested: `SE01` (segment count), `GE01` (transaction-set count), `IEA01` (functional-group count). Opt-in via option; opt-out preserves parsed counts.
- [ ] **SER-04** — Serializer emits consistent delimiters (a single element separator, component separator, repetition separator, and segment terminator across the output), regardless of input quirks.
- [ ] **SER-05** — `interchange.toJSON()` returns a structured JSON representation suitable for snapshotting or cross-process transport.
- [ ] **SER-06** — `interchange.prettyPrint()` returns a human-readable multi-line string with labeled segments and loop indentation for logging/debugging.
- [ ] **SER-07** — `buildInterchange({...}).addFunctionalGroup(...).addTransactionSet(...).addSegment(...).toString()` constructs a valid outbound X12 interchange from scratch with generated control numbers (configurable).

### Acknowledgments (ACK)

- [ ] **ACK-01** — `build999(inbound, { errors? })` builds a 999 Implementation Acknowledgment from a parsed inbound interchange, emitting AK1/AK2/IK3/IK4/IK5/AK9 with implementation-level errors mapped to IK3/IK4/CTX where supplied.
- [ ] **ACK-02** — `buildTA1(inbound, { outcome })` builds a TA1 Interchange Acknowledgment segment reflecting envelope-level outcomes (accepted, accepted-with-errors, rejected).
- [ ] **ACK-03** — 999 and TA1 builders are pure functions: they return segments / interchanges; they never auto-send, open sockets, or hit the filesystem.
- [ ] **ACK-04** — `parse999(raw)` exposes typed 999 report structure: functional-group-level acceptance, per-transaction errors (segment id, loop id, error code, element position).
- [ ] **ACK-05** — 999 error mapping covers every IK3/IK4/CTX code the spec defines for implementation-level errors; `build999` accepts a structured `errors` array and emits the correct IK3/IK4/CTX triplets.

### Profile System & Built-ins (PROF / BIP)

- [ ] **PROF-01** — `defineProfile({ name, ...options })` returns a valid `Profile` object; name is required.
- [ ] **PROF-02** — `defineProfile()` throws `ProfileDefinitionError` with clear messages for invalid input: bad segment names, duplicate element names within a segment, unknown option keys, malformed date format strings, unknown transaction-set codes in `customLoopSpecs`.
- [ ] **PROF-03** — `extends: parent` and `extends: [p1, p2]` inherit and compose options; merge semantics match spec (scalars overwrite, arrays concat+dedupe, `customLoopSpecs` deep-merge per transaction-set+loop-id, `onWarning` handlers chain).
- [ ] **PROF-04** — `profile.name`, `profile.description`, `profile.customLoopSpecs`, `profile.customSegments`, `profile.dateFormats`, `profile.codeListOverrides`, `profile.lineage` are readonly and reflect applied options.
- [ ] **PROF-05** — `profile.describe()` returns a non-empty human-readable summary containing the profile name.
- [ ] **PROF-06** — `parseX12(raw, profile)` applies profile behavior to the parse; `interchange.profile?.name` and `interchange.profile?.lineage` are set on the parsed object.
- [ ] **PROF-07** — Registered companion-guide loop variants (via `customLoopSpecs`) are honored during parse; loop detection uses the profile-overridden spec where defined.
- [ ] **PROF-08** — `setDefaultProfile(p)` / `getDefaultProfile()` / `setDefaultProfile(null)` manage a process-scoped default; explicit argument overrides; `parseX12(raw, { profile: null })` opts out for one call.
- [ ] **PROF-09** — Round-trip: an interchange parsed with a custom profile and re-serialized produces spec-clean X12 (profile quirks affect parsing, not serialization).
- [ ] **PROF-10** — Profile `codeListOverrides` allow payer-specific code-list extensions without mutating the shared bundled data; unknown codes declared in an override become `X12_HIPAA_CODE_EXTENDED` warnings, not `X12_HIPAA_CODE_NOT_RECOGNIZED`.
- [ ] **BIP-01** — `profiles.availity` ships and is authored via the public `defineProfile()` API.
- [ ] **BIP-02** — `profiles.changeHealthcare` ships and is authored via the public `defineProfile()` API.
- [ ] **BIP-03** — `profiles.optum` ships and is authored via the public `defineProfile()` API.
- [ ] **BIP-04** — `profiles.waystar` ships and is authored via the public `defineProfile()` API.
- [ ] **BIP-05** — `profiles.genericCms` ships and is authored via the public `defineProfile()` API.
- [ ] **BIP-06** — Each built-in profile reduces warnings on a realistic vendor-shape fixture versus lenient mode without a profile.

### HIPAA Code Lists (CODES)

- [ ] **CODES-01** — Bundled code lists ship as versioned data: Claim Adjustment Reason Codes (CARC), Remittance Advice Remark Codes (RARC), Claim Status Category Codes (CSCC), Claim Status Codes (CSC), Service Type Codes (STC), Claim Adjustment Group Codes (CR/CAGC).
- [ ] **CODES-02** — Each code-list snapshot records a `snapshotDate` (ISO date) surfaced in the package runtime as `codeLists.meta.snapshotDate`.
- [ ] **CODES-03** — Code-list lookup API: `codeLists.carc.get('45')` returns `{ code, description, effectiveFrom, effectiveTo? }`; unknown codes return `undefined` (no throw).
- [ ] **CODES-04** — CHANGELOG records every code-list snapshot update as its own entry with source, snapshot date, and additions/removals counts.
- [ ] **CODES-05** — Parser emits `X12_HIPAA_CODE_NOT_RECOGNIZED` warning when a code not present in the bundled snapshot appears in a position that binds to a HIPAA code list (e.g., CAS02 adjustment reason); message includes the position and the unrecognized code.

### Strict Mode & TR3 Validation (VAL)

- [ ] **VAL-01** — `parseX12(raw, { strict: true })` runs TR3-level validation after a successful parse: segment cardinality per loop, required elements per segment, element usage (U/R/S/N), syntax notes (`if A then B`), and HIPAA code bindings.
- [ ] **VAL-02** — Strict mode throws `X12ValidationError[]` aggregated as a single rejection with structured per-error info: `segmentId`, `elementPosition`, `loopPath`, `ruleId` (TR3 reference), `message`.
- [ ] **VAL-03** — Strict mode is opt-in; lenient default never runs TR3 validation (performance + real-world tolerance).
- [ ] **VAL-04** — TR3 rule references in validation errors are stable and match the published WPC TR3 rule ids (e.g., `835.2100.CLP02.R`).

### Examples (EX)

- [ ] **EX-01** — `examples/extract-era-payments.ts` runs end-to-end against a sample 835 fixture and prints paid amounts grouped by claim.
- [ ] **EX-02** — `examples/build-eligibility-270.ts` runs end-to-end and emits a valid 270 interchange as a string, printing envelope counts and control numbers.
- [ ] **EX-03** — `examples/validate-837p-strict.ts` runs end-to-end, parses an 837P fixture in strict mode, and prints the validation errors (or "valid").

### Profile Starter Kit (KIT)

- [ ] **KIT-01** — `examples/profile-starter-kit/` exists and is publishable as-is with placeholders (`{{YOUR_ORG}}`, `{{PROFILE_NAME}}`).
- [ ] **KIT-02** — Running `pnpm install && pnpm test` inside the starter kit succeeds against its sample fixture.
- [ ] **KIT-03** — `pnpm build` inside the starter kit produces a `dist/` with correct entry points matching `package.json` exports.
- [ ] **KIT-04** — `.github/workflows/ci.yml` and `publish.yml` are present and syntactically valid (verified by `actionlint` or equivalent).
- [ ] **KIT-05** — Starter kit `package.json` has correct `peerDependencies` on `@cosyte/x12`, `publishConfig: { access: public }`, `files: [dist, ...]`, and working `build`/`test`/`lint` scripts.
- [ ] **KIT-06** — `CUSTOMIZING.md` walks through rename → pick base profile → add custom loop spec variants → add custom code-list overrides → write fixtures → publish.
- [ ] **KIT-07** — Starter-kit placeholders are consistent across `package.json`, source, tests, README, CUSTOMIZING, and LICENSE.

### Testing & Fixtures (TEST)

- [ ] **TEST-01** — `pnpm test --coverage` reports ≥ 90% line coverage on `src/parser/`, `src/envelope/`, `src/transactions/`, and `src/helpers/`.
- [ ] **TEST-02** — Canonical fixtures exist and round-trip losslessly for at least one example per v1 transaction set: 270, 271, 276, 277 (incl. 277CA), 278, 820, 834, 835, 837P, 837I, 837D, 999, TA1.
- [ ] **TEST-03** — Edge-case fixtures cover: ISA padding wrong length, GS08 version drift, trailing empties, embedded CRLF, unknown segment inside a known loop, out-of-order loop triggers, repetition separator absent (pre-005010), BIN/BDS binary payload, mixed line endings, UTF-8 BOM.
- [ ] **TEST-04** — Malformed interchange fixtures throw `X12ParseError` with descriptive position/snippet (missing ISA, truncated ISA, invalid delimiters, empty input).
- [ ] **TEST-05** — `test/fixtures/vendor-quirks/` contains at least one fixture per Tier 2 warning code, each verified to emit the expected warning and still parse in lenient mode.
- [ ] **TEST-06** — Strict-mode escalation sweep: every Tier 2 vendor-quirks fixture throws `X12ParseError` under `{ strict: true }`.
- [ ] **TEST-07** — At least one fixture per built-in profile (`availity`, `changeHealthcare`, `optum`, `waystar`, `genericCms`) demonstrates fewer warnings with the profile than without.
- [ ] **TEST-08** — Profile-authoring test suite covers: valid `defineProfile` output; `ProfileDefinitionError` cases; `extends` single + array; merge semantics per option category; default-profile set/get/opt-out; `profile.describe()`; `interchange.profile` attribution; round-trip with custom profile; `customLoopSpecs` application.
- [ ] **TEST-09** — 999/TA1 round-trip tests: `build999` output `parse999`s back to the same structured error list; `buildTA1` output round-trips through `parseX12`.

### Documentation (DOC)

- [ ] **DOC-01** — README renders cleanly on GitHub and npm with the one-sentence value prop as the first line, followed by badges.
- [ ] **DOC-02** — README contains a 30-second quickstart (install + parse + extract ERA paid amounts) in one copy-pasteable block.
- [ ] **DOC-03** — README has a feature list (6–8 bullets) highlighting developer-centric wins.
- [ ] **DOC-04** — README has an "X12 in 90 seconds" core-concepts section (interchange → group → transaction set → loops → segments → elements/composites).
- [ ] **DOC-05** — README covers the three access patterns (typed overlays / segment-paths / structural) with runnable examples.
- [ ] **DOC-06** — README Cookbook section contains recipes for: extract ERA payments (835), build eligibility 270, iterate claims (837P), read claim status (277), enrollment changes (834), build a 999 for a rejected 837, build a TA1, extend a profile for a state-Medicaid payer, override a companion-guide loop spec, bundle your own code-list snapshot, default profile usage, non-standard date formats, BIN/BDS binary segment, pretty-print an interchange, detect transaction-set code.
- [ ] **DOC-07** — README has a top-level "Profiles" section covering authoring, extending, composing, code-list overrides, custom loop specs, and publishing — not buried in API reference.
- [ ] **DOC-08** — README "Real-World Tolerance" section explains the lenient/strict/fatal tiers with a compact table and a runnable warnings-iteration example.
- [ ] **DOC-09** — README "Error Handling" section covers `X12ParseError`, `X12ParseWarning`, `X12ValidationError`, `ProfileDefinitionError`, `LoopSpecDefinitionError` with examples.
- [ ] **DOC-10** — README "Contributing" section points to CONTRIBUTING.md and invites vendor-quirk fixtures, profile improvements, loop-spec corrections, and standalone profile packages.
- [ ] **DOC-11** — README ends with "Built by [Cosyte](https://cosyte.com)" and a license link.
- [ ] **DOC-12** — Roadmap/stretch-goals section documents: non-healthcare transaction sets (850/856/810), streaming parser, 277CA deep claim-status taxonomy, AS2/SFTP transport companion, EDIFACT companion.
- [ ] **DOC-13** — "Publishing Your Profile" recipe links directly to `examples/profile-starter-kit/` and references `CUSTOMIZING.md`.
- [ ] **DOC-14** — CHANGELOG.md exists in Keep-a-Changelog format with an `[Unreleased]` section.
- [ ] **DOC-15** — LICENSE (MIT) exists at repo root.
- [ ] **DOC-16** — README documents the HIPAA code-list snapshot date, how to check `codeLists.meta.snapshotDate` at runtime, and the update/release policy (code-list snapshots are a release event, not a runtime fetch).

---

## v2 Requirements (Deferred)

- Streaming parser for large 834 enrollment files and batch 837 interchanges
- Non-healthcare transaction set overlays (850 PO, 856 ASN, 810 invoice, 820 non-premium)
- 277CA deep claim-status reason taxonomy (typed category+code tree with stable semantics)
- AS2 / SFTP / VAN transport companion package (`@cosyte/as2`)
- EDIFACT companion package (`@cosyte/edifact`)
- HL7 ↔ X12 conversion helpers (likely a separate bridge package)
- JSON Schema / Zod emission for `toJSON()` output
- Type-safe custom-segment / custom-loop element names via conditional types

## Out of Scope

- Non-healthcare X12 transaction-set typed overlays — parser core handles them, overlays are v2
- EDIFACT / TRADACOMS / VDA / ODETTE — different standards
- AS2 / SFTP / VAN — transport concerns, not parsing
- Pre-005010 HIPAA versions — incidental parsing only; no typed overlays
- Real-time transaction orchestration (retry, correlation) — integration-engine concern
- Terminology server / runtime code-list refresh — bundled snapshots only

---

## Traceability

Every v1 REQ-ID maps to exactly one phase in `ROADMAP.md`. Coverage is enforced by the roadmapper at creation and kept in sync at every phase transition.

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SETUP-01 | Phase 1 | Complete (01-03) |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Complete |
| SETUP-04 | Phase 1 | Complete |
| SETUP-05 | Phase 1 | Complete |
| SETUP-06 | Phase 1 | Complete (01-03) |
| SETUP-07 | Phase 1 | Workflow file complete (01-04); first-push validation reserved for user |
| ENV-01 | Phase 2 | Pending |
| ENV-02 | Phase 2 | Pending |
| ENV-03 | Phase 2 | Pending |
| ENV-04 | Phase 2 | Pending |
| ENV-05 | Phase 2 | Pending |
| ENV-06 | Phase 2 | Pending |
| ENV-07 | Phase 2 | Pending |
| PARSE-01 | Phase 2 | Pending |
| PARSE-02 | Phase 2 | Pending |
| PARSE-03 | Phase 2 | Pending |
| PARSE-04 | Phase 2 | Pending |
| PARSE-05 | Phase 2 | Pending |
| PARSE-06 | Phase 2 | Pending |
| TOL-01 | Phase 2 | Pending |
| TOL-02 | Phase 2 | Pending |
| TOL-03 | Phase 2 | Pending |
| TOL-04 | Phase 2 | Pending |
| TOL-05 | Phase 2 | Pending |
| TOL-06 | Phase 2 | Pending |
| TOL-07 | Phase 2 | Pending |
| TOL-08 | Phase 2 | Pending |
| TOL-09 | Phase 2 | Pending |
| MODEL-01 | Phase 3 | Pending |
| MODEL-02 | Phase 3 | Pending |
| MODEL-03 | Phase 3 | Pending |
| MODEL-04 | Phase 3 | Pending |
| MODEL-05 | Phase 3 | Pending |
| MODEL-06 | Phase 3 | Pending |
| MODEL-07 | Phase 3 | Pending |
| MODEL-08 | Phase 3 | Pending |
| LOOP-01 | Phase 3 | Pending |
| LOOP-02 | Phase 3 | Pending |
| LOOP-03 | Phase 3 | Pending |
| LOOP-04 | Phase 3 | Pending |
| LOOP-05 | Phase 3 | Pending |
| LOOP-06 | Phase 3 | Pending |
| LOOP-07 | Phase 3 | Pending |
| LOOP-08 | Phase 3 | Pending |
| TYPES-01 | Phase 3 | Pending |
| TYPES-02 | Phase 3 | Pending |
| TYPES-03 | Phase 3 | Pending |
| TYPES-04 | Phase 3 | Pending |
| TX-01 | Phase 4 | Pending |
| TX-02 | Phase 4 | Pending |
| TX-03 | Phase 4 | Pending |
| TX-04 | Phase 4 | Pending |
| TX-05 | Phase 4 | Pending |
| TX-06 | Phase 4 | Pending |
| TX-07 | Phase 4 | Pending |
| TX-08 | Phase 4 | Pending |
| TX-09 | Phase 4 | Pending |
| TX-10 | Phase 4 | Pending |
| TX-11 | Phase 4 | Pending |
| TX-12 | Phase 4 | Pending |
| TX-13 | Phase 4 | Pending |
| TX-14 | Phase 4 | Pending |
| SER-01 | Phase 5 | Pending |
| SER-02 | Phase 5 | Pending |
| SER-03 | Phase 5 | Pending |
| SER-04 | Phase 5 | Pending |
| SER-05 | Phase 5 | Pending |
| SER-06 | Phase 5 | Pending |
| SER-07 | Phase 5 | Pending |
| ACK-01 | Phase 5 | Pending |
| ACK-02 | Phase 5 | Pending |
| ACK-03 | Phase 5 | Pending |
| ACK-04 | Phase 5 | Pending |
| ACK-05 | Phase 5 | Pending |
| PROF-01 | Phase 6 | Pending |
| PROF-02 | Phase 6 | Pending |
| PROF-03 | Phase 6 | Pending |
| PROF-04 | Phase 6 | Pending |
| PROF-05 | Phase 6 | Pending |
| PROF-06 | Phase 6 | Pending |
| PROF-07 | Phase 6 | Pending |
| PROF-08 | Phase 6 | Pending |
| PROF-09 | Phase 6 | Pending |
| PROF-10 | Phase 6 | Pending |
| BIP-01 | Phase 6 | Pending |
| BIP-02 | Phase 6 | Pending |
| BIP-03 | Phase 6 | Pending |
| BIP-04 | Phase 6 | Pending |
| BIP-05 | Phase 6 | Pending |
| BIP-06 | Phase 6 | Pending |
| CODES-01 | Phase 6 | Pending |
| CODES-02 | Phase 6 | Pending |
| CODES-03 | Phase 6 | Pending |
| CODES-04 | Phase 6 | Pending |
| CODES-05 | Phase 6 | Pending |
| VAL-01 | Phase 7 | Pending |
| VAL-02 | Phase 7 | Pending |
| VAL-03 | Phase 7 | Pending |
| VAL-04 | Phase 7 | Pending |
| EX-01 | Phase 8 | Pending |
| EX-02 | Phase 8 | Pending |
| EX-03 | Phase 8 | Pending |
| KIT-01 | Phase 8 | Pending |
| KIT-02 | Phase 8 | Pending |
| KIT-03 | Phase 8 | Pending |
| KIT-04 | Phase 8 | Pending |
| KIT-05 | Phase 8 | Pending |
| KIT-06 | Phase 8 | Pending |
| KIT-07 | Phase 8 | Pending |
| TEST-01 | Phase 8 | Pending |
| TEST-02 | Phase 8 | Pending |
| TEST-03 | Phase 8 | Pending |
| TEST-04 | Phase 8 | Pending |
| TEST-05 | Phase 8 | Pending |
| TEST-06 | Phase 8 | Pending |
| TEST-07 | Phase 8 | Pending |
| TEST-08 | Phase 8 | Pending |
| TEST-09 | Phase 8 | Pending |
| DOC-01 | Phase 8 | Pending |
| DOC-02 | Phase 8 | Pending |
| DOC-03 | Phase 8 | Pending |
| DOC-04 | Phase 8 | Pending |
| DOC-05 | Phase 8 | Pending |
| DOC-06 | Phase 8 | Pending |
| DOC-07 | Phase 8 | Pending |
| DOC-08 | Phase 8 | Pending |
| DOC-09 | Phase 8 | Pending |
| DOC-10 | Phase 8 | Pending |
| DOC-11 | Phase 8 | Pending |
| DOC-12 | Phase 8 | Pending |
| DOC-13 | Phase 8 | Pending |
| DOC-14 | Phase 8 | Pending |
| DOC-15 | Phase 8 | Pending |
| DOC-16 | Phase 8 | Pending |

**Coverage:** 135 / 135 v1 REQ-IDs mapped (no orphans, no duplicates).

*Last updated: 2026-04-22 (initialization — ROADMAP.md created; all 135 v1 REQ-IDs mapped to exactly one phase across 8 phases).*

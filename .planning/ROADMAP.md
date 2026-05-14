# @cosyte/x12 — Roadmap (v1)

North star: **A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line — without having read the X12 standard or any TR3 implementation guide.**

- **Granularity:** standard (8 phases, 3–5 plans each anticipated; Phase 4 is plan-heavy by necessity — 12 HIPAA transaction-set overlays)
- **Mode:** yolo (auto-advance enabled)
- **Parallelization:** enabled — plans within a phase may run in parallel where they touch disjoint modules
- **Coverage:** 135 / 135 v1 REQ-IDs mapped to exactly one phase (no orphans, no duplicates)

---

## Phases

- [ ] **Phase 1: Project Foundation** — Scaffold the repo, build toolchain, TypeScript strict config, lint, CI matrix so any subsequent phase can iterate.
- [ ] **Phase 2: Envelope Parser & Tolerance** — Parse ISA/IEA + GS/GE + ST/SE envelope with auto-detected delimiters, tolerate real-world deviations under a lenient-default / strict-opt-in / fatal-for-structural tier model.
- [ ] **Phase 3: Structural Model, Types & Loop-Spec System** — Immutable typed model with segment-path accessors, reusable composite types (DTP/NM1/N3-N4/PER/AMT/CAS/SV1), and the `defineLoopSpec()` registry + loop-aware navigation that v1 overlays will consume.
- [ ] **Phase 4: Typed Transaction-Set Overlays (HIPAA)** — Ship named-helper overlays for all 12 v1 HIPAA transaction sets (835, 837P/I/D, 271, 834, 270, 276, 277, 278, 820, 999, TA1) plus the `tx.is(code)` narrowing contract.
- [ ] **Phase 5: Serialization, Round-Trip & Acknowledgments** — `toString()` / `toJSON()` / `prettyPrint()` / `buildInterchange()` with envelope-count recomputation, plus first-class `build999`/`buildTA1`/`parse999`.
- [ ] **Phase 6: Profile System, Built-ins & HIPAA Code Lists** — `defineProfile()` API with extends/merge, 5 built-in profiles (Availity, Change Healthcare, Optum, Waystar, generic CMS), and bundled versioned HIPAA code-list snapshots (CARC/RARC/CSCC/CSC/STC/CAGC).
- [ ] **Phase 7: Strict Mode & TR3 Validation** — Opt-in TR3-level validator (cardinality, required/usage, syntax notes, code bindings) with stable TR3 rule ids and aggregated structured errors.
- [ ] **Phase 8: Testing Hardening, Examples, Starter Kit & Documentation** — ≥ 90% coverage on core modules, canonical + edge-case + vendor-quirk fixtures, 3 runnable examples, publishable profile starter kit, and the complete README + ancillary docs.

---

## Phase Details

### Phase 1: Project Foundation
**Goal**: A developer cloning the repo can install, build, typecheck, lint, and test with a single command sequence; downstream phases never have to revisit tooling.
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07
**Success Criteria** (what must be TRUE):
  1. A developer can run `pnpm install && pnpm build && pnpm typecheck && pnpm lint && pnpm test` from a clean clone and every command exits 0 with zero warnings.
  2. A developer importing the package from an ESM project and another from a CJS project both resolve the correct entry through the `exports` map and receive typed intellisense with JSDoc + `@example` tags on every exported symbol.
  3. A developer inspecting `package.json` sees zero runtime `dependencies`, the MIT license, Node 18+ engines field, and dual-build artifacts declared.
  4. A developer opening a PR sees the CI matrix run install/typecheck/lint/test/build on Node 18/20/22 and gate the merge on green.
**Plans**: 4 plans
Plans:
- [x] 01-01-PLAN.md — Scaffold package.json (zero deps, MIT, Node 18+, pnpm), tsconfig.json + tsconfig.build.json (strict + noUncheckedIndexedAccess, ES2022), LICENSE, .gitignore, .npmrc, src/index.ts stub
- [x] 01-02-PLAN.md — tsup.config.ts for dual ESM+CJS build with .d.ts emission, package.json `exports` map wired with correct condition order, both-format resolution smoke (verify-exports.{mjs,cjs})
- [ ] 01-03-PLAN.md — ESLint flat config (no-any, no-console-in-src, JSDoc @example on public exports), Prettier, Vitest + sanity test, scripts: typecheck/lint/format/test/coverage
- [ ] 01-04-PLAN.md — .github/workflows/ci.yml Node 18/20/22 matrix gating install/typecheck/lint/format:check/test/build/verify:exports; commit pnpm-lock.yaml; README.md placeholder; clean-clone end-to-end smoke
**UI hint**: no

### Phase 2: Envelope Parser & Tolerance
**Goal**: A developer calling `parseX12(raw)` on any well-formed 005010 interchange — including vendor-quirky traffic from Availity/CHC/Optum/Waystar/state-Medicaid — receives a structurally correct `Interchange → FunctionalGroup[] → TransactionSet[] → Segment[]` tree with auto-detected delimiters and stable positional warnings for every known deviation.
**Depends on**: Phase 1
**Requirements**: ENV-01, ENV-02, ENV-03, ENV-04, ENV-05, ENV-06, ENV-07, PARSE-01, PARSE-02, PARSE-03, PARSE-04, PARSE-05, PARSE-06, TOL-01, TOL-02, TOL-03, TOL-04, TOL-05, TOL-06, TOL-07, TOL-08, TOL-09
**Success Criteria** (what must be TRUE):
  1. A developer calling `parseX12(raw)` on a well-formed 005010 interchange with one or many functional groups and transaction sets receives an `Interchange` whose ISA/IEA, GS/GE, ST/SE control segments are addressable by name and whose control numbers are reachable at every envelope level without knowing positional field numbers.
  2. A developer parsing an interchange with any valid combination of the four delimiters declared in ISA (element separator at position 4, component at ISA-16, repetition at ISA-11, segment terminator after ISA-16) gets correctly decomposed segments, composites, and repeating elements — including the pre-005010 case where the repetition separator is absent (ENV-07 warns and parses non-repeating content).
  3. A developer parsing a message with CR/LF/CRLF terminators, a `Buffer` input (UTF-8 or ISA-17 charset fallback), BIN/BDS binary segments, embedded CRLF inside a non-CRLF-terminated segment, or trailing empty elements gets a parsed interchange in lenient mode plus `interchange.warnings` / `group.warnings` / `tx.warnings` entries with stable codes and positional context (`segmentIndex`/`elementIndex`/`componentIndex`/`repetitionIndex`/`loop`), with `onWarning` callbacks invoked as each warning is emitted.
  4. A developer parsing a structurally broken interchange (missing ISA, truncated ISA, invalid delimiters, empty input) receives a thrown `X12ParseError` with one of the 4 fatal codes (`X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`) and a `message`/`position`/`snippet` — even in lenient mode.
  5. A developer opting into `{ strict: true }` at the parse call gets every Tier 2 deviation escalated to a thrown `X12ParseError`, with the full stable-code registry honored (ISA padding, GS08 version drift, trailing empties, unknown segments, out-of-order loops, embedded CRLF, envelope-count mismatch, charset fallback, HIPAA code not recognized, delimiter-not-in-ISA, repetition separator missing).
**Plans**: ~5 plans anticipated
Plans:
- [ ] 02-PLAN-01-warnings-errors-and-types.md — Stable warning-code registry, 4 fatal error codes, `X12ParseError` + `X12ParseWarning` classes, shared positional-context types, `Interchange`/`FunctionalGroup`/`TransactionSet` shell objects
- [ ] 02-PLAN-02-input-normalization-and-delimiters.md — ISA header detection, 4-delimiter extraction (element/component/repetition/segment-terminator), Buffer decoding via ISA-17 with UTF-8 fallback + `X12_CHARSET_FALLBACK`, BOM/whitespace tolerance
- [ ] 02-PLAN-03-segment-tokenization.md — Segment split (CR/LF/CRLF/custom terminator), element/composite/repetition decomposition, empty-vs-trailing-omitted distinction, BIN/BDS binary-payload preservation, embedded-CRLF handling
- [ ] 02-PLAN-04-envelope-decomposition.md — ISA/IEA → GS/GE → ST/SE tree construction with source-order preservation, typed control-segment getters, `interchange.controlNumber` / `group.controlNumber` / `tx.controlNumber` accessors, envelope-count mismatch warnings
- [ ] 02-PLAN-05-public-parsex12-and-strict-mode.md — `parseX12(raw, opts?)` public entry, `onWarning` plumbing, strict-mode escalation chokepoint, lenient-default Tier 2 warning sweep, `src/index.ts` barrel update
**UI hint**: no

### Phase 3: Structural Model, Types & Loop-Spec System
**Goal**: A developer can navigate a parsed interchange by segment-path, by loop-id, or by walking the immutable structural tree; can read/mutate it through explicit methods; receives strongly typed X12 healthcare composite values (DTP, NM1, N3/N4, PER, AMT, CAS, SV1/SV2/SV3); and can author loop specs via the same `defineLoopSpec()` API the 12 built-in HIPAA specs are authored with. **The loop-spec data shape locked in this phase is the API contract gating Phase 4 — every v1 HIPAA transaction set (270/271/276/277/278/820/834/835/837P/I/D/999/TA1) must be expressible through it without copy-paste; if it isn't, iterate here before Phase 4 begins.**
**Depends on**: Phase 2
**Requirements**: MODEL-01, MODEL-02, MODEL-03, MODEL-04, MODEL-05, MODEL-06, MODEL-07, MODEL-08, TYPES-01, TYPES-02, TYPES-03, TYPES-04, LOOP-01, LOOP-02, LOOP-03, LOOP-04, LOOP-05, LOOP-06, LOOP-07, LOOP-08
**Success Criteria** (what must be TRUE):
  1. A developer can call `tx.get('CLM01')`, `tx.get('2300/CLM01')`, `tx.get('2400[3]/SV101-2')`, `tx.segments('NM1')`, `tx.allSegments()`, and `interchange.allSegments()` and receive correctly resolved values with full typing; non-existent paths return `undefined` or `[]` rather than throwing.
  2. A developer mutating a parsed transaction set via `tx.setElement(...)`, `tx.addSegment(...)`, `tx.addLoopIteration(...)`, or `tx.removeSegment(...)` sees changes reflected on subsequent reads; direct mutation on an unwrapped object has no effect (immutable by default).
  3. A developer calling `defineLoopSpec({ transactionSet, version, loops })` with valid input receives a readonly `LoopSpec` object that captures parent/child loop relationships, loop triggers (e.g., `NM1*IL` → Loop 2010BA), and segment cardinality; invalid input (cyclic parent chain, duplicate loop ids at the same level, trigger declared in multiple loops at the same level) throws `LoopSpecDefinitionError` with an actionable message.
  4. A developer parsing a real 005010 interchange sees loop boundaries derived from the active loop spec: `segment.loop` / `segment.loopPath` identify containment; `tx.loop('2010BA')` returns the singleton instance; `tx.loops('2300')` / `tx.loops('2400')[2]` return typed loop iterations; out-of-order triggers emit `X12_LOOP_OUT_OF_ORDER` / `X12_UNKNOWN_SEGMENT_IN_LOOP` but do not abort parsing.
  5. A developer importing the library receives typed interfaces for the shared healthcare composites (`Reference`/REF, `DateTimePeriod`/DTP, `Name`/NM1, `Address`/N3-N4, `ContactInfo`/PER, `MonetaryAmount`/AMT, `Quantity`/QTY, `Adjustment`/CAS, `ServiceLine`/SV1/SV2/SV3); DT8/RD8/TM strings parse to `Date` (or ranges) with `undefined` for unparseable input and raw always accessible.
  6. A developer reads the loop-spec registry and finds the 12 HIPAA built-ins (270/271/276/277/278/820/834/835/837P/837I/837D/999; TA1 is envelope-only) all authored through the public `defineLoopSpec()` API (dogfooding: anything shipped must be expressible through the public API) — the Phase 4 overlay implementation consumes this registry unchanged.
**Plans**: ~5 plans anticipated
Plans:
- [ ] 03-PLAN-01-read-path-foundation.md — Segment-path tokenizer, Segment/Element/CompositeElement wrappers, `tx.get`/`tx.segments`/`tx.allSegments`/`interchange.allSegments` with wrapper caches
- [ ] 03-PLAN-02-composite-types-and-date-parsing.md — Reference/DTP/Name/Address/ContactInfo/MonetaryAmount/Quantity/Adjustment/ServiceLine typed composites + DT8/RD8/TM `Date` parsing with safe-access semantics
- [ ] 03-PLAN-03-mutation-methods.md — `setElement`/`addSegment`/`addLoopIteration`/`removeSegment` with immutability defaults; subsequent reads reflect changes
- [ ] 03-PLAN-04-loop-spec-api.md — `defineLoopSpec()` core + `LoopSpecDefinitionError` (cyclic / duplicate-id / duplicate-trigger); data shape locked as Phase 4 contract
- [ ] 03-PLAN-05-loop-aware-navigation-and-builtin-specs.md — Loop-boundary derivation during parse (`segment.loop`/`segment.loopPath`), `tx.loop`/`tx.loops` accessors, out-of-order recovery warnings, 12 built-in HIPAA loop specs authored through the public API + errata hooks (`005010X279A1`/`X221A1`/etc.)
**UI hint**: no

### Phase 4: Typed Transaction-Set Overlays (HIPAA)
**Goal**: A developer can use `tx.is('835')`/`tx.is('837')`/`tx.is('271')`/... to narrow a `TransactionSet` to a typed overlay and pull the 10% of fields they actually need via named helpers (`era.payments.byClaim`, `claim.subscriber`, `eligibility.coverage.active`, `enrollment.member.byAction`, etc.) — without knowing loop ids or segment-path syntax — for all 12 v1 HIPAA transaction sets plus TA1. Raw loop-aware access always remains available.
**Depends on**: Phase 3
**Requirements**: TX-01, TX-02, TX-03, TX-04, TX-05, TX-06, TX-07, TX-08, TX-09, TX-10, TX-11, TX-12, TX-13, TX-14
**Success Criteria** (what must be TRUE):
  1. A developer calling `tx.is('835')` on a 835 transaction set narrows to a typed `Era` exposing `era.payments.byClaim`, `era.adjustments.byCode`, and `era.paymentTotal`; `tx.is('837')` narrows to a `Claim` with `claim.subscriber`/`claim.patient`/`claim.serviceLines`/`claim.diagnoses`/`claim.billing`; the structural fan-out to 837P/837I/837D surfaces the per-flavor fields (institutional statement dates/revenue codes/DRG; dental oral-cavity/tooth-status/procedure modifiers).
  2. A developer reading eligibility traffic can call `tx.is('270')` to read subscriber/dependent/service-type inquiries and `tx.is('271')` to read `eligibility.coverage.active` + `eligibility.benefits.byServiceType`; claim-status traffic exposes `tx.is('276').inquiry.claims[]` and `tx.is('277').status.byClaim` including 277CA raw category/code.
  3. A developer reading services-review / premium / enrollment traffic can call `tx.is('278')` → `review.request` / `review.response`; `tx.is('820')` → `premium.payments` / `premium.adjustments`; `tx.is('834')` → `enrollment.member.byAction`; every helper returns `undefined` or empty arrays for missing optional data and never throws (TX-13 universal sweep).
  4. A developer always retains raw loop-aware access (`tx.loop('2010BA')`, `tx.get('2300/CLM01')`) on any overlay — typed overlays are additive, never exclusive (TX-14).
  5. Every overlay in this phase consumes the Phase 3 loop-spec registry unchanged — no bespoke loop detection code is added per transaction set, proving the Phase 3 contract holds for all 12 HIPAA transaction sets.
**Plans**: ~5 plans anticipated (batched by priority + shared structural fan-out)
Plans:
- [ ] 04-PLAN-01-overlay-scaffold-and-tx-is-dispatch.md — `tx.is(code)` discriminated-union narrowing + overlay-registry pattern + universal `never throws` guard shared by all 12 overlays (TX-01, TX-13, TX-14)
- [ ] 04-PLAN-02-era-and-claim-professional.md — 835 `Era` overlay (`era.payments.byClaim` / `era.adjustments.byCode` / `era.paymentTotal`) + 837P `Claim` overlay (`claim.subscriber` / `claim.patient` / `claim.serviceLines` / `claim.diagnoses` / `claim.billing`) (TX-09, TX-10)
- [ ] 04-PLAN-03-claim-institutional-and-dental.md — 837I (statement dates / revenue codes / DRG) + 837D (oral-cavity area / tooth status / procedure modifiers) reusing 837P structural fan-out (TX-11, TX-12)
- [ ] 04-PLAN-04-eligibility-status-and-enrollment.md — 270 / 271 (`eligibility.coverage.active` / `eligibility.benefits.byServiceType`) + 276 / 277 (inquiry.claims[] / status.byClaim incl. 277CA) + 834 (`enrollment.member.byAction`) (TX-02, TX-03, TX-04, TX-05, TX-08)
- [ ] 04-PLAN-05-services-review-premium-and-control.md — 278 (`review.request` / `review.response`) + 820 (`premium.payments` / `premium.adjustments`) + 999 / TA1 overlay read-path (build-path lands in Phase 5) (TX-06, TX-07)
**UI hint**: no

### Phase 5: Serialization, Round-Trip & Acknowledgments
**Goal**: A developer can take a parsed, mutated, or from-scratch interchange and emit spec-clean X12 (Postel's Law conservative emitter); can recompute SE01/GE01/IEA01 envelope counts on demand; can JSON-serialize or pretty-print for debug/logging; and can build 999 Implementation Acknowledgments + TA1 Interchange Acknowledgments as pure functions that never auto-send.
**Depends on**: Phase 3, Phase 4
**Requirements**: SER-01, SER-02, SER-03, SER-04, SER-05, SER-06, SER-07, ACK-01, ACK-02, ACK-03, ACK-04, ACK-05
**Success Criteria** (what must be TRUE):
  1. A developer calling `interchange.toString()` on any parsed interchange — including vendor-quirky input — receives spec-clean X12 with consistent delimiters across the output, no leaked whitespace or padding quirks, and (opt-in) recomputed envelope counts (SE01 segment count, GE01 transaction-set count, IEA01 functional-group count).
  2. A developer running `parseX12(interchange.toString())` on any canonical fixture receives an equivalent `Interchange` (same envelope tree, segments, elements, composites, repetitions); round-trip is lossless for every v1 canonical fixture.
  3. A developer calling `interchange.toJSON()` receives a structured JSON representation suitable for snapshotting or cross-process transport; `interchange.prettyPrint()` returns a human-readable multi-line string with labeled segments and loop indentation for logging/debug.
  4. A developer calling `buildInterchange({...}).addFunctionalGroup(...).addTransactionSet(...).addSegment(...).toString()` constructs a valid outbound 005010 interchange from scratch with generated ISA/GS/ST control numbers (configurable).
  5. A developer calling `build999(inbound, { errors? })` receives a 999 Implementation Acknowledgment with AK1/AK2/IK3/IK4/IK5/AK9 and the full IK3/IK4/CTX code mapping for implementation-level errors; `buildTA1(inbound, { outcome })` emits a TA1 reflecting envelope-level outcome (accepted / accepted-with-errors / rejected); both are pure functions (never auto-send, never open sockets, never touch the filesystem); `parse999(raw)` exposes typed 999 structure and round-trips with `build999`.
**Plans**: ~4 plans anticipated
Plans:
- [ ] 05-PLAN-01-to-string-and-round-trip.md — `interchange.toString()` with consistent-delimiter emission + opt-in SE01/GE01/IEA01 recomputation + round-trip fixture sweep (SER-01, SER-02, SER-03, SER-04)
- [ ] 05-PLAN-02-to-json-and-pretty-print.md — `toJSON()` raw-tree mirror + `prettyPrint()` loop-indented labeled segments (SER-05, SER-06)
- [ ] 05-PLAN-03-build-interchange.md — `buildInterchange({...}).addFunctionalGroup().addTransactionSet().addSegment().toString()` chain + control-number generation (SER-07)
- [ ] 05-PLAN-04-acknowledgments.md — `build999` (AK1/AK2/IK3/IK4/IK5/AK9 + full IK3/IK4/CTX code map) + `buildTA1` + `parse999` + round-trip tests; all pure functions (ACK-01, ACK-02, ACK-03, ACK-04, ACK-05)
**UI hint**: no

### Phase 6: Profile System, Built-ins & HIPAA Code Lists
**Goal**: A developer can define, extend, and compose trading-partner profiles via a first-class public API (mirroring `@cosyte/hl7`'s), apply them to parses, register companion-guide loop-spec variants without mutating the shared registry, and rely on 5 ready-made profiles (Availity, Change Healthcare, Optum, Waystar, generic CMS) that reduce warnings against realistic vendor shapes. Parallel to the profile system, the package bundles versioned HIPAA code-list snapshots (CARC / RARC / CSCC / CSC / STC / CAGC) that are queryable at runtime via `codeLists.carc.get('45')` → `{code, description, effectiveFrom, effectiveTo?}` and surface their snapshot date via `codeLists.meta.snapshotDate`. **Code-list updates are a release event, not a runtime fetch — CHANGELOG records every snapshot update with source + snapshot date + additions/removals counts; `codeLists.meta.snapshotDate` is the sole runtime API for consumers who need to validate snapshot freshness in their own pipelines.**
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09, PROF-10, BIP-01, BIP-02, BIP-03, BIP-04, BIP-05, BIP-06, CODES-01, CODES-02, CODES-03, CODES-04, CODES-05
**Success Criteria** (what must be TRUE):
  1. A developer calling `defineProfile({ name, ... })` with valid input receives a readonly `Profile` exposing `name`, `description`, `customLoopSpecs`, `customSegments`, `dateFormats`, `codeListOverrides`, `lineage`, and `describe()`; invalid input (bad segment names, duplicate element names within a segment, unknown option keys, malformed date formats, unknown transaction-set codes in `customLoopSpecs`) throws `ProfileDefinitionError` with an actionable message.
  2. A developer using `extends: parent` or `extends: [p1, p2]` sees documented merge semantics (scalars overwrite, arrays concat+dedupe, `customLoopSpecs` deep-merge per transaction-set+loop-id, `onWarning` handlers chain); `parseX12(raw, profile)` applies the merged profile, populates `interchange.profile?.name`/`interchange.profile?.lineage`, honors `customLoopSpecs` during loop detection, and re-serialization produces spec-clean X12 (profile quirks affect parsing, not serialization).
  3. A developer calling `setDefaultProfile(p)` / `getDefaultProfile()` / `setDefaultProfile(null)` manages a process-scoped default; explicit argument overrides; `parseX12(raw, { profile: null })` opts out for a single call.
  4. A developer importing `profiles.availity`, `profiles.changeHealthcare`, `profiles.optum`, `profiles.waystar`, or `profiles.genericCms` and parsing a realistic vendor-shape fixture with the profile sees fewer warnings than the same fixture parsed in lenient mode without a profile; every built-in is authored through the public `defineProfile()` API.
  5. A developer calling `codeLists.carc.get('45')` / `codeLists.rarc.get('N290')` / `codeLists.cscc.get('A0')` / `codeLists.csc.get('72')` / `codeLists.stc.get('30')` / `codeLists.cagc.get('CO')` receives `{ code, description, effectiveFrom, effectiveTo? }` for known codes and `undefined` for unknown codes (no throw); `codeLists.meta.snapshotDate` returns the ISO date of the bundled snapshot; parser emits `X12_HIPAA_CODE_NOT_RECOGNIZED` for unknown codes in HIPAA-bound positions (e.g., CAS02); profile-declared `codeListOverrides` convert those to `X12_HIPAA_CODE_EXTENDED` without mutating the shared bundled data; every code-list snapshot update lands in CHANGELOG as its own entry with source + snapshot date + additions/removals counts.
**Plans**: ~5 plans anticipated
Plans:
- [ ] 06-PLAN-01-define-profile-core-and-validation.md — `defineProfile()` core + `ProfileDefinitionError` validation (bad segment names, duplicate element names, unknown option keys, malformed date formats, unknown transaction-set codes) + `describe()` + readonly option surface (PROF-01, PROF-02, PROF-04, PROF-05)
- [ ] 06-PLAN-02-extends-merge-and-default-profile.md — `extends` single + array, merge semantics (scalars/arrays/customLoopSpecs/onWarning chain), lineage, `setDefaultProfile`/`getDefaultProfile`, opt-out (PROF-03, PROF-08)
- [ ] 06-PLAN-03-profile-apply-and-round-trip.md — `parseX12(raw, profile)` dispatch, `interchange.profile` attribution, `customLoopSpecs` honored at parse, round-trip spec-clean on re-serialize (PROF-06, PROF-07, PROF-09)
- [ ] 06-PLAN-04-code-lists-and-overrides.md — Bundled CARC / RARC / CSCC / CSC / STC / CAGC snapshots with `codeLists.meta.snapshotDate` runtime API, `codeLists.*.get()` lookup returning `{code, description, effectiveFrom, effectiveTo?}`, `X12_HIPAA_CODE_NOT_RECOGNIZED` wiring, `codeListOverrides` → `X12_HIPAA_CODE_EXTENDED`, CHANGELOG discipline (CODES-01, CODES-02, CODES-03, CODES-04, CODES-05, PROF-10)
- [ ] 06-PLAN-05-built-in-profiles-and-fixtures.md — 5 built-in profiles (availity / changeHealthcare / optum / waystar / genericCms) authored through the public API + one realistic vendor-shape fixture each demonstrating fewer-warnings-with-profile parity (BIP-01, BIP-02, BIP-03, BIP-04, BIP-05, BIP-06)
**UI hint**: no

### Phase 7: Strict Mode & TR3 Validation
**Goal**: A developer opting into `{ strict: true }` runs TR3-level validation after a successful parse (segment cardinality per loop, required elements per segment, element usage U/R/S/N, syntax notes like `if A then B`, HIPAA code bindings) and receives a single aggregated rejection carrying structured per-error information with stable WPC TR3 rule ids — distinct from the lenient-default Tier 2 warnings sweep (which is Phase 2's deliverable).
**Depends on**: Phase 3, Phase 4, Phase 6
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04
**Success Criteria** (what must be TRUE):
  1. A developer calling `parseX12(raw, { strict: true })` on a TR3-compliant interchange receives a normal parsed `Interchange` with no additional errors; on a TR3-non-compliant interchange receives an aggregated `X12ValidationError[]` rejection with one entry per violation.
  2. A developer inspecting a `X12ValidationError` sees `segmentId`, `elementPosition`, `loopPath`, `ruleId` (stable WPC TR3 reference, e.g., `835.2100.CLP02.R`), and `message` on every entry.
  3. A developer running lenient-default `parseX12(raw)` on the same input sees NO TR3 validation execute — lenient never runs TR3 (performance + real-world-tolerance guarantee); strict is opt-in.
  4. A developer running strict mode across all 12 HIPAA transaction sets' TR3 rules sees cardinality, required-element, usage (U/R/S/N), syntax-note, and HIPAA-code-binding rules all enforced; rule-id stability is covered by a regression fixture keyed on the published WPC rule ids.
**Plans**: ~3 plans anticipated
Plans:
- [ ] 07-PLAN-01-tr3-rule-registry-and-error-type.md — TR3 rule data shape (rule id / segment / loop / usage / cardinality / syntax-note / code-binding), `X12ValidationError` class with structured per-error info, stable WPC TR3 rule-id conventions (VAL-02, VAL-04)
- [ ] 07-PLAN-02-strict-mode-dispatch-and-validator-core.md — `{ strict: true }` post-parse validator chokepoint (lenient always opts out), aggregated multi-error rejection, cardinality + required-element + usage U/R/S/N enforcement (VAL-01, VAL-03)
- [ ] 07-PLAN-03-syntax-notes-and-code-bindings.md — TR3 syntax-note rules (`if A then B`) + HIPAA code-binding enforcement against Phase 6 bundled code lists; per-tx-set rule-registry population covering all 12 HIPAA overlays (VAL-01 completion)
**UI hint**: no

### Phase 8: Testing Hardening, Examples, Starter Kit & Documentation
**Goal**: A developer reviewing the test suite sees ≥ 90% line coverage on core modules plus canonical + edge-case + vendor-quirk + strict-escalation + profile-authoring + 999/TA1 round-trip evidence that the library behaves as specified end-to-end; a developer landing on the README can go from zero to extracting ERA paid amounts in under a minute, find a recipe for every common task, and copy `examples/profile-starter-kit/` into a new directory to publish their own payer-specific or state-Medicaid companion-guide profile package in minutes.
**Depends on**: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 6, Phase 7
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09, EX-01, EX-02, EX-03, KIT-01, KIT-02, KIT-03, KIT-04, KIT-05, KIT-06, KIT-07, DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07, DOC-08, DOC-09, DOC-10, DOC-11, DOC-12, DOC-13, DOC-14, DOC-15, DOC-16
**Success Criteria** (what must be TRUE):
  1. A developer running `pnpm test --coverage` sees ≥ 90% line coverage on `src/parser/`, `src/envelope/`, `src/transactions/`, and `src/helpers/`; canonical fixtures round-trip losslessly for 270, 271, 276, 277 (incl. 277CA), 278, 820, 834, 835, 837P, 837I, 837D, 999, TA1; edge-case fixtures exercise ISA padding, GS08 drift, trailing empties, embedded CRLF, unknown segment inside known loop, out-of-order loops, repetition separator absent, BIN/BDS, mixed line endings, UTF-8 BOM.
  2. A developer running `tsx examples/extract-era-payments.ts`, `examples/build-eligibility-270.ts`, and `examples/validate-837p-strict.ts` sees each example execute end-to-end and print the documented output (ERA paid amounts grouped by claim; valid 270 interchange as string with envelope counts and control numbers; 837P strict-mode validation errors or "valid").
  3. A developer copying `examples/profile-starter-kit/` into a new directory can run `pnpm install && pnpm test && pnpm build` against the sample fixture with success; `dist/` entries match `package.json` exports; `ci.yml` and `publish.yml` validate with `actionlint`; `CUSTOMIZING.md` walks through rename → pick base profile → add custom loop-spec variants → add code-list overrides → write fixtures → publish; placeholders (`{{YOUR_ORG}}`, `{{PROFILE_NAME}}`) appear consistently.
  4. A developer opening the README on GitHub or npm sees the one-sentence value prop as the first line, badges, a 30-second copy-pasteable quickstart (install + parse + extract ERA paid amounts), a 6–8-bullet feature list, an "X12 in 90 seconds" core-concepts section (interchange → group → transaction set → loops → segments → elements/composites), the three access patterns (typed overlays / segment-paths / structural), the full Cookbook (ERA extract / 270 build / 837P iterate / 277 status / 834 enrollment / 999 build / TA1 build / state-Medicaid profile extend / companion-guide loop-spec override / custom code-list snapshot bundling / default-profile usage / non-standard date formats / BIN/BDS / pretty-print / transaction-set detection), a top-level Profiles section, a Real-World Tolerance section with a compact tier table and runnable warnings-iteration example, an Error Handling section covering `X12ParseError`/`X12ParseWarning`/`X12ValidationError`/`ProfileDefinitionError`/`LoopSpecDefinitionError`, a Contributing section (inviting vendor-quirk fixtures / profile improvements / loop-spec corrections / standalone profile packages), the HIPAA code-list `snapshotDate` runtime-check + release-policy callout, and the "Built by Cosyte" footer with MIT license link.
  5. A developer looking for release history, license, or roadmap finds `CHANGELOG.md` in Keep-a-Changelog format with an `[Unreleased]` section, `LICENSE` (MIT) at the repo root, and a roadmap/stretch-goals section documenting v2 deferrals (non-healthcare overlays 850/856/810, streaming parser, 277CA deep claim-status taxonomy, AS2/SFTP transport companion, EDIFACT companion); the "Publishing Your Profile" recipe links directly to `examples/profile-starter-kit/` and references `CUSTOMIZING.md`.
  6. A developer running the vendor-quirks suite sees at least one fixture per Tier 2 warning code (each emits the expected warning and still parses in lenient mode); the strict-mode escalation sweep confirms every Tier 2 vendor-quirk fixture throws `X12ParseError` under `{ strict: true }`; the 999/TA1 round-trip tests confirm `build999` → `parse999` structural equivalence and `buildTA1` → `parseX12` round-trip; at least one fixture per built-in profile demonstrates fewer warnings with the profile than without.
**Plans**: ~5 plans anticipated
Plans:
- [ ] 08-PLAN-01-canonical-and-edge-case-fixtures.md — Canonical fixtures per v1 transaction set (270/271/276/277 incl. 277CA/278/820/834/835/837P/I/D/999/TA1) with lossless round-trip + edge-case fixtures (ISA padding / GS08 drift / trailing empties / embedded CRLF / unknown-segment-in-loop / out-of-order loops / no repetition separator / BIN-BDS / mixed line endings / UTF-8 BOM) (TEST-02, TEST-03, TEST-04)
- [ ] 08-PLAN-02-vendor-quirks-and-profile-and-ack-tests.md — `test/fixtures/vendor-quirks/` one per Tier 2 warning code + strict-mode escalation sweep + one fixture per built-in profile demonstrating fewer-warnings parity + profile-authoring test suite + 999/TA1 round-trip tests + coverage gate ≥ 90% (TEST-01, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09)
- [ ] 08-PLAN-03-runnable-examples.md — `examples/extract-era-payments.ts` + `examples/build-eligibility-270.ts` + `examples/validate-837p-strict.ts` with fixtures and documented expected output (EX-01, EX-02, EX-03)
- [ ] 08-PLAN-04-profile-starter-kit.md — `examples/profile-starter-kit/` subtree (configs + sample profile + test + fixture + ci.yml + publish.yml + README + CUSTOMIZING.md + LICENSE) publishable as-is with `{{YOUR_ORG}}`/`{{PROFILE_NAME}}` placeholders (KIT-01, KIT-02, KIT-03, KIT-04, KIT-05, KIT-06, KIT-07)
- [ ] 08-PLAN-05-readme-changelog-and-license.md — Comprehensive README replacement (13+ sections incl. quickstart / feature list / X12-in-90-seconds / three access patterns / Cookbook / Profiles / Real-World Tolerance / Error Handling / Contributing / code-list snapshot policy / footer), CHANGELOG.md (Keep-a-Changelog with `[Unreleased]`), LICENSE (MIT) verify (DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, DOC-07, DOC-08, DOC-09, DOC-10, DOC-11, DOC-12, DOC-13, DOC-14, DOC-15, DOC-16)
**UI hint**: no

---

## Parallelization Notes

Within each phase, plans that touch disjoint modules may run in parallel; plans that share a module must serialize. Concrete expectations:

- **Phase 1:** Toolchain plans (package.json/tsconfig, tsup build, ESLint+Prettier+Vitest, CI workflow + smoke) are largely independent and can run in parallel; a final smoke-test plan runs last to verify the full `install/build/typecheck/lint/test` pipeline on the Node 18/20/22 matrix.
- **Phase 2:** Warnings/error-code registry and shell types must land first and be consumed by every parser plan. Input normalization + delimiter extraction, segment tokenization, and envelope decomposition can start in parallel against a shared fixture set once the registry is stable. Strict-mode escalation is a capstone plan.
- **Phase 3:** Read-path foundation (segment-path tokenizer, Segment/Element wrappers) and composite-type parsers (REF/DTP/NM1/N3-N4/PER/AMT/QTY/CAS/SV1) are independent and parallelizable. Mutation methods gate on the read path. The loop-spec API (`defineLoopSpec()` + `LoopSpecDefinitionError`) is a gating serial plan — the data shape locked here is the Phase 4 contract. Loop-aware navigation + 12 built-in HIPAA loop-spec authorings parallelize once the API is stable.
- **Phase 4:** All 12 typed overlays consume the Phase 3 loop-spec registry and are mutually independent at the helper level — they parallelize freely. The `tx.is(code)` discriminated-union dispatch and the universal "helpers never throw" sweep (TX-13) are shared scaffolding that must land first. 837P/I/D share structural fan-out and serialize with each other; 270/271 and 276/277 are natural pairs (inquiry + response) that benefit from co-authoring; 278, 820, 834, 999, TA1 are independent.
- **Phase 5:** `toString()` + round-trip (with SE01/GE01/IEA01 recomputation) is the foundational plan. `toJSON()` + `prettyPrint()` are independent disjoint emitters and parallelize. `buildInterchange()` is independent. Acknowledgments (999 + TA1 build/parse) are a final plan (999 round-trip regression closes the phase).
- **Phase 6:** `defineProfile()` core + validation is the first plan. `extends`/merge + default-profile management and the apply/round-trip plan can parallelize. Code-list bundling + overrides is independent and parallelizes. The 5 built-in profiles (availity / changeHealthcare / optum / waystar / genericCms) are mutually independent and all parallelizable once the API surface stabilizes.
- **Phase 7:** TR3 rule registry + `X12ValidationError` type is foundational. Strict-mode dispatch + cardinality/required/usage validator and syntax-notes/code-bindings can parallelize once the rule shape is stable. Per-tx-set rule-registry population parallelizes across the 12 HIPAA overlays.
- **Phase 8:** Canonical + edge-case fixture authoring parallelizes across 14 transaction sets / 10 edge-case shapes. Vendor-quirks + profile-fidelity + 999/TA1 round-trip + coverage gate are a second parallel swim lane. The 3 examples are mutually independent. Starter kit assembly is one plan. README authoring decomposes into quickstart / feature list / access patterns / Cookbook / Profiles / tolerance / error handling / contributing+footer — most of which parallelize. CHANGELOG + LICENSE are trivially parallel.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Project Foundation | 2/4 | In Progress|  |
| 2. Envelope Parser & Tolerance | 0/5 | Not started | - |
| 3. Structural Model, Types & Loop-Spec System | 0/5 | Not started | - |
| 4. Typed Transaction-Set Overlays (HIPAA) | 0/5 | Not started | - |
| 5. Serialization, Round-Trip & Acknowledgments | 0/4 | Not started | - |
| 6. Profile System, Built-ins & HIPAA Code Lists | 0/5 | Not started | - |
| 7. Strict Mode & TR3 Validation | 0/3 | Not started | - |
| 8. Testing Hardening, Examples, Starter Kit & Documentation | 0/5 | Not started | - |

**v1 milestone:** 0/8 phases complete.

---

*Last updated: 2026-04-22 (initialization — 0/8 phases complete).*

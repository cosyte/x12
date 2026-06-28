# @cosyte/x12 — Project Guide for Claude

## Project

**`@cosyte/x12`** — a developer-focused ASC X12 EDI parser + utility library for Node.js/TypeScript, published under the Cosyte brand. Open-source (MIT). The payer-side sibling of [`@cosyte/hl7`](../hl7) — API shape, profile system, and lenient-parser philosophy are deliberately mirrored.

**North star:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line — without having read the X12 standard or any TR3 implementation guide.

## Status

- **Phase 8e — services-review builders `build278Request` (005010X217
  Request for Review) and `build278Response` (005010X216 Response) shipped
  (2026-06-28).** The emit counterparts to `get278Request` /
  `get278Response`, layering on the Phase 8 general builder and mirroring
  the pure-function `build277` / `build277CA` pattern — each NEVER
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
  upgrades it — the round-tripped `decision.actionCode` is byte-for-byte
  the input; `build278Request` REFUSES a review carrying a decision (HCR is
  response-only) and `build278Response` refuses a decision with an empty
  action code. **The HL spine is computed, never caller-supplied:** the
  builder computes every HL-01 id, HL-02 parent pointer (`20 → 21 → 22 →
23 → EV/SS`), and HL-04 has-child flag from the nested input tree, so a
  structurally inconsistent hierarchy is _unrepresentable_ and SE-01 is
  correct by construction. **Refusal, not silent corruption:** the builder
  REFUSES via a typed `ServicesReview278BuildError`
  (`X12_278_BUILD_INVALID_HIERARCHY` — a subscriber with neither a review
  nor a dependent, a dependent with no review;
  `X12_278_BUILD_INVALID_SPEC` — a review with no request category code, a
  request review carrying an HCR decision, a response decision with an
  empty action code, an over-long control number). The thrown message
  carries structural locators only (`subscriber.review[0]`, level codes) —
  never a member name, member id, trace, or diagnosis code (PHI
  discipline). New public exports: `build278Request`, `build278Response`,
  `ServicesReview278BuildError`, `AUTH_278_BUILD_ERROR_CODES`,
  `ServicesReview278BuildErrorCode`, and the `Build278Spec` type tree.
  Verify gate green (typecheck + lint + format + phi-scan + coverage
  per-dir ≥90 + build + attw + verify:exports). **Scope:** the remaining
  domain builders (`build820`, `build834`) layer on this same surface and
  are deferred to chained follow-ups (X12-8f).
- **Phase 8d — response builders `build271` (005010X279A1 Eligibility
  Benefit Response) and `build277` / `build277CA` (005010X212 Claim
  Status Response / 005010X214 Claim Acknowledgment) shipped
  (2026-06-28).** The response-side emit counterparts to
  `get271Eligibility` / `get277Status` / `get277CADisposition`, layering
  on the Phase 8 general builder and mirroring the pure-function
  `build835` / `build837` pattern — each NEVER auto-sends, opens a
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
  verbatim and NEVER fabricates, normalizes, or mutates it — a build-side
  property test feeds random trace tokens through all three builders and
  asserts the round-tripped `referenceId` is byte-for-byte the input.
  **The HL spine is computed, never caller-supplied:** the builder
  computes every HL-01 id, HL-02 parent pointer, and HL-04 has-child flag
  from the nested input tree (271 spine `20 → 21 → 22 → 23`; 277 / 277CA
  spine `20 → 21 → 19 → 22 → 23`), so a structurally inconsistent
  hierarchy is _unrepresentable_ and SE-01 is correct by construction.
  **Refusal, not silent corruption:** the builder REFUSES a structurally
  impossible spec via a typed `Eligibility271BuildError`
  (`X12_271_BUILD_INVALID_HIERARCHY` — no source / a childless source /
  receiver; `X12_271_BUILD_INVALID_SPEC` — over-long control number) or
  `ClaimStatus277BuildError` (`X12_277_BUILD_INVALID_HIERARCHY` — no
  source / a childless source / receiver / provider / a subscriber with
  neither claim nor dependent / a childless dependent;
  `X12_277_BUILD_INVALID_SPEC` — a claim with no trace / status / service
  line, an STC with no category code, an over-long control number). The
  thrown message carries structural locators only
  (`source[0].receiver[0].provider[0].subscriber[0]`, level codes,
  counts) — never a member name, member id, or trace (PHI discipline).
  New public exports: `build271`, `Eligibility271BuildError`,
  `ELIGIBILITY_271_BUILD_ERROR_CODES`, `Eligibility271BuildErrorCode`,
  the `Build271Spec` type tree; `build277`, `build277CA`,
  `ClaimStatus277BuildError`, `CLAIM_STATUS_277_BUILD_ERROR_CODES`,
  `ClaimStatus277BuildErrorCode`, and the `Build277Spec` type tree.
  Verify gate green (typecheck + lint + format + phi-scan + coverage
  per-dir ≥90 + build + attw + verify:exports). **Scope:** the remaining
  domain builders (`build820`, `build834`) layer on this same surface and
  are deferred to chained follow-ups (X12-8f).
- **Phase 8c — claim-submission builders `build837P` / `build837I` /
  `build837D` (005010 837 Professional `X222A2` / Institutional `X223A3`
  / Dental `X224A2`) shipped (2026-06-28).** The emit counterpart to
  `get837Claims`, layering on the Phase 8 general builder and mirroring
  the pure-function `build835` pattern — each NEVER auto-sends, opens a
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
  safety primitive — it computes every HL-01 id, HL-02 parent pointer
  (20 → 22 → 23), HL-03 level, and HL-04 has-child flag from the nested
  billing-provider → subscriber → (claims | patient) tree, so a
  structurally inconsistent hierarchy is _unrepresentable_ and SE-01 is
  correct by construction. **Refusal, not silent corruption:** where the
  lenient read side only WARNS on a broken HL parent pointer, the builder
  REFUSES a structurally impossible spec via a typed `Claim837BuildError`
  — codes `X12_837_BUILD_INVALID_HIERARCHY` (no billing providers, a
  billing provider with no subscriber, a subscriber with neither a direct
  claim nor a dependent patient, a dependent patient with no claim) and
  `X12_837_BUILD_INVALID_SPEC` (empty `claimId`, a claim with no service
  line, a line whose `variant` mismatches the builder, an empty
  procedure / revenue code, an over-long control number). The thrown
  message carries structural locators only
  (`billing[0].subscriber[0].claim[0]`, level codes, counts) — never the
  `claimId` (patient-account number) or a member id (PHI discipline). New
  public exports: `build837P`, `build837I`, `build837D`,
  `Claim837BuildError`, `CLAIM_837_BUILD_ERROR_CODES`,
  `Claim837BuildErrorCode`, and the `Build837Spec` type tree. Verify gate
  green (typecheck + lint + format + phi-scan + coverage per-dir ≥90 +
  build + attw + verify:exports). **Known limitation:** claim-/line-level
  provider addresses (Loop 2310/2420 N3/N4) are a documented read-side
  limitation — the NM1 fields round-trip, the address does not. **Scope:**
  the remaining domain builders (`build271`, `build277`, `build278`,
  `build820`, `build834`) layer on this same surface and are deferred to
  chained follow-ups (X12-8d → X12-8f).
- **Phase 8b — first domain builder `build835` (005010X221A1 ERA)
  shipped (2026-06-28).** The first per-transaction emit constructor,
  layering the safety-critical TR3 balance invariants on top of the
  Phase 8 general builder and mirroring the pure-function `build999` /
  `buildTA1` pattern — it NEVER auto-sends, opens a socket, or touches
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
  truth — error codes `X12_835_BUILD_BALANCE_MISMATCH` (any §1.10.2
  invariant) and `X12_835_BUILD_INVALID_SPEC` (no TRN trace, empty
  CLP-01, over-long ISA-13). The thrown message carries numeric totals
  only — never a patient-control number or member id (PHI discipline).
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
  **Scope:** this slice is `build835` only — the remaining domain
  builders (`build837P/I/D`, `build271`, `build277` / `277CA`,
  `build278Request/Response`, `build820`, `build834`) layer on this same
  surface and are deferred to chained follow-ups (X12-8c → X12-8f).
- **Phase 8 — spec-clean serializer + general interchange builder
  shipped (2026-06-28).** The emit half of the parser. `serializeX12(ix,
opts?)` reconstructs an `X12Interchange` back to bytes from the
  verbatim `.raw` strings — byte-faithful by default (the idempotency
  fixed point `serialize(parse(s)) === s` for a Tier-1 input), and with
  `{ specClean: true }` it reconciles the envelope (SE-01 / GE-01 /
  IEA-01 counts + the ISA-13↔IEA-02 / GS-06↔GE-02 / ST-02↔SE-02 control
  pairs), surfacing every mismatch via `onWarning` and NEVER silently
  correcting it — corrected counts emit only with
  `{ recomputeCounts: true }`, and control NUMBERS are identity, never
  rewritten. `buildInterchange(spec)` is the general, segment-level
  builder: it owns the 106-byte fixed-width ISA, the GS/GE/SE/IEA
  control segments + their counts, escapes active delimiters in body
  values via `?`, and round-trips its output through `parseX12` so the
  result is bit-identical to the parsed form (an internal builder bug
  surfaces as a warning, not silent corruption). Structurally impossible
  specs are REFUSED with a typed `X12BuildError`
  (`X12_BUILD_INVALID_SPEC` — over-long ISA-13, body segment with no
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
- **Phase 7 — 278 Services Review + 834 Enrollment + 820 Premium
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
  `AsyncIterable<X12Enrollment>` — one decoded member per `INS` loop, so
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
- **Phase 6 — 271 Eligibility + 277 / 277CA Claim Status shipped
  (2026-06-28).** `get271Eligibility(delimiters, tx)` (TR3
  `005010X279A1`), `get277Status(delimiters, tx)` (TR3 `005010X212`),
  and `get277CADisposition(delimiters, tx)` (TR3 `005010X214`). 277 and
  277CA share one internal walk disambiguated by `ST-03` —
  `get277CADisposition` admits only `005010X214`, `get277Status` admits
  either; both return `undefined` only on a mis-routed `ST-01`.
  **TRN echo is locked as the safety-critical reassociation property**:
  a 271 echoes the requesting 270's `TRN-02` verbatim onto its
  subscriber / dependent, a 277 echoes the 276's onto its claim — never
  mutated, normalized, or dropped (round-trip property test). STC
  status-code fidelity: STC-01 / STC-10 / STC-11 (C043) decode into
  verbatim CSCC (source 507) + CSC (source 508) + entity triples;
  unknown codes preserve their value and emit
  `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` / `X12_UNKNOWN_CLAIM_STATUS`. A
  277CA provider-level batch ack opens a claim on a standalone STC (no
  TRN). HL parent-pointer integrity via the shared `validateHl` (271
  spine `20→21→22→23`; 277 / 277CA spine `20→21→19→22→23`) — mismatches
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
  **Phase 6 (eligibility + claim status) shipped 2026-06-28 — see above.**
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
- **PHI commit-gate armed (2026-06-28).** A zero-dep, X12-shape-aware
  scanner (`scripts/phi-scan.ts`, `pnpm phi-scan`) refuses fixtures /
  `src/` carrying real-PHI-shaped tokens — NM1 person names + SSN
  qualifier `34`, MI member-id / XX NPI shapes, DMG dates of birth,
  pre-2024 DTP/DTM/BHT/GS dates, dashed SSN / `REF*SY` / non-test
  email. Synthetic tokens are positively declared in
  `scripts/phi-allow-list.txt` (X12 is byte-strict, so no inline header
  — same allow-list model as DICOM's binary `.dcm`); a whole-file
  bypass needs `--allow-fixture` **and** an audit entry in
  `phi-scan-overrides.md`. Runs at pre-commit (`simple-git-hooks
--staged`) and in CI (`run-phi-scan: true`); the `verify.sh` summary
  now shows `phi-scan ✓`.
- Pre-alpha `0.0.x`, not published to npm. The full v1 **read** scope is
  now decoded (270/271, 276/277/277CA, 278, 820, 834, 835, 837P/I/D, 999,
  TA1), and the general **emit** surface (`serializeX12` +
  `buildInterchange`) shipped in Phase 8. Next: **domain per-transaction
  builders** (`build835` / `build837P/I/D` / `build271` / …) that layer
  the safety-critical per-TR3 invariants (balance, certification, count
  reconciliation) on top of the general builder — mirroring the
  pure-function `build999` / `buildTA1` pattern already shipped for the
  acknowledgments.

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

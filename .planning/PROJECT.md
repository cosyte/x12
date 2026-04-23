# @cosyte/x12

## What This Is

An open-source, developer-focused ASC X12 EDI parser and utility library for Node.js and TypeScript, published under the Cosyte brand. It is the payer-side sibling of [`@cosyte/hl7`](https://github.com/cosyte/hl7) (provider-side clinical messaging) and is built on the same principles: lenient-by-default parsing, a typed structural model, round-trip serialization, and a first-class profile system for trading-partner quirks. The v1 scope targets HIPAA-mandated healthcare transaction sets at version **005010** (with hooks for `005010X279A1` / `X221A1` / other errata). The package is both a credibility asset for Cosyte's healthcare integration practice and a production tool used internally on client projects.

## Core Value

**A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line — without having read the X12 standard or any TR3 implementation guide.** Everything else (typed envelope model, typed transaction-set overlays, loop-aware navigation, round-trip serialization, profile system for trading-partner quirks, 999/TA1 acknowledgment generation, HIPAA code-list bundling) supports that north star.

## Requirements

### Validated

(None yet — ship to validate)

### Active

See `REQUIREMENTS.md` for the full categorized list with REQ-IDs.

**Top-level capabilities (v1):**

- [ ] Parse X12 interchanges: ISA/IEA envelope → GS/GE functional groups → ST/SE transaction sets → segments → elements → composites → repeating elements
- [ ] Auto-detect delimiters from ISA (element separator, component separator, segment terminator, repetition separator)
- [ ] Typed envelope model (Interchange, FunctionalGroup, TransactionSet, Segment, Element, CompositeElement)
- [ ] Dot-path / segment-path accessors (`tx.get('2300/CLM01')`, `tx.get('2400[3]/SV101-2')`)
- [ ] Loop-aware navigation derived from TR3 loop-spec data shipped as a registry
- [ ] Typed transaction-set overlays for 12 HIPAA transaction sets: 270, 271, 276, 277, 278, 820, 834, 835, 837P, 837I, 837D, 999 (plus TA1)
- [ ] Named helpers per transaction set (`era.payments.byClaim`, `claim.subscriber`, `eligibility.coverage.active`, `enrollment.member.byAction`, etc.)
- [ ] Round-trip serialization (parse → modify → `toString()`) with recomputed envelope counts (SE01, GE01, IEA01) and consistent delimiters
- [ ] Lenient default parsing with stable warning codes and positional context
- [ ] Strict mode that runs TR3-level validation (cardinality, required elements, HIPAA code bindings, syntax notes)
- [ ] 999 and TA1 acknowledgment generation (first-class, not afterthoughts)
- [ ] `defineProfile()` API for trading-partner-specific quirks (mirrors `@cosyte/hl7`)
- [ ] 5 built-in profiles (Availity, Change Healthcare, Optum, Waystar, generic CMS)
- [ ] Profile starter kit (`examples/profile-starter-kit/`) publishable as-is
- [ ] Bundled HIPAA code lists (CARC, RARC, CR, service-type, claim-status category/code) with versioned snapshots
- [ ] Zero runtime dependencies; dual ESM + CJS; strict TypeScript; Node 18+
- [ ] Three runnable examples (extract paid amounts from an 835; build an eligibility 270; validate an 837P against the HIPAA TR3)

### Out of Scope (v1)

- **Non-healthcare X12 transaction sets** (850 PO, 856 ASN, 810 invoice, 204 motor carrier load tender, etc.) — parser core handles them, but typed overlays + profiles ship for healthcare only in v1
- **EDIFACT (UN/EDIFACT)** — sister standard, different envelope shape; separate package if demand emerges (`@cosyte/edifact`)
- **TRADACOMS / VDA / ODETTE** and other regional EDI dialects
- **AS2 / SFTP / VAN transport** — parser only; security-sensitive protocols belong in their own scoped package (likely future `@cosyte/as2`)
- **Pre-005010 HIPAA versions** (004010, 003070, etc.) — parser core may handle them incidentally; no typed overlays or profile guarantees
- **277CA-specific deep claim-status reason taxonomies** — raw access yes; typed taxonomy is a roadmap item
- **HL7 ↔ X12 conversion** — different problem; future bridge package if needed
- **Real-time eligibility transaction orchestration** (request/response correlation, retries) — integration-engine concern, not a parser concern
- **Terminology server / auto-update from CMS** — bundled code lists are versioned snapshots released with the package; not a runtime fetch

## Context

- **Market gap:** Existing Node X12 libraries are thin around healthcare transaction sets, weakly typed, or coupled to integration engines that assume TR3 compliance from the sender. Real payer/clearinghouse traffic routinely deviates. The DX bar is low; clearing it by a wide margin is tractable, and X12's structural complexity (envelopes + functional groups + transaction sets + loops + composites + repeating elements) is exactly where good typing pays off.
- **Real-world tolerance is the credibility gate:** Production 835s, 837s, and 277CAs from Availity, Change Healthcare, Optum, Waystar, and state-Medicaid intermediaries routinely violate the WPC TR3: out-of-order segments, missing trailing empties, wrong ISA padding length, GS08 version drift, unknown segments inside known loops. A parser that strictly enforces the TR3 rejects a meaningful percentage of real messages. The default mode is lenient; deviations surface as warnings with stable codes and positional context (`segmentIndex`, `elementIndex`, `componentIndex`, `repetitionIndex`, `loop`).
- **Loop awareness is X12's defining headache:** Extracting "the right NM1 inside the 2010BA loop" without hand-writing loop-detection code is the feature most TR3-aware users actually want. Loop specs are plain data (per transaction set + version), shipped as a registry built with the same `defineLoopSpec` API developers use — keeping built-ins honest and letting trading partners ship companion-guide loop variants via profiles.
- **Profiles are a growth loop:** Built-ins cover broad payer/clearinghouse patterns, but the real-world variation lives at the companion-guide level (specific payers, state-Medicaid intermediaries, workers'-comp carriers). Every published profile package is a signal of adoption and a contribution back. The starter kit is designed so publishing a profile takes minutes, not hours — exactly as in `@cosyte/hl7`.
- **Payer-side sibling to `@cosyte/hl7`:** X12 is structurally the closest spec to HL7 v2 that Cosyte will ever ship. The public API, profile system, lenient-parser philosophy, and artifact discipline deliberately and visibly mirror `@cosyte/hl7` so developers who know one can use the other fluently.
- **Acknowledgments are table stakes:** 999 and TA1 generation aren't optional. Every production X12 integration needs them. `@cosyte/x12` never auto-sends; it builds the segments and lets the caller decide.
- **License choice:** MIT, to maximize adoption. This is a library, not a product.

## Constraints

- **Language:** TypeScript strict (`"strict": true`, `"noUncheckedIndexedAccess": true`). No `any`, no unjustified `as` casts.
- **Target:** ES2022, dual package (ESM + CJS) via `tsup`. Node 18+.
- **Runtime deps:** Zero. Node stdlib only. Dev deps (Vitest, TypeScript, linters) fine.
- **Package manager:** pnpm. Package name: `@cosyte/x12`. License: MIT.
- **Test coverage:** ≥ 90% line coverage on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/`.
- **Performance expectation:** A 500-segment interchange parses in < 20ms on a modern laptop (documented, not a CI gate).
- **No `console.*` in library code.** Throw typed errors or return results.
- **Immutable by default.** Interchanges are immutable; mutation only via explicit methods (`setElement`, `addSegment`, `addLoopIteration`, `removeSegment`).
- **Postel's Law:** Parser is liberal (lenient default + warnings with stable codes and segment/element positional context); serializer is conservative (always emits canonical X12 with consistent delimiters, correct envelope counts, and trimmed trailing empty elements).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Lenient parsing is the default, not strict | Production X12 from clearinghouses and payers routinely violates the TR3. Strict-by-default would reject real-world traffic. Strict mode still exists for validators/CI. Mirrors `@cosyte/hl7`. | — Pending |
| Warnings carry stable string codes + positional context | Developers need to react programmatically to specific deviations (e.g., `X12_ISA_PADDING_WRONG`, `X12_LOOP_OUT_OF_ORDER`, `X12_UNKNOWN_SEGMENT_IN_LOOP`, `X12_HIPAA_CODE_NOT_RECOGNIZED`, `X12_ENVELOPE_COUNT_MISMATCH`, `X12_DELIMITER_NOT_IN_ISA`). Human messages alone are not enough. | — Pending |
| Loop specs are plain data produced by `defineLoopSpec()` | Built-ins and developer-authored loop specs are equal citizens of the same API. Keeps built-ins honest — anything shipped must be expressible through the public API. Enables trading partners to ship companion-guide loop variants via profiles. | — Pending |
| Profiles are plain data produced by `defineProfile()` | Same rationale as `@cosyte/hl7`. Built-ins and developer-authored profiles are equal citizens of the same API. | — Pending |
| Serializer always emits spec-clean X12, regardless of what was parsed | Postel's Law. Parser is liberal; emitter is conservative. Recomputes SE01, GE01, IEA01 counts and envelope control numbers on serialize if requested. Prevents quirks from propagating downstream. | — Pending |
| Profile starter kit is a first-class deliverable, not a doc section | The growth loop depends on frictionless publishing of payer- and state-Medicaid-specific companion-guide profiles. "Copy this directory, customize, `pnpm publish`" is the entire target DX. | — Pending |
| Zero runtime dependencies | Healthcare integrations are vetted carefully; every dep is a supply-chain concern. Also forces clean implementation. Mirrors `@cosyte/hl7`. | — Pending |
| Fail loudly only for unrecoverable structural errors | Small Tier-3 set: `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`. Everything else is a warning. Mirrors `@cosyte/hl7`'s 4-fatal model. | — Pending |
| 999 and TA1 generation are first-class | Table stakes for any production X12 integration. We build segments; we never auto-send. The caller decides transport. | — Pending |
| HIPAA code lists bundled as versioned data snapshots | Stale code lists are a credibility-killer. Snapshot date is part of the package version; updates are a release event, not a runtime fetch. Covers CARC, RARC, CR, service-type, claim-status category/code. | — Pending |
| v1 typed overlays cover HIPAA healthcare only | The parser core handles any X12, but typed overlays + profiles ship for 12 HIPAA transaction sets in v1 (270, 271, 276, 277, 278, 820, 834, 835, 837P, 837I, 837D, 999, TA1). Non-healthcare transaction sets are out of scope until demand emerges. | — Pending |
| Mirror `@cosyte/hl7` API shape deliberately and visibly | X12 is structurally the closest spec to HL7 v2 that Cosyte will ever ship. Shared mental model + artifact discipline = faster onboarding, shared growth loop (profile starter kit), smaller cognitive surface for developers using both. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-22 after initialization.*

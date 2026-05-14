---
gsd_state_version: 1.0
milestone: v1
milestone_name: milestone
status: executing
stopped_at: Plan 01-03 complete; advancing to Plan 01-04 (CI + smoke)
last_updated: "2026-05-14T01:28:37Z"
last_activity: 2026-05-14
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
  percent: 75
---

# @cosyte/x12 — STATE

Project memory for session-to-session continuity. Updated at phase/plan boundaries.

---

## Project Reference

- **Name:** `@cosyte/x12`
- **Core value:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line — without having read the X12 standard or any TR3 implementation guide.
- **Current focus:** Phase 01 — Project Foundation
- **Workflow config:** standard granularity, yolo mode, parallelization enabled, plan-check + verifier + Nyquist validation on, auto-advance on.

## Current Position

Phase: 01 (Project Foundation) — EXECUTING
Plan: 4 of 4
Status: Ready to execute
Last activity: 2026-05-14

- **Milestone:** v1
- **Phase:** 1 (Project Foundation) — not started. Plans 01-PLAN-01 through 01-PLAN-04 anticipated (package scaffold / build system / lint + test / CI + smoke).
- **Plans (milestone total):** 0 / ~36 anticipated (4+5+5+5+4+5+3+5 across Phases 1–8).
- **Status:** Ready to execute
- **Progress:** [████████░░] 75%

```
[░░░░░░░░░░░░░░░░░░░░] 0%   (0 / 8 phases shipped)
```

## Performance Metrics

- **Phases completed:** 0 / 8.
- **Plans completed:** 0 / ~36 anticipated.
- **REQ-IDs validated:** 0 / 135. All v1 categories mapped in `.planning/REQUIREMENTS.md` Traceability table: 7 SETUP + 7 ENV + 6 PARSE + 9 TOL + 8 MODEL + 4 TYPES + 8 LOOP + 14 TX + 7 SER + 5 ACK + 10 PROF + 6 BIP + 5 CODES + 4 VAL + 3 EX + 7 KIT + 9 TEST + 16 DOC = 135 (no orphans; no duplicates).
- **Known coverage:** N/A (no source code yet). Coverage gate ≥ 90% line coverage on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/` will be enforced starting Phase 8 (TEST-01).

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| — | — | — | — | — |

*No plans completed yet. Table populates as plans ship.*

**Recent Trend:** N/A (no plans yet).
| Phase 01 P01 | 2m | 2 tasks | 7 files |
| Phase 01 P02 | 6m | 2 tasks | 4 files |
| Phase 01 P03 | 6m | 2 tasks | 9 files |

## Accumulated Context

### Decisions

Decisions are logged in `PROJECT.md` Key Decisions table. Ten decisions recorded at init (all with `— Pending` outcomes until Phase-transition validation):

- Lenient parsing is the default, not strict — production X12 traffic deviates constantly.
- Warnings carry stable string codes + positional context — developers need programmatic reaction, not just human messages.
- Loop specs are plain data produced by `defineLoopSpec()` — dogfooding gate (built-ins must be expressible through the public API).
- Profiles are plain data produced by `defineProfile()` — same rationale; mirrors `@cosyte/hl7`.
- Serializer always emits spec-clean X12 regardless of what was parsed — Postel's Law (liberal parser, conservative emitter).
- Profile starter kit is a first-class deliverable, not a doc section — growth loop.
- Zero runtime dependencies — supply-chain discipline; mirrors `@cosyte/hl7`.
- Fail loudly only for unrecoverable structural errors — 4 Tier-3 fatal codes (X12_NO_ISA_HEADER, X12_ISA_TOO_SHORT, X12_INVALID_DELIMITERS, X12_EMPTY_INPUT).
- 999 and TA1 generation are first-class — table stakes; pure functions, never auto-send.
- HIPAA code lists bundled as versioned data snapshots — `snapshotDate` is part of the package version; updates are a release event, not a runtime fetch.
- v1 typed overlays cover HIPAA healthcare only — 12 transaction sets (270/271/276/277/278/820/834/835/837P/I/D/999/TA1); non-healthcare is v2.
- Mirror `@cosyte/hl7` API shape deliberately and visibly — shared mental model + shared growth loop.
- [Phase ?]: TypeScript pinned to ^5.6.0 (resolved 5.9.3) instead of registry latest 6.0.3 to avoid strict-flag drift in v0.0.0 scaffold (plan-specified fallback)
- [Phase 01]: Approach A (Node self-referencing) used for verify-exports.{mjs,cjs}; works on Node v24 without flags; fallback Approach B (relative ./dist/* paths) not needed
- [Phase 01]: Dual ESM (.mjs) + CJS (.cjs) build via tsup with exports map ordered types > import > require; verified by self-reference smokes printing VERSION=0.0.0 from both module systems
- [Phase 01]: ESLint flat config (ESM) with typescript-eslint 8.x recommended-type-checked + stylistic-type-checked, scoped to **/*.ts; jsdoc/require-example proven to fire on missing-@example public exports
- [Phase 01]: Type-checked tseslint rule sets scoped to **/*.ts (not all files) — required to keep plain-JS config files from crashing the linter
- [Phase 01]: .planning/ added to .prettierignore — GSD workflow markdown owns its own format conventions
- [Phase 01]: Vitest 4.x with v8 coverage; src/index.ts excluded from coverage during the stub phase (Phase 8 introduces 90% gate)
- [Phase 01]: Pre-existing tsconfig.json rootDir conflict surfaced by pnpm typecheck and fixed in 01-03 (rootDir removed from editor config; remains in tsconfig.build.json which tsup uses)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

**Gating notes for downstream phases:**

- Phase 3's `defineLoopSpec()` data shape is the API contract gating Phase 4. Lock it before Phase 4 overlay implementation starts; every v1 HIPAA transaction set must be expressible through it without copy-paste, or iterate here.
- Phase 6's HIPAA code-list snapshot date (`codeLists.meta.snapshotDate`) plus CHANGELOG discipline (CODES-04) is the runtime + paper-trail contract for consumers who need snapshot-freshness signals; code-list updates are a release event, not a runtime fetch.

## Deferred Items

None (v1 scope finalized at init).

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

v2 deferrals tracked in `REQUIREMENTS.md` → `v2 Requirements (Deferred)` and `PROJECT.md` → `Out of Scope (v1)`.

## Session Continuity

Last session: 2026-05-14T01:28:37Z
Stopped at: Plan 01-03 complete; advancing to Plan 01-04 (CI + smoke)
Resume file: None

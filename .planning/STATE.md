---
gsd_state_version: 1.0
milestone: v1
milestone_name: milestone
status: "Initialized 2026-04-22 — ROADMAP drafted (8 phases, 135/135 v1 REQ-IDs mapped, no orphans/no duplicates). Awaiting `/gsd-discuss-phase 1` to begin Phase 1 (Project Foundation). Config: standard granularity, yolo mode, parallelization enabled, plan-check + verifier + Nyquist validation on, auto-advance on."
last_updated: "2026-04-22T00:00:00Z"
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 36
  completed_plans: 0
  percent: 0
---

# @cosyte/x12 — STATE

Project memory for session-to-session continuity. Updated at phase/plan boundaries.

---

## Project Reference

- **Name:** `@cosyte/x12`
- **Core value:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line — without having read the X12 standard or any TR3 implementation guide.
- **Current focus:** Phase 1 (Project Foundation) — not started. Repo is in planning-only state: `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/config.json` on disk; no source code yet. Next: `/gsd-discuss-phase 1`.
- **Workflow config:** standard granularity, yolo mode, parallelization enabled, plan-check + verifier + Nyquist validation on, auto-advance on.

## Current Position

Phase: 1 of 8 (Project Foundation) — not started.
Plan: 0 of ~4 in current phase.
Status: Initialized; awaiting `/gsd-discuss-phase 1`.
Last activity: 2026-04-22 — ROADMAP.md + STATE.md written; REQUIREMENTS.md traceability table populated (135/135 v1 REQ-IDs mapped).

- **Milestone:** v1
- **Phase:** 1 (Project Foundation) — not started. Plans 01-PLAN-01 through 01-PLAN-04 anticipated (package scaffold / build system / lint + test / CI + smoke).
- **Plans (milestone total):** 0 / ~36 anticipated (4+5+5+5+4+5+3+5 across Phases 1–8).
- **Status:** Initialized; roadmap drafted and ready for Phase 1 discussion.
- **Progress:** 0 / 8 phases complete.

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

Last session: 2026-04-22 (initialization).
Stopped at: ROADMAP.md + STATE.md written; REQUIREMENTS.md traceability populated; awaiting `/gsd-discuss-phase 1`.
Resume file: None (run `/gsd-discuss-phase 1` to start Phase 1).

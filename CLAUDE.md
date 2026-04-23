# @cosyte/x12 — Project Guide for Claude

This repo is managed with the **GSD (Get Shit Done)** workflow. Planning artifacts live in `.planning/` and are committed with the code.

## Project

**`@cosyte/x12`** — a developer-focused ASC X12 EDI parser + utility library for Node.js/TypeScript, published under the Cosyte brand. Open-source (MIT). The payer-side sibling of [`@cosyte/hl7`](../hl7-parser) — API shape, profile system, and lenient-parser philosophy are deliberately mirrored.

**North star:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line — without having read the X12 standard or any TR3 implementation guide.

See `.planning/PROJECT.md` for full context, requirements, constraints, and key decisions.

## Status

- **Phase 0 — Initialized.** Next: `/gsd-discuss-phase 1` (or `/gsd-plan-phase 1` to skip discussion).
- Roadmap: 8 phases, 135 v1 requirements mapped → see `.planning/ROADMAP.md`.

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

## GSD Workflow

**Config** (`.planning/config.json`):

- Mode: `yolo` (auto-approve plans/execution)
- Granularity: `standard` (5–8 phases, 3–5 plans each)
- Parallelization: enabled
- Plan Check + Verifier + Nyquist Validation: enabled
- Commit docs: yes

**Typical phase loop:**

1. `/gsd-discuss-phase N` — gather context before planning (gray areas, assumptions)
2. `/gsd-plan-phase N` — decompose phase into plans (with plan-check agent)
3. `/gsd-execute-phase N` — execute plans in parallel where possible, atomic commits
4. `/gsd-verify-work N` — verifier confirms deliverables match phase goal
5. `/gsd-validate-phase N` — Nyquist validation audits test coverage
6. `/gsd-transition` — update PROJECT.md, advance state

**Commands most likely needed:**

- `/gsd-progress` — status + routing
- `/gsd-next` — auto-advance to next logical step
- `/gsd-plan-phase N` — plan a specific phase
- `/gsd-execute-phase N` — execute a planned phase
- `/gsd-discuss-phase N --auto` — clarify context before planning (auto mode)

## Tech Stack (locked)

- **Language:** TypeScript (strict, `noUncheckedIndexedAccess`)
- **Target:** ES2022, dual ESM + CJS via `tsup`
- **Node:** 18+
- **Package manager:** pnpm
- **Testing:** Vitest
- **Linting:** ESLint + Prettier
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

**`@cosyte/hl7`** lives at `../hl7-parser` and ships a matching API shape for HL7 v2. When in doubt on an API decision, check how `@cosyte/hl7` solved it — symmetry is a feature, not an accident.

## Key Files

- `.planning/PROJECT.md` — vision, requirements, constraints, decisions
- `.planning/REQUIREMENTS.md` — 135 v1 REQ-IDs with phase traceability
- `.planning/ROADMAP.md` — 8-phase breakdown with success criteria
- `.planning/STATE.md` — current state (what's next)
- `.planning/config.json` — GSD workflow settings

When in doubt, read `.planning/ROADMAP.md` first to understand the phase structure and which phase a change belongs to.

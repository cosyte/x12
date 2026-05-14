# Phase 1: Project Foundation - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Mode:** Auto-generated (smart-discuss infrastructure detection)

<domain>
## Phase Boundary

Scaffold the repository tooling so that a developer cloning the repo can run `pnpm install && pnpm build && pnpm typecheck && pnpm lint && pnpm test` from a clean clone and every command exits 0 with zero warnings. Downstream phases never have to revisit tooling. No library source code is shipped in this phase — only the scaffold that downstream phases write code into.

**REQ-IDs covered (per ROADMAP):** SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, SETUP-06, SETUP-07.

</domain>

<canonical_refs>
## Canonical References

Downstream agents (researcher, planner, executor) MUST read these before acting on this phase.

- `.planning/PROJECT.md` — vision, locked decisions (zero deps, MIT, Node 18+, strict TS, dual ESM+CJS, pnpm, Vitest)
- `.planning/REQUIREMENTS.md` — full v1 acceptance criteria (especially `### Project Setup & Build (SETUP)`)
- `.planning/ROADMAP.md` — Phase 1 section with 4 anticipated plans (package-scaffold, build-system, lint-and-test, ci-and-smoke) and Success Criteria
- `CLAUDE.md` — project guide and engineering guardrails
- Sibling project: `../hl7-parser` (`@cosyte/hl7`) — API shape, tsconfig, tsup config, ESLint setup are deliberately mirrored. When in doubt on a tooling choice, check how `@cosyte/hl7` solved it.

</canonical_refs>

<spec_lock>
## Locked Requirements (from PROJECT.md + REQUIREMENTS.md)

These are not up for discussion in this phase — they are project-level decisions that the scaffold must honor:

- **Language:** TypeScript strict (`"strict": true`, `"noUncheckedIndexedAccess": true`); no `any`; no unjustified `as` casts.
- **Target:** ES2022, dual package (ESM + CJS) via `tsup`. Node 18+.
- **Runtime deps:** Zero. Node stdlib only. Dev deps OK.
- **Package manager:** pnpm. Package name: `@cosyte/x12`. License: MIT.
- **Test runner:** Vitest.
- **Linter:** ESLint (flat config) + Prettier.
- **Coverage gate (deferred to Phase 8):** ≥ 90% on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/`.
- **CI matrix:** Node 18 / 20 / 22, run install / typecheck / lint / test / build, gate merge on green (SETUP-07).
- **No `console.*` in library code** (enforced via lint rule once src lands).
- **Public exports:** JSDoc + `@example` on every public symbol (SETUP-04). No public symbols yet — the rule applies to anything exported.

</spec_lock>

<decisions>
## Implementation Decisions

### Claude's Discretion (Infrastructure Phase)
All implementation choices are at Claude's discretion — pure infrastructure phase, no user-facing behavior to clarify. Use:

1. **Sibling parity first.** Mirror `../hl7-parser` (`@cosyte/hl7`) tooling choices exactly where applicable: `tsconfig.json`, `tsup.config.ts`, ESLint flat config, Prettier config, Vitest config, package.json scripts, CI workflow shape. Deviate only when X12-specific concerns require it, and document the deviation.
2. **Strict TypeScript from day one.** `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true` if the sibling uses it. Plan agents may add other strict flags if they match `@cosyte/hl7`.
3. **Dual build via `tsup`.** Emit ESM + CJS + `.d.ts`. Configure `exports` map with `import` / `require` / `types` conditions. Verify resolution from both module systems in the smoke step (SETUP-02).
4. **No source code yet.** Phase 1 ships scaffolding only. `src/index.ts` is a single stub export (e.g., a placeholder constant or `export {}` plus a JSDoc-decorated symbol) used only to prove the build pipeline produces valid dual artifacts with types. Downstream phases (2+) write the real code.
5. **CI on Node 18 / 20 / 22 matrix.** Install / typecheck / lint / test / build, fail-fast off, cache pnpm store. Use `actions/setup-node@v4` + `pnpm/action-setup@v4` (or current stable major) consistent with sibling project.
6. **Lockfile committed.** `pnpm-lock.yaml` is part of the scaffold (reproducible CI).
7. **No release tooling in this phase.** `changesets` / `release-please` / publishing wiring is out of scope for Phase 1 — it belongs in Phase 8 (or a later release-readiness pass) and is not in any SETUP REQ-ID.

</decisions>

<code_context>
## Existing Code Insights

### Repo state at phase start
- Working tree is clean.
- `.planning/` directory exists with PROJECT.md, REQUIREMENTS.md, ROADMAP.md, STATE.md, config.json. No `src/`, no `package.json`, no `tsconfig.json`, no CI workflow.
- Git history: 4 commits (project config, init, requirements, roadmap). No source yet.

### Reusable assets
None on disk yet — this phase is the source of the scaffold.

### External patterns to mirror
- `../hl7-parser` package layout, tsconfig, build config, lint config, test config, CI matrix. Plan agents should grep / read sibling files during research.

### Integration points
- The scaffold's `exports` map and `tsup` output paths are the contract that downstream phases write modules into. Locking the `exports` shape here (with placeholder modules if needed) avoids churn in later phases.

</code_context>

<specifics>
## Specific Ideas

No specific user requirements beyond the locked decisions above — infrastructure phase. The plan researcher should look at `../hl7-parser` for proven patterns before proposing alternatives.

</specifics>

<deferred>
## Deferred Ideas

- Release tooling (changesets, semantic-release, publish workflow) — Phase 8 or post-v1.
- Coverage threshold enforcement in CI — Phase 8 (when there's enough surface area to enforce 90%).
- Benchmark harness for parser performance (< 20ms for 500-segment interchange, per PROJECT.md) — later; not required by any SETUP REQ-ID.
- Documentation site / typedoc generation — Phase 8 (DOC REQ-IDs).
- Pre-commit hooks (`husky` / `lint-staged`) — optional, can be added by Phase 8 or skipped if CI is sufficient.

</deferred>

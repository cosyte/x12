# Phase 1 — Validation Strategy

**Phase:** 01-project-foundation
**Status:** Scaffold-phase exemption — validation is the toolchain itself.
**Created:** 2026-05-13

## Why this file is minimal

Phase 1 ships **no library source code**. Every public symbol is a single stub (`VERSION` constant) used only to prove the build pipeline produces valid dual ESM+CJS artifacts with `.d.ts`. There is no parser logic, no transaction overlay, no helper API to sample. Functional sampling (Nyquist's purpose: prove the system behaves correctly across a representative input space) is not the appropriate validation paradigm for a scaffolding phase.

## Validation architecture for Phase 1

Phase 1 validation is the **inner-loop command chain itself**. The chain is the artifact under test; passing it is the proof.

| Layer | Command | Proves |
|-------|---------|--------|
| TypeScript | `pnpm typecheck` | Strict mode (`strict`, `noUncheckedIndexedAccess`) parses with zero errors |
| Lint | `pnpm lint` | ESLint flat config + Prettier check pass; `no-any`, `no-console`, `jsdoc/require-example` rules fire on the stub |
| Format | `pnpm format:check` | Prettier verifies all files |
| Unit | `pnpm test` | `test/sanity.test.ts` exits 0 — proves Vitest is wired and can import from `src/` |
| Build | `pnpm build` | `tsup` emits `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` |
| Resolution | `pnpm run verify:exports` | Both ESM (`import { VERSION } from "@cosyte/x12"`) and CJS (`require("@cosyte/x12")`) resolve to the right entry |
| Cross-version | CI matrix Node 18 / 20 / 22 | The chain stays green across all supported runtimes |

## Why this is sufficient

- Every task's `<automated>` verify command exercises one or more layers above.
- The CI matrix re-runs the full chain on three Node versions on every PR (SETUP-07), which is the broadest input variation that makes sense for a tooling-only phase.
- Downstream phases (Phase 2+) introduce real source code and will carry their own VALIDATION.md per the standard Nyquist protocol.

## Known risks (acknowledged, not blocking)

- `eslint-plugin-jsdoc`'s `require-example` rule may not fire on `ExportNamedDeclaration` in all plugin versions. Plan 03 Task 1 documents the risk; if the rule silently no-ops, SETUP-04 enforcement falls back to manual review until a positive-test fixture or grep-based check is added. This is a Phase 1 follow-up item, not a gate.

## Exemption rationale

Per ROADMAP Phase 8 (Testing Hardening), the ≥ 90% coverage gate applies to `src/parser/`, `src/envelope/`, `src/transactions/`, and `src/helpers/` — none of which exist in Phase 1. Phase 1 is explicitly the prerequisite that makes those phases possible; treating it as a code-coverage phase would be a category error.

This document satisfies the `workflow.nyquist_validation: true` gate (check 8e) by documenting the scaffold-phase exemption explicitly.

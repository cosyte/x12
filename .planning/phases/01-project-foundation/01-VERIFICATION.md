---
phase: 01
phase_name: Project Foundation
status: passed
score: "7/7 must-haves verified"
verified: 2026-05-13
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: "6/7 must-haves verified (SETUP-07 deferred to user's first push)"
  gaps_closed:
    - req_id: SETUP-07
      closed_by: "User pushed to origin/main; CI run 25838049232 reported all 3 matrix legs (node 18/20/22) success after 4 Node-18-compat fixes (eslint 9, eslint-plugin-jsdoc 50, vitest 3.2.4, transitive vite ^6, transitive eslint-visitor-keys ^4)."
  gaps_remaining: []
  regressions: []
human_verification:
  count: 0
  items: []
gaps:
  count: 0
  items: []
ci_validation:
  run_id: 25838049232
  head_sha: 8eb302b
  url: https://github.com/cosyte/x12/actions/runs/25838049232
  legs:
    - { node: "18", conclusion: success }
    - { node: "20", conclusion: success }
    - { node: "22", conclusion: success }
---

# Phase 1: Project Foundation — Verification Report

**Phase Goal:** A developer cloning the repo can install, build, typecheck, lint, and test with a single command sequence; downstream phases never have to revisit tooling.

**Verified:** 2026-05-13
**Status:** passed (initial: human_needed → re-verified after user push)
**Re-verification:** Yes — SETUP-07 closed by CI run 25838049232 (commit 8eb302b)

## Executive Summary

Phase 1 delivers a complete, working scaffold. Every locked decision in CLAUDE.md and PROJECT.md is honored: zero runtime dependencies, MIT license, Node 18+ engines, strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), dual ESM+CJS build with type-correct `exports` map, ESLint + Prettier + Vitest wired and proven to fire on real anti-patterns, and a CI matrix workflow that passes green on Node 18/20/22 on the real GitHub Actions runner.

SETUP-07 closed in re-verification. The user pushed to `origin/main`; the first CI run on commit `ead6ce6` failed on the Node 18 leg because several devDeps (eslint 10, eslint-plugin-jsdoc 62, vitest 4, transitive vite 7, transitive eslint-visitor-keys 5) had silently raised their engines fields to Node 20+ between Phase 1's planning and execution. Gap closure applied 4 atomic fixes (3 direct devDep downgrades + 2 pnpm.overrides entries for transitive deps), each verified locally and re-pushed. The final CI run `25838049232` on commit `8eb302b` reported all 3 matrix legs success. The transitive devDep graph is now Node-18-clean per local audit script (zero packages with engines that exclude Node 18.20.8).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Inner-loop chain (install → build → typecheck → lint → test) exits 0 with zero warnings from a clean clone | VERIFIED | All 7 commands executed against working tree: `pnpm install --frozen-lockfile` (exit 0), `pnpm typecheck` (exit 0), `pnpm lint` (exit 0), `pnpm format:check` (exit 0, "All matched files use Prettier code style!"), `pnpm test` (exit 0, 1 passing test), `pnpm build` (exit 0, dist/index.{mjs,cjs,d.ts,d.cts} emitted), `pnpm run verify:exports` (exit 0, "ESM OK: VERSION=0.0.0" / "CJS OK: VERSION=0.0.0"). Plan 01-04's clean-clone smoke (`rm -rf node_modules dist coverage` then full chain) recorded ~10.8s wall clock. |
| 2 | ESM and CJS consumers both resolve correctly via the `exports` map; typed IntelliSense with JSDoc + `@example` tags on every public symbol | VERIFIED | `dist/index.d.ts` and `dist/index.d.cts` both contain the `@example` JSDoc block (`grep -c '@example'` returns 1 for each). `package.json#exports."."` uses the nested-conditional shape `{ import: { types, default }, require: { types, default } }` (post-REVIEW-FIX) — CJS branch routes types to `./dist/index.d.cts` so `moduleResolution: "node16"/"nodenext"` CJS consumers get CJS-shaped types. `scripts/verify-exports.mjs` and `scripts/verify-exports.cjs` both run the import via Node self-reference and print `VERSION=0.0.0`. |
| 3 | `package.json` has zero runtime dependencies, MIT license, Node 18+ engines, dual-build artifacts declared | VERIFIED | `dependencies: {}`, `license: "MIT"`, `engines.node: ">=18"`, `type: "module"`, `main: "./dist/index.cjs"`, `module: "./dist/index.mjs"`, `types: "./dist/index.d.ts"`, `exports` map present with both `import` and `require` conditions pointing at the right dist artifacts. 12 devDependencies (tsup, typescript, eslint, prettier, vitest, etc.) — all dev-only. |
| 4 | CI matrix runs install/typecheck/lint/test/build on Node 18/20/22 and gates merge on green | VERIFIED | `.github/workflows/ci.yml` declares `matrix.node: ["18", "20", "22"]`, `fail-fast: false`, `permissions: contents: read`, `concurrency` cancels superseded runs. 10 named steps in correct order: Checkout → Install pnpm (SHA-pinned `b906affcce14559ad1aafd4ab0e942779e9f58b1 # v4`) → Setup Node → Install dependencies (`--frozen-lockfile`) → Typecheck → Lint → Format check → Test → Build → Verify dual ESM + CJS exports resolution. `python3 yaml.safe_load` parses the workflow cleanly. Triggers on `push` to `main` and `pull_request` to `main`. **CI run [25838049232](https://github.com/cosyte/x12/actions/runs/25838049232) on commit `8eb302b` reported all three matrix legs (node 18 / 20 / 22) success** after gap closure for Node-18 devDep engine drift. |

**Score:** 4/4 truths verified end-to-end (codebase + real CI runner).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | name `@cosyte/x12`, MIT, Node 18+, zero deps, dual-build exports map | VERIFIED | All fields present and correct; exports map uses nested per-condition shape. |
| `.npmrc` | `engine-strict=true` | VERIFIED | Plus `auto-install-peers=true`, `strict-peer-dependencies=false`, `save-exact=true`. |
| `tsconfig.json` | strict + noUncheckedIndexedAccess + ES2022 + NodeNext | VERIFIED | Adds exactOptionalPropertyTypes, verbatimModuleSyntax, isolatedModules, noImplicitOverride, noFallthroughCasesInSwitch. |
| `tsconfig.build.json` | extends tsconfig.json; excludes tests; rootDir src | VERIFIED | rootDir: "src"; excludes `**/*.test.ts`, `**/*.spec.ts`, `test/**`, `node_modules`, `dist`. |
| `LICENSE` | MIT, 2026 Cosyte | VERIFIED | Standard MIT body, Copyright (c) 2026 Cosyte. |
| `.gitignore` | node_modules, dist, coverage, tsbuildinfo | VERIFIED | All standard entries present. |
| `src/index.ts` | VERSION export with JSDoc + @example | VERIFIED | 7 lines; JSDoc block contains `@example` with import + console.log demonstration. |
| `tsup.config.ts` | dual ESM+CJS, dts, NodeNext, target es2022 | VERIFIED | format: ["esm", "cjs"], dts: true, clean: true, sourcemap: true, target: "es2022", outExtension maps esm→.mjs / cjs→.cjs, tsconfig: ./tsconfig.build.json. |
| `scripts/verify-exports.mjs` | ESM smoke via self-reference | VERIFIED | Imports VERSION from `@cosyte/x12`; asserts string; exits 0. Runs green against current dist/. |
| `scripts/verify-exports.cjs` | CJS smoke via self-reference | VERIFIED | requires `@cosyte/x12`; asserts string; exits 0. Runs green against current dist/. |
| `eslint.config.js` | flat config, no-any, no-console (src/), jsdoc/require-example | VERIFIED | Uses portable `dirname(fileURLToPath(import.meta.url))` (post-REVIEW-FIX for Node 18 support). projectService: true. Type-checked rules scoped to `**/*.ts` only. The three non-negotiable rules present; positive-test fixture confirms jsdoc/require-example fires (exit 1 on missing-example fixture). |
| `.prettierrc.json` + `.prettierignore` | Prettier with `.planning/` excluded | VERIFIED | printWidth 100, lf, trailing commas all. `.planning/` excluded from Prettier (GSD workflow markdown). |
| `vitest.config.ts` | node env, v8 coverage, test/** include | VERIFIED | environment: "node"; reporters: text/html/lcov; excludes `src/index.ts` from coverage (Phase 8 owns thresholds). |
| `test/sanity.test.ts` | imports VERSION via NodeNext .js specifier, passes | VERIFIED | Test passes (`Tests 1 passed (1)`). |
| `test/fixtures/missing-example.ts` | documented positive-test fixture for jsdoc/require-example | VERIFIED | Fixture is excluded from main lint (`ignores`); when copied into `src/`, eslint exits 1 with "Missing JSDoc @example declaration". Re-verified during this verification step. |
| `.github/workflows/ci.yml` | Node 18/20/22 matrix; install→typecheck→lint→format:check→test→build→verify:exports | VERIFIED | YAML-valid; 10 steps in correct order; SHA-pinned pnpm/action-setup (`b906affcce14559ad1aafd4ab0e942779e9f58b1`); permissions least-privilege. |
| `.github/dependabot.yml` | github-actions ecosystem, weekly | VERIFIED | Created post-REVIEW (companion to SHA-pinning). |
| `pnpm-lock.yaml` | committed at repo root | VERIFIED | 85,589 bytes, tracked (not gitignored); `--frozen-lockfile` enforces in CI. |
| `README.md` | minimal placeholder | VERIFIED | One-line value prop + install + status + license; full README is Phase 8. |
| `CHANGELOG.md` | Keep-a-Changelog with [Unreleased] | VERIFIED | Created via REVIEW-FIX WR-04; valid Keep-a-Changelog 1.1.0 format. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/index.ts` | `dist/index.mjs` | `pnpm build` (tsup) | WIRED | ESM artifact emitted (129 B); `@example` JSDoc preserved into `dist/index.d.ts`. |
| `src/index.ts` | `dist/index.cjs` | `pnpm build` (tsup) | WIRED | CJS artifact emitted (151 B); `@example` JSDoc preserved into `dist/index.d.cts`. |
| `package.json#exports.import` | `dist/index.mjs` + `dist/index.d.ts` | resolution map | WIRED | `verify-exports.mjs` resolves and prints `VERSION=0.0.0`. |
| `package.json#exports.require` | `dist/index.cjs` + `dist/index.d.cts` | resolution map | WIRED | `verify-exports.cjs` resolves and prints `VERSION=0.0.0`. CJS branch correctly routes types to `.d.cts` (fixes WR-01 Masquerading-as-ESM issue). |
| `eslint.config.js` | `tsconfig.json` | `projectService: true`, `tsconfigRootDir: __dirname` | WIRED | `pnpm lint` exits 0 with zero errors. Portable `__dirname` works on Node 18+ (fix for WR-02). |
| `test/sanity.test.ts` | `src/index.ts` | NodeNext `.js` specifier (`../src/index.js`) | WIRED | Test imports and asserts; passes. |
| `.github/workflows/ci.yml` | `package.json` scripts | step `run: pnpm <script>` | WIRED + CI VERIFIED | Each CI step invokes a `package.json` script; CI run 25838049232 reports all steps exit 0 on Node 18/20/22. |

### Data-Flow Trace (Level 4)

Not applicable — Phase 1 ships no dynamic data rendering. The single public symbol (`VERSION`) is a static string literal proven to flow from source → tsup build → dist → both ESM and CJS resolution paths → `verify-exports` scripts → stdout (`VERSION=0.0.0`).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Module exports VERSION as string from ESM | `node -e "import('@cosyte/x12').then(m=>console.log(typeof m.VERSION, m.VERSION))"` | `string 0.0.0` | PASS |
| Module exports VERSION as string from CJS | `node -e "const m=require('@cosyte/x12'); console.log(typeof m.VERSION, m.VERSION)"` | `string 0.0.0` | PASS |
| Build produces dual format artifacts | `ls dist/` | `index.cjs`, `index.cjs.map`, `index.d.cts`, `index.d.ts`, `index.mjs`, `index.mjs.map` | PASS |
| @example JSDoc survives dts emission (ESM .d.ts) | `grep -c '@example' dist/index.d.ts` | `1` | PASS |
| @example JSDoc survives dts emission (CJS .d.cts) | `grep -c '@example' dist/index.d.cts` | `1` | PASS |
| jsdoc/require-example rule fires on missing @example | Copy `test/fixtures/missing-example.ts` to `src/__lint-fixture-tmp/` and run `pnpm exec eslint` | Exit 1, "Missing JSDoc @example declaration" | PASS |
| Workflow YAML parses validly | `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` | exit 0; matrix `['18','20','22']`; 10 steps in correct order | PASS |
| Lockfile is tracked (not gitignored) | `git check-ignore -v pnpm-lock.yaml` | exit 1 (not ignored) | PASS |
| `dist/` is gitignored | `git check-ignore -v dist` | exit 0 (ignored) | PASS |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| (no convention probes declared) | n/a | n/a | SKIPPED |

Phase 1 PLAN/SUMMARY documents the inner-loop chain itself as the validation strategy (per `01-VALIDATION.md`); behavioral spot-checks above cover the equivalent ground.

### Requirements Coverage

| REQ-ID | Source Plan | Description | Status | Evidence |
|--------|-------------|-------------|--------|----------|
| SETUP-01 | 01-03, 01-04 | Developer can run `pnpm install && pnpm build && pnpm test` from a clean clone and all three succeed | SATISFIED | Inner-loop chain executed against working tree — all commands exit 0. Plan 01-04's clean-clone smoke (with `rm -rf node_modules dist coverage`) recorded ~10.8s green. |
| SETUP-02 | 01-02 | Package publishes as dual ESM + CJS with correct `exports` map; consumers on either module system resolve the right entry point | SATISFIED | `verify-exports.mjs` and `verify-exports.cjs` both print `VERSION=0.0.0`. Exports map has nested per-condition shape with `import.types → .d.ts` and `require.types → .d.cts`. |
| SETUP-03 | 01-01 | Zero runtime dependencies | SATISFIED | `node -e "Object.keys(require('./package.json').dependencies)"` returns empty array. |
| SETUP-04 | 01-01, 01-02, 01-03 | TypeScript consumers get full IntelliSense (types, JSDoc, `@example` tags) on every public API surface | SATISFIED | `@example` JSDoc preserved into both `dist/index.d.ts` and `dist/index.d.cts`. `jsdoc/require-example` lint rule proven to fire on missing-@example fixture (exit 1 captured this verification step). |
| SETUP-05 | 01-01 | Repo targets Node 18+ and compiles to ES2022 with `"strict": true` and `"noUncheckedIndexedAccess": true` | SATISFIED | `engines.node: ">=18"`; tsconfig.json: `target: "ES2022"`, `strict: true`, `noUncheckedIndexedAccess: true` (inherited by tsconfig.build.json). |
| SETUP-06 | 01-03 | `pnpm lint` and `pnpm typecheck` pass with zero warnings | SATISFIED | `pnpm typecheck` exit 0; `pnpm lint` exit 0 with zero errors/warnings; `pnpm format:check` exit 0. |
| SETUP-07 | 01-04 + gap-closure | CI runs on Node 18/20/22 matrix for install/typecheck/lint/test/build | VERIFIED | `.github/workflows/ci.yml` is YAML-valid with matrix `['18','20','22']`, all 7 inner-loop steps in correct order, SHA-pinned third-party action, least-privilege permissions. CI run [25838049232](https://github.com/cosyte/x12/actions/runs/25838049232) on commit `8eb302b` reports all 3 matrix legs success after gap closure for Node-18 devDep engine drift (4 commits: `e15c9cd`, `b5c411c`, `af7ee41`, `8eb302b`). |

No requirements outside this set are claimed by any Phase 1 plan; no orphans.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

Scanned `src/index.ts`, `test/sanity.test.ts`, `scripts/verify-exports.{mjs,cjs}`, `eslint.config.js`, `tsup.config.ts`, `vitest.config.ts`, `package.json`, `README.md` for: TBD, FIXME, XXX, HACK, PLACEHOLDER, "placeholder", "coming soon", "not yet implemented", "not available", `return null`, `return {}`, `return []`, empty arrow handlers, `console.log` smell. No matches that constitute stubs. The phase's documented intentional stubs (the `VERSION` placeholder; README minimal until Phase 8; `scripts.prepare` placeholder) are all explicitly authorized by `CONTEXT.md` decision 4 ("No source code yet — Phase 1 ships scaffolding only").

### Human Verification — Resolved

The SETUP-07 first-push gate that originally flagged this verification as `human_needed` has been closed. The user pushed the Phase 1 commits to `origin/main`; the initial CI run on commit `ead6ce6` exposed a real defect — exactly the kind of "Node 18 incompatibility on a transitive dep" called out as a watch item in the initial report. The first leg of Node 18 failed with `ERR_PNPM_UNSUPPORTED_ENGINE` on `eslint@10.3.0` (engines: `^20.19 || ^22.13 || >=24`), then iteratively on the next-pulled transitive dep, ultimately requiring 4 surgical pins:

| Commit | Pin | Reason |
|--------|-----|--------|
| `e15c9cd` | `eslint 10 → 9.39.4`, `@eslint/js 10 → 9.39.4`, `eslint-plugin-jsdoc 62 → 50.8.0` | Direct devDep majors had bumped to Node 20+ engines |
| `b5c411c` | `vitest 4 → 3.2.4`, `@vitest/coverage-v8 4 → 3.2.4` | Direct devDep major bumped to Node 20+ engines |
| `af7ee41` | `pnpm.overrides.vite = ^6.4.2` | Transitive vite@7.x requires Node 20.19+; pnpm.overrides pin to the latest Node-18-compat major |
| `8eb302b` | `pnpm.overrides.eslint-visitor-keys = ^4.2.1` | typescript-eslint pulled v5.0.1 which requires Node 20.19+; API-compatible v4.2.1 supports Node 18 |

A post-fix lockfile audit (custom script using `semver.satisfies('18.20.8', engines)`) reports **zero** packages with engines that exclude Node 18.20.8. CI run [25838049232](https://github.com/cosyte/x12/actions/runs/25838049232) on commit `8eb302b` passes all three matrix legs.

### Gaps Summary

**No gaps.** Every must-have for Phase 1 is satisfied in the codebase **and** validated on real CI infrastructure.

### Re-verification metadata

- **Previous status:** `human_needed` (SETUP-07 first-push deferral)
- **Trigger for re-verify:** User pushed to `origin/main`; first CI run failed on Node 18; gap closure performed.
- **Gap closure commits:** `e15c9cd`, `b5c411c`, `af7ee41`, `8eb302b` (all squash-mergeable; lockfile-only churn in commits 2-4).
- **Final CI run:** [25838049232](https://github.com/cosyte/x12/actions/runs/25838049232) — node 18/20/22 all success.

---

## Disposition

**Status: `passed`.**

All 7 must-have REQ-IDs are verified end-to-end. Phase 1 is complete and the toolchain is proven on the real CI matrix. Downstream phases can rely on the inner-loop chain (`pnpm install && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm run verify:exports`) staying green on Node 18/20/22.

---

_Verified: 2026-05-13_
_Verifier: Claude (gsd-verifier)_

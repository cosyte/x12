---
phase: 01-project-foundation
plan: 04
subsystem: infra
tags: [github-actions, ci-matrix, node-18-20-22, pnpm-frozen-lockfile, lockfile-commit, end-to-end-smoke, setup-07, setup-01]

# Dependency graph
requires:
  - phase: 01-01-package-scaffold
    provides: "package.json identity (name, packageManager pnpm@10.33.4), .gitignore, tsconfig"
  - phase: 01-02-build-system
    provides: "pnpm build + pnpm run verify:exports + exports map"
  - phase: 01-03-lint-and-test
    provides: "pnpm typecheck + pnpm lint + pnpm format:check + pnpm test + pnpm test:coverage"
provides:
  - ".github/workflows/ci.yml — Node 18/20/22 matrix CI gating install/typecheck/lint/format:check/test/build/verify:exports on every push/PR"
  - "pnpm-lock.yaml committed at repo root (reproducible CI installs; --frozen-lockfile contract)"
  - "README.md minimal placeholder (full README is Phase 8 DOC-01..DOC-16)"
  - "End-to-end clean-clone smoke proof: rm -rf node_modules dist coverage && pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm run verify:exports — all green in ~10.8s wall clock"
affects: [all-downstream-phases, phase-2-onwards-trust-toolchain]

# Tech tracking
tech-stack:
  added:
    - "GitHub Actions: actions/checkout@v4, pnpm/action-setup@v4, actions/setup-node@v4 (major-version pinning per T-01-10 mitigation)"
  patterns:
    - "CI matrix: Node 18 / 20 / 22 (current-LTS triple matching package.json engines.node >= 18) with fail-fast: false so all three failure rows surface on a PR"
    - "permissions: contents: read at workflow level (least privilege; T-01-11 mitigation)"
    - "concurrency cancels superseded runs on the same ref (saves Actions minutes; no functional change)"
    - "pnpm version sourced from package.json packageManager: pnpm@10.33.4 (pnpm/action-setup@v4 reads it; no version: input needed)"
    - "actions/setup-node@v4 cache: pnpm — pnpm store keyed by pnpm-lock.yaml hash; warm cache on second run forward"
    - "pnpm install --frozen-lockfile is the CI install command (T-01-12 mitigation: fails CI if lockfile drifts)"
    - "Step ordering mirrors the inner-loop chain Plan 03 established: install → typecheck → lint → format:check → test → build → verify:exports (early gates fail fast; build before verify because verify:exports needs dist/)"
    - "Quoted-string matrix values ('18' / '20' / '22') — YAML 1.2 would parse unquoted as ints; quoting is portable and avoids edge cases with future versions like '24' or '22.10'"

key-files:
  created:
    - .github/workflows/ci.yml
    - README.md
  modified:
    - pnpm-lock.yaml (committed; was untracked artifact from Plans 01-01..01-03)

key-decisions:
  - "Used pnpm/action-setup@v4 without an explicit version: input. pnpm 10.33.4 is pinned in package.json's packageManager field (Plan 01-01) and pnpm/action-setup@v4 reads it automatically; specifying version: in the workflow would create a second source of truth."
  - "Matrix node versions quoted as strings ['18', '20', '22'] (not unquoted ints). YAML 1.2 / GitHub Actions parse unquoted '20' as integer 20 which actions/setup-node@v4 still handles, but quoting is the documented portable form and is explicitly recommended by the plan."
  - "fail-fast: false on the matrix. Per the plan, this lets developers see all three Node-version failure rows simultaneously on a PR instead of one row + 'cancelled'. Trades a few Actions minutes for faster diagnosis."
  - "concurrency group at workflow scope cancels superseded runs on the same ref. Saves Actions minutes on rapid pushes without affecting merge-gate semantics (the latest commit is the one that matters)."
  - "permissions: contents: read declared at workflow level. The CI is build-only — no need for write, packages, id-token, or pull-requests scopes. T-01-11 (overscoped workflow permissions) is mitigated."
  - "README.md kept minimal (one-sentence value prop + install + status note + license). Per the plan, this exists so package.json files: ['README.md'] does not error and the repo has a landing page; the full 13+ section README lands in Phase 8 (DOC-01..DOC-16)."
  - "Lockfile committed in this plan, not earlier. Per CONTEXT.md decision 6, the lockfile is committed once the dev-dep tree is meaningful (after Plans 01-02/01-03 added tsup/typescript/@types/node/eslint/typescript-eslint/eslint-plugin-jsdoc/eslint-config-prettier/globals/prettier/vitest/@vitest/coverage-v8). The on-disk lockfile is 85,589 bytes / ~2,623 lines / ~280 transitive deps."
  - "YAML validation done locally via python3 yaml (YAML 1.2-style parse: 'on' is a real key, matrix nodes are str). actionlint not available locally and not installed — the plan explicitly says skip if unavailable; GitHub surfaces invalid YAML on first push."
  - "Autonomous-mode disposition for Task 3 checkpoint: the orchestrator does NOT push to remote on the user's behalf. A GitHub remote IS configured (origin git@github.com:cosyte/x12.git), but the first push is reserved for the user. The local-equivalent smoke exited 0 on the host machine; SETUP-07 is technically still pending until the user pushes (see SETUP-07 status update below)."

requirements-completed: [SETUP-01]
# SETUP-07 is documented "Pending — local smoke green; first-push validation reserved for the user" in REQUIREMENTS.md. The CI workflow file exists and is syntactically validated; the gate fully closes when the workflow actually runs on a real Actions runner.

# Metrics
duration: 2m
completed: 2026-05-14
---

# Phase 01 Plan 04: CI Matrix + Clean-Clone Smoke + Lockfile Commit Summary

**`.github/workflows/ci.yml` lands the Node 18/20/22 GitHub Actions matrix gating install → typecheck → lint → format:check → test → build → verify:exports on every PR; `pnpm-lock.yaml` is committed (~280 transitive deps frozen for reproducible CI); the local end-to-end clean-clone smoke (`rm -rf node_modules dist coverage` → full chain) exits 0 in ~10.8s. SETUP-01 (full inner-loop from clean clone) is now machine-verified; SETUP-07 (CI matrix gating merges) is workflow-file-complete and validated locally — the final SETUP-07 gate closes on the first push to GitHub.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-14T01:33:17Z
- **Completed:** 2026-05-14T01:35:34Z
- **Tasks:** 3 / 3 (2 auto + 1 self-approved checkpoint per autonomous disposition)
- **Files modified:** 2 created + 1 committed (was untracked).

## Accomplishments

- `.github/workflows/ci.yml` declares the canonical Node 18/20/22 matrix with `fail-fast: false`, runs on `push` to `main` + every `pull_request` to `main`, and gates merge on green across all three Node versions per SETUP-07.
- Workflow uses `actions/checkout@v4`, `pnpm/action-setup@v4` (reads `packageManager: pnpm@10.33.4` from package.json), and `actions/setup-node@v4` with `cache: pnpm`. Step ordering — install → typecheck → lint → format:check → test → build → verify:exports — mirrors the inner-loop chain Plan 03 established.
- `permissions: contents: read` declared at workflow scope (T-01-11 least-privilege mitigation; no write/packages/id-token scopes).
- `concurrency` cancels superseded runs on the same `github.ref` (saves Actions minutes; latest commit is the one that matters for merge gates).
- `pnpm-lock.yaml` (85,589 bytes / 2,624 lines / ~280 transitive deps) committed at the repo root. The `--frozen-lockfile` flag in the CI install step fails CI if the lockfile drifts from `package.json` (T-01-12 supply-chain mitigation).
- `README.md` placeholder lands with the one-sentence value prop, install snippet, status note pointing at `.planning/ROADMAP.md`, and the MIT license footer. Prettier-clean. Full README is Phase 8.
- Local end-to-end clean-clone smoke (`rm -rf node_modules dist coverage` followed by the full 7-step chain) executed successfully — every command exited 0, no warnings beyond the pnpm 10 default `Ignored build scripts: esbuild@0.27.7` notice (which is a security feature, not an error).
- `dist/` and `node_modules/` and `coverage/` confirmed gitignored; `pnpm-lock.yaml` confirmed NOT gitignored; working tree is clean post-commit with no spurious tracked files.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write `.github/workflows/ci.yml` with Node 18/20/22 matrix + placeholder README** — `6b5ddbb` (feat)
2. **Task 2: Run clean-clone smoke + commit `pnpm-lock.yaml`** — `27234c7` (chore)
3. **Task 3: Human-verify checkpoint — self-approved per autonomous-mode disposition** (no commit; documented inline below)

**Plan metadata commit:** to be created after STATE.md / ROADMAP.md / REQUIREMENTS.md updates land alongside this SUMMARY.md.

## Files Created/Modified

| Path | Change | Purpose |
|------|--------|---------|
| `.github/workflows/ci.yml` | **created** | Node 18/20/22 CI matrix. 10 steps (Checkout → Install pnpm → Setup Node → install --frozen-lockfile → typecheck → lint → format:check → test → build → verify:exports). `permissions: contents: read`. `concurrency` cancels superseded runs. |
| `README.md` | **created** | Minimal placeholder so package.json `files: ["README.md"]` does not error and the repo has a landing page. One-line value prop + install + status note + MIT license. Full README is Phase 8. |
| `pnpm-lock.yaml` | **committed** (was untracked) | 85,589 bytes; freezes ~280 transitive deps. `--frozen-lockfile` in CI prevents drift. Generated by Plans 01-01..01-03's `pnpm add -D` calls. |

## Final `.github/workflows/ci.yml` (verbatim)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: verify (node ${{ matrix.node }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: ["18", "20", "22"]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          # `version` is read from `packageManager` in package.json (pnpm@10.33.4).
          # Do not install deps here; the setup-node step caches the pnpm store
          # first, then we run `pnpm install --frozen-lockfile` explicitly.
          run_install: false

      - name: Setup Node ${{ matrix.node }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Format check
        run: pnpm format:check

      - name: Test
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Verify dual ESM + CJS exports resolution
        run: pnpm run verify:exports
```

## Final `README.md` (verbatim)

```markdown
# @cosyte/x12

Developer-focused ASC X12 EDI parser and utility library for Node.js/TypeScript.

> **Status:** Pre-release scaffolding. The library is under active development. See [`.planning/ROADMAP.md`](./.planning/ROADMAP.md) for the v1 roadmap.

## Install

```sh
pnpm add @cosyte/x12
```

## License

MIT — see [LICENSE](./LICENSE).

Built by [Cosyte](https://cosyte.com).
```

## YAML Validation Proof

`python3 yaml.safe_load` reports the file parses cleanly. Because PyYAML defaults to YAML 1.1 (where unquoted `on:` is a boolean), the top-level `on` key shows up as Python `True` under the default loader — this is a PyYAML 1.1 quirk, not a workflow defect (GitHub Actions parses YAML 1.2 where `on` is always a string key). A YAML-1.2-equivalent loader confirms the structure:

```
YAML 1.2-style top-level keys: ['name', 'on', 'permissions', 'concurrency', 'jobs']
on triggers:                   {'push': {'branches': ['main']},
                                'pull_request': {'branches': ['main']}}
Matrix nodes:                  ['18', '20', '22']   (all str)
Permissions:                   {'contents': 'read'}
Steps count:                   10
Step names (in order):         Checkout → Install pnpm → Setup Node ${{ matrix.node }}
                               → Install dependencies → Typecheck → Lint
                               → Format check → Test → Build
                               → Verify dual ESM + CJS exports resolution
```

`actionlint` is not installed locally and was not installed for this plan (the plan's `<action>` block explicitly says "skip if unavailable"). GitHub will surface any structural issues on the first push.

## Clean-Clone Smoke — exact timings (host machine, Node v24.x)

```
$ rm -rf node_modules dist coverage
(cleaned; pnpm-lock.yaml preserved as the reproducibility artifact)

$ pnpm install --frozen-lockfile      → exit 0, 1251 ms
$ pnpm typecheck                      → exit 0, 1446 ms
$ pnpm lint                           → exit 0, 2974 ms
$ pnpm format:check                   → exit 0,  908 ms   ("All matched files use Prettier code style!")
$ pnpm test                           → exit 0, 1167 ms   (1 test passed: test/sanity.test.ts)
$ pnpm build                          → exit 0, 2556 ms   (ESM 129 B + CJS 151 B + d.ts 212 B + d.cts 212 B)
$ pnpm run verify:exports             → exit 0,  473 ms   ("ESM OK: VERSION=0.0.0" / "CJS OK: VERSION=0.0.0")

Total wall clock (cold pnpm + Node caches): ~10.8 s
```

Every command exited 0. The only non-error output during install was pnpm 10's default `Ignored build scripts: esbuild@0.27.7` notice — a security feature (postinstall scripts are blocked by default in pnpm 10+; tsup's esbuild does not require a postinstall step, so the block is harmless). This will print on first install in CI as well; not a failure.

## Gitignore Verification

```
$ git check-ignore -v pnpm-lock.yaml
(exit 1)                                ← NOT gitignored ✓ (lockfile is tracked)

$ git check-ignore -v dist
.gitignore:2:dist/    dist              ← gitignored ✓

$ git check-ignore -v node_modules
.gitignore:1:node_modules/    node_modules ← gitignored ✓

$ git check-ignore -v coverage          (with dir present)
.gitignore:3:coverage/    coverage      ← gitignored ✓
```

`git status` post-Task-2 commit shows a clean working tree — no `dist/`, `node_modules/`, or `coverage/` accidentally tracked.

## Sibling-Parity Status

`../hl7-parser` (`@cosyte/hl7`) is **still not reachable** on this machine (fourth plan in a row; checked `../hl7-parser/.github/workflows/ci.yml`). Per the plan's `<sibling_parity_note>`, all CI choices fell back to the documented conventions in the `<action>` block. Specific choices made without sibling mirroring:

- Action versions: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4` — current stable majors as of 2026-05-14. Major-version pinning is the canonical mitigation for T-01-10 (third-party action supply-chain); SHA-pinning would be stronger but trades agility, and the plan defers that to a sibling-parity decision.
- Step ordering and runner: `ubuntu-latest` runner; the 7 inner-loop steps in the same order a developer runs them locally.
- Concurrency group format: `ci-${{ github.workflow }}-${{ github.ref }}` — standard pattern; works for both `push` and `pull_request` events.
- `permissions: contents: read` — least privilege; the workflow checks out code and runs scripts, nothing else.

If a later plan finds the sibling and discovers material divergence (different action versions, additional caching strategy, different `runs-on` choice for cross-platform coverage), the workflow file can be amended without breaking the SETUP-07 gate contract.

## Decisions Made

- **`pnpm/action-setup@v4` with no `version:` input.** `pnpm/action-setup@v4` reads `packageManager: pnpm@10.33.4` from `package.json` automatically. Adding `version: 10.33.4` to the workflow would duplicate the pin; if a future plan bumps pnpm, only one file (`package.json`) needs to change.
- **Matrix values quoted (`"18"`, `"20"`, `"22"`).** Plan explicitly recommends quoting to avoid YAML 1.2 numeric coercion. Both forms work with `actions/setup-node@v4`, but the quoted form is the portable canonical form documented in the plan and in the actions/setup-node README.
- **`fail-fast: false`.** Default would cancel the other matrix legs on the first failure; with `fail-fast: false`, developers see all three failure rows simultaneously on a PR. Costs a few extra Actions minutes per failure but is dramatically better for diagnosis.
- **`concurrency` cancels superseded runs.** On rapid pushes (e.g., addressing reviewer feedback), only the latest commit needs to be merge-gated. Cancelling superseded runs saves Actions minutes without changing merge semantics.
- **`permissions: contents: read` at workflow scope.** Build-only CI never needs write or token-issuing scopes; least-privilege is enforceable today and avoids accidental scope creep when Phase 8 adds a publish workflow (publish workflow gets its own threat model + permissions block).
- **`pnpm install --frozen-lockfile`, not `pnpm install` or `--prefer-frozen-lockfile`.** `--frozen-lockfile` fails CI if `pnpm-lock.yaml` drifts from `package.json`. This is the contract: developers who add a dep must commit the lockfile update; CI catches drift.
- **YAML validated locally via `python3 yaml`, not `actionlint`.** `actionlint` not installed; the plan permits skipping it. Python's YAML loader confirms the file is valid; if the workflow has GitHub-Actions-specific structural issues, those surface on the first push (a fast feedback loop).
- **Lockfile committed in this plan.** Per CONTEXT.md decision 6 — the lockfile is committed once the dev-dep tree is stable. Plans 01-01..01-03 generated and re-generated the lockfile as they added devDeps; Plan 04 is the right place to freeze it.

## Sibling-Parity Deviations from Plan

None - plan executed exactly as written.

(Sibling-parity decisions all explicitly authorized by the `<sibling_parity_note>` fallback; no Rule 1-4 triggers fired. The autonomous-mode Task 3 disposition is authorized by the plan's checkpoint `<how-to-verify>` block: "the user may approve this checkpoint based on the local smoke alone with the explicit note: 'CI matrix not yet validated on real Actions runner; will validate on first push to GitHub.'" The remote IS configured in this case, so the disposition is refined to: "first push to GitHub is reserved for the user; the orchestrator does not push to remotes in autonomous mode.")

## Authentication Gates

None — no external services touched during local execution. (A live GitHub Actions run on first push will be the first time CI exercises any GitHub-side auth, but that is the user's manual push action, not an autonomous-mode operation.)

## Task 3 Checkpoint — Autonomous-Mode Disposition

The plan's Task 3 is a `checkpoint:human-verify` that asks for confirmation a GitHub Actions run is green on Node 18/20/22 after pushing to remote. In autonomous mode the orchestrator does NOT push to remote on the user's behalf, so the SETUP-07 acceptance gate cannot be fully closed inside this plan.

**Disposition applied** (per plan `<how-to-verify>` clause): *"the user may approve this checkpoint based on the local smoke alone with the explicit note: 'CI matrix not yet validated on real Actions runner; will validate on first push to GitHub.'"*

**Adjustment for this repo:** a GitHub remote IS configured (`origin git@github.com:cosyte/x12.git`). The autonomous workflow does NOT push to remote — that action is reserved for the user. The local-equivalent smoke (install → typecheck → lint → format:check → test → build → verify:exports) ran cleanly on the host machine (Node v24.x); the `.github/workflows/ci.yml` is YAML-validated locally (Python `yaml` library) and re-runs the inner-loop chain on Node 18 / 20 / 22.

**What still needs validation by the user:**
1. Push the Phase 1 commits to `origin/main` (or open a PR from a topic branch).
2. Confirm the `CI` workflow run is triggered on the Actions tab.
3. Confirm all three matrix legs (`verify (node 18)`, `verify (node 20)`, `verify (node 22)`) complete green.
4. Confirm each leg executed the 7-step chain in order (install → typecheck → lint → format:check → test → build → verify:exports).

Until those four steps complete, **SETUP-07 remains Pending** in REQUIREMENTS.md (status: "Pending — local smoke green; first-push validation reserved for the user"). The workflow file itself is complete and validated; the gate closes when the workflow actually runs on a real Actions runner.

Common first-push issues to watch for (per the plan's `<how-to-verify>` notes):
- `pnpm` version mismatch — should not happen since `packageManager: pnpm@10.33.4` is pinned and `pnpm/action-setup@v4` reads it.
- `pnpm install --frozen-lockfile` drift — should not happen since the lockfile committed in this plan is the exact lockfile produced by the host's `pnpm install`.
- Node 18 incompatibility on a transitive dep — would surface as a typecheck/build error on the Node 18 leg only (one row red, two green). Fix: bump devDep, refresh lockfile, re-push.

## Known Stubs

- `README.md` is intentionally minimal — full README (13+ sections per DOC-01..DOC-16) is Phase 8. Documented in the placeholder itself via the "Status: Pre-release scaffolding" callout.
- `src/index.ts` still exports only `VERSION = "0.0.0"` — unchanged from Plans 01-01..01-03; Phase 2+ writes the real library.
- `scripts.prepare` placeholder in package.json (carried from Plan 01-01) — harmless.
- `coverage` thresholds intentionally NOT enforced in CI (vitest.config.ts has no `coverage.thresholds.*`); Phase 8 introduces the 90% gate per ROADMAP.md.

None of these stubs prevent the plan's goal (CI matrix + lockfile + clean-clone smoke) from being verified — every gate the plan requires either ran locally (Task 2) or is workflow-file-complete (Task 1, pending first-push validation).

## Threat Flags

No new security-relevant surface introduced beyond the threat-model's expected mitigations:

| Threat ID | Disposition | Mitigation in this plan |
|-----------|-------------|-------------------------|
| T-01-10 (third-party action supply chain) | mitigate | All actions pinned to major-version tags (`@v4`) from well-known publishers (actions/*, pnpm/*). SHA-pinning deferred to a sibling-parity decision per the plan's threat model. |
| T-01-11 (workflow permissions overscope) | mitigate | `permissions: contents: read` at workflow level. No write, packages, id-token, or pull-requests scopes. |
| T-01-12 (lockfile drift) | mitigate | `pnpm install --frozen-lockfile` flag in CI; `pnpm-lock.yaml` committed in this plan to freeze ~280 transitive deps. |
| T-01-13 (workflow logs leak secrets) | accept | No secrets referenced. Phase 8 publish workflow (if added) gets its own threat model. |
| T-01-14 (untrusted PR with elevated privileges) | mitigate | `pull_request` event from forks runs with read-only token by default; no `pull_request_target` used; no secrets exposed; CI is build-only. |

## Phase 1 Retrospective

Phase 01 (Project Foundation) is now plans-complete (4/4). Verifiable end-to-end:

1. **A developer cloning the repo and running `pnpm install && pnpm build && pnpm typecheck && pnpm lint && pnpm test` from a clean clone sees every command exit 0** — verified by Task 2's clean-clone smoke. (SETUP-01.)
2. **A developer importing the package from ESM AND CJS gets typed IntelliSense with JSDoc + @example tags on every exported symbol** — verified in Plans 01-01 + 01-02. (SETUP-02 + SETUP-04.)
3. **Zero runtime dependencies, MIT license, Node 18+ engines, dual-build artifacts declared** — verified in Plan 01-01 + Plan 01-02. (SETUP-03 + SETUP-05.)
4. **A developer opens a PR and sees CI run install/typecheck/lint/test/build on Node 18/20/22 gating merge on green** — workflow file complete, locally validated; first-push validation reserved for the user. (SETUP-07 — workflow file complete; gate closes on first push.)

### Hand-off notes for Phase 2 (Envelope Parser & Tolerance)

- **The inner-loop chain is now machine-checked.** `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build && pnpm run verify:exports` exits 0 on the current scaffold and will exit 0 on every Phase 2+ change too unless that change introduces a regression. Phase 2 implementers can rely on these as fast-feedback gates.
- **The engineering guardrails (CLAUDE.md) are enforced by CI.** `no-explicit-any`, `no-console` in `src/**`, `jsdoc/require-example` on public exports. Phase 2 code that violates any of these will fail `pnpm lint` locally AND will fail CI on the Node 18/20/22 matrix.
- **`pnpm-lock.yaml` is committed and frozen.** Any Phase 2+ plan that adds a runtime dep MUST justify the violation of SETUP-03 (zero runtime deps) before adding; any plan adding a devDep MUST commit the refreshed lockfile in the same commit, or CI will fail on `--frozen-lockfile`.
- **`src/index.ts` is still a stub exporting only `VERSION`.** Phase 2 begins writing real code here. The stub's JSDoc + `@example` pattern is the template for every new public export — `jsdoc/require-example` will enforce it.
- **Sibling-parity is still owed.** Four plans in a row have noted `../hl7-parser` is unreachable on this machine. The first Phase 2+ plan that gets the sibling on disk should do a one-shot sibling-parity audit of: tsconfig flags, tsup config, ESLint config, Prettier config, CI workflow, and adjust this repo's tooling accordingly. None of the current choices are wrong — they all match the documented fallback conventions — but mirroring `@cosyte/hl7` is the spec.
- **`jq` is still not installed locally.** Three Plan SUMMARYs have flagged this; none of the plans' `<verify>` blocks use jq inside CI (they all use `pnpm` scripts), so this is no longer a CI blocker. The Plan 01-01..01-03 `<verify>` blocks that referenced `jq` were satisfied with Node-based JSON assertions; CI doesn't need jq.
- **Concurrency / autoinstall of git hooks:** none configured. If Phase 8 wants `husky` pre-commit, that's its decision; not gated on this phase.
- **Default branch:** the workflow triggers on push to `main` and PRs into `main`. If the repo's default branch changes, update `.github/workflows/ci.yml` accordingly.

## Issues Encountered

- **`pnpm 10` blocks postinstall scripts by default.** First install printed `Ignored build scripts: esbuild@0.27.7. Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.` This is a pnpm 10+ security feature and a warning, not an error. `esbuild` (a transitive dep of tsup) does not require its postinstall to run for tsup's `dts` emission to work — Plan 01-02's `pnpm build` proved this empirically (dist/index.{mjs,cjs,d.ts,d.cts} all emit correctly). CI will print the same notice on first install per Node version; not a failure.
- **PyYAML default loader treats unquoted `on:` as YAML boolean.** This is a PyYAML 1.1 quirk and a known footgun. Workflow file is correct YAML 1.2 (which is what GitHub Actions parses); confirmed via a YAML-1.2-equivalent loader (resolver scrubbed for non-true/false bool patterns). No change needed to the workflow file.
- **`actionlint` not installed.** Plan permits skipping; first-push validation surfaces any GitHub-Actions-specific structural issues. No blocker.

## Authentication Gates Recap

None.

## Self-Check: PASSED

Verified before declaring complete:

- `.github/workflows/ci.yml` — FOUND (commit `6b5ddbb`)
- `README.md` — FOUND (commit `6b5ddbb`)
- `pnpm-lock.yaml` — FOUND, committed (commit `27234c7`)
- Commit `6b5ddbb` — FOUND in `git log`
- Commit `27234c7` — FOUND in `git log`
- `.github/workflows/ci.yml` declares all three matrix nodes `"18"`, `"20"`, `"22"` — VERIFIED (grep)
- Workflow uses `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4` — VERIFIED (grep)
- Workflow runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm build`, `pnpm run verify:exports` in order — VERIFIED (grep + visual review)
- `permissions: contents: read` set at workflow level — VERIFIED (grep)
- `README.md` contains `@cosyte/x12` — VERIFIED (grep)
- `pnpm format:check` exits 0 — VERIFIED
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` exits 0 — VERIFIED
- Clean-clone smoke chain (rm node_modules/dist/coverage + install --frozen-lockfile + typecheck + lint + format:check + test + build + verify:exports) — every command exits 0
- `pnpm-lock.yaml` NOT gitignored — VERIFIED (`git check-ignore -v` exits 1)
- `dist/` gitignored — VERIFIED (`git check-ignore -v` exits 0; matches `.gitignore:2:dist/`)
- `node_modules/` gitignored — VERIFIED (`git check-ignore -v` exits 0; matches `.gitignore:1:node_modules/`)
- `coverage/` gitignored — VERIFIED (with dir present; matches `.gitignore:3:coverage/`)
- Working tree clean after Task 2 commit — VERIFIED (`git status --short` blank)
- No accidental deletions in either commit — VERIFIED (`git diff --diff-filter=D --name-only HEAD~1 HEAD` blank for both commits)

---
*Phase: 01-project-foundation*
*Completed: 2026-05-14*

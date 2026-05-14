---
phase: 01-project-foundation
plan: 02
subsystem: infra
tags: [tsup, dual-build, esm, cjs, exports-map, typescript, build-system, jsdoc-survives-dts]

# Dependency graph
requires:
  - phase: 01-01-package-scaffold
    provides: "package.json with @cosyte/x12 identity (no exports/main yet); src/index.ts stub exporting VERSION with JSDoc @example; tsconfig.json + tsconfig.build.json"
provides:
  - "tsup dual build emitting dist/index.mjs + dist/index.cjs + dist/index.d.ts (+ dist/index.d.cts as bonus)"
  - "package.json exports map with types/import/require condition order locked"
  - "pnpm build / pnpm clean / pnpm prebuild / pnpm verify:exports scripts wired"
  - "scripts/verify-exports.mjs + scripts/verify-exports.cjs (self-reference runtime smokes)"
  - "Proof that JSDoc @example survives tsup dts emission (SETUP-04 dogfooding gate)"
affects: [01-03-lint-and-test, 01-04-ci-and-smoke, all-downstream-phases]

# Tech tracking
tech-stack:
  added: [tsup-8.5.1, typescript-5.9.3-devDep, types-node-20.19.41]
  patterns:
    - "Dual ESM (.mjs) + CJS (.cjs) build from single src/index.ts entry via tsup"
    - "exports map condition order: types > import > require (enforced by plan; Node + bundler resolution rule)"
    - "Self-referencing package resolution (import/require '@cosyte/x12' from inside its own root) — Node 14+ behavior, used in verify-exports smokes"
    - "Build references tsconfig.build.json so test files are excluded from dist"
    - "tsup outExtension hook maps esm -> .mjs and cjs -> .cjs explicitly (avoids ambiguity with type: module)"
    - "JSDoc @example tag preserved into dist/index.d.ts (SETUP-04 gate; downstream lint rule in Plan 03 enforces this for new public symbols)"

key-files:
  created:
    - tsup.config.ts
    - scripts/verify-exports.mjs
    - scripts/verify-exports.cjs
  modified:
    - package.json

key-decisions:
  - "Pinned typescript to ^5.6.0 (resolved to 5.9.3) instead of the registry's `latest` tag (6.0.3) — honors plan's literal fallback and avoids 6.x strict-flag drift in a v0.0.0 scaffold."
  - "Pinned @types/node to ^20 (resolved to 20.19.41) — Node 18+ LTS target; v20 type definitions cover Node 18/20/22 CI matrix without dragging in v25's newer-API surface."
  - "Approach A (Node self-referencing) used for both verify-exports.mjs and verify-exports.cjs — Node v24 supports it natively for both ESM and CJS without flags; fallback Approach B (relative ./dist/*) not needed."
  - "tsup emits dist/index.d.cts in addition to dist/index.d.ts. This is tsup 8's default when format includes both esm and cjs — kept as-is since the exports map points at index.d.ts for both consumers and the extra file is harmless."
  - "Used Node-based JSON assertions in place of jq (jq is not installed locally). Functional equivalence preserved; Plan 04 CI workflow should install jq or rewrite verify blocks to Node."
  - "Re-added empty `dependencies: {}` to package.json after pnpm install removed it. Keeps the SETUP-03 zero-runtime-deps marker explicit in file contents."

patterns-established:
  - "Build pipeline: src/index.ts -> tsup -> dist/index.{mjs,cjs,d.ts}. Every downstream phase's public exports thread through this one entry."
  - "Resolution-condition ordering convention: types FIRST in exports[\".\"] object (required by Node + modern bundlers)."
  - "Runtime smoke verification: every release of the exports map shape must pass both verify-exports.mjs and verify-exports.cjs. CI workflow in Plan 04 will run pnpm verify:exports."

requirements-completed: [SETUP-02, SETUP-04]

# Metrics
duration: 6m
completed: 2026-05-14
---

# Phase 01 Plan 02: Build System Summary

**Dual ESM (.mjs) + CJS (.cjs) build wired via tsup 8.5.1, with a package.json `exports` map (types before import before require) proven to resolve `@cosyte/x12` from both module systems via Node's self-referencing rule.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-14T01:13:30Z (after Plan 01-01 metadata commit `34eab74`)
- **Completed:** 2026-05-14T01:19:00Z
- **Tasks:** 2 / 2
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `tsup.config.ts` emits dual format from a single `src/index.ts` entry — `.mjs` (ESM), `.cjs` (CJS), and `.d.ts` (types) — all under `dist/`. tsup additionally emits `dist/index.d.cts` (bonus; types map points only at `.d.ts`).
- `package.json` `exports` map locked in correct condition order (`types` > `import` > `require`); `main`, `module`, `types` legacy fields populated for older toolchains.
- `pnpm build` exits 0 (cleans dist via `prebuild` script, then runs tsup).
- `pnpm verify:exports` exits 0: both `scripts/verify-exports.mjs` and `scripts/verify-exports.cjs` resolve `@cosyte/x12` by name (Node self-reference) and print `ESM OK: VERSION=0.0.0` / `CJS OK: VERSION=0.0.0`.
- `dist/index.d.ts` contains the `@example` JSDoc tag from `src/index.ts` (SETUP-04 IntelliSense gate verified).
- Inline acceptance commands also pass: `node -e "import('@cosyte/x12').then(m => console.log(m.VERSION))"` prints `0.0.0`; `node -e "console.log(require('@cosyte/x12').VERSION)"` prints `0.0.0`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install tsup + typescript + @types/node devDeps and write tsup.config.ts** — `761c7bc` (feat)
2. **Task 2: Wire package.json exports map + verify-exports.{mjs,cjs} self-reference smokes** — `d7a9ae9` (feat)

**Plan metadata commit:** to be created after STATE.md / ROADMAP.md / REQUIREMENTS.md updates land alongside this SUMMARY.md.

## Files Created/Modified

- `tsup.config.ts` — Dual ESM/CJS build config; `dts: true`, `clean: true`, `sourcemap: true`, `target: "es2022"`, `platform: "node"`, `treeshake: true`, `splitting: false`, `minify: false`, custom `outExtension` (esm -> .mjs, cjs -> .cjs), `tsconfig: "./tsconfig.build.json"`.
- `scripts/verify-exports.mjs` — ESM smoke: `import { VERSION } from "@cosyte/x12"`; asserts `typeof VERSION === "string"`; prints `ESM OK: VERSION=<value>` and exits 0.
- `scripts/verify-exports.cjs` — CJS smoke: `const { VERSION } = require("@cosyte/x12")`; asserts `typeof VERSION === "string"`; prints `CJS OK: VERSION=<value>` and exits 0.
- `package.json` — Added: `main`, `module`, `types`, `exports`, `dependencies: {}` (re-added; pnpm install dropped it), `scripts.clean`, `scripts.prebuild`, `scripts.build`, `scripts.verify:exports`; added devDependencies `tsup ^8.5.1`, `typescript 5.9.3`, `@types/node 20.19.41`.

## Final `package.json` exports block (verbatim)

```jsonc
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./package.json": "./package.json"
  }
}
```

Verified: `Object.keys(exports["."]).join(' < ')` returns `types < import < require` (correct order; Node + bundler resolution rule).

## Final `tsup.config.ts` (verbatim)

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  platform: "node",
  treeshake: true,
  splitting: false,
  minify: false,
  outExtension: ({ format }) => ({ js: format === "esm" ? ".mjs" : ".cjs" }),
  tsconfig: "./tsconfig.build.json",
});
```

## Verification Smoke — exact commands and output

```
$ pnpm run build
> @cosyte/x12@0.0.0 build /home/schatz/x12
> tsup
…
ESM dist/index.mjs     129.00 B
CJS dist/index.cjs     151.00 B
DTS dist/index.d.ts  213.00 B
DTS dist/index.d.cts 213.00 B
(exit 0)

$ pnpm run verify:exports
ESM OK: VERSION=0.0.0
CJS OK: VERSION=0.0.0
(exit 0)

$ node -e "import('@cosyte/x12').then(m => console.log(m.VERSION))"
0.0.0

$ node -e "console.log(require('@cosyte/x12').VERSION)"
0.0.0

$ grep -c '@example' dist/index.d.ts
1
```

## Resolution approach: A (Node self-reference) — chosen

The plan offered Approach A (self-reference via package name) vs Approach B (relative `./dist/*` path). **Approach A used.** Node v24.15.0 on this machine resolves `import { VERSION } from "@cosyte/x12"` and `require("@cosyte/x12")` from inside the package root without flags as long as `name` and `exports` are set in `package.json` (Node 14+ behavior). No fallback to Approach B was needed; both `.mjs` and `.cjs` smokes exit 0 on the first try.

The CI matrix in Plan 04 covers Node 18 / 20 / 22 — all three support self-reference. If a future Node version regresses, swapping to Approach B (relative path) is a one-line edit per smoke script.

## Sample `dist/index.d.ts` (proves SETUP-04 gate)

```typescript
/**
 * Package version sentinel. Real exports land in Phase 2+.
 *
 * @example
 * import { VERSION } from "@cosyte/x12";
 * console.log(VERSION); // "0.0.0"
 */
declare const VERSION: string;

export { VERSION };
```

`@example` tag and full JSDoc preserved verbatim from `src/index.ts`. The downstream lint rule (Plan 03) and Nyquist coverage gate (Phase 8) will enforce this pattern for every public symbol added in Phases 2+.

## Sibling-Parity Status

`../hl7-parser` was again **not reachable** on this machine (checked `../hl7-parser/tsup.config.ts` and `../hl7-parser/package.json` — both missing). Per the plan's `<sibling_parity_note>`, all tooling choices fell back to the documented conventions in `<action>` and `<interfaces>` blocks:

- tsup options chosen: `format: ["esm", "cjs"]`, `dts: true`, `clean: true`, `sourcemap: true`, `target: "es2022"`, `platform: "node"`, `treeshake: true`, `splitting: false`, `minify: false`, custom `outExtension` for `.mjs`/`.cjs`, `tsconfig: "./tsconfig.build.json"` — all from the plan's `<interfaces>` block plus the additional Node/library defaults documented in the Task 1 `<action>` notes.
- exports map shape: copied verbatim from the plan's `<interfaces>` block (matches the canonical "types first" pattern recommended by Node docs and the TypeScript team).
- Version pins: `tsup ^8.5.1` (latest stable major as of 2026-05-14), `typescript 5.9.3` (latest 5.x stable; plan fallback `^5.6.0`), `@types/node 20.19.41` (plan-specified ^20 for Node 18+ LTS target).

If a later plan finds the sibling and discovers material divergence (e.g., different `treeshake` setting, different `dts.resolve`, additional exports subpaths), the values here can be amended without disturbing the existing artifact contract.

## Decisions Made

- **TypeScript pinned to 5.9.3, not the registry's `latest` (6.0.3).** Plan fallback says `^5.6.0`. Honoring the literal fallback avoids any 6.x strict-flag drift in a v0.0.0 scaffold; if a future plan wants TS 6, it can bump explicitly and verify the `tsconfig.json` strict flags still load cleanly.
- **`@types/node` pinned to ^20, not 25.x.** Plan says `^18` or `^20`. v20 type definitions cover the Node 18/20/22 CI matrix without leaking v23+/v24+/v25+ API surface into the type system; for a Node-18-engines library this is the correct conservative choice.
- **Empty `dependencies: {}` re-added to package.json.** `pnpm install` had silently dropped the `"dependencies": {}` key when adding devDeps. Re-adding it keeps SETUP-03 (zero runtime deps) explicit in the file rather than implicit via "key absent". Mirrors the Plan 01-01 convention.
- **Approach A (self-reference) used for verify-exports.** Worked on the first run on Node v24; no fallback needed. Documented as a one-line revert path for any future Node regression.
- **`tsup` emits `dist/index.d.cts` automatically.** Kept as-is. Acceptance criteria only require `dist/index.d.ts`; the extra `.d.cts` is harmless and is what TypeScript-strict CJS consumers (with `moduleResolution: "node16"` / `"nodenext"`) prefer. The `exports.types` condition points at `.d.ts` for both consumers, so behavior is uniform.
- **Node-based JSON assertions substituted for `jq -e`** (jq still not installed). Same finding as Plan 01-01; CI in Plan 04 should install jq or rewrite the verify blocks to use Node.

## Deviations from Plan

None - plan executed exactly as written.

(All decisions above are explicit fallbacks the plan itself authorized: sibling-parity note allows documented fallbacks when the sibling is unreachable; Task 1 `<action>` explicitly lists both the preferred pin and a fallback pin; Task 2 `<action>` explicitly describes both Approach A and Approach B as acceptable. No deviation-rule auto-fixes were needed; no Rule 1-4 triggers fired during execution.)

## Issues Encountered

- **TypeScript 6.0.3 was the initial pull from `pnpm add -D typescript`** because npm's `latest` tag is now 6.0.3. Re-pinned to `^5.6.0` (resolved 5.9.3) to honor the plan's literal fallback. No build-time regression; the dts emission and JSDoc preservation behave identically across 5.9.x and 6.0.x.
- **`@types/node 25.7.0` initially installed** for the same reason. Re-pinned to `^20` (resolved 20.19.41) to align with the Node 18+ LTS engine contract.
- **`jq` still not installed** on this machine; Node-based JSON assertions used in lieu (consistent with Plan 01-01's resolution). Flagging again for Plan 04 CI install.

## Authentication Gates

None — no external services touched.

## Known Stubs

- `src/index.ts` still exports only `VERSION = "0.0.0"` with JSDoc — intentional per CONTEXT.md decision 4 ("No source code yet"). Phase 2+ writes the real library.
- `scripts.prepare` is still a placeholder echo — Plans 02 (this plan) and 03 wire real `build`/`typecheck`/`lint`/`format`/`test` scripts. This plan added `build`, `clean`, `prebuild`, `verify:exports`; `typecheck`/`lint`/`format`/`test` land in Plan 03.
- `pnpm-lock.yaml` remains **untracked** (now ~360 KB after tsup/typescript/@types/node + transitive deps materialized). Commit deferred to Plan 04 per CONTEXT.md decision 6.

No stubs prevent the plan's goal (dual build + exports resolution) — verified at runtime.

## Threat Flags

No new security-relevant surface introduced. tsup, typescript, and @types/node are well-established devDependencies from reputable maintainers (vercel/tsup, microsoft/typescript, DefinitelyTyped). Supply-chain mitigation (T-01-04) is in progress: versions are now pinned in `package.json`; lockfile commit lands in Plan 04 to freeze transitive deps. Exports-map mitigation (T-01-05) is fully verified by the runtime smoke (`pnpm verify:exports`).

## Next Phase Readiness

- ✅ Plan 01-03 (lint + test wiring: ESLint flat config + Prettier + Vitest) can begin: build artifact contract is locked; `dist/` is reproducibly emitted; types are emitted; tsconfig.build.json is the established build-time TS reference.
- ✅ Plan 01-04 (CI + smoke) has a working smoke script to invoke (`pnpm run verify:exports`) and a working build to gate on (`pnpm run build`).
- ⚠️ `pnpm-lock.yaml` still untracked. Plan 04 commits it.
- ⚠️ `jq` still required by some `<verify>` blocks but absent locally. Plan 04 CI workflow should install `jq` step or the verify blocks should be rewritten Node-side.

## Self-Check: PASSED

Verified before declaring complete:

- `tsup.config.ts` — FOUND (commit `761c7bc`)
- `package.json` (with `main`/`module`/`types`/`exports` + `build`/`verify:exports` scripts) — FOUND (commit `761c7bc` + `d7a9ae9`)
- `scripts/verify-exports.mjs` — FOUND (commit `d7a9ae9`)
- `scripts/verify-exports.cjs` — FOUND (commit `d7a9ae9`)
- `dist/index.mjs` — FOUND (post-`pnpm build`; not committed, gitignored)
- `dist/index.cjs` — FOUND (post-`pnpm build`; not committed, gitignored)
- `dist/index.d.ts` — FOUND (post-`pnpm build`; not committed, gitignored)
- `dist/index.d.ts` contains `@example` — FOUND (1 occurrence)
- Commit `761c7bc` — FOUND in `git log`
- Commit `d7a9ae9` — FOUND in `git log`
- `pnpm run build` — exit 0
- `pnpm run verify:exports` — exit 0; printed `ESM OK: VERSION=0.0.0` + `CJS OK: VERSION=0.0.0`
- `node -e "import('@cosyte/x12').then(m => console.log(m.VERSION))"` — exit 0; printed `0.0.0`
- `node -e "console.log(require('@cosyte/x12').VERSION)"` — exit 0; printed `0.0.0`
- exports map condition order `types < import < require` — verified

---
*Phase: 01-project-foundation*
*Completed: 2026-05-14*

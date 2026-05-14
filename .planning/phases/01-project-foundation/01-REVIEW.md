---
phase: 01-project-foundation
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - .github/workflows/ci.yml
  - .npmrc
  - .prettierignore
  - .prettierrc.json
  - eslint.config.js
  - package.json
  - scripts/verify-exports.cjs
  - scripts/verify-exports.mjs
  - src/index.ts
  - test/fixtures/missing-example.ts
  - test/sanity.test.ts
  - tsconfig.build.json
  - tsconfig.json
  - tsup.config.ts
  - vitest.config.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-05-13
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 1 scaffolds the `@cosyte/x12` repo without any library source code. The
foundation is solid overall: strict TS flags (`strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `verbatimModuleSyntax`) are present; ESLint flat
config correctly scopes type-checked rules to `**/*.ts` and gates JSDoc/@example
on public exports; the CI workflow uses least-privilege `contents: read`,
concurrency cancellation, a Node 18/20/22 matrix, and `--frozen-lockfile`;
runtime dependencies are zero as locked in CLAUDE.md.

The defects worth flagging cluster in two areas:

1. **Dual-package types resolution.** `tsup` emits both `dist/index.d.ts` and
   `dist/index.d.cts`, but `package.json#exports` only points the `types`
   condition at the ESM-flavored declaration file. CJS consumers under
   `moduleResolution: "node16"` / `"nodenext"` will read ESM-shaped types —
   this is the classic "types masquerading as ESM" issue that
   `@arethetypeswrong/cli` flags. Currently harmless because the only export
   is a string literal, but the contract will silently mis-resolve as soon as
   real exports land in Phase 2+.
2. **Node 18 compatibility of the ESLint config.** `eslint.config.js` uses
   `import.meta.dirname`, which was added in Node 20.11. On Node 18 (one of
   the three matrix targets), the value is `undefined` and typescript-eslint
   falls back to `process.cwd()`. CI happens to run from the repo root so it
   accidentally works, but the contract is broken and the failure mode if a
   developer runs lint from a subdirectory on Node 18 is non-obvious.

The remaining items are documentation/hygiene nits.

No `console.*` calls in `src/` (the only match is inside a JSDoc `@example`
block, which is intended). No `any`, no hardcoded secrets, no command-injection
or path-traversal patterns. CI permissions are minimal and there is no secrets
handling at all in v1, which is correct.

## Warnings

### WR-01: `exports` map does not point CJS consumers at `.d.cts` types

**File:** `package.json:35-42`

**Issue:** `tsup` emits both `dist/index.d.ts` (for ESM) and `dist/index.d.cts`
(for CJS) — they are identical today but they are structurally distinct under
`module: "NodeNext"`. The exports map exposes only a single, ESM-flavored
`types` field:

```json
".": {
  "types": "./dist/index.d.ts",
  "import": "./dist/index.mjs",
  "require": "./dist/index.cjs"
}
```

A downstream package with `"type": "commonjs"` and
`moduleResolution: "node16"|"nodenext"` will resolve the `require` condition
to `index.cjs` (correct) but the `types` condition to `index.d.ts`, which
TypeScript treats as ESM. This is the "Masquerading as ESM" problem reported
by `@arethetypeswrong/cli`. The Phase 1 export is a `string` constant so the
defect is invisible today, but the contract is already wrong and will leak
into real exports starting Phase 2.

**Fix:**
```json
".": {
  "import": {
    "types": "./dist/index.d.ts",
    "default": "./dist/index.mjs"
  },
  "require": {
    "types": "./dist/index.d.cts",
    "default": "./dist/index.cjs"
  }
},
"./package.json": "./package.json"
```

Keep `"types": "./dist/index.d.ts"` at the top level of `package.json` as a
legacy fallback for older resolvers if desired.

### WR-02: `eslint.config.js` uses `import.meta.dirname`, which is undefined on Node 18

**File:** `eslint.config.js:39`

**Issue:** `tsconfigRootDir: import.meta.dirname` relies on a property that
was only added in Node 20.11 / 21.2. On the Node 18 matrix leg the expression
evaluates to `undefined` and typescript-eslint silently falls back to
`process.cwd()`. CI happens to run from the repo root so lint passes, but
this contract is fragile: anyone running `pnpm exec eslint src/index.ts` from
a subdirectory on Node 18 will get unhelpful "file is not part of the
project" errors. CLAUDE.md commits the project to Node 18+ support, so this
needs a polyfill.

**Fix:**
```js
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ...
parserOptions: {
  projectService: true,
  tsconfigRootDir: __dirname,
},
```

This works on all Node versions >= 14.

### WR-03: Third-party `pnpm/action-setup@v4` is pinned only to a moving tag

**File:** `.github/workflows/ci.yml:29`

**Issue:** The first-party actions (`actions/checkout@v4`, `actions/setup-node@v4`)
are major-tagged, which is industry-standard for GitHub-owned actions. The
third-party `pnpm/action-setup@v4` carries higher supply-chain risk because
the `v4` tag is mutable and pnpm's release process is outside GitHub's trust
boundary. A compromised maintainer account could re-point `v4` at malicious
code that runs with the workflow's repo permissions. Today permissions are
`contents: read` so blast radius is small, but the moment any future job
needs `id-token: write` (npm publish via OIDC) or `contents: write`
(release-please, changelog bumps), this becomes a supply-chain hole.

**Fix:** Pin to a commit SHA and let Dependabot bump it:
```yaml
- name: Install pnpm
  uses: pnpm/action-setup@a3252b78c470c02df07e9d59298aecedc3ccdd6d  # v4.0.0
  with:
    run_install: false
```

Optional but recommended: add `.github/dependabot.yml` with a
`github-actions` ecosystem entry so SHA pins stay current.

### WR-04: `package.json#files` references a CHANGELOG.md that does not exist

**File:** `package.json:43-48`

**Issue:** The `files` array includes `"CHANGELOG.md"` but the repo has no
`CHANGELOG.md`. `npm pack` / `npm publish` will emit a warning
("npm warn pack ... not found") for every publish, and the entry has no
effect today. Either commit a placeholder so the file exists before Phase 8
(release), or drop it from `files` until the release workflow is wired in
later phases.

**Fix:** Add an empty placeholder now:

```bash
printf '# Changelog\n\nAll notable changes will be documented here.\n' > CHANGELOG.md
```

Or remove the entry from `files`:
```json
"files": ["dist", "README.md", "LICENSE"],
```

## Info

### IN-01: `prebuild` and `tsup.clean` both wipe `dist/`

**File:** `package.json:51-52`, `tsup.config.ts:7`

**Issue:** `"prebuild": "pnpm run clean"` removes `dist/`, then `tsup` runs
with `clean: true` and removes it again. Harmless duplication. Pick one —
`clean: true` in `tsup.config.ts` is sufficient and keeps the build
self-contained.

**Fix:** Drop the `prebuild` script (or drop `clean: true` from
`tsup.config.ts`).

### IN-02: `auto-install-peers` and `strict-peer-dependencies` in `.npmrc` are pnpm-only

**File:** `.npmrc:2-3`

**Issue:** Running any `npm` command in the repo prints:
```
npm warn Unknown project config "auto-install-peers". ...
npm warn Unknown project config "strict-peer-dependencies". ...
```
These keys are pnpm-specific. The warnings are cosmetic — `engine-strict` is
honored by both — but they show up every time a contributor uses `npx`,
`npm view`, etc. Optional cleanup.

**Fix:** Move the pnpm-only keys to `.pnpmrc` if a stricter separation is
desired, or accept the warnings.

### IN-03: `scripts/verify-exports.{mjs,cjs}` use brittle error messages

**File:** `scripts/verify-exports.mjs:5-8`, `scripts/verify-exports.cjs:4-7`

**Issue:** If `dist/` is missing (e.g., a developer runs `pnpm verify:exports`
without running `pnpm build` first), the scripts crash with an
`ERR_MODULE_NOT_FOUND` / `Cannot find module '@cosyte/x12'` stack trace, which
points at the script line rather than telling the developer to run `pnpm
build`. The CI workflow always builds first, so this is purely a DX issue.

**Fix:** Wrap the import in a try/catch (CJS) or top-level await with a
descriptive error:

```js
// verify-exports.cjs
let mod;
try {
  mod = require("@cosyte/x12");
} catch (err) {
  console.error(
    `CJS resolution failed (have you run 'pnpm build'?): ${err.message}`,
  );
  process.exit(1);
}
const { VERSION } = mod;
```

### IN-04: Node 18 is end-of-life as of April 2025

**File:** `.github/workflows/ci.yml:23`, `package.json:27-29`

**Issue:** Node 18 reached end-of-life on 2025-04-30. CLAUDE.md commits the
project to Node 18+, but supporting an EOL runtime perpetually has a cost
(see WR-02 for one concrete example). Worth a roadmap conversation before
v1.0 ships: drop Node 18 and raise the engines floor to `>=20`.

**Fix:** Defer — this is a v1-scope decision, not a Phase 1 defect. Flag for
discussion at Phase 8 release time.

### IN-05: `tsconfig.json` `include` covers `test/**/*` but `tsconfig.build.json` does not

**File:** `tsconfig.json:26`, `tsconfig.build.json:6-7`

**Issue:** `tsconfig.json` includes `test/**/*` so the typecheck step covers
test files (good — catches type errors in tests). `tsconfig.build.json`
correctly excludes them via `exclude: ["**/*.test.ts", ...]`. This is fine
today, but the build tsconfig also extends the root `verbatimModuleSyntax:
true` setting and only includes `src/**/*`. If a future contributor adds a
helper in `test/` that the build tsconfig accidentally picks up, the dual
declaration could produce confusing dts output. No action needed now — just
keep an eye on this when the second build entrypoint lands.

**Fix:** None today. Re-evaluate when adding additional `tsup` entries in
Phase 2+.

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

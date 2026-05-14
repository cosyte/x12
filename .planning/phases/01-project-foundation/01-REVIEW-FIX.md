---
phase: 01-project-foundation
fixed_at: 2026-05-13T00:00:00Z
review_path: .planning/phases/01-project-foundation/01-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-05-13
**Source review:** `.planning/phases/01-project-foundation/01-REVIEW.md`
**Iteration:** 1

**Summary:**

- Findings in scope: 4 (all WR-* warnings; 5 IN-* info findings excluded per
  default `fix_scope = warnings_and_critical`)
- Fixed: 4
- Skipped: 0
- All 4 fixes verified by re-reading the modified file AND by re-running the
  relevant inner-loop step (build / lint / `verify:exports`).
- Full inner-loop chain (`pnpm typecheck && pnpm lint && pnpm format:check &&
  pnpm test && pnpm build && pnpm run verify:exports`) is green after all
  fixes — no regressions introduced.

## Fixed Issues

### WR-01: `exports` map does not point CJS consumers at `.d.cts` types

**Files modified:** `package.json`
**Commit:** `cfbc58f`
**Applied fix:** Rewrote the `"."` entry in `package.json#exports` from the
flat shape `{ types, import, require }` to the nested per-condition shape
`{ import: { types, default }, require: { types, default } }`. The `require`
branch now routes `types` to `./dist/index.d.cts` (which `tsup` already
emits), so CJS consumers under `moduleResolution: "node16"`/`"nodenext"` will
no longer read ESM-flavored declarations. The top-level `"types":
"./dist/index.d.ts"` legacy fallback is preserved for older resolvers, as the
review suggested.

**Verification:**

- `node -e "JSON.parse(...)"` confirms `package.json` is still valid JSON.
- `pnpm build` emits both `dist/index.d.ts` (212 B) and `dist/index.d.cts`
  (212 B) — no `tsup.config.ts` change was needed; dual-`.dts` emission is
  already the default when `dts: true` is set alongside both `esm` and `cjs`
  formats.
- `pnpm run verify:exports` still exits 0 ("ESM OK: VERSION=0.0.0" / "CJS OK:
  VERSION=0.0.0") — both resolution paths continue to work end-to-end.

### WR-02: `eslint.config.js` uses `import.meta.dirname`, undefined on Node 18

**Files modified:** `eslint.config.js`
**Commit:** `d145dff`
**Applied fix:** Added `import { fileURLToPath } from "node:url"` and
`import { dirname } from "node:path"` at the top of the file, computed
`const __dirname = dirname(fileURLToPath(import.meta.url))`, and replaced
`tsconfigRootDir: import.meta.dirname` with `tsconfigRootDir: __dirname`.
This is the portable spelling that works on every Node >= 14 (not just Node
20.11+), so the contract now actually matches `package.json#engines` (`>=18`)
and the Node-18 CI matrix leg is no longer accidentally falling back to
`process.cwd()`. Added an inline comment explaining the motivation.

**Verification:**

- `node --check eslint.config.js` passes (syntax OK).
- `pnpm lint` exits 0 with no errors — typescript-eslint successfully resolves
  the project from the computed `__dirname` on this run.

### WR-03: `pnpm/action-setup@v4` pinned only to a moving tag

**Files modified:** `.github/workflows/ci.yml`, `.github/dependabot.yml` (new)
**Commit:** `593b1ef`
**Applied fix:** Replaced `pnpm/action-setup@v4` with the SHA pin
`pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1 # v4`. The SHA
was resolved via `gh api repos/pnpm/action-setup/git/refs/tags/v4` →
dereference the annotated tag object → commit
`b906affcce14559ad1aafd4ab0e942779e9f58b1` (current target of the mutable
`v4` tag at the time of fix). Added an inline comment explaining the
supply-chain motivation. Also created `.github/dependabot.yml` with a
`github-actions` ecosystem entry on a weekly schedule so the SHA pin (and
any other future action SHAs) stays current automatically — this is the
standard companion to SHA-pinning and avoids the maintenance burden of a
manually-managed pin going stale.

**Verification:**

- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'));
  yaml.safe_load(open('.github/dependabot.yml'))"` parses both files
  successfully — no YAML syntax errors.
- The pin format `pnpm/action-setup@<full-40-char-sha> # v4` is the canonical
  shape Dependabot and the GitHub Actions schema recognize, so future
  Dependabot bumps will update both the SHA and the trailing comment.

### WR-04: `package.json#files` references a CHANGELOG.md that doesn't exist

**Files modified:** `CHANGELOG.md` (new)
**Commit:** `c9a7491`
**Applied fix:** Created a minimal `CHANGELOG.md` at the repo root in
Keep-a-Changelog 1.1.0 format with an `[Unreleased]` section that lists the
Phase 1 scaffolding work. This is the cheaper of the two suggested fixes —
DOC-14 will require a real changelog at Phase 8 anyway, so dropping
`CHANGELOG.md` from `package.json#files` only to re-add it later would be
churn for no benefit. `npm pack` / `npm publish` will no longer warn that
the file is missing, and the placeholder is structured so Phase 8 can append
real release entries above the `[Unreleased]` section without restructuring.

**Verification:**

- `node -e "JSON.parse(...)"` confirms `package.json` is unchanged and still
  valid (this fix did not touch `package.json` — it just created the file
  the existing `files` entry already pointed at).
- `ls -la CHANGELOG.md` confirms the file exists (631 bytes).

## Skipped Issues

None — all 4 in-scope warnings were fixed successfully.

The 5 IN-* info findings (IN-01 prebuild/clean duplication, IN-02 .npmrc
pnpm-only keys, IN-03 verify-exports error messages, IN-04 Node 18 EOL,
IN-05 build tsconfig include divergence) are outside the default fix scope
(`warnings_and_critical`) and were not attempted. They remain documented in
`01-REVIEW.md` for future consideration.

---

_Fixed: 2026-05-13_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_

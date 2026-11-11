#!/usr/bin/env tsx
/**
 * `pnpm check:version-bump` - rehearse a release's version step and hold its result to
 * `check:docs-reference`.
 *
 * Why this exists: the release pipeline runs this package's `version` script on a "Version
 * Packages" pull request, and that pull request must pass the same checks as any other. The
 * generated API reference in `docs-content/api/` renders the `VERSION` constant with its value,
 * so a version step that bumps `VERSION` without regenerating the reference leaves the page one
 * release behind, and `check:docs-reference` fails on the release pull request with every
 * changeset stuck behind it. The `version` script now regenerates the reference; this check
 * proves it does, end to end, on every pull request, instead of on the next release.
 *
 * It copies the tracked files of the working tree into a temporary directory, links
 * `node_modules` in, writes one synthetic patch changeset, runs the real `version` script there,
 * then runs `check:docs-reference` there. Nothing in the checkout is written: the bump, the
 * consumed changesets and the regenerated pages live and die in the temporary copy.
 *
 * Exit codes: 0 (the bumped tree passes the reference check), 1 (a step failed; its output is
 * printed).
 *
 *     tsx scripts/check-version-bump.ts
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The synthetic changeset the rehearsal releases. A patch, the only bump this repo ships. */
const REHEARSAL_CHANGESET =
  '---\n"@cosyte/x12": patch\n---\n\nA synthetic patch that rehearses the version step.\n';

/** Run one command in `cwd` with array arguments, failing the check with its output. */
function run(command: string, args: readonly string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 300_000 });
  if (result.status !== 0) {
    console.error(`check-version-bump: ${command} ${args.join(" ")} failed`);
    console.error(`${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}`);
    throw new Error("rehearsal step failed");
  }
}

/** The tracked files of the working tree, as repo-relative paths, skipping deleted ones. */
function trackedFiles(): string[] {
  const result = spawnSync("git", ["ls-files", "-z"], { cwd: REPO_ROOT, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
  return result.stdout
    .split("\0")
    .filter((path) => path !== "" && existsSync(join(REPO_ROOT, path)));
}

function main(): number {
  const dir = mkdtempSync(join(tmpdir(), "x12-version-bump-"));
  try {
    for (const path of trackedFiles()) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      cpSync(join(REPO_ROOT, path), join(dir, path));
    }
    symlinkSync(join(REPO_ROOT, "node_modules"), join(dir, "node_modules"), "dir");
    writeFileSync(join(dir, ".changeset", "version-bump-rehearsal.md"), REHEARSAL_CHANGESET);
    const before = (
      JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version: string }
    ).version;

    run("pnpm", ["run", "version"], dir);
    const after = (
      JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version: string }
    ).version;
    if (after === before) {
      console.error(`check-version-bump: the version step left the version at ${before}`);
      return 1;
    }
    run("pnpm", ["check:docs-reference"], dir);
    console.log(`check-version-bump: ${before} -> ${after} leaves docs-content/api current`);
    return 0;
  } catch {
    return 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

process.exit(main());

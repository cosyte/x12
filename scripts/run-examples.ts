/**
 * Runs every example under `examples/` and exits non-zero if any of them fails.
 *
 * Each `examples/*.ts` file (depth 1: `examples/data/` holds their inputs, and a name starting with
 * `_` is skipped) imports the package by its published name, `@cosyte/x12`, which Node resolves
 * through this package's own `exports` to the BUILT files in `dist/`. So the examples exercise what
 * a consumer installs, and `pnpm build` has to run first.
 *
 * Each example asserts its own key output and exits non-zero on a mismatch. This runner only
 * aggregates: it reports every example, prints the output of any that failed, and refuses to pass
 * when it found nothing to run, because a runner that ran nothing proves nothing.
 *
 * File names are passed to `spawnSync` as argv, never through a shell.
 *
 *     pnpm build && pnpm examples
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXAMPLES_DIR = join(REPO_ROOT, "examples");
/** What `exports["."].import` in package.json points at. */
const BUILT_ENTRY = join(REPO_ROOT, "dist", "index.mjs");

if (!existsSync(BUILT_ENTRY)) {
  console.error("dist/index.mjs is missing: run `pnpm build` before `pnpm examples`.");
  process.exit(1);
}

const examples = readdirSync(EXAMPLES_DIR, { withFileTypes: true })
  .filter((d) => d.isFile() && d.name.endsWith(".ts") && !d.name.startsWith("_"))
  .map((d) => d.name)
  .sort();

if (examples.length === 0) {
  console.error("No examples found under examples/: refusing to report a pass.");
  process.exit(1);
}

let failed = 0;
for (const file of examples) {
  const run = spawnSync(process.execPath, ["--import", "tsx", join("examples", file)], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (run.status === 0) {
    console.log(`ok    ${file}`);
    continue;
  }
  failed += 1;
  console.error(`FAIL  ${file} (exit ${String(run.status ?? run.signal)})`);
  console.error(run.stdout);
  console.error(run.stderr);
}

console.log(`${String(examples.length - failed)} of ${String(examples.length)} examples passed`);
process.exit(failed === 0 ? 0 : 1);

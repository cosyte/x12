/**
 * The cold import gate: how long a fresh Node.js process takes to import the built package, held
 * to a budget.
 *
 *   pnpm build && pnpm check:cold-import
 *
 * Each run starts a new `node` process that times `await import()` of `dist/index.mjs` with
 * `performance.now()`, the same reading `pnpm bench:reading` reports as the cold import. Runs of
 * an empty module are interleaved with them, so a slow machine shows up as a slow empty import
 * rather than as a mystery. The gate fails when the median of the package's runs is over the
 * budget. CI runs it on a GitHub-hosted runner after the build; on a loaded developer machine the
 * reading is context, not a verdict.
 *
 * Plain JavaScript run by plain `node`, so nothing but Node.js itself sits between the clock and
 * the import.
 */

import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** The most a cold import of the package may take, in milliseconds: the median of the runs. */
export const BUDGET_MS = 15;

/** Fresh processes per module, as many as `@cosyte/bench` takes for its reading. */
export const RUNS = 20;

/**
 * The child program: `@cosyte/bench`'s own importer, which sits beside its entry point. Using it
 * rather than a copy keeps this gate's number the number `pnpm bench:reading` reports: what the
 * child loads before its clock starts moves an empty import by milliseconds.
 */
const CHILD = fileURLToPath(new URL("./import-entry.mjs", import.meta.resolve("@cosyte/bench")));

/** One cold import of `file` in a new process, in milliseconds. */
function oneImport(file, dir) {
  const env = { ...process.env };
  // A loader in NODE_OPTIONS (tsx, a coverage hook) would be timed with the import.
  delete env.NODE_OPTIONS;
  const out = path.join(dir, "reading.json");
  rmSync(out, { force: true });
  execFileSync(process.execPath, [CHILD, "time", file, out], { env, stdio: "inherit" });
  const { ms } = JSON.parse(readFileSync(out, "utf8"));
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    throw new Error(`cold import: no reading from ${file}`);
  }
  return ms;
}

/** The median of a non-empty list of numbers. */
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Read `target` and an empty module `runs` times each, interleaved. */
export function readColdImport(target, runs = RUNS) {
  const dir = mkdtempSync(path.join(tmpdir(), "x12-cold-import-"));
  try {
    const empty = path.join(dir, "empty.mjs");
    writeFileSync(empty, "export {};\n");
    const cold = [];
    const bare = [];
    for (let i = 0; i < runs; i++) {
      const order = i % 2 === 0 ? [target, empty] : [empty, target];
      for (const file of order) (file === target ? cold : bare).push(oneImport(file, dir));
    }
    return { medianMs: median(cold), emptyMedianMs: median(bare), runs };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Run the gate; returns the exit code. */
function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const target = path.join(root, "dist", "index.mjs");
  if (!existsSync(target)) {
    process.stderr.write("check:cold-import: dist/index.mjs is missing; run pnpm build first\n");
    return 2;
  }
  const { medianMs, emptyMedianMs, runs } = readColdImport(target);
  const over = medianMs > BUDGET_MS;
  const line =
    `cold import of dist/index.mjs: median ${medianMs.toFixed(2)} ms over ${String(runs)} runs ` +
    `(an empty module: ${emptyMedianMs.toFixed(2)} ms); budget ${String(BUDGET_MS)} ms: ` +
    `${over ? "over" : "within"}`;
  process.stdout.write(`${line}\n`);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary !== undefined && summary !== "") appendFileSync(summary, `${line}\n`);
  return over ? 1 : 0;
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main();
}

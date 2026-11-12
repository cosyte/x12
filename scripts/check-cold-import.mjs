/**
 * The cold import gate: how long a fresh Node.js process takes to import each built entry point,
 * held to a budget per entry point.
 *
 *   pnpm build && pnpm check:cold-import
 *   pnpm check:cold-import --measure --base <base checkout>/dist/index.mjs
 *
 * Each run starts a new `node` process that times `await import()` of one built file with
 * `performance.now()`, the same reading `pnpm bench:reading` reports as the cold import. The
 * package's two entry points, `dist/index.mjs` (`@cosyte/x12`) and `dist/parse.mjs`
 * (`@cosyte/x12/parse`), and an empty module take turns, so a slow machine shows up as a slow empty
 * import rather than as a mystery. The gate fails when the median of an entry point's runs is over
 * its budget. CI runs it on a GitHub-hosted runner after the build; on a loaded developer machine
 * the reading is context, not a verdict.
 *
 * `--measure` reads and prints without a verdict, and `--base` adds another build's main entry
 * point to the turns, so a base and a head are read side by side on one machine. Every line names
 * the machine's CPU: hosted runners of one label are not one machine.
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
import { cpus, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The most a cold import of each entry point may take, in milliseconds: the median of the runs.
 * Each is set from the slowest runner class CI's `ubuntu-latest` met over sixty hosted runners
 * (the AMD EPYC 7763, eighteen readings, each the median of twenty processes): the slowest of its
 * readings, 16.29 ms and 3.30 ms, with a quarter on top for the spread between machines, rounded
 * up to the half millisecond. `docs-content/performance.md` names the runs.
 */
export const BUDGETS_MS = { "dist/index.mjs": 20.5, "dist/parse.mjs": 4.5 };

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

/**
 * The order of one round: every target and the empty module, rotated by the round's number so no
 * file always runs first.
 */
export function roundOrder(files, round) {
  const shift = round % files.length;
  return [...files.slice(shift), ...files.slice(0, shift)];
}

/**
 * Read each of `targets` (label to file) and an empty module `runs` times each, interleaved.
 * Returns the median of each label, the empty module's under `empty`.
 */
export function readColdImports(targets, runs = RUNS) {
  const dir = mkdtempSync(path.join(tmpdir(), "x12-cold-import-"));
  try {
    const empty = path.join(dir, "empty.mjs");
    writeFileSync(empty, "export {};\n");
    const labels = [...Object.keys(targets), "empty"];
    const files = { ...targets, empty };
    const readings = Object.fromEntries(labels.map((label) => [label, []]));
    for (let i = 0; i < runs; i++) {
      for (const label of roundOrder(labels, i)) readings[label].push(oneImport(files[label], dir));
    }
    return Object.fromEntries(labels.map((label) => [label, median(readings[label])]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The verdict on `medians` against `budgets`: one line per budgeted entry point, and whether any is over. */
export function verdict(medians, budgets) {
  const lines = [];
  let over = false;
  for (const [label, budget] of Object.entries(budgets)) {
    const ms = medians[label];
    const late = ms > budget;
    over ||= late;
    lines.push(
      `${label}: median ${ms.toFixed(2)} ms, budget ${String(budget)} ms: ${late ? "over" : "within"}`,
    );
  }
  return { lines, over };
}

/** The arguments: `--measure` and `--base <file>`. */
export function parseArgs(argv) {
  const out = { measure: false, base: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--measure") out.measure = true;
    else if (arg === "--base" && argv[i + 1] !== undefined) out.base = argv[++i];
    else throw new Error(`check:cold-import: unknown argument ${String(arg)}`);
  }
  return out;
}

/** Run the gate; returns the exit code. */
function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const targets = {};
  for (const rel of Object.keys(BUDGETS_MS)) {
    const file = path.join(root, rel);
    if (!existsSync(file)) {
      process.stderr.write(`check:cold-import: ${rel} is missing; run pnpm build first\n`);
      return 2;
    }
    targets[rel] = file;
  }
  if (args.base !== undefined) targets["base dist/index.mjs"] = path.resolve(args.base);
  const medians = readColdImports(targets);
  const cpu = cpus()[0]?.model.trim() ?? "unknown";
  const lines = [
    `cold import, median of ${String(RUNS)} fresh processes each, node ${process.version}, ${cpu}`,
  ];
  for (const [label, ms] of Object.entries(medians)) {
    lines.push(`${label === "empty" ? "an empty module" : label}: ${ms.toFixed(2)} ms`);
  }
  const { lines: judged, over } = verdict(medians, BUDGETS_MS);
  if (!args.measure) lines.push(...judged);
  const text = `${lines.join("\n")}\n`;
  process.stdout.write(text);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary !== undefined && summary !== "") appendFileSync(summary, `\`\`\`\n${text}\`\`\`\n`);
  return !args.measure && over ? 1 : 0;
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = main();
}

#!/usr/bin/env tsx
/**
 * `pnpm run differential` - compare this library against an independent
 * open-source X12 reader over the 005010 transactions that reader maps, and
 * name the ones it does not.
 *
 * The oracle is named, with its exact version, by the `--oracle` argument
 * `package.json` passes in. Nothing here decides which oracle to use or which
 * version of it: that is one pin, in one place, obtained and invoked by
 * `scripts/differential/pyx12-oracle.ts`.
 *
 * The run writes `test/differential/report.json` and exits non-zero when the two
 * readers disagreed, when a compared transaction put no document or no element
 * position through both readers, or when the oracle could not be invoked at all.
 * In that last case nothing is written, because a report left standing after a
 * run that never reached the oracle records agreement nobody observed.
 *
 * THE CORPUS HOLDS A REAL DISAGREEMENT TODAY, so a faithful run of this command
 * exits 1 and writes a report that records it. The two readers split
 * `REF*EA*ID?*WITH?*STAR` differently, because this library reads `?` as a
 * release character in a transaction set body and the oracle does not, and
 * fixing that is out of this comparison's scope: what it owes is the record.
 * Read the exit status as the state of the world rather than as a broken
 * harness, and gate on the live run REPRODUCING the committed report, which is
 * what this repository's own CI does.
 *
 * SECURITY: every subprocess is array-form, no shell.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  INTERCHANGE_CONTROL_VERSION,
  OracleUnavailableError,
  runDifferential,
  type CorpusDocument,
  type LibraryProvenance,
} from "./differential/harness.js";
import { pyx12Oracle } from "./differential/pyx12-oracle.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS_ROOT = join(REPO_ROOT, "test", "fixtures");
const REPORT_PATH = join(REPO_ROOT, "test", "differential", "report.json");

/**
 * Every synthetic `.edi` document this repo already ships, in a stable order.
 *
 * The corpus is the whole fixture tree, and no directory is held out of it. What
 * a document IS, the harness reads from the document: the functional group
 * identifier in GS-08 and the transaction set identifier in ST-01 decide which
 * comparison its positions are counted under, and a document those identifiers
 * do not resolve to exactly one compared transaction is recorded as skipped
 * rather than dropped. A directory name is a filing convenience and decides
 * nothing here, so the two readers are compared over every document this
 * repository has, including the ones whose whole purpose is an awkward
 * syntactic core.
 *
 * That is not a detail of tidiness. The comparison is of how two readers frame
 * segments and split elements, which is a question about bytes and delimiters
 * rather than about whether a body is a plausible claim, and the documents most
 * likely to separate two readers are exactly the awkward ones.
 */
export function collectCorpus(root: string): CorpusDocument[] {
  const documents: CorpusDocument[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".edi")) {
        documents.push({
          id: relative(REPO_ROOT, full).split(sep).join("/"),
          text: readFileSync(full, "utf8"),
        });
      }
    }
  };

  if (existsSync(root)) walk(root);
  return documents;
}

function git(args: readonly string[]): string {
  // SECURITY: array-form execFileSync, no shell.
  return execFileSync("git", [...args], { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function provenance(): LibraryProvenance {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    name: string;
  };
  return {
    package: manifest.name,
    commit: git(["rev-parse", "HEAD"]),
    workingTreeDirty: git(["status", "--porcelain"]).length > 0,
  };
}

function requirementFrom(argv: readonly string[]): string {
  const at = argv.indexOf("--oracle");
  const value = at === -1 ? undefined : argv[at + 1];
  if (value === undefined || value === "") {
    throw new TypeError(
      'The oracle and its exact version are required: pass --oracle "<name>==<version>".',
    );
  }
  return value;
}

async function main(): Promise<number> {
  const requirement = requirementFrom(process.argv.slice(2));
  const oracle = pyx12Oracle(requirement, INTERCHANGE_CONTROL_VERSION);
  const corpus = collectCorpus(CORPUS_ROOT);

  let run;
  try {
    run = await runDifferential({ oracle, corpus, library: provenance() });
  } catch (error) {
    if (error instanceof OracleUnavailableError) {
      process.stderr.write(`${error.message}\n`);
      process.stderr.write("No report was written: this run never reached the oracle.\n");
      return 1;
    }
    throw error;
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(run.report, null, 2)}\n`, "utf8");

  const compared = run.report.compared.length;
  const uncovered = run.report.uncovered.length;
  const documents = run.report.compared.reduce((n, entry) => n + entry.documents, 0);
  const positions = run.report.compared.reduce((n, entry) => n + entry.elementPositions, 0);
  const divergences = run.report.compared.reduce((n, entry) => n + entry.divergences.length, 0);
  process.stdout.write(
    `${run.report.oracle.package} ${run.report.oracle.version} (${run.report.oracle.licence}): ` +
      `${String(compared)} transactions compared, ${String(uncovered)} not mapped, ` +
      `${String(documents)} documents, ${String(positions)} element positions, ` +
      `${String(divergences)} divergences, ${String(run.report.unevaluated.length)} unevaluated, ` +
      `${String(run.report.skipped.length)} skipped.\n`,
  );
  process.stdout.write(`Report: ${relative(REPO_ROOT, REPORT_PATH)}\n`);

  if (run.failures.length > 0) {
    for (const failure of run.failures) process.stderr.write(`${failure}\n`);
    // The report was written first and holds every reading verbatim. A
    // disagreement between two readers is the result this comparison exists to
    // publish, not a number to tune away, so the run that finds one reports it,
    // leaves it standing and exits non-zero. Regenerating the committed report
    // is this command, and this exit status is what it looks like while a
    // disagreement stands.
    process.stderr.write(
      `Exit status 1. ${String(divergences)} divergence(s) recorded in ` +
        `${relative(REPO_ROOT, REPORT_PATH)}, with both readings exactly as each reader ` +
        `returned them. The report was written before this status was chosen.\n`,
    );
    return 1;
  }
  return 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });

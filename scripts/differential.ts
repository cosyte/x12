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
 * The one fixture directory that is not a transaction corpus. Its documents
 * exist to exercise interchange framing, delimiter detection and the syntactic
 * core, and one of them carries a professional claim group identifier over a
 * body assembled from segments of several different transactions. Reading that
 * document as a professional claim would file an envelope finding against a
 * reader that never sees such a document, so this directory stays out and the
 * per-transaction corpora are what the comparison is over.
 */
const NOT_A_TRANSACTION_CORPUS = "envelope";

/** Every synthetic `.edi` document this repo already ships, in a stable order. */
export function collectCorpus(root: string): CorpusDocument[] {
  const documents: CorpusDocument[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== NOT_A_TRANSACTION_CORPUS) walk(full);
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
  process.stdout.write(
    `${run.report.oracle.package} ${run.report.oracle.version} (${run.report.oracle.licence}): ` +
      `${String(compared)} transactions compared, ${String(uncovered)} not mapped, ` +
      `${String(documents)} documents, ${String(positions)} element positions, ` +
      `${String(run.report.unevaluated.length)} unevaluated.\n`,
  );
  process.stdout.write(`Report: ${relative(REPO_ROOT, REPORT_PATH)}\n`);

  if (run.failures.length > 0) {
    for (const failure of run.failures) process.stderr.write(`${failure}\n`);
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

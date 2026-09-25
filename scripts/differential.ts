#!/usr/bin/env tsx
/**
 * `pnpm run differential` - compare this library against independent
 * open-source X12 readers over the 005010 transactions they map, and name the
 * ones none of them maps. `pnpm run differential:check` - run the same
 * comparison and report whether it reproduces the committed report.
 *
 * The oracles are named, each with its exact version, by the `--oracle`
 * arguments `package.json`'s `differential` script passes in, in precedence
 * order: a transaction is compared against the first oracle that maps it and
 * against no other. An oracle's `--with <name>==<version>` companion pins and
 * its `--python <major>.<minor>.<micro>` interpreter pin follow its own
 * `--oracle`. Nothing here decides which oracles to use or which versions of
 * them: that is one pin per oracle, in one place, obtained and invoked by the
 * driver named for it in `scripts/differential/`. `differential:check` passes
 * no `--oracle` of its own; it reads the arguments of the `differential`
 * script, so the check runs exactly the comparison that script runs and the
 * pins are never written a second time.
 *
 * EXIT STATUS. Each status means one thing, and neither command uses any other.
 *
 *   `pnpm run differential` writes `test/differential/report.json` and exits
 *     0  the comparison ran and recorded no failure: every compared transaction
 *        put at least one document and one element position through both
 *        readers, and the readers agreed at every position;
 *     1  the comparison did not end clean. Either the report was written and
 *        records a disagreement, or a compared transaction that put no document
 *        or no element position through both readers; or no report was written
 *        at all, because the arguments do not name the oracles and their pins,
 *        or an oracle could not be invoked, was not the version, companion set
 *        or interpreter it is pinned to, or is named by a requirement that
 *        leaves a version free. In that last case the existing report is left
 *        untouched, because a report written after a run that never reached the
 *        oracle records agreement nobody observed. Stderr names which, and the
 *        oracle.
 *
 *   `pnpm run differential:check` (`--check`) writes nothing and exits
 *     0  the live comparison reproduces the committed report exactly, the
 *        `library` provenance block set aside, divergences included;
 *     1  the committed report is not reproduced: the live report differs from
 *        it, the committed report is missing, or no live report could be
 *        produced because an oracle refused as above. Stderr says which.
 *
 * THE CORPUS HOLDS A REAL DISAGREEMENT TODAY, so a faithful run of
 * `pnpm run differential` exits 1 and writes a report that records it. This
 * library and pyx12 split `REF*EA*ID?*WITH?*STAR` differently, because this
 * library reads `?` as a release character in a transaction set body and pyx12
 * does not, and fixing that is out of this comparison's scope: what it owes is
 * the record. Read that exit status as the state of the world rather than as a
 * broken harness, and gate on the live run REPRODUCING the committed report,
 * which is what `differential:check` answers and what this repository's own CI
 * runs.
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
  type DifferentialOracle,
  type DifferentialReport,
  type DifferentialRun,
  type LibraryProvenance,
} from "./differential/harness.js";
import { LINUXFORHEALTH_PACKAGE, linuxforhealthOracle } from "./differential/linuxforhealth-oracle.js";
import {
  normaliseDistribution,
  OracleRequirementError,
  parseExactPin,
} from "./differential/oracle-process.js";
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
 * nothing here, so the readers are compared over every document this
 * repository has, including the ones whose whole purpose is an awkward
 * syntactic core.
 *
 * That is not a detail of tidiness. The comparison is of how readers frame
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

/** One `--oracle` and the `--with` / `--python` arguments that follow it. */
interface OracleArguments {
  readonly requirement: string;
  readonly companions: string[];
  python: string | null;
}

/** What the command line asks for. */
interface Invocation {
  readonly oracles: readonly OracleArguments[];
  readonly check: boolean;
}

function parseArguments(argv: readonly string[]): Invocation {
  const oracles: OracleArguments[] = [];
  let check = false;
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--check") {
      check = true;
      continue;
    }
    const value = argv[i + 1];
    if (flag !== "--oracle" && flag !== "--with" && flag !== "--python") {
      throw new TypeError(`Unknown argument "${String(flag)}".`);
    }
    if (value === undefined || value === "" || value.startsWith("--")) {
      throw new TypeError(`${flag} needs a value.`);
    }
    i += 1;
    if (flag === "--oracle") {
      oracles.push({ requirement: value, companions: [], python: null });
      continue;
    }
    const current = oracles[oracles.length - 1];
    if (current === undefined) {
      throw new TypeError(`${flag} ${value} must follow the --oracle it pins for.`);
    }
    if (flag === "--with") current.companions.push(value);
    else current.python = value;
  }
  if (oracles.length === 0 && check) {
    return { oracles: parseArguments(differentialScriptArguments()).oracles, check };
  }
  if (oracles.length === 0) {
    throw new TypeError(
      'The oracles and their exact versions are required: pass --oracle "<name>==<version>".',
    );
  }
  return { oracles, check };
}

/**
 * The arguments `package.json`'s `differential` script hands this file, which
 * is where the pins are written. The script is read as whitespace-separated
 * words and nothing else, so a script this cannot read that way is refused
 * rather than guessed at.
 */
function differentialScriptArguments(): string[] {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts?: Record<string, string>;
  };
  const script = manifest.scripts?.differential ?? "";
  const words = script.trim().split(/\s+/u);
  if (words[0] !== "tsx" || words[1] !== "scripts/differential.ts" || /["'`$\\|;&<>]/u.test(script)) {
    throw new TypeError(
      `package.json's differential script must be "tsx scripts/differential.ts" followed by plain ` +
        `--oracle, --with and --python arguments, got ${JSON.stringify(script)}.`,
    );
  }
  const rest = words.slice(2);
  if (rest.includes("--check")) {
    throw new TypeError("package.json's differential script must not pass --check itself.");
  }
  return rest;
}

/** Build the driver each `--oracle` names. Refuses a requirement that leaves anything free. */
function buildOracles(oracles: readonly OracleArguments[]): DifferentialOracle[] {
  return oracles.map((args) => {
    const pin = parseExactPin(args.requirement, args.requirement);
    const name = normaliseDistribution(pin.name);
    if (name === "pyx12") {
      if (args.companions.length > 0 || args.python !== null) {
        throw new OracleRequirementError(
          args.requirement,
          `The ${args.requirement} driver reads the oracle alone and takes no --with or --python pin.`,
        );
      }
      return pyx12Oracle(args.requirement, INTERCHANGE_CONTROL_VERSION);
    }
    if (name === LINUXFORHEALTH_PACKAGE) {
      return linuxforhealthOracle(
        { oracle: args.requirement, companions: args.companions, python: args.python },
        INTERCHANGE_CONTROL_VERSION,
      );
    }
    throw new OracleRequirementError(
      args.requirement,
      `No driver in scripts/differential/ reads an oracle named "${pin.name}".`,
    );
  });
}

/**
 * The report with its provenance block set aside, as lines, for comparison. The
 * `library` block names the commit the run was produced from and whether that
 * tree was dirty, so it differs between two faithful runs by construction.
 */
function comparable(report: DifferentialReport | Record<string, unknown>): string[] {
  const rest: Record<string, unknown> = { ...report };
  delete rest.library;
  return JSON.stringify(rest, null, 2).split("\n");
}

function summarise(run: DifferentialRun): void {
  const compared = run.report.compared.length;
  const uncovered = run.report.uncovered.length;
  const documents = run.report.compared.reduce((n, entry) => n + entry.documents, 0);
  const positions = run.report.compared.reduce((n, entry) => n + entry.elementPositions, 0);
  const divergences = run.report.compared.reduce((n, entry) => n + entry.divergences.length, 0);
  const oracles = run.report.oracles
    .map((oracle) => {
      const rows = run.report.compared.filter((entry) => entry.oracle === oracle.package).length;
      return `${oracle.package} ${oracle.version} (${oracle.licence}) ${String(rows)} compared`;
    })
    .join("; ");
  process.stdout.write(
    `${oracles}: ${String(compared)} transactions compared, ${String(uncovered)} not mapped, ` +
      `${String(documents)} documents, ${String(positions)} element positions, ` +
      `${String(divergences)} divergences, ${String(run.report.unevaluated.length)} unevaluated, ` +
      `${String(run.report.skipped.length)} skipped.\n`,
  );
  for (const failure of run.failures) process.stderr.write(`${failure}\n`);
}

/** Compare a live report with the committed one; 0 when it reproduces, else 1. */
function reproduce(live: DifferentialReport): number {
  if (!existsSync(REPORT_PATH)) {
    process.stderr.write(
      `There is no committed report at ${relative(REPO_ROOT, REPORT_PATH)} to reproduce.\n`,
    );
    return 1;
  }
  const committed = comparable(
    JSON.parse(readFileSync(REPORT_PATH, "utf8")) as Record<string, unknown>,
  );
  const current = comparable(live);
  if (committed.join("\n") === current.join("\n")) {
    process.stdout.write(
      "The live comparison reproduces the committed report, divergences included.\n",
    );
    return 0;
  }
  for (let i = 0; i < Math.max(committed.length, current.length); i += 1) {
    if (committed[i] === current[i]) continue;
    process.stderr.write(
      `The live comparison does not reproduce the committed report.\n` +
        `First difference at line ${String(i + 1)} of the report with its library block set aside:\n` +
        `  committed: ${committed[i] ?? "(end of file)"}\n` +
        `  live:      ${current[i] ?? "(end of file)"}\n` +
        `Regenerate it with: pnpm run differential\n`,
    );
    break;
  }
  return 1;
}

async function main(): Promise<number> {
  let invocation: Invocation;
  let run: DifferentialRun;
  try {
    invocation = parseArguments(process.argv.slice(2));
    const oracles = buildOracles(invocation.oracles);
    run = await runDifferential({
      oracles,
      corpus: collectCorpus(CORPUS_ROOT),
      library: provenance(),
    });
  } catch (error) {
    if (error instanceof OracleUnavailableError || error instanceof OracleRequirementError) {
      process.stderr.write(`${error.message}\n`);
      process.stderr.write(
        `No report was written: this run never compared anything against ${error.oracle}.\n`,
      );
      return 1;
    }
    throw error;
  }

  summarise(run);
  if (invocation.check) return reproduce(run.report);

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, `${JSON.stringify(run.report, null, 2)}\n`, "utf8");
  process.stdout.write(`Report: ${relative(REPO_ROOT, REPORT_PATH)}\n`);

  if (run.failures.length > 0) {
    const divergences = run.report.compared.reduce((n, entry) => n + entry.divergences.length, 0);
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

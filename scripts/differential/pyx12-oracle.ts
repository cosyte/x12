/**
 * The real oracle: pyx12, an independent open-source X12 reader, driven out of
 * process through `scripts/differential/oracle.py`.
 *
 * SECURITY: every subprocess is array-form `spawnSync`, no shell.
 *
 * The oracle is a development-only tool and is never a dependency of the
 * published package, so it is not in `package.json`'s dependency sets at all.
 * What pins it is the requirement string `package.json` hands this module, which
 * names one immutable version and is the only place that version is written.
 * Two routes obtain the oracle from that one pin:
 *
 *   - by default, `uv run --with <requirement>`, which resolves and caches the
 *     exact version for this invocation and leaves nothing installed;
 *   - when `X12_DIFFERENTIAL_PYTHON` names an interpreter, that interpreter,
 *     for an environment that already provisioned the oracle.
 *
 * Neither route is trusted to have obtained the right thing: the oracle reports
 * the version it is actually running and this module refuses any answer that is
 * not the pinned one, so a stale interpreter on the second route fails loudly
 * rather than producing a report about a different reader.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  OracleUnavailableError,
  type CorpusDocument,
  type DifferentialOracle,
  type OracleDescription,
  type OracleRead,
} from "./harness.js";

const ORACLE_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "oracle.py");

/** Environment variable naming an interpreter that already has the oracle. */
export const INTERPRETER_ENV = "X12_DIFFERENTIAL_PYTHON";

/** Split `name==version` into its halves, refusing anything that can move. */
export function parseRequirement(requirement: string): { name: string; version: string } {
  const match = /^([A-Za-z0-9._-]+)==([A-Za-z0-9._-]+)$/u.exec(requirement);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    throw new TypeError(
      `The oracle requirement must pin an exact version as "<name>==<version>", got "${requirement}".`,
    );
  }
  return { name: match[1], version: match[2] };
}

/** The argv that obtains and invokes the oracle, for one subcommand. */
export function oracleInvocation(requirement: string, args: readonly string[]): string[] {
  const interpreter = process.env[INTERPRETER_ENV];
  if (interpreter !== undefined && interpreter !== "") {
    return [interpreter, ORACLE_SCRIPT, ...args];
  }
  return [
    "uv",
    "run",
    "--isolated",
    "--python",
    "3.12",
    "--with",
    requirement,
    "--",
    "python",
    ORACLE_SCRIPT,
    ...args,
  ];
}

function invoke(requirement: string, args: readonly string[], input = ""): unknown {
  const argv = oracleInvocation(requirement, args);
  const [command, ...rest] = argv;
  const printable = argv.join(" ");
  if (command === undefined) throw new TypeError("empty oracle invocation");
  const result = spawnSync(command, rest, {
    encoding: "utf8",
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    throw new OracleUnavailableError(requirement, printable, result.error.message);
  }
  if (result.status !== 0) {
    throw new OracleUnavailableError(
      requirement,
      printable,
      `exit ${String(result.status)}\n${result.stderr}`,
    );
  }
  try {
    return JSON.parse(result.stdout) as unknown;
  } catch {
    throw new OracleUnavailableError(
      requirement,
      printable,
      `the oracle produced no JSON on stdout\n${result.stderr}`,
    );
  }
}

interface RawDescription {
  package: string;
  version: string;
  licence: { declared: string | null; expression: string | null; classifier: string | null };
  mapIndex: string;
  interchangeControlVersion: string;
  bindings: {
    icvn: string;
    vriic: string;
    fic: string;
    tspc: string | null;
    mapFile: string;
    mapTransactionId: string | null;
    mapTitle: string | null;
  }[];
}

/** The pyx12-backed oracle, pinned by `requirement` and nothing else. */
export function pyx12Oracle(requirement: string, icvn: string): DifferentialOracle {
  const pin = parseRequirement(requirement);
  return {
    describe(): Promise<OracleDescription> {
      const raw = invoke(requirement, ["describe", icvn]) as RawDescription;
      if (raw.version !== pin.version) {
        throw new OracleUnavailableError(
          requirement,
          oracleInvocation(requirement, ["describe", icvn]).join(" "),
          `the oracle reports version ${raw.version}, and this harness is pinned to ${pin.version}. ` +
            `A report produced against a different revision of the oracle would describe a reader ` +
            `nobody can reproduce.`,
        );
      }
      return Promise.resolve({
        package: raw.package,
        version: raw.version,
        licence: raw.licence.expression ?? raw.licence.declared ?? "unstated",
        licenceClassifier: raw.licence.classifier,
        mapIndex: raw.mapIndex,
        interchangeControlVersion: raw.interchangeControlVersion,
        bindings: raw.bindings,
      });
    },
    read(document: CorpusDocument): Promise<OracleRead> {
      return Promise.resolve(invoke(requirement, ["read"], document.text) as OracleRead);
    },
  };
}

/**
 * What every oracle driver shares: reading an exact pin, and invoking the
 * out-of-process reader it names.
 *
 * SECURITY: every subprocess is array-form `spawnSync`, no shell.
 */

import { spawnSync } from "node:child_process";

import { OracleUnavailableError } from "./harness.js";

/**
 * A requirement that does not pin what it has to pin. Raised before the oracle
 * is invoked when the requirement text leaves a version free, and after it is
 * described when the installation shows a package the requirement does not
 * pin. Either way no comparison runs, because a report produced against a
 * reader nobody fixed describes a reader nobody can reproduce.
 */
export class OracleRequirementError extends TypeError {
  readonly oracle: string;

  constructor(oracle: string, message: string) {
    super(message);
    this.name = "OracleRequirementError";
    this.oracle = oracle;
  }
}

/** One `<name>==<version>` pin. */
export interface ExactPin {
  readonly name: string;
  readonly version: string;
}

/** The PEP 503 form of a distribution name, which is how two spellings compare. */
export function normaliseDistribution(name: string): string {
  return name.replace(/[-_.]+/gu, "-").toLowerCase();
}

/**
 * Split `name==version` into its halves, refusing anything that can move.
 * `oracle` names the oracle the pin belongs to, so the refusal says whose it is.
 */
export function parseExactPin(requirement: string, oracle?: string): ExactPin {
  const match = /^([A-Za-z0-9._-]+)==([A-Za-z0-9._-]+)$/u.exec(requirement);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    throw new OracleRequirementError(
      oracle ?? requirement,
      `The oracle requirement must pin an exact version as "<name>==<version>", got "${requirement}".`,
    );
  }
  return { name: match[1], version: match[2] };
}

/**
 * Run one oracle subcommand and parse the one JSON object it writes to stdout.
 * Any failure to get that object is the oracle being unavailable, named by
 * `oracle` and by the exact argv that was tried.
 */
export function invokeOracle(oracle: string, argv: readonly string[], input = ""): unknown {
  const [command, ...rest] = argv;
  const printable = argv.join(" ");
  if (command === undefined) throw new TypeError("empty oracle invocation");
  const result = spawnSync(command, rest, {
    encoding: "utf8",
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error !== undefined) {
    throw new OracleUnavailableError(oracle, printable, result.error.message);
  }
  if (result.status !== 0) {
    throw new OracleUnavailableError(
      oracle,
      printable,
      `exit ${String(result.status)}\n${result.stderr}`,
    );
  }
  try {
    return JSON.parse(result.stdout) as unknown;
  } catch {
    throw new OracleUnavailableError(
      oracle,
      printable,
      `the oracle produced no JSON on stdout\n${result.stderr}`,
    );
  }
}

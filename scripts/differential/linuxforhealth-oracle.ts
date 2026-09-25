/**
 * The second oracle: LinuxForHealth x12, an independent open-source X12 reader
 * with a transaction model per implementation guide, driven out of process
 * through `scripts/differential/linuxforhealth_oracle.py`.
 *
 * SECURITY: every subprocess is array-form `spawnSync`, no shell.
 *
 * Like the first oracle it is a development-only tool and never a dependency of
 * the published package. Unlike the first, its own metadata leaves a package it
 * cannot run without free: it declares Pydantic with a floor and no ceiling
 * while importing a Pydantic 1 API, so an unpinned resolve picks a Pydantic it
 * cannot import. Its requirement therefore pins, exactly, the oracle, every
 * companion package its runtime requirements pull in, and the interpreter
 * version it runs under. Two routes obtain it from that one requirement:
 *
 *   - by default, `uv run --python <version> --with <pin>...`, which resolves
 *     and caches the exact set for this invocation and leaves nothing
 *     installed;
 *   - when `X12_DIFFERENTIAL_LINUXFORHEALTH_PYTHON` names an interpreter, that
 *     interpreter, for an environment that already provisioned the oracle.
 *
 * Neither route is trusted to have obtained the right thing. The oracle reports
 * its own version, the interpreter version it runs under and every companion
 * package actually installed, and this module refuses an answer that differs
 * from the pin anywhere, and a companion the installation shows that the
 * requirement does not pin.
 */

import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  OracleUnavailableError,
  type CorpusDocument,
  type DifferentialOracle,
  type OracleBinding,
  type OracleDescription,
  type OracleRead,
} from "./harness.js";
import {
  invokeOracle,
  normaliseDistribution,
  OracleRequirementError,
  parseExactPin,
  type ExactPin,
} from "./oracle-process.js";

const ORACLE_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "linuxforhealth_oracle.py");

/** The distribution name this driver reads. */
export const LINUXFORHEALTH_PACKAGE = "linuxforhealth-x12";

/** Environment variable naming an interpreter that already has the oracle. */
export const LINUXFORHEALTH_INTERPRETER_ENV = "X12_DIFFERENTIAL_LINUXFORHEALTH_PYTHON";

/** The requirement as the command line states it, before anything is checked. */
export interface LinuxForHealthRequirement {
  /** `linuxforhealth-x12==<version>`. */
  readonly oracle: string;
  /** One `<name>==<version>` per companion package. */
  readonly companions: readonly string[];
  /** The interpreter version, `<major>.<minor>.<micro>`. */
  readonly python: string | null;
}

/** The requirement once every part of it is known to be exact. */
export interface LinuxForHealthPin {
  readonly label: string;
  readonly oracle: ExactPin;
  readonly companions: readonly ExactPin[];
  readonly python: string;
}

/**
 * Check the requirement pins everything exactly, before anything is invoked:
 * the oracle, each companion, and the interpreter version.
 */
export function parseLinuxForHealthRequirement(
  requirement: LinuxForHealthRequirement,
): LinuxForHealthPin {
  const label = requirement.oracle;
  const oracle = parseExactPin(requirement.oracle, label);
  if (normaliseDistribution(oracle.name) !== LINUXFORHEALTH_PACKAGE) {
    throw new OracleRequirementError(
      label,
      `This driver reads ${LINUXFORHEALTH_PACKAGE}, and the requirement names "${oracle.name}".`,
    );
  }
  const companions = requirement.companions.map((companion) => parseExactPin(companion, label));
  const seen = new Set<string>([LINUXFORHEALTH_PACKAGE]);
  for (const companion of companions) {
    const name = normaliseDistribution(companion.name);
    if (seen.has(name)) {
      throw new OracleRequirementError(
        label,
        `The requirement for ${label} pins "${companion.name}" more than once, or pins the oracle ` +
          `itself as a companion.`,
      );
    }
    seen.add(name);
  }
  if (requirement.python === null || !/^\d+\.\d+\.\d+$/u.test(requirement.python)) {
    throw new OracleRequirementError(
      label,
      `The requirement for ${label} must pin an exact interpreter version as ` +
        `"<major>.<minor>.<micro>", got ${JSON.stringify(requirement.python)}.`,
    );
  }
  return { label, oracle, companions, python: requirement.python };
}

/** The argv that obtains and invokes the oracle, for one subcommand. */
export function linuxforhealthInvocation(
  pin: LinuxForHealthPin,
  args: readonly string[],
): string[] {
  const interpreter = process.env[LINUXFORHEALTH_INTERPRETER_ENV];
  if (interpreter !== undefined && interpreter !== "") {
    return [interpreter, ORACLE_SCRIPT, ...args];
  }
  return [
    "uv",
    "run",
    "--isolated",
    "--python",
    pin.python,
    "--with",
    `${pin.oracle.name}==${pin.oracle.version}`,
    ...pin.companions.flatMap((companion) => ["--with", `${companion.name}==${companion.version}`]),
    "--",
    "python",
    ORACLE_SCRIPT,
    ...args,
  ];
}

interface RawDescription {
  package: string;
  version: string;
  licence: { declared: string | null; expression: string | null; classifier: string | null };
  python: string;
  companions: { package: string; version: string | null }[];
  bindingSource: string;
  interchangeControlVersion: string;
  bindings: OracleBinding[];
}

/**
 * Hold what the installation reports against the pin, refusing any difference.
 * Returns the companions as installed, in a stable order.
 */
function checkInstallation(
  pin: LinuxForHealthPin,
  raw: RawDescription,
  invocation: string,
): { package: string; version: string }[] {
  const unavailable = (detail: string): OracleUnavailableError =>
    new OracleUnavailableError(pin.label, invocation, detail);
  if (raw.version !== pin.oracle.version) {
    throw unavailable(
      `the oracle reports version ${raw.version}, and this harness is pinned to ` +
        `${pin.oracle.version}. A report produced against a different revision of the oracle ` +
        `would describe a reader nobody can reproduce.`,
    );
  }
  if (raw.python !== pin.python) {
    throw unavailable(
      `the oracle runs under Python ${raw.python}, and this harness is pinned to ${pin.python}.`,
    );
  }
  const pinned = new Map(
    pin.companions.map((companion) => [normaliseDistribution(companion.name), companion.version]),
  );
  const installed: { package: string; version: string }[] = [];
  for (const companion of raw.companions) {
    const name = normaliseDistribution(companion.package);
    if (companion.version === null) {
      throw unavailable(`the oracle requires ${name}, which is not installed.`);
    }
    const version = pinned.get(name);
    if (version === undefined) {
      throw new OracleRequirementError(
        pin.label,
        `The installed ${LINUXFORHEALTH_PACKAGE} runs on ${name} ${companion.version}, and the ` +
          `requirement for ${pin.label} pins no version for it, so the resolver is free to move it.`,
      );
    }
    if (version !== companion.version) {
      throw unavailable(
        `the oracle runs on ${name} ${companion.version}, and this harness is pinned to ${version}.`,
      );
    }
    installed.push({ package: name, version: companion.version });
  }
  const runsOn = new Set(installed.map((companion) => companion.package));
  for (const name of pinned.keys()) {
    if (!runsOn.has(name)) {
      throw new OracleRequirementError(
        pin.label,
        `The requirement for ${pin.label} pins ${name}, which the installed ` +
          `${LINUXFORHEALTH_PACKAGE} does not run on, so the report would record a pin that fixed nothing.`,
      );
    }
  }
  return installed.sort((a, b) => a.package.localeCompare(b.package));
}

/**
 * The LinuxForHealth-backed oracle. Throws {@link OracleRequirementError} at
 * once when the requirement leaves anything free.
 */
export function linuxforhealthOracle(
  requirement: LinuxForHealthRequirement,
  icvn: string,
): DifferentialOracle {
  const pin = parseLinuxForHealthRequirement(requirement);
  // Each call settles its promise, a refusal included, rather than throwing
  // past it.
  return {
    describe(): Promise<OracleDescription> {
      return new Promise((resolve) => {
        const argv = linuxforhealthInvocation(pin, ["describe", icvn]);
        const raw = invokeOracle(pin.label, argv) as RawDescription;
        const companions = checkInstallation(pin, raw, argv.join(" "));
        resolve({
          package: raw.package,
          version: raw.version,
          licence: raw.licence.expression ?? raw.licence.declared ?? "unstated",
          licenceClassifier: raw.licence.classifier,
          bindingKind: "model",
          bindingSource: raw.bindingSource,
          interchangeControlVersion: raw.interchangeControlVersion,
          python: raw.python,
          companions,
          bindings: raw.bindings,
        });
      });
    },
    read(document: CorpusDocument): Promise<OracleRead> {
      return new Promise((resolve) => {
        const argv = linuxforhealthInvocation(pin, ["read"]);
        resolve(invokeOracle(pin.label, argv, document.text) as OracleRead);
      });
    },
  };
}

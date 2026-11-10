/**
 * How this repository's standard properties run: how many cases, from which seed, and what a
 * failure prints so it replays exactly.
 *
 * This is the shape of the shared property runner in `@cosyte/test-utils` (its `property` module
 * on cosyte/config main), written against fast-check directly because the version of the kit on
 * npm does not carry it yet. When it is released, `assertProperty` and `resolvePropertyRun` here
 * give way to the kit's own, and the three properties to its `roundTripProperty`,
 * `idempotentNormalizeProperty` and `lenientNeverThrowsProperty`.
 *
 * - **Depth.** {@link DEFAULT_NUM_RUNS} cases a property. `COSYTE_PROPERTY_RUNS` sets the depth
 *   of every property in a run (a nightly job sets 10,000 or more) and wins over a test's own
 *   `numRuns`.
 * - **Seed.** With no seed given, a property runs from the suite's pinned global seed
 *   (`test/setup.fast-check.ts`), so a pull request sees the same cases every time and coverage
 *   stays reproducible; the nightly fuzz run rotates it through `X12_FUZZ_SEED`.
 * - **Replay.** A failure prints its seed and path. Setting `COSYTE_PROPERTY_SEED` and
 *   `COSYTE_PROPERTY_PATH` to them runs that one failing case again, already shrunk.
 * - A value that is set but malformed throws, so a job that typed its depth wrong cannot quietly
 *   run the default.
 */

import fc from "fast-check";
import type { IProperty, Parameters as FcParameters, RunDetails } from "fast-check";

/** Cases a property runs when nothing else sets a depth. */
export const DEFAULT_NUM_RUNS = 100;

/** The environment variables a property run reads. */
export const PROPERTY_ENV = Object.freeze({
  runs: "COSYTE_PROPERTY_RUNS",
  seed: "COSYTE_PROPERTY_SEED",
  path: "COSYTE_PROPERTY_PATH",
} as const);

/** The run options a property takes. The environment wins over each. */
export interface PropertyRunOptions {
  readonly numRuns?: number;
  readonly seed?: number;
  readonly path?: string;
}

/** A resolved run: the depth, and the seed and path when replaying. */
export interface ResolvedPropertyRun {
  readonly numRuns: number;
  readonly seed?: number;
  readonly path?: string;
}

/** Read one variable, refusing a value that is set but malformed. */
function readEnv(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  shape: RegExp,
  meaning: string,
): string | undefined {
  const value = env[name];
  if (value === undefined || value === "") return undefined;
  if (!shape.test(value)) {
    throw new RangeError(`${name} must be ${meaning}, got ${JSON.stringify(value)}`);
  }
  return value;
}

/**
 * Work out a run's depth, seed and path from a test's options and the environment, which wins.
 *
 * @throws {RangeError} When a value is malformed, or a path is given without its seed.
 */
export function resolvePropertyRun(
  options: PropertyRunOptions,
  env: Readonly<Record<string, string | undefined>> = process.env,
): ResolvedPropertyRun {
  const runs = readEnv(env, PROPERTY_ENV.runs, /^[1-9]\d*$/, "a whole number of cases, 1 or more");
  const seed = readEnv(
    env,
    PROPERTY_ENV.seed,
    /^-?\d+$/,
    "a whole number, the seed a failure printed",
  );
  const path = readEnv(
    env,
    PROPERTY_ENV.path,
    /^\d+(?::\d+)*$/,
    "a path like 0:3:1, as a failure printed it",
  );
  const numRuns = runs === undefined ? (options.numRuns ?? DEFAULT_NUM_RUNS) : Number(runs);
  const resolvedSeed = seed === undefined ? options.seed : Number(seed);
  const resolvedPath = path ?? options.path;
  if (!Number.isInteger(numRuns) || numRuns < 1) {
    throw new RangeError(`numRuns must be a whole number of cases, 1 or more, got ${numRuns}`);
  }
  if (resolvedPath !== undefined && resolvedSeed === undefined) {
    throw new RangeError(`a replay path needs its seed: set ${PROPERTY_ENV.seed} too`);
  }
  return {
    numRuns,
    ...(resolvedSeed === undefined ? {} : { seed: resolvedSeed }),
    ...(resolvedPath === undefined ? {} : { path: resolvedPath }),
  };
}

/** The message a failed run throws: what failed, how to replay it, then fast-check's report. */
export function propertyFailureMessage<Ts>(name: string, details: RunDetails<Ts>): string {
  const replay = `${PROPERTY_ENV.seed}=${details.seed} ${PROPERTY_ENV.path}=${details.counterexamplePath}`;
  return [
    `${name}: property failed after ${details.numRuns} case(s), shrunk ${details.numShrinks} time(s).`,
    `Replay exactly: ${replay}`,
    "",
    String(fc.defaultReportMessage(details)),
  ].join("\n");
}

/**
 * Run a property at the resolved depth and seed, and throw a replayable error when it fails.
 *
 * @throws {Error} When the property fails, with the seed and path in the message.
 */
export function assertProperty<Ts>(
  name: string,
  property: IProperty<Ts>,
  options: PropertyRunOptions = {},
  env: Readonly<Record<string, string | undefined>> = process.env,
): void {
  const run = resolvePropertyRun(options, env);
  // A replay stops at the case its path names: that case is already shrunk.
  const parameters: FcParameters<Ts> = {
    ...run,
    endOnFailure: run.path !== undefined,
    includeErrorInReport: true,
  };
  const details = fc.check(property, parameters);
  if (!details.failed) return;
  throw new Error(propertyFailureMessage(name, details), { cause: details.errorInstance });
}

/**
 * A test's time budget for a property at the resolved depth: the suite's 10 s floor, or 10 ms a
 * case, whichever is longer, so a deep run (`COSYTE_PROPERTY_RUNS=10000`) is not cut off by the
 * budget a 100-case run needs.
 */
export function propertyTimeout(
  env: Readonly<Record<string, string | undefined>> = process.env,
): number {
  return Math.max(10_000, resolvePropertyRun({}, env).numRuns * 10);
}

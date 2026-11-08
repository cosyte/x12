/**
 * The knobs of the fuzz layer, and the per-case contract the fuzz targets check.
 *
 * `pnpm test` runs each fuzz target at its committed base count against the pinned seed in
 * `test/setup.fast-check.ts`, so a pull request sees the same inputs every time and coverage stays
 * reproducible. The
 * scheduled nightly run (`.github/workflows/nightly-fuzz.yml`, which calls the shared
 * `nightly-fuzz.yml`) runs `pnpm fuzz` with these set, so each night explores a different slice of
 * the input space:
 *
 * - `X12_FUZZ_SEED`: the fast-check seed, an integer. The nightly passes its run id, so the run
 *   that found something names the seed that replays it. `test/setup.fast-check.ts` reads it too,
 *   so the property tests that are not fuzz targets explore a new slice as well.
 * - `X12_FUZZ_SECONDS`: a time budget per target. When set, a target generates inputs until the
 *   budget is spent instead of stopping at its run count.
 * - `X12_FUZZ_RUNS`: a multiplier on each target's base run count, for a run of a fixed size.
 *
 * A value that is not a whole number is ignored, so a malformed variable can never make a run
 * smaller than the committed one or silently change the seed.
 *
 * Replaying a finding: the failure prints the counterexample, the seed and the path. Re-run
 * `X12_FUZZ_SEED=<seed> pnpm fuzz`, or pass `{ seed, path, endOnFailure: true }` to the failing
 * `fc.assert` to step straight to the shrunk case.
 *
 * @module
 */

import type fc from "fast-check";

/** A whole number from the environment, or `undefined` when it is unset or not one. */
function integerFromEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return undefined;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : undefined;
}

/** A positive whole number from the environment, or `undefined`. */
function positiveFromEnv(name: string): number | undefined {
  const value = integerFromEnv(name);
  return value !== undefined && value > 0 ? value : undefined;
}

/**
 * The seed override, when the environment names one. Any whole number: fast-check folds a seed
 * to 32 bits and prints the folded value, which can be negative, and that value replays too.
 */
export const FUZZ_SEED: number | undefined = integerFromEnv("X12_FUZZ_SEED");

const FUZZ_SECONDS: number | undefined = positiveFromEnv("X12_FUZZ_SECONDS");

const FUZZ_MULTIPLIER: number = positiveFromEnv("X12_FUZZ_RUNS") ?? 1;

/**
 * How many cases a target runs: its base count times the multiplier, or its share of the time
 * budget.
 */
function runSize<T>(baseRuns: number, shares: number): fc.Parameters<T> {
  return FUZZ_SECONDS === undefined
    ? { numRuns: baseRuns * FUZZ_MULTIPLIER }
    : {
        numRuns: Number.MAX_SAFE_INTEGER,
        interruptAfterTimeLimit: Math.ceil((FUZZ_SECONDS * 1000) / shares),
      };
}

/**
 * The `fc.assert` parameters for a fuzz target: its run size, with the seed override applied when
 * one is given. Without one, the target keeps the pinned global seed from
 * `test/setup.fast-check.ts`.
 *
 * `shares` splits one time budget across a family of targets, one per committed fixture, so the
 * nightly length tracks the number of families rather than the number of fixtures. A byte flip of
 * one fixture is a small space, so a few seconds each covers it many times over.
 */
export function amplified<T>(baseRuns: number, shares = 1): fc.Parameters<T> {
  return FUZZ_SEED === undefined
    ? runSize<T>(baseRuns, shares)
    : { ...runSize<T>(baseRuns, shares), seed: FUZZ_SEED };
}

/**
 * The Vitest timeout for one fuzz target, given the same `shares` as {@link amplified}. A
 * synchronous target cannot be interrupted by this timer, only judged after it returns, so it is
 * sized to the run rather than used as a hang detector: the per-case budget in
 * {@link withinBudget} is the hang detector.
 */
export function fuzzTimeout(baseMs: number, shares = 1): number {
  if (FUZZ_SECONDS !== undefined) return Math.ceil((FUZZ_SECONDS * 1000) / shares) + 120_000;
  return baseMs * FUZZ_MULTIPLIER;
}

/**
 * The CPU-time budget for one case, in milliseconds: a fixed floor for a garbage collection, plus
 * one millisecond per 64 bytes of input. A linear pass over the largest input a target builds
 * takes a few milliseconds, so a case over this budget is a hang or a super-linear path. It is CPU
 * time, not wall-clock time: on a busy machine a case waits for a core without using one, and that
 * wait is not the code's. Vitest runs each worker as its own process here (the `forks` pool), so
 * the process's CPU time is this case's.
 */
export function caseBudgetMs(inputLength: number): number {
  return 250 + inputLength / 64;
}

/**
 * How much the heap and the `ArrayBuffer` store may grow during one case. The inputs here are a
 * few KiB at most, and nothing on these paths legitimately turns that into more than a few MiB, so
 * growth past this is a runaway allocation.
 */
export const CASE_ALLOCATION_BYTES = 256 * 1024 * 1024;

/** Heap in use plus the memory held by `ArrayBuffer`s. */
function heapAndBuffers(): number {
  const usage = process.memoryUsage();
  return usage.heapUsed + usage.arrayBuffers;
}

/** CPU time this process has used, user and system, in milliseconds. */
function cpuMs(): number {
  const { user, system } = process.cpuUsage();
  return (user + system) / 1000;
}

/** The first bytes of an input as hex, so a failure message names the case. */
export function preview(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  const head = bytes.subarray(0, 64).toString("hex");
  return bytes.length > 64 ? `${head}... (${String(bytes.length)} bytes)` : head;
}

/**
 * How many times a case runs before an overrun fails it. A garbage collection can land in one run
 * of a case; a hang or a super-linear path is over budget on every run. Cases are deterministic,
 * so running one again is the same case.
 */
const CONFIRMING_RUNS = 3;

/**
 * Run one fuzz case and hold it to the resource half of the contract: it returns within
 * {@link caseBudgetMs} and grows memory by no more than {@link CASE_ALLOCATION_BYTES}, on its
 * best of {@link CONFIRMING_RUNS} runs. The behavioural half (which throws are sanctioned) is the
 * caller's `run`, which must not keep state between runs.
 */
export function withinBudget(input: Uint8Array | string, run: () => void): void {
  const budget = caseBudgetMs(input.length);
  let fastest = Number.POSITIVE_INFINITY;
  let leanest = Number.POSITIVE_INFINITY;
  for (let attempt = 0; attempt < CONFIRMING_RUNS; attempt++) {
    const before = heapAndBuffers();
    const started = cpuMs();
    run();
    fastest = Math.min(fastest, cpuMs() - started);
    leanest = Math.min(leanest, heapAndBuffers() - before);
    if (fastest <= budget && leanest <= CASE_ALLOCATION_BYTES) return;
  }
  if (fastest > budget) {
    throw new Error(
      `fuzz: the case used ${fastest.toFixed(1)} ms of CPU at best of ${String(CONFIRMING_RUNS)} runs, over its ${budget.toFixed(0)} ms budget (a hang or a super-linear path): ${preview(input)}`,
    );
  }
  throw new Error(
    `fuzz: the case grew the heap and buffers by ${(leanest / 1048576).toFixed(1)} MiB at best of ${String(CONFIRMING_RUNS)} runs (a runaway allocation): ${preview(input)}`,
  );
}

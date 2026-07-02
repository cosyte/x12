/**
 * Shared knob for the byte-flip / never-throw **fuzz targets** so the
 * nightly fuzz workflow can amplify iteration counts without touching the
 * reproducible per-commit `pnpm test` run.
 *
 * - Under normal `pnpm test` (and CI's `ci` job), `X12_FUZZ_RUNS` is unset,
 *   the multiplier is **1**, and every fuzz target runs its committed base
 *   iteration count against the pinned global seed
 *   (`test/setup.fast-check.ts`) — deterministic, coverage-stable.
 * - The nightly `fuzz.yml` workflow sets `X12_FUZZ_RUNS` (e.g. `20`) to run
 *   20× the base iterations, and rotates `X12_FUZZ_SEED` so each night
 *   explores a different slice of the input space. A failure prints the
 *   counterexample **and** the seed, so it is replayable by re-running with
 *   the same `X12_FUZZ_SEED`.
 *
 * Only the true fuzz targets (byte-flip / hostile-input never-throw
 * properties) read this — the round-trip / algebra property tests keep
 * their fixed counts because they assert exact equalities, not the absence
 * of unsanctioned throws, so more runs add cost without added assurance.
 */

/**
 * Multiply a fuzz target's base iteration count by the `X12_FUZZ_RUNS`
 * environment multiplier (default `1`, floored at `1`). Non-numeric or
 * `< 1` values fall back to `1` so a malformed env var can never *reduce*
 * coverage below the committed baseline.
 *
 * @example
 * ```ts
 * // base 500 locally; 10_000 under `X12_FUZZ_RUNS=20`
 * fc.assert(fc.property(arb, prop), { numRuns: fuzzRuns(500) });
 * ```
 */
export function fuzzRuns(base: number): number {
  const raw = process.env["X12_FUZZ_RUNS"];
  if (raw === undefined) return base;
  const multiplier = Number(raw);
  if (!Number.isFinite(multiplier) || multiplier < 1) return base;
  return Math.floor(base * multiplier);
}

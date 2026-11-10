import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * The scaling gate's own Vitest run, `pnpm test:perf`: the tests that read a clock, run apart from
 * `pnpm test` and never under coverage. Coverage instrumentation compiles a counter into every
 * measured function, at a cost that does not cancel cleanly in a ratio, so
 * `@cosyte/test-utils/perf` asks for a run of its own.
 *
 * One file at a time in one fork, so no other test shares the machine with a timed phase.
 */
export default defineConfig({
  resolve: {
    // `src/arbitraries/` imports the library by its package name; nothing here does, but keep the
    // name pointing at the source, as `vitest.config.ts` does, should a measured path reach it.
    alias: { "@cosyte/x12": fileURLToPath(new URL("src/index.ts", import.meta.url)) },
  },
  test: {
    include: ["test/perf/**/*.perf.ts"],
    pool: "forks",
    fileParallelism: false,
    // A phase is well under a second, but the warmup may take up to its 5 s bound per axis, and
    // the self-check runs a deliberately quadratic parse at the same sizes.
    testTimeout: 120_000,
  },
});

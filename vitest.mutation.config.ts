import { configDefaults } from "vitest/config";

import config from "./vitest.config.js";

/**
 * The Vitest run StrykerJS uses for mutation testing (`stryker.config.mjs`): the suite of
 * `vitest.config.ts`, without the tests that cannot judge a mutant, or cannot judge one quickly.
 *
 * - `test/perf/`: the scaling gate's own suite (`pnpm test:perf` and `pnpm test:perf:sets`, each
 *   its own CI job) and the bench corpus check read a clock or build large documents; under StrykerJS's
 *   instrumentation every measured call pays for a mutant switch, so they would measure the
 *   instrumentation and repeat that job's work for every mutant they reach.
 * - `test/scripts/` and `test/differential/`: these test this repository's own tooling in
 *   `scripts/` (the PHI scan, the release and changelog gates, the differential harness and its
 *   oracle doubles, each started as a child process), not the library.
 * - The tests that start another process or read a build: the docs samples
 *   (`docs-content.test.ts`, which builds and loads `dist/`), the README example
 *   (`readme-usage.test.ts`, run in a child process), the bundle check (`bundle-ascii.test.ts`,
 *   which runs tsup) and the parse entry point's check (`parse-entry.test.ts`, which runs tsup and
 *   reads the source text). Code a child process or a build runs is not the instrumented source, so no
 *   mutant is ever killed there.
 * - The tests that read this repository's source text and hold it to a shape: that every builder
 *   bounds its loops over a caller's list, types each value it writes, declares its GS-01 as a
 *   literal the cited table agrees with, and so on. In a mutation run the source they would read
 *   is StrykerJS's instrumented copy, in which every literal and branch is wrapped in a mutant
 *   switch, so they fail before any mutant runs, and the shape they hold is not one a mutant
 *   changes. `pnpm test` runs them on every pull request.
 * - The fuzz targets (`test/property/*-fuzz.property.test.ts`): each flips a byte of every
 *   committed fixture hundreds of times and holds each case to a CPU-time budget, so a mutant that
 *   slows a path fails them on time rather than on what the code returns, and they cost seconds a
 *   mutant. The properties beside them (round trip, idempotent normalize, never throws in lenient
 *   mode) stay in, at 100 cases each, and so do the unit tests over the same readers.
 *
 * - The three scans of the date conversion module's source in `conversion-surface.test.ts`,
 *   skipped through `X12_MUTATION_RUN` below: they read source text, as the tests above that
 *   read this repository's source do, and fail on the instrumented copy. The rest of
 *   that file runs, and it is the suite that judges the mutants of `toObject`, `toISO` and
 *   `toDate`.
 *
 * - The 10 MB streaming test in `transactions-enrollment-834.test.ts`, skipped through
 *   `X12_MUTATION_RUN` below: it parses a 10 MB document for every parser mutant and killed no
 *   mutant on any of four full runs. Leaving it out did not by itself stop a dozen parser mutants
 *   moving between timed out and survived from one full run to the next, so the mutation floor
 *   stays at the lowest score measured.
 *
 * The instrumented code runs several times slower than the plain build, so a test's budget here is
 * 60 s rather than 10 s. StrykerJS sets each mutant's own timeout from the time the test took in
 * its first run (`stryker.config.mjs`), so this budget does not slow the mutant runs.
 */
export default {
  ...config,
  test: {
    ...config.test,
    exclude: [
      ...configDefaults.exclude,
      ...(config.test?.exclude ?? []),
      "test/perf/**",
      "test/scripts/**",
      "test/differential/**",
      "test/docs-content.test.ts",
      "test/readme-usage.test.ts",
      "test/bundle-ascii.test.ts",
      "test/parse-entry.test.ts",
      "test/property/*-fuzz.property.test.ts",
      "test/builder-array-bounds.test.ts",
      "test/builder-control-number-empty.test.ts",
      "test/builder-decimal-type.test.ts",
      "test/builder-refusal-bounds.test.ts",
      "test/builder-segment-type.test.ts",
      "test/builder-string-type.test.ts",
      "test/code-lists-functional-identifier.test.ts",
      "test/eligibility-271-aaa-provenance.test.ts",
      "test/parser-decimal-silent-defaults.test.ts",
    ],
    env: { ...config.test?.env, X12_MUTATION_RUN: "1" },
    testTimeout: 60_000,
  },
};

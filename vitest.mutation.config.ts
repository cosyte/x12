import { configDefaults } from "vitest/config";

import config from "./vitest.config.js";

/**
 * The Vitest run StrykerJS uses for mutation testing (`stryker.config.mjs`): the suite of
 * `vitest.config.ts`, without the tests that cannot judge a mutant, or cannot judge one quickly.
 *
 * - `test/perf/`: the scaling gate's own suite (`pnpm test:perf`, its own CI job of six to eight
 *   minutes) and the bench corpus check read a clock or build large documents; under StrykerJS's
 *   instrumentation every measured call pays for a mutant switch, so they would measure the
 *   instrumentation and repeat that job's work for every mutant they reach.
 * - `test/scripts/` and `test/differential/`: these test this repository's own tooling in
 *   `scripts/` (the PHI scan, the release and changelog gates, the differential harness and its
 *   oracle doubles, each started as a child process), not the library.
 * - The tests that start another process or read a build: the docs samples
 *   (`docs-content.test.ts`, which builds and loads `dist/`), the README example
 *   (`readme-usage.test.ts`, run in a child process) and the bundle check (`bundle-ascii.test.ts`,
 *   which runs tsup). Code a child process or a build runs is not the instrumented source, so no
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
      "test/property/*-fuzz.property.test.ts",
      "test/builder-array-bounds.test.ts",
      "test/builder-control-number-empty.test.ts",
      "test/builder-decimal-type.test.ts",
      "test/builder-refusal-bounds.test.ts",
      "test/builder-segment-type.test.ts",
      "test/builder-string-type.test.ts",
      "test/code-lists-functional-identifier.test.ts",
      "test/conversion-surface.test.ts",
      "test/eligibility-271-aaa-provenance.test.ts",
      "test/parser-decimal-silent-defaults.test.ts",
    ],
    testTimeout: 60_000,
  },
};

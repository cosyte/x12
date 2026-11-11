import { cosyteStryker } from "@cosyte/vitest-config/stryker";

// Mutation testing for @cosyte/x12, on the shared StrykerJS config: per-test coverage, static
// mutants ignored, the JSON report at reports/mutation/mutation.json, and no score threshold of its
// own (quality-floor.json decides).
//
//   pnpm mutate:full                           every source file; its score is the floor's
//   pnpm mutate changed --base origin/main     only the source files a change touched
//   pnpm quality:mutation [--base origin/main] the score against quality-floor.json
//
// The files mutated are the shared default: every `.ts` file under `src/` but declarations and
// barrels. The shared config reads each file to tell a barrel (nothing but re-exports) from code,
// so `src/index.ts` and the `index.ts` of each transaction folder are left out, and an `index.ts`
// that holds code of its own is mutated.
export default cosyteStryker({
  // The suite without the tests that cannot judge a mutant (see that file).
  vitestConfig: "vitest.mutation.config.ts",
  stryker: {
    // A mutant times out when a test takes longer than timeoutFactor times its first, unmutated
    // run plus timeoutMS. At StrykerJS's defaults (1.5 and 5,000 ms) a mutant near that line can be
    // a timeout on one run and a survivor on the next, which moves a full score the ratchet
    // compares exactly. A wider margin lets a slow mutant that still finishes finish every time,
    // so only a mutant that never ends times out, and the weekly score does not move with the
    // runner's load. Our other libraries measured the same margin as stable across two runs.
    timeoutFactor: 3,
    timeoutMS: 10_000,
  },
});

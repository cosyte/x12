// Types for x12.bench.mjs, so test/perf/bench-corpus.test.ts can run every case once against the
// source. The suite is handed the module under test, which is `@cosyte/x12` itself.

import type { BenchSuite } from "@cosyte/bench";

declare const suite: BenchSuite<typeof import("../src/index.js")>;
export default suite;

import { cosyteVitest } from "@cosyte/vitest-config";

/**
 * Vitest config for @cosyte/x12 from the shared @cosyte/vitest-config standard.
 *
 * x12 is still an early scaffold: the only source file is the `src/index.ts` VERSION sentinel, which
 * the shared config already excludes from coverage as a barrel/index. So there are no source dirs to
 * gate yet and `coverageDirs` is omitted; `test:coverage` is green because the global >= 90 gate has
 * no measured files. The global gate stays armed, so it bites the moment real parser code lands.
 *
 * TODO(x12): when parser code arrives, list its source subdirs in `coverageDirs`
 * (e.g. `["parser", "envelope", "transactions", "helpers"]`) to turn on the real per-directory gates.
 */
export default cosyteVitest({
  test: {
    globals: false,
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "coverage", "test/fixtures/**"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});

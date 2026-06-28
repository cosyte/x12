import { cosyteVitest } from "@cosyte/vitest-config";

/**
 * Vitest config for @cosyte/x12 from the shared @cosyte/vitest-config standard.
 *
 * Per-directory coverage gates (≥ 90 lines/branches/functions/statements):
 *   - `parser/` — envelope + segment + release-char (Phases 1 + 2)
 *   - `loops/` — defineLoopSpec (Phase 2)
 *   - `transactions/` — ack 999/TA1 (Phase 3) + remit 835 (Phase 4)
 *   - `code-lists/` — bundled WPC + X12-internal snapshots (Phase 4)
 *   - `serialize/` — spec-clean serializer (Phase 8)
 *   - `builder/` — general-purpose interchange builder (Phase 8)
 *   - `profiles/` — trading-partner profile system (Phase 9)
 */
export default cosyteVitest({
  coverageDirs: [
    "parser",
    "loops",
    "transactions",
    "code-lists",
    "serialize",
    "builder",
    "profiles",
  ],
  test: {
    globals: false,
    environment: "node",
    setupFiles: ["test/setup.fast-check.ts"],
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "coverage", "test/fixtures/**"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});

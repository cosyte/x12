import { cosyteVitest } from "@cosyte/vitest-config";

/**
 * Vitest config for @cosyte/x12 from the shared @cosyte/vitest-config standard.
 *
 * Phase 1 (envelope decoder) ships under `src/parser/`. The per-directory gate
 * is armed now so any future module added to `parser/` must keep ≥90 per-dir
 * coverage. Future phases will add their own subdirs as they land:
 *   - Phase 2: `model/`, `helpers/` for segment/composite decode + dot-path traversal
 *   - Phase 3+: `transactions/` for the per-TR3 extractors
 *   - Phase 8: `serialize/`, `builder/` for the emit half
 *   - Phase 9: `profiles/` for clearinghouse / payer companion-guide quirks
 */
export default cosyteVitest({
  coverageDirs: ["parser"],
  test: {
    globals: false,
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "coverage", "test/fixtures/**"],
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "coverage", "test/fixtures/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      // index.ts is a stub in this phase; real coverage thresholds land in Phase 8.
      exclude: ["src/**/*.test.ts", "src/index.ts"],
    },
    reporters: ["default"],
  },
});

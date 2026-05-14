import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  platform: "node",
  treeshake: true,
  splitting: false,
  minify: false,
  outExtension: ({ format }) => ({ js: format === "esm" ? ".mjs" : ".cjs" }),
  tsconfig: "./tsconfig.build.json",
});

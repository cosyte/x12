import cosyte from "@cosyte/eslint-config";

export default [
  ...cosyte(import.meta.dirname, {
    ignores: ["*.tsbuildinfo", "test/fixtures/**"],
  }),
];

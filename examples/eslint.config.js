import cosyte from "@cosyte/eslint-config";

// The examples are programs that print, not library code with a public API, so every type-safety
// rule applies to them and the library-only `no-console` and JSDoc gates do not.
export default [
  ...cosyte(import.meta.dirname, { files: ["*.ts"] }),
  {
    files: ["*.ts"],
    rules: {
      "no-console": "off",
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-example": "off",
    },
  },
];

// Lint-rule positive-test fixture.
//
// This file is a public export deliberately MISSING the `@example` JSDoc tag.
// It is excluded from the normal lint run via the `ignores` block in
// `eslint.config.js` (matches `test/fixtures` glob).
//
// To prove jsdoc/require-example still fires on real source code, copy this
// shape into `src/` and run `pnpm exec eslint <path>`. During Plan 01-03
// verification the fire-test was performed by writing this file's content to
// a transient path inside `src/`, asserting the lint exit code was non-zero
// and the error message included "Missing JSDoc @example declaration", and
// then deleting the transient file. See 01-03-SUMMARY.md for the exact
// commands and captured output.
//
// Note: linting THIS file directly will NOT trigger the rule, because the
// test glob in eslint.config.js turns off the JSDoc gate for test files
// (tests don't ship public exports).

/**
 * A deliberate missing-@example public export - see file header above.
 */
export const MUST_FAIL_LINT_WHEN_COPIED_TO_SRC = "missing @example on purpose";

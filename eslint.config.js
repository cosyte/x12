// @ts-check
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jsdoc from "eslint-plugin-jsdoc";
import prettier from "eslint-config-prettier";
import globals from "globals";

// `import.meta.dirname` was added in Node 20.11 / 21.2 — on Node 18 it is
// `undefined` and typescript-eslint silently falls back to `process.cwd()`,
// which breaks `pnpm exec eslint` from any subdirectory. Compute __dirname
// the portable way so the config is correct on every supported Node version
// (>= 18, per package.json#engines).
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Helper: scope a tseslint config (or array of configs) to a files glob.
 * Type-checked rules require a TS-program context, so we must NOT let them
 * fall through onto plain `.js`/`.mjs`/`.cjs` files (config files, scripts).
 */
const scopeTo = (files, configs) =>
  (Array.isArray(configs) ? configs : [configs]).map((c) => ({ ...c, files }));

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "*.tsbuildinfo", "test/fixtures/**"],
  },
  // Base JS rules apply to all linted files.
  js.configs.recommended,

  // Type-checked TS rule sets — scoped to .ts files only.
  ...scopeTo(["**/*.ts"], tseslint.configs.recommendedTypeChecked),
  ...scopeTo(["**/*.ts"], tseslint.configs.stylisticTypeChecked),

  // JSDoc rules (typescript flavor) — scoped to .ts files only.
  { ...jsdoc.configs["flat/recommended-typescript"], files: ["**/*.ts"] },

  // TypeScript-aware parser config + project-service.
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Public-export JSDoc gate (SETUP-04, CLAUDE.md guardrail).
      // ExportNamedDeclaration context covers `export const`, `export function`,
      // `export class`, etc. — every public symbol must carry JSDoc + @example.
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          contexts: [
            "ExportNamedDeclaration",
            "ExportNamedDeclaration > VariableDeclaration",
            "ExportNamedDeclaration > FunctionDeclaration",
            "ExportNamedDeclaration > ClassDeclaration",
            "ExportNamedDeclaration > TSInterfaceDeclaration",
            "ExportNamedDeclaration > TSTypeAliasDeclaration",
          ],
        },
      ],
      "jsdoc/require-example": [
        "error",
        {
          contexts: [
            "ExportNamedDeclaration",
            "ExportNamedDeclaration > VariableDeclaration",
            "ExportNamedDeclaration > FunctionDeclaration",
            "ExportNamedDeclaration > ClassDeclaration",
            "ExportNamedDeclaration > TSInterfaceDeclaration",
            "ExportNamedDeclaration > TSTypeAliasDeclaration",
          ],
          exemptedBy: ["internal"],
        },
      ],
    },
  },

  // Library source: no console allowed (CLAUDE.md guardrail).
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-console": "error",
    },
  },

  // Tests + scripts + config files may use console and skip the JSDoc gate.
  {
    files: [
      "test/**/*.ts",
      "scripts/**/*.{mjs,cjs,js,ts}",
      "*.config.ts",
      "*.config.js",
      "*.config.mjs",
    ],
    rules: {
      "no-console": "off",
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-example": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Plain-JS files (eslint.config.js, scripts/*.mjs, scripts/*.cjs):
  // give them Node globals; no type-aware rules will fire here because
  // we scoped recommendedTypeChecked to **/*.ts above.
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-console": "off",
    },
  },

  // Prettier MUST come last — turns off formatting-conflict rules.
  prettier,
);

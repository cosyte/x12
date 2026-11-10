import { cosyteTsup } from "@cosyte/tsup-config";

/**
 * tsup build for @cosyte/x12 - dual ESM + CJS + `.d.ts` from the shared @cosyte/tsup-config standard
 * (ES2023, Node platform, `.mjs`/`.cjs` out-extensions). Matches the `exports` map in package.json.
 *
 * Two entry points. `arbitraries` (the `@cosyte/x12/arbitraries` subpath) imports the library by
 * its own package name, and the build leaves that import in place, so the subpath loads the same
 * `dist/index` a consumer's own `import "@cosyte/x12"` loads: one copy of the library, one
 * `X12ParseError` class and one process-wide default profile, not a second bundled copy with its
 * own. The plugin below is what keeps it: tsup bundles any import that `paths` in `tsconfig.json`
 * maps, even one it is told is external, and `paths` maps the package's own name to
 * `src/index.ts` for the type checker. `fast-check` is the subpath's optional peer dependency and
 * stays external too; nothing `src/index.ts` reaches imports it.
 */
export default cosyteTsup({
  entry: { index: "src/index.ts", arbitraries: "src/arbitraries/index.ts" },
  external: ["@cosyte/x12", "fast-check"],
  esbuildPlugins: [
    {
      name: "keep-own-package-external",
      setup(build) {
        build.onResolve({ filter: /^@cosyte\/x12$/ }, (args) => ({
          path: args.path,
          external: true,
        }));
      },
    },
  ],
});

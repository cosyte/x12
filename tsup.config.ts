import { cosyteTsup } from "@cosyte/tsup-config";

import { rewriteDataExports } from "./scripts/cjs-data-exports.js";

/**
 * tsup build for @cosyte/x12 - dual ESM + CJS + `.d.ts` from the shared @cosyte/tsup-config standard
 * (ES2023, Node platform, `.mjs`/`.cjs` out-extensions). Matches the `exports` map in package.json.
 *
 * Three entry points. `parse` (the `@cosyte/x12/parse` subpath) is the parser alone, for a caller
 * who only parses and should not pay to compile the code lists, loop specifications, readers and
 * builders. `splitting` is on, for both formats, so the modules `index` and `parse` share go into
 * one chunk that both load: one `X12ParseError` class and one process-wide default profile behind
 * both entry points, never a second copy of the parser with its own. Splitting alone would turn the
 * CommonJS exports that come from the chunk into getters that cannot be redefined, so `onSuccess`
 * rewrites each CommonJS entry point's exports back into the ordinary writable properties a
 * one-file build has, which `jest.spyOn` and `vi.spyOn` can stub (`scripts/cjs-data-exports.ts`).
 *
 * `arbitraries` (the `@cosyte/x12/arbitraries` subpath) imports the library by its own package
 * name, and the build leaves that import in place, so the subpath loads the same `dist/index` a
 * consumer's own `import "@cosyte/x12"` loads: one copy of the library, one `X12ParseError` class
 * and one process-wide default profile, not a second bundled copy with its own. The plugin below is
 * what keeps it: tsup bundles any import that `paths` in `tsconfig.json` maps, even one it is told
 * is external, and `paths` maps the package's own name to `src/index.ts` for the type checker.
 * `fast-check` is the subpath's optional peer dependency and stays external too; nothing
 * `src/index.ts` reaches imports it.
 */
const entry = {
  index: "src/index.ts",
  parse: "src/parse.ts",
  arbitraries: "src/arbitraries/index.ts",
};

/** The config for the options given on the command line: `--out-dir` is where `onSuccess` looks. */
export default (cli: { outDir?: string }): ReturnType<typeof cosyteTsup> =>
  cosyteTsup({
    entry,
    splitting: true,
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
    onSuccess: () => {
      rewriteDataExports(
        cli.outDir ?? "dist",
        Object.keys(entry).map((name) => `${name}.cjs`),
      );
      return Promise.resolve();
    },
  });

#!/usr/bin/env node
/**
 * Sync the `VERSION` constant in `src/index.ts` with `package.json`'s `version`.
 *
 * Why this exists: `VERSION` is a public export, but the version bump is owned by Changesets, which
 * only rewrites `package.json`. Without this step the package publishes a `VERSION` that *lies* —
 * `0.0.1` on the registry, `"0.0.0"` from the export. The `version` script (which the shared release
 * workflow invokes as `pnpm run version`) runs `changeset version` and then this, so the bump and the
 * constant always land in the same "Version Packages" commit.
 *
 * The guard against drift is `test/sanity.test.ts`, which compares the export against `package.json`
 * at test time. Skipping this script makes that test go red — deliberately.
 *
 * Idempotent; exits non-zero if the declaration can't be found (a rename must not silently no-op).
 */
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const pkgUrl = new URL("package.json", root);
const srcUrl = new URL("src/index.ts", root);

const { version } = JSON.parse(readFileSync(pkgUrl, "utf8"));
if (typeof version !== "string" || version.length === 0) {
  console.error("sync-version: package.json has no usable `version`");
  process.exit(1);
}

const source = readFileSync(srcUrl, "utf8");
const declaration = /^export const VERSION: string = "[^"]*";$/m;

if (!declaration.test(source)) {
  console.error(
    'sync-version: could not find `export const VERSION: string = "...";` in src/index.ts.\n' +
      "The declaration was renamed or reformatted — update this script alongside it.",
  );
  process.exit(1);
}

const updated = source.replace(declaration, `export const VERSION: string = "${version}";`);

if (updated === source) {
  console.log(`sync-version: VERSION already ${version}`);
} else {
  writeFileSync(srcUrl, updated);
  console.log(`sync-version: VERSION -> ${version}`);
}

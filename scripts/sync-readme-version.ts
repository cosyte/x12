/**
 * Sync the release line README.md's `## Status` section names with `package.json`'s `version`.
 *
 * The README names the release line ("the 0.1 line"), not an exact version, so a patch release
 * leaves it alone and only a new minor or major line moves it. Prose outside changelogs names the
 * line by house standard (ST16): an exact version in a README is wrong from the next release on.
 *
 * Why this exists: `test/readme-standard.test.ts` requires `## Status` to name the release line
 * `package.json` declares, and the release pipeline runs `pnpm test` on the "Version Packages"
 * commit before it publishes. Changesets rewrites `package.json` only, so without this step the
 * commit that opens a new line fails its own test and the publish stops. The `version` script runs
 * this after `changeset version` and `sync-version.mjs`, so the bump and the README line land in the
 * same commit, the same way the `VERSION` constant does.
 *
 * It rewrites exactly one thing: the `**The X.Y line**` marker in the `## Status` section. It is
 * idempotent, and it refuses (exit 1) when the section or the marker is missing or appears more
 * than once, so a reworded status cannot silently stop being synced.
 *
 *     tsx scripts/sync-readme-version.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The status marker: a bold "The X.Y line", naming the release line of a semantic version. */
const MARKER = /\*\*The (\d+\.\d+) line\*\*/g;

/**
 * The release line of a semantic version: its major and minor, so `0.1.2` is the `0.1` line.
 *
 * @param version - A semantic version.
 * @returns `major.minor`.
 * @example
 * ```ts
 * releaseLine("0.1.2"); // "0.1"
 * ```
 */
export function releaseLine(version: string): string {
  const [major = "", minor = ""] = version.split(".");
  return `${major}.${minor}`;
}

/**
 * The README with the `## Status` marker naming `version`, or an error message.
 *
 * @param readme - The whole README.md text.
 * @param version - `package.json` `version`.
 * @returns `{ text }` with the synced README, or `{ error }` naming why it could not be synced.
 */
export function syncReadmeVersion(
  readme: string,
  version: string,
): { readonly text: string } | { readonly error: string } {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    return { error: `package.json version ${JSON.stringify(version)} is not a semantic version` };
  }
  const start = readme.indexOf("\n## Status\n");
  if (start === -1) return { error: "README.md has no `## Status` section" };
  const next = readme.indexOf("\n## ", start + 1);
  const end = next === -1 ? readme.length : next;
  const section = readme.slice(start, end);
  const markers = [...section.matchAll(MARKER)];
  if (markers.length !== 1) {
    return {
      error:
        `README.md \`## Status\` carries ${String(markers.length)} \`**The X.Y line**\` ` +
        "markers; expected exactly one, so there is no single line to sync",
    };
  }
  const line = releaseLine(version);
  // A replacer function, so a version string is inserted literally and never read as a pattern.
  const synced = section.replace(MARKER, () => `**The ${line} line**`);
  return { text: readme.slice(0, start) + synced + readme.slice(end) };
}

function main(): void {
  const readmePath = join(REPO_ROOT, "README.md");
  const manifest: unknown = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8"));
  const version =
    typeof manifest === "object" && manifest !== null && "version" in manifest
      ? manifest.version
      : undefined;
  const readme = readFileSync(readmePath, "utf8");
  const result = syncReadmeVersion(readme, typeof version === "string" ? version : "");
  if ("error" in result) {
    console.error(`sync-readme-version: ${result.error}`);
    process.exit(1);
  }
  if (result.text === readme) {
    console.log(
      `sync-readme-version: README.md already names the ${releaseLine(String(version))} line`,
    );
    return;
  }
  writeFileSync(readmePath, result.text);
  console.log(`sync-readme-version: README.md -> the ${releaseLine(String(version))} line`);
}

// Run only as a CLI, never on import (the test imports the function above).
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  main();
}

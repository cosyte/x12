/**
 * `scripts/sync-readme-version.ts` keeps the version README.md's `## Status` names equal to
 * `package.json` across a Changesets version commit, which is what lets that commit pass
 * `test/readme-standard.test.ts` before the release publishes it. Every case is driven on README
 * text built here, never on the repository's own README.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { syncReadmeVersion } from "../../scripts/sync-readme-version.js";

const README = [
  "# @cosyte/x12",
  "",
  "## Status",
  "",
  "**Version 0.0.18**, published on npm.",
  "",
  "From `0.1.0` the public API is settled and safe to depend on.",
  "",
  "## Install",
  "",
  "**Version 9.9.9** outside the section is never touched.",
  "",
].join("\n");

describe("syncing the README status version", () => {
  it("rewrites the one marker in ## Status to the manifest version", () => {
    const result = syncReadmeVersion(README, "0.1.0");
    expect("text" in result && result.text).toBe(
      README.replace("**Version 0.0.18**", "**Version 0.1.0**"),
    );
  });

  it("leaves everything outside the marker byte for byte", () => {
    const result = syncReadmeVersion(README, "0.1.0");
    const text = "text" in result ? result.text : "";
    expect(text).toContain("From `0.1.0` the public API is settled and safe to depend on.");
    expect(text).toContain("**Version 9.9.9** outside the section is never touched.");
  });

  it("is idempotent", () => {
    expect(syncReadmeVersion(README, "0.0.18")).toEqual({ text: README });
  });

  it("refuses a README with no ## Status section", () => {
    expect(syncReadmeVersion("# x\n\n## Install\n", "0.1.0")).toHaveProperty("error");
  });

  it("refuses a status with no marker, so a reworded line cannot stop being synced in silence", () => {
    const reworded = README.replace("**Version 0.0.18**", "Version 0.0.18");
    expect(syncReadmeVersion(reworded, "0.1.0")).toHaveProperty("error");
  });

  it("refuses a status with two markers", () => {
    const doubled = README.replace(
      "**Version 0.0.18**, published on npm.",
      "**Version 0.0.18**, then **Version 0.0.17**.",
    );
    expect(syncReadmeVersion(doubled, "0.1.0")).toHaveProperty("error");
  });

  it("refuses a manifest version that is not a semantic version", () => {
    expect(syncReadmeVersion(README, "")).toHaveProperty("error");
    expect(syncReadmeVersion(README, "$&")).toHaveProperty("error");
  });

  it("finds exactly one marker in this repository's README", () => {
    const readme = readFileSync(join(import.meta.dirname, "..", "..", "README.md"), "utf8");
    const pkg: unknown = JSON.parse(
      readFileSync(join(import.meta.dirname, "..", "..", "package.json"), "utf8"),
    );
    const version =
      typeof pkg === "object" && pkg !== null && "version" in pkg && typeof pkg.version === "string"
        ? pkg.version
        : "";
    expect(syncReadmeVersion(readme, version)).toEqual({ text: readme });
  });
});

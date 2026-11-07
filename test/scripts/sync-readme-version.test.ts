/**
 * `scripts/sync-readme-version.ts` keeps the release line README.md's `## Status` names equal to
 * the line of `package.json`'s version across a Changesets version commit, which is what lets that commit pass
 * `test/readme-standard.test.ts` before the release publishes it. Every case is driven on README
 * text built here, never on the repository's own README.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { releaseLine, syncReadmeVersion } from "../../scripts/sync-readme-version.js";

const README = [
  "# @cosyte/x12",
  "",
  "## Status",
  "",
  "**The 0.0 line**, published on npm.",
  "",
  "From `0.1.0` the public API is settled and safe to depend on.",
  "",
  "## Install",
  "",
  "**The 9.9 line** outside the section is never touched.",
  "",
].join("\n");

describe("syncing the README status release line", () => {
  it("rewrites the one marker in ## Status to the manifest version's release line", () => {
    const result = syncReadmeVersion(README, "0.1.0");
    expect("text" in result && result.text).toBe(
      README.replace("**The 0.0 line**", "**The 0.1 line**"),
    );
  });

  it("leaves the line alone across a patch release", () => {
    expect(syncReadmeVersion(README, "0.0.19")).toEqual({ text: README });
  });

  it("names a version's release line by its major and minor", () => {
    expect(releaseLine("0.1.2")).toBe("0.1");
    expect(releaseLine("1.0.0-rc.1")).toBe("1.0");
  });

  it("leaves everything outside the marker byte for byte", () => {
    const result = syncReadmeVersion(README, "0.1.0");
    const text = "text" in result ? result.text : "";
    expect(text).toContain("From `0.1.0` the public API is settled and safe to depend on.");
    expect(text).toContain("**The 9.9 line** outside the section is never touched.");
  });

  it("is idempotent", () => {
    expect(syncReadmeVersion(README, "0.0.18")).toEqual({ text: README });
  });

  it("refuses a README with no ## Status section", () => {
    expect(syncReadmeVersion("# x\n\n## Install\n", "0.1.0")).toHaveProperty("error");
  });

  it("refuses a status with no marker, so a reworded line cannot stop being synced in silence", () => {
    const reworded = README.replace("**The 0.0 line**", "The 0.0 line");
    expect(syncReadmeVersion(reworded, "0.1.0")).toHaveProperty("error");
  });

  it("refuses a status with two markers", () => {
    const doubled = README.replace(
      "**The 0.0 line**, published on npm.",
      "**The 0.0 line**, then **The 0.1 line**.",
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

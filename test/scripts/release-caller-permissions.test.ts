/**
 * Gate for the `Release` caller's permission grant, run on every `pnpm test`.
 *
 * `scripts/check-release-caller-permissions.ts` reads THIS tree's own
 * `.github/workflows/release.yml` and asserts the job that calls the shared release pipeline
 * grants every scope that pipeline declares, at the strength it declares. The failure it
 * exists for is not a red test somewhere: it is a `startup_failure` on the default branch
 * with no jobs, no steps and no logs, because a called workflow may only narrow the caller's
 * token and never widen it, so a caller short one scope makes the callee's request an
 * elevation that GitHub refuses before anything runs.
 *
 * EVERY FAILURE SHAPE IS DRIVEN WITH WORKFLOW TEXT THIS REPO DOES NOT SHIP, not only with the
 * real file. A gate that can only be run on the real data cannot be shown to fail, and the
 * shape this one has to get right is the one where it finds nothing to inspect and reports
 * success for it.
 *
 * The two historical inputs below are real: `CALLER_AT_FAILING_SHA` is this repo's caller at
 * the commit whose `Release` run concluded `startup_failure`, and `CALLER_ON_MAIN` is the
 * same file after the missing scope was granted. They are the before and after of the bug.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkReleaseCallerPermissions,
  releaseCallerPermissionFailures,
  RELEASE_CALLER_PATH,
  REQUIRED_CALLER_PERMISSIONS,
  SHARED_RELEASE_WORKFLOW,
} from "../../scripts/check-release-caller-permissions.js";

const root = join(import.meta.dirname, "..", "..");

/** This repo's `Release` caller as it stands on the default branch: the adequate grant. */
const CALLER_ON_MAIN = `name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    permissions:
      actions: read # the shared workflow reads this caller's environment protection with it
      contents: write # create tags / the GitHub release
      id-token: write # npm provenance
      pull-requests: write # open the "Version Packages" PR
    uses: cosyte/.github/.github/workflows/release.yml@main
    with:
      package-name: "@cosyte/x12"
    secrets: inherit
`;

/** The same file at the sha whose `Release` run concluded `startup_failure`: no `actions`. */
const CALLER_AT_FAILING_SHA = `name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    permissions:
      contents: write # create tags / the GitHub release
      id-token: write # npm provenance
      pull-requests: write # open the "Version Packages" PR
    uses: cosyte/.github/.github/workflows/release.yml@main
    with:
      package-name: "@cosyte/x12"
    secrets: inherit
`;

/** `CALLER_ON_MAIN` with the `<scope>: <level>` line for `scope` removed entirely. */
function withoutScope(scope: string): string {
  const lines = CALLER_ON_MAIN.split("\n").filter((line) => !line.trim().startsWith(`${scope}:`));
  return lines.join("\n");
}

/** `CALLER_ON_MAIN` with `scope` downgraded to `level` rather than removed. */
function withScopeAt(scope: string, level: string): string {
  return CALLER_ON_MAIN.split("\n")
    .map((line) => (line.trim().startsWith(`${scope}:`) ? `      ${scope}: ${level}` : line))
    .join("\n");
}

describe("the Release caller grants every scope the shared pipeline requires", () => {
  it("this tree's own .github/workflows/release.yml passes", () => {
    expect(checkReleaseCallerPermissions(root)).toEqual([]);
  });

  it("the caller as it stands on the default branch passes", () => {
    expect(releaseCallerPermissionFailures(CALLER_ON_MAIN)).toEqual([]);
  });

  it("the four required scopes are the ones the shared pipeline declares", () => {
    // Pins the transcription itself. If someone edits the list, this line is the diff a
    // reviewer sees, rather than the check quietly asking for less.
    expect(REQUIRED_CALLER_PERMISSIONS.map(({ scope, level }) => `${scope}: ${level}`)).toEqual([
      "actions: read",
      "contents: write",
      "id-token: write",
      "pull-requests: write",
    ]);
  });

  it("a scope granted MORE than it needs still passes", () => {
    // `actions: read` is the requirement; `actions: write` is stronger, not a violation.
    expect(releaseCallerPermissionFailures(withScopeAt("actions", "write"))).toEqual([]);
  });

  it("a fifth scope the pipeline does not ask for is not a failure", () => {
    const widened = CALLER_ON_MAIN.replace(
      "      actions: read",
      "      actions: read\n      packages: read",
    );
    expect(releaseCallerPermissionFailures(widened)).toEqual([]);
  });

  it("`permissions: write-all` is sufficient, so this check does not red on it", () => {
    const blanket = CALLER_ON_MAIN.replace(
      / {4}permissions:\n(?: {6}.*\n)+/u,
      "    permissions: write-all\n",
    );
    expect(releaseCallerPermissionFailures(blanket)).toEqual([]);
  });
});

describe("a missing scope fails, and the failure names the scope", () => {
  it.each(REQUIRED_CALLER_PERMISSIONS.map(({ scope }) => scope))(
    "%s missing from the calling job",
    (scope) => {
      const failures = releaseCallerPermissionFailures(withoutScope(scope));
      expect(failures).toHaveLength(1);
      expect(failures[0]).toContain(scope);
      expect(failures[0]).toContain(RELEASE_CALLER_PATH);
    },
  );

  it("the caller at the failing sha fails, naming `actions`", () => {
    // The concrete historical input. This exact file produced a logless `startup_failure`.
    const failures = releaseCallerPermissionFailures(CALLER_AT_FAILING_SHA);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("actions");
    expect(failures[0]).toContain("read");
  });

  it("a calling job with no `permissions:` block at all fails, naming every scope", () => {
    const unpinned = CALLER_ON_MAIN.replace(/ {4}permissions:\n(?: {6}.*\n)+/u, "");
    const failures = releaseCallerPermissionFailures(unpinned);
    expect(failures).toHaveLength(REQUIRED_CALLER_PERMISSIONS.length);
    for (const { scope } of REQUIRED_CALLER_PERMISSIONS) {
      expect(failures.some((failure) => failure.includes(scope))).toBe(true);
    }
  });

  it("two missing scopes are both named, rather than only the first", () => {
    const twoShort = withoutScope("actions")
      .split("\n")
      .filter((line) => !line.trim().startsWith("id-token:"));
    const failures = releaseCallerPermissionFailures(twoShort.join("\n"));
    expect(failures).toHaveLength(2);
    expect(failures.some((failure) => failure.includes("actions"))).toBe(true);
    expect(failures.some((failure) => failure.includes("id-token"))).toBe(true);
  });
});

describe("a scope present but too weak fails, rather than passing because the key exists", () => {
  it.each([
    ["contents", "read"],
    ["id-token", "read"],
    ["pull-requests", "read"],
    ["actions", "none"],
  ])("%s: %s is weaker than the pipeline requires", (scope, level) => {
    const failures = releaseCallerPermissionFailures(withScopeAt(scope, level));
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(scope);
    expect(failures[0]).toContain(level);
  });

  it("`permissions: read-all` fails, naming each write scope it cannot satisfy", () => {
    const blanket = CALLER_ON_MAIN.replace(
      / {4}permissions:\n(?: {6}.*\n)+/u,
      "    permissions: read-all\n",
    );
    const failures = releaseCallerPermissionFailures(blanket);
    expect(failures).toHaveLength(3);
    for (const scope of ["contents", "id-token", "pull-requests"]) {
      expect(failures.some((failure) => failure.includes(scope))).toBe(true);
    }
  });

  it("a value that is not a permission level at all fails, naming the scope", () => {
    const failures = releaseCallerPermissionFailures(withScopeAt("contents", "yes-please"));
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("contents");
  });
});

describe("an unreadable caller fails naming the file, never passes vacuously", () => {
  it("the file is absent from the tree", () => {
    const failures = checkReleaseCallerPermissions(join(root, "test", "no-such-checkout"));
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(RELEASE_CALLER_PATH);
  });

  it("the file is empty", () => {
    const failures = releaseCallerPermissionFailures("");
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(RELEASE_CALLER_PATH);
  });

  it("the file holds only comments", () => {
    const failures = releaseCallerPermissionFailures("# deleted the workflow, kept the file\n");
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(RELEASE_CALLER_PATH);
  });

  it("the file is not YAML", () => {
    const failures = releaseCallerPermissionFailures("}{ this is not a workflow\n");
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(RELEASE_CALLER_PATH);
  });

  it("the file indents with tabs, which YAML forbids", () => {
    const failures = releaseCallerPermissionFailures("jobs:\n\trelease:\n\t\tuses: x\n");
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(RELEASE_CALLER_PATH);
  });

  it("the file parses but declares no jobs", () => {
    const failures = releaseCallerPermissionFailures(
      "name: Release\non:\n  push:\n    branches: [main]\n",
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(RELEASE_CALLER_PATH);
  });

  it("no job in the file calls the shared pipeline", () => {
    const elsewhere = CALLER_ON_MAIN.replace(
      `uses: ${SHARED_RELEASE_WORKFLOW}@main`,
      "uses: someone-else/.github/.github/workflows/release.yml@main",
    );
    const failures = releaseCallerPermissionFailures(elsewhere);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain(RELEASE_CALLER_PATH);
    expect(failures[0]).toContain(SHARED_RELEASE_WORKFLOW);
  });

  it("the calling job is found whatever git ref it pins", () => {
    // The ref is deliberately not part of the match: pinning it here would turn a ref change
    // into "nothing calls the shared pipeline" instead of into a permissions answer.
    const pinned = CALLER_ON_MAIN.replace(
      `${SHARED_RELEASE_WORKFLOW}@main`,
      `${SHARED_RELEASE_WORKFLOW}@966b1cc2`,
    );
    expect(releaseCallerPermissionFailures(pinned)).toEqual([]);
  });
});

describe("the human release gate stays where it is", () => {
  // The security floor, asserted rather than remembered. Weakening any of these would put
  // this package on npm with no human in the loop, and it is the one thing here that no
  // re-run undoes. These are deletion tripwires on the real file, not a parse of it.
  const source = readFileSync(join(root, RELEASE_CALLER_PATH), "utf8");
  // The keys, with every comment line removed: the comments below talk ABOUT these keys, and a
  // sentence naming one is not the same thing as the workflow declaring it.
  const keys = source
    .split("\n")
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");

  it("still calls the shared release pipeline at @main", () => {
    expect(keys).toContain(`uses: ${SHARED_RELEASE_WORKFLOW}@main`);
  });

  it("still passes secrets: inherit", () => {
    expect(keys).toMatch(/^\s*secrets: inherit$/mu);
  });

  it("still triggers on a push to the default branch", () => {
    expect(keys).toMatch(/^on:$/mu);
    expect(keys).toMatch(/^\s*push:$/mu);
    expect(keys).toMatch(/^\s*branches: \[main\]$/mu);
  });

  it("declares no `environment:` key, so the callee's release environment is not bypassed", () => {
    // The shared pipeline puts its publishing job in THIS repo's `release` environment, and
    // that environment carries the required-reviewer rule. An `environment:` key here would
    // be a caller-side override of the gate that holds every publish.
    expect(keys).not.toMatch(/^\s*environment:/mu);
  });

  it("explains the waiting state in its own comments", () => {
    // A run parked at `waiting` is the gate working, and the next reader of this file, human
    // or automated CI sweep, has to be able to learn that from the file itself. This pins
    // that the explanation is present, not how it is worded.
    expect(source).toMatch(/waiting/u);
    expect(source).toMatch(/required reviewer/iu);
    expect(source).toMatch(/approv/iu);
  });
});

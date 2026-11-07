/**
 * Tests for the CHANGELOG generation contract: `.changeset/config.json` plus the
 * shape of `CHANGELOG.md` that makes generated output land where a reader expects
 * it.
 *
 * WHY THIS FILE EXISTS. `CHANGELOG.md` is listed in `package.json#files`, so it is
 * inside every published tarball. Until generation was turned on, the release wrote
 * no version heading into it, because `.changeset/config.json` set
 * `"changelog": false`, and the file was kept by hand instead. It fell behind npm:
 * 0.1.2 was published and never written here. That is not a gap to fill by hand
 * once: filling it leaves the mechanism that produced it, and it drifts again on the
 * next release. This file is the same contract the sibling parsers pin.
 *
 * WHAT EACH TEST PINS, AND WHY IT IS HERE:
 *
 *  1. The flag itself. `changelog` must name a generator that really resolves and
 *     really exports the two functions Changesets calls. `false` is a legal value
 *     that silently produces no version heading at all, which is the state this
 *     work replaced.
 *  2. THE DEFECT, ASSERTED DIRECTLY: no `[Unreleased]` heading and no
 *     `[Unreleased]` link definition survive in the file. With generation on, a
 *     surviving hand-maintained `[Unreleased]` heading is worse than before, not
 *     better: the generated version section is prepended ABOVE it, leaving already
 *     released content sitting under "Unreleased" forever.
 *  3. That the file is still shipped. If it ever leaves `files`, tests 2 and 4 are
 *     still nice-to-have but stop being about a consumer-visible defect, and the
 *     next reader deserves to be told which it is.
 *  4. END TO END, AGAINST THE REAL TOOL. The repo's real `CHANGELOG.md` and real
 *     `.changeset/config.json` are copied into a throwaway package, a synthetic
 *     changeset is added, and the real `changeset version` is run. A test that
 *     reimplements where Changesets inserts text proves only that the test agrees
 *     with itself, and would keep passing through the upgrade that moved it. The
 *     released document must satisfy the shape rule TOO, and the archived history
 *     must come through byte identical: a rule that only held before the first
 *     release would wedge this repo the first time this configuration worked.
 *  5. TWO CONSECUTIVE RELEASES, because one proves less than it looks like it
 *     does. The second release is where the sharp edge is: `## 0.0.9` is a
 *     SUBSTRING of the `## 0.0.10` that follows it, so any check written with
 *     `String.indexOf` or a substring `toContain` over a version heading passes on
 *     the first release and reds on the second, in a Version PR, with the changeset
 *     already consumed. Every version-heading comparison here is an exact match
 *     against the heading list for that reason.
 *  6. A CONTROL PROVING THE FLAG IS LOAD-BEARING. The same inputs with
 *     `"changelog": false` must produce NO version heading. Without this, test 4
 *     would pass on a config change that did nothing.
 *  7. THE SHAPE RULE, and the negative control that explains it. Changesets
 *     prepends by replacing the FIRST newline in the file, so exactly one line can
 *     sit above generated output. The rule is that NOTHING BUT THE H1 sits above
 *     the first heading, which is what makes the splice land between two headings
 *     instead of cutting a paragraph in half. It is deliberately not "the archive
 *     heading comes second": a release puts its own version heading there. The
 *     control reproduces the damage on the shape this file used to have, so the
 *     rule is demonstrated rather than asserted.
 *
 * Every case runs in a temp directory built from scratch, and every mutation
 * happens there: nothing here writes into the repo, bumps its version, or consumes
 * a real changeset. The temp tree links this repo's Prettier and Prettier config in
 * because Changesets reformats the whole document it writes and falls back to its
 * own bundled Prettier 2 when it finds none, which is not the formatter any release
 * of this package uses.
 *
 * MEASURED WHILE BUILDING THIS, AND WORTH KNOWING BEFORE DEBUGGING A RELEASE:
 * Changesets wraps the changelog write in a try/catch that only `console.warn`s.
 * A tree where `package.json` declares a Prettier config that cannot be resolved
 * bumps the version, consumes the changeset, and writes NO changelog at all, with
 * a warning as the only signal. Reproduced here on this repo's own inputs by
 * declaring `"prettier": "@cosyte/prettier-config"` with no `node_modules`: the
 * version went to `0.0.1` and `CHANGELOG.md` came back byte identical. Nothing in
 * this repo can prevent that (it is upstream, and it is why the temp trees below
 * link the config in rather than only naming it), but a release that publishes
 * with an unchanged changelog is that failure, not a config that quietly reverted.
 *
 * SECURITY: every subprocess call uses spawnSync with array args. No exec, no
 * shell-form.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, it, expect, afterAll } from "vitest";

const REPO_ROOT = process.cwd();
const CHANGELOG_PATH = join(REPO_ROOT, "CHANGELOG.md");
const CONFIG_PATH = join(REPO_ROOT, ".changeset", "config.json");
const CHANGESET_BIN = join(REPO_ROOT, "node_modules", "@changesets", "cli", "bin.js");

/** The heading the hand-written history was moved under. Generated sections sit above it. */
const ARCHIVE_HEADING = "## Released before this file was generated";
const PROBE_SUMMARY = "A synthetic entry written by the changelog generation test.";
/**
 * The probe's summary deliberately QUOTES THE ARCHIVE HEADING on a line of its own. A real
 * changeset may do this (the one shipping this change does), and a quoted copy lands in
 * generated output ABOVE the real heading, where a substring search would find it first and
 * every helper anchored on it would measure the wrong block. Changesets indents every line
 * of a summary after the first, so the copy cannot start at column 0; this is what proves it.
 */
const PROBE_BODY = `${PROBE_SUMMARY}\n\n${ARCHIVE_HEADING}\n`;

const changelog = readFileSync(CHANGELOG_PATH, "utf8");
const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as { changelog?: unknown };

/** The two functions Changesets calls on whatever `changelog` names. */
interface ChangelogFunctions {
  getReleaseLine?: unknown;
  getDependencyReleaseLine?: unknown;
}
type ChangelogModule = ChangelogFunctions & { default?: ChangelogFunctions };

const roots: string[] = [];

afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

/**
 * Build a throwaway single-package repo and run the real `changeset version` in it.
 * Returns the resulting `CHANGELOG.md` and the version `package.json` was bumped to.
 */
function runVersion(opts: {
  changelogBody: string;
  changelogSetting: unknown;
  /** Version the throwaway package starts at. A `patch` changeset bumps it by one. */
  from?: string;
}): {
  changelog: string;
  version: string;
} {
  const dir = mkdtempSync(join(tmpdir(), "x12-changelog-"));
  roots.push(dir);
  mkdirSync(join(dir, ".changeset"));
  writeFileSync(join(dir, "CHANGELOG.md"), opts.changelogBody);
  writeFileSync(
    join(dir, ".changeset", "config.json"),
    JSON.stringify({
      changelog: opts.changelogSetting,
      commit: false,
      fixed: [],
      linked: [],
      access: "public",
      baseBranch: "main",
      updateInternalDependencies: "patch",
      ignore: [],
    }),
  );
  writeFileSync(
    join(dir, ".changeset", "probe.md"),
    `---\n"@cosyte/x12": patch\n---\n\n${PROBE_BODY}`,
  );
  // `private` keeps the throwaway package unpublishable even if it escaped the temp dir.
  // `prettier` is declared because Changesets reformats the whole document it writes, and
  // it must be reformatted the way THIS repo formats it or the run proves nothing about
  // what lands on the Version PR.
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "@cosyte/x12",
      version: opts.from ?? "0.0.0",
      private: true,
      prettier: "@cosyte/prettier-config",
    }),
  );
  // Changesets resolves Prettier from the tree it is writing into (`require.resolve` with
  // `paths: [cwd]`) and falls back to its own BUNDLED Prettier 2 when it finds none. That
  // fallback ignores this repo's config and reflows the archived history, so a temp tree
  // without these two links would exercise a formatter no release ever uses. Links rather
  // than copies: pnpm's own `node_modules` entries are links already.
  mkdirSync(join(dir, "node_modules", "@cosyte"), { recursive: true });
  symlinkSync(join(REPO_ROOT, "node_modules", "prettier"), join(dir, "node_modules", "prettier"));
  symlinkSync(
    join(REPO_ROOT, "node_modules", "@cosyte", "prettier-config"),
    join(dir, "node_modules", "@cosyte", "prettier-config"),
  );

  const r = spawnSync(process.execPath, [CHANGESET_BIN, "version"], {
    cwd: dir,
    encoding: "utf8",
    timeout: 60_000,
  });
  expect(r.status, `${r.stdout ?? ""}${r.stderr ?? ""}`).toBe(0);

  const bumped = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { version: string };
  return { changelog: readFileSync(join(dir, "CHANGELOG.md"), "utf8"), version: bumped.version };
}

/** Every ATX heading in a markdown document, in document order. */
const headings = (text: string): string[] =>
  text.split("\n").filter((line) => /^#{1,6} /.test(line));

/**
 * The one structural rule this file has to keep, stated so that it survives a release.
 *
 * Changesets prepends a release by replacing the FIRST newline in the document, so exactly
 * one line can sit above generated output and everything else is pushed below the newest
 * release section. The rule is therefore NOT "the archive heading comes second": a release
 * legitimately puts its own `## <version>` heading there, and asserting the pre-release
 * neighbour would red the first Version PR that this configuration ever opens. The rule is
 * that nothing but the H1 sits above the first heading, so whatever the release splices in
 * lands between two headings and can never cut a paragraph in half.
 *
 * Returns a description of the violation, or `undefined` if the document is well shaped.
 */
function shapeViolation(text: string): string | undefined {
  const lines = text.split("\n");
  if (lines[0] !== "# Changelog") return `line 1 is ${JSON.stringify(lines[0])}, not the H1`;
  const next = lines.slice(1).find((line) => line.trim() !== "");
  if (next === undefined) return "the document has no content below the H1";
  if (!/^## /.test(next)) return `prose above the first heading: ${JSON.stringify(next)}`;
  const anchors = lines.filter((line) => line === ARCHIVE_HEADING).length;
  if (anchors !== 1) return `expected exactly one archived-history heading, found ${anchors}`;
  return undefined;
}

/**
 * The header block of the archived half: from its heading down to its first entry section.
 *
 * The heading is located as a WHOLE LINE, not with `indexOf`. A changeset summary may quote
 * it (this slice's own does), and a quoted copy inside a release section sits above the real
 * heading, so a substring search would slice a few characters out of generated output and the
 * future-tense guard below would silently stop reading the preamble it exists to protect.
 * A whole-line match cannot collide: `getReleaseLine` in `@changesets/changelog-git` prefixes
 * the first line of every summary with `- ` and indents every later line by two spaces, so no
 * line inside a release section begins at column 0. `shapeViolation` asserts the count is one,
 * so if that ever stops holding this fails loudly instead of measuring the wrong block.
 */
function archivePreamble(text: string): string {
  const lines = text.split("\n");
  const start = lines.indexOf(ARCHIVE_HEADING);
  if (start === -1) return "";
  const end = lines.findIndex((line, i) => i > start && line.startsWith("### "));
  return (end === -1 ? lines.slice(start) : lines.slice(start, end)).join("\n");
}

/** Everything from the archived-history heading down, located the same whole-line way. */
function archivedHistory(text: string): string {
  const lines = text.split("\n");
  const start = lines.indexOf(ARCHIVE_HEADING);
  return start === -1 ? "" : lines.slice(start).join("\n");
}

describe("changelog generation is on", () => {
  it("names a changelog generator that resolves and exports what Changesets calls", () => {
    // `false` is the value this package shipped its whole published history under,
    // and it is the reason no release ever wrote a version heading.
    expect(config.changelog).not.toBe(false);
    expect(typeof config.changelog).toBe("string");

    const require = createRequire(CONFIG_PATH);
    const mod = require(config.changelog as string) as ChangelogModule;
    const fns = mod.default ?? mod;
    expect(typeof fns.getReleaseLine).toBe("function");
    expect(typeof fns.getDependencyReleaseLine).toBe("function");
  });

  it("keeps CHANGELOG.md in the published tarball, which is why any of this matters", () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
      files?: string[];
    };
    expect(pkg.files ?? []).toContain("CHANGELOG.md");
  });
});

describe("CHANGELOG.md carries no hand-maintained Unreleased section", () => {
  it("has no [Unreleased] heading", () => {
    // With generation on this is not merely stale: the release prepends its version
    // section ABOVE this heading, so released content would sit under "Unreleased"
    // permanently, in the tarball.
    expect(headings(changelog).filter((h) => h.includes("[Unreleased]"))).toEqual([]);
  });

  it("has no [Unreleased] link definition left behind", () => {
    expect(changelog).not.toMatch(/^\[Unreleased\]:/m);
  });

  it("makes no future-tense promise about a release in its preamble", () => {
    // A sibling parser's published preamble once read that the first release "will
    // ship" an API surface that had already shipped, in this same file.
    //
    // The block is located by the ARCHIVE HEADING, not by the first `### ` in the
    // document. Anchoring on the first `### ` measures the whole header today and
    // 23 bytes of generated output after the first release, at which point this
    // assertion would silently stop reading the preamble it exists to guard.
    const preamble = archivePreamble(changelog);
    expect(preamble.length).toBeGreaterThan(200);
    expect(preamble).not.toMatch(/will ship/i);
  });
});

describe("the shape that makes generated output land correctly", () => {
  it("puts nothing but the H1 above the first heading", () => {
    expect(shapeViolation(changelog)).toBeUndefined();
  });

  it(
    "writes the new version section between the H1 and the archived history",
    { timeout: 90_000 },
    () => {
      const result = runVersion({
        changelogBody: changelog,
        changelogSetting: config.changelog,
      });

      expect(result.version).not.toBe("0.0.0");
      expect(headings(result.changelog).slice(0, 3)).toEqual([
        "# Changelog",
        `## ${result.version}`,
        "### Patch Changes",
      ]);
      // The archived history survives, below the release that was just written.
      // Compared as HEADINGS, not as string offsets: a version heading is a prefix of
      // the ones that follow it, so `## 0.0.1` is a substring of `## 0.0.10`.
      const order = headings(result.changelog);
      expect(order).toContain(ARCHIVE_HEADING);
      expect(order.indexOf(`## ${result.version}`)).toBeLessThan(order.indexOf(ARCHIVE_HEADING));
      // The changeset's own summary is what landed as the entry.
      expect(result.changelog).toContain(PROBE_SUMMARY);
      // AND THE INVARIANT IS CLOSED UNDER A RELEASE: the file a release produces is
      // itself a file the next release can be prepended to. Without this the suite
      // would only ever prove the shape of a file no release had touched yet, which
      // is exactly the file that stops existing the moment this configuration works.
      expect(shapeViolation(result.changelog)).toBeUndefined();
      // The archived history comes through BYTE IDENTICAL. This is the assertion that
      // makes the formatter part of the test: the release reformats the whole document
      // through Prettier, so an entry the archive already carried must survive that
      // pass unchanged or the Version PR reds `format:check` on a file nobody edited.
      expect(archivedHistory(result.changelog)).toBe(archivedHistory(changelog));
    },
  );

  it(
    "keeps every rule in this file true across two consecutive releases",
    // Above the two 60s `spawnSync` ceilings this case can spend, so a hung subprocess
    // reports as itself rather than as a case timeout.
    { timeout: 150_000 },
    () => {
      // One release is not enough to prove this file is releasable indefinitely, and the
      // second release is where the sharp edge is: `## 0.0.9` is a SUBSTRING of the
      // `## 0.0.10` that follows it, so any assertion here written with `indexOf` or
      // `toContain` over a version heading passes on the first release and reds on the
      // second, in a Version PR, with the changeset already consumed.
      const first = runVersion({
        changelogBody: changelog,
        changelogSetting: config.changelog,
        from: "0.0.8",
      });
      expect(first.version).toBe("0.0.9");

      const second = runVersion({
        changelogBody: first.changelog,
        changelogSetting: config.changelog,
        from: first.version,
      });
      expect(second.version).toBe("0.0.10");

      expect(headings(second.changelog).slice(0, 5)).toEqual([
        "# Changelog",
        "## 0.0.10",
        "### Patch Changes",
        "## 0.0.9",
        "### Patch Changes",
      ]);
      // Newest first, the archive last, and the history untouched by either release.
      const order = headings(second.changelog);
      expect(order.indexOf("## 0.0.9")).toBeLessThan(order.indexOf(ARCHIVE_HEADING));
      expect(shapeViolation(second.changelog)).toBeUndefined();
      expect(archivePreamble(second.changelog)).toBe(archivePreamble(changelog));
      expect(archivedHistory(second.changelog)).toBe(archivedHistory(changelog));
    },
  );

  it(
    "writes no version heading at all when the generator is off (the control)",
    { timeout: 90_000 },
    () => {
      const result = runVersion({ changelogBody: changelog, changelogSetting: false });

      expect(result.version).not.toBe("0.0.0");
      // The version bump still happens. The changelog is simply never touched,
      // which is the whole defect: nothing tells a reader the release went out.
      expect(result.changelog).toBe(changelog);
      // As a HEADING, not a substring. The throwaway package always bumps to the same
      // version, and `## 0.0.1` is a substring of the `## 0.0.10` that a later release
      // will legitimately have written into the committed file: a `toContain` here goes
      // red on a real release, which is the failure this whole file exists to prevent.
      expect(headings(result.changelog)).not.toContain(`## ${result.version}`);
      expect(result.changelog).not.toContain(PROBE_SUMMARY);
    },
  );

  it(
    "splits the header when prose follows the H1 (the negative control)",
    { timeout: 90_000 },
    () => {
      const oldShape = [
        "# Changelog",
        "",
        "All notable changes to this project will be documented in this file.",
        "",
        "## [Unreleased]",
        "",
        "### Added",
        "",
        "- something that has already shipped",
        "",
      ].join("\n");

      const result = runVersion({
        changelogBody: oldShape,
        changelogSetting: config.changelog,
      });

      // The release section is inserted between the H1 and the preamble, so the
      // preamble now reads as part of the release, and `[Unreleased]` still holds
      // shipped content below it.
      expect(headings(result.changelog)).toEqual([
        "# Changelog",
        `## ${result.version}`,
        "### Patch Changes",
        "## [Unreleased]",
        "### Added",
      ]);
      expect(result.changelog.indexOf("All notable changes")).toBeGreaterThan(
        result.changelog.indexOf(PROBE_SUMMARY),
      );
    },
  );
});

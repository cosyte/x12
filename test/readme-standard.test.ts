import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * README standard gate. `README.md` is the npm package page and the repository landing page, and an
 * npm README is FROZEN AT PUBLISH: a wrong banner URL, a wrong version claim or a wrong PHI
 * statement is fixable only by publishing another version. So the house README standard is held
 * here as a test rather than swept by hand once.
 *
 * **The ORDER of the file is asserted, not just the presence of its parts.** A reader, and
 * increasingly an agent deciding whether to depend on this package, reads top to bottom, so a
 * section that exists in the wrong place is a different document from the one the standard
 * describes.
 *
 * **Three couplings to `package.json` are deliberate and are half the point of this file.** The
 * description paragraph, the version named in `## Status` and the engine floor named in
 * `## Install` all FOLLOW `package.json`, and each is pinned by a drift check that names BOTH
 * values when they diverge. Changing `description`, `version` or `engines.node` without updating
 * this page fails `pnpm test` instead of shipping a page that contradicts the manifest beside it.
 *
 * **Every rule is a free function over its inputs**, driven by fabricated data in the CONTROL block
 * at the bottom. A gate that can only be run on the real file cannot be shown to fail, and the
 * failure DIRECTIONS (a missing heading, a misordered heading, a drifted value, a link with no file
 * behind it, a repo-root citation missing from `files`) are the half that matters.
 *
 * Read the scope literally: this asserts the SHAPE and the COUPLINGS of the page, plus the presence
 * of the accuracy claims the page has already earned. It does not, and cannot, assert that the
 * prose around them is true. The em-dash rule, the internal-bookkeeping rule and formatting live in
 * `pnpm check:no-emdash`, `pnpm check:no-internal-refs` and `pnpm format:check`, each scanning a
 * wider surface than this file; nothing here duplicates them.
 */
const root = join(import.meta.dirname, "..");
const readme = readFileSync(join(root, "README.md"), "utf8");
const readmeLines = readme.split("\n");

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  name: string;
  version: string;
  description: string;
  license: string;
  files: readonly string[];
  engines: { node: string };
  exports: Record<string, unknown>;
};

/**
 * The alt string for the light tile. It is owned by the `assets` repository, where it is CENTRAL in
 * `alt-text.json` and is never hand-written, so this constant is a transcription of that record and
 * the banner must equal it character for character. The README carried a different, hand-written
 * string until this gate landed.
 */
const BANNER_ALT = "The Cosyte logo on its own white ground: the icon beside the word Cosyte.";

const LIGHT_TILE = "https://cosyte.com/tile/cosyte-lockup-tile-on-light-1200x300.png";
const DARK_TILE = "https://cosyte.com/tile/cosyte-lockup-tile-on-dark-1200x300.png";

/** The house section set, in the order the standard puts them. `License` is last by rule. */
const REQUIRED_SECTIONS = [
  "Why this exists",
  "Status",
  "Install",
  "Usage",
  "PHI and safety",
  "Contributing",
  "License",
];

/** A markdown badge line: an image wrapped in a link, alone on its line. */
const BADGE_LINE = /^\[!\[([^\]]*)]\([^)]*\)]\([^)]*\)$/;

// ---------------------------------------------------------------------------
// Document model. Small, deliberate, shared by every rule below.
// ---------------------------------------------------------------------------

/** The text of every `##` heading, in document order. */
function sectionHeadings(markdown: string): string[] {
  const found: string[] = [];
  for (const line of markdown.split("\n")) {
    const text = /^##\s+(\S.*?)\s*$/.exec(line)?.[1];
    if (text !== undefined) found.push(text);
  }
  return found;
}

/** The body of one `##` section, heading line excluded, or `undefined` when the section is absent. */
function sectionBody(markdown: string, heading: string): string | undefined {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => /^##\s+(\S.*?)\s*$/.exec(line)?.[1] === heading);
  if (start === -1) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^##\s/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/** Bold, code and emphasis markers removed, so a phrase check is not accidentally a markup check. */
function plainText(markdown: string): string {
  return markdown.replaceAll(/[*`_]/g, "");
}

/**
 * Markup stripped AND whitespace collapsed to single spaces. Every phrase check below runs on this
 * rather than on the raw text: the page is hard-wrapped at 100 columns, so a phrase check against
 * the raw file is really a check on where the line happens to break, and reflowing a paragraph
 * would red a claim the page still makes.
 */
function flatten(markdown: string): string {
  return plainText(markdown).replaceAll(/\s+/g, " ");
}

/** A section body with its fenced code blocks removed, for prose-shaped rules. */
function proseOnly(body: string): string {
  return body.replaceAll(/```[\s\S]*?```/g, "");
}

const headings = sectionHeadings(readme);

/** The body of a section that MUST be present; the order rule reports its absence first. */
function bodyOf(heading: string): string {
  const body = sectionBody(readme, heading);
  if (body === undefined) throw new Error(`README.md has no "## ${heading}" section`);
  return body;
}

/** The banner block: everything before the first heading line. */
function bannerBlock(lines: readonly string[]): string {
  const firstHeading = lines.findIndex((line) => line.startsWith("#"));
  return lines.slice(0, firstHeading === -1 ? lines.length : firstHeading).join("\n");
}

// ---------------------------------------------------------------------------
// Rules. Each is a free function; each has a CONTROL driving it with fabricated input.
// ---------------------------------------------------------------------------

/**
 * The heading problem, if any: a required heading absent, duplicated, or out of the standard's
 * relative order, or a required-last heading that is not last.
 *
 * Extra sections BETWEEN required ones are allowed: the standard names `## API` and
 * `## Compatibility` as optional, and this repository also carries `## Trademarks`. So only the
 * RELATIVE order of the required set is a rule, and the message names the heading and the position
 * it was expected in.
 *
 * @param present - Every `##` heading in the file, in document order.
 * @param required - The required headings, in the order the standard puts them.
 * @returns A message, or `undefined` when the file is in order.
 */
function headingProblem(
  present: readonly string[],
  required: readonly string[],
): string | undefined {
  for (const want of required) {
    const first = present.indexOf(want);
    if (first === -1) return `missing "## ${want}"`;
    if (present.lastIndexOf(want) !== first) return `duplicated "## ${want}"`;
  }
  for (let i = 1; i < required.length; i += 1) {
    const previous = required[i - 1] ?? "";
    const want = required[i] ?? "";
    if (present.indexOf(want) < present.indexOf(previous)) {
      return `"## ${want}" is out of order: expected it after "## ${previous}"`;
    }
  }
  const last = required[required.length - 1] ?? "";
  const actual = present[present.length - 1];
  if (actual !== last) {
    return `"## ${last}" must be the last section; found "## ${actual ?? "(none)"}"`;
  }
  return undefined;
}

/**
 * A drift problem between a value the README states and the value `package.json` declares.
 *
 * @param label - What drifted, for the message.
 * @param inReadme - The value the README states, or `undefined` when it states none.
 * @param inPackage - The value `package.json` declares.
 * @returns A message naming BOTH values, or `undefined` when they agree.
 */
function driftProblem(
  label: string,
  inReadme: string | undefined,
  inPackage: string,
): string | undefined {
  if (inReadme === undefined) {
    return `README.md states no ${label}; package.json says "${inPackage}"`;
  }
  return inReadme === inPackage
    ? undefined
    : `${label} drift: README.md says "${inReadme}", package.json says "${inPackage}"`;
}

/** Every relative link target: not absolute, not a scheme link, not an in-page anchor. */
function relativeLinkTargets(markdown: string): string[] {
  const targets = new Set<string>();
  for (const match of markdown.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (target === undefined) continue;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
    targets.add(target.replace(/^\.\//, ""));
  }
  return [...targets].sort();
}

/**
 * The relative link targets with no file behind them.
 *
 * @param targets - Relative targets, repo-root relative.
 * @param exists - Existence predicate, injected so the control can drive this without a filesystem.
 * @returns The targets that resolve to nothing, sorted.
 */
function danglingLinks(
  targets: readonly string[],
  exists: (target: string) => boolean,
): readonly string[] {
  return targets.filter((target) => !exists(target)).sort();
}

/**
 * The linked repo-root markdown files that `package.json` `files` leaves out of the tarball. An
 * installed copy cannot open one of those, so the link is dead for exactly the reader who installed
 * the package. Scoped to repo-ROOT names on purpose: a link into a directory is governed by whether
 * that directory ships, which is a different rule with a different remedy.
 *
 * @param targets - Relative targets, repo-root relative.
 * @param files - The `files` array from `package.json`.
 * @returns The unshipped root docs, by name, sorted.
 */
function unshippedRootDocs(
  targets: readonly string[],
  files: readonly string[],
): readonly string[] {
  const shipped = new Set(files);
  return targets
    .filter((target) => !target.includes("/") && target.endsWith(".md") && !shipped.has(target))
    .sort();
}

/**
 * Whether a version is at or past `0.1.0`, which is where the standard's stability wording changes.
 *
 * @param version - A `major.minor.patch` version string.
 * @returns `true` at `0.1.0` and later.
 */
function isAtLeast010(version: string): boolean {
  const [major, minor] = version.split(".");
  return Number(major ?? "0") > 0 || Number(minor ?? "0") >= 1;
}

/** The wording the standard requires of a `0.1.0` status, verbatim. */
const SETTLED_CLAIM = "settled and safe to depend on";

/**
 * The `## Status` problem, if any. The section must name the version `package.json` declares, say
 * what that version claims about API stability, and name at least one surface still moving or not
 * covered. At `0.1.0` and later the stability claim has a required wording.
 *
 * @param body - The `## Status` body.
 * @param version - `package.json` `version`.
 * @returns A message, or `undefined`.
 */
function statusProblem(body: string, version: string): string | undefined {
  const flat = flatten(body);
  const stated = /\b\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\b/.exec(flat)?.[0];
  const drift = driftProblem("version", stated, version);
  if (drift !== undefined) return drift;
  if (!/\bAPI\b/.test(flat)) {
    return '"## Status" says nothing about API stability: name what this version claims';
  }
  if (!/not covered|out of scope|still moving|may still move|not settled/i.test(flat)) {
    return '"## Status" names no surface still moving or not covered';
  }
  if (isAtLeast010(version) && !flat.includes(SETTLED_CLAIM)) {
    return `"## Status" at ${version} must state that the public API is "${SETTLED_CLAIM}", in those words`;
  }
  return undefined;
}

/**
 * The `## Why this exists` problem, if any: two to four sentences naming the problem removed, for
 * whom, the nearest alternative, and why this is not it. The alternative is the half a
 * restatement-only section always misses, so it is the half that is asserted.
 *
 * @param body - The `## Why this exists` body.
 * @returns A message, or `undefined`.
 */
function whyProblem(body: string): string | undefined {
  const text = proseOnly(body).trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim().length > 0);
  if (sentences.length < 2 || sentences.length > 4) {
    return `"## Why this exists" must be two to four sentences; found ${sentences.length}`;
  }
  if (!/alternativ/i.test(text)) {
    return '"## Why this exists" names no alternative: a section that only restates what the library does never says why this is not the nearest thing to it';
  }
  return undefined;
}

/**
 * The `## Install` problem, if any: a copy-pasteable block naming the package manager, plus an
 * engine floor and a module format that both agree with `package.json`.
 *
 * @param body - The `## Install` body.
 * @param packageName - `package.json` `name`.
 * @param engineFloor - `package.json` `engines.node`.
 * @param exportsMap - `package.json` `exports`.
 * @returns A message, or `undefined`.
 */
function installProblem(
  body: string,
  packageName: string,
  engineFloor: string,
  exportsMap: Record<string, unknown>,
): string | undefined {
  const fenced = /```\w*\n([\s\S]*?)```/.exec(body)?.[1];
  if (fenced === undefined) return '"## Install" carries no copy-pasteable install block';
  const install = new RegExp(String.raw`(?:pnpm add|npm install|yarn add) ${packageName}\b`);
  if (!install.test(fenced)) {
    return `"## Install" block names no package-manager install of ${packageName}`;
  }
  if (!body.includes(engineFloor)) return driftProblem("Node engine floor", undefined, engineFloor);
  const claimsDual = /\bESM\b/.test(body) && /\bCJS\b/.test(body);
  const entry = exportsMap["."];
  const shipsDual =
    typeof entry === "object" && entry !== null && "import" in entry && "require" in entry;
  if (claimsDual !== shipsDual) {
    return `module format drift: README.md ${claimsDual ? "claims" : "does not claim"} dual ESM and CJS, package.json exports ${shipsDual ? "does" : "does not"} declare both conditions`;
  }
  return undefined;
}

/**
 * The four accuracy claims this page had already earned before it was standardized, as each reads
 * with markup stripped. A standardization sweep deletes prose, and these are the four a sweep is
 * most likely to take.
 */
const EARNED_FACTS = [
  {
    name: "only four structural failures are ever fatal",
    phrase: "four structural failures are ever fatal",
  },
  {
    name: "the round trip is not byte-exact in general",
    phrase: "serialize(parse(s)) === s is not guaranteed in general",
  },
  { name: "no EDI amount is ever handed to parseFloat", phrase: "never parseFloats an EDI amount" },
  { name: "the X12ParseError.snippet PHI exception", phrase: "X12ParseError.snippet" },
];

/**
 * The earned facts a page has dropped, reported BY NAME.
 *
 * @param markdown - The whole README.
 * @param facts - The facts to look for.
 * @returns The names of the facts that are absent.
 */
function missingFacts(
  markdown: string,
  facts: readonly { name: string; phrase: string }[],
): readonly string[] {
  const plain = flatten(markdown);
  return facts.filter((fact) => !plain.includes(fact.phrase)).map((fact) => fact.name);
}

/** The trimmed contents of every fixture committed under `test/fixtures`, mapped to its path. */
function committedFixtureTexts(dir: string): Map<string, string> {
  const byText = new Map<string, string>();
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else byText.set(readFileSync(full, "utf8").trimEnd(), relative(root, full));
    }
  };
  walk(dir);
  return byText;
}

/** Every backtick-quoted literal in the markdown that holds interchange text. */
function interchangeLiterals(markdown: string): string[] {
  const literals: string[] = [];
  for (const match of markdown.matchAll(/`([^`]*\bISA\*[^`]*)`/g)) {
    const literal = match[1];
    if (literal !== undefined) literals.push(literal);
  }
  return literals;
}

// ---------------------------------------------------------------------------

describe("README.md follows the house standard", () => {
  it("opens with the banner block, before any heading", () => {
    const banner = bannerBlock(readmeLines).trim();
    expect(banner.startsWith('<a href="https://cosyte.com">')).toBe(true);
    expect(banner).toContain("<picture>");
  });

  it("carries only absolute cosyte.com tile URLs, dark by media query and light as the fallback", () => {
    const banner = bannerBlock(readmeLines);
    expect(banner).toContain(`<source media="(prefers-color-scheme: dark)" srcset="${DARK_TILE}">`);
    // A renderer that drops <source> must still show something, so the <img> takes the LIGHT tile.
    expect(banner).toMatch(new RegExp(String.raw`<img alt="[^"]*" src="${LIGHT_TILE}">`));
    for (const match of banner.matchAll(/(?:src|srcset)="([^"]+)"/g)) {
      expect(match[1]).toMatch(/^https:\/\/cosyte\.com\/tile\//);
    }
  });

  it("carries the declared banner alt string, character for character", () => {
    expect(/<img alt="([^"]*)"/.exec(readme)?.[1]).toBe(BANNER_ALT);
  });

  it("titles the page with the npm package name", () => {
    expect(readmeLines.find((line) => line.startsWith("# "))).toBe(`# ${pkg.name}`);
  });

  it("carries a one-line tagline blockquote of at most 120 characters", () => {
    const titleAt = readmeLines.findIndex((line) => line.startsWith("# "));
    const taglineAt = readmeLines.findIndex((line, i) => i > titleAt && line.startsWith("> "));
    expect(taglineAt).toBeGreaterThan(titleAt);
    expect(readmeLines[taglineAt + 1]?.startsWith(">")).toBe(false);
    expect((readmeLines[taglineAt] ?? "").slice(2).length).toBeLessThanOrEqual(120);
  });

  it("carries exactly the four house badges, in order, with no heading above them", () => {
    const alts = readmeLines
      .map((line) => BADGE_LINE.exec(line)?.[1])
      .filter((alt): alt is string => alt !== undefined);
    expect(alts).toHaveLength(4);
    expect(alts[0]).toMatch(/^npm version/);
    expect(alts[1]).toMatch(/^CI/);
    expect(alts[2]).toMatch(/^License/);
    expect(alts[3]).toMatch(/^Node/);
    const firstBadgeAt = readmeLines.findIndex((line) => BADGE_LINE.test(line));
    const firstSectionAt = readmeLines.findIndex((line) => /^##\s/.test(line));
    expect(firstBadgeAt).toBeGreaterThan(readmeLines.findIndex((line) => line.startsWith("# ")));
    expect(firstBadgeAt).toBeLessThan(firstSectionAt);
  });

  it("states the package description verbatim, as its own plain paragraph", () => {
    const lastBadgeAt = readmeLines.findLastIndex((line) => BADGE_LINE.test(line));
    const firstSectionAt = readmeLines.findIndex((line) => /^##\s/.test(line));
    const paragraph = readmeLines
      .slice(lastBadgeAt + 1, firstSectionAt)
      .filter((line) => line.trim().length > 0)
      .join(" ")
      .trim();
    expect(driftProblem("description", paragraph, pkg.description)).toBeUndefined();
  });

  it("presents the required sections in the standard's order, with License last", () => {
    expect(headingProblem(headings, REQUIRED_SECTIONS)).toBeUndefined();
  });

  it("names the version package.json declares, and says what it claims", () => {
    expect(statusProblem(bodyOf("Status"), pkg.version)).toBeUndefined();
  });

  it("says why it exists, and against what", () => {
    expect(whyProblem(bodyOf("Why this exists"))).toBeUndefined();
  });

  it("installs from a copy-pasteable block that agrees with the manifest", () => {
    expect(
      installProblem(bodyOf("Install"), pkg.name, pkg.engines.node, pkg.exports),
    ).toBeUndefined();
  });

  it("states what happens to patient data, and names the snippet exception", () => {
    const flat = flatten(bodyOf("PHI and safety"));
    expect(flat).toContain("X12ParseError.snippet");
    expect(flat).toContain("is not redacted");
    expect(flat).toContain("bounded copy");
    expect(flat).toMatch(/disk/i);
    expect(flat).toMatch(/log/i);
    expect(flat).toMatch(/still own/i);
  });

  it("says where to ask, whether pull requests are accepted, and what a contribution must clear", () => {
    const flat = flatten(bodyOf("Contributing"));
    expect(flat).toContain("https://github.com/cosyte/x12/issues");
    expect(flat).toMatch(/pull requests? are/i);
    expect(flat).toMatch(/must clear/i);
  });

  it("names the SPDX identifier and the owner, agreeing with package.json", () => {
    const flat = flatten(bodyOf("License"));
    expect(
      driftProblem(
        "license",
        /\b(MIT|Apache-2\.0|BSD-3-Clause|ISC)\b/.exec(flat)?.[0],
        pkg.license,
      ),
    ).toBeUndefined();
    expect(flat).toContain("Cosyte");
  });

  it("keeps the Trademarks section, its names and its disclaimer", () => {
    const flat = flatten(bodyOf("Trademarks"));
    expect(flat).toContain("Availity");
    expect(flat).toContain("Blue Cross Blue Shield");
    expect(flat).toMatch(/not affiliated/i);
    expect(flat).toContain("TRADEMARKS.md");
  });

  it("still states each of the four accuracy claims the page earned", () => {
    expect(missingFacts(readme, EARNED_FACTS)).toEqual([]);
    // The snippet exception is two halves: the field, and the fact that it is not redacted.
    expect(flatten(readme)).toContain("is not redacted");
  });

  it("resolves every relative link to a file that exists", () => {
    const targets = relativeLinkTargets(readme);
    expect(targets.length).toBeGreaterThan(0);
    expect(danglingLinks(targets, (target) => existsSync(join(root, target)))).toEqual([]);
  });

  it("cites no repo-root markdown that the tarball leaves out", () => {
    expect(unshippedRootDocs(relativeLinkTargets(readme), pkg.files)).toEqual([]);
  });

  it("holds no interchange text that is not a synthetic fixture committed under test/fixtures", () => {
    // "No real PHI anywhere in the file", made checkable: the only X12 on this page is a byte-for-byte
    // copy of a fixture the PHI gate already sweeps, and no loose segment text sits beside it.
    const literals = interchangeLiterals(readme);
    expect(literals.length).toBeGreaterThan(0);
    expect((readme.match(/ISA\*/g) ?? []).length).toBe(literals.length);
    const fixtures = committedFixtureTexts(join(root, "test", "fixtures"));
    for (const literal of literals) expect(fixtures.has(literal.trimEnd())).toBe(true);
  });
});

describe("CONTROL: each README rule reports what it exists to catch", () => {
  const required = ["Alpha", "Beta", "Gamma"];

  it("a missing heading is named", () => {
    expect(headingProblem(["Alpha", "Gamma"], required)).toBe('missing "## Beta"');
  });

  it("a duplicated heading is named", () => {
    expect(headingProblem(["Alpha", "Beta", "Gamma", "Beta"], required)).toBe(
      'duplicated "## Beta"',
    );
  });

  it("a misordered heading names the position it was expected in", () => {
    expect(headingProblem(["Beta", "Alpha", "Gamma"], required)).toBe(
      '"## Beta" is out of order: expected it after "## Alpha"',
    );
    expect(headingProblem(["Alpha", "Gamma", "Beta"], required)).toBe(
      '"## Gamma" is out of order: expected it after "## Beta"',
    );
  });

  it("the required-last heading must actually be last", () => {
    expect(headingProblem(["Alpha", "Beta", "Gamma", "Extra"], required)).toBe(
      '"## Gamma" must be the last section; found "## Extra"',
    );
  });

  it("an optional section between two required ones is allowed", () => {
    expect(headingProblem(["Alpha", "Intermission", "Beta", "Gamma"], required)).toBeUndefined();
  });

  it("a drifted value is reported naming BOTH values", () => {
    expect(driftProblem("description", "an old sentence.", "a new sentence.")).toBe(
      'description drift: README.md says "an old sentence.", package.json says "a new sentence."',
    );
    expect(driftProblem("version", undefined, "9.9.9")).toBe(
      'README.md states no version; package.json says "9.9.9"',
    );
    expect(driftProblem("version", "9.9.9", "9.9.9")).toBeUndefined();
  });

  it("a version that has drifted from package.json is reported", () => {
    expect(statusProblem("Version 0.0.1. The API may still move.", "0.0.2")).toBe(
      'version drift: README.md says "0.0.1", package.json says "0.0.2"',
    );
  });

  it("a status with no stability claim, and one with no uncovered surface, are both reported", () => {
    expect(statusProblem("Version 1.2.3. Pre-launch.", "1.2.3")).toMatch(/says nothing about API/);
    expect(statusProblem("Version 1.2.3. The API is frozen.", "1.2.3")).toMatch(
      /names no surface still moving/,
    );
  });

  it("at 0.1.0 the required stability wording is enforced, and below it is not", () => {
    expect(
      statusProblem("Version 0.1.0. The public API is stable. Nothing is out of scope.", "0.1.0"),
    ).toBe(
      `"## Status" at 0.1.0 must state that the public API is "${SETTLED_CLAIM}", in those words`,
    );
    expect(
      statusProblem(
        `Version 0.1.0. The public API is ${SETTLED_CLAIM}. The rest is out of scope.`,
        "0.1.0",
      ),
    ).toBeUndefined();
    expect(isAtLeast010("0.0.18")).toBe(false);
    expect(isAtLeast010("0.1.0")).toBe(true);
    expect(isAtLeast010("1.0.0")).toBe(true);
  });

  it("a Why section that only restates what the library does is reported for naming no alternative", () => {
    expect(
      whyProblem("It parses X12. It also emits X12. The types are strict. Money is exact."),
    ).toMatch(/names no alternative/);
    expect(whyProblem("One sentence only.")).toBe(
      '"## Why this exists" must be two to four sentences; found 1',
    );
  });

  it("an Install section that contradicts the manifest is reported", () => {
    const dual = { ".": { import: {}, require: {} } };
    const good = "```bash\npnpm add @cosyte/x12\n```\n\nNode `>=22.0.0`, dual ESM and CJS.";
    expect(installProblem(good, "@cosyte/x12", ">=22.0.0", dual)).toBeUndefined();
    expect(installProblem("No block here.", "@cosyte/x12", ">=22.0.0", dual)).toMatch(
      /no copy-pasteable install block/,
    );
    expect(installProblem(good, "@cosyte/x12", ">=24.0.0", dual)).toMatch(/Node engine floor/);
    expect(installProblem(good, "@cosyte/x12", ">=22.0.0", { ".": { import: {} } })).toMatch(
      /module format drift/,
    );
  });

  it("a dropped accuracy claim is reported by name", () => {
    expect(missingFacts("nothing of the sort", EARNED_FACTS)).toEqual(
      EARNED_FACTS.map((fact) => fact.name),
    );
    expect(
      missingFacts("only **four** structural failures are ever fatal", EARNED_FACTS),
    ).not.toContain("only four structural failures are ever fatal");
  });

  it("a dangling relative link is reported, and an absolute link is not read as relative", () => {
    expect(
      relativeLinkTargets("[a](./A.md) [b](https://x/y) [c](#anchor) [d](mailto:a@b)"),
    ).toEqual(["A.md"]);
    expect(danglingLinks(["A.md", "B.md"], (target) => target === "A.md")).toEqual(["B.md"]);
    expect(danglingLinks(["A.md"], () => true)).toEqual([]);
  });

  it("a repo-root markdown citation missing from files is reported; a subdirectory one is not", () => {
    expect(unshippedRootDocs(["KNOWN-LIMITATIONS.md", "LICENSE"], ["README.md"])).toEqual([
      "KNOWN-LIMITATIONS.md",
    ]);
    expect(unshippedRootDocs(["docs-content/cookbook.md"], ["README.md"])).toEqual([]);
    expect(unshippedRootDocs(["KNOWN-LIMITATIONS.md"], ["KNOWN-LIMITATIONS.md"])).toEqual([]);
  });
});

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import {
  docSnippetSuite,
  extractRunnableSnippets,
  rewriteAssertions,
} from "@cosyte/vitest-config/snippets";

/**
 * README/code-agreement gate. The `## Usage` block is the single most copied thing on this page:
 * roughly half of documentation traffic is now agents, and an agent lifts a usage block verbatim,
 * so a wrong example here becomes wrong generated code at scale. An npm README is also frozen at
 * publish, which makes a wrong example unfixable short of another release.
 *
 * So the block is EXTRACTED, COMPILED AND RUN, and its inline `// =>` comments become real
 * assertions. Three properties follow from that and none of them can be got by reading the page:
 *
 *   1. It runs against the package's BUILD, not the source tree, which is what an installer loads.
 *   2. It has no free variable. A block referring to an undeclared `rawEdi` (which this page did
 *      carry) fails to compile, so "copy this and it works" is checked rather than claimed.
 *   3. The values shown as output are the values produced. A drifted number reds here.
 *
 * **THE BUILD GOES TO ITS OWN DIRECTORY, AND THAT IS DELIBERATE.** `test/docs-content.test.ts`
 * builds into `dist/` in its own `beforeAll`, and Vitest runs test FILES in parallel workers.
 * `tsup` cleans its output directory first, so two suites building into `dist/` would race: one
 * would be importing the artifact while the other deleted it. A separate output directory removes
 * the race rather than relying on file ordering. The `tmpDir` for the emitted snippet modules is
 * separate for the same reason: `docSnippetSuite` removes its temp directory in `afterAll`, and two
 * suites sharing the default would remove each other's.
 *
 * **The example is a COMMITTED FIXTURE, not prose.** The interchange in the block is a byte-for-byte
 * copy of a synthetic fixture under `test/fixtures`, which is the corpus `pnpm phi-scan` already
 * sweeps. That is asserted below: a hand-written interchange on this page would be an EDI document
 * that no PHI gate has ever looked at, and the page is public.
 */
const root = join(import.meta.dirname, "..");
const README = join(root, "README.md");

/**
 * Where this suite's build lands. Never `dist/`: see the note above. It is git-ignored, and nothing
 * else in the repository reads it.
 */
const OUT_DIR = ".readme-dist";
const ENTRY = join(root, OUT_DIR, "index.mjs");

/** Temp modules for this suite only; `docSnippetSuite` deletes its `tmpDir` when it is done. */
const TMP_DIR = join(root, ".cosyte-readme-snippets");

beforeAll(() => {
  execFileSync("pnpm", ["exec", "tsup", "--out-dir", OUT_DIR], { cwd: root, stdio: "inherit" });
}, 120_000);

const readme = readFileSync(README, "utf8");
const snippets = extractRunnableSnippets(readme);

docSnippetSuite({
  name: "README usage example agrees with the built package",
  files: [README],
  requireSnippet: true,
  resolve: (specifier) => (specifier === "@cosyte/x12" ? ENTRY : undefined),
  tmpDir: TMP_DIR,
});

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

/** Every backtick-quoted literal in a snippet that holds interchange text. */
function interchangeLiterals(code: string): string[] {
  const literals: string[] = [];
  for (const match of code.matchAll(/`([^`]*\bISA\*[^`]*)`/g)) {
    const literal = match[1];
    if (literal !== undefined) literals.push(literal);
  }
  return literals;
}

describe("the README usage example is runnable, self-contained and synthetic", () => {
  it("carries exactly one runnable block, and it is inside ## Usage", () => {
    expect(snippets).toHaveLength(1);
    const usageAt = readme.indexOf("\n## Usage\n");
    const nextSectionAt = readme.indexOf("\n## ", usageAt + 1);
    const blockAt = readme.indexOf("```ts runnable");
    expect(usageAt).toBeGreaterThan(-1);
    expect(blockAt).toBeGreaterThan(usageAt);
    expect(blockAt).toBeLessThan(nextSectionAt);
  });

  it("shows its output rather than only its input", () => {
    // `// => value` comments are what the harness turns into assertions. A block with none would
    // run green while showing the reader nothing, which is the failure this catches.
    const { assertions } = rewriteAssertions(snippets[0]?.code ?? "");
    expect(assertions).toBeGreaterThan(0);
  });

  it("imports the package by its published name, so the block is copy-pasteable", () => {
    expect(snippets[0]?.code).toContain('from "@cosyte/x12"');
    // No relative or subpath import: an installer has neither.
    expect(snippets[0]?.code).not.toMatch(/from "[.]{1,2}\//);
    expect(snippets[0]?.code).not.toMatch(/from "@cosyte\/x12\//);
  });

  it("declares its own input, so the reader has no free variable to invent", () => {
    const code = snippets[0]?.code ?? "";
    // The page used to open on an undeclared `rawEdi`, which reads as working code and is not.
    expect(code).toMatch(/\bconst raw\b/);
    expect(code).not.toMatch(/\brawEdi\b/);
  });

  it("builds its interchange only from a synthetic fixture committed under test/fixtures", () => {
    const literals = interchangeLiterals(snippets[0]?.code ?? "");
    expect(literals).toHaveLength(1);
    const fixtures = committedFixtureTexts(join(root, "test", "fixtures"));
    // Trailing whitespace is the only normalisation: the fixture file ends with a newline and a
    // template literal in a markdown block does not.
    expect(fixtures.get((literals[0] ?? "").trimEnd())).toBeDefined();
  });

  it("CONTROL: a hand-written interchange would not be found among the fixtures", () => {
    // Assembled from parts rather than written out: a literal segment in a tracked file is the
    // shape the PHI gate hunts for, and a control that declares one disarms the detector it needs.
    const seg = (...parts: string[]): string => `${parts.join("*")}~`;
    const fixtures = committedFixtureTexts(join(root, "test", "fixtures"));
    expect(fixtures.get(seg("ISA", "00", "not", "a", "committed", "fixture"))).toBeUndefined();
    const planted = seg("ISA", "00", "x");
    expect(interchangeLiterals(`const raw = \`${planted}\`;\n`)).toEqual([planted]);
    expect(interchangeLiterals(`const raw = \`${seg("GS", "HP", "A", "B")}\`;\n`)).toEqual([]);
  });
});

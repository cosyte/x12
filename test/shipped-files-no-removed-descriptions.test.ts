import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * No shipped file names a code-list description this package stopped shipping.
 *
 * Six bundled code lists (`CARC`, `CLAIM_STATUS_CATEGORY_CODES`, `CLAIM_STATUS_CODES`,
 * `SERVICE_TYPE_CODES`, `CLP_STATUS` and `MAINTENANCE_TYPE_CODES`) keep their codes but no
 * longer carry description text, because the package's own redistribution record classes them
 * as `licence-required` or `not-established`. `test/code-lists-descriptions.test.ts` holds the
 * tables to that. This file holds the prose around them: the files `package.json` publishes
 * (`CHANGELOG.md` among them), the source `dist/` is built from, and `docs-content/`. A released
 * entry of `CHANGELOG.md` once named three `CLP_STATUS` labels after their codes, and this
 * is the check that keeps such a mention from returning.
 *
 * The removed text is held only as SHA-256 digests in
 * `test/fixtures/removed-code-list-descriptions.json`, so this repository does not carry it
 * again. Each digest is of a phrase of lowercase ASCII words joined by one space, the same
 * words `words()` below reads from a file. The phrases were taken from the six tables as they
 * stood before the descriptions were removed: every code followed by its full description,
 * every full description of three words or more on its own, and, for `CLP_STATUS`, every code
 * followed by the first word of its description, the shortened form the changelog used. A
 * description of one or two words is only matched after its code, since such a word alone is
 * ordinary prose.
 *
 * `dist/` is not read: it is build output and absent before a build, so the source it is built
 * from is read instead.
 */
const root = join(import.meta.dirname, "..");

interface PhraseDigest {
  readonly words: number;
  readonly first: string;
  readonly phrase: string;
}

const FIXTURE = JSON.parse(
  readFileSync(join(root, "test/fixtures/removed-code-list-descriptions.json"), "utf8"),
) as { readonly phrases: readonly PhraseDigest[] };

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** The lowercase ASCII words of `text`, in order: every run of letters and digits. */
function words(text: string): readonly string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/**
 * Every phrase of `text` whose digest is in `phrases`, as the words found.
 *
 * Kept free of the real fixture so the negative control below can drive it with a phrase made
 * up for the test: a scan that only ever runs on the real data cannot be shown to fail.
 */
function findDigested(text: string, phrases: readonly PhraseDigest[]): readonly string[] {
  const byFirst = new Map<string, Map<number, Set<string>>>();
  for (const { words: count, first, phrase } of phrases) {
    let byCount = byFirst.get(first);
    if (byCount === undefined) {
      byCount = new Map();
      byFirst.set(first, byCount);
    }
    let set = byCount.get(count);
    if (set === undefined) {
      set = new Set();
      byCount.set(count, set);
    }
    set.add(phrase);
  }
  const tokens = words(text);
  const tokenDigest = new Map<string, string>();
  const found: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i] ?? "";
    let digest = tokenDigest.get(token);
    if (digest === undefined) {
      digest = sha256(token);
      tokenDigest.set(token, digest);
    }
    const byCount = byFirst.get(digest);
    if (byCount === undefined) continue;
    for (const [count, set] of byCount) {
      if (i + count > tokens.length) continue;
      const window = tokens.slice(i, i + count).join(" ");
      if (set.has(sha256(window))) found.push(window);
    }
  }
  return found;
}

/** Every file under `dir`, recursively, as absolute paths. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/** The files this check reads, relative to the repository root. */
function scannedFiles(): readonly string[] {
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    readonly files: readonly string[];
  };
  const files: string[] = [];
  for (const entry of manifest.files) {
    if (entry === "dist") continue;
    const path = join(root, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  files.push(...walk(join(root, "src")), ...walk(join(root, "docs-content")));
  return files.map((path) => relative(root, path)).sort();
}

describe("shipped files name no removed code-list description", () => {
  const files = scannedFiles();

  it("the fixture and the file list are the ones described, so the scan is not vacuous", () => {
    expect(FIXTURE.phrases).toHaveLength(253);
    for (const { words: count, first, phrase } of FIXTURE.phrases) {
      expect(count).toBeGreaterThanOrEqual(2);
      expect(first).toMatch(/^[0-9a-f]{64}$/);
      expect(phrase).toMatch(/^[0-9a-f]{64}$/);
    }
    for (const name of ["CHANGELOG.md", "README.md", "KNOWN-LIMITATIONS.md", "TRADEMARKS.md"]) {
      expect(files).toContain(name);
    }
    expect(files).toContain("src/code-lists/clp-status.ts");
    expect(files.some((name) => name.startsWith("docs-content/"))).toBe(true);
    expect(files.some((name) => name.startsWith("dist/"))).toBe(false);
  });

  it("the scan finds a digested phrase, across a line break and in any case", () => {
    const made = (text: string): PhraseDigest => {
      const tokens = words(text);
      return {
        words: tokens.length,
        first: sha256(tokens[0] ?? ""),
        phrase: sha256(tokens.join(" ")),
      };
    };
    const phrases = [made("7 synthetic marker"), made("zz synthetic test phrase")];
    expect(findDigested("Codes (7 Synthetic\n  Marker, 8 other).", phrases)).toEqual([
      "7 synthetic marker",
    ]);
    expect(findDigested("a ZZ synthetic-test phrase here", phrases)).toEqual([
      "zz synthetic test phrase",
    ]);
    expect(findDigested("7 synthetic, then marker", phrases)).toEqual([]);
  });

  it.each(files)("%s", (name) => {
    const found = findDigested(readFileSync(join(root, name), "utf8"), FIXTURE.phrases);
    expect(found, `${name} names a removed code-list description`).toEqual([]);
  });
});

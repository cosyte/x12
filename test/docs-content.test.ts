import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  docSnippetSuite,
  extractRunnableSnippets,
  runSnippet,
} from "@cosyte/vitest-config/snippets";

import {
  ALL_WARNING_MESSAGES,
  CODES_PAGE,
  FATAL_MEANING_CODES,
  LISTED_ERROR_REGISTRIES,
  renderCodesPage,
  renderedMessages,
  withoutTableAlignment,
} from "./_helpers/codes-page.js";
import { anchorsIn, headingSlug, linkFault, sampleCompileErrors } from "./_helpers/docs-pages.js";
import {
  committedFixtureTexts,
  compileErrors,
  fences,
  interchangeLiterals,
} from "./_helpers/first-use.js";
import * as pkg from "../src/index.js";

/**
 * The docs-content gate: the pages docs.cosyte.com renders from each release, held to the
 * docs-content standard (cosyte/config's decision record 0006) and to the code.
 *
 * Two halves, deliberately not merged. The sample suite runs every TypeScript and JavaScript
 * sample on a hand-written page against the BUILT package and checks its `// =>` values; a block
 * tagged `throws` must throw, and one that cannot run says why in its fence
 * (` ```ts no-run <reason> `). The runner strips types without checking them, so a second test
 * compiles every TypeScript sample against the package's types. The contract half checks the
 * bundle as a whole: front matter, the sidebar's shape, every link and anchor, the symbols a
 * sample imports, a worked example for every transaction set, the two quality pages, and the
 * generated codes page. Each contract check is a pure function, proven below to still see a
 * seeded defect before its verdict on the real pages is believed.
 *
 * The pages under `docs-content/api/` are generated from the TSDoc comments in `src/` by
 * `cosyte-docs-reference`, and their `@example` blocks are fragments written for an editor's
 * tooltip (many use an undeclared `raw`), so they are not samples here: only the top-level pages
 * are passed to the suite. Links into them are checked, page and anchor.
 *
 * The shared CI gate runs `test` before `build`, so `dist/` is built on demand here.
 */
const root = join(import.meta.dirname, "..");

/** Map the published entry point to its built ESM artifact. */
const ENTRY = join(root, "dist", "index.mjs");

/** The bundle `pnpm pack:docs` (`cosyte-process pack-docs`) tars for the docs site. */
const DOCS_DIR = join(root, "docs-content");

/** The public entry point whose exports a sample is allowed to import. */
const PUBLIC_ENTRY_SOURCE = join(root, "src", "index.ts");

const resolveEntry = (specifier: string): string | undefined =>
  specifier === "@cosyte/x12" ? ENTRY : undefined;

beforeAll(() => {
  execFileSync("pnpm", ["build"], { cwd: root, stdio: "inherit" });
}, 120_000);

/** The hand-written pages: every `.md` file at the top of `docs-content/`, not the generated `api/`. */
const PAGE_FILES: readonly string[] = readdirSync(DOCS_DIR)
  .filter((name) => name.endsWith(".md"))
  .sort();

/**
 * `every` runs each TypeScript and JavaScript sample whether or not it is tagged `runnable`, and
 * lists a `no-run` sample as skipped with its reason. It reaches the runner as a variable rather
 * than a literal so the line compiles against a `@cosyte/vitest-config` that predates the option;
 * such a runner ignores it and runs the `runnable` blocks, which is every sample that can run
 * here, as the test below holds.
 */
const suiteOptions = {
  files: PAGE_FILES.map((name) => join(DOCS_DIR, name)),
  every: true,
  resolve: resolveEntry,
};
docSnippetSuite(suiteOptions);

// ---------------------------------------------------------------------------
// Reading the pages.
// ---------------------------------------------------------------------------

/** One markdown page of the bundle, parsed into front matter and body. */
interface DocsPage {
  /** File name relative to `docs-content/`, e.g. `"intro.md"`. */
  readonly file: string;
  /** File name without its extension: the document id a sidebar entry names. */
  readonly stem: string;
  /**
   * The parsed front matter, or `undefined` when the page carries none or carries one this parser
   * cannot read. The two are deliberately ONE state: both mean "this page states no id or title",
   * and a page that states none must red rather than be skipped.
   */
  readonly frontmatter: Readonly<Record<string, string>> | undefined;
  /** Everything after the front matter. */
  readonly body: string;
}

/** One fenced code block, with its info string split into language and tags. */
interface FencedBlock {
  /** The fence language token (`ts`, `js`, `bash`, or `""` for a bare fence). */
  readonly lang: string;
  /** The remaining info-string tokens (`["runnable", "throws"]`). */
  readonly meta: readonly string[];
  /** The block's source, dedented to the fence's own indentation. */
  readonly code: string;
}

/** Fence languages a TypeScript sample is written in. */
const TYPESCRIPT_FENCE_LANGS: ReadonlySet<string> = new Set(["ts", "typescript", "tsx"]);

/** Fence languages that make a block a code sample, as the standard's runner reads them. */
const SAMPLE_LANGS: ReadonlySet<string> = new Set([
  "ts",
  "typescript",
  "tsx",
  "js",
  "javascript",
  "mjs",
]);

/**
 * The transaction-set map from `docs-content/spec-notes-transaction-sets.md`, as data: each set
 * the library claims, and the reader / builder exports that set is reached through. A set is
 * covered when a TypeScript sample anywhere in the bundle CALLS one of its exports.
 *
 * `837P` / `837I` / `837D` share the reader `get837Claims`, exactly as the map does.
 */
const TRANSACTION_SET_EXPORTS: ReadonlyMap<string, readonly string[]> = new Map([
  ["270", ["get270Inquiry", "parse270Inquiries", "build270"]],
  ["271", ["get271Eligibility", "build271"]],
  ["275", ["get275Attachments", "build275"]],
  ["276", ["get276StatusInquiry", "parse276StatusInquiries", "build276"]],
  ["277", ["get277Status", "build277"]],
  ["277CA", ["get277CADisposition", "build277CA"]],
  [
    "277 RFAI",
    ["get277RequestForAdditionalInformation", "build277RequestForAdditionalInformation"],
  ],
  ["278", ["get278Request", "get278Response", "build278Request", "build278Response"]],
  ["820", ["get820Payments", "build820"]],
  ["834", ["get834Header", "get834Enrollments", "build834"]],
  ["835", ["get835", "build835"]],
  ["837P", ["get837Claims", "build837P"]],
  ["837I", ["get837Claims", "build837I"]],
  ["837D", ["get837Claims", "build837D"]],
  ["999", ["parse999", "build999"]],
  ["TA1", ["parseTA1", "buildTA1"]],
]);

/**
 * Split a markdown source into its fenced code blocks, in document order.
 *
 * @param markdown - The page source.
 * @returns One entry per fenced block.
 */
function fencedBlocks(markdown: string): FencedBlock[] {
  const lines = markdown.split(/\r?\n/);
  const out: FencedBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const open = /^(\s*)```+[ \t]*(\S*)[ \t]*(.*)$/.exec(lines[i] ?? "");
    if (open === null) {
      i += 1;
      continue;
    }
    const indent = open[1] ?? "";
    const lang = open[2] ?? "";
    const meta = (open[3] ?? "").split(/\s+/).filter((token) => token.length > 0);
    const body: string[] = [];
    i += 1;
    while (i < lines.length && !/^\s*```+[ \t]*$/.test(lines[i] ?? "")) {
      body.push(lines[i] ?? "");
      i += 1;
    }
    i += 1;
    out.push({
      lang,
      meta,
      code: body.map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l)).join("\n"),
    });
  }
  return out;
}

/**
 * Every TypeScript block of a page, runnable or not.
 *
 * @param page - The page to read.
 * @returns The blocks whose fence language is a TypeScript one.
 */
function typescriptBlocks(page: DocsPage): FencedBlock[] {
  return fencedBlocks(page.body).filter((b) => TYPESCRIPT_FENCE_LANGS.has(b.lang));
}

/**
 * Remove fenced blocks and inline code spans, so a prose scan never reads a code sample as prose.
 *
 * @param markdown - The page source.
 * @returns The source with every code carrier blanked out.
 */
function withoutCode(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```+/.test(line)) {
      inFence = !inFence;
      out.push("");
      continue;
    }
    out.push(inFence ? "" : line.replace(/`+[^`]*`+/g, " "));
  }
  return out.join("\n");
}

/**
 * Parse one page into front matter and body.
 *
 * @param file - The file name relative to `docs-content/`.
 * @param source - The file's contents.
 * @returns The parsed page; `frontmatter` is `undefined` when the block is absent or malformed.
 */
function parsePage(file: string, source: string): DocsPage {
  const stem = file.replace(/\.mdx?$/, "");
  const lines = source.split(/\r?\n/);
  if (lines[0] !== "---") return { file, stem, frontmatter: undefined, body: source };
  const close = lines.indexOf("---", 1);
  if (close === -1) return { file, stem, frontmatter: undefined, body: source };

  const fields: Record<string, string> = {};
  for (const line of lines.slice(1, close)) {
    if (line.trim().length === 0) continue;
    const field = /^([A-Za-z_][A-Za-z0-9_-]*):[ \t]*(.*)$/.exec(line);
    // A line the parser cannot read makes the WHOLE block unreadable. Skipping it would let a
    // page state a broken id and still be graded on the fields that happened to parse.
    if (field === null) return { file, stem, frontmatter: undefined, body: source };
    fields[field[1] ?? ""] = (field[2] ?? "").trim().replace(/^"(.*)"$/, "$1");
  }
  return {
    file,
    stem,
    frontmatter: Object.freeze(fields),
    body: lines.slice(close + 1).join("\n"),
  };
}

/**
 * Flatten a Docusaurus sidebar definition into the ordered document ids it names.
 *
 * @param node - A sidebar node (string, array, category, or doc entry).
 * @returns The document ids, in the order a reader meets them.
 */
function sidebarDocIds(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap((child: unknown) => sidebarDocIds(child));
  if (typeof node === "object" && node !== null) {
    const record = node as Record<string, unknown>;
    if (record["type"] === "doc" && typeof record["id"] === "string") return [record["id"]];
    if ("items" in record) return sidebarDocIds(record["items"]);
  }
  return [];
}

/**
 * The ordered document ids a sidebars file names.
 *
 * @param sidebars - The parsed `sidebars.json`.
 * @returns The document ids in sidebar order.
 */
function sidebarOrder(sidebars: unknown): string[] {
  if (typeof sidebars !== "object" || sidebars === null) return [];
  return Object.values(sidebars as Record<string, unknown>).flatMap((v) => sidebarDocIds(v));
}

/**
 * The names the package's public entry point exports, value and type alike. Derived from the
 * source rather than restated, so it cannot drift.
 *
 * @param source - The contents of `src/index.ts`.
 * @returns Every exported name.
 */
function publicEntryExports(source: string): Set<string> {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  const names = new Set<string>();

  for (const match of stripped.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const raw of (match[1] ?? "").split(",")) {
      const entry = raw.trim().replace(/^type\s+/, "");
      if (entry.length === 0) continue;
      // `X as Y` publishes Y; the local name X is not reachable by a consumer.
      const alias = /\bas\s+([A-Za-z_$][\w$]*)\s*$/.exec(entry);
      names.add(alias === null ? entry : (alias[1] ?? entry));
    }
  }
  for (const match of stripped.matchAll(
    /export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|enum|type)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(match[1] ?? "");
  }
  names.delete("");
  return names;
}

/**
 * The names a block imports from `@cosyte/x12`.
 *
 * @param code - The block source.
 * @returns The imported names, type imports included.
 */
function importedPackageSymbols(code: string): string[] {
  const out: string[] = [];
  for (const match of code.matchAll(
    /import\s+(?:type\s+)?\{([\s\S]*?)\}\s*from\s*["']@cosyte\/x12["']/g,
  )) {
    for (const raw of (match[1] ?? "").split(",")) {
      const entry = raw.trim().replace(/^type\s+/, "");
      if (entry.length === 0) continue;
      const local = /^([A-Za-z_$][\w$]*)\s+as\s+/.exec(entry);
      out.push(local === null ? entry : (local[1] ?? entry));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// The contract checks. Each is a pure function from pages to findings.
// ---------------------------------------------------------------------------

/** The front-matter keys the standard requires on every page, non-empty. */
const REQUIRED_KEYS = ["id", "title", "sidebar_label", "description"] as const;

/** The longest description the standard allows: what a search result shows. */
const DESCRIPTION_MAX = 160;

/**
 * Front matter: every required key present and non-empty, an `id` equal to the file stem, a
 * description of at most 160 characters, and no `sidebar_position` (the sidebar sets the order).
 *
 * @param pages - The bundle's pages.
 * @returns One finding per offending page and key.
 */
function checkFrontmatter(pages: readonly DocsPage[]): string[] {
  const findings: string[] = [];
  for (const page of pages) {
    if (page.frontmatter === undefined) {
      findings.push(`docs-content/${page.file}: front matter is absent or malformed`);
      continue;
    }
    for (const key of REQUIRED_KEYS) {
      const value = page.frontmatter[key];
      if (value === undefined || value.length === 0) {
        findings.push(`docs-content/${page.file}: ${key} is absent or empty`);
      }
    }
    const id = page.frontmatter["id"];
    if (id !== undefined && id.length > 0 && id !== page.stem) {
      findings.push(
        `docs-content/${page.file}: id ${JSON.stringify(id)} does not match the file stem "${page.stem}"`,
      );
    }
    const description = page.frontmatter["description"] ?? "";
    if (description.length > DESCRIPTION_MAX) {
      findings.push(
        `docs-content/${page.file}: description is ${String(description.length)} characters, over ${String(DESCRIPTION_MAX)}`,
      );
    }
    if ("sidebar_position" in page.frontmatter) {
      findings.push(
        `docs-content/${page.file}: sidebar_position is set; the sidebar sets the order`,
      );
    }
  }
  return findings;
}

/** The standard's categories, in their order. */
const CATEGORY_ORDER = [
  "Installation",
  "Quickstart",
  "Tutorials",
  "How-to guides",
  "Explanation",
  "Reference",
  "Troubleshooting",
] as const;

/** The categories every library has. */
const REQUIRED_CATEGORIES: ReadonlySet<string> = new Set([
  "Installation",
  "Quickstart",
  "How-to guides",
  "Explanation",
  "Troubleshooting",
]);

/** The page each of these categories opens with. */
const CATEGORY_FIRST: Readonly<Record<string, string>> = {
  Installation: "installation",
  Quickstart: "quickstart",
  Troubleshooting: "troubleshooting",
};

/**
 * The sidebar's shape: one sidebar, `docs`; `intro` first; the standard's categories in its
 * order, the required ones present, each opening with its fixed page; a category holds page ids
 * or one level of nested category; and `testing-and-quality` then `performance` last.
 *
 * @param sidebars - The parsed `sidebars.json`.
 * @returns One finding per departure from the shape.
 */
function checkSidebarShape(sidebars: unknown): string[] {
  const findings: string[] = [];
  if (typeof sidebars !== "object" || sidebars === null || Array.isArray(sidebars)) {
    return ["sidebars.json is not an object"];
  }
  const keys = Object.keys(sidebars);
  if (keys.length !== 1 || keys[0] !== "docs") findings.push("sidebars.json has one sidebar, docs");
  const docs = (sidebars as Record<string, unknown>)["docs"];
  if (!Array.isArray(docs)) return [...findings, "the docs sidebar is not a list"];

  const items: unknown[] = docs;
  if (items[0] !== "intro") findings.push("the sidebar opens with intro");
  if (items.at(-2) !== "testing-and-quality" || items.at(-1) !== "performance") {
    findings.push("the sidebar ends with testing-and-quality then performance");
  }
  const labels: string[] = [];
  for (const item of items.slice(1, -2)) {
    if (typeof item !== "object" || item === null) {
      findings.push(`a top-level entry between intro and the quality pages is not a category`);
      continue;
    }
    const category = item as Record<string, unknown>;
    const label = String(category["label"]);
    labels.push(label);
    if (category["type"] !== "category") findings.push(`"${label}" is not a category`);
    if (!(CATEGORY_ORDER as readonly string[]).includes(label)) {
      findings.push(`"${label}" is not a category of the standard`);
    }
    const children = Array.isArray(category["items"]) ? (category["items"] as unknown[]) : [];
    if (children.length === 0) findings.push(`"${label}" lists no pages`);
    const first = CATEGORY_FIRST[label];
    if (first !== undefined && children[0] !== first) {
      findings.push(`"${label}" opens with ${first}`);
    }
    for (const child of children) {
      if (typeof child === "string") continue;
      const nested = child as Record<string, unknown>;
      const nestedItems = Array.isArray(nested["items"]) ? (nested["items"] as unknown[]) : [];
      if (nested["type"] !== "category" || !nestedItems.every((id) => typeof id === "string")) {
        findings.push(`"${label}" holds something other than page ids or one nested category`);
      }
    }
  }
  const order = labels.map((l) => (CATEGORY_ORDER as readonly string[]).indexOf(l));
  if (order.some((rank, i) => i > 0 && rank <= (order[i - 1] ?? -1))) {
    findings.push(`the categories are not in the standard's order: ${labels.join(", ")}`);
  }
  for (const required of REQUIRED_CATEGORIES) {
    if (!labels.includes(required)) findings.push(`the category "${required}" is missing`);
  }
  return findings;
}

/**
 * Sidebar bijection, both directions: every sidebar id resolves to a page, and every page is
 * referenced exactly once.
 *
 * @param pages - The bundle's pages.
 * @param order - The document ids `sidebars.json` names, in order.
 * @returns One finding per offending id or page.
 */
function checkSidebarBijection(pages: readonly DocsPage[], order: readonly string[]): string[] {
  const findings: string[] = [];
  const stems = new Set(pages.map((p) => p.stem));
  const seen = new Map<string, number>();
  for (const id of order) seen.set(id, (seen.get(id) ?? 0) + 1);

  for (const [id, count] of seen) {
    if (!stems.has(id)) {
      findings.push(
        `sidebars.json names document id "${id}", but docs-content/${id}.md does not exist`,
      );
    } else if (count > 1) {
      findings.push(
        `sidebars.json names document id "${id}" ${String(count)} times; it must appear exactly once`,
      );
    }
  }
  for (const page of pages) {
    if (!seen.has(page.stem)) {
      findings.push(
        `docs-content/${page.file} is orphaned: no sidebars.json entry references document id "${page.stem}"`,
      );
    }
  }
  return findings;
}

/**
 * Every link written on a page resolves: another page as `./<name>.md`, the generated reference
 * as `./api/<page>.md`, each with an anchor that names a heading on its target, the site's slug
 * rule applied. Links inside code are not links.
 *
 * @param pages - The bundle's pages.
 * @param docsDir - The docs directory, for reading the generated reference.
 * @returns One finding per broken link, naming the source page and target.
 */
function checkLinks(pages: readonly DocsPage[], docsDir: string): string[] {
  const texts = new Map(pages.map((p) => [p.file, p.body]));
  const findings: string[] = [];
  for (const page of pages) {
    for (const match of withoutCode(page.body).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const target = match[1] ?? "";
      const fault = linkFault(target, texts, page.file, docsDir);
      if (fault !== null)
        findings.push(`docs-content/${page.file} links to "${target}", which ${fault}`);
    }
  }
  return findings;
}

/**
 * Every symbol a TypeScript sample imports from `@cosyte/x12` is one the public entry point
 * exports.
 *
 * @param pages - The bundle's pages.
 * @param exported - The names `src/index.ts` publishes.
 * @returns One finding per unknown symbol, naming the symbol and the page.
 */
function checkImportedSymbols(pages: readonly DocsPage[], exported: ReadonlySet<string>): string[] {
  const findings: string[] = [];
  for (const page of pages) {
    for (const block of typescriptBlocks(page)) {
      for (const symbol of importedPackageSymbols(block.code)) {
        if (!exported.has(symbol)) {
          findings.push(
            `docs-content/${page.file}: a TypeScript sample imports "${symbol}", which the package entry point does not export`,
          );
        }
      }
    }
  }
  return findings;
}

/**
 * Every transaction set in the map has at least one TypeScript sample calling one of its reader
 * or builder exports.
 *
 * @param pages - The bundle's pages.
 * @param sets - Set id to the exports that set is reached through.
 * @returns One finding per uncovered set.
 */
function checkTransactionSetCoverage(
  pages: readonly DocsPage[],
  sets: ReadonlyMap<string, readonly string[]>,
): string[] {
  const code = pages.flatMap((p) => typescriptBlocks(p).map((b) => b.code)).join("\n");
  const findings: string[] = [];
  for (const [set, exports] of sets) {
    const called = exports.some((name) => new RegExp(`\\b${name}\\s*\\(`).test(code));
    if (!called) {
      findings.push(
        `transaction set ${set} has no TypeScript sample calling any of: ${exports.join(", ")}`,
      );
    }
  }
  return findings;
}

/** The one sentence a quality page's "Current numbers" section holds in the repository. */
const CURRENT_NUMBERS_PLACEHOLDER =
  "The numbers for this section are measured on `main` at each release and filled in when the release is built. They are never typed by hand.";

/**
 * The two quality pages exist, and each one's `## Current numbers` section holds only the
 * standard's placeholder sentence: the numbers are generated at release, never typed.
 *
 * @param pages - The bundle's pages.
 * @returns One finding per missing page or section that holds anything else.
 */
function checkCurrentNumbers(pages: readonly DocsPage[]): string[] {
  const findings: string[] = [];
  for (const stem of ["testing-and-quality", "performance"]) {
    const page = pages.find((p) => p.stem === stem);
    if (page === undefined) {
      findings.push(`docs-content/${stem}.md is absent`);
      continue;
    }
    const lines = page.body.split(/\r?\n/);
    const start = lines.indexOf("## Current numbers");
    if (start === -1) {
      findings.push(`docs-content/${page.file} has no "## Current numbers" section`);
      continue;
    }
    const rest = lines.slice(start + 1);
    const next = rest.findIndex((line) => /^#{1,2} /.test(line));
    const section = (next === -1 ? rest : rest.slice(0, next))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (section !== CURRENT_NUMBERS_PLACEHOLDER) {
      findings.push(
        `docs-content/${page.file}: "## Current numbers" holds something other than the placeholder sentence`,
      );
    }
  }
  return findings;
}

/**
 * Every TypeScript and JavaScript sample either runs (it is tagged `runnable`, so the released
 * runner runs it too) or says in its fence why it cannot (`no-run <reason>`), never both.
 *
 * @param pages - The bundle's pages.
 * @returns One finding per sample that does neither, or both.
 */
function checkSamplesAccounted(pages: readonly DocsPage[]): string[] {
  const findings: string[] = [];
  for (const page of pages) {
    for (const block of fencedBlocks(page.body)) {
      if (!SAMPLE_LANGS.has(block.lang)) continue;
      const noRun = block.meta.indexOf("no-run");
      const reason = noRun === -1 ? "" : block.meta.slice(noRun + 1).join(" ");
      const runnable = block.meta.includes("runnable");
      if (runnable ? noRun !== -1 : reason === "") {
        findings.push(`docs-content/${page.file}: ${block.lang} ${block.meta.join(" ")}`.trimEnd());
      }
    }
  }
  return findings;
}

// ---------------------------------------------------------------------------
// The real bundle.
// ---------------------------------------------------------------------------

/** Every file directly under `docs-content/`, by name. */
const BUNDLE_FILES: ReadonlyMap<string, string> = new Map(
  readdirSync(DOCS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => [entry.name, readFileSync(join(DOCS_DIR, entry.name), "utf8")] as const),
);

/** The bundle's markdown pages, parsed. */
const BUNDLE_PAGES: readonly DocsPage[] = [...BUNDLE_FILES]
  .filter(([name]) => /\.mdx?$/.test(name))
  .map(([name, source]) => parsePage(name, source));

/** The parsed `sidebars.json`. */
const BUNDLE_SIDEBARS: unknown = JSON.parse(BUNDLE_FILES.get("sidebars.json") ?? "{}");

/** The document ids `sidebars.json` names, in order. */
const BUNDLE_SIDEBAR_ORDER: readonly string[] = sidebarOrder(BUNDLE_SIDEBARS);

/** The names `src/index.ts` publishes. */
const PUBLIC_EXPORTS: ReadonlySet<string> = publicEntryExports(
  readFileSync(PUBLIC_ENTRY_SOURCE, "utf8"),
);

describe("docs-content bundle contract", () => {
  it("carries intro.md, sidebars.json and only top-level markdown pages besides api/", () => {
    expect(BUNDLE_FILES.has("intro.md")).toBe(true);
    expect(BUNDLE_FILES.has("sidebars.json")).toBe(true);
    expect([...BUNDLE_FILES.keys()].filter((n) => !/\.md$/.test(n))).toEqual(["sidebars.json"]);
    for (const name of BUNDLE_FILES.keys())
      expect(name).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*\.(md|json)$/);
  });

  it("states an id, a title, a sidebar label and a short description on every page", () => {
    expect(checkFrontmatter(BUNDLE_PAGES)).toEqual([]);
  });

  it("keeps the standard's sidebar shape", () => {
    expect(checkSidebarShape(BUNDLE_SIDEBARS)).toEqual([]);
  });

  it("references every page from sidebars.json exactly once, and resolves every id", () => {
    expect(checkSidebarBijection(BUNDLE_PAGES, BUNDLE_SIDEBAR_ORDER)).toEqual([]);
  });

  it("resolves every link, page and anchor, the generated reference included", () => {
    expect(checkLinks(BUNDLE_PAGES, DOCS_DIR)).toEqual([]);
  });

  it("imports only symbols the public entry point exports", () => {
    // Non-vacuity: an extractor that found nothing would pass this check while seeing none of it.
    expect(PUBLIC_EXPORTS.has("parseX12")).toBe(true);
    expect(PUBLIC_EXPORTS.has("serializeX12")).toBe(true);
    expect(PUBLIC_EXPORTS.has("X12Interchange")).toBe(true);
    expect(PUBLIC_EXPORTS.size).toBeGreaterThan(100);
    expect(checkImportedSymbols(BUNDLE_PAGES, PUBLIC_EXPORTS)).toEqual([]);
  });

  it("carries a worked example for every transaction set the library claims", () => {
    expect(checkTransactionSetCoverage(BUNDLE_PAGES, TRANSACTION_SET_EXPORTS)).toEqual([]);
  });

  it("keeps only the placeholder sentence under each quality page's Current numbers", () => {
    expect(checkCurrentNumbers(BUNDLE_PAGES)).toEqual([]);
  });

  it("runs every sample, or names in its fence why it cannot", () => {
    expect(checkSamplesAccounted(BUNDLE_PAGES)).toEqual([]);
  });

  it("compiles every TypeScript sample against the package's types", () => {
    const samples = BUNDLE_PAGES.flatMap((page) =>
      fencedBlocks(page.body)
        .filter((b) => TYPESCRIPT_FENCE_LANGS.has(b.lang) && !b.meta.includes("no-run"))
        .map((b, i) => ({ name: `${page.file} sample ${String(i + 1)}`, code: b.code })),
    );
    expect(samples.length).toBeGreaterThan(40);
    expect(sampleCompileErrors(root, "@cosyte/x12", PUBLIC_ENTRY_SOURCE, samples)).toEqual([]);
  }, 120_000);
});

describe("the generated codes page", () => {
  it("is exactly what the source renders", () => {
    expect(withoutTableAlignment(readFileSync(join(root, CODES_PAGE), "utf8"))).toBe(
      withoutTableAlignment(renderCodesPage()),
    );
  });

  it("carries every warning message the registry holds, and no other", () => {
    expect([...renderedMessages()].sort()).toEqual([...ALL_WARNING_MESSAGES].sort());
  });

  it("lists every fatal code, every warning code and every refusal registry", () => {
    const page = readFileSync(join(root, CODES_PAGE), "utf8");
    expect([...FATAL_MEANING_CODES].sort()).toEqual(Object.values(pkg.FATAL_CODES).sort());
    for (const code of Object.values(pkg.WARNING_CODES)) {
      expect(anchorsIn(page).has(headingSlug(code))).toBe(true);
    }
    const registries = Object.keys(pkg).filter(
      (name) => /_ERROR_CODES$/.test(name) && !/^IK[34]_SYNTAX_/.test(name),
    );
    expect([...LISTED_ERROR_REGISTRIES].sort()).toEqual(registries.sort());
  });
});

describe("docs-content covers the shipped surfaces intro.md names", () => {
  /**
   * Look one page up by its document id.
   *
   * @param id - The document id.
   * @returns The page, or `undefined` when the bundle has none.
   */
  function page(id: string): DocsPage | undefined {
    return BUNDLE_PAGES.find((p) => p.stem === id);
  }

  it("presents the emit side behind serializeX12 and buildInterchange", () => {
    const emit = page("emit-and-serialize");
    expect(emit).toBeDefined();
    const body = emit?.body ?? "";
    // The two exports the emit half is reached through.
    expect(body).toContain("serializeX12");
    expect(body).toContain("buildInterchange");
    // The builders' contract, stated rather than implied.
    expect(body).toMatch(/refuse/i);
    expect(body).toMatch(/silently corrupt/i);
    // The two documented round-trip non-reproductions.
    expect(body).toMatch(/line break/i);
    expect(body).toMatch(/doubled segment terminator/i);
    // Exercised, not asserted: the page carries an executed example.
    expect(fencedBlocks(body).some((b) => b.meta.includes("runnable"))).toBe(true);
  });

  it("presents the trading-partner profile system intro.md lists as shipped", () => {
    const profilesPage = page("profiles");
    expect(profilesPage).toBeDefined();
    const body = profilesPage?.body ?? "";
    // What a profile declares, and how one is applied to a parse.
    expect(body).toContain("defineProfile");
    expect(body).toContain("quirks");
    expect(body).toMatch(/profile:\s*profiles\./);
    // Descriptive rather than prescriptive, said in those words.
    expect(body).toMatch(/descriptive/i);
    expect(body).toMatch(/prescriptive/i);
    expect(fencedBlocks(body).some((b) => b.meta.includes("runnable"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The checkers' own self-tests. A gate is believed only after it has shown it can still see:
// each check above is re-run against a seeded bundle carrying exactly the defect it exists to
// catch, and must name the offender.
// ---------------------------------------------------------------------------

/**
 * Build a page from front-matter fields and a body, the way an author would.
 *
 * @param file - The file name, e.g. `"intro.md"`.
 * @param fields - The front-matter lines, without the `---` fences.
 * @param body - The markdown body.
 * @returns The parsed page.
 */
function seedPage(file: string, fields: readonly string[], body = ""): DocsPage {
  return parsePage(file, `---\n${fields.join("\n")}\n---\n\n${body}\n`);
}

/** Front matter that satisfies every key the standard requires, for a page named `id`. */
function goodFields(id: string): string[] {
  return [`id: ${id}`, `title: ${id}`, `sidebar_label: ${id}`, `description: "About ${id}."`];
}

/** A two-page bundle that is correct in every respect the checkers grade. */
function seedBundle(): { pages: DocsPage[]; order: string[] } {
  return {
    pages: [
      seedPage("intro.md", goodFields("intro"), "[a](./b.md#b-heading)"),
      seedPage(
        "b.md",
        goodFields("b"),
        "## B heading\n\n```ts runnable\nimport { parseX12 } from '@cosyte/x12';\nparseX12('');\n```",
      ),
    ],
    order: ["intro", "b"],
  };
}

/** A sidebar in the standard's shape. */
function seedSidebar(): { docs: unknown[] } {
  return {
    docs: [
      "intro",
      { type: "category", label: "Installation", items: ["installation"] },
      { type: "category", label: "Quickstart", items: ["quickstart"] },
      { type: "category", label: "How-to guides", items: ["a"] },
      {
        type: "category",
        label: "Explanation",
        items: ["b", { type: "category", label: "Notes", items: ["c"] }],
      },
      { type: "category", label: "Troubleshooting", items: ["troubleshooting"] },
      "testing-and-quality",
      "performance",
    ],
  };
}

describe("the bundle-contract checkers still see", () => {
  it("report nothing on a well-formed seeded bundle", () => {
    const { pages, order } = seedBundle();
    expect(checkFrontmatter(pages)).toEqual([]);
    expect(checkSidebarShape(seedSidebar())).toEqual([]);
    expect(checkSidebarBijection(pages, order)).toEqual([]);
    expect(checkLinks(pages, DOCS_DIR)).toEqual([]);
    expect(checkImportedSymbols(pages, new Set(["parseX12"]))).toEqual([]);
    expect(checkSamplesAccounted(pages)).toEqual([]);
  });

  it("fails, naming the id, when sidebars.json names a document with no file", () => {
    const { pages } = seedBundle();
    const findings = checkSidebarBijection(pages, ["intro", "b", "ghost-page"]);
    expect(findings.join("\n")).toContain("ghost-page");
    expect(findings).toHaveLength(1);
  });

  it("fails, naming the file, when a page no sidebar entry references exists", () => {
    const { pages, order } = seedBundle();
    const orphan = seedPage("stray.md", goodFields("stray"));
    const findings = checkSidebarBijection([...pages, orphan], order);
    expect(findings.join("\n")).toContain("stray.md");
    expect(findings).toHaveLength(1);
  });

  it("fails when one document id is referenced twice", () => {
    const { pages } = seedBundle();
    const findings = checkSidebarBijection(pages, ["intro", "b", "b"]);
    expect(findings.join("\n")).toContain('"b" 2 times');
  });

  it("fails on a sidebar out of the standard's shape", () => {
    const outOfOrder = seedSidebar();
    [outOfOrder.docs[3], outOfOrder.docs[4]] = [outOfOrder.docs[4], outOfOrder.docs[3]];
    expect(checkSidebarShape(outOfOrder).join("\n")).toContain("not in the standard's order");

    const oldLabel = seedSidebar();
    oldLabel.docs[3] = { type: "category", label: "Guides", items: ["a"] };
    const findings = checkSidebarShape(oldLabel).join("\n");
    expect(findings).toContain('"Guides" is not a category of the standard');
    expect(findings).toContain('the category "How-to guides" is missing');

    const qualityFirst = seedSidebar();
    qualityFirst.docs.push(qualityFirst.docs.splice(1, 1)[0]);
    expect(checkSidebarShape(qualityFirst).join("\n")).toContain(
      "testing-and-quality then performance",
    );

    const deep = seedSidebar();
    deep.docs[4] = {
      type: "category",
      label: "Explanation",
      items: [
        { type: "category", label: "N", items: [{ type: "category", label: "M", items: [] }] },
      ],
    };
    expect(checkSidebarShape(deep).join("\n")).toContain("one nested category");

    const wrongFirst = seedSidebar();
    wrongFirst.docs[1] = { type: "category", label: "Installation", items: ["other"] };
    expect(checkSidebarShape(wrongFirst).join("\n")).toContain(
      '"Installation" opens with installation',
    );

    expect(checkSidebarShape({ docs: ["x"], other: [] }).join("\n")).toContain("one sidebar, docs");
  });

  it("fails, naming source and target, when a link points at no page", () => {
    const pages = [seedPage("intro.md", goodFields("intro"), "see [gone](./gone.md)")];
    const findings = checkLinks(pages, DOCS_DIR);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("intro.md");
    expect(findings[0]).toContain("./gone.md");
  });

  it("fails on an anchor that names no heading, here or on the target page", () => {
    const { pages } = seedBundle();
    const broken = [
      seedPage("intro.md", goodFields("intro"), "[a](./b.md#no-such) and [here](#nor-this)"),
      pages[1] ?? seedPage("b.md", goodFields("b")),
    ];
    const findings = checkLinks(broken, DOCS_DIR).join("\n");
    expect(findings).toContain("./b.md#no-such");
    expect(findings).toContain("#nor-this");
  });

  it("fails on a link not written as ./<name>.md", () => {
    const { pages } = seedBundle();
    const bare = [
      seedPage("intro.md", goodFields("intro"), "[a](./b)"),
      pages[1] ?? seedPage("b.md", []),
    ];
    expect(checkLinks(bare, DOCS_DIR).join("\n")).toContain("is not written as ./<name>.md");
  });

  it("resolves a link into the generated reference, page and anchor", () => {
    const into = (target: string): string[] =>
      checkLinks([seedPage("intro.md", goodFields("intro"), `[x](${target})`)], DOCS_DIR);
    expect(into("./api/README.md#parsex12")).toEqual([]);
    expect(into("./api/README.md")).toEqual([]);
    expect(into("./api/README.md#not-an-export").join("\n")).toContain("names no heading");
    expect(into("./api/NOPE.md").join("\n")).toContain("resolves to no page in docs-content/api/");
    expect(into("./api/../intro.md").join("\n")).toContain("is not written as");
  });

  it("ignores an absolute URL and a link inside code", () => {
    const pages = [
      seedPage(
        "intro.md",
        goodFields("intro"),
        [
          "[away](https://example.com/x)",
          "```ts",
          "// [not a link](./nowhere.md)",
          "```",
          "and `[nor this](./nowhere-either.md)` inline",
        ].join("\n"),
      ),
    ];
    expect(checkLinks(pages, DOCS_DIR)).toEqual([]);
  });

  it("slugs a heading the way the docs site does", () => {
    expect(headingSlug("Read a 278: the `HCR-01` decision")).toBe("read-a-278-the-hcr-01-decision");
    expect(headingSlug("X12_PRE_005010")).toBe("x12_pre_005010");
    expect([...anchorsIn("## A\n```\n## B\n```\n## A\n")]).toEqual(["a", "a-1"]);
  });

  it("fails, naming the symbol and the page, on an import the entry point lacks", () => {
    const pages = [
      seedPage(
        "intro.md",
        goodFields("intro"),
        '```ts runnable\nimport { parseX12, notAnExport } from "@cosyte/x12";\n```',
      ),
    ];
    const findings = checkImportedSymbols(pages, new Set(["parseX12"]));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("notAnExport");
    expect(findings[0]).toContain("intro.md");
  });

  it("reads a type-only import as a symbol like any other", () => {
    const pages = [
      seedPage(
        "intro.md",
        goodFields("intro"),
        '```ts runnable\nimport { type GoneType } from "@cosyte/x12";\n```',
      ),
    ];
    expect(checkImportedSymbols(pages, new Set(["parseX12"])).join("\n")).toContain("GoneType");
  });

  it("fails, naming the page, on front matter that is absent or malformed", () => {
    const absent = parsePage("no-front.md", "# Just a heading\n");
    const unterminated = parsePage("open.md", "---\nid: open\n\n# body\n");
    const garbled = parsePage("garbled.md", "---\nid: garbled\nthis line is not a field\n---\n");
    const findings = checkFrontmatter([absent, unterminated, garbled]).join("\n");
    expect(findings).toContain("no-front.md: front matter is absent or malformed");
    expect(findings).toContain("open.md: front matter is absent or malformed");
    expect(findings).toContain("garbled.md: front matter is absent or malformed");
  });

  it("fails on a wrong id, a missing key, a long description, or a sidebar_position", () => {
    const findings = checkFrontmatter([
      seedPage("a.md", ["id: not-a", "title: A", "sidebar_label: A", "description: A."]),
      seedPage("b.md", ["id: b", "title:", "sidebar_label: B", "description: B."]),
      seedPage("c.md", ["id: c", "title: C", "description: C."]),
      seedPage("d.md", [
        "id: d",
        "title: D",
        "sidebar_label: D",
        `description: ${"d".repeat(161)}`,
      ]),
      seedPage("e.md", [...goodFields("e"), "sidebar_position: 2"]),
    ]).join("\n");
    expect(findings).toContain("does not match the file stem");
    expect(findings).toContain("b.md: title is absent or empty");
    expect(findings).toContain("c.md: sidebar_label is absent or empty");
    expect(findings).toContain("d.md: description is 161 characters");
    expect(findings).toContain("e.md: sidebar_position is set");
  });

  it("fails, naming the set, when a transaction set has no worked example", () => {
    const pages = [seedPage("intro.md", goodFields("intro"), "```ts\nget835(d, tx);\n```")];
    const findings = checkTransactionSetCoverage(
      pages,
      new Map([
        ["835", ["get835", "build835"]],
        ["834", ["get834Header", "build834"]],
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("transaction set 834");
  });

  it("does not count a set named only in prose, or called only in a non-TypeScript fence", () => {
    const pages = [
      seedPage(
        "intro.md",
        goodFields("intro"),
        ["The build834 builder exists.", "```js", "build834(spec);", "```"].join("\n"),
      ),
    ];
    expect(
      checkTransactionSetCoverage(pages, new Map([["834", ["build834"]]])).join("\n"),
    ).toContain("transaction set 834");
  });

  it("fails on a sample that neither runs nor gives a reason, or does both", () => {
    const pages = [
      seedPage(
        "intro.md",
        goodFields("intro"),
        [
          "```ts",
          "untagged();",
          "```",
          "```js no-run",
          "noReason();",
          "```",
          "```ts runnable no-run but it runs",
          "both();",
          "```",
          "```ts no-run it needs a socket",
          "fine();",
          "```",
          "```bash",
          "not-a-sample",
          "```",
        ].join("\n"),
      ),
    ];
    expect(checkSamplesAccounted(pages)).toEqual([
      "docs-content/intro.md: ts",
      "docs-content/intro.md: js no-run",
      "docs-content/intro.md: ts runnable no-run but it runs",
    ]);
  });

  it("fails on a quality page whose Current numbers section holds a typed number", () => {
    const placeholder = `## Current numbers\n\n${CURRENT_NUMBERS_PLACEHOLDER}\n`;
    const good = [
      seedPage("testing-and-quality.md", goodFields("testing-and-quality"), placeholder),
      seedPage("performance.md", goodFields("performance"), `${placeholder}\n## Next\n\nMore.`),
    ];
    expect(checkCurrentNumbers(good)).toEqual([]);
    const typed = [
      seedPage(
        "testing-and-quality.md",
        goodFields("testing-and-quality"),
        `${placeholder}\nLine coverage: 100%.\n`,
      ),
      seedPage("performance.md", goodFields("performance"), "## Numbers\n"),
    ];
    const findings = checkCurrentNumbers(typed).join("\n");
    expect(findings).toContain(
      'testing-and-quality.md: "## Current numbers" holds something other',
    );
    expect(findings).toContain('performance.md has no "## Current numbers" section');
    expect(checkCurrentNumbers([]).join("\n")).toContain("testing-and-quality.md is absent");
  });

  it("derives the public export set from src/index.ts, aliases and type exports included", () => {
    const names = publicEntryExports(
      [
        "/** export { NotReal } from './nowhere.js'; */",
        "// export { AlsoNotReal } from './nowhere.js';",
        'export const VERSION: string = "0.0.0";',
        'export { parseX12, inner as outer } from "./parser/index.js";',
        'export type { X12Interchange } from "./parser/types.js";',
        'export { build835, type Build835Spec } from "./transactions/remit/index.js";',
        "export function helper(): void {}",
      ].join("\n"),
    );
    expect([...names].sort()).toEqual([
      "Build835Spec",
      "VERSION",
      "X12Interchange",
      "build835",
      "helper",
      "outer",
      "parseX12",
    ]);
  });

  it("reports a sample that does not compile, naming it", () => {
    const errors = sampleCompileErrors(root, "@cosyte/x12", PUBLIC_ENTRY_SOURCE, [
      { name: "good", code: 'import { parseX12 } from "@cosyte/x12";\nparseX12("");\n' },
      { name: "bad", code: 'import { parseX12 } from "@cosyte/x12";\nparseX12(1);\n' },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^bad line 2: TS\d+ /);
  }, 120_000);
});

// ---------------------------------------------------------------------------
// The quickstart's FIRST example is the first thing a reader runs from the
// docs site, so it is held to the README gate's standard: it must be the block
// the snippet sweep executes, its interchange must be a committed synthetic
// fixture (the page is public, and `test/fixtures` is the corpus `pnpm
// phi-scan` reads), and a changed value in it must turn this suite red.
// ---------------------------------------------------------------------------

const QUICKSTART = readFileSync(join(DOCS_DIR, "quickstart.md"), "utf8");
const QUICKSTART_FIRST = fences(QUICKSTART)[0];
const QUICKSTART_FIRST_RUNNABLE = extractRunnableSnippets(QUICKSTART)[0];
/** Temp modules for the explicit first-use runs; inside the root, as the harness requires. */
const FIRST_USE_TMP = join(root, ".cosyte-first-use-snippets");
/**
 * The snippet harness strips types without checking them, so compiling is checked separately, the
 * way a reader's new TypeScript project compiles the block, against the source entry point the
 * bundler compiles into the published types. A program over the source takes seconds to check, so
 * these cases state their own budget.
 */
const COMPILE_TIMEOUT = 60_000;

afterAll(() => {
  rmSync(FIRST_USE_TMP, { recursive: true, force: true });
});

describe("the quickstart's first example", () => {
  it("AC-XT1: is a runnable TypeScript block, so the snippet sweep executes it", () => {
    expect(QUICKSTART_FIRST?.lang).toBe("ts");
    expect(QUICKSTART_FIRST?.tags).toContain("runnable");
    expect(QUICKSTART_FIRST?.tags).not.toContain("throws");
    expect(QUICKSTART_FIRST_RUNNABLE?.code).toBe(QUICKSTART_FIRST?.body);
  });

  it(
    "AC-XT1: compiles in a new TypeScript project against the package's types",
    () => {
      expect(
        compileErrors(root, "@cosyte/x12", PUBLIC_ENTRY_SOURCE, QUICKSTART_FIRST?.body ?? ""),
      ).toEqual([]);
    },
    COMPILE_TIMEOUT,
  );

  it(
    "AC-XT1: a block that does not compile is reported, so it turns this suite red",
    () => {
      const code = QUICKSTART_FIRST?.body ?? "";
      const guard = 'if (remit === undefined) throw new Error("not an 835");\n';
      expect(code.split(guard).length - 1).toBe(1);
      const errors = compileErrors(
        root,
        "@cosyte/x12",
        PUBLIC_ENTRY_SOURCE,
        code.replace(guard, ""),
      );
      expect(errors).not.toEqual([]);
      for (const error of errors) expect(error).toContain("TS18048");
    },
    COMPILE_TIMEOUT,
  );

  it("AC-XT1: runs against the built package and every claimed value holds", async () => {
    expect(QUICKSTART_FIRST_RUNNABLE).toBeDefined();
    if (QUICKSTART_FIRST_RUNNABLE === undefined) return;
    await runSnippet(QUICKSTART_FIRST_RUNNABLE, { resolve: resolveEntry, tmpDir: FIRST_USE_TMP });
  });

  it("AC-XT4: its interchange is a copy of a synthetic fixture committed under test/fixtures", () => {
    const literals = interchangeLiterals(QUICKSTART_FIRST_RUNNABLE?.code ?? "");
    expect(literals).toHaveLength(1);
    const fixtures = committedFixtureTexts(root, join(root, "test", "fixtures"));
    expect(fixtures.get((literals[0] ?? "").trimEnd())).toBeDefined();
  });

  it("AC-XT3: a changed claimed value turns the run red", async () => {
    const code = QUICKSTART_FIRST_RUNNABLE?.code ?? "";
    const claim = 'claim?.patientControlNumber; // => "PT-ACCT-001"';
    expect(code.split(claim).length - 1).toBe(1);
    const mutated = code.replace(claim, 'claim?.patientControlNumber; // => "PT-ACCT-002"');
    await expect(
      runSnippet(mutated, { resolve: resolveEntry, tmpDir: FIRST_USE_TMP }),
    ).rejects.toThrow();
  });

  it("AC-XT3: a changed input value turns the run red and leaves the fixture corpus", async () => {
    const code = QUICKSTART_FIRST_RUNNABLE?.code ?? "";
    expect(code.split("CLP*PT-ACCT-001*").length - 1).toBe(1);
    const mutated = code.replace("CLP*PT-ACCT-001*", "CLP*PT-ACCT-002*");
    const fixtures = committedFixtureTexts(root, join(root, "test", "fixtures"));
    expect(fixtures.get((interchangeLiterals(mutated)[0] ?? "").trimEnd())).toBeUndefined();
    await expect(
      runSnippet(mutated, { resolve: resolveEntry, tmpDir: FIRST_USE_TMP }),
    ).rejects.toThrow();
  });
});

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { docSnippetSuite } from "@cosyte/vitest-config/snippets";

/**
 * Doc/code-agreement gate. Every ```` ```ts runnable ```` block in `docs-content/` is extracted,
 * compiled, and executed, and its inline `// =>` assertions are checked - so a documented example
 * can never silently drift from the shipped code (the documentation analog of the parser conformance
 * runners). Blocks tagged ` ```ts runnable throws ` must throw; plain ` ```ts ` blocks are
 * illustrative and are not executed.
 *
 * `@cosyte/x12` ships a single top-level entry, so every snippet imports `@cosyte/x12` and resolves
 * against the **built** ESM artifact - exactly what an installer loads, not the source tree. The
 * runnable blocks stay on the deterministic, in-process readers / builders (`parseX12`, `get835`,
 * `build271`, `parse999`, …); nothing here opens a socket or reads a real feed, and every EDI fixture
 * is synthetic.
 *
 * The shared CI gate runs `test` before `build`, so we provision `dist/` on demand here rather than
 * assuming order.
 *
 * The second half of this file is a different gate on the same directory, and the two are
 * deliberately not merged. The snippet suite proves that the examples this bundle DOES carry still
 * agree with the code. It says nothing about whether the bundle is COMPLETE or INTERNALLY
 * CONSISTENT: nothing failed when a page was orphaned from the sidebar, when a cross-link dangled,
 * when an example imported an export that does not exist, or when a shipped transaction set had no
 * worked example anywhere. The bundle-contract suite below is that missing half, and it is
 * deliberately a CONTENT check rather than an execution one - executing a fenced block is the
 * snippet suite's job and is not duplicated here.
 */
const root = join(import.meta.dirname, "..");

/** Map the published entry point to its built ESM artifact. */
const ENTRY = join(root, "dist", "index.mjs");

/** The narrative bundle `scripts/build-docs-artifacts.sh` tars for the docs site. */
const DOCS_DIR = join(root, "docs-content");

/** The public entry point whose exports a fenced example is allowed to import. */
const PUBLIC_ENTRY_SOURCE = join(root, "src", "index.ts");

beforeAll(() => {
  execFileSync("pnpm", ["build"], { cwd: root, stdio: "inherit" });
}, 120_000);

docSnippetSuite({
  docsDir: DOCS_DIR,
  resolve: (specifier) => (specifier === "@cosyte/x12" ? ENTRY : undefined),
});

// ---------------------------------------------------------------------------
// The bundle contract: frontmatter shape, sidebar bijection, link integrity,
// imported-symbol integrity, transaction-set coverage, and no umbrella
// bookkeeping on a public surface.
//
// Every check below is a PURE FUNCTION from an in-memory bundle to a list of
// human-readable findings. That shape is the whole design: the same function
// runs against the real `docs-content/` (which must produce none) and against
// deliberately-broken seeded bundles (which must produce one, naming the
// offender). A checker that can no longer see is the failure mode a green
// suite hides, so each one is proven to still red before its verdict on the
// real tree is believed - the same bargain `scripts/check-no-internal-refs.sh`
// makes with its own self-tests.
// ---------------------------------------------------------------------------

/** One markdown page of the bundle, parsed into frontmatter and body. */
interface DocsPage {
  /** File name relative to `docs-content/`, e.g. `"intro.md"`. */
  readonly file: string;
  /** File name without its extension - the document id a sidebar entry names. */
  readonly stem: string;
  /**
   * The parsed frontmatter block, or `undefined` when the page carries none or
   * carries one this parser cannot read. The two are deliberately ONE state:
   * both mean "this page states no id, title or position", and a page that
   * states none must red rather than be skipped.
   */
  readonly frontmatter: Readonly<Record<string, string>> | undefined;
  /** Everything after the frontmatter block. */
  readonly body: string;
}

/** One fenced code block, with its info-string split into language and tags. */
interface FencedBlock {
  /** The fence language token (`ts`, `js`, `bash`, or `""` for a bare fence). */
  readonly lang: string;
  /** The remaining info-string tokens (`["runnable", "throws"]`). */
  readonly meta: readonly string[];
  /** The block's source, dedented to the fence's own indentation. */
  readonly code: string;
}

/** Fence languages a "fenced TypeScript example" is written in. */
const TYPESCRIPT_FENCE_LANGS: ReadonlySet<string> = new Set(["ts", "typescript", "tsx"]);

/**
 * The transaction-set map from `docs-content/spec-notes-transaction-sets.md`,
 * as data: each set the library claims, and the reader / builder exports that
 * set is reached through. A set is covered when a fenced TypeScript example
 * anywhere in the bundle CALLS one of its exports.
 *
 * `837P` / `837I` / `837D` share the reader `get837Claims`, exactly as the map
 * does: that row lists one Read cell across the three variants and a builder
 * per variant, so the shared reader covers all three.
 */
const TRANSACTION_SET_EXPORTS: ReadonlyMap<string, readonly string[]> = new Map([
  ["270", ["get270Inquiry", "parse270Inquiries", "build270"]],
  ["271", ["get271Eligibility", "build271"]],
  ["276", ["get276StatusInquiry", "parse276StatusInquiries", "build276"]],
  ["277", ["get277Status", "build277"]],
  ["277CA", ["get277CADisposition", "build277CA"]],
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
 * An umbrella work-item identifier: an `S` followed by four digits and a
 * hyphen. Internal project bookkeeping never appears on a published surface
 * (`scripts/check-no-internal-refs.sh` states the directive and scans this same
 * directory); that gate keys on the ecosystem's own project prefixes, which
 * does not include the umbrella's item shape, so this half is asserted here.
 */
const UMBRELLA_ITEM_ID = /S\d{4}-/;

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
 * Every fenced TypeScript block of a page, runnable or illustrative.
 *
 * @param page - The page to read.
 * @returns The blocks whose fence language is a TypeScript one.
 */
function typescriptBlocks(page: DocsPage): FencedBlock[] {
  return fencedBlocks(page.body).filter((b) => TYPESCRIPT_FENCE_LANGS.has(b.lang));
}

/**
 * Remove fenced blocks and inline code spans, so a prose scan never reads a
 * code sample as prose. A markdown link inside a fence is a code sample, and a
 * bracket-paren pair inside backticks is an expression.
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
 * Parse one page into frontmatter and body.
 *
 * @param file - The file name relative to `docs-content/`.
 * @param source - The file's contents.
 * @returns The parsed page; `frontmatter` is `undefined` when the block is
 *   absent or malformed.
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
    // A line the parser cannot read makes the WHOLE block unreadable. Skipping
    // it would let a page state a broken id and still be graded on the fields
    // that happened to parse.
    if (field === null) return { file, stem, frontmatter: undefined, body: source };
    fields[field[1] ?? ""] = (field[2] ?? "").trim();
  }
  return {
    file,
    stem,
    frontmatter: Object.freeze(fields),
    body: lines.slice(close + 1).join("\n"),
  };
}

/**
 * Flatten a Docusaurus sidebar definition into the ordered document ids it
 * names, descending through categories.
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
 * The names the package's public entry point exports, value and type alike.
 * Derived from the source rather than restated, so it cannot drift.
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
 * The names a fenced block imports from `@cosyte/x12`.
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

/**
 * Frontmatter shape: an `id` equal to the file stem, a non-empty `title`, and a
 * `sidebar_position` that is a positive integer.
 *
 * @param pages - The bundle's pages.
 * @returns One finding per offending page.
 */
function checkFrontmatter(pages: readonly DocsPage[]): string[] {
  const findings: string[] = [];
  for (const page of pages) {
    if (page.frontmatter === undefined) {
      findings.push(`docs-content/${page.file}: frontmatter block is absent or malformed`);
      continue;
    }
    const id = page.frontmatter["id"];
    if (id !== page.stem) {
      findings.push(
        `docs-content/${page.file}: frontmatter id ${JSON.stringify(id ?? null)} does not match the file stem "${page.stem}"`,
      );
    }
    const title = page.frontmatter["title"];
    if (title === undefined || title.length === 0) {
      findings.push(`docs-content/${page.file}: frontmatter title is absent or empty`);
    }
    const position = page.frontmatter["sidebar_position"];
    if (position === undefined || !/^[1-9][0-9]*$/.test(position)) {
      findings.push(
        `docs-content/${page.file}: frontmatter sidebar_position ${JSON.stringify(position ?? null)} is not a positive integer`,
      );
    }
  }
  return findings;
}

/**
 * Sidebar bijection, both directions: every sidebar id resolves to a page, and
 * every page is referenced exactly once.
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
 * `sidebar_position` is unique across the bundle and ascends in the order the
 * page appears in `sidebars.json`. The sidebar is authoritative for order; the
 * frontmatter follows it.
 *
 * @param pages - The bundle's pages.
 * @param order - The document ids `sidebars.json` names, in order.
 * @returns One finding per offending pair or duplicate.
 */
function checkSidebarPositions(pages: readonly DocsPage[], order: readonly string[]): string[] {
  const findings: string[] = [];
  const byStem = new Map(pages.map((p) => [p.stem, p]));

  const byPosition = new Map<string, string[]>();
  for (const page of pages) {
    const position = page.frontmatter?.["sidebar_position"];
    if (position === undefined) continue;
    byPosition.set(position, [...(byPosition.get(position) ?? []), page.file]);
  }
  for (const [position, files] of byPosition) {
    if (files.length > 1) {
      findings.push(
        `sidebar_position ${position} is used by more than one page: ${files.sort().join(", ")}`,
      );
    }
  }

  let previous: { file: string; position: number } | undefined;
  for (const id of order) {
    const page = byStem.get(id);
    const raw = page?.frontmatter?.["sidebar_position"];
    if (page === undefined || raw === undefined || !/^[1-9][0-9]*$/.test(raw)) continue;
    const position = Number(raw);
    if (previous !== undefined && position <= previous.position) {
      findings.push(
        `docs-content/${page.file} has sidebar_position ${String(position)}, which does not ascend past docs-content/${previous.file} (${String(previous.position)})`,
      );
    }
    previous = { file: page.file, position };
  }
  return findings;
}

/**
 * Every relative markdown link between pages resolves to a page in the bundle,
 * ignoring any `#anchor` suffix.
 *
 * @param pages - The bundle's pages.
 * @returns One finding per dangling link, naming the source page and target.
 */
function checkRelativeLinks(pages: readonly DocsPage[]): string[] {
  const findings: string[] = [];
  const stems = new Set(pages.map((p) => p.stem));
  for (const page of pages) {
    for (const match of withoutCode(page.body).matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const raw = match[1] ?? "";
      // Absolute URLs and pure anchors are not links between pages.
      if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(raw) || raw.startsWith("#") || raw.startsWith("//")) {
        continue;
      }
      const target = (raw.split("#")[0] ?? "").replace(/^\.\//, "").replace(/\.mdx?$/, "");
      if (target.length === 0) continue;
      if (!stems.has(target)) {
        findings.push(
          `docs-content/${page.file} links to "${raw}", which resolves to no page in the bundle (looked for "${target}")`,
        );
      }
    }
  }
  return findings;
}

/**
 * Every symbol a fenced TypeScript example imports from `@cosyte/x12` is one
 * the public entry point actually exports.
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
            `docs-content/${page.file}: a fenced TypeScript example imports "${symbol}", which the package entry point does not export`,
          );
        }
      }
    }
  }
  return findings;
}

/**
 * Every transaction set in the map has at least one fenced TypeScript example
 * calling one of its reader or builder exports.
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
        `transaction set ${set} has no fenced TypeScript example calling any of: ${exports.join(", ")}`,
      );
    }
  }
  return findings;
}

/**
 * No umbrella work-item identifier appears anywhere in the bundle.
 *
 * @param files - Every file of the bundle, name and contents.
 * @returns One finding per offending file, naming the identifier.
 */
function checkNoUmbrellaItemIds(files: ReadonlyMap<string, string>): string[] {
  const findings: string[] = [];
  for (const [name, text] of files) {
    const hit = UMBRELLA_ITEM_ID.exec(text);
    if (hit !== null) {
      findings.push(
        `docs-content/${name} carries an umbrella item identifier ("${hit[0]}"), which is internal bookkeeping and never belongs on a published surface`,
      );
    }
  }
  return findings;
}

/**
 * The bundle is shaped the way `scripts/build-docs-artifacts.sh` requires: a
 * non-empty page set, plus the two files the docs site validates.
 *
 * @param files - Every file of the bundle, name and contents.
 * @param pages - The bundle's markdown pages.
 * @returns One finding per missing requirement.
 */
function checkBundleShape(files: ReadonlyMap<string, string>, pages: readonly DocsPage[]): string[] {
  const findings: string[] = [];
  if (pages.length === 0) {
    findings.push("docs-content/ carries no markdown page, so the narrative bundle would be empty");
  }
  if (!files.has("intro.md")) findings.push("docs-content/intro.md is absent");
  if (!files.has("sidebars.json")) findings.push("docs-content/sidebars.json is absent");
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

/** The document ids `sidebars.json` names, in order. */
const BUNDLE_SIDEBAR_ORDER: readonly string[] = sidebarOrder(
  JSON.parse(BUNDLE_FILES.get("sidebars.json") ?? "{}") as unknown,
);

/** The names `src/index.ts` publishes. */
const PUBLIC_EXPORTS: ReadonlySet<string> = publicEntryExports(
  readFileSync(PUBLIC_ENTRY_SOURCE, "utf8"),
);

describe("docs-content bundle contract", () => {
  it("carries a non-empty page set plus the two files the docs site validates", () => {
    expect(checkBundleShape(BUNDLE_FILES, BUNDLE_PAGES)).toEqual([]);
  });

  it("states an id, a title and a sidebar_position on every page", () => {
    expect(checkFrontmatter(BUNDLE_PAGES)).toEqual([]);
  });

  it("references every page from sidebars.json exactly once, and resolves every id", () => {
    expect(checkSidebarBijection(BUNDLE_PAGES, BUNDLE_SIDEBAR_ORDER)).toEqual([]);
  });

  it("orders sidebar_position uniquely and ascending in sidebar order", () => {
    expect(checkSidebarPositions(BUNDLE_PAGES, BUNDLE_SIDEBAR_ORDER)).toEqual([]);
  });

  it("resolves every relative link between pages", () => {
    expect(checkRelativeLinks(BUNDLE_PAGES)).toEqual([]);
  });

  it("imports only symbols the public entry point exports", () => {
    // Non-vacuity: an extractor that found nothing would pass this check while
    // seeing none of the bundle.
    expect(PUBLIC_EXPORTS.has("parseX12")).toBe(true);
    expect(PUBLIC_EXPORTS.has("serializeX12")).toBe(true);
    expect(PUBLIC_EXPORTS.has("X12Interchange")).toBe(true);
    expect(PUBLIC_EXPORTS.size).toBeGreaterThan(100);
    expect(checkImportedSymbols(BUNDLE_PAGES, PUBLIC_EXPORTS)).toEqual([]);
  });

  it("carries a worked example for every transaction set the library claims", () => {
    expect(checkTransactionSetCoverage(BUNDLE_PAGES, TRANSACTION_SET_EXPORTS)).toEqual([]);
  });

  it("carries no umbrella item identifier anywhere", () => {
    expect(checkNoUmbrellaItemIds(BUNDLE_FILES)).toEqual([]);
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
// The checkers' own self-tests. A gate is believed only after it has shown it
// can still see: each check above is re-run against a seeded bundle carrying
// exactly the defect it exists to catch, and must name the offender.
// ---------------------------------------------------------------------------

/**
 * Build a page from frontmatter fields and a body, the way an author would.
 *
 * @param file - The file name, e.g. `"intro.md"`.
 * @param fields - The frontmatter lines, without the `---` fences.
 * @param body - The markdown body.
 * @returns The parsed page.
 */
function seedPage(file: string, fields: readonly string[], body = ""): DocsPage {
  return parsePage(file, `---\n${fields.join("\n")}\n---\n\n${body}\n`);
}

/** A two-page bundle that is correct in every respect the checkers grade. */
function seedBundle(): { pages: DocsPage[]; order: string[] } {
  return {
    pages: [
      seedPage("intro.md", ["id: intro", "title: Getting started", "sidebar_position: 1"], "[a](./b)"),
      seedPage("b.md", ["id: b", "title: B", "sidebar_position: 2"], "```ts\nimport { parseX12 } from '@cosyte/x12';\nparseX12('');\n```"),
    ],
    order: ["intro", "b"],
  };
}

describe("the bundle-contract checkers still see", () => {
  it("report nothing on a well-formed seeded bundle", () => {
    const { pages, order } = seedBundle();
    const files = new Map([
      ["intro.md", "clean"],
      ["sidebars.json", "{}"],
    ]);
    expect(checkBundleShape(files, pages)).toEqual([]);
    expect(checkFrontmatter(pages)).toEqual([]);
    expect(checkSidebarBijection(pages, order)).toEqual([]);
    expect(checkSidebarPositions(pages, order)).toEqual([]);
    expect(checkRelativeLinks(pages)).toEqual([]);
    expect(checkImportedSymbols(pages, new Set(["parseX12"]))).toEqual([]);
    expect(checkNoUmbrellaItemIds(files)).toEqual([]);
  });

  it("fails, naming the id, when sidebars.json names a document with no file", () => {
    const { pages } = seedBundle();
    const findings = checkSidebarBijection(pages, ["intro", "b", "ghost-page"]);
    expect(findings.join("\n")).toContain("ghost-page");
    expect(findings).toHaveLength(1);
  });

  it("fails, naming the file, when a page no sidebar entry references exists", () => {
    const { pages, order } = seedBundle();
    const orphan = seedPage("stray.md", ["id: stray", "title: Stray", "sidebar_position: 9"]);
    const findings = checkSidebarBijection([...pages, orphan], order);
    expect(findings.join("\n")).toContain("stray.md");
    expect(findings).toHaveLength(1);
  });

  it("fails when one document id is referenced twice", () => {
    const { pages } = seedBundle();
    const findings = checkSidebarBijection(pages, ["intro", "b", "b"]);
    expect(findings.join("\n")).toContain('"b" 2 times');
  });

  it("fails, naming source and target, when a relative link points at no page", () => {
    const pages = [
      seedPage("intro.md", ["id: intro", "title: I", "sidebar_position: 1"], "see [gone](./gone)"),
    ];
    const findings = checkRelativeLinks(pages);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("intro.md");
    expect(findings[0]).toContain("gone");
  });

  it("ignores an anchor suffix, an absolute URL and a link inside a fence", () => {
    const pages = [
      seedPage(
        "intro.md",
        ["id: intro", "title: I", "sidebar_position: 1"],
        [
          "[here](#a-heading) and [there](./b#a-heading) and [away](https://example.com/x)",
          "```ts",
          "// [not a link](./nowhere)",
          "```",
          "and `[nor this](./nowhere-either)` inline",
        ].join("\n"),
      ),
      seedPage("b.md", ["id: b", "title: B", "sidebar_position: 2"]),
    ];
    expect(checkRelativeLinks(pages)).toEqual([]);
  });

  it("fails, naming the symbol and the page, on an import the entry point lacks", () => {
    const pages = [
      seedPage(
        "intro.md",
        ["id: intro", "title: I", "sidebar_position: 1"],
        "```ts runnable\nimport { parseX12, notAnExport } from \"@cosyte/x12\";\n```",
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
        ["id: intro", "title: I", "sidebar_position: 1"],
        "```ts\nimport { type GoneType } from \"@cosyte/x12\";\n```",
      ),
    ];
    expect(checkImportedSymbols(pages, new Set(["parseX12"])).join("\n")).toContain("GoneType");
  });

  it("fails on an empty page set rather than reporting an empty bundle clean", () => {
    const findings = checkBundleShape(new Map(), []);
    expect(findings.join("\n")).toContain("no markdown page");
    expect(findings.join("\n")).toContain("intro.md is absent");
    expect(findings.join("\n")).toContain("sidebars.json is absent");
  });

  it("fails, naming the page, on a frontmatter block that is absent or malformed", () => {
    const absent = parsePage("no-front.md", "# Just a heading\n");
    const unterminated = parsePage("open.md", "---\nid: open\n\n# body\n");
    const garbled = parsePage("garbled.md", "---\nid: garbled\nthis line is not a field\n---\n");
    const findings = checkFrontmatter([absent, unterminated, garbled]);
    expect(findings.join("\n")).toContain("no-front.md: frontmatter block is absent or malformed");
    expect(findings.join("\n")).toContain("open.md: frontmatter block is absent or malformed");
    expect(findings.join("\n")).toContain("garbled.md: frontmatter block is absent or malformed");
  });

  it("fails on an id that is not the file stem, an empty title, or a bad position", () => {
    const findings = checkFrontmatter([
      seedPage("a.md", ["id: not-a", "title: A", "sidebar_position: 1"]),
      seedPage("b.md", ["id: b", "title:", "sidebar_position: 2"]),
      seedPage("c.md", ["id: c", "title: C", "sidebar_position: zero"]),
    ]);
    expect(findings.join("\n")).toContain("does not match the file stem");
    expect(findings.join("\n")).toContain("title is absent or empty");
    expect(findings.join("\n")).toContain("is not a positive integer");
  });

  it("fails when sidebar_position does not ascend in sidebar order", () => {
    const pages = [
      seedPage("intro.md", ["id: intro", "title: I", "sidebar_position: 5"]),
      seedPage("b.md", ["id: b", "title: B", "sidebar_position: 2"]),
    ];
    const findings = checkSidebarPositions(pages, ["intro", "b"]);
    expect(findings.join("\n")).toContain("does not ascend past docs-content/intro.md");
  });

  it("fails when two pages share a sidebar_position", () => {
    const pages = [
      seedPage("intro.md", ["id: intro", "title: I", "sidebar_position: 1"]),
      seedPage("b.md", ["id: b", "title: B", "sidebar_position: 1"]),
    ];
    expect(checkSidebarPositions(pages, ["intro", "b"]).join("\n")).toContain(
      "sidebar_position 1 is used by more than one page: b.md, intro.md",
    );
  });

  it("fails, naming the file, on an umbrella item identifier", () => {
    const findings = checkNoUmbrellaItemIds(new Map([["intro.md", "seeded S0042-example here"]]));
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("intro.md");
    expect(findings[0]).toContain("S0042-");
  });

  it("fails, naming the set, when a transaction set has no worked example", () => {
    const pages = [
      seedPage(
        "intro.md",
        ["id: intro", "title: I", "sidebar_position: 1"],
        "```ts\nget835(d, tx);\n```",
      ),
    ];
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
        ["id: intro", "title: I", "sidebar_position: 1"],
        ["The build834 builder exists.", "```js", "build834(spec);", "```"].join("\n"),
      ),
    ];
    expect(checkTransactionSetCoverage(pages, new Map([["834", ["build834"]]])).join("\n")).toContain(
      "transaction set 834",
    );
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
});

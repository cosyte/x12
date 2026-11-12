import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `KNOWN-LIMITATIONS.md` opens with a short list, one line per limit, grouped as the detail below
 * it is grouped, and each line links to the heading that holds that limit's detail. The list and
 * the detail are two places the same limit is named, so this holds them to each other: a limit
 * listed and not detailed, detailed and not listed, renamed in one place, or moved to another group
 * fails here by name. The troubleshooting page and the README link to the list instead of restating
 * it, so every link into `KNOWN-LIMITATIONS.md` from them must land on a heading. The page records
 * what holds today; the history of each change is the changelog's, so no release number appears.
 */
const root = join(import.meta.dirname, "..");
const read = (path: string): string => readFileSync(join(root, path), "utf8");

/** The heading that opens the short list. */
const LIST_HEADING = "The list";

/** One limit: its group, its title and the anchor it is reached by. */
interface Limit {
  readonly group: string;
  readonly title: string;
  readonly anchor: string;
}

/**
 * The anchor a heading is reached by, as GitHub renders it: lower-cased, punctuation dropped,
 * spaces turned to hyphens.
 *
 * @param heading - The heading text, markdown included.
 * @returns The anchor, without the `#`.
 */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
    .replaceAll(/\s/g, "-");
}

/**
 * The page's sections, by level-2 heading, with the lines under each.
 *
 * @param markdown - The whole page.
 * @returns Each section's heading and lines, in page order, fenced code skipped.
 */
function sections(markdown: string): { heading: string; lines: string[] }[] {
  const out: { heading: string; lines: string[] }[] = [];
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const match = /^## (.+)$/.exec(line);
    if (match !== null) out.push({ heading: (match[1] ?? "").trim(), lines: [] });
    else out.at(-1)?.lines.push(line);
  }
  return out;
}

/**
 * The limits the short list names, each line a link to an anchor on the same page.
 *
 * @param markdown - The whole page.
 * @returns The listed limits, in list order.
 */
function listedLimits(markdown: string): Limit[] {
  const list = sections(markdown).find((section) => section.heading === LIST_HEADING);
  if (list === undefined) return [];
  const out: Limit[] = [];
  let group = "";
  for (const line of list.lines) {
    const heading = /^### (.+)$/.exec(line);
    if (heading !== null) {
      group = (heading[1] ?? "").trim();
      continue;
    }
    const item = /^- \[(.+)\]\(#([^)]+)\)$/.exec(line);
    if (item !== null) out.push({ group, title: item[1] ?? "", anchor: item[2] ?? "" });
  }
  return out;
}

/**
 * The limits the detail below the list holds: every level-3 heading under a level-2 group.
 *
 * @param markdown - The whole page.
 * @returns The detailed limits, in page order.
 */
function detailedLimits(markdown: string): Limit[] {
  const out: Limit[] = [];
  for (const section of sections(markdown)) {
    if (section.heading === LIST_HEADING) continue;
    for (const line of section.lines) {
      const heading = /^### (.+)$/.exec(line);
      if (heading === null) continue;
      const title = (heading[1] ?? "").trim();
      out.push({ group: section.heading, title, anchor: slug(title) });
    }
  }
  return out;
}

/**
 * What disagrees between the list and the detail, one line per disagreement.
 *
 * @param markdown - The whole page.
 * @returns The disagreements, empty when the two match.
 */
function listDrift(markdown: string): string[] {
  const listed = listedLimits(markdown);
  const detailed = detailedLimits(markdown);
  const key = (limit: Limit): string => `${limit.group} > ${limit.title} (#${limit.anchor})`;
  const listedKeys = new Set(listed.map(key));
  const detailedKeys = new Set(detailed.map(key));
  return [
    ...listed.filter((limit) => !detailedKeys.has(key(limit))).map((l) => `listed only: ${key(l)}`),
    ...detailed
      .filter((limit) => !listedKeys.has(key(limit)))
      .map((l) => `detailed only: ${key(l)}`),
  ];
}

const PAGE = read("KNOWN-LIMITATIONS.md");

/** Every page that links into `KNOWN-LIMITATIONS.md`, and the anchors it links to. */
function anchorsLinkedFrom(path: string): string[] {
  const text = read(path);
  return [...text.matchAll(/KNOWN-LIMITATIONS\.md#([A-Za-z0-9_-]+)/g)].map((m) => m[1] ?? "");
}

const LINKING_PAGES = [
  "README.md",
  ...readdirSync(join(root, "docs-content"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => `docs-content/${name}`),
];

describe("KNOWN-LIMITATIONS.md opens with a short list of its limits", () => {
  it("has a list, and the list is not empty", () => {
    expect(listedLimits(PAGE).length).toBeGreaterThan(0);
  });

  it("names every limit in the list and in the detail, in the same group, under one title", () => {
    expect(listDrift(PAGE)).toEqual([]);
  });

  it("keeps the detail groups in the order the list gives them", () => {
    const order = (limits: Limit[]): string[] => [...new Set(limits.map((limit) => limit.group))];
    expect(order(listedLimits(PAGE))).toEqual(order(detailedLimits(PAGE)));
  });

  it("gives every limit its own anchor", () => {
    const anchors = detailedLimits(PAGE).map((limit) => limit.anchor);
    expect(anchors.length).toBe(new Set(anchors).size);
  });

  it("names no release, because the changelog holds the history", () => {
    expect(PAGE.match(/\b\d+\.\d+\.\d+\b/g) ?? []).toEqual([]);
  });
});

describe("the pages that link into KNOWN-LIMITATIONS.md land on a heading", () => {
  const anchors = new Set([
    slug(LIST_HEADING),
    ...detailedLimits(PAGE).map((limit) => limit.anchor),
  ]);

  it.each(LINKING_PAGES)("%s links only to anchors the page has", (path) => {
    expect(anchorsLinkedFrom(path).filter((anchor) => !anchors.has(anchor))).toEqual([]);
  });

  it("the troubleshooting page links to the list rather than restating it", () => {
    const page = read("docs-content/troubleshooting.md");
    const limits = sections(page).find((section) =>
      section.heading.startsWith("Known limitations"),
    );
    expect(limits).toBeDefined();
    const body = (limits?.lines ?? []).join("\n");
    expect(body).toContain("https://github.com/cosyte/x12/blob/main/KNOWN-LIMITATIONS.md#the-list");
    expect(limits?.lines.filter((line) => /^\s*- /.test(line))).toEqual([]);
  });
});

describe("CONTROL: drift between the list and the detail is reported by name", () => {
  const page = (listLines: string[], detail: string[]): string =>
    [
      "# Title",
      "",
      "## The list",
      "",
      "### Group",
      "",
      ...listLines,
      "",
      "## Group",
      "",
      ...detail,
    ].join("\n");

  it("reports nothing when the two match", () => {
    expect(listDrift(page(["- [A limit](#a-limit)"], ["### A limit", "", "Detail."]))).toEqual([]);
  });

  it("reports a limit detailed and not listed", () => {
    expect(listDrift(page([], ["### A limit"]))).toEqual([
      "detailed only: Group > A limit (#a-limit)",
    ]);
  });

  it("reports a limit listed and not detailed", () => {
    expect(listDrift(page(["- [A limit](#a-limit)"], []))).toEqual([
      "listed only: Group > A limit (#a-limit)",
    ]);
  });

  it("reports a renamed heading, and a link whose anchor does not match its title", () => {
    expect(listDrift(page(["- [A limit](#a-limit)"], ["### A limit, renamed"]))).toEqual([
      "listed only: Group > A limit (#a-limit)",
      "detailed only: Group > A limit, renamed (#a-limit-renamed)",
    ]);
    expect(listDrift(page(["- [A limit](#another)"], ["### A limit"]))).toHaveLength(2);
  });

  it("slugs a heading the way GitHub does", () => {
    expect(slug("`parseTA1` reads its fields, unescaped")).toBe(
      "parseta1-reads-its-fields-unescaped",
    );
  });
});

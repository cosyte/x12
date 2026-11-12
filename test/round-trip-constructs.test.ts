import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The two pages a reader meets first about round trips, `KNOWN-LIMITATIONS.md` and the
 * troubleshooting page, each open by naming the constructs the emit does not reproduce. They used to
 * name different lists (two on one page, five on the other), so a reader who stopped at the shorter
 * one trusted a round trip the other page warned about. This holds the two openings to the same
 * list, by the bold phrase each construct is named with.
 */
const root = join(import.meta.dirname, "..");

/** The constructs, by the bold phrase both openings name them with. */
const ROUND_TRIP_CONSTRUCTS = [
  "line breaks between segments",
  "a doubled segment terminator",
  "a missing final segment terminator",
  "a TA1 that followed a functional group",
  "bytes after the IEA",
] as const;

/**
 * The opening of a page: everything between its title and its first `##` heading, whitespace
 * collapsed so a reflowed paragraph does not read as a dropped phrase.
 *
 * @param markdown - The whole page.
 * @returns The opening, flattened.
 */
function opening(markdown: string): string {
  const afterTitle = markdown.slice(markdown.indexOf("\n# ") + 1);
  const body = afterTitle.slice(afterTitle.indexOf("\n") + 1);
  const end = body.search(/^## /m);
  return (end === -1 ? body : body.slice(0, end)).replaceAll(/\s+/g, " ");
}

/**
 * The constructs an opening does not name in bold.
 *
 * @param text - A flattened opening.
 * @returns The phrases missing, in list order.
 */
function unnamedConstructs(text: string): readonly string[] {
  return ROUND_TRIP_CONSTRUCTS.filter((phrase) => !text.includes(`**${phrase}**`));
}

describe("the round-trip constructs both openings name", () => {
  it("KNOWN-LIMITATIONS.md names all five in its opening", () => {
    const page = readFileSync(join(root, "KNOWN-LIMITATIONS.md"), "utf8");
    expect(unnamedConstructs(opening(`\n${page}`))).toEqual([]);
  });

  it("the troubleshooting page names all five in its opening", () => {
    const page = readFileSync(join(root, "docs-content", "troubleshooting.md"), "utf8");
    expect(unnamedConstructs(opening(page))).toEqual([]);
  });
});

describe("CONTROL: an opening that drops a construct is reported by name", () => {
  it("names the construct a short list leaves out, and only that one", () => {
    const page = [
      "# Title",
      "",
      "Watch for **line breaks between segments**, **a doubled segment terminator**,",
      "**a missing final segment terminator** and **a TA1 that followed a functional group**.",
      "",
      "## Later",
      "",
      "**bytes after the IEA** is named only below the opening.",
    ].join("\n");
    expect(unnamedConstructs(opening(`\n${page}`))).toEqual(["bytes after the IEA"]);
  });
});

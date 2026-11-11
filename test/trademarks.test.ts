import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The trademark notice for the X12 name. The package is named after the standard it reads and
 * builds, so both places a reader meets the notice, `TRADEMARKS.md` and the README's
 * `## Trademarks` section (which ships on the npm page), must name the owner of the X12 mark and
 * state the relationship as facts: whose mark it is, that we are not affiliated with, endorsed by or
 * certified by that owner, that the name only says which standard the package handles, and that no
 * logo of the owner is used.
 *
 * The notice states facts and draws no legal conclusion, so a phrase that asserts one fails here.
 * Every rule is a free function over the text, driven by fabricated notices in the CONTROL block,
 * so each failure direction is shown to fire.
 */
const root = join(import.meta.dirname, "..");

/** The facts the X12 notice must state, each as a pattern over whitespace-flattened prose. */
const X12_NOTICE_FACTS: readonly (readonly [string, RegExp])[] = [
  ["names the owner", /X12 is a mark of X12 Incorporated/],
  ["not affiliated", /not affiliated with[^.]*X12 Incorporated/i],
  ["not endorsed", /not[^.]*endorsed by[^.]*X12 Incorporated/i],
  ["not certified", /not[^.]*certified by[^.]*X12 Incorporated/i],
  ["descriptive use only", /name X12 only to say which standard/i],
  ["no logos", /uses none of X12 Incorporated's logos/i],
];

/** Phrases that state a legal conclusion rather than a fact. */
const LEGAL_CONCLUSIONS: readonly RegExp[] = [
  /fair use/i,
  /\bwe are (permitted|allowed|entitled)\b/i,
  /\bnominative\b/i,
  /\bdoes not infringe\b/i,
];

/** Whitespace-flattened text, so a fact split across wrapped lines still matches. */
function flatten(text: string): string {
  return text.replaceAll(/\s+/g, " ");
}

/** The names of the facts a notice fails to state. */
function missingNoticeFacts(text: string): string[] {
  const flat = flatten(text);
  return X12_NOTICE_FACTS.filter(([, pattern]) => !pattern.test(flat)).map(([name]) => name);
}

/** The legal-conclusion phrases a notice contains. */
function legalConclusions(text: string): string[] {
  const flat = flatten(text);
  return LEGAL_CONCLUSIONS.filter((pattern) => pattern.test(flat)).map(String);
}

/** The body of a `## heading` section, up to the next `## ` heading. */
function sectionBody(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) throw new Error(`no "## ${heading}" section`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

const trademarks = readFileSync(join(root, "TRADEMARKS.md"), "utf8");
const readmeTrademarks = sectionBody(readFileSync(join(root, "README.md"), "utf8"), "Trademarks");

describe("the X12 trademark notice", () => {
  it("TRADEMARKS.md names X12 Incorporated and states each fact", () => {
    expect(missingNoticeFacts(trademarks)).toEqual([]);
  });

  it("the README's Trademarks section names X12 Incorporated and states each fact", () => {
    expect(missingNoticeFacts(readmeTrademarks)).toEqual([]);
  });

  it("neither notice draws a legal conclusion", () => {
    expect(legalConclusions(trademarks)).toEqual([]);
    expect(legalConclusions(readmeTrademarks)).toEqual([]);
  });

  it("the README still names the other marks and points at TRADEMARKS.md", () => {
    const flat = flatten(readmeTrademarks);
    expect(flat).toContain("Availity");
    expect(flat).toContain("Blue Cross Blue Shield");
    expect(flat).toContain("TRADEMARKS.md");
  });
});

describe("CONTROL: the notice rules fire on fabricated notices", () => {
  const whole =
    "X12 is a mark of X12 Incorporated. Cosyte is not affiliated with, endorsed by, or certified\n" +
    "by X12 Incorporated. This package uses the name X12 only to say which standard it reads and\n" +
    "builds, and it uses none of X12 Incorporated's logos.";

  it("accepts a notice that states every fact", () => {
    expect(missingNoticeFacts(whole)).toEqual([]);
    expect(legalConclusions(whole)).toEqual([]);
  });

  it("names each fact a notice leaves out", () => {
    expect(missingNoticeFacts("Availity is a trademark of its owner.")).toEqual(
      X12_NOTICE_FACTS.map(([name]) => name),
    );
    expect(missingNoticeFacts(whole.replace("certified", "sponsored"))).toEqual(["not certified"]);
    expect(missingNoticeFacts(whole.replace("X12 Incorporated.", "its owner."))).toEqual([
      "names the owner",
    ]);
  });

  it("flags a legal conclusion", () => {
    expect(legalConclusions(`${whole} This is fair use.`)).toEqual(["/fair use/i"]);
    expect(legalConclusions(`${whole} We are permitted to use the name.`)).toHaveLength(1);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as codeLists from "../src/code-lists/index.js";
import { WARNING_CODES } from "../src/parser/warnings.js";
import { ENROLLMENT_834_BUILD_ERROR_CODES } from "../src/transactions/enrollment/build-errors.js";

/**
 * The statement that we do not validate against implementation guides is a claim about what the
 * code checks, so it is held against the code here. It names every code-list check the readers and
 * builders make, it names every bundled list that is printed inside a TR3, and it never says we ship
 * nothing derived from a TR3, because three cited code subsets are. README.md and
 * KNOWN-LIMITATIONS.md carry it in the same words; the troubleshooting page carries it with links.
 */
const root = join(import.meta.dirname, "..");
const read = (path: string): string => readFileSync(join(root, path), "utf8");

const OPENING = "**We do not validate against implementation guides.**";

/** The paragraph or list item that opens with {@link OPENING}, whitespace collapsed. */
function statement(text: string): string {
  const start = text.indexOf(OPENING);
  if (start === -1) return "";
  const rest = text.slice(start);
  const end = rest.search(/\n\s*\n|\n- /);
  return (end === -1 ? rest : rest.slice(0, end)).replace(/\s+/g, " ").trim();
}

const README = statement(read("README.md"));
const LIMITS = statement(read("KNOWN-LIMITATIONS.md"));
const TROUBLESHOOTING = statement(read("docs-content/troubleshooting.md"));

/** Every warning a reader raises when a code falls outside a bundled list, and the 834 refusal. */
const CODE_LIST_CHECKS = [
  WARNING_CODES.X12_UNKNOWN_CARC,
  WARNING_CODES.X12_UNKNOWN_RARC,
  WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS,
  WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY,
  WARNING_CODES.X12_271_AAA_UNKNOWN_CODE,
  WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
  WARNING_CODES.X12_834_UNKNOWN_MAINTENANCE_TYPE,
  ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE,
];

/** The exported snapshots whose redistribution record says they are printed inside a TR3. */
const TR3_LISTS = Object.entries(codeLists)
  .filter(([, value]) => {
    const meta = (value as { meta?: { redistribution?: { status?: string } } } | undefined)?.meta;
    return meta?.redistribution?.status === "not-established";
  })
  .map(([name]) => name);

describe("the no-guide-validation statement", () => {
  it("is present in the README, KNOWN-LIMITATIONS and the troubleshooting page", () => {
    expect(README).not.toBe("");
    expect(LIMITS).not.toBe("");
    expect(TROUBLESHOOTING).not.toBe("");
  });

  it("says the same words in KNOWN-LIMITATIONS as in the README", () => {
    expect(LIMITS).toBe(README);
  });

  it.each([
    ["README.md", README],
    ["troubleshooting.md", TROUBLESHOOTING],
  ])("%s names every code-list check the package makes", (_file, text) => {
    for (const code of CODE_LIST_CHECKS) expect(text).toContain(`\`${code}\``);
  });

  it.each([
    ["README.md", README],
    ["troubleshooting.md", TROUBLESHOOTING],
  ])("%s names every bundled list printed inside a TR3", (_file, text) => {
    expect(TR3_LISTS).toEqual(expect.arrayContaining(["CLP_STATUS", "MAINTENANCE_TYPE_CODES"]));
    for (const name of [...TR3_LISTS, "HI_QUALIFIERS"]) expect(text).toContain(`\`${name}\``);
  });

  it.each([
    ["README.md", README],
    ["troubleshooting.md", TROUBLESHOOTING],
  ])("%s never says nothing derived from a TR3 ships", (_file, text) => {
    expect(text).not.toMatch(/no tables derived from/);
    expect(text).toContain("no TR3 usage tables");
  });
});

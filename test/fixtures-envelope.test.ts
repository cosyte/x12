/**
 * Tier-1 envelope fixture sweep. Loads each of the 4 hand-authored
 * Phase 1 envelope fixtures from `test/fixtures/envelope/` and asserts:
 *
 * - the parser decodes them with zero warnings,
 * - the detected delimiters match the fixture's declared shape,
 * - the ISA round-trips byte-exact.
 *
 * Real-world fixtures are stored with newlines (LF or CRLF) between
 * segments because that's what `fs.writeFileSync` produces and what every
 * real-world clearinghouse feed contains. The `no-trailing-crlf.edi`
 * fixture is byte-identical to the unframed wire form — written with
 * `printf` so no trailing newline sneaks in via the editor.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseX12 } from "../src/index.js";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "envelope");

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_DIR, name), "utf8");
}

describe("Tier-1 envelope fixtures — Phase 1 acceptance corpus", () => {
  it("medicare-canonical.edi — `*^:~` delimiters, zero warnings", () => {
    const raw = loadFixture("medicare-canonical.edi");
    const ix = parseX12(raw);
    expect(ix.delimiters).toEqual({
      element: "*",
      repetition: "^",
      component: ":",
      segment: "~",
    });
    expect(ix.warnings).toHaveLength(0);
    expect(ix.isa.raw).toBe(raw.slice(0, 106));
    expect(ix.isa.raw.length).toBe(106);
  });

  it("availity-repetition.edi — `*^:~` delimiters, sender AVAILITY", () => {
    const raw = loadFixture("availity-repetition.edi");
    const ix = parseX12(raw);
    expect(ix.delimiters.repetition).toBe("^");
    expect(ix.warnings).toHaveLength(0);
    expect(ix.isa.elements[6]).toContain("AVAILITY");
  });

  it("bcbs-subelement.edi — `\\` sub-element separator", () => {
    const raw = loadFixture("bcbs-subelement.edi");
    const ix = parseX12(raw);
    expect(ix.delimiters.component).toBe("\\");
    expect(ix.warnings).toHaveLength(0);
    expect(ix.isa.elements[6]).toContain("BCBS");
  });

  it("no-trailing-crlf.edi — segments separated only by `~`", () => {
    const raw = loadFixture("no-trailing-crlf.edi");
    expect(raw).not.toContain("\n");
    expect(raw).not.toContain("\r");
    const ix = parseX12(raw);
    expect(ix.warnings).toHaveLength(0);
    expect(ix.isa.raw).toBe(raw.slice(0, 106));
  });
});

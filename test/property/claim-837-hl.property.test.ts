/**
 * Property tests for the 837 HL hierarchy walker. The 837 family treats
 * HL parent-pointer integrity as THE safety primitive (see x12 roadmap §4,
 * safety-critical path #7) — the parser must NEVER silently re-number a
 * hierarchy. These properties lock the invariant across the fixture
 * corpus.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { WARNING_CODES, get837Claims, parseX12 } from "../../src/index.js";

const FIXTURE_DIR = join(__dirname, "..", "fixtures", "claim");
const fixtures = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".edi"));

describe("HL hierarchy properties (over every 837 fixture)", () => {
  it("verbatim preservation: each HL's parent id round-trips byte-exact onto the model", () => {
    for (const name of fixtures) {
      const raw = readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
      const ix = parseX12(raw);
      const tx = ix.groups[0]?.transactions[0];
      if (tx === undefined) throw new Error(`fixture ${name}: no transaction`);
      const sub = get837Claims(ix.delimiters, tx);
      if (sub === undefined) continue;
      // For each HL in the fixture, the parsed entry's parent id MUST
      // equal what the source declared (verbatim) — the walker NEVER
      // silently re-numbers, regardless of whether the parent resolves.
      const sourceHls: { hlId: string; parentId: string | undefined }[] = [];
      for (const seg of tx.segments) {
        if (seg.id !== "HL") continue;
        sourceHls.push({
          hlId: seg.elements[1] ?? "",
          parentId:
            seg.elements[2] === undefined || seg.elements[2] === "" ? undefined : seg.elements[2],
        });
      }
      expect(sourceHls).toHaveLength(sub.hierarchies.length);
      for (let i = 0; i < sourceHls.length; i += 1) {
        const src = sourceHls[i];
        const parsed = sub.hierarchies[i];
        if (src === undefined || parsed === undefined) throw new Error("hl mismatch");
        expect(parsed.hlId).toBe(src.hlId);
        expect(parsed.parentHlId).toBe(src.parentId);
      }
    }
  });

  it("never throws on any fixture (lenient parse)", () => {
    for (const name of fixtures) {
      const raw = readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
      expect(() => {
        const ix = parseX12(raw);
        for (const grp of ix.groups) {
          for (const tx of grp.transactions) get837Claims(ix.delimiters, tx);
        }
      }).not.toThrow();
    }
  });

  it("every HL with a 22 or 23 level code that does NOT match its declared parent's level is flagged", () => {
    // Construct a synthetic 837P where the subscriber HL (level 22)
    // declares the billing HL (level 20) as parent (valid),
    // then a patient HL (level 23) declares a non-existent parent (invalid).
    const raw = readFileSync(join(FIXTURE_DIR, "837p-hl-orphan.edi"), "utf8").trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no tx");
    const sub = get837Claims(ix.delimiters, tx);
    if (sub === undefined) throw new Error("no sub");
    expect(sub.warnings.some((w) => w.code === WARNING_CODES.X12_HL_PARENT_MISMATCH)).toBe(true);
  });
});

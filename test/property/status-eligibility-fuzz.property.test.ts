/**
 * Byte-flip fuzz property for the Phase 6 eligibility + claim-status
 * walkers. Real-world 271 / 277 / 277CA EDI arrives malformed in creative
 * ways; the walkers must stay lenient - every byte-flipped fixture must
 * still walk without throwing. Only the 4 Tier-3 envelope fatals are
 * permitted to throw; everything else degrades to Tier-2 warnings.
 *
 * 300 iterations per fixture. Each iteration flips a single byte at a
 * random position and re-feeds the result; the property fails on the first
 * unexpected throw with the seed reported so the input is reproducible.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import { describe, it } from "vitest";

import {
  FATAL_CODES,
  X12ParseError,
  get271Eligibility,
  get277CADisposition,
  get277Status,
  parseX12,
} from "../../src/index.js";

import { amplified, fuzzTimeout, withinBudget } from "./_fuzz-config.js";

const ALLOWED_FATAL_CODES = new Set<string>(Object.values(FATAL_CODES));

const CASES = [
  { dir: "eligibility", st: "271" },
  { dir: "status", st: "277" },
] as const;

function walkAll(raw: string): void {
  const ix = parseX12(raw);
  for (const grp of ix.groups) {
    for (const tx of grp.transactions) {
      get271Eligibility(ix.delimiters, tx);
      get277Status(ix.delimiters, tx);
      get277CADisposition(ix.delimiters, tx);
    }
  }
}

/** Every fixture both walkers are fuzzed over, so the family shares one time budget. */
const ALL_FIXTURES = CASES.flatMap(({ dir }) => {
  const fixtureDir = join(__dirname, "..", "fixtures", dir);
  return readdirSync(fixtureDir)
    .filter((f) => f.endsWith(".edi"))
    .map((name) => ({ dir, fixtureDir, name }));
});

describe("Phase 6 walkers byte-flip fuzz (300 runs per fixture)", () => {
  for (const { dir, fixtureDir, name } of ALL_FIXTURES) {
    it(
      `never throws outside the 4 Tier-3 fatals on ${dir}/${name}`,
      { timeout: fuzzTimeout(10_000, ALL_FIXTURES.length) },
      () => {
        const buf = Buffer.from(readFileSync(join(fixtureDir, name), "utf8"), "utf8");
        fc.assert(
          fc.property(
            fc.integer({ min: 0, max: Math.max(buf.length - 1, 0) }),
            fc.integer({ min: 0, max: 255 }),
            (position, byte) => {
              const mutated = Buffer.from(buf);
              mutated[position] = byte;
              const text = mutated.toString("utf8");
              withinBudget(text, () => {
                try {
                  walkAll(text);
                } catch (err) {
                  if (err instanceof X12ParseError && ALLOWED_FATAL_CODES.has(err.code)) return;
                  throw err;
                }
              });
            },
          ),
          amplified(300, ALL_FIXTURES.length),
        );
      },
    );
  }
});

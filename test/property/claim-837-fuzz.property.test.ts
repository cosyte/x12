/**
 * 837 byte-flip fuzz property. Real-world 837 EDI is malformed in
 * creative ways — a payer's clearinghouse will deliver bytes the spec
 * didn't anticipate. The parser must remain lenient: every byte-flipped
 * 837 fixture must still parse without throwing (only the 4 Tier-3
 * envelope fatals are allowed to throw; the rest is Tier-2 warnings).
 *
 * 300 iterations per fixture by default. Each iteration flips a single
 * byte at a uniformly random position and feeds the result back to the
 * parser. The property fails on the first throw with the seed reported
 * so the failing input can be reproduced.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import { describe, it } from "vitest";

import { FATAL_CODES, X12ParseError, get837Claims, parseX12 } from "../../src/index.js";

const FIXTURE_DIR = join(__dirname, "..", "fixtures", "claim");
const fixtures = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".edi"));

const ALLOWED_FATAL_CODES = new Set<string>(Object.values(FATAL_CODES));

describe("get837Claims byte-flip fuzz (300 runs per fixture)", () => {
  for (const name of fixtures) {
    it(`never throws outside the 4 Tier-3 fatals on ${name}`, () => {
      const raw = readFileSync(join(FIXTURE_DIR, name), "utf8");
      const buf = Buffer.from(raw, "utf8");
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: Math.max(buf.length - 1, 0) }),
          fc.integer({ min: 0, max: 255 }),
          (position, byte) => {
            const mutated = Buffer.from(buf);
            mutated[position] = byte;
            try {
              const ix = parseX12(mutated.toString("utf8"));
              for (const grp of ix.groups) {
                for (const tx of grp.transactions) {
                  get837Claims(ix.delimiters, tx);
                }
              }
            } catch (err) {
              // Only Tier-3 envelope fatals are permitted; anything else
              // is a lenient-parse violation.
              if (err instanceof X12ParseError && ALLOWED_FATAL_CODES.has(err.code)) return;
              throw err;
            }
          },
        ),
        { numRuns: 300 },
      );
    });
  }
});

/**
 * 835 fuzz target - byte-flip every one of the six 835 fixtures at a
 * uniformly random position and feed the result back through `get835`.
 * The contract is the same as the envelope fuzz target (Phase 1) layered
 * with the Phase 4 helper: `get835` must NEVER throw - every recoverable
 * deviation surfaces as a warning, every unrecoverable structural error
 * comes from `parseX12` and is one of the 4 Tier-3 fatals.
 *
 * Nightly-CI worthy; runs 300 iterations per fixture under `pnpm test`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { FATAL_CODES, X12ParseError, get835, parseX12 } from "../../src/index.js";

import { fuzzRuns } from "./_fuzz-config.js";

const FATAL_CODE_SET: ReadonlySet<string> = new Set(Object.values(FATAL_CODES));
const FIXTURE_DIR = join(__dirname, "..", "fixtures", "remit");

const FLIP_CHARS = ["X", "Z", "0", "9", "!", "?", "@", "#", "$", "%", "~", "*"] as const;

describe("835 fuzz: byte-flipped fixtures never throw outside the 4 Tier-3 fatals", () => {
  const fixtures = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".edi"));
  for (const fixture of fixtures) {
    it(`${fixture}: 300 byte-flips`, () => {
      const raw = readFileSync(join(FIXTURE_DIR, fixture), "utf8").trimEnd();
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: raw.length - 1 }),
          fc.constantFrom(...FLIP_CHARS),
          (pos, ch) => {
            const flipped = raw.slice(0, pos) + ch + raw.slice(pos + 1);
            try {
              const ix = parseX12(flipped);
              const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
              if (tx !== undefined) {
                // get835 must NEVER throw on lenient-parsed input.
                get835(ix.delimiters, tx);
              }
            } catch (err) {
              expect(err).toBeInstanceOf(X12ParseError);
              if (err instanceof X12ParseError) {
                expect(FATAL_CODE_SET.has(err.code)).toBe(true);
              }
            }
          },
        ),
        { numRuns: fuzzRuns(300) },
      );
    });
  }
});

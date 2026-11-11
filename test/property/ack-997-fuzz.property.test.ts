/**
 * 997 fuzz target: byte-flip each committed 997 fixture at a random position
 * and feed the result through `parse997`. The contract is the envelope fuzz
 * target's: `parse997` never throws on what `parseX12` reads, and anything
 * that does throw is one of the four Tier-3 fatals. Every warning it raises
 * carries registry text only.
 *
 * Runs 300 flips per fixture under `pnpm test`; the nightly fuzz run widens it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { ALL_WARNING_MESSAGES, FATAL_CODES, X12ParseError, parse997 } from "../../src/index.js";

import { amplified, fuzzTimeout, withinBudget } from "./_fuzz-config.js";

const FATAL_CODE_SET: ReadonlySet<string> = new Set(Object.values(FATAL_CODES));
const FIXTURE_DIR = join(__dirname, "..", "fixtures", "ack");

const FLIP_CHARS = ["X", "Z", "0", "9", "!", "?", "@", "#", "$", "%", "~", "*", ":", "^"] as const;

describe("997 fuzz: byte-flipped fixtures never throw outside the 4 Tier-3 fatals", () => {
  const fixtures = readdirSync(FIXTURE_DIR).filter((f) => /^997-.*\.edi$/u.test(f));

  it("has the 997 fixtures to flip", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(3);
  });

  for (const fixture of fixtures) {
    it(`${fixture}: 300 byte-flips`, { timeout: fuzzTimeout(10_000, fixtures.length) }, () => {
      const raw = readFileSync(join(FIXTURE_DIR, fixture), "utf8").trimEnd();
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: raw.length - 1 }),
          fc.constantFrom(...FLIP_CHARS),
          (pos, ch) => {
            const flipped = raw.slice(0, pos) + ch + raw.slice(pos + 1);
            withinBudget(flipped, () => {
              try {
                const ack = parse997(flipped);
                for (const w of ack?.warnings ?? []) {
                  expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
                }
              } catch (err) {
                expect(err).toBeInstanceOf(X12ParseError);
                if (err instanceof X12ParseError) {
                  expect(FATAL_CODE_SET.has(err.code)).toBe(true);
                }
              }
            });
          },
        ),
        amplified(300, fixtures.length),
      );
    });
  }
});

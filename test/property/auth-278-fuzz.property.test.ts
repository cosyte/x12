/**
 * Fuzz target for the 278 services review: a byte flipped at a random position of each committed
 * fixture under `test/fixtures/auth/`, fed through `parseX12` and both 278 readers. The contract
 * is the envelope fuzz target's: nothing throws outside the four documented fatal errors, each
 * reader reads every transaction set without throwing, and every warning carries registry text
 * only. Each case is held to the CPU and memory budget in `./_fuzz-config.ts`.
 *
 * Runs 100 flips per fixture under `pnpm test`; the nightly fuzz run widens it.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  FATAL_CODES,
  X12ParseError,
  get278Request,
  get278Response,
  parseX12,
} from "../../src/index.js";

import { amplified, fuzzTimeout, withinBudget } from "./_fuzz-config.js";

const FATAL_CODE_SET: ReadonlySet<string> = new Set(Object.values(FATAL_CODES));
const FIXTURE_DIR = join(__dirname, "..", "fixtures", "auth");

/** Parse and read every transaction set as a request and as a response. */
function readAll(raw: string): void {
  const ix = parseX12(raw);
  for (const w of ix.warnings) expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
  for (const tx of ix.groups.flatMap((g) => g.transactions)) {
    for (const read of [get278Request, get278Response]) {
      for (const w of read(ix.delimiters, tx)?.warnings ?? []) {
        expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
      }
    }
  }
}

describe("278 fuzz: byte-flipped fixtures never throw outside the 4 Tier-3 fatals", () => {
  const fixtures = readdirSync(FIXTURE_DIR)
    .filter((f) => /^278-.*\.edi$/u.test(f))
    .sort();

  it("has the 278 fixtures to flip, the request and the response among them", () => {
    expect(fixtures).toEqual(expect.arrayContaining(["278-request.edi", "278-response.edi"]));
  });

  for (const fixture of fixtures) {
    it(`${fixture}: 100 byte-flips`, { timeout: fuzzTimeout(10_000, fixtures.length) }, () => {
      // The response fixtures declare 005010X216, the notification guide, which
      // the 278 readers do not implement and so never walk: they are flipped
      // re-declared as 005010X217 so every flip reaches the walk.
      const raw = readFileSync(join(FIXTURE_DIR, fixture), "latin1")
        .trimEnd()
        .replaceAll("005010X216", "005010X217");
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: raw.length - 1 }),
          fc.integer({ min: 0, max: 255 }),
          (pos, code) => {
            const flipped = raw.slice(0, pos) + String.fromCharCode(code) + raw.slice(pos + 1);
            withinBudget(flipped, () => {
              try {
                readAll(flipped);
              } catch (err) {
                if (err instanceof X12ParseError && FATAL_CODE_SET.has(err.code)) return;
                throw err;
              }
            });
          },
        ),
        amplified(100, fixtures.length),
      );
    });
  }
});

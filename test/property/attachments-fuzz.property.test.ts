/**
 * Fuzz target for the 275 and the 277 request for additional information: a byte flipped at a
 * random position of each committed fixture under `test/fixtures/attachments/`, fed through
 * `parseX12` and both readers. The contract is the envelope fuzz target's: nothing throws outside
 * the four documented fatal errors, each reader reads every transaction set without throwing, and
 * every warning carries registry text only. Each case is held to the CPU and memory budget in
 * `./_fuzz-config.ts`.
 *
 * Each fixture is exactly what its builder writes from the synthetic spec of the same name in
 * `test/_helpers/attachment-fixtures.ts`, which the first test here holds it to.
 *
 * Runs 100 flips per fixture under `pnpm test`; the nightly fuzz run widens it.
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  FATAL_CODES,
  X12ParseError,
  get275Attachments,
  get277RequestForAdditionalInformation,
  parseX12,
} from "../../src/index.js";
import { attachmentFixtureTexts } from "../_helpers/attachment-fixtures.js";

import { amplified, fuzzTimeout, withinBudget } from "./_fuzz-config.js";

const FATAL_CODE_SET: ReadonlySet<string> = new Set(Object.values(FATAL_CODES));
const FIXTURE_DIR = join(__dirname, "..", "fixtures", "attachments");

/** Parse and read every transaction set both ways, holding every warning to the registry. */
function readAll(raw: string): void {
  const ix = parseX12(raw);
  for (const w of ix.warnings) expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
  for (const tx of ix.groups.flatMap((g) => g.transactions)) {
    const submission = get275Attachments(ix.delimiters, tx);
    for (const w of submission?.warnings ?? []) {
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    }
    for (const a of submission?.attachments ?? []) a.data.readOctets();
    const request = get277RequestForAdditionalInformation(ix.delimiters, tx);
    for (const w of request?.warnings ?? []) {
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    }
  }
}

describe("attachments fuzz: byte-flipped 275 and 277 request fixtures never throw outside the 4 Tier-3 fatals", () => {
  const fixtures = readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(".edi"))
    .sort();

  it("has each fixture, exactly as its builder writes it from its synthetic spec", () => {
    const expected = attachmentFixtureTexts();
    if (process.env["X12_WRITE_ATTACHMENT_FIXTURES"] === "1") {
      for (const [name, text] of Object.entries(expected)) {
        writeFileSync(join(FIXTURE_DIR, name), `${text}\n`, "latin1");
      }
    }
    expect(fixtures).toEqual(Object.keys(expected).sort());
    for (const name of fixtures) {
      expect(readFileSync(join(FIXTURE_DIR, name), "latin1"), name).toBe(`${expected[name]}\n`);
    }
    expect(fixtures.filter((f) => f.startsWith("275-")).length).toBeGreaterThanOrEqual(2);
    expect(fixtures.filter((f) => f.startsWith("277-rfai-")).length).toBeGreaterThanOrEqual(2);
  });

  for (const fixture of fixtures) {
    it(`${fixture}: 100 byte-flips`, { timeout: fuzzTimeout(10_000, fixtures.length) }, () => {
      const raw = readFileSync(join(FIXTURE_DIR, fixture), "latin1").trimEnd();
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

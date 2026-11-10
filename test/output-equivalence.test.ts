/**
 * Output equivalence: the library observes the same as it did before its allocation work.
 *
 * The parser, the segment readers, `X12Decimal` and the builders were rewritten to allocate less,
 * with the promise that nothing a caller can see moves: every parse result, warning, typed read,
 * decimal, built and serialized text, and error. `test/_helpers/output-corpus.ts` records all of
 * that for each document of a synthetic corpus and hashes it; the digests in
 * `test/fixtures/equivalence/output-digests.json` were captured from the source before the work
 * (`X12_CAPTURE_DIGESTS=1 pnpm exec vitest run test/output-equivalence.test.ts` writes them). This
 * test holds the current source to every one.
 *
 * A digest that moves is a behaviour change. Recapture only for a change that means to move what
 * a caller sees, and say so in its pull request.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  corpusBuilds,
  corpusInputs,
  observeBuild,
  observeDecimals,
  observeInput,
} from "./_helpers/output-corpus.js";

const DIGESTS = fileURLToPath(
  new URL("./fixtures/equivalence/output-digests.json", import.meta.url),
);

const capture = process.env["X12_CAPTURE_DIGESTS"] === "1";

/** Every digest of the corpus, keyed by its label, in corpus order. */
async function digests(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const put = (label: string, digest: string): void => {
    if (Object.hasOwn(out, label)) throw new Error(`duplicate corpus label ${label}`);
    out[label] = digest;
  };
  for (const input of corpusInputs()) {
    put(`input:${input.label}`, await observeInput(input.input, { segments: input.segments }));
  }
  for (const build of corpusBuilds()) put(`build:${build.label}`, await observeBuild(build.build));
  put("decimal", observeDecimals());
  return out;
}

describe("output equivalence against the digests captured before the allocation work", () => {
  it("observes every document of the corpus exactly as before", async () => {
    const head = await digests();
    if (capture) {
      writeFileSync(DIGESTS, `${JSON.stringify(head, null, 2)}\n`);
      return;
    }
    const base = JSON.parse(readFileSync(DIGESTS, "utf8")) as Record<string, string>;
    expect(Object.keys(head)).toEqual(Object.keys(base));
    const moved = Object.keys(base).filter((label) => head[label] !== base[label]);
    expect(moved).toEqual([]);
    // The corpus is the size the pull request reports, so a shrunken corpus cannot pass quietly.
    expect(Object.keys(base).length).toBeGreaterThan(900);
  }, 120_000);
});

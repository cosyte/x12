/**
 * `readTransactionSets` holds bounded heap: an interchange ten times larger than the heap budget,
 * generated a chunk at a time and never held whole, streams through with the heap after a forced
 * collection staying inside the budget, while each transaction set is read by `get835`. A control
 * run that keeps what it reads shows the probe sees retained heap. Every document is synthetic,
 * built by `bench/corpus.mjs`.
 */

import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";

import { describe, expect, it } from "vitest";

import { remit835Text } from "../bench/corpus.mjs";
import { get835, readTransactionSets, type X12StreamTransaction } from "../src/index.js";

import { IS_BUN, IS_DENO } from "./_helpers/runtime.js";

const MIB = 1024 * 1024;

/** The most the heap may grow over its level before the read, after a forced collection. */
const BUDGET = 24 * MIB;

/** How much the stream carries: ten times the budget. */
const TOTAL = 10 * BUDGET;

/** The transaction sets of one remittance of `claims` claims, ST to SE, and its envelope. */
function parts(claims: number): { head: string; body: string; tail: string } {
  const text = remit835Text(7, claims);
  const st = text.indexOf("ST*835*");
  const ge = text.indexOf("GE*");
  return { head: text.slice(0, st), body: text.slice(st, ge), tail: text.slice(ge) };
}

/**
 * One interchange of 835 transaction sets until `total` characters have gone out, in chunks of
 * about 64 KiB. Each chunk is made when it is asked for and dropped once read: the whole is never
 * held anywhere.
 */
function* interchange(total: number): Generator<string> {
  const { head, body, tail } = parts(20);
  yield head;
  let sent = head.length;
  let chunk = "";
  while (sent < total) {
    chunk += body;
    sent += body.length;
    if (chunk.length >= 64 * 1024) {
      yield chunk;
      chunk = "";
    }
  }
  yield chunk;
  yield tail;
}

const gc = (): (() => void) => {
  setFlagsFromString("--expose-gc");
  return runInNewContext("gc") as () => void;
};

/** Stream `total` characters, reading each set, and answer the most heap held after a collection. */
async function peakHeld(total: number, keep: X12StreamTransaction[] | undefined): Promise<number> {
  const collect = gc();
  collect();
  const base = process.memoryUsage().heapUsed;
  let peak = 0;
  let n = 0;
  let claims = 0;
  for await (const item of readTransactionSets(interchange(total))) {
    claims += get835(item.delimiters, item.transaction)?.claims.length ?? 0;
    keep?.push(item);
    n += 1;
    if (n % 2000 === 0) {
      collect();
      peak = Math.max(peak, process.memoryUsage().heapUsed - base);
    }
  }
  collect();
  peak = Math.max(peak, process.memoryUsage().heapUsed - base);
  expect(claims).toBe(n * 20);
  return peak;
}

describe.skipIf(IS_BUN || IS_DENO || process.env["X12_MUTATION_RUN"] === "1")(
  // Bun and Deno: no `--expose-gc` through `node:v8`, so a collection cannot be forced. A mutation
  // run (`vitest.mutation.config.ts` sets X12_MUTATION_RUN): it streams 240 MiB for every parser
  // mutant and judges the heap, not what the code returns; `test/parser-stream.test.ts` holds the
  // stream to `parseX12` there. `pnpm test` runs it on every pull request.
  "readTransactionSets holds bounded heap",
  () => {
    it("streams ten times its heap budget, reading every set, inside the budget", async () => {
      const peak = await peakHeld(TOTAL, undefined);
      process.stdout.write(
        `[stream memory] ${String(TOTAL / MIB)} MiB streamed, peak held ${(peak / MIB).toFixed(2)} MiB, budget ${String(BUDGET / MIB)} MiB\n`,
      );
      expect(peak).toBeLessThan(BUDGET);
    }, 300_000);

    it("sees the heap a reader that keeps every set holds", async () => {
      const keep: X12StreamTransaction[] = [];
      const peak = await peakHeld(BUDGET, keep);
      expect(keep.length).toBeGreaterThan(1000);
      expect(peak).toBeGreaterThan(BUDGET / 2);
    }, 300_000);
  },
);

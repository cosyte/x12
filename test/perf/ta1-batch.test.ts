/**
 * The TA1 read gate's self-check (`test/perf/scaling-gate-sets.perf.ts`) must time the quadratic
 * reassembly as part of the read: the read takes what the reassembly returns, so a reassembly the
 * read never consumed could not be what the self-check measures. Every TA1 is synthetic, built by
 * `bench/corpus.mjs`.
 */

import { describe, expect, it } from "vitest";

import { ta1Text } from "../../bench/corpus.mjs";
import { reassembleQuadratic } from "../_helpers/scaling-gate.js";
import { readTA1Batch, readTA1BatchReassembled, splitTA1Batch } from "../_helpers/ta1-batch.js";

const batch = Array.from({ length: 12 }, (_v, k) => ta1Text(k));

describe("the TA1 read gate's quadratic regression", () => {
  it("reads as many TA1s as the clean read", () => {
    expect(readTA1BatchReassembled(batch)).toBe(readTA1Batch(batch));
    expect(readTA1BatchReassembled(batch)).toBe(12);
  });

  it("reassembles the batch exactly and cuts it back into its interchanges", () => {
    expect(reassembleQuadratic(batch.join(""))).toBe(batch.join(""));
    expect(splitTA1Batch(batch.join(""))).toEqual(batch);
  });

  it("reads the text the reassembly returns, not the batch it was given", () => {
    // A reassembly that loses the last interchange: the read sees one TA1 fewer.
    const lastStart = batch.join("").length - (batch.at(-1)?.length ?? 0);
    const dropLast = (raw: string): string => reassembleQuadratic(raw).slice(0, lastStart);
    expect(readTA1BatchReassembled(batch, dropLast)).toBe(11);
  });

  it("refuses a reassembly that damaged a TA1", () => {
    const damaged = (raw: string): string => reassembleQuadratic(raw).replace("TA1*", "TA9*");
    expect(() => readTA1BatchReassembled(batch, damaged)).toThrow();
  });
});

/**
 * The TA1 batches the scaling gate times (`test/perf/scaling-gate-sets.perf.ts`): a TA1 is one
 * fixed segment in an interchange of its own, so its size axis is a batch of them, read or built
 * one by one.
 *
 * Lives under `test/_helpers/` so it is not shipped and not collected as a test.
 * @internal
 */

import { buildTA1, parseTA1, parseX12, type BuildTA1Spec } from "../../src/index.js";

import { reassembleQuadratic } from "./scaling-gate.js";

/** Parse, then read, every TA1 of a batch. */
export function readTA1Batch(batch: readonly string[]): number {
  let n = 0;
  for (const raw of batch) {
    if (parseTA1(parseX12(raw)) === undefined) throw new Error("the reader refused a corpus TA1");
    n += 1;
  }
  return n;
}

/** Build every TA1 of a batch, each with its segment terminator. */
export function buildTA1Batch(batch: readonly BuildTA1Spec[]): string {
  return batch.map((spec) => `${buildTA1(spec).raw}~`).join("");
}

/**
 * A joined batch cut back into its interchanges, each ending at the terminator of its `IEA`
 * segment. The corpus's TA1 interchanges end in `~` and carry no `~IEA` inside, so a batch the
 * reassembly returned unchanged comes back as it went in; text after the last `IEA` is dropped.
 */
export function splitTA1Batch(text: string): string[] {
  const interchanges: string[] = [];
  let start = 0;
  for (let iea = text.indexOf("~IEA", start); iea !== -1; iea = text.indexOf("~IEA", start)) {
    const end = text.indexOf("~", iea + 1);
    if (end === -1) break;
    interchanges.push(text.slice(start, end + 1));
    start = end + 1;
  }
  return interchanges;
}

/**
 * The self-check's regression: the batch joined, reassembled the slow way, cut back into its
 * interchanges, and every TA1 of what came back read, so the read consumes the reassembly.
 */
export function readTA1BatchReassembled(
  batch: readonly string[],
  reassemble: (raw: string) => string = reassembleQuadratic,
): number {
  return readTA1Batch(splitTA1Batch(reassemble(batch.join(""))));
}

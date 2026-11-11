/**
 * Where each transaction set the envelope walker framed began in its input: the
 * index of its `ST` in the post-ISA segment stream, on the same scale as
 * `X12Position.segmentIndex` (the ISA is index 0).
 *
 * A warning inside a transaction set names its segment by that global index,
 * and a 999 names it by its position counted from the `ST`. Converting one into
 * the other needs the `ST`'s own index, which the model does not carry. It is
 * kept here, keyed by the frozen transaction set object the walker returned,
 * rather than added to {@link X12TransactionSet}: a new field would change the
 * shape every consumer compares, prints and serializes. A transaction set that
 * did not come out of the walker (built by hand, or copied) has no entry, and a
 * caller treats that as "position unknown".
 *
 * @internal
 */

import type { X12TransactionSet } from "./types.js";

/** @internal */
const STARTS = new WeakMap<X12TransactionSet, number>();

/**
 * Record the input index of a transaction set's `ST`. Called by the envelope
 * walker as it freezes the set.
 *
 * @internal
 */
export function recordTransactionStart(tx: X12TransactionSet, segmentIndex: number): void {
  STARTS.set(tx, segmentIndex);
}

/**
 * The input index of a transaction set's `ST`, or `undefined` for a set the
 * envelope walker did not frame.
 *
 * @internal
 */
export function transactionStart(tx: X12TransactionSet): number | undefined {
  return STARTS.get(tx);
}

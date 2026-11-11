/**
 * Read an interchange as it arrives, one transaction set at a time, holding about one transaction
 * set rather than the whole file.
 */

import { ISA_MIN_LENGTH, detectDelimiters } from "./delimiters.js";
import {
  decodeIsa,
  frameSettled,
  splitSegments,
  startWalk,
  type EnvelopeWalk,
} from "./envelope.js";
import { FATAL_CODES, X12ParseError } from "./errors.js";
import type { Delimiters, IsaSegment, X12ParseOptions, X12TransactionSet } from "./types.js";
import type { X12ParseWarning } from "./warnings.js";

/**
 * What {@link readTransactionSets} reads: any iterable or async iterable of chunks, such as a Node
 * `Readable`. A chunk is text or bytes; bytes are read one character per byte, as `parseX12` reads
 * a `Buffer` (`latin1`), so a chunk may end anywhere, even inside a segment.
 */
export type X12StreamSource = AsyncIterable<string | Uint8Array> | Iterable<string | Uint8Array>;

/**
 * The options {@link readTransactionSets} takes: those of `parseX12` but `profile`, which a stream
 * has no interchange to attach to.
 */
export type X12StreamOptions = Omit<X12ParseOptions, "profile">;

/**
 * One transaction set {@link readTransactionSets} yields, with the envelope around it.
 */
export interface X12StreamTransaction {
  /** The delimiters the interchange's ISA declares. */
  readonly delimiters: Delimiters;
  /** The interchange's ISA, as `parseX12` reads it. */
  readonly isa: IsaSegment;
  /** Which functional group of the interchange holds it, from 0: `ix.groups[groupIndex]`. */
  readonly groupIndex: number;
  /** Which transaction set of that group it is, from 0: `.transactions[transactionIndex]`. */
  readonly transactionIndex: number;
  /**
   * The transaction set, as `parseX12` of the whole input holds it at
   * `ix.groups[groupIndex].transactions[transactionIndex]`: its `gs` included. Hand it and
   * `delimiters` to a typed reader (`get835(delimiters, transaction)`).
   */
  readonly transaction: X12TransactionSet;
}

/** The latin1 text of a chunk of bytes, one character per byte, as `Buffer#toString("latin1")`. */
function latin1(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    out += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return out;
}

/**
 * Read an X12 interchange from a stream of chunks and yield each transaction set as soon as it is
 * closed, so a file far larger than memory is read holding about one transaction set at a time.
 *
 * Each transaction set it yields is the one `parseX12` of the whole input holds at the same place,
 * and every warning `parseX12` would report reaches `options.onWarning` in the same order, with
 * the same position, as it is found: a warning on a transaction set arrives before the set is
 * yielded, and one about its group or the interchange (a count or control number that does not
 * match, a missing `GE` or `IEA`, bytes after the `IEA`) when the stream reaches it. With
 * `{ strict: true }` the first warning is thrown as an `X12ParseError` carrying its code, as
 * `parseX12` throws it, once it is found; the sets yielded before it stand.
 *
 * It keeps nothing it has yielded, and no closed group. The interchange-level segments `parseX12`
 * keeps on the interchange (an envelope `TA1`, a segment outside every transaction set, bytes
 * after the `IEA`) are reported through their warnings and not yielded; read them with `parseX12`.
 * The four fatal errors `parseX12` throws are thrown here for the same input.
 *
 * @example
 * ```ts
 * import { createReadStream } from "node:fs";
 * import { get835, readTransactionSets } from "@cosyte/x12";
 *
 * for await (const { delimiters, transaction } of readTransactionSets(createReadStream(path))) {
 *   const remit = get835(delimiters, transaction);
 *   // handle one remittance, then let it go
 * }
 * ```
 */
export async function* readTransactionSets(
  source: X12StreamSource,
  options: X12StreamOptions = {},
): AsyncGenerator<X12StreamTransaction, void, undefined> {
  const ready: X12StreamTransaction[] = [];
  const onWarning = (w: X12ParseWarning): void => {
    if (options.strict === true) {
      throw new X12ParseError(
        w.code as unknown as (typeof FATAL_CODES)[keyof typeof FATAL_CODES],
        w.message,
        w.position,
        "",
      );
    }
    const cb = options.onWarning;
    if (cb === undefined) return;
    try {
      cb(w);
    } catch {
      /* a throwing handler does not break the read, as in parseX12 */
    }
  };
  const lazy = options.lazy !== false;

  let text = "";
  let start = 0;
  let header: { delimiters: Delimiters; isa: IsaSegment; walk: EnvelopeWalk } | undefined;
  // After the IEA: how many segments followed it, and whether one was not empty. That is all the
  // warning on bytes after the IEA needs, so none of them is kept.
  let ended = false;
  let after = 0;
  let afterText = false;

  /** Walk every segment of `segments` in order. */
  const walkAll = (walk: EnvelopeWalk, segments: readonly string[]): void => {
    for (const segment of segments) {
      if (ended) {
        after += 1;
        afterText ||= segment.length > 0;
      } else {
        ended = walk.step(segment);
      }
    }
  };

  /** Open the walk once the ISA is here; `final` when no more input will come. */
  const open = (final: boolean): typeof header => {
    if (header !== undefined || (!final && text.length < ISA_MIN_LENGTH)) return header;
    if (text.length === 0) {
      throw new X12ParseError(
        FATAL_CODES.X12_EMPTY_INPUT,
        "Input is empty.",
        { segmentIndex: 0, interchangeIndex: 0 },
        "",
      );
    }
    const delimiters = detectDelimiters(text);
    const isa = decodeIsa(text, delimiters);
    const walk = startWalk(text, delimiters, lazy, {
      onTransaction: (transaction, groupIndex, transactionIndex) => {
        ready.push(Object.freeze({ delimiters, isa, groupIndex, transactionIndex, transaction }));
      },
      onWarning,
    });
    start = ISA_MIN_LENGTH;
    header = { delimiters, isa, walk };
    return header;
  };

  for await (const chunk of source) {
    text = text.slice(start) + (typeof chunk === "string" ? chunk : latin1(chunk));
    start = 0;
    const h = open(false);
    if (h === undefined) continue;
    const framed = frameSettled(text, start, h.delimiters);
    start = framed.next;
    walkAll(h.walk, framed.segments);
    yield* ready.splice(0);
  }
  const h = open(true);
  /* v8 ignore next -- `open(true)` opens the walk or throws */
  if (h === undefined) return;
  walkAll(h.walk, splitSegments(text, start, h.delimiters).segments);
  // The segments after the IEA join to text exactly when there are two or more, or one that is
  // not empty; two empty ones stand for them, since a stream keeps no trailing bytes.
  h.walk.close(ended ? (after > 1 || afterText ? ["", ""] : []) : undefined);
  yield* ready.splice(0);
}

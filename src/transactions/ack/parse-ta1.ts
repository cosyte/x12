/**
 * `parseTA1` — decode the first envelope-level TA1 Interchange
 * Acknowledgment on a parsed {@link X12Interchange} into the typed
 * {@link X12AckTA1} model. PURE FUNCTION.
 *
 * TA1 is NOT a transaction set: per the ASC X12 standard it lives at the
 * envelope level, between ISA and the first GS (or alone inside an
 * ISA..IEA with no GS at all — the "TA1-only interchange" pattern). The
 * Phase 3 envelope walker captures every envelope-level TA1 verbatim onto
 * {@link X12Interchange.ta1Segments}; this function decodes the first
 * one. Multiple TA1 acks for prior interchanges may co-exist on a single
 * inbound — pass `index` to read the Nth, or scan `ta1Segments` directly.
 */

import type { X12Interchange } from "../../parser/types.js";

import { TA1_ACK_CODES, TA1_NOTE_CODES, type Ta1AckCode, type Ta1NoteCode } from "./codes.js";
import type { X12AckTA1 } from "./types.js";

/**
 * Decode the first TA1 Interchange Acknowledgment on the supplied
 * `interchange`. Returns the typed {@link X12AckTA1} or `undefined` when
 * the interchange has no TA1 (the common case for non-ack inbounds).
 *
 * @example
 * ```ts
 * import { parseTA1, parseX12 } from "@cosyte/x12";
 * const ix = parseX12(rawAckBytes);
 * const ta1 = parseTA1(ix);
 * if (ta1?.ackCode === "R") {
 *   // inbound interchange was rejected
 * }
 * ```
 */
export function parseTA1(interchange: X12Interchange): X12AckTA1 | undefined {
  const ta1 = interchange.ta1Segments[0];
  if (ta1 === undefined) return undefined;

  // TA1 is a fixed-position 5-element segment (no `?`-escape applies — the
  // standard does NOT define escaped TA1 content). Read elements verbatim.
  const elements = ta1.elements;
  const interchangeControlNumber = elements[1] ?? "";
  const interchangeDate = elements[2] ?? "";
  const interchangeTime = elements[3] ?? "";
  const ackCodeRaw = elements[4] ?? "";
  const noteCodeRaw = elements[5] ?? "";

  // Lenient narrow: unknown ack code (anything past code list I13) falls
  // back to typed reject — fail-safe. Unknown note code (anything past
  // code list I18 028) collapses the typed narrow to `undefined` but
  // preserves the verbatim raw string for forensic review.
  const ackCode = narrowAckCode(ackCodeRaw) ?? TA1_ACK_CODES.R;
  const noteCode = narrowNoteCode(noteCodeRaw);

  return Object.freeze({
    interchangeControlNumber,
    interchangeDate,
    interchangeTime,
    ackCode,
    noteCode,
    noteCodeRaw,
    raw: ta1,
  });
}

/** @internal */
function narrowAckCode(value: string): Ta1AckCode | undefined {
  switch (value) {
    case "A":
    case "E":
    case "R":
      return value;
    default:
      return undefined;
  }
}

/** @internal */
function narrowNoteCode(value: string): Ta1NoteCode | undefined {
  if (value in TA1_NOTE_CODES) {
    return value as Ta1NoteCode;
  }
  return undefined;
}

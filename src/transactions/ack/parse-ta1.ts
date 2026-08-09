/**
 * `parseTA1` - decode the first envelope-level TA1 Interchange
 * Acknowledgment on a parsed {@link X12Interchange} into the typed
 * {@link X12AckTA1} model. PURE FUNCTION.
 *
 * TA1 is NOT a transaction set: per the ASC X12 standard it lives at the
 * envelope level, between ISA and the first GS (or alone inside an
 * ISA..IEA with no GS at all - the "TA1-only interchange" pattern). The
 * Phase 3 envelope walker captures every envelope-level TA1 verbatim onto
 * {@link X12Interchange.ta1Segments}; this function decodes the first
 * one. Multiple TA1 acks for prior interchanges may co-exist on a single
 * inbound - pass `index` to read the Nth, or scan `ta1Segments` directly.
 */

import type { X12Interchange } from "../../parser/types.js";
import { unescapeRelease } from "../../parser/release.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

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

  // The five decoded fields are POST-`?`-unescape. `raw` is untouched and is
  // still the verbatim byte surface, exactly as `X12Segment.elements`
  // documents - the unescape is applied to the decoded model and nowhere else.
  //
  // 🩺 Why this moved, and it is one function disagreeing with itself rather
  // than a spec clause anyone here has read. TA1 is an ordinary delimited
  // segment, so its FRAMING became release-aware with every other envelope
  // segment's (`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`; only the ISA, which
  // is fixed-width, is split positionally), and `X12-TA1-EMIT-NOT-RELEASE-AWARE`
  // then made `buildTA1` release all five of its caller elements. Both halves
  // left this one reading the ESCAPE rather than the value, so measured on this
  // tree at base commit `67f1831`, over `parseX12` + `parseTA1` of what
  // `buildTA1` had just emitted:
  //
  //   in "00000001?"  raw TA1*00000001??*260601*1200*A*000  read "00000001??"
  //   in "0000*0001"  raw TA1*0000?*0001*260601*1200*A*000  read "0000?*0001"
  //   in "0000~0001"  raw TA1*0000?~0001*260601*1200*A*000  read "0000?~0001"
  //   in "0000:0001"  raw TA1*0000?:0001*260601*1200*A*000  read "0000?:0001"
  //   in "0000^0001"  raw TA1*0000?^0001*260601*1200*A*000  read "0000?^0001"
  //
  // Every row `warnings: []`, and TA1-01 is the reassociation key: a value the
  // caller stated came back as one that matches no ISA-13. The same value read
  // through `getSegmentValue` answered the caller's string on all five rows,
  // because every dot-path read already unescapes - and so does `parse999`, on
  // the IK4-01 composite, in this same directory. 🛑 A sentence here called this
  // function "the only typed reader in the package that did not" and is DELETED,
  // not reworded: it was measured false, and the three readers that falsify it
  // are `PRE-EXISTING` and recorded as a backlog line rather than absorbed.
  //
  // The sink is `noop`, matching `parse999`: a dangling `?` at the end of an
  // element raises `X12_DANGLING_RELEASE_CHAR` through a dot-path read and is
  // NOT surfaced here, because `parseTA1` returns no warnings channel. See
  // `KNOWN-LIMITATIONS.md`, `test/transactions-ack-ta1-residuals.test.ts` and
  // `test/transactions-ack-ta1-escape.test.ts`.
  const elements = ta1.elements;
  const value = (index: number): string =>
    unescapeRelease(elements[index] ?? "", interchange.delimiters, noop, { segmentIndex: 0 });
  const interchangeControlNumber = value(1);
  const interchangeDate = value(2);
  const interchangeTime = value(3);
  const ackCodeRaw = value(4);
  const noteCodeRaw = value(5);

  // Lenient narrow: unknown ack code (anything past code list I13) falls
  // back to typed reject - fail-safe. Unknown note code (anything past
  // code list I18 028) collapses the typed narrow to `undefined` but keeps
  // the un-narrowed string on `noteCodeRaw` for forensic review. 🛑 That
  // clause said "the VERBATIM raw string" and the word is DELETED, not
  // reworded: the `value(5)` read above made it false. `raw.elements[5]` is
  // the verbatim surface.
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

/**
 * The warning sink for the unescape above. `parseTA1` has no warnings channel
 * to put one on, and `parse999` drops the same warning from the same helper for
 * the same reason.
 *
 * @internal
 */
const noop = (_w: X12ParseWarning): void => {
  /* parseTA1 surfaces no warnings channel */
};

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

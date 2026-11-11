/**
 * `parse999` - decode a 005010X231A1 Implementation Acknowledgment into the
 * typed {@link X12Ack999} model. PURE FUNCTION; never opens sockets, never
 * touches the filesystem.
 *
 * Two-pass strategy:
 *
 * 1. Delegate envelope decode to `parseX12` (handles ISA / GS / ST / SE /
 *    GE / IEA + delimiter detection + envelope-level warnings).
 * 2. Find the first ST..SE whose ST-01 is `"999"` and walk its body
 *    segments - AK1 → AK2 → (IK3 [→ CTX] (IK4 [→ CTX])*)* → IK5 → AK9. As a
 *    Postel's-Law lenient accommodation we also accept the legacy
 *    `AK3` / `AK4` / `AK5` segment IDs (some converters still emit them
 *    inside a 999 envelope) and normalize them onto the X231A1 model.
 *
 * Postel's Law: every recoverable deviation is a warning (Tier-2), never a
 * throw. If the input contains no 999 transaction set, `parse999` returns
 * `undefined` rather than throwing - consumers wanting to assert presence
 * narrow on `!== undefined`.
 */

import type { Buffer } from "node:buffer";

import { parseX12 } from "../../parser/index.js";
import type {
  X12Interchange,
  X12ParseOptions,
  X12Position,
  X12TransactionSet,
} from "../../parser/types.js";
import {
  ack999Ak1Absent,
  ack999Ak9Absent,
  ack999Ak9DispositionUnknown,
  ack999Ik5Absent,
  ack999Ik5DispositionUnknown,
  type X12ParseWarning,
} from "../../parser/warnings.js";
// The reader is fail-safe: a missing IK5 or AK9 reads as a reject, a missing
// AK1 reads as an empty one, and a disposition it cannot read reads as a
// reject. Each fill-in carries its own warning (`X12_999_IK5_ABSENT`,
// `X12_999_AK9_ABSENT`, `X12_999_AK1_ABSENT`,
// `X12_999_IK5_DISPOSITION_UNKNOWN`, `X12_999_AK9_DISPOSITION_UNKNOWN`),
// beside the declared-guide check every typed reader runs.
import { declaredGuideWarning, implementedGuides } from "../shared/declared-guide.js";

import {
  collectErrorCodes,
  getElement,
  getOptionalElement,
  parseElementPosition,
  parseNonNegativeInteger,
  readAk1,
  readAk2,
  readAk9Counts,
} from "./ack-elements.js";
import {
  IK3_SYNTAX_ERROR_CODES,
  IK4_SYNTAX_ERROR_CODES,
  X12_ACK_DISPOSITION_CODES,
  type Ik304Code,
  type Ik403Code,
  type X12AckDispositionCode,
} from "./codes.js";
import type {
  X12Ack999,
  X12Ack999Ak1,
  X12Ack999Ak2,
  X12Ack999Ak9,
  X12Ack999ElementNote,
  X12Ack999Ik3,
  X12Ack999Ik4,
  X12Ack999Ik5,
  X12Ack999SegmentNote,
  X12Ack999TransactionResponse,
} from "./types.js";

/**
 * The guides this reader implements, derived from the 999 row of
 * `X12_TR3_CONFORMANCE` (its `tr3` plus every `cfrAdopted` entry, of which
 * that row has none). @internal
 */
const IMPLEMENTED_GUIDES_999 = implementedGuides("999");

/**
 * Decode a 005010X231A1 Implementation Acknowledgment from a raw `string`
 * or `Buffer`. Returns the typed {@link X12Ack999} or `undefined` when the
 * input does not contain any 999 transaction set. Lenient on parse: every
 * recoverable deviation surfaces as an envelope-level warning (see
 * {@link X12Ack999.warnings}).
 *
 * @example
 * ```ts
 * import { parse999 } from "@cosyte/x12";
 * const ack = parse999(rawBytes);
 * if (ack !== undefined) {
 *   ack.ak9.disposition;                    // "A" | "E" | "P" | "R" | "M" | "W" | "X"
 *   ack.transactionResponses[0]?.ik5.disposition;
 * }
 * ```
 */
export function parse999(
  raw: string | Buffer,
  options: X12ParseOptions = {},
): X12Ack999 | undefined {
  const interchange = parseX12(raw, options);
  for (const group of interchange.groups) {
    for (const tx of group.transactions) {
      // Element 1 (1-indexed) carries the ST transaction set identifier
      // code; for a 999, it is the literal `"999"`. Phase 1 already
      // decoded ST/SE elements so reading the raw string here is safe
      // and zero-allocation.
      const stId = tx.st.elements[1];
      if (stId === "999") {
        return decodeAck999(interchange, tx);
      }
    }
  }
  return undefined;
}

/**
 * Walk one ST..SE 999 transaction set's body segments and assemble the
 * typed {@link X12Ack999} model. Internal - invoked from {@link parse999}
 * after `parseX12` resolved the envelope.
 *
 * @internal
 */
function decodeAck999(interchange: X12Interchange, tx: X12TransactionSet): X12Ack999 {
  const { delimiters } = interchange;
  // Local warnings collected during the 999-specific walk. These are
  // distinct from envelope-level warnings (which live on
  // `interchange.warnings`) and are merged at the end so consumers see
  // both sets together.
  const warnings: X12ParseWarning[] = [];
  // The declared guide (ST-03 decoded, else GS-08 decoded) against the guides
  // this reader implements: warned at the ST, never refused, walk unchanged.
  const guideWarning = declaredGuideWarning(delimiters, tx, IMPLEMENTED_GUIDES_999);
  if (guideWarning !== undefined) warnings.push(guideWarning);

  // Skip the ST segment (always at index 0) and the trailing SE segment
  // when iterating body segments. When SE is missing (truncated tx) the
  // envelope walker didn't append it to `segments` - slice from index 1
  // to the end instead so no body segment is dropped.
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);

  // State machine for the AK1 / AK2 / (IK3+CTX (IK4+CTX)*)* / IK5 / AK9
  // walk. We process body segments sequentially and accumulate the
  // current AK2 response + the current IK3 segment-note in-flight.
  let ak1: X12Ack999Ak1 | undefined;
  const transactionResponses: X12Ack999TransactionResponse[] = [];
  let currentResponse:
    | {
        ak2: X12Ack999Ak2;
        /** The AK2's index on `tx.segments`, where a missing IK5 is reported. */
        segmentIndex: number;
        segmentNotes: X12Ack999SegmentNote[];
      }
    | undefined;
  let currentSegmentNote:
    | {
        ik3: X12Ack999Ik3;
        contexts: string[];
        elementNotes: X12Ack999ElementNote[];
      }
    | undefined;
  let currentElementNote:
    | {
        ik4: X12Ack999Ik4;
        contexts: string[];
      }
    | undefined;
  let ak9: X12Ack999Ak9 | undefined;

  /**
   * Flush the in-flight element note (if any) onto the current segment
   * note. Called whenever a new IK3/IK4/IK5/AK9 closes the prior IK4.
   */
  const flushElementNote = (): void => {
    if (currentElementNote !== undefined && currentSegmentNote !== undefined) {
      currentSegmentNote.elementNotes.push({
        ik4: currentElementNote.ik4,
        contexts: Object.freeze(currentElementNote.contexts.slice()),
      });
    }
    currentElementNote = undefined;
  };

  /**
   * Flush the in-flight segment note (if any) onto the current response.
   * Called whenever a new IK3/IK5 closes the prior IK3.
   */
  const flushSegmentNote = (): void => {
    flushElementNote();
    if (currentSegmentNote !== undefined && currentResponse !== undefined) {
      currentResponse.segmentNotes.push({
        ik3: currentSegmentNote.ik3,
        contexts: Object.freeze(currentSegmentNote.contexts.slice()),
        elementNotes: Object.freeze(currentSegmentNote.elementNotes.slice()),
      });
    }
    currentSegmentNote = undefined;
  };

  /**
   * Flush the in-flight transaction response (if any). Called whenever
   * AK9 closes the last AK2..IK5 block, or a stray AK2 opens a new one.
   *
   * Caller is responsible for supplying the closing IK5 (every AK2 needs
   * one); if it's missing this fallback synthesizes a reject placeholder so
   * the typed model still resolves, and warns at the AK2 so the caller can
   * tell the reader's reject from the sender's.
   */
  const flushResponse = (ik5: X12Ack999Ik5 | undefined): void => {
    flushSegmentNote();
    if (currentResponse !== undefined) {
      if (ik5 === undefined) {
        warnings.push(
          ack999Ik5Absent({ segmentIndex: currentResponse.segmentIndex, transactionIndex: 0 }),
        );
      }
      transactionResponses.push({
        ak2: currentResponse.ak2,
        segmentNotes: Object.freeze(currentResponse.segmentNotes.slice()),
        ik5: ik5 ?? {
          disposition: X12_ACK_DISPOSITION_CODES.R,
          syntaxErrorCodes: Object.freeze([]),
        },
      });
    }
    currentResponse = undefined;
  };

  /**
   * Warn that the disposition at element 1 of the segment at `segmentIndex`
   * could not be read, and answer the fail-safe reject that stands in for it.
   */
  const fallBackToReject = (
    warn: (position: X12Position) => X12ParseWarning,
    segmentIndex: number,
  ): X12AckDispositionCode => {
    warnings.push(warn({ segmentIndex, transactionIndex: 0, elementIndex: 1 }));
    return X12_ACK_DISPOSITION_CODES.R;
  };

  for (const [b, seg] of body.entries()) {
    // Lenient-accept of legacy AK3/AK4/AK5 (standard 999 / pre-X231A1
    // converters): normalize onto the X231A1 IK3/IK4/IK5 names so the
    // walker has one shape to switch on. The verbatim raw text is still
    // preserved on `tx.rawSegments` for forensic review.
    const id =
      seg.id === "AK3" ? "IK3" : seg.id === "AK4" ? "IK4" : seg.id === "AK5" ? "IK5" : seg.id;
    switch (id) {
      case "AK1": {
        ak1 = readAk1(seg, delimiters);
        break;
      }
      case "AK2": {
        // Opening a new AK2 closes the prior one (if it had no IK5, the
        // flush synthesizes a reject placeholder - the inbound was
        // structurally truncated).
        if (currentResponse !== undefined) flushResponse(undefined);
        currentResponse = {
          ak2: readAk2(seg, delimiters),
          // `body` starts after the ST, which is `tx.segments[0]`.
          segmentIndex: b + 1,
          segmentNotes: [],
        };
        break;
      }
      case "IK3": {
        flushSegmentNote();
        if (currentResponse === undefined) break; // structurally lost - segment outside AK2
        const positionRaw = getElement(seg, 2, delimiters);
        const position = parseNonNegativeInteger(positionRaw);
        currentSegmentNote = {
          ik3: {
            segmentIdCode: getElement(seg, 1, delimiters),
            segmentPositionInTransactionSet: position,
            loopIdentifier: getOptionalElement(seg, 3, delimiters),
            syntaxErrorCode: narrowIk304Code(getOptionalElement(seg, 4, delimiters)),
          },
          contexts: [],
          elementNotes: [],
        };
        break;
      }
      case "IK4": {
        flushElementNote();
        if (currentSegmentNote === undefined) break;
        const rawCode = getOptionalElement(seg, 3, delimiters);
        const code = narrowIk403Code(rawCode);
        if (code === undefined) break; // IK4-03 is required; without it the IK4 is malformed and dropped
        const rawPos = getElement(seg, 1, delimiters);
        const pos = parseElementPosition(rawPos, delimiters);
        currentElementNote = {
          ik4: {
            position: pos,
            dataElementReferenceNumber: getOptionalElement(seg, 2, delimiters),
            syntaxErrorCode: code,
            copyOfBadDataElement: getOptionalElement(seg, 4, delimiters),
          },
          contexts: [],
        };
        break;
      }
      case "CTX": {
        // CTX situates the prior IK3 or IK4. We surface the raw CTX-01
        // composite value verbatim - the X231A1 CTX syntax is non-trivial
        // and the typed model deliberately stops at "preserve verbatim"
        // rather than over-decompose.
        const ctxValue = getElement(seg, 1, delimiters);
        if (currentElementNote !== undefined) {
          currentElementNote.contexts.push(ctxValue);
        } else if (currentSegmentNote !== undefined) {
          currentSegmentNote.contexts.push(ctxValue);
        }
        break;
      }
      case "IK5": {
        // Lenient fail-safe: an absent, empty or unknown disposition (anything
        // outside code list 715) reads as a typed reject and warns at IK5-01,
        // so the caller can tell the reader's reject from the sender's. The
        // raw IK5/AK5 bytes stay on the transaction set for forensic review.
        const disposition =
          narrowDispositionCode(getElement(seg, 1, delimiters)) ??
          fallBackToReject(ack999Ik5DispositionUnknown, b + 1);
        const ik5: X12Ack999Ik5 = {
          disposition,
          syntaxErrorCodes: collectErrorCodes(seg, 2, 6, delimiters),
        };
        flushResponse(ik5);
        break;
      }
      case "AK9": {
        // AK9 is the last 999 body segment. Close any straggler.
        if (currentResponse !== undefined) flushResponse(undefined);
        const disposition =
          narrowDispositionCode(getElement(seg, 1, delimiters)) ??
          fallBackToReject(ack999Ak9DispositionUnknown, b + 1);
        ak9 = { disposition, ...readAk9Counts(seg, delimiters) };
        break;
      }
      default: {
        // Anything else inside a 999 body is structurally unexpected;
        // skip (the underlying `tx.segments` still carries it verbatim).
        break;
      }
    }
  }

  // EOF without AK1 or AK9 → synthesize a placeholder + warn so the typed
  // model resolves but the caller can tell the reader's fill-in from the
  // sender's segment. Both anchor at the ST, AK1 first in segment order.
  if (currentResponse !== undefined) flushResponse(undefined);
  if (ak1 === undefined) warnings.push(ack999Ak1Absent({ segmentIndex: 0, transactionIndex: 0 }));
  if (ak9 === undefined) warnings.push(ack999Ak9Absent({ segmentIndex: 0, transactionIndex: 0 }));
  const finalAk1: X12Ack999Ak1 = ak1 ?? {
    functionalIdCode: "",
    groupControlNumber: "",
    versionRelease: undefined,
  };
  const finalAk9: X12Ack999Ak9 = ak9 ?? {
    disposition: X12_ACK_DISPOSITION_CODES.R,
    numberOfTransactionSets: 0,
    numberOfReceivedTransactionSets: 0,
    numberOfAcceptedTransactionSets: 0,
    syntaxErrorCodes: Object.freeze([]),
  };

  return Object.freeze({
    interchange,
    ak1: finalAk1,
    transactionResponses: Object.freeze(transactionResponses.slice()),
    ak9: finalAk9,
    warnings: Object.freeze(warnings.slice()),
  });
}

// ---------------------------------------------------------------------------
// Code narrowing (999-specific). The element readers are shared with the 997
// in `./ack-elements.ts`.
// ---------------------------------------------------------------------------

/**
 * Narrow an inbound IK5/AK5/AK9 disposition string to {@link
 * X12AckDispositionCode}, or `undefined` when the value is not one of the
 * seven known codes. Used by the lenient parse path so unknown
 * dispositions fall back to a typed reject (fail-safe) AND warn, through
 * `fallBackToReject` in the walk.
 *
 * @internal
 */
function narrowDispositionCode(value: string): X12AckDispositionCode | undefined {
  switch (value) {
    case "A":
    case "E":
    case "P":
    case "R":
    case "M":
    case "W":
    case "X":
      return value;
    default:
      return undefined;
  }
}

/**
 * Narrow an inbound IK3-04 / AK3-04 error code, or `undefined` if absent
 * or unrecognized. Lenient-accept of an unknown code drops the type-level
 * narrowing so consumers see `undefined`; the raw segment still carries
 * the verbatim bytes for forensic review.
 *
 * @internal
 */
function narrowIk304Code(value: string | undefined): Ik304Code | undefined {
  if (value === undefined) return undefined;
  if (Object.hasOwn(IK3_SYNTAX_ERROR_CODES, value)) {
    return value as Ik304Code;
  }
  return undefined;
}

/**
 * Narrow an inbound IK4-03 / AK4-03 error code, or `undefined` if absent
 * or unrecognized.
 *
 * @internal
 */
function narrowIk403Code(value: string | undefined): Ik403Code | undefined {
  if (value === undefined) return undefined;
  if (Object.hasOwn(IK4_SYNTAX_ERROR_CODES, value)) {
    return value as Ik403Code;
  }
  return undefined;
}

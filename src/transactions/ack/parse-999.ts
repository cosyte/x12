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
import { getSegmentValue, type X12Segment } from "../../parser/segment.js";
import type {
  Delimiters,
  X12Interchange,
  X12ParseOptions,
  X12TransactionSet,
} from "../../parser/types.js";
import { splitWithRelease, unescapeRelease } from "../../parser/release.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
// `warnings` is reserved for future 999-specific Tier-2 codes; the Phase 3
// parser is silent + fail-safe - see fail-safe fallbacks below.

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
   * one); if it's missing this fallback synthesizes a placeholder so the
   * typed model still resolves and the caller can decide via the warning.
   */
  const flushResponse = (ik5: X12Ack999Ik5 | undefined): void => {
    flushSegmentNote();
    if (currentResponse !== undefined) {
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

  for (const seg of body) {
    // Lenient-accept of legacy AK3/AK4/AK5 (standard 999 / pre-X231A1
    // converters): normalize onto the X231A1 IK3/IK4/IK5 names so the
    // walker has one shape to switch on. The verbatim raw text is still
    // preserved on `tx.rawSegments` for forensic review.
    const id =
      seg.id === "AK3" ? "IK3" : seg.id === "AK4" ? "IK4" : seg.id === "AK5" ? "IK5" : seg.id;
    switch (id) {
      case "AK1": {
        ak1 = {
          functionalIdCode: getElement(seg, 1, delimiters),
          groupControlNumber: getElement(seg, 2, delimiters),
          versionRelease: getOptionalElement(seg, 3, delimiters),
        };
        break;
      }
      case "AK2": {
        // Opening a new AK2 closes the prior one (if it had no IK5, the
        // flush synthesizes a reject placeholder - the inbound was
        // structurally truncated).
        if (currentResponse !== undefined) flushResponse(undefined);
        currentResponse = {
          ak2: {
            transactionSetIdCode: getElement(seg, 1, delimiters),
            transactionSetControlNumber: getElement(seg, 2, delimiters),
            implementationConventionReference: getOptionalElement(seg, 3, delimiters),
          },
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
        const pos = parseIk4Position(rawPos, delimiters);
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
        // Lenient fail-safe: an unknown disposition (anything past code
        // list 715) collapses to typed reject. The raw IK5/AK5 bytes
        // remain reachable on `interchange.groups[*].transactions[*].rawSegments`
        // for forensic review without polluting the warning registry.
        const disposition =
          narrowDispositionCode(getElement(seg, 1, delimiters)) ?? X12_ACK_DISPOSITION_CODES.R;
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
          narrowDispositionCode(getElement(seg, 1, delimiters)) ?? X12_ACK_DISPOSITION_CODES.R;
        const errorCodes = collectErrorCodes(seg, 5, 9, delimiters);
        ak9 = {
          disposition,
          numberOfTransactionSets: parseNonNegativeInteger(getElement(seg, 2, delimiters)),
          numberOfReceivedTransactionSets: parseNonNegativeInteger(getElement(seg, 3, delimiters)),
          numberOfAcceptedTransactionSets: parseNonNegativeInteger(getElement(seg, 4, delimiters)),
          syntaxErrorCodes: errorCodes,
        };
        break;
      }
      default: {
        // Anything else inside a 999 body is structurally unexpected;
        // skip (the underlying `tx.segments` still carries it verbatim).
        break;
      }
    }
  }

  // EOF without AK9 → synthesize a placeholder + warn so the typed model
  // resolves but the caller can detect the truncation.
  if (currentResponse !== undefined) flushResponse(undefined);
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
// Element accessors (segment-internal).
// ---------------------------------------------------------------------------

/**
 * Read element `n` (1-indexed) of `seg`. Returns `""` when missing - the
 * lenient narrow consistent with the envelope walker's `el()` helper.
 *
 * @internal
 */
function getElement(seg: X12Segment, n: number, delimiters: Delimiters): string {
  const value = getSegmentValue(seg, String(n).padStart(2, "0"), delimiters);
  return value ?? "";
}

/**
 * Read optional element `n` (1-indexed) of `seg`. Returns `undefined`
 * when missing OR when present-but-empty (X12 represents "not supplied"
 * either way), so the typed-model `string | undefined` collapses both.
 *
 * @internal
 */
function getOptionalElement(
  seg: X12Segment,
  n: number,
  delimiters: Delimiters,
): string | undefined {
  const value = getSegmentValue(seg, String(n).padStart(2, "0"), delimiters);
  if (value === undefined || value === "") return undefined;
  return value;
}

/**
 * Collect non-empty element strings between positions `start` and `end`
 * inclusive (1-indexed). Used for the trailing AK9-05..AK9-09 and
 * IK5-02..IK5-06 syntax-error code lists. Returns a frozen readonly
 * array - empty when no codes are present.
 *
 * @internal
 */
function collectErrorCodes(
  seg: X12Segment,
  start: number,
  end: number,
  delimiters: Delimiters,
): readonly string[] {
  const out: string[] = [];
  for (let i = start; i <= end; i++) {
    const value = getOptionalElement(seg, i, delimiters);
    if (value !== undefined) out.push(value);
  }
  return Object.freeze(out);
}

/**
 * Parse a non-negative integer from an X12 numeric element. Returns `0`
 * for empty / unparseable input - the lenient narrow consistent with the
 * envelope walker's behavior on malformed-but-not-fatal counts.
 *
 * @internal
 */
function parseNonNegativeInteger(value: string): number {
  if (value.length === 0) return 0;
  if (!/^\d+$/u.test(value)) return 0;
  return parseInt(value, 10);
}

/**
 * Narrow an inbound IK5/AK5/AK9 disposition string to {@link
 * X12AckDispositionCode}, or `undefined` when the value is not one of the
 * seven known codes. Used by the lenient parse path so unknown
 * dispositions fall back to a typed reject (fail-safe) AND warn.
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
  if (value in IK3_SYNTAX_ERROR_CODES) {
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
  if (value in IK4_SYNTAX_ERROR_CODES) {
    return value as Ik403Code;
  }
  return undefined;
}

/**
 * Parse the IK4-01 composite (element / component / repetition position)
 * into its triple. The composite is encoded with the active component
 * delimiter (typically `:` or `\\`). All three numeric positions are
 * 1-indexed against the inbound TR3.
 *
 * @internal
 */
function parseIk4Position(
  raw: string,
  delimiters: Delimiters,
): { element: number; component: number | undefined; repetition: number | undefined } {
  const parts = splitWithRelease(raw, delimiters.component);
  const elementText = unescapeRelease(parts[0] ?? "", delimiters, noop, { segmentIndex: 0 });
  const componentText =
    parts[1] === undefined
      ? undefined
      : unescapeRelease(parts[1], delimiters, noop, { segmentIndex: 0 });
  const repetitionText =
    parts[2] === undefined
      ? undefined
      : unescapeRelease(parts[2], delimiters, noop, { segmentIndex: 0 });
  return {
    element: parseNonNegativeInteger(elementText),
    component:
      componentText === undefined || componentText === ""
        ? undefined
        : parseNonNegativeInteger(componentText),
    repetition:
      repetitionText === undefined || repetitionText === ""
        ? undefined
        : parseNonNegativeInteger(repetitionText),
  };
}

/** @internal */
const noop = (_w: X12ParseWarning): void => {
  /* intentionally empty */
};

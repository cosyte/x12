/**
 * `parse997` - decode a 997 Functional Acknowledgment into the typed
 * {@link X12Ack997} model. PURE FUNCTION; never opens sockets, never touches
 * the filesystem.
 *
 * The 997 is read to the ASC X12 base standard alone: ST, AK1, then per
 * acknowledged transaction set AK2, (AK3 (AK4)*)*, AK5, then AK9 and SE. No
 * implementation guide names it, so no declared guide is checked and no guide
 * table is consulted. AK1, AK2, the AK3 and AK4 elements and the AK9 counts
 * are read by the same code that reads them on a 999 (`./ack-elements.ts`).
 *
 * Where the 999 reader fills in a reject, this one fills in nothing: an
 * absent AK1, AK5 or AK9 reads as `undefined`, and a disposition outside its
 * code list reads as an `undefined` disposition beside the code as sent. Each
 * case warns. If the input holds no 997 transaction set, `parse997` returns
 * `undefined` rather than throwing.
 */

import type { Buffer } from "node:buffer";

import { parseX12 } from "../../parser/index.js";
import type { X12Segment } from "../../parser/segment.js";
import type {
  Delimiters,
  X12Interchange,
  X12ParseOptions,
  X12TransactionSet,
} from "../../parser/types.js";
import {
  ack997Ak1Absent,
  ack997Ak5Absent,
  ack997Ak5DispositionUnknown,
  ack997Ak9Absent,
  ack997Ak9DispositionUnknown,
  ack997SegmentNotDefined,
  ack997SegmentOutOfPlace,
  type X12ParseWarning,
} from "../../parser/warnings.js";
import { wireLookup } from "../../parser/lookup.js";

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
  X12_997_SET_DISPOSITION_CODES,
  X12_ACK_DISPOSITION_CODES,
  type X12Ack997SetDispositionCode,
  type X12AckDispositionCode,
} from "./codes.js";
import type {
  X12Ack997,
  X12Ack997Ak4,
  X12Ack997Ak5,
  X12Ack997Ak9,
  X12Ack997SegmentNote,
  X12Ack997TransactionResponse,
  X12Ack999Ak1,
  X12Ack999Ak2,
} from "./types.js";

/**
 * AK9-01 (code list 715) and AK5-01 (code list 717), keyed by the code as
 * sent. Null-prototype tables, so a code naming an `Object.prototype` member
 * is simply not one. @internal
 */
const GROUP_DISPOSITIONS: Readonly<Record<string, X12AckDispositionCode>> =
  wireLookup(X12_ACK_DISPOSITION_CODES);
const SET_DISPOSITIONS: Readonly<Record<string, X12Ack997SetDispositionCode>> = wireLookup(
  X12_997_SET_DISPOSITION_CODES,
);

/**
 * Decode a 997 Functional Acknowledgment from a raw `string` or `Buffer`.
 * Returns the typed {@link X12Ack997} for the first 997 transaction set in
 * the input, or `undefined` when there is none. Lenient on parse: every
 * recoverable deviation is a warning (see {@link X12Ack997.warnings}).
 *
 * @example
 * ```ts
 * import { parse997 } from "@cosyte/x12";
 * const ack = parse997(rawBytes);
 * if (ack !== undefined) {
 *   ack.ak9?.disposition;                     // "A" | "E" | "P" | "R" | "M" | "W" | "X" | undefined
 *   ack.transactionResponses[0]?.ak5?.disposition;
 * }
 * ```
 */
export function parse997(
  raw: string | Buffer,
  options: X12ParseOptions = {},
): X12Ack997 | undefined {
  const interchange = parseX12(raw, options);
  for (const group of interchange.groups) {
    for (const tx of group.transactions) {
      if (tx.st.elements[1] === "997") return decodeAck997(interchange, tx);
    }
  }
  return undefined;
}

/** The AK3 in flight, with its AK4s and the AK2's list it closes onto. @internal */
interface OpenSegmentNote {
  readonly ak3: X12Ack997SegmentNote["ak3"];
  readonly elementNotes: X12Ack997Ak4[];
  readonly into: X12Ack997SegmentNote[];
}

/** The AK2 in flight, with its AK3s. @internal */
interface OpenResponse {
  readonly ak2: X12Ack999Ak2;
  /** The AK2's index on `tx.segments`, where a missing AK5 is reported. */
  readonly segmentIndex: number;
  readonly segmentNotes: X12Ack997SegmentNote[];
}

/**
 * Walk one ST..SE 997 transaction set's body segments and assemble the typed
 * model. @internal
 */
function decodeAck997(interchange: X12Interchange, tx: X12TransactionSet): X12Ack997 {
  const { delimiters } = interchange;
  const warnings: X12ParseWarning[] = [];
  const body = tx.se === undefined ? tx.segments.slice(1) : tx.segments.slice(1, -1);

  let ak1: X12Ack999Ak1 | undefined;
  let ak9: X12Ack997Ak9 | undefined;
  const responses: X12Ack997TransactionResponse[] = [];
  let response: OpenResponse | undefined;
  let note: OpenSegmentNote | undefined;
  /** Whether an AK2 has opened, after which an AK1 is out of place. */
  let sawAk2 = false;

  /** Close the AK3 in flight onto the AK2 in flight. */
  const closeNote = (): void => {
    if (note === undefined) return;
    note.into.push(
      Object.freeze({ ak3: note.ak3, elementNotes: Object.freeze(note.elementNotes.slice()) }),
    );
    note = undefined;
  };

  /** Close the AK2 in flight, with the AK5 that closed it or none. */
  const closeResponse = (ak5: X12Ack997Ak5 | undefined): void => {
    closeNote();
    if (response === undefined) return;
    if (ak5 === undefined) {
      warnings.push(ack997Ak5Absent({ segmentIndex: response.segmentIndex, transactionIndex: 0 }));
    }
    responses.push(
      Object.freeze({
        ak2: response.ak2,
        segmentNotes: Object.freeze(response.segmentNotes.slice()),
        ak5,
      }),
    );
    response = undefined;
  };

  for (const [b, seg] of body.entries()) {
    // `body` starts after the ST, which is `tx.segments[0]`.
    const segmentIndex = b + 1;
    switch (seg.id) {
      case "AK1": {
        // A second AK1, or one after the first AK2 or the AK9: the header
        // comes first, once.
        if (ak1 !== undefined || sawAk2 || ak9 !== undefined) {
          warnings.push(ack997SegmentOutOfPlace({ segmentIndex, transactionIndex: 0 }));
          break;
        }
        ak1 = Object.freeze(readAk1(seg, delimiters));
        break;
      }
      case "AK2": {
        closeResponse(undefined);
        if (ak9 !== undefined) {
          warnings.push(ack997SegmentOutOfPlace({ segmentIndex, transactionIndex: 0 }));
          break;
        }
        sawAk2 = true;
        response = { ak2: Object.freeze(readAk2(seg, delimiters)), segmentIndex, segmentNotes: [] };
        break;
      }
      case "AK3": {
        closeNote();
        if (response === undefined) {
          warnings.push(ack997SegmentOutOfPlace({ segmentIndex, transactionIndex: 0 }));
          break;
        }
        note = { ak3: readAk3(seg, delimiters), elementNotes: [], into: response.segmentNotes };
        break;
      }
      case "AK4": {
        if (note === undefined) {
          warnings.push(ack997SegmentOutOfPlace({ segmentIndex, transactionIndex: 0 }));
          break;
        }
        note.elementNotes.push(readAk4(seg, delimiters));
        break;
      }
      case "AK5": {
        if (response === undefined) {
          warnings.push(ack997SegmentOutOfPlace({ segmentIndex, transactionIndex: 0 }));
          break;
        }
        const dispositionRaw = getElement(seg, 1, delimiters);
        const disposition = lookup(SET_DISPOSITIONS, dispositionRaw);
        if (disposition === undefined) {
          warnings.push(
            ack997Ak5DispositionUnknown({ segmentIndex, transactionIndex: 0, elementIndex: 1 }),
          );
        }
        closeResponse(
          Object.freeze({
            disposition,
            dispositionRaw,
            syntaxErrorCodes: collectErrorCodes(seg, 2, 6, delimiters),
          }),
        );
        break;
      }
      case "AK9": {
        closeResponse(undefined);
        if (ak9 !== undefined) {
          warnings.push(ack997SegmentOutOfPlace({ segmentIndex, transactionIndex: 0 }));
          break;
        }
        const dispositionRaw = getElement(seg, 1, delimiters);
        const disposition = lookup(GROUP_DISPOSITIONS, dispositionRaw);
        if (disposition === undefined) {
          warnings.push(
            ack997Ak9DispositionUnknown({ segmentIndex, transactionIndex: 0, elementIndex: 1 }),
          );
        }
        ak9 = Object.freeze({ disposition, dispositionRaw, ...readAk9Counts(seg, delimiters) });
        break;
      }
      default: {
        // Anything else inside a 997 body is not part of it: warned, and left
        // verbatim on `tx.segments`.
        warnings.push(ack997SegmentNotDefined({ segmentIndex, transactionIndex: 0 }));
        break;
      }
    }
  }

  closeResponse(undefined);
  if (ak1 === undefined) warnings.push(ack997Ak1Absent({ segmentIndex: 0, transactionIndex: 0 }));
  if (ak9 === undefined) warnings.push(ack997Ak9Absent({ segmentIndex: 0, transactionIndex: 0 }));

  return Object.freeze({
    interchange,
    ak1,
    transactionResponses: Object.freeze(responses.slice()),
    ak9,
    warnings: Object.freeze(warnings.slice()),
  });
}

/** A code looked up in a null-prototype table, or `undefined`. @internal */
function lookup<T>(table: Readonly<Record<string, T>>, code: string): T | undefined {
  return table[code];
}

/** Read an AK3: the same four elements as a 999's IK3, the code verbatim. @internal */
function readAk3(seg: X12Segment, delimiters: Delimiters): X12Ack997SegmentNote["ak3"] {
  return Object.freeze({
    segmentIdCode: getElement(seg, 1, delimiters),
    segmentPositionInTransactionSet: parseNonNegativeInteger(getElement(seg, 2, delimiters)),
    loopIdentifier: getOptionalElement(seg, 3, delimiters),
    syntaxErrorCode: getOptionalElement(seg, 4, delimiters),
  });
}

/** Read an AK4: the same four elements as a 999's IK4, the code verbatim. @internal */
function readAk4(seg: X12Segment, delimiters: Delimiters): X12Ack997Ak4 {
  return Object.freeze({
    position: Object.freeze(parseElementPosition(getElement(seg, 1, delimiters), delimiters)),
    dataElementReferenceNumber: getOptionalElement(seg, 2, delimiters),
    syntaxErrorCode: getOptionalElement(seg, 3, delimiters),
    copyOfBadDataElement: getOptionalElement(seg, 4, delimiters),
  });
}

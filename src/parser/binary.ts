/**
 * Count-based framing for the two X12 segments that carry binary data: BDS
 * (Binary Data Structure: BDS-01 filter, BDS-02 length, BDS-03 data) and BIN
 * (Binary Data: BIN-01 length, BIN-02 data). Both exist to transfer binary
 * data in a single segment and to let a reader find the end of that data
 * through a count rather than a delimiter. The data element admits every octet
 * value from 0x00 to 0xFF, so the element separator, the repetition and
 * component separators, the segment terminator, the release character, CR and
 * LF can all appear inside it as data.
 *
 * This module decides where such a segment's data element begins and how many
 * characters it spans. It is the ONE place that reads a length element, and
 * both callers go through it so they cannot disagree:
 *
 * - `./envelope.ts`'s segment splitter, which uses the count to find the
 *   terminator that ends the segment, and
 * - `./segment.ts`'s `decodeSegment`, which uses the same count on the
 *   segment's raw text to build the element array and raise the warnings.
 *
 * **Units.** The count is in octets. `parseX12` decodes a `Buffer` as latin1,
 * one character per octet, so for a `Buffer` the count is exact. For a string,
 * each UTF-16 code unit is taken as one octet, which is exact for every code
 * unit at or below U+00FF; `decodeSegment` warns where a span holds one above
 * that, and still counts in code units so no character is dropped.
 *
 * **The release character has no effect inside a declared span.** A `?` there
 * is data, counted as one octet, and never escapes the byte after it: an escape
 * would make the transmitted octets differ from the declared count, and the
 * count, not delimiter scanning, marks the end. The elements BEFORE the data
 * element are ordinary delimited elements and are scanned exactly as the
 * element splitter scans any other segment's elements.
 *
 * Nothing here decodes the data: BDS-01's filter (`B64`, for example) is not
 * applied, and nothing inside the span is parsed.
 *
 * @internal
 */

import { RELEASE_CHAR } from "./release.js";
import type { Delimiters } from "./types.js";

/**
 * Where a binary segment keeps its length element and its data element, as
 * 1-indexed element positions (`elements[0]` is the segment id).
 *
 * @internal
 */
export interface BinaryLayout {
  /** Element position of the length element: BDS-02 or BIN-01. */
  readonly lengthIndex: number;
  /** Element position of the binary data element: BDS-03 or BIN-02. */
  readonly dataIndex: number;
}

/** @internal */
const BDS_LAYOUT: BinaryLayout = Object.freeze({ lengthIndex: 2, dataIndex: 3 });
/** @internal */
const BIN_LAYOUT: BinaryLayout = Object.freeze({ lengthIndex: 1, dataIndex: 2 });

/**
 * The layout of a binary segment id, or `undefined` for every other id.
 * Compared by equality and never looked up in an object literal, so an id a
 * sender controls can never resolve through `Object.prototype`.
 *
 * @internal
 */
export function binaryLayout(id: string | undefined): BinaryLayout | undefined {
  if (id === "BDS") return BDS_LAYOUT;
  if (id === "BIN") return BIN_LAYOUT;
  return undefined;
}

/**
 * The shape a length element must have to be honoured: 1 to 15 ASCII digits.
 * DE 784 is `N0` with a maximum length of 15, and its largest value,
 * 999,999,999,999,999, is below `Number.MAX_SAFE_INTEGER`, so `Number()` of a
 * match is exact. Leading zeros are digits and are accepted; a sign, a decimal
 * point and whitespace are not.
 *
 * @internal
 */
const LENGTH_SHAPE_RE = /^[0-9]{1,15}$/u;

/**
 * How a binary segment starting at some offset is framed.
 *
 * - `counted`: the length element is valid and a data element follows it. The
 *   declared span is the `declared` characters starting at `dataStart`.
 *   `preamble` is every element before the data element, id included, as raw
 *   text (release sequences preserved, exactly as the element splitter keeps
 *   them).
 * - `delimited`: there is no count to honour, so the segment is framed by its
 *   delimiters as any other segment is. `problem` says why, for the warning
 *   `decodeSegment` raises: `length-invalid` where the length element is
 *   absent, empty or malformed, `data-absent` where a non-zero length was
 *   declared and the segment ends before a data element begins, and
 *   `undefined` where the segment declares zero octets and omits the (empty)
 *   data element, which leaves nothing to disagree with.
 *
 * @internal
 */
export type BinaryFrame =
  | {
      readonly kind: "counted";
      readonly layout: BinaryLayout;
      readonly preamble: readonly string[];
      readonly dataStart: number;
      readonly declared: number;
    }
  | {
      readonly kind: "delimited";
      readonly layout: BinaryLayout;
      readonly problem: "length-invalid" | "data-absent" | undefined;
    };

/**
 * Whether `?` acts as the release character while scanning the elements that
 * precede the data element. It does not where the element separator or the
 * segment terminator is itself `?`: one byte cannot both separate and escape,
 * and the element splitters fall back to a literal split in exactly that case.
 *
 * @internal
 */
function releaseActive(delimiters: Delimiters): boolean {
  return delimiters.element !== RELEASE_CHAR && delimiters.segment !== RELEASE_CHAR;
}

/**
 * Index of the element separator or segment terminator that ends the element
 * starting at `from`, or `text.length` when the text ends first. A `?` consumes
 * the byte after it when `release` is set, as the element splitter's does.
 *
 * @internal
 */
function scanElement(text: string, from: number, delimiters: Delimiters, release: boolean): number {
  let i = from;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (release && ch === RELEASE_CHAR && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (ch === delimiters.element || ch === delimiters.segment) return i;
    i += 1;
  }
  return text.length;
}

/**
 * Frame the segment that starts at `start` in `text` if it is a BDS or BIN,
 * and return `undefined` for every other segment. `text` is either the whole
 * input (the envelope splitter, where the segment is followed by its
 * terminator) or one segment's raw text (`decodeSegment`, terminator already
 * stripped); the answer for the elements before the data element is the same
 * either way, because the scan stops at the terminator or at the end of the
 * text, whichever comes first.
 *
 * The id is recognised only where the first element is exactly `BDS` or `BIN`,
 * which is the same first element the element splitter would produce.
 *
 * Never throws and always terminates: every loop advances by at least one
 * character.
 *
 * @internal
 */
export function frameBinary(
  text: string,
  start: number,
  delimiters: Delimiters,
): BinaryFrame | undefined {
  const id = text.slice(start, start + 3);
  const layout = binaryLayout(id);
  if (layout === undefined) return undefined;
  const afterId = start + id.length;
  if (
    afterId < text.length &&
    text.charAt(afterId) !== delimiters.element &&
    text.charAt(afterId) !== delimiters.segment
  ) {
    return undefined;
  }
  const release = releaseActive(delimiters);
  const preamble: string[] = [id];
  let cursor = afterId;
  for (let element = 1; element <= layout.lengthIndex; element += 1) {
    if (cursor >= text.length || text.charAt(cursor) !== delimiters.element) {
      // The segment ended before the length element opened: it is absent.
      return { kind: "delimited", layout, problem: "length-invalid" };
    }
    const end = scanElement(text, cursor + 1, delimiters, release);
    preamble.push(text.slice(cursor + 1, end));
    cursor = end;
  }
  const lengthText = preamble[layout.lengthIndex] ?? "";
  if (!LENGTH_SHAPE_RE.test(lengthText)) {
    return { kind: "delimited", layout, problem: "length-invalid" };
  }
  const declared = Number(lengthText);
  if (cursor >= text.length || text.charAt(cursor) !== delimiters.element) {
    return { kind: "delimited", layout, problem: declared === 0 ? undefined : "data-absent" };
  }
  return { kind: "counted", layout, preamble, dataStart: cursor + 1, declared };
}

/**
 * Whether `span` holds a UTF-16 code unit above U+00FF, which is not the
 * latin1 image of one octet.
 *
 * @internal
 */
export function holdsNonOctet(span: string): boolean {
  for (let i = 0; i < span.length; i += 1) {
    if (span.charCodeAt(i) > 0xff) return true;
  }
  return false;
}

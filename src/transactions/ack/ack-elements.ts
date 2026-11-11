/**
 * The segment readers the 999 and the 997 share. Both acknowledgments sit on
 * the same base-standard segments: AK1 and AK2 open the group and set
 * responses, AK9 closes the group, and the 997's AK3 and AK4 are the segments
 * the 999 renamed IK3 and IK4 without moving an element. What differs between
 * the two readers is what each does with a value it cannot read, so each keeps
 * its own walk and its own narrowing, and both read elements here.
 *
 * @internal
 */

import { getSegmentValue, type X12Segment } from "../../parser/segment.js";
import type { Delimiters } from "../../parser/types.js";
import { splitWithRelease, unescapeRelease } from "../../parser/release.js";
import type { X12ParseWarning } from "../../parser/warnings.js";

import type { X12Ack999Ak1, X12Ack999Ak2, X12Ack999Ik4Position } from "./types.js";

/**
 * Read element `n` (1-indexed) of `seg`. Returns `""` when missing - the
 * lenient narrow consistent with the envelope walker's `el()` helper.
 *
 * @internal
 */
export function getElement(seg: X12Segment, n: number, delimiters: Delimiters): string {
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
export function getOptionalElement(
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
 * IK5-02..IK5-06 (AK5-02..AK5-06 on a 997) syntax-error code lists. Returns
 * a frozen readonly array - empty when no codes are present.
 *
 * @internal
 */
export function collectErrorCodes(
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
export function parseNonNegativeInteger(value: string): number {
  if (value.length === 0) return 0;
  if (!/^\d+$/u.test(value)) return 0;
  return parseInt(value, 10);
}

/**
 * Read an AK1 functional group response header: AK1-01 echoes the inbound
 * GS-01, AK1-02 its GS-06 and AK1-03 its GS-08. The same three elements on a
 * 999 and a 997.
 *
 * @internal
 */
export function readAk1(seg: X12Segment, delimiters: Delimiters): X12Ack999Ak1 {
  return {
    functionalIdCode: getElement(seg, 1, delimiters),
    groupControlNumber: getElement(seg, 2, delimiters),
    versionRelease: getOptionalElement(seg, 3, delimiters),
  };
}

/**
 * Read an AK2 transaction set response header: AK2-01 echoes the inbound
 * ST-01, AK2-02 its ST-02 and AK2-03 its ST-03. The same three elements on a
 * 999 and a 997.
 *
 * @internal
 */
export function readAk2(seg: X12Segment, delimiters: Delimiters): X12Ack999Ak2 {
  return {
    transactionSetIdCode: getElement(seg, 1, delimiters),
    transactionSetControlNumber: getElement(seg, 2, delimiters),
    implementationConventionReference: getOptionalElement(seg, 3, delimiters),
  };
}

/**
 * The AK9 counts and syntax error codes, AK9-02 to AK9-09, which the 999 and
 * the 997 lay out alike. AK9-01, the disposition, is left to each reader.
 *
 * @internal
 */
export function readAk9Counts(
  seg: X12Segment,
  delimiters: Delimiters,
): {
  numberOfTransactionSets: number;
  numberOfReceivedTransactionSets: number;
  numberOfAcceptedTransactionSets: number;
  syntaxErrorCodes: readonly string[];
} {
  return {
    numberOfTransactionSets: parseNonNegativeInteger(getElement(seg, 2, delimiters)),
    numberOfReceivedTransactionSets: parseNonNegativeInteger(getElement(seg, 3, delimiters)),
    numberOfAcceptedTransactionSets: parseNonNegativeInteger(getElement(seg, 4, delimiters)),
    syntaxErrorCodes: collectErrorCodes(seg, 5, 9, delimiters),
  };
}

/**
 * Parse the IK4-01 (AK4-01 on a 997) composite, the element / component /
 * repetition position, into its triple. The composite is encoded with the
 * active component delimiter (typically `:` or `\\`). All three numeric
 * positions are 1-indexed.
 *
 * @internal
 */
export function parseElementPosition(raw: string, delimiters: Delimiters): X12Ack999Ik4Position {
  const parts = splitWithRelease(raw, delimiters.component);
  /* v8 ignore next -- a split always yields at least one part, so `parts[0]` is defined */
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

/**
 * The sink for the position unescapes above. The position is the first
 * element, so a trailing `?` in it releases the separator after it rather
 * than dangling. The 999 walk never reaches it otherwise: an IK4 cut off
 * inside its first element has no IK4-03 and is dropped before its position
 * is read. The 997 walk reads such an AK4, and the only `?` that can dangle
 * there is the last byte of the input, which the segment split has already
 * reported as `X12_DANGLING_RELEASE_CHAR`; a second report here would repeat
 * it.
 *
 * @internal
 */
/* v8 ignore next -- see above: no position that reaches the decoder can end in a dangling `?` */
const noop = (_w: X12ParseWarning): void => {
  /* intentionally empty */
};

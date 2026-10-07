/**
 * C003 Composite Medical Procedure Identifier decoding, shared by the readers
 * that publish one (270 EQ-02, 271 EB-13).
 *
 * Each component is read through the release-aware component split, so the
 * separator is the one the interchange declares in ISA-16 and never an
 * assumed `:`.
 *
 * @internal
 */

import { componentOptional, type X12Segment } from "../../parser/segment.js";
import type { Delimiters } from "../../parser/types.js";

/**
 * The decoded C003 shape. Each reader publishes it under its own named type,
 * which this is structurally assignable to. @internal
 */
export interface DecodedProcedure {
  readonly qualifier: string;
  readonly code: string | undefined;
  readonly modifiers: readonly string[];
  readonly description: string | undefined;
}

/** C003-03, the first of the four procedure modifier positions. @internal */
const FIRST_MODIFIER = 3;

/** C003-06, the last of the four procedure modifier positions. @internal */
const LAST_MODIFIER = 6;

/** C003-07 is the free-form description. @internal */
const DESCRIPTION = 7;

/**
 * The C003 composite at `elementIndex`, as its separated components. Absent
 * when the element carries no qualifier: a composite with no first component
 * states no procedure, and inventing one would be the reader asserting a
 * procedure the sender did not send. C003-08 (range end) is not read.
 *
 * @example
 * ```ts
 * // EB*F****35*********AD:D2150~ with the default `:` component separator
 * decodeProcedure(ebSegment, 13, delimiters);
 * // { qualifier: "AD", code: "D2150", modifiers: [], description: undefined }
 * ```
 * @internal
 */
export function decodeProcedure(
  seg: X12Segment,
  elementIndex: number,
  delimiters: Delimiters,
): DecodedProcedure | undefined {
  const qualifier = componentOptional(seg, elementIndex, 1, delimiters);
  if (qualifier === undefined) return undefined;
  const modifiers: string[] = [];
  for (let p = FIRST_MODIFIER; p <= LAST_MODIFIER; p += 1) {
    const modifier = componentOptional(seg, elementIndex, p, delimiters);
    if (modifier !== undefined) modifiers.push(modifier);
  }
  return Object.freeze({
    qualifier,
    code: componentOptional(seg, elementIndex, 2, delimiters),
    modifiers: Object.freeze(modifiers),
    description: componentOptional(seg, elementIndex, DESCRIPTION, delimiters),
  });
}

/**
 * Shared Hierarchical Level (HL) handling for the transaction families
 * that walk an HL tree — 271 eligibility (`005010X279A1`), 277 claim
 * status (`005010X212`), and 277CA claim acknowledgment (`005010X214`).
 * The 837 claim helper carries its own copy (its level set + parent map
 * differ); this module factors the **identical safety primitive** —
 * HL-02 parent-pointer integrity — for the request/response pairs.
 *
 * **Parent-pointer integrity is the #1 structural safety property of an
 * HL transaction.** HL-01 is this level's sequential id; HL-02 names its
 * parent's id; HL-03 is the level code (X12 0735 — `20` Information
 * Source, `21` Information Receiver, `19` Provider of Service, `22`
 * Subscriber, `23` Dependent). The walker validates that HL-02 references
 * an earlier-emitted HL-01 in the same transaction AND that the parent's
 * level matches the TR3-required parent for this level. Violations emit
 * `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID` — the walker
 * NEVER silently re-numbers the hierarchy; the verbatim declared pointer
 * stays on the captured level.
 */

import { elementOptional, elementValue, type X12Segment } from "../../parser/segment.js";
import type { Delimiters, X12Position } from "../../parser/types.js";
import {
  hlParentLevelInvalid,
  hlParentMismatch,
  type X12ParseWarning,
} from "../../parser/warnings.js";

/**
 * X12 0735 Hierarchical Level Codes used by the 270/271 and 276/277(/CA)
 * loop hierarchies. `INFORMATION_SOURCE` (`20`) is the payer at the top;
 * `PROVIDER_OF_SERVICE` (`19`) appears in the 277 / 277CA trees between
 * the receiver and the patient.
 *
 * @example
 * ```ts
 * import { HL_LEVEL_CODES } from "@cosyte/x12";
 * HL_LEVEL_CODES.INFORMATION_SOURCE;   // "20"
 * HL_LEVEL_CODES.SUBSCRIBER;           // "22"
 * ```
 */
export const HL_LEVEL_CODES = Object.freeze({
  INFORMATION_SOURCE: "20",
  INFORMATION_RECEIVER: "21",
  PROVIDER_OF_SERVICE: "19",
  SUBSCRIBER: "22",
  DEPENDENT: "23",
});

/**
 * One HL segment captured during an eligibility / claim-status walk. The
 * hierarchy is the structural safety primitive — see the module doc. The
 * verbatim declared `parentHlId` is always preserved even when it fails
 * validation (the parser never re-numbers).
 *
 * @example
 * ```ts
 * import type { X12Hl } from "@cosyte/x12";
 * declare const hl: X12Hl;
 * hl.hlId;       // "3"
 * hl.parentHlId; // "2" (undefined at the information-source top level)
 * hl.levelCode;  // "22" (Subscriber)
 * hl.hasChild;   // "1"
 * ```
 */
export interface X12Hl {
  readonly hlId: string;
  readonly parentHlId: string | undefined;
  readonly levelCode: string;
  readonly hasChild: string;
}

/**
 * Decode an HL segment into the immutable {@link X12Hl} shape. All four
 * elements are read verbatim; HL-02 is optional (absent at a top-level
 * HL).
 *
 * @internal
 */
export function decodeHl(seg: X12Segment, delimiters: Delimiters): X12Hl {
  return Object.freeze({
    hlId: elementValue(seg, 1, delimiters),
    parentHlId: elementOptional(seg, 2, delimiters),
    levelCode: elementValue(seg, 3, delimiters),
    hasChild: elementValue(seg, 4, delimiters),
  });
}

/**
 * Validate an HL's parent pointer against the index of earlier-emitted
 * HLs and a per-transaction `expectedParentLevel` map (level code →
 * required parent level code; `undefined` value = a legitimately
 * top-level code with no parent). Pushes `X12_HL_PARENT_MISMATCH` /
 * `X12_HL_PARENT_LEVEL_INVALID` on violation; never throws, never
 * re-numbers. A level code absent from the map is treated as an unknown
 * level — no synthesized expectation, only the absent-parent check is
 * skipped.
 *
 * @internal
 */
export function validateHl(
  hl: X12Hl,
  index: ReadonlyMap<string, X12Hl>,
  expectedParentLevel: Readonly<Record<string, string | undefined>>,
  position: X12Position,
  warnings: X12ParseWarning[],
): void {
  const hasExpectation = Object.prototype.hasOwnProperty.call(expectedParentLevel, hl.levelCode);
  const expectedParent = hasExpectation ? expectedParentLevel[hl.levelCode] : undefined;
  if (expectedParent === undefined) {
    // Top-level code (parent must be absent) or an unknown level (no
    // synthesized expectation — surfaced verbatim).
    if (hasExpectation && hl.parentHlId !== undefined) {
      warnings.push(hlParentMismatch(position, hl.hlId, hl.parentHlId));
    }
    return;
  }
  if (hl.parentHlId === undefined) {
    warnings.push(hlParentMismatch(position, hl.hlId, ""));
    return;
  }
  const parent = index.get(hl.parentHlId);
  if (parent === undefined) {
    warnings.push(hlParentMismatch(position, hl.hlId, hl.parentHlId));
    return;
  }
  if (parent.levelCode !== expectedParent) {
    warnings.push(
      hlParentLevelInvalid(
        position,
        hl.hlId,
        hl.levelCode,
        parent.hlId,
        parent.levelCode,
        expectedParent,
      ),
    );
  }
}

/**
 * Public entry point for the `@cosyte/x12` package. Phase 1 lands the
 * envelope decoder (ISA / GS / GE / IEA + delimiter detection); Phase 2+
 * adds segment/element/composite decode, the warning-code registry
 * expansion, and the public `defineLoopSpec`. Per-transaction helpers
 * (`get835`, `get837Claims`, ...) arrive in Phases 4+.
 */

/**
 * Library version string, synced with `package.json#version` at build
 * time by downstream phases. Exported now so consumers (and the
 * type-check pipeline) have at least one symbol to resolve through the
 * `exports` map.
 *
 * @example
 * ```ts
 * import { VERSION } from "@cosyte/x12";
 * console.log(VERSION);
 * ```
 */
export const VERSION: string = "0.0.0";

// Phase 1 — envelope parser surface.
export { parseX12 } from "./parser/index.js";
export { detectDelimiters, DELIMITER_POSITIONS, ISA_MIN_LENGTH } from "./parser/delimiters.js";
export { FATAL_CODES, X12ParseError } from "./parser/errors.js";
export type { X12FatalCode } from "./parser/errors.js";
export {
  WARNING_CODES,
  controlNumberMismatch,
  danglingReleaseChar,
  groupCountMismatch,
  missingGe,
  missingIea,
  missingSe,
  pre005010,
  trailingGarbage,
  transactionCountMismatch,
  unexpectedSegment,
} from "./parser/warnings.js";
export type { X12ParseWarning, X12WarningCode } from "./parser/warnings.js";
export type {
  Delimiters,
  GeSegment,
  GsSegment,
  IeaSegment,
  IsaSegment,
  OnWarningCallback,
  X12FunctionalGroup,
  X12Interchange,
  X12ParseOptions,
  X12Position,
  X12TransactionSet,
} from "./parser/types.js";

// Phase 2 — segment / element / composite / repetition decode surface.
export { escapeRelease, RELEASE_CHAR, unescapeRelease } from "./parser/release.js";
export { decodeSegment, getAllSegmentValues, getSegmentValue } from "./parser/segment.js";
export type { X12Segment } from "./parser/segment.js";

// Phase 2 — loop-spec authoring surface (dogfooded by built-in transaction
// specs in Phases 3+).
export { defineLoopSpec, LoopSpecDefinitionError } from "./loops/define.js";
export type { DefineLoopSpecInput } from "./loops/define.js";
export type { LoopMax, LoopSegmentSpec, LoopSpec, LoopUsage } from "./loops/types.js";

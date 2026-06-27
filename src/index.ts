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
  Ta1Segment,
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

// Phase 3 — acknowledgments surface: parse / build 999 (005010X231A1) and
// envelope-level TA1 as pure functions. See `src/transactions/ack/index.ts`
// for the full barrel.
export {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  IK3_SYNTAX_ERROR_CODES,
  IK4_SYNTAX_ERROR_CODES,
  TA1_ACK_CODES,
  TA1_NOTE_CODES,
  X12_ACK_DISPOSITION_CODES,
  build999,
  buildTA1,
  isAcceptDisposition,
  parse999,
  parseTA1,
  type AckBuildErrorCode,
  type Build999ElementErrorSpec,
  type Build999EnvelopeSpec,
  type Build999FunctionalGroupSpec,
  type Build999SegmentErrorSpec,
  type Build999Spec,
  type Build999TransactionResponseSpec,
  type BuildTA1Options,
  type BuildTA1Spec,
  type Ik304Code,
  type Ik403Code,
  type Ta1AckCode,
  type Ta1NoteCode,
  type X12Ack999,
  type X12Ack999Ak1,
  type X12Ack999Ak2,
  type X12Ack999Ak9,
  type X12Ack999ElementNote,
  type X12Ack999Ik3,
  type X12Ack999Ik4,
  type X12Ack999Ik4Position,
  type X12Ack999Ik5,
  type X12Ack999SegmentNote,
  type X12Ack999TransactionResponse,
  type X12AckDispositionCode,
  type X12AckTA1,
} from "./transactions/ack/index.js";

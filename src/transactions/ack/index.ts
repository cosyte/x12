/**
 * Barrel for the X12 acknowledgment transaction surface.
 *
 * Three acks ship side-by-side:
 *
 * - **999** (Implementation Acknowledgment) - TR3 005010X231A1.
 *   Transaction-set level; reports per-transaction structural disposition.
 *   Parse + build are pure functions; the builder REFUSES to fabricate an
 *   `A` against a non-empty error list.
 * - **997** (Functional Acknowledgment) - ASC X12 base standard, no
 *   implementation guide. The same AK1 / AK2 / AK9 segments as the 999, with
 *   AK3 / AK4 / AK5 where the 999 has IK3 / IK4 / IK5; read and written by the
 *   same code. Nothing is filled in on read: an absent or unknown disposition
 *   reads as `undefined` and warns.
 * - **TA1** (Interchange Acknowledgment) - ASC X12 standard, envelope
 *   level. Reports interchange-envelope structural disposition.
 *
 * Both acknowledgments carry NO PHI by design: control numbers, segment
 * IDs, position counters, and error-condition codes only. This is the
 * safety property that makes the "mechanically build the disposition you
 * are told" pattern safe - neither builder ever auto-sends, opens a
 * socket, or touches the filesystem.
 */

export { ACK_BUILD_ERROR_CODES, AckBuildError, type AckBuildErrorCode } from "./errors.js";

export {
  IK3_SYNTAX_ERROR_CODES,
  IK4_SYNTAX_ERROR_CODES,
  TA1_ACK_CODES,
  TA1_NOTE_CODES,
  X12_997_SET_DISPOSITION_CODES,
  X12_ACK_DISPOSITION_CODES,
  isAcceptDisposition,
  type Ik304Code,
  type Ik403Code,
  type Ta1AckCode,
  type Ta1NoteCode,
  type X12Ack997SetDispositionCode,
  type X12AckDispositionCode,
} from "./codes.js";

export { parse997 } from "./parse-997.js";
export { parse999 } from "./parse-999.js";
export { parseTA1 } from "./parse-ta1.js";
export { build997 } from "./build-997.js";
export { build999 } from "./build-999.js";
export { buildTA1, type BuildTA1Options } from "./build-ta1.js";
export {
  ACK_WARNING_MAPPINGS,
  derive999Spec,
  deriveTA1Spec,
  type Derive999Options,
  type X12AckWarningMapping,
  type X12DerivedAck,
} from "./derive.js";

export type {
  Build997ElementErrorSpec,
  Build997FunctionalGroupSpec,
  Build997SegmentErrorSpec,
  Build997Spec,
  Build997TransactionResponseSpec,
  Build999ElementErrorSpec,
  Build999EnvelopeSpec,
  Build999FunctionalGroupSpec,
  Build999SegmentErrorSpec,
  Build999Spec,
  Build999TransactionResponseSpec,
  BuildTA1Spec,
  X12Ack997,
  X12Ack997Ak3,
  X12Ack997Ak4,
  X12Ack997Ak5,
  X12Ack997Ak9,
  X12Ack997SegmentNote,
  X12Ack997TransactionResponse,
  X12Ack999,
  X12Ack999Ak1,
  X12Ack999Ak2,
  X12Ack999Ak9,
  X12Ack999ElementNote,
  X12Ack999Ik3,
  X12Ack999Ik4,
  X12Ack999Ik4Position,
  X12Ack999Ik5,
  X12Ack999SegmentNote,
  X12Ack999TransactionResponse,
  X12AckTA1,
} from "./types.js";

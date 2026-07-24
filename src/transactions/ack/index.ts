/**
 * Barrel for the X12 acknowledgment transaction surface (Phase 3).
 *
 * Two acks ship side-by-side:
 *
 * - **999** (Implementation Acknowledgment) - TR3 005010X231A1.
 *   Transaction-set level; reports per-transaction structural disposition.
 *   Parse + build are pure functions; the builder REFUSES to fabricate an
 *   `A` against a non-empty error list.
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
  X12_ACK_DISPOSITION_CODES,
  isAcceptDisposition,
  type Ik304Code,
  type Ik403Code,
  type Ta1AckCode,
  type Ta1NoteCode,
  type X12AckDispositionCode,
} from "./codes.js";

export { parse999 } from "./parse-999.js";
export { parseTA1 } from "./parse-ta1.js";
export { build999 } from "./build-999.js";
export { buildTA1, type BuildTA1Options } from "./build-ta1.js";

export type {
  Build999ElementErrorSpec,
  Build999EnvelopeSpec,
  Build999FunctionalGroupSpec,
  Build999SegmentErrorSpec,
  Build999Spec,
  Build999TransactionResponseSpec,
  BuildTA1Spec,
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

/**
 * Barrel for the general-purpose interchange builder. Re-exports
 * {@link buildInterchange}, its spec types, and the {@link X12BuildError}
 * raised on a structurally impossible spec.
 */

export { buildInterchange } from "./build-interchange.js";
export {
  BUILD_REFUSAL_VALUE_MAX_LENGTH,
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  renderCallerValue,
} from "./caller-value.js";
export { X12_BUILD_ERROR_CODES, X12BuildError } from "./errors.js";
export type { X12BuildErrorCode } from "./errors.js";
export type {
  FunctionalGroupSpec,
  InterchangeSpec,
  SegmentSpec,
  TransactionSetSpec,
} from "./types.js";

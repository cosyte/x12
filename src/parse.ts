/**
 * The parse-only entry point, published as `@cosyte/x12/parse`: the envelope parser, the
 * transaction-set stream, segment and element decoding, the release character, `X12Decimal`, the
 * fatal and warning codes, and their types. It loads none of the bundled code lists, loop
 * specifications, typed readers, builders, serializer or built-in profiles, so a caller who only
 * parses pays a smaller import than `@cosyte/x12`.
 *
 * Every name here is the same binding `@cosyte/x12` exports: the build shares one copy of the
 * parser between the two, so `X12ParseError` is one class, `setDefaultProfile` from the main entry
 * point reaches `parseX12` from this one, and a value made by either works with the other.
 */

export { parseX12 } from "./parser/index.js";
export { readTransactionSets } from "./parser/stream.js";
export type { X12StreamOptions, X12StreamSource, X12StreamTransaction } from "./parser/stream.js";
export { detectDelimiters, DELIMITER_POSITIONS, ISA_MIN_LENGTH } from "./parser/delimiters.js";
export { FATAL_CODES, X12ParseError } from "./parser/errors.js";
export type { X12FatalCode } from "./parser/errors.js";
export { ALL_WARNING_MESSAGES, WARNING_CODES } from "./parser/warnings.js";
export type {
  X12ParseWarning,
  X12UnexpectedSegmentContext,
  X12WarningCode,
} from "./parser/warnings.js";
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
  X12OrphanAnchor,
  X12OrphanAnchorKind,
  X12OrphanSegment,
  X12ParseOptions,
  X12Position,
  X12TransactionSet,
} from "./parser/types.js";

export { escapeRelease, RELEASE_CHAR, unescapeRelease } from "./parser/release.js";
export {
  NON_SPEC_SEGMENT_ID,
  collectElementValues,
  componentOptional,
  decodeSegment,
  elementDecimal,
  elementDecimalOrZero,
  elementOptional,
  elementValue,
  getAllSegmentValues,
  getSegmentValue,
  readElementDecimal,
} from "./parser/segment.js";
export type {
  X12DecimalRead,
  X12DecimalStatus,
  X12DecimalWarningSink,
  X12Segment,
} from "./parser/segment.js";

export { X12Decimal } from "./decimal.js";
export type { X12Profile } from "./profiles/types.js";

/**
 * fast-check generators for ASC X12, at `@cosyte/x12/arbitraries`: delimiter sets, element
 * values, body segments, transaction set types, whole interchanges, specs for the interchange
 * builder, messy interchange text and hostile input. We use them to test this library, and you
 * can use them to test code you build on it.
 *
 * `fast-check` is an optional peer dependency: install it to use this entry point. The main
 * entry point, `@cosyte/x12`, never loads it.
 *
 * Every generated value is synthetic and random. Nothing in one looks like a patient's name,
 * date of birth, member id or address, or an amount from a real claim.
 *
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { parseX12, serializeX12 } from "@cosyte/x12";
 * import { interchange } from "@cosyte/x12/arbitraries";
 *
 * fc.assert(
 *   fc.property(interchange(), (ix) => {
 *     const text = serializeX12(ix);
 *     return serializeX12(parseX12(text)) === text;
 *   }),
 * );
 * ```
 *
 * @packageDocumentation
 */

export { delimiters, segment, value } from "./text.js";
export type { DelimitersOptions, SegmentOptions, ValueOptions } from "./text.js";
export { interchange, interchangeSpec, transactionSetType } from "./interchange.js";
export type { InterchangeOptions, TransactionSetType } from "./interchange.js";
export { hostileInput, interchangeText } from "./messy.js";
export type { HostileInputOptions } from "./messy.js";

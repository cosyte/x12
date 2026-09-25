/**
 * The typed refusals of the two attachments builders,
 * `build277RequestForAdditionalInformation` and `build275`.
 *
 * **No refusal message carries a value from the document.** Not an attachment
 * octet, not a name, identifier, code or control number: each message names
 * the builder, the structural position (as indices the builder counted) and the
 * rule, and nothing the caller put in an element. That is narrower than the
 * other builders in this package, which may echo a bounded fragment of a
 * caller's control number, because a fragment of an attachment would be a
 * fragment of a clinical document. The shared caller guards these builders
 * stand on describe a wrong value by its type alone.
 */

/**
 * Stable codes for every {@link Rfai277BuildError}. Additions only.
 *
 * - `X12_277_RFAI_BUILD_NO_LEVEL`: `levels` is empty.
 * - `X12_277_RFAI_BUILD_NO_REQUEST`: no level anywhere carries a request.
 * - `X12_277_RFAI_BUILD_NO_TRACE`: a request has no `trace`.
 * - `X12_277_RFAI_BUILD_STATUS_CODE_EMPTY`: an STC has no composite, or a
 *   composite whose C043-01 or C043-02 is empty.
 * - `X12_277_RFAI_BUILD_NO_SERVICE`: a service line has no `service`.
 * - `X12_277_RFAI_BUILD_INVALID_SPEC`: the spec is not shaped like one: a value
 *   that is not a string or not an `X12Decimal`, a list that is not an array,
 *   an unusable delimiter set, an empty or over-long control number, or more
 *   than three composites or four modifiers.
 *
 * @example
 * ```ts
 * import { RFAI_277_BUILD_ERROR_CODES, Rfai277BuildError } from "@cosyte/x12";
 * try {
 *   // build277RequestForAdditionalInformation(spec);
 * } catch (err) {
 *   if (err instanceof Rfai277BuildError && err.code === RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_TRACE) {
 *     // a claim-level request needs its TRN
 *   }
 * }
 * ```
 */
export const RFAI_277_BUILD_ERROR_CODES = {
  X12_277_RFAI_BUILD_NO_LEVEL: "X12_277_RFAI_BUILD_NO_LEVEL",
  X12_277_RFAI_BUILD_NO_REQUEST: "X12_277_RFAI_BUILD_NO_REQUEST",
  X12_277_RFAI_BUILD_NO_TRACE: "X12_277_RFAI_BUILD_NO_TRACE",
  X12_277_RFAI_BUILD_STATUS_CODE_EMPTY: "X12_277_RFAI_BUILD_STATUS_CODE_EMPTY",
  X12_277_RFAI_BUILD_NO_SERVICE: "X12_277_RFAI_BUILD_NO_SERVICE",
  X12_277_RFAI_BUILD_INVALID_SPEC: "X12_277_RFAI_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link RFAI_277_BUILD_ERROR_CODES}.
 *
 * @example
 * ```ts
 * import type { Rfai277BuildErrorCode } from "@cosyte/x12";
 * const code: Rfai277BuildErrorCode = "X12_277_RFAI_BUILD_NO_LEVEL";
 * ```
 */
export type Rfai277BuildErrorCode =
  (typeof RFAI_277_BUILD_ERROR_CODES)[keyof typeof RFAI_277_BUILD_ERROR_CODES];

/**
 * Thrown by `build277RequestForAdditionalInformation` when a spec cannot be
 * emitted as a 277 the base X12 006020 standard accepts. No interchange is
 * returned. The message carries no document value.
 *
 * @example
 * ```ts
 * import { Rfai277BuildError } from "@cosyte/x12";
 * try {
 *   // build277RequestForAdditionalInformation(spec);
 * } catch (err) {
 *   if (err instanceof Rfai277BuildError) console.error(err.code);
 * }
 * ```
 */
export class Rfai277BuildError extends Error {
  public readonly code: Rfai277BuildErrorCode;

  /** @internal */
  public constructor(code: Rfai277BuildErrorCode, message: string) {
    super(message);
    this.name = "Rfai277BuildError";
    this.code = code;
  }
}

/**
 * Stable codes for every {@link Attachment275BuildError}. Additions only.
 *
 * - `X12_275_BUILD_NO_ATTACHMENT`: no line carries an attachment.
 * - `X12_275_BUILD_EMPTY_DATA`: an attachment's data holds no octet.
 * - `X12_275_BUILD_FILTER_CODE_INVALID`: an attachment's filter code is not
 *   exactly three characters.
 * - `X12_275_BUILD_DATA_NOT_OCTETS`: an attachment's data holds a character
 *   above U+00FF, which is not one octet, so no true BDS-02 could be written.
 * - `X12_275_BUILD_INVALID_SPEC`: the spec is not shaped like one: a value that
 *   is not a string, data that is neither a string nor a `Uint8Array`, a list
 *   that is not an array, an unusable delimiter set, or an empty or over-long
 *   control number.
 *
 * @example
 * ```ts
 * import { ATTACHMENT_275_BUILD_ERROR_CODES, Attachment275BuildError } from "@cosyte/x12";
 * try {
 *   // build275(spec);
 * } catch (err) {
 *   if (err instanceof Attachment275BuildError && err.code === ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_EMPTY_DATA) {
 *     // an attachment carries at least one octet
 *   }
 * }
 * ```
 */
export const ATTACHMENT_275_BUILD_ERROR_CODES = {
  X12_275_BUILD_NO_ATTACHMENT: "X12_275_BUILD_NO_ATTACHMENT",
  X12_275_BUILD_EMPTY_DATA: "X12_275_BUILD_EMPTY_DATA",
  X12_275_BUILD_FILTER_CODE_INVALID: "X12_275_BUILD_FILTER_CODE_INVALID",
  X12_275_BUILD_DATA_NOT_OCTETS: "X12_275_BUILD_DATA_NOT_OCTETS",
  X12_275_BUILD_INVALID_SPEC: "X12_275_BUILD_INVALID_SPEC",
} as const;

/**
 * String-literal union over {@link ATTACHMENT_275_BUILD_ERROR_CODES}.
 *
 * @example
 * ```ts
 * import type { Attachment275BuildErrorCode } from "@cosyte/x12";
 * const code: Attachment275BuildErrorCode = "X12_275_BUILD_NO_ATTACHMENT";
 * ```
 */
export type Attachment275BuildErrorCode =
  (typeof ATTACHMENT_275_BUILD_ERROR_CODES)[keyof typeof ATTACHMENT_275_BUILD_ERROR_CODES];

/**
 * Thrown by `build275` when a spec cannot be emitted as a 275 whose every BDS-02
 * is true of its BDS-03. No interchange is returned. The message carries no
 * attachment octet and no other document value.
 *
 * @example
 * ```ts
 * import { Attachment275BuildError } from "@cosyte/x12";
 * try {
 *   // build275(spec);
 * } catch (err) {
 *   if (err instanceof Attachment275BuildError) console.error(err.code);
 * }
 * ```
 */
export class Attachment275BuildError extends Error {
  public readonly code: Attachment275BuildErrorCode;

  /** @internal */
  public constructor(code: Attachment275BuildErrorCode, message: string) {
    super(message);
    this.name = "Attachment275BuildError";
    this.code = code;
  }
}

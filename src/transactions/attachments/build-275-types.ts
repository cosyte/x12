/**
 * Spec shapes for `build275`, the builder for a 275 Additional Information to
 * Support a Health Care Claim or Encounter (`006020X314`).
 *
 * **An attachment is written exactly as supplied.** Its data is written to
 * BDS-03 octet for octet, with no release escaping even where it holds every
 * delimiter and `?`, and BDS-02 is the decimal count of the octets written, so
 * the two always agree. The data is not encoded, and BDS-01 names the filter
 * the caller already applied (`B64`, say); the builder applies none.
 *
 * **Every other code and qualifier is the caller's**, written as given. The
 * builder computes only LX-01, numbering the lines from 1 in order.
 */

/**
 * The whole build request.
 *
 * @example
 * ```ts
 * import type { Build275Spec } from "@cosyte/x12";
 * const spec: Build275Spec = {
 *   envelope: {
 *     senderId: "CLINIC", receiverId: "PAYER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001", groupControlNumber: "1",
 *     transactionSetControlNumber: "0001",
 *   },
 *   beginning: { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001" },
 *   lines: [{
 *     trace: { traceTypeCode: "2", referenceId: "TRACE-0001" },
 *     attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }],
 *   }],
 * };
 * ```
 */
export interface Build275Spec {
  /** The interchange, group and transaction set envelope. */
  readonly envelope: Build275EnvelopeSpec;
  /** The heading's BGN, written first where given. */
  readonly beginning?: Build275BeginningSpec;
  /** The heading's NM1 names, written before the first line. */
  readonly entities?: readonly Build275EntitySpec[];
  /** The LX lines, each carrying its attachments. At least one attachment in all. */
  readonly lines: readonly Build275LineSpec[];
}

/**
 * The envelope. `interchangeControlVersion` is ISA-12: the builder writes the
 * package's default, `00501`, unless given one, because no carried source
 * states which ISA-12 a 006020 interchange carries.
 *
 * @example
 * ```ts
 * import type { Build275EnvelopeSpec } from "@cosyte/x12";
 * const envelope: Build275EnvelopeSpec = {
 *   senderId: "CLINIC", receiverId: "PAYER",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001", groupControlNumber: "1",
 *   transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build275EnvelopeSpec {
  /** ISA-06, interchange sender id (padded to 15 on emit). */
  readonly senderId: string;
  /** ISA-08, interchange receiver id (padded to 15 on emit). */
  readonly receiverId: string;
  /** ISA-09, interchange date YYMMDD. */
  readonly interchangeDate: string;
  /** ISA-10, interchange time HHMM. */
  readonly interchangeTime: string;
  /** ISA-13 / IEA-02, interchange control number (zero-padded to 9 on emit). */
  readonly interchangeControlNumber: string;
  /** GS-06 / GE-02, group control number. */
  readonly groupControlNumber: string;
  /** ST-02 / SE-02, transaction set control number. */
  readonly transactionSetControlNumber: string;
  /** ISA-05, interchange sender qualifier. Default `"ZZ"`. */
  readonly senderQualifier?: string;
  /** ISA-07, interchange receiver qualifier. Default `"ZZ"`. */
  readonly receiverQualifier?: string;
  /** ISA-12, interchange control version number. Default `"00501"`. */
  readonly interchangeControlVersion?: string;
  /** ISA-15, usage indicator (`P` production, `T` test). Default `"P"`. */
  readonly usageIndicator?: string;
  /** GS-02, application sender code. Default: the interchange sender id. */
  readonly applicationSenderCode?: string;
  /** GS-03, application receiver code. Default: the interchange receiver id. */
  readonly applicationReceiverCode?: string;
  /** GS-04, group date CCYYMMDD. Default: century-expanded ISA-09. */
  readonly groupDate?: string;
  /** GS-05, group time HHMM. Default: the interchange time. */
  readonly groupTime?: string;
  /** Element separator (ISA byte 4). Default `"*"`. */
  readonly elementSeparator?: string;
  /** Repetition separator (ISA-11). Default `"^"`. */
  readonly repetitionSeparator?: string;
  /** Component separator (ISA-16). Default `":"`. */
  readonly componentSeparator?: string;
  /** Segment terminator. Default `"~"`. */
  readonly segmentTerminator?: string;
}

/**
 * The BGN, each element written as given.
 *
 * @example
 * ```ts
 * import type { Build275BeginningSpec } from "@cosyte/x12";
 * const bgn: Build275BeginningSpec = { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001", date: "20260601" };
 * ```
 */
export interface Build275BeginningSpec {
  /** BGN-01. */
  readonly transactionSetPurposeCode: string;
  /** BGN-02. */
  readonly referenceId?: string;
  /** BGN-03. */
  readonly date?: string;
  /** BGN-04. */
  readonly time?: string;
  /** BGN-05. */
  readonly timeCode?: string;
  /** BGN-06. */
  readonly secondReferenceId?: string;
  /** BGN-07. */
  readonly transactionTypeCode?: string;
  /** BGN-08. */
  readonly actionCode?: string;
  /** BGN-09. */
  readonly securityLevelCode?: string;
}

/**
 * One NM1 of the heading, every element written as given.
 *
 * @example
 * ```ts
 * import type { Build275EntitySpec } from "@cosyte/x12";
 * const payer: Build275EntitySpec = { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastOrOrganizationName: "PAYER ONE" };
 * ```
 */
export interface Build275EntitySpec {
  /** NM1-01. */
  readonly entityIdentifierCode: string;
  /** NM1-02. */
  readonly entityTypeQualifier: string;
  /** NM1-03. */
  readonly lastOrOrganizationName?: string;
  /** NM1-04. */
  readonly firstName?: string;
  /** NM1-05. */
  readonly middleName?: string;
  /** NM1-06. */
  readonly namePrefix?: string;
  /** NM1-07. */
  readonly nameSuffix?: string;
  /** NM1-08. */
  readonly idQualifier?: string;
  /** NM1-09. */
  readonly idCode?: string;
}

/**
 * One LX line: its TRN, STC and REF segments, then one BDS per attachment.
 *
 * @example
 * ```ts
 * import type { Build275LineSpec } from "@cosyte/x12";
 * const line: Build275LineSpec = {
 *   trace: { traceTypeCode: "2", referenceId: "TRACE-0001" },
 *   references: [{ qualifier: "1K", value: "PCN0001" }],
 *   attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }],
 * };
 * ```
 */
export interface Build275LineSpec {
  /** The line's TRN. */
  readonly trace?: Build275TraceSpec;
  /** The line's STC. */
  readonly status?: Build275StatusSpec;
  /** The line's REF segments. */
  readonly references?: readonly Build275ReferenceSpec[];
  /** The line's attachments, one BDS each, written last. */
  readonly attachments?: readonly Build275AttachmentSpec[];
}

/**
 * One TRN.
 *
 * @example
 * ```ts
 * import type { Build275TraceSpec } from "@cosyte/x12";
 * const trace: Build275TraceSpec = { traceTypeCode: "2", referenceId: "TRACE-0001" };
 * ```
 */
export interface Build275TraceSpec {
  /** TRN-01. */
  readonly traceTypeCode: string;
  /** TRN-02. */
  readonly referenceId: string;
  /** TRN-03. */
  readonly originatingCompanyId?: string;
  /** TRN-04. */
  readonly supplementalReferenceId?: string;
}

/**
 * One STC, its composites written to STC-01, STC-10 and STC-11 in order,
 * every component as given.
 *
 * @example
 * ```ts
 * import type { Build275StatusSpec } from "@cosyte/x12";
 * const status: Build275StatusSpec = {
 *   codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }],
 * };
 * ```
 */
export interface Build275StatusSpec {
  /** One to three C043 composites. */
  readonly codes: readonly Build275StatusCodeSpec[];
  /** STC-02. */
  readonly statusEffectiveDate?: string;
  /** STC-03. */
  readonly actionCode?: string;
  /** STC-12. */
  readonly message?: string;
}

/**
 * One C043 composite.
 *
 * @example
 * ```ts
 * import type { Build275StatusCodeSpec } from "@cosyte/x12";
 * const code: Build275StatusCodeSpec = { categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" };
 * ```
 */
export interface Build275StatusCodeSpec {
  /** C043-01. */
  readonly categoryCode: string;
  /** C043-02. */
  readonly statusCode: string;
  /** C043-03. */
  readonly entityCode?: string;
  /** C043-04. */
  readonly codeListQualifier?: string;
}

/**
 * One REF.
 *
 * @example
 * ```ts
 * import type { Build275ReferenceSpec } from "@cosyte/x12";
 * const pcn: Build275ReferenceSpec = { qualifier: "1K", value: "PCN0001" };
 * ```
 */
export interface Build275ReferenceSpec {
  /** REF-01. */
  readonly qualifier: string;
  /** REF-02. */
  readonly value: string;
  /** REF-03. */
  readonly description?: string;
}

/**
 * One attachment, written as one BDS. `data` is the octets to carry: a
 * `Uint8Array` (a `Buffer` is one), or a string holding one character per
 * octet, every character at or below U+00FF. It is written verbatim and never
 * encoded; `filterCode` names the filter the caller already applied.
 *
 * @example
 * ```ts
 * import type { Build275AttachmentSpec } from "@cosyte/x12";
 * const a: Build275AttachmentSpec = { filterCode: "B64", data: "U1lOVEhFVElD" };
 * ```
 */
export interface Build275AttachmentSpec {
  /** BDS-01, exactly three characters. */
  readonly filterCode: string;
  /** BDS-03, at least one octet. */
  readonly data: string | Uint8Array;
}

/**
 * Spec shapes for `build277RequestForAdditionalInformation`, the builder for a
 * 277 Health Care Claim Request for Additional Information (`006020X313`).
 *
 * **Every code and qualifier is the caller's.** No carried source states which
 * BHT codes, HL level codes, entity or reference qualifiers the implementation
 * guide requires, so the builder writes each one exactly as given and never
 * supplies one. It computes only the HL-01 identifiers and HL-02 parent
 * pointers, from the nesting of `levels`, so a hierarchy it emits cannot point
 * at a level that is not there.
 *
 * **What it refuses** is the set of absences the base X12 006020 277 makes
 * mandatory, and no other: no hierarchical level, no claim-level request, a
 * request with no trace, a status composite whose C043-01 or C043-02 is empty,
 * and a service line with no SVC. It also refuses a spec that is not shaped
 * like one (a value that is not a string, an empty control number).
 */

import type { X12Decimal } from "../../decimal.js";

/**
 * The whole build request.
 *
 * @example
 * ```ts
 * import type { Build277RfaiSpec } from "@cosyte/x12";
 * const spec: Build277RfaiSpec = {
 *   envelope: {
 *     senderId: "PAYER", receiverId: "CLINIC",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001", groupControlNumber: "1",
 *     transactionSetControlNumber: "0001",
 *   },
 *   header: { hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08" },
 *   levels: [{
 *     levelCode: "20",
 *     entities: [{ entityIdentifierCode: "PR", entityTypeQualifier: "2", lastOrOrganizationName: "PAYER ONE" }],
 *     requests: [{
 *       trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
 *       statuses: [{ codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }] }],
 *     }],
 *   }],
 * };
 * ```
 */
export interface Build277RfaiSpec {
  /** The interchange, group and transaction set envelope. */
  readonly envelope: Build277RfaiEnvelopeSpec;
  /** The BHT, every element written as given. */
  readonly header: Build277RfaiHeaderSpec;
  /** The top-level hierarchical levels, each with its subordinate levels nested. At least one. */
  readonly levels: readonly Build277RfaiLevelSpec[];
}

/**
 * The envelope. `interchangeControlVersion` is ISA-12: the builder writes the
 * package's default, `00501`, unless given one, because no carried source
 * states which ISA-12 a 006020 interchange carries.
 *
 * @example
 * ```ts
 * import type { Build277RfaiEnvelopeSpec } from "@cosyte/x12";
 * const envelope: Build277RfaiEnvelopeSpec = {
 *   senderId: "PAYER", receiverId: "CLINIC",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001", groupControlNumber: "1",
 *   transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build277RfaiEnvelopeSpec {
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
 * The BHT, each element written as given; an omitted one is written empty.
 *
 * @example
 * ```ts
 * import type { Build277RfaiHeaderSpec } from "@cosyte/x12";
 * const header: Build277RfaiHeaderSpec = {
 *   hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08",
 *   referenceId: "RFAI-0001", date: "20260601", time: "1200",
 * };
 * ```
 */
export interface Build277RfaiHeaderSpec {
  /** BHT-01. */
  readonly hierarchicalStructureCode: string;
  /** BHT-02. */
  readonly transactionSetPurposeCode: string;
  /** BHT-03. */
  readonly referenceId?: string;
  /** BHT-04. */
  readonly date?: string;
  /** BHT-05. */
  readonly time?: string;
  /** BHT-06. */
  readonly transactionTypeCode?: string;
}

/**
 * One hierarchical level. HL-03 and HL-04 are written as given; HL-01 and HL-02
 * are computed from where the level sits in `levels`.
 *
 * @example
 * ```ts
 * import type { Build277RfaiLevelSpec } from "@cosyte/x12";
 * const level: Build277RfaiLevelSpec = { levelCode: "20", childCode: "1", children: [] };
 * ```
 */
export interface Build277RfaiLevelSpec {
  /** HL-03, the hierarchical level code. */
  readonly levelCode: string;
  /** HL-04, the hierarchical child code. Omitted from the HL when absent. */
  readonly childCode?: string;
  /** The NM1 of each name loop under this level, written before its requests. */
  readonly entities?: readonly Build277RfaiEntitySpec[];
  /** The claim-level requests under this level. */
  readonly requests?: readonly Build277RfaiRequestSpec[];
  /** The levels subordinate to this one, written after it. */
  readonly children?: readonly Build277RfaiLevelSpec[];
}

/**
 * One NM1. Every element written as given.
 *
 * @example
 * ```ts
 * import type { Build277RfaiEntitySpec } from "@cosyte/x12";
 * const patient: Build277RfaiEntitySpec = {
 *   entityIdentifierCode: "QC", entityTypeQualifier: "1",
 *   lastOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001",
 * };
 * ```
 */
export interface Build277RfaiEntitySpec {
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
 * One claim-level request: the TRN that opens it and what is sent under it.
 *
 * @example
 * ```ts
 * import type { Build277RfaiRequestSpec } from "@cosyte/x12";
 * const request: Build277RfaiRequestSpec = {
 *   trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
 *   references: [{ qualifier: "1K", value: "PCN0001" }],
 *   statuses: [{ codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }] }],
 * };
 * ```
 */
export interface Build277RfaiRequestSpec {
  /** The TRN. Required: the base 006020 277 opens this loop with one. */
  readonly trace: Build277RfaiTraceSpec;
  /** Each STC, written after the TRN. */
  readonly statuses?: readonly Build277RfaiStatusSpec[];
  /** Each REF. */
  readonly references?: readonly Build277RfaiReferenceSpec[];
  /** Each DTP. */
  readonly dates?: readonly Build277RfaiDateSpec[];
  /** Each QTY. */
  readonly quantities?: readonly Build277RfaiQuantitySpec[];
  /** Each AMT. */
  readonly amounts?: readonly Build277RfaiAmountSpec[];
  /** Each service line, written after everything above. */
  readonly serviceLines?: readonly Build277RfaiServiceLineSpec[];
}

/**
 * One TRN.
 *
 * @example
 * ```ts
 * import type { Build277RfaiTraceSpec } from "@cosyte/x12";
 * const trace: Build277RfaiTraceSpec = { traceTypeCode: "1", referenceId: "TRACE-0001" };
 * ```
 */
export interface Build277RfaiTraceSpec {
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
 * One STC. `codes` are written to STC-01, STC-10 and STC-11 in that order, so
 * it holds one to three composites.
 *
 * @example
 * ```ts
 * import type { Build277RfaiStatusSpec } from "@cosyte/x12";
 * const status: Build277RfaiStatusSpec = {
 *   codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }],
 *   statusEffectiveDate: "20260601",
 * };
 * ```
 */
export interface Build277RfaiStatusSpec {
  /** The C043 composites, STC-01 first. At least one. */
  readonly codes: readonly Build277RfaiStatusCodeSpec[];
  /** STC-02. */
  readonly statusEffectiveDate?: string;
  /** STC-03. */
  readonly actionCode?: string;
  /** STC-04. */
  readonly totalChargeAmount?: X12Decimal;
  /** STC-05. */
  readonly paymentAmount?: X12Decimal;
  /** STC-06. */
  readonly paymentDate?: string;
  /** STC-07. */
  readonly paymentMethodCode?: string;
  /** STC-08. */
  readonly checkIssueDate?: string;
  /** STC-09. */
  readonly checkNumber?: string;
  /** STC-12. */
  readonly message?: string;
}

/**
 * One C043 composite, all four components written verbatim.
 *
 * @example
 * ```ts
 * import type { Build277RfaiStatusCodeSpec } from "@cosyte/x12";
 * const code: Build277RfaiStatusCodeSpec = {
 *   categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI",
 * };
 * ```
 */
export interface Build277RfaiStatusCodeSpec {
  /** C043-01. Refused when empty. */
  readonly categoryCode: string;
  /** C043-02. Refused when empty. */
  readonly statusCode: string;
  /** C043-03. */
  readonly entityCode?: string;
  /** C043-04, naming the code source of C043-02. */
  readonly codeListQualifier?: string;
}

/**
 * One REF.
 *
 * @example
 * ```ts
 * import type { Build277RfaiReferenceSpec } from "@cosyte/x12";
 * const pcn: Build277RfaiReferenceSpec = { qualifier: "1K", value: "PCN0001" };
 * ```
 */
export interface Build277RfaiReferenceSpec {
  /** REF-01. */
  readonly qualifier: string;
  /** REF-02. */
  readonly value: string;
  /** REF-03. */
  readonly description?: string;
}

/**
 * One DTP, the value written exactly as given.
 *
 * @example
 * ```ts
 * import type { Build277RfaiDateSpec } from "@cosyte/x12";
 * const service: Build277RfaiDateSpec = { qualifier: "472", formatQualifier: "D8", value: "20260501" };
 * ```
 */
export interface Build277RfaiDateSpec {
  /** DTP-01. */
  readonly qualifier: string;
  /** DTP-02. */
  readonly formatQualifier: string;
  /** DTP-03. */
  readonly value: string;
}

/**
 * One QTY.
 *
 * @example
 * ```ts
 * import { X12Decimal, type Build277RfaiQuantitySpec } from "@cosyte/x12";
 * const quantity: Build277RfaiQuantitySpec = { qualifier: "90", quantity: X12Decimal.fromString("1")! };
 * ```
 */
export interface Build277RfaiQuantitySpec {
  /** QTY-01. */
  readonly qualifier: string;
  /** QTY-02. */
  readonly quantity: X12Decimal;
}

/**
 * One AMT.
 *
 * @example
 * ```ts
 * import { X12Decimal, type Build277RfaiAmountSpec } from "@cosyte/x12";
 * const amount: Build277RfaiAmountSpec = { qualifier: "T3", amount: X12Decimal.fromString("150.00")! };
 * ```
 */
export interface Build277RfaiAmountSpec {
  /** AMT-01. */
  readonly qualifier: string;
  /** AMT-02. */
  readonly amount: X12Decimal;
}

/**
 * One service line: its SVC and the STC, REF and DTP segments sent under it.
 *
 * @example
 * ```ts
 * import type { Build277RfaiServiceLineSpec } from "@cosyte/x12";
 * const line: Build277RfaiServiceLineSpec = {
 *   service: { serviceIdQualifier: "HC", procedureCode: "99213" },
 *   statuses: [{ codes: [{ categoryCode: "R4", statusCode: "11506-3", codeListQualifier: "LOI" }] }],
 * };
 * ```
 */
export interface Build277RfaiServiceLineSpec {
  /** The SVC. Required: the base 006020 277 opens this loop with one. */
  readonly service: Build277RfaiServiceSpec;
  /** Each STC under the line. */
  readonly statuses?: readonly Build277RfaiStatusSpec[];
  /** Each REF under the line. */
  readonly references?: readonly Build277RfaiReferenceSpec[];
  /** Each DTP under the line. */
  readonly dates?: readonly Build277RfaiDateSpec[];
}

/**
 * The SVC elements this builder writes. SVC-06 is not written.
 *
 * @example
 * ```ts
 * import type { Build277RfaiServiceSpec } from "@cosyte/x12";
 * const svc: Build277RfaiServiceSpec = { serviceIdQualifier: "HC", procedureCode: "99213", modifiers: ["25"] };
 * ```
 */
export interface Build277RfaiServiceSpec {
  /** SVC-01-1. */
  readonly serviceIdQualifier: string;
  /** SVC-01-2. */
  readonly procedureCode: string;
  /** SVC-01-3 to SVC-01-6. */
  readonly modifiers?: readonly string[];
  /** SVC-02. */
  readonly lineChargeAmount?: X12Decimal;
  /** SVC-03. */
  readonly linePaymentAmount?: X12Decimal;
  /** SVC-04. */
  readonly revenueCode?: string;
  /** SVC-05. */
  readonly quantity?: X12Decimal;
  /** SVC-07. */
  readonly unitsOfService?: X12Decimal;
}

/**
 * Spec types for the 276 domain builder ({@link "./build-276.js".build276}).
 * The spec mirrors the {@link "./status-inquiry-types.js".X12StatusInquiry}
 * read model, MINUS the read-only `hierarchies` and `warnings` arrays. The HL
 * spine is NEVER caller-supplied: the builder computes every HL-01 id, HL-02
 * parent pointer and HL-04 has-child flag from the nested informationSources /
 * receivers / providers / subscribers / (dependents) tree, so a structurally
 * inconsistent hierarchy is unrepresentable.
 *
 * Spec source: WPC TR3 `005010X212`. The builder emits segments in TR3 loop
 * order and round-trips back through `get276StatusInquiry`, so a well-formed
 * spec is reproduced field for field.
 */

import type { X12Decimal } from "../../decimal.js";

/**
 * Interchange, group and transaction identity for the built 276. Mirrors
 * {@link "./build-277-types.js".Build277EnvelopeSpec}; the builder fixes GS-01
 * to `"HR"` (Health Care Claim Status Request) and the version and release to
 * `"005010X212"`, so the caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build276EnvelopeSpec } from "@cosyte/x12";
 * const env: Build276EnvelopeSpec = {
 *   senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build276EnvelopeSpec {
  /** ISA-06 - interchange sender id (padded to 15 on emit). */
  readonly senderId: string;
  /** ISA-08 - interchange receiver id (padded to 15 on emit). */
  readonly receiverId: string;
  /** ISA-09 - interchange date YYMMDD. */
  readonly interchangeDate: string;
  /** ISA-10 - interchange time HHMM. */
  readonly interchangeTime: string;
  /** ISA-13 / IEA-02 - interchange control number (zero-padded to 9 on emit). */
  readonly interchangeControlNumber: string;
  /** GS-06 / GE-02 - group control number. */
  readonly groupControlNumber: string;
  /** ST-02 / SE-02 - transaction set control number. */
  readonly transactionSetControlNumber: string;
  /** ISA-05 - interchange sender qualifier. Default `"ZZ"`. */
  readonly senderQualifier?: string;
  /** ISA-07 - interchange receiver qualifier. Default `"ZZ"`. */
  readonly receiverQualifier?: string;
  /** ISA-15 - usage indicator (`P` production, `T` test). Default `"P"`. */
  readonly usageIndicator?: string;
  /** GS-02 - application sender code. Default: the interchange sender id. */
  readonly applicationSenderCode?: string;
  /** GS-03 - application receiver code. Default: the interchange receiver id. */
  readonly applicationReceiverCode?: string;
  /** GS-04 - group date CCYYMMDD. Default: century-expanded ISA-09. */
  readonly groupDate?: string;
  /** GS-05 - group time HHMM. Default: the interchange time. */
  readonly groupTime?: string;
  /** Element separator (ISA byte 4). Default `"*"`. */
  readonly elementSeparator?: string;
  /** Repetition separator (ISA-11). Default `"^"`. */
  readonly repetitionSeparator?: string;
  /** Component (sub-element) separator (ISA-16). Default `":"`. */
  readonly componentSeparator?: string;
  /** Segment terminator (ISA byte 106). Default `"~"`. */
  readonly segmentTerminator?: string;
}

/**
 * The BHT beginning-of-hierarchical-transaction header. Every field has a
 * builder default so a caller that has nothing to say about the header can omit
 * it, and the defaults are library constants or values already on the envelope:
 * nothing is invented out of the request's content.
 *
 * @example
 * ```ts
 * import type { Build276HeaderSpec } from "@cosyte/x12";
 * const h: Build276HeaderSpec = { referenceId: "STATUS-0001" };
 * ```
 */
export interface Build276HeaderSpec {
  /** BHT-01 - hierarchical structure code. Default `"0010"`. */
  readonly hierarchicalStructureCode?: string;
  /** BHT-02 - transaction set purpose code. Default `"13"` (request). */
  readonly purposeCode?: string;
  /** BHT-03 - submitter transaction identifier. */
  readonly referenceId?: string;
  /** BHT-04 - creation date CCYYMMDD. Default: the group date. */
  readonly date?: string;
  /** BHT-05 - creation time HHMM. Default: the group time. */
  readonly time?: string;
}

/**
 * An NM1 name loop, with the DMG demographics that follow it. Mirrors
 * {@link "./status-inquiry-types.js".X12StatusInquiryName}. One type for every
 * level, for the reason the read model gives: NM1-03 is "name last or
 * organization name" and the same segment carries both.
 *
 * @example
 * ```ts
 * import type { Build276NameSpec } from "@cosyte/x12";
 * const m: Build276NameSpec = {
 *   entityIdentifierCode: "IL", entityTypeQualifier: "1",
 *   lastNameOrOrganizationName: "DOE", firstName: "JANE",
 *   idQualifier: "MI", idCode: "MBR0001",
 * };
 * ```
 */
export interface Build276NameSpec {
  /** NM1-01 - entity identifier code (`PR` payer, `41` receiver, `1P` provider, `IL` insured, `QC` patient). */
  readonly entityIdentifierCode: string;
  /** NM1-02 - entity type qualifier (`1` person, `2` non-person). */
  readonly entityTypeQualifier: string;
  /** NM1-03 - last name, or the organization name for a non-person. */
  readonly lastNameOrOrganizationName?: string;
  /** NM1-04 - first name. */
  readonly firstName?: string;
  /** NM1-05 - middle name. */
  readonly middleName?: string;
  /** NM1-07 - name suffix. */
  readonly suffix?: string;
  /** NM1-08 - identification code qualifier. */
  readonly idQualifier?: string;
  /** NM1-09 - identification code. */
  readonly idCode?: string;
  /** DMG-02 - date of birth (emitted with DMG-01 = `D8`). */
  readonly dateOfBirth?: string;
  /** DMG-03 - gender code. */
  readonly genderCode?: string;
}

/**
 * A reassociation trace (TRN). TRN-02 is the value the answering 277 echoes
 * back verbatim. Mirrors
 * {@link "./status-inquiry-types.js".X12StatusInquiryTrace}.
 *
 * @example
 * ```ts
 * import type { Build276TraceSpec } from "@cosyte/x12";
 * const t: Build276TraceSpec = { traceTypeCode: "1", referenceId: "STATUS20260601001" };
 * ```
 */
export interface Build276TraceSpec {
  /** TRN-01 - trace type code. */
  readonly traceTypeCode: string;
  /** TRN-02 - reference identification. */
  readonly referenceId: string;
  /** TRN-03 - originating company identifier. */
  readonly originatingCompanyId?: string;
  /** TRN-04 - supplemental reference identifier. */
  readonly supplementalReferenceId?: string;
}

/**
 * A REF supplemental identifier. Mirrors
 * {@link "./status-inquiry-types.js".X12StatusInquiryReference}.
 *
 * @example
 * ```ts
 * import type { Build276ReferenceSpec } from "@cosyte/x12";
 * const r: Build276ReferenceSpec = { qualifier: "1K", value: "PCN0001" };
 * ```
 */
export interface Build276ReferenceSpec {
  /** REF-01 - reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 - reference identification. */
  readonly value: string;
  /** REF-03 - description. */
  readonly description?: string;
}

/**
 * An AMT amount row on a claim (e.g. `AMT*T3` total submitted charges).
 * Mirrors {@link "./status-inquiry-types.js".X12StatusInquiryAmount}.
 *
 * @example
 * ```ts
 * import { X12Decimal, type Build276AmountSpec } from "@cosyte/x12";
 * const a: Build276AmountSpec = { qualifier: "T3", amount: X12Decimal.fromString("150.00")! };
 * ```
 */
export interface Build276AmountSpec {
  /** AMT-01 - amount qualifier code. */
  readonly qualifier: string;
  /** AMT-02 - the monetary amount, NEVER a JavaScript `number`. */
  readonly amount: X12Decimal;
}

/**
 * A DTP date or date range. `formatQualifier` (DTP-02) says which: `D8` is a
 * single date, `RD8` a range. Mirrors
 * {@link "./status-inquiry-types.js".X12StatusInquiryDate}.
 *
 * @example
 * ```ts
 * import type { Build276DateSpec } from "@cosyte/x12";
 * const d: Build276DateSpec = { qualifier: "472", formatQualifier: "D8", value: "20260520" };
 * ```
 */
export interface Build276DateSpec {
  /** DTP-01 - date/time qualifier. */
  readonly qualifier: string;
  /** DTP-02 - date/time period format qualifier. */
  readonly formatQualifier: string;
  /** DTP-03 - the date or range. */
  readonly value: string;
}

/**
 * The SVC-01 composite medical procedure identifier, supplied as its separated
 * components. The builder joins them with the declared component separator, so
 * a caller never hand-codes a delimiter. Mirrors
 * {@link "./status-inquiry-types.js".X12StatusInquiryProcedure}.
 *
 * @example
 * ```ts
 * import type { Build276ProcedureSpec } from "@cosyte/x12";
 * const p: Build276ProcedureSpec = { qualifier: "HC", code: "99213", modifiers: ["25"] };
 * ```
 */
export interface Build276ProcedureSpec {
  /** SVC-01-1 - product or service id qualifier. */
  readonly qualifier: string;
  /** SVC-01-2 - the procedure code. */
  readonly code?: string;
  /** SVC-01-3 through SVC-01-6 - procedure modifiers, in order. */
  readonly modifiers?: readonly string[];
  /** SVC-01-7 - procedure description. */
  readonly description?: string;
}

/**
 * One service line the request asks about (Loop 2210). A line that identifies
 * nothing - no procedure and no revenue code - is refused rather than emitted:
 * an SVC that names no service is a question no payer can answer.
 *
 * @example
 * ```ts
 * import { X12Decimal, type Build276ServiceLineSpec } from "@cosyte/x12";
 * const l: Build276ServiceLineSpec = {
 *   procedure: { qualifier: "HC", code: "99213" },
 *   lineChargeAmount: X12Decimal.fromString("150.00")!,
 * };
 * ```
 */
export interface Build276ServiceLineSpec {
  /** SVC-01 - the billed procedure, as separated components. */
  readonly procedure?: Build276ProcedureSpec;
  /** SVC-02 - line item charge amount. */
  readonly lineChargeAmount?: X12Decimal;
  /** SVC-04 - revenue code. */
  readonly revenueCode?: string;
  /** SVC-07 - units of service count. */
  readonly unitsOfService?: X12Decimal;
  /** REF identifiers under this service line. */
  readonly references?: readonly Build276ReferenceSpec[];
  /** DTP dates under this service line. */
  readonly dates?: readonly Build276DateSpec[];
}

/**
 * One claim the submitter is asking about (Loop 2200). The trace is REQUIRED:
 * a TRN is what opens the loop on read, so a claim without one would fold its
 * identifiers, amounts and dates into the claim before it.
 *
 * @example
 * ```ts
 * import type { Build276ClaimSpec } from "@cosyte/x12";
 * const c: Build276ClaimSpec = {
 *   trace: { traceTypeCode: "1", referenceId: "STATUS0001" },
 *   references: [{ qualifier: "1K", value: "PCN0001" }],
 * };
 * ```
 */
export interface Build276ClaimSpec {
  /** Loop 2200 TRN. Required: a claim with no trace is refused. */
  readonly trace: Build276TraceSpec;
  /** Loop 2200 REF identifiers. */
  readonly references?: readonly Build276ReferenceSpec[];
  /** Loop 2200 AMT amount rows. */
  readonly amounts?: readonly Build276AmountSpec[];
  /** Loop 2200 DTP dates. */
  readonly dates?: readonly Build276DateSpec[];
  /** Loop 2210 service lines. */
  readonly serviceLines?: readonly Build276ServiceLineSpec[];
}

/**
 * One dependent (Loop 2000E / 2100E / 2200E) - a patient who cannot be
 * identified as a subscriber in their own right. Carries its OWN name and
 * claims. Mirrors
 * {@link "./status-inquiry-types.js".X12StatusInquiryDependent}.
 *
 * @example
 * ```ts
 * import type { Build276DependentSpec } from "@cosyte/x12";
 * const d: Build276DependentSpec = {
 *   name: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "BABY" },
 *   claims: [{ trace: { traceTypeCode: "1", referenceId: "STATUS0002" } }],
 * };
 * ```
 */
export interface Build276DependentSpec {
  /** Loop 2100E dependent name. Required: a level with no name is refused. */
  readonly name: Build276NameSpec;
  /** Loop 2200E claims. At least one is required. */
  readonly claims: readonly Build276ClaimSpec[];
}

/**
 * One subscriber (Loop 2000D / 2100D / 2200D). Mirrors
 * {@link "./status-inquiry-types.js".X12StatusInquirySubscriber}.
 *
 * @example
 * ```ts
 * import type { Build276SubscriberSpec } from "@cosyte/x12";
 * const s: Build276SubscriberSpec = {
 *   name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE" },
 *   claims: [{ trace: { traceTypeCode: "1", referenceId: "STATUS0001" } }],
 * };
 * ```
 */
export interface Build276SubscriberSpec {
  /** Loop 2100D subscriber name. Required: a level with no name is refused. */
  readonly name: Build276NameSpec;
  /**
   * Loop 2200D claims. At least one is required UNLESS this subscriber carries
   * dependents, in which case the claim may sit on the dependent instead and
   * the subscriber is the identifying level only.
   */
  readonly claims?: readonly Build276ClaimSpec[];
  /** Loop 2000E dependents (a non-empty list sets the subscriber HL-04 to `"1"`). */
  readonly dependents?: readonly Build276DependentSpec[];
}

/**
 * One service provider (Loop 2000C / 2100C) - the provider whose claim is being
 * asked about. This level is the one the 270's spine does not have.
 *
 * @example
 * ```ts
 * import type { Build276ProviderSpec } from "@cosyte/x12";
 * const p: Build276ProviderSpec = {
 *   name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC" },
 *   subscribers: [],
 * };
 * ```
 */
export interface Build276ProviderSpec {
  /** Loop 2100C provider name. */
  readonly name: Build276NameSpec;
  /** Loop 2000D subscribers (at least one required - a provider with none is refused). */
  readonly subscribers: readonly Build276SubscriberSpec[];
}

/**
 * One information receiver (Loop 2000B / 2100B) - the party the answer goes
 * back to.
 *
 * @example
 * ```ts
 * import type { Build276InformationReceiverSpec } from "@cosyte/x12";
 * const r: Build276InformationReceiverSpec = {
 *   name: { entityIdentifierCode: "41", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC" },
 *   providers: [],
 * };
 * ```
 */
export interface Build276InformationReceiverSpec {
  /** Loop 2100B information-receiver name. */
  readonly name: Build276NameSpec;
  /** Loop 2000C service providers (at least one required - a receiver with none is refused). */
  readonly providers: readonly Build276ProviderSpec[];
}

/**
 * One information source (Loop 2000A / 2100A) - the payer being asked.
 *
 * @example
 * ```ts
 * import type { Build276InformationSourceSpec } from "@cosyte/x12";
 * const src: Build276InformationSourceSpec = {
 *   name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE" },
 *   receivers: [],
 * };
 * ```
 */
export interface Build276InformationSourceSpec {
  /** Loop 2100A information-source name. */
  readonly name: Build276NameSpec;
  /** Loop 2000B receivers (at least one required - a source with none is refused). */
  readonly receivers: readonly Build276InformationReceiverSpec[];
}

/**
 * The complete spec for {@link "./build-276.js".build276}: the envelope, an
 * optional BHT header, and the nested informationSources / receivers /
 * providers / subscribers / (dependents) tree the builder walks depth-first to
 * compute the HL spine.
 *
 * @example
 * ```ts
 * import { build276, type Build276Spec } from "@cosyte/x12";
 * const spec: Build276Spec = {
 *   envelope: {
 *     senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   informationSources: [{
 *     name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "PAYER01" },
 *     receivers: [{
 *       name: { entityIdentifierCode: "41", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "46", idCode: "RECVR01" },
 *       providers: [{
 *         name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *         subscribers: [{
 *           name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
 *           claims: [{ trace: { traceTypeCode: "1", referenceId: "STATUS0001" } }],
 *         }],
 *       }],
 *     }],
 *   }],
 * };
 * const ix = build276(spec);
 * ```
 */
export interface Build276Spec {
  /** Interchange, group and transaction identity. */
  readonly envelope: Build276EnvelopeSpec;
  /** The BHT header. Every field defaults; the whole object may be omitted. */
  readonly header?: Build276HeaderSpec;
  /** Loop 2000A information sources (at least one required). */
  readonly informationSources: readonly Build276InformationSourceSpec[];
}

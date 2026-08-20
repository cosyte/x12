/**
 * Spec types for the 270 domain builder ({@link "./build-270.js".build270}).
 * The spec mirrors the {@link "./inquiry-types.js".X12Inquiry} read model,
 * MINUS the fields `get270Inquiry` DERIVES (each service type's
 * `description`, resolved from the bundled snapshot) and minus the read-only
 * `hierarchies` and `warnings` arrays. The HL spine is NEVER caller-supplied:
 * the builder computes every HL-01 id, HL-02 parent pointer and HL-04
 * has-child flag from the nested informationSources / receivers /
 * subscribers / (dependents) tree, so a structurally inconsistent hierarchy is
 * unrepresentable.
 *
 * Spec source: WPC TR3 `005010X279A1`. The builder emits segments in TR3 loop
 * order and round-trips back through `get270Inquiry`, so a well-formed spec is
 * reproduced field for field.
 */

/**
 * Interchange, group and transaction identity for the built 270. Mirrors
 * {@link "./build-271-types.js".Build271EnvelopeSpec}; the builder fixes GS-01
 * to `"HS"` (Eligibility, Coverage or Benefit Inquiry) and the version and
 * release to `"005010X279A1"`, so the caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build270EnvelopeSpec } from "@cosyte/x12";
 * const env: Build270EnvelopeSpec = {
 *   senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build270EnvelopeSpec {
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
 * builder default so a caller that has nothing to say about the header can
 * omit it, and the defaults are library constants or values already on the
 * envelope: nothing is invented out of the inquiry's content.
 *
 * @example
 * ```ts
 * import type { Build270HeaderSpec } from "@cosyte/x12";
 * const h: Build270HeaderSpec = { referenceId: "REQ-0001" };
 * ```
 */
export interface Build270HeaderSpec {
  /** BHT-01 - hierarchical structure code. Default `"0022"`. */
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
 * An NM1 name loop, with the N3 / N4 address and DMG demographics that follow
 * it. Mirrors {@link "./inquiry-types.js".X12InquiryName}. One type for every
 * level, for the reason the read model gives: NM1-03 is "name last or
 * organization name" and the same segment carries both.
 *
 * @example
 * ```ts
 * import type { Build270NameSpec } from "@cosyte/x12";
 * const m: Build270NameSpec = {
 *   entityIdentifierCode: "IL", entityTypeQualifier: "1",
 *   lastNameOrOrganizationName: "DOE", firstName: "JANE",
 *   idQualifier: "MI", idCode: "MBR0001",
 * };
 * ```
 */
export interface Build270NameSpec {
  /** NM1-01 - entity identifier code (`PR` payer, `1P` provider, `IL` insured, `03` dependent). */
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
  /** N3 + N4 postal address. */
  readonly address?: Build270AddressSpec;
  /** DMG-02 - date of birth (emitted with DMG-01 = `D8`). */
  readonly dateOfBirth?: string;
  /** DMG-03 - gender code. */
  readonly genderCode?: string;
}

/**
 * A postal address (N3 + N4). Mirrors
 * {@link "./inquiry-types.js".X12InquiryAddress}.
 *
 * @example
 * ```ts
 * import type { Build270AddressSpec } from "@cosyte/x12";
 * const a: Build270AddressSpec = { lines: ["100 MAIN ST"], city: "COLUMBUS", state: "OH" };
 * ```
 */
export interface Build270AddressSpec {
  /** N3 address lines (1-2). */
  readonly lines: readonly string[];
  /** N4-01 - city. */
  readonly city?: string;
  /** N4-02 - state or province. */
  readonly state?: string;
  /** N4-03 - postal code. */
  readonly postalCode?: string;
  /** N4-04 - country code. */
  readonly countryCode?: string;
}

/**
 * A reassociation trace (TRN). TRN-02 is the value the answering 271 echoes
 * back verbatim. Mirrors {@link "./inquiry-types.js".X12InquiryTrace}.
 *
 * @example
 * ```ts
 * import type { Build270TraceSpec } from "@cosyte/x12";
 * const t: Build270TraceSpec = { traceTypeCode: "1", referenceId: "ELIG20260601001" };
 * ```
 */
export interface Build270TraceSpec {
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
 * {@link "./inquiry-types.js".X12InquiryReference}.
 *
 * @example
 * ```ts
 * import type { Build270ReferenceSpec } from "@cosyte/x12";
 * const r: Build270ReferenceSpec = { qualifier: "6P", value: "GROUP0001" };
 * ```
 */
export interface Build270ReferenceSpec {
  /** REF-01 - reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 - reference identification. */
  readonly value: string;
  /** REF-03 - description. */
  readonly description?: string;
}

/**
 * A DTP date or date range. `formatQualifier` (DTP-02) says which: `D8` is a
 * single date, `RD8` a range. Mirrors
 * {@link "./inquiry-types.js".X12InquiryDate}.
 *
 * @example
 * ```ts
 * import type { Build270DateSpec } from "@cosyte/x12";
 * const d: Build270DateSpec = { qualifier: "291", formatQualifier: "D8", value: "20260601" };
 * ```
 */
export interface Build270DateSpec {
  /** DTP-01 - date/time qualifier. */
  readonly qualifier: string;
  /** DTP-02 - date/time period format qualifier. */
  readonly formatQualifier: string;
  /** DTP-03 - the date or range. */
  readonly value: string;
}

/**
 * One requested Service Type Code (EQ-01). Only the verbatim `code` is
 * supplied: the read side looks up its description from the bundled snapshot,
 * so the spec deliberately omits it.
 *
 * @example
 * ```ts
 * import type { Build270ServiceTypeSpec } from "@cosyte/x12";
 * const st: Build270ServiceTypeSpec = { code: "30" };
 * ```
 */
export interface Build270ServiceTypeSpec {
  /** EQ-01 - a single Service Type Code. */
  readonly code: string;
}

/**
 * The EQ-02 composite medical procedure identifier, supplied as its separated
 * components. The builder joins them with the declared component separator, so
 * a caller never hand-codes a delimiter. Mirrors
 * {@link "./inquiry-types.js".X12InquiryProcedure}.
 *
 * @example
 * ```ts
 * import type { Build270ProcedureSpec } from "@cosyte/x12";
 * const p: Build270ProcedureSpec = { qualifier: "HC", code: "99213", modifiers: ["25"] };
 * ```
 */
export interface Build270ProcedureSpec {
  /** EQ-02-1 - product or service id qualifier. */
  readonly qualifier: string;
  /** EQ-02-2 - the procedure code. */
  readonly code?: string;
  /** EQ-02-3 through EQ-02-6 - procedure modifiers, in order. */
  readonly modifiers?: readonly string[];
  /** EQ-02-7 - procedure description. */
  readonly description?: string;
}

/**
 * One eligibility or benefit inquiry (`EQ`, Loop 2110C / 2110D) - a single
 * thing being asked. At least one Service Type Code or a procedure is
 * required: an EQ that asks nothing is refused rather than emitted. Mirrors
 * {@link "./inquiry-types.js".X12InquiryRequest} minus each service type's
 * derived description.
 *
 * @example
 * ```ts
 * import type { Build270InquirySpec } from "@cosyte/x12";
 * const q: Build270InquirySpec = {
 *   serviceTypeCodes: [{ code: "30" }], coverageLevelCode: "IND",
 * };
 * ```
 */
export interface Build270InquirySpec {
  /** EQ-01 - one or more requested Service Type Codes (a repeating element). */
  readonly serviceTypeCodes?: readonly Build270ServiceTypeSpec[];
  /** EQ-02 - the requested procedure, as separated components. */
  readonly procedure?: Build270ProcedureSpec;
  /** EQ-03 - coverage level code. */
  readonly coverageLevelCode?: string;
  /** EQ-04 - insurance type code. */
  readonly insuranceTypeCode?: string;
  /** EQ-05 - diagnosis code pointers, as separated components. */
  readonly diagnosisCodePointers?: readonly string[];
  /** REF identifiers under this inquiry. */
  readonly references?: readonly Build270ReferenceSpec[];
  /** DTP dates under this inquiry. */
  readonly dates?: readonly Build270DateSpec[];
}

/**
 * One dependent (Loop 2000D / 2100D / 2110D) - a patient who cannot be
 * identified as a subscriber in their own right. Carries its OWN name, traces
 * and inquiries. Mirrors {@link "./inquiry-types.js".X12InquiryDependent}.
 *
 * @example
 * ```ts
 * import type { Build270DependentSpec } from "@cosyte/x12";
 * const d: Build270DependentSpec = {
 *   name: { entityIdentifierCode: "03", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "BABY" },
 *   inquiries: [{ serviceTypeCodes: [{ code: "35" }] }],
 * };
 * ```
 */
export interface Build270DependentSpec {
  /** Loop 2000D TRN reassociation traces. */
  readonly traces?: readonly Build270TraceSpec[];
  /** Loop 2100D dependent name. Required: a level with no name is refused. */
  readonly name: Build270NameSpec;
  /** Loop 2100D REF identifiers. */
  readonly references?: readonly Build270ReferenceSpec[];
  /** Loop 2100D DTP dates. */
  readonly dates?: readonly Build270DateSpec[];
  /** Loop 2110D inquiries. At least one is required. */
  readonly inquiries: readonly Build270InquirySpec[];
}

/**
 * One subscriber (Loop 2000C / 2100C / 2110C). Mirrors
 * {@link "./inquiry-types.js".X12InquirySubscriber}.
 *
 * @example
 * ```ts
 * import type { Build270SubscriberSpec } from "@cosyte/x12";
 * const s: Build270SubscriberSpec = {
 *   traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
 *   name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE" },
 *   inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
 * };
 * ```
 */
export interface Build270SubscriberSpec {
  /** Loop 2000C TRN reassociation traces. */
  readonly traces?: readonly Build270TraceSpec[];
  /** Loop 2100C subscriber name. Required: a level with no name is refused. */
  readonly name: Build270NameSpec;
  /** Loop 2100C REF identifiers. */
  readonly references?: readonly Build270ReferenceSpec[];
  /** Loop 2100C DTP dates. */
  readonly dates?: readonly Build270DateSpec[];
  /**
   * Loop 2110C inquiries. At least one is required UNLESS this subscriber
   * carries dependents, in which case the inquiry may sit on the dependent
   * instead and the subscriber is the identifying level only.
   */
  readonly inquiries?: readonly Build270InquirySpec[];
  /** Loop 2000D dependents (a non-empty list sets the subscriber HL-04 to `"1"`). */
  readonly dependents?: readonly Build270DependentSpec[];
}

/**
 * One information receiver (Loop 2000B / 2100B) - the provider asking.
 *
 * @example
 * ```ts
 * import type { Build270InformationReceiverSpec } from "@cosyte/x12";
 * const r: Build270InformationReceiverSpec = {
 *   name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC" },
 *   subscribers: [],
 * };
 * ```
 */
export interface Build270InformationReceiverSpec {
  /** Loop 2100B information-receiver name. */
  readonly name: Build270NameSpec;
  /** Loop 2100B REF identifiers. */
  readonly references?: readonly Build270ReferenceSpec[];
  /** Loop 2000C subscribers (at least one required - a receiver with none is refused). */
  readonly subscribers: readonly Build270SubscriberSpec[];
}

/**
 * One information source (Loop 2000A / 2100A) - the payer being asked.
 *
 * @example
 * ```ts
 * import type { Build270InformationSourceSpec } from "@cosyte/x12";
 * const src: Build270InformationSourceSpec = {
 *   name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE" },
 *   receivers: [],
 * };
 * ```
 */
export interface Build270InformationSourceSpec {
  /** Loop 2100A information-source name. */
  readonly name: Build270NameSpec;
  /** Loop 2100A REF identifiers. */
  readonly references?: readonly Build270ReferenceSpec[];
  /** Loop 2000B receivers (at least one required - a source with none is refused). */
  readonly receivers: readonly Build270InformationReceiverSpec[];
}

/**
 * The complete spec for {@link "./build-270.js".build270}: the envelope, an
 * optional BHT header, and the nested informationSources / receivers /
 * subscribers / (dependents) tree the builder walks depth-first to compute the
 * HL spine.
 *
 * @example
 * ```ts
 * import { build270, type Build270Spec } from "@cosyte/x12";
 * const spec: Build270Spec = {
 *   envelope: {
 *     senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   informationSources: [{
 *     name: { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastNameOrOrganizationName: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "PAYER01" },
 *     receivers: [{
 *       name: { entityIdentifierCode: "1P", entityTypeQualifier: "2", lastNameOrOrganizationName: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *       subscribers: [{
 *         traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
 *         name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastNameOrOrganizationName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
 *         inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
 *       }],
 *     }],
 *   }],
 * };
 * const ix = build270(spec);
 * ```
 */
export interface Build270Spec {
  /** Interchange, group and transaction identity. */
  readonly envelope: Build270EnvelopeSpec;
  /** The BHT header. Every field defaults; the whole object may be omitted. */
  readonly header?: Build270HeaderSpec;
  /** Loop 2000A information sources (at least one required). */
  readonly informationSources: readonly Build270InformationSourceSpec[];
}

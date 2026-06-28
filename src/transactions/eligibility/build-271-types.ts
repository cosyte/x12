/**
 * Spec types for the 271 domain builder ({@link
 * "./build-271.js".build271}). The spec mirrors the {@link
 * "./types.js".X12Eligibility} read model, MINUS the fields
 * `get271Eligibility` *derives* (each service-type code's `description`,
 * resolved from the bundled snapshot) and minus the read-only `warnings` /
 * `hierarchies` arrays. The HL spine is NEVER caller-supplied — the builder
 * computes every HL-01 id, HL-02 parent pointer, and HL-04 has-child flag
 * from the nested informationSources → receivers → subscribers →
 * (dependents) tree.
 *
 * Money + percent + quantity are {@link "../../decimal.js".X12Decimal}
 * throughout — never `number` (float arithmetic destroys cents on a benefit
 * amount). Construct values with `X12Decimal.fromString("1000.00")`.
 *
 * Spec source: WPC TR3 `005010X279A1`. The builder emits segments in TR3
 * loop order and round-trips back through `get271Eligibility`, so a
 * well-formed spec is reproduced field-for-field.
 */

import type { X12Decimal } from "../../decimal.js";

/**
 * Interchange + group + transaction identity for the built 271. Mirrors the
 * {@link "../remit/build-835-types.js".Build835EnvelopeSpec}; the builder
 * fixes GS-01 to `"HB"` and the version/release to `"005010X279A1"` (the
 * 271 functional group + TR3) so the caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build271EnvelopeSpec } from "@cosyte/x12";
 * const env: Build271EnvelopeSpec = {
 *   senderId: "MEDPAY", receiverId: "PROVIDER",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build271EnvelopeSpec {
  /** ISA-06 — interchange sender id (padded to 15 on emit). */
  readonly senderId: string;
  /** ISA-08 — interchange receiver id (padded to 15 on emit). */
  readonly receiverId: string;
  /** ISA-09 — interchange date YYMMDD. */
  readonly interchangeDate: string;
  /** ISA-10 — interchange time HHMM. */
  readonly interchangeTime: string;
  /** ISA-13 / IEA-02 — interchange control number (zero-padded to 9 on emit). */
  readonly interchangeControlNumber: string;
  /** GS-06 / GE-02 — group control number. */
  readonly groupControlNumber: string;
  /** ST-02 / SE-02 — transaction set control number. */
  readonly transactionSetControlNumber: string;
  /** ISA-05 — interchange sender qualifier. Default `"ZZ"`. */
  readonly senderQualifier?: string;
  /** ISA-07 — interchange receiver qualifier. Default `"ZZ"`. */
  readonly receiverQualifier?: string;
  /** ISA-15 — usage indicator (`P` production, `T` test). Default `"P"`. */
  readonly usageIndicator?: string;
  /** GS-02 — application sender code. Default: the interchange sender id. */
  readonly applicationSenderCode?: string;
  /** GS-03 — application receiver code. Default: the interchange receiver id. */
  readonly applicationReceiverCode?: string;
  /** GS-04 — group date CCYYMMDD. Default: century-expanded ISA-09. */
  readonly groupDate?: string;
  /** GS-05 — group time HHMM. Default: the interchange time. */
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
 * A non-person entity (NM1) — the information-source payer (Loop 2100A) or
 * information-receiver provider (Loop 2100B), or a benefit-related entity
 * (Loop 2120C). Mirrors {@link "./types.js".X12EligibilityEntity}.
 *
 * @example
 * ```ts
 * import type { Build271EntitySpec } from "@cosyte/x12";
 * const payer: Build271EntitySpec = {
 *   entityIdentifierCode: "PR", entityTypeQualifier: "2",
 *   name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123",
 * };
 * ```
 */
export interface Build271EntitySpec {
  /** NM1-01 — entity identifier code (`PR` payer, `1P` provider, …). */
  readonly entityIdentifierCode: string;
  /** NM1-02 — entity type qualifier (`1` person, `2` non-person). */
  readonly entityTypeQualifier: string;
  /** NM1-03 — organization / last name. */
  readonly name: string;
  /** NM1-08 — identification code qualifier. */
  readonly idQualifier?: string;
  /** NM1-09 — identification code. */
  readonly idCode?: string;
}

/**
 * A postal address (N3 + N4) attached to a subscriber / dependent name.
 * Mirrors {@link "./types.js".X12EligibilityAddress}.
 *
 * @example
 * ```ts
 * import type { Build271AddressSpec } from "@cosyte/x12";
 * const a: Build271AddressSpec = {
 *   lines: ["123 MAIN ST"], city: "ANYTOWN", state: "CA", postalCode: "90001",
 * };
 * ```
 */
export interface Build271AddressSpec {
  /** N3 address lines (1-2). */
  readonly lines: readonly string[];
  /** N4-01 — city. */
  readonly city?: string;
  /** N4-02 — state / province. */
  readonly state?: string;
  /** N4-03 — postal code. */
  readonly postalCode?: string;
  /** N4-04 — country code. */
  readonly countryCode?: string;
}

/**
 * A person (subscriber Loop 2100C / dependent Loop 2100D) decoded from
 * NM1 + the optional DMG demographics + N3/N4 address. `idCode` is the
 * member identifier (NM1-09) — synthetic-only in fixtures. Mirrors {@link
 * "./types.js".X12EligibilityMember}.
 *
 * @example
 * ```ts
 * import type { Build271MemberSpec } from "@cosyte/x12";
 * const m: Build271MemberSpec = {
 *   entityIdentifierCode: "IL", entityTypeQualifier: "1",
 *   lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001",
 *   dateOfBirth: "19800101", genderCode: "F",
 * };
 * ```
 */
export interface Build271MemberSpec {
  /** NM1-01 — entity identifier code (`IL` insured / subscriber, `03` dependent). */
  readonly entityIdentifierCode: string;
  /** NM1-02 — entity type qualifier (`1` person). */
  readonly entityTypeQualifier: string;
  /** NM1-03 — last name. */
  readonly lastName?: string;
  /** NM1-04 — first name. */
  readonly firstName?: string;
  /** NM1-05 — middle name. */
  readonly middleName?: string;
  /** NM1-07 — name suffix. */
  readonly suffix?: string;
  /** NM1-08 — identification code qualifier (`MI` member id). */
  readonly idQualifier?: string;
  /** NM1-09 — identification code (the member id). */
  readonly idCode?: string;
  /** N3 + N4 postal address. */
  readonly address?: Build271AddressSpec;
  /** DMG-02 — date of birth (CCYYMMDD; emitted with DMG-01 = `D8`). */
  readonly dateOfBirth?: string;
  /** DMG-03 — gender code (`M` / `F` / `U`). */
  readonly genderCode?: string;
}

/**
 * A reassociation trace (TRN). **The verbatim echo of the requesting 270's
 * trace number** — `referenceId` (TRN-02) is the value a provider matches
 * against the trace it sent. Mirrors {@link
 * "./types.js".X12EligibilityTrace}.
 *
 * @example
 * ```ts
 * import type { Build271TraceSpec } from "@cosyte/x12";
 * const t: Build271TraceSpec = { traceTypeCode: "2", referenceId: "ELIG20260627001" };
 * ```
 */
export interface Build271TraceSpec {
  /** TRN-01 — trace type code (`2` referenced — added by the payer in the 271). */
  readonly traceTypeCode: string;
  /** TRN-02 — reference identification (echoed verbatim from the 270). */
  readonly referenceId: string;
  /** TRN-03 — originating company identifier. */
  readonly originatingCompanyId?: string;
  /** TRN-04 — supplemental reference identifier. */
  readonly supplementalReferenceId?: string;
}

/**
 * A REF supplemental identifier on a subscriber, dependent, or benefit
 * line. Mirrors {@link "./types.js".X12EligibilityReference}.
 *
 * @example
 * ```ts
 * import type { Build271ReferenceSpec } from "@cosyte/x12";
 * const r: Build271ReferenceSpec = { qualifier: "6P", value: "GRP0001" };
 * ```
 */
export interface Build271ReferenceSpec {
  /** REF-01 — reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 — reference identification. */
  readonly value: string;
  /** REF-03 — description. */
  readonly description?: string;
}

/**
 * A DTP date / date-range on a subscriber, dependent, or benefit line.
 * Mirrors {@link "./types.js".X12EligibilityDate}.
 *
 * @example
 * ```ts
 * import type { Build271DateSpec } from "@cosyte/x12";
 * const d: Build271DateSpec = { qualifier: "307", formatQualifier: "D8", value: "20260101" };
 * ```
 */
export interface Build271DateSpec {
  /** DTP-01 — date/time qualifier. */
  readonly qualifier: string;
  /** DTP-02 — date/time format qualifier (`D8` / `RD8`). */
  readonly formatQualifier: string;
  /** DTP-03 — date/time value. */
  readonly value: string;
}

/**
 * One Service Type Code (EB-03, X12 external code source 1365). Only the
 * verbatim `code` is supplied — the read side looks up its `description`
 * from the bundled snapshot, so the spec deliberately omits it.
 *
 * @example
 * ```ts
 * import type { Build271ServiceTypeSpec } from "@cosyte/x12";
 * const st: Build271ServiceTypeSpec = { code: "30" };
 * ```
 */
export interface Build271ServiceTypeSpec {
  /** EB-03 — a single Service Type Code. */
  readonly code: string;
}

/**
 * One eligibility-or-benefit line (EB, Loop 2110C/2110D). EB-01 is the
 * eligibility code; EB-03 carries one-or-more Service Type Codes (emitted
 * as a repeating simple element). Monetary + percent + quantity are
 * {@link X12Decimal}. Mirrors {@link "./types.js".X12EligibilityBenefit}
 * minus each service type's derived `description`.
 *
 * @example
 * ```ts
 * import type { Build271BenefitSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const b: Build271BenefitSpec = {
 *   eligibilityCode: "1", coverageLevelCode: "IND",
 *   serviceTypeCodes: [{ code: "30" }], inPlanNetwork: "Y",
 *   monetaryAmount: X12Decimal.fromString("1000.00")!,
 * };
 * ```
 */
export interface Build271BenefitSpec {
  /** EB-01 — eligibility or benefit information code. */
  readonly eligibilityCode: string;
  /** EB-02 — coverage level code (`IND`, `FAM`, …). */
  readonly coverageLevelCode?: string;
  /** EB-03 — one-or-more Service Type Codes (emitted as a repeating element). */
  readonly serviceTypeCodes?: readonly Build271ServiceTypeSpec[];
  /** EB-04 — insurance type code. */
  readonly insuranceTypeCode?: string;
  /** EB-05 — plan coverage description. */
  readonly planCoverageDescription?: string;
  /** EB-06 — time period qualifier. */
  readonly timePeriodQualifier?: string;
  /** EB-07 — monetary amount. */
  readonly monetaryAmount?: X12Decimal;
  /** EB-08 — percent. */
  readonly percent?: X12Decimal;
  /** EB-09 — quantity qualifier. */
  readonly quantityQualifier?: string;
  /** EB-10 — quantity. */
  readonly quantity?: X12Decimal;
  /** EB-11 — authorization / certification indicator. */
  readonly authorizationRequired?: string;
  /** EB-12 — in-plan-network indicator (`Y` / `N` / `U` / `W`). */
  readonly inPlanNetwork?: string;
  /** Loop 2120 benefit-related REF identifiers. */
  readonly references?: readonly Build271ReferenceSpec[];
  /** Loop 2120 benefit-related DTP dates. */
  readonly dates?: readonly Build271DateSpec[];
  /** MSG free-form benefit messages. */
  readonly messages?: readonly string[];
  /** Loop 2120C/D benefit-related entities (NM1). */
  readonly relatedEntities?: readonly Build271EntitySpec[];
}

/**
 * One dependent (Loop 2000D / 2100D) — a patient who is not the subscriber.
 * Same benefit-bearing shape as a subscriber minus the nested dependents.
 * Mirrors {@link "./types.js".X12EligibilityDependent}.
 *
 * @example
 * ```ts
 * import type { Build271DependentSpec } from "@cosyte/x12";
 * const d: Build271DependentSpec = {
 *   name: { entityIdentifierCode: "03", entityTypeQualifier: "1", lastName: "DOE", firstName: "JUNIOR" },
 *   benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND" }],
 * };
 * ```
 */
export interface Build271DependentSpec {
  /** Loop 2000D TRN reassociation traces. */
  readonly traces?: readonly Build271TraceSpec[];
  /** Loop 2100D dependent name (NM1 + DMG + N3/N4). */
  readonly name?: Build271MemberSpec;
  /** Loop 2100D REF identifiers. */
  readonly references?: readonly Build271ReferenceSpec[];
  /** Loop 2100D DTP dates. */
  readonly dates?: readonly Build271DateSpec[];
  /** Loop 2110D eligibility / benefit lines. */
  readonly benefits?: readonly Build271BenefitSpec[];
}

/**
 * One subscriber (Loop 2000C / 2100C). Holds the echoed TRN traces, the
 * subscriber name + demographics, the eligibility/benefit lines, and any
 * non-subscriber dependents. Mirrors {@link
 * "./types.js".X12EligibilitySubscriber}.
 *
 * @example
 * ```ts
 * import type { Build271SubscriberSpec } from "@cosyte/x12";
 * const s: Build271SubscriberSpec = {
 *   traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
 *   name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
 *   benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND" }],
 * };
 * ```
 */
export interface Build271SubscriberSpec {
  /** Loop 2000C TRN reassociation traces. */
  readonly traces?: readonly Build271TraceSpec[];
  /** Loop 2100C subscriber name (NM1 + DMG + N3/N4). */
  readonly name?: Build271MemberSpec;
  /** Loop 2100C REF identifiers. */
  readonly references?: readonly Build271ReferenceSpec[];
  /** Loop 2100C DTP dates. */
  readonly dates?: readonly Build271DateSpec[];
  /** Loop 2110C eligibility / benefit lines. */
  readonly benefits?: readonly Build271BenefitSpec[];
  /** Loop 2000D dependents (a non-empty list sets the subscriber HL-04 to `"1"`). */
  readonly dependents?: readonly Build271DependentSpec[];
}

/**
 * One information receiver (Loop 2000B / 2100B) — the provider that
 * requested eligibility. Carries the provider entity (NM1) and its
 * subscribers.
 *
 * @example
 * ```ts
 * import type { Build271InformationReceiverSpec } from "@cosyte/x12";
 * const r: Build271InformationReceiverSpec = {
 *   entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *   subscribers: [],
 * };
 * ```
 */
export interface Build271InformationReceiverSpec {
  /** Loop 2100B information-receiver provider entity (NM1). */
  readonly entity: Build271EntitySpec;
  /** Loop 2000C subscribers (at least one required — a receiver with none is refused). */
  readonly subscribers: readonly Build271SubscriberSpec[];
}

/**
 * One information source (Loop 2000A / 2100A) — the payer answering the
 * eligibility request. Carries the payer entity (NM1) and its receivers.
 *
 * @example
 * ```ts
 * import type { Build271InformationSourceSpec } from "@cosyte/x12";
 * const src: Build271InformationSourceSpec = {
 *   entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
 *   receivers: [],
 * };
 * ```
 */
export interface Build271InformationSourceSpec {
  /** Loop 2100A information-source payer entity (NM1). */
  readonly entity: Build271EntitySpec;
  /** Loop 2000B receivers (at least one required — a source with none is refused). */
  readonly receivers: readonly Build271InformationReceiverSpec[];
}

/**
 * The complete spec for {@link "./build-271.js".build271}: the envelope plus
 * the nested informationSources → receivers → subscribers → (dependents)
 * tree the builder walks depth-first to compute the HL spine.
 *
 * @example
 * ```ts
 * import { build271, X12Decimal, type Build271Spec } from "@cosyte/x12";
 * const spec: Build271Spec = {
 *   envelope: {
 *     senderId: "MEDPAY", receiverId: "PROVIDER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   informationSources: [{
 *     entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
 *     receivers: [{
 *       entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *       subscribers: [{
 *         traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
 *         name: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
 *         benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND", serviceTypeCodes: [{ code: "30" }], monetaryAmount: X12Decimal.fromString("1000.00")! }],
 *       }],
 *     }],
 *   }],
 * };
 * const ix = build271(spec);
 * ```
 */
export interface Build271Spec {
  /** Interchange + group + transaction identity. */
  readonly envelope: Build271EnvelopeSpec;
  /** Loop 2000A information sources (at least one required). */
  readonly informationSources: readonly Build271InformationSourceSpec[];
}

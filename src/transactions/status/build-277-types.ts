/**
 * Spec types for the 277 / 277CA domain builders ({@link
 * "./build-277.js".build277} / {@link "./build-277.js".build277CA}). The
 * spec mirrors the {@link "./types.js".X12ClaimStatusResponse} read model,
 * MINUS the fields the walker *derives* (each status code's
 * `categoryDescription` / `statusDescription`, resolved from the bundled
 * snapshots; `transactionType` + `implementationConventionReference`, fixed
 * per builder) and minus the read-only `warnings` / `hierarchies` arrays.
 * The HL spine is NEVER caller-supplied — the builder computes every HL-01
 * id, HL-02 parent pointer, and HL-04 has-child flag from the nested
 * informationSources → receivers → providers → subscribers → (dependents)
 * tree.
 *
 * Money is {@link "../../decimal.js".X12Decimal} throughout — never
 * `number`. Construct values with `X12Decimal.fromString("150.00")`.
 *
 * Spec source: WPC TR3s `005010X212` (277) + `005010X214` (277CA). The
 * builder emits segments in TR3 loop order and round-trips back through
 * `get277Status` / `get277CADisposition`, so a well-formed spec is
 * reproduced field-for-field.
 */

import type { X12Decimal } from "../../decimal.js";

/**
 * Interchange + group + transaction identity for the built 277 / 277CA.
 * Mirrors the {@link "../remit/build-835-types.js".Build835EnvelopeSpec};
 * the builder fixes GS-01 to `"HN"` and ST-01 to `"277"`. ST-03 / GS-08 are
 * the version supplied by the builder entry point (`005010X212` for
 * {@link "./build-277.js".build277}, `005010X214` for
 * {@link "./build-277.js".build277CA}) so the caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build277EnvelopeSpec } from "@cosyte/x12";
 * const env: Build277EnvelopeSpec = {
 *   senderId: "MEDPAY", receiverId: "PROVIDER",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build277EnvelopeSpec {
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
 * A non-person entity (NM1) — the information-source payer (Loop 2100A),
 * information receiver (2100B), or service provider (2100C). Mirrors {@link
 * "./types.js".X12StatusEntity}.
 *
 * @example
 * ```ts
 * import type { Build277EntitySpec } from "@cosyte/x12";
 * const payer: Build277EntitySpec = {
 *   entityIdentifierCode: "PR", entityTypeQualifier: "2",
 *   name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123",
 * };
 * ```
 */
export interface Build277EntitySpec {
  /** NM1-01 — entity identifier code (`PR` payer, `41` receiver, `1P` provider). */
  readonly entityIdentifierCode: string;
  /** NM1-02 — entity type qualifier (`1` person, `2` non-person). */
  readonly entityTypeQualifier: string;
  /** NM1-03 — organization name. */
  readonly name: string;
  /** NM1-08 — identification code qualifier. */
  readonly idQualifier?: string;
  /** NM1-09 — identification code. */
  readonly idCode?: string;
}

/**
 * A person (subscriber Loop 2100D / dependent Loop 2100E) decoded from an
 * NM1. `idCode` is the member identifier (NM1-09) — synthetic-only in
 * fixtures. Mirrors {@link "./types.js".X12StatusMember}.
 *
 * @example
 * ```ts
 * import type { Build277MemberSpec } from "@cosyte/x12";
 * const m: Build277MemberSpec = {
 *   entityIdentifierCode: "QC", entityTypeQualifier: "1",
 *   lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001",
 * };
 * ```
 */
export interface Build277MemberSpec {
  /** NM1-01 — entity identifier code (`QC` patient, `IL` insured). */
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
}

/**
 * A reassociation trace (TRN). For a 277 claim status, **`referenceId`
 * (TRN-02) echoes the requesting 276's trace number verbatim**. A claim
 * opens on its trace, so a claim carries at most one trace. Mirrors {@link
 * "./types.js".X12StatusTrace}.
 *
 * @example
 * ```ts
 * import type { Build277TraceSpec } from "@cosyte/x12";
 * const t: Build277TraceSpec = { traceTypeCode: "2", referenceId: "CLAIM20260627001" };
 * ```
 */
export interface Build277TraceSpec {
  /** TRN-01 — trace type code. */
  readonly traceTypeCode: string;
  /** TRN-02 — reference identification (echoed verbatim from the 276). */
  readonly referenceId: string;
  /** TRN-03 — originating company identifier. */
  readonly originatingCompanyId?: string;
  /** TRN-04 — supplemental reference identifier. */
  readonly supplementalReferenceId?: string;
}

/**
 * One Health Care Claim Status composite (C043 — STC-01 / STC-10 / STC-11).
 * Pairs a CSCC (category, source 507) with a CSC (status, source 508) and
 * the responsible entity. Only the verbatim codes are supplied — the read
 * side resolves the descriptions. Mirrors {@link "./types.js".X12StatusCode}
 * minus the derived descriptions.
 *
 * @example
 * ```ts
 * import type { Build277StatusCodeSpec } from "@cosyte/x12";
 * const c: Build277StatusCodeSpec = { categoryCode: "A2", statusCode: "20", entityCode: "PR" };
 * ```
 */
export interface Build277StatusCodeSpec {
  /** C043-01 — Claim Status Category Code (CSCC). Required on the first composite. */
  readonly categoryCode: string;
  /** C043-02 — Claim Status Code (CSC). */
  readonly statusCode?: string;
  /** C043-03 — responsible entity code. */
  readonly entityCode?: string;
}

/**
 * One decoded STC segment — the headline status fields plus the up-to-three
 * {@link Build277StatusCodeSpec} composites (STC-01, STC-10, STC-11). The
 * first composite (STC-01) is required and must carry a category code.
 * Mirrors {@link "./types.js".X12StatusInfo}.
 *
 * @example
 * ```ts
 * import type { Build277StatusSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const s: Build277StatusSpec = {
 *   statuses: [{ categoryCode: "A2", statusCode: "20" }],
 *   statusEffectiveDate: "20260627",
 *   totalChargeAmount: X12Decimal.fromString("150.00")!,
 * };
 * ```
 */
export interface Build277StatusSpec {
  /** STC-01 / STC-10 / STC-11 — 1..3 status composites (first is required). */
  readonly statuses: readonly Build277StatusCodeSpec[];
  /** STC-02 — status information effective date. */
  readonly statusEffectiveDate?: string;
  /** STC-03 — action code. */
  readonly actionCode?: string;
  /** STC-04 — total claim charge amount. */
  readonly totalChargeAmount?: X12Decimal;
  /** STC-05 — claim payment amount. */
  readonly paymentAmount?: X12Decimal;
  /** STC-06 — adjudication / payment date. */
  readonly adjudicationDate?: string;
  /** STC-12 — free-form message. */
  readonly message?: string;
}

/**
 * A REF supplemental identifier on a claim or service-line status. Mirrors
 * {@link "./types.js".X12StatusReference}.
 *
 * @example
 * ```ts
 * import type { Build277ReferenceSpec } from "@cosyte/x12";
 * const r: Build277ReferenceSpec = { qualifier: "1K", value: "PCN0001" };
 * ```
 */
export interface Build277ReferenceSpec {
  /** REF-01 — reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 — reference identification. */
  readonly value: string;
  /** REF-03 — description. */
  readonly description?: string;
}

/**
 * A DTP date / date-range on a claim or service-line status. Mirrors {@link
 * "./types.js".X12StatusDate}.
 *
 * @example
 * ```ts
 * import type { Build277DateSpec } from "@cosyte/x12";
 * const d: Build277DateSpec = { qualifier: "472", formatQualifier: "RD8", value: "20260601-20260601" };
 * ```
 */
export interface Build277DateSpec {
  /** DTP-01 — date/time qualifier. */
  readonly qualifier: string;
  /** DTP-02 — date/time format qualifier (`D8` / `RD8`). */
  readonly formatQualifier: string;
  /** DTP-03 — date/time value. */
  readonly value: string;
}

/**
 * One service-line status (Loop 2220). Triggered by an SVC; carries the
 * procedure / revenue identification, line amounts, and its own STC
 * statuses + REF / DTP. Mirrors {@link "./types.js".X12ServiceLineStatus}.
 *
 * @example
 * ```ts
 * import type { Build277ServiceLineSpec } from "@cosyte/x12";
 * import { X12Decimal } from "@cosyte/x12";
 * const l: Build277ServiceLineSpec = {
 *   serviceIdQualifier: "HC", procedureCode: "99213", modifiers: ["25"],
 *   lineChargeAmount: X12Decimal.fromString("150.00")!,
 *   statuses: [{ statuses: [{ categoryCode: "F2", statusCode: "65" }] }],
 * };
 * ```
 */
export interface Build277ServiceLineSpec {
  /** SVC-01 component 1 — product/service id qualifier (`HC`, `NU`, …). */
  readonly serviceIdQualifier?: string;
  /** SVC-01 component 2 — procedure code. */
  readonly procedureCode?: string;
  /** SVC-01 components 3..6 — procedure modifiers. */
  readonly modifiers?: readonly string[];
  /** SVC-02 — line charge amount. */
  readonly lineChargeAmount?: X12Decimal;
  /** SVC-03 — line payment amount. */
  readonly linePaymentAmount?: X12Decimal;
  /** SVC-04 — revenue code. */
  readonly revenueCode?: string;
  /** Loop 2220 STC statuses. */
  readonly statuses?: readonly Build277StatusSpec[];
  /** Loop 2220 REF identifiers. */
  readonly references?: readonly Build277ReferenceSpec[];
  /** Loop 2220 DTP dates. */
  readonly dates?: readonly Build277DateSpec[];
}

/**
 * One claim status-tracking loop (Loop 2200). A claim opens on a TRN
 * (claim-level reassociation trace) or — in a 277CA provider-level batch
 * acknowledgment — on a standalone STC. Carries at most one trace, the
 * claim-level STC statuses, supplemental REF / DTP, and any service-line
 * statuses (Loop 2220). Mirrors {@link "./types.js".X12ClaimStatus}.
 *
 * @example
 * ```ts
 * import type { Build277ClaimSpec } from "@cosyte/x12";
 * const c: Build277ClaimSpec = {
 *   trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
 *   statuses: [{ statuses: [{ categoryCode: "A2", statusCode: "20" }] }],
 * };
 * ```
 */
export interface Build277ClaimSpec {
  /** Loop 2200 TRN reassociation trace (opens the claim; at most one). */
  readonly trace?: Build277TraceSpec;
  /** Claim-level STC statuses. */
  readonly statuses?: readonly Build277StatusSpec[];
  /** Claim-level REF identifiers. */
  readonly references?: readonly Build277ReferenceSpec[];
  /** Claim-level DTP dates. */
  readonly dates?: readonly Build277DateSpec[];
  /** Loop 2220 service lines. */
  readonly serviceLines?: readonly Build277ServiceLineSpec[];
}

/**
 * One dependent (Loop 2000E / 2100E) — a patient who is not the subscriber.
 * Carries the optional member NM1 and the claims tracked for that
 * dependent.
 *
 * @example
 * ```ts
 * import type { Build277DependentSpec } from "@cosyte/x12";
 * const d: Build277DependentSpec = {
 *   member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JUNIOR" },
 *   claims: [{ trace: { traceTypeCode: "2", referenceId: "CLAIM002" } }],
 * };
 * ```
 */
export interface Build277DependentSpec {
  /** Loop 2100E dependent member (NM1). */
  readonly member?: Build277MemberSpec;
  /** Loop 2200 claims tracked for the dependent (at least one required). */
  readonly claims: readonly Build277ClaimSpec[];
}

/**
 * One subscriber (Loop 2000D / 2100D). Carries the optional member NM1, the
 * subscriber-level claims, and any non-subscriber dependents.
 *
 * @example
 * ```ts
 * import type { Build277SubscriberSpec } from "@cosyte/x12";
 * const s: Build277SubscriberSpec = {
 *   member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
 *   claims: [{ trace: { traceTypeCode: "2", referenceId: "CLAIM001" } }],
 * };
 * ```
 */
export interface Build277SubscriberSpec {
  /** Loop 2100D subscriber member (NM1). */
  readonly member?: Build277MemberSpec;
  /** Loop 2200 subscriber-level claims. */
  readonly claims?: readonly Build277ClaimSpec[];
  /** Loop 2000E dependents (a non-empty list sets the subscriber HL-04 to `"1"`). */
  readonly dependents?: readonly Build277DependentSpec[];
}

/**
 * One service provider (Loop 2000C / 2100C — HL level 19). Carries the
 * provider entity (NM1) and its subscribers.
 *
 * @example
 * ```ts
 * import type { Build277ProviderSpec } from "@cosyte/x12";
 * const p: Build277ProviderSpec = {
 *   entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *   subscribers: [],
 * };
 * ```
 */
export interface Build277ProviderSpec {
  /** Loop 2100C service-provider entity (NM1). */
  readonly entity: Build277EntitySpec;
  /** Loop 2000D subscribers (at least one required — a provider with none is refused). */
  readonly subscribers: readonly Build277SubscriberSpec[];
}

/**
 * One information receiver (Loop 2000B / 2100B). Carries the receiver
 * entity (NM1) and its service providers.
 *
 * @example
 * ```ts
 * import type { Build277InformationReceiverSpec } from "@cosyte/x12";
 * const r: Build277InformationReceiverSpec = {
 *   entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLEARINGHOUSE", idQualifier: "46", idCode: "CH001" },
 *   providers: [],
 * };
 * ```
 */
export interface Build277InformationReceiverSpec {
  /** Loop 2100B information-receiver entity (NM1). */
  readonly entity: Build277EntitySpec;
  /** Loop 2000C service providers (at least one required — a receiver with none is refused). */
  readonly providers: readonly Build277ProviderSpec[];
}

/**
 * One information source (Loop 2000A / 2100A) — the payer answering the
 * claim-status request. Carries the payer entity (NM1) and its receivers.
 *
 * @example
 * ```ts
 * import type { Build277InformationSourceSpec } from "@cosyte/x12";
 * const src: Build277InformationSourceSpec = {
 *   entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
 *   receivers: [],
 * };
 * ```
 */
export interface Build277InformationSourceSpec {
  /** Loop 2100A information-source payer entity (NM1). */
  readonly entity: Build277EntitySpec;
  /** Loop 2000B receivers (at least one required — a source with none is refused). */
  readonly receivers: readonly Build277InformationReceiverSpec[];
}

/**
 * The complete spec for {@link "./build-277.js".build277} / {@link
 * "./build-277.js".build277CA}: the envelope plus the nested
 * informationSources → receivers → providers → subscribers → (dependents)
 * tree the builder walks depth-first to compute the HL spine.
 *
 * @example
 * ```ts
 * import { build277, X12Decimal, type Build277Spec } from "@cosyte/x12";
 * const spec: Build277Spec = {
 *   envelope: {
 *     senderId: "MEDPAY", receiverId: "PROVIDER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   informationSources: [{
 *     entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE", idQualifier: "PI", idCode: "00123" },
 *     receivers: [{
 *       entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLEARINGHOUSE", idQualifier: "46", idCode: "CH001" },
 *       providers: [{
 *         entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC", idQualifier: "XX", idCode: "1234567890" },
 *         subscribers: [{
 *           member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
 *           claims: [{
 *             trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
 *             statuses: [{ statuses: [{ categoryCode: "A2", statusCode: "20" }], totalChargeAmount: X12Decimal.fromString("150.00")! }],
 *           }],
 *         }],
 *       }],
 *     }],
 *   }],
 * };
 * const ix = build277(spec);
 * ```
 */
export interface Build277Spec {
  /** Interchange + group + transaction identity. */
  readonly envelope: Build277EnvelopeSpec;
  /** Loop 2000A information sources (at least one required). */
  readonly informationSources: readonly Build277InformationSourceSpec[];
}

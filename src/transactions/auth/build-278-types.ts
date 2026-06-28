/**
 * Spec types for the 278 domain builders ({@link
 * "./build-278.js".build278Request} / {@link
 * "./build-278.js".build278Response}). The spec mirrors the {@link
 * "./types.js".X12ServicesReview} read model, MINUS the fields the walker
 * *derives* (each diagnosis's `codeSystem`, resolved from the bundled
 * HI-qualifier snapshot; `direction` + `implementationConventionReference`,
 * fixed per builder entry point) and minus the read-only `warnings` /
 * `hierarchies` arrays.
 *
 * The HL spine is NEVER caller-supplied — the builder computes every HL-01
 * id, HL-02 parent pointer (20 → 21 → 22 → 23 → EV/SS), and HL-04 has-child
 * flag from the nested UMO → requester → subscriber → (dependent) → reviews
 * tree.
 *
 * **The certification decision (HCR) is response-only and safety-critical.**
 * {@link "./build-278.js".build278Request} REFUSES a review carrying a
 * `decision`; {@link "./build-278.js".build278Response} emits the supplied
 * `actionCode` (HCR-01) VERBATIM and never infers or upgrades it.
 *
 * Spec source: WPC TR3s `005010X217` (request) + `005010X216` (response).
 * The builder emits segments in TR3 loop order and round-trips back through
 * `get278Request` / `get278Response`, so a well-formed spec is reproduced
 * field-for-field.
 */

/**
 * Interchange + group + transaction identity for the built 278. The builder
 * fixes GS-01 to `"HI"` and ST-01 to `"278"`; ST-03 / GS-08 is the version
 * supplied by the entry point (`005010X217` for {@link
 * "./build-278.js".build278Request}, `005010X216` for {@link
 * "./build-278.js".build278Response}) so the caller never hand-codes them.
 *
 * @example
 * ```ts
 * import type { Build278EnvelopeSpec } from "@cosyte/x12";
 * const env: Build278EnvelopeSpec = {
 *   senderId: "SUBMITTER", receiverId: "UMOPAYER",
 *   interchangeDate: "260601", interchangeTime: "1200",
 *   interchangeControlNumber: "000000001",
 *   groupControlNumber: "1", transactionSetControlNumber: "0001",
 * };
 * ```
 */
export interface Build278EnvelopeSpec {
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
 * The BHT beginning-of-hierarchical-transaction header. Mirrors {@link
 * "./types.js".X12AuthHeader}; `structurePurposeCode` (BHT-01, `"0078"` for
 * a 278) is required.
 *
 * @example
 * ```ts
 * import type { Build278HeaderSpec } from "@cosyte/x12";
 * const h: Build278HeaderSpec = {
 *   structurePurposeCode: "0078", purposeCode: "13",
 *   referenceId: "AUTHREQ-202606", date: "20260601", time: "1200",
 * };
 * ```
 */
export interface Build278HeaderSpec {
  /** BHT-01 — hierarchical structure code (`0078` services review). */
  readonly structurePurposeCode: string;
  /** BHT-02 — transaction set purpose code (`13` request / `11` response). */
  readonly purposeCode?: string;
  /** BHT-03 — submitter transaction reference (re-association key). */
  readonly referenceId?: string;
  /** BHT-04 — transaction set creation date (CCYYMMDD). */
  readonly date?: string;
  /** BHT-05 — transaction set creation time (HHMM). */
  readonly time?: string;
  /** BHT-06 — transaction type code. */
  readonly transactionTypeCode?: string;
}

/**
 * A non-person entity (NM1) — the UMO (Loop 2010A), the requester (Loop
 * 2010B), or a provider attached to a review. Mirrors {@link
 * "./types.js".X12AuthEntity}.
 *
 * @example
 * ```ts
 * import type { Build278EntitySpec } from "@cosyte/x12";
 * const umo: Build278EntitySpec = {
 *   entityIdentifierCode: "X3", entityTypeQualifier: "2",
 *   name: "UTILIZATION REVIEW CO", idQualifier: "PI", idCode: "UMO001",
 * };
 * ```
 */
export interface Build278EntitySpec {
  /** NM1-01 — entity identifier code (`X3` UMO, `1P` requester, `71` attending). */
  readonly entityIdentifierCode: string;
  /** NM1-02 — entity type qualifier (`1` person, `2` non-person). */
  readonly entityTypeQualifier: string;
  /** NM1-03 — name (organization or last name). */
  readonly name: string;
  /** NM1-08 — identification code qualifier. */
  readonly idQualifier?: string;
  /** NM1-09 — identification code. */
  readonly idCode?: string;
}

/**
 * A person (subscriber Loop 2010C / dependent Loop 2010D) — NM1 plus the
 * optional DMG demographics. `idCode` (NM1-09) is the member identifier —
 * synthetic-only in fixtures. Mirrors {@link "./types.js".X12AuthMember}.
 *
 * @example
 * ```ts
 * import type { Build278MemberSpec } from "@cosyte/x12";
 * const m: Build278MemberSpec = {
 *   entityIdentifierCode: "IL", entityTypeQualifier: "1",
 *   lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001",
 *   dateOfBirth: "19850515", genderCode: "F",
 * };
 * ```
 */
export interface Build278MemberSpec {
  /** NM1-01 — entity identifier code (`IL` insured, `QC` patient). */
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
  /** DMG-02 — date of birth (CCYYMMDD). A DMG is emitted only when this or `genderCode` is set. */
  readonly dateOfBirth?: string;
  /** DMG-03 — gender code (`M` / `F` / `U`). */
  readonly genderCode?: string;
}

/**
 * A reassociation trace (TRN) on a review. A 278 request carries a trace the
 * response echoes VERBATIM so the requester can re-associate the
 * certification outcome. Mirrors {@link "./types.js".X12AuthTrace}.
 *
 * @example
 * ```ts
 * import type { Build278TraceSpec } from "@cosyte/x12";
 * const t: Build278TraceSpec = { traceTypeCode: "1", referenceId: "AUTHREQ-202606-0001" };
 * ```
 */
export interface Build278TraceSpec {
  /** TRN-01 — trace type code. */
  readonly traceTypeCode: string;
  /** TRN-02 — reference identification (echoed verbatim between request/response). */
  readonly referenceId: string;
  /** TRN-03 — originating company identifier. */
  readonly originatingCompanyId?: string;
  /** TRN-04 — supplemental reference identifier. */
  readonly supplementalReferenceId?: string;
}

/**
 * One diagnosis composite emitted into the review's HI segment. Only the
 * verbatim `qualifier` (HI-0x-01) + `code` (HI-0x-02) are supplied — the read
 * side resolves the `codeSystem`. Mirrors {@link
 * "./types.js".X12AuthDiagnosis} minus the derived `codeSystem`.
 *
 * @example
 * ```ts
 * import type { Build278DiagnosisSpec } from "@cosyte/x12";
 * const dx: Build278DiagnosisSpec = { qualifier: "ABK", code: "E1165" };
 * ```
 */
export interface Build278DiagnosisSpec {
  /** HI-0x-01 — diagnosis code-source qualifier (`ABK` ICD-10-CM principal). */
  readonly qualifier: string;
  /** HI-0x-02 — diagnosis code. */
  readonly code: string;
}

/**
 * A REF supplemental identifier on a review. Mirrors {@link
 * "./types.js".X12AuthReference}.
 *
 * @example
 * ```ts
 * import type { Build278ReferenceSpec } from "@cosyte/x12";
 * const r: Build278ReferenceSpec = { qualifier: "BB", value: "PRIORAUTH-1" };
 * ```
 */
export interface Build278ReferenceSpec {
  /** REF-01 — reference identification qualifier. */
  readonly qualifier: string;
  /** REF-02 — reference identification. */
  readonly value: string;
  /** REF-03 — description. */
  readonly description?: string;
}

/**
 * A DTP date / date-range on a review. Mirrors {@link
 * "./types.js".X12AuthDate}.
 *
 * @example
 * ```ts
 * import type { Build278DateSpec } from "@cosyte/x12";
 * const d: Build278DateSpec = { qualifier: "472", formatQualifier: "RD8", value: "20260601-20260605" };
 * ```
 */
export interface Build278DateSpec {
  /** DTP-01 — date/time qualifier (`435` admission, `472` service). */
  readonly qualifier: string;
  /** DTP-02 — date/time format qualifier (`D8` / `RD8`). */
  readonly formatQualifier: string;
  /** DTP-03 — date/time value. */
  readonly value: string;
}

/**
 * The HCR Health Care Services Review decision (RESPONSE ONLY). **`actionCode`
 * (HCR-01) is the certification outcome and is emitted VERBATIM** — the
 * builder never infers or upgrades it, so the response round-trips the exact
 * decision the caller supplied. A request spec carrying a decision is
 * REFUSED. Mirrors {@link "./types.js".X12ReviewDecision}.
 *
 * @example
 * ```ts
 * import type { Build278DecisionSpec } from "@cosyte/x12";
 * const d: Build278DecisionSpec = { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" };
 * ```
 */
export interface Build278DecisionSpec {
  /** HCR-01 — action code (`A1` certified, `A3` not certified, `A4` pended, `A6` modified). */
  readonly actionCode: string;
  /** HCR-02 — review / authorization identification number. */
  readonly reviewIdentificationNumber?: string;
  /** HCR-03 — reason code. */
  readonly reasonCode?: string;
  /** HCR-04 — second surgical opinion code. */
  readonly secondSurgicalOpinionCode?: string;
}

/**
 * One services-review item — a patient-event (`EV`, Loop 2000E) or service
 * (`SS`, Loop 2000F) HL. Carries the UM review information, the optional HCR
 * decision (response only), echoed TRN traces, HI diagnoses, attached
 * provider NM1s, and the supplemental REF / DTP / MSG. Nested `reviews` become
 * child HLs (an `SS` service under an `EV` event) parented to this review.
 * Mirrors {@link "./types.js".X12ServiceReview}.
 *
 * @example
 * ```ts
 * import type { Build278ReviewSpec } from "@cosyte/x12";
 * const r: Build278ReviewSpec = {
 *   levelCode: "EV", requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1",
 *   traces: [{ traceTypeCode: "1", referenceId: "AUTHREQ-202606-0001" }],
 *   diagnoses: [{ qualifier: "ABK", code: "E1165" }],
 *   dates: [{ qualifier: "472", formatQualifier: "RD8", value: "20260601-20260605" }],
 * };
 * ```
 */
export interface Build278ReviewSpec {
  /** HL-03 — review level code (`EV` patient event / `SS` service). Default `"EV"`. */
  readonly levelCode?: "EV" | "SS";
  /** UM-01 — request category code (required; a review with none is refused). */
  readonly requestCategoryCode: string;
  /** UM-02 — certification type code (`I` initial / `R` renewal). */
  readonly certificationTypeCode?: string;
  /** UM-03 — service type code. */
  readonly serviceTypeCode?: string;
  /** UM-06 — level of service code. */
  readonly levelOfServiceCode?: string;
  /** HCR decision — RESPONSE ONLY (a request review carrying one is refused). */
  readonly decision?: Build278DecisionSpec;
  /** Loop 2000E/2000F TRN traces. */
  readonly traces?: readonly Build278TraceSpec[];
  /** HI diagnosis composites (emitted as one HI segment). */
  readonly diagnoses?: readonly Build278DiagnosisSpec[];
  /** Attached provider NM1s (rendering / attending / operating). */
  readonly providers?: readonly Build278EntitySpec[];
  /** Supplemental REF identifiers. */
  readonly references?: readonly Build278ReferenceSpec[];
  /** Supplemental DTP dates. */
  readonly dates?: readonly Build278DateSpec[];
  /** MSG free-form messages. */
  readonly messages?: readonly string[];
  /** Nested service (`SS`) reviews parented to this review. */
  readonly reviews?: readonly Build278ReviewSpec[];
}

/**
 * One dependent (Loop 2000D / 2010D — HL level 23) — a patient who is not the
 * subscriber. Carries the optional member NM1 + DMG and the reviews tracked
 * for that dependent (at least one required).
 *
 * @example
 * ```ts
 * import type { Build278DependentSpec } from "@cosyte/x12";
 * const d: Build278DependentSpec = {
 *   member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE", firstName: "JUNIOR" },
 *   reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I" }],
 * };
 * ```
 */
export interface Build278DependentSpec {
  /** Loop 2010D dependent member (NM1 + DMG). */
  readonly member?: Build278MemberSpec;
  /** Loop 2000E/2000F reviews tracked for the dependent (at least one required). */
  readonly reviews: readonly Build278ReviewSpec[];
}

/**
 * One subscriber (Loop 2000C / 2010C — HL level 22). Carries the optional
 * member NM1 + DMG, the subscriber-level reviews, and an optional dependent.
 * A subscriber with neither a review nor a dependent is REFUSED.
 *
 * @example
 * ```ts
 * import type { Build278SubscriberSpec } from "@cosyte/x12";
 * const s: Build278SubscriberSpec = {
 *   member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE" },
 *   reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1" }],
 * };
 * ```
 */
export interface Build278SubscriberSpec {
  /** Loop 2010C subscriber member (NM1 + DMG). */
  readonly member?: Build278MemberSpec;
  /** Loop 2000E/2000F subscriber-level reviews. */
  readonly reviews?: readonly Build278ReviewSpec[];
  /** Loop 2000D dependent (sets the subscriber HL-04 to `"1"`). */
  readonly dependent?: Build278DependentSpec;
}

/**
 * The complete spec for {@link "./build-278.js".build278Request} / {@link
 * "./build-278.js".build278Response}: the envelope + BHT header plus the
 * UMO → requester → subscriber → (dependent) → reviews tree the builder
 * walks depth-first to compute the HL spine.
 *
 * @example
 * ```ts
 * import { build278Request, type Build278Spec } from "@cosyte/x12";
 * const spec: Build278Spec = {
 *   envelope: {
 *     senderId: "SUBMITTER", receiverId: "UMOPAYER",
 *     interchangeDate: "260601", interchangeTime: "1200",
 *     interchangeControlNumber: "000000001",
 *     groupControlNumber: "1", transactionSetControlNumber: "0001",
 *   },
 *   header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "AUTHREQ-202606" },
 *   utilizationManagementOrganization: { entityIdentifierCode: "X3", entityTypeQualifier: "2", name: "UTILIZATION REVIEW CO", idQualifier: "PI", idCode: "UMO001" },
 *   requester: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "RENDERING CLINIC", idQualifier: "XX", idCode: "1234567893" },
 *   subscriber: {
 *     member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
 *     reviews: [{
 *       requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1",
 *       traces: [{ traceTypeCode: "1", referenceId: "AUTHREQ-202606-0001" }],
 *       diagnoses: [{ qualifier: "ABK", code: "E1165" }],
 *     }],
 *   },
 * };
 * const ix = build278Request(spec);
 * ```
 */
export interface Build278Spec {
  /** Interchange + group + transaction identity. */
  readonly envelope: Build278EnvelopeSpec;
  /** BHT header. */
  readonly header: Build278HeaderSpec;
  /** Loop 2010A utilization management organization (HL level 20). */
  readonly utilizationManagementOrganization: Build278EntitySpec;
  /** Loop 2010B requester (HL level 21). */
  readonly requester: Build278EntitySpec;
  /** Loop 2000C subscriber (HL level 22). */
  readonly subscriber: Build278SubscriberSpec;
}

/**
 * Typed model for an X12 005010X279A1 271 Health Care Eligibility Benefit
 * Response. The shape is the public contract of {@link
 * "./get-271.js".get271Eligibility} - adding fields is backward-
 * compatible; renaming fields is breaking. Monetary + quantity fields are
 * {@link "../../decimal.js".X12Decimal} (NEVER `number` - float arithmetic
 * destroys cents on a benefit amount).
 *
 * **TRN echo is the #1 safety property of a 271.** The response MUST echo
 * the requesting 270's TRN trace numbers verbatim so a provider can
 * re-associate the answer with the question. The walker captures every
 * TRN onto its enclosing subscriber / dependent without re-numbering - see
 * {@link X12EligibilityTrace}.
 *
 * Spec source: WPC TR3 `005010X279A1` - Health Care Eligibility Benefit
 * Inquiry and Response (270/271). Segment-level references in JSDoc are
 * 1-indexed against that TR3.
 */

import type { X12Decimal } from "../../decimal.js";
import type { X12Position } from "../../parser/types.js";
import { AAA_LEVEL_CONTEXTS, type X12AaaLevelContext } from "../../parser/warnings.js";
import type { X12ParseWarning } from "../../parser/warnings.js";
import type { X12Hl } from "../shared/hl.js";

/**
 * Top-level result of {@link "./get-271.js".get271Eligibility}. Carries
 * every subscriber loop (each with its enclosing information-source payer
 * and information-receiver provider, its echoed TRN traces, name, and
 * eligibility/benefit lines), the verbatim HL hierarchy, and every warning
 * surfaced during the walk.
 *
 * @example
 * ```ts
 * import { parseX12, get271Eligibility } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
 * if (tx !== undefined) {
 *   const elig = get271Eligibility(ix.delimiters, tx);
 *   for (const sub of elig.subscribers) {
 *     sub.traces[0]?.referenceId;       // echoed 270 trace number
 *     sub.benefits[0]?.eligibilityCode; // "1" (Active Coverage)
 *   }
 * }
 * ```
 */
export interface X12Eligibility {
  readonly subscribers: readonly X12EligibilitySubscriber[];
  readonly hierarchies: readonly X12Hl[];
  /**
   * Every AAA request-validation segment the document carried, in document
   * order. **ALWAYS PRESENT, and empty where the document carried none.** A
   * present, empty collection is a stated zero; an absent field could not be
   * told from a reader that does not surface AAA at all, which is the exact
   * ambiguity this collection exists to remove. A payer that rejected the
   * inquiry and a payer that found no benefits are different answers, and
   * before this collection existed they read identically through this surface.
   */
  readonly aaaConditions: readonly X12AaaCondition[];
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * The four hierarchical levels a 271 AAA request-validation segment can be
 * surfaced against. Derived from the library-owned warning discriminant so the
 * model and the diagnostics can never drift apart on what a level is called;
 * the discriminant's fifth member covers an AAA whose level is unknown, and on
 * the model that case is `undefined` rather than a fifth name.
 *
 * @example
 * ```ts
 * import { AAA_CONDITION_LEVELS } from "@cosyte/x12";
 * AAA_CONDITION_LEVELS.SUBSCRIBER; // "subscriber"
 * ```
 */
export const AAA_CONDITION_LEVELS = Object.freeze({
  INFORMATION_SOURCE: AAA_LEVEL_CONTEXTS.INFORMATION_SOURCE,
  INFORMATION_RECEIVER: AAA_LEVEL_CONTEXTS.INFORMATION_RECEIVER,
  SUBSCRIBER: AAA_LEVEL_CONTEXTS.SUBSCRIBER,
  DEPENDENT: AAA_LEVEL_CONTEXTS.DEPENDENT,
});

/**
 * String-literal union over {@link AAA_CONDITION_LEVELS}: the warning
 * discriminant minus its unknown-level member.
 *
 * @example
 * ```ts
 * import type { X12AaaConditionLevel } from "@cosyte/x12";
 * const level: X12AaaConditionLevel = "dependent";
 * ```
 */
export type X12AaaConditionLevel = Exclude<
  X12AaaLevelContext,
  typeof AAA_LEVEL_CONTEXTS.UNATTACHED
>;

/**
 * One AAA code as it reached the reader: the VERBATIM inbound value, plus the
 * bundled description where one resolves. `description` is `undefined` for a
 * code outside the bundled snapshot, and the snapshots ship empty, so today it
 * is `undefined` for every code. The code itself is never normalised, never
 * defaulted and never dropped.
 *
 * @example
 * ```ts
 * import type { X12AaaCode } from "@cosyte/x12";
 * declare const c: X12AaaCode;
 * c.code;        // "42", exactly the bytes the payer sent
 * c.description; // undefined (the bundled snapshot is empty)
 * ```
 */
export interface X12AaaCode {
  readonly code: string;
  readonly description: string | undefined;
}

/**
 * Which loop occurrence an AAA was transmitted under. Three parts, and a
 * consumer reads all three:
 *
 * - `level` - the hierarchical level, or `undefined` where no level of a named
 *   kind encloses the segment. Never guessed.
 * - `hierarchyId` - the identifier the DOCUMENT assigns that loop (HL-01), as
 *   {@link X12Eligibility.hierarchies} reports it, or `undefined` where the
 *   loop states none. Never synthesised.
 * - `occurrenceIndex` - the zero-based index of that loop occurrence among the
 *   occurrences of the SAME level, counted DOCUMENT-WIDE in document order and
 *   never restarted per enclosing loop. The third dependent loop in a document
 *   is index 2 whether it is the first dependent of the second subscriber or
 *   the third dependent of the first. Where `level` is `undefined` the index
 *   counts within the AAA segments whose level is likewise unknown. It is
 *   always determinable and is never absent.
 *
 * A per-parent index is deliberately NOT what this is: it is not unique
 * document-wide, so it could not stand in for `hierarchyId` where a loop
 * states none.
 *
 * @example
 * ```ts
 * import type { X12AaaConditionKey } from "@cosyte/x12";
 * declare const k: X12AaaConditionKey;
 * k.level;           // "dependent"
 * k.hierarchyId;     // "4" (the HL-01 the document assigned)
 * k.occurrenceIndex; // 1 (the second dependent loop in the document)
 * ```
 */
export interface X12AaaConditionKey {
  readonly level: X12AaaConditionLevel | undefined;
  readonly hierarchyId: string | undefined;
  readonly occurrenceIndex: number;
}

/**
 * One AAA request-validation segment, surfaced on the typed 271 result.
 *
 * **This is the distinction between "the payer rejected the inquiry" and "the
 * member has no benefits".** Both used to read as an empty benefit collection;
 * only the first produces an entry here. The reject reason and follow-up
 * action codes are the payer's own, echoed verbatim, with a description only
 * where the bundled snapshot has one.
 *
 * Only the two code positions are read, because only those two have a recorded
 * source. Nothing else in the segment is assigned a meaning, and an element
 * past them raises `X12_271_AAA_SEGMENT_MALFORMED` rather than being read.
 *
 * @example
 * ```ts
 * import type { X12AaaCondition } from "@cosyte/x12";
 * declare const c: X12AaaCondition;
 * c.key.level;                 // "subscriber"
 * c.rejectReasonCode?.code;    // "42", verbatim
 * c.followUpActionCode?.code;  // "C", verbatim
 * c.position.segmentIndex;     // where in the transaction set to read it
 * ```
 */
export interface X12AaaCondition {
  readonly key: X12AaaConditionKey;
  /** AAA-03, verbatim, or `undefined` where the payer stated none. */
  readonly rejectReasonCode: X12AaaCode | undefined;
  /** AAA-04, verbatim, or `undefined` where the payer stated none. */
  readonly followUpActionCode: X12AaaCode | undefined;
  /** Where the segment sits, for a consumer reading `tx.segments` beside it. */
  readonly position: X12Position;
}

/**
 * One subscriber (Loop 2000C / 2100C). Holds the enclosing information
 * source (Loop 2100A payer) and information receiver (Loop 2100B provider)
 * resolved from the HL tree, the verbatim echoed TRN traces, the
 * subscriber name + demographics, and the eligibility/benefit lines.
 * Non-subscriber patients hang off {@link dependents}.
 *
 * @example
 * ```ts
 * import type { X12EligibilitySubscriber } from "@cosyte/x12";
 * declare const s: X12EligibilitySubscriber;
 * s.informationSource?.name;   // "MEDPAY INSURANCE"
 * s.name?.lastName;            // "DOE"
 * s.dependents.length;         // 0
 * ```
 */
export interface X12EligibilitySubscriber {
  readonly hierarchy: X12Hl | undefined;
  readonly informationSource: X12EligibilityEntity | undefined;
  readonly informationReceiver: X12EligibilityEntity | undefined;
  readonly traces: readonly X12EligibilityTrace[];
  readonly name: X12EligibilityMember | undefined;
  readonly references: readonly X12EligibilityReference[];
  readonly dates: readonly X12EligibilityDate[];
  readonly benefits: readonly X12EligibilityBenefit[];
  readonly dependents: readonly X12EligibilityDependent[];
}

/**
 * One dependent (Loop 2000D / 2100D) - a patient who is not the subscriber
 * (relationship is carried at the HL level). Same benefit-bearing shape as
 * a subscriber minus the nested dependents.
 *
 * @example
 * ```ts
 * import type { X12EligibilityDependent } from "@cosyte/x12";
 * declare const d: X12EligibilityDependent;
 * d.name?.firstName;            // "JUNIOR"
 * d.benefits[0]?.coverageLevelCode; // "IND"
 * ```
 */
export interface X12EligibilityDependent {
  readonly hierarchy: X12Hl | undefined;
  readonly traces: readonly X12EligibilityTrace[];
  readonly name: X12EligibilityMember | undefined;
  readonly references: readonly X12EligibilityReference[];
  readonly dates: readonly X12EligibilityDate[];
  readonly benefits: readonly X12EligibilityBenefit[];
}

/**
 * A non-person entity (payer in Loop 2100A, provider in Loop 2100B, or a
 * benefit-related entity in Loop 2120C). Decoded from an NM1 - no
 * demographics, just the organization / provider name + identifier.
 *
 * @example
 * ```ts
 * import type { X12EligibilityEntity } from "@cosyte/x12";
 * declare const e: X12EligibilityEntity;
 * e.entityIdentifierCode; // "PR" (payer) / "1P" (provider)
 * e.name;                 // "MEDPAY INSURANCE"
 * e.idCode;               // "00123"
 * ```
 */
export interface X12EligibilityEntity {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly name: string;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
}

/**
 * A person (subscriber / dependent) decoded from NM1 + the optional DMG
 * demographics + N3/N4 address. `idCode` is the member identifier (NM1-09)
 * - synthetic-only in fixtures.
 *
 * @example
 * ```ts
 * import type { X12EligibilityMember } from "@cosyte/x12";
 * declare const m: X12EligibilityMember;
 * m.lastName;     // "DOE"
 * m.dateOfBirth;  // "19800101" (DMG-02, CCYYMMDD)
 * m.genderCode;   // "F"
 * ```
 */
export interface X12EligibilityMember {
  readonly entityIdentifierCode: string;
  readonly entityTypeQualifier: string;
  readonly lastName: string | undefined;
  readonly firstName: string | undefined;
  readonly middleName: string | undefined;
  readonly suffix: string | undefined;
  readonly idQualifier: string | undefined;
  readonly idCode: string | undefined;
  readonly address: X12EligibilityAddress | undefined;
  readonly dateOfBirth: string | undefined;
  readonly genderCode: string | undefined;
}

/**
 * A reassociation trace (TRN). **The verbatim echo of the requesting 270's
 * trace number** - `referenceId` (TRN-02) is the value a provider matches
 * against the trace it sent. The walker NEVER mutates it.
 *
 * @example
 * ```ts
 * import type { X12EligibilityTrace } from "@cosyte/x12";
 * declare const t: X12EligibilityTrace;
 * t.traceTypeCode; // "2" (referenced - added by the payer in the 271)
 * t.referenceId;   // "ELIG20260627001" (echoed verbatim from the 270)
 * ```
 */
export interface X12EligibilityTrace {
  readonly traceTypeCode: string;
  readonly referenceId: string;
  readonly originatingCompanyId: string | undefined;
  readonly supplementalReferenceId: string | undefined;
}

/**
 * One eligibility-or-benefit line (EB, Loop 2110C/2110D). EB-01 is the
 * eligibility code (`1` Active Coverage, `6` Inactive, `I` Non-Covered,
 * …); EB-03 carries one-or-more Service Type Codes (each looked up against
 * the bundled snapshot). Monetary + percent + quantity are
 * {@link X12Decimal}. The walker preserves the verbatim EB-01 even when no
 * description resolves.
 *
 * @example
 * ```ts
 * import type { X12EligibilityBenefit } from "@cosyte/x12";
 * declare const b: X12EligibilityBenefit;
 * b.eligibilityCode;          // "1"
 * b.serviceTypeCodes[0]?.code; // "30"
 * b.inPlanNetwork;            // "Y"
 * b.monetaryAmount?.toString(); // "1000.00"
 * ```
 */
export interface X12EligibilityBenefit {
  readonly eligibilityCode: string;
  readonly coverageLevelCode: string | undefined;
  readonly serviceTypeCodes: readonly X12EligibilityServiceType[];
  readonly insuranceTypeCode: string | undefined;
  readonly planCoverageDescription: string | undefined;
  readonly timePeriodQualifier: string | undefined;
  readonly monetaryAmount: X12Decimal | undefined;
  readonly percent: X12Decimal | undefined;
  readonly quantityQualifier: string | undefined;
  readonly quantity: X12Decimal | undefined;
  readonly authorizationRequired: string | undefined;
  readonly inPlanNetwork: string | undefined;
  readonly references: readonly X12EligibilityReference[];
  readonly dates: readonly X12EligibilityDate[];
  readonly messages: readonly string[];
  readonly relatedEntities: readonly X12EligibilityEntity[];
}

/**
 * A decoded Service Type Code (EB-03, X12 external code source 1365). The
 * verbatim code is always preserved; `description` resolves from the
 * bundled snapshot (or `undefined` when outside the subset).
 *
 * @example
 * ```ts
 * import type { X12EligibilityServiceType } from "@cosyte/x12";
 * declare const st: X12EligibilityServiceType;
 * st.code;        // "30"
 * st.description; // "Health Benefit Plan Coverage"
 * ```
 */
export interface X12EligibilityServiceType {
  readonly code: string;
  readonly description: string | undefined;
}

/**
 * A REF supplemental identifier attached to a subscriber, dependent, or
 * benefit line. `qualifier` is REF-01; `value` is REF-02.
 *
 * @example
 * ```ts
 * import type { X12EligibilityReference } from "@cosyte/x12";
 * declare const r: X12EligibilityReference;
 * r.qualifier; // "6P" (group number)
 * r.value;     // "GRP0001"
 * ```
 */
export interface X12EligibilityReference {
  readonly qualifier: string;
  readonly value: string;
  readonly description: string | undefined;
}

/**
 * A DTP date / date-range attached to a subscriber, dependent, or benefit
 * line. `qualifier` is DTP-01 (e.g. `307` Eligibility, `291` Plan); `value`
 * is DTP-03 in the DTP-02 format (`D8` `CCYYMMDD` / `RD8` range).
 *
 * @example
 * ```ts
 * import type { X12EligibilityDate } from "@cosyte/x12";
 * declare const d: X12EligibilityDate;
 * d.qualifier;       // "307"
 * d.formatQualifier; // "D8"
 * d.value;           // "20260101"
 * ```
 */
export interface X12EligibilityDate {
  readonly qualifier: string;
  readonly formatQualifier: string;
  readonly value: string;
}

/**
 * A postal address (N3 + N4) attached to a subscriber / dependent name.
 *
 * @example
 * ```ts
 * import type { X12EligibilityAddress } from "@cosyte/x12";
 * declare const a: X12EligibilityAddress;
 * a.lines[0];   // "123 MAIN ST"
 * a.city;       // "ANYTOWN"
 * a.state;      // "CA"
 * a.postalCode; // "90001"
 * ```
 */
export interface X12EligibilityAddress {
  readonly lines: readonly string[];
  readonly city: string | undefined;
  readonly state: string | undefined;
  readonly postalCode: string | undefined;
  readonly countryCode: string | undefined;
}

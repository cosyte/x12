/**
 * Tier-2 warning registry and factories for the `@cosyte/x12` parser
 * pipeline. Consumers compare `warning.code === WARNING_CODES.<CODE>` to
 * narrow and react; the parser uses the factories here to construct every
 * warning it emits so messages, payload shape, and positional context stay
 * consistent across stages.
 *
 * The envelope set is intentionally small (8 codes) - every additional code
 * is a public-surface addition that needs a snapshot bump
 * (see `test/warning-codes.snapshot.test.ts`). Later stages extend, never
 * rename.
 *
 * ## A warning message is built from this registry, never from the document
 *
 * This is the load-bearing PHI invariant of the library, and it is enforced
 * structurally rather than by review: **no factory in this file takes a
 * value parameter.** Every factory takes an {@link X12Position} plus, where
 * one code covers more than one situation, a library-owned discriminant
 * ({@link X12ControlNumberPair}, {@link X12UnexpectedSegmentContext},
 * {@link X12BalanceInvariant}, {@link X12RequiredLoop}). `message` is a
 * lookup into a frozen table, so it cannot interpolate anything a sender
 * controls no matter what the input contains.
 *
 * That is a deliberate change of shape. Earlier versions shape-validated an
 * echoed value against a spec grammar and substituted `(non-spec)` when it
 * did not match. That held for the code-list slots and did NOT hold for the
 * six envelope control numbers, whose grammar is "whatever the trading
 * partner sent": a `X12_CONTROL_NUMBER_MISMATCH` echoed both sides verbatim
 * and unbounded. A shape test is a filter somebody has to remember to
 * apply; taking no value at all is a property of the type signature.
 *
 * The values themselves are never discarded. Every one of them is preserved
 * verbatim on the model (`isa.elements`, `seg.raw`,
 * `adjustment.reasonCode`, and so on), which is where a consumer that has
 * decided it may handle PHI goes to read them. The diagnostic says *what*
 * is wrong and *where*; the model says what the bytes were.
 *
 * `X12ParseError.snippet` on a **Tier-3 fatal** is the one deliberate
 * exception in the library, and it is bounded to 64 characters. Warnings
 * have no `snippet`, and a strict-mode escalation of a warning carries none
 * either. See `KNOWN-LIMITATIONS.md`.
 */

import type { X12Position } from "./types.js";

/**
 * Stable string codes for every Tier-2 warning the parser may emit. The
 * registry is frozen via `as const` so TypeScript infers the exact string
 * literal union for {@link X12WarningCode} - zero runtime cost, no magic-
 * string comparisons for consumers.
 *
 * @example
 * ```ts
 * import { parseX12, WARNING_CODES } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * if (ix.warnings.some((w) => w.code === WARNING_CODES.X12_PRE_005010)) {
 *   // sender is on a pre-005010 version family
 * }
 * ```
 */
export const WARNING_CODES = {
  X12_CONTROL_NUMBER_MISMATCH: "X12_CONTROL_NUMBER_MISMATCH",
  X12_PRE_005010: "X12_PRE_005010",
  X12_ISA_EXTRA_ELEMENT_SEPARATOR: "X12_ISA_EXTRA_ELEMENT_SEPARATOR",
  X12_GROUP_COUNT_MISMATCH: "X12_GROUP_COUNT_MISMATCH",
  X12_TRANSACTION_COUNT_MISMATCH: "X12_TRANSACTION_COUNT_MISMATCH",
  X12_SEGMENT_COUNT_MISMATCH: "X12_SEGMENT_COUNT_MISMATCH",
  X12_TRAILING_GARBAGE: "X12_TRAILING_GARBAGE",
  X12_MISSING_IEA: "X12_MISSING_IEA",
  X12_MISSING_GE: "X12_MISSING_GE",
  X12_MISSING_SE: "X12_MISSING_SE",
  X12_DANGLING_RELEASE_CHAR: "X12_DANGLING_RELEASE_CHAR",
  X12_UNEXPECTED_SEGMENT: "X12_UNEXPECTED_SEGMENT",
  X12_835_REMIT_BALANCE_MISMATCH: "X12_835_REMIT_BALANCE_MISMATCH",
  X12_UNKNOWN_CARC: "X12_UNKNOWN_CARC",
  X12_UNKNOWN_RARC: "X12_UNKNOWN_RARC",
  X12_HL_PARENT_MISMATCH: "X12_HL_PARENT_MISMATCH",
  X12_HL_PARENT_LEVEL_INVALID: "X12_HL_PARENT_LEVEL_INVALID",
  X12_UNKNOWN_HI_QUALIFIER: "X12_UNKNOWN_HI_QUALIFIER",
  X12_MISSING_REQUIRED_LOOP: "X12_MISSING_REQUIRED_LOOP",
  X12_837_UNKNOWN_VARIANT: "X12_837_UNKNOWN_VARIANT",
  X12_837_AMBIGUOUS_VARIANT: "X12_837_AMBIGUOUS_VARIANT",
  X12_UNKNOWN_CLAIM_STATUS_CATEGORY: "X12_UNKNOWN_CLAIM_STATUS_CATEGORY",
  X12_UNKNOWN_CLAIM_STATUS: "X12_UNKNOWN_CLAIM_STATUS",
  X12_834_UNKNOWN_MAINTENANCE_TYPE: "X12_834_UNKNOWN_MAINTENANCE_TYPE",
  X12_UNPARSEABLE_DECIMAL: "X12_UNPARSEABLE_DECIMAL",
  X12_837_SERVICE_LINE_NOT_DECODED: "X12_837_SERVICE_LINE_NOT_DECODED",
  X12_837_SERVICE_LINE_DROPPED: "X12_837_SERVICE_LINE_DROPPED",
  X12_837_SERVICE_SEGMENT_WITHOUT_LX: "X12_837_SERVICE_SEGMENT_WITHOUT_LX",
  X12_837_SERVICE_SEGMENT_REPEATED: "X12_837_SERVICE_SEGMENT_REPEATED",
  X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX: "X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX",
  X12_837_PAY_TO_ADDRESS_REPEATED: "X12_837_PAY_TO_ADDRESS_REPEATED",
  X12_835_BALANCE_NOT_EVALUABLE: "X12_835_BALANCE_NOT_EVALUABLE",
  X12_AMOUNT_ROW_DROPPED: "X12_AMOUNT_ROW_DROPPED",
  X12_STATED_AMOUNT_DISCARDED: "X12_STATED_AMOUNT_DISCARDED",
} as const;

/**
 * Discriminant type for `X12ParseWarning.code`. Narrowing a warning by this
 * code lets consumers write exhaustive `switch` blocks and guarantees a
 * typo-free comparison against the `WARNING_CODES` registry.
 *
 * @example
 * ```ts
 * import type { X12ParseWarning, X12WarningCode } from "@cosyte/x12";
 * function describe(w: X12ParseWarning): string {
 *   const code: X12WarningCode = w.code;
 *   switch (code) {
 *     case "X12_PRE_005010":
 *       return "pre-005010 sender";
 *     default:
 *       return `warning: ${code}`;
 *   }
 * }
 * ```
 */
export type X12WarningCode = (typeof WARNING_CODES)[keyof typeof WARNING_CODES];

/**
 * Which header/trailer control-number pair disagreed. A library-owned
 * discriminant, NOT a value read out of the document: the useful part of
 * the diagnostic is that the two disagree and where each one sits, never
 * what either one says.
 *
 * @example
 * ```ts
 * import { controlNumberMismatch, CONTROL_NUMBER_PAIRS } from "@cosyte/x12";
 * const w = controlNumberMismatch({ segmentIndex: 6 }, CONTROL_NUMBER_PAIRS.INTERCHANGE);
 * ```
 */
export const CONTROL_NUMBER_PAIRS = {
  /** ISA-13 against IEA-02. */
  INTERCHANGE: "interchange",
  /** GS-06 against GE-02. */
  GROUP: "group",
  /** ST-02 against SE-02. */
  TRANSACTION: "transaction",
} as const;

/**
 * String-literal union over {@link CONTROL_NUMBER_PAIRS}.
 *
 * @example
 * ```ts
 * import type { X12ControlNumberPair } from "@cosyte/x12";
 * const pair: X12ControlNumberPair = "group";
 * ```
 */
export type X12ControlNumberPair = (typeof CONTROL_NUMBER_PAIRS)[keyof typeof CONTROL_NUMBER_PAIRS];

/**
 * Which structural rule an out-of-place segment broke. A closed,
 * library-owned set. The segment's own id is deliberately NOT part of it:
 * a segment that is not where it belongs is exactly the case where its
 * first element is arbitrary sender bytes rather than a spec name.
 *
 * @example
 * ```ts
 * import { unexpectedSegment, UNEXPECTED_SEGMENT_CONTEXTS } from "@cosyte/x12";
 * const w = unexpectedSegment({ segmentIndex: 12 }, UNEXPECTED_SEGMENT_CONTEXTS.GE_WITHOUT_GS);
 * ```
 */
export const UNEXPECTED_SEGMENT_CONTEXTS = {
  /** A `TA1` (envelope-level by spec) appeared inside an open functional group. */
  TA1_INSIDE_GROUP: "ta1-inside-group",
  /** A `GE` appeared with no open `GS`. */
  GE_WITHOUT_GS: "ge-without-gs",
  /** An `ST` appeared with no open functional group. */
  ST_WITHOUT_GS: "st-without-gs",
  /** An `SE` appeared with no open transaction set. */
  SE_WITHOUT_ST: "se-without-st",
  /** A body segment appeared outside any open transaction set. */
  BODY_OUTSIDE_TRANSACTION: "body-outside-transaction",
} as const;

/**
 * String-literal union over {@link UNEXPECTED_SEGMENT_CONTEXTS}.
 *
 * @example
 * ```ts
 * import type { X12UnexpectedSegmentContext } from "@cosyte/x12";
 * const ctx: X12UnexpectedSegmentContext = "se-without-st";
 * ```
 */
export type X12UnexpectedSegmentContext =
  (typeof UNEXPECTED_SEGMENT_CONTEXTS)[keyof typeof UNEXPECTED_SEGMENT_CONTEXTS];

/**
 * Which 835 balance invariant failed. A library-owned discriminant naming
 * the TR3 equation. The amounts on either side stay on the model as
 * `X12Decimal` and are never rendered into the message: an EDI amount is a
 * consumer-controlled element like any other, and a 300,000-digit "amount"
 * would otherwise become a 300,000-byte diagnostic.
 *
 * @example
 * ```ts
 * import { remitBalanceMismatch, BALANCE_INVARIANTS } from "@cosyte/x12";
 * const w = remitBalanceMismatch({ segmentIndex: 12 }, BALANCE_INVARIANTS.CLAIM);
 * ```
 */
export const BALANCE_INVARIANTS = {
  /** `CLP-04 + Σ(claim CAS + line CAS) == CLP-03`. */
  CLAIM: "claim",
  /** `SVC-03 + Σ(line CAS) == SVC-02`. */
  SERVICE_LINE: "service-line",
  /** `Σ(CLP-04) - Σ(PLB amounts) == BPR-02`. */
  REMIT_TOTAL: "remit-total",
} as const;

/**
 * String-literal union over {@link BALANCE_INVARIANTS}.
 *
 * @example
 * ```ts
 * import type { X12BalanceInvariant } from "@cosyte/x12";
 * const which: X12BalanceInvariant = "service-line";
 * ```
 */
export type X12BalanceInvariant = (typeof BALANCE_INVARIANTS)[keyof typeof BALANCE_INVARIANTS];

/**
 * The TR3-required loops the parser reports as structurally absent. A
 * closed set owned by the loop specs under `src/transactions/`, so both the
 * loop id and its rationale are library constants rather than anything read
 * out of the document.
 *
 * @example
 * ```ts
 * import { missingRequiredLoop, REQUIRED_LOOPS } from "@cosyte/x12";
 * const w = missingRequiredLoop({ segmentIndex: 12 }, REQUIRED_LOOPS.PAYER_NAME_2010BB);
 * ```
 */
export const REQUIRED_LOOPS = {
  /** Loop 2000A, Billing Provider HL. */
  BILLING_PROVIDER_2000A: "2000A",
  /** Loop 2000B, Subscriber HL. */
  SUBSCRIBER_2000B: "2000B",
  /** Loop 2010BA, Subscriber Name. */
  SUBSCRIBER_NAME_2010BA: "2010BA",
  /** Loop 2010BB, Payer Name. */
  PAYER_NAME_2010BB: "2010BB",
} as const;

/**
 * String-literal union over {@link REQUIRED_LOOPS}.
 *
 * @example
 * ```ts
 * import type { X12RequiredLoop } from "@cosyte/x12";
 * const loop: X12RequiredLoop = "2010BB";
 * ```
 */
export type X12RequiredLoop = (typeof REQUIRED_LOOPS)[keyof typeof REQUIRED_LOOPS];

/**
 * The frozen message registry. Every string a warning can carry is here,
 * and nothing here is assembled from parser input: these are literals, so
 * `message` is a lookup rather than an interpolation.
 *
 * Keys are the warning code, suffixed with the discriminant where one code
 * covers several situations. `test/phi-diagnostic-surface.test.ts` asserts
 * that every message the library emits, across every slot in its table, is
 * a member of {@link ALL_WARNING_MESSAGES}. That assertion survives a slot
 * table nobody remembers to extend: a factory that started interpolating
 * again fails it without anyone having to think of the slot it leaked
 * through.
 *
 * @internal
 */
const WARNING_MESSAGES = {
  X12_CONTROL_NUMBER_MISMATCH_INTERCHANGE:
    "Control number mismatch: ISA-13 (header) and IEA-02 (trailer) disagree. Both values are preserved verbatim on the model; neither is echoed here.",
  X12_CONTROL_NUMBER_MISMATCH_GROUP:
    "Control number mismatch: GS-06 (header) and GE-02 (trailer) disagree. Both values are preserved verbatim on the model; neither is echoed here.",
  X12_CONTROL_NUMBER_MISMATCH_TRANSACTION:
    "Control number mismatch: ST-02 (header) and SE-02 (trailer) disagree. Both values are preserved verbatim on the model; neither is echoed here.",
  X12_PRE_005010:
    'The twelfth element of the ISA split does not read "00501", the HIPAA baseline interchange control version number, so the input may diverge from 005010 semantics. Whether that element is ISA-12 is NOT established here: where `X12_ISA_EXTRA_ELEMENT_SEPARATOR` is also present on this interchange the header did not split into `ISA` plus 16 elements, so the element read may be a displaced one. All 106 ISA bytes are preserved verbatim on `isa.raw`, which with the ISA fixed widths is the route back. Nothing is echoed here.',
  X12_ISA_EXTRA_ELEMENT_SEPARATOR:
    "The ISA element area carries at least one element separator beyond the 16 sitting at their fixed 005010 byte positions, so the header does not split into `ISA` plus 16 elements. `isa.elements` is that split as it came out: an element containing an extra separator comes back a prefix and everything after it is displaced. How far is NOT derivable from `isa.elements`, so any other ISA-derived diagnostic on this interchange may be reporting a displaced value. All 106 bytes are preserved verbatim on `isa.raw`, which with the ISA's fixed widths is the route back. Which reading is correct - the byte as data under the ISA's fixed widths, or as a separator - is NOT decided here, and nothing is re-framed.",
  X12_GROUP_COUNT_MISMATCH:
    "IEA-01 does not equal the number of GS..GE groups actually present in the interchange. The declared count is preserved verbatim on the model and is NEVER silently corrected.",
  X12_TRANSACTION_COUNT_MISMATCH:
    "GE-01 does not equal the number of ST..SE transaction sets actually present in the group. The declared count is preserved verbatim on the model and is NEVER silently corrected.",
  X12_SEGMENT_COUNT_MISMATCH:
    "SE-01 does not equal the number of segments actually present in the transaction set it closes. The declared count is preserved verbatim and is corrected only on `serializeX12(ix, { specClean: true, recomputeCounts: true })`.",
  X12_TRAILING_GARBAGE:
    "Bytes followed the IEA segment terminator, preserved verbatim on `trailingBytes`. Common cause: a second interchange concatenated into the same file (multi-ISA, out of v1 scope).",
  X12_MISSING_IEA: "Interchange has no IEA trailer - input is truncated.",
  X12_MISSING_GE: "Functional group has no GE trailer - group is truncated.",
  X12_MISSING_SE: "Transaction set has no SE trailer - transaction is truncated.",
  X12_DANGLING_RELEASE_CHAR:
    "Release character (`?`) appears at end of element/segment with no following byte to escape - preserved verbatim.",
  X12_UNEXPECTED_SEGMENT_TA1_INSIDE_GROUP:
    "Unexpected segment: TA1 is envelope-level but appeared inside an open functional group, so it is NOT captured on `ta1Segments` and `parseTA1` will not read it. It is retained verbatim on `orphanSegments` at the matching `position.segmentIndex`.",
  X12_UNEXPECTED_SEGMENT_GE_WITHOUT_GS:
    "Unexpected segment: a GE appeared with no open functional group, so it closes nothing and no group is recorded for it. It is retained verbatim on `orphanSegments` at the matching `position.segmentIndex`.",
  X12_UNEXPECTED_SEGMENT_ST_WITHOUT_GS:
    "Unexpected segment: an ST appeared with no open functional group (missing GS), so no transaction set is opened and nothing that follows it is bound to one. It is retained verbatim on `orphanSegments` at the matching `position.segmentIndex`.",
  X12_UNEXPECTED_SEGMENT_SE_WITHOUT_ST:
    "Unexpected segment: an SE appeared with no open transaction set, so it closes nothing and no transaction is recorded for it. It is retained verbatim on `orphanSegments` at the matching `position.segmentIndex`.",
  X12_UNEXPECTED_SEGMENT_BODY_OUTSIDE_TRANSACTION:
    "Unexpected segment: a body segment appeared outside any open transaction set, so it is not bound to a transaction and no `get*` reader will see it. It is retained verbatim on `orphanSegments` at the matching `position.segmentIndex`.",
  X12_835_REMIT_BALANCE_MISMATCH_CLAIM:
    "835 balance invariant violated [CLP-04 + Σ(claim CAS + line CAS) == CLP-03]: the claim does not balance. Every amount is preserved verbatim on the model as an X12Decimal and is NEVER silently rebalanced.",
  X12_835_REMIT_BALANCE_MISMATCH_SERVICE_LINE:
    "835 balance invariant violated [SVC-03 + Σ(line CAS) == SVC-02]: the service line does not balance. Every amount is preserved verbatim on the model as an X12Decimal and is NEVER silently rebalanced.",
  X12_835_REMIT_BALANCE_MISMATCH_REMIT_TOTAL:
    "835 balance invariant violated [Σ(CLP-04) - Σ(PLB amounts) == BPR-02]: the remittance total does not balance. Every amount is preserved verbatim on the model as an X12Decimal and is NEVER silently rebalanced.",
  X12_835_BALANCE_NOT_EVALUABLE_CLAIM:
    "835 balance invariant [CLP-04 + Σ(claim CAS + line CAS) == CLP-03] could not be evaluated: at least one term of it is `undefined` on the model, meaning this library decoded no value from that element. The equation is NOT reported as violated and NOT reported as satisfied, because an absent term has no value to compare - substituting 0 for it would be this library asserting a total the sender never sent. Which term is missing is read off the model, never from this message. Compare `X12_835_REMIT_BALANCE_MISMATCH`, which is raised only where every term decoded and the equation is genuinely out of balance.",
  X12_835_BALANCE_NOT_EVALUABLE_SERVICE_LINE:
    "835 balance invariant [SVC-03 + Σ(line CAS) == SVC-02] could not be evaluated: at least one term of it is `undefined` on the model, meaning this library decoded no value from that element. The equation is NOT reported as violated and NOT reported as satisfied, because an absent term has no value to compare - substituting 0 for it would be this library asserting a total the sender never sent. Which term is missing is read off the model, never from this message. Compare `X12_835_REMIT_BALANCE_MISMATCH`, which is raised only where every term decoded and the equation is genuinely out of balance.",
  X12_835_BALANCE_NOT_EVALUABLE_REMIT_TOTAL:
    "835 balance invariant [Σ(CLP-04) - Σ(PLB amounts) == BPR-02] could not be evaluated: at least one term of it is `undefined` on the model, meaning this library decoded no value from that element. The equation is NOT reported as violated and NOT reported as satisfied, because an absent term has no value to compare - substituting 0 for it would be this library asserting a total the sender never sent. Which term is missing is read off the model, never from this message. Compare `X12_835_REMIT_BALANCE_MISMATCH`, which is raised only where every term decoded and the equation is genuinely out of balance.",
  X12_UNKNOWN_CARC:
    "Unknown CARC: the claim adjustment reason code is outside the bundled snapshot. The verbatim code is preserved on the adjustment; only its description is unavailable.",
  X12_UNKNOWN_RARC:
    "Unknown RARC: the remittance advice remark code is outside the bundled snapshot. The verbatim code is preserved on the remark; only its description is unavailable.",
  X12_HL_PARENT_MISMATCH:
    "HL-02 declares a parent id that no earlier HL in this transaction set emitted as its HL-01. The declared pointer is preserved verbatim and the hierarchy is NEVER silently re-numbered.",
  X12_HL_PARENT_LEVEL_INVALID:
    "HL-03 is inconsistent with the declared parent's HL-03 per the TR3 hierarchy. Both level codes are preserved verbatim and the hierarchy is NEVER silently re-parented.",
  X12_UNKNOWN_HI_QUALIFIER:
    'Unknown HI qualifier: the composite qualifier is outside the bundled HI_QUALIFIERS snapshot. The verbatim qualifier and code are preserved; codeSystem resolves to "unknown".',
  X12_MISSING_REQUIRED_LOOP_2000A:
    'Missing required loop "2000A" (Billing Provider HL): no Billing Provider HL precedes the CLM.',
  X12_MISSING_REQUIRED_LOOP_2000B:
    'Missing required loop "2000B" (Subscriber HL): no Subscriber HL precedes the CLM.',
  X12_MISSING_REQUIRED_LOOP_2010BA:
    'Missing required loop "2010BA" (Subscriber Name): no Subscriber Name follows the Subscriber HL.',
  X12_MISSING_REQUIRED_LOOP_2010BB:
    'Missing required loop "2010BB" (Payer Name): no Payer Name follows the Subscriber HL.',
  X12_837_UNKNOWN_VARIANT:
    "837 variant could not be resolved: ST-03's implementation convention reference is absent, empty, or not an 837 Technical Report Type 3 identifier this reader recognises, and no SVx service-line segment was present to fall back on. The set of references it recognises covers the professional, institutional and dental 837 guides HIPAA adopts at 45 CFR 162.1102 together with their published errata; it is NOT claimed to be exhaustive, and this message deliberately does not enumerate it, because a list here goes stale the moment a guide is added. A reference outside that set is not asserted to be invalid - all this code reports is that this reader could not turn it into a variant and had nothing to fall back on.",
  X12_837_AMBIGUOUS_VARIANT:
    "837 variant resolved from a service segment while the transaction body carries service segments of more than one variant: no caller `type` option was supplied and ST-03's implementation convention reference is absent, empty, or not an 837 Technical Report Type 3 identifier this reader recognises, so this reader fell back to the FIRST SV1 / SV2 / SV3 in the body, and a later one names a different variant. `submission.variant` is therefore a guess between contradictory evidence, and every claim and service line in the submission was read against it. Which service segment is the stray one is NOT decided here and is not derivable from the TR3s: this reader cannot tell a stray service segment from a conformant one, and the fallback takes the first regardless of whether any Loop 2400 was open at it, so an orphan segment decides the variant like any other. Read the bound literally, as a property of the RESOLUTION rather than of the document: this reports the fallback's own ambiguity, so a caller-supplied `type`, or an ST-03 this reader does turn into a variant, means no guess was made and this code is NOT raised however mixed the body is. Whatever else this reader raised on a document that reaches this code, it still raises, at the same position, and this one is added beside them. It is NOT a list of what else you will see, and it does not promise that any particular loss on such a document is reported at all. Re-read with the `type` option to decode the document against a variant you trust. The verbatim segments are preserved on the transaction set; read them there before acting on the submission's type.",
  X12_UNKNOWN_CLAIM_STATUS_CATEGORY:
    "Unknown claim status category (CSCC): the STC composite's first component is outside the bundled snapshot. The verbatim code is preserved on the status; only its description is unavailable.",
  X12_UNKNOWN_CLAIM_STATUS:
    "Unknown claim status code (CSC): the STC composite's second component is outside the bundled snapshot. The verbatim code is preserved on the status; only its description is unavailable.",
  X12_834_UNKNOWN_MAINTENANCE_TYPE:
    "Unknown 834 maintenance type: the INS-03/HD-01 code is outside the bundled snapshot. The verbatim code is preserved on the enrollment and the action is NEVER inferred.",
  X12_UNPARSEABLE_DECIMAL:
    "Unparseable decimal: the element at `position.elementIndex` held bytes this library could not decode as a decimal, so NO value was decoded from it. Whatever occupies that slot on the model, including 0 and undefined, is a stand-in and is NOT a value the sender supplied. The verbatim bytes are preserved on the segment; read them there before acting on the amount, quantity or percent.",
  X12_837_SERVICE_LINE_NOT_DECODED:
    "837 service line with no decoded service segment: the Loop 2400 line opened at `position.segmentIndex` is followed by no SV1 / SV2 / SV3 matching the variant this submission resolved to, so NOTHING carried by the service segment was read. The line's `charge` and `units` are `undefined`, which is what this library puts on a decimal slot it decoded no value into; its procedure code, modifiers, unit of measure and place of service are equally undecoded. Two common causes: the line carries no SVx at all, or it carries one for a different 837 variant than ST-03 (or the caller's `type` option) named. Which side is wrong is NOT decided here, because a caller-supplied `type` can disagree with a perfectly conformant document. The verbatim segments are preserved on the transaction set; read them there before acting on the charge or the quantity.",
  X12_837_SERVICE_LINE_DROPPED:
    "837 service line dropped from the typed model: the LX at `position.segmentIndex` opened no Loop 2400, so no line appears on any claim's `serviceLines` for it and the SV1 / SV2 / SV3 that followed - its charge, units, procedure code and modifiers - was read into nothing. Compare `X12_837_SERVICE_LINE_NOT_DECODED`, where the line IS on the model and only its service segment went unread. Two causes: no Loop 2300 (CLM) is open at this LX, so there is no claim to attach a line to; or the submission's variant is not one of P / I / D, so no variant-specific line shape could be built. Read `submission.variant` and `submission.claims` to tell them apart; do NOT expect `X12_837_UNKNOWN_VARIANT` alongside this code, because a caller-supplied `type` outside P / I / D reaches the second cause without it. Nothing is fabricated to stand in for the missing line and no claim is synthesized. What becomes of a DTP / AMT / NTE / REF that follows the dropped LX depends on the route and this message does not say; see KNOWN-LIMITATIONS.md. The verbatim segments are preserved on the transaction set; read them there before concluding the claim had no service lines.",
  X12_837_SERVICE_SEGMENT_WITHOUT_LX:
    "837 service segment with no Loop 2400 to read it into: no service line was open at the SV1 / SV2 / SV3 at `position.segmentIndex`, so NOTHING it carries - its charge, units, procedure code, modifiers, unit of measure and place of service - was read. Read that literally: an LX may well appear earlier in the transaction, and what this reports is that none of them had opened a Loop 2400 still current at this segment. No line appears on any claim's `serviceLines` for it and nothing is fabricated to stand in. Compare the two codes anchored at an LX: `X12_837_SERVICE_LINE_DROPPED`, where an LX IS present and opened no line, and `X12_837_SERVICE_LINE_NOT_DECODED`, where the line is on the model and only its service segment went unread. Neither of those can report the SAME service segment as this code, because both are raised at an LX and this one only where no Loop 2400 is open; a document with several claims can still carry all three. This says NOTHING about how the submission's variant resolved: absent a caller-supplied `type` option, and where ST-03 names no known implementation convention, the reader falls back to the first SV1 / SV2 / SV3 in the transaction, and a segment reported here is eligible for that fallback like any other, so a stray one can decide the variant every line is read against. Read `submission.variant`. The verbatim segments are preserved on the transaction set; read them there before concluding the claim had no service lines.",
  X12_837_SERVICE_SEGMENT_REPEATED:
    "837 service segment repeated inside one Loop 2400: the SV1 / SV2 / SV3 at `position.segmentIndex` is not the first service segment to arrive in the service line the LX before it opened. This reader's line carries ONE service segment's worth of slots, so it cannot hold both, and this code is the only thing that tells you the document sent more than one. It asserts nothing about what usage the TR3s give the segment; what it reports is that this reader has one set of those slots per line. What the line carries is what the LAST service segment MATCHING the submission's resolved variant wrote onto it, and only that. Such a segment writes every slot its kind writes - the charge, the units and the procedure code among them - so a matching one arriving second leaves NOTHING an earlier matching one wrote, including where the later one's charge or units element is ABSENT: there the line is left with undefined, which is what this library puts on a decimal slot it decoded no value into, over an amount the earlier one stated. A service segment of a kind that does NOT match the resolved variant is read into nothing at all - it overwrites no slot, and what it carries reaches no part of the typed model. Which of them the sender meant is NOT decided here and is not derivable from the TR3s: this reader cannot tell a stray service segment from a conformant one, and picking a winner would be inventing. Nothing is fabricated to stand in, no second line is synthesized - an LX is what opens a line and there is none here - and no earlier value is kept in a second slot. Read the bound literally, as a property of the READ: this reports a second service segment arriving while a Loop 2400 IS open, whether or not it decoded. It is disjoint from `X12_837_SERVICE_SEGMENT_WITHOUT_LX`, which requires that NO Loop 2400 be open where this one requires that one is, so the two can never name the same segment; read that as disjointness and NOT as a promise that a service segment outside an open Loop 2400 is always named by that code, because a service segment FOLLOWING an LX that opened no line at all is named by neither of them, the loss having already been reported at that LX by `X12_837_SERVICE_LINE_DROPPED`. `X12_837_SERVICE_LINE_NOT_DECODED`, anchored at the LX, reports that no service segment matching the variant decoded onto the line at all, so a document can carry both codes on different segments. It fires once per repeat, so three service segments in one Loop 2400 are two warnings, and the count resets with the line: a first service segment under a later LX is a first and never a repeat. It says nothing about how the submission's variant resolved; where the fallback decided that and the body names more than one, `X12_837_AMBIGUOUS_VARIANT` reports it separately. The verbatim segments are preserved on the transaction set; read them there before acting on the charge, the quantity or the procedure code.",
  X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX:
    "837 entity segment read into nothing after a dropped LX: the N3 / N4 / PER / REF at `position.segmentIndex` arrived while no entity loop was open, because an earlier LX in this transaction opened no Loop 2400 (no CLM was open at it) and closed the entity loop that was current there. NOTHING this segment carries reached the model: no party's `address`, `contacts` or `references` was written from it, and no party, claim or line was synthesized to hold it. This is the code that names THAT loss; `X12_837_SERVICE_LINE_DROPPED` is raised at the LX itself and names the SERVICE LINE's loss, never an entity segment, so the two report different things about the same stretch of the document. Read the bound literally, because this code does NOT report every unattached entity segment: it reports one discarded after such an LX and only while nothing since has opened a new loop, so an N3 / N4 / PER / REF that reaches no party by any other route is still silent, and one arriving after a later NM1 is outside this code's scope, whether or not this reader surfaces that segment kind on that party. It reports that the segment reached NO party; it does not claim it would have reached one had the LX been absent, because this reader does not surface every one of these segment kinds on every party (a PER on a patient or a pay-to address, for one). Which party a segment following a stray LX belongs to is not derivable from the TR3s in either direction, so it is discarded rather than attributed: see KNOWN-LIMITATIONS.md. The verbatim segments are preserved on the transaction set; read them there before concluding a party had no address, no secondary identifier or no contact.",
  X12_837_PAY_TO_ADDRESS_REPEATED:
    "837 pay-to address named more than once in one Loop 2000A: the NM1*87 at `position.segmentIndex` is not the first in this Loop 2000A, and the TR3s allow Loop 2010AB at most once there. The model has ONE pay-to address slot, so it cannot carry both, and this code is the only thing that tells you the document named more than one. The reader NEVER merges them: an N3 or N4 after this segment can no longer add a street line to, or fill a blank in, the address an earlier NM1*87 named, which is what this library did through 0.0.12 - it returned a fused address no sender sent, silently. What the slot carries instead is the LAST occurrence that stated an address of its own; an occurrence that states none - one carrying no N3 or N4 at all, or only a valueless N3 or N4 whose elements are empty - does NOT replace one that did, so nothing an earlier occurrence stated is blanked either. Where no occurrence states an address, the slot holds what the FIRST N3 or N4 to arrive under any of them produced, which may be an address with no elements at all, and which is not necessarily the first occurrence's: an occurrence that carries no N3 or N4 writes nothing, so a later one's valueless N3 is the first write and takes a slot still empty. Read that as the corner it is, and never restate it as the first OCCURRENCE winning. Which occurrence the sender meant is NOT decided here and is not derivable from the TR3s, and the losing occurrence's address is NOT on the model in any form. Read the bound literally: this reports repetition within one Loop 2000A, which is where the pay-to route lives, and an NM1*87 arriving while a CLM is open never reaches that route. The verbatim segments are preserved on the transaction set; read them there before acting on where a payment is to be sent.",
  X12_AMOUNT_ROW_DROPPED:
    "Amount row dropped from the typed model: the AMT or ADX at `position.segmentIndex` carried no decodable amount (AMT-02, ADX-01), so NO row was built for it and the rest of the segment went with it - its qualifier or adjustment reason code, and any reference qualifier and id. Nothing is fabricated to stand in: a row is not built around a zero this library did not read, which is why the loss is reported rather than papered over. Two routes reach it and this code does not say which: the amount element was ABSENT, or it was present and held bytes that do not decode as a decimal. On this segment only the second route also raises `X12_UNPARSEABLE_DECIMAL`, carrying the failing element in its own `position.elementIndex`, so whether one is present at this `position.segmentIndex` is what separates them - and that code is unchanged by this one, which is raised alongside it rather than in place of it. Read the bound literally: this reports a row whose AMOUNT was read and decoded no value, and it is NOT a general report that an amount segment reached no model. A segment a reader discards before reading its amount is not on this channel, and neither is one whose amount decoded and then found no claim, service line, coverage or remittance open to attach the row to. An 820 RMR is not on it either, for its own reason: that row is dropped on open-item IDENTITY, RMR-01 and RMR-02 both empty, before the amount is read at all, so an RMR that states an open item and no amount keeps its row with amountPaid undefined while one that states an amount and no open item is dropped whole. That second case is a separate loss, and so is an 837 AMT that decoded while a Loop 2430 adjudication was open; `X12_STATED_AMOUNT_DISCARDED` reports both, and this code reports neither. The two can never name the same segment, because this one requires an amount element that decoded no value and that one requires the opposite. The verbatim segments are preserved on the transaction set; read them there before concluding the document stated no such amount.",
  X12_STATED_AMOUNT_DISCARDED:
    "Stated amount discarded: the RMR or AMT at `position.segmentIndex` populated its amount element and this reader built NO row for it, for a reason that is not a failure to decode that amount. What the sender wrote reaches no part of the typed model, so an empty list of open items or amounts is not evidence the sender stated none. Read that as the only claim made here: this code does NOT assert the amount is decodable, and on the RMR route below it is raised without the bytes ever being DECODED, so they may be unreadable, blank-but-present, or a lone component separator. Two routes reach it and this code does not say which. First, an 820 RMR whose RMR-01 and RMR-02 are BOTH empty while a remittance loop is open: the open item is refused on identity before RMR-04 or RMR-05 is read at all, so a stated payment amount, a stated amount due and the payment action code beside them go together. Second, an 837 AMT arriving while a Loop 2430 line adjudication is open: AMT-02 decoded, and the v1 adjudication model carries no amount row to put it on, so the row is skipped. Compare `X12_AMOUNT_ROW_DROPPED`, which reports the other situation on the same segments: there the amount element decoded no value, so there was no row to build at all. The two can never name the same segment. Read the bound literally, as a property of the READ: this reports a segment whose amount element the sender populated, arriving while the loop that would carry its row was open. It does NOT report an AMT or ADX that reaches a reader with no such loop open, which stays silent and is recorded in KNOWN-LIMITATIONS.md. And on the RMR route it says nothing about whether that amount WOULD have decoded, because the row is refused before the decode is attempted, so no `X12_UNPARSEABLE_DECIMAL` accompanies it even where the bytes are unreadable. Nothing is fabricated to stand in. The verbatim segments are preserved on the transaction set; read them there before concluding the document stated no such amount.",
} as const;

/**
 * Every message string this library can put on a warning. Exported so a
 * consumer, or a conformance gate, can assert set membership: if
 * `ALL_WARNING_MESSAGES.has(w.message)` is ever false, something
 * interpolated document bytes into a diagnostic.
 *
 * @example
 * ```ts
 * import { parseX12, ALL_WARNING_MESSAGES } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * ix.warnings.every((w) => ALL_WARNING_MESSAGES.has(w.message)); // true, always
 * ```
 */
export const ALL_WARNING_MESSAGES: ReadonlySet<string> = new Set<string>(
  Object.values(WARNING_MESSAGES),
);

/** @internal */
const UNEXPECTED_SEGMENT_MESSAGES: Readonly<Record<X12UnexpectedSegmentContext, string>> = {
  [UNEXPECTED_SEGMENT_CONTEXTS.TA1_INSIDE_GROUP]:
    WARNING_MESSAGES.X12_UNEXPECTED_SEGMENT_TA1_INSIDE_GROUP,
  [UNEXPECTED_SEGMENT_CONTEXTS.GE_WITHOUT_GS]:
    WARNING_MESSAGES.X12_UNEXPECTED_SEGMENT_GE_WITHOUT_GS,
  [UNEXPECTED_SEGMENT_CONTEXTS.ST_WITHOUT_GS]:
    WARNING_MESSAGES.X12_UNEXPECTED_SEGMENT_ST_WITHOUT_GS,
  [UNEXPECTED_SEGMENT_CONTEXTS.SE_WITHOUT_ST]:
    WARNING_MESSAGES.X12_UNEXPECTED_SEGMENT_SE_WITHOUT_ST,
  [UNEXPECTED_SEGMENT_CONTEXTS.BODY_OUTSIDE_TRANSACTION]:
    WARNING_MESSAGES.X12_UNEXPECTED_SEGMENT_BODY_OUTSIDE_TRANSACTION,
};

/** @internal */
const CONTROL_NUMBER_PAIR_MESSAGES: Readonly<Record<X12ControlNumberPair, string>> = {
  [CONTROL_NUMBER_PAIRS.INTERCHANGE]: WARNING_MESSAGES.X12_CONTROL_NUMBER_MISMATCH_INTERCHANGE,
  [CONTROL_NUMBER_PAIRS.GROUP]: WARNING_MESSAGES.X12_CONTROL_NUMBER_MISMATCH_GROUP,
  [CONTROL_NUMBER_PAIRS.TRANSACTION]: WARNING_MESSAGES.X12_CONTROL_NUMBER_MISMATCH_TRANSACTION,
};

/** @internal */
const BALANCE_INVARIANT_MESSAGES: Readonly<Record<X12BalanceInvariant, string>> = {
  [BALANCE_INVARIANTS.CLAIM]: WARNING_MESSAGES.X12_835_REMIT_BALANCE_MISMATCH_CLAIM,
  [BALANCE_INVARIANTS.SERVICE_LINE]: WARNING_MESSAGES.X12_835_REMIT_BALANCE_MISMATCH_SERVICE_LINE,
  [BALANCE_INVARIANTS.REMIT_TOTAL]: WARNING_MESSAGES.X12_835_REMIT_BALANCE_MISMATCH_REMIT_TOTAL,
};

/** @internal */
const BALANCE_NOT_EVALUABLE_MESSAGES: Readonly<Record<X12BalanceInvariant, string>> = {
  [BALANCE_INVARIANTS.CLAIM]: WARNING_MESSAGES.X12_835_BALANCE_NOT_EVALUABLE_CLAIM,
  [BALANCE_INVARIANTS.SERVICE_LINE]: WARNING_MESSAGES.X12_835_BALANCE_NOT_EVALUABLE_SERVICE_LINE,
  [BALANCE_INVARIANTS.REMIT_TOTAL]: WARNING_MESSAGES.X12_835_BALANCE_NOT_EVALUABLE_REMIT_TOTAL,
};

/** @internal */
const REQUIRED_LOOP_MESSAGES: Readonly<Record<X12RequiredLoop, string>> = {
  [REQUIRED_LOOPS.BILLING_PROVIDER_2000A]: WARNING_MESSAGES.X12_MISSING_REQUIRED_LOOP_2000A,
  [REQUIRED_LOOPS.SUBSCRIBER_2000B]: WARNING_MESSAGES.X12_MISSING_REQUIRED_LOOP_2000B,
  [REQUIRED_LOOPS.SUBSCRIBER_NAME_2010BA]: WARNING_MESSAGES.X12_MISSING_REQUIRED_LOOP_2010BA,
  [REQUIRED_LOOPS.PAYER_NAME_2010BB]: WARNING_MESSAGES.X12_MISSING_REQUIRED_LOOP_2010BB,
};

/**
 * Data shape for every Tier-2 warning emitted by the parser. Warnings are
 * plain data (distinct from `X12ParseError`, which is a thrown `Error`
 * subclass) so they can be safely accumulated on `X12Interchange.warnings`
 * and passed to `onWarning` callbacks.
 *
 * `message` is always a member of {@link ALL_WARNING_MESSAGES}: it names
 * the deviation, never the bytes that caused it. `position` says where to
 * look and the bytes stay on the model. A warning has no `snippet`.
 *
 * @example
 * ```ts
 * import type { X12ParseWarning } from "@cosyte/x12";
 * declare const w: X12ParseWarning;
 * w.code; // "X12_PRE_005010"
 * w.position; // { segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 }
 * ```
 */
export interface X12ParseWarning {
  readonly code: X12WarningCode;
  readonly message: string;
  readonly position: X12Position;
}

/**
 * Build an `X12_CONTROL_NUMBER_MISMATCH` warning. Emitted when an
 * envelope-trailer control number does not match its matching header:
 * ISA-13 ↔ IEA-02, GS-06 ↔ GE-02, or ST-02 ↔ SE-02.
 *
 * Neither side is echoed, not truncated and not hashed. A control number is
 * free-form trading-partner text on five of the six slots (only ISA-13 is
 * fixed-width), routinely carries a batch or patient-account identifier in
 * the field, and is entirely sender-controlled.
 *
 * @example
 * ```ts
 * import { controlNumberMismatch, CONTROL_NUMBER_PAIRS } from "@cosyte/x12";
 * const w = controlNumberMismatch(
 *   { segmentIndex: 6, interchangeIndex: 0, elementIndex: 2 },
 *   CONTROL_NUMBER_PAIRS.INTERCHANGE,
 * );
 * ```
 */
export function controlNumberMismatch(
  position: X12Position,
  pair: X12ControlNumberPair,
): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
    message: CONTROL_NUMBER_PAIR_MESSAGES[pair],
    position,
  };
}

/**
 * Build an `X12_PRE_005010` warning. Emitted when the twelfth element of the
 * ISA split does not read `00501`, the HIPAA-mandated baseline interchange
 * control version number. The code name reads as a
 * "pre-005010" test and the guard is an inequality, so a LATER family
 * (`00602`, `00700`) raises it too. The parser still
 * accepts the input (Postel's Law: lenient on parse) but flags the
 * mismatch so consumers know the input may diverge from 005010 semantics.
 *
 * The guard reads that element, so raising this code does NOT establish that
 * the header split into `ISA` plus 16 elements and does not assert what ISA-12
 * itself declares. Where `X12_ISA_EXTRA_ELEMENT_SEPARATOR` is also present the
 * element read may be a displaced one; `isa.raw` carries all 106 bytes and with
 * the ISA fixed widths is the route back.
 *
 * @example
 * ```ts
 * import { pre005010 } from "@cosyte/x12";
 * const w = pre005010({ segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 });
 * ```
 */
export function pre005010(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_PRE_005010,
    message: WARNING_MESSAGES.X12_PRE_005010,
    position,
  };
}

/**
 * Build an `X12_ISA_EXTRA_ELEMENT_SEPARATOR` warning. Emitted when the ISA
 * element area (bytes 0..104) splits on the detected element separator into
 * anything other than `["ISA", e1, …, e16]`.
 *
 * `detectDelimiters` has already verified that the separator sits at all 16
 * fixed 005010 positions, so the split can only come out LONGER than 17: an
 * ISA element value is itself carrying the byte that was declared in-band as
 * the element separator. The interchange is not 005010-conformant either way,
 * and the parser does not choose between the two readings of that byte - it
 * reports that the header did not frame and leaves `isa.elements` exactly as
 * the split produced it, with `isa.raw` carrying all 106 bytes verbatim.
 *
 * `decodeEnvelope` raises this ahead of every warning it raises after it,
 * because when it is present the ISA-derived diagnostics that follow
 * (`X12_PRE_005010` off `elements[12]`, `X12_CONTROL_NUMBER_MISMATCH` off
 * `elements[13]`) may be reading a displaced element rather than the one they
 * name. **That is a statement about `parseX12`'s `warnings` (and `onWarning`)
 * and about nothing else.** `serializeX12(ix, { specClean: true })` runs its own
 * reconciliation off `interchange.isa.elements[13]` with no arity awareness and
 * never raises this code, so on that channel a lone
 * `X12_CONTROL_NUMBER_MISMATCH` can be a displaced read - and its absence is not
 * evidence the header framed. Filed, not fixed here.
 *
 * @example
 * ```ts
 * import { isaExtraElementSeparator } from "@cosyte/x12";
 * const w = isaExtraElementSeparator({ segmentIndex: 0, interchangeIndex: 0 });
 * ```
 */
export function isaExtraElementSeparator(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_ISA_EXTRA_ELEMENT_SEPARATOR,
    message: WARNING_MESSAGES.X12_ISA_EXTRA_ELEMENT_SEPARATOR,
    position,
  };
}

/**
 * Build an `X12_GROUP_COUNT_MISMATCH` warning. Emitted when IEA-01 does not
 * equal the actual number of GS..GE groups present in the interchange.
 * Trading partners use this to detect transmission truncation. Both numbers
 * stay on the model and neither is silently corrected.
 *
 * @example
 * ```ts
 * import { groupCountMismatch } from "@cosyte/x12";
 * const w = groupCountMismatch({ segmentIndex: 5, interchangeIndex: 0, elementIndex: 1 });
 * ```
 */
export function groupCountMismatch(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_GROUP_COUNT_MISMATCH,
    message: WARNING_MESSAGES.X12_GROUP_COUNT_MISMATCH,
    position,
  };
}

/**
 * Build an `X12_TRANSACTION_COUNT_MISMATCH` warning. Emitted when GE-01
 * does not equal the actual number of ST..SE transaction sets present in
 * the group. Both numbers stay on the model.
 *
 * @example
 * ```ts
 * import { transactionCountMismatch } from "@cosyte/x12";
 * const w = transactionCountMismatch({ segmentIndex: 4, groupIndex: 0, elementIndex: 1 });
 * ```
 */
export function transactionCountMismatch(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_TRANSACTION_COUNT_MISMATCH,
    message: WARNING_MESSAGES.X12_TRANSACTION_COUNT_MISMATCH,
    position,
  };
}

/**
 * Build an `X12_SEGMENT_COUNT_MISMATCH` warning. Emitted by the spec-clean
 * serializer when an SE-01 value does not equal the actual number of
 * segments in the transaction set it closes (ST through SE inclusive).
 * Corrected counts are emitted only on `serializeX12(ix, { specClean: true,
 * recomputeCounts: true })`. The parser does not emit this code (it leaves
 * SE-01 reconciliation to the emit half); it is a serializer diagnostic.
 *
 * @example
 * ```ts
 * import { segmentCountMismatch } from "@cosyte/x12";
 * const w = segmentCountMismatch({ segmentIndex: 2, transactionIndex: 0, elementIndex: 1 });
 * ```
 */
export function segmentCountMismatch(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_SEGMENT_COUNT_MISMATCH,
    message: WARNING_MESSAGES.X12_SEGMENT_COUNT_MISMATCH,
    position,
  };
}

/**
 * Build an `X12_TRAILING_GARBAGE` warning. Emitted when non-empty bytes
 * appear after the IEA segment terminator and any optional CRLF. The bytes
 * are preserved verbatim on {@link
 * "./types.js".X12Interchange}.`trailingBytes` so consumers can inspect,
 * measure, or re-emit them. Common cause: a second interchange concatenated
 * into the same file (multi-ISA, out of v1 scope; only the first
 * interchange is decoded).
 *
 * @example
 * ```ts
 * import { trailingGarbage } from "@cosyte/x12";
 * const w = trailingGarbage({ segmentIndex: 6, interchangeIndex: 0 });
 * ```
 */
export function trailingGarbage(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_TRAILING_GARBAGE,
    message: WARNING_MESSAGES.X12_TRAILING_GARBAGE,
    position,
  };
}

/**
 * Build an `X12_MISSING_IEA` warning. Emitted when the input opened a
 * valid ISA but EOF arrived before any IEA segment. The parser returns the
 * groups it managed to decode with `iea: undefined`; the warning surfaces
 * the structural break so consumers know the interchange is truncated.
 *
 * @example
 * ```ts
 * import { missingIea } from "@cosyte/x12";
 * const w = missingIea({ segmentIndex: 4, interchangeIndex: 0 });
 * ```
 */
export function missingIea(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_MISSING_IEA,
    message: WARNING_MESSAGES.X12_MISSING_IEA,
    position,
  };
}

/**
 * Build an `X12_MISSING_GE` warning. Emitted when a GS opened a functional
 * group but no matching GE appeared before the next GS or IEA. The parser
 * returns the group with `ge: undefined` and the transactions it managed
 * to collect.
 *
 * @example
 * ```ts
 * import { missingGe } from "@cosyte/x12";
 * const w = missingGe({ segmentIndex: 3, interchangeIndex: 0, groupIndex: 0 });
 * ```
 */
export function missingGe(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_MISSING_GE,
    message: WARNING_MESSAGES.X12_MISSING_GE,
    position,
  };
}

/**
 * Build an `X12_MISSING_SE` warning. Emitted when an ST opened a
 * transaction set but no matching SE appeared before the next ST, GE, or
 * IEA. The parser returns the transaction with `se: undefined` and the
 * segments it managed to collect.
 *
 * @example
 * ```ts
 * import { missingSe } from "@cosyte/x12";
 * const w = missingSe({ segmentIndex: 2, groupIndex: 0, transactionIndex: 0 });
 * ```
 */
export function missingSe(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_MISSING_SE,
    message: WARNING_MESSAGES.X12_MISSING_SE,
    position,
  };
}

/**
 * Build an `X12_DANGLING_RELEASE_CHAR` warning. Emitted when a release
 * character (`?` per ASC X12 convention; see
 * {@link "./release.js".RELEASE_CHAR}) appears at the end of a segment or
 * element with no following byte to escape - the bytes are preserved
 * verbatim so round-trip stays byte-exact, but the structural truncation
 * is flagged so consumers can decide how to react.
 *
 * @example
 * ```ts
 * import { danglingReleaseChar } from "@cosyte/x12";
 * const w = danglingReleaseChar({ segmentIndex: 7, interchangeIndex: 0 });
 * ```
 */
export function danglingReleaseChar(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_DANGLING_RELEASE_CHAR,
    message: WARNING_MESSAGES.X12_DANGLING_RELEASE_CHAR,
    position,
  };
}

/**
 * Build an `X12_UNEXPECTED_SEGMENT` warning. Emitted when a structurally
 * meaningful segment (`GE`, `SE`, `ST`, `TA1`, or a body segment) appears
 * outside its expected parent. The parser preserves lenient-never-throw and
 * continues; `context` names which structural rule broke and `position`
 * locates the segment.
 *
 * The segment's own id is deliberately not a parameter. Note that a segment
 * in one of these positions is NOT retained on the model at all (it has no
 * open container to belong to), so `position.segmentIndex` against the input
 * is the only way back to its bytes. For a segment that IS retained, the
 * `X12Segment.id` a consumer reads is bounded to the X12 segment-id grammar
 * (see {@link "./segment.js".decodeSegment}) while `seg.raw` and
 * `seg.elements[0]` stay verbatim.
 *
 * @example
 * ```ts
 * import { unexpectedSegment, UNEXPECTED_SEGMENT_CONTEXTS } from "@cosyte/x12";
 * const w = unexpectedSegment(
 *   { segmentIndex: 12, interchangeIndex: 0 },
 *   UNEXPECTED_SEGMENT_CONTEXTS.GE_WITHOUT_GS,
 * );
 * ```
 */
export function unexpectedSegment(
  position: X12Position,
  context: X12UnexpectedSegmentContext,
): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_UNEXPECTED_SEGMENT,
    message: UNEXPECTED_SEGMENT_MESSAGES[context],
    position,
  };
}

/**
 * Build an `X12_835_REMIT_BALANCE_MISMATCH` warning. Emitted by the 835
 * helper when a TR3 X221A1 §1.10.2 balance invariant fails. `invariant`
 * names which equation broke; the spec'd, computed and delta amounts stay
 * on the model as {@link "../decimal.js".X12Decimal} values and are never
 * rendered into the message.
 *
 * The parser ALWAYS surfaces this and NEVER silently rebalances. To report
 * the numbers, recompute them from the model: `claim.totalChargeAmount`,
 * `claim.totalPaymentAmount` and the CAS adjustments are all present.
 *
 * @example
 * ```ts
 * import { remitBalanceMismatch, BALANCE_INVARIANTS } from "@cosyte/x12";
 * const w = remitBalanceMismatch(
 *   { segmentIndex: 12, groupIndex: 0, transactionIndex: 0 },
 *   BALANCE_INVARIANTS.CLAIM,
 * );
 * ```
 */
export function remitBalanceMismatch(
  position: X12Position,
  invariant: X12BalanceInvariant,
): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
    message: BALANCE_INVARIANT_MESSAGES[invariant],
    position,
  };
}

/**
 * Build an `X12_835_BALANCE_NOT_EVALUABLE` warning. Emitted where a term of
 * a TR3 X221A1 §1.10.2 invariant is `undefined` on the model, so the
 * equation has nothing to compare on one side. `invariant` names which
 * equation could not be run.
 *
 * This is deliberately a DIFFERENT code from
 * {@link remitBalanceMismatch}: that one asserts a computed inequality
 * between amounts the sender supplied, and this one asserts only that the
 * comparison could not be made. Reading an absent term as `0` is what made
 * the two indistinguishable before `X12Decimal | undefined`, and it is the
 * thing this code exists to stop.
 *
 * @example
 * ```ts
 * import { balanceNotEvaluable, BALANCE_INVARIANTS } from "@cosyte/x12";
 * const w = balanceNotEvaluable(
 *   { segmentIndex: 12, groupIndex: 0, transactionIndex: 0 },
 *   BALANCE_INVARIANTS.CLAIM,
 * );
 * ```
 */
export function balanceNotEvaluable(
  position: X12Position,
  invariant: X12BalanceInvariant,
): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE,
    message: BALANCE_NOT_EVALUABLE_MESSAGES[invariant],
    position,
  };
}

/**
 * Build an `X12_UNKNOWN_CARC` warning. Emitted when a CAS adjustment
 * carries a CARC code outside the bundled snapshot (see
 * {@link "../code-lists/carc.js".CARC}). The verbatim code is preserved on
 * the parsed adjustment (`adjustment.reasonCode`); only the description is
 * missing.
 *
 * @example
 * ```ts
 * import { unknownCarc } from "@cosyte/x12";
 * const w = unknownCarc({ segmentIndex: 14, groupIndex: 0, transactionIndex: 0 });
 * ```
 */
export function unknownCarc(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_UNKNOWN_CARC,
    message: WARNING_MESSAGES.X12_UNKNOWN_CARC,
    position,
  };
}

/**
 * Build an `X12_UNKNOWN_RARC` warning. Companion to {@link unknownCarc}
 * for RARC codes on `MIA` / `MOA` / `LQ` / `NTE`. Same verbatim-preserve
 * posture; the code lives on the parsed remark.
 *
 * @example
 * ```ts
 * import { unknownRarc } from "@cosyte/x12";
 * const w = unknownRarc({ segmentIndex: 16, groupIndex: 0, transactionIndex: 0 });
 * ```
 */
export function unknownRarc(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_UNKNOWN_RARC,
    message: WARNING_MESSAGES.X12_UNKNOWN_RARC,
    position,
  };
}

/**
 * Build an `X12_HL_PARENT_MISMATCH` warning. Emitted when an HL segment's
 * HL-02 (parent id) does not match any earlier-emitted HL-01 in the same
 * transaction. The walker NEVER silently re-numbers the hierarchy (HL
 * parent-pointer integrity is the safety primitive of the 837), so the
 * declared pointer stays verbatim on `hierarchy.parentHlId` and the warning
 * reports only that the pointer is dangling, and where.
 *
 * @example
 * ```ts
 * import { hlParentMismatch } from "@cosyte/x12";
 * const w = hlParentMismatch({ segmentIndex: 14, groupIndex: 0, transactionIndex: 0 });
 * ```
 */
export function hlParentMismatch(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_HL_PARENT_MISMATCH,
    message: WARNING_MESSAGES.X12_HL_PARENT_MISMATCH,
    position,
  };
}

/**
 * Build an `X12_HL_PARENT_LEVEL_INVALID` warning. Emitted when an HL's
 * level code (HL-03) is inconsistent with its declared parent's level code
 * per the TR3 (e.g. a `22` Subscriber claiming a `22` Subscriber as its
 * parent, where the parent must be `20` Information Source). Both level
 * codes stay verbatim on the model.
 *
 * @example
 * ```ts
 * import { hlParentLevelInvalid } from "@cosyte/x12";
 * const w = hlParentLevelInvalid({ segmentIndex: 14, groupIndex: 0, transactionIndex: 0 });
 * ```
 */
export function hlParentLevelInvalid(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_HL_PARENT_LEVEL_INVALID,
    message: WARNING_MESSAGES.X12_HL_PARENT_LEVEL_INVALID,
    position,
  };
}

/**
 * Build an `X12_UNKNOWN_HI_QUALIFIER` warning. Emitted by the 837 / 278
 * helpers when an HI composite's qualifier (first component) is outside the
 * bundled snapshot at {@link "../code-lists/hi-qualifiers.js".
 * HI_QUALIFIERS}. The verbatim qualifier and code are preserved on the
 * parsed diagnosis / procedure with `codeSystem: "unknown"` so consumers
 * can still react.
 *
 * @example
 * ```ts
 * import { unknownHiQualifier } from "@cosyte/x12";
 * const w = unknownHiQualifier({ segmentIndex: 25, groupIndex: 0, transactionIndex: 0 });
 * ```
 */
export function unknownHiQualifier(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER,
    message: WARNING_MESSAGES.X12_UNKNOWN_HI_QUALIFIER,
    position,
  };
}

/**
 * Build an `X12_MISSING_REQUIRED_LOOP` warning. Emitted when a TR3-required
 * loop is structurally absent (e.g. no Loop 2010BB Payer Name inside a
 * Subscriber HL). The parser does not enforce situational rules: only loops
 * marked `usage: "required"` in the loop spec fire this warning, so the
 * loop id and its rationale are both library constants.
 *
 * @example
 * ```ts
 * import { missingRequiredLoop, REQUIRED_LOOPS } from "@cosyte/x12";
 * const w = missingRequiredLoop(
 *   { segmentIndex: 12, groupIndex: 0, transactionIndex: 0 },
 *   REQUIRED_LOOPS.PAYER_NAME_2010BB,
 * );
 * ```
 */
export function missingRequiredLoop(position: X12Position, loop: X12RequiredLoop): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_MISSING_REQUIRED_LOOP,
    message: REQUIRED_LOOP_MESSAGES[loop],
    position,
  };
}

/**
 * Build an `X12_837_UNKNOWN_VARIANT` warning. Emitted when the 837 helper
 * cannot resolve the variant from ST-03's implementation-convention
 * reference AND no SVx service-line segment is present to fall back on.
 * The parsed submission still ships with `variant: "unknown"`, and the
 * walker does its best on shared structure (envelope, HL, claim header) and
 * skips variant-specific service-line decoding. **This message deliberately
 * points at no model field.** Recognition reads `ST-03` as FRAMED while
 * `submission.implementationConventionReference` is decoded of any `?` release
 * escape, so on a document that escapes a delimiter inside `ST-03` the two
 * differ and the model field can hold an identifier this code just said was
 * not recognised. A pointer stood here and
 * in the message text and is DELETED, not reworded.
 *
 * `get837Claims` anchors this at the **ST**, which is `tx.segments[0]` and
 * carries the ST-03 the resolution reads. Through `0.0.10` it passed
 * `segmentIndex: 1`, which is the BHT and has no part in resolving a variant.
 *
 * @example
 * ```ts
 * import { unknown837Variant } from "@cosyte/x12";
 * const w = unknown837Variant({ segmentIndex: 0, groupIndex: 0, transactionIndex: 0 });
 * ```
 */
export function unknown837Variant(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_837_UNKNOWN_VARIANT,
    message: WARNING_MESSAGES.X12_837_UNKNOWN_VARIANT,
    position,
  };
}

/**
 * Build an `X12_837_AMBIGUOUS_VARIANT` warning. Emitted by the 837 helper
 * when the SVx fall-back is what resolved the variant AND the transaction
 * body carries service segments naming more than one variant, so the
 * resolution is a guess between contradictory evidence. The submission still
 * ships with the resolved variant on `submission.variant`; nothing about how
 * any claim or line decodes is changed by this warning.
 *
 * It reports the RESOLUTION, not the document. A caller-supplied `opts.type`
 * wins ahead of the fall-back, and so does an ST-03 naming one of the three
 * known implementation-convention references, and in either case no guess was
 * made and this code is not raised however mixed the body is.
 *
 * Which service segment is the stray one is deliberately not decided: this
 * reader cannot tell a stray service segment from a conformant one, and the
 * fall-back takes the first in the body whether or not a Loop 2400 was open
 * at it. Distinct from {@link unknown837Variant}, which is raised where
 * NOTHING resolved a variant; the two can never travel together, because a
 * body with conflicting service segments has at least one to fall back on.
 *
 * `get837Claims` anchors this at the **ST**, which is `tx.segments[0]` and
 * carries the ST-03 that would have settled the question. No `elementIndex`
 * is set: the conflict is a property of the body rather than of an element,
 * and one route into it is an ST-03 that is absent altogether.
 *
 * @example
 * ```ts
 * import { ambiguous837Variant } from "@cosyte/x12";
 * const w = ambiguous837Variant({ segmentIndex: 0, transactionIndex: 0 });
 * ```
 */
export function ambiguous837Variant(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_837_AMBIGUOUS_VARIANT,
    message: WARNING_MESSAGES.X12_837_AMBIGUOUS_VARIANT,
    position,
  };
}

/**
 * Build an `X12_837_SERVICE_LINE_NOT_DECODED` warning. Emitted by the 837
 * helper when a Loop 2400 service line is closed without ever having
 * decoded an SV1 / SV2 / SV3 for the resolved variant: either the line
 * carries no SVx at all, or it carries one belonging to a different 837
 * variant than ST-03 (or the caller's `type` option) named. The line is
 * still retained, and every segment stays verbatim on the transaction set,
 * but the line's `charge` and `units` are `undefined` rather than anything
 * read off the wire. Through `0.0.12` they were the accumulator's seeded
 * `X12Decimal.ZERO`, which a consumer could not tell from a charge of zero
 * the sender did state. `position` names the LX segment that opened the
 * line.
 *
 * @example
 * ```ts
 * import { serviceLineNotDecoded } from "@cosyte/x12";
 * const w = serviceLineNotDecoded({ segmentIndex: 9, transactionIndex: 0 });
 * ```
 */
export function serviceLineNotDecoded(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED,
    message: WARNING_MESSAGES.X12_837_SERVICE_LINE_NOT_DECODED,
    position,
  };
}

/**
 * Build an `X12_837_SERVICE_LINE_DROPPED` warning. Emitted by the 837
 * helper when an LX opens no Loop 2400 at all, so the service line never
 * reaches any claim's `serviceLines`: either no CLM is open at that point
 * in the walk, or the submission's variant is not one of `P` / `I` / `D`
 * and there is no variant-specific line shape to build. That second cause
 * is reachable WITHOUT `X12_837_UNKNOWN_VARIANT`, because a caller-supplied
 * `opts.type` outside the union (from JavaScript or a JSON payload) is a
 * variant this reader never resolved and never warned about. Distinct from
 * {@link serviceLineNotDecoded}, where the line IS retained and only its
 * service segment went unread. `position` names the LX itself - the same
 * anchor, for the same reason: it is the one segment present in every
 * case. Nothing is fabricated to stand in, and the segments stay verbatim
 * on the transaction set.
 *
 * @example
 * ```ts
 * import { serviceLineDropped } from "@cosyte/x12";
 * const w = serviceLineDropped({ segmentIndex: 7, transactionIndex: 0 });
 * ```
 */
export function serviceLineDropped(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
    message: WARNING_MESSAGES.X12_837_SERVICE_LINE_DROPPED,
    position,
  };
}

/**
 * Build an `X12_837_SERVICE_SEGMENT_WITHOUT_LX` warning. Emitted by the 837
 * helper when an SV1 / SV2 / SV3 arrives with no Loop 2400 open, so there is
 * no service line to decode it into and nothing the segment carries is read.
 * `position` names the service segment itself, because it is the only
 * segment the case has: the other two 837 service-line codes both anchor at
 * an LX, and there is no LX in scope here to anchor to. An LX may still
 * appear elsewhere in the transaction - in an earlier claim, say - so read
 * the condition as "no line was open", not as "the file has no LX".
 *
 * The three do not overlap on one segment. {@link serviceLineDropped} is
 * raised at an LX that opened no line, {@link serviceLineNotDecoded} at an
 * LX whose line was retained undecoded, and this one only where no line is
 * open. Nothing is fabricated to stand in and no line or claim is
 * synthesized; the segments stay verbatim on the transaction set.
 *
 * It says nothing about the submission's variant. A caller-supplied `type`
 * option wins first; absent one, and where ST-03 names no known
 * implementation convention, the reader falls back to the first
 * SV1 / SV2 / SV3 in the transaction, and a segment reported here is
 * eligible for that fallback like any other - pre-existing behaviour,
 * documented in `KNOWN-LIMITATIONS.md` and unchanged. Where that fallback
 * decided the variant and the body names more than one,
 * {@link ambiguous837Variant} reports the resolution as contested; it is
 * additive and does not change which documents reach this code.
 *
 * @example
 * ```ts
 * import { serviceSegmentWithoutLx } from "@cosyte/x12";
 * const w = serviceSegmentWithoutLx({ segmentIndex: 8, transactionIndex: 0 });
 * ```
 */
export function serviceSegmentWithoutLx(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX,
    message: WARNING_MESSAGES.X12_837_SERVICE_SEGMENT_WITHOUT_LX,
    position,
  };
}

/**
 * Build an `X12_837_SERVICE_SEGMENT_REPEATED` warning. Emitted by the 837
 * helper at the second and each subsequent `SV1` / `SV2` / `SV3` to arrive
 * inside one open Loop 2400. `position` names the repeated service segment
 * itself, which is the segment a consumer resolves back through
 * `tx.segments`; there is no `elementIndex`, because what is reported is a
 * second occurrence of the segment rather than a defect in any element of it.
 *
 * Once per repeat, so three service segments in one Loop 2400 are two
 * warnings. The count lives on the line and is cleared when the line flushes,
 * so a first service segment under a later `LX` is a first and never a
 * repeat - a scope, not a latch.
 *
 * **The rule the reader applies, because a consumer cannot infer it from a
 * one-slot model:** occurrences are never merged and the LAST one matching
 * the submission's resolved variant wins, writing every slot its kind writes.
 * So an earlier matching occurrence leaves nothing on the line, not even in a
 * slot the later one's own element is absent from - there the later one's
 * `undefined` replaces an amount the earlier one stated. Through `0.0.13` a
 * charge of `8500` and a CPT of `99213` were replaced by a repeat's `12` and
 * `99999` with `warnings: []`. An occurrence whose kind does NOT match the
 * resolved variant is read into nothing and overwrites nothing.
 *
 * It reports that the DOCUMENT sent more than one, and asserts nothing about
 * what usage the TR3s give the segment. It does not decide which occurrence
 * the sender meant: this reader cannot tell a stray service segment from a
 * conformant one, exactly as {@link ambiguous837Variant} records for the
 * variant fallback.
 *
 * Disjoint from {@link serviceSegmentWithoutLx} by construction - that one
 * fires only where no Loop 2400 is open and this one only where one is - so
 * the two can never name the same segment. Read that as disjointness only:
 * a service segment following an `LX` that opened no line is named by
 * NEITHER, because {@link serviceLineDropped} at that `LX` already reports
 * the loss and suppresses the orphan code. {@link serviceLineNotDecoded} is
 * raised at the `LX` and reports that no matching service segment decoded
 * onto the line at all; a document can carry both codes on different
 * segments.
 *
 * @example
 * ```ts
 * import { serviceSegmentRepeated } from "@cosyte/x12";
 * const w = serviceSegmentRepeated({ segmentIndex: 9, transactionIndex: 0 });
 * ```
 */
export function serviceSegmentRepeated(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_837_SERVICE_SEGMENT_REPEATED,
    message: WARNING_MESSAGES.X12_837_SERVICE_SEGMENT_REPEATED,
    position,
  };
}

/**
 * Build an `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` warning. Emitted by
 * the 837 helper for an `N3` / `N4` / `PER` / `REF` that reached no party
 * because an earlier `LX` with no `CLM` open closed the entity loop that was
 * current at it. `position` names the discarded segment itself, not the `LX`:
 * the loss is per segment (two `N3`s are two losses), and the segment is the
 * one thing a consumer needs to resolve back through `tx.segments`.
 *
 * It is the narrow companion to {@link serviceLineDropped}, which is raised at
 * that same `LX` and reports the SERVICE LINE. Neither reports what the other
 * does, and both can be on one transaction's channel.
 *
 * **Read its bound literally: this is not a general "unattached entity
 * segment" code.** It fires only after such an `LX` and only while nothing has
 * opened a new loop since, so an `N3` / `N4` / `PER` / `REF` that reaches no
 * party by any other route stays silent, exactly as it did before this code
 * existed. Widening it is a guard change and would be its own decision.
 *
 * It reports that the segment reached no party, NOT that it would have reached
 * one: this reader surfaces neither a `PER` on a patient nor one on a pay-to
 * address, on any release.
 *
 * @example
 * ```ts
 * import { entitySegmentDiscardedAfterLx } from "@cosyte/x12";
 * const w = entitySegmentDiscardedAfterLx({ segmentIndex: 8, transactionIndex: 0 });
 * ```
 */
export function entitySegmentDiscardedAfterLx(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX,
    message: WARNING_MESSAGES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX,
    position,
  };
}

/**
 * Build an `X12_837_PAY_TO_ADDRESS_REPEATED` warning. Emitted by the 837
 * helper at the second and each subsequent `NM1*87` within one Loop 2000A,
 * where the TR3s allow Loop 2010AB at most once. `position` names the
 * repeated `NM1*87` itself, which is the segment a consumer resolves back
 * through `tx.segments`; there is no `elementIndex`, because what is being
 * reported is a second occurrence of the segment rather than a defect in
 * any element of it.
 *
 * Once per repeat, so two repeats in one Loop 2000A are two warnings. The
 * counter resets at the Loop 2000A `HL`, beside the pay-to slot it guards -
 * a first `NM1*87` under a later billing provider is a first, not a repeat.
 *
 * It reports that the DOCUMENT named the pay-to address more than once. It
 * does NOT report that anything was mis-read, and it is not a service-line
 * or entity-segment code: nothing else on the channel says this, and this
 * says nothing about the other 837 codes' subjects.
 *
 * **The rule the reader applies, because a consumer cannot infer it from a
 * one-slot model:** occurrences are never merged, the last occurrence that
 * states an address of its own wins, and an occurrence that states none does
 * not blank one that did. "States an address" means exactly what the emit
 * side would write a segment for - see `./address-segments.ts`, which both
 * sides share so they cannot drift.
 *
 * @example
 * ```ts
 * import { payToAddressRepeated } from "@cosyte/x12";
 * const w = payToAddressRepeated({ segmentIndex: 12, transactionIndex: 0 });
 * ```
 */
export function payToAddressRepeated(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_837_PAY_TO_ADDRESS_REPEATED,
    message: WARNING_MESSAGES.X12_837_PAY_TO_ADDRESS_REPEATED,
    position,
  };
}

/**
 * Build an `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` warning. Emitted by the 277
 * / 277CA helpers when an STC composite's Claim Status Category Code
 * (CSCC, first component; X12 code source 507) is outside the bundled
 * snapshot. The verbatim CSCC is preserved on the parsed status; only the
 * description is missing.
 *
 * @example
 * ```ts
 * import { unknownClaimStatusCategory } from "@cosyte/x12";
 * const w = unknownClaimStatusCategory({ segmentIndex: 18, transactionIndex: 0 });
 * ```
 */
export function unknownClaimStatusCategory(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY,
    message: WARNING_MESSAGES.X12_UNKNOWN_CLAIM_STATUS_CATEGORY,
    position,
  };
}

/**
 * Build an `X12_UNKNOWN_CLAIM_STATUS` warning. Companion to
 * {@link unknownClaimStatusCategory} for the Claim Status Code (CSC, the
 * second component of an STC composite; X12 code source 508). Same
 * verbatim-preserve posture.
 *
 * @example
 * ```ts
 * import { unknownClaimStatus } from "@cosyte/x12";
 * const w = unknownClaimStatus({ segmentIndex: 18, transactionIndex: 0 });
 * ```
 */
export function unknownClaimStatus(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS,
    message: WARNING_MESSAGES.X12_UNKNOWN_CLAIM_STATUS,
    position,
  };
}

/**
 * Build an `X12_834_UNKNOWN_MAINTENANCE_TYPE` warning. Emitted by the 834
 * helper when a member-level `INS-03` (or a health-coverage `HD-01`)
 * maintenance type code falls outside the bundled snapshot (see
 * {@link "../code-lists/maintenance-type.js".MAINTENANCE_TYPE_CODES}).
 * Maintenance type is the 834's safety-critical field: an unknown action
 * code must NEVER be silently coerced to add / change / terminate, so the
 * verbatim code is preserved on the parsed enrollment and this warning
 * flags the gap.
 *
 * @example
 * ```ts
 * import { unknownMaintenanceType } from "@cosyte/x12";
 * const w = unknownMaintenanceType({ segmentIndex: 9, transactionIndex: 0 });
 * ```
 */
export function unknownMaintenanceType(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_834_UNKNOWN_MAINTENANCE_TYPE,
    message: WARNING_MESSAGES.X12_834_UNKNOWN_MAINTENANCE_TYPE,
    position,
  };
}

/**
 * Build an `X12_UNPARSEABLE_DECIMAL` warning. Emitted whenever an element
 * read as a decimal held bytes that are NOT empty and do not match the shape
 * {@link "../decimal.js".X12Decimal} decodes, `[+-]?digits(.digits?)?` - a
 * thousands separator, a currency symbol, `N/A`, two decimal points, a
 * trailing sign, and so on. That shape is what this library reads, stated as
 * such: no clause of X12.6 is cited for it here, so do not read the code as
 * an assertion about what type R does and does not permit.
 *
 * The warning is a property of the READ, not of what the caller does with
 * the result: it fires whether the decoded slot ends up on the model, is
 * discarded, or is replaced by a stand-in. That is what makes it countable
 * against the input rather than against the walker's control flow.
 *
 * `position.elementIndex` is the 1-indexed element that failed, so a
 * consumer can go read the verbatim bytes off the segment. The message
 * takes NO discriminant and deliberately does not name what landed in the
 * slot instead: this library's own readers now either leave the slot
 * `undefined` or drop the row entirely, and a reader built on
 * {@link "./segment.js".elementDecimalOrZero} still substitutes
 * `X12Decimal.ZERO`. The one thing true of all of them is that whatever
 * occupies that slot is not the sender's. Read the model field itself to
 * see which happened.
 *
 * @example
 * ```ts
 * import { unparseableDecimal } from "@cosyte/x12";
 * const w = unparseableDecimal({ segmentIndex: 3, transactionIndex: 0, elementIndex: 2 });
 * ```
 */
export function unparseableDecimal(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
    message: WARNING_MESSAGES.X12_UNPARSEABLE_DECIMAL,
    position,
  };
}

/**
 * Build an `X12_AMOUNT_ROW_DROPPED` warning. Emitted where an `AMT` or `ADX`
 * decoded no value from its amount element (AMT-02, ADX-01) and the reader
 * therefore built no row at all, so the qualifier or adjustment reason code
 * the sender did state is off the model with it.
 *
 * `position` names the `AMT` / `ADX` segment itself and carries NO
 * `elementIndex`: one of the two routes here is an absent element, and an
 * absent element has no index to name. The element the reader was reading is
 * fixed by the segment anyway - AMT-02 or ADX-01 - so the segment locates the
 * loss exactly.
 *
 * It is raised for BOTH routes to an undecoded amount, and
 * {@link unparseableDecimal} is unchanged by it: a present-but-undecodable
 * element still raises `X12_UNPARSEABLE_DECIMAL` at its own `elementIndex`,
 * now ALONGSIDE this code rather than instead of it, so a consumer predicate
 * written against that code alone still fires exactly where it did. The
 * absent route raises this code and nothing else, which is what tells the two
 * apart.
 *
 * Read the bound literally. This reports a row whose AMOUNT was read and
 * decoded no value. A segment a reader discards before reading its amount is
 * not on this channel, and neither is one whose amount decoded and then found
 * nothing open to attach the row to. An 820 `RMR` is not on it either, for its
 * own reason: `decodeRmr` drops on open-item IDENTITY, RMR-01 and RMR-02 both
 * empty, before the amount is read - so an `RMR` that states an open item and
 * no amount keeps its row with `amountPaid` `undefined`, while one that states
 * an amount and no open item is dropped whole. That second case is a separate
 * loss, as is an 837 `AMT` that decoded while a Loop 2430 adjudication was
 * open; {@link statedAmountDiscarded} reports both and this code reports
 * neither. Nothing is fabricated to stand in and the segments stay verbatim on
 * the transaction set.
 *
 * @example
 * ```ts
 * import { amountRowDropped } from "@cosyte/x12";
 * const w = amountRowDropped({ segmentIndex: 7, transactionIndex: 0 });
 * ```
 */
export function amountRowDropped(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    message: WARNING_MESSAGES.X12_AMOUNT_ROW_DROPPED,
    position,
  };
}

/**
 * Build an `X12_STATED_AMOUNT_DISCARDED` warning. Emitted where a segment
 * POPULATED its amount element, the loop that would carry its row was open,
 * and the reader built no row anyway - for a reason that is not a failure to
 * decode that amount. The money the sender wrote is on no part of the typed
 * model. **This code asserts nothing about whether that amount is decodable**:
 * route 2 below decoded it, route 1 never attempted the decode.
 *
 * Two routes, enumerated because a count without its list cannot correct
 * itself:
 *
 * 1. An 820 `RMR` under an open remittance loop whose RMR-01 and RMR-02 are
 *    BOTH empty while RMR-04 or RMR-05 is populated. `decodeRmr` refuses the
 *    open item on identity before either amount element is read, so a stated
 *    payment, a stated amount due and the payment action code beside them are
 *    lost together.
 * 2. An 837 `AMT` arriving while a Loop 2430 line adjudication (`SVD`) is
 *    open, whose AMT-02 decoded. The v1 adjudication model carries no amount
 *    row, so the row is skipped rather than attached to the service line,
 *    which is this reader's own line and not the other payer's.
 *
 * `position` names the `RMR` / `AMT` segment itself and carries NO
 * `elementIndex`: on the first route the loss spans RMR-04 and RMR-05 and no
 * single element names it, and on the second the element is fixed by the
 * segment.
 *
 * Read the bound as a property of the READ. This does NOT report an `AMT` or
 * `ADX` that reaches a reader with no loop open to carry its row at all: the
 * 834's `AMT` with no `HD` open, the 820's `ADX` with no remittance open, and
 * the 835's and the 837's `AMT` that decodes before any claim or service line
 * is open are all still silent, and recorded in `KNOWN-LIMITATIONS.md`. It is
 * additive: {@link unparseableDecimal} and {@link amountRowDropped} fire on
 * exactly the documents they fired on before. On route 1 no
 * `X12_UNPARSEABLE_DECIMAL` accompanies this code even where the amount bytes
 * are unreadable, because that route never attempts the decode - so never read
 * an unaccompanied instance as evidence the bytes are postable. Read them off
 * the segment and decode them yourself.
 *
 * @example
 * ```ts
 * import { statedAmountDiscarded } from "@cosyte/x12";
 * const w = statedAmountDiscarded({ segmentIndex: 9, transactionIndex: 0 });
 * ```
 */
export function statedAmountDiscarded(position: X12Position): X12ParseWarning {
  return {
    code: WARNING_CODES.X12_STATED_AMOUNT_DISCARDED,
    message: WARNING_MESSAGES.X12_STATED_AMOUNT_DISCARDED,
    position,
  };
}

/**
 * Tier-2 warning registry and factories for the `@cosyte/x12` parser
 * pipeline. Consumers compare `warning.code === WARNING_CODES.<CODE>` to
 * narrow and react; the parser uses the factories here to construct every
 * warning it emits so messages, payload shape, and positional context stay
 * consistent across stages.
 *
 * The Phase 1 set is intentionally small (8 codes) - every additional code
 * is a public-surface addition that needs a snapshot bump
 * (see `test/warning-codes.snapshot.test.ts`). Phase 2+ extends, never
 * renames.
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
  X12_UNKNOWN_CLAIM_STATUS_CATEGORY: "X12_UNKNOWN_CLAIM_STATUS_CATEGORY",
  X12_UNKNOWN_CLAIM_STATUS: "X12_UNKNOWN_CLAIM_STATUS",
  X12_834_UNKNOWN_MAINTENANCE_TYPE: "X12_834_UNKNOWN_MAINTENANCE_TYPE",
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
    'ISA-12 declares a version other than the HIPAA baseline "00501", so the input may diverge from 005010 semantics. The declared version is preserved verbatim on the model.',
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
    "Unexpected segment: TA1 is envelope-level but appeared inside an open functional group, so it is NOT captured on `ta1Segments`. Locate it in the input via `position.segmentIndex`.",
  X12_UNEXPECTED_SEGMENT_GE_WITHOUT_GS:
    "Unexpected segment: a GE appeared with no open functional group, so it closes nothing and is NOT retained on the model. Locate it in the input via `position.segmentIndex`.",
  X12_UNEXPECTED_SEGMENT_ST_WITHOUT_GS:
    "Unexpected segment: an ST appeared with no open functional group (missing GS), so no transaction set is opened and it is NOT retained on the model. Locate it in the input via `position.segmentIndex`.",
  X12_UNEXPECTED_SEGMENT_SE_WITHOUT_ST:
    "Unexpected segment: an SE appeared with no open transaction set, so it closes nothing and is NOT retained on the model. Locate it in the input via `position.segmentIndex`.",
  X12_UNEXPECTED_SEGMENT_BODY_OUTSIDE_TRANSACTION:
    "Unexpected segment: a body segment appeared outside any open transaction set, so it is NOT retained on the model. Locate it in the input via `position.segmentIndex`.",
  X12_835_REMIT_BALANCE_MISMATCH_CLAIM:
    "835 balance invariant violated [CLP-04 + Σ(claim CAS + line CAS) == CLP-03]: the claim does not balance. Every amount is preserved verbatim on the model as an X12Decimal and is NEVER silently rebalanced.",
  X12_835_REMIT_BALANCE_MISMATCH_SERVICE_LINE:
    "835 balance invariant violated [SVC-03 + Σ(line CAS) == SVC-02]: the service line does not balance. Every amount is preserved verbatim on the model as an X12Decimal and is NEVER silently rebalanced.",
  X12_835_REMIT_BALANCE_MISMATCH_REMIT_TOTAL:
    "835 balance invariant violated [Σ(CLP-04) - Σ(PLB amounts) == BPR-02]: the remittance total does not balance. Every amount is preserved verbatim on the model as an X12Decimal and is NEVER silently rebalanced.",
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
    '837 variant could not be resolved: ST-03\'s implementation convention reference is not one of "005010X222A2" / "005010X223A3" / "005010X224A2", and no SVx service-line segment was present to fall back on. The verbatim reference is preserved on the model.',
  X12_UNKNOWN_CLAIM_STATUS_CATEGORY:
    "Unknown claim status category (CSCC): the STC composite's first component is outside the bundled snapshot. The verbatim code is preserved on the status; only its description is unavailable.",
  X12_UNKNOWN_CLAIM_STATUS:
    "Unknown claim status code (CSC): the STC composite's second component is outside the bundled snapshot. The verbatim code is preserved on the status; only its description is unavailable.",
  X12_834_UNKNOWN_MAINTENANCE_TYPE:
    "Unknown 834 maintenance type: the INS-03/HD-01 code is outside the bundled snapshot. The verbatim code is preserved on the enrollment and the action is NEVER inferred.",
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
 * the field, and is entirely sender-controlled. Read `isa.elements[13]`,
 * `iea.elements[2]`, `gs.elements[6]`, `ge.elements[2]`, `st.elements[2]`
 * and `se.elements[2]` off the model when you need the values.
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
 * Build an `X12_PRE_005010` warning. Emitted when ISA-12 declares any version
 * other than `00501`, the HIPAA-mandated baseline. The code name reads as a
 * "pre-005010" test and the guard is an inequality, so a LATER family
 * (`00602`, `00700`) raises it too. The parser still
 * accepts the input (Postel's Law: lenient on parse) but flags the
 * mismatch so consumers know the input may diverge from 005010 semantics.
 * The declared version stays on `isa.elements[12]`.
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
 * Build an `X12_GROUP_COUNT_MISMATCH` warning. Emitted when IEA-01 does not
 * equal the actual number of GS..GE groups present in the interchange.
 * Trading partners use this to detect transmission truncation. Both numbers
 * stay on the model (`iea.elements[1]` and `ix.groups.length`) and neither
 * is silently corrected.
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
 * the group. Both numbers stay on the model (`ge.elements[1]` and
 * `group.transactions.length`).
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
 * SE-01 reconciliation to the emit half); it is a Phase-8 serializer
 * diagnostic.
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
 * The parsed submission still ships with `variant: "unknown"` and the
 * verbatim reference on `submission.implementationConventionReference`; the
 * walker does its best on shared structure (envelope, HL, claim header) and
 * skips variant-specific service-line decoding.
 *
 * @example
 * ```ts
 * import { unknown837Variant } from "@cosyte/x12";
 * const w = unknown837Variant({ segmentIndex: 1, groupIndex: 0, transactionIndex: 0 });
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

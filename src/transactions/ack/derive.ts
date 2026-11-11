/**
 * Derive the spec of a TA1 and of a 999 from what `parseX12` found, so a
 * receiver acknowledges an interchange without assembling either by hand.
 *
 * **Scope: what this package checks, and nothing more.** That is the
 * interchange envelope and the base-standard syntax the envelope walker and
 * the segment decoder verify: control numbers that agree, counts that agree,
 * trailers that arrived, segments where the envelope grammar puts them, and
 * release characters and binary lengths that frame. Implementation guide usage
 * (a required segment missing, a code value outside a guide's list, a loop
 * repeated too often) is never checked here, so a derived 999 never reports
 * it. A receiver that validates a guide adds those findings to the spec this
 * returns.
 *
 * Every warning is looked up in {@link ACK_WARNING_MAPPINGS}, which names the
 * code each acknowledgment carries for it, or says why it carries none. Both
 * functions return the warnings the spec reports and the ones it does not, so
 * nothing the parse found disappears in silence.
 *
 * Both are pure: nothing is sent, and the returned spec is the input the
 * existing builders take, `buildTA1` and `build999`, whose guards still apply.
 */

import type { Ik304Code, Ik403Code, Ta1NoteCode } from "./codes.js";
import { ACK_BUILD_ERROR_CODES, AckBuildError } from "./errors.js";
import type {
  Build999EnvelopeSpec,
  Build999SegmentErrorSpec,
  Build999Spec,
  Build999TransactionResponseSpec,
  BuildTA1Spec,
} from "./types.js";
import { unescapeRelease } from "../../parser/release.js";
import { NON_SPEC_SEGMENT_ID } from "../../parser/segment.js";
import { transactionStart } from "../../parser/transaction-start.js";
import type {
  X12FunctionalGroup,
  X12Interchange,
  X12OrphanSegment,
  X12TransactionSet,
} from "../../parser/types.js";
import { WARNING_CODES, type X12ParseWarning, type X12WarningCode } from "../../parser/warnings.js";

/**
 * What one warning code becomes in a derived acknowledgment, at each place a
 * warning can sit. A field that is absent means the acknowledgment for that
 * place carries no code for the warning, and the warning is returned as
 * unreported.
 *
 * Where a warning sits is read from its `position`: with a `transactionIndex`
 * it is on a transaction set, with a `groupIndex` alone on a functional group,
 * with neither on the interchange. `X12_UNEXPECTED_SEGMENT` is placed by its
 * orphan's `anchor` instead: inside a transaction set it is on that set, and
 * anywhere else it is interchange content.
 *
 * @example
 * ```ts
 * import { ACK_WARNING_MAPPINGS } from "@cosyte/x12";
 * ACK_WARNING_MAPPINGS.X12_MISSING_SE.ik5SyntaxErrorCode; // "2"
 * ```
 */
export interface X12AckWarningMapping {
  /** TA1-05, when the warning sits on the interchange. TA1-04 is then `R`. */
  readonly ta1NoteCode?: Ta1NoteCode;
  /** AK9-05, when it sits on a functional group outside every transaction set. AK9-01 is then `R`. */
  readonly ak9SyntaxErrorCode?: string;
  /** IK5-02, when it sits on a transaction set as a whole. IK5-01 is then `R`. */
  readonly ik5SyntaxErrorCode?: string;
  /** IK3-04, when it sits on one segment of a transaction set. IK5-01 is then `R`, with IK5-02 `5`. */
  readonly ik3SyntaxErrorCode?: Ik304Code;
  /** IK4-03, under that IK3, when the warning also names the element. */
  readonly ik4SyntaxErrorCode?: Ik403Code;
  /** Why the code maps as it does, or why it maps to nothing. */
  readonly reason: string;
}

/** @internal */
const READER_ONLY =
  "Raised by a typed reader about implementation guide usage or content, never by parseX12, and a derived acknowledgment reports base-standard syntax only.";

/** @internal */
const SERIALIZER_ONLY =
  "Raised by serializeX12, never by parseX12. A derived acknowledgment reads the parse alone, so SE-01 is not checked against the segment count.";

/**
 * The table every derived acknowledgment reads: each warning code the package
 * can raise, and the code a TA1 or a 999 carries for it at each place it can
 * sit. A code with no TA1, AK9, IK5 or IK3 entry is never reported, and its
 * `reason` says why. The table is exhaustive by type, so a new warning code
 * must be placed here before the package compiles.
 *
 * The codes are the standard ones: TA1-05 from the interchange note codes in
 * {@link "./codes.js".TA1_NOTE_CODES}, AK9-05 from the functional group syntax
 * error codes, IK5-02 from the transaction set syntax error codes, IK3-04 and
 * IK4-03 from {@link "./codes.js".IK3_SYNTAX_ERROR_CODES} and
 * {@link "./codes.js".IK4_SYNTAX_ERROR_CODES}.
 *
 * @example
 * ```ts
 * import { ACK_WARNING_MAPPINGS } from "@cosyte/x12";
 * ACK_WARNING_MAPPINGS.X12_CONTROL_NUMBER_MISMATCH.ta1NoteCode; // "001"
 * ACK_WARNING_MAPPINGS.X12_PRE_005010.ta1NoteCode; // undefined
 * ```
 */
export const ACK_WARNING_MAPPINGS: Readonly<Record<X12WarningCode, X12AckWarningMapping>> =
  Object.freeze({
    X12_CONTROL_NUMBER_MISMATCH: Object.freeze({
      ta1NoteCode: "001",
      ak9SyntaxErrorCode: "4",
      ik5SyntaxErrorCode: "3",
      reason:
        "ISA-13 and IEA-02 disagree (TA1 note 001), GS-06 and GE-02 disagree (AK9-05 4), or ST-02 and SE-02 disagree (IK5-02 3).",
    }),
    X12_PRE_005010: Object.freeze({
      reason:
        "Which interchange versions a receiver supports is its trading partner agreement, and the parse reads the interchange either way, so no version note is chosen for it.",
    }),
    X12_ISA_EXTRA_ELEMENT_SEPARATOR: Object.freeze({
      ta1NoteCode: "026",
      reason:
        "An ISA element carries the declared element separator, so the header does not split into its 16 elements (TA1 note 026, invalid data element separator).",
    }),
    X12_GROUP_COUNT_MISMATCH: Object.freeze({
      ta1NoteCode: "021",
      reason: "IEA-01 does not count the functional groups received (TA1 note 021).",
    }),
    X12_TRANSACTION_COUNT_MISMATCH: Object.freeze({
      ak9SyntaxErrorCode: "5",
      reason: "GE-01 does not count the transaction sets received (AK9-05 5).",
    }),
    X12_SEGMENT_COUNT_MISMATCH: Object.freeze({
      ik5SyntaxErrorCode: "4",
      reason: SERIALIZER_ONLY,
    }),
    X12_TRAILING_GARBAGE: Object.freeze({
      reason:
        "The bytes follow the IEA, so they are not part of the interchange acknowledged. Often they are a second interchange, which is parsed and acknowledged on its own.",
    }),
    X12_MISSING_IEA: Object.freeze({
      ta1NoteCode: "023",
      reason: "The input ended before the IEA (TA1 note 023, premature end of file).",
    }),
    X12_MISSING_GE: Object.freeze({
      ak9SyntaxErrorCode: "3",
      reason: "The functional group has no GE (AK9-05 3).",
    }),
    X12_MISSING_SE: Object.freeze({
      ik5SyntaxErrorCode: "2",
      reason: "The transaction set has no SE (IK5-02 2).",
    }),
    X12_DANGLING_RELEASE_CHAR: Object.freeze({
      ik3SyntaxErrorCode: "8",
      ik4SyntaxErrorCode: "6",
      reason:
        "A release character ends an element with nothing to release (IK3-04 8, IK4-03 6). Outside a transaction set it sits in a segment already reported as unexpected, so it is not reported again.",
    }),
    X12_UNEXPECTED_SEGMENT: Object.freeze({
      ta1NoteCode: "024",
      ik3SyntaxErrorCode: "2",
      reason:
        "A segment the envelope grammar has no place for: inside a transaction set (a TA1 there) an unexpected segment (IK3-04 2), anywhere else invalid interchange content (TA1 note 024).",
    }),
    X12_835_REMIT_BALANCE_MISMATCH: Object.freeze({ reason: READER_ONLY }),
    X12_UNKNOWN_CARC: Object.freeze({ reason: READER_ONLY }),
    X12_UNKNOWN_RARC: Object.freeze({ reason: READER_ONLY }),
    X12_HL_PARENT_MISMATCH: Object.freeze({ reason: READER_ONLY }),
    X12_HL_PARENT_LEVEL_INVALID: Object.freeze({ reason: READER_ONLY }),
    X12_UNKNOWN_HI_QUALIFIER: Object.freeze({ reason: READER_ONLY }),
    X12_MISSING_REQUIRED_LOOP: Object.freeze({ reason: READER_ONLY }),
    X12_837_UNKNOWN_VARIANT: Object.freeze({ reason: READER_ONLY }),
    X12_837_AMBIGUOUS_VARIANT: Object.freeze({ reason: READER_ONLY }),
    X12_UNKNOWN_CLAIM_STATUS_CATEGORY: Object.freeze({ reason: READER_ONLY }),
    X12_UNKNOWN_CLAIM_STATUS: Object.freeze({ reason: READER_ONLY }),
    X12_834_UNKNOWN_MAINTENANCE_TYPE: Object.freeze({ reason: READER_ONLY }),
    X12_UNPARSEABLE_DECIMAL: Object.freeze({ reason: READER_ONLY }),
    X12_837_SERVICE_LINE_NOT_DECODED: Object.freeze({ reason: READER_ONLY }),
    X12_837_SERVICE_LINE_DROPPED: Object.freeze({ reason: READER_ONLY }),
    X12_837_SERVICE_SEGMENT_WITHOUT_LX: Object.freeze({ reason: READER_ONLY }),
    X12_837_SERVICE_SEGMENT_REPEATED: Object.freeze({ reason: READER_ONLY }),
    X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX: Object.freeze({ reason: READER_ONLY }),
    X12_837_PAY_TO_ADDRESS_REPEATED: Object.freeze({ reason: READER_ONLY }),
    X12_835_BALANCE_NOT_EVALUABLE: Object.freeze({ reason: READER_ONLY }),
    X12_AMOUNT_ROW_DROPPED: Object.freeze({ reason: READER_ONLY }),
    X12_STATED_AMOUNT_DISCARDED: Object.freeze({ reason: READER_ONLY }),
    X12_270_NON_CONVENTIONAL_DELIMITER: Object.freeze({ reason: READER_ONLY }),
    X12_270_INTER_SEGMENT_LINE_BREAK: Object.freeze({ reason: READER_ONLY }),
    X12_270_DUPLICATE_HIERARCHY_ID: Object.freeze({ reason: READER_ONLY }),
    X12_270_HIERARCHY_CYCLE: Object.freeze({ reason: READER_ONLY }),
    X12_270_LEVEL_DETACHED: Object.freeze({ reason: READER_ONLY }),
    X12_270_DATE_ROW_DROPPED: Object.freeze({ reason: READER_ONLY }),
    X12_276_DUPLICATE_HIERARCHY_ID: Object.freeze({ reason: READER_ONLY }),
    X12_276_HIERARCHY_CYCLE: Object.freeze({ reason: READER_ONLY }),
    X12_276_LEVEL_DETACHED: Object.freeze({ reason: READER_ONLY }),
    X12_276_DATE_ROW_DROPPED: Object.freeze({ reason: READER_ONLY }),
    X12_276_REFERENCE_ROW_DROPPED: Object.freeze({ reason: READER_ONLY }),
    X12_271_AAA_REJECT_REASON_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_271_AAA_UNKNOWN_CODE: Object.freeze({ reason: READER_ONLY }),
    X12_271_AAA_SEGMENT_MALFORMED: Object.freeze({ reason: READER_ONLY }),
    X12_271_AAA_LOOP_UNIDENTIFIED: Object.freeze({ reason: READER_ONLY }),
    X12_GUIDE_NOT_IMPLEMENTED: Object.freeze({ reason: READER_ONLY }),
    X12_GUIDE_NOT_DECLARED: Object.freeze({ reason: READER_ONLY }),
    X12_BINARY_DATA_TRUNCATED: Object.freeze({
      ik3SyntaxErrorCode: "8",
      ik4SyntaxErrorCode: "4",
      reason:
        "The input ended before a BDS or BIN data element reached its declared length (IK3-04 8, IK4-03 4, too short).",
    }),
    X12_BINARY_LENGTH_INVALID: Object.freeze({
      ik3SyntaxErrorCode: "8",
      reason:
        "A BDS or BIN length element is absent, empty or not digits (IK3-04 8). The warning does not say which, and each is a different IK4-03, so no IK4 is written.",
    }),
    X12_BINARY_LENGTH_MISMATCH: Object.freeze({
      ik3SyntaxErrorCode: "8",
      reason:
        "A BDS or BIN declared length disagrees with where the segment ends (IK3-04 8). Data too long and data missing are different IK4-03 codes, so no IK4 is written.",
    }),
    X12_BINARY_LENGTH_UNVERIFIABLE: Object.freeze({
      reason:
        "The input was a string holding a character above U+00FF in binary data, so the octet count cannot be checked. That is a limit of reading a string, not a defect the sender made.",
    }),
    X12_277_RFAI_HEADER_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_277_RFAI_LEVEL_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_277_RFAI_REQUEST_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_275_ATTACHMENT_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_999_IK5_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_999_AK9_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_999_AK1_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_999_IK5_DISPOSITION_UNKNOWN: Object.freeze({ reason: READER_ONLY }),
    X12_999_AK9_DISPOSITION_UNKNOWN: Object.freeze({ reason: READER_ONLY }),
    X12_271_HEADER_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_997_AK1_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_997_AK5_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_997_AK9_ABSENT: Object.freeze({ reason: READER_ONLY }),
    X12_997_AK5_DISPOSITION_UNKNOWN: Object.freeze({ reason: READER_ONLY }),
    X12_997_AK9_DISPOSITION_UNKNOWN: Object.freeze({ reason: READER_ONLY }),
    X12_997_SEGMENT_OUT_OF_PLACE: Object.freeze({ reason: READER_ONLY }),
    X12_997_SEGMENT_NOT_DEFINED: Object.freeze({ reason: READER_ONLY }),
  } satisfies Record<X12WarningCode, X12AckWarningMapping>);

/**
 * A derived acknowledgment spec and the parse warnings it accounts for.
 * `reported` holds every warning the spec carries a code for, and
 * `unreported` every other warning in the same scope: one the table maps to
 * nothing there, a second interchange finding a TA1 has no room for, or a
 * segment finding whose segment could not be located. Each warning of the
 * scope is in exactly one of the two, in parse order.
 *
 * @example
 * ```ts
 * import { deriveTA1Spec, parseX12 } from "@cosyte/x12";
 * const { spec, reported, unreported } = deriveTA1Spec(parseX12(raw));
 * ```
 */
export interface X12DerivedAck<Spec> {
  readonly spec: Spec;
  readonly reported: readonly X12ParseWarning[];
  readonly unreported: readonly X12ParseWarning[];
}

/**
 * Options for {@link derive999Spec}.
 *
 * @example
 * ```ts
 * import type { Derive999Options } from "@cosyte/x12";
 * const options: Derive999Options = {
 *   groupIndex: 0,
 *   envelope: {
 *     senderId: "RECEIVER", receiverId: "SENDER",
 *     interchangeDate: "260601", interchangeTime: "1205",
 *     interchangeControlNumber: "000000101",
 *     groupControlNumber: "101", transactionSetControlNumber: "0101",
 *   },
 * };
 * ```
 */
export interface Derive999Options {
  /** The envelope of the 999 itself: its own parties, date, time and control numbers. */
  readonly envelope: Build999EnvelopeSpec;
  /** Which functional group of the interchange to acknowledge, from 0. Defaults to 0. */
  readonly groupIndex?: number;
}

/**
 * Where a warning sits, for the acknowledgment that reports it: on the
 * interchange with no `group`, on a functional group with no `transaction`,
 * else on a transaction set of it. A transaction set scope carries the orphan
 * when the warning is `X12_UNEXPECTED_SEGMENT`.
 *
 * @internal
 */
interface Scope {
  readonly group?: number;
  readonly transaction?: number;
  readonly orphan?: X12OrphanSegment | undefined;
}

/** A scope on a transaction set. @internal */
interface TransactionScope {
  readonly group: number;
  readonly transaction: number;
  readonly orphan?: X12OrphanSegment | undefined;
}

/** @internal */
const INTERCHANGE: Scope = Object.freeze({});

/**
 * Place a warning: by its orphan's anchor for an unexpected segment, else by
 * the indexes its position carries. An index that names no group falls back
 * to the interchange, and one that names no transaction set to its group, so
 * a hand-made interchange still places every warning somewhere.
 *
 * @internal
 */
function scopeOf(w: X12ParseWarning, ix: X12Interchange): Scope {
  let group = w.position.groupIndex;
  let transaction = w.position.transactionIndex;
  let orphan: X12OrphanSegment | undefined;
  if (w.code === WARNING_CODES.X12_UNEXPECTED_SEGMENT) {
    orphan = ix.orphanSegments.find((o) => o.segmentIndex === w.position.segmentIndex);
    if (orphan?.anchor.kind !== "transaction") return INTERCHANGE;
    group = orphan.anchor.groupIndex;
    transaction = orphan.anchor.transactionIndex;
  }
  // An absent index reads as -1, which names nothing.
  const groupAt = group ?? -1;
  const framed = ix.groups[groupAt];
  if (framed === undefined) return INTERCHANGE;
  const transactionAt = transaction ?? -1;
  if (framed.transactions[transactionAt] === undefined) return { group: groupAt };
  return { group: groupAt, transaction: transactionAt, orphan };
}

/**
 * The text of an ISA element read by its fixed byte offsets, which hold even
 * where an extra separator displaced `isa.elements`. Raw, as every envelope
 * element is: the ISA is fixed-width and is not released.
 *
 * @internal
 */
function isaField(ix: X12Interchange, start: number, width: number): string {
  return ix.isa.raw.slice(start, start + width);
}

/**
 * Derive the spec of a TA1 Interchange Acknowledgment from what `parseX12`
 * found on the interchange envelope, for {@link "./build-ta1.js".buildTA1}.
 *
 * TA1-01, TA1-02 and TA1-03 echo the inbound ISA-13, ISA-09 and ISA-10, read
 * by the ISA's fixed byte offsets. With no interchange finding the TA1
 * accepts (`A`, note `000`). Otherwise it rejects (`R`) with the note
 * {@link ACK_WARNING_MAPPINGS} gives the first finding in parse order; a TA1
 * carries one note, so every later finding is returned as unreported.
 *
 * The findings are the warnings that sit on the interchange: a control number
 * or group count that disagrees between ISA and IEA, a missing IEA, an ISA
 * that does not split into its elements, and a segment outside every
 * transaction set. A finding inside a functional group belongs to the 999 for
 * that group (see {@link derive999Spec}). `X12_PRE_005010` and
 * `X12_TRAILING_GARBAGE` are never reported; the table says why.
 *
 * Every mapped finding rejects. A receiver that accepts an interchange with
 * errors noted sets `ackCode` to `E` on the returned spec.
 *
 * @param interchange - What `parseX12` returned for the inbound interchange.
 * @returns The TA1 spec, with the interchange warnings it reports and the ones it does not.
 *
 * @example
 * ```ts
 * import { buildTA1, deriveTA1Spec, parseX12 } from "@cosyte/x12";
 * const { spec } = deriveTA1Spec(parseX12(raw));
 * const ta1 = buildTA1(spec);
 * ```
 */
export function deriveTA1Spec(interchange: X12Interchange): X12DerivedAck<BuildTA1Spec> {
  const reported: X12ParseWarning[] = [];
  const unreported: X12ParseWarning[] = [];
  let noteCode: Ta1NoteCode | undefined;
  for (const w of interchange.warnings) {
    if (scopeOf(w, interchange).group !== undefined) continue;
    const note = ACK_WARNING_MAPPINGS[w.code].ta1NoteCode;
    if (note === undefined || noteCode !== undefined) {
      unreported.push(w);
      continue;
    }
    noteCode = note;
    reported.push(w);
  }
  const spec: BuildTA1Spec = Object.freeze({
    // ISA-13 at bytes 90 to 98, ISA-09 at 70 to 75, ISA-10 at 77 to 80.
    interchangeControlNumber: isaField(interchange, 90, 9),
    interchangeDate: isaField(interchange, 70, 6),
    interchangeTime: isaField(interchange, 77, 4),
    ackCode: noteCode === undefined ? "A" : "R",
    noteCode: noteCode ?? "000",
  });
  return Object.freeze({
    spec,
    reported: Object.freeze(reported),
    unreported: Object.freeze(unreported),
  });
}

/**
 * One transaction set's findings while a 999 is derived. @internal
 */
interface SetFindings {
  readonly codes: string[];
  readonly segmentErrors: Build999SegmentErrorSpec[];
  /** True when a segment finding could not be located and so has no IK3. */
  unlocated: boolean;
}

/**
 * Derive the spec of a 999 Implementation Acknowledgment for one functional
 * group of a parsed interchange, for {@link "./build-999.js".build999}.
 *
 * AK1 echoes the group's GS-01, GS-06 and GS-08, and each AK2 its transaction
 * set's ST-01, ST-02 and ST-03, read without their release characters. The
 * findings are the warnings that sit on this group or on one of its
 * transaction sets, each looked up in {@link ACK_WARNING_MAPPINGS}:
 *
 * - On a transaction set as a whole (no SE, ST-02 and SE-02 disagree): an
 *   IK5-02 code, and IK5-01 `R`.
 * - On one segment of it (a dangling release character, a BDS or BIN whose
 *   length does not frame, a TA1 between its ST and SE): an IK3 at the
 *   segment's position counted from the ST, with an IK4 where the warning
 *   names the element and the table gives an IK4-03; IK5-01 `R` with IK5-02
 *   `5`. IK3-03 (the loop) is never written: loops are implementation guide
 *   structure, which is not checked here.
 * - On the group (no GE, GS-06 and GE-02 disagree, GE-01 miscounts): an
 *   AK9-05 code, and AK9-01 `R`.
 *
 * A transaction set with no finding is accepted (`A`). AK9-01 is `R` on a
 * group finding, else `A` when every set is accepted, `R` when none is, and
 * `P` between. AK9-03 counts the transaction sets received, AK9-04 those
 * accepted, and AK9-02 is GE-01 when it is a whole number no smaller than
 * AK9-03, else AK9-03.
 *
 * No element value is ever copied into IK4-04, and no CTX is written.
 *
 * A segment finding is located through the position the parse recorded for
 * its transaction set. A set built by hand or copied out of the parse has
 * none, and neither has a segment whose id is not a segment id: the set is
 * still rejected with IK5-02 `5`, but without an IK3, and the warning is
 * returned as unreported.
 *
 * The spec echoes the inbound values as they are. A GS-06 or ST-02 that is
 * empty makes `build999` refuse the spec, rather than acknowledge a group or
 * a set the sender cannot identify.
 *
 * @param interchange - What `parseX12` returned for the inbound interchange.
 * @param options - The 999's own envelope and which group to acknowledge.
 * @returns The 999 spec, with the group's warnings it reports and the ones it does not.
 * @throws {AckBuildError} `X12_ACK_INVALID_SPEC` when `groupIndex` names no group.
 *
 * @example
 * ```ts
 * import { build999, derive999Spec, parseX12 } from "@cosyte/x12";
 * const { spec } = derive999Spec(parseX12(raw), {
 *   envelope: {
 *     senderId: "RECEIVER", receiverId: "SENDER",
 *     interchangeDate: "260601", interchangeTime: "1205",
 *     interchangeControlNumber: "000000101",
 *     groupControlNumber: "101", transactionSetControlNumber: "0101",
 *   },
 * });
 * const ack = build999(spec);
 * ```
 */
export function derive999Spec(
  interchange: X12Interchange,
  options: Derive999Options,
): X12DerivedAck<Build999Spec> {
  const groupIndex = options.groupIndex ?? 0;
  const group = interchange.groups[groupIndex];
  if (group === undefined) {
    throw new AckBuildError(
      ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
      `derive999Spec: groupIndex ${String(groupIndex)} names no functional group; the interchange has ${String(interchange.groups.length)}.`,
    );
  }
  const text = (raw: string | undefined): string =>
    // Stryker disable next-line ObjectLiteral: the position reaches only `ignoreWarning`, which reads nothing
    unescapeRelease(raw ?? "", interchange.delimiters, ignoreWarning, { segmentIndex: 0 });

  const reported: X12ParseWarning[] = [];
  const unreported: X12ParseWarning[] = [];
  const groupCodes: string[] = [];
  const sets: SetFindings[] = group.transactions.map(() => ({
    codes: [],
    segmentErrors: [],
    unlocated: false,
  }));

  for (const w of interchange.warnings) {
    const { group: at, transaction, orphan } = scopeOf(w, interchange);
    if (at !== groupIndex) continue;
    const mapping = ACK_WARNING_MAPPINGS[w.code];
    if (transaction === undefined) {
      if (mapping.ak9SyntaxErrorCode === undefined) {
        unreported.push(w);
      } else {
        addCode(groupCodes, mapping.ak9SyntaxErrorCode);
        reported.push(w);
      }
      continue;
    }
    // `scopeOf` names only a transaction set the group holds.
    const tx = group.transactions[transaction] as X12TransactionSet;
    const set = sets[transaction] as SetFindings;
    const scope: TransactionScope = { group: groupIndex, transaction, orphan };
    if (mapping.ik5SyntaxErrorCode !== undefined) {
      addCode(set.codes, mapping.ik5SyntaxErrorCode);
      reported.push(w);
    } else if (mapping.ik3SyntaxErrorCode === undefined) {
      unreported.push(w);
    } else {
      const located = noteSegment(w, scope, tx, interchange, mapping, set);
      (located ? reported : unreported).push(w);
    }
  }

  const transactionResponses = group.transactions.map((tx, i) =>
    responseFor(tx, sets[i] as SetFindings, text),
  );
  const received = transactionResponses.length;
  const accepted = transactionResponses.filter((r) => r.disposition === "A").length;
  const spec: Build999Spec = Object.freeze({
    envelope: options.envelope,
    functionalGroup: Object.freeze({
      functionalIdCode: text(group.gs.elements[1]),
      groupControlNumber: text(group.gs.elements[6]),
      versionRelease: text(group.gs.elements[8]),
      disposition: groupDisposition(groupCodes, received, accepted),
      numberOfTransactionSets: declaredSets(group, received),
      numberOfReceivedTransactionSets: received,
      numberOfAcceptedTransactionSets: accepted,
      ...(groupCodes.length > 0 ? { syntaxErrorCodes: Object.freeze(groupCodes) } : {}),
      transactionResponses: Object.freeze(transactionResponses),
    }),
  });
  return Object.freeze({
    spec,
    reported: Object.freeze(reported),
    unreported: Object.freeze(unreported),
  });
}

/** The warning sink for unescaping an echoed value: the parse already reported it. @internal */
function ignoreWarning(): void {
  // The parse that produced the interchange already raised it.
}

/** Append a code once. @internal */
function addCode(codes: string[], code: string): void {
  if (!codes.includes(code)) codes.push(code);
}

/**
 * Add the IK3 (and IK4) for a segment finding to its set. Answers false when
 * the segment cannot be located or named, and marks the set so it is still
 * rejected.
 *
 * @internal
 */
function noteSegment(
  w: X12ParseWarning,
  scope: TransactionScope,
  tx: X12TransactionSet,
  ix: X12Interchange,
  mapping: X12AckWarningMapping,
  set: SetFindings,
): boolean {
  const start = transactionStart(tx);
  if (start === undefined) return unlocated(set);
  const id = segmentIdAt(w, scope, tx, start, ix);
  if (id === undefined) return unlocated(set);
  const ik4 = mapping.ik4SyntaxErrorCode;
  const element = w.position.elementIndex;
  set.segmentErrors.push(
    Object.freeze({
      segmentIdCode: id,
      segmentPositionInTransactionSet: w.position.segmentIndex - start + 1,
      syntaxErrorCode: mapping.ik3SyntaxErrorCode as Ik304Code,
      ...(ik4 !== undefined && element !== undefined
        ? {
            elementErrors: Object.freeze([
              Object.freeze({ position: Object.freeze({ element }), syntaxErrorCode: ik4 }),
            ]),
          }
        : {}),
    }),
  );
  return true;
}

/** Mark a set as holding a segment finding with no IK3, so it is still rejected. @internal */
function unlocated(set: SetFindings): false {
  set.unlocated = true;
  return false;
}

/**
 * The id of the segment a finding sits on, or `undefined` when it cannot be
 * found or is not a segment id. A TA1 lifted out of the set is its orphan;
 * any other segment is the set's own, found by counting on from the ST past
 * the TA1s lifted out of this set before it.
 *
 * @internal
 */
function segmentIdAt(
  w: X12ParseWarning,
  scope: TransactionScope,
  tx: X12TransactionSet,
  start: number,
  ix: X12Interchange,
): string | undefined {
  if (scope.orphan !== undefined) return scope.orphan.segment.id;
  const at = w.position.segmentIndex;
  const lifted = ix.orphanSegments.filter(
    (o) =>
      o.anchor.kind === "transaction" &&
      o.anchor.groupIndex === scope.group &&
      o.anchor.transactionIndex === scope.transaction &&
      // Stryker disable next-line EqualityOperator: no finding but its own sits at an orphan's index
      o.segmentIndex < at,
  ).length;
  const id = tx.segments[at - start - lifted]?.id;
  return id === NON_SPEC_SEGMENT_ID ? undefined : id;
}

/** The AK2..IK5 response for one transaction set. @internal */
function responseFor(
  tx: X12TransactionSet,
  set: SetFindings,
  text: (raw: string | undefined) => string,
): Build999TransactionResponseSpec {
  const codes = [...set.codes];
  if (set.segmentErrors.length > 0 || set.unlocated) addCode(codes, "5");
  const guide = text(tx.st.elements[3]);
  return Object.freeze({
    transactionSetIdCode: text(tx.st.elements[1]),
    transactionSetControlNumber: text(tx.st.elements[2]),
    ...(guide === "" ? {} : { implementationConventionReference: guide }),
    disposition: codes.length > 0 ? "R" : "A",
    ...(codes.length > 0 ? { syntaxErrorCodes: Object.freeze(codes) } : {}),
    ...(set.segmentErrors.length > 0
      ? { segmentErrors: Object.freeze([...set.segmentErrors]) }
      : {}),
  });
}

/** AK9-01 from the group's own codes and its sets' dispositions. @internal */
function groupDisposition(
  groupCodes: readonly string[],
  received: number,
  accepted: number,
): "A" | "P" | "R" {
  if (groupCodes.length > 0) return "R";
  if (accepted === received) return "A";
  return accepted === 0 ? "R" : "P";
}

/**
 * AK9-02: GE-01 when it is a whole number no smaller than the sets received,
 * else the sets received, so the count `build999` holds AK9-03 to never
 * exceeds it.
 *
 * @internal
 */
function declaredSets(group: X12FunctionalGroup, received: number): number {
  if (group.ge === undefined) return received;
  const ge01 = String(group.ge.elements[1]);
  const declared = Number(ge01);
  if (!/^\d+$/u.test(ge01) || !Number.isSafeInteger(declared)) return received;
  return Math.max(declared, received);
}

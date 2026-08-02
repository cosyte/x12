/**
 * Shared type definitions consumed across the `@cosyte/x12` parser pipeline.
 * Every type here is deliberately readonly - the parser produces immutable
 * data structures and consumers must not mutate them. Narrowing is done via
 * the `X12ParseWarning.code` and `X12ParseError.code` discriminants defined
 * in sibling files.
 */

// Forward reference to the warning shape owned by `./warnings.ts`. Declared
// with `import type` so it contributes zero runtime cost and `./warnings.ts`
// remains the single source of truth for `X12ParseWarning`.
import type { X12Profile } from "../profiles/types.js";

import type { X12Segment } from "./segment.js";
import type { X12ParseWarning, X12UnexpectedSegmentContext } from "./warnings.js";

/**
 * Positional context attached to every warning and fatal error. Fields are
 * 1-indexed against the X12 spec convention (interchange first, then group,
 * then transaction, then segment, then element within that segment, then
 * component within that element).
 *
 * All fields past `segmentIndex` are optional - for a top-level fatal like
 * `X12_EMPTY_INPUT` only `segmentIndex: 0` is populated; for a per-element
 * warning deep inside a transaction every field may be set.
 *
 * @remarks
 * With `exactOptionalPropertyTypes: true`, do not pass `interchangeIndex:
 * undefined` explicitly - omit the key instead.
 *
 * @example
 * ```ts
 * import type { X12Position } from "@cosyte/x12";
 * const pos: X12Position = { segmentIndex: 0, interchangeIndex: 0 };
 * ```
 */
export interface X12Position {
  readonly segmentIndex: number;
  readonly interchangeIndex?: number;
  readonly groupIndex?: number;
  readonly transactionIndex?: number;
  readonly elementIndex?: number;
  readonly componentIndex?: number;
  readonly repetitionIndex?: number;
}

/**
 * Callback invoked inline each time the parser emits a Tier-2 warning.
 * Always fires BEFORE the warning is appended to `X12Interchange.warnings`
 * so consumers observe warnings in the same order the parser discovered them.
 *
 * @example
 * ```ts
 * import { parseX12, type OnWarningCallback } from "@cosyte/x12";
 * const onWarning: OnWarningCallback = (w) => {
 *   console.warn(w.code, w.message);
 * };
 * parseX12(raw, { onWarning });
 * ```
 */
export type OnWarningCallback = (warning: X12ParseWarning) => void;

/**
 * Options accepted by `parseX12` to tune lenient/strict behaviour. Every
 * field is optional; `parseX12(raw, {})` is valid and produces the library
 * defaults.
 *
 * @remarks
 * With `exactOptionalPropertyTypes: true`, callers cannot pass
 * `{ strict: undefined }` - either omit the key or pass a boolean.
 *
 * @example
 * ```ts
 * import { parseX12, type X12ParseOptions } from "@cosyte/x12";
 * const opts: X12ParseOptions = {
 *   strict: true,
 *   onWarning: (w) => console.warn(w.code),
 * };
 * parseX12(raw, opts);
 * ```
 */
export interface X12ParseOptions {
  readonly strict?: boolean;
  readonly onWarning?: OnWarningCallback;
  /**
   * A trading-partner {@link X12Profile} to attach to the result. An explicit
   * profile ALWAYS wins over any process-scoped default; pass `null` to opt
   * out of the default for a single call. When omitted, `parseX12` consults
   * `getDefaultProfile()`. The profile is attached as `ix.profile` for
   * attribution and consumed by `partitionWarnings`; it does not alter the
   * lenient parse itself (v1 profiles are descriptive - see the profile
   * subsystem docs).
   */
  readonly profile?: X12Profile | null;
}

/**
 * The four X12 delimiter classes discovered from fixed byte positions inside
 * the ISA envelope. Phase 1 detects all four from the ISA itself - they are
 * NEVER assumed (in particular, `component` is rarely `:` outside Medicare).
 *
 * - `element` - ISA byte 4 (1-indexed); separates the 16 ISA elements.
 * - `repetition` - ISA-11 (byte 83, 1-indexed); separates repetitions inside
 *   an element. Carries the legacy Control Standards Identifier
 *   (typically `U`) for pre-005010 inputs; Phase 1 surfaces it verbatim.
 * - `component` - ISA-16 (byte 105, 1-indexed); separates sub-elements of a
 *   composite. Real-world senders use `:`, `\\`, `^`, `|`, and more.
 * - `segment` - the byte immediately after ISA-16 (byte 106, 1-indexed);
 *   terminates each segment. Typically `~`, often followed by optional
 *   `\r\n` which is silently tolerated.
 *
 * @example
 * ```ts
 * import type { Delimiters } from "@cosyte/x12";
 * const medicare: Delimiters = {
 *   element: "*",
 *   repetition: "^",
 *   component: ":",
 *   segment: "~",
 * };
 * ```
 */
export interface Delimiters {
  readonly element: string;
  readonly repetition: string;
  readonly component: string;
  readonly segment: string;
}

/**
 * The decoded ISA interchange header. `raw` preserves the exact 106-byte
 * ISA + terminator string from input so round-trip serialization is
 * byte-exact regardless of any lenient normalization downstream. `elements`
 * is the 16 ISA values, 1-indexed (`elements[0]` is the literal `"ISA"`
 * name placeholder, `elements[1]` is ISA-01, ..., `elements[16]` is ISA-16).
 *
 * @example
 * ```ts
 * import type { IsaSegment } from "@cosyte/x12";
 * declare const isa: IsaSegment;
 * isa.elements[12]; // ISA-12 - version, expected "00501"
 * isa.elements[13]; // ISA-13 - interchange control number
 * ```
 */
export interface IsaSegment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * The decoded IEA interchange trailer. `raw` is the exact segment string
 * (without the segment terminator) and `elements` is the IEA values,
 * 1-indexed (`elements[0]` = `"IEA"`, `elements[1]` = IEA-01 group count,
 * `elements[2]` = IEA-02 interchange control number - must match ISA-13).
 *
 * @example
 * ```ts
 * import type { IeaSegment } from "@cosyte/x12";
 * declare const iea: IeaSegment;
 * iea.elements[2]; // IEA-02 - must equal ISA-13
 * ```
 */
export interface IeaSegment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * The decoded GS functional group header. `elements[0]` = `"GS"`,
 * `elements[1]` = GS-01 functional ID code (`HC` for claims, `HP` for
 * remittance, etc.), `elements[6]` = GS-06 group control number (must match
 * GE-02), `elements[8]` = GS-08 version (e.g. `005010X222A2`).
 *
 * @example
 * ```ts
 * import type { GsSegment } from "@cosyte/x12";
 * declare const gs: GsSegment;
 * gs.elements[1]; // GS-01 - functional ID code
 * gs.elements[6]; // GS-06 - group control number
 * ```
 */
export interface GsSegment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * The decoded GE functional group trailer. `elements[0]` = `"GE"`,
 * `elements[1]` = GE-01 transaction count (must equal the number of ST/SE
 * pairs inside this group), `elements[2]` = GE-02 group control number
 * (must equal GS-06).
 *
 * @example
 * ```ts
 * import type { GeSegment } from "@cosyte/x12";
 * declare const ge: GeSegment;
 * ge.elements[2]; // GE-02 - must equal GS-06
 * ```
 */
export interface GeSegment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * A decoded envelope-level TA1 Interchange Acknowledgment segment. TA1 is
 * NOT a transaction set - per the ASC X12 standard it lives at the envelope
 * level, between ISA and the first GS, or alone inside an ISA..IEA with no
 * GS at all (a TA1-only interchange). One interchange may carry multiple
 * TA1 segments, each acknowledging a prior inbound interchange.
 *
 * `elements[0]` = `"TA1"`; `elements[1]` = TA1-01 (echoes the prior
 * interchange's ISA-13 control number); `elements[2]` = TA1-02 (interchange
 * date YYMMDD, echoes ISA-09); `elements[3]` = TA1-03 (interchange time
 * HHMM, echoes ISA-10); `elements[4]` = TA1-04 (Interchange Acknowledgment
 * Code, code list I13: `A` accepted, `E` accepted with errors, `R`
 * rejected); `elements[5]` = TA1-05 (Interchange Note Code, code list I18,
 * `000`–`028+`).
 *
 * The Phase 3 envelope walker captures TA1 segments here verbatim; the
 * typed-ack model is built on top by `parseTA1`. TA1 contains only
 * structural control / disposition codes - by spec it carries NO PHI.
 *
 * @example
 * ```ts
 * import type { Ta1Segment } from "@cosyte/x12";
 * declare const ta1: Ta1Segment;
 * ta1.elements[1]; // TA1-01 - echoes inbound ISA-13
 * ta1.elements[4]; // TA1-04 - "A" | "E" | "R"
 * ```
 */
export interface Ta1Segment {
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * A single ST..SE transaction set inside a functional group. Phase 2
 * decodes every body segment via {@link "./segment.js".decodeSegment} so
 * `segments` carries typed {@link X12Segment} entries (ST through SE,
 * inclusive). `rawSegments` mirrors the same list as the verbatim raw
 * segment strings (terminator stripped) so a byte-exact round-trip survives
 * any downstream consumer that needs to re-emit the source.
 *
 * `elements` on the ST and SE segments themselves IS decoded at envelope
 * time so envelope invariants can be checked (ST-02 ↔ SE-02 control-number
 * reconciliation, SE-01 segment count).
 *
 * @example
 * ```ts
 * import type { X12TransactionSet } from "@cosyte/x12";
 * declare const tx: X12TransactionSet;
 * tx.st.elements[1];             // ST-01 - transaction set ID (e.g. "835")
 * tx.segments[1]?.id;            // first body segment id
 * tx.rawSegments[1];             // first body segment raw text
 * ```
 */
export interface X12TransactionSet {
  readonly st: { readonly raw: string; readonly elements: readonly string[] };
  readonly se: { readonly raw: string; readonly elements: readonly string[] } | undefined;
  readonly segments: readonly X12Segment[];
  readonly rawSegments: readonly string[];
}

/**
 * A single GS..GE functional group inside an interchange. `transactions`
 * is the ordered list of ST..SE transaction sets inside it (opaque bodies
 * at Phase 1 - see {@link X12TransactionSet}).
 *
 * @example
 * ```ts
 * import type { X12FunctionalGroup } from "@cosyte/x12";
 * declare const group: X12FunctionalGroup;
 * group.gs.elements[1]; // GS-01 - functional ID code
 * group.transactions.length;
 * ```
 */
export interface X12FunctionalGroup {
  readonly gs: GsSegment;
  readonly ge: GeSegment | undefined;
  readonly transactions: readonly X12TransactionSet[];
}

/**
 * Where an orphan sat in the STRUCTURE of the interchange, as opposed to
 * where it sat in the input byte stream. This is what lets `serializeX12`
 * put an orphan back without guessing.
 *
 * `X12OrphanSegment.segmentIndex` cannot do that job. It indexes the INPUT
 * stream, and the emit is not in input order: `ta1Segments` are hoisted ahead
 * of the groups, and a doubled terminator's zero-length segment occupies an
 * input index that is never emitted. Either one shifts the output's indices
 * away from the input's, so replaying by index splices the orphan into
 * whatever occupies that slot - measurably, into an 835's `ST..SE` body,
 * where a re-parse reports nothing. An anchor names a slot in the typed tree
 * instead, which survives both reorderings because it does not mention bytes.
 *
 * Three kinds, one per structural level:
 *
 * - **`"interchange"`** - between the ISA and the IEA but outside every
 *   functional group. `groupIndex` is the number of groups that had already
 *   closed, so the orphan is emitted immediately before `ix.groups[groupIndex]`
 *   (or before the IEA when `groupIndex === ix.groups.length`).
 * - **`"group"`** - inside `ix.groups[groupIndex]` but outside every
 *   transaction set in it. `transactionIndex` is the number of transactions
 *   that had already closed, so the orphan is emitted immediately before that
 *   group's `transactions[transactionIndex]` (or before its `GE` when
 *   `transactionIndex === transactions.length`).
 * - **`"transaction"`** - inside an open `ST..SE`, which only a `TA1` can be,
 *   since every other segment arriving there is body content. `segmentOffset`
 *   is the number of `rawSegments` already collected, so the orphan is emitted
 *   immediately before `rawSegments[segmentOffset]`. It is never `0` (the `ST`
 *   is always `rawSegments[0]`) and never exceeds `rawSegments.length`. Such an
 *   orphan is written back BETWEEN the `ST` and the `SE`, so `serializeX12`
 *   counts it toward SE-01 in spec-clean mode even though it is not on
 *   `tx.rawSegments` - it is a segment of that transaction set per X12.6.
 *
 * **An anchor is a POSITION, so reshaping the model invalidates it.** The
 * indices address `ix.groups`, that group's `transactions`, and that
 * transaction's `rawSegments` as they stand on the interchange you pass to
 * `serializeX12`. Filter or reorder any of those and an orphan's anchor may
 * still resolve while naming a different slot, and it will be emitted there
 * with no warning. An anchor that resolves to nothing is emitted at
 * interchange level before the IEA rather than dropped. Re-parse rather than
 * hand-edit if you need anchors to stay meaningful.
 *
 * @example
 * ```ts
 * import { parseX12 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const o of ix.orphanSegments) {
 *   if (o.anchor.kind === "group") console.warn(o.anchor.groupIndex);
 * }
 * ```
 */
export type X12OrphanAnchor =
  | {
      readonly kind: "interchange";
      /** How many functional groups had closed before this segment arrived. */
      readonly groupIndex: number;
    }
  | {
      readonly kind: "group";
      /** Index into `ix.groups` of the group that was open. */
      readonly groupIndex: number;
      /** How many transaction sets in that group had closed. */
      readonly transactionIndex: number;
    }
  | {
      readonly kind: "transaction";
      /** Index into `ix.groups` of the group that was open. */
      readonly groupIndex: number;
      /** Index into that group's `transactions` of the set that was open. */
      readonly transactionIndex: number;
      /** How many of that set's `rawSegments` had been collected. */
      readonly segmentOffset: number;
    };

/**
 * String-literal union over the `kind` discriminant of {@link X12OrphanAnchor}.
 *
 * @example
 * ```ts
 * import type { X12OrphanAnchorKind } from "@cosyte/x12";
 * const kind: X12OrphanAnchorKind = "transaction";
 * ```
 */
export type X12OrphanAnchorKind = X12OrphanAnchor["kind"];

/**
 * A segment the envelope grammar has no place for, captured verbatim rather
 * than discarded. Every segment recorded here also raised exactly one
 * `X12_UNEXPECTED_SEGMENT` warning whose `position.segmentIndex` equals
 * {@link segmentIndex}, and `context` is that warning's library-owned
 * discriminant, so the two surfaces can be joined without string matching.
 *
 * These are structural anomalies, not a normal shape: a stray segment
 * between `GE` and `IEA`, a body segment between an `SE` and its group's
 * `GE`, a body segment between `GS` and the first `ST`, an `ST` with no open
 * group, an `SE` closing nothing, a `GE` closing nothing, or a `TA1` inside
 * an open functional group. The parser cannot place any of them in the typed
 * tree, but it no longer drops them either, so a segment that used to vanish
 * is now readable here.
 *
 * **Most of these sit outside every ST..SE transaction set, but the `TA1`
 * case does not.** `TA1` is envelope-level by spec, so a `TA1` anywhere
 * inside an open group is routed here even when it arrives BETWEEN an `ST`
 * and its `SE` - in which case it is lifted out of that transaction's
 * `segments` / `rawSegments` and appears only on this array. That is
 * long-standing behaviour (it predates this array; the segment simply used
 * to be discarded), and it is the one case where `ix.groups` is not the whole
 * typed model.
 *
 * **`serializeX12` re-emits these, at {@link anchor}**, so an orphan and its
 * `X12_UNEXPECTED_SEGMENT` warning both survive a round trip. Placement is by
 * the structural anchor and NEVER by {@link segmentIndex}: that index is an
 * index into the INPUT stream, and the emit is not in input order (it hoists
 * `ta1Segments` ahead of the groups and skips the zero-length segment a
 * doubled terminator produces), so replaying by index splices an orphan into
 * whatever occupies that slot - measurably, into an 835's `ST..SE` body,
 * where a re-parse reports nothing at all. Use {@link segmentIndex} to join
 * back to the warning, not to place the segment. See `KNOWN-LIMITATIONS.md`.
 *
 * Two things are NOT recorded here. A doubled segment terminator delimits a
 * zero-length segment carrying no elements, so there is nothing to retain.
 * A segment whose first element is empty (`*A*B~`) has no id for the
 * envelope walker to dispatch on and is skipped without a warning; that is
 * long-standing behaviour this array does not change.
 *
 * **This is document content, so treat it as PHI.** Unlike an
 * `X12ParseWarning`, whose `message` is a lookup into a frozen registry and
 * whose metadata is positional only, an orphan carries the sender's bytes
 * verbatim, exactly as `X12TransactionSet.rawSegments` and `isa.raw` do. A
 * segment outside a transaction is not required to be PHI-free, so do NOT
 * log this array wholesale when triaging; log `context` and `segmentIndex`,
 * which name the structural rule and the location without echoing content.
 *
 * @example
 * ```ts
 * import { parseX12 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const o of ix.orphanSegments) {
 *   console.warn(o.context, o.segmentIndex, o.segment.id);
 * }
 * ```
 */
export interface X12OrphanSegment {
  /** The verbatim segment text, segment terminator stripped. */
  readonly raw: string;
  /** The decoded segment (id + 1-indexed elements), as for any body segment. */
  readonly segment: X12Segment;
  /**
   * Global segment index in the post-ISA stream (ISA itself is index 0) -
   * identical to the `position.segmentIndex` of the segment's
   * `X12_UNEXPECTED_SEGMENT` warning.
   */
  readonly segmentIndex: number;
  /** Which structural rule the segment broke. */
  readonly context: X12UnexpectedSegmentContext;
  /**
   * Where the segment sat in the typed tree - the slot `serializeX12` puts it
   * back into. See {@link X12OrphanAnchor} for why a structural anchor and not
   * {@link segmentIndex} is what makes re-emission sound.
   */
  readonly anchor: X12OrphanAnchor;
}

/**
 * The top-level X12 interchange returned by `parseX12`. `isa` carries the
 * envelope header verbatim; `delimiters` is the four-class delimiter set
 * detected from fixed positions inside `isa.raw`; `groups` is the ordered
 * GS..GE list; `orphanSegments` holds any segment that fell outside every
 * transaction set (empty for a well-formed interchange); `warnings`
 * accumulates every Tier-2 deviation observed during the parse (lenient
 * mode); `trailingBytes` (when present) is any non-empty content after IEA -
 * preserved verbatim so a consumer can inspect or re-emit it.
 *
 * @example
 * ```ts
 * import { parseX12 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * for (const w of ix.warnings) console.warn(w.code, w.position);
 * ```
 */
export interface X12Interchange {
  readonly isa: IsaSegment;
  readonly iea: IeaSegment | undefined;
  readonly delimiters: Delimiters;
  readonly groups: readonly X12FunctionalGroup[];
  readonly ta1Segments: readonly Ta1Segment[];
  /**
   * Segments the envelope grammar could not place, in input order - almost
   * always because they fell outside every ST..SE transaction set, plus the
   * `TA1`-inside-a-group case, which is lifted out of the transaction it
   * arrived in. Empty for a well-formed interchange. See
   * {@link X12OrphanSegment}.
   */
  readonly orphanSegments: readonly X12OrphanSegment[];
  readonly warnings: readonly X12ParseWarning[];
  readonly trailingBytes?: string;
  /**
   * The trading-partner {@link X12Profile} in effect for this parse, if any -
   * either passed explicitly via `options.profile` or resolved from the
   * process-scoped default. Present only when a profile applied; used for
   * attribution and as the partition basis for `partitionWarnings`.
   */
  readonly profile?: X12Profile;
}

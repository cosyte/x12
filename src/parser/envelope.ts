/**
 * Envelope decoder for the `@cosyte/x12` parser pipeline. Consumes a raw
 * input string + the {@link Delimiters} detected by `./delimiters.ts` and
 * walks ISA → GS..GE+ → IEA, producing an {@link X12Interchange}. Phase 1
 * keeps ST..SE transaction bodies **opaque** - `transactions[].segments`
 * carries raw segment strings (terminator stripped); Phase 2 adds segment
 * decode on top.
 *
 * Postel's Law: every deviation past the ISA itself is a Tier-2 warning,
 * never a throw. Truncated input (missing IEA / GE / SE) is recovered as
 * best-effort with `iea`/`ge`/`se` set to `undefined` on the affected
 * parent. Trailing bytes after IEA are preserved on
 * `X12Interchange.trailingBytes`.
 */

import { ISA_MIN_LENGTH } from "./delimiters.js";
import { RELEASE_CHAR, splitWithRelease } from "./release.js";
import { decodeSegment, type X12Segment } from "./segment.js";
import type {
  Delimiters,
  GeSegment,
  GsSegment,
  IeaSegment,
  IsaSegment,
  Ta1Segment,
  X12FunctionalGroup,
  X12OrphanAnchor,
  X12OrphanSegment,
  X12Position,
  X12TransactionSet,
} from "./types.js";
import {
  CONTROL_NUMBER_PAIRS,
  UNEXPECTED_SEGMENT_CONTEXTS,
  controlNumberMismatch,
  groupCountMismatch,
  isaExtraElementSeparator,
  missingGe,
  missingIea,
  missingSe,
  pre005010,
  trailingGarbage,
  transactionCountMismatch,
  unexpectedSegment,
} from "./warnings.js";
import type { X12ParseWarning, X12UnexpectedSegmentContext } from "./warnings.js";

/**
 * How many parts a conformant ISA element area yields when split on the
 * element separator: the literal `"ISA"` plus the 16 fixed-width elements.
 * `detectDelimiters` guarantees this as a floor (it verifies the separator at
 * all 16 fixed byte positions); anything above it is an element value carrying
 * the separator byte.
 *
 * @internal
 */
const ISA_DECODED_PART_COUNT = 17;

/**
 * Slice the ISA from the input and decode its 16 elements. `raw` is the
 * exact first-106 bytes (including the trailing segment terminator); this
 * is what gets preserved verbatim on {@link IsaSegment}.`raw` so a
 * round-trip can reproduce the input byte-exact regardless of any lenient
 * normalization downstream. `elements[0]` is `"ISA"`; `elements[1..16]`
 * are the 16 fixed-width values, with leading/trailing element-separator-
 * adjacent padding preserved verbatim (X12 element widths are spec-fixed,
 * so consumers can trim if they wish - we never do, to keep round-trip
 * byte-exact).
 *
 * **The ISA is the one segment whose element split is NOT release-aware, and
 * that is deliberate.** ASC X12 .5 makes the ISA fixed-width: every element
 * has a spec-fixed width and the separators sit at known byte offsets, which
 * is precisely what lets `detectDelimiters` recover the delimiter set from an
 * interchange before anything is parsed. `buildInterchange` states the same
 * rule from the emit side ("pad each element, never escape - the separators
 * are the ISA's own structural bytes, declared in-band"), so a `?` inside an
 * ISA element is content, never an escape. Splitting it with
 * {@link "./release.js".splitWithRelease} would let a `?` one byte before a
 * separator swallow that separator and collapse the segment to fewer than 17
 * parts, mis-framing every element after it on a document that is in fact
 * well-formed. `splitElements` covers every OTHER envelope segment, all of
 * which are ordinary delimited segments.
 *
 * **The split is NOT guaranteed to yield 17 parts, and this function does not
 * make it so.** `detectDelimiters` verifies the separator at all 16 fixed
 * positions, which bounds the split from below - it can never come out SHORT.
 * It does not bound it from above: an ISA element value carrying the byte that
 * was declared in-band as the element separator splits again, so that element
 * comes back a prefix and every element after it is displaced by one.
 * {@link decodeEnvelope} reports that as `X12_ISA_EXTRA_ELEMENT_SEPARATOR` and
 * re-frames nothing; `raw` still holds all 106 bytes, which is the route back
 * to the transmitted bytes.
 *
 * @internal
 */
function decodeIsa(raw: string, delimiters: Delimiters): IsaSegment {
  const isaRaw = raw.slice(0, ISA_MIN_LENGTH);
  // The terminator is at byte 105; the 105-byte head is the elements area.
  const isaHead = isaRaw.slice(0, ISA_MIN_LENGTH - 1);
  // Split into ["ISA", e1, e2, …, e16]. The element-separator-position guard
  // in delimiters.ts makes 17 the FLOOR, not the count: a separator byte
  // inside an element value splits again. Checked by the caller, never
  // corrected here. Positional, never release-aware: see above.
  const parts = isaHead.split(delimiters.element);
  return { raw: isaRaw, elements: Object.freeze(parts.slice()) };
}

/**
 * Strip the run of CR / LF bytes at the head of the remaining input. Many
 * real-world senders append a line break after every segment terminator for
 * human readability; the parser silently tolerates it (no warning - matches
 * the hl7 Tier-1 silent-normalize stance for line endings).
 *
 * **The tolerance is any number of CR and LF bytes in any order**, so a
 * pretty-printed file (`~\r\n`, `~\r`, `~\n`), a double-spaced one (`~\n\n`),
 * a file whose endings were doubled in transit (`~\r\r\n`) and a
 * reversed-order pair (`~\n\r`) all frame identically. It used to be exactly
 * one optional CR followed by one optional LF, which admitted only 4 of the
 * 15 CR/LF sequences up to length three; the other 11 left a break in the
 * stream that opened a segment whose name began with it, so every subsequent
 * segment was unrecognized and the whole interchange body was lost. Nothing
 * about that loss was recoverable from the emit, which is why the bound is
 * gone rather than merely widened by one.
 *
 * This cannot swallow a segment terminator: `detectDelimiters` rejects any
 * ASCII control character (which includes CR and LF) at ALL FOUR delimiter
 * positions, the segment terminator among them, as the Tier-3 fatal
 * `X12_INVALID_DELIMITERS`. So a run of CR / LF between segments is never
 * itself structural. (The terminator is the byte immediately AFTER ISA-16,
 * ISA byte 106; ISA-16 itself is the component separator.)
 *
 * **What is absorbed here is not recorded anywhere on the model**, so
 * `serializeX12` cannot reproduce it and a pretty-printed source does not
 * round-trip byte-identically. Line breaks are not the only such thing (see
 * the `../serialize/serialize.ts` module header for the full list), but they
 * are the one this function is responsible for, and the only one that is
 * purely cosmetic: across the 56 committed fixtures the emit differs from a
 * pretty-printed source by line breaks and nothing else, and re-parses to an
 * identical model with an identical warning stream. See
 * `docs-content/spec-notes-envelope.md` for the consumer-facing statement.
 *
 * @internal
 */
function stripLeadingNewlines(text: string, start: number): number {
  let i = start;
  while (i < text.length) {
    const code = text.charCodeAt(i);
    if (code !== 0x0d && code !== 0x0a) break;
    i++;
  }
  return i;
}

/**
 * Find the next UNescaped segment terminator at or after `from`, honouring
 * the `?`-release-character escape exactly as the element splitter
 * ({@link "./release.js".splitWithRelease}) does: a `?` consumes the byte
 * that follows it (so `?~` is a literal `~`, never a terminator; `??~` is a
 * literal `?` then a real terminator). Returns the index of the first
 * unescaped terminator, or `-1` if none remains. A naive `indexOf` would
 * split on an escaped terminator and corrupt any value carrying a literal
 * segment-terminator byte - the asymmetry the serializer's `escapeRelease`
 * is meant to prevent.
 *
 * @internal
 */
function findUnescapedTerminator(text: string, from: number, term: string): number {
  // When the terminator IS the release character (a degenerate delimiter
  // set), `?` cannot also escape - fall back to a literal scan so a `?`
  // terminator still splits, matching the historical behaviour.
  if (term.length !== 1 || term === RELEASE_CHAR) return text.indexOf(term, from);
  let i = from;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (ch === RELEASE_CHAR && i + 1 < text.length) {
      i += 2;
      continue;
    }
    if (ch === term) return i;
    i += 1;
  }
  return -1;
}

/**
 * Yield successive segment strings (terminator-stripped) from the input,
 * starting at byte `start`. Returns the array of segment strings and the
 * byte index immediately after the last consumed segment terminator
 * (used by the caller to detect trailing garbage after IEA).
 *
 * @internal
 */
function splitSegments(
  text: string,
  start: number,
  delimiters: Delimiters,
): { segments: string[]; endIndex: number } {
  const segments: string[] = [];
  const term = delimiters.segment;
  let cursor = stripLeadingNewlines(text, start);
  let lastEnd = cursor;
  while (cursor < text.length) {
    const termIdx = findUnescapedTerminator(text, cursor, term);
    if (termIdx === -1) {
      // No further terminator - the trailing bytes are an unterminated
      // segment. Preserve them as a final segment so they're visible to
      // the caller (the envelope walker will surface them as a missing
      // trailer warning if they were structural). If they're not a real
      // segment (e.g. just whitespace from a misbehaving sender) they
      // simply become an unknown trailing segment that downstream
      // walking ignores.
      const tail = text.slice(cursor);
      if (tail.length > 0) {
        segments.push(tail);
        lastEnd = text.length;
      }
      break;
    }
    segments.push(text.slice(cursor, termIdx));
    cursor = termIdx + term.length;
    lastEnd = cursor;
    cursor = stripLeadingNewlines(text, cursor);
  }
  return { segments, endIndex: lastEnd };
}

/**
 * Split a single segment string into its name + element array using the
 * element separator, honouring the `?`-release-character escape exactly as
 * {@link "./segment.js".decodeSegment} does for body segments and as
 * {@link findUnescapedTerminator} already does for the terminator.
 * `elements[0]` is the segment name; subsequent entries are the elements
 * 1-indexed against the X12 spec convention.
 *
 * This is the ENVELOPE segments' splitter - `GS`, `GE`, `ST`, `SE`, `IEA`,
 * `TA1`, and the dispatch name of anything the walker has to place. It used
 * to be a plain `String.prototype.split`, which meant a released element
 * separator (`?*`) still ended the element and SHIFTED every element after
 * it down a slot: `GS*HC*SEND?*ER*RCV*...` read ten elements, so GS-08 was
 * answered out of GS-07's slot. Nothing warned on the shift itself, and the
 * one warning that did appear (`X12_CONTROL_NUMBER_MISMATCH`, when the
 * displaced slot happened to be a control number) named a different problem.
 * The package's own `buildInterchange` releases the caller-supplied elements
 * it emits into a `GS` or an `ST` and then returns `parseX12` of its own bytes,
 * so the two halves disagreed inside a single call. **That sentence used to
 * enumerate the slots (`GS-02 / GS-03 / GS-06 / GS-08` and `ST-01 / ST-02 /
 * ST-03`) and the enumeration went stale twice** - it never included GS-01, and
 * `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` then added GS-04 / GS-05 / GS-07,
 * which are exactly the slots it omitted. A property does not go stale; a
 * census does. The slots that are still NOT released are recorded in
 * `KNOWN-LIMITATIONS.md`, beside the reason, rather than here.
 *
 * Values stay RAW here - the release sequence is preserved inside the token,
 * never unescaped - which is the same contract {@link "./segment.js".X12Segment}
 * states for `elements`. Two properties follow and both are relied on:
 * `elements.join(delimiters.element)` still reproduces the segment byte for
 * byte (which is what lets `../serialize/serialize.ts` substitute a
 * recomputed count into a control segment), and a consumer reading
 * `gs.elements[8]` gets the sender's bytes rather than a normalization.
 *
 * The ISA is deliberately NOT split this way - see {@link decodeIsa}.
 *
 * @internal
 */
function splitElements(segment: string, delimiters: Delimiters): readonly string[] {
  // Degenerate delimiter set: when the element separator IS the release
  // character, `?` cannot also escape, so fall back to the literal split.
  // `detectDelimiters` reads the element separator positionally out of ISA
  // byte 4 and rejects only control characters and a non-distinct set, so `?`
  // there is admissible and such an interchange framed correctly before this
  // splitter became release-aware. `findUnescapedTerminator` above and
  // `./segment.js`'s `decodeSegment` each carry the identical guard for the
  // identical reason; keep the three in step. `decodeSegment` was the one that
  // did NOT: this splitter framed a degenerate interchange's ENVELOPE
  // correctly while every BODY segment inside it collapsed to a single
  // element, with an empty warning array, until
  // `X12-BODY-DEGENERATE-RELEASE-SEPARATOR`.
  if (delimiters.element === RELEASE_CHAR) {
    return Object.freeze(segment.split(delimiters.element));
  }
  return Object.freeze(splitWithRelease(segment, delimiters.element));
}

/**
 * Read an element from a readonly array, defaulting to `""` for missing
 * positions. Used as the lenient narrowing for malformed-but-not-fatal
 * segment shapes (e.g. a truncated `IEA~` with no IEA-01 / IEA-02). The
 * "missing" branch is exercised by `parser-envelope.test.ts`' truncated-
 * segment sweep; this single helper consolidates the `noUncheckedIndexedAccess`
 * narrowing into one branch rather than dozens of inline `?? ""`.
 *
 * @internal
 */
function el(elements: readonly string[], index: number): string {
  return elements[index] ?? "";
}

/**
 * Decode an interchange body - everything past the ISA - into the typed
 * `groups`/`iea`/`trailingBytes` shape and the warnings collected along
 * the way. Pure function with the caller-supplied delimiters; never
 * throws (lenient mode is the only mode at this layer - Tier-3 fatals
 * arose earlier in `detectDelimiters`).
 *
 * @internal
 */
export function decodeEnvelope(
  raw: string,
  delimiters: Delimiters,
): {
  isa: IsaSegment;
  groups: readonly X12FunctionalGroup[];
  iea: IeaSegment | undefined;
  ta1Segments: readonly Ta1Segment[];
  orphanSegments: readonly X12OrphanSegment[];
  trailingBytes: string | undefined;
  warnings: readonly X12ParseWarning[];
} {
  const warnings: X12ParseWarning[] = [];
  /**
   * Single chokepoint that collects every warning emitted from any sub-
   * pass (envelope walker + per-segment decode). Defined once here so the
   * three `decodeSegment` call sites (ST / SE / body) share one function
   * identity - the alternative (inline arrows per call site) inflates
   * function count for the coverage gate without changing behavior.
   */
  const collectWarning = (w: X12ParseWarning): void => {
    warnings.push(w);
  };
  const isa = decodeIsa(raw, delimiters);

  // ISA arity - the header must split into "ISA" plus its 16 fixed-width
  // elements. Reported FIRST, because when it fails every ISA element after
  // the extra separator is displaced by one and the two checks below read
  // `elements[12]` and `elements[13]` by index. Nothing is re-framed and no
  // other warning is suppressed: which reading of that byte is right is not
  // decided here, and `isa.raw` still carries all 106 bytes.
  if (isa.elements.length !== ISA_DECODED_PART_COUNT) {
    warnings.push(isaExtraElementSeparator({ segmentIndex: 0, interchangeIndex: 0 }));
  }

  // Pre-005010 detection - ISA-12 != "00501" (Tier-2 warning, never refused).
  const isa12 = el(isa.elements, 12);
  if (isa12 !== "00501") {
    warnings.push(pre005010({ segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 }));
  }

  const { segments } = splitSegments(raw, ISA_MIN_LENGTH, delimiters);

  // Walk the segment stream. State machine: optional currentGroup,
  // optional currentTransaction. Segment index (`segIdx`) is global to
  // the post-ISA stream + 1 (segIdx=0 is ISA itself); used for warning
  // positional context.
  const groups: X12FunctionalGroup[] = [];
  const ta1Segments: Ta1Segment[] = [];
  const orphanSegments: X12OrphanSegment[] = [];
  let iea: IeaSegment | undefined;
  let trailingBytes: string | undefined;

  type OpenTx = {
    st: { raw: string; elements: readonly string[] };
    segments: X12Segment[];
    rawSegments: string[];
    startSegIdx: number;
  };
  type OpenGroup = {
    gs: GsSegment;
    transactions: X12TransactionSet[];
    startSegIdx: number;
  };

  let currentGroup: OpenGroup | undefined;
  let currentTx: OpenTx | undefined;

  /**
   * Describe the walker's CURRENT structural position as an
   * {@link X12OrphanAnchor}. Derived from the open-group / open-transaction
   * state rather than from `segIdx`, and that is the whole point: the emit
   * reorders segments relative to the input (it hoists `ta1Segments`) and
   * skips input positions that were never segments (the zero-length segment a
   * doubled terminator delimits), so an input index does not name a slot in
   * the output. A slot in the typed tree does.
   *
   * Every index it produces is guaranteed to exist by the time the walk ends:
   * `groups.length` is the index the currently open group will be pushed at
   * (`finalizeGroup` always runs, at `IEA` or at EOF), and
   * `currentGroup.transactions.length` likewise for the open transaction. An
   * index EQUAL to the eventual length is meaningful, not out of range - it
   * means "after the last one", i.e. immediately before the `GE` or the `IEA`.
   *
   * `segmentOffset` is never `0`: `rawSegments` opens with the `ST`, so a
   * segment arriving inside an open transaction always follows at least one.
   *
   * @internal
   */
  const currentAnchor = (): X12OrphanAnchor => {
    if (currentGroup === undefined) {
      return { kind: "interchange", groupIndex: groups.length };
    }
    if (currentTx === undefined) {
      return {
        kind: "group",
        groupIndex: groups.length,
        transactionIndex: currentGroup.transactions.length,
      };
    }
    return {
      kind: "transaction",
      groupIndex: groups.length,
      transactionIndex: currentGroup.transactions.length,
      segmentOffset: currentTx.rawSegments.length,
    };
  };

  /**
   * Single chokepoint for a segment the envelope grammar has nowhere to put.
   * Raises the one `X12_UNEXPECTED_SEGMENT` warning for it AND retains it
   * verbatim on `orphanSegments`, so the two surfaces always agree and the
   * segment is never dropped. The parser is lenient, and dropping a segment
   * a sender transmitted is the one thing leniency must not cost. Each entry
   * also carries the structural `anchor` the serializer puts it back at, taken
   * here rather than reconstructed later so retention, the warning and the
   * re-emission can never disagree about where the segment was.
   * `segmentIndex` on the warning position is the join key back to the
   * retained segment - a join key, never a placement.
   */
  const recordOrphan = (
    segmentText: string,
    position: X12Position,
    context: X12UnexpectedSegmentContext,
  ): void => {
    const anchor = currentAnchor();
    warnings.push(unexpectedSegment(position, context));
    orphanSegments.push({
      raw: segmentText,
      segment: decodeSegment(segmentText, delimiters, collectWarning, position),
      segmentIndex: position.segmentIndex,
      context,
      anchor,
    });
  };

  /**
   * Finalize an open transaction and push it onto its parent group.
   * Passes both the tx and its parent group as parameters so TypeScript
   * carries the non-null narrowing through and no defensive `?? return`
   * guard is needed.
   */
  const finalizeTx = (
    tx: OpenTx,
    group: OpenGroup,
    se: { raw: string; elements: readonly string[] } | undefined,
  ): void => {
    if (se === undefined) {
      warnings.push(
        missingSe({
          segmentIndex: tx.startSegIdx,
          interchangeIndex: 0,
          groupIndex: groups.length,
          transactionIndex: group.transactions.length,
        }),
      );
    }
    group.transactions.push({
      st: tx.st,
      se,
      segments: Object.freeze(tx.segments.slice()),
      rawSegments: Object.freeze(tx.rawSegments.slice()),
    });
  };

  /**
   * Finalize an open group and push it onto the interchange. If a
   * transaction is still open inside it, close that first (with
   * MISSING_SE). If GE is absent, warn MISSING_GE. Otherwise emit
   * count/control-number reconciliation warnings.
   */
  const finalizeGroup = (group: OpenGroup, ge: GeSegment | undefined): void => {
    if (ge === undefined) {
      warnings.push(
        missingGe({
          segmentIndex: group.startSegIdx,
          interchangeIndex: 0,
          groupIndex: groups.length,
        }),
      );
    } else {
      // GE-01 transaction count vs actual ST count.
      const declared = el(ge.elements, 1);
      const actual = group.transactions.length;
      if (declared !== String(actual)) {
        warnings.push(
          transactionCountMismatch({
            segmentIndex: group.startSegIdx,
            interchangeIndex: 0,
            groupIndex: groups.length,
            elementIndex: 1,
          }),
        );
      }
      // GS-06 ↔ GE-02 control number reconciliation.
      const gsControl = el(group.gs.elements, 6);
      const geControl = el(ge.elements, 2);
      if (gsControl !== geControl) {
        warnings.push(
          controlNumberMismatch(
            {
              segmentIndex: group.startSegIdx,
              interchangeIndex: 0,
              groupIndex: groups.length,
              elementIndex: 2,
            },
            CONTROL_NUMBER_PAIRS.GROUP,
          ),
        );
      }
    }
    groups.push({
      gs: group.gs,
      ge,
      transactions: Object.freeze(group.transactions.slice()),
    });
  };

  // ISA itself occupies segIdx 0; the body starts at segIdx 1.
  for (let i = 0; i < segments.length; i++) {
    const segmentText = el(segments, i);
    const segIdx = i + 1;
    const elements = splitElements(segmentText, delimiters);
    const name = el(elements, 0);

    switch (name) {
      case "TA1": {
        // TA1 is an envelope-level Interchange Acknowledgment. Per the ASC
        // X12 standard it appears between ISA and the first GS, or between
        // groups, or alone in an ISA..IEA with no GS at all (TA1-only
        // interchange). At envelope level it is structurally expected - no
        // unexpected-segment warning.
        //
        // This case ALWAYS wins for a `TA1` id; there is no fall-through to
        // the default branch. So a `TA1` inside an open group is routed to
        // `orphanSegments` even when it arrived between an `ST` and its
        // `SE`, which lifts it out of that transaction's segments rather
        // than keeping it as a body segment. That is deliberate (it is an
        // envelope segment wherever it appears) and long-standing, and it is
        // the one orphan context that does NOT mean "outside every
        // transaction set". An earlier revision of this comment claimed the
        // default branch handled it; it never ran.
        //
        // The raw + elements pair mirrors ISA / GS / GE / IEA so consumers
        // can narrow uniformly across every typed envelope segment.
        if (currentGroup === undefined) {
          ta1Segments.push({ raw: segmentText, elements });
          break;
        }
        // TA1 inside an open group is non-spec - fall through to the
        // unexpected-segment path so the structural break is flagged. It is
        // NOT added to `ta1Segments` (that surface means "envelope-level
        // TA1", and `parseTA1` reads it), but it is retained verbatim on
        // `orphanSegments` so the segment itself is not lost.
        recordOrphan(
          segmentText,
          {
            segmentIndex: segIdx,
            interchangeIndex: 0,
            groupIndex: groups.length,
          },
          UNEXPECTED_SEGMENT_CONTEXTS.TA1_INSIDE_GROUP,
        );
        break;
      }
      case "GS": {
        // Opening a new group while one is still open → close the old
        // (will warn MISSING_GE; the still-open tx, if any, closes with
        // MISSING_SE).
        if (currentGroup !== undefined) {
          if (currentTx !== undefined) {
            finalizeTx(currentTx, currentGroup, undefined);
            currentTx = undefined;
          }
          finalizeGroup(currentGroup, undefined);
        }
        currentGroup = {
          gs: { raw: segmentText, elements },
          transactions: [],
          startSegIdx: segIdx,
        };
        break;
      }
      case "GE": {
        if (currentGroup === undefined) {
          // Stray GE outside any open group - preserve lenient-never-
          // throw, but surface as `X12_UNEXPECTED_SEGMENT` so consumers
          // can flag the structural break. It closes nothing, so it has no
          // place in the typed tree; it is retained on `orphanSegments`.
          recordOrphan(
            segmentText,
            { segmentIndex: segIdx, interchangeIndex: 0 },
            UNEXPECTED_SEGMENT_CONTEXTS.GE_WITHOUT_GS,
          );
          break;
        }
        if (currentTx !== undefined) {
          finalizeTx(currentTx, currentGroup, undefined);
          currentTx = undefined;
        }
        finalizeGroup(currentGroup, { raw: segmentText, elements });
        currentGroup = undefined;
        break;
      }
      case "ST": {
        if (currentGroup === undefined) {
          // ST outside any group is structurally wrong; preserve
          // lenient and surface as `X12_UNEXPECTED_SEGMENT`. No transaction
          // set is opened (there is no group to hold it), so the segment is
          // retained on `orphanSegments` rather than dropped.
          recordOrphan(
            segmentText,
            { segmentIndex: segIdx, interchangeIndex: 0 },
            UNEXPECTED_SEGMENT_CONTEXTS.ST_WITHOUT_GS,
          );
          break;
        }
        // Opening a new ST while one is still open → close the old
        // (will warn MISSING_SE).
        if (currentTx !== undefined) {
          finalizeTx(currentTx, currentGroup, undefined);
        }
        const stDecoded = decodeSegment(segmentText, delimiters, collectWarning, {
          segmentIndex: segIdx,
          interchangeIndex: 0,
          groupIndex: groups.length,
          transactionIndex: currentGroup.transactions.length,
        });
        currentTx = {
          st: { raw: segmentText, elements },
          segments: [stDecoded],
          rawSegments: [segmentText],
          startSegIdx: segIdx,
        };
        break;
      }
      case "SE": {
        // SE outside any open tx is structurally wrong; preserve lenient
        // and surface as `X12_UNEXPECTED_SEGMENT`.
        if (currentTx === undefined || currentGroup === undefined) {
          recordOrphan(
            segmentText,
            { segmentIndex: segIdx, interchangeIndex: 0 },
            UNEXPECTED_SEGMENT_CONTEXTS.SE_WITHOUT_ST,
          );
          break;
        }
        const seDecoded = decodeSegment(segmentText, delimiters, collectWarning, {
          segmentIndex: segIdx,
          interchangeIndex: 0,
          groupIndex: groups.length,
          transactionIndex: currentGroup.transactions.length,
        });
        currentTx.segments.push(seDecoded);
        currentTx.rawSegments.push(segmentText);
        const se = { raw: segmentText, elements };
        // ST-02 ↔ SE-02 control-number reconciliation.
        const stControl = el(currentTx.st.elements, 2);
        const seControl = el(se.elements, 2);
        if (stControl !== seControl) {
          warnings.push(
            controlNumberMismatch(
              {
                segmentIndex: currentTx.startSegIdx,
                interchangeIndex: 0,
                groupIndex: groups.length,
                transactionIndex: currentGroup.transactions.length,
                elementIndex: 2,
              },
              CONTROL_NUMBER_PAIRS.TRANSACTION,
            ),
          );
        }
        finalizeTx(currentTx, currentGroup, se);
        currentTx = undefined;
        break;
      }
      case "IEA": {
        // Close any still-open group/transaction (warnings emitted).
        if (currentGroup !== undefined) {
          if (currentTx !== undefined) {
            finalizeTx(currentTx, currentGroup, undefined);
          }
          finalizeGroup(currentGroup, undefined);
        }
        // Currents are not reset here because the IEA branch returns
        // immediately after the trailing-bytes block below - no further
        // iteration will read them.
        iea = { raw: segmentText, elements };
        // IEA-01 group count vs actual.
        const declared = el(elements, 1);
        if (declared !== String(groups.length)) {
          warnings.push(
            groupCountMismatch({ segmentIndex: segIdx, interchangeIndex: 0, elementIndex: 1 }),
          );
        }
        // ISA-13 ↔ IEA-02 control number reconciliation.
        const isaControl = el(isa.elements, 13);
        const ieaControl = el(elements, 2);
        if (isaControl !== ieaControl) {
          warnings.push(
            controlNumberMismatch(
              { segmentIndex: segIdx, interchangeIndex: 0, elementIndex: 2 },
              CONTROL_NUMBER_PAIRS.INTERCHANGE,
            ),
          );
        }
        // Trailing-bytes detection - anything past IEA is multi-ISA or
        // garbage (multi-ISA support is out of v1 scope per roadmap §2).
        // Best-effort preservation: join the leftover segment slices
        // with the segment terminator and append a final terminator.
        // Not byte-exact for trailing content; consumers needing the
        // raw second-interchange bytes should re-tokenize.
        const tail = segments.slice(i + 1).join(delimiters.segment);
        if (tail.length > 0) {
          const joined = tail + delimiters.segment;
          trailingBytes = joined;
          warnings.push(trailingGarbage({ segmentIndex: segIdx + 1, interchangeIndex: 0 }));
        }
        // Stop walking once IEA is consumed (multi-ISA support is out
        // of v1 scope per roadmap §2 non-goals).
        return {
          isa,
          groups: Object.freeze(groups.slice()),
          iea,
          ta1Segments: Object.freeze(ta1Segments.slice()),
          orphanSegments: Object.freeze(orphanSegments.slice()),
          trailingBytes,
          warnings: Object.freeze(warnings.slice()),
        };
      }
      default: {
        // Body segment of an open transaction → decode and append.
        if (currentTx !== undefined && currentGroup !== undefined) {
          const decoded = decodeSegment(segmentText, delimiters, collectWarning, {
            segmentIndex: segIdx,
            interchangeIndex: 0,
            groupIndex: groups.length,
            transactionIndex: currentGroup.transactions.length,
          });
          currentTx.segments.push(decoded);
          currentTx.rawSegments.push(segmentText);
        } else if (name.length > 0) {
          // Outside any transaction, a body segment is structurally
          // unexpected. The empty-name guard skips the synthetic empty
          // "segment" the splitter produces after a trailing terminator
          // (e.g. an interchange that ends `...IEA*1*1~\r\n` - the
          // post-terminator newline-only chunk is not a real segment).
          recordOrphan(
            segmentText,
            { segmentIndex: segIdx, interchangeIndex: 0 },
            UNEXPECTED_SEGMENT_CONTEXTS.BODY_OUTSIDE_TRANSACTION,
          );
        }
        break;
      }
    }
  }

  // EOF without IEA → close anything open and warn. The function returns
  // immediately after, so resetting `currentTx`/`currentGroup` is moot.
  if (currentGroup !== undefined) {
    if (currentTx !== undefined) {
      finalizeTx(currentTx, currentGroup, undefined);
    }
    finalizeGroup(currentGroup, undefined);
  }
  warnings.push(missingIea({ segmentIndex: segments.length + 1, interchangeIndex: 0 }));

  return {
    isa,
    groups: Object.freeze(groups.slice()),
    iea,
    ta1Segments: Object.freeze(ta1Segments.slice()),
    orphanSegments: Object.freeze(orphanSegments.slice()),
    trailingBytes,
    warnings: Object.freeze(warnings.slice()),
  };
}

/**
 * The emit half of the `@cosyte/x12` parser - `serializeX12` turns any
 * {@link X12Interchange} back into an X12 byte stream. Two modes:
 *
 * - **Byte-faithful (default).** Reconstructs the interchange purely from the
 *   verbatim `.raw` strings the parser preserved (ISA + terminator, then each
 *   GS / transaction segment / GE / IEA terminator-joined, then any
 *   `trailingBytes`). "Byte-faithful" is a statement about SEGMENTS ON THE
 *   MODEL, and the distinction matters to anyone diffing output against input.
 *
 *   Every segment the parser recorded comes back verbatim, including element
 *   padding, composite structure and `?`-release escapes, but it comes back in
 *   the ORDER the model holds it, which is not always the input order. SIX
 *   constructs are known not to survive, and line breaks are only the most
 *   common:
 *
 *   1. **Line breaks between segments.** The parser absorbs any run of CR /
 *      LF bytes between segments and the model has nowhere to record it, so a
 *      pretty-printed or double-spaced source emits as its compact form.
 *      Silent.
 *   2. **A doubled segment terminator** outside a transaction. It delimits a
 *      zero-length segment carrying no elements, so there is nothing to
 *      retain. Silent.
 *   3. **A missing final terminator**, which the emit supplies. Silent.
 *   4. **Post-IEA `trailingBytes`**, re-joined from segment slices rather than
 *      preserved verbatim.
 *   5. **TA1 position.** A TA1 that appeared AFTER a functional group is
 *      collected onto `ix.ta1Segments` and emitted immediately after the ISA,
 *      so the emit reorders it. Silent, and unlike the others nothing is
 *      dropped: the model and the warning stream both round-trip identically.
 *      This is also the only construct that can move something ELSE - a
 *      segment outside a transaction is placed correctly relative to the
 *      groups but not relative to a TA1 that was hoisted past it. This library
 *      takes no position here on where ASC X12 requires a TA1 to sit.
 *   6. **A segment whose first element is empty** (`*A*B~`), outside a
 *      transaction. It has no id for the envelope walker to dispatch on, so it
 *      is skipped: absent from the model, absent from the emit, and it does
 *      not even raise `X12_UNEXPECTED_SEGMENT`. Silent, and the only case here
 *      that loses a value with no diagnostic at all. Inside an open
 *      transaction the same segment is kept and re-emitted normally.
 *
 *   **A segment outside a transaction is no longer on that list.** It is
 *   retained on `ix.orphanSegments` with a structural `anchor`, and this
 *   function re-emits it at that anchor, so the segment, its value and its
 *   `X12_UNEXPECTED_SEGMENT` warning all survive the round trip. See the
 *   `orphans` block below for why placement is by anchor and never by
 *   `segmentIndex`.
 *
 *   So `serialize(parse(s)) === s` is still NOT guaranteed in general, and the
 *   absence of line breaks is still not sufficient to make it hold: cases 2 to
 *   6 all break it on inputs that contain none. Five of the six (1, 2, 3, 5, 6)
 *   produce no warning at all, so the warning stream is not a reliable signal
 *   that a round trip will be byte-exact - only case 4 warns.
 *
 *   What IS measured, across the 56 committed fixtures: all 56 emits are fixed
 *   points (serializing again is a byte-level no-op), all 56 re-parse to an
 *   identical model with an identical warning stream, the 14 fixtures carrying
 *   no line breaks return byte-identical, and the 42 that are pretty-printed
 *   differ from their source by line breaks and nothing else. Two caveats on
 *   that corpus: it contains no instance of cases 2 to 6 and no orphan at all,
 *   and 13 of the 14 byte-identical fixtures are `golden/*.edi`, which are
 *   serializer output by construction, so `envelope/no-trailing-crlf.edi` is
 *   the only independent witness. `test/serialize.test.ts` covers the corpus
 *   sweep, the orphan round trip, and cases 1 to 6 separately.
 *
 * - **Spec-clean (`{ specClean: true }`).** Same byte-faithful structure, but
 *   the serializer ALSO reconciles the envelope counts and control numbers.
 *   Every count is taken from the bytes this function WRITES, which for SE-01
 *   is `tx.rawSegments` PLUS any orphan re-emitted between the `ST` and the
 *   `SE` - a lifted `TA1` is off the model's transaction but is still a
 *   segment of that transaction set per X12.6, and counting the model alone
 *   made `recomputeCounts` shrink a correct SE-01. The pairs reconciled are
 *   SE-01 (segment count) vs the actual ST..SE segment count, GE-01
 *   (transaction count) vs the actual ST count, IEA-01 (group count) vs the
 *   actual group count, plus the ISA-13↔IEA-02 / GS-06↔GE-02 / ST-02↔SE-02
 *   control-number pairs. A mismatch is surfaced via `opts.onWarning` and
 *   NEVER silently corrected - the output keeps the model's values unless the
 *   caller ALSO opts in with `{ recomputeCounts: true }`, which substitutes
 *   the recomputed SE-01 / GE-01 / IEA-01 counts into the emitted control
 *   segments. Control numbers are identity, not derived, so they are NEVER
 *   rewritten - only flagged.
 *
 * Every warning it emits is built by the same value-free factories the parser
 * uses: `message` is a frozen-registry lookup and `position` locates the
 * control segment, so a declared count or control number can never reach a
 * diagnostic.
 */

import type {
  OnWarningCallback,
  X12Interchange,
  X12OrphanAnchor,
  X12OrphanSegment,
} from "../parser/types.js";
import {
  CONTROL_NUMBER_PAIRS,
  controlNumberMismatch,
  groupCountMismatch,
  segmentCountMismatch,
  transactionCountMismatch,
  type X12ParseWarning,
} from "../parser/warnings.js";

/**
 * Options accepted by {@link serializeX12}. Every field is optional;
 * `serializeX12(ix)` produces the byte-faithful reconstruction with no
 * reconciliation.
 *
 * @remarks
 * With `exactOptionalPropertyTypes: true`, do not pass `specClean: undefined`
 * explicitly - omit the key instead.
 *
 * @example
 * ```ts
 * import { serializeX12, parseX12 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * // Spec-clean emit that fixes any stale envelope counts:
 * const out = serializeX12(ix, {
 *   specClean: true,
 *   recomputeCounts: true,
 *   onWarning: (w) => console.warn(w.code, w.message),
 * });
 * ```
 */
export interface SerializeOptions {
  /**
   * Reconcile envelope counts + control-number pairs and surface any
   * mismatch via {@link onWarning}. Default `false` (pure byte-faithful
   * reconstruction, no reconciliation, no warnings).
   */
  readonly specClean?: boolean;
  /**
   * Substitute the recomputed SE-01 / GE-01 / IEA-01 counts into the emitted
   * control segments (only meaningful with `specClean: true`). Default
   * `false` - the serializer warns on a count mismatch but emits the model's
   * verbatim value. Control NUMBERS are never rewritten regardless.
   */
  readonly recomputeCounts?: boolean;
  /** Invoked once per reconciliation warning (spec-clean mode only). */
  readonly onWarning?: OnWarningCallback;
}

/**
 * Serialize an {@link X12Interchange} back to an X12 byte stream. Pure
 * function - never throws, never mutates the input, never performs I/O. See
 * the module header for the two emit modes.
 *
 * @example
 * ```ts
 * import { parseX12, serializeX12 } from "@cosyte/x12";
 * const ix = parseX12(raw);
 * // Segments on the model come back verbatim, orphans included. Anything the
 * // parser did not record (line breaks, a doubled terminator, ...) does not,
 * // so this is not guaranteed to equal `raw`. See the module header.
 * const bytes = serializeX12(ix);
 * ```
 */
export function serializeX12(interchange: X12Interchange, opts: SerializeOptions = {}): string {
  const specClean = opts.specClean === true;
  const recompute = specClean && opts.recomputeCounts === true;
  const onWarning = opts.onWarning;
  const elementSep = interchange.delimiters.element;
  const term = interchange.delimiters.segment;

  const emit = (warning: X12ParseWarning): void => {
    if (onWarning !== undefined) onWarning(warning);
  };

  // ISA.raw already carries its segment terminator (the 106-byte head); every
  // other raw is terminator-stripped, so they are joined with `term`.
  let out = interchange.isa.raw;

  // Running global segment index for warning positions. ISA occupies index 0.
  let segIdx = 0;

  // `ix.orphanSegments` IS re-emitted, and every orphan is placed by its
  // `anchor` - the structural slot the walker recorded - never by its
  // `segmentIndex`.
  //
  // That distinction is the whole correctness argument. `segmentIndex` is an
  // index into the INPUT stream, and this function does not emit in input
  // order: `ta1Segments` are hoisted ahead of the groups (the documented TA1
  // reordering), and a zero-length segment from a doubled terminator occupies
  // an input index that is never emitted. Either one shifts the output's
  // indices away from the input's, so replaying by index splices the orphan
  // into whatever happens to occupy that slot in the emit. Measured on a
  // 2-group interchange with a TA1 after the first group, an earlier revision
  // that did exactly that put a stray `ZZ` segment INSIDE the 835's ST..SE
  // body, between `CLP` and `SE`, where a re-parse produced NO warning at all
  // and `get835` would have walked it as claim content; with a stray `SE` it
  // closed the transaction early and corrupted SE-01. An anchor names a slot
  // in the typed tree ("before group 1", "before transaction 0 of group 0",
  // "before raw segment 2 of that transaction"), and a slot in the tree is
  // invariant under both reorderings, because it does not mention bytes.
  //
  // The consequence a caller can rely on: a re-parse of the emit raises the
  // SAME `X12_UNEXPECTED_SEGMENT` warning, with the same `context`, for the
  // same segment, and the emit is a fixed point.
  const orphans: readonly X12OrphanSegment[] = interchange.orphanSegments ?? [];
  const placed = new Set<number>();

  /**
   * Emit, in input order, every not-yet-emitted orphan whose anchor matches
   * `slot`, and advance the running segment index for each so the spec-clean
   * warning positions keep naming the segment they describe. Returns how many
   * were written, which the SE-01 reconciliation needs: an orphan flushed
   * between the `ST` and the `SE` is a segment of that transaction set as far
   * as X12.6 is concerned, however the model files it.
   */
  const flushOrphans = (slot: (anchor: X12OrphanAnchor | undefined) => boolean): number => {
    let written = 0;
    for (const [i, orphan] of orphans.entries()) {
      if (placed.has(i)) continue;
      if (!slot(orphan.anchor)) continue;
      placed.add(i);
      out += orphan.raw + term;
      segIdx++;
      written++;
    }
    return written;
  };

  for (const ta1 of interchange.ta1Segments) {
    out += ta1.raw + term;
    segIdx++;
  }

  for (const [g, group] of interchange.groups.entries()) {
    flushOrphans((a) => a?.kind === "interchange" && a.groupIndex === g);
    const gsSegIdx = ++segIdx;
    out += group.gs.raw + term;

    for (const [t, tx] of group.transactions.entries()) {
      flushOrphans((a) => a?.kind === "group" && a.groupIndex === g && a.transactionIndex === t);
      const lastIdx = tx.rawSegments.length - 1;
      // SE-01 is "number of segments included in the transaction set, including
      // ST and SE" (X12.6). It must therefore describe the bytes THIS function
      // writes between the ST and the SE, not `rawSegments.length` alone: a
      // `TA1` that arrived inside an open ST..SE is lifted off the transaction
      // by the walker (it is envelope-level by spec) but is re-emitted where it
      // came from, so it is one of those segments. Counting only the model
      // would make `recomputeCounts` write a count one short per such orphan -
      // measured rewriting a correct `SE*4*` down to `SE*3*` over four emitted
      // segments, which is a safety-critical count the library corrupted rather
      // than corrected. An orphan flushed BEFORE the ST or AFTER the SE is
      // outside the range and is deliberately not counted.
      let segCount = tx.rawSegments.length;
      // Provisional until the ST is actually written: an orphan anchored ahead
      // of it (only reachable from a hand-assembled model, since the walker
      // never records `segmentOffset: 0`) would otherwise shift it.
      let stSegIdx = segIdx + 1;

      for (const [k, raw] of tx.rawSegments.entries()) {
        const inside = flushOrphans(
          (a) =>
            a?.kind === "transaction" &&
            a.groupIndex === g &&
            a.transactionIndex === t &&
            a.segmentOffset === k,
        );
        if (k === 0) stSegIdx = segIdx + 1;
        else segCount += inside;
        segIdx++;
        // The final raw segment is the SE (when the transaction is not
        // truncated). In recompute mode, substitute the corrected SE-01. Every
        // orphan inside the range has been flushed by now: the `k === lastIdx`
        // flush above runs before this write.
        if (recompute && tx.se !== undefined && k === lastIdx) {
          out += substituteElement(tx.se.elements, 1, String(segCount), elementSep) + term;
        } else {
          out += raw + term;
        }
      }

      // A transaction that never saw its SE can carry an orphan anchored past
      // its last raw segment (`GS ... ST ... TA1 GE`), so drain that slot too.
      // Keyed on the MODEL's length, not the adjusted `segCount`, because the
      // anchor was recorded against the model. Such an orphan lands after the
      // last raw segment, so it is outside any ST..SE range and is not counted.
      flushOrphans(
        (a) =>
          a?.kind === "transaction" &&
          a.groupIndex === g &&
          a.transactionIndex === t &&
          a.segmentOffset === tx.rawSegments.length,
      );

      if (specClean && tx.se !== undefined) {
        const declaredSe = elementAt(tx.se.elements, 1);
        if (declaredSe !== String(segCount)) {
          emit(
            segmentCountMismatch({
              segmentIndex: stSegIdx,
              interchangeIndex: 0,
              groupIndex: g,
              transactionIndex: t,
              elementIndex: 1,
            }),
          );
        }
        const st02 = elementAt(tx.st.elements, 2);
        const se02 = elementAt(tx.se.elements, 2);
        if (st02 !== se02) {
          emit(
            controlNumberMismatch(
              {
                segmentIndex: stSegIdx,
                interchangeIndex: 0,
                groupIndex: g,
                transactionIndex: t,
                elementIndex: 2,
              },
              CONTROL_NUMBER_PAIRS.TRANSACTION,
            ),
          );
        }
      }
    }

    // Anything anchored after the group's last transaction sits between it and
    // the GE, which is where `se-without-st`, `ta1-inside-group` and a body
    // segment between an SE and its group's GE all land.
    flushOrphans(
      (a) =>
        a?.kind === "group" &&
        a.groupIndex === g &&
        a.transactionIndex === group.transactions.length,
    );

    if (group.ge !== undefined) {
      const txCount = group.transactions.length;
      segIdx++;
      if (recompute) {
        out += substituteElement(group.ge.elements, 1, String(txCount), elementSep) + term;
      } else {
        out += group.ge.raw + term;
      }
      if (specClean) {
        const declaredGe = elementAt(group.ge.elements, 1);
        if (declaredGe !== String(txCount)) {
          emit(
            transactionCountMismatch({
              segmentIndex: gsSegIdx,
              interchangeIndex: 0,
              groupIndex: g,
              elementIndex: 1,
            }),
          );
        }
        const gs06 = elementAt(group.gs.elements, 6);
        const ge02 = elementAt(group.ge.elements, 2);
        if (gs06 !== ge02) {
          emit(
            controlNumberMismatch(
              { segmentIndex: gsSegIdx, interchangeIndex: 0, groupIndex: g, elementIndex: 2 },
              CONTROL_NUMBER_PAIRS.GROUP,
            ),
          );
        }
      }
    }
  }

  // Everything left goes here, immediately before the IEA: the orphans that
  // genuinely sat after the last group, and - defensively - any orphan whose
  // anchor names a slot this model does not have, which only a hand-assembled
  // interchange can produce. Emitting an unplaceable orphan at interchange
  // level re-parses as an orphan again rather than corrupting anything, and it
  // is preferable to dropping a segment the caller put on the model. The one
  // caveat is a `TA1`: at interchange level it is a well-formed envelope
  // acknowledgment, so a misanchored one re-parses onto `ta1Segments` instead
  // of `orphanSegments`.
  flushOrphans((a) => a?.kind === "interchange" && a.groupIndex === interchange.groups.length);
  flushOrphans(() => true);

  if (interchange.iea !== undefined) {
    const groupCount = interchange.groups.length;
    segIdx++;
    if (recompute) {
      out += substituteElement(interchange.iea.elements, 1, String(groupCount), elementSep) + term;
    } else {
      out += interchange.iea.raw + term;
    }
    if (specClean) {
      const declaredIea = elementAt(interchange.iea.elements, 1);
      if (declaredIea !== String(groupCount)) {
        emit(groupCountMismatch({ segmentIndex: segIdx, interchangeIndex: 0, elementIndex: 1 }));
      }
      const isa13 = elementAt(interchange.isa.elements, 13);
      const iea02 = elementAt(interchange.iea.elements, 2);
      if (isa13 !== iea02) {
        emit(
          controlNumberMismatch(
            { segmentIndex: segIdx, interchangeIndex: 0, elementIndex: 2 },
            CONTROL_NUMBER_PAIRS.INTERCHANGE,
          ),
        );
      }
    }
  }

  if (interchange.trailingBytes !== undefined) {
    out += interchange.trailingBytes;
  }

  return out;
}

/**
 * Read an element by index, defaulting to `""` for missing positions -
 * mirrors the envelope walker's `el` narrowing so truncated control segments
 * reconcile against `""` rather than throwing.
 *
 * @internal
 */
function elementAt(elements: readonly string[], index: number): string {
  return elements[index] ?? "";
}

/**
 * Rebuild a control segment's raw text with one element substituted. The
 * element arrays on ISA / GS / GE / IEA / ST / SE come from a plain
 * element-separator split, so `elements.join(elementSep)` is the exact
 * inverse - substituting an index and rejoining yields a spec-clean raw. The
 * substituted values here are always recomputed integer counts (SE-01 / GE-01
 * / IEA-01), never PHI. A missing index is a no-op (returns the verbatim
 * join) so truncated segments degrade gracefully.
 *
 * @internal
 */
function substituteElement(
  elements: readonly string[],
  index: number,
  value: string,
  elementSep: string,
): string {
  if (index >= elements.length) return elements.join(elementSep);
  const copy = elements.slice();
  copy[index] = value;
  return copy.join(elementSep);
}

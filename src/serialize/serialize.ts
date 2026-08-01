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
 *   the ORDER the model holds it, which is not always the input order. Six
 *   constructs are known not to survive, and line breaks are only the most
 *   common:
 *
 *   1. **Line breaks between segments.** The parser absorbs an optional CR
 *      then an optional LF after each terminator and the model has nowhere to
 *      record it, so a pretty-printed source emits as its compact form.
 *      Silent.
 *   2. **Segments outside a transaction** (a stray segment between GE and IEA,
 *      say). These raise `X12_UNEXPECTED_SEGMENT` on the first parse but are
 *      not kept, so they are absent from the emit AND the warning does not
 *      recur when the emit is re-parsed.
 *   3. **A doubled segment terminator** outside a transaction. Silent.
 *   4. **A missing final terminator**, which the emit supplies. Silent.
 *   5. **Post-IEA `trailingBytes`**, re-joined from segment slices rather than
 *      preserved verbatim.
 *   6. **TA1 position.** A TA1 that appeared AFTER a functional group is
 *      collected onto `ix.ta1Segments` and emitted immediately after the ISA,
 *      so the emit reorders it. Silent, and unlike 1 to 5 nothing is dropped:
 *      the model and the warning stream both round-trip identically. This
 *      library takes no position here on where ASC X12 requires a TA1 to sit.
 *
 *   So `serialize(parse(s)) === s` is NOT guaranteed in general, and the
 *   absence of line breaks is not sufficient to make it hold: cases 2 to 6 all
 *   break it on inputs that contain none. Four of the six (1, 3, 4, 6) produce
 *   no warning at all, so the warning stream is not a reliable signal that a
 *   round trip will be byte-exact. Do not use `serialize(parse(s))` as a
 *   normalization step before comparing warnings, because case 2 discards a
 *   warning along with its segment.
 *
 *   What IS measured, across the 56 committed fixtures: all 56 emits are fixed
 *   points (serializing again is a byte-level no-op), all 56 re-parse to an
 *   identical model with an identical warning stream, the 14 fixtures carrying
 *   no line breaks return byte-identical, and the 42 that are pretty-printed
 *   differ from their source by line breaks and nothing else. Two caveats on
 *   that corpus: it contains no instance of cases 2 to 6, and 13 of the 14
 *   byte-identical fixtures are `golden/*.edi`, which are serializer output by
 *   construction, so `envelope/no-trailing-crlf.edi` is the only independent
 *   witness. `test/serialize.test.ts` covers the corpus sweep and cases 2 to 6
 *   separately.
 *
 * - **Spec-clean (`{ specClean: true }`).** Same byte-faithful structure, but
 *   the serializer ALSO reconciles the envelope counts and control numbers:
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
 * diagnostic. Read the declared and actual values off the model
 * (`se.elements[1]` against `tx.rawSegments.length`, `ge.elements[1]` against
 * `group.transactions.length`, `iea.elements[1]` against `ix.groups.length`).
 */

import type { OnWarningCallback, X12Interchange } from "../parser/types.js";
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
 * // Segments on the model come back verbatim. Anything the parser did not
 * // record (line breaks, segments outside a transaction, ...) does not, so
 * // this is not guaranteed to equal `raw`. See the module header.
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

  for (const ta1 of interchange.ta1Segments) {
    out += ta1.raw + term;
    segIdx++;
  }

  for (const [g, group] of interchange.groups.entries()) {
    const gsSegIdx = ++segIdx;
    out += group.gs.raw + term;

    for (const [t, tx] of group.transactions.entries()) {
      const stSegIdx = segIdx + 1;
      const segCount = tx.rawSegments.length;
      const lastIdx = tx.rawSegments.length - 1;

      for (const [k, raw] of tx.rawSegments.entries()) {
        segIdx++;
        // The final raw segment is the SE (when the transaction is not
        // truncated). In recompute mode, substitute the corrected SE-01.
        if (recompute && tx.se !== undefined && k === lastIdx) {
          out += substituteElement(tx.se.elements, 1, String(segCount), elementSep) + term;
        } else {
          out += raw + term;
        }
      }

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

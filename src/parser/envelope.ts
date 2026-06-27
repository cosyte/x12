/**
 * Envelope decoder for the `@cosyte/x12` parser pipeline. Consumes a raw
 * input string + the {@link Delimiters} detected by `./delimiters.ts` and
 * walks ISA → GS..GE+ → IEA, producing an {@link X12Interchange}. Phase 1
 * keeps ST..SE transaction bodies **opaque** — `transactions[].segments`
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
import type {
  Delimiters,
  GeSegment,
  GsSegment,
  IeaSegment,
  IsaSegment,
  X12FunctionalGroup,
  X12TransactionSet,
} from "./types.js";
import {
  controlNumberMismatch,
  groupCountMismatch,
  missingGe,
  missingIea,
  missingSe,
  pre005010,
  trailingGarbage,
  transactionCountMismatch,
} from "./warnings.js";
import type { X12ParseWarning } from "./warnings.js";

/**
 * Slice the ISA from the input and decode its 16 elements. `raw` is the
 * exact first-106 bytes (including the trailing segment terminator); this
 * is what gets preserved verbatim on {@link IsaSegment}.`raw` so a
 * round-trip can reproduce the input byte-exact regardless of any lenient
 * normalization downstream. `elements[0]` is `"ISA"`; `elements[1..16]`
 * are the 16 fixed-width values, with leading/trailing element-separator-
 * adjacent padding preserved verbatim (X12 element widths are spec-fixed,
 * so consumers can trim if they wish — we never do, to keep round-trip
 * byte-exact).
 *
 * @internal
 */
function decodeIsa(raw: string, delimiters: Delimiters): IsaSegment {
  const isaRaw = raw.slice(0, ISA_MIN_LENGTH);
  // The terminator is at byte 105; the 105-byte head is the elements area.
  const isaHead = isaRaw.slice(0, ISA_MIN_LENGTH - 1);
  // Split into ["ISA", e1, e2, …, e16] — exactly 17 entries by construction
  // because the element-separator-position guard in delimiters.ts already
  // verified the layout.
  const parts = isaHead.split(delimiters.element);
  return { raw: isaRaw, elements: Object.freeze(parts.slice()) };
}

/**
 * Strip a single optional CRLF / CR / LF sequence at the head of the
 * remaining input. Many real-world senders append CRLF after every segment
 * terminator for human readability; Phase 1 silently tolerates it (no
 * warning — matches the hl7 Tier-1 silent-normalize stance for line
 * endings).
 *
 * @internal
 */
function stripLeadingNewlines(text: string, start: number): number {
  let i = start;
  if (text.charCodeAt(i) === 0x0d) i++;
  if (text.charCodeAt(i) === 0x0a) i++;
  return i;
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
    const termIdx = text.indexOf(term, cursor);
    if (termIdx === -1) {
      // No further terminator — the trailing bytes are an unterminated
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
 * element separator. `elements[0]` is the segment name; subsequent entries
 * are the elements 1-indexed against the X12 spec convention.
 *
 * @internal
 */
function splitElements(segment: string, delimiters: Delimiters): readonly string[] {
  return Object.freeze(segment.split(delimiters.element));
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
 * Decode an interchange body — everything past the ISA — into the typed
 * `groups`/`iea`/`trailingBytes` shape and the warnings collected along
 * the way. Pure function with the caller-supplied delimiters; never
 * throws (lenient mode is the only mode at this layer — Tier-3 fatals
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
  trailingBytes: string | undefined;
  warnings: readonly X12ParseWarning[];
} {
  const warnings: X12ParseWarning[] = [];
  const isa = decodeIsa(raw, delimiters);

  // Pre-005010 detection — ISA-12 != "00501" (Tier-2 warning, never refused).
  const isa12 = el(isa.elements, 12);
  if (isa12 !== "00501") {
    warnings.push(pre005010({ segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 }, isa12));
  }

  const { segments } = splitSegments(raw, ISA_MIN_LENGTH, delimiters);

  // Walk the segment stream. State machine: optional currentGroup,
  // optional currentTransaction. Segment index (`segIdx`) is global to
  // the post-ISA stream + 1 (segIdx=0 is ISA itself); used for warning
  // positional context.
  const groups: X12FunctionalGroup[] = [];
  let iea: IeaSegment | undefined;
  let trailingBytes: string | undefined;

  type OpenTx = {
    st: { raw: string; elements: readonly string[] };
    segments: string[];
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
          transactionCountMismatch(
            {
              segmentIndex: group.startSegIdx,
              interchangeIndex: 0,
              groupIndex: groups.length,
              elementIndex: 1,
            },
            declared,
            actual,
          ),
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
            "GS-06/GE-02",
            gsControl,
            geControl,
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
          // Stray GE outside any open group — no Phase 1 code covers
          // this exact case; we drop it silently (Phase 2 may add
          // `X12_UNEXPECTED_SEGMENT`). Preserving lenient-never-throw.
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
          // lenient and ignore (a future code can flag it).
          break;
        }
        // Opening a new ST while one is still open → close the old
        // (will warn MISSING_SE).
        if (currentTx !== undefined) {
          finalizeTx(currentTx, currentGroup, undefined);
        }
        currentTx = {
          st: { raw: segmentText, elements },
          segments: [segmentText],
          startSegIdx: segIdx,
        };
        break;
      }
      case "SE": {
        // SE outside any open tx is structurally wrong; drop lenient.
        if (currentTx === undefined || currentGroup === undefined) break;
        currentTx.segments.push(segmentText);
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
              "ST-02/SE-02",
              stControl,
              seControl,
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
        // immediately after the trailing-bytes block below — no further
        // iteration will read them.
        iea = { raw: segmentText, elements };
        // IEA-01 group count vs actual.
        const declared = el(elements, 1);
        if (declared !== String(groups.length)) {
          warnings.push(
            groupCountMismatch(
              { segmentIndex: segIdx, interchangeIndex: 0, elementIndex: 1 },
              declared,
              groups.length,
            ),
          );
        }
        // ISA-13 ↔ IEA-02 control number reconciliation.
        const isaControl = el(isa.elements, 13);
        const ieaControl = el(elements, 2);
        if (isaControl !== ieaControl) {
          warnings.push(
            controlNumberMismatch(
              { segmentIndex: segIdx, interchangeIndex: 0, elementIndex: 2 },
              "ISA-13/IEA-02",
              isaControl,
              ieaControl,
            ),
          );
        }
        // Trailing-bytes detection — anything past IEA is multi-ISA or
        // garbage (multi-ISA support is out of v1 scope per roadmap §2).
        // Best-effort preservation: join the leftover segment slices
        // with the segment terminator and append a final terminator.
        // Not byte-exact for trailing content; consumers needing the
        // raw second-interchange bytes should re-tokenize.
        const tail = segments.slice(i + 1).join(delimiters.segment);
        if (tail.length > 0) {
          const joined = tail + delimiters.segment;
          trailingBytes = joined;
          warnings.push(
            trailingGarbage({ segmentIndex: segIdx + 1, interchangeIndex: 0 }, joined.length),
          );
        }
        // Stop walking once IEA is consumed (multi-ISA support is out
        // of v1 scope per roadmap §2 non-goals).
        return {
          isa,
          groups: Object.freeze(groups.slice()),
          iea,
          trailingBytes,
          warnings: Object.freeze(warnings.slice()),
        };
      }
      default: {
        // Body segment of an open transaction → preserve verbatim.
        if (currentTx !== undefined) {
          currentTx.segments.push(segmentText);
        }
        // Outside any transaction, body segments are ignored at Phase 1
        // (Phase 2 will surface them via UNKNOWN_SEGMENT once the loop
        // grammar lands).
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
    trailingBytes,
    warnings: Object.freeze(warnings.slice()),
  };
}

/**
 * Envelope decoder for the `@cosyte/x12` parser pipeline. Consumes a raw
 * input string + the {@link Delimiters} detected by `./delimiters.ts` and
 * walks ISA → GS..GE+ → IEA, producing an {@link X12Interchange}. This stage
 * keeps ST..SE transaction bodies **opaque** - `transactions[].segments`
 * carries raw segment strings (terminator stripped); `./segment.ts` adds
 * segment decode on top.
 *
 * Postel's Law: every deviation past the ISA itself is a Tier-2 warning,
 * never a throw. Truncated input (missing IEA / GE / SE) is recovered as
 * best-effort with `iea`/`ge`/`se` set to `undefined` on the affected
 * parent. Trailing bytes after IEA are preserved on
 * `X12Interchange.trailingBytes`.
 */

import { frameBinary } from "./binary.js";
import { ISA_MIN_LENGTH } from "./delimiters.js";
import { RELEASE_CHAR, RELEASE_CODE, splitWithRelease } from "./release.js";
import { decodeSegmentAt, type X12Segment } from "./segment.js";
import { recordTransactionStart } from "./transaction-start.js";
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
 * comes back a prefix and everything after it is displaced. **How far is not
 * derivable from `parts`**: more than one element can do it, and an element
 * sitting between two of them is displaced less than one sitting after both.
 * {@link decodeEnvelope} reports that as `X12_ISA_EXTRA_ELEMENT_SEPARATOR` and
 * re-frames nothing; `raw` still holds all 106 bytes, which is the route back
 * to the transmitted bytes.
 *
 * @internal
 */
export function decodeIsa(raw: string, delimiters: Delimiters): IsaSegment {
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
 * purely cosmetic: across every committed fixture the emit differs from a
 * pretty-printed source by line breaks and nothing else, and re-parses to an
 * identical model with an identical warning stream. No corpus size is quoted
 * here, because it moves with every fixture added. See
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
function findUnescapedTerminator(
  text: string,
  from: number,
  term: string,
  release: ReleaseCursor,
): number {
  // When the terminator IS the release character (a degenerate delimiter
  // set), `?` cannot also escape - fall back to a literal scan so a `?`
  // terminator still splits, matching the historical behaviour.
  if (term.length !== 1 || term === RELEASE_CHAR) return text.indexOf(term, from);
  // Jump between candidates with `indexOf` rather than reading every byte: a
  // terminator is the answer unless a release character comes before it, and
  // a release character consumes the byte after it, which may be that
  // terminator. Every search starts where the last stopped, the release
  // character's included (see `ReleaseCursor`), so a whole split is linear.
  let candidate = text.indexOf(term, from);
  let i = from;
  while (candidate !== -1) {
    const at = nextRelease(text, i, release);
    if (at === -1 || at > candidate) return candidate;
    // `at + 1` exists: the candidate terminator is at or after it.
    i = at + 2;
    if (i > candidate) candidate = text.indexOf(term, i);
  }
  return -1;
}

/**
 * Where the next release character is, remembered across the searches of one
 * split. A split asks from positions that only move forward, so the answer to
 * the last question still holds while it is at or after the new position, and
 * `-1` (none left) holds for good. Without it each segment's search for a `?`
 * ran to the end of an input that has none, which made splitting a long input
 * quadratic.
 *
 * @internal
 */
interface ReleaseCursor {
  /** The next release character at or after the last search's start; `-1` for none; `-2` before any search. */
  at: number;
}

/** The release character at or after `from`, or `-1`. @internal */
function nextRelease(text: string, from: number, cursor: ReleaseCursor): number {
  if (cursor.at === -1 || cursor.at >= from) return cursor.at;
  cursor.at = text.indexOf(RELEASE_CHAR, from);
  return cursor.at;
}

/**
 * Find the terminator that ends a BDS or BIN segment whose data element is
 * framed by its count (see `./binary.ts`). The declared span is skipped whole,
 * whatever delimiter or release bytes it holds, so a terminator byte inside the
 * binary data never ends the segment. Returns `-1` when the span reaches the
 * end of the input, in which case the rest of the input is this segment: when
 * the input ends before the span does, nothing past its end is read.
 *
 * Where the byte after the span is not the terminator (a declared length that
 * disagrees with the data), the segment runs to the next unescaped terminator
 * after the span, so every byte the sender transmitted stays on the segment's
 * raw text and the default emit reproduces it; `decodeSegment` reports the
 * disagreement.
 *
 * @internal
 */
function findBinaryTerminator(
  text: string,
  frame: { readonly dataStart: number; readonly declared: number },
  term: string,
  release: ReleaseCursor,
): number {
  const spanEnd = frame.dataStart + frame.declared;
  if (spanEnd >= text.length) return -1;
  if (text.startsWith(term, spanEnd)) return spanEnd;
  return findUnescapedTerminator(text, spanEnd, term, release);
}

/**
 * Whether a segment terminator written right after `segment` would end it, so that reading
 * `segment + terminator` gives back `segment` and nothing else. It would not after a dangling
 * release character (`REF*EA*A?`, where the `?` releases the terminator) or after a BDS or BIN
 * whose declared octet count runs past the segment's end (the terminator becomes data). Either
 * can only be the last segment of an input that ended without its final terminator, and an emit
 * that supplies one there writes a different segment from the one it read. Decided by the same
 * framing the reader uses, so the two cannot disagree.
 *
 * @internal
 */
export function endsAtTerminator(segment: string, delimiters: Delimiters): boolean {
  const { segments } = splitSegments(segment + delimiters.segment, 0, delimiters);
  return segments.length === 1 && segments[0] === segment;
}

/**
 * Yield successive segment strings (terminator-stripped) from the input,
 * starting at byte `start`. Returns the array of segment strings and the
 * byte index immediately after the last consumed segment terminator
 * (used by the caller to detect trailing garbage after IEA).
 *
 * Every segment is ended by its first unescaped terminator, except a BDS or
 * BIN whose length element can be honoured: its binary data element is framed
 * by that count instead (see {@link findBinaryTerminator}).
 *
 * @internal
 */
export function splitSegments(
  text: string,
  start: number,
  delimiters: Delimiters,
): { segments: string[]; endIndex: number } {
  const segments: string[] = [];
  const term = delimiters.segment;
  const release: ReleaseCursor = { at: -2 };
  let cursor = stripLeadingNewlines(text, start);
  let lastEnd = cursor;
  while (cursor < text.length) {
    const binary = frameBinary(text, cursor, delimiters);
    const termIdx =
      binary?.kind === "counted"
        ? findBinaryTerminator(text, binary, term, release)
        : findUnescapedTerminator(text, cursor, term, release);
    if (termIdx === -1) {
      // No further terminator - the trailing bytes are an unterminated
      // segment. Preserve them as a final segment so they're visible to
      // the caller (the envelope walker will surface them as a missing
      // trailer warning if they were structural). If they're not a real
      // segment (e.g. just whitespace from a misbehaving sender) they
      // simply become an unknown trailing segment that downstream
      // walking ignores.
      const tail = text.slice(cursor);
      /* v8 ignore else -- the loop runs only while `cursor < text.length`, so the tail is never empty */
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
 * The segments {@link splitSegments} frames from `text` at `start` that no later input can change,
 * for a reader that receives an interchange in pieces: `segments` as it would frame them, and
 * `next`, where framing stopped. A segment counts once its terminator is in `text`; a BDS or BIN
 * framed by its count, once its declared span and the terminator after it are. Framing a segment
 * reads nothing after its terminator, so these are the segments a frame of the whole input holds
 * here. The rest of the input, once there is no more, goes to {@link splitSegments} itself.
 *
 * `wait` says what the segment at `next` waits for, so that a reader handed more input can tell
 * from the new input alone, with {@link awaitMore}, whether framing may go further, rather than
 * searching that segment again from its start.
 *
 * @internal
 */
export function frameSettled(
  text: string,
  start: number,
  delimiters: Delimiters,
): { segments: string[]; next: number; wait: FrameWait } {
  const segments: string[] = [];
  const term = delimiters.segment;
  // Stryker disable next-line ObjectLiteral: equivalent, the cursor only spares searches already made
  const release: ReleaseCursor = { at: -2 };
  let cursor = stripLeadingNewlines(text, start);
  // No test on `cursor`: at the end of `text` the search below finds no terminator.
  for (;;) {
    // The terminator the whole input would end this segment at, when it is already here: a
    // terminator found in `text` is the first unescaped one wherever the input ends, and once
    // there is one, the length element of a BDS or BIN has ended before it.
    let termIdx = findUnescapedTerminator(text, cursor, term, release);
    if (termIdx === -1) return { segments, next: cursor, wait: terminatorWait(text, cursor) };
    const binary = frameBinary(text, cursor, delimiters);
    if (binary?.kind === "counted") {
      // Its own cursor: the span can end before where the search above stopped.
      // Stryker disable next-line ObjectLiteral,UnaryOperator: equivalent, the cursor only spares searches already made
      termIdx = findBinaryTerminator(text, binary, term, { at: -2 });
      if (termIdx === -1) {
        const spanEnd = binary.dataStart + binary.declared;
        // Either the span has not all arrived, or no terminator follows it yet: the search for
        // one starts where the span ends.
        const wait: FrameWait =
          spanEnd >= text.length
            ? { kind: "length", length: spanEnd + 1 - cursor }
            : terminatorWait(text, spanEnd);
        return { segments, next: cursor, wait };
      }
    }
    segments.push(text.slice(cursor, termIdx));
    cursor = stripLeadingNewlines(text, termIdx + term.length);
  }
}

/**
 * What the segment {@link frameSettled} stopped at waits for before it can be framed:
 *
 * - `terminator`: a segment terminator no release character escapes, in input still to come.
 *   `released` says whether the first character to come is escaped by a release character at the
 *   end of the input so far.
 * - `length`: the declared span of a BDS or BIN, which needs the input from the segment's start to
 *   be at least `length` characters long before its end can be found.
 *
 * @internal
 */
export type FrameWait =
  | { readonly kind: "terminator"; readonly released: boolean }
  | { readonly kind: "length"; readonly length: number };

/**
 * The wait of a segment in `text` with no unescaped terminator from `from` on, where `from` is a
 * place the search starts with no release character pending. A character that is not a release
 * character leaves none pending, so only the run of release characters at the end of `text` (from
 * `from` on) counts: each pair is a released release character, and an odd one out escapes the
 * next character to come.
 *
 * @internal
 */
function terminatorWait(text: string, from: number): FrameWait {
  // Where the release character is the terminator, a search that found none read no release
  // character either, so the run is empty and nothing is escaped, as `findUnescapedTerminator`
  // has it there.
  let i = text.length;
  while (i > from && text.charCodeAt(i - 1) === RELEASE_CODE) i -= 1;
  return { kind: "terminator", released: (text.length - i) % 2 === 1 };
}

/**
 * Given `wait` from {@link frameSettled} and `piece`, the input that has arrived after the text it
 * framed, answer `undefined` when framing that text and `piece` together may frame the segment it
 * stopped at, or else what that segment still waits for. `length` is the length of the input from
 * that segment's start, `piece` included. Only `piece` is read, so a segment that spans many pieces
 * is searched once in all, not again from its start for each one.
 *
 * @internal
 */
export function awaitMore(
  wait: FrameWait,
  piece: string,
  length: number,
  term: string,
): FrameWait | undefined {
  if (wait.kind === "length") return length >= wait.length ? undefined : wait;
  // An empty piece escapes nothing, and leaves a pending release character pending.
  if (piece.length === 0) return wait;
  const from = wait.released ? 1 : 0;
  if (findUnescapedTerminator(piece, from, term, { at: -2 }) !== -1) return undefined;
  return terminatorWait(piece, from);
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
 * a later release then added GS-04 / GS-05 / GS-07,
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
 * The name the walker dispatches a segment on: the segment name
 * {@link splitElements} would put at `elements[0]` when that name is one of
 * the envelope's own (`GS`, `GE`, `ST`, `SE`, `IEA`, `TA1`), `""` when it is
 * empty, and {@link BODY_SEGMENT} for every other name. The name is found
 * without splitting the segment or slicing the name out of it: the walker needs
 * only this to place a body segment, and {@link decodeSegmentAt} splits that
 * segment once, so a body segment is no longer split twice.
 *
 * @internal
 */
function segmentName(segment: string, delimiters: Delimiters): string {
  const sep = delimiters.element;
  /* v8 ignore next -- `detectDelimiters` reads every delimiter as one character */
  if (sep.length !== 1) return dispatchName(el(splitElements(segment, delimiters), 0));
  let end = segment.length;
  if (sep === RELEASE_CHAR) {
    const at = segment.indexOf(sep);
    if (at !== -1) end = at;
  } else {
    const sepCode = sep.charCodeAt(0);
    for (let i = 0; i < segment.length; i += 1) {
      const code = segment.charCodeAt(i);
      if (code === RELEASE_CODE && i + 1 < segment.length) {
        i += 1;
      } else if (code === sepCode) {
        end = i;
        break;
      }
    }
  }
  if (end === 0) return "";
  // Compared in place, with no iterator over the names: this runs once for
  // every segment of the input.
  if (end === 2) {
    if (segment.startsWith("GS")) return "GS";
    if (segment.startsWith("GE")) return "GE";
    if (segment.startsWith("ST")) return "ST";
    if (segment.startsWith("SE")) return "SE";
  } else if (end === 3) {
    if (segment.startsWith("IEA")) return "IEA";
    if (segment.startsWith("TA1")) return "TA1";
  }
  return BODY_SEGMENT;
}

/**
 * What {@link segmentName} answers for a segment whose name is neither empty
 * nor one of the envelope's. Not a segment name the grammar admits, so it can
 * match no case of the walker's switch. @internal
 */
const BODY_SEGMENT = "(body)";

/** The names {@link segmentName} answers with themselves. @internal */
const ENVELOPE_NAMES: readonly string[] = Object.freeze(["GS", "GE", "ST", "SE", "IEA", "TA1"]);

/** {@link segmentName} of a name already split out. @internal */
/* v8 ignore next -- reached only through the `segmentName` branch `detectDelimiters` rules out */
function dispatchName(name: string): string {
  return name === "" || ENVELOPE_NAMES.includes(name) ? name : BODY_SEGMENT;
}

/**
 * The elements the walker holds for a segment it does not split itself. Never
 * read: every case that reads `elements` is one whose segment was split.
 *
 * @internal
 */
const EMPTY_ELEMENTS: readonly string[] = Object.freeze([]);

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

/** Takes anything and does nothing. @internal */
const noop = (): void => {
  /* intentionally empty */
};

/**
 * Whether {@link decodeSegmentAt} can warn on `segment`. Only two of its checks warn: the framing
 * of a BDS or BIN segment (`frameBinary`, which answers nothing for a segment that does not open
 * with `B`), and a release character left dangling at the end, which is never one when the element
 * separator is the release character. For every other segment its split is silent, so a walk may
 * leave it for the first read without losing a warning or moving one.
 *
 * @internal
 */
export function canWarn(segment: string, delimiters: Delimiters): boolean {
  return (
    segment.charCodeAt(0) === 0x42 ||
    (delimiters.element !== RELEASE_CHAR && segment.endsWith(RELEASE_CHAR))
  );
}

/**
 * The transaction set the walk closes. When `pending`, some of `segments` are `undefined`, left for
 * the first read: `segments` is then an own enumerable accessor, in the place the property always
 * had, that splits each one left (with the same silent split the walk would have made, see
 * {@link canWarn}), and on that first read or on a write turns itself into the plain, writable
 * property it always was. So `Object.keys`, spread, `JSON.stringify` and destructuring see what
 * they saw before, and the array read is the frozen array of frozen segments a whole parse makes.
 * On an object sealed or frozen before then, it stays an accessor and acts as the plain property
 * would: sealed, a write succeeds and every later read answers the value written; frozen, a write
 * throws a `TypeError`.
 *
 * @internal
 */
export function transactionOf(
  st: { readonly raw: string; readonly elements: readonly string[] },
  se: { readonly raw: string; readonly elements: readonly string[] } | undefined,
  segments: readonly (X12Segment | undefined)[],
  rawSegments: readonly string[],
  gs: GsSegment,
  delimiters: Delimiters,
  pending: boolean,
): X12TransactionSet {
  // The walk's own arrays, frozen in place: it writes no more to them once the set is closed.
  const raws = Object.freeze(rawSegments);
  if (!pending) {
    const all = segments as readonly X12Segment[];
    return { st, se, segments: Object.freeze(all), rawSegments: raws, gs };
  }
  let built: readonly X12Segment[] | undefined;
  /** Make `value` the plain property it always was; `false` where the object no longer allows it. */
  const settle = (value: readonly X12Segment[]): boolean =>
    Reflect.defineProperty(tx, "segments", {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  const tx: X12TransactionSet = {
    st,
    se,
    get segments(): readonly X12Segment[] {
      if (built === undefined) {
        built = Object.freeze(
          segments.map(
            (segment, i) =>
              segment ?? decodeSegmentAt(el(raws, i), delimiters, noop, SILENT_POSITION),
          ),
        );
        // On an object frozen or sealed before this read, the accessor stays and answers the
        // same array on every read.
        settle(built);
      }
      return built;
    },
    set segments(value: readonly X12Segment[]) {
      if (settle(value)) return;
      // A write to an object frozen first fails as it did on the plain property, which the freeze
      // made read only.
      if (Object.isFrozen(tx)) {
        throw new TypeError("Cannot assign to read only property 'segments' of object");
      }
      // A sealed object kept the plain property writable: the accessor stays, and every read
      // answers what was written.
      built = value;
    },
    rawSegments: raws,
    gs,
  };
  return tx;
}

/** The position a split that cannot warn is given: never read. @internal */
const SILENT_POSITION: X12Position = Object.freeze({ segmentIndex: 0, interchangeIndex: 0 });

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
  lazy: boolean,
): DecodedEnvelope {
  return walkEnvelope(raw, delimiters, undefined, undefined, lazy);
}

/** What {@link decodeEnvelope} and {@link decodeBuiltEnvelope} answer. @internal */
export interface DecodedEnvelope {
  readonly isa: IsaSegment;
  readonly groups: readonly X12FunctionalGroup[];
  readonly iea: IeaSegment | undefined;
  readonly ta1Segments: readonly Ta1Segment[];
  readonly orphanSegments: readonly X12OrphanSegment[];
  readonly trailingBytes: string | undefined;
  readonly warnings: readonly X12ParseWarning[];
}

/**
 * {@link decodeEnvelope} of an interchange a builder wrote, from the segments it wrote rather than
 * from its bytes: `isa` is the 106-byte ISA, `segments` every segment after it in order without
 * its terminator, and `elements[i]`, where given, the frozen elements `segments[i]` splits into.
 *
 * The caller vouches for what reading the bytes would find, and `../builder/assemble.ts` checks it
 * before it calls: the bytes are `isa` and then each segment followed by the terminator; no segment
 * holds the terminator or the release character, opens with a carriage return or a line feed, or
 * is a binary segment framed by its count. Under those the reader would frame exactly these
 * segments and split each into exactly these elements, so the walk below, which is the reader's
 * own, reports what reading the bytes reports.
 *
 * @internal
 */
export function decodeBuiltEnvelope(
  isa: string,
  delimiters: Delimiters,
  segments: readonly string[],
  elements: readonly (readonly string[] | undefined)[],
): DecodedEnvelope {
  return walkEnvelope(isa, delimiters, segments, elements, false);
}

/**
 * The walk both decodes share: the ISA, then every segment after it. `framed` is the segment list
 * when it is already known, and `split` the elements of any of them already split; without them
 * the segments are framed from `raw` and each is split here. @internal
 */
function walkEnvelope(
  raw: string,
  delimiters: Delimiters,
  framed: readonly string[] | undefined,
  split: readonly (readonly string[] | undefined)[] | undefined,
  lazy: boolean,
): DecodedEnvelope {
  const walk = startWalk(raw, delimiters, lazy, undefined);
  const segments = framed ?? splitSegments(raw, ISA_MIN_LENGTH, delimiters).segments;
  for (let i = 0; i < segments.length; i++) {
    if (walk.step(el(segments, i), split?.[i])) return walk.close(segments.slice(i + 1));
  }
  return walk.close(undefined);
}

/**
 * Where a walk that reads an interchange as it arrives sends what it finds, rather than keeping
 * it: each transaction set as its `SE` (or whatever ends it) closes it, with the indexes of its
 * group and of itself in that group, and each warning as it is raised. @internal
 */
export interface WalkStream {
  readonly onTransaction: (tx: X12TransactionSet, groupIndex: number, index: number) => void;
  readonly onWarning: (w: X12ParseWarning) => void;
}

/**
 * A list the walk only appends to and counts: an array when the walk keeps what it finds, and a
 * {@link countingList} when it hands each item on. @internal
 */
interface WalkList<T> {
  push(item: T): unknown;
  readonly length: number;
  slice(): T[];
}

/**
 * A {@link WalkList} that hands each item to `onItem` with the count before it, then counts it and
 * keeps nothing. @internal
 */
function countingList<T>(onItem: (item: T, index: number) => void): WalkList<T> {
  let count = 0;
  return {
    push(item: T): number {
      onItem(item, count);
      count += 1;
      return count;
    },
    get length(): number {
      return count;
    },
    // Stryker disable next-line ArrowFunction,ArrayDeclaration: equivalent, a walk that hands its items on discards what its close returns
    slice: (): T[] => [],
  };
}

/** One walk over an interchange: each segment after the ISA in order, then its close. @internal */
export interface EnvelopeWalk {
  /** Walk one segment, `presplit` its elements when already split; `true` once it was the `IEA`. */
  step(segmentText: string, presplit?: readonly string[]): boolean;
  /**
   * Close the walk: `rest` holds the segments after the `IEA`, or is `undefined` when the input
   * ended without one.
   */
  close(rest: readonly string[] | undefined): DecodedEnvelope;
}

/**
 * Start a walk over the interchange whose ISA opens `raw`. With `stream` the walk hands each
 * transaction set and warning on as it finds them and keeps neither, nor any closed group; with
 * `lazy` a transaction set's segments are split the first time they are read (see
 * {@link transactionOf}).
 *
 * @internal
 */
export function startWalk(
  raw: string,
  delimiters: Delimiters,
  lazy: boolean,
  stream: WalkStream | undefined,
): EnvelopeWalk {
  const warnings: WalkList<X12ParseWarning> =
    stream === undefined ? [] : countingList(stream.onWarning);
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
  // elements. Reported ahead of everything raised below it, because when it
  // fails the ISA elements after an extra separator are displaced and the two
  // checks below read `elements[12]` and `elements[13]` by index. Nothing is
  // re-framed and no other warning is suppressed: which reading of that byte is
  // right is not decided here, and `isa.raw` still carries all 106 bytes.
  if (isa.elements.length !== ISA_DECODED_PART_COUNT) {
    warnings.push(isaExtraElementSeparator({ segmentIndex: 0, interchangeIndex: 0 }));
  }

  // Pre-005010 detection - ISA-12 != "00501" (Tier-2 warning, never refused).
  const isa12 = el(isa.elements, 12);
  if (isa12 !== "00501") {
    warnings.push(pre005010({ segmentIndex: 0, interchangeIndex: 0, elementIndex: 12 }));
  }

  // Walk the segment stream. State machine: optional currentGroup,
  // optional currentTransaction. Segment index (`segIdx`) is global to
  // the post-ISA stream + 1 (segIdx=0 is ISA itself); used for warning
  // positional context.
  const groups: WalkList<X12FunctionalGroup> = stream === undefined ? [] : countingList(noop);
  const ta1Segments: Ta1Segment[] = [];
  const orphanSegments: X12OrphanSegment[] = [];
  let iea: IeaSegment | undefined;
  let trailingBytes: string | undefined;

  type OpenTx = {
    st: { raw: string; elements: readonly string[] };
    segments: (X12Segment | undefined)[];
    rawSegments: string[];
    startSegIdx: number;
    pending: boolean;
  };
  type OpenGroup = {
    gs: GsSegment;
    transactions: WalkList<X12TransactionSet>;
    startSegIdx: number;
  };

  /** The list a new group's transaction sets go to. */
  const groupTransactions = (): WalkList<X12TransactionSet> =>
    stream === undefined
      ? []
      : countingList((tx, index) => {
          stream.onTransaction(tx, groups.length, index);
        });

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
      segment: decodeSegmentAt(segmentText, delimiters, collectWarning, position, presplit),
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
    // The enclosing group's header goes on it by reference, so a typed reader
    // handed only this transaction set can fall back to GS-08 where ST-03 is
    // absent or empty. Raw, like every envelope element.
    const framed = transactionOf(
      tx.st,
      se,
      tx.segments,
      tx.rawSegments,
      group.gs,
      delimiters,
      tx.pending,
    );
    // Where its ST sat in the input, kept off the model: a warning names a
    // segment by input index and a 999 by its position from the ST.
    recordTransactionStart(framed, tx.startSegIdx);
    group.transactions.push(framed);
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

  /**
   * The position of the segment being walked inside the open transaction set,
   * built only when its decode raises a warning: `segIdx`, the group and the
   * transaction are read when it is called, which is inside the same step of
   * the walk.
   */
  let segIdx = 0;
  const inTransaction = (): X12Position => ({
    segmentIndex: segIdx,
    interchangeIndex: 0,
    groupIndex: groups.length,
    /* v8 ignore next -- only called while a group is open */
    transactionIndex: currentGroup?.transactions.length ?? 0,
  });

  /** The elements of the segment being walked when they arrived already split. */
  let presplit: readonly string[] | undefined;

  // ISA itself occupies segIdx 0; the body starts at segIdx 1.
  const step = (segmentText: string, elementsIn?: readonly string[]): boolean => {
    segIdx += 1;
    presplit = elementsIn;
    const name = segmentName(segmentText, delimiters);
    // Only the envelope's own segments are split here; a body segment is split
    // once, by its decode, and the ST and SE reuse the elements theirs makes.
    const elements =
      name === "TA1" || name === "GS" || name === "GE" || name === "IEA"
        ? (presplit ?? splitElements(segmentText, delimiters))
        : EMPTY_ELEMENTS;

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
          transactions: groupTransactions(),
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
        const stDecoded = decodeSegmentAt(
          segmentText,
          delimiters,
          collectWarning,
          inTransaction,
          presplit,
        );
        currentTx = {
          // An ST is never a binary segment, so its decode splits it exactly
          // as `splitElements` does and the two arrays are interchangeable.
          st: { raw: segmentText, elements: stDecoded.elements },
          segments: [stDecoded],
          rawSegments: [segmentText],
          startSegIdx: segIdx,
          pending: false,
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
        const seDecoded = decodeSegmentAt(
          segmentText,
          delimiters,
          collectWarning,
          inTransaction,
          presplit,
        );
        currentTx.segments.push(seDecoded);
        currentTx.rawSegments.push(segmentText);
        // Not a binary segment either: see the ST above.
        const se = { raw: segmentText, elements: seDecoded.elements };
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
        // Stop walking once IEA is consumed (multi-ISA support is out
        // of v1 scope per roadmap §2 non-goals).
        return true;
      }
      default: {
        // Body segment of an open transaction → decode and append.
        if (currentTx !== undefined && currentGroup !== undefined) {
          // Split now only a segment whose split can warn (see `canWarn`); a lazy walk leaves
          // every other one for its first read.
          if (lazy && !canWarn(segmentText, delimiters)) {
            currentTx.segments.push(undefined);
            currentTx.pending = true;
          } else {
            currentTx.segments.push(
              decodeSegmentAt(segmentText, delimiters, collectWarning, inTransaction, presplit),
            );
          }
          currentTx.rawSegments.push(segmentText);
        } else if (segmentText.length > 0) {
          // Outside any transaction, a body segment is structurally
          // unexpected. The guard skips only the zero-length segment a
          // doubled terminator delimits, which carries nothing to keep. A
          // segment whose first element is empty (`*A*B`) has no name to
          // dispatch on but does carry values, so it is warned and kept here
          // like any other: skipping it on its empty name lost those values
          // with no diagnostic at all.
          recordOrphan(
            segmentText,
            { segmentIndex: segIdx, interchangeIndex: 0 },
            UNEXPECTED_SEGMENT_CONTEXTS.BODY_OUTSIDE_TRANSACTION,
          );
        }
        break;
      }
    }
    return false;
  };

  const close = (rest: readonly string[] | undefined): DecodedEnvelope => {
    if (rest === undefined) {
      // EOF without IEA → close anything open and warn. Nothing is walked
      // after, so resetting `currentTx`/`currentGroup` is moot.
      if (currentGroup !== undefined) {
        if (currentTx !== undefined) {
          finalizeTx(currentTx, currentGroup, undefined);
        }
        finalizeGroup(currentGroup, undefined);
      }
      warnings.push(missingIea({ segmentIndex: segIdx + 1, interchangeIndex: 0 }));
    } else {
      // Trailing-bytes detection - anything past IEA is multi-ISA or
      // garbage (multi-ISA support is out of v1 scope per roadmap §2).
      // Best-effort preservation: join the leftover segment slices
      // with the segment terminator and append a final terminator.
      // Not byte-exact for trailing content; consumers needing the
      // raw second-interchange bytes should re-tokenize.
      const tail = rest.join(delimiters.segment);
      if (tail.length > 0) {
        // The last trailing segment takes a terminator only where one would end it: after a
        // dangling release character it would be read as data, and every later parse of the
        // emit would add another.
        const joined = endsAtTerminator(el(rest, rest.length - 1), delimiters)
          ? tail + delimiters.segment
          : tail;
        trailingBytes = joined;
        warnings.push(trailingGarbage({ segmentIndex: segIdx + 1, interchangeIndex: 0 }));
      }
    }
    return {
      isa,
      groups: Object.freeze(groups.slice()),
      iea,
      ta1Segments: Object.freeze(ta1Segments.slice()),
      orphanSegments: Object.freeze(orphanSegments.slice()),
      trailingBytes,
      warnings: Object.freeze(warnings.slice()),
    };
  };

  return { step, close };
}

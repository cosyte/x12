/**
 * Segment-level decode for the `@cosyte/x12` parser pipeline. Phase 2's
 * syntactic core: take a raw segment string (terminator already stripped by
 * the envelope walker) and decode it into an immutable {@link X12Segment}
 * carrying its segment id, raw text, and an element array. Element values
 * are stored RAW (pre-`?`-unescape) so a byte-exact round-trip survives
 * regardless of which subset is read; the {@link getSegmentValue} dot-path
 * resolver applies {@link unescapeRelease} on read.
 *
 * Dot-path conventions (locked here, mirror the X12 TR3 convention):
 *
 * - `"03"` → element 3 of the segment (1-indexed; matches `NM1-03`,
 *   `CLP-04`, etc. in every TR3). Returns the FIRST repetition's verbatim
 *   element text post-`?`-unescape.
 * - `"03-1"` → component 1 of element 3 (1-indexed). Returns the
 *   sub-element text post-`?`-unescape.
 * - `"03[2]"` → 3rd repetition (0-indexed) of element 3. Repetitions are
 *   0-indexed to match `@cosyte/hl7`'s bracket convention and array-index
 *   ergonomics.
 * - `"03[2]-1"` → component 1 of repetition 2 of element 3.
 *
 * The parser deliberately does NOT support cross-segment paths at this
 * phase — `Segment.get` operates inside a single segment. Cross-loop
 * traversal arrives with `defineLoopSpec` in Phase 3+ (which authors the
 * built-in transaction loops through the same public API as consumers —
 * the dogfooding gate).
 */

import { RELEASE_CHAR, splitWithRelease, unescapeRelease } from "./release.js";
import type { Delimiters, X12Position } from "./types.js";
import { danglingReleaseChar, type X12ParseWarning } from "./warnings.js";

/**
 * Immutable decoded X12 segment. `elements` is 1-indexed: `elements[0]` is
 * the segment id placeholder (matching {@link "./types.js".IsaSegment},
 * `GsSegment`, etc. — every typed segment in the envelope follows the same
 * 1-indexed shape so consumers learn one rule and never have to recall
 * whether a particular accessor offsets by one). `raw` preserves the exact
 * segment text from input (terminator stripped) so a byte-exact round-trip
 * survives even when downstream stages mutate the model.
 *
 * Element values are stored RAW (pre-`?`-unescape). Reads via {@link
 * getSegmentValue} apply {@link unescapeRelease} on demand — this keeps
 * round-trip byte-exact while still letting helpers receive
 * spec-compliant logical values.
 *
 * @example
 * ```ts
 * import type { X12Segment } from "@cosyte/x12";
 * declare const seg: X12Segment;
 * seg.id;              // "NM1"
 * seg.elements[3];     // raw text of NM1-03 (post-element-split, pre-?-unescape)
 * ```
 */
export interface X12Segment {
  readonly id: string;
  readonly raw: string;
  readonly elements: readonly string[];
}

/**
 * Decode a raw segment string into an {@link X12Segment}. Splits on the
 * detected element separator (honouring the `?`-release-character escape),
 * preserves the verbatim raw text, and surfaces dangling-release warnings
 * via the supplied emitter with positional context tied to the segment.
 *
 * Never throws — malformed input produces a best-effort segment and any
 * issues surface as Tier-2 warnings via `emit`. An empty input string
 * decodes to an empty segment (`id: ""`, `elements: [""]`); callers that
 * care can guard.
 *
 * @example
 * ```ts
 * import { decodeSegment } from "@cosyte/x12";
 * const d = { element: "*", repetition: "^", component: ":", segment: "~" };
 * const seg = decodeSegment("NM1*IL*1*DOE*JANE", d, () => {}, { segmentIndex: 5 });
 * seg.id;          // "NM1"
 * seg.elements[3]; // "DOE"
 * ```
 */
export function decodeSegment(
  raw: string,
  delimiters: Delimiters,
  emit: (w: X12ParseWarning) => void,
  position: X12Position,
): X12Segment {
  const elements = Object.freeze(splitWithRelease(raw, delimiters.element));
  // Dangling-release detection — a bare `?` at the very end of the
  // segment cannot escape anything. Detection counts consecutive `?` at
  // the segment's tail: an odd run means the trailing `?` is unpaired
  // (dangling); an even run means it is the second half of a `??` escape
  // (well-formed). Single segment-level check is cheaper than per-element
  // re-scan and pin-points the warning to the final element index.
  if (raw.length > 0 && raw.endsWith(RELEASE_CHAR)) {
    let trailingRun = 0;
    for (let j = raw.length - 1; j >= 0 && raw.charAt(j) === RELEASE_CHAR; j -= 1) trailingRun += 1;
    if (trailingRun % 2 === 1) {
      emit(danglingReleaseChar({ ...position, elementIndex: elements.length - 1 }));
    }
  }
  const id = elements[0] ?? "";
  return Object.freeze({ id, raw, elements });
}

/**
 * Parsed dot-path descriptor for an in-segment X12 path. Numeric indices
 * follow the X12 TR3 convention (element 1-indexed, component 1-indexed);
 * the optional `repetitionIndex` is 0-indexed (mirrors hl7 + array
 * ergonomics).
 *
 * @internal
 */
interface SegmentPath {
  readonly elementIndex: number;
  readonly repetitionIndex?: number;
  readonly componentIndex?: number;
}

/**
 * Parse an in-segment dot-path string (e.g. `"03"`, `"03-1"`, `"03[2]"`,
 * `"03[2]-1"`) into a {@link SegmentPath}. Throws `TypeError` on malformed
 * paths so a bug in the caller's path string surfaces loudly at the call
 * site, while a missing field at a well-formed path returns `undefined`
 * from the resolver below.
 *
 * @internal
 */
function parseSegmentPath(path: string): SegmentPath {
  if (path.length === 0) {
    throw new TypeError(`Invalid X12 segment path: "" (empty).`);
  }
  let i = 0;
  // Element index (1+ digits).
  const elemStart = i;
  while (i < path.length) {
    const ch = path.charCodeAt(i);
    if (ch < 0x30 || ch > 0x39) break;
    i += 1;
  }
  if (i === elemStart) {
    throw new TypeError(
      `Invalid X12 segment path: "${path}" (expected leading element index digit).`,
    );
  }
  const elementIndex = parseInt(path.slice(elemStart, i), 10);
  let repetitionIndex: number | undefined;
  let componentIndex: number | undefined;
  // Optional [N] repetition.
  if (i < path.length && path.charAt(i) === "[") {
    const close = path.indexOf("]", i + 1);
    if (close === -1) {
      throw new TypeError(
        `Invalid X12 segment path: "${path}" (unclosed '[' at position ${String(i)}).`,
      );
    }
    const inner = path.slice(i + 1, close);
    if (inner.length === 0 || !/^\d+$/u.test(inner)) {
      throw new TypeError(
        `Invalid X12 segment path: "${path}" (bracket content "${inner}" is not a non-negative integer).`,
      );
    }
    repetitionIndex = parseInt(inner, 10);
    i = close + 1;
  }
  // Optional -N component.
  if (i < path.length) {
    if (path.charAt(i) !== "-") {
      throw new TypeError(
        `Invalid X12 segment path: "${path}" (expected '-' or end at position ${String(i)}).`,
      );
    }
    i += 1;
    const compStart = i;
    while (i < path.length) {
      const ch = path.charCodeAt(i);
      if (ch < 0x30 || ch > 0x39) break;
      i += 1;
    }
    if (i === compStart) {
      throw new TypeError(
        `Invalid X12 segment path: "${path}" (expected component index digit after '-').`,
      );
    }
    componentIndex = parseInt(path.slice(compStart, i), 10);
  }
  if (i !== path.length) {
    throw new TypeError(
      `Invalid X12 segment path: "${path}" (trailing content at position ${String(i)}).`,
    );
  }
  const out: { elementIndex: number; repetitionIndex?: number; componentIndex?: number } = {
    elementIndex,
  };
  if (repetitionIndex !== undefined) out.repetitionIndex = repetitionIndex;
  if (componentIndex !== undefined) out.componentIndex = componentIndex;
  return out;
}

/**
 * Resolve a dot-path against a decoded {@link X12Segment} and return the
 * decoded leaf value (post-`?`-unescape) or `undefined` if the path does
 * not resolve (missing element, out-of-range repetition, out-of-range
 * component). Throws `TypeError` only when `path` itself is malformed.
 *
 * Optional `emit` collects any dangling-release warnings discovered on the
 * read path; pass a no-op to silently decode.
 *
 * @example
 * ```ts
 * import { decodeSegment, getSegmentValue } from "@cosyte/x12";
 * const d = { element: "*", repetition: "^", component: ":", segment: "~" };
 * const seg = decodeSegment(
 *   "HI*ABK:J45.50*ABF:I10",
 *   d,
 *   () => {},
 *   { segmentIndex: 0 },
 * );
 * getSegmentValue(seg, "01-1", d);    // "ABK"
 * getSegmentValue(seg, "01-2", d);    // "J45.50"
 * getSegmentValue(seg, "02-1", d);    // "ABF"
 * ```
 */
export function getSegmentValue(
  segment: X12Segment,
  path: string,
  delimiters: Delimiters,
  emit: (w: X12ParseWarning) => void = noop,
): string | undefined {
  const parsed = parseSegmentPath(path);
  const rawElement = segment.elements[parsed.elementIndex];
  if (rawElement === undefined) return undefined;
  const repetitions =
    delimiters.repetition.length === 1
      ? splitWithRelease(rawElement, delimiters.repetition)
      : [rawElement];
  const repIndex = parsed.repetitionIndex ?? 0;
  const repetition = repetitions[repIndex];
  if (repetition === undefined) return undefined;
  if (parsed.componentIndex === undefined) {
    return unescapeRelease(
      repetition,
      delimiters,
      emit,
      segment.elements[0] === "ISA"
        ? { segmentIndex: 0 }
        : { segmentIndex: 0, elementIndex: parsed.elementIndex },
    );
  }
  const components = splitWithRelease(repetition, delimiters.component);
  const comp = components[parsed.componentIndex - 1];
  if (comp === undefined) return undefined;
  return unescapeRelease(comp, delimiters, emit, {
    segmentIndex: 0,
    elementIndex: parsed.elementIndex,
    componentIndex: parsed.componentIndex,
  });
}

/**
 * Return every repetition / component matching the dot-path. For a path
 * with no `[N]` and no `-N` (e.g. `"03"`), returns every repetition's
 * decoded element text. For a path with `-N` and no `[N]`, returns each
 * repetition's Nth component. With both `[N]` and `-N` specified, returns
 * a single-element array (or empty if the path doesn't resolve). Every
 * returned string is post-`?`-unescape.
 *
 * @example
 * ```ts
 * import { decodeSegment, getAllSegmentValues } from "@cosyte/x12";
 * const d = { element: "*", repetition: "^", component: ":", segment: "~" };
 * const seg = decodeSegment(
 *   "HI*ABK:J45.50^ABF:I10",
 *   d,
 *   () => {},
 *   { segmentIndex: 0 },
 * );
 * getAllSegmentValues(seg, "01", d);   // ["ABK:J45.50", "ABF:I10"]
 * getAllSegmentValues(seg, "01-1", d); // ["ABK", "ABF"]
 * ```
 */
export function getAllSegmentValues(
  segment: X12Segment,
  path: string,
  delimiters: Delimiters,
  emit: (w: X12ParseWarning) => void = noop,
): readonly string[] {
  const parsed = parseSegmentPath(path);
  const rawElement = segment.elements[parsed.elementIndex];
  if (rawElement === undefined) return Object.freeze([]);
  const repetitions =
    delimiters.repetition.length === 1
      ? splitWithRelease(rawElement, delimiters.repetition)
      : [rawElement];
  const reps =
    parsed.repetitionIndex !== undefined
      ? repetitions[parsed.repetitionIndex] === undefined
        ? []
        : [repetitions[parsed.repetitionIndex] ?? ""]
      : repetitions;
  const out: string[] = [];
  for (const rep of reps) {
    if (parsed.componentIndex === undefined) {
      out.push(
        unescapeRelease(rep, delimiters, emit, {
          segmentIndex: 0,
          elementIndex: parsed.elementIndex,
        }),
      );
      continue;
    }
    const components = splitWithRelease(rep, delimiters.component);
    const comp = components[parsed.componentIndex - 1];
    if (comp !== undefined) {
      out.push(
        unescapeRelease(comp, delimiters, emit, {
          segmentIndex: 0,
          elementIndex: parsed.elementIndex,
          componentIndex: parsed.componentIndex,
        }),
      );
    }
  }
  return Object.freeze(out);
}

/** @internal */
const noop = (_w: X12ParseWarning): void => {
  /* intentionally empty */
};

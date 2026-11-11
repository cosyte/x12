/**
 * How a builder turns the segments it wrote into the {@link X12Interchange} it returns, without
 * reading its own bytes back.
 *
 * A builder used to join its segments into one text and return `parseX12` of it, so the result
 * was the parsed form every other helper consumes and the parse reported what the built bytes
 * mean (an `SE` a caller put inside a body, a binary count that runs past its data, an older
 * version). Most of that parse was framing the text into segments and splitting each into
 * elements, which the builder had just done the other way round.
 *
 * {@link builtInterchange} keeps the report and drops the re-reading. The builder records each
 * segment it writes in a {@link SegmentLog}, with the parts it joined; this module checks, segment
 * by segment, the conditions under which reading the bytes would frame exactly those segments and
 * split each into exactly those parts, and then runs the reader's own envelope walk over them, so
 * every warning, count check and control number check is the reader's. Where any condition fails
 * (a release character anywhere, a binary segment, a segment a line break opens, an ISA that does
 * not read), the builder's bytes are parsed as before.
 *
 * @internal
 */

import { frameBinary } from "../parser/binary.js";
import { ISA_MIN_LENGTH, detectDelimiters } from "../parser/delimiters.js";
import { decodeBuiltEnvelope } from "../parser/envelope.js";
import { defaultInterchangeOf, parseX12 } from "../parser/index.js";
import { RELEASE_CHAR } from "../parser/release.js";
import type { Delimiters, X12Interchange } from "../parser/types.js";

/**
 * The segments a builder wrote, in the order it wrote them: each segment's text as the builder
 * returned it (terminator included), the text before the terminator, and the parts joined into it.
 *
 * @internal
 */
export class SegmentLog {
  /** Each segment as the builder returned it, terminator included. */
  public readonly texts: string[] = [];
  /** Each segment without its terminator. */
  public readonly joined: string[] = [];
  /** The parts each segment was joined from. Owned by the log: never changed after it is recorded. */
  public readonly parts: (readonly string[])[] = [];

  /** Record a segment the builder joined from `parts`, and answer its text. */
  public record(parts: readonly string[], joined: string, terminator: string): string {
    const text = joined + terminator;
    this.texts.push(text);
    this.joined.push(joined);
    this.parts.push(parts);
    return text;
  }
}

/** The UTF-16 code units of a carriage return and a line feed. @internal */
const CR = 0x0d;
const LF = 0x0a;

/**
 * The interchange `isa` followed by `emitted` reads as, which is `parseX12(isa + emitted.join(""))`
 * with no options, made from the segments `log` recorded where they can be trusted. Each entry of
 * `emitted` is one or more whole segments, each with its terminator; an empty entry adds nothing.
 *
 * @internal
 */
export function builtInterchange(
  isa: string,
  emitted: readonly string[],
  log: SegmentLog,
): X12Interchange {
  const reread = (): X12Interchange => parseX12(isa + emitted.join(""));
  if (isa.length !== ISA_MIN_LENGTH) return reread();
  let delimiters: Delimiters;
  try {
    delimiters = detectDelimiters(isa);
  } catch {
    // The parse throws the same error, with the same bytes in it.
    return reread();
  }
  const terminator = delimiters.segment;
  const separator = delimiters.element;
  const segments: string[] = [];
  const elements: (readonly string[] | undefined)[] = [];
  let next = 0;
  for (const text of emitted) {
    if (text.length === 0) continue;
    if (next < log.texts.length && text === log.texts[next]) {
      // A segment the builder recorded: its text without the terminator is already at hand.
      const joined = log.joined[next] as string;
      const parts = log.parts[next] as readonly string[];
      next += 1;
      if (!framesAlone(joined, delimiters)) return reread();
      segments.push(joined);
      elements.push(
        Object.freeze(partsAreElements(parts, separator) ? parts : joined.split(separator)),
      );
      continue;
    }
    // Text the log does not hold in this place: frame it here, by the same conditions.
    if (!text.endsWith(terminator)) return reread();
    const pieces = text.split(terminator);
    pieces.pop();
    for (const piece of pieces) {
      if (!framesAlone(piece, delimiters)) return reread();
      segments.push(piece);
      elements.push(Object.freeze(piece.split(separator)));
    }
  }
  const decoded = decodeBuiltEnvelope(isa, delimiters, segments, elements);
  return defaultInterchangeOf(decoded, delimiters);
}

/**
 * Whether `segment`, followed by the terminator, is read back as exactly `segment` split on the
 * element separator alone: it holds neither the terminator nor the release character, the reader
 * strips no line break from its start, and it is not a binary segment framed by its count.
 *
 * @internal
 */
function framesAlone(segment: string, delimiters: Delimiters): boolean {
  if (segment.includes(delimiters.segment) || segment.includes(RELEASE_CHAR)) return false;
  const first = segment.charCodeAt(0);
  if (first === CR || first === LF) return false;
  return frameBinary(segment, 0, delimiters) === undefined;
}

/** Whether `parts` joined on `separator` splits back into `parts`: no part holds it. @internal */
function partsAreElements(parts: readonly string[], separator: string): boolean {
  if (parts.length === 0) return false;
  for (const part of parts) {
    if (typeof part !== "string" || part.includes(separator)) return false;
  }
  return true;
}

import { Buffer } from "node:buffer";

import fc from "fast-check";
import type { Arbitrary } from "fast-check";

import {
  cleanInterchangeText,
  interchangeParts,
  writeBody,
  type BodySegment,
  type InterchangeOptions,
  type InterchangeParts,
  writeClean,
} from "./interchange.js";
import { value } from "./text.js";

/**
 * One way a sender's envelope departs from a spec-clean one while the parser still reads it.
 *
 * @internal
 */
export type EnvelopeQuirk =
  | "pre5010"
  | "seCount"
  | "geCount"
  | "ieaCount"
  | "seControl"
  | "geControl"
  | "ieaControl"
  | "dropSe"
  | "dropGe"
  | "dropIea"
  | "ta1InGroup"
  | "orphanBody"
  | "strayTrailers"
  | "emptySegment"
  | "noIdSegment"
  | "trailingGarbage"
  | "noFinalTerminator"
  | "endsOnRelease"
  | "endsInBinary";

/** Every {@link EnvelopeQuirk}. @internal */
export const ENVELOPE_QUIRKS: readonly EnvelopeQuirk[] = Object.freeze([
  "pre5010",
  "seCount",
  "geCount",
  "ieaCount",
  "seControl",
  "geControl",
  "ieaControl",
  "dropSe",
  "dropGe",
  "dropIea",
  "ta1InGroup",
  "orphanBody",
  "strayTrailers",
  "emptySegment",
  "noIdSegment",
  "trailingGarbage",
  "noFinalTerminator",
  "endsOnRelease",
  "endsInBinary",
]);

/**
 * One way a sender's body segment departs from a spec-clean one while the parser still reads
 * it.
 *
 * @internal
 */
export type SegmentQuirk =
  | "trailingElements"
  | "trailingComponent"
  | "lowercase"
  | "padded"
  | "releaseNonDelimiter"
  | "outsideCharacter"
  | "releaseBeforeTerminator"
  | "emptySegment"
  | "binarySegment";

/** Every {@link SegmentQuirk}. @internal */
export const SEGMENT_QUIRKS: readonly SegmentQuirk[] = Object.freeze([
  "trailingElements",
  "trailingComponent",
  "lowercase",
  "padded",
  "releaseNonDelimiter",
  "outsideCharacter",
  "releaseBeforeTerminator",
  "emptySegment",
  "binarySegment",
]);

/**
 * How a generated interchange is made messy: the line break written after each segment, the
 * envelope quirks, and quirks on body segments, each at a body segment index taken modulo the
 * number of body segments.
 *
 * @internal
 */
export interface Mess {
  readonly lineBreak: string;
  readonly envelope: readonly EnvelopeQuirk[];
  readonly segments: readonly { readonly at: number; readonly quirk: SegmentQuirk }[];
  /** Data for a quirk that needs some: a binary segment's octets, an orphan's value. */
  readonly data: string;
}

/** The line breaks a sender may write between segments, none among them. */
const LINE_BREAKS = ["", "\n", "\r\n", "\r", "\r\n\r\n"] as const;

/** Characters outside the X12 basic and extended character sets. */
const OUTSIDE = ["é", "§", "Ω", "中", "\u{1f600}"] as const;

/**
 * Apply one quirk to a body segment's wire elements (the id first), giving the segments it
 * becomes: usually one, two when it adds a segment after itself.
 *
 * @internal
 */
export function applySegmentQuirk(
  seg: BodySegment,
  quirk: SegmentQuirk,
  parts: InterchangeParts,
  data: string,
): (readonly string[])[] {
  const { d } = parts;
  const wire = writeBody(seg, d);
  const last = wire.length - 1;
  const withLast = (suffix: string): string[] =>
    wire.map((el, i) => (i === last ? el + suffix : el));
  switch (quirk) {
    case "trailingElements":
      return [[...wire, "", ""]];
    case "trailingComponent":
      return [withLast(d.component)];
    case "lowercase":
      return [wire.map((el, i) => (i === 0 ? el.toLowerCase() : el))];
    case "padded":
      return [wire.map((el, i) => (i === last ? `  ${el}  ` : el))];
    case "releaseNonDelimiter":
      return [withLast("?Q")];
    case "outsideCharacter":
      return [withLast(OUTSIDE[data.length % OUTSIDE.length] as string)];
    case "releaseBeforeTerminator":
      // The `?` releases the terminator that follows, so this segment runs on into the next.
      return [withLast("?")];
    case "emptySegment":
      return [wire, [""]];
    case "binarySegment":
      // A BIN segment frames its data by the octet count it declares, delimiters and all.
      return [wire, ["BIN", String(data.length), data]];
  }
}

/**
 * Write an interchange's parts with the given mess.
 *
 * @internal
 */
export function writeMessy(parts: InterchangeParts, mess: Mess): string {
  const { d } = parts;
  const has = (q: EnvelopeQuirk): boolean => mess.envelope.includes(q);
  const bodyCount = parts.groups.reduce(
    (n, g) => n + g.transactions.reduce((m, t) => m + t.body.length, 0),
    0,
  );
  const quirksAt = new Map<number, SegmentQuirk>();
  if (bodyCount > 0) for (const q of mess.segments) quirksAt.set(q.at % bodyCount, q.quirk);
  const orphan = ["NTE", "ADD", `X${mess.data.replace(/[^A-Z0-9]/gu, "")}`];

  const isa = has("pre5010") ? parts.isa.map((el, i) => (i === 12 ? "00401" : el)) : parts.isa;
  const out: (readonly string[])[] = [isa, ...parts.ta1];
  let bodyIndex = 0;
  parts.groups.forEach((g, gi) => {
    out.push(g.gs);
    if (gi === 0 && has("ta1InGroup")) out.push(["TA1", "000000001", "260101", "1200", "A", "000"]);
    g.transactions.forEach((t, ti) => {
      out.push(t.st);
      for (const seg of t.body) {
        const quirk = quirksAt.get(bodyIndex);
        bodyIndex += 1;
        out.push(
          ...(quirk === undefined
            ? [writeBody(seg, d)]
            : applySegmentQuirk(seg, quirk, parts, mess.data)),
        );
      }
      const first = gi === 0 && ti === 0;
      if (!(first && has("dropSe"))) {
        const count = first && has("seCount") ? String(Number(t.se[1]) + 1) : (t.se[1] as string);
        const control = first && has("seControl") ? `${t.se[2] as string}9` : (t.se[2] as string);
        out.push(["SE", count, control]);
      }
    });
    const lastGroup = gi === parts.groups.length - 1;
    if (!(lastGroup && has("dropGe"))) {
      const count =
        gi === 0 && has("geCount") ? String(g.transactions.length + 1) : (g.ge[1] as string);
      const control = gi === 0 && has("geControl") ? `${g.ge[2] as string}9` : (g.ge[2] as string);
      out.push(["GE", count, control]);
    }
    if (gi === 0 && has("orphanBody")) out.push(orphan);
  });
  if (has("strayTrailers")) out.push(["GE", "1", "7"], ["SE", "2", "0007"], ["ST", "837", "0008"]);
  if (has("emptySegment")) out.push([""]);
  if (has("noIdSegment")) out.push(["", "A", "B"]);
  if (!has("dropIea")) {
    const count = has("ieaCount") ? String(parts.groups.length + 1) : (parts.iea[1] as string);
    const control = has("ieaControl") ? "999999999" : (parts.iea[2] as string);
    out.push(["IEA", count, control]);
  }
  if (has("trailingGarbage")) out.push(orphan);
  // The input stops on a segment no terminator could end: a binary segment whose declared count
  // runs past the end, or a dangling release character.
  if (has("endsInBinary")) out.push(["BIN", String(mess.data.length + 5), mess.data]);
  if (has("endsOnRelease")) {
    const end = out.length - 1;
    const seg = out[end] as readonly string[];
    out[end] = seg.map((el, i) => (i === seg.length - 1 ? `${el}?` : el));
  }

  const text = out.map((elements) => elements.join(d.element) + d.segment + mess.lineBreak);
  if (has("noFinalTerminator") || has("endsOnRelease") || has("endsInBinary")) {
    const end = text.length - 1;
    text[end] = (text[end] as string).slice(0, -(d.segment.length + mess.lineBreak.length));
  }
  return text.join("");
}

/**
 * Generate raw interchange text the parser accepts, messy on purpose: line breaks of any kind
 * between segments, an ISA declaring a version before 005010, counts and control numbers that
 * disagree, a missing SE, GE or IEA, a TA1 inside a group, segments outside any transaction set,
 * a doubled terminator, a segment with no id, bytes after the IEA, no final terminator (and an
 * end on a dangling release character or inside a binary segment's declared span), and body
 * segments with trailing empty elements or components, a lower-case id, padding, a release
 * character before a character that is no delimiter or before the terminator itself, characters
 * outside the X12 character sets, and a binary segment framed by its octet count. The ISA is
 * always whole, so the parser reads every one of these, warning about what it must, and never
 * refuses one.
 *
 * @param options The delimiters and the size.
 * @returns An arbitrary of the interchange text.
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { parseX12 } from "@cosyte/x12";
 * import { interchangeText } from "@cosyte/x12/arbitraries";
 *
 * fc.assert(
 *   fc.property(interchangeText(), (raw) => {
 *     parseX12(raw); // never throws for this text
 *   }),
 * );
 * ```
 */
export function interchangeText(options: InterchangeOptions = {}): Arbitrary<string> {
  const mess: Arbitrary<Mess> = fc.record({
    lineBreak: fc.constantFrom(...LINE_BREAKS),
    envelope: fc.subarray([...ENVELOPE_QUIRKS], { maxLength: 4 }),
    segments: fc.array(fc.record({ at: fc.nat(), quirk: fc.constantFrom(...SEGMENT_QUIRKS) }), {
      maxLength: 3,
    }),
    data: value({ minLength: 0, maxLength: 10 }),
  });
  return fc.tuple(interchangeParts(options), mess).map(([parts, m]) => writeMessy(parts, m));
}

/** Options for {@link hostileInput}. */
export interface HostileInputOptions {
  /** The longest random string or byte run. Defaults to 200. */
  readonly maxLength?: number;
}

/**
 * One edit to an interchange's text: cut it short, delete a run, or insert random text.
 *
 * @internal
 */
export type Edit =
  | { readonly kind: "cut"; readonly at: number }
  | { readonly kind: "delete"; readonly at: number; readonly length: number }
  | { readonly kind: "insert"; readonly at: number; readonly text: string };

/**
 * Apply edits to text, each position taken modulo the text's length at that point.
 *
 * @internal
 */
export function applyEdits(text: string, edits: readonly Edit[]): string {
  let out = text;
  for (const edit of edits) {
    const at = edit.at % (out.length + 1);
    if (edit.kind === "cut") out = out.slice(0, at);
    else if (edit.kind === "delete") out = out.slice(0, at) + out.slice(at + edit.length);
    else out = out.slice(0, at) + edit.text + out.slice(at);
  }
  return out;
}

/** The length of an ISA segment with its terminator. */
const ISA_LENGTH = 106;

/**
 * Generate hostile input for a lenient parser: random strings, random bytes, text that opens
 * like an ISA and then falls apart, a whole ISA followed by random text, interchanges cut short
 * or with text inserted and deleted anywhere, ISA included, binary segments whose octet count
 * is wrong, negative or huge, and interchanges as bytes in UTF-8 or Latin-1. The parser must
 * turn each into an interchange with warnings, or refuse it with one of its four documented
 * fatal errors, and never throw anything else.
 *
 * @param options The longest random run.
 * @returns An arbitrary of a string or a `Buffer`.
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { X12ParseError, parseX12 } from "@cosyte/x12";
 * import { hostileInput } from "@cosyte/x12/arbitraries";
 *
 * fc.assert(
 *   fc.property(hostileInput(), (raw) => {
 *     try {
 *       parseX12(raw);
 *     } catch (err) {
 *       return err instanceof X12ParseError;
 *     }
 *     return true;
 *   }),
 * );
 * ```
 */
export function hostileInput(options: HostileInputOptions = {}): Arbitrary<string | Buffer> {
  const maxLength = options.maxLength ?? 200;
  const randomText = fc.string({ unit: "binary", maxLength });
  const edit: Arbitrary<Edit> = fc.oneof(
    fc.nat().map((at) => ({ kind: "cut" as const, at })),
    fc.tuple(fc.nat(), fc.integer({ min: 1, max: 20 })).map(([at, length]) => ({
      kind: "delete" as const,
      at,
      length,
    })),
    fc
      .tuple(fc.nat(), fc.string({ unit: "binary", minLength: 1, maxLength: 8 }))
      .map(([at, text]) => ({ kind: "insert" as const, at, text })),
  );
  const binaryCount = fc.oneof(
    fc.nat(40).map(String),
    fc.constantFrom("-1", "99999999999999999999", "1e3", "", " 4"),
  );
  return fc.oneof(
    randomText,
    fc.uint8Array({ maxLength }).map((bytes) => Buffer.from(bytes)),
    fc
      .tuple(fc.constantFrom("ISA", "ISA*", "ISA*00*", "isa*"), randomText)
      .map(([head, tail]) => head + tail),
    fc
      .tuple(cleanInterchangeText(), randomText)
      .map(([text, tail]) => text.slice(0, ISA_LENGTH) + tail),
    fc
      .tuple(interchangeText(), fc.array(edit, { minLength: 1, maxLength: 4 }))
      .map(([text, edits]) => applyEdits(text, edits)),
    fc
      .tuple(interchangeParts(), binaryCount, randomText, fc.nat())
      .map(([parts, count, data, at]) => {
        const text = writeClean(parts);
        const { d } = parts;
        const bin = ["BIN", count, data].join(d.element) + d.segment;
        const cut = ISA_LENGTH + (at % (text.length - ISA_LENGTH + 1));
        return text.slice(0, cut) + bin + text.slice(cut);
      }),
    fc
      .tuple(interchangeText(), fc.constantFrom("utf8" as const, "latin1" as const))
      .map(([text, encoding]) => Buffer.from(text, encoding)),
  );
}

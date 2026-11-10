import type { Delimiters, SegmentSpec } from "@cosyte/x12";
import fc from "fast-check";
import type { Arbitrary } from "fast-check";

/**
 * The delimiters 005010 healthcare traffic conventionally uses: `*` between elements, `^`
 * between repetitions, `:` between components and `~` after each segment.
 */
export const STANDARD_DELIMITERS: Delimiters = Object.freeze({
  element: "*",
  repetition: "^",
  component: ":",
  segment: "~",
});

/**
 * The characters a generated delimiter is drawn from: every visible ASCII punctuation character
 * but the release character `?`, which no delimiter may be. None of them appears in the fixed
 * ISA values the generators write, so any four of them frame an interchange.
 *
 * @internal
 */
export const DELIMITER_POOL: readonly string[] = Object.freeze([
  ..."!\"#$%&'()*+,-./:;<=>@[\\]^_`{|}~",
]);

/** The release character, written before a delimiter or itself inside a value. */
const RELEASE = "?";

/** Upper-case letters and digits: the X12 basic character set's alphanumerics. */
const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * The rest of what a generated value is drawn from: lower-case letters, the space, the special
 * characters of the X12 basic and extended character sets, and `~` and `^`, so that the standard
 * segment terminator and repetition separator turn up inside values too.
 *
 * @internal
 */
export const VALUE_SPECIALS = "abcdefghijklmnopqrstuvwxyz !\"&'()*+,-./:;?=%@[]_{}\\|<>#$~^";

/** Options for {@link delimiters}. */
export interface DelimitersOptions {
  /**
   * `"standard"` gives only `*`, `^`, `:` and `~`; `"any"` gives any four distinct characters of
   * visible ASCII punctuation but `?`. Defaults to both, the standard set one time in four.
   */
  readonly delimiters?: "standard" | "any";
}

/**
 * Generate a delimiter set: the standard one, or any four distinct characters of visible ASCII
 * punctuation but the release character `?`. Every set frames an interchange the parser reads.
 *
 * @param options Which sets to draw.
 * @returns An arbitrary of a {@link Delimiters}.
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { delimiters } from "@cosyte/x12/arbitraries";
 *
 * const [d] = fc.sample(delimiters({ delimiters: "any" }), 1);
 * // d is like { element: "|", repetition: "&", component: "{", segment: "#" }
 * ```
 */
export function delimiters(options: DelimitersOptions = {}): Arbitrary<Delimiters> {
  const standard = fc.constant(STANDARD_DELIMITERS);
  const any = fc
    .shuffledSubarray([...DELIMITER_POOL], { minLength: 4, maxLength: 4 })
    .map((chars): Delimiters => {
      const [element, repetition, component, segment] = chars as [string, string, string, string];
      return { element, repetition, component, segment };
    });
  if (options.delimiters === "standard") return standard;
  if (options.delimiters === "any") return any;
  return fc.oneof({ weight: 1, arbitrary: standard }, { weight: 3, arbitrary: any });
}

/** Options for {@link value}. */
export interface ValueOptions {
  /** The fewest characters. Defaults to 1. */
  readonly minLength?: number;
  /** The most characters. Defaults to 12. */
  readonly maxLength?: number;
}

/**
 * Generate the text of one element or component as a reader sees it, after the release
 * character is taken out: letters, digits, spaces and the special characters of the X12 basic
 * and extended character sets, `?` and every standard delimiter among them, so a value often
 * holds a character the writer has to release. Never a line break or a control character.
 *
 * @param options The length bounds.
 * @returns An arbitrary of the value's text.
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { value } from "@cosyte/x12/arbitraries";
 *
 * const [text] = fc.sample(value(), 1);
 * // text is like "Q7*b:2"
 * ```
 */
export function value(options: ValueOptions = {}): Arbitrary<string> {
  const unit = fc.oneof(
    { weight: 3, arbitrary: fc.constantFrom(...ALPHANUMERIC) },
    { weight: 1, arbitrary: fc.constantFrom(...VALUE_SPECIALS) },
  );
  return fc.string({
    unit,
    minLength: options.minLength ?? 1,
    maxLength: options.maxLength ?? 12,
  });
}

/**
 * The body segment ids the generators name a segment with: common 005010 healthcare segments.
 * The envelope segments (`ISA`, `GS`, `ST`, `SE`, `GE`, `IEA`, `TA1`) and the binary segments
 * (`BIN`, `BDS`), which the parser frames by an octet count, are left out.
 *
 * @internal
 */
export const BODY_SEGMENT_IDS: readonly string[] = Object.freeze([
  "AAA",
  "AMT",
  "BHT",
  "BPR",
  "CAS",
  "CLM",
  "CLP",
  "DMG",
  "DTM",
  "DTP",
  "EB",
  "EQ",
  "HCR",
  "HD",
  "HI",
  "HL",
  "INS",
  "LQ",
  "LX",
  "MSG",
  "N1",
  "N3",
  "N4",
  "NM1",
  "NTE",
  "PER",
  "PLB",
  "PRV",
  "QTY",
  "REF",
  "SBR",
  "STC",
  "SV1",
  "SVC",
  "TRN",
  "UM",
]);

/**
 * A list that ends on an item from `last`, with up to `max - 1` items from `item` before it.
 *
 * @internal
 */
export function endingWith<T>(item: Arbitrary<T>, last: Arbitrary<T>, max: number): Arbitrary<T[]> {
  return fc
    .tuple(fc.array(item, { maxLength: Math.max(0, max - 1) }), last)
    .map(([init, end]) => [...init, end]);
}

/** Options for {@link segment}. */
export interface SegmentOptions {
  /** The segment ids to draw from. Defaults to common 005010 healthcare segments. */
  readonly ids?: readonly string[];
  /** The most elements after the id. Defaults to 8. */
  readonly maxElements?: number;
  /** The element values. Defaults to {@link value}. */
  readonly values?: Arbitrary<string>;
}

/**
 * Generate a body segment as `buildInterchange` takes one: the segment id, then each element's
 * value as a reader sees it (the builder releases every delimiter in it). Elements before the
 * last may be empty; the last never is, as X12 writes no trailing empty element.
 *
 * @param options The ids, the most elements, and the values.
 * @returns An arbitrary of a {@link SegmentSpec}.
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { segment } from "@cosyte/x12/arbitraries";
 *
 * const [spec] = fc.sample(segment({ ids: ["REF"] }), 1);
 * // spec is like ["REF", "", "7Q:b"]
 * ```
 */
export function segment(options: SegmentOptions = {}): Arbitrary<SegmentSpec> {
  const values = options.values ?? value();
  const element = fc.oneof(
    { weight: 3, arbitrary: values },
    { weight: 1, arbitrary: fc.constant("") },
  );
  return fc
    .tuple(
      fc.constantFrom(...(options.ids ?? BODY_SEGMENT_IDS)),
      endingWith(element, values, options.maxElements ?? 8),
    )
    .map(([id, elements]) => [id, ...elements]);
}

/**
 * One element as written in a segment: its repetitions, each a list of components, each the
 * value a reader sees.
 *
 * @internal
 */
export type ElementShape = readonly (readonly string[])[];

/**
 * Generate an element's shape: an empty element, or one to two repetitions of one to three
 * components. A repetition of two or more components ends on a non-empty one, and so does the
 * element, as X12 writes no trailing empty component or repetition.
 *
 * @internal
 */
export function elementShape(values: Arbitrary<string>): Arbitrary<ElementShape> {
  const component = fc.oneof(
    { weight: 3, arbitrary: values },
    { weight: 1, arbitrary: fc.constant("") },
  );
  const repetition = endingWith(component, values, 3);
  return fc.oneof(
    { weight: 1, arbitrary: fc.constant([[""]]) },
    { weight: 4, arbitrary: values.map((v) => [[v]]) },
    { weight: 2, arbitrary: endingWith(repetition, repetition, 2) },
  );
}

/**
 * Release every delimiter and every `?` in a value, as X12 writes it. Written apart from the
 * library's own `escapeRelease`, so the text the generators write does not lean on the code it
 * tests.
 *
 * @internal
 */
export function releaseValue(text: string, d: Delimiters): string {
  let out = "";
  for (const ch of text) {
    const special =
      ch === RELEASE ||
      ch === d.element ||
      ch === d.repetition ||
      ch === d.component ||
      ch === d.segment;
    out += special ? RELEASE + ch : ch;
  }
  return out;
}

/**
 * Write an element's shape: components joined by the component separator, repetitions by the
 * repetition separator, each value released.
 *
 * @internal
 */
export function writeElement(shape: ElementShape, d: Delimiters): string {
  return shape
    .map((rep) => rep.map((v) => releaseValue(v, d)).join(d.component))
    .join(d.repetition);
}

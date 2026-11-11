import { X12_TR3_CONFORMANCE, parseX12 } from "@cosyte/x12";
import type {
  Delimiters,
  FunctionalGroupSpec,
  InterchangeSpec,
  TransactionSetSpec,
  X12Interchange,
} from "@cosyte/x12";
import fc from "fast-check";
import type { Arbitrary } from "fast-check";

import {
  BODY_SEGMENT_IDS,
  delimiters as delimitersArbitrary,
  elementShape,
  endingWith,
  segment,
  value,
  writeElement,
  type ElementShape,
} from "./text.js";

/**
 * The GS-01 functional identifier code each transaction set travels under, keyed by ST-01. A
 * copy of the library's own table (data element 479), held equal to it by this package's tests,
 * so the subpath imports nothing from the library but its public entry point.
 *
 * @internal
 */
export const FUNCTIONAL_IDENTIFIERS: Readonly<Record<string, string>> = Object.freeze({
  "270": "HS",
  "271": "HB",
  "276": "HR",
  "277": "HN",
  "278": "HI",
  "820": "RA",
  "834": "BE",
  "835": "HP",
  "837": "HC",
  "997": "FA",
});

/** A transaction set type: what ST-01, GS-01 and GS-08 (and ST-03) carry for it. */
export interface TransactionSetType {
  /** The transaction set identifier, ST-01, such as `835`. */
  readonly id: string;
  /** The functional identifier code, GS-01, such as `HP`. */
  readonly functionalIdCode: string;
  /** The implementation guide, GS-08 and ST-03, such as `005010X221A1`. */
  readonly version: string;
}

/**
 * Every transaction set type the library declares a guide for in `X12_TR3_CONFORMANCE` and
 * knows the functional identifier of, derived rather than restated.
 *
 * @internal
 */
export const TRANSACTION_SET_TYPES: readonly TransactionSetType[] = Object.freeze(
  X12_TR3_CONFORMANCE.flatMap((row): TransactionSetType[] => {
    const functionalIdCode = Object.hasOwn(FUNCTIONAL_IDENTIFIERS, row.transaction)
      ? FUNCTIONAL_IDENTIFIERS[row.transaction]
      : undefined;
    if (row.tr3 === null || functionalIdCode === undefined) return [];
    return [{ id: row.transaction, functionalIdCode, version: row.tr3 }];
  }),
);

/**
 * Generate a transaction set type: an ST-01 such as `835`, the GS-01 it travels under and the
 * implementation guide the library declares for it, one of the 270, 271, 276, 277 (with the
 * 277CA and the request for additional information), 278, 820, 834, 835 and 837 guides.
 *
 * @returns An arbitrary of a {@link TransactionSetType}.
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { transactionSetType } from "@cosyte/x12/arbitraries";
 *
 * const [type] = fc.sample(transactionSetType(), 1);
 * // type is like { id: "835", functionalIdCode: "HP", version: "005010X221A1" }
 * ```
 */
export function transactionSetType(): Arbitrary<TransactionSetType> {
  return fc.constantFrom(...TRANSACTION_SET_TYPES);
}

/** Options for {@link interchange}, {@link interchangeText} and {@link interchangeSpec}. */
export interface InterchangeOptions {
  /** The delimiters to write with. Defaults to {@link delimiters}. */
  readonly delimiters?: Arbitrary<Delimiters>;
  /** The most functional groups. Defaults to 2. */
  readonly maxGroups?: number;
  /** The most transaction sets in a group. Defaults to 2. */
  readonly maxTransactions?: number;
  /** The most body segments in a transaction set. Defaults to 6. */
  readonly maxSegments?: number;
  /** The most elements in a body segment. Defaults to 8. */
  readonly maxElements?: number;
}

/**
 * A body segment of a generated interchange: its id and each element's shape, before writing.
 *
 * @internal
 */
export interface BodySegment {
  readonly id: string;
  readonly elements: readonly ElementShape[];
}

/**
 * The parts of a generated interchange, each segment as its wire elements (the id first), and
 * each body segment also as the values a reader sees.
 *
 * @internal
 */
export interface InterchangeParts {
  readonly d: Delimiters;
  readonly isa: readonly string[];
  readonly ta1: readonly (readonly string[])[];
  readonly groups: readonly {
    readonly gs: readonly string[];
    readonly transactions: readonly {
      readonly st: readonly string[];
      readonly body: readonly BodySegment[];
      readonly se: readonly string[];
    }[];
    readonly ge: readonly string[];
  }[];
  readonly iea: readonly string[];
}

/** A string of `[A-Z0-9]`. */
function token(minLength: number, maxLength: number): Arbitrary<string> {
  return fc.string({
    unit: fc.constantFrom(..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"),
    minLength,
    maxLength,
  });
}

/** A whole number written with `width` digits, zero-padded. */
function digits(min: number, max: number, width: number): Arbitrary<string> {
  return fc.integer({ min, max }).map((n) => String(n).padStart(width, "0"));
}

/** A control number of one to nine digits with no leading zero. */
function controlNumber(): Arbitrary<string> {
  return fc.integer({ min: 1, max: 999_999_999 }).map(String);
}

/** A date as `YYMMDD`, `CCYYMMDD` when `century` is set. */
function date(century: boolean): Arbitrary<string> {
  return fc
    .tuple(digits(2000, 2039, 4), digits(1, 12, 2), digits(1, 28, 2))
    .map(([y, m, day]) => (century ? y : y.slice(2)) + m + day);
}

/** A time as `HHMM`. */
function time(): Arbitrary<string> {
  return fc.tuple(digits(0, 23, 2), digits(0, 59, 2)).map(([h, m]) => h + m);
}

/** Pad an ISA value to its fixed width with spaces. */
function pad(text: string, width: number): string {
  return text.padEnd(width, " ");
}

/**
 * Generate an interchange's parts over one delimiter set.
 *
 * @internal
 */
export function interchangeParts(options: InterchangeOptions = {}): Arbitrary<InterchangeParts> {
  const dArb = options.delimiters ?? delimitersArbitrary();
  const values = value();
  const body: Arbitrary<BodySegment> = fc
    .tuple(
      fc.constantFrom(...BODY_SEGMENT_IDS),
      endingWith(
        elementShape(values),
        values.map((v): ElementShape => [[v]]),
        options.maxElements ?? 8,
      ),
    )
    .map(([id, elements]) => ({ id, elements }));
  const transaction = fc.record({
    control: controlNumber().map((n) => n.padStart(4, "0")),
    declareGuide: fc.boolean(),
    body: fc.array(body, { maxLength: options.maxSegments ?? 6 }),
  });
  const group = fc.record({
    type: transactionSetType(),
    sender: token(2, 15),
    receiver: token(2, 15),
    date: date(true),
    time: time(),
    control: controlNumber(),
    transactions: fc.array(transaction, { minLength: 1, maxLength: options.maxTransactions ?? 2 }),
  });
  const ta1 = fc
    .tuple(digits(1, 999_999_999, 9), date(false), time(), fc.constantFrom("A", "E", "R"))
    .map(([control, day, hhmm, status]) => ["TA1", control, day, hhmm, status, "000"]);
  return fc
    .record({
      d: dArb,
      senderQualifier: fc.constantFrom("ZZ", "01", "30"),
      sender: token(1, 15),
      receiverQualifier: fc.constantFrom("ZZ", "01", "30"),
      receiver: token(1, 15),
      date: date(false),
      time: time(),
      control: digits(1, 999_999_999, 9),
      acknowledgment: fc.constantFrom("0", "1"),
      usage: fc.constantFrom("P", "T"),
      ta1: fc.array(ta1, { maxLength: 1 }),
      groups: fc.array(group, { minLength: 1, maxLength: options.maxGroups ?? 2 }),
    })
    .map((r): InterchangeParts => {
      const isa = [
        "ISA",
        "00",
        pad("", 10),
        "00",
        pad("", 10),
        r.senderQualifier,
        pad(r.sender, 15),
        r.receiverQualifier,
        pad(r.receiver, 15),
        r.date,
        r.time,
        r.d.repetition,
        "00501",
        r.control,
        r.acknowledgment,
        r.usage,
        r.d.component,
      ];
      const groups = r.groups.map((g) => ({
        gs: [
          "GS",
          g.type.functionalIdCode,
          g.sender,
          g.receiver,
          g.date,
          g.time,
          g.control,
          "X",
          g.type.version,
        ],
        transactions: g.transactions.map((t) => ({
          st: t.declareGuide
            ? ["ST", g.type.id, t.control, g.type.version]
            : ["ST", g.type.id, t.control],
          body: t.body,
          se: ["SE", String(t.body.length + 2), t.control],
        })),
        ge: ["GE", String(g.transactions.length), g.control],
      }));
      return {
        d: r.d,
        isa,
        ta1: r.ta1,
        groups,
        iea: ["IEA", String(r.groups.length), r.control],
      };
    });
}

/**
 * Write a body segment's wire elements, the id first.
 *
 * @internal
 */
export function writeBody(seg: BodySegment, d: Delimiters): string[] {
  return [seg.id, ...seg.elements.map((shape) => writeElement(shape, d))];
}

/**
 * Every segment of an interchange as its wire elements, in order.
 *
 * @internal
 */
export function wireSegments(parts: InterchangeParts): (readonly string[])[] {
  const out: (readonly string[])[] = [parts.isa, ...parts.ta1];
  for (const g of parts.groups) {
    out.push(g.gs);
    for (const t of g.transactions) {
      out.push(t.st, ...t.body.map((seg) => writeBody(seg, parts.d)), t.se);
    }
    out.push(g.ge);
  }
  out.push(parts.iea);
  return out;
}

/**
 * The spec-clean text {@link interchange} parses, written apart from the library's serializer
 * and builder: no line breaks, every count and control number agreeing, every segment
 * terminated.
 *
 * @internal
 */
export function cleanInterchangeText(options: InterchangeOptions = {}): Arbitrary<string> {
  return interchangeParts(options).map((parts) => writeClean(parts));
}

/**
 * Write an interchange's parts as spec-clean text.
 *
 * @internal
 */
export function writeClean(parts: InterchangeParts): string {
  const { d } = parts;
  return wireSegments(parts)
    .map((elements) => elements.join(d.element) + d.segment)
    .join("");
}

/**
 * Parse generated text into an interchange fast-check can print and clone. The parser freezes
 * what it returns, so this is a frozen copy of it with two hidden properties: printed, a failing
 * interchange reads as the `parseX12` call that rebuilds it; cloned, it is parsed again.
 * Neither property is enumerable, so the copy deep-equals what `parseX12` returns for the text.
 *
 * @internal
 */
export function parsedInterchange(text: string): X12Interchange {
  const parsed = parseX12(text);
  const copy: X12Interchange = { ...parsed };
  Object.defineProperty(copy, fc.toStringMethod, {
    value: () => `parseX12(${JSON.stringify(text)})`,
  });
  Object.defineProperty(copy, fc.cloneMethod, { value: () => parsedInterchange(text) });
  return Object.freeze(copy);
}

/**
 * Generate a spec-clean interchange, parsed: an ISA over generated delimiters, sometimes a TA1,
 * then one or more functional groups of one or more transaction sets, each a type the library
 * declares a guide for, with generated body segments whose elements carry repetitions,
 * components and values that need the release character. Every count and control number
 * agrees, so the parser warns about nothing, and the interchange serializes back to the exact
 * text it was parsed from. Every value is random: nothing in one looks like a name, a date of
 * birth, a member id or an amount from a real claim.
 *
 * @param options The delimiters and the size.
 * @returns An arbitrary of an `X12Interchange`.
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { parseX12, serializeX12 } from "@cosyte/x12";
 * import { interchange } from "@cosyte/x12/arbitraries";
 *
 * fc.assert(
 *   fc.property(interchange(), (ix) => {
 *     const text = serializeX12(ix);
 *     return serializeX12(parseX12(text)) === text;
 *   }),
 * );
 * ```
 */
export function interchange(options: InterchangeOptions = {}): Arbitrary<X12Interchange> {
  return cleanInterchangeText(options).map(parsedInterchange);
}

/**
 * Generate a spec for `buildInterchange`: generated delimiters, sender and receiver ids, a date
 * and time, control numbers, and one or more functional groups of one or more transaction sets,
 * each with generated body segments from {@link segment}. Values hold characters the builder
 * must release, so what it writes reads back as the values given.
 *
 * @param options The delimiters and the size.
 * @returns An arbitrary of an `InterchangeSpec`.
 * @example
 * ```ts
 * import fc from "fast-check";
 * import { buildInterchange } from "@cosyte/x12";
 * import { interchangeSpec } from "@cosyte/x12/arbitraries";
 *
 * fc.assert(
 *   fc.property(interchangeSpec(), (spec) => buildInterchange(spec).warnings.length === 0),
 * );
 * ```
 */
export function interchangeSpec(options: InterchangeOptions = {}): Arbitrary<InterchangeSpec> {
  const transaction = (type: TransactionSetType): Arbitrary<TransactionSetSpec> =>
    fc.record({
      transactionSetIdCode: fc.constant(type.id),
      transactionSetControlNumber: controlNumber().map((n) => n.padStart(4, "0")),
      implementationConventionReference: fc.constant(type.version),
      segments: fc.array(segment({ maxElements: options.maxElements ?? 8 }), {
        maxLength: options.maxSegments ?? 6,
      }),
    });
  const group: Arbitrary<FunctionalGroupSpec> = transactionSetType().chain((type) =>
    fc.record({
      functionalIdCode: fc.constant(type.functionalIdCode),
      groupControlNumber: controlNumber(),
      versionRelease: fc.constant(type.version),
      transactions: fc.array(transaction(type), {
        minLength: 1,
        maxLength: options.maxTransactions ?? 2,
      }),
    }),
  );
  return fc
    .record({
      d: options.delimiters ?? delimitersArbitrary(),
      senderId: token(1, 15),
      receiverId: token(1, 15),
      interchangeDate: date(false),
      interchangeTime: time(),
      interchangeControlNumber: controlNumber(),
      usageIndicator: fc.constantFrom("P", "T"),
      groups: fc.array(group, { minLength: 1, maxLength: options.maxGroups ?? 2 }),
    })
    .map(({ d, ...spec }): InterchangeSpec => ({
      ...spec,
      elementSeparator: d.element,
      repetitionSeparator: d.repetition,
      componentSeparator: d.component,
      segmentTerminator: d.segment,
    }));
}

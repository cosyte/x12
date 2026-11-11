/**
 * The output-equivalence corpus: synthetic documents and builder specs, and the function that
 * records everything a caller can observe of the library on each one.
 *
 * `test/output-equivalence.test.ts` holds the library to the digests in
 * `test/fixtures/equivalence/output-digests.json`, which were captured from the source before the
 * allocation work on the parser, the segment readers, `X12Decimal` and the builders. A change to
 * any of those that moves one observable byte (a parsed field, a warning, its order or position, a
 * typed read, a decimal, a built or serialized text, an error's class, code or message, or whether
 * a returned object is frozen) changes a digest.
 *
 * Every document is synthetic: this package's own fixtures, the benchmark corpus at small sizes,
 * documents written here for the paths the work touches (release characters, degenerate delimiter
 * sets, binary segments, broken envelopes), and documents drawn on fixed seeds from
 * `@cosyte/x12/arbitraries`.
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import fc from "fast-check";

import {
  ack999Spec,
  ack999Text,
  attachment275Spec,
  attachment275Text,
  claim837ISpec,
  claim837IText,
  claim837PSpec,
  claim837PText,
  eligibility271Spec,
  eligibility271Text,
  inquiry270Spec,
  inquiry270Text,
  remit835Spec,
  remit835Text,
} from "../../bench/corpus.mjs";
import {
  hostileInput,
  interchange,
  interchangeSpec,
  interchangeText,
} from "../../src/arbitraries/index.js";
import {
  X12Decimal,
  build270,
  build271,
  build275,
  build276,
  build277,
  build277CA,
  build277RequestForAdditionalInformation,
  build278Request,
  build278Response,
  build820,
  build834,
  build835,
  build837D,
  build837I,
  build837P,
  build999,
  buildInterchange,
  buildTA1,
  collectElementValues,
  componentOptional,
  decodeSegment,
  elementDecimal,
  elementDecimalOrZero,
  elementOptional,
  elementValue,
  escapeRelease,
  get270Inquiry,
  get271Eligibility,
  get275Attachments,
  get276StatusInquiry,
  get277CADisposition,
  get277RequestForAdditionalInformation,
  get277Status,
  get278Request,
  get278Response,
  get820Payments,
  get834Enrollments,
  get834Header,
  get835,
  get837Claims,
  getAllSegmentValues,
  getSegmentValue,
  parse270Inquiries,
  parse276StatusInquiries,
  parse999,
  parseTA1,
  parseX12,
  readElementDecimal,
  serializeX12,
  unescapeRelease,
} from "../../src/index.js";
import type {
  Build270Spec,
  Build271Spec,
  Build275Spec,
  Build276Spec,
  Build277RfaiSpec,
  Build277Spec,
  Build278Spec,
  Build820Spec,
  Build834Spec,
  Build835Spec,
  Build837ServiceLineSpec,
  Build837Spec,
  Build999Spec,
  BuildTA1Spec,
  Delimiters,
  InterchangeSpec,
  X12Interchange,
  X12ParseWarning,
  X12Segment,
} from "../../src/index.js";

// ---------------------------------------------------------------------------
// Recording what a caller can observe.
// ---------------------------------------------------------------------------

/**
 * Write `value` as deterministic text: every own enumerable key in its order, whether each object
 * and array is frozen, an `X12Decimal` by its text, an error by its class, code and message. Key
 * order is kept, not sorted, because it is observable through `JSON.stringify` and `Object.keys`.
 * Whether an `X12Decimal` is frozen is not recorded: instances stopped being frozen on purpose,
 * and `test/decimal-not-frozen.test.ts` holds what they answer now.
 */
export function record(value: unknown): string {
  const out: string[] = [];
  write(value, out, 0);
  return out.join("");
}

function write(value: unknown, out: string[], depth: number): void {
  if (depth > 200) throw new Error("record: nested past 200 levels");
  if (value === undefined) {
    out.push("u");
    return;
  }
  if (value === null) {
    out.push("n");
    return;
  }
  switch (typeof value) {
    case "string":
      out.push(JSON.stringify(value));
      return;
    case "number":
      out.push(`#${Object.is(value, -0) ? "-0" : String(value)}`);
      return;
    case "boolean":
      out.push(value ? "T" : "F");
      return;
    case "bigint":
      out.push(`${String(value)}n`);
      return;
    case "function":
      out.push("fn");
      return;
    case "symbol":
      out.push("sym");
      return;
    case "object":
    case "undefined":
      break;
  }
  if (value instanceof X12Decimal) {
    out.push(
      `dec(${JSON.stringify(value.toString())},${String(value.signum())},${String(Object.keys(value).length)})`,
    );
    return;
  }
  if (value instanceof Error) {
    const code = (value as { code?: unknown }).code;
    out.push(`err(${value.constructor.name},${JSON.stringify(value.message)},`);
    write(code, out, depth + 1);
    out.push(",");
    writeObject(value as unknown as Record<string, unknown>, out, depth);
    out.push(")");
    return;
  }
  if (Buffer.isBuffer(value)) {
    out.push(`buf(${value.toString("hex")})`);
    return;
  }
  if (Array.isArray(value)) {
    out.push(Object.isFrozen(value) ? "[F" : "[M");
    for (const item of value as readonly unknown[]) {
      out.push(",");
      write(item, out, depth + 1);
    }
    out.push("]");
    return;
  }
  if (value instanceof Map) {
    out.push("map{");
    for (const [k, v] of value as Map<unknown, unknown>) {
      write(k, out, depth + 1);
      out.push("=>");
      write(v, out, depth + 1);
      out.push(";");
    }
    out.push("}");
    return;
  }
  if (value instanceof Set) {
    out.push("set{");
    for (const v of value as Set<unknown>) {
      write(v, out, depth + 1);
      out.push(";");
    }
    out.push("}");
    return;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  const kind = proto === Object.prototype || proto === null ? "" : "?";
  out.push(`${kind}{${Object.isFrozen(value) ? "F" : "M"}`);
  writeObject(value as Record<string, unknown>, out, depth);
  out.push("}");
}

function writeObject(value: Record<string, unknown>, out: string[], depth: number): void {
  for (const key of Object.keys(value)) {
    out.push(`,${JSON.stringify(key)}:`);
    write(value[key], out, depth + 1);
  }
}

/** Run `fn` and record its result, or the error it threw. */
function attempt(fn: () => unknown): string {
  try {
    return `ok:${record(fn())}`;
  } catch (error) {
    return `throw:${record(error)}`;
  }
}

/**
 * Where to write every recorded line, one file per document, for finding which line of a moved
 * digest moved: set `X12_EQUIVALENCE_DUMP` to a directory and diff a base run against a head run.
 */
const DUMP_DIR = process.env["X12_EQUIVALENCE_DUMP"];
let dumpSeq = 0;

/** A recorder that collects lines for one document and hashes them. */
class Observation {
  private readonly hash = createHash("sha256");
  private lines = 0;
  private readonly dump: string[] | undefined = DUMP_DIR === undefined ? undefined : [];

  public add(label: string, text: string): void {
    this.hash.update(label);
    this.hash.update("\u0000");
    this.hash.update(text);
    this.hash.update("\u0001");
    this.lines += 1;
    this.dump?.push(`${label}\t${text}`);
  }

  public digest(): string {
    if (DUMP_DIR !== undefined && this.dump !== undefined) {
      dumpSeq += 1;
      writeFileSync(
        join(DUMP_DIR, `${String(dumpSeq).padStart(5, "0")}.txt`),
        this.dump.join("\n"),
      );
    }
    return `${this.hash.digest("hex")}:${String(this.lines)}`;
  }
}

// ---------------------------------------------------------------------------
// What is observed of a document.
// ---------------------------------------------------------------------------

/** Paths read off every segment, the malformed ones included. */
const MALFORMED_PATHS = ["", "a", "01[", "01[x]", "01[]", "01-", "01x", "01[0]x", "-1"];

/** Every segment-level reader, at every index around the segment's own. */
function observeSegment(
  obs: Observation,
  label: string,
  seg: X12Segment,
  d: Delimiters,
  first: boolean,
): void {
  const last = seg.elements.length + 1;
  const read: string[] = [];
  for (let n = 0; n <= last; n += 1) {
    const nn = String(n).padStart(2, "0");
    read.push(attempt(() => elementValue(seg, n, d)));
    read.push(attempt(() => elementOptional(seg, n, d)));
    read.push(attempt(() => readElementDecimal(seg, n, d)));
    const warnings: X12ParseWarning[] = [];
    const sink = { warnings, position: { segmentIndex: 7 } };
    read.push(attempt(() => elementDecimal(seg, n, d, sink)));
    read.push(attempt(() => elementDecimalOrZero(seg, n, d, sink)));
    read.push(record(warnings));
    for (let p = 0; p <= 4; p += 1) read.push(attempt(() => componentOptional(seg, n, p, d)));
    const paths = [nn, `${nn}-1`, `${nn}-2`, `${nn}-3`, `${nn}[0]`, `${nn}[1]`, `${nn}[1]-2`];
    paths.push(`${String(n)}`, `${nn}[0]-1`, `${nn}-0`, `${nn}[2]-1`);
    for (const path of paths) {
      const emitted: X12ParseWarning[] = [];
      read.push(attempt(() => getSegmentValue(seg, path, d, (w) => emitted.push(w))));
      read.push(attempt(() => getAllSegmentValues(seg, path, d, (w) => emitted.push(w))));
      read.push(record(emitted));
    }
  }
  // Indexes the numeric helpers are not written for, which a JavaScript caller can still pass.
  const odd = [-1, -0, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1e21, 2 ** 53 + 2, "2", null];
  for (const n of odd as number[]) {
    read.push(attempt(() => elementValue(seg, n, d)));
    read.push(attempt(() => elementOptional(seg, n, d)));
    read.push(attempt(() => componentOptional(seg, n, 1, d)));
    read.push(attempt(() => componentOptional(seg, 1, n, d)));
    read.push(attempt(() => readElementDecimal(seg, n, d)));
  }
  read.push(attempt(() => collectElementValues(seg, 1, seg.elements.length, d)));
  read.push(attempt(() => collectElementValues(seg, 0, last, d)));
  if (first) {
    for (const path of MALFORMED_PATHS) {
      read.push(attempt(() => getSegmentValue(seg, path, d)));
      read.push(attempt(() => getAllSegmentValues(seg, path, d)));
    }
  }
  obs.add(`${label}:reads`, read.join("|"));
  const emitted: X12ParseWarning[] = [];
  const decoded = attempt(() =>
    decodeSegment(seg.raw, d, (w) => emitted.push(w), { segmentIndex: 3, interchangeIndex: 0 }),
  );
  obs.add(`${label}:decode`, `${decoded}|${record(emitted)}`);
  for (const element of seg.elements) {
    const warned: X12ParseWarning[] = [];
    const u = attempt(() =>
      unescapeRelease(element, d, (w) => warned.push(w), { segmentIndex: 1 }),
    );
    obs.add(
      `${label}:unescape`,
      `${u}|${record(warned)}|${attempt(() => escapeRelease(element, d))}`,
    );
  }
}

/** Every typed reader, on every transaction set, whatever its kind. */
async function observeReaders(obs: Observation, ix: X12Interchange): Promise<void> {
  const d = ix.delimiters;
  for (const [g, group] of ix.groups.entries()) {
    for (const [t, tx] of group.transactions.entries()) {
      const at = `g${String(g)}t${String(t)}`;
      obs.add(
        `${at}:835`,
        attempt(() => get835(d, tx)),
      );
      obs.add(
        `${at}:837`,
        attempt(() => get837Claims(d, tx)),
      );
      obs.add(
        `${at}:837P`,
        attempt(() => get837Claims(d, tx, { type: "P" })),
      );
      obs.add(
        `${at}:837I`,
        attempt(() => get837Claims(d, tx, { type: "I" })),
      );
      obs.add(
        `${at}:837D`,
        attempt(() => get837Claims(d, tx, { type: "D" })),
      );
      obs.add(
        `${at}:270`,
        attempt(() => get270Inquiry(d, tx)),
      );
      obs.add(
        `${at}:271`,
        attempt(() => get271Eligibility(d, tx)),
      );
      obs.add(
        `${at}:275`,
        attempt(() => get275Attachments(d, tx)),
      );
      obs.add(
        `${at}:276`,
        attempt(() => get276StatusInquiry(d, tx)),
      );
      obs.add(
        `${at}:277`,
        attempt(() => get277Status(d, tx)),
      );
      obs.add(
        `${at}:277CA`,
        attempt(() => get277CADisposition(d, tx)),
      );
      obs.add(
        `${at}:277RFAI`,
        attempt(() => get277RequestForAdditionalInformation(d, tx)),
      );
      obs.add(
        `${at}:278q`,
        attempt(() => get278Request(d, tx)),
      );
      obs.add(
        `${at}:278r`,
        attempt(() => get278Response(d, tx)),
      );
      obs.add(
        `${at}:820`,
        attempt(() => get820Payments(d, tx)),
      );
      obs.add(
        `${at}:834h`,
        attempt(() => get834Header(d, tx)),
      );
      const members: unknown[] = [];
      try {
        for await (const member of get834Enrollments(d, tx)) members.push(member);
        obs.add(`${at}:834m`, `ok:${record(members)}`);
      } catch (error) {
        obs.add(`${at}:834m`, `throw:${record(members)}:${record(error)}`);
      }
    }
  }
  obs.add(
    "ta1",
    attempt(() => parseTA1(ix)),
  );
}

/** How much of a document is observed. */
export interface ObserveDepth {
  /** Every segment reader at every index of every segment: the expensive part. */
  readonly segments: boolean;
}

/**
 * Everything observable of one input: the lenient and strict parses with every warning in the
 * order the callback saw it, the serializations, every segment reader and every typed reader.
 */
export async function observeInput(input: string | Buffer, depth: ObserveDepth): Promise<string> {
  const obs = new Observation();
  const seen: X12ParseWarning[] = [];
  let ix: X12Interchange | undefined;
  try {
    ix = parseX12(input, { profile: null, onWarning: (w) => seen.push(w) });
    obs.add("parse", `ok:${record(ix)}`);
  } catch (error) {
    obs.add("parse", `throw:${record(error)}`);
  }
  obs.add("onWarning", record(seen));
  obs.add(
    "strict",
    attempt(() => parseX12(input, { profile: null, strict: true })),
  );
  obs.add(
    "999",
    attempt(() => parse999(input, { profile: null })),
  );
  obs.add(
    "270s",
    attempt(() => parse270Inquiries(input, { profile: null })),
  );
  obs.add(
    "276s",
    attempt(() => parse276StatusInquiries(input, { profile: null })),
  );
  if (ix === undefined) return obs.digest();
  const parsed = ix;
  obs.add(
    "ser",
    attempt(() => serializeX12(parsed)),
  );
  const serWarnings: X12ParseWarning[] = [];
  obs.add(
    "ser:clean",
    attempt(() => serializeX12(parsed, { specClean: true, onWarning: (w) => serWarnings.push(w) })),
  );
  obs.add(
    "ser:recount",
    attempt(() => serializeX12(parsed, { recomputeCounts: true })),
  );
  obs.add("ser:warnings", record(serWarnings));
  if (depth.segments) {
    let first = true;
    for (const [g, group] of parsed.groups.entries()) {
      for (const [t, tx] of group.transactions.entries()) {
        for (const [s, seg] of tx.segments.entries()) {
          observeSegment(
            obs,
            `g${String(g)}t${String(t)}s${String(s)}`,
            seg,
            parsed.delimiters,
            first,
          );
          first = false;
        }
      }
    }
    for (const [o, orphan] of parsed.orphanSegments.entries()) {
      observeSegment(obs, `o${String(o)}`, orphan.segment, parsed.delimiters, first);
      first = false;
    }
  }
  await observeReaders(obs, parsed);
  return obs.digest();
}

/** Everything observable of one builder call: its result or refusal, and the serialized text. */
export async function observeBuild(build: () => unknown): Promise<string> {
  const obs = new Observation();
  let built: unknown;
  try {
    built = build();
    obs.add("build", `ok:${record(built)}`);
  } catch (error) {
    obs.add("build", `throw:${record(error)}`);
    return obs.digest();
  }
  if (isInterchange(built)) {
    const ix = built;
    obs.add(
      "ser",
      attempt(() => serializeX12(ix)),
    );
    obs.add(
      "ser:recount",
      attempt(() => serializeX12(ix, { recomputeCounts: true, specClean: true })),
    );
    await observeReaders(obs, ix);
  }
  return obs.digest();
}

function isInterchange(value: unknown): value is X12Interchange {
  return typeof value === "object" && value !== null && "groups" in value && "isa" in value;
}

/** Everything observable of `X12Decimal` on a set of lexical forms. */
export function observeDecimals(): string {
  const obs = new Observation();
  const forms = [
    "",
    "0",
    "-0",
    "+0",
    "0.00",
    "-0.00",
    ".5",
    "5.",
    "-.5",
    "+.5",
    ".",
    "-",
    "+",
    "+.",
    "1.2.3",
    "1,234.56",
    "1e3",
    " 1",
    "1 ",
    "1234.56",
    "-50",
    "0050.00",
    "999999999999999999999.999999",
    "-123456789012345678901234567890.123",
    "abc",
    "--1",
    "+-1",
    "1-",
    "00",
    "-0.01",
    "0.1",
    "0.2",
  ];
  const values = forms.map((f) => X12Decimal.fromString(f));
  // A JavaScript caller is not held to the string type.
  const strange = [
    5,
    -0.25,
    1e21,
    Number.NaN,
    true,
    {},
    [],
    ["7"],
    { length: 0 },
    new String("1.5"),
    new String(".5"),
    new String("."),
    new String("-"),
    new String("+7."),
  ];
  for (const [i, v] of strange.entries()) {
    const read = attempt(() => X12Decimal.fromString(v as unknown as string));
    const text = attempt(() => X12Decimal.fromString(v as unknown as string)?.toString());
    obs.add(`strange${String(i)}`, `${read}|${text}`);
  }
  for (const [i, v] of [null, undefined, Symbol("x")].entries()) {
    obs.add(
      `thrown${String(i)}`,
      attempt(() => X12Decimal.fromString(v as unknown as string)),
    );
  }
  obs.add(
    "primitive-this",
    [
      attempt(() => X12Decimal.prototype.toString.call(5)),
      attempt(() => X12Decimal.prototype.signum.call(undefined)),
      attempt(() => X12Decimal.prototype.add.call(null, X12Decimal.ZERO)),
      attempt(() => X12Decimal.ZERO.add(0.3 as unknown as X12Decimal)),
      attempt(() => X12Decimal.ZERO.compareTo("1" as unknown as X12Decimal)),
    ].join("|"),
  );
  obs.add("fromString", record(values));
  const defined = values.filter((v): v is X12Decimal => v !== undefined);
  for (const [i, a] of defined.entries()) {
    obs.add(
      `one${String(i)}`,
      [
        attempt(() => a.toString()),
        attempt(() => a.toNumber()),
        attempt(() => a.signum()),
        attempt(() => a.isZero()),
        attempt(() => a.abs()),
        attempt(() => a.negate()),
        attempt(() => Object.keys(a)),
        attempt(() => JSON.stringify(a)),
        attempt(() => String(a)),
        attempt(() => `${a.toString()}`),
        attempt(() => Object.getOwnPropertyNames(a)),
        attempt(() => Object.getOwnPropertySymbols(a).length),
        attempt(() => a instanceof X12Decimal),
      ].join("|"),
    );
    for (const [j, b] of defined.entries()) {
      obs.add(
        `two${String(i)},${String(j)}`,
        [
          attempt(() => a.add(b)),
          attempt(() => a.subtract(b)),
          attempt(() => a.equals(b)),
          attempt(() => a.compareTo(b)),
        ].join("|"),
      );
    }
  }
  for (const [v, s] of [
    [0n, 0],
    [0n, 2],
    [-5n, 0],
    [123456n, 2],
    [-1n, 5],
    [10n, -1],
    [10n, 1.5],
    [10n, Number.NaN],
  ] as const) {
    obs.add(
      `big${String(v)},${String(s)}`,
      attempt(() => X12Decimal.fromBigInt(v, s)),
    );
  }
  obs.add(
    "zero",
    attempt(() => X12Decimal.ZERO),
  );
  obs.add(
    "zeroSame",
    attempt(() => X12Decimal.ZERO === X12Decimal.ZERO.abs()),
  );
  const forged = Object.create(X12Decimal.prototype) as X12Decimal;
  const one = X12Decimal.fromString("1") ?? X12Decimal.ZERO;
  obs.add(
    "forged",
    [
      attempt(() => forged.toString()),
      attempt(() => forged.signum()),
      attempt(() => forged.isZero()),
      attempt(() => forged.toNumber()),
      attempt(() => forged.abs()),
      attempt(() => forged.negate()),
      attempt(() => forged.add(one)),
      attempt(() => one.add(forged)),
      attempt(() => one.subtract(forged)),
      attempt(() => one.compareTo(forged)),
      attempt(() => one.equals(forged)),
      attempt(() => X12Decimal.prototype.toString.call({})),
      attempt(() => one.add(Object.create(null) as X12Decimal)),
    ].join("|"),
  );
  return obs.digest();
}

/**
 * The public readers on values a JavaScript caller can pass that are not what they are typed as:
 * a segment it built by hand with elements that are not strings, raw text that is not a string.
 */
export function observeOddValues(): string {
  const obs = new Observation();
  const d: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };
  const odd: unknown[] = [
    5,
    0,
    ["?"],
    ["a"],
    ["a*b"],
    ["*"],
    ["?", "x"],
    null,
    {},
    true,
    "A^B:C?",
    // String objects read like strings, all the way through the character-at-a-time readers.
    new String("a?*b?Xc??d?"),
    new String("a?*b*c^d?^e:f?:g"),
    new String("BIN*3*A?B"),
    new String("x?"),
  ];
  for (const [i, v] of odd.entries()) {
    const warned: X12ParseWarning[] = [];
    const at = { segmentIndex: 2 };
    const u = attempt(() => unescapeRelease(v as string, d, (w) => warned.push(w), at));
    obs.add(`unescape${String(i)}`, `${u}|${record(warned)}`);
    const emitted: X12ParseWarning[] = [];
    const decoded = attempt(() => decodeSegment(v as string, d, (w) => emitted.push(w), at));
    obs.add(`decode${String(i)}`, `${decoded}|${record(emitted)}`);
    for (const id of ["NM1", "BIN", "BDS", "ISA"]) {
      const seg = { id, raw: "", elements: [id, v, v, v] } as unknown as X12Segment;
      const reads: string[] = [];
      for (const path of ["01", "01-1", "01-2", "01[0]", "01[1]", "02[1]-1", "03-1"]) {
        const w: X12ParseWarning[] = [];
        reads.push(attempt(() => getSegmentValue(seg, path, d, (x) => w.push(x))));
        reads.push(attempt(() => getAllSegmentValues(seg, path, d, (x) => w.push(x))));
        reads.push(record(w));
      }
      for (const n of [1, 2, 3]) {
        reads.push(attempt(() => elementValue(seg, n, d)));
        reads.push(attempt(() => elementOptional(seg, n, d)));
        reads.push(attempt(() => componentOptional(seg, n, 1, d)));
        reads.push(attempt(() => componentOptional(seg, n, 2, d)));
        reads.push(attempt(() => readElementDecimal(seg, n, d)));
      }
      obs.add(`read${String(i)}${id}`, reads.join("|"));
    }
  }
  const multi: Delimiters = { element: "**", repetition: "", component: "::", segment: "~~" };
  const comp: Delimiters = { element: "*", repetition: "^^", component: "", segment: "~" };
  for (const [name, delims] of [
    ["multi", multi],
    ["comp", comp],
  ] as const) {
    for (const raw of ["NM1**A::B^C**D", "SVC*HC:1^X:2*Y", "BIN*3*A*B", "", "A?*B"]) {
      const emitted: X12ParseWarning[] = [];
      const seg = attempt(() =>
        decodeSegment(raw, delims, (w) => emitted.push(w), { segmentIndex: 1 }),
      );
      obs.add(`${name}:${raw}`, `${seg}|${record(emitted)}`);
      const wrapped = new String("p^^q::r") as unknown as string;
      const built = { id: "X", raw, elements: ["X", raw, "A::B", "1^2^^3", "a?:b:c", wrapped] };
      const reads: string[] = [];
      for (const path of [
        "01",
        "01-1",
        "01-2",
        "02-1",
        "02-2",
        "03[1]",
        "03[2]",
        "04-2",
        "04[0]-3",
        "05",
        "05[1]",
        "05-2",
        "05[0]-1",
      ]) {
        reads.push(attempt(() => getSegmentValue(built, path, delims)));
        reads.push(attempt(() => getAllSegmentValues(built, path, delims)));
      }
      for (const n of [1, 2, 3, 4, 5]) {
        reads.push(attempt(() => elementOptional(built, n, delims)));
        reads.push(attempt(() => componentOptional(built, n, 2, delims)));
      }
      obs.add(`${name}:${raw}:reads`, reads.join("|"));
    }
  }
  return obs.digest();
}

// ---------------------------------------------------------------------------
// The documents.
// ---------------------------------------------------------------------------

/** One input of the corpus: a label that names it and the text or bytes it is. */
export interface CorpusInput {
  readonly label: string;
  readonly input: string | Buffer;
  readonly segments: boolean;
}

const FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));

/** Every `.edi` fixture of this package, as text and as bytes. */
function fixtureInputs(): CorpusInput[] {
  const out: CorpusInput[] = [];
  for (const dir of readdirSync(FIXTURES, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const name of readdirSync(join(FIXTURES, dir.name)).sort()) {
      if (!name.endsWith(".edi")) continue;
      const bytes = readFileSync(join(FIXTURES, dir.name, name));
      out.push({
        label: `fixture:${dir.name}/${name}`,
        input: bytes.toString("utf8"),
        segments: true,
      });
      out.push({ label: `fixture-bytes:${dir.name}/${name}`, input: bytes, segments: false });
    }
  }
  return out.sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
}

/** The benchmark corpus at small sizes. */
function benchInputs(): CorpusInput[] {
  const out: CorpusInput[] = [];
  for (const i of [0, 1, 7]) {
    out.push({ label: `bench:835:${String(i)}`, input: remit835Text(i, 3), segments: true });
    out.push({ label: `bench:837P:${String(i)}`, input: claim837PText(i, 3), segments: true });
    out.push({ label: `bench:837I:${String(i)}`, input: claim837IText(i, 3), segments: true });
    out.push({ label: `bench:270:${String(i)}`, input: inquiry270Text(i), segments: true });
    out.push({ label: `bench:271:${String(i)}`, input: eligibility271Text(i, 4), segments: true });
    out.push({ label: `bench:999:${String(i)}`, input: ack999Text(i, 2), segments: true });
    out.push({ label: `bench:275:${String(i)}`, input: attachment275Text(i, 96), segments: true });
  }
  out.push({ label: "bench:835:big", input: remit835Text(3, 40), segments: false });
  out.push({ label: "bench:837P:big", input: claim837PText(3, 40), segments: false });
  out.push({ label: "bench:837I:big", input: claim837IText(3, 40), segments: false });
  out.push({ label: "bench:275:big", input: attachment275Text(3, 9000), segments: false });
  return out;
}

/** An ISA with the given delimiters, elements padded to their fixed widths. */
function isaWith(e: string, r: string, c: string, t: string, version = "00501"): string {
  const el = [
    "ISA",
    "00",
    "          ",
    "00",
    "          ",
    "ZZ",
    "SENDER         ",
    "ZZ",
    "RECEIVER       ",
    "260601",
    "1200",
    r,
    version,
    "000000001",
    "0",
    "P",
    c,
  ];
  return el.join(e) + t;
}

/** An interchange around `body` (segments without terminators) with delimiters `e r c t`. */
function wrap(
  body: readonly string[],
  e = "*",
  r = "^",
  c = ":",
  t = "~",
  st = ["ST", "835", "0001", "005010X221A1"],
): string {
  const segs = [
    ["GS", "HP", "SENDER", "RECEIVER", "20260601", "1200", "1", "X", "005010X221A1"].join(e),
    st.join(e),
    ...body,
    ["SE", String(body.length + 2), "0001"].join(e),
    ["GE", "1", "1"].join(e),
    ["IEA", "1", "000000001"].join(e),
  ];
  return isaWith(e, r, c, t) + segs.map((s) => s + t).join("");
}

/** Documents written for the paths the allocation work touches. */
function writtenInputs(): CorpusInput[] {
  const docs: [string, string][] = [];
  const add = (label: string, text: string): void => {
    docs.push([label, text]);
  };
  // Release characters in every role and position.
  add("release:element", wrap(["NM1*QC*1*DOE?*ROE*JANE"]));
  add("release:double", wrap(["NM1*QC*1*DOE??*JANE*A??"]));
  add("release:component", wrap(["SVC*HC?:99213:25*100.00*80.00", "HI*ABK?:J45:X*ABF:I10?^Z"]));
  add("release:repetition", wrap(["EB*1**30?^1^35*HM", "REF*EA*A^B?^C^?D"]));
  add("release:terminator", wrap(["NTE*ADD*ESCAPED?~TERMINATOR*X", "REF*EA*A?~"]));
  add("release:dangling", wrap(["REF*EA*TRAILING?", "REF*EA*TWO??", "REF*EA*THREE???"]));
  add("release:dangling-mid", wrap(["REF*EA?*X?", "NM1*QC*1*A?:*B?^*C?"]));
  add("release:other", wrap(["MSG*QUESTION?A?B?*C?", "MSG*?", "MSG*??*?"]));
  add("release:last", `${wrap(["REF*EA*X"])}REF*EA*TAIL?`);
  add("release:empties", wrap(["CLP*****", "CLP*?**?*", "CAS*PR*1*", "AMT*", "AMT"]));
  add(
    "release:composites",
    wrap(["SVC*HC:99213:25:59:XU:GT:desc?:x*100.00*80.00**1", "CAS*CO*45*10.00*1*253*2.00*1"]),
  );
  add("release:repeats", wrap(["HI*ABK:J45^ABF:I10^ABF:E11?^9*BK:1", "HI*^^", "HI*:^:"]));
  // The 835 balance sums: terms of mixed scale, lower first, and a term that does not decode.
  const bpr =
    "BPR*I*300.50*C*ACH*CCP*01*999999999*DA*123456*1512345678**01*999999999*DA*123456*20260601";
  const remit = (cas: string, svcCas: string): string[] => [
    bpr,
    "TRN*1*12345*1512345678",
    "N1*PR*PAYER ONE",
    "N1*PE*CLINIC ONE*XX*1234567893",
    "LX*1",
    "CLP*PCN1*1*160.50*150*0*12*ICN1",
    cas,
    "SVC*HC:99213*160.50*150",
    svcCas,
    "CLP*PCN2*1*150.5*150.50*0*12*ICN2",
    "PLB*1234567893*20261231*WO:1*0",
  ];
  add("remit:mixed-scales", wrap(remit("CAS*CO*45*10**253*0.50", "CAS*CO*45*10**253*.5")));
  add("remit:undecodable-term", wrap(remit("CAS*CO*45*1O**253*0.50", "CAS*CO*45*10**253*X")));
  // Degenerate delimiter sets: a role that is the release character.
  add(
    "degenerate:element",
    wrap(["NM1?QC?1?DOE?JANE", "REF?EA?A?", "LX", "SE"], "?", "^", ":", "~"),
  );
  add("degenerate:component", wrap(["SVC*HC?99213?25*100.00", "HI*A??B"], "*", "^", "?", "~"));
  add("degenerate:repetition", wrap(["EB*1**30?1?35", "REF*A??B"], "*", "?", ":", "~"));
  add(
    "degenerate:component-tail",
    wrap(["REF*EA*A?", "SVC*HC?1?*9", "HI*AB?"], "*", "^", "?", "~"),
  );
  add(
    "degenerate:repetition-tail",
    wrap(["REF*EA*B?", "EB*1**30?", "HI*A?^?"], "*", "?", ":", "~"),
  );
  // An input that ends inside a segment whose last element ends in a lone release character: the
  // one place a parsed element can end in `?`, in each role `?` can be declared in.
  for (const [role, r, c] of [
    ["component", "^", "?"],
    ["repetition", "?", ":"],
  ] as const) {
    add(
      `degenerate:${role}-eof`,
      `${isaWith("*", r, c, "~")}GS*HP*S*R*D*T*1*X*V~ST*835*1~REF*EA*A${r}B${c}C?`,
    );
  }
  // A segment that opens on the separator itself, outside every transaction set.
  add(
    "degenerate:element-leading",
    `${isaWith("?", "^", ":", "~")}?X~GS?HP?S?R?D?T?1?X?V~?Y~GE?0?1~?~IEA?1?000000001~`,
  );
  add("degenerate:terminator", wrap(["REF*EA*X", "NM1*QC*1*DOE"], "*", "^", ":", "?"));
  add("delims:pipe", wrap(["NM1|QC|1|DOE?|X|Y", "SVC|HC>99213>25|10.00"], "|", "!", ">", "\n"));
  add("delims:crlf", wrap(["NM1*QC*1*DOE", "REF*EA*A"]).replaceAll("~", "~\r\n"));
  add("delims:lf-before", wrap(["NM1*QC*1*DOE"]).replaceAll("~", "~\n\n"));
  // Binary segments: counted, short, long, malformed lengths, delimiters and `?` inside.
  const st275 = ["ST", "275", "0001", "005010X210"];
  add("binary:bds", wrap(["BDS*B64*5*A*B:C"], "*", "^", ":", "~", st275));
  add("binary:bin", wrap(["BIN*7*A~B?C*D", "LX*1"], "*", "^", ":", "~", st275));
  add("binary:short", wrap(["BIN*9*ABC", "LX*1"], "*", "^", ":", "~", st275));
  add("binary:long", wrap(["BIN*2*ABCDE", "LX*1"], "*", "^", ":", "~", st275));
  add("binary:zero", wrap(["BIN*0*", "BIN*0", "BDS*B64*0"], "*", "^", ":", "~", st275));
  add("binary:invalid", wrap(["BIN*X*ABC", "BIN**A", "BIN", "BDS*B64", "BIN*-1*A", "BIN* 2*AB"]));
  add("binary:absent", wrap(["BIN*5", "BDS*B64*3"], "*", "^", ":", "~", st275));
  add("binary:nonoctet", wrap(["BIN*3*ĀāĂ", "LX*1"], "*", "^", ":", "~", st275));
  add("binary:release-preamble", wrap(["BDS*B?*64*3*A?B", "BIN?*3*X"], "*", "^", ":", "~", st275));
  add("binary:id-prefix", wrap(["BINX*3*ABC", "BDSA*1", "BI*1*A"], "*", "^", ":", "~", st275));
  add(
    "binary:eof",
    `${isaWith("*", "^", ":", "~")}GS*HP*S*R*20260601*1200*1*X*005010X210~ST*275*0001~BIN*50*SHORT`,
  );
  // Broken envelopes: every walker path.
  const isa = isaWith("*", "^", ":", "~");
  add("env:no-iea", `${isa}GS*HP*S*R*20260601*1200*1*X*V~ST*835*0001~BPR*I~SE*3*0001~GE*1*1~`);
  add("env:no-ge", `${isa}GS*HP*S*R*20260601*1200*1*X*V~ST*835*0001~SE*2*0001~IEA*1*000000001~`);
  add("env:no-se", `${isa}GS*HP*S*R*20260601*1200*1*X*V~ST*835*0001~BPR*I~GE*1*1~IEA*1*000000001~`);
  add(
    "env:two-gs",
    `${isa}GS*HP*S*R*D*T*1*X*V~ST*835*1~GS*HC*S*R*D*T*2*X*V~ST*837*2~SE*2*2~GE*1*2~IEA*2*000000001~`,
  );
  add(
    "env:stray",
    `${isa}GE*1*1~ST*835*1~SE*1*1~NM1*X~TA1*000000001*260601*1200*A*000~GS*HP*S*R*D*T*1*X*V~TA1*1~GE*0*1~IEA*1*000000001~`,
  );
  // Warnings raised by the decode of a segment in a later transaction set and a later group.
  add(
    "env:later-sets",
    `${isa}GS*HP*S*R*D*T*1*X*V~ST*835*1~BIN**1~SE*3*1~ST*835*2~BIN*X*1~BIN*5~SE*4*2~GE*2*1~` +
      `GS*HP*S*R*D*T*2*X*V~ST*275*3~BDS*B64*Z*A~SE*3*3~ST*275*4~BDS*B64*4~GE*2*2~IEA*2*000000001~`,
  );
  add(
    "env:st-in-st",
    `${isa}GS*HP*S*R*D*T*1*X*V~ST*835*1~BPR~ST*835*2~SE*3*2~GE*2*1~IEA*1*000000001~`,
  );
  add("env:mismatch", `${isa}GS*HP*S*R*D*T*1*X*V~ST*835*1~SE*9*2~GE*7*3~IEA*4*000000009~`);
  add("env:trailing", `${isa}IEA*0*000000001~GS*HP~garbage?`);
  add("env:trailing2", `${isa}IEA*0*000000001~\r\nISA*00~XX~`);
  add("env:ta1-only", `${isa}TA1*000000001*260601*1200*A*000~IEA*0*000000001~`);
  add(
    "env:pre5010",
    isaWith("*", "U", ":", "~", "00401") +
      "GS*HP*S*R*D*T*1*X*004010X091A1~ST*835*1~SE*2*1~GE*1*1~IEA*1*000000001~",
  );
  add("env:isa-extra", isa.replace("SENDER         ", "SEND*R         ") + "IEA*0*000000001~");
  add(
    "env:released-gs",
    `${isa}GS*HP*SEND?*ER*R?:X*D*T*1?^2*X*V?~W~ST*835*1?*2*ICR?*X~SE*2*1?*2~GE*1*1?^2~IEA*1*000000001~`,
  );
  add(
    "env:doubled-terminator",
    `${isa}GS*HP*S*R*D*T*1*X*V~~ST*835*1~~SE*2*1~GE*1*1~IEA*1*000000001~~`,
  );
  add("env:non-spec-ids", wrap(["nm1*x", "N*1", "ABCD*1", "1AB*2", "*X", "", "A"]));
  add("env:huge-id", wrap([`${"Q".repeat(40)}*1`]));
  add("env:only-isa", isa);
  add("env:short", "ISA*00");
  add("env:empty", "");
  add("env:garbage", "not an interchange at all");
  return docs.map(([label, input]) => ({ label: `written:${label}`, input, segments: true }));
}

/** Documents drawn on fixed seeds from the published arbitraries. */
function drawnInputs(): CorpusInput[] {
  const out: CorpusInput[] = [];
  const draws: [string, fc.Arbitrary<string | Buffer>, number, number][] = [
    ["clean", interchange().map((ix) => serializeX12(ix)), 1101, 80],
    ["messy", interchangeText(), 2202, 160],
    ["hostile", hostileInput(), 3303, 160],
  ];
  for (const [kind, arb, seed, runs] of draws) {
    const sample = fc.sample(arb, { seed, numRuns: runs });
    for (const [i, input] of sample.entries()) {
      out.push({
        label: `drawn:${kind}:${String(i)}`,
        input,
        segments: kind !== "hostile" || i < 40,
      });
    }
  }
  return out;
}

/** Every input of the corpus, in a fixed order. */
export function corpusInputs(): CorpusInput[] {
  return [...fixtureInputs(), ...benchInputs(), ...writtenInputs(), ...drawnInputs()];
}

// ---------------------------------------------------------------------------
// The builder specs.
// ---------------------------------------------------------------------------

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`not a decimal: ${value}`);
  return d;
}

const ENVELOPE = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "250101",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const INTERCHANGE_SPEC: InterchangeSpec = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "250101",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groups: [
    {
      functionalIdCode: "HC",
      groupControlNumber: "1",
      versionRelease: "005010X222A2",
      transactions: [
        {
          transactionSetIdCode: "837",
          transactionSetControlNumber: "0001",
          implementationConventionReference: "005010X222A2",
          segments: [
            ["BHT", "0019", "00", "REF", "20250101", "1200", "CH"],
            ["NM1", "41", "2", "A*B", "C?D", "E:F", "G^H", "I~J"],
            ["BIN", "3", "XYZ"],
          ],
        },
      ],
    },
  ],
};

const SPEC_270: Build270Spec = {
  envelope: ENVELOPE,
  informationSources: [
    {
      name: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        lastNameOrOrganizationName: "MEDPAY INSURANCE",
        idQualifier: "PI",
        idCode: "PAYER01",
      },
      receivers: [
        {
          name: {
            entityIdentifierCode: "1P",
            entityTypeQualifier: "2",
            lastNameOrOrganizationName: "ANYTOWN CLINIC",
            idQualifier: "XX",
            idCode: "1234567890",
          },
          subscribers: [
            {
              traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastNameOrOrganizationName: "DOE",
                firstName: "JANE",
                idQualifier: "MI",
                idCode: "MBR0001",
              },
              inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
            },
          ],
        },
      ],
    },
  ],
};

const SPEC_276: Build276Spec = {
  envelope: ENVELOPE,
  informationSources: [
    {
      name: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        lastNameOrOrganizationName: "MEDPAY INSURANCE",
        idQualifier: "PI",
        idCode: "PAYER01",
      },
      receivers: [
        {
          name: {
            entityIdentifierCode: "41",
            entityTypeQualifier: "2",
            lastNameOrOrganizationName: "ANYTOWN CLINIC",
            idQualifier: "46",
            idCode: "RECVR01",
          },
          providers: [
            {
              name: {
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                lastNameOrOrganizationName: "ANYTOWN CLINIC",
                idQualifier: "XX",
                idCode: "1234567890",
              },
              subscribers: [
                {
                  name: {
                    entityIdentifierCode: "IL",
                    entityTypeQualifier: "1",
                    lastNameOrOrganizationName: "DOE",
                    firstName: "JANE",
                    idQualifier: "MI",
                    idCode: "MBR0001",
                  },
                  claims: [
                    {
                      trace: { traceTypeCode: "1", referenceId: "STATUS0001" },
                      references: [{ qualifier: "1K", value: "PCN0001" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const SPEC_271: Build271Spec = {
  envelope: ENVELOPE,
  informationSources: [
    {
      entity: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        name: "MEDPAY INSURANCE",
        idQualifier: "PI",
        idCode: "00123",
      },
      receivers: [
        {
          entity: {
            entityIdentifierCode: "1P",
            entityTypeQualifier: "2",
            name: "ANYTOWN CLINIC",
            idQualifier: "XX",
            idCode: "1234567890",
          },
          subscribers: [
            {
              traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastName: "DOE",
                firstName: "JANE",
                idQualifier: "MI",
                idCode: "MBR0001",
              },
              benefits: [
                {
                  eligibilityCode: "1",
                  coverageLevelCode: "IND",
                  serviceTypeCodes: [{ code: "30" }],
                  monetaryAmount: dec("1000.00"),
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const SPEC_277: Build277Spec = {
  envelope: ENVELOPE,
  informationSources: [
    {
      entity: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        name: "MEDPAY INSURANCE",
        idQualifier: "PI",
        idCode: "00123",
      },
      receivers: [
        {
          entity: {
            entityIdentifierCode: "41",
            entityTypeQualifier: "2",
            name: "CLEARINGHOUSE",
            idQualifier: "46",
            idCode: "CH001",
          },
          providers: [
            {
              entity: {
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                name: "ANYTOWN CLINIC",
                idQualifier: "XX",
                idCode: "1234567890",
              },
              subscribers: [
                {
                  member: {
                    entityIdentifierCode: "QC",
                    entityTypeQualifier: "1",
                    lastName: "DOE",
                    firstName: "JANE",
                  },
                  claims: [
                    {
                      trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
                      statuses: [{ statuses: [{ categoryCode: "A2", statusCode: "20" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const SPEC_278_REQUEST: Build278Spec = {
  envelope: ENVELOPE,
  header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "AUTHREQ-202606" },
  utilizationManagementOrganization: {
    entityIdentifierCode: "X3",
    entityTypeQualifier: "2",
    name: "UTILIZATION REVIEW CO",
    idQualifier: "PI",
    idCode: "UMO001",
  },
  requester: {
    entityIdentifierCode: "1P",
    entityTypeQualifier: "2",
    name: "RENDERING CLINIC",
    idQualifier: "XX",
    idCode: "1234567893",
  },
  subscriber: {
    member: {
      entityIdentifierCode: "IL",
      entityTypeQualifier: "1",
      lastName: "DOE",
      firstName: "JANE",
      idQualifier: "MI",
      idCode: "MBR0001",
    },
    reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1" }],
  },
};

const SPEC_278_RESPONSE: Build278Spec = {
  ...SPEC_278_REQUEST,
  subscriber: {
    ...SPEC_278_REQUEST.subscriber,
    reviews: [
      {
        requestCategoryCode: "HS",
        certificationTypeCode: "I",
        serviceTypeCode: "1",
        decision: { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" },
      },
    ],
  },
};

const SPEC_820: Build820Spec = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: dec("250.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "PREM-202606" }],
  remittances: [
    {
      individual: {
        entityIdentifierCode: "IL",
        lastName: "DOE",
        idQualifier: "34",
        idCode: "MBR0001",
      },
      openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: dec("250.00") }],
    },
  ],
};

const SPEC_834: Build834Spec = {
  envelope: ENVELOPE,
  header: {
    transactionSetPurposeCode: "00",
    sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
    payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
  },
  members: [
    {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021",
      member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
      healthCoverages: [{ maintenanceTypeCode: "021", insuranceLineCode: "HLT" }],
    },
  ],
};

const SPEC_835: Build835Spec = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalActualPayment: dec("450.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
  claims: [
    {
      patientControlNumber: "PT-ACCT-001",
      claimStatusCode: "1",
      totalChargeAmount: dec("500.00"),
      totalPaymentAmount: dec("450.00"),
      patientResponsibilityAmount: dec("50.00"),
      adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
    },
  ],
};

function spec837(line: Build837ServiceLineSpec): Build837Spec {
  return {
    envelope: ENVELOPE,
    submitter: {
      entityIdentifierCode: "41",
      entityTypeQualifier: "2",
      name: "SUBMITTER ONE",
      idQualifier: "46",
      idCode: "SUB001",
    },
    receiver: {
      entityIdentifierCode: "40",
      entityTypeQualifier: "2",
      name: "RECEIVER ONE",
      idQualifier: "46",
      idCode: "REC001",
    },
    billingProviders: [
      {
        provider: {
          entityIdentifierCode: "85",
          entityTypeQualifier: "2",
          name: "BILLING CLINIC INC",
          idQualifier: "XX",
          idCode: "1234567890",
        },
        subscribers: [
          {
            info: {
              payerResponsibilityCode: "P",
              individualRelationshipCode: "18",
              claimFilingIndicator: "MB",
            },
            subscriber: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              name: "PATIENT",
              firstName: "TEST",
              idQualifier: "MI",
              idCode: "MEMBER001",
            },
            payer: {
              entityIdentifierCode: "PR",
              entityTypeQualifier: "2",
              name: "PAYER ONE",
              idQualifier: "PI",
              idCode: "PAYER01",
            },
            claims: [
              {
                claimId: "PT-ACCT-001",
                totalCharge: dec("150.00"),
                diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
                serviceLines: [line],
              },
            ],
          },
        ],
      },
    ],
  };
}

const SPEC_837P = spec837({
  variant: "P",
  procedureQualifier: "HC",
  procedureCode: "99213",
  charge: dec("150.00"),
  unitOfMeasure: "UN",
  units: dec("1"),
  diagnosisPointers: ["1"],
});

const SPEC_837I = spec837({
  variant: "I",
  revenueCode: "0120",
  procedureQualifier: "HC",
  procedureCode: "99221",
  charge: dec("150.00"),
  unitOfMeasure: "UN",
  units: dec("1"),
});

const SPEC_837D = spec837({
  variant: "D",
  procedureQualifier: "AD",
  procedureCode: "D2391",
  charge: dec("150.00"),
  units: dec("1"),
});

const SPEC_999: Build999Spec = {
  envelope: ENVELOPE,
  functionalGroup: {
    functionalIdCode: "HC",
    groupControlNumber: "1",
    versionRelease: "005010X222A2",
    disposition: "A",
    numberOfTransactionSets: 1,
    numberOfReceivedTransactionSets: 1,
    numberOfAcceptedTransactionSets: 1,
    transactionResponses: [
      { transactionSetIdCode: "837", transactionSetControlNumber: "0001", disposition: "A" },
    ],
  },
};

const SPEC_TA1: BuildTA1Spec = {
  interchangeControlNumber: "000000001",
  interchangeDate: "250101",
  interchangeTime: "1200",
  ackCode: "A",
  noteCode: "000",
};

const SPEC_277_RFAI: Build277RfaiSpec = {
  envelope: ENVELOPE,
  header: { hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08" },
  levels: [
    {
      levelCode: "20",
      requests: [
        {
          trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
          statuses: [
            { codes: [{ categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" }] },
          ],
        },
      ],
    },
  ],
};

const SPEC_275: Build275Spec = {
  envelope: ENVELOPE,
  lines: [{ attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }] }],
};

/** Free-text keys whose values a variant fills with every delimiter and the release character. */
const TEXT_KEYS = new Set([
  "name",
  "lastName",
  "firstName",
  "lastNameOrOrganizationName",
  "referenceId",
  "value",
  "patientControlNumber",
  "claimId",
  "idCode",
  "data",
]);

/** A copy of `spec` with each free-text value replaced by `text(value)`. */
function retext(spec: unknown, text: (value: string) => string): unknown {
  if (Array.isArray(spec)) return spec.map((v: unknown) => retext(v, text));
  if (spec instanceof X12Decimal || spec === null || typeof spec !== "object") return spec;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(spec)) {
    out[k] = typeof v === "string" && TEXT_KEYS.has(k) ? text(v) : retext(v, text);
  }
  return out;
}

/** A copy of `spec` with its envelope's delimiters replaced. */
function withDelimiters(spec: unknown, delimiters: Record<string, string>): unknown {
  const s = spec as { envelope?: Record<string, unknown> };
  if (s.envelope === undefined) return { ...(spec as object), ...delimiters };
  return { ...s, envelope: { ...s.envelope, ...delimiters } };
}

/** One builder call of the corpus. */
export interface CorpusBuild {
  readonly label: string;
  readonly build: () => unknown;
}

type Builder = (spec: never) => unknown;

/** Every builder on every spec of the corpus, and on variants of each. */
export function corpusBuilds(): CorpusBuild[] {
  const builders: [string, Builder, unknown][] = [
    ["buildInterchange", buildInterchange, INTERCHANGE_SPEC],
    ["build270", build270, SPEC_270],
    ["build271", build271, SPEC_271],
    ["build275", build275, SPEC_275],
    ["build276", build276, SPEC_276],
    ["build277", build277, SPEC_277],
    ["build277CA", build277CA, SPEC_277],
    ["build277RFAI", build277RequestForAdditionalInformation, SPEC_277_RFAI],
    ["build278Request", build278Request, SPEC_278_REQUEST],
    ["build278Response", build278Response, SPEC_278_RESPONSE],
    ["build820", build820, SPEC_820],
    ["build834", build834, SPEC_834],
    ["build835", build835, SPEC_835],
    ["build837P", build837P, SPEC_837P],
    ["build837I", build837I, SPEC_837I],
    ["build837D", build837D, SPEC_837D],
    ["build999", build999, SPEC_999],
    ["buildTA1", buildTA1, SPEC_TA1],
  ];
  const variants: [string, (spec: unknown) => unknown][] = [
    ["plain", (s) => s],
    ["specials", (s) => retext(s, (v) => `${v}*A?B:C^D~E??`)],
    ["trailing-release", (s) => retext(s, (v) => `${v}?`)],
    ["control", (s) => retext(s, (v) => `${v}\u0007\r\n`)],
    ["latin1", (s) => retext(s, (v) => `${v}éĀ`)],
    ["empty", (s) => retext(s, () => "")],
    ["number", (s) => retext(s, () => 7 as unknown as string)],
    [
      "pipes",
      (s) =>
        withDelimiters(
          retext(s, (v) => `${v}|!>\n`),
          {
            elementSeparator: "|",
            repetitionSeparator: "!",
            componentSeparator: ">",
            segmentTerminator: "\n",
          },
        ),
    ],
    ["release-component", (s) => withDelimiters(s, { componentSeparator: "?" })],
    [
      "same-delimiters",
      (s) => withDelimiters(s, { elementSeparator: "~", segmentTerminator: "~" }),
    ],
    ["long-control", (s) => withDelimiters(s, { interchangeControlNumber: "0123456789" })],
  ];
  const out: CorpusBuild[] = [];
  for (const [name, builder, spec] of builders) {
    for (const [variant, make] of variants) {
      out.push({ label: `${name}:${variant}`, build: () => builder(make(spec) as never) });
    }
  }
  // The benchmark specs, each built from its index, and an interchange spec drawn on a fixed seed.
  for (const i of [0, 4]) {
    out.push({ label: `bench:835:${String(i)}`, build: () => build835(remit835Spec(dec, i, 3)) });
    out.push({
      label: `bench:837P:${String(i)}`,
      build: () => build837P(claim837PSpec(dec, i, 3)),
    });
    out.push({
      label: `bench:837I:${String(i)}`,
      build: () => build837I(claim837ISpec(dec, i, 3)),
    });
    out.push({ label: `bench:270:${String(i)}`, build: () => build270(inquiry270Spec(dec, i)) });
    out.push({
      label: `bench:271:${String(i)}`,
      build: () => build271(eligibility271Spec(dec, i, 4)),
    });
    out.push({ label: `bench:999:${String(i)}`, build: () => build999(ack999Spec(dec, i, 2)) });
    out.push({
      label: `bench:275:${String(i)}`,
      build: () => build275(attachment275Spec(dec, i, 300)),
    });
  }
  for (const [i, spec] of fc.sample(interchangeSpec(), { seed: 4404, numRuns: 60 }).entries()) {
    out.push({ label: `drawn:interchange:${String(i)}`, build: () => buildInterchange(spec) });
  }
  for (const [label, spec] of writtenInterchangeSpecs()) {
    out.push({ label: `written:interchange:${label}`, build: () => buildInterchange(spec) });
  }
  return out;
}

/** One transaction set of `segments` inside one group, for the written interchange specs. */
function oneTransaction(
  segments: readonly (readonly string[])[],
  extra: Partial<InterchangeSpec> = {},
): InterchangeSpec {
  return {
    ...INTERCHANGE_SPEC,
    ...extra,
    groups: [
      {
        functionalIdCode: "HC",
        groupControlNumber: "1",
        versionRelease: "005010X222A2",
        transactions: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            implementationConventionReference: "005010X222A2",
            segments,
          },
        ],
      },
    ],
  };
}

/**
 * Interchange specs whose built bytes hold no release character, written for how a builder turns
 * what it emits into the interchange it returns: envelope segment names inside a body, segment
 * names a line break opens, binary segments, empty and trailing elements, names outside the
 * grammar, an older version, several groups and transaction sets, and other delimiter sets.
 */
function writtenInterchangeSpecs(): [string, InterchangeSpec][] {
  return [
    [
      "envelope-names-in-body",
      oneTransaction([
        ["REF", "EA", "BEFORE"],
        ["SE", "3", "0001"],
        ["REF", "EA", "BETWEEN"],
        ["ST", "837", "0002"],
        ["GE", "1", "1"],
        ["TA1", "000000001", "250101", "1200", "A", "000"],
        ["GS", "HC", "A", "B", "20250101", "1200", "2", "X", "005010X222A2"],
        ["IEA", "1", "000000001"],
        ["REF", "EA", "AFTER"],
      ]),
    ],
    ["iea-in-body", oneTransaction([["IEA", "1", "000000001"]])],
    ["se-in-body", oneTransaction([["SE", "9", "0001"]])],
    ["ge-in-body", oneTransaction([["GE", "1", "1"]])],
    [
      "line-break-names",
      oneTransaction([["\nREF", "EA", "X"], ["\r\nNM1", "IL"], ["REF", "EA", "A\rB"], ["\r"]]),
    ],
    [
      "binary",
      oneTransaction([
        ["BIN", "3", "XYZ"],
        ["BIN", "9", "XYZ"],
        ["BIN", "", "XYZ"],
        ["BIN", "X", "XYZ"],
        ["BIN", "2"],
        ["BDS", "B64", "4", "QUJD"],
        ["BDS", "B64"],
        ["BIX", "1", "Z"],
        ["BI"],
        ["BPR", "I", "1"],
      ]),
    ],
    [
      "empty-elements",
      oneTransaction([["REF"], ["REF", ""], ["REF", "", "", ""], ["N3", "A", "", "B"], ["N4", ""]]),
    ],
    [
      "names-outside-grammar",
      oneTransaction([["ref", "x"], ["TOOLONG", "x"], ["1AB", "x"], ["A", "x"], ["N1:X", "x"]]),
    ],
    ["version-00401", oneTransaction([["REF", "EA", "X"]], { version: "00401" })],
    [
      "pipes",
      oneTransaction([["REF", "EA", "A*B~C:D^E"]], {
        elementSeparator: "|",
        repetitionSeparator: "!",
        componentSeparator: ">",
        segmentTerminator: "#",
      }),
    ],
    [
      "carriage-return-name-under-another-terminator",
      oneTransaction([["\rREF", "EA", "X"], ["REF", "EA", "X"]], { segmentTerminator: "#" }),
    ],
    [
      "several",
      {
        ...INTERCHANGE_SPEC,
        groups: [
          {
            functionalIdCode: "HC",
            groupControlNumber: "1",
            versionRelease: "005010X222A2",
            transactions: [
              { transactionSetIdCode: "837", transactionSetControlNumber: "0001", segments: [] },
              {
                transactionSetIdCode: "837",
                transactionSetControlNumber: "0002",
                segments: [["BHT", "0019"], ["REF", "EA", "X"]],
              },
            ],
          },
          { functionalIdCode: "HP", groupControlNumber: "2", versionRelease: "X", transactions: [] },
          {
            functionalIdCode: "HB",
            groupControlNumber: "3",
            versionRelease: "005010X279A1",
            applicationSenderCode: "APP",
            groupDate: "20250102",
            responsibleAgencyCode: "T",
            transactions: [
              { transactionSetIdCode: "271", transactionSetControlNumber: "9", segments: [["BHT"]] },
            ],
          },
        ],
      },
    ],
  ];
}

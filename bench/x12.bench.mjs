// Benchmarks for @cosyte/x12, on @cosyte/bench, against the built entry a consumer imports.
//
// A reading of this build (throughput, latency p50/p95/p99, allocations, peak heap, a long run for
// leaks, and the cold import with every file it loads and its gzip size):
//   pnpm build && pnpm bench:reading --out bench-results/reading.json
// A base against head comparison, the base built in another checkout:
//   pnpm bench:compare --base <base checkout>/dist/index.mjs --head dist/index.mjs
// A CPU and heap profile of the hottest paths: pnpm build && pnpm bench:profile
//
// On a pull request CI runs the comparison in its bench-compare job, and the bench workflow takes a
// reading and a profile on a GitHub-hosted runner. Both are advisory: they post numbers and fail
// nothing until a calibration on that runner class shows false alarms under 1%.
//
// The suite is handed the module under test rather than importing it, so one file measures both
// builds. Every document is synthetic and built in code from an index by `corpus.mjs`: no file is
// read, and every name, identifier and amount is made up.

import { defineBenchmark, defineSuite } from "@cosyte/bench";

import {
  ack277CASpec,
  ack277CAText,
  ack997Spec,
  ack997Text,
  ack999Spec,
  ack999Text,
  attachment275Spec,
  attachment275Text,
  claim837DSpec,
  claim837DText,
  claim837ISpec,
  claim837IText,
  claim837PSpec,
  claim837PText,
  eligibility271Spec,
  eligibility271Text,
  enrollment834Spec,
  enrollment834Text,
  inquiry270Spec,
  inquiry270Text,
  inquiry276Spec,
  inquiry276Text,
  premium820Spec,
  premium820Text,
  remit835Spec,
  remit835Text,
  request277Spec,
  request277Text,
  review278RequestSpec,
  review278RequestText,
  review278ResponseSpec,
  review278ResponseText,
  status277Spec,
  status277Text,
  ta1Spec,
  ta1Text,
} from "./corpus.mjs";

const KIB = 1024;
const MIB = 1024 * KIB;

/** The first transaction set of an interchange, which every document here has exactly one of. */
function firstTransaction(ix) {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the interchange holds no transaction set");
  return tx;
}

/** The parse every shape but a batch takes. */
function defaultParse(x12, text) {
  return x12.parseX12(text);
}

/** Parse, then hand the transaction set to the typed reader `reader` names. */
function readWith(reader) {
  return (x12, text) => {
    const ix = x12.parseX12(text);
    return x12[reader](ix.delimiters, firstTransaction(ix));
  };
}

/**
 * The shapes real traffic has: the text and spec builders, the typed reader that checks a
 * document, and its builder. The smallest size is what a feed carries all day; the largest is past
 * any file a sender means to send. A label carries the size of one document.
 *
 * The pull request comparison runs only the smallest size, and only the operations a shape's
 * `compared` names; a reading measures every case. A comparison runs each case 12 times on each
 * side in a fresh process inside a 600 second budget: all 21 small cases took about 45 seconds a
 * round on a fast developer machine, so a hosted runner would spend the budget before the twelfth
 * round. The 10 kept are the parse, read and build of the two shapes most traffic is (835 and
 * 837P), and one each of the 837I, 271, 999 and 275. The 270 and the 997, which shares the 999's
 * shape, keep none, and nor do the shapes after the 275 (276, 277, 277CA, 277RFAI, the 278 pair,
 * 820, 834, 837D and TA1): the budget has no room for them, so a reading measures them instead.
 * A call that takes a tenth of a second or more also does not settle inside the warmup's bound on
 * a hosted runner, which rules the large sizes out anyway.
 */
const SHAPES = [
  {
    // A payer's remittance: one payment, one CLP loop per claim paid, each with a service line.
    shape: "835",
    text: remit835Text,
    spec: remit835Spec,
    read: readWith("get835"),
    build: "build835",
    compared: ["parse", "read", "build"],
    sizes: [
      { label: "10 claims, 3.1 KiB", n: 10, documents: 16 },
      { label: "1,000 claims, 259 KiB", n: 1_000, documents: 1 },
      { label: "10,000 claims, 2.5 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // A professional claim batch: many claims in one transaction set, one subscriber each.
    shape: "837P",
    text: claim837PText,
    spec: claim837PSpec,
    read: readWith("get837Claims"),
    build: "build837P",
    compared: ["parse", "read", "build"],
    sizes: [
      { label: "10 claims, 2.9 KiB", n: 10, documents: 16 },
      { label: "1,000 claims, 252 KiB", n: 1_000, documents: 1 },
      { label: "10,000 claims, 2.5 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // An institutional claim batch: three revenue-coded lines a claim.
    shape: "837I",
    text: claim837IText,
    spec: claim837ISpec,
    read: readWith("get837Claims"),
    build: "build837I",
    compared: ["read"],
    sizes: [
      { label: "10 claims, 3.7 KiB", n: 10, documents: 16 },
      { label: "1,000 claims, 327 KiB", n: 1_000, documents: 1 },
      { label: "10,000 claims, 3.2 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // The real-time eligibility question: one subscriber, one inquiry.
    shape: "270",
    text: inquiry270Text,
    spec: inquiry270Spec,
    read: readWith("get270Inquiry"),
    build: "build270",
    compared: [],
    sizes: [{ label: "1 inquiry, 477 B", n: 1, documents: 64 }],
  },
  {
    // Its answer: coverage, deductibles, co-pays and limits, 30 benefit lines.
    shape: "271",
    text: eligibility271Text,
    spec: eligibility271Spec,
    read: readWith("get271Eligibility"),
    build: "build271",
    compared: ["read"],
    sizes: [{ label: "30 benefits, 1.3 KiB", n: 30, documents: 64 }],
  },
  {
    // The acknowledgment every batch gets back, the most common document in a feed.
    shape: "999",
    text: ack999Text,
    spec: ack999Spec,
    read: (x12, text) => x12.parse999(text),
    build: "build999",
    compared: ["read"],
    sizes: [{ label: "1 set, 271 B", n: 1, documents: 64 }],
  },
  {
    // The functional acknowledgment some trading partners send in place of a 999. Its shape
    // is the 999's, so the pull request comparison leaves it out and keeps its budget.
    shape: "997",
    text: ack997Text,
    spec: ack997Spec,
    read: (x12, text) => x12.parse997(text),
    build: "build997",
    compared: [],
    sizes: [{ label: "1 set, 239 B", n: 1, documents: 64 }],
  },
  {
    // An attachment: one large opaque payload in a BDS segment, the shape whose peak heap should
    // stay within a few times its size.
    shape: "275",
    text: attachment275Text,
    spec: attachment275Spec,
    read: readWith("get275Attachments"),
    build: "build275",
    compared: ["parse"],
    sizes: [
      { label: "64 KiB payload", n: 64 * KIB, documents: 4 },
      { label: "1 MiB payload", n: MIB, documents: 1 },
      { label: "4 MiB payload", n: 4 * MIB, documents: 1 },
    ],
  },
  {
    // A practice asking a payer where its claims stand: one inquiry per claim, each under its own
    // subscriber.
    shape: "276",
    text: inquiry276Text,
    spec: inquiry276Spec,
    read: readWith("get276StatusInquiry"),
    build: "build276",
    compared: [],
    sizes: [
      { label: "10 claims, 1.8 KiB", n: 10, documents: 16 },
      { label: "1,000 claims, 145 KiB", n: 1_000, documents: 1 },
      { label: "10,000 claims, 1.4 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // The payer's answer: one status per claim.
    shape: "277",
    text: status277Text,
    spec: status277Spec,
    read: readWith("get277Status"),
    build: "build277",
    compared: [],
    sizes: [
      { label: "10 claims, 1.7 KiB", n: 10, documents: 16 },
      { label: "1,000 claims, 134 KiB", n: 1_000, documents: 1 },
      { label: "10,000 claims, 1.3 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // The claim acknowledgment a payer returns for a batch of claims: the 277's shape on its own
    // guide, read by its own reader.
    shape: "277CA",
    text: ack277CAText,
    spec: ack277CASpec,
    read: readWith("get277CADisposition"),
    build: "build277CA",
    compared: [],
    sizes: [
      { label: "10 claims, 1.7 KiB", n: 10, documents: 16 },
      { label: "1,000 claims, 134 KiB", n: 1_000, documents: 1 },
      { label: "10,000 claims, 1.3 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // A payer's request for additional information: one attachment asked for per claim, each
    // under its own patient.
    shape: "277RFAI",
    text: request277Text,
    spec: request277Spec,
    read: readWith("get277RequestForAdditionalInformation"),
    build: "build277RequestForAdditionalInformation",
    compared: [],
    sizes: [
      { label: "10 claims, 1.8 KiB", n: 10, documents: 16 },
      { label: "1,000 claims, 150 KiB", n: 1_000, documents: 1 },
      { label: "10,000 claims, 1.5 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // A request for review: one patient event, the services asked for under it.
    shape: "278 request",
    text: review278RequestText,
    spec: review278RequestSpec,
    read: readWith("get278Request"),
    build: "build278Request",
    compared: [],
    sizes: [
      { label: "10 services, 1.2 KiB", n: 10, documents: 16 },
      { label: "1,000 services, 70 KiB", n: 1_000, documents: 1 },
      { label: "10,000 services, 703 KiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // Its response: a decision on the event and on every service.
    shape: "278 response",
    text: review278ResponseText,
    spec: review278ResponseSpec,
    read: readWith("get278Response"),
    build: "build278Response",
    compared: [],
    sizes: [
      { label: "10 services, 1.4 KiB", n: 10, documents: 16 },
      { label: "1,000 services, 87 KiB", n: 1_000, documents: 1 },
      { label: "10,000 services, 878 KiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // An employer's premium payment: one remittance per member.
    shape: "820",
    text: premium820Text,
    spec: premium820Spec,
    read: readWith("get820Payments"),
    build: "build820",
    compared: [],
    sizes: [
      { label: "10 members, 1.0 KiB", n: 10, documents: 16 },
      { label: "1,000 members, 69 KiB", n: 1_000, documents: 1 },
      { label: "10,000 members, 684 KiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // An enrollment file: one member loop per subscriber added. Its members are read through an
    // async iterator, and a benchmark here times a call that returns its result, so the 834 has
    // no read case: its parse and its build are measured, and the read is held by the large 834
    // test in test/transactions-enrollment-834.test.ts.
    shape: "834",
    text: enrollment834Text,
    spec: enrollment834Spec,
    build: "build834",
    compared: [],
    sizes: [
      { label: "10 members, 2.2 KiB", n: 10, documents: 16 },
      { label: "1,000 members, 184 KiB", n: 1_000, documents: 1 },
      { label: "10,000 members, 1.8 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // A dental claim batch: one tooth-coded line a claim.
    shape: "837D",
    text: claim837DText,
    spec: claim837DSpec,
    read: readWith("get837Claims"),
    build: "build837D",
    compared: [],
    sizes: [
      { label: "10 claims, 2.5 KiB", n: 10, documents: 16 },
      { label: "1,000 claims, 210 KiB", n: 1_000, documents: 1 },
      { label: "10,000 claims, 2.1 MiB", n: 10_000, documents: 1 },
    ],
  },
  {
    // The interchange acknowledgment: one fixed segment in an interchange of its own, so a size is
    // a batch of them, each parsed, read or built in turn, and its label the bytes of the batch.
    // `buildTA1` writes the segment, not the envelope around it, so the build case writes the TA1
    // segments of the batch.
    shape: "TA1",
    text: (i, n) => Array.from({ length: n }, (_v, k) => ta1Text(i * n + k)),
    spec: (dec, i, n) => Array.from({ length: n }, (_v, k) => ta1Spec(dec, i * n + k)),
    written: (i, n) =>
      Array.from({ length: n }, (_v, k) => ta1Text(i * n + k).match(/TA1\*[^~]*~/)[0]).join(""),
    parse: (x12, batch) => batch.map((text) => x12.parseX12(text)),
    weighParse: (interchanges) => interchanges.length,
    read: (x12, batch) => batch.filter((text) => x12.parseTA1(x12.parseX12(text))).length,
    build: (x12, batch) => batch.map((spec) => `${x12.buildTA1(spec).raw}~`).join(""),
    compared: [],
    sizes: [
      { label: "1 acknowledgment, 154 B", n: 1, documents: 64 },
      { label: "100 acknowledgments, 15 KiB", n: 100, documents: 1 },
      { label: "1,000 acknowledgments, 150 KiB", n: 1_000, documents: 1 },
    ],
  },
];

/** The bytes of one input: a text, or a batch of them. */
function byteLength(input) {
  return Array.isArray(input)
    ? input.reduce((n, text) => n + Buffer.byteLength(text), 0)
    : Buffer.byteLength(input);
}

/** The texts of one size, built once per process, and the bytes of all of them. */
function texts(shape, size) {
  const inputs = Array.from({ length: size.documents }, (_, i) => shape.text(i, size.n));
  return { inputs, bytes: inputs.reduce((n, input) => n + byteLength(input), 0) };
}

/** The bytes a shape's builder writes at one size: its texts, unless the shape names them. */
function writtenBytes(shape, size) {
  if (shape.written === undefined) return texts(shape, size).bytes;
  let bytes = 0;
  for (let i = 0; i < size.documents; i++) bytes += Buffer.byteLength(shape.written(i, size.n));
  return bytes;
}

/** Whether the pull request comparison runs operation `op` of `shape` at its `k`th size. */
function compared(shape, op, k) {
  return k === 0 && shape.compared.includes(op);
}

/** The sizes of one shape as @cosyte/bench takes them, each corpus a set of texts. */
function textSizes(shape, op) {
  return shape.sizes.map((size, k) => ({
    label: size.label,
    compare: compared(shape, op, k),
    build: () => texts(shape, size),
  }));
}

/**
 * The sizes of one shape for its builder. A builder takes `X12Decimal` values of the module under
 * test, which a corpus is built before it is handed, so each input is a document's index and the
 * bound function makes its spec on first use and keeps it (see `bindBuild`). A spec, built and
 * serialized, is its text byte for byte, or what the shape's `written` names
 * (`test/perf/bench-corpus.test.ts`), so `bytes` is the size of what the builder writes.
 */
function specSizes(shape) {
  return shape.sizes.map((size, k) => ({
    label: size.label,
    compare: compared(shape, "build", k),
    build: () => ({
      inputs: Array.from({ length: size.documents }, (_, i) => ({ index: i, n: size.n })),
      bytes: writtenBytes(shape, size),
    }),
  }));
}

/** The module's decimal reader, refusing what it cannot read. */
function decimalReader(x12) {
  return (value) => {
    const d = x12.X12Decimal.fromString(value);
    if (d === undefined) throw new Error("a corpus amount is not an X12 decimal");
    return d;
  };
}

/**
 * Build, then serialize. The spec is made on the first call for an input and kept, and the warmup
 * always makes that call before anything is measured, so a timed call builds and serializes only.
 */
function bindBuild(shape) {
  return (x12) => {
    const dec = decimalReader(x12);
    const specs = new Map();
    return (input) => {
      let spec = specs.get(input);
      if (spec === undefined) {
        spec = shape.spec(dec, input.index, input.n);
        specs.set(input, spec);
      }
      return typeof shape.build === "function"
        ? shape.build(x12, spec)
        : x12.serializeX12(x12[shape.build](spec));
    };
  };
}

export default defineSuite({
  name: "@cosyte/x12",
  benchmarks: SHAPES.flatMap((shape) => [
    defineBenchmark({
      // The lenient envelope and segment parse every caller starts with.
      name: `${shape.shape}: parseX12`,
      sizes: textSizes(shape, "parse"),
      bind: (x12) => (input) => (shape.parse ?? defaultParse)(x12, input),
      weigh: shape.weighParse ?? ((ix) => ix.groups.length),
    }),
    ...(shape.read === undefined
      ? []
      : [
          defineBenchmark({
            // Parse, then the typed reader: the loop structure, the balance checks, the code
            // lists, and every warning the reader raises. This is how the library validates a
            // document.
            name: `${shape.shape}: parseX12, then read`,
            sizes: textSizes(shape, "read"),
            bind: (x12) => (input) => shape.read(x12, input),
            weigh: (model) => (model === undefined ? 0 : 1),
          }),
        ]),
    defineBenchmark({
      // The domain builder, with every refusal it checks, then the serializer.
      name: `${shape.shape}: build, then serializeX12`,
      sizes: specSizes(shape),
      bind: bindBuild(shape),
      weigh: (text) => text.length,
    }),
  ]),
});

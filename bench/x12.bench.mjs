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
} from "./corpus.mjs";

const KIB = 1024;
const MIB = 1024 * KIB;

/** The first transaction set of an interchange, which every document here has exactly one of. */
function firstTransaction(ix) {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the interchange holds no transaction set");
  return tx;
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
 * 837P), and one each of the rest. A call that takes a tenth of a second or more also does not
 * settle inside the warmup's bound on a hosted runner, which rules the large sizes out anyway.
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
];

/** The texts of one size, built once per process, and the bytes of all of them. */
function texts(shape, size) {
  const inputs = Array.from({ length: size.documents }, (_, i) => shape.text(i, size.n));
  return { inputs, bytes: inputs.reduce((n, text) => n + Buffer.byteLength(text), 0) };
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
 * serialized, is its text byte for byte (`test/perf/bench-corpus.test.ts`), so `bytes` is the size
 * of what the builder writes.
 */
function specSizes(shape) {
  return shape.sizes.map((size, k) => ({
    label: size.label,
    compare: compared(shape, "build", k),
    build: () => ({
      inputs: Array.from({ length: size.documents }, (_, i) => ({ index: i, n: size.n })),
      bytes: texts(shape, size).bytes,
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
      return x12.serializeX12(x12[shape.build](spec));
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
      bind: (x12) => (text) => x12.parseX12(text),
      weigh: (ix) => ix.groups.length,
    }),
    defineBenchmark({
      // Parse, then the typed reader: the loop structure, the balance checks, the code lists, and
      // every warning the reader raises. This is how the library validates a document.
      name: `${shape.shape}: parseX12, then read`,
      sizes: textSizes(shape, "read"),
      bind: (x12) => (text) => shape.read(x12, text),
      weigh: (model) => (model === undefined ? 0 : 1),
    }),
    defineBenchmark({
      // The domain builder, with every refusal it checks, then the serializer.
      name: `${shape.shape}: build, then serializeX12`,
      sizes: specSizes(shape),
      bind: bindBuild(shape),
      weigh: (text) => text.length,
    }),
  ]),
});

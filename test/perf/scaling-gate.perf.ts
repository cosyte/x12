/**
 * The scaling gate for `parseX12` and for the typed reader and builder of every shape the
 * benchmarks measure (`bench/x12.bench.mjs`), from `@cosyte/test-utils/perf`, run by
 * `pnpm test:perf` and never under coverage (see `vitest.perf.config.ts`).
 *
 * It asks one question: does the cost grow faster than the input? On the count axis, 4 times the
 * documents; on the size axis, documents 4 times as large (the claims, benefit lines, acknowledged
 * sets or payload octets, or a batch of 270s 4 times as long). Each ratio must stay inside the
 * band the shared contract fixes. It does not see a constant-factor slowdown: a parser 10% slower
 * everywhere passes, and always will. The base against head comparison on a pull request
 * (`bench/x12.bench.mjs`) is the instrument for that.
 *
 * The self-check proves these fixtures are large enough for each gate to fail: the same work
 * reached quadratically (every segment found by scanning from the start of the document, or for the
 * one long segment of a 275, every piece of it vouched for by a pass over what came before) must clear
 * the ceiling at exactly these sizes. Every document is synthetic, built by `bench/corpus.mjs`.
 */

import {
  assertScalingGateFires,
  scalingGate,
  type ScalingGateOptions,
  type ScalingGateReport,
  type ScalingSelfCheckReport,
} from "@cosyte/test-utils/perf";
import { describe, expect, it } from "vitest";

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
  X12Decimal,
  build270,
  build271,
  build275,
  build835,
  build837I,
  build837P,
  build999,
  get270Inquiry,
  get271Eligibility,
  get275Attachments,
  get835,
  get837Claims,
  parse999,
  parseX12,
  serializeX12,
  type X12Interchange,
  type Build270Spec,
  type X12Remittance,
} from "../../src/index.js";

/**
 * The same text, reassembled the wrong way: each segment is found by scanning from the start of
 * the document, so the cost grows with the square of the segment count. It yields exactly the text
 * it was given, which the self-check confirms before it times anything.
 */
function reassembleQuadratic(raw: string): string {
  let count = 0;
  for (let p = raw.indexOf("~"); p !== -1; p = raw.indexOf("~", p + 1)) count++;
  const segments: string[] = [];
  for (let i = 0; i < count; i++) {
    let start = 0;
    for (let k = 0; k < i; k++) start = raw.indexOf("~", start) + 1;
    segments.push(raw.slice(start, raw.indexOf("~", start)));
  }
  return `${segments.join("~")}~`;
}

/**
 * The fastest base phase each axis must reach. The shared contract skips an axis under 4 ms; a
 * fixture that sits just over that skips at random on a busier runner, so ours stay at twice it.
 */
const MIN_BASE_PHASE_MS = 8;

/**
 * Both axes of a gate measured, each base phase at least `MIN_BASE_PHASE_MS`, and the margin
 * written to the job log: the ratio and the fastest base and scaled phase of each axis.
 */
function expectMeasured(report: ScalingGateReport): void {
  for (const axis of [report.count, report.size]) {
    // A skip is not a pass: a gate that could not measure says so here, rather than reading green.
    expect(axis.status, axis.diagnostic).toBe("measured");
    if (axis.status !== "measured") return;
    process.stdout.write(
      `[scaling gate] ${report.name}, ${axis.axis} axis: ratio ${axis.ratio.toFixed(2)}, ` +
        `base ${axis.base.min.toFixed(2)} ms, scaled ${axis.scaled.min.toFixed(2)} ms\n`,
    );
    expect(axis.base.min, axis.diagnostic).toBeGreaterThanOrEqual(MIN_BASE_PHASE_MS);
  }
}

/** A self-check's margin written to the job log, then held above 1. */
function expectFires(report: ScalingSelfCheckReport): void {
  process.stdout.write(
    `[scaling self-check] ${report.name}, ${report.axis} axis: signal ` +
      `${report.signal.toFixed(2)}, margin ${report.margin.toFixed(2)}x, clean base ` +
      `${report.cleanBaseMinMs.count.toFixed(2)} ms (count), ` +
      `${report.cleanBaseMinMs.size.toFixed(2)} ms (size)\n`,
  );
  expect(report.margin).toBeGreaterThan(1);
}

/** The one 835 in a parsed remittance interchange, read. */
function read835(ix: X12Interchange): X12Remittance {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the interchange holds no transaction set");
  const remit = get835(ix.delimiters, tx);
  if (remit === undefined) throw new Error("not an 835");
  return remit;
}

/** Both phases, and the self-check, use exactly these fixtures. */
const parseOptions: ScalingGateOptions<string, X12Interchange> = {
  name: "@cosyte/x12 parseX12",
  parse: (raw) => parseX12(raw),
  weigh: (ix) => ix.groups.length,
  count: { n: 1_000, generate: (i) => remit835Text(i, 4) },
  // Ten 150-claim remittances parsed in about 6 ms on a hosted runner, under the 8 ms floor.
  size: { inputs: 20, size: 150, generate: (i, claims) => remit835Text(i, claims) },
};

const readOptions: ScalingGateOptions<string, X12Remittance> = {
  name: "@cosyte/x12 parseX12, then get835",
  parse: (raw) => read835(parseX12(raw)),
  weigh: (remit) => remit.claims.length,
  count: { n: 1_000, generate: (i) => remit835Text(i, 4) },
  size: { inputs: 10, size: 150, generate: (i, claims) => remit835Text(i, claims) },
};

describe("the scaling gate: parseX12", () => {
  it("has not acquired a complexity regression on either axis", () => {
    expectMeasured(scalingGate(parseOptions));
  });

  it("has fixtures large enough for that gate to fail", () => {
    const report = assertScalingGateFires(parseOptions, {
      regressedParse: (raw) => parseX12(reassembleQuadratic(raw)),
      equals: (a, b) => serializeX12(a) === serializeX12(b),
    });
    expectFires(report);
  });
});

describe("the scaling gate: parseX12, then get835", () => {
  it("has not acquired a complexity regression on either axis", () => {
    expectMeasured(scalingGate(readOptions));
  });

  it("has fixtures large enough for that gate to fail", () => {
    const report = assertScalingGateFires(readOptions, {
      regressedParse: (raw) => read835(parseX12(reassembleQuadratic(raw))),
      equals: (a, b) =>
        a.claims.length === b.claims.length &&
        a.payment.totalActualPayment?.toString() === b.payment.totalActualPayment?.toString(),
    });
    expectFires(report);
  });
});

/**
 * `parseX12` on long documents. The gates above read 150-claim remittances, where a cost that
 * grows with the square of the input is still small beside the linear work, and one got past them:
 * the segment splitter searched for the next release character from each segment to the end of an
 * input that held none, so a 10,000-claim remittance took 2 s to parse instead of 150 ms while the
 * 150-claim gate read under its ceiling. At 800 claims the same search reads above the ceiling, and
 * the linear parse stays well inside it.
 */
const longParseOptions: ScalingGateOptions<string, X12Interchange> = {
  name: "@cosyte/x12 parseX12, long documents",
  parse: (raw) => parseX12(raw),
  weigh: (ix) => ix.groups.length,
  // 200 small documents parsed in under 6 ms on a hosted runner, under the 8 ms floor.
  count: { n: 600, generate: (i) => remit835Text(i, 4) },
  size: { inputs: 4, size: 800, generate: (i, claims) => remit835Text(i, claims) },
};

describe("the scaling gate: parseX12 on long documents", () => {
  it("has not acquired a complexity regression on either axis", () => {
    expectMeasured(scalingGate(longParseOptions));
  });
});

// ---------------------------------------------------------------------------------------------
// Every other typed reader and every builder the bench measures, at the shapes it measures.
// ---------------------------------------------------------------------------------------------

/** The module's decimal reader, refusing what it cannot read. */
function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error("a corpus amount is not an X12 decimal");
  return d;
}

/** The first transaction set of a parsed interchange. */
function firstTransaction(
  ix: X12Interchange,
): NonNullable<X12Interchange["groups"][0]>["transactions"][0] {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the interchange holds no transaction set");
  return tx;
}

/**
 * What a reader returned, as a number: the size of the model it read. A reader that refuses the
 * document, or warns of it, would put the gate on an error path rather than the traffic it is
 * named for, so either throws here.
 */
function counted(model: { readonly warnings: readonly unknown[] } | undefined, n: number): number {
  if (model === undefined) throw new Error("the reader refused a corpus document");
  if (model.warnings.length > 0) throw new Error("a corpus document read with a warning");
  return n;
}

/** The same text, reassembled the wrong way round a payload: its cost grows with the square of its length. */
function reassembleQuadraticChars(raw: string): string {
  const chunk = 2_048;
  const pieces: string[] = [];
  for (let start = 0; start < raw.length; start += chunk) {
    // Each piece is vouched for by a pass over everything before it.
    let h = 0;
    for (let p = 0; p < start; p++) h = (h + raw.charCodeAt(p)) | 0;
    pieces.push(h === 0.5 ? "" : raw.slice(start, start + chunk));
  }
  return pieces.join("");
}

/** A gate over one operation: a reader (text in, size of the model out) or a builder (spec in, text out). */
interface Operation<TInput, TResult> {
  readonly name: string;
  readonly run: (input: TInput) => TResult;
  readonly weigh: (result: TResult) => number;
  readonly count: { readonly n: number; readonly generate: (i: number) => TInput };
  readonly size: {
    readonly inputs: number;
    readonly size: number;
    readonly generate: (i: number, size: number) => TInput;
  };
  /** The same work reached quadratically, which must give the same result. */
  readonly regressed: (input: TInput) => TResult;
}

function gate<TInput, TResult>(op: Operation<TInput, TResult>): void {
  const options: ScalingGateOptions<TInput, TResult> = {
    name: op.name,
    parse: op.run,
    weigh: op.weigh,
    count: op.count,
    size: op.size,
  };
  describe(`the scaling gate: ${op.name}`, () => {
    it("has not acquired a complexity regression on either axis", () => {
      expectMeasured(scalingGate(options));
    });

    it("has fixtures large enough for that gate to fail", () => {
      const report = assertScalingGateFires(options, {
        regressedParse: op.regressed,
        equals: (a, b) => Object.is(a, b),
      });
      expectFires(report);
    });
  });
}

/**
 * What a gate may set beside its sizes: the documents on the count axis (1,000 unless set), the
 * documents on the size axis (10 unless set), and the quadratic reassembly its self-check uses.
 */
interface GateTuning {
  readonly countN?: number;
  readonly inputs?: number;
  readonly reassemble?: (raw: string) => string;
}

/** A reader gate over a document family whose text grows with `size`. */
function readerGate(
  name: string,
  text: (i: number, size: number) => string,
  countSize: number,
  size: number,
  read: (raw: string) => number,
  { countN = 1_000, inputs = 10, reassemble = reassembleQuadratic }: GateTuning = {},
): void {
  gate<string, number>({
    name,
    run: read,
    weigh: (n) => n,
    count: { n: countN, generate: (i) => text(i, countSize) },
    size: { inputs, size, generate: (i, s) => text(i, s) },
    regressed: (raw) => read(reassemble(raw)),
  });
}

/** A builder gate: build, then serialize, as the bench measures it. */
function builderGate<TSpec>(
  name: string,
  spec: (i: number, size: number) => TSpec,
  build: (spec: TSpec) => X12Interchange,
  countSize: number,
  size: number,
  { countN = 1_000, inputs = 10, reassemble = reassembleQuadratic }: GateTuning = {},
): void {
  const run = (s: TSpec): string => serializeX12(build(s));
  gate<TSpec, string>({
    name,
    run,
    weigh: (text) => text.length,
    count: { n: countN, generate: (i) => spec(i, countSize) },
    size: { inputs, size, generate: (i, s) => spec(i, s) },
    regressed: (s) => reassemble(run(s)),
  });
}

/** Parse, then hand the first transaction set to a typed reader. */
function viaParse(read: (ix: X12Interchange) => number): (raw: string) => number {
  return (raw) => read(parseX12(raw));
}

builderGate(
  "@cosyte/x12 build835, then serializeX12",
  remit835Spec.bind(null, dec),
  build835,
  4,
  150,
);

readerGate(
  "@cosyte/x12 parseX12, then get837Claims (837P)",
  claim837PText,
  4,
  150,
  viaParse((ix) => {
    const sub = get837Claims(ix.delimiters, firstTransaction(ix));
    return counted(sub, sub?.claims.length ?? 0);
  }),
);
builderGate(
  "@cosyte/x12 build837P, then serializeX12",
  claim837PSpec.bind(null, dec),
  build837P,
  4,
  150,
);

readerGate(
  "@cosyte/x12 parseX12, then get837Claims (837I)",
  claim837IText,
  4,
  100,
  viaParse((ix) => {
    const sub = get837Claims(ix.delimiters, firstTransaction(ix));
    return counted(sub, sub?.claims.length ?? 0);
  }),
);
builderGate(
  "@cosyte/x12 build837I, then serializeX12",
  claim837ISpec.bind(null, dec),
  build837I,
  4,
  100,
);

// The 271: the size knob is the number of benefit lines. At 150 a quadratic read did not clear the
// ceiling and a clean build took under the 4 ms a phase needs; at 400 the build's base phase was
// about 7 ms on a hosted runner and the read's self-check margin 1.17x, so the read's axis starts
// at 800; the build at 800 took about 8 ms, so its axis starts at 1,600.
readerGate(
  "@cosyte/x12 parseX12, then get271Eligibility",
  eligibility271Text,
  30,
  800,
  viaParse((ix) => {
    const response = get271Eligibility(ix.delimiters, firstTransaction(ix));
    return counted(response, response?.subscribers[0]?.benefits.length ?? 0);
  }),
);
builderGate(
  "@cosyte/x12 build271, then serializeX12",
  eligibility271Spec.bind(null, dec),
  build271,
  30,
  1_600,
);

// The 999: the size knob is the number of transaction sets acknowledged. At 600 the base phases
// were under 10 ms on a hosted runner, so the size axis starts at 1,200; 1,000 one-set 999s read
// in under 8 ms and built in about 11, so both count axes take 2,000.
readerGate(
  "@cosyte/x12 parse999",
  ack999Text,
  1,
  1_200,
  (raw) => {
    const ack = parse999(raw);
    return counted(ack, ack?.transactionResponses.length ?? 0);
  },
  { countN: 2_000 },
);
builderGate(
  "@cosyte/x12 build999, then serializeX12",
  ack999Spec.bind(null, dec),
  build999,
  1,
  1_200,
  { countN: 2_000 },
);

// The 275: the size knob is the octets of the one payload, a single long segment, so the
// regression reached is a scan of the whole text before each piece of it. At the bench's 64 KiB a
// clean read took about the 4 ms a phase needs, and at 128 KiB under 8 ms on a hosted runner, so
// the size axis starts at 256 KiB. Ten reads at 256 KiB took about 8 ms, so the read's size axis
// takes 20 documents: a larger payload would make its quadratic self-check far slower.
readerGate(
  "@cosyte/x12 parseX12, then get275Attachments",
  attachment275Text,
  1_024,
  256 * 1_024,
  viaParse((ix) => {
    const submission = get275Attachments(ix.delimiters, firstTransaction(ix));
    return counted(submission, submission?.attachments[0]?.data.octetCount ?? 0);
  }),
  { inputs: 20, reassemble: reassembleQuadraticChars },
);
builderGate(
  "@cosyte/x12 build275, then serializeX12",
  attachment275Spec.bind(null, dec),
  build275,
  1_024,
  256 * 1_024,
  { reassemble: reassembleQuadraticChars },
);

// The 270 is one fixed question, so its size axis is a batch of them, read or built one by one.
// This holds the cost of a batch to its length; the cost of one inquiry is the count axis. The
// self-check's regression adds the quadratic work beside the real read or build rather than
// inside it: it reassembles the joined batch the slow way, then reads or builds every inquiry as
// the clean run does. A batch of 75 took about 10 ms on a hosted runner, so a batch is 120.
gate<readonly string[], number>({
  name: "@cosyte/x12 parseX12, then get270Inquiry, over a batch",
  run: (batch) => {
    let n = 0;
    for (const raw of batch) {
      const ix = parseX12(raw);
      const inquiry = get270Inquiry(ix.delimiters, firstTransaction(ix));
      n += counted(inquiry, 1);
    }
    return n;
  },
  weigh: (n) => n,
  count: { n: 1_000, generate: (i) => [inquiry270Text(i)] },
  size: {
    inputs: 10,
    size: 120,
    generate: (i, s) => Array.from({ length: s }, (_v, k) => inquiry270Text(i * s + k)),
  },
  regressed: (batch) => {
    reassembleQuadratic(batch.join(""));
    let n = 0;
    for (const raw of batch) {
      const ix = parseX12(raw);
      n += counted(get270Inquiry(ix.delimiters, firstTransaction(ix)), 1);
    }
    return n;
  },
});
gate<readonly Build270Spec[], string>({
  name: "@cosyte/x12 build270, then serializeX12, over a batch",
  run: (batch) => batch.map((spec) => serializeX12(build270(spec))).join(""),
  weigh: (text) => text.length,
  count: { n: 1_000, generate: (i) => [inquiry270Spec(dec, i)] },
  size: {
    inputs: 10,
    size: 120,
    generate: (i, s) => Array.from({ length: s }, (_v, k) => inquiry270Spec(dec, i * s + k)),
  },
  regressed: (batch) =>
    reassembleQuadratic(batch.map((spec) => serializeX12(build270(spec))).join("")),
});

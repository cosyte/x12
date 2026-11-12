/**
 * What the two scaling gate files share (`test/perf/scaling-gate.perf.ts` and
 * `test/perf/scaling-gate-sets.perf.ts`): the quadratic reassemblies the self-checks inject, the
 * checks that a gate measured and that its self-check fired, and the reader and builder gates.
 * Each file runs in its own CI job, so neither job outgrows its time budget.
 *
 * Lives under `test/_helpers/` so it is not shipped and not collected as a test.
 * @internal
 */

import {
  assertScalingGateFires,
  scalingGate,
  type ScalingGateOptions,
  type ScalingGateReport,
  type ScalingSelfCheckReport,
} from "@cosyte/test-utils/perf";
import { describe, expect, it } from "vitest";

import { X12Decimal, parseX12, serializeX12, type X12Interchange } from "../../src/index.js";

/**
 * The same text, reassembled the wrong way: each segment is found by scanning from the start of
 * the document, so the cost grows with the square of the segment count. It yields exactly the text
 * it was given, which the self-check confirms before it times anything.
 */
export function reassembleQuadratic(raw: string): string {
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
export const MIN_BASE_PHASE_MS = 8;

/**
 * Both axes of a gate measured, each base phase at least `MIN_BASE_PHASE_MS`, and the margin
 * written to the job log: the ratio and the fastest base and scaled phase of each axis.
 */
export function expectMeasured(report: ScalingGateReport): void {
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
export function expectFires(report: ScalingSelfCheckReport): void {
  process.stdout.write(
    `[scaling self-check] ${report.name}, ${report.axis} axis: signal ` +
      `${report.signal.toFixed(2)}, margin ${report.margin.toFixed(2)}x, clean base ` +
      `${report.cleanBaseMinMs.count.toFixed(2)} ms (count), ` +
      `${report.cleanBaseMinMs.size.toFixed(2)} ms (size)\n`,
  );
  expect(report.margin).toBeGreaterThan(1);
}

/** The module's decimal reader, refusing what it cannot read. */
export function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error("a corpus amount is not an X12 decimal");
  return d;
}

/** The first transaction set of a parsed interchange. */
export function firstTransaction(
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
export function counted(
  model: { readonly warnings: readonly unknown[] } | undefined,
  n: number,
): number {
  if (model === undefined) throw new Error("the reader refused a corpus document");
  if (model.warnings.length > 0) throw new Error("a corpus document read with a warning");
  return n;
}

/** The same text, reassembled the wrong way round a payload: its cost grows with the square of its length. */
export function reassembleQuadraticChars(raw: string): string {
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
export interface Operation<TInput, TResult> {
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

export function gate<TInput, TResult>(op: Operation<TInput, TResult>): void {
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
export interface GateTuning {
  readonly countN?: number;
  readonly inputs?: number;
  readonly reassemble?: (raw: string) => string;
}

/** A reader gate over a document family whose text grows with `size`. */
export function readerGate(
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
export function builderGate<TSpec>(
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
export function viaParse(read: (ix: X12Interchange) => number): (raw: string) => number {
  return (raw) => read(parseX12(raw));
}

/**
 * The scaling gate for `parseX12` and for the 835 reader, from `@cosyte/test-utils/perf`, run by
 * `pnpm test:perf` and never under coverage (see `vitest.perf.config.ts`).
 *
 * It asks one question: does the cost grow faster than the input? On the count axis, 4 times the
 * documents; on the size axis, remittances with 4 times the claims. Each ratio must stay inside the
 * band the shared contract fixes. It does not see a constant-factor slowdown: a parser 10% slower
 * everywhere passes, and always will. The base against head comparison on a pull request
 * (`bench/x12.bench.mjs`) is the instrument for that.
 *
 * The self-check proves these fixtures are large enough for each gate to fail: the same work
 * reached quadratically (every segment found by scanning from the start of the document) must clear
 * the ceiling at exactly these sizes. Every document is synthetic, built by `bench/corpus.mjs`.
 */

import {
  assertScalingGateFires,
  scalingGate,
  type ScalingGateOptions,
} from "@cosyte/test-utils/perf";
import { describe, expect, it } from "vitest";

import { remit835Text } from "../../bench/corpus.mjs";
import {
  get835,
  parseX12,
  serializeX12,
  type X12Interchange,
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
  size: { inputs: 10, size: 150, generate: (i, claims) => remit835Text(i, claims) },
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
    const report = scalingGate(parseOptions);
    // A skip is not a pass: a gate that could not measure says so here, rather than reading green.
    expect(report.count.status, report.count.diagnostic).toBe("measured");
    expect(report.size.status, report.size.diagnostic).toBe("measured");
  });

  it("has fixtures large enough for that gate to fail", () => {
    const report = assertScalingGateFires(parseOptions, {
      regressedParse: (raw) => parseX12(reassembleQuadratic(raw)),
      equals: (a, b) => serializeX12(a) === serializeX12(b),
    });
    expect(report.margin).toBeGreaterThan(1);
  });
});

describe("the scaling gate: parseX12, then get835", () => {
  it("has not acquired a complexity regression on either axis", () => {
    const report = scalingGate(readOptions);
    expect(report.count.status, report.count.diagnostic).toBe("measured");
    expect(report.size.status, report.size.diagnostic).toBe("measured");
  });

  it("has fixtures large enough for that gate to fail", () => {
    const report = assertScalingGateFires(readOptions, {
      regressedParse: (raw) => read835(parseX12(reassembleQuadratic(raw))),
      equals: (a, b) =>
        a.claims.length === b.claims.length &&
        a.payment.totalActualPayment?.toString() === b.payment.totalActualPayment?.toString(),
    });
    expect(report.margin).toBeGreaterThan(1);
  });
});

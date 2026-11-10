/**
 * The benchmark corpus is what it says it is.
 *
 * `bench/corpus.mjs` builds every document the benchmarks and the scaling gate run on. A benchmark
 * of a document the library refuses, or reads with warnings, measures an error path rather than the
 * traffic it is named for, and nothing in a reading would say so. So each text is held here to
 * parse and read with no warning and to hold the claims, benefits or payload its size names, and
 * each spec, built and serialized, to be its text byte for byte: that is what lets a build case
 * report the bytes it writes. Then every case of `bench/x12.bench.mjs` runs once at its smallest
 * size against the source, so a suite that cannot bind or whose sink stays empty fails here rather
 * than on a runner. Every document is synthetic.
 */

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
import suite from "../../bench/x12.bench.mjs";
import * as x12 from "../../src/index.js";
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
  type X12TransactionSet,
} from "../../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`not a decimal: ${value}`);
  return d;
}

function only(ix: X12Interchange): X12TransactionSet {
  expect(ix.groups).toHaveLength(1);
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("no transaction set");
  expect(ix.groups[0]?.transactions).toHaveLength(1);
  return tx;
}

/** Parse `text`, with no warning, and return the interchange and its one transaction set. */
function clean(text: string): { ix: X12Interchange; tx: X12TransactionSet } {
  const ix = parseX12(text);
  expect(ix.warnings).toEqual([]);
  return { ix, tx: only(ix) };
}

describe("the benchmark corpus", () => {
  for (const claims of [1, 10, 250]) {
    it(`835 with ${String(claims)} claims: reads clean, in balance, and builds to its text`, () => {
      const text = remit835Text(7, claims);
      const { ix, tx } = clean(text);
      const remit = get835(ix.delimiters, tx);
      expect(remit?.warnings).toEqual([]);
      expect(remit?.claims).toHaveLength(claims);
      expect(serializeX12(build835(remit835Spec(dec, 7, claims)))).toBe(text);
    });

    it(`837P with ${String(claims)} claims: reads clean and builds to its text`, () => {
      const text = claim837PText(7, claims);
      const { ix, tx } = clean(text);
      const sub = get837Claims(ix.delimiters, tx);
      expect(sub?.warnings).toEqual([]);
      expect(sub?.variant).toBe("P");
      expect(sub?.claims).toHaveLength(claims);
      expect(serializeX12(build837P(claim837PSpec(dec, 7, claims)))).toBe(text);
    });

    it(`837I with ${String(claims)} claims: reads clean and builds to its text`, () => {
      const text = claim837IText(7, claims);
      const { ix, tx } = clean(text);
      const sub = get837Claims(ix.delimiters, tx);
      expect(sub?.warnings).toEqual([]);
      expect(sub?.variant).toBe("I");
      expect(sub?.claims).toHaveLength(claims);
      expect(sub?.claims.every((c) => c.serviceLines.length === 3)).toBe(true);
      expect(serializeX12(build837I(claim837ISpec(dec, 7, claims)))).toBe(text);
    });
  }

  it("270: reads clean and builds to its text", () => {
    const text = inquiry270Text(7);
    const { ix, tx } = clean(text);
    const inquiry = get270Inquiry(ix.delimiters, tx);
    expect(inquiry?.warnings).toEqual([]);
    expect(serializeX12(build270(inquiry270Spec(dec, 7)))).toBe(text);
  });

  it("271 with 30 benefits: reads clean, answers the 270's trace, and builds to its text", () => {
    const text = eligibility271Text(7, 30);
    const { ix, tx } = clean(text);
    const response = get271Eligibility(ix.delimiters, tx);
    expect(response?.warnings).toEqual([]);
    expect(response?.subscribers[0]?.benefits).toHaveLength(30);
    expect(response?.subscribers[0]?.traces[0]?.referenceId).toBe("TRC000007");
    expect(inquiry270Text(7)).toContain("TRN*1*TRC000007*");
    expect(serializeX12(build271(eligibility271Spec(dec, 7, 30)))).toBe(text);
  });

  for (const sets of [1, 5]) {
    it(`999 accepting ${String(sets)} sets: reads clean and builds to its text`, () => {
      const text = ack999Text(7, sets);
      clean(text);
      const ack = parse999(text);
      expect(ack?.warnings).toEqual([]);
      expect(ack?.transactionResponses).toHaveLength(sets);
      expect(serializeX12(build999(ack999Spec(dec, 7, sets)))).toBe(text);
    });
  }

  for (const bytes of [1, 4096, 65_536]) {
    it(`275 with a ${String(bytes)}-octet payload: reads clean and builds to its text`, () => {
      const text = attachment275Text(7, bytes);
      const { ix, tx } = clean(text);
      const submission = get275Attachments(ix.delimiters, tx);
      expect(submission?.warnings).toEqual([]);
      expect(submission?.attachments).toHaveLength(1);
      expect(submission?.attachments[0]?.lengthVerified).toBe(true);
      expect(submission?.attachments[0]?.data.octetCount).toBe(bytes);
      expect(serializeX12(build275(attachment275Spec(dec, 7, bytes)))).toBe(text);
    });
  }
});

describe("the benchmark suite", () => {
  it("runs every case once at its smallest size against the source", () => {
    const names = suite.benchmarks.map((b) => b.name);
    expect(names).toHaveLength(21);
    // The pull request comparison has a 600 second budget on a hosted runner: ten small cases.
    const compared = suite.benchmarks.flatMap((b) =>
      b.sizes.filter((s) => s.compare !== false).map((s) => `${b.name} @ ${s.label}`),
    );
    expect(compared).toHaveLength(10);
    for (const benchmark of suite.benchmarks) {
      const size = benchmark.sizes[0];
      if (size === undefined) throw new Error(`${benchmark.name} has no size`);
      const corpus = size.build();
      expect(corpus.inputs.length, benchmark.name).toBeGreaterThan(0);
      expect(corpus.bytes, benchmark.name).toBeGreaterThan(0);
      const call = benchmark.bind(x12);
      const weigh = benchmark.weigh ?? (() => 1);
      let sink = 0;
      for (const input of corpus.inputs) sink += weigh(call(input));
      expect(sink, benchmark.name).toBeGreaterThan(0);
    }
  });
});

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

import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

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
} from "../../bench/corpus.mjs";
import suite from "../../bench/x12.bench.mjs";
import * as x12 from "../../src/index.js";
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
  build997,
  build999,
  buildTA1,
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
  parse997,
  parse999,
  parseTA1,
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

  for (const sets of [1, 5]) {
    it(`997 accepting ${String(sets)} sets: reads clean and builds to its text`, () => {
      const text = ack997Text(7, sets);
      clean(text);
      const ack = parse997(text);
      expect(ack?.warnings).toEqual([]);
      expect(ack?.transactionResponses).toHaveLength(sets);
      expect(serializeX12(build997(ack997Spec(dec, 7, sets)))).toBe(text);
    });
  }

  it("997 of one set is the size its bench label names", () => {
    expect(Buffer.byteLength(ack997Text(0, 1))).toBe(239);
  });

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

describe("the benchmark corpus, the sets added after the 275", () => {
  for (const claims of [1, 10, 250]) {
    it(`276 asking after ${String(claims)} claims: reads clean and builds to its text`, () => {
      const text = inquiry276Text(7, claims);
      const { ix, tx } = clean(text);
      const inquiry = get276StatusInquiry(ix.delimiters, tx);
      expect(inquiry?.warnings).toEqual([]);
      const provider = inquiry?.informationSources[0]?.receivers[0]?.providers[0];
      expect(provider?.subscribers).toHaveLength(claims);
      expect(provider?.subscribers.every((s) => s.claims.length === 1)).toBe(true);
      expect(serializeX12(build276(inquiry276Spec(dec, 7, claims)))).toBe(text);
    });

    it(`277 answering ${String(claims)} claims: reads clean and builds to its text`, () => {
      const text = status277Text(7, claims);
      const { ix, tx } = clean(text);
      const status = get277Status(ix.delimiters, tx);
      expect(status?.warnings).toEqual([]);
      expect(status?.claims).toHaveLength(claims);
      expect(serializeX12(build277(status277Spec(dec, 7, claims)))).toBe(text);
    });

    it(`277CA acknowledging ${String(claims)} claims: reads clean and builds to its text`, () => {
      const text = ack277CAText(7, claims);
      const { ix, tx } = clean(text);
      const disposition = get277CADisposition(ix.delimiters, tx);
      expect(disposition?.warnings).toEqual([]);
      expect(disposition?.claims).toHaveLength(claims);
      expect(serializeX12(build277CA(ack277CASpec(dec, 7, claims)))).toBe(text);
    });

    it(`277 request for ${String(claims)} attachments: reads clean and builds to its text`, () => {
      const text = request277Text(7, claims);
      const { ix, tx } = clean(text);
      const request = get277RequestForAdditionalInformation(ix.delimiters, tx);
      expect(request?.warnings).toEqual([]);
      // The payer's level, then one patient level a claim, each asking once.
      expect(request?.levels).toHaveLength(claims + 1);
      expect(request?.levels.slice(1).every((l) => l.requests.length === 1)).toBe(true);
      const built = build277RequestForAdditionalInformation(request277Spec(dec, 7, claims));
      expect(serializeX12(built)).toBe(text);
    });

    it(`278 request and response for ${String(claims)} services: read clean and build to their texts`, () => {
      const request = review278RequestText(7, claims);
      const asked = clean(request);
      const read = get278Request(asked.ix.delimiters, asked.tx);
      expect(read?.warnings).toEqual([]);
      // The patient event, then one review a service.
      expect(read?.reviews).toHaveLength(claims + 1);
      expect(serializeX12(build278Request(review278RequestSpec(dec, 7, claims)))).toBe(request);

      const response = review278ResponseText(7, claims);
      const answered = clean(response);
      const decided = get278Response(answered.ix.delimiters, answered.tx);
      expect(decided?.warnings).toEqual([]);
      expect(decided?.reviews).toHaveLength(claims + 1);
      expect(decided?.reviews.every((r) => r.decision?.actionCode === "A1")).toBe(true);
      expect(serializeX12(build278Response(review278ResponseSpec(dec, 7, claims)))).toBe(response);
    });

    it(`820 paying for ${String(claims)} members: reads clean, in balance, and builds to its text`, () => {
      const text = premium820Text(7, claims);
      const { ix, tx } = clean(text);
      const payments = get820Payments(ix.delimiters, tx);
      expect(payments?.warnings).toEqual([]);
      expect(payments?.remittances).toHaveLength(claims);
      expect(serializeX12(build820(premium820Spec(dec, 7, claims)))).toBe(text);
    });

    it(`834 enrolling ${String(claims)} members: reads clean and builds to its text`, async () => {
      const text = enrollment834Text(7, claims);
      const { ix, tx } = clean(text);
      expect(get834Header(ix.delimiters, tx)?.warnings).toEqual([]);
      let members = 0;
      for await (const member of get834Enrollments(ix.delimiters, tx)) {
        expect(member.warnings).toEqual([]);
        expect(member.healthCoverages).toHaveLength(1);
        members += 1;
      }
      expect(members).toBe(claims);
      expect(serializeX12(build834(enrollment834Spec(dec, 7, claims)))).toBe(text);
    });

    it(`837D with ${String(claims)} claims: reads clean and builds to its text`, () => {
      const text = claim837DText(7, claims);
      const { ix, tx } = clean(text);
      const sub = get837Claims(ix.delimiters, tx);
      expect(sub?.warnings).toEqual([]);
      expect(sub?.variant).toBe("D");
      expect(sub?.claims).toHaveLength(claims);
      expect(serializeX12(build837D(claim837DSpec(dec, 7, claims)))).toBe(text);
    });
  }

  it("TA1: an interchange of its own that reads clean, and builds to its TA1 segment", () => {
    const text = ta1Text(7);
    const ix = parseX12(text);
    expect(ix.warnings).toEqual([]);
    expect(ix.groups).toEqual([]);
    expect(ix.ta1Segments).toHaveLength(1);
    const ta1 = parseTA1(ix);
    expect(ta1?.ackCode).toBe("A");
    expect(ta1?.noteCode).toBe("000");
    expect(ta1?.interchangeControlNumber).toBe("000000008");
    expect(text).toContain(`~${buildTA1(ta1Spec(dec, 7)).raw}~`);
    expect(Buffer.byteLength(text)).toBe(154);
  });
});

describe("the benchmark suite", () => {
  it("runs every case once at its smallest size against the source", () => {
    const names = suite.benchmarks.map((b) => b.name);
    // Eight shapes, three operations each: the 997 brought the last three. Then ten more: nine with
    // three operations, and the 834 with two, its members being read through an async iterator.
    expect(names).toHaveLength(24 + 9 * 3 + 2);
    expect(names).not.toContain("834: parseX12, then read");
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

/**
 * The scaling gate for the typed reader and builder of the 276, 277, 277CA, 277 request for
 * additional information, 278 request and response, 820, 834, 837D and TA1 shapes the benchmarks
 * measure (`bench/x12.bench.mjs`), from `@cosyte/test-utils/perf`, run by `pnpm test:perf:sets`
 * and never under coverage (see `vitest.perf.config.ts`). It runs in a CI job of its own beside
 * `scaling-gate.perf.ts`'s, so that neither job outgrows the 15 minutes a pull request's job is
 * given.
 *
 * The question and the method are `scaling-gate.perf.ts`'s: 4 times the documents on the count
 * axis, documents 4 times as large on the size axis (the claims, services, members or
 * acknowledgments), each ratio inside the band the shared contract fixes, and a self-check that the
 * same work reached quadratically clears the ceiling at exactly these sizes.
 *
 * Every size axis here starts at a document of about 1,500 segments or more, the size at which the
 * 835 and 837 gates' self-checks clear the ceiling with a margin of 1.7x on a hosted runner, and
 * every count axis at 1,000 documents of 4 claims, services or members unless it says otherwise.
 * Every document is synthetic, built by `bench/corpus.mjs`.
 *
 * Each base phase must last `MIN_BASE_PHASE_MS` (8 ms), and the hosted runners differ by up to
 * about 2x in speed, so a phase sized to clear it on an average runner fails on a fast one now and
 * then. Each axis is sized so that its base phase lasted about twice the floor on the fastest
 * runner we measured. Where an axis needed more time, it takes more documents (`countN`,
 * `inputs`) rather than larger ones: more documents of the same size leave the self-check's
 * margin where it was, and cost the quadratic self-check time in proportion, not in square.
 *
 * The 834's members are read through an async iterator, and the gate times a call that returns
 * its result, so the 834 has a builder gate here and no reader gate. Its read is held by the large
 * 834 test in `test/transactions-enrollment-834.test.ts`.
 */

import {
  ack277CASpec,
  ack277CAText,
  claim837DSpec,
  claim837DText,
  enrollment834Spec,
  inquiry276Spec,
  inquiry276Text,
  premium820Spec,
  premium820Text,
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
import {
  build276,
  build277,
  build277CA,
  build277RequestForAdditionalInformation,
  build278Request,
  build278Response,
  build820,
  build834,
  build837D,
  get276StatusInquiry,
  get277CADisposition,
  get277RequestForAdditionalInformation,
  get277Status,
  get278Request,
  get278Response,
  get820Payments,
  get837Claims,
  type BuildTA1Spec,
} from "../../src/index.js";
import {
  builderGate,
  counted,
  dec,
  firstTransaction,
  gate,
  readerGate,
  reassembleQuadratic,
  viaParse,
} from "../_helpers/scaling-gate.js";
import { buildTA1Batch, readTA1Batch, readTA1BatchReassembled } from "../_helpers/ta1-batch.js";

// The 276: seven segments a claim, so 220 claims is about 1,540 segments.
readerGate(
  "@cosyte/x12 parseX12, then get276StatusInquiry",
  inquiry276Text,
  4,
  220,
  viaParse((ix) => {
    const inquiry = get276StatusInquiry(ix.delimiters, firstTransaction(ix));
    return counted(inquiry, inquiry?.hierarchies.length ?? 0);
  }),
  { inputs: 15 },
);
builderGate(
  "@cosyte/x12 build276, then serializeX12",
  inquiry276Spec.bind(null, dec),
  build276,
  4,
  220,
  { inputs: 20 },
);

// The 277 and the 277CA: six segments a claim, so 250 claims is about 1,500 segments.
readerGate(
  "@cosyte/x12 parseX12, then get277Status",
  status277Text,
  4,
  250,
  viaParse((ix) => {
    const status = get277Status(ix.delimiters, firstTransaction(ix));
    return counted(status, status?.claims.length ?? 0);
  }),
  { inputs: 15 },
);
builderGate(
  "@cosyte/x12 build277, then serializeX12",
  status277Spec.bind(null, dec),
  build277,
  4,
  250,
  { inputs: 20 },
);
readerGate(
  "@cosyte/x12 parseX12, then get277CADisposition",
  ack277CAText,
  4,
  250,
  viaParse((ix) => {
    const disposition = get277CADisposition(ix.delimiters, firstTransaction(ix));
    return counted(disposition, disposition?.claims.length ?? 0);
  }),
  { inputs: 15 },
);
builderGate(
  "@cosyte/x12 build277CA, then serializeX12",
  ack277CASpec.bind(null, dec),
  build277CA,
  4,
  250,
  { inputs: 20 },
);

// The 277 request for additional information: six segments a claim, as the 277.
readerGate(
  "@cosyte/x12 parseX12, then get277RequestForAdditionalInformation",
  request277Text,
  4,
  250,
  viaParse((ix) => {
    const request = get277RequestForAdditionalInformation(ix.delimiters, firstTransaction(ix));
    return counted(request, request?.levels.length ?? 0);
  }),
  { inputs: 15 },
);
builderGate(
  "@cosyte/x12 build277RequestForAdditionalInformation, then serializeX12",
  request277Spec.bind(null, dec),
  build277RequestForAdditionalInformation,
  4,
  250,
  { inputs: 20 },
);

// The 278: four segments a service in a request and five in a response, so 400 and 320 services.
readerGate(
  "@cosyte/x12 parseX12, then get278Request",
  review278RequestText,
  4,
  400,
  viaParse((ix) => {
    const review = get278Request(ix.delimiters, firstTransaction(ix));
    return counted(review, review?.reviews.length ?? 0);
  }),
  { inputs: 15 },
);
builderGate(
  "@cosyte/x12 build278Request, then serializeX12",
  review278RequestSpec.bind(null, dec),
  build278Request,
  4,
  400,
  { inputs: 20 },
);
readerGate(
  "@cosyte/x12 parseX12, then get278Response",
  review278ResponseText,
  4,
  320,
  viaParse((ix) => {
    const review = get278Response(ix.delimiters, firstTransaction(ix));
    return counted(review, review?.reviews.length ?? 0);
  }),
  { inputs: 20 },
);
builderGate(
  "@cosyte/x12 build278Response, then serializeX12",
  review278ResponseSpec.bind(null, dec),
  build278Response,
  4,
  320,
  { inputs: 25 },
);

// The 820: two segments a member, so 750 members.
readerGate(
  "@cosyte/x12 parseX12, then get820Payments",
  premium820Text,
  4,
  750,
  viaParse((ix) => {
    const payments = get820Payments(ix.delimiters, firstTransaction(ix));
    return counted(payments, payments?.remittances.length ?? 0);
  }),
  { countN: 1_500, inputs: 15 },
);
builderGate(
  "@cosyte/x12 build820, then serializeX12",
  premium820Spec.bind(null, dec),
  build820,
  4,
  750,
  { countN: 1_500, inputs: 20 },
);

// The 834: nine segments a member, so 170 members. A builder gate only (see above).
builderGate(
  "@cosyte/x12 build834, then serializeX12",
  enrollment834Spec.bind(null, dec),
  build834,
  4,
  170,
  { inputs: 25 },
);

// The 837D: nine segments a claim, so 170 claims.
readerGate(
  "@cosyte/x12 parseX12, then get837Claims (837D)",
  claim837DText,
  4,
  170,
  viaParse((ix) => {
    const sub = get837Claims(ix.delimiters, firstTransaction(ix));
    return counted(sub, sub?.claims.length ?? 0);
  }),
);
builderGate(
  "@cosyte/x12 build837D, then serializeX12",
  claim837DSpec.bind(null, dec),
  build837D,
  4,
  170,
  { inputs: 15 },
);

// The TA1 is one fixed segment in an interchange of its own, so, as for the 270, its size axis is
// a batch of them, read or built one by one. The self-check's regression reassembles the joined
// batch the slow way and then reads or builds from what that returned: the reader's cuts the
// reassembled text back into its interchanges and reads each of them, so the read consumes the
// reassembly. A TA1 interchange is three segments, so a batch of 600 to read is 1,800 segments;
// the builder writes the TA1 segment alone, so its batch is 1,600. One TA1 costs a fraction of a
// 270 (about 3 microseconds to read and 1.3 to build on a developer machine), so the count axes
// take 10,000 and 24,000 documents.

gate<readonly string[], number>({
  name: "@cosyte/x12 parseX12, then parseTA1, over a batch",
  run: readTA1Batch,
  weigh: (n) => n,
  count: { n: 10_000, generate: (i) => [ta1Text(i)] },
  size: {
    inputs: 20,
    size: 600,
    generate: (i, s) => Array.from({ length: s }, (_v, k) => ta1Text(i * s + k)),
  },
  regressed: (batch) => readTA1BatchReassembled(batch),
});
gate<readonly BuildTA1Spec[], string>({
  name: "@cosyte/x12 buildTA1, over a batch",
  run: buildTA1Batch,
  weigh: (text) => text.length,
  count: { n: 24_000, generate: (i) => [ta1Spec(dec, i)] },
  size: {
    inputs: 15,
    size: 1_600,
    generate: (i, s) => Array.from({ length: s }, (_v, k) => ta1Spec(dec, i * s + k)),
  },
  regressed: (batch) => reassembleQuadratic(buildTA1Batch(batch)),
});

/**
 * The three properties every Cosyte parser proves, for the 278 services review request and
 * response (005010X217), on build specs generated in `./_transaction-specs.ts`:
 *
 * 1. **Round trip.** A built 278 warns about nothing, parses back to the same interchange,
 *    serializes to the same bytes again, and its typed reading carries every value the spec gave:
 *    the header, the two parties, the subscriber and dependent, and each review in order, with its
 *    decision on a response and none on a request.
 * 2. **Idempotent normalize.** For a built 278, clean or with line breaks after its segments,
 *    `serializeX12(parseX12(raw))` is a fixed point, and reading the 278 from it once or twice
 *    gives the same reading.
 * 3. **Never throws in lenient mode.** A built 278 damaged the ways a feed damages it (a byte
 *    changed, a run cut out, a segment dropped or repeated, the end cut off) is parsed, or refused
 *    with one of the four documented fatal errors, and both readers then read every transaction
 *    set without throwing, with registered warnings only.
 *
 * Each runs 100 cases by default; `COSYTE_PROPERTY_RUNS` sets the depth (the nightly run sets
 * 10,000), and a failure prints the seed and path that replay it (see `./_runner.ts`).
 */

import assert from "node:assert/strict";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  build278Request,
  build278Response,
  get278Request,
  get278Response,
  parseX12,
  serializeX12,
  type Build278ReviewSpec,
  type Build278Spec,
  type X12Interchange,
  type X12ServicesReview,
} from "../../src/index.js";

import { assertProperty, propertyTimeout } from "./_runner.js";
import {
  assertWarningsRegistered,
  damaged,
  messy,
  parseOrFatal,
  plain,
  spec278,
  transactions,
} from "./_transaction-specs.js";

/** Each test's budget, scaled to the depth `COSYTE_PROPERTY_RUNS` sets. */
const TIMEOUT = propertyTimeout();

const DIRECTIONS = [
  { direction: "request", build: build278Request, read: get278Request },
  { direction: "response", build: build278Response, read: get278Response },
] as const;

/** The one 278 a built interchange carries, read in `direction`. */
function readOnly(
  ix: X12Interchange,
  read: (typeof DIRECTIONS)[number]["read"],
): X12ServicesReview {
  const [tx] = transactions(ix);
  assert.ok(tx !== undefined, "the built interchange has no transaction set");
  const reading = read(ix.delimiters, tx);
  assert.ok(reading !== undefined, "the reader did not recognize the built 278");
  return reading;
}

/** What the reading of one review must carry: the spec's values, and empty lists for absent ones. */
function expectedReview(review: Build278ReviewSpec): unknown {
  return plain({
    requestCategoryCode: review.requestCategoryCode,
    certificationTypeCode: review.certificationTypeCode,
    serviceTypeCode: review.serviceTypeCode,
    decision: review.decision,
    traces: review.traces ?? [],
    diagnoses: review.diagnoses ?? [],
    providers: review.providers ?? [],
    references: review.references ?? [],
    dates: review.dates ?? [],
    messages: review.messages ?? [],
  });
}

/** What a reading of a 278 built from `spec` must carry. */
function expected(spec: Build278Spec): unknown {
  const { subscriber } = spec;
  return plain({
    header: spec.header,
    utilizationManagementOrganization: spec.utilizationManagementOrganization,
    requester: spec.requester,
    ...(subscriber.member === undefined ? {} : { subscriber: subscriber.member }),
    ...(subscriber.dependent?.member === undefined
      ? {}
      : { dependent: subscriber.dependent.member }),
    reviews: [...(subscriber.reviews ?? []), ...(subscriber.dependent?.reviews ?? [])].map(
      expectedReview,
    ),
    warnings: [],
  });
}

for (const { direction, build, read } of DIRECTIONS) {
  describe(`property: the 278 ${direction}`, () => {
    it(
      "round trip: a built 278 parses back to itself, writes the same bytes again, and reads back every value its spec gave",
      () => {
        assertProperty(
          `278 ${direction} round trip`,
          fc.property(spec278(direction), (spec) => {
            const built = build(spec);
            assert.deepStrictEqual(built.warnings, []);
            const text = serializeX12(built);
            const back = parseX12(text);
            assert.deepStrictEqual(back, built);
            assert.equal(serializeX12(back), text);
            const reading = readOnly(back, read);
            assert.equal(reading.direction, direction);
            assert.equal(reading.implementationConventionReference, "005010X217");
            expect(plain(reading)).toMatchObject(expected(spec) as object);
            if (direction === "request") {
              assert.ok(reading.reviews.every((r) => r.decision === undefined));
            }
          }),
        );
      },
      TIMEOUT,
    );

    it(
      "idempotent normalize: serializeX12(parseX12(raw)) is a fixed point, and so is the reading",
      () => {
        const input = spec278(direction).chain((spec) => {
          const built = build(spec);
          return messy(serializeX12(built), built.delimiters.segment);
        });
        assertProperty(
          `278 ${direction} idempotent normalize`,
          fc.property(input, (raw) => {
            const once = serializeX12(parseX12(raw));
            const twice = serializeX12(parseX12(once));
            assert.equal(twice, once);
            assert.deepStrictEqual(readOnly(parseX12(twice), read), readOnly(parseX12(once), read));
          }),
        );
      },
      TIMEOUT,
    );

    it(
      "never throws in lenient mode: a damaged 278 parses or is refused with a documented fatal, and reads without throwing",
      () => {
        const input = spec278(direction).chain((spec) => {
          const built = build(spec);
          return damaged(serializeX12(built), built.delimiters.segment);
        });
        assertProperty(
          `278 ${direction} never throws in lenient mode`,
          fc.property(input, (raw) => {
            const ix = parseOrFatal(raw);
            if (ix === undefined) return;
            assertWarningsRegistered(ix.warnings);
            for (const tx of transactions(ix)) {
              for (const reader of [get278Request, get278Response]) {
                const reading = reader(ix.delimiters, tx);
                if (reading !== undefined) assertWarningsRegistered(reading.warnings);
              }
            }
            serializeX12(ix);
          }),
        );
      },
      TIMEOUT,
    );
  });
}

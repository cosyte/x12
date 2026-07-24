/**
 * Property tests for the Phase 8 emit half - the serializer + builder
 * round-trip / idempotency invariant, wired into `@cosyte/test-utils`'
 * `roundTripProperty` runner so it stays uniform with the rest of the suite.
 *
 * For every generated spec-clean interchange, `roundTripProperty` asserts:
 *   1. round-trip equality - `parse(serialize(ix))` deep-equals `ix`;
 *   2. serialize idempotency - `serialize(parse(serialize(ix))) === serialize(ix)`.
 *
 * A second property generates interchanges through the public
 * `buildInterchange` builder and asserts the builder NEVER emits a
 * self-inconsistent envelope (zero warnings on re-parse) and that its output is
 * a serialize fixed point.
 */

import { roundTripProperty } from "@cosyte/test-utils";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  buildInterchange,
  parseX12,
  serializeX12,
  type InterchangeSpec,
  type X12Interchange,
} from "../../src/index.js";

import { specCleanInterchange } from "./_arbitraries.js";

describe("serialize: round-trip + idempotency over spec-clean interchanges", () => {
  it("parse(serialize(ix)) === ix and serialize is a byte-level fixed point", () => {
    roundTripProperty<X12Interchange>({
      arbitrary: specCleanInterchange.map((raw) => parseX12(raw)),
      serialize: (ix) => serializeX12(ix),
      parse: (raw) => parseX12(raw),
      numRuns: 300,
    });
  });
});

/**
 * Generator of valid {@link InterchangeSpec}s for the builder property -
 * random delimiters, identifiers, group/transaction control numbers, and a
 * small body of opaque-but-well-formed segments.
 */
const interchangeSpec: fc.Arbitrary<InterchangeSpec> = fc
  .record({
    controlNumber: fc.integer({ min: 1, max: 999_999_999 }).map((n) => String(n).padStart(9, "0")),
    groupControlNumber: fc.integer({ min: 1, max: 999_999 }).map((n) => String(n)),
    transactionControlNumber: fc
      .integer({ min: 1, max: 9999 })
      .map((n) => String(n).padStart(4, "0")),
    bodyLen: fc.integer({ min: 0, max: 5 }),
  })
  .map((spec) => ({
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "250101",
    interchangeTime: "1200",
    interchangeControlNumber: spec.controlNumber,
    groups: [
      {
        functionalIdCode: "HC",
        groupControlNumber: spec.groupControlNumber,
        versionRelease: "005010X222A2",
        transactions: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: spec.transactionControlNumber,
            segments: Array.from({ length: spec.bodyLen }, (_unused, i) => [
              "REF",
              "ZZ",
              `VALUE${String(i)}`,
            ]),
          },
        ],
      },
    ],
  }));

describe("buildInterchange: never emits a self-inconsistent envelope", () => {
  it("built interchanges re-parse with zero warnings and are a serialize fixed point", () => {
    fc.assert(
      fc.property(interchangeSpec, (spec) => {
        const ix = buildInterchange(spec);
        expect(ix.warnings).toHaveLength(0);
        const once = serializeX12(ix);
        expect(serializeX12(parseX12(once))).toBe(once);
      }),
      { numRuns: 200 },
    );
  });
});

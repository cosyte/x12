/**
 * The three properties every Cosyte parser proves, for the 277 request for additional information
 * (006020X313), on build specs generated in `./_transaction-specs.ts`:
 *
 * 1. **Round trip.** A built 277 warns about nothing, parses back to the same interchange,
 *    serializes to the same bytes again, and its reading carries every value the spec gave: the
 *    header, each level in document order with its parent, its entities and its requests, and
 *    each request's trace, statuses, references, dates, quantities, amounts and service lines.
 * 2. **Idempotent normalize.** For a built 277, clean or with line breaks after its segments,
 *    `serializeX12(parseX12(raw))` is a fixed point, and reading it once or twice gives the same
 *    reading.
 * 3. **Never throws in lenient mode.** A built 277 damaged the ways a feed damages it is parsed,
 *    or refused with one of the four documented fatal errors, and the reader then reads every
 *    transaction set without throwing, with registered warnings only.
 *
 * Each runs 100 cases by default; `COSYTE_PROPERTY_RUNS` sets the depth (the nightly run sets
 * 10,000), and a failure prints the seed and path that replay it (see `./_runner.ts`).
 */

import assert from "node:assert/strict";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  build277RequestForAdditionalInformation,
  get277RequestForAdditionalInformation,
  parseX12,
  serializeX12,
  type Build277RfaiLevelSpec,
  type Build277RfaiRequestSpec,
  type Build277RfaiSpec,
  type X12AdditionalInformationRequest,
  type X12Interchange,
} from "../../src/index.js";

import { assertProperty, propertyTimeout } from "./_runner.js";
import {
  assertWarningsRegistered,
  damaged,
  messy,
  parseOrFatal,
  plain,
  spec277Rfai,
  transactions,
} from "./_transaction-specs.js";

/** Each test's budget, scaled to the depth `COSYTE_PROPERTY_RUNS` sets. */
const TIMEOUT = propertyTimeout();

/** The one 277 a built interchange carries, read as a request for additional information. */
function readOnly(ix: X12Interchange): X12AdditionalInformationRequest {
  const [tx] = transactions(ix);
  assert.ok(tx !== undefined, "the built interchange has no transaction set");
  const reading = get277RequestForAdditionalInformation(ix.delimiters, tx);
  assert.ok(reading !== undefined, "the reader did not recognize the built 277");
  return reading;
}

/** What the reading of one request must carry. */
function expectedRequest(request: Build277RfaiRequestSpec): unknown {
  return {
    traces: [request.trace],
    statuses: request.statuses ?? [],
    references: request.references ?? [],
    dates: request.dates ?? [],
    quantities: request.quantities ?? [],
    amounts: request.amounts ?? [],
    serviceLines: (request.serviceLines ?? []).map((line) => ({
      ...line.service,
      modifiers: line.service.modifiers ?? [],
      statuses: line.statuses ?? [],
      references: line.references ?? [],
      dates: line.dates ?? [],
    })),
  };
}

/** The levels of a spec in document order, each with its HL-01 and HL-02 as the builder numbers them. */
function expectedLevels(levels: readonly Build277RfaiLevelSpec[]): unknown[] {
  const out: unknown[] = [];
  const walk = (level: Build277RfaiLevelSpec, parentId: string | undefined): void => {
    const id = String(out.length + 1);
    out.push({
      id,
      parentId,
      levelCode: level.levelCode,
      childCode: level.childCode,
      entities: level.entities ?? [],
      requests: (level.requests ?? []).map(expectedRequest),
    });
    for (const child of level.children ?? []) walk(child, id);
  };
  for (const level of levels) walk(level, undefined);
  return out;
}

/** What a reading of a 277 built from `spec` must carry. */
function expected(spec: Build277RfaiSpec): unknown {
  return plain({
    transactionType: "request-for-additional-information",
    implementationConventionReference: "006020X313",
    header: spec.header,
    levels: expectedLevels(spec.levels),
    warnings: [],
  });
}

describe("property: the 277 request for additional information", () => {
  it(
    "round trip: a built 277 parses back to itself, writes the same bytes again, and reads back every value its spec gave",
    () => {
      assertProperty(
        "277 request for additional information round trip",
        fc.property(spec277Rfai(), (spec) => {
          const built = build277RequestForAdditionalInformation(spec);
          assert.deepStrictEqual(built.warnings, []);
          const text = serializeX12(built);
          const back = parseX12(text);
          assert.deepStrictEqual(back, built);
          assert.equal(serializeX12(back), text);
          expect(plain(readOnly(back))).toMatchObject(expected(spec) as object);
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "idempotent normalize: serializeX12(parseX12(raw)) is a fixed point, and so is the reading",
    () => {
      const input = spec277Rfai().chain((spec) => {
        const built = build277RequestForAdditionalInformation(spec);
        return messy(serializeX12(built), built.delimiters.segment);
      });
      assertProperty(
        "277 request for additional information idempotent normalize",
        fc.property(input, (raw) => {
          const once = serializeX12(parseX12(raw));
          const twice = serializeX12(parseX12(once));
          assert.equal(twice, once);
          assert.deepStrictEqual(readOnly(parseX12(twice)), readOnly(parseX12(once)));
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "never throws in lenient mode: a damaged 277 parses or is refused with a documented fatal, and reads without throwing",
    () => {
      const input = spec277Rfai().chain((spec) => {
        const built = build277RequestForAdditionalInformation(spec);
        return damaged(serializeX12(built), built.delimiters.segment);
      });
      assertProperty(
        "277 request for additional information never throws in lenient mode",
        fc.property(input, (raw) => {
          const ix = parseOrFatal(raw);
          if (ix === undefined) return;
          assertWarningsRegistered(ix.warnings);
          for (const tx of transactions(ix)) {
            const reading = get277RequestForAdditionalInformation(ix.delimiters, tx);
            if (reading !== undefined) assertWarningsRegistered(reading.warnings);
          }
          serializeX12(ix);
        }),
      );
    },
    TIMEOUT,
  );
});

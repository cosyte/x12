/**
 * The three properties every Cosyte parser proves, for the 275 additional information to support a
 * claim (006020X314), on build specs generated in `./_transaction-specs.ts`:
 *
 * 1. **Round trip.** A built 275 warns about nothing, parses back to the same interchange,
 *    serializes to the same bytes again, and its reading carries every value the spec gave: the
 *    BGN, the entities, each line's trace, status and references, and each attachment's filter,
 *    count and octets, verbatim, whatever delimiter the octets hold.
 * 2. **Idempotent normalize.** For a built 275, clean or with line breaks after its segments,
 *    `serializeX12(parseX12(raw))` is a fixed point, and reading it once or twice gives the same
 *    attachments.
 * 3. **Never throws in lenient mode.** A built 275 damaged the ways a feed damages it is parsed,
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
  build275,
  get275Attachments,
  parseX12,
  serializeX12,
  type Build275Spec,
  type X12AttachmentSubmission,
  type X12Interchange,
} from "../../src/index.js";

import { assertProperty, propertyTimeout } from "./_runner.js";
import {
  assertWarningsRegistered,
  damaged,
  messy,
  parseOrFatal,
  plain,
  spec275,
  transactions,
} from "./_transaction-specs.js";

/** Each test's budget, scaled to the depth `COSYTE_PROPERTY_RUNS` sets. */
const TIMEOUT = propertyTimeout();

/** The one 275 a built interchange carries, read. */
function readOnly(ix: X12Interchange): X12AttachmentSubmission {
  const [tx] = transactions(ix);
  assert.ok(tx !== undefined, "the built interchange has no transaction set");
  const reading = get275Attachments(ix.delimiters, tx);
  assert.ok(reading !== undefined, "the reader did not recognize the built 275");
  return reading;
}

/** Each attachment as plain data: its filter, its BDS-02 and its octets. */
function attachments(reading: X12AttachmentSubmission): unknown {
  return reading.attachments.map((a) => [
    a.filterCode,
    a.declaredLength,
    a.data.readOctets(),
    a.lengthVerified,
  ]);
}

/** What a reading of a 275 built from `spec` must carry, but its attachments. */
function expected(spec: Build275Spec): unknown {
  return plain({
    implementationConventionReference: "006020X314",
    ...(spec.beginning === undefined ? {} : { beginning: spec.beginning }),
    entities: spec.entities ?? [],
    lines: spec.lines.map((line) => ({
      traces: line.trace === undefined ? [] : [line.trace],
      statuses: line.status === undefined ? [] : [line.status],
      references: line.references ?? [],
    })),
    warnings: [],
  });
}

describe("property: the 275", () => {
  it(
    "round trip: a built 275 parses back to itself, writes the same bytes again, and reads back every value and octet its spec gave",
    () => {
      assertProperty(
        "275 round trip",
        fc.property(spec275(), (spec) => {
          const built = build275(spec);
          assert.deepStrictEqual(built.warnings, []);
          const text = serializeX12(built);
          const back = parseX12(text);
          assert.deepStrictEqual(back, built);
          assert.equal(serializeX12(back), text);
          const reading = readOnly(back);
          expect(plain({ ...reading, attachments: undefined })).toMatchObject(
            expected(spec) as object,
          );
          const given = spec.lines.flatMap((line) => line.attachments ?? []);
          assert.deepStrictEqual(
            attachments(reading),
            given.map((a) => [a.filterCode, String(a.data.length), a.data, true]),
          );
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "idempotent normalize: serializeX12(parseX12(raw)) is a fixed point, and so is the reading",
    () => {
      const input = spec275().chain((spec) => {
        const built = build275(spec);
        return messy(serializeX12(built), built.delimiters.segment);
      });
      assertProperty(
        "275 idempotent normalize",
        fc.property(input, (raw) => {
          const once = serializeX12(parseX12(raw));
          const twice = serializeX12(parseX12(once));
          assert.equal(twice, once);
          const first = readOnly(parseX12(once));
          const second = readOnly(parseX12(twice));
          assert.deepStrictEqual(attachments(second), attachments(first));
          assert.deepStrictEqual(
            plain({ ...second, attachments: undefined }),
            plain({ ...first, attachments: undefined }),
          );
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "never throws in lenient mode: a damaged 275 parses or is refused with a documented fatal, and reads without throwing",
    () => {
      const input = spec275().chain((spec) => {
        const built = build275(spec);
        return damaged(serializeX12(built), built.delimiters.segment);
      });
      assertProperty(
        "275 never throws in lenient mode",
        fc.property(input, (raw) => {
          const ix = parseOrFatal(raw);
          if (ix === undefined) return;
          assertWarningsRegistered(ix.warnings);
          for (const tx of transactions(ix)) {
            const reading = get275Attachments(ix.delimiters, tx);
            if (reading === undefined) continue;
            assertWarningsRegistered(reading.warnings);
            for (const a of reading.attachments) a.data.readOctets();
          }
          serializeX12(ix);
        }),
      );
    },
    TIMEOUT,
  );
});

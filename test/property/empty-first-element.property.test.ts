/**
 * A segment whose first element is empty (`*PAYLOAD*MORE~`) outside a transaction.
 *
 * It has no id for the envelope walker to dispatch on, and it used to be skipped: absent from the
 * model, absent from the emit, and with no warning at all. It is now a body segment outside a
 * transaction like any other: one `X12_UNEXPECTED_SEGMENT` warning, an entry on
 * `ix.orphanSegments` with its structural anchor, and `serializeX12` writes it back there.
 *
 * The property inserts one to three such segments, with generated element values, at every slot of
 * a two-group interchange that lies outside a transaction, and holds the whole contract on each:
 * the warning, the orphan, the byte-exact round trip, the fixed point, and the strict refusal.
 */

import assert from "node:assert/strict";

import fc from "fast-check";
import { describe, it } from "vitest";

import {
  parseX12,
  serializeX12,
  UNEXPECTED_SEGMENT_CONTEXTS,
  unexpectedSegment,
  WARNING_CODES,
  X12ParseError,
} from "../../src/index.js";
import { buildIsa } from "../_helpers/envelope.js";

import { assertProperty, propertyTimeout } from "./_runner.js";

/** Each test's budget, scaled to the depth `COSYTE_PROPERTY_RUNS` sets. */
const TIMEOUT = propertyTimeout();

const ISA = buildIsa({ controlNumber: "000000001" });

/** Two groups, three transactions, spec-clean: it parses with no warning. */
const BASE = [
  "GS*HP*S*R*20250101*1200*1*X*005010X221A1~",
  "ST*835*0001~",
  "CLP*ACCT1*1*100*0~",
  "SE*3*0001~",
  "ST*835*0002~",
  "CLP*ACCT2*1*200*0~",
  "SE*3*0002~",
  "GE*2*1~",
  "GS*HC*S*R*20250101*1200*2*X*005010X222A2~",
  "ST*837*0003~",
  "CLP*ACCT3*1*300*0~",
  "SE*3*0003~",
  "GE*1*2~",
  "IEA*2*000000001~",
] as const;

/**
 * Every slot of {@link BASE} that lies outside a transaction: a segment inserted before `BASE[i]`
 * for each `i` here arrives with no `ST` open. Before the first `GS`, after each `GS`, after each
 * `SE` and after each `GE`.
 */
const OUTSIDE_SLOTS = [0, 1, 4, 7, 8, 9, 12, 13] as const;

/** One element value: letters, digits, and the repetition and component separators. */
const elementValue = fc.stringMatching(/^[A-Z0-9:^]{0,6}$/);

/** A segment whose first element is empty, unterminated: `*` and one to four elements. */
const emptyFirstElement = fc
  .array(elementValue, { minLength: 1, maxLength: 4 })
  .map((elements) => `*${elements.join("*")}`);

/** One to three such segments, each at a slot outside a transaction. */
const insertions = fc.array(
  fc.record({ slot: fc.constantFrom(...OUTSIDE_SLOTS), segment: emptyFirstElement }),
  { minLength: 1, maxLength: 3 },
);

/** The interchange with each insertion placed before its slot, in the order generated. */
function withInsertions(
  inserted: readonly { readonly slot: number; readonly segment: string }[],
): string {
  let out = ISA;
  for (const [i, line] of BASE.entries()) {
    for (const { slot, segment } of inserted) {
      if (slot === i) out += `${segment}~`;
    }
    out += line;
  }
  return out;
}

/** The segments of {@link withInsertions} in the order they appear in its output. */
function inOrder(
  inserted: readonly { readonly slot: number; readonly segment: string }[],
): string[] {
  return OUTSIDE_SLOTS.flatMap((slot) =>
    inserted.filter((x) => x.slot === slot).map((x) => x.segment),
  );
}

const BODY_MESSAGE = unexpectedSegment(
  { segmentIndex: 0 },
  UNEXPECTED_SEGMENT_CONTEXTS.BODY_OUTSIDE_TRANSACTION,
).message;

describe("parseX12: a segment with an empty first element outside a transaction", () => {
  it("the base interchange parses with no warning and no orphan", () => {
    const ix = parseX12(ISA + BASE.join(""));
    assert.deepEqual(ix.warnings, []);
    assert.deepEqual(ix.orphanSegments, []);
  });

  it(
    "is warned, kept on orphanSegments with its anchor, and re-emitted byte-exactly",
    () => {
      assertProperty(
        "empty first element round trip",
        fc.property(insertions, (inserted) => {
          const raw = withInsertions(inserted);
          const ix = parseX12(raw);
          const expected = inOrder(inserted);

          // Kept: every inserted segment, verbatim, as a body segment outside a transaction.
          assert.deepEqual(
            ix.orphanSegments.map((o) => o.raw),
            expected,
          );
          for (const o of ix.orphanSegments) {
            assert.equal(o.context, UNEXPECTED_SEGMENT_CONTEXTS.BODY_OUTSIDE_TRANSACTION);
            assert.notEqual(o.anchor.kind, "transaction");
            assert.equal(o.segment.elements[0], "");
            assert.equal(o.segment.raw, o.raw);
          }

          // Warned: one X12_UNEXPECTED_SEGMENT per segment and nothing else, joined by index.
          assert.deepEqual(
            ix.warnings.map((w) => [w.code, w.message]),
            expected.map(() => [WARNING_CODES.X12_UNEXPECTED_SEGMENT, BODY_MESSAGE]),
          );
          assert.deepEqual(
            ix.warnings.map((w) => w.position.segmentIndex),
            ix.orphanSegments.map((o) => o.segmentIndex),
          );

          // The typed tree is untouched by the stray segments.
          assert.deepEqual(
            ix.groups.map((g) => g.transactions.map((t) => t.rawSegments.length)),
            [[3, 3], [3]],
          );

          // Re-emitted at its anchor: byte-exact, and a re-parse gives the same model.
          const out = serializeX12(ix);
          assert.equal(out, raw);
          assert.deepStrictEqual(parseX12(out), ix);
        }),
      );
    },
    TIMEOUT,
  );

  it(
    "is refused in strict mode like any other unexpected segment",
    () => {
      assertProperty(
        "empty first element strict",
        fc.property(insertions, (inserted) => {
          const raw = withInsertions(inserted);
          const first = parseX12(raw).orphanSegments[0];
          assert.ok(first !== undefined);
          assert.throws(
            () => parseX12(raw, { strict: true }),
            (err: unknown) =>
              err instanceof X12ParseError &&
              String(err.code) === WARNING_CODES.X12_UNEXPECTED_SEGMENT &&
              err.position.segmentIndex === first.segmentIndex,
          );
        }),
      );
    },
    TIMEOUT,
  );
});

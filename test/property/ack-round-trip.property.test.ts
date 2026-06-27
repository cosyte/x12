/**
 * Property-based tests for the X12 acknowledgment surface (Phase 3).
 *
 * Two invariants locked here:
 *
 * 1. **Round-trip property:** for any random ack spec drawn from the
 *    generators below, `parse999(build999(spec))` returns a parsed model
 *    whose dispositions, counts, and AK1 echo deep-equal the spec.
 * 2. **Accept-clean invariant:** for any ack spec where the functional
 *    disposition is `"A"` (Accept) and any transaction response is
 *    non-`"A"` (or any error payload is supplied anywhere), `build999`
 *    throws {@link AckBuildError} with code
 *    `X12_ACK_ACCEPT_WITH_ERRORS`. The Phase 3 safety guarantee.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  build999,
  parse999,
  type Build999Spec,
  type X12AckDispositionCode,
} from "../../src/index.js";

const NUMERIC_4_9 = /^\d{4,9}$/u;

/**
 * Generate a 9-digit ISA control-number string (zero-padded). Always
 * length exactly 9; characters always `[0-9]`.
 *
 * @internal
 */
const isaControlNumberArb = fc
  .integer({ min: 1, max: 999_999_999 })
  .map((n) => String(n).padStart(9, "0"));

/**
 * Generate a 4–9-digit ST control-number string. ST-02 / SE-02 must be
 * 4–9 digits per ASC X12 .5; we draw exactly 4 here for determinism.
 *
 * @internal
 */
const stControlNumberArb = fc.integer({ min: 1, max: 9999 }).map((n) => String(n).padStart(4, "0"));

/**
 * Generate a YYMMDD 6-digit date string. Year always >= 25 (2025) so
 * `expandYY` resolves predictably.
 *
 * @internal
 */
const dateArb = fc
  .tuple(
    fc.integer({ min: 25, max: 49 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(
    ([y, m, d]) =>
      `${String(y).padStart(2, "0")}${String(m).padStart(2, "0")}${String(d).padStart(2, "0")}`,
  );

/** Generate a HHMM 4-digit time string. @internal */
const timeArb = fc
  .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
  .map(([h, m]) => `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`);

/**
 * Generate an envelope spec for `build999`. Keeps every field within the
 * spec-conformant shape so the build path doesn't hit a refusal it
 * wouldn't hit at runtime.
 *
 * @internal
 */
const envelopeArb = fc.record({
  senderId: fc.constant("RECEIVER"),
  receiverId: fc.constant("SENDER"),
  interchangeDate: dateArb,
  interchangeTime: timeArb,
  interchangeControlNumber: isaControlNumberArb,
  groupControlNumber: stControlNumberArb,
  transactionSetControlNumber: stControlNumberArb,
});

/**
 * Generate a single transaction response spec with a clean accept
 * disposition. The accept-clean property uses this; the rejection
 * property mutates the disposition / errors fields.
 *
 * @internal
 */
const acceptResponseArb = fc.record({
  transactionSetIdCode: fc.constantFrom("837", "835", "270", "271", "834"),
  transactionSetControlNumber: stControlNumberArb,
  implementationConventionReference: fc.constantFrom(
    "005010X222A2",
    "005010X221A1",
    "005010X279A1",
    "005010X212",
    "005010X220A1",
  ),
  disposition: fc.constant("A" as const),
});

/**
 * Generate a clean-accept ack spec — every transaction-response
 * disposition is `"A"`, no error payload anywhere. The round-trip
 * property uses this so it doesn't accidentally invoke the
 * accept-clean refusal.
 *
 * @internal
 */
function buildAcceptSpec(
  envelope: Build999Spec["envelope"],
  responses: Build999Spec["functionalGroup"]["transactionResponses"],
): Build999Spec {
  return {
    envelope,
    functionalGroup: {
      functionalIdCode: "HC",
      groupControlNumber: "1",
      versionRelease: "005010X222A2",
      disposition: "A",
      numberOfTransactionSets: responses.length,
      numberOfReceivedTransactionSets: responses.length,
      numberOfAcceptedTransactionSets: responses.length,
      transactionResponses: responses,
    },
  };
}

// ---------------------------------------------------------------------------
// Round-trip property.
// ---------------------------------------------------------------------------

describe("999 — round-trip property", () => {
  it("parse999(build999(spec)) round-trips dispositions, counts, and version on every clean accept", () => {
    fc.assert(
      fc.property(
        envelopeArb,
        fc.array(acceptResponseArb, { minLength: 1, maxLength: 5 }),
        (envelope, responses) => {
          const spec = buildAcceptSpec(envelope, responses);
          const ix = build999(spec);
          const raw = reconstructRaw(ix);
          const ack = parse999(raw);
          if (ack === undefined) {
            throw new Error("parse999 round-trip returned undefined for a built ack");
          }
          expect(ack.ak1.functionalIdCode).toBe("HC");
          expect(ack.ak1.versionRelease).toBe("005010X222A2");
          expect(ack.ak9.disposition).toBe("A");
          expect(ack.ak9.numberOfAcceptedTransactionSets).toBe(responses.length);
          expect(ack.transactionResponses).toHaveLength(responses.length);
          for (let i = 0; i < responses.length; i++) {
            expect(ack.transactionResponses[i]?.ik5.disposition).toBe("A");
            expect(ack.transactionResponses[i]?.ak2.transactionSetIdCode).toBe(
              responses[i]?.transactionSetIdCode,
            );
            expect(NUMERIC_4_9.test(responses[i]?.transactionSetControlNumber ?? "")).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Accept-clean invariant.
// ---------------------------------------------------------------------------

describe("999 — accept-clean safety property", () => {
  it("functional A + any non-A per-transaction response throws AckBuildError", () => {
    const nonAcceptArb = fc.constantFrom<X12AckDispositionCode>("E", "R", "P", "M", "W", "X");
    fc.assert(
      fc.property(envelopeArb, nonAcceptArb, (envelope, nonAcceptCode) => {
        const spec: Build999Spec = {
          envelope,
          functionalGroup: {
            functionalIdCode: "HC",
            groupControlNumber: "1",
            versionRelease: "005010X222A2",
            disposition: "A",
            numberOfTransactionSets: 1,
            numberOfReceivedTransactionSets: 1,
            numberOfAcceptedTransactionSets: 1,
            transactionResponses: [
              {
                transactionSetIdCode: "837",
                transactionSetControlNumber: "0001",
                disposition: nonAcceptCode,
              },
            ],
          },
        };
        let thrown: unknown;
        try {
          build999(spec);
        } catch (err) {
          thrown = err;
        }
        if (!(thrown instanceof AckBuildError)) {
          throw new Error(`expected AckBuildError, got ${String(thrown)}`, {
            cause: thrown,
          });
        }
        expect(thrown.code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS);
      }),
      { numRuns: 100 },
    );
  });

  it("functional A + non-empty AK9 syntax error codes throws AckBuildError", () => {
    fc.assert(
      fc.property(
        envelopeArb,
        fc.array(fc.constantFrom("1", "2", "3", "4", "5"), { minLength: 1, maxLength: 5 }),
        (envelope, errorCodes) => {
          const spec: Build999Spec = {
            envelope,
            functionalGroup: {
              functionalIdCode: "HC",
              groupControlNumber: "1",
              versionRelease: "005010X222A2",
              disposition: "A",
              numberOfTransactionSets: 1,
              numberOfReceivedTransactionSets: 1,
              numberOfAcceptedTransactionSets: 1,
              syntaxErrorCodes: errorCodes,
              transactionResponses: [
                {
                  transactionSetIdCode: "837",
                  transactionSetControlNumber: "0001",
                  disposition: "A",
                },
              ],
            },
          };
          let thrown: unknown;
          try {
            build999(spec);
          } catch (err) {
            thrown = err;
          }
          if (!(thrown instanceof AckBuildError)) {
            throw new Error(`expected AckBuildError, got ${String(thrown)}`, {
              cause: thrown,
            });
          }
          expect(thrown.code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Reconstruct the wire-byte string from a parsed `X12Interchange`. Used
 * to feed the build output back through `parse999`.
 *
 * @internal
 */
function reconstructRaw(ix: ReturnType<typeof build999>): string {
  const terminator = ix.delimiters.segment;
  let out = ix.isa.raw;
  for (const group of ix.groups) {
    out += group.gs.raw + terminator;
    for (const tx of group.transactions) {
      for (const rawSegment of tx.rawSegments) {
        out += rawSegment + terminator;
      }
    }
    if (group.ge !== undefined) out += group.ge.raw + terminator;
  }
  if (ix.iea !== undefined) out += ix.iea.raw + terminator;
  return out;
}

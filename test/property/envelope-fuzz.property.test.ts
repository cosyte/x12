/**
 * Envelope-decoder fuzz target — Phase 1 acceptance gate.
 *
 * Starts from a spec-clean interchange, flips a single byte at a uniformly
 * random position to one of a small set of printable chars, and feeds the
 * result back to `parseX12`. The parser must either:
 *
 * - return an `X12Interchange` with warnings (lenient recovery), OR
 * - throw exactly one of the 4 Tier-3 fatals (`X12_EMPTY_INPUT`,
 *   `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`).
 *
 * It must NEVER throw an unsanctioned error. This is fast-check's
 * shrinking dialect of the nightly byte-flip fuzz target the roadmap
 * lists for §6 (conformance & accuracy strategy).
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";

import { FATAL_CODES, parseX12, X12ParseError } from "../../src/index.js";

import { bitFlippedInterchange } from "./_arbitraries.js";
import { fuzzRuns } from "./_fuzz-config.js";

const FATAL_CODE_SET: ReadonlySet<string> = new Set(Object.values(FATAL_CODES));

describe("envelope fuzz: byte-flipped interchanges never throw unsanctioned errors", () => {
  it("every flipped input either parses leniently or throws one of the 4 Tier-3 fatals", () => {
    fc.assert(
      fc.property(bitFlippedInterchange, (raw) => {
        try {
          parseX12(raw);
        } catch (err) {
          expect(err).toBeInstanceOf(X12ParseError);
          if (err instanceof X12ParseError) {
            expect(FATAL_CODE_SET.has(err.code)).toBe(true);
          }
        }
      }),
      { numRuns: fuzzRuns(500) },
    );
  });
});

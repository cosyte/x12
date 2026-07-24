/**
 * Property: `unescapeRelease(escapeRelease(v, d), d)` deep-equals `v` for any
 * value `v` and any 4-distinct-delimiter set `d`. The Phase 2 lossless
 * round-trip invariant - if this can ever fail, every helper / serializer /
 * builder downstream is built on a broken byte primitive.
 */

import fc from "fast-check";
import { describe, it } from "vitest";

import { escapeRelease, unescapeRelease } from "../../src/parser/release.js";
import type { Delimiters, X12Position } from "../../src/parser/types.js";

const DELIMITER_POOL = ["*", "|", "^", "\\", "@", ":", "!", "#", "+", "&", "%", "$"] as const;

const fourDistinctDelimiters = fc
  .shuffledSubarray([...DELIMITER_POOL], { minLength: 4, maxLength: 4 })
  .map((arr) => {
    const [element, repetition, component, segment] = arr;
    if (
      element === undefined ||
      repetition === undefined ||
      component === undefined ||
      segment === undefined
    ) {
      throw new Error("internal: shuffledSubarray returned fewer than 4 items");
    }
    const d: Delimiters = { element, repetition, component, segment };
    return d;
  });

const POS: X12Position = { segmentIndex: 0, interchangeIndex: 0 };

describe("?-release-character escape - lossless round-trip property", () => {
  it("any value survives escape→unescape across any 4-distinct-delimiter set", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        fourDistinctDelimiters,
        (value, delimiters) => {
          const encoded = escapeRelease(value, delimiters);
          // After escapeRelease, no bare delimiter or bare release-char
          // remains - every reserved byte is preceded by `?`.
          const decoded = unescapeRelease(encoded, delimiters, () => {}, POS);
          return decoded === value;
        },
      ),
      { numRuns: 500 },
    );
  });

  it("escapeRelease output decodes byte-by-byte into either unescaped data or `?<reserved>` pairs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        fourDistinctDelimiters,
        (value, delimiters) => {
          const encoded = escapeRelease(value, delimiters);
          const isReserved = (ch: string): boolean =>
            ch === delimiters.element ||
            ch === delimiters.repetition ||
            ch === delimiters.component ||
            ch === delimiters.segment ||
            ch === "?";
          // Left-to-right consumer: at each position, expect either a
          // non-reserved byte (consume 1) or a `?` followed by exactly
          // one reserved byte (consume 2). Any other shape means
          // escapeRelease left a bare reserved byte - a bug.
          let i = 0;
          while (i < encoded.length) {
            const ch = encoded.charAt(i);
            if (ch === "?") {
              if (i + 1 >= encoded.length) return false;
              const next = encoded.charAt(i + 1);
              if (!isReserved(next)) return false;
              i += 2;
              continue;
            }
            if (isReserved(ch)) return false;
            i += 1;
          }
          return true;
        },
      ),
      { numRuns: 500 },
    );
  });
});

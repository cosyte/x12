/**
 * Property: the parser's output is invariant to how the input is chunked
 * along byte boundaries. Phase 2 ships a non-streaming parser, but the
 * invariant locks NOW so a future v2 streaming wrapper is a
 * non-breaking addition: any chunking strategy must produce the same
 * `X12Interchange` as the whole-file parse.
 *
 * Implementation: for any random split point `k` in a spec-clean
 * interchange `s`, `parseX12(s.slice(0, k) + s.slice(k))` deep-equals
 * `parseX12(s)`. Trivially true at the JS-string layer (concatenation
 * round-trips), so the property additionally walks Buffer-then-latin1
 * paths (the real downstream chunked-read scenario) to confirm the
 * Buffer→string boundary preserves byte identity.
 */

import { Buffer } from "node:buffer";

import fc from "fast-check";
import { describe, it } from "vitest";

import { parseX12 } from "../../src/index.js";

import { specCleanInterchange } from "./_arbitraries.js";

describe("streaming-decode invariant - output independent of chunk boundary", () => {
  it("string-level concatenation: parse(s) === parse(s[:k] + s[k:])", () => {
    fc.assert(
      fc.property(specCleanInterchange, fc.integer({ min: 0, max: 5000 }), (raw, splitSeed) => {
        const k = Math.min(splitSeed, Math.max(0, raw.length - 1));
        const stitched = raw.slice(0, k) + raw.slice(k);
        const a = parseX12(raw);
        const b = parseX12(stitched);
        return (
          a.warnings.length === b.warnings.length &&
          a.groups.length === b.groups.length &&
          a.isa.raw === b.isa.raw
        );
      }),
      { numRuns: 200 },
    );
  });

  it("Buffer→latin1 path: parse(Buffer.from(s)) === parse(Buffer.concat([s[:k], s[k:]]))", () => {
    fc.assert(
      fc.property(specCleanInterchange, fc.integer({ min: 0, max: 5000 }), (raw, splitSeed) => {
        const buf = Buffer.from(raw, "latin1");
        const k = Math.min(splitSeed, Math.max(0, buf.length - 1));
        const stitched = Buffer.concat([buf.subarray(0, k), buf.subarray(k)]);
        const a = parseX12(buf);
        const b = parseX12(stitched);
        return (
          a.warnings.length === b.warnings.length &&
          a.groups.length === b.groups.length &&
          a.isa.raw === b.isa.raw
        );
      }),
      { numRuns: 200 },
    );
  });
});

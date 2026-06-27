/**
 * Property tests for round-trip byte-exact ISA preservation. The Phase 1
 * roadmap acceptance requires that the ISA segment is preserved verbatim
 * regardless of any lenient normalization elsewhere in the parser. The
 * arbitrary varies delimiters + control numbers + trailing-CRLF behavior;
 * for every generated input, `parse(raw).isa.raw === raw.slice(0, 106)`.
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { parseX12 } from "../../src/index.js";

import { specCleanInterchange } from "./_arbitraries.js";

describe("round-trip: ISA byte-exact preservation across delimiter variants", () => {
  it("parse(raw).isa.raw === raw.slice(0, 106) for every spec-clean interchange", () => {
    fc.assert(
      fc.property(specCleanInterchange, (raw) => {
        const ix = parseX12(raw);
        expect(ix.isa.raw).toBe(raw.slice(0, 106));
        expect(ix.isa.raw.length).toBe(106);
      }),
      { numRuns: 300 },
    );
  });

  it("warnings list is empty for spec-clean input (no lenient drift)", () => {
    fc.assert(
      fc.property(specCleanInterchange, (raw) => {
        const ix = parseX12(raw);
        expect(ix.warnings).toHaveLength(0);
      }),
      { numRuns: 300 },
    );
  });
});

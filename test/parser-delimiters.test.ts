/**
 * Unit tests for `detectDelimiters` — Tier-3 fatal taxonomy + valid-input
 * exhaustive checks. These pin the 4-code fatal taxonomy locked in
 * `src/parser/errors.ts`: any new fatal would break the snapshot test in
 * `warning-codes.snapshot.test.ts`, but these tests pin the
 * trigger-conditions for each existing code.
 */

import { describe, expect, it } from "vitest";

import {
  detectDelimiters,
  DELIMITER_POSITIONS,
  FATAL_CODES,
  ISA_MIN_LENGTH,
  X12ParseError,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

describe("detectDelimiters — happy paths", () => {
  it("decodes the canonical Medicare `*^:~` envelope", () => {
    const isa = buildIsa();
    const d = detectDelimiters(isa);
    expect(d).toEqual({ element: "*", repetition: "^", component: ":", segment: "~" });
  });

  it("decodes a non-default segment terminator (Availity-style `^`)", () => {
    const isa = buildIsa({ segment: "@" });
    const d = detectDelimiters(isa);
    expect(d.segment).toBe("@");
  });

  it("decodes a BCBS-style `\\` sub-element separator", () => {
    const isa = buildIsa({ component: "\\" });
    const d = detectDelimiters(isa);
    expect(d.component).toBe("\\");
  });

  it("decodes a non-default repetition separator (`|`)", () => {
    const isa = buildIsa({ repetition: "|" });
    const d = detectDelimiters(isa);
    expect(d.repetition).toBe("|");
  });
});

describe("detectDelimiters — Tier-3 fatals", () => {
  it("X12_NO_ISA_HEADER when input does not start with ISA", () => {
    expect(() => detectDelimiters("GSX*HC*S*R*250101*1200*1*X*005010X222A2~")).toThrow(
      X12ParseError,
    );
    try {
      detectDelimiters("GSX*HC*S*R*250101*1200*1*X*005010X222A2~");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        expect(err.code).toBe(FATAL_CODES.X12_NO_ISA_HEADER);
      }
    }
  });

  it("X12_ISA_TOO_SHORT when input is shorter than ISA_MIN_LENGTH", () => {
    const short = "ISA*00*          *00*          *ZZ*SENDER";
    expect(short.length).toBeLessThan(ISA_MIN_LENGTH);
    try {
      detectDelimiters(short);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        expect(err.code).toBe(FATAL_CODES.X12_ISA_TOO_SHORT);
      }
    }
  });

  it("X12_INVALID_DELIMITERS when any delimiter is whitespace", () => {
    // Build a valid 106-char ISA but flip the element separator to a tab.
    const isa = buildIsa();
    const broken = isa.slice(0, 3) + "\t" + isa.slice(4);
    try {
      detectDelimiters(broken);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        expect(err.code).toBe(FATAL_CODES.X12_INVALID_DELIMITERS);
      }
    }
  });

  it("X12_INVALID_DELIMITERS when two delimiters collide (component == segment)", () => {
    const isa = buildIsa({ component: "~", segment: "~" });
    try {
      detectDelimiters(isa);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        expect(err.code).toBe(FATAL_CODES.X12_INVALID_DELIMITERS);
      }
    }
  });

  it("X12_INVALID_DELIMITERS when ISA layout is corrupted (element sep missing inside)", () => {
    // Build a valid ISA, then overwrite a fixed element-separator position
    // with a non-separator byte so the layout check trips.
    const isa = buildIsa();
    // Overwrite the element separator at the position-50 slot (between
    // ISA-06 and ISA-07) with the literal letter `X`.
    const broken = isa.slice(0, 50) + "X" + isa.slice(51);
    try {
      detectDelimiters(broken);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        expect(err.code).toBe(FATAL_CODES.X12_INVALID_DELIMITERS);
      }
    }
  });

  it("populates positional context + bounded snippet on every fatal", () => {
    try {
      detectDelimiters("");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        expect(err.position.segmentIndex).toBe(0);
        expect(err.position.interchangeIndex).toBe(0);
        // Snippet for empty input is empty; non-empty inputs must be ≤ 64.
        expect(err.snippet.length).toBeLessThanOrEqual(64);
      }
    }

    try {
      detectDelimiters("GSX*HC*S*R*250101*1200*1*X*005010X222A2~");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        expect(err.snippet.length).toBeLessThanOrEqual(64);
      }
    }
  });
});

describe("DELIMITER_POSITIONS — locked-by-spec layout", () => {
  it("matches the ASC X12 .5 fixed positions (zero-indexed)", () => {
    expect(DELIMITER_POSITIONS).toEqual({
      element: 3,
      repetition: 82,
      component: 104,
      segment: 105,
    });
  });
});

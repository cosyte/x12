/**
 * Unit tests for `parseX12` — the high-level entry that composes
 * delimiter detection with envelope walking. Covers happy paths, the
 * empty-input fatal, and each Phase 1 Tier-2 warning's trigger condition.
 *
 * Round-trip ISA byte-exact preservation is asserted across all four
 * Tier-1 envelope shapes — the parser MUST NOT modify a single byte of
 * the ISA segment regardless of any lenient normalization elsewhere.
 */

import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import {
  FATAL_CODES,
  parseX12,
  WARNING_CODES,
  X12ParseError,
  type X12ParseWarning,
} from "../src/index.js";

import { buildInterchange, buildIsa } from "./_helpers/envelope.js";

describe("parseX12 — happy paths", () => {
  it("parses the canonical Medicare envelope with `*^:~` delimiters", () => {
    const raw = buildInterchange();
    const ix = parseX12(raw);
    expect(ix.delimiters).toEqual({
      element: "*",
      repetition: "^",
      component: ":",
      segment: "~",
    });
    expect(ix.isa.elements[0]).toBe("ISA");
    expect(ix.isa.elements[12]).toBe("00501");
    expect(ix.isa.elements[13]).toBe("000000001");
    expect(ix.iea?.elements[0]).toBe("IEA");
    expect(ix.iea?.elements[2]).toBe("000000001");
    expect(ix.groups).toHaveLength(1);
    expect(ix.groups[0]?.gs.elements[1]).toBe("HC");
    expect(ix.groups[0]?.transactions).toHaveLength(1);
    expect(ix.groups[0]?.transactions[0]?.st.elements[1]).toBe("837");
    expect(ix.warnings).toHaveLength(0);
  });

  it("parses a Buffer input identically to the same string", () => {
    const raw = buildInterchange();
    const fromString = parseX12(raw);
    const fromBuffer = parseX12(Buffer.from(raw, "latin1"));
    expect(fromBuffer.isa.raw).toBe(fromString.isa.raw);
    expect(fromBuffer.delimiters).toEqual(fromString.delimiters);
  });

  it("parses with no trailing CRLF after segment terminators", () => {
    const raw = buildInterchange({ trailingCrlf: false });
    const ix = parseX12(raw);
    expect(ix.warnings).toHaveLength(0);
    expect(ix.groups).toHaveLength(1);
  });

  it("parses with trailing CRLF after every segment terminator", () => {
    const raw = buildInterchange({ trailingCrlf: true });
    const ix = parseX12(raw);
    expect(ix.warnings).toHaveLength(0);
    expect(ix.groups).toHaveLength(1);
  });

  it("parses an Availity-style `^` repetition separator envelope", () => {
    const raw = buildInterchange({ repetition: "^" });
    const ix = parseX12(raw);
    expect(ix.delimiters.repetition).toBe("^");
    expect(ix.warnings).toHaveLength(0);
  });

  it("parses a BCBS-style `\\` sub-element separator envelope", () => {
    const raw = buildInterchange({ component: "\\" });
    const ix = parseX12(raw);
    expect(ix.delimiters.component).toBe("\\");
    expect(ix.warnings).toHaveLength(0);
  });

  it("does not split a segment on a `?`-escaped terminator inside a value", () => {
    // The element splitter has always honoured `?`-release escapes; the
    // segment splitter must too, or a value carrying a literal terminator
    // byte (emitted as `?~` by `escapeRelease`) is corrupted and an empty
    // phantom segment is injected. Regression for the build835 round-trip.
    const raw = buildInterchange({ trailingCrlf: false, transactionBody: ["REF*XX*AB?~CD"] });
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    const ids = (tx?.segments ?? []).map((s) => s.id);
    expect(ids).toEqual(["ST", "REF", "SE"]);
    const ref = tx?.segments.find((s) => s.id === "REF");
    // elements hold raw (pre-unescape) text — the escape sequence survives.
    expect(ref?.elements[2]).toBe("AB?~CD");
    expect(ix.warnings).toHaveLength(0);
  });
});

describe("parseX12 — Tier-3 fatals", () => {
  it("throws X12_EMPTY_INPUT for an empty string", () => {
    try {
      parseX12("");
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        expect(err.code).toBe(FATAL_CODES.X12_EMPTY_INPUT);
        expect(err.snippet).toBe("");
      }
    }
  });
});

describe("parseX12 — Tier-2 warnings", () => {
  it("emits X12_PRE_005010 for a 00401 sender", () => {
    const raw = buildInterchange({ version: "00401" });
    const ix = parseX12(raw);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_PRE_005010);
  });

  it("emits X12_CONTROL_NUMBER_MISMATCH when ISA-13 differs from IEA-02", () => {
    // Build interchange, then surgically alter IEA's control number
    // (column-9 element) so it no longer matches ISA-13.
    const raw = buildInterchange();
    const tampered = raw.replace("IEA*1*000000001~", "IEA*1*000000002~");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
  });

  it("emits X12_GROUP_COUNT_MISMATCH when IEA-01 lies about its group count", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("IEA*1*000000001~", "IEA*2*000000001~");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_GROUP_COUNT_MISMATCH);
  });

  it("emits X12_TRANSACTION_COUNT_MISMATCH when GE-01 lies about its transaction count", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("GE*1*1~", "GE*2*1~");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_TRANSACTION_COUNT_MISMATCH);
  });

  it("emits X12_CONTROL_NUMBER_MISMATCH when GS-06 differs from GE-02", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("GE*1*1~", "GE*1*2~");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
  });

  it("emits X12_CONTROL_NUMBER_MISMATCH when ST-02 differs from SE-02", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("SE*2*0001~", "SE*2*0002~");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
  });

  it("emits X12_MISSING_IEA when input ends before IEA", () => {
    const raw = buildInterchange();
    const truncated = raw.replace(/IEA\*1\*000000001~\r?\n?$/u, "");
    const ix = parseX12(truncated);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_IEA);
    expect(ix.iea).toBeUndefined();
  });

  it("emits X12_MISSING_GE when a group has no GE before IEA", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("GE*1*1~", "");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_GE);
    expect(ix.groups[0]?.ge).toBeUndefined();
  });

  it("emits X12_MISSING_SE when a transaction has no SE before GE", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("SE*2*0001~", "");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_SE);
    expect(ix.groups[0]?.transactions[0]?.se).toBeUndefined();
  });

  it("emits X12_MISSING_GE when a second GS opens before the first GE", () => {
    // Two GS segments with no GE between them — the parser must close the
    // first group with a MISSING_GE warning rather than throw or fuse
    // the two groups.
    const raw = buildInterchange();
    const tampered = raw.replace(
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~",
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~GS*HC*S*R*20250101*1200*2*X*005010X222A2~",
    );
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_GE);
  });

  it("emits X12_MISSING_SE when a second ST opens before the first SE", () => {
    // Two ST segments with no SE between them — the parser must close
    // the first transaction with MISSING_SE rather than throw.
    const raw = buildInterchange();
    const tampered = raw.replace("ST*837*0001~", "ST*837*0001~ST*837*0002~");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_SE);
  });

  it("emits X12_TRAILING_GARBAGE with `trailingBytes` preserved when content follows IEA", () => {
    const raw = buildInterchange();
    const tampered = raw + "JUNK*EXTRA*BYTES~";
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_TRAILING_GARBAGE);
    expect(ix.trailingBytes).toBeDefined();
    expect(ix.trailingBytes).toContain("JUNK");
  });
});

describe("parseX12 — malformed-segment tolerance (Postel's-Law parse)", () => {
  it("survives a truncated IEA missing both IEA-01 and IEA-02", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("IEA*1*000000001~", "IEA~");
    const ix = parseX12(tampered);
    // Both control-number mismatch (empty vs 000000001) and group-count
    // mismatch (empty vs 1) should fire — without throwing.
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
    expect(codes).toContain(WARNING_CODES.X12_GROUP_COUNT_MISMATCH);
    expect(ix.iea?.elements[0]).toBe("IEA");
  });

  it("survives a truncated GE missing both GE-01 and GE-02", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("GE*1*1~", "GE~");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_TRANSACTION_COUNT_MISMATCH);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
  });

  it("survives a truncated SE missing SE-02", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("SE*2*0001~", "SE*2~");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
    expect(ix.groups[0]?.transactions[0]?.se?.elements[1]).toBe("2");
  });

  it("survives a truncated ST missing ST-02", () => {
    const raw = buildInterchange();
    const tampered = raw.replace("ST*837*0001~", "ST*837~");
    const ix = parseX12(tampered);
    // ST-02 empty, SE-02 = "0001" → mismatch.
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
  });

  it("preserves a body segment between ST and SE verbatim", () => {
    const raw = buildInterchange({ transactionBody: ["BHT*0019*00*REF*20250101*1200*CH"] });
    const ix = parseX12(raw);
    expect(ix.warnings).toHaveLength(0);
    expect(ix.groups[0]?.transactions[0]?.rawSegments).toContain(
      "BHT*0019*00*REF*20250101*1200*CH",
    );
    // The decoded segment surface preserves the segment id + 1-indexed elements.
    const decoded = ix.groups[0]?.transactions[0]?.segments[1];
    expect(decoded?.id).toBe("BHT");
    expect(decoded?.elements[1]).toBe("0019");
    expect(decoded?.elements[4]).toBe("20250101");
  });

  it("survives a second GS opening before the first GE — closes both tx and group", () => {
    // ISA → GS → ST → (no SE) → GS → ST → SE → GE → IEA
    // The second GS forces the first group to close while a tx is open.
    const raw = buildInterchange();
    const tampered = raw.replace(
      "ST*837*0001~",
      "ST*837*0001~GS*HC*S*R*20250101*1200*2*X*005010X222A2~ST*837*0001~",
    );
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    // First group: open ST never closed → MISSING_SE; group itself never
    // closed by GE → MISSING_GE.
    expect(codes).toContain(WARNING_CODES.X12_MISSING_SE);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_GE);
  });

  it("survives an IEA reached while a transaction is still open — closes tx with MISSING_SE", () => {
    // ISA → GS → ST → (no SE) → (no GE) → IEA
    const raw = buildInterchange();
    const tampered = raw.replace("SE*2*0001~", "").replace("GE*1*1~", "");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_SE);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_GE);
  });

  it("survives EOF mid-transaction (no SE, no GE, no IEA) — closes everything best-effort", () => {
    const raw = buildInterchange();
    const tampered = raw
      .replace("SE*2*0001~", "")
      .replace("GE*1*1~", "")
      .replace("IEA*1*000000001~", "");
    const ix = parseX12(tampered);
    const codes = ix.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_SE);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_GE);
    expect(codes).toContain(WARNING_CODES.X12_MISSING_IEA);
    expect(ix.iea).toBeUndefined();
    expect(ix.groups[0]?.ge).toBeUndefined();
    expect(ix.groups[0]?.transactions[0]?.se).toBeUndefined();
  });

  it("flags body segments that appear outside any transaction as UNEXPECTED_SEGMENT", () => {
    const raw = buildInterchange();
    // Insert a body segment between GE and IEA — there's no open
    // transaction, so Phase 2 surfaces it as `X12_UNEXPECTED_SEGMENT`
    // (Phase 1 silently dropped it) and continues lenient-never-throw.
    const tampered = raw.replace("GE*1*1~", "GE*1*1~ZZZ*STRAY*BYTES~");
    const ix = parseX12(tampered);
    expect(ix.iea?.elements[0]).toBe("IEA");
    const unexpected = ix.warnings.filter((w) => w.code === WARNING_CODES.X12_UNEXPECTED_SEGMENT);
    expect(unexpected).toHaveLength(1);
    expect(unexpected[0]?.message).toContain("ZZZ");
  });

  it("never echoes a non-spec-shape segment id in UNEXPECTED_SEGMENT messages (PHI safety)", () => {
    const raw = buildInterchange();
    // Hostile input: the "segment" outside any transaction has a name
    // that could carry PHI (a long alphanumeric blob). Phase 2's
    // unexpected-segment warning MUST NOT echo it — `(non-spec)` is
    // substituted to keep the H-PHI invariant intact.
    const tampered = raw.replace("GE*1*1~", "GE*1*1~JOHNDOEMRN98765*STRAY*BYTES~");
    const ix = parseX12(tampered);
    const unexpected = ix.warnings.filter((w) => w.code === WARNING_CODES.X12_UNEXPECTED_SEGMENT);
    expect(unexpected).toHaveLength(1);
    expect(unexpected[0]?.message).toContain("(non-spec)");
    expect(unexpected[0]?.message).not.toContain("JOHNDOEMRN98765");
  });
});

describe("parseX12 — strict mode", () => {
  it("escalates the first Tier-2 warning into a thrown X12ParseError", () => {
    const raw = buildInterchange({ version: "00401" });
    try {
      parseX12(raw, { strict: true });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ParseError);
      if (err instanceof X12ParseError) {
        // Under strict mode the runtime code is a WarningCode string.
        expect(err.code as string).toBe(WARNING_CODES.X12_PRE_005010);
      }
    }
  });

  it("does not escalate when the input is spec-clean", () => {
    const raw = buildInterchange();
    expect(() => parseX12(raw, { strict: true })).not.toThrow();
  });
});

describe("parseX12 — onWarning callback", () => {
  it("invokes the callback once per warning, then accumulates on `warnings`", () => {
    const raw = buildInterchange({ version: "00401" });
    const seen: X12ParseWarning[] = [];
    const ix = parseX12(raw, { onWarning: (w) => seen.push(w) });
    expect(seen.map((w) => w.code)).toEqual(ix.warnings.map((w) => w.code));
  });

  it("does not let a throwing callback break the parser", () => {
    const raw = buildInterchange({ version: "00401" });
    let called = 0;
    const ix = parseX12(raw, {
      onWarning: () => {
        called += 1;
        throw new Error("boom");
      },
    });
    expect(called).toBeGreaterThan(0);
    expect(ix.groups).toHaveLength(1);
  });
});

describe("parseX12 — round-trip byte-exact ISA preservation", () => {
  it("preserves the canonical Medicare ISA verbatim", () => {
    const isa = buildIsa();
    const raw = buildInterchange();
    const ix = parseX12(raw);
    expect(ix.isa.raw).toBe(isa);
    expect(ix.isa.raw.length).toBe(106);
  });

  it("preserves Availity `^` repetition ISA verbatim", () => {
    const isa = buildIsa({ repetition: "^" });
    const raw = buildInterchange({ repetition: "^" });
    expect(parseX12(raw).isa.raw).toBe(isa);
  });

  it("preserves BCBS `\\` sub-element ISA verbatim", () => {
    const isa = buildIsa({ component: "\\" });
    const raw = buildInterchange({ component: "\\" });
    expect(parseX12(raw).isa.raw).toBe(isa);
  });

  it("preserves an envelope without trailing CRLF verbatim", () => {
    const isa = buildIsa();
    const raw = buildInterchange({ trailingCrlf: false });
    expect(parseX12(raw).isa.raw).toBe(isa);
  });
});

/**
 * Unit + golden tests for the Phase 8 spec-clean serializer (`serializeX12`).
 *
 * Three contracts are locked here:
 *
 * 1. **Round-trip goldens.** For every v1 transaction, `serializeX12(parseX12(
 *    fixture))` reproduces the committed `test/fixtures/golden/<name>.edi`
 *    byte-for-byte. Regenerate with `pnpm tsx
 *    test/scripts/gen-serialize-goldens.ts` (the explicit acknowledgement that
 *    the emit surface changed).
 * 2. **Idempotency fixed point + zero warnings.** Re-parsing a golden and
 *    re-serializing it is a byte-level no-op, and a Tier-1 input never makes
 *    the serializer warn.
 * 3. **Spec-clean reconciliation.** With `{ specClean: true }` the serializer
 *    flags stale SE-01 / GE-01 / IEA-01 counts and mismatched control-number
 *    pairs via `onWarning`, NEVER silently correcting them - corrected counts
 *    are emitted only with `{ recomputeCounts: true }`, and control NUMBERS are
 *    never rewritten.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { parseX12, serializeX12, WARNING_CODES, type X12ParseWarning } from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";
import { SERIALIZE_GOLDEN_CASES } from "./scripts/serialize-golden-cases.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "fixtures");

function readFixture(rel: string): string {
  return readFileSync(join(fixturesRoot, rel), "utf8");
}

function readGolden(name: string): string {
  return readFileSync(join(fixturesRoot, "golden", `${name}.edi`), "utf8");
}

describe("serializeX12: round-trip goldens across all v1 transactions", () => {
  for (const { name, fixture } of SERIALIZE_GOLDEN_CASES) {
    it(`${name}: serialize(parse(fixture)) reproduces the locked golden byte-for-byte`, () => {
      const serialized = serializeX12(parseX12(readFixture(fixture)));
      expect(serialized).toBe(readGolden(name));
    });

    it(`${name}: idempotency fixed point - serialize(parse(golden)) === golden`, () => {
      const golden = readGolden(name);
      expect(serializeX12(parseX12(golden))).toBe(golden);
    });

    it(`${name}: a Tier-1 golden never makes the serializer warn (spec-clean mode)`, () => {
      const warnings: X12ParseWarning[] = [];
      serializeX12(parseX12(readGolden(name)), {
        specClean: true,
        onWarning: (w) => warnings.push(w),
      });
      expect(warnings).toHaveLength(0);
    });
  }
});

describe("serializeX12: byte-faithful default mode", () => {
  it("reconstructs a CRLF-free interchange exactly (default opts)", () => {
    const isa = buildIsa({ controlNumber: "000000001" });
    const raw =
      isa +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
      "ST*837*0001~" +
      "BHT*0019*00*REF*20250101*1200*CH~" +
      "SE*3*0001~" +
      "GE*1*1~" +
      "IEA*1*000000001~";
    expect(serializeX12(parseX12(raw))).toBe(raw);
  });

  it("never warns in default mode even when the model carries stale counts", () => {
    const ix = parseX12(mismatchedRaw());
    const warnings: X12ParseWarning[] = [];
    serializeX12(ix, { onWarning: (w) => warnings.push(w) });
    expect(warnings).toHaveLength(0);
  });
});

describe("serializeX12: spec-clean reconciliation", () => {
  it("flags stale SE-01 / GE-01 / IEA-01 counts and the ISA-13/IEA-02 control pair", () => {
    const ix = parseX12(mismatchedRaw());
    const warnings: X12ParseWarning[] = [];
    serializeX12(ix, { specClean: true, onWarning: (w) => warnings.push(w) });
    const codes = warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_SEGMENT_COUNT_MISMATCH);
    expect(codes).toContain(WARNING_CODES.X12_TRANSACTION_COUNT_MISMATCH);
    expect(codes).toContain(WARNING_CODES.X12_GROUP_COUNT_MISMATCH);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
  });

  it("warning messages never echo element values (H-PHI bounded-metadata only)", () => {
    const ix = parseX12(mismatchedRaw());
    const warnings: X12ParseWarning[] = [];
    serializeX12(ix, { specClean: true, onWarning: (w) => warnings.push(w) });
    for (const w of warnings) {
      // SENDER / RECEIVER are the only "values" in the fixture; the bounded
      // numeric/positional messages must never carry them.
      expect(w.message).not.toContain("SENDER");
      expect(w.message).not.toContain("RECEIVER");
    }
  });

  it("does NOT correct counts without recomputeCounts - output keeps verbatim values", () => {
    const ix = parseX12(mismatchedRaw());
    const out = serializeX12(ix, { specClean: true });
    expect(out).toContain("SE*9*0001~");
    expect(out).toContain("GE*5*1~");
    expect(out).toContain("IEA*3*000000002~");
  });

  it("substitutes recomputed counts with recomputeCounts but NEVER rewrites control numbers", () => {
    const ix = parseX12(mismatchedRaw());
    const out = serializeX12(ix, { specClean: true, recomputeCounts: true });
    expect(out).toContain("SE*2*0001~"); // recomputed: ST + SE = 2
    expect(out).toContain("GE*1*1~"); // recomputed: 1 transaction
    expect(out).toContain("IEA*1*000000002~"); // count fixed to 1; IEA-02 control number left as-is
  });
});

describe("serializeX12: spec-clean control-pair + trailing-byte edges", () => {
  it("flags an ST-02/SE-02 control mismatch (counts otherwise clean)", () => {
    const isa = buildIsa({ controlNumber: "000000001" });
    const raw =
      isa +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
      "ST*837*0001~" +
      "SE*2*0002~" + // SE-01=2 matches; SE-02=0002 != ST-02=0001
      "GE*1*1~" +
      "IEA*1*000000001~";
    const warnings: X12ParseWarning[] = [];
    serializeX12(parseX12(raw), { specClean: true, onWarning: (w) => warnings.push(w) });
    expect(warnings.map((w) => w.code)).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
    expect(warnings.some((w) => w.message.includes("ST-02/SE-02"))).toBe(true);
  });

  it("flags a GS-06/GE-02 control mismatch (counts otherwise clean)", () => {
    const isa = buildIsa({ controlNumber: "000000001" });
    const raw =
      isa +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
      "ST*837*0001~" +
      "SE*2*0001~" +
      "GE*1*2~" + // GE-02=2 != GS-06=1
      "IEA*1*000000001~";
    const warnings: X12ParseWarning[] = [];
    serializeX12(parseX12(raw), { specClean: true, onWarning: (w) => warnings.push(w) });
    expect(warnings.some((w) => w.message.includes("GS-06/GE-02"))).toBe(true);
  });

  it("reconciles a truncated SE (no SE-01/SE-02) without throwing, even with recomputeCounts", () => {
    const isa = buildIsa({ controlNumber: "000000001" });
    const raw =
      isa +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
      "ST*837*0001~" +
      "SE~" + // truncated: neither SE-01 (count) nor SE-02 (control) present
      "GE*1*1~" +
      "IEA*1*000000001~";
    const ix = parseX12(raw);
    const warnings: X12ParseWarning[] = [];
    // recomputeCounts must degrade gracefully when the SE has no element to
    // substitute - the segment is emitted verbatim, not corrupted.
    const out = serializeX12(ix, {
      specClean: true,
      recomputeCounts: true,
      onWarning: (w) => warnings.push(w),
    });
    expect(out).toContain("SE~");
    const codes = warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_SEGMENT_COUNT_MISMATCH);
    expect(codes).toContain(WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH);
  });

  it("appends trailing bytes (post-IEA content) verbatim to the emit", () => {
    const isa = buildIsa({ controlNumber: "000000001" });
    const raw =
      isa +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
      "ST*837*0001~" +
      "SE*2*0001~" +
      "GE*1*1~" +
      "IEA*1*000000001~" +
      "ZZ*TAIL~"; // stray post-IEA content preserved on trailingBytes
    const ix = parseX12(raw);
    expect(ix.trailingBytes).toBe("ZZ*TAIL~");
    expect(serializeX12(ix)).toBe(raw);
  });
});

/**
 * A minimal interchange whose envelope counts and ISA-13/IEA-02 control pair
 * are deliberately wrong: SE-01=9 (actual 2), GE-01=5 (actual 1), IEA-01=3
 * (actual 1), IEA-02=000000002 vs ISA-13=000000001. GS-06/GE-02 (1) and
 * ST-02/SE-02 (0001) match, so only the seeded deviations fire.
 */
function mismatchedRaw(): string {
  const isa = buildIsa({ controlNumber: "000000001" });
  return (
    isa +
    "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
    "ST*837*0001~" +
    "SE*9*0001~" +
    "GE*5*1~" +
    "IEA*3*000000002~"
  );
}

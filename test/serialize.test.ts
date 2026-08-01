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

import { readFileSync, readdirSync } from "node:fs";
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
    expect(warnings.some((w) => w.message.includes("ST-02") && w.message.includes("SE-02"))).toBe(
      true,
    );
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
    expect(warnings.some((w) => w.message.includes("GS-06") && w.message.includes("GE-02"))).toBe(
      true,
    );
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
 * Every committed `.edi` fixture, discovered from disk rather than listed, so
 * a fixture added later is covered without anyone remembering to add it here.
 */
function allFixtures(): readonly string[] {
  return readdirSync(fixturesRoot, { recursive: true, encoding: "utf8" })
    .filter((p) => p.endsWith(".edi"))
    .sort();
}

/** Strip every CR / LF so two texts can be compared modulo line breaks. */
function withoutLineBreaks(text: string): string {
  return text.replace(/\r\n|\r|\n/g, "");
}

/**
 * Everything semantically meaningful the parser decoded, deliberately EXCLUDING
 * the verbatim `.raw` framing. Two interchanges with the same shape carry the
 * same values in the same places, whatever whitespace separated them on the
 * wire.
 */
function modelShape(ix: ReturnType<typeof parseX12>): string {
  return JSON.stringify({
    isa: ix.isa.elements,
    iea: ix.iea?.elements,
    ta1: ix.ta1Segments.map((t) => t.elements),
    trailing: ix.trailingBytes,
    groups: ix.groups.map((g) => ({
      gs: g.gs.elements,
      ge: g.ge?.elements,
      tx: g.transactions.map((t) => ({
        st: t.st.elements,
        se: t.se?.elements,
        segments: t.segments.map((s) => [s.id, s.elements]),
      })),
    })),
  });
}

/**
 * What the default emit mode preserves ACROSS THIS CORPUS, locked against every
 * committed fixture rather than against the 13 goldens (which are already in the
 * serializer's image, so they can only ever demonstrate the easy half).
 *
 * **Read the scope before quoting these.** They are measured over the committed
 * fixtures, which are all well-formed enough that every segment lands inside a
 * transaction. They are NOT universal properties of `serializeX12`: the
 * `round-trip escape hatches` suite below exhibits several inputs, none
 * containing a line break, for which the emit differs from its source, and one
 * where a warning does not survive the round trip. `KNOWN-LIMITATIONS.md` holds
 * the canonical list for consumers.
 */
describe("serializeX12: what the default mode preserves across the whole corpus", () => {
  const fixtures = allFixtures();

  // Guard against a vacuous suite: these properties are only interesting
  // because the corpus really does contain pretty-printed sources. If a future
  // change compacted every fixture, the sweep below would still pass while
  // testing nothing, so assert the mix is present.
  it("the corpus contains both pretty-printed and compact fixtures", () => {
    const prettyPrinted = fixtures.filter((f) => /[\r\n]/.test(readFixture(f)));
    expect(fixtures.length).toBeGreaterThanOrEqual(56);
    expect(prettyPrinted.length).toBeGreaterThan(0);
    expect(prettyPrinted.length).toBeLessThan(fixtures.length);
  });

  for (const fixture of fixtures) {
    describe(fixture, () => {
      it("differs from its source by line breaks and nothing else", () => {
        const raw = readFixture(fixture);
        const out = serializeX12(parseX12(raw));
        expect(withoutLineBreaks(out)).toBe(withoutLineBreaks(raw));
      });

      it("re-parses to an identical model with an identical warning stream", () => {
        const raw = readFixture(fixture);
        const before = parseX12(raw);
        const after = parseX12(serializeX12(before));
        expect(modelShape(after)).toBe(modelShape(before));
        expect(after.warnings.map((w) => w.code)).toEqual(before.warnings.map((w) => w.code));
      });

      it("is a fixed point: serializing the emit again is a byte-level no-op", () => {
        const out = serializeX12(parseX12(readFixture(fixture)));
        expect(serializeX12(parseX12(out))).toBe(out);
      });

      // Scoped deliberately: across THIS corpus, line breaks are the only
      // reason an emit differs from its source, so the biconditional holds
      // here. It does not hold in general (see `round-trip escape hatches`).
      it("is byte-identical to its source exactly when the source has no line breaks", () => {
        const raw = readFixture(fixture);
        const out = serializeX12(parseX12(raw));
        expect(out === raw).toBe(!/[\r\n]/.test(raw));
      });
    });
  }
});

describe("serializeX12: the line-break normalization is uniform across EOL styles", () => {
  const compact =
    buildIsa({ controlNumber: "000000001" }) +
    "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
    "ST*837*0001~" +
    "BHT*0019*00*REF*20250101*1200*CH~" +
    "SE*3*0001~" +
    "GE*1*1~" +
    "IEA*1*000000001~";

  // A single CR, a single LF, or one CRLF pair after a terminator is absorbed.
  for (const [label, eol] of [
    ["LF", "\n"],
    ["CRLF", "\r\n"],
    ["bare CR", "\r"],
  ] as const) {
    it(`${label}-delimited input emits the identical compact form`, () => {
      const decorated = compact.split("~").join(`~${eol}`).slice(0, -eol.length);
      expect(serializeX12(parseX12(decorated))).toBe(compact);
    });
  }

  // The tolerance is exactly one optional CR then one optional LF, so a blank
  // line between segments is NOT absorbed. It is REPORTED, and it is ALSO
  // swallowed: the stray break opens a segment whose name is unrecognized, and
  // an unexpected segment outside a transaction is not kept, so everything the
  // break displaced goes with it. On a uniformly double-spaced file that is the
  // entire interchange body. Asserted in full here because an earlier revision
  // of this test checked only the warning and described the input as "reported
  // not swallowed", which is exactly backwards.
  it("a blank line between segments is reported AND swallows the interchange body", () => {
    const decorated = compact.split("~").join("~\n\n").slice(0, -2);
    const ix = parseX12(decorated);
    expect(ix.warnings.map((w) => w.code)).toContain(WARNING_CODES.X12_UNEXPECTED_SEGMENT);
    // The loss, stated rather than implied:
    expect(ix.groups).toHaveLength(0);
    expect(ix.iea).toBeUndefined();
    expect(serializeX12(ix).slice(buildIsa({ controlNumber: "000000001" }).length)).toBe("");
  });
});

/**
 * The five inputs that falsify "no line breaks implies a byte-exact round
 * trip". None of these contains a line break, and every one of them emits
 * something other than its source, so the corpus sweep's biconditional is a
 * property of THIS CORPUS and not of `serializeX12`.
 *
 * Note which ones are SILENT: only the stray segment and the trailing bytes
 * warn at all. The doubled terminator, the missing final terminator and the
 * TA1 reorder each produce an empty `warnings` array, as does the line-break
 * normalization itself, so a clean warning stream is NOT evidence that a round
 * trip will be byte-exact. Asserted per case below rather than described, since
 * an earlier revision of this file called the doubled terminator "the one
 * genuinely silent case" when four of the six are silent.
 *
 * Every case here reproduces on the base commit: this suite documents
 * long-standing behaviour rather than locking anything this slice changed. The
 * point is that the committed fixtures contain no instance of any of them, so
 * without these cases the sweep above would stay green while the prose around
 * it claimed more than the sweep could see.
 */
describe("serializeX12: round-trip escape hatches that do not involve line breaks", () => {
  const head =
    buildIsa({ controlNumber: "000000001" }) +
    "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
    "ST*837*0001~" +
    "SE*2*0001~" +
    "GE*1*1~";

  it("drops a segment sitting outside any transaction, and its warning does not recur", () => {
    const raw = `${head}REF*ZZ*VENDORTAG~IEA*1*000000001~`;
    expect(/[\r\n]/.test(raw)).toBe(false);

    const first = parseX12(raw);
    expect(first.warnings.map((w) => w.code)).toContain(WARNING_CODES.X12_UNEXPECTED_SEGMENT);

    const out = serializeX12(first);
    expect(out).not.toBe(raw);
    // The segment is gone from the emit entirely, value and all.
    expect(out).not.toContain("VENDORTAG");
    // And the warning cannot be recovered from the emit: a consumer who
    // re-derives warnings from a serialized copy silently loses this one.
    expect(parseX12(out).warnings.map((w) => w.code)).not.toContain(
      WARNING_CODES.X12_UNEXPECTED_SEGMENT,
    );
  });

  it("absorbs a doubled segment terminator outside a transaction with NO warning", () => {
    const raw = `${head}~IEA*1*000000001~`;
    const ix = parseX12(raw);
    expect(serializeX12(ix)).not.toBe(raw);
    expect(ix.warnings).toHaveLength(0); // silent
  });

  it("supplies a missing final segment terminator, with NO warning", () => {
    const raw = `${head}IEA*1*000000001`;
    const ix = parseX12(raw);
    const out = serializeX12(ix);
    expect(out).not.toBe(raw);
    expect(out).toBe(`${raw}~`);
    expect(ix.warnings).toHaveLength(0); // silent
  });

  // Unlike the others this one loses nothing: the TA1 is on the model, the
  // warning stream is identical both ways, and only its POSITION moves. It
  // still falsifies a byte-exact round trip. No claim is made here about where
  // ASC X12 requires a TA1 to sit; this asserts what the library does.
  it("reorders a TA1 that followed a functional group, with NO warning", () => {
    const raw = `${head}TA1*000000001*250101*1200*A*000~IEA*1*000000001~`;
    const ix = parseX12(raw);
    const out = serializeX12(ix);
    expect(out).not.toBe(raw);
    expect(ix.warnings).toHaveLength(0); // silent
    // Reordered, not dropped: the TA1 leads the body in the emit.
    expect(ix.ta1Segments).toHaveLength(1);
    expect(out).toContain("TA1*000000001*250101*1200*A*000~");
    expect(out.indexOf("TA1*")).toBeLessThan(out.indexOf("GS*"));
    expect(raw.indexOf("TA1*")).toBeGreaterThan(raw.indexOf("GS*"));
    // Nothing semantic moved: same warnings, and it is still a fixed point.
    expect(parseX12(out).warnings).toHaveLength(0);
    expect(serializeX12(parseX12(out))).toBe(out);
  });

  it("re-joins post-IEA trailing bytes rather than preserving them verbatim", () => {
    // Two trailing segments, the second unterminated: the walker joins the
    // leftover slices and appends one terminator, so the bytes shift.
    const raw = `${head}IEA*1*000000001~ZZ*TAIL~ZZ*NOTERM`;
    const out = serializeX12(parseX12(raw));
    expect(out).not.toBe(raw);
    expect(out).toBe(`${raw}~`);
  });

  it("each escape-hatch input is itself line-break free, and none round-trips", () => {
    for (const raw of [
      `${head}REF*ZZ*VENDORTAG~IEA*1*000000001~`,
      `${head}~IEA*1*000000001~`,
      `${head}IEA*1*000000001`,
      `${head}IEA*1*000000001~ZZ*TAIL~ZZ*NOTERM`,
      `${head}TA1*000000001*250101*1200*A*000~IEA*1*000000001~`,
    ]) {
      expect(/[\r\n]/.test(raw)).toBe(false);
      expect(serializeX12(parseX12(raw))).not.toBe(raw);
    }
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

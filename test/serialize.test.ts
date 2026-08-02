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

import {
  FATAL_CODES,
  parseX12,
  serializeX12,
  WARNING_CODES,
  type X12ParseWarning,
} from "../src/index.js";

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
 * transaction, so this sweep cannot exercise `orphanSegments` at all (asserted
 * below: zero fixtures produce one). They are NOT universal properties of
 * `serializeX12`: the `round-trip escape hatches` suite below exhibits several
 * inputs, none containing a line break, for which the emit differs from its
 * source. `KNOWN-LIMITATIONS.md` holds the canonical list for consumers.
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

  it("no fixture produces an orphan segment, so this sweep does not cover them", () => {
    // States the sweep's blind spot rather than leaving it implied. The
    // orphan path is covered by its own suite against constructed inputs.
    const withOrphans = fixtures.filter((f) => parseX12(readFixture(f)).orphanSegments.length > 0);
    expect(withOrphans).toEqual([]);
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

  /**
   * Every sequence over {CR, LF} of length 0 to 3 inclusive: 1 + 2 + 4 + 8 =
   * 15 inputs, enumerated rather than hand-listed so no shape is quietly
   * omitted. All 15 are absorbed and frame identically.
   *
   * The bound used to be exactly one optional CR then one optional LF, which
   * admitted 4 of these 15 (none, CR, LF, CR+LF) and lost the interchange body
   * on the other 11 - measured on the base commit, where each of those 11
   * yielded `groups: []`. A run of CR / LF between segments is never itself
   * structural, because `detectDelimiters` refuses a CR or an LF in the ISA-16
   * segment-terminator position as the Tier-3 fatal `X12_INVALID_DELIMITERS`
   * (asserted below), so widening the run cannot swallow a terminator.
   *
   * This is a statement about THIS library's tolerance, not about what ASC X12
   * requires between segments. No clause is claimed either way.
   */
  const crlfSequences: string[] = [""];
  for (const len of [1, 2, 3]) {
    for (let mask = 0; mask < 2 ** len; mask++) {
      let seq = "";
      for (let bit = 0; bit < len; bit++) seq += (mask >> bit) & 1 ? "\n" : "\r";
      crlfSequences.push(seq);
    }
  }

  const describeSeq = (seq: string): string =>
    seq === "" ? "no separator" : [...seq].map((c) => (c === "\r" ? "CR" : "LF")).join("+");

  it("enumerates all 15 CR/LF sequences of length 0 to 3", () => {
    // Guards the sweep below against silently shrinking.
    expect(crlfSequences).toHaveLength(15);
    expect(new Set(crlfSequences).size).toBe(15);
  });

  for (const seq of crlfSequences) {
    it(`${describeSeq(seq)} between segments emits the identical compact form`, () => {
      const decorated =
        seq === "" ? compact : compact.split("~").join(`~${seq}`).slice(0, -seq.length);
      const ix = parseX12(decorated);
      // Framing is uniform: same model, no diagnostics, same emit.
      expect(ix.groups).toHaveLength(1);
      expect(ix.groups[0]?.transactions).toHaveLength(1);
      // elements[0] is the segment id, so IEA-02 (the control number that
      // must match ISA-13) is elements[2].
      expect(ix.iea?.elements[2]).toBe("000000001");
      expect(ix.warnings).toEqual([]);
      expect(ix.orphanSegments).toEqual([]);
      expect(serializeX12(ix)).toBe(compact);
    });
  }

  it("a trailing CR/LF run after the final terminator is absorbed, not kept as trailingBytes", () => {
    // Same tolerance at the end of the document. On the base commit `~\n\n`
    // here produced `trailingBytes` of "\n~" - a byte the input never
    // contained - plus a warning.
    for (const tail of ["", "\n", "\n\n", "\r\n\r\n", "\n\n\n"]) {
      const ix = parseX12(compact + tail);
      expect(ix.trailingBytes).toBeUndefined();
      expect(ix.warnings).toEqual([]);
      expect(serializeX12(ix)).toBe(compact);
    }
  });

  it("refuses a CR or LF segment terminator, so a CR/LF run is never structural", () => {
    // The premise the widened tolerance rests on. Asserted rather than
    // assumed: if either of these ever parsed, absorbing a run of CR / LF
    // between segments could swallow a real terminator.
    for (const term of ["\r", "\n"]) {
      const isa = buildIsa({ controlNumber: "000000001", segment: term });
      const doc = `${isa}GS*HC*S*R*20250101*1200*1*X*005010X222A2${term}IEA*1*000000001${term}`;
      expect(() => parseX12(doc)).toThrowError(
        expect.objectContaining({ code: FATAL_CODES.X12_INVALID_DELIMITERS }),
      );
    }
  });
});

/**
 * The four inputs that falsify "no line breaks implies a byte-exact round
 * trip". None of these contains a line break, and every one of them emits
 * something other than its source, so the corpus sweep's biconditional is a
 * property of THIS CORPUS and not of `serializeX12`.
 *
 * **The stray segment is STILL one of these**, and that is worth stating
 * because this slice changed the model half of it. A segment outside a
 * transaction is now retained on `ix.orphanSegments` rather than discarded, so
 * the decoded value survives; the EMIT still does not reproduce it, so it and
 * its warning are still absent from a round trip. Counting the line-break
 * normalization, `KNOWN-LIMITATIONS.md` lists SIX constructs the default emit
 * does not reproduce, five of which need no line break.
 *
 * Note which ones are SILENT: of the six, only the stray segment and the
 * trailing bytes warn at all. The doubled terminator, the missing final
 * terminator and the TA1 reorder each produce an empty `warnings` array, as
 * does the line-break normalization itself, so four of the six are silent and
 * a clean warning stream is NOT evidence that a round trip will be byte-exact.
 * Asserted per case below rather than described.
 *
 * Every case that remains here reproduces on the base commit: this suite
 * documents long-standing behaviour rather than locking anything this slice
 * changed. The point is that the committed fixtures contain no instance of any
 * of them, so without these cases the sweep above would stay green while the
 * prose around it claimed more than the sweep could see.
 */
describe("serializeX12: round-trip escape hatches that do not involve line breaks", () => {
  const head =
    buildIsa({ controlNumber: "000000001" }) +
    "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
    "ST*837*0001~" +
    "SE*2*0001~" +
    "GE*1*1~";

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

  it("drops a segment sitting outside any transaction from the EMIT, warning included", () => {
    // The model half of this changed (see the `orphanSegments` suite); the
    // emit half did not, and this is where that is pinned.
    const raw = `${head}REF*ZZ*VENDORTAG~IEA*1*000000001~`;
    expect(/[\r\n]/.test(raw)).toBe(false);

    const first = parseX12(raw);
    expect(first.warnings.map((w) => w.code)).toContain(WARNING_CODES.X12_UNEXPECTED_SEGMENT);
    // Retained on the model, which is what this slice fixed:
    expect(first.orphanSegments).toHaveLength(1);

    const out = serializeX12(first);
    expect(out).not.toBe(raw);
    // But absent from the emit, value and all.
    expect(out).not.toContain("VENDORTAG");
    // And the warning cannot be recovered from the emit: a consumer who
    // re-derives warnings from a serialized copy still loses this one.
    expect(parseX12(out).warnings.map((w) => w.code)).not.toContain(
      WARNING_CODES.X12_UNEXPECTED_SEGMENT,
    );
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
 * `X12Interchange.orphanSegments` - the surface that closes the MODEL half of
 * the silent loss.
 *
 * Before this slice a segment the envelope grammar could not place was raised
 * as `X12_UNEXPECTED_SEGMENT` and then discarded outright: absent from the
 * model as well as the emit, so its bytes were unrecoverable. Measured on the
 * base commit, none of the nine positions below retained anything.
 *
 * **The emit half is deliberately NOT fixed here**, and the "escape hatches"
 * suite above still pins the stray segment as a construct the emit does not
 * reproduce. See `KNOWN-LIMITATIONS.md` case 2: `segmentIndex` indexes the
 * INPUT stream, the emit is not in input order (it hoists `ta1Segments`), and
 * replaying by index therefore splices the orphan into whatever occupies that
 * slot in the output. The `never corrupts a transaction` suite below is the
 * regression test for the version of this slice that tried it.
 *
 * Every position is enumerated because the drop was in a shared fall-through,
 * so a fix that covered only the case that was reported would leave the rest.
 */
describe("parseX12: segments outside a transaction are retained on the model", () => {
  const isa = buildIsa({ controlNumber: "000000001" });
  const gs = "GS*HC*S*R*20250101*1200*1*X*005010X222A2~";
  const closed = `${isa}${gs}ST*837*0001~SE*2*0001~GE*1*1~`;

  /** Every structural position at which a segment can fall outside a transaction. */
  const cases: ReadonlyArray<readonly [string, string, number]> = [
    ["a body segment between GE and IEA", `${closed}REF*ZZ*VENDORTAG~IEA*1*000000001~`, 1],
    [
      "a body segment between an SE and its group's GE",
      `${isa}${gs}ST*837*0001~SE*2*0001~REF*ZZ*VENDORTAG~GE*1*1~IEA*1*000000001~`,
      1,
    ],
    [
      "a body segment between GS and the first ST",
      `${isa}${gs}REF*ZZ*VENDORTAG~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~`,
      1,
    ],
    ["an ST with no open group", `${isa}ST*837*0001~SE*2*0001~IEA*1*000000001~`, 2],
    ["an SE with no open transaction", `${isa}${gs}SE*2*0001~GE*1*1~IEA*1*000000001~`, 1],
    ["a GE with no open group", `${isa}GE*1*1~IEA*1*000000001~`, 1],
    [
      "a TA1 inside an open group",
      `${isa}${gs}TA1*000000001*250101*1200*A*000~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~`,
      1,
    ],
    ["a body segment with no group at all", `${isa}REF*ZZ*VENDORTAG~IEA*1*000000001~`, 1],
    ["two orphans in sequence", `${closed}REF*ZZ*ONE~REF*ZZ*TWO~IEA*1*000000001~`, 2],
  ];

  it("covers nine constructed positions", () => {
    // A guard against the table silently shrinking, not a claim that these
    // are the only inputs that can produce an orphan. Retention runs through
    // one chokepoint (`recordOrphan`), so coverage does not depend on this
    // list being exhaustive.
    expect(cases).toHaveLength(9);
  });

  for (const [label, raw, expectedCount] of cases) {
    describe(label, () => {
      it("is retained on orphanSegments rather than dropped", () => {
        const ix = parseX12(raw);
        expect(ix.orphanSegments).toHaveLength(expectedCount);
        for (const orphan of ix.orphanSegments) {
          expect(raw).toContain(orphan.raw);
          expect(orphan.segment.id.length).toBeGreaterThan(0);
        }
      });

      it("raises exactly one warning per orphan, joinable by segmentIndex", () => {
        const ix = parseX12(raw);
        const unexpected = ix.warnings.filter(
          (w) => w.code === WARNING_CODES.X12_UNEXPECTED_SEGMENT,
        );
        expect(unexpected).toHaveLength(expectedCount);
        // The documented join key: every orphan's index is the position of
        // one such warning, and the two sets correspond one-for-one.
        expect(ix.orphanSegments.map((o) => o.segmentIndex)).toEqual(
          unexpected.map((w) => w.position.segmentIndex),
        );
      });

      it("is NOT re-emitted, and the emit is still a fixed point", () => {
        // The documented limitation, pinned rather than left to prose. The
        // orphan does not come back, so neither does its warning.
        const before = parseX12(raw);
        const out = serializeX12(before);
        const after = parseX12(out);
        expect(after.orphanSegments).toEqual([]);
        expect(after.warnings.map((w) => w.code)).not.toContain(
          WARNING_CODES.X12_UNEXPECTED_SEGMENT,
        );
        // Whatever it does emit must be stable under a second pass.
        expect(serializeX12(after)).toBe(out);
      });

      it("keeps the orphan's element values, not just its id", () => {
        const ix = parseX12(raw);
        for (const orphan of ix.orphanSegments) {
          // Every element the sender transmitted is recoverable. This is the
          // half that "the warning told you" never gave a consumer.
          for (const value of orphan.segment.elements) {
            if (value !== "") expect(orphan.raw).toContain(value);
          }
        }
      });
    });
  }

  it("a well-formed interchange has no orphans at all", () => {
    // Negative control: the surface must stay empty on ordinary traffic, so a
    // green sweep above is not just "everything is an orphan".
    const ix = parseX12(`${closed}IEA*1*000000001~`);
    expect(ix.orphanSegments).toEqual([]);
    expect(ix.warnings).toEqual([]);
  });

  it("still refuses to invent an orphan for a doubled terminator", () => {
    // A doubled terminator delimits a zero-length segment carrying nothing, so
    // there is nothing to retain and it stays a framing-only difference.
    const ix = parseX12(`${closed}~IEA*1*000000001~`);
    expect(ix.orphanSegments).toEqual([]);
    expect(ix.warnings).toEqual([]);
  });

  it("does not record a segment whose first element is empty", () => {
    // Long-standing: such a segment has no id for the walker to dispatch on
    // and is skipped with no warning. Stated here so the JSDoc on
    // `X12OrphanSegment` cannot quietly claim it retains EVERYTHING.
    const ix = parseX12(`${closed}*PAYLOAD*MORE~IEA*1*000000001~`);
    expect(ix.orphanSegments).toEqual([]);
    expect(ix.warnings.map((w) => w.code)).not.toContain(WARNING_CODES.X12_UNEXPECTED_SEGMENT);
  });

  it("serializes an interchange assembled without an orphanSegments key", () => {
    // `orphanSegments` is required on `X12Interchange`, but `serializeX12` is
    // also reachable from untyped callers and from objects assembled against
    // an earlier shape. Reading the missing key must not turn a working emit
    // into a raw TypeError.
    const source = `${closed}IEA*1*000000001~`;
    const parsed = parseX12(source);
    const { orphanSegments: _omitted, ...withoutOrphans } = parsed;
    expect("orphanSegments" in withoutOrphans).toBe(false);
    expect(serializeX12(withoutOrphans as typeof parsed)).toBe(source);
  });
});

/**
 * Regression suite for the version of this slice that DID replay orphans at
 * their recorded `segmentIndex`.
 *
 * That looked correct against every position the suite above enumerates, and
 * was unsound: `segmentIndex` indexes the INPUT stream, while `serializeX12`
 * emits `ta1Segments` hoisted ahead of the groups and skips the zero-length
 * segment a doubled terminator produces. Either shifts the output's indices
 * away from the input's, so replaying by index put the orphan wherever that
 * slot happened to land.
 *
 * The measured outcomes were worse than the loss they replaced: a stray `ZZ`
 * segment inside an 835's ST..SE body with NO warning on the re-parse, a stray
 * `SE` closing the transaction early and corrupting SE-01, and an orphan
 * carried across the IEA into `trailingBytes`. Base merely dropped the segment
 * and stayed structurally clean.
 *
 * These assertions hold on the base commit too. They are not a claim that this
 * slice improved the emit; they are a fence around the emit so a future attempt
 * at positional re-emission cannot reintroduce the corruption silently.
 */
describe("serializeX12: an orphan is never spliced into a transaction", () => {
  const isa = buildIsa({ controlNumber: "000000001" });
  const gs = "GS*HP*S*R*20250101*1200*1*X*005010X221A1~";

  /** A TA1 after the group is hoisted to the front by the emit, shifting indices. */
  const withHoistedTa1 =
    `${isa}${gs}ST*835*0001~CLP*ACCT1*1*100*0~SE*3*0001~` +
    `ZZ*STRAY~GE*1*1~TA1*000000001*250101*1200*A*000~IEA*1*000000001~`;

  it("does not move a stray segment into an ST..SE body when a TA1 is reordered", () => {
    const after = parseX12(serializeX12(parseX12(withHoistedTa1)));
    const body = after.groups[0]?.transactions[0]?.rawSegments ?? [];
    // The transaction must contain exactly what it did on the way in.
    expect(body).toEqual(["ST*835*0001", "CLP*ACCT1*1*100*0", "SE*3*0001"]);
    expect(body.some((s) => s.startsWith("ZZ"))).toBe(false);
  });

  it("does not let a stray SE close a transaction early or rewrite SE-01", () => {
    const raw =
      `${isa}${gs}ST*835*0001~CLP*ACCT1*1*100*0~SE*3*0001~` +
      `SE*9*9999~GE*1*1~TA1*000000001*250101*1200*A*000~IEA*1*000000001~`;
    const after = parseX12(serializeX12(parseX12(raw)));
    const tx = after.groups[0]?.transactions[0];
    // SE-01 is a safety-critical count. It must still be the real one.
    expect(tx?.se?.elements[1]).toBe("3");
    expect(tx?.se?.elements[2]).toBe("0001");
    expect(after.warnings.map((w) => w.code)).not.toContain(
      WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH,
    );
  });

  it("does not let an orphan ST fabricate or truncate a transaction set", () => {
    // An ST before any GS is an orphan (`st-without-gs`). An ST *inside* an
    // open group is not an orphan at all: it legitimately opens the next
    // transaction, which is why this case has to lead with it.
    const raw = `${isa}ST*835*9999~${gs}ST*835*0001~CLP*ACCT1*1*100*0~SE*3*0001~GE*1*1~IEA*1*000000001~`;
    const before = parseX12(raw);
    expect(before.orphanSegments).toHaveLength(1);
    expect(before.groups[0]?.transactions).toHaveLength(1);

    const after = parseX12(serializeX12(before));
    expect(after.groups[0]?.transactions).toHaveLength(1);
    expect(after.groups[0]?.transactions[0]?.rawSegments).toEqual([
      "ST*835*0001",
      "CLP*ACCT1*1*100*0",
      "SE*3*0001",
    ]);
    expect(after.warnings.map((w) => w.code)).not.toContain(WARNING_CODES.X12_MISSING_SE);
  });

  it("does not carry an orphan across the IEA into trailingBytes", () => {
    // A doubled terminator ahead of the orphan puts a hole in the index space.
    const raw = `${isa}${gs}ST*835*0001~SE*2*0001~GE*1*1~~ZZ*STRAY~IEA*1*000000001~`;
    const after = parseX12(serializeX12(parseX12(raw)));
    expect(after.trailingBytes).toBeUndefined();
    expect(after.warnings.map((w) => w.code)).not.toContain(WARNING_CODES.X12_TRAILING_GARBAGE);
  });

  it("keeps spec-clean warning positions pointing at the segment they describe", () => {
    // The orphan must not shift the running index the reconciliation uses.
    const raw = `${isa}${gs}REF*ZZ*STRAY~ST*835*0001~CLP*A*1*100*0~SE*9*0001~GE*1*1~IEA*1*000000001~`;
    const seen: X12ParseWarning[] = [];
    const out = serializeX12(parseX12(raw), {
      specClean: true,
      onWarning: (w) => seen.push(w),
    });
    const countWarning = seen.find((w) => w.code === WARNING_CODES.X12_SEGMENT_COUNT_MISMATCH);
    expect(countWarning).toBeDefined();
    // Whatever index it names must actually be the ST in the emitted stream.
    const emitted = out.slice(isa.length).split("~").filter(Boolean);
    const idx = countWarning?.position.segmentIndex ?? -1;
    expect(emitted[idx - 1]).toBe("ST*835*0001");
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

/**
 * `serializeX12(ix, { byteExact: true })`: the text `parseX12` read, returned as it was for an
 * interchange the caller did not edit, and the default emit for one they did.
 *
 * The corpus sweep runs over every committed fixture, found on disk, so a fixture added later is
 * covered. The constructed cases are the five the default emit does not reproduce, each on an input
 * with no line breaks, so a pass here is not the line-break case alone.
 */

import { Buffer } from "node:buffer";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildInterchange,
  parseX12,
  serializeX12,
  type X12Interchange,
  type X12ParseWarning,
} from "../src/index.js";
import { sourceOf } from "../src/parser/source.js";

import { buildIsa } from "./_helpers/envelope.js";

const fixturesRoot = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

/** Every committed `.edi` fixture, discovered from disk rather than listed. */
function allFixtures(): readonly string[] {
  return readdirSync(fixturesRoot, { recursive: true, encoding: "utf8" })
    .filter((p) => p.endsWith(".edi"))
    .sort();
}

function readFixture(rel: string): string {
  return readFileSync(join(fixturesRoot, rel), "latin1");
}

const ISA = buildIsa({ controlNumber: "000000001" });
const BODY =
  "GS*HC*S*R*20250101*1200*1*X*005010X222A2~" +
  "ST*837*0001~" +
  "BHT*0019*00*REF*20250101*1200*CH~" +
  "SE*3*0001~" +
  "GE*1*1~";
const COMPACT = `${ISA}${BODY}IEA*1*000000001~`;

/** The five constructs the default emit does not reproduce, none with a line break but the first. */
const CONSTRUCTS: readonly (readonly [string, string])[] = [
  ["line breaks between segments", COMPACT.replaceAll("~", "~\r\n")],
  ["a doubled segment terminator", `${ISA}${BODY}~IEA*1*000000001~`],
  ["a missing final segment terminator", `${ISA}${BODY}IEA*1*000000001`],
  ["bytes after the IEA", `${COMPACT}ZZ*TAIL~~ZZ*MORE`],
  [
    "a TA1 that followed a functional group",
    `${ISA}${BODY}TA1*000000001*250101*1200*A*000~IEA*1*000000001~`,
  ],
];

describe("serializeX12 byteExact: an unedited parse returns its input", () => {
  for (const [name, raw] of CONSTRUCTS) {
    it(`${name}: the default emit differs, the byte-exact emit is the input`, () => {
      const ix = parseX12(raw);
      expect(serializeX12(ix)).not.toBe(raw);
      expect(serializeX12(ix, { byteExact: true })).toBe(raw);
    });
  }

  it("a second byte-exact emit of the same interchange is the input again", () => {
    const raw = CONSTRUCTS[0]?.[1] as string;
    const ix = parseX12(raw);
    expect(serializeX12(ix, { byteExact: true })).toBe(raw);
    expect(serializeX12(ix, { byteExact: true })).toBe(raw);
  });

  it("a Buffer input comes back as its bytes read one character per octet", () => {
    const bytes = Buffer.from(`${ISA}${BODY.replace("CH~", "CHé~")}IEA*1*000000001~\n`, "utf8");
    const out = serializeX12(parseX12(bytes), { byteExact: true });
    expect(Buffer.from(out, "latin1").equals(bytes)).toBe(true);
  });

  it("an interchange parsed in strict mode or eagerly is the input too", () => {
    const raw = CONSTRUCTS[0]?.[1] as string;
    expect(serializeX12(parseX12(raw, { strict: true }), { byteExact: true })).toBe(raw);
    expect(serializeX12(parseX12(raw, { lazy: false }), { byteExact: true })).toBe(raw);
  });

  it("without the option the emit is today's, unchanged", () => {
    const raw = CONSTRUCTS[0]?.[1] as string;
    const ix = parseX12(raw);
    expect(serializeX12(ix, { byteExact: false })).toBe(COMPACT);
    expect(serializeX12(ix)).toBe(COMPACT);
  });
});

describe("serializeX12 byteExact: across every committed fixture", () => {
  const fixtures = allFixtures();

  it("the corpus holds fixtures whose default emit differs from their source", () => {
    const differ = fixtures.filter((f) => {
      const raw = readFixture(f);
      return serializeX12(parseX12(raw)) !== raw;
    });
    expect(differ.length).toBeGreaterThan(0);
  });

  for (const fixture of fixtures) {
    it(`${fixture}: an unedited parse returns the fixture byte for byte`, () => {
      const bytes = readFileSync(join(fixturesRoot, fixture));
      const out = serializeX12(parseX12(bytes), { byteExact: true });
      expect(Buffer.from(out, "latin1").equals(bytes)).toBe(true);
    });
  }
});

describe("serializeX12 byteExact: an edited or unknown interchange gets the default emit", () => {
  const raw = COMPACT.replaceAll("~", "~\n");

  it("a copy with one segment changed emits from the model", () => {
    const ix = parseX12(raw);
    const group = ix.groups[0] as X12Interchange["groups"][number];
    const edited: X12Interchange = {
      ...ix,
      groups: [{ ...group, gs: { ...group.gs, raw: group.gs.raw.replace("*S*", "*T*") } }],
    };
    const out = serializeX12(edited, { byteExact: true });
    expect(out).toBe(serializeX12(edited));
    expect(out).toContain("GS*HC*T*R*");
    expect(out).not.toContain("\n");
  });

  it("an unchanged copy is not the parse, so it emits from the model", () => {
    const ix = parseX12(raw);
    expect(serializeX12({ ...ix }, { byteExact: true })).toBe(COMPACT);
  });

  it("a segment changed in place on the parse itself emits from the model", () => {
    const ix = parseX12(raw);
    const group = ix.groups[0] as { gs: { raw: string; elements: readonly string[] } };
    group.gs = { ...group.gs, raw: group.gs.raw.replace("*S*", "*T*") };
    const out = serializeX12(ix, { byteExact: true });
    expect(out).toBe(serializeX12(ix));
    expect(out).toContain("GS*HC*T*R*");
  });

  it("an edit made after a byte-exact emit is seen by the next one", () => {
    const ix = parseX12(raw);
    expect(serializeX12(ix, { byteExact: true })).toBe(raw);
    const group = ix.groups[0] as { gs: { raw: string; elements: readonly string[] } };
    group.gs = { ...group.gs, raw: group.gs.raw.replace("*S*", "*T*") };
    expect(serializeX12(ix, { byteExact: true })).toBe(serializeX12(ix));
  });

  it("a built interchange emits from the model", () => {
    const ix = buildInterchange({
      senderId: "SENDER",
      receiverId: "RECEIVER",
      interchangeDate: "250101",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      groups: [
        {
          functionalIdCode: "HC",
          groupControlNumber: "1",
          versionRelease: "005010X222A2",
          transactions: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0001",
              segments: [["REF", "ZZ", "VALUE"]],
            },
          ],
        },
      ],
    });
    expect(serializeX12(ix, { byteExact: true })).toBe(serializeX12(ix));
  });
});

describe("serializeX12 byteExact with specClean", () => {
  const stale = `${ISA}${BODY.replace("SE*3*", "SE*9*")}IEA*1*000000001~`.replaceAll("~", "~\n");

  it("still reports what it reconciles, and returns the input when nothing is rewritten", () => {
    const warnings: X12ParseWarning[] = [];
    const out = serializeX12(parseX12(stale), {
      byteExact: true,
      specClean: true,
      onWarning: (w) => warnings.push(w),
    });
    expect(out).toBe(stale);
    expect(warnings.map((w) => w.code)).toEqual(["X12_SEGMENT_COUNT_MISMATCH"]);
  });

  it("a recomputed count is an edit, so the emit carries it", () => {
    const ix = parseX12(stale);
    const out = serializeX12(ix, { byteExact: true, specClean: true, recomputeCounts: true });
    expect(out).toBe(serializeX12(ix, { specClean: true, recomputeCounts: true }));
    expect(out).toContain("SE*3*0001~");
  });

  it("recomputing counts that already agree changes nothing, so the input comes back", () => {
    const raw = COMPACT.replaceAll("~", "~\n");
    const out = serializeX12(parseX12(raw), {
      byteExact: true,
      specClean: true,
      recomputeCounts: true,
    });
    expect(out).toBe(raw);
  });
});

describe("the source kept beside a parse", () => {
  it("works out the default emit of the source once, and reuses it", () => {
    const ix = parseX12(COMPACT);
    let calls = 0;
    const emitOf = (text: string): string => {
      calls += 1;
      return `${text}!`;
    };
    expect(sourceOf(ix, emitOf)).toEqual({ text: COMPACT, emit: `${COMPACT}!` });
    expect(sourceOf(ix, emitOf)).toEqual({ text: COMPACT, emit: `${COMPACT}!` });
    expect(calls).toBe(1);
  });

  it("has nothing for an interchange parseX12 did not return", () => {
    expect(sourceOf({ ...parseX12(COMPACT) }, () => "")).toBeUndefined();
  });
});

/**
 * The `@cosyte/x12/arbitraries` subpath: what each generator promises, checked on fixed seeds so
 * every run reaches the same cases, and how the subpath is packaged (an optional peer dependency
 * that the main entry point never loads).
 */

import { Buffer } from "node:buffer";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  WARNING_CODES,
  X12_TR3_CONFORMANCE,
  buildInterchange,
  escapeRelease,
  parseX12,
  serializeX12,
  type Delimiters,
  type X12ParseWarning,
} from "../src/index.js";
import {
  delimiters,
  hostileInput,
  interchange,
  interchangeSpec,
  interchangeText,
  segment,
  transactionSetType,
  value,
} from "../src/arbitraries/index.js";
import {
  FUNCTIONAL_IDENTIFIERS,
  OMITTED_TRANSACTION_SETS,
  TRANSACTION_SET_TYPES,
  deriveTransactionSetTypes,
  interchangeParts,
  writeClean,
  type InterchangeParts,
} from "../src/arbitraries/interchange.js";
import {
  ENVELOPE_QUIRKS,
  SEGMENT_QUIRKS,
  applyEdits,
  applySegmentQuirk,
  writeMessy,
  type EnvelopeQuirk,
  type Mess,
} from "../src/arbitraries/messy.js";
import {
  BODY_SEGMENT_IDS,
  DELIMITER_POOL,
  STANDARD_DELIMITERS,
  VALUE_SPECIALS,
  elementShape,
  endingWith,
  releaseValue,
  writeElement,
} from "../src/arbitraries/text.js";
import { FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET } from "../src/code-lists/functional-identifier.js";

const root = join(import.meta.dirname, "..");

/** Draw `n` values from a fixed seed. */
function draw<T>(arb: fc.Arbitrary<T>, n = 200, seed = 20261110): T[] {
  return fc.sample(arb, { numRuns: n, seed });
}

/** The warning codes a parse of `raw` gives. */
function codes(raw: string): string[] {
  return parseX12(raw).warnings.map((w) => w.code);
}

/** A fixed interchange: two groups, the first with two transaction sets of two body segments. */
const PARTS: InterchangeParts = (() => {
  const [parts] = fc.sample(
    interchangeParts({ delimiters: fc.constant(STANDARD_DELIMITERS), maxSegments: 3 }).filter(
      (p) =>
        p.ta1.length === 0 &&
        p.groups.length === 2 &&
        p.groups[0]?.transactions.length === 2 &&
        p.groups[0].transactions.every((t) => t.body.length >= 2),
    ),
    { numRuns: 1, seed: 7 },
  );
  if (parts === undefined) throw new Error("no fixed interchange");
  return parts;
})();

/** A mess with nothing in it. */
const CLEAN_MESS: Mess = { lineBreak: "", envelope: [], segments: [], data: "AB*C" };

describe("delimiters", () => {
  it("gives four distinct characters from the pool, the standard set among them", () => {
    const sets = draw(delimiters());
    for (const d of sets) {
      const chars = [d.element, d.repetition, d.component, d.segment];
      expect(new Set(chars).size).toBe(4);
      for (const c of chars) expect(DELIMITER_POOL).toContain(c);
    }
    expect(sets).toContainEqual(STANDARD_DELIMITERS);
    expect(sets.some((d) => d.element !== "*")).toBe(true);
    expect(DELIMITER_POOL).not.toContain("?");
  });

  it("honours the delimiters option", () => {
    expect(draw(delimiters({ delimiters: "standard" }), 10)).toEqual(
      Array.from({ length: 10 }, () => STANDARD_DELIMITERS),
    );
    const any = draw(delimiters({ delimiters: "any" }), 50);
    expect(any.some((d) => d.element !== "*" || d.segment !== "~")).toBe(true);
  });

  it("every set frames an interchange the parser reads with those delimiters", () => {
    for (const d of draw(delimiters())) {
      const text = writeClean({ ...PARTS, d, isa: PARTS.isa.map(isaWith(d)) });
      expect(parseX12(text).delimiters).toEqual(d);
    }
  });
});

/** Put a delimiter set's repetition and component separators in their ISA slots. */
function isaWith(d: Delimiters): (el: string, i: number) => string {
  return (el, i) => (i === 11 ? d.repetition : i === 16 ? d.component : el);
}

describe("value", () => {
  it("honours its length bounds and draws only from the X12 character sets", () => {
    const values = draw(value(), 500);
    expect(values.every((v) => v.length >= 1 && v.length <= 12)).toBe(true);
    const allowed = new Set([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", ...VALUE_SPECIALS]);
    expect(values.every((v) => [...v].every((c) => allowed.has(c)))).toBe(true);
    expect(values.some((v) => v.includes("?"))).toBe(true);
    expect(values.some((v) => v.includes("~"))).toBe(true);
    expect(draw(value({ minLength: 0, maxLength: 2 }), 100).every((v) => v.length <= 2)).toBe(true);
    expect(draw(value({ minLength: 0, maxLength: 2 }), 100)).toContain("");
  });
});

describe("segment, elementShape and endingWith", () => {
  it("writes a body segment id, then elements ending on a non-empty one", () => {
    const specs = draw(segment(), 300);
    for (const [id, ...elements] of specs) {
      expect(BODY_SEGMENT_IDS).toContain(id);
      expect(elements.length).toBeGreaterThanOrEqual(1);
      expect(elements.length).toBeLessThanOrEqual(8);
      expect(elements.at(-1)).not.toBe("");
    }
    expect(specs.some((s) => s.slice(1).includes(""))).toBe(true);
  });

  it("honours the ids, the most elements and the values", () => {
    const specs = draw(segment({ ids: ["NTE"], maxElements: 2, values: fc.constant("V") }), 50);
    for (const s of specs) {
      expect(s[0]).toBe("NTE");
      expect(s.length).toBeLessThanOrEqual(3);
      expect(s.slice(1).every((v) => v === "V" || v === "")).toBe(true);
    }
    expect(draw(endingWith(fc.constant(0), fc.constant(1), 0), 5)).toEqual(
      Array.from({ length: 5 }, () => [1]),
    );
  });

  it("leaves no BIN, BDS or envelope segment id among the body ids", () => {
    for (const id of ["ISA", "GS", "ST", "SE", "GE", "IEA", "TA1", "BIN", "BDS"]) {
      expect(BODY_SEGMENT_IDS).not.toContain(id);
    }
  });

  it("shapes elements as empty, a single value, or repetitions ending on a value", () => {
    const shapes = draw(elementShape(value()), 400);
    expect(shapes).toContainEqual([[""]]);
    expect(shapes.some((s) => s.length === 2)).toBe(true);
    expect(shapes.some((s) => (s[0]?.length ?? 0) >= 2)).toBe(true);
    for (const s of shapes) {
      if (s.length === 1 && s[0]?.length === 1) continue;
      for (const rep of s) expect(rep.at(-1)).not.toBe("");
    }
  });
});

describe("releaseValue and writeElement", () => {
  it("release every delimiter and the release character, as escapeRelease does", () => {
    const d = STANDARD_DELIMITERS;
    expect(releaseValue("a*b^c:d~e?f", d)).toBe("a?*b?^c?:d?~e??f");
    for (const v of draw(value(), 300)) expect(releaseValue(v, d)).toBe(escapeRelease(v, d));
  });

  it("join components and repetitions with their separators", () => {
    expect(writeElement([["A", "", "B:"], ["C"]], STANDARD_DELIMITERS)).toBe("A::B?:^C");
  });
});

describe("transactionSetType", () => {
  it("copies the library's GS-01 table exactly", () => {
    expect(FUNCTIONAL_IDENTIFIERS).toEqual(FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET);
  });

  it("carries the 275 and the 999, each under the GS-01 its builder writes", () => {
    expect(FUNCTIONAL_IDENTIFIERS["275"]).toBe("PI");
    expect(FUNCTIONAL_IDENTIFIERS["999"]).toBe("FA");
    expect(TRANSACTION_SET_TYPES).toContainEqual({
      id: "275",
      functionalIdCode: "PI",
      version: "006020X314",
    });
    expect(TRANSACTION_SET_TYPES).toContainEqual({
      id: "999",
      functionalIdCode: "FA",
      version: "005010X231A1",
    });
  });

  it("has a type for every conformance row, or a listed reason for leaving it out", () => {
    // A row the generator does not draw is a transaction set no property here ever builds, so
    // leaving one out is a decision with a reason, never the side effect of a missing table row.
    for (const row of X12_TR3_CONFORMANCE) {
      const typed = TRANSACTION_SET_TYPES.some(
        (t) => t.id === row.transaction && t.version === row.tr3,
      );
      const reason = Object.hasOwn(OMITTED_TRANSACTION_SETS, row.transaction)
        ? OMITTED_TRANSACTION_SETS[row.transaction]
        : undefined;
      expect(
        typed || reason !== undefined,
        `the ${row.transaction} (${String(row.tr3)}) row is neither a type nor listed with a reason`,
      ).toBe(true);
    }
    // Only the rows that name no guide are left out: the 997 and the TA1.
    expect(Object.keys(OMITTED_TRANSACTION_SETS).sort()).toEqual(["997", "TA1"]);
    for (const reason of Object.values(OMITTED_TRANSACTION_SETS)) expect(reason).not.toBe("");
    for (const id of Object.keys(OMITTED_TRANSACTION_SETS)) {
      expect(TRANSACTION_SET_TYPES.some((t) => t.id === id)).toBe(false);
    }
  });

  it("derives each type from the conformance declaration, in its order", () => {
    const declared = X12_TR3_CONFORMANCE.filter(
      (row) => !Object.hasOwn(OMITTED_TRANSACTION_SETS, row.transaction),
    );
    expect(TRANSACTION_SET_TYPES).toEqual(
      declared.map((row) => ({
        id: row.transaction,
        functionalIdCode: FUNCTIONAL_IDENTIFIERS[row.transaction],
        version: row.tr3,
      })),
    );
    expect(Object.isFrozen(TRANSACTION_SET_TYPES)).toBe(true);
    expect(new Set(draw(transactionSetType(), 400).map((t) => t.version))).toEqual(
      new Set(TRANSACTION_SET_TYPES.map((t) => t.version)),
    );
  });

  it("refuses, naming the row, a declared guide with no GS-01 and no listed reason", () => {
    const rows = [{ transaction: "123", tr3: "005010X999" }];
    expect(() => deriveTransactionSetTypes(rows, {}, {})).toThrow(
      new Error(
        "@cosyte/x12/arbitraries: the 123 row of X12_TR3_CONFORMANCE (005010X999) has no GS-01 functional identifier and no listed reason to leave it out",
      ),
    );
    // A row that names no guide refuses the same way: it is only left out when listed.
    expect(() => deriveTransactionSetTypes([{ transaction: "123", tr3: null }], {}, {})).toThrow(
      /the 123 row of X12_TR3_CONFORMANCE \(no guide\) has no GS-01/u,
    );
    // A listed row is left out, and a row with its GS-01 becomes a type.
    expect(
      deriveTransactionSetTypes(
        [
          { transaction: "123", tr3: null },
          { transaction: "456", tr3: "005010X998" },
        ],
        { "456": "ZZ" },
        { "123": "names no guide" },
      ),
    ).toEqual([{ id: "456", functionalIdCode: "ZZ", version: "005010X998" }]);
    // A row with a GS-01 but no guide cannot be a type, so it needs a listed reason as well.
    expect(() =>
      deriveTransactionSetTypes([{ transaction: "456", tr3: null }], { "456": "ZZ" }, {}),
    ).toThrow(/the 456 row of X12_TR3_CONFORMANCE \(no guide\) has no guide/u);
    // A table key off the prototype is not a GS-01.
    expect(() =>
      deriveTransactionSetTypes([{ transaction: "constructor", tr3: "005010X997" }], {}, {}),
    ).toThrow(/the constructor row/u);
  });
});

describe("interchange and its clean text", () => {
  it("parses spec-clean text with every option set, back to the same bytes", () => {
    const parts = draw(
      interchangeParts({
        delimiters: delimiters({ delimiters: "any" }),
        maxGroups: 1,
        maxTransactions: 1,
        maxSegments: 1,
        maxElements: 1,
      }),
      100,
    );
    for (const p of parts) {
      expect(p.groups).toHaveLength(1);
      expect(p.groups[0]?.transactions).toHaveLength(1);
      expect(p.groups[0]?.transactions[0]?.body.length).toBeLessThanOrEqual(1);
      const text = writeClean(p);
      const ix = parseX12(text);
      expect(ix.warnings).toEqual([]);
      expect(serializeX12(ix)).toBe(text);
    }
  });

  it("writes an ISA of 106 bytes, sometimes a TA1, and ST-03 only sometimes", () => {
    const parts = draw(interchangeParts(), 200);
    for (const p of parts) expect(writeClean(p).indexOf(p.d.segment)).toBe(105);
    expect(parts.some((p) => p.ta1.length === 1)).toBe(true);
    const sts = parts.flatMap((p) => p.groups.flatMap((g) => g.transactions.map((t) => t.st)));
    expect(sts.some((st) => st.length === 4)).toBe(true);
    expect(sts.some((st) => st.length === 3)).toBe(true);
  });

  it("deep-equals what parseX12 returns for its text, and prints as the call that rebuilds it", () => {
    for (const ix of draw(interchange(), 50)) {
      const text = serializeX12(ix);
      expect(parseX12(text)).toEqual(ix);
      expect(Object.isFrozen(ix)).toBe(true);
      expect(fc.stringify(ix)).toBe(`parseX12(${JSON.stringify(text)})`);
    }
  });

  it("clones by parsing again, so a clone is a new object equal to the first", () => {
    const [ix] = draw(interchange(), 1);
    const clone = (ix as unknown as Record<symbol, () => unknown>)[fc.cloneMethod]?.();
    expect(clone).not.toBe(ix);
    expect(clone).toEqual(ix);
  });
});

describe("interchangeSpec", () => {
  it("builds with no refusal and no warning, with every option set or none", () => {
    const specs = [
      ...draw(interchangeSpec(), 60),
      ...draw(
        interchangeSpec({
          delimiters: delimiters({ delimiters: "standard" }),
          maxGroups: 1,
          maxTransactions: 1,
          maxSegments: 1,
          maxElements: 1,
        }),
        60,
      ),
    ];
    for (const spec of specs) expect(buildInterchange(spec).warnings).toEqual([]);
    const small = specs.slice(60);
    for (const spec of small) {
      expect(spec.elementSeparator).toBe("*");
      expect(spec.groups).toHaveLength(1);
      expect(spec.groups[0]?.transactions).toHaveLength(1);
      for (const s of spec.groups[0]?.transactions[0]?.segments ?? []) expect(s.length).toBe(2);
    }
  });
});

describe("interchangeText and its quirks", () => {
  it("leaves a clean interchange clean when the mess holds nothing", () => {
    const text = writeMessy(PARTS, CLEAN_MESS);
    expect(text).toBe(writeClean(PARTS));
    expect(codes(text)).toEqual([]);
  });

  it("writes the line break after every segment and drops the final terminator when asked", () => {
    const text = writeMessy(PARTS, {
      ...CLEAN_MESS,
      lineBreak: "\r\n",
      envelope: ["noFinalTerminator"],
    });
    expect(`${text.replaceAll("\r\n", "")}~`).toBe(writeClean(PARTS));
    expect(text.endsWith("~")).toBe(false);
    expect(serializeX12(parseX12(text))).toBe(writeClean(PARTS));
  });

  const expected: Readonly<Record<EnvelopeQuirk, readonly string[]>> = {
    pre5010: [WARNING_CODES.X12_PRE_005010],
    seCount: [],
    geCount: [WARNING_CODES.X12_TRANSACTION_COUNT_MISMATCH],
    ieaCount: [WARNING_CODES.X12_GROUP_COUNT_MISMATCH],
    seControl: [WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH],
    geControl: [WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH],
    ieaControl: [WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH],
    dropSe: [WARNING_CODES.X12_MISSING_SE],
    dropGe: [WARNING_CODES.X12_MISSING_GE],
    dropIea: [WARNING_CODES.X12_MISSING_IEA],
    ta1InGroup: [WARNING_CODES.X12_UNEXPECTED_SEGMENT],
    orphanBody: [WARNING_CODES.X12_UNEXPECTED_SEGMENT],
    strayTrailers: [WARNING_CODES.X12_UNEXPECTED_SEGMENT],
    emptySegment: [],
    noIdSegment: [],
    trailingGarbage: [WARNING_CODES.X12_TRAILING_GARBAGE],
    noFinalTerminator: [],
    endsOnRelease: [WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH],
    endsInBinary: [WARNING_CODES.X12_TRAILING_GARBAGE],
  };

  it.each(ENVELOPE_QUIRKS.map((q) => [q]))("%s parses, with the warnings it should raise", (q) => {
    const text = writeMessy(PARTS, { ...CLEAN_MESS, envelope: [q] });
    expect(text).not.toBe(writeClean(PARTS));
    const got = codes(text);
    for (const code of expected[q]) expect(got).toContain(code);
    const once = serializeX12(parseX12(text));
    expect(serializeX12(parseX12(once))).toBe(once);
  });

  it("seCount is caught by the spec-clean emit", () => {
    const warnings: X12ParseWarning[] = [];
    serializeX12(parseX12(writeMessy(PARTS, { ...CLEAN_MESS, envelope: ["seCount"] })), {
      specClean: true,
      onWarning: (w) => warnings.push(w),
    });
    expect(warnings.map((w) => w.code)).toEqual([WARNING_CODES.X12_SEGMENT_COUNT_MISMATCH]);
  });

  it.each(SEGMENT_QUIRKS.map((q) => [q]))("%s changes one body segment, and parses", (q) => {
    const text = writeMessy(PARTS, { ...CLEAN_MESS, segments: [{ at: 5, quirk: q }] });
    expect(text).not.toBe(writeClean(PARTS));
    parseX12(text);
  });

  it("applySegmentQuirk makes each change to a segment's wire elements", () => {
    const seg = { id: "REF", elements: [[["EA"]], [["A", "B"]]] };
    const d = PARTS.d;
    const at = (q: (typeof SEGMENT_QUIRKS)[number], data = "XY"): string[] =>
      applySegmentQuirk(seg, q, PARTS, data).map((s) => s.join(d.element));
    expect(at("trailingElements")).toEqual(["REF*EA*A:B**"]);
    expect(at("trailingComponent")).toEqual(["REF*EA*A:B:"]);
    expect(at("lowercase")).toEqual(["ref*EA*A:B"]);
    expect(at("padded")).toEqual(["REF*EA*  A:B  "]);
    expect(at("releaseNonDelimiter")).toEqual(["REF*EA*A:B?Q"]);
    expect(at("outsideCharacter")).toEqual(["REF*EA*A:BΩ"]);
    expect(at("releaseBeforeTerminator")).toEqual(["REF*EA*A:B?"]);
    expect(at("emptySegment")).toEqual(["REF*EA*A:B", ""]);
    expect(at("binarySegment", "a*~")).toEqual(["REF*EA*A:B", "BIN*3*a*~"]);
  });

  it("ignores segment quirks when there is no body segment to put them on", () => {
    const empty: InterchangeParts = {
      ...PARTS,
      groups: PARTS.groups.map((g) => ({
        ...g,
        transactions: g.transactions.map((t) => ({
          ...t,
          body: [],
          se: ["SE", "2", t.se[2] ?? ""],
        })),
      })),
    };
    const text = writeMessy(empty, { ...CLEAN_MESS, segments: [{ at: 0, quirk: "lowercase" }] });
    expect(text).toBe(writeClean(empty));
  });

  it("carries every kind of mess across a sample, and always parses", () => {
    const texts = draw(interchangeText(), 300);
    for (const text of texts) parseX12(text);
    expect(texts.some((t) => t.includes("\r\n"))).toBe(true);
    expect(texts.some((t) => codes(t).includes(WARNING_CODES.X12_MISSING_IEA))).toBe(true);
  });
});

describe("hostileInput", () => {
  it("gives strings and Buffers, and stays within maxLength for the random runs", () => {
    const inputs = draw(hostileInput(), 400);
    expect(inputs.some((i) => Buffer.isBuffer(i))).toBe(true);
    expect(inputs.some((i) => typeof i === "string" && i.startsWith("ISA"))).toBe(true);
    expect(inputs.some((i) => typeof i === "string" && i.includes("BIN"))).toBe(true);
    const short = draw(hostileInput({ maxLength: 3 }), 400);
    expect(short.some((i) => typeof i === "string" && i.length <= 3)).toBe(true);
  });

  it("applyEdits cuts, deletes and inserts at positions taken modulo the length", () => {
    expect(applyEdits("abcdef", [{ kind: "cut", at: 10 }])).toBe("abc");
    expect(applyEdits("abcdef", [{ kind: "delete", at: 1, length: 2 }])).toBe("adef");
    expect(applyEdits("abc", [{ kind: "insert", at: 5, text: "XY" }])).toBe("aXYbc");
  });
});

describe("packaging", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
    exports: Record<string, unknown>;
    typesVersions: Record<string, Record<string, string[]>>;
    dependencies?: Record<string, string>;
    peerDependencies: Record<string, string>;
    peerDependenciesMeta: Record<string, { optional?: boolean }>;
  };

  it("exports the subpath for import and require, each with its own types", () => {
    expect(pkg.exports["./arbitraries"]).toEqual({
      import: { types: "./dist/arbitraries.d.ts", default: "./dist/arbitraries.mjs" },
      require: { types: "./dist/arbitraries.d.cts", default: "./dist/arbitraries.cjs" },
    });
    expect(pkg.typesVersions["*"]?.["arbitraries"]).toEqual(["./dist/arbitraries.d.ts"]);
  });

  it("takes fast-check as an optional peer dependency, never a dependency", () => {
    expect(pkg.peerDependencies["fast-check"]).toBeDefined();
    expect(pkg.peerDependenciesMeta["fast-check"]?.optional).toBe(true);
    expect(pkg.dependencies?.["fast-check"]).toBeUndefined();
  });

  it("imports fast-check only under src/arbitraries, and nothing the main entry reaches imports that folder", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(join(dir, e.name))
          : e.name.endsWith(".ts")
            ? [join(dir, e.name)]
            : [],
      );
    const offenders: string[] = [];
    for (const file of walk(join(root, "src"))) {
      const rel = relative(join(root, "src"), file);
      if (rel.startsWith("arbitraries")) continue;
      const text = readFileSync(file, "utf8");
      if (/from\s+["']fast-check["']/u.test(text) || /from\s+["'][./]*arbitraries/u.test(text)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the subpath reaches the library only through its package name", () => {
    for (const file of readdirSync(join(root, "src", "arbitraries"))) {
      const text = readFileSync(join(root, "src", "arbitraries", file), "utf8");
      expect(text).not.toMatch(/from\s+["']\.\.\//u);
    }
  });
});

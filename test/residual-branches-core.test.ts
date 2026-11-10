/**
 * Branches in the core modules (the interchange builder, the loop spec, the
 * parser, profiles, the serializer and the shared transaction helpers) that the
 * feature suites leave unexercised. Each test states the behaviour a caller
 * relies on at that branch: the value read or written, the warning raised or
 * withheld, or the refusal thrown. Every byte here is synthetic.
 */
/* eslint-disable no-sparse-arrays -- a hole in a caller's list is the input several tests here drive */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { requireCallerArray } from "../src/builder/caller-array.js";
import { implementedGuides } from "../src/transactions/shared/declared-guide.js";
import {
  CORE_CODE_COMBINATION_UNEVALUATED_REASONS,
  WARNING_CODES,
  buildInterchange,
  checkCoreCodeCombination,
  checkServiceLineBalance,
  defineLoopSpec,
  defineProfile,
  get271Eligibility,
  get837Claims,
  getAllSegmentValues,
  getSegmentValue,
  parseX12,
  serializeX12,
  type Delimiters,
  type InterchangeSpec,
  type X12Interchange,
  type X12OrphanSegment,
  type X12RemitClaim,
} from "../src/index.js";

import { buildInterchange as buildEnvelope } from "./_helpers/envelope.js";

const DELIMS: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };

function interchangeSpec(overrides: Partial<InterchangeSpec> = {}): InterchangeSpec {
  return {
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "250101",
    interchangeTime: "1200",
    interchangeControlNumber: "1",
    groups: [
      {
        functionalIdCode: "HC",
        groupControlNumber: "1",
        versionRelease: "005010X222A2",
        transactions: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            segments: [["BHT", "0019"]],
          },
        ],
      },
    ],
    ...overrides,
  };
}

function gs04(ix: X12Interchange): string | undefined {
  return ix.groups[0]?.gs.elements[4];
}

describe("buildInterchange: the GS-04 century window", () => {
  it("places a two-digit year of 50 or more in the 1900s", () => {
    expect(gs04(buildInterchange(interchangeSpec({ interchangeDate: "990101" })))).toBe("19990101");
    expect(gs04(buildInterchange(interchangeSpec({ interchangeDate: "500101" })))).toBe("19500101");
  });

  it("places a two-digit year under 50 in the 2000s", () => {
    expect(gs04(buildInterchange(interchangeSpec({ interchangeDate: "490101" })))).toBe("20490101");
  });

  it("passes a date that is not six characters to GS-04 unchanged", () => {
    expect(gs04(buildInterchange(interchangeSpec({ interchangeDate: "20250101" })))).toBe(
      "20250101",
    );
  });

  it("never invents a century for a date whose year is not numeric", () => {
    expect(gs04(buildInterchange(interchangeSpec({ interchangeDate: "AB0101" })))).toBe("AB0101");
  });
});

describe("requireCallerArray: a forged value whose class tag throws", () => {
  it("still refuses with a bounded description instead of propagating the getter's error", () => {
    const hostile = {
      get [Symbol.toStringTag](): string {
        throw new Error("synthetic tag failure");
      },
    };
    const refuse = (message: string): never => {
      throw new Error(message);
    };
    expect(() =>
      requireCallerArray(hostile as unknown as readonly unknown[], "spec.members", refuse),
    ).toThrow(/a non-array "\[object Unknown\]"/u);
  });
});

describe("defineLoopSpec: segment fields", () => {
  it("keeps a segment's position and description on the frozen spec", () => {
    const loop = defineLoopSpec({
      id: "2110",
      trigger: "SVC",
      segments: [
        { id: "SVC", usage: "required", max: 1, position: "0100", description: "Service payment" },
        { id: "DTM", usage: "situational", max: 2 },
      ],
    });
    expect(loop.segments[0]).toEqual({
      id: "SVC",
      usage: "required",
      max: 1,
      position: "0100",
      description: "Service payment",
    });
    expect("position" in (loop.segments[1] ?? {})).toBe(false);
    expect("description" in (loop.segments[1] ?? {})).toBe(false);
  });

  it("skips a hole in a sparse segments array rather than reading it as a segment", () => {
    const segments = [
      { id: "SVC", usage: "required", max: 1 },
      ,
      { id: "DTM", usage: "optional", max: 1 },
    ];
    const loop = defineLoopSpec({
      id: "2110",
      trigger: "SVC",
      segments: segments as Parameters<typeof defineLoopSpec>[0]["segments"],
    });
    expect(loop.segments.map((s) => s.id)).toEqual(["SVC", "DTM"]);
  });
});

function onlySegments(raw: string): readonly { id: string; elements: readonly string[] }[] {
  const ix = parseX12(raw);
  return ix.groups[0]?.transactions[0]?.segments ?? [];
}

function binaryInterchange(body: readonly string[]): string {
  return buildEnvelope({
    functionalIdCode: "PI",
    transactionSetId: "275",
    versionRelease: "005010X210",
    transactionBody: body,
  });
}

describe("binary framing edge cases", () => {
  it("honours a release character inside a BDS element before the length", () => {
    const raw = binaryInterchange(["BDS*B?*64*3*abc", "REF*ZZ*SYNTHAFTER"]);
    const ix = parseX12(raw);
    const segs = ix.groups[0]?.transactions[0]?.segments ?? [];
    expect(segs[1]?.elements).toEqual(["BDS", "B?*64", "3", "abc"]);
    expect(segs[2]?.elements).toEqual(["REF", "ZZ", "SYNTHAFTER"]);
    expect(ix.warnings).toEqual([]);
  });

  it("does not frame a segment whose id only starts with BIN", () => {
    const segs = onlySegments(binaryInterchange(["BINZ*3*abc", "REF*ZZ*SYNTHAFTER"]));
    expect(segs[1]?.elements).toEqual(["BINZ", "3", "abc"]);
    expect(segs[2]?.id).toBe("REF");
  });

  it("raises no warning for a BIN that declares zero octets and carries no data element", () => {
    const ix = parseX12(binaryInterchange(["BIN*0", "REF*ZZ*SYNTHAFTER"]));
    const segs = ix.groups[0]?.transactions[0]?.segments ?? [];
    expect(segs[1]?.elements).toEqual(["BIN", "0"]);
    expect(segs[2]?.id).toBe("REF");
    expect(ix.warnings).toEqual([]);
  });
});

describe("getSegmentValue / getAllSegmentValues: path and delimiter edges", () => {
  const ix = parseX12(
    "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~" +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~ST*837*0001~REF*ZZ*A1:B1^A2~SE*3*0001~GE*1*1~IEA*1*000000001~",
  );
  const ref = ix.groups[0]?.transactions[0]?.segments[1];
  if (ref === undefined) throw new Error("fixture has no REF");

  it("throws a TypeError naming the position when a path continues with anything but '-'", () => {
    expect(() => getSegmentValue(ref, "02X", ix.delimiters)).toThrow(
      /expected '-' or end at position 2/u,
    );
  });

  it("reads an element whole when the delimiter set has no repetition separator", () => {
    const noRepetition: Delimiters = { ...DELIMS, repetition: "" };
    expect(getSegmentValue(ref, "02", noRepetition)).toBe("A1:B1^A2");
    expect(getAllSegmentValues(ref, "02", noRepetition)).toEqual(["A1:B1^A2"]);
  });

  it("splits components literally on a multi-character component separator", () => {
    const wide: Delimiters = { ...DELIMS, component: "1:" };
    // The repetition separator splits first ("A1:B1"), then "1:" splits that into "A" and "B1".
    expect(getSegmentValue(ref, "02-2", wide)).toBe("B1");
  });

  it("answers no values for a repetition index past the last repetition", () => {
    expect(getAllSegmentValues(ref, "02[5]", ix.delimiters)).toEqual([]);
  });

  it("drops a repetition that has no component at the requested index", () => {
    expect(getAllSegmentValues(ref, "02-2", ix.delimiters)).toEqual(["B1"]);
  });
});

describe("defineProfile: lineage and option keys", () => {
  it("lists a name once when a profile extends a parent of the same name", () => {
    const parent = defineProfile({ name: "synthetic-partner" });
    const child = defineProfile({ name: "synthetic-partner", extends: parent });
    expect(child.lineage).toEqual(["synthetic-partner"]);
  });

  it("refuses an empty option key without a misleading 'did you mean' hint", () => {
    let message = "";
    try {
      defineProfile({ name: "synthetic", "": true } as unknown as Parameters<
        typeof defineProfile
      >[0]);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('unknown option key ""');
    expect(message).not.toContain("Did you mean");
  });
});

describe("serializeX12: an orphan whose anchor names a slot the model lacks", () => {
  it("is emitted before the IEA rather than dropped", () => {
    const raw =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~" +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~ST*837*0001~BHT*0019~SE*3*0001~GE*1*1~" +
      "REF*ZZ*SYNTHORPHAN~IEA*1*000000001~";
    const ix = parseX12(raw);
    const orphans: X12OrphanSegment[] = ix.orphanSegments.map((o) => ({
      ...o,
      anchor: { kind: "transaction", groupIndex: 0, transactionIndex: 0, segmentOffset: 99 },
    }));
    expect(orphans).toHaveLength(1);
    const out = serializeX12({ ...ix, orphanSegments: orphans });
    expect(out).toContain("GE*1*1~REF*ZZ*SYNTHORPHAN~IEA*1*000000001~");
    expect(out.match(/SYNTHORPHAN/gu)).toHaveLength(1);
  });
});

describe("validateHl: a top-level HL that names a parent", () => {
  it("warns X12_HL_PARENT_MISMATCH on a 271 information source HL with a parent id", () => {
    const fixture = readFileSync(
      join(__dirname, "fixtures", "eligibility", "271-aaa-subscriber.edi"),
      "utf8",
    ).trimEnd();
    const clean = parseX12(fixture);
    const cleanTx = clean.groups[0]?.transactions[0];
    if (cleanTx === undefined) throw new Error("no transaction");
    const before = get271Eligibility(clean.delimiters, cleanTx);
    expect(before?.warnings.map((w) => w.code)).not.toContain(WARNING_CODES.X12_HL_PARENT_MISMATCH);

    const ix = parseX12(fixture.replace("HL*1**20*1~", "HL*1*9*20*1~"));
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no transaction");
    const eligibility = get271Eligibility(ix.delimiters, tx);
    expect(eligibility?.warnings.map((w) => w.code)).toContain(
      WARNING_CODES.X12_HL_PARENT_MISMATCH,
    );
  });
});

describe("implementedGuides: a conformance row with no TR3", () => {
  it("contributes no guide, so TA1 has nothing to compare a declared guide against", () => {
    expect([...implementedGuides("TA1")]).toEqual([]);
  });
});

describe("checkServiceLineBalance: a sparse service line list", () => {
  it("skips a hole and still evaluates the lines around it", () => {
    const serviceLines = [, { adjustments: [] }] as unknown as X12RemitClaim["serviceLines"];
    const claim = { serviceLines } as unknown as X12RemitClaim;
    const warnings = checkServiceLineBalance(claim, { segmentIndex: 10 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe(WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
    expect(warnings[0]?.position.segmentIndex).toBe(12);
  });
});

describe("checkCoreCodeCombination: a query that is not an object", () => {
  it("answers unevaluated with no table instead of throwing", () => {
    for (const query of [null, 42, "CO"]) {
      expect(
        checkCoreCodeCombination(
          query as unknown as Parameters<typeof checkCoreCodeCombination>[0],
        ),
      ).toEqual({
        outcome: "unevaluated",
        reason: CORE_CODE_COMBINATION_UNEVALUATED_REASONS.NO_TABLE,
        tableVersion: undefined,
      });
    }
  });
});

describe("buildInterchange: a segment whose id slot is undefined", () => {
  it("refuses with X12_BUILD_INVALID_SPEC instead of emitting a segment with no id", () => {
    const spec = interchangeSpec();
    const group = spec.groups[0];
    const tx = group?.transactions[0];
    if (group === undefined || tx === undefined) throw new Error("spec shape");
    const forged = {
      ...spec,
      groups: [
        {
          ...group,
          transactions: [
            { ...tx, segments: [[undefined, "SYNTH"] as unknown as readonly string[]] },
          ],
        },
      ],
    };
    expect(() => buildInterchange(forged)).toThrow(/has no segment id/u);
  });
});

describe("decodeSt03: a dangling release character in ST-03", () => {
  it("is reported once by the parser, not again by the reader, and the guide is not guessed", () => {
    // Only a document that ends inside ST-03 can carry a trailing `?` there: before a
    // terminator the `?` would release it.
    const raw =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~" +
      "GS*HC*S*R*20250101*1200*1*X*005010X222A2~ST*837*0001*005010X222A2?";
    const ix = parseX12(raw);
    const dangling = ix.warnings.filter((w) => w.code === WARNING_CODES.X12_DANGLING_RELEASE_CHAR);
    expect(dangling).toHaveLength(1);
    expect(dangling[0]?.position.elementIndex).toBe(3);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no transaction");
    const sub = get837Claims(ix.delimiters, tx);
    expect(sub?.implementationConventionReference).toBe("005010X222A2?");
    expect(sub?.variant).toBe("unknown");
    expect(sub?.warnings.map((w) => w.code)).not.toContain(WARNING_CODES.X12_DANGLING_RELEASE_CHAR);
    expect(sub?.warnings.map((w) => w.code)).toContain(WARNING_CODES.X12_837_UNKNOWN_VARIANT);
  });
});

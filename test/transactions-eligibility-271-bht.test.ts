/**
 * The 271's BHT, on both sides.
 *
 * 005010X279A1 puts a Beginning of Hierarchical Transaction segment right
 * after the ST of every 271. Before this, `build271` wrote the ST and went
 * straight to the HL loops, so every 271 it built lacked the segment a
 * trading partner checks first; and `get271Eligibility` read a 271 with no
 * BHT with `warnings: []`, so a payer response missing it was accepted with
 * no sign.
 *
 * `build271` now writes the BHT from an optional `header`, every element
 * defaulted except BHT-03, and `get271Eligibility` raises
 * `X12_271_HEADER_ABSENT` at the ST when the transaction set carries none.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  build271,
  ELIGIBILITY_271_BUILD_ERROR_CODES,
  Eligibility271BuildError,
  eligibility271HeaderAbsent,
  get271Eligibility,
  parseX12,
  serializeX12,
  WARNING_CODES,
  type Build271Spec,
  type X12Eligibility,
  type X12Interchange,
} from "../src/index.js";

const ENVELOPE = {
  senderId: "MEDPAY",
  receiverId: "PROVIDER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const SPEC: Build271Spec = {
  envelope: ENVELOPE,
  informationSources: [
    {
      entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE" },
      receivers: [
        {
          entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "ANYTOWN CLINIC" },
          subscribers: [
            {
              traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastName: "DOE",
                firstName: "JANE",
                idQualifier: "MI",
                idCode: "MBR0001",
              },
              benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND" }],
            },
          ],
        },
      ],
    },
  ],
};

function only(ix: X12Interchange): X12Interchange["groups"][number]["transactions"][number] {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("no transaction set");
  return tx;
}

function read(ix: X12Interchange): X12Eligibility {
  const elig = get271Eligibility(ix.delimiters, only(ix));
  if (elig === undefined) throw new Error("not a 271");
  return elig;
}

function refusal(spec: Build271Spec): Eligibility271BuildError {
  try {
    build271(spec);
  } catch (err) {
    if (err instanceof Eligibility271BuildError) return err;
    throw err;
  }
  throw new Error("build271 did not refuse");
}

const GOLDEN = readFileSync(join(__dirname, "fixtures", "golden", "271.edi"), "utf8").trimEnd();

/** The golden 271 with its body replaced and SE-01 recounted. */
function withBody(body: readonly string[]): string {
  const start = GOLDEN.indexOf("~BHT*");
  const end = GOLDEN.indexOf("~SE*");
  const tail = GOLDEN.slice(end).replace(/^~SE\*\d+\*/u, `~SE*${String(body.length + 2)}*`);
  const joined = body.length === 0 ? "" : `~${body.join("~")}`;
  return `${GOLDEN.slice(0, start)}${joined}${tail}`;
}

/** The golden 271's body, BHT through the last EB. */
const GOLDEN_BODY: readonly string[] = GOLDEN.slice(
  GOLDEN.indexOf("~BHT*") + 1,
  GOLDEN.indexOf("~SE*"),
).split("~");

const NO_BHT = GOLDEN_BODY.filter((s) => !s.startsWith("BHT*"));

describe("build271 writes the BHT", () => {
  it("writes it right after the ST, with the defaults, and counts it in SE-01", () => {
    const ix = build271(SPEC);
    const tx = only(ix);
    expect(tx.segments[1]?.id).toBe("BHT");
    expect(tx.segments[2]?.id).toBe("HL");
    const raw = serializeX12(ix);
    expect(raw).toContain("~ST*271*0001*005010X279A1~BHT*0022*11**20260601*1200~HL*1**20*1~");
    expect(tx.se?.elements[1]).toBe(String(tx.segments.length));
  });

  it("writes every header element as given", () => {
    const ix = build271({
      ...SPEC,
      header: {
        hierarchicalStructureCode: "0022",
        purposeCode: "06",
        referenceId: "REQ-0001",
        date: "20260602",
        time: "0930",
      },
    });
    expect(serializeX12(ix)).toContain("~BHT*0022*06*REQ-0001*20260602*0930~");
  });

  it("defaults BHT-04 and BHT-05 to the group date and time", () => {
    const ix = build271({
      ...SPEC,
      envelope: { ...ENVELOPE, groupDate: "20260605", groupTime: "1015" },
      header: { referenceId: "REQ-0002" },
    });
    expect(serializeX12(ix)).toContain("~BHT*0022*11*REQ-0002*20260605*1015~");
  });

  it("escapes a header value that holds a delimiter", () => {
    const ix = build271({ ...SPEC, header: { referenceId: "REQ*1" } });
    expect(serializeX12(ix)).toContain("~BHT*0022*11*REQ?*1*20260601*1200~");
    // The reference keeps its bytes: the BHT still has its five elements.
    expect(only(ix).segments[1]?.elements).toHaveLength(6);
  });

  it("reads back with no warning", () => {
    expect(read(build271(SPEC)).warnings).toEqual([]);
  });

  it.each([
    ["hierarchicalStructureCode", "BHT-01"],
    ["purposeCode", "BHT-02"],
    ["date", "BHT-04"],
    ["time", "BHT-05"],
  ] as const)("refuses an empty %s (%s) rather than write a blank one", (field, element) => {
    const err = refusal({ ...SPEC, header: { [field]: "" } });
    expect(err.code).toBe(ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_SPEC);
    expect(err.message).toContain(element);
    expect(err.message).toContain(`header.${field}`);
  });

  it("refuses an empty default too: a blank group date leaves BHT-04 nothing to copy", () => {
    const err = refusal({ ...SPEC, envelope: { ...ENVELOPE, groupDate: "" } });
    expect(err.code).toBe(ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_SPEC);
    expect(err.message).toContain("BHT-04");
  });

  it("writes an empty BHT-03 when no reference is given, and invents none", () => {
    const ix = build271({ ...SPEC, header: { referenceId: "" } });
    expect(only(ix).segments[1]?.elements[3]).toBe("");
  });
});

describe("get271Eligibility warns on a 271 with no BHT", () => {
  it("raises nothing on the golden 271, which carries its BHT", () => {
    const ix = parseX12(GOLDEN);
    expect(read(ix).warnings).toEqual([]);
  });

  it("warns at the ST when the BHT is missing, and still reads the rest", () => {
    const elig = read(parseX12(withBody(NO_BHT)));
    expect(elig.subscribers[0]?.traces[0]?.referenceId).toBe("ECHO-270-TRACE-001");
    expect(elig.subscribers[0]?.benefits).toHaveLength(3);
    expect(elig.warnings).toEqual([
      {
        code: WARNING_CODES.X12_271_HEADER_ABSENT,
        message: eligibility271HeaderAbsent({ segmentIndex: 0, transactionIndex: 0 }).message,
        position: { segmentIndex: 0, transactionIndex: 0 },
      },
    ]);
  });

  it("warns on an empty body", () => {
    const elig = read(parseX12(withBody([])));
    expect(elig.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      [WARNING_CODES.X12_271_HEADER_ABSENT, 0],
    ]);
  });

  it("warns on a transaction set with no SE", () => {
    const tx = only(parseX12(withBody(NO_BHT)));
    const elig = get271Eligibility(parseX12(GOLDEN).delimiters, {
      ...tx,
      se: undefined,
      segments: tx.segments.slice(0, -1),
    });
    expect(elig?.warnings.map((w) => w.code)).toEqual([WARNING_CODES.X12_271_HEADER_ABSENT]);
  });

  it("puts it after the declared-guide warning, both at the ST", () => {
    const raw = withBody(NO_BHT).replace("~ST*271*0001*005010X279A1~", "~ST*271*0001*005010X999~");
    const elig = read(parseX12(raw));
    expect(elig.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      [WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED, 0],
      [WARNING_CODES.X12_271_HEADER_ABSENT, 0],
    ]);
  });

  it("does not warn for a BHT the sender sent with empty elements", () => {
    const body = ["BHT*", ...NO_BHT];
    expect(read(parseX12(withBody(body))).warnings).toEqual([]);
  });

  it("does not warn for a BHT that arrives after the first HL", () => {
    const body = [NO_BHT[0] ?? "", "BHT*0022*11*TXN-REF-001*20260601*1200", ...NO_BHT.slice(1)];
    expect(read(parseX12(withBody(body))).warnings).toEqual([]);
  });

  it("counts a null where the BHT was as no BHT", () => {
    const tx = only(parseX12(GOLDEN));
    const segments = [...tx.segments] as (typeof tx.segments)[number][];
    // A JSON round trip leaves a null where a segment was.
    segments[1] = null as unknown as (typeof segments)[number];
    const elig = get271Eligibility(parseX12(GOLDEN).delimiters, { ...tx, segments });
    expect(elig?.warnings.map((w) => w.code)).toEqual([WARNING_CODES.X12_271_HEADER_ABSENT]);
  });

  it("builds its message from the registry and echoes nothing", () => {
    const at = { segmentIndex: 0, transactionIndex: 0 };
    const warning = eligibility271HeaderAbsent(at);
    expect(warning.code).toBe("X12_271_HEADER_ABSENT");
    expect(ALL_WARNING_MESSAGES.has(warning.message)).toBe(true);
    expect(warning.position).toBe(at);
  });
});

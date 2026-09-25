/**
 * The 277 Health Care Claim Request for Additional Information
 * (`006020X313`): `get277RequestForAdditionalInformation` reads one into a
 * model that can never be mistaken for a claim status answer, and
 * `build277RequestForAdditionalInformation` writes one. Every test names the
 * acceptance criterion it grades (`AC-n`).
 *
 * **Every fixture in this file is SYNTHETIC.** Each interchange is assembled
 * here, at run time, by `seg(...)` from invented tokens: the names and
 * identifiers are the placeholders `scripts/phi-allow-list.txt` declares, and
 * the LOINC codes name attachment kinds, not anybody's document. The three
 * corpus tiers: Tier 1 is `RFAI_BODY`, a spec-clean request; Tier 2 is each
 * unhappy path (a document short of a BHT, an HL or a request, a document of
 * another guide, a build request short of what the base 006020 277 makes
 * mandatory); Tier 3 is the build-then-read round trip of AC-15.
 */

import { describe, expect, it } from "vitest";

import {
  RFAI_277_BUILD_ERROR_CODES,
  Rfai277BuildError,
  WARNING_CODES,
  X12Decimal,
  build277RequestForAdditionalInformation,
  get277RequestForAdditionalInformation,
  parseX12,
  serializeX12,
  type Build277RfaiSpec,
  type Delimiters,
  type X12AdditionalInformationRequest,
  type X12ClaimStatusResponse,
  type X12TransactionSet,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

// ---------------------------------------------------------------------------
// Fixture assembly.
// ---------------------------------------------------------------------------

const D: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };
const X313 = "006020X313";

/** One segment from its elements. */
function seg(...elements: readonly string[]): string {
  return elements.join(D.element) + D.segment;
}

/** One composite from its components. */
function comp(...components: readonly string[]): string {
  return components.join(D.component);
}

/** `null` leaves the element off the segment; `""` sends it empty. */
interface Declaration {
  readonly st03: string | null;
  readonly gs08: string | null;
}

/** A one-group, one-transaction interchange carrying `body`. */
function interchange(
  st01: string,
  body: readonly (readonly string[])[],
  declaration: Declaration = { st03: X313, gs08: X313 },
  functionalId = "HN",
): string {
  const gs = ["GS", functionalId, "SENDER", "RECEIVER", "20260601", "1200", "1", "X"];
  if (declaration.gs08 !== null) gs.push(declaration.gs08);
  const st = ["ST", st01, "0001"];
  if (declaration.st03 !== null) st.push(declaration.st03);
  const segments = [
    gs,
    st,
    ...body,
    ["SE", String(body.length + 2), "0001"],
    ["GE", "1", "1"],
    ["IEA", "1", "000000001"],
  ];
  return buildIsa() + segments.map((elements) => seg(...elements)).join("");
}

function firstTransaction(raw: string): { readonly d: Delimiters; readonly tx: X12TransactionSet } {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the fixture framed no transaction set");
  return { d: ix.delimiters, tx };
}

function read(
  body: readonly (readonly string[])[],
  declaration?: Declaration,
): X12AdditionalInformationRequest | undefined {
  const { d, tx } = firstTransaction(interchange("277", body, declaration));
  return get277RequestForAdditionalInformation(d, tx);
}

function readDefined(body: readonly (readonly string[])[]): X12AdditionalInformationRequest {
  const reading = read(body);
  if (reading === undefined) throw new Error("the reader returned no reading");
  return reading;
}

/** Tier 1: a payer asking a clinic for two documents about one claim, and one about a line. */
const RFAI_BODY: readonly (readonly string[])[] = [
  ["BHT", "0010", "08", "RFAI-0001", "20260601", "1200", "DG"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "PR", "2", "PAYER ONE", "", "", "", "", "PI", "PAYER01"],
  ["HL", "2", "1", "21", "1"],
  ["NM1", "41", "2", "CLINIC ONE", "", "", "", "", "46", "RECVR01"],
  ["HL", "3", "2", "19", "1"],
  ["NM1", "1P", "2", "CLINIC ONE", "", "", "", "", "XX", "1234567890"],
  ["HL", "4", "3", "22", "0"],
  ["NM1", "QC", "1", "DOE", "JANE", "A", "", "", "MI", "MBR0001"],
  ["TRN", "1", "TRACE-0001", "9SUBMITTER"],
  ["STC", comp("R0", "18842-5", "", "LOI"), "20260601", "WQ", "150.00"],
  ["STC", comp("R0", "11506-3", "", "LOI"), "20260601"],
  ["REF", "1K", "PCN0001"],
  ["REF", "EJ", "PT-ACCT-001"],
  ["DTP", "472", "RD8", "20260501-20260502"],
  ["DTP", "050", "D8", "202605"],
  ["QTY", "90", "2"],
  ["AMT", "T3", "150.00"],
  ["SVC", comp("HC", "99213", "25"), "150.00", "0", "0300", "1", "", "1"],
  ["STC", comp("R0", "28570-0", "", "LOI"), "20260601"],
  ["REF", "FJ", "LINE-0001"],
  ["DTP", "472", "D8", "20260501"],
  ["TRN", "1", "TRACE-0002"],
  ["STC", comp("R1", "20", "PR")],
];

// ---------------------------------------------------------------------------
// AC-1
// ---------------------------------------------------------------------------

/** `true` where every value of `A` is a value of `B`. */
type Assignable<A, B> = [A] extends [B] ? true : false;

describe("AC-1: a 006020X313 277 reads as a request for additional information, never as a claim status", () => {
  it("AC-1: labels itself a request for additional information", () => {
    expect(readDefined(RFAI_BODY).transactionType).toBe("request-for-additional-information");
  });

  it("AC-1: its type is neither assignable to nor from the claim status response type", () => {
    // Compile-time: were either assignable, the literal `false` below would not
    // type-check and `pnpm typecheck` would fail on this file.
    const toStatus: Assignable<X12AdditionalInformationRequest, X12ClaimStatusResponse> = false;
    const fromStatus: Assignable<X12ClaimStatusResponse, X12AdditionalInformationRequest> = false;
    expect([toStatus, fromStatus]).toEqual([false, false]);
    // Run-time: the reading carries neither the claim status list nor its discriminants.
    const reading = readDefined(RFAI_BODY);
    expect(Object.hasOwn(reading, "claims")).toBe(false);
    expect(["claim-status", "claim-acknowledgment", "unrecognized-guide"]).not.toContain(
      reading.transactionType,
    );
  });

  it("AC-1: carries no claim-status or claim-acknowledgment label anywhere", () => {
    const text = JSON.stringify(readDefined(RFAI_BODY)).toLowerCase();
    expect(text).not.toContain("claim-status");
    expect(text).not.toContain("claim-acknowledgment");
    expect(text).not.toContain("claimstatus");
  });
});

// ---------------------------------------------------------------------------
// AC-2
// ---------------------------------------------------------------------------

describe("AC-2: every level, entity, request and service line, in document order, verbatim", () => {
  const reading = readDefined(RFAI_BODY);

  it("AC-2: returns every HL in document order with its HL-03 and its NM1 verbatim", () => {
    expect(reading.levels.map((l) => [l.id, l.parentId, l.levelCode, l.childCode])).toEqual([
      ["1", undefined, "20", "1"],
      ["2", "1", "21", "1"],
      ["3", "2", "19", "1"],
      ["4", "3", "22", "0"],
    ]);
    expect(reading.levels.map((l) => l.entities)).toEqual([
      [
        {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          lastOrOrganizationName: "PAYER ONE",
          firstName: undefined,
          middleName: undefined,
          namePrefix: undefined,
          nameSuffix: undefined,
          idQualifier: "PI",
          idCode: "PAYER01",
        },
      ],
      [
        expect.objectContaining({
          entityIdentifierCode: "41",
          idQualifier: "46",
          idCode: "RECVR01",
        }),
      ],
      [
        expect.objectContaining({
          entityIdentifierCode: "1P",
          idQualifier: "XX",
          idCode: "1234567890",
        }),
      ],
      [
        {
          entityIdentifierCode: "QC",
          entityTypeQualifier: "1",
          lastOrOrganizationName: "DOE",
          firstName: "JANE",
          middleName: "A",
          namePrefix: undefined,
          nameSuffix: undefined,
          idQualifier: "MI",
          idCode: "MBR0001",
        },
      ],
    ]);
  });

  it("AC-2: puts each claim-level request under the level it was sent in, in order", () => {
    expect(reading.levels.map((l) => l.requests.length)).toEqual([0, 0, 0, 2]);
    const [first, second] = reading.levels[3]?.requests ?? [];
    expect(first?.traces).toEqual([
      {
        traceTypeCode: "1",
        referenceId: "TRACE-0001",
        originatingCompanyId: "9SUBMITTER",
        supplementalReferenceId: undefined,
      },
    ]);
    expect(second?.traces.map((t) => t.referenceId)).toEqual(["TRACE-0002"]);
  });

  it("AC-2: carries the request's references verbatim, so the payer claim control number is reachable", () => {
    const request = reading.levels[3]?.requests[0];
    expect(request?.references).toEqual([
      { qualifier: "1K", value: "PCN0001", description: undefined },
      { qualifier: "EJ", value: "PT-ACCT-001", description: undefined },
    ]);
    expect(request?.references.find((r) => r.qualifier === "1K")?.value).toBe("PCN0001");
  });

  it("AC-2: carries each date with the precision sent, a partial one left partial", () => {
    expect(reading.levels[3]?.requests[0]?.dates).toEqual([
      { qualifier: "472", formatQualifier: "RD8", value: "20260501-20260502" },
      { qualifier: "050", formatQualifier: "D8", value: "202605" },
    ]);
  });

  it("AC-2: carries amounts as the exact decimal type", () => {
    const request = reading.levels[3]?.requests[0];
    const amount = request?.amounts[0]?.amount;
    expect(amount).toBeInstanceOf(X12Decimal);
    expect(amount?.toString()).toBe("150.00");
    expect(request?.amounts[0]?.qualifier).toBe("T3");
    expect(request?.quantities[0]?.quantity?.toString()).toBe("2");
    expect(request?.statuses[0]?.totalChargeAmount?.toString()).toBe("150.00");
  });

  it("AC-2: carries each STC's C043-01 to C043-04 verbatim", () => {
    const [first, second] = reading.levels[3]?.requests ?? [];
    expect(
      first?.statuses.map((s) =>
        s.codes.map((c) => [c.categoryCode, c.statusCode, c.entityCode, c.codeListQualifier]),
      ),
    ).toEqual([[["R0", "18842-5", undefined, "LOI"]], [["R0", "11506-3", undefined, "LOI"]]]);
    expect(first?.statuses[0]?.statusEffectiveDate).toBe("20260601");
    expect(first?.statuses[0]?.actionCode).toBe("WQ");
    expect(
      second?.statuses[0]?.codes.map((c) => [
        c.categoryCode,
        c.statusCode,
        c.entityCode,
        c.codeListQualifier,
      ]),
    ).toEqual([["R1", "20", "PR", undefined]]);
  });

  it("AC-2: reads each service line with its SVC, STC, REF and DTP", () => {
    const line = reading.levels[3]?.requests[0]?.serviceLines[0];
    expect(reading.levels[3]?.requests[0]?.serviceLines).toHaveLength(1);
    expect([
      line?.serviceIdQualifier,
      line?.procedureCode,
      line?.modifiers,
      line?.revenueCode,
    ]).toEqual(["HC", "99213", ["25"], "0300"]);
    expect(
      [line?.lineChargeAmount, line?.linePaymentAmount, line?.quantity, line?.unitsOfService].map(
        (a) => a?.toString(),
      ),
    ).toEqual(["150.00", "0", "1", "1"]);
    expect(line?.statuses[0]?.codes[0]?.statusCode).toBe("28570-0");
    expect(line?.statuses[0]?.codes[0]?.codeListQualifier).toBe("LOI");
    expect(line?.references).toEqual([
      { qualifier: "FJ", value: "LINE-0001", description: undefined },
    ]);
    expect(line?.dates).toEqual([{ qualifier: "472", formatQualifier: "D8", value: "20260501" }]);
    // The line's own REF and DTP did not also land on the request.
    expect(reading.levels[3]?.requests[0]?.references.map((r) => r.qualifier)).toEqual([
      "1K",
      "EJ",
    ]);
  });

  it("AC-2: a spec-clean request raises no warning", () => {
    expect(reading.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC-3
// ---------------------------------------------------------------------------

describe("AC-3: C043-04 names the code source of C043-02, so a qualified code is never a claim status code", () => {
  function stcReading(...composite: readonly string[]): X12AdditionalInformationRequest {
    return readDefined([
      ["BHT", "0010", "08", "RFAI-0001", "20260601", "1200"],
      ["HL", "1", "", "20", "0"],
      ["TRN", "1", "TRACE-0001"],
      ["STC", comp(...composite)],
    ]);
  }

  function codeOf(reading: X12AdditionalInformationRequest) {
    return reading.levels[0]?.requests[0]?.statuses[0]?.codes[0];
  }

  const statusWarnings = (reading: X12AdditionalInformationRequest) =>
    reading.warnings.filter((w) => w.code === WARNING_CODES.X12_UNKNOWN_CLAIM_STATUS);

  it("AC-3: a code the claim status list DOES carry gets no description when C043-04 is present", () => {
    // Control first: with C043-04 empty, "20" IS a claim status code and is described.
    const unqualified = stcReading("R0", "20");
    expect(codeOf(unqualified)?.statusDescription).toBeDefined();
    // With C043-04 present, the same bytes are not looked up at all.
    const qualified = stcReading("R0", "20", "", "LOI");
    expect(codeOf(qualified)?.statusCode).toBe("20");
    expect(codeOf(qualified)?.codeListQualifier).toBe("LOI");
    expect(codeOf(qualified)?.statusDescription).toBeUndefined();
    expect(statusWarnings(qualified)).toEqual([]);
  });

  it("AC-3: a LOINC code raises no unknown-claim-status warning when C043-04 names its source", () => {
    // Control first: the same code, unqualified, is an unknown claim status code.
    expect(statusWarnings(stcReading("R0", "18842-5"))).toHaveLength(1);
    const qualified = stcReading("R0", "18842-5", "", "LOI");
    expect(statusWarnings(qualified)).toEqual([]);
    expect(codeOf(qualified)?.statusDescription).toBeUndefined();
    expect(codeOf(qualified)?.statusCode).toBe("18842-5");
  });

  it("AC-3: holds on STC-10 and STC-11 as on STC-01", () => {
    const reading = readDefined([
      ["BHT", "0010", "08", "RFAI-0001"],
      ["HL", "1", "", "20", "0"],
      ["TRN", "1", "TRACE-0001"],
      [
        "STC",
        comp("R0", "20", "", "LOI"),
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        comp("R0", "20", "", "LOI"),
        comp("R0", "18842-5", "", "LOI"),
      ],
    ]);
    const codes = reading.levels[0]?.requests[0]?.statuses[0]?.codes ?? [];
    expect(codes).toHaveLength(3);
    for (const code of codes) expect(code.statusDescription).toBeUndefined();
    expect(statusWarnings(reading)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC-4
// ---------------------------------------------------------------------------

describe("AC-4: anything but a 277 declaring 006020X313 returns no reading", () => {
  it("AC-4: a transaction set that is not a 277", () => {
    const { d, tx } = firstTransaction(
      interchange(
        "275",
        [
          ["LX", "1"],
          ["BDS", "B64", "4", "DATA"],
        ],
        { st03: X313, gs08: X313 },
        "PI",
      ),
    );
    expect(get277RequestForAdditionalInformation(d, tx)).toBeUndefined();
  });

  const cases: readonly (readonly [string, Declaration])[] = [
    ["a 005010X212 277", { st03: "005010X212", gs08: "005010X212" }],
    ["a 005010X214 277", { st03: "005010X214", gs08: "005010X214" }],
    ["a 277 declaring nothing", { st03: null, gs08: null }],
    ["a 277 declaring nothing, both elements empty", { st03: "", gs08: "" }],
    [
      "a 277 whose ST-03 declares 005010X212 over a GS-08 of 006020X313",
      { st03: "005010X212", gs08: X313 },
    ],
    ["a 277 declaring the 278 attachments guide 006020X315", { st03: "006020X315", gs08: "" }],
  ];
  for (const [name, declaration] of cases) {
    it(`AC-4: ${name}`, () => {
      expect(read(RFAI_BODY, declaration)).toBeUndefined();
    });
  }

  it("AC-4: the declared guide is the package's rule, so GS-08 alone declares one when ST-03 is absent", () => {
    expect(read(RFAI_BODY, { st03: null, gs08: X313 })?.transactionType).toBe(
      "request-for-additional-information",
    );
  });
});

// ---------------------------------------------------------------------------
// AC-6
// ---------------------------------------------------------------------------

describe("AC-6: an absent BHT, HL or request is left absent, and each absence is warned once at the ST", () => {
  const codesAtSt = (reading: X12AdditionalInformationRequest) =>
    reading.warnings.map((w) => [w.code, w.position.segmentIndex]);

  it("AC-6: no BHT leaves the header undefined and raises X12_277_RFAI_HEADER_ABSENT", () => {
    const reading = readDefined(RFAI_BODY.slice(1));
    expect(reading.header).toBeUndefined();
    expect(codesAtSt(reading)).toEqual([[WARNING_CODES.X12_277_RFAI_HEADER_ABSENT, 0]]);
    expect(reading.levels).toHaveLength(4);
  });

  it("AC-6: no HL leaves the levels empty and raises the level and the request absences", () => {
    const reading = readDefined([
      ["BHT", "0010", "08", "RFAI-0001"],
      ["TRN", "1", "TRACE-0001"],
      ["STC", comp("R0", "18842-5", "", "LOI")],
    ]);
    expect(reading.levels).toEqual([]);
    expect(codesAtSt(reading)).toEqual([
      [WARNING_CODES.X12_277_RFAI_LEVEL_ABSENT, 0],
      [WARNING_CODES.X12_277_RFAI_REQUEST_ABSENT, 0],
    ]);
  });

  it("AC-6: no claim-level request leaves every level's requests empty and raises X12_277_RFAI_REQUEST_ABSENT", () => {
    const reading = readDefined(RFAI_BODY.slice(0, 9));
    expect(reading.levels.map((l) => l.requests)).toEqual([[], [], [], []]);
    expect(codesAtSt(reading)).toEqual([[WARNING_CODES.X12_277_RFAI_REQUEST_ABSENT, 0]]);
  });

  it("AC-6: a document short of all three raises all three, once each, and invents nothing", () => {
    const reading = readDefined([]);
    expect(reading.header).toBeUndefined();
    expect(reading.levels).toEqual([]);
    expect(codesAtSt(reading)).toEqual([
      [WARNING_CODES.X12_277_RFAI_HEADER_ABSENT, 0],
      [WARNING_CODES.X12_277_RFAI_LEVEL_ABSENT, 0],
      [WARNING_CODES.X12_277_RFAI_REQUEST_ABSENT, 0],
    ]);
  });

  it("AC-6: an STC under a level with no TRN opens a request whose traces are empty, not invented", () => {
    const reading = readDefined([
      ["BHT", "0010", "08", "RFAI-0001"],
      ["HL", "1", "", "20", "0"],
      ["STC", comp("R0", "18842-5", "", "LOI")],
    ]);
    expect(reading.levels[0]?.requests[0]?.traces).toEqual([]);
    expect(reading.levels[0]?.requests[0]?.statuses[0]?.codes[0]?.statusCode).toBe("18842-5");
    expect(reading.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC-15 and AC-16: the builder.
// ---------------------------------------------------------------------------

const dec = (value: string): X12Decimal => {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
};

const ENVELOPE = {
  senderId: "PAYER01",
  receiverId: "RECVR01",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

/** Tier 1 build request: the same shape as `RFAI_BODY`, nested. */
const SPEC: Build277RfaiSpec = {
  envelope: ENVELOPE,
  header: {
    hierarchicalStructureCode: "0010",
    transactionSetPurposeCode: "08",
    referenceId: "RFAI-0001",
    date: "20260601",
    time: "1200",
    transactionTypeCode: "DG",
  },
  levels: [
    {
      levelCode: "20",
      childCode: "1",
      entities: [
        {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          lastOrOrganizationName: "PAYER ONE",
          idQualifier: "PI",
          idCode: "PAYER01",
        },
      ],
      children: [
        {
          levelCode: "22",
          childCode: "0",
          entities: [
            {
              entityIdentifierCode: "QC",
              entityTypeQualifier: "1",
              lastOrOrganizationName: "DOE",
              firstName: "JANE",
              idQualifier: "MI",
              idCode: "MBR0001",
            },
          ],
          requests: [
            {
              trace: {
                traceTypeCode: "1",
                referenceId: "TRACE-0001",
                originatingCompanyId: "9SUBMITTER",
              },
              statuses: [
                {
                  codes: [
                    { categoryCode: "R0", statusCode: "18842-5", codeListQualifier: "LOI" },
                    {
                      categoryCode: "R0",
                      statusCode: "11506-3",
                      entityCode: "1P",
                      codeListQualifier: "LOI",
                    },
                  ],
                  statusEffectiveDate: "20260601",
                  totalChargeAmount: dec("150.00"),
                },
              ],
              references: [{ qualifier: "1K", value: "PCN0001" }],
              dates: [{ qualifier: "472", formatQualifier: "RD8", value: "20260501-20260502" }],
              quantities: [{ qualifier: "90", quantity: dec("2") }],
              amounts: [{ qualifier: "T3", amount: dec("150.00") }],
              serviceLines: [
                {
                  service: {
                    serviceIdQualifier: "HC",
                    procedureCode: "99213",
                    modifiers: ["25"],
                    lineChargeAmount: dec("150.00"),
                    unitsOfService: dec("1"),
                  },
                  statuses: [
                    {
                      codes: [
                        { categoryCode: "R0", statusCode: "28570-0", codeListQualifier: "LOI" },
                      ],
                    },
                  ],
                  references: [{ qualifier: "FJ", value: "LINE-0001" }],
                  dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260501" }],
                },
              ],
            },
            {
              trace: { traceTypeCode: "1", referenceId: "TRACE-0002" },
              statuses: [{ codes: [{ categoryCode: "R1", statusCode: "20", entityCode: "PR" }] }],
            },
          ],
        },
      ],
    },
  ],
};

/** A JS caller who defeated their own type checker. */
const asJsCaller = <T>(value: unknown): T => value as T;

describe("AC-15: a built 277 declares 006020X313 and reads back as it was built", () => {
  const ix = build277RequestForAdditionalInformation(SPEC);
  const tx = ix.groups[0]?.transactions[0];

  it("AC-15: writes GS-01 HN and 006020X313 in GS-08 and ST-03", () => {
    expect(ix.groups[0]?.gs.elements[1]).toBe("HN");
    expect(ix.groups[0]?.gs.elements[8]).toBe(X313);
    expect(tx?.st.elements[1]).toBe("277");
    expect(tx?.st.elements[3]).toBe(X313);
    expect(ix.warnings).toEqual([]);
  });

  it("AC-15: writes each requested item's C043 components verbatim, C043-04 included", () => {
    const text = serializeX12(ix);
    expect(text).toContain(`~STC*R0:18842-5::LOI*20260601**150.00******R0:11506-3:1P:LOI~`);
    expect(text).toContain(`~STC*R0:28570-0::LOI~`);
    expect(text).toContain(`~STC*R1:20:PR~`);
  });

  it("AC-15: reads back the same levels, entities, traces, references and requests, with no guide warning", () => {
    if (tx === undefined) throw new Error("no transaction set");
    const reading = get277RequestForAdditionalInformation(ix.delimiters, tx);
    expect(reading?.warnings).toEqual([]);
    expect(reading?.header).toEqual({ ...SPEC.header });
    expect(reading?.levels.map((l) => [l.id, l.parentId, l.levelCode, l.childCode])).toEqual([
      ["1", undefined, "20", "1"],
      ["2", "1", "22", "0"],
    ]);
    expect(
      reading?.levels[0]?.entities.map((e) => [
        e.entityIdentifierCode,
        e.lastOrOrganizationName,
        e.idCode,
      ]),
    ).toEqual([["PR", "PAYER ONE", "PAYER01"]]);
    expect(
      reading?.levels[1]?.entities.map((e) => [e.lastOrOrganizationName, e.firstName, e.idCode]),
    ).toEqual([["DOE", "JANE", "MBR0001"]]);
    const requests = reading?.levels[1]?.requests ?? [];
    expect(
      requests.map((r) =>
        r.traces.map((t) => [t.traceTypeCode, t.referenceId, t.originatingCompanyId]),
      ),
    ).toEqual([[["1", "TRACE-0001", "9SUBMITTER"]], [["1", "TRACE-0002", undefined]]]);
    expect(requests[0]?.references.map((r) => [r.qualifier, r.value])).toEqual([["1K", "PCN0001"]]);
    expect(requests[0]?.dates).toEqual([
      { qualifier: "472", formatQualifier: "RD8", value: "20260501-20260502" },
    ]);
    expect(requests[0]?.quantities[0]?.quantity?.toString()).toBe("2");
    expect(requests[0]?.amounts[0]?.amount?.toString()).toBe("150.00");
    expect(
      requests.map((r) =>
        r.statuses.map((s) =>
          s.codes.map((c) => [c.categoryCode, c.statusCode, c.entityCode, c.codeListQualifier]),
        ),
      ),
    ).toEqual([
      [
        [
          ["R0", "18842-5", undefined, "LOI"],
          ["R0", "11506-3", "1P", "LOI"],
        ],
      ],
      [[["R1", "20", "PR", undefined]]],
    ]);
    const line = requests[0]?.serviceLines[0];
    expect([line?.serviceIdQualifier, line?.procedureCode, line?.modifiers]).toEqual([
      "HC",
      "99213",
      ["25"],
    ]);
    expect([line?.lineChargeAmount?.toString(), line?.unitsOfService?.toString()]).toEqual([
      "150.00",
      "1",
    ]);
    expect(line?.statuses[0]?.codes[0]?.statusCode).toBe("28570-0");
    expect(line?.references.map((r) => r.value)).toEqual(["LINE-0001"]);
    expect(line?.dates.map((d) => d.value)).toEqual(["20260501"]);
  });

  it("AC-15: writes every delimiter a caller value holds released, so it reads back as given", () => {
    const withDelimiters: Build277RfaiSpec = {
      ...SPEC,
      levels: [
        {
          levelCode: "20",
          requests: [
            {
              trace: { traceTypeCode: "1", referenceId: "TR*A:C^E~?" },
              references: [{ qualifier: "1K", value: "P*1" }],
            },
          ],
        },
      ],
    };
    const built = build277RequestForAdditionalInformation(withDelimiters);
    const builtTx = built.groups[0]?.transactions[0];
    if (builtTx === undefined) throw new Error("no transaction set");
    const request = get277RequestForAdditionalInformation(built.delimiters, builtTx)?.levels[0]
      ?.requests[0];
    expect(request?.traces[0]?.referenceId).toBe("TR*A:C^E~?");
    expect(request?.references[0]?.value).toBe("P*1");
  });
});

describe("AC-16: the builder refuses exactly the absences the base 006020 277 makes mandatory", () => {
  function refusal(spec: Build277RfaiSpec): Rfai277BuildError {
    let thrown: unknown;
    let returned: unknown;
    try {
      returned = build277RequestForAdditionalInformation(spec);
    } catch (err) {
      thrown = err;
    }
    // No interchange is returned: the call threw instead.
    expect(returned).toBeUndefined();
    expect(thrown).toBeInstanceOf(Rfai277BuildError);
    return thrown as Rfai277BuildError;
  }

  const oneLevel = (level: Build277RfaiSpec["levels"][number]): Build277RfaiSpec => ({
    ...SPEC,
    levels: [level],
  });
  const withStatus = (codes: unknown): Build277RfaiSpec =>
    oneLevel({
      levelCode: "20",
      requests: [
        {
          trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
          statuses: [{ codes: asJsCaller(codes) }],
        },
      ],
    });

  it("AC-16: no hierarchical level", () => {
    expect(refusal({ ...SPEC, levels: [] }).code).toBe(
      RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_LEVEL,
    );
  });

  it("AC-16: no claim-level request under any level", () => {
    const err = refusal(
      oneLevel({ levelCode: "20", children: [{ levelCode: "22", requests: [] }] }),
    );
    expect(err.code).toBe(RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_REQUEST);
  });

  it("AC-16: a claim-level request with no trace", () => {
    const err = refusal(
      oneLevel({
        levelCode: "20",
        requests: [
          asJsCaller({ statuses: [{ codes: [{ categoryCode: "R0", statusCode: "20" }] }] }),
        ],
      }),
    );
    expect(err.code).toBe(RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_TRACE);
  });

  const EMPTY_COMPOSITES: readonly (readonly [string, unknown])[] = [
    ["C043-01 empty", [{ categoryCode: "", statusCode: "18842-5", codeListQualifier: "LOI" }]],
    ["C043-02 empty", [{ categoryCode: "R0", statusCode: "", codeListQualifier: "LOI" }]],
    ["C043-01 absent", [{ statusCode: "18842-5" }]],
    ["C043-02 absent", [{ categoryCode: "R0" }]],
    [
      "STC-10 with C043-02 empty",
      [
        { categoryCode: "R0", statusCode: "20" },
        { categoryCode: "R0", statusCode: "" },
      ],
    ],
    ["no composite at all, so STC-01 carries neither", []],
  ];
  for (const [name, codes] of EMPTY_COMPOSITES) {
    it(`AC-16: a status composite whose ${name}`, () => {
      expect(refusal(withStatus(codes)).code).toBe(
        RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_STATUS_CODE_EMPTY,
      );
    });
  }

  it("AC-16: a service line with no SVC", () => {
    const err = refusal(
      oneLevel({
        levelCode: "20",
        requests: [
          {
            trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
            serviceLines: [
              asJsCaller({ statuses: [{ codes: [{ categoryCode: "R0", statusCode: "20" }] }] }),
            ],
          },
        ],
      }),
    );
    expect(err.code).toBe(RFAI_277_BUILD_ERROR_CODES.X12_277_RFAI_BUILD_NO_SERVICE);
  });

  it("AC-16: refuses no other element for being empty: a level code, BHT codes, trace id and reference written as given", () => {
    const sparse: Build277RfaiSpec = {
      ...SPEC,
      header: { hierarchicalStructureCode: "", transactionSetPurposeCode: "" },
      levels: [
        {
          levelCode: "",
          entities: [{ entityIdentifierCode: "", entityTypeQualifier: "" }],
          requests: [
            {
              trace: { traceTypeCode: "", referenceId: "" },
              statuses: [
                {
                  codes: [
                    { categoryCode: "R0", statusCode: "20", entityCode: "", codeListQualifier: "" },
                  ],
                },
              ],
              references: [{ qualifier: "", value: "" }],
              dates: [{ qualifier: "", formatQualifier: "", value: "" }],
              serviceLines: [{ service: { serviceIdQualifier: "", procedureCode: "" } }],
            },
          ],
        },
      ],
    };
    const ix = build277RequestForAdditionalInformation(sparse);
    expect(ix.groups[0]?.transactions[0]?.st.elements[3]).toBe(X313);
  });
});

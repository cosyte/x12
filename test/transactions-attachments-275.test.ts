/**
 * The 275 Additional Information to Support a Health Care Claim or Encounter
 * (`006020X314`): `get275Attachments` reads each BDS as one attachment, the
 * data verbatim and refusing to print, and `build275` writes one whose BDS-02
 * is true of its BDS-03. Every test names the acceptance criterion it grades
 * (`AC-n`).
 *
 * **Every fixture in this file is SYNTHETIC.** Each interchange is assembled
 * here, at run time, by `seg(...)` from invented tokens: the names and
 * identifiers are the placeholders `scripts/phi-allow-list.txt` declares, and
 * every attachment is invented bytes, most of them the base64 of an invented
 * word or random octets fast-check draws. The three corpus tiers: Tier 1 is
 * `ATTACHMENT_BODY`, a spec-clean 275; Tier 2 is each unhappy path (every
 * binary framing failure, a 275 with no BDS or of another guide, a build
 * request the builder refuses); Tier 3 is the build, serialize and read round
 * trip of AC-13.
 */

import { Buffer } from "node:buffer";
import { inspect } from "node:util";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ATTACHMENT_275_BUILD_ERROR_CODES,
  Attachment275BuildError,
  WARNING_CODES,
  X12AttachmentData,
  build275,
  get275Attachments,
  parseX12,
  serializeX12,
  type Build275Spec,
  type Delimiters,
  type X12AttachmentSubmission,
  type X12Interchange,
  type X12WarningCode,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

// ---------------------------------------------------------------------------
// Fixture assembly.
// ---------------------------------------------------------------------------

const D: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };
const X314 = "006020X314";

/** The four binary framing codes the parser raises about a BDS. */
const BINARY_CODES: ReadonlySet<X12WarningCode> = new Set([
  WARNING_CODES.X12_BINARY_DATA_TRUNCATED,
  WARNING_CODES.X12_BINARY_LENGTH_INVALID,
  WARNING_CODES.X12_BINARY_LENGTH_MISMATCH,
  WARNING_CODES.X12_BINARY_LENGTH_UNVERIFIABLE,
]);

const GUIDE_CODES: ReadonlySet<X12WarningCode> = new Set([
  WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED,
  WARNING_CODES.X12_GUIDE_NOT_DECLARED,
]);

/** One segment from its elements. */
function seg(...elements: readonly string[]): string {
  return elements.join(D.element) + D.segment;
}

function comp(...components: readonly string[]): string {
  return components.join(D.component);
}

/** A BDS whose BDS-02 is the true count of `data`. */
function bds(data: string, filter = "B64"): readonly string[] {
  return ["BDS", filter, String(data.length), data];
}

interface Declaration {
  readonly st03: string | null;
  readonly gs08: string | null;
}

/**
 * The raw text of a one-group, one-transaction 275. `tail` is appended after
 * the body in place of the SE / GE / IEA trailer where a test needs the input
 * to end inside a BDS.
 */
function interchange(
  body: readonly (readonly string[])[],
  declaration: Declaration = { st03: X314, gs08: X314 },
  tail?: string,
): string {
  const gs = ["GS", "PI", "SENDER", "RECEIVER", "20260601", "1200", "1", "X"];
  if (declaration.gs08 !== null) gs.push(declaration.gs08);
  const st = ["ST", "275", "0001"];
  if (declaration.st03 !== null) st.push(declaration.st03);
  const head = buildIsa() + seg(...gs) + seg(...st) + body.map((e) => seg(...e)).join("");
  if (tail !== undefined) return head + tail;
  return (
    head +
    seg("SE", String(body.length + 2), "0001") +
    seg("GE", "1", "1") +
    seg("IEA", "1", "000000001")
  );
}

function readRaw(raw: string | Buffer): X12AttachmentSubmission {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the fixture framed no transaction set");
  const reading = get275Attachments(ix.delimiters, tx);
  if (reading === undefined) throw new Error("the reader returned no reading");
  return reading;
}

const read = (
  body: readonly (readonly string[])[],
  declaration?: Declaration,
): X12AttachmentSubmission => readRaw(interchange(body, declaration));

/** Synthetic octets: the base64 of an invented word, then one holding every delimiter and `?`. */
const DATA_ONE = "U1lOVEhFVElDIE5PVEU=";
const DATA_TWO = "AB*CD^EF:GH~IJ?*KL??M\r\nN";
const DATA_THREE = "Q0NEQS1SMg==";

/** Tier 1: a clinic answering one request with three documents on two lines. */
const ATTACHMENT_BODY: readonly (readonly string[])[] = [
  ["BGN", "02", "ATTACH-0001", "20260601", "1200"],
  ["NM1", "PR", "2", "PAYER ONE", "", "", "", "", "PI", "PAYER01"],
  ["NM1", "QC", "1", "DOE", "JANE", "", "", "", "MI", "MBR0001"],
  ["LX", "1"],
  ["TRN", "2", "TRACE-0001"],
  ["STC", comp("R0", "18842-5", "", "LOI"), "20260601"],
  ["REF", "1K", "PCN0001"],
  bds(DATA_ONE),
  ["LX", "2"],
  ["TRN", "2", "TRACE-0002"],
  ["REF", "EJ", "PT-ACCT-001"],
  bds(DATA_TWO),
  bds(DATA_THREE, "ASC"),
];

// ---------------------------------------------------------------------------
// AC-7
// ---------------------------------------------------------------------------

describe("AC-7: each BDS is one attachment, in order, under its line, carried verbatim and never decoded", () => {
  const reading = read(ATTACHMENT_BODY);

  it("AC-7: returns each BDS as one attachment in document order, with BDS-01 and BDS-02 as sent", () => {
    expect(reading.attachments.map((a) => [a.filterCode, a.declaredLength])).toEqual([
      ["B64", String(DATA_ONE.length)],
      ["B64", String(DATA_TWO.length)],
      ["ASC", String(DATA_THREE.length)],
    ]);
    // ST is segment 0, so the three BDS segments sit at 8, 12 and 13.
    expect(reading.attachments.map((a) => a.segmentIndex)).toEqual([8, 12, 13]);
  });

  it("AC-7: carries BDS-03 as exactly the octets framed: no filter, no release unescape, no split", () => {
    expect(reading.attachments.map((a) => a.data.readOctets())).toEqual([
      DATA_ONE,
      DATA_TWO,
      DATA_THREE,
    ]);
    // Not decoded: the base64 text comes back as base64 text.
    expect(reading.attachments[0]?.data.readOctets()).not.toBe(
      Buffer.from(DATA_ONE, "base64").toString("latin1"),
    );
    // Every `?` is still there, and no delimiter split the element.
    expect(reading.attachments[1]?.data.readOctets()).toContain("?*");
    expect(reading.attachments[1]?.data.octetCount).toBe(DATA_TWO.length);
  });

  it("AC-7: associates each attachment with the LX line it appears under, and its TRN, STC and REF", () => {
    expect(reading.attachments.map((a) => a.line?.lineNumber)).toEqual(["1", "2", "2"]);
    expect(reading.attachments[1]?.line).toBe(reading.attachments[2]?.line);
    expect(reading.lines).toEqual([
      {
        lineNumber: "1",
        traces: [
          {
            traceTypeCode: "2",
            referenceId: "TRACE-0001",
            originatingCompanyId: undefined,
            supplementalReferenceId: undefined,
          },
        ],
        statuses: [
          expect.objectContaining({
            codes: [
              {
                categoryCode: "R0",
                statusCode: "18842-5",
                entityCode: undefined,
                codeListQualifier: "LOI",
              },
            ],
            statusEffectiveDate: "20260601",
          }),
        ],
        references: [{ qualifier: "1K", value: "PCN0001", description: undefined }],
      },
      {
        lineNumber: "2",
        traces: [expect.objectContaining({ referenceId: "TRACE-0002" })],
        statuses: [],
        references: [{ qualifier: "EJ", value: "PT-ACCT-001", description: undefined }],
      },
    ]);
  });

  it("AC-7: carries the heading's BGN and NM1 names verbatim", () => {
    expect(reading.beginning).toEqual(
      expect.objectContaining({
        transactionSetPurposeCode: "02",
        referenceId: "ATTACH-0001",
        date: "20260601",
        time: "1200",
      }),
    );
    expect(
      reading.entities.map((e) => [
        e.entityIdentifierCode,
        e.lastOrOrganizationName,
        e.firstName,
        e.idQualifier,
        e.idCode,
      ]),
    ).toEqual([
      ["PR", "PAYER ONE", undefined, "PI", "PAYER01"],
      ["QC", "DOE", "JANE", "MI", "MBR0001"],
    ]);
  });

  it("AC-7: a spec-clean 275 reads with every length verified and no warning", () => {
    expect(reading.attachments.map((a) => a.lengthVerified)).toEqual([true, true, true]);
    expect(reading.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// AC-8
// ---------------------------------------------------------------------------

describe("AC-8: a BDS the parser could not frame by its count is warned, marked, and carried as sent", () => {
  const HEAD: readonly (readonly string[])[] = [["LX", "1"]];
  /** The BDS sits at segment 2 of the transaction set: ST 0, LX 1. */
  const AT = 2;

  function framing(reading: X12AttachmentSubmission): (readonly [string, number])[] {
    return reading.warnings
      .filter((w) => BINARY_CODES.has(w.code))
      .map((w) => [w.code, w.position.segmentIndex] as const);
  }

  it("AC-8: the input ends inside the declared span", () => {
    const reading = readRaw(interchange(HEAD, undefined, "BDS*B64*999*SHORTDATA"));
    expect(framing(reading)).toEqual([[WARNING_CODES.X12_BINARY_DATA_TRUNCATED, AT]]);
    const [attachment] = reading.attachments;
    expect(attachment?.declaredLength).toBe("999");
    expect(attachment?.data.readOctets()).toBe("SHORTDATA");
    expect(attachment?.lengthVerified).toBe(false);
  });

  const INVALID: readonly (readonly [string, readonly string[], string | undefined, string])[] = [
    ["BDS-02 absent", ["BDS", "B64"], undefined, ""],
    ["BDS-02 empty", ["BDS", "B64", "", "DATA"], "", "DATA"],
    ["BDS-02 malformed", ["BDS", "B64", "4X", "DATA"], "4X", "DATA"],
    ["BDS-02 signed", ["BDS", "B64", "-4", "DATA"], "-4", "DATA"],
  ];
  for (const [name, segment, declared, data] of INVALID) {
    it(`AC-8: ${name}`, () => {
      const reading = read([...HEAD, segment, ["REF", "ZZ", "AFTER"]]);
      expect(framing(reading)).toEqual([[WARNING_CODES.X12_BINARY_LENGTH_INVALID, AT]]);
      const [attachment] = reading.attachments;
      expect(attachment?.declaredLength).toBe(declared);
      expect(attachment?.data.readOctets()).toBe(data);
      expect(attachment?.lengthVerified).toBe(false);
    });
  }

  it("AC-8: the data does not end where BDS-02 says", () => {
    const reading = read([...HEAD, ["BDS", "B64", "4", "DATAMORE"], ["REF", "ZZ", "AFTER"]]);
    expect(framing(reading)).toEqual([[WARNING_CODES.X12_BINARY_LENGTH_MISMATCH, AT]]);
    const [attachment] = reading.attachments;
    expect(attachment?.declaredLength).toBe("4");
    expect(attachment?.data.readOctets()).toBe("DATA");
    expect(attachment?.lengthVerified).toBe(false);
  });

  it("AC-8: a non-zero BDS-02 with no data element", () => {
    const reading = read([...HEAD, ["BDS", "B64", "4"], ["REF", "ZZ", "AFTER"]]);
    expect(framing(reading)).toEqual([[WARNING_CODES.X12_BINARY_LENGTH_MISMATCH, AT]]);
    expect(reading.attachments[0]?.data.readOctets()).toBe("");
    expect(reading.attachments[0]?.lengthVerified).toBe(false);
  });

  it("AC-8: the span holds a character above U+00FF", () => {
    const reading = read([...HEAD, ["BDS", "B64", "5", "AB€CD"], ["REF", "ZZ", "AFTER"]]);
    expect(framing(reading)).toEqual([[WARNING_CODES.X12_BINARY_LENGTH_UNVERIFIABLE, AT]]);
    expect(reading.attachments[0]?.data.readOctets()).toBe("AB€CD");
    expect(reading.attachments[0]?.lengthVerified).toBe(false);
  });

  it("AC-8: marks only the attachment whose framing failed, so a caller need not read the warnings", () => {
    const reading = read([
      ...HEAD,
      bds("GOODDATA"),
      ["BDS", "B64", "4", "DATAMORE"],
      bds("MOREGOOD"),
    ]);
    expect(reading.attachments.map((a) => a.lengthVerified)).toEqual([true, false, true]);
    expect(framing(reading)).toEqual([[WARNING_CODES.X12_BINARY_LENGTH_MISMATCH, 3]]);
  });
});

// ---------------------------------------------------------------------------
// AC-9
// ---------------------------------------------------------------------------

describe("AC-9: a 275 with no BDS, or of another guide, is still read and says why", () => {
  it("AC-9: a 006020X314 275 with no BDS returns an empty attachment list and X12_275_ATTACHMENT_ABSENT at the ST", () => {
    const reading = read(ATTACHMENT_BODY.filter((segment) => segment[0] !== "BDS"));
    expect(reading.attachments).toEqual([]);
    expect(reading.lines).toHaveLength(2);
    expect(reading.warnings.map((w) => [w.code, w.position.segmentIndex])).toEqual([
      [WARNING_CODES.X12_275_ATTACHMENT_ABSENT, 0],
    ]);
  });

  const FOREIGN: readonly (readonly [string, Declaration, X12WarningCode])[] = [
    [
      "the 278 attachments guide 006020X316",
      { st03: "006020X316", gs08: "006020X316" },
      WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED,
    ],
    [
      "the 005010 attachments draft 005010X210",
      { st03: "005010X210", gs08: "005010X210" },
      WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED,
    ],
    [
      "the 162.2002(c) short spelling 06020X314",
      { st03: "06020X314", gs08: "" },
      WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED,
    ],
    ["no guide at all", { st03: null, gs08: null }, WARNING_CODES.X12_GUIDE_NOT_DECLARED],
    ["no guide, both elements empty", { st03: "", gs08: "" }, WARNING_CODES.X12_GUIDE_NOT_DECLARED],
  ];
  for (const [name, declaration, code] of FOREIGN) {
    it(`AC-9: ${name} still returns the reading, carrying ${code}`, () => {
      const reading = read(ATTACHMENT_BODY, declaration);
      expect(
        reading.warnings
          .filter((w) => GUIDE_CODES.has(w.code))
          .map((w) => [w.code, w.position.segmentIndex]),
      ).toEqual([[code, 0]]);
      expect(reading.attachments.map((a) => a.data.readOctets())).toEqual([
        DATA_ONE,
        DATA_TWO,
        DATA_THREE,
      ]);
    });
  }

  it("AC-9: a 006020X314 declared in GS-08 alone is implemented", () => {
    const reading = read(ATTACHMENT_BODY, { st03: null, gs08: X314 });
    expect(reading.warnings).toEqual([]);
  });

  it("AC-9: a transaction set that is not a 275 gets no reading", () => {
    const ix = parseX12(interchange(ATTACHMENT_BODY).replace("ST*275*", "ST*277*"));
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no transaction set");
    expect(get275Attachments(ix.delimiters, tx)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC-10
// ---------------------------------------------------------------------------

describe("AC-10: no printing route carries an attachment octet, and one explicit read returns them all", () => {
  /** Invented octets no other part of the reading holds. */
  const SECRET = "QZJ7XV9K-SYNTHETIC-OCTETS-WQ8ZKJ3V";
  const reading = read([["LX", "1"], ["REF", "1K", "PCN0001"], bds(SECRET)]);

  /** Every four-character window of the secret, so a partial echo is caught too. */
  const windows = Array.from({ length: SECRET.length - 3 }, (_, i) => SECRET.slice(i, i + 4));

  function carriesNone(text: string): void {
    for (const window of windows) expect(text).not.toContain(window);
  }

  it("AC-10: the control: the octets are on the transaction set this reading came from", () => {
    const ix = parseX12(interchange([["LX", "1"], ["REF", "1K", "PCN0001"], bds(SECRET)]));
    expect(ix.groups[0]?.transactions[0]?.segments.some((s) => s.raw.includes(SECRET))).toBe(true);
    expect(`${SECRET}`).toContain(windows[0] ?? "");
  });

  /** `String()` of any value, the conversion a logger applies to what it is handed. */
  const stringOf = (value: unknown): string => String(value);

  it("AC-10: converted to a string", () => {
    const data = reading.attachments[0]?.data;
    carriesNone(stringOf(reading));
    carriesNone(stringOf(reading.attachments));
    carriesNone(stringOf(reading.attachments[0]));
    carriesNone(stringOf(data));
    carriesNone(`${stringOf(data)}`);
    carriesNone(data === undefined ? "" : data.toString());
    carriesNone(`${data?.[Symbol.toPrimitive]() ?? ""}`);
    expect(stringOf(data)).toBe(`[X12AttachmentData: ${String(SECRET.length)} octets withheld]`);
  });

  it("AC-10: serialized with JSON.stringify", () => {
    carriesNone(JSON.stringify(reading));
    carriesNone(JSON.stringify(reading.attachments[0]));
    carriesNone(JSON.stringify(reading.attachments[0]?.data));
  });

  it("AC-10: passed to util.inspect, at any depth and with hidden properties shown", () => {
    carriesNone(inspect(reading));
    carriesNone(inspect(reading, { depth: Infinity }));
    carriesNone(inspect(reading, { depth: Infinity, showHidden: true }));
    carriesNone(inspect(reading.attachments[0]?.data, { showHidden: true }));
  });

  it("AC-10: returns the octets verbatim through the explicit read", () => {
    const data = reading.attachments[0]?.data;
    expect(data).toBeInstanceOf(X12AttachmentData);
    expect(data?.readOctets()).toBe(SECRET);
    expect(data?.octetCount).toBe(SECRET.length);
  });
});

// ---------------------------------------------------------------------------
// AC-12, AC-13, AC-14: the builder.
// ---------------------------------------------------------------------------

const ENVELOPE = {
  senderId: "CLINIC01",
  receiverId: "PAYER01",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

/** Every delimiter of the default set, and the release character. */
const EVERY_DELIMITER = "*^:~?";

const SPEC: Build275Spec = {
  envelope: ENVELOPE,
  beginning: { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001", date: "20260601" },
  entities: [
    { entityIdentifierCode: "PR", entityTypeQualifier: "2", lastOrOrganizationName: "PAYER ONE" },
  ],
  lines: [
    {
      trace: { traceTypeCode: "2", referenceId: "TRACE-0001" },
      status: { codes: [{ categoryCode: "R0", statusCode: "18842-5", codeListQualifier: "LOI" }] },
      references: [{ qualifier: "1K", value: "PCN0001" }],
      attachments: [
        { filterCode: "B64", data: DATA_ONE },
        { filterCode: "ASC", data: `PRE${EVERY_DELIMITER}??POST` },
      ],
    },
  ],
};

function firstTx(ix: X12Interchange) {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("no transaction set");
  return tx;
}

describe("AC-12: a built 275 declares 006020X314 and writes each attachment exactly", () => {
  const ix = build275(SPEC);
  const text = serializeX12(ix);

  it("AC-12: writes GS-01 PI and 006020X314 in GS-08 and ST-03", () => {
    expect(ix.groups[0]?.gs.elements[1]).toBe("PI");
    expect(ix.groups[0]?.gs.elements[8]).toBe(X314);
    expect(firstTx(ix).st.elements[1]).toBe("275");
    expect(firstTx(ix).st.elements[3]).toBe(X314);
    expect(ix.warnings).toEqual([]);
  });

  it("AC-12: writes BDS-01 as given, BDS-03 as the caller's octets unescaped, and BDS-02 as their count", () => {
    const withDelimiters = `PRE${EVERY_DELIMITER}??POST`;
    expect(text).toContain(`~BDS*B64*${String(DATA_ONE.length)}*${DATA_ONE}~`);
    expect(text).toContain(`~BDS*ASC*${String(withDelimiters.length)}*${withDelimiters}~`);
    // Not one release character was added to the data.
    expect(text).not.toContain(`PRE?*`);
  });

  it("AC-12: counts octets, not characters of some other encoding, for a Uint8Array of every byte", () => {
    const every = Uint8Array.from({ length: 256 }, (_, i) => i);
    const built = build275({
      envelope: ENVELOPE,
      lines: [{ attachments: [{ filterCode: "BIN", data: every }] }],
    });
    const bytes = Buffer.from(serializeX12(built), "latin1");
    const marker = Buffer.from("~BDS*BIN*256*", "latin1");
    const at = bytes.indexOf(marker);
    expect(at).toBeGreaterThan(0);
    const written = bytes.subarray(at + marker.length, at + marker.length + 256);
    expect(Buffer.compare(written, Buffer.from(every))).toBe(0);
    expect(bytes[at + marker.length + 256]).toBe("~".charCodeAt(0));
  });
});

describe("AC-13: a built 275 reads back, as a string and as a Buffer, to the same attachments", () => {
  const DELIMITERS = ["*", "^", ":", "~", "?", "\r", "\n"] as const;

  it("AC-13: round trips random payloads, each holding at least one delimiter, with no framing or guide warning", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.uint8Array({ minLength: 0, maxLength: 80 }),
            fc.constantFrom(...DELIMITERS),
            fc.nat(),
            fc.constantFrom("B64", "ASC", "BIN"),
          ),
          { minLength: 1, maxLength: 4 },
        ),
        (drawn) => {
          const attachments = drawn.map(([bytes, delimiter, at, filterCode]) => {
            const noise = Buffer.from(bytes).toString("latin1");
            const cut = at % (noise.length + 1);
            return { filterCode, data: noise.slice(0, cut) + delimiter + noise.slice(cut) };
          });
          const text = serializeX12(build275({ envelope: ENVELOPE, lines: [{ attachments }] }));
          for (const input of [text, Buffer.from(text, "latin1")]) {
            const reading = readRaw(input);
            expect(
              reading.attachments.map((a) => [a.filterCode, a.declaredLength, a.data.readOctets()]),
            ).toEqual(attachments.map((a) => [a.filterCode, String(a.data.length), a.data]));
            expect(reading.warnings.filter((w) => BINARY_CODES.has(w.code))).toEqual([]);
            expect(reading.warnings.filter((w) => GUIDE_CODES.has(w.code))).toEqual([]);
            expect(reading.attachments.every((a) => a.lengthVerified)).toBe(true);
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});

describe("AC-14: the builder refuses what cannot carry a true BDS-02, and returns no interchange", () => {
  /** A JS caller who defeated their own type checker. */
  const asJsCaller = <T>(value: unknown): T => value as T;

  function refusal(spec: Build275Spec): Attachment275BuildError {
    let thrown: unknown;
    let returned: unknown;
    try {
      returned = build275(spec);
    } catch (err) {
      thrown = err;
    }
    expect(returned).toBeUndefined();
    expect(thrown).toBeInstanceOf(Attachment275BuildError);
    return thrown as Attachment275BuildError;
  }

  const withAttachments = (attachments: unknown): Build275Spec => ({
    envelope: ENVELOPE,
    lines: [{ attachments: asJsCaller(attachments) }],
  });

  const CASES: readonly (readonly [string, Build275Spec, string])[] = [
    [
      "no line at all",
      { envelope: ENVELOPE, lines: [] },
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_NO_ATTACHMENT,
    ],
    [
      "lines that carry no attachment",
      { envelope: ENVELOPE, lines: [{}, { attachments: [] }] },
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_NO_ATTACHMENT,
    ],
    [
      "an attachment with empty string data",
      withAttachments([{ filterCode: "B64", data: "" }]),
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_EMPTY_DATA,
    ],
    [
      "an attachment with an empty Uint8Array",
      withAttachments([{ filterCode: "B64", data: new Uint8Array(0) }]),
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_EMPTY_DATA,
    ],
    [
      "a two-character filter code",
      withAttachments([{ filterCode: "B6", data: DATA_ONE }]),
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_FILTER_CODE_INVALID,
    ],
    [
      "a four-character filter code",
      withAttachments([{ filterCode: "B644", data: DATA_ONE }]),
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_FILTER_CODE_INVALID,
    ],
    [
      "an empty filter code",
      withAttachments([{ filterCode: "", data: DATA_ONE }]),
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_FILTER_CODE_INVALID,
    ],
    [
      "data holding a character above U+00FF",
      withAttachments([{ filterCode: "ASC", data: "AB€CD" }]),
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_DATA_NOT_OCTETS,
    ],
    [
      "data holding an astral character",
      withAttachments([{ filterCode: "ASC", data: "AB\u{1F600}" }]),
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_DATA_NOT_OCTETS,
    ],
    [
      "a later attachment of several refused",
      withAttachments([
        { filterCode: "B64", data: DATA_ONE },
        { filterCode: "B64", data: "" },
      ]),
      ATTACHMENT_275_BUILD_ERROR_CODES.X12_275_BUILD_EMPTY_DATA,
    ],
  ];
  for (const [name, spec, code] of CASES) {
    it(`AC-14: ${name}`, () => {
      expect(refusal(spec).code).toBe(code);
    });
  }

  it("AC-14: accepts the boundary: one octet of data, and U+00FF itself", () => {
    const ix = build275(withAttachments([{ filterCode: "ASC", data: "ÿ" }]));
    expect(serializeX12(ix)).toContain("~BDS*ASC*1*ÿ~");
  });
});

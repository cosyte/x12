/**
 * A typed reader returns no reading for a transaction set that declares a
 * guide it does not implement. The case that matters is a pre-005010 document:
 * a 4010 transaction set read against the 005010 element positions gives
 * values that look ordinary and are wrong, so the reader that walks those
 * positions answers `undefined` (or an empty list, or no yielded member) for
 * it, exactly as it does for a transaction set of another ST-01.
 *
 * Each case sends one document twice, byte for byte the same body: once under
 * the 004010 guide of its transaction (refused), and once under the reader's
 * own 005010 guide (read), so the refusal is shown to come from the
 * declaration and not from a body the reader could not walk.
 *
 * **Every fixture in this file is SYNTHETIC.** Each interchange is assembled
 * here at run time with `seg(...)`, and the name and identifier tokens are
 * the placeholders `scripts/phi-allow-list.txt` declares.
 */

import { describe, expect, it } from "vitest";

import {
  WARNING_CODES,
  X12_TR3_CONFORMANCE,
  get270Inquiry,
  get271Eligibility,
  get276StatusInquiry,
  get277CADisposition,
  get277Status,
  get278Request,
  get278Response,
  get820Payments,
  get834Enrollments,
  get834Header,
  get835,
  get837Claims,
  parse270Inquiries,
  parse276StatusInquiries,
  parseX12,
  type Delimiters,
  type X12TransactionSet,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

const D: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };

function seg(...elements: readonly string[]): string {
  return elements.join(D.element) + D.segment;
}

function comp(...components: readonly string[]): string {
  return components.join(D.component);
}

/**
 * A one-group, one-transaction interchange. `isaVersion` is ISA-12, `gs08` is
 * GS-08, and the ST carries no ST-03, as a 4010 ST does not, unless `st03` is
 * given.
 */
function interchange(
  isaVersion: string,
  st01: string,
  functionalId: string,
  gs08: string,
  body: readonly (readonly string[])[],
  st03?: string,
): string {
  const segments = [
    ["GS", functionalId, "SENDER", "RECEIVER", "20260101", "1200", "1", "X", gs08],
    st03 === undefined ? ["ST", st01, "0001"] : ["ST", st01, "0001", st03],
    ...body,
    ["SE", String(body.length + 2), "0001"],
    ["GE", "1", "1"],
    ["IEA", "1", "000000001"],
  ];
  return buildIsa({ version: isaVersion }) + segments.map((e) => seg(...e)).join("");
}

function only(raw: string): X12TransactionSet {
  const tx = parseX12(raw).groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the fixture framed no transaction set");
  return tx;
}

function tr3Of(transaction: string, variant: string | null): string {
  const row = X12_TR3_CONFORMANCE.find(
    (r) => r.transaction === transaction && r.variant === variant,
  );
  if (row?.tr3 === undefined || row.tr3 === null) throw new Error(`no row ${transaction}`);
  return row.tr3;
}

async function enrollments(tx: X12TransactionSet): Promise<readonly unknown[]> {
  const out: unknown[] = [];
  for await (const member of get834Enrollments(D, tx)) out.push(member);
  return out;
}

// ---- Bodies -----------------------------------------------------------------

const BODY_270 = [
  ["BHT", "0022", "13", "REQ-0001", "20260101", "1200"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "PR", "2", "PAYER ONE"],
  ["HL", "2", "1", "21", "1"],
  ["NM1", "1P", "2", "CLINIC ONE"],
  ["HL", "3", "2", "22", "0"],
  ["TRN", "1", "TRACE-0001", "9SUBMITTER"],
  ["NM1", "IL", "1", "DOE", "JANE"],
  ["EQ", "30"],
];

const BODY_271 = [
  ["BHT", "0022", "11", "RESP-0001", "20260101", "1200"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "PR", "2", "PAYER ONE"],
  ["HL", "2", "1", "21", "1"],
  ["NM1", "1P", "2", "CLINIC ONE"],
  ["HL", "3", "2", "22", "0"],
  ["TRN", "2", "TRACE-0001", "9SUBMITTER"],
  ["NM1", "IL", "1", "DOE", "JANE"],
  ["EB", "1", "IND", "30"],
];

const BODY_276 = [
  ["BHT", "0010", "13", "STATUS-0001", "20260101", "1200"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "PR", "2", "PAYER ONE"],
  ["HL", "2", "1", "21", "1"],
  ["NM1", "41", "2", "CLINIC ONE"],
  ["HL", "3", "2", "19", "1"],
  ["NM1", "1P", "2", "CLINIC ONE"],
  ["HL", "4", "3", "22", "0"],
  ["NM1", "IL", "1", "DOE", "JANE"],
  ["TRN", "1", "TRACE-0001"],
  ["REF", "1K", "CLAIM-0001"],
];

const BODY_277 = [
  ["BHT", "0010", "08", "STATUS-0001", "20260101", "1200", "DG"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "PR", "2", "PAYER ONE"],
  ["HL", "2", "1", "21", "1"],
  ["NM1", "41", "2", "CLINIC ONE"],
  ["HL", "3", "2", "19", "1"],
  ["NM1", "1P", "2", "CLINIC ONE"],
  ["HL", "4", "3", "22", "0"],
  ["NM1", "IL", "1", "DOE", "JANE"],
  ["TRN", "2", "TRACE-0001"],
  ["STC", comp("A2", "20"), "20260101", "WQ", "150"],
];

const BODY_278 = [
  ["BHT", "0007", "11", "AUTH-0001", "20260101", "1200"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "X3", "2", "REVIEW ORG ONE"],
  ["HL", "2", "1", "21", "1"],
  ["NM1", "1P", "2", "CLINIC ONE"],
  ["HL", "3", "2", "22", "1"],
  ["NM1", "IL", "1", "DOE", "JANE"],
  ["HL", "4", "3", "EV", "0"],
  ["TRN", "1", "TRACE-0001", "9SUBMITTER"],
  ["UM", "HS", "I", "1"],
  ["HCR", "A1", "AUTH-0001"],
];

const BODY_820 = [
  ["BPR", "C", "150.00", "C", "CHK"],
  ["TRN", "3", "TRACE-0001"],
  ["N1", "PE", "PAYEE ONE"],
  ["N1", "PR", "PAYER ONE"],
  ["ENT", "1"],
  ["RMR", "AZ", "POL-0001", "PI", "150.00", "150.00"],
];

const BODY_834 = [
  ["BGN", "00", "ENR-0001", "20260101", "1200", "", "", "", "2"],
  ["N1", "P5", "SPONSOR ONE"],
  ["N1", "IN", "PAYER ONE"],
  ["INS", "Y", "18", "021", "EC", "A"],
  ["REF", "0F", "MBR0001"],
  ["NM1", "IL", "1", "DOE", "JANE", "", "", "", "MI", "MBR0001"],
  ["HD", "021", "", "HLT"],
];

const BODY_835 = [
  ["BPR", "I", "150.00", "C", "CHK", "", "", "", "", "", "", "", "", "", "", "", "20260101"],
  ["TRN", "1", "TRACE-0001", "1512345678"],
  ["N1", "PR", "PAYER ONE"],
  ["N1", "PE", "CLINIC ONE"],
  ["LX", "1"],
  ["CLP", "CLAIM-0001", "1", "150.00", "150.00", "", "12", "PAYERCLAIM-0001"],
  ["NM1", "QC", "1", "DOE", "JANE", "", "", "", "MI", "MEMBER001"],
  ["SVC", comp("HC", "99213"), "150.00", "150.00", "", "1"],
];

const BODY_837P = [
  ["BHT", "0019", "00", "CLAIM-REF-1", "20260101", "1200", "CH"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "85", "2", "BILLING CLINIC INC", "", "", "", "", "XX", "1234567890"],
  ["HL", "2", "1", "22", "0"],
  ["SBR", "P", "18", "GROUP123", "", "", "", "", "", "MB"],
  ["NM1", "IL", "1", "TEST", "PATIENT", "A", "", "", "MI", "MEMBER001"],
  ["CLM", "PT-ACCT-900", "8500", "", "", comp("11", "B", "1"), "Y", "A", "Y", "Y"],
  ["LX", "1"],
  ["SV1", comp("HC", "99213"), "8500", "UN", "4", "", "", "1"],
];

const BODY_837I = [
  ["BHT", "0019", "00", "CLAIM-REF-2", "20260101", "1200", "CH"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "85", "2", "BILLING CLINIC INC", "", "", "", "", "XX", "1234567890"],
  ["HL", "2", "1", "22", "0"],
  ["SBR", "P", "18"],
  ["NM1", "IL", "1", "TEST", "PATIENT"],
  ["CLM", "PT-ACCT-901", "150", "", "", comp("13", "A", "1")],
  ["LX", "1"],
  ["SV2", "0300", "", "150", "UN", "1"],
];

const BODY_837D = [
  ["BHT", "0019", "00", "CLAIM-REF-3", "20260101", "1200", "CH"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "85", "2", "BILLING CLINIC INC", "", "", "", "", "XX", "1234567890"],
  ["HL", "2", "1", "22", "0"],
  ["SBR", "P", "18"],
  ["NM1", "IL", "1", "TEST", "PATIENT"],
  ["CLM", "PT-ACCT-902", "90", "", "", comp("11", "B", "1")],
  ["LX", "1"],
  ["SV3", comp("AD", "D0120"), "90"],
];

// ---- The cases --------------------------------------------------------------

/** What one reader answers for one transaction set: a reading count. */
type Count = (tx: X12TransactionSet, raw: string) => Promise<number>;

const one =
  (read: (d: Delimiters, tx: X12TransactionSet) => unknown): Count =>
  (tx) =>
    Promise.resolve(read(D, tx) === undefined ? 0 : 1);

interface Case {
  readonly reader: string;
  readonly st01: string;
  readonly functionalId: string;
  /** The 004010 guide this transaction was published under. */
  readonly guide4010: string;
  /** The reader's own guide, read off its conformance row. */
  readonly guide5010: string;
  readonly body: readonly (readonly string[])[];
  readonly count: Count;
}

const CASES: readonly Case[] = [
  {
    reader: "get270Inquiry",
    st01: "270",
    functionalId: "HS",
    guide4010: "004010X092A1",
    guide5010: tr3Of("270", null),
    body: BODY_270,
    count: one(get270Inquiry),
  },
  {
    reader: "parse270Inquiries",
    st01: "270",
    functionalId: "HS",
    guide4010: "004010X092A1",
    guide5010: tr3Of("270", null),
    body: BODY_270,
    count: (_tx, raw) => Promise.resolve(parse270Inquiries(raw).length),
  },
  {
    reader: "get271Eligibility",
    st01: "271",
    functionalId: "HB",
    guide4010: "004010X092A1",
    guide5010: tr3Of("271", null),
    body: BODY_271,
    count: one(get271Eligibility),
  },
  {
    reader: "get276StatusInquiry",
    st01: "276",
    functionalId: "HR",
    guide4010: "004010X093A1",
    guide5010: tr3Of("276", null),
    body: BODY_276,
    count: one(get276StatusInquiry),
  },
  {
    reader: "parse276StatusInquiries",
    st01: "276",
    functionalId: "HR",
    guide4010: "004010X093A1",
    guide5010: tr3Of("276", null),
    body: BODY_276,
    count: (_tx, raw) => Promise.resolve(parse276StatusInquiries(raw).length),
  },
  {
    reader: "get277Status",
    st01: "277",
    functionalId: "HN",
    guide4010: "004010X093A1",
    guide5010: tr3Of("277", null),
    body: BODY_277,
    count: one(get277Status),
  },
  {
    reader: "get277Status (277U)",
    st01: "277",
    functionalId: "HN",
    guide4010: "004010X070",
    guide5010: tr3Of("277", null),
    body: BODY_277,
    count: one(get277Status),
  },
  {
    reader: "get278Request",
    st01: "278",
    functionalId: "HI",
    guide4010: "004010X094A1",
    guide5010: tr3Of("278", "request"),
    body: BODY_278,
    count: one(get278Request),
  },
  {
    reader: "get278Response",
    st01: "278",
    functionalId: "HI",
    guide4010: "004010X094A1",
    guide5010: tr3Of("278", "response"),
    body: BODY_278,
    count: one(get278Response),
  },
  {
    reader: "get820Payments",
    st01: "820",
    functionalId: "RA",
    guide4010: "004010X061A1",
    guide5010: tr3Of("820", null),
    body: BODY_820,
    count: one(get820Payments),
  },
  {
    reader: "get834Header",
    st01: "834",
    functionalId: "BE",
    guide4010: "004010X095A1",
    guide5010: tr3Of("834", null),
    body: BODY_834,
    count: one(get834Header),
  },
  {
    reader: "get834Enrollments",
    st01: "834",
    functionalId: "BE",
    guide4010: "004010X095A1",
    guide5010: tr3Of("834", null),
    body: BODY_834,
    count: async (tx) => (await enrollments(tx)).length,
  },
  {
    reader: "get835",
    st01: "835",
    functionalId: "HP",
    guide4010: "004010X091A1",
    guide5010: tr3Of("835", null),
    body: BODY_835,
    count: one(get835),
  },
  {
    reader: "get837Claims (professional)",
    st01: "837",
    functionalId: "HC",
    guide4010: "004010X098A1",
    guide5010: tr3Of("837", "P"),
    body: BODY_837P,
    count: one(get837Claims),
  },
  {
    reader: "get837Claims (institutional)",
    st01: "837",
    functionalId: "HC",
    guide4010: "004010X096A1",
    guide5010: tr3Of("837", "I"),
    body: BODY_837I,
    count: one(get837Claims),
  },
  {
    reader: "get837Claims (dental)",
    st01: "837",
    functionalId: "HC",
    guide4010: "004010X097A1",
    guide5010: tr3Of("837", "D"),
    body: BODY_837D,
    count: one(get837Claims),
  },
];

describe("a typed reader returns no reading for a 4010 transaction set", () => {
  for (const c of CASES) {
    it(`${c.reader}: a ${c.guide4010} ${c.st01} under ISA-12 00401 gets no reading`, async () => {
      const raw = interchange("00401", c.st01, c.functionalId, c.guide4010, c.body);
      // The interchange still parses, and says it is pre-005010.
      const ix = parseX12(raw);
      expect(ix.warnings.map((w) => w.code)).toContain(WARNING_CODES.X12_PRE_005010);
      expect(await c.count(only(raw), raw)).toBe(0);
    });

    it(`${c.reader}: the same body under ${c.guide5010} is read`, async () => {
      const raw = interchange("00501", c.st01, c.functionalId, c.guide5010, c.body);
      expect(await c.count(only(raw), raw)).toBeGreaterThan(0);
    });
  }

  it("get277CADisposition: a 4010 277 gets no reading, as before", () => {
    const raw = interchange("00401", "277", "HN", "004010X093A1", BODY_277);
    expect(get277CADisposition(D, only(raw))).toBeUndefined();
  });
});

describe("what a 4010 document with no declared guide still gets", () => {
  // GS-08 empty and no ST-03: nothing is declared, so the reader cannot tell a
  // 4010 transaction set from a 005010 one. It reads, and says so.
  it("get835: a 4010 835 with an empty GS-08 is read and carries X12_GUIDE_NOT_DECLARED", () => {
    const raw = interchange("00401", "835", "HP", "", BODY_835);
    const remit = get835(D, only(raw));
    expect(remit).toBeDefined();
    expect(remit?.warnings.map((w) => w.code)).toContain(WARNING_CODES.X12_GUIDE_NOT_DECLARED);
    expect(remit?.warnings.map((w) => w.code)).not.toContain(
      WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED,
    );
  });
});

describe("a 005010 declaration that differs only in padding or case is still read", () => {
  // The refusal compares the declaration trimmed and upper-cased; the warning
  // keeps its exact comparison. So each of these is read, as it was before
  // readers refused anything, and a guide outside the reader even then is
  // still refused.
  for (const c of CASES) {
    it(`${c.reader}: ST-03 ${c.guide5010} with a space either side is read`, async () => {
      const raw = interchange(
        "00501",
        c.st01,
        c.functionalId,
        c.guide5010,
        c.body,
        ` ${c.guide5010} `,
      );
      expect(await c.count(only(raw), raw)).toBeGreaterThan(0);
    });

    it(`${c.reader}: ST-03 ${c.guide5010} in lower case is read`, async () => {
      const lower = c.guide5010.toLowerCase();
      const raw = interchange("00501", c.st01, c.functionalId, c.guide5010, c.body, lower);
      expect(await c.count(only(raw), raw)).toBeGreaterThan(0);
    });

    it(`${c.reader}: an ST-03 of whitespace alone under an empty GS-08 is read`, async () => {
      const raw = interchange("00501", c.st01, c.functionalId, "", c.body, "   ");
      expect(await c.count(only(raw), raw)).toBeGreaterThan(0);
    });

    it(`${c.reader}: ${c.guide4010} padded and in lower case is still refused`, async () => {
      const declared = ` ${c.guide4010.toLowerCase()} `;
      const raw = interchange("00401", c.st01, c.functionalId, c.guide4010, c.body, declared);
      expect(await c.count(only(raw), raw)).toBe(0);
    });
  }

  const guideCodes = (warnings: readonly { readonly code: string }[] | undefined): string[] =>
    (warnings ?? [])
      .map((w) => w.code)
      .filter(
        (code) =>
          code === WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED ||
          code === WARNING_CODES.X12_GUIDE_NOT_DECLARED,
      );

  const READERS = [
    {
      name: "get835",
      st01: "835",
      functionalId: "HP",
      guide: tr3Of("835", null),
      guide4010: "004010X091A1",
      body: BODY_835,
      warnings: (tx: X12TransactionSet) => get835(D, tx)?.warnings,
    },
    {
      name: "get837Claims",
      st01: "837",
      functionalId: "HC",
      guide: tr3Of("837", "P"),
      guide4010: "004010X098A1",
      body: BODY_837P,
      warnings: (tx: X12TransactionSet) => get837Claims(D, tx)?.warnings,
    },
  ] as const;

  for (const r of READERS) {
    it(`${r.name}: a padded ST-03 is read and keeps the exact-compare X12_GUIDE_NOT_IMPLEMENTED`, () => {
      const raw = interchange("00501", r.st01, r.functionalId, r.guide, r.body, ` ${r.guide} `);
      expect(guideCodes(r.warnings(only(raw)))).toEqual([WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED]);
    });

    it(`${r.name}: a lower-cased ST-03 is read and keeps the exact-compare X12_GUIDE_NOT_IMPLEMENTED`, () => {
      const lower = r.guide.toLowerCase();
      const raw = interchange("00501", r.st01, r.functionalId, r.guide, r.body, lower);
      expect(guideCodes(r.warnings(only(raw)))).toEqual([WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED]);
    });

    it(`${r.name}: an ST-03 of whitespace alone under an empty GS-08 declares nothing`, () => {
      const raw = interchange("00501", r.st01, r.functionalId, "", r.body, "   ");
      expect(guideCodes(r.warnings(only(raw)))).toEqual([WARNING_CODES.X12_GUIDE_NOT_DECLARED]);
    });

    it(`${r.name}: a GS-08 of whitespace alone and no ST-03 declares nothing`, () => {
      const raw = interchange("00501", r.st01, r.functionalId, "  ", r.body);
      expect(guideCodes(r.warnings(only(raw)))).toEqual([WARNING_CODES.X12_GUIDE_NOT_DECLARED]);
    });

    it(`${r.name}: an ST-03 of whitespace alone falls through to an implemented GS-08`, () => {
      const raw = interchange("00501", r.st01, r.functionalId, r.guide, r.body, "   ");
      expect(guideCodes(r.warnings(only(raw)))).toEqual([]);
    });

    it(`${r.name}: an ST-03 of whitespace alone falls through to a 4010 GS-08, which is refused`, () => {
      const raw = interchange("00401", r.st01, r.functionalId, r.guide4010, r.body, "   ");
      expect(r.warnings(only(raw))).toBeUndefined();
    });
  }

  it("get277Status: a padded 005010 ST-03 is read and labelled unrecognized-guide, as before", () => {
    const guide = tr3Of("277", null);
    const raw = interchange("00501", "277", "HN", guide, BODY_277, ` ${guide} `);
    expect(get277Status(D, only(raw))?.transactionType).toBe("unrecognized-guide");
  });
});

describe("an interchange holding a 4010 and a 005010 transaction set", () => {
  /**
   * One group whose two transaction sets differ in ST-03 and in BHT-03 alone:
   * the first declares `first` and its BHT-03 reads `FIRST-REF`, the second
   * `second` and `SECOND-REF`, so a reading names the set it came from.
   */
  function mixed(
    st01: string,
    functionalId: string,
    first: string,
    second: string,
    body: readonly (readonly string[])[],
  ): string {
    const set = (control: string, st03: string, reference: string): (readonly string[])[] => [
      ["ST", st01, control, st03],
      ...body.map((s) => (s[0] === "BHT" ? s.map((e, i) => (i === 3 ? reference : e)) : s)),
      ["SE", String(body.length + 2), control],
    ];
    const segments = [
      ["GS", functionalId, "SENDER", "RECEIVER", "20260101", "1200", "1", "X", ""],
      ...set("0001", first, "FIRST-REF"),
      ...set("0002", second, "SECOND-REF"),
      ["GE", "2", "1"],
      ["IEA", "1", "000000001"],
    ];
    return buildIsa() + segments.map((e) => seg(...e)).join("");
  }

  it("parse270Inquiries leaves out the 4010 set and reads the 005010 one after it", () => {
    const raw = mixed("270", "HS", "004010X092A1", tr3Of("270", null), BODY_270);
    expect(parseX12(raw).groups[0]?.transactions).toHaveLength(2);
    expect(parse270Inquiries(raw).map((q) => q.header?.referenceId)).toEqual(["SECOND-REF"]);
  });

  it("parse276StatusInquiries leaves out the 4010 set and reads the 005010 one after it", () => {
    const raw = mixed("276", "HR", "004010X093A1", tr3Of("276", null), BODY_276);
    expect(parseX12(raw).groups[0]?.transactions).toHaveLength(2);
    expect(parse276StatusInquiries(raw).map((q) => q.header?.referenceId)).toEqual(["SECOND-REF"]);
  });
});

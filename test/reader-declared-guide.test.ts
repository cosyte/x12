/**
 * The declared-guide check: every typed reader compares the implementation
 * guide a transaction set declares (ST-03 decoded, else GS-08 decoded) with
 * the guides that reader implements, warns where they differ, and still
 * returns its reading. Every test names the acceptance criterion it grades.
 *
 * **Every fixture in this file is SYNTHETIC.** Each interchange is assembled
 * here, at run time, from a Tier 1 shape of the transaction it carries, and
 * only the declaration is varied. No value belongs to a person or an
 * organisation: the name and identifier tokens are the placeholders
 * `scripts/phi-allow-list.txt` declares, and every segment is assembled by
 * `seg(...)` rather than written as literal segment text.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  X12Decimal,
  X12_TR3_CONFORMANCE,
  get270Inquiry,
  get271Eligibility,
  get275Attachments,
  get276StatusInquiry,
  get277CADisposition,
  get277RequestForAdditionalInformation,
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
  parse999,
  parseX12,
  type Delimiters,
  type X12ParseWarning,
  type X12TransactionSet,
} from "../src/index.js";
import { VARIANT_BY_ICR } from "../src/transactions/claim/get-837.js";

import { buildIsa } from "./_helpers/envelope.js";

// ---------------------------------------------------------------------------
// Fixture assembly.
// ---------------------------------------------------------------------------

const CONVENTIONAL: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };

const GUIDE_NOT_IMPLEMENTED = WARNING_CODES.X12_GUIDE_NOT_IMPLEMENTED;
const GUIDE_NOT_DECLARED = WARNING_CODES.X12_GUIDE_NOT_DECLARED;
const GUIDE_CODES: ReadonlySet<string> = new Set<string>([
  GUIDE_NOT_IMPLEMENTED,
  GUIDE_NOT_DECLARED,
]);

/** One segment, from its elements, under the delimiters it is framed with. */
function seg(d: Delimiters, ...elements: readonly string[]): string {
  return elements.join(d.element) + d.segment;
}

/** One composite element, from its components. */
function comp(d: Delimiters, ...components: readonly string[]): string {
  return components.join(d.component);
}

/** `null` leaves the element off the segment altogether; `""` sends it empty. */
interface Declaration {
  readonly st03: string | null;
  readonly gs08: string | null;
}

type Body = (d: Delimiters) => readonly (readonly string[])[];

/**
 * A one-group, one-transaction interchange carrying `body` under `declaration`.
 * `agency` is GS-07, the responsible agency code: `X` everywhere except where
 * `X` is itself the component separator.
 */
function interchange(
  st01: string,
  functionalId: string,
  declaration: Declaration,
  body: readonly (readonly string[])[],
  d: Delimiters = CONVENTIONAL,
  agency = "X",
): string {
  const gs = ["GS", functionalId, "SENDER", "RECEIVER", "20260101", "1200", "1", agency];
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
  const isa = buildIsa({
    element: d.element,
    repetition: d.repetition,
    component: d.component,
    segment: d.segment,
  });
  return isa + segments.map((elements) => seg(d, ...elements)).join("");
}

function firstTransaction(raw: string): { readonly d: Delimiters; readonly tx: X12TransactionSet } {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("the fixture framed no transaction set");
  return { d: ix.delimiters, tx };
}

// ---- Tier 1 bodies, one per transaction ------------------------------------

const BODY_270: Body = () => [
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

const BODY_271: Body = () => [
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

const BODY_276: Body = () => [
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

const BODY_277: Body = (d) => [
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
  ["STC", comp(d, "A2", "20"), "20260101", "WQ", "150"],
];

/** A 275 carrying one attachment whose data holds no delimiter. */
const BODY_275: Body = () => [
  ["BGN", "02", "ATTACH-0001", "20260101"],
  ["NM1", "PR", "2", "PAYER ONE"],
  ["LX", "1"],
  ["TRN", "2", "TRACE-0001"],
  ["BDS", "B64", "8", "U1lOVEhF"],
];

const BODY_278: Body = () => [
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

const BODY_820: Body = () => [
  ["BPR", "C", "150.00", "C", "CHK"],
  ["TRN", "3", "TRACE-0001"],
  ["N1", "PE", "PAYEE ONE"],
  ["N1", "PR", "PAYER ONE"],
  ["ENT", "1"],
  ["RMR", "AZ", "POL-0001", "PI", "150.00", "150.00"],
];

/** Two members, so "every yielded enrollment" is not a statement about one. */
const BODY_834: Body = () => [
  ["BGN", "00", "ENR-0001", "20260101", "1200", "", "", "", "2"],
  ["N1", "P5", "SPONSOR ONE"],
  ["N1", "IN", "PAYER ONE"],
  ["INS", "Y", "18", "021", "EC", "A"],
  ["REF", "0F", "MBR0001"],
  ["NM1", "IL", "1", "DOE", "JANE", "", "", "", "MI", "MBR0001"],
  ["HD", "021", "", "HLT"],
  ["INS", "N", "01", "024", "XN", "A"],
  ["REF", "0F", "MBR0002"],
  ["NM1", "IL", "1", "ROE", "JOHN", "", "", "", "MI", "MBR0002"],
];

/**
 * Balanced at claim, line and remit level. The zero-amount adjustment carries
 * a reason code outside the bundled snapshot, so the reading has a warning of
 * its own and AC-8's "plus the one guide code" compares non-empty lists.
 */
const BODY_835: Body = (d) => [
  ["BPR", "I", "150.00", "C", "CHK", "", "", "", "", "", "", "", "", "", "", "", "20260101"],
  ["TRN", "1", "TRACE-0001", "1512345678"],
  ["N1", "PR", "PAYER ONE"],
  ["N1", "PE", "CLINIC ONE"],
  ["LX", "1"],
  ["CLP", "CLAIM-0001", "1", "150.00", "150.00", "", "12", "PAYERCLAIM-0001"],
  ["NM1", "QC", "1", "DOE", "JANE", "", "", "", "MI", "MEMBER001"],
  ["SVC", comp(d, "HC", "99213"), "150.00", "150.00", "", "1"],
  ["CAS", "CO", "ZZ9", "0"],
];

/** A professional claim. The second HI names a qualifier outside the snapshot. */
const BODY_837P: Body = (d) => [
  ["BHT", "0019", "00", "CLAIM-REF-1", "20260101", "1200", "CH"],
  ["HL", "1", "", "20", "1"],
  ["NM1", "85", "2", "BILLING CLINIC INC", "", "", "", "", "XX", "1234567890"],
  ["HL", "2", "1", "22", "0"],
  ["SBR", "P", "18", "GROUP123", "", "", "", "", "", "MB"],
  ["NM1", "IL", "1", "TEST", "PATIENT", "A", "", "", "MI", "MEMBER001"],
  ["NM1", "PR", "2", "PAYER ONE", "", "", "", "", "PI", "PAYER01"],
  ["CLM", "PT-ACCT-900", "8500", "", "", comp(d, "11", "B", "1"), "Y", "A", "Y", "Y"],
  ["HI", comp(d, "ABK", "J20.9")],
  ["HI", comp(d, "ZZZ", "J20.9")],
  ["LX", "1"],
  ["SV1", comp(d, "HC", "99213"), "8500", "UN", "4", "", "", "1"],
];

const BODY_999: Body = () => [
  ["AK1", "HC", "1", "005010X222A2"],
  ["AK2", "837", "0001", "005010X222A2"],
  ["IK5", "A"],
  ["AK9", "A", "1", "1", "1"],
];

// ---- The readers, behind one shape -----------------------------------------

/** What every reader returns carries this, and it is all the check touches. */
interface Reading {
  readonly warnings: readonly X12ParseWarning[];
}

type ReadRaw = (raw: string) => Promise<readonly Reading[] | undefined>;
type ReadTx = (d: Delimiters, tx: X12TransactionSet) => Promise<readonly Reading[] | undefined>;

interface ReaderCase {
  readonly name: string;
  readonly st01: string;
  readonly functionalId: string;
  /** The reader's own `tr3`, read off its conformance row, never typed here. */
  readonly tr3: string;
  readonly body: Body;
  readonly read: ReadRaw;
  /** Present for the readers called with `(delimiters, tx)`. */
  readonly readTx?: ReadTx;
  /** What the reader answers for a transaction set of another ST-01. */
  readonly mismatch: "undefined" | "empty";
}

function tr3Of(transaction: string, variant: string | null): string {
  const row = X12_TR3_CONFORMANCE.find(
    (r) => r.transaction === transaction && r.variant === variant,
  );
  if (row?.tr3 === undefined || row.tr3 === null) throw new Error(`no row ${transaction}`);
  return row.tr3;
}

function one(reading: Reading | undefined): Promise<readonly Reading[] | undefined> {
  return Promise.resolve(reading === undefined ? undefined : [reading]);
}

async function enrollmentsOf(d: Delimiters, tx: X12TransactionSet): Promise<readonly Reading[]> {
  const out: Reading[] = [];
  for await (const enrollment of get834Enrollments(d, tx)) out.push(enrollment);
  return out;
}

function txCase(
  name: string,
  st01: string,
  functionalId: string,
  tr3: string,
  body: Body,
  readTx: ReadTx,
  mismatch: "undefined" | "empty" = "undefined",
): ReaderCase {
  return {
    name,
    st01,
    functionalId,
    tr3,
    body,
    readTx,
    mismatch,
    read: (raw) => {
      const { d, tx } = firstTransaction(raw);
      return readTx(d, tx);
    },
  };
}

function rawCase(
  name: string,
  st01: string,
  functionalId: string,
  tr3: string,
  body: Body,
  read: ReadRaw,
  mismatch: "undefined" | "empty",
): ReaderCase {
  return { name, st01, functionalId, tr3, body, read, mismatch };
}

const R270 = tr3Of("270", null);
const R276 = tr3Of("276", null);
const R277 = tr3Of("277", null);
const R278 = tr3Of("278", "request");
const R834 = tr3Of("834", null);

/** Every in-scope reader except `get277CADisposition`, which AC-2 excludes. */
const READERS: readonly ReaderCase[] = [
  txCase("get270Inquiry", "270", "HS", R270, BODY_270, (d, tx) => one(get270Inquiry(d, tx))),
  rawCase(
    "parse270Inquiries",
    "270",
    "HS",
    R270,
    BODY_270,
    (raw) => Promise.resolve(parse270Inquiries(raw)),
    "empty",
  ),
  txCase("get271Eligibility", "271", "HB", tr3Of("271", null), BODY_271, (d, tx) =>
    one(get271Eligibility(d, tx)),
  ),
  // AC-9 (claims attachments): the 275 reader warns and returns as every
  // reader in this list does, so it is swept by every check below.
  txCase("get275Attachments", "275", "PI", tr3Of("275", null), BODY_275, (d, tx) =>
    one(get275Attachments(d, tx)),
  ),
  txCase("get276StatusInquiry", "276", "HR", R276, BODY_276, (d, tx) =>
    one(get276StatusInquiry(d, tx)),
  ),
  rawCase(
    "parse276StatusInquiries",
    "276",
    "HR",
    R276,
    BODY_276,
    (raw) => Promise.resolve(parse276StatusInquiries(raw)),
    "empty",
  ),
  txCase("get277Status", "277", "HN", R277, BODY_277, (d, tx) => one(get277Status(d, tx))),
  txCase("get278Request", "278", "HI", R278, BODY_278, (d, tx) => one(get278Request(d, tx))),
  txCase("get278Response", "278", "HI", R278, BODY_278, (d, tx) => one(get278Response(d, tx))),
  txCase("get820Payments", "820", "RA", tr3Of("820", null), BODY_820, (d, tx) =>
    one(get820Payments(d, tx)),
  ),
  txCase("get834Header", "834", "BE", R834, BODY_834, (d, tx) => one(get834Header(d, tx))),
  txCase("get834Enrollments", "834", "BE", R834, BODY_834, enrollmentsOf, "empty"),
  txCase("get835", "835", "HP", tr3Of("835", null), BODY_835, (d, tx) => one(get835(d, tx))),
  txCase("get837Claims", "837", "HC", tr3Of("837", "P"), BODY_837P, (d, tx) =>
    one(get837Claims(d, tx)),
  ),
  rawCase(
    "parse999",
    "999",
    "FA",
    tr3Of("999", null),
    BODY_999,
    (raw) => one(parse999(raw)),
    "undefined",
  ),
];

const CA_READER: ReaderCase = txCase(
  "get277CADisposition",
  "277",
  "HN",
  tr3Of("277", "277CA"),
  BODY_277,
  (d, tx) => one(get277CADisposition(d, tx)),
);

/**
 * The 277 request for additional information reader. Outside `READERS`
 * because it returns no reading for a 277 declaring any other guide (D1),
 * where every reader in that list warns and returns.
 */
const RFAI_READER: ReaderCase = txCase(
  "get277RequestForAdditionalInformation",
  "277",
  "HN",
  tr3Of("277", "RFAI"),
  BODY_277,
  (d, tx) => one(get277RequestForAdditionalInformation(d, tx)),
);

function readerNamed(name: string): ReaderCase {
  const reader = [...READERS, CA_READER, RFAI_READER].find((r) => r.name === name);
  if (reader === undefined) throw new Error(`no reader ${name}`);
  return reader;
}

/** The reader's own guide number under another version: not a member of its set. */
function foreign(reader: ReaderCase, version: "004010" | "008020" = "004010"): string {
  return reader.tr3.replace(/^00\d{4}/u, version);
}

async function readAs(reader: ReaderCase, declaration: Declaration): Promise<readonly Reading[]> {
  const raw = interchange(reader.st01, reader.functionalId, declaration, reader.body(CONVENTIONAL));
  const readings = await reader.read(raw);
  if (readings === undefined || readings.length === 0) {
    throw new Error(`${reader.name} returned no reading`);
  }
  return readings;
}

function guideWarnings(reading: Reading): readonly X12ParseWarning[] {
  return reading.warnings.filter((w) => GUIDE_CODES.has(w.code));
}

/** Code and anchor of every guide warning on every reading. */
function guideChannel(readings: readonly Reading[]): (readonly [string, number])[][] {
  return readings.map((r) =>
    guideWarnings(r).map((w) => [w.code, w.position.segmentIndex] as const),
  );
}

function each(readings: readonly Reading[], expected: readonly (readonly [string, number])[]) {
  return readings.map(() => expected);
}

// ---------------------------------------------------------------------------
// AC-1
// ---------------------------------------------------------------------------

describe("AC-1: a 277 declaring 006020X313 is labelled neither a claim status nor a claim acknowledgment", () => {
  const X313 = "006020X313";
  const cases: readonly (readonly [string, Declaration])[] = [
    ["declared in ST-03", { st03: X313, gs08: X313 }],
    ["declared in GS-08 under an ST with no ST-03", { st03: null, gs08: X313 }],
  ];
  for (const [route, declaration] of cases) {
    it(`AC-1: ${route}`, () => {
      const { d, tx } = firstTransaction(
        interchange("277", "HN", declaration, BODY_277(CONVENTIONAL)),
      );
      const status = get277Status(d, tx);
      expect(status).toBeDefined();
      expect(["claim-status", "claim-acknowledgment"]).not.toContain(status?.transactionType);
      expect(status?.warnings.map((w) => w.code)).toContain(GUIDE_NOT_IMPLEMENTED);
      // Still walked: the reading is the body, not an empty stand-in.
      expect(status?.claims[0]?.traces[0]?.referenceId).toBe("TRACE-0001");
      expect(get277CADisposition(d, tx)).toBeUndefined();
    });
  }
});

// ---------------------------------------------------------------------------
// AC-5 (claims attachments): with the 006020X313 row present, the claim status
// readers answer a 006020X313 277 exactly as they did without it.
// ---------------------------------------------------------------------------

describe("AC-5: the 006020X313 row leaves both existing 277 readers where they were", () => {
  const X313 = "006020X313";
  const GOLDEN = join(import.meta.dirname, "fixtures", "golden");

  /** A reading as text, each exact decimal written out, so a digest can pin it. */
  function stable(value: unknown): string {
    return (
      JSON.stringify(value, (_key, v: unknown) =>
        v instanceof X12Decimal ? `X12Decimal(${v.toString()})` : v,
      ) ?? "undefined"
    );
  }

  function digest(value: unknown): string {
    return createHash("sha256").update(stable(value)).digest("hex");
  }

  it("AC-5: the row is present and read, so the check below runs against it", () => {
    const row = X12_TR3_CONFORMANCE.find((r) => r.tr3 === X313);
    expect(row?.transaction).toBe("277");
    expect(row?.directions).toContain("read");
    expect(X12_TR3_CONFORMANCE.some((r) => r.tr3 === "006020X314")).toBe(true);
  });

  const routes: readonly (readonly [string, Declaration])[] = [
    ["declared in ST-03", { st03: X313, gs08: X313 }],
    ["declared in GS-08 under an ST with no ST-03", { st03: null, gs08: X313 }],
  ];
  for (const [route, declaration] of routes) {
    it(`AC-5: ${route}, get277Status reads unrecognized-guide with one X12_GUIDE_NOT_IMPLEMENTED and get277CADisposition returns nothing`, () => {
      const { d, tx } = firstTransaction(
        interchange("277", "HN", declaration, BODY_277(CONVENTIONAL)),
      );
      const status = get277Status(d, tx);
      expect(status?.transactionType).toBe("unrecognized-guide");
      expect(guideChannel(status === undefined ? [] : [status])).toEqual([
        [[GUIDE_NOT_IMPLEMENTED, 0]],
      ]);
      expect(get277CADisposition(d, tx)).toBeUndefined();
    });
  }

  /**
   * Each reading pinned by the digest it had on the tree the 006020X313 row was
   * added to, measured there and here with the same serializer: the claim
   * status and claim acknowledgment goldens, and the claim status golden
   * re-declared as its adopted errata 005010X212E1. `[get277Status,
   * get277CADisposition]` per document.
   */
  const UNCHANGED: readonly (readonly [string, string, string, string])[] = [
    [
      "005010X212",
      "277",
      "708339452c4495f426c180a8ee627e8c73b6ea183514426a95771d60c9dd8290",
      "eb045d78d273107348b0300c01d29b7552d622abbc6faf81b3ec55359aa9950c",
    ],
    [
      "005010X214",
      "277ca",
      "2b6c546aeb4723633f82e70f7c955887c04a568d211e830c5c7c0aed26ae1c68",
      "2b6c546aeb4723633f82e70f7c955887c04a568d211e830c5c7c0aed26ae1c68",
    ],
    [
      "005010X212E1",
      "277",
      "516bd2fd7d1fd47c0c40cacaebe311b1b6e126501f72b77f543e22cd37fa8650",
      "eb045d78d273107348b0300c01d29b7552d622abbc6faf81b3ec55359aa9950c",
    ],
  ];
  for (const [guide, file, statusDigest, caDigest] of UNCHANGED) {
    it(`AC-5: a ${guide} 277 reads exactly as it did before the row was added`, () => {
      const golden = readFileSync(join(GOLDEN, `${file}.edi`), "utf8").trimEnd();
      const raw = guide === "005010X212E1" ? golden.replaceAll("005010X212", guide) : golden;
      const ix = parseX12(raw);
      const tx = ix.groups[0]?.transactions[0];
      if (tx === undefined) throw new Error("the golden framed no transaction set");
      expect(digest(get277Status(ix.delimiters, tx))).toBe(statusDigest);
      expect(digest(get277CADisposition(ix.delimiters, tx))).toBe(caDigest);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-2
// ---------------------------------------------------------------------------

describe("AC-2: an ST-03 outside the reader's implemented set is warned once, at the ST", () => {
  const EXTRA: Readonly<Record<string, readonly string[]>> = {
    get278Request: ["005010X216"],
    get278Response: ["005010X216"],
    get277Status: ["006020X313"],
    // AC-9 and D4 (claims attachments): the 278 attachments guide and the
    // 162.2002(c) short spelling are both declarations of a guide not implemented.
    get275Attachments: ["006020X316", "06020X314"],
  };
  for (const reader of READERS) {
    const declarations = [
      foreign(reader, "004010"),
      foreign(reader, "008020"),
      ...(EXTRA[reader.name] ?? []),
    ];
    for (const declared of declarations) {
      it(`AC-2: ${reader.name} returns a reading carrying X12_GUIDE_NOT_IMPLEMENTED for ST-03 ${declared}`, async () => {
        const readings = await readAs(reader, { st03: declared, gs08: reader.tr3 });
        expect(guideChannel(readings)).toEqual(each(readings, [[GUIDE_NOT_IMPLEMENTED, 0]]));
      });
    }
  }

  it("AC-2: get834Enrollments puts the code on EVERY yielded enrollment", async () => {
    const readings = await readAs(readerNamed("get834Enrollments"), {
      st03: foreign(readerNamed("get834Enrollments")),
      gs08: R834,
    });
    expect(readings).toHaveLength(2);
    expect(guideChannel(readings)).toEqual([
      [[GUIDE_NOT_IMPLEMENTED, 0]],
      [[GUIDE_NOT_IMPLEMENTED, 0]],
    ]);
  });
});

// ---------------------------------------------------------------------------
// AC-3
// ---------------------------------------------------------------------------

describe("AC-3: with ST-03 absent or empty, the declaration is GS-08", () => {
  const ST_FORMS: readonly (readonly [string, string | null])[] = [
    ["an ST with two elements", null],
    ["an ST with an empty third element", ""],
  ];
  for (const reader of READERS) {
    const GS_FORMS: readonly (readonly [
      string,
      string | null,
      readonly (readonly [string, number])[],
    ])[] = [
      ["GS-08 implemented", reader.tr3, []],
      ["GS-08 foreign", foreign(reader), [[GUIDE_NOT_IMPLEMENTED, 0]]],
      ["GS-08 empty", "", [[GUIDE_NOT_DECLARED, 0]]],
      ["GS-08 absent", null, [[GUIDE_NOT_DECLARED, 0]]],
    ];
    for (const [stForm, st03] of ST_FORMS) {
      for (const [gsForm, gs08, expected] of GS_FORMS) {
        it(`AC-3: ${reader.name}, ${stForm}, ${gsForm}`, async () => {
          const readings = await readAs(reader, { st03, gs08 });
          expect(guideChannel(readings)).toEqual(each(readings, expected));
        });
      }
    }
  }

  for (const reader of READERS) {
    const readTx = reader.readTx;
    if (readTx === undefined) continue;
    it(`AC-3: ${reader.name} treats a hand-built transaction set with no GS reaching it as GS-08 absent`, async () => {
      const { d, tx } = firstTransaction(
        interchange(
          reader.st01,
          reader.functionalId,
          { st03: null, gs08: reader.tr3 },
          reader.body(CONVENTIONAL),
        ),
      );
      // The parsed one carries its group's GS, so its GS-08 declares the guide.
      expect(tx.gs?.elements[8]).toBe(reader.tr3);
      const parsed = await readTx(d, tx);
      expect(guideChannel(parsed ?? [])).toEqual(each(parsed ?? [], []));

      const handBuilt: X12TransactionSet = {
        st: tx.st,
        se: tx.se,
        segments: tx.segments,
        rawSegments: tx.rawSegments,
      };
      const readings = await readTx(d, handBuilt);
      expect(readings?.length).toBeGreaterThan(0);
      expect(guideChannel(readings ?? [])).toEqual(each(readings ?? [], [[GUIDE_NOT_DECLARED, 0]]));
    });
  }
});

// ---------------------------------------------------------------------------
// AC-4
// ---------------------------------------------------------------------------

describe("AC-4: every identifier the conformance table implements reads with no guide code", () => {
  const READERS_BY_ROW: Readonly<Record<string, readonly string[]>> = {
    "270/": ["get270Inquiry", "parse270Inquiries"],
    "271/": ["get271Eligibility"],
    "275/": ["get275Attachments"],
    "276/": ["get276StatusInquiry", "parse276StatusInquiries"],
    "277/": ["get277Status"],
    "277/277CA": ["get277Status", "get277CADisposition"],
    "277/RFAI": ["get277RequestForAdditionalInformation"],
    "278/request": ["get278Request"],
    "278/response": ["get278Response"],
    "820/": ["get820Payments"],
    "834/": ["get834Header", "get834Enrollments"],
    "835/": ["get835"],
    "837/P": ["get837Claims"],
    "837/I": ["get837Claims"],
    "837/D": ["get837Claims"],
    "999/": ["parse999"],
  };
  const READ_ROWS = X12_TR3_CONFORMANCE.filter(
    (row) => row.directions.includes("read") && row.tr3 !== null,
  );

  it("AC-4: every read row with a guide is mapped to its readers here, so none is skipped", () => {
    for (const row of READ_ROWS) {
      expect(READERS_BY_ROW[`${row.transaction}/${row.variant ?? ""}`]).toBeDefined();
    }
  });

  for (const row of READ_ROWS) {
    const key = `${row.transaction}/${row.variant ?? ""}`;
    const identifiers = [row.tr3 ?? "", ...row.cfrAdopted];
    for (const name of READERS_BY_ROW[key] ?? []) {
      for (const identifier of identifiers) {
        it(`AC-4: row ${key} - ${name} reads ST-03 ${identifier} with no guide code`, async () => {
          const readings = await readAs(readerNamed(name), { st03: identifier, gs08: "" });
          expect(guideChannel(readings)).toEqual(each(readings, []));
        });
      }
    }
  }

  for (const key of Object.keys(VARIANT_BY_ICR)) {
    it(`AC-4: get837Claims reads ST-03 ${key}, a key of its variant table, with no guide code`, async () => {
      const readings = await readAs(readerNamed("get837Claims"), { st03: key, gs08: "" });
      expect(guideChannel(readings)).toEqual(each(readings, []));
    });
  }
});

// ---------------------------------------------------------------------------
// AC-6
// ---------------------------------------------------------------------------

describe("AC-6: a guide code echoes nothing the sender declared", () => {
  const MARKER_A = "QZJ7XV9K";
  const MARKER_B = "WQ8ZKJ3V";

  function runsOf(marker: string): readonly string[] {
    const runs: string[] = [];
    for (let i = 0; i + 4 <= marker.length; i += 1) runs.push(marker.slice(i, i + 4));
    return runs;
  }

  function stringLeaves(value: unknown): readonly string[] {
    if (typeof value === "string") return [value];
    if (typeof value !== "object" || value === null) return [];
    return Object.values(value).flatMap(stringLeaves);
  }

  async function guideWarningFor(
    reader: ReaderCase,
    declaration: Declaration,
  ): Promise<X12ParseWarning> {
    const readings = await readAs(reader, declaration);
    const warnings = readings.flatMap(guideWarnings);
    expect(warnings.map((w) => w.code)).toEqual(readings.map(() => GUIDE_NOT_IMPLEMENTED));
    const first = warnings[0];
    if (first === undefined) throw new Error("no guide warning");
    return first;
  }

  for (const reader of READERS) {
    it(`AC-6: ${reader.name} - planted in ST-03, and in GS-08 under an empty ST-03`, async () => {
      const routes = (marker: string): readonly Declaration[] => [
        { st03: marker, gs08: reader.tr3 },
        { st03: "", gs08: marker },
      ];
      for (const [i, declaration] of routes(MARKER_A).entries()) {
        const warning = await guideWarningFor(reader, declaration);
        for (const leaf of stringLeaves(warning)) {
          for (const run of runsOf(MARKER_A)) expect(leaf).not.toContain(run);
        }
        expect(ALL_WARNING_MESSAGES.has(warning.message)).toBe(true);
        const other = routes(MARKER_B)[i];
        if (other === undefined) throw new Error("no second route");
        // Two different foreign declarations, byte-identical messages.
        expect((await guideWarningFor(reader, other)).message).toBe(warning.message);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// AC-8
// ---------------------------------------------------------------------------

describe("AC-8: a warned reading is the reading an implemented declaration gets", () => {
  const SET_ASIDE: ReadonlySet<string> = new Set(["warnings", "implementationConventionReference"]);

  function withoutDeclaration(reading: object): Record<string, unknown> {
    return Object.fromEntries(Object.entries(reading).filter(([key]) => !SET_ASIDE.has(key)));
  }

  for (const name of ["get835", "get837Claims"]) {
    it(`AC-8: ${name} decodes a 004010 declaration exactly as its implemented one`, async () => {
      const reader = readerNamed(name);
      const readTx = reader.readTx;
      if (readTx === undefined) throw new Error("not a transaction reader");
      const body = reader.body(CONVENTIONAL);
      const implemented = firstTransaction(
        interchange(reader.st01, reader.functionalId, { st03: reader.tr3, gs08: reader.tr3 }, body),
      );
      const declaredForeign = firstTransaction(
        interchange(
          reader.st01,
          reader.functionalId,
          { st03: foreign(reader), gs08: reader.tr3 },
          body,
        ),
      );
      const segmentsBefore = structuredClone(declaredForeign.tx.segments);

      const [ok] = (await readTx(implemented.d, implemented.tx)) ?? [];
      const [warned] = (await readTx(declaredForeign.d, declaredForeign.tx)) ?? [];
      if (ok === undefined || warned === undefined) throw new Error("no reading");

      expect(withoutDeclaration(warned)).toEqual(withoutDeclaration(ok));
      expect(ok.warnings.length).toBeGreaterThan(0);
      expect(warned.warnings.filter((w) => !GUIDE_CODES.has(w.code))).toEqual(ok.warnings);
      expect(guideWarnings(warned).map((w) => w.code)).toEqual([GUIDE_NOT_IMPLEMENTED]);
      expect(guideWarnings(ok)).toEqual([]);
      // The read leaves the transaction set it was handed exactly as it was.
      expect(declaredForeign.tx.segments).toEqual(segmentsBefore);
    });
  }
});

// ---------------------------------------------------------------------------
// AC-9
// ---------------------------------------------------------------------------

describe("AC-9: a non-empty ST-03 decides alone, and GS-08 is not consulted", () => {
  for (const reader of READERS) {
    it(`AC-9: ${reader.name} - ST-03 implemented over GS-08 foreign, and ST-03 foreign over GS-08 implemented`, async () => {
      const implementedOverForeign = await readAs(reader, {
        st03: reader.tr3,
        gs08: foreign(reader),
      });
      expect(guideChannel(implementedOverForeign)).toEqual(each(implementedOverForeign, []));
      const foreignOverImplemented = await readAs(reader, {
        st03: foreign(reader),
        gs08: reader.tr3,
      });
      expect(guideChannel(foreignOverImplemented)).toEqual(
        each(foreignOverImplemented, [[GUIDE_NOT_IMPLEMENTED, 0]]),
      );
    });
  }
});

// ---------------------------------------------------------------------------
// AC-10
// ---------------------------------------------------------------------------

describe("AC-10: a prototype member name or a whitespace-only declaration is never implemented", () => {
  const DECLARED = ["constructor", "toString", "__proto__", "hasOwnProperty", "   "];
  for (const reader of READERS) {
    it(`AC-10: ${reader.name} - each as ST-03, and each as GS-08 under an empty ST-03`, async () => {
      for (const declared of DECLARED) {
        for (const declaration of [
          { st03: declared, gs08: reader.tr3 },
          { st03: "", gs08: declared },
        ]) {
          const readings = await readAs(reader, declaration);
          expect(guideChannel(readings)).toEqual(each(readings, [[GUIDE_NOT_IMPLEMENTED, 0]]));
        }
      }
    });
  }
});

// ---------------------------------------------------------------------------
// AC-11
// ---------------------------------------------------------------------------

describe("AC-11: an escaped ST-03 that decodes to an implemented guide is not warned", () => {
  /**
   * `componentSeparator` is `X`, and no element other than ST-03 carries an
   * `X` (ISA-16 aside, which is where the separator is declared): no
   * composite, no `XX` qualifier, GS-07 sent as the other agency code `T`,
   * and GS-08 sent empty so the decision rests on ST-03 alone. The only
   * service segment is `SV2`.
   */
  it("AC-11: an 837P with ST-03 framed 005010?X222A1 under component X raises no guide code and keeps the SV2 fall-back", () => {
    const d: Delimiters = { ...CONVENTIONAL, component: "X" };
    const body = [
      ["BHT", "0019", "00", "CLAIM-REF-1", "20260101", "1200", "CH"],
      ["HL", "1", "", "20", "1"],
      ["NM1", "85", "2", "BILLING CLINIC INC"],
      ["HL", "2", "1", "22", "0"],
      ["SBR", "P", "18"],
      ["NM1", "IL", "1", "DOE", "JANE"],
      ["CLM", "ACCT-1", "150"],
      ["LX", "1"],
      ["SV2", "0300", "", "150", "UN", "1"],
    ];
    const raw = interchange("837", "HC", { st03: "005010?X222A1", gs08: "" }, body, d, "T");
    const { d: parsed, tx } = firstTransaction(raw);
    expect(parsed.component).toBe("X");
    expect(tx.st.elements[3]).toBe("005010?X222A1");
    // The separator occurs in no data element but ST-03 once the ISA is set
    // aside (element 0 is the segment id, which `LX` spells with an `X`).
    const elementsWithX = tx.segments
      .flatMap((s) => s.elements.slice(1))
      .filter((e) => e.includes("X"));
    expect(elementsWithX).toEqual(["005010?X222A1"]);
    expect(tx.gs?.elements.filter((e) => e.includes("X"))).toEqual([]);
    const submission = get837Claims(parsed, tx);
    expect(submission?.warnings.filter((w) => GUIDE_CODES.has(w.code))).toEqual([]);
    // The raw bytes key no variant-table entry, so the service-segment
    // fall-back decides, exactly as it did before the check.
    expect(submission?.variant).toBe("I");
    // And the body really decoded: the line's amounts are read, not mangled.
    const line = submission?.claims[0]?.serviceLines[0];
    expect(line?.charge?.toString()).toBe("150");
    expect(line?.units?.toString()).toBe("1");
    expect(submission?.claims).toHaveLength(1);
  });

  /**
   * `componentSeparator` is `4`, and no element other than ST-03 carries a
   * `4`: no composite, no date, amount, HL id or count containing one, and
   * GS-08 is sent empty.
   */
  it("AC-11: a 277 with ST-03 framed 005010X21?4 under component 4 raises no guide code and stays claim-status", () => {
    const d: Delimiters = { ...CONVENTIONAL, component: "4" };
    const body = [
      ["BHT", "0010", "08", "STATUS-0001", "20260101", "1200", "DG"],
      ["HL", "1", "", "20", "1"],
      ["NM1", "PR", "2", "PAYER ONE"],
      ["HL", "2", "1", "21", "1"],
      ["HL", "3", "2", "19", "1"],
      ["NM1", "1P", "2", "CLINIC ONE"],
      ["HL", "5", "3", "22", "0"],
      ["NM1", "IL", "1", "DOE", "JANE"],
      ["TRN", "2", "TRACE-0001"],
      ["STC", "A2", "20260101", "WQ", "150"],
    ];
    const raw = interchange("277", "HN", { st03: "005010X21?4", gs08: "" }, body, d);
    const { d: parsed, tx } = firstTransaction(raw);
    expect(parsed.component).toBe("4");
    expect(tx.st.elements[3]).toBe("005010X21?4");
    // The separator occurs in no data element but ST-03 once the ISA is set
    // aside.
    const elementsWith4 = tx.segments
      .flatMap((s) => s.elements.slice(1))
      .filter((e) => e.includes("4"));
    expect(elementsWith4).toEqual(["005010X21?4"]);
    expect(tx.gs?.elements.filter((e) => e.includes("4"))).toEqual([]);
    const status = get277Status(parsed, tx);
    expect(status?.warnings.filter((w) => GUIDE_CODES.has(w.code))).toEqual([]);
    expect(status?.transactionType).toBe("claim-status");
    // And the body really decoded.
    const claim = status?.claims[0];
    expect(claim?.traces[0]?.referenceId).toBe("TRACE-0001");
    expect(claim?.statuses[0]?.statuses[0]?.categoryCode).toBe("A2");
    expect(claim?.statuses[0]?.totalChargeAmount?.toString()).toBe("150");
    expect(claim?.subscriber?.lastName).toBe("DOE");
  });
});

// ---------------------------------------------------------------------------
// AC-12
// ---------------------------------------------------------------------------

describe("AC-12: a transaction set of another ST-01 gets what it always got, and no guide code", () => {
  const R835 = readerNamed("get835");
  const R277_READER = readerNamed("get277Status");
  for (const reader of [...READERS, CA_READER]) {
    const other = reader.st01 === "835" ? R277_READER : R835;
    it(`AC-12: ${reader.name} handed a ${other.st01}`, async () => {
      const raw = interchange(
        other.st01,
        other.functionalId,
        { st03: foreign(other), gs08: foreign(other) },
        other.body(CONVENTIONAL),
      );
      const readings = await reader.read(raw);
      if (reader.mismatch === "undefined") expect(readings).toBeUndefined();
      else expect(readings).toEqual([]);
      // Nothing reached the interchange's own channel either.
      expect(parseX12(raw).warnings.filter((w) => GUIDE_CODES.has(w.code))).toEqual([]);
    });
  }
});

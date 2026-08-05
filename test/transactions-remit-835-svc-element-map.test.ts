/**
 * The 835 Loop 2110 SVC element map, pinned against the WIRE rather than
 * against this library's own reader (`X12-SVC-ELEMENT-MAP-OFF-BY-ONE`).
 *
 * **Why this file exists, and why the pre-existing coverage could not have
 * caught the defect it closes.** Until this slice `build835` wrote the
 * revenue code at SVC-05 and the paid units at SVC-07, and `get835` read
 * them back from exactly those positions. Every assertion in the suite was a
 * build -> parse round trip through that one self-consistent map, so it was
 * green for *any* pair of positions the two modules agreed on, including a
 * wrong one. The whole suite stayed green through the fix as well. **A round
 * trip cannot test an element map; only bytes can**, so every emit assertion
 * here compares a literal segment string and every parse assertion starts
 * from literal EDI.
 *
 * The map, from the sources recorded in `KNOWN-LIMITATIONS.md`:
 *
 * - **SVC-04** - Product/Service ID (X12 element 234, a string): the NUBC
 *   revenue code. Absent on a professional line.
 * - **SVC-05** - Quantity (element 380): Units of Service **Paid** Count.
 * - **SVC-06** - the original/submitted procedure composite.
 * - **SVC-07** - Quantity (element 380): **Original** Units of Service Count,
 *   a different quantity from SVC-05, sent only when the two differ.
 *
 * Synthetic-only: fake account `PT-1`, fake payer/payee names, NUBC revenue
 * code `0300` (a published code-list value, not patient data).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  build835,
  get277Status,
  get835,
  parseX12,
  serializeX12,
  X12Decimal,
  type Build835ServiceLineSpec,
  type Build835Spec,
} from "../src/index.js";

const FIXTURE_ROOT = join(__dirname, "fixtures");

function readFixture(relPath: string): string {
  return readFileSync(join(FIXTURE_ROOT, relPath), "utf8").trimEnd();
}

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

const ENVELOPE = {
  senderId: "MEDICARE",
  receiverId: "SUBMITTER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

/**
 * A single balanced claim whose only variable is the service line, so an
 * emitted SVC can be compared byte-for-byte. Claim: CLP-03 1000 == CLP-04 600
 * + 350 claim CAS + 50 line CAS. Line: SVC-02 600 == SVC-03 550 + 50 line CAS.
 */
function specWithLine(line: Build835ServiceLineSpec): Build835Spec {
  return {
    envelope: ENVELOPE,
    payment: {
      transactionHandlingCode: "I",
      totalActualPayment: dec("600.00"),
      creditDebitFlag: "C",
      method: "ACH",
      paymentDate: "20260601",
    },
    traces: [{ traceTypeCode: "1", referenceId: "T1", originatingCompanyId: "1512345678" }],
    payer: { entityIdentifierCode: "PR", name: "PAYER", address: { lines: [] } },
    payee: { entityIdentifierCode: "PE", name: "CLINIC" },
    claims: [
      {
        patientControlNumber: "PT-1",
        claimStatusCode: "1",
        totalChargeAmount: dec("1000.00"),
        totalPaymentAmount: dec("600.00"),
        patientResponsibilityAmount: dec("400.00"),
        adjustments: [{ groupCode: "CO", reasonCode: "45", amount: dec("350.00") }],
        serviceLines: [line],
      },
    ],
  };
}

const BASE_LINE: Build835ServiceLineSpec = {
  productServiceIdQualifier: "HC",
  productServiceId: "99213",
  chargeAmount: dec("600.00"),
  paymentAmount: dec("550.00"),
  adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
};

/** The literal SVC segment `build835` emits for `line`. */
function emittedSvc(line: Build835ServiceLineSpec): string {
  const segment = serializeX12(build835(specWithLine(line)))
    .split("~")
    .find((s) => s.startsWith("SVC"));
  if (segment === undefined) throw new Error("no SVC segment emitted");
  return segment;
}

const ENVELOPE_OPEN =
  "ISA*00*          *00*          *ZZ*PAYER          *ZZ*PROVIDER       *260628*1200*^*00501*000000088*0*P*:~\n" +
  "GS*HP*PAYER*PROVIDER*20260628*1200*88*X*005010X221A1~\n" +
  "ST*835*0088~\n";

/** Parse a literal 835 body, so the assertion starts from bytes. */
function parse835(body: string, seCount: number): ReturnType<typeof get835> {
  const raw = `${ENVELOPE_OPEN}${body}SE*${String(seCount)}*0088~\nGE*1*88~\nIEA*1*000000088~\n`;
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
  if (tx === undefined) throw new Error("no 835 transaction");
  return get835(ix.delimiters, tx);
}

/**
 * An institutional claim body whose SVC carries `svc` verbatim. The line CAS
 * sits AFTER the SVC so it is line-level, which keeps every balance invariant
 * satisfied: line `SVC-02 1000 == SVC-03 800 + 200 line CAS`, claim
 * `CLP-03 1000 == CLP-04 800 + 200`, remit `BPR-02 800 == Σ(CLP-04)`. A pin on
 * an out-of-balance document would still pass today, but it would stop being
 * evidence about the element map the moment the imbalance path changed.
 */
function institutionalBody(svc: string): string {
  return (
    "BPR*I*800.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
    "TRN*1*SVC-MAP-1*1~\n" +
    "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
    "LX*1~\n" +
    "CLP*PT-INST*1*1000.00*800.00*0*MA*PCN-INST*11*1~\n" +
    `${svc}~\n` +
    "CAS*CO*45*200.00~\n"
  );
}

function firstLine(body: string, seCount: number) {
  const remit = parse835(body, seCount);
  if (remit === undefined) throw new Error("undefined remit");
  // Every balance invariant holds and SE-01 counts the emitted range, so the
  // map is pinned on a spec-clean remit rather than on the imbalance path.
  expect(remit.warnings.map((w) => w.code)).not.toContain("X12_835_REMIT_BALANCE_MISMATCH");
  const line = remit.claims[0]?.serviceLines[0];
  if (line === undefined) throw new Error("no service line parsed");
  return line;
}

describe("835 SVC element map - emit pins the wire, not the round trip", () => {
  it("puts the NUBC revenue code at SVC-04 and the paid units at SVC-05", () => {
    // SVC-04 `0300` is the revenue code; SVC-05 `2` is Units of Service Paid.
    expect(emittedSvc({ ...BASE_LINE, revenueCode: "0300", paidUnitsOfService: dec("2") })).toBe(
      "SVC*HC:99213*600.00*550.00*0300*2",
    );
  });

  it("emits the ORIGINAL units at SVC-07, after the SVC-06 composite", () => {
    expect(
      emittedSvc({
        ...BASE_LINE,
        revenueCode: "0300",
        paidUnitsOfService: dec("2"),
        originalServiceIdQualifier: "HC",
        originalServiceId: "99212",
        originalUnitsOfService: dec("3"),
      }),
    ).toBe("SVC*HC:99213*600.00*550.00*0300*2*HC:99212*3");
  });

  it("leaves SVC-04 empty on a professional line and still fills SVC-05", () => {
    // The shape every 835 fixture in this repo uses: no revenue code, 1 unit
    // paid. Before this slice the builder wrote `**` then the units at 07.
    expect(emittedSvc({ ...BASE_LINE, paidUnitsOfService: dec("1") })).toBe(
      "SVC*HC:99213*600.00*550.00**1",
    );
  });

  it("emits neither quantity when the caller supplies neither", () => {
    expect(emittedSvc({ ...BASE_LINE, revenueCode: "0300" })).toBe(
      "SVC*HC:99213*600.00*550.00*0300",
    );
  });

  it("does not let the revenue code reach a Quantity element", () => {
    // The regression in one assertion: SVC-05 and SVC-07 are X12 element 380
    // (Quantity). A revenue code appearing in either is the shipped defect.
    const svc = emittedSvc({
      ...BASE_LINE,
      revenueCode: "0300",
      paidUnitsOfService: dec("2"),
      originalUnitsOfService: dec("3"),
    });
    const elements = svc.split("*");
    expect(elements[4]).toBe("0300"); // SVC-04, a Product/Service ID
    expect(elements[5]).toBe("2"); // SVC-05, a Quantity
    expect(elements[7]).toBe("3"); // SVC-07, a Quantity
  });
});

describe("835 SVC element map - parse starts from bytes", () => {
  it("reads the revenue code from SVC-04 and the paid units from SVC-05", () => {
    const line = firstLine(institutionalBody("SVC*HC:99213*1000.00*800.00*0300*2"), 10);
    expect(line.revenueCode).toBe("0300");
    expect(line.paidUnitsOfService?.toString()).toBe("2");
    expect(line.originalUnitsOfService).toBeUndefined();
  });

  it("reads the ORIGINAL units from SVC-07 as a separate quantity from SVC-05", () => {
    const line = firstLine(institutionalBody("SVC*HC:99213*1000.00*800.00*0300*2*HC:99212*3"), 10);
    expect(line.paidUnitsOfService?.toString()).toBe("2");
    expect(line.originalUnitsOfService?.toString()).toBe("3");
    // SVC-06 is unmoved by this slice and must still decode.
    expect(line.originalServiceId).toBe("99212");
  });

  it("reads a professional `**1` line as ONE UNIT PAID, never as revenue code `1`", () => {
    // This is the filed harm verbatim. `1` is not a valid NUBC revenue code,
    // and every 835 fixture in this repo is written in this shape.
    const line = firstLine(institutionalBody("SVC*HC:99213*1000.00*800.00**1"), 10);
    expect(line.revenueCode).toBeUndefined();
    expect(line.paidUnitsOfService?.toString()).toBe("1");
  });

  it("does not fabricate the X221A1 default of one when SVC-05 is absent", () => {
    // X221A1 is REPORTED to assume an absent SVC-05 is one - secondhand, via
    // X12's RFI #2163, not a clause read from the TR3. This reader keeps
    // "absent" distinct from "one" so a consumer can apply that themselves.
    const line = firstLine(institutionalBody("SVC*HC:99213*1000.00*800.00*0300"), 10);
    expect(line.revenueCode).toBe("0300");
    expect(line.paidUnitsOfService).toBeUndefined();
  });
});

describe("835 SVC element map - the committed corpus reads conformantly", () => {
  it("reads every committed 835 fixture as units-paid, with no bogus revenue code", () => {
    // Before this slice all eight of these read `revenueCode: "1"` and
    // dropped the paid count entirely. The count is EIGHT and it includes the
    // golden, which is what every published figure for this slice counts; an
    // earlier draft of this test looped over the six remit fixtures only and
    // asserted seven, which did not match the number in the changelog.
    const files = [
      "remit/835-availity-quirk.edi",
      "remit/835-carc-rarc-mix.edi",
      "remit/835-imbalance.edi",
      "remit/835-medicare-canonical.edi",
      "remit/835-multi-claim.edi",
      "remit/835-with-plb.edi",
      "golden/835.edi",
    ];
    let lines = 0;
    for (const name of files) {
      const raw = readFixture(name);
      const ix = parseX12(raw);
      for (const group of ix.groups) {
        for (const tx of group.transactions) {
          const remit = get835(ix.delimiters, tx);
          if (remit === undefined) continue;
          for (const claim of remit.claims) {
            for (const line of claim.serviceLines) {
              lines += 1;
              expect(line.revenueCode).toBeUndefined();
              expect(line.paidUnitsOfService?.toString()).toBe("1");
            }
          }
        }
      }
    }
    expect(lines).toBe(8);
  });
});

describe("835 and 277 agree on where the revenue code lives", () => {
  it("both read the revenue code from SVC-04", () => {
    // The 277 was already correct; this pins the two against each other so
    // they cannot drift apart again, which is how the defect went unseen.
    const line835 = firstLine(institutionalBody("SVC*HC:99213*1000.00*800.00*0300*2"), 10);
    expect(line835.revenueCode).toBe("0300");

    // The committed 277 fixture, with a revenue code added at SVC-04 only.
    const raw = readFixture("status/277-canonical.edi").replace(
      "SVC*HC:99213*150*0****1~",
      "SVC*HC:99213*150*0*0300***1~",
    );
    expect(raw).toContain("SVC*HC:99213*150*0*0300***1~");
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "277");
    if (tx === undefined) throw new Error("no 277 transaction");
    const status = get277Status(ix.delimiters, tx);
    expect(status?.claims[0]?.serviceLines[0]?.revenueCode).toBe("0300");
  });
});

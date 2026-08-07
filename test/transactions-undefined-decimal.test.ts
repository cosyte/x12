/**
 * `X12-837-SV-UNDEFINED-DECIMAL`: an element a reader decoded NO value from
 * no longer reads as a confident number.
 *
 * The defect, in one line: an **absent** `SV1-02` - a monetary field on a
 * claim service line - read back as `X12Decimal.ZERO`. A consumer looking at
 * the model could not tell "the sender stated zero" from "the sender stated
 * nothing", and the parser presented the second as the first. The same
 * fabrication sat on fourteen slots across the 837, 835 and 820 readers, and
 * it closes only by widening those slots to `X12Decimal | undefined`, which
 * is a BREAKING change to the read model. That is what this suite pins.
 *
 * **The load-bearing shape is the PAIR, not the absence.** Every case below
 * runs the same document three ways: with the element absent, with the
 * element carrying an explicit zero, and with the element carrying a real
 * amount. The first two were byte-different inputs that produced an
 * identical model through `0.0.12`; if they ever collapse together again,
 * the "stated zero" half of the pair goes red on its own. Asserting only
 * that the absent case is now `undefined` would not catch a reader that
 * started answering `undefined` for a stated zero as well, which would be
 * the same defect pointing the other way.
 *
 * **Only bytes can produce these cases.** A round trip cannot: as of this
 * slice `build837P/I/D` REFUSES a service line with no `units` rather than
 * emitting a fabricated `0` into SV1-04 / SV2-05 / SV3-06, and every other
 * builder decimal slot is required and routed through `escDec`. So the read
 * cases are written as literal EDI and the emit case is asserted on the
 * builder directly. All data is synthetic.
 *
 * **What `undefined` does and does not say.** It says this library decoded
 * no value from that element. It does NOT say the element was absent: a
 * present element holding bytes that do not decode lands there too, and
 * `X12_UNPARSEABLE_DECIMAL` at that `elementIndex` is what separates them.
 * Both routes are asserted, because a suite that only ever plants an absent
 * element would let the two collapse.
 */

import { describe, expect, it } from "vitest";

import {
  CLAIM_837_BUILD_ERROR_CODES,
  Claim837BuildError,
  REMIT_835_BUILD_ERROR_CODES,
  Remit835BuildError,
  WARNING_CODES,
  X12Decimal,
  build835,
  build837P,
  decodeSegment,
  elementDecimal,
  elementDecimalOrZero,
  get820Payments,
  get835,
  get837Claims,
  parseX12,
  serializeX12,
} from "../src/index.js";
import type {
  Build835Spec,
  Build837ServiceLineProfessionalSpec,
  Build837Spec,
  Delimiters,
  X12ParseWarning,
  X12PremiumPayments,
  X12Segment,
  X12Remittance,
  X12_837Submission,
} from "../src/index.js";

const DELIMS: Delimiters = { element: "*", repetition: "^", component: ":", segment: "~" };

const dec = (raw: string): X12Decimal => {
  const d = X12Decimal.fromString(raw);
  if (d === undefined) throw new Error(`bad fixture decimal: ${raw}`);
  return d;
};

function codes(warnings: readonly X12ParseWarning[]): string[] {
  return warnings.map((w) => w.code);
}

/** Decode one segment in isolation, discarding any structural warning. */
function seg(raw: string): X12Segment {
  return decodeSegment(raw, DELIMS, () => undefined, { segmentIndex: 1 });
}

// ---------------------------------------------------------------------------
// 837 - the named defect.
// ---------------------------------------------------------------------------

const ISA_837 =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/** Wrap a Loop 2400 body in a synthetic 837 envelope for `icr`. */
function parse837(icr: string, trailing: readonly string[], clm = "8500"): X12_837Submission {
  const body = [
    "HL*1**20*1~",
    "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
    "HL*2*1*22*0~",
    "SBR*P*18*GROUP123******MB~",
    "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
    "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
    `CLM*PT-ACCT-900*${clm}***11:B:1*Y*A*Y*Y~`,
    "HI*ABK:J20.9~",
    "LX*1~",
    ...trailing,
  ];
  const segs = [
    ISA_837,
    `GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*${icr}~`,
    `ST*837*0001*${icr}~`,
    "BHT*0019*00*0123*20260601*1200*CH~",
    ...body,
    `SE*${String(body.length + 3)}*0001~`,
    "GE*1*1~",
    "IEA*1*000000001~",
  ];
  const ix = parseX12(segs.join("\n"));
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
  if (tx === undefined) throw new Error("no 837 transaction set");
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return sub;
}

describe("🩺 837 SV1-02: an absent charge, a stated zero and a real charge are three readings", () => {
  it("absent SV1-02 reads undefined, and does NOT warn - the sender said nothing", () => {
    const sub = parse837("005010X222A2", ["SV1*HC:99213**UN*4***1~"]);
    const line = sub.claims[0]?.serviceLines[0];
    // Through `0.0.12` this read `X12Decimal.ZERO`, which is the whole defect.
    expect(line?.charge).toBeUndefined();
    // The SVx DID decode - everything else on the line is present - so this is
    // not the `X12_837_SERVICE_LINE_NOT_DECODED` case, and an absent element
    // is not the `X12_UNPARSEABLE_DECIMAL` case either. Nothing is warned,
    // and the model is the only channel that reports it. Pinned on the WHOLE
    // array rather than on the absence of two named codes.
    expect(line?.units?.toString()).toBe("4");
    expect(line?.procedureCode).toBe("99213");
    expect(codes(sub.warnings)).toEqual([]);
  });

  it("a STATED zero still reads 0 and is not confused with the absent case", () => {
    const sub = parse837("005010X222A2", ["SV1*HC:99213*0*UN*4***1~"]);
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.charge?.toString()).toBe("0");
    expect(line?.charge?.isZero()).toBe(true);
    expect(codes(sub.warnings)).toEqual([]);
  });

  it("`0.00` keeps its lexical form, so the sender's precision survives too", () => {
    const sub = parse837("005010X222A2", ["SV1*HC:99213*0.00*UN*4***1~"]);
    expect(sub.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("0.00");
  });

  it("CONTROL: a real charge decodes unchanged", () => {
    const sub = parse837("005010X222A2", ["SV1*HC:99213*8500*UN*4***1~"]);
    expect(sub.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
  });

  it("an UNPARSEABLE SV1-02 also reads undefined, and IS warned at element 2", () => {
    // The second route to `undefined`, and the reason `undefined` may never be
    // read as "the element was absent".
    const sub = parse837("005010X222A2", ["SV1*HC:99213*8,500*UN*4***1~"]);
    expect(sub.claims[0]?.serviceLines[0]?.charge).toBeUndefined();
    expect(codes(sub.warnings)).toEqual([WARNING_CODES.X12_UNPARSEABLE_DECIMAL]);
    expect(sub.warnings[0]?.position.elementIndex).toBe(2);
  });
});

describe("🩺 837: the same three readings on every other slot that used to fabricate", () => {
  it.each([
    ["SV1-04 units (P)", "005010X222A2", "SV1*HC:99213*8500*UN****1~", "units"],
    ["SV2-03 charge (I)", "005010X223A3", "SV2*0300*HC:99213**UN*4~", "charge"],
    ["SV2-05 units (I)", "005010X223A3", "SV2*0300*HC:99213*8500*UN~", "units"],
    ["SV3-02 charge (D)", "005010X224A2", "SV3*AD:D1110*****4~", "charge"],
    ["SV3-06 units (D)", "005010X224A2", "SV3*AD:D1110*8500~", "units"],
  ])("%s reads undefined when absent", (_label, icr, svx, field) => {
    const sub = parse837(icr, [svx]);
    const line = sub.claims[0]?.serviceLines[0];
    expect(line).toBeDefined();
    expect(line?.[field as "charge" | "units"]).toBeUndefined();
    expect(codes(sub.warnings)).toEqual([]);
  });

  it.each([
    ["SV1-04 units (P)", "005010X222A2", "SV1*HC:99213*8500*UN*0***1~", "units", "0"],
    ["SV2-03 charge (I)", "005010X223A3", "SV2*0300*HC:99213*0*UN*4~", "charge", "0"],
    ["SV2-05 units (I)", "005010X223A3", "SV2*0300*HC:99213*8500*UN*0~", "units", "0"],
    ["SV3-02 charge (D)", "005010X224A2", "SV3*AD:D1110*0****4~", "charge", "0"],
    ["SV3-06 units (D)", "005010X224A2", "SV3*AD:D1110*8500****0~", "units", "0"],
  ])("%s still reads a STATED zero", (_label, icr, svx, field, want) => {
    const sub = parse837(icr, [svx]);
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.[field as "charge" | "units"]?.toString()).toBe(want);
    expect(codes(sub.warnings)).toEqual([]);
  });

  it("CLM-02 total charge: absent reads undefined, stated zero reads 0", () => {
    const absent = parse837("005010X222A2", ["SV1*HC:99213*8500*UN*4***1~"], "");
    expect(absent.claims[0]?.totalCharge).toBeUndefined();
    expect(codes(absent.warnings)).toEqual([]);

    const zero = parse837("005010X222A2", ["SV1*HC:99213*8500*UN*4***1~"], "0");
    expect(zero.claims[0]?.totalCharge?.toString()).toBe("0");
  });

  it("SVD-02 other-payer paid amount: absent reads undefined, stated zero reads 0", () => {
    const absent = parse837("005010X222A2", [
      "SV1*HC:99213*8500*UN*4***1~",
      "SVD*PAYER02**HC:99213**1~",
    ]);
    expect(absent.claims[0]?.serviceLines[0]?.adjudications[0]?.amountPaid).toBeUndefined();

    const zero = parse837("005010X222A2", [
      "SV1*HC:99213*8500*UN*4***1~",
      "SVD*PAYER02*0*HC:99213**1~",
    ]);
    expect(zero.claims[0]?.serviceLines[0]?.adjudications[0]?.amountPaid?.toString()).toBe("0");
  });
});

// ---------------------------------------------------------------------------
// 835 - the same widening, and what it does to the three balance invariants.
// ---------------------------------------------------------------------------

const ISA_835 =
  "ISA*00*          *00*          *ZZ*MEDICARE       *ZZ*SUBMITTER      " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/** Wrap an 835 body (BPR onward, before SE) in a synthetic envelope. */
function parse835(body: readonly string[]): X12Remittance {
  const segs = [
    ISA_835,
    "GS*HP*MEDICARE*SUBMITTER*20260601*1200*1*X*005010X221A1~",
    "ST*835*0001~",
    ...body,
    `SE*${String(body.length + 2)}*0001~`,
    "GE*1*1~",
    "IEA*1*000000001~",
  ];
  const ix = parseX12(segs.join("\n"));
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
  if (tx === undefined) throw new Error("no 835 transaction set");
  const remit = get835(ix.delimiters, tx);
  if (remit === undefined) throw new Error("get835 returned undefined");
  return remit;
}

const BPR = "BPR*I*450.00*C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~";
const TRN = "TRN*1*0012345*1512345678~";
const CLP = "CLP*PT-ACCT-001*1*500.00*450.00*50.00*MC*PAYER-CLAIM-001*11*1~";
const SVC = "SVC*HC:99213*500.00*450.00**1~";
const CAS = "CAS*PR*1*50.00~";

describe("🩺 835: a term that did not decode makes an invariant UNEVALUABLE, never a mismatch", () => {
  it("CONTROL: the balanced document reports neither code", () => {
    const remit = parse835([BPR, TRN, "LX*1~", CLP, SVC, CAS]);
    expect(remit.claims[0]?.totalChargeAmount?.toString()).toBe("500.00");
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH);
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
  });

  it("CONTROL: a document that IS out of balance still reports the MISMATCH", () => {
    // Every term decoded and the equation genuinely fails. This is the half
    // that must not become "not evaluable", and the reason the two codes are
    // separate rather than one code with a discriminant.
    const remit = parse835([
      BPR,
      TRN,
      "LX*1~",
      "CLP*PT-ACCT-001*1*501.00*450.00*50.00*MC*PAYER-CLAIM-001*11*1~",
      SVC,
      CAS,
    ]);
    expect(codes(remit.warnings)).toContain(WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH);
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
  });

  it("an ABSENT CLP-03 reads undefined and the claim equation is not evaluated", () => {
    // Through `0.0.12` CLP-03 read `X12Decimal.ZERO` and the claim invariant
    // then reported a MISMATCH - an inequality between an amount the payer
    // sent and one this library invented.
    const remit = parse835([
      BPR,
      TRN,
      "LX*1~",
      "CLP*PT-ACCT-001*1**450.00*50.00*MC*PAYER-CLAIM-001*11*1~",
      SVC,
      CAS,
    ]);
    expect(remit.claims[0]?.totalChargeAmount).toBeUndefined();
    expect(codes(remit.warnings)).toContain(WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH);
  });

  it("a STATED zero CLP-04 is still summed - an empty term and a zero term differ", () => {
    // The pair that proves the guard keys on `undefined` and not on falsiness.
    // Charge 50.00, paid 0.00, one 50.00 PR adjustment: balanced, evaluated.
    const remit = parse835([
      "BPR*I*0.00*C*NON*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~",
      TRN,
      "LX*1~",
      "CLP*PT-ACCT-001*1*50.00*0.00*50.00*MC*PAYER-CLAIM-001*11*1~",
      CAS,
    ]);
    expect(remit.claims[0]?.totalPaymentAmount?.toString()).toBe("0.00");
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH);
  });

  it("an ABSENT SVC-03 leaves the LINE equation unevaluated, at the line's own position", () => {
    const remit = parse835([BPR, TRN, "LX*1~", CLP, "SVC*HC:99213*500.00***1~", CAS]);
    expect(remit.claims[0]?.serviceLines[0]?.paymentAmount).toBeUndefined();
    const w = remit.warnings.filter((x) => x.code === WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
    expect(w).toHaveLength(1);
    expect(w[0]?.message).toContain("SVC-03");
  });

  it("a CAS triple with a reason code and NO amount leaves the amount undefined", () => {
    // Retention is unchanged: the triple is still on the model, carrying the
    // reason code the payer did send. Only the fabricated 0 is gone.
    const remit = parse835([BPR, TRN, "LX*1~", CLP, SVC, "CAS*PR*1~"]);
    const adj = remit.claims[0]?.adjustments[0] ?? remit.claims[0]?.serviceLines[0]?.adjustments[0];
    expect(adj?.reasonCode).toBe("1");
    expect(adj?.amount).toBeUndefined();
    expect(codes(remit.warnings)).toContain(WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
  });

  it("a PLB pair with a reason code and NO amount leaves the amount undefined", () => {
    const remit = parse835([BPR, TRN, "LX*1~", CLP, SVC, CAS, "PLB*1234567890*20261231*WO:1~"]);
    expect(remit.providerAdjustments[0]?.reasonCode).toBe("WO");
    expect(remit.providerAdjustments[0]?.amount).toBeUndefined();
    const w = remit.warnings.filter((x) => x.code === WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
    expect(w).toHaveLength(1);
    expect(w[0]?.message).toContain("BPR-02");
  });

  it("an 835 with no BPR at all reads totalActualPayment as undefined, not 0", () => {
    // The transaction is malformed (X221A1 makes the BPR mandatory) but
    // reachable, and the empty payment header used to seed a confident zero.
    const remit = parse835([TRN, "LX*1~", CLP, SVC, CAS]);
    expect(remit.payment.totalActualPayment).toBeUndefined();
    expect(codes(remit.warnings)).toContain(WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
  });

  it("an empty adjustment LIST is not an absent term: it sums to zero", () => {
    // The distinction the guard has to make. A claim carrying no CAS really
    // did state no adjustments; a CAS whose amount did not decode states
    // nothing about its amount. Only the second poisons the equation.
    const remit = parse835([
      "BPR*I*500.00*C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~",
      TRN,
      "LX*1~",
      "CLP*PT-ACCT-001*1*500.00*500.00*0.00*MC*PAYER-CLAIM-001*11*1~",
    ]);
    expect(remit.claims[0]?.adjustments).toEqual([]);
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_835_BALANCE_NOT_EVALUABLE);
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH);
  });
});

// ---------------------------------------------------------------------------
// 820.
// ---------------------------------------------------------------------------

describe("🩺 820: BPR-02 and RMR-04 read undefined when the sender stated nothing", () => {
  function parse820(body: readonly string[]): X12PremiumPayments {
    const segs = [
      "ISA*00*          *00*          *ZZ*EMPLOYER       *ZZ*PLAN           " +
        "*260601*1200*^*00501*000000001*0*P*:~",
      "GS*RA*EMPLOYER*PLAN*20260601*1200*1*X*005010X218~",
      "ST*820*0001~",
      ...body,
      `SE*${String(body.length + 2)}*0001~`,
      "GE*1*1~",
      "IEA*1*000000001~",
    ];
    const ix = parseX12(segs.join("\n"));
    const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
    if (tx === undefined) throw new Error("no 820 transaction set");
    const prem = get820Payments(ix.delimiters, tx);
    if (prem === undefined) throw new Error("get820Payments returned undefined");
    return prem;
  }

  const TRN820 = "TRN*1*PREM-0001~";

  it("an absent BPR-02 reads undefined; a stated zero still reads 0", () => {
    const absent = parse820(["BPR*C**C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~", TRN820]);
    expect(absent.payment.totalPremiumAmount).toBeUndefined();

    const zero = parse820([
      "BPR*C*0.00*C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~",
      TRN820,
    ]);
    expect(zero.payment.totalPremiumAmount?.toString()).toBe("0.00");
  });

  it("an absent RMR-04 reads undefined; a stated zero still reads 0", () => {
    const head = "BPR*C*250.00*C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~";
    const loop = ["ENT*1*2J*FI*GRP-0001~", "NM1*IL*1*DOE*JANE****MI*MBR0001~"];
    const absent = parse820([head, TRN820, ...loop, "RMR*AZ*POL-0001*PI~"]);
    const absentItem = absent.remittances[0]?.openItems[0];
    // Assert the item EXISTS before asserting its slot, so an empty
    // `openItems` cannot pass this as `undefined` on the optional chain.
    expect(absentItem?.referenceId).toBe("POL-0001");
    expect(absentItem?.amountPaid).toBeUndefined();

    const zero = parse820([head, TRN820, ...loop, "RMR*AZ*POL-0001*PI*0.00~"]);
    expect(zero.remittances[0]?.openItems[0]?.amountPaid?.toString()).toBe("0.00");
  });
});

// ---------------------------------------------------------------------------
// The emit side, which is in scope from the start rather than mentioned.
// ---------------------------------------------------------------------------

const ENVELOPE = {
  senderId: "SUBMITTER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
};

/** A minimal but real 837P spec, parameterised by its single service line. */
function p837Spec(line: Build837ServiceLineProfessionalSpec): Build837Spec {
  return {
    envelope: ENVELOPE,
    submitter: {
      entityIdentifierCode: "41",
      entityTypeQualifier: "2",
      name: "SUBMITTER ONE",
      idQualifier: "46",
      idCode: "SUB001",
    },
    receiver: {
      entityIdentifierCode: "40",
      entityTypeQualifier: "2",
      name: "RECEIVER ONE",
      idQualifier: "46",
      idCode: "REC001",
    },
    billingProviders: [
      {
        provider: {
          entityIdentifierCode: "85",
          entityTypeQualifier: "2",
          name: "BILLING CLINIC INC",
          idQualifier: "XX",
          idCode: "1234567890",
          address: {
            lines: ["123 BILLING WAY"],
            city: "CLEVELAND",
            state: "OH",
            postalCode: "44113",
          },
        },
        subscribers: [
          {
            info: {
              payerResponsibilityCode: "P",
              individualRelationshipCode: "18",
              groupNumber: "GROUP123",
              claimFilingIndicator: "MB",
            },
            subscriber: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              name: "PATIENT",
              firstName: "TEST",
              idQualifier: "MI",
              idCode: "MEMBER001",
            },
            payer: {
              entityIdentifierCode: "PR",
              entityTypeQualifier: "2",
              name: "PAYER ONE",
              idQualifier: "PI",
              idCode: "PAYER01",
            },
            claims: [
              {
                claimId: "PT-ACCT-900",
                totalCharge: dec("8500"),
                placeOfServiceCode: "11",
                facilityCodeQualifier: "B",
                claimFrequencyCode: "1",
                diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
                serviceLines: [line],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe("🩺 build837: a service line with no units is REFUSED, never emitted as a fabricated 0", () => {
  const LINE: Build837ServiceLineProfessionalSpec = {
    variant: "P",
    procedureQualifier: "HC",
    procedureCode: "99213",
    charge: dec("8500"),
    unitOfMeasure: "UN",
    units: dec("4"),
    placeOfServiceCode: "11",
    diagnosisPointers: ["1"],
  };

  /**
   * Drop `units`, which is REQUIRED on the spec as of this slice. The cast
   * models the caller who reaches this at run time: a JS consumer, a
   * `JSON.parse`d spec, or a TypeScript consumer on `0.0.12`'s types who has
   * not recompiled. It is the only cast in this file.
   */
  function withoutUnits(
    line: Build837ServiceLineProfessionalSpec,
  ): Build837ServiceLineProfessionalSpec {
    const { units: _units, ...rest } = line;
    return rest as unknown as Build837ServiceLineProfessionalSpec;
  }

  it("CONTROL: with units supplied, SV1-04 carries exactly what the caller supplied", () => {
    const ix = build837P(p837Spec(LINE));
    expect(serializeX12(ix)).toContain("SV1*HC:99213*8500*UN*4*11**1~");
  });

  it("with units omitted it refuses, with the code and the slot named", () => {
    // Through `0.0.12` this emitted `SV1*HC:99213*8500*UN*0*...`, stating a
    // service unit count no caller ever supplied - the reader-side defect this
    // slice closes, running the other way. Assert the MESSAGE, not only the
    // class: `toThrow(Claim837BuildError)` passes on an unrelated refusal.
    let caught: unknown;
    try {
      build837P(p837Spec(withoutUnits(LINE)));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Claim837BuildError);
    expect((caught as { code?: string }).code).toBe(
      CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC,
    );
    expect((caught as Error).message).toMatch(/service line at index 0 with no units/u);
    // The refusal names the structural locator and no caller value: `claimId`
    // is the provider's patient-account number.
    expect((caught as Error).message).not.toContain("PT-ACCT-900");
  });

  it("a STATED zero units is emitted, because the caller did state it", () => {
    const ix = build837P(p837Spec({ ...LINE, units: dec("0") }));
    expect(serializeX12(ix)).toContain("SV1*HC:99213*8500*UN*0*11**1~");
  });
});

describe("🩺 build835: an undefined balance term is refused as an invalid spec, not as a mismatch", () => {
  const spec = (): unknown => ({
    envelope: ENVELOPE,
    payment: {
      transactionHandlingCode: "I",
      totalActualPayment: dec("450.00"),
      creditDebitFlag: "C",
      method: "ACH",
      paymentDate: "20260601",
    },
    traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
    claims: [
      {
        patientControlNumber: "PT-ACCT-001",
        claimStatusCode: "1",
        totalChargeAmount: dec("500.00"),
        totalPaymentAmount: dec("450.00"),
        patientResponsibilityAmount: dec("50.00"),
        adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
      },
    ],
  });

  it("CONTROL: the fixture builds clean, so the case below measures the term and not a broken spec", () => {
    const ix = build835(spec() as Build835Spec);
    expect(ix.warnings).toHaveLength(0);
  });

  it("a JS caller passing undefined for CLP-03 gets a typed refusal, not an untyped TypeError", () => {
    // Unreachable from TypeScript - every balance term on `Build835Spec` is a
    // required `X12Decimal`. Through `0.0.12` a JS caller reached
    // `undefined.add` inside the balance guard and got an untyped `TypeError`.
    const broken = spec() as { claims: Record<string, unknown>[] };
    const firstClaim = broken.claims[0];
    if (firstClaim === undefined) throw new Error("fixture has no claim");
    firstClaim["totalChargeAmount"] = undefined;
    let caught: unknown;
    try {
      build835(broken as unknown as Build835Spec);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Remit835BuildError);
    expect((caught as { code?: string }).code).toBe(
      REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_INVALID_SPEC,
    );
    // NOT the balance-mismatch code: nothing was measured out of balance.
    expect((caught as { code?: string }).code).not.toBe(
      REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_BALANCE_MISMATCH,
    );
    expect((caught as Error).message).toMatch(/balance cannot be checked/u);
  });
});

// ---------------------------------------------------------------------------
// The public helper that still fabricates, and the reason it survives.
// ---------------------------------------------------------------------------

describe("elementDecimalOrZero is unchanged, and no reader in this library calls it any more", () => {
  it("still substitutes X12Decimal.ZERO, because a caller may still want that", () => {
    // The helper is a public export and its documented behaviour IS the
    // fabrication. What changed is that this library's own readers stopped
    // asking for it; a consumer walking segments itself can still opt in, now
    // knowingly rather than by inheriting the readers' convention.
    expect(elementDecimalOrZero(seg("BPR*I"), 2, DELIMS).toString()).toBe("0");
  });

  it("`elementDecimal` on the same segment answers undefined - the two are the choice", () => {
    const warnings: X12ParseWarning[] = [];
    const out = elementDecimal(seg("BPR*I"), 2, DELIMS, {
      warnings,
      position: { segmentIndex: 1 },
    });
    expect(out).toBeUndefined();
    // An ABSENT element does not warn on either helper. Only the two model
    // slots differ, which is exactly what this slice moved.
    expect(warnings).toEqual([]);
  });
});

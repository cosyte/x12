/**
 * Unit tests for the 005010X221A1 835 emit surface — `build835`. Covers:
 *
 * - Happy path: a balanced remit round-trips through `get835`
 *   field-for-field with zero balance-mismatch warnings.
 * - Composite round-trips: CLP-08 (facility type + claim frequency),
 *   SVC-01 (procedure + modifiers), PLB (reason + sub-code), and the PLB
 *   raw-EDI sign convention (`BPR-02 == Σ(CLP-04) − Σ(PLB)`).
 * - Balance refusals: an out-of-balance service line / claim / remit
 *   throws `Remit835BuildError` with code `X12_835_BUILD_BALANCE_MISMATCH`
 *   and emits nothing.
 * - Structural refusals: no trace / empty patient-control number / an
 *   over-long control number → `X12_835_BUILD_INVALID_SPEC`.
 * - Envelope identity: GS-01 `HP`, ST-01 `835`, ST-03 `005010X221A1`.
 * - Pure-function discipline: returns a frozen interchange.
 * - PHI safety: a thrown balance error's message carries numeric totals
 *   only — no patient-control number / member id.
 */

import { describe, expect, it } from "vitest";

import {
  build835,
  get835,
  REMIT_835_BUILD_ERROR_CODES,
  Remit835BuildError,
  X12Decimal,
  type Build835ClaimSpec,
  type Build835ServiceLineSpec,
  type Build835Spec,
  type X12Interchange,
  type X12Remittance,
} from "../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

function remitOf(ix: X12Interchange): X12Remittance {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const remit = get835(ix.delimiters, tx);
  if (remit === undefined) throw new Error("get835 did not recognize the built 835");
  return remit;
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

const BASE_SERVICE_LINE: Build835ServiceLineSpec = {
  productServiceIdQualifier: "HC",
  productServiceId: "99213",
  modifiers: ["25"],
  chargeAmount: dec("500.00"),
  paymentAmount: dec("450.00"),
  serviceDateStart: "20260501",
  serviceDateEnd: "20260501",
  adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
  amounts: [{ qualifier: "B6", amount: dec("450.00") }],
  remarks: [{ system: "HE", code: "N4" }],
};

const BASE_CLAIM: Build835ClaimSpec = {
  patientControlNumber: "PT-ACCT-001",
  claimStatusCode: "1",
  totalChargeAmount: dec("500.00"),
  totalPaymentAmount: dec("450.00"),
  patientResponsibilityAmount: dec("50.00"),
  claimFilingIndicatorCode: "MB",
  payerClaimControlNumber: "ICN-9001",
  facilityTypeCode: "11",
  claimFrequencyCode: "1",
  patient: {
    entityIdentifierCode: "QC",
    lastName: "PATIENT",
    firstName: "TEST",
    idQualifier: "MI",
    idCode: "MEMBER001",
  },
  serviceProvider: {
    entityIdentifierCode: "82",
    name: "RENDERING CLINIC",
    idQualifier: "XX",
    idCode: "1234567890",
  },
  servicePeriodStart: "20260501",
  servicePeriodEnd: "20260501",
  references: [{ qualifier: "EA", value: "PT-ACCT-001" }],
  amounts: [{ qualifier: "AU", amount: dec("450.00") }],
  serviceLines: [BASE_SERVICE_LINE],
};

// A fully balanced single-claim remit with one service line carrying the
// adjustment. Claim: 450 paid + 50 line CAS == 500 charge; line: 450 + 50 ==
// 500; remit: Σ(CLP-04)=450 − Σ(PLB)=0 == BPR-02 450.
const BALANCED_SPEC: Build835Spec = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalActualPayment: dec("450.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
  payer: {
    entityIdentifierCode: "PR",
    name: "MEDICARE PART A",
    address: { lines: ["123 PAYER WAY"], city: "BALTIMORE", state: "MD", postalCode: "21244" },
    additionalIdentifiers: [{ qualifier: "2U", value: "MEDI-A" }],
    contacts: [
      {
        contactFunctionCode: "BL",
        name: "JANE COORDINATOR",
        communications: [{ qualifier: "TE", value: "5551234567" }],
      },
    ],
  },
  payee: {
    entityIdentifierCode: "PE",
    name: "RENDERING CLINIC",
    idQualifier: "XX",
    idCode: "1234567890",
    address: { lines: ["1 CLINIC PLZ"], city: "COLUMBUS", state: "OH", postalCode: "43004" },
  },
  claims: [BASE_CLAIM],
};

describe("build835 — envelope identity", () => {
  it("emits GS-01 HP, ST-01 835, ST-03 005010X221A1", () => {
    const ix = build835(BALANCED_SPEC);
    expect(ix.groups).toHaveLength(1);
    expect(ix.groups[0]?.gs.elements[1]).toBe("HP");
    const tx = ix.groups[0]?.transactions[0];
    expect(tx?.st.elements[1]).toBe("835");
    expect(tx?.st.elements[3]).toBe("005010X221A1");
  });

  it("returns a frozen interchange with no parse warnings", () => {
    const ix = build835(BALANCED_SPEC);
    expect(Object.isFrozen(ix)).toBe(true);
    expect(ix.warnings).toHaveLength(0);
  });
});

describe("build835 → get835 round-trip", () => {
  it("reproduces the payment header, trace, and parties", () => {
    const remit = remitOf(build835(BALANCED_SPEC));
    expect(remit.warnings).toHaveLength(0);

    expect(remit.payment.transactionHandlingCode).toBe("I");
    expect(remit.payment.totalActualPayment.toString()).toBe("450.00");
    expect(remit.payment.creditDebitFlag).toBe("C");
    expect(remit.payment.method).toBe("ACH");
    expect(remit.payment.paymentDate).toBe("20260601");

    expect(remit.traces).toHaveLength(1);
    expect(remit.traces[0]?.referenceId).toBe("0012345");
    expect(remit.traces[0]?.originatingCompanyId).toBe("1512345678");

    expect(remit.payer?.name).toBe("MEDICARE PART A");
    expect(remit.payer?.address?.lines).toEqual(["123 PAYER WAY"]);
    expect(remit.payer?.address?.city).toBe("BALTIMORE");
    expect(remit.payer?.additionalIdentifiers[0]?.value).toBe("MEDI-A");
    expect(remit.payer?.contacts[0]?.communications[0]?.value).toBe("5551234567");
    expect(remit.payee?.name).toBe("RENDERING CLINIC");
    expect(remit.payee?.idCode).toBe("1234567890");
  });

  it("reproduces the claim, its composites, and the service line", () => {
    const remit = remitOf(build835(BALANCED_SPEC));
    expect(remit.claims).toHaveLength(1);
    const claim = remit.claims[0];
    expect(claim?.patientControlNumber).toBe("PT-ACCT-001");
    expect(claim?.claimStatusCode).toBe("1");
    expect(claim?.totalChargeAmount.toString()).toBe("500.00");
    expect(claim?.totalPaymentAmount.toString()).toBe("450.00");
    expect(claim?.patientResponsibilityAmount.toString()).toBe("50.00");
    expect(claim?.claimFilingIndicatorCode).toBe("MB");
    expect(claim?.payerClaimControlNumber).toBe("ICN-9001");
    // CLP-08 composite round-trips facility type + claim frequency.
    expect(claim?.facilityTypeCode).toBe("11");
    expect(claim?.claimFrequencyCode).toBe("1");
    expect(claim?.patient?.lastName).toBe("PATIENT");
    expect(claim?.patient?.idCode).toBe("MEMBER001");
    expect(claim?.serviceProvider?.idCode).toBe("1234567890");
    expect(claim?.servicePeriodStart).toBe("20260501");
    expect(claim?.servicePeriodEnd).toBe("20260501");
    expect(claim?.references[0]?.qualifier).toBe("EA");
    expect(claim?.amounts[0]?.qualifier).toBe("AU");

    const line = claim?.serviceLines[0];
    expect(line?.productServiceIdQualifier).toBe("HC");
    expect(line?.productServiceId).toBe("99213");
    expect(line?.modifiers).toEqual(["25"]);
    expect(line?.chargeAmount.toString()).toBe("500.00");
    expect(line?.paymentAmount.toString()).toBe("450.00");
    expect(line?.serviceDateStart).toBe("20260501");
    expect(line?.serviceDateEnd).toBe("20260501");
    expect(line?.adjustments).toHaveLength(1);
    expect(line?.adjustments[0]?.groupCode).toBe("PR");
    expect(line?.adjustments[0]?.reasonCode).toBe("1");
    expect(line?.adjustments[0]?.amount.toString()).toBe("50.00");
    expect(line?.amounts[0]?.qualifier).toBe("B6");
    expect(line?.remarks[0]?.code).toBe("N4");
  });

  it("round-trips distinct service-period start / end via DTM*150 + DTM*151", () => {
    const spec: Build835Spec = {
      ...BALANCED_SPEC,
      claims: [
        {
          ...BASE_CLAIM,
          serviceLines: [
            { ...BASE_SERVICE_LINE, serviceDateStart: "20260501", serviceDateEnd: "20260503" },
          ],
        },
      ],
    };
    const line = remitOf(build835(spec)).claims[0]?.serviceLines[0];
    expect(line?.serviceDateStart).toBe("20260501");
    expect(line?.serviceDateEnd).toBe("20260503");
  });
});

describe("build835 — PLB provider-level adjustment", () => {
  // Take-back: a positive PLB reduces the payment. Σ(CLP-04)=450, PLB=+50,
  // so BPR-02 must be 450 − 50 = 400.
  const PLB_SPEC: Build835Spec = {
    ...BALANCED_SPEC,
    payment: { ...BALANCED_SPEC.payment, totalActualPayment: dec("400.00") },
    providerAdjustments: [
      {
        providerId: "1234567890",
        fiscalPeriodDate: "20261231",
        reasonCode: "WO",
        subCode: "PRIOR-CLAIM-X",
        amount: dec("50.00"),
      },
    ],
  };

  it("round-trips a take-back PLB and honours the raw-EDI sign", () => {
    const remit = remitOf(build835(PLB_SPEC));
    expect(remit.warnings).toHaveLength(0);
    expect(remit.providerAdjustments).toHaveLength(1);
    const plb = remit.providerAdjustments[0];
    expect(plb?.providerId).toBe("1234567890");
    expect(plb?.fiscalPeriodDate).toBe("20261231");
    expect(plb?.reasonCode).toBe("WO");
    expect(plb?.subCode).toBe("PRIOR-CLAIM-X");
    expect(plb?.amount.toString()).toBe("50.00");
  });

  it("refuses a remit whose BPR-02 ignores the PLB", () => {
    const broken: Build835Spec = {
      ...PLB_SPEC,
      payment: { ...PLB_SPEC.payment, totalActualPayment: dec("450.00") },
    };
    expect(() => build835(broken)).toThrow(Remit835BuildError);
  });
});

describe("build835 — balance refusals", () => {
  it("refuses an out-of-balance service line", () => {
    const broken: Build835Spec = {
      ...BALANCED_SPEC,
      claims: [
        {
          ...BASE_CLAIM,
          serviceLines: [
            {
              ...BASE_SERVICE_LINE,
              adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("40.00") }],
            },
          ],
        },
      ],
    };
    try {
      build835(broken);
      throw new Error("expected build835 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Remit835BuildError);
      expect((err as Remit835BuildError).code).toBe(
        REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_BALANCE_MISMATCH,
      );
    }
  });

  // A header-only claim (no service lines, no adjustments) whose CLP-04
  // does not equal CLP-03 — 400 paid against a 500 charge with nothing to
  // absorb the 100 delta.
  const UNBALANCED_CLAIM_SPEC: Build835Spec = {
    ...BALANCED_SPEC,
    payment: { ...BALANCED_SPEC.payment, totalActualPayment: dec("400.00") },
    claims: [
      {
        patientControlNumber: "PT-ACCT-001",
        claimStatusCode: "1",
        totalChargeAmount: dec("500.00"),
        totalPaymentAmount: dec("400.00"),
        patientResponsibilityAmount: dec("100.00"),
        patient: {
          entityIdentifierCode: "QC",
          lastName: "PATIENT",
          idQualifier: "MI",
          idCode: "MEMBER001",
        },
      },
    ],
  };

  it("refuses an out-of-balance claim", () => {
    expect(() => build835(UNBALANCED_CLAIM_SPEC)).toThrow(/out-of-balance claim/);
  });

  it("a balance error message carries numeric totals only — no PHI", () => {
    try {
      build835(UNBALANCED_CLAIM_SPEC);
      throw new Error("expected build835 to throw");
    } catch (err) {
      const message = (err as Remit835BuildError).message;
      expect(message).not.toContain("PT-ACCT-001");
      expect(message).not.toContain("MEMBER001");
    }
  });
});

describe("build835 — structural refusals", () => {
  it("refuses a spec with no trace", () => {
    const broken: Build835Spec = { ...BALANCED_SPEC, traces: [] };
    try {
      build835(broken);
      throw new Error("expected build835 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Remit835BuildError);
      expect((err as Remit835BuildError).code).toBe(
        REMIT_835_BUILD_ERROR_CODES.X12_835_BUILD_INVALID_SPEC,
      );
    }
  });

  it("refuses a claim with an empty patient-control number", () => {
    const broken: Build835Spec = {
      ...BALANCED_SPEC,
      claims: [{ ...BASE_CLAIM, patientControlNumber: "" }],
    };
    expect(() => build835(broken)).toThrow(Remit835BuildError);
  });

  it("refuses an over-long interchange control number", () => {
    const broken: Build835Spec = {
      ...BALANCED_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "0123456789" },
    };
    expect(() => build835(broken)).toThrow(Remit835BuildError);
  });
});

describe("build835 — minimal spec (no parties, no claims)", () => {
  // A zero-dollar remit with no payer / payee / claims and a bare trace.
  // Remit balance: BPR-02 0 == Σ(CLP-04) 0 − Σ(PLB) 0.
  const MINIMAL_SPEC: Build835Spec = {
    envelope: ENVELOPE,
    payment: {
      transactionHandlingCode: "H",
      totalActualPayment: dec("0.00"),
      creditDebitFlag: "C",
      method: "NON",
      paymentDate: "20260601",
    },
    traces: [{ traceTypeCode: "1", referenceId: "0012345" }],
    claims: [],
  };

  it("builds an empty remit without a payer, payee, or any claim", () => {
    const remit = remitOf(build835(MINIMAL_SPEC));
    expect(remit.payer).toBeUndefined();
    expect(remit.payee).toBeUndefined();
    expect(remit.claims).toHaveLength(0);
    expect(remit.traces[0]?.referenceId).toBe("0012345");
    expect(remit.traces[0]?.originatingCompanyId).toBeUndefined();
  });
});

describe("build835 — envelope + payment overrides", () => {
  it("honours explicit delimiters, qualifiers, group fields, and BPR format code", () => {
    const spec: Build835Spec = {
      ...BALANCED_SPEC,
      envelope: {
        ...ENVELOPE,
        elementSeparator: "*",
        repetitionSeparator: "^",
        componentSeparator: ":",
        segmentTerminator: "~",
        senderQualifier: "30",
        receiverQualifier: "30",
        usageIndicator: "T",
        groupDate: "20260601",
        groupTime: "1230",
        applicationSenderCode: "APPSENDER",
        applicationReceiverCode: "APPRECV",
      },
      payment: { ...BALANCED_SPEC.payment, paymentFormatCode: "CCP" },
    };
    const ix = build835(spec);
    expect(ix.isa.elements[15]).toBe("T"); // ISA-15 usage indicator
    expect(ix.groups[0]?.gs.elements[2]).toBe("APPSENDER"); // GS-02
    expect(ix.groups[0]?.gs.elements[3]).toBe("APPRECV"); // GS-03
    expect(ix.groups[0]?.gs.elements[4]).toBe("20260601"); // GS-04
    expect(ix.groups[0]?.gs.elements[5]).toBe("1230"); // GS-05
    expect(remitOf(ix).payment.totalActualPayment.toString()).toBe("450.00");
  });

  it("zero-pads an under-width interchange control number to 9", () => {
    const spec: Build835Spec = {
      ...BALANCED_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "1" },
    };
    const ix = build835(spec);
    expect(ix.isa.elements[13]).toBe("000000001"); // ISA-13
  });

  it("truncates an over-long ISA-06 sender id to 15 chars", () => {
    const spec: Build835Spec = {
      ...BALANCED_SPEC,
      envelope: { ...ENVELOPE, senderId: "SENDERIDWAYTOOLONGFORISA06" },
    };
    const ix = build835(spec);
    expect(ix.isa.elements[6]).toBe("SENDERIDWAYTOOL"); // 15 chars
  });

  it("expands a 20th-century YYMMDD interchange date for GS-04", () => {
    const spec: Build835Spec = {
      ...BALANCED_SPEC,
      envelope: { ...ENVELOPE, interchangeDate: "990601" },
    };
    const ix = build835(spec);
    expect(ix.groups[0]?.gs.elements[4]).toBe("19990601"); // GS-04
  });
});

describe("build835 — maximal claim coverage", () => {
  // A single claim exercising every optional emit branch while staying in
  // balance. Claim: CLP-03 1000 == CLP-04 600 + Σ(CAS) 400 (350 claim-level
  // + 50 line-level). Line: SVC-02 600 == SVC-03 550 + 50 line CAS. Remit:
  // BPR-02 600 == Σ(CLP-04) 600 − Σ(PLB) 0.
  const MAXIMAL_SPEC: Build835Spec = {
    envelope: ENVELOPE,
    payment: {
      transactionHandlingCode: "I",
      totalActualPayment: dec("600.00"),
      creditDebitFlag: "C",
      method: "ACH",
      paymentDate: "20260601",
    },
    traces: [
      {
        traceTypeCode: "1",
        referenceId: "T1",
        originatingCompanyId: "1512345678",
        originatingCompanySupplementalCode: "SUP",
      },
    ],
    payer: { entityIdentifierCode: "PR", name: "PAYER", address: { lines: [] } },
    payee: { entityIdentifierCode: "PE", name: "CLINIC" },
    claims: [
      {
        patientControlNumber: "PT-1",
        claimStatusCode: "1",
        totalChargeAmount: dec("1000.00"),
        totalPaymentAmount: dec("600.00"),
        patientResponsibilityAmount: dec("400.00"),
        patient: { entityIdentifierCode: "QC", lastName: "DOE" },
        subscriber: { entityIdentifierCode: "IL" },
        correctedPatient: { entityIdentifierCode: "74", lastName: "DOE", firstName: "J" },
        serviceProvider: { entityIdentifierCode: "82", name: "PROV" },
        renderingProvider: { entityIdentifierCode: "82" },
        adjustments: [
          { groupCode: "CO", reasonCode: "45", amount: dec("40.00") },
          { groupCode: "CO", reasonCode: "45", amount: dec("40.00") },
          { groupCode: "CO", reasonCode: "45", amount: dec("40.00") },
          { groupCode: "CO", reasonCode: "45", amount: dec("40.00") },
          { groupCode: "CO", reasonCode: "45", amount: dec("40.00") },
          { groupCode: "CO", reasonCode: "45", amount: dec("40.00") },
          { groupCode: "CO", reasonCode: "45", amount: dec("40.00"), quantity: dec("1") },
          { groupCode: "OA", reasonCode: "23", amount: dec("70.00") },
        ],
        remarks: [{ system: "HE", code: "N4" }],
        references: [{ qualifier: "EA", value: "PT-1", description: "ACCOUNT" }],
        amounts: [{ qualifier: "AU", amount: dec("600.00") }],
        serviceLines: [
          {
            productServiceIdQualifier: "HC",
            productServiceId: "99213",
            chargeAmount: dec("600.00"),
            paymentAmount: dec("550.00"),
            revenueCode: "0300",
            paidUnitsOfService: dec("2"),
            originalServiceIdQualifier: "HC",
            originalServiceId: "99212",
            adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
            references: [{ qualifier: "6R", value: "LINE-1" }],
          },
        ],
      },
    ],
  };

  it("emits all optional loops and chunks a >6-triple claim CAS group", () => {
    const ix = build835(MAXIMAL_SPEC);
    const tx = ix.groups[0]?.transactions[0];
    const casSegments = (tx?.segments ?? []).filter((s) => s.id === "CAS");
    // CO group of 7 chunks into 6+1; OA group is a third CAS; PR line CAS a
    // fourth.
    expect(casSegments.length).toBe(4);

    const remit = remitOf(ix);
    const claim = remit.claims[0];
    expect(claim?.subscriber?.entityIdentifierCode).toBe("IL");
    expect(claim?.correctedPatient?.firstName).toBe("J");
    expect(claim?.renderingProvider?.entityIdentifierCode).toBe("82");
    expect(claim?.facilityTypeCode).toBeUndefined();
    expect(claim?.references[0]?.qualifier).toBe("EA");
    const line = claim?.serviceLines[0];
    expect(line?.revenueCode).toBe("0300");
    expect(line?.originalServiceId).toBe("99212");
  });
});

describe("build835 — service-line date variants", () => {
  // Two zero-CAS lines: one start-only, one end-only. Claim: 200 == 200 + 0.
  const DTM_SPEC: Build835Spec = {
    envelope: ENVELOPE,
    payment: {
      transactionHandlingCode: "I",
      totalActualPayment: dec("200.00"),
      creditDebitFlag: "C",
      method: "ACH",
      paymentDate: "20260601",
    },
    traces: [{ traceTypeCode: "1", referenceId: "T1" }],
    claims: [
      {
        patientControlNumber: "PT-1",
        claimStatusCode: "1",
        totalChargeAmount: dec("200.00"),
        totalPaymentAmount: dec("200.00"),
        patientResponsibilityAmount: dec("0.00"),
        serviceLines: [
          {
            productServiceIdQualifier: "HC",
            productServiceId: "A",
            chargeAmount: dec("100.00"),
            paymentAmount: dec("100.00"),
            serviceDateStart: "20260501",
          },
          {
            productServiceIdQualifier: "HC",
            productServiceId: "B",
            chargeAmount: dec("100.00"),
            paymentAmount: dec("100.00"),
            serviceDateEnd: "20260502",
          },
        ],
      },
    ],
  };

  it("emits DTM*150 for a start-only line and DTM*151 for an end-only line", () => {
    const ix = build835(DTM_SPEC);
    const tx = ix.groups[0]?.transactions[0];
    const dtms = (tx?.segments ?? []).filter((s) => s.id === "DTM");
    const qualifiers = dtms.map((s) => s.elements[1]);
    expect(qualifiers).toContain("150");
    expect(qualifiers).toContain("151");
    expect(qualifiers).not.toContain("472");
  });
});

describe("build835 — multi-PLB chunking", () => {
  // PROV1/20261231 carries 7 take-back pairs (chunk 6+1); PROV2/20261231 is
  // a fresh PLB. Σ(PLB) 100, so BPR-02 350 == Σ(CLP-04) 450 − 100.
  const PLB_MULTI_SPEC: Build835Spec = {
    ...BALANCED_SPEC,
    payment: { ...BALANCED_SPEC.payment, totalActualPayment: dec("350.00") },
    providerAdjustments: [
      {
        providerId: "PROV1",
        fiscalPeriodDate: "20261231",
        reasonCode: "WO",
        subCode: "SUB-A",
        amount: dec("10.00"),
      },
      { providerId: "PROV1", fiscalPeriodDate: "20261231", reasonCode: "WO", amount: dec("10.00") },
      { providerId: "PROV1", fiscalPeriodDate: "20261231", reasonCode: "WO", amount: dec("10.00") },
      { providerId: "PROV1", fiscalPeriodDate: "20261231", reasonCode: "WO", amount: dec("10.00") },
      { providerId: "PROV1", fiscalPeriodDate: "20261231", reasonCode: "WO", amount: dec("10.00") },
      { providerId: "PROV1", fiscalPeriodDate: "20261231", reasonCode: "WO", amount: dec("10.00") },
      { providerId: "PROV1", fiscalPeriodDate: "20261231", reasonCode: "WO", amount: dec("10.00") },
      { providerId: "PROV2", fiscalPeriodDate: "20261231", reasonCode: "FB", amount: dec("30.00") },
    ],
  };

  it("chunks a >6-pair PLB and starts a fresh PLB for a new provider", () => {
    const ix = build835(PLB_MULTI_SPEC);
    const tx = ix.groups[0]?.transactions[0];
    const plbs = (tx?.segments ?? []).filter((s) => s.id === "PLB");
    // PROV1 7 pairs → 6+1 across two PLBs; PROV2 → a third PLB.
    expect(plbs.length).toBe(3);
    const remit = remitOf(ix);
    expect(remit.providerAdjustments.length).toBe(8);
    expect(remit.providerAdjustments[0]?.subCode).toBe("SUB-A");
  });
});

describe("build835 — delimiter-bearing values round-trip losslessly", () => {
  it("escapes a value carrying the segment terminator and parses it back", () => {
    // A trace reference id containing the active delimiters. `escapeRelease`
    // emits `?~` / `?*` / `?:`; the round-trip must reproduce the value, not
    // split the TRN on the embedded terminator.
    const spec: Build835Spec = {
      ...BALANCED_SPEC,
      traces: [
        { traceTypeCode: "1", referenceId: "AB~CD*EF:GH", originatingCompanyId: "1512345678" },
      ],
    };
    const ix = build835(spec);
    const tx = ix.groups[0]?.transactions[0];
    expect((tx?.segments ?? []).filter((s) => s.id === "TRN")).toHaveLength(1);
    const remit = remitOf(ix);
    expect(remit.warnings).toHaveLength(0);
    expect(remit.traces[0]?.referenceId).toBe("AB~CD*EF:GH");
  });
});

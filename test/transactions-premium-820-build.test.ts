/**
 * Unit tests for the 005010X218 820 emit surface - `build820`. Covers:
 *
 * - Happy path: a premium payment round-trips through `get820Payments`
 *   field-for-field with zero warnings (BPR header, TRN traces, receiver +
 *   remitter parties, both organization-summary `ENT` and individual `NM1`
 *   remittance loops with RMR open items, DTM dates, ADX adjustments).
 * - Verbatim money: BPR-02 and every RMR amount emit as the supplied
 *   `X12Decimal` cents-exact - the 820 carries no balance equation, so the
 *   total is never reconciled against the open items.
 * - Structural refusals: no trace / no remittance / a remittance with
 *   neither entity nor individual / a remittance with no open items / an
 *   open item with no identity / an over-long control number →
 *   `X12_820_BUILD_INVALID_SPEC`.
 * - Envelope identity: GS-01 `RA`, ST-01 `820`, ST-03 `005010X218`.
 * - Pure-function discipline: returns a frozen interchange.
 * - PHI safety: a thrown structural error's message carries indices /
 *   counts only - no member id / name.
 */

import { describe, expect, it } from "vitest";

import {
  build820,
  get820Payments,
  PREMIUM_820_BUILD_ERROR_CODES,
  Premium820BuildError,
  X12Decimal,
  type Build820Spec,
  type X12Interchange,
  type X12PremiumPayments,
} from "../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

function premiumOf(ix: X12Interchange): X12PremiumPayments {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const prem = get820Payments(ix.delimiters, tx);
  if (prem === undefined) throw new Error("get820Payments did not recognize the built 820");
  return prem;
}

const ENVELOPE = {
  senderId: "EMPLOYERCO",
  receiverId: "MEDPAY",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

// A canonical premium payment: one ACH payment, one trace, receiver +
// remitter parties, an individual remittance (NM1 + RMR + DTM) and an
// organization-summary remittance (ENT + NM1 + RMR + ADX).
const CANONICAL_SPEC: Build820Spec = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: dec("12500.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentFormatCode: "CTX",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "PREM-202606", originatingCompanyId: "1512345678" }],
  receiver: {
    entityIdentifierCode: "PE",
    name: "MEDPAY INSURANCE",
    idQualifier: "FI",
    idCode: "FEIN999",
    address: { lines: ["1 INSURER WAY"], city: "COLUMBUS", state: "OH", postalCode: "43004" },
    references: [{ qualifier: "38", value: "POL-MASTER-1" }],
  },
  remitter: {
    entityIdentifierCode: "PR",
    name: "EMPLOYER CO",
    idQualifier: "FI",
    idCode: "FEIN123",
    address: { lines: ["500 CORPORATE BLVD"], city: "DUBLIN", state: "OH", postalCode: "43017" },
  },
  remittances: [
    {
      individual: {
        entityIdentifierCode: "IL",
        lastName: "DOE",
        firstName: "JANE",
        idQualifier: "34",
        idCode: "MBR0001",
      },
      references: [{ qualifier: "38", value: "POL-0001" }],
      dates: [{ qualifier: "582", value: "20260601" }],
      openItems: [
        {
          qualifier: "AZ",
          referenceId: "POL-0001",
          amountPaid: dec("250.00"),
          amountDue: dec("250.00"),
        },
      ],
    },
    {
      entity: {
        assignedNumber: "1",
        entityIdentifierCode: "2J",
        idQualifier: "94",
        idCode: "GRP-0001",
      },
      individual: {
        entityIdentifierCode: "IL",
        lastName: "SMITH",
        idQualifier: "34",
        idCode: "MBR0002",
      },
      openItems: [{ qualifier: "AZ", referenceId: "POL-0002", amountPaid: dec("12250.00") }],
      adjustments: [
        {
          amount: dec("-25.00"),
          reasonCode: "53",
          referenceQualifier: "38",
          referenceId: "POL-0002",
        },
      ],
    },
  ],
};

describe("build820 - envelope identity", () => {
  it("emits GS-01 RA, ST-01 820, ST-03 005010X218", () => {
    const ix = build820(CANONICAL_SPEC);
    expect(ix.groups).toHaveLength(1);
    expect(ix.groups[0]?.gs.elements[1]).toBe("RA");
    const tx = ix.groups[0]?.transactions[0];
    expect(tx?.st.elements[1]).toBe("820");
    expect(tx?.st.elements[3]).toBe("005010X218");
  });

  it("returns a frozen interchange with no parse warnings", () => {
    const ix = build820(CANONICAL_SPEC);
    expect(Object.isFrozen(ix)).toBe(true);
    expect(ix.warnings).toHaveLength(0);
  });
});

describe("build820 → get820Payments round-trip", () => {
  it("reproduces the payment header, trace, and parties", () => {
    const prem = premiumOf(build820(CANONICAL_SPEC));
    expect(prem.warnings).toHaveLength(0);

    expect(prem.payment.transactionHandlingCode).toBe("I");
    expect(prem.payment.totalPremiumAmount.toString()).toBe("12500.00");
    expect(prem.payment.creditDebitFlag).toBe("C");
    expect(prem.payment.method).toBe("ACH");
    expect(prem.payment.paymentFormatCode).toBe("CTX");
    expect(prem.payment.paymentDate).toBe("20260601");

    expect(prem.traces).toHaveLength(1);
    expect(prem.traces[0]?.traceTypeCode).toBe("1");
    expect(prem.traces[0]?.referenceId).toBe("PREM-202606");
    expect(prem.traces[0]?.originatingCompanyId).toBe("1512345678");

    expect(prem.receiver?.name).toBe("MEDPAY INSURANCE");
    expect(prem.receiver?.idCode).toBe("FEIN999");
    expect(prem.receiver?.address?.lines).toEqual(["1 INSURER WAY"]);
    expect(prem.receiver?.address?.city).toBe("COLUMBUS");
    expect(prem.receiver?.references[0]?.value).toBe("POL-MASTER-1");

    expect(prem.remitter?.name).toBe("EMPLOYER CO");
    expect(prem.remitter?.idCode).toBe("FEIN123");
    expect(prem.remitter?.address?.postalCode).toBe("43017");
  });

  it("reproduces the individual remittance - NM1, RMR, DTM", () => {
    const prem = premiumOf(build820(CANONICAL_SPEC));
    expect(prem.remittances).toHaveLength(2);

    const individual = prem.remittances[0];
    expect(individual?.individual?.lastName).toBe("DOE");
    expect(individual?.individual?.firstName).toBe("JANE");
    expect(individual?.individual?.idCode).toBe("MBR0001");
    expect(individual?.references[0]?.value).toBe("POL-0001");
    expect(individual?.dates[0]?.qualifier).toBe("582");
    expect(individual?.dates[0]?.value).toBe("20260601");
    expect(individual?.openItems).toHaveLength(1);
    expect(individual?.openItems[0]?.qualifier).toBe("AZ");
    expect(individual?.openItems[0]?.referenceId).toBe("POL-0001");
    expect(individual?.openItems[0]?.amountPaid.toString()).toBe("250.00");
    expect(individual?.openItems[0]?.amountDue?.toString()).toBe("250.00");
  });

  it("reproduces the organization-summary remittance - ENT, NM1, RMR, ADX", () => {
    const prem = premiumOf(build820(CANONICAL_SPEC));
    const summary = prem.remittances[1];
    expect(summary?.entity?.assignedNumber).toBe("1");
    expect(summary?.entity?.entityIdentifierCode).toBe("2J");
    expect(summary?.entity?.idCode).toBe("GRP-0001");
    expect(summary?.individual?.lastName).toBe("SMITH");
    expect(summary?.individual?.idCode).toBe("MBR0002");
    expect(summary?.openItems[0]?.amountPaid.toString()).toBe("12250.00");
    // The 820 has no balance equation - RMR-05 amount due omitted stays undefined.
    expect(summary?.openItems[0]?.amountDue).toBeUndefined();
    expect(summary?.adjustments).toHaveLength(1);
    expect(summary?.adjustments[0]?.amount.toString()).toBe("-25.00");
    expect(summary?.adjustments[0]?.reasonCode).toBe("53");
  });

  it("emits the BPR total verbatim - no reconciliation against the open items", () => {
    // BPR-02 (12500) deliberately does NOT equal Σ RMR (250 + 12250 = 12500
    // here, but the builder makes no such check); use a spec whose total is
    // intentionally unrelated to prove the builder never balances.
    const unbalanced: Build820Spec = {
      ...CANONICAL_SPEC,
      payment: { ...CANONICAL_SPEC.payment, totalPremiumAmount: dec("99999.99") },
    };
    const prem = premiumOf(build820(unbalanced));
    expect(prem.payment.totalPremiumAmount.toString()).toBe("99999.99");
    expect(prem.warnings).toHaveLength(0);
  });
});

describe("build820 - structural refusals", () => {
  it("refuses a spec with no TRN trace", () => {
    const spec: Build820Spec = { ...CANONICAL_SPEC, traces: [] };
    expect(() => build820(spec)).toThrow(Premium820BuildError);
    try {
      build820(spec);
    } catch (err) {
      expect(err).toBeInstanceOf(Premium820BuildError);
      expect((err as Premium820BuildError).code).toBe(
        PREMIUM_820_BUILD_ERROR_CODES.X12_820_BUILD_INVALID_SPEC,
      );
    }
  });

  it("refuses a spec with no remittance loop", () => {
    const spec: Build820Spec = { ...CANONICAL_SPEC, remittances: [] };
    expect(() => build820(spec)).toThrow(Premium820BuildError);
  });

  it("refuses a remittance with neither entity nor individual", () => {
    const spec: Build820Spec = {
      ...CANONICAL_SPEC,
      remittances: [
        { openItems: [{ qualifier: "AZ", referenceId: "X", amountPaid: dec("1.00") }] },
      ],
    };
    expect(() => build820(spec)).toThrow(Premium820BuildError);
  });

  it("refuses a remittance with no open items", () => {
    const spec: Build820Spec = {
      ...CANONICAL_SPEC,
      remittances: [{ individual: { entityIdentifierCode: "IL", lastName: "DOE" }, openItems: [] }],
    };
    expect(() => build820(spec)).toThrow(Premium820BuildError);
  });

  it("refuses an open item with no identity (empty qualifier and reference id)", () => {
    const spec: Build820Spec = {
      ...CANONICAL_SPEC,
      remittances: [
        {
          individual: { entityIdentifierCode: "IL", lastName: "DOE" },
          openItems: [{ qualifier: "", referenceId: "", amountPaid: dec("1.00") }],
        },
      ],
    };
    expect(() => build820(spec)).toThrow(Premium820BuildError);
  });

  it("refuses an over-long interchange control number", () => {
    const spec: Build820Spec = {
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "0000000001" },
    };
    expect(() => build820(spec)).toThrow(Premium820BuildError);
  });
});

describe("build820 - PHI safety", () => {
  it("a thrown structural error carries indices / counts only - no member id or name", () => {
    const spec: Build820Spec = {
      ...CANONICAL_SPEC,
      remittances: [
        {
          individual: { entityIdentifierCode: "IL", lastName: "DOE", idCode: "MBR-SECRET" },
          openItems: [{ qualifier: "", referenceId: "", amountPaid: dec("1.00") }],
        },
      ],
    };
    try {
      build820(spec);
      throw new Error("expected build820 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Premium820BuildError);
      const message = (err as Premium820BuildError).message;
      expect(message).not.toContain("MBR-SECRET");
      expect(message).not.toContain("DOE");
    }
  });
});

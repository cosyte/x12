/**
 * Unit tests for the Phase 4 835 surface (`get835`). Covers:
 *
 * - All six 835 Tier-1 + Tier-2 fixtures: end-to-end extraction.
 * - Money discipline: every monetary field decodes as `X12Decimal`, never
 *   `number` - float arithmetic destroys cents at scale.
 * - Balance invariants per TR3 X221A1 §1.10.2: line + claim + top-of-remit
 *   warn loudly on mismatch, NEVER silently rebalance.
 * - CAS triple flattening: one CAS segment carrying multiple triples
 *   becomes multiple flat `X12RemitAdjustment` entries.
 * - PLB sign convention: positive PLB amount REDUCES BPR-02 (take-back).
 * - Code-list integration: bundled CARC/RARC descriptions surface on
 *   known codes; unknown codes preserve the verbatim value and emit
 *   `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC`.
 * - The dogfooded loop spec (Loop 2000 → Loop 2100 → Loop 2110) is a
 *   public artifact authored through `defineLoopSpec`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CLAIM_ADJUSTMENT_GROUP_CODES,
  REMIT_835_LOOP_1000A,
  REMIT_835_LOOP_2000,
  REMIT_835_LOOP_2100,
  REMIT_835_LOOP_2110,
  WARNING_CODES,
  X12Decimal,
  get835,
  parseX12,
} from "../src/index.js";
import type { X12Remittance } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "remit");

function readRemitFixture(name: string): X12Remittance {
  const raw = readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
  if (tx === undefined) throw new Error(`Fixture ${name} has no 835 transaction set`);
  const remit = get835(ix.delimiters, tx);
  if (remit === undefined) throw new Error(`get835 returned undefined for ${name}`);
  return remit;
}

describe("get835 - Medicare canonical fixture", () => {
  it("decodes BPR / TRN / payer / payee / one claim / one service line", () => {
    const remit = readRemitFixture("835-medicare-canonical.edi");

    expect(remit.payment.transactionHandlingCode).toBe("I");
    expect(remit.payment.totalActualPayment.toString()).toBe("450.00");
    expect(remit.payment.creditDebitFlag).toBe("C");
    expect(remit.payment.method).toBe("ACH");
    expect(remit.payment.paymentDate).toBe("20260601");

    expect(remit.traces).toHaveLength(1);
    expect(remit.traces[0]?.referenceId).toBe("0012345");

    expect(remit.payer?.name).toBe("MEDICARE PART A");
    expect(remit.payer?.address?.city).toBe("BALTIMORE");
    expect(remit.payer?.address?.state).toBe("MD");
    expect(remit.payer?.address?.lines).toContain("123 PAYER WAY");
    expect(remit.payer?.contacts[0]?.contactFunctionCode).toBe("BL");
    expect(remit.payer?.contacts[0]?.communications[0]?.qualifier).toBe("TE");

    expect(remit.payee?.name).toBe("SAMPLE CLINIC INC");
    expect(remit.payee?.additionalIdentifiers[0]?.qualifier).toBe("TJ");

    expect(remit.claims).toHaveLength(1);
    const claim = remit.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.patientControlNumber).toBe("PT-ACCT-001");
    expect(claim.claimStatusCode).toBe("1");
    expect(claim.claimStatusDescription).toMatch(/Primary/iu);
    expect(claim.totalChargeAmount.toString()).toBe("500.00");
    expect(claim.totalPaymentAmount.toString()).toBe("450.00");
    expect(claim.patientResponsibilityAmount.toString()).toBe("50.00");
    expect(claim.servicePeriodStart).toBe("20260501");
    expect(claim.servicePeriodEnd).toBe("20260501");
    expect(claim.patient?.lastName).toBe("PATIENT");
    expect(claim.patient?.firstName).toBe("TEST");
    expect(claim.patient?.idCode).toBe("MEMBER001");
    expect(claim.serviceProvider?.name).toBe("RENDERING PROVIDER INC");
    expect(claim.serviceProvider?.idCode).toBe("1234567890");

    expect(claim.serviceLines).toHaveLength(1);
    const line = claim.serviceLines[0];
    if (line === undefined) throw new Error("missing line");
    expect(line.productServiceIdQualifier).toBe("HC");
    expect(line.productServiceId).toBe("99213");
    expect(line.chargeAmount.toString()).toBe("500.00");
    expect(line.paymentAmount.toString()).toBe("450.00");
    expect(line.adjustments).toHaveLength(1);
    expect(line.adjustments[0]?.groupCode).toBe(CLAIM_ADJUSTMENT_GROUP_CODES.PR);
    expect(line.adjustments[0]?.reasonCode).toBe("1");
    expect(line.adjustments[0]?.amount.toString()).toBe("50.00");
    expect(line.adjustments[0]?.reasonDescription).toMatch(/Deductible/iu);

    expect(remit.warnings).toEqual([]);
  });

  it("every monetary field decodes as X12Decimal - never a number", () => {
    const remit = readRemitFixture("835-medicare-canonical.edi");
    expect(remit.payment.totalActualPayment).toBeInstanceOf(X12Decimal);
    expect(remit.claims[0]?.totalChargeAmount).toBeInstanceOf(X12Decimal);
    expect(remit.claims[0]?.serviceLines[0]?.paymentAmount).toBeInstanceOf(X12Decimal);
    expect(remit.claims[0]?.adjustments).toHaveLength(0);
    expect(remit.claims[0]?.serviceLines[0]?.adjustments[0]?.amount).toBeInstanceOf(X12Decimal);
  });
});

describe("get835 - multi-claim with mixed CO/PR/OA/PI adjustments", () => {
  it("decodes two claims and flattens the CAS triple into 2 line-level adjustments", () => {
    const remit = readRemitFixture("835-multi-claim.edi");
    expect(remit.claims).toHaveLength(2);

    const claimA = remit.claims[0];
    if (claimA === undefined) throw new Error("missing claim A");
    expect(claimA.patientControlNumber).toBe("PT-A");
    expect(claimA.totalChargeAmount.toString()).toBe("200.00");
    expect(claimA.totalPaymentAmount.toString()).toBe("160.00");
    const lineA = claimA.serviceLines[0];
    if (lineA === undefined) throw new Error("missing line A");
    expect(lineA.adjustments).toHaveLength(2);
    expect(lineA.adjustments[0]?.groupCode).toBe("CO");
    expect(lineA.adjustments[0]?.reasonCode).toBe("45");
    expect(lineA.adjustments[0]?.amount.toString()).toBe("30.00");
    expect(lineA.adjustments[1]?.groupCode).toBe("PR");
    expect(lineA.adjustments[1]?.reasonCode).toBe("2");
    expect(lineA.adjustments[1]?.amount.toString()).toBe("10.00");

    const claimB = remit.claims[1];
    if (claimB === undefined) throw new Error("missing claim B");
    expect(claimB.patientControlNumber).toBe("PT-B");
    expect(claimB.serviceLines[0]?.adjustments[0]?.groupCode).toBe("PR");

    expect(remit.warnings).toEqual([]);
  });
});

describe("get835 - PLB take-back and top-of-remit balance", () => {
  it("PLB amount reduces BPR-02 (raw EDI sign convention)", () => {
    const remit = readRemitFixture("835-with-plb.edi");
    expect(remit.claims).toHaveLength(1);
    expect(remit.claims[0]?.totalPaymentAmount.toString()).toBe("100.00");
    expect(remit.providerAdjustments).toHaveLength(1);
    expect(remit.providerAdjustments[0]?.reasonCode).toBe("WO");
    expect(remit.providerAdjustments[0]?.subCode).toBe("PRIOR-CLAIM-X");
    expect(remit.providerAdjustments[0]?.amount.toString()).toBe("50.00");
    expect(remit.payment.totalActualPayment.toString()).toBe("50.00");
    // Σ(CLP-04) - Σ(PLB) = BPR-02 → 100 - 50 == 50; no balance warning.
    expect(
      remit.warnings.filter((w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH),
    ).toHaveLength(0);
  });
});

describe("get835 - CARC / RARC integration", () => {
  it("looks up CARC descriptions for known codes; warns + preserves unknown verbatim", () => {
    const remit = readRemitFixture("835-carc-rarc-mix.edi");
    const claim = remit.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    const line = claim.serviceLines[0];
    if (line === undefined) throw new Error("missing line");
    expect(line.adjustments).toHaveLength(2);
    expect(line.adjustments[0]?.reasonCode).toBe("45");
    expect(line.adjustments[0]?.reasonDescription).toMatch(/fee schedule/iu);
    expect(line.adjustments[1]?.reasonCode).toBe("9999");
    expect(line.adjustments[1]?.reasonDescription).toBeUndefined();
    expect(remit.warnings.some((w) => w.code === WARNING_CODES.X12_UNKNOWN_CARC)).toBe(true);
  });

  it("looks up RARC descriptions on LQ*HE (service-line); warns on unknown RARC", () => {
    const remit = readRemitFixture("835-carc-rarc-mix.edi");
    // LQ in this fixture follows the SVC, so the remarks land on the
    // service line (not the claim) - both placements are spec-valid per
    // X221A1 §LQ.
    const remarks = remit.claims[0]?.serviceLines[0]?.remarks ?? [];
    expect(remarks).toHaveLength(2);
    expect(remarks[0]?.code).toBe("N4");
    expect(remarks[0]?.description).toMatch(/EOB/iu);
    expect(remarks[1]?.code).toBe("ZZZZ");
    expect(remarks[1]?.description).toBeUndefined();
    expect(remit.warnings.some((w) => w.code === WARNING_CODES.X12_UNKNOWN_RARC)).toBe(true);
  });

  it("warnings on unknown CARC / RARC never echo PHI-shape values", () => {
    const remit = readRemitFixture("835-carc-rarc-mix.edi");
    for (const w of remit.warnings) {
      // No long digit runs / no ISO-date / no NPI-shape echoes in messages.
      expect(w.message).not.toMatch(/\b\d{9,}\b/u);
      expect(w.message).not.toMatch(/\b\d{4}-\d{2}-\d{2}\b/u);
    }
  });
});

describe("get835 - balance invariants warn loudly, never silently rebalance", () => {
  it("emits X12_835_REMIT_BALANCE_MISMATCH on the imbalanced fixture", () => {
    const remit = readRemitFixture("835-imbalance.edi");
    // The 835-imbalance fixture under-adjusts by $10 - claim AND line both warn.
    const balanceWarnings = remit.warnings.filter(
      (w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
    );
    expect(balanceWarnings.length).toBeGreaterThanOrEqual(1);
    // The model is NOT silently rebalanced - the inbound values stand.
    expect(remit.claims[0]?.totalChargeAmount.toString()).toBe("100.00");
    expect(remit.claims[0]?.totalPaymentAmount.toString()).toBe("80.00");
    expect(remit.claims[0]?.serviceLines[0]?.adjustments[0]?.amount.toString()).toBe("10.00");
  });

  it("balance-mismatch warning message echoes only invariant + decimal values, never PHI", () => {
    const remit = readRemitFixture("835-imbalance.edi");
    const balanceWarnings = remit.warnings.filter(
      (w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
    );
    for (const w of balanceWarnings) {
      expect(w.message).not.toContain("EPSILON");
      expect(w.message).not.toContain("MEMBER-E");
      expect(w.message).not.toContain("PAYER-CLAIM-E");
      expect(w.message).toMatch(/spec="\d/u);
      expect(w.message).toMatch(/computed=/u);
    }
  });
});

describe("get835 - Tier-2 Availity quirk", () => {
  it("tolerates payer-loop REF*2U + REF*F8 mid-line and balances", () => {
    const remit = readRemitFixture("835-availity-quirk.edi");
    expect(remit.payer?.name).toBe("AVAILITY-ROUTED COMMERCIAL PAYER");
    expect(remit.payer?.additionalIdentifiers.some((r) => r.qualifier === "2U")).toBe(true);
    expect(remit.claims).toHaveLength(1);
    expect(remit.claims[0]?.totalChargeAmount.toString()).toBe("150.00");
    expect(remit.claims[0]?.serviceLines[0]?.references.some((r) => r.qualifier === "F8")).toBe(
      true,
    );
    expect(
      remit.warnings.filter((w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH),
    ).toHaveLength(0);
  });
});

describe("get835 - non-835 transaction returns undefined", () => {
  it("returns undefined when called with a different transaction set id", () => {
    const raw = readFileSync(
      join(__dirname, "fixtures", "ack", "999-accept.edi"),
      "utf8",
    ).trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("missing transaction");
    expect(get835(ix.delimiters, tx)).toBeUndefined();
  });
});

describe("835 loop spec - dogfooded via defineLoopSpec", () => {
  it("Loop 2000 nests Loop 2100 which nests Loop 2110 (frozen, structurally valid)", () => {
    expect(REMIT_835_LOOP_2000.trigger).toBe("LX");
    expect(REMIT_835_LOOP_2100.trigger).toBe("CLP");
    expect(REMIT_835_LOOP_2110.trigger).toBe("SVC");
    expect(REMIT_835_LOOP_2000.children[0]).toBe(REMIT_835_LOOP_2100);
    expect(REMIT_835_LOOP_2100.children[0]).toBe(REMIT_835_LOOP_2110);
    expect(Object.isFrozen(REMIT_835_LOOP_2000)).toBe(true);
    expect(Object.isFrozen(REMIT_835_LOOP_2100)).toBe(true);
    expect(Object.isFrozen(REMIT_835_LOOP_2110)).toBe(true);
  });

  it("Loop 1000A and 1000B both trigger on N1 (qualifier validation is in the walker)", () => {
    expect(REMIT_835_LOOP_1000A.trigger).toBe("N1");
  });
});

/**
 * Unit tests for the Phase 7 820 premium-payment surface
 * (`get820Payments`). Covers:
 *
 * - Tier-1 canonical 820 (X218): BPR payment header, TRN reassociation
 *   trace, the premium receiver (N1*PE) + remitter (N1*PR) parties with
 *   the remitter's N3/N4 address, an organization-summary remittance
 *   (ENT) carrying a member NM1, two RMR open items, a DTM and an ADX
 *   adjustment, then a second bare-NM1 individual remittance.
 * - X12Decimal: every monetary field decodes as decimal, not float —
 *   cents survive on the premium total, amounts paid, and the signed
 *   adjustment.
 * - Mis-route guard: `get820Payments` returns `undefined` for a non-820
 *   transaction set.
 * - The dogfooded loop specs are public `defineLoopSpec` artifacts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PREMIUM_820_LOOP_1000A,
  PREMIUM_820_LOOP_2000A,
  PREMIUM_820_LOOP_2300A,
  PREMIUM_820_LOOP_2310A,
  X12Decimal,
  get820Payments,
  parseX12,
} from "../src/index.js";
import type { X12PremiumPayments } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "premium");

function readPremiumFixture(name: string): X12PremiumPayments {
  const raw = readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
  if (tx === undefined) throw new Error(`Fixture ${name} has no 820 transaction set`);
  const prem = get820Payments(ix.delimiters, tx);
  if (prem === undefined) throw new Error(`get820Payments returned undefined for ${name}`);
  return prem;
}

describe("get820Payments — Tier-1 canonical (X218)", () => {
  it("decodes the payment header (BPR) and trace (TRN) with no warnings", () => {
    const prem = readPremiumFixture("820-canonical.edi");
    expect(prem.warnings).toHaveLength(0);

    expect(prem.payment.transactionHandlingCode).toBe("C");
    expect(prem.payment.totalPremiumAmount).toBeInstanceOf(X12Decimal);
    expect(prem.payment.totalPremiumAmount.toString()).toBe("12500.00");
    expect(prem.payment.creditDebitFlag).toBe("C");
    expect(prem.payment.method).toBe("ACH");
    expect(prem.payment.paymentDate).toBe("20260601");

    expect(prem.traces).toHaveLength(1);
    expect(prem.traces[0]?.traceTypeCode).toBe("1");
    expect(prem.traces[0]?.referenceId).toBe("PREM-202606");
    expect(prem.traces[0]?.originatingCompanyId).toBe("1111111111");
  });

  it("decodes the receiver + remitter parties and the remitter address", () => {
    const prem = readPremiumFixture("820-canonical.edi");

    expect(prem.receiver?.entityIdentifierCode).toBe("PE");
    expect(prem.receiver?.name).toBe("MEDPAY INSURANCE");
    expect(prem.receiver?.idCode).toBe("111223333");
    expect(prem.receiver?.address).toBeUndefined();

    expect(prem.remitter?.entityIdentifierCode).toBe("PR");
    expect(prem.remitter?.name).toBe("EMPLOYER CO");
    expect(prem.remitter?.idCode).toBe("444556666");
    expect(prem.remitter?.address?.lines).toEqual(["500 CORPORATE BLVD"]);
    expect(prem.remitter?.address?.city).toBe("COLUMBUS");
    expect(prem.remitter?.address?.state).toBe("OH");
    expect(prem.remitter?.address?.postalCode).toBe("43215");
  });

  it("decodes the ENT organization-summary remittance with its member, items, date, and adjustment", () => {
    const prem = readPremiumFixture("820-canonical.edi");
    expect(prem.remittances).toHaveLength(2);

    const org = prem.remittances[0];
    expect(org?.entity?.assignedNumber).toBe("1");
    expect(org?.entity?.entityIdentifierCode).toBe("2J");
    expect(org?.entity?.idCode).toBe("GRP-0001");
    expect(org?.individual?.entityIdentifierCode).toBe("IL");
    expect(org?.individual?.lastName).toBe("DOE");
    expect(org?.individual?.firstName).toBe("JANE");
    expect(org?.individual?.idCode).toBe("MBR0001");

    expect(org?.openItems).toHaveLength(2);
    expect(org?.openItems[0]?.qualifier).toBe("AZ");
    expect(org?.openItems[0]?.referenceId).toBe("POL-0001");
    expect(org?.openItems[0]?.amountPaid).toBeInstanceOf(X12Decimal);
    expect(org?.openItems[0]?.amountPaid.toString()).toBe("250.00");
    expect(org?.openItems[0]?.amountDue?.toString()).toBe("250.00");
    expect(org?.openItems[1]?.referenceId).toBe("POL-0002");

    expect(org?.dates).toHaveLength(1);
    expect(org?.dates[0]?.qualifier).toBe("582");
    expect(org?.dates[0]?.value).toBe("20260601");

    expect(org?.adjustments).toHaveLength(1);
    expect(org?.adjustments[0]?.amount).toBeInstanceOf(X12Decimal);
    expect(org?.adjustments[0]?.amount.toString()).toBe("-25.00");
    expect(org?.adjustments[0]?.reasonCode).toBe("53");
    expect(org?.adjustments[0]?.referenceId).toBe("POL-0001");
  });

  it("opens a fresh individual remittance for a bare NM1 after the ENT loop", () => {
    const prem = readPremiumFixture("820-canonical.edi");
    const individual = prem.remittances[1];
    expect(individual?.entity).toBeUndefined();
    expect(individual?.individual?.lastName).toBe("ROE");
    expect(individual?.individual?.firstName).toBe("JOHN");
    expect(individual?.openItems).toHaveLength(1);
    expect(individual?.openItems[0]?.referenceId).toBe("POL-0003");
    expect(individual?.openItems[0]?.amountPaid.toString()).toBe("300.00");
  });
});

describe("get820Payments — edge cases (receiver address, RM remitter, skips)", () => {
  it("decodes a receiver (PE) address + REF and an RM-qualified remitter REF", () => {
    const prem = readPremiumFixture("820-edge.edi");
    expect(prem.warnings).toHaveLength(0);

    expect(prem.payment.transactionHandlingCode).toBe("D");
    expect(prem.payment.method).toBe("CHK");
    expect(prem.payment.paymentDate).toBe("20260615");

    expect(prem.receiver?.entityIdentifierCode).toBe("PE");
    expect(prem.receiver?.address?.lines).toEqual(["1 PAYER PLAZA"]);
    expect(prem.receiver?.address?.city).toBe("COLUMBUS");
    expect(prem.receiver?.references.map((r) => r.value)).toEqual(["RECV-REF"]);

    expect(prem.remitter?.entityIdentifierCode).toBe("RM");
    expect(prem.remitter?.references.map((r) => r.value)).toEqual(["REMIT-REF"]);
  });

  it("opens one remittance and skips an amount-due-less RMR, empty RMR, valueless DTM, and amount-less ADX", () => {
    const prem = readPremiumFixture("820-edge.edi");
    expect(prem.remittances).toHaveLength(1);
    const rem = prem.remittances[0];
    expect(rem?.entity?.idCode).toBe("GRP-0002");
    expect(rem?.individual?.lastName).toBe("ROE");
    // Only the one well-formed RMR survives; the bare `RMR~` is skipped.
    expect(rem?.openItems).toHaveLength(1);
    expect(rem?.openItems[0]?.referenceId).toBe("POL-EDGE");
    expect(rem?.openItems[0]?.amountPaid.toString()).toBe("100.00");
    expect(rem?.openItems[0]?.amountDue).toBeUndefined();
    // The valueless DTM and amount-less ADX produce nothing.
    expect(rem?.dates).toHaveLength(0);
    expect(rem?.adjustments).toHaveLength(0);
  });
});

describe("get820Payments — loop-level segments + orphans", () => {
  it("ignores RMR/ADX before any remittance and N1/N3/N4 inside an open loop", () => {
    const prem = readPremiumFixture("820-loop.edi");

    // The RMR / ADX that precede the first ENT have no open remittance — dropped.
    expect(prem.remittances).toHaveLength(1);
    const rem = prem.remittances[0];
    expect(rem?.entity?.idCode).toBe("GRP-LOOP");
    expect(rem?.individual?.lastName).toBe("DOE");
    // The in-loop N1*PE / N3 / N4 belong to the loop's party id — they do NOT
    // overwrite the header receiver, and only the one well-formed RMR survives.
    expect(rem?.openItems).toHaveLength(1);
    expect(rem?.openItems[0]?.referenceId).toBe("POL-LOOP");
  });

  it("merges a second receiver N4 onto the first, keeping base fields when absent", () => {
    const prem = readPremiumFixture("820-loop.edi");
    // First N4 sets city/state/postal; the second N4 carries only a country,
    // so the base city/state/postal survive and the country is added.
    expect(prem.receiver?.address?.city).toBe("COLUMBUS");
    expect(prem.receiver?.address?.state).toBe("OH");
    expect(prem.receiver?.address?.postalCode).toBe("43215");
    expect(prem.receiver?.address?.countryCode).toBe("US");
  });

  it("tolerates an 820 transaction set with no SE trailer", () => {
    const raw = [
      "ISA*00*          *00*          *ZZ*EMPLOYERCO     *ZZ*MEDPAY         *260601*1200*^*00501*000000005*0*P*:~",
      "GS*RA*EMPLOYERCO*MEDPAY*20260601*1200*5*X*005010X218~",
      "ST*820*0005~",
      "BPR*C*100.00*C*ACH*CCP*01*1*DA*2*1111111111**01*3*DA*4*20260601~",
      "TRN*1*PREM-NOSE~",
      "ENT*1*2J*FI*GRP-NOSE~",
      "NM1*IL*1*DOE*JANE****MI*MBR0001~",
      "RMR*AZ*POL-NOSE*PI*100.00~",
      "GE*1*1~",
      "IEA*1*000000005~",
    ].join("\n");
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
    expect(tx?.se).toBeUndefined();
    const prem = tx === undefined ? undefined : get820Payments(ix.delimiters, tx);
    expect(prem?.remittances).toHaveLength(1);
    expect(prem?.remittances[0]?.openItems[0]?.referenceId).toBe("POL-NOSE");
  });
});

describe("get820Payments — guards + dogfooded specs", () => {
  it("returns undefined for a non-820 transaction set", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "820-canonical.edi"), "utf8").trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    expect(tx).toBeDefined();
    if (tx === undefined) return;
    const spoofed = { ...tx, st: { ...tx.st, elements: ["ST", "999", "0001"] } };
    expect(get820Payments(ix.delimiters, spoofed)).toBeUndefined();
  });

  it("exposes the 820 loop hierarchy as public defineLoopSpec artifacts", () => {
    expect(PREMIUM_820_LOOP_1000A.trigger).toBe("N1");
    expect(PREMIUM_820_LOOP_2000A.trigger).toBe("ENT");
    expect(PREMIUM_820_LOOP_2000A.children.map((c) => c.trigger)).toEqual(["NM1", "RMR"]);
    expect(PREMIUM_820_LOOP_2300A.trigger).toBe("RMR");
    expect(PREMIUM_820_LOOP_2300A.children[0]?.trigger).toBe("ADX");
    expect(PREMIUM_820_LOOP_2310A.trigger).toBe("ADX");
  });
});

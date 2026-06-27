/**
 * Property tests for 835 balance invariants. Synthesizes balanced and
 * deliberately-imbalanced single-claim single-line interchanges via a
 * minimal template, runs them through `get835`, and asserts the
 * `X12_835_REMIT_BALANCE_MISMATCH` warning fires iff the input is out of
 * balance — never silently rebalanced.
 *
 * The invariants exercised (per TR3 X221A1 §1.10.2 — see
 * `src/transactions/remit/balance.ts`):
 *
 * - Line: `SVC-02 === SVC-03 + Σ(line CAS)`
 * - Claim: `CLP-03 === CLP-04 + Σ(claim CAS + line CAS)`
 * - Top: `BPR-02 === Σ(CLP-04) - Σ(PLB amounts)` (PLB raw EDI sign)
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";

import { WARNING_CODES, get835, parseX12 } from "../../src/index.js";

/**
 * Synthesize a minimal 835 interchange with a single claim and single
 * service line at the supplied amounts. `cas` is the line-level CAS
 * adjustment (PR-1). Useful for both balanced and imbalanced shapes.
 */
function build835(
  charge: string,
  paid: string,
  patientResp: string,
  cas: string,
  bpr: string,
): string {
  return [
    "ISA*00*          *00*          *ZZ*PROP-PAYER     *ZZ*PROP-SUBMITTER *260627*1500*^*00501*000000099*0*P*:~",
    "GS*HP*PROP-PAYER*PROP-SUBMITTER*20260627*1500*99*X*005010X221A1~",
    "ST*835*0099~",
    `BPR*I*${bpr}*C*ACH*CCP*01*999000099*DA*000099*9000099999**01*888000088*DA*000088*20260627~`,
    "TRN*1*PROP-1*9000099999~",
    "N1*PR*PROPERTY TEST PAYER~",
    "N3*1 PROP WAY~",
    "N4*ANYTOWN*OH*44101~",
    "N1*PE*PROPERTY TEST PROVIDER~",
    "N3*2 PROP LN~",
    "N4*ANYTOWN*OH*44101~",
    "REF*TJ*999000099~",
    "LX*1~",
    `CLP*PROP-PT-001*1*${charge}*${paid}*${patientResp}*MC*PROP-PAYER-001*11*1~`,
    "NM1*QC*1*PROPLAST*PROPFIRST****MI*PROP-MEMBER~",
    "NM1*82*2*PROPERTY TEST PROVIDER*****XX*9999999999~",
    `SVC*HC:99213*${charge}*${paid}**1~`,
    "DTM*472*20260620~",
    `CAS*PR*1*${cas}~`,
    "REF*6R*PROP-LINE-001~",
    "SE*18*0099~",
    "GE*1*99~",
    "IEA*1*000000099~",
  ].join("\n");
}

/** Arbitrary positive integer cents (0..100000) as a 2-decimal string. */
const arbitraryDollars = fc
  .integer({ min: 0, max: 100_000 })
  .map((cents) => `${(cents / 100).toFixed(2)}`);

describe("835 balance — balanced fixtures produce no balance warning", () => {
  it("balanced single-line claim parses with zero balance warnings", () => {
    fc.assert(
      fc.property(arbitraryDollars, arbitraryDollars, (paidStr, casStr) => {
        const paid = parseFloat(paidStr);
        const cas = parseFloat(casStr);
        const chargeFloat = paid + cas;
        const charge = chargeFloat.toFixed(2);
        const raw = build835(charge, paidStr, casStr, casStr, paidStr);
        const ix = parseX12(raw);
        const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
        if (tx === undefined) return;
        const remit = get835(ix.delimiters, tx);
        if (remit === undefined) return;
        const balanceWarnings = remit.warnings.filter(
          (w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
        );
        expect(balanceWarnings).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});

describe("835 balance — imbalanced fixtures warn and never rebalance", () => {
  it("a deliberate $1 line under-adjustment produces a balance warning AND preserves the inbound amounts verbatim", () => {
    fc.assert(
      fc.property(arbitraryDollars, (paidStr) => {
        const paid = parseFloat(paidStr);
        const cas = 10.0;
        const charge = paid + cas + 1.0; // off by 1.00
        const raw = build835(charge.toFixed(2), paidStr, "0.00", "10.00", paidStr);
        const ix = parseX12(raw);
        const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
        if (tx === undefined) return;
        const remit = get835(ix.delimiters, tx);
        if (remit === undefined) return;
        const balanceWarnings = remit.warnings.filter(
          (w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
        );
        expect(balanceWarnings.length).toBeGreaterThan(0);
        // Verbatim inbound amounts preserved — never silently rebalanced.
        expect(remit.claims[0]?.totalChargeAmount.toString()).toBe(charge.toFixed(2));
        expect(remit.claims[0]?.totalPaymentAmount.toString()).toBe(paidStr);
        expect(remit.claims[0]?.serviceLines[0]?.adjustments[0]?.amount.toString()).toBe("10.00");
      }),
      { numRuns: 50 },
    );
  });
});

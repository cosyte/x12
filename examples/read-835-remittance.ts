/**
 * Read the money out of an 835 remittance advice and check that it balances.
 *
 * `examples/data/835-remittance.edi` is synthetic: one payment covering two claims, with fabricated
 * payer, provider, patients and amounts. The example prints the payment, each claim's
 * charged/paid/patient-owes split and the adjustment reasons behind it, then checks the arithmetic
 * with `X12Decimal`, which is exact: no amount is ever read through a float.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/read-835-remittance.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { get835, parseX12, X12Decimal } from "@cosyte/x12";

const ix = parseX12(readFileSync(new URL("data/835-remittance.edi", import.meta.url), "utf8"));
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
if (tx === undefined) throw new Error("no 835 in this interchange");
const remit = get835(ix.delimiters, tx);
if (remit === undefined) throw new Error("not an 835");

const payment = remit.payment.totalActualPayment;
console.log(
  `Payment ${String(payment)} by ${String(remit.payment.method)},`,
  `trace ${String(remit.traces[0]?.referenceId)}`,
);

let paidAcrossClaims = X12Decimal.ZERO;
for (const claim of remit.claims) {
  console.log(
    `Claim ${claim.patientControlNumber}: charged ${String(claim.totalChargeAmount)},`,
    `paid ${String(claim.totalPaymentAmount)},`,
    `patient owes ${String(claim.patientResponsibilityAmount)}`,
  );
  // The group code says who owes the difference: PR is the patient, CO the provider's contract.
  let adjusted = X12Decimal.ZERO;
  for (const line of claim.serviceLines) {
    for (const a of line.adjustments) {
      console.log(
        `  ${a.groupCode} ${a.reasonCode} ${String(a.amount)}: ${String(a.reasonDescription)}`,
      );
      if (a.amount !== undefined) adjusted = adjusted.add(a.amount);
    }
  }
  // Charged minus paid is exactly what the adjustments explain.
  const { totalChargeAmount: charged, totalPaymentAmount: paid } = claim;
  assert.ok(charged !== undefined && paid !== undefined);
  assert.ok(charged.subtract(paid).equals(adjusted), `claim ${claim.patientControlNumber}`);
  paidAcrossClaims = paidAcrossClaims.add(paid);
}
console.log(`Paid across claims: ${paidAcrossClaims.toString()}`);
console.log("Warnings:", ix.warnings.length + remit.warnings.length);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(payment?.toString(), "240.00");
assert.ok(payment.equals(paidAcrossClaims));
assert.deepEqual(
  remit.claims.map((c) => [c.patientControlNumber, c.patientResponsibilityAmount?.toString()]),
  [
    ["PT-A", "10.00"],
    ["PT-B", "20.00"],
  ],
);
assert.deepEqual(
  remit.claims[0]?.serviceLines[0]?.adjustments.map((a) => [a.groupCode, a.reasonCode]),
  [
    ["CO", "45"],
    ["PR", "2"],
  ],
);
assert.equal(ix.warnings.length + remit.warnings.length, 0);

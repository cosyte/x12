/**
 * Build an 820 premium payment, read it back the way the payer will, and reconcile the deposit.
 *
 * A plan sponsor pays its group premium with one deposit and an 820 that says what the money
 * covers: a remittance per member, each with the policy it was paid against. `build820` writes the
 * amounts as given and the 820 guide sets no balance equation, so `get820Payments` does not check
 * one: the example sums the open items with `X12Decimal`, which is exact, and compares them with
 * BPR-02 itself. Every value is synthetic, and nothing is sent anywhere. The example prints amounts,
 * codes and counts; a member's id, a policy number and the serialized 820 are read and asserted
 * on, never printed.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/build-820-premium-payment.ts
 */

import assert from "node:assert/strict";

import {
  build820,
  get820Payments,
  parseX12,
  serializeX12,
  X12Decimal,
  type Build820Spec,
} from "@cosyte/x12";

/** An exact decimal from a literal, refusing one that is not. */
function money(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error("not a decimal");
  return d;
}

const spec: Build820Spec = {
  envelope: {
    senderId: "EMPLOYERCO",
    receiverId: "MEDPAY",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: money("375.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentFormatCode: "CCP",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "PREM-202606", originatingCompanyId: "1512345678" }],
  receiver: {
    entityIdentifierCode: "PE",
    name: "MEDPAY INSURANCE",
    idQualifier: "FI",
    idCode: "111223333",
  },
  remitter: {
    entityIdentifierCode: "RM",
    name: "EMPLOYER CO",
    idQualifier: "FI",
    idCode: "444556666",
  },
  remittances: [
    {
      individual: {
        entityIdentifierCode: "IL",
        lastName: "DOE",
        firstName: "JANE",
        idQualifier: "ZZ",
        idCode: "MBR0001",
      },
      openItems: [
        {
          qualifier: "AZ",
          referenceId: "POL-0001",
          amountPaid: money("250.00"),
          amountDue: money("250.00"),
        },
      ],
    },
    {
      individual: {
        entityIdentifierCode: "IL",
        lastName: "ROE",
        firstName: "JOHN",
        idQualifier: "ZZ",
        idCode: "MBR0002",
      },
      openItems: [
        {
          qualifier: "AZ",
          referenceId: "POL-0002",
          amountPaid: money("125.00"),
          amountDue: money("150.00"),
        },
      ],
      // The sponsor paid 25.00 less than was due on this policy, and says why.
      adjustments: [{ amount: money("-25.00"), reasonCode: "52" }],
    },
  ],
};

const wire = serializeX12(build820(spec));
// The serialized 820 carries each member's name and id, so the example prints its segment ids only.
const segmentIds = wire
  .split("~")
  .filter(Boolean)
  .map((segment) => segment.split("*")[0]);
console.log("Serialized 820 segments:", segmentIds.join(" "));

const ix = parseX12(wire);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
if (tx === undefined) throw new Error("no 820 in this interchange");
const premium = get820Payments(ix.delimiters, tx);
if (premium === undefined) throw new Error("not an 820");

const deposit = premium.payment.totalPremiumAmount;
console.log(
  `Deposit ${String(deposit)} by ${String(premium.payment.method)},`,
  `${String(premium.remittances.length)} member remittance(s)`,
);

// Post each amount to its policy, and sum them exactly. An amount that did not decode makes the
// total unknown rather than smaller, so such a payment goes to a person instead of being posted.
let paid: X12Decimal | undefined = X12Decimal.ZERO;
for (const [index, remittance] of premium.remittances.entries()) {
  for (const item of remittance.openItems) {
    console.log(
      `  Member ${String(index + 1)}:`,
      `paid ${String(item.amountPaid)} of ${String(item.amountDue)} due`,
    );
    paid = item.amountPaid === undefined ? undefined : paid?.add(item.amountPaid);
  }
}
const balances = paid !== undefined && deposit !== undefined && paid.equals(deposit);
console.log(`Open items sum to ${String(paid)}: ${balances ? "matches" : "does not match"} BPR-02`);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(ix.groups[0]?.transactions[0]?.st.elements[3], "005010X218");
assert.equal(deposit?.toString(), "375.00");
assert.equal(segmentIds[0], "ISA");
// The trace, the parties and each member's id and policy, all synthetic.
assert.equal(premium.traces[0]?.referenceId, "PREM-202606");
assert.equal(premium.receiver?.name, "MEDPAY INSURANCE");
assert.equal(premium.remitter?.name, "EMPLOYER CO");
assert.deepEqual(
  premium.remittances.map((r) => [r.individual?.idCode, r.openItems[0]?.referenceId]),
  [
    ["MBR0001", "POL-0001"],
    ["MBR0002", "POL-0002"],
  ],
);
assert.equal(premium.remittances[1]?.adjustments[0]?.amount.toString(), "-25.00");
assert.equal(paid?.toString(), "375.00");
assert.ok(balances);
assert.equal(ix.warnings.length + premium.warnings.length, 0);

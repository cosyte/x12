/**
 * Build an 834 enrollment roster, then read it the way an enrollment system will: the header, then
 * one member at a time with the maintenance type that says add, change or terminate.
 *
 * `build834` writes the maintenance type as given and refuses one outside the bundled list.
 * `get834Header` reads the sponsor and payer; `get834Enrollments` is an async iterable that yields
 * one decoded member per INS loop. The verbatim INS-03 code is always on the model and the
 * description sits beside it, so an action is taken on the code. Every value is synthetic, and
 * nothing is sent anywhere.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/read-834-enrollment.ts
 */

import assert from "node:assert/strict";

import {
  build834,
  get834Enrollments,
  get834Header,
  parseX12,
  serializeX12,
  X12Decimal,
  type Build834Spec,
} from "@cosyte/x12";

const premium = X12Decimal.fromString("125.00");
if (premium === undefined) throw new Error("not a decimal");

const spec: Build834Spec = {
  envelope: {
    senderId: "EMPLOYERCO",
    receiverId: "MEDPAY",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  header: {
    transactionSetPurposeCode: "00",
    referenceId: "ENR-202606",
    date: "20260601",
    sponsor: {
      entityIdentifierCode: "P5",
      name: "EMPLOYER CO",
      idQualifier: "FI",
      idCode: "444556666",
    },
    payer: {
      entityIdentifierCode: "IN",
      name: "MEDPAY INSURANCE",
      idQualifier: "FI",
      idCode: "111223333",
    },
  },
  members: [
    {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021", // addition
      benefitStatusCode: "A",
      member: { lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
      references: [{ qualifier: "0F", value: "MBR0001" }],
      healthCoverages: [
        {
          maintenanceTypeCode: "021",
          insuranceLineCode: "HLT",
          planCoverageDescription: "GOLD PPO",
          coverageLevelCode: "FAM",
          dates: [{ qualifier: "348", value: "20260101" }],
          amounts: [{ qualifier: "P3", amount: premium }],
        },
      ],
    },
    {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "024", // cancellation or termination
      benefitStatusCode: "A",
      member: { lastName: "ROE", firstName: "JOHN", idQualifier: "MI", idCode: "MBR0002" },
      references: [{ qualifier: "0F", value: "MBR0002" }],
      healthCoverages: [
        {
          maintenanceTypeCode: "024",
          insuranceLineCode: "DEN",
          dates: [{ qualifier: "349", value: "20260531" }],
        },
      ],
    },
  ],
};

const ix = parseX12(serializeX12(build834(spec)));
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
if (tx === undefined) throw new Error("no 834 in this interchange");

const header = get834Header(ix.delimiters, tx);
console.log(
  `Roster ${String(header?.referenceId)} from ${String(header?.sponsor?.name)}`,
  `for ${String(header?.payer?.name)}`,
);

// One member at a time. Act on the verbatim code, never on the description, and route a member
// whose code did not resolve (it carries a warning of its own) to a person.
const actions: [string | undefined, string][] = [];
for await (const enrollment of get834Enrollments(ix.delimiters, tx)) {
  const code = enrollment.maintenanceTypeCode;
  let action = "review";
  if (enrollment.warnings.length === 0 && code === "021") action = "add";
  if (enrollment.warnings.length === 0 && code === "024") action = "terminate";
  actions.push([enrollment.member?.idCode, action]);
  console.log(
    `  ${String(enrollment.member?.idCode)}: INS-03 ${String(code)}`,
    `(${String(enrollment.maintenanceTypeDescription)}) -> ${action},`,
    `coverage ${String(enrollment.healthCoverages[0]?.insuranceLineCode)}`,
  );
}

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(ix.groups[0]?.transactions[0]?.st.elements[3], "005010X220A1");
assert.equal(header?.sponsor?.name, "EMPLOYER CO");
assert.deepEqual(actions, [
  ["MBR0001", "add"],
  ["MBR0002", "terminate"],
]);
assert.equal(ix.warnings.length, 0);

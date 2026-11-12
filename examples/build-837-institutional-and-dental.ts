/**
 * Build an institutional (837I) and a dental (837D) claim, and read each back with the one 837
 * reader.
 *
 * `build837I` and `build837D` take the same `Build837Spec` as `build837P`; only the service lines
 * differ. An institutional line is written as SV2, keyed by its revenue code, and a dental line as
 * SV3 with its teeth as TOO segments after it. `get837Claims` decides the variant from the guide the
 * document declares, and each service line is a union on `variant`, so the example checks the
 * variant before it reads the variant's own fields. Every value is synthetic, and nothing is sent
 * anywhere.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/build-837-institutional-and-dental.ts
 */

import assert from "node:assert/strict";

import {
  build837D,
  build837I,
  get837Claims,
  parseX12,
  serializeX12,
  X12Decimal,
  type Build837ServiceLineSpec,
  type Build837Spec,
  type X12_837Submission,
  type X12Interchange,
} from "@cosyte/x12";

/** An exact decimal from a literal, refusing one that is not. */
function money(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error("not a decimal");
  return d;
}

/** One claim from one billing provider, its total the charge of its one service line. */
function claimSpec(provider: string, line: Build837ServiceLineSpec): Build837Spec {
  return {
    envelope: {
      senderId: "SUBMITTER",
      receiverId: "RECEIVER",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      groupControlNumber: "1",
      transactionSetControlNumber: "0001",
    },
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
          name: provider,
          idQualifier: "XX",
          idCode: "1234567890",
        },
        subscribers: [
          {
            info: {
              payerResponsibilityCode: "P",
              individualRelationshipCode: "18",
              claimFilingIndicator: "CI",
            },
            subscriber: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              name: "DOE",
              firstName: "JANE",
              idQualifier: "MI",
              idCode: "MBR0001",
            },
            payer: {
              entityIdentifierCode: "PR",
              entityTypeQualifier: "2",
              name: "PAYER ONE",
              idQualifier: "PI",
              idCode: "PAYER01",
            },
            claims: [{ claimId: "PT-ACCT-002", totalCharge: line.charge, serviceLines: [line] }],
          },
        ],
      },
    ],
  };
}

/** Serialize, parse the bytes back, and read the one 837 they hold. */
function readBack(built: X12Interchange): X12_837Submission {
  const ix = parseX12(serializeX12(built));
  const tx = ix.groups[0]?.transactions[0];
  const submission = tx ? get837Claims(ix.delimiters, tx) : undefined;
  if (submission === undefined) throw new Error("not an 837");
  return submission;
}

// An institutional claim: one room and board day, keyed by revenue code 0120.
const institutional = build837I(
  claimSpec("BILLING HOSPITAL INC", {
    variant: "I",
    revenueCode: "0120",
    charge: money("1500.00"),
    unitOfMeasure: "DA",
    units: money("1"),
  }),
);
const inst = readBack(institutional);
const room = inst.claims[0]?.serviceLines[0];
console.log(
  `837${inst.variant} (${String(inst.implementationConventionReference)}):`,
  `line variant ${String(room?.variant)}, charge ${String(room?.charge)}`,
);
// Check the variant first, so the field checks below can never be skipped by the narrowing.
assert.equal(room?.variant, "I");
if (room.variant === "I") {
  console.log(`  revenue code ${String(room.revenueCode)}`);
  assert.equal(room.revenueCode, "0120");
}

// A dental claim: one CDT procedure on tooth 14, occlusal surface.
const dental = build837D(
  claimSpec("BILLING DENTAL GROUP", {
    variant: "D",
    procedureQualifier: "AD",
    procedureCode: "D2391",
    charge: money("180.00"),
    units: money("1"),
    placeOfServiceCode: "11",
    toothInformation: [{ qualifier: "JP", toothCode: "14", surfaces: ["O"] }],
  }),
);
const dent = readBack(dental);
const tooth = dent.claims[0]?.serviceLines[0];
console.log(
  `837${dent.variant} (${String(dent.implementationConventionReference)}):`,
  `line variant ${String(tooth?.variant)}, charge ${String(tooth?.charge)}`,
);
assert.equal(tooth?.variant, "D");
if (tooth.variant === "D") {
  const toothInfo = tooth.toothInformation[0];
  console.log(
    `  procedure ${String(tooth.procedureCode)} on tooth ${String(toothInfo?.toothCode)},`,
    `surfaces ${String(toothInfo?.surfaces.join(","))}`,
  );
  assert.equal(tooth.procedureCode, "D2391");
  assert.equal(toothInfo?.toothCode, "14");
  assert.deepEqual(toothInfo.surfaces, ["O"]);
}

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(institutional.groups[0]?.transactions[0]?.st.elements[3], "005010X223A3");
assert.equal(dental.groups[0]?.transactions[0]?.st.elements[3], "005010X224A2");
assert.equal(inst.variant, "I");
assert.equal(dent.variant, "D");
assert.equal(room.charge?.toString(), "1500.00");
assert.equal(tooth.charge?.toString(), "180.00");
assert.equal(inst.warnings.length + dent.warnings.length, 0);

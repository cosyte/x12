/**
 * Build a 271 eligibility response that echoes the inquiry's trace, serialize it, and read it back.
 *
 * `build271` computes the HL hierarchy (payer, provider, subscriber) from a typed spec and refuses a
 * structurally impossible one. The 271 must echo the 270's TRN-02 byte for byte so the provider can
 * match your answer to their question; reading the serialized bytes back proves it did. It never
 * sends anything and never touches the filesystem. Every value here is synthetic.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/build-271-response.ts
 */

import assert from "node:assert/strict";

import {
  build271,
  get271Eligibility,
  parseX12,
  serializeX12,
  X12Decimal,
  type Build271Spec,
} from "@cosyte/x12";

/** The trace the provider put in its 270 (TRN-02): the 271 must carry it back unchanged. */
const traceFromThe270 = "ELIG-0001";

const deductible = X12Decimal.fromString("1000.00");
if (deductible === undefined) throw new Error("not a decimal");

const spec: Build271Spec = {
  envelope: {
    senderId: "MEDPAY",
    receiverId: "PROVIDER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  informationSources: [
    {
      entity: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        name: "MEDPAY INSURANCE",
        idQualifier: "PI",
        idCode: "00123",
      },
      receivers: [
        {
          entity: {
            entityIdentifierCode: "1P",
            entityTypeQualifier: "2",
            name: "ANYTOWN CLINIC",
            idQualifier: "XX",
            idCode: "1234567890",
          },
          subscribers: [
            {
              traces: [{ traceTypeCode: "2", referenceId: traceFromThe270 }],
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastName: "DOE",
                firstName: "JANE",
                idQualifier: "MI",
                idCode: "MBR0001",
              },
              // Active coverage (EB-01 "1"), individual, health benefit plan coverage (30).
              benefits: [
                {
                  eligibilityCode: "1",
                  coverageLevelCode: "IND",
                  serviceTypeCodes: [{ code: "30" }],
                  monetaryAmount: deductible,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const wire = serializeX12(build271(spec));
console.log("Serialized 271, one segment per line:");
console.log(wire.split("~").filter(Boolean).join("~\n") + "~");

const ix = parseX12(wire);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
if (tx === undefined) throw new Error("no 271 in this interchange");
const response = get271Eligibility(ix.delimiters, tx);
if (response === undefined) throw new Error("not a 271");

const subscriber = response.subscribers[0];
const benefit = subscriber?.benefits[0];
console.log("Trace echoed:", subscriber?.traces[0]?.referenceId);
console.log(
  "Benefit:",
  benefit?.eligibilityCode,
  benefit?.coverageLevelCode,
  String(benefit?.monetaryAmount),
);
console.log("Payer rejections (AAA):", response.aaaConditions.length);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(subscriber?.traces[0]?.referenceId, traceFromThe270);
assert.equal(subscriber?.name?.lastName, "DOE");
assert.equal(benefit?.eligibilityCode, "1");
assert.equal(benefit?.monetaryAmount?.toString(), "1000.00");
assert.equal(response.aaaConditions.length, 0);
assert.equal(ix.warnings.length, 0);

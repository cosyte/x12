/**
 * Read a 270 eligibility inquiry, then build the 271 response that echoes its trace, serialize it,
 * and read it back.
 *
 * The provider's 270 is built here with `build270` and read with `get270Inquiry`. `build271`
 * computes the HL hierarchy (payer, provider, subscriber) from a typed spec and refuses a
 * structurally impossible one. The 271 must echo the 270's TRN-02 byte for byte so the provider can
 * match your answer to their question; reading the serialized bytes back proves it did. It never
 * sends anything and never touches the filesystem. Every value here is synthetic, and the example
 * still prints only codes, amounts, counts and booleans: the member's name and id, the trace and the
 * serialized 271 are read and asserted on, never printed.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/build-271-response.ts
 */

import assert from "node:assert/strict";

import {
  build270,
  build271,
  get270Inquiry,
  get271Eligibility,
  parseX12,
  serializeX12,
  X12Decimal,
  type Build271Spec,
} from "@cosyte/x12";

// The provider asks whether a member has coverage under service type 30.
const inquiryBytes = serializeX12(
  build270({
    envelope: {
      senderId: "PROVIDER",
      receiverId: "MEDPAY",
      interchangeDate: "260601",
      interchangeTime: "1155",
      interchangeControlNumber: "000000001",
      groupControlNumber: "1",
      transactionSetControlNumber: "0001",
    },
    header: { referenceId: "REQ-0001" },
    informationSources: [
      {
        name: {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          lastNameOrOrganizationName: "MEDPAY INSURANCE",
          idQualifier: "PI",
          idCode: "00123",
        },
        receivers: [
          {
            name: {
              entityIdentifierCode: "1P",
              entityTypeQualifier: "2",
              lastNameOrOrganizationName: "ANYTOWN CLINIC",
              idQualifier: "XX",
              idCode: "1234567890",
            },
            subscribers: [
              {
                traces: [{ traceTypeCode: "1", referenceId: "ELIG-0001" }],
                name: {
                  entityIdentifierCode: "IL",
                  entityTypeQualifier: "1",
                  lastNameOrOrganizationName: "DOE",
                  firstName: "JANE",
                  idQualifier: "MI",
                  idCode: "MBR0001",
                },
                inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
              },
            ],
          },
        ],
      },
    ],
  }),
);

// The payer reads the question.
const inquiryIx = parseX12(inquiryBytes);
const inquiryTx = inquiryIx.groups[0]?.transactions[0];
const inquiry = inquiryTx ? get270Inquiry(inquiryIx.delimiters, inquiryTx) : undefined;
if (inquiry === undefined) throw new Error("not a 270");
const asked = inquiry.informationSources[0]?.receivers[0]?.subscribers[0];

/** The trace the provider put in its 270 (TRN-02): the 271 must carry it back unchanged. */
const traceFromThe270 = asked?.traces[0]?.referenceId;
if (traceFromThe270 === undefined) throw new Error("the 270 carried no trace");
console.log(
  "270 asks about service type",
  asked?.inquiries[0]?.serviceTypeCodes[0]?.code,
  "with a trace:",
  traceFromThe270.length > 0,
);

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
              // Active coverage (EB-01 "1"), individual, service type 30.
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
// The serialized 271 carries the member's name and id, so the example prints its segment ids only.
const segmentIds = wire
  .split("~")
  .filter(Boolean)
  .map((segment) => segment.split("*")[0]);
console.log("Serialized 271 segments:", segmentIds.join(" "));

const ix = parseX12(wire);
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
if (tx === undefined) throw new Error("no 271 in this interchange");
const response = get271Eligibility(ix.delimiters, tx);
if (response === undefined) throw new Error("not a 271");

const subscriber = response.subscribers[0];
const benefit = subscriber?.benefits[0];
console.log("Trace echoed:", subscriber?.traces[0]?.referenceId === traceFromThe270);
console.log(
  "Benefit:",
  benefit?.eligibilityCode,
  benefit?.coverageLevelCode,
  String(benefit?.monetaryAmount),
);
console.log("Payer rejections (AAA):", response.aaaConditions.length);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
// The trace and the member's name and id, all synthetic.
assert.equal(traceFromThe270, "ELIG-0001");
assert.equal(asked?.name?.idCode, "MBR0001");
assert.equal(inquiry.warnings.length, 0);
assert.equal(subscriber?.traces[0]?.referenceId, traceFromThe270);
assert.equal(subscriber?.name?.lastName, "DOE");
assert.equal(benefit?.eligibilityCode, "1");
assert.equal(benefit?.monetaryAmount?.toString(), "1000.00");
assert.equal(response.aaaConditions.length, 0);
assert.deepEqual(segmentIds.slice(0, 3), ["ISA", "GS", "ST"]);
assert.equal(ix.warnings.length, 0);

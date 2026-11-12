/**
 * Ask for a claim's status with a 276, answer it with a 277, and route a 277CA's rejections.
 *
 * The provider builds a 276 with `build276`; the payer reads it with `get276StatusInquiry` and
 * answers with `build277`, echoing the 276's TRN-02 so the provider can match the answer to the
 * question. A clearinghouse acknowledges a claim batch with a 277CA from `build277CA`, and the
 * provider reads it with `get277CADisposition` and sends every claim whose status category is not
 * A1 or A2 back for rework. Every value is synthetic, and nothing is sent anywhere. The example
 * prints status codes, counts and booleans; a claim number and a trace identify a patient's claim,
 * so it reads and asserts on them and never prints them.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/route-claim-status.ts
 */

import assert from "node:assert/strict";

import {
  build276,
  build277,
  build277CA,
  get276StatusInquiry,
  get277CADisposition,
  get277Status,
  parseX12,
  serializeX12,
  X12Decimal,
  type Build277Spec,
  type Build277SubscriberSpec,
  type X12Interchange,
  type X12TransactionSet,
} from "@cosyte/x12";

/** An exact decimal from a literal, refusing one that is not. */
function money(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error("not a decimal");
  return d;
}

/** Serialize, parse the bytes back, and hand over the one transaction set they hold. */
function overTheWire(built: X12Interchange): { ix: X12Interchange; tx: X12TransactionSet } {
  const ix = parseX12(serializeX12(built));
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("no transaction set in this interchange");
  return { ix, tx };
}

const envelope = {
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
};

// 1. The provider asks about one claim. TRN-02 is the trace the answer has to carry back.
const asked = overTheWire(
  build276({
    envelope: { ...envelope, senderId: "ANYTOWNCLINIC", receiverId: "MEDPAY" },
    header: { referenceId: "STATUS-0001" },
    informationSources: [
      {
        name: {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          lastNameOrOrganizationName: "MEDPAY INSURANCE",
          idQualifier: "PI",
          idCode: "PAYER01",
        },
        receivers: [
          {
            name: {
              entityIdentifierCode: "41",
              entityTypeQualifier: "2",
              lastNameOrOrganizationName: "ANYTOWN CLINIC",
              idQualifier: "46",
              idCode: "RECVR01",
            },
            providers: [
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
                    name: {
                      entityIdentifierCode: "IL",
                      entityTypeQualifier: "1",
                      lastNameOrOrganizationName: "DOE",
                      firstName: "JANE",
                      idQualifier: "MI",
                      idCode: "MBR0001",
                    },
                    claims: [
                      {
                        trace: { traceTypeCode: "1", referenceId: "STATUS-TRACE-0001" },
                        references: [{ qualifier: "1K", value: "PCN0001" }],
                        amounts: [{ qualifier: "T3", amount: money("150.00") }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }),
);

// 2. The payer reads the question.
const inquiry = get276StatusInquiry(asked.ix.delimiters, asked.tx);
if (inquiry === undefined) throw new Error("not a 276");
const question =
  inquiry.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0]?.claims[0];
const traceToEcho = question?.trace?.referenceId;
if (traceToEcho === undefined) throw new Error("the 276 carried no trace");
console.log(
  `276 asks about ${String(question?.references.length)} claim reference(s), with a trace:`,
  traceToEcho.length > 0,
);

// 3. The payer answers with a 277 that echoes the trace, with category A2 and status 20.
/** The payer, the receiver named, and the one provider, over the subscribers given. */
function statusSources(
  receiverName: string,
  subscribers: readonly Build277SubscriberSpec[],
): Build277Spec["informationSources"] {
  return [
    {
      entity: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        name: "MEDPAY INSURANCE",
        idQualifier: "PI",
        idCode: "PAYER01",
      },
      receivers: [
        {
          entity: {
            entityIdentifierCode: "41",
            entityTypeQualifier: "2",
            name: receiverName,
            idQualifier: "46",
            idCode: "RECVR01",
          },
          providers: [
            {
              entity: {
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                name: "ANYTOWN CLINIC",
                idQualifier: "XX",
                idCode: "1234567890",
              },
              subscribers,
            },
          ],
        },
      ],
    },
  ];
}

const answered = overTheWire(
  build277({
    envelope: { ...envelope, senderId: "MEDPAY", receiverId: "ANYTOWNCLINIC" },
    informationSources: statusSources("ANYTOWN CLINIC", [
      {
        member: {
          entityIdentifierCode: "IL",
          entityTypeQualifier: "1",
          lastName: "DOE",
          firstName: "JANE",
          idQualifier: "MI",
          idCode: "MBR0001",
        },
        claims: [
          {
            trace: { traceTypeCode: "2", referenceId: traceToEcho },
            statuses: [
              {
                statuses: [{ categoryCode: "A2", statusCode: "20", entityCode: "PR" }],
                statusEffectiveDate: "20260601",
                totalChargeAmount: money("150.00"),
              },
            ],
            references: [{ qualifier: "1K", value: "PCN0001" }],
          },
        ],
      },
    ]),
  }),
);
const status = get277Status(answered.ix.delimiters, answered.tx);
if (status === undefined) throw new Error("not a 277");
const answer = status.claims[0];
const triple = answer?.statuses[0]?.statuses[0];
console.log(
  `277 echoes the trace: ${String(answer?.traces[0]?.referenceId === traceToEcho)},`,
  `status ${String(triple?.categoryCode)}/${String(triple?.statusCode)}`,
);

// 4. A 277CA for a batch of two claims: one accepted (A1), one rejected (A7, invalid information).
const acknowledged = overTheWire(
  build277CA({
    envelope: { ...envelope, senderId: "CLEARINGHOUSE", receiverId: "ANYTOWNCLINIC" },
    informationSources: statusSources("CLEARINGHOUSE INC", [
      {
        member: {
          entityIdentifierCode: "IL",
          entityTypeQualifier: "1",
          lastName: "DOE",
          firstName: "JANE",
          idQualifier: "MI",
          idCode: "MBR0001",
        },
        claims: [
          {
            trace: { traceTypeCode: "2", referenceId: "CLAIM-TRACE-0001" },
            statuses: [{ statuses: [{ categoryCode: "A1", statusCode: "19", entityCode: "PR" }] }],
          },
          {
            trace: { traceTypeCode: "2", referenceId: "CLAIM-TRACE-0002" },
            statuses: [{ statuses: [{ categoryCode: "A7", statusCode: "21", entityCode: "PR" }] }],
          },
        ],
      },
    ]),
  }),
);
const ack = get277CADisposition(acknowledged.ix.delimiters, acknowledged.tx);
if (ack === undefined) throw new Error("not a 277CA");
const rework: string[] = [];
for (const claim of ack.claims) {
  const stc = claim.statuses[0]?.statuses[0];
  // A1 and A2 mean accepted into adjudication; anything else goes back for rework.
  if (stc !== undefined && stc.categoryCode !== "A1" && stc.categoryCode !== "A2") {
    rework.push(claim.traces[0]?.referenceId ?? "(no trace)");
    console.log(
      `277CA rejects claim ${String(rework.length)}: ${stc.categoryCode}/${stc.statusCode}`,
    );
  }
}

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
// The traces and the claim number are synthetic.
assert.equal(traceToEcho, "STATUS-TRACE-0001");
assert.equal(question?.references[0]?.value, "PCN0001");
assert.equal(question?.amounts[0]?.amount.toString(), "150.00");
assert.equal(status.transactionType, "claim-status");
assert.equal(answer?.traces[0]?.referenceId, traceToEcho);
assert.equal(triple?.categoryCode, "A2");
assert.equal(triple?.statusCode, "20");
assert.equal(ack.transactionType, "claim-acknowledgment");
assert.deepEqual(rework, ["CLAIM-TRACE-0002"]);
assert.equal(inquiry.warnings.length + status.warnings.length + ack.warnings.length, 0);

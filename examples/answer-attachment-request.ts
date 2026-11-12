/**
 * Read a 277 request for additional information, answer it with a 275 attachment, and read the
 * 275 back the way the payer will.
 *
 * The payer's 277 (`006020X313`, built here with `build277RequestForAdditionalInformation`) asks
 * for a document about one claim, naming it by a LOINC code, and carries the trace the answer has
 * to echo. `build275` writes the answer with the document's octets in a BDS segment and sets BDS-02
 * to their true count; `get275Attachments` checks that count on the way back in. The attachment
 * refuses to print its octets, so a log line carries its size only. An attachment is octets, so the
 * 275 is written as latin1 and read back from a Buffer. Every value is synthetic, the attachment
 * included, and nothing is sent anywhere. The example prints codes, lengths and booleans; the claim
 * number and the trace identify a patient's claim, so it reads and asserts on them, never prints.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/answer-attachment-request.ts
 */

import assert from "node:assert/strict";

import {
  build275,
  build277RequestForAdditionalInformation,
  get275Attachments,
  get277RequestForAdditionalInformation,
  parseX12,
  serializeX12,
  X12Decimal,
} from "@cosyte/x12";

const charge = X12Decimal.fromString("150.00");
if (charge === undefined) throw new Error("not a decimal");

// 1. The payer asks for a document about claim PCN0001.
const requestBytes = serializeX12(
  build277RequestForAdditionalInformation({
    envelope: {
      senderId: "PAYER01",
      receiverId: "CLINIC01",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000101",
      groupControlNumber: "101",
      transactionSetControlNumber: "0001",
    },
    header: {
      hierarchicalStructureCode: "0010",
      transactionSetPurposeCode: "08",
      referenceId: "RFAI-0001",
      date: "20260601",
      time: "1200",
      transactionTypeCode: "DG",
    },
    levels: [
      {
        levelCode: "20",
        entities: [
          {
            entityIdentifierCode: "PR",
            entityTypeQualifier: "2",
            lastOrOrganizationName: "PAYER ONE",
            idQualifier: "PI",
            idCode: "PAYER01",
          },
        ],
        children: [
          {
            levelCode: "21",
            entities: [
              {
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                lastOrOrganizationName: "CLINIC ONE",
                idQualifier: "XX",
                idCode: "1234567890",
              },
            ],
            children: [
              {
                levelCode: "22",
                entities: [
                  {
                    entityIdentifierCode: "QC",
                    entityTypeQualifier: "1",
                    lastOrOrganizationName: "DOE",
                    firstName: "JANE",
                    idQualifier: "MI",
                    idCode: "MBR0001",
                  },
                ],
                requests: [
                  {
                    trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
                    statuses: [
                      {
                        codes: [
                          { categoryCode: "R0", statusCode: "18842-5", codeListQualifier: "LOI" },
                        ],
                        actionCode: "WQ",
                        totalChargeAmount: charge,
                      },
                    ],
                    references: [{ qualifier: "1K", value: "PCN0001" }],
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

// 2. The provider reads the request: which claim, which document, and the trace to echo.
const rfaiIx = parseX12(requestBytes);
const rfaiTx = rfaiIx.groups[0]?.transactions[0];
const rfai = rfaiTx ? get277RequestForAdditionalInformation(rfaiIx.delimiters, rfaiTx) : undefined;
if (rfai === undefined) throw new Error("not a 277 request for additional information");
const asked = rfai.levels.flatMap((level) => level.requests)[0];
const wanted = asked?.statuses[0]?.codes[0];
const trace = asked?.traces[0]?.referenceId;
const claim = asked?.references.find((r) => r.qualifier === "1K")?.value;
const category = wanted?.categoryCode;
const code = wanted?.statusCode;
const codeList = wanted?.codeListQualifier;
if (trace === undefined || claim === undefined) throw new Error("no trace or claim to answer");
if (category === undefined || code === undefined || codeList === undefined) {
  throw new Error("the request names no document");
}
console.log(`277 asks for a ${codeList} ${code} document about one claim (${category})`);

// 3. The provider answers with a 275. The data is already base64, and the filter code says so.
const document = Buffer.from("SYNTHETIC NOTE", "latin1").toString("base64");
const answerBytes = serializeX12(
  build275({
    envelope: {
      senderId: "CLINIC01",
      receiverId: "PAYER01",
      interchangeDate: "260602",
      interchangeTime: "0900",
      interchangeControlNumber: "000000202",
      groupControlNumber: "202",
      transactionSetControlNumber: "0001",
    },
    beginning: { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001" },
    entities: [
      {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        lastOrOrganizationName: "PAYER ONE",
        idQualifier: "PI",
        idCode: "PAYER01",
      },
    ],
    lines: [
      {
        trace: { traceTypeCode: "2", referenceId: trace },
        status: {
          codes: [{ categoryCode: category, statusCode: code, codeListQualifier: codeList }],
        },
        references: [{ qualifier: "1K", value: claim }],
        attachments: [{ filterCode: "B64", data: document }],
      },
    ],
  }),
);

// 4. The payer reads the 275 from its octets.
const ix275 = parseX12(Buffer.from(answerBytes, "latin1"));
const tx275 = ix275.groups[0]?.transactions[0];
const reading = tx275 ? get275Attachments(ix275.delimiters, tx275) : undefined;
if (reading === undefined) throw new Error("not a 275");
const attachment = reading.attachments[0];
console.log(
  `275 echoes the trace: ${String(attachment?.line?.traces[0]?.referenceId === trace)},`,
  `${String(attachment?.filterCode)}, declared ${String(attachment?.declaredLength)} octets,`,
  `verified ${String(attachment?.lengthVerified)}`,
);
// The attachment refuses to print its octets: its string form states their count and nothing else.
const shown = String(attachment?.data); // "[X12AttachmentData: 20 octets withheld]"

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
assert.equal(rfai.transactionType, "request-for-additional-information");
assert.deepEqual(
  rfai.levels.map((level) => level.levelCode),
  ["20", "21", "22"],
);
// The trace and the claim number are synthetic.
assert.equal(trace, "TRACE-0001");
assert.equal(claim, "PCN0001");
assert.equal(code, "18842-5");
assert.ok(answerBytes.includes("ST*275*0001*006020X314~"));
assert.equal(attachment?.line?.traces[0]?.referenceId, trace);
assert.equal(attachment.declaredLength, String(document.length));
assert.equal(attachment.lengthVerified, true);
assert.equal(attachment.data.readOctets(), document);
assert.ok(!shown.includes(document));
assert.equal(shown, `[X12AttachmentData: ${String(document.length)} octets withheld]`);
assert.equal(rfai.warnings.length + reading.warnings.length + ix275.warnings.length, 0);

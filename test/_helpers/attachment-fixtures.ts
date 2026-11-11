/**
 * The build specs of the committed fixtures under `test/fixtures/attachments/`: each `.edi` file
 * there is exactly what the builder writes from the spec of the same name here, and
 * `test/property/attachments-fuzz.property.test.ts` holds each file to that, so a fixture can
 * neither drift from its spec nor carry a byte nobody wrote down.
 *
 * Every value is invented: the names are placeholders `scripts/phi-allow-list.txt` declares
 * (`DOE`, `JANE`, `PAYER`, `CLINIC`), the identifiers are made-up tokens, and each attachment is
 * the base64 of an invented word or a run of invented bytes. To write the files again after a
 * spec changes, run that test with `X12_WRITE_ATTACHMENT_FIXTURES=1`.
 */

import {
  X12Decimal,
  build275,
  build277RequestForAdditionalInformation,
  serializeX12,
  type Build275Spec,
  type Build277RfaiSpec,
} from "../../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`not a decimal: ${value}`);
  return d;
}

const ENVELOPE = {
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const PROVIDER_TO_PAYER = { ...ENVELOPE, senderId: "CLINIC01", receiverId: "PAYER01" } as const;
const PAYER_TO_PROVIDER = { ...ENVELOPE, senderId: "PAYER01", receiverId: "CLINIC01" } as const;

const PATIENT = {
  entityIdentifierCode: "QC",
  entityTypeQualifier: "1",
  lastOrOrganizationName: "DOE",
  firstName: "JANE",
  idQualifier: "MI",
  idCode: "MBR0001",
} as const;

const PAYER = {
  entityIdentifierCode: "PR",
  entityTypeQualifier: "2",
  lastOrOrganizationName: "PAYER ONE",
  idQualifier: "PI",
  idCode: "PAYER01",
} as const;

/** The 275 fixtures, by file name. */
export const ATTACHMENT_275_FIXTURES: Readonly<Record<string, Build275Spec>> = {
  "275-canonical.edi": {
    envelope: PROVIDER_TO_PAYER,
    beginning: { transactionSetPurposeCode: "02", referenceId: "ATTACH-0001", date: "20260601" },
    entities: [PAYER, PATIENT],
    lines: [
      {
        trace: { traceTypeCode: "2", referenceId: "TRACE-0001" },
        status: {
          codes: [{ categoryCode: "R0", statusCode: "18842-5", codeListQualifier: "LOI" }],
        },
        references: [{ qualifier: "1K", value: "PCN0001" }],
        // The base64 of "SYNTHETIC NOTE".
        attachments: [{ filterCode: "B64", data: "U1lOVEhFVElDIE5PVEU=" }],
      },
    ],
  },
  "275-two-lines.edi": {
    envelope: PROVIDER_TO_PAYER,
    beginning: { transactionSetPurposeCode: "02", referenceId: "ATTACH-0002", date: "20260602" },
    entities: [PAYER],
    lines: [
      {
        trace: { traceTypeCode: "2", referenceId: "TRACE-0002" },
        attachments: [
          // Octets holding every delimiter and the release character, written unreleased. Plain
          // ASCII with no line break, so a checkout that converts line endings cannot move them.
          { filterCode: "ASC", data: "AB*CD^EF:GH~IJ?*KL??MN" },
          { filterCode: "BIN", data: "BIN~*^:?DATA" },
        ],
      },
      {
        trace: { traceTypeCode: "2", referenceId: "TRACE-0003" },
        references: [{ qualifier: "EJ", value: "PATCTL-0003" }],
        // The base64 of "CCDA-R2".
        attachments: [{ filterCode: "B64", data: "Q0NEQS1SMg==" }],
      },
    ],
  },
};

/** The 277 request for additional information fixtures, by file name. */
export const RFAI_277_FIXTURES: Readonly<Record<string, Build277RfaiSpec>> = {
  "277-rfai-canonical.edi": {
    envelope: PAYER_TO_PROVIDER,
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
        childCode: "1",
        entities: [PAYER],
        children: [
          {
            levelCode: "22",
            childCode: "0",
            entities: [PATIENT],
            requests: [
              {
                trace: {
                  traceTypeCode: "1",
                  referenceId: "TRACE-0001",
                  originatingCompanyId: "9SUBMITTER",
                },
                statuses: [
                  {
                    codes: [
                      { categoryCode: "R0", statusCode: "18842-5", codeListQualifier: "LOI" },
                    ],
                    statusEffectiveDate: "20260601",
                    totalChargeAmount: dec("150.00"),
                  },
                ],
                references: [{ qualifier: "1K", value: "PCN0001" }],
                dates: [{ qualifier: "472", formatQualifier: "RD8", value: "20260501-20260502" }],
              },
            ],
          },
        ],
      },
    ],
  },
  "277-rfai-service-lines.edi": {
    envelope: PAYER_TO_PROVIDER,
    header: {
      hierarchicalStructureCode: "0010",
      transactionSetPurposeCode: "08",
      referenceId: "RFAI-0002",
      date: "20260602",
      time: "0900",
    },
    levels: [
      {
        levelCode: "20",
        childCode: "1",
        entities: [PAYER],
        children: [
          {
            levelCode: "19",
            childCode: "1",
            entities: [
              {
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                lastOrOrganizationName: "CLINIC",
                idQualifier: "XX",
                idCode: "1234567893",
              },
            ],
            children: [
              {
                levelCode: "22",
                childCode: "0",
                entities: [PATIENT],
                requests: [
                  {
                    trace: { traceTypeCode: "1", referenceId: "TRACE-0002" },
                    quantities: [{ qualifier: "90", quantity: dec("2") }],
                    amounts: [{ qualifier: "T3", amount: dec("150.00") }],
                    serviceLines: [
                      {
                        service: {
                          serviceIdQualifier: "HC",
                          procedureCode: "99213",
                          modifiers: ["25"],
                          lineChargeAmount: dec("150.00"),
                          unitsOfService: dec("1"),
                        },
                        statuses: [
                          {
                            codes: [
                              {
                                categoryCode: "R0",
                                statusCode: "28570-0",
                                codeListQualifier: "LOI",
                              },
                            ],
                          },
                        ],
                        references: [{ qualifier: "FJ", value: "LINE-0001" }],
                        dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260501" }],
                      },
                    ],
                  },
                  {
                    trace: { traceTypeCode: "1", referenceId: "TRACE-0003" },
                    statuses: [
                      { codes: [{ categoryCode: "R1", statusCode: "20", entityCode: "PR" }] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

/** Every attachments fixture, by file name, as the text its builder writes. */
export function attachmentFixtureTexts(): Readonly<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const [name, spec] of Object.entries(ATTACHMENT_275_FIXTURES)) {
    out[name] = serializeX12(build275(spec));
  }
  for (const [name, spec] of Object.entries(RFAI_277_FIXTURES)) {
    out[name] = serializeX12(build277RequestForAdditionalInformation(spec));
  }
  return out;
}

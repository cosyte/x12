/**
 * Every builder that writes an ISA refuses a value longer than its fixed
 * width, rather than cutting it to fit.
 *
 * ASC X12 .5 fixes each ISA element at a width. Each builder's private `pad`
 * helper padded a short value with spaces, and sliced a long one down to the
 * width with no warning and no error. Measured before the fix:
 *
 * ```text
 * buildInterchange({ ...spec, interchangeDate: "20250101" }).isa.elements[9] === "202501"
 * ```
 *
 * An over-long sender or receiver id, qualifier or time was cut the same way,
 * so the interchange named a party or a date the caller never gave. The
 * builders refuse what they cannot emit exactly, so an over-long value now
 * refuses with the builder's own `INVALID_SPEC` code and a message naming the
 * field. A short value still pads, as before.
 */

import { describe, expect, it } from "vitest";

import {
  build270,
  build271,
  build275,
  build276,
  build277,
  build277RequestForAdditionalInformation,
  build278Request,
  build820,
  build834,
  build835,
  build837P,
  build999,
  buildInterchange,
  X12Decimal,
  type X12Interchange,
} from "../src/index.js";

function asJsCaller<T>(value: unknown): T {
  return value as T;
}

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

const ENVELOPE = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

type Overrides = Readonly<Record<string, unknown>>;

const NM1_PAYER = {
  entityIdentifierCode: "PR",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "PAYER",
  idQualifier: "PI",
  idCode: "P1",
};
const NM1_PROVIDER = {
  entityIdentifierCode: "1P",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "CLINIC",
  idQualifier: "XX",
  idCode: "1234567890",
};
const NM1_MEMBER = {
  entityIdentifierCode: "IL",
  entityTypeQualifier: "1",
  lastNameOrOrganizationName: "DOE",
  firstName: "JANE",
  idQualifier: "MI",
  idCode: "MBR0001",
};

/**
 * One valid spec per builder module that writes an ISA, each taking envelope
 * overrides. `version` names the spec key a builder takes for ISA-12, where it
 * takes one; the rest stamp `00501` themselves.
 */
const BUILDERS: readonly {
  readonly name: string;
  readonly code: string;
  readonly version?: string;
  readonly build: (o: Overrides) => X12Interchange;
}[] = [
  {
    name: "buildInterchange",
    code: "X12_BUILD_INVALID_SPEC",
    version: "version",
    build: (o) =>
      buildInterchange(
        asJsCaller({
          ...ENVELOPE,
          ...o,
          groups: [
            {
              functionalIdCode: "HC",
              groupControlNumber: "1",
              versionRelease: "005010X222A2",
              transactions: [
                {
                  transactionSetIdCode: "837",
                  transactionSetControlNumber: "0001",
                  segments: [["BHT", "0019", "00", "REF", "20260601", "1200", "CH"]],
                },
              ],
            },
          ],
        }),
      ),
  },
  {
    name: "build999",
    code: "X12_ACK_INVALID_SPEC",
    build: (o) =>
      build999(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          functionalGroup: {
            functionalIdCode: "HC",
            groupControlNumber: "1",
            versionRelease: "005010X222A2",
            disposition: "A",
            numberOfTransactionSets: 1,
            numberOfReceivedTransactionSets: 1,
            numberOfAcceptedTransactionSets: 1,
            transactionResponses: [
              {
                transactionSetIdCode: "837",
                transactionSetControlNumber: "0001",
                disposition: "A",
              },
            ],
          },
        }),
      ),
  },
  {
    name: "build270",
    code: "X12_270_BUILD_INVALID_SPEC",
    build: (o) =>
      build270(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          informationSources: [
            {
              name: NM1_PAYER,
              receivers: [
                {
                  name: NM1_PROVIDER,
                  subscribers: [
                    {
                      traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
                      name: NM1_MEMBER,
                      inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ),
  },
  {
    name: "build271",
    code: "X12_271_BUILD_INVALID_SPEC",
    build: (o) =>
      build271(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          header: {
            transactionSetPurposeCode: "11",
            referenceId: "R1",
            date: "20260601",
            time: "1200",
          },
          informationSources: [
            {
              entity: {
                entityIdentifierCode: "PR",
                entityTypeQualifier: "2",
                name: "PAYER",
                idQualifier: "PI",
                idCode: "P1",
              },
              receivers: [
                {
                  entity: {
                    entityIdentifierCode: "1P",
                    entityTypeQualifier: "2",
                    name: "PROV",
                    idQualifier: "XX",
                    idCode: "1234567890",
                  },
                  subscribers: [{ benefits: [{ eligibilityCode: "1" }] }],
                },
              ],
            },
          ],
        }),
      ),
  },
  {
    name: "build276",
    code: "X12_276_BUILD_INVALID_SPEC",
    build: (o) =>
      build276(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          informationSources: [
            {
              name: NM1_PAYER,
              receivers: [
                {
                  name: { ...NM1_PROVIDER, entityIdentifierCode: "41", idQualifier: "46" },
                  providers: [
                    {
                      name: NM1_PROVIDER,
                      subscribers: [
                        {
                          name: NM1_MEMBER,
                          claims: [
                            {
                              trace: { traceTypeCode: "1", referenceId: "STATUS0001" },
                              references: [{ qualifier: "1K", value: "PCN0001" }],
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
      ),
  },
  {
    name: "build277",
    code: "X12_277_BUILD_INVALID_SPEC",
    build: (o) =>
      build277(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          header: {
            transactionSetPurposeCode: "08",
            referenceId: "R1",
            date: "20260601",
            time: "1200",
          },
          informationSources: [
            {
              entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER" },
              receivers: [
                {
                  entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CH" },
                  providers: [
                    {
                      entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "P" },
                      subscribers: [
                        {
                          claims: [
                            {
                              statuses: [{ statuses: [{ categoryCode: "A1", statusCode: "19" }] }],
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
      ),
  },
  {
    name: "build278",
    code: "X12_278_BUILD_INVALID_SPEC",
    build: (o) =>
      build278Request(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          header: {
            structurePurposeCode: "0078",
            purposeCode: "13",
            referenceId: "AUTHREQ-202606",
            date: "20260601",
            time: "1200",
          },
          utilizationManagementOrganization: {
            entityIdentifierCode: "X3",
            entityTypeQualifier: "2",
            name: "UMO",
            idQualifier: "PI",
            idCode: "UMO001",
          },
          requester: {
            entityIdentifierCode: "1P",
            entityTypeQualifier: "2",
            name: "CLINIC",
            idQualifier: "XX",
            idCode: "1234567893",
          },
          subscriber: {
            member: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              lastName: "DOE",
              idQualifier: "MI",
              idCode: "MBR0001",
            },
            reviews: [{ levelCode: "EV", requestCategoryCode: "HS", certificationTypeCode: "I" }],
          },
        }),
      ),
  },
  {
    name: "build820",
    code: "X12_820_BUILD_INVALID_SPEC",
    build: (o) =>
      build820(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          payment: {
            transactionHandlingCode: "I",
            totalPremiumAmount: dec("250.00"),
            creditDebitFlag: "C",
            method: "ACH",
            paymentDate: "20260601",
          },
          traces: [{ traceTypeCode: "1", referenceId: "T1" }],
          remittances: [
            {
              entity: { entityIdentifierCode: "2J", name: "ORG", idQualifier: "34", idCode: "M1" },
              openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: dec("250.00") }],
            },
          ],
        }),
      ),
  },
  {
    name: "build834",
    code: "X12_834_BUILD_INVALID_SPEC",
    build: (o) =>
      build834(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          header: {
            transactionSetPurposeCode: "00",
            referenceId: "F1",
            date: "20260601",
            time: "1200",
            actionCode: "2",
            sponsor: { entityIdentifierCode: "P5", name: "EMP", idQualifier: "FI", idCode: "F1" },
            payer: { entityIdentifierCode: "IN", name: "PAY", idQualifier: "FI", idCode: "F2" },
          },
          members: [
            {
              subscriberIndicator: "Y",
              relationshipCode: "18",
              maintenanceTypeCode: "021",
              member: { lastName: "DOE", idQualifier: "34", idCode: "MBR0001" },
            },
          ],
        }),
      ),
  },
  {
    name: "build835",
    code: "X12_835_BUILD_INVALID_SPEC",
    build: (o) =>
      build835(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          payment: {
            transactionHandlingCode: "I",
            totalActualPayment: dec("450.00"),
            creditDebitFlag: "C",
            method: "ACH",
            paymentDate: "20260601",
          },
          traces: [{ traceTypeCode: "1", referenceId: "0012345" }],
          payer: { entityIdentifierCode: "PR", name: "PAYER" },
          payee: { entityIdentifierCode: "PE", name: "CLINIC", idQualifier: "XX", idCode: "1" },
          claims: [
            {
              patientControlNumber: "PT-ACCT-001",
              claimStatusCode: "1",
              totalChargeAmount: dec("450.00"),
              totalPaymentAmount: dec("450.00"),
              patientResponsibilityAmount: dec("0.00"),
              claimFilingIndicatorCode: "MB",
            },
          ],
        }),
      ),
  },
  {
    name: "build837",
    code: "X12_837_BUILD_INVALID_SPEC",
    build: (o) =>
      build837P(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          submitter: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "SUB" },
          receiver: { entityIdentifierCode: "40", entityTypeQualifier: "2", name: "REC" },
          billingProviders: [
            {
              provider: { entityIdentifierCode: "85", entityTypeQualifier: "2", name: "CLINIC" },
              subscribers: [
                {
                  info: { payerResponsibilityCode: "P", claimFilingIndicator: "MB" },
                  subscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "DOE" },
                  payer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER" },
                  claims: [
                    {
                      claimId: "CLAIM0001",
                      totalCharge: dec("150.00"),
                      placeOfServiceCode: "11",
                      facilityCodeQualifier: "B",
                      claimFrequencyCode: "1",
                      serviceLines: [
                        {
                          variant: "P",
                          procedureQualifier: "HC",
                          procedureCode: "99213",
                          charge: dec("150.00"),
                          unitOfMeasure: "UN",
                          units: dec("1"),
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ),
  },
  {
    name: "build275",
    code: "X12_275_BUILD_INVALID_SPEC",
    version: "interchangeControlVersion",
    build: (o) =>
      build275(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          lines: [{ attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }] }],
        }),
      ),
  },
  {
    name: "build277RequestForAdditionalInformation",
    code: "X12_277_RFAI_BUILD_INVALID_SPEC",
    version: "interchangeControlVersion",
    build: (o) =>
      build277RequestForAdditionalInformation(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          header: { hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08" },
          levels: [
            {
              levelCode: "20",
              requests: [
                {
                  trace: { traceTypeCode: "1", referenceId: "TRACE-0001" },
                  statuses: [
                    {
                      codes: [
                        { categoryCode: "R4", statusCode: "18842-5", codeListQualifier: "LOI" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ),
  },
];

/** The caller-set ISA fields every builder takes, with the ISA element and width. */
const FIELDS: readonly (readonly [field: string, element: number, width: number])[] = [
  ["senderQualifier", 5, 2],
  ["senderId", 6, 15],
  ["receiverQualifier", 7, 2],
  ["receiverId", 8, 15],
  ["interchangeDate", 9, 6],
  ["interchangeTime", 10, 4],
];

/** Fields for one builder: the shared six, plus ISA-12 where the builder takes it. */
function fieldsOf(b: (typeof BUILDERS)[number]): readonly (readonly [string, number, number])[] {
  return b.version === undefined ? FIELDS : [...FIELDS, [b.version, 12, 5]];
}

/** A value of exactly `length` characters that is valid in every slot it reaches. */
function digits(length: number): string {
  return "1".repeat(length);
}

function refusal(run: () => unknown): { code?: unknown; message: string } {
  try {
    run();
  } catch (err) {
    return err as { code?: unknown; message: string };
  }
  throw new Error("the builder did not refuse");
}

describe("the fixed-width ISA elements refuse an over-long value", () => {
  for (const b of BUILDERS) {
    describe(b.name, () => {
      it("builds the control spec with a clean ISA", () => {
        const ix = b.build({});
        expect(ix.isa.raw.length).toBe(106);
      });

      for (const [field, element, width] of fieldsOf(b)) {
        it(`refuses a ${field} one character longer than ISA-${String(element).padStart(2, "0")}`, () => {
          const err = refusal(() => b.build({ [field]: digits(width + 1) }));
          expect(err.code).toBe(b.code);
          expect(err.message).toContain(`${b.name}: `);
          expect(err.message).toContain(field);
          expect(err.message).toContain(`ISA-${String(element).padStart(2, "0")}`);
          // The value is not echoed: the refusal names the field and the lengths.
          expect(err.message).not.toContain(digits(width + 1));
        });

        it(`writes a ${field} of exactly the width unchanged`, () => {
          const ix = b.build({ [field]: digits(width) });
          expect(ix.isa.elements[element]).toBe(digits(width));
        });
      }

      it("still pads a short value with spaces", () => {
        const ix = b.build({ senderId: "S" });
        expect(ix.isa.elements[6]).toBe(`S${" ".repeat(14)}`);
      });

      it("refuses a value that is not a string with a typed refusal", () => {
        const err = refusal(() => b.build({ senderId: 1 }));
        expect(err.code).toBe(b.code);
        expect(err.message).toContain("senderId must be a string");
      });
    });
  }
});

describe("the measured case", () => {
  it("no longer cuts an eight-digit interchangeDate to six", () => {
    const err = refusal(() => BUILDERS[0]?.build({ interchangeDate: "20250101" }));
    expect(err.code).toBe("X12_BUILD_INVALID_SPEC");
    expect(err.message).toContain("buildInterchange: interchangeDate");
  });
});

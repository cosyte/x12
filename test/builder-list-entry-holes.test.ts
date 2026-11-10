/**
 * Every builder refuses a hole or a `null` inside a list it reads, at any
 * depth, with its own typed `INVALID_SPEC` error and a structural locator.
 *
 * The types say `readonly T[]`, and a TypeScript caller cannot put a hole in
 * one. A JavaScript or JSON caller can: `[, entry]` from a sparse literal, or
 * `[null]` from a payload that dropped a record. The structural checks walked
 * the hierarchy spine and stopped there, so a hole in any list below it
 * (`build271`'s subscribers, dependents and benefits, and the leaf lists of
 * every builder) reached an emitter, which dereferenced it and threw an
 * untyped `TypeError` with no `code` to branch on.
 *
 * This file does not name the lists by hand. It builds one rich, valid spec
 * per builder, walks it, and for every list whose entries are objects or
 * arrays it plants a `null` in place of the first entry and a hole in front
 * of it. A list a builder adds later is covered as soon as a spec here carries
 * it. Lists of strings are not planted: a hole there already reaches the
 * element type check and refuses with the typed code.
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
  build837D,
  build837P,
  build999,
  buildInterchange,
  X12Decimal,
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

const REF = { qualifier: "1K", value: "REF0001" };
const DTP = { qualifier: "472", formatQualifier: "D8", value: "20260601" };
const TRN = { traceTypeCode: "1", referenceId: "TRACE0001" };

// ---------------------------------------------------------------------------
// One rich, valid spec per builder. Every list whose entries are objects
// carries at least one entry, so the walker below reaches it.
// ---------------------------------------------------------------------------

const INTERCHANGE_SPEC = {
  ...ENVELOPE,
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
};

const SPEC_999 = {
  envelope: ENVELOPE,
  functionalGroup: {
    functionalIdCode: "HC",
    groupControlNumber: "1",
    versionRelease: "005010X222A2",
    disposition: "R",
    numberOfTransactionSets: 1,
    numberOfReceivedTransactionSets: 1,
    numberOfAcceptedTransactionSets: 0,
    transactionResponses: [
      {
        transactionSetIdCode: "837",
        transactionSetControlNumber: "0001",
        disposition: "R",
        syntaxErrorCodes: ["5"],
        segmentErrors: [
          {
            segmentIdCode: "CLM",
            segmentPositionInTransactionSet: 5,
            syntaxErrorCode: "8",
            elementErrors: [{ position: { element: 2 }, syntaxErrorCode: "1" }],
          },
        ],
      },
    ],
  },
};

const NM1_270 = {
  entityIdentifierCode: "PR",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "PAYER",
  idQualifier: "PI",
  idCode: "P1",
};

const SPEC_270 = {
  envelope: ENVELOPE,
  informationSources: [
    {
      name: NM1_270,
      references: [REF],
      receivers: [
        {
          name: { ...NM1_270, entityIdentifierCode: "1P", idQualifier: "XX", idCode: "1" },
          references: [REF],
          subscribers: [
            {
              traces: [TRN],
              name: { ...NM1_270, entityIdentifierCode: "IL", entityTypeQualifier: "1" },
              references: [REF],
              dates: [DTP],
              inquiries: [{ serviceTypeCodes: [{ code: "30" }], references: [REF], dates: [DTP] }],
              dependents: [
                {
                  traces: [TRN],
                  name: { entityIdentifierCode: "03", entityTypeQualifier: "1" },
                  references: [REF],
                  dates: [DTP],
                  inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const ENTITY_271 = {
  entityIdentifierCode: "PR",
  entityTypeQualifier: "2",
  name: "PAYER",
  idQualifier: "PI",
  idCode: "P1",
};

const BENEFIT_271 = {
  eligibilityCode: "1",
  serviceTypeCodes: [{ code: "30" }],
  references: [REF],
  dates: [DTP],
  messages: ["NOTE"],
  relatedEntities: [{ ...ENTITY_271, entityIdentifierCode: "P3" }],
};

const SPEC_271 = {
  envelope: ENVELOPE,
  informationSources: [
    {
      entity: ENTITY_271,
      receivers: [
        {
          entity: { ...ENTITY_271, entityIdentifierCode: "1P", idQualifier: "XX" },
          subscribers: [
            {
              traces: [TRN],
              references: [REF],
              dates: [DTP],
              benefits: [BENEFIT_271],
              dependents: [
                { traces: [TRN], references: [REF], dates: [DTP], benefits: [BENEFIT_271] },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const SPEC_276 = {
  envelope: ENVELOPE,
  informationSources: [
    {
      name: NM1_270,
      receivers: [
        {
          name: { ...NM1_270, entityIdentifierCode: "41", idQualifier: "46" },
          providers: [
            {
              name: { ...NM1_270, entityIdentifierCode: "1P", idQualifier: "XX" },
              subscribers: [
                {
                  name: { ...NM1_270, entityIdentifierCode: "IL", entityTypeQualifier: "1" },
                  claims: [
                    {
                      trace: TRN,
                      references: [REF],
                      amounts: [{ qualifier: "T3", amount: dec("150") }],
                      dates: [DTP],
                      serviceLines: [
                        {
                          procedure: { qualifier: "HC", code: "99213" },
                          lineChargeAmount: dec("150"),
                          references: [REF],
                          dates: [DTP],
                        },
                      ],
                    },
                  ],
                  dependents: [
                    {
                      name: { entityIdentifierCode: "QC", entityTypeQualifier: "1" },
                      claims: [{ trace: TRN, references: [REF] }],
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
};

const STATUS_277 = { statuses: [{ categoryCode: "A1", statusCode: "19" }] };
const CLAIM_277 = {
  trace: TRN,
  statuses: [STATUS_277],
  references: [REF],
  dates: [DTP],
  serviceLines: [
    {
      serviceIdQualifier: "HC",
      procedureCode: "99213",
      unitsOfService: dec("1"),
      statuses: [STATUS_277],
      references: [REF],
      dates: [DTP],
    },
  ],
};

const SPEC_277 = {
  envelope: ENVELOPE,
  informationSources: [
    {
      entity: ENTITY_271,
      receivers: [
        {
          entity: { ...ENTITY_271, entityIdentifierCode: "41" },
          providers: [
            {
              entity: { ...ENTITY_271, entityIdentifierCode: "1P" },
              subscribers: [
                {
                  claims: [CLAIM_277],
                  dependents: [{ claims: [CLAIM_277] }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const REVIEW_278 = {
  levelCode: "SS",
  requestCategoryCode: "HS",
  certificationTypeCode: "I",
  serviceTypeCode: "3",
  traces: [TRN],
  diagnoses: [{ qualifier: "ABK", code: "J209" }],
  providers: [{ ...ENTITY_271, entityIdentifierCode: "SJ" }],
  references: [REF],
  dates: [DTP],
  messages: ["NOTE"],
};

const SPEC_278 = {
  envelope: ENVELOPE,
  header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "R1" },
  utilizationManagementOrganization: { ...ENTITY_271, entityIdentifierCode: "X3" },
  requester: { ...ENTITY_271, entityIdentifierCode: "1P" },
  subscriber: {
    member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE" },
    reviews: [{ ...REVIEW_278, levelCode: "EV", reviews: [REVIEW_278] }],
    dependent: {
      member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "DOE" },
      reviews: [{ ...REVIEW_278, levelCode: "EV", reviews: [REVIEW_278] }],
    },
  },
};

const SPEC_820 = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: dec("250.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "T1" }],
  receiver: { entityIdentifierCode: "PE", name: "PAYEE", references: [REF] },
  remitter: { entityIdentifierCode: "PR", name: "PAYER", references: [REF] },
  remittances: [
    {
      entity: { entityIdentifierCode: "2J", idCode: "M1" },
      references: [REF],
      dates: [{ qualifier: "582", value: "20260601" }],
      openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: dec("250.00") }],
      adjustments: [{ amount: dec("0.00"), reasonCode: "52" }],
    },
  ],
};

const SPEC_834 = {
  envelope: ENVELOPE,
  header: {
    transactionSetPurposeCode: "00",
    referenceId: "F1",
    date: "20260601",
    time: "1200",
    actionCode: "2",
    references: [REF],
    dates: [{ qualifier: "007", value: "20260601" }],
  },
  members: [
    {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021",
      member: { lastName: "DOE", idCode: "MBR0001" },
      references: [{ qualifier: "0F", value: "MBR0001" }],
      dates: [{ qualifier: "356", value: "20260601" }],
      coordinationOfBenefits: [{ payerResponsibility: "P", coordinationOfBenefitsCode: "1" }],
      healthCoverages: [
        {
          maintenanceTypeCode: "021",
          insuranceLineCode: "HLT",
          dates: [{ qualifier: "348", value: "20260601" }],
          amounts: [{ qualifier: "C1", amount: dec("10.00") }],
        },
      ],
    },
  ],
};

const SPEC_835 = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalActualPayment: dec("450.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "0012345" }],
  payer: {
    entityIdentifierCode: "PR",
    name: "PAYER",
    additionalIdentifiers: [{ qualifier: "2U", value: "P1" }],
    contacts: [
      { contactFunctionCode: "CX", communications: [{ qualifier: "TE", value: "5550100" }] },
    ],
  },
  payee: { entityIdentifierCode: "PE", name: "CLINIC", idCode: "1234567890" },
  claims: [
    {
      patientControlNumber: "PT-ACCT-001",
      claimStatusCode: "1",
      totalChargeAmount: dec("500.00"),
      totalPaymentAmount: dec("450.00"),
      patientResponsibilityAmount: dec("50.00"),
      claimFilingIndicatorCode: "MB",
      references: [{ qualifier: "1L", value: "G1" }],
      amounts: [{ qualifier: "AU", amount: dec("500.00") }],
      remarks: [{ system: "HE", code: "N130" }],
      serviceLines: [
        {
          productServiceIdQualifier: "HC",
          productServiceId: "99213",
          chargeAmount: dec("500.00"),
          paymentAmount: dec("450.00"),
          adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
          references: [{ qualifier: "6R", value: "L1" }],
          amounts: [{ qualifier: "B6", amount: dec("500.00") }],
          remarks: [{ system: "HE", code: "N130" }],
        },
      ],
    },
  ],
  providerAdjustments: [
    {
      providerId: "1234567890",
      fiscalPeriodDate: "20261231",
      reasonCode: "WO",
      amount: dec("0.00"),
    },
  ],
};

const ENTITY_837 = {
  entityIdentifierCode: "85",
  entityTypeQualifier: "2",
  name: "CLINIC",
  idQualifier: "XX",
  idCode: "1234567890",
  contacts: [
    { contactFunctionCode: "IC", communications: [{ qualifier: "TE", value: "5550100" }] },
  ],
  references: [{ qualifier: "EI", value: "123456789" }],
};

const LINE_COMMON_837 = {
  charge: dec("150.00"),
  units: dec("1"),
  unitOfMeasure: "UN",
  dates: [DTP],
  references: [{ qualifier: "6R", value: "L1" }],
  amounts: [{ qualifier: "T", amount: dec("1.00") }],
  notes: [{ noteReferenceCode: "ADD", description: "NOTE" }],
  providers: [{ entityIdentifierCode: "82", entityTypeQualifier: "1", name: "DOE" }],
  adjudications: [
    {
      otherPayerId: "P2",
      amountPaid: dec("0.00"),
      adjustments: [{ groupCode: "CO", reasonCode: "45", amount: dec("150.00") }],
    },
  ],
};

function claim837(serviceLine: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return {
    claimId: "CLAIM0001",
    totalCharge: dec("150.00"),
    placeOfServiceCode: "11",
    facilityCodeQualifier: "B",
    claimFrequencyCode: "1",
    dates: [{ qualifier: "431", formatQualifier: "D8", value: "20260601" }],
    diagnoses: [{ qualifier: "ABK", code: "J209" }],
    procedures: [{ qualifier: "BBR", code: "0FT44ZZ", dateQualifier: "D8", date: "20260601" }],
    otherHi: [{ qualifier: "BH", code: "01", dateQualifier: "D8", date: "20260601" }],
    notes: [{ noteReferenceCode: "ADD", description: "NOTE" }],
    amounts: [{ qualifier: "F5", amount: dec("0.00") }],
    references: [{ qualifier: "G1", value: "AUTH1" }],
    providers: [{ entityIdentifierCode: "82", entityTypeQualifier: "1", name: "DOE" }],
    otherSubscribers: [{ payerResponsibilityCode: "S" }],
    serviceLines: [serviceLine],
  };
}

function spec837(serviceLine: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return {
    envelope: ENVELOPE,
    submitter: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "SUB" },
    receiver: { entityIdentifierCode: "40", entityTypeQualifier: "2", name: "REC" },
    billingProviders: [
      {
        provider: ENTITY_837,
        subscribers: [
          {
            info: { payerResponsibilityCode: "P", claimFilingIndicator: "MB" },
            subscriber: { entityIdentifierCode: "IL", entityTypeQualifier: "1", name: "DOE" },
            payer: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "PAYER" },
            claims: [claim837(serviceLine)],
            patients: [
              {
                individualRelationshipCode: "19",
                patient: { entityIdentifierCode: "QC", entityTypeQualifier: "1", name: "DOE" },
                claims: [claim837(serviceLine)],
              },
            ],
          },
        ],
      },
    ],
  };
}

const SPEC_837P = spec837({
  ...LINE_COMMON_837,
  variant: "P",
  procedureQualifier: "HC",
  procedureCode: "99213",
});

const SPEC_837D = spec837({
  ...LINE_COMMON_837,
  variant: "D",
  procedureQualifier: "AD",
  procedureCode: "D0120",
  toothInformation: [{ qualifier: "JP", toothCode: "8", surfaces: ["M"] }],
});

const SPEC_275 = {
  envelope: ENVELOPE,
  entities: [{ entityIdentifierCode: "PR", entityTypeQualifier: "2", lastOrOrganizationName: "P" }],
  lines: [
    {
      trace: TRN,
      status: { codes: [{ categoryCode: "R0", statusCode: "18842-5" }] },
      references: [REF],
      attachments: [{ filterCode: "B64", data: "U1lOVEhFVElD" }],
    },
  ],
};

const STATUS_RFAI = { codes: [{ categoryCode: "R4", statusCode: "18842-5" }] };
const SPEC_RFAI = {
  envelope: ENVELOPE,
  header: { hierarchicalStructureCode: "0010", transactionSetPurposeCode: "08" },
  levels: [
    {
      levelCode: "20",
      entities: [{ entityIdentifierCode: "PR", entityTypeQualifier: "2" }],
      children: [
        {
          levelCode: "22",
          requests: [
            {
              trace: TRN,
              statuses: [STATUS_RFAI],
              references: [REF],
              dates: [DTP],
              quantities: [{ qualifier: "90", quantity: dec("2") }],
              amounts: [{ qualifier: "T3", amount: dec("150.00") }],
              serviceLines: [
                {
                  service: { serviceIdQualifier: "HC", procedureCode: "99213" },
                  statuses: [STATUS_RFAI],
                  references: [REF],
                  dates: [DTP],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

interface Case {
  readonly name: string;
  readonly code: string;
  /**
   * `build270` and `build276` already refused a hole in their hierarchy spine
   * before this file, on their `INVALID_HIERARCHY` code, and that code is left
   * where it is.
   */
  readonly spineCode?: string;
  readonly spec: unknown;
  readonly build: (spec: unknown) => unknown;
}

const CASES: readonly Case[] = [
  {
    name: "buildInterchange",
    code: "X12_BUILD_INVALID_SPEC",
    spec: INTERCHANGE_SPEC,
    build: (s) => buildInterchange(asJsCaller(s)),
  },
  {
    name: "build999",
    code: "X12_ACK_INVALID_SPEC",
    spec: SPEC_999,
    build: (s) => build999(asJsCaller(s)),
  },
  {
    name: "build270",
    code: "X12_270_BUILD_INVALID_SPEC",
    spineCode: "X12_270_BUILD_INVALID_HIERARCHY",
    spec: SPEC_270,
    build: (s) => build270(asJsCaller(s)),
  },
  {
    name: "build271",
    code: "X12_271_BUILD_INVALID_SPEC",
    spec: SPEC_271,
    build: (s) => build271(asJsCaller(s)),
  },
  {
    name: "build276",
    code: "X12_276_BUILD_INVALID_SPEC",
    spineCode: "X12_276_BUILD_INVALID_HIERARCHY",
    spec: SPEC_276,
    build: (s) => build276(asJsCaller(s)),
  },
  {
    name: "build277",
    code: "X12_277_BUILD_INVALID_SPEC",
    spec: SPEC_277,
    build: (s) => build277(asJsCaller(s)),
  },
  {
    name: "build278Request",
    code: "X12_278_BUILD_INVALID_SPEC",
    spec: SPEC_278,
    build: (s) => build278Request(asJsCaller(s)),
  },
  {
    name: "build820",
    code: "X12_820_BUILD_INVALID_SPEC",
    spec: SPEC_820,
    build: (s) => build820(asJsCaller(s)),
  },
  {
    name: "build834",
    code: "X12_834_BUILD_INVALID_SPEC",
    spec: SPEC_834,
    build: (s) => build834(asJsCaller(s)),
  },
  {
    name: "build835",
    code: "X12_835_BUILD_INVALID_SPEC",
    spec: SPEC_835,
    build: (s) => build835(asJsCaller(s)),
  },
  {
    name: "build837P",
    code: "X12_837_BUILD_INVALID_SPEC",
    spec: SPEC_837P,
    build: (s) => build837P(asJsCaller(s)),
  },
  {
    name: "build837D",
    code: "X12_837_BUILD_INVALID_SPEC",
    spec: SPEC_837D,
    build: (s) => build837D(asJsCaller(s)),
  },
  {
    name: "build275",
    code: "X12_275_BUILD_INVALID_SPEC",
    spec: SPEC_275,
    build: (s) => build275(asJsCaller(s)),
  },
  {
    name: "build277RequestForAdditionalInformation",
    code: "X12_277_RFAI_BUILD_INVALID_SPEC",
    spec: SPEC_RFAI,
    build: (s) => build277RequestForAdditionalInformation(asJsCaller(s)),
  },
];

// ---------------------------------------------------------------------------
// The walker.
// ---------------------------------------------------------------------------

type Path = readonly (string | number)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !(value instanceof X12Decimal);
}

/** Every path to a list whose entries are objects or arrays, outside the envelope. */
function listPaths(value: unknown, path: Path = []): Path[] {
  const out: Path[] = [];
  if (Array.isArray(value)) {
    if (value.some((entry) => isRecord(entry))) out.push(path);
    value.forEach((entry, i) => out.push(...listPaths(entry, [...path, i])));
  } else if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (key === "envelope") continue;
      out.push(...listPaths(child, [...path, key]));
    }
  }
  return out;
}

/** A copy of `root` with the list at `path` replaced by `make(list)`. */
function replaceAt(root: unknown, path: Path, make: (list: unknown[]) => unknown[]): unknown {
  if (path.length === 0) return make(root as unknown[]);
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const list = root as unknown[];
    const copy = [...list];
    copy[head as number] = replaceAt(list[head as number], rest, make);
    return copy;
  }
  const record = root as Record<string, unknown>;
  return { ...record, [head as string]: replaceAt(record[head as string], rest, make) };
}

/** `[null, ...rest]`: the first entry replaced by a JSON `null`. */
function withNull(list: unknown[]): unknown[] {
  return [null, ...list.slice(1)];
}

/** `[<hole>, ...list]`: a real array with nothing at index 0. */
function withHole(list: unknown[]): unknown[] {
  const out: unknown[] = [];
  list.forEach((entry, i) => {
    out[i + 1] = entry;
  });
  return out;
}

function refusal(run: () => unknown): unknown {
  try {
    run();
  } catch (err) {
    return err;
  }
  return undefined;
}

describe("every builder refuses a hole or a null inside a list it reads", () => {
  for (const c of CASES) {
    describe(c.name, () => {
      it("builds the rich control spec", () => {
        expect(() => c.build(c.spec)).not.toThrow();
      });

      const paths = listPaths(c.spec);
      it("reaches at least one nested list", () => {
        expect(paths.length).toBeGreaterThan(1);
      });

      for (const path of paths) {
        const where = path.join(".");
        for (const [shape, make] of [
          ["null", withNull],
          ["hole", withHole],
        ] as const) {
          it(`refuses a ${shape} in ${where}`, () => {
            const err = refusal(() => c.build(replaceAt(c.spec, path, make)));
            expect(err).toBeDefined();
            expect(err).not.toBeInstanceOf(TypeError);
            const code = (err as { code?: unknown }).code;
            if (c.spineCode !== undefined && code === c.spineCode) return;
            expect(code).toBe(c.code);
            // A structural locator naming the slot: `benefits[0]`, or the
            // singular `claim[0]` some builders already used for their spine.
            expect((err as Error).message).toMatch(/\[0\]/);
          });
        }
      }
    });
  }
});

describe("a hole in a list of strings written as one composite", () => {
  // These three lists are handed to the composite joiner whole. `map` skips a
  // hole, and `join` writes a skipped slot as nothing, so a hole used to go out
  // as an empty component with no refusal: `SV1-07` read `:1` for `[, "1"]`.
  const holeThen = (value: string): unknown[] => {
    const out: unknown[] = [];
    out[1] = value;
    return out;
  };
  const line = (spec: unknown): Record<string, unknown> => {
    const billing = (spec as { billingProviders: Record<string, unknown>[] }).billingProviders[0];
    const subscriber = (billing?.["subscribers"] as Record<string, unknown>[])[0];
    const claim = (subscriber?.["claims"] as Record<string, unknown>[])[0];
    return (claim?.["serviceLines"] as Record<string, unknown>[])[0] ?? {};
  };
  const withLine = (spec: unknown, patch: Record<string, unknown>): unknown =>
    replaceAt(spec, ["billingProviders", 0, "subscribers", 0, "claims", 0, "serviceLines"], () => [
      { ...line(spec), ...patch },
    ]);

  const cases: readonly (readonly [string, () => unknown])[] = [
    [
      "diagnosisPointers",
      () => build837P(asJsCaller(withLine(SPEC_837P, { diagnosisPointers: holeThen("1") }))),
    ],
    [
      "oralCavityArea",
      () => build837D(asJsCaller(withLine(SPEC_837D, { oralCavityArea: holeThen("01") }))),
    ],
    [
      "toothInformation[0].surfaces",
      () =>
        build837D(
          asJsCaller(
            withLine(SPEC_837D, {
              toothInformation: [{ qualifier: "JP", toothCode: "8", surfaces: holeThen("M") }],
            }),
          ),
        ),
    ],
  ];

  for (const [where, run] of cases) {
    it(`refuses a hole in ${where} rather than writing an empty component`, () => {
      const err = refusal(run);
      expect(err).toBeDefined();
      expect((err as { code?: unknown }).code).toBe("X12_837_BUILD_INVALID_SPEC");
    });
  }
});

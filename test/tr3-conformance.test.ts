/**
 * `X12_TR3_CONFORMANCE`: the package's machine-readable statement of which
 * implementation guide each reader and builder implements, and how that
 * identifier stands against 45 CFR 162.920.
 *
 * ## What this file grades, and against what
 *
 * **The `cfrAdopted` and `adoption` columns are graded against the regulation,
 * never against a doc comment in `src/`.** The thirteen identifiers below were
 * string-searched out of the official Government Publishing Office XML of
 * 45 CFR 162.920 (title 45, volume 2, 2024 annual edition), retrieved
 * 2026-08-25, and that enumeration is exhaustive: thirteen matches of
 * `005010X[0-9A-Za-z]*`, each occurring once. Two doc comments in this tree say
 * otherwise and are deliberately NOT evidence here:
 * `src/transactions/ack/build-999.ts` calls 005010X231A1 the HIPAA cited guide
 * for the 999, and `src/transactions/auth/build-278.ts` documents an ST-03 of
 * 005010X216 for the 278 response. Neither identifier appears in the section at
 * all. Both carriers are out of scope to change here; the manifest is where the
 * regulation's answer is published.
 *
 * **The build direction is graded against what the builder really emits.** Each
 * build row is checked against the ST-03 the corresponding builder writes for a
 * caller that states no implementation convention reference of its own, read
 * off the emitted segment rather than off any table. A hand-typed expectation
 * would agree with itself forever; this one goes red when a builder moves.
 *
 * **Completeness is derived, not listed.** The readers and builders are
 * enumerated from the package's own public entry point, so a transaction that
 * gains a reader or a builder without gaining a row reds here, naming the
 * export that has no row, and a transaction that arrives one-sided reds instead
 * of shipping an implied second direction.
 *
 * ## The specs below
 *
 * Minimal, synthetic and spec-clean, one per builder, existing only so the
 * emitted ST-03 can be read. No PHI: every identifier, name and code is
 * invented, and the same invented tokens the existing build suites use.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import * as x12 from "../src/index.js";
import type {
  Build270Spec,
  Build271Spec,
  Build276Spec,
  Build277Spec,
  Build278Spec,
  Build820Spec,
  Build834Spec,
  Build835Spec,
  Build837Spec,
  Build999Spec,
  X12Decimal,
  X12Interchange,
  X12Tr3Conformance,
  X12Tr3Direction,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// The regulation, transcribed from the carried source.
// ---------------------------------------------------------------------------

/**
 * Every `005010` identifier 45 CFR 162.920 names, and nothing else. Read from
 * the official GPO XML of the 2024 annual edition, retrieved 2026-08-25;
 * thirteen matches, each occurring once.
 *
 * `005010X216`, `005010X214`, `005010X231A1`, `005010X279A1`, `005010X222A2`,
 * `005010X223A3`, `005010X224A2`, `005010X221A1` and `005010X220A1` are NOT in
 * it, which is what makes every `not-adopted` and `errata-in-practice` row a
 * checkable negative over a complete list rather than an inference.
 */
const CFR_162_920_IDENTIFIERS: ReadonlySet<string> = new Set([
  "005010X212",
  "005010X212E1",
  "005010X217",
  "005010X217E1",
  "005010X218",
  "005010X220",
  "005010X221",
  "005010X222",
  "005010X223",
  "005010X223A1",
  "005010X224",
  "005010X224A1",
  "005010X279",
]);

/**
 * The rows this package must publish, transaction, variant and implemented
 * identifier, in the order the manifest carries them. Locked here so a row that
 * is added, dropped, renamed or re-identified reds against an explicit list as
 * well as against the derivations below.
 */
const EXPECTED_ROWS: readonly (readonly [string, string | null, string | null])[] = [
  ["270", null, "005010X279A1"],
  ["271", null, "005010X279A1"],
  ["276", null, "005010X212"],
  ["277", null, "005010X212"],
  ["277", "277CA", "005010X214"],
  ["278", "request", "005010X217"],
  ["278", "response", "005010X217"],
  ["820", null, "005010X218"],
  ["834", null, "005010X220A1"],
  ["835", null, "005010X221A1"],
  ["837", "P", "005010X222A2"],
  ["837", "I", "005010X223A3"],
  ["837", "D", "005010X224A2"],
  ["999", null, "005010X231A1"],
  ["TA1", null, null],
];

/** `transaction` + `variant`, the key a row is identified by. */
function keyOf(row: Pick<X12Tr3Conformance, "transaction" | "variant">): string {
  return `${row.transaction}|${row.variant ?? ""}`;
}

const ROWS = x12.X12_TR3_CONFORMANCE;
const ROW_BY_KEY: ReadonlyMap<string, X12Tr3Conformance> = new Map(
  ROWS.map((row) => [keyOf(row), row]),
);

function row(transaction: string, variant: string | null): X12Tr3Conformance {
  const found = ROW_BY_KEY.get(keyOf({ transaction, variant }));
  if (found === undefined) throw new Error(`no conformance row for ${transaction}/${variant}`);
  return found;
}

// ---------------------------------------------------------------------------
// What the entry point exposes, derived from the entry point itself.
// ---------------------------------------------------------------------------

/**
 * One implemented direction, attributed to the export that implements it.
 *
 * The rule: an export whose name begins with `get`, `parse` or `build` AND
 * carries a transaction set number is a reader or a builder for that
 * transaction. `buildInterchange`, `getDefaultProfile`, `parseX12`,
 * `serializeX12`, `getSegmentValue` and `getAllSegmentValues` carry a prefix
 * and no transaction number, so they are not attributed to any transaction;
 * the loop-spec and code-list constants that DO carry a number carry none of
 * those prefixes. Types are erased at run time, so a value-key scan never sees
 * `X12_837ServiceLine` and its peers.
 */
interface EntryPointDirection {
  readonly exportName: string;
  readonly transaction: string;
  readonly direction: X12Tr3Direction;
}

/** The direction an export name implements, or `undefined` for neither. */
function directionOfExport(exportName: string): X12Tr3Direction | undefined {
  if (exportName.startsWith("build")) return "build";
  if (exportName.startsWith("get") || exportName.startsWith("parse")) return "read";
  return undefined;
}

/** The transaction set number an export name carries, or `undefined`. */
function transactionOfExport(exportName: string): string | undefined {
  const tail = /^(?:get|parse|build)(.*)$/.exec(exportName);
  if (tail === null) return undefined;
  return /TA1|\d{3}/.exec(tail[1] ?? "")?.[0];
}

/**
 * Every reader and builder among `names`, with the transaction it belongs to.
 *
 * Kept as a free function over its input so the negative controls below can
 * drive it with export lists this package does not have. A derivation that can
 * only be run on the real data cannot be shown to fail.
 */
function entryPointDirections(names: Iterable<string>): readonly EntryPointDirection[] {
  const out: EntryPointDirection[] = [];
  for (const exportName of names) {
    const direction = directionOfExport(exportName);
    const transaction = transactionOfExport(exportName);
    if (direction === undefined || transaction === undefined) continue;
    out.push({ exportName, transaction, direction });
  }
  return out;
}

/** The directions implemented per transaction, as a set per transaction. */
function directionsByTransaction(
  entries: readonly EntryPointDirection[],
): ReadonlyMap<string, ReadonlySet<X12Tr3Direction>> {
  const out = new Map<string, Set<X12Tr3Direction>>();
  for (const entry of entries) {
    const set = out.get(entry.transaction) ?? new Set<X12Tr3Direction>();
    set.add(entry.direction);
    out.set(entry.transaction, set);
  }
  return out;
}

const ENTRY_POINT_EXPORTS: readonly string[] = Object.keys(x12);
const IMPLEMENTED = entryPointDirections(ENTRY_POINT_EXPORTS);
const IMPLEMENTED_DIRECTIONS = directionsByTransaction(IMPLEMENTED);

/** The directions a row set claims per transaction, unioned over its rows. */
function declaredDirections(
  rows: readonly X12Tr3Conformance[],
): ReadonlyMap<string, ReadonlySet<X12Tr3Direction>> {
  const out = new Map<string, Set<X12Tr3Direction>>();
  for (const r of rows) {
    const set = out.get(r.transaction) ?? new Set<X12Tr3Direction>();
    for (const direction of r.directions) set.add(direction);
    out.set(r.transaction, set);
  }
  return out;
}

function sorted(values: Iterable<string>): readonly string[] {
  return [...values].sort();
}

// ---------------------------------------------------------------------------
// Minimal synthetic specs, one per builder. Their only job is to produce an
// emitted ST-03 for AC8; nothing here asserts on their content.
// ---------------------------------------------------------------------------

function dec(value: string): X12Decimal {
  const d = x12.X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

const ENVELOPE = {
  senderId: "SUBMITTER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const SPEC_835: Build835Spec = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalActualPayment: dec("450.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
  payer: {
    entityIdentifierCode: "PR",
    name: "MEDPAY INSURANCE",
    address: { lines: ["123 PAYER WAY"], city: "BALTIMORE", state: "MD", postalCode: "21244" },
  },
  payee: {
    entityIdentifierCode: "PE",
    name: "RENDERING CLINIC",
    idQualifier: "XX",
    idCode: "1234567890",
    address: { lines: ["1 CLINIC PLZ"], city: "COLUMBUS", state: "OH", postalCode: "43004" },
  },
  claims: [
    {
      patientControlNumber: "PT-ACCT-001",
      claimStatusCode: "1",
      totalChargeAmount: dec("500.00"),
      totalPaymentAmount: dec("450.00"),
      patientResponsibilityAmount: dec("50.00"),
      claimFilingIndicatorCode: "MB",
      payerClaimControlNumber: "ICN-9001",
      patient: {
        entityIdentifierCode: "QC",
        lastName: "PATIENT",
        firstName: "TEST",
        idQualifier: "MI",
        idCode: "MEMBER001",
      },
      serviceLines: [
        {
          productServiceIdQualifier: "HC",
          productServiceId: "99213",
          chargeAmount: dec("500.00"),
          paymentAmount: dec("450.00"),
          adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
        },
      ],
    },
  ],
};

function spec837(variant: "P" | "I" | "D"): Build837Spec {
  return {
    envelope: ENVELOPE,
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
          name: "BILLING CLINIC INC",
          idQualifier: "XX",
          idCode: "1234567890",
        },
        subscribers: [
          {
            info: {
              payerResponsibilityCode: "P",
              individualRelationshipCode: "18",
              claimFilingIndicator: "MB",
            },
            subscriber: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              name: "PATIENT",
              firstName: "TEST",
              idQualifier: "MI",
              idCode: "MEMBER001",
            },
            payer: {
              entityIdentifierCode: "PR",
              entityTypeQualifier: "2",
              name: "PAYER ONE",
              idQualifier: "PI",
              idCode: "PAYER01",
            },
            claims: [
              {
                claimId: "PT-ACCT-001",
                totalCharge: dec("150.00"),
                diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
                serviceLines: [
                  variant === "P"
                    ? {
                        variant: "P",
                        procedureQualifier: "HC",
                        procedureCode: "99213",
                        charge: dec("150.00"),
                        unitOfMeasure: "UN",
                        units: dec("1"),
                        diagnosisPointers: ["1"],
                      }
                    : variant === "I"
                      ? {
                          variant: "I",
                          revenueCode: "0120",
                          charge: dec("150.00"),
                          unitOfMeasure: "UN",
                          units: dec("1"),
                        }
                      : {
                          variant: "D",
                          procedureQualifier: "AD",
                          procedureCode: "D0120",
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
  };
}

const SPEC_270: Build270Spec = {
  envelope: ENVELOPE,
  header: { referenceId: "REQ-0001" },
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
              inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
            },
          ],
        },
      ],
    },
  ],
};

const SPEC_271: Build271Spec = {
  envelope: ENVELOPE,
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
              traces: [{ traceTypeCode: "2", referenceId: "ELIG20260627001" }],
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastName: "DOE",
                firstName: "JANE",
                idQualifier: "MI",
                idCode: "MBR0001",
              },
              benefits: [
                {
                  eligibilityCode: "1",
                  coverageLevelCode: "IND",
                  serviceTypeCodes: [{ code: "30" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const SPEC_277: Build277Spec = {
  envelope: ENVELOPE,
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
            entityIdentifierCode: "41",
            entityTypeQualifier: "2",
            name: "CLEARINGHOUSE",
            idQualifier: "46",
            idCode: "CH001",
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
              subscribers: [
                {
                  member: {
                    entityIdentifierCode: "QC",
                    entityTypeQualifier: "1",
                    lastName: "DOE",
                    firstName: "JANE",
                    idQualifier: "MI",
                    idCode: "MBR0001",
                  },
                  claims: [
                    {
                      trace: { traceTypeCode: "2", referenceId: "CLAIM20260627001" },
                      statuses: [
                        {
                          statuses: [{ categoryCode: "A2", statusCode: "20" }],
                          statusEffectiveDate: "20260627",
                          totalChargeAmount: dec("150.00"),
                        },
                      ],
                      serviceLines: [
                        {
                          serviceIdQualifier: "HC",
                          procedureCode: "99213",
                          lineChargeAmount: dec("150.00"),
                          unitsOfService: dec("2"),
                          statuses: [{ statuses: [{ categoryCode: "F2", statusCode: "65" }] }],
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
    },
  ],
};

const SPEC_276: Build276Spec = {
  envelope: ENVELOPE,
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
            entityIdentifierCode: "41",
            entityTypeQualifier: "2",
            lastNameOrOrganizationName: "CLEARINGHOUSE",
            idQualifier: "46",
            idCode: "CH001",
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
                      trace: { traceTypeCode: "1", referenceId: "STATUS20260627001" },
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
};

const SPEC_278: Build278Spec = {
  envelope: ENVELOPE,
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
    name: "UTILIZATION REVIEW CO",
    idQualifier: "PI",
    idCode: "UMO001",
  },
  requester: {
    entityIdentifierCode: "1P",
    entityTypeQualifier: "2",
    name: "RENDERING CLINIC",
    idQualifier: "XX",
    idCode: "1234567893",
  },
  subscriber: {
    member: {
      entityIdentifierCode: "IL",
      entityTypeQualifier: "1",
      lastName: "DOE",
      firstName: "JANE",
      idQualifier: "MI",
      idCode: "MBR0001",
    },
    reviews: [
      {
        levelCode: "EV",
        requestCategoryCode: "HS",
        certificationTypeCode: "I",
        serviceTypeCode: "1",
        traces: [
          {
            traceTypeCode: "1",
            referenceId: "AUTHREQ-202606-0001",
            originatingCompanyId: "9SUBMITTER",
          },
        ],
      },
    ],
  },
};

const SPEC_820: Build820Spec = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: dec("12500.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentFormatCode: "CTX",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "PREM-202606", originatingCompanyId: "1512345678" }],
  receiver: {
    entityIdentifierCode: "PE",
    name: "MEDPAY INSURANCE",
    idQualifier: "FI",
    idCode: "FEIN999",
  },
  remitter: {
    entityIdentifierCode: "PR",
    name: "EMPLOYER CO",
    idQualifier: "FI",
    idCode: "FEIN123",
  },
  remittances: [
    {
      individual: {
        entityIdentifierCode: "IL",
        lastName: "DOE",
        firstName: "JANE",
        idQualifier: "34",
        idCode: "MBR0001",
      },
      openItems: [
        {
          qualifier: "AZ",
          referenceId: "POL-0001",
          amountPaid: dec("250.00"),
        },
      ],
    },
  ],
};

const SPEC_834: Build834Spec = {
  envelope: ENVELOPE,
  header: {
    transactionSetPurposeCode: "00",
    referenceId: "FILE-202606",
    date: "20260601",
    time: "1200",
    actionCode: "2",
    sponsor: {
      entityIdentifierCode: "P5",
      name: "EMPLOYER CO",
      idQualifier: "FI",
      idCode: "FEIN123",
    },
    payer: {
      entityIdentifierCode: "IN",
      name: "MEDPAY INSURANCE",
      idQualifier: "FI",
      idCode: "FEIN999",
    },
  },
  members: [
    {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021",
      member: {
        lastName: "DOE",
        firstName: "JANE",
        idQualifier: "34",
        idCode: "MBR0001",
      },
    },
  ],
};

const SPEC_999: Build999Spec = {
  envelope: ENVELOPE,
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
        implementationConventionReference: "005010X222A2",
        disposition: "A",
      },
    ],
  },
};

/** The ST-03 of the single transaction set in a built interchange. */
function st03(ix: X12Interchange): string {
  const value = ix.groups[0]?.transactions[0]?.st.elements[3];
  if (value === undefined) throw new Error("the built interchange carries no ST-03");
  return value;
}

/**
 * What each builder writes into ST-03 for a caller that states no
 * implementation convention reference of its own, keyed the way a row is.
 * Read off the emitted segment, never off a constant in `src/`.
 *
 * `TA1` is absent deliberately: `buildTA1` emits an envelope-level SEGMENT and
 * no transaction set, so there is no ST-03 to read. That is asserted on its own
 * below, beside the row's null identifier.
 */
const EMITTED_ST03: ReadonlyMap<string, string> = new Map([
  ["270|", st03(x12.build270(SPEC_270))],
  ["271|", st03(x12.build271(SPEC_271))],
  ["276|", st03(x12.build276(SPEC_276))],
  ["277|", st03(x12.build277(SPEC_277))],
  ["277|277CA", st03(x12.build277CA(SPEC_277))],
  ["278|request", st03(x12.build278Request(SPEC_278))],
  ["278|response", st03(x12.build278Response(SPEC_278))],
  ["820|", st03(x12.build820(SPEC_820))],
  ["834|", st03(x12.build834(SPEC_834))],
  ["835|", st03(x12.build835(SPEC_835))],
  ["837|P", st03(x12.build837P(spec837("P")))],
  ["837|I", st03(x12.build837I(spec837("I")))],
  ["837|D", st03(x12.build837D(spec837("D")))],
  ["999|", st03(x12.build999(SPEC_999))],
]);

// ---------------------------------------------------------------------------
// AC1: every transaction with a reader or builder states its identifier.
// ---------------------------------------------------------------------------

describe("AC1: the manifest names the identifier each transaction implements", () => {
  it("carries exactly the expected rows, in order, with their identifiers", () => {
    expect(ROWS.map((r) => [r.transaction, r.variant, r.tr3])).toEqual(
      EXPECTED_ROWS.map((r) => [...r]),
    );
  });

  it("gives every transaction with a reader or builder at least one row", () => {
    const covered = new Set(ROWS.map((r) => r.transaction));
    for (const transaction of IMPLEMENTED_DIRECTIONS.keys()) {
      expect(covered.has(transaction), `no manifest row for transaction ${transaction}`).toBe(true);
    }
  });

  it("carries the errata suffix where the implemented document has one", () => {
    // A row that dropped the suffix would name the base document, which is a
    // different specification and, for four of these, a different conformance
    // claim.
    expect(row("270", null).tr3).toBe("005010X279A1");
    expect(row("834", null).tr3).toBe("005010X220A1");
    expect(row("835", null).tr3).toBe("005010X221A1");
    expect(row("837", "I").tr3).toBe("005010X223A3");
  });

  it("spells every identifier in the published form", () => {
    for (const r of ROWS) {
      if (r.tr3 === null) continue;
      expect(r.tr3, `${keyOf(r)} identifier`).toMatch(/^005010X\d{3}(?:[A-Z]\d)?$/);
    }
  });
});

// ---------------------------------------------------------------------------
// AC2: each identifier is recorded as adopted or as an errata in practice.
// ---------------------------------------------------------------------------

describe("AC2: each row records how its identifier stands against 45 CFR 162.920", () => {
  it("names an adoption for every row", () => {
    for (const r of ROWS) {
      expect(["incorporated-by-reference", "errata-in-practice", "not-adopted"]).toContain(
        r.adoption,
      );
    }
  });

  it("derives adoption from the section's own list, both directions", () => {
    for (const r of ROWS) {
      const named = r.tr3 !== null && r.cfrAdopted.includes(r.tr3);
      if (r.adoption === "incorporated-by-reference") {
        expect(named, `${keyOf(r)} is incorporated but the section does not name its tr3`).toBe(
          true,
        );
      } else if (r.adoption === "errata-in-practice") {
        expect(named, `${keyOf(r)} is an errata revision but the section names it`).toBe(false);
        expect(r.cfrAdopted.length, `${keyOf(r)} dropped the adopted identifier`).toBeGreaterThan(
          0,
        );
      } else {
        expect(r.cfrAdopted, `${keyOf(r)} is not adopted but carries adopted identifiers`).toEqual(
          [],
        );
      }
    }
  });

  it("carries no identifier the section does not name, and leaves none of them out", () => {
    const claimed = new Set<string>();
    for (const r of ROWS) for (const id of r.cfrAdopted) claimed.add(id);
    for (const id of claimed) {
      expect(CFR_162_920_IDENTIFIERS.has(id), `${id} is not named at 45 CFR 162.920`).toBe(true);
    }
    // This package implements every transaction the section names a 005010
    // identifier for, so the two sets are equal today. A row that stopped
    // carrying one reds here rather than going quiet.
    expect(sorted(claimed)).toEqual(sorted(CFR_162_920_IDENTIFIERS));
  });

  it("keeps the adopted identifier alongside the errata rather than replacing it", () => {
    expect(row("270", null).cfrAdopted).toEqual(["005010X279"]);
    expect(row("271", null).cfrAdopted).toEqual(["005010X279"]);
    expect(row("834", null).cfrAdopted).toEqual(["005010X220"]);
    expect(row("835", null).cfrAdopted).toEqual(["005010X221"]);
    expect(row("837", "P").cfrAdopted).toEqual(["005010X222"]);
    expect(row("837", "I").cfrAdopted).toEqual(["005010X223", "005010X223A1"]);
    expect(row("837", "D").cfrAdopted).toEqual(["005010X224", "005010X224A1"]);
  });
});

// ---------------------------------------------------------------------------
// AC3 + AC5: directions are stated, derived, and never implied.
// ---------------------------------------------------------------------------

describe("AC3: an asymmetric transaction states the asymmetry", () => {
  it("states a non-empty, duplicate-free direction set on every row", () => {
    for (const r of ROWS) {
      expect(r.directions.length, `${keyOf(r)} has no directions`).toBeGreaterThan(0);
      expect(new Set(r.directions).size, `${keyOf(r)} repeats a direction`).toBe(
        r.directions.length,
      );
      for (const d of r.directions) expect(["read", "build"]).toContain(d);
    }
  });

  it("reports a reader with no builder as read alone", () => {
    // The negative control: no transaction is one-sided at this commit, so the
    // rule is driven against an export list where one is. Without it, the
    // agreement asserted below would be vacuous the day a builder is removed.
    const oneSided = directionsByTransaction(
      entryPointDirections(["get999", "parse999", "build835", "get835"]),
    );
    expect(sorted(oneSided.get("999") ?? [])).toEqual(["read"]);
    expect(sorted(oneSided.get("835") ?? [])).toEqual(["build", "read"]);
  });

  it("would red if a row claimed a direction the entry point does not implement", () => {
    const declared = declaredDirections([{ ...row("999", null), directions: ["read", "build"] }]);
    const implemented = directionsByTransaction(entryPointDirections(["parse999"]));
    expect(sorted(declared.get("999") ?? [])).not.toEqual(sorted(implemented.get("999") ?? []));
  });
});

describe("AC5: completeness is derived from the entry point", () => {
  it("finds the readers and builders and skips the exports that carry no transaction", () => {
    const names = IMPLEMENTED.map((entry) => entry.exportName);
    expect(names).toContain("get835");
    expect(names).toContain("build837D");
    expect(names).toContain("parse999");
    expect(names).toContain("buildTA1");
    expect(names).not.toContain("parseX12");
    expect(names).not.toContain("buildInterchange");
    expect(names).not.toContain("getDefaultProfile");
    expect(names).not.toContain("serializeX12");
    expect(names.length).toBeGreaterThan(0);
  });

  it("names any export whose transaction has no row", () => {
    const covered = new Set(ROWS.map((r) => r.transaction));
    const orphans = IMPLEMENTED.filter((entry) => !covered.has(entry.transaction)).map(
      (entry) => `${entry.exportName} (transaction ${entry.transaction})`,
    );
    expect(orphans, "these entry-point exports have no conformance row").toEqual([]);
  });

  it("carries no row for a transaction the entry point does not implement", () => {
    const implemented = new Set(IMPLEMENTED_DIRECTIONS.keys());
    for (const r of ROWS) {
      expect(implemented.has(r.transaction), `${keyOf(r)} has no reader and no builder`).toBe(true);
    }
  });

  it("agrees with the entry point on the directions of every transaction", () => {
    const declared = declaredDirections(ROWS);
    expect(sorted(declared.keys())).toEqual(sorted(IMPLEMENTED_DIRECTIONS.keys()));
    for (const [transaction, directions] of IMPLEMENTED_DIRECTIONS) {
      expect(sorted(declared.get(transaction) ?? []), `directions for ${transaction}`).toEqual(
        sorted(directions),
      );
    }
  });
});

// ---------------------------------------------------------------------------
// AC4 + AC13: the 278 names one document for both directions.
// ---------------------------------------------------------------------------

describe("AC4: the 278 names 005010X217 for both directions", () => {
  it("names it on the request and on the response", () => {
    expect(row("278", "request").tr3).toBe("005010X217");
    expect(row("278", "response").tr3).toBe("005010X217");
  });

  it("names no separate response document as the 278 conformance target", () => {
    for (const r of ROWS) {
      expect(r.tr3, `${keyOf(r)} names a document 45 CFR 162.920 does not adopt`).not.toBe(
        "005010X216",
      );
      expect(r.cfrAdopted).not.toContain("005010X216");
    }
  });
});

const SRC_INDEX = readFileSync(join(import.meta.dirname, "..", "src", "index.ts"), "utf8");

/**
 * The `//` section comment sitting directly above the export block that
 * re-exports `moduleSpecifier`, which is how this entry point declares each
 * transaction surface.
 */
function sectionDeclaration(source: string, moduleSpecifier: string): string {
  const lines = source.split("\n");
  const end = lines.findIndex((line) => line.includes(moduleSpecifier));
  if (end < 0) throw new Error(`src/index.ts no longer re-exports ${moduleSpecifier}`);
  let start = end;
  while (start > 0 && !(lines[start] ?? "").startsWith("export ")) start -= 1;
  const comment: string[] = [];
  for (let i = start - 1; i >= 0 && (lines[i] ?? "").trimStart().startsWith("//"); i -= 1) {
    comment.unshift(lines[i] ?? "");
  }
  if (comment.length === 0)
    throw new Error(`no section comment above the ${moduleSpecifier} block`);
  return comment.join("\n");
}

describe("AC13: the entry point does not declare 005010X216 as a conformance target", () => {
  it("declares the 278 surface without it", () => {
    const declaration = sectionDeclaration(SRC_INDEX, "./transactions/auth/index.js");
    expect(declaration).toContain("005010X217");
    expect(declaration).not.toContain("005010X216");
  });

  it("leaves the identifier nowhere on the entry point at all", () => {
    // The 278 section was the only carrier at this commit. Asserting over the
    // whole file rather than the one block keeps a future declaration from
    // re-publishing the claim somewhere else in it.
    expect(SRC_INDEX).not.toContain("005010X216");
  });

  it("still declares the other transaction surfaces it declared before", () => {
    // The correction is scoped to the 278: the other section comments carry
    // their identifiers unchanged.
    expect(sectionDeclaration(SRC_INDEX, "./transactions/remit/index.js")).toContain(
      "005010X221A1",
    );
    expect(sectionDeclaration(SRC_INDEX, "./transactions/premium/index.js")).toContain(
      "005010X218",
    );
    expect(sectionDeclaration(SRC_INDEX, "./transactions/enrollment/index.js")).toContain(
      "005010X220A1",
    );
  });
});

// ---------------------------------------------------------------------------
// AC6: an errata row carries the adopted identifier and a note.
// ---------------------------------------------------------------------------

describe("AC6: an errata row keeps the adopted identifier and says why", () => {
  it("carries a non-empty note on every row whose identifier the section does not name", () => {
    for (const r of ROWS) {
      if (r.cfrAdopted.length === 0) continue;
      if (r.tr3 !== null && r.cfrAdopted.includes(r.tr3)) continue;
      expect(r.note, `${keyOf(r)} names an unadopted identifier with no note`).not.toBeNull();
      expect((r.note ?? "").length, `${keyOf(r)} note is empty`).toBeGreaterThan(0);
    }
  });

  it("records the eligibility contradiction on the 270 and the 271", () => {
    for (const r of [row("270", null), row("271", null)]) {
      const note = r.note ?? "";
      expect(note).toContain("005010X279A1");
      expect(note).toContain("005010X279");
      expect(note).toContain("45 CFR 162.920");
      expect(note).toContain("CORE 259");
      expect(note.toLowerCase()).toContain("adopted");
    }
  });

  it("asserts no winner between the two readings", () => {
    for (const r of [row("270", null), row("271", null)]) {
      const note = (r.note ?? "").toLowerCase();
      for (const verdict of ["prevails", "takes precedence", "overrides", "supersedes", "wins"]) {
        expect(
          note,
          `the ${r.transaction} note decides a question this package cannot`,
        ).not.toContain(verdict);
      }
      expect(note).toContain("not settled");
    }
  });
});

// ---------------------------------------------------------------------------
// AC7: a transaction named nowhere in the section is reported as not adopted.
// ---------------------------------------------------------------------------

describe("AC7: the unadopted transactions are reported as unadopted", () => {
  it("is exactly the 277CA, the 999 and the TA1", () => {
    const notAdopted = ROWS.filter((r) => r.adoption === "not-adopted").map(keyOf);
    expect(notAdopted).toEqual(["277|277CA", "999|", "TA1|"]);
  });

  it("carries no adopted identifier for any of them", () => {
    for (const key of ["277|277CA", "999|", "TA1|"]) {
      const r = ROW_BY_KEY.get(key);
      expect(r?.cfrAdopted).toEqual([]);
      expect(r?.adoption).not.toBe("incorporated-by-reference");
    }
  });

  it("records on each of them that the section names no identifier for it", () => {
    for (const key of ["277|277CA", "999|", "TA1|"]) {
      const note = ROW_BY_KEY.get(key)?.note ?? "";
      expect(note.length, `${key} has no note`).toBeGreaterThan(0);
      expect(note, `${key} note does not cite the section`).toContain("45 CFR 162.920");
      expect(note.toLowerCase()).toContain("names no identifier");
    }
  });

  it("names the identifiers this package implements for two of them anyway", () => {
    // Not adopted is not the same as not implemented: the 277CA and the 999
    // have published guides, they are simply not incorporated by reference.
    expect(row("277", "277CA").tr3).toBe("005010X214");
    expect(row("999", null).tr3).toBe("005010X231A1");
  });
});

// ---------------------------------------------------------------------------
// AC8: a build row names what the builder really emits.
// ---------------------------------------------------------------------------

describe("AC8: every build row agrees with the emitted ST-03", () => {
  it("covers every build row that emits a transaction set", () => {
    const buildRows = ROWS.filter((r) => r.directions.includes("build")).map(keyOf);
    expect(buildRows).toEqual([...EXPECTED_ROWS.map(([t, v]) => `${t}|${v ?? ""}`)]);
    expect(sorted(EMITTED_ST03.keys())).toEqual(sorted(buildRows.filter((k) => k !== "TA1|")));
  });

  it("names the identifier the builder writes, on every row but one", () => {
    for (const r of ROWS) {
      if (!r.directions.includes("build")) continue;
      const emitted = EMITTED_ST03.get(keyOf(r));
      if (emitted === undefined) continue;
      if (keyOf(r) === "278|response") continue;
      expect(r.tr3, `${keyOf(r)} does not name what its builder emits (${emitted})`).toBe(emitted);
    }
  });

  it("permits exactly one divergence, the 278 response", () => {
    const diverging = ROWS.filter((r) => {
      const emitted = EMITTED_ST03.get(keyOf(r));
      return emitted !== undefined && emitted !== r.tr3;
    }).map(keyOf);
    expect(diverging).toEqual(["278|response"]);
    expect(EMITTED_ST03.get("278|response")).toBe("005010X216");
  });

  it("records the divergence in the 278 response note", () => {
    const note = row("278", "response").note ?? "";
    expect(note).toContain("005010X216");
    expect(note).toContain("45 CFR 162.920");
    expect(note).toContain("unchanged");
  });

  it("leaves the emitted value alone", () => {
    // The out-of-scope half, pinned so a later change to what goes on the wire
    // is a deliberate one with its own evidence rather than a side effect of a
    // declaration change.
    expect(st03(x12.build278Response(SPEC_278))).toBe("005010X216");
    expect(st03(x12.build278Request(SPEC_278))).toBe("005010X217");
  });

  it("reads the TA1 row against a builder that emits no transaction set", () => {
    const ta1 = x12.buildTA1({
      interchangeControlNumber: "000000019",
      interchangeDate: "250101",
      interchangeTime: "1200",
      ackCode: "A",
      noteCode: "000",
    });
    expect(ta1.elements[0]).toBe("TA1");
    expect(Object.hasOwn(ta1, "groups")).toBe(false);
    expect(row("TA1", null).tr3).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC9: no empty values anywhere, and a null identifier says why.
// ---------------------------------------------------------------------------

describe("AC9: a row is never empty where it looks populated", () => {
  it("carries a null identifier with a note, and never an empty string", () => {
    for (const r of ROWS) {
      if (r.tr3 === null) {
        expect((r.note ?? "").length, `${keyOf(r)} has a null tr3 and no note`).toBeGreaterThan(0);
      } else {
        expect(r.tr3.length, `${keyOf(r)} carries an empty identifier`).toBeGreaterThan(0);
      }
    }
  });

  it("is the TA1 row alone, and its note says why", () => {
    expect(ROWS.filter((r) => r.tr3 === null).map(keyOf)).toEqual(["TA1|"]);
    const note = row("TA1", null).note ?? "";
    expect(note.toLowerCase()).toContain("envelope");
    expect(note.toLowerCase()).toContain("no implementation guide identifier names it");
  });

  it("carries no empty title, direction list, identifier or note anywhere", () => {
    for (const r of ROWS) {
      expect(r.transaction.length, `${keyOf(r)} transaction`).toBeGreaterThan(0);
      expect(r.title.trim().length, `${keyOf(r)} title`).toBeGreaterThan(0);
      expect(r.directions.length, `${keyOf(r)} directions`).toBeGreaterThan(0);
      expect(r.variant, `${keyOf(r)} variant`).not.toBe("");
      expect(r.note, `${keyOf(r)} note`).not.toBe("");
      for (const id of r.cfrAdopted) expect(id.length, `${keyOf(r)} cfrAdopted`).toBeGreaterThan(0);
    }
  });

  it("gives every row a distinct key", () => {
    expect(new Set(ROWS.map(keyOf)).size).toBe(ROWS.length);
  });
});

// ---------------------------------------------------------------------------
// AC10: the 276 and the 277 are two halves of ONE guide, and both are here.
//
// This block used to assert the OPPOSITE, because the package implemented the
// 277 half alone: no 276 row, no 276 reader or builder, and a note on the 277
// row saying so. The 276 shipped, so the assertions are inverted rather than
// deleted - what they are for is that the row set and the entry point agree
// about this pair, in whichever direction the truth runs.
// ---------------------------------------------------------------------------

describe("AC10: the 276 and 277 halves of 005010X212 each carry a row", () => {
  it("carries a 276 row naming the same guide as the 277", () => {
    expect(row("276", null).tr3).toBe("005010X212");
    expect(row("276", null).tr3).toBe(row("277", null).tr3);
    expect(row("276", null).title).toContain("Request");
    expect(row("277", null).title).toContain("Response");
  });

  it("has a 276 reader and a 276 builder to justify it", () => {
    expect(
      sorted(IMPLEMENTED.filter((e) => e.transaction === "276").map((e) => e.direction)),
    ).toEqual(["build", "read", "read"]);
    expect(
      sorted(
        ENTRY_POINT_EXPORTS.filter(
          (name) => /^(?:get|parse|build)/.test(name) && name.includes("276"),
        ),
      ),
    ).toEqual(["build276", "get276StatusInquiry", "parse276StatusInquiries"]);
  });

  it("records on both rows that the adopted identifier covers the pair", () => {
    for (const transaction of ["276", "277"]) {
      const note = row(transaction, null).note ?? "";
      expect(note).toContain("005010X212");
      expect(note).toContain("276");
      expect(note).toContain("277");
      expect(note.toLowerCase()).toContain("half");
    }
  });

  it("gives the two halves the same adoption and the same adopted identifiers", () => {
    expect(row("276", null).adoption).toBe(row("277", null).adoption);
    expect(row("276", null).cfrAdopted).toEqual(row("277", null).cfrAdopted);
    // And they are NOT the same array object, so a consumer holding one cannot
    // change what a reader of the other sees.
    expect(row("276", null).cfrAdopted).not.toBe(row("277", null).cfrAdopted);
  });
});

// ---------------------------------------------------------------------------
// AC11: a consumer cannot change what a later reader sees.
// ---------------------------------------------------------------------------

/**
 * Try `mutate` and swallow the `TypeError` a frozen target raises under the
 * module strict mode a consumer's code also runs in. The assertion is on what
 * the value reads back as, never on whether it threw: silent refusal and a
 * throw are both correct, and a consumer may see either depending on how its
 * own bundle is compiled.
 */
function attempt(mutate: () => void): void {
  try {
    mutate();
  } catch (error: unknown) {
    if (!(error instanceof TypeError)) throw error;
  }
}

describe("AC11: the manifest cannot be mutated", () => {
  it("is frozen at every level", () => {
    expect(Object.isFrozen(x12.X12_TR3_CONFORMANCE)).toBe(true);
    for (const r of ROWS) {
      expect(Object.isFrozen(r), `${keyOf(r)} is not frozen`).toBe(true);
      expect(Object.isFrozen(r.directions), `${keyOf(r)} directions`).toBe(true);
      expect(Object.isFrozen(r.cfrAdopted), `${keyOf(r)} cfrAdopted`).toBe(true);
    }
  });

  it("leaves every observable value unchanged after an attempted mutation", () => {
    const before = JSON.stringify(x12.X12_TR3_CONFORMANCE);
    // The casts are the point of the test: a consumer reaching past the
    // readonly types is exactly the case AC11 is about, and there is no way to
    // attempt the mutation while respecting them.
    const list = x12.X12_TR3_CONFORMANCE as X12Tr3Conformance[];
    const first = list[0] as { transaction: string; tr3: string | null; note: string | null };
    const directions = list[0]?.directions as X12Tr3Direction[];
    const adopted = list[0]?.cfrAdopted as string[];

    attempt(() => list.push(row("835", null)));
    attempt(() => list.pop());
    attempt(() => {
      list[0] = row("999", null);
    });
    attempt(() => {
      first.transaction = "000";
    });
    attempt(() => {
      first.tr3 = "005010X999";
    });
    attempt(() => {
      first.note = null;
    });
    attempt(() => directions.push("build"));
    attempt(() => {
      directions[0] = "build";
    });
    attempt(() => adopted.push("005010X216"));
    attempt(() => {
      adopted[0] = "005010X216";
    });

    expect(JSON.stringify(x12.X12_TR3_CONFORMANCE)).toBe(before);
    expect(x12.X12_TR3_CONFORMANCE).toHaveLength(EXPECTED_ROWS.length);
    expect(row("270", null).tr3).toBe("005010X279A1");
    expect(row("270", null).cfrAdopted).toEqual(["005010X279"]);
    expect(row("270", null).directions).toEqual(["read", "build"]);
  });

  it("does not share one array between two rows", () => {
    const a = row("270", null);
    const b = row("271", null);
    expect(a.directions).not.toBe(b.directions);
    expect(a.cfrAdopted).not.toBe(b.cfrAdopted);
  });
});

// ---------------------------------------------------------------------------
// AC12: the entry point alone, with no subpath.
// ---------------------------------------------------------------------------

describe("AC12: the manifest and its types come from the entry point", () => {
  it("resolves from the package entry point", () => {
    // The type-only import at the top of this file is the other half: it names
    // X12Tr3Conformance and X12Tr3Direction from the same entry point, so a
    // type that stopped being re-exported fails the typecheck.
    expect(Array.isArray(x12.X12_TR3_CONFORMANCE)).toBe(true);
    expect(ENTRY_POINT_EXPORTS).toContain("X12_TR3_CONFORMANCE");
  });

  it("publishes no subpath a consumer could reach it through instead", () => {
    const manifest = JSON.parse(
      readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8"),
    ) as { exports?: Record<string, unknown> };
    expect(sorted(Object.keys(manifest.exports ?? {}))).toEqual([".", "./package.json"]);
  });
});

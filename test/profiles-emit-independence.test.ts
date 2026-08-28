/**
 * THE EMIT INDEPENDENCE LOCK. A trading-partner profile in this package
 * DESCRIBES what a partner sends. It must never widen, narrow or otherwise
 * touch what this library EMITS.
 *
 * Until this file existed the property held by construction and by nobody
 * having written the line that breaks it, which is the weakest form a safety
 * property can take: the next person to add a profile-aware convenience to the
 * emit path met no test, no type and no reviewer note. The stake is a consumer's:
 * a profile that widened the emit would put a non-conformant document on the
 * wire, and 45 CFR 162.915 forbids the trading partner from having asked for
 * that in the first place. A denied claim is the outcome.
 *
 * What is locked here, and how:
 *
 * 1. **Byte equality, not model equality.** Every comparison below is on the
 *    emitted STRING (`serializeX12`'s return, or `Ta1Segment.raw`), never on a
 *    parsed re-read. A re-read launders exactly the differences this lock
 *    exists to catch: padding, element framing and escape fidelity all survive
 *    a model comparison and none of them survives a byte comparison.
 *
 * 2. **The covered builder set is DERIVED from the package root's exports**,
 *    never hand-listed. `EXPORTED_BUILDERS` reads `build*` off the barrel at
 *    run time and the registry below must cover it exactly, so a builder added
 *    later REDS this file naming itself rather than slipping past the check it
 *    was never added to. The reverse direction is asserted too: a registry
 *    entry for a name the root does not export is a stale case, not coverage.
 *
 * 3. **Refusal parity is part of the property.** A profile must not turn a
 *    refusal into an emission or an emission into a refusal, so each builder is
 *    driven at BOTH outcomes and the whole outcome is compared: the error's
 *    constructor `name`, its `code`, and its `message`. Comparing only "it
 *    threw" would pass a profile that changed which error you get.
 *
 * 4. **Both routes by which a profile is active.** A profile is active when it
 *    is registered process-wide via `setDefaultProfile`, and when it is
 *    supplied for a single call via the documented `profile` option. The second
 *    route does not exist on the emit surface at all, which is the point: it is
 *    exercised through `parseX12(raw, { profile })`, whose result is then
 *    serialized, and through a JS caller pushing a `profile` key into
 *    `SerializeOptions`.
 *
 * 5. **A structural guard beside the behavioural one.** The behavioural lock
 *    catches a profile that CHANGES the bytes. It cannot catch a profile that
 *    is consulted and happens not to change them today, which is the state one
 *    edit away from breaking. So the emit modules are also read from disk and
 *    asserted to import nothing from `src/profiles/`. The dependency in the
 *    other direction is fine and deliberate: `src/profiles/validate.ts` uses the
 *    builder's caller-value renderers.
 *
 * This file adds NO fixture. It runs over the corpus that exists.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import * as rootExports from "../src/index.js";
import {
  build270,
  build271,
  build276,
  build277,
  build277CA,
  build278Request,
  build278Response,
  build820,
  build834,
  build835,
  build837D,
  build837I,
  build837P,
  build999,
  buildInterchange,
  buildTA1,
  defineProfile,
  parseX12,
  profiles,
  serializeX12,
  setDefaultProfile,
  X12Decimal,
} from "../src/index.js";
import type {
  Build270Spec,
  Build271Spec,
  Build276Spec,
  Build277Spec,
  Build278Spec,
  Build820Spec,
  Build834Spec,
  Build835Spec,
  Build837ServiceLineSpec,
  Build837Spec,
  Build999Spec,
  BuildTA1Spec,
  InterchangeSpec,
  SerializeOptions,
  X12Interchange,
  X12Profile,
} from "../src/index.js";

const SRC_ROOT = join(__dirname, "..", "src");
const FIXTURE_ROOT = join(__dirname, "fixtures");

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

/**
 * Launder a value into a typed slot, for the one case below that models a
 * JavaScript caller reaching a key the TypeScript types say is unreachable.
 * The types are not a runtime guarantee, and this lock is about run time.
 */
function asJsCaller<T>(value: unknown): T {
  return value as T;
}

afterEach(() => {
  // The process-scoped default is the only mutable module state in the
  // library. Reset it after every test so an activation cannot bleed into
  // another file's baseline.
  setDefaultProfile(null);
});

// ---------------------------------------------------------------------------
// The profile activations every comparison below is run under.
// ---------------------------------------------------------------------------

/**
 * A caller-defined profile carrying at least one quirk in EACH of the three
 * effect buckets. The built-ins between them ship only `relaxes` and `adds`, so
 * without this one the `requires` bucket would never reach the emit path at
 * all. Both fixtures cited are real committed corpus files (the hard rule:
 * no quirk without a demonstrating fixture).
 */
const KITCHEN_SINK: X12Profile = defineProfile({
  name: "emit-independence-probe",
  description: "Caller-defined probe carrying a relaxes, an adds and a requires quirk",
  quirks: [
    {
      id: "probe-relaxes",
      effect: "relaxes",
      summary: "Partner sends a non-colon ISA-16 component separator.",
      fixture: "envelope/bcbs-subelement.edi",
      sourceCategory: "emit-independence probe",
    },
    {
      id: "probe-adds",
      effect: "adds",
      summary: "Partner adds a payer-loop REF segment.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "emit-independence probe",
      conformance: "undetermined",
    },
    {
      id: "probe-requires",
      effect: "requires",
      summary: "Partner mandates a normally-situational service-line REF.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "emit-independence probe",
      conformance: "not-permitted",
    },
  ],
});

/**
 * One way of having a profile active. `perCall` is the documented single-call
 * `profile` option; `setDefault` is the process-wide registration. The baseline
 * uses neither and is the value every other activation is compared against.
 */
interface Activation {
  readonly name: string;
  readonly asDefault?: X12Profile;
  readonly perCall?: X12Profile;
}

const ACTIVATIONS: readonly Activation[] = [
  { name: "availity as the process default", asDefault: profiles.availity },
  { name: "bcbsCommon as the process default", asDefault: profiles.bcbsCommon },
  {
    name: "a caller-defined relaxes/adds/requires profile as the default",
    asDefault: KITCHEN_SINK,
  },
  { name: "availity supplied per call", perCall: profiles.availity },
  { name: "the caller-defined profile supplied per call", perCall: KITCHEN_SINK },
];

/** Register (or clear) the process-wide default this activation implies. */
function activate(a: Activation | undefined): void {
  setDefaultProfile(a?.asDefault ?? null);
}

/**
 * Parse under an activation. The per-call route reaches the emit path through
 * the model: `ix.profile` is attribution the serializer must ignore.
 */
function parseUnder(a: Activation | undefined, raw: string): X12Interchange {
  activate(a);
  const perCall = a?.perCall;
  return perCall === undefined ? parseX12(raw) : parseX12(raw, { profile: perCall });
}

// ---------------------------------------------------------------------------
// Outcomes: an emit and a refusal are two halves of one comparison.
// ---------------------------------------------------------------------------

/**
 * Everything a caller can observe from one builder call, in a shape that
 * compares whole. Capturing the refusal alongside the emit is what makes
 * "a profile turned a refusal into an emission" a failing assertion rather
 * than a case nobody wrote.
 */
type Outcome =
  | { readonly kind: "emitted"; readonly bytes: string }
  | {
      readonly kind: "refused";
      readonly error: string;
      readonly code: unknown;
      readonly message: string;
    };

function capture(run: () => string): Outcome {
  try {
    return { kind: "emitted", bytes: run() };
  } catch (err) {
    return {
      kind: "refused",
      // The constructor name, not `instanceof`: it distinguishes
      // `Claim837BuildError` from `X12BuildError` in the compared value
      // itself, so a swapped error type shows up in the diff.
      error: (err as object).constructor.name,
      code: (err as { code?: unknown }).code,
      message: (err as Error).message,
    };
  }
}

// ---------------------------------------------------------------------------
// One case per exported builder. Specs are synthetic throughout and reuse the
// placeholder tokens the rest of the corpus already declares.
// ---------------------------------------------------------------------------

const ENVELOPE = {
  senderId: "SUBMITTER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

/**
 * The one refusal every emitting module in this package shares: an interchange
 * control number longer than the 9-character ISA-13 fixed width. Using the same
 * refusal across the registry keeps the A6 comparison about the PROFILE and not
 * about which guard happened to fire.
 */
const OVER_LONG_CONTROL_NUMBER = "0123456789";
const BAD_ENVELOPE = { ...ENVELOPE, interchangeControlNumber: OVER_LONG_CONTROL_NUMBER } as const;

const INTERCHANGE_SPEC: InterchangeSpec = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "250101",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groups: [
    {
      functionalIdCode: "HC",
      groupControlNumber: "1",
      versionRelease: "005010X222A2",
      transactions: [
        {
          transactionSetIdCode: "837",
          transactionSetControlNumber: "0001",
          implementationConventionReference: "005010X222A2",
          segments: [["BHT", "0019", "00", "REF", "20250101", "1200", "CH"]],
        },
      ],
    },
  ],
};

const SPEC_270: Build270Spec = {
  envelope: ENVELOPE,
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
              traces: [{ traceTypeCode: "1", referenceId: "ELIG0001" }],
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

const SPEC_276: Build276Spec = {
  envelope: ENVELOPE,
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
              traces: [{ traceTypeCode: "2", referenceId: "ELIG001" }],
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
                  monetaryAmount: dec("1000.00"),
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
                  },
                  claims: [
                    {
                      trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
                      statuses: [{ statuses: [{ categoryCode: "A2", statusCode: "20" }] }],
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

const SPEC_278_REQUEST: Build278Spec = {
  envelope: ENVELOPE,
  header: { structurePurposeCode: "0078", purposeCode: "13", referenceId: "AUTHREQ-202606" },
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
    reviews: [{ requestCategoryCode: "HS", certificationTypeCode: "I", serviceTypeCode: "1" }],
  },
};

const SPEC_278_RESPONSE: Build278Spec = {
  ...SPEC_278_REQUEST,
  subscriber: {
    ...SPEC_278_REQUEST.subscriber,
    reviews: [
      {
        requestCategoryCode: "HS",
        certificationTypeCode: "I",
        serviceTypeCode: "1",
        decision: { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" },
      },
    ],
  },
};

const SPEC_820: Build820Spec = {
  envelope: ENVELOPE,
  payment: {
    transactionHandlingCode: "I",
    totalPremiumAmount: dec("250.00"),
    creditDebitFlag: "C",
    method: "ACH",
    paymentDate: "20260601",
  },
  traces: [{ traceTypeCode: "1", referenceId: "PREM-202606" }],
  remittances: [
    {
      individual: {
        entityIdentifierCode: "IL",
        lastName: "DOE",
        idQualifier: "34",
        idCode: "MBR0001",
      },
      openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: dec("250.00") }],
    },
  ],
};

const SPEC_834: Build834Spec = {
  envelope: ENVELOPE,
  header: {
    transactionSetPurposeCode: "00",
    sponsor: { entityIdentifierCode: "P5", name: "EMPLOYER CO" },
    payer: { entityIdentifierCode: "IN", name: "MEDPAY INSURANCE" },
  },
  members: [
    {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021",
      member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
      healthCoverages: [{ maintenanceTypeCode: "021", insuranceLineCode: "HLT" }],
    },
  ],
};

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
  claims: [
    {
      patientControlNumber: "PT-ACCT-001",
      claimStatusCode: "1",
      totalChargeAmount: dec("500.00"),
      totalPaymentAmount: dec("450.00"),
      patientResponsibilityAmount: dec("50.00"),
      adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
    },
  ],
};

/** The 837 spine, shared by P / I / D; only the service line differs. */
function spec837(line: Build837ServiceLineSpec): Build837Spec {
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
                serviceLines: [line],
              },
            ],
          },
        ],
      },
    ],
  };
}

const SPEC_837P = spec837({
  variant: "P",
  procedureQualifier: "HC",
  procedureCode: "99213",
  charge: dec("150.00"),
  unitOfMeasure: "UN",
  units: dec("1"),
  diagnosisPointers: ["1"],
});

const SPEC_837I = spec837({
  variant: "I",
  revenueCode: "0120",
  procedureQualifier: "HC",
  procedureCode: "99221",
  charge: dec("150.00"),
  unitOfMeasure: "UN",
  units: dec("1"),
});

const SPEC_837D = spec837({
  variant: "D",
  procedureQualifier: "AD",
  procedureCode: "D2391",
  charge: dec("150.00"),
  units: dec("1"),
});

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
      { transactionSetIdCode: "837", transactionSetControlNumber: "0001", disposition: "A" },
    ],
  },
};

const SPEC_TA1: BuildTA1Spec = {
  interchangeControlNumber: "000000001",
  interchangeDate: "250101",
  interchangeTime: "1200",
  ackCode: "A",
  noteCode: "000",
};

/**
 * One case per exported builder: the bytes it emits from a well-formed spec,
 * and the refusal it raises from the same spec with an impossible control
 * number. Keyed by the EXPORT NAME, because that is what the derived coverage
 * check compares against.
 */
interface BuilderCase {
  readonly emit: () => string;
  readonly refuse: () => string;
}

const BUILDER_CASES: Readonly<Record<string, BuilderCase>> = {
  buildInterchange: {
    emit: () => serializeX12(buildInterchange(INTERCHANGE_SPEC)),
    refuse: () =>
      serializeX12(
        buildInterchange({
          ...INTERCHANGE_SPEC,
          interchangeControlNumber: OVER_LONG_CONTROL_NUMBER,
        }),
      ),
  },
  build270: {
    emit: () => serializeX12(build270(SPEC_270)),
    refuse: () => serializeX12(build270({ ...SPEC_270, envelope: BAD_ENVELOPE })),
  },
  build271: {
    emit: () => serializeX12(build271(SPEC_271)),
    refuse: () => serializeX12(build271({ ...SPEC_271, envelope: BAD_ENVELOPE })),
  },
  build276: {
    emit: () => serializeX12(build276(SPEC_276)),
    refuse: () => serializeX12(build276({ ...SPEC_276, envelope: BAD_ENVELOPE })),
  },
  build277: {
    emit: () => serializeX12(build277(SPEC_277)),
    refuse: () => serializeX12(build277({ ...SPEC_277, envelope: BAD_ENVELOPE })),
  },
  build277CA: {
    emit: () => serializeX12(build277CA(SPEC_277)),
    refuse: () => serializeX12(build277CA({ ...SPEC_277, envelope: BAD_ENVELOPE })),
  },
  build278Request: {
    emit: () => serializeX12(build278Request(SPEC_278_REQUEST)),
    refuse: () => serializeX12(build278Request({ ...SPEC_278_REQUEST, envelope: BAD_ENVELOPE })),
  },
  build278Response: {
    emit: () => serializeX12(build278Response(SPEC_278_RESPONSE)),
    refuse: () => serializeX12(build278Response({ ...SPEC_278_RESPONSE, envelope: BAD_ENVELOPE })),
  },
  build820: {
    emit: () => serializeX12(build820(SPEC_820)),
    refuse: () => serializeX12(build820({ ...SPEC_820, envelope: BAD_ENVELOPE })),
  },
  build834: {
    emit: () => serializeX12(build834(SPEC_834)),
    refuse: () => serializeX12(build834({ ...SPEC_834, envelope: BAD_ENVELOPE })),
  },
  build835: {
    emit: () => serializeX12(build835(SPEC_835)),
    refuse: () => serializeX12(build835({ ...SPEC_835, envelope: BAD_ENVELOPE })),
  },
  build837D: {
    emit: () => serializeX12(build837D(SPEC_837D)),
    refuse: () => serializeX12(build837D({ ...SPEC_837D, envelope: BAD_ENVELOPE })),
  },
  build837I: {
    emit: () => serializeX12(build837I(SPEC_837I)),
    refuse: () => serializeX12(build837I({ ...SPEC_837I, envelope: BAD_ENVELOPE })),
  },
  build837P: {
    emit: () => serializeX12(build837P(SPEC_837P)),
    refuse: () => serializeX12(build837P({ ...SPEC_837P, envelope: BAD_ENVELOPE })),
  },
  build999: {
    emit: () => serializeX12(build999(SPEC_999)),
    refuse: () => serializeX12(build999({ ...SPEC_999, envelope: BAD_ENVELOPE })),
  },
  buildTA1: {
    // Not an interchange: `buildTA1` returns the segment, so its emitted bytes
    // are `raw` rather than a serializer call. Its refusal is the EMPTY control
    // number rather than the over-long one the rest of the registry uses: TA1-01
    // echoes the acknowledged interchange's number and is not the 9-column
    // ISA-13 slot, so length is not what this builder refuses. An absent one is,
    // because a TA1 that carries none acknowledges nothing the sender can match.
    emit: () => buildTA1(SPEC_TA1).raw,
    refuse: () => buildTA1({ ...SPEC_TA1, interchangeControlNumber: "" }).raw,
  },
};

/**
 * Every `build*` function the package root exports, read off the barrel at run
 * time. This is the derivation A4 turns on: nothing here is hand-listed, so a
 * builder added to `src/index.ts` tomorrow appears in this array on the next
 * run and reds the coverage assertion by name.
 */
const EXPORTED_BUILDERS: readonly string[] = Object.entries(
  rootExports as Readonly<Record<string, unknown>>,
)
  .filter(([name, value]) => name.startsWith("build") && typeof value === "function")
  .map(([name]) => name)
  .sort();

// ---------------------------------------------------------------------------
// A4 - the coverage derivation itself.
// ---------------------------------------------------------------------------

describe("emit independence: the covered builder set is derived, not listed", () => {
  it("finds the exported builders at all (a vacuous derivation would pass everything)", () => {
    expect(EXPORTED_BUILDERS.length).toBeGreaterThanOrEqual(15);
    expect(EXPORTED_BUILDERS).toContain("buildInterchange");
    expect(EXPORTED_BUILDERS).toContain("buildTA1");
  });

  it("covers every build* function exported from the package root", () => {
    const uncovered = EXPORTED_BUILDERS.filter((name) => BUILDER_CASES[name] === undefined);
    expect(
      uncovered,
      `the emit independence lock does not cover: ${uncovered.join(", ")}. ` +
        "Add a case to BUILDER_CASES rather than deleting this assertion.",
    ).toEqual([]);
  });

  it("registers no case for a name the package root does not export", () => {
    const exported = new Set(EXPORTED_BUILDERS);
    const stale = Object.keys(BUILDER_CASES).filter((name) => !exported.has(name));
    expect(stale, `stale emit independence cases: ${stale.join(", ")}`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A1 / A5 / A6 - the builders.
// ---------------------------------------------------------------------------

describe("emit independence: every exported builder", () => {
  for (const name of EXPORTED_BUILDERS) {
    const builderCase = BUILDER_CASES[name];
    if (builderCase === undefined) continue; // reported by the coverage suite above

    describe(name, () => {
      it("emits, with no profile active, and refuses the impossible spec", () => {
        // Guards the whole suite against vacuity: if the "valid" spec started
        // refusing, every comparison below would compare two refusals and
        // prove nothing about the emitted bytes.
        activate(undefined);
        const emitted = capture(builderCase.emit);
        const refused = capture(builderCase.refuse);
        expect(emitted.kind).toBe("emitted");
        expect(refused.kind).toBe("refused");
        if (emitted.kind === "emitted") expect(emitted.bytes.length).toBeGreaterThan(0);
      });

      for (const activation of ACTIVATIONS) {
        // The per-call route does not exist on a builder: no `build*` takes a
        // `profile` option, so only the process-wide registration can reach
        // one. An activation that is per-call only would be a no-op here and
        // is skipped rather than asserted vacuously.
        if (activation.asDefault === undefined) continue;

        it(`emits byte-identical output with ${activation.name}`, () => {
          activate(undefined);
          const baseline = capture(builderCase.emit);
          activate(activation);
          const withProfile = capture(builderCase.emit);
          expect(withProfile).toEqual(baseline);
        });

        it(`refuses identically with ${activation.name}`, () => {
          activate(undefined);
          const baseline = capture(builderCase.refuse);
          activate(activation);
          const withProfile = capture(builderCase.refuse);
          // Compares the whole outcome, so a profile that turned this refusal
          // into an emission, or changed the error type, code or message,
          // fails here rather than passing a weaker "it threw" check.
          expect(withProfile).toEqual(baseline);
          expect(withProfile.kind).toBe("refused");
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// A1 / A5 - serializeX12 over the reserialisable corpus.
// ---------------------------------------------------------------------------

/** Every committed `.edi` fixture, discovered from disk rather than listed. */
function allFixtures(): readonly string[] {
  return readdirSync(FIXTURE_ROOT, { recursive: true, encoding: "utf8" })
    .filter((p) => p.endsWith(".edi"))
    .sort();
}

function readFixture(relPath: string): string {
  return readFileSync(join(FIXTURE_ROOT, relPath), "utf8");
}

describe("emit independence: serializeX12 over the corpus", () => {
  const fixtures = allFixtures();

  it("sweeps a non-empty corpus", () => {
    // Without this the loop below could silently sweep nothing and stay green.
    expect(fixtures.length).toBeGreaterThanOrEqual(56);
  });

  for (const fixture of fixtures) {
    describe(fixture, () => {
      for (const activation of ACTIVATIONS) {
        it(`is byte-identical with ${activation.name}`, () => {
          const raw = readFixture(fixture);
          const baseline = serializeX12(parseUnder(undefined, raw));
          const withProfile = serializeX12(parseUnder(activation, raw));
          expect(withProfile).toBe(baseline);
        });

        it(`is byte-identical in spec-clean mode with ${activation.name}`, () => {
          const raw = readFixture(fixture);
          const opts = { specClean: true, recomputeCounts: true } as const;
          const baseline = serializeX12(parseUnder(undefined, raw), opts);
          const withProfile = serializeX12(parseUnder(activation, raw), opts);
          expect(withProfile).toBe(baseline);
        });
      }
    });
  }
});

describe("emit independence: the emit surface takes no profile", () => {
  it("ignores a `profile` key a JS caller pushes into SerializeOptions", () => {
    const raw = readFixture("envelope/no-trailing-crlf.edi");
    const ix = parseUnder(undefined, raw);
    const baseline = serializeX12(ix);
    // A JS caller reaching a key the TypeScript options type does not declare.
    // If a `profile` option were ever added to the emit path, this stops being
    // a no-op and the assertion below reds.
    const smuggled = serializeX12(ix, asJsCaller<SerializeOptions>({ profile: profiles.availity }));
    expect(smuggled).toBe(baseline);
  });

  it("emits the same bytes from an interchange parsed with a profile attached", () => {
    const raw = readFixture("remit/835-availity-quirk.edi");
    const off = parseX12(raw);
    const on = parseX12(raw, { profile: profiles.availity });
    expect(on.profile?.name).toBe("availity");
    expect(serializeX12(on)).toBe(serializeX12(off));
  });
});

// ---------------------------------------------------------------------------
// The structural guard: no profile is consulted on the emit path.
// ---------------------------------------------------------------------------

/** Recursively collect every `.ts` file under `dir`. */
function tsFilesUnder(dir: string): readonly string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((p) => p.endsWith(".ts"))
    .map((p) => join(dir, p))
    .sort();
}

/**
 * The modules that produce bytes: the serializer, the general-purpose builder,
 * and every per-transaction `build-*.ts`. The transaction directory is filtered
 * to the builders on purpose - a READER may consult a profile without touching
 * the emit path, and this guard is about emit.
 */
function emitModules(): readonly string[] {
  const transactions = tsFilesUnder(join(SRC_ROOT, "transactions")).filter((p) =>
    /build-[^/\\]+\.ts$/u.test(p),
  );
  return [
    ...tsFilesUnder(join(SRC_ROOT, "serialize")),
    ...tsFilesUnder(join(SRC_ROOT, "builder")),
    ...transactions,
  ];
}

/** Every module specifier a file imports, static and dynamic. */
function importSpecifiers(source: string): readonly string[] {
  const out: string[] = [];
  for (const m of source.matchAll(
    /(?:^|[\s;{(])(?:import|export)[^;]*?from\s*["']([^"']+)["']/gu,
  )) {
    if (m[1] !== undefined) out.push(m[1]);
  }
  for (const m of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/gu)) {
    if (m[1] !== undefined) out.push(m[1]);
  }
  return out;
}

describe("emit independence: no profile is consulted on the emit path", () => {
  const modules = emitModules();

  it("finds the emit modules (an empty scan would prove nothing)", () => {
    expect(modules.length).toBeGreaterThanOrEqual(20);
    expect(modules.some((m) => m.endsWith(join("serialize", "serialize.ts")))).toBe(true);
    expect(modules.some((m) => m.endsWith(join("builder", "build-interchange.ts")))).toBe(true);
    expect(modules.some((m) => m.endsWith(join("remit", "build-835.ts")))).toBe(true);
  });

  it("the scan sees an import when there is one (negative control)", () => {
    // Proves the extractor is not silently returning nothing, which is the way
    // a scan like this goes green over a live violation.
    const validate = readFileSync(join(SRC_ROOT, "profiles", "validate.ts"), "utf8");
    expect(importSpecifiers(validate)).toContain("../builder/caller-value.js");
  });

  it("no emit module imports from src/profiles/", () => {
    const offenders = modules.filter((file) =>
      importSpecifiers(readFileSync(file, "utf8")).some((s) => /(^|\/)profiles\//u.test(s)),
    );
    expect(
      offenders,
      "an emit module imported the profile subsystem: a profile describes what a " +
        "partner sends and must never influence what this library emits",
    ).toEqual([]);
  });
});

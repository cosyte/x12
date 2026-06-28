/**
 * Unit tests for the 005010 837 emit surface — `build837P` / `build837I` /
 * `build837D`. Covers:
 *
 * - Envelope identity: GS-01 `HC`, ST-01 `837`, ST-03 per variant.
 * - Happy path: a P / I / D spec round-trips through `get837Claims`
 *   field-for-field with zero parse warnings, including the computed HL
 *   spine (HL-01 / HL-02 / HL-03 / HL-04).
 * - Dependent-patient hierarchy: a Loop 2000C patient emits an HL level-23
 *   child of the subscriber HL.
 * - COB + line adjudication + drug + tooth + pay-to + contacts composites
 *   round-trip; a >6-triple CAS group chunks across CAS segments.
 * - Structural refusals: empty billing providers, a childless billing
 *   provider, a subscriber with neither claim nor patient, a childless
 *   patient, an empty claimId, a claim with no service line, a variant
 *   mismatch, an empty procedure / revenue code → `Claim837BuildError`.
 * - PHI safety: a refusal message carries structural locators only — never
 *   the claimId (patient-account number) or member id.
 * - Pure-function discipline: returns a frozen interchange; the spec is not
 *   mutated.
 */

import { describe, expect, it } from "vitest";

import {
  build837D,
  build837I,
  build837P,
  CLAIM_837_BUILD_ERROR_CODES,
  Claim837BuildError,
  get837Claims,
  X12Decimal,
  type Build837BillingProviderSpec,
  type Build837ClaimSpec,
  type Build837ServiceLineProfessionalSpec,
  type Build837Spec,
  type Build837SubscriberSpec,
  type X12Interchange,
  type X12_837Submission,
} from "../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

function submissionOf(ix: X12Interchange): X12_837Submission {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims did not recognize the built 837");
  return sub;
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

const SUBMITTER = {
  entityIdentifierCode: "41",
  entityTypeQualifier: "2",
  name: "SUBMITTER ONE",
  idQualifier: "46",
  idCode: "SUB001",
} as const;

const RECEIVER = {
  entityIdentifierCode: "40",
  entityTypeQualifier: "2",
  name: "RECEIVER ONE",
  idQualifier: "46",
  idCode: "REC001",
} as const;

// Named building blocks so the refusal cases can mutate one node without
// array-indexing into the spec (the ESLint config forbids non-null `!`).
const P_LINE: Build837ServiceLineProfessionalSpec = {
  variant: "P",
  procedureQualifier: "HC",
  procedureCode: "99213",
  modifiers: ["25"],
  charge: dec("150.00"),
  unitOfMeasure: "UN",
  units: dec("1"),
  placeOfServiceCode: "11",
  diagnosisPointers: ["1"],
  dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260601" }],
};

const P_CLAIM: Build837ClaimSpec = {
  claimId: "PT-ACCT-001",
  totalCharge: dec("150.00"),
  placeOfServiceCode: "11",
  facilityCodeQualifier: "B",
  claimFrequencyCode: "1",
  providerSignatureOnFile: "Y",
  providerAcceptAssignment: "A",
  benefitsAssignment: "Y",
  releaseOfInformationCode: "Y",
  diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
  dates: [{ qualifier: "431", formatQualifier: "D8", value: "20260520" }],
  amounts: [{ qualifier: "F5", amount: dec("25.00") }],
  references: [{ qualifier: "D9", value: "CLAIM-REF-1" }],
  serviceLines: [P_LINE],
};

const P_SUBSCRIBER: Build837SubscriberSpec = {
  info: {
    payerResponsibilityCode: "P",
    individualRelationshipCode: "18",
    groupNumber: "GROUP123",
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
  claims: [P_CLAIM],
};

const P_BILLING: Build837BillingProviderSpec = {
  provider: {
    entityIdentifierCode: "85",
    entityTypeQualifier: "2",
    name: "BILLING CLINIC INC",
    idQualifier: "XX",
    idCode: "1234567890",
    address: { lines: ["123 BILLING WAY"], city: "CLEVELAND", state: "OH", postalCode: "44113" },
    references: [{ qualifier: "EI", value: "987654321" }],
  },
  subscribers: [P_SUBSCRIBER],
};

const P_SPEC: Build837Spec = {
  envelope: ENVELOPE,
  submitter: SUBMITTER,
  receiver: RECEIVER,
  billingProviders: [P_BILLING],
};

/** Compose a P spec around a single (possibly broken) subscriber. */
function pSpecWithSubscriber(subscriber: Build837SubscriberSpec): Build837Spec {
  return { ...P_SPEC, billingProviders: [{ ...P_BILLING, subscribers: [subscriber] }] };
}

/** Compose a P spec around a single (possibly broken) direct claim. */
function pSpecWithClaim(claim: Build837ClaimSpec): Build837Spec {
  return pSpecWithSubscriber({ ...P_SUBSCRIBER, claims: [claim] });
}

describe("build837 — envelope identity", () => {
  it("emits GS-01 HC, ST-01 837, ST-03 per variant", () => {
    const ix = build837P(P_SPEC);
    expect(ix.groups).toHaveLength(1);
    expect(ix.groups[0]?.gs.elements[1]).toBe("HC");
    const tx = ix.groups[0]?.transactions[0];
    expect(tx?.st.elements[1]).toBe("837");
    expect(tx?.st.elements[3]).toBe("005010X222A2");
  });

  it("returns a frozen interchange with no parse warnings", () => {
    const ix = build837P(P_SPEC);
    expect(Object.isFrozen(ix)).toBe(true);
    expect(ix.warnings).toHaveLength(0);
  });

  it("does not mutate the input spec", () => {
    const replacer = (_k: string, v: unknown): unknown =>
      v instanceof X12Decimal ? v.toString() : v;
    const before = JSON.stringify(P_SPEC, replacer);
    build837P(P_SPEC);
    expect(JSON.stringify(P_SPEC, replacer)).toBe(before);
  });

  it("honours explicit delimiters and envelope overrides", () => {
    const ix = build837P({
      ...P_SPEC,
      envelope: {
        ...ENVELOPE,
        elementSeparator: "*",
        repetitionSeparator: "^",
        componentSeparator: ":",
        segmentTerminator: "~",
        senderQualifier: "30",
        receiverQualifier: "30",
        usageIndicator: "T",
        groupDate: "20260601",
        groupTime: "1230",
        applicationSenderCode: "APPSENDER",
        applicationReceiverCode: "APPRECV",
        transactionReferenceId: "BHT-REF",
        transactionDate: "20260601",
        transactionTime: "1230",
        claimOrEncounterIndicator: "RP",
      },
    });
    expect(ix.isa.elements[15]).toBe("T");
    expect(ix.groups[0]?.gs.elements[2]).toBe("APPSENDER");
    expect(ix.groups[0]?.gs.elements[3]).toBe("APPRECV");
    expect(submissionOf(ix).warnings).toHaveLength(0);
  });

  it("zero-pads an under-width interchange control number to 9", () => {
    const ix = build837P({ ...P_SPEC, envelope: { ...ENVELOPE, interchangeControlNumber: "1" } });
    expect(ix.isa.elements[13]).toBe("000000001");
  });

  it("expands a 20th-century YYMMDD interchange date for GS-04", () => {
    const ix = build837P({ ...P_SPEC, envelope: { ...ENVELOPE, interchangeDate: "990601" } });
    expect(ix.groups[0]?.gs.elements[4]).toBe("19990601");
  });

  it("truncates an over-long ISA-06 sender id to 15 chars", () => {
    const ix = build837P({
      ...P_SPEC,
      envelope: { ...ENVELOPE, senderId: "SENDERIDWAYTOOLONGFORISA06" },
    });
    expect(ix.isa.elements[6]).toBe("SENDERIDWAYTOOL");
  });
});

describe("build837P → get837Claims round-trip", () => {
  it("reproduces the variant, parties, and HL spine", () => {
    const sub = submissionOf(build837P(P_SPEC));
    expect(sub.warnings).toHaveLength(0);
    expect(sub.variant).toBe("P");
    expect(sub.submitter?.name).toBe("SUBMITTER ONE");
    expect(sub.receiver?.name).toBe("RECEIVER ONE");

    expect(sub.hierarchies).toHaveLength(2);
    expect(sub.hierarchies[0]).toMatchObject({
      hlId: "1",
      parentHlId: undefined,
      levelCode: "20",
      hasChild: "1",
    });
    expect(sub.hierarchies[1]).toMatchObject({
      hlId: "2",
      parentHlId: "1",
      levelCode: "22",
      hasChild: "0",
    });
  });

  it("reproduces the claim header, billing provider, subscriber, and payer", () => {
    const sub = submissionOf(build837P(P_SPEC));
    expect(sub.claims).toHaveLength(1);
    const claim = sub.claims[0];
    expect(claim?.claimId).toBe("PT-ACCT-001");
    expect(claim?.totalCharge.toString()).toBe("150.00");
    expect(claim?.placeOfServiceCode).toBe("11");
    expect(claim?.facilityCodeQualifier).toBe("B");
    expect(claim?.claimFrequencyCode).toBe("1");
    expect(claim?.providerSignatureOnFile).toBe("Y");
    expect(claim?.providerAcceptAssignment).toBe("A");
    expect(claim?.benefitsAssignment).toBe("Y");
    expect(claim?.releaseOfInformationCode).toBe("Y");

    expect(claim?.billingProvider?.name).toBe("BILLING CLINIC INC");
    expect(claim?.billingProvider?.idCode).toBe("1234567890");
    expect(claim?.billingProvider?.address?.city).toBe("CLEVELAND");
    expect(claim?.billingProvider?.references[0]?.qualifier).toBe("EI");

    expect(claim?.subscriber?.entity.name).toBe("PATIENT");
    expect(claim?.subscriber?.entity.firstName).toBe("TEST");
    expect(claim?.subscriber?.entity.idCode).toBe("MEMBER001");
    expect(claim?.subscriber?.info.payerResponsibilityCode).toBe("P");
    expect(claim?.subscriber?.info.individualRelationshipCode).toBe("18");
    expect(claim?.subscriber?.info.groupNumber).toBe("GROUP123");
    expect(claim?.subscriber?.info.claimFilingIndicator).toBe("MB");
    expect(claim?.payer?.name).toBe("PAYER ONE");
    expect(claim?.payer?.idCode).toBe("PAYER01");
  });

  it("reproduces the claim-scoped diagnoses, dates, amounts, references", () => {
    const claim = submissionOf(build837P(P_SPEC)).claims[0];
    expect(claim?.diagnoses).toHaveLength(1);
    expect(claim?.diagnoses[0]?.code).toBe("J20.9");
    expect(claim?.dates[0]?.qualifier).toBe("431");
    expect(claim?.dates[0]?.value).toBe("20260520");
    expect(claim?.amounts[0]?.qualifier).toBe("F5");
    expect(claim?.amounts[0]?.amount.toString()).toBe("25.00");
    expect(claim?.references[0]?.qualifier).toBe("D9");
    expect(claim?.references[0]?.value).toBe("CLAIM-REF-1");
  });

  it("reproduces the professional service line (SV1) and its dates", () => {
    const line = submissionOf(build837P(P_SPEC)).claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("P");
    if (line?.variant !== "P") throw new Error("expected P line");
    expect(line.procedureQualifier).toBe("HC");
    expect(line.procedureCode).toBe("99213");
    expect(line.modifiers).toEqual(["25"]);
    expect(line.charge.toString()).toBe("150.00");
    expect(line.unitOfMeasure).toBe("UN");
    expect(line.units.toString()).toBe("1");
    expect(line.placeOfServiceCode).toBe("11");
    expect(line.diagnosisPointers).toEqual(["1"]);
    expect(line.dates[0]?.qualifier).toBe("472");
    expect(line.dates[0]?.value).toBe("20260601");
  });
});

describe("build837P — maximal optional coverage", () => {
  // A spec exercising pay-to address, contacts, claim notes/procedures/otherHi,
  // a dependent patient with PAT-01, COB, a drug, a >6-triple CAS group, line
  // notes/amounts/references/providers, and the institutional pay-to-plan branch
  // (which the P builder must NOT emit).
  const MAX_SPEC: Build837Spec = {
    envelope: ENVELOPE,
    submitter: {
      ...SUBMITTER,
      contacts: [
        {
          contactFunctionCode: "IC",
          name: "HELP DESK",
          communications: [{ qualifier: "TE", value: "5551234567" }],
        },
      ],
    },
    receiver: RECEIVER,
    billingProviders: [
      {
        provider: {
          entityIdentifierCode: "85",
          entityTypeQualifier: "2",
          name: "BILLING CLINIC INC",
          idQualifier: "XX",
          idCode: "1234567890",
        },
        payToAddress: { lines: ["PO BOX 1"], city: "DAYTON", state: "OH", postalCode: "45402" },
        payToPlan: {
          entityIdentifierCode: "PE",
          entityTypeQualifier: "2",
          name: "PAYTO PLAN (P-IGNORED)",
        },
        subscribers: [
          {
            info: {
              payerResponsibilityCode: "P",
              individualRelationshipCode: "01",
              claimFilingIndicator: "MB",
            },
            subscriber: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              name: "GUARANTOR",
              firstName: "PARENT",
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
            patients: [
              {
                individualRelationshipCode: "19",
                patient: {
                  entityIdentifierCode: "QC",
                  entityTypeQualifier: "1",
                  name: "CHILD",
                  firstName: "DEP",
                },
                claims: [
                  {
                    claimId: "DEP-CLAIM-1",
                    totalCharge: dec("80.00"),
                    diagnoses: [{ qualifier: "ABK", code: "J06.9" }],
                    procedures: [
                      { qualifier: "BBR", code: "0DTJ4ZZ", dateQualifier: "D8", date: "20260518" },
                    ],
                    otherHi: [{ qualifier: "BE", code: "A2", monetaryAmount: dec("12.00") }],
                    notes: [{ noteReferenceCode: "ADD", description: "SUPPLEMENTAL INFO" }],
                    providers: [
                      {
                        entityIdentifierCode: "82",
                        entityTypeQualifier: "1",
                        name: "RENDERING",
                        firstName: "DOC",
                      },
                    ],
                    otherSubscribers: [
                      {
                        payerResponsibilityCode: "S",
                        individualRelationshipCode: "01",
                        claimFilingIndicator: "CI",
                        otherSubscriber: {
                          entityIdentifierCode: "IL",
                          entityTypeQualifier: "1",
                          name: "SPOUSE",
                        },
                        otherPayer: {
                          entityIdentifierCode: "PR",
                          entityTypeQualifier: "2",
                          name: "SECONDARY PLAN",
                        },
                      },
                    ],
                    serviceLines: [
                      {
                        variant: "P",
                        procedureQualifier: "HC",
                        procedureCode: "J1885",
                        charge: dec("80.00"),
                        unitOfMeasure: "UN",
                        units: dec("1"),
                        diagnosisPointers: ["1"],
                        emergencyIndicator: "Y",
                        epsdtIndicator: "Y",
                        familyPlanningIndicator: "Y",
                        notes: [{ noteReferenceCode: "DCP", description: "LINE NOTE" }],
                        amounts: [{ qualifier: "T", amount: dec("5.00") }],
                        references: [{ qualifier: "6R", value: "LINE-1" }],
                        providers: [
                          {
                            entityIdentifierCode: "82",
                            entityTypeQualifier: "1",
                            name: "LINE RENDERING",
                          },
                        ],
                        drug: {
                          qualifier: "N4",
                          code: "00093721410",
                          quantity: dec("1.5"),
                          unitOfMeasure: "ML",
                        },
                        adjudications: [
                          {
                            otherPayerId: "PAYER02",
                            amountPaid: dec("50.00"),
                            procedureQualifier: "HC",
                            procedureCode: "J1885",
                            paidUnits: dec("1"),
                            adjustments: [
                              { groupCode: "CO", reasonCode: "45", amount: dec("1.00") },
                              { groupCode: "CO", reasonCode: "45", amount: dec("1.00") },
                              { groupCode: "CO", reasonCode: "45", amount: dec("1.00") },
                              { groupCode: "CO", reasonCode: "45", amount: dec("1.00") },
                              { groupCode: "CO", reasonCode: "45", amount: dec("1.00") },
                              { groupCode: "CO", reasonCode: "45", amount: dec("1.00") },
                              {
                                groupCode: "CO",
                                reasonCode: "45",
                                amount: dec("1.00"),
                                quantity: dec("1"),
                              },
                              { groupCode: "OA", reasonCode: "23", amount: dec("3.00") },
                            ],
                            dateAdjudicated: "20260520",
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

  it("round-trips the maximal spec with zero warnings and the level-23 patient HL", () => {
    const ix = build837P(MAX_SPEC);
    const sub = submissionOf(ix);
    expect(sub.warnings).toHaveLength(0);
    expect(sub.hierarchies).toHaveLength(3);
    expect(sub.hierarchies[2]).toMatchObject({
      hlId: "3",
      parentHlId: "2",
      levelCode: "23",
      hasChild: "0",
    });

    const claim = sub.claims[0];
    expect(claim?.patient?.entity.name).toBe("CHILD");
    expect(claim?.payToAddress?.city).toBe("DAYTON");
    // The P builder must NOT emit the institutional pay-to plan (NM1*PE).
    expect(claim?.payToPlan).toBeUndefined();
    expect(claim?.notes[0]?.noteReferenceCode).toBe("ADD");
    expect(claim?.procedures[0]?.code).toBe("0DTJ4ZZ");
    expect(claim?.otherSubscribers[0]?.otherPayer?.name).toBe("SECONDARY PLAN");

    const line = claim?.serviceLines[0];
    expect(line?.drug?.code).toBe("00093721410");
    expect(line?.notes[0]?.description).toBe("LINE NOTE");
    expect(line?.references[0]?.value).toBe("LINE-1");
    expect(line?.adjudications[0]?.otherPayerId).toBe("PAYER02");
    expect(line?.adjudications[0]?.dateAdjudicated).toBe("20260520");
  });

  it("chunks a >6-triple line CAS group across two CAS segments", () => {
    const tx = build837P(MAX_SPEC).groups[0]?.transactions[0];
    const cas = (tx?.segments ?? []).filter((s) => s.id === "CAS");
    // CO group of 7 chunks into 6+1; OA group is a third CAS.
    expect(cas).toHaveLength(3);
  });

  it("round-trips the SV1 emergency / EPSDT / family-planning indicators", () => {
    const line = submissionOf(build837P(MAX_SPEC)).claims[0]?.serviceLines[0];
    if (line?.variant !== "P") throw new Error("expected P line");
    expect(line.emergencyIndicator).toBe("Y");
    expect(line.epsdtIndicator).toBe("Y");
    expect(line.familyPlanningIndicator).toBe("Y");
  });
});

describe("build837I → get837Claims round-trip", () => {
  const I_SPEC: Build837Spec = {
    envelope: ENVELOPE,
    submitter: SUBMITTER,
    receiver: RECEIVER,
    billingProviders: [
      {
        provider: {
          entityIdentifierCode: "85",
          entityTypeQualifier: "2",
          name: "BILLING HOSPITAL",
          idQualifier: "XX",
          idCode: "1234567890",
        },
        payToPlan: {
          entityIdentifierCode: "PE",
          entityTypeQualifier: "2",
          name: "PAYTO PLAN",
          idQualifier: "XX",
          idCode: "9999999999",
        },
        subscribers: [
          {
            info: {
              payerResponsibilityCode: "P",
              individualRelationshipCode: "18",
              claimFilingIndicator: "MA",
            },
            subscriber: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              name: "INPATIENT",
              firstName: "TEST",
              idQualifier: "MI",
              idCode: "MEMBER001",
            },
            payer: {
              entityIdentifierCode: "PR",
              entityTypeQualifier: "2",
              name: "MEDICARE A",
              idQualifier: "PI",
              idCode: "PAYER01",
            },
            claims: [
              {
                claimId: "INP-CLAIM-1",
                totalCharge: dec("1500.00"),
                placeOfServiceCode: "11",
                facilityCodeQualifier: "A",
                claimFrequencyCode: "1",
                diagnoses: [{ qualifier: "ABK", code: "J18.9", poaIndicator: "Y" }],
                serviceLines: [
                  {
                    variant: "I",
                    revenueCode: "0120",
                    procedureQualifier: "HC",
                    procedureCode: "99221",
                    charge: dec("1500.00"),
                    unitOfMeasure: "UN",
                    units: dec("1"),
                    serviceLineRate: dec("100.00"),
                    nonCoveredCharge: dec("0.00"),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  it("emits ST-03 005010X223A3 and round-trips the institutional line (SV2)", () => {
    const ix = build837I(I_SPEC);
    expect(ix.groups[0]?.transactions[0]?.st.elements[3]).toBe("005010X223A3");
    const sub = submissionOf(ix);
    expect(sub.warnings).toHaveLength(0);
    expect(sub.variant).toBe("I");
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("I");
    if (line?.variant !== "I") throw new Error("expected I line");
    expect(line.revenueCode).toBe("0120");
    expect(line.procedureCode).toBe("99221");
    expect(line.charge.toString()).toBe("1500.00");
    expect(line.serviceLineRate?.toString()).toBe("100.00");
    expect(line.nonCoveredCharge?.toString()).toBe("0.00");
  });

  it("round-trips the POA indicator and the pay-to plan (NM1*PE)", () => {
    const claim = submissionOf(build837I(I_SPEC)).claims[0];
    expect(claim?.diagnoses[0]?.code).toBe("J18.9");
    expect(claim?.diagnoses[0]?.poaIndicator).toBe("Y");
    expect(claim?.payToPlan?.name).toBe("PAYTO PLAN");
  });
});

describe("build837D → get837Claims round-trip", () => {
  const D_SPEC: Build837Spec = {
    envelope: ENVELOPE,
    submitter: SUBMITTER,
    receiver: RECEIVER,
    billingProviders: [
      {
        provider: {
          entityIdentifierCode: "85",
          entityTypeQualifier: "2",
          name: "DENTAL GROUP",
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
              name: "DENTALPT",
              firstName: "TEST",
              idQualifier: "MI",
              idCode: "MEMBER001",
            },
            payer: {
              entityIdentifierCode: "PR",
              entityTypeQualifier: "2",
              name: "DENTAL PLAN",
              idQualifier: "PI",
              idCode: "PAYER01",
            },
            claims: [
              {
                claimId: "DEN-CLAIM-1",
                totalCharge: dec("180.00"),
                serviceLines: [
                  {
                    variant: "D",
                    procedureQualifier: "AD",
                    procedureCode: "D2391",
                    charge: dec("180.00"),
                    units: dec("1"),
                    placeOfServiceCode: "11",
                    oralCavityArea: ["10"],
                    prosthesisCrownInlayCode: "I",
                    toothInformation: [{ qualifier: "JP", toothCode: "14", surfaces: ["O"] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  it("emits ST-03 005010X224A2 and round-trips the dental line (SV3) + tooth", () => {
    const ix = build837D(D_SPEC);
    expect(ix.groups[0]?.transactions[0]?.st.elements[3]).toBe("005010X224A2");
    const sub = submissionOf(ix);
    expect(sub.warnings).toHaveLength(0);
    expect(sub.variant).toBe("D");
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("D");
    if (line?.variant !== "D") throw new Error("expected D line");
    expect(line.procedureQualifier).toBe("AD");
    expect(line.procedureCode).toBe("D2391");
    expect(line.charge.toString()).toBe("180.00");
    expect(line.oralCavityArea).toEqual(["10"]);
    expect(line.prosthesisCrownInlayCode).toBe("I");
    expect(line.toothInformation[0]?.toothCode).toBe("14");
    expect(line.toothInformation[0]?.surfaces).toEqual(["O"]);
  });
});

describe("build837 — structural refusals", () => {
  it("refuses a spec with no billing providers", () => {
    try {
      build837P({ ...P_SPEC, billingProviders: [] });
      throw new Error("expected build837P to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Claim837BuildError);
      expect((err as Claim837BuildError).code).toBe(
        CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a billing provider with no subscriber", () => {
    expect(() =>
      build837P({ ...P_SPEC, billingProviders: [{ ...P_BILLING, subscribers: [] }] }),
    ).toThrow(Claim837BuildError);
  });

  it("refuses a subscriber with neither a claim nor a dependent patient", () => {
    try {
      build837P(pSpecWithSubscriber({ ...P_SUBSCRIBER, claims: [], patients: [] }));
      throw new Error("expected build837P to throw");
    } catch (err) {
      expect((err as Claim837BuildError).code).toBe(
        CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a dependent patient with no claim", () => {
    const broken = pSpecWithSubscriber({
      ...P_SUBSCRIBER,
      claims: [],
      patients: [
        {
          patient: { entityIdentifierCode: "QC", entityTypeQualifier: "1", name: "CHILD" },
          claims: [],
        },
      ],
    });
    expect(() => build837P(broken)).toThrow(Claim837BuildError);
  });

  it("refuses a claim with an empty claimId", () => {
    expect(() => build837P(pSpecWithClaim({ ...P_CLAIM, claimId: "" }))).toThrow(
      Claim837BuildError,
    );
  });

  it("refuses a claim with no service line", () => {
    expect(() => build837P(pSpecWithClaim({ ...P_CLAIM, serviceLines: [] }))).toThrow(
      Claim837BuildError,
    );
  });

  it("refuses a P builder fed an institutional service line", () => {
    const broken = pSpecWithClaim({
      ...P_CLAIM,
      serviceLines: [{ variant: "I", revenueCode: "0120", charge: dec("10.00") }],
    });
    expect(() => build837P(broken)).toThrow(/every line must be "P"/);
  });

  it("refuses a service line with an empty procedure code", () => {
    const broken = pSpecWithClaim({ ...P_CLAIM, serviceLines: [{ ...P_LINE, procedureCode: "" }] });
    expect(() => build837P(broken)).toThrow(Claim837BuildError);
  });

  it("refuses an institutional service line with an empty revenue code", () => {
    const broken = pSpecWithClaim({
      ...P_CLAIM,
      serviceLines: [{ variant: "I", revenueCode: "", charge: dec("10.00") }],
    });
    expect(() => build837I(broken)).toThrow(/empty revenue code/);
  });

  it("refuses an over-long interchange control number", () => {
    expect(() =>
      build837P({ ...P_SPEC, envelope: { ...ENVELOPE, interchangeControlNumber: "0123456789" } }),
    ).toThrow(Claim837BuildError);
  });
});

describe("build837 — PHI-clean refusal messages", () => {
  it("a refusal message carries structural locators only — no claimId or member id", () => {
    try {
      build837P(pSpecWithClaim({ ...P_CLAIM, serviceLines: [] }));
      throw new Error("expected build837P to throw");
    } catch (err) {
      const message = (err as Claim837BuildError).message;
      expect(message).not.toContain("PT-ACCT-001");
      expect(message).not.toContain("MEMBER001");
      expect(message).toContain("billing[0].subscriber[0].claim[0]");
    }
  });
});

describe("build837 — delimiter-bearing values round-trip losslessly", () => {
  it("escapes a claim reference carrying the active delimiters and parses it back", () => {
    const spec = pSpecWithClaim({
      ...P_CLAIM,
      references: [{ qualifier: "D9", value: "AB~CD*EF:GH" }],
    });
    const sub = submissionOf(build837P(spec));
    expect(sub.warnings).toHaveLength(0);
    expect(sub.claims[0]?.references[0]?.value).toBe("AB~CD*EF:GH");
  });
});

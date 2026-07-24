/**
 * Unit tests for the 005010X212 277 / 005010X214 277CA emit surface -
 * `build277` / `build277CA`. Covers:
 *
 * - Happy path: a built 277 round-trips through `get277Status`
 *   field-for-field (TRN echo, claim STC composites STC-01/10/11, headline
 *   amounts as X12Decimal, service-line SVC-01 procedure + modifiers, line
 *   STC, REF/DTP).
 * - 277CA: `build277CA` emits ST-03 005010X214 and is admitted by
 *   `get277CADisposition` with `transactionType: "claim-acknowledgment"`; a
 *   provider-level standalone STC (no TRN) opens a claim.
 * - Dependent hierarchy: the 20→21→19→22→23 HL spine; the dependent HL
 *   parents to the subscriber.
 * - Structural refusals: no source / childless source-receiver-provider /
 *   subscriber with neither claim nor dependent / dependent with no claim →
 *   `X12_277_BUILD_INVALID_HIERARCHY`; a materialization-empty claim / an STC
 *   with no category code / an over-long control number →
 *   `X12_277_BUILD_INVALID_SPEC`.
 * - Envelope identity: GS-01 `HN`, ST-01 `277`.
 * - Pure-function discipline: returns a frozen interchange.
 * - PHI safety: a thrown structural error's message carries indices only.
 *
 * Synthetic-only fixtures: names `DOE` / `JANE` / `JUNIOR`, fake claim ids
 * `CLAIM001` / `CLAIM002`, fake member ids `MBR0001`.
 */

import { describe, expect, it } from "vitest";

import {
  build277,
  build277CA,
  CLAIM_STATUS_277_BUILD_ERROR_CODES,
  ClaimStatus277BuildError,
  get277CADisposition,
  get277Status,
  X12Decimal,
  type Build277Spec,
  type X12ClaimStatusResponse,
  type X12Interchange,
} from "../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

function statusOf(ix: X12Interchange): X12ClaimStatusResponse {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const status = get277Status(ix.delimiters, tx);
  if (status === undefined) throw new Error("get277Status did not recognize the built 277");
  return status;
}

function caOf(ix: X12Interchange): X12ClaimStatusResponse {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const ca = get277CADisposition(ix.delimiters, tx);
  if (ca === undefined) throw new Error("get277CADisposition did not recognize the built 277CA");
  return ca;
}

const ENVELOPE = {
  senderId: "MEDPAY",
  receiverId: "PROVIDER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const CANONICAL_SPEC: Build277Spec = {
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
                          statuses: [
                            { categoryCode: "A2", statusCode: "20", entityCode: "PR" },
                            { categoryCode: "A2", statusCode: "21" },
                          ],
                          statusEffectiveDate: "20260627",
                          totalChargeAmount: dec("150.00"),
                          paymentAmount: dec("120.00"),
                          adjudicationDate: "20260626",
                          message: "PROCESSED",
                        },
                      ],
                      references: [{ qualifier: "1K", value: "PCN0001" }],
                      dates: [
                        { qualifier: "472", formatQualifier: "RD8", value: "20260601-20260601" },
                      ],
                      serviceLines: [
                        {
                          serviceIdQualifier: "HC",
                          procedureCode: "99213",
                          modifiers: ["25"],
                          lineChargeAmount: dec("150.00"),
                          linePaymentAmount: dec("120.00"),
                          statuses: [{ statuses: [{ categoryCode: "F2", statusCode: "65" }] }],
                          references: [{ qualifier: "FJ", value: "LINE001" }],
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

describe("build277 - envelope identity", () => {
  it("emits GS-01 HN / ST-01 277 / ST-03 005010X212", () => {
    const ix = build277(CANONICAL_SPEC);
    const group = ix.groups[0];
    const tx = group?.transactions[0];
    expect(group?.gs.elements[1]).toBe("HN");
    expect(tx?.st.elements[1]).toBe("277");
    expect(tx?.st.elements[3]).toBe("005010X212");
  });

  it("returns a frozen interchange (pure-function discipline)", () => {
    expect(Object.isFrozen(build277(CANONICAL_SPEC))).toBe(true);
  });

  it("truncates an over-long fixed-width ISA senderId to 15 chars", () => {
    const ix = build277({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, senderId: "SENDERIDENTIFIERTOOLONG" },
    });
    expect(ix.isa.elements[6]).toBe("SENDERIDENTIFIE");
  });
});

describe("build277 - round-trip fidelity", () => {
  it("reproduces the claim, TRN echo, STC composites, and amounts", () => {
    const status = statusOf(build277(CANONICAL_SPEC));
    expect(status.warnings).toHaveLength(0);
    expect(status.transactionType).toBe("claim-status");
    expect(status.claims).toHaveLength(1);
    const claim = status.claims[0];
    expect(claim?.traces[0]?.referenceId).toBe("CLAIM20260627001");
    expect(claim?.subscriber?.lastName).toBe("DOE");
    expect(claim?.subscriber?.idCode).toBe("MBR0001");
    const info = claim?.statuses[0];
    expect(info?.statuses[0]).toMatchObject({
      categoryCode: "A2",
      statusCode: "20",
      entityCode: "PR",
    });
    expect(info?.statuses[1]).toMatchObject({ categoryCode: "A2", statusCode: "21" });
    expect(info?.statusEffectiveDate).toBe("20260627");
    expect(info?.totalChargeAmount?.toString()).toBe("150.00");
    expect(info?.paymentAmount?.toString()).toBe("120.00");
    expect(info?.adjudicationDate).toBe("20260626");
    expect(info?.message).toBe("PROCESSED");
  });

  it("reproduces claim REF / DTP and the service line SVC + STC", () => {
    const status = statusOf(build277(CANONICAL_SPEC));
    const claim = status.claims[0];
    expect(claim?.references[0]).toMatchObject({ qualifier: "1K", value: "PCN0001" });
    expect(claim?.dates[0]).toMatchObject({
      qualifier: "472",
      formatQualifier: "RD8",
      value: "20260601-20260601",
    });
    const line = claim?.serviceLines[0];
    expect(line?.serviceIdQualifier).toBe("HC");
    expect(line?.procedureCode).toBe("99213");
    expect(line?.modifiers).toEqual(["25"]);
    expect(line?.lineChargeAmount?.toString()).toBe("150.00");
    expect(line?.linePaymentAmount?.toString()).toBe("120.00");
    expect(line?.statuses[0]?.statuses[0]).toMatchObject({ categoryCode: "F2", statusCode: "65" });
    expect(line?.references[0]).toMatchObject({ qualifier: "FJ", value: "LINE001" });
  });
});

describe("build277CA - claim acknowledgment", () => {
  it("emits ST-03 005010X214 and is admitted by get277CADisposition", () => {
    const ix = build277CA(CANONICAL_SPEC);
    const tx = ix.groups[0]?.transactions[0];
    expect(tx?.st.elements[3]).toBe("005010X214");
    const ca = caOf(ix);
    expect(ca.transactionType).toBe("claim-acknowledgment");
    expect(ca.claims[0]?.traces[0]?.referenceId).toBe("CLAIM20260627001");
  });

  it("get277Status rejects nothing for a 277CA (shares the walk)", () => {
    const ix = build277CA(CANONICAL_SPEC);
    expect(statusOf(ix).claims).toHaveLength(1);
  });

  it("opens a claim on a provider-level standalone STC (no TRN)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [
                    {
                      claims: [
                        { statuses: [{ statuses: [{ categoryCode: "A1", statusCode: "19" }] }] },
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
    const ca = caOf(build277CA(spec));
    expect(ca.claims).toHaveLength(1);
    expect(ca.claims[0]?.traces).toHaveLength(0);
    expect(ca.claims[0]?.statuses[0]?.statuses[0]).toMatchObject({
      categoryCode: "A1",
      statusCode: "19",
    });
  });
});

describe("build277 - dependent hierarchy", () => {
  const DEPENDENT_SPEC: Build277Spec = {
    envelope: ENVELOPE,
    informationSources: [
      {
        entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
        receivers: [
          {
            entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CLEARINGHOUSE" },
            providers: [
              {
                entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                subscribers: [
                  {
                    member: {
                      entityIdentifierCode: "IL",
                      entityTypeQualifier: "1",
                      lastName: "DOE",
                      firstName: "JANE",
                    },
                    dependents: [
                      {
                        member: {
                          entityIdentifierCode: "QC",
                          entityTypeQualifier: "1",
                          lastName: "DOE",
                          firstName: "JUNIOR",
                        },
                        claims: [
                          {
                            trace: { traceTypeCode: "2", referenceId: "CLAIM002" },
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
      },
    ],
  };

  it("emits the 20→21→19→22→23 HL spine", () => {
    const status = statusOf(build277(DEPENDENT_SPEC));
    expect(status.warnings).toHaveLength(0);
    const levels = status.hierarchies.map((h) => h.levelCode);
    expect(levels).toEqual(["20", "21", "19", "22", "23"]);
    const subscriberHl = status.hierarchies.find((h) => h.levelCode === "22");
    const dependentHl = status.hierarchies.find((h) => h.levelCode === "23");
    expect(subscriberHl?.hasChild).toBe("1");
    expect(dependentHl?.parentHlId).toBe(subscriberHl?.hlId);
  });

  it("attaches the claim to the dependent", () => {
    const status = statusOf(build277(DEPENDENT_SPEC));
    const claim = status.claims[0];
    expect(claim?.dependent?.firstName).toBe("JUNIOR");
    expect(claim?.traces[0]?.referenceId).toBe("CLAIM002");
  });
});

describe("build277 - structural refusals", () => {
  it("refuses an empty information-source list (INVALID_HIERARCHY)", () => {
    try {
      build277({ envelope: ENVELOPE, informationSources: [] });
      throw new Error("expected build277 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ClaimStatus277BuildError);
      expect((err as ClaimStatus277BuildError).code).toBe(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a provider with no subscriber (INVALID_HIERARCHY)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(() => build277(spec)).toThrow(ClaimStatus277BuildError);
  });

  it("refuses a subscriber with neither claim nor dependent (INVALID_HIERARCHY)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [
                    { member: { entityIdentifierCode: "QC", entityTypeQualifier: "1" } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    try {
      build277(spec);
      throw new Error("expected build277 to throw");
    } catch (err) {
      expect((err as ClaimStatus277BuildError).code).toBe(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a dependent with no claim (INVALID_HIERARCHY)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [
                    {
                      member: { entityIdentifierCode: "QC", entityTypeQualifier: "1" },
                      dependents: [
                        {
                          member: { entityIdentifierCode: "QC", entityTypeQualifier: "1" },
                          claims: [],
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
    expect(() => build277(spec)).toThrow(ClaimStatus277BuildError);
  });

  it("refuses an information source with no receivers (INVALID_HIERARCHY)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [],
        },
      ],
    };
    try {
      build277(spec);
      throw new Error("expected build277 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ClaimStatus277BuildError);
      expect((err as ClaimStatus277BuildError).code).toBe(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a receiver with no providers (INVALID_HIERARCHY)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [],
            },
          ],
        },
      ],
    };
    try {
      build277(spec);
      throw new Error("expected build277 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ClaimStatus277BuildError);
      expect((err as ClaimStatus277BuildError).code).toBe(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a claim with no trace, status, or service line (INVALID_SPEC)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [
                    {
                      member: { entityIdentifierCode: "QC", entityTypeQualifier: "1" },
                      claims: [{}],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    try {
      build277(spec);
      throw new Error("expected build277 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ClaimStatus277BuildError);
      expect((err as ClaimStatus277BuildError).code).toBe(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC,
      );
    }
  });

  it("refuses an STC with no category code (INVALID_SPEC)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [
                    {
                      claims: [
                        {
                          trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
                          statuses: [{ statuses: [{ categoryCode: "" }] }],
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
    try {
      build277(spec);
      throw new Error("expected build277 to throw");
    } catch (err) {
      expect((err as ClaimStatus277BuildError).code).toBe(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC,
      );
    }
  });

  it("refuses a traceless second claim under one subscriber (INVALID_SPEC)", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [
                    {
                      member: { entityIdentifierCode: "QC", entityTypeQualifier: "1" },
                      claims: [
                        { trace: { traceTypeCode: "2", referenceId: "CLAIM001" } },
                        { statuses: [{ statuses: [{ categoryCode: "A1", statusCode: "19" }] }] },
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
    try {
      build277(spec);
      throw new Error("expected build277 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ClaimStatus277BuildError);
      expect((err as ClaimStatus277BuildError).code).toBe(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC,
      );
    }
  });

  it("refuses an over-long interchange control number (INVALID_SPEC)", () => {
    const spec: Build277Spec = {
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "0000000001" },
    };
    try {
      build277(spec);
      throw new Error("expected build277 to throw");
    } catch (err) {
      expect((err as ClaimStatus277BuildError).code).toBe(
        CLAIM_STATUS_277_BUILD_ERROR_CODES.X12_277_BUILD_INVALID_SPEC,
      );
    }
  });
});

describe("build277 - PHI safety", () => {
  it("structural-error message carries indices only, never a name / member id", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: {
            entityIdentifierCode: "PR",
            entityTypeQualifier: "2",
            name: "MEDPAY INSURANCE",
          },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "41",
                entityTypeQualifier: "2",
                name: "CLEARINGHOUSE",
              },
              providers: [
                {
                  entity: {
                    entityIdentifierCode: "1P",
                    entityTypeQualifier: "2",
                    name: "ANYTOWN CLINIC",
                  },
                  subscribers: [
                    {
                      member: {
                        entityIdentifierCode: "QC",
                        entityTypeQualifier: "1",
                        lastName: "DOE",
                        idCode: "MBR0001",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    try {
      build277(spec);
      throw new Error("expected build277 to throw");
    } catch (err) {
      const message = (err as ClaimStatus277BuildError).message;
      expect(message).not.toContain("DOE");
      expect(message).not.toContain("MBR0001");
      expect(message).not.toContain("ANYTOWN");
      expect(message).toContain("subscriber[0]");
    }
  });
});

describe("build277 - optional-field defaults", () => {
  it("round-trips a spec that omits the optional member / claim / line / status fields", () => {
    const spec: Build277Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: { entityIdentifierCode: "41", entityTypeQualifier: "2", name: "CH" },
              providers: [
                {
                  entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
                  subscribers: [
                    {
                      // member NM1 with only the qualifiers
                      member: { entityIdentifierCode: "QC", entityTypeQualifier: "1" },
                      claims: [
                        {
                          // trace with no originating-company / supplemental id; no
                          // claim-level statuses; a bare service line carrying a
                          // single category-only STC
                          trace: { traceTypeCode: "2", referenceId: "CLAIM001" },
                          serviceLines: [{ statuses: [{ statuses: [{ categoryCode: "A2" }] }] }],
                        },
                      ],
                      // dependent with no member NM1
                      dependents: [
                        {
                          claims: [{ trace: { traceTypeCode: "2", referenceId: "CLAIM002" } }],
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
    const status = statusOf(build277(spec));
    const traces = status.claims.map((c) => c.traces[0]?.referenceId);
    expect(traces).toContain("CLAIM001");
    expect(traces).toContain("CLAIM002");
  });
});

describe("build277 - envelope control-number / date expansion", () => {
  it("zero-pads a short interchange control number to 9 chars", () => {
    const ix = build277({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "1" },
    });
    expect(ix.isa.elements[13]).toBe("000000001");
  });

  it("expands a 2-digit-century interchange date and passes an 8-digit one through", () => {
    const pre2000 = build277({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeDate: "990601" },
    });
    expect(pre2000.groups[0]?.gs.elements[4]).toBe("19990601");
    const full = build277({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeDate: "20260601" },
    });
    expect(full.groups[0]?.gs.elements[4]).toBe("20260601");
  });
});

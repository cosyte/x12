/**
 * Unit tests for the 005010X217 278 request / 005010X216 278 response emit
 * surface — `build278Request` / `build278Response`. Covers:
 *
 * - Happy path: a built request round-trips through `get278Request`
 *   field-for-field (BHT header, UMO / requester entities, subscriber member
 *   + DMG, UM review info, TRN echo, HI diagnoses, REF / DTP / MSG, provider
 *   NM1s).
 * - Response: `build278Response` emits ST-03 005010X216 and the HCR-01
 *   action code VERBATIM; the certification outcome round-trips unchanged.
 * - HCR direction gate: a request review carrying a decision is refused;
 *   a response decision with an empty action code is refused.
 * - Dependent hierarchy: the 20→21→22→23→EV HL spine; the dependent HL
 *   parents to the subscriber, the review HL to the dependent.
 * - Nested service review: an SS service HL parents to its EV event HL.
 * - Structural refusals: a subscriber with neither review nor dependent /
 *   a dependent with no review → `X12_278_BUILD_INVALID_HIERARCHY`; a review
 *   with no request category code / an over-long control number →
 *   `X12_278_BUILD_INVALID_SPEC`.
 * - Envelope identity: GS-01 `HI`, ST-01 `278`.
 * - Pure-function discipline: returns a frozen interchange.
 * - PHI safety: a thrown structural error's message carries indices only.
 *
 * Synthetic-only fixtures: names `DOE` / `JANE` / `JUNIOR`, fake member ids
 * `MBR0001`, fake auth ids `AUTH123456`, fake trace `AUTHREQ-202606-0001`.
 */

import { describe, expect, it } from "vitest";

import {
  AUTH_278_BUILD_ERROR_CODES,
  build278Request,
  build278Response,
  get278Request,
  get278Response,
  ServicesReview278BuildError,
  type Build278Spec,
  type X12Interchange,
  type X12ServicesReview,
} from "../src/index.js";

function requestOf(ix: X12Interchange): X12ServicesReview {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const review = get278Request(ix.delimiters, tx);
  if (review === undefined) throw new Error("get278Request did not recognize the built 278");
  return review;
}

function responseOf(ix: X12Interchange): X12ServicesReview {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const review = get278Response(ix.delimiters, tx);
  if (review === undefined) throw new Error("get278Response did not recognize the built 278");
  return review;
}

const ENVELOPE = {
  senderId: "SUBMITTER",
  receiverId: "UMOPAYER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const UMO = {
  entityIdentifierCode: "X3",
  entityTypeQualifier: "2",
  name: "UTILIZATION REVIEW CO",
  idQualifier: "PI",
  idCode: "UMO001",
} as const;

const REQUESTER = {
  entityIdentifierCode: "1P",
  entityTypeQualifier: "2",
  name: "RENDERING CLINIC",
  idQualifier: "XX",
  idCode: "1234567893",
} as const;

const CANONICAL_SPEC: Build278Spec = {
  envelope: ENVELOPE,
  header: {
    structurePurposeCode: "0078",
    purposeCode: "13",
    referenceId: "AUTHREQ-202606",
    date: "20260601",
    time: "1200",
  },
  utilizationManagementOrganization: UMO,
  requester: REQUESTER,
  subscriber: {
    member: {
      entityIdentifierCode: "IL",
      entityTypeQualifier: "1",
      lastName: "DOE",
      firstName: "JANE",
      idQualifier: "MI",
      idCode: "MBR0001",
      dateOfBirth: "19850515",
      genderCode: "F",
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
        diagnoses: [{ qualifier: "ABK", code: "E1165" }],
        dates: [{ qualifier: "472", formatQualifier: "RD8", value: "20260601-20260605" }],
        references: [{ qualifier: "BB", value: "PRIORAUTH-1" }],
        messages: ["EXPEDITED REVIEW REQUESTED"],
        providers: [
          {
            entityIdentifierCode: "71",
            entityTypeQualifier: "1",
            name: "PROVIDER ATTENDING",
            idQualifier: "XX",
            idCode: "1234567893",
          },
        ],
      },
    ],
  },
};

describe("build278 — envelope identity", () => {
  it("emits GS-01 HI / ST-01 278 / ST-03 005010X217 for a request", () => {
    const ix = build278Request(CANONICAL_SPEC);
    const group = ix.groups[0];
    const tx = group?.transactions[0];
    expect(group?.gs.elements[1]).toBe("HI");
    expect(tx?.st.elements[1]).toBe("278");
    expect(tx?.st.elements[3]).toBe("005010X217");
  });

  it("emits ST-03 005010X216 for a response", () => {
    const ix = build278Response(CANONICAL_SPEC);
    expect(ix.groups[0]?.transactions[0]?.st.elements[3]).toBe("005010X216");
  });

  it("returns a frozen interchange (pure-function discipline)", () => {
    expect(Object.isFrozen(build278Request(CANONICAL_SPEC))).toBe(true);
  });

  it("truncates an over-long fixed-width ISA senderId to 15 chars", () => {
    const ix = build278Request({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, senderId: "SENDERIDENTIFIERTOOLONG" },
    });
    expect(ix.isa.elements[6]).toBe("SENDERIDENTIFIE");
  });
});

describe("build278Request — round-trip fidelity", () => {
  it("reproduces the BHT header, parties, member, and review", () => {
    const review = requestOf(build278Request(CANONICAL_SPEC));
    expect(review.warnings).toHaveLength(0);
    expect(review.direction).toBe("request");
    expect(review.implementationConventionReference).toBe("005010X217");
    expect(review.header.structurePurposeCode).toBe("0078");
    expect(review.header.purposeCode).toBe("13");
    expect(review.header.referenceId).toBe("AUTHREQ-202606");
    expect(review.utilizationManagementOrganization?.name).toBe("UTILIZATION REVIEW CO");
    expect(review.utilizationManagementOrganization?.idCode).toBe("UMO001");
    expect(review.requester?.name).toBe("RENDERING CLINIC");
    expect(review.subscriber?.lastName).toBe("DOE");
    expect(review.subscriber?.firstName).toBe("JANE");
    expect(review.subscriber?.idCode).toBe("MBR0001");
    expect(review.subscriber?.dateOfBirth).toBe("19850515");
    expect(review.subscriber?.genderCode).toBe("F");
  });

  it("reproduces the UM review info, TRN echo, HI diagnoses, REF / DTP / MSG, provider", () => {
    const review = requestOf(build278Request(CANONICAL_SPEC));
    const item = review.reviews[0];
    expect(item?.requestCategoryCode).toBe("HS");
    expect(item?.certificationTypeCode).toBe("I");
    expect(item?.serviceTypeCode).toBe("1");
    expect(item?.traces[0]?.referenceId).toBe("AUTHREQ-202606-0001");
    expect(item?.traces[0]?.originatingCompanyId).toBe("9SUBMITTER");
    expect(item?.diagnoses[0]).toMatchObject({ qualifier: "ABK", code: "E1165" });
    expect(item?.dates[0]).toMatchObject({
      qualifier: "472",
      formatQualifier: "RD8",
      value: "20260601-20260605",
    });
    expect(item?.references[0]).toMatchObject({ qualifier: "BB", value: "PRIORAUTH-1" });
    expect(item?.messages[0]).toBe("EXPEDITED REVIEW REQUESTED");
    expect(item?.providers[0]?.name).toBe("PROVIDER ATTENDING");
  });

  it("emits no HCR in a request (decision-free)", () => {
    const review = requestOf(build278Request(CANONICAL_SPEC));
    expect(review.reviews[0]?.decision).toBeUndefined();
  });
});

describe("build278Response — verbatim certification decision", () => {
  const RESPONSE_SPEC: Build278Spec = {
    ...CANONICAL_SPEC,
    header: { ...CANONICAL_SPEC.header, purposeCode: "11", referenceId: "AUTHRESP-202606" },
    subscriber: {
      ...CANONICAL_SPEC.subscriber,
      reviews: [
        {
          requestCategoryCode: "HS",
          certificationTypeCode: "I",
          serviceTypeCode: "1",
          traces: [{ traceTypeCode: "1", referenceId: "AUTHREQ-202606-0001" }],
          decision: {
            actionCode: "A1",
            reviewIdentificationNumber: "AUTH123456",
            reasonCode: "0",
          },
          diagnoses: [{ qualifier: "ABK", code: "E1165" }],
        },
      ],
    },
  };

  it("round-trips the HCR action code verbatim", () => {
    const review = responseOf(build278Response(RESPONSE_SPEC));
    expect(review.warnings).toHaveLength(0);
    expect(review.direction).toBe("response");
    expect(review.implementationConventionReference).toBe("005010X216");
    const decision = review.reviews[0]?.decision;
    expect(decision?.actionCode).toBe("A1");
    expect(decision?.reviewIdentificationNumber).toBe("AUTH123456");
    expect(decision?.reasonCode).toBe("0");
  });

  it("preserves an unusual action code without normalizing it", () => {
    const review = responseOf(
      build278Response({
        ...RESPONSE_SPEC,
        subscriber: {
          ...RESPONSE_SPEC.subscriber,
          reviews: [{ requestCategoryCode: "HS", decision: { actionCode: "A6" } }],
        },
      }),
    );
    expect(review.reviews[0]?.decision?.actionCode).toBe("A6");
  });
});

describe("build278 — HCR direction gate", () => {
  it("refuses a request review carrying an HCR decision (INVALID_SPEC)", () => {
    const spec: Build278Spec = {
      ...CANONICAL_SPEC,
      subscriber: {
        ...CANONICAL_SPEC.subscriber,
        reviews: [{ requestCategoryCode: "HS", decision: { actionCode: "A1" } }],
      },
    };
    try {
      build278Request(spec);
      throw new Error("expected build278Request to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ServicesReview278BuildError);
      expect((err as ServicesReview278BuildError).code).toBe(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
      );
    }
  });

  it("refuses a response decision with an empty action code (INVALID_SPEC)", () => {
    const spec: Build278Spec = {
      ...CANONICAL_SPEC,
      subscriber: {
        ...CANONICAL_SPEC.subscriber,
        reviews: [{ requestCategoryCode: "HS", decision: { actionCode: "" } }],
      },
    };
    try {
      build278Response(spec);
      throw new Error("expected build278Response to throw");
    } catch (err) {
      expect((err as ServicesReview278BuildError).code).toBe(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
      );
    }
  });
});

describe("build278 — dependent hierarchy", () => {
  const DEPENDENT_SPEC: Build278Spec = {
    ...CANONICAL_SPEC,
    subscriber: {
      member: {
        entityIdentifierCode: "IL",
        entityTypeQualifier: "1",
        lastName: "DOE",
        firstName: "JANE",
      },
      dependent: {
        member: {
          entityIdentifierCode: "QC",
          entityTypeQualifier: "1",
          lastName: "DOE",
          firstName: "JUNIOR",
        },
        reviews: [
          {
            requestCategoryCode: "HS",
            certificationTypeCode: "I",
            traces: [{ traceTypeCode: "1", referenceId: "AUTHREQ-202606-0002" }],
          },
        ],
      },
    },
  };

  it("emits the 20→21→22→23→EV HL spine", () => {
    const review = requestOf(build278Request(DEPENDENT_SPEC));
    expect(review.warnings).toHaveLength(0);
    const levels = review.hierarchies.map((h) => h.levelCode);
    expect(levels).toEqual(["20", "21", "22", "23", "EV"]);
    const subscriberHl = review.hierarchies.find((h) => h.levelCode === "22");
    const dependentHl = review.hierarchies.find((h) => h.levelCode === "23");
    const eventHl = review.hierarchies.find((h) => h.levelCode === "EV");
    expect(subscriberHl?.hasChild).toBe("1");
    expect(dependentHl?.parentHlId).toBe(subscriberHl?.hlId);
    expect(eventHl?.parentHlId).toBe(dependentHl?.hlId);
  });

  it("resolves both the subscriber and dependent members", () => {
    const review = requestOf(build278Request(DEPENDENT_SPEC));
    expect(review.subscriber?.firstName).toBe("JANE");
    expect(review.dependent?.firstName).toBe("JUNIOR");
    expect(review.reviews[0]?.traces[0]?.referenceId).toBe("AUTHREQ-202606-0002");
  });
});

describe("build278 — nested service review", () => {
  it("parents an SS service HL to its EV event HL", () => {
    const spec: Build278Spec = {
      ...CANONICAL_SPEC,
      subscriber: {
        member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE" },
        reviews: [
          {
            levelCode: "EV",
            requestCategoryCode: "AR",
            reviews: [{ levelCode: "SS", requestCategoryCode: "HS", serviceTypeCode: "3" }],
          },
        ],
      },
    };
    const review = requestOf(build278Request(spec));
    expect(review.warnings).toHaveLength(0);
    const levels = review.hierarchies.map((h) => h.levelCode);
    expect(levels).toEqual(["20", "21", "22", "EV", "SS"]);
    const eventHl = review.hierarchies.find((h) => h.levelCode === "EV");
    const serviceHl = review.hierarchies.find((h) => h.levelCode === "SS");
    expect(eventHl?.hasChild).toBe("1");
    expect(serviceHl?.parentHlId).toBe(eventHl?.hlId);
    expect(review.reviews.map((r) => r.requestCategoryCode)).toEqual(["AR", "HS"]);
  });
});

describe("build278 — structural refusals", () => {
  it("refuses a subscriber with neither review nor dependent (INVALID_HIERARCHY)", () => {
    const spec: Build278Spec = {
      ...CANONICAL_SPEC,
      subscriber: { member: { entityIdentifierCode: "IL", entityTypeQualifier: "1" } },
    };
    try {
      build278Request(spec);
      throw new Error("expected build278Request to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ServicesReview278BuildError);
      expect((err as ServicesReview278BuildError).code).toBe(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a dependent with no review (INVALID_HIERARCHY)", () => {
    const spec: Build278Spec = {
      ...CANONICAL_SPEC,
      subscriber: {
        member: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
        dependent: {
          member: { entityIdentifierCode: "QC", entityTypeQualifier: "1" },
          reviews: [],
        },
      },
    };
    try {
      build278Request(spec);
      throw new Error("expected build278Request to throw");
    } catch (err) {
      expect((err as ServicesReview278BuildError).code).toBe(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a review with no request category code (INVALID_SPEC)", () => {
    const spec: Build278Spec = {
      ...CANONICAL_SPEC,
      subscriber: {
        member: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
        reviews: [{ requestCategoryCode: "" }],
      },
    };
    try {
      build278Request(spec);
      throw new Error("expected build278Request to throw");
    } catch (err) {
      expect((err as ServicesReview278BuildError).code).toBe(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
      );
    }
  });

  it("refuses an over-long interchange control number (INVALID_SPEC)", () => {
    const spec: Build278Spec = {
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "0000000001" },
    };
    try {
      build278Request(spec);
      throw new Error("expected build278Request to throw");
    } catch (err) {
      expect((err as ServicesReview278BuildError).code).toBe(
        AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
      );
    }
  });
});

describe("build278 — PHI safety", () => {
  it("structural-error message carries indices only, never a name / member id", () => {
    const spec: Build278Spec = {
      ...CANONICAL_SPEC,
      subscriber: {
        member: {
          entityIdentifierCode: "IL",
          entityTypeQualifier: "1",
          lastName: "DOE",
          idCode: "MBR0001",
        },
      },
    };
    try {
      build278Request(spec);
      throw new Error("expected build278Request to throw");
    } catch (err) {
      const message = (err as ServicesReview278BuildError).message;
      expect(message).not.toContain("DOE");
      expect(message).not.toContain("MBR0001");
      expect(message).toContain("subscriber");
    }
  });
});

describe("build278 — optional-field defaults", () => {
  it("round-trips a spec that omits the optional member / review fields", () => {
    const spec: Build278Spec = {
      envelope: ENVELOPE,
      header: { structurePurposeCode: "0078" },
      utilizationManagementOrganization: {
        entityIdentifierCode: "X3",
        entityTypeQualifier: "2",
        name: "UMO",
      },
      requester: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
      subscriber: {
        member: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
        reviews: [{ requestCategoryCode: "HS" }],
      },
    };
    const review = requestOf(build278Request(spec));
    expect(review.warnings).toHaveLength(0);
    expect(review.reviews[0]?.requestCategoryCode).toBe("HS");
    expect(review.subscriber?.dateOfBirth).toBeUndefined();
  });
});

describe("build278 — envelope control-number / date expansion", () => {
  it("zero-pads a short interchange control number to 9 chars", () => {
    const ix = build278Request({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "1" },
    });
    expect(ix.isa.elements[13]).toBe("000000001");
  });

  it("expands a 2-digit-century interchange date and passes an 8-digit one through", () => {
    const pre2000 = build278Request({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeDate: "990601" },
    });
    expect(pre2000.groups[0]?.gs.elements[4]).toBe("19990601");
    const full = build278Request({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeDate: "20260601" },
    });
    expect(full.groups[0]?.gs.elements[4]).toBe("20260601");
  });
});

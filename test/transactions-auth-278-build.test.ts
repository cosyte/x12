/**
 * Unit tests for the 005010X217 278 request / 005010X216 278 response emit
 * surface - `build278Request` / `build278Response`. Covers:
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
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  AUTH_278_BUILD_ERROR_CODES,
  build278Request,
  build278Response,
  get278Request,
  get278Response,
  parseX12,
  serializeX12,
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

describe("build278 - envelope identity", () => {
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

describe("build278Request - round-trip fidelity", () => {
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

describe("build278Response - verbatim certification decision", () => {
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

describe("build278 - HCR direction gate", () => {
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

describe("build278 - dependent hierarchy", () => {
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

describe("build278 - nested service review", () => {
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

describe("build278 - the review HL-03 level code (REFUSAL-MESSAGE-PHI-ECHO)", () => {
  // `levelCode` is the ONE caller-supplied HL-03 in the library; every other
  // level on every builder's spine is a module constant selected by tree
  // position. It is typed `"EV" | "SS"`, and `esc` type-checks and escapes it
  // but never constrained the VALUE, so a JS / JSON caller reached the wire
  // with anything.

  const withLevel = (level: unknown): Build278Spec =>
    ({
      ...CANONICAL_SPEC,
      subscriber: {
        member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE" },
        reviews: [
          {
            levelCode: level,
            requestCategoryCode: "HS",
            certificationTypeCode: "I",
            decision: { actionCode: "A1", reviewIdentificationNumber: "AUTH123456" },
          },
        ],
      },
    }) as unknown as Build278Spec;

  it("MEASURES the harm on bytes, because only bytes can make it", () => {
    // The honest document and the lying one differ by one element. Built with
    // the builder, then edited, because the builder now refuses to make the
    // second - which is the whole point of the slice.
    const honest = serializeX12(build278Response(withLevel("EV")));
    const lying = honest.replace("*EV*", "*ZZ*");
    expect(lying).not.toBe(honest);

    const readBack = (bytes: string): X12ServicesReview => {
      const tx = parseX12(bytes).groups[0]?.transactions[0];
      if (tx === undefined) throw new Error("no transaction");
      const model = get278Response(parseX12(bytes).delimiters, tx);
      if (model === undefined) throw new Error("get278Response did not recognize it");
      return model;
    };

    const good = readBack(honest);
    expect(good.reviews).toHaveLength(1);
    expect(good.reviews[0]?.decision?.actionCode).toBe("A1");
    expect(good.warnings).toEqual([]);

    // FAILS TO DECODE, and that is the precise claim. The review loop never
    // opens, so the review and its HCR-01 certification decision are absent
    // from the model. Nothing is mis-READ: no decision comes back as a
    // DIFFERENT decision, and the bytes are still on the model.
    const bad = readBack(lying);
    expect(bad.reviews).toEqual([]);
    expect(bad.reviews.map((r) => r.decision)).toEqual([]);
    expect(bad.warnings).toEqual([]);
    const badTx = parseX12(lying).groups[0]?.transactions[0];
    expect(badTx?.segments.some((seg) => seg.id === "HCR")).toBe(true);
    // And the level itself is still visible on the HL spine, which is why this
    // is a decode gap and not a data loss.
    expect(bad.hierarchies.map((h) => h.levelCode)).toContain("ZZ");
  });

  it("refuses the out-of-enum level rather than emitting it, on BOTH directions", () => {
    // Assert the MESSAGE, not the class: `toThrow(ServicesReview278BuildError)`
    // passes just as happily on an unrelated refusal, which is how four of six
    // cases went vacuous in `X12-DECIMAL-BYPASSES-THE-GUARD`.
    for (const build of [build278Request, build278Response]) {
      const spec = withLevel("ZZ");
      // `build278Request` refuses an HCR decision first, so drive it without one.
      const forDirection =
        build === build278Request
          ? ({
              ...spec,
              subscriber: {
                ...spec.subscriber,
                reviews: [{ levelCode: "ZZ", requestCategoryCode: "HS" }],
              },
            } as unknown as Build278Spec)
          : spec;
      try {
        build(forDirection);
        throw new Error("expected build278 to refuse an out-of-enum HL-03");
      } catch (err) {
        expect(err).toBeInstanceOf(ServicesReview278BuildError);
        const { message } = err as ServicesReview278BuildError;
        expect((err as ServicesReview278BuildError).code).toBe(
          AUTH_278_BUILD_ERROR_CODES.X12_278_BUILD_INVALID_SPEC,
        );
        expect(message).toContain('has HL-03 level code "ZZ"');
        expect(message).toContain('must be "EV" (patient event) or "SS" (service)');
      }
    }
  });

  it("reaches a NESTED service review and a DEPENDENT review, not only the first", () => {
    // `enforceReview` recurses, and a guard that only saw the top review would
    // leave the same document reachable one level down.
    const nested = {
      ...CANONICAL_SPEC,
      subscriber: {
        member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE" },
        reviews: [
          {
            levelCode: "EV",
            requestCategoryCode: "AR",
            reviews: [{ levelCode: "XX", requestCategoryCode: "HS" }],
          },
        ],
      },
    } as unknown as Build278Spec;
    expect(() => build278Request(nested)).toThrow(/HL-03 level code "XX"/u);

    const dependent = {
      ...CANONICAL_SPEC,
      subscriber: {
        member: { entityIdentifierCode: "IL", entityTypeQualifier: "1", lastName: "DOE" },
        reviews: [{ levelCode: "EV", requestCategoryCode: "AR" }],
        dependent: {
          member: { entityIdentifierCode: "QC", entityTypeQualifier: "1", lastName: "JUNIOR" },
          reviews: [{ levelCode: "99", requestCategoryCode: "HS" }],
        },
      },
    } as unknown as Build278Spec;
    expect(() => build278Request(dependent)).toThrow(/HL-03 level code "99"/u);
  });

  it("leaves EV, SS and an ABSENT level exactly as they were, which is the regression half", () => {
    // The refusal is the narrowest thing that closes the gap: an absent
    // `levelCode` still defaults to `EV`, and both real codes still build.
    expect(() => build278Response(withLevel("EV"))).not.toThrow();
    expect(() => build278Response(withLevel("SS"))).not.toThrow();
    expect(() => build278Response(withLevel(undefined))).not.toThrow();
    const defaulted = responseOf(build278Response(withLevel(undefined)));
    expect(defaulted.hierarchies.map((h) => h.levelCode)).toEqual(["20", "21", "22", "EV"]);
    expect(defaulted.reviews[0]?.decision?.actionCode).toBe("A1");
    // A `null` level from a JSON caller is absent, not forged - `?? "EV"`
    // treats it the way every other optional in this builder does.
    expect(() => build278Response(withLevel(null))).not.toThrow();
  });
});

describe("build278 - structural refusals", () => {
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

  // X12-BUILDER-BOUNDS. The branch fires BECAUSE the value is over-long, so
  // this site echoed the whole thing: measured at 120,066 bytes on the base
  // commit. Every caller value now goes through `renderCallerValue`, whose
  // rendered fragment is capped at BUILD_REFUSAL_VALUE_MAX_RENDERED; 500
  // leaves room for the site's own fixed template text and nothing else.
  it("bounds its refusal message against a 120,000-character control number", () => {
    const huge = "9".repeat(120_000);
    try {
      build278Request({
        ...CANONICAL_SPEC,
        envelope: { ...ENVELOPE, interchangeControlNumber: huge },
      });
      throw new Error("expected build278Request to refuse an over-long control number");
    } catch (err) {
      expect(err).toBeInstanceOf(ServicesReview278BuildError);
      const { message } = err as Error;
      expect(message).not.toContain(huge);
      expect(message).toContain("(120000 characters)");
      expect(message.length).toBeLessThan(500);
      expect(message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 500);
    }
  });
});

describe("build278 - PHI safety", () => {
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

describe("build278 - optional-field defaults", () => {
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

describe("build278 - envelope control-number / date expansion", () => {
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

// ---------------------------------------------------------------------------
// X12-EMPTY-CONTROL-NUMBER-FABRICATED: the three envelope control-number pairs.
// ---------------------------------------------------------------------------

describe("build278 - an empty envelope control number is refused", () => {
  // All three were silent at base commit `28b417f`, in two different ways.
  // ISA-13 / IEA-02 FABRICATED `000000000` out of `""`, because `padControl`
  // zero-pads and nothing stood in front of it; GS-06 / GE-02 and ST-02 / SE-02
  // reach the wire through `esc`, which early-returns on `""`, so the required
  // element went out EMPTY at BOTH ends of the pair and each pair still
  // reconciled against itself. The measurement, the census across the builders
  // and the refuse-rather-than-warn reasoning live in
  // `src/builder/caller-control-number.ts`; the cross-builder cases are in
  // `test/builder-control-number-empty.test.ts`.
  //
  // The message is asserted, never only the class: `toThrow(SomeBuildError)`
  // passes on any unrelated refusal in these specs.

  it("🩺 refuses an empty interchangeControlNumber (ISA-13 / IEA-02)", () => {
    expect(() =>
      build278Request({
        ...CANONICAL_SPEC,
        envelope: { ...ENVELOPE, interchangeControlNumber: "" },
      }),
    ).toThrow(
      /build278: interchangeControlNumber is empty\. ISA-13 \/ IEA-02 is a required control number/,
    );
  });

  it("refuses an empty groupControlNumber (GS-06 / GE-02)", () => {
    expect(() =>
      build278Request({ ...CANONICAL_SPEC, envelope: { ...ENVELOPE, groupControlNumber: "" } }),
    ).toThrow(
      /build278: groupControlNumber is empty\. GS-06 \/ GE-02 is a required control number/,
    );
  });

  it("refuses an empty transactionSetControlNumber (ST-02 / SE-02)", () => {
    expect(() =>
      build278Request({
        ...CANONICAL_SPEC,
        envelope: { ...ENVELOPE, transactionSetControlNumber: "" },
      }),
    ).toThrow(
      /build278: transactionSetControlNumber is empty\. ST-02 \/ SE-02 is a required control number/,
    );
  });

  it("still builds the unmodified spec, and still zero-pads a SHORT control number", () => {
    // The green control for the three cases above, and the pin that the guard
    // is not "ISA-13 must be nine characters": padding a value the caller DID
    // supply is what `padControl` is for and is unchanged.
    expect(build278Request(CANONICAL_SPEC).warnings).toHaveLength(0);
    const short = build278Request({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "1" },
    });
    expect(short.isa.elements[13]).toBe("000000001");
  });
});

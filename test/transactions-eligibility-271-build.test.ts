/**
 * Unit tests for the 005010X279A1 271 emit surface - `build271`. Covers:
 *
 * - Happy path: a built 271 round-trips through `get271Eligibility`
 *   field-for-field (TRN echo, subscriber name, EB benefit, EB-03 repeating
 *   service-type codes, monetary/percent/quantity X12Decimal, REF/DTP).
 * - Dependent hierarchy: a subscriber with a dependent emits the 20→21→22→23
 *   HL spine; the subscriber HL-04 is "1" and dependent benefits land on the
 *   dependent.
 * - Structural refusals: no information source / source with no receiver /
 *   receiver with no subscriber → `X12_271_BUILD_INVALID_HIERARCHY`; an
 *   over-long control number → `X12_271_BUILD_INVALID_SPEC`.
 * - Envelope identity: GS-01 `HB`, ST-01 `271`, ST-03 `005010X279A1`.
 * - Pure-function discipline: returns a frozen interchange.
 * - PHI safety: a thrown structural error's message carries indices only -
 *   no member name / member id.
 *
 * Synthetic-only fixtures: names `DOE` / `JANE` / `JUNIOR`, obviously-fake
 * member ids `MBR0001` / `MBR0002`.
 */

import { describe, expect, it } from "vitest";

import {
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  build271,
  ELIGIBILITY_271_BUILD_ERROR_CODES,
  Eligibility271BuildError,
  get271Eligibility,
  X12Decimal,
  type Build271Spec,
  type X12Eligibility,
  type X12Interchange,
} from "../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

function eligOf(ix: X12Interchange): X12Eligibility {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const elig = get271Eligibility(ix.delimiters, tx);
  if (elig === undefined) throw new Error("get271Eligibility did not recognize the built 271");
  return elig;
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

const CANONICAL_SPEC: Build271Spec = {
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
                address: {
                  lines: ["123 MAIN ST"],
                  city: "ANYTOWN",
                  state: "CA",
                  postalCode: "90001",
                },
                dateOfBirth: "19800101",
                genderCode: "F",
              },
              references: [{ qualifier: "6P", value: "GRP0001" }],
              dates: [{ qualifier: "307", formatQualifier: "D8", value: "20260101" }],
              benefits: [
                {
                  eligibilityCode: "1",
                  coverageLevelCode: "IND",
                  serviceTypeCodes: [{ code: "30" }, { code: "1" }],
                  inPlanNetwork: "Y",
                  monetaryAmount: dec("1000.00"),
                  percent: dec("80"),
                  quantityQualifier: "VS",
                  quantity: dec("12"),
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("build271 - envelope identity", () => {
  it("emits GS-01 HB / ST-01 271 / ST-03 005010X279A1", () => {
    const ix = build271(CANONICAL_SPEC);
    const group = ix.groups[0];
    const tx = group?.transactions[0];
    expect(group?.gs.elements[1]).toBe("HB");
    expect(tx?.st.elements[1]).toBe("271");
    expect(tx?.st.elements[3]).toBe("005010X279A1");
    expect(group?.gs.elements[8]).toBe("005010X279A1");
  });

  it("returns a frozen interchange (pure-function discipline)", () => {
    const ix = build271(CANONICAL_SPEC);
    expect(Object.isFrozen(ix)).toBe(true);
  });
});

describe("build271 - round-trip fidelity", () => {
  it("reproduces the subscriber, TRN echo, name, address, demographics", () => {
    const elig = eligOf(build271(CANONICAL_SPEC));
    expect(elig.warnings).toHaveLength(0);
    expect(elig.subscribers).toHaveLength(1);
    const sub = elig.subscribers[0];
    expect(sub?.traces[0]?.referenceId).toBe("ELIG20260627001");
    expect(sub?.traces[0]?.traceTypeCode).toBe("2");
    expect(sub?.name?.lastName).toBe("DOE");
    expect(sub?.name?.firstName).toBe("JANE");
    expect(sub?.name?.idQualifier).toBe("MI");
    expect(sub?.name?.idCode).toBe("MBR0001");
    expect(sub?.name?.address?.lines).toEqual(["123 MAIN ST"]);
    expect(sub?.name?.address?.city).toBe("ANYTOWN");
    expect(sub?.name?.address?.state).toBe("CA");
    expect(sub?.name?.address?.postalCode).toBe("90001");
    expect(sub?.name?.dateOfBirth).toBe("19800101");
    expect(sub?.name?.genderCode).toBe("F");
  });

  it("reproduces the EB benefit, repeating EB-03 service types, and decimals", () => {
    const elig = eligOf(build271(CANONICAL_SPEC));
    const benefit = elig.subscribers[0]?.benefits[0];
    expect(benefit?.eligibilityCode).toBe("1");
    expect(benefit?.coverageLevelCode).toBe("IND");
    expect(benefit?.serviceTypeCodes.map((s) => s.code)).toEqual(["30", "1"]);
    expect(benefit?.inPlanNetwork).toBe("Y");
    expect(benefit?.monetaryAmount?.toString()).toBe("1000.00");
    expect(benefit?.percent?.toString()).toBe("80");
    expect(benefit?.quantityQualifier).toBe("VS");
    expect(benefit?.quantity?.toString()).toBe("12");
  });

  it("reproduces subscriber REF / DTP", () => {
    const elig = eligOf(build271(CANONICAL_SPEC));
    const sub = elig.subscribers[0];
    expect(sub?.references[0]).toMatchObject({ qualifier: "6P", value: "GRP0001" });
    expect(sub?.dates[0]).toMatchObject({
      qualifier: "307",
      formatQualifier: "D8",
      value: "20260101",
    });
  });

  it("reproduces benefit MSG free-text and a benefit-level related entity", () => {
    const spec: Build271Spec = {
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
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                name: "ANYTOWN CLINIC",
              },
              subscribers: [
                {
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
                      messages: ["CALL 800-555-0100 FOR PRIOR AUTH"],
                      relatedEntities: [
                        {
                          entityIdentifierCode: "P3",
                          entityTypeQualifier: "1",
                          name: "SMITH CLINIC",
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
    const elig = eligOf(build271(spec));
    expect(elig.warnings).toHaveLength(0);
    const benefit = elig.subscribers[0]?.benefits[0];
    expect(benefit?.messages).toEqual(["CALL 800-555-0100 FOR PRIOR AUTH"]);
    expect(benefit?.relatedEntities[0]?.name).toBe("SMITH CLINIC");
  });

  it("truncates an over-long fixed-width ISA senderId to 15 chars", () => {
    const spec: Build271Spec = {
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, senderId: "SENDERIDENTIFIERTOOLONG" },
    };
    const ix = build271(spec);
    expect(ix.isa.elements[6]).toBe("SENDERIDENTIFIE");
  });
});

describe("build271 - dependent hierarchy", () => {
  const DEPENDENT_SPEC: Build271Spec = {
    envelope: ENVELOPE,
    informationSources: [
      {
        entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY INSURANCE" },
        receivers: [
          {
            entity: {
              entityIdentifierCode: "1P",
              entityTypeQualifier: "2",
              name: "ANYTOWN CLINIC",
            },
            subscribers: [
              {
                name: {
                  entityIdentifierCode: "IL",
                  entityTypeQualifier: "1",
                  lastName: "DOE",
                  firstName: "JANE",
                  idQualifier: "MI",
                  idCode: "MBR0001",
                },
                dependents: [
                  {
                    name: {
                      entityIdentifierCode: "03",
                      entityTypeQualifier: "1",
                      lastName: "DOE",
                      firstName: "JUNIOR",
                    },
                    benefits: [{ eligibilityCode: "1", coverageLevelCode: "IND" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  it("emits the 20→21→22→23 HL spine with correct parent pointers + has-child flags", () => {
    const ix = build271(DEPENDENT_SPEC);
    const elig = eligOf(ix);
    expect(elig.warnings).toHaveLength(0);
    const levels = elig.hierarchies.map((h) => h.levelCode);
    expect(levels).toEqual(["20", "21", "22", "23"]);
    // subscriber HL-04 has a child; dependent HL-04 does not.
    const subscriberHl = elig.hierarchies.find((h) => h.levelCode === "22");
    const dependentHl = elig.hierarchies.find((h) => h.levelCode === "23");
    expect(subscriberHl?.hasChild).toBe("1");
    expect(dependentHl?.hasChild).toBe("0");
    expect(dependentHl?.parentHlId).toBe(subscriberHl?.hlId);
  });

  it("lands the dependent benefit on the dependent", () => {
    const elig = eligOf(build271(DEPENDENT_SPEC));
    const dep = elig.subscribers[0]?.dependents[0];
    expect(dep?.name?.firstName).toBe("JUNIOR");
    expect(dep?.benefits[0]?.eligibilityCode).toBe("1");
    expect(dep?.benefits[0]?.coverageLevelCode).toBe("IND");
  });
});

describe("build271 - structural refusals", () => {
  it("refuses an empty information-source list (INVALID_HIERARCHY)", () => {
    expect(() => build271({ envelope: ENVELOPE, informationSources: [] })).toThrow(
      Eligibility271BuildError,
    );
    try {
      build271({ envelope: ENVELOPE, informationSources: [] });
    } catch (err) {
      expect(err).toBeInstanceOf(Eligibility271BuildError);
      expect((err as Eligibility271BuildError).code).toBe(
        ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_HIERARCHY,
      );
    }
  });

  it("refuses a source with no receiver (INVALID_HIERARCHY)", () => {
    const spec: Build271Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [],
        },
      ],
    };
    expect(() => build271(spec)).toThrow(Eligibility271BuildError);
  });

  it("refuses a receiver with no subscriber (INVALID_HIERARCHY)", () => {
    const spec: Build271Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
              subscribers: [],
            },
          ],
        },
      ],
    };
    expect(() => build271(spec)).toThrow(Eligibility271BuildError);
  });

  it("refuses an over-long interchange control number (INVALID_SPEC)", () => {
    const spec: Build271Spec = {
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "0000000001" },
    };
    try {
      build271(spec);
      throw new Error("expected build271 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Eligibility271BuildError);
      expect((err as Eligibility271BuildError).code).toBe(
        ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_SPEC,
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
      build271({ ...CANONICAL_SPEC, envelope: { ...ENVELOPE, interchangeControlNumber: huge } });
      throw new Error("expected build271 to refuse an over-long control number");
    } catch (err) {
      expect(err).toBeInstanceOf(Eligibility271BuildError);
      const { message } = err as Error;
      expect(message).not.toContain(huge);
      expect(message).toContain("(120000 characters)");
      expect(message.length).toBeLessThan(500);
      expect(message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 500);
    }
  });
});

describe("build271 - PHI safety", () => {
  it("structural-error message carries indices only, never a member id / name", () => {
    const spec: Build271Spec = {
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
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                name: "ANYTOWN CLINIC",
              },
              subscribers: [],
            },
          ],
        },
      ],
    };
    try {
      build271(spec);
      throw new Error("expected build271 to throw");
    } catch (err) {
      const message = (err as Eligibility271BuildError).message;
      expect(message).not.toContain("MEDPAY");
      expect(message).not.toContain("ANYTOWN");
      expect(message).toContain("source[0].receiver[0]");
    }
  });
});

describe("build271 - optional-field defaults", () => {
  it("round-trips a spec that omits the optional subscriber / benefit / member fields", () => {
    const spec: Build271Spec = {
      envelope: ENVELOPE,
      informationSources: [
        {
          entity: { entityIdentifierCode: "PR", entityTypeQualifier: "2", name: "MEDPAY" },
          receivers: [
            {
              entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: "CLINIC" },
              subscribers: [
                {
                  // no name / traces / refs / dates; a bare EB benefit
                  benefits: [{ eligibilityCode: "1" }],
                },
                {
                  // a member NM1 with only the qualifiers, a DMG with only a
                  // gender, and an address with no street lines + only a country
                  name: {
                    entityIdentifierCode: "IL",
                    entityTypeQualifier: "1",
                    genderCode: "M",
                    address: { lines: [], countryCode: "US" },
                  },
                  dependents: [{}],
                },
              ],
            },
          ],
        },
      ],
    };
    const elig = eligOf(build271(spec));
    expect(elig.subscribers).toHaveLength(2);
    const named = elig.subscribers.find((s) => s.name?.genderCode === "M");
    expect(named).toBeDefined();
    expect(named?.dependents).toHaveLength(1);
  });
});

describe("build271 - envelope control-number / date expansion", () => {
  it("zero-pads a short interchange control number to 9 chars", () => {
    const ix = build271({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "1" },
    });
    expect(ix.isa.elements[13]).toBe("000000001");
  });

  it("expands a 2-digit-century interchange date and passes an 8-digit one through", () => {
    const pre2000 = build271({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeDate: "990601" },
    });
    expect(pre2000.groups[0]?.gs.elements[4]).toBe("19990601");
    const full = build271({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeDate: "20260601" },
    });
    expect(full.groups[0]?.gs.elements[4]).toBe("20260601");
  });
});

// ---------------------------------------------------------------------------
// X12-EMPTY-CONTROL-NUMBER-FABRICATED: the three envelope control-number pairs.
// ---------------------------------------------------------------------------

describe("build271 - an empty envelope control number is refused", () => {
  // All three were silent at base commit `28b417f`, in two different ways.
  // ISA-13 / IEA-02 FABRICATED `000000000` out of `""`, because `padControl`
  // zero-pads and nothing stood in front of it; GS-06 / GE-02 and ST-02 / SE-02
  // reach the wire through `esc`, which early-returns on `""`, so the required
  // element went out short.
  //
  // 🛑 Say `warnings: []`, never "the pair reconciled against itself". That
  // holds only for `buildInterchange` and `build999`, which join untrimmed.
  // This builder's `seg` trims a trailing empty element, so the trailer carried
  // no GE-02 and no SE-02 at all, with GS-06 and ST-02 empty mid-segment.
  // Measured at base in all seven domain builders. The census across the
  // builders and the refuse-rather-than-warn reasoning live in
  // `src/builder/caller-control-number.ts`; the cross-builder cases are in
  // `test/builder-control-number-empty.test.ts`.
  //
  // The message is asserted, never only the class: `toThrow(SomeBuildError)`
  // passes on any unrelated refusal in these specs.

  it("🩺 refuses an empty interchangeControlNumber (ISA-13 / IEA-02)", () => {
    expect(() =>
      build271({ ...CANONICAL_SPEC, envelope: { ...ENVELOPE, interchangeControlNumber: "" } }),
    ).toThrow(
      /build271: interchangeControlNumber is empty\. ISA-13 \/ IEA-02 is a required control number/,
    );
  });

  it("refuses an empty groupControlNumber (GS-06 / GE-02)", () => {
    expect(() =>
      build271({ ...CANONICAL_SPEC, envelope: { ...ENVELOPE, groupControlNumber: "" } }),
    ).toThrow(
      /build271: groupControlNumber is empty\. GS-06 \/ GE-02 is a required control number/,
    );
  });

  it("refuses an empty transactionSetControlNumber (ST-02 / SE-02)", () => {
    expect(() =>
      build271({ ...CANONICAL_SPEC, envelope: { ...ENVELOPE, transactionSetControlNumber: "" } }),
    ).toThrow(
      /build271: transactionSetControlNumber is empty\. ST-02 \/ SE-02 is a required control number/,
    );
  });

  it("still builds the unmodified spec, and still zero-pads a SHORT control number", () => {
    // The green control for the three cases above, and the pin that the guard
    // is not "ISA-13 must be nine characters": padding a value the caller DID
    // supply is what `padControl` is for and is unchanged.
    expect(build271(CANONICAL_SPEC).warnings).toHaveLength(0);
    const short = build271({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "1" },
    });
    expect(short.isa.elements[13]).toBe("000000001");
  });
});

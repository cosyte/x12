/**
 * Unit tests for the 005010X279A1 270 EMIT surface - `build270`. Covers:
 *
 * - Happy path: a built 270 is spec-clean, its control numbers and counts
 *   reconcile, parsing it raises NO warning, and it round-trips through
 *   `get270Inquiry` field for field.
 * - Envelope identity: GS-01 `HS`, ST-01 `270`, ST-03 `005010X279A1`, and a
 *   BHT whose purpose code says request.
 * - Refusals, which are the whole of "spec-clean by construction": no
 *   information source, a source with no receiver, a receiver with no
 *   subscriber, a level with no name loop, a level that asks nothing, an
 *   inquiry that asks nothing, an empty or over-long control number, a
 *   non-string element value, and a forged array-like.
 * - PHI discipline: a refusal message names structural indices and counts and
 *   never a member id, a member name, a patient name, a trace or a diagnosis
 *   code, and it stays inside the package's exported rendered-value ceiling.
 * - The read side and the emit side disagree deliberately: a model the reader
 *   returns for a structurally incomplete document is REFUSED by the builder,
 *   because the region it is short of is one the builder would have to invent.
 *
 * Synthetic-only values throughout: names `DOE` / `JANE` / `BABY`, member ids
 * of the obviously-fake `MBR0001` shape.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  ELIGIBILITY_270_BUILD_ERROR_CODES,
  Eligibility270BuildError,
  build270,
  get270Inquiry,
  parse270Inquiries,
  parseX12,
  serializeX12,
} from "../src/index.js";
import type { Build270Spec, X12Inquiry, X12Interchange, X12ParseWarning } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "eligibility");

/**
 * Launder a value into the typed slot the builder declares. Every forged case
 * here is a JavaScript or JSON caller reaching a slot the TypeScript types say
 * is unreachable, which is the point: the types are not a runtime guarantee.
 */
function asJsCaller<T>(value: unknown): T {
  return value as T;
}

function inquiryOf(ix: X12Interchange): X12Inquiry {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const inquiry = get270Inquiry(ix.delimiters, tx);
  if (inquiry === undefined) throw new Error("get270Inquiry did not recognize the built 270");
  return inquiry;
}

const ENVELOPE = {
  senderId: "ANYTOWNCLINIC",
  receiverId: "MEDPAY",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const CANONICAL_SPEC: Build270Spec = {
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
              traces: [
                {
                  traceTypeCode: "1",
                  referenceId: "ELIG20260601001",
                  originatingCompanyId: "9SAMPLEORG",
                },
              ],
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastNameOrOrganizationName: "DOE",
                firstName: "JANE",
                middleName: "A",
                idQualifier: "MI",
                idCode: "MBR0001",
                address: {
                  lines: ["100 MAIN ST"],
                  city: "COLUMBUS",
                  state: "OH",
                  postalCode: "43215",
                },
                dateOfBirth: "19850515",
                genderCode: "F",
              },
              dates: [{ qualifier: "291", formatQualifier: "D8", value: "20260601" }],
              inquiries: [
                {
                  serviceTypeCodes: [{ code: "30" }, { code: "35" }],
                  procedure: { qualifier: "HC", code: "99213", modifiers: ["25"] },
                  coverageLevelCode: "IND",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const DEPENDENT_SPEC: Build270Spec = {
  envelope: { ...ENVELOPE, interchangeControlNumber: "000000003" },
  informationSources: [
    {
      name: {
        entityIdentifierCode: "PR",
        entityTypeQualifier: "2",
        lastNameOrOrganizationName: "MEDPAY INSURANCE",
      },
      receivers: [
        {
          name: {
            entityIdentifierCode: "1P",
            entityTypeQualifier: "2",
            lastNameOrOrganizationName: "ANYTOWN CLINIC",
          },
          subscribers: [
            {
              name: {
                entityIdentifierCode: "IL",
                entityTypeQualifier: "1",
                lastNameOrOrganizationName: "DOE",
                firstName: "JOHN",
                idQualifier: "MI",
                idCode: "MBR0002",
              },
              dependents: [
                {
                  traces: [{ traceTypeCode: "1", referenceId: "ELIG20260601004" }],
                  name: {
                    entityIdentifierCode: "03",
                    entityTypeQualifier: "1",
                    lastNameOrOrganizationName: "DOE",
                    firstName: "BABY",
                    dateOfBirth: "20240101",
                    genderCode: "U",
                  },
                  dates: [{ qualifier: "291", formatQualifier: "RD8", value: "20260101-20261231" }],
                  inquiries: [{ serviceTypeCodes: [{ code: "35" }], coverageLevelCode: "CHD" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("build270 - the happy path", () => {
  it("emits an interchange that parses with no warning at all", () => {
    const ix = build270(CANONICAL_SPEC);
    expect(ix.warnings).toEqual([]);
    const reparsed = parseX12(serializeX12(ix));
    expect(reparsed.warnings).toEqual([]);
  });

  it("reconciles its control numbers and its counts", () => {
    const ix = build270(CANONICAL_SPEC);
    const warnings: X12ParseWarning[] = [];
    serializeX12(ix, {
      specClean: true,
      onWarning: (w) => {
        warnings.push(w);
      },
    });
    // The spec-clean serializer reconciles IEA-01, GE-01, SE-01 and all three
    // control-number pairs, and warns on any that disagree.
    expect(warnings).toEqual([]);
  });

  it("puts the 270's own identity on the envelope", () => {
    const ix = build270(CANONICAL_SPEC);
    expect(ix.groups[0]?.gs.elements[1]).toBe("HS");
    expect(ix.groups[0]?.gs.elements[8]).toBe("005010X279A1");
    const tx = ix.groups[0]?.transactions[0];
    expect(tx?.st.elements[1]).toBe("270");
    expect(tx?.st.elements[3]).toBe("005010X279A1");
    expect(inquiryOf(ix).header?.purposeCode).toBe("13");
  });

  it("round-trips through get270Inquiry field for field", () => {
    const inquiry = inquiryOf(build270(CANONICAL_SPEC));
    const source = inquiry.informationSources[0];
    const receiver = source?.receivers[0];
    const subscriber = receiver?.subscribers[0];

    expect(source?.name?.lastNameOrOrganizationName).toBe("MEDPAY INSURANCE");
    expect(receiver?.name?.idCode).toBe("1234567890");
    expect(subscriber?.name?.firstName).toBe("JANE");
    expect(subscriber?.name?.address?.lines).toEqual(["100 MAIN ST"]);
    expect(subscriber?.name?.dateOfBirth).toBe("19850515");
    expect(subscriber?.traces[0]?.referenceId).toBe("ELIG20260601001");
    expect(subscriber?.dates[0]?.formatQualifier).toBe("D8");
    expect(subscriber?.inquiries[0]?.serviceTypeCodes.map((s) => s.code)).toEqual(["30", "35"]);
    expect(subscriber?.inquiries[0]?.procedure?.code).toBe("99213");
    expect(subscriber?.inquiries[0]?.procedure?.modifiers).toEqual(["25"]);
    expect(subscriber?.inquiries[0]?.coverageLevelCode).toBe("IND");
  });

  it("computes the HL spine itself, so a caller cannot state one", () => {
    const inquiry = inquiryOf(build270(DEPENDENT_SPEC));
    expect(inquiry.hierarchies.map((h) => [h.hlId, h.parentHlId, h.levelCode, h.hasChild])).toEqual(
      [
        ["1", undefined, "20", "1"],
        ["2", "1", "21", "1"],
        ["3", "2", "22", "1"],
        ["4", "3", "23", "0"],
      ],
    );
    const dependent = inquiry.informationSources[0]?.receivers[0]?.subscribers[0]?.dependents[0];
    expect(dependent?.name?.firstName).toBe("BABY");
    expect(dependent?.dates[0]?.formatQualifier).toBe("RD8");
  });

  it("emits the bytes the committed canonical fixture carries", () => {
    // A stronger statement than a round trip: the emit and the corpus agree.
    const emitted = serializeX12(build270(CANONICAL_SPEC));
    const committed = readFileSync(join(FIXTURE_DIR, "270-canonical.edi"), "utf8").trimEnd();
    expect(emitted).toBe(committed);
  });

  it("returns a frozen interchange", () => {
    expect(Object.isFrozen(build270(CANONICAL_SPEC))).toBe(true);
  });

  it("round-trips a REF at every level that can carry one", () => {
    // A REF under an EQ belongs to that inquiry; a REF anywhere else on a level
    // belongs to the level. Both directions are asserted, because the reader
    // decides by what is open and a swap between the two is silent.
    const ref = (qualifier: string, value: string): { qualifier: string; value: string } => ({
      qualifier,
      value,
    });
    const spec: Build270Spec = {
      ...CANONICAL_SPEC,
      informationSources: [
        {
          name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" },
          references: [ref("2U", "PAYERREF")],
          receivers: [
            {
              name: { entityIdentifierCode: "1P", entityTypeQualifier: "2" },
              references: [ref("EO", "RECVREF")],
              subscribers: [
                {
                  name: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
                  references: [ref("6P", "GROUP0001"), ref("18", "PLAN0001")],
                  inquiries: [
                    {
                      serviceTypeCodes: [{ code: "30" }],
                      references: [{ qualifier: "9F", value: "REFERRAL1", description: "NOTE" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const inquiry = inquiryOf(build270(spec));
    const source = inquiry.informationSources[0];
    const receiver = source?.receivers[0];
    const subscriber = receiver?.subscribers[0];

    expect(source?.references.map((r) => r.value)).toEqual(["PAYERREF"]);
    expect(receiver?.references.map((r) => r.value)).toEqual(["RECVREF"]);
    expect(subscriber?.references.map((r) => [r.qualifier, r.value])).toEqual([
      ["6P", "GROUP0001"],
      ["18", "PLAN0001"],
    ]);
    // The inquiry's own REF stays on the inquiry, not on the level above it.
    expect(subscriber?.inquiries[0]?.references).toEqual([
      { qualifier: "9F", value: "REFERRAL1", description: "NOTE" },
    ]);
  });

  it("truncates an over-wide fixed-width ISA element rather than shifting the header", () => {
    // The ISA is byte-positional, so an over-long sender id cannot be emitted
    // whole: emitting it would move every element after it and the interchange
    // would not frame at all. It is cut to the slot's spec width, which keeps
    // the header readable, and the caller's value is still theirs.
    const ix = build270({
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, senderId: "A".repeat(40) },
    });
    expect(ix.isa.raw.length).toBe(106);
    expect(ix.isa.elements[6]).toBe("A".repeat(15));
    expect(ix.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Refusals.
// ---------------------------------------------------------------------------

/** Run a builder call and return the error it threw, or `undefined`. */
function refusalOf(run: () => unknown): Eligibility270BuildError {
  try {
    run();
  } catch (err) {
    if (err instanceof Eligibility270BuildError) return err;
    throw err;
  }
  throw new Error("expected build270 to refuse");
}

describe("build270 - structural refusals", () => {
  it("refuses a spec with no information source", () => {
    const err = refusalOf(() => build270({ ...CANONICAL_SPEC, informationSources: [] }));
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY);
    expect(err.message).toContain("at least one information source");
  });

  it("refuses a source with no receiver", () => {
    const err = refusalOf(() =>
      build270({
        ...CANONICAL_SPEC,
        informationSources: [
          { name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" }, receivers: [] },
        ],
      }),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY);
    expect(err.message).toContain("has no receiver");
  });

  it("refuses a receiver with no subscriber", () => {
    const err = refusalOf(() =>
      build270({
        ...CANONICAL_SPEC,
        informationSources: [
          {
            name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" },
            receivers: [
              { name: { entityIdentifierCode: "1P", entityTypeQualifier: "2" }, subscribers: [] },
            ],
          },
        ],
      }),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY);
    expect(err.message).toContain("has no subscriber");
  });
});

describe("build270 - refuses what it cannot emit spec-clean", () => {
  /** The canonical spec with its single subscriber replaced. */
  function withSubscriber(subscriber: unknown): Build270Spec {
    return asJsCaller({
      ...CANONICAL_SPEC,
      informationSources: [
        {
          name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" },
          receivers: [
            {
              name: { entityIdentifierCode: "1P", entityTypeQualifier: "2" },
              subscribers: [subscriber],
            },
          ],
        },
      ],
    });
  }

  it("refuses a subscriber with no name loop", () => {
    const err = refusalOf(() =>
      build270(withSubscriber({ inquiries: [{ serviceTypeCodes: [{ code: "30" }] }] })),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("has no name loop");
  });

  it("refuses a subscriber that asks nothing and carries no dependent that does", () => {
    const err = refusalOf(() =>
      build270(
        withSubscriber({
          name: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
          inquiries: [],
        }),
      ),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("asks nothing");
  });

  it("refuses a dependent with no inquiry", () => {
    const err = refusalOf(() =>
      build270(
        withSubscriber({
          name: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
          inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
          dependents: [
            { name: { entityIdentifierCode: "03", entityTypeQualifier: "1" }, inquiries: [] },
          ],
        }),
      ),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("carries no eligibility inquiry");
  });

  it("refuses an inquiry that carries neither a service type nor a procedure", () => {
    const err = refusalOf(() =>
      build270(
        withSubscriber({
          name: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
          inquiries: [{ coverageLevelCode: "IND" }],
        }),
      ),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("asks nothing");
  });

  it("accepts a subscriber that only identifies, when its dependent asks", () => {
    expect(() => build270(DEPENDENT_SPEC)).not.toThrow();
  });
});

describe("build270 - control numbers and element types", () => {
  it("refuses an empty control number rather than fabricating one", () => {
    for (const field of [
      "interchangeControlNumber",
      "groupControlNumber",
      "transactionSetControlNumber",
    ] as const) {
      const err = refusalOf(() =>
        build270({ ...CANONICAL_SPEC, envelope: { ...ENVELOPE, [field]: "" } }),
      );
      expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    }
  });

  it("refuses an over-long interchange control number", () => {
    const err = refusalOf(() =>
      build270({
        ...CANONICAL_SPEC,
        envelope: { ...ENVELOPE, interchangeControlNumber: "1".repeat(12) },
      }),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("exceeds the 9-char spec limit");
  });

  it("refuses a non-string element value rather than emitting its rendering", () => {
    const err = refusalOf(() =>
      build270(
        asJsCaller({
          ...CANONICAL_SPEC,
          informationSources: [
            {
              name: { entityIdentifierCode: "PR", entityTypeQualifier: 2 },
              receivers: [
                {
                  name: { entityIdentifierCode: "1P", entityTypeQualifier: "2" },
                  subscribers: [
                    {
                      name: { entityIdentifierCode: "IL", entityTypeQualifier: "1" },
                      inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
  });
});

describe("build270 - a forged array-like refuses instead of hanging", () => {
  /**
   * `{ length: "9".repeat(120_000) }` coerces to `Infinity` in a `<`
   * comparison, which is what turns a bounded loop into an unbounded one. Every
   * list slot the builder walks is read through `requireCallerArray` first, so
   * each of these refuses with a typed, code-tagged error instead.
   */
  const FORGED = asJsCaller<never>({ length: "9".repeat(120_000) });

  const CASES: readonly (readonly [string, () => unknown])[] = [
    [
      "spec.informationSources",
      () => build270(asJsCaller({ ...CANONICAL_SPEC, informationSources: FORGED })),
    ],
    [
      "informationSources[0].receivers",
      () =>
        build270(
          asJsCaller({
            ...CANONICAL_SPEC,
            informationSources: [
              { name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" }, receivers: FORGED },
            ],
          }),
        ),
    ],
    [
      "receivers[0].subscribers",
      () =>
        build270(
          asJsCaller({
            ...CANONICAL_SPEC,
            informationSources: [
              {
                name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" },
                receivers: [
                  {
                    name: { entityIdentifierCode: "1P", entityTypeQualifier: "2" },
                    subscribers: FORGED,
                  },
                ],
              },
            ],
          }),
        ),
    ],
  ];

  it.each(CASES)("refuses %s", (_label, run) => {
    const err = refusalOf(run);
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY);
    expect(err.message).toContain("must be an array");
    expect(err.message).toContain("(120000 characters)");
    expect(err.message).not.toContain("9".repeat(120_000));
    expect(err.message.length).toBeLessThan(400);
  });
});

describe("build270 - refusal messages are PHI-free and bounded", () => {
  /** Every refusal this builder can reach with the values a 270 carries. */
  const REFUSALS: readonly (readonly [string, () => unknown])[] = [
    ["no information source", () => build270({ ...CANONICAL_SPEC, informationSources: [] })],
    [
      "source with no receiver",
      () =>
        build270({
          ...CANONICAL_SPEC,
          informationSources: [
            {
              name: {
                entityIdentifierCode: "PR",
                entityTypeQualifier: "2",
                lastNameOrOrganizationName: "MEDPAY INSURANCE",
              },
              receivers: [],
            },
          ],
        }),
    ],
    [
      "receiver with no subscriber",
      () =>
        build270({
          ...CANONICAL_SPEC,
          informationSources: [
            {
              name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" },
              receivers: [
                {
                  name: {
                    entityIdentifierCode: "1P",
                    entityTypeQualifier: "2",
                    lastNameOrOrganizationName: "ANYTOWN CLINIC",
                  },
                  subscribers: [],
                },
              ],
            },
          ],
        }),
    ],
    [
      "subscriber with no name",
      () =>
        build270(
          asJsCaller({
            ...CANONICAL_SPEC,
            informationSources: [
              {
                name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" },
                receivers: [
                  {
                    name: { entityIdentifierCode: "1P", entityTypeQualifier: "2" },
                    subscribers: [{ inquiries: [{ serviceTypeCodes: [{ code: "30" }] }] }],
                  },
                ],
              },
            ],
          }),
        ),
    ],
    [
      "subscriber that asks nothing",
      () =>
        build270({
          ...CANONICAL_SPEC,
          informationSources: [
            {
              name: { entityIdentifierCode: "PR", entityTypeQualifier: "2" },
              receivers: [
                {
                  name: { entityIdentifierCode: "1P", entityTypeQualifier: "2" },
                  subscribers: [
                    {
                      traces: [{ traceTypeCode: "1", referenceId: "ELIG20260601001" }],
                      name: {
                        entityIdentifierCode: "IL",
                        entityTypeQualifier: "1",
                        lastNameOrOrganizationName: "DOE",
                        firstName: "JANE",
                        idQualifier: "MI",
                        idCode: "MBR0001",
                      },
                      inquiries: [],
                    },
                  ],
                },
              ],
            },
          ],
        }),
    ],
  ];

  it.each(REFUSALS)("names no member value when refusing: %s", (_label, run) => {
    const err = refusalOf(run);
    for (const secret of [
      "MBR0001",
      "DOE",
      "JANE",
      "ELIG20260601001",
      "99213",
      "MEDPAY INSURANCE",
      "ANYTOWN CLINIC",
    ]) {
      expect(err.message).not.toContain(secret);
    }
  });

  it.each(REFUSALS)("stays inside the exported rendered-value ceiling: %s", (_label, run) => {
    // Asserted against the package's own export rather than a literal, so the
    // bound and this gate cannot drift apart. The ceiling bounds the rendered
    // FRAGMENT; a message is that plus the site's fixed template, and these
    // sites render no caller value at all.
    const err = refusalOf(run);
    expect(BUILD_REFUSAL_VALUE_MAX_RENDERED).toBeGreaterThan(0);
    expect(err.message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 200);
  });

  it("bounds the one caller value any refusal does render", () => {
    const err = refusalOf(() =>
      build270({
        ...CANONICAL_SPEC,
        envelope: { ...ENVELOPE, interchangeControlNumber: "9".repeat(120_000) },
      }),
    );
    expect(err.message).not.toContain("9".repeat(120_000));
    expect(err.message).toContain("(120000 characters)");
    expect(err.message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 200);
  });
});

describe("the reader is lenient where the builder refuses, and that is the split", () => {
  it("refuses to emit a model the reader returned for an incomplete document", () => {
    // `270-no-inquiry.edi` parses into a model with the inquiry region ABSENT
    // and a warning beside it. Handing the same shape to the builder refuses:
    // the region it is short of is one the builder would have to invent, and
    // emitting an EQ nobody asked for is exactly what "spec-clean by
    // construction" exists to prevent.
    const raw = readFileSync(join(FIXTURE_DIR, "270-no-inquiry.edi"), "utf8").trimEnd();
    const model = parse270Inquiries(raw)[0];
    expect(model?.warnings.map((w) => w.code)).toEqual(["X12_MISSING_REQUIRED_LOOP"]);

    const subscriber = model?.informationSources[0]?.receivers[0]?.subscribers[0];
    expect(subscriber?.inquiries).toEqual([]);

    const err = refusalOf(() =>
      build270(
        asJsCaller({
          envelope: ENVELOPE,
          informationSources: [
            {
              name: model?.informationSources[0]?.name,
              receivers: [
                {
                  name: model?.informationSources[0]?.receivers[0]?.name,
                  subscribers: [
                    { name: subscriber?.name, traces: subscriber?.traces, inquiries: [] },
                  ],
                },
              ],
            },
          ],
        }),
      ),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("asks nothing");
  });
});

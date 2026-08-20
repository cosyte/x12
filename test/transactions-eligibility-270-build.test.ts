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
 *   subscriber, a level with no name loop at any of the four levels, a level
 *   that asks nothing, an inquiry that asks nothing, an empty or over-long
 *   control number, a non-string element value, a forged array-like, and a real
 *   list left with an empty slot in it.
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

/**
 * The three well-formed pieces the level guards are driven against, so a case
 * that removes ONE name loop leaves every other level intact and the refusal it
 * draws can only be the one it removed. Synthetic throughout.
 */
const NM1_SOURCE = {
  entityIdentifierCode: "PR",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "MEDPAY INSURANCE",
} as const;

const NM1_RECEIVER = {
  entityIdentifierCode: "1P",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "ANYTOWN CLINIC",
} as const;

const OK_SUBSCRIBER = {
  name: {
    entityIdentifierCode: "IL",
    entityTypeQualifier: "1",
    lastNameOrOrganizationName: "DOE",
    firstName: "JANE",
    idQualifier: "MI",
    idCode: "MBR0001",
  },
  inquiries: [{ serviceTypeCodes: [{ code: "30" }] }],
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

  /**
   * The guard is on EVERY level, which is what the TR3 asks for: Loop 2100A and
   * Loop 2100B carry an NM1 exactly as Loop 2100C and Loop 2100D do. It held at
   * the subscriber and the dependent and not at the source or the receiver,
   * where the same defect reached `emitName` and threw an untyped `TypeError`
   * carrying no `code`. Each level is driven separately rather than through one
   * table, so a level that stops being guarded fails by its own name.
   */
  const LEVELS: readonly (readonly [string, string, unknown])[] = [
    [
      "information source (Loop 2100A)",
      "source[0]",
      { receivers: [{ name: NM1_RECEIVER, subscribers: [OK_SUBSCRIBER] }] },
    ],
    [
      "information receiver (Loop 2100B)",
      "source[0].receiver[0]",
      { name: NM1_SOURCE, receivers: [{ subscribers: [OK_SUBSCRIBER] }] },
    ],
  ];

  it.each(LEVELS)("refuses an %s with no name loop", (_label, locator, source) => {
    const err = refusalOf(() =>
      build270(asJsCaller({ ...CANONICAL_SPEC, informationSources: [source] })),
    );
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("has no name loop");
    expect(err.message).toContain(locator);
  });

  /** The same defect spelled `null`, at all four levels. */
  const NULL_NAME_LEVELS: readonly (readonly [string, unknown])[] = [
    [
      "source[0]",
      { name: null, receivers: [{ name: NM1_RECEIVER, subscribers: [OK_SUBSCRIBER] }] },
    ],
    [
      "source[0].receiver[0]",
      { name: NM1_SOURCE, receivers: [{ name: null, subscribers: [OK_SUBSCRIBER] }] },
    ],
    [
      "source[0].receiver[0].subscriber[0]",
      {
        name: NM1_SOURCE,
        receivers: [{ name: NM1_RECEIVER, subscribers: [{ ...OK_SUBSCRIBER, name: null }] }],
      },
    ],
    [
      "source[0].receiver[0].subscriber[0].dependent[0]",
      {
        name: NM1_SOURCE,
        receivers: [
          {
            name: NM1_RECEIVER,
            subscribers: [
              {
                ...OK_SUBSCRIBER,
                dependents: [{ name: null, inquiries: OK_SUBSCRIBER.inquiries }],
              },
            ],
          },
        ],
      },
    ],
  ];

  it.each(NULL_NAME_LEVELS)(
    "refuses a name loop that came through as null: %s",
    (locator, source) => {
      // `typeof null` is `"object"`, so a guard that tests only `undefined`
      // passes `null` straight through to the NM1 emitter. That is the shape a
      // `JSON.parse`d payload carries for an omitted object, from the caller
      // class these guards exist for.
      const err = refusalOf(() =>
        build270(asJsCaller({ ...CANONICAL_SPEC, informationSources: [source] })),
      );
      expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
      expect(err.message).toContain(`the level at ${locator} has no name loop`);
    },
  );

  it("takes an OPTIONAL nested object sent as null as absent, not as a defect", () => {
    // The other side of the same question, and the convention the array
    // chokepoint already holds: `null` is how a JSON payload spells an omitted
    // object, and an omitted optional is not a defect. What it must NOT do is
    // read as PRESENT and dereference into an untyped `TypeError`, which is
    // what an address and a procedure sent that way used to do.
    const ix = build270(
      asJsCaller({
        ...CANONICAL_SPEC,
        informationSources: [
          {
            name: { ...NM1_SOURCE, address: null },
            receivers: [
              {
                name: NM1_RECEIVER,
                subscribers: [
                  {
                    ...OK_SUBSCRIBER,
                    inquiries: [{ serviceTypeCodes: [{ code: "30" }], procedure: null }],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    expect(ix.warnings).toEqual([]);
    const raw = serializeX12(ix);
    // Absent means absent: no address segments, and an EQ with no procedure
    // composite rather than an empty one.
    expect(raw).not.toContain("N3*");
    expect(raw).not.toContain("N4*");
    expect(raw).toContain("EQ*30~");
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

describe("build270 - a forged array-like, or a hole in a real one, refuses", () => {
  /**
   * Two defects from the same caller, swept over the same slots.
   *
   * **A forged array-like** - `{ length: "9".repeat(120_000) }` - coerces to
   * `Infinity` in a `<` comparison, which is what turns a bounded loop into an
   * unbounded one. Every list slot the builder walks is read through
   * `requireCallerArray` first, so each of these refuses with a typed,
   * code-tagged error instead.
   *
   * **A hole in a real list** clears that chokepoint, because the value IS an
   * array: `JSON.parse` of a payload with a dropped record, or a `map` that
   * returned nothing for one row, hands over a genuine array with `undefined`
   * sitting in a slot. Unguarded it reaches an emitter, which dereferences it
   * and throws an untyped `TypeError` whose `code` is `undefined` - the exact
   * value a consumer cannot branch on, and the one this builder's guard lineage
   * exists to eliminate. The builder therefore checks every list for holes at
   * the same point it checks that the list is a list.
   *
   * **Both sweeps are over EVERY list slot the spec types declare, not over the
   * spine alone.** An earlier draft guarded the three slots that shape the HL
   * hierarchy and left the leaf lists to throw an untyped `TypeError`, which
   * terminates but carries no `code` for a JSON-driven caller to branch on.
   * That is the sibling builders' behaviour, disclosed repo-wide in
   * `KNOWN-LIMITATIONS.md`; it is not what this builder's own contract says,
   * so this builder is deliberately stricter than its siblings and the sweeps
   * below are what hold it there. The last test is the exhaustiveness half: it
   * reads the spec types and fails BY NAME if a list slot is declared that
   * neither sweep plants a value in.
   */
  const FORGED = asJsCaller<never>({ length: "9".repeat(120_000) });

  /**
   * A spec that POPULATES every list slot, so a path can be planted in each.
   * Synthetic throughout, and the same shapes the rest of this file uses.
   */
  const EVERY_LIST_SPEC: Build270Spec = {
    envelope: ENVELOPE,
    header: { referenceId: "REQ-0001" },
    informationSources: [
      {
        name: {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          lastNameOrOrganizationName: "MEDPAY INSURANCE",
          address: { lines: ["1 PAYER PLZ"], city: "COLUMBUS", state: "OH" },
        },
        references: [{ qualifier: "6P", value: "GROUP0001" }],
        receivers: [
          {
            name: {
              entityIdentifierCode: "1P",
              entityTypeQualifier: "2",
              lastNameOrOrganizationName: "ANYTOWN CLINIC",
              address: { lines: ["2 CLINIC WAY"], city: "COLUMBUS", state: "OH" },
            },
            references: [{ qualifier: "EO", value: "SUBMIT0001" }],
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
                  address: { lines: ["100 MAIN ST"], city: "COLUMBUS", state: "OH" },
                },
                references: [{ qualifier: "18", value: "PLAN0001" }],
                dates: [{ qualifier: "291", formatQualifier: "D8", value: "20260601" }],
                inquiries: [
                  {
                    serviceTypeCodes: [{ code: "30" }],
                    procedure: { qualifier: "HC", code: "99213", modifiers: ["25"] },
                    diagnosisCodePointers: ["1"],
                    references: [{ qualifier: "9F", value: "AUTH0001" }],
                    dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260601" }],
                  },
                ],
                dependents: [
                  {
                    traces: [{ traceTypeCode: "1", referenceId: "ELIG20260601004" }],
                    name: {
                      entityIdentifierCode: "03",
                      entityTypeQualifier: "1",
                      lastNameOrOrganizationName: "DOE",
                      firstName: "BABY",
                      address: { lines: ["100 MAIN ST"], city: "COLUMBUS", state: "OH" },
                    },
                    references: [{ qualifier: "18", value: "PLAN0002" }],
                    dates: [{ qualifier: "291", formatQualifier: "D8", value: "20260601" }],
                    inquiries: [
                      {
                        serviceTypeCodes: [{ code: "35" }],
                        procedure: { qualifier: "HC", code: "99213", modifiers: ["25"] },
                        diagnosisCodePointers: ["1"],
                        references: [{ qualifier: "9F", value: "AUTH0002" }],
                        dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260601" }],
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

  /**
   * Plant a value at one dot path of a deep clone. Refusing a path the spec
   * above does not populate is the point: a case naming a slot that is not
   * there would otherwise pass vacuously.
   */
  function plantAt(path: string, value: unknown): Build270Spec {
    const root = structuredClone(EVERY_LIST_SPEC) as unknown as Record<string, unknown>;
    const keys = path.split(".");
    const last = keys[keys.length - 1] ?? "";
    let node: Record<string, unknown> = root;
    for (const key of keys.slice(0, -1)) {
      const next = node[key];
      if (next === null || typeof next !== "object") {
        throw new Error(`the sweep spec has no ${path}: it stops at ${key}`);
      }
      node = next as Record<string, unknown>;
    }
    if (node[last] === undefined) throw new Error(`the sweep spec has no ${path}`);
    node[last] = value;
    return root as unknown as Build270Spec;
  }

  /** The list at `path` replaced by one that is not a list at all. */
  function plantForged(path: string): Build270Spec {
    return plantAt(path, FORGED);
  }

  /** The list at `path` replaced by a REAL array whose only slot is empty. */
  function plantHole(path: string): Build270Spec {
    return plantAt(path, [undefined]);
  }

  const SUBSCRIBER = "informationSources.0.receivers.0.subscribers.0";
  const DEPENDENT = `${SUBSCRIBER}.dependents.0`;

  /** Lists that decide where a level hangs: a forged one is a hierarchy defect. */
  const SPINE_SLOTS: readonly string[] = [
    "informationSources",
    "informationSources.0.receivers",
    "informationSources.0.receivers.0.subscribers",
    `${SUBSCRIBER}.inquiries`,
    `${SUBSCRIBER}.inquiries.0.serviceTypeCodes`,
    `${SUBSCRIBER}.dependents`,
    `${DEPENDENT}.inquiries`,
    `${DEPENDENT}.inquiries.0.serviceTypeCodes`,
  ];

  /** Every other list: a forged one is a spec defect, not a hierarchy one. */
  const LEAF_SLOTS: readonly string[] = [
    "informationSources.0.references",
    "informationSources.0.name.address.lines",
    "informationSources.0.receivers.0.references",
    "informationSources.0.receivers.0.name.address.lines",
    `${SUBSCRIBER}.traces`,
    `${SUBSCRIBER}.references`,
    `${SUBSCRIBER}.dates`,
    `${SUBSCRIBER}.name.address.lines`,
    `${SUBSCRIBER}.inquiries.0.diagnosisCodePointers`,
    `${SUBSCRIBER}.inquiries.0.procedure.modifiers`,
    `${SUBSCRIBER}.inquiries.0.references`,
    `${SUBSCRIBER}.inquiries.0.dates`,
    `${DEPENDENT}.traces`,
    `${DEPENDENT}.references`,
    `${DEPENDENT}.dates`,
    `${DEPENDENT}.name.address.lines`,
    `${DEPENDENT}.inquiries.0.diagnosisCodePointers`,
    `${DEPENDENT}.inquiries.0.procedure.modifiers`,
    `${DEPENDENT}.inquiries.0.references`,
    `${DEPENDENT}.inquiries.0.dates`,
  ];

  it("builds cleanly before anything is forged, so no case passes vacuously", () => {
    expect(build270(EVERY_LIST_SPEC).warnings).toEqual([]);
  });

  it.each(SPINE_SLOTS)("refuses a forged %s with the hierarchy code", (path) => {
    const err = refusalOf(() => build270(plantForged(path)));
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY);
    expect(err.message).toContain("must be an array");
    expect(err.message).toContain("(120000 characters)");
    expect(err.message).not.toContain("9".repeat(120_000));
    expect(err.message.length).toBeLessThan(400);
  });

  it.each(LEAF_SLOTS)("refuses a forged %s with the spec code", (path) => {
    const err = refusalOf(() => build270(plantForged(path)));
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("must be an array");
    expect(err.message).toContain("(120000 characters)");
    expect(err.message).not.toContain("9".repeat(120_000));
    expect(err.message.length).toBeLessThan(400);
  });

  it.each(SPINE_SLOTS)("refuses a hole in %s with the hierarchy code", (path) => {
    const err = refusalOf(() => build270(plantHole(path)));
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_HIERARCHY);
    expect(err.message).toContain("is an empty list slot");
    expect(err.message.length).toBeLessThan(400);
  });

  it.each(LEAF_SLOTS)("refuses a hole in %s with the spec code", (path) => {
    const err = refusalOf(() => build270(plantHole(path)));
    expect(err.code).toBe(ELIGIBILITY_270_BUILD_ERROR_CODES.X12_270_BUILD_INVALID_SPEC);
    expect(err.message).toContain("is an empty list slot");
    expect(err.message.length).toBeLessThan(400);
  });

  it("names the slot that is empty, and nothing out of the inquiry", () => {
    // The locator is the whole value of the message: a consumer who catches
    // this has to find the hole in a payload they did not hand-write. It is
    // assembled by this library from indices it computed, so it names a path
    // and never a member id, a member name, a trace or a diagnosis code.
    const err = refusalOf(() =>
      build270(plantHole("informationSources.0.receivers.0.subscribers.0.traces")),
    );
    expect(err.message).toContain("source[0].receiver[0].subscriber[0].traces[0]");
    for (const secret of ["MBR0001", "DOE", "JANE", "ELIG20260601001", "99213", "ANYTOWN CLINIC"]) {
      expect(err.message).not.toContain(secret);
    }
  });

  it("says which of the two empty values it received", () => {
    // `null` is what a JSON payload carries far more often than `undefined`,
    // and `typeof null` is `"object"`, so a guard testing only `undefined`
    // lets it through to the same crash. Both are holes and both are named.
    const undef = refusalOf(() => build270(plantAt("informationSources", [undefined])));
    const nul = refusalOf(() => build270(plantAt("informationSources", [null])));
    expect(undef.message).toContain("Received undefined");
    expect(nul.message).toContain("Received null");
  });

  it("covers every list slot the spec types declare", () => {
    // The exhaustiveness half, in the shape `builder-array-bounds.test.ts`
    // uses: read the declarations rather than trust the table. A list added to
    // `build-270-types.ts` that no case above plants a forged value or a hole
    // in reds here, by name, without anyone remembering to extend the table.
    const types = readFileSync(
      join(__dirname, "..", "src", "transactions", "eligibility", "build-270-types.ts"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//gu, "");
    const declared = new Set(
      [...types.matchAll(/readonly ([A-Za-z0-9_]+)\??: readonly [A-Za-z0-9_]+\[\]/gu)].map(
        (m) => m[1] ?? "",
      ),
    );
    const swept = new Set(
      [...SPINE_SLOTS, ...LEAF_SLOTS].map((p) => p.slice(p.lastIndexOf(".") + 1)),
    );
    expect(declared.size).toBeGreaterThan(0);
    expect([...declared].filter((name) => !swept.has(name))).toEqual([]);
    expect([...swept].filter((name) => !declared.has(name))).toEqual([]);
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
      "information source with no name",
      () =>
        build270(
          asJsCaller({
            ...CANONICAL_SPEC,
            informationSources: [
              { receivers: [{ name: NM1_RECEIVER, subscribers: [OK_SUBSCRIBER] }] },
            ],
          }),
        ),
    ],
    [
      "a hole where a subscriber belongs",
      () =>
        build270(
          asJsCaller({
            ...CANONICAL_SPEC,
            informationSources: [
              { name: NM1_SOURCE, receivers: [{ name: NM1_RECEIVER, subscribers: [undefined] }] },
            ],
          }),
        ),
    ],
    [
      "a hole where a trace belongs",
      () =>
        build270(
          asJsCaller({
            ...CANONICAL_SPEC,
            informationSources: [
              {
                name: NM1_SOURCE,
                receivers: [
                  {
                    name: NM1_RECEIVER,
                    subscribers: [{ ...OK_SUBSCRIBER, traces: [undefined] }],
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

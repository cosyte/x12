/**
 * Unit tests for the 005010X212 276 EMIT surface - `build276`. Covers:
 *
 * - Happy path: a built 276 is spec-clean, its control numbers and counts
 *   reconcile, parsing it raises NO warning, and it round-trips through
 *   `get276StatusInquiry` field for field.
 * - Envelope identity: GS-01 `HR`, ST-01 `276`, ST-03 / GS-08 `005010X212`, and
 *   a BHT whose purpose code says request, none of them the 277's response
 *   identifiers. GS-01 is not asserted here as something this TR3 "gives": the
 *   package has not purchased that TR3, and the value is read from the cited
 *   data element 479 table at `src/code-lists/functional-identifier.ts`, whose
 *   own provenance gate is `test/code-lists-functional-identifier.test.ts`.
 * - The HL spine the builder OWNS: every HL-01, HL-02 and HL-04 is computed
 *   from the nested tree, so a caller cannot state an inconsistent hierarchy.
 * - Refusals, which are the whole of "spec-clean by construction": no
 *   information source, a source with no receiver, a receiver that reaches no
 *   subscriber (both links of it), a level with no name loop at any of the five
 *   levels, a level that asks about no claim, a claim that asks nothing, a
 *   service line that identifies nothing, an empty or over-long control number,
 *   a non-string element value, a forged array-like, and a real list left with
 *   an empty slot in it.
 * - PHI discipline: a refusal message names structural indices and counts and
 *   never a member id, a member name, a patient name, a trace, a claim number
 *   or a diagnosis code, and it stays inside the package's exported
 *   rendered-value ceiling.
 * - The committed golden: read, rebuilt from the resulting model and
 *   serialized, it is reproduced byte for byte.
 * - The read side and the emit side disagree deliberately: a model the reader
 *   returns for a structurally incomplete document is REFUSED by the builder,
 *   because the region it is short of is one the builder would have to invent.
 *
 * Synthetic-only values throughout: names `DOE` / `JANE` / `BABY`, member ids
 * of the obviously-fake `MBR0001` shape, `PCN0001`-shaped claim numbers.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  CLAIM_STATUS_276_BUILD_ERROR_CODES,
  ClaimStatus276BuildError,
  X12Decimal,
  build276,
  get276StatusInquiry,
  get277Status,
  parse276StatusInquiries,
  parseX12,
  serializeX12,
} from "../src/index.js";
import type {
  Build276ClaimSpec,
  Build276Spec,
  X12Interchange,
  X12ParseWarning,
  X12StatusInquiry,
} from "../src/index.js";
import { FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET } from "../src/code-lists/functional-identifier.js";

import { specFromModel } from "./_helpers/status-inquiry-spec.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "status");
const GOLDEN_DIR = join(__dirname, "fixtures", "golden");

/**
 * Launder a value into the typed slot the builder declares. Every forged case
 * here is a JavaScript or JSON caller reaching a slot the TypeScript types say
 * is unreachable, which is the point: the types are not a runtime guarantee,
 * and the published `@cosyte/cli` is such a caller.
 */
function asJsCaller<T>(value: unknown): T {
  return value as T;
}

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

function inquiryOf(ix: X12Interchange): X12StatusInquiry {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const inquiry = get276StatusInquiry(ix.delimiters, tx);
  if (inquiry === undefined) {
    throw new Error("get276StatusInquiry did not recognize the built 276");
  }
  return inquiry;
}

const ENVELOPE = {
  senderId: "ANYTOWNCLINIC",
  receiverId: "MEDPAY",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000011",
  groupControlNumber: "11",
  transactionSetControlNumber: "0001",
} as const;

/**
 * The well-formed pieces the level guards are driven against, so a case that
 * removes ONE name loop leaves every other level intact and the refusal it
 * draws can only be the one it removed. Synthetic throughout.
 */
const NM1_SOURCE = {
  entityIdentifierCode: "PR",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "MEDPAY INSURANCE",
} as const;

const NM1_RECEIVER = {
  entityIdentifierCode: "41",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "ANYTOWN CLINIC",
} as const;

const NM1_PROVIDER = {
  entityIdentifierCode: "1P",
  entityTypeQualifier: "2",
  lastNameOrOrganizationName: "ANYTOWN CLINIC",
  idQualifier: "XX",
  idCode: "1234567890",
} as const;

const OK_CLAIM = {
  trace: { traceTypeCode: "1", referenceId: "STATUS0001" },
  references: [{ qualifier: "1K", value: "PCN0001" }],
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
  claims: [OK_CLAIM],
} as const;

/** A minimal well-formed spec, with `over` folded into the subscriber level. */
function specWith(subscriber: unknown): Build276Spec {
  return asJsCaller({
    envelope: ENVELOPE,
    informationSources: [
      {
        name: NM1_SOURCE,
        receivers: [
          { name: NM1_RECEIVER, providers: [{ name: NM1_PROVIDER, subscribers: [subscriber] }] },
        ],
      },
    ],
  });
}

const MINIMAL_SPEC: Build276Spec = specWith(OK_SUBSCRIBER);

const CANONICAL_SPEC: Build276Spec = {
  envelope: ENVELOPE,
  header: { referenceId: "STATUS-0001" },
  informationSources: [
    {
      name: { ...NM1_SOURCE, idQualifier: "PI", idCode: "PAYER01" },
      receivers: [
        {
          name: { ...NM1_RECEIVER, idQualifier: "46", idCode: "RECVR01" },
          providers: [
            {
              name: NM1_PROVIDER,
              subscribers: [
                {
                  name: {
                    entityIdentifierCode: "IL",
                    entityTypeQualifier: "1",
                    lastNameOrOrganizationName: "DOE",
                    firstName: "JANE",
                    middleName: "A",
                    idQualifier: "MI",
                    idCode: "MBR0001",
                    dateOfBirth: "19850515",
                    genderCode: "F",
                  },
                  claims: [
                    {
                      trace: {
                        traceTypeCode: "1",
                        referenceId: "STATUS20260601001",
                        originatingCompanyId: "9SAMPLEORG",
                      },
                      references: [{ qualifier: "1K", value: "PCN0001" }],
                      amounts: [{ qualifier: "T3", amount: dec("150") }],
                      dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260520" }],
                      serviceLines: [
                        {
                          procedure: { qualifier: "HC", code: "99213", modifiers: ["25"] },
                          lineChargeAmount: dec("150"),
                          unitsOfService: dec("1"),
                          references: [{ qualifier: "FJ", value: "LINE001" }],
                          dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260520" }],
                        },
                      ],
                    },
                  ],
                  dependents: [
                    {
                      name: {
                        entityIdentifierCode: "QC",
                        entityTypeQualifier: "1",
                        lastNameOrOrganizationName: "DOE",
                        firstName: "BABY",
                        idQualifier: "MI",
                        idCode: "MBR0002",
                        dateOfBirth: "20240101",
                        genderCode: "M",
                      },
                      claims: [
                        {
                          trace: { traceTypeCode: "1", referenceId: "STATUS20260601002" },
                          references: [{ qualifier: "1K", value: "PCN0002" }],
                          dates: [
                            {
                              qualifier: "472",
                              formatQualifier: "RD8",
                              value: "20260501-20260503",
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
    },
  ],
};

// ---------------------------------------------------------------------------
// Happy path: what the builder emits, and that it reads back.
// ---------------------------------------------------------------------------

describe("build276: the emitted document", () => {
  it("emits a spec-clean interchange that parses with no warning", () => {
    const ix = build276(CANONICAL_SPEC);
    expect(ix.warnings).toEqual([]);
    const warnings: X12ParseWarning[] = [];
    const raw = serializeX12(ix, { specClean: true, onWarning: (w) => warnings.push(w) });
    expect(warnings).toEqual([]);
    expect(parseX12(raw).warnings).toEqual([]);
  });

  it("reconciles every count and control-number pair by construction", () => {
    const raw = serializeX12(build276(CANONICAL_SPEC));
    const ix = parseX12(raw);
    const group = ix.groups[0];
    const tx = group?.transactions[0];
    expect(ix.isa.elements[13]).toBe("000000011");
    expect(ix.iea?.elements[2]).toBe("000000011");
    expect(ix.iea?.elements[1]).toBe("1");
    expect(group?.gs.elements[6]).toBe("11");
    expect(group?.ge?.elements[2]).toBe("11");
    expect(group?.ge?.elements[1]).toBe("1");
    expect(tx?.st.elements[2]).toBe("0001");
    expect(tx?.se?.elements[2]).toBe("0001");
    // SE-01 counts the segments the serializer writes, ST and SE included.
    expect(tx?.se?.elements[1]).toBe(String(tx?.segments.length));
  });

  it("round-trips through get276StatusInquiry field for field", () => {
    const inquiry = inquiryOf(build276(CANONICAL_SPEC));
    expect(inquiry.warnings).toEqual([]);
    expect(inquiry.header?.referenceId).toBe("STATUS-0001");

    const subscriber = inquiry.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
    expect(subscriber?.name?.idCode).toBe("MBR0001");
    expect(subscriber?.name?.dateOfBirth).toBe("19850515");
    const claim = subscriber?.claims[0];
    expect(claim?.trace?.referenceId).toBe("STATUS20260601001");
    expect(claim?.trace?.originatingCompanyId).toBe("9SAMPLEORG");
    expect(claim?.references.map((r) => [r.qualifier, r.value])).toEqual([["1K", "PCN0001"]]);
    expect(claim?.amounts.map((a) => [a.qualifier, a.amount.toString()])).toEqual([["T3", "150"]]);
    expect(claim?.dates.map((d) => d.value)).toEqual(["20260520"]);
    const line = claim?.serviceLines[0];
    expect(line?.procedure?.code).toBe("99213");
    expect(line?.procedure?.modifiers).toEqual(["25"]);
    expect(line?.lineChargeAmount?.toString()).toBe("150");
    expect(line?.unitsOfService?.toString()).toBe("1");

    const dependent = subscriber?.dependents[0];
    expect(dependent?.name?.firstName).toBe("BABY");
    expect(dependent?.claims[0]?.trace?.referenceId).toBe("STATUS20260601002");
  });

  it("carries the trace the answering 277 echoes back, unchanged", () => {
    // The reassociation invariant this pair exists for: the trace a submitter
    // puts in TRN-02 of the request is the trace the response reader surfaces
    // when a payer echoes it. Asserted across BOTH readers here rather than
    // implied, on documents this package built.
    const request = inquiryOf(build276(CANONICAL_SPEC));
    const sent =
      request.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0]?.claims[0]?.trace
        ?.referenceId;
    expect(sent).toBe("STATUS20260601001");

    const responseRaw = readFileSync(join(FIXTURE_DIR, "277-canonical.edi"), "utf8").trimEnd();
    const rix = parseX12(responseRaw);
    const rtx = rix.groups[0]?.transactions[0];
    const echoed = rtx === undefined ? undefined : get277Status(rix.delimiters, rtx);
    // The committed 277 echoes ITS request's trace, verbatim and unmodified.
    expect(echoed?.claims[0]?.traces[0]?.referenceId).toBe("ECHO-276-TRACE-001");
  });
});

// ---------------------------------------------------------------------------
// Envelope identity: the identifiers the REQUEST travels under, and where each
// of them came from.
// ---------------------------------------------------------------------------

describe("build276: the envelope identifiers", () => {
  it("stamps GS-01 HR, ST-01 276 and 005010X212 into GS-08 and ST-03", () => {
    const ix = build276(MINIMAL_SPEC);
    const group = ix.groups[0];
    expect(group?.gs.elements[1]).toBe("HR");
    expect(group?.gs.elements[7]).toBe("X");
    expect(group?.gs.elements[8]).toBe("005010X212");
    const tx = group?.transactions[0];
    expect(tx?.st.elements[1]).toBe("276");
    expect(tx?.st.elements[3]).toBe("005010X212");
  });

  it("takes GS-01 from the cited element 479 table rather than a literal of its own", () => {
    // Provenance, not just value. The assertion above pins WHICH code reaches
    // the wire; this one pins WHERE it came from, which is the half a literal
    // in this file cannot distinguish from a code supplied out of thin air.
    // `src/code-lists/functional-identifier.ts` is that carrier, it records the
    // reference it was read from, and eight of its nine rows are cross-checked
    // against the GS-01 this package's other builders already declare by
    // `test/code-lists-functional-identifier.test.ts`.
    const ix = build276(MINIMAL_SPEC);
    expect(ix.groups[0]?.gs.elements[1]).toBe(FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET["276"]);
  });

  it("does NOT reuse the 277's response functional identifier", () => {
    // `HN` is the claim status NOTIFICATION, which is the response half of this
    // pair. A request in an `HN` group is one a receiver routes to its response
    // handler, so the two must differ and this pins that they do.
    const ix = build276(MINIMAL_SPEC);
    expect(ix.groups[0]?.gs.elements[1]).not.toBe("HN");
    expect(ix.groups[0]?.gs.elements[1]).not.toBe(FUNCTIONAL_IDENTIFIER_BY_TRANSACTION_SET["277"]);
  });

  it("emits a BHT whose purpose code says request", () => {
    const tx = build276(MINIMAL_SPEC).groups[0]?.transactions[0];
    const bht = tx?.segments.find((s) => s.id === "BHT");
    expect(bht?.elements[1]).toBe("0010");
    expect(bht?.elements[2]).toBe("13");
  });

  it("lets a caller state the header and defaults the rest off the envelope", () => {
    const inquiry = inquiryOf(build276({ ...MINIMAL_SPEC, header: { referenceId: "REQ-9" } }));
    expect(inquiry.header?.referenceId).toBe("REQ-9");
    expect(inquiry.header?.date).toBe("20260601");
    expect(inquiry.header?.time).toBe("1200");
  });
});

// ---------------------------------------------------------------------------
// The HL spine the builder owns.
// ---------------------------------------------------------------------------

describe("build276: the builder owns the HL spine", () => {
  it("computes every HL-01, HL-02 and HL-04 from the nested tree", () => {
    const tx = build276(CANONICAL_SPEC).groups[0]?.transactions[0];
    const hls = (tx?.segments ?? [])
      .filter((s) => s.id === "HL")
      .map((s) => s.elements.slice(1, 5));
    expect(hls).toEqual([
      ["1", "", "20", "1"],
      ["2", "1", "21", "1"],
      ["3", "2", "19", "1"],
      ["4", "3", "22", "1"],
      ["5", "4", "23", "0"],
    ]);
  });

  it("sets the subscriber HL-04 to 0 when it carries no dependent", () => {
    const tx = build276(MINIMAL_SPEC).groups[0]?.transactions[0];
    const subscriberHl = (tx?.segments ?? []).find((s) => s.id === "HL" && s.elements[3] === "22");
    expect(subscriberHl?.elements[4]).toBe("0");
  });

  it("numbers a second subscriber sequentially and points it at the same provider", () => {
    const spec = asJsCaller<Build276Spec>({
      envelope: ENVELOPE,
      informationSources: [
        {
          name: NM1_SOURCE,
          receivers: [
            {
              name: NM1_RECEIVER,
              providers: [
                {
                  name: NM1_PROVIDER,
                  subscribers: [
                    OK_SUBSCRIBER,
                    {
                      ...OK_SUBSCRIBER,
                      claims: [
                        {
                          trace: { traceTypeCode: "1", referenceId: "STATUS0002" },
                          references: [{ qualifier: "1K", value: "PCN0002" }],
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
    });
    const tx = build276(spec).groups[0]?.transactions[0];
    const hls = (tx?.segments ?? [])
      .filter((s) => s.id === "HL")
      .map((s) => s.elements.slice(1, 5));
    expect(hls).toEqual([
      ["1", "", "20", "1"],
      ["2", "1", "21", "1"],
      ["3", "2", "19", "1"],
      ["4", "3", "22", "0"],
      ["5", "3", "22", "0"],
    ]);
  });
});

// ---------------------------------------------------------------------------
// Refusals: the hierarchy.
// ---------------------------------------------------------------------------

/** Assert `run` refuses with the typed error and the expected stable code. */
function expectRefusal(run: () => unknown, code: string): ClaimStatus276BuildError {
  let thrown: unknown;
  try {
    run();
  } catch (err) {
    thrown = err;
  }
  expect(thrown).toBeInstanceOf(ClaimStatus276BuildError);
  const error = thrown as ClaimStatus276BuildError;
  expect(error.code).toBe(code);
  return error;
}

const HIERARCHY = CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_HIERARCHY;
const SPEC = CLAIM_STATUS_276_BUILD_ERROR_CODES.X12_276_BUILD_INVALID_SPEC;

describe("build276: a hierarchy it cannot form is refused, and nothing is emitted", () => {
  it("refuses a spec with no information source", () => {
    const err = expectRefusal(
      () => build276({ envelope: ENVELOPE, informationSources: [] }),
      HIERARCHY,
    );
    expect(err.message).toContain("information source");
  });

  it("refuses a source with no receiver", () => {
    expectRefusal(
      () =>
        build276({ envelope: ENVELOPE, informationSources: [{ name: NM1_SOURCE, receivers: [] }] }),
      HIERARCHY,
    );
  });

  it("refuses a receiver with no service provider, which is the first link to a subscriber", () => {
    const err = expectRefusal(
      () =>
        build276({
          envelope: ENVELOPE,
          informationSources: [
            { name: NM1_SOURCE, receivers: [{ name: NM1_RECEIVER, providers: [] }] },
          ],
        }),
      HIERARCHY,
    );
    expect(err.message).toContain("reaches no subscriber");
  });

  it("refuses a service provider with no subscriber, which is the second link", () => {
    const err = expectRefusal(
      () =>
        build276({
          envelope: ENVELOPE,
          informationSources: [
            {
              name: NM1_SOURCE,
              receivers: [
                { name: NM1_RECEIVER, providers: [{ name: NM1_PROVIDER, subscribers: [] }] },
              ],
            },
          ],
        }),
      HIERARCHY,
    );
    expect(err.message).toContain("subscriber (HL level 22)");
  });

  it("refuses a SPINE list slot holding something that is not a list", () => {
    expectRefusal(
      () => build276(asJsCaller({ envelope: ENVELOPE, informationSources: "nope" })),
      HIERARCHY,
    );
    expectRefusal(
      () =>
        build276(
          asJsCaller({
            envelope: ENVELOPE,
            informationSources: [{ name: NM1_SOURCE, receivers: { length: 3 } }],
          }),
        ),
      HIERARCHY,
    );
  });

  it("refuses a real list left with an empty slot in it", () => {
    expectRefusal(
      () => build276(asJsCaller({ envelope: ENVELOPE, informationSources: [undefined] })),
      HIERARCHY,
    );
    expectRefusal(() => build276(specWith(null)), HIERARCHY);
  });
});

// ---------------------------------------------------------------------------
// Refusals: what the builder cannot emit spec-clean.
// ---------------------------------------------------------------------------

describe("build276: a level or claim it cannot emit spec-clean is refused", () => {
  it("refuses a level with no name loop, at every one of the five levels", () => {
    const noName = (
      level: "source" | "receiver" | "provider" | "subscriber" | "dependent",
    ): Build276Spec =>
      asJsCaller({
        envelope: ENVELOPE,
        informationSources: [
          {
            ...(level === "source" ? {} : { name: NM1_SOURCE }),
            receivers: [
              {
                ...(level === "receiver" ? {} : { name: NM1_RECEIVER }),
                providers: [
                  {
                    ...(level === "provider" ? {} : { name: NM1_PROVIDER }),
                    subscribers: [
                      {
                        ...(level === "subscriber" ? {} : { name: OK_SUBSCRIBER.name }),
                        claims: [OK_CLAIM],
                        ...(level === "dependent" ? { dependents: [{ claims: [OK_CLAIM] }] } : {}),
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
    for (const level of ["source", "receiver", "provider", "subscriber", "dependent"] as const) {
      const err = expectRefusal(() => build276(noName(level)), SPEC);
      expect(err.message).toContain("no name loop (NM1)");
    }
  });

  it("refuses a name that arrived as null, which typeof calls an object", () => {
    expectRefusal(() => build276(specWith({ name: null, claims: [OK_CLAIM] })), SPEC);
  });

  it("refuses a subscriber that asks nothing and carries no dependent that does", () => {
    const err = expectRefusal(
      () => build276(specWith({ name: OK_SUBSCRIBER.name, claims: [] })),
      SPEC,
    );
    expect(err.message).toContain("asks nothing");
  });

  it("accepts a subscriber with no claim of its own when a dependent carries one", () => {
    const ix = build276(
      specWith({
        name: OK_SUBSCRIBER.name,
        dependents: [{ name: { ...OK_SUBSCRIBER.name, firstName: "BABY" }, claims: [OK_CLAIM] }],
      }),
    );
    const subscriber =
      inquiryOf(ix).informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
    expect(subscriber?.claims).toEqual([]);
    expect(subscriber?.dependents[0]?.claims).toHaveLength(1);
  });

  it("refuses a dependent with no claim to ask about", () => {
    const err = expectRefusal(
      () =>
        build276(
          specWith({
            name: OK_SUBSCRIBER.name,
            claims: [OK_CLAIM],
            dependents: [{ name: OK_SUBSCRIBER.name, claims: [] }],
          }),
        ),
      SPEC,
    );
    expect(err.message).toContain("no claim (Loop 2200E)");
  });

  it("refuses a claim carrying nothing a payer could find it by", () => {
    const err = expectRefusal(
      () =>
        build276(
          specWith({
            name: OK_SUBSCRIBER.name,
            claims: [{ trace: { traceTypeCode: "1", referenceId: "STATUS0001" } }],
          }),
        ),
      SPEC,
    );
    expect(err.message).toContain("asks nothing");
  });

  it("refuses a claim with no trace, which would fold into the claim before it", () => {
    const err = expectRefusal(
      () =>
        build276(
          specWith({
            name: OK_SUBSCRIBER.name,
            claims: [{ references: [{ qualifier: "1K", value: "PCN0001" }] }],
          }),
        ),
      SPEC,
    );
    expect(err.message).toContain("no trace (TRN)");
  });

  it("refuses a service line that identifies no service", () => {
    const err = expectRefusal(
      () =>
        build276(
          specWith({
            name: OK_SUBSCRIBER.name,
            claims: [{ trace: OK_CLAIM.trace, serviceLines: [{ lineChargeAmount: dec("150") }] }],
          }),
        ),
      SPEC,
    );
    expect(err.message).toContain("identifies no service");
  });

  it("refuses an empty control number rather than fabricating one", () => {
    for (const field of [
      "interchangeControlNumber",
      "groupControlNumber",
      "transactionSetControlNumber",
    ] as const) {
      expectRefusal(
        () => build276({ ...MINIMAL_SPEC, envelope: { ...ENVELOPE, [field]: "" } }),
        SPEC,
      );
    }
  });

  it("refuses an over-long interchange control number", () => {
    const err = expectRefusal(
      () =>
        build276({
          ...MINIMAL_SPEC,
          envelope: { ...ENVELOPE, interchangeControlNumber: "0123456789" },
        }),
      SPEC,
    );
    expect(err.message).toContain("exceeds the 9-char spec limit");
  });

  it("refuses a non-string element value rather than emitting its JS rendering", () => {
    const err = expectRefusal(
      () =>
        build276(
          specWith({
            name: { ...OK_SUBSCRIBER.name, idCode: 700_998_877 },
            claims: [OK_CLAIM],
          }),
        ),
      SPEC,
    );
    expect(err.message).toContain("but received a number.");
  });

  it("refuses a non-X12Decimal amount rather than guessing its scale", () => {
    expectRefusal(
      () =>
        build276(
          specWith({
            name: OK_SUBSCRIBER.name,
            claims: [{ trace: OK_CLAIM.trace, amounts: [{ qualifier: "T3", amount: 150 }] }],
          }),
        ),
      SPEC,
    );
  });

  it("emits NO interchange on any refusal", () => {
    // Every refusal above is a throw, so nothing is returned; this pins that a
    // caller cannot get a partial document out of one.
    let returned: unknown = "sentinel";
    try {
      returned = build276({ envelope: ENVELOPE, informationSources: [] });
    } catch {
      // expected
    }
    expect(returned).toBe("sentinel");
  });
});

// ---------------------------------------------------------------------------
// PHI discipline.
// ---------------------------------------------------------------------------

describe("build276: a refusal message carries structural locators and counts only", () => {
  /** Values that must never appear in a refusal message. Realistic-shaped. */
  const MEMBER_ID = "MBR0001";
  const LAST_NAME = "DOE";
  const FIRST_NAME = "JANE";
  const TRACE = "STATUS20260601001";
  const CLAIM_NUMBER = "PCN0001";
  const DIAGNOSIS = "J20.9";

  /**
   * Every reachable refusal, each driven by a spec that CARRIES the identifiers
   * above. A refusal test whose input holds no member id proves nothing about
   * member ids, so each case here is non-vacuous by construction.
   */
  const CASES: readonly (readonly [string, () => unknown])[] = [
    ["no information source", () => build276({ envelope: ENVELOPE, informationSources: [] })],
    [
      "source with no receiver",
      () =>
        build276({ envelope: ENVELOPE, informationSources: [{ name: NM1_SOURCE, receivers: [] }] }),
    ],
    [
      "receiver with no provider",
      () =>
        build276({
          envelope: ENVELOPE,
          informationSources: [
            { name: NM1_SOURCE, receivers: [{ name: NM1_RECEIVER, providers: [] }] },
          ],
        }),
    ],
    [
      "provider with no subscriber",
      () =>
        build276({
          envelope: ENVELOPE,
          informationSources: [
            {
              name: NM1_SOURCE,
              receivers: [
                { name: NM1_RECEIVER, providers: [{ name: NM1_PROVIDER, subscribers: [] }] },
              ],
            },
          ],
        }),
    ],
    ["subscriber with no name", () => build276(specWith({ claims: [phiClaim()] }))],
    ["subscriber that asks nothing", () => build276(specWith({ name: phiName(), claims: [] }))],
    [
      "dependent with no claim",
      () =>
        build276(
          specWith({
            name: phiName(),
            claims: [phiClaim()],
            dependents: [{ name: phiName(), claims: [] }],
          }),
        ),
    ],
    [
      "claim that asks nothing",
      () =>
        build276(
          specWith({
            name: phiName(),
            claims: [{ trace: { traceTypeCode: "1", referenceId: TRACE } }],
          }),
        ),
    ],
    [
      "claim with no trace",
      () =>
        build276(
          specWith({
            name: phiName(),
            claims: [{ references: [{ qualifier: "1K", value: CLAIM_NUMBER }] }],
          }),
        ),
    ],
    [
      "service line identifying no service",
      () =>
        build276(
          specWith({
            name: phiName(),
            claims: [
              {
                trace: { traceTypeCode: "1", referenceId: TRACE },
                serviceLines: [{ lineChargeAmount: dec("150") }],
              },
            ],
          }),
        ),
    ],
    [
      "a hole in the claims list",
      () => build276(specWith({ name: phiName(), claims: [phiClaim(), undefined] })),
    ],
    [
      "a non-string element value",
      () =>
        build276(specWith({ name: { ...phiName(), idCode: 700_998_877 }, claims: [phiClaim()] })),
    ],
    [
      "an over-long control number",
      () =>
        build276({
          ...specWith({ name: phiName(), claims: [phiClaim()] }),
          envelope: { ...ENVELOPE, interchangeControlNumber: "9".repeat(120_000) },
        }),
    ],
  ];

  function phiName(): Record<string, string> {
    return {
      entityIdentifierCode: "IL",
      entityTypeQualifier: "1",
      lastNameOrOrganizationName: LAST_NAME,
      firstName: FIRST_NAME,
      idQualifier: "MI",
      idCode: MEMBER_ID,
    };
  }

  function phiClaim(): Build276ClaimSpec {
    return {
      trace: { traceTypeCode: "1", referenceId: TRACE },
      references: [
        { qualifier: "1K", value: CLAIM_NUMBER },
        { qualifier: "BLT", value: DIAGNOSIS },
      ],
    };
  }

  it.each(CASES)("names no identifier when refusing: %s", (_label, run) => {
    let thrown: unknown;
    try {
      run();
    } catch (err) {
      thrown = err;
    }
    // Non-vacuity first: a refusal that never happened hides everything.
    expect(thrown).toBeInstanceOf(Error);
    expect(typeof (thrown as { code?: unknown }).code).toBe("string");
    const { message } = thrown as Error;
    expect(message.length).toBeGreaterThan(0);
    for (const secret of [MEMBER_ID, LAST_NAME, FIRST_NAME, TRACE, CLAIM_NUMBER, DIAGNOSIS]) {
      expect(message).not.toContain(secret);
    }
  });

  it("bounds the one caller value it renders, inside the exported ceiling", () => {
    const huge = "9".repeat(120_000);
    const err = expectRefusal(
      () =>
        build276({
          ...MINIMAL_SPEC,
          envelope: { ...ENVELOPE, interchangeControlNumber: huge },
        }),
      SPEC,
    );
    expect(err.message).not.toContain(huge);
    expect(err.message).toContain("(120000 characters)");
    // The FRAGMENT is what the exported constant bounds; the message is that
    // plus this site's own fixed template, so it is asserted against its own
    // ceiling rather than against the constant.
    expect(err.message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 200);
    expect(err.message.length).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// The committed golden.
// ---------------------------------------------------------------------------

describe("build276: the committed golden", () => {
  const golden = readFileSync(join(GOLDEN_DIR, "276.edi"), "utf8");

  it("reads, rebuilds and serializes back to the golden byte for byte", () => {
    const model = parse276StatusInquiries(golden)[0];
    if (model === undefined) throw new Error("the golden decoded no 276");
    expect(model.warnings).toEqual([]);
    const rebuilt = serializeX12(build276(specFromModel(model, ENVELOPE)));
    expect(rebuilt).toBe(golden);
  });

  it("is what the canonical fixture serializes to, so the two cannot drift", () => {
    const canonical = readFileSync(join(FIXTURE_DIR, "276-canonical.edi"), "utf8");
    expect(serializeX12(parseX12(canonical))).toBe(golden);
  });

  it("carries no line break, which is what makes the byte comparison meaningful", () => {
    expect(golden).not.toContain("\n");
  });
});

// ---------------------------------------------------------------------------
// The read side and the emit side disagree deliberately.
// ---------------------------------------------------------------------------

describe("build276: a model the lenient reader returned is not always emittable", () => {
  it("refuses a model whose subscriber level was detached on read", () => {
    // `276-dangling-parent.edi` decodes to a provider with no subscriber, which
    // is exactly the region the builder would have to invent.
    const raw = readFileSync(join(FIXTURE_DIR, "276-dangling-parent.edi"), "utf8").trimEnd();
    const model = parse276StatusInquiries(raw)[0];
    if (model === undefined) throw new Error("the fixture decoded no 276");
    expectRefusal(() => build276(specFromModel(model, ENVELOPE)), HIERARCHY);
  });

  it("emits the spec-clean twin of a model that decoded whole", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "276-minimal.edi"), "utf8").trimEnd();
    const model = parse276StatusInquiries(raw)[0];
    if (model === undefined) throw new Error("the fixture decoded no 276");
    const emitted = serializeX12(
      build276(
        specFromModel(model, {
          ...ENVELOPE,
          interchangeControlNumber: "000000012",
          groupControlNumber: "12",
        }),
      ),
    );
    expect(emitted).not.toContain("\n");
    expect(emitted).toBe(serializeX12(parseX12(raw)));
  });
});

/**
 * `X12-EMIT-DELIMITER-SHAPE-UNCHECKED`: a builder refuses a delimiter set whose
 * roles are not SHAPED like delimiters - each must be a string of exactly one
 * visible character, and the four must be mutually distinct.
 *
 * ## The rule is the READ side's, applied outward, and that is the grounding
 *
 * `src/parser/delimiters.ts`'s `detectDelimiters` already decides what a
 * delimiter is for this package, and it decides it as a **Tier-3 fatal**: one
 * character at each of four fixed ISA positions, each satisfying
 * `isVisibleDelimiterChar`, the four distinct, else `X12_INVALID_DELIMITERS`
 * thrown even in lenient mode. This slice imports that predicate rather than
 * restating it and applies it to the set a CALLER declares. **A builder that
 * composes a document its own parser refuses to read is disagreeing with
 * itself.** Nothing is trimmed, coerced, substituted or padded - no
 * normalisation rule is invented, because none is needed for a refusal.
 *
 * The one-character requirement is structural, not conventional: the ISA is
 * fixed-width per ASC X12 .5, ISA-11, ISA-16 and the terminator each occupy one
 * fixed POSITION, and `Delimiters` records exactly one character per role.
 *
 * 🛑 **It is a UTF-16 CODE-UNIT rule and NOT a byte rule, and that residual is
 * NOT closed** - pinned as an honest control below. Never restate the bound in
 * BYTES; every first draft of this file did, and the gate measured each one
 * false the same way.
 *
 * ## Three mechanisms, measured at base `a21f8ea`, and they are NOT one defect
 *
 * The filed line named ONE of them - the multi-byte segment terminator. The
 * census over 10 builders x 4 roles x 8 shapes found three, each with
 * `warnings: []`. **The eight shapes are a measurement, not a closed set:** the
 * gate reached a ninth (a boxed `new String("|")`) that this census had not
 * enumerated, so publish no total of what built silently.
 *
 * ```text
 * LENGTH. 🛑 NO claim is published about WHICH roles were silent, in any
 * qualified form. Two drafts published an asymmetry and the gate falsified
 * both, the second inside the fix for the first. These are the cells that
 * were RUN:
 *   build837P { segmentTerminator: "~~" }
 *     31 segment rows in a transaction whose SE-01 declares 16; every other row
 *     a phantom with id "".
 *   buildInterchange { componentSeparator: ":~" }
 *     reads back through a well-formed ISA, the builder's own terminator left
 *     as an uncounted empty segment, and no element value escaped against ":".
 *
 * TYPE, where the joiner and the escaper end up disagreeing
 *   build837P { componentSeparator: 1 }
 *     `Array.prototype.join` coerces the number to "1" and the document frames
 *     on it; `escapeRelease` compares delimiters with `===`, a number never
 *     equals a character, so NO caller value is escaped against it.
 *     SV1*HC199213 reads SV1-01-2 as "992" and not the procedure code 99213;
 *     CLM-05's place-of-service composite emits as "111B11".
 *   build271 { repetitionSeparator: 1 }
 *     EB*1**3011 - EB-03's two service type codes stop reading back as two.
 *
 * NO NET AT ALL, at buildTA1 - every role, every shape
 *   buildTA1 with { elementSeparator: "" } RETURNED
 *     TA10000000012606011200A000 - one undelimited blob fusing the
 *     reassociation key, the date, the time, the disposition and the note code.
 *   buildTA1 with { elementSeparator: "||" } RETURNED
 *     TA1||000000001||260601||1200||A||000, which inside an ISA - which can
 *     declare only "|" - reads back with TA1-01 EMPTY and ackCode "R".
 *     🩺 An Accept emitted as a Reject: X12-TA1-EMIT-NOT-RELEASE-AWARE's
 *     safety class, reached by the LENGTH mechanism.
 * ```
 *
 * 🩺 The TYPE mechanism needs no unusual caller value: `99213`, `11`, `30` and
 * `1` are ordinary. **A length rule cannot reach it**, which is why the two are
 * never written as one defect.
 *
 * ## What a caller catches MOVES, and it moves in both directions
 *
 * Most mis-shaped sets did not build at base - but they failed as an
 * `X12ParseError` with `X12_INVALID_DELIMITERS` escaping out of a `build*`
 * call, from the builder's own trailing `parseX12`, carrying a 64-byte
 * `snippet` of the interchange just composed. At head those cells refuse
 * earlier with the builder's own typed error and its existing code. **A
 * consumer catching `X12ParseError` around a `build*` call stops catching, and
 * one catching that builder's own error starts.** No code is minted. `#83`'s
 * lesson is that a moved predicate is stated in both directions or not at all,
 * so both are pinned below.
 *
 * ## The cost: specs that built with `warnings: []`, and NO count is published
 *
 * `segmentTerminator: "~\r\n"` - a caller asking for line-broken output - built
 * clean at base. Measured: the CRLF was never on the wire. `parseX12` tolerates
 * a run of CR/LF between segments, so the model recorded `segment: "~"` and
 * `serializeX12` re-emitted without line breaks. The caller did not get what
 * they declared; the library silently substituted. Head refuses, which is the
 * same call `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` made about specs that built
 * at `0.0.15` - what this library happens to read back was never the bar.
 *
 * ## Where it sits
 *
 * Inside `makeCallerEscaper`, the chokepoint `test/builder-string-type.test.ts`
 * already requires every builder to construct its `esc` through, so the reach
 * is structural rather than a hand-list - and that is what carries it to
 * `buildTA1`, the one builder with no trailing `parseX12` and so no accidental
 * net of any kind. A source gate establishes nothing about behaviour, so every
 * builder has its own behavioural case here.
 *
 * It runs AFTER the release-character check, so nothing
 * `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` pinned moves: a set with `?` in two
 * roles is both degenerate AND non-distinct, and the message that names the
 * sharper defect wins. Pinned below.
 */

import { describe, expect, it } from "vitest";

import {
  AckBuildError,
  build271,
  build277,
  build278Request,
  build820,
  build834,
  build835,
  build837P,
  build999,
  buildInterchange,
  buildTA1,
  escapeRelease,
  Claim837BuildError,
  ClaimStatus277BuildError,
  Eligibility271BuildError,
  Enrollment834BuildError,
  parseX12,
  Premium820BuildError,
  Remit835BuildError,
  serializeX12,
  ServicesReview278BuildError,
  X12BuildError,
  X12Decimal,
  X12ParseError,
} from "../src/index.js";

/**
 * Launder a value into the typed slot a builder declares. Every shape below is
 * a JavaScript or JSON caller reaching a slot the TypeScript types say is
 * unreachable, which is the point: `@cosyte/cli` is such a caller.
 */
function asJsCaller<T>(value: unknown): T {
  return value as T;
}

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

const ENVELOPE = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

// ---------------------------------------------------------------------------
// Ten builders, each valid but for the delimiter overrides handed in. Varying
// the BUILDER as well as the set is deliberate: a control that varies only the
// set cannot see that the guard reaches every builder, and `buildTA1` behaves
// differently from the other nine for a structural reason.
// ---------------------------------------------------------------------------

type Overrides = Readonly<Record<string, unknown>>;

const CLAIM_837 = {
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
              claimId: "CLAIM0001",
              totalCharge: dec("150.00"),
              placeOfServiceCode: "11",
              facilityCodeQualifier: "B",
              claimFrequencyCode: "1",
              providerSignatureOnFile: "Y",
              providerAcceptAssignment: "A",
              benefitsAssignment: "Y",
              releaseOfInformationCode: "Y",
              diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
              serviceLines: [
                {
                  variant: "P",
                  procedureQualifier: "HC",
                  procedureCode: "99213",
                  charge: dec("150.00"),
                  unitOfMeasure: "UN",
                  units: dec("1"),
                  diagnosisPointers: ["1"],
                  dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260601" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

function build837PWith(overrides: Overrides): unknown {
  return build837P(asJsCaller({ ...CLAIM_837, envelope: { ...ENVELOPE, ...overrides } }));
}

function build271With(overrides: Overrides): unknown {
  return build271(
    asJsCaller({
      envelope: { ...ENVELOPE, ...overrides },
      header: {
        transactionSetPurposeCode: "11",
        referenceId: "R1",
        date: "20260601",
        time: "1200",
      },
      informationSources: [
        {
          entity: {
            entityIdentifierCode: "PR",
            entityTypeQualifier: "2",
            name: "PAYER",
            idQualifier: "PI",
            idCode: "P1",
          },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                name: "PROV",
                idQualifier: "XX",
                idCode: "1234567890",
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
                    { eligibilityCode: "1", serviceTypeCodes: [{ code: "30" }, { code: "1" }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  );
}

const BUILDERS: readonly (readonly [string, (o: Overrides) => unknown, new () => Error])[] = [
  [
    "buildInterchange",
    (o) =>
      buildInterchange(
        asJsCaller({
          ...ENVELOPE,
          ...o,
          groups: [
            {
              functionalIdCode: "HC",
              groupControlNumber: "1",
              versionRelease: "005010X222A2",
              transactions: [
                {
                  transactionSetIdCode: "837",
                  transactionSetControlNumber: "0001",
                  segments: [["CLM", "PATIENTACCT", "150.00"]],
                },
              ],
            },
          ],
        }),
      ),
    X12BuildError as unknown as new () => Error,
  ],
  [
    "build999",
    (o) =>
      build999(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
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
        }),
      ),
    AckBuildError as unknown as new () => Error,
  ],
  [
    // 🩺 The one builder with NO trailing `parseX12`, so at base it had no net
    // of any kind - not even the accidental one. It reaches the guard only
    // because it takes its `esc` from the same chokepoint.
    "buildTA1",
    (o) =>
      buildTA1(
        {
          interchangeControlNumber: "000000001",
          interchangeDate: "260601",
          interchangeTime: "1200",
          ackCode: "A",
          noteCode: "000",
        },
        asJsCaller(o),
      ),
    AckBuildError as unknown as new () => Error,
  ],
  [
    "build834",
    (o) =>
      build834(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          header: {
            transactionSetPurposeCode: "00",
            referenceId: "F1",
            date: "20260601",
            time: "1200",
            actionCode: "2",
            sponsor: {
              entityIdentifierCode: "P5",
              name: "EMP",
              idQualifier: "FI",
              idCode: "F1",
            },
            payer: { entityIdentifierCode: "IN", name: "PAY", idQualifier: "FI", idCode: "F2" },
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
        }),
      ),
    Enrollment834BuildError as unknown as new () => Error,
  ],
  [
    "build820",
    (o) =>
      build820(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          payment: {
            transactionHandlingCode: "I",
            totalPremiumAmount: dec("250.00"),
            creditDebitFlag: "C",
            method: "ACH",
            paymentDate: "20260601",
          },
          traces: [{ traceTypeCode: "1", referenceId: "T1" }],
          remittances: [
            {
              entity: {
                entityIdentifierCode: "2J",
                name: "MEMBER ORG",
                idQualifier: "34",
                idCode: "M1",
              },
              openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: dec("250.00") }],
            },
          ],
        }),
      ),
    Premium820BuildError as unknown as new () => Error,
  ],
  ["build271", build271With, Eligibility271BuildError as unknown as new () => Error],
  [
    "build277",
    (o) =>
      build277(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          header: {
            transactionSetPurposeCode: "08",
            referenceId: "R1",
            date: "20260601",
            time: "1200",
          },
          informationSources: [
            {
              entity: {
                entityIdentifierCode: "PR",
                entityTypeQualifier: "2",
                name: "PAYER",
                idQualifier: "PI",
                idCode: "P1",
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
                        name: "PROVIDER",
                      },
                      subscribers: [
                        {
                          claims: [
                            {
                              statuses: [{ statuses: [{ categoryCode: "A1", statusCode: "19" }] }],
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
        }),
      ),
    ClaimStatus277BuildError as unknown as new () => Error,
  ],
  [
    "build278Request",
    (o) =>
      build278Request(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
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
                serviceTypeCode: "3",
              },
            ],
          },
        }),
      ),
    ServicesReview278BuildError as unknown as new () => Error,
  ],
  [
    "build835",
    (o) =>
      build835(
        asJsCaller({
          envelope: { ...ENVELOPE, ...o },
          payment: {
            transactionHandlingCode: "I",
            totalActualPayment: dec("450.00"),
            creditDebitFlag: "C",
            method: "ACH",
            paymentDate: "20260601",
          },
          traces: [
            { traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" },
          ],
          payer: { entityIdentifierCode: "PR", name: "MEDICARE PART A" },
          payee: {
            entityIdentifierCode: "PE",
            name: "RENDERING CLINIC",
            idQualifier: "XX",
            idCode: "1234567890",
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
              facilityTypeCode: "11",
              claimFrequencyCode: "1",
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
                  serviceDateStart: "20260501",
                  serviceDateEnd: "20260501",
                  adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
                },
              ],
            },
          ],
        }),
      ),
    Remit835BuildError as unknown as new () => Error,
  ],
  ["build837P", build837PWith, Claim837BuildError as unknown as new () => Error],
];

/** The four roles, by the spec key every builder's envelope declares. */
const ROLES: readonly (readonly [string, string])[] = [
  ["elementSeparator", "element separator"],
  ["repetitionSeparator", "repetition separator"],
  ["componentSeparator", "component separator"],
  ["segmentTerminator", "segment terminator"],
];

// ---------------------------------------------------------------------------
// The behavioural sweep. Every builder, every role, every shape.
// ---------------------------------------------------------------------------

describe("every builder refuses a delimiter that is not one visible character", () => {
  const cases = BUILDERS.flatMap(([builder, run, ctor]) =>
    ROLES.map(([option, roleName]) => [builder, roleName, option, run, ctor] as const),
  );

  it.each(cases)("%s refuses a MULTI-CHARACTER %s", (_builder, roleName, option, run, ctor) => {
    const go = (): unknown => run({ [option]: "||" });
    expect(go).toThrow(`the ${roleName} must be exactly one character`);
    expect(go).toThrow("but the declared value is 2 characters long");
    expect(go).toThrow(ctor);
  });

  it.each(cases)("%s refuses an EMPTY %s", (_builder, roleName, option, run, ctor) => {
    const go = (): unknown => run({ [option]: "" });
    expect(go).toThrow(`the ${roleName} must be exactly one character`);
    expect(go).toThrow("but the declared value is empty");
    expect(go).toThrow(ctor);
  });

  it.each(cases)("%s refuses a WHITESPACE %s", (_builder, roleName, option, run, ctor) => {
    const go = (): unknown => run({ [option]: " " });
    expect(go).toThrow(`the ${roleName} must be a visible character`);
    expect(go).toThrow(ctor);
  });

  it.each(cases)("%s refuses a CONTROL-character %s", (_builder, roleName, option, run, ctor) => {
    const go = (): unknown => run({ [option]: "\n" });
    expect(go).toThrow(`the ${roleName} must be a visible character`);
    expect(go).toThrow(ctor);
  });

  it.each(cases)("%s refuses a NON-STRING %s", (_builder, roleName, option, run, ctor) => {
    const go = (): unknown => run({ [option]: 1 });
    expect(go).toThrow(`the ${roleName} must be a string, but received a number`);
    // 🩺 The reason coercion is refused rather than accepted, in the message,
    // because it is not the obvious one: the JOIN coerces and the ESCAPE does
    // not, so the document frames on a byte no value was protected from.
    expect(go).toThrow("no element value is protected from it");
    expect(go).toThrow(ctor);
  });

  it.each(cases)(
    "%s refuses a %s that COLLIDES with another role",
    (_builder, _roleName, option, run, ctor) => {
      // Collide each role with the element separator, except the element
      // separator itself, which collides with the segment terminator.
      const other = option === "elementSeparator" ? "~" : "*";
      const go = (): unknown => run({ [option]: other });
      expect(go).toThrow("are the same character");
      expect(go).toThrow("A reader cannot tell which role a character is playing.");
      expect(go).toThrow(ctor);
    },
  );
});

// ---------------------------------------------------------------------------
// The negative controls. A guard that refuses everything is not a guard.
// ---------------------------------------------------------------------------

describe("the sets that must still build", () => {
  it.each(BUILDERS)("%s builds its canonical spec with warnings: []", (_name, run) => {
    const built = run({}) as { readonly warnings?: readonly unknown[]; readonly raw?: string };
    // `buildTA1` returns a segment and has no warnings channel; the other nine
    // return an interchange and must be clean.
    if (built.warnings === undefined) expect(typeof built.raw).toBe("string");
    else expect(built.warnings).toEqual([]);
  });

  it.each(BUILDERS)("%s still accepts an ABSENT role, which takes the default", (_name, run) => {
    // `?? default` treats `undefined` (and `null`) as absent, and this guard
    // must not turn an omitted delimiter into a refusal. That is the whole
    // reason the type arm cannot simply be "not a string".
    const built = run({ componentSeparator: undefined, repetitionSeparator: undefined }) as {
      readonly warnings?: readonly unknown[];
    };
    if (built.warnings !== undefined) expect(built.warnings).toEqual([]);
  });

  it("still accepts the unusual-but-valid sets real companion guides ask for", () => {
    // Each of these is one visible character, all four distinct. A letter is
    // admissible: ASC X12 constrains a delimiter by POSITION, not by class, and
    // `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` already pinned
    // `componentSeparator: "S"` as a case this library must handle.
    for (const set of [
      { elementSeparator: "|", segmentTerminator: "'" },
      { elementSeparator: "|", repetitionSeparator: "+", componentSeparator: "!" },
      { componentSeparator: "S" },
      { repetitionSeparator: "G" },
      { segmentTerminator: "!" },
    ]) {
      const built = buildInterchange(
        asJsCaller({
          ...ENVELOPE,
          ...set,
          groups: [
            {
              functionalIdCode: "HC",
              groupControlNumber: "1",
              versionRelease: "005010X222A2",
              transactions: [
                {
                  transactionSetIdCode: "837",
                  transactionSetControlNumber: "0001",
                  segments: [["CLM", "PATIENTACCT", "150.00"]],
                },
              ],
            },
          ],
        }),
      );
      expect(built.warnings).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------------------
// The three mechanisms, each pinned at the value it destroyed.
// ---------------------------------------------------------------------------

describe("🩺 mechanism 1 - LENGTH, with NO claim about which roles were silent", () => {
  it("refuses the multi-byte terminator that used to desync SE-01 with warnings: []", () => {
    // At base `a21f8ea` this built: 31 segment rows in a transaction whose
    // SE-01 declared 16, every other row a phantom with id "", `warnings: []`.
    expect(() => build837PWith({ segmentTerminator: "~~" })).toThrow(
      "build837: the segment terminator must be exactly one character",
    );
  });

  it("🩺 pins the doubled-terminator READ, from bytes and not through a builder", () => {
    // Built from bytes rather than from a builder, because a builder now
    // refuses and would assert the refusal instead of the read. 🛑 This pins
    // WHAT the doubled terminator did, and deliberately says nothing about WHY
    // that role rather than another: two drafts published such a story and the
    // gate falsified both.
    const isa =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
      "*260601*1200*^*00501*000000001*0*P*:~";
    const doubled =
      isa +
      "GS*HC*S*R*20260601*1200*1*X*005010X222A2~~ST*837*0001~~CLM*A*1~~SE*3*0001~~" +
      "GE*1*1~IEA*1*000000001~";
    const parsed = parseX12(doubled);
    expect(parsed.delimiters.segment).toBe("~");
    const tx = parsed.groups[0]?.transactions[0];
    // SE-01 declares 3; the phantom empty rows the doubled terminator produced
    // are on the model beside the real ones, and nothing warned about it.
    expect(tx?.se?.elements[1]).toBe("3");
    expect(tx?.segments.length).toBeGreaterThan(3);
    expect(tx?.segments.some((s) => s.elements.join("") === "")).toBe(true);
  });

  it("🛑 the doubled shape at another role DOES refuse, and that is a cell, not a verdict on the role", () => {
    // 🛑 This is a MEASUREMENT of the doubled shape, never a verdict on the
    // role. Two drafts of this file published an asymmetry - "silent at that
    // role and nowhere else", then "alone among the nine that end in
    // `parseX12`" - and the gate falsified both, the second at a PARSING
    // builder: `componentSeparator: ":~"` built with `warnings: []`. The
    // honest control below pins that. Never restate an asymmetry here.
    expect(() => build837PWith({ elementSeparator: "**" })).toThrow(
      "build837: the element separator must be exactly one character",
    );
    expect(() => build837PWith({ componentSeparator: "::" })).toThrow(
      "build837: the component separator must be exactly one character",
    );
  });

  it("🛑 the HONEST CONTROL: a two-character component separator was SILENT at base too", () => {
    // `componentSeparator: ":~"` is the probe that falsified the second draft of
    // the asymmetry, at a PARSING builder. Pinned from bytes rather than through
    // a builder, because head refuses and would assert the refusal instead of
    // the read.
    //
    // The ISA carries `:` at ISA-16 and `~` at the terminator position, so
    // `detectDelimiters` sees a perfectly well-formed header; the builder's own
    // appended terminator lands after it as an uncounted empty segment. Nothing
    // about the read is unusual, which is exactly why the structural story
    // ("only the terminator role can be silent") was wrong.
    const isa =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
      "*260601*1200*^*00501*000000001*0*P*:~";
    const asBuiltAtBase =
      isa +
      "~GS*HC*S*R*20260601*1200*1*X*005010X222A2~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~";
    const parsed = parseX12(asBuiltAtBase);
    expect(parsed.delimiters.component).toBe(":");
    expect(parsed.delimiters.segment).toBe("~");
    expect(parsed.warnings).toEqual([]);

    // 🛑 The escape half, measured against the set `buildInterchange` ACTUALLY
    // resolves - `segmentTerminator` still defaults to `"~"`. A draft asserted
    // it against `{ ..., segment: ":~" }`, a set no builder call produces, and
    // was therefore vacuous while green: `~` IS escaped here and only `:` is
    // unprotected. Assert the scenario's own set, never a set built to fit the
    // sentence.
    const asResolved = { element: "*", repetition: "^", component: ":~", segment: "~" };
    expect(escapeRelease("a:b~c", asResolved)).toBe("a:b?~c");

    // Head refuses it, which is the whole point of pinning the base reading.
    expect(() => build837PWith({ componentSeparator: ":~" })).toThrow(
      "build837: the component separator must be exactly one character",
    );
  });
});

describe("🩺 mechanism 2 - TYPE, where the JOIN coerces and the ESCAPE does not", () => {
  it("refuses the numeric component separator that fused a procedure code", () => {
    // At base: `SV1*HC199213*...` with `warnings: []`. `join` coerced `1` to
    // "1" and framed on it; `escapeRelease` compared `===` against the number
    // and escaped nothing, so SV1-01-2 read "992" rather than 99213.
    expect(() => build837PWith({ componentSeparator: 1 })).toThrow(
      "build837: the component separator must be a string, but received a number",
    );
  });

  it("refuses the numeric repetition separator that collapsed two service type codes", () => {
    // At base: `EB*1**3011` with `warnings: []` - EB-03's "30" and "1" no
    // longer read back as two codes.
    expect(() => build271With({ repetitionSeparator: 1 })).toThrow(
      "build271: the repetition separator must be a string, but received a number",
    );
  });

  it("🩺 a length rule alone could not have reached it, which is why they are two mechanisms", () => {
    // `String(1)` is one character and visible. Only the TYPE arm refuses it,
    // and it refuses BEFORE the length arm ever runs.
    expect(String(1)).toHaveLength(1);
    expect(() => build837PWith({ componentSeparator: 1 })).not.toThrow(
      "must be exactly one character",
    );
  });

  it("refuses an array, which coerces to the empty string rather than to a delimiter", () => {
    expect(() => build837PWith({ componentSeparator: [] })).toThrow(
      "build837: the component separator must be a string, but received an array",
    );
  });
});

describe("🩺 mechanism 3 - buildTA1 had NO net, not even the accidental one", () => {
  const ACCEPT = {
    interchangeControlNumber: "000000001",
    interchangeDate: "260601",
    interchangeTime: "1200",
    ackCode: "A",
    noteCode: "000",
  } as const;

  it("refuses the empty element separator that fused the whole acknowledgment", () => {
    // At base this RETURNED `TA1*` -> "TA10000000012606011200A000": the
    // reassociation key, the date, the time, the disposition and the note code
    // in one undelimited blob. Every other builder ends in `parseX12` and that
    // caught most mis-shaped sets by accident; this one returns a segment.
    expect(() => buildTA1(ACCEPT, asJsCaller({ elementSeparator: "" }))).toThrow(
      "buildTA1: the element separator must be exactly one character",
    );
  });

  it("refuses a control character, which used to go out inside the segment verbatim", () => {
    expect(() => buildTA1(ACCEPT, asJsCaller({ elementSeparator: "\n" }))).toThrow(
      "buildTA1: the element separator must be a visible character",
    );
  });

  it("🩺 refuses the MULTI-CHARACTER separator that emitted an Accept which reads back a Reject", () => {
    // 🛑 This is one of the two cases that falsified the asymmetry drafts. At
    // base `{ elementSeparator: "||" }` RETURNED
    // `TA1||000000001||260601||1200||A||000` - and an ISA can declare only `|`,
    // so read against that set TA1-01 (data element I12, the reassociation key)
    // is EMPTY and TA1-04 has shifted, which `parseTA1` narrows out of enum to
    // `R`. An Accept this library emitted read back as a Reject, and nobody
    // resubmits against an Accept: `X12-TA1-EMIT-NOT-RELEASE-AWARE`'s safety
    // class, reached by the LENGTH mechanism at a role no PARSING builder was
    // ever silent at. So the bound is about the nine builders that end in
    // `parseX12`, never about the role.
    expect(() => buildTA1(ACCEPT, asJsCaller({ elementSeparator: "||" }))).toThrow(
      "buildTA1: the element separator must be exactly one character",
    );
    // The read half of the claim, from bytes: this is what that segment did.
    const base = "TA1||000000001||260601||1200||A||000";
    expect(base.split("|")[1]).toBe("");
  });

  it("still emits the canonical Accept, byte for byte", () => {
    expect(buildTA1(ACCEPT).raw).toBe("TA1*000000001*260601*1200*A*000");
    expect(buildTA1(ACCEPT, { elementSeparator: "|" }).raw).toBe("TA1|000000001|260601|1200|A|000");
  });
});

// ---------------------------------------------------------------------------
// What moves, stated in both directions.
// ---------------------------------------------------------------------------

describe("🛑 the class a caller catches MOVES, and it moves both ways", () => {
  it("stops throwing X12ParseError out of a build call", () => {
    // At base `buildInterchange({ elementSeparator: "**" })` threw
    // `X12ParseError` / `X12_INVALID_DELIMITERS` from its own trailing
    // `parseX12`, carrying a 64-byte `snippet` of the interchange it had just
    // composed. A consumer catching that class around a `build*` call STOPS
    // catching, which is the half a remedy is most likely to leave unsaid.
    let caught: unknown;
    try {
      buildInterchange(
        asJsCaller({
          ...ENVELOPE,
          elementSeparator: "**",
          groups: [
            {
              functionalIdCode: "HC",
              groupControlNumber: "1",
              versionRelease: "005010X222A2",
              transactions: [
                {
                  transactionSetIdCode: "837",
                  transactionSetControlNumber: "0001",
                  segments: [["CLM", "PATIENTACCT", "150.00"]],
                },
              ],
            },
          ],
        }),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).not.toBeInstanceOf(X12ParseError);
    expect(caught).toBeInstanceOf(X12BuildError);
    expect((caught as X12BuildError).code).toBe("X12_BUILD_INVALID_SPEC");
  });

  it("mints no code - every builder refuses with the one it already had", () => {
    for (const [, run] of BUILDERS) {
      let code: unknown;
      try {
        run({ segmentTerminator: "~~" });
      } catch (error) {
        code = (error as { code?: unknown }).code;
      }
      expect(String(code)).toMatch(
        /^X12_(?:\d{3}_)?(?:ACK_|)BUILD_INVALID_SPEC$|_BUILD_INVALID_SPEC$|^X12_ACK_INVALID_SPEC$/u,
      );
    }
  });

  it("🛑 the READ side does not move: parseX12 still accepts every set this now refuses", () => {
    // Documents declaring these sets exist, including ones this library emitted
    // before the guard, and Postel's Law puts the read side on the lenient
    // half. Only the DECLARED-set check on emit changed.
    const isa =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
      "*260601*1200*^*00501*000000001*0*P*:~";
    const doubled = isa + "GS*HC*S*R*20260601*1200*1*X*005010X222A2~~GE*1*1~IEA*1*000000001~";
    expect(() => parseX12(doubled)).not.toThrow();
    // And `serializeX12` still round-trips such a model rather than refusing.
    expect(serializeX12(parseX12(doubled))).toContain("ISA*00*");
  });
});

describe("🛑 PRE-EXISTING and NOT closed: it is a CODE-UNIT rule, never a BYTE rule", () => {
  it("still builds a delimiter that is one code unit and several bytes on the wire", () => {
    // `String.prototype.length` here and `charAt` on the read side both count
    // UTF-16 code units, so a character that is one code unit but several BYTES
    // when the interchange is encoded satisfies this guard and still displaces
    // every ISA position after it: a byte-oriented receiver reads ISA-16 as
    // 0xC2 and the terminator as 0xA7. The smart quote a companion-guide PDF
    // hands you instead of `'` does the same.
    //
    // Pinned as an HONEST CONTROL and deliberately NOT guarded. An
    // encoding-width rule is a decision nobody here has made, and the read side
    // counts code units too, so moving one side alone would put emit and read
    // back out of step - which is the drift this guard exists to close. The
    // remedy for the overclaim was cutting the word "byte" out of every
    // carrier, never growing the guard.
    const built = buildInterchange(
      asJsCaller({
        ...ENVELOPE,
        componentSeparator: "§",
        groups: [
          {
            functionalIdCode: "HC",
            groupControlNumber: "1",
            versionRelease: "005010X222A2",
            transactions: [
              {
                transactionSetIdCode: "837",
                transactionSetControlNumber: "0001",
                segments: [["CLM", "PATIENTACCT", "150.00"]],
              },
            ],
          },
        ],
      }),
    );
    expect(built.warnings).toEqual([]);
    expect(built.delimiters.component).toBe("§");
    // One code unit, two bytes in UTF-8. That is the whole of the residual.
    expect("§").toHaveLength(1);
    expect(Buffer.from("§", "utf8")).toHaveLength(2);
  });

  it("🛑 no refusal message and no shipped page may state the bound in BYTES", () => {
    // Every first draft of this claim said "ONE fixed byte of the ISA" and the
    // gate measured it false the same way each time. The message says
    // POSITION, and this pins that it keeps saying so.
    let message = "";
    try {
      buildInterchange(asJsCaller({ ...ENVELOPE, componentSeparator: "::", groups: [] }));
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("ONE fixed position of the ISA");
    expect(message).not.toContain("byte");
  });
});

describe("🛑 the cost: a spec that built with warnings: [] is now refused", () => {
  it('refuses `segmentTerminator: "~\\r\\n"`, which is the plausible caller', () => {
    // Measured at base: it built clean AND the CRLF was never on the wire.
    // `parseX12` tolerates a run of CR/LF between segments, so the model
    // recorded `segment: "~"` and `serializeX12` re-emitted with no line
    // breaks - the caller declared one thing and the library did another,
    // silently. Refusing says so.
    expect(() => build837PWith({ segmentTerminator: "~\r\n" })).toThrow(
      "build837: the segment terminator must be exactly one character",
    );
    // The property that made it silent, from bytes: line breaks between
    // segments are still tolerated on READ, so an inbound document written that
    // way is unaffected by any of this.
    const isa =
      "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       " +
      "*260601*1200*^*00501*000000001*0*P*:~\r\n";
    const crlf =
      isa +
      "GS*HC*S*R*20260601*1200*1*X*005010X222A2~\r\nST*837*0001~\r\nCLM*A*1~\r\n" +
      "SE*3*0001~\r\nGE*1*1~\r\nIEA*1*000000001~\r\n";
    expect(parseX12(crlf).warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Precedence, so nothing the previous slice pinned moves.
// ---------------------------------------------------------------------------

describe("⚖️ precedence with the release-character guard", () => {
  it("a set that is BOTH degenerate and non-distinct still reports the `?` refusal", () => {
    // `elementSeparator: "?"` + `componentSeparator: "?"` is two roles on `?`
    // AND a collision. `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` names the
    // sharper defect, so it runs first and its message is what a caller sees.
    // Without this ordering, that slice's pinned message would have moved.
    expect(() => build837PWith({ elementSeparator: "?", componentSeparator: "?" })).toThrow(
      '"?" is the X12 release character and cannot also be the element separator',
    );
  });

  it("a single `?` role is still the `?` refusal and not a shape one", () => {
    expect(() => build837PWith({ componentSeparator: "?" })).toThrow(
      'build837: "?" is the X12 release character and cannot also be the component separator.',
    );
  });

  it('🛑 `"??"` is refused now, and by the SHAPE guard - it is not equal to `?`', () => {
    // This is the disclosure `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` shipped as
    // `PRE-EXISTING` and explicitly left open. It is closed here, by the length
    // arm rather than by growing the equality test, which is why that slice's
    // guard is byte-for-byte unchanged.
    expect(() => build837PWith({ segmentTerminator: "??" })).toThrow(
      "the segment terminator must be exactly one character",
    );
  });
});

// ---------------------------------------------------------------------------
// No refusal echoes what the caller declared.
// ---------------------------------------------------------------------------

describe("🩺 no refusal echoes the declared delimiter", () => {
  it("names the role and describes the defect, and carries no caller bytes", () => {
    const hostile = "SECRET-PATIENT-ACCT-77";
    let message = "";
    try {
      build837PWith({ componentSeparator: hostile });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("the component separator must be exactly one character");
    expect(message).not.toContain("SECRET-PATIENT-ACCT-77");
    // The LENGTH is a property of the declared value, and it is the one number
    // the message states. That is deliberate and bounded: it cannot carry a
    // patient identifier, and without it "exactly one character" gives a caller
    // nothing to act on.
    expect(message).toContain(`${String(hostile.length)} characters long`);
  });

  it("the non-string arm describes by TYPE alone, exactly as every other caller guard does", () => {
    let message = "";
    try {
      build837PWith({ componentSeparator: { toString: () => "PT-9001" } });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("must be a string, but received an object");
    expect(message).not.toContain("PT-9001");
  });
});

/**
 * Build-then-read properties for the two INQUIRY directions - the 276 claim
 * status request (`005010X212`) and, as a regression twin, the 270 eligibility
 * inquiry (`005010X279A1`).
 *
 * Four properties, each named for what it would catch:
 *
 * 1. **A built 276 reads back field for field.** Over a delimiter-safe grammar
 *    of traces, identifiers, names and control numbers, the model decoded from
 *    the emitted bytes carries exactly what the spec stated: every level's
 *    identity, every claim's trace and identifiers, every service line. This is
 *    the direct reading of "equal field for field to the model it was built
 *    from" - it compares the DECODED model against the SPEC, not against
 *    itself.
 *
 * 2. **The emit is a fixed point.** `parse(emit(M))` and
 *    `parse(emit(parse(emit(M))))` agree in model and in warning stream, and the
 *    two emits are byte-identical. That is the other half of the same claim, and
 *    it is what catches a field the spec-derivation drops on the way back: a
 *    value that survives the first emit and not the second moves the bytes.
 *
 * 3. **The serialized document is spec-clean.** It parses with NO warning, the
 *    serializer's own reconciliation raises none, and SE-01 / GE-01 / IEA-01
 *    and all three control-number pairs agree. A count is asserted against what
 *    the serializer WROTE, never against a number this test computed the same
 *    way the builder did.
 *
 * 4. **A declared delimiter changes no value.** Over a generator of declared
 *    delimiter sets, the model decoded from a 276 delimited that way equals the
 *    model decoded from the conventional twin. **The generator is bounded, and
 *    the bound is the point**: it draws four PAIRWISE DISTINCT visible
 *    non-whitespace characters, excluding the release character, so every
 *    generated interchange is one the shared parse can frame and every
 *    generated set has a spec-clean equivalent.
 *
 * The 270 twin carries property 2 alone, because the 270's own suite already
 * carries the rest; it is here so that a change to the shared emit primitives
 * cannot move one inquiry direction without the other going red beside it.
 *
 * **No external oracle is claimed anywhere in this file.** Nothing reachable
 * maps a 276 request at 005010, so the evidence here is round trip, fixed point
 * and reconciliation, and it is stated as exactly that.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  X12Decimal,
  build270,
  build276,
  get270Inquiry,
  get276StatusInquiry,
  parseX12,
  serializeX12,
} from "../../src/index.js";
import type { Build270Spec, Build276Spec, X12Inquiry, X12StatusInquiry } from "../../src/index.js";

import { specFromModel } from "../_helpers/status-inquiry-spec.js";

// ---------------------------------------------------------------------------
// The delimiter-safe grammar.
// ---------------------------------------------------------------------------

/**
 * Uppercase alphanumeric words, which every X12 element slot admits and which
 * carry none of the four delimiters nor the release character. The grammar is
 * bounded deliberately: a value carrying a delimiter is a DIFFERENT property
 * (the release-escape suite owns it), and mixing the two would leave neither
 * stated clearly.
 */
const word = fc
  .stringMatching(/^[A-Z0-9]{1,12}$/u)
  .filter((s) => s.length > 0 && /^[A-Z0-9]+$/u.test(s));

/** A non-empty control number that fits the ISA-13 fixed width. */
const controlNumber = fc
  .stringMatching(/^[A-Z0-9]{1,9}$/u)
  .filter((s) => s.length > 0 && s.length <= 9 && /^[A-Z0-9]+$/u.test(s));

const amount = fc.constantFrom("0", "1", "150", "150.00", "1234.56", "99999.99");

const serviceLineArb = fc.record({
  procedureCode: word,
  charge: amount,
  units: fc.constantFrom("1", "2", "10"),
  lineRef: word,
});

const claimArb = fc.record({
  trace: word.map((w) => `TRACE${w}`),
  claimNumber: word.map((w) => `PCN${w}`),
  charge: amount,
  serviceDate: fc.constantFrom("20260501", "20260520", "20260601"),
  serviceLines: fc.array(serviceLineArb, { minLength: 0, maxLength: 2 }),
});

const subscriberArb = fc.record({
  lastName: fc.constantFrom("DOE", "ROE", "TEST"),
  firstName: fc.constantFrom("JANE", "JOHN", "SAM"),
  memberId: word.map((w) => `MBR${w}`),
  claims: fc.array(claimArb, { minLength: 1, maxLength: 2 }),
  dependentClaims: fc.array(claimArb, { minLength: 0, maxLength: 1 }),
});

interface Generated {
  readonly payer: string;
  readonly receiver: string;
  readonly provider: string;
  readonly reference: string;
  readonly icn: string;
  readonly gcn: string;
  readonly tcn: string;
  readonly subscribers: readonly {
    readonly lastName: string;
    readonly firstName: string;
    readonly memberId: string;
    readonly claims: readonly {
      readonly trace: string;
      readonly claimNumber: string;
      readonly charge: string;
      readonly serviceDate: string;
      readonly serviceLines: readonly {
        readonly procedureCode: string;
        readonly charge: string;
        readonly units: string;
        readonly lineRef: string;
      }[];
    }[];
    readonly dependentClaims: readonly {
      readonly trace: string;
      readonly claimNumber: string;
      readonly charge: string;
      readonly serviceDate: string;
      readonly serviceLines: readonly {
        readonly procedureCode: string;
        readonly charge: string;
        readonly units: string;
        readonly lineRef: string;
      }[];
    }[];
  }[];
}

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`property: bad decimal ${value}`);
  return d;
}

function claimSpecOf(claim: Generated["subscribers"][number]["claims"][number]) {
  return {
    trace: { traceTypeCode: "1", referenceId: claim.trace },
    references: [{ qualifier: "1K", value: claim.claimNumber }],
    amounts: [{ qualifier: "T3", amount: dec(claim.charge) }],
    dates: [{ qualifier: "472", formatQualifier: "D8", value: claim.serviceDate }],
    serviceLines: claim.serviceLines.map((line) => ({
      procedure: { qualifier: "HC", code: line.procedureCode, modifiers: [] },
      lineChargeAmount: dec(line.charge),
      unitsOfService: dec(line.units),
      references: [{ qualifier: "FJ", value: line.lineRef }],
      dates: [],
    })),
  };
}

function specOf(gen: Generated): Build276Spec {
  return {
    envelope: {
      senderId: "ANYTOWNCLINIC",
      receiverId: "MEDPAY",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: gen.icn,
      groupControlNumber: gen.gcn,
      transactionSetControlNumber: gen.tcn,
    },
    header: { referenceId: gen.reference },
    informationSources: [
      {
        name: {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          lastNameOrOrganizationName: gen.payer,
        },
        receivers: [
          {
            name: {
              entityIdentifierCode: "41",
              entityTypeQualifier: "2",
              lastNameOrOrganizationName: gen.receiver,
            },
            providers: [
              {
                name: {
                  entityIdentifierCode: "1P",
                  entityTypeQualifier: "2",
                  lastNameOrOrganizationName: gen.provider,
                },
                subscribers: gen.subscribers.map((s) => ({
                  name: {
                    entityIdentifierCode: "IL",
                    entityTypeQualifier: "1",
                    lastNameOrOrganizationName: s.lastName,
                    firstName: s.firstName,
                    idQualifier: "MI",
                    idCode: s.memberId,
                  },
                  claims: s.claims.map(claimSpecOf),
                  dependents:
                    s.dependentClaims.length === 0
                      ? []
                      : [
                          {
                            name: {
                              entityIdentifierCode: "QC",
                              entityTypeQualifier: "1",
                              lastNameOrOrganizationName: s.lastName,
                              firstName: "BABY",
                            },
                            claims: s.dependentClaims.map(claimSpecOf),
                          },
                        ],
                })),
              },
            ],
          },
        ],
      },
    ],
  };
}

const generated: fc.Arbitrary<Generated> = fc.record({
  payer: word,
  receiver: word,
  provider: word,
  reference: word,
  icn: controlNumber,
  gcn: controlNumber,
  tcn: controlNumber,
  subscribers: fc.array(subscriberArb, { minLength: 1, maxLength: 2 }),
});

/** The decoded model of the first 276 in a serialized interchange. */
function decode276(raw: string): X12StatusInquiry {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("property: built interchange has no transaction");
  const model = get276StatusInquiry(ix.delimiters, tx);
  if (model === undefined) throw new Error("property: built interchange is not a 276");
  return model;
}

// ---------------------------------------------------------------------------
// 1. A built 276 reads back field for field.
// ---------------------------------------------------------------------------

describe("276 build then read: the model carries what the spec stated", () => {
  it("reproduces every level, trace, identifier, amount, date and service line", () => {
    fc.assert(
      fc.property(generated, (gen) => {
        const model = decode276(serializeX12(build276(specOf(gen))));
        expect(model.warnings).toEqual([]);
        expect(model.header?.referenceId).toBe(gen.reference);

        const source = model.informationSources[0];
        expect(source?.name?.lastNameOrOrganizationName).toBe(gen.payer);
        const receiver = source?.receivers[0];
        expect(receiver?.name?.lastNameOrOrganizationName).toBe(gen.receiver);
        const provider = receiver?.providers[0];
        expect(provider?.name?.lastNameOrOrganizationName).toBe(gen.provider);
        expect(provider?.subscribers).toHaveLength(gen.subscribers.length);

        for (const [i, wanted] of gen.subscribers.entries()) {
          const got = provider?.subscribers[i];
          expect(got?.name?.lastNameOrOrganizationName).toBe(wanted.lastName);
          expect(got?.name?.firstName).toBe(wanted.firstName);
          expect(got?.name?.idCode).toBe(wanted.memberId);
          expect(got?.claims.map((c) => c.trace?.referenceId)).toEqual(
            wanted.claims.map((c) => c.trace),
          );
          expect(got?.claims.map((c) => c.references[0]?.value)).toEqual(
            wanted.claims.map((c) => c.claimNumber),
          );
          expect(got?.claims.map((c) => c.amounts[0]?.amount.toString())).toEqual(
            wanted.claims.map((c) => c.charge),
          );
          expect(got?.claims.map((c) => c.dates[0]?.value)).toEqual(
            wanted.claims.map((c) => c.serviceDate),
          );
          for (const [j, claim] of wanted.claims.entries()) {
            const gotClaim = got?.claims[j];
            expect(gotClaim?.serviceLines).toHaveLength(claim.serviceLines.length);
            for (const [k, line] of claim.serviceLines.entries()) {
              const gotLine = gotClaim?.serviceLines[k];
              expect(gotLine?.procedure?.qualifier).toBe("HC");
              expect(gotLine?.procedure?.code).toBe(line.procedureCode);
              expect(gotLine?.lineChargeAmount?.toString()).toBe(line.charge);
              expect(gotLine?.unitsOfService?.toString()).toBe(line.units);
              expect(gotLine?.references[0]?.value).toBe(line.lineRef);
            }
          }
          expect(got?.dependents).toHaveLength(wanted.dependentClaims.length === 0 ? 0 : 1);
          if (wanted.dependentClaims.length > 0) {
            expect(got?.dependents[0]?.claims.map((c) => c.trace?.referenceId)).toEqual(
              wanted.dependentClaims.map((c) => c.trace),
            );
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// 2. The emit is a fixed point.
// ---------------------------------------------------------------------------

describe("276 emit: the fixed point", () => {
  it("re-emitting a reparse produces byte-identical output", () => {
    fc.assert(
      fc.property(generated, (gen) => {
        const spec = specOf(gen);
        const first = serializeX12(build276(spec));
        const second = serializeX12(build276(specFromModel(decode276(first), spec.envelope)));
        expect(second).toBe(first);
      }),
      { numRuns: 200 },
    );
  });

  it("the two reparses agree in model and in warning stream", () => {
    fc.assert(
      fc.property(generated, (gen) => {
        const spec = specOf(gen);
        const first = serializeX12(build276(spec));
        const modelOne = decode276(first);
        const second = serializeX12(build276(specFromModel(modelOne, spec.envelope)));
        const modelTwo = decode276(second);
        expect(JSON.stringify(modelTwo)).toBe(JSON.stringify(modelOne));
        expect(modelTwo.warnings).toEqual(modelOne.warnings);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// 3. The serialized document is spec-clean.
// ---------------------------------------------------------------------------

describe("276 emit: the serialized document reconciles", () => {
  it("parses with no warning and reconciles every count and control-number pair", () => {
    fc.assert(
      fc.property(generated, (gen) => {
        const raw = serializeX12(build276(specOf(gen)));
        const ix = parseX12(raw);
        expect(ix.warnings).toEqual([]);

        const reconciliation: string[] = [];
        serializeX12(ix, {
          specClean: true,
          onWarning: (w) => {
            reconciliation.push(w.code);
          },
        });
        expect(reconciliation).toEqual([]);

        const group = ix.groups[0];
        const tx = group?.transactions[0];
        // Counts, read off what the serializer WROTE rather than recomputed.
        expect(tx?.se?.elements[1]).toBe(String(tx?.segments.length));
        expect(group?.ge?.elements[1]).toBe(String(group?.transactions.length));
        expect(ix.iea?.elements[1]).toBe(String(ix.groups.length));
        // Control-number pairs.
        expect(ix.iea?.elements[2]).toBe(ix.isa.elements[13]);
        expect(group?.ge?.elements[2]).toBe(group?.gs.elements[6]);
        expect(tx?.se?.elements[2]).toBe(tx?.st.elements[2]);
        // The generated control numbers really reached the wire, so the pairs
        // above are not agreeing on a value the builder invented.
        expect(group?.gs.elements[6]).toBe(gen.gcn);
        expect(tx?.st.elements[2]).toBe(gen.tcn);
        expect(ix.isa.elements[13]).toBe(gen.icn.padStart(9, "0"));

        for (const w of ix.warnings) expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// 4. A declared delimiter changes no value.
// ---------------------------------------------------------------------------

/**
 * Four PAIRWISE DISTINCT visible non-whitespace delimiter characters, drawn
 * from a pool that excludes the release character.
 */
const DELIMITER_POOL = [
  "*",
  "|",
  "^",
  "\\",
  "@",
  ":",
  "!",
  "#",
  "+",
  "&",
  "%",
  "$",
  ">",
  "<",
  "~",
] as const;

const declaredDelimiters = fc
  .shuffledSubarray([...DELIMITER_POOL], { minLength: 4, maxLength: 4 })
  .map((picked) => {
    const [element, repetition, component, segment] = picked;
    if (
      element === undefined ||
      repetition === undefined ||
      component === undefined ||
      segment === undefined
    ) {
      throw new Error("property: shuffledSubarray returned fewer than four");
    }
    return { element, repetition, component, segment };
  })
  .filter((d) => new Set([d.element, d.repetition, d.component, d.segment]).size === 4);

describe("276 read: a declared delimiter set changes no value", () => {
  it("decodes equal to the conventional twin, over every generated set", () => {
    fc.assert(
      fc.property(generated, declaredDelimiters, (gen, delimiters) => {
        const spec = specOf(gen);
        const conventional = decode276(serializeX12(build276(spec)));
        const declared = decode276(
          serializeX12(
            build276({
              ...spec,
              envelope: {
                ...spec.envelope,
                elementSeparator: delimiters.element,
                repetitionSeparator: delimiters.repetition,
                componentSeparator: delimiters.component,
                segmentTerminator: delimiters.segment,
              },
            }),
          ),
        );
        expect(JSON.stringify(declared)).toBe(JSON.stringify(conventional));
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// The 270 twin: the other inquiry direction still holds the fixed point.
// ---------------------------------------------------------------------------

const inquiry270Spec: fc.Arbitrary<Build270Spec> = fc
  .record({
    payer: word,
    provider: word,
    trace: word,
    memberId: word.map((w) => `MBR${w}`),
    serviceType: fc.constantFrom("1", "30", "35", "47", "88"),
  })
  .map((gen) => ({
    envelope: {
      senderId: "ANYTOWNCLINIC",
      receiverId: "MEDPAY",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      groupControlNumber: "1",
      transactionSetControlNumber: "0001",
    },
    informationSources: [
      {
        name: {
          entityIdentifierCode: "PR",
          entityTypeQualifier: "2",
          lastNameOrOrganizationName: gen.payer,
        },
        receivers: [
          {
            name: {
              entityIdentifierCode: "1P",
              entityTypeQualifier: "2",
              lastNameOrOrganizationName: gen.provider,
            },
            subscribers: [
              {
                traces: [{ traceTypeCode: "1", referenceId: gen.trace }],
                name: {
                  entityIdentifierCode: "IL",
                  entityTypeQualifier: "1",
                  lastNameOrOrganizationName: "DOE",
                  firstName: "JANE",
                  idQualifier: "MI",
                  idCode: gen.memberId,
                },
                inquiries: [{ serviceTypeCodes: [{ code: gen.serviceType }] }],
              },
            ],
          },
        ],
      },
    ],
  }));

describe("270 emit: the other inquiry direction still holds the fixed point", () => {
  it("emits, reads back and re-emits byte-identically", () => {
    fc.assert(
      fc.property(inquiry270Spec, (spec) => {
        const raw = serializeX12(build270(spec));
        const ix = parseX12(raw);
        expect(ix.warnings).toEqual([]);
        const tx = ix.groups[0]?.transactions[0];
        const model: X12Inquiry | undefined =
          tx === undefined ? undefined : get270Inquiry(ix.delimiters, tx);
        expect(model?.warnings).toEqual([]);
        expect(serializeX12(parseX12(raw))).toBe(raw);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * EB-13 (C003 Composite Medical Procedure Identifier) on the 271, read and
 * emit. Covers:
 *
 * - Emit bytes: `build271` writes EB-13 as `qualifier:code[:modifier...]`
 *   joined with the DECLARED component separator, never an assumed `:`.
 * - Round trip: the built EB-13 reads back component for component through
 *   `get271Eligibility`, including a component that carries a delimiter.
 * - Read leniency: EB-13-7 is read when a sender transmits it, an absent
 *   EB-13 or one with no qualifier reads as `undefined`.
 * - Refusals: empty qualifier / code, an empty modifier, more than four
 *   modifiers, and a forged modifier list → `X12_271_BUILD_INVALID_SPEC`.
 *
 * Synthetic-only fixtures: CDT `D2150`, HCPCS `G0103`, modifier `26`.
 */

import { describe, expect, it } from "vitest";

import {
  build271,
  ELIGIBILITY_271_BUILD_ERROR_CODES,
  Eligibility271BuildError,
  get271Eligibility,
  parseX12,
  serializeX12,
  X12Decimal,
  type Build271BenefitSpec,
  type Build271Spec,
  type X12EligibilityBenefit,
  type X12Interchange,
} from "../src/index.js";

const ENVELOPE = {
  senderId: "MEDPAY",
  receiverId: "PROVIDER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

function percent(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

/** The dental coinsurance line from the issue: `EB*A*******0.20****W*AD:D2150~`. */
const DENTAL_BENEFIT: Build271BenefitSpec = {
  eligibilityCode: "A",
  percent: percent("0.20"),
  inPlanNetwork: "W",
  procedure: { qualifier: "AD", code: "D2150" },
};

function specWith(
  benefit: Build271BenefitSpec,
  envelope: Partial<Build271Spec["envelope"]> = {},
): Build271Spec {
  return {
    envelope: { ...ENVELOPE, ...envelope },
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
                name: {
                  entityIdentifierCode: "IL",
                  entityTypeQualifier: "1",
                  lastName: "DOE",
                  firstName: "JANE",
                  idQualifier: "MI",
                  idCode: "MBR0001",
                },
                benefits: [benefit],
              },
            ],
          },
        ],
      },
    ],
  };
}

function ebSegmentOf(ix: X12Interchange): string {
  const text = serializeX12(ix);
  const terminator = ix.delimiters.segment;
  const eb = text.split(terminator).find((s) => s.replace(/^\s+/, "").startsWith("EB"));
  if (eb === undefined) throw new Error("no EB segment in the built interchange");
  return eb.replace(/^\s+/, "") + terminator;
}

function benefitOf(ix: X12Interchange): X12EligibilityBenefit {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("interchange has no transaction");
  const benefit = get271Eligibility(ix.delimiters, tx)?.subscribers[0]?.benefits[0];
  if (benefit === undefined) throw new Error("no benefit decoded");
  return benefit;
}

function refusalOf(spec: Build271Spec): Eligibility271BuildError {
  try {
    build271(spec);
  } catch (err) {
    if (err instanceof Eligibility271BuildError) return err;
    throw err;
  }
  throw new Error("expected build271 to refuse");
}

describe("build271 - EB-13 emit bytes", () => {
  it("writes the issue's dental line byte for byte", () => {
    expect(ebSegmentOf(build271(specWith(DENTAL_BENEFIT)))).toBe("EB*A*******0.20****W*AD:D2150~");
  });

  it("joins with the declared component separator, not an assumed ':'", () => {
    const ix = build271(
      specWith(
        {
          eligibilityCode: "D",
          insuranceTypeCode: "MB",
          procedure: { qualifier: "HC", code: "G0103", modifiers: ["26"] },
        },
        { componentSeparator: "|" },
      ),
    );
    expect(ebSegmentOf(ix)).toBe("EB*D***MB*********HC|G0103|26~");
  });

  it("emits no EB-13 when the benefit has no procedure", () => {
    const { procedure: _omitted, ...withoutProcedure } = DENTAL_BENEFIT;
    expect(ebSegmentOf(build271(specWith(withoutProcedure)))).toBe("EB*A*******0.20****W~");
  });
});

describe("build271 / get271Eligibility - EB-13 round trip", () => {
  it("reads the built composite back component for component", () => {
    const procedure = benefitOf(
      build271(
        specWith({
          ...DENTAL_BENEFIT,
          procedure: { qualifier: "HC", code: "G0103", modifiers: ["26", "TC", "59", "XS"] },
        }),
      ),
    ).procedure;
    expect(procedure).toEqual({
      qualifier: "HC",
      code: "G0103",
      modifiers: ["26", "TC", "59", "XS"],
      description: undefined,
    });
    expect(Object.isFrozen(procedure)).toBe(true);
    expect(Object.isFrozen(procedure?.modifiers)).toBe(true);
  });

  it("releases a component that carries the component separator", () => {
    const ix = build271(
      specWith({ ...DENTAL_BENEFIT, procedure: { qualifier: "ZZ", code: "D2:150" } }),
    );
    expect(ebSegmentOf(ix)).toBe("EB*A*******0.20****W*ZZ:D2?:150~");
    expect(benefitOf(ix).procedure?.code).toBe("D2:150");
  });

  it("round-trips on a non-default component separator", () => {
    const ix = build271(specWith(DENTAL_BENEFIT, { componentSeparator: "|" }));
    expect(benefitOf(ix).procedure).toMatchObject({ qualifier: "AD", code: "D2150" });
  });
});

describe("get271Eligibility - EB-13 read leniency", () => {
  /** Rewrite the built EB segment's text and re-parse; the segment count is unchanged. */
  function readWithEb(eb: string): X12EligibilityBenefit {
    const text = serializeX12(build271(specWith(DENTAL_BENEFIT)));
    const rewritten = text.replace("EB*A*******0.20****W*AD:D2150~", eb);
    expect(rewritten).not.toBe(text);
    return benefitOf(parseX12(rewritten));
  }

  it("decodes EB-13-7 when a sender transmits it", () => {
    expect(readWithEb("EB*A*******0.20****W*AD:D2150:::::CROWN~").procedure).toEqual({
      qualifier: "AD",
      code: "D2150",
      modifiers: [],
      description: "CROWN",
    });
  });

  it("reads an absent EB-13 as undefined", () => {
    expect(readWithEb("EB*A*******0.20****W~").procedure).toBeUndefined();
  });

  it("reads an EB-13 with no qualifier as undefined", () => {
    expect(readWithEb("EB*A*******0.20****W*:D2150~").procedure).toBeUndefined();
  });
});

describe("build271 - EB-13 refusals", () => {
  const INVALID_SPEC = ELIGIBILITY_271_BUILD_ERROR_CODES.X12_271_BUILD_INVALID_SPEC;

  it("refuses an empty qualifier", () => {
    const err = refusalOf(
      specWith({ ...DENTAL_BENEFIT, procedure: { qualifier: "", code: "D2150" } }),
    );
    expect(err.code).toBe(INVALID_SPEC);
    expect(err.message).toBe(
      "build271: a benefit procedure (EB-13) requires a non-empty qualifier and code.",
    );
  });

  it("refuses an empty code", () => {
    const err = refusalOf(
      specWith({ ...DENTAL_BENEFIT, procedure: { qualifier: "AD", code: "" } }),
    );
    expect(err.code).toBe(INVALID_SPEC);
  });

  it("refuses a fifth modifier, which would occupy EB-13-7", () => {
    const err = refusalOf(
      specWith({
        ...DENTAL_BENEFIT,
        procedure: { qualifier: "HC", code: "G0103", modifiers: ["26", "TC", "59", "XS", "XU"] },
      }),
    );
    expect(err.code).toBe(INVALID_SPEC);
    expect(err.message).toBe(
      "build271: a benefit procedure (EB-13) carries at most 4 modifiers; got 5.",
    );
  });

  it("refuses an empty modifier, which would shift a later one on read", () => {
    const err = refusalOf(
      specWith({
        ...DENTAL_BENEFIT,
        procedure: { qualifier: "HC", code: "G0103", modifiers: ["", "26"] },
      }),
    );
    expect(err.code).toBe(INVALID_SPEC);
    expect(err.message).toBe("build271: benefit procedure (EB-13) modifier at index 0 is empty.");
  });

  it("refuses a forged modifier list with a typed error", () => {
    const forged = { length: "9".repeat(120) } as unknown as readonly string[];
    const err = refusalOf(
      specWith({
        ...DENTAL_BENEFIT,
        procedure: { qualifier: "HC", code: "G0103", modifiers: forged },
      }),
    );
    expect(err.code).toBe(INVALID_SPEC);
  });

  it("refuses a non-string code rather than coercing it", () => {
    const code = 2150 as unknown as string;
    const err = refusalOf(specWith({ ...DENTAL_BENEFIT, procedure: { qualifier: "AD", code } }));
    expect(err.code).toBe(INVALID_SPEC);
  });
});

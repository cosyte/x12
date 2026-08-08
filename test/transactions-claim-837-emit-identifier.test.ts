/**
 * `X12-837-EMIT-IDENTIFIER-FIXED`: the caller override for the ST-03 / GS-08
 * implementation convention reference on `build837P` / `build837I` /
 * `build837D`.
 *
 * ## What was measured at base
 *
 * The builders stamped `005010X222A2` / `005010X223A3` / `005010X224A2` into
 * both ST-03 and GS-08 and **a caller could not change them**. Probed on the
 * base tree by reading the SEGMENT ELEMENTS of the returned interchange
 * (`ix.groups[0].gs.elements[8]` and `...transactions[0].st.elements[3]`),
 * which is where those bytes live. GS-08 has no model slot at all, so the
 * segments are the only place both can be read the same way; the round-trip
 * blocks below additionally read ST-03 back through the model's own
 * `X12_837Submission.implementationConventionReference`:
 *
 * ```text
 * build837P default                                 -> GS-08=005010X222A2 ST-03=005010X222A2
 * build837P + envelope.implementationConventionReference -> GS-08=005010X222A2 ST-03=005010X222A2
 * build837P + envelope.versionRelease                    -> GS-08=005010X222A2 ST-03=005010X222A2
 * ```
 *
 * Two of the three defaults are not what CMS and several state Medicaid
 * companion guides require, so a partner asking for `005010X222A1` or
 * `005010X223A2` rejected the file. **The read side was already grounded by
 * `X12-VARIANT-ICR-UNGROUNDED` and this is the emit side of the same fact.**
 *
 * ## Why an override and not a re-stamp
 *
 * Which published guide identifier a trading partner accepts is a **partner
 * fact, not a spec fact**. Re-stamping the default would change bytes this
 * library already emits and break the partners it works with today, so the
 * default is untouched and the caller states what its own partner requires.
 * The first `describe` block below is that guarantee, asserted per variant.
 *
 * ## What is deliberately NOT refused
 *
 * A reference outside the table this library reads is emitted as given. The
 * published-errata set is not provably exhaustive - the read side says so and
 * publishes no count of it - so refusing an unrecognised identifier would
 * re-import an exhaustiveness claim nothing here can support. Pinned as a
 * control, with the honest cost stated beside it: this library's own reader
 * falls back to the `SVx` scan on such a file.
 */

import { describe, expect, it } from "vitest";

import {
  build837D,
  build837I,
  build837P,
  CLAIM_837_BUILD_ERROR_CODES,
  Claim837BuildError,
  get837Claims,
  parseX12,
  X12Decimal,
  type Build837EnvelopeSpec,
  type Build837Spec,
  type X12Interchange,
  type X12_837Submission,
} from "../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

const ENVELOPE: Build837EnvelopeSpec = {
  senderId: "SUBMITTER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
};

/** A minimal, synthetic, spec-clean submission for one variant. */
function specFor(
  variant: "P" | "I" | "D",
  envelope: Build837EnvelopeSpec = ENVELOPE,
): Build837Spec {
  return {
    envelope,
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
                claimId: "PT-ACCT-001",
                totalCharge: dec("150.00"),
                diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
                serviceLines: [
                  variant === "P"
                    ? {
                        variant: "P",
                        procedureQualifier: "HC",
                        procedureCode: "99213",
                        charge: dec("150.00"),
                        unitOfMeasure: "UN",
                        units: dec("1"),
                        diagnosisPointers: ["1"],
                      }
                    : variant === "I"
                      ? {
                          variant: "I",
                          revenueCode: "0120",
                          charge: dec("150.00"),
                          unitOfMeasure: "UN",
                          units: dec("1"),
                        }
                      : {
                          variant: "D",
                          procedureQualifier: "AD",
                          procedureCode: "D0120",
                          charge: dec("150.00"),
                          unitOfMeasure: "UN",
                          units: dec("1"),
                        },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

const BUILDERS = {
  P: build837P,
  I: build837I,
  D: build837D,
} as const;

/** Build one variant, optionally stating the reference. */
function build(variant: "P" | "I" | "D", reference?: string): X12Interchange {
  const envelope =
    reference === undefined
      ? ENVELOPE
      : { ...ENVELOPE, implementationConventionReference: reference };
  return BUILDERS[variant](specFor(variant, envelope));
}

/**
 * The two elements under test, read off the emitted segments. Both, always:
 * one value reaches both, and a test that read only ST-03 would pass on a
 * builder that stopped writing GS-08.
 */
function declaredReference(ix: X12Interchange): {
  gs08: string | undefined;
  st03: string | undefined;
} {
  return {
    gs08: ix.groups[0]?.gs.elements[8],
    st03: ix.groups[0]?.transactions[0]?.st.elements[3],
  };
}

function submissionOf(ix: X12Interchange): X12_837Submission {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims did not recognize the built 837");
  return sub;
}

/**
 * The single decoded service line of a built submission, for a money
 * assertion.
 *
 * 🩺 Read against the model's OWN shape: `X12_837Submission` is FLAT
 * (`claims`, `hierarchies`), and the nested billing-provider tree is the
 * BUILD spec's shape, not the read model's. A first draft of this file walked
 * `sub.billingProviders[0].subscribers[0].claims[0]` - the spec's path - and
 * measured nothing at all. That mistake has been made here before.
 */
function onlyLine(sub: X12_837Submission): { charge: X12Decimal | undefined } {
  const line = sub.claims[0]?.serviceLines[0];
  if (line === undefined) throw new Error("built submission has no service line");
  return line;
}

// ---------------------------------------------------------------------------
// 1. The default is unchanged. This is the guarantee that no document this
//    builder already emits changes shape, which is why the fix is an override
//    rather than a re-stamp.
// ---------------------------------------------------------------------------

describe("X12-837-EMIT-IDENTIFIER-FIXED: the default is untouched", () => {
  it.each([
    ["P", "005010X222A2"],
    ["I", "005010X223A3"],
    ["D", "005010X224A2"],
  ] as const)(
    "build837%s still declares %s in ST-03 AND GS-08 when nothing is stated",
    (variant, expected) => {
      expect(declaredReference(build(variant))).toEqual({ gs08: expected, st03: expected });
    },
  );

  it("a defaulted 837 still round-trips through the reader with no warnings", () => {
    const sub = submissionOf(build("P"));
    expect(sub.variant).toBe("P");
    expect(sub.warnings).toEqual([]);
    expect(onlyLine(sub).charge?.toString()).toBe("150.00");
  });
});

// ---------------------------------------------------------------------------
// 2. The override reaches the wire - the item's acceptance criterion. Each
//    case is an identifier a real companion guide asks for.
// ---------------------------------------------------------------------------

describe("X12-837-EMIT-IDENTIFIER-FIXED: a stated reference reaches ST-03 and GS-08", () => {
  it.each([
    ["P", "005010X222A1"],
    ["I", "005010X223A2"],
    ["D", "005010X224A1"],
  ] as const)("build837%s emits the stated %s in both elements", (variant, reference) => {
    expect(declaredReference(build(variant, reference))).toEqual({
      gs08: reference,
      st03: reference,
    });
  });

  it("🩺 the partner-required professional file reads back clean through this library", () => {
    // The whole point of the slice: `005010X222A1` is what the partner asked
    // for, and the file built with it is a working 837P end to end, charge
    // included. Base could not produce this file at all.
    const sub = submissionOf(build("P", "005010X222A1"));
    expect(sub.implementationConventionReference).toBe("005010X222A1");
    expect(sub.variant).toBe("P");
    expect(sub.warnings).toEqual([]);
    expect(onlyLine(sub).charge?.toString()).toBe("150.00");
  });

  it("🩺 the partner-required institutional file reads back clean through this library", () => {
    const sub = submissionOf(build("I", "005010X223A2"));
    expect(sub.implementationConventionReference).toBe("005010X223A2");
    expect(sub.variant).toBe("I");
    expect(sub.warnings).toEqual([]);
    expect(onlyLine(sub).charge?.toString()).toBe("150.00");
  });

  it("states the reference the caller gave and never a normalised form of it", () => {
    // The read table is a list of cited identifiers and normalises nothing, so
    // the emit side must not invent a normalisation either. A lower-cased
    // reference is emitted exactly as handed over.
    expect(declaredReference(build("P", "005010x222a1"))).toEqual({
      gs08: "005010x222a1",
      st03: "005010x222a1",
    });
  });
});

// ---------------------------------------------------------------------------
// 3. What is deliberately NOT refused, and its honest cost.
// ---------------------------------------------------------------------------

describe("X12-837-EMIT-IDENTIFIER-FIXED: an uncited reference is emitted, not refused", () => {
  it("CONTROL: a reference this library does not carry is still emitted", () => {
    // Nothing makes the published-errata set provably exhaustive, so a partner
    // may require an identifier nobody here cited. Refusing on absence would
    // make this builder claim an exhaustiveness the reader explicitly does not.
    expect(declaredReference(build("P", "005010X222A9"))).toEqual({
      gs08: "005010X222A9",
      st03: "005010X222A9",
    });
  });

  it("🩺 and states the cost: this library's own reader falls back to the SVx scan", () => {
    // Not a defect of the override - it is what the reader does with any
    // unrecognised ST-03, and it is pinned so nobody reads the case above as a
    // promise that an arbitrary identifier round-trips as a declaration.
    const sub = submissionOf(build("P", "005010X222A9"));
    expect(sub.variant).toBe("P"); // resolved from the SV1, not from the declaration
    expect(sub.warnings).toEqual([]);
  });

  it("accepts every cited reference for its OWN variant, base guide and errata alike", () => {
    for (const reference of ["005010X222", "005010X222A1", "005010X222A2"]) {
      expect(declaredReference(build("P", reference)).st03).toBe(reference);
    }
    for (const reference of ["005010X223", "005010X223A1", "005010X223A2", "005010X223A3"]) {
      expect(declaredReference(build("I", reference)).st03).toBe(reference);
    }
    for (const reference of ["005010X224", "005010X224A1", "005010X224A2", "005010X224A3"]) {
      expect(declaredReference(build("D", reference)).st03).toBe(reference);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. The two refusals. Every case asserts the MESSAGE and the code, never the
//    class alone - `toThrow(Claim837BuildError)` passes on an unrelated
//    refusal, and four of six cases in an earlier slice were vacuous that way.
// ---------------------------------------------------------------------------

describe("X12-837-EMIT-IDENTIFIER-FIXED: refusals", () => {
  /** Run the build and return the refusal it threw. */
  function refusalOf(variant: "P" | "I" | "D", reference: unknown): Claim837BuildError {
    try {
      BUILDERS[variant](
        specFor(variant, {
          ...ENVELOPE,
          // The invalid-type case is the point of this cast: a JavaScript
          // caller reaches it and the type system does not stop them.
          implementationConventionReference: reference as string,
        }),
      );
    } catch (error) {
      if (error instanceof Claim837BuildError) return error;
      throw error;
    }
    throw new Error("build did not refuse");
  }

  it("🩺 refuses an EMPTY reference, because it would delete both elements", () => {
    const error = refusalOf("P", "");
    expect(error.code).toBe(CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC);
    expect(error.message).toContain("envelope.implementationConventionReference is empty");
    expect(error.message).toContain("would remove them rather than send them empty");
  });

  it("🩺 an empty reference really would have deleted them (the reason, measured)", () => {
    // `seg` strips trailing empty elements, so the refusal above is not
    // fastidiousness: ST-03 and GS-08 are the last elements of their segments,
    // and an empty one is not emitted as empty, it is not emitted at all. This
    // control shows the mechanism on a segment the builder already emits: an
    // absent optional trailing element leaves the segment SHORT.
    const st = build("P").groups[0]?.transactions[0]?.st;
    expect(st?.elements).toHaveLength(4);
    const gs = build("P").groups[0]?.gs;
    expect(gs?.elements).toHaveLength(9);
  });

  it.each([
    ["P", "005010X223A2"],
    ["I", "005010X222A1"],
    ["D", "005010X222"],
    ["P", "005010X224A2"],
  ] as const)(
    "🩺 build837%s refuses %s, which this library reads as another variant's guide",
    (variant, reference) => {
      const error = refusalOf(variant, reference);
      expect(error.code).toBe(CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC);
      expect(error.message).toContain("reads as a DIFFERENT 837 variant");
      expect(error.message).toContain(`but this is build837${variant}`);
      expect(error.message).toContain(`State a reference for the ${variant} 837`);
    },
  );

  it("🩺 the refusal does NOT name the variant the reference belongs to, deliberately", () => {
    // Naming it would mean interpolating a table read with a caller-supplied
    // key into a refusal message, which is the shape `builder-refusal-bounds`
    // exists to keep out. The caller chose both the builder and the reference,
    // so the variant this builder emits is enough to act on.
    const message = refusalOf("P", "005010X223A2").message;
    expect(message).not.toContain("Institutional");
    expect(message).toContain("build837P");
  });

  it("refuses a non-string through the builder's own element-type guard", () => {
    const error = refusalOf("P", 5010222);
    expect(error.code).toBe(CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC);
    expect(error.message).toContain("build837: every element value must be a string");
    expect(error.message).toContain("number");
  });

  it("🩺 no refusal message echoes the reference the caller handed over", () => {
    // A domain builder's refusal carries structural locators and library-owned
    // discriminants only. The variant NAME in the message is this library's own
    // word for a table entry, not the caller's bytes.
    expect(refusalOf("P", "005010X223A2").message).not.toContain("005010X223A2");
    expect(refusalOf("I", "005010X222A1").message).not.toContain("005010X222A1");
  });

  it("🩺 and no refusal message quotes a TR3 implementation-convention reference at all", () => {
    // The same rule the warning registry is held to by
    // `transactions-claim-837-variant-icr-grounding`: a message is frozen and
    // the table is not, so a message that names a member of the table is wrong
    // the moment the table is corrected.
    const messages = [
      refusalOf("P", "").message,
      refusalOf("P", "005010X223A2").message,
      refusalOf("I", "005010X222A1").message,
    ];
    expect(messages.filter((m) => /00\d{4}X\d{3}/u.test(m))).toEqual([]);
  });

  it("CONTROL: that same scan DOES find one when a message carries it", () => {
    // Without this the test above passes on an empty list, a broken regex, or a
    // refusal that never happened.
    expect(["ST-03 of 005010X222A2"].filter((m) => /00\d{4}X\d{3}/u.test(m))).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 5. Delimiters. A reference carrying one is REFUSED rather than escaped,
//    and the reason is measured here rather than asserted.
// ---------------------------------------------------------------------------

describe("X12-837-EMIT-IDENTIFIER-FIXED: a reference carrying a delimiter is refused", () => {
  it.each([
    ["the element separator", "005010*X222A1"],
    ["the segment terminator", "005010~X222A1"],
    ["the component separator", "005010:X222A1"],
    ["the repetition separator", "005010^X222A1"],
    ["the release character", "005010?X222A1"],
  ])("🩺 refuses one carrying %s", (_label, reference) => {
    let error: unknown;
    try {
      build("P", reference);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Claim837BuildError);
    if (!(error instanceof Claim837BuildError)) throw new Error("unreachable");
    expect(error.code).toBe(CLAIM_837_BUILD_ERROR_CODES.X12_837_BUILD_INVALID_SPEC);
    expect(error.message).toContain("carries an active delimiter or the release character");
    expect(error.message).not.toContain(reference);
  });

  it("tracks the delimiter set the CALLER chose, not a hard-coded list", () => {
    // `|` is inert under the default delimiters and active under these, and the
    // refusal follows the choice. This is why the guard asks the escaper rather
    // than scanning for characters.
    expect(declaredReference(build("P", "005010|X222A1")).st03).toBe("005010|X222A1");
    expect(() =>
      build837P(
        specFor("P", {
          ...ENVELOPE,
          elementSeparator: "|",
          implementationConventionReference: "005010|X222A1",
        }),
      ),
    ).toThrow("carries an active delimiter or the release character");
  });

  it("🩺 CLOSED by X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE: a delimiter in ANOTHER envelope field no longer shifts these two", () => {
    // This test used to pin the opposite, and it was a DISCLOSURE rather than a
    // guarantee: the envelope splitter was a plain `split`, so a released
    // separator in a control number shifted every element after it and GS-08
    // came back holding the GS-07 responsible agency code (`"X"`), silently.
    // `src/parser/envelope.ts`'s `splitElements` now honours the release
    // character, so the shift is gone and the element is answered whole. The
    // full argument, the ISA's deliberate exemption and the invariance controls
    // are in `test/parser-envelope-release-split.test.ts`.
    const released = build837P(specFor("P", { ...ENVELOPE, groupControlNumber: "1*2" }));
    expect(released.groups[0]?.gs.elements).toHaveLength(9); // "GS" plus GS-01..GS-08
    expect(released.groups[0]?.gs.elements[6]).toBe("1?*2"); // RAW, pre-unescape
    expect(released.groups[0]?.gs.elements[7]).toBe("X"); // GS-07, in its own slot
    expect(declaredReference(released).gs08).toBe("005010X222A2");
    expect(released.warnings).toEqual([]);
  });

  it("🩺 DISCLOSED, NOT GUARDED: the length is not bounded, and the two maxima differ", () => {
    // GS-08 is data element 480 (AN 1/12); ST-03 is element 1705 (AN 1/35).
    // Secondhand from the data-element dictionary, so it is disclosure and
    // nothing refuses on it: bounding this one field would imply a promise the
    // rest of the envelope does not keep (`groupControlNumber` is N0 1/9 and
    // takes 16 digits at base).
    const long = "005010X222A1EXTRAEXTRAEXTRAEXTRA123";
    expect(long.length).toBeGreaterThan(12);
    expect(declaredReference(build("P", long))).toEqual({ gs08: long, st03: long });
  });

  it("🩺 THE ORIGINAL REASON IS RETRACTED: escaping DOES now protect ST-03 and GS-08", () => {
    // The refusal above was justified, when it shipped, by "escaping does not
    // help here - the envelope splitter is not release-aware". That sentence is
    // FALSE as of `X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`, so it is retracted
    // rather than reworded. Straight through `parseX12`, so it measures the
    // reader and not the builder that refuses.
    const isa =
      "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260601*1200*^*00501*000000001*0*P*:~";
    const ix = parseX12(
      isa +
        "GS*HC*S*R*20260601*1200*1*X*005010?*X222A1~" +
        "ST*837*0001*005010?*X222A1~" +
        "CLM*PT?*ACCT*150.00~" +
        "SE*3*0001~GE*1*1~IEA*1*000000001~",
    );
    const group = ix.groups[0];
    expect(group?.gs.elements).toHaveLength(9);
    expect(group?.gs.elements[8]).toBe("005010?*X222A1");
    expect(group?.transactions[0]?.st.elements).toHaveLength(4);
    expect(group?.transactions[0]?.st.elements[3]).toBe("005010?*X222A1");
    // The control that was always green: the same construct in a BODY element.
    expect(group?.transactions[0]?.segments.find((s) => s.id === "CLM")?.elements).toEqual([
      "CLM",
      "PT?*ACCT",
      "150.00",
    ]);
    expect(ix.warnings).toEqual([]);
  });

  it("🛑 and the refusal is KEPT ANYWAY, which is a decision and not an oversight", () => {
    // Now that escaping protects the element, this guard refuses a value the
    // reader could in fact carry, so it is over-strict rather than necessary.
    // It is NOT relaxed here. Relaxing it would WIDEN what `build837P` puts on
    // the wire - a partner's parser is not obliged to be release-aware either,
    // and an active delimiter in a guide identifier has no legitimate use - and
    // widening an emit surface is its own decision with its own blast radius,
    // not a side effect of a reader fix. Pinned so the refusal cannot quietly
    // disappear on the strength of the retraction above.
    expect(() => build("P", "005010*X222A1")).toThrow(
      "carries an active delimiter or the release character",
    );
    expect(() => build("P", "005010?X222A1")).toThrow(
      "carries an active delimiter or the release character",
    );
  });
});

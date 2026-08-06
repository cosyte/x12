/**
 * `REFUSAL-MESSAGE-PHI-ECHO` - the PHI guarantee this package makes about
 * builder refusal messages, driven end to end through the published builders.
 *
 * ## The claim, and how it was false
 *
 * Every domain builder documents, on its own error codes, that its refusal
 * message carries structural locators, counts and X12 control codes only, and
 * **never a `claimId` (patient-account number), member id, member name, trace
 * or diagnosis code**. That held on the string path - no domain template
 * interpolates one of those fields - and it did **not** hold on the non-string
 * one.
 *
 * The four shared caller guards (`caller-string.ts`, `caller-segment.ts`,
 * `caller-decimal.ts`, `caller-array.ts`) each refused a wrong-typed value by
 * describing it as `a number ("900412345678")` - bounded to 90 characters
 * through `renderCallerValue`, and **not redacted**. Those guards stand on
 * *every element of every builder*, so the primitive in front of them is as
 * likely to be `CLP-01` or `NM1-09` as a control number. Measured on this tree
 * at base `4a5a943`, with a `JSON.parse`d spec of the kind `@cosyte/cli` hands
 * over:
 *
 * ```text
 * build835({ claims: [{ patientControlNumber: 900412345678, … }] })
 *   -> "build835: every element value must be a string, but received
 *       a number (\"900412345678\"). …"
 * build834({ members: [{ member: { idCode: 700998877, … } }] })
 *   -> "build834: every element value must be a string, but received
 *       a number (\"700998877\"). …"
 * ```
 *
 * **A guarantee that is true on one path and false on another is not a
 * guarantee**, and the remedy chosen was to make it true rather than to reword
 * it: the guards report the TYPE and never the value. The reasoning, including
 * why the decimal guard went the same way when the float rendering looked like
 * a diagnostic worth keeping, is in `src/builder/caller-decimal.ts`.
 *
 * ## Why this file exists beside `test/builder-refusal-bounds.test.ts`
 *
 * That gate scans `throw new *BuildError(` sites, so it sees the domain
 * TEMPLATES and cannot see a guard that refuses through a callback - which is
 * exactly where the hole was. This file is behavioural and drives the published
 * entry points, so it observes what a consumer's `catch` block observes.
 *
 * **Every payload here carries a real identifier and every assertion is checked
 * for non-vacuity**, because the sibling `dicom` repo has lost this exact
 * blocker four times to fixtures that were vacuous by construction: a refusal
 * test whose input holds no member id proves nothing about member ids. So each
 * case asserts the refusal HAPPENED, that it is typed and code-tagged, that it
 * still names the offending type, AND that the identifier is absent.
 *
 * Synthetic-only fixtures throughout: `DOE` / `JANE`, `MEMBER001`, and numeric
 * identifiers drawn from no real range.
 */

import { describe, expect, it } from "vitest";

import {
  build820,
  build834,
  build835,
  build837P,
  buildInterchange,
  X12Decimal,
} from "../src/index.js";

/** A JS / JSON caller who defeated their own type checker, as `@cosyte/cli` can. */
const asJsCaller = <T>(spec: unknown): T => spec as T;

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

const ENVELOPE = {
  senderId: "MEDICARE",
  receiverId: "SUBMITTER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

/**
 * The identifiers the claim names, as a JSON-driven caller would deliver them:
 * numbers, which is the only way to reach the guards at all. Chosen so that no
 * one of them is a substring of any refusal template's own fixed text - the
 * decimal guard's message names `1e21` and `0.30000000000000004` outright, so a
 * payload of `1` or `0.1 + 0.2` would make the absence assertion meaningless.
 */
const PATIENT_ACCOUNT_NUMBER = 900_412_345_678;
const MEMBER_ID = 700_998_877;
const TRACE_NUMBER = 880_077_665;

/** Assert a refusal happened, is typed, still diagnoses, and hides the identifier. */
function expectRedactedRefusal(run: () => unknown, identifier: number, expectedType: string): void {
  let thrown: unknown;
  try {
    run();
  } catch (err) {
    thrown = err;
  }
  // Non-vacuity, in four parts. Without the first three, "the message does not
  // contain the member id" is satisfied by a builder that never refused, by an
  // untyped `TypeError`, and by an empty message.
  expect(thrown).toBeInstanceOf(Error);
  expect(typeof (thrown as { code?: unknown }).code).toBe("string");
  const { message } = thrown as Error;
  expect(message).toContain(`but received ${expectedType}.`);
  expect(message).not.toContain(String(identifier));
}

// ---------------------------------------------------------------------------
// The two slots the published claim names by name.
// ---------------------------------------------------------------------------

describe("a claimId or member id never reaches a builder refusal message", () => {
  const line = {
    productServiceIdQualifier: "HC",
    productServiceId: "99213",
    chargeAmount: dec("500.00"),
    paymentAmount: dec("450.00"),
    adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
  };

  const remitSpec = (patientControlNumber: unknown): unknown => ({
    envelope: ENVELOPE,
    payment: {
      transactionHandlingCode: "I",
      totalActualPayment: dec("450.00"),
      creditDebitFlag: "C",
      method: "ACH",
      paymentDate: "20260601",
    },
    traces: [{ traceTypeCode: "1", referenceId: "0012345" }],
    payer: { entityIdentifierCode: "PR", name: "MEDICARE PART A" },
    payee: {
      entityIdentifierCode: "PE",
      name: "RENDERING CLINIC",
      idQualifier: "XX",
      idCode: "1234567890",
    },
    claims: [
      {
        patientControlNumber,
        claimStatusCode: "1",
        totalChargeAmount: dec("500.00"),
        totalPaymentAmount: dec("450.00"),
        patientResponsibilityAmount: dec("50.00"),
        claimFilingIndicatorCode: "MB",
        patient: {
          entityIdentifierCode: "QC",
          lastName: "PATIENT",
          firstName: "TEST",
          idQualifier: "MI",
          idCode: "MEMBER001",
        },
        serviceLines: [line],
      },
    ],
  });

  it("build835: a numeric CLP-01 patient-account number (the `claimId`)", () => {
    // CLP-01 is the reassociation key back to the 837's CLM-01 and is the
    // patient ACCOUNT number - one of the §164.514 identifiers, and the exact
    // field the published claim names.
    expectRedactedRefusal(
      () => build835(asJsCaller(remitSpec(PATIENT_ACCOUNT_NUMBER))),
      PATIENT_ACCOUNT_NUMBER,
      "a number",
    );
  });

  it("build835: the fixture is not vacuous - the same spec builds with a string", () => {
    // The control that makes the case above mean something. If the spec were
    // broken for an unrelated reason, the refusal would still hide the number
    // and the test would still pass.
    expect(() => build835(asJsCaller(remitSpec("PT-ACCT-001")))).not.toThrow();
  });

  it("build834: a numeric NM1-09 member id", () => {
    const spec = (idCode: unknown): unknown => ({
      envelope: ENVELOPE,
      header: {
        transactionSetPurposeCode: "00",
        referenceId: "ENR-2026-06",
        date: "20260601",
      },
      sponsor: {
        entityIdentifierCode: "P5",
        name: "ACME EMPLOYER",
        idQualifier: "FI",
        idCode: "123456789",
      },
      payer: {
        entityIdentifierCode: "IN",
        name: "BLUE PLAN",
        idQualifier: "FI",
        idCode: "987654321",
      },
      members: [
        {
          maintenanceTypeCode: "021",
          maintenanceReasonCode: "AI",
          benefitStatusCode: "A",
          member: {
            entityIdentifierCode: "IL",
            lastName: "DOE",
            firstName: "JANE",
            idQualifier: "MI",
            idCode,
          },
        },
      ],
    });
    expectRedactedRefusal(() => build834(asJsCaller(spec(MEMBER_ID))), MEMBER_ID, "a number");
    expect(() => build834(asJsCaller(spec("MEMBER001")))).not.toThrow();
  });

  it("build837P: a numeric CLM-01 claimId", () => {
    const spec = (claimId: unknown): unknown => ({
      envelope: ENVELOPE,
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
                  claimId,
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
    });
    expectRedactedRefusal(
      () => build837P(asJsCaller(spec(PATIENT_ACCOUNT_NUMBER))),
      PATIENT_ACCOUNT_NUMBER,
      "a number",
    );
    expect(() => build837P(asJsCaller(spec("CLAIM-0001")))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// The other three shared guards, each on a slot that can hold an identifier.
// ---------------------------------------------------------------------------

describe("the other shared caller guards redact too, which is what makes it a property", () => {
  const interchangeSpec = (memberId: unknown, groupDate: unknown = "20260601"): unknown => ({
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groups: [
      {
        functionalIdCode: "HC",
        groupControlNumber: "1",
        versionRelease: "005010X222A2",
        groupDate,
        transactions: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            segments: [["NM1", "IL", "1", "DOE", "JANE", "", "", "", "MI", memberId]],
          },
        ],
      },
    ],
  });

  it("a numeric NM1-09 handed to buildInterchange wholesale", () => {
    // `buildInterchange` takes `[segmentId, ...elements]` as a `SegmentSpec`,
    // which is the most direct way a caller puts a member id in front of these
    // guards. It maps `esc` over the body segments, so `requireCallerString` is
    // what fires here - which is the point: the redaction has to hold on the
    // guard that ACTUALLY runs, not on the one the disclosure happened to name.
    expectRedactedRefusal(
      () => buildInterchange(asJsCaller(interchangeSpec(MEMBER_ID))),
      MEMBER_ID,
      "a number",
    );
    expect(() => buildInterchange(asJsCaller(interchangeSpec("MEMBER001")))).not.toThrow();
  });

  it("the SEGMENT guard, on a slot that skips esc, still names the slot", () => {
    // `buildGroup` emits GS-04 / GS-05 / GS-07 RAW, so this is a real route
    // where `requireCallerSegment` is the guard that runs rather than the
    // backstop nothing reaches. It redacts like its siblings AND keeps the
    // spec-shaped locator, which is the diagnostic the value used to stand in
    // for.
    let message = "";
    try {
      buildInterchange(asJsCaller(interchangeSpec("MEMBER001", 20_260_601)));
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('"GS"-04 must be a string, but received a number.');
    expect(message).not.toContain("20260601");
  });

  it("the ARRAY guard: a scalar where a list belongs", () => {
    // `requireCallerArray` is slot-generic in exactly the way the element
    // guards are: the scalar a caller put where a list belongs is THEIR data,
    // and this guard cannot tell a member id from anything else either.
    //
    // The slot has to be one `requireCallerArray` actually guards, and picking
    // one by eye is how a probe measures nothing. `member.healthCoverages` is
    // guarded; `review.dates` on the 278 is NOT (it is an optional leaf read
    // with `?? []`, outside the `build*` array-bounds scope this package
    // discloses), and a first draft of this case used it and passed at BASE -
    // for the wrong reason, because the string was iterated character by
    // character and something else refused first.
    const spec = (healthCoverages: unknown): unknown => ({
      envelope: ENVELOPE,
      header: { transactionSetPurposeCode: "00", referenceId: "ENR-2026-06", date: "20260601" },
      sponsor: {
        entityIdentifierCode: "P5",
        name: "ACME EMPLOYER",
        idQualifier: "FI",
        idCode: "123456789",
      },
      payer: {
        entityIdentifierCode: "IN",
        name: "BLUE PLAN",
        idQualifier: "FI",
        idCode: "987654321",
      },
      members: [
        {
          maintenanceTypeCode: "021",
          benefitStatusCode: "A",
          member: {
            entityIdentifierCode: "IL",
            lastName: "DOE",
            firstName: "JANE",
            idQualifier: "MI",
            idCode: "MEMBER001",
          },
          healthCoverages,
        },
      ],
    });
    let message = "";
    try {
      build834(asJsCaller(spec(String(MEMBER_ID))));
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("spec.members[0].healthCoverages");
    expect(message).toContain("a string");
    expect(message).not.toContain(String(MEMBER_ID));
    // The shape half is KEPT and is not slot data: a forged `length` is the
    // whole reason this guard exists, and it is what makes the refusal
    // actionable.
    let forged = "";
    try {
      build834(asJsCaller(spec({ length: "9".repeat(120_000) })));
    } catch (err) {
      forged = (err as Error).message;
    }
    expect(forged).toContain("an array-like object with length");
    expect(forged).toContain("(120000 characters)");
    expect(() => build834(asJsCaller(spec(undefined)))).not.toThrow();
  });

  it("the DECIMAL guard: a numeric amount, redacted with its siblings", () => {
    // An `X12Decimal` slot holds money or a quantity rather than an identifier,
    // which is the argument for having kept the echo here. It went anyway: "no
    // slot-generic guard echoes EXCEPT this one" is a census with one entry,
    // and this package has had a census measured false five times.
    const spec = (amount: unknown): unknown => ({
      envelope: ENVELOPE,
      payment: {
        transactionHandlingCode: "I",
        totalPremiumAmount: amount,
        creditDebitFlag: "C",
        method: "ACH",
        paymentFormatCode: "CTX",
        paymentDate: "20260601",
      },
      traces: [{ traceTypeCode: "1", referenceId: "PREM-202606" }],
      receiver: {
        entityIdentifierCode: "PE",
        name: "MEDPAY INSURANCE",
        idQualifier: "FI",
        idCode: "FEIN999",
      },
      remitter: {
        entityIdentifierCode: "PR",
        name: "EMPLOYER CO",
        idQualifier: "FI",
        idCode: "FEIN123",
      },
      remittances: [
        {
          individual: {
            entityIdentifierCode: "IL",
            lastName: "DOE",
            firstName: "JANE",
            idQualifier: "34",
            idCode: "MBR0001",
          },
          openItems: [
            {
              qualifier: "AZ",
              referenceId: "POL-0001",
              amountPaid: dec("250.00"),
              amountDue: dec("250.00"),
            },
          ],
        },
      ],
    });
    expectRedactedRefusal(() => build820(asJsCaller(spec(TRACE_NUMBER))), TRACE_NUMBER, "a number");
    expect(() => build820(asJsCaller(spec(dec("12500.00"))))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// What the slice deliberately did NOT change.
// ---------------------------------------------------------------------------

describe("the caller values a builder TEMPLATE names by field are still shown", () => {
  it("an over-long control number is still rendered, bounded", () => {
    // This is not redaction and this package has never said it was: the
    // template names the field, the value is an envelope control number, and
    // the branch fires BECAUSE the value is over-long, so hiding it would
    // leave the caller with nothing. `caller-value.ts` states the terms.
    const huge = "9".repeat(120_000);
    try {
      buildInterchange(
        asJsCaller({
          senderId: "SENDER",
          receiverId: "RECEIVER",
          interchangeDate: "260601",
          interchangeTime: "1200",
          interchangeControlNumber: huge,
          groups: [],
        }),
      );
      throw new Error("expected a refusal");
    } catch (err) {
      const { message } = err as Error;
      expect(message).toContain("(120000 characters)");
      expect(message).not.toContain(huge);
    }
  });

  it("an unknown 834 maintenance type is still named, because it is an X12 control code", () => {
    // X12 Code Source 875. The builder refuses to emit an action it cannot
    // name, and naming the code is the whole diagnostic. Not PHI, and the
    // published claim has always said "control codes" alongside "never a
    // member id".
    let message = "";
    try {
      build834(
        asJsCaller({
          envelope: ENVELOPE,
          header: {
            transactionSetPurposeCode: "00",
            referenceId: "ENR-2026-06",
            date: "20260601",
          },
          sponsor: {
            entityIdentifierCode: "P5",
            name: "ACME EMPLOYER",
            idQualifier: "FI",
            idCode: "123456789",
          },
          payer: {
            entityIdentifierCode: "IN",
            name: "BLUE PLAN",
            idQualifier: "FI",
            idCode: "987654321",
          },
          members: [
            {
              maintenanceTypeCode: "999",
              benefitStatusCode: "A",
              member: {
                entityIdentifierCode: "IL",
                lastName: "DOE",
                firstName: "JANE",
                idQualifier: "MI",
                idCode: "MEMBER001",
              },
            },
          ],
        }),
      );
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('"999"');
    // And still nothing from the member beside it.
    expect(message).not.toContain("MEMBER001");
    expect(message).not.toContain("DOE");
  });
});

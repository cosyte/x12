/**
 * The numeric-emit gate for `@cosyte/x12`'s builders
 * (`X12-DECIMAL-BYPASSES-THE-GUARD`).
 *
 * ## The defect
 *
 * `#60` put every builder's `esc` behind `makeCallerEscaper`, which refuses a
 * non-string. It closed the route the filed defect took, and its own docblock
 * disclosed the route it did not: an `X12Decimal` slot never hands `esc` the
 * caller's value, it hands it `value.toString()`. A raw `number` answers
 * `.toString()` with a perfectly good string, so it arrives at the chokepoint
 * already a string and the guard never applies.
 *
 * **Measured at base commit `15abbd4`, `warnings.length === 0` in every case:**
 *
 * ```text
 * patientResponsibilityAmount: 0.1 + 0.2  ->  CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*...
 * patientResponsibilityAmount: 1e21       ->  CLP*PT-ACCT-001*1*500.00*450.00*1e+21*...
 * patientResponsibilityAmount: NaN        ->  CLP*PT-ACCT-001*1*500.00*450.00*NaN*...
 * line.units: 0.1 + 0.2                   ->  SV1*HC:99213*150.00*UN*0.30000000000000004***1
 * diagnoses[0].monetaryAmount: 0.1 + 0.2  ->  HI*ABK:J20.9:::0.30000000000000004
 * ```
 *
 * Two of those three renderings the library **cannot parse back**:
 * `X12_DECIMAL_RE` in `src/decimal.ts` rejects exponent notation and `NaN`
 * outright, so `1e+21` and `NaN` do not round-trip. `0.30000000000000004` is
 * worse in the other direction - it is well-formed, so nothing downstream
 * refuses it, and it publishes 17 significant digits into a monetary element.
 *
 * ## This is NOT the harm `#60` fixed, and the difference is why it shipped
 * disclosed rather than stopping that slice
 *
 * `#60` existed because a required identifier **vanished** - CLP-01, the
 * reassociation key back to the 837's CLM-01, gone with no warning. Nothing
 * vanishes here and nothing is mis-*read*: the library renders faithfully what
 * a JS/JSON caller handed it. The exposure is float noise reaching the wire.
 * Keeping that distinction is the point; flattening both into "a numeric value
 * defect" would have made `#60` look like it shipped a known clinical-safety
 * hole, and it did not.
 *
 * ## Why the source scan and not a count
 *
 * Three drafts of `#60` published an exhaustive counted census of the slots
 * that bypass `esc`, and adversarial review measured all three false - the last
 * one because the regex it asserted was same-line only, and `build-837` reads
 * `const units = line.units.toString()` on one line and `ctx.esc(units)` on
 * another. So this file does not count slots. It asserts, per module, that
 * **no `.toString()` on a spec field reaches an element except through
 * `escDec` / `decStr`** - a statement one more slot cannot falsify, because one
 * more slot still has to go through one of them.
 *
 * ## Limits, written down rather than claimed away
 *
 * 1. **The scan is syntactic**, keyed on the `escDec` / `decStr` shape the six
 *    modules use. A module that inlined `requireCallerDecimal` under another
 *    name would not be seen. It is a strong tripwire for the shape this library
 *    uses, not a proof - the same honesty the sibling gates carry.
 * 2. **`instanceof` is the test.** An object built with
 *    `Object.create(X12Decimal.prototype)` passes it and then throws
 *    `X12Decimal`'s own tampering `TypeError` from `state()`. Loud, not silent,
 *    and pinned below so it cannot quietly become silent.
 * 3. **It says nothing about whether a real `X12Decimal` carries the right
 *    SCALE.** `X12Decimal.fromString("0.3")` and `fromString("0.30")` are both
 *    accepted and both emit verbatim; choosing between them is the caller's,
 *    and the balance checks in `src/transactions/remit/balance.ts` are what
 *    catch a wrong one.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { requireCallerDecimal } from "../src/builder/caller-decimal.js";
import {
  build271,
  build277,
  build820,
  build834,
  build835,
  build837P,
  Claim837BuildError,
  ClaimStatus277BuildError,
  Eligibility271BuildError,
  Enrollment834BuildError,
  Premium820BuildError,
  Remit835BuildError,
  serializeX12,
  X12Decimal,
} from "../src/index.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** The six builder modules that emit an `X12Decimal`. Re-derived, not listed. */
const DECIMAL_MODULES = [
  join("transactions", "claim", "build-837.ts"),
  join("transactions", "remit", "build-835.ts"),
  join("transactions", "premium", "build-820.ts"),
  join("transactions", "status", "build-277.ts"),
  join("transactions", "eligibility", "build-271.ts"),
  join("transactions", "enrollment", "build-834.ts"),
] as const;

/** Every `build-*.ts` under `src/`, excluding the type and error side-files. */
function builderModules(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/^build-.*\.ts$/u.test(entry.name) && !/-(types|errors)\.ts$/u.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(SRC);
  return out.sort();
}

/** Source with block and line comments stripped, so prose cannot satisfy a scan. */
function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/[^\n]*/gu, "");
}

/**
 * Every `.toString()` read in a module that is NOT inside its own `escDec` /
 * `decStr` declaration - i.e. every place a spec field's lexical form could
 * still reach an element without a type check.
 */
function ungatedToStringReads(file: string): string[] {
  const src = code(file)
    // Drop the two declarations themselves; what they contain is the point.
    .replace(/function (escDec|decStr)\([\s\S]*?\n\}/gu, "");
  return src
    .split("\n")
    .filter((line) => /\.toString\(\)/u.test(line))
    .map((line) => line.trim());
}

const dec = (v: string): X12Decimal => {
  const d = X12Decimal.fromString(v);
  if (d === undefined) throw new Error(`bad fixture ${v}`);
  return d;
};

/** A JS/JSON caller who defeated their own type checker. */
const asJsCaller = <T>(spec: unknown): T => spec as T;

const ENVELOPE = {
  senderId: "MEDICARE",
  receiverId: "SUBMITTER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

// ---------------------------------------------------------------------------
// The source gate.
// ---------------------------------------------------------------------------

describe("builder decimal emission: the source gate", () => {
  const modules = builderModules();

  it("declares escDec in exactly the modules that emit an X12Decimal", () => {
    const declaring = modules
      .filter((m) => /function escDec\(/u.test(code(m)))
      .map((m) => m.slice(SRC.length + 1));
    expect(declaring.sort()).toEqual([...DECIMAL_MODULES].sort());
  });

  it("builds every one of them on requireCallerDecimal", () => {
    // `escDec` in five modules calls it directly; `build-837`'s goes through
    // its own `decStr`, which does. A module that reimplemented the check
    // inline - or skipped it - is a finding.
    const findings = modules
      .filter((m) => /function escDec\(/u.test(code(m)))
      .filter((m) => !/requireCallerDecimal\(/u.test(code(m)))
      .map((m) => m.slice(SRC.length + 1));
    expect(findings).toEqual([]);
  });

  it("leaves no .toString() read outside escDec or decStr", () => {
    // The assertion the three refuted census drafts should have been. It does
    // not count slots, so finding one more slot does not falsify it: one more
    // slot still has to route through one of the two declarations, and if it
    // does not, it shows up here by name.
    const findings = modules.flatMap((m) =>
      ungatedToStringReads(m).map((line) => `${m.slice(SRC.length + 1)} -> ${line}`),
    );
    expect(findings).toEqual([]);
  });

  it("would flag the base shape, which is the negative control", () => {
    // The gate is only worth its lines if it fails on the defect. These are the
    // three exact shapes `build-837` carried at base commit `15abbd4`.
    const base = [
      "ctx.esc(claim.totalCharge.toString()),",
      "const units = line.units === undefined ? '0' : line.units.toString();",
      "hi.monetaryAmount === undefined ? '' : hi.monetaryAmount.toString(),",
    ];
    for (const line of base) expect(/\.toString\(\)/u.test(line)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The chokepoint itself.
// ---------------------------------------------------------------------------

describe("requireCallerDecimal", () => {
  const refuse = (message: string): never => {
    throw new Error(message);
  };

  it("passes a real X12Decimal straight through, by identity", () => {
    const value = dec("450.00");
    expect(requireCallerDecimal(value, "buildX", refuse)).toBe(value);
    expect(requireCallerDecimal(X12Decimal.ZERO, "buildX", refuse)).toBe(X12Decimal.ZERO);
    expect(requireCallerDecimal(X12Decimal.fromBigInt(5000n, 2), "buildX", refuse).toString()).toBe(
      "50.00",
    );
  });

  it("refuses every non-decimal a JSON or JS caller can produce", () => {
    // `renderCallerValue` always quotes what it echoes, so the number arm reads
    // `a number ("1")` and not `a number (1)`. Kept verbatim rather than
    // loosened to a regex: the quoting is what bounds a 120,000-character
    // `toString`, and a change to it should red this.
    const cases: readonly [unknown, string][] = [
      [1, 'a number ("1")'],
      [0.1 + 0.2, 'a number ("0.30000000000000004")'],
      [1e21, 'a number ("1e+21")'],
      [Number.NaN, 'a number ("NaN")'],
      ["450.00", 'a string ("450.00")'],
      [null, "null"],
      [undefined, "undefined"],
      [true, 'a boolean ("true")'],
      [[], "an array"],
      [{}, "an object"],
      [(): void => undefined, "a function"],
      [10n, 'a bigint ("10")'],
    ];
    for (const [value, described] of cases) {
      expect(() => requireCallerDecimal(value as X12Decimal, "buildX", refuse)).toThrow(
        `buildX: every numeric element value must be an X12Decimal, but received ${described}.`,
      );
    }
  });

  it("says WHY it does not round, because the caller has to make that call", () => {
    // Rounding `0.1 + 0.2` to `0.30` guesses cents and to `0.3` guesses tenths.
    // Guessing the scale of a monetary amount is what X12Decimal exists to
    // prevent, so the message has to name the choice rather than just refuse.
    expect(() => requireCallerDecimal(0.3 as unknown as X12Decimal, "buildX", refuse)).toThrow(
      /never coerced[\s\S]*guess a scale the caller never stated[\s\S]*X12Decimal\.fromString\(\)/u,
    );
  });

  it("never runs a hostile toString or Symbol.toStringTag", () => {
    // Same reasoning as `caller-string.ts`: `Object.prototype.toString` reads
    // `Symbol.toStringTag`, and `String(value)` runs a caller-supplied
    // `toString`. Neither is worth running to name a type that is wrong.
    let ran = false;
    const hostile = {
      [Symbol.toStringTag]: "Z".repeat(120_000),
      toString(): string {
        ran = true;
        return "Z".repeat(120_000);
      },
    };
    expect(() => requireCallerDecimal(hostile as unknown as X12Decimal, "buildX", refuse)).toThrow(
      "buildX: every numeric element value must be an X12Decimal, but received an object.",
    );
    expect(ran).toBe(false);
  });

  it("admits a forged prototype and then throws LOUDLY, which is limit 2", () => {
    // `instanceof` is the test, so this passes the guard - and then X12Decimal's
    // own `state()` refuses it. Pinned so it cannot quietly become silent.
    const forged = Object.create(X12Decimal.prototype) as X12Decimal;
    expect(requireCallerDecimal(forged, "buildX", refuse)).toBe(forged);
    expect(() => forged.toString()).toThrow(TypeError);
    expect(() => forged.toString()).toThrow(/no internal state/u);
  });
});

// ---------------------------------------------------------------------------
// The behavioural half: one numeric slot per builder that emits a decimal.
// ---------------------------------------------------------------------------

describe("every builder that emits an X12Decimal refuses a raw number", () => {
  // One slot each, not a sweep - the source scan above is what covers the rest.
  // Each fixture is the minimum spec that builder accepts.
  const drift = 0.1 + 0.2;

  it("build835 refuses a numeric CLP-05 (patientResponsibilityAmount)", () => {
    expect(() =>
      build835(
        asJsCaller({
          envelope: ENVELOPE,
          payment: {
            transactionHandlingCode: "I",
            totalActualPayment: dec("450.00"),
            creditDebitFlag: "C",
            paymentMethodCode: "ACH",
            senderAccountNumber: "ACCT",
            senderId: "PAYER01",
            receiverAccountNumber: "RCVR",
            effectiveDate: "20260601",
          },
          payer: { name: "PAYER ONE" },
          payee: { name: "BILLING CLINIC INC", idQualifier: "XX", idCode: "1234567890" },
          claims: [
            {
              patientControlNumber: "PT-ACCT-001",
              statusCode: "1",
              totalChargeAmount: dec("500.00"),
              totalPaymentAmount: dec("450.00"),
              patientResponsibilityAmount: drift,
              claimFilingIndicator: "MB",
              patient: { lastName: "DOE", firstName: "JANE", idQualifier: "MI", idCode: "MBR0001" },
            },
          ],
        }),
      ),
    ).toThrow(Remit835BuildError);
  });

  it("build837P refuses a numeric CLM-02 (totalCharge)", () => {
    expect(() =>
      build837P(
        asJsCaller({
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
                  info: { payerResponsibilityCode: "P", claimFilingIndicator: "MB" },
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
                      totalCharge: drift,
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
    ).toThrow(Claim837BuildError);
  });

  it("build820 refuses a numeric BPR-02 (totalPremiumAmount)", () => {
    expect(() =>
      build820(
        asJsCaller({
          envelope: ENVELOPE,
          payment: {
            transactionHandlingCode: "I",
            totalPremiumAmount: drift,
            creditDebitFlag: "C",
            method: "ACH",
            paymentFormatCode: "CTX",
            paymentDate: "20260601",
          },
          traces: [
            { traceTypeCode: "1", referenceId: "PREM-202606", originatingCompanyId: "1512345678" },
          ],
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
        }),
      ),
    ).toThrow(Premium820BuildError);
  });

  it("build834 refuses a numeric AMT-02 (member amount)", () => {
    expect(() =>
      build834(
        asJsCaller({
          envelope: ENVELOPE,
          header: {
            transactionSetPurposeCode: "00",
            referenceId: "FILE-202606",
            date: "20260601",
            sponsor: {
              entityIdentifierCode: "P5",
              name: "EMPLOYER CO",
              idQualifier: "FI",
              idCode: "FEIN123",
            },
            payer: {
              entityIdentifierCode: "IN",
              name: "MEDPAY INSURANCE",
              idQualifier: "FI",
              idCode: "FEIN999",
            },
          },
          members: [
            {
              maintenanceTypeCode: "021",
              member: {
                lastName: "DOE",
                firstName: "JANE",
                idQualifier: "34",
                idCode: "MBR0001",
              },
              healthCoverages: [
                {
                  maintenanceTypeCode: "021",
                  insuranceLineCode: "HLT",
                  amounts: [{ qualifier: "P3", amount: drift }],
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow(Enrollment834BuildError);
  });

  it("build271 refuses a numeric EB-07 (benefit monetaryAmount)", () => {
    expect(() =>
      build271(
        asJsCaller({
          envelope: ENVELOPE,
          header: { referenceId: "ELIG-202606" },
          informationSource: {
            entityIdentifierCode: "PR",
            entityTypeQualifier: "2",
            name: "PAYER ONE",
            idQualifier: "PI",
            idCode: "PAYER01",
          },
          informationReceiver: {
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
            benefits: [{ eligibilityCode: "1", serviceTypeCodes: ["30"], monetaryAmount: drift }],
          },
        }),
      ),
    ).toThrow(Eligibility271BuildError);
  });

  it("build277 refuses a numeric STC-04 (totalChargeAmount)", () => {
    expect(() =>
      build277(
        asJsCaller({
          envelope: ENVELOPE,
          header: { referenceId: "STAT-202606" },
          informationSource: { name: "PAYER ONE", idQualifier: "PI", idCode: "PAYER01" },
          informationReceiver: { name: "RENDERING CLINIC", idQualifier: "46", idCode: "REC001" },
          providers: [
            {
              provider: { name: "BILLING CLINIC INC", idQualifier: "XX", idCode: "1234567890" },
              patients: [
                {
                  patient: {
                    lastName: "DOE",
                    firstName: "JANE",
                    idQualifier: "MI",
                    idCode: "MBR0001",
                  },
                  claims: [
                    {
                      claimId: "PT-ACCT-001",
                      statuses: [
                        {
                          categoryCode: "F1",
                          statusCode: "1",
                          entityCode: "PR",
                          totalChargeAmount: drift,
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
    ).toThrow(ClaimStatus277BuildError);
  });
});

describe("a real X12Decimal is unaffected, which is the regression half", () => {
  it("still emits the verbatim lexical form the caller supplied", () => {
    // `escDec` escapes through the builder's own `esc`, and a decimal's raw form
    // cannot contain an active delimiter, so the escape is a no-op on every
    // legal value. Asserted rather than assumed: a leading zero and a trailing
    // zero both survive byte-exact, which is the property `X12Decimal` exists
    // for and which `String(number)` would have destroyed.
    const ix = build820({
      envelope: ENVELOPE,
      payment: {
        transactionHandlingCode: "I",
        totalPremiumAmount: dec("0250.00"),
        creditDebitFlag: "C",
        method: "ACH",
        paymentFormatCode: "CTX",
        paymentDate: "20260601",
      },
      traces: [
        { traceTypeCode: "1", referenceId: "PREM-202606", originatingCompanyId: "1512345678" },
      ],
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
          openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: dec("0250.00") }],
        },
      ],
    });
    expect(serializeX12(ix)).toContain("BPR*I*0250.00*C*ACH");
    expect(ix.warnings).toHaveLength(0);
  });
});

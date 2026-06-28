/**
 * Unit tests for the 005010X220A1 834 emit surface — `build834`. Covers:
 *
 * - Happy path: an enrollment round-trips through `get834Header` +
 *   `get834Enrollments` (an `AsyncIterable`, driven with `for await`)
 *   field-for-field with zero warnings — BGN header, sponsor (`N1*P5`) +
 *   payer (`N1*IN`), and per-member INS + NM1/DMG/N3/N4 + REF + DTP + COB +
 *   Loop 2300 HD/DTP/AMT.
 * - Maintenance-type fidelity (the 834's safety primitive): INS-03 and
 *   HD-01 are emitted VERBATIM and round-trip byte-for-byte, with the
 *   bundled description looked up by the reader.
 * - Maintenance refusals: an unknown INS-03 / HD-01 code →
 *   `X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE`; an empty INS-03 / no member /
 *   an over-long control number → `X12_834_BUILD_INVALID_SPEC`.
 * - Envelope identity: GS-01 `BE`, ST-01 `834`, ST-03 `005010X220A1`.
 * - Pure-function discipline: returns a frozen interchange.
 * - PHI safety: a thrown error's message carries indices / counts (and the
 *   non-PHI maintenance control code) only — no member id / name.
 */

import { describe, expect, it } from "vitest";

import {
  build834,
  ENROLLMENT_834_BUILD_ERROR_CODES,
  Enrollment834BuildError,
  get834Enrollments,
  get834Header,
  X12Decimal,
  type Build834Spec,
  type X12Enrollment,
  type X12Interchange,
} from "../src/index.js";

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

async function membersOf(ix: X12Interchange): Promise<X12Enrollment[]> {
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("built interchange has no transaction");
  const out: X12Enrollment[] = [];
  for await (const member of get834Enrollments(ix.delimiters, tx)) out.push(member);
  return out;
}

const ENVELOPE = {
  senderId: "EMPLOYERCO",
  receiverId: "MEDPAY",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

// A canonical enrollment file: original full file, one subscriber addition
// with a health coverage, one dependent termination.
const CANONICAL_SPEC: Build834Spec = {
  envelope: ENVELOPE,
  header: {
    transactionSetPurposeCode: "00",
    referenceId: "FILE-202606",
    date: "20260601",
    time: "1200",
    actionCode: "2",
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
    references: [{ qualifier: "38", value: "MASTER-POL-1" }],
    dates: [{ qualifier: "007", value: "20260601" }],
  },
  members: [
    {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021",
      maintenanceReasonCode: "AI",
      benefitStatusCode: "A",
      employmentStatusCode: "FT",
      member: {
        lastName: "DOE",
        firstName: "JANE",
        middleName: "Q",
        idQualifier: "34",
        idCode: "MBR0001",
        dateOfBirth: "19850515",
        genderCode: "F",
        address: { lines: ["100 MAIN ST"], city: "COLUMBUS", state: "OH", postalCode: "43004" },
      },
      references: [{ qualifier: "0F", value: "MBR0001" }],
      dates: [{ qualifier: "356", value: "20260101" }],
      coordinationOfBenefits: [
        { payerResponsibility: "S", referenceId: "OTHERGRP-1", coordinationOfBenefitsCode: "1" },
      ],
      healthCoverages: [
        {
          maintenanceTypeCode: "021",
          insuranceLineCode: "HLT",
          planCoverageDescription: "GOLD PPO",
          coverageLevelCode: "FAM",
          dates: [{ qualifier: "348", value: "20260101" }],
          amounts: [{ qualifier: "P3", amount: dec("125.00") }],
        },
      ],
    },
    {
      subscriberIndicator: "N",
      relationshipCode: "19",
      maintenanceTypeCode: "024",
      member: { lastName: "DOE", firstName: "JIMMY", idQualifier: "34", idCode: "MBR0001-01" },
      dates: [{ qualifier: "357", value: "20260531" }],
    },
  ],
};

describe("build834 — envelope identity", () => {
  it("emits GS-01 BE, ST-01 834, ST-03 005010X220A1", () => {
    const ix = build834(CANONICAL_SPEC);
    expect(ix.groups).toHaveLength(1);
    expect(ix.groups[0]?.gs.elements[1]).toBe("BE");
    const tx = ix.groups[0]?.transactions[0];
    expect(tx?.st.elements[1]).toBe("834");
    expect(tx?.st.elements[3]).toBe("005010X220A1");
  });

  it("returns a frozen interchange with no parse warnings", () => {
    const ix = build834(CANONICAL_SPEC);
    expect(Object.isFrozen(ix)).toBe(true);
    expect(ix.warnings).toHaveLength(0);
  });
});

describe("build834 → get834Header round-trip", () => {
  it("reproduces the BGN header and sponsor / payer parties", () => {
    const ix = build834(CANONICAL_SPEC);
    const tx = ix.groups[0]?.transactions[0];
    const header = tx === undefined ? undefined : get834Header(ix.delimiters, tx);
    expect(header?.transactionSetPurposeCode).toBe("00");
    expect(header?.referenceId).toBe("FILE-202606");
    expect(header?.date).toBe("20260601");
    expect(header?.time).toBe("1200");
    expect(header?.actionCode).toBe("2");
    expect(header?.sponsor?.name).toBe("EMPLOYER CO");
    expect(header?.sponsor?.idCode).toBe("FEIN123");
    expect(header?.payer?.name).toBe("MEDPAY INSURANCE");
    expect(header?.references[0]?.value).toBe("MASTER-POL-1");
    expect(header?.dates[0]?.qualifier).toBe("007");
  });
});

describe("build834 → get834Enrollments round-trip", () => {
  it("streams one member per INS loop with member identity and coverage", async () => {
    const members = await membersOf(build834(CANONICAL_SPEC));
    expect(members).toHaveLength(2);

    const subscriber = members[0];
    expect(subscriber?.subscriberIndicator).toBe("Y");
    expect(subscriber?.relationshipCode).toBe("18");
    expect(subscriber?.maintenanceTypeCode).toBe("021");
    expect(subscriber?.maintenanceTypeDescription).toBe("Addition");
    expect(subscriber?.benefitStatusCode).toBe("A");
    expect(subscriber?.employmentStatusCode).toBe("FT");
    expect(subscriber?.member?.lastName).toBe("DOE");
    expect(subscriber?.member?.firstName).toBe("JANE");
    expect(subscriber?.member?.idCode).toBe("MBR0001");
    expect(subscriber?.member?.dateOfBirth).toBe("19850515");
    expect(subscriber?.member?.genderCode).toBe("F");
    expect(subscriber?.member?.address?.lines).toEqual(["100 MAIN ST"]);
    expect(subscriber?.member?.address?.city).toBe("COLUMBUS");
    // Member DTPs must precede the first HD so they bind to the member.
    expect(subscriber?.references[0]?.value).toBe("MBR0001");
    expect(subscriber?.dates[0]?.qualifier).toBe("356");
    expect(subscriber?.dates[0]?.value).toBe("20260101");
    expect(subscriber?.coordinationOfBenefits[0]?.payerResponsibility).toBe("S");

    expect(subscriber?.healthCoverages).toHaveLength(1);
    const coverage = subscriber?.healthCoverages[0];
    expect(coverage?.maintenanceTypeCode).toBe("021");
    expect(coverage?.insuranceLineCode).toBe("HLT");
    expect(coverage?.planCoverageDescription).toBe("GOLD PPO");
    expect(coverage?.coverageLevelCode).toBe("FAM");
    expect(coverage?.dates[0]?.qualifier).toBe("348");
    expect(coverage?.amounts[0]?.qualifier).toBe("P3");
    expect(coverage?.amounts[0]?.amount.toString()).toBe("125.00");

    expect(subscriber?.warnings).toHaveLength(0);
  });

  it("preserves the dependent termination's maintenance type verbatim", async () => {
    const members = await membersOf(build834(CANONICAL_SPEC));
    const dependent = members[1];
    expect(dependent?.subscriberIndicator).toBe("N");
    expect(dependent?.maintenanceTypeCode).toBe("024");
    expect(dependent?.maintenanceTypeDescription).toBe("Cancellation or Termination");
    expect(dependent?.member?.firstName).toBe("JIMMY");
    expect(dependent?.dates[0]?.qualifier).toBe("357");
    expect(dependent?.warnings).toHaveLength(0);
  });
});

describe("build834 — maintenance-type refusals", () => {
  it("refuses an unknown INS-03 maintenance type code", () => {
    const spec: Build834Spec = {
      ...CANONICAL_SPEC,
      members: [{ maintenanceTypeCode: "999", member: { lastName: "DOE" } }],
    };
    expect(() => build834(spec)).toThrow(Enrollment834BuildError);
    try {
      build834(spec);
    } catch (err) {
      expect((err as Enrollment834BuildError).code).toBe(
        ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE,
      );
    }
  });

  it("refuses an unknown HD-01 coverage maintenance type code", () => {
    const spec: Build834Spec = {
      ...CANONICAL_SPEC,
      members: [
        {
          maintenanceTypeCode: "021",
          member: { lastName: "DOE" },
          healthCoverages: [{ maintenanceTypeCode: "999", insuranceLineCode: "HLT" }],
        },
      ],
    };
    expect(() => build834(spec)).toThrow(Enrollment834BuildError);
    try {
      build834(spec);
    } catch (err) {
      expect((err as Enrollment834BuildError).code).toBe(
        ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE,
      );
    }
  });

  it("refuses an empty (required) INS-03 maintenance type code", () => {
    const spec: Build834Spec = {
      ...CANONICAL_SPEC,
      members: [{ maintenanceTypeCode: "", member: { lastName: "DOE" } }],
    };
    expect(() => build834(spec)).toThrow(Enrollment834BuildError);
    try {
      build834(spec);
    } catch (err) {
      expect((err as Enrollment834BuildError).code).toBe(
        ENROLLMENT_834_BUILD_ERROR_CODES.X12_834_BUILD_INVALID_SPEC,
      );
    }
  });

  it("refuses a spec with no member loop", () => {
    const spec: Build834Spec = { ...CANONICAL_SPEC, members: [] };
    expect(() => build834(spec)).toThrow(Enrollment834BuildError);
  });

  it("refuses an over-long interchange control number", () => {
    const spec: Build834Spec = {
      ...CANONICAL_SPEC,
      envelope: { ...ENVELOPE, interchangeControlNumber: "0000000001" },
    };
    expect(() => build834(spec)).toThrow(Enrollment834BuildError);
  });
});

describe("build834 — PHI safety", () => {
  it("an unknown-maintenance error names the control code but no member id / name", () => {
    const spec: Build834Spec = {
      ...CANONICAL_SPEC,
      members: [
        { maintenanceTypeCode: "999", member: { lastName: "SECRETNAME", idCode: "MBR-SECRET" } },
      ],
    };
    try {
      build834(spec);
      throw new Error("expected build834 to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Enrollment834BuildError);
      const message = (err as Enrollment834BuildError).message;
      // The maintenance code is an X12 control code (not PHI) — it IS named.
      expect(message).toContain("999");
      // The member id / name are PHI — they are NEVER named.
      expect(message).not.toContain("MBR-SECRET");
      expect(message).not.toContain("SECRETNAME");
    }
  });
});

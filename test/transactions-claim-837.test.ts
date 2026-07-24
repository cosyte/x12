/**
 * Unit tests for the Phase 5 837 claim surface (`get837Claims`). Covers:
 *
 * - All three Tier-1 spec-clean variants (837P / 837I / 837D): end-to-end
 *   extraction including envelope-derived variant resolution from the
 *   ST-03 implementation-convention reference.
 * - Variant-specific service-line shapes: SV1 procedure / modifiers /
 *   diagnosis pointers (P); SV2 revenue + procedure (I); SV3 +
 *   per-line TOO tooth info (D).
 * - HL parent-pointer integrity: a parent id that does not match an
 *   earlier HL emits `X12_HL_PARENT_MISMATCH` (Tier-2 quirk fixture);
 *   the parser NEVER silently re-numbers - the verbatim parent id is
 *   preserved on the hierarchy entry.
 * - Patient HL (Loop 2000C) when patient ≠ subscriber: the walker pairs
 *   the patient NM1*QC with its enclosing HL and routes downstream
 *   claims to the patient (not the subscriber).
 * - HI qualifier resolution: an unknown qualifier emits
 *   `X12_UNKNOWN_HI_QUALIFIER`, the verbatim qualifier + code are
 *   preserved, codeSystem resolves to `"unknown"`.
 * - X12Decimal: monetary fields decode as decimal not float.
 * - The dogfooded loop specs (Loop 2000A → Loop 2300 → Loop 2400) are
 *   public artifacts authored through `defineLoopSpec`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CLAIM_837D_LOOP_2300,
  CLAIM_837D_LOOP_2400,
  CLAIM_837I_LOOP_2300,
  CLAIM_837I_LOOP_2400,
  CLAIM_837P_LOOP_2300,
  CLAIM_837P_LOOP_2400,
  HL_LEVEL_CODES,
  WARNING_CODES,
  X12Decimal,
  get837Claims,
  parseX12,
} from "../src/index.js";
import type { X12_837Submission } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "claim");

function readClaimFixture(name: string): X12_837Submission {
  const raw = readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
  if (tx === undefined) throw new Error(`Fixture ${name} has no 837 transaction set`);
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error(`get837Claims returned undefined for ${name}`);
  return sub;
}

describe("get837Claims - Professional Tier-1 (X222A2)", () => {
  it("decodes the canonical 837P fixture end-to-end", () => {
    const sub = readClaimFixture("837p-canonical.edi");
    expect(sub.variant).toBe("P");
    expect(sub.implementationConventionReference).toBe("005010X222A2");
    expect(sub.submitter?.entityIdentifierCode).toBe("41");
    expect(sub.submitter?.name).toBe("SUBMITTER ONE");
    expect(sub.submitter?.contacts[0]?.communications[0]?.value).toBe("5551234567");
    expect(sub.receiver?.entityIdentifierCode).toBe("40");

    expect(sub.hierarchies).toHaveLength(2);
    expect(sub.hierarchies[0]?.levelCode).toBe(HL_LEVEL_CODES.INFORMATION_SOURCE);
    expect(sub.hierarchies[0]?.parentHlId).toBeUndefined();
    expect(sub.hierarchies[1]?.levelCode).toBe(HL_LEVEL_CODES.SUBSCRIBER);
    expect(sub.hierarchies[1]?.parentHlId).toBe("1");

    expect(sub.claims).toHaveLength(1);
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.variant).toBe("P");
    expect(claim.claimId).toBe("PT-ACCT-001");
    expect(claim.totalCharge).toBeInstanceOf(X12Decimal);
    expect(claim.totalCharge.toString()).toBe("150");
    expect(claim.placeOfServiceCode).toBe("11");
    expect(claim.facilityCodeQualifier).toBe("B");
    expect(claim.claimFrequencyCode).toBe("1");
    expect(claim.billingProvider?.name).toBe("BILLING CLINIC INC");
    expect(claim.billingProvider?.idCode).toBe("1234567890");
    expect(claim.billingProvider?.address?.city).toBe("CLEVELAND");
    expect(claim.subscriber?.entity.name).toBe("TEST");
    expect(claim.subscriber?.entity.firstName).toBe("PATIENT");
    expect(claim.subscriber?.info.claimFilingIndicator).toBe("MB");
    expect(claim.subscriber?.info.payerResponsibilityCode).toBe("P");
    expect(claim.payer?.name).toBe("PAYER ONE");
    expect(claim.providers).toHaveLength(1);
    expect(claim.providers[0]?.entityIdentifierCode).toBe("82");

    expect(claim.dates).toContainEqual({
      qualifier: "431",
      formatQualifier: "D8",
      value: "20260520",
    });

    expect(claim.diagnoses).toHaveLength(1);
    const dx = claim.diagnoses[0];
    if (dx === undefined) throw new Error("missing diagnosis");
    expect(dx.qualifier).toBe("ABK");
    expect(dx.codeSystem).toBe("ICD-10-CM");
    expect(dx.category).toBe("principal-diagnosis");
    expect(dx.code).toBe("J20.9");

    expect(claim.serviceLines).toHaveLength(1);
    const sl = claim.serviceLines[0];
    if (sl === undefined || sl.variant !== "P") throw new Error("expected P service line");
    expect(sl.lineNumber).toBe("1");
    expect(sl.procedureQualifier).toBe("HC");
    expect(sl.procedureCode).toBe("99213");
    expect(sl.modifiers).toEqual(["25"]);
    expect(sl.charge.toString()).toBe("150");
    expect(sl.units.toString()).toBe("1");
    expect(sl.diagnosisPointers).toEqual(["1"]);
    expect(sl.dates).toContainEqual({ qualifier: "472", formatQualifier: "D8", value: "20260601" });
    expect(sl.references[0]?.qualifier).toBe("6R");

    expect(sub.warnings.filter((w) => w.code !== WARNING_CODES.X12_PRE_005010)).toHaveLength(0);
  });
});

describe("get837Claims - Institutional Tier-1 (X223A3)", () => {
  it("decodes the canonical 837I fixture with revenue codes + ICD-10-PCS procedure", () => {
    const sub = readClaimFixture("837i-canonical.edi");
    expect(sub.variant).toBe("I");
    expect(sub.implementationConventionReference).toBe("005010X223A3");

    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.variant).toBe("I");
    expect(claim.totalCharge.toString()).toBe("5000");
    expect(claim.placeOfServiceCode).toBe("111");
    expect(claim.facilityCodeQualifier).toBe("A");

    // 4 HI segments → 3 dx (principal + other + admitting), 1 procedure.
    expect(claim.diagnoses).toHaveLength(3);
    expect(claim.diagnoses.map((d) => d.qualifier).sort()).toEqual(["ABF", "ABJ", "ABK"]);
    expect(claim.diagnoses.every((d) => d.codeSystem === "ICD-10-CM")).toBe(true);

    expect(claim.procedures).toHaveLength(1);
    const proc = claim.procedures[0];
    if (proc === undefined) throw new Error("missing procedure");
    expect(proc.qualifier).toBe("BBR");
    expect(proc.codeSystem).toBe("ICD-10-PCS");
    expect(proc.code).toBe("0BH17EZ");

    expect(claim.dates).toHaveLength(3);

    expect(claim.serviceLines).toHaveLength(2);
    const inpatientLine = claim.serviceLines[0];
    if (inpatientLine === undefined || inpatientLine.variant !== "I") {
      throw new Error("expected I service line 1");
    }
    expect(inpatientLine.revenueCode).toBe("0120");
    expect(inpatientLine.procedureCode).toBe("99221");
    expect(inpatientLine.charge.toString()).toBe("1500");

    const drugLine = claim.serviceLines[1];
    if (drugLine === undefined || drugLine.variant !== "I") {
      throw new Error("expected I service line 2");
    }
    expect(drugLine.revenueCode).toBe("0260");
    expect(drugLine.units.toString()).toBe("100");
  });
});

describe("get837Claims - Dental Tier-1 (X224A2)", () => {
  it("decodes the canonical 837D fixture with TOO tooth info + ADA CDT codes", () => {
    const sub = readClaimFixture("837d-canonical.edi");
    expect(sub.variant).toBe("D");

    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.variant).toBe("D");

    const sl = claim.serviceLines[0];
    if (sl === undefined || sl.variant !== "D") throw new Error("expected D service line");
    expect(sl.procedureQualifier).toBe("AD");
    expect(sl.procedureCode).toBe("D2391");
    expect(sl.placeOfServiceCode).toBe("11");
    expect(sl.oralCavityArea).toEqual(["OC", "MO", "DO"]);
    expect(sl.prosthesisCrownInlayCode).toBe("5");
    expect(sl.toothInformation).toHaveLength(1);
    expect(sl.toothInformation[0]?.qualifier).toBe("JP");
    expect(sl.toothInformation[0]?.toothCode).toBe("14");
    expect(sl.toothInformation[0]?.surfaces).toEqual(["O"]);
  });
});

describe("get837Claims - HL parent-pointer integrity", () => {
  it("emits X12_HL_PARENT_MISMATCH when HL-02 references a nonexistent prior HL; preserves verbatim", () => {
    const sub = readClaimFixture("837p-hl-orphan.edi");
    const orphans = sub.warnings.filter((w) => w.code === WARNING_CODES.X12_HL_PARENT_MISMATCH);
    expect(orphans).toHaveLength(1);
    // The HL hierarchy is preserved verbatim - id "2" still carries parent
    // "9" (the off-by-one bug from the source), NOT silently rewritten to
    // "1".
    expect(sub.hierarchies[1]?.parentHlId).toBe("9");
  });

  it("the HL-orphan claim still extracts (lenient on parse)", () => {
    const sub = readClaimFixture("837p-hl-orphan.edi");
    expect(sub.claims).toHaveLength(1);
    expect(sub.claims[0]?.claimId).toBe("PT-ACCT-004");
  });
});

describe("get837Claims - HI qualifier resolution", () => {
  it("emits X12_UNKNOWN_HI_QUALIFIER for an out-of-snapshot qualifier; verbatim code preserved with codeSystem='unknown'", () => {
    const sub = readClaimFixture("837p-unknown-hi.edi");
    const unknowns = sub.warnings.filter((w) => w.code === WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER);
    expect(unknowns).toHaveLength(1);

    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.otherHi).toHaveLength(1);
    expect(claim.otherHi[0]?.qualifier).toBe("ZZZ");
    expect(claim.otherHi[0]?.code).toBe("CODE123");
    expect(claim.otherHi[0]?.codeSystem).toBe("unknown");
    expect(claim.otherHi[0]?.category).toBe("unknown");

    // The known HI (ABK:J20.9) on the same claim still resolves.
    expect(claim.diagnoses).toHaveLength(1);
    expect(claim.diagnoses[0]?.codeSystem).toBe("ICD-10-CM");
  });
});

describe("get837Claims - Patient HL (Loop 2000C)", () => {
  it("routes a claim under a 23-level Patient HL to the patient member (not the subscriber)", () => {
    const sub = readClaimFixture("837p-with-patient-hl.edi");
    expect(sub.hierarchies).toHaveLength(3);
    expect(sub.hierarchies[2]?.levelCode).toBe(HL_LEVEL_CODES.DEPENDENT);
    expect(sub.hierarchies[2]?.parentHlId).toBe("2");

    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.subscriber?.entity.firstName).toBe("PARENT");
    expect(claim.patient?.entity.firstName).toBe("CHILD");
    expect(claim.patient?.info.individualRelationshipCode).toBe("19");
    expect(claim.hierarchy?.levelCode).toBe(HL_LEVEL_CODES.DEPENDENT);
    expect(
      sub.warnings.filter((w) => w.code === WARNING_CODES.X12_HL_PARENT_MISMATCH),
    ).toHaveLength(0);
    expect(
      sub.warnings.filter((w) => w.code === WARNING_CODES.X12_HL_PARENT_LEVEL_INVALID),
    ).toHaveLength(0);
  });
});

describe("get837Claims - variant resolution", () => {
  it("respects an explicit opts.type override", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "837p-canonical.edi"), "utf8").trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no tx");
    const sub = get837Claims(ix.delimiters, tx, { type: "I" });
    expect(sub?.variant).toBe("I");
  });

  it("returns undefined for a non-837 transaction (mis-routed call)", () => {
    const raw = readFileSync(
      join(__dirname, "fixtures", "remit", "835-medicare-canonical.edi"),
      "utf8",
    ).trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no tx");
    expect(get837Claims(ix.delimiters, tx)).toBeUndefined();
  });
});

describe("public surface - dogfooded loop specs", () => {
  it("Loop 2300 → Loop 2400 nesting is wired for every variant", () => {
    expect(CLAIM_837P_LOOP_2300.trigger).toBe("CLM");
    expect(CLAIM_837P_LOOP_2300.children).toContain(CLAIM_837P_LOOP_2400);
    expect(CLAIM_837I_LOOP_2300.children).toContain(CLAIM_837I_LOOP_2400);
    expect(CLAIM_837D_LOOP_2300.children).toContain(CLAIM_837D_LOOP_2400);
  });

  it("Loop 2400 trigger is LX across all three variants", () => {
    expect(CLAIM_837P_LOOP_2400.trigger).toBe("LX");
    expect(CLAIM_837I_LOOP_2400.trigger).toBe("LX");
    expect(CLAIM_837D_LOOP_2400.trigger).toBe("LX");
  });
});

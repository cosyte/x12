/**
 * Coverage-driven exercises for the 837 claim walker. The Tier-1 unit
 * tests in `transactions-claim-837.test.ts` cover the happy paths; this
 * suite drives the long tail of branches that the walker carries:
 *
 * - 837P: pay-to-address (NM1*87) → address-line + city accumulation;
 *   subscriber REF + DMG + PER; billing-provider PER; second SBR/IL/PR
 *   trio in Loop 2320 (Other Subscriber); per-line NTE + AMT + REF + NM1
 *   line-level provider; LIN + CTP drug; SVD + CAS + DTP line
 *   adjudication.
 * - 837I: pay-to-plan (NM1*PE) - institutional-only Loop 2010AC.
 * - Variant-fallback: an ST-03 implementation-convention reference outside
 *   the bundled snapshot emits `X12_837_UNKNOWN_VARIANT` and the walker
 *   still extracts what it can.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { WARNING_CODES, X12Decimal, get837Claims, parseX12 } from "../src/index.js";
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

describe("get837Claims - comprehensive 837P (every walker branch)", () => {
  it("decodes pay-to-address (NM1*87) onto the claim.payToAddress field", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.payToAddress?.lines[0]).toBe("PO BOX 100");
    expect(claim.payToAddress?.postalCode).toBe("44114");
  });

  it("accumulates submitter PER + N3/N4/REF on the activeEntity routes", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    expect(sub.submitter?.address?.lines).toContain("1 SUBMITTER ST");
    expect(sub.submitter?.address?.city).toBe("CLEVELAND");
    expect(sub.submitter?.references[0]?.qualifier).toBe("EI");
    expect(sub.receiver?.contacts[0]?.contactFunctionCode).toBe("IC");
    expect(sub.receiver?.references[0]?.qualifier).toBe("2U");
  });

  it("decodes subscriber DMG + REF + PER + billing-provider PER", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.subscriber?.entity.references[0]?.qualifier).toBe("SY");
    expect(claim.billingProvider?.contacts[0]?.contactFunctionCode).toBe("IC");
    expect(claim.billingProvider?.contacts[0]?.communications).toHaveLength(2);
    expect(claim.billingProvider?.address?.countryCode).toBe("USA");
    expect(claim.payer?.contacts[0]?.contactFunctionCode).toBe("IC");
    expect(claim.payer?.references[0]?.qualifier).toBe("2U");
  });

  it("captures NTE / AMT / multiple DTP / multiple HI on the claim header", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.notes.find((n) => n.noteReferenceCode === "ADD")?.description).toBe(
      "ADDITIONAL CLAIM NARRATIVE",
    );
    expect(claim.amounts).toContainEqual({ qualifier: "F5", amount: X12Decimal.fromString("25") });
    expect(claim.references.find((r) => r.qualifier === "G1")?.value).toBe("PRIOR-AUTH-12345");
    expect(claim.dates).toHaveLength(2);
    expect(claim.diagnoses).toHaveLength(3);
    expect(claim.diagnoses.find((d) => d.qualifier === "APR")?.codeSystem).toBe("ICD-10-CM");
  });

  it("captures Loop 2310 rendering + referring providers on claim.providers", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.providers).toHaveLength(2);
    expect(claim.providers.map((p) => p.entityIdentifierCode)).toEqual(["82", "DN"]);
  });

  it("captures Loop 2320 other-subscriber + other-payer (COB)", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.otherSubscribers).toHaveLength(1);
    expect(claim.otherSubscribers[0]?.payerResponsibilityCode).toBe("S");
    expect(claim.otherSubscribers[0]?.otherSubscriber?.name).toBe("OTHER");
    expect(claim.otherSubscribers[0]?.otherPayer?.name).toBe("SECONDARY PAYER");
  });

  it("captures service-line NTE / AMT / REF / line-level provider (Loop 2420)", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    const line = claim.serviceLines[0];
    if (line === undefined || line.variant !== "P") throw new Error("expected P line 1");
    expect(line.notes[0]?.description).toBe("LINE NOTE");
    expect(line.amounts[0]?.qualifier).toBe("AAE");
    expect(line.references.find((r) => r.qualifier === "6R")?.value).toBe("LINE-CTRL-001");
    expect(line.providers).toHaveLength(1);
    expect(line.providers[0]?.entityIdentifierCode).toBe("82");
    expect(line.diagnosisPointers).toEqual(["1", "2"]);
  });

  it("decodes LIN + CTP drug surface (Loop 2410)", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    const line = sub.claims[0]?.serviceLines[0];
    if (line === undefined || line.variant !== "P") throw new Error("expected P line 1");
    expect(line.drug?.qualifier).toBe("N4");
    expect(line.drug?.code).toBe("00378010401");
    expect(line.drug?.quantity?.toString()).toBe("1.5");
    expect(line.drug?.unitOfMeasure).toBe("ML");
  });

  it("decodes SVD + CAS + DTP line adjudication surface (Loop 2430)", () => {
    const sub = readClaimFixture("837p-comprehensive.edi");
    const line = sub.claims[0]?.serviceLines[0];
    if (line === undefined || line.variant !== "P") throw new Error("expected P line 1");
    expect(line.adjudications).toHaveLength(1);
    const adj = line.adjudications[0];
    if (adj === undefined) throw new Error("missing adjudication");
    expect(adj.otherPayerId).toBe("PAYER99");
    expect(adj.amountPaid.toString()).toBe("50");
    expect(adj.procedureCode).toBe("99213");
    expect(adj.dateAdjudicated).toBe("20260520");
    expect(adj.adjustments).toHaveLength(1);
    expect(adj.adjustments[0]?.groupCode).toBe("CO");
    expect(adj.adjustments[0]?.reasonCode).toBe("45");
  });
});

describe("get837Claims - institutional pay-to-plan (NM1*PE)", () => {
  it("decodes Loop 2010AC pay-to-plan onto claim.payToPlan", () => {
    const sub = readClaimFixture("837i-pay-to-plan.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.payToPlan?.name).toBe("PAY TO PLAN NAME");
    expect(claim.payToPlan?.idCode).toBe("PLAN-ID-001");
    expect(claim.payToPlan?.address?.lines).toContain("100 PAYMENT PROCESSING");
    expect(claim.payToPlan?.address?.city).toBe("COLUMBUS");
  });
});

describe("get837Claims - edge cases (empty optionals, unknown HL levels, subscriber-is-patient)", () => {
  it("PAT inside subscriber HL merges relationship onto subscriber info (patient = subscriber)", () => {
    const sub = readClaimFixture("837p-edge-cases.edi");
    const patientClaim = sub.claims.find((c) => c.claimId === "PT-ACCT-010");
    if (patientClaim === undefined) throw new Error("missing patient claim");
    // The subscriber's PAT*01 (spouse) merges onto pendingSubscriberInfo
    // and ships on the subscriber when the patient HL also opens; the
    // Patient HL's own PAT*19 (child) ships on the patient member.
    expect(patientClaim.subscriber?.info.individualRelationshipCode).toBe("01");
    expect(patientClaim.patient?.info.individualRelationshipCode).toBe("19");
  });

  it("HI segment with NUBC monetary + quantity components decodes both as X12Decimal", () => {
    const sub = readClaimFixture("837p-edge-cases.edi");
    const orphanClaim = sub.claims.find((c) => c.claimId === "PT-ACCT-010B");
    if (orphanClaim === undefined) throw new Error("missing orphan claim");
    const valueCode = orphanClaim.otherHi.find((h) => h.qualifier === "BE");
    expect(valueCode?.monetaryAmount?.toString()).toBe("500");
    expect(valueCode?.quantity?.toString()).toBe("1");
    expect(valueCode?.codeSystem).toBe("NUBC-VALUE");
  });

  it("HL with subscriber (22) level + no parent at all emits X12_HL_PARENT_MISMATCH", () => {
    const sub = readClaimFixture("837p-edge-cases.edi");
    const orphanSub = sub.hierarchies.find((h) => h.hlId === "7");
    expect(orphanSub?.parentHlId).toBeUndefined();
    expect(sub.warnings.some((w) => w.code === WARNING_CODES.X12_HL_PARENT_MISMATCH)).toBe(true);
  });

  it("HL with an unknown level code (e.g. 21 Information Receiver, no expected parent) does not warn", () => {
    const sub = readClaimFixture("837p-edge-cases.edi");
    const informationReceiver = sub.hierarchies.find((h) => h.levelCode === "21");
    expect(informationReceiver).toBeDefined();
    // No HL_PARENT_LEVEL_INVALID for unknown levels - only known levels
    // assert an expected parent.
    expect(
      sub.warnings.filter((w) => w.code === WARNING_CODES.X12_HL_PARENT_LEVEL_INVALID).length,
    ).toBe(0);
  });

  it("NTE with empty description is skipped (decodeNte returns undefined)", () => {
    const sub = readClaimFixture("837p-edge-cases.edi");
    const patientClaim = sub.claims.find((c) => c.claimId === "PT-ACCT-010");
    if (patientClaim === undefined) throw new Error("missing patient claim");
    expect(patientClaim.notes).toHaveLength(0);
  });

  it("AMT with no monetary value is skipped (decodeAmt returns undefined)", () => {
    const sub = readClaimFixture("837p-edge-cases.edi");
    const patientClaim = sub.claims.find((c) => c.claimId === "PT-ACCT-010");
    if (patientClaim === undefined) throw new Error("missing patient claim");
    expect(patientClaim.amounts).toHaveLength(0);
  });

  it("Patient HL routes the claim under the patient (Loop 2000C) even with empty PER/REF on entities", () => {
    const sub = readClaimFixture("837p-edge-cases.edi");
    const patientClaim = sub.claims.find((c) => c.claimId === "PT-ACCT-010");
    if (patientClaim === undefined) throw new Error("missing patient claim");
    expect(patientClaim.patient?.entity.firstName).toBe("CHILD");
    expect(patientClaim.patient?.info.individualRelationshipCode).toBe("19");
  });

  it("decodeRef on adjudication context is skipped (no double-attach to line)", () => {
    // This is exercised by the comprehensive fixture's REF*XZ inside the
    // 2410 group preceding SVD; the REF lands on the service line, not on
    // an adjudication-level reference (which Phase 5 doesn't surface).
    const sub = readClaimFixture("837p-comprehensive.edi");
    const line = sub.claims[0]?.serviceLines[0];
    if (line === undefined || line.variant !== "P") throw new Error("expected P line");
    expect(line.references.some((r) => r.qualifier === "XZ")).toBe(true);
  });
});

describe("get837Claims - empty optional defensive paths", () => {
  it("Loop 2320 SBR with empty payer responsibility code falls back to '' (defensive)", () => {
    const sub = readClaimFixture("837p-empty-optionals.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.otherSubscribers).toHaveLength(1);
    expect(claim.otherSubscribers[0]?.payerResponsibilityCode).toBe("");
    expect(claim.otherSubscribers[0]?.otherSubscriber?.firstName).toBe("SUB");
  });

  it("DTP segments with missing qualifier or value are skipped (decodeDtp returns undefined)", () => {
    const sub = readClaimFixture("837p-empty-optionals.edi");
    const line = sub.claims[0]?.serviceLines[0];
    if (line === undefined) throw new Error("missing line");
    // The three malformed DTP segments (missing format/qualifier/value)
    // each return undefined; only the well-formed DTP outside the suite
    // would land on `line.dates`. The fixture's DTPs are all malformed,
    // so `line.dates` is empty.
    expect(line.dates).toHaveLength(0);
  });

  it("LX with no following SVx leaves the line empty (no procedureCode crash)", () => {
    const sub = readClaimFixture("837p-empty-optionals.edi");
    const claim = sub.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.serviceLines).toHaveLength(2);
    const trailingLine = claim.serviceLines[1];
    if (trailingLine === undefined || trailingLine.variant !== "P") {
      throw new Error("expected trailing P line");
    }
    expect(trailingLine.procedureCode).toBe("");
    expect(trailingLine.lineNumber).toBe("2");
  });
});

describe("get837Claims - variant fallback", () => {
  it("emits X12_837_UNKNOWN_VARIANT for a non-snapshot ST-03 reference; walks shared structure", () => {
    const sub = readClaimFixture("837p-unknown-variant.edi");
    expect(sub.variant).toBe("unknown");
    expect(sub.warnings.some((w) => w.code === WARNING_CODES.X12_837_UNKNOWN_VARIANT)).toBe(true);
    expect(sub.implementationConventionReference).toBe("005010X999A1");

    // Shared structure (HL + entities + CLM + HI) still extracts; only
    // the service-line decoder branches by variant.
    expect(sub.claims).toHaveLength(1);
    expect(sub.claims[0]?.claimId).toBe("PT-ACCT-009");
    expect(sub.claims[0]?.diagnoses[0]?.code).toBe("J20.9");
  });

  it("unknown-variant LX still walks without crashing; openServiceLine returns undefined and the line is dropped", () => {
    const sub = readClaimFixture("837p-unknown-variant.edi");
    // The fixture has an LX without an SVx; with variant unknown,
    // openServiceLine returns undefined and the LX produces no service
    // line on the claim model.
    expect(sub.claims[0]?.serviceLines).toHaveLength(0);
  });
});

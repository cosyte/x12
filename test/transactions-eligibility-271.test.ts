/**
 * Unit tests for the Phase 6 271 eligibility surface
 * (`get271Eligibility`). Covers:
 *
 * - Tier-1 canonical 271 (X279A1): full HL spine (Information Source →
 *   Receiver → Subscriber), subscriber name + address + DMG, and the
 *   EB benefit lines (active coverage, copay, deductible) with
 *   repetition-separated service-type codes resolved against the bundled
 *   snapshot.
 * - **TRN echo** - the safety-critical reassociation property: the 271
 *   carries the requesting 270's trace number verbatim on its enclosing
 *   subscriber / dependent. The walker never mutates it.
 * - Tier-2 dependent fixture: a dependent HL (Loop 2000D) with its own
 *   TRN echo and benefit lines, flushed onto the enclosing subscriber.
 * - X12Decimal: monetary fields decode as decimal, not float.
 * - Mis-route guard: `get271Eligibility` returns `undefined` for a
 *   non-271 transaction set.
 * - The dogfooded loop specs are public `defineLoopSpec` artifacts.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ELIGIBILITY_271_LOOP_2000A,
  ELIGIBILITY_271_LOOP_2000D,
  ELIGIBILITY_271_LOOP_2110,
  X12Decimal,
  get271Eligibility,
  parseX12,
} from "../src/index.js";
import type { X12Eligibility } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "eligibility");

function readEligibilityFixture(name: string): X12Eligibility {
  const raw = readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
  if (tx === undefined) throw new Error(`Fixture ${name} has no 271 transaction set`);
  const elig = get271Eligibility(ix.delimiters, tx);
  if (elig === undefined) throw new Error(`get271Eligibility returned undefined for ${name}`);
  return elig;
}

describe("get271Eligibility - Tier-1 canonical (X279A1)", () => {
  it("decodes the canonical 271 fixture end-to-end with no warnings", () => {
    const elig = readEligibilityFixture("271-canonical.edi");
    expect(elig.warnings).toHaveLength(0);
    expect(elig.subscribers).toHaveLength(1);

    const sub = elig.subscribers[0];
    expect(sub?.informationSource?.name).toBe("MEDPAY INSURANCE");
    expect(sub?.informationSource?.entityIdentifierCode).toBe("PR");
    expect(sub?.informationReceiver?.name).toBe("ANYTOWN CLINIC");
    expect(sub?.name?.lastName).toBe("DOE");
    expect(sub?.name?.firstName).toBe("JANE");
    expect(sub?.name?.idCode).toBe("MBR0001");
    expect(sub?.name?.dateOfBirth).toBe("19850515");
    expect(sub?.name?.genderCode).toBe("F");
    expect(sub?.name?.address?.city).toBe("COLUMBUS");
    expect(sub?.name?.address?.lines).toEqual(["100 MAIN ST"]);
  });

  it("echoes the requesting 270 TRN verbatim (safety-critical reassociation)", () => {
    const elig = readEligibilityFixture("271-canonical.edi");
    const trace = elig.subscribers[0]?.traces[0];
    expect(trace?.traceTypeCode).toBe("2");
    expect(trace?.referenceId).toBe("ECHO-270-TRACE-001");
    expect(trace?.originatingCompanyId).toBe("9SAMPLEORG");
  });

  it("decodes EB benefit lines + resolves repetition-separated service types", () => {
    const elig = readEligibilityFixture("271-canonical.edi");
    const benefits = elig.subscribers[0]?.benefits ?? [];
    expect(benefits).toHaveLength(3);

    const active = benefits[0];
    expect(active?.eligibilityCode).toBe("1");
    expect(active?.coverageLevelCode).toBe("IND");
    expect(active?.serviceTypeCodes.map((s) => s.code)).toEqual(["30", "35"]);
    expect(active?.serviceTypeCodes[0]?.description).toBe("Health Benefit Plan Coverage");
    expect(active?.serviceTypeCodes[1]?.description).toBe("Dental Care");
    expect(active?.planCoverageDescription).toBe("GOLD PPO");
  });

  it("decodes monetary EB fields as X12Decimal, not float", () => {
    const elig = readEligibilityFixture("271-canonical.edi");
    const benefits = elig.subscribers[0]?.benefits ?? [];
    const copay = benefits[1];
    expect(copay?.eligibilityCode).toBe("B");
    expect(copay?.monetaryAmount).toBeInstanceOf(X12Decimal);
    expect(copay?.monetaryAmount?.toString()).toBe("25");

    const deductible = benefits[2];
    expect(deductible?.eligibilityCode).toBe("C");
    expect(deductible?.monetaryAmount?.toString()).toBe("1000");
  });
});

describe("get271Eligibility - Tier-2 dependent (Loop 2000D)", () => {
  it("captures the dependent, its own TRN echo, and its benefits", () => {
    const elig = readEligibilityFixture("271-dependent.edi");
    expect(elig.warnings).toHaveLength(0);

    const sub = elig.subscribers[0];
    expect(sub?.name?.firstName).toBe("JOHN");
    expect(sub?.traces[0]?.referenceId).toBe("ECHO-270-TRACE-002");
    expect(sub?.dependents).toHaveLength(1);

    const dep = sub?.dependents[0];
    expect(dep?.name?.entityIdentifierCode).toBe("QC");
    expect(dep?.name?.lastName).toBe("DOE");
    expect(dep?.name?.firstName).toBe("BABY");
    expect(dep?.traces[0]?.referenceId).toBe("ECHO-270-DEP-002");
    expect(dep?.benefits).toHaveLength(2);
    expect(dep?.benefits[0]?.serviceTypeCodes[0]?.code).toBe("35");
  });
});

describe("get271Eligibility - guards + dogfooded specs", () => {
  it("returns undefined for a non-271 transaction set", () => {
    const raw = readFileSync(join(FIXTURE_DIR, "271-canonical.edi"), "utf8").trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    expect(tx).toBeDefined();
    if (tx === undefined) return;
    const spoofed = { ...tx, st: { ...tx.st, elements: ["ST", "999", "0001"] } };
    expect(get271Eligibility(ix.delimiters, spoofed)).toBeUndefined();
  });

  it("exposes the HL hierarchy + dogfooded loop specs as public artifacts", () => {
    const elig = readEligibilityFixture("271-canonical.edi");
    expect(elig.hierarchies.map((h) => h.levelCode)).toEqual(["20", "21", "22"]);
    expect(ELIGIBILITY_271_LOOP_2000A.trigger).toBe("HL");
    expect(ELIGIBILITY_271_LOOP_2110.trigger).toBe("EB");
    expect(ELIGIBILITY_271_LOOP_2000D.children[0]?.trigger).toBe("NM1");
    expect(ELIGIBILITY_271_LOOP_2000D.children[0]?.children[0]?.trigger).toBe("EB");
  });
});

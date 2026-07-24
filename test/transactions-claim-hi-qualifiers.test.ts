/**
 * Unit tests for the HI qualifier → code-system table. The table is the
 * safety primitive for the 837 diagnoses + procedures - misreading a
 * qualifier picks the wrong code system and corrupts the clinical
 * context. These tests lock the snapshot's known qualifiers and the
 * categorization invariants the `get837Claims` walker depends on.
 */

import { describe, expect, it } from "vitest";

import {
  HI_QUALIFIERS,
  isDiagnosisQualifier,
  isProcedureQualifier,
  resolveHiQualifier,
} from "../src/index.js";

describe("HI_QUALIFIERS registry", () => {
  it("every entry has a frozen-shape (system + category + description)", () => {
    for (const [qualifier, entry] of Object.entries(HI_QUALIFIERS)) {
      expect(qualifier).toMatch(/^[A-Z][A-Z0-9]{1,2}$/u);
      expect(entry.system).toBeTypeOf("string");
      expect(entry.category).toBeTypeOf("string");
      expect(entry.description.length).toBeGreaterThan(10);
    }
  });

  it("ICD-10-CM principal diagnosis qualifier ABK resolves to expected system + category", () => {
    const e = resolveHiQualifier("ABK");
    expect(e?.system).toBe("ICD-10-CM");
    expect(e?.category).toBe("principal-diagnosis");
  });

  it("ICD-10-PCS procedure qualifier BBR resolves to procedure category", () => {
    const e = resolveHiQualifier("BBR");
    expect(e?.system).toBe("ICD-10-PCS");
    expect(e?.category).toBe("procedure");
  });

  it("Legacy ICD-9-CM principal diagnosis qualifier BK resolves to ICD-9-CM", () => {
    const e = resolveHiQualifier("BK");
    expect(e?.system).toBe("ICD-9-CM");
    expect(e?.category).toBe("principal-diagnosis");
  });

  it("Unknown qualifier returns undefined (parser will emit X12_UNKNOWN_HI_QUALIFIER)", () => {
    expect(resolveHiQualifier("XYZ")).toBeUndefined();
    expect(resolveHiQualifier("")).toBeUndefined();
  });
});

describe("isDiagnosisQualifier / isProcedureQualifier", () => {
  it("classifies the safety-critical core qualifiers correctly", () => {
    expect(isDiagnosisQualifier("ABK")).toBe(true); // ICD-10-CM principal dx
    expect(isDiagnosisQualifier("ABF")).toBe(true); // ICD-10-CM other dx
    expect(isDiagnosisQualifier("ABJ")).toBe(true); // ICD-10-CM admitting dx
    expect(isDiagnosisQualifier("APR")).toBe(true); // ICD-10-CM external cause
    expect(isDiagnosisQualifier("BBR")).toBe(false); // ICD-10-PCS procedure
    expect(isDiagnosisQualifier("DR")).toBe(false); // DRG
    expect(isDiagnosisQualifier("XYZ")).toBe(false); // unknown

    expect(isProcedureQualifier("BBR")).toBe(true); // ICD-10-PCS other procedure
    expect(isProcedureQualifier("BBQ")).toBe(true); // ICD-10-PCS principal procedure
    expect(isProcedureQualifier("BQ")).toBe(true); // ICD-9-PCS legacy
    expect(isProcedureQualifier("ABK")).toBe(false); // diagnosis
    expect(isProcedureQualifier("DR")).toBe(false); // DRG
  });

  it("diagnosis and procedure classifications are disjoint", () => {
    for (const qualifier of Object.keys(HI_QUALIFIERS)) {
      const isDx = isDiagnosisQualifier(qualifier);
      const isProc = isProcedureQualifier(qualifier);
      expect(isDx && isProc).toBe(false);
    }
  });
});

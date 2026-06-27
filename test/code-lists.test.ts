/**
 * Unit tests for the bundled Phase 4 code-list snapshots
 * (`CARC` / `RARC` / `CLP_STATUS` / Claim Adjustment Group Codes).
 * Covers:
 *
 * - Snapshot metadata invariants (dates parseable, source non-empty).
 * - Lookup helpers return frozen entries with verbatim codes.
 * - Unknown codes return `undefined` (fail-safe).
 * - `isClaimAdjustmentGroupCode` narrows correctly.
 * - The fixed-4 Claim Adjustment Group Codes are exactly CO/PR/OA/PI.
 * - Snapshots are frozen (no mutation).
 */

import { describe, expect, it } from "vitest";

import {
  CARC,
  CLAIM_ADJUSTMENT_GROUP_CODES,
  CLP_STATUS,
  RARC,
  isClaimAdjustmentGroupCode,
  lookupCarc,
  lookupClpStatus,
  lookupRarc,
} from "../src/index.js";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

describe("code-list metadata invariants", () => {
  it.each([
    ["CARC", CARC],
    ["RARC", RARC],
    ["CLP_STATUS", CLP_STATUS],
  ] as const)("%s: meta exposes id + iso dates + non-empty source", (name, snap) => {
    expect(snap.meta.id.length).toBeGreaterThan(0);
    expect(snap.meta.description.length).toBeGreaterThan(0);
    expect(snap.meta.source.length).toBeGreaterThan(0);
    expect(snap.meta.publishedDate).toMatch(ISO_DATE_RE);
    expect(snap.meta.snapshotDate).toMatch(ISO_DATE_RE);
    void name;
  });

  it.each([
    ["CARC", CARC],
    ["RARC", RARC],
    ["CLP_STATUS", CLP_STATUS],
  ] as const)("%s: meta + codes object are frozen", (name, snap) => {
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.meta)).toBe(true);
    expect(Object.isFrozen(snap.codes)).toBe(true);
    void name;
  });
});

describe("lookup helpers", () => {
  it("CARC lookup returns frozen { code, description } for a known code", () => {
    const entry = lookupCarc("45");
    expect(entry?.code).toBe("45");
    expect(entry?.description).toMatch(/fee schedule/iu);
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it("CARC lookup returns undefined for an unknown code (fail-safe, never throws)", () => {
    expect(lookupCarc("9999")).toBeUndefined();
    expect(lookupCarc("")).toBeUndefined();
  });

  it("RARC lookup handles both the M- and N- prefix conventions", () => {
    expect(lookupRarc("M1")?.code).toBe("M1");
    expect(lookupRarc("N4")?.code).toBe("N4");
    expect(lookupRarc("ZZZZ")).toBeUndefined();
  });

  it("CLP status lookup returns the expected dispositions", () => {
    expect(lookupClpStatus("1")?.description).toMatch(/Primary/iu);
    expect(lookupClpStatus("4")?.description).toMatch(/Denied/iu);
    expect(lookupClpStatus("22")?.description).toMatch(/Reversal/iu);
    expect(lookupClpStatus("99")).toBeUndefined();
  });
});

describe("Claim Adjustment Group Codes (CAGC)", () => {
  it("ships exactly the 4 spec-fixed values CO / PR / OA / PI", () => {
    expect(Object.keys(CLAIM_ADJUSTMENT_GROUP_CODES).sort()).toEqual(["CO", "OA", "PI", "PR"]);
  });

  it("isClaimAdjustmentGroupCode narrows correctly", () => {
    expect(isClaimAdjustmentGroupCode("PR")).toBe(true);
    expect(isClaimAdjustmentGroupCode("CO")).toBe(true);
    expect(isClaimAdjustmentGroupCode("OA")).toBe(true);
    expect(isClaimAdjustmentGroupCode("PI")).toBe(true);
    expect(isClaimAdjustmentGroupCode("CR")).toBe(false);
    expect(isClaimAdjustmentGroupCode("")).toBe(false);
    expect(isClaimAdjustmentGroupCode("pr")).toBe(false);
  });
});

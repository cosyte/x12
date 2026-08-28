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
 * - The regression locks below: adding per-code validity dates to the CARC and
 *   RARC snapshots moved NO code, NO description and NO existing lookup
 *   behaviour, on those two lists or on any other bundled list.
 */

import { describe, expect, it } from "vitest";

import {
  AAA_FOLLOW_UP_ACTION_CODES,
  AAA_REJECT_REASON_CODES,
  CARC,
  CLAIM_ADJUSTMENT_GROUP_CODES,
  CLAIM_STATUS_CATEGORY_CODES,
  CLAIM_STATUS_CODES,
  CLP_STATUS,
  MAINTENANCE_TYPE_CODES,
  RARC,
  SERVICE_TYPE_CODES,
  isClaimAdjustmentGroupCode,
  lookupAaaFollowUpAction,
  lookupAaaRejectReason,
  lookupCarc,
  lookupClaimStatus,
  lookupClaimStatusCategory,
  lookupClpStatus,
  lookupMaintenanceType,
  lookupRarc,
  lookupServiceType,
  resolveHiQualifier,
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

/**
 * The CARC subset as it shipped before per-code dates were added, code by code
 * and byte for byte. Transcribed rather than derived: a lock that reads the
 * value it asserts cannot catch the change it exists to catch.
 */
const BUNDLED_CARC: Readonly<Record<string, string>> = {
  "1": "Deductible Amount",
  "2": "Coinsurance Amount",
  "3": "Co-payment Amount",
  "4": "The procedure code is inconsistent with the modifier used.",
  "5": "The procedure code/type of bill is inconsistent with the place of service.",
  "6": "The procedure/revenue code is inconsistent with the patient's age.",
  "7": "The procedure/revenue code is inconsistent with the patient's gender.",
  "8": "The procedure code is inconsistent with the provider type/specialty (taxonomy).",
  "9": "The diagnosis is inconsistent with the patient's age.",
  "10": "The diagnosis is inconsistent with the patient's gender.",
  "11": "The diagnosis is inconsistent with the procedure.",
  "15": "The authorization number is missing, invalid, or does not apply to the billed services or provider.",
  "16": "Claim/service lacks information or has submission/billing error(s).",
  "18": "Exact duplicate claim/service.",
  "22": "This care may be covered by another payer per coordination of benefits.",
  "23": "The impact of prior payer(s) adjudication including payments and/or adjustments.",
  "24": "Charges are covered under a capitation agreement/managed care plan.",
  "26": "Expenses incurred prior to coverage.",
  "27": "Expenses incurred after coverage terminated.",
  "29": "The time limit for filing has expired.",
  "31": "Patient cannot be identified as our insured.",
  "45": "Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement.",
  "50": "These are non-covered services because this is not deemed a 'medical necessity' by the payer.",
  "96": "Non-covered charge(s).",
  "97": "The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated.",
  "109": "Claim/service not covered by this payer/contractor.",
  "119": "Benefit maximum for this time period or occurrence has been reached.",
  "197": "Precertification/authorization/notification/pre-treatment absent.",
  "204": "This service/equipment/drug is not covered under the patient's current benefit plan.",
};

/** The RARC subset as it shipped before per-code dates were added. */
const BUNDLED_RARC: Readonly<Record<string, string>> = {
  M1: "X-ray not taken within the past 12 months or near enough to the start of treatment.",
  M86: "Service denied because payment already made for same/similar procedure within set time frame.",
  M127: "Missing patient medical record for this service.",
  MA01: "Alert: If you do not agree with what we approved for these services, you may appeal our decision.",
  MA15: "Alert: Your claim has been separated to expedite handling. You will receive a separate notice for the other services reported.",
  N4: "Missing/incomplete/invalid prior insurance carrier(s) EOB.",
  N30: "Patient ineligible for this service.",
  N122: "Add-on code cannot be billed by itself.",
  N130: "Consult plan benefit documents/guidelines for information about restrictions for this service.",
  N179: "Additional information has been requested from the member. The charges will be reconsidered upon receipt of that information.",
  N522: "Duplicate of a previously processed claim/line.",
  N657: "This should be billed with the appropriate code for these services.",
};

/**
 * The codes every OTHER bundled snapshot ships, as sets. These lists are
 * outside the per-code-date work entirely and must not have moved with it.
 */
const OTHER_LIST_CODES = {
  CLAIM_STATUS_CODES: [
    "1",
    "2",
    "3",
    "6",
    "15",
    "16",
    "19",
    "20",
    "21",
    "23",
    "24",
    "25",
    "33",
    "35",
    "37",
    "45",
    "65",
    "85",
    "88",
    "97",
    "101",
    "107",
    "187",
    "454",
    "509",
  ],
  CLAIM_STATUS_CATEGORY_CODES: [
    "A0",
    "A1",
    "A2",
    "A3",
    "A4",
    "A5",
    "A6",
    "A7",
    "A8",
    "D0",
    "E0",
    "E1",
    "E2",
    "E3",
    "E4",
    "F0",
    "F1",
    "F2",
    "F3",
    "F3F",
    "F4",
    "P0",
    "P1",
    "P2",
    "P3",
    "P4",
    "P5",
    "R0",
    "R1",
  ],
  CLP_STATUS: ["1", "2", "3", "4", "19", "20", "21", "22", "23", "25"],
  MAINTENANCE_TYPE_CODES: ["001", "002", "003", "004", "021", "024", "025", "026", "030"],
  SERVICE_TYPE_CODES: [
    "1",
    "30",
    "33",
    "35",
    "40",
    "42",
    "45",
    "47",
    "48",
    "50",
    "51",
    "52",
    "53",
    "60",
    "62",
    "65",
    "68",
    "73",
    "76",
    "78",
    "80",
    "81",
    "82",
    "86",
    "88",
    "93",
    "98",
    "A4",
    "A6",
    "A7",
    "A8",
    "AD",
    "AE",
    "AF",
    "AG",
    "AL",
    "BG",
    "BH",
    "MH",
    "UC",
  ],
} as const;

describe("regression locks: per-code dates moved no code and no description", () => {
  it("CARC ships exactly the same 29 codes with byte-identical descriptions", () => {
    expect(Object.keys(CARC.codes).sort()).toEqual(Object.keys(BUNDLED_CARC).sort());
    for (const [code, description] of Object.entries(BUNDLED_CARC)) {
      expect(CARC.codes[code]).toBe(description);
    }
  });

  it("RARC ships exactly the same 12 codes with byte-identical descriptions", () => {
    expect(Object.keys(RARC.codes).sort()).toEqual(Object.keys(BUNDLED_RARC).sort());
    for (const [code, description] of Object.entries(BUNDLED_RARC)) {
      expect(RARC.codes[code]).toBe(description);
    }
  });

  it("the single-argument lookups return the same code and description as before", () => {
    for (const [code, description] of Object.entries(BUNDLED_CARC)) {
      const entry = lookupCarc(code);
      expect(entry?.code).toBe(code);
      expect(entry?.description).toBe(description);
      expect(Object.isFrozen(entry)).toBe(true);
    }
    for (const [code, description] of Object.entries(BUNDLED_RARC)) {
      const entry = lookupRarc(code);
      expect(entry?.code).toBe(code);
      expect(entry?.description).toBe(description);
    }
  });

  it.each(["9999", "", "ZZZZ", "1 ", " 1", "n4", "N4 "])(
    "the single-argument lookups still return nothing at all for %j",
    (code) => {
      // The 835 walker branches on `undefined` to raise X12_UNKNOWN_CARC and
      // X12_UNKNOWN_RARC, so `undefined` is the contract and not an artefact.
      const carc = lookupCarc(code);
      const rarc = lookupRarc(code);
      expect(carc === undefined || Object.hasOwn(BUNDLED_CARC, code)).toBe(true);
      expect(rarc === undefined || Object.hasOwn(BUNDLED_RARC, code)).toBe(true);
    },
  );

  it("an unknown code is undefined on both lookups, exactly as before", () => {
    expect(lookupCarc("9999")).toBeUndefined();
    expect(lookupCarc("")).toBeUndefined();
    expect(lookupRarc("ZZZZ")).toBeUndefined();
    expect(lookupRarc("")).toBeUndefined();
  });
});

describe("regression locks: every other bundled list is untouched", () => {
  it.each([
    ["CLAIM_STATUS_CODES", CLAIM_STATUS_CODES, OTHER_LIST_CODES.CLAIM_STATUS_CODES],
    [
      "CLAIM_STATUS_CATEGORY_CODES",
      CLAIM_STATUS_CATEGORY_CODES,
      OTHER_LIST_CODES.CLAIM_STATUS_CATEGORY_CODES,
    ],
    ["CLP_STATUS", CLP_STATUS, OTHER_LIST_CODES.CLP_STATUS],
    ["MAINTENANCE_TYPE_CODES", MAINTENANCE_TYPE_CODES, OTHER_LIST_CODES.MAINTENANCE_TYPE_CODES],
    ["SERVICE_TYPE_CODES", SERVICE_TYPE_CODES, OTHER_LIST_CODES.SERVICE_TYPE_CODES],
  ] as const)("%s ships exactly the codes it always did", (name, snap, codes) => {
    expect(Object.keys(snap.codes).sort()).toEqual([...codes].sort());
    for (const description of Object.values(snap.codes)) {
      expect(typeof description).toBe("string");
      expect(description.length).toBeGreaterThan(0);
    }
    void name;
  });

  it.each([
    ["CLAIM_STATUS_CODES", CLAIM_STATUS_CODES],
    ["CLAIM_STATUS_CATEGORY_CODES", CLAIM_STATUS_CATEGORY_CODES],
    ["CLP_STATUS", CLP_STATUS],
    ["MAINTENANCE_TYPE_CODES", MAINTENANCE_TYPE_CODES],
    ["SERVICE_TYPE_CODES", SERVICE_TYPE_CODES],
    ["AAA_REJECT_REASON_CODES", AAA_REJECT_REASON_CODES],
    ["AAA_FOLLOW_UP_ACTION_CODES", AAA_FOLLOW_UP_ACTION_CODES],
  ] as const)("%s gains no per-code date table", (name, snap) => {
    expect(Object.hasOwn(snap, "dates")).toBe(false);
    void name;
  });

  it("their lookups still return two-property entries, and undefined for an unknown code", () => {
    const known = [
      lookupClaimStatus("1"),
      lookupClaimStatusCategory("A1"),
      lookupClpStatus("1"),
      lookupMaintenanceType("001"),
      lookupServiceType("30"),
    ];
    for (const entry of known) {
      expect(entry).toBeDefined();
      // A snapshot without dates yields the entry it always did: exactly two
      // own properties, no `dates` key holding `undefined`.
      expect(Object.keys(entry ?? {}).sort()).toEqual(["code", "description"]);
    }
    expect(lookupClaimStatus("ZZZ")).toBeUndefined();
    expect(lookupClaimStatusCategory("ZZZ")).toBeUndefined();
    expect(lookupClpStatus("99")).toBeUndefined();
    expect(lookupMaintenanceType("999")).toBeUndefined();
    expect(lookupServiceType("ZZZ")).toBeUndefined();
  });

  it("the empty AAA snapshots still ship empty and still resolve nothing", () => {
    expect(Object.keys(AAA_REJECT_REASON_CODES.codes)).toEqual([]);
    expect(Object.keys(AAA_FOLLOW_UP_ACTION_CODES.codes)).toEqual([]);
    expect(lookupAaaRejectReason("42")).toBeUndefined();
    expect(lookupAaaFollowUpAction("C")).toBeUndefined();
  });

  it("the HI qualifier resolver is unchanged", () => {
    expect(resolveHiQualifier("ABK")).toBeDefined();
    expect(resolveHiQualifier("ZZZZ")).toBeUndefined();
  });

  it.each(["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"])(
    "%s resolves to nothing on every bundled lookup",
    (key) => {
      for (const lookup of [
        lookupCarc,
        lookupRarc,
        lookupClaimStatus,
        lookupClaimStatusCategory,
        lookupClpStatus,
        lookupMaintenanceType,
        lookupServiceType,
        lookupAaaRejectReason,
        lookupAaaFollowUpAction,
      ]) {
        expect(lookup(key)).toBeUndefined();
      }
    },
  );
});

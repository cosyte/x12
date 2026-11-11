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
 * - The maintaining organisation and the redistribution status a consumer
 *   reads off `meta`, as two separately readable values.
 * - Whether a snapshot is the complete published list or a cited part of it.
 * - That a list which may not be redistributed is STILL exactly the part it
 *   already shipped, and names the licensor who could change that.
 * - That the recorded terms agree with the sources they were read off: a list
 *   the X12 External Code Lists index publishes cites its own row there and
 *   never claims the index is silent about it, and only the two lists that
 *   really are absent from it carry the unsettled record.
 * - That every list keeps exactly the codes it carried, pinned by digest so an
 *   addition or an edit reds here; only the list recorded as permitted keeps
 *   its descriptions (`test/code-lists-descriptions.test.ts` holds that rule).
 * - The regression locks below: adding per-code validity dates to the CARC and
 *   RARC snapshots moved NO code and NO existing lookup behaviour, on those two
 *   lists or on any other bundled list.
 *
 * The redistribution record and the per-code validity dates are ORTHOGONAL and
 * both are asserted here: one says what may be done with a description, the
 * other says which days a code was valid on. Neither displaces the other, and
 * the transcribed tables below plus the digests above pin the SAME `codes` maps
 * from two independent directions. No description from a list that is not
 * recorded as permitted is copied into this file.
 */

import { createHash } from "node:crypto";

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
  codeListRedistributionIsPermitted,
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
import type { CodeListSnapshot } from "../src/index.js";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

/** Every bundled `CodeListSnapshot`, named. */
const ALL_SNAPSHOTS: readonly (readonly [string, CodeListSnapshot])[] = [
  ["CARC", CARC],
  ["RARC", RARC],
  ["CLAIM_STATUS_CATEGORY_CODES", CLAIM_STATUS_CATEGORY_CODES],
  ["CLAIM_STATUS_CODES", CLAIM_STATUS_CODES],
  ["SERVICE_TYPE_CODES", SERVICE_TYPE_CODES],
  ["CLP_STATUS", CLP_STATUS],
  ["MAINTENANCE_TYPE_CODES", MAINTENANCE_TYPE_CODES],
];

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
  it("CARC lookup returns a frozen entry with no description for a known code", () => {
    const entry = lookupCarc("45");
    expect(entry?.code).toBe("45");
    expect(entry?.description).toBeUndefined();
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

  it("CLP status lookup knows the bundled dispositions and describes none", () => {
    for (const code of ["1", "4", "22"]) {
      expect(lookupClpStatus(code)).toEqual({ code, description: undefined });
    }
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

describe("AC-3: a consumer reads the maintainer and the terms as two separate values", () => {
  it.each(ALL_SNAPSHOTS)("%s: both are on the published metadata", (name, snap) => {
    expect(snap.meta.maintainingOrganization, `${name} maintainer`).toBeTruthy();
    expect(snap.meta.redistribution, `${name} redistribution`).toBeDefined();
    // Two READINGS, not one verdict: who keeps the list, and what may be done
    // with its text, are answered in different fields.
    expect(typeof snap.meta.maintainingOrganization).toBe("string");
    expect(typeof snap.meta.redistribution?.status).toBe("string");
  });

  it("Claim Adjustment Reason Codes: maintained by X12, and a licence must be purchased", () => {
    expect(CARC.meta.maintainingOrganization).toBe("ASC X12");
    expect(CARC.meta.redistribution?.status).toBe("licence-required");
    expect(codeListRedistributionIsPermitted(CARC.meta)).toBe(false);
  });

  it("Remittance Advice Remark Codes: maintained by CMS, and no licence is required", () => {
    expect(RARC.meta.maintainingOrganization).toBe("CMS");
    expect(RARC.meta.redistribution?.status).toBe("permitted");
    expect(codeListRedistributionIsPermitted(RARC.meta)).toBe(true);
    // Nobody to ask, because nothing needs asking.
    expect(RARC.meta.redistribution?.approach).toBeUndefined();
  });

  it("the two answers vary independently across the bundled lists", () => {
    // If either field were a constant it would be carrying no information, and
    // the single shared review this replaced would have been adequate.
    expect(new Set(ALL_SNAPSHOTS.map(([, s]) => s.meta.maintainingOrganization)).size).toBe(2);
    expect(new Set(ALL_SNAPSHOTS.map(([, s]) => s.meta.redistribution?.status)).size).toBe(3);
  });

  it.each(ALL_SNAPSHOTS)("%s: the metadata is frozen, record included", (name, snap) => {
    expect(Object.isFrozen(snap.meta), name).toBe(true);
    expect(Object.isFrozen(snap.meta.redistribution), name).toBe(true);
  });
});

describe("AC-4: a snapshot says whether it is the whole list or a cited part of it", () => {
  it.each(ALL_SNAPSHOTS)("%s: completeness is one of the two stated values", (name, snap) => {
    expect(["complete-published-list", "cited-subset"], name).toContain(snap.meta.completeness);
  });

  it("every bundled list is a cited part today, which is why a miss means nothing", () => {
    // The distinction this exists for: outside a cited part, a lookup miss says
    // this package does not carry the code, NOT that the publisher never issued
    // it. Reading a miss as the second answer is the wrong-answer failure.
    for (const [name, snap] of ALL_SNAPSHOTS) {
      expect(snap.meta.completeness, name).toBe("cited-subset");
    }
    expect(lookupCarc("9999")).toBeUndefined();
  });
});

describe("AC-2: a list that may not be redistributed stays put, and names its licensor", () => {
  const RESTRICTED = ALL_SNAPSHOTS.filter(([, s]) => !codeListRedistributionIsPermitted(s.meta));

  it("there are restricted lists to test, so the cases below are not vacuous", () => {
    expect(RESTRICTED.map(([name]) => name)).toEqual([
      "CARC",
      "CLAIM_STATUS_CATEGORY_CODES",
      "CLAIM_STATUS_CODES",
      "SERVICE_TYPE_CODES",
      "CLP_STATUS",
      "MAINTENANCE_TYPE_CODES",
    ]);
  });

  it.each(RESTRICTED)("%s: is still exactly a cited part, not enlarged", (name, snap) => {
    expect(snap.meta.completeness, name).toBe("cited-subset");
  });

  it.each(RESTRICTED)("%s: names the licensor who must be approached", (name, snap) => {
    const approach = snap.meta.redistribution?.approach ?? "";
    expect(approach.length, name).toBeGreaterThan(0);
    // A named party AND a route to it. A refusal naming neither is a dead end.
    expect(approach, name).toContain("ASC X12");
    expect(approach, name).toContain("https://x12.org/products/licensing-program");
  });
});

describe("AC-1/AC-5: the recorded terms agree with the sources they were read off", () => {
  /**
   * The two sentences a list may only carry if the X12 External Code Lists
   * index really is silent about it. They are the load-bearing half of the
   * `"not-established"` answer: a status label is a word, but this is the
   * evidence a consumer reads to decide whom to approach, and it ships to npm
   * as public metadata.
   */
  const ABSENT_FROM_THE_INDEX = "rather than published on the X12 External Code Lists index";
  const NAMED_BY_NO_SOURCE = "no source obtained for this package names it";

  /**
   * Every bundled list the index publishes, with the external code list id its
   * row carries. Read off the index retrieved for this change; the id is in the
   * list's own recorded terms, which is what makes the pairing checkable here
   * rather than a second copy of the source.
   */
  const PUBLISHED_ON_THE_INDEX: readonly (readonly [string, CodeListSnapshot, string])[] = [
    ["CARC", CARC, "139"],
    ["RARC", RARC, "411"],
    ["CLAIM_STATUS_CATEGORY_CODES", CLAIM_STATUS_CATEGORY_CODES, "507"],
    ["CLAIM_STATUS_CODES", CLAIM_STATUS_CODES, "508"],
    ["SERVICE_TYPE_CODES", SERVICE_TYPE_CODES, "958"],
  ];

  /** The lists no carried source names at all: TR3-internal element code lists. */
  const ABSENT_FROM_THE_INDEX_LISTS: readonly (readonly [string, CodeListSnapshot])[] = [
    ["CLP_STATUS", CLP_STATUS],
    ["MAINTENANCE_TYPE_CODES", MAINTENANCE_TYPE_CODES],
  ];

  it.each(PUBLISHED_ON_THE_INDEX)(
    "%s: cites its external code list id and never claims the index is silent about it",
    (name, snap, listId) => {
      const terms = snap.meta.redistribution?.terms ?? "";
      expect(terms, `${name} cites its index row`).toContain(`external code list ${listId}`);
      expect(terms, `${name} must not deny a row it has`).not.toContain(ABSENT_FROM_THE_INDEX);
      expect(terms, `${name} is named by a carried source`).not.toContain(NAMED_BY_NO_SOURCE);
    },
  );

  it.each(PUBLISHED_ON_THE_INDEX)(
    "%s: the terms do not contradict the description in the same frozen object",
    (name, snap) => {
      // The snapshot's own description already calls the service type list an
      // X12 external code source. A `terms` string denying that, sitting in the
      // same frozen object, is a package disagreeing with itself in public.
      const terms = snap.meta.redistribution?.terms ?? "";
      if (snap.meta.description.includes("external code source")) {
        expect(terms, name).not.toContain("rather than published on the X12");
      }
    },
  );

  it.each(ABSENT_FROM_THE_INDEX_LISTS)(
    "%s: is TR3-only, so it keeps the unsettled record and says so",
    (name, snap) => {
      const terms = snap.meta.redistribution?.terms ?? "";
      expect(snap.meta.redistribution?.status, name).toBe("not-established");
      expect(terms, name).toContain("NOT ESTABLISHED");
      expect(terms, name).toContain(ABSENT_FROM_THE_INDEX);
      expect(terms, name).toContain(NAMED_BY_NO_SOURCE);
    },
  );

  it("CONTROL: both sentences are really in the tree, so the checks above are not vacuous", () => {
    // If the wording ever moved, the `not.toContain` assertions would pass over
    // a claim they were written to catch. This pins that they still exist.
    const unsettled = ALL_SNAPSHOTS.filter(
      ([, s]) => s.meta.redistribution?.status === "not-established",
    );
    expect(unsettled.length).toBeGreaterThan(0);
    for (const [name, snap] of unsettled) {
      expect(snap.meta.redistribution?.terms, name).toContain(ABSENT_FROM_THE_INDEX);
      expect(snap.meta.redistribution?.terms, name).toContain(NAMED_BY_NO_SOURCE);
    }
  });

  it("CONTROL: every bundled list is in exactly one of the two tables", () => {
    const covered = [
      ...PUBLISHED_ON_THE_INDEX.map(([name]) => name),
      ...ABSENT_FROM_THE_INDEX_LISTS.map(([name]) => name),
    ].sort();
    expect(new Set(covered).size).toBe(covered.length);
    expect(covered).toEqual(ALL_SNAPSHOTS.map(([name]) => name).sort());
  });

  it("CONTROL: this is a metadata split and moved no code", () => {
    // The service type snapshot is still the 40-code cited part it shipped as.
    expect(Object.keys(SERVICE_TYPE_CODES.codes).length).toBe(40);
    expect(SERVICE_TYPE_CODES.meta.completeness).toBe("cited-subset");
    expect(codeListRedistributionIsPermitted(SERVICE_TYPE_CODES.meta)).toBe(false);
  });
});

describe("AC-8: every list keeps its codes, and only the permitted one its descriptions", () => {
  /**
   * Digest of a bundled list's exact `code -> description` pairs, order
   * normalised so a re-ordering is not mistaken for an edit. A list that ships
   * no description digests its codes against `null`.
   *
   * A digest rather than a copy of the tables ON PURPOSE: it pins every byte
   * without making a copy, and the explicit code keys below make the "added
   * none" half readable.
   */
  function digest(snap: CodeListSnapshot): string {
    const entries = Object.entries(snap.codes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return createHash("sha256").update(JSON.stringify(entries), "utf8").digest("hex");
  }

  /**
   * A code added, a code dropped or a description added or reworded moves the
   * digest. RARC's is the one taken before the restricted lists lost their
   * descriptions, so it shows RARC did not change with them.
   */
  const EXPECTED: Readonly<Record<string, { readonly count: number; readonly sha256: string }>> = {
    CARC: {
      count: 29,
      sha256: "80c0103e231779d3715cb954d9f99374984a7a31eab139c9d98d43b404902d71",
    },
    RARC: {
      count: 12,
      sha256: "670183fb3a85760ec5accaa7dce93f83587782e9db5b927fef4c3635edd75bfc",
    },
    "CLAIM-STATUS-CATEGORY": {
      count: 29,
      sha256: "603c79fca5b680dadb122df6f63d6f2906010c0173e4f91f37371aac4bfb0eab",
    },
    "CLAIM-STATUS": {
      count: 25,
      sha256: "583623dcf3139aab3450c66028878e2ce50a4ae67351bfde6fb9ed1eb328971c",
    },
    "SERVICE-TYPE": {
      count: 40,
      sha256: "07bd3f4b40dcaafd4dd50b52781cb9a12d8ef902ecf8b77dffffbec2f324df1c",
    },
    "CLP-STATUS": {
      count: 10,
      sha256: "7aff9d1bac4b92ad9ee37c77c4abfca4419537bebb415d6875fd09bb7cf7fc5f",
    },
    "MAINTENANCE-TYPE": {
      count: 9,
      sha256: "0481468607ff217e9adf2a1c944b0c7210c3cdfa998806436d7c3633960c5ffd",
    },
  };

  it.each(ALL_SNAPSHOTS)("%s: returns exactly the codes it returned before", (name, snap) => {
    const expected = EXPECTED[snap.meta.id];
    expect(expected, `${name} has a pinned baseline`).toBeDefined();
    expect(Object.keys(snap.codes).length, name).toBe(expected?.count);
    expect(digest(snap), `${name}: a code or a description changed`).toBe(expected?.sha256);
  });

  it("the codes a restricted list carries are the ones it already carried", () => {
    // Spelled out for the two lists a consumer leans on hardest, so a diff of
    // the bundled set is readable and not only digest-deep.
    expect(Object.keys(CARC.codes).sort()).toEqual(
      [
        "1",
        "10",
        "109",
        "11",
        "119",
        "15",
        "16",
        "18",
        "197",
        "2",
        "204",
        "22",
        "23",
        "24",
        "26",
        "27",
        "29",
        "3",
        "31",
        "4",
        "45",
        "5",
        "50",
        "6",
        "7",
        "8",
        "9",
        "96",
        "97",
      ].sort(),
    );
    expect(Object.keys(RARC.codes).sort()).toEqual(
      [
        "M1",
        "M127",
        "M86",
        "MA01",
        "MA15",
        "N122",
        "N130",
        "N179",
        "N30",
        "N4",
        "N522",
        "N657",
      ].sort(),
    );
  });

  it("CONTROL: the digest really does move when a description changes", () => {
    // Without this the pins above could pass over a broken digest function.
    const altered: CodeListSnapshot = {
      meta: CARC.meta,
      codes: { ...CARC.codes, "1": "Synthetic text added for this control" },
    };
    expect(digest(altered)).not.toBe(EXPECTED["CARC"]?.sha256);
  });
});

/**
 * The CARC codes as they shipped before per-code dates were added, code by
 * code. Transcribed rather than derived: a lock that reads the value it
 * asserts cannot catch the change it exists to catch. The list ships no
 * description, so none is transcribed.
 */
const BUNDLED_CARC_CODES: readonly string[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "15",
  "16",
  "18",
  "22",
  "23",
  "24",
  "26",
  "27",
  "29",
  "31",
  "45",
  "50",
  "96",
  "97",
  "109",
  "119",
  "197",
  "204",
];

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

describe("regression locks: per-code dates moved no code", () => {
  it("CARC ships exactly the same 29 codes, none with a description", () => {
    expect(Object.keys(CARC.codes).sort()).toEqual([...BUNDLED_CARC_CODES].sort());
    for (const code of BUNDLED_CARC_CODES) {
      expect(Object.hasOwn(CARC.codes, code)).toBe(true);
      expect(CARC.codes[code]).toBeUndefined();
    }
  });

  it("RARC ships exactly the same 12 codes with byte-identical descriptions", () => {
    expect(Object.keys(RARC.codes).sort()).toEqual(Object.keys(BUNDLED_RARC).sort());
    for (const [code, description] of Object.entries(BUNDLED_RARC)) {
      expect(RARC.codes[code]).toBe(description);
    }
  });

  it("the single-argument lookups return the same codes, and RARC its descriptions", () => {
    for (const code of BUNDLED_CARC_CODES) {
      const entry = lookupCarc(code);
      expect(entry?.code).toBe(code);
      expect(entry?.description).toBeUndefined();
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
      expect(carc === undefined || BUNDLED_CARC_CODES.includes(code)).toBe(true);
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
  ] as const)(
    "%s ships exactly the codes it always did, with no description",
    (name, snap, codes) => {
      expect(Object.keys(snap.codes).sort()).toEqual([...codes].sort());
      for (const description of Object.values(snap.codes)) {
        expect(description).toBeUndefined();
      }
      void name;
    },
  );

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

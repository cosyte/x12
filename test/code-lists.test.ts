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
 * - That this change added no code and altered no description, pinned by
 *   digest so an addition or an edit reds here.
 */

import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
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
  lookupCarc,
  lookupClpStatus,
  lookupRarc,
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

describe("AC-8: no code and no description changed", () => {
  /**
   * Digest of a bundled list's exact `code -> description` pairs, order
   * normalised so a re-ordering is not mistaken for an edit.
   *
   * A digest rather than a copy of the tables ON PURPOSE. Six of the seven
   * lists carry descriptions this package may not redistribute, and pasting a
   * second copy of them into a test would be exactly the exposure the record
   * beside them exists to prevent. The digest pins every byte without making a
   * copy, and the explicit code keys below make the "added none" half readable.
   */
  function digest(snap: CodeListSnapshot): string {
    const entries = Object.entries(snap.codes).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return createHash("sha256").update(JSON.stringify(entries), "utf8").digest("hex");
  }

  /**
   * Taken on the tree BEFORE this change, with `codes` untouched by it. A code
   * added, a code dropped or a description reworded moves the digest.
   */
  const EXPECTED: Readonly<Record<string, { readonly count: number; readonly sha256: string }>> = {
    CARC: {
      count: 29,
      sha256: "529df9cbe8d9a3c8f2020980dc21fb3f103fd01b7ffed834314562062ac9f2b3",
    },
    RARC: {
      count: 12,
      sha256: "670183fb3a85760ec5accaa7dce93f83587782e9db5b927fef4c3635edd75bfc",
    },
    "CLAIM-STATUS-CATEGORY": {
      count: 29,
      sha256: "09fd13c05e5b90167f70afd53c3fb31bb89f465e5b9fe65ac458a868bb0f06a5",
    },
    "CLAIM-STATUS": {
      count: 25,
      sha256: "09d95f60ac0bf591bc53f2acbebb9ddaea0c0c49f90efd7f6d9fb4095b7b6ab0",
    },
    "SERVICE-TYPE": {
      count: 40,
      sha256: "3d75a45b4148ab2ed7f0e5b7a1d655a148ec76425178ab50b21327a69d8f7cec",
    },
    "CLP-STATUS": {
      count: 10,
      sha256: "3ddc3ad59bfc5f71b5e9f3f038346d051b24135e9f42af721f85ec1255c944ca",
    },
    "MAINTENANCE-TYPE": {
      count: 9,
      sha256: "931caca746a13573d78acf77f58a1671ef91e59d3525c638f213e12b5378f181",
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
      codes: { ...CARC.codes, "1": "Deductible Amount (edited)" },
    };
    expect(digest(altered)).not.toBe(EXPECTED["CARC"]?.sha256);
  });
});

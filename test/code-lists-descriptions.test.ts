/**
 * Which bundled code lists ship description text, and how a caller supplies
 * its own.
 *
 * A bundled list ships descriptions only when its own redistribution record
 * says `"permitted"`. Every other list keeps its codes and its metadata and
 * returns no description: the codes still drive membership, the unknown-code
 * warnings and the 834 builder's refusal, exactly as before. A caller that
 * holds its own descriptions passes them to a lookup as `descriptions`.
 *
 * Every description in this file is made-up text: none is copied from any
 * published code list.
 */

import { describe, expect, it } from "vitest";

import {
  CARC,
  CLAIM_STATUS_CATEGORY_CODES,
  CLAIM_STATUS_CODES,
  CLP_STATUS,
  MAINTENANCE_TYPE_CODES,
  RARC,
  SERVICE_TYPE_CODES,
  checkCarcValidity,
  codeListRedistributionIsPermitted,
  lookupCarc,
  lookupClaimStatus,
  lookupClaimStatusCategory,
  lookupClpStatus,
  lookupMaintenanceType,
  lookupRarc,
  lookupServiceType,
} from "../src/index.js";
import type { CodeListEntry, CodeListLookupOptions, CodeListSnapshot } from "../src/index.js";

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

const RESTRICTED = ALL_SNAPSHOTS.filter(([, s]) => !codeListRedistributionIsPermitted(s.meta));
const PERMITTED = ALL_SNAPSHOTS.filter(([, s]) => codeListRedistributionIsPermitted(s.meta));

/** One bundled code per restricted list, with that list's lookup. */
const RESTRICTED_LOOKUPS: readonly (readonly [
  string,
  (code: string, options?: CodeListLookupOptions) => CodeListEntry | undefined,
  string,
])[] = [
  ["lookupCarc", lookupCarc, "45"],
  ["lookupClaimStatusCategory", lookupClaimStatusCategory, "A2"],
  ["lookupClaimStatus", lookupClaimStatus, "20"],
  ["lookupServiceType", lookupServiceType, "30"],
  ["lookupClpStatus", lookupClpStatus, "1"],
  ["lookupMaintenanceType", lookupMaintenanceType, "024"],
];

describe("a list whose record is not permitted ships no description", () => {
  it("the split is the one the records give, so the cases below are not vacuous", () => {
    expect(RESTRICTED.map(([name]) => name)).toEqual([
      "CARC",
      "CLAIM_STATUS_CATEGORY_CODES",
      "CLAIM_STATUS_CODES",
      "SERVICE_TYPE_CODES",
      "CLP_STATUS",
      "MAINTENANCE_TYPE_CODES",
    ]);
    expect(PERMITTED.map(([name]) => name)).toEqual(["RARC"]);
  });

  it.each(RESTRICTED)("%s: keeps its codes and carries no description for any", (name, snap) => {
    const entries = Object.entries(snap.codes);
    expect(entries.length, `${name} keeps its codes`).toBeGreaterThan(0);
    for (const [code, description] of entries) {
      expect(description, `${name} code ${code} carries a description`).toBeUndefined();
    }
  });

  it.each(PERMITTED)("%s: still carries a description for every code", (name, snap) => {
    for (const [code, description] of Object.entries(snap.codes)) {
      expect(typeof description, `${name} code ${code}`).toBe("string");
      expect(description?.length ?? 0, `${name} code ${code}`).toBeGreaterThan(0);
    }
  });

  it.each(RESTRICTED_LOOKUPS)(
    "%s: a bundled code still resolves, with no description",
    (name, lookup, code) => {
      const entry = lookup(code);
      expect(entry, `${name}(${code}) still answers membership`).toBeDefined();
      expect(entry?.code).toBe(code);
      expect(entry?.description).toBeUndefined();
      // The entry keeps its `description` key, so a caller reading it sees the
      // key with no text rather than no key; CARC adds its published dates.
      const keys =
        name === "lookupCarc" ? ["code", "dates", "description"] : ["code", "description"];
      expect(Object.keys(entry ?? {}).sort()).toEqual(keys);
      expect(Object.isFrozen(entry)).toBe(true);
    },
  );

  it("the CARC validity answer keeps its verdict and carries no description", () => {
    const answer = checkCarcValidity("1", "2026-06-27");
    expect(answer.validity).toBe("valid");
    expect(answer.description).toBeUndefined();
  });

  it("RARC, recorded as permitted, still describes its codes", () => {
    expect(typeof lookupRarc("N4")?.description).toBe("string");
  });
});

describe("a caller supplies its own descriptions through `descriptions`", () => {
  const OWN: Readonly<Record<string, string>> = {
    "45": "Synthetic note A for a test",
    "9999": "Synthetic note B for a code outside the bundled subset",
  };

  it("a bundled code takes the caller's text", () => {
    const entry = lookupCarc("45", { descriptions: OWN });
    expect(entry?.code).toBe("45");
    expect(entry?.description).toBe("Synthetic note A for a test");
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it("a bundled code keeps its published dates beside the caller's text", () => {
    const entry = lookupCarc("1", { descriptions: { "1": "Synthetic note C" } });
    expect(entry?.description).toBe("Synthetic note C");
    expect(entry?.dates?.start).toBe("1995-01-01");
  });

  it("a code outside the bundled subset that the caller describes is answered from that table", () => {
    expect(lookupCarc("9999", { descriptions: OWN })).toEqual({
      code: "9999",
      description: "Synthetic note B for a code outside the bundled subset",
    });
  });

  it("a code neither the bundle nor the caller knows is still undefined", () => {
    expect(lookupCarc("8888", { descriptions: OWN })).toBeUndefined();
  });

  it("a bundled code the caller does not describe has no description", () => {
    expect(lookupCarc("2", { descriptions: OWN })).toEqual({
      code: "2",
      description: undefined,
      dates: { start: "1995-01-01" },
    });
  });

  it("the caller's text replaces a permitted list's bundled text", () => {
    expect(lookupRarc("N4", { descriptions: { N4: "Synthetic note D" } })?.description).toBe(
      "Synthetic note D",
    );
  });

  it.each(RESTRICTED_LOOKUPS)("%s takes the option", (name, lookup, code) => {
    const entry = lookup(code, { descriptions: { [code]: `Synthetic note for ${name}` } });
    expect(entry?.code).toBe(code);
    expect(entry?.description).toBe(`Synthetic note for ${name}`);
  });

  it.each(["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"])(
    "an inherited key %s on the caller's table is never read as a description",
    (key) => {
      expect(lookupCarc(key, { descriptions: {} })).toBeUndefined();
      const inherited = Object.create({ "2": "inherited" }) as Readonly<Record<string, string>>;
      expect(lookupCarc("2", { descriptions: inherited })).toEqual({
        code: "2",
        description: undefined,
        dates: { start: "1995-01-01" },
      });
    },
  );

  it("a value that is not a string is ignored rather than returned", () => {
    const table = { "2": 42 } as unknown as Readonly<Record<string, string>>;
    expect(lookupCarc("2", { descriptions: table })?.description).toBeUndefined();
    expect(lookupCarc("9999", { descriptions: table })).toBeUndefined();
  });

  it("the caller's table is read, never changed", () => {
    const table = { "45": "Synthetic note E" };
    lookupCarc("45", { descriptions: table });
    expect(table).toEqual({ "45": "Synthetic note E" });
  });
});

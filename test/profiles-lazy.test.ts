/**
 * The built-in profiles are built on first read, not at import: `profiles.availity` and
 * `profiles.bcbsCommon` are own enumerable accessors on the frozen `profiles` object, and every
 * read answers the same frozen profile. Keys, spread, JSON and destructuring see what they saw
 * when the profiles were plain values.
 */

import { describe, expect, it } from "vitest";

import { defineProfile, profiles } from "../src/index.js";
import { AVAILITY_SPEC } from "../src/profiles/availity.js";
import { BCBS_COMMON_SPEC } from "../src/profiles/bcbsCommon.js";

describe("the built-in profiles are built on first read", () => {
  it("answers the same frozen profile on every read", () => {
    for (const key of ["availity", "bcbsCommon"] as const) {
      const first = profiles[key];
      expect(profiles[key]).toBe(first);
      expect(Object.isFrozen(first)).toBe(true);
      expect(first.name).toBe(key);
      const d = Object.getOwnPropertyDescriptor(profiles, key);
      expect(d).toHaveProperty("enumerable", true);
      expect(d).toHaveProperty("get");
      expect(d).not.toHaveProperty("value");
    }
    expect(Object.isFrozen(profiles)).toBe(true);
  });

  it("keeps keys, spread, JSON and destructuring as they were", () => {
    expect(Object.keys(profiles)).toEqual(["availity", "bcbsCommon"]);
    const { availity, bcbsCommon } = profiles;
    expect({ ...profiles }).toEqual({ availity, bcbsCommon });
    expect({ ...profiles }.availity).toBe(availity);
    expect(JSON.stringify(profiles)).toBe(JSON.stringify({ availity, bcbsCommon }));
  });

  it("builds each from its spec, as defineProfile would describe it", () => {
    expect(profiles.availity.describe()).toEqual(defineProfile(AVAILITY_SPEC).describe());
    expect(profiles.bcbsCommon.describe()).toEqual(defineProfile(BCBS_COMMON_SPEC).describe());
  });
});

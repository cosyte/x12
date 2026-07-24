/**
 * Phase 9 profile-system machinery tests: `defineProfile` validation +
 * composition, the structured `describe()` record, the process-scoped default
 * profile, `partitionWarnings`, parse-time attribution, and immutability.
 *
 * Built-in fixture grounding (the locked hard rule - every quirk demonstrated
 * by a real Tier-2 fixture) is verified separately in
 * `test/profiles-builtins.test.ts`.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  WARNING_CODES,
  X12ProfileError,
  controlNumberMismatch,
  defineProfile,
  getDefaultProfile,
  parseX12,
  partitionWarnings,
  profiles,
  setDefaultProfile,
  trailingGarbage,
} from "../src/index.js";
import type { X12Profile, X12ProfileQuirk } from "../src/index.js";

/** A minimal, hard-rule-satisfying quirk pointing at a real fixture. */
function quirk(overrides: Partial<X12ProfileQuirk> = {}): X12ProfileQuirk {
  return {
    id: "payer-loop-ref-2u",
    effect: "adds",
    summary: "Payer Loop 1000A carries a REF*2U.",
    fixture: "remit/835-availity-quirk.edi",
    sourceCategory: "test source category",
    ...overrides,
  };
}

/** A valid 005010 envelope with no deviations - produces zero warnings. */
const CLEAN_ENVELOPE =
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*000000001*0*P*:~" +
  "GS*HC*S*R*20250101*1200*1*X*005010X222A2~ST*837*0001~SE*2*0001~GE*1*1~IEA*1*000000001~";

afterEach(() => {
  // The default profile is the only mutable module-scoped state - reset it
  // after every test so registrations cannot bleed across files.
  setDefaultProfile(null);
});

describe("defineProfile - basic assembly", () => {
  it("builds a single-profile (no extends) with lineage = [name]", () => {
    const p = defineProfile({ name: "acme", quirks: [quirk()] });
    expect(p.name).toBe("acme");
    expect(p.lineage).toEqual(["acme"]);
    expect(p.quirks).toHaveLength(1);
    expect(p.quirks[0]?.id).toBe("payer-loop-ref-2u");
  });

  it("attaches a structured describe() bucketed by effect", () => {
    const p = defineProfile({
      name: "acme",
      description: "Acme conventions",
      quirks: [
        quirk({ id: "a-relax", effect: "relaxes" }),
        quirk({ id: "b-add", effect: "adds" }),
        quirk({ id: "c-require", effect: "requires" }),
      ],
    });
    const d = p.describe();
    expect(d.name).toBe("acme");
    expect(d.description).toBe("Acme conventions");
    expect(d.lineage).toEqual(["acme"]);
    expect(d.relaxes.map((q) => q.id)).toEqual(["a-relax"]);
    expect(d.adds.map((q) => q.id)).toEqual(["b-add"]);
    expect(d.requires.map((q) => q.id)).toEqual(["c-require"]);
  });

  it("describe().expectedWarnings is the sorted, de-duplicated union across quirks", () => {
    const p = defineProfile({
      name: "acme",
      quirks: [
        quirk({
          id: "a",
          expectedWarnings: [WARNING_CODES.X12_TRAILING_GARBAGE, WARNING_CODES.X12_MISSING_IEA],
        }),
        quirk({ id: "b", expectedWarnings: [WARNING_CODES.X12_TRAILING_GARBAGE] }),
      ],
    });
    expect(p.describe().expectedWarnings).toEqual([
      WARNING_CODES.X12_MISSING_IEA,
      WARNING_CODES.X12_TRAILING_GARBAGE,
    ]);
  });

  it("omits description from describe() when none is supplied", () => {
    const d = defineProfile({ name: "acme" }).describe();
    expect("description" in d).toBe(false);
    expect(d.relaxes).toEqual([]);
    expect(d.expectedWarnings).toEqual([]);
  });
});

describe("defineProfile - validation", () => {
  it("throws on missing/empty name", () => {
    expect(() => defineProfile({ name: "" })).toThrow(X12ProfileError);
    // @ts-expect-error - exercising a JS caller passing a non-string name.
    expect(() => defineProfile({ name: 123 })).toThrow(/non-empty string/u);
  });

  it("throws on an unknown option key with a did-you-mean hint", () => {
    // @ts-expect-error - exercising an unknown key.
    expect(() => defineProfile({ name: "acme", quirk: [] })).toThrow(/Did you mean 'quirks'/u);
  });

  it("throws on a far-off unknown key without a hint", () => {
    // @ts-expect-error - a key far from every known option (no hint emitted).
    expect(() => defineProfile({ name: "acme", zzzzzzzz: 1 })).toThrow(/unknown option key/u);
  });

  it("enforces the hard rule - a quirk without a fixture is rejected", () => {
    expect(() =>
      // @ts-expect-error - omitting the required fixture field.
      defineProfile({ name: "acme", quirks: [{ ...quirk(), fixture: undefined }] }),
    ).toThrow(/must cite a 'fixture'/u);
  });

  it("rejects a malformed fixture path (absolute / parent escape)", () => {
    expect(() =>
      defineProfile({ name: "acme", quirks: [quirk({ fixture: "/etc/passwd" })] }),
    ).toThrow(X12ProfileError);
    expect(() => defineProfile({ name: "acme", quirks: [quirk({ fixture: "nodir" })] })).toThrow(
      X12ProfileError,
    );
  });

  it("rejects an invalid effect", () => {
    // @ts-expect-error - invalid effect literal.
    expect(() => defineProfile({ name: "acme", quirks: [quirk({ effect: "removes" })] })).toThrow(
      /invalid effect/u,
    );
  });

  it("rejects a duplicate quirk id", () => {
    expect(() =>
      defineProfile({ name: "acme", quirks: [quirk({ id: "dup" }), quirk({ id: "dup" })] }),
    ).toThrow(/duplicate quirk id/u);
  });

  it("rejects a non-kebab quirk id", () => {
    expect(() => defineProfile({ name: "acme", quirks: [quirk({ id: "Bad_Id" })] })).toThrow(
      /kebab-case/u,
    );
  });

  it("rejects an expectedWarnings code outside WARNING_CODES", () => {
    expect(() =>
      defineProfile({
        name: "acme",
        // @ts-expect-error - not a real warning code.
        quirks: [quirk({ expectedWarnings: ["X12_NOT_A_REAL_CODE"] })],
      }),
    ).toThrow(/unknown expected warning/u);
  });

  it("throws when the options object itself is null/undefined", () => {
    // @ts-expect-error - exercising a JS caller passing null.
    expect(() => defineProfile(null)).toThrow(/options is required/u);
    // @ts-expect-error - exercising a JS caller passing undefined.
    expect(() => defineProfile(undefined)).toThrow(/options is required/u);
  });

  it("rejects a non-object quirk entry", () => {
    // @ts-expect-error - a null quirk slot.
    expect(() => defineProfile({ name: "acme", quirks: [null] })).toThrow(/must be an object/u);
  });

  it("rejects an empty summary and an empty sourceCategory", () => {
    expect(() => defineProfile({ name: "acme", quirks: [quirk({ summary: "  " })] })).toThrow(
      /non-empty summary/u,
    );
    expect(() => defineProfile({ name: "acme", quirks: [quirk({ sourceCategory: "" })] })).toThrow(
      /non-empty sourceCategory/u,
    );
  });
});

describe("defineProfile - extends composition", () => {
  it("flattens + dedupes lineage and merges quirks additively", () => {
    const base = defineProfile({ name: "base", quirks: [quirk({ id: "base-quirk" })] });
    const child = defineProfile({
      name: "child",
      extends: base,
      quirks: [quirk({ id: "child-quirk" })],
    });
    expect(child.lineage).toEqual(["base", "child"]);
    expect(child.quirks.map((q) => q.id)).toEqual(["base-quirk", "child-quirk"]);
  });

  it("child wins on quirk-id collision while keeping first-seen position", () => {
    const base = defineProfile({
      name: "base",
      quirks: [quirk({ id: "shared", summary: "from base" }), quirk({ id: "base-only" })],
    });
    const child = defineProfile({
      name: "child",
      extends: base,
      quirks: [quirk({ id: "shared", summary: "from child" })],
    });
    expect(child.quirks.map((q) => q.id)).toEqual(["shared", "base-only"]);
    expect(child.quirks.find((q) => q.id === "shared")?.summary).toBe("from child");
  });

  it("description is last-wins (child overrides, else last parent)", () => {
    const base = defineProfile({ name: "base", description: "base desc" });
    expect(defineProfile({ name: "c", extends: base }).description).toBe("base desc");
    expect(defineProfile({ name: "c", extends: base, description: "own" }).description).toBe("own");
  });

  it("supports an array of parents", () => {
    const a = defineProfile({ name: "a", quirks: [quirk({ id: "a-q" })] });
    const b = defineProfile({ name: "b", quirks: [quirk({ id: "b-q" })] });
    const c = defineProfile({ name: "c", extends: [a, b] });
    expect(c.lineage).toEqual(["a", "b", "c"]);
    expect(c.quirks.map((q) => q.id)).toEqual(["a-q", "b-q"]);
  });

  it("dedupes overlapping ancestor lineages (diamond)", () => {
    const base = defineProfile({ name: "base" });
    const mid = defineProfile({ name: "mid", extends: base });
    // Both parents share "base" in their lineage - it must appear once.
    const leaf = defineProfile({ name: "leaf", extends: [base, mid] });
    expect(leaf.lineage).toEqual(["base", "mid", "leaf"]);
  });

  it("falls back to [parent.name] when a hand-crafted parent has an empty lineage", () => {
    // A profile NOT produced by defineProfile (lineage never empty there) -
    // covers the defensive fallback in mergeLineage.
    const rogue = {
      name: "rogue",
      lineage: [],
      quirks: [],
      describe: () => undefined,
    } as unknown as X12Profile;
    const child = defineProfile({ name: "child", extends: rogue });
    expect(child.lineage).toEqual(["rogue", "child"]);
  });
});

describe("default profile - process-scoped", () => {
  it("is unset initially", () => {
    expect(getDefaultProfile()).toBeUndefined();
  });

  it("parseX12 attaches the default profile when none is passed explicitly", () => {
    setDefaultProfile(profiles.availity);
    const ix = parseX12(CLEAN_ENVELOPE);
    expect(ix.profile?.name).toBe("availity");
  });

  it("an explicit profile wins over the default", () => {
    setDefaultProfile(profiles.availity);
    const ix = parseX12(CLEAN_ENVELOPE, { profile: profiles.bcbsCommon });
    expect(ix.profile?.name).toBe("bcbsCommon");
  });

  it("{ profile: null } opts out of the default for a single call", () => {
    setDefaultProfile(profiles.availity);
    const ix = parseX12(CLEAN_ENVELOPE, { profile: null });
    expect(ix.profile).toBeUndefined();
  });

  it("setDefaultProfile(null) clears the registration", () => {
    setDefaultProfile(profiles.availity);
    setDefaultProfile(null);
    expect(getDefaultProfile()).toBeUndefined();
  });
});

describe("parse-time attribution", () => {
  it("omits ix.profile when no profile is in effect", () => {
    const ix = parseX12(CLEAN_ENVELOPE);
    expect("profile" in ix).toBe(false);
  });

  it("attaches an explicitly-passed profile", () => {
    const ix = parseX12(CLEAN_ENVELOPE, { profile: profiles.availity });
    expect(ix.profile).toBe(profiles.availity);
  });
});

describe("partitionWarnings", () => {
  it("splits warnings into expected (in the profile union) and unexpected", () => {
    const tolerant = defineProfile({
      name: "tolerant",
      quirks: [quirk({ expectedWarnings: [WARNING_CODES.X12_TRAILING_GARBAGE] })],
    });
    const warnings = [
      trailingGarbage({ segmentIndex: 6, interchangeIndex: 0 }, 12),
      controlNumberMismatch(
        { segmentIndex: 1, interchangeIndex: 0, elementIndex: 2 },
        "ISA-13/IEA-02",
        "000000001",
        "000000002",
      ),
    ];
    const { expected, unexpected } = partitionWarnings(warnings, tolerant);
    expect(expected.map((w) => w.code)).toEqual([WARNING_CODES.X12_TRAILING_GARBAGE]);
    expect(unexpected.map((w) => w.code)).toEqual([WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH]);
  });

  it("treats every warning as unexpected when the profile expects none", () => {
    const w = [trailingGarbage({ segmentIndex: 6, interchangeIndex: 0 }, 12)];
    const { expected, unexpected } = partitionWarnings(w, profiles.availity);
    expect(expected).toHaveLength(0);
    expect(unexpected).toHaveLength(1);
  });
});

describe("immutability", () => {
  it("freezes the profile, its quirks array, and the describe() record", () => {
    const p = defineProfile({ name: "acme", quirks: [quirk()] });
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.quirks)).toBe(true);
    expect(Object.isFrozen(p.lineage)).toBe(true);
    const d = p.describe();
    expect(Object.isFrozen(d)).toBe(true);
    expect(Object.isFrozen(d.adds)).toBe(true);
    expect(Object.isFrozen(d.expectedWarnings)).toBe(true);
  });

  it("the profiles namespace is frozen", () => {
    expect(Object.isFrozen(profiles)).toBe(true);
  });
});

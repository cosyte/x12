/**
 * THE CONFORMANCE CLASSIFICATION. A profile quirk records that a trading
 * partner deviates from the baseline. This suite locks the second half of that
 * record: whether the partner could LAWFULLY have required the deviation at
 * all, measured against 45 CFR 162.915.
 *
 * Why the honesty matters to a consumer: a quirk that says "this partner
 * requires X" is otherwise indistinguishable from "X is a supported
 * requirement", and a consumer reading `describe()` cannot tell a lawful
 * companion-guide convention from a partner deviating from the adopted
 * standard. 162.915 forbids a covered entity from entering a trading partner
 * agreement that changes the definition, data condition or use of an element,
 * adds elements or segments to the maximum defined data set, uses anything
 * marked "not used" in the implementation specification, or changes that
 * specification's meaning or intent.
 *
 * Three states, and the fail-safe is the whole design:
 *
 *   permitted      a recorded judgement that 162.915 is not engaged
 *   not-permitted  a recorded judgement that it is: a partner deviation
 *   undetermined   NO judgement was recorded. The DEFAULT.
 *
 * The direction that would be dangerous to get wrong is `permitted`, because a
 * consumer who reads it may build an integration around the deviation. So
 * nothing but an explicitly recorded `"permitted"` ever produces it, and every
 * other input - an omitted field, an out-of-enum value from a profile that
 * bypassed `defineProfile` - resolves to `undetermined`. That asymmetry is
 * asserted below in both directions rather than assumed.
 *
 * **None of this is a machine check, and the tests must not read as one.**
 * Whether an element is marked "not used" in an adopted implementation
 * specification is not checkable here: 45 CFR 162.920(a) states a fee is
 * charged for those specifications and none is bundled with this package. A
 * classification is a recorded human judgement. `KNOWN-LIMITATIONS.md` says so
 * to consumers, and the built-in judgements are asserted in
 * `test/profiles-builtins.test.ts`, against the table that recorded them.
 */

import { describe, expect, it } from "vitest";

import { defineProfile, profiles } from "../src/index.js";
import type {
  X12ClassifiedQuirk,
  X12Profile,
  X12ProfileDescription,
  X12ProfileQuirk,
} from "../src/index.js";

/** A minimal hard-rule-satisfying quirk citing a real committed fixture. */
function quirk(overrides: Partial<X12ProfileQuirk> = {}): X12ProfileQuirk {
  return {
    id: "payer-loop-ref-2u",
    effect: "adds",
    summary: "Payer Loop 1000A carries a REF*2U.",
    fixture: "remit/835-availity-quirk.edi",
    sourceCategory: "conformance suite source category",
    ...overrides,
  };
}

/** Every quirk on a description, whichever effect bucket it landed in. */
function allRendered(d: X12ProfileDescription): readonly X12ClassifiedQuirk[] {
  return [...d.relaxes, ...d.adds, ...d.requires];
}

const CALLER_PROFILES: readonly X12Profile[] = [
  defineProfile({
    name: "mixed-conformance",
    quirks: [
      quirk({ id: "recorded-permitted", effect: "relaxes", conformance: "permitted" }),
      quirk({ id: "recorded-not-permitted", effect: "requires", conformance: "not-permitted" }),
      quirk({ id: "recorded-undetermined", effect: "adds", conformance: "undetermined" }),
      quirk({ id: "recorded-nothing", effect: "adds" }),
    ],
  }),
];

const DESCRIBED: readonly X12Profile[] = [...Object.values(profiles), ...CALLER_PROFILES];

// ---------------------------------------------------------------------------
// A2 - describe() states the conformance of every quirk it renders.
// ---------------------------------------------------------------------------

describe("describe() states, per quirk, whether a partner may lawfully require it", () => {
  it("has profiles with quirks to describe (a vacuous sweep would pass)", () => {
    expect(DESCRIBED.length).toBeGreaterThan(0);
    expect(DESCRIBED.flatMap((p) => p.quirks).length).toBeGreaterThan(0);
  });

  for (const profile of DESCRIBED) {
    describe(profile.name, () => {
      it("renders one of the three states on every quirk, and never leaves one silent", () => {
        const rendered = allRendered(profile.describe());
        expect(rendered).toHaveLength(profile.quirks.length);
        for (const q of rendered) {
          expect(
            ["permitted", "not-permitted", "undetermined"],
            `quirk '${q.id}' rendered conformance ${JSON.stringify(q.conformance)}`,
          ).toContain(q.conformance);
        }
      });

      it("keeps describing the deviation itself: id, effect and summary survive", () => {
        const rendered = allRendered(profile.describe());
        expect(rendered.map((q) => q.id).sort()).toEqual(profile.quirks.map((q) => q.id).sort());
        for (const authored of profile.quirks) {
          const asRendered = rendered.find((q) => q.id === authored.id);
          expect(asRendered?.effect).toBe(authored.effect);
          expect(asRendered?.summary).toBe(authored.summary);
          expect(asRendered?.fixture).toBe(authored.fixture);
        }
      });

      it("partitions the same quirks by state: every quirk in exactly one group", () => {
        const d = profile.describe();
        const grouped = [
          ...d.conformance.permitted,
          ...d.conformance.notPermitted,
          ...d.conformance.undetermined,
        ];
        expect(grouped.map((q) => q.id).sort()).toEqual(
          allRendered(d)
            .map((q) => q.id)
            .sort(),
        );
        expect(new Set(grouped.map((q) => q.id)).size).toBe(grouped.length);
        for (const q of d.conformance.permitted) expect(q.conformance).toBe("permitted");
        for (const q of d.conformance.notPermitted) expect(q.conformance).toBe("not-permitted");
        for (const q of d.conformance.undetermined) expect(q.conformance).toBe("undetermined");
      });
    });
  }

  it("reports a recorded permitted judgement as permitted, and only where recorded", () => {
    const d = CALLER_PROFILES[0]?.describe();
    expect(d?.conformance.permitted.map((q) => q.id)).toEqual(["recorded-permitted"]);
    expect(d?.conformance.notPermitted.map((q) => q.id)).toEqual(["recorded-not-permitted"]);
    expect(d?.conformance.undetermined.map((q) => q.id)).toEqual([
      "recorded-undetermined",
      "recorded-nothing",
    ]);
  });

  it("freezes the conformance groups with the rest of the record", () => {
    const d = defineProfile({ name: "frozen", quirks: [quirk()] }).describe();
    expect(Object.isFrozen(d.conformance)).toBe(true);
    expect(Object.isFrozen(d.conformance.permitted)).toBe(true);
    expect(Object.isFrozen(d.conformance.notPermitted)).toBe(true);
    expect(Object.isFrozen(d.conformance.undetermined)).toBe(true);
    expect(Object.isFrozen(d.adds[0])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// A7 - the fail-safe default.
// ---------------------------------------------------------------------------

describe("an unrecorded judgement renders as undetermined, never as permitted", () => {
  it("renders a quirk that says nothing as undetermined", () => {
    const p = defineProfile({ name: "silent", quirks: [quirk({ id: "says-nothing" })] });
    const d = p.describe();
    expect(d.adds[0]?.conformance).toBe("undetermined");
    expect(d.conformance.undetermined.map((q) => q.id)).toEqual(["says-nothing"]);
    expect(d.conformance.permitted).toEqual([]);
    expect(d.conformance.notPermitted).toEqual([]);
  });

  it("renders every effect bucket's unrecorded quirk as undetermined, not just `adds`", () => {
    // The default must not depend on WHICH deviation the quirk describes. A
    // `relaxes` quirk looks harmless and a `requires` quirk looks weighty, and
    // neither is evidence about 162.915.
    const p = defineProfile({
      name: "silent-everywhere",
      quirks: [
        quirk({ id: "silent-relax", effect: "relaxes" }),
        quirk({ id: "silent-add", effect: "adds" }),
        quirk({ id: "silent-require", effect: "requires" }),
      ],
    });
    const d = p.describe();
    expect(d.relaxes[0]?.conformance).toBe("undetermined");
    expect(d.adds[0]?.conformance).toBe("undetermined");
    expect(d.requires[0]?.conformance).toBe("undetermined");
    expect(d.conformance.permitted).toEqual([]);
  });

  it("resolves an out-of-enum value to undetermined rather than honouring it", () => {
    // A hand-crafted profile object that never went through `defineProfile`,
    // or a JS caller reaching a slot the types say is unreachable. The render
    // path is the second line of defence and it fails SAFE: the value is not
    // one of the two that make a claim, so it makes none.
    const forged = {
      name: "forged",
      lineage: ["forged"],
      quirks: [{ ...quirk({ id: "forged-quirk" }), conformance: "Permitted" }],
    } as unknown as X12Profile;
    const real = defineProfile({ name: "wrapper", extends: forged });
    const d = real.describe();
    expect(d.adds[0]?.conformance).toBe("undetermined");
    expect(d.conformance.permitted).toEqual([]);
  });

  it("never turns an unrecorded quirk into a permitted one through composition", () => {
    // A child inheriting a parent's quirk must not acquire a claim the parent
    // never made, and must not lose one the parent DID make.
    const parent = defineProfile({
      name: "parent",
      quirks: [
        quirk({ id: "inherited-silent" }),
        quirk({ id: "inherited-permitted", effect: "relaxes", conformance: "permitted" }),
      ],
    });
    const child = defineProfile({ name: "child", extends: parent });
    const d = child.describe();
    expect(d.conformance.undetermined.map((q) => q.id)).toEqual(["inherited-silent"]);
    expect(d.conformance.permitted.map((q) => q.id)).toEqual(["inherited-permitted"]);
  });
});

// ---------------------------------------------------------------------------
// A3 - a requires quirk over a "not used" element is a partner deviation.
// ---------------------------------------------------------------------------

/**
 * A caller-defined profile whose `requires` quirk declares that a partner
 * mandates an element the adopted implementation guide marks "not used". That
 * is 45 CFR 162.915(c) squarely: a trading partner agreement may not use any
 * code or data element marked "not used" in the standard's implementation
 * specification. The classification is the RECORDED judgement of whoever read
 * the guide, not something this library derived - see the file header.
 */
const NOT_USED_REQUIREMENT: X12Profile = defineProfile({
  name: "partner-requires-not-used",
  description: "Partner mandates an element the adopted guide marks not used",
  quirks: [
    {
      id: "requires-not-used-element",
      effect: "requires",
      summary:
        "Partner mandates a service-line REF the adopted implementation guide marks not used.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "companion guide mandating an element the adopted guide marks not used",
      conformance: "not-permitted",
    },
    // A second `requires` quirk that records NOTHING, so the assertions below
    // can distinguish "this library classified it" from "the bucket did".
    {
      id: "requires-unrecorded",
      effect: "requires",
      summary: "Partner mandates a normally-situational element; nothing recorded about the rule.",
      fixture: "remit/835-availity-quirk.edi",
      sourceCategory: "companion guide with no recorded conformance judgement",
    },
  ],
});

describe("a partner requiring a not-used element is a deviation, not a supported requirement", () => {
  const d = NOT_USED_REQUIREMENT.describe();

  it("still describes the requirement: the quirk is not dropped or softened", () => {
    // The profile's job is to say what the partner sends. Classifying the
    // deviation must not delete the description of it.
    expect(d.requires.map((q) => q.id)).toEqual([
      "requires-not-used-element",
      "requires-unrecorded",
    ]);
    expect(d.requires[0]?.summary).toContain("not used");
  });

  it("classifies it as a partner deviation", () => {
    expect(d.requires[0]?.conformance).toBe("not-permitted");
    expect(d.conformance.notPermitted.map((q) => q.id)).toEqual(["requires-not-used-element"]);
  });

  it("never classifies it as one a partner may lawfully require", () => {
    expect(d.requires[0]?.conformance).not.toBe("permitted");
    expect(d.conformance.permitted).toEqual([]);
    expect(d.conformance.permitted.map((q) => q.id)).not.toContain("requires-not-used-element");
  });

  it("does not read membership of the `requires` bucket as a supported requirement", () => {
    // The load-bearing assertion. `requires` records what the PARTNER mandates
    // and says nothing about whether the standard supports the mandate: the
    // second `requires` quirk records no judgement and comes back undetermined,
    // so the bucket cannot be the thing conferring lawfulness. If a future
    // change ever inferred `permitted` from the effect, this reds.
    const permittedIds = new Set(d.conformance.permitted.map((q) => q.id));
    for (const q of d.requires) expect(permittedIds.has(q.id)).toBe(false);
    expect(d.requires[1]?.conformance).toBe("undetermined");
  });

  it("keeps the not-used judgement through composition into a consumer's own profile", () => {
    // A consumer extending a partner profile inherits the judgement rather
    // than washing it out.
    const consumer = defineProfile({ name: "consumer", extends: NOT_USED_REQUIREMENT });
    const cd = consumer.describe();
    expect(cd.conformance.notPermitted.map((q) => q.id)).toEqual(["requires-not-used-element"]);
    expect(cd.conformance.permitted).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// A10 - a profile with no quirks makes no claim of any kind.
// ---------------------------------------------------------------------------

describe("a profile carrying no quirks makes no conformance claim", () => {
  it("returns empty relaxes / adds / requires buckets", () => {
    const d = defineProfile({ name: "empty" }).describe();
    expect(d.relaxes).toEqual([]);
    expect(d.adds).toEqual([]);
    expect(d.requires).toEqual([]);
  });

  it("returns no conformance claim in any of the three states", () => {
    const d = defineProfile({ name: "empty" }).describe();
    expect(d.conformance.permitted).toEqual([]);
    expect(d.conformance.notPermitted).toEqual([]);
    expect(d.conformance.undetermined).toEqual([]);
  });

  it("says the same for a profile whose only content is an empty quirks array", () => {
    const d = defineProfile({ name: "empty-array", quirks: [] }).describe();
    expect([...d.relaxes, ...d.adds, ...d.requires]).toEqual([]);
    expect([
      ...d.conformance.permitted,
      ...d.conformance.notPermitted,
      ...d.conformance.undetermined,
    ]).toEqual([]);
  });

  it("says the same for a profile that inherits an empty parent", () => {
    const parent = defineProfile({ name: "empty-parent" });
    const d = defineProfile({ name: "empty-child", extends: parent }).describe();
    expect(d.conformance.undetermined).toEqual([]);
    expect(d.expectedWarnings).toEqual([]);
  });
});

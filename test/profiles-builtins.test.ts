/**
 * Phase 9 accuracy gate - the locked HARD RULE, enforced in tests:
 *
 *   "A profile entry without a Tier-2 fixture demonstrating the deviation is
 *    forbidden. No invented quirks."
 *
 * For every shipped built-in profile, every quirk MUST (a) cite a fixture
 * file that EXISTS under `test/fixtures/`, (b) parse without throwing, and
 * (c) actually EXHIBIT the claimed deviation - verified by a per-quirk
 * DEMONSTRATOR below. The demonstrator registry is keyed by
 * `${profile.name}/${quirk.id}`: a quirk with NO demonstrator entry fails the
 * suite, so a new built-in cannot ship a real-but-irrelevant fixture and slip
 * past a generic exists+parses check. A demonstrator whose assertion does not
 * hold is a bug this suite catches before the profile ships.
 *
 * Also documents profile-on / profile-off divergence: a v1 profile attaches
 * attribution but NEVER silently swallows data - the parsed groups + warnings
 * are byte-identical with and without the profile.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { get835, parseX12, profiles } from "../src/index.js";
import type { X12Profile, X12ProfileConformance } from "../src/index.js";

const FIXTURE_ROOT = join(__dirname, "fixtures");

function readFixture(relPath: string): string {
  return readFileSync(join(FIXTURE_ROOT, relPath), "utf8").trimEnd();
}

const ALL_BUILTINS: readonly X12Profile[] = Object.values(profiles);

/**
 * Per-quirk demonstrators, keyed by `${profile.name}/${quirk.id}`. Each
 * asserts - against the quirk's OWN cited fixture - that the deviation the
 * quirk claims is actually present. Every shipped quirk MUST appear here
 * (enforced below), so the hard rule cannot be satisfied by a fixture that
 * merely exists and parses.
 */
const DEMONSTRATORS: Record<string, (raw: string) => void> = {
  "availity/payer-loop-ref-2u": (raw) => {
    const remit = read835(raw);
    expect(remit.payer?.additionalIdentifiers.some((r) => r.qualifier === "2U")).toBe(true);
  },
  "availity/service-line-ref-f8": (raw) => {
    const remit = read835(raw);
    expect(remit.claims[0]?.serviceLines[0]?.references.some((r) => r.qualifier === "F8")).toBe(
      true,
    );
  },
  "bcbsCommon/backslash-component-separator": (raw) => {
    const ix = parseX12(raw);
    expect(ix.delimiters.component).toBe("\\");
    expect(ix.delimiters.component).not.toBe(":");
  },
};

function read835(raw: string) {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
  if (tx === undefined) throw new Error("no 835 transaction in fixture");
  const remit = get835(ix.delimiters, tx);
  if (remit === undefined) throw new Error("get835 returned undefined for fixture");
  return remit;
}

describe("built-in profiles - hard rule: every quirk is fixture-grounded", () => {
  it("ships at least one built-in profile", () => {
    expect(ALL_BUILTINS.length).toBeGreaterThan(0);
  });

  for (const profile of ALL_BUILTINS) {
    for (const q of profile.quirks) {
      const key = `${profile.name}/${q.id}`;

      it(`${key} cites a fixture that exists and parses`, () => {
        expect(q.fixture).toBeTruthy();
        expect(existsSync(join(FIXTURE_ROOT, q.fixture))).toBe(true);
        expect(() => parseX12(readFixture(q.fixture))).not.toThrow();
      });

      it(`${key} has a demonstrator that proves the deviation in its fixture`, () => {
        const demonstrate = DEMONSTRATORS[key];
        // A quirk with no demonstrator is a hard-rule violation: we cannot
        // claim the fixture exhibits the deviation if nothing asserts it.
        expect(demonstrate, `no demonstrator registered for ${key}`).toBeTypeOf("function");
        demonstrate?.(readFixture(q.fixture));
      });
    }
  }

  it("registers no demonstrator for a quirk that no built-in ships", () => {
    const shipped = new Set(ALL_BUILTINS.flatMap((p) => p.quirks.map((q) => `${p.name}/${q.id}`)));
    for (const key of Object.keys(DEMONSTRATORS)) {
      expect(shipped.has(key), `demonstrator '${key}' has no matching shipped quirk`).toBe(true);
    }
  });
});

/**
 * THE RECORDED CONFORMANCE JUDGEMENTS, keyed the same way the demonstrators
 * are. Each says whether a trading partner may lawfully require the deviation
 * under 45 CFR 162.915, and each is a RECORDED HUMAN JUDGEMENT rather than
 * something this library checked: whether an element is marked "not used" in
 * an adopted implementation guide is not machine-checkable here, because 45 CFR
 * 162.920(a) states a fee is charged for the implementation specifications and
 * none is bundled with this package.
 *
 * The reasoning behind each sits beside the quirk in `src/profiles/`. In short:
 *
 * - `bcbsCommon/backslash-component-separator` is PERMITTED. ISA-16 is the
 *   element whose job is to declare the component separator and the sender
 *   declares it in band, so none of 162.915(a) to (d) is engaged.
 * - both `availity` quirks are UNDETERMINED. Whether a partner may lawfully
 *   require an extra REF turns on whether that segment sits inside the adopted
 *   remittance guide's maximum defined data set (162.915(b), (c)), and no
 *   readable copy of that guide was available. Describing that Availity SENDS
 *   the segment is a different claim and is unaffected.
 *
 * Asserted BOTH ways, like the demonstrator registry: a shipped quirk with no
 * entry here fails, and an entry here for a quirk nobody ships fails. So a new
 * built-in cannot ship an unclassified quirk, and a classification cannot
 * outlive the quirk it was recorded for.
 */
const RECORDED_CONFORMANCE: Record<string, X12ProfileConformance> = {
  "bcbsCommon/backslash-component-separator": "permitted",
  "availity/payer-loop-ref-2u": "undetermined",
  "availity/service-line-ref-f8": "undetermined",
};

describe("built-in profiles - the recorded conformance judgements", () => {
  for (const profile of ALL_BUILTINS) {
    const described = profile.describe();
    const rendered = [...described.relaxes, ...described.adds, ...described.requires];

    for (const q of profile.quirks) {
      const key = `${profile.name}/${q.id}`;

      it(`${key} reports the recorded classification and no other`, () => {
        const expected = RECORDED_CONFORMANCE[key];
        expect(expected, `no recorded conformance judgement for ${key}`).toBeTypeOf("string");
        expect(rendered.find((r) => r.id === q.id)?.conformance).toBe(expected);
      });
    }
  }

  it("records no judgement for a quirk that no built-in ships", () => {
    const shipped = new Set(ALL_BUILTINS.flatMap((p) => p.quirks.map((q) => `${p.name}/${q.id}`)));
    for (const key of Object.keys(RECORDED_CONFORMANCE)) {
      expect(shipped.has(key), `recorded judgement '${key}' has no matching shipped quirk`).toBe(
        true,
      );
    }
  });

  it("claims nothing is lawfully requirable that the table does not say is", () => {
    // The dangerous direction, stated as a property of the SHIPPED set rather
    // than quirk by quirk: exactly the entries recorded `permitted` may appear
    // in the permitted group, so a quirk that silently acquired the claim reds
    // here even if someone also edited its own assertion above.
    const expectedPermitted = Object.entries(RECORDED_CONFORMANCE)
      .filter(([, state]) => state === "permitted")
      .map(([key]) => key)
      .sort();
    const actualPermitted = ALL_BUILTINS.flatMap((p) =>
      p.describe().conformance.permitted.map((q) => `${p.name}/${q.id}`),
    ).sort();
    expect(actualPermitted).toEqual(expectedPermitted);
  });
});

describe("profile-on / profile-off divergence - attribution only, no data loss", () => {
  it("parses identical groups + warnings with and without a profile", () => {
    const raw = readFixture("remit/835-availity-quirk.edi");
    const off = parseX12(raw);
    const on = parseX12(raw, { profile: profiles.availity });

    // The only difference is attribution.
    expect(on.profile?.name).toBe("availity");
    expect("profile" in off).toBe(false);

    // No data is swallowed: the lenient parse is byte-identical.
    expect(on.warnings).toEqual(off.warnings);
    expect(on.groups).toEqual(off.groups);
    expect(on.isa).toEqual(off.isa);
  });
});

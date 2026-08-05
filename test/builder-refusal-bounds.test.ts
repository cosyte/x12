/**
 * The bound gate for `@cosyte/x12`'s refusal messages: every `build*` refusal
 * (`X12-BUILDER-BOUNDS`) and every `defineProfile()` refusal
 * (`X12-CALLER-VALUE-RESIDUALS`).
 *
 * **The profile half was filed by `X12-BUILDER-BOUNDS` and deliberately not
 * fixed by it**, because it sat outside that item's `build*` scope. The gate
 * was widened rather than copied: `src/profiles/validate.ts` joins the scanned
 * modules and `X12ProfileError` joins the matched constructors, so one
 * allowlist governs both and a new refusal site in either place is caught by
 * the same walk.
 *
 * **The source scan is the deliverable, and it is the exhaustive half.** The
 * behavioural assertions below and in the eight per-builder suites drive a
 * 120,000-character value into the sites that are cheap to reach, which is
 * strong evidence but not coverage. What covers every site is
 * {@link SANCTIONED_HOLES}: it walks every `throw new *BuildError(...)` in
 * every builder module, extracts every `${...}` interpolation, and requires
 * each one to be either library-computed or routed through
 * `renderCallerValue`. A twenty-fourth refusal site that echoes a caller value
 * directly reds this file without anyone remembering to add a case - which is
 * the property the per-site tests cannot have.
 *
 * **This is the mirror of `test/_helpers/phi-slots.ts`, and the claim is
 * deliberately weaker.** That table exists because a *document's* bytes
 * reaching a warning message is a PHI disclosure. Here the value is one the
 * caller passed in: they already have it, so bounding it redacts nothing. What
 * it buys is that `Error.message` from a `build*` refusal has a fixed ceiling
 * instead of growing with the input - an operational property (log lines,
 * crash reports, JSON error envelopes), not a privacy one. Nothing here should
 * be read as making a builder refusal PHI-safe.
 *
 * **Do not state that as "the value is always the caller's own", which an
 * earlier revision of this docblock did.** On the acknowledgment path it is
 * false: TR3 005010X231A1 requires AK2-02 to be a verbatim copy of the
 * acknowledged transaction set's ST-02, and `buildTA1` exists to echo an
 * inbound ISA-13, so a *document's* control numbers reach those refusals by the
 * standard's own design. They are envelope control numbers rather than clinical
 * content, and they are bounded like every other slot, but the dichotomy is not
 * categorical and this suite should not imply that it is.
 *
 * **Two limits of this gate, written down rather than claimed away.** It keys
 * on `throw new *BuildError(` and on template-literal holes, so a message
 * composed in a helper, assembled by `+` concatenation, or thrown through a
 * local binding would not be seen. And the bound is on UTF-16 **code units**,
 * not bytes: an all-astral value renders 86 units but 152 bytes, and a slice at
 * 63 units can split a surrogate pair, leaving a lone surrogate that becomes
 * U+FFFD once the message is UTF-8 encoded. Every published figure says
 * "characters" for that reason. This is a strong tripwire for the shape this
 * library actually uses, not a proof.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  BUILD_REFUSAL_VALUE_MAX_LENGTH,
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  buildInterchange,
  buildTA1,
  defineProfile,
  renderCallerValue,
  X12_BUILD_ERROR_CODES,
  X12BuildError,
  X12ProfileError,
  type InterchangeSpec,
} from "../src/index.js";
import { renderCallerJson } from "../src/builder/caller-value.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/**
 * Launder a value into the typed slot a builder declares.
 *
 * Every forged case in this file is a JavaScript or JSON caller reaching a slot
 * the TypeScript types say is unreachable, which is the whole point: the types
 * are not a runtime guarantee, and `@cosyte/cli` is such a caller. Routing it
 * through one named helper says so once, and keeps the assertion off the object
 * literals where the shared ESLint config forbids it.
 */
function asJsCaller<T>(value: unknown): T {
  return value as T;
}

/** A 120,000-character caller value - the size the item was measured at. */
const HUGE = "9".repeat(120_000);

// ---------------------------------------------------------------------------
// The source scan.
// ---------------------------------------------------------------------------

/**
 * Every module that raises a refusal this gate governs: `src/builder/*.ts`,
 * `src/transactions/&#42;/build-*.ts`, and every `src/profiles/*.ts`. The first
 * two are discovered rather than listed so a new builder module joins the gate
 * on its first commit; the profile directory is swept whole for the same
 * reason, even though only `validate.ts` throws today.
 */
function refusingModules(): string[] {
  const out: string[] = [];
  for (const f of readdirSync(join(SRC, "builder"))) {
    if (f.endsWith(".ts")) out.push(join(SRC, "builder", f));
  }
  for (const f of readdirSync(join(SRC, "profiles"))) {
    if (f.endsWith(".ts")) out.push(join(SRC, "profiles", f));
  }
  const txRoot = join(SRC, "transactions");
  for (const dir of readdirSync(txRoot, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(join(txRoot, dir.name))) {
      if (f.startsWith("build-") && f.endsWith(".ts")) out.push(join(txRoot, dir.name, f));
    }
  }
  return out.sort();
}

interface ThrowSite {
  readonly file: string;
  readonly line: number;
  readonly holes: readonly string[];
}

/**
 * Extract every `throw new <Something>BuildError(...)` and
 * `throw new X12ProfileError(...)` from a module together with the `${...}`
 * interpolations in its arguments, matching the constructor call's parentheses
 * so a multi-line message is captured whole.
 */
function throwSites(file: string): ThrowSite[] {
  const src = readFileSync(file, "utf8");
  const sites: ThrowSite[] = [];
  const marker = /throw new [A-Za-z0-9_]*(?:Build|Profile)Error\(/g;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(src)) !== null) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let end = open;
    for (; end < src.length; end += 1) {
      const c = src[end];
      if (c === "(") depth += 1;
      else if (c === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const text = src.slice(m.index, end + 1);
    const holes = [...text.matchAll(/\$\{([\s\S]*?)\}/g)].map((h) =>
      (h[1] ?? "").trim().replace(/\s+/g, " "),
    );
    sites.push({ file, line: src.slice(0, m.index).split("\n").length, holes });
    marker.lastIndex = end + 1;
  }
  return sites;
}

/**
 * The interpolation forms allowed in a refusal message, each with the reason
 * it is bounded. Anything else is a finding.
 *
 * **`String(...)` is NOT blanket-allowed, and this file got that wrong TWICE
 * before arriving here. Both mistakes are worth keeping, because they are the
 * same mistake.** The first revision admitted any `String(...)` on the stated
 * ground that such a hole is "a library-computed count, index or ordinal" -
 * while inspecting nothing about the argument. Four sites in `build-999.ts`
 * passed `group.numberOfTransactionSets` and its two siblings, which are
 * **caller-supplied**: typed `number`, but a JSON-driven caller can hand over a
 * string, and one did in testing, producing a 120,063-character
 * `AckBuildError.message` while this gate reported clean.
 *
 * The second revision fixed that by admitting `String(<expr>.length)` instead,
 * justified as "an array length". **That inspects the property name, not the
 * operand.** `String((group.syntaxErrorCodes ?? []).length)` passed clean while
 * a forged `{ length: "9".repeat(120_000) }` produced a **120,152-character**
 * message - larger than the figure the item was filed on. It also left this
 * file resting on the typed contract for `readonly string[]` in the very
 * paragraph where it had just declared that "the type is not a runtime
 * guarantee" for `number`, two functions apart in one module.
 *
 * **So the `.length` escape is gone and those three holes are bounded too.**
 * What remains allowed is only what the LIBRARY itself produces, where no
 * caller expression appears in the hole at all. A syntactic allowlist that
 * green-lights the thing it exists to catch is worse than no allowlist, because
 * it tells the next author their site is safe.
 *
 * - `String(<single letter>)` - a loop index (`i`, `b`, `s`, `p`, `l`, `m`,
 *   `c`, `r`, `o`, `u`), which the builder counts itself.
 * - `String(width)` - a library literal (9, the ISA-13 fixed width).
 * - `renderCallerValue(...)` - the one sanctioned route for a caller value.
 * - `locator` / `depLocator` / `variant` - library-computed. The first two are
 *   structural paths assembled in-function out of loop indices
 *   (`source[0].receiver[1].provider[0]`); the third is fixed by the entry
 *   point (`build837P` passes `"P"`), never read off the spec. **The
 *   caller-supplied `line.variant`, which looks identical at a glance, is NOT
 *   here** - it goes through `renderCallerValue`.
 * - `*Warn.message` - a lookup into the frozen `BALANCE_INVARIANT_MESSAGES`
 *   table, keyed by a library-owned invariant discriminant. Registry text, and
 *   the reason `PHI-WARNING-MESSAGE-LEAK` bound the parse side at the model.
 * - a ternary over string literals - both branches are literals in this file.
 * - `renderCallerJson(...)` - the sanctioned route for a caller value whose
 *   TYPE is what is wrong, so `null` and `"null"` stay distinguishable. Bounded
 *   by the same two constants as `renderCallerValue`.
 * - `hint` - the Levenshtein "did you mean?" suggestion, which is an element of
 *   the module-level `KNOWN_OPTION_KEYS` literal and never the caller's key.
 *   Same footing as `locator` / `variant`: a named local whose only possible
 *   values are library literals, in view of the throw.
 * - `KNOWN_*.join(...)` - a join over a frozen module-level literal array
 *   (`KNOWN_OPTION_KEYS`, `KNOWN_EFFECTS`). No caller expression appears.
 *
 * **Every one of these is a name-based judgement, which is the shape that went
 * wrong twice.** They are admitted only because the binding is declared in the
 * same module out of literals; none of them admits a property read off a
 * caller-supplied object, which is what `String(<expr>.length)` did.
 */
const SANCTIONED_HOLES: readonly RegExp[] = [
  /^String\([a-z]\)$/,
  /^String\(width\)$/,
  /^renderCallerValue\(/,
  /^renderCallerJson\(/,
  /^(locator|depLocator|variant|hint)$/,
  /^KNOWN_[A-Z_]+\.join\(/,
  /^[A-Za-z0-9_]*Warn\.message$/,
  /^[^?]*\?\s*"[^"]*"\s*:\s*"[^"]*"$/,
];

describe("refusal messages: the source gate", () => {
  const modules = refusingModules();
  const sites = modules.flatMap(throwSites);
  /** A hole is bounded when it goes through one of the two sanctioned renderers. */
  const isBounded = (h: string): boolean =>
    h.startsWith("renderCallerValue(") || h.startsWith("renderCallerJson(");

  it("finds the refusing modules and their refusal sites", () => {
    // Re-derived on this tree, not inherited: ELEVEN modules raise a typed
    // refusal across EIGHTY-FIVE `throw` sites - ten builder modules with 73
    // sites (59 three slices ago, plus the nine one-line `refuseSpec` /
    // `refuseHierarchy` throwers that `requireCallerArray` calls back into,
    // plus the FOUR added by `X12-NUMERIC-VALUE-EMITS-EMPTY` so that
    // `buildInterchange`, `build999`, `build271` and `build278` each own a
    // `refuseSpec` for `makeCallerEscaper` to call back into, plus the ONE
    // added by `X12-277-SVC07-NOT-DECODED` in `build-277.ts` for a service
    // line with no SVC-07 under 005010X212), and `src/profiles/validate.ts`
    // with 12. The module count is unchanged at 11 because `build-277.ts`
    // already raised elsewhere. Pinned so a module that stops being scanned
    // (a rename, a moved directory) is a failure rather than a silently
    // smaller sweep.
    const raising = new Set(sites.map((s) => s.file));
    expect(raising.size).toBe(11);
    expect(sites.length).toBe(85);
    expect(modules.some((m) => m.endsWith(join("profiles", "validate.ts")))).toBe(true);
  });

  it("routes every caller-supplied value through renderCallerValue", () => {
    const findings: string[] = [];
    for (const site of sites) {
      for (const hole of site.holes) {
        if (SANCTIONED_HOLES.some((re) => re.test(hole))) continue;
        findings.push(`${site.file.slice(SRC.length + 1)}:${String(site.line)} -> \${${hole}}`);
      }
    }
    expect(findings).toEqual([]);
  });

  it("counts the builder's twenty-three caller-value slots, unchanged by this slice", () => {
    // The item named SIXTEEN, and sixteen is the count of caller-supplied
    // STRING slots: nine over-long control numbers (one per emitting module)
    // plus seven with no length gate at all (`build999`'s ST-02 trace twice,
    // `buildInterchange`'s transaction-set id, `build837`'s line variant,
    // `build834`'s two maintenance types, `buildTA1`'s note code).
    //
    // SEVEN more were found by two rounds of adversarial review and appear in
    // no filed record. All seven are in `build-999.ts`. Four are the AK9-02 /
    // AK9-03 / AK9-04 counts: typed `number`, which is exactly why a census of
    // string-typed slots missed them, and a JSON-driven caller can hand over a
    // string regardless (measured at 120,063 characters). Three are `.length`
    // reads on caller-supplied arrays, which a forged
    // `{ length: "9".repeat(120_000) }` drove to 120,152 characters, larger
    // than the figure the item itself was filed on.
    //
    // Count SITES and HOLES separately: they are not the same number, and
    // conflating them is how this census went wrong the first time. 23 sites
    // carry a caller value and hold 28 holes between them, because the AK9
    // non-negative refusal names all three counts in one message and three
    // more name two each.
    const builderSites = sites.filter((s) => !s.file.includes(`${sep}profiles${sep}`));
    const boundedSites = builderSites.filter((s) => s.holes.some(isBounded));
    const boundedHoles = builderSites.flatMap((s) => s.holes).filter(isBounded);
    expect(boundedSites.length).toBe(23);
    expect(boundedHoles.length).toBe(28);
  });

  it("counts the profile subsystem's twelve refusal sites and twenty-three holes", () => {
    // `X12-BUILDER-BOUNDS` filed this half as PRE-EXISTING and measured it at
    // 120,093 characters. **That figure did not reproduce**, the same way its
    // own filed figures did not. Re-derived by driving PROFILE_REFUSALS below
    // against base `55ebc66`, the largest `X12ProfileError.message` is 360,181
    // characters, at the `fixture` refusal. THREE of the thirteen exceed
    // 360,000 (`fixture` 360,181, `expectedWarnings` 360,090, `effect`
    // 360,085), and they are exactly the three that name THREE caller values
    // rather than two - the profile name, the quirk id, and a
    // `JSON.stringify`d value. A 120,000-digit quirk id reaches them because
    // `QUIRK_ID_RE` carries no length bound, whatever its comment used to say.
    //
    // **The first draft of this slice published 240,092 here, and that is the
    // sourceCategory site, not the maximum.** It was measured with a weaker
    // probe set than the one this file ships, which is the same error class the
    // item was filed to correct. Drive the shipped table, not a side probe.
    //
    // Sites and holes are counted separately, because they are not the same
    // number: all twelve sites name at least one caller value, and they hold
    // twenty-three holes between them, since most name the profile AND the
    // offending quirk id.
    const profileSites = sites.filter((s) => s.file.includes(`${sep}profiles${sep}`));
    expect(profileSites.length).toBe(12);
    expect(profileSites.filter((s) => s.holes.some(isBounded)).length).toBe(12);
    expect(profileSites.flatMap((s) => s.holes).filter(isBounded).length).toBe(23);
  });
});

// ---------------------------------------------------------------------------
// The bound itself.
// ---------------------------------------------------------------------------

describe("renderCallerValue", () => {
  it("passes a short value through verbatim, quoted", () => {
    expect(renderCallerValue("000000001")).toBe('"000000001"');
    expect(renderCallerValue("")).toBe('""');
  });

  it("does not truncate at exactly the bound, and does at one past it", () => {
    const exact = "a".repeat(BUILD_REFUSAL_VALUE_MAX_LENGTH);
    expect(renderCallerValue(exact)).toBe(`"${exact}"`);
    const over = "a".repeat(BUILD_REFUSAL_VALUE_MAX_LENGTH + 1);
    expect(renderCallerValue(over)).toContain("…");
    expect(renderCallerValue(over)).toContain(
      `(${String(BUILD_REFUSAL_VALUE_MAX_LENGTH + 1)} characters)`,
    );
  });

  it("stays under the declared ceiling for any input, and reports the true length", () => {
    for (const value of ["", "x", HUGE, "\n".repeat(9_999), "*~?:^".repeat(50_000)]) {
      expect(renderCallerValue(value).length).toBeLessThanOrEqual(BUILD_REFUSAL_VALUE_MAX_RENDERED);
    }
    expect(renderCallerValue(HUGE)).toContain("(120000 characters)");
    expect(renderCallerValue(HUGE)).not.toContain(HUGE);
  });

  it("coerces a non-string rather than throwing, which it regressed once", () => {
    // Adversarial review, pass 1: reading `.length` where the base used a
    // template literal turned a typed refusal into an uncaught `TypeError`
    // with no `code`, for any JS/JSON caller passing a number where the types
    // say string. The bound must never cost the caller the typed error.
    expect(renderCallerValue(1234567890123)).toBe('"1234567890123"');
    for (const rogue of [undefined, null, 42, {}, [], Symbol("x"), Object.create(null)]) {
      expect(() => renderCallerValue(rogue as unknown as string)).not.toThrow();
      expect(renderCallerValue(rogue as unknown as string).length).toBeLessThanOrEqual(
        BUILD_REFUSAL_VALUE_MAX_RENDERED,
      );
    }
  });

  it("bounds a numeric slot handed a string, the case a `number` type did not stop", () => {
    // The signature is `string | number` precisely so the AK9 count slots can
    // use it; a `number`-typed field arriving as a string is the runtime case
    // that produced a 120,063-character message and that the type did not stop.
    expect(renderCallerValue(HUGE)).not.toContain(HUGE);
    expect(renderCallerValue(HUGE).length).toBeLessThanOrEqual(BUILD_REFUSAL_VALUE_MAX_RENDERED);
    expect(renderCallerValue(12345)).toBe('"12345"');
  });

  it("is bounded but NOT escaped, which is the documented non-claim", () => {
    // Stated as a test so the limit cannot quietly drift into an implied
    // guarantee: a short caller value survives verbatim, newline and all.
    expect(renderCallerValue("a\nb")).toBe('"a\nb"');
  });
});

// ---------------------------------------------------------------------------
// Behavioural: the two sites reachable without a domain spec.
// ---------------------------------------------------------------------------

function minimalSpec(over: Partial<InterchangeSpec> = {}): InterchangeSpec {
  return {
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groups: [
      {
        functionalIdCode: "HC",
        groupControlNumber: "1",
        versionRelease: "005010X222A2",
        transactions: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            segments: [["BHT", "0019", "00", "REF", "20260601", "1200", "CH"]],
          },
        ],
      },
    ],
    ...over,
  };
}

describe("buildInterchange: the transaction-set id slot", () => {
  it("bounds the no-segment-id refusal against a 120,000-character ST-01", () => {
    // This is one of the seven that were NOT gated on length: nothing about
    // this branch requires the transaction-set id to be long, so the message
    // grew with whatever the caller passed.
    try {
      buildInterchange(
        minimalSpec({
          groups: [
            {
              functionalIdCode: "HC",
              groupControlNumber: "1",
              versionRelease: "005010X222A2",
              transactions: [
                {
                  transactionSetIdCode: HUGE,
                  transactionSetControlNumber: "0001",
                  segments: [[]],
                },
              ],
            },
          ],
        }),
      );
      throw new Error("expected buildInterchange to refuse a segment spec with no id");
    } catch (err) {
      expect(err).toBeInstanceOf(X12BuildError);
      expect((err as X12BuildError).code).toBe(X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC);
      const { message } = err as Error;
      expect(message).not.toContain(HUGE);
      expect(message).toContain("(120000 characters)");
      expect(message.length).toBeLessThan(500);
    }
  });
});

describe("buildTA1: the note-code slot", () => {
  it("bounds the accept-with-note refusal against a 120,000-character TA1-05", () => {
    try {
      buildTA1({
        interchangeControlNumber: "000000001",
        interchangeDate: "260601",
        interchangeTime: "1200",
        ackCode: "A",
        // TA1-05 is a 3-character code list slot; nothing bounded it.
        noteCode: HUGE as unknown as "001",
      });
      throw new Error("expected buildTA1 to refuse an accept carrying a note");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
      expect((err as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_TA1_ACCEPT_WITH_NOTE);
      const { message } = err as Error;
      expect(message).not.toContain(HUGE);
      expect(message).toContain("(120000 characters)");
      expect(message.length).toBeLessThan(500);
    }
  });

  it("still shows a real note code in full, because the bound is generous", () => {
    try {
      buildTA1({
        interchangeControlNumber: "000000001",
        interchangeDate: "260601",
        interchangeTime: "1200",
        ackCode: "A",
        noteCode: "001",
      });
      throw new Error("expected buildTA1 to refuse an accept carrying a note");
    } catch (err) {
      expect((err as Error).message).toContain('note "001"');
    }
  });
});

// ---------------------------------------------------------------------------
// `renderCallerJson`: the type-preserving half of the bound.
// ---------------------------------------------------------------------------

describe("renderCallerJson", () => {
  it("keeps the type distinction that made it worth having", () => {
    // This is the whole reason `defineProfile` does not just call
    // `renderCallerValue`: it coerces, and `null` / `"null"` / `undefined` are
    // three different mistakes a caller can make in a `name` field.
    expect(renderCallerJson(null)).toBe("null");
    expect(renderCallerJson("null")).toBe('"null"');
    expect(renderCallerJson(undefined)).toBe("undefined");
    expect(renderCallerJson(42)).toBe("42");
    expect(renderCallerJson("acme")).toBe('"acme"');
  });

  it("stays under the same declared ceiling as renderCallerValue", () => {
    for (const value of [HUGE, [HUGE], { a: HUGE }, Array.from({ length: 20_000 }, () => "zz")]) {
      expect(renderCallerJson(value).length).toBeLessThanOrEqual(BUILD_REFUSAL_VALUE_MAX_RENDERED);
      expect(renderCallerJson(value)).not.toContain(HUGE);
    }
  });

  it("fabricates no closing quote, because JSON does not always open one", () => {
    // Truncating `["aaa…` and appending `"` would misdescribe the caller's
    // value as a string. The ellipsis is the only thing added.
    const arrayish = renderCallerJson([HUGE]);
    expect(arrayish.startsWith('["')).toBe(true);
    expect(arrayish).toContain("…");
    expect(arrayish).toMatch(/… \(\d+ characters\)$/u);
  });

  it("never throws, on the three inputs JSON.stringify throws for", () => {
    // A refusal that dies inside its own message hands the caller an uncaught
    // TypeError with no `code` - the regression `renderCallerValue` was made to
    // coerce away, and it would arrive here by a different door.
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    const hostile = {
      toJSON() {
        throw new Error("nope");
      },
    };
    for (const rogue of [circular, hostile, 1n, { big: 1n }, Object.create(null)]) {
      expect(() => renderCallerJson(rogue)).not.toThrow();
      expect(renderCallerJson(rogue).length).toBeLessThanOrEqual(BUILD_REFUSAL_VALUE_MAX_RENDERED);
    }
  });
});

// ---------------------------------------------------------------------------
// Behavioural: `defineProfile`, the half `X12-BUILDER-BOUNDS` filed and left.
// ---------------------------------------------------------------------------

/**
 * Every `defineProfile()` shape that reaches a refusal naming a caller value.
 * Driven off one table so a new refusal site has an obvious home, and so the
 * ceiling is asserted against every site rather than a chosen one.
 */
const PROFILE_REFUSALS: readonly (readonly [string, () => unknown])[] = [
  ["options is not an object", () => defineProfile(asJsCaller(HUGE))],
  ["name is not a string", () => defineProfile(asJsCaller({ name: { deep: HUGE } }))],
  ["name is a huge array", () => defineProfile(asJsCaller({ name: [HUGE, HUGE] }))],
  ["name is whitespace only", () => defineProfile(asJsCaller({ name: " ".repeat(120_000) }))],
  ["unknown option key", () => defineProfile(asJsCaller({ name: HUGE, [HUGE]: 1 }))],
  ["quirk is not an object", () => defineProfile(asJsCaller({ name: HUGE, quirks: [null] }))],
  [
    "quirk id is ill-formed",
    () => defineProfile(asJsCaller({ name: HUGE, quirks: [{ ...QUIRK, id: `!${HUGE}` }] })),
  ],
  [
    "quirk id is duplicated",
    () =>
      defineProfile(
        asJsCaller({
          name: HUGE,
          quirks: [
            { ...QUIRK, id: LOWER },
            { ...QUIRK, id: LOWER },
          ],
        }),
      ),
  ],
  [
    "quirk effect is unknown",
    () =>
      defineProfile(asJsCaller({ name: HUGE, quirks: [{ ...QUIRK, id: LOWER, effect: HUGE }] })),
  ],
  [
    "quirk summary is empty",
    () =>
      defineProfile(asJsCaller({ name: HUGE, quirks: [{ ...QUIRK, id: LOWER, summary: " " }] })),
  ],
  [
    "quirk fixture is ill-formed",
    () =>
      defineProfile(asJsCaller({ name: HUGE, quirks: [{ ...QUIRK, id: LOWER, fixture: HUGE }] })),
  ],
  [
    "quirk sourceCategory is empty",
    () =>
      defineProfile(
        asJsCaller({ name: HUGE, quirks: [{ ...QUIRK, id: LOWER, sourceCategory: "" }] }),
      ),
  ],
  [
    "quirk expectedWarnings has an unknown code",
    () =>
      defineProfile(
        asJsCaller({
          name: HUGE,
          quirks: [{ ...QUIRK, id: LOWER, expectedWarnings: [HUGE] }],
        }),
      ),
  ],
];

/** A 120,000-character all-lowercase id, which `QUIRK_ID_RE` accepts. */
const LOWER = "a".repeat(120_000);

/** A quirk that is valid apart from whatever each case overrides. */
const QUIRK = {
  id: "q-one",
  effect: "relaxes",
  summary: "s",
  fixture: "remit/835-availity-quirk.edi",
  sourceCategory: "c",
} as const;

describe("defineProfile: caller values in X12ProfileError", () => {
  it.each(PROFILE_REFUSALS)("bounds the refusal when %s", (_label, run) => {
    let thrown: unknown;
    try {
      run();
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(X12ProfileError);
    const { message } = thrown as Error;
    expect(message).not.toContain(HUGE);
    expect(message).not.toContain(LOWER);
    // Each site is its own fixed template plus at most three bounded
    // fragments. Asserted against a per-message ceiling, never against
    // BUILD_REFUSAL_VALUE_MAX_RENDERED, which bounds the FRAGMENT - the
    // category error `X12-BUILDER-BOUNDS` shipped and had to correct. Measured
    // on this tree the longest of the thirteen is the fixture refusal at 431
    // characters, whose fixed template is the longest in the module and which
    // names three caller values; the same case measured 360,181 at base.
    expect(message.length).toBeLessThan(500);
  });

  it("measures 431 characters at a 120,000-character value, which is NOT the maximum", () => {
    // Pinned as a MEASUREMENT, not a ceiling: the ceiling is the 500 above. A
    // site that starts saying more should move this number visibly rather than
    // drift under a round threshold.
    let longest = 0;
    for (const [, run] of PROFILE_REFUSALS) {
      try {
        run();
      } catch (err) {
        longest = Math.max(longest, (err as Error).message.length);
      }
    }
    expect(longest).toBe(431);
  });

  it("grows with the DECIMAL WIDTH of the length, so 431 must not be published as a maximum", () => {
    // Adversarial review caught the docs calling 431 "the longest message any
    // of the twelve can produce". It is not: the ` (N characters)` suffix
    // widens with N, so the same refusal is longer for a longer value. The
    // ceiling is the site's fixed text plus its three fragment ceilings, and
    // BUILD_REFUSAL_VALUE_MAX_RENDERED already carries a digit of headroom for
    // exactly this.
    const fixtureMessage = (n: number): number => {
      const big = "9".repeat(n);
      try {
        defineProfile(
          asJsCaller({ name: big, quirks: [{ ...QUIRK, id: "a".repeat(n), fixture: big }] }),
        );
      } catch (err) {
        return (err as Error).message.length;
      }
      throw new Error("expected defineProfile to refuse an ill-formed fixture");
    };
    expect(fixtureMessage(120_000)).toBe(431);
    expect(fixtureMessage(1_000_000)).toBe(434);
    expect(fixtureMessage(10_000_000)).toBe(437);
    // 175 of fixed text, two renderCallerValue ceilings and one
    // renderCallerJson ceiling (which is two under, since JSON brings its own
    // quotes). Still comfortably inside the 500 asserted per site.
    expect(
      175 + BUILD_REFUSAL_VALUE_MAX_RENDERED * 2 + (BUILD_REFUSAL_VALUE_MAX_RENDERED - 2),
    ).toBe(443);
  });

  it("reports the true length of what it truncated", () => {
    try {
      defineProfile(asJsCaller({ name: " ".repeat(120_000) }));
      throw new Error("expected defineProfile to refuse a whitespace-only name");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ProfileError);
      // 120,002 not 120,000: the figure describes the JSON TEXT it truncated,
      // quotes included, which is the only number that matches the fragment.
      expect((err as Error).message).toContain("(120002 characters)");
    }
  });

  it("still shows a short profile name in full, because the bound is generous", () => {
    try {
      defineProfile(asJsCaller({ name: "acme-clearinghouse", nope: 1 }));
      throw new Error("expected defineProfile to refuse an unknown option key");
    } catch (err) {
      expect((err as Error).message).toContain('Profile "acme-clearinghouse"');
    }
  });

  it("leaves X12ProfileError.profileName an unbounded copy, which is deliberate", () => {
    // The BOUND IS ON THE MESSAGE. `profileName` exists so a consumer can
    // pinpoint which of their definitions failed, and truncating it would stop
    // it matching the name they passed. It is the caller's own string, they
    // still hold it, and the disclosure is in KNOWN-LIMITATIONS.md. Asserted so
    // the asymmetry is a decision on the record rather than an oversight.
    const name = " ".repeat(120_000);
    try {
      defineProfile(asJsCaller({ name }));
      throw new Error("expected defineProfile to refuse a whitespace-only name");
    } catch (err) {
      expect(err).toBeInstanceOf(X12ProfileError);
      expect((err as X12ProfileError).profileName).toBe(name);
      expect((err as Error).message.length).toBeLessThan(400);
    }
  });
});

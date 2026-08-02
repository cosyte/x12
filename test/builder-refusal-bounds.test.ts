/**
 * The bound gate for `@cosyte/x12`'s BUILDER refusal messages
 * (`X12-BUILDER-BOUNDS`).
 *
 * **The source scan is the deliverable, and it is the exhaustive half.** The
 * behavioural assertions below and in the eight per-builder suites drive a
 * 120,000-character value into the sites that are cheap to reach, which is
 * strong evidence but not coverage. What covers every site is
 * {@link SANCTIONED_HOLES}: it walks every `throw new *BuildError(...)` in
 * every builder module, extracts every `${...}` interpolation, and requires
 * each one to be either library-computed or routed through
 * `renderCallerValue`. A seventeenth refusal site that echoes a caller value
 * directly reds this file without anyone remembering to add a case - which is
 * the property the per-site tests cannot have.
 *
 * **This is the mirror of `test/_helpers/phi-slots.ts`, and the claim is
 * deliberately weaker.** That table exists because a *document's* bytes
 * reaching a warning message is a PHI disclosure. Here the value is the
 * **caller's own**: they passed it in, they already have it, and bounding it
 * redacts nothing. What it buys is that `Error.message` from a `build*`
 * refusal has a fixed ceiling instead of growing with the input - an
 * operational property (log lines, crash reports, JSON error envelopes), not a
 * privacy one. Nothing here should be read as making a builder refusal
 * PHI-safe.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  BUILD_REFUSAL_VALUE_MAX_LENGTH,
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  buildInterchange,
  buildTA1,
  renderCallerValue,
  X12_BUILD_ERROR_CODES,
  X12BuildError,
  type InterchangeSpec,
} from "../src/index.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** A 120,000-character caller value - the size the item was measured at. */
const HUGE = "9".repeat(120_000);

// ---------------------------------------------------------------------------
// The source scan.
// ---------------------------------------------------------------------------

/**
 * Every module that raises a `build*` refusal: `src/builder/*.ts` plus
 * `src/transactions/&#42;/build-*.ts`. Discovered rather than listed, so a new
 * builder module joins the gate on its first commit.
 */
function builderModules(): string[] {
  const out: string[] = [];
  for (const f of readdirSync(join(SRC, "builder"))) {
    if (f.endsWith(".ts")) out.push(join(SRC, "builder", f));
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
 * Extract every `throw new <Something>BuildError(...)` from a module together
 * with the `${...}` interpolations in its arguments, matching the constructor
 * call's parentheses so a multi-line message is captured whole.
 */
function throwSites(file: string): ThrowSite[] {
  const src = readFileSync(file, "utf8");
  const sites: ThrowSite[] = [];
  const marker = /throw new [A-Za-z0-9_]*BuildError\(/g;
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
 * **`String(...)` is NOT blanket-allowed, and an earlier revision of this file
 * made exactly that mistake.** It admitted any `String(...)` on the stated
 * ground that such a hole is "a library-computed count, index or ordinal" -
 * while inspecting nothing about the argument. Four live sites in
 * `build-999.ts` passed `group.numberOfTransactionSets` and its two siblings,
 * which are **caller-supplied**: typed `number`, but a JSON-driven caller can
 * hand over a string, and one did in testing, producing a 120,063-character
 * `AckBuildError.message` while this gate reported clean. A syntactic
 * allowlist that green-lights the very thing it exists to catch is worse than
 * no allowlist, because it tells the next author their site is safe. The three
 * forms below check the argument instead:
 *
 * - `String(<single letter>)` - a loop index (`i`, `b`, `s`, `p`, `l`, `m`,
 *   `c`, `r`, `o`, `u`). Bounded by the caller's array sizes.
 * - `String(<expr>.length)` - an array length, same argument.
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
 */
const SANCTIONED_HOLES: readonly RegExp[] = [
  /^String\([a-z]\)$/,
  /^String\([\s\S]*\.length,?\s*\)$/,
  /^String\(width\)$/,
  /^renderCallerValue\(/,
  /^(locator|depLocator|variant)$/,
  /^[A-Za-z0-9_]*Warn\.message$/,
  /^[^?]*\?\s*"[^"]*"\s*:\s*"[^"]*"$/,
];

describe("builder refusal messages: the source gate", () => {
  const modules = builderModules();
  const sites = modules.flatMap(throwSites);

  it("finds the builder modules and their refusal sites", () => {
    // Re-derived on this tree, not inherited: ten modules raise a typed
    // refusal, across fifty-nine `throw` sites. Pinned so a module that stops
    // being scanned (a rename, a moved directory) is a failure rather than a
    // silently smaller sweep.
    const raising = new Set(sites.map((s) => s.file));
    expect(raising.size).toBe(10);
    expect(sites.length).toBe(59);
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

  it("counts twenty caller-value slots: the item's sixteen plus four it missed", () => {
    // The item named SIXTEEN, and sixteen is the count of caller-supplied
    // STRING slots: nine over-long control numbers (one per emitting module)
    // plus seven with no length gate at all (`build999`'s ST-02 trace twice,
    // `buildInterchange`'s transaction-set id, `build837`'s line variant,
    // `build834`'s two maintenance types, `buildTA1`'s note code).
    //
    // Four more were found by adversarial review and are NOT in the item: the
    // AK9-02 / AK9-03 / AK9-04 counts across `build-999.ts`'s four
    // count-mismatch refusals. They are typed `number`, which is why a census
    // of string-typed slots missed them, and a JSON-driven caller can hand
    // over a string regardless: measured at 120,063 characters before this.
    // Count SITES and HOLES separately, because they are not the same number
    // and conflating them is how the item's census went wrong in the first
    // place. Twenty sites carry a caller value; they hold 24 holes between
    // them, because the AK9 non-negative refusal names all three counts in one
    // message and two more name two each.
    const isBounded = (h: string): boolean => h.startsWith("renderCallerValue(");
    const boundedSites = sites.filter((s) => s.holes.some(isBounded));
    const boundedHoles = sites.flatMap((s) => s.holes).filter(isBounded);
    expect(boundedSites.length).toBe(20);
    expect(boundedHoles.length).toBe(24);
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

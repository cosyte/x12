/**
 * Impl-refuter regression artifact for S0073-x12-13, finding F1 (BLOCKING).
 *
 * Run standalone with `tsx`; vitest's include pattern is `test/**\/*.test.ts`,
 * so a single-extension `regress_*` artifact is deliberately NOT collected by
 * the package suite:
 *
 *   pnpm --dir=<x12> exec tsx test/regress_0073_F1.ts
 *
 * ## The clause
 *
 * AC-18: "IF the package's own shipped documentation records that AAA
 * rejection reasons are an unsurfaced gap or a known limitation THEN THE
 * SYSTEM SHALL remove or amend that record in the same change, so no shipped
 * text claims a gap this change closed."
 *
 * ## The defect
 *
 * `CHANGELOG.md` is listed in `package.json#files`, so it is shipped to every
 * consumer of the published package, and it still carries, in the present
 * tense, the Phase 6 sentence recording 271 AAA request-validation segments as
 * "preserved on `tx.segments` verbatim but not yet typed onto the model". That
 * is precisely the gap this change closed. Nothing in the diff removes or
 * amends that sentence.
 *
 * The implementation's own AC-18 sweep
 * (`test/eligibility-271-aaa-provenance.test.ts`) enumerates its surfaces as
 * README.md, KNOWN-LIMITATIONS.md, everything under `docs-content/`, and `src/`
 * doc comments. `CHANGELOG.md` is in `package.json#files` and is in none of
 * those lists, and the exclusion is stated nowhere in the repository.
 *
 * The predicate below is that same test's `claimsTheGap`, copied byte for byte
 * so the finding cannot rest on a stricter reading than the implementation's
 * own, and pointed at the shipped file the sweep omits.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Verbatim from `test/eligibility-271-aaa-provenance.test.ts`. */
const GAP_RE = /AAA[\s\S]{0,200}?\bnot (?:yet )?(?:typed|enumerated?|surfaced)/iu;

/** Verbatim from `test/eligibility-271-aaa-provenance.test.ts`. */
function claimsTheGap(text: string): boolean {
  return text
    .split(/\n\s*\n/u)
    .flatMap((paragraph) => paragraph.replace(/\s+/gu, " ").split(/(?<=[.;])\s+/u))
    .filter((sentence) => !/\b270\b/u.test(sentence))
    .some((sentence) => GAP_RE.test(sentence));
}

/** The offending sentence, for the record. */
function gapSentence(text: string): string | undefined {
  return text
    .split(/\n\s*\n/u)
    .flatMap((paragraph) => paragraph.replace(/\s+/gu, " ").split(/(?<=[.;])\s+/u))
    .filter((sentence) => !/\b270\b/u.test(sentence))
    .find((sentence) => GAP_RE.test(sentence));
}

let failed = 0;
function check(name: string, run: () => void): void {
  try {
    run();
    process.stdout.write(`ok    ${name}\n`);
  } catch (err) {
    failed += 1;
    process.stdout.write(
      `FAIL  ${name}\n        ${String((err as Error).message).split("\n")[0]}\n`,
    );
  }
}

const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
  files: readonly string[];
};
const changelog = readFileSync(join(REPO_ROOT, "CHANGELOG.md"), "utf8");

// ---------------------------------------------------------------------------
// Controls: the antecedent of AC-18 really is satisfied, and the predicate
// really does discriminate, so the failure below is neither vacuous nor an
// artefact of an over-broad pattern.
// ---------------------------------------------------------------------------

check("CONTROL CHANGELOG.md is shipped: it is listed in package.json#files", () => {
  assert.ok(
    pkg.files.includes("CHANGELOG.md"),
    `package.json#files is ${JSON.stringify(pkg.files)}`,
  );
});

check("CONTROL the predicate finds no gap claim in the surfaces the change did sweep", () => {
  for (const name of ["README.md", "KNOWN-LIMITATIONS.md"]) {
    assert.equal(claimsTheGap(readFileSync(join(REPO_ROOT, name), "utf8")), false, name);
  }
});

check("CONTROL the predicate does detect the sentence this change removed from src/", () => {
  assert.equal(
    claimsTheGap(
      "AAA request-validation segments are preserved on tx.segments verbatim but not yet typed onto the model.",
    ),
    true,
  );
});

// ---------------------------------------------------------------------------
// The defect.
// ---------------------------------------------------------------------------

check("AC-18  no SHIPPED text claims the gap this change closed", () => {
  const hit = gapSentence(changelog);
  assert.equal(
    hit,
    undefined,
    `CHANGELOG.md (shipped via package.json#files) still claims it: ${String(hit)}`,
  );
});

process.stdout.write(`\n${String(failed)} failing check(s)\n`);
process.exit(failed === 0 ? 0 : 1);

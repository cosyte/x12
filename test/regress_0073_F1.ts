/**
 * Impl-refuter probe for S0073-x12-13, finding F1 (advisory): the package's
 * SHIPPED `CHANGELOG.md` (listed in `package.json#files`) still carries the
 * Phase 6 sentence recording 271 AAA request-validation segments as "preserved
 * on tx.segments verbatim but not yet typed onto the model", which is the gap
 * this change closed. The predicate below is the implementation's OWN
 * `claimsTheGap` from `test/eligibility-271-aaa-provenance.test.ts`, copied
 * byte for byte and pointed at a shipped file that test's surface list omits.
 *
 * Run standalone with `tsx` (the refuter write-guard permits a
 * single-extension `regress_*` artifact, which vitest's `test/[**]/*.test.ts`
 * include pattern would not pick up):
 *
 *   pnpm --dir=<x12> exec tsx test/regress_0073_F1.ts
 */

import { readFileSync } from "node:fs";

import { strictEqual } from "node:assert/strict";

/** Verbatim from `test/eligibility-271-aaa-provenance.test.ts`. */
const GAP_RE = /AAA[\s\S]{0,200}?\bnot (?:yet )?(?:typed|enumerated?|surfaced)/iu;

/** Verbatim from `test/eligibility-271-aaa-provenance.test.ts`. */
function gapSentence(text: string): string | undefined {
  return text
    .split(/\n\s*\n/u)
    .flatMap((paragraph) => paragraph.replace(/\s+/gu, " ").split(/(?<=[.;])\s+/u))
    .filter((sentence) => !/\b270\b/u.test(sentence))
    .find((sentence) => GAP_RE.test(sentence));
}

const changelog = readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const hit = gapSentence(changelog);

process.stdout.write(
  `CHANGELOG.md (shipped, package.json#files) gap sentence:\n  ${String(hit)}\n`,
);

try {
  strictEqual(hit, undefined);
  process.stdout.write("\nPASS - no shipped text claims the gap.\n");
} catch (e) {
  process.stdout.write(`\nFAIL - AC-18: ${String(e).split("\n")[0]}\n`);
  process.exit(1);
}

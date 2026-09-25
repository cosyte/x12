/**
 * Read a professional claim (837P): the variant, the billing provider, the diagnoses with their
 * code system, and each service line.
 *
 * `examples/data/837p-claim.edi` is synthetic: one claim with one service line, from a fabricated
 * clinic for a fabricated patient. `get837Claims` resolves the variant from the guide the
 * transaction set declares (`005010X222A2` is professional), walks the HL hierarchy for you, and
 * keeps amounts exact.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/read-837p-claim.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { get837Claims, parseX12 } from "@cosyte/x12";

const ix = parseX12(readFileSync(new URL("data/837p-claim.edi", import.meta.url), "utf8"));
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
if (tx === undefined) throw new Error("no 837 in this interchange");
const submission = get837Claims(ix.delimiters, tx);
if (submission === undefined) throw new Error("not an 837");

console.log(
  `Variant ${submission.variant} (${String(submission.implementationConventionReference)})`,
);
for (const claim of submission.claims) {
  console.log(
    `Claim ${claim.claimId} for ${String(claim.totalCharge)},`,
    `billed by ${String(claim.billingProvider?.name)} (NPI ${String(claim.billingProvider?.idCode)})`,
  );
  for (const d of claim.diagnoses) {
    console.log(`  Diagnosis ${d.code} (${String(d.codeSystem)}, ${String(d.category)})`);
  }
  for (const line of claim.serviceLines) {
    const modifiers = line.variant === "P" ? line.modifiers.join(",") : "";
    const code = line.variant === "P" ? line.procedureCode : "";
    console.log(
      `  Line ${line.lineNumber}: ${code} [${modifiers}] x${String(line.units)} = ${String(line.charge)}`,
    );
  }
}
console.log("Warnings:", ix.warnings.length + submission.warnings.length);

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
const [claim] = submission.claims;
const [line] = claim?.serviceLines ?? [];
assert.equal(submission.variant, "P");
assert.equal(claim?.claimId, "PT-ACCT-001");
assert.equal(claim?.totalCharge?.toString(), "150");
assert.deepEqual(
  claim?.diagnoses.map((d) => [d.code, d.codeSystem]),
  [["J20.9", "ICD-10-CM"]],
);
assert.ok(line?.variant === "P");
assert.equal(line.procedureCode, "99213");
assert.deepEqual(line.modifiers, ["25"]);
assert.equal(ix.warnings.length + submission.warnings.length, 0);

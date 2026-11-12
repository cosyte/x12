/**
 * Show your own descriptions beside the codes in an 835, from a table you supply.
 *
 * Most code lists this package bundles ship their codes and no description text, because each
 * list's own redistribution record says its descriptions are not ours to redistribute: the Claim
 * Adjustment Reason Codes, the Claim Status Category and Claim Status Codes, the Service Type
 * Codes, the CLP-02 claim status codes and the INS-03 maintenance types. Only the Remittance Advice
 * Remark Codes, recorded as permitted, ship descriptions. So `reasonDescription` on an 835
 * adjustment is `undefined`, and a caller that holds descriptions it may use passes them to the
 * lookup as `descriptions`.
 *
 * Every description below is made-up text for this example, not the published wording of any
 * code. `examples/data/835-remittance.edi` is synthetic.
 *
 * Run from the repository root after `pnpm build`:
 *
 *     pnpm tsx examples/describe-codes-with-your-own-table.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { CARC, get835, lookupCarc, lookupClpStatus, parseX12 } from "@cosyte/x12";

// Your own table, keyed by code. In real use it comes from wherever you are allowed to take it.
const myCarcText: Readonly<Record<string, string>> = {
  "2": "Example text B (made up for this sample)",
  "3": "Example text C (made up for this sample)",
  "45": "Example text A (made up for this sample)",
};
const myClpText: Readonly<Record<string, string>> = {
  "1": "Example claim status text (made up for this sample)",
};

const ix = parseX12(readFileSync(new URL("data/835-remittance.edi", import.meta.url), "utf8"));
const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
if (tx === undefined) throw new Error("no 835 in this interchange");
const remit = get835(ix.delimiters, tx);
if (remit === undefined) throw new Error("not an 835");

const shown: [string, string | undefined, string | undefined][] = [];
for (const [index, claim] of remit.claims.entries()) {
  const status = lookupClpStatus(claim.claimStatusCode, { descriptions: myClpText });
  console.log(`Claim ${String(index + 1)}: CLP-02 ${claim.claimStatusCode}`, status?.description);
  for (const line of claim.serviceLines) {
    for (const a of line.adjustments) {
      // The model carries the code; the description is yours to supply.
      const entry = lookupCarc(a.reasonCode, { descriptions: myCarcText });
      shown.push([a.reasonCode, a.reasonDescription, entry?.description]);
      console.log(
        `  ${a.groupCode} ${a.reasonCode} ${String(a.amount)}: ${String(entry?.description)}`,
      );
    }
  }
}

// The checks that make this file a test: `pnpm examples` fails if any of them does not hold.
// The bundled CARC list knows these codes and ships no description for them.
assert.ok(Object.hasOwn(CARC.codes, "45"));
assert.equal(CARC.codes["45"], undefined);
assert.equal(lookupCarc("45")?.description, undefined);
// Each adjustment's description comes from your table and nowhere else.
assert.deepEqual(shown, [
  ["45", undefined, "Example text A (made up for this sample)"],
  ["2", undefined, "Example text B (made up for this sample)"],
  ["3", undefined, "Example text C (made up for this sample)"],
]);
assert.equal(
  lookupClpStatus("1", { descriptions: myClpText })?.description,
  "Example claim status text (made up for this sample)",
);
assert.equal(ix.warnings.length + remit.warnings.length, 0);

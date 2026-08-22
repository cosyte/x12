/**
 * Impl-refuter regression artifact for S0073-x12-13, finding F5 (ADVISORY).
 *
 * Run standalone with `tsx`; vitest's include pattern is `test/**\/*.test.ts`,
 * so a single-extension `regress_*` artifact is deliberately NOT collected by
 * the package suite:
 *
 *   pnpm --dir=<x12> exec tsx test/regress_0073_F5.ts
 *
 * ## What this is NOT
 *
 * It is NOT a claim that the reader decodes the wrong value. Returning the
 * post-`?`-unescape value is this package's uniform convention for every
 * decoded element, it is what AC-4's "return the inbound code verbatim" means
 * for a released element (the `?` is framing, not content), and the framed
 * bytes are still on `tx.segments`. The behaviour measured below is correct.
 *
 * ## The defect: a SHIPPED example says something the behaviour falsifies
 *
 * `src/transactions/eligibility/types.ts` carries, in the `@example` block of
 * `X12AaaCode`, the line
 *
 *   c.code;        // "42", exactly the bytes the payer sent
 *
 * and, in the same block's prose, "The code itself is never normalised". That
 * doc comment ships: it is compiled into `dist/index.d.ts`, which is in
 * `package.json#files`, and an `@example` is the form a consumer copies. For an
 * AAA-03 carrying a release-escaped delimiter the two disagree: the bytes the
 * payer sent at that position are `7?*2` and `code` is `7*2`.
 *
 * This is the class `X12-ISA-VALUE-POINTERS` and `X12-ENVELOPE-VALUE-EXAMPLES`
 * exist to catch, in the opposite direction: those promised VALUES and handed
 * back framed bytes, this promises BYTES and hands back a value. No gate covers
 * it - `@example` blocks in `src/` are neither compiled nor executed by any
 * script in `package.json`, and `check:no-internal-refs` reads doc comments for
 * six other rules.
 *
 * Remedy is one line of prose, not a behaviour change: say the code is the
 * decoded element value, post-`?`-unescape like every other decoded field here,
 * and point at `tx.segments` for the framed bytes.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { get271Eligibility, parseX12, type X12Eligibility } from "../src/index.js";
import type { X12Segment } from "../src/index.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

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

/** A one-loop 271 whose single AAA states `aaa03` at the sourced position. */
function read271(aaa03: string): { readonly seg: X12Segment; readonly elig: X12Eligibility } {
  const raw = [
    "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
    "GS*HB*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X279A1~",
    "ST*271*0001*005010X279A1~",
    "BHT*0022*11*ECHO-270-TRACE-141*20260601*1200~",
    "HL*1**22*0~",
    `AAA*N**${aaa03}*C~`,
    "SE*5*0001~",
    "GE*1*1~",
    "IEA*1*000000001~",
  ].join("\n");
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  if (tx === undefined) throw new Error("probe document carries no 271 transaction set");
  const elig = get271Eligibility(ix.delimiters, tx);
  if (elig === undefined) throw new Error("get271Eligibility returned undefined");
  const seg = tx.segments.find((s) => s.id === "AAA");
  if (seg === undefined) throw new Error("the AAA left tx.segments");
  return { seg, elig };
}

/** The `@example` line under test, as it stands in the shipping source. */
const TYPES_SOURCE = readFileSync(
  join(REPO_ROOT, "src", "transactions", "eligibility", "types.ts"),
  "utf8",
);
const SHIPPED_CLAIM = "exactly the bytes the payer sent";

// ---------------------------------------------------------------------------
// Controls: the claim really is in the shipping carrier, and it really does
// hold for an ordinary code, so the failure below is neither imaginary nor an
// artefact of a probe that would fail for every value.
// ---------------------------------------------------------------------------

check("CONTROL the claim is in src/, which ships as dist/index.d.ts", () => {
  assert.ok(TYPES_SOURCE.includes(SHIPPED_CLAIM), "the example line is no longer in types.ts");
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    files: readonly string[];
  };
  assert.ok(pkg.files.includes("dist"), `package.json#files is ${JSON.stringify(pkg.files)}`);
});

check("CONTROL an ordinary code IS byte-identical, so the claim is not always false", () => {
  const { seg, elig } = read271("42");
  assert.equal(elig.aaaConditions[0]?.rejectReasonCode?.code, "42");
  assert.equal(seg.elements[3], "42");
});

check("CONTROL the released element is ONE element on tx.segments, framing preserved", () => {
  const { seg } = read271("7?*2");
  assert.equal(seg.elements.length, 5, `elements are ${JSON.stringify(seg.elements)}`);
  assert.equal(
    seg.elements[3],
    "7?*2",
    `AAA-03 on tx.segments is ${JSON.stringify(seg.elements[3])}`,
  );
});

// ---------------------------------------------------------------------------
// The defect: the shipped example and the shipped behaviour disagree.
// ---------------------------------------------------------------------------

check("F5  no shipped example claims `code` is exactly the bytes the payer sent", () => {
  const { seg, elig } = read271("7?*2");
  const surfaced = elig.aaaConditions[0]?.rejectReasonCode?.code;
  assert.equal(surfaced, "7*2", "the decoded value moved; re-derive this finding");
  assert.ok(
    !TYPES_SOURCE.includes(SHIPPED_CLAIM),
    `X12AaaCode's @example says code is "${SHIPPED_CLAIM}", but the bytes at AAA-03 are ${JSON.stringify(seg.elements[3])} and code is ${JSON.stringify(surfaced)}`,
  );
});

process.stdout.write(`\n${String(failed)} failing check(s)\n`);
process.exit(failed === 0 ? 0 : 1);

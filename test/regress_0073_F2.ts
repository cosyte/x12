/**
 * Impl-refuter probe for S0073-x12-13, finding F2 (blocking).
 *
 * Run standalone with `tsx` (the refuter write-guard,
 * `.claude/hooks/guard-refuter.sh:39`, permits only a single-extension
 * `regress_*` artifact, which vitest's `test/**` + `*.test.ts` include pattern
 * would not pick up):
 *
 *   pnpm --dir=<x12> exec tsx test/regress_0073_F2.ts
 *
 * ## Clauses under test
 *
 * AC-16: "WHEN the AAA path produces any warning or diagnostic THE SYSTEM
 * SHALL produce it as a lookup into the package's existing frozen warning
 * registry, carrying a stable warning code plus the level and positional
 * context of the segment and NOTHING ELSE."
 *
 * AC-1: "... THE SYSTEM SHALL surface them on the typed result with their
 * level, reject reason code and follow-up action code."
 *
 * ## The defect
 *
 * `src/transactions/eligibility/get-271.ts` adds
 *
 *   const AAA_LEVEL_BY_HL_CODE: Readonly<Record<string, ...>> = Object.freeze({ ... });
 *
 * and reads it with an UNGUARDED index in the HL case:
 *
 *   aaaLevel = AAA_LEVEL_BY_HL_CODE[hl.levelCode];
 *
 * `hl.levelCode` is HL-03, verbatim sender bytes (`transactions/shared/hl.ts:84`,
 * `levelCode: elementValue(seg, 3, delimiters)`). An HL-03 naming a member of
 * `Object.prototype` resolves THROUGH THE PROTOTYPE CHAIN rather than to
 * `undefined`, so `key.level` is set to a function/object that is neither one
 * of the four level names nor absent, and the per-level message table is then
 * indexed by that value and misses, shipping `message: undefined`.
 *
 * `Object.freeze` does not help; this is the repo's own documented
 * `X12-VARIANT-LOOKUP-PROTOTYPE` trap. Both places the AAA path mirrors are
 * already hardened: `validateHl` (`transactions/shared/hl.ts:108`) reads its
 * level-code table behind `Object.prototype.hasOwnProperty.call(...)` FIRST,
 * and `makeLookup` (`code-lists/meta.ts`) comments "`Object.hasOwn` first,
 * ALWAYS".
 */

import assert from "node:assert/strict";

import { ALL_WARNING_MESSAGES, get271Eligibility, parseX12 } from "../src/index.js";
import type { X12Eligibility } from "../src/index.js";

/** The four level names AC-1 admits; `undefined` is the only other legal value. */
const LEGAL_LEVELS: ReadonlySet<unknown> = new Set([
  "information-source",
  "information-receiver",
  "subscriber",
  "dependent",
]);

const POISONED_HL03 = ["constructor", "__proto__", "toString", "valueOf"] as const;

/** One 271 whose single HL declares `levelCode` as HL-03, carrying one AAA. */
function read271WithHlLevel(levelCode: string): X12Eligibility {
  const raw = [
    "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
    "GS*HB*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X279A1~",
    "ST*271*0001*005010X279A1~",
    "BHT*0022*11*TXN-REF-F2*20260601*1200~",
    `HL*1**${levelCode}*1~`,
    "AAA*N**72*C~",
    "SE*5*0001~",
    "GE*1*1~",
    "IEA*1*000000001~",
  ].join("\n");
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  assert.ok(tx !== undefined, "probe document carries no 271 transaction set");
  const elig = get271Eligibility(ix.delimiters, tx);
  assert.ok(elig !== undefined, "get271Eligibility returned undefined");
  return elig;
}

const failures: string[] = [];

function check(name: string, run: () => void): void {
  try {
    run();
    process.stdout.write(`ok   ${name}\n`);
  } catch (err) {
    failures.push(name);
    process.stdout.write(`FAIL ${name}\n       ${String((err as Error).message).split("\n")[0]}\n`);
  }
}

// CONTROL first: a conformant HL-03 behaves, so nothing below passes vacuously.
check("CONTROL HL-03 '22' surfaces level 'subscriber' with registry literals", () => {
  const elig = read271WithHlLevel("22");
  assert.equal(elig.aaaConditions.length, 1);
  assert.equal(elig.aaaConditions[0]?.key.level, "subscriber");
  assert.ok(elig.warnings.length > 0, "control produced no warnings at all");
  for (const w of elig.warnings) {
    assert.ok(ALL_WARNING_MESSAGES.has(w.message), `control message not in registry: ${w.code}`);
  }
});

// CONTROL: an HL-03 that is simply unknown (not a prototype member) is handled
// correctly, which is what makes the failures below a prototype issue and not
// a general unknown-level issue.
check("CONTROL HL-03 '99' leaves the level absent and warns from the registry", () => {
  const elig = read271WithHlLevel("99");
  assert.equal(elig.aaaConditions[0]?.key.level, undefined);
  for (const w of elig.warnings) {
    assert.ok(ALL_WARNING_MESSAGES.has(w.message), `control message not in registry: ${w.code}`);
  }
});

for (const levelCode of POISONED_HL03) {
  check(`AC-1  HL-03 '${levelCode}': key.level is a level name or absent`, () => {
    const elig = read271WithHlLevel(levelCode);
    assert.equal(elig.aaaConditions.length, 1, "the AAA was dropped");
    const level = elig.aaaConditions[0]?.key.level as unknown;
    assert.ok(
      level === undefined || LEGAL_LEVELS.has(level),
      `key.level is ${JSON.stringify(String(level))} (typeof ${typeof level}), neither one of the four level names nor undefined`,
    );
  });

  check(`AC-16 HL-03 '${levelCode}': every AAA diagnostic is a frozen-registry literal`, () => {
    const elig = read271WithHlLevel(levelCode);
    assert.ok(elig.warnings.length > 0, "no warnings raised at all");
    for (const w of elig.warnings) {
      assert.equal(
        typeof w.message,
        "string",
        `${w.code} shipped message=${String(w.message)} (typeof ${typeof w.message}) rather than a registry literal`,
      );
      assert.ok(
        ALL_WARNING_MESSAGES.has(w.message),
        `${w.code} message is not a member of ALL_WARNING_MESSAGES`,
      );
    }
  });
}

process.stdout.write(`\n${String(failures.length)} failing check(s)\n`);
process.exit(failures.length === 0 ? 0 : 1);

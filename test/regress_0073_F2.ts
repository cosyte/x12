/**
 * Impl-refuter regression artifact for S0073-x12-13, finding F2 (BLOCKING).
 *
 * Run standalone with `tsx`; vitest's include pattern is `test/**\/*.test.ts`,
 * so a single-extension `regress_*` artifact is deliberately NOT collected by
 * the package suite:
 *
 *   pnpm --dir=<x12> exec tsx test/regress_0073_F2.ts
 *
 * ## The defect
 *
 * `src/transactions/eligibility/get-271.ts` adds a lookup table keyed by
 * DOCUMENT BYTES and reads it with a bare index:
 *
 *   const AAA_LEVEL_BY_HL_CODE: Readonly<Record<string, X12AaaConditionLevel | undefined>> =
 *     Object.freeze({ ... });
 *   ...
 *   aaaLevel = AAA_LEVEL_BY_HL_CODE[hl.levelCode];
 *
 * `hl.levelCode` is HL-03 verbatim off the wire (`transactions/shared/hl.ts`,
 * `levelCode: elementValue(seg, 3, delimiters)`). An object literal inherits
 * `Object.prototype`, so an HL-03 naming an own property of that prototype
 * resolves THROUGH THE CHAIN rather than to `undefined`, and `Object.freeze`
 * does not help. The table's own doc comment states the opposite invariant:
 * "A level code outside this map resolves to `undefined`".
 *
 * ## Clauses broken
 *
 * - AC-1 / AC-7: the surfaced key's `level` part is typed and documented as one
 *   of the four level names or `undefined`. It holds a FUNCTION, or
 *   `Object.prototype` itself.
 * - AC-16: the per-level message tables are then indexed by that value, miss,
 *   and the AAA path ships a warning whose `message` is `undefined` rather than
 *   "a lookup into the package's existing frozen warning registry".
 *   `X12ParseWarning.message` is declared `readonly message: string`, and
 *   `ALL_WARNING_MESSAGES.has(undefined)` is false.
 * - AC-7a: because `key.level` is now non-`undefined`, `decodeAaa`'s
 *   `key.level === undefined || key.hierarchyId === undefined` guard does not
 *   fire, so the `X12_271_AAA_LOOP_UNIDENTIFIED` warning that an ordinary
 *   unnameable level DOES raise is silently suppressed for these documents.
 *
 * ## This is the repository's own named trap
 *
 * `X12-VARIANT-LOOKUP-PROTOTYPE` in the repo `CLAUDE.md`: "a table literal
 * inherits `Object.prototype` so EVERY OWN PROPERTY of it resolved TRUTHY,
 * `Object.freeze` DOES NOT HELP, `in` IS NOT THE SAFE FORM". Both neighbouring
 * call sites are already hardened: `validateHl` reads its level-code map behind
 * `Object.prototype.hasOwnProperty.call(...)` FIRST, and `makeLookup` in
 * `src/code-lists/meta.ts` uses `Object.hasOwn` with a comment naming this exact
 * failure. The repo even ships a purpose-built remedy for a table like this one,
 * `wireLookup` in `src/parser/lookup.ts`: "The fix is applied at the TABLE
 * rather than at each read site on purpose."
 */

import assert from "node:assert/strict";

import { ALL_WARNING_MESSAGES, WARNING_CODES, get271Eligibility, parseX12 } from "../src/index.js";
import type { X12Eligibility } from "../src/index.js";

/** The only values AC-1 and AC-7 admit for the key's level part. */
const LEGAL_LEVEL: ReadonlySet<unknown> = new Set([
  "information-source",
  "information-receiver",
  "subscriber",
  "dependent",
  undefined,
]);

/**
 * HL-03 values that are own properties of `Object.prototype`. Named, not
 * enumerated as a closed set: the membership is engine-dependent and the
 * property under test is "a key the table does not declare answers
 * `undefined`", not "these five keys".
 */
const PROTOTYPE_HL03 = ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"];

/** A 271 whose single hierarchical loop declares `hl03` as HL-03, with one AAA. */
function decodeWithHl03(hl03: string): X12Eligibility {
  const raw = [
    "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
    "GS*HB*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X279A1~",
    "ST*271*0001*005010X279A1~",
    "BHT*0022*11*TXN-REF-F2*20260601*1200~",
    `HL*1**${hl03}*1~`,
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

// ---------------------------------------------------------------------------
// Controls first: a conformant level code and an ORDINARY unknown level code
// both behave, which pins the failures below to the prototype chain rather
// than to "an unknown level" in general.
// ---------------------------------------------------------------------------

check("CONTROL HL-03 '22' surfaces 'subscriber' with registry literals", () => {
  const elig = decodeWithHl03("22");
  assert.equal(elig.aaaConditions.length, 1);
  assert.equal(elig.aaaConditions[0]?.key.level, "subscriber");
  assert.ok(elig.warnings.length > 0, "control produced no warnings at all");
  for (const w of elig.warnings) assert.ok(ALL_WARNING_MESSAGES.has(w.message), w.code);
});

check(
  "CONTROL HL-03 '99' leaves the level absent, warns LOOP_UNIDENTIFIED, stays in registry",
  () => {
    const elig = decodeWithHl03("99");
    assert.equal(elig.aaaConditions[0]?.key.level, undefined);
    assert.equal(
      elig.warnings.filter((w) => w.code === WARNING_CODES.X12_271_AAA_LOOP_UNIDENTIFIED).length,
      1,
    );
    for (const w of elig.warnings) assert.ok(ALL_WARNING_MESSAGES.has(w.message), w.code);
  },
);

// ---------------------------------------------------------------------------
// The defect, one HL-03 at a time.
// ---------------------------------------------------------------------------

for (const hl03 of PROTOTYPE_HL03) {
  check(`AC-1/AC-7  HL-03 '${hl03}': key.level is a level name or absent`, () => {
    const elig = decodeWithHl03(hl03);
    assert.equal(elig.aaaConditions.length, 1, "the AAA was dropped");
    const level = elig.aaaConditions[0]?.key.level as unknown;
    assert.ok(
      LEGAL_LEVEL.has(level),
      `key.level is typeof ${typeof level}, value ${JSON.stringify(String(level))}`,
    );
  });

  check(`AC-16      HL-03 '${hl03}': every AAA diagnostic is a frozen-registry literal`, () => {
    const elig = decodeWithHl03(hl03);
    assert.ok(elig.warnings.length > 0, "no warning raised at all");
    for (const w of elig.warnings) {
      assert.equal(
        typeof w.message,
        "string",
        `${w.code} shipped message=${String(w.message)} (typeof ${typeof w.message})`,
      );
      assert.ok(ALL_WARNING_MESSAGES.has(w.message), `${w.code} message is not in the registry`);
    }
  });

  check(`AC-7a      HL-03 '${hl03}': an unnameable level still warns LOOP_UNIDENTIFIED`, () => {
    // The control above shows an ordinary unknown level code raises exactly
    // one. A prototype-named one raises none, because the guard tests
    // `key.level === undefined` and the poisoned value is not undefined.
    const elig = decodeWithHl03(hl03);
    assert.equal(
      elig.warnings.filter((w) => w.code === WARNING_CODES.X12_271_AAA_LOOP_UNIDENTIFIED).length,
      1,
      "the AC-7a warning an unknown level raises was suppressed",
    );
  });
}

// ---------------------------------------------------------------------------
// What a caller downstream actually receives: both poisoned fields are dropped
// by JSON serialization, so the rejection arrives with no level and no
// diagnostic text at all.
// ---------------------------------------------------------------------------

check("AC-1/AC-16 the level and the message survive JSON round-tripping", () => {
  const elig = decodeWithHl03("constructor");
  const round = JSON.parse(JSON.stringify(elig)) as {
    aaaConditions: { key: Record<string, unknown> }[];
    warnings: Record<string, unknown>[];
  };
  assert.ok(
    Object.hasOwn(round.aaaConditions[0]?.key ?? {}, "level"),
    "key.level disappeared from the serialized result",
  );
  assert.ok(
    Object.hasOwn(round.warnings[0] ?? {}, "message"),
    "warning.message disappeared from the serialized result",
  );
});

process.stdout.write(`\n${String(failed)} failing check(s)\n`);
process.exit(failed === 0 ? 0 : 1);

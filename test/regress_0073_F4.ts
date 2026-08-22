/**
 * Impl-refuter regression artifact for S0073-x12-13, finding F4 (BLOCKING).
 *
 * Run standalone with `tsx` (the refuter write-guard permits only a
 * single-extension `regress_*` artifact, which vitest's `test/**` +
 * `*.test.ts` include pattern would not pick up):
 *
 *   pnpm --dir=<x12> exec tsx test/regress_0073_F4.ts
 *
 * ## The defect
 *
 * `src/transactions/eligibility/get-271.ts` introduces a lookup table keyed by
 * DOCUMENT BYTES and reads it with an unguarded index:
 *
 *   const AAA_LEVEL_BY_HL_CODE: Readonly<Record<string, ...>> = Object.freeze({...});
 *   ...
 *   aaaLevel = AAA_LEVEL_BY_HL_CODE[hl.levelCode];
 *
 * `hl.levelCode` is HL-03 verbatim off the wire (`transactions/shared/hl.ts`,
 * `levelCode: elementValue(seg, 3, delimiters)`). An object literal inherits
 * `Object.prototype`, so an HL-03 naming a prototype member resolves THROUGH
 * THE CHAIN instead of to `undefined`. `Object.freeze` does not help.
 *
 * Two spec clauses break as a result:
 *
 *  - AC-1 / AC-7: `key.level` is documented and typed as one of the four level
 *    names or `undefined`. It holds a FUNCTION (or `Object.prototype`).
 *  - AC-16: the per-level message tables are then indexed by that value, miss,
 *    and the warning ships `message: undefined` rather than a lookup into the
 *    frozen registry. `X12ParseWarning.message` is declared `readonly message:
 *    string`.
 *
 * The repo already knows this rule and applies it at both neighbouring call
 * sites: `validateHl` in the SAME FILE as `decodeHl` guards its
 * document-bytes-keyed table with `Object.prototype.hasOwnProperty.call(...)`
 * first, and `makeLookup` in `src/code-lists/meta.ts` carries the comment
 * "`Object.hasOwn` first, ALWAYS ... a literal inherits `Object.prototype`".
 * It is the repo's documented `X12-VARIANT-LOOKUP-PROTOTYPE` trap.
 */

import assert from "node:assert/strict";

import { ALL_WARNING_MESSAGES, get271Eligibility, parseX12 } from "../src/index.js";
import type { X12Eligibility } from "../src/index.js";

/** The only values AC-1 and AC-7 admit for `key.level`. */
const LEGAL_LEVEL: ReadonlySet<unknown> = new Set([
  "information-source",
  "information-receiver",
  "subscriber",
  "dependent",
  undefined,
]);

/** A 271 whose one hierarchical loop declares `hl03` as HL-03, carrying one AAA. */
function decodeWithHl03(hl03: string): X12Eligibility {
  const raw = [
    "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
    "GS*HB*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X279A1~",
    "ST*271*0001*005010X279A1~",
    "BHT*0022*11*TXN-REF-F4*20260601*1200~",
    `HL*1**${hl03}*1~`,
    "AAA*N**72*C~",
    "SE*5*0001~",
    "GE*1*1~",
    "IEA*1*000000001~",
  ].join("\n");
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions[0];
  assert.ok(tx !== undefined, "no 271 transaction set");
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
// Controls first, so nothing below can pass vacuously and so the failures are
// pinned to the prototype chain rather than to "an unknown level".
// ---------------------------------------------------------------------------

check("CONTROL conformant HL-03 '22' names the subscriber level", () => {
  const elig = decodeWithHl03("22");
  assert.equal(elig.aaaConditions.length, 1);
  assert.equal(elig.aaaConditions[0]?.key.level, "subscriber");
  assert.ok(elig.warnings.length > 0);
  for (const w of elig.warnings) assert.ok(ALL_WARNING_MESSAGES.has(w.message));
});

check("CONTROL an ordinary unknown HL-03 '99' leaves the level absent", () => {
  const elig = decodeWithHl03("99");
  assert.equal(elig.aaaConditions[0]?.key.level, undefined);
  for (const w of elig.warnings) assert.ok(ALL_WARNING_MESSAGES.has(w.message));
});

// ---------------------------------------------------------------------------
// The defect.
// ---------------------------------------------------------------------------

for (const hl03 of ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"]) {
  check(`AC-1/AC-7  HL-03 '${hl03}': key.level is a level name or absent`, () => {
    const elig = decodeWithHl03(hl03);
    assert.equal(elig.aaaConditions.length, 1, "the AAA was dropped");
    const level = elig.aaaConditions[0]?.key.level as unknown;
    assert.ok(
      LEGAL_LEVEL.has(level),
      `key.level is typeof ${typeof level}, value ${JSON.stringify(String(level))}`,
    );
  });

  check(`AC-16      HL-03 '${hl03}': every AAA diagnostic is a registry literal`, () => {
    const elig = decodeWithHl03(hl03);
    assert.ok(elig.warnings.length > 0, "no warning raised at all");
    for (const w of elig.warnings) {
      assert.equal(
        typeof w.message,
        "string",
        `${w.code} shipped message=${String(w.message)} (typeof ${typeof w.message})`,
      );
      assert.ok(ALL_WARNING_MESSAGES.has(w.message), `${w.code} message not in the registry`);
    }
  });
}

// ---------------------------------------------------------------------------
// The consequence a caller actually sees.
//
// AMENDED BY THE FIX PASS, for the same reason and in the same form as the
// twin amendment in `regress_0073_F2.ts`, which carries the full argument. In
// short: the `key.level` half of the committed check asserts that an ABSENT key
// part survives `JSON.stringify`, which it cannot, and which this file's own
// ordinary-unknown control (`99`) fails identically. AC-7a requires that part to
// be absent where the level cannot be named, so the assertion contradicted the
// spec rather than measuring the defect. The `message` half measured a real
// defect and is kept unchanged.
// ---------------------------------------------------------------------------

check("CONTROL an ABSENT key part is omitted by JSON.stringify for ANY unknown level", () => {
  const round = JSON.parse(JSON.stringify(decodeWithHl03("99"))) as {
    aaaConditions: { key: Record<string, unknown> }[];
  };
  assert.equal(Object.hasOwn(round.aaaConditions[0]?.key ?? {}, "level"), false);
});

check("AC-1  over the wire, a prototype-named HL-03 reads as an ordinary unknown one", () => {
  const wire = (hl03: string): unknown => {
    const elig = decodeWithHl03(hl03);
    return JSON.parse(
      JSON.stringify({ aaaConditions: elig.aaaConditions, warnings: elig.warnings }),
    ) as unknown;
  };
  assert.deepEqual(wire("constructor"), wire("99"));
});

check("AC-16 the diagnostic text survives JSON round-tripping", () => {
  const round = JSON.parse(JSON.stringify(decodeWithHl03("constructor"))) as {
    warnings: Record<string, unknown>[];
  };
  assert.ok(
    Object.hasOwn(round.warnings[0] ?? {}, "message"),
    "warning.message disappeared from the serialized result",
  );
});

process.stdout.write(`\n${String(failed)} failing check(s)\n`);
process.exit(failed === 0 ? 0 : 1);

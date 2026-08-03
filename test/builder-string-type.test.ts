/**
 * The emit gate for `@cosyte/x12`'s builders (`X12-NUMERIC-VALUE-EMITS-EMPTY`).
 *
 * ## The defect, and why it is sharper than the two sibling gates
 *
 * `test/builder-refusal-bounds.test.ts` guards what a refusal SAYS.
 * `test/builder-array-bounds.test.ts` guards whether a refusal HAPPENS when a
 * caller forges a list. This file guards whether the value the caller supplied
 * actually REACHES THE DOCUMENT.
 *
 * Every builder escaped its element values through one helper:
 *
 * ```ts
 * const esc = (value: string): string => escapeRelease(value, delimiters);
 * ```
 *
 * `escapeRelease` opened `if (value.length === 0) return value;` and looped to
 * `value.length`. On a `number` there is no `.length`: `undefined === 0` is
 * false so the early return did not fire, `i < undefined` is false so the loop
 * body never ran, and the function returned its empty accumulator. **A number
 * handed to a string element was emitted as `""`, with no warning and no
 * error.**
 *
 * **Measured on this tree at base commit `143a6ea`, with an otherwise-balanced
 * remit and only `patientControlNumber` changed:**
 *
 * ```text
 * "PT-ACCT-001"  ->  CLP*PT-ACCT-001*1*500.00*450.00*50.00*MB*ICN-9001*11::1   warnings = 0
 * 1              ->  CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1              warnings = 0
 * 12345          ->  CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1              warnings = 0
 * 1e21           ->  CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1              warnings = 0
 * NaN            ->  CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1              warnings = 0
 * true           ->  CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1              warnings = 0
 * []             ->  CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1              warnings = 0
 * {}             ->  CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1              warnings = 0
 * ```
 *
 * The interchange is frozen, successful-looking, and missing **CLP-01**, which
 * TR3 005010X221A1 Loop 2100 marks required and which is the reassociation key
 * back to the 837's CLM-01.
 *
 * **The builder's own required-field guard did not catch it, which is the
 * sharpest part.** `build-835.ts` refuses `patientControlNumber === ""` by
 * name. A number is not `""`, so it passed the guard and became `""` one line
 * later inside `esc`. The decision that the element may not be empty was
 * already made; the type confusion walked around it.
 *
 * ## The decision this gate pins: REFUSE, never coerce
 *
 * The remedy was filed as a decision because both answers are defensible and
 * the base state was neither. The full argument is in
 * `src/builder/caller-string.ts`; the short form is that coercion would mint a
 * **different** identifier (`String(12345)` for a caller whose JSON lost the
 * leading zeros of `"0012345"`), and reassociating to the wrong claim is worse
 * than failing to reassociate at all. `#51` made `renderCallerValue` COERCE for
 * this same caller mistake, and that asymmetry is deliberate: a refusal message
 * must survive anything, a document must invent nothing.
 *
 * ## The source scan is the exhaustive half
 *
 * The behavioural cases below drive a number into one element of each builder.
 * What covers all 411 `esc` invocations is {@link escaperDeclarations}: it walks
 * every builder module and requires the module's `esc` to be built by
 * `makeCallerEscaper(`, and {@link directEscapeCalls}, which requires no
 * builder module to reach `escapeRelease` on its own. A tenth builder that
 * writes the base one-liner reds this file without anyone remembering to add a
 * case.
 *
 * ## Six limits, written down rather than claimed away
 *
 * 0. **This gate covers what goes through `esc`, and other element positions do
 *    not go through it.** Some are emitted raw, so a wrong-typed value there is
 *    still emitted verbatim with no warning; THIRTY-SIX `esc` slots read
 *    `.toString()` off what the types say is an `X12Decimal`, so a raw `number`
 *    arrives already a string. All of it is `PRE-EXISTING`, outside the item's
 *    stated `esc()` scope, and disclosed in `KNOWN-LIMITATIONS.md`. **This
 *    sentence is deliberately NOT a census, and that is a correction: three
 *    consecutive drafts published an exhaustive counted list here** (first
 *    "the single route a caller-supplied element value takes into an emitted
 *    segment", then "SEVEN string-typed positions", then "THIRTY-SIX
 *    `.toString()` slots, and this one IS counted because the gate asserts it")
 *    **and adversarial review measured all three false** - GS-04, GS-05, GS-07
 *    and `build837`'s LX-01 for the second, and for the third `build-837`'s
 *    off-line `const units = line.units.toString()` plus two `.toString()`s
 *    inside a `ctx.comp([...])`, none of which the same-line regex below can
 *    see. **No total is published anywhere in this slice now, on purpose.** The
 *    behavioural cases at the bottom of this file pin named EXAMPLES so the
 *    class cannot change shape unnoticed; the examples are not the boundary.
 * 1. **The refusal names the BUILDER, not the element position.** `esc` is
 *    unary and invoked 411 times on 378 lines (counted comment-stripped on this
 *    tree, `ctx.esc(...)` included, and pinned below); threading a per-slot
 *    locator through every one of them would be 411 chances to mislabel a slot.
 *    An earlier draft of this file published "378 call sites", which is the
 *    LINE count. The message names the
 *    builder and echoes the offending value bounded, and that is the whole
 *    locator a caller gets.
 * 2. **The ISA/GS fixed-width slots are NOT covered and are NOT fixed here.**
 *    They go through each module's `pad` / `padControl`, not `esc`. Measured at
 *    base and unchanged at head: `pad(1, 15)` throws an untyped `TypeError`
 *    (`value.slice is not a function`) and `padControl(1, 9)` throws the
 *    module's typed refusal with the **misleading** text "exceeds the 9-char
 *    spec limit". Both are wrong in their own way; neither is silent, so
 *    neither is this defect. Pinned below so they cannot quietly become silent,
 *    and disclosed in `KNOWN-LIMITATIONS.md`.
 * 3. **`buildTA1` has no `esc` at all** - every TA1 element is fixed-width and
 *    goes through `pad`. Outside this chokepoint by construction.
 * 4. **The scan is syntactic.** It keys on the `const esc = ` shape this
 *    library uses in all nine modules. A module that escaped inline, or through
 *    a differently-named binding, would not be seen. A strong tripwire for the
 *    shape this library actually uses, not a proof - the same honesty the two
 *    sibling gates carry.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { makeCallerEscaper, requireCallerString } from "../src/builder/caller-string.js";
import {
  AckBuildError,
  build271,
  build277,
  build820,
  build834,
  build835,
  build837P,
  build999,
  buildInterchange,
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  Claim837BuildError,
  ClaimStatus277BuildError,
  Eligibility271BuildError,
  Enrollment834BuildError,
  escapeRelease,
  Premium820BuildError,
  Remit835BuildError,
  ServicesReview278BuildError,
  serializeX12,
  X12BuildError,
  X12Decimal,
  build278Request,
  type X12Interchange,
} from "../src/index.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

const DELIMITERS = { element: "*", repetition: "^", component: ":", segment: "~" } as const;

/**
 * Launder a value into the typed slot a builder declares.
 *
 * Every case in this file is a JavaScript or JSON caller reaching a slot the
 * TypeScript types say is unreachable, which is the whole point: the types are
 * not a runtime guarantee, and `@cosyte/cli` is such a caller.
 */
function asJsCaller<T>(value: unknown): T {
  return value as T;
}

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

// ---------------------------------------------------------------------------
// The source scan.
// ---------------------------------------------------------------------------

/** Every module that can escape a caller-supplied element value. */
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

/**
 * Strip block comments so an illustrative `const esc = …` inside a docblock is
 * not mistaken for one the engine runs. `src/builder/caller-string.ts` quotes
 * the defect verbatim in its own header, and so does this file's.
 */
function code(file: string): string {
  return readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//gu, (m) => m.replace(/[^\n]/gu, " "));
}

interface EscaperDeclaration {
  readonly file: string;
  readonly line: number;
  /** Everything after `const esc = ` on that line. */
  readonly rhs: string;
}

/** Every `const esc = …` a builder module declares, with its right-hand side. */
function escaperDeclarations(file: string): EscaperDeclaration[] {
  const src = code(file);
  const out: EscaperDeclaration[] = [];
  const re = /const esc = (.*)$/gmu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out.push({ file, line: src.slice(0, m.index).split("\n").length, rhs: (m[1] ?? "").trim() });
  }
  return out;
}

/** Every direct `escapeRelease(` call outside the chokepoint module. */
function directEscapeCalls(file: string): number {
  return (code(file).match(/\bescapeRelease\(/gu) ?? []).length;
}

/**
 * Every `esc(` / `ctx.esc(` INVOCATION in a builder module, comment-stripped.
 *
 * Deliberately counts invocations and not matching lines: a first draft of this
 * slice published "378 `esc` call sites" in four places, and 378 is the number
 * of LINES that contain one. `\besc\(` also has to admit `ctx.esc(`, because
 * the domain builders pass the escaper down inside an emit context and that is
 * where most of the invocations live: 72 of `build-837`'s 82 are `ctx.esc(`.
 * (An earlier draft of this very sentence wrote "66 of 82", which is the
 * `ctx.esc(` LINE count against the total INVOCATION count. Third instance of
 * the same mistake in this slice; it is not a hard one to make.)
 */
function escInvocations(file: string): number {
  return (code(file).match(/\besc\(/gu) ?? []).length;
}

/** Every `esc(` invocation whose argument reaches `.toString()` on the same line. */
function escToStringSlots(file: string): number {
  return (code(file).match(/\besc\([^\n]*\.toString\(\)/gu) ?? []).length;
}

describe("builder element escaping: the source gate", () => {
  const modules = builderModules();
  const declarations = modules.flatMap(escaperDeclarations);

  it("finds an escaper in every builder that emits variable-width elements", () => {
    // Re-derived on this tree: NINE modules declare an `esc`. `build-ta1.ts` is
    // the deliberate absence - every TA1 element is fixed-width and goes
    // through `pad`. Pinned so a module that stops being scanned (a rename, a
    // moved directory) is a failure rather than a silently smaller sweep.
    expect(declarations).toHaveLength(9);
    expect(new Set(declarations.map((d) => d.file)).size).toBe(9);
    expect(modules.some((m) => m.endsWith(join("transactions", "ack", "build-ta1.ts")))).toBe(true);
    expect(
      declarations.some((d) => d.file.endsWith(join("transactions", "ack", "build-ta1.ts"))),
    ).toBe(false);
  });

  it("pins the invocation count, because the first draft published a line count", () => {
    // 411 invocations on 378 lines, counted comment-stripped on this tree with
    // `ctx.esc(...)` included. The published figure and the asserted figure are
    // the same number, so prose cannot drift away from the code.
    //
    // A legitimate builder edit WILL red this. The remedy is to update this
    // number and the places that publish it in the SAME commit, which is the
    // whole point of pinning it. Never delete the assertion to get green.
    const invocations = modules.reduce((n, m) => n + escInvocations(m), 0);
    const lines = modules.reduce(
      (n, m) =>
        n +
        code(m)
          .split("\n")
          .filter((l) => /\besc\(/u.test(l)).length,
      0,
    );
    expect(invocations).toBe(411);
    expect(lines).toBe(378);
    expect(invocations).toBeGreaterThan(lines);
  });

  it("pins the same-line .toString() reads, WITHOUT claiming they are all of them", () => {
    // A raw `number` in a slot the types say is an `X12Decimal` has its own
    // `.toString()`, so it arrives at the chokepoint already a string and is
    // passed through. This assertion is a DRIFT TRIPWIRE for the shape the
    // regex sees, exactly like limit 4 above says of the sibling scan - it is
    // not a proof and it is not a census. `escToStringSlots` is same-line only,
    // and `build-837` alone has three reads it cannot see: `const units =
    // line.units.toString()` followed by `ctx.esc(units)` on another line, and
    // two `.toString()`s inside a `ctx.comp([...])` that maps `esc`. A draft of
    // this slice published these numbers as "exhaustive, because the gate
    // asserts it file by file", which is circular: a regex asserting its own
    // output proves the regex has not drifted, never that it captures the
    // property. The numbers are kept because drift is worth catching.
    const byFile = new Map(
      modules.map((m) => [m.slice(SRC.length + 1), escToStringSlots(m)] as const),
    );
    expect([...byFile.values()].reduce((a, b) => a + b, 0)).toBe(36);
    expect(byFile.get(join("transactions", "claim", "build-837.ts"))).toBe(12);
    expect(byFile.get(join("transactions", "remit", "build-835.ts"))).toBe(12);
    expect(byFile.get(join("transactions", "premium", "build-820.ts"))).toBe(4);
    expect(byFile.get(join("transactions", "status", "build-277.ts"))).toBe(4);
    expect(byFile.get(join("transactions", "eligibility", "build-271.ts"))).toBe(3);
    expect(byFile.get(join("transactions", "enrollment", "build-834.ts"))).toBe(1);
  });

  it("builds every one of them through makeCallerEscaper", () => {
    const findings = declarations
      .filter((d) => !d.rhs.startsWith("makeCallerEscaper("))
      .map((d) => `${d.file.slice(SRC.length + 1)}:${String(d.line)} -> ${d.rhs}`);
    expect(findings).toEqual([]);
  });

  it("leaves escapeRelease reachable only from the chokepoint", () => {
    // A builder that imports and calls `escapeRelease` itself has walked around
    // the type check even if its `esc` looks right.
    const findings = modules
      .filter((m) => !m.endsWith(join("builder", "caller-string.ts")))
      .filter((m) => directEscapeCalls(m) > 0)
      .map((m) => m.slice(SRC.length + 1));
    expect(findings).toEqual([]);
    expect(directEscapeCalls(join(SRC, "builder", "caller-string.ts"))).toBe(1);
  });

  it("would flag the base one-liner, which is the negative control", () => {
    // The gate is only worth its lines if it fails on the defect. This is the
    // exact right-hand side every one of the nine modules carried at base
    // commit `143a6ea`.
    const base = "(value: string): string => escapeRelease(value, delimiters);";
    expect(base.startsWith("makeCallerEscaper(")).toBe(false);
    // And a plausible near-miss - the right helper, wrapped - is not admitted
    // either, because it is not the shape this gate can reason about.
    expect(
      'wrap(makeCallerEscaper(delimiters, "x", refuseSpec));'.startsWith("makeCallerEscaper("),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The chokepoint itself.
// ---------------------------------------------------------------------------

describe("requireCallerString", () => {
  const refuse = (message: string): never => {
    throw new Error(message);
  };

  it("passes a real string straight through, by identity", () => {
    const real = "PT-ACCT-001";
    expect(requireCallerString(real, "build835", refuse)).toBe(real);
    // The empty string is a VALUE, not an absence: a trailing empty element is
    // positionally meaningful in X12 and several builders emit one on purpose.
    expect(requireCallerString("", "build835", refuse)).toBe("");
  });

  it("refuses every non-string a JSON or JS caller can produce", () => {
    const rogues: readonly [string, unknown][] = [
      ["a number", 1],
      ["a number", 0],
      ["a number", NaN],
      ["a number", 1e21],
      ["a boolean", true],
      ["null", null],
      ["undefined", undefined],
      ["an array", []],
      ["an object", {}],
      ["an object", { length: 3 }],
      ["a function", (): void => undefined],
      ["a symbol", Symbol("s")],
      ["a bigint", 1n],
    ];
    for (const [shape, rogue] of rogues) {
      let thrown: unknown;
      try {
        requireCallerString(asJsCaller<string>(rogue), "build835", refuse);
      } catch (err) {
        thrown = err;
      }
      expect((thrown as Error | undefined)?.message).toContain(
        `build835: every element value must be a string, but received ${shape}`,
      );
    }
  });

  it("says WHY it does not coerce, because the caller has to make that call", () => {
    // The message is the whole user-facing half of this decision. A caller who
    // is told only "must be a string" reaches for `String(value)`, which is the
    // one remedy that can silently change a leading-zero identifier.
    let message = "";
    try {
      requireCallerString(asJsCaller<string>(12_345), "build835", refuse);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("never coerced");
    expect(message).toContain("leading-zero identifier");
    expect(message).toContain("Convert at the call site");
  });

  it("bounds what it says about the offending value", () => {
    // Naming the value is itself a caller-value interpolation, so it goes
    // through the same renderer the two sibling gates use. A guard that fixed a
    // dropped element by opening a 120,000-character message would have traded
    // one defect for another. A `bigint` is the reachable way to make a
    // non-string, non-object value this long.
    const huge = BigInt("9".repeat(120_000));
    let message = "";
    try {
      requireCallerString(asJsCaller<string>(huge), "build835", refuse);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("(120000 characters)");
    expect(message).not.toContain("9".repeat(120_000));
    expect(message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 300);
  });

  it("never runs a hostile toString or Symbol.toStringTag", () => {
    // An object is described by TYPE alone and never echoed.
    // `Object.prototype.toString` reads `Symbol.toStringTag`, and a caller sets
    // it; `String(value)` runs a caller-supplied `toString`. Neither is worth
    // running to name a type that is already wrong.
    let ran = false;
    const hostile = {
      [Symbol.toStringTag]: "Z".repeat(120_000),
      toString(): string {
        ran = true;
        return "Q".repeat(120_000);
      },
    };
    let message = "";
    try {
      requireCallerString(asJsCaller<string>(hostile), "build835", refuse);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(ran).toBe(false);
    expect(message).not.toContain("Z".repeat(120_000));
    expect(message).not.toContain("Q".repeat(120_000));
    expect(message).toContain("received an object");
  });

  it("escapes exactly as before once the type check passes", () => {
    const esc = makeCallerEscaper(DELIMITERS, "build835", refuse);
    expect(esc("ab~cd*ef:gh")).toBe("ab?~cd?*ef?:gh");
    expect(esc("a?b")).toBe("a??b");
    expect(esc("")).toBe("");
    expect(esc("plain")).toBe("plain");
  });
});

// ---------------------------------------------------------------------------
// The public escaper.
// ---------------------------------------------------------------------------

describe("escapeRelease on a non-string", () => {
  it("throws instead of silently returning the empty string", () => {
    for (const rogue of [1, 0, NaN, true, {}, [], null, undefined, 1n]) {
      expect(() => escapeRelease(asJsCaller<string>(rogue), DELIMITERS)).toThrow(TypeError);
      expect(() => escapeRelease(asJsCaller<string>(rogue), DELIMITERS)).toThrow(
        /escapeRelease: value must be a string/u,
      );
    }
  });

  it("is unchanged for every string", () => {
    expect(escapeRelease("", DELIMITERS)).toBe("");
    expect(escapeRelease("ab~cd*ef:gh", DELIMITERS)).toBe("ab?~cd?*ef?:gh");
    expect(escapeRelease("a?b", DELIMITERS)).toBe("a??b");
  });
});

// ---------------------------------------------------------------------------
// Behavioural: the filed case.
// ---------------------------------------------------------------------------

const ENVELOPE = {
  senderId: "MEDICARE",
  receiverId: "SUBMITTER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

const LINE = {
  productServiceIdQualifier: "HC",
  productServiceId: "99213",
  modifiers: ["25"],
  chargeAmount: dec("500.00"),
  paymentAmount: dec("450.00"),
  serviceDateStart: "20260501",
  serviceDateEnd: "20260501",
  adjustments: [{ groupCode: "PR", reasonCode: "1", amount: dec("50.00") }],
  amounts: [{ qualifier: "B6", amount: dec("450.00") }],
  remarks: [{ system: "HE", code: "N4" }],
};

function remitSpec(patientControlNumber: unknown): unknown {
  return {
    envelope: ENVELOPE,
    payment: {
      transactionHandlingCode: "I",
      totalActualPayment: dec("450.00"),
      creditDebitFlag: "C",
      method: "ACH",
      paymentDate: "20260601",
    },
    traces: [{ traceTypeCode: "1", referenceId: "0012345", originatingCompanyId: "1512345678" }],
    payer: { entityIdentifierCode: "PR", name: "MEDICARE PART A" },
    payee: {
      entityIdentifierCode: "PE",
      name: "RENDERING CLINIC",
      idQualifier: "XX",
      idCode: "1234567890",
    },
    claims: [
      {
        patientControlNumber,
        claimStatusCode: "1",
        totalChargeAmount: dec("500.00"),
        totalPaymentAmount: dec("450.00"),
        patientResponsibilityAmount: dec("50.00"),
        claimFilingIndicatorCode: "MB",
        payerClaimControlNumber: "ICN-9001",
        facilityTypeCode: "11",
        claimFrequencyCode: "1",
        patient: {
          entityIdentifierCode: "QC",
          lastName: "PATIENT",
          firstName: "TEST",
          idQualifier: "MI",
          idCode: "MEMBER001",
        },
        serviceLines: [LINE],
      },
    ],
  };
}

function clpOf(ix: X12Interchange): string {
  const seg = serializeX12(ix)
    .split("~")
    .find((s) => s.trimStart().startsWith("CLP"));
  return seg ?? "";
}

describe("build835: the filed case, CLP-01 (TR3 005010X221A1 Loop 2100)", () => {
  it("still emits the reassociation key for a string", () => {
    const ix = build835(asJsCaller(remitSpec("PT-ACCT-001")));
    expect(clpOf(ix)).toBe("CLP*PT-ACCT-001*1*500.00*450.00*50.00*MB*ICN-9001*11::1");
    expect(ix.warnings).toHaveLength(0);
  });

  it("refuses every non-string that used to emit CLP** with zero warnings", () => {
    // Each of these produced `CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1`
    // with `warnings.length === 0` at base commit `143a6ea`, measured on this
    // tree with only this field changed.
    for (const rogue of [1, 12_345, 1e21, NaN, true, [], {}]) {
      let thrown: unknown;
      try {
        build835(asJsCaller(remitSpec(rogue)));
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(Remit835BuildError);
      expect((thrown as { code?: unknown }).code).toBe("X12_835_BUILD_INVALID_SPEC");
      expect((thrown as Error).message).toContain("every element value must be a string");
    }
  });

  it("keeps the empty-string refusal it already had, on its own message", () => {
    // The builder already refused `patientControlNumber === ""` by name. The
    // defect was that a number is not `""`, so it walked around this guard and
    // became `""` one line later. Both refusals must exist, and they are
    // different messages because they are different mistakes.
    let thrown: unknown;
    try {
      build835(asJsCaller(remitSpec("")));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(Remit835BuildError);
    expect((thrown as Error).message).not.toContain("must be a string");
  });
});

// ---------------------------------------------------------------------------
// Behavioural: one element of every builder that has an escaper.
// ---------------------------------------------------------------------------

const H834 = {
  transactionSetPurposeCode: "00",
  referenceId: "F1",
  date: "20260601",
  time: "1200",
  actionCode: "2",
  sponsor: { entityIdentifierCode: "P5", name: "EMP", idQualifier: "FI", idCode: "F1" },
  payer: { entityIdentifierCode: "IN", name: "PAY", idQualifier: "FI", idCode: "F2" },
};

const MEMBER = {
  subscriberIndicator: "Y",
  relationshipCode: "18",
  maintenanceTypeCode: "021",
  member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
};

/**
 * Each case: the label, a builder call taking one element value, and the error
 * class it must raise. The string value builds; the numeric one must refuse.
 *
 * **Every one of these emitted a document with that element EMPTY at base
 * commit `143a6ea`**, measured on this tree by driving this same table against
 * a `143a6ea` worktree and diffing the body segments (`ISA`/`GS`/`ST`/`SE`/
 * `GE`/`IEA` elided). Where the dropped element was trailing, `seg`'s
 * trailing-empty trim removed it outright, so the document is not even
 * positionally recoverable:
 *
 * ```text
 * buildInterchange  BPR*A1*450.00                     -> BPR**450.00
 * build999          AK2*837*A1*005010X222A2           -> AK2*837**005010X222A2
 * build834          NM1*IL*1*DOE*JANE****34*A1        -> NM1*IL*1*DOE*JANE****34
 * build820          ENT**2J*34*A1                     -> ENT**2J*34
 * build271          NM1*IL*1*DOE*JANE****MI*A1        -> NM1*IL*1*DOE*JANE****MI
 * build277          NM1*1P*2*A1                       -> NM1*1P*2
 * build278Request   UM*HS*I*A1                        -> UM*HS*I
 * build837P         CLM*A1*150.00***11:B:1*Y*A*Y*Y    -> CLM**150.00***11:B:1*Y*A*Y*Y
 * ```
 *
 * **`build837P` is the other half of the filed defect**: CLM-01 is the value
 * CLP-01 reassociates back to, so the same one-line mechanism could drop both
 * ends of the claim-to-payment link.
 *
 * They are one element each, not a sweep - what covers all 411 `esc`
 * invocations is the source scan above.
 */
const CASES: readonly (readonly [string, (v: unknown) => unknown, new () => Error])[] = [
  [
    "buildInterchange body segment element (BPR-01)",
    (v) =>
      buildInterchange(
        asJsCaller({
          ...ENVELOPE,
          groups: [
            {
              functionalIdCode: "HP",
              groupControlNumber: "1",
              versionRelease: "005010X221A1",
              transactions: [
                {
                  transactionSetIdCode: "835",
                  transactionSetControlNumber: "0001",
                  segments: [["BPR", v, "450.00"]],
                },
              ],
            },
          ],
        }),
      ),
    X12BuildError as unknown as new () => Error,
  ],
  [
    "build999 transactionResponse.transactionSetControlNumber (AK2-02)",
    (v) =>
      build999(
        asJsCaller({
          envelope: ENVELOPE,
          functionalGroup: {
            functionalIdCode: "HC",
            groupControlNumber: "1",
            versionRelease: "005010X222A2",
            disposition: "A",
            numberOfTransactionSets: 1,
            numberOfReceivedTransactionSets: 1,
            numberOfAcceptedTransactionSets: 1,
            transactionResponses: [
              {
                transactionSetIdCode: "837",
                transactionSetControlNumber: v,
                implementationConventionReference: "005010X222A2",
                disposition: "A",
              },
            ],
          },
        }),
      ),
    AckBuildError as unknown as new () => Error,
  ],
  [
    "build834 member.member.idCode (NM1-09)",
    (v) =>
      build834(
        asJsCaller({
          envelope: ENVELOPE,
          header: H834,
          members: [{ ...MEMBER, member: { ...MEMBER.member, idCode: v } }],
        }),
      ),
    Enrollment834BuildError as unknown as new () => Error,
  ],
  [
    "build820 remittance.entity.idCode (ENT-04)",
    (v) =>
      build820(
        asJsCaller({
          envelope: ENVELOPE,
          payment: {
            transactionHandlingCode: "I",
            totalPremiumAmount: dec("250.00"),
            creditDebitFlag: "C",
            method: "ACH",
            paymentDate: "20260601",
          },
          traces: [{ traceTypeCode: "1", referenceId: "T1" }],
          remittances: [
            {
              entity: {
                entityIdentifierCode: "2J",
                name: "MEMBER ORG",
                idQualifier: "34",
                idCode: v,
              },
              openItems: [{ qualifier: "AZ", referenceId: "POL-0001", amountPaid: dec("250.00") }],
            },
          ],
        }),
      ),
    Premium820BuildError as unknown as new () => Error,
  ],
  [
    "build271 subscriber.name.idCode (NM1-09)",
    (v) =>
      build271(
        asJsCaller({
          envelope: ENVELOPE,
          header: {
            transactionSetPurposeCode: "11",
            referenceId: "R1",
            date: "20260601",
            time: "1200",
          },
          informationSources: [
            {
              entity: {
                entityIdentifierCode: "PR",
                entityTypeQualifier: "2",
                name: "PAYER",
                idQualifier: "PI",
                idCode: "P1",
              },
              receivers: [
                {
                  entity: {
                    entityIdentifierCode: "1P",
                    entityTypeQualifier: "2",
                    name: "PROV",
                    idQualifier: "XX",
                    idCode: "1234567890",
                  },
                  subscribers: [
                    {
                      name: {
                        entityIdentifierCode: "IL",
                        entityTypeQualifier: "1",
                        lastName: "DOE",
                        firstName: "JANE",
                        idQualifier: "MI",
                        idCode: v,
                      },
                      benefits: [{ eligibilityCode: "1", serviceTypeCodes: [{ code: "30" }] }],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ),
    Eligibility271BuildError as unknown as new () => Error,
  ],
  [
    "build277 provider.entity.name (NM1-03)",
    (v) =>
      build277(
        asJsCaller({
          envelope: ENVELOPE,
          header: {
            transactionSetPurposeCode: "08",
            referenceId: "R1",
            date: "20260601",
            time: "1200",
          },
          informationSources: [
            {
              entity: {
                entityIdentifierCode: "PR",
                entityTypeQualifier: "2",
                name: "PAYER",
                idQualifier: "PI",
                idCode: "P1",
              },
              receivers: [
                {
                  entity: {
                    entityIdentifierCode: "41",
                    entityTypeQualifier: "2",
                    name: "CLEARINGHOUSE",
                  },
                  providers: [
                    {
                      entity: { entityIdentifierCode: "1P", entityTypeQualifier: "2", name: v },
                      subscribers: [
                        {
                          claims: [
                            {
                              statuses: [{ statuses: [{ categoryCode: "A1", statusCode: "19" }] }],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ),
    ClaimStatus277BuildError as unknown as new () => Error,
  ],
  [
    "build278Request review.serviceTypeCode (UM-03)",
    (v) =>
      build278Request(
        asJsCaller({
          envelope: ENVELOPE,
          header: {
            structurePurposeCode: "0078",
            purposeCode: "13",
            referenceId: "AUTHREQ-202606",
            date: "20260601",
            time: "1200",
          },
          utilizationManagementOrganization: {
            entityIdentifierCode: "X3",
            entityTypeQualifier: "2",
            name: "UTILIZATION REVIEW CO",
            idQualifier: "PI",
            idCode: "UMO001",
          },
          requester: {
            entityIdentifierCode: "1P",
            entityTypeQualifier: "2",
            name: "RENDERING CLINIC",
            idQualifier: "XX",
            idCode: "1234567893",
          },
          subscriber: {
            member: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              lastName: "DOE",
              firstName: "JANE",
              idQualifier: "MI",
              idCode: "MBR0001",
            },
            reviews: [
              {
                levelCode: "EV",
                requestCategoryCode: "HS",
                certificationTypeCode: "I",
                serviceTypeCode: v,
              },
            ],
          },
        }),
      ),
    ServicesReview278BuildError as unknown as new () => Error,
  ],
  [
    "build837P claim.claimId (CLM-01)",
    (v) =>
      build837P(
        asJsCaller({
          envelope: ENVELOPE,
          submitter: {
            entityIdentifierCode: "41",
            entityTypeQualifier: "2",
            name: "SUBMITTER ONE",
            idQualifier: "46",
            idCode: "SUB001",
          },
          receiver: {
            entityIdentifierCode: "40",
            entityTypeQualifier: "2",
            name: "RECEIVER ONE",
            idQualifier: "46",
            idCode: "REC001",
          },
          billingProviders: [
            {
              provider: {
                entityIdentifierCode: "85",
                entityTypeQualifier: "2",
                name: "BILLING CLINIC INC",
                idQualifier: "XX",
                idCode: "1234567890",
              },
              subscribers: [
                {
                  info: {
                    payerResponsibilityCode: "P",
                    individualRelationshipCode: "18",
                    claimFilingIndicator: "MB",
                  },
                  subscriber: {
                    entityIdentifierCode: "IL",
                    entityTypeQualifier: "1",
                    name: "PATIENT",
                    firstName: "TEST",
                    idQualifier: "MI",
                    idCode: "MEMBER001",
                  },
                  payer: {
                    entityIdentifierCode: "PR",
                    entityTypeQualifier: "2",
                    name: "PAYER ONE",
                    idQualifier: "PI",
                    idCode: "PAYER01",
                  },
                  claims: [
                    {
                      claimId: v,
                      totalCharge: dec("150.00"),
                      placeOfServiceCode: "11",
                      facilityCodeQualifier: "B",
                      claimFrequencyCode: "1",
                      providerSignatureOnFile: "Y",
                      providerAcceptAssignment: "A",
                      benefitsAssignment: "Y",
                      releaseOfInformationCode: "Y",
                      diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
                      serviceLines: [
                        {
                          variant: "P",
                          procedureQualifier: "HC",
                          procedureCode: "99213",
                          charge: dec("150.00"),
                          unitOfMeasure: "UN",
                          units: dec("1"),
                          diagnosisPointers: ["1"],
                          dates: [{ qualifier: "472", formatQualifier: "D8", value: "20260601" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      ),
    Claim837BuildError as unknown as new () => Error,
  ],
];

describe("every builder with an escaper refuses a number in an element", () => {
  it.each(CASES)("builds %s from a string", (_label, run) => {
    expect(() => run("A1")).not.toThrow();
  });

  it.each(CASES)("refuses %s from a number", (_label, run, expected) => {
    let thrown: unknown;
    try {
      run(1);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(expected);
    // The typed, code-tagged error is the point. A caller branching on
    // `err.code` is the surface this library tells consumers to use, and a
    // silently-dropped element gives them nothing to branch on at all.
    expect(typeof (thrown as { code?: unknown }).code).toBe("string");
    expect((thrown as Error).message).toContain("every element value must be a string");
    expect((thrown as Error).message).toContain('a number ("1")');
    expect((thrown as Error).message.length).toBeLessThan(400);
  });
});

// ---------------------------------------------------------------------------
// The disclosed residual: the fixed-width ISA/GS slots, which do not use esc.
// ---------------------------------------------------------------------------

describe("the fixed-width envelope slots: the disclosed residual", () => {
  it("throws an untyped TypeError for a numeric ISA-06, and must not start emitting empty", () => {
    // A MEASUREMENT of a known gap, not an endorsement. `senderId` goes through
    // `pad`, not `esc`: `pad(1, 15)` reaches `value.slice` and throws. Untyped
    // (`code` is `undefined`), which is worse than the rest of this library -
    // but it TERMINATES, so it is a different defect from the silent one this
    // slice closes. PRE-EXISTING and identical at base commit `143a6ea`.
    let thrown: unknown;
    try {
      build834(
        asJsCaller({ envelope: { ...ENVELOPE, senderId: 1 }, header: H834, members: [MEMBER] }),
      );
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as { code?: unknown }).code).toBeUndefined();
  });

  it("gives a MISLEADING typed refusal for a numeric ISA-13, pinned as such", () => {
    // `padControl(1, 9)` compares `undefined === 9` then `undefined < 9`, both
    // false, and falls through to the over-long branch. The caller is told a
    // one-digit number "exceeds the 9-char spec limit". Wrong text, right
    // outcome (it refuses); PRE-EXISTING, and disclosed in
    // `KNOWN-LIMITATIONS.md` rather than fixed in this slice.
    let thrown: unknown;
    try {
      build834(
        asJsCaller({
          envelope: { ...ENVELOPE, interchangeControlNumber: 1 },
          header: H834,
          members: [MEMBER],
        }),
      );
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(Enrollment834BuildError);
    expect((thrown as Error).message).toContain("exceeds the 9-char spec limit");
  });
});

// ---------------------------------------------------------------------------
// The two disclosed residuals adversarial review found, both PRE-EXISTING and
// both outside the item's `esc()` scope. Pinned so they cannot change shape
// silently, and so this file cannot go on claiming more than it guards.
// ---------------------------------------------------------------------------

const ACK_GROUP = {
  functionalIdCode: "HC",
  groupControlNumber: "1",
  versionRelease: "005010X222A2",
  disposition: "A",
  numberOfTransactionSets: 1,
  numberOfReceivedTransactionSets: 1,
  numberOfAcceptedTransactionSets: 1,
  transactionResponses: [
    {
      transactionSetIdCode: "837",
      transactionSetControlNumber: "0001",
      implementationConventionReference: "005010X222A2",
      disposition: "A",
    },
  ],
};

describe("string-typed slots that never call esc: EXAMPLES of the disclosed residual", () => {
  // A MEASUREMENT of a known gap, not an endorsement, and deliberately NOT a
  // census: two drafts of this slice published an exhaustive count here and
  // adversarial review measured both false. These positions are emitted
  // verbatim without going through `esc`, so `makeCallerEscaper` never sees
  // them and a number is still emitted with zero warnings. Identical at base
  // commit `143a6ea` and at head. Disclosed in `KNOWN-LIMITATIONS.md`.
  const cases: readonly (readonly [string, () => X12Interchange, string])[] = [
    [
      "build999 envelope.groupControlNumber (GS-06 / GE-02)",
      () =>
        build999(
          asJsCaller({
            envelope: { ...ENVELOPE, groupControlNumber: 12_345 },
            functionalGroup: ACK_GROUP,
          }),
        ),
      "GE*1*12345",
    ],
    [
      "build999 envelope.transactionSetControlNumber (ST-02 / SE-02)",
      () =>
        build999(
          asJsCaller({
            envelope: { ...ENVELOPE, transactionSetControlNumber: 12_345 },
            functionalGroup: ACK_GROUP,
          }),
        ),
      "ST*999*12345*005010X231A1",
    ],
    [
      "build999 functionalGroup.disposition (AK9-01)",
      () =>
        build999(
          asJsCaller({
            envelope: ENVELOPE,
            functionalGroup: { ...ACK_GROUP, disposition: 12_345 },
          }),
        ),
      "AK9*12345*1*1*1",
    ],
  ];

  it.each(cases)("still emits a number verbatim for %s", (_label, run, expected) => {
    const ix = run();
    expect(serializeX12(ix)).toContain(expected);
    expect(ix.warnings).toHaveLength(0);
  });

  it("walks past build999's own disposition guard, exactly as the filed defect did", () => {
    // AK9-01 is an `ID` element bound to X12 code source 715, so `12345` tells
    // a receiver nothing about whether the functional group was accepted. And
    // `X12_ACK_ACCEPT_WITH_ERRORS` compares `disposition === "A"`, which a
    // number is not - the same walk-past as `patientControlNumber === ""`.
    const ix = build999(
      asJsCaller({ envelope: ENVELOPE, functionalGroup: { ...ACK_GROUP, disposition: 12_345 } }),
    );
    expect(serializeX12(ix)).toContain("AK9*12345");
  });
});

describe("esc slots that read .toString(): EXAMPLES, deliberately not counted", () => {
  // A raw `number` in a slot the types say is an `X12Decimal` has its own
  // `.toString()`, so it reaches `esc` already a string and is passed through.
  // These are the exact three renderings `caller-string.ts` names as
  // disqualifying, and they are emitted with zero warnings, identically at base
  // commit `143a6ea` and at head. Disclosed in `KNOWN-LIMITATIONS.md`.
  const cases: readonly (readonly [string, number, string])[] = [
    ["an IEEE-754 artifact", 0.1 + 0.2, "*0.30000000000000004*"],
    ["exponential notation", 1e21, "*1e+21*"],
    ["NaN", NaN, "*NaN*"],
  ];

  it("also reaches SV1-04 and HI-01, which the same-line regex cannot see", () => {
    // The two off-line shapes, pinned as the counter-example to the "36 slots,
    // exhaustive" claim a draft of this slice published. `build-837` reads
    // `const units = line.units.toString()` on one line and `ctx.esc(units)` on
    // another, and passes two `.toString()`s into a `ctx.comp([...])` that maps
    // `esc`. Identical at base commit `143a6ea`.
    const drift = 0.1 + 0.2;
    const ix = build837P(
      asJsCaller({
        envelope: ENVELOPE,
        submitter: {
          entityIdentifierCode: "41",
          entityTypeQualifier: "2",
          name: "SUBMITTER ONE",
          idQualifier: "46",
          idCode: "SUB001",
        },
        receiver: {
          entityIdentifierCode: "40",
          entityTypeQualifier: "2",
          name: "RECEIVER ONE",
          idQualifier: "46",
          idCode: "REC001",
        },
        billingProviders: [
          {
            provider: {
              entityIdentifierCode: "85",
              entityTypeQualifier: "2",
              name: "BILLING CLINIC INC",
              idQualifier: "XX",
              idCode: "1234567890",
            },
            subscribers: [
              {
                info: {
                  payerResponsibilityCode: "P",
                  individualRelationshipCode: "18",
                  claimFilingIndicator: "MB",
                },
                subscriber: {
                  entityIdentifierCode: "IL",
                  entityTypeQualifier: "1",
                  name: "PATIENT",
                  firstName: "TEST",
                  idQualifier: "MI",
                  idCode: "MEMBER001",
                },
                payer: {
                  entityIdentifierCode: "PR",
                  entityTypeQualifier: "2",
                  name: "PAYER ONE",
                  idQualifier: "PI",
                  idCode: "PAYER01",
                },
                claims: [
                  {
                    claimId: "PT-ACCT-001",
                    totalCharge: dec("150.00"),
                    placeOfServiceCode: "11",
                    facilityCodeQualifier: "B",
                    claimFrequencyCode: "1",
                    providerSignatureOnFile: "Y",
                    providerAcceptAssignment: "A",
                    benefitsAssignment: "Y",
                    releaseOfInformationCode: "Y",
                    diagnoses: [{ qualifier: "ABK", code: "J20.9", monetaryAmount: drift }],
                    serviceLines: [
                      {
                        variant: "P",
                        procedureQualifier: "HC",
                        procedureCode: "99213",
                        charge: dec("150.00"),
                        unitOfMeasure: "UN",
                        units: drift,
                        diagnosisPointers: ["1"],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
    const text = serializeX12(ix);
    expect(text).toContain("SV1*HC:99213*150.00*UN*0.30000000000000004***1");
    expect(text).toContain("HI*ABK:J20.9:::0.30000000000000004");
    expect(ix.warnings).toHaveLength(0);
  });

  it.each(cases)("still emits %s in CLP-05", (_label, value, expected) => {
    const spec = remitSpec("PT-ACCT-001") as { claims: { patientResponsibilityAmount: unknown }[] };
    const ix = build835(
      asJsCaller({
        ...spec,
        claims: [{ ...spec.claims[0], patientResponsibilityAmount: value }],
      }),
    );
    expect(serializeX12(ix)).toContain(expected);
    expect(ix.warnings).toHaveLength(0);
  });
});

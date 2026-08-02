/**
 * The liveness gate for `@cosyte/x12`'s builders (`X12-CALLER-VALUE-RESIDUALS`,
 * part 2).
 *
 * ## The defect, and why it is sharper than the message bound
 *
 * `test/builder-refusal-bounds.test.ts` guards what a refusal SAYS. This file
 * guards whether a refusal HAPPENS.
 *
 * Every domain builder took its loop bound off a caller-supplied `.length`:
 *
 * ```ts
 * for (let m = 0; m < spec.members.length; m += 1) { … }
 * ```
 *
 * Hand that a forged `{ length: "9".repeat(120_000) }` and the comparison
 * coerces a 120,000-digit string to `Infinity`. Every element read is
 * `undefined`, every guard `continue`s, and **the builder spins forever instead
 * of refusing.** A hang is a worse failure than a refusal: a refusal returns a
 * typed, code-tagged error the caller can branch on, while a hang takes the
 * worker with it and never reaches a `catch`.
 *
 * **Measured at base commit `55ebc66`, not assumed:** 14 of the 16 probed entry
 * paths hung with no refusal (verified against a 20-second wall-clock timeout
 * in a child process, because a hang cannot be observed in-process). The other
 * two threw an untyped `TypeError`; see the limits below.
 *
 * **State the class correctly.** This is a forged NON-ARRAY input, not a
 * mis-read clinical value. Nothing here decodes a document and no dose,
 * allergy, code system or patient identifier is read differently because of it.
 * The reachable harm is availability. It is also unreachable from TypeScript -
 * the types say `readonly T[]` - and reachable from JavaScript, from JSON, and
 * therefore from `@cosyte/cli`.
 *
 * ## The source scan is the exhaustive half
 *
 * The behavioural cases below drive a forged array-like into the paths that are
 * cheap to reach. What covers every site is {@link loopBounds}: it walks every
 * indexed `for` / `while` in every builder module and requires the bound to be
 * a local binding produced by `requireCallerArray(...)`. A thirty-third loop
 * that reads a caller `.length` directly reds this file without anyone
 * remembering to add a case.
 *
 * ## Three limits, written down rather than claimed away
 *
 * 1. **`for…of` is NOT covered, and does not hang.** A forged `{ length }` is
 *    not iterable, so `for…of` throws `TypeError: … is not iterable`
 *    immediately. That is not the typed, code-tagged refusal this library
 *    promises - `err.code` is `undefined` - but it terminates, so it is a
 *    different defect from the one this gate closes. Measured identical at base
 *    and head for `buildInterchange` (`spec.groups`), `build999`
 *    (`functionalGroup.transactionResponses`), and every optional leaf array
 *    (`claim.dates`, `line.references`, …). Pinned below so it cannot quietly
 *    become a hang, and disclosed in `KNOWN-LIMITATIONS.md` rather than fixed.
 * 2. **The scan is syntactic.** It keys on `for (let x = 0; x < …` and
 *    `while (… < …)` shapes. A bound computed in a helper, or reached through a
 *    reassigned `let`, would not be seen. A strong tripwire for the shape this
 *    library actually uses, not a proof - the same honesty the sibling gate
 *    carries.
 * 3. **It proves refusal, not termination in general.** A real array with
 *    120,000 real elements still takes as long as it takes. The bound removed
 *    is the FORGED one.
 *
 * ## The source scan is load-bearing, and the negative control is why
 *
 * Both halves were controlled by putting each defect back. Reverting one loop
 * bound to `spec.members.length` reds the scan by file and line. Removing the
 * `requireCallerArray` call outright does something worse to the behavioural
 * half: **the run does not fail, it wedges.** A synchronous infinite loop never
 * yields, so vitest's `testTimeout` cannot interrupt it and the worker has to be
 * killed from outside (measured: terminated at 60 seconds, no verdict). So the
 * behavioural cases below cannot be relied on to REPORT this regression - they
 * would hang CI instead of reding it, which is the same property that makes the
 * defect worth fixing. **The scan is the half that fails cleanly**, and that is
 * the argument for keeping it exhaustive rather than trusting the examples.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { requireCallerArray } from "../src/builder/caller-array.js";
import { BUILD_REFUSAL_VALUE_MAX_RENDERED } from "../src/index.js";
import {
  build271,
  build277,
  build277CA,
  build278Request,
  build278Response,
  build820,
  build834,
  build835,
  build837D,
  build837I,
  build837P,
  build999,
  buildInterchange,
  Claim837BuildError,
  ClaimStatus277BuildError,
  Eligibility271BuildError,
  Enrollment834BuildError,
  Premium820BuildError,
  Remit835BuildError,
  ServicesReview278BuildError,
} from "../src/index.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/**
 * Launder a value into the typed slot a builder declares.
 *
 * Every forged case in this file is a JavaScript or JSON caller reaching a slot
 * the TypeScript types say is unreachable, which is the whole point: the types
 * are not a runtime guarantee, and `@cosyte/cli` is such a caller. Routing it
 * through one named helper says so once, and keeps the assertion off the object
 * literals where the shared ESLint config forbids it.
 */
function asJsCaller<T>(value: unknown): T {
  return value as T;
}

/**
 * The forged input. `{ length: "9".repeat(120_000) }` is the exact shape the
 * item was filed on: a 120,000-digit string coerces to `Infinity` in a `<`
 * comparison, which is what turns a bounded loop into an unbounded one.
 */
const FORGED = asJsCaller({ length: "9".repeat(120_000) });

// ---------------------------------------------------------------------------
// The source scan.
// ---------------------------------------------------------------------------

/** Every module that can loop over a caller-supplied array. */
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

interface LoopBound {
  readonly file: string;
  readonly line: number;
  /** The identifier whose `.length` bounds the loop. */
  readonly operand: string;
}

/**
 * Every indexed loop whose bound is some `<expr>.length`, with the operand
 * captured. Deliberately keys on the OPERAND and not on the property name:
 * inspecting `.length` and calling it safe is the exact mistake the sibling
 * gate made twice, and it is recorded there.
 */
function loopBounds(file: string): LoopBound[] {
  // Comments are stripped first, so an illustrative loop inside a docblock is
  // not mistaken for one the engine runs. `src/builder/caller-array.ts` quotes
  // the defect verbatim in its own header, and the first draft of this gate
  // flagged the documentation of the bug as the bug.
  const raw = readFileSync(file, "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//gu, (m) => m.replace(/[^\n]/gu, " "));
  const out: LoopBound[] = [];
  const shapes = [
    /for \(let [A-Za-z0-9_]+ = 0; [A-Za-z0-9_]+ < ([A-Za-z0-9_.?[\]() ]+?)\.length/g,
    /while \([A-Za-z0-9_]+ < ([A-Za-z0-9_.?[\]() ]+?)\.length/g,
  ];
  for (const re of shapes) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      out.push({
        file,
        line: src.slice(0, m.index).split("\n").length,
        operand: (m[1] ?? "").trim(),
      });
    }
  }
  return out;
}

/**
 * A bound is safe when its operand is a plain local identifier that the same
 * module declares as `const <name> = requireCallerArray(`. Nothing else is
 * admitted: not a property read, not a `?? []` fallback, not a parameter. A
 * parameter is excluded on purpose - `emitCasGroup` used to take one, and a
 * forged list reached it through the call site.
 */
function isGuardedBinding(file: string, operand: string): boolean {
  if (!/^[A-Za-z0-9_]+$/u.test(operand)) return false;
  const src = readFileSync(file, "utf8");
  return new RegExp(`const ${operand} = requireCallerArray\\(`, "u").test(src);
}

describe("builder loop bounds: the source gate", () => {
  const modules = builderModules();
  const bounds = modules.flatMap(loopBounds);

  it("finds every indexed loop bound in the builder modules", () => {
    // Re-derived on this tree: THIRTY-TWO indexed loops across SEVEN modules
    // take their bound from a list, and all thirty-two read a caller-supplied
    // `.length` at base commit `55ebc66`. Pinned so a module that stops being
    // scanned is a failure rather than a silently smaller sweep.
    expect(bounds.length).toBe(32);
    expect(new Set(bounds.map((b) => b.file)).size).toBe(7);
  });

  it("takes every one of them from a requireCallerArray binding", () => {
    const findings = bounds
      .filter((b) => !isGuardedBinding(b.file, b.operand))
      .map((b) => `${b.file.slice(SRC.length + 1)}:${String(b.line)} -> ${b.operand}.length`);
    expect(findings).toEqual([]);
  });

  it("would flag a raw caller read, which is the negative control", () => {
    // The gate is only worth its lines if it fails on the defect. `spec.members`
    // is the exact operand that was there at base, and a property read can
    // never be a guarded binding; `members` is what replaced it.
    const module = join(SRC, "transactions", "enrollment", "build-834.ts");
    expect(isGuardedBinding(module, "spec.members")).toBe(false);
    expect(isGuardedBinding(module, "spec")).toBe(false);
    expect(isGuardedBinding(module, "members")).toBe(true);
    // And a name that is merely declared, without going through the
    // chokepoint, is not admitted either.
    expect(isGuardedBinding(module, "body")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The chokepoint itself.
// ---------------------------------------------------------------------------

describe("requireCallerArray", () => {
  const refuse = (message: string): never => {
    throw new Error(message);
  };

  it("passes a real array straight through, by identity", () => {
    const real = ["a", "b"];
    expect(requireCallerArray(real, "at", refuse)).toBe(real);
    expect(requireCallerArray([], "at", refuse)).toEqual([]);
  });

  it("answers an absent optional field with a frozen empty array", () => {
    const none = requireCallerArray(undefined, "at", refuse);
    expect(none).toEqual([]);
    expect(Object.isFrozen(none)).toBe(true);
  });

  it("refuses every non-array a JSON caller can produce", () => {
    for (const rogue of [FORGED, null, 0, "", "abc", {}, { length: 3 }, true]) {
      expect(() =>
        requireCallerArray(asJsCaller<readonly unknown[]>(rogue), "spec.members", refuse),
      ).toThrow(/spec\.members must be an array/u);
    }
  });

  it("bounds what it says about the forged value", () => {
    // The refusal names the shape it was handed, and that naming is itself a
    // caller-value interpolation - so it goes through the same renderer. A
    // guard that fixed a hang by opening a 120,000-character message would
    // have traded one half of this item for the other.
    let message = "";
    try {
      requireCallerArray(asJsCaller<readonly unknown[]>(FORGED), "spec.members", refuse);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain("(120000 characters)");
    expect(message).not.toContain("9".repeat(120_000));
    expect(message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 100);
  });

  it("bounds a hostile Symbol.toStringTag, which would otherwise be a new hole", () => {
    // `Object.prototype.toString` reads `Symbol.toStringTag`, and a caller sets
    // it. Splicing that in unbounded beside a bounded value would reintroduce
    // exactly the hole the sibling module closes.
    const hostile = { [Symbol.toStringTag]: "Z".repeat(120_000) };
    let message = "";
    try {
      requireCallerArray(asJsCaller<readonly unknown[]>(hostile), "spec.members", refuse);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).not.toContain("Z".repeat(120_000));
    expect(message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 100);
  });

  it("survives a length getter that throws", () => {
    const hostile = {
      get length(): never {
        throw new Error("nope");
      },
    };
    expect(() =>
      requireCallerArray(asJsCaller<readonly unknown[]>(hostile), "spec.members", refuse),
    ).toThrow(/'length' getter threw/u);
  });
});

// ---------------------------------------------------------------------------
// Behavioural: a forged array refuses instead of hanging.
//
// Every case here HUNG at base commit `55ebc66`. If one regresses, this file
// does not fail fast - it stops, and vitest's own timeout reds it. That is the
// correct signal for a liveness defect and there is no cheaper one.
// ---------------------------------------------------------------------------

const ENVELOPE = {
  senderId: "SENDER",
  receiverId: "RECEIVER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

/** Each case: the label, the builder call, and the error class it must raise. */
const FORGED_ARRAY_CASES: readonly (readonly [string, () => unknown, new () => Error])[] = [
  [
    "build835 spec.claims",
    () =>
      build835(
        asJsCaller({
          envelope: ENVELOPE,
          payment: {},
          traces: [{ referenceId: "T" }],
          claims: FORGED,
        }),
      ),
    Remit835BuildError as unknown as new () => Error,
  ],
  [
    "build835 spec.traces",
    () => build835(asJsCaller({ envelope: ENVELOPE, payment: {}, traces: FORGED, claims: [] })),
    Remit835BuildError as unknown as new () => Error,
  ],
  [
    "build837P spec.billingProviders",
    () => build837P(asJsCaller({ envelope: ENVELOPE, header: {}, billingProviders: FORGED })),
    Claim837BuildError as unknown as new () => Error,
  ],
  [
    "build837I spec.billingProviders",
    () => build837I(asJsCaller({ envelope: ENVELOPE, header: {}, billingProviders: FORGED })),
    Claim837BuildError as unknown as new () => Error,
  ],
  [
    "build837D spec.billingProviders",
    () => build837D(asJsCaller({ envelope: ENVELOPE, header: {}, billingProviders: FORGED })),
    Claim837BuildError as unknown as new () => Error,
  ],
  [
    "build837P billingProviders[0].subscribers",
    () =>
      build837P(
        asJsCaller({
          envelope: ENVELOPE,
          header: {},
          billingProviders: [{ subscribers: FORGED }],
        }),
      ),
    Claim837BuildError as unknown as new () => Error,
  ],
  [
    "build271 spec.informationSources",
    () => build271(asJsCaller({ envelope: ENVELOPE, header: {}, informationSources: FORGED })),
    Eligibility271BuildError as unknown as new () => Error,
  ],
  [
    "build271 informationSources[0].receivers",
    () =>
      build271(
        asJsCaller({
          envelope: ENVELOPE,
          header: {},
          informationSources: [{ receivers: FORGED }],
        }),
      ),
    Eligibility271BuildError as unknown as new () => Error,
  ],
  [
    "build277 spec.informationSources",
    () => build277(asJsCaller({ envelope: ENVELOPE, header: {}, informationSources: FORGED })),
    ClaimStatus277BuildError as unknown as new () => Error,
  ],
  [
    "build277CA spec.informationSources",
    () => build277CA(asJsCaller({ envelope: ENVELOPE, header: {}, informationSources: FORGED })),
    ClaimStatus277BuildError as unknown as new () => Error,
  ],
  [
    "build277 informationSources[0].receivers",
    () =>
      build277(
        asJsCaller({
          envelope: ENVELOPE,
          header: {},
          informationSources: [{ receivers: FORGED }],
        }),
      ),
    ClaimStatus277BuildError as unknown as new () => Error,
  ],
  [
    "build278Request subscriber.reviews",
    () =>
      build278Request(
        asJsCaller({
          envelope: ENVELOPE,
          header: {},
          utilizationManagementOrganization: {},
          requester: {},
          subscriber: { reviews: FORGED },
        }),
      ),
    ServicesReview278BuildError as unknown as new () => Error,
  ],
  [
    "build278Response subscriber.reviews",
    () =>
      build278Response(
        asJsCaller({
          envelope: ENVELOPE,
          header: {},
          utilizationManagementOrganization: {},
          requester: {},
          subscriber: { reviews: FORGED },
        }),
      ),
    ServicesReview278BuildError as unknown as new () => Error,
  ],
  [
    "build820 spec.remittances",
    () =>
      build820(
        asJsCaller({
          envelope: ENVELOPE,
          payment: {},
          traces: [{ referenceId: "T" }],
          remittances: FORGED,
        }),
      ),
    Premium820BuildError as unknown as new () => Error,
  ],
  [
    "build820 remittances[0].openItems",
    () =>
      build820(
        asJsCaller({
          envelope: ENVELOPE,
          payment: {},
          traces: [{ referenceId: "T" }],
          remittances: [{ entity: {}, openItems: FORGED }],
        }),
      ),
    Premium820BuildError as unknown as new () => Error,
  ],
  [
    "build834 spec.members",
    () => build834(asJsCaller({ envelope: ENVELOPE, header: {}, members: FORGED })),
    Enrollment834BuildError as unknown as new () => Error,
  ],
  [
    "build834 members[0].healthCoverages",
    () =>
      build834(
        asJsCaller({
          envelope: ENVELOPE,
          header: {},
          members: [{ maintenanceTypeCode: "021", healthCoverages: FORGED }],
        }),
      ),
    Enrollment834BuildError as unknown as new () => Error,
  ],
];

describe("domain builders: a forged array-like refuses instead of hanging", () => {
  it.each(FORGED_ARRAY_CASES)("refuses %s", (_label, run, expected) => {
    let thrown: unknown;
    try {
      run();
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(expected);
    // The typed error is the point. A caller branching on `err.code` is the
    // surface this library tells consumers to use, and a hang gives them
    // nothing to branch on at all.
    expect(typeof (thrown as { code?: unknown }).code).toBe("string");
    const { message } = thrown as Error;
    expect(message).toContain("must be an array");
    expect(message).toContain("(120000 characters)");
    expect(message.length).toBeLessThan(400);
  });
});

// ---------------------------------------------------------------------------
// The disclosed residual: `for…of` throws untyped, and must not start hanging.
// ---------------------------------------------------------------------------

describe("for-of over a forged array-like: the disclosed residual", () => {
  const RESIDUAL_CASES: readonly (readonly [string, () => unknown])[] = [
    [
      "buildInterchange spec.groups",
      () =>
        buildInterchange(
          asJsCaller({
            senderId: "SENDER",
            receiverId: "RECEIVER",
            interchangeDate: "260601",
            interchangeTime: "1200",
            interchangeControlNumber: "000000001",
            groups: FORGED,
          }),
        ),
    ],
    [
      "build999 functionalGroup.transactionResponses",
      () =>
        build999(
          asJsCaller({
            envelope: ENVELOPE,
            functionalGroup: { transactionResponses: FORGED },
          }),
        ),
    ],
  ];

  it.each(RESIDUAL_CASES)("throws an untyped TypeError, and terminates, for %s", (_label, run) => {
    // This is a MEASUREMENT of a known gap, not an endorsement of it. Both
    // reach the caller array through `for…of`, which refuses to iterate a
    // forged `{ length }` rather than coercing it - so there is no hang here
    // and never was. The refusal is untyped (`code` is `undefined`), which is
    // the part that is worse than the rest of this library, and it is
    // PRE-EXISTING and identical at base commit `55ebc66`.
    let thrown: unknown;
    try {
      run();
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as { code?: unknown }).code).toBeUndefined();
    expect((thrown as Error).message).toMatch(/is not iterable/u);
  });

  it("also covers three optional leaf arrays, which no guard walks", () => {
    // `member.references`, `member.dates` and `header.references` are never
    // visited by any structural guard, so this is the general shape of the
    // residual and not a quirk of the two entry points above. The baseline
    // spec builds cleanly, so the only thing that changed is the forged field.
    const envelope = ENVELOPE;
    const member = {
      subscriberIndicator: "Y",
      relationshipCode: "18",
      maintenanceTypeCode: "021",
      member: { lastName: "DOE", firstName: "JANE", idQualifier: "34", idCode: "MBR0001" },
    };
    const header = {
      transactionSetPurposeCode: "00",
      referenceId: "F1",
      date: "20260601",
      time: "1200",
      actionCode: "2",
      sponsor: { entityIdentifierCode: "P5", name: "EMP", idQualifier: "FI", idCode: "F1" },
      payer: { entityIdentifierCode: "IN", name: "PAY", idQualifier: "FI", idCode: "F2" },
    };
    expect(() => build834(asJsCaller({ envelope, header, members: [member] }))).not.toThrow();

    const forgedSpecs = [
      { envelope, header, members: [{ ...member, references: FORGED }] },
      { envelope, header, members: [{ ...member, dates: FORGED }] },
      { envelope, header: { ...header, references: FORGED }, members: [member] },
    ];
    for (const spec of forgedSpecs) {
      let thrown: unknown;
      try {
        build834(asJsCaller(spec));
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(TypeError);
      expect(thrown).not.toBeInstanceOf(Enrollment834BuildError);
      expect((thrown as { code?: unknown }).code).toBeUndefined();
      expect((thrown as Error).message).toMatch(/is not iterable/u);
    }
  });
});

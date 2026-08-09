/**
 * The structural backstop under the two element-level gates
 * (`X12-DECIMAL-BYPASSES-THE-GUARD`).
 *
 * ## Why a third gate, when two already guard element values
 *
 * `test/builder-string-type.test.ts` guards what goes through `esc`.
 * `test/builder-decimal-type.test.ts` guards what goes through `escDec`. Both
 * are real, and both share one weakness: **a slot can decline to use them.**
 *
 * That weakness is not hypothetical here, it is the recorded history of this
 * area. Three consecutive drafts of `#60` published an exhaustive counted
 * census of the slots that bypass `esc` - "the single route a caller-supplied
 * element value takes into an emitted segment", then "SEVEN string-typed
 * positions", then "THIRTY-SIX `.toString()` slots" - and adversarial review
 * measured **all three** false, each time by finding one more slot. The remedy
 * on round three was to stop counting and disclose the class instead, which was
 * the right call at the time and left the library asserting *some* slots are
 * guarded, with "if you find one more, that is expected and is not a new
 * finding" written down as the standing position.
 *
 * A census was the wrong instrument. This file uses the right one: **`esc` is
 * optional on a slot, but the join is not.** A segment that is not joined is
 * not emitted. So the statement moves from a list to a property:
 *
 * > **No non-string value reaches an element of a segment emitted through a
 * > builder's `seg` / `joinSeg` helper.**
 *
 * One more slot cannot falsify that, because one more slot still joins.
 *
 * ## What it deliberately does NOT claim
 *
 * 1. **It is a type guard, not an escape.** A `string` carrying an active
 *    delimiter passes here and is still emitted verbatim if its slot skipped
 *    `esc`. `build999` with `groupControlNumber: "1*BOGUS"` shifting
 *    GS-07/GS-08 by one is a different defect - closed on the named slots by
 *    routing them through `esc`, and pinned in the sibling gate. Type safety is
 *    structural; delimiter safety is per-slot.
 * 2. **The fixed-width ISA line is outside it.** Every builder assembles ISA by
 *    `[...].join(elementSeparator)` directly, because its elements are `pad`ed
 *    rather than escaped. Those slots stay as `caller-string.ts` discloses them:
 *    `pad(1, 15)` throws an untyped `TypeError`, `padControl(1, 9)` throws a
 *    typed but misleadingly-worded refusal. Both terminate, neither is silent.
 *    Pinned below so they cannot quietly become silent.
 * 3. **The scan is syntactic**, keyed on the `const seg = ` / `function joinSeg`
 *    shapes this library uses in all nine joining modules. A builder that joined inline
 *    would not be seen. A strong tripwire for the shape this library uses, not
 *    a proof - the same honesty the sibling gates carry.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { requireCallerSegment } from "../src/builder/caller-segment.js";
import {
  AckBuildError,
  build999,
  buildInterchange,
  buildTA1,
  BUILD_REFUSAL_VALUE_MAX_RENDERED,
  ServicesReview278BuildError,
  serializeX12,
  X12BuildError,
  build278Request,
} from "../src/index.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Every candidate joining module: the nine builders plus `buildInterchange`. */
function joiningModules(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/^build-.*\.ts$/u.test(entry.name) && !/-(types|errors)\.ts$/u.test(entry.name)) {
        out.push(full);
      }
    }
  };
  walk(SRC);
  out.push(join(SRC, "builder", "build-interchange.ts"));
  return [...new Set(out)].sort();
}

/** Source with block and line comments stripped, so prose cannot satisfy a scan. */
function code(file: string): string {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//gu, "")
    .replace(/\/\/[^\n]*/gu, "");
}

/** Whether a module declares a segment joiner at all. */
function declaresJoiner(file: string): boolean {
  const src = code(file);
  return (
    /const seg = \(parts: readonly string\[\]\): string => \{/u.test(src) ||
    /function joinSeg\(/u.test(src)
  );
}

/** A JS/JSON caller who defeated their own type checker. */
const asJsCaller = <T>(spec: unknown): T => spec as T;

const refuse = (message: string): never => {
  throw new Error(message);
};

const ENVELOPE = {
  senderId: "MEDICARE",
  receiverId: "SUBMITTER",
  interchangeDate: "260601",
  interchangeTime: "1200",
  interchangeControlNumber: "000000001",
  groupControlNumber: "1",
  transactionSetControlNumber: "0001",
} as const;

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
} as const;

// ---------------------------------------------------------------------------
// The source gate - the half that is exhaustive.
// ---------------------------------------------------------------------------

describe("builder segment joining: the source gate", () => {
  const modules = joiningModules();

  it("finds a joiner in every module that declares one, and NAMES the one that does not", () => {
    // NINE modules declare a joiner: the eight domain builders plus
    // `buildInterchange`. `build-ta1.ts` does NOT, and is therefore NOT covered.
    //
    // **A draft of this comment gave the reason as "a TA1 is one fixed-width
    // line with no variable elements", and a refuter measured that false.** All
    // five TA1 elements are caller-supplied, `build-ta1.ts` imports no `pad` at
    // all, and it emits with a direct `.join()`.
    //
    // **`X12-TA1-EMIT-NOT-RELEASE-AWARE` changed what the exclusion COSTS, and
    // not the exclusion.** The reason used to be that nothing checked those
    // five elements at all; it now is that `buildTA1` type-checks and releases
    // them through `makeCallerEscaper` instead, which is the other guard. What
    // it still does not get from `requireCallerSegment` is the SLOT in the
    // refusal message: a wrong-typed TA1-01 names the builder, not `TA1-01`.
    // Widening the joiner into it is still its own slice.
    const joining = modules.filter(declaresJoiner);
    expect(joining).toHaveLength(9);
    const ta1 = join("transactions", "ack", "build-ta1.ts");
    expect(modules.some((m) => m.endsWith(ta1))).toBe(true);
    expect(joining.some((m) => m.endsWith(ta1))).toBe(false);
    // And it really is a direct join with no padding, which is the shape that
    // puts it outside a `seg` / `joinSeg` claim.
    const src = code(modules.find((m) => m.endsWith(ta1)) ?? "");
    expect(/\.join\(delimiters\.element\)/u.test(src)).toBe(true);
    expect(/\bpad\(/u.test(src)).toBe(false);
  });

  it("runs requireCallerSegment in every one of them", () => {
    // This is the whole property. A joiner that skips the check is a route into
    // the document that no gate covers, which is exactly the state `#60` left
    // and disclosed.
    const findings = modules
      .filter(declaresJoiner)
      .filter((m) => !/requireCallerSegment\(parts, "/u.test(code(m)))
      .map((m) => m.slice(SRC.length + 1));
    expect(findings).toEqual([]);
  });

  it("names each builder with its own locator, never another's", () => {
    // A copy-pasted locator would misreport which builder refused, and the
    // message is the only locator a caller gets.
    const findings: string[] = [];
    for (const m of modules.filter(declaresJoiner)) {
      const rel = m.slice(SRC.length + 1);
      const expected = /build-interchange\.ts$/u.test(m)
        ? "buildInterchange"
        : `build${/build-(\d+)/u.exec(rel)?.[1] ?? "?"}`;
      const found = [...code(m).matchAll(/requireCallerSegment\(parts, "([^"]+)"/gu)].map(
        (x) => x[1],
      );
      if (found.some((f) => f !== expected)) findings.push(`${rel} -> ${found.join(", ")}`);
    }
    expect(findings).toEqual([]);
  });

  it("would flag the base joiner, which is the negative control", () => {
    // The gate is only worth its lines if it fails on the defect. This is the
    // exact body every joiner carried at base commit `15abbd4`.
    const base = "return parts.join(elementSeparator) + segmentTerminator;";
    expect(/requireCallerSegment\(parts, "/u.test(base)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The chokepoint itself.
// ---------------------------------------------------------------------------

describe("requireCallerSegment", () => {
  it("passes a well-typed segment silently", () => {
    expect(() =>
      requireCallerSegment(["NM1", "IL", "1", "DOE", "JANE"], "buildX", refuse),
    ).not.toThrow();
    expect(() => requireCallerSegment([], "buildX", refuse)).not.toThrow();
    expect(() => requireCallerSegment(["SE", "", ""], "buildX", refuse)).not.toThrow();
  });

  it("names the element position the way the spec does, which esc cannot", () => {
    // `caller-string.ts` records as a limit that its refusal names the BUILDER
    // and not the slot, because `esc` is unary. The join holds the whole
    // segment, so the locator is derived rather than hand-written and cannot
    // drift out of step with the emitted order.
    const cases: readonly [readonly unknown[], string][] = [
      [["HL", "1", "", 22, "1"], '"HL"-03'],
      [["AK9", 12_345, "1", "1", "1"], '"AK9"-01'],
      [["LX", 1], '"LX"-01'],
      [["CLP", "PT-ACCT-001", "1", 500], '"CLP"-03'],
    ];
    for (const [parts, locator] of cases) {
      expect(() => requireCallerSegment(parts as readonly string[], "buildX", refuse)).toThrow(
        `buildX: ${locator} must be a string`,
      );
    }
  });

  it("checks the segment id too, because buildInterchange takes it from the caller", () => {
    // A `SegmentSpec` is `[segmentId, ...elements]` supplied wholesale there.
    // With no usable id the locator degrades to a position rather than
    // rendering `"undefined-01"`.
    expect(() =>
      requireCallerSegment([42, "IL"] as unknown as readonly string[], "buildX", refuse),
    ).toThrow("buildX: element 0 must be a string, but received a number");
    expect(() =>
      requireCallerSegment(["", 42] as unknown as readonly string[], "buildX", refuse),
    ).toThrow("buildX: element 1 must be a string, but received a number");
  });

  it("describes every wrong type a JSON or JS caller can produce, by TYPE alone", () => {
    // The primitive arms read `a number ("1")`, `a boolean ("true")` and
    // `a bigint ("10")` until `REFUSAL-MESSAGE-PHI-ECHO`. `object` and
    // `function` were type-only from the start, and now everything is.
    const cases: readonly [unknown, string][] = [
      [1, "a number"],
      [null, "null"],
      [undefined, "undefined"],
      [true, "a boolean"],
      [[], "an array"],
      [{}, "an object"],
      [(): void => undefined, "a function"],
      [10n, "a bigint"],
    ];
    for (const [value, described] of cases) {
      expect(() =>
        requireCallerSegment(["NM1", value] as unknown as readonly string[], "buildX", refuse),
      ).toThrow(`buildX: "NM1"-01 must be a string, but received ${described}.`);
    }
  });

  it("redacts the offending value, and admits the segment id only by GRAMMAR", () => {
    // Two different holes, closed two different ways.
    //
    // The VALUE is gone: this guard stands on every element of every segment, so
    // the thing in front of it is as likely to be `NM1-09` (the member id) as a
    // control number, and a bound is not a redaction.
    const memberId = 700_998_877;
    expect(() =>
      requireCallerSegment(
        [
          "NM1",
          "IL",
          "1",
          "DOE",
          "JANE",
          "",
          "",
          "",
          "MI",
          memberId,
        ] as unknown as readonly string[],
        "buildX",
        refuse,
      ),
    ).toThrow('buildX: "NM1"-09 must be a string, but received a number.');
    try {
      requireCallerSegment(
        [
          "NM1",
          "IL",
          "1",
          "DOE",
          "JANE",
          "",
          "",
          "",
          "MI",
          memberId,
        ] as unknown as readonly string[],
        "buildX",
        refuse,
      );
      throw new Error("expected a refusal");
    } catch (err) {
      expect((err as Error).message).not.toContain(String(memberId));
    }

    // The segment ID is the one caller-supplied string that can still appear,
    // because `buildInterchange` takes a `SegmentSpec` wholesale. It is admitted
    // only when it matches the X12 segment-id grammar, which caps it at three
    // `[A-Z0-9]` and cannot carry an identifier. A `renderCallerValue` bound
    // was the draft and it redacted nothing: 90 characters of free text in
    // element 0 is 90 characters of whatever the caller parked there.
    const huge = "Z".repeat(120_000);
    // A huge but well-typed value is not this guard's business and passes.
    expect(() => requireCallerSegment(["NM1", huge], "buildX", refuse)).not.toThrow();
    for (const id of [huge, "MBR0001-JANE-DOE", "nm1", "N", "NM12"]) {
      try {
        requireCallerSegment([id, 1] as unknown as readonly string[], "buildX", refuse);
        throw new Error("expected a refusal");
      } catch (err) {
        const { message } = err as Error;
        expect(message).toContain("buildX: element 1 must be a string, but received a number.");
        expect(message).not.toContain(id);
        expect(message.length).toBeLessThan(BUILD_REFUSAL_VALUE_MAX_RENDERED + 500);
      }
    }
    // And a real segment id still names the slot the way the spec does, which
    // is the diagnostic the grammar check exists to keep.
    for (const id of ["GS", "HL", "AK9", "NM1", "SVC", "TA1"]) {
      expect(() =>
        requireCallerSegment([id, 1] as unknown as readonly string[], "buildX", refuse),
      ).toThrow(`buildX: "${id}"-01 must be a string, but received a number.`);
    }
  });

  it("never runs a hostile toString or Symbol.toStringTag", () => {
    let ran = false;
    const hostile = {
      [Symbol.toStringTag]: "Z".repeat(120_000),
      toString(): string {
        ran = true;
        return "Z".repeat(120_000);
      },
    };
    expect(() =>
      requireCallerSegment(["NM1", hostile] as unknown as readonly string[], "buildX", refuse),
    ).toThrow('buildX: "NM1"-01 must be a string, but received an object.');
    expect(ran).toBe(false);
  });

  it("iterates rather than indexing, so a forged length cannot blind it", () => {
    // The defect this module exists to stop, one layer up: an index loop
    // bounded on `.length` over `{ length: undefined }` compares 0 against
    // undefined, gets false, and reports the segment clean without examining
    // one element. `for...of` throws instead. `test/builder-array-bounds.test.ts`
    // refused the indexed draft; this pins the behaviour that replaced it.
    const forged = { 0: "NM1", 1: 42, length: undefined } as unknown as readonly string[];
    expect(() => requireCallerSegment(forged, "buildX", refuse)).toThrow(TypeError);
    expect(() => requireCallerSegment(forged, "buildX", refuse)).not.toThrow(/must be a string/u);
  });

  it("refuses the FIRST wrong element, not the last", () => {
    // Reporting the last one would send a caller to the wrong slot.
    expect(() =>
      requireCallerSegment(["CLP", 1, "1", 2] as unknown as readonly string[], "buildX", refuse),
    ).toThrow('"CLP"-01');
  });
});

// ---------------------------------------------------------------------------
// The behavioural half.
// ---------------------------------------------------------------------------

describe("the joiners refuse where no element-level gate applies", () => {
  it("refuses a numeric HL-03 in build278, naming the slot", () => {
    // HL-03 was emitted raw at base `15abbd4`. It is now routed through `esc`
    // as well, so `requireCallerString` fires first - but the segment guard is
    // what makes the class closed rather than the list closed.
    expect(() =>
      build278Request(
        asJsCaller({
          envelope: ENVELOPE,
          header: {
            structurePurposeCode: "0078",
            purposeCode: "13",
            referenceId: "AUTHREQ-202606",
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
                requestCategoryCode: "HS",
                certificationTypeCode: "I",
                serviceTypeCode: "1",
                levelCode: 22,
              },
            ],
          },
        }),
      ),
    ).toThrow(ServicesReview278BuildError);
  });

  it("refuses a numeric element inside a buildInterchange SegmentSpec", () => {
    expect(() =>
      buildInterchange(
        asJsCaller({
          senderId: "SENDER",
          receiverId: "RECEIVER",
          interchangeDate: "260601",
          interchangeTime: "1200",
          interchangeControlNumber: "000000001",
          groups: [
            {
              functionalIdCode: "HC",
              groupControlNumber: "1",
              versionRelease: "005010X222A2",
              transactions: [
                {
                  transactionSetIdCode: "837",
                  transactionSetControlNumber: "0001",
                  segments: [["BHT", "0019", "00", 12_345]],
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow(X12BuildError);
  });

  it("leaves a well-formed 999 byte-identical, which is the regression half", () => {
    const ix = build999({ envelope: ENVELOPE, functionalGroup: ACK_GROUP });
    expect(serializeX12(ix)).toBe(
      "ISA*00*          *00*          *ZZ*MEDICARE       *ZZ*SUBMITTER      *260601*1200*^*00501*000000001*0*P*:~" +
        "GS*FA*MEDICARE*SUBMITTER*20260601*1200*1*X*005010X231A1~" +
        "ST*999*0001*005010X231A1~AK1*HC*1*005010X222A2~AK2*837*0001*005010X222A2~" +
        "IK5*A~AK9*A*1*1*1~SE*6*0001~GE*1*1~IEA*1*000000001~",
    );
    expect(ix.warnings).toHaveLength(0);
  });

  it("still lets the ISA fixed-width slots fail their own way, which is limit 2", () => {
    // Not covered and not fixed: ISA is joined directly, not through `joinSeg`.
    // Both terminate, so neither is this defect - pinned so neither can quietly
    // become silent.
    expect(() =>
      build999(asJsCaller({ envelope: { ...ENVELOPE, senderId: 1 }, functionalGroup: ACK_GROUP })),
    ).toThrow(TypeError);
    expect(() =>
      build999(
        asJsCaller({
          envelope: { ...ENVELOPE, interchangeControlNumber: 1 },
          functionalGroup: ACK_GROUP,
        }),
      ),
    ).toThrow(AckBuildError);
  });
});

describe("buildTA1 is OUTSIDE the joiner property, and this pins what it does instead", () => {
  // Found by the `conformance-refuter` on `#60`, against a first draft that
  // claimed "no non-string reaches an element of a segment ANY BUILDER emits".
  // `buildTA1` emits `["TA1", ...five caller values].join(sep)` directly - no
  // `seg`, no `joinSeg`, no `pad`.
  //
  // **TA1-01 is data element I12, the interchange control number echoed from
  // ISA-13.** It is the reassociation key from the acknowledgment back to the
  // interchange being acknowledged, so emitting it empty is the same
  // silent-identifier-loss class `#60` existed to close.
  //
  // **`X12-TA1-EMIT-NOT-RELEASE-AWARE` closed the behaviour these two cases
  // pinned as a DISCLOSURE, and they now pin the closure.** The five elements
  // go through `esc`, so they are type-checked and released; what is still
  // absent is `requireCallerSegment`, and the only thing that costs is the SLOT
  // in the refusal message. The property this file asserts is still about
  // `seg` / `joinSeg` and not about "any builder".
  const spec = (interchangeControlNumber: unknown): unknown => ({
    interchangeControlNumber,
    interchangeDate: "250101",
    interchangeTime: "1200",
    ackCode: "A",
    noteCode: "000",
  });

  it("refuses a non-string TA1-01 rather than emitting the reassociation key away", () => {
    // Each of these built at base: `undefined` and `null` emitted
    // `TA1**250101*1200*A*000`, the number emitted `TA1*123456789*…` with the
    // NUMBER surviving onto `elements`, and the object emitted
    // `TA1*[object Object]*…`.
    //
    // `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED` moved this MESSAGE: TA1-01 is
    // routed through `requireControlNumber`, which type-checks one step ahead
    // of `esc` and can name the slot, so the refusal names TA1-01 where the
    // escaper's could only name the builder. Same class, same code. The
    // escaper's own wording is still pinned, on `ackCode`, in
    // `test/transactions-ack-ta1-escape.test.ts`.
    for (const bad of [undefined, null, 123_456_789, { a: 1 }]) {
      expect(() => buildTA1(asJsCaller(spec(bad)))).toThrow(
        /buildTA1: interchangeControlNumber must be a string, but received .*\. TA1-01 is a required control number/u,
      );
    }
    // The refusal is this module's typed one, not a bare TypeError out of
    // `escapeRelease`, which is what routing through the chokepoint buys.
    expect(() => buildTA1(asJsCaller(spec(123_456_789)))).toThrow(AckBuildError);
  });

  it("releases an active delimiter instead of letting it shift every later element", () => {
    // `1*BOGUS` emitted `TA1*1*BOGUS*250101*1200*A*000` at base, which reads
    // back with the disposition one slot out. Same class as the raw slots
    // `#60` routed, closed on the same helper.
    expect(buildTA1(asJsCaller(spec("1*BOGUS"))).raw).toBe("TA1*1?*BOGUS*250101*1200*A*000");
  });
});

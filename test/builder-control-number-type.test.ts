/**
 * `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED`: the empty-control-number guard
 * tested `value === ""` and nothing else, so a non-string walked past it and
 * reached `padControl`, where the fabrication the guard exists to stop happened
 * anyway.
 *
 * ## The defect
 *
 * `X12-EMPTY-CONTROL-NUMBER-FABRICATED` closed `interchangeControlNumber: ""`
 * at thirty slots. The guard it added is byte-strict, and byte-strict means a
 * value that is not a string is not `""`. Measured on this tree at base commit
 * `a226595`, through `buildInterchange`, and identically in all nine builders
 * that assemble an ISA:
 *
 * ```text
 * interchangeControlNumber: []                 ISA-13 = 000000000   warnings: []
 * interchangeControlNumber: new String("")     ISA-13 = 000000000   warnings: []
 * interchangeControlNumber: new String("ABC")  ISA-13 = 000000ABC   warnings: []
 * interchangeControlNumber: new String(" ")    ISA-13 = 00000000    warnings: []
 * ```
 *
 * The first two are the **same fabricated `000000000`**, reached through a
 * different input type: a frozen, well-formed interchange whose ISA-13
 * reconciles against its IEA-02 on nine digits the caller never supplied. The
 * other two are silent **coercions** of a boxed string: at base the same
 * `new String("ABC")` was refused at GS-06 and accepted at ISA-13 in one call.
 *
 * ## The census, which is NINE slots and not thirty
 *
 * The thirty slots split by route, and only one route was exposed. The 21 that
 * reach the wire through `esc` were already type-checked; every non-string
 * probed at those slots drew that builder's own typed refusal at base. The nine ISA-13 / IEA-02
 * slots reach the wire through `padControl`, which reads `.length` and then
 * concatenates, and the ISA is joined directly - outside both the escaper and
 * `requireCallerSegment`. **Nine slots fabricated or coerced; 21 did not.**
 *
 * ## What this file asserts
 *
 * One red case per ISA-13 / IEA-02 slot lives here for `buildInterchange` and
 * `build999` and in each domain builder's own suite for the other seven, beside
 * the valid spec it mutates - the same layout
 * `test/builder-control-number-empty.test.ts` uses. `buildTA1`'s TA1-01 case is
 * in `test/transactions-ack-ta1-escape.test.ts`, beside the escaper case it
 * moved away from. This file additionally holds the boundary pins: the four
 * shapes that used to build, the diagnostics that moved, and the residual the
 * type test deliberately does not reach.
 *
 * **Every diagnostic named below moved onto a code the builder ALREADY raises.
 * No code was minted and no warning code moved**, which is the same call
 * `X12-EMPTY-CONTROL-NUMBER-FABRICATED` made and the reason a consumer
 * branching on a builder error code is not blinded here. What did move is
 * pinned case by case, in both directions, because a fix that moves a predicate
 * has to say so.
 *
 * **No census of what is NOT routed through the guard is published here.**
 */

import { describe, expect, it } from "vitest";

import {
  build999,
  buildInterchange,
  X12BuildError,
  X12_BUILD_ERROR_CODES,
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  type Build999Spec,
  type InterchangeSpec,
} from "../src/index.js";

const IX_SPEC: InterchangeSpec = {
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
          implementationConventionReference: "005010X222A2",
          segments: [["BHT", "0019", "00", "REF", "20260601", "1200", "CH"]],
        },
      ],
    },
  ],
};

const ACK_SPEC: Build999Spec = {
  envelope: {
    senderId: "SENDER",
    receiverId: "RECEIVER",
    interchangeDate: "260601",
    interchangeTime: "1200",
    interchangeControlNumber: "000000001",
    groupControlNumber: "1",
    transactionSetControlNumber: "0001",
  },
  functionalGroup: {
    functionalIdCode: "HC",
    groupControlNumber: "1",
    versionRelease: "005010X222A2",
    disposition: "A",
    numberOfTransactionSets: 1,
    numberOfReceivedTransactionSets: 1,
    numberOfAcceptedTransactionSets: 1,
    transactionResponses: [
      { transactionSetIdCode: "837", transactionSetControlNumber: "0001", disposition: "A" },
    ],
  },
};

/** Replace the single group's control number. @internal */
function withGroupControlNumber(value: unknown): InterchangeSpec {
  const group = IX_SPEC.groups[0];
  if (group === undefined) throw new Error("fixture has no group");
  return { ...IX_SPEC, groups: [{ ...group, groupControlNumber: value as string }] };
}

/** Replace the single transaction's control number. @internal */
function withTransactionControlNumber(value: unknown): InterchangeSpec {
  const group = IX_SPEC.groups[0];
  const tx = group?.transactions[0];
  if (group === undefined || tx === undefined) throw new Error("fixture has no transaction");
  return {
    ...IX_SPEC,
    groups: [{ ...group, transactions: [{ ...tx, transactionSetControlNumber: value as string }] }],
  };
}

/** Replace the single group's version release, which is NOT a control number. @internal */
function withVersionRelease(value: unknown): InterchangeSpec {
  const group = IX_SPEC.groups[0];
  if (group === undefined) throw new Error("fixture has no group");
  return { ...IX_SPEC, groups: [{ ...group, versionRelease: value as string }] };
}

/** Replace the single transaction response's control number. @internal */
function withAk202(value: unknown): Build999Spec {
  const response = ACK_SPEC.functionalGroup.transactionResponses[0];
  if (response === undefined) throw new Error("fixture has no transaction response");
  return {
    ...ACK_SPEC,
    functionalGroup: {
      ...ACK_SPEC.functionalGroup,
      transactionResponses: [{ ...response, transactionSetControlNumber: value as string }],
    },
  };
}

/** A boxed string is a non-string this package refuses by name at `esc`. */
const BOXED_EMPTY = new String("") as unknown as string;
const BOXED_TEXT = new String("ABC") as unknown as string;
const BOXED_SPACE = new String(" ") as unknown as string;

// ---------------------------------------------------------------------------
// The nine ISA-13 / IEA-02 slots - the two that live here. The other seven are
// in their own build suites.
// ---------------------------------------------------------------------------

describe("X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED: the ISA-13 slots that fabricated", () => {
  it("🩺 buildInterchange refuses an array interchangeControlNumber (ISA-13 / IEA-02)", () => {
    // `[]` has `.length === 0`, so `padControl` took the pad branch and
    // concatenated it to nine zeros. ISA-13 came back `000000000`.
    expect(() =>
      buildInterchange({ ...IX_SPEC, interchangeControlNumber: [] as unknown as string }),
    ).toThrow(
      /buildInterchange: interchangeControlNumber must be a string, but received an array\. ISA-13 \/ IEA-02 is a required control number/u,
    );
  });

  it("🩺 build999 refuses an array interchangeControlNumber (ISA-13 / IEA-02)", () => {
    expect(() =>
      build999({
        ...ACK_SPEC,
        envelope: { ...ACK_SPEC.envelope, interchangeControlNumber: [] as unknown as string },
      }),
    ).toThrow(
      /build999: interchangeControlNumber must be a string, but received an array\. ISA-13 \/ IEA-02 is a required control number/u,
    );
  });

  it("🩺 the refusal is that builder's OWN typed error, and no code is minted", () => {
    try {
      buildInterchange({ ...IX_SPEC, interchangeControlNumber: BOXED_EMPTY });
      expect.unreachable("buildInterchange accepted a boxed empty control number");
    } catch (err) {
      expect(err).toBeInstanceOf(X12BuildError);
      expect((err as X12BuildError).code).toBe(X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC);
    }
    try {
      build999({
        ...ACK_SPEC,
        envelope: { ...ACK_SPEC.envelope, interchangeControlNumber: BOXED_EMPTY },
      });
      expect.unreachable("build999 accepted a boxed empty control number");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
      expect((err as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC);
    }
  });
});

// ---------------------------------------------------------------------------
// The shapes that BUILT at base, among those probed. Two fabricated, two coerced.
// No count is asserted anywhere: the probe set was never exhaustive.
// ---------------------------------------------------------------------------

describe("X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED: shapes that used to build", () => {
  const shapes: ReadonlyArray<readonly [string, unknown, string]> = [
    ["an empty array", [], "an array"],
    ["a boxed empty string", BOXED_EMPTY, "an object"],
    ["a boxed non-empty string", BOXED_TEXT, "an object"],
    ["a boxed whitespace string", BOXED_SPACE, "an object"],
  ];

  for (const [label, value, described] of shapes) {
    it(`🩺 refuses ${label}, which built a document at base`, () => {
      expect(() =>
        buildInterchange({ ...IX_SPEC, interchangeControlNumber: value as string }),
      ).toThrow(
        new RegExp(
          `buildInterchange: interchangeControlNumber must be a string, but received ${described}\\.`,
          "u",
        ),
      );
    });
  }

  it("🩺 the refusal never echoes the value, because a control number is a partner identifier", () => {
    // `REFUSAL-MESSAGE-PHI-ECHO`: the shared describer reports the TYPE only.
    // A `Symbol.toStringTag` or a caller `toString` is never invoked.
    try {
      buildInterchange({
        ...IX_SPEC,
        interchangeControlNumber: new String("900412345678") as unknown as string,
      });
      expect.unreachable("buildInterchange accepted a boxed control number");
    } catch (err) {
      expect((err as X12BuildError).message).not.toContain("900412345678");
    }
  });
});

// ---------------------------------------------------------------------------
// The diagnostics that MOVED. Every one moves onto a code the builder already
// raises; none is new. Stated in both directions.
// ---------------------------------------------------------------------------

describe("X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED: the diagnostics that moved", () => {
  it("🩺 an absent control number leaves the bare TypeError for a typed, code-tagged refusal", () => {
    // BASE: `padControl(undefined, 9)` read `.length` off `undefined` and threw
    // an untyped `TypeError` with NO `code`. A consumer catching `TypeError`
    // here no longer catches - that predicate moved, in this direction only.
    for (const absent of [undefined, null]) {
      let caught: unknown;
      try {
        buildInterchange({ ...IX_SPEC, interchangeControlNumber: absent as unknown as string });
      } catch (err) {
        caught = err;
      }
      expect(caught).toBeInstanceOf(X12BuildError);
      expect((caught as X12BuildError).code).toBe(X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC);
      expect(caught).not.toBeInstanceOf(TypeError);
    }
  });

  it("🩺 an array-like no longer builds a malformed ISA for the builder's own parser to reject", () => {
    // BASE: `["12345"]` has `.length === 1`, so `padControl` emitted a
    // THIRTEEN-character ISA-13 into a fixed-width line, and the builder's own
    // `parseX12` of the bytes it had just written threw
    // `X12_INVALID_DELIMITERS` - a PARSE error naming delimiters, for a caller
    // mistake in one named spec field. `{ length: 0 }` did the same at the
    // other end. Both now refuse before anything is written.
    for (const shape of [["12345"], [""], { length: 0 }]) {
      expect(() =>
        buildInterchange({ ...IX_SPEC, interchangeControlNumber: shape as unknown as string }),
      ).toThrow(/buildInterchange: interchangeControlNumber must be a string, but received an/u);
    }
  });

  it("stops calling a wrong-typed control number over-long, on the SAME code", () => {
    // BASE: a `number`, a plain object and a boolean have no `.length`, so both
    // `padControl` comparisons were false and it fell through to its
    // over-length throw. The code was already `X12_BUILD_INVALID_SPEC` and
    // still is; what changes is that the message stops asserting something
    // false about the value's length.
    for (const wrong of [0, {}, true]) {
      let caught: unknown;
      try {
        buildInterchange({ ...IX_SPEC, interchangeControlNumber: wrong as unknown as string });
      } catch (err) {
        caught = err;
      }
      expect((caught as X12BuildError).code).toBe(X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC);
      expect((caught as X12BuildError).message).not.toContain("exceeds");
      expect((caught as X12BuildError).message).toContain("must be a string");
    }
  });

  it("names ISA-13 where the segment guard could only name IEA-02", () => {
    // BASE: a non-string whose `.length` happened to equal 9 was returned by
    // `padControl` unchanged, reached the IEA through `joinSeg`, and
    // `requireCallerSegment` refused it as `"IEA"-02` - the correct code, the
    // wrong end of the pair, and only by coincidence of the length.
    for (const nine of [new String("000000001"), { length: 9 }, ["1", "2", "3"]]) {
      expect(() =>
        buildInterchange({ ...IX_SPEC, interchangeControlNumber: nine as unknown as string }),
      ).toThrow(/interchangeControlNumber must be a string.*ISA-13 \/ IEA-02/su);
    }
  });

  it("🩺 moves the MESSAGE on the esc-routed slots too, and keeps the class and code", () => {
    // The guard is shared, so GS-06 / ST-02 / AK1-02 / AK2-02 now refuse a
    // non-string one step earlier than `esc` did. `esc`'s refusal names the
    // builder and the type; this one names the slot and the spec property as
    // well. Same class, same code, different words - so a consumer MATCHING
    // THE MESSAGE at those slots is affected and a consumer branching on the
    // code is not. Pinned because "nothing changed on the other 21" would be
    // false.
    expect(() => buildInterchange(withGroupControlNumber([]))).toThrow(
      /buildInterchange: groupControlNumber must be a string, but received an array\. GS-06 \/ GE-02 is a required control number/u,
    );
    expect(() =>
      build999({
        ...ACK_SPEC,
        functionalGroup: {
          ...ACK_SPEC.functionalGroup,
          groupControlNumber: [] as unknown as string,
        },
      }),
    ).toThrow(
      /build999: functionalGroup\.groupControlNumber must be a string, but received an array\. AK1-02 is a required control number/u,
    );
    expect(() => build999(withAk202([]))).toThrow(
      /build999: transactionResponses\[\]\.transactionSetControlNumber must be a string, but received an array\. AK2-02 is a required control number/u,
    );
  });

  it("names the remaining envelope slots too, so all thirty are covered by a case", () => {
    // The three slots the case above does not reach. Every slot routed through
    // `requireControlNumber` has a red case somewhere in the suite: the nine
    // ISA-13 / IEA-02 ones and the fourteen domain GS-06 / ST-02 ones in the
    // seven build suites and above, TA1-01 in
    // `test/transactions-ack-ta1-escape.test.ts`, and these three here.
    expect(() => buildInterchange(withTransactionControlNumber([]))).toThrow(
      /buildInterchange: transactionSetControlNumber must be a string, but received an array\. ST-02 \/ SE-02 is a required control number/u,
    );
    expect(() =>
      build999({
        ...ACK_SPEC,
        envelope: { ...ACK_SPEC.envelope, groupControlNumber: [] as unknown as string },
      }),
    ).toThrow(
      /build999: groupControlNumber must be a string, but received an array\. GS-06 \/ GE-02 is a required control number/u,
    );
    expect(() =>
      build999({
        ...ACK_SPEC,
        envelope: { ...ACK_SPEC.envelope, transactionSetControlNumber: [] as unknown as string },
      }),
    ).toThrow(
      /build999: transactionSetControlNumber must be a string, but received an array\. ST-02 \/ SE-02 is a required control number/u,
    );
  });

  it("still refuses a non-string on an element that is NOT a control number, from its own guard", () => {
    // The guards this one sits beside are not replaced. `versionRelease` is a
    // caller string that reaches GS-08 and is routed through no control-number
    // guard, so `requireCallerSegment` is still what fires and still derives
    // the slot from the segment it holds.
    expect(() => buildInterchange(withVersionRelease(5010))).toThrow(
      /buildInterchange: "GS"-08 must be a string, but received a number/u,
    );
  });
});

// ---------------------------------------------------------------------------
// What the type test does NOT reach.
// ---------------------------------------------------------------------------

describe("X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED: what it does not cover", () => {
  it("🩺 a WHITESPACE-ONLY control number still pads and still builds", () => {
    // Unfixed BY DESIGN and unchanged by this slice. Trimming is a
    // normalisation rule and no source consulted for this package states one.
    // The asymmetry is real and is disclosed rather than smoothed over:
    // `new String(" ")` is refused because it is not a string, and the
    // primitive `" "` is not.
    const ix = buildInterchange({ ...IX_SPEC, interchangeControlNumber: " " });
    expect(ix.isa.elements[13]).toBe("00000000 ");
    expect(ix.warnings).toHaveLength(0);
  });

  it("a SHORT control number still zero-pads, and a long one still draws the length refusal", () => {
    // The guard narrows what a control number may BE, never what it may
    // CONTAIN and never how long it may be.
    expect(buildInterchange({ ...IX_SPEC, interchangeControlNumber: "1" }).isa.elements[13]).toBe(
      "000000001",
    );
    expect(() => buildInterchange({ ...IX_SPEC, interchangeControlNumber: "0000000001" })).toThrow(
      /exceeds the 9-char spec limit/u,
    );
  });

  it("🩺 leaves every guard that ran BEFORE it in front, unchanged", () => {
    // The type test went into the guard the empty test already occupied, at the
    // same site, so it inherits that precedence exactly rather than
    // establishing a new one. `enforceAcceptIsClean` is the sharpest instance
    // and is pinned in `test/transactions-ack-ta1-escape.test.ts`; `build999`'s
    // count reconciliation is measured here, at BOTH control-number guards,
    // because it runs ahead of both and reporting one would read as a rule
    // about the envelope.
    const withBadCounts = {
      ...ACK_SPEC.functionalGroup,
      numberOfAcceptedTransactionSets: 7,
    };
    for (const spec of [
      {
        ...ACK_SPEC,
        functionalGroup: { ...withBadCounts, groupControlNumber: [] as unknown as string },
      },
      {
        ...ACK_SPEC,
        envelope: { ...ACK_SPEC.envelope, interchangeControlNumber: [] as unknown as string },
        functionalGroup: withBadCounts,
      },
    ]) {
      try {
        build999(spec);
        expect.unreachable("build999 accepted an array control number");
      } catch (err) {
        expect((err as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH);
      }
    }
  });
});

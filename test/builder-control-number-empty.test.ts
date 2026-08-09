/**
 * `X12-EMPTY-CONTROL-NUMBER-FABRICATED`: an empty control number was accepted
 * on emit, and at ISA-13 it was **invented** rather than merely dropped.
 *
 * ## The defect
 *
 * Every builder that assembles an ISA zero-pads its control number to the nine
 * characters ASC X12 .5 fixes ISA-13 at, through a private `padControl`.
 * `padControl("1", 9)` answering `"000000001"` is the point of the helper;
 * `padControl("", 9)` answering `"000000000"` is not, and nothing stood in
 * front of it. Measured on this tree at base commit `28b417f`:
 *
 * ```text
 * buildInterchange, interchangeControlNumber: ""
 *   ISA*…*00501*000000000*0*P*:~ … ~IEA*1*000000000~      warnings: []
 * ```
 *
 * The interchange is frozen, well-formed, reconciles ISA-13 against IEA-02 and
 * carries a nine-digit control number the caller never supplied. A control
 * number is how an interchange is reconciled and acknowledged, so a fabricated
 * one does not fail: it succeeds against the **wrong** thing.
 *
 * ## The census, which is wider than the filed line and differs by slot
 *
 * The item named ISA-13 / IEA-02. The other two envelope pairs take the same
 * empty input and are silent too, in a different way: they reach the wire
 * through `esc`, and `escapeRelease` early-returns on `""`, so the required
 * element is emitted EMPTY at **both** ends of the pair, which means each pair
 * still reconciles against itself and no `X12_CONTROL_NUMBER_MISMATCH` fires.
 * Measured at the same commit:
 *
 * ```text
 * groupControlNumber: ""            GS*HC*…*1200**X*005010X222A2~ … ~GE*1*~   warnings: []
 * transactionSetControlNumber: ""   ST*837**005010X222A2~ … ~SE*3*~           warnings: []
 * ```
 *
 * The acknowledgment builders carry the same class at the slots where they
 * ECHO the document being acknowledged, which is the whole reason a sender can
 * match an ack to what they sent. Measured at the same commit:
 *
 * ```text
 * build999, functionalGroup.groupControlNumber: ""           AK1*HC**005010X222A2~
 * build999, transactionResponses[0].…ControlNumber: ""       AK2*837*~
 * buildTA1, interchangeControlNumber: ""                     TA1**260601*1200*A*000
 * ```
 *
 * ## What this file asserts, and what it does not
 *
 * One red case per slot routed through
 * {@link "../src/builder/caller-control-number.js".requireControlNumber}, plus
 * the drift pin that no builder reaches `padControl` with a raw spec field.
 * `buildTA1`'s case lives in `test/transactions-ack-ta1-escape.test.ts` beside
 * the disclosure it replaces, and the seven domain builders' envelope cases
 * live in their own build suites beside the valid specs they mutate.
 *
 * **The drift pin is a source regex and it establishes nothing about the
 * property** - that is this repo's own recorded finding about same-line scans,
 * and it is written here so the pin is not read as proof. What carries the
 * property is the behavioural cases; what the pin buys is that a tenth builder
 * copying the `padControl` block cannot land unguarded without going red.
 *
 * **No census of the slots that are NOT routed is published here.** Growing one
 * is the runaway ADR 0016 exists to stop, and this package has been refuted for
 * publishing one three times. The claim is the property: a control number
 * routed through `requireControlNumber` is refused when empty.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

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

// ---------------------------------------------------------------------------
// buildInterchange - the general-purpose segment-level builder.
// ---------------------------------------------------------------------------

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

/** Replace the single group's control number. @internal */
function withGroupControlNumber(value: string): InterchangeSpec {
  const group = IX_SPEC.groups[0];
  if (group === undefined) throw new Error("fixture has no group");
  return { ...IX_SPEC, groups: [{ ...group, groupControlNumber: value }] };
}

/** Replace the single transaction's control number. @internal */
function withTransactionControlNumber(value: string): InterchangeSpec {
  const group = IX_SPEC.groups[0];
  const tx = group?.transactions[0];
  if (group === undefined || tx === undefined) throw new Error("fixture has no transaction");
  return {
    ...IX_SPEC,
    groups: [{ ...group, transactions: [{ ...tx, transactionSetControlNumber: value }] }],
  };
}

describe("X12-EMPTY-CONTROL-NUMBER-FABRICATED: buildInterchange", () => {
  it("builds the control fixture with every control number intact", () => {
    // The green control. Without it the three red cases below would pass on a
    // fixture that was broken for some other reason.
    const ix = buildInterchange(IX_SPEC);
    expect(ix.warnings).toHaveLength(0);
    expect(ix.isa.elements[13]).toBe("000000001");
    expect(ix.groups[0]?.gs.elements[6]).toBe("1");
    expect(ix.groups[0]?.transactions[0]?.st.elements[2]).toBe("0001");
  });

  it("🩺 refuses an empty interchangeControlNumber rather than emitting 000000000", () => {
    const run = (): unknown => buildInterchange({ ...IX_SPEC, interchangeControlNumber: "" });
    // The MESSAGE, not the class: `expect(run).toThrow(X12BuildError)` passes on
    // any unrelated refusal, and four of six cases in an earlier slice were
    // vacuous exactly that way.
    expect(run).toThrow(
      /buildInterchange: interchangeControlNumber is empty\. ISA-13 \/ IEA-02 is a required control number/,
    );
    expect(run).toThrow(X12BuildError);
    try {
      run();
      expect.unreachable("buildInterchange accepted an empty interchangeControlNumber");
    } catch (error) {
      expect(error).toBeInstanceOf(X12BuildError);
      expect((error as X12BuildError).code).toBe(X12_BUILD_ERROR_CODES.X12_BUILD_INVALID_SPEC);
    }
  });

  it("refuses an empty groupControlNumber rather than emitting an empty GS-06 / GE-02", () => {
    expect(() => buildInterchange(withGroupControlNumber(""))).toThrow(
      /buildInterchange: groupControlNumber is empty\. GS-06 \/ GE-02 is a required control number/,
    );
  });

  it("refuses an empty transactionSetControlNumber rather than an empty ST-02 / SE-02", () => {
    expect(() => buildInterchange(withTransactionControlNumber(""))).toThrow(
      /buildInterchange: transactionSetControlNumber is empty\. ST-02 \/ SE-02 is a required control number/,
    );
  });

  it("🩺 does NOT trim: a whitespace-only control number still builds, and still pads", () => {
    // Byte-strict `=== ""`, mirroring `build835`'s `patientControlNumber === ""`
    // and every other empty-required-element guard in this package. Trimming
    // would be a normalisation rule and no source consulted for this package
    // states one. Pinned because it is the residual a reader must know about:
    // ISA-13 still carries eight zeros and a space that nobody sent.
    const ix = buildInterchange({ ...IX_SPEC, interchangeControlNumber: " " });
    expect(ix.isa.elements[13]).toBe("00000000 ");
    expect(buildInterchange(withGroupControlNumber(" ")).groups[0]?.gs.elements[6]).toBe(" ");
  });

  it("does not refuse a SHORT control number: zero-padding a supplied value is the point", () => {
    // The guard must not be read as "ISA-13 must be nine characters". A caller
    // who supplies `"1"` gets `"000000001"`, unchanged by this slice.
    const ix = buildInterchange({ ...IX_SPEC, interchangeControlNumber: "1" });
    expect(ix.isa.elements[13]).toBe("000000001");
  });
});

// ---------------------------------------------------------------------------
// build999 - three envelope pairs plus the two slots that ECHO the
// acknowledged document.
// ---------------------------------------------------------------------------

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

describe("X12-EMPTY-CONTROL-NUMBER-FABRICATED: build999", () => {
  it("builds the control fixture clean", () => {
    const ix = build999(ACK_SPEC);
    expect(ix.warnings).toHaveLength(0);
  });

  it("🩺 refuses an empty envelope interchangeControlNumber", () => {
    expect(() =>
      build999({ ...ACK_SPEC, envelope: { ...ACK_SPEC.envelope, interchangeControlNumber: "" } }),
    ).toThrow(/build999: interchangeControlNumber is empty\. ISA-13 \/ IEA-02 is a required/);
  });

  it("refuses an empty envelope groupControlNumber", () => {
    expect(() =>
      build999({ ...ACK_SPEC, envelope: { ...ACK_SPEC.envelope, groupControlNumber: "" } }),
    ).toThrow(/build999: groupControlNumber is empty\. GS-06 \/ GE-02 is a required/);
  });

  it("refuses an empty envelope transactionSetControlNumber", () => {
    expect(() =>
      build999({
        ...ACK_SPEC,
        envelope: { ...ACK_SPEC.envelope, transactionSetControlNumber: "" },
      }),
    ).toThrow(/build999: transactionSetControlNumber is empty\. ST-02 \/ SE-02 is a required/);
  });

  it("🩺 refuses an empty AK1-02, the group control number being acknowledged", () => {
    // Distinct from the envelope's own GS-06: AK1-02 echoes the group being
    // acknowledged, so an empty one used to emit `AK1*HC**005010X222A2~` and
    // acknowledge nothing the sender can match.
    const run = (): unknown =>
      build999({
        ...ACK_SPEC,
        functionalGroup: { ...ACK_SPEC.functionalGroup, groupControlNumber: "" },
      });
    expect(run).toThrow(
      /build999: functionalGroup\.groupControlNumber is empty\. AK1-02 is a required/,
    );
    try {
      run();
      expect.unreachable("build999 accepted an empty AK1-02");
    } catch (error) {
      expect(error).toBeInstanceOf(AckBuildError);
      expect((error as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC);
    }
  });

  it("🩺 refuses an empty AK2-02, the transaction set control number being acknowledged", () => {
    expect(() =>
      build999({
        ...ACK_SPEC,
        functionalGroup: {
          ...ACK_SPEC.functionalGroup,
          transactionResponses: [
            { transactionSetIdCode: "837", transactionSetControlNumber: "", disposition: "A" },
          ],
        },
      }),
    ).toThrow(
      /build999: transactionResponses\[\]\.transactionSetControlNumber is empty\. AK2-02 is a required/,
    );
  });
});

// ---------------------------------------------------------------------------
// The drift pin. A SOURCE REGEX, and nothing more than one.
// ---------------------------------------------------------------------------

/**
 * Every builder module that assembles an ISA. Named rather than globbed so a
 * new one is a deliberate edit here, which is the only thing a source scan of
 * this shape can buy.
 */
const ISA_BUILDERS = [
  "src/builder/build-interchange.ts",
  "src/transactions/ack/build-999.ts",
  "src/transactions/auth/build-278.ts",
  "src/transactions/claim/build-837.ts",
  "src/transactions/eligibility/build-271.ts",
  "src/transactions/enrollment/build-834.ts",
  "src/transactions/premium/build-820.ts",
  "src/transactions/remit/build-835.ts",
  "src/transactions/status/build-277.ts",
] as const;

/** The three envelope pairs, as the slot literal each guard passes. */
const ENVELOPE_SLOTS = ["ISA-13 / IEA-02", "GS-06 / GE-02", "ST-02 / SE-02"] as const;

describe("X12-EMPTY-CONTROL-NUMBER-FABRICATED: the drift pin", () => {
  it("every ISA builder guards all three envelope control-number pairs", () => {
    const offenders: string[] = [];
    for (const rel of ISA_BUILDERS) {
      const source = readFileSync(join(__dirname, "..", rel), "utf8");
      for (const slot of ENVELOPE_SLOTS) {
        if (!source.includes(`"${slot}"`)) offenders.push(`${rel}: no guard naming ${slot}`);
      }
      if (!source.includes("caller-control-number.js")) {
        offenders.push(`${rel}: does not import the guard`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no builder calls padControl on a value that has not been named to a guard", () => {
    // Every `padControl` call site takes the same spec field the guard above it
    // names. Pinning the pair keeps a tenth builder from copying the ISA block
    // without the guard. It says nothing about ORDER, which is why the
    // behavioural cases above and in the seven domain suites are the evidence.
    const offenders: string[] = [];
    for (const rel of ISA_BUILDERS) {
      const source = readFileSync(join(__dirname, "..", rel), "utf8");
      for (const [index, line] of source.split("\n").entries()) {
        const trimmed = line.trim();
        // Comment lines are skipped, and that is the right call HERE even
        // though `test/builder-array-bounds.test.ts` deliberately does not
        // strip them: that scan bans a SHAPE, so writing the bad shape in a
        // comment should red. This one bans an unguarded CALL, and the guard's
        // own comment has to be able to quote `padControl("", 9)`.
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          continue;
        }
        if (!line.includes("padControl(")) continue;
        if (line.includes("function padControl(")) continue;
        if (/padControl\((spec|envelope)\.interchangeControlNumber, 9\)/.test(line)) continue;
        offenders.push(`${rel}:${String(index + 1)}: ${trimmed}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

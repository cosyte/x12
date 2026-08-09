/**
 * `X12-EMIT-DEGENERATE-RELEASE-DELIMITER`: a builder refuses a delimiter set in
 * which the release character `?` is also a delimiter, because on such a set it
 * cannot emit a document it can read back.
 *
 * ## The property, stated so one more trigger byte cannot falsify it
 *
 * {@link "../src/parser/release.js".escapeRelease} protects a byte by
 * **prefixing** `?` to it, in whatever role `?` was declared. When `?` is one of
 * the four delimiters that prefix is itself structure, so the protection becomes
 * the thing it was protecting against. The inverse holds at the same time: a
 * builder joins composites with the component separator and repetitions with the
 * repetition separator, so where either of those IS `?` the library's own
 * structural join is emitted as an escape sequence.
 *
 * **Two mechanisms, and only the first involves a caller's value at all.** The
 * filed defect named the first and reached THREE roles. Measured at base
 * `51de7b2`, the class is FOUR roles, and the second mechanism fires on
 * documents where no value carries any trigger byte:
 *
 * ```text
 * elementSeparator "?"     buildInterchange ["CLM","PATIENT?ACCT","150.00"]
 *                            reads ["CLM","PATIENT","","ACCT","150.00"]
 * segmentTerminator "?"    buildInterchange ["CLM","PAT*ACCT","150.00"]
 *                            CLM-01 reads "PAT", a phantom segment follows,
 *                            and the transaction gains segments SE-01 never
 *                            counted
 * componentSeparator "?"   build837P, EVERY document, no trigger byte:
 *                            SV1-01-2 (the procedure code) reads undefined
 *                            HI-01-2 (the diagnosis code) reads undefined
 * repetitionSeparator "?"  build271, EVERY document, no trigger byte:
 *                            EB-03 "30" + "1" reads back as one code "30?1"
 * warnings: [] on every row.
 * ```
 *
 * 🩺 The second mechanism is the sharper one: a procedure code and a diagnosis
 * code are what a claim is adjudicated on, and neither the caller nor the
 * receiver has any signal that they were fused.
 *
 * ## Why the whole SET is refused, rather than the values that trip
 *
 * A value-level guard cannot reach the second mechanism at all - there is no
 * offending value in the 837 whose procedure code is lost - and it would leave a
 * caller with an instruction they cannot act on. *"Keep `?` out of your values"*
 * was already refuted once in this arc for protecting nobody.
 *
 * The refusal follows
 * {@link "../src/builder/caller-control-number.js".requireControlNumber}'s call
 * one slice earlier: REFUSE rather than warn, on CONSISTENCY with the guards
 * this package already carries on emit and with emit being the strict half of
 * Postel's Law here, NOT on a spec clause - 005010 does not transmit a release
 * character at all and settles none of this. A warning would have to travel the
 * READ registry, which `#83` was refuted for.
 *
 * ## Where it sits, and the one precedence move
 *
 * The check runs inside {@link
 * "../src/builder/caller-string.js".makeCallerEscaper}, ONCE, where a builder
 * resolves its delimiters. `test/builder-string-type.test.ts` already requires
 * every builder to construct its `esc` there, so the coverage is structural
 * rather than a hand-list - but a source gate establishes nothing about
 * behaviour, so every builder has its own behavioural case: `buildInterchange`,
 * `build999` and `buildTA1` below, and the seven domain builders beside the
 * valid specs they mutate, in their own suites.
 *
 * Every guard a builder runs EARLIER keeps precedence, measured base vs head:
 * `build835`'s balance equations, `build837`'s spine, `build999`'s AK9 count
 * invariants and `buildTA1`'s `enforceAcceptIsClean` all still report first.
 * Everything a builder checks LATER yields to this refusal, and a MESSAGE moves
 * rather than a code - no code is minted anywhere, each builder refuses with its
 * own existing one.
 *
 * **🛑 NEVER COUNT WHAT MOVED.** A draft of this file said *"one report moved"*
 * and the gate measured it false: `requireControlNumber` runs after the escaper
 * in EVERY builder that has one, so on a degenerate set both control-number
 * mechanisms this arc shipped are preempted at every one of their slots. The
 * cases below vary the BUILDER as well as the delimiter set for that reason -
 * a control that varies only the set cannot see the class.
 *
 * ## What is deliberately NOT changed, and all three are pinned below
 *
 * - **🛑 The guard is an EQUALITY TEST on the value a caller declares, and that
 *   is the whole of it.** No builder checks that a delimiter is one byte, so a
 *   `segmentTerminator` of `"??"` is not equal to `"?"`, builds, and still
 *   transmits `?` as the terminator. Identical at base, so the behaviour is
 *   `PRE-EXISTING`; **the guard is NOT grown to reach it** - a delimiter-length
 *   rule is a different decision. Two drafts claimed the document-level form
 *   (*"no NEW document of that shape is composed"*) and the gate falsified both.
 * - **The read side.** `parseX12` still accepts every degenerate set and
 *   `decodeSegment` still frames a degenerate body segment. Documents this
 *   library emitted before this guard exist.
 * - **`serializeX12`.** It re-emits a set a SENDER declared out of a model that
 *   was parsed, so refusing there would refuse round-tripping an inbound
 *   document.
 */

import { describe, expect, it } from "vitest";

import {
  build271,
  build999,
  buildInterchange,
  buildTA1,
  decodeSegment,
  escapeRelease,
  getSegmentValue,
  parseX12,
  serializeX12,
  X12BuildError,
  type Delimiters,
  type X12ParseWarning,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

/** A spec that is valid but for the delimiter set under test. */
function interchangeSpec(
  delimiters: Readonly<Record<string, string>>,
  segment: readonly string[] = ["CLM", "PATIENTACCT", "150.00"],
): Parameters<typeof buildInterchange>[0] {
  return {
    ...delimiters,
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
            segments: [segment],
          },
        ],
      },
    ],
  };
}

const ROLES: readonly (readonly [string, string])[] = [
  ["elementSeparator", "element separator"],
  ["repetitionSeparator", "repetition separator"],
  ["componentSeparator", "component separator"],
  ["segmentTerminator", "segment terminator"],
];

describe("X12-EMIT-DEGENERATE-RELEASE-DELIMITER: every role is refused", () => {
  it.each(ROLES)(
    '🩺 `buildInterchange` refuses `%s: "?"` and names the role',
    (option, roleName) => {
      const run = (): unknown => buildInterchange(interchangeSpec({ [option]: "?" }));
      // Assert the MESSAGE, never just the class: this builder has one error
      // code and `toThrow(X12BuildError)` passes on an unrelated refusal.
      expect(run).toThrow(
        `buildInterchange: "?" is the X12 release character and cannot also be the ${roleName}.`,
      );
      expect(run).toThrow(X12BuildError);
    },
  );

  it("names every degenerate role when a set carries more than one", () => {
    expect(() =>
      buildInterchange(interchangeSpec({ elementSeparator: "?", componentSeparator: "?" })),
    ).toThrow("cannot also be the element separator and the component separator.");
  });

  it("the refusal carries the builder's existing code and mints none", () => {
    try {
      buildInterchange(interchangeSpec({ elementSeparator: "?" }));
      throw new Error("buildInterchange did not refuse a degenerate set");
    } catch (error) {
      expect(error).toBeInstanceOf(X12BuildError);
      expect((error as X12BuildError).code).toBe("X12_BUILD_INVALID_SPEC");
    }
  });

  it("🩺 `build999` refuses a degenerate set - an ack is how a sender learns anything at all", () => {
    expect(() =>
      build999({
        envelope: {
          senderId: "S",
          receiverId: "R",
          interchangeDate: "260601",
          interchangeTime: "1200",
          interchangeControlNumber: "000000001",
          groupControlNumber: "1",
          transactionSetControlNumber: "0001",
          componentSeparator: "?",
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
      }),
    ).toThrow(
      'build999: "?" is the X12 release character and cannot also be the component separator.',
    );
  });

  it("🩺 `buildTA1` refuses a degenerate set declared in its options", () => {
    expect(() =>
      buildTA1(
        {
          interchangeControlNumber: "000000001",
          interchangeDate: "260601",
          interchangeTime: "1200",
          ackCode: "A",
          noteCode: "000",
        },
        { segmentTerminator: "?" },
      ),
    ).toThrow(
      'buildTA1: "?" is the X12 release character and cannot also be the segment terminator.',
    );
  });
});

describe("X12-EMIT-DEGENERATE-RELEASE-DELIMITER: the precedence a builder's own guards keep", () => {
  it("🛑 `build999`'s AK9 count invariant still reports first", () => {
    // Measured base vs head: unchanged. A count invariant is a safety guard and
    // outranks a delimiter refusal.
    expect(() =>
      build999({
        envelope: {
          senderId: "S",
          receiverId: "R",
          interchangeDate: "260601",
          interchangeTime: "1200",
          interchangeControlNumber: "000000001",
          groupControlNumber: "1",
          transactionSetControlNumber: "0001",
          componentSeparator: "?",
        },
        functionalGroup: {
          functionalIdCode: "HC",
          groupControlNumber: "1",
          versionRelease: "005010X222A2",
          disposition: "A",
          numberOfTransactionSets: 1,
          numberOfReceivedTransactionSets: 1,
          numberOfAcceptedTransactionSets: 7,
          transactionResponses: [
            { transactionSetIdCode: "837", transactionSetControlNumber: "0001", disposition: "A" },
          ],
        },
      }),
    ).toThrow(/AK9-04 accepted/);
  });

  it("🛑 `buildTA1`'s `enforceAcceptIsClean` still reports first", () => {
    expect(() =>
      buildTA1(
        {
          interchangeControlNumber: "000000001",
          interchangeDate: "260601",
          interchangeTime: "1200",
          ackCode: "A",
          noteCode: "001",
        },
        { segmentTerminator: "?" },
      ),
    ).toThrow(/An accept must cite/);
  });

  it("🛑 what YIELDS: two `requireControlNumber` slots, pinned as instances", () => {
    // 🛑 READ THE TITLE AS ITS SCOPE. These are two slots in ONE builder and
    // only the empty mechanism; the ORDERING claim they illustrate is wider
    // (`requireControlNumber` is built after the escaper in every builder that
    // has one, so the non-string mechanism yields at every slot too) and is
    // carried by the source, not by this case. Nothing here reds if a future
    // builder puts `requireControlNumber` above its escaper - said rather than
    // claimed away, because a drift pin over a hand-list proves nothing.
    // A draft pinned one row and called it "the one report that moved".
    const isa = { ...interchangeSpec({ elementSeparator: "?" }), interchangeControlNumber: "" };
    expect(() => buildInterchange(isa)).toThrow(/is the X12 release character/);

    const group = interchangeSpec({ elementSeparator: "?" });
    const firstGroup = group.groups[0];
    if (firstGroup === undefined) throw new Error("the probe spec carries no group");
    expect(() =>
      buildInterchange({ ...group, groups: [{ ...firstGroup, groupControlNumber: "" }] }),
    ).toThrow(/is the X12 release character/);

    // The controls: with a conventional set each control-number refusal is still
    // exactly what gets reported, so nothing moved off them generally.
    expect(() =>
      buildInterchange({ ...interchangeSpec({}), interchangeControlNumber: "" }),
    ).toThrow(/interchangeControlNumber is empty/);
    const cleanGroup = interchangeSpec({});
    const cleanFirst = cleanGroup.groups[0];
    if (cleanFirst === undefined) throw new Error("the control spec carries no group");
    expect(() =>
      buildInterchange({ ...cleanGroup, groups: [{ ...cleanFirst, groupControlNumber: "" }] }),
    ).toThrow(/groupControlNumber is empty/);
  });
});

describe("X12-EMIT-DEGENERATE-RELEASE-DELIMITER: the mechanism the refusal prevents", () => {
  // These assert the ESCAPE and the READ directly rather than through a
  // builder, because no builder reaches these bytes any more. They are what
  // makes the refusal non-arbitrary, and they red if the escaper is ever
  // changed to something the refusal would no longer be needed for.
  const DEGENERATE_ELEMENT: Delimiters = {
    element: "?",
    repetition: "^",
    component: ":",
    segment: "~",
  };

  function decode(raw: string, delimiters: Delimiters): readonly string[] {
    const codes: string[] = [];
    const segment = decodeSegment(raw, delimiters, (w: X12ParseWarning) => codes.push(w.code), {
      segmentIndex: 1,
    });
    expect(codes).toEqual([]);
    return segment.elements;
  }

  // INSTANCES, never a census: adding a row cannot falsify the property above,
  // and two earlier drafts of this list named a trigger byte and were falsified
  // by one more.
  const instances: readonly (readonly [string, string, string, readonly string[]])[] = [
    ["a literal release character", "PATIENT?ACCT", "PATIENT??ACCT", ["PATIENT", "", "ACCT"]],
    ["a component separator inside a composite", "ABK:J45.50", "ABK?:J45.50", ["ABK", ":J45.50"]],
    ["a repetition separator", "ACME^CLINIC", "ACME?^CLINIC", ["ACME", "^CLINIC"]],
    ["a segment terminator", "A~B", "A?~B", ["A", "~B"]],
  ];

  it.each(instances)(
    "🩺 %s: the escape is emitted as structure on a degenerate element separator",
    (_name, value, escaped, framed) => {
      expect(escapeRelease(value, DEGENERATE_ELEMENT)).toBe(escaped);
      expect(decode(`CLM?${escaped}`, DEGENERATE_ELEMENT)).toEqual(["CLM", ...framed]);
    },
  );

  it("🩺 and the loss is not always a truncation - a composite lands where no dot-path reaches it", () => {
    const codes: string[] = [];
    const hi = decodeSegment(
      `HI?${escapeRelease("ABK:J45.50", DEGENERATE_ELEMENT)}`,
      DEGENERATE_ELEMENT,
      (w: X12ParseWarning) => codes.push(w.code),
      { segmentIndex: 1 },
    );
    expect(getSegmentValue(hi, "01-1", DEGENERATE_ELEMENT)).toBe("ABK");
    // The diagnosis code is in a phantom HI-02 the composite read cannot see.
    expect(getSegmentValue(hi, "01-2", DEGENERATE_ELEMENT)).toBeUndefined();
    expect(getSegmentValue(hi, "02", DEGENERATE_ELEMENT)).toBe(":J45.50");
    expect(codes).toEqual([]);
  });

  it("🩺 the second mechanism needs no caller value: a composite join IS the escape", () => {
    // What `build837P` used to emit for `HI` on `componentSeparator: "?"`. The
    // components carry no trigger byte; the JOIN is the whole defect.
    const d: Delimiters = { element: "*", repetition: "^", component: "?", segment: "~" };
    const joined = ["ABK", "J20.9"].map((c) => escapeRelease(c, d)).join("?");
    expect(joined).toBe("ABK?J20.9");
    const codes: string[] = [];
    const hi = decodeSegment(`HI*${joined}`, d, (w: X12ParseWarning) => codes.push(w.code), {
      segmentIndex: 1,
    });
    expect(getSegmentValue(hi, "01-1", d)).toBe("ABK?J20.9");
    expect(getSegmentValue(hi, "01-2", d)).toBeUndefined();
    expect(codes).toEqual([]);
  });
});

describe("X12-EMIT-DEGENERATE-RELEASE-DELIMITER: the honest controls", () => {
  it("the conventional set still builds and reports what the caller passed", () => {
    const built = buildInterchange(interchangeSpec({}, ["CLM", "PATIENT?ACCT", "150.00"]));
    const clm = built.groups[0]?.transactions[0]?.segments[1];
    expect(clm?.elements).toEqual(["CLM", "PATIENT??ACCT", "150.00"]);
    expect(getSegmentValue(clm ?? { id: "", elements: [], raw: "" }, "01", built.delimiters)).toBe(
      "PATIENT?ACCT",
    );
    expect(built.warnings).toEqual([]);
  });

  it("a `?` INSIDE a value is untouched - only a DELIMITER role is refused", () => {
    const built = buildInterchange(
      interchangeSpec({ componentSeparator: "|" }, ["REF", "EA", "A?B"]),
    );
    expect(built.warnings).toEqual([]);
  });

  it("🩺 PRE-EXISTING and NOT closed: a MULTI-BYTE delimiter is not equal to `?` and still builds", () => {
    // The guard is `=== "?"`, and no builder checks that a delimiter is one
    // byte, so this transmits `?` as the terminator by another route. Pinned as
    // an honest control so it cannot move unnoticed, and NOT guarded: a
    // delimiter-length rule is a decision nobody here has made, and growing the
    // guard to make a claim true is how a fix outgrows the thing it fixes.
    const built = buildInterchange(interchangeSpec({ segmentTerminator: "??" }));
    expect(built.delimiters.segment).toBe("?");
    expect(built.warnings).toEqual([]);
  });

  it("🛑 the READ side did not move: a degenerate interchange still parses", () => {
    const raw =
      `${buildIsa({ element: "?" })}GS?HC?S?R?20260601?1200?1?X?005010X222A1~` +
      `ST?837?0001?005010X222A1~CLM?PATIENTACCT?150.00~SE?3?0001~GE?1?1~IEA?1?000000001~`;
    const parsed = parseX12(raw);
    expect(parsed.groups[0]?.transactions[0]?.segments.map((s) => s.id)).toEqual([
      "ST",
      "CLM",
      "SE",
    ]);
    expect(parsed.warnings).toEqual([]);
  });

  it("🛑 `serializeX12` still re-emits a degenerate interchange byte for byte", () => {
    const raw =
      `${buildIsa({ element: "?" })}GS?HC?S?R?20260601?1200?1?X?005010X222A1~` +
      `ST?837?0001?005010X222A1~CLM?PATIENTACCT?150.00~SE?3?0001~GE?1?1~IEA?1?000000001~`;
    expect(serializeX12(parseX12(raw))).toBe(raw);
  });

  it("🩺 `build271` still builds a repeating EB-03 on a conventional set", () => {
    // The red control for the repetition-role case that lives in the 271 suite:
    // the same spec with `^` builds and the two service type codes read apart.
    const built = build271({
      envelope: {
        senderId: "MEDPAY",
        receiverId: "PROVIDER",
        interchangeDate: "260601",
        interchangeTime: "1200",
        interchangeControlNumber: "000000001",
        groupControlNumber: "1",
        transactionSetControlNumber: "0001",
      },
      informationSources: [
        {
          entity: {
            entityIdentifierCode: "PR",
            entityTypeQualifier: "2",
            name: "MEDPAY INSURANCE",
            idQualifier: "PI",
            idCode: "00123",
          },
          receivers: [
            {
              entity: {
                entityIdentifierCode: "1P",
                entityTypeQualifier: "2",
                name: "ANYTOWN CLINIC",
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
                    idCode: "MBR0001",
                  },
                  benefits: [
                    {
                      eligibilityCode: "1",
                      coverageLevelCode: "IND",
                      serviceTypeCodes: [{ code: "30" }, { code: "1" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const eb = built.groups[0]?.transactions[0]?.segments.find((s) => s.id === "EB");
    if (eb === undefined) throw new Error("the built 271 carries no EB");
    expect(eb.elements[3]).toBe("30^1");
    expect(getSegmentValue(eb, "03", built.delimiters)).toBe("30");
    expect(built.warnings).toEqual([]);
  });
});

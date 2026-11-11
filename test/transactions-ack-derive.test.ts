/**
 * `deriveTA1Spec` and `derive999Spec`: the TA1 and the 999 a receiver answers
 * with, derived from what `parseX12` found, and `ACK_WARNING_MAPPINGS`, the
 * table both read.
 *
 * Every interchange here is synthetic and written in this file: placeholder
 * parties (`SUBMITTER`, `RECEIVER`), `BHT` reference ids like `TESTREF1`, and
 * no patient, provider or payer data at all. The defects are planted one at a
 * time so each assertion names the warning it follows from.
 */

import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  ACK_WARNING_MAPPINGS,
  AckBuildError,
  IK3_SYNTAX_ERROR_CODES,
  IK4_SYNTAX_ERROR_CODES,
  TA1_NOTE_CODES,
  WARNING_CODES,
  build999,
  buildTA1,
  derive999Spec,
  deriveTA1Spec,
  parse999,
  parseTA1,
  parseX12,
  serializeX12,
  type Build999EnvelopeSpec,
  type X12Interchange,
  type X12ParseWarning,
} from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260601*1200*^*00501*000000001*0*P*:~";
const GS = "GS*HC*SUBMITTER*RECEIVER*20260601*1200*7*X*005010X222A1~";
const ST1 = "ST*837*0001*005010X222A1~";
const BHT1 = "BHT*0019*00*TESTREF1*20260601*1200*CH~";
const SE1 = "SE*3*0001~";
const ST2 = "ST*837*0002*005010X222A1~";
const BHT2 = "BHT*0019*00*TESTREF2*20260601*1200*CH~";
const SE2 = "SE*3*0002~";
const GE = "GE*2*7~";
const IEA = "IEA*1*000000001~";

/** One group of two 837s, every count and control number agreeing. */
const CLEAN = [ISA, GS, ST1, BHT1, SE1, ST2, BHT2, SE2, GE, IEA].join("");

/** The 999's own envelope: the receiver answering the submitter. */
const ENVELOPE: Build999EnvelopeSpec = {
  senderId: "RECEIVER",
  receiverId: "SUBMITTER",
  interchangeDate: "260601",
  interchangeTime: "1205",
  interchangeControlNumber: "000000101",
  groupControlNumber: "101",
  transactionSetControlNumber: "0101",
};

function codes(ws: readonly X12ParseWarning[]): string[] {
  return ws.map((w) => w.code);
}

function derive999(ix: X12Interchange, groupIndex?: number) {
  return derive999Spec(
    ix,
    groupIndex === undefined ? { envelope: ENVELOPE } : { envelope: ENVELOPE, groupIndex },
  );
}

/** The two 837 responses of {@link CLEAN}, both accepted. */
const ACCEPTED_RESPONSES = [
  {
    transactionSetIdCode: "837",
    transactionSetControlNumber: "0001",
    implementationConventionReference: "005010X222A1",
    disposition: "A",
  },
  {
    transactionSetIdCode: "837",
    transactionSetControlNumber: "0002",
    implementationConventionReference: "005010X222A1",
    disposition: "A",
  },
];

describe("ACK_WARNING_MAPPINGS", () => {
  it("places every warning code the package can raise, and is frozen", () => {
    expect(Object.keys(ACK_WARNING_MAPPINGS).sort()).toEqual(Object.keys(WARNING_CODES).sort());
    expect(Object.isFrozen(ACK_WARNING_MAPPINGS)).toBe(true);
    for (const mapping of Object.values(ACK_WARNING_MAPPINGS)) {
      expect(Object.isFrozen(mapping)).toBe(true);
      expect(mapping.reason.length).toBeGreaterThan(20);
    }
  });

  it("maps envelope and base-standard syntax findings, and only those", () => {
    const mapped = Object.fromEntries(
      Object.entries(ACK_WARNING_MAPPINGS)
        .filter(([, m]) => Object.keys(m).length > 1)
        .map(([code, m]) => [
          code,
          Object.fromEntries(Object.entries(m).filter(([key]) => key !== "reason")),
        ]),
    );
    expect(mapped).toEqual({
      X12_CONTROL_NUMBER_MISMATCH: {
        ta1NoteCode: "001",
        ak9SyntaxErrorCode: "4",
        ik5SyntaxErrorCode: "3",
      },
      X12_ISA_EXTRA_ELEMENT_SEPARATOR: { ta1NoteCode: "026" },
      X12_GROUP_COUNT_MISMATCH: { ta1NoteCode: "021" },
      X12_TRANSACTION_COUNT_MISMATCH: { ak9SyntaxErrorCode: "5" },
      X12_SEGMENT_COUNT_MISMATCH: { ik5SyntaxErrorCode: "4" },
      X12_MISSING_IEA: { ta1NoteCode: "023" },
      X12_MISSING_GE: { ak9SyntaxErrorCode: "3" },
      X12_MISSING_SE: { ik5SyntaxErrorCode: "2" },
      X12_DANGLING_RELEASE_CHAR: { ik3SyntaxErrorCode: "8", ik4SyntaxErrorCode: "6" },
      X12_UNEXPECTED_SEGMENT: { ta1NoteCode: "024", ik3SyntaxErrorCode: "2" },
      X12_BINARY_DATA_TRUNCATED: { ik3SyntaxErrorCode: "8", ik4SyntaxErrorCode: "4" },
      X12_BINARY_LENGTH_INVALID: { ik3SyntaxErrorCode: "8" },
      X12_BINARY_LENGTH_MISMATCH: { ik3SyntaxErrorCode: "8" },
    });
  });

  it("names only codes from the package's own registries", () => {
    for (const m of Object.values(ACK_WARNING_MAPPINGS)) {
      if (m.ta1NoteCode !== undefined)
        expect(Object.values(TA1_NOTE_CODES)).toContain(m.ta1NoteCode);
      if (m.ik3SyntaxErrorCode !== undefined) {
        expect(Object.values(IK3_SYNTAX_ERROR_CODES)).toContain(m.ik3SyntaxErrorCode);
      }
      if (m.ik4SyntaxErrorCode !== undefined) {
        expect(Object.values(IK4_SYNTAX_ERROR_CODES)).toContain(m.ik4SyntaxErrorCode);
      }
    }
  });
});

describe("deriveTA1Spec", () => {
  it("accepts a clean interchange, echoing ISA-13, ISA-09 and ISA-10", () => {
    const derived = deriveTA1Spec(parseX12(CLEAN));
    expect(derived).toEqual({
      spec: {
        interchangeControlNumber: "000000001",
        interchangeDate: "260601",
        interchangeTime: "1200",
        ackCode: "A",
        noteCode: "000",
      },
      reported: [],
      unreported: [],
    });
    expect(Object.isFrozen(derived)).toBe(true);
    expect(buildTA1(derived.spec).raw).toBe("TA1*000000001*260601*1200*A*000");
  });

  it("rejects with 001 when IEA-02 does not match ISA-13", () => {
    const ix = parseX12(CLEAN.replace(IEA, "IEA*1*000000009~"));
    const derived = deriveTA1Spec(ix);
    expect(derived.spec.ackCode).toBe("R");
    expect(derived.spec.noteCode).toBe("001");
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH]);
    expect(derived.unreported).toEqual([]);
    const read = parseTA1(
      parseX12(
        `ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SUBMITTER      *260601*1205*^*00501*000000101*0*P*:~${buildTA1(derived.spec).raw}~IEA*0*000000101~`,
      ),
    );
    expect(read?.ackCode).toBe("R");
    expect(read?.noteCode).toBe("001");
    expect(read?.interchangeControlNumber).toBe("000000001");
  });

  it("rejects with 021 when IEA-01 miscounts the groups", () => {
    const derived = deriveTA1Spec(parseX12(CLEAN.replace(IEA, "IEA*2*000000001~")));
    expect(derived.spec).toMatchObject({ ackCode: "R", noteCode: "021" });
  });

  it("rejects with 023 when the input ends before the IEA", () => {
    const derived = deriveTA1Spec(parseX12(CLEAN.replace(IEA, "")));
    expect(derived.spec).toMatchObject({ ackCode: "R", noteCode: "023" });
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_MISSING_IEA]);
  });

  it("rejects with 026 when an ISA element carries the element separator, still echoing by offset", () => {
    const planted = CLEAN.replace("*ZZ*SUBMITTER      *", "*ZZ*SUB*ITTER      *");
    const ix = parseX12(planted);
    expect(codes(ix.warnings)).toContain(WARNING_CODES.X12_ISA_EXTRA_ELEMENT_SEPARATOR);
    const derived = deriveTA1Spec(ix);
    expect(derived.spec).toEqual({
      interchangeControlNumber: "000000001",
      interchangeDate: "260601",
      interchangeTime: "1200",
      ackCode: "R",
      noteCode: "026",
    });
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_ISA_EXTRA_ELEMENT_SEPARATOR]);
  });

  it("reports the first finding and returns every later one as unreported", () => {
    const ix = parseX12(CLEAN.replace(IEA, "IEA*2*000000009~"));
    const derived = deriveTA1Spec(ix);
    expect(derived.spec.noteCode).toBe("021");
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_GROUP_COUNT_MISMATCH]);
    expect(codes(derived.unreported)).toEqual([WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH]);
  });

  it("accepts a pre-005010 version and trailing bytes, returning both as unreported", () => {
    const ix = parseX12(`${CLEAN.replace("*00501*", "*00401*")}NOT AN INTERCHANGE`);
    const derived = deriveTA1Spec(ix);
    expect(derived.spec).toMatchObject({ ackCode: "A", noteCode: "000" });
    expect(derived.reported).toEqual([]);
    expect(codes(derived.unreported)).toEqual([
      WARNING_CODES.X12_PRE_005010,
      WARNING_CODES.X12_TRAILING_GARBAGE,
    ]);
  });

  it("rejects with 024 for a segment outside every transaction set, in or out of a group", () => {
    const between = parseX12(CLEAN.replace(GE, `${GE}NTE*ADD*TESTNOTE~`));
    expect(deriveTA1Spec(between).spec).toMatchObject({ ackCode: "R", noteCode: "024" });
    const inGroup = parseX12(CLEAN.replace(ST2, `NTE*ADD*TESTNOTE~${ST2}`));
    const derived = deriveTA1Spec(inGroup);
    expect(derived.spec).toMatchObject({ ackCode: "R", noteCode: "024" });
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_UNEXPECTED_SEGMENT]);
    // Interchange content, so the 999 for the group does not report it.
    const ack = derive999(inGroup);
    expect(ack.reported).toEqual([]);
    expect(ack.unreported).toEqual([]);
    expect(ack.spec.functionalGroup.disposition).toBe("A");
  });

  it("rejects with 024 for a segment with an empty first element outside every transaction set", () => {
    // Kept as an orphan and warned on, like any other unexpected segment, so
    // the TA1 reports it and the 999 for the group leaves it to the TA1.
    for (const input of [
      CLEAN.replace(GE, `${GE}*TESTDATA*MORE~`),
      CLEAN.replace(ST2, `*TESTDATA*MORE~${ST2}`),
    ]) {
      const ix = parseX12(input);
      expect(codes(ix.warnings)).toEqual([WARNING_CODES.X12_UNEXPECTED_SEGMENT]);
      const derived = deriveTA1Spec(ix);
      expect(derived.spec).toMatchObject({ ackCode: "R", noteCode: "024" });
      expect(derived.reported).toEqual(ix.warnings);
      expect(derived.unreported).toEqual([]);
      const ack = derive999(ix);
      expect(ack).toMatchObject({ reported: [], unreported: [] });
      expect(ack.spec.functionalGroup.disposition).toBe("A");
    }
  });

  it("does not report a dangling release character inside an unexpected segment again", () => {
    const ix = parseX12(CLEAN.replace(IEA, "NTE*ADD*TESTNOTE?"));
    expect(codes(ix.warnings)).toEqual([
      WARNING_CODES.X12_UNEXPECTED_SEGMENT,
      WARNING_CODES.X12_DANGLING_RELEASE_CHAR,
      WARNING_CODES.X12_MISSING_IEA,
    ]);
    const derived = deriveTA1Spec(ix);
    expect(derived.spec.noteCode).toBe("024");
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_UNEXPECTED_SEGMENT]);
    expect(codes(derived.unreported)).toEqual([
      WARNING_CODES.X12_DANGLING_RELEASE_CHAR,
      WARNING_CODES.X12_MISSING_IEA,
    ]);
  });

  it("ignores findings that sit on a group or a transaction set", () => {
    const derived = deriveTA1Spec(parseX12(CLEAN.replace(SE1, "SE*3*0009~")));
    expect(derived).toMatchObject({ reported: [], unreported: [] });
    expect(derived.spec.ackCode).toBe("A");
  });
});

describe("derive999Spec", () => {
  it("accepts every transaction set of a clean group, and the 999 builds and reads back", () => {
    const derived = derive999(parseX12(CLEAN));
    expect(derived).toEqual({
      spec: {
        envelope: ENVELOPE,
        functionalGroup: {
          functionalIdCode: "HC",
          groupControlNumber: "7",
          versionRelease: "005010X222A1",
          disposition: "A",
          numberOfTransactionSets: 2,
          numberOfReceivedTransactionSets: 2,
          numberOfAcceptedTransactionSets: 2,
          transactionResponses: ACCEPTED_RESPONSES,
        },
      },
      reported: [],
      unreported: [],
    });
    const ack = parse999(serializeX12(build999(derived.spec)));
    expect(ack?.ak9.disposition).toBe("A");
    expect(ack?.ak1.groupControlNumber).toBe("7");
    expect(ack?.transactionResponses.map((r) => r.ik5.disposition)).toEqual(["A", "A"]);
  });

  it("rejects a transaction set with no SE (IK5-02 2) and partially accepts the group", () => {
    const derived = derive999(parseX12(CLEAN.replace(SE2, "")));
    expect(derived.spec.functionalGroup).toMatchObject({
      disposition: "P",
      numberOfTransactionSets: 2,
      numberOfReceivedTransactionSets: 2,
      numberOfAcceptedTransactionSets: 1,
    });
    expect(derived.spec.functionalGroup.transactionResponses[1]).toEqual({
      transactionSetIdCode: "837",
      transactionSetControlNumber: "0002",
      implementationConventionReference: "005010X222A1",
      disposition: "R",
      syntaxErrorCodes: ["2"],
    });
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_MISSING_SE]);
    expect(() => build999(derived.spec)).not.toThrow();
  });

  it("rejects a transaction set whose SE-02 does not match ST-02 (IK5-02 3)", () => {
    const derived = derive999(parseX12(CLEAN.replace(SE1, "SE*3*0009~")));
    expect(derived.spec.functionalGroup.transactionResponses[0]).toMatchObject({
      disposition: "R",
      syntaxErrorCodes: ["3"],
    });
    expect(derived.spec.functionalGroup.disposition).toBe("P");
  });

  it("rejects the group when every transaction set is rejected", () => {
    const one = [ISA, GS, ST1, BHT1, "SE*3*0009~", "GE*1*7~", IEA].join("");
    const derived = derive999(parseX12(one));
    expect(derived.spec.functionalGroup).toMatchObject({
      disposition: "R",
      numberOfTransactionSets: 1,
      numberOfReceivedTransactionSets: 1,
      numberOfAcceptedTransactionSets: 0,
    });
    expect(derived.spec.functionalGroup.syntaxErrorCodes).toBeUndefined();
  });

  it("rejects the group with AK9-05 4 when GE-02 does not match GS-06", () => {
    const derived = derive999(parseX12(CLEAN.replace(GE, "GE*2*8~")));
    expect(derived.spec.functionalGroup).toMatchObject({
      disposition: "R",
      syntaxErrorCodes: ["4"],
      numberOfAcceptedTransactionSets: 2,
      transactionResponses: ACCEPTED_RESPONSES,
    });
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_CONTROL_NUMBER_MISMATCH]);
    expect(() => build999(derived.spec)).not.toThrow();
  });

  it("rejects the group with AK9-05 5 when GE-01 miscounts, and AK9-02 never falls below AK9-03", () => {
    const fewer = derive999(parseX12(CLEAN.replace(GE, "GE*1*7~")));
    expect(fewer.spec.functionalGroup).toMatchObject({
      disposition: "R",
      syntaxErrorCodes: ["5"],
      numberOfTransactionSets: 2,
    });
    expect(() => build999(fewer.spec)).not.toThrow();
    const more = derive999(parseX12(CLEAN.replace(GE, "GE*10*7~")));
    expect(more.spec.functionalGroup.numberOfTransactionSets).toBe(10);
    expect(more.spec.functionalGroup.numberOfReceivedTransactionSets).toBe(2);
    expect(derive999(parseX12(CLEAN.replace(GE, "GE*3*7~"))).spec.functionalGroup).toMatchObject({
      numberOfTransactionSets: 3,
    });
  });

  it("counts AK9-02 as AK9-03 when GE-01 is not a whole number it can write", () => {
    for (const ge01 of [" 3", "3 ", "", "99999999999999999999"]) {
      const derived = derive999(parseX12(CLEAN.replace(GE, `GE*${ge01}*7~`)));
      expect(derived.spec.functionalGroup.numberOfTransactionSets).toBe(2);
    }
  });

  it("rejects the group with AK9-05 3 when it has no GE", () => {
    const ix = parseX12(CLEAN.replace(GE, ""));
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup).toMatchObject({
      disposition: "R",
      syntaxErrorCodes: ["3"],
      numberOfTransactionSets: 2,
    });
    expect(codes(derived.reported)).toEqual([WARNING_CODES.X12_MISSING_GE]);
  });

  it("accepts a group that holds no transaction set", () => {
    const empty = [ISA, GS, "GE*0*7~", IEA].join("");
    expect(derive999(parseX12(empty)).spec.functionalGroup).toEqual({
      functionalIdCode: "HC",
      groupControlNumber: "7",
      versionRelease: "005010X222A1",
      disposition: "A",
      numberOfTransactionSets: 0,
      numberOfReceivedTransactionSets: 0,
      numberOfAcceptedTransactionSets: 0,
      transactionResponses: [],
    });
  });

  it("writes an IK3 and IK4 for a dangling release character, at the segment's position from the ST", () => {
    const ix = parseX12([ISA, GS, ST1, "BHT*0019*00*TESTREF1?"].join(""));
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup.transactionResponses).toEqual([
      {
        transactionSetIdCode: "837",
        transactionSetControlNumber: "0001",
        implementationConventionReference: "005010X222A1",
        disposition: "R",
        syntaxErrorCodes: ["2", "5"],
        segmentErrors: [
          {
            segmentIdCode: "BHT",
            segmentPositionInTransactionSet: 2,
            syntaxErrorCode: "8",
            elementErrors: [{ position: { element: 3 }, syntaxErrorCode: "6" }],
          },
        ],
      },
    ]);
    expect(codes(derived.reported)).toEqual([
      WARNING_CODES.X12_DANGLING_RELEASE_CHAR,
      WARNING_CODES.X12_MISSING_SE,
      WARNING_CODES.X12_MISSING_GE,
    ]);
    const ack = parse999(serializeX12(build999(derived.spec)));
    const note = ack?.transactionResponses[0]?.segmentNotes[0];
    expect(note?.ik3).toMatchObject({
      segmentIdCode: "BHT",
      segmentPositionInTransactionSet: 2,
      syntaxErrorCode: "8",
    });
    expect(note?.elementNotes[0]?.ik4).toMatchObject({
      position: { element: 3 },
      syntaxErrorCode: "6",
      copyOfBadDataElement: undefined,
    });
  });

  it("echoes an ST-02 that ends the input in a release character as it reads", () => {
    const ix = parseX12([ISA, GS, "ST*837*0001?"].join(""));
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup.transactionResponses).toEqual([
      {
        transactionSetIdCode: "837",
        transactionSetControlNumber: "0001?",
        disposition: "R",
        syntaxErrorCodes: ["2", "5"],
        segmentErrors: [
          {
            segmentIdCode: "ST",
            segmentPositionInTransactionSet: 1,
            syntaxErrorCode: "8",
            elementErrors: [{ position: { element: 2 }, syntaxErrorCode: "6" }],
          },
        ],
      },
    ]);
  });

  it("echoes control numbers without their release characters", () => {
    const released = CLEAN.replace(ST1, "ST*837*00?*1*005010X222A1~").replace(SE1, "SE*3*00?*1~");
    const derived = derive999(parseX12(released));
    expect(derived.spec.functionalGroup.transactionResponses[0]).toMatchObject({
      transactionSetControlNumber: "00*1",
      disposition: "A",
    });
    const ack = parse999(serializeX12(build999(derived.spec)));
    expect(ack?.transactionResponses[0]?.ak2.transactionSetControlNumber).toBe("00*1");
  });

  it("leaves AK2-03 out when the ST carries no ST-03", () => {
    const bare = CLEAN.replace(ST1, "ST*837*0001~");
    const response = derive999(parseX12(bare)).spec.functionalGroup.transactionResponses[0];
    expect(response).toEqual({
      transactionSetIdCode: "837",
      transactionSetControlNumber: "0001",
      disposition: "A",
    });
  });

  it("writes an IK3 2 for a TA1 inside a transaction set, and counts it in later positions", () => {
    const ta1 = "TA1*000000009*260601*1200*A*000~";
    const ix = parseX12(
      CLEAN.replace(BHT1, `${ta1}${BHT1}BIN*X*TESTDATA~`).replace(SE1, "SE*4*0001~"),
    );
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup.transactionResponses[0]).toEqual({
      transactionSetIdCode: "837",
      transactionSetControlNumber: "0001",
      implementationConventionReference: "005010X222A1",
      disposition: "R",
      syntaxErrorCodes: ["5"],
      segmentErrors: [
        { segmentIdCode: "TA1", segmentPositionInTransactionSet: 2, syntaxErrorCode: "2" },
        { segmentIdCode: "BIN", segmentPositionInTransactionSet: 4, syntaxErrorCode: "8" },
      ],
    });
    expect(codes(derived.reported)).toEqual([
      WARNING_CODES.X12_UNEXPECTED_SEGMENT,
      WARNING_CODES.X12_BINARY_LENGTH_INVALID,
    ]);
    // Inside a transaction set, so the TA1 does not report it.
    expect(deriveTA1Spec(ix)).toMatchObject({ reported: [], unreported: [] });
  });

  it("counts only the TA1s lifted out of the same transaction set", () => {
    const ta1 = "TA1*000000009*260601*1200*A*000~";
    // A TA1 lifted out of the first set, an orphan between the sets, and a finding in the second.
    const ix = parseX12(
      CLEAN.replace(BHT1, `${ta1}${BHT1}`)
        .replace(SE1, "SE*4*0001~")
        .replace(ST2, `NTE*ADD*TESTNOTE~${ST2}`)
        .replace(BHT2, `${BHT2}BIN*X*TESTDATA~`)
        .replace(SE2, "SE*4*0002~"),
    );
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup.transactionResponses[1]?.segmentErrors).toEqual([
      { segmentIdCode: "BIN", segmentPositionInTransactionSet: 3, syntaxErrorCode: "8" },
    ]);
    // Each unexpected segment is placed by its own orphan: the TA1 in the set, the NTE outside.
    expect(codes(derived.reported)).toEqual([
      WARNING_CODES.X12_UNEXPECTED_SEGMENT,
      WARNING_CODES.X12_BINARY_LENGTH_INVALID,
    ]);
    expect(derived.reported[0]?.position.segmentIndex).toBe(3);
    const ta1Ack = deriveTA1Spec(ix);
    expect(ta1Ack.spec.noteCode).toBe("024");
    expect(ta1Ack.reported.map((w) => w.position.segmentIndex)).toEqual([6]);
  });

  it("counts only the TA1s lifted out of the set before the finding", () => {
    const ta1 = "TA1*000000009*260601*1200*A*000~";
    const ix = parseX12(
      CLEAN.replace(BHT1, `${BHT1}BIN*X*TESTDATA~${ta1}`).replace(SE1, "SE*4*0001~"),
    );
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup.transactionResponses[0]?.segmentErrors).toEqual([
      { segmentIdCode: "BIN", segmentPositionInTransactionSet: 3, syntaxErrorCode: "8" },
      { segmentIdCode: "TA1", segmentPositionInTransactionSet: 4, syntaxErrorCode: "2" },
    ]);
  });

  it("counts only the TA1s lifted out of a set of the same group", () => {
    const ta1 = "TA1*000000009*260601*1200*A*000~";
    const gs2 = "GS*HC*SUBMITTER*RECEIVER*20260601*1200*8*X*005010X222A1~";
    const ix = parseX12(
      [
        ISA,
        GS,
        ST1,
        ta1,
        BHT1,
        "SE*4*0001~",
        "GE*1*7~",
        gs2,
        ST2,
        BHT2,
        "BIN*X*TESTDATA~",
        "SE*4*0002~",
        "GE*1*8~",
        "IEA*2*000000001~",
      ].join(""),
    );
    const second = derive999(ix, 1);
    expect(second.spec.functionalGroup.groupControlNumber).toBe("8");
    expect(second.spec.functionalGroup.transactionResponses[0]?.segmentErrors).toEqual([
      { segmentIdCode: "BIN", segmentPositionInTransactionSet: 3, syntaxErrorCode: "8" },
    ]);
    expect(codes(second.reported)).toEqual([WARNING_CODES.X12_BINARY_LENGTH_INVALID]);
    const first = derive999(ix, 0);
    expect(first.spec.functionalGroup.groupControlNumber).toBe("7");
    expect(codes(first.reported)).toEqual([WARNING_CODES.X12_UNEXPECTED_SEGMENT]);
  });

  it("leaves an interchange finding to the TA1 when the interchange holds several groups", () => {
    const gs2 = "GS*HC*SUBMITTER*RECEIVER*20260601*1200*8*X*005010X222A1~";
    const ix = parseX12(
      [ISA, GS, ST1, BHT1, SE1, "GE*1*7~", gs2, ST2, BHT2, SE2, "GE*1*8~", "IEA*2*000000009~"].join(
        "",
      ),
    );
    expect(deriveTA1Spec(ix).spec.noteCode).toBe("001");
    for (const groupIndex of [0, 1]) {
      expect(derive999(ix, groupIndex)).toMatchObject({ reported: [], unreported: [] });
    }
  });

  it("writes IK4 4 for binary data the input ran out before, and no IK4 for a length that does not frame", () => {
    const truncated = derive999(parseX12([ISA, GS, ST1, "BIN*20*TESTDATA"].join("")));
    expect(truncated.spec.functionalGroup.transactionResponses[0]?.segmentErrors).toEqual([
      {
        segmentIdCode: "BIN",
        segmentPositionInTransactionSet: 2,
        syntaxErrorCode: "8",
        elementErrors: [{ position: { element: 2 }, syntaxErrorCode: "4" }],
      },
    ]);
    const mismatch = derive999(
      parseX12(CLEAN.replace(BHT1, `${BHT1}BIN*2*TESTDATA~`).replace(SE1, "SE*4*0001~")),
    );
    expect(mismatch.spec.functionalGroup.transactionResponses[0]?.segmentErrors).toEqual([
      { segmentIdCode: "BIN", segmentPositionInTransactionSet: 3, syntaxErrorCode: "8" },
    ]);
    expect(codes(mismatch.reported)).toEqual([WARNING_CODES.X12_BINARY_LENGTH_MISMATCH]);
  });

  it("accepts a set whose only finding maps to nothing, returning it as unreported", () => {
    const ix = parseX12(CLEAN.replace(BHT1, `${BHT1}BIN*3*AĀB~`).replace(SE1, "SE*4*0001~"));
    expect(codes(ix.warnings)).toEqual([WARNING_CODES.X12_BINARY_LENGTH_UNVERIFIABLE]);
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup.disposition).toBe("A");
    expect(derived.reported).toEqual([]);
    expect(codes(derived.unreported)).toEqual([WARNING_CODES.X12_BINARY_LENGTH_UNVERIFIABLE]);
  });

  it("rejects without an IK3 a set whose segment finding cannot be located", () => {
    const ix = parseX12([ISA, GS, ST1, "BHT*0019*00*TESTREF1?"].join(""));
    const group = ix.groups[0];
    if (group === undefined) throw new Error("no group");
    // A copy of the set carries no recorded position.
    const copied: X12Interchange = {
      ...ix,
      groups: [{ ...group, transactions: group.transactions.map((tx) => ({ ...tx })) }],
    };
    const derived = derive999(copied);
    expect(derived.spec.functionalGroup.transactionResponses[0]).toMatchObject({
      disposition: "R",
      syntaxErrorCodes: ["2", "5"],
    });
    expect(derived.spec.functionalGroup.transactionResponses[0]?.segmentErrors).toBeUndefined();
    expect(codes(derived.unreported)).toEqual([WARNING_CODES.X12_DANGLING_RELEASE_CHAR]);
  });

  it("rejects without an IK3 a copied set that holds a lifted TA1", () => {
    const ix = parseX12(
      CLEAN.replace(BHT1, `TA1*000000009*260601*1200*A*000~${BHT1}`).replace(SE1, "SE*4*0001~"),
    );
    const group = ix.groups[0];
    if (group === undefined) throw new Error("no group");
    const copied: X12Interchange = {
      ...ix,
      groups: [{ ...group, transactions: group.transactions.map((tx) => ({ ...tx })) }],
    };
    const derived = derive999(copied);
    expect(derived.spec.functionalGroup.transactionResponses[0]).toMatchObject({
      disposition: "R",
      syntaxErrorCodes: ["5"],
    });
    expect(derived.spec.functionalGroup.transactionResponses[0]?.segmentErrors).toBeUndefined();
    expect(codes(derived.unreported)).toEqual([WARNING_CODES.X12_UNEXPECTED_SEGMENT]);
  });

  it("rejects without an IK3 a set whose finding sits on a segment with no segment id", () => {
    const ix = parseX12(CLEAN.replace(IEA, "").replace(GE, "").replace(SE2, "1X*TESTDATA?"));
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup.transactionResponses[1]).toMatchObject({
      disposition: "R",
      syntaxErrorCodes: ["2", "5"],
    });
    expect(derived.spec.functionalGroup.transactionResponses[1]?.segmentErrors).toBeUndefined();
    expect(codes(derived.unreported)).toEqual([WARNING_CODES.X12_DANGLING_RELEASE_CHAR]);
  });

  it("refuses a group index that names no functional group", () => {
    const ix = parseX12(CLEAN);
    let caught: unknown;
    try {
      derive999(ix, 1);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(AckBuildError);
    expect((caught as AckBuildError).code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC);
    expect((caught as AckBuildError).message).toBe(
      "derive999Spec: groupIndex 1 names no functional group; the interchange has 1.",
    );
  });

  it("leaves an empty GS-06 for build999 to refuse rather than invent one", () => {
    const ix = parseX12(CLEAN.replace("*1200*7*X*", "*1200**X*").replace(GE, "GE*2*~"));
    const derived = derive999(ix);
    expect(derived.spec.functionalGroup.groupControlNumber).toBe("");
    expect(() => build999(derived.spec)).toThrow(AckBuildError);
  });
});

describe("a hand-made interchange", () => {
  const base = parseX12(CLEAN);

  function withWarnings(warnings: readonly X12ParseWarning[]): X12Interchange {
    return { ...base, warnings };
  }

  it("places a warning naming no group on the interchange", () => {
    const stray: X12ParseWarning = {
      code: WARNING_CODES.X12_MISSING_GE,
      message: "synthetic",
      position: { segmentIndex: 1, groupIndex: 9 },
    };
    const ix = withWarnings([stray]);
    expect(deriveTA1Spec(ix)).toMatchObject({ reported: [], unreported: [stray] });
    expect(derive999(ix)).toMatchObject({ reported: [], unreported: [] });
  });

  it("places a warning naming no transaction set on its group", () => {
    const stray: X12ParseWarning = {
      code: WARNING_CODES.X12_MISSING_SE,
      message: "synthetic",
      position: { segmentIndex: 2, groupIndex: 0, transactionIndex: 9 },
    };
    const ix = withWarnings([stray]);
    expect(derive999(ix)).toMatchObject({ reported: [], unreported: [stray] });
    expect(deriveTA1Spec(ix)).toMatchObject({ reported: [], unreported: [] });
  });

  it("writes a code once however many warnings carry it", () => {
    const missing: X12ParseWarning = {
      code: WARNING_CODES.X12_MISSING_GE,
      message: "synthetic",
      position: { segmentIndex: 1, groupIndex: 0 },
    };
    const derived = derive999(withWarnings([missing, missing]));
    expect(derived.spec.functionalGroup.syntaxErrorCodes).toEqual(["3"]);
    expect(derived.reported).toEqual([missing, missing]);
  });

  it("writes no IK4 for a finding that names no element", () => {
    const dangling: X12ParseWarning = {
      code: WARNING_CODES.X12_DANGLING_RELEASE_CHAR,
      message: "synthetic",
      position: { segmentIndex: 3, groupIndex: 0, transactionIndex: 0 },
    };
    const derived = derive999(withWarnings([dangling]));
    expect(derived.spec.functionalGroup.transactionResponses[0]?.segmentErrors).toEqual([
      { segmentIdCode: "BHT", segmentPositionInTransactionSet: 2, syntaxErrorCode: "8" },
    ]);
  });

  it("returns as unreported a finding past the end of its transaction set", () => {
    const dangling: X12ParseWarning = {
      code: WARNING_CODES.X12_DANGLING_RELEASE_CHAR,
      message: "synthetic",
      position: { segmentIndex: 99, groupIndex: 0, transactionIndex: 1, elementIndex: 1 },
    };
    const derived = derive999(withWarnings([dangling]));
    expect(derived.unreported).toEqual([dangling]);
    expect(derived.spec.functionalGroup.transactionResponses[1]).toMatchObject({
      disposition: "R",
      syntaxErrorCodes: ["5"],
    });
  });

  it("places an unexpected segment with no orphan on the interchange", () => {
    const stray: X12ParseWarning = {
      code: WARNING_CODES.X12_UNEXPECTED_SEGMENT,
      message: "synthetic",
      position: { segmentIndex: 3, groupIndex: 0, transactionIndex: 0 },
    };
    const derived = deriveTA1Spec(withWarnings([stray]));
    expect(derived.spec.noteCode).toBe("024");
    expect(derived.reported).toEqual([stray]);
  });

  it("places an unexpected segment anchored in a missing transaction set on its group", () => {
    const stray: X12ParseWarning = {
      code: WARNING_CODES.X12_UNEXPECTED_SEGMENT,
      message: "synthetic",
      position: { segmentIndex: 3 },
    };
    const orphanAt = parseX12(CLEAN.replace(BHT1, `TA1*000000009*260601*1200*A*000~${BHT1}`));
    const orphan = orphanAt.orphanSegments[0];
    if (orphan === undefined) throw new Error("no orphan");
    const ix: X12Interchange = {
      ...base,
      warnings: [stray],
      orphanSegments: [
        {
          ...orphan,
          anchor: { kind: "transaction", groupIndex: 0, transactionIndex: 9, segmentOffset: 1 },
        },
      ],
    };
    expect(derive999(ix)).toMatchObject({ reported: [], unreported: [stray] });
    expect(deriveTA1Spec(ix)).toMatchObject({ reported: [], unreported: [] });
  });
});

/**
 * The 997 Functional Acknowledgment: `parse997` and `build997`.
 *
 * The reader fills nothing in. An absent AK1, AK5 or AK9 reads as `undefined`,
 * a disposition outside its code list reads as an `undefined` disposition
 * beside the code as sent, and a segment the 997 does not allow where it
 * stands is left unread; each warns. The builder writes the base standard
 * (GS-08 `005010`, no ST-03) through the 999's own segment code and refuses
 * what it cannot write exactly. Every interchange is synthetic.
 */

import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  ALL_WARNING_MESSAGES,
  AckBuildError,
  X12_997_SET_DISPOSITION_CODES,
  ack997Ak1Absent,
  ack997Ak5Absent,
  ack997Ak5DispositionUnknown,
  ack997Ak9Absent,
  ack997Ak9DispositionUnknown,
  ack997SegmentNotDefined,
  ack997SegmentOutOfPlace,
  build997,
  build999,
  parse997,
  parse999,
  parseX12,
  serializeX12,
  type Build997Spec,
  type Build999Spec,
  type X12ParseWarning,
} from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "ack");

/** A fixture as one line of text, the way a builder writes it. */
function fixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8").replace(/\n/gu, "");
}

const ISA =
  "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1230*^*00501*000000030*0*P*:~";

/** A 997 whose body is `body`, with SE-01 counted. */
function ack997(body: readonly string[], gs08 = "005010"): string {
  return (
    ISA +
    `GS*FA*RECEIVER*SENDER*20250101*1230*30*X*${gs08}~ST*997*0030~` +
    body.map((s) => `${s}~`).join("") +
    `SE*${String(body.length + 2)}*0030~GE*1*30~IEA*1*000000030~`
  );
}

/** Read a 997 that must be there. */
function read(raw: string | Buffer): NonNullable<ReturnType<typeof parse997>> {
  const ack = parse997(raw);
  if (ack === undefined) throw new Error("no 997 read");
  return ack;
}

/** Each warning as `code@segmentIndex`. */
function codes(warnings: readonly X12ParseWarning[]): string[] {
  return warnings.map((w) => `${w.code}@${String(w.position.segmentIndex)}`);
}

const ENVELOPE: Build997Spec["envelope"] = {
  senderId: "RECEIVER",
  receiverId: "SENDER",
  interchangeDate: "250101",
  interchangeTime: "1230",
  interchangeControlNumber: "000000021",
  groupControlNumber: "21",
  transactionSetControlNumber: "0021",
};

const ACCEPT: Build997Spec = {
  envelope: ENVELOPE,
  functionalGroup: {
    functionalIdCode: "HC",
    groupControlNumber: "3",
    versionRelease: "005010X222A2",
    disposition: "A",
    numberOfTransactionSets: 1,
    numberOfReceivedTransactionSets: 1,
    numberOfAcceptedTransactionSets: 1,
    transactionResponses: [
      { transactionSetIdCode: "837", transactionSetControlNumber: "0003", disposition: "A" },
    ],
  },
};

const PARTIAL: Build997Spec = {
  envelope: {
    ...ENVELOPE,
    interchangeControlNumber: "000000022",
    groupControlNumber: "22",
    transactionSetControlNumber: "0022",
  },
  functionalGroup: {
    functionalIdCode: "HC",
    groupControlNumber: "4",
    versionRelease: "005010X222A2",
    disposition: "P",
    numberOfTransactionSets: 2,
    numberOfReceivedTransactionSets: 2,
    numberOfAcceptedTransactionSets: 1,
    transactionResponses: [
      { transactionSetIdCode: "837", transactionSetControlNumber: "0004", disposition: "A" },
      {
        transactionSetIdCode: "837",
        transactionSetControlNumber: "0005",
        disposition: "R",
        syntaxErrorCodes: ["5"],
        segmentErrors: [
          {
            segmentIdCode: "NM1",
            segmentPositionInTransactionSet: 8,
            loopIdentifier: "2010BA",
            syntaxErrorCode: "8",
            elementErrors: [
              { position: { element: 3 }, dataElementReferenceNumber: "66", syntaxErrorCode: "7" },
            ],
          },
        ],
      },
    ],
  },
};

const REJECT: Build997Spec = {
  envelope: {
    ...ENVELOPE,
    interchangeControlNumber: "000000023",
    groupControlNumber: "23",
    transactionSetControlNumber: "0023",
  },
  functionalGroup: {
    functionalIdCode: "HP",
    groupControlNumber: "5",
    disposition: "R",
    numberOfTransactionSets: 1,
    numberOfReceivedTransactionSets: 1,
    numberOfAcceptedTransactionSets: 0,
    transactionResponses: [
      {
        transactionSetIdCode: "835",
        transactionSetControlNumber: "0006",
        disposition: "R",
        syntaxErrorCodes: ["5"],
        segmentErrors: [
          {
            segmentIdCode: "CLP",
            segmentPositionInTransactionSet: 12,
            syntaxErrorCode: "8",
            elementErrors: [
              {
                position: { element: 2, component: 1 },
                dataElementReferenceNumber: "127",
                syntaxErrorCode: "1",
              },
            ],
          },
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// parse997: the fixtures.
// ---------------------------------------------------------------------------

describe("parse997: the fixtures", () => {
  it("reads a clean accept with no warning", () => {
    const ack = read(fixture("997-accept.edi"));
    expect(ack.interchange.warnings).toEqual([]);
    expect(ack.warnings).toEqual([]);
    expect(ack.ak1).toEqual({
      functionalIdCode: "HC",
      groupControlNumber: "3",
      versionRelease: "005010X222A2",
    });
    expect(ack.transactionResponses).toEqual([
      {
        ak2: {
          transactionSetIdCode: "837",
          transactionSetControlNumber: "0003",
          implementationConventionReference: undefined,
        },
        segmentNotes: [],
        ak5: { disposition: "A", dispositionRaw: "A", syntaxErrorCodes: [] },
      },
    ]);
    expect(ack.ak9).toEqual({
      disposition: "A",
      dispositionRaw: "A",
      numberOfTransactionSets: 1,
      numberOfReceivedTransactionSets: 1,
      numberOfAcceptedTransactionSets: 1,
      syntaxErrorCodes: [],
    });
  });

  it("reads a partial accept with an AK3 and its AK4", () => {
    const ack = read(fixture("997-partial-with-errors.edi"));
    expect(ack.warnings).toEqual([]);
    expect(ack.transactionResponses).toHaveLength(2);
    expect(ack.transactionResponses[0]?.ak5?.disposition).toBe("A");
    const rejected = ack.transactionResponses[1];
    expect(rejected?.ak2.transactionSetControlNumber).toBe("0005");
    expect(rejected?.ak5).toEqual({
      disposition: "R",
      dispositionRaw: "R",
      syntaxErrorCodes: ["5"],
    });
    expect(rejected?.segmentNotes).toEqual([
      {
        ak3: {
          segmentIdCode: "NM1",
          segmentPositionInTransactionSet: 8,
          loopIdentifier: "2010BA",
          syntaxErrorCode: "8",
        },
        elementNotes: [
          {
            position: { element: 3, component: undefined, repetition: undefined },
            dataElementReferenceNumber: "66",
            syntaxErrorCode: "7",
            copyOfBadDataElement: undefined,
          },
        ],
      },
    ]);
    expect(ack.ak9?.disposition).toBe("P");
    expect(ack.ak9?.numberOfAcceptedTransactionSets).toBe(1);
  });

  it("reads a reject with no AK1-03 and a component position", () => {
    const ack = read(fixture("997-reject.edi"));
    expect(ack.warnings).toEqual([]);
    expect(ack.ak1).toEqual({
      functionalIdCode: "HP",
      groupControlNumber: "5",
      versionRelease: undefined,
    });
    const note = ack.transactionResponses[0]?.segmentNotes[0];
    expect(note?.ak3.loopIdentifier).toBeUndefined();
    expect(note?.ak3.syntaxErrorCode).toBe("8");
    expect(note?.elementNotes[0]?.position).toEqual({
      element: 2,
      component: 1,
      repetition: undefined,
    });
    expect(ack.ak9).toEqual({
      disposition: "R",
      dispositionRaw: "R",
      numberOfTransactionSets: 1,
      numberOfReceivedTransactionSets: 1,
      numberOfAcceptedTransactionSets: 0,
      syntaxErrorCodes: [],
    });
  });

  it("is not a 999: parse999 finds none in a 997, and parse997 none in a 999", () => {
    expect(parse999(fixture("997-accept.edi"))).toBeUndefined();
    expect(parse997(fixture("999-accept.edi"))).toBeUndefined();
  });

  it("freezes the reading at every level", () => {
    const ack = read(fixture("997-partial-with-errors.edi"));
    expect(Object.isFrozen(ack)).toBe(true);
    expect(Object.isFrozen(ack.warnings)).toBe(true);
    expect(Object.isFrozen(ack.ak1)).toBe(true);
    expect(Object.isFrozen(ack.ak9)).toBe(true);
    expect(Object.isFrozen(ack.transactionResponses)).toBe(true);
    const response = ack.transactionResponses[1];
    expect(Object.isFrozen(response)).toBe(true);
    expect(Object.isFrozen(response?.ak2)).toBe(true);
    expect(Object.isFrozen(response?.ak5)).toBe(true);
    expect(Object.isFrozen(response?.ak5?.syntaxErrorCodes)).toBe(true);
    expect(Object.isFrozen(response?.segmentNotes)).toBe(true);
    const note = response?.segmentNotes[0];
    expect(Object.isFrozen(note)).toBe(true);
    expect(Object.isFrozen(note?.ak3)).toBe(true);
    expect(Object.isFrozen(note?.elementNotes)).toBe(true);
    expect(Object.isFrozen(note?.elementNotes[0])).toBe(true);
    expect(Object.isFrozen(note?.elementNotes[0]?.position)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parse997: finding the 997.
// ---------------------------------------------------------------------------

describe("parse997: finding the transaction set", () => {
  it("returns undefined for an interchange with no 997", () => {
    expect(parse997(fixture("999-reject-control-number-mismatch.edi"))).toBeUndefined();
  });

  it("reads the first 997 of a later group, from a Buffer too", () => {
    const first = `GS*HC*A*B*20250101*1230*1*X*005010X222A2~ST*837*0001~SE*2*0001~GE*1*1~`;
    const second = `GS*FA*A*B*20250101*1230*2*X*005010~ST*997*0002~AK1*HC*1~AK2*837*0001~AK5*E~AK9*E*1*1*1~SE*6*0002~GE*1*2~`;
    const raw = `${ISA}${first}${second}IEA*2*000000030~`;
    for (const input of [raw, Buffer.from(raw, "utf8")]) {
      const ack = read(input);
      expect(ack.ak1?.groupControlNumber).toBe("1");
      expect(ack.transactionResponses[0]?.ak5?.disposition).toBe("E");
      expect(ack.warnings).toEqual([]);
    }
  });

  it("checks no declared guide: any GS-08 reads with no guide warning", () => {
    for (const gs08 of ["005010", "004010", ""]) {
      const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", "AK5*A", "AK9*A*1*1*1"], gs08));
      expect(ack.warnings).toEqual([]);
    }
  });

  it("passes parse options through to parseX12", () => {
    const raw = ack997(["AK1*HC*1", "AK2*837*0001", "AK5*A", "AK9*A*1*1*1"]);
    const seen: string[] = [];
    const ack = parse997(`${raw}JUNK`, { onWarning: (w) => seen.push(w.code) });
    const envelope = ack?.interchange.warnings.map((w) => w.code) ?? [];
    expect(envelope.length).toBeGreaterThan(0);
    expect(seen).toEqual(envelope);
    expect(ack?.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parse997: nothing filled in.
// ---------------------------------------------------------------------------

describe("parse997: an absent segment stays absent and warns", () => {
  it("an absent AK1 reads undefined and warns at the ST", () => {
    const ack = read(ack997(["AK2*837*0001", "AK5*A", "AK9*A*1*1*1"]));
    expect(ack.ak1).toBeUndefined();
    expect(codes(ack.warnings)).toEqual(["X12_997_AK1_ABSENT@0"]);
    expect(ack.warnings[0]).toEqual(ack997Ak1Absent({ segmentIndex: 0, transactionIndex: 0 }));
  });

  it("an absent AK9 reads undefined and warns at the ST, after an absent AK1", () => {
    const ack = read(ack997(["AK2*837*0001", "AK5*A"]));
    expect(ack.ak9).toBeUndefined();
    expect(codes(ack.warnings)).toEqual(["X12_997_AK1_ABSENT@0", "X12_997_AK9_ABSENT@0"]);
    expect(ack.warnings[1]).toEqual(ack997Ak9Absent({ segmentIndex: 0, transactionIndex: 0 }));
  });

  it("an AK2 closed by the next AK2 has no AK5 and warns at that AK2", () => {
    const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", "AK2*837*0002", "AK5*A", "AK9*R*2*2*1"]));
    expect(ack.transactionResponses.map((r) => r.ak5?.disposition)).toEqual([undefined, "A"]);
    expect(codes(ack.warnings)).toEqual(["X12_997_AK5_ABSENT@2"]);
    expect(ack.warnings[0]).toEqual(ack997Ak5Absent({ segmentIndex: 2, transactionIndex: 0 }));
  });

  it("an AK2 closed by the AK9 has no AK5 and keeps its AK3", () => {
    const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", "AK3*NM1*4", "AK9*R*1*1*0"]));
    expect(ack.transactionResponses[0]?.ak5).toBeUndefined();
    expect(ack.transactionResponses[0]?.segmentNotes[0]?.ak3.segmentIdCode).toBe("NM1");
    expect(codes(ack.warnings)).toEqual(["X12_997_AK5_ABSENT@2"]);
  });

  it("an AK2 closed by the end of the set has no AK5", () => {
    const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", "AK3*NM1*4", "AK4*1**1"]));
    expect(ack.transactionResponses).toHaveLength(1);
    expect(ack.transactionResponses[0]?.segmentNotes[0]?.elementNotes).toHaveLength(1);
    expect(codes(ack.warnings)).toEqual(["X12_997_AK5_ABSENT@2", "X12_997_AK9_ABSENT@0"]);
  });

  it("a 997 truncated before its SE still reads every body segment", () => {
    const raw = `${ISA}GS*FA*A*B*20250101*1230*1*X*005010~ST*997*0001~AK1*HC*1~AK2*837*0001~AK5*A~AK9*A*1*1*1~`;
    const ack = read(raw);
    expect(ack.ak9?.disposition).toBe("A");
    expect(ack.transactionResponses[0]?.ak5?.disposition).toBe("A");
    expect(ack.warnings).toEqual([]);
  });
});

describe("parse997: a disposition outside its code list is carried verbatim and warns", () => {
  it("reads every code of list 717 at AK5-01, and nothing else", () => {
    for (const code of Object.values(X12_997_SET_DISPOSITION_CODES)) {
      const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", `AK5*${code}`, "AK9*R*1*1*0"]));
      expect(ack.transactionResponses[0]?.ak5?.disposition).toBe(code);
      expect(ack.warnings).toEqual([]);
    }
    expect(Object.keys(X12_997_SET_DISPOSITION_CODES)).toEqual(["A", "E", "M", "R", "W", "X"]);
  });

  it("reads every code of list 715 at AK9-01", () => {
    for (const code of ["A", "E", "P", "R", "M", "W", "X"]) {
      const ack = read(ack997(["AK1*HC*1", `AK9*${code}*0*0*0`]));
      expect(ack.ak9?.disposition).toBe(code);
      expect(ack.warnings).toEqual([]);
    }
  });

  for (const [label, sent] of [
    ["P, which list 717 does not have", "P"],
    ["an unknown code", "Q"],
    ["a lower-case code", "a"],
    ["an Object.prototype name", "constructor"],
    ["an empty element", ""],
  ] as const) {
    it(`AK5-01 ${label}: undefined beside the code as sent`, () => {
      const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", `AK5*${sent}*5`, "AK9*R*1*1*0"]));
      expect(ack.transactionResponses[0]?.ak5).toEqual({
        disposition: undefined,
        dispositionRaw: sent,
        syntaxErrorCodes: ["5"],
      });
      expect(ack.warnings).toEqual([
        ack997Ak5DispositionUnknown({ segmentIndex: 3, transactionIndex: 0, elementIndex: 1 }),
      ]);
    });
  }

  it("an AK5 with no elements reads an empty code and warns", () => {
    const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", "AK5", "AK9*R*1*1*0"]));
    expect(ack.transactionResponses[0]?.ak5?.dispositionRaw).toBe("");
    expect(codes(ack.warnings)).toEqual(["X12_997_AK5_DISPOSITION_UNKNOWN@3"]);
  });

  for (const [label, sent] of [
    ["an unknown code", "Z"],
    ["an Object.prototype name", "toString"],
    ["an empty element", ""],
  ] as const) {
    it(`AK9-01 ${label}: undefined beside the code as sent, counts read`, () => {
      const ack = read(ack997(["AK1*HC*1", `AK9*${sent}*3*2*1*4`]));
      expect(ack.ak9).toEqual({
        disposition: undefined,
        dispositionRaw: sent,
        numberOfTransactionSets: 3,
        numberOfReceivedTransactionSets: 2,
        numberOfAcceptedTransactionSets: 1,
        syntaxErrorCodes: ["4"],
      });
      expect(ack.warnings).toEqual([
        ack997Ak9DispositionUnknown({ segmentIndex: 2, transactionIndex: 0, elementIndex: 1 }),
      ]);
    });
  }

  it("resolves a release escape in the code as sent", () => {
    const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", "AK5*Q?*R", "AK9*R*1*1*0"]));
    expect(ack.transactionResponses[0]?.ak5?.dispositionRaw).toBe("Q*R");
    expect(ack.transactionResponses[0]?.ak5?.disposition).toBeUndefined();
  });

  it("carries AK3-04 and AK4-03 codes verbatim, known or not", () => {
    const ack = read(
      ack997([
        "AK1*HC*1",
        "AK2*837*0001",
        "AK3*NM1*4*2000A*Z9",
        "AK4*1*66*Q7*BAD",
        "AK5*R",
        "AK9*R*1*1*0",
      ]),
    );
    const note = ack.transactionResponses[0]?.segmentNotes[0];
    expect(note?.ak3.syntaxErrorCode).toBe("Z9");
    expect(note?.elementNotes[0]?.syntaxErrorCode).toBe("Q7");
    expect(note?.elementNotes[0]?.copyOfBadDataElement).toBe("BAD");
    expect(ack.warnings).toEqual([]);
  });

  it("keeps an AK4 with no AK4-03, its code undefined", () => {
    const ack = read(
      ack997(["AK1*HC*1", "AK2*837*0001", "AK3*NM1*4", "AK4*2:3:4", "AK5*R", "AK9*R*1*1*0"]),
    );
    expect(ack.transactionResponses[0]?.segmentNotes[0]?.elementNotes).toEqual([
      {
        position: { element: 2, component: 3, repetition: 4 },
        dataElementReferenceNumber: undefined,
        syntaxErrorCode: undefined,
        copyOfBadDataElement: undefined,
      },
    ]);
  });

  it("reads an unreadable count or position as 0, as the 999 does", () => {
    const ack = read(ack997(["AK1*HC*1", "AK2*837*0001", "AK3*NM1*X", "AK5*R", "AK9*R*one*1*0"]));
    expect(ack.transactionResponses[0]?.segmentNotes[0]?.ak3.segmentPositionInTransactionSet).toBe(
      0,
    );
    expect(ack.ak9?.numberOfTransactionSets).toBe(0);
  });
});

describe("parse997: a segment out of place is not read and warns", () => {
  it("an AK3 before any AK2", () => {
    const ack = read(ack997(["AK1*HC*1", "AK3*NM1*4", "AK2*837*0001", "AK5*A", "AK9*A*1*1*1"]));
    expect(ack.transactionResponses[0]?.segmentNotes).toEqual([]);
    expect(ack.warnings).toEqual([
      ack997SegmentOutOfPlace({ segmentIndex: 2, transactionIndex: 0 }),
    ]);
  });

  it("an AK4 before any AK3, and one after an AK5 closed the AK3", () => {
    const ack = read(
      ack997([
        "AK1*HC*1",
        "AK2*837*0001",
        "AK4*1**1",
        "AK3*NM1*4",
        "AK5*R",
        "AK4*2**1",
        "AK9*R*1*1*0",
      ]),
    );
    expect(ack.transactionResponses[0]?.segmentNotes[0]?.elementNotes).toEqual([]);
    expect(codes(ack.warnings)).toEqual([
      "X12_997_SEGMENT_OUT_OF_PLACE@3",
      "X12_997_SEGMENT_OUT_OF_PLACE@6",
    ]);
  });

  it("an AK5 with no AK2 open, which reads no disposition", () => {
    const ack = read(ack997(["AK1*HC*1", "AK5*Q", "AK9*A*0*0*0"]));
    expect(ack.transactionResponses).toEqual([]);
    expect(codes(ack.warnings)).toEqual(["X12_997_SEGMENT_OUT_OF_PLACE@2"]);
  });

  it("a second AK1: the first stands", () => {
    const ack = read(ack997(["AK1*HC*1", "AK1*HP*2", "AK9*A*0*0*0"]));
    expect(ack.ak1?.groupControlNumber).toBe("1");
    expect(codes(ack.warnings)).toEqual(["X12_997_SEGMENT_OUT_OF_PLACE@2"]);
  });

  it("a second AK9: the first stands, and its disposition is not read", () => {
    const ack = read(ack997(["AK1*HC*1", "AK9*A*0*0*0", "AK9*Q*9*9*9"]));
    expect(ack.ak9?.disposition).toBe("A");
    expect(ack.ak9?.numberOfTransactionSets).toBe(0);
    expect(codes(ack.warnings)).toEqual(["X12_997_SEGMENT_OUT_OF_PLACE@3"]);
  });

  it("warns on every segment the 997 does not define, CTX and the IK segments included", () => {
    const ack = read(
      ack997([
        "AK1*HC*1",
        "AK2*837*0001",
        "CTX*X",
        "IK3*NM1*4",
        "IK4*1**7",
        "IK5*R",
        "NM1*IL*1",
        "AK5*A",
        "AK9*A*1*1*1",
      ]),
    );
    expect(ack.transactionResponses[0]?.segmentNotes).toEqual([]);
    expect(ack.transactionResponses[0]?.ak5?.disposition).toBe("A");
    expect(ack.warnings).toEqual(
      [3, 4, 5, 6, 7].map((segmentIndex) =>
        ack997SegmentNotDefined({ segmentIndex, transactionIndex: 0 }),
      ),
    );
  });

  it("an AK1 after an AK2 is not read", () => {
    const ack = read(ack997(["AK2*837*0001", "AK1*HC*1", "AK5*A", "AK9*A*1*1*1"]));
    expect(ack.ak1).toBeUndefined();
    expect(ack.transactionResponses[0]?.ak5?.disposition).toBe("A");
    expect(codes(ack.warnings)).toEqual(["X12_997_SEGMENT_OUT_OF_PLACE@2", "X12_997_AK1_ABSENT@0"]);
  });

  it("an AK1 after an AK2 that an AK5 closed is not read either", () => {
    const ack = read(ack997(["AK2*837*0001", "AK5*A", "AK1*HC*1", "AK9*A*1*1*1"]));
    expect(ack.ak1).toBeUndefined();
    expect(codes(ack.warnings)).toEqual(["X12_997_SEGMENT_OUT_OF_PLACE@3", "X12_997_AK1_ABSENT@0"]);
  });

  it("an AK2 after the AK9 is not read, nor the AK5 that follows it", () => {
    const ack = read(ack997(["AK1*HC*1", "AK9*A*0*0*0", "AK2*837*0001", "AK5*A"]));
    expect(ack.transactionResponses).toEqual([]);
    expect(codes(ack.warnings)).toEqual([
      "X12_997_SEGMENT_OUT_OF_PLACE@3",
      "X12_997_SEGMENT_OUT_OF_PLACE@4",
    ]);
  });

  it("puts only registry text on every warning", () => {
    const ack = read(
      ack997([
        "AK3*SECRET*1",
        "AK1*HC*SECRET",
        "AK1*HC*2",
        "AK2*837*SECRET",
        "AK5*SECRET",
        "AK9*SECRET",
      ]),
    );
    expect(ack.warnings.length).toBeGreaterThan(0);
    for (const w of ack.warnings) {
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
      expect(w.message).not.toContain("SECRET");
    }
  });
});

// ---------------------------------------------------------------------------
// build997.
// ---------------------------------------------------------------------------

describe("build997: what it writes", () => {
  it("writes each fixture byte for byte", () => {
    expect(serializeX12(build997(ACCEPT))).toBe(fixture("997-accept.edi"));
    expect(serializeX12(build997(PARTIAL))).toBe(fixture("997-partial-with-errors.edi"));
    expect(serializeX12(build997(REJECT))).toBe(fixture("997-reject.edi"));
  });

  it("writes GS-01 FA, GS-08 005010 and an ST with no ST-03", () => {
    const ix = build997(ACCEPT);
    const gs = ix.groups[0]?.gs;
    expect(gs?.elements[1]).toBe("FA");
    expect(gs?.elements[8]).toBe("005010");
    expect(ix.groups[0]?.transactions[0]?.st.elements).toEqual(["ST", "997", "0021"]);
    expect(ix.warnings).toEqual([]);
  });

  it("reads back what it wrote", () => {
    for (const spec of [ACCEPT, PARTIAL, REJECT]) {
      const ack = read(serializeX12(build997(spec)));
      expect(ack.warnings).toEqual([]);
      expect(ack.ak9?.disposition).toBe(spec.functionalGroup.disposition);
      expect(ack.transactionResponses.map((r) => r.ak5?.disposition)).toEqual(
        spec.functionalGroup.transactionResponses.map((r) => r.disposition),
      );
    }
  });

  it("writes a repetition position with an empty component, as the 999 does", () => {
    const spec: Build997Spec = {
      ...REJECT,
      functionalGroup: {
        ...REJECT.functionalGroup,
        transactionResponses: [
          {
            transactionSetIdCode: "835",
            transactionSetControlNumber: "0006",
            disposition: "R",
            segmentErrors: [
              {
                segmentIdCode: "CLP",
                segmentPositionInTransactionSet: 12,
                elementErrors: [
                  {
                    position: { element: 2, repetition: 3 },
                    syntaxErrorCode: "1",
                    copyOfBadDataElement: "X",
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    const text = serializeX12(build997(spec));
    expect(text).toContain("~AK3*CLP*12~AK4*2::3**1*X~AK5*R~");
  });

  it("escapes a caller code that holds a delimiter rather than shifting the elements", () => {
    const spec: Build997Spec = {
      ...REJECT,
      functionalGroup: {
        ...REJECT.functionalGroup,
        syntaxErrorCodes: ["1*2"],
        transactionResponses: [
          {
            transactionSetIdCode: "835",
            transactionSetControlNumber: "0006",
            disposition: "R",
            syntaxErrorCodes: ["5~"],
            segmentErrors: [
              {
                segmentIdCode: "CLP",
                segmentPositionInTransactionSet: 12,
                loopIdentifier: "2100",
                syntaxErrorCode: "8:",
                elementErrors: [{ position: { element: 1 }, syntaxErrorCode: "7^" }],
              },
            ],
          },
        ],
      },
    };
    const text = serializeX12(build997(spec));
    expect(text).toContain("AK3*CLP*12*2100*8?:~AK4*1**7?^~AK5*R*5?~~AK9*R*1*1*0*1?*2~");
    const ack = read(text);
    expect(ack.ak9?.syntaxErrorCodes).toEqual(["1*2"]);
    expect(ack.transactionResponses[0]?.ak5?.syntaxErrorCodes).toEqual(["5~"]);
    expect(ack.transactionResponses[0]?.segmentNotes[0]?.ak3.syntaxErrorCode).toBe("8:");
    expect(ack.transactionResponses[0]?.segmentNotes[0]?.elementNotes[0]?.syntaxErrorCode).toBe(
      "7^",
    );
  });

  it("leaves build999 writing what it wrote before: IK segments, its guide, FA", () => {
    const ix = build999({
      envelope: ENVELOPE,
      functionalGroup: {
        functionalIdCode: "HC",
        groupControlNumber: "3",
        versionRelease: "005010X222A2",
        disposition: "R",
        numberOfTransactionSets: 1,
        numberOfReceivedTransactionSets: 1,
        numberOfAcceptedTransactionSets: 0,
        transactionResponses: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0003",
            disposition: "R",
            segmentErrors: [
              {
                segmentIdCode: "NM1",
                segmentPositionInTransactionSet: 8,
                contexts: ["C1"],
                elementErrors: [
                  { position: { element: 3 }, syntaxErrorCode: "7", contexts: ["C2"] },
                ],
              },
            ],
          },
        ],
      },
    });
    const text = serializeX12(ix);
    expect(text).toContain(
      "GS*FA*RECEIVER*SENDER*20250101*1230*21*X*005010X231A1~ST*999*0021*005010X231A1~AK1*HC*3*005010X222A2~AK2*837*0003~IK3*NM1*8~CTX*C1~IK4*3**7~CTX*C2~IK5*R~AK9*R*1*1*0~SE*10*0021~",
    );
  });
});

describe("build997: what it refuses", () => {
  /** The refusal `build997(spec)` throws: its code and message. */
  function refusal(spec: unknown): { code: string; message: string } {
    try {
      build997(spec as Build997Spec);
    } catch (err) {
      if (err instanceof AckBuildError) return { code: err.code, message: err.message };
      throw err;
    }
    throw new Error("build997 accepted the spec");
  }

  function withGroup(group: Partial<Build997Spec["functionalGroup"]>): unknown {
    return { ...ACCEPT, functionalGroup: { ...ACCEPT.functionalGroup, ...group } };
  }

  function withResponse(response: Record<string, unknown>): unknown {
    return withGroup({
      disposition: "R",
      numberOfAcceptedTransactionSets: 0,
      transactionResponses: [
        {
          transactionSetIdCode: "837",
          transactionSetControlNumber: "0003",
          disposition: "R",
          ...response,
        },
      ] as Build997Spec["functionalGroup"]["transactionResponses"],
    });
  }

  for (const sent of ["Q", "a", "", "constructor", 1, undefined]) {
    it(`an AK9-01 outside code list 715 (${String(sent)})`, () => {
      expect(refusal(withGroup({ disposition: sent as "A" }))).toEqual({
        code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_DISPOSITION,
        message:
          "build997: functionalGroup.disposition (AK9-01) must be one of A, E, P, R, M, W or X, the codes of code list 715.",
      });
    });
  }

  for (const sent of ["P", "Q", "", "toString", 0]) {
    it(`an AK5-01 outside code list 717 (${String(sent)}), named by its index`, () => {
      const spec = withGroup({
        disposition: "R",
        numberOfTransactionSets: 2,
        numberOfReceivedTransactionSets: 2,
        numberOfAcceptedTransactionSets: 0,
        transactionResponses: [
          { transactionSetIdCode: "837", transactionSetControlNumber: "0003", disposition: "R" },
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0004",
            disposition: sent as "R",
          },
        ],
      });
      expect(refusal(spec)).toEqual({
        code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_DISPOSITION,
        message:
          "build997: transactionResponses[1].disposition (AK5-01) must be one of A, E, M, R, W or X, the codes of code list 717, which has no P.",
      });
    });
  }

  it("accepts every code of both lists", () => {
    for (const code of ["A", "E", "P", "R", "M", "W", "X"] as const) {
      const ix = build997(
        withGroup({
          disposition: code,
          ...(code === "A" ? {} : { numberOfAcceptedTransactionSets: 0 }),
          transactionResponses: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0003",
              disposition: code === "P" ? "R" : code,
            },
          ],
        }) as Build997Spec,
      );
      expect(serializeX12(ix)).toContain(`~AK9*${code}*`);
    }
  });

  for (const field of [
    "numberOfTransactionSets",
    "numberOfReceivedTransactionSets",
    "numberOfAcceptedTransactionSets",
  ] as const) {
    for (const sent of [1.5, -1, Number.NaN, Number.POSITIVE_INFINITY, 2 ** 53, "1"]) {
      it(`a ${field} of ${String(sent)}`, () => {
        expect(refusal(withGroup({ [field]: sent }))).toEqual({
          code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
          message: `build997: functionalGroup.${field} must be a whole number of zero or more, written as it stands; nothing is rounded or coerced.`,
        });
      });
    }
  }

  it("accepts a count of 0 and the largest safe whole number", () => {
    expect(() =>
      build997(
        withGroup({
          numberOfTransactionSets: Number.MAX_SAFE_INTEGER,
          numberOfReceivedTransactionSets: 1,
        }) as Build997Spec,
      ),
    ).not.toThrow();
    expect(() =>
      build997(
        withGroup({
          disposition: "R",
          numberOfTransactionSets: 0,
          numberOfReceivedTransactionSets: 0,
          numberOfAcceptedTransactionSets: 0,
          transactionResponses: [],
        }) as Build997Spec,
      ),
    ).not.toThrow();
  });

  it("an AK3-02 that is not a whole number", () => {
    const spec = withResponse({
      segmentErrors: [{ segmentIdCode: "NM1", segmentPositionInTransactionSet: 2.5 }],
    });
    expect(refusal(spec)).toEqual({
      code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
      message:
        "build997: segmentErrors[].segmentPositionInTransactionSet must be a whole number of zero or more, written as it stands; nothing is rounded or coerced.",
    });
  });

  for (const key of ["element", "component", "repetition"] as const) {
    it(`an AK4-01 ${key} that is not a whole number`, () => {
      const position = { element: 1, [key]: -2 };
      const spec = withResponse({
        segmentErrors: [
          {
            segmentIdCode: "NM1",
            segmentPositionInTransactionSet: 2,
            elementErrors: [{ position, syntaxErrorCode: "7" }],
          },
        ],
      });
      expect(refusal(spec)).toEqual({
        code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
        message: `build997: elementErrors[].position.${key} must be a whole number of zero or more, written as it stands; nothing is rounded or coerced.`,
      });
    });
  }

  /** The error list of a 999, CTX contexts and all, as a caller might hand it on. */
  const ERRORS_999: Build999Spec["functionalGroup"]["transactionResponses"][number]["segmentErrors"] =
    [
      {
        segmentIdCode: "N3",
        segmentPositionInTransactionSet: 2,
        elementErrors: [{ position: { element: 1 }, syntaxErrorCode: "7" }],
      },
      {
        segmentIdCode: "NM1",
        segmentPositionInTransactionSet: 3,
        syntaxErrorCode: "8",
        contexts: ["C1"],
        elementErrors: [{ position: { element: 3 }, syntaxErrorCode: "7", contexts: ["C2"] }],
      },
    ];

  it("a 999 error list with segment contexts, from a typed caller: the 997 has no CTX", () => {
    // A 999 error list has the 997's shape plus `contexts`, so it type-checks here.
    const spec: Build997Spec = {
      ...ACCEPT,
      functionalGroup: {
        ...ACCEPT.functionalGroup,
        disposition: "R",
        numberOfAcceptedTransactionSets: 0,
        transactionResponses: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0003",
            disposition: "R",
            segmentErrors: ERRORS_999,
          },
        ],
      },
    };
    expect(refusal(spec)).toEqual({
      code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
      message:
        "build997: transactionResponses[0].segmentErrors[1].contexts is set. The 997 has no CTX segment, so this builder writes none; remove contexts.",
    });
  });

  it("element contexts alone, from an untyped caller, at their own indices", () => {
    const spec = withResponse({
      segmentErrors: [
        {
          segmentIdCode: "NM1",
          segmentPositionInTransactionSet: 3,
          elementErrors: [
            { position: { element: 1 }, syntaxErrorCode: "7" },
            { position: { element: 3 }, syntaxErrorCode: "7", contexts: ["C2"] },
          ],
        },
      ],
    });
    expect(refusal(spec)).toEqual({
      code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
      message:
        "build997: transactionResponses[0].segmentErrors[0].elementErrors[1].contexts is set. The 997 has no CTX segment, so this builder writes none; remove contexts.",
    });
  });

  for (const contexts of [[], undefined, null, "C1"]) {
    it(`contexts present as ${String(JSON.stringify(contexts))} is refused too, at either level`, () => {
      const segment = withResponse({
        segmentErrors: [{ segmentIdCode: "NM1", segmentPositionInTransactionSet: 3, contexts }],
      });
      expect(refusal(segment).message).toMatch(/segmentErrors\[0\]\.contexts is set/u);
      const element = withResponse({
        segmentErrors: [
          {
            segmentIdCode: "NM1",
            segmentPositionInTransactionSet: 3,
            elementErrors: [{ position: { element: 1 }, syntaxErrorCode: "7", contexts }],
          },
        ],
      });
      expect(refusal(element).message).toMatch(/elementErrors\[0\]\.contexts is set/u);
    });
  }

  it("writes no CTX for a 997 whatever it was given, since it refuses first", () => {
    for (const spec of [ACCEPT, PARTIAL, REJECT]) {
      expect(serializeX12(build997(spec))).not.toContain("CTX");
    }
  });

  it("an empty AK4-03, named by its indices", () => {
    const spec = withResponse({
      segmentErrors: [
        { segmentIdCode: "N3", segmentPositionInTransactionSet: 1 },
        {
          segmentIdCode: "NM1",
          segmentPositionInTransactionSet: 2,
          elementErrors: [
            { position: { element: 1 }, syntaxErrorCode: "7" },
            { position: { element: 2 }, syntaxErrorCode: "" },
          ],
        },
      ],
    });
    expect(refusal(spec)).toEqual({
      code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
      message:
        "build997: transactionResponses[0].segmentErrors[1].elementErrors[1].syntaxErrorCode (AK4-03) is empty. It is required, and this builder never invents one.",
    });
  });

  it("an AK4-03 that is not a string", () => {
    const spec = withResponse({
      segmentErrors: [
        {
          segmentIdCode: "NM1",
          segmentPositionInTransactionSet: 2,
          elementErrors: [{ position: { element: 1 }, syntaxErrorCode: 7 }],
        },
      ],
    });
    const { code, message } = refusal(spec);
    expect(code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC);
    expect(message).toMatch(/^build997: /u);
  });

  it("an accept paired with errors, naming the AK5", () => {
    const spec = withGroup({
      disposition: "E",
      transactionResponses: [
        {
          transactionSetIdCode: "837",
          transactionSetControlNumber: "0003",
          disposition: "A",
          syntaxErrorCodes: ["5"],
        },
      ],
    });
    expect(refusal(spec)).toEqual({
      code: ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
      message:
        "build997: AK2 (ST-02 \"0003\") AK5-01 was 'A' (Accept) but the response carried error payload. Use 'E' (Accept, with errors noted) or a reject disposition instead.",
    });
  });

  it("a group accept over a rejected set", () => {
    const spec = withGroup({
      transactionResponses: [
        { transactionSetIdCode: "837", transactionSetControlNumber: "0003", disposition: "R" },
      ],
    });
    expect(refusal(spec).code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS);
    expect(refusal(spec).message).toMatch(/^build997: AK9-01 was 'A' \(Accept\)/u);
  });

  it("more than five AK5 syntax error codes, naming AK5-02..AK5-06", () => {
    const spec = withResponse({ syntaxErrorCodes: ["1", "2", "3", "4", "5", "6"] });
    expect(refusal(spec)).toEqual({
      code: ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      message: 'build997: AK5 accepts up to 5 syntax error codes (AK5-02..AK5-06); "6" supplied.',
    });
  });

  it("counts that disagree with the responses", () => {
    expect(
      refusal(withGroup({ numberOfReceivedTransactionSets: 2, numberOfTransactionSets: 2 })),
    ).toEqual({
      code: ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH,
      message:
        'build997: AK9-03 received ("2") must equal the number of supplied transaction responses ("1").',
    });
  });

  it("an empty control number, named for build997", () => {
    expect(
      refusal({ ...ACCEPT, envelope: { ...ENVELOPE, transactionSetControlNumber: "" } }).message,
    ).toMatch(/^build997: transactionSetControlNumber is empty\. ST-02 \/ SE-02/u);
    expect(refusal(withGroup({ groupControlNumber: "" })).message).toMatch(
      /^build997: functionalGroup\.groupControlNumber is empty\. AK1-02/u,
    );
  });

  it("an over-long interchange control number, named for build997", () => {
    expect(
      refusal({ ...ACCEPT, envelope: { ...ENVELOPE, interchangeControlNumber: "1234567890" } }),
    ).toEqual({
      code: ACK_BUILD_ERROR_CODES.X12_ACK_INVALID_SPEC,
      message: 'build997: control number "1234567890" exceeds the 9-char spec limit.',
    });
  });

  it("an AK1-03 that is given but not a string", () => {
    expect(refusal(withGroup({ versionRelease: 5 as unknown as string })).message).toMatch(
      /^build997: /u,
    );
  });

  it("writes no AK1-03 when none is given, and one when it is", () => {
    const { versionRelease: _dropped, ...group } = ACCEPT.functionalGroup;
    expect(serializeX12(build997({ ...ACCEPT, functionalGroup: group }))).toContain("~AK1*HC*3~");
    expect(serializeX12(build997(ACCEPT))).toContain("~AK1*HC*3*005010X222A2~");
  });
});

describe("the 997 warnings", () => {
  it("are seven codes, each with its own registry message", () => {
    const at = { segmentIndex: 1, transactionIndex: 0 };
    const factories = [
      ack997Ak1Absent,
      ack997Ak5Absent,
      ack997Ak9Absent,
      ack997Ak5DispositionUnknown,
      ack997Ak9DispositionUnknown,
      ack997SegmentOutOfPlace,
      ack997SegmentNotDefined,
    ];
    const warnings = factories.map((f) => f(at));
    expect(warnings.map((w) => w.code)).toEqual([
      "X12_997_AK1_ABSENT",
      "X12_997_AK5_ABSENT",
      "X12_997_AK9_ABSENT",
      "X12_997_AK5_DISPOSITION_UNKNOWN",
      "X12_997_AK9_DISPOSITION_UNKNOWN",
      "X12_997_SEGMENT_OUT_OF_PLACE",
      "X12_997_SEGMENT_NOT_DEFINED",
    ]);
    expect(new Set(warnings.map((w) => w.message)).size).toBe(7);
    for (const w of warnings) {
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
      expect(w.message.startsWith("997 ")).toBe(true);
      expect(w.position).toBe(at);
    }
  });

  it("the envelope reads a 997 cleanly, so its warnings are the reader's own", () => {
    expect(parseX12(fixture("997-partial-with-errors.edi")).warnings).toEqual([]);
  });
});

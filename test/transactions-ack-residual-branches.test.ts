/**
 * Branches in the acknowledgment readers and builder (`parse999`, `parseTA1`,
 * `build999`) that the feature suites leave unexercised: the lenient fallbacks
 * of the 999 walk, the IK4-01 position composite, the optional IK3, IK5 and
 * AK9 elements on emit, and the code-list narrowing of IK3-04, IK4-03 and
 * TA1-05. Every interchange is synthetic.
 */

import { describe, expect, it } from "vitest";

import {
  build999,
  parse999,
  parseTA1,
  parseX12,
  serializeX12,
  type Build999Spec,
} from "../src/index.js";

import { buildIsa } from "./_helpers/envelope.js";

const ENVELOPE =
  "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1230*^*00501*000000030*0*P*:~" +
  "GS*FA*RECEIVER*SENDER*20250101*1230*30*X*005010X231A1~ST*999*0030*005010X231A1~";

/** A 999 whose body is `body`, with SE-01 counted. */
function ack999(body: readonly string[]): string {
  return (
    ENVELOPE +
    body.map((s) => `${s}~`).join("") +
    `SE*${String(body.length + 2)}*0030~GE*1*30~IEA*1*000000030~`
  );
}

const BASE: Build999Spec = {
  envelope: {
    senderId: "RECEIVER",
    receiverId: "SENDER",
    interchangeDate: "250101",
    interchangeTime: "1230",
    interchangeControlNumber: "000000010",
    groupControlNumber: "10",
    transactionSetControlNumber: "0010",
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
      {
        transactionSetIdCode: "837",
        transactionSetControlNumber: "0001",
        disposition: "A",
      },
    ],
  },
};

describe("code-list narrowing never answers an Object.prototype key", () => {
  // The three tables are plain object literals, so an `in` test reads their
  // prototype: a document carrying `toString` or `constructor` came back with a
  // typed code the code list does not have.
  it("IK3-04 narrows a prototype key to undefined, and an IK4 whose IK4-03 is one is dropped", () => {
    const ack = parse999(
      ack999([
        "AK1*HC*1*005010X222A2",
        "AK2*837*0001*005010X222A2",
        "IK3*NM1*5**toString",
        "IK4*2**constructor",
        "IK5*R",
        "AK9*R*1*1*0",
      ]),
    );
    const note = ack?.transactionResponses[0]?.segmentNotes[0];
    expect(note?.ik3.syntaxErrorCode).toBeUndefined();
    // IK4-03 is required, so an IK4 without a known code is dropped as malformed.
    expect(note?.elementNotes).toEqual([]);
  });

  it("TA1-05 narrows a prototype key to undefined and keeps the raw text", () => {
    const ix = parseX12(`${buildIsa()}TA1*000000001*260601*1200*R*hasOwnProperty~IEA*0*000000001~`);
    const ta1 = parseTA1(ix);
    expect(ta1?.noteCode).toBeUndefined();
    expect(ta1?.noteCodeRaw).toBe("hasOwnProperty");
  });
});

describe("parse999: lenient fallbacks in the walk", () => {
  it("ignores an IK5 that no AK2 opened", () => {
    const ack = parse999(ack999(["AK1*HC*1*005010X222A2", "IK5*A", "AK9*A*0*0*0"]));
    expect(ack?.transactionResponses).toEqual([]);
  });

  it("closes an AK2 with no IK5 at the AK9 as a reject placeholder", () => {
    const ack = parse999(
      ack999(["AK1*HC*1*005010X222A2", "AK2*837*0001*005010X222A2", "AK9*R*1*1*0"]),
    );
    expect(ack?.transactionResponses).toHaveLength(1);
    expect(ack?.transactionResponses[0]?.ak2.transactionSetControlNumber).toBe("0001");
    expect(ack?.transactionResponses[0]?.ik5.disposition).toBe("R");
  });

  it("closes an AK2 still open at the end of the set, and the absent AK9, as reject placeholders", () => {
    const ack = parse999(ack999(["AK1*HC*1*005010X222A2", "AK2*837*0001*005010X222A2"]));
    expect(ack?.transactionResponses).toHaveLength(1);
    expect(ack?.transactionResponses[0]?.ik5.disposition).toBe("R");
    expect(ack?.ak9.disposition).toBe("R");
    expect(ack?.ak9.numberOfAcceptedTransactionSets).toBe(0);
  });

  it("reads absent and non-numeric AK9 counts as 0", () => {
    const absent = parse999(ack999(["AK1*HC*1*005010X222A2", "AK9*R"]));
    expect(absent?.ak9.numberOfTransactionSets).toBe(0);
    expect(absent?.ak9.numberOfReceivedTransactionSets).toBe(0);
    expect(absent?.ak9.numberOfAcceptedTransactionSets).toBe(0);
    const garbled = parse999(ack999(["AK1*HC*1*005010X222A2", "AK9*R*X1*1*-1"]));
    expect(garbled?.ak9.numberOfTransactionSets).toBe(0);
    expect(garbled?.ak9.numberOfReceivedTransactionSets).toBe(1);
    expect(garbled?.ak9.numberOfAcceptedTransactionSets).toBe(0);
  });

  it("leaves IK3-04 undefined when the IK3 stops before it", () => {
    const ack = parse999(
      ack999([
        "AK1*HC*1*005010X222A2",
        "AK2*837*0001*005010X222A2",
        "IK3*NM1*5",
        "IK5*R",
        "AK9*R*1*1*0",
      ]),
    );
    const ik3 = ack?.transactionResponses[0]?.segmentNotes[0]?.ik3;
    expect(ik3?.segmentIdCode).toBe("NM1");
    expect(ik3?.syntaxErrorCode).toBeUndefined();
  });

  it("drops an IK4 whose IK4-03 is not a known code, keeping its IK3", () => {
    const ack = parse999(
      ack999([
        "AK1*HC*1*005010X222A2",
        "AK2*837*0001*005010X222A2",
        "IK3*NM1*5**8",
        "IK4*2**ZZ",
        "IK5*R",
        "AK9*R*1*1*0",
      ]),
    );
    const note = ack?.transactionResponses[0]?.segmentNotes[0];
    expect(note?.ik3.syntaxErrorCode).toBe("8");
    expect(note?.elementNotes).toEqual([]);
  });
});

describe("parse999: the IK4-01 position composite", () => {
  function ik4Position(composite: string): unknown {
    const ack = parse999(
      ack999([
        "AK1*HC*1*005010X222A2",
        "AK2*837*0001*005010X222A2",
        "IK3*SV1*7**8",
        `IK4*${composite}**7`,
        "IK5*R",
        "AK9*R*1*1*0",
      ]),
    );
    return ack?.transactionResponses[0]?.segmentNotes[0]?.elementNotes[0]?.ik4.position;
  }

  it("reads element, component and repetition", () => {
    expect(ik4Position("1:2:3")).toEqual({ element: 1, component: 2, repetition: 3 });
  });

  it("reads an empty component as absent while keeping the repetition", () => {
    expect(ik4Position("1::3")).toEqual({ element: 1, repetition: 3 });
  });
});

describe("parseTA1: short and truncated TA1 segments", () => {
  it("reads absent trailing elements as empty and narrows no codes from them", () => {
    const ix = parseX12(`${buildIsa()}TA1*000000001*260601~IEA*0*000000001~`);
    const ta1 = parseTA1(ix);
    expect(ta1?.interchangeControlNumber).toBe("000000001");
    expect(ta1?.interchangeTime).toBe("");
    expect(ta1?.ackCode).toBe("R");
    expect(ta1?.noteCode).toBeUndefined();
    expect(ta1?.noteCodeRaw).toBe("");
  });

  it("keeps a dangling release character at the end of the input in the read value", () => {
    const ix = parseX12(`${buildIsa()}TA1*000000001*260601*1200*A*000?`);
    const ta1 = parseTA1(ix);
    expect(ta1?.noteCodeRaw).toBe("000?");
    expect(ta1?.noteCode).toBeUndefined();
  });
});

describe("build999: optional elements on emit", () => {
  function emitted(spec: Build999Spec): string {
    return serializeX12(build999(spec));
  }

  it("emits an empty IK3-03 when a syntax error code is given without a loop id", () => {
    const out = emitted({
      ...BASE,
      functionalGroup: {
        ...BASE.functionalGroup,
        disposition: "E",
        transactionResponses: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            disposition: "E",
            segmentErrors: [
              {
                segmentIdCode: "NM1",
                segmentPositionInTransactionSet: 5,
                syntaxErrorCode: "8",
                elementErrors: [{ position: { element: 2 }, syntaxErrorCode: "7" }],
              },
            ],
          },
        ],
      },
    });
    expect(out).toContain("~IK3*NM1*5**8~");
    expect(out).toContain("~IK4*2**7~");
  });

  it("emits IK5 and AK9 syntax error codes in order", () => {
    const out = emitted({
      ...BASE,
      functionalGroup: {
        ...BASE.functionalGroup,
        disposition: "R",
        numberOfAcceptedTransactionSets: 0,
        syntaxErrorCodes: ["1", "4"],
        transactionResponses: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            disposition: "R",
            syntaxErrorCodes: ["5", "23"],
          },
        ],
      },
    });
    expect(out).toContain("~IK5*R*5*23~");
    expect(out).toContain("~AK9*R*1*1*0*1*4~");
  });

  it("zero-pads a short interchange control number to nine digits", () => {
    const ix = build999({
      ...BASE,
      envelope: { ...BASE.envelope, interchangeControlNumber: "42" },
    });
    expect(ix.isa.elements[13]).toBe("000000042");
    expect(ix.iea?.elements[2]).toBe("000000042");
  });

  it("expands GS-04 through the century window and passes other shapes through", () => {
    const gs04 = (interchangeDate: string): string | undefined =>
      build999({ ...BASE, envelope: { ...BASE.envelope, interchangeDate } }).groups[0]?.gs
        .elements[4];
    expect(gs04("990101")).toBe("19990101");
    expect(gs04("250101")).toBe("20250101");
    expect(gs04("20250101")).toBe("20250101");
    expect(gs04("AB0101")).toBe("AB0101");
  });
});

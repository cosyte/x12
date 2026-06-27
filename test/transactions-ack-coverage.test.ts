/**
 * Branch-coverage tests for the X12 ack surface. Each block targets one
 * decision branch in `parse-999.ts` / `parse-ta1.ts` / `build-999.ts` /
 * `build-ta1.ts` that the happy-path + Tier-1-fixture tests don't reach,
 * proving the lenient fallbacks behave correctly and don't silently
 * produce wrong clinical / structural output.
 */

import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  AckBuildError,
  build999,
  buildTA1,
  isAcceptDisposition,
  parse999,
  parseTA1,
  parseX12,
  TA1_ACK_CODES,
  X12_ACK_DISPOSITION_CODES,
  type Build999Spec,
} from "../src/index.js";

const ENVELOPE = (controlNumber: string, groupCN: string, txCN: string): string =>
  `ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1230*^*00501*${controlNumber}*0*P*:~` +
  `GS*FA*RECEIVER*SENDER*20250101*1230*${groupCN}*X*005010X231A1~` +
  `ST*999*${txCN}*005010X231A1~`;

const TRAILER = (groupCN: string, txCN: string, controlNumber: string, segCount: number): string =>
  `SE*${String(segCount)}*${txCN}~GE*1*${groupCN}~IEA*1*${controlNumber}~`;

// ---------------------------------------------------------------------------
// parse-999 lenient fallbacks.
// ---------------------------------------------------------------------------

describe("parse999 — lenient fallbacks", () => {
  it("falls back to reject on an unknown IK5 disposition", () => {
    const raw =
      ENVELOPE("000000030", "30", "0030") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      "IK5*Z~" + // unknown disposition
      "AK9*A*1*1*1~" +
      TRAILER("30", "0030", "000000030", 5);
    const ack = parse999(raw);
    expect(ack?.transactionResponses[0]?.ik5.disposition).toBe(X12_ACK_DISPOSITION_CODES.R);
  });

  it("falls back to reject on an unknown AK9 disposition", () => {
    const raw =
      ENVELOPE("000000031", "31", "0031") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      "IK5*A~" +
      "AK9*Q*1*1*1~" + // unknown disposition
      TRAILER("31", "0031", "000000031", 5);
    const ack = parse999(raw);
    expect(ack?.ak9.disposition).toBe(X12_ACK_DISPOSITION_CODES.R);
  });

  it("preserves an unknown IK3-04 syntax error code as undefined (forensic via raw)", () => {
    const raw =
      ENVELOPE("000000032", "32", "0032") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      "IK3*NM1*8*2010BA*ZZ~" + // unknown IK3-04 code "ZZ"
      "IK5*R~" +
      "AK9*R*1*1*0~" +
      TRAILER("32", "0032", "000000032", 6);
    const ack = parse999(raw);
    expect(ack?.transactionResponses[0]?.segmentNotes[0]?.ik3.syntaxErrorCode).toBeUndefined();
  });

  it("drops a malformed IK4 with no error code (IK4-03 required by spec)", () => {
    const raw =
      ENVELOPE("000000033", "33", "0033") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      "IK3*NM1*8*2010BA*8~" +
      "IK4*1:2*66~" + // IK4-03 missing entirely
      "IK5*R~" +
      "AK9*R*1*1*0~" +
      TRAILER("33", "0033", "000000033", 7);
    const ack = parse999(raw);
    expect(ack?.transactionResponses[0]?.segmentNotes[0]?.elementNotes).toHaveLength(0);
  });

  it("accepts legacy AK3/AK4/AK5 names and normalizes onto IK3/IK4/IK5", () => {
    const raw =
      ENVELOPE("000000034", "34", "0034") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      "AK3*NM1*8*2010BA*8~" +
      "AK4*1:2*66*7~" +
      "AK5*E~" +
      "AK9*E*1*1*1~" +
      TRAILER("34", "0034", "000000034", 7);
    const ack = parse999(raw);
    expect(ack?.transactionResponses[0]?.ik5.disposition).toBe(X12_ACK_DISPOSITION_CODES.E);
    expect(ack?.transactionResponses[0]?.segmentNotes[0]?.ik3.segmentIdCode).toBe("NM1");
    expect(
      ack?.transactionResponses[0]?.segmentNotes[0]?.elementNotes[0]?.ik4.syntaxErrorCode,
    ).toBe("7");
  });

  it("captures CTX between IK3 and IK4 as segment-level context", () => {
    const raw =
      ENVELOPE("000000035", "35", "0035") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      "IK3*NM1*8*2010BA*8~" +
      "CTX*SITUATIONAL TRIGGER~" + // segment-context (no IK4 in flight)
      "IK4*1:2*66*7~" +
      "CTX*ELEMENT NM1 8 1~" + // element-context (IK4 in flight)
      "IK5*E~" +
      "AK9*E*1*1*1~" +
      TRAILER("35", "0035", "000000035", 8);
    const ack = parse999(raw);
    expect(ack?.transactionResponses[0]?.segmentNotes[0]?.contexts).toEqual([
      "SITUATIONAL TRIGGER",
    ]);
    expect(ack?.transactionResponses[0]?.segmentNotes[0]?.elementNotes[0]?.contexts).toEqual([
      "ELEMENT NM1 8 1",
    ]);
  });

  it("skips unknown body segments inside a 999 (default switch branch)", () => {
    const raw =
      ENVELOPE("000000036", "36", "0036") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      "ZZZ*UNRECOGNIZED~" + // unknown body segment — silently skipped
      "IK5*A~" +
      "AK9*A*1*1*1~" +
      TRAILER("36", "0036", "000000036", 6);
    const ack = parse999(raw);
    expect(ack?.transactionResponses).toHaveLength(1);
    expect(ack?.transactionResponses[0]?.ik5.disposition).toBe(X12_ACK_DISPOSITION_CODES.A);
  });

  it("closes a hanging AK2 (no IK5) with a synthesized reject and proceeds", () => {
    const raw =
      ENVELOPE("000000037", "37", "0037") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      // no IK5 — next AK2 forces flushResponse(undefined) to synthesize a reject
      "AK2*837*0002*005010X222A2~" +
      "IK5*A~" +
      "AK9*P*2*2*1~" +
      TRAILER("37", "0037", "000000037", 6);
    const ack = parse999(raw);
    expect(ack?.transactionResponses).toHaveLength(2);
    expect(ack?.transactionResponses[0]?.ik5.disposition).toBe(X12_ACK_DISPOSITION_CODES.R);
    expect(ack?.transactionResponses[1]?.ik5.disposition).toBe(X12_ACK_DISPOSITION_CODES.A);
  });

  it("closes a 999 that hits EOF before AK9 with placeholder counts", () => {
    // ST is opened but SE never reached — the envelope walker tolerates,
    // and parse999's tail synthesizes a reject AK9 placeholder so the typed
    // model still resolves.
    const raw =
      ENVELOPE("000000038", "38", "0038") +
      "AK1*HC*1*005010X222A2~" +
      "AK2*837*0001*005010X222A2~" +
      "IK5*A~" +
      `IEA*1*000000038~`; // no SE, no GE, no AK9
    const ack = parse999(raw);
    expect(ack?.ak9.disposition).toBe(X12_ACK_DISPOSITION_CODES.R);
    expect(ack?.ak9.numberOfTransactionSets).toBe(0);
  });

  it("returns AK1 with empty fields when the inbound 999 has no AK1 (defensive)", () => {
    const raw =
      ENVELOPE("000000039", "39", "0039") + "AK9*A*0*0*0~" + TRAILER("39", "0039", "000000039", 2);
    const ack = parse999(raw);
    expect(ack?.ak1.functionalIdCode).toBe("");
    expect(ack?.ak1.versionRelease).toBeUndefined();
  });

  it("ignores IK3 / IK4 / CTX when no AK2 is open (no `currentResponse`)", () => {
    const raw =
      ENVELOPE("000000040", "40", "0040") +
      "AK1*HC*1*005010X222A2~" +
      // IK3 with no preceding AK2 — silently dropped
      "IK3*NM1*8*2010BA*8~" +
      // IK4 with no preceding IK3 — silently dropped
      "IK4*1:2*66*7~" +
      // CTX with no IK3/IK4 in flight — silently dropped
      "CTX*ORPHAN CONTEXT~" +
      "AK9*A*0*0*0~" +
      TRAILER("40", "0040", "000000040", 5);
    const ack = parse999(raw);
    expect(ack?.transactionResponses).toHaveLength(0);
    expect(ack?.ak9.disposition).toBe(X12_ACK_DISPOSITION_CODES.A);
  });
});

// ---------------------------------------------------------------------------
// build-999 branch coverage.
// ---------------------------------------------------------------------------

const BASE_ACCEPT: Build999Spec = {
  envelope: {
    senderId: "RECEIVER",
    receiverId: "SENDER",
    interchangeDate: "250101",
    interchangeTime: "1230",
    interchangeControlNumber: "000000060",
    groupControlNumber: "60",
    transactionSetControlNumber: "0060",
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

describe("build999 — branch coverage", () => {
  it("emits IK4 with component and repetition positions", () => {
    const ix = build999({
      ...BASE_ACCEPT,
      envelope: {
        ...BASE_ACCEPT.envelope,
        interchangeControlNumber: "000000061",
        groupControlNumber: "61",
        transactionSetControlNumber: "0061",
      },
      functionalGroup: {
        ...BASE_ACCEPT.functionalGroup,
        disposition: "E",
        transactionResponses: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            disposition: "E",
            segmentErrors: [
              {
                segmentIdCode: "HI",
                segmentPositionInTransactionSet: 12,
                loopIdentifier: "2300",
                syntaxErrorCode: "8",
                contexts: ["LOOP 2300"],
                elementErrors: [
                  {
                    position: { element: 1, component: 2, repetition: 3 },
                    dataElementReferenceNumber: "1271",
                    syntaxErrorCode: "7",
                    copyOfBadDataElement: "DEC",
                    contexts: ["ELEMENT HI 1 1"],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    const segIds = ix.groups[0]?.transactions[0]?.segments.map((s) => s.id);
    expect(segIds).toEqual(["ST", "AK1", "AK2", "IK3", "CTX", "IK4", "CTX", "IK5", "AK9", "SE"]);
  });

  it("emits IK4 with only repetition (no component) — empty component slot preserved", () => {
    const ix = build999({
      ...BASE_ACCEPT,
      envelope: {
        ...BASE_ACCEPT.envelope,
        interchangeControlNumber: "000000062",
        groupControlNumber: "62",
        transactionSetControlNumber: "0062",
      },
      functionalGroup: {
        ...BASE_ACCEPT.functionalGroup,
        disposition: "E",
        transactionResponses: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            disposition: "E",
            segmentErrors: [
              {
                segmentIdCode: "HI",
                segmentPositionInTransactionSet: 12,
                elementErrors: [
                  {
                    position: { element: 1, repetition: 3 },
                    syntaxErrorCode: "7",
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    const ik4 = ix.groups[0]?.transactions[0]?.segments.find((s) => s.id === "IK4");
    // Position composite should be "1::3" (element 1, empty component, repetition 3).
    expect(ik4?.elements[1]).toBe("1::3");
  });

  it("emits AK2 without implementationConventionReference when not supplied", () => {
    const ix = build999({
      ...BASE_ACCEPT,
      envelope: {
        ...BASE_ACCEPT.envelope,
        interchangeControlNumber: "000000063",
        groupControlNumber: "63",
        transactionSetControlNumber: "0063",
      },
      functionalGroup: {
        ...BASE_ACCEPT.functionalGroup,
        transactionResponses: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            disposition: "A",
            // implementationConventionReference omitted
          },
        ],
      },
    });
    const ak2 = ix.groups[0]?.transactions[0]?.segments.find((s) => s.id === "AK2");
    expect(ak2?.elements.length).toBe(3); // ["AK2", "837", "0001"]
  });

  it("refuses IK5 with > 5 syntax error codes (spec limit)", () => {
    const tooMany = ["1", "2", "3", "4", "5", "6"];
    try {
      build999({
        ...BASE_ACCEPT,
        functionalGroup: {
          ...BASE_ACCEPT.functionalGroup,
          disposition: "R",
          numberOfAcceptedTransactionSets: 0,
          transactionResponses: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0001",
              disposition: "R",
              syntaxErrorCodes: tooMany,
            },
          ],
        },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
      if (err instanceof AckBuildError) {
        expect(err.code).toBe(ACK_BUILD_ERROR_CODES.X12_ACK_COUNT_MISMATCH);
      }
    }
  });

  it("refuses AK9 with > 5 syntax error codes (spec limit)", () => {
    try {
      build999({
        ...BASE_ACCEPT,
        functionalGroup: {
          ...BASE_ACCEPT.functionalGroup,
          disposition: "R",
          numberOfAcceptedTransactionSets: 0,
          syntaxErrorCodes: ["1", "2", "3", "4", "5", "6"],
          transactionResponses: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0001",
              disposition: "R",
            },
          ],
        },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
    }
  });

  it("refuses AK9-03 > AK9-02 (received exceeds declared)", () => {
    try {
      build999({
        ...BASE_ACCEPT,
        functionalGroup: {
          ...BASE_ACCEPT.functionalGroup,
          numberOfTransactionSets: 1,
          numberOfReceivedTransactionSets: 2,
          numberOfAcceptedTransactionSets: 1,
          transactionResponses: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0001",
              disposition: "A",
            },
          ],
        },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
    }
  });

  it("refuses negative AK9 counts", () => {
    try {
      build999({
        ...BASE_ACCEPT,
        functionalGroup: {
          ...BASE_ACCEPT.functionalGroup,
          numberOfTransactionSets: -1,
          numberOfReceivedTransactionSets: 1,
          numberOfAcceptedTransactionSets: 1,
        },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
    }
  });

  it("refuses responses.length != received", () => {
    try {
      build999({
        ...BASE_ACCEPT,
        functionalGroup: {
          ...BASE_ACCEPT.functionalGroup,
          numberOfTransactionSets: 2,
          numberOfReceivedTransactionSets: 2,
          numberOfAcceptedTransactionSets: 1,
          transactionResponses: [
            {
              transactionSetIdCode: "837",
              transactionSetControlNumber: "0001",
              disposition: "A",
            },
          ],
        },
      });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AckBuildError);
    }
  });

  it("honors custom group date / time / agency overrides", () => {
    const ix = build999({
      ...BASE_ACCEPT,
      envelope: {
        ...BASE_ACCEPT.envelope,
        interchangeControlNumber: "000000064",
        groupControlNumber: "64",
        transactionSetControlNumber: "0064",
        groupDate: "20260101",
        groupTime: "1300",
        groupResponsibleAgency: "X",
      },
    });
    const gs = ix.groups[0]?.gs;
    expect(gs?.elements[4]).toBe("20260101");
    expect(gs?.elements[5]).toBe("1300");
  });

  it("honors custom usageIndicator T (test)", () => {
    const ix = build999({
      ...BASE_ACCEPT,
      envelope: {
        ...BASE_ACCEPT.envelope,
        interchangeControlNumber: "000000065",
        groupControlNumber: "65",
        transactionSetControlNumber: "0065",
        usageIndicator: "T",
      },
    });
    expect(ix.isa.elements[15]).toBe("T");
  });

  it("expands YYMMDD where year ≥ 50 to the 20th century (`19xx`)", () => {
    const ix = build999({
      ...BASE_ACCEPT,
      envelope: {
        ...BASE_ACCEPT.envelope,
        interchangeControlNumber: "000000066",
        groupControlNumber: "66",
        transactionSetControlNumber: "0066",
        interchangeDate: "990101", // 1999
      },
    });
    expect(ix.groups[0]?.gs.elements[4]).toBe("19990101");
  });

  it("emits IK3 with loopIdentifier but no syntaxErrorCode (situational composite)", () => {
    const ix = build999({
      ...BASE_ACCEPT,
      envelope: {
        ...BASE_ACCEPT.envelope,
        interchangeControlNumber: "000000067",
        groupControlNumber: "67",
        transactionSetControlNumber: "0067",
      },
      functionalGroup: {
        ...BASE_ACCEPT.functionalGroup,
        disposition: "R",
        numberOfAcceptedTransactionSets: 0,
        transactionResponses: [
          {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            disposition: "R",
            segmentErrors: [
              {
                segmentIdCode: "BHT",
                segmentPositionInTransactionSet: 2,
                loopIdentifier: "1000A",
                // no syntaxErrorCode
              },
            ],
          },
        ],
      },
    });
    const ik3 = ix.groups[0]?.transactions[0]?.segments.find((s) => s.id === "IK3");
    expect(ik3?.elements.length).toBe(4); // ["IK3", "BHT", "2", "1000A"]
  });
});

// ---------------------------------------------------------------------------
// parseTA1 / buildTA1 branch coverage.
// ---------------------------------------------------------------------------

describe("parseTA1 — branch coverage", () => {
  it("falls back to reject on an unknown TA1 ack code", () => {
    const raw =
      "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1230*^*00501*000000080*0*P*:~" +
      "TA1*000000019*250101*1200*Z*000~" + // unknown ack code "Z"
      "IEA*0*000000080~";
    const ix = parseX12(raw);
    const ta1 = parseTA1(ix);
    expect(ta1?.ackCode).toBe(TA1_ACK_CODES.R);
  });

  it("preserves an unknown TA1 note code as undefined on the typed model + raw verbatim", () => {
    const raw =
      "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *250101*1230*^*00501*000000081*0*P*:~" +
      "TA1*000000019*250101*1200*E*999~" + // unknown note code "999"
      "IEA*0*000000081~";
    const ix = parseX12(raw);
    const ta1 = parseTA1(ix);
    expect(ta1?.noteCode).toBeUndefined();
    expect(ta1?.noteCodeRaw).toBe("999");
  });
});

describe("buildTA1 — branch coverage", () => {
  it("honors a custom elementSeparator (companion-guide quirk)", () => {
    const ta1 = buildTA1(
      {
        interchangeControlNumber: "000000019",
        interchangeDate: "250101",
        interchangeTime: "1200",
        ackCode: "A",
        noteCode: "000",
      },
      { elementSeparator: "|" },
    );
    expect(ta1.raw).toBe("TA1|000000019|250101|1200|A|000");
  });
});

// ---------------------------------------------------------------------------
// Public disposition predicate (called by consumers narrowing on the ack code).
// ---------------------------------------------------------------------------

describe("isAcceptDisposition — public surface", () => {
  it("returns true for the three accept dispositions (A, E, P)", () => {
    expect(isAcceptDisposition("A")).toBe(true);
    expect(isAcceptDisposition("E")).toBe(true);
    expect(isAcceptDisposition("P")).toBe(true);
  });

  it("returns false for the four reject dispositions (R, M, W, X)", () => {
    expect(isAcceptDisposition("R")).toBe(false);
    expect(isAcceptDisposition("M")).toBe(false);
    expect(isAcceptDisposition("W")).toBe(false);
    expect(isAcceptDisposition("X")).toBe(false);
  });
});

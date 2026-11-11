/**
 * Property suite for the 997 Functional Acknowledgment.
 *
 * 1. **Round trip.** For any spec `build997` accepts, the text it writes reads
 *    back through `parse997` with no warning and the same dispositions, counts,
 *    notes and codes, delimiters inside caller codes included.
 * 2. **Accept means accept.** A group or set accept paired with any error is
 *    refused, whatever else the spec holds.
 * 3. **The reader decides nothing it cannot read.** Over any body of 997
 *    segments in any order, `parse997` never throws, every warning carries
 *    registry text, and an AK5 or AK9 disposition is typed exactly when its code
 *    is in its list, beside the code as sent.
 *
 * Every spec and body is generated: no file is read.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  ACK_BUILD_ERROR_CODES,
  ALL_WARNING_MESSAGES,
  AckBuildError,
  X12_997_SET_DISPOSITION_CODES,
  X12_ACK_DISPOSITION_CODES,
  build997,
  parse997,
  serializeX12,
  type Build997Spec,
  type Build997TransactionResponseSpec,
  type X12Ack997SetDispositionCode,
} from "../../src/index.js";

const SET_CODES = Object.values(X12_997_SET_DISPOSITION_CODES);
const GROUP_CODES = Object.values(X12_ACK_DISPOSITION_CODES);

/** A code a caller might write: letters and digits, and now and then a delimiter. */
const codeArb = fc.stringMatching(/^[A-Z0-9*~:^]{1,3}$/u);

const envelopeArb = fc.record({
  senderId: fc.constant("RECEIVER"),
  receiverId: fc.constant("SENDER"),
  interchangeDate: fc.constant("260601"),
  interchangeTime: fc.constant("1200"),
  interchangeControlNumber: fc.integer({ min: 1, max: 999_999_999 }).map(String),
  groupControlNumber: fc.integer({ min: 1, max: 99_999 }).map(String),
  transactionSetControlNumber: fc
    .integer({ min: 1, max: 9_999 })
    .map((n) => String(n).padStart(4, "0")),
});

const elementErrorArb = fc.record(
  {
    position: fc.record(
      {
        element: fc.integer({ min: 1, max: 99 }),
        component: fc.integer({ min: 1, max: 9 }),
        repetition: fc.integer({ min: 1, max: 9 }),
      },
      { requiredKeys: ["element"] },
    ),
    dataElementReferenceNumber: fc.integer({ min: 1, max: 9999 }).map(String),
    syntaxErrorCode: codeArb,
    copyOfBadDataElement: fc.stringMatching(/^[A-Z0-9]{1,6}$/u),
  },
  { requiredKeys: ["position", "syntaxErrorCode"] },
);

const segmentErrorArb = fc.record(
  {
    segmentIdCode: fc.constantFrom("NM1", "CLP", "SV1", "HL", "N3"),
    segmentPositionInTransactionSet: fc.integer({ min: 1, max: 9999 }),
    loopIdentifier: fc.constantFrom("2000A", "2010BA", "2300", "2400"),
    syntaxErrorCode: codeArb,
    elementErrors: fc.array(elementErrorArb, { maxLength: 3 }),
  },
  { requiredKeys: ["segmentIdCode", "segmentPositionInTransactionSet"] },
);

/** A set response: an accept carries no error; anything else may. */
const responseArb: fc.Arbitrary<Build997TransactionResponseSpec> = fc
  .tuple(
    fc.constantFrom(...SET_CODES),
    fc.constantFrom("837", "835", "270", "834"),
    fc.integer({ min: 1, max: 9_999 }),
    fc.array(codeArb, { maxLength: 5 }),
    fc.array(segmentErrorArb, { maxLength: 3 }),
  )
  .map(([disposition, id, n, syntaxErrorCodes, segmentErrors]) =>
    disposition === "A"
      ? {
          transactionSetIdCode: id,
          transactionSetControlNumber: String(n).padStart(4, "0"),
          disposition,
        }
      : {
          transactionSetIdCode: id,
          transactionSetControlNumber: String(n).padStart(4, "0"),
          disposition,
          syntaxErrorCodes,
          segmentErrors,
        },
  );

/** A spec `build997` accepts: counts that agree, and a group accept only over clean accepts. */
const specArb: fc.Arbitrary<Build997Spec> = fc
  .tuple(
    envelopeArb,
    fc.array(responseArb, { maxLength: 5 }),
    fc.constantFrom(...GROUP_CODES),
    fc.array(codeArb, { maxLength: 5 }),
    fc.option(fc.constantFrom("005010X222A2", "005010X221A1", "004010"), { nil: undefined }),
    fc.nat({ max: 3 }),
  )
  .map(([envelope, responses, wanted, codes, versionRelease, extra]) => {
    const clean = responses.every((r) => r.disposition === "A");
    const disposition = wanted === "A" && !clean ? "R" : wanted;
    const accepted = responses.filter((r) => r.disposition === "A" || r.disposition === "E").length;
    return {
      envelope,
      functionalGroup: {
        functionalIdCode: "HC",
        groupControlNumber: envelope.groupControlNumber,
        ...(versionRelease === undefined ? {} : { versionRelease }),
        disposition,
        numberOfTransactionSets: responses.length + extra,
        numberOfReceivedTransactionSets: responses.length,
        numberOfAcceptedTransactionSets: accepted,
        ...(disposition === "A" ? {} : { syntaxErrorCodes: codes }),
        transactionResponses: responses,
      },
    };
  });

describe("997: round trip", () => {
  it("reads back exactly what build997 wrote, with no warning", () => {
    fc.assert(
      fc.property(specArb, (spec) => {
        const text = serializeX12(build997(spec));
        const ack = parse997(text);
        if (ack === undefined) throw new Error("no 997 read from a built one");
        expect(ack.interchange.warnings).toEqual([]);
        expect(ack.warnings).toEqual([]);
        const group = spec.functionalGroup;
        expect(ack.ak1).toEqual({
          functionalIdCode: group.functionalIdCode,
          groupControlNumber: group.groupControlNumber,
          versionRelease: group.versionRelease,
        });
        expect(ack.ak9).toEqual({
          disposition: group.disposition,
          dispositionRaw: group.disposition,
          numberOfTransactionSets: group.numberOfTransactionSets,
          numberOfReceivedTransactionSets: group.numberOfReceivedTransactionSets,
          numberOfAcceptedTransactionSets: group.numberOfAcceptedTransactionSets,
          syntaxErrorCodes: group.syntaxErrorCodes ?? [],
        });
        expect(ack.transactionResponses).toHaveLength(group.transactionResponses.length);
        for (const [i, sent] of group.transactionResponses.entries()) {
          const read = ack.transactionResponses[i];
          expect(read?.ak2.transactionSetControlNumber).toBe(sent.transactionSetControlNumber);
          expect(read?.ak5).toEqual({
            disposition: sent.disposition,
            dispositionRaw: sent.disposition,
            syntaxErrorCodes: sent.syntaxErrorCodes ?? [],
          });
          const notes = sent.segmentErrors ?? [];
          expect(read?.segmentNotes).toHaveLength(notes.length);
          for (const [s, note] of notes.entries()) {
            const got = read?.segmentNotes[s];
            expect(got?.ak3).toEqual({
              segmentIdCode: note.segmentIdCode,
              segmentPositionInTransactionSet: note.segmentPositionInTransactionSet,
              loopIdentifier:
                note.loopIdentifier === undefined && note.syntaxErrorCode === undefined
                  ? undefined
                  : note.loopIdentifier,
              syntaxErrorCode: note.syntaxErrorCode,
            });
            expect(got?.elementNotes).toEqual(
              (note.elementErrors ?? []).map((e) => ({
                position: {
                  element: e.position.element,
                  component: e.position.component,
                  repetition: e.position.repetition,
                },
                dataElementReferenceNumber: e.dataElementReferenceNumber,
                syntaxErrorCode: e.syntaxErrorCode,
                copyOfBadDataElement: e.copyOfBadDataElement,
              })),
            );
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe("997: accept means accept", () => {
  it("refuses a set accept that carries any error", () => {
    fc.assert(
      fc.property(
        specArb,
        fc.oneof(
          fc.record({ syntaxErrorCodes: fc.array(codeArb, { minLength: 1, maxLength: 5 }) }),
          fc.record({ segmentErrors: fc.array(segmentErrorArb, { minLength: 1, maxLength: 2 }) }),
        ),
        (spec, errors) => {
          const response: Build997TransactionResponseSpec = {
            transactionSetIdCode: "837",
            transactionSetControlNumber: "0001",
            disposition: "A",
            ...errors,
          };
          const group = {
            ...spec.functionalGroup,
            disposition: "E" as const,
            numberOfTransactionSets: 1,
            numberOfReceivedTransactionSets: 1,
            numberOfAcceptedTransactionSets: 1,
            transactionResponses: [response],
          };
          expect(() => build997({ ...spec, functionalGroup: group })).toThrow(AckBuildError);
          try {
            build997({ ...spec, functionalGroup: group });
          } catch (err) {
            expect((err as AckBuildError).code).toBe(
              ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("refuses a group accept over any set that is not a clean accept", () => {
    fc.assert(
      fc.property(
        specArb,
        fc.constantFrom<X12Ack997SetDispositionCode>("E", "M", "R", "W", "X"),
        (spec, code) => {
          const group = {
            ...spec.functionalGroup,
            disposition: "A" as const,
            syntaxErrorCodes: [],
            numberOfTransactionSets: 1,
            numberOfReceivedTransactionSets: 1,
            numberOfAcceptedTransactionSets: 0,
            transactionResponses: [
              {
                transactionSetIdCode: "837",
                transactionSetControlNumber: "0001",
                disposition: code,
              },
            ],
          };
          let thrown: unknown;
          try {
            build997({ ...spec, functionalGroup: group });
          } catch (err) {
            thrown = err;
          }
          expect(thrown).toBeInstanceOf(AckBuildError);
          expect((thrown as AckBuildError).code).toBe(
            ACK_BUILD_ERROR_CODES.X12_ACK_ACCEPT_WITH_ERRORS,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

/** A body segment of a 997, or one that is not part of it, with codes known and unknown. */
const bodySegmentArb = fc.oneof(
  fc.constantFrom("AK1*HC*1", "AK1*HP*2*005010X221A1", "AK1"),
  fc.constantFrom("AK2*837*0001", "AK2*835*0002*005010X221A1", "AK2"),
  fc.constantFrom("AK3*NM1*8", "AK3*CLP*12*2100*8", "AK3"),
  fc.constantFrom("AK4*1*66*7", "AK4*2:1:3**1*X", "AK4"),
  fc
    .tuple(
      fc.constantFrom(...SET_CODES, "P", "Q", "", "constructor"),
      fc.array(codeArb, { maxLength: 2 }),
    )
    .map(([d, codes]) => ["AK5", d, ...codes].join("*")),
  fc
    .tuple(fc.constantFrom(...GROUP_CODES, "Q", "", "__proto__"), fc.nat({ max: 9 }))
    .map(([d, n]) => `AK9*${d}*${String(n)}*${String(n)}*0`),
  fc.constantFrom("CTX*X", "IK5*A", "NM1*IL*1"),
);

describe("997: the reader decides nothing it cannot read", () => {
  it("never throws, warns only in registry text, and types exactly the codes of each list", () => {
    fc.assert(
      fc.property(fc.array(bodySegmentArb, { maxLength: 14 }), (body) => {
        const raw =
          "ISA*00*          *00*          *ZZ*RECEIVER       *ZZ*SENDER         *260601*1200*^*00501*000000001*0*P*:~" +
          "GS*FA*RECEIVER*SENDER*20260601*1200*1*X*005010~ST*997*0001~" +
          body.map((s) => `${s}~`).join("") +
          `SE*${String(body.length + 2)}*0001~GE*1*1~IEA*1*000000001~`;
        const ack = parse997(raw);
        if (ack === undefined) throw new Error("no 997 read");
        for (const w of ack.warnings) expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
        for (const response of ack.transactionResponses) {
          if (response.ak5 === undefined) continue;
          const known = (SET_CODES as readonly string[]).includes(response.ak5.dispositionRaw);
          expect(response.ak5.disposition).toBe(known ? response.ak5.dispositionRaw : undefined);
        }
        if (ack.ak9 !== undefined) {
          const known = (GROUP_CODES as readonly string[]).includes(ack.ak9.dispositionRaw);
          expect(ack.ak9.disposition).toBe(known ? ack.ak9.dispositionRaw : undefined);
        }
        // An AK1 is read only ahead of every AK2 and the AK9: the header comes first.
        const header = body.findIndex((s) => /^AK[129]/u.test(s));
        expect(ack.ak1 === undefined).toBe(
          header === -1 || !(body[header] ?? "").startsWith("AK1"),
        );
        expect(ack.ak9 === undefined).toBe(!body.some((s) => s.startsWith("AK9")));
      }),
      { numRuns: 300 },
    );
  });
});

/**
 * The 271 AAA request-validation surface: a payer that REJECTED the inquiry
 * and a payer that found no benefits must not read the same way.
 *
 * ## Where the element positions come from, and why this file states them
 *
 * The expected element-to-meaning mapping is taken from the RECORDED SOURCE
 * and written out here, NOT imported from `src/`. A fixture built out of the
 * implementation's own constants could only ever confirm the implementation,
 * so the two positions are restated below with the line that establishes each
 * one, and every expectation in this file is computed by reading that position
 * out of the fixture's raw segment text.
 *
 * Source: an EDI reference reproducing the 005010 AAA Request Validation
 * segment, `https://www.stedi.com/edi/x12-005010/segment/AAA`, retrieved
 * 2026-08-22. It is a third-party reproduction and NOT the paid ASC X12
 * Technical Report Type 3, which was not purchased, so the mapping is recorded
 * as single-source rather than as verified.
 *
 * THE QUOTES BELOW ARE RE-DERIVABLE FROM PINNED BYTES, not from a live fetch.
 * The retrieved document was committed beside the implementation record that
 * cites it, as `sources/www.stedi.com-edi-x12-005010-segment-AAA`, 92094 bytes,
 * sha256 `0eb534233fd3099059fe765ada88ddef738e803d2812ca7b9a19c91afed13ba2`.
 * The digest is repeated in the bundled snapshot's own `meta.source` so a
 * package-side reader has it too; the path is named HERE and not there because
 * it points into this project's internal record, which no consumer of the
 * published package can open. The bytes themselves are third-party content and
 * are deliberately not vendored into this repository.
 *
 * - Reject Reason Code, from that document's element table for AAA:
 *   `"data_element_number":"901","requirement":"O","sequence":"03",` ...
 *   `"data_element_name":"Reject Reason Code"`
 * - Follow-up Action Code, from the same table:
 *   `"data_element_number":"889","requirement":"O","sequence":"04",` ...
 *   `"data_element_name":"Follow-up Action Code"`
 *
 * Nothing beyond sequence 04 is sourced, so nothing beyond it is read: an
 * element there is reported as occupied and never decoded.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  get271Eligibility,
  parseX12,
  type X12Eligibility,
  type X12Segment,
  type X12TransactionSet,
} from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "eligibility");

/** The two positions, restated from the recorded source (see the file doc). */
const SOURCED_REJECT_REASON_POSITION = 3;
const SOURCED_FOLLOW_UP_ACTION_POSITION = 4;

interface Read271 {
  readonly raw: string;
  readonly tx: X12TransactionSet;
  readonly elig: X12Eligibility;
}

function read271(name: string): Read271 {
  const raw = readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
  if (tx === undefined) throw new Error(`Fixture ${name} has no 271 transaction set`);
  const elig = get271Eligibility(ix.delimiters, tx);
  if (elig === undefined) throw new Error(`get271Eligibility returned undefined for ${name}`);
  return { raw, tx, elig };
}

/** Every AAA segment of the transaction set, in document order. */
function aaaSegments(tx: X12TransactionSet): readonly X12Segment[] {
  return tx.segments.filter((seg) => seg.id === "AAA");
}

/**
 * The value at `position` of the nth AAA segment, read straight off the RAW
 * fixture text. This is what makes the assertions independent of the reader:
 * the expectation comes from the document plus the sourced position, never
 * from what `get271Eligibility` decided.
 */
function rawAaaElement(tx: X12TransactionSet, nth: number, position: number): string | undefined {
  const value = aaaSegments(tx)[nth]?.elements[position];
  return value === undefined || value === "" ? undefined : value;
}

describe("AC-1 / AC-9: an AAA surfaces at every level, with its level and both codes", () => {
  it.each([
    ["271-aaa-information-source.edi", "information-source"],
    ["271-aaa-information-receiver.edi", "information-receiver"],
    ["271-aaa-subscriber.edi", "subscriber"],
    ["271-aaa-dependent.edi", "dependent"],
  ])("%s surfaces one condition at the %s level", (fixture, level) => {
    const { tx, elig } = read271(fixture);
    expect(elig.aaaConditions).toHaveLength(1);
    const condition = elig.aaaConditions[0];
    expect(condition?.key.level).toBe(level);
    expect(condition?.rejectReasonCode?.code).toBe(
      rawAaaElement(tx, 0, SOURCED_REJECT_REASON_POSITION),
    );
    expect(condition?.followUpActionCode?.code).toBe(
      rawAaaElement(tx, 0, SOURCED_FOLLOW_UP_ACTION_POSITION),
    );
  });

  it("the four fixtures really do exercise four DIFFERENT codes, not one repeated", () => {
    // Guards against a vacuous sweep: if every fixture carried the same reject
    // reason code the assertions above would pass over a reader that ignored
    // the document entirely.
    const codes = [
      "271-aaa-information-source.edi",
      "271-aaa-information-receiver.edi",
      "271-aaa-subscriber.edi",
      "271-aaa-dependent.edi",
    ].map((f) => read271(f).elig.aaaConditions[0]?.rejectReasonCode?.code);
    expect(new Set(codes).size).toBe(4);
  });

  it("AC-9: a level whose loop carries no other content still owns its AAA", () => {
    const { elig } = read271("271-aaa-only-loop.edi");
    expect(elig.aaaConditions).toHaveLength(1);
    expect(elig.aaaConditions[0]?.key.level).toBe("subscriber");
    expect(elig.aaaConditions[0]?.key.hierarchyId).toBe("3");
  });

  it("AC-9 / AC-23: the AAA-only loop synthesises no extra subscriber", () => {
    // The same document with the AAA line removed (and SE-01 corrected) must
    // produce the same subscriber, dependent and hierarchy counts. A caller
    // counting subscribers sees no difference.
    const withAaa = read271("271-aaa-only-loop.edi");
    const withoutRaw = withAaa.raw
      .split("~")
      .filter((s) => !s.trim().startsWith("AAA*"))
      .join("~")
      .replace("SE*9*0001", "SE*8*0001");
    const ixWithout = parseX12(withoutRaw);
    const txWithout = ixWithout.groups[0]?.transactions[0];
    const without =
      txWithout === undefined ? undefined : get271Eligibility(ixWithout.delimiters, txWithout);
    expect(without?.subscribers).toHaveLength(withAaa.elig.subscribers.length);
    expect(without?.hierarchies).toHaveLength(withAaa.elig.hierarchies.length);
    expect(without?.aaaConditions).toHaveLength(0);
    expect(withAaa.elig.aaaConditions).toHaveLength(1);
  });
});

describe("AC-2: the rejection is reachable without inspecting tx.segments", () => {
  it("reads entirely off the typed collection", () => {
    // Deliberately no reference to tx.segments anywhere in this test: the
    // typed field alone has to carry the fact and the codes.
    const raw = readFileSync(join(FIXTURE_DIR, "271-aaa-subscriber.edi"), "utf8").trimEnd();
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    const elig = tx === undefined ? undefined : get271Eligibility(ix.delimiters, tx);
    expect(elig?.aaaConditions.length).toBeGreaterThan(0);
    expect(elig?.aaaConditions[0]?.rejectReasonCode?.code).toBe("72");
    expect(elig?.aaaConditions[0]?.followUpActionCode?.code).toBe("C");
  });
});

describe("AC-3 / AC-5: benefits and rejections are independent readings", () => {
  it("no benefits and no AAA leaves the benefit collection empty and synthesises nothing", () => {
    const { elig } = read271("271-no-benefits-no-aaa.edi");
    expect(elig.subscribers).toHaveLength(1);
    expect(elig.subscribers[0]?.benefits).toHaveLength(0);
    expect(elig.aaaConditions).toHaveLength(0);
  });

  it("no benefits WITH an AAA reads as a rejection rather than as an absence", () => {
    const { elig } = read271("271-aaa-subscriber.edi");
    expect(elig.subscribers[0]?.benefits).toHaveLength(0);
    expect(elig.aaaConditions).toHaveLength(1);
  });

  it("benefits AND an AAA surface both, suppressing neither", () => {
    const { elig } = read271("271-aaa-with-benefits.edi");
    expect(elig.subscribers[0]?.benefits).toHaveLength(1);
    expect(elig.subscribers[0]?.benefits[0]?.eligibilityCode).toBe("1");
    expect(elig.subscribers[0]?.traces[0]?.referenceId).toBe("ECHO-270-TRACE-106");
    expect(elig.aaaConditions).toHaveLength(1);
  });
});

describe("AC-4 / AC-13 / AC-15: an out-of-snapshot code echoes verbatim with no description", () => {
  it("every code in the AAA fixtures is echoed verbatim and described by nothing", () => {
    for (const fixture of [
      "271-aaa-information-source.edi",
      "271-aaa-information-receiver.edi",
      "271-aaa-subscriber.edi",
      "271-aaa-dependent.edi",
      "271-aaa-repeated.edi",
    ]) {
      const { tx, elig } = read271(fixture);
      elig.aaaConditions.forEach((condition, nth) => {
        expect(condition.rejectReasonCode?.code).toBe(
          rawAaaElement(tx, nth, SOURCED_REJECT_REASON_POSITION),
        );
        expect(condition.rejectReasonCode?.description).toBeUndefined();
        expect(condition.followUpActionCode?.code).toBe(
          rawAaaElement(tx, nth, SOURCED_FOLLOW_UP_ACTION_POSITION),
        );
        expect(condition.followUpActionCode?.description).toBeUndefined();
      });
    }
  });
});

describe("AC-6: nothing moved off tx.segments to build the typed surface", () => {
  it.each([
    "271-aaa-information-source.edi",
    "271-aaa-subscriber.edi",
    "271-aaa-repeated.edi",
    "271-aaa-malformed.edi",
  ])("%s keeps every AAA segment verbatim, element by element", (fixture) => {
    const { raw, tx } = read271(fixture);
    const inbound = raw
      .split("~")
      .map((s) => s.trim())
      .filter((s) => s.startsWith("AAA*"));
    const recorded = aaaSegments(tx);
    expect(recorded).toHaveLength(inbound.length);
    inbound.forEach((text, nth) => {
      expect(recorded[nth]?.elements).toEqual(text.split("*"));
      expect(recorded[nth]?.raw).toBe(text);
    });
  });

  it("the AAA segments sit in the same order as the document, among the others", () => {
    const { raw, tx } = read271("271-aaa-repeated.edi");
    const inboundIds = raw
      .split("~")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => s.split("*")[0])
      .filter((id) => id !== "ISA" && id !== "GS" && id !== "GE" && id !== "IEA");
    expect(tx.segments.map((s) => s.id)).toEqual(inboundIds);
  });
});

describe("AC-7 / AC-7a: the three-part key names exactly one loop occurrence", () => {
  it("two subscribers each carrying an AAA differ in every part that can differ", () => {
    const { elig } = read271("271-aaa-two-subscribers.edi");
    expect(elig.aaaConditions).toHaveLength(2);
    expect(elig.aaaConditions[0]?.key).toEqual({
      level: "subscriber",
      hierarchyId: "3",
      occurrenceIndex: 0,
    });
    expect(elig.aaaConditions[1]?.key).toEqual({
      level: "subscriber",
      hierarchyId: "4",
      occurrenceIndex: 1,
    });
  });

  it("the occurrence index is DOCUMENT-WIDE, not per parent", () => {
    // Two subscribers, one dependent each. Under the document-wide reading the
    // dependent indices are 0 and 1; under a per-parent reading both would be
    // 0. This test is what pins the two apart.
    const { elig } = read271("271-aaa-two-dependents.edi");
    expect(elig.aaaConditions.map((c) => c.key.level)).toEqual(["dependent", "dependent"]);
    expect(elig.aaaConditions.map((c) => c.key.occurrenceIndex)).toEqual([0, 1]);
    expect(elig.aaaConditions.map((c) => c.key.occurrenceIndex)).not.toEqual([0, 0]);
    expect(elig.aaaConditions.map((c) => c.key.hierarchyId)).toEqual(["4", "6"]);
  });

  it("a caller can align a dependent AAA against the hierarchies surface", () => {
    // The guarantee AC-7 makes in words: which dependent of which subscriber.
    const { elig } = read271("271-aaa-two-dependents.edi");
    for (const condition of elig.aaaConditions) {
      const hl = elig.hierarchies.find((h) => h.hlId === condition.key.hierarchyId);
      expect(hl?.levelCode).toBe("23");
      const parent = elig.hierarchies.find((h) => h.hlId === hl?.parentHlId);
      expect(parent?.levelCode).toBe("22");
    }
    const parents = elig.aaaConditions.map(
      (c) => elig.hierarchies.find((h) => h.hlId === c.key.hierarchyId)?.parentHlId,
    );
    expect(parents).toEqual(["3", "5"]);
  });

  it("AC-7a: a loop with no hierarchical identifier leaves part (b) absent and warns", () => {
    const { elig } = read271("271-aaa-no-hierarchy-id.edi");
    expect(elig.aaaConditions).toHaveLength(1);
    expect(elig.aaaConditions[0]?.key.level).toBe("subscriber");
    expect(elig.aaaConditions[0]?.key.hierarchyId).toBeUndefined();
    expect(elig.aaaConditions[0]?.key.occurrenceIndex).toBe(0);
    expect(
      elig.warnings.filter((w) => w.code === WARNING_CODES.X12_271_AAA_LOOP_UNIDENTIFIED),
    ).toHaveLength(1);
  });

  it("AC-7a: two AAA before the first hierarchical loop are indexed 0 and 1", () => {
    const { elig } = read271("271-aaa-before-hierarchy.edi");
    expect(elig.aaaConditions).toHaveLength(2);
    expect(elig.aaaConditions.map((c) => c.key.level)).toEqual([undefined, undefined]);
    expect(elig.aaaConditions.map((c) => c.key.hierarchyId)).toEqual([undefined, undefined]);
    expect(elig.aaaConditions.map((c) => c.key.occurrenceIndex)).toEqual([0, 1]);
    expect(elig.aaaConditions.map((c) => c.key.occurrenceIndex)).not.toEqual([0, 0]);
    expect(
      elig.warnings.filter((w) => w.code === WARNING_CODES.X12_271_AAA_LOOP_UNIDENTIFIED),
    ).toHaveLength(2);
  });
});

describe("AC-8: two AAA at one level are two conditions, never one", () => {
  it("keeps both, in document order, even sharing a reject reason code", () => {
    const { tx, elig } = read271("271-aaa-repeated.edi");
    expect(elig.aaaConditions).toHaveLength(2);
    expect(elig.aaaConditions.map((c) => c.rejectReasonCode?.code)).toEqual(["72", "72"]);
    expect(elig.aaaConditions.map((c) => c.followUpActionCode?.code)).toEqual(["C", "R"]);
    // The two share every part of the key, which is exactly why the collection
    // may not de-duplicate on it: document order is what tells them apart.
    expect(elig.aaaConditions[0]?.key).toEqual(elig.aaaConditions[1]?.key);
    expect(elig.aaaConditions[0]?.position.segmentIndex).toBeLessThan(
      elig.aaaConditions[1]?.position.segmentIndex ?? -1,
    );
    expect(aaaSegments(tx)).toHaveLength(2);
  });
});

describe("AC-10 / AC-11 / AC-12: the fail-safe posture applied to a malformed AAA", () => {
  const malformed = (): Read271 => read271("271-aaa-malformed.edi");

  it("reads the whole document to completion and never throws", () => {
    const { elig } = malformed();
    expect(elig.subscribers).toHaveLength(1);
    expect(elig.subscribers[0]?.name?.lastName).toBe("DOE");
    expect(elig.aaaConditions).toHaveLength(4);
  });

  it("AC-10: an empty reject reason code surfaces as ABSENT and warns with its own code", () => {
    const { elig } = malformed();
    expect(elig.aaaConditions[0]?.rejectReasonCode).toBeUndefined();
    expect(elig.aaaConditions[0]?.followUpActionCode?.code).toBe("C");
    const absent = elig.warnings.filter(
      (w) => w.code === WARNING_CODES.X12_271_AAA_REJECT_REASON_ABSENT,
    );
    expect(absent).toHaveLength(1);
    expect(absent[0]?.position.elementIndex).toBe(SOURCED_REJECT_REASON_POSITION);
  });

  it("AC-10: the absent-code warning code differs from the unrecognised-code one", () => {
    expect(WARNING_CODES.X12_271_AAA_REJECT_REASON_ABSENT).not.toBe(
      WARNING_CODES.X12_271_AAA_UNKNOWN_CODE,
    );
  });

  it("AC-11: an absent follow-up action code is absent, with no empty-string stand-in", () => {
    const { elig } = malformed();
    expect(elig.aaaConditions[1]?.rejectReasonCode?.code).toBe("72");
    expect(elig.aaaConditions[1]?.followUpActionCode).toBeUndefined();
    // Absent is silent on the malformed channel; present-and-empty is not.
    const malformedAt4 = elig.warnings.filter(
      (w) =>
        w.code === WARNING_CODES.X12_271_AAA_SEGMENT_MALFORMED &&
        w.position.elementIndex === SOURCED_FOLLOW_UP_ACTION_POSITION,
    );
    expect(malformedAt4).toHaveLength(1);
  });

  it("AC-12: an element past the highest sourced position warns and is never read", () => {
    const { tx, elig } = malformed();
    const past = elig.warnings.filter(
      (w) =>
        w.code === WARNING_CODES.X12_271_AAA_SEGMENT_MALFORMED &&
        w.position.elementIndex === SOURCED_FOLLOW_UP_ACTION_POSITION + 1,
    );
    expect(past).toHaveLength(1);

    // The fixture really does carry a value there, so the assertion is not
    // vacuous, and NO part of the typed condition holds it.
    const beyond = aaaSegments(tx)[3]?.elements[SOURCED_FOLLOW_UP_ACTION_POSITION + 1];
    expect(beyond).toBe("X");
    expect(JSON.stringify(elig.aaaConditions[3])).not.toContain(beyond ?? "");
  });

  it("AC-12: the fatal-code set is unchanged, so AAA content is never fatal", () => {
    // Nothing here throws. The four Tier-3 fatals are asserted as a set by
    // `warning-codes.snapshot.test.ts`; this pins that the AAA path does not
    // reach any of them.
    expect(() => malformed()).not.toThrow();
  });
});

describe("AC-22: one warning per unrecognised code occurrence", () => {
  it("a segment stating both codes raises exactly two, at the two positions", () => {
    const { elig } = read271("271-aaa-subscriber.edi");
    const unknown = elig.warnings.filter((w) => w.code === WARNING_CODES.X12_271_AAA_UNKNOWN_CODE);
    expect(unknown).toHaveLength(2);
    expect(unknown.map((w) => w.position.elementIndex)).toEqual([
      SOURCED_REJECT_REASON_POSITION,
      SOURCED_FOLLOW_UP_ACTION_POSITION,
    ]);
  });

  it("with the snapshot empty, every stated AAA code occurrence warns", () => {
    for (const fixture of [
      "271-aaa-information-source.edi",
      "271-aaa-repeated.edi",
      "271-aaa-two-dependents.edi",
      "271-aaa-malformed.edi",
    ]) {
      const { tx, elig } = read271(fixture);
      const stated = aaaSegments(tx).reduce((total, seg) => {
        const reject = seg.elements[SOURCED_REJECT_REASON_POSITION];
        const follow = seg.elements[SOURCED_FOLLOW_UP_ACTION_POSITION];
        return (
          total +
          (reject !== undefined && reject !== "" ? 1 : 0) +
          (follow !== undefined && follow !== "" ? 1 : 0)
        );
      }, 0);
      const unknown = elig.warnings.filter(
        (w) => w.code === WARNING_CODES.X12_271_AAA_UNKNOWN_CODE,
      );
      expect(unknown).toHaveLength(stated);
    }
  });

  it("the warning stream carries a position for every AAA diagnostic", () => {
    const { elig } = read271("271-aaa-malformed.edi");
    const aaaCodes = new Set<string>([
      WARNING_CODES.X12_271_AAA_REJECT_REASON_ABSENT,
      WARNING_CODES.X12_271_AAA_UNKNOWN_CODE,
      WARNING_CODES.X12_271_AAA_SEGMENT_MALFORMED,
      WARNING_CODES.X12_271_AAA_LOOP_UNIDENTIFIED,
    ]);
    const aaaWarnings = elig.warnings.filter((w) => aaaCodes.has(w.code));
    expect(aaaWarnings.length).toBeGreaterThan(0);
    for (const w of aaaWarnings) expect(w.position.segmentIndex).toBeGreaterThan(0);
  });
});

/**
 * 🩺 `X12-VARIANT-LOOKUP-PROTOTYPE`, on the level table this surface reads.
 *
 * HL-03 reaches `AAA_LEVEL_BY_HL_CODE` verbatim off the wire. While that table
 * was a plain object literal it inherited `Object.prototype`, so an HL-03
 * naming an own property of that prototype resolved THROUGH THE CHAIN: the
 * surfaced `key.level` held a function, the per-level message tables missed and
 * the reader shipped `message: undefined`, and the
 * `X12_271_AAA_LOOP_UNIDENTIFIED` warning an ordinary unknown level DOES raise
 * was suppressed because the guard tests `=== undefined`. `Object.freeze` does
 * not help, and `in` is not the safe form. Every assertion below reds on that
 * tree and passes on this one.
 *
 * The probe set is DERIVED from the running engine and never enumerated: which
 * properties `Object.prototype` owns is engine- and version-dependent, and the
 * property under test is "a level code the table does not declare leaves the
 * level absent", not "these five codes do".
 */
describe("AC-1 / AC-7a / AC-16: an HL-03 naming a prototype member is an ordinary unknown level", () => {
  const PROTOTYPE_LEVEL_CODES: readonly string[] = Object.getOwnPropertyNames(Object.prototype);

  /** A 271 whose single hierarchical loop declares `hl03`, carrying one AAA. */
  function decodeWithHl03(hl03: string): X12Eligibility {
    const raw = [
      "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
      "GS*HB*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X279A1~",
      "ST*271*0001*005010X279A1~",
      "BHT*0022*11*ECHO-270-TRACE-131*20260601*1200~",
      `HL*1**${hl03}*1~`,
      "AAA*N**72*C~",
      "SE*5*0001~",
      "GE*1*1~",
      "IEA*1*000000001~",
    ].join("\n");
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("probe document carries no 271 transaction set");
    const elig = get271Eligibility(ix.delimiters, tx);
    if (elig === undefined) throw new Error("get271Eligibility returned undefined");
    return elig;
  }

  /** The two collections a caller reads, after a JSON round trip. */
  function overTheWire(hl03: string): unknown {
    const elig = decodeWithHl03(hl03);
    return JSON.parse(
      JSON.stringify({ aaaConditions: elig.aaaConditions, warnings: elig.warnings }),
    ) as unknown;
  }

  it("the probe set really does reach the trap, and frames as EDI", () => {
    // Non-vacuity: an empty or delimiter-carrying probe set would make every
    // assertion below pass without exercising anything.
    expect(PROTOTYPE_LEVEL_CODES.length).toBeGreaterThan(0);
    expect(PROTOTYPE_LEVEL_CODES).toContain("constructor");
    for (const code of PROTOTYPE_LEVEL_CODES) expect(code).not.toMatch(/[*~:^\n]/u);
  });

  it("CONTROL a conformant HL-03 names its level and an ordinary unknown one does not", () => {
    expect(decodeWithHl03("22").aaaConditions[0]?.key.level).toBe("subscriber");
    const ordinary = decodeWithHl03("99");
    expect(ordinary.aaaConditions[0]?.key.level).toBeUndefined();
    expect(
      ordinary.warnings.filter((w) => w.code === WARNING_CODES.X12_271_AAA_LOOP_UNIDENTIFIED),
    ).toHaveLength(1);
  });

  it.each(PROTOTYPE_LEVEL_CODES)(
    "HL-03 %s surfaces the AAA, leaves the level absent, and warns from the registry",
    (hl03) => {
      const elig = decodeWithHl03(hl03);
      // AC-1 / AC-7: the level part is one of the four names or absent, never
      // a function and never `Object.prototype`.
      expect(elig.aaaConditions).toHaveLength(1);
      expect(elig.aaaConditions[0]?.key.level).toBeUndefined();
      // AC-7a: the AAA is not dropped and the unidentified-loop warning fires
      // exactly as it does for an ordinary unknown level code.
      expect(
        elig.warnings.filter((w) => w.code === WARNING_CODES.X12_271_AAA_LOOP_UNIDENTIFIED),
      ).toHaveLength(1);
      // AC-16: every diagnostic is a literal in the frozen registry.
      expect(elig.warnings.length).toBeGreaterThan(0);
      for (const w of elig.warnings) {
        expect(typeof w.message).toBe("string");
        expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
      }
    },
  );

  it("over the wire, every prototype-named HL-03 reads as an ordinary unknown one", () => {
    // What a consumer downstream receives, which is where the poisoned fields
    // used to disappear: both `key.level` and `message` were dropped by
    // `JSON.stringify`, so a rejection arrived with no level and no text.
    const ordinary = overTheWire("99");
    for (const hl03 of PROTOTYPE_LEVEL_CODES) {
      expect(overTheWire(hl03)).toEqual(ordinary);
    }
  });
});

/**
 * `X12-DISCARD-AFTER-STRAY-LX`: the warning the `#72` trade owed.
 *
 * 🩺 **What `#72` traded.** An `LX` arriving with no `CLM` open drops its
 * whole Loop 2400, and now also closes the entity loop that was current at it,
 * so a trailing `N3` / `N4` / `PER` / `REF` reaches no party. That stopped a
 * line-item control number, a street address and a contact surfacing on a
 * LATER claim's payer. The cost is
 * that where the `LX` was stray INSIDE an entity loop, that entity's OWN
 * conformant segments are discarded, and through `d3b36d9` they were discarded
 * **silently**: no code named the loss.
 * `X12_837_SERVICE_LINE_DROPPED` is on the channel at that `LX` and reports
 * the SERVICE LINE, never an entity segment.
 *
 * **This suite pins the code that names it**,
 * `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, anchored at the discarded
 * segment itself rather than at the `LX`: the loss is per segment, so two
 * `N3`s are two losses, and the segment is what a consumer resolves back
 * through `tx.segments`.
 *
 * **🩺 THE BOUND IS THE HALF THAT NEEDS PINNING, NOT THE FIRING.** This is
 * NOT a general "entity segment reached no party" code, and nothing here
 * should be read as one. It reports only a segment discarded after such an
 * `LX`, and only while nothing since has opened a loop. Every other route to
 * an unattached `N3` / `N4` / `PER` / `REF` is exactly as silent as it was
 * before: no entity open at the `LX` at all, an `NM1` this walker cannot
 * route, an intervening `HL` or `CLM`, and the `LX` route where a claim IS
 * open (which never had the entity loop to lose). Each of those is a control
 * below, and each control is one a widened guard would red.
 *
 * **▶ EVERY ASSERTION ON THE WARNING CHANNEL HERE IS `toEqual` ON THE WHOLE
 * ARRAY**, per this repo's standing rule: a membership test cannot see the one
 * way this change could do harm, which is by firing where the walker used to
 * be silent.
 *
 * Only bytes can produce these cases: no builder emits an `LX` outside a
 * claim. All data is synthetic.
 */

import { describe, expect, it } from "vitest";

import { ALL_WARNING_MESSAGES, WARNING_CODES, get837Claims, parseX12 } from "../src/index.js";
import { entitySegmentDiscardedAfterLx } from "../src/parser/warnings.js";
import type { X12ParseWarning, X12TransactionSet, X12_837Submission } from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/** 2000A + 2000B, no claim yet. The payer's `NM1` is the entity left open. */
const HEADER: readonly string[] = [
  "HL*1**20*1~",
  "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
  "HL*2*1*22*0~",
  "SBR*P*18*GROUP123******MB~",
  "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
  "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
];

const CLM = "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~";
const SV1 = "SV1*HC:99213*8500*UN*4***1~";

/**
 * Trailing segments this reader surfaces on the payer it follows: `address`,
 * `references` and `contacts` are all populated from them when no `LX`
 * intervenes, which the controls below pin. No TR3 claim is made about which
 * of these Loop 2010BB permits - nobody here has read `005010X222A2`, and
 * grading a spec claim against this repo's own reader is not a check.
 */
const PAYER_N3 = "N3*PO BOX 1~";
const PAYER_N4 = "N4*PAYERTOWN*IL*62701~";
const PAYER_REF = "REF*2U*PAYER-SEC-ID~";
const PAYER_PER = "PER*IC*PAYER DESK*TE*5555550111~";

const DROPPED = WARNING_CODES.X12_837_SERVICE_LINE_DROPPED;
const DISCARDED = WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX;

interface Parsed {
  readonly sub: X12_837Submission;
  readonly tx: X12TransactionSet;
}

function parseWithTx(body: readonly string[], icr: string | null = "005010X222A2"): Parsed {
  const st = icr === null ? "ST*837*0001~" : `ST*837*0001*${icr}~`;
  const segs = [
    ISA,
    "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A2~",
    st,
    "BHT*0019*00*0123*20260601*1200*CH~",
    ...body,
    `SE*${String(body.length + 3)}*0001~`,
    "GE*1*1~",
    "IEA*1*000000001~",
  ];
  const ix = parseX12(segs.join("\n"));
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
  if (tx === undefined) throw new Error("no 837 transaction set");
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return { sub, tx };
}

function parse837(body: readonly string[], icr: string | null = "005010X222A2"): X12_837Submission {
  return parseWithTx(body, icr).sub;
}

/** THE WHOLE CHANNEL. Never a membership test. */
function channel(sub: X12_837Submission): string[] {
  return sub.warnings.map((w) => w.code);
}

/** The segment id each warning's position resolves to, in order. */
function anchoredSegments(sub: X12_837Submission, tx: X12TransactionSet): (string | undefined)[] {
  return sub.warnings.map((w: X12ParseWarning) => tx.segments[w.position.segmentIndex]?.id);
}

/** The stray `LX` shape: an entity loop is open, and the `LX` interrupts it. */
const strayInsideEntityLoop = (trailing: readonly string[]): readonly string[] => [
  ...HEADER,
  "LX*1~",
  ...trailing,
  CLM,
  "HI*ABK:J20.9~",
  "LX*2~",
  SV1,
];

// ---------------------------------------------------------------------------
// The code fires, and it names the segment that was lost.
// ---------------------------------------------------------------------------

describe("X12-DISCARD-AFTER-STRAY-LX: the discard is reported", () => {
  it("🩺 all four discarded entity segments are reported, one warning each", () => {
    const sub = parse837(strayInsideEntityLoop([PAYER_N3, PAYER_N4, PAYER_REF, PAYER_PER]));
    // The loss itself is UNCHANGED - this slice reports it, it does not undo
    // it. If a later slice decides the trade the other way, these three go red
    // together with the codes below, which is the point of asserting both.
    expect(sub.claims[0]?.payer?.address).toBeUndefined();
    expect(sub.claims[0]?.payer?.references).toEqual([]);
    expect(sub.claims[0]?.payer?.contacts).toEqual([]);
    expect(channel(sub)).toEqual([DROPPED, DISCARDED, DISCARDED, DISCARDED, DISCARDED]);
  });

  it("🩺 each warning anchors at its OWN segment, not at the LX", () => {
    const { sub, tx } = parseWithTx(
      strayInsideEntityLoop([PAYER_N3, PAYER_N4, PAYER_REF, PAYER_PER]),
    );
    // The property, not the literals: whatever the indices are, they must
    // resolve to the dropped LX first and then to each discarded segment in
    // document order.
    expect(anchoredSegments(sub, tx)).toEqual(["LX", "N3", "N4", "REF", "PER"]);
  });

  it("the loss is per SEGMENT: two N3s are two warnings", () => {
    const sub = parse837(strayInsideEntityLoop([PAYER_N3, "N3*SUITE 200~"]));
    expect(channel(sub)).toEqual([DROPPED, DISCARDED, DISCARDED]);
  });

  it("no elementIndex is set: the whole segment was discarded, not one element", () => {
    const sub = parse837(strayInsideEntityLoop([PAYER_N3]));
    expect(sub.warnings.map((w) => w.position.elementIndex)).toEqual([undefined, undefined]);
  });

  it("the message is the registry message verbatim and carries no document bytes", () => {
    const sub = parse837(strayInsideEntityLoop([PAYER_N3, PAYER_PER]));
    const discarded = sub.warnings.filter((w) => w.code === DISCARDED);
    // Non-vacuity: the document really does carry these values, and the two
    // warnings really were raised for the segments carrying them.
    expect(discarded).toHaveLength(2);
    const registryMessage = entitySegmentDiscardedAfterLx({
      segmentIndex: 0,
      transactionIndex: 0,
    }).message;
    expect(ALL_WARNING_MESSAGES.has(registryMessage)).toBe(true);
    for (const w of discarded) {
      expect(w.message).toBe(registryMessage);
      expect(w.message).not.toContain("PO BOX 1");
      expect(w.message).not.toContain("PAYER DESK");
      expect(w.message).not.toContain("5555550111");
    }
  });

  it("retention is unchanged: every discarded segment is still verbatim on tx.segments", () => {
    const { tx } = parseWithTx(strayInsideEntityLoop([PAYER_N3, PAYER_N4, PAYER_REF, PAYER_PER]));
    const raws = tx.segments.map((s) => s.raw);
    for (const seg of [PAYER_N3, PAYER_N4, PAYER_REF, PAYER_PER]) {
      expect(raws).toContain(seg.slice(0, -1));
    }
  });

  it("🩺 a SECOND stray LX does not cancel the scope - the discard is still reported", () => {
    // A refuter pass found this one, and it is the shape a plain assignment
    // at the `LX` re-silences: the second stray `LX` finds `activeEntity`
    // already `undefined`, because the first one nulled it, so `=` would
    // clear a scope that is still in force while `||=` holds it. The loss is
    // real on this document - in released `0.0.10` this payer keeps its
    // address, its `2U` id and its contact, and here it keeps none of them -
    // and every surface says the scope ends only where a loop is opened. A
    // stray `LX` opens none.
    const sub = parse837([
      ...HEADER,
      "LX*1~",
      "LX*2~",
      PAYER_N3,
      PAYER_REF,
      PAYER_PER,
      CLM,
      "HI*ABK:J20.9~",
      "LX*3~",
      SV1,
    ]);
    expect(sub.claims[0]?.payer?.address).toBeUndefined();
    expect(sub.claims[0]?.payer?.references).toEqual([]);
    expect(sub.claims[0]?.payer?.contacts).toEqual([]);
    expect(channel(sub)).toEqual([DROPPED, DROPPED, DISCARDED, DISCARDED, DISCARDED]);
  });

  it("the claim that follows still decodes its own Loop 2400 normally", () => {
    const sub = parse837(strayInsideEntityLoop([PAYER_N3, PAYER_REF]));
    expect(sub.claims).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
  });
});

// ---------------------------------------------------------------------------
// The bound. Every case here was silent before this code and must stay silent.
// ---------------------------------------------------------------------------

describe("X12-DISCARD-AFTER-STRAY-LX: the silences this code must NOT break", () => {
  it("🩺 CONTROL: with NO entity loop open at the stray LX, the trailing N3 stays silent", () => {
    // Nothing was lost by this library's doing: with no `NM1` since the `HL`,
    // an `N3` here reached no party at base either. Hard-coding the flag to
    // `true` at the LX reds exactly this case.
    const sub = parse837([
      "HL*1**20*1~",
      "HL*2*1*22*0~",
      "LX*1~",
      "N3*1 ORPHAN WAY~",
      "REF*6R*LINE-CTRL-1~",
      CLM,
      "HI*ABK:J20.9~",
      "LX*2~",
      SV1,
    ]);
    // The whole channel, so the two structural codes this stripped-down
    // document earns (it has no subscriber name and no payer name) are
    // asserted rather than hidden by a membership test.
    expect(channel(sub)).toEqual([
      DROPPED,
      WARNING_CODES.X12_MISSING_REQUIRED_LOOP,
      WARNING_CODES.X12_MISSING_REQUIRED_LOOP,
    ]);
  });

  it("CONTROL: the scope ends at the next NM1 - that payer's own N3 and REF land on it, silently", () => {
    const sub = parse837([
      ...HEADER,
      "LX*1~",
      "REF*6R*LINE-CTRL-1~",
      "NM1*PR*2*PAYER TWO*****PI*PAYER02~",
      "N3*9 PAYER PLAZA~",
      "REF*2U*PAYER-ID-2~",
      CLM,
      "HI*ABK:J20.9~",
      "LX*2~",
      SV1,
    ]);
    const payer = sub.claims[0]?.payer;
    expect(payer?.name).toBe("PAYER TWO");
    expect(payer?.address?.lines).toEqual(["9 PAYER PLAZA"]);
    expect(payer?.references).toEqual([{ qualifier: "2U", value: "PAYER-ID-2" }]);
    // Only the REF before the new NM1 is reported. The two after it attached.
    expect(channel(sub)).toEqual([DROPPED, DISCARDED]);
  });

  it("🩺 CONTROL: an NM1 this walker cannot route also ends the scope, and stays silent", () => {
    // The negative control for the clear at the top of the `NM1` case. This
    // `NM1*QQ` matches no route, so it leaves `activeEntity` undefined and the
    // `N3` after it reaches no party - a silence that predates this code and
    // is NOT this code's to break. Deleting the clear in the `NM1` case reds
    // this and nothing else.
    const sub = parse837([
      ...HEADER,
      "LX*1~",
      "NM1*QQ*2*UNROUTABLE PARTY~",
      "N3*1 NOWHERE LANE~",
      CLM,
      "HI*ABK:J20.9~",
      "LX*2~",
      SV1,
    ]);
    expect(channel(sub)).toEqual([DROPPED]);
  });

  it("CONTROL: an intervening HL ends the scope", () => {
    const sub = parse837([
      ...HEADER,
      "LX*1~",
      "HL*3*2*23*0~",
      "N3*1 NOWHERE LANE~",
      "HL*4*1*22*0~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      CLM,
      "HI*ABK:J20.9~",
      "LX*2~",
      SV1,
    ]);
    expect(channel(sub)).toEqual([DROPPED]);
  });

  it("CONTROL: an intervening CLM ends the scope", () => {
    const sub = parse837([
      ...HEADER,
      "LX*1~",
      CLM,
      "HI*ABK:J20.9~",
      "N3*1 NOWHERE LANE~",
      "LX*2~",
      SV1,
    ]);
    expect(channel(sub)).toEqual([DROPPED]);
  });

  it("🩺 CONTROL: the OTHER dropped-LX route (a claim IS open) reports no discard", () => {
    // Route 2 of `X12_837_SERVICE_LINE_DROPPED`: the variant is what could not
    // be resolved. A claim is open, so the trailing `REF` lands on it and the
    // `N3` had nowhere to go on this route at base either. Untouched here.
    const sub = parse837(
      [...HEADER, CLM, "HI*ABK:J20.9~", "LX*1~", "REF*6R*LINE-CTRL-1~", "N3*1 NOWHERE LANE~"],
      "005010XZZZZZ",
    );
    expect(sub.claims[0]?.references).toEqual([{ qualifier: "6R", value: "LINE-CTRL-1" }]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_UNKNOWN_VARIANT, DROPPED]);
  });

  it("CONTROL: ordinary entity attachment with no LX in play raises nothing", () => {
    const sub = parse837([
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "REF*EI*123456789~",
      "N3*1 CLINIC WAY~",
      "N4*SPRINGFIELD*IL*62701~",
      "PER*IC*CLINIC DESK*TE*5555550122~",
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      CLM,
      "HI*ABK:J20.9~",
      "LX*1~",
      SV1,
    ]);
    expect(sub.claims[0]?.billingProvider?.address?.lines).toEqual(["1 CLINIC WAY"]);
    expect(sub.claims[0]?.billingProvider?.contacts).toHaveLength(1);
    expect(channel(sub)).toEqual([]);
  });

  it("🩺 CONTROL: the three NON-entity trailing kinds stay silent on this route", () => {
    // A `DTP` / `AMT` / `NTE` after the stray `LX` is discarded too, and was
    // discarded at base as well: they never attach to a party. This code
    // reports the FOUR entity segments and states nothing about those three,
    // so a channel carrying only the dropped line is the correct reading here.
    const sub = parse837(
      strayInsideEntityLoop(["DTP*472*D8*20260601~", "AMT*T3*100~", "NTE*ADD*NOTE TEXT~"]),
    );
    expect(channel(sub)).toEqual([DROPPED]);
  });

  it("CONTROL: a real Loop 2400 still takes its own line-level REF, silently", () => {
    const sub = parse837([...HEADER, CLM, "HI*ABK:J20.9~", "LX*1~", SV1, "REF*6R*LINE-CTRL-1~"]);
    expect(sub.claims[0]?.serviceLines[0]?.references).toEqual([
      { qualifier: "6R", value: "LINE-CTRL-1" },
    ]);
    expect(channel(sub)).toEqual([]);
  });
});

/**
 * `X12-837-LOOP-RESIDUALS`: the two original residuals the item pinned, both
 * of them mis-ATTRIBUTION rather than loss. Neither changes what the walker
 * reports; each changes where the thing it reports is said to be.
 *
 * 🩺 **Residual 1, measured at `93b2428`.** An `LX` arriving with no `CLM`
 * open takes its whole Loop 2400 off the model and says so
 * (`X12_837_SERVICE_LINE_DROPPED`). That route then `break`s out of the `LX`
 * case BEFORE the `activeEntity = undefined` reset the other two routes run,
 * so every trailing segment that attaches to a named party attached to
 * whichever party the last `NM1` had left active. Measured on the document
 * below: a line-item control number (`REF*6R`), a street address (`N3` /
 * `N4`) and a contact (`PER`) all landed on the payer - and because that
 * payer accumulator is what the NEXT `CLM` opens against, they surfaced on a
 * LATER claim's `payer`, silently. This is the same defect `#69` recorded as
 * a rejected DRAFT on route 2, sitting unnoticed on route 1 the whole time.
 *
 * **The item names `REF` because that is the instance that was measured. It
 * is not only `REF`:** `N3`, `N4` and `PER` reach the same mutators through
 * the same `activeEntity`, and all four are pinned below. Do not restate this
 * suite as being about the `REF`.
 *
 * 🩺 **Residual 2, measured at `93b2428`.** `X12_837_UNKNOWN_VARIANT` was
 * built with `segmentIndex: 1`. In a transaction-scoped position that is
 * `tx.segments[1]`, and in an 837 that is the **BHT** - a segment with no
 * part in variant resolution. The variant is resolved from **ST-03**, which
 * is `tx.segments[0]`. A consumer joining the warning back to the document
 * was handed the wrong segment.
 *
 * **▶ EVERY ASSERTION ON THE WARNING CHANNEL HERE IS `toEqual` ON THE WHOLE
 * ARRAY**, per this repo's standing rule. It matters more than usual here:
 * the whole claim of both fixes is that the channel is UNCHANGED and only the
 * attribution moved, so a membership test would be unable to observe the one
 * way either fix could do harm, which is by adding or losing a code.
 *
 * **Each lying document is paired with an honest control.** For residual 1
 * those controls are the routes that must NOT change: with a `CLM` open the
 * trailing `REF` still lands on the enclosing claim, an entity-level `REF`
 * with no `LX` in play still lands on its `NM1`, a real Loop 2400 still takes
 * its own line-level `REF`, and a payer named after the stray `LX` still takes
 * its own `N3` and `REF` (the reset is a reset, not a latch; what a party
 * OUTSIDE that scope then receives is per kind and per party, which is why
 * the control measures a payer rather than asserting a general one). For
 * residual 2 the control is a resolvable
 * ST-03, which raises nothing at all.
 *
 * 🩺 **THE FIX IS A TRADE AND ITS COST IS PINNED, NOT ARGUED AWAY.** The TR3s
 * nest Loop 2400 inside Loop 2300 and say nothing about an `LX` anywhere else,
 * so which party a segment following a STRAY `LX` belongs to is **not
 * spec-derivable in either direction** - a first draft of this suite published
 * "nothing following an `LX` is still addressed to the last named party" as
 * though it were a fact about documents, and it is a parser policy. Where the
 * `LX` was injected into an ENTITY loop, the segments after it really were
 * that entity's, and discarding them loses a conformant address, secondary id
 * and contact that base attributed correctly. **That loss has its own case
 * below.** What decides the direction is this repo's own invariant rather than
 * a clause: a mis-attribution puts a value on an object the sender never put
 * it on, indistinguishable from real data, while a discard leaves the bytes
 * verbatim on `tx.segments`.
 *
 * **What this suite does NOT own, and what changed under it.** `#72` added no
 * warning code, and the discard above shipped SILENT. That silence was the
 * `X12-DISCARD-AFTER-STRAY-LX` residual and it is now CLOSED: each discarded
 * `N3` / `N4` / `PER` / `REF` raises
 * `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, anchored at the discarded
 * segment. The channel assertions below carry it because they are whole-array
 * assertions, which is exactly what they are for. **The code and its bound are
 * owned by `transactions-claim-837-discard-after-stray-lx.test.ts`, not here**;
 * what this suite still owns is the ATTRIBUTION, and that is unchanged.
 * `X12_837_SERVICE_LINE_DROPPED` still reports the SERVICE LINE's loss and
 * names no entity segment, so it never reported the discard and does not now.
 * And no `elementIndex` is added to the variant warning: one of that code's two
 * routes is an ST-03 that is absent entirely, where the `ST` has no element 3
 * to name. That is measured below, not assumed.
 *
 * 🩺 **Still open and NOT touched here:** an absent `SV1-02` on a line that
 * DID open still reads a confident `0`, which closes only with the deferred
 * `X12Decimal | undefined` slice; and with no caller `type` and an ST-03
 * outside `VARIANT_BY_ICR`'s keys, variant resolution still falls back to the
 * first `SVx` anywhere in the body, orphans included.
 *
 * Only bytes can produce these cases: no builder emits an `LX` outside a
 * claim, and none emits an unresolvable ST-03. All data is synthetic.
 */

import { describe, expect, it } from "vitest";

import { WARNING_CODES, get837Claims, parseX12 } from "../src/index.js";
import type { X12TransactionSet, X12_837Submission } from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/** 2000A + 2000B, no claim yet. */
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
 * The four trailing entity segment kinds this suite sends after the stray
 * `LX`. Named for what they are, not for what they would otherwise reach:
 * which of them this reader surfaces on a given party varies by kind and by
 * party, and every document below names a payer, which surfaces all three of
 * an address, a reference and a contact.
 */
const TRAILING_REF = "REF*6R*LINE-CTRL-1~";
const TRAILING_N3 = "N3*1 ORPHAN WAY~";
const TRAILING_N4 = "N4*SPRINGFIELD*IL*62701~";
const TRAILING_PER = "PER*IC*ORPHAN CONTACT*TE*5555550100~";

interface Parsed {
  readonly sub: X12_837Submission;
  readonly tx: X12TransactionSet;
}

/**
 * `icr` is `string | null` and NOT `string | undefined` on purpose: a JS
 * default parameter fires on an explicit `undefined`, so an
 * `omit-the-ST-03` case written that way silently parses the DEFAULT
 * `005010X222A2` instead and the test grades a document it never built. That
 * is exactly what a first draft of this file did, and the case passed for the
 * wrong reason until it was run.
 */
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

// ---------------------------------------------------------------------------
// Residual 1. A trailing segment after a dropped LX does not address the
// last named party.
// ---------------------------------------------------------------------------

describe("X12-837-LOOP-RESIDUALS: a dropped LX closes the entity loop current at it", () => {
  /** Dropped `LX` (no CLM open), then trailing segments, then a real claim. */
  const misfiled = (trailing: readonly string[]): readonly string[] => [
    ...HEADER,
    "LX*1~",
    ...trailing,
    CLM,
    "HI*ABK:J20.9~",
    "LX*2~",
    SV1,
  ];

  it("🩺 a trailing REF no longer lands in a later claim's payer.references", () => {
    const sub = parse837(misfiled([TRAILING_REF]));
    // At `93b2428` this was [{ qualifier: "6R", value: "LINE-CTRL-1" }] - a
    // line-item control number filed as a property of the payer.
    expect(sub.claims[0]?.payer?.references).toEqual([]);
    // The whole channel. The `LX` still reports the dropped line, and the
    // discarded `REF` is now reported at itself as well - the residual
    // `X12-DISCARD-AFTER-STRAY-LX` closed after `#72` shipped this fix.
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX,
    ]);
  });

  it("🩺 a trailing N3 / N4 no longer gives a later claim's payer an address", () => {
    const sub = parse837(misfiled([TRAILING_N3, TRAILING_N4]));
    // At `93b2428`: { lines: ["1 ORPHAN WAY"], city: "SPRINGFIELD", ... }.
    expect(sub.claims[0]?.payer?.address).toBeUndefined();
    // One warning per discarded segment: the `N3` and the `N4` are two losses.
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX,
      WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX,
    ]);
  });

  it("🩺 a trailing PER no longer gives a later claim's payer a contact", () => {
    const sub = parse837(misfiled([TRAILING_PER]));
    // At `93b2428`: [{ contactFunctionCode: "IC", name: "ORPHAN CONTACT", … }].
    expect(sub.claims[0]?.payer?.contacts).toEqual([]);
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX,
    ]);
  });

  it("🩺 all four together leave the payer byte-identical to one that never saw them", () => {
    // The composite case, and the strongest form of the claim: the payer on
    // the later claim is indistinguishable from the payer on the same
    // document with the trailing segments simply absent.
    const withTrailing = parse837(misfiled([TRAILING_REF, TRAILING_N3, TRAILING_N4, TRAILING_PER]));
    const without = parse837(misfiled([]));
    expect(withTrailing.claims[0]?.payer).toEqual(without.claims[0]?.payer);
    // The MODEL is indistinguishable; the CHANNEL is not, and must not be -
    // four discarded segments are four reports, and the document without them
    // has nothing to report. That difference is the whole point of the code.
    expect(channel(without)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_DROPPED]);
    expect(channel(withTrailing)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      ...Array<string>(4).fill(WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX),
    ]);
  });

  it("🩺 the trailing segments are DISCARDED, not re-filed onto the following claim", () => {
    // The bound two drafts of `#69`'s prose stated in OPPOSITE directions.
    // On this route they go nowhere: not to the party, and not to the claim
    // that opens afterwards either. Retention is unchanged - the bytes are
    // still on `tx.segments`, asserted in the next case.
    const { sub } = parseWithTx(misfiled([TRAILING_REF, TRAILING_N3, TRAILING_N4, TRAILING_PER]));
    expect(sub.claims[0]?.references).toEqual([]);
    expect(sub.claims[0]?.payer?.references).toEqual([]);
    expect(sub.claims[0]?.payer?.address).toBeUndefined();
    expect(sub.claims[0]?.payer?.contacts).toEqual([]);
  });

  it("retention is unchanged: every trailing segment is still verbatim on tx.segments", () => {
    const { tx } = parseWithTx(misfiled([TRAILING_REF, TRAILING_N3, TRAILING_N4, TRAILING_PER]));
    const raws = tx.segments.map((s) => s.raw);
    for (const seg of [TRAILING_REF, TRAILING_N3, TRAILING_N4, TRAILING_PER]) {
      expect(raws).toContain(seg.slice(0, -1));
    }
  });

  it("the claim that follows still decodes its own Loop 2400 normally", () => {
    // The reset must not disturb anything downstream of it.
    const sub = parse837(misfiled([TRAILING_REF, TRAILING_N3, TRAILING_N4, TRAILING_PER]));
    expect(sub.claims).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines[0]?.charge.toString()).toBe("8500");
    expect(sub.claims[0]?.serviceLines[0]?.units.toString()).toBe("4");
  });
});

describe("X12-837-LOOP-RESIDUALS: the cost of the reset, pinned as a residual", () => {
  it("🩺 RESIDUAL: a stray LX inside an ENTITY loop discards that entity's OWN segments", () => {
    // The measured price of the fix, and it is not exotic: base
    // mis-attributes only when an `NM1` precedes the `LX` with no intervening
    // `HL` or `CLM`, which is exactly this shape - so the motivating document
    // class IS the ambiguous one. Everything after the stray `LX` here is
    // conformant Loop 2010BB content that genuinely belongs to the payer.
    //
    // At `93b2428` this payer came back with `PO BOX 1 / PAYERTOWN IL 62701`,
    // a `2U` secondary id and a contact, all correct. At head all three are
    // gone. **This case asserts the LOSS.** If a later slice decides the trade
    // the other way, or narrows the reset to line-level segments only, this
    // goes red - which is the point of writing it.
    const sub = parse837([
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      "LX*1~",
      "N3*PO BOX 1~",
      "N4*PAYERTOWN*IL*62701~",
      "REF*2U*PAYER-SEC-ID~",
      "PER*IC*PAYER DESK*TE*5555550111~",
      CLM,
      "HI*ABK:J20.9~",
      "LX*2~",
      SV1,
    ]);
    expect(sub.claims[0]?.payer?.address).toBeUndefined();
    expect(sub.claims[0]?.payer?.references).toEqual([]);
    expect(sub.claims[0]?.payer?.contacts).toEqual([]);
    // 🩺 And the channel DOES name this loss now, once per discarded segment.
    // `X12_837_SERVICE_LINE_DROPPED` still reports only the service line;
    // what tells a consumer these four segments reached no party is
    // `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` at each of them. Pinned here
    // as well as in its own suite so the disclosure in `KNOWN-LIMITATIONS.md`
    // cannot quietly go stale in either direction.
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      ...Array<string>(4).fill(WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX),
    ]);
  });

  it("the discarded entity segments are still verbatim on tx.segments", () => {
    // The reason a discard is the tolerable half of the trade: nothing is
    // destroyed, only unplaced.
    const { tx } = parseWithTx([
      ...HEADER,
      "LX*1~",
      "N3*PO BOX 1~",
      "REF*2U*PAYER-SEC-ID~",
      CLM,
      "HI*ABK:J20.9~",
      "LX*2~",
      SV1,
    ]);
    const raws = tx.segments.map((s) => s.raw);
    expect(raws).toContain("N3*PO BOX 1");
    expect(raws).toContain("REF*2U*PAYER-SEC-ID");
  });
});

describe("X12-837-LOOP-RESIDUALS: the controls the reset must NOT change", () => {
  it("CONTROL: with a CLM open, a dropped LX's trailing REF still lands on the claim", () => {
    // Route 2 of `X12_837_SERVICE_LINE_DROPPED`: the claim IS open and the
    // variant is what could not be resolved, so `activeEntity` was already
    // reset at base and the REF falls through to the enclosing claim. This is
    // the route-DEPENDENCE `#69` recorded, and it is deliberately untouched.
    const sub = parse837(
      [...HEADER, CLM, "HI*ABK:J20.9~", "LX*1~", TRAILING_REF, TRAILING_N3],
      "005010XZZZZZ",
    );
    expect(sub.claims[0]?.references).toEqual([{ qualifier: "6R", value: "LINE-CTRL-1" }]);
    // The N3 had nowhere to go on this route at base either.
    expect(sub.claims[0]?.payer?.address).toBeUndefined();
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_UNKNOWN_VARIANT,
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
    ]);
  });

  it("CONTROL: an entity-level REF with no LX in play still attaches to its NM1", () => {
    // The reset is scoped to the dropped-LX route. Ordinary trailing
    // attachment - a 2010AA employer id after the billing provider's NM1 -
    // is untouched. A guard that disabled `activeEntity` generally would red
    // exactly here.
    const sub = parse837([
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "REF*EI*123456789~",
      "N3*1 CLINIC WAY~",
      "N4*SPRINGFIELD*IL*62701~",
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      CLM,
      "HI*ABK:J20.9~",
      "LX*1~",
      SV1,
    ]);
    expect(sub.claims[0]?.billingProvider?.references).toEqual([
      { qualifier: "EI", value: "123456789" },
    ]);
    expect(sub.claims[0]?.billingProvider?.address?.lines).toEqual(["1 CLINIC WAY"]);
    expect(channel(sub)).toEqual([]);
  });

  it("CONTROL: a real Loop 2400 still takes its own line-level REF", () => {
    const sub = parse837([...HEADER, CLM, "HI*ABK:J20.9~", "LX*1~", SV1, TRAILING_REF]);
    expect(sub.claims[0]?.serviceLines[0]?.references).toEqual([
      { qualifier: "6R", value: "LINE-CTRL-1" },
    ]);
    expect(channel(sub)).toEqual([]);
  });

  it("CONTROL: the reset is a reset, not a latch - the next NM1's payer takes its own segments", () => {
    // The failure mode this shape invites, and the same one
    // `droppedLineReported` had to avoid: a dropped `LX` must not make every
    // subsequent party in the transaction unaddressable. No intervening `HL`,
    // so the only thing that can have re-armed attachment is the `NM1`
    // itself. The payer below ends up carrying its OWN `REF*2U` and NOT the
    // discarded `REF*6R`, on the same accumulator - which is the whole claim
    // of this fix in one object.
    const sub = parse837([
      ...HEADER,
      "LX*1~",
      TRAILING_REF,
      "NM1*PR*2*PAYER TWO*****PI*PAYER02~",
      "N3*9 PAYER PLAZA~",
      "N4*SPRINGFIELD*IL*62701~",
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
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    // The discarded `REF*6R` before the new `NM1` is reported; nothing after
    // it is, because that `NM1` ended the scope. The reset is not a latch and
    // neither is the warning.
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      WARNING_CODES.X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX,
    ]);
  });
});

// ---------------------------------------------------------------------------
// Residual 2. X12_837_UNKNOWN_VARIANT anchors at the ST.
// ---------------------------------------------------------------------------

describe("X12-837-LOOP-RESIDUALS: X12_837_UNKNOWN_VARIANT anchors at the ST, not the BHT", () => {
  it("🩺 the position resolves through tx.segments to the ST", () => {
    const { sub, tx } = parseWithTx(HEADER, "005010XZZZZZ");
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_UNKNOWN_VARIANT]);
    const position = sub.warnings[0]?.position;
    expect(position?.segmentIndex).toBe(0);
    // The property, not just the literal: whatever the index is, the segment
    // it names must be the one carrying ST-03.
    expect(tx.segments[position?.segmentIndex ?? -1]?.id).toBe("ST");
    expect(tx.segments[position?.segmentIndex ?? -1]?.elements[3]).toBe("005010XZZZZZ");
  });

  it("🩺 it is NOT the BHT, which is what index 1 names in this document", () => {
    // The honest half of the pairing: this pins that index 1 really is the
    // BHT here, so the base value was not merely a different convention.
    const { sub, tx } = parseWithTx(HEADER, "005010XZZZZZ");
    expect(tx.segments[1]?.id).toBe("BHT");
    expect(sub.warnings[0]?.position.segmentIndex).not.toBe(1);
  });

  it("🩺 an ST with NO ST-03 at all anchors identically, and has no element 3 to name", () => {
    // This is the measurement that grounds leaving `elementIndex` off. On
    // this route the ST is `["ST", "837", "0001"]`, so an `elementIndex: 3`
    // would point a consumer at a slot that is not on the wire.
    const { sub, tx } = parseWithTx(HEADER, null);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_UNKNOWN_VARIANT]);
    expect(tx.st.elements).toEqual(["ST", "837", "0001"]);
    expect(tx.st.elements[3]).toBeUndefined();
    expect(sub.warnings[0]?.position.segmentIndex).toBe(0);
    expect(tx.segments[0]?.id).toBe("ST");
  });

  it("no elementIndex is set on either route", () => {
    expect(
      parseWithTx(HEADER, "005010XZZZZZ").sub.warnings[0]?.position.elementIndex,
    ).toBeUndefined();
    expect(parseWithTx(HEADER, null).sub.warnings[0]?.position.elementIndex).toBeUndefined();
  });

  it("CONTROL: a resolvable ST-03 raises nothing at all", () => {
    const { sub } = parseWithTx([...HEADER, CLM, "HI*ABK:J20.9~", "LX*1~", SV1], "005010X222A2");
    expect(channel(sub)).toEqual([]);
    expect(sub.variant).toBe("P");
  });

  it("the warning still carries the registry message verbatim", () => {
    // The anchor moved; nothing about the message did.
    const { sub } = parseWithTx(HEADER, "005010XZZZZZ");
    expect(sub.warnings[0]?.message).toContain("837 variant could not be resolved");
    expect(sub.warnings[0]?.message).not.toContain("005010XZZZZZ");
  });
});

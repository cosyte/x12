/**
 * `X12-837-SV1-OVERWRITE`: a SECOND service segment inside an ALREADY-OPEN
 * Loop 2400 replaced the first's charge and procedure code, on no channel.
 *
 * 🩺 **What that cost, measured at `159a62c` and byte-identical at `c758bcd`
 * before it, so `#87` neither caused it nor closed it.** Under a resolving
 * `ST-03` of `005010X222A2`, `SV1*HC:99213*8500*UN*4***1~` followed by
 * `SV1*HC:99999*12*UN*1***1~` inside one `LX` left ONE service line reading
 * `charge` **`12`** and `procedureCode` **`99999`**, with `warnings: []`.
 * `8500` became `12`; CPT `99213` became `99999`; nothing was raised. Every
 * decoder writes ALL of the slots its kind writes, so the replacement is
 * total rather than a merge, and the worse corner is pinned below: where the
 * repeat's own charge element is ABSENT it writes `undefined` over a stated
 * amount, and the line still does not raise
 * `X12_837_SERVICE_LINE_NOT_DECODED`, because a service segment DID decode.
 *
 * **▶ 🛑 THIS SLICE CLOSES ONLY THE SILENCE, AND THE RESTRAINT IS THE POINT.**
 * The decode is NOT narrowed: the last matching service segment still wins,
 * element for element, exactly as it did at `0.0.13`. Every value case below
 * asserts the decoded reading, so a later change to first-wins reds this
 * suite rather than slipping through. Two reasons, and they are the same two
 * `X12-837-AMBIGUOUS-VARIANT` and `#71` gave for not narrowing the fallback
 * on this same segment family: this reader cannot tell a stray service
 * segment from a conformant one, so picking a winner would be inventing; and
 * changing which one wins changes how ALREADY-PUBLISHED documents decode.
 *
 * **▶ EVERY ASSERTION ON THE WARNING CHANNEL HERE IS `toEqual` ON THE WHOLE
 * ARRAY.** A membership test cannot observe a silence ending, and it cannot
 * observe the new code OVER-firing onto a document that was already reported
 * correctly - which is the one way this change could make the channel worse.
 * Both directions need the whole array, and the additivity claim is exactly a
 * claim about the whole array, so it is asserted as one.
 *
 * **Every reporting document is paired with an honest control** in the same
 * shape: one service segment, or the same two split across two `LX`s. A guard
 * keyed on the wrong thing - on the count of `SVx` in the transaction, on the
 * count in a claim, or on a latch that never resets - fires on a control.
 *
 * Only bytes can produce these cases: no builder emits two service segments
 * in one Loop 2400. All data is synthetic.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  get837Claims,
  parseX12,
  serviceSegmentRepeated,
} from "../src/index.js";
import type { X12TransactionSet, X12_837Submission } from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/** A marker planted in wire bytes, to prove no diagnostic quotes them back. */
const MARKER = "ZZMARKERZZ";

const REPEATED = WARNING_CODES.X12_837_SERVICE_SEGMENT_REPEATED;
const NOT_DECODED = WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED;
const WITHOUT_LX = WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX;
const DROPPED = WARNING_CODES.X12_837_SERVICE_LINE_DROPPED;
const AMBIGUOUS = WARNING_CODES.X12_837_AMBIGUOUS_VARIANT;
const UNPARSEABLE = WARNING_CODES.X12_UNPARSEABLE_DECIMAL;

/** The two Professional service segments the headline is about. */
const SV1_FIRST = "SV1*HC:99213*8500*UN*4***1~";
const SV1_REPEAT = "SV1*HC:99999*12*UN*1***1~";
/** A repeat whose own charge element (SV1-02) is ABSENT. */
const SV1_REPEAT_NO_CHARGE = "SV1*HC:99214**UN*1***1~";
const SV2_FOREIGN = "SV2*0300*HC:99214*7300*UN*2~";
const SV3_FOREIGN = "SV3*AD:D1110*6100**11*1*1~";

/**
 * An ST-03 `get837Claims` turns into no variant, so the `SVx` fall-back is
 * what decides. The ASC X12N **4010** addenda reference for professional
 * claims, named at 45 CFR 162.1102(a)(3); this library's v1 scope is 005010
 * only. Through `0.0.13` this case used `005010X222A1`, which is the errata
 * production 837Ps actually carry in ST-03 and which now RESOLVES - see
 * `documentation/agent-notes/x12-variant-icr-ungrounded.md`.
 */
const UNRESOLVED_ICR = "004010X098A1";

interface Parsed {
  readonly sub: X12_837Submission;
  readonly tx: X12TransactionSet;
}

/**
 * `icr` is placed in ST-03 verbatim; pass `""` for a transaction set whose
 * ST-03 is absent altogether (`ST*837*0001~`).
 */
function parse837(
  icr: string,
  body: readonly string[],
  opts?: { readonly type?: "P" | "I" | "D" },
): Parsed {
  const st = icr === "" ? "ST*837*0001~" : `ST*837*0001*${icr}~`;
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
  const sub = get837Claims(ix.delimiters, tx, opts);
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return { sub, tx };
}

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

/** 2000A + 2000B + a CLM, parameterised by what follows the claim header. */
function claimBody(trailing: readonly string[]): readonly string[] {
  return [...HEADER, CLM, "HI*ABK:J20.9~", ...trailing];
}

/** THE WHOLE CHANNEL. Never a membership test. */
function channel(sub: X12_837Submission): string[] {
  return sub.warnings.map((w) => w.code);
}

/**
 * The one line the claim carries, as the four slots this item is about. A
 * probe that reads a shape the model does not have measures nothing, so this
 * reads the slots off `submission.claims[].serviceLines[]` exactly as the
 * published model nests them.
 */
interface LineSlots {
  readonly charge: string | undefined;
  readonly units: string | undefined;
  readonly procedureCode: string | undefined;
  readonly unitOfMeasure: string | undefined;
}

function line(sub: X12_837Submission, index = 0): LineSlots {
  const l = sub.claims[0]?.serviceLines[index];
  if (l === undefined) throw new Error(`no service line at index ${String(index)}`);
  return {
    charge: l.charge?.toString(),
    units: l.units?.toString(),
    procedureCode: l.procedureCode,
    unitOfMeasure: l.unitOfMeasure,
  };
}

// ---------------------------------------------------------------------------
// 1. The headline: money and a CPT code replaced, and now reported.

describe("X12_837_SERVICE_SEGMENT_REPEATED: a second service segment in one Loop 2400", () => {
  it("reports the repeat that replaced an 8500 charge and CPT 99213", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT]));

    expect(channel(sub)).toEqual([REPEATED]);
    // The reading is UNCHANGED from 0.0.13, deliberately. This is the whole
    // restraint: what was silent is now reported, and nothing decodes
    // differently. A change to first-wins reds this assertion.
    expect(line(sub)).toEqual({
      charge: "12",
      units: "1",
      procedureCode: "99999",
      unitOfMeasure: "UN",
    });
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
  });

  it("anchors at the repeated service segment itself, with no elementIndex", () => {
    const { sub, tx } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT]));
    const w = sub.warnings[0];

    // tx.segments: ST 0, BHT 1, HL 2, NM1*85 3, HL 4, SBR 5, NM1*IL 6,
    // NM1*PR 7, CLM 8, HI 9, LX 10, SV1 11, SV1 12.
    expect(w?.position).toEqual({ segmentIndex: 12, transactionIndex: 0 });
    expect(tx.segments[12]?.id).toBe("SV1");
    expect(w?.position.elementIndex).toBeUndefined();
    expect(w).toEqual(serviceSegmentRepeated({ segmentIndex: 12, transactionIndex: 0 }));
    expect(ALL_WARNING_MESSAGES.has(w?.message ?? "")).toBe(true);
  });

  it("CONTROL: one service segment in the loop stays silent and decodes the stated charge", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST]));

    expect(channel(sub)).toEqual([]);
    expect(line(sub)).toEqual({
      charge: "8500",
      units: "4",
      procedureCode: "99213",
      unitOfMeasure: "UN",
    });
  });

  it("CONTROL: the same two service segments under two LXs are two lines and silent", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST, "LX*2~", SV1_REPEAT]));

    expect(channel(sub)).toEqual([]);
    expect(sub.claims[0]?.serviceLines).toHaveLength(2);
    expect(line(sub, 0).charge).toBe("8500");
    expect(line(sub, 1).charge).toBe("12");
  });
});

// ---------------------------------------------------------------------------
// 2. The worse corner: a repeat that BLANKS a stated amount.

describe("a repeat whose own charge element is absent", () => {
  it("writes undefined over the stated 8500 and reports it", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT_NO_CHARGE]));

    expect(channel(sub)).toEqual([REPEATED]);
    expect(line(sub)).toEqual({
      charge: undefined,
      units: "1",
      procedureCode: "99214",
      unitOfMeasure: "UN",
    });
  });

  it("and X12_837_SERVICE_LINE_NOT_DECODED does NOT fire, because a service segment DID decode", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT_NO_CHARGE]));

    // `charge: undefined` on this line therefore does NOT come with the code
    // that usually explains an undecoded charge. This warning is the only
    // thing on the channel that names what happened.
    expect(channel(sub)).not.toContain(NOT_DECODED);
    expect(channel(sub)).toEqual([REPEATED]);
  });

  it("CONTROL: that same sparse segment as the ONLY one in its loop is silent", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_REPEAT_NO_CHARGE]));

    expect(channel(sub)).toEqual([]);
    expect(line(sub).charge).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. A repeat of a kind the resolved variant does NOT match.

describe("a service segment of a foreign kind inside an open Loop 2400", () => {
  it("reports it, and it overwrites nothing", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST, SV2_FOREIGN]));

    expect(channel(sub)).toEqual([REPEATED]);
    expect(line(sub)).toEqual({
      charge: "8500",
      units: "4",
      procedureCode: "99213",
      unitOfMeasure: "UN",
    });
  });

  it("reports it when it arrives FIRST, and the matching one still decodes", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV2_FOREIGN, SV1_FIRST]));

    // The flag is set by the FIRST service segment to arrive, decoded or not.
    // Keying it on the decoded flag instead would leave this shape silent.
    expect(channel(sub)).toEqual([REPEATED]);
    expect(line(sub)).toEqual({
      charge: "8500",
      units: "4",
      procedureCode: "99213",
      unitOfMeasure: "UN",
    });
  });

  it("travels with X12_837_SERVICE_LINE_NOT_DECODED where BOTH are foreign", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV2_FOREIGN, SV3_FOREIGN]));

    // Two different losses, two codes, two segments: the repeat at the second
    // service segment, the undecoded line at the LX that opened it.
    expect(channel(sub)).toEqual([REPEATED, NOT_DECODED]);
    const repeat = sub.warnings.find((w) => w.code === REPEATED);
    const undecoded = sub.warnings.find((w) => w.code === NOT_DECODED);
    expect(repeat?.position.segmentIndex).toBe(12);
    expect(undecoded?.position.segmentIndex).toBe(10);
  });

  it("CONTROL: one foreign segment alone raises only the undecoded-line code", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV2_FOREIGN]));

    expect(channel(sub)).toEqual([NOT_DECODED]);
  });
});

// ---------------------------------------------------------------------------
// 4. Once per repeat, and the count is scoped to the line.

describe("counting", () => {
  it("three service segments in one Loop 2400 are TWO warnings at two positions", () => {
    const { sub } = parse837(
      "005010X222A2",
      claimBody(["LX*1~", SV1_FIRST, "SV1*HC:99214*40*UN*1***1~", SV1_REPEAT]),
    );

    expect(channel(sub)).toEqual([REPEATED, REPEATED]);
    expect(sub.warnings.map((w) => w.position.segmentIndex)).toEqual([12, 13]);
    expect(line(sub).charge).toBe("12");
  });

  it("the count resets with the line: a first segment under a later LX is a first", () => {
    const { sub } = parse837(
      "005010X222A2",
      claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT, "LX*2~", SV1_FIRST]),
    );

    // A LATCHING flag would report the second line's only service segment as
    // a repeat. Exactly one warning, and it names the segment in line 1.
    expect(channel(sub)).toEqual([REPEATED]);
    expect(sub.warnings[0]?.position.segmentIndex).toBe(12);
    expect(sub.claims[0]?.serviceLines).toHaveLength(2);
    expect(line(sub, 1).charge).toBe("8500");
  });

  it("the count resets across claims too", () => {
    const { sub } = parse837(
      "005010X222A2",
      claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT, CLM, "LX*1~", SV1_FIRST]),
    );

    expect(channel(sub)).toEqual([REPEATED]);
    expect(sub.claims).toHaveLength(2);
    expect(sub.claims[1]?.serviceLines[0]?.charge?.toString()).toBe("8500");
  });
});

// ---------------------------------------------------------------------------
// 5. Disjoint from the code for a service segment with NO line open.

describe("disjointness from X12_837_SERVICE_SEGMENT_WITHOUT_LX", () => {
  it("an orphan service segment raises only WITHOUT_LX, never this code", () => {
    const { sub } = parse837("005010X222A2", claimBody([SV1_FIRST, SV1_REPEAT]));

    // No LX ever opened a line, so neither segment is a repeat OF anything on
    // the model: both are orphans, and both are already reported as such.
    expect(channel(sub)).toEqual([WITHOUT_LX, WITHOUT_LX]);
  });

  it("one transaction can carry both codes, on different segments", () => {
    const { sub } = parse837(
      "005010X222A2",
      claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT, CLM, SV1_FIRST]),
    );

    expect(channel(sub)).toEqual([REPEATED, WITHOUT_LX]);
    const repeat = sub.warnings.find((w) => w.code === REPEATED);
    const orphan = sub.warnings.find((w) => w.code === WITHOUT_LX);
    expect(repeat?.position.segmentIndex).not.toBe(orphan?.position.segmentIndex);
  });

  it("an LX that opened NO line keeps its own report and adds none of this one", () => {
    // No CLM open, so the LX drops the line and the service segments that
    // follow find nothing to be a repeat of. The suppression that already
    // covered them is untouched.
    const { sub } = parse837("005010X222A2", [...HEADER, "LX*1~", SV1_FIRST, SV1_REPEAT]);

    expect(channel(sub)).toEqual([DROPPED]);
  });
});

// ---------------------------------------------------------------------------
// 6. Institutional and Dental reach it on their own segments.

describe("every variant", () => {
  it("reports two SV2 in one Loop 2400 under an Institutional submission", () => {
    const { sub } = parse837(
      "005010X223A3",
      claimBody(["LX*1~", "SV2*0300*HC:99213*7300*UN*2~", "SV2*0450*HC:99999*15*UN*1~"]),
    );

    expect(channel(sub)).toEqual([REPEATED]);
    expect(line(sub)).toEqual({
      charge: "15",
      units: "1",
      procedureCode: "99999",
      unitOfMeasure: "UN",
    });
  });

  it("reports two SV3 in one Loop 2400 under a Dental submission", () => {
    const { sub } = parse837(
      "005010X224A2",
      claimBody(["LX*1~", "SV3*AD:D1110*6100**11*1*1~", "SV3*AD:D9999*9**11*1*2~"]),
    );

    expect(channel(sub)).toEqual([REPEATED]);
    expect(line(sub).charge).toBe("9");
    expect(line(sub).units).toBe("2");
    expect(line(sub).procedureCode).toBe("D9999");
  });

  it("reaches it on the caller `type` route, with no ST-03 at all", () => {
    const { sub } = parse837("", claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT]), { type: "P" });

    // The report does not depend on how the variant resolved, so it is pinned
    // on a route that reads no ST-03 whatsoever.
    expect(channel(sub)).toEqual([REPEATED]);
    expect(line(sub).charge).toBe("12");
  });
});

// ---------------------------------------------------------------------------
// 7. Additivity: nothing moved onto this code.

describe("additivity", () => {
  /**
   * The invariance claim, asserted the only way it can be: the whole channel
   * with the new code filtered out is what the whole channel was. Read it as
   * invariance and NOT as a list of what else a document of this shape will
   * show - it promises that whatever was raised is still raised, at the same
   * position, and nothing more.
   */
  const CASES: readonly { readonly name: string; readonly body: readonly string[] }[] = [
    { name: "two SV1 in one loop", body: claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT]) },
    { name: "foreign then matching", body: claimBody(["LX*1~", SV2_FOREIGN, SV1_FIRST]) },
    { name: "both foreign", body: claimBody(["LX*1~", SV2_FOREIGN, SV3_FOREIGN]) },
    { name: "orphans only", body: claimBody([SV1_FIRST, SV1_REPEAT]) },
    { name: "dropped LX", body: [...HEADER, "LX*1~", SV1_FIRST, SV1_REPEAT] },
    { name: "one segment", body: claimBody(["LX*1~", SV1_FIRST]) },
  ];

  const EXPECTED: readonly (readonly string[])[] = [
    [],
    [],
    [NOT_DECODED],
    [WITHOUT_LX, WITHOUT_LX],
    [DROPPED],
    [],
  ];

  it.each(CASES.map((c, i) => ({ ...c, expected: EXPECTED[i] ?? [] })))(
    "$name: the channel with the new code filtered out is unchanged",
    ({ body, expected }) => {
      const { sub } = parse837("005010X222A2", body);
      expect(channel(sub).filter((c) => c !== REPEATED)).toEqual(expected);
    },
  );

  it("does not change any decoded value on a document that raises it", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT]));

    // Every reading here is the one `0.0.13` produced for these bytes.
    expect(sub.variant).toBe("P");
    expect(sub.claims[0]?.totalCharge?.toString()).toBe("8500");
    expect(line(sub)).toEqual({
      charge: "12",
      units: "1",
      procedureCode: "99999",
      unitOfMeasure: "UN",
    });
  });

  it("leaves X12_UNPARSEABLE_DECIMAL exactly where it was", () => {
    const { sub } = parse837(
      "005010X222A2",
      claimBody(["LX*1~", SV1_FIRST, "SV1*HC:99214*NOTANUMBER*UN*1***1~"]),
    );

    // The decimal channel is unchanged and this code is added beside it. The
    // repeat is recorded before the decode is attempted, so it precedes the
    // decimal warning its own bytes produce; filtering it out leaves exactly
    // the channel these bytes produced at `0.0.13`.
    expect(channel(sub)).toEqual([REPEATED, UNPARSEABLE]);
    expect(channel(sub).filter((c) => c !== REPEATED)).toEqual([UNPARSEABLE]);
    expect(line(sub).charge).toBeUndefined();
  });

  it("🩺 and that pair sits at the SAME segmentIndex, separated only by elementIndex", () => {
    // 🛑 A DRAFT OF FOUR PUBLISHED SURFACES SAID THESE TRAVEL "each on its own
    // segment", AND A REFUTER MEASURED IT FALSE. `X12_UNPARSEABLE_DECIMAL`
    // raised by the REPEAT's own amount element names the repeat, so the two
    // codes name ONE segment. Only the decimal code's `elementIndex`
    // separates them, and this package's own amount-row codes make that
    // discriminant load-bearing on the money channel, so the wording had to
    // be corrected rather than left to be inferred. Pinned literally.
    const { sub } = parse837(
      "005010X222A2",
      claimBody(["LX*1~", SV1_FIRST, "SV1*HC:99214*NOTANUMBER*UN*1***1~"]),
    );

    const repeat = sub.warnings.find((w) => w.code === REPEATED);
    const decimal = sub.warnings.find((w) => w.code === UNPARSEABLE);
    expect(repeat?.position).toEqual({ segmentIndex: 12, transactionIndex: 0 });
    expect(decimal?.position).toEqual({ segmentIndex: 12, transactionIndex: 0, elementIndex: 2 });
    expect(repeat?.position.segmentIndex).toBe(decimal?.position.segmentIndex);
    expect(repeat?.position.elementIndex).toBeUndefined();
  });

  it("travels with X12_837_AMBIGUOUS_VARIANT without either changing the other", () => {
    // ST-03 that resolves to nothing this library knows, so the fallback
    // decides: first-wins takes the SV1, and the SV2 both contradicts the
    // resolution and repeats inside the open line.
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV1_FIRST, SV2_FOREIGN]));

    expect(channel(sub)).toEqual([AMBIGUOUS, REPEATED]);
    expect(sub.variant).toBe("P");
    expect(line(sub).charge).toBe("8500");
  });
});

// ---------------------------------------------------------------------------
// 8. The package's own docs are a consumer, and this one was blind.

describe("the published 'gate before you post a line amount' recipe", () => {
  /**
   * 🛑 `#83` was refuted for shipping a widening that left a published recipe
   * gating on a code the case had moved OFF. Nothing moves here, but the
   * mirror-image hazard is real and is what this pins: the recipe named four
   * codes and NONE of them fires on the overwrite document, so a consumer
   * following it posted `12` for a line the sender also sent as `8500`. The
   * cookbook now names this code beside the other four.
   */
  const RECIPE_AT_0_0_13: readonly string[] = [
    NOT_DECODED,
    UNPARSEABLE,
    WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    WARNING_CODES.X12_STATED_AMOUNT_DISCARDED,
  ];
  const RECIPE_NOW: readonly string[] = [...RECIPE_AT_0_0_13, REPEATED];

  it("was blind to the overwrite document, and is not now", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST, SV1_REPEAT]));
    const codes = channel(sub);

    expect(codes.some((c) => RECIPE_AT_0_0_13.includes(c))).toBe(false);
    expect(codes.some((c) => RECIPE_NOW.includes(c))).toBe(true);
    // And the amount a consumer would have posted off the model is not the
    // one the first service segment stated.
    expect(line(sub).charge).toBe("12");
  });

  it("CONTROL: neither gate fires on a clean single-segment line", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1_FIRST]));
    const codes = channel(sub);

    expect(codes.some((c) => RECIPE_AT_0_0_13.includes(c))).toBe(false);
    expect(codes.some((c) => RECIPE_NOW.includes(c))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. Registry + PHI.

describe("registry and diagnostic surface", () => {
  it("is a registered Tier-2 code whose message is a frozen registry entry", () => {
    const w = serviceSegmentRepeated({ segmentIndex: 9, transactionIndex: 0 });

    expect(w.code).toBe(REPEATED);
    expect(WARNING_CODES.X12_837_SERVICE_SEGMENT_REPEATED).toBe("X12_837_SERVICE_SEGMENT_REPEATED");
    expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    expect(w.position).toEqual({ segmentIndex: 9, transactionIndex: 0 });
  });

  it("quotes no document bytes back", () => {
    const { sub } = parse837(
      "005010X222A2",
      claimBody(["LX*1~", SV1_FIRST, `SV1*HC:${MARKER}*12*UN*1***1~`]),
    );

    expect(channel(sub)).toEqual([REPEATED]);
    for (const w of sub.warnings) {
      expect(w.message).not.toContain(MARKER);
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    }
  });
});

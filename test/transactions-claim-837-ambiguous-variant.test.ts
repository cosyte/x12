/**
 * `X12-837-AMBIGUOUS-VARIANT`: an 837 whose variant was decided by the SVx
 * fall-back, in a body that carries service segments for more than one
 * variant, said nothing about it on any channel.
 *
 * 🩺 **What that cost, measured at `c758bcd`.** Variant resolution runs
 * before the walk as `explicitType ?? variantFromIcr ?? variantFromSegment`.
 * Absent a caller `type` option, and where ST-03 names no implementation
 * convention this library recognises, it falls back to
 * the FIRST `SV1` / `SV2` / `SV3` in the transaction body, orphans included.
 * So one stray `SV2` ahead of a conformant Professional claim re-types the
 * WHOLE submission Institutional: `submission.variant` reads `"I"`, and a
 * consumer routing on that field sends a Professional claim down an
 * Institutional path. The line-level losses were reported; the submission
 * -level typing that caused them was not, and `submission.variant` carried no
 * hint that it had been contested.
 *
 * **▶ THIS SLICE CLOSES ONLY THE SILENCE.** The fall-back is NOT narrowed and
 * first-wins is unchanged: which variant is resolved, which lines decode and
 * which warnings the walk raises are byte-for-byte what they were at
 * `0.0.13`. Narrowing the fall-back would change how already-published
 * documents decode and is its own slice, refused here deliberately.
 *
 * **▶ EVERY ASSERTION ON THE WARNING CHANNEL HERE IS `toEqual` ON THE WHOLE
 * ARRAY.** That is the lesson `#67` paid for: a pin on "it is silent" that
 * reads one code cannot observe the silence ending, and a pin that reads one
 * code cannot observe a case MOVING onto a new one. The additivity claim is
 * exactly a claim about the whole channel, so it is asserted as one.
 *
 * **Every conflicting document is paired with an honest control** whose body
 * names one variant only, because the claim is that the code reports the
 * fall-back's own ambiguity and nothing else. A guard keyed on the wrong
 * thing would fire on a control.
 *
 * Only bytes can produce these cases: no builder emits a mixed-variant 837.
 * All data is synthetic.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  ambiguous837Variant,
  get837Claims,
  parseX12,
} from "../src/index.js";
import type { X12TransactionSet, X12_837Submission } from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/** A marker planted in wire bytes, to prove no diagnostic quotes them back. */
const MARKER = "ZZMARKERZZ";

const SV1 = "SV1*HC:99213*8500*UN*4***1~";
const SV2 = "SV2*0300*HC:99213*7300*UN*2~";
const SV3 = "SV3*AD:D1110*6100**11*1*1~";

/**
 * An ST-03 `get837Claims` turns into no variant, so every case below is
 * decided by the `SVx` fall-back. It is the ASC X12N **4010** addenda
 * reference for professional claims, named verbatim at 45 CFR 162.1102(b)
 * - a real identifier of a version this library's v1 scope deliberately
 * excludes (005010 only). A 4010 reference is NOT read as `"P"`, and that
 * is a property of the scope, not an oversight.
 *
 * **🩺 Through `0.0.16` this file used `005010X222A1` for this job, and
 * that was the defect `X12-VARIANT-ICR-UNGROUNDED` closed.** `005010X222A1`
 * is the June 2010 errata that CMS and state Medicaid companion guides
 * require in ST-03 on a production 837P, so the fall-back below was the
 * NORMAL path on real professional traffic rather than the exception. It
 * resolves now. Sources:
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

/** 2000A + 2000B + a CLM, parameterised by what follows the claim header. */
function claimBody(trailing: readonly string[]): readonly string[] {
  return [
    "HL*1**20*1~",
    "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
    "HL*2*1*22*0~",
    "SBR*P*18*GROUP123******MB~",
    "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
    "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
    "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
    "HI*ABK:J20.9~",
    ...trailing,
  ];
}

/** THE WHOLE CHANNEL. Never a membership test. */
function channel(sub: X12_837Submission): string[] {
  return sub.warnings.map((w) => w.code);
}

const AMBIGUOUS = WARNING_CODES.X12_837_AMBIGUOUS_VARIANT;
const NOT_DECODED = WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED;
const WITHOUT_LX = WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX;
const UNKNOWN_VARIANT = WARNING_CODES.X12_837_UNKNOWN_VARIANT;

/**
 * Every Tier-2 code added after `0.0.13`, which is the release the additivity
 * claim below is measured against. The claim is that a consumer's predicate on
 * a code that EXISTED at `0.0.13` reads exactly the documents it read then, so
 * the filter has to drop each later addition rather than only this suite's own
 * - otherwise the next additive slice reds this suite for being additive,
 * which is the opposite of what it asserts. Additions only; never remove one.
 */
const ADDED_SINCE_0_0_13: ReadonlySet<string> = new Set<string>([
  WARNING_CODES.X12_837_AMBIGUOUS_VARIANT,
  WARNING_CODES.X12_837_SERVICE_SEGMENT_REPEATED,
]);

// ---------------------------------------------------------------------------
// 1. The headline: a stray SVx that re-types the submission now says so.
// ---------------------------------------------------------------------------

describe("X12-837-AMBIGUOUS-VARIANT: a contested SVx fall-back is reported", () => {
  /**
   * The item's own case. An orphan `SV2` sits ahead of the claim, so the
   * fall-back takes `"I"`, and the conformant Professional line that follows
   * decodes nothing. At `0.0.13` this channel was exactly the two line-level
   * codes: the submission-level mis-typing that produced BOTH of them was on
   * no channel at all.
   */
  it("🩺 a stray SV2 ahead of a Professional claim raises it, and the line codes are unchanged", () => {
    const { sub } = parse837(UNRESOLVED_ICR, [
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      SV2,
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
      "HI*ABK:J20.9~",
      "LX*1~",
      SV1,
    ]);
    // Unchanged by this slice, and that is the point: the fall-back is not
    // narrowed, so the whole submission still reads Institutional.
    expect(sub.variant).toBe("I");
    const line = sub.claims[0]?.serviceLines[0];
    expect(line).toBeDefined();
    expect(line?.charge).toBeUndefined();
    expect(line?.units).toBeUndefined();
    // The whole channel. The two line codes are exactly the ones raised at
    // `0.0.13`, in the same order; the new code is ADDED ahead of them,
    // because resolution runs before the walk.
    expect(channel(sub)).toEqual([AMBIGUOUS, WITHOUT_LX, NOT_DECODED]);
  });

  it("🩺 the same document read with an explicit type decodes it, and is silent", () => {
    // The recovery the message names. A caller `type` wins ahead of the
    // fall-back, so no guess is made and there is nothing to report.
    const { sub } = parse837(
      UNRESOLVED_ICR,
      [
        "HL*1**20*1~",
        "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
        SV2,
        "HL*2*1*22*0~",
        "SBR*P*18*GROUP123******MB~",
        "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
        "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
        "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
        "HI*ABK:J20.9~",
        "LX*1~",
        SV1,
      ],
      { type: "P" },
    );
    expect(sub.variant).toBe("P");
    expect(sub.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
    expect(sub.claims[0]?.serviceLines[0]?.units?.toString()).toBe("4");
    // The orphan SV2 is still an orphan and still reported; the ambiguity is
    // not, because the caller settled the type.
    expect(channel(sub)).toEqual([WITHOUT_LX]);
  });

  it("🩺 both conflicting segments inside opened Loop 2400s raise it once, at the ST", () => {
    // Neither segment is an orphan here, so nothing about the conflict
    // depends on the orphan route. The SV1 wins first-wins; the SV2 line is
    // retained undecoded and says so at its own LX.
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV1, "LX*2~", SV2]));
    expect(sub.variant).toBe("P");
    expect(sub.claims[0]?.serviceLines).toHaveLength(2);
    expect(sub.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
    expect(sub.claims[0]?.serviceLines[1]?.charge).toBeUndefined();
    expect(channel(sub)).toEqual([AMBIGUOUS, NOT_DECODED]);
  });

  it("it fires in the other direction too: an SV2 first, an SV1 second", () => {
    // The code is about the conflict, not about which variant loses.
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV2, "LX*2~", SV1]));
    expect(sub.variant).toBe("I");
    expect(channel(sub)).toEqual([AMBIGUOUS, NOT_DECODED]);
  });

  it("an SV3 conflicting with an SV1 raises it (all three ids are in the table)", () => {
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV1, "LX*2~", SV3]));
    expect(sub.variant).toBe("P");
    expect(channel(sub)).toEqual([AMBIGUOUS, NOT_DECODED]);
  });

  it("an ST-03 that is absent altogether reaches it the same way", () => {
    // The route with no element 3 on the ST at all, which is why the warning
    // carries no `elementIndex`.
    const { sub } = parse837("", claimBody(["LX*1~", SV1, "LX*2~", SV2]));
    expect(sub.implementationConventionReference).toBeUndefined();
    expect(channel(sub)).toEqual([AMBIGUOUS, NOT_DECODED]);
  });

  it("an inherited-key ST-03 composes with the prototype guard rather than fighting it", () => {
    // `VARIANT_BY_ICR` is null-prototype (`X12-VARIANT-LOOKUP-PROTOTYPE`), so
    // `constructor` resolves nothing and the fall-back decides, contested.
    const { sub } = parse837("constructor", claimBody(["LX*1~", SV1, "LX*2~", SV2]));
    expect(typeof sub.variant).toBe("string");
    expect(sub.variant).toBe("P");
    expect(channel(sub)).toEqual([AMBIGUOUS, NOT_DECODED]);
  });

  it("🩺 it fires where NEITHER conflicting segment is reported at itself", () => {
    // An `LX` with no `CLM` open drops its line and sets the suppression flag,
    // so BOTH service segments after it reach `reportOrphanServiceSegment` and
    // are silent - `X12_837_SERVICE_SEGMENT_WITHOUT_LX` appears nowhere on this
    // channel. The loss is named once at the `LX`, which is deliberate and
    // documented in `KNOWN-LIMITATIONS.md`.
    //
    // 🩺 THIS IS WHY NO SURFACE HERE MAY SAY "a service segment with no line
    // open still raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX`". The registry
    // message said exactly that in this slice's first draft and a refuter
    // measured it false on this document. The additivity claim is INVARIANCE -
    // whatever was raised before is still raised, in the same place - never a
    // list of what else a reader will see.
    const { sub } = parse837(UNRESOLVED_ICR, [
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      "LX*1~",
      SV1,
      SV2,
      "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
    ]);
    expect(sub.variant).toBe("P");
    expect(channel(sub)).toEqual([AMBIGUOUS, WARNING_CODES.X12_837_SERVICE_LINE_DROPPED]);
    expect(channel(sub)).not.toContain(WITHOUT_LX);
  });

  it("three conflicting segments still raise it exactly once", () => {
    // It reports the RESOLUTION, and there is one of those per transaction.
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV1, "LX*2~", SV2, "LX*3~", SV3]));
    expect(channel(sub).filter((c) => c === AMBIGUOUS)).toHaveLength(1);
    expect(channel(sub)).toEqual([AMBIGUOUS, NOT_DECODED, NOT_DECODED]);
  });
});

// ---------------------------------------------------------------------------
// 2. The honest controls. Each must stay exactly as silent as it was.
// ---------------------------------------------------------------------------

describe("X12-837-AMBIGUOUS-VARIANT: controls, where the fall-back was not contested", () => {
  it("CONTROL: an unresolvable ST-03 whose body names ONE variant is silent", () => {
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV1, "LX*2~", SV1]));
    expect(sub.variant).toBe("P");
    expect(channel(sub)).toEqual([]);
  });

  it("CONTROL: a RESOLVING ST-03 with a mixed body does not raise it", () => {
    // The bound the message states: this reports the fall-back's ambiguity,
    // so where ST-03 settled the type there is no guess however mixed the
    // body is. The stray SV2's line still reports its own loss.
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1, "LX*2~", SV2]));
    expect(sub.variant).toBe("P");
    expect(channel(sub)).toEqual([NOT_DECODED]);
  });

  it("CONTROL: a caller `type` with a mixed body does not raise it", () => {
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV1, "LX*2~", SV2]), {
      type: "I",
    });
    expect(sub.variant).toBe("I");
    // The caller typed it Institutional, so it is the SV1 line that fails to
    // decode. Still no ambiguity: nothing was guessed.
    expect(channel(sub)).toEqual([NOT_DECODED]);
  });

  it("CONTROL: no SVx at all is X12_837_UNKNOWN_VARIANT, never this code", () => {
    // The two codes are the two outcomes of one resolution and can never
    // travel together: a conflicting body has something to fall back on.
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", "DTP*472*D8*20260601~"]));
    expect(sub.variant).toBe("unknown");
    expect(channel(sub)).toEqual([UNKNOWN_VARIANT, WARNING_CODES.X12_837_SERVICE_LINE_DROPPED]);
  });

  it("CONTROL: a clean 837P on a resolving ST-03 stays completely silent", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1]));
    expect(sub.variant).toBe("P");
    expect(channel(sub)).toEqual([]);
  });

  it("CONTROL: an out-of-enum caller `type` skips the scan and raises nothing new", () => {
    // Reachable from JavaScript / a JSON payload only. It wins ahead of the
    // fall-back like any other caller value, so no guess is made; every line
    // drops, which is pre-existing and unchanged.
    const { sub } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV1, "LX*2~", SV2]), {
      type: "X" as "P",
    });
    expect(sub.variant).toBe("X");
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
    ]);
  });
});

// ---------------------------------------------------------------------------
// 3. The warning itself: anchor, PHI boundary, registry membership.
// ---------------------------------------------------------------------------

describe("X12-837-AMBIGUOUS-VARIANT: the warning's shape", () => {
  it("🩺 anchors at the ST (segmentIndex 0) with NO elementIndex", () => {
    const { sub, tx } = parse837(UNRESOLVED_ICR, claimBody(["LX*1~", SV1, "LX*2~", SV2]));
    const w = sub.warnings.find((x) => x.code === AMBIGUOUS);
    expect(w).toBeDefined();
    expect(w?.position.segmentIndex).toBe(0);
    expect(w?.position.elementIndex).toBeUndefined();
    // `tx.segments[0]` is the ST, and it is what carries ST-03. Asserted
    // against the model rather than assumed, because `segmentIndex: 0` is
    // not a neutral sentinel in this library.
    expect(tx.segments[0]?.id).toBe("ST");
  });

  it("its message is a member of ALL_WARNING_MESSAGES", () => {
    expect(ALL_WARNING_MESSAGES.has(ambiguous837Variant({ segmentIndex: 0 }).message)).toBe(true);
  });

  it("🩺 no document bytes reach the diagnostic", () => {
    // The ST-03, the claim id and the procedure code all carry a marker; the
    // frozen message table is what makes this structural rather than a habit.
    const { sub } = parse837(`005010X${MARKER}`, [
      "HL*1**20*1~",
      `NM1*85*2*${MARKER} CLINIC*****XX*1234567890~`,
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      `NM1*IL*1*${MARKER}*PATIENT*A***MI*MEMBER001~`,
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      `CLM*${MARKER}-900*8500***11:B:1*Y*A*Y*Y~`,
      "LX*1~",
      SV1,
      "LX*2~",
      SV2,
    ]);
    expect(channel(sub)).toContain(AMBIGUOUS);
    for (const w of sub.warnings) {
      expect(w.message).not.toContain(MARKER);
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    }
    // The verbatim reference is still on the model, which is where a
    // consumer reads it from.
    expect(sub.implementationConventionReference).toBe(`005010X${MARKER}`);
  });

  it("the factory is a pure builder over the position it is handed", () => {
    const w = ambiguous837Variant({ segmentIndex: 0, groupIndex: 0, transactionIndex: 0 });
    expect(w.code).toBe(AMBIGUOUS);
    expect(w.position).toEqual({ segmentIndex: 0, groupIndex: 0, transactionIndex: 0 });
  });
});

// ---------------------------------------------------------------------------
// 4. Additivity. The rule three slices in this lineage were decided on.
// ---------------------------------------------------------------------------

describe("X12-837-AMBIGUOUS-VARIANT: additive, with nothing moved onto it", () => {
  /**
   * 🛑 A widening that moves a case onto a NEW code silently breaks every
   * consumer predicate written against the OLD one. These pin that no case
   * moved: for each document, the channel with the new code filtered OUT is
   * exactly the channel `0.0.13` produced, which is what a consumer's
   * existing predicate reads.
   */
  const cases: readonly (readonly [string, readonly string[], readonly string[]])[] = [
    ["conflict inside two opened lines", claimBody(["LX*1~", SV1, "LX*2~", SV2]), [NOT_DECODED]],
    [
      // 🩺 The foreign SVx arrives INSIDE an opened Loop 2400 that the SV1
      // already decoded, so `decodeSv2` returns on the variant check and no
      // LINE code reports it. That was a separate `PRE-EXISTING` silence when
      // this suite was written and it is now closed by its own slice
      // (`X12-837-SV1-OVERWRITE`, `X12_837_SERVICE_SEGMENT_REPEATED` at the
      // repeated segment). The LEGACY channel below is still genuinely empty,
      // which is what this case exists to pin, and which is why the filter
      // must drop every code added since `0.0.13` rather than just this
      // suite's own - a consumer's predicate reads the old codes, and it is
      // those that must be unchanged.
      "conflict where the loser sits inside an already-decoded line",
      claimBody(["LX*1~", SV1, SV2]),
      [],
    ],
    [
      "conflict where the WINNER is an orphan",
      claimBody([SV2, "LX*1~", SV1]),
      [WITHOUT_LX, NOT_DECODED],
    ],
  ];

  for (const [name, body, legacyChannel] of cases) {
    it(`${name}: the pre-existing codes are untouched`, () => {
      const { sub } = parse837(UNRESOLVED_ICR, body);
      expect(channel(sub).filter((c) => !ADDED_SINCE_0_0_13.has(c))).toEqual([...legacyChannel]);
      expect(channel(sub)).toContain(AMBIGUOUS);
    });
  }

  it("🩺 the resolved variant itself is unchanged, which is the whole restraint", () => {
    // Narrowing the fall-back to skip orphans would read this document as
    // Professional and decode the SV1. It is deliberately NOT narrowed: that
    // changes how an already-published document decodes.
    const { sub } = parse837(UNRESOLVED_ICR, claimBody([SV2, "LX*1~", SV1]));
    expect(sub.variant).toBe("I");
    expect(sub.claims[0]?.serviceLines[0]?.charge).toBeUndefined();
  });
});

/**
 * `X12-837-LOOP-RESIDUALS`: an `SVx` arriving with no Loop 2400 open was
 * dropped in SILENCE. The two service-line codes the walker already had are
 * both anchored at an `LX` - `X12_837_SERVICE_LINE_DROPPED` at one that
 * opened no Loop 2400, `X12_837_SERVICE_LINE_NOT_DECODED` at one whose line
 * was retained undecoded - so a service segment with no `LX` in scope had no
 * anchor to warn at and reported on no channel at all.
 *
 * **Read the condition literally, because a draft of every surface in this
 * slice got it wrong: it is "no line open", NOT "the file contains no
 * `LX`".** An `LX` in an earlier claim is still an `LX`, and a committed
 * case below pins a document where one claim keeps its decoded line while
 * the next raises this code.
 *
 * 🩺 **What that cost, measured at `0899813` - which is published `0.0.10`,
 * not `0.0.9`, so the silence is live in the CURRENT release.** An
 * `SV1*HC:99213*8500*UN*4***1~` sitting inside an open `CLM` with no `LX`
 * ahead of it left `claims[0].serviceLines` EMPTY and `warnings` EMPTY: an
 * $8,500 charge, 4 units, a procedure code and its modifiers read into
 * nothing, with the model saying the claim simply had no service lines. That
 * is the loss this suite pins, and it is the reason `KNOWN-LIMITATIONS.md`
 * carried the standing caveat that the warning channel is not a complete
 * account of every way a service line can go missing.
 *
 * **▶ EVERY ASSERTION ON THE WARNING CHANNEL HERE IS `toEqual` ON THE WHOLE
 * ARRAY.** A membership test cannot observe a silence ending, and it cannot
 * observe the new code over-firing onto a document that was already
 * correctly reported - which is the one way this fix could make the channel
 * worse. Both directions need the whole array.
 *
 * **Every reporting case is paired with an honest control** in the same
 * shape: the same bytes with an `LX` restored decode and stay silent, and an
 * `LX` that opened nothing still reports once, at the `LX`, and NOT again at
 * the service segment that follows it. A guard that over-fired would pass
 * the first half of this suite and red the controls.
 *
 * What this slice deliberately does NOT do: it does not decode the orphan
 * service segment into any line. The charge is `SV1-02` / `SV2-03` and the
 * units `SV1-04` / `SV2-05` / `SV3-06`, so reading a service segment into a
 * line the walker never opened is how a mis-read charge is minted. Refusing
 * to read is the safe half; doing it silently was the defect. **It does not
 * follow that an orphan segment cannot name the VARIANT, and a first draft
 * of this suite claimed it could not.** Variant resolution runs before the
 * walk; a caller-supplied `type` wins first, and absent one it scans every
 * `SVx` in the body. A case below pins that, and its control measures what
 * it costs. `charge` and `units` became `X12Decimal | undefined` in
 * `X12-837-SV-UNDEFINED-DECIMAL`, so an absent `SV1-02` on a line that DID
 * open now reads `undefined` rather than a confident `0`; that slice is
 * pinned in `transactions-undefined-decimal.test.ts` and nothing here
 * depends on it beyond the two readings updated below.
 *
 * Only bytes can produce these cases: no builder emits a Loop 2400 without
 * its `LX`. All data is synthetic.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  get837Claims,
  parseX12,
  serviceSegmentWithoutLx,
} from "../src/index.js";
import type { X12ParseWarning, X12TransactionSet, X12_837Submission } from "../src/index.js";

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
const SV2 = "SV2*0300*HC:99213*8500*UN*4~";
const SV3 = "SV3*AD:D1110*10000***1~";

interface Parsed {
  readonly sub: X12_837Submission;
  readonly tx: X12TransactionSet;
}

function parseWithTx(
  body: readonly string[],
  icr = "005010X222A2",
  opts?: { readonly type?: "P" | "I" | "D" },
): Parsed {
  const segs = [
    ISA,
    "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A2~",
    `ST*837*0001*${icr}~`,
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

function parse837(
  body: readonly string[],
  icr = "005010X222A2",
  opts?: { readonly type?: "P" | "I" | "D" },
): X12_837Submission {
  return parseWithTx(body, icr, opts).sub;
}

/** A claim with whatever trails it. */
function claimBody(trailing: readonly string[]): readonly string[] {
  return [...HEADER, CLM, "HI*ABK:J20.9~", ...trailing];
}

/** THE WHOLE CHANNEL. Never a membership test. */
function channel(sub: X12_837Submission): string[] {
  return sub.warnings.map((w) => w.code);
}

function only(sub: X12_837Submission): X12ParseWarning {
  const [first, ...rest] = sub.warnings;
  if (first === undefined || rest.length > 0) {
    throw new Error(`expected exactly one warning, got ${String(sub.warnings.length)}`);
  }
  return first;
}

// ---------------------------------------------------------------------------
// 1. The headline: the silence, and that it has ended.
// ---------------------------------------------------------------------------

describe("X12-837-LOOP-RESIDUALS: a service segment with no LX is reported", () => {
  it("🩺 an SV1 inside an open CLM with no LX takes the whole line off the model, and says so", () => {
    // At `0.0.10`: `serviceLines: []` AND `warnings: []`. The claim read as
    // one that had no service lines at all.
    const sub = parse837(claimBody([SV1]));
    expect(sub.claims).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines).toEqual([]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);
  });

  it("CONTROL: the same SV1 with its LX restored decodes and stays silent", () => {
    const sub = parse837(claimBody(["LX*1~", SV1]));
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
    expect(sub.claims[0]?.serviceLines[0]?.units?.toString()).toBe("4");
    expect(channel(sub)).toEqual([]);
  });

  it("🩺 an SV1 with no LX and no CLM either is reported too", () => {
    const sub = parse837([...HEADER, SV1]);
    expect(sub.claims).toEqual([]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);
  });

  it("🩺 an SV1 in the header, before any HL, is reported", () => {
    const sub = parse837([SV1, ...HEADER, CLM]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);
  });

  for (const [name, seg] of [
    ["SV1", SV1],
    ["SV2", SV2],
    ["SV3", SV3],
  ] as const) {
    it(`🩺 all three service segments report: ${name}`, () => {
      const sub = parse837(claimBody([seg]));
      expect(sub.claims[0]?.serviceLines).toEqual([]);
      expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);
    });
  }

  it("🩺 two orphan service segments report once each", () => {
    // Each is a separate loss and each anchors at its own segment, so a
    // consumer can name both rather than infer a count.
    const sub = parse837(claimBody([SV1, SV2]));
    const anchors = sub.warnings.map((w) => w.position.segmentIndex);
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX,
      WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX,
    ]);
    expect(new Set(anchors).size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. It must not fire where an LX already reported the same loss.
// ---------------------------------------------------------------------------

describe("X12-837-LOOP-RESIDUALS: one loss is never reported twice under two codes", () => {
  it("🩺 an LX that opened no Loop 2400 still reports ONCE, at the LX", () => {
    // Route 1 of `X12_837_SERVICE_LINE_DROPPED`: no CLM is open. The SV1
    // that follows finds no line either, and must stay quiet - the loss is
    // already named, at the segment that is present in every case.
    const sub = parse837([...HEADER, "LX*1~", SV1]);
    expect(sub.claims).toEqual([]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_DROPPED]);
  });

  it("🩺 a dropped LX carrying TWO service segments still reports once", () => {
    const sub = parse837([...HEADER, "LX*1~", SV1, SV2]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_DROPPED]);
  });

  it("🩺 a retained but undecoded line reports only X12_837_SERVICE_LINE_NOT_DECODED", () => {
    // The line IS on the model, holding the seeds `#67` disclosed (a
    // fabricated `0` through `0.0.12`, `undefined` since).
    // Its SV2 decoded into nothing, but it decoded into a line that exists.
    const sub = parse837(claimBody(["LX*1~", SV2]));
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED]);
  });

  it("🩺 the suppression is scoped to the dropped LX, not to the rest of the walk", () => {
    // The trap this case exists for: a flag that latched would silence every
    // later orphan in the document. A fresh CLM re-arms it.
    const sub = parse837([...HEADER, "LX*1~", SV1, CLM, SV1]);
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX,
    ]);
  });

  it("🩺 a document can carry all three service-line codes, on three distinct segments", () => {
    const sub = parse837([
      ...HEADER,
      "LX*1~", // no CLM open: dropped
      SV1,
      CLM,
      "LX*1~", // opens a line the SV2 does not decode: not decoded
      SV2,
      CLM,
      SV1, // no LX at all: without-LX
    ]);
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED,
      WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX,
    ]);
    expect(new Set(sub.warnings.map((w) => w.position.segmentIndex)).size).toBe(3);
  });

  it("CONTROL: an ordinary well-formed claim is still wholly silent", () => {
    const sub = parse837(claimBody(["LX*1~", SV1, "DTP*472*D8*20260601~"]));
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(channel(sub)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. What the code says, where it points, and what it does not touch.
// ---------------------------------------------------------------------------

describe("X12-837-LOOP-RESIDUALS: what X12_837_SERVICE_SEGMENT_WITHOUT_LX carries", () => {
  it("anchors at the service segment itself, which is the only one the case has", () => {
    // Resolved against the segment stream rather than computed: an index
    // arithmetic here would assert the test's own model of the walk, and the
    // claim is that a consumer can join this position back to a real
    // segment. `X12_837_SERVICE_LINE_DROPPED` is joined the same way.
    // `tx.segments[0]` is the ST and the walk is 1-based off it, so the
    // position indexes `tx.segments` directly.
    const { sub, tx } = parseWithTx(claimBody([SV1]));
    const anchored = tx.segments[only(sub).position.segmentIndex];
    expect(anchored?.id).toBe("SV1");
    expect(anchored?.raw).toBe(SV1.slice(0, -1));
  });

  it("carries a registry message and quotes no document bytes", () => {
    // The procedure code and the charge are the text a "helpful" message
    // would be most tempted to quote back, and on a real 837 the procedure
    // billed for a named patient is PHI.
    const sub = parse837(claimBody(["SV1*HC:ZZMARKERZZ*8500*UN*4***1~"]));
    const w = only(sub);
    expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    expect(w.message).not.toContain("ZZMARKERZZ");
    expect(w.message).not.toContain("8500");
  });

  it("the exported factory builds the same warning the walker emits", () => {
    const sub = parse837(claimBody([SV1]));
    const w = only(sub);
    expect(serviceSegmentWithoutLx(w.position)).toEqual(w);
  });

  it("🩺 nothing on the orphan segment is decoded into a line, and a resolved ST-03 still wins", () => {
    // An SV2 is Institutional and an SV3 Dental. Neither may flip a
    // submission whose ST-03 resolved to Professional, because SV1-02 and
    // SV2-03 are both the line charge and reading the wrong one mis-reads
    // money. This is the half of the variant question that holds; the next
    // case is the half that does not, and a first draft of this suite
    // asserted the general property while only testing this one.
    for (const seg of [SV2, SV3]) {
      const sub = parse837(claimBody([seg]));
      expect(sub.variant).toBe("P");
      expect(sub.claims[0]?.serviceLines).toEqual([]);
      expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);
    }
  });

  it("🩺 an orphan segment DOES feed the variant fallback when ST-03 resolves to nothing", () => {
    // Measured identical at `0899813`, and the reason no surface here may
    // say "it does not name the variant". Variant resolution runs before the
    // walk, as `explicitType ?? variantFromIcr ?? variantFromSegment`: a
    // caller's `type` wins first, and absent one an ST-03 outside the three
    // known conventions falls through to a scan of every SVx in the body,
    // orphans included. So a single stray SV2 re-types the whole submission
    // and the conformant SV1 line beside it reads undefined / undefined
    // rather than 8500 / 4 (it read 0 / 0 through `0.0.12`). Both halves of
    // that precedence are asserted, because a remedy that stated only the
    // ST-03 half was itself refuted.
    //
    // 🩺 THE RE-TYPING IS STILL PRE-EXISTING AND STILL UNCHANGED. What is no
    // longer pre-existing is the SILENCE around it: through `0.0.13` the
    // channel below held the two line-level codes and nothing that named the
    // submission-level mis-typing which produced them, so a consumer routing
    // on `submission.variant` had no signal at all.
    // `X12_837_AMBIGUOUS_VARIANT` is that signal and is purely additive -
    // this assertion is the pin that the two codes below did not move.
    const stray = parse837([...HEADER, CLM, SV2, "LX*1~", SV1], "005010X222A1");
    expect(stray.variant).toBe("I");
    expect(stray.claims[0]?.serviceLines[0]?.charge).toBeUndefined();
    expect(stray.claims[0]?.serviceLines[0]?.units).toBeUndefined();
    // `undefined`, NOT `""` - the empty string on such a line is its
    // `revenueCode`, and this repo distinguishes the two by rule.
    expect(stray.claims[0]?.serviceLines[0]?.procedureCode).toBeUndefined();
    expect(channel(stray)).toEqual([
      WARNING_CODES.X12_837_AMBIGUOUS_VARIANT,
      WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX,
      WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED,
    ]);

    // CONTROL: the same document without the stray segment reads correctly.
    // Removing one segment moves an $8,500 charge, which is the measurement
    // rather than the argument.
    const clean = parse837([...HEADER, CLM, "LX*1~", SV1], "005010X222A1");
    expect(clean.variant).toBe("P");
    expect(clean.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
    expect(channel(clean)).toEqual([]);

    // CONTROL: a caller `type` wins ahead of both the ICR and the scan, so
    // the identical bytes read correctly. The orphan is still reported.
    const typed = parse837([...HEADER, CLM, SV2, "LX*1~", SV1], "005010X222A1", { type: "P" });
    expect(typed.variant).toBe("P");
    expect(typed.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
    expect(typed.claims[0]?.serviceLines[0]?.procedureCode).toBe("99213");
    expect(channel(typed)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);

    // And the fallback takes the FIRST SVx: a stray SV2 placed AFTER the
    // conformant line changes nothing. Every sentence about this says
    // "the first SVx" for that reason.
    const trailing = parse837([...HEADER, CLM, "LX*1~", SV1, SV2], "005010X222A1");
    expect(trailing.variant).toBe("P");
    expect(trailing.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
    // The body is still self-contradictory, so the resolution is still a
    // guess and still reported - even though first-wins happened to land on
    // the conformant segment here. The SV2 reaches a line the SV1 already
    // decoded, and THAT is no longer silent either: `X12-837-SV1-OVERWRITE`
    // added `X12_837_SERVICE_SEGMENT_REPEATED` at the second service segment
    // in an open Loop 2400, whether or not it decoded. This assertion read
    // `[AMBIGUOUS]` alone until that slice, and its going red is the finding
    // rather than a regression: it was the pin ON that silence.
    expect(channel(trailing)).toEqual([
      WARNING_CODES.X12_837_AMBIGUOUS_VARIANT,
      WARNING_CODES.X12_837_SERVICE_SEGMENT_REPEATED,
    ]);
  });

  it("🩺 the condition is NO LINE OPEN, not 'the file contains no LX'", () => {
    // An LX in an earlier claim is still an LX. A draft of every surface in
    // this slice said "not preceded by an LX", which this document refutes:
    // the first claim keeps its decoded line and the second still reports.
    const sub = parse837([...HEADER, CLM, "LX*1~", SV1, CLM, SV1]);
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
    expect(sub.claims[1]?.serviceLines).toEqual([]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);
  });

  it("the segments stay verbatim on the transaction set", () => {
    // Nothing is dropped from the bytes, only from the typed model - which
    // is what makes the warning actionable: the consumer is being pointed at
    // a segment it can still read.
    const { tx } = parseWithTx(claimBody([SV1]));
    expect(tx.segments.some((s) => s.raw === SV1.slice(0, -1))).toBe(true);
  });
});

/**
 * `X12-STATED-AMOUNT-DISCARDED`: the two silent monetary drops left open when
 * `X12_AMOUNT_ROW_DROPPED` shipped, both closed here.
 *
 * The defect, in one line: a segment can POPULATE its amount element, arrive
 * while the loop that would carry its row is open, and still reach no model at
 * all - and through `0.0.12` that was silent on every channel. Two sites:
 *
 * 1. An 820 `RMR` whose RMR-01 and RMR-02 are both empty. `decodeRmr` refuses
 *    the open item on IDENTITY, before RMR-04 or RMR-05 is read, so
 *    `RMR****150.00*150.00~` gave `openItems: []` and `warnings: []`, taking a
 *    stated payment, a stated amount due and RMR-03's payment action code with
 *    it.
 * 2. An 837 `AMT` arriving while a Loop 2430 line adjudication is open. With a
 *    claim AND a line open, `AMT*EAF*75.00~` decoded perfectly well and was
 *    skipped, because the v1 adjudication model carries no amount row.
 *
 * **Site 2 is why the channel read BACKWARDS, and squaring that is the point
 * of this file.** At base, under an open `SVD`, `AMT*EAF~` raised
 * `X12_AMOUNT_ROW_DROPPED` and `AMT*EAF*75.00~` raised nothing: the report was
 * present exactly where LESS was lost. Both routes report now, and WHICH code
 * arrives is what says which loss it was.
 *
 * **Nothing moves, and that is asserted rather than assumed.**
 * `X12_AMOUNT_ROW_DROPPED` and `X12_UNPARSEABLE_DECIMAL` fire on exactly the
 * documents they fired on before; the new code is additive. A widening that
 * moves a case onto a new code blinds every consumer predicate written against
 * the old one, which is what refuted an earlier slice in this lineage.
 *
 * **Only bytes can produce these cases.** No builder emits an `RMR` without an
 * open-item identity, and `build837` emits no Loop 2430 `AMT` at all, so every
 * case here is written as literal EDI. All data is synthetic.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  get820Payments,
  get834Enrollments,
  get835,
  get837Claims,
  parseX12,
} from "../src/index.js";
import type {
  X12Enrollment,
  X12ParseWarning,
  X12PremiumPayments,
  X12Remittance,
  X12_837Submission,
} from "../src/index.js";

function codes(warnings: readonly X12ParseWarning[]): string[] {
  return warnings.map((w) => w.code);
}

function discarded(warnings: readonly X12ParseWarning[]): X12ParseWarning[] {
  return warnings.filter((w) => w.code === WARNING_CODES.X12_STATED_AMOUNT_DISCARDED);
}

/** See the sibling file: a synthetic ISA / GS / ST envelope around a body. */
function wrap(
  isa: string,
  gs: string,
  setId: string,
  icr: string,
  body: readonly string[],
): string {
  return [
    isa,
    gs,
    `ST*${setId}*0001*${icr}~`,
    ...body,
    `SE*${String(body.length + 2)}*0001~`,
    "GE*1*1~",
    "IEA*1*000000001~",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 820 - the RMR refused on open-item identity.
// ---------------------------------------------------------------------------

const ISA_820 =
  "ISA*00*          *00*          *ZZ*EMPLOYER       *ZZ*PLAN           " +
  "*260601*1200*^*00501*000000001*0*P*:~";
const GS_820 = "GS*RA*EMPLOYER*PLAN*20260601*1200*1*X*005010X218~";

const BPR_820 = "BPR*C*250.00*C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~";
const TRN_820 = "TRN*1*PREM-0001~";

/** BPR TRN ENT NM1, so the first trailing segment sits at body index 5. */
const PREMIUM_820_HEAD = [
  BPR_820,
  TRN_820,
  "ENT*1*2J*FI*GRP-0001~",
  "NM1*IL*1*DOE*JANE****MI*MBR0001~",
] as const;

function parse820Body(body: readonly string[]): X12PremiumPayments {
  const raw = wrap(ISA_820, GS_820, "820", "005010X218", body);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
  if (tx === undefined) throw new Error("no 820 transaction set");
  const prem = get820Payments(ix.delimiters, tx);
  if (prem === undefined) throw new Error("get820Payments returned undefined");
  return prem;
}

function parse820(trailing: readonly string[]): X12PremiumPayments {
  return parse820Body([...PREMIUM_820_HEAD, ...trailing]);
}

describe("🩺 820 RMR: a row refused on IDENTITY no longer takes a stated amount quietly", () => {
  it("an RMR with no identity but a stated amount is reported at the RMR", () => {
    // Through `0.0.12`: `openItems: []` and `warnings: []`. A 150.00 payment
    // and a 150.00 amount due left the model, and the remittance read as one
    // that carried no open item at all.
    const prem = parse820(["RMR****150.00*150.00~"]);
    expect(prem.remittances[0]?.openItems).toEqual([]);
    expect(codes(prem.warnings)).toEqual([WARNING_CODES.X12_STATED_AMOUNT_DISCARDED]);
    // BPR TRN ENT NM1 RMR -> body index 5.
    expect(prem.warnings[0]?.position.segmentIndex).toBe(5);
    // The loss spans RMR-04 and RMR-05, so no single element names it.
    expect(prem.warnings[0]?.position.elementIndex).toBeUndefined();
  });

  it("RMR-03's payment action code goes with it, and a lone RMR-04 is enough", () => {
    // The row is a record, not a slot: what is lost is a whole statement about
    // a payment, not one defaulted field. This case states a payment action
    // code and only RMR-04, and all of it leaves together.
    const prem = parse820(["RMR***PI*150.00~"]);
    expect(prem.remittances[0]?.openItems).toEqual([]);
    expect(codes(prem.warnings)).toEqual([WARNING_CODES.X12_STATED_AMOUNT_DISCARDED]);
  });

  it("an RMR-05 alone is enough, and each dropped row is reported once at its own segment", () => {
    const prem = parse820(["RMR*****150.00~", "RMR****75.00~"]);
    expect(prem.remittances[0]?.openItems).toEqual([]);
    expect(codes(prem.warnings)).toEqual([
      WARNING_CODES.X12_STATED_AMOUNT_DISCARDED,
      WARNING_CODES.X12_STATED_AMOUNT_DISCARDED,
    ]);
    expect(prem.warnings.map((w) => w.position.segmentIndex)).toEqual([5, 6]);
  });

  it("🩺 unreadable amount bytes raise THIS code and still no X12_UNPARSEABLE_DECIMAL", () => {
    // The bound that is easiest to state wrongly. This route refuses the row
    // BEFORE attempting the decode, so it neither raised nor raises the
    // unparseable report - true on the base tree and unchanged here. The
    // report is about the ROW being lost, and it deliberately says nothing
    // about whether those bytes would have decoded.
    const prem = parse820(["RMR****1,234.56~"]);
    expect(prem.remittances[0]?.openItems).toEqual([]);
    expect(codes(prem.warnings)).toEqual([WARNING_CODES.X12_STATED_AMOUNT_DISCARDED]);
    expect(codes(prem.warnings)).not.toContain(WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
  });

  it("BOUND: a bare RMR states nothing and stays silent", () => {
    // Nothing was lost, so there is nothing to report, and reporting one would
    // be this library asserting a statement the sender never made.
    const prem = parse820(["RMR~"]);
    expect(prem.remittances[0]?.openItems).toEqual([]);
    expect(codes(prem.warnings)).toEqual([]);
  });

  it("BOUND: an identity-less RMR stating only a payment action code stays silent", () => {
    // Disclosed rather than widened: RMR-03 does leave the model here, but no
    // amount does, and this code is about a stated AMOUNT. Silent on both
    // trees, deliberately.
    const prem = parse820(["RMR***PI~"]);
    expect(prem.remittances[0]?.openItems).toEqual([]);
    expect(codes(prem.warnings)).toEqual([]);
  });

  it("BOUND: an RMR with NO remittance loop open is not on this channel", () => {
    // The exclusion this code is bounded by. With no `ENT` and no `NM1` there
    // is no loop that could carry the row, the reader returns before
    // `decodeRmr` is called at all, and the loss is a different one. Silent on
    // both trees.
    const prem = parse820Body([BPR_820, TRN_820, "RMR****150.00*150.00~"]);
    expect(prem.remittances).toEqual([]);
    expect(codes(prem.warnings)).toEqual([]);
  });

  it("CONTROL: an RMR that states an identity builds its row and warns nothing", () => {
    const prem = parse820(["RMR*AZ*POL-0001*PI*150.00*150.00~"]);
    expect(prem.remittances[0]?.openItems[0]?.referenceId).toBe("POL-0001");
    expect(prem.remittances[0]?.openItems[0]?.amountPaid?.toString()).toBe("150.00");
    expect(codes(prem.warnings)).toEqual([]);
  });

  it("CONTROL: an identified RMR with no amount keeps its row, still silent", () => {
    // The contrast that makes the identity/amount distinction concrete: this
    // row survives with `amountPaid` left undefined, and nothing is dropped.
    const prem = parse820(["RMR*AZ*POL-0001*PI~"]);
    expect(prem.remittances[0]?.openItems[0]?.amountPaid).toBeUndefined();
    expect(codes(prem.warnings)).toEqual([]);
  });

  it("BOUND: an ADX with no remittance loop open is still silent too", () => {
    // Same exclusion, one segment over, so the bound is not an 820-RMR
    // special case. Silent on both trees.
    const prem = parse820Body([BPR_820, TRN_820, "ADX*-25.00*53~"]);
    expect(prem.remittances).toEqual([]);
    expect(codes(prem.warnings)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 837 - the AMT skipped under an open Loop 2430 adjudication.
// ---------------------------------------------------------------------------

const ISA_837 =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";
const GS_837 = "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A1~";

/** Nine segments, so the first trailing segment sits at body index 10. */
const CLAIM_837_HEAD = [
  "BHT*0019*00*REF001*20260601*1200*CH~",
  "NM1*41*2*SUBMITTER ORG*****46*SUB001~",
  "NM1*40*2*RECEIVER ORG*****46*REC001~",
  "HL*1**20*1~",
  "NM1*85*2*BILLING PROVIDER*****XX*1234567893~",
  "HL*2*1*22*0~",
  "SBR*P*18*******CI~",
  "NM1*IL*1*DOE*JOHN****MI*MBR0001~",
  "CLM*CLM-0001*500.00***11:B:1*Y*A*Y*Y~",
] as const;

const LINE_837 = ["LX*1~", "SV1*HC:99213*500*UN*1***1~"] as const;
const SVD_837 = "SVD*PAYER01*100.00*HC:99213**1~";

function parse837(trailing: readonly string[]): X12_837Submission {
  const raw = wrap(ISA_837, GS_837, "837", "005010X222A1", [...CLAIM_837_HEAD, ...trailing]);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
  if (tx === undefined) throw new Error("no 837 transaction set");
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return sub;
}

/**
 * This body is short a Loop 2010BB payer name, which raises
 * `X12_MISSING_REQUIRED_LOOP` on every case here. Filtering it out keeps each
 * assertion about the channel under test while still using `toEqual` on the
 * whole remaining array, which is what stops a pin from passing on a value
 * plus the absence of some unrelated code.
 */
function claimCodes(sub: X12_837Submission): string[] {
  return codes(sub.warnings).filter((c) => c !== WARNING_CODES.X12_MISSING_REQUIRED_LOOP);
}

describe("🩺 837 Loop 2430: a decoded AMT under an open SVD is reported, and the INVERSION is gone", () => {
  it("a decoded AMT under an open SVD reaches no model and is reported at the AMT", () => {
    // `AMT*EAF` is Remaining Patient Liability, declared in this package's own
    // Loop 2430 spec. Through `0.0.12` a stated 75.00 of it left the model
    // with `warnings: []`, and neither the line's own amounts nor the claim's
    // record it - which is why an unchanged `amounts` list is not evidence the
    // sender stated nothing.
    const sub = parse837([...LINE_837, SVD_837, "AMT*EAF*75.00~"]);
    expect(sub.claims[0]?.serviceLines[0]?.amounts).toEqual([]);
    expect(sub.claims[0]?.amounts).toEqual([]);
    expect(claimCodes(sub)).toEqual([WARNING_CODES.X12_STATED_AMOUNT_DISCARDED]);
    // BHT + 8 head segments = 9, LX 10, SV1 11, SVD 12, AMT 13.
    expect(discarded(sub.warnings)[0]?.position.segmentIndex).toBe(13);
    expect(discarded(sub.warnings)[0]?.position.elementIndex).toBeUndefined();
  });

  it("🩺 THE INVERSION, both halves in one place: the code now says WHICH loss it was", () => {
    // The finding this slice exists for. At base the channel read backwards
    // under an open `SVD`: the row that decoded a real amount was silent, and
    // the row that decoded nothing was reported, so the report was present
    // exactly where LESS was lost. Now both report, and the CODE is the
    // discriminant - the larger loss no longer hides behind the smaller one.
    const stated = parse837([...LINE_837, SVD_837, "AMT*EAF*75.00~"]);
    const absent = parse837([...LINE_837, SVD_837, "AMT*EAF~"]);
    expect(claimCodes(stated)).toEqual([WARNING_CODES.X12_STATED_AMOUNT_DISCARDED]);
    expect(claimCodes(absent)).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
  });

  it("ADDITIONS-ONLY: an ABSENT AMT-02 under an open SVD still raises the OLD code alone", () => {
    // Nothing moved. This document raised `X12_AMOUNT_ROW_DROPPED` at base and
    // raises exactly that here, so a consumer predicate written against it is
    // not narrowed. Green on both trees, on purpose.
    const sub = parse837([...LINE_837, SVD_837, "AMT*EAF~"]);
    expect(claimCodes(sub)).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
    expect(discarded(sub.warnings)).toEqual([]);
  });

  it("ADDITIONS-ONLY: an UNPARSEABLE AMT-02 under an open SVD keeps BOTH old codes", () => {
    // The other half of the additions-only pin, on the route that already
    // carried two codes. Green on both trees.
    const sub = parse837([...LINE_837, SVD_837, "AMT*EAF*7,5.00~"]);
    expect(claimCodes(sub)).toEqual([
      WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
      WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    ]);
    expect(discarded(sub.warnings)).toEqual([]);
  });

  it("CONTROL: the SAME AMT with no SVD open lands on the line and warns nothing", () => {
    // The open `SVD` is the whole condition. Remove it and the row is built,
    // which is what makes the case above a loss rather than a design.
    const sub = parse837([...LINE_837, "AMT*EAF*75.00~"]);
    expect(sub.claims[0]?.serviceLines[0]?.amounts[0]?.amount?.toString()).toBe("75.00");
    expect(claimCodes(sub)).toEqual([]);
  });

  it("CONTROL: the adjudication itself still decodes, so nothing else was traded away", () => {
    // The `SVD` row is not what is lost. It is on the model with the other
    // payer's paid amount, and this slice does not touch it.
    const sub = parse837([...LINE_837, SVD_837, "AMT*EAF*75.00~"]);
    const adj = sub.claims[0]?.serviceLines[0]?.adjudications[0];
    expect(adj?.otherPayerId).toBe("PAYER01");
    expect(adj?.amountPaid?.toString()).toBe("100.00");
  });

  it("BOUND: a decoded AMT with no claim and no line open is NOT on this channel", () => {
    // The exclusion, measured in the 837 as well as the 820. An `AMT` before
    // any `CLM` finds no loop that could carry its row; that is a different
    // loss and stays silent on both trees.
    const raw = wrap(ISA_837, GS_837, "837", "005010X222A1", [
      "BHT*0019*00*REF001*20260601*1200*CH~",
      "AMT*F5*120.00~",
    ]);
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
    if (tx === undefined) throw new Error("no 837 transaction set");
    const sub = get837Claims(ix.delimiters, tx);
    if (sub === undefined) throw new Error("get837Claims returned undefined");
    expect(sub.claims).toEqual([]);
    expect(discarded(sub.warnings)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The exclusion, measured in the two readers that are NOT sites of this code.
// ---------------------------------------------------------------------------

const ISA_835 =
  "ISA*00*          *00*          *ZZ*MEDICARE       *ZZ*SUBMITTER      " +
  "*260601*1200*^*00501*000000001*0*P*:~";
const GS_835 = "GS*HP*MEDICARE*SUBMITTER*20260601*1200*1*X*005010X221A1~";
const BPR_835 = "BPR*I*450.00*C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~";
const TRN_835 = "TRN*1*0012345*1512345678~";

function parse835(body: readonly string[]): X12Remittance {
  const raw = wrap(ISA_835, GS_835, "835", "005010X221A1", body);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
  if (tx === undefined) throw new Error("no 835 transaction set");
  const remit = get835(ix.delimiters, tx);
  if (remit === undefined) throw new Error("get835 returned undefined");
  return remit;
}

const ISA_834 =
  "ISA*00*          *00*          *ZZ*SPONSOR        *ZZ*PAYER          " +
  "*260601*1200*^*00501*000000001*0*P*:~";
const GS_834 = "GS*BE*SPONSOR*PAYER*20260601*1200*1*X*005010X220A1~";

const ENROLL_834_HEAD = [
  "BGN*00*REF001*20260601*1200~",
  "N1*P5*SPONSOR ORG*FI*123456789~",
  "N1*IN*PAYER ONE*FI*987654321~",
  "INS*Y*18*030*XN*A***FT~",
  "REF*0F*MEMBER001~",
  "NM1*IL*1*TEST*MEMBER****MI*MEMBER001~",
] as const;

async function parse834(trailing: readonly string[]): Promise<X12Enrollment[]> {
  const raw = wrap(ISA_834, GS_834, "834", "005010X220A1", [...ENROLL_834_HEAD, ...trailing]);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "834");
  if (tx === undefined) throw new Error("no 834 transaction set");
  const out: X12Enrollment[] = [];
  for await (const member of get834Enrollments(ix.delimiters, tx)) out.push(member);
  return out;
}

describe("🩺 the exclusion: no loop open to carry the row is a DIFFERENT loss, still silent", () => {
  it("BOUND: an 835 AMT that decodes before any claim is silent on both trees", () => {
    // The wider reading of this code would put it here, and that reading is
    // wrong. Nothing was open that could carry the row, so this is the loss
    // `KNOWN-LIMITATIONS.md` records rather than one this code reports.
    const remit = parse835([BPR_835, TRN_835, "AMT*B6*500.00~"]);
    expect(remit.claims).toEqual([]);
    expect(discarded(remit.warnings)).toEqual([]);
  });

  it("BOUND: an 834 AMT with no HD coverage open is silent on both trees", async () => {
    const [member] = await parse834(["AMT*P3*250.00~"]);
    expect(member?.healthCoverages).toEqual([]);
    expect(discarded(member?.warnings ?? [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The consumer predicate, and the registry / diagnostic-surface discipline.
// ---------------------------------------------------------------------------

describe("🩺 the published predicate: the two codes are disjoint, and neither narrows the other", () => {
  it("a gate on X12_AMOUNT_ROW_DROPPED alone MISSES both documents this slice closes", () => {
    // The shape that refuted an earlier slice, checked in the direction it
    // applies here. Nothing moved onto the new code, so no existing predicate
    // went blind - but a consumer asking "did an amount row leave the model?"
    // through the old code alone never saw either of these documents, on any
    // release, and still does not.
    const rmr = parse820(["RMR****150.00*150.00~"]);
    const amt = parse837([...LINE_837, SVD_837, "AMT*EAF*75.00~"]);
    for (const warnings of [rmr.warnings, amt.warnings]) {
      const oldGate = warnings.some((w) => w.code === WARNING_CODES.X12_AMOUNT_ROW_DROPPED);
      const bothGate = warnings.some(
        (w) =>
          w.code === WARNING_CODES.X12_AMOUNT_ROW_DROPPED ||
          w.code === WARNING_CODES.X12_STATED_AMOUNT_DISCARDED,
      );
      expect(oldGate).toBe(false);
      expect(bothGate).toBe(true);
    }
  });

  it("the two codes never name the same segment, on a document carrying both", () => {
    // Two service lines, one losing a stated Loop 2430 amount and one losing
    // an undecoded claim-level amount. Both are reported and each segment
    // carries exactly one of the two codes, which is what lets a consumer read
    // the code as the discriminant.
    const sub = parse837([
      ...LINE_837,
      SVD_837,
      "AMT*EAF*75.00~",
      "LX*2~",
      "SV1*HC:99214*250*UN*1***1~",
      "AMT*T~",
    ]);
    const byIndex = new Map<number, string[]>();
    for (const w of sub.warnings) {
      if (
        w.code !== WARNING_CODES.X12_STATED_AMOUNT_DISCARDED &&
        w.code !== WARNING_CODES.X12_AMOUNT_ROW_DROPPED
      ) {
        continue;
      }
      byIndex.set(w.position.segmentIndex, [
        ...(byIndex.get(w.position.segmentIndex) ?? []),
        w.code,
      ]);
    }
    // Count first: a sweep over an empty map passes having asserted nothing.
    expect(byIndex.size).toBe(2);
    for (const [, found] of byIndex) expect(found).toHaveLength(1);
    expect([...byIndex.values()].flat().sort()).toEqual([
      WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
      WARNING_CODES.X12_STATED_AMOUNT_DISCARDED,
    ]);
  });

  it("ADDITIONS-ONLY: the 835's absent-amount document still raises the old code alone", () => {
    // The other reader, untouched by this slice. `X12_AMOUNT_ROW_DROPPED`
    // fires where it always did and picks up no companion.
    const remit = parse835([
      BPR_835,
      TRN_835,
      "CLP*PT-ACCT-001*1*500.00*450.00*50.00*MC*PAYER-CLAIM-001*11*1~",
      "AMT*B6~",
    ]);
    expect(codes(remit.warnings)).toContain(WARNING_CODES.X12_AMOUNT_ROW_DROPPED);
    expect(discarded(remit.warnings)).toEqual([]);
  });
});

describe("X12_STATED_AMOUNT_DISCARDED: registry membership and the PHI boundary", () => {
  it("its message is a registry lookup, not an interpolation", () => {
    const prem = parse820(["RMR****150.00*150.00~"]);
    const w = discarded(prem.warnings)[0];
    expect(w).toBeDefined();
    expect(ALL_WARNING_MESSAGES.has(w?.message ?? "")).toBe(true);
  });

  it("it echoes no element the document supplied", () => {
    // The amounts and the payment action code are document bytes, and a
    // premium payment amount is as much a fact about a member as a policy id.
    // None of them may reach a diagnostic.
    const prem = parse820(["RMR***PI*4321.99*4321.99~"]);
    const amt = parse837([...LINE_837, SVD_837, "AMT*EAF*8765.43~"]);
    const all = [...discarded(prem.warnings), ...discarded(amt.warnings)];
    expect(all).toHaveLength(2);
    for (const w of all) {
      for (const leak of ["4321.99", "8765.43", "PI", "EAF"]) {
        expect(w.message).not.toContain(leak);
      }
    }
  });

  it("both sites report at the segment and never at an element", () => {
    const prem = parse820(["RMR****150.00*150.00~"]);
    const amt = parse837([...LINE_837, SVD_837, "AMT*EAF*75.00~"]);
    const all = [...discarded(prem.warnings), ...discarded(amt.warnings)];
    // Count first. A `for` over an empty array asserts nothing.
    expect(all).toHaveLength(2);
    for (const w of all) {
      expect(w.position.elementIndex).toBeUndefined();
      expect(w.position.segmentIndex).toBeGreaterThan(0);
    }
  });
});

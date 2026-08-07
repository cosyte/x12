/**
 * `X12-837-RESIDUALS`: an `AMT` / `ADX` row that decodes no amount no longer
 * leaves the model in silence.
 *
 * The defect, in one line: `decodeAmt` (835, 837, 834) and `decodeAdx` (820)
 * answer `undefined` for the whole row when the amount element decodes no
 * value, and every caller then dropped the row with no diagnostic on any
 * channel. `AMT*AU~` gave `claim.amounts: []` and `warnings: []` - the same
 * reading a document that never carried the segment produces. The qualifier or
 * adjustment reason code the sender DID state went with it.
 *
 * **The absent and the unparseable routes are not the same case, and stating
 * that precisely is the point of this file.** An amount element holding bytes
 * that do not decode (`1,234.56`, `N/A`) already emitted
 * `X12_UNPARSEABLE_DECIMAL` at its `elementIndex`, because `decodeAmt` and
 * `decodeAdx` pass the decimal sink - so that row was dropped AND warned. An
 * ABSENT element emitted nothing at all, because an absent element is not an
 * unparseable one. Only the second was silent, and a first draft of the filing
 * said the wider thing and was measured false.
 *
 * **What changes here is additive, and no case moves.** Both routes now raise
 * `X12_AMOUNT_ROW_DROPPED` at the `AMT` / `ADX` itself, and the unparseable
 * route keeps `X12_UNPARSEABLE_DECIMAL` at its failing element alongside it.
 * A consumer predicate written against `X12_UNPARSEABLE_DECIMAL` therefore
 * still fires on exactly the documents it fired on before - that is asserted
 * below rather than assumed, because a widening that moves a case onto a new
 * code silently blinds every predicate written against the old one, which is
 * what refuted the preceding slice.
 *
 * **Only bytes can produce these cases.** No builder emits an `AMT` or `ADX`
 * with an empty or unreadable amount: every builder amount slot is a required
 * `X12Decimal` routed through `escDec`. So every case is written as literal
 * EDI. All data is synthetic.
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

function dropped(warnings: readonly X12ParseWarning[]): X12ParseWarning[] {
  return warnings.filter((w) => w.code === WARNING_CODES.X12_AMOUNT_ROW_DROPPED);
}

/**
 * Wrap a transaction body in a synthetic ISA / GS / ST envelope. `icr` is the
 * ST-03 implementation-convention reference, which the 837 reader resolves its
 * variant from; omitting it on an 837 raises `X12_837_UNKNOWN_VARIANT` and
 * would put an unrelated code on every warning-channel assertion here.
 */
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
// 835 - AMT on a remittance claim and on a remittance service line.
// ---------------------------------------------------------------------------

const ISA_835 =
  "ISA*00*          *00*          *ZZ*MEDICARE       *ZZ*SUBMITTER      " +
  "*260601*1200*^*00501*000000001*0*P*:~";
const GS_835 = "GS*HP*MEDICARE*SUBMITTER*20260601*1200*1*X*005010X221A1~";

/** A BALANCED 835 body, so the only warnings a case shows are its own. */
const BPR = "BPR*I*450.00*C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~";
const TRN = "TRN*1*0012345*1512345678~";
const CLP = "CLP*PT-ACCT-001*1*500.00*450.00*50.00*MC*PAYER-CLAIM-001*11*1~";
const SVC = "SVC*HC:99213*500.00*450.00**1~";
const CAS = "CAS*PR*1*50.00~";

function parse835(body: readonly string[]): X12Remittance {
  const raw = wrap(ISA_835, GS_835, "835", "005010X221A1", body);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
  if (tx === undefined) throw new Error("no 835 transaction set");
  const remit = get835(ix.delimiters, tx);
  if (remit === undefined) throw new Error("get835 returned undefined");
  return remit;
}

describe("🩺 835 AMT: a row that decodes no amount is reported, not dropped in silence", () => {
  it("an ABSENT AMT-02 drops the row and warns at the AMT", () => {
    // Through `0.0.12` this produced `amounts: []` and `warnings: []` - a
    // reading indistinguishable from a document that carried no AMT at all,
    // with the B6 qualifier the payer sent lost with it.
    const remit = parse835([BPR, TRN, "LX*1~", CLP, "AMT*B6~", SVC, CAS]);
    expect(remit.claims[0]?.amounts).toEqual([]);
    expect(codes(remit.warnings)).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
    // Anchored at the AMT itself. The body index is 1-based over the segments
    // after the ST: BPR TRN LX CLP AMT -> 5.
    expect(remit.warnings[0]?.position.segmentIndex).toBe(5);
    // NO elementIndex: this route's element is absent, so there is no element
    // to name. The segment fixes which element was being read (AMT-02).
    expect(remit.warnings[0]?.position.elementIndex).toBeUndefined();
  });

  it("an UNPARSEABLE AMT-02 drops the row and carries BOTH codes", () => {
    // The distinction the filing turned on. This route was already reported,
    // by `X12_UNPARSEABLE_DECIMAL` at the failing element - what it never said
    // was that the whole row went with it.
    const remit = parse835([BPR, TRN, "LX*1~", CLP, "AMT*B6*1,234.56~", SVC, CAS]);
    expect(remit.claims[0]?.amounts).toEqual([]);
    expect(codes(remit.warnings)).toEqual([
      WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
      WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    ]);
    const unparseable = remit.warnings[0];
    const rowDropped = remit.warnings[1];
    // Same segment, and only the unparseable one names an element. That pair
    // is what separates this route from the absent one.
    expect(unparseable?.position.segmentIndex).toBe(5);
    expect(unparseable?.position.elementIndex).toBe(2);
    expect(rowDropped?.position.segmentIndex).toBe(5);
    expect(rowDropped?.position.elementIndex).toBeUndefined();
  });

  it("CONTROL: a STATED zero builds a row and warns nothing", () => {
    // The half that must not collapse into the absent case. A payer that
    // states 0 stated something, and the row is the sender's.
    const remit = parse835([BPR, TRN, "LX*1~", CLP, "AMT*B6*0~", SVC, CAS]);
    expect(remit.claims[0]?.amounts).toHaveLength(1);
    expect(remit.claims[0]?.amounts[0]?.qualifier).toBe("B6");
    expect(remit.claims[0]?.amounts[0]?.amount?.toString()).toBe("0");
    expect(codes(remit.warnings)).toEqual([]);
  });

  it("CONTROL: a real amount builds a row and warns nothing", () => {
    const remit = parse835([BPR, TRN, "LX*1~", CLP, "AMT*B6*500.00~", SVC, CAS]);
    expect(remit.claims[0]?.amounts[0]?.amount?.toString()).toBe("500.00");
    expect(codes(remit.warnings)).toEqual([]);
  });

  it("a service-line AMT reaches the same report", () => {
    // The 835 AMT case attaches to the open SVC when there is one, so the loss
    // is a line-level supplemental amount rather than a claim-level one. Same
    // decoder, same drop, same report.
    const remit = parse835([BPR, TRN, "LX*1~", CLP, SVC, "AMT*B6~", CAS]);
    expect(remit.claims[0]?.serviceLines[0]?.amounts).toEqual([]);
    expect(codes(remit.warnings)).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
    expect(remit.warnings[0]?.position.segmentIndex).toBe(6);
  });

  it("BOUND: an AMT that DOES decode but has no claim open is still silent", () => {
    // Deliberately NOT widened, and pinned so the claim above stays honest.
    // This is a different loss - a row with nowhere to attach, not a row whose
    // amount failed to read - and it reproduces unchanged on the base tree.
    const remit = parse835([BPR, TRN, "AMT*B6*500.00~"]);
    expect(remit.claims).toEqual([]);
    expect(codes(remit.warnings)).not.toContain(WARNING_CODES.X12_AMOUNT_ROW_DROPPED);
  });

  it("BOUND, THE OTHER HALF: with no claim open an ABSENT amount STILL warns", () => {
    // The qualifier the published bound needs, and pass 1 refuted the slice for
    // dropping it. The 835 and the 837 decode the amount BEFORE they look for
    // somewhere to attach the row, so "nothing open" does not make this code
    // silent - only "the amount decoded" does. The 834 and the 820 return
    // before reading the amount at all and so ARE silent, which is why the
    // bound has to be stated per reader or as a property of the READ.
    const remit = parse835([BPR, TRN, "AMT*B6~"]);
    expect(remit.claims).toEqual([]);
    expect(codes(remit.warnings)).toContain(WARNING_CODES.X12_AMOUNT_ROW_DROPPED);
  });
});

// ---------------------------------------------------------------------------
// 837 - AMT on a claim.
// ---------------------------------------------------------------------------

const ISA_837 =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";
const GS_837 = "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A2~";

const CLAIM_837_HEAD = [
  "BHT*0019*00*0123*20260601*1200*CH~",
  "HL*1**20*1~",
  "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
  "HL*2*1*22*0~",
  "SBR*P*18*GROUP123******MB~",
  "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
  "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
  "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
] as const;

function parse837(trailing: readonly string[]): X12_837Submission {
  const raw = wrap(ISA_837, GS_837, "837", "005010X222A2", [...CLAIM_837_HEAD, ...trailing]);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
  if (tx === undefined) throw new Error("no 837 transaction set");
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return sub;
}

describe("🩺 837 AMT: the same report on a claim's supplemental amounts", () => {
  it("an ABSENT AMT-02 drops the row and warns at the AMT", () => {
    const sub = parse837(["AMT*F5~"]);
    expect(sub.claims[0]?.amounts).toEqual([]);
    expect(codes(sub.warnings)).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
    // BHT HL NM1 HL SBR NM1 NM1 CLM AMT -> body index 9.
    expect(sub.warnings[0]?.position.segmentIndex).toBe(9);
    expect(sub.warnings[0]?.position.elementIndex).toBeUndefined();
  });

  it("an UNPARSEABLE AMT-02 carries BOTH codes", () => {
    const sub = parse837(["AMT*F5*$120.00~"]);
    expect(sub.claims[0]?.amounts).toEqual([]);
    expect(codes(sub.warnings)).toEqual([
      WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
      WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    ]);
    expect(sub.warnings[0]?.position.elementIndex).toBe(2);
    expect(sub.warnings[1]?.position.elementIndex).toBeUndefined();
  });

  it("a LINE-level AMT reaches the same report, and the loss is the LINE's", () => {
    // Pass 1 refuted the slice on this: six surfaces called the 837's site
    // "claim-level", and the walker pushes onto the open service line FIRST.
    // This package's own dogfooded spec declares AMT situational in Loop 2400
    // (`loop-spec.ts`), so an X222A1 sales-tax `AMT*T` or postage `AMT*F4` on a
    // line is exactly the shape being lost. A consumer told to read
    // `claim.amounts` would find it unchanged and treat the warning as stale.
    const sub = parse837(["LX*1~", "SV1*HC:99213*500*UN*1***1~", "AMT*T~"]);
    expect(sub.claims[0]?.serviceLines[0]?.amounts).toEqual([]);
    expect(sub.claims[0]?.amounts).toEqual([]);
    expect(codes(sub.warnings)).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
  });

  it("BOUND: a Loop 2430 AMT under an open SVD is discarded, and the report INVERTS", () => {
    // Disclosed rather than widened. With a claim AND a line open, the
    // adjudication skip discards a Loop 2430 `AMT` outright, so a REMAINING
    // PATIENT LIABILITY that decoded perfectly well is lost in silence while
    // one that decoded nothing is reported. The warning is present exactly
    // where LESS was lost. That is a v1 scope limit on the adjudication model,
    // not a failed read, and closing it is a retention decision of its own.
    const decoded = parse837([
      "LX*1~",
      "SV1*HC:99213*500*UN*1***1~",
      "SVD*PAYER01*100.00*HC:99213**1~",
      "AMT*EAF*75.00~",
    ]);
    expect(decoded.claims[0]?.serviceLines[0]?.amounts).toEqual([]);
    expect(codes(decoded.warnings)).toEqual([]);

    const undecoded = parse837([
      "LX*1~",
      "SV1*HC:99213*500*UN*1***1~",
      "SVD*PAYER01*100.00*HC:99213**1~",
      "AMT*EAF~",
    ]);
    expect(codes(undecoded.warnings)).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
  });

  it("CONTROL: a stated amount and a stated zero both build rows, silently", () => {
    const real = parse837(["AMT*F5*120.00~"]);
    expect(real.claims[0]?.amounts[0]?.amount?.toString()).toBe("120.00");
    expect(codes(real.warnings)).toEqual([]);

    const zero = parse837(["AMT*F5*0~"]);
    expect(zero.claims[0]?.amounts[0]?.amount?.toString()).toBe("0");
    expect(codes(zero.warnings)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 834 - AMT under a health coverage, on the PER-MEMBER warning channel.
// ---------------------------------------------------------------------------

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

const HD_834 = "HD*030**HLT*PLAN-A*EMP~";

describe("🩺 834 AMT: the report lands on the member's own warning channel", () => {
  it("an ABSENT AMT-02 drops the premium row and warns on that member", async () => {
    // The 834 accumulates warnings per MEMBER rather than per transaction, so
    // this report follows the decimal sink beside it onto `member.warnings`.
    // A roster-level channel would say a premium was lost without saying whose.
    const [member] = await parse834([HD_834, "DTP*348*D8*20260101~", "AMT*P3~"]);
    expect(member?.healthCoverages[0]?.amounts).toEqual([]);
    expect(codes(member?.warnings ?? [])).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
    expect(member?.warnings[0]?.position.elementIndex).toBeUndefined();
  });

  it("an UNPARSEABLE AMT-02 carries BOTH codes, on that same member channel", async () => {
    const [member] = await parse834([HD_834, "AMT*P3*1,200.00~"]);
    expect(codes(member?.warnings ?? [])).toEqual([
      WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
      WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    ]);
  });

  it("CONTROL: a stated premium builds a row and warns nothing", async () => {
    const [member] = await parse834([HD_834, "AMT*P3*250.00~"]);
    expect(member?.healthCoverages[0]?.amounts[0]?.amount?.toString()).toBe("250.00");
    expect(codes(member?.warnings ?? [])).toEqual([]);
  });

  it("BOUND: an AMT with no HD coverage open is still silent", async () => {
    // The reader returns before reading the amount at all, so nothing decoded
    // and nothing failed to decode. A different loss, unchanged on both trees.
    const [member] = await parse834(["AMT*P3~"]);
    expect(member?.healthCoverages).toEqual([]);
    expect(codes(member?.warnings ?? [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 820 - ADX, whose amount is element 1.
// ---------------------------------------------------------------------------

const ISA_820 =
  "ISA*00*          *00*          *ZZ*EMPLOYER       *ZZ*PLAN           " +
  "*260601*1200*^*00501*000000001*0*P*:~";
const GS_820 = "GS*RA*EMPLOYER*PLAN*20260601*1200*1*X*005010X218~";

const PREMIUM_820_HEAD = [
  "BPR*C*250.00*C*ACH*CCP*01*1*DA*1*1512345678**01*1*DA*2*20260601~",
  "TRN*1*PREM-0001~",
  "ENT*1*2J*FI*GRP-0001~",
  "NM1*IL*1*DOE*JANE****MI*MBR0001~",
] as const;

function parse820(trailing: readonly string[]): X12PremiumPayments {
  const raw = wrap(ISA_820, GS_820, "820", "005010X218", [...PREMIUM_820_HEAD, ...trailing]);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "820");
  if (tx === undefined) throw new Error("no 820 transaction set");
  const prem = get820Payments(ix.delimiters, tx);
  if (prem === undefined) throw new Error("get820Payments returned undefined");
  return prem;
}

describe("🩺 820 ADX: the amount is element 1, and the same report covers it", () => {
  it("an ABSENT ADX-01 drops the adjustment and warns at the ADX", () => {
    // The reason code 53 (debit memo) the sender stated is lost with the row,
    // which is why the loss is worth a diagnostic at all.
    const prem = parse820(["ADX**53*PO*POL-0001~"]);
    expect(prem.remittances[0]?.adjustments).toEqual([]);
    expect(codes(prem.warnings)).toEqual([WARNING_CODES.X12_AMOUNT_ROW_DROPPED]);
    // BPR TRN ENT NM1 ADX -> body index 5.
    expect(prem.warnings[0]?.position.segmentIndex).toBe(5);
    expect(prem.warnings[0]?.position.elementIndex).toBeUndefined();
  });

  it("an UNPARSEABLE ADX-01 carries BOTH codes, and names element 1", () => {
    const prem = parse820(["ADX*-25.00USD*53*PO*POL-0001~"]);
    expect(prem.remittances[0]?.adjustments).toEqual([]);
    expect(codes(prem.warnings)).toEqual([
      WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
      WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    ]);
    // ADX-01, not AMT-02: the element index follows the segment, which is
    // exactly why the dropped-row report carries none of its own.
    expect(prem.warnings[0]?.position.elementIndex).toBe(1);
    expect(prem.warnings[1]?.position.elementIndex).toBeUndefined();
  });

  it("CONTROL: a signed adjustment builds a row and warns nothing", () => {
    const prem = parse820(["ADX*-25.00*53*PO*POL-0001~"]);
    expect(prem.remittances[0]?.adjustments[0]?.amount?.toString()).toBe("-25.00");
    expect(prem.remittances[0]?.adjustments[0]?.reasonCode).toBe("53");
    expect(codes(prem.warnings)).toEqual([]);
  });

  it("BOUND: an 820 RMR is NOT on this channel - it drops on IDENTITY, not on its amount", () => {
    // `decodeRmr` returns undefined when RMR-01 and RMR-02 are BOTH empty,
    // BEFORE RMR-04 or RMR-05 is read. So an RMR that states an open item and
    // no amount keeps its row with `amountPaid` undefined - no dropped row, and
    // reporting one would be false.
    const kept = parse820(["RMR*AZ*POL-0001*PI~"]);
    expect(kept.remittances[0]?.openItems[0]?.referenceId).toBe("POL-0001");
    expect(kept.remittances[0]?.openItems[0]?.amountPaid).toBeUndefined();
    expect(codes(kept.warnings)).toEqual([]);
  });

  it("BOUND: an RMR with NO identity is dropped whole and silently, amount and all", () => {
    // Pass 1 refuted the slice for publishing "an RMR row is retained with its
    // amounts left undecoded" as if it held for every RMR. It does not, and
    // this is the case that falsifies it: with RMR-01 and RMR-02 both empty the
    // row is dropped before the amount is read, so a stated 150.00 payment, its
    // payment-action code and its amount due are all gone with `warnings: []`.
    // `PRE-EXISTING` - identical on the base tree - and its own item. It is NOT
    // this code's shape: nothing failed to decode, so widening this code to
    // cover it would be the retention decision this slice deliberately defers.
    const bare = parse820(["RMR~"]);
    expect(bare.remittances[0]?.openItems).toEqual([]);
    expect(codes(bare.warnings)).toEqual([]);

    const amountOnly = parse820(["RMR****150.00*150.00~"]);
    expect(amountOnly.remittances[0]?.openItems).toEqual([]);
    expect(codes(amountOnly.warnings)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The consumer-predicate migration, pinned.
// ---------------------------------------------------------------------------

describe("🩺 the published predicate: gate on BOTH codes, and the old one still fires", () => {
  it("a gate on X12_UNPARSEABLE_DECIMAL alone MISSES the absent-amount drop", () => {
    // The shape that refuted the preceding slice, checked in the direction it
    // actually applies here. Nothing MOVED onto the new code, so no existing
    // predicate went blind - but a consumer asking "did an amount fail to
    // read?" through `X12_UNPARSEABLE_DECIMAL` never saw this document at all,
    // on any release, and still does not. The two-code gate is what sees it.
    const remit = parse835([BPR, TRN, "LX*1~", CLP, "AMT*B6~", SVC, CAS]);
    const unparseableOnly = remit.warnings.some(
      (w) => w.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
    );
    const bothCodes = remit.warnings.some(
      (w) =>
        w.code === WARNING_CODES.X12_UNPARSEABLE_DECIMAL ||
        w.code === WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    );
    expect(unparseableOnly).toBe(false);
    expect(bothCodes).toBe(true);
  });

  it("the old one-code gate still fires on exactly the documents it fired on", () => {
    // The additions-only half. `X12_UNPARSEABLE_DECIMAL` is raised at the same
    // element on the same document as before, so a predicate written against
    // it is not silently narrowed by this slice. This is the assertion whose
    // absence cost the preceding slice a pass.
    const unparseableAmt = parse835([BPR, TRN, "LX*1~", CLP, "AMT*B6*1,234.56~", SVC, CAS]);
    expect(codes(unparseableAmt.warnings)).toContain(WARNING_CODES.X12_UNPARSEABLE_DECIMAL);

    // And on a decimal that is NOT an AMT / ADX row, where this slice changes
    // nothing at all: an unparseable CLP-04 warns and raises no dropped-row
    // report, because no row was dropped.
    const unparseableClp = parse835([
      BPR,
      TRN,
      "LX*1~",
      "CLP*PT-ACCT-001*1*500.00*4,50.00*50.00*MC*PAYER-CLAIM-001*11*1~",
    ]);
    expect(codes(unparseableClp.warnings)).toContain(WARNING_CODES.X12_UNPARSEABLE_DECIMAL);
    expect(codes(unparseableClp.warnings)).not.toContain(WARNING_CODES.X12_AMOUNT_ROW_DROPPED);
  });
});

// ---------------------------------------------------------------------------
// Registry + diagnostic-surface discipline.
// ---------------------------------------------------------------------------

describe("X12_AMOUNT_ROW_DROPPED: registry membership and the PHI boundary", () => {
  it("its message is a registry lookup, not an interpolation", () => {
    const remit = parse835([BPR, TRN, "LX*1~", CLP, "AMT*B6~", SVC, CAS]);
    const w = dropped(remit.warnings)[0];
    expect(w).toBeDefined();
    expect(ALL_WARNING_MESSAGES.has(w?.message ?? "")).toBe(true);
  });

  it("it echoes no element the document supplied", () => {
    // The qualifier, the reason code and the reference id are all document
    // bytes, and a premium adjustment's reference id can carry a policy or
    // member identifier. None of them may reach a diagnostic.
    const prem = parse820(["ADX**53*PO*MBR0001-SENSITIVE~"]);
    const w = dropped(prem.warnings)[0];
    expect(w).toBeDefined();
    for (const leak of ["MBR0001-SENSITIVE", "POL-0001", "53", "PO"]) {
      expect(w?.message).not.toContain(leak);
    }
  });

  it("every reader reports it at the segment and never at an element", () => {
    // One property across all four readers: the anchor is the AMT / ADX, and
    // the dropped-row report never names an element, because one of its two
    // routes has no element to name.
    const remit = parse835([BPR, TRN, "LX*1~", CLP, "AMT*B6*1,234.56~", SVC, CAS]);
    const sub = parse837(["AMT*F5*$120.00~"]);
    const prem = parse820(["ADX*-25.00USD*53~"]);
    const all = [...dropped(remit.warnings), ...dropped(sub.warnings), ...dropped(prem.warnings)];
    // Count first. A `for` over an empty array asserts nothing, and a sweep
    // that passes because it swept nothing is the vacuous-test failure this
    // repo has already paid for once.
    expect(all).toHaveLength(3);
    for (const w of all) {
      expect(w.position.elementIndex).toBeUndefined();
      expect(w.position.segmentIndex).toBeGreaterThan(0);
    }
  });
});

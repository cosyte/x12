/**
 * Deterministic branch exercises for the 837 walker. These complement the
 * fixture-driven Tier-1/Tier-2 suites by driving the long-tail branches with
 * small inline synthetic 837s - the cross-variant SVx guards, the merge
 * fallbacks (a second N4/SBR that omits a field the first supplied), the
 * in-adjudication REF/AMT short-circuits, the empty-CAS / empty-tooth guards,
 * and the info-source-HL-with-parent warning. Inline EDI keeps each branch's
 * trigger visible next to its assertion; all data is synthetic.
 */

import { describe, expect, it } from "vitest";

import { WARNING_CODES, get837Claims, parseX12 } from "../src/index.js";
import type { X12_837Submission } from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/** Wrap a body (between BHT and SE) in a synthetic 837 envelope for `icr`. */
function build837(icr: string, body: readonly string[]): X12_837Submission {
  const segs = [
    ISA,
    `GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*${icr}~`,
    `ST*837*0001*${icr}~`,
    "BHT*0019*00*0123*20260601*1200*CH~",
    "NM1*41*2*SUBMITTER ONE*****46*SUB001~",
    "NM1*40*2*RECEIVER ONE*****46*REC001~",
    ...body,
    `SE*${body.length + 5}*0001~`,
    "GE*1*1~",
    "IEA*1*000000001~",
  ];
  const ix = parseX12(segs.join("\n"));
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "837");
  if (tx === undefined) throw new Error("no 837 transaction set");
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return sub;
}

/** Minimal 2000A/2000B hierarchy + a CLM, parameterised by trailing body. */
function claimBody(trailing: readonly string[]): readonly string[] {
  return [
    "HL*1**20*1~",
    "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
    "HL*2*1*22*0~",
    "SBR*P*18*GROUP123******MB~",
    "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
    "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
    "CLM*PT-ACCT-900*150***11:B:1*Y*A*Y*Y~",
    "HI*ABK:J20.9~",
    "LX*1~",
    ...trailing,
  ];
}

describe("get837Claims - info-source HL declaring a parent", () => {
  it("emits X12_HL_PARENT_MISMATCH when a level-20 HL carries an HL-02", () => {
    const sub = build837("005010X222A2", [
      "HL*1*9*20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
    ]);
    const codes = sub.warnings.map((w) => w.code);
    expect(codes).toContain(WARNING_CODES.X12_HL_PARENT_MISMATCH);
  });
});

describe("get837Claims - cross-variant SVx segments are ignored, not misread", () => {
  it("837P line ignores an SV2 segment (institutional revenue code)", () => {
    const sub = build837("005010X222A2", claimBody(["SV2*0300*HC:99213*150*UN*1~"]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("P");
    expect(line && "revenueCode" in line ? line.revenueCode : undefined).toBeUndefined();
  });

  it("837P line ignores an SV3 segment (dental procedure)", () => {
    const sub = build837("005010X222A2", claimBody(["SV3*AD:D1110*75~"]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("P");
  });

  it("837I line ignores an SV1 segment (professional procedure)", () => {
    const sub = build837("005010X223A3", claimBody(["SV1*HC:99213*150*UN*1***1~"]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("I");
  });
});

describe("get837Claims - entity address/subscriber merge fallbacks", () => {
  it("a second N4 omitting city keeps the first N4's city (base fallback)", () => {
    const sub = build837("005010X222A2", [
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "N3*123 BILLING WAY~",
      "N4*CLEVELAND*OH*44113~",
      "N4**OH*44114~",
    ]);
    expect(sub.claims).toHaveLength(0);
    // billing provider survives across the two N4s; city retained, postal updated.
    const sub2 = build837("005010X222A2", [
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "N4*CLEVELAND*OH*44113~",
      "N4**OH*44114~",
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      "CLM*PT-ACCT-901*150***11:B:1*Y*A*Y*Y~",
    ]);
    expect(sub2.claims[0]?.billingProvider?.address?.city).toBe("CLEVELAND");
    expect(sub2.claims[0]?.billingProvider?.address?.postalCode).toBe("44114");
  });

  it("a PAT after the subscriber SBR keeps the SBR's group number (merge base fallback)", () => {
    const sub = build837("005010X222A2", [
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "PAT*19~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      "CLM*PT-ACCT-902*150***11:B:1*Y*A*Y*Y~",
    ]);
    expect(sub.claims[0]?.subscriber?.info.groupNumber).toBe("GROUP123");
  });
});

describe("get837Claims - Loop 2430 adjudication short-circuits", () => {
  it("REF and AMT after an SVD are ignored while in adjudication context", () => {
    const sub = build837(
      "005010X222A2",
      claimBody([
        "SV1*HC:99213*150*UN*1***1~",
        "SVD*PAYER02*100*HC:99213**1~",
        "CAS*CO*45*50~",
        "REF*6R*SHOULD-BE-IGNORED~",
        "AMT*B6*100~",
        "DTP*573*D8*20260605~",
      ]),
    );
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.adjudications[0]?.dateAdjudicated).toBe("20260605");
    // the REF/AMT landed in neither the line nor the claim (eaten by adjudication).
    expect(line?.references ?? []).toHaveLength(0);
    expect(line?.amounts ?? []).toHaveLength(0);
  });

  it("an empty CAS (no reason/amount triplet) contributes no adjustments", () => {
    const sub = build837(
      "005010X222A2",
      claimBody(["SV1*HC:99213*150*UN*1***1~", "SVD*PAYER02*100*HC:99213**1~", "CAS*CO~"]),
    );
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.adjudications[0]?.adjustments ?? []).toHaveLength(0);
  });
});

describe("get837Claims - dental tooth guards", () => {
  it("a TOO with an empty tooth code is dropped (no tooth entry)", () => {
    const sub = build837("005010X224A2", [
      "HL*1**20*1~",
      "NM1*85*2*DENTAL CLINIC*****XX*1234567890~",
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      "CLM*PT-ACCT-903*75***11:B:1*Y*A*Y*Y~",
      "LX*1~",
      "SV3*AD:D1110*75~",
      "TOO*JP~",
    ]);
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("D");
    expect(line && line.variant === "D" ? line.toothInformation : []).toHaveLength(0);
  });
});

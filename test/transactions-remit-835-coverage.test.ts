/**
 * Coverage-focused tests for the Phase 4 835 walker - pins down the
 * branches that the six narrative fixtures do not exercise:
 *
 * - MIA (inpatient adjudication info) carrying RARC codes at MIA-05 / MIA-20.
 * - MOA (outpatient adjudication info) carrying RARC codes at MOA-03 / MOA-04.
 * - AMT supplemental amount at the service-line level.
 * - NM1*74 (corrected patient) + NM1*IL (subscriber) + a second NM1*82
 *   that lands as `renderingProvider`.
 * - DTM with a service-line range qualifier (`150` / `151`).
 * - CAS with the second triple populated (quantity-only situation).
 * - A 5010 sender's CUR header segment is silently tolerated.
 * - A PLB segment with no third composite (single take-back, no trailing pairs).
 *
 * Uses small inline EDI strings rather than committed fixtures so each
 * branch lives next to its assertion.
 */

import { describe, expect, it } from "vitest";

import { WARNING_CODES, get835, parseX12 } from "../src/index.js";

const ENVELOPE_OPEN =
  "ISA*00*          *00*          *ZZ*PAYER          *ZZ*PROVIDER       *260628*1200*^*00501*000000088*0*P*:~\n" +
  "GS*HP*PAYER*PROVIDER*20260628*1200*88*X*005010X221A1~\n" +
  "ST*835*0088~\n";
const ENVELOPE_CLOSE = "GE*1*88~\nIEA*1*000000088~\n";

function parse835(body: string, seCount: number): ReturnType<typeof get835> {
  const raw = `${ENVELOPE_OPEN}${body}SE*${String(seCount)}*0088~\n${ENVELOPE_CLOSE}`;
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "835");
  if (tx === undefined) throw new Error("no 835 transaction");
  return get835(ix.delimiters, tx);
}

describe("get835 coverage - MIA / MOA / AMT / NM1*74", () => {
  it("MIA-05 and MIA-20 surface as service-line LQ-equivalent remarks at claim level", () => {
    // Charge 1000, paid 800, MIA*05=N4 MIA*20=ZZZZ; claim-level CAS for $200 to keep balance.
    const body =
      "BPR*I*800.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*MIA-1*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-MIA*1*1000.00*800.00*0*MA*PCN-MIA*11*1~\n" +
      "CAS*CO*45*200.00~\n" +
      "MIA*0****N4***************ZZZZ~\n";
    const remit = parse835(body, 9);
    if (remit === undefined) throw new Error("undefined remit");
    const claim = remit.claims[0];
    if (claim === undefined) throw new Error("missing claim");
    expect(claim.remarks).toHaveLength(2);
    expect(claim.remarks[0]?.code).toBe("N4");
    expect(claim.remarks[0]?.description).toMatch(/EOB/iu);
    expect(claim.remarks[1]?.code).toBe("ZZZZ");
    expect(remit.warnings.some((w) => w.code === WARNING_CODES.X12_UNKNOWN_RARC)).toBe(true);
  });

  it("MOA-03 .. MOA-07 surface as claim-level remarks", () => {
    const body =
      "BPR*I*900.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*MOA-1*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-MOA*1*1000.00*900.00*0*13*PCN-MOA*11*1~\n" +
      "CAS*CO*45*100.00~\n" +
      "MOA**0*M1*M86~\n";
    const remit = parse835(body, 9);
    if (remit === undefined) throw new Error("undefined remit");
    expect(remit.claims[0]?.remarks.map((r) => r.code)).toEqual(["M1", "M86"]);
  });

  it("service-line AMT supplemental amount lands in the line.amounts list", () => {
    const body =
      "BPR*I*135.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*AMT-1*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-AMT*1*150.00*135.00*15.00*13*PCN-AMT*11*1~\n" +
      "SVC*HC:99213*150.00*135.00**1~\n" +
      "CAS*PR*1*15.00~\n" +
      "AMT*B6*135.00~\n";
    const remit = parse835(body, 9);
    if (remit === undefined) throw new Error("undefined remit");
    const line = remit.claims[0]?.serviceLines[0];
    expect(line?.amounts).toHaveLength(1);
    expect(line?.amounts[0]?.qualifier).toBe("B6");
    expect(line?.amounts[0]?.amount.toString()).toBe("135.00");
  });

  it("claim AMT (before SVC) lands on claim.amounts", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*AMT-2*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-AMTC*1*100.00*100.00*0*MC*PCN-AMTC*11*1~\n" +
      "AMT*AU*100.00~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n";
    const remit = parse835(body, 8);
    if (remit === undefined) throw new Error("undefined remit");
    expect(remit.claims[0]?.amounts.map((a) => a.qualifier)).toEqual(["AU"]);
  });

  it("AMT with no amount field returns undefined and is dropped", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*AMT-3*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-AMTD*1*100.00*100.00*0*MC*PCN-AMTD*11*1~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n" +
      "AMT*B6~\n";
    const remit = parse835(body, 8);
    if (remit === undefined) throw new Error("undefined remit");
    expect(remit.claims[0]?.serviceLines[0]?.amounts).toHaveLength(0);
  });

  it("NM1*IL (subscriber), NM1*74 (corrected patient), and a second NM1*82 land on the right slots", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*NM-1*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-NM*1*100.00*100.00*0*MC*PCN-NM*11*1~\n" +
      "NM1*QC*1*LAST*FIRST****MI*MEM-1~\n" +
      "NM1*IL*1*SUBLAST*SUBFIRST****MI*MEM-1~\n" +
      "NM1*74*1*OLDLAST*OLDFIRST****MI*OLD-MEM~\n" +
      "NM1*82*2*SERVICE PROVIDER*****XX*1111111111~\n" +
      "NM1*82*2*RENDERING PROVIDER*****XX*2222222222~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n";
    const remit = parse835(body, 12);
    if (remit === undefined) throw new Error("undefined remit");
    const claim = remit.claims[0];
    expect(claim?.subscriber?.lastName).toBe("SUBLAST");
    expect(claim?.correctedPatient?.lastName).toBe("OLDLAST");
    expect(claim?.serviceProvider?.idCode).toBe("1111111111");
    expect(claim?.renderingProvider?.idCode).toBe("2222222222");
  });

  it("service-line DTM*150/151 range qualifier sets serviceDateStart/End", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*DTM-1*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-DTM*1*100.00*100.00*0*MC*PCN-DTM*11*1~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n" +
      "DTM*150*20260615~\n" +
      "DTM*151*20260616~\n";
    const remit = parse835(body, 9);
    if (remit === undefined) throw new Error("undefined remit");
    const line = remit.claims[0]?.serviceLines[0];
    expect(line?.serviceDateStart).toBe("20260615");
    expect(line?.serviceDateEnd).toBe("20260616");
  });

  it("CAS with quantity-only second triple flattens correctly (quantity preserved)", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*CAS-Q*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-CASQ*1*200.00*100.00*0*MC*PCN-CASQ*11*1~\n" +
      "SVC*HC:99213*200.00*100.00**2~\n" +
      "CAS*CO*45*100.00*2~\n";
    const remit = parse835(body, 7);
    if (remit === undefined) throw new Error("undefined remit");
    const adj = remit.claims[0]?.serviceLines[0]?.adjustments[0];
    expect(adj?.amount.toString()).toBe("100.00");
    expect(adj?.quantity?.toString()).toBe("2");
  });

  it("CUR header segment is silently tolerated", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*CUR-1*1~\n" +
      "CUR*PR*USD~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-CUR*1*100.00*100.00*0*MC*PCN-CUR*11*1~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n";
    const remit = parse835(body, 8);
    if (remit === undefined) throw new Error("undefined remit");
    expect(remit.payment.method).toBe("ACH");
  });

  it("PLB with a single take-back balances cleanly", () => {
    const body =
      "BPR*I*50.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*PLB-S*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-PLB*1*100.00*100.00*0*MC*PCN-PLB*11*1~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n" +
      "PLB*1*20261231*WO:CLAIM-X*50.00~\n";
    const remit = parse835(body, 8);
    if (remit === undefined) throw new Error("undefined remit");
    expect(remit.providerAdjustments).toHaveLength(1);
    expect(remit.providerAdjustments[0]?.amount.toString()).toBe("50.00");
  });

  it("PLB with a negative amount (credit to provider) increases BPR-02", () => {
    const body =
      "BPR*I*110.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*PLB-C*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-PLBC*1*100.00*100.00*0*MC*PCN-PLBC*11*1~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n" +
      "PLB*1*20261231*L6*-10.00~\n";
    const remit = parse835(body, 8);
    if (remit === undefined) throw new Error("undefined remit");
    expect(remit.providerAdjustments[0]?.amount.toString()).toBe("-10.00");
    // 100 - (-10) = 110 == BPR-02 → no balance warning.
    expect(
      remit.warnings.filter((w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH),
    ).toHaveLength(0);
  });

  it("an 835 with no LX header still extracts claims (Medicare-style)", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*NOLX-1*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "CLP*PT-NOLX*1*100.00*100.00*0*MC*PCN-NOLX*11*1~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n";
    const remit = parse835(body, 7);
    if (remit === undefined) throw new Error("undefined remit");
    expect(remit.claims).toHaveLength(1);
    expect(remit.claims[0]?.patientControlNumber).toBe("PT-NOLX");
  });

  it("LQ outside HE system surfaces verbatim without an unknown-RARC warning", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*LQ-1*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-LQ*1*100.00*100.00*0*MC*PCN-LQ*11*1~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n" +
      "LQ*RX*REJECT-12~\n";
    const remit = parse835(body, 8);
    if (remit === undefined) throw new Error("undefined remit");
    const remark = remit.claims[0]?.serviceLines[0]?.remarks[0];
    expect(remark?.system).toBe("RX");
    expect(remark?.code).toBe("REJECT-12");
    expect(remark?.description).toBeUndefined();
    expect(remit.warnings.filter((w) => w.code === WARNING_CODES.X12_UNKNOWN_RARC)).toHaveLength(0);
  });

  it("LQ with empty code is dropped silently", () => {
    const body =
      "BPR*I*100.00*C*ACH*CCP*01*1*DA*1*1*20260628**01*2*DA*2*20260628~\n" +
      "TRN*1*LQ-E*1~\n" +
      "N1*PR*PAYER~\nN1*PE*PROVIDER~\n" +
      "LX*1~\n" +
      "CLP*PT-LQE*1*100.00*100.00*0*MC*PCN-LQE*11*1~\n" +
      "SVC*HC:99213*100.00*100.00**1~\n" +
      "LQ*HE~\n";
    const remit = parse835(body, 8);
    if (remit === undefined) throw new Error("undefined remit");
    expect(remit.claims[0]?.serviceLines[0]?.remarks).toHaveLength(0);
  });
});

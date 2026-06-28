/**
 * TRN-echo round-trip property — the safety-critical reassociation
 * invariant for the 270/271 and 276/277 exchanges. A 271 MUST echo the
 * requesting 270's TRN-02 trace number verbatim, and a 277 MUST echo the
 * 276's, so the provider can re-associate the response with the request it
 * sent. The walkers must never mutate, normalize, or drop the trace.
 *
 * For any synthetic trace token, embedding it as TRN-02 in a 271 (or 277)
 * and walking the result yields a trace whose `referenceId` is byte-for-
 * byte the original token.
 */

import fc from "fast-check";
import { describe, it, expect } from "vitest";

import { get271Eligibility, get277Status, parseX12 } from "../../src/index.js";

/** Trace tokens drawn from a delimiter-safe grammar (no `*` `:` `^` `~`). */
const traceArb = fc.stringMatching(/^[A-Z0-9-]{1,30}$/).filter((s) => s.length > 0);

function build271(trace: string): string {
  return [
    "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
    "GS*HB*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X279A1~",
    "ST*271*0001*005010X279A1~",
    "BHT*0022*11*REQ*20260601*1200~",
    "HL*1**20*1~",
    "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
    "HL*2*1*21*1~",
    "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
    "HL*3*2*22*0~",
    `TRN*2*${trace}*9SAMPLEORG~`,
    "NM1*IL*1*DOE*JANE****MI*MBR0001~",
    "EB*1*IND*30**GOLD PPO~",
    "SE*11*0001~",
    "GE*1*1~",
    "IEA*1*000000001~",
  ].join("\n");
}

function build277(trace: string): string {
  return [
    "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
    "GS*HN*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X212~",
    "ST*277*0001*005010X212~",
    "BHT*0010*08*REQ*20260601*1200*DG~",
    "HL*1**20*1~",
    "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
    "HL*2*1*21*1~",
    "NM1*41*2*ANYTOWN CLINIC*****46*RECVR01~",
    "HL*3*2*19*1~",
    "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
    "HL*4*3*22*0~",
    "NM1*IL*1*DOE*JANE****MI*MBR0001~",
    `TRN*2*${trace}~`,
    "STC*A2:20:PR*20260601*WQ*150~",
    "SE*13*0001~",
    "GE*1*1~",
    "IEA*1*000000001~",
  ].join("\n");
}

describe("TRN echo — 271 reassociation", () => {
  it("echoes the requesting 270 trace verbatim onto the subscriber", () => {
    fc.assert(
      fc.property(traceArb, (trace) => {
        const ix = parseX12(build271(trace));
        const tx = ix.groups[0]?.transactions[0];
        if (tx === undefined) return false;
        const elig = get271Eligibility(ix.delimiters, tx);
        return elig?.subscribers[0]?.traces[0]?.referenceId === trace;
      }),
    );
  });
});

describe("TRN echo — 277 reassociation", () => {
  it("echoes the requesting 276 trace verbatim onto the claim", () => {
    fc.assert(
      fc.property(traceArb, (trace) => {
        const ix = parseX12(build277(trace));
        const tx = ix.groups[0]?.transactions[0];
        if (tx === undefined) return false;
        const status = get277Status(ix.delimiters, tx);
        return status?.claims[0]?.traces[0]?.referenceId === trace;
      }),
    );
  });

  it("is a fixed point — a known trace survives the walk unchanged", () => {
    const ix = parseX12(build277("CLAIM-20260627-001"));
    const tx = ix.groups[0]?.transactions[0];
    expect(tx).toBeDefined();
    if (tx === undefined) return;
    const status = get277Status(ix.delimiters, tx);
    expect(status?.claims[0]?.traces[0]?.referenceId).toBe("CLAIM-20260627-001");
  });
});

/**
 * `X12-837-SV-SILENT-ZERO`: a Loop 2400 service line whose SVx never decoded
 * used to ship `charge` / `units` at the accumulator's seeded
 * `X12Decimal.ZERO` with `warnings: []`, indistinguishable from a line the
 * sender really billed at zero. This suite pins the closure.
 *
 * 🩺 **What changed is the silence, not the zero.** The model is untouched:
 * `charge` and `units` are still typed `X12Decimal` and still read `0` on
 * such a line. `X12_837_SERVICE_LINE_NOT_DECODED` is what makes that `0`
 * announce itself as a stand-in. Making the slots `X12Decimal | undefined`
 * is a breaking model change and its own slice.
 *
 * **Only bytes can produce these cases.** A round trip cannot: `build837`
 * emits the SVx that matches the variant it was asked for, so every case
 * below is written as literal EDI. All data is synthetic.
 *
 * The two-way structure is the evidence. Every variant appears twice - once
 * with the SVx the resolved variant expects (decodes, silent) and once with
 * a foreign one (does not decode, warns) - so a warning that fired
 * unconditionally, or a flag that was never set, reds one half or the other.
 */

import { describe, expect, it } from "vitest";

import { ALL_WARNING_MESSAGES, WARNING_CODES, get837Claims, parseX12 } from "../src/index.js";
import type { X12ParseWarning, X12TransactionSet, X12_837Submission } from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/** The marker planted in an ignored SVx, to prove no diagnostic quotes it. */
const IGNORED_SEGMENT_MARKER = "ZZMARKERZZ";

interface Parsed {
  readonly sub: X12_837Submission;
  readonly tx: X12TransactionSet;
}

/** Wrap a body (between BHT and SE) in a synthetic 837 envelope for `icr`. */
function parse837(icr: string, body: readonly string[], type?: "P" | "I" | "D"): Parsed {
  const segs = [
    ISA,
    `GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*${icr}~`,
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
  const sub = get837Claims(ix.delimiters, tx, type === undefined ? undefined : { type });
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return { sub, tx };
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
    "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
    "HI*ABK:J20.9~",
    "LX*1~",
    ...trailing,
  ];
}

function codes(warnings: readonly X12ParseWarning[]): string[] {
  return warnings.map((w) => w.code);
}

function notDecoded(sub: X12_837Submission): X12ParseWarning[] {
  return sub.warnings.filter((w) => w.code === WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
}

// The wire values every mismatch case below throws away: an $8,500 charge and
// 4 units. Both are the shapes a payer acts on.
const SV1 = "SV1*HC:99213*8500*UN*4***1~";
const SV2 = "SV2*0300*HC:99213*8500*UN*4~";
// SV3's quantity is SV3-06, not SV3-04: SV3-03 is the facility code, SV3-04
// the oral-cavity designation and SV3-05 the prosthesis/crown/inlay code.
const SV3 = "SV3*AD:D1110*8500****4~";

describe("X12-837-SV-SILENT-ZERO: a service line whose SVx never decoded warns", () => {
  it("🩺 an SV2 on a line the transaction resolved as Professional: 0 / 0, and it says so", () => {
    const { sub } = parse837("005010X222A2", claimBody([SV2]));
    const line = sub.claims[0]?.serviceLines[0];

    // The line is retained, and this is the fabricated pair.
    expect(line?.variant).toBe("P");
    expect(line?.charge.toString()).toBe("0");
    expect(line?.units.toString()).toBe("0");
    // ... which is now announced rather than silent.
    expect(codes(sub.warnings)).toContain(WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
  });

  it("🩺 an SV1 on a line the transaction resolved as Institutional warns", () => {
    const { sub } = parse837("005010X223A3", claimBody([SV1]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("I");
    expect(line?.charge.toString()).toBe("0");
    expect(codes(sub.warnings)).toContain(WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
  });

  it("🩺 an SV1 on a line the transaction resolved as Dental warns", () => {
    const { sub } = parse837("005010X224A2", claimBody([SV1]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.variant).toBe("D");
    expect(line?.charge.toString()).toBe("0");
    expect(codes(sub.warnings)).toContain(WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
  });

  it("🩺 a caller-supplied `type` that disagrees with the document warns too", () => {
    // Reachable without touching the bytes: the document is a conformant 837I
    // and the caller asks for "P". Same hole, different lever.
    const { sub } = parse837("005010X223A3", claimBody([SV2]), "P");
    const line = sub.claims[0]?.serviceLines[0];
    expect(sub.variant).toBe("P");
    expect(line?.charge.toString()).toBe("0");
    expect(codes(sub.warnings)).toContain(WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
  });

  it("🩺 an LX carrying no SVx at all is the same fabrication and warns", () => {
    // Loop 2400 requires an SV1 / SV2 / SV3. Without one, nothing has ever
    // been read into `charge` / `units` and the seeds ship as-is.
    const { sub } = parse837("005010X222A2", claimBody(["DTP*472*D8*20260601~"]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.charge.toString()).toBe("0");
    expect(line?.units.toString()).toBe("0");
    expect(codes(sub.warnings)).toContain(WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
  });
});

describe("X12-837-SV-SILENT-ZERO: the matching SVx decodes and stays silent", () => {
  // The half that makes the half above a defect report rather than noise. A
  // warning that fired on every line would pass the suite above and fail here.
  it("SV1 on a Professional line decodes the charge and the units, silently", () => {
    const { sub } = parse837("005010X222A2", claimBody([SV1]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.charge.toString()).toBe("8500");
    expect(line?.units.toString()).toBe("4");
    expect(codes(sub.warnings)).not.toContain(WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
  });

  it("SV2 on an Institutional line decodes the charge and the units, silently", () => {
    const { sub } = parse837("005010X223A3", claimBody([SV2]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.charge.toString()).toBe("8500");
    expect(line?.units.toString()).toBe("4");
    expect(codes(sub.warnings)).not.toContain(WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
  });

  it("SV3 on a Dental line decodes the charge and the units, silently", () => {
    const { sub } = parse837("005010X224A2", claimBody([SV3]));
    const line = sub.claims[0]?.serviceLines[0];
    expect(line?.charge.toString()).toBe("8500");
    expect(line?.units.toString()).toBe("4");
    expect(codes(sub.warnings)).not.toContain(WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED);
  });
});

describe("X12-837-SV-SILENT-ZERO: what the warning says and where it points", () => {
  it("`position.segmentIndex` resolves to the LX that opened the line", () => {
    const { sub, tx } = parse837("005010X222A2", claimBody([SV2]));
    const w = notDecoded(sub)[0];
    expect(w).toBeDefined();
    // `position.segmentIndex` is a 1-based index into `tx.segments`, whose
    // element 0 is the ST. Anchoring on the LX rather than on the SVx is
    // deliberate: the no-SVx-at-all case has no SVx to point at.
    expect(tx.segments[w?.position.segmentIndex ?? -1]?.id).toBe("LX");
  });

  it("the message is a member of the frozen registry and carries no element index", () => {
    const { sub } = parse837("005010X222A2", claimBody([SV2]));
    const w = notDecoded(sub)[0];
    expect(w).toBeDefined();
    expect(ALL_WARNING_MESSAGES.has(w?.message ?? "")).toBe(true);
    // No decimal was read, so there is no failing element to name. Compare
    // with X12_UNPARSEABLE_DECIMAL, which does carry `elementIndex`.
    expect(w?.position.elementIndex).toBeUndefined();
  });

  it("🩺 the diagnostic never quotes the segment it refused to decode", () => {
    // The segment the walker ignored is exactly the text a future "helpful"
    // message would be tempted to echo, and on a real 837 it carries the
    // procedure code billed for a named patient.
    const { sub } = parse837(
      "005010X222A2",
      claimBody([`SV2*0300*HC:${IGNORED_SEGMENT_MARKER}*8500*UN*4~`]),
    );
    const w = notDecoded(sub)[0];
    expect(w).toBeDefined();
    for (const warning of sub.warnings) {
      expect(warning.message).not.toContain(IGNORED_SEGMENT_MARKER);
    }
  });
});

describe("X12-837-SV-SILENT-ZERO: retention and counting are unchanged", () => {
  it("the ignored segment is still on `tx.segments`, verbatim", () => {
    const { tx } = parse837(
      "005010X222A2",
      claimBody([`SV2*0300*HC:${IGNORED_SEGMENT_MARKER}*8500*UN*4~`]),
    );
    const sv2 = tx.segments.find((s) => s.id === "SV2");
    expect(sv2).toBeDefined();
    expect(sv2?.raw).toContain(IGNORED_SEGMENT_MARKER);
  });

  it("one warning per undecoded line, and none for the lines that decoded", () => {
    const { sub } = parse837("005010X222A2", [
      ...claimBody([SV2]), // line 1: foreign SVx  -> warns
      "LX*2~",
      SV1, // line 2: the right SVx -> silent
      "LX*3~", // line 3: no SVx at all  -> warns
      "DTP*472*D8*20260601~",
    ]);
    expect(sub.claims[0]?.serviceLines).toHaveLength(3);
    expect(notDecoded(sub)).toHaveLength(2);
    expect(sub.claims[0]?.serviceLines[1]?.charge.toString()).toBe("8500");
  });

  it("an unresolvable variant emits no service line at all, and is not double-reported", () => {
    // ST-03 is not a known implementation-convention reference and there is
    // no SVx to fall back on, so the submission-level X12_837_UNKNOWN_VARIANT
    // is the diagnostic. `openServiceLine` returns undefined, so there is no
    // line to warn about and no fabricated 0 on any model slot.
    const { sub } = parse837("005010X999A9", claimBody(["DTP*472*D8*20260601~"]));
    expect(sub.variant).toBe("unknown");
    expect(sub.claims[0]?.serviceLines ?? []).toHaveLength(0);
    expect(codes(sub.warnings)).toContain(WARNING_CODES.X12_837_UNKNOWN_VARIANT);
    expect(notDecoded(sub)).toHaveLength(0);
  });
});

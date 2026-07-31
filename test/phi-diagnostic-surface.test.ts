/**
 * PHI: no consumer-controlled input reaches a diagnostic surface.
 *
 * Driven by `assertNoDiagnosticPhiLeak` from `@cosyte/test-utils`, over the
 * slot table in `test/_helpers/phi-slots.ts`. Read that file first: the slot
 * table, not this one, is what the gate is worth.
 *
 * This file adds the four checks the shared runner cannot make:
 *
 * 1. **Registry membership.** Every message the library emits is a member of
 *    the frozen `ALL_WARNING_MESSAGES`. That survives a slot table nobody
 *    remembers to extend.
 * 2. **Elements too narrow to carry a marker.** The four delimiters, the
 *    1-and-2-character ISA elements and the TA1 disposition codes cannot hold
 *    a probe, so they are asserted directly against the diagnostic text.
 * 3. **A leak carried only as a number.** The runner matches text, so an
 *    unbounded numeric amount is outside its scope. Asserted by measurement.
 * 4. **The 834 enrollment stream**, whose reader is an `AsyncIterable` and so
 *    is unreachable from the synchronous runner.
 */

import { PHI_MARKER_UNIT, assertNoDiagnosticPhiLeak } from "@cosyte/test-utils";
import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  NON_SPEC_SEGMENT_ID,
  WARNING_CODES,
  X12ParseError,
  get834Enrollments,
  parseX12,
} from "../src/index.js";

import { buildInterchange, buildIsa } from "./_helpers/envelope.js";
import { PHI_RUNNER, PHI_SLOTS, phiParse } from "./_helpers/phi-slots.js";

const LONG_MARKER = PHI_MARKER_UNIT.repeat(64);

describe("PHI: no consumer-controlled input reaches a diagnostic surface", () => {
  it("holds for every consumer-controlled slot in the X12 envelope and body", () => {
    assertNoDiagnosticPhiLeak({ ...PHI_RUNNER, slots: PHI_SLOTS });
  });

  it("emits only messages that are members of the frozen registry", () => {
    const seen = new Set<string>();
    for (const slot of PHI_SLOTS) {
      for (const marker of [PHI_MARKER_UNIT, PHI_MARKER_UNIT.repeat(3)]) {
        let diagnostics;
        try {
          diagnostics = phiParse(slot.plant(marker)).diagnostics;
        } catch {
          continue; // a Tier-3 fatal carries no warnings; the runner sweeps it
        }
        for (const w of diagnostics) {
          seen.add(w.code);
          expect(
            ALL_WARNING_MESSAGES.has(w.message),
            `${slot.name} produced a ${w.code} message outside the registry: ${w.message}`,
          ).toBe(true);
        }
      }
    }
    // Guard against the corpus going quiet: the assertion above means nothing
    // if the slot table stops producing warnings. The table exercises 21 of
    // the 22 registered codes, so the floor is set just under that rather
    // than at a number a halved corpus would still clear. The one code no
    // slot reaches is `X12_MISSING_GE`, whose message is a literal with no
    // parameter to leak through.
    expect(seen.size).toBeGreaterThanOrEqual(20);
  });
});

describe("PHI: slots too narrow to carry a marker", () => {
  /**
   * The four delimiters are one byte each, so no probe fits and the shared
   * runner cannot cover them. They are still sender-controlled, and
   * `detectDelimiters` used to echo the detected element separator into the
   * `X12_INVALID_DELIMITERS` message. Constructed positive control: the
   * chosen bytes are ones that would be unmistakable in the output.
   */
  it("never echoes a detected delimiter byte into a fatal message", () => {
    // `%` element separator, `@` repetition, `;` component, `!` terminator:
    // all valid delimiter bytes, none of which appear in a spec-clean ISA.
    const isa = buildIsa({ element: "%", repetition: "@", component: ";", segment: "!" });
    // Break the fixed ISA element layout at byte 100 so the layout check fires.
    const broken = `${isa.slice(0, 99)}#${isa.slice(100)}`;
    let thrown: unknown;
    try {
      parseX12(broken);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(X12ParseError);
    const err = thrown as X12ParseError;
    expect(err.code).toBe("X12_INVALID_DELIMITERS");
    for (const byte of ["%", "@", ";", "!"]) {
      expect(err.message).not.toContain(byte);
    }
    // Positive control: the assertion above is only meaningful if a message
    // that DID echo the separator would have failed it.
    expect(`Element separator "%" was detected`).toContain("%");
  });

  /**
   * ISA-01/03/05/07 are two bytes and ISA-11/14/15/16 are one, all below the
   * runner's four-byte match floor. None of them reaches a factory that takes
   * a value, and after this change no factory takes one at all, so the
   * standing assertion is registry membership on whatever they produce.
   */
  it("keeps every message registry-bound when the narrow ISA elements are hostile", () => {
    const raw = buildInterchange({ senderQual: "%%", receiverQual: "@@", usageIndicator: "#" });
    for (const w of phiParse(raw).diagnostics) {
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    }
  });
});

describe("PHI: leaks the text sweep cannot see", () => {
  /**
   * The runner matches text, so a diagnostic that grew because it rendered an
   * unbounded **number** is invisible to it. An EDI monetary amount is a
   * consumer-controlled element like any other, and the 835 balance warning
   * used to render three of them. Measured, not asserted by inspection.
   */
  it("bounds the 835 balance-mismatch message against a 100,000-digit amount", () => {
    const huge = "9".repeat(100_000);
    const raw = buildInterchange({
      functionalIdCode: "HP",
      transactionSetId: "835",
      versionRelease: "005010X221A1",
      transactionBody: [
        "BPR*I*1.00*C*ACH*CCP*01*111111111*DA*222222222*1512345678**01*111111111*DA*222222222*20260601",
        "TRN*1*0012345*1512345678",
        "N1*PR*SYNTHETIC PAYER",
        "N1*PE*SYNTHETIC PAYEE",
        "LX*1",
        `CLP*SYNTH-ACCT-1*1*${huge}*1.00*0.00*MC*SYNTH-CLAIM-1*11*1`,
      ],
    });
    const balance = phiParse(raw).diagnostics.filter(
      (w) => w.code === WARNING_CODES.X12_835_REMIT_BALANCE_MISMATCH,
    );
    expect(balance.length).toBeGreaterThanOrEqual(1);
    for (const w of balance) {
      // The registry entry is a few hundred bytes. Anything approaching the
      // planted amount's length means an amount was rendered into it.
      expect(w.message.length).toBeLessThan(1_000);
      expect(w.message).not.toContain("999999");
    }
  });

  /**
   * The same measurement one layer out. `X12Segment.id` is the library's own
   * structural identifier, and an unbounded one re-creates the leak on the
   * model rather than in the message: `@cosyte/hl7` bounded its messages and
   * `@cosyte/deid` still leaked, because `segment.type` stayed unbounded and
   * `deid` interpolated it to build a manifest locus.
   */
  it("bounds the derived segment id against a 100,000-byte segment name", () => {
    const huge = "Z".repeat(100_000);
    const raw = buildInterchange({ transactionBody: [`${huge}*STRAY`] });
    const segments = parseX12(raw).groups[0]?.transactions[0]?.segments ?? [];
    const planted = segments.find((s) => s.raw.startsWith(huge));
    expect(planted).toBeDefined();
    expect(planted?.id).toBe(NON_SPEC_SEGMENT_ID);
    // The bytes are not lost: `raw` and `elements` stay verbatim so round-trip
    // remains byte-exact. Only the derived locator is bounded.
    expect(planted?.elements[0]).toBe(huge);
  });
});

describe("PHI: the 834 enrollment stream", () => {
  /**
   * `get834Enrollments` is an `AsyncIterable`, so the synchronous runner
   * cannot reach it, and INS-03 / HD-01 (the 834's safety-critical
   * maintenance type) are only decoded there. Same probe, driven by hand.
   */
  const enrollment = (ins03: string, hd01: string): string =>
    buildInterchange({
      functionalIdCode: "BE",
      transactionSetId: "834",
      versionRelease: "005010X220A1",
      transactionBody: [
        "BGN*00*SYNTH-ENR-1*20260601*1200****2",
        "N1*P5*SYNTHETIC SPONSOR*FI*000000000",
        "N1*IN*SYNTHETIC PAYER*FI*000000001",
        `INS*Y*18*${ins03}*EC*A***FT`,
        "REF*0F*SYNTH-MBR-1",
        "NM1*IL*1*SYNTHLAST*SYNTHFIRST****MI*SYNTH-MBR-1",
        "DMG*D8*19800101*F",
        `HD*${hd01}**HLT*SYNTHETIC PLAN*FAM`,
        "DTP*348*D8*20260101",
      ],
    });

  const drain = async (raw: string): Promise<readonly string[]> => {
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("fixture produced no transaction set");
    const messages: string[] = [];
    let codes = 0;
    for await (const member of get834Enrollments(ix.delimiters, tx)) {
      for (const w of member.warnings) {
        messages.push(w.message);
        if (w.code === WARNING_CODES.X12_834_UNKNOWN_MAINTENANCE_TYPE) codes += 1;
      }
    }
    expect(codes).toBeGreaterThanOrEqual(1);
    return messages;
  };

  it("puts neither INS-03 nor HD-01 on a diagnostic surface", async () => {
    for (const raw of [
      enrollment(PHI_MARKER_UNIT, "021"),
      enrollment(LONG_MARKER, "021"),
      enrollment("021", PHI_MARKER_UNIT),
      enrollment("021", LONG_MARKER),
    ]) {
      for (const message of await drain(raw)) {
        expect(message.toLowerCase()).not.toContain(PHI_MARKER_UNIT.slice(0, 4).toLowerCase());
        expect(ALL_WARNING_MESSAGES.has(message)).toBe(true);
      }
    }
  });
});

/**
 * `X12-PAY-TO-FUSION` - a repeated `NM1*87` in one Loop 2000A used to fuse
 * two pay-to addresses into one the sender never sent.
 *
 * ## The defect, and why the emit side is in this file
 *
 * `payToAddress` is a bare `X12ClaimAddress` accumulator with no entity
 * object to own it, cleared only at the next Loop 2000A `HL`. Every other
 * party gets a fresh object at its `NM1`, so a trailing `N3` / `N4` finds
 * `current.address === undefined` and its write REPLACES. The two
 * `payToAddress` arms had nothing replaced under them, so they wrote onto
 * whatever the previous `NM1*87` left - `withLines` appending and
 * `mergeAddress` falling back - and the model came back with a street from
 * each of two addresses and a `countryCode` off the FIRST `N4`, on an
 * address whose own `N4` names no country, with `warnings: []`.
 *
 * **Two remedies were built for this before and both were refuted, both for
 * the same reason: an emptied slot is NOT a neutral absence, because the
 * emit side reads it.** `build837P/I/D` gates Loop 2010AB on
 * `payToAddress !== undefined` and `emitAddress` writes `N3` only for
 * non-empty `lines` and `N4` only for a defined field, so clearing the
 * accumulator at the `NM1*87` re-emits as NO PAY-TO LOOP AT ALL (remedy 1),
 * and a flag consumed by the first write after it does the same on a
 * valueless `N3~` / `N4~` (remedy 2, refuted inside its own remedy diff).
 * Both are positive statements about where a payment goes that no sender
 * made. **That is why every read-side case below has an emit-side twin, and
 * why the reader asks `./address-segments.ts` - the module the emitter also
 * asks - whether an occurrence states an address at all.**
 *
 * ## What is pinned
 *
 * Every warning-channel assertion is `toEqual` on the WHOLE array. A pin on
 * a value plus the absence of a DIFFERENT code stays green through the
 * silence ending, which is how `#67`'s residual got past; the honest form
 * pins the lying document and its control both ways.
 *
 * All fixtures are synthetic. Street names are Springfield / Shelbyville.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  X12Decimal,
  build837P,
  get837Claims,
  parseX12,
  payToAddressRepeated,
  serializeX12,
  type Build837AddressSpec,
  type Build837Spec,
  type X12ClaimAddress,
} from "../src/index.js";

// ---------------------------------------------------------------------------
// Document construction. Only the Loop 2010AB stretch varies between cases.
// ---------------------------------------------------------------------------

const HEAD = [
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260601*1200*^*00501*000000001*0*P*:~",
  "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A2~",
  "ST*837*0001*005010X222A2~",
  "BHT*0019*00*0123*20260601*1200*CH~",
  "NM1*41*2*SUBMITTER ONE*****46*SUB001~",
  "NM1*40*2*RECEIVER ONE*****46*REC001~",
  "HL*1**20*1~",
  "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
  "N3*123 BILLING WAY~",
  "N4*CLEVELAND*OH*44113~",
].join("");

const TAIL = [
  "HL*2*1*22*0~",
  "SBR*P*18*GROUP123******MB~",
  "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
  "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
  "CLM*PT-ACCT-001*150***11:B:1*Y*A*Y*Y~",
  "HI*ABK:J20.9~",
  "LX*1~",
  "SV1*HC:99213*150*UN*1***1~",
  "SE*20*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("");

/** The first pay-to address, stated in full. */
const FIRST = "NM1*87*2~N3*1 FIRST PAY TO WAY~N4*SPRINGFIELD*IL*62704*US~";

function docWith(loop2010ab: string): string {
  return HEAD + loop2010ab + TAIL;
}

function readPayTo(raw: string): {
  address: X12ClaimAddress | undefined;
  codes: readonly string[];
  warnings: readonly { readonly code: string; readonly message: string }[];
} {
  const ix = parseX12(raw);
  const group = ix.groups[0];
  const tx = group?.transactions[0];
  if (tx === undefined) throw new Error("fixture has no transaction set");
  const submission = get837Claims(ix.delimiters, tx);
  if (submission === undefined) throw new Error("get837Claims did not recognize the fixture");
  return {
    address: submission.claims[0]?.payToAddress,
    codes: submission.warnings.map((w) => w.code),
    warnings: submission.warnings,
  };
}

// ---------------------------------------------------------------------------
// Emit side. Round-trips the address the reader resolved back out through
// build837P + serializeX12 and reports the Loop 2010AB it produced.
// ---------------------------------------------------------------------------

function dec(value: string): X12Decimal {
  const d = X12Decimal.fromString(value);
  if (d === undefined) throw new Error(`bad test decimal: ${value}`);
  return d;
}

function toBuildSpec(address: X12ClaimAddress): Build837AddressSpec {
  return {
    lines: [...address.lines],
    ...(address.city === undefined ? {} : { city: address.city }),
    ...(address.state === undefined ? {} : { state: address.state }),
    ...(address.postalCode === undefined ? {} : { postalCode: address.postalCode }),
    ...(address.countryCode === undefined ? {} : { countryCode: address.countryCode }),
  };
}

function specWith(payToAddress: Build837AddressSpec | undefined): Build837Spec {
  return {
    envelope: {
      senderId: "SUBMITTER",
      receiverId: "RECEIVER",
      interchangeDate: "260601",
      interchangeTime: "1200",
      interchangeControlNumber: "000000001",
      groupControlNumber: "1",
      transactionSetControlNumber: "0001",
    },
    submitter: {
      entityIdentifierCode: "41",
      entityTypeQualifier: "2",
      name: "SUBMITTER ONE",
      idQualifier: "46",
      idCode: "SUB001",
    },
    receiver: {
      entityIdentifierCode: "40",
      entityTypeQualifier: "2",
      name: "RECEIVER ONE",
      idQualifier: "46",
      idCode: "REC001",
    },
    billingProviders: [
      {
        provider: {
          entityIdentifierCode: "85",
          entityTypeQualifier: "2",
          name: "BILLING CLINIC INC",
          idQualifier: "XX",
          idCode: "1234567890",
        },
        ...(payToAddress === undefined ? {} : { payToAddress }),
        subscribers: [
          {
            info: { payerResponsibilityCode: "P", claimFilingIndicator: "MB" },
            subscriber: {
              entityIdentifierCode: "IL",
              entityTypeQualifier: "1",
              name: "PATIENT",
              firstName: "TEST",
              idQualifier: "MI",
              idCode: "MEMBER001",
            },
            payer: {
              entityIdentifierCode: "PR",
              entityTypeQualifier: "2",
              name: "PAYER ONE",
              idQualifier: "PI",
              idCode: "PAYER01",
            },
            claims: [
              {
                claimId: "PT-ACCT-001",
                totalCharge: dec("150.00"),
                placeOfServiceCode: "11",
                facilityCodeQualifier: "B",
                claimFrequencyCode: "1",
                diagnoses: [{ qualifier: "ABK", code: "J20.9" }],
                serviceLines: [
                  {
                    variant: "P",
                    procedureQualifier: "HC",
                    procedureCode: "99213",
                    charge: dec("150.00"),
                    unitOfMeasure: "UN",
                    units: dec("1"),
                    diagnosisPointers: ["1"],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * The Loop 2010AB segments the emit produced, as a `~`-terminated string, or
 * the empty string when no pay-to loop was emitted at all. The billing
 * provider's own address is filtered out by its (distinct) synthetic values.
 */
function emitPayToLoop(address: X12ClaimAddress | undefined): string {
  const spec = specWith(address === undefined ? undefined : toBuildSpec(address));
  const segments = serializeX12(build837P(spec)).split("~");
  const loop = segments
    .filter(
      (s) =>
        s.startsWith("NM1*87") ||
        s.startsWith("N3*") ||
        s.startsWith("N4*") ||
        s === "N3" ||
        s === "N4",
    )
    .filter((s) => !s.includes("BILLING WAY") && !s.includes("CLEVELAND"));
  return loop.length === 0 ? "" : `${loop.join("~")}~`;
}

/** Read a document and re-emit whatever pay-to address it resolved to. */
function roundTripPayTo(raw: string): string {
  return emitPayToLoop(readPayTo(raw).address);
}

// ---------------------------------------------------------------------------
// The headline defect.
// ---------------------------------------------------------------------------

describe("X12-PAY-TO-FUSION: a repeated NM1*87 no longer fuses two pay-to addresses", () => {
  const doc = docWith(`${FIRST}NM1*87*2~N3*2 SECOND PAY TO WAY~N4*SHELBYVILLE*IL*62565~`);

  it("carries the second occurrence's address alone, with no line from the first", () => {
    const { address } = readPayTo(doc);
    expect(address?.lines).toEqual(["2 SECOND PAY TO WAY"]);
  });

  it("does not carry a countryCode the winning occurrence's own N4 never named", () => {
    // The sharpest half of the defect: base answered "US", taken off the
    // FIRST N4, on an address whose own N4 has four elements and no country.
    const { address } = readPayTo(doc);
    expect(address?.countryCode).toBeUndefined();
    expect(address?.city).toBe("SHELBYVILLE");
    expect(address?.postalCode).toBe("62565");
  });

  it("re-emits ONE conformant Loop 2010AB carrying only the winning address", () => {
    // Base emitted `N3*1 FIRST PAY TO WAY*2 SECOND PAY TO WAY~` plus an N4
    // whose country came off the other address: a payment destination on the
    // wire that no sender stated.
    expect(roundTripPayTo(doc)).toBe("NM1*87*2~N3*2 SECOND PAY TO WAY~N4*SHELBYVILLE*IL*62565~");
  });

  it("reports the repetition on the warning channel rather than resolving it in silence", () => {
    expect(readPayTo(doc).codes).toEqual([WARNING_CODES.X12_837_PAY_TO_ADDRESS_REPEATED]);
  });
});

// ---------------------------------------------------------------------------
// The constraint the two refuted remedies bought: an emptied slot is read.
// ---------------------------------------------------------------------------

describe("X12-PAY-TO-FUSION: an occurrence that states no address does not erase one that did", () => {
  // Remedy 1 cleared the accumulator at the NM1*87 and was refuted on this
  // shape; remedy 2 consumed a flag on the first write and was refuted on
  // the two below it. All three read back the FIRST address, intact.
  const CASES: ReadonlyArray<readonly [string, string]> = [
    ["a repeat carrying no N3 or N4 at all", "NM1*87*2~"],
    ["a repeat carrying a valueless N3", "NM1*87*2~N3~"],
    ["a repeat carrying a valueless N4", "NM1*87*2~N4****~"],
  ];

  for (const [label, repeat] of CASES) {
    const doc = docWith(FIRST + repeat);

    it(`${label} leaves the stated address on the model`, () => {
      expect(readPayTo(doc).address).toEqual({
        lines: ["1 FIRST PAY TO WAY"],
        city: "SPRINGFIELD",
        state: "IL",
        postalCode: "62704",
        countryCode: "US",
      });
    });

    it(`${label} re-emits the stated address, not an erased loop`, () => {
      // The failure mode both refuted remedies produced: `""` here, or a
      // bare `NM1*87*2~`, either of which tells a receiver something about
      // where to send money that the sender did not say.
      expect(roundTripPayTo(doc)).toBe(
        "NM1*87*2~N3*1 FIRST PAY TO WAY~N4*SPRINGFIELD*IL*62704*US~",
      );
    });

    it(`${label} still warns, because the document did name it twice`, () => {
      expect(readPayTo(doc).codes).toEqual([WARNING_CODES.X12_837_PAY_TO_ADDRESS_REPEATED]);
    });
  }
});

// ---------------------------------------------------------------------------
// The trade, stated rather than argued away.
// ---------------------------------------------------------------------------

describe("X12-PAY-TO-FUSION: a repeat that states only part of an address states only that part", () => {
  const doc = docWith(`${FIRST}NM1*87*2~N4*SHELBYVILLE*IL*62565~`);

  it("takes the repeat's N4 and does NOT keep the earlier occurrence's street lines", () => {
    // Keeping them IS the fusion: one sender's street under another's city.
    expect(readPayTo(doc).address).toEqual({
      lines: [],
      city: "SHELBYVILLE",
      state: "IL",
      postalCode: "62565",
      countryCode: undefined,
    });
  });

  it("re-emits a Loop 2010AB with no N3, which is the disclosed cost of not fusing", () => {
    // Base emitted `N3*1 FIRST PAY TO WAY~N4*SHELBYVILLE*IL*62565*US~`: a
    // complete-looking address assembled from two. The loop is still
    // present and the warning is on the channel; what is gone is the
    // fabricated street. This is documented in KNOWN-LIMITATIONS.md.
    expect(roundTripPayTo(doc)).toBe("NM1*87*2~N4*SHELBYVILLE*IL*62565~");
  });
});

// ---------------------------------------------------------------------------
// Honest controls: a conformant document must be untouched by all of this.
// ---------------------------------------------------------------------------

describe("X12-PAY-TO-FUSION: one NM1*87 per Loop 2000A is unchanged and silent", () => {
  it("a single fully stated pay-to address reads and re-emits exactly as before", () => {
    const doc = docWith(FIRST);
    const { address, codes } = readPayTo(doc);
    expect(address).toEqual({
      lines: ["1 FIRST PAY TO WAY"],
      city: "SPRINGFIELD",
      state: "IL",
      postalCode: "62704",
      countryCode: "US",
    });
    expect(codes).toEqual([]);
    expect(roundTripPayTo(doc)).toBe("NM1*87*2~N3*1 FIRST PAY TO WAY~N4*SPRINGFIELD*IL*62704*US~");
  });

  it("a single NM1*87 with a valueless N3 still reads an address with no elements", () => {
    // The `payToAddress === undefined` arm of the commit rule exists for
    // exactly this: there is nothing to protect, so the write lands and the
    // pre-existing bare-loop emit is preserved rather than quietly changed.
    const doc = docWith("NM1*87*2~N3~");
    const { address, codes } = readPayTo(doc);
    expect(address).toEqual({
      lines: [],
      city: undefined,
      state: undefined,
      postalCode: undefined,
      countryCode: undefined,
    });
    expect(codes).toEqual([]);
    expect(roundTripPayTo(doc)).toBe("NM1*87*2~");
  });

  it("a single bare NM1*87 leaves the slot undefined and emits no pay-to loop", () => {
    const doc = docWith("NM1*87*2~");
    expect(readPayTo(doc).address).toBeUndefined();
    expect(readPayTo(doc).codes).toEqual([]);
    expect(roundTripPayTo(doc)).toBe("");
  });

  it("no NM1*87 at all leaves the slot undefined and the channel empty", () => {
    const doc = docWith("");
    expect(readPayTo(doc).address).toBeUndefined();
    expect(readPayTo(doc).codes).toEqual([]);
  });

  it("the canonical 837P fixture's warning channel is unchanged by this slice", () => {
    // A wrong-shape guard would fire here first. The canonical document has
    // no NM1*87 at all, so the code must be absent from a real fixture's
    // whole channel, not merely absent from a constructed one.
    const doc = docWith(FIRST);
    for (const w of readPayTo(doc).warnings) {
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Scope of the counter and of the warning.
// ---------------------------------------------------------------------------

describe("X12-PAY-TO-FUSION: the repeat counter is scoped to one Loop 2000A", () => {
  it("a first NM1*87 under a SECOND billing provider is a first, not a repeat", () => {
    // The reset lives beside `payToAddress = undefined` at the Loop 2000A
    // HL. A latching flag would report this conformant document as a repeat.
    const secondBilling = [
      "HL*3**20*1~",
      "NM1*85*2*OTHER CLINIC INC*****XX*1987654320~",
      "NM1*87*2~",
      "N3*2 SECOND PAY TO WAY~",
      "N4*SHELBYVILLE*IL*62565~",
      "HL*4*3*22*0~",
      "SBR*P*18*GROUP456******MB~",
      "NM1*IL*1*OTHER*PATIENT*B***MI*MEMBER002~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      "CLM*PT-ACCT-002*150***11:B:1*Y*A*Y*Y~",
      "HI*ABK:J20.9~",
    ].join("");
    const raw = HEAD + FIRST + TAIL.replace("SE*20*0001~", secondBilling + "SE*31*0001~");
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("fixture has no transaction set");
    const submission = get837Claims(ix.delimiters, tx);
    if (submission === undefined) throw new Error("get837Claims did not recognize the fixture");

    expect(submission.warnings.map((w) => w.code)).not.toContain(
      WARNING_CODES.X12_837_PAY_TO_ADDRESS_REPEATED,
    );
    // And the second billing provider's claim carries its OWN pay-to
    // address, with nothing from the first provider's.
    expect(submission.claims[1]?.payToAddress).toEqual({
      lines: ["2 SECOND PAY TO WAY"],
      city: "SHELBYVILLE",
      state: "IL",
      postalCode: "62565",
      countryCode: undefined,
    });
  });

  it("two repeats in one Loop 2000A are two warnings, one per repeated NM1*87", () => {
    const doc = docWith(
      `${FIRST}NM1*87*2~N3*2 SECOND PAY TO WAY~NM1*87*2~N3*3 THIRD PAY TO WAY~N4*SHELBYVILLE*IL*62565~`,
    );
    expect(readPayTo(doc).codes).toEqual([
      WARNING_CODES.X12_837_PAY_TO_ADDRESS_REPEATED,
      WARNING_CODES.X12_837_PAY_TO_ADDRESS_REPEATED,
    ]);
    // Three occurrences, one address: the last one that stated something.
    expect(readPayTo(doc).address).toEqual({
      lines: ["3 THIRD PAY TO WAY"],
      city: "SHELBYVILLE",
      state: "IL",
      postalCode: "62565",
      countryCode: undefined,
    });
  });

  it("anchors at the repeated NM1*87 itself and carries no elementIndex", () => {
    const doc = docWith(`${FIRST}NM1*87*2~N3*2 SECOND PAY TO WAY~`);
    const ix = parseX12(doc);
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("fixture has no transaction set");
    const submission = get837Claims(ix.delimiters, tx);
    if (submission === undefined) throw new Error("get837Claims did not recognize the fixture");
    const warning = submission.warnings.find(
      (w) => w.code === WARNING_CODES.X12_837_PAY_TO_ADDRESS_REPEATED,
    );
    const index = warning?.position.segmentIndex;
    if (index === undefined) throw new Error("no pay-to repeat warning was raised");
    // Measured against the model rather than assumed: the walker iterates
    // `tx.segments.slice(1)` (the ST is dropped) and anchors at `i + 1`, so
    // `segmentIndex` indexes `tx.segments` directly. Asserting `index - 1`
    // here reads the N4 and passes for the wrong reason on other shapes.
    expect(tx.segments[index]?.id).toBe("NM1");
    expect(tx.segments[index]?.elements[1]).toBe("87");
    expect(warning?.position.elementIndex).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The warning itself: registry-clean, document-free.
// ---------------------------------------------------------------------------

describe("X12-PAY-TO-FUSION: the warning carries no document bytes", () => {
  it("its message is a member of ALL_WARNING_MESSAGES", () => {
    expect(ALL_WARNING_MESSAGES.has(payToAddressRepeated({ segmentIndex: 12 }).message)).toBe(true);
  });

  it("a document whose pay-to streets are marker-bearing puts none of them in the message", () => {
    const marker = "JOHNDOEMRN98765";
    const doc = docWith(
      `NM1*87*2~N3*1 ${marker} WAY~N4*SPRINGFIELD*IL*62704*US~NM1*87*2~N3*2 ${marker} WAY~`,
    );
    const { warnings } = readPayTo(doc);
    expect(warnings.length).toBeGreaterThan(0);
    for (const w of warnings) {
      expect(w.message).not.toContain(marker);
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    }
  });

  it("the factory takes a position and nothing else", () => {
    expect(payToAddressRepeated.length).toBe(1);
    expect(payToAddressRepeated({ segmentIndex: 12, transactionIndex: 0 })).toEqual({
      code: WARNING_CODES.X12_837_PAY_TO_ADDRESS_REPEATED,
      message: payToAddressRepeated({ segmentIndex: 1 }).message,
      position: { segmentIndex: 12, transactionIndex: 0 },
    });
  });
});

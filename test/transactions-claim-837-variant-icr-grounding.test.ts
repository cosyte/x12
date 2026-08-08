/**
 * `X12-VARIANT-ICR-UNGROUNDED`: `VARIANT_BY_ICR`, the ST-03 to 837-variant
 * table, held three keys that were grounded against nothing.
 *
 * 🩺 **What that cost, measured at `668afea`, which is `main` at published `0.0.13`.** The
 * table held exactly `005010X222A2`, `005010X223A3` and `005010X224A2`.
 * **None of the identifiers HIPAA adopts was in it**, and neither were two
 * of the three that payer companion guides actually require on the wire. So
 * a conformant, HIPAA-mandated 837P declaring `005010X222A1` in ST-03 - what
 * CMS and state Medicaid companion guides tell submitters to send - resolved
 * to NO variant, fell through to the `SVx` scan, and one stray `SV2`
 * anywhere in the body re-typed the whole submission Institutional. **The
 * `SVx` fall-back was therefore the NORMAL path on production professional
 * and institutional traffic rather than the exception**, and
 * `X12_837_UNKNOWN_VARIANT` was a fabricated non-conformance claim about a
 * document that was not non-conformant.
 *
 * **▶ The sources every key came from are named in
 * `documentation/agent-notes/x12-variant-icr-ungrounded.md` and beside the
 * table in `src/transactions/claim/get-837.ts`.** Checking an identifier
 * against this repo's own fixtures would only prove the two agree, which is
 * how the 835 SVC element map stayed wrong; every one below is grounded
 * outside the repo.
 *
 * **▶ 🛑 THE `SVx` FALL-BACK IS NOT NARROWED, AND NOTHING ABOUT IT CHANGED.**
 * First-wins still takes the first `SV1` / `SV2` / `SV3` in the body,
 * orphans included, on every document that still reaches it. What changed is
 * WHICH documents reach it, and that is a behaviour change on already
 * published decoding: it is pinned as one below rather than left to be
 * discovered.
 *
 * **▶ Precedence is unchanged.** Resolution is still
 * `explicitType ?? variantFromIcr ?? variantFromSegment`. The table was
 * incomplete; the order it is consulted in was already right.
 *
 * Only bytes can produce these cases: no builder emits a mixed-variant 837,
 * and no builder emits most of these ST-03 values at all. All data is
 * synthetic.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  ambiguous837Variant,
  get837Claims,
  parseX12,
  unknown837Variant,
} from "../src/index.js";
import type { X12Claim837Variant, X12_837Submission } from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

const SV1 = "SV1*HC:99213*8500*UN*4***1~";
const SV2 = "SV2*0300*HC:99213*7300*UN*2~";

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

/** `icr` goes into ST-03 verbatim; `""` means ST-03 is absent altogether. */
function parse837(icr: string, body: readonly string[]): X12_837Submission {
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
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return sub;
}

/**
 * A body whose only service segment is an `SV2`, so the `SVx` fall-back
 * would answer `"I"` for ANY of these documents. Every professional case
 * below reading `"P"` is therefore reading ST-03 and not the segment, and a
 * key silently dropped from the table reds the case instead of being masked
 * by a fall-back that happens to agree.
 */
const SV2_ONLY: readonly string[] = [...HEADER, CLM, "HI*ABK:J20.9~", "LX*1~", SV2];

/** The mirror: only an `SV1`, so the fall-back would answer `"P"`. */
const SV1_ONLY: readonly string[] = [...HEADER, CLM, "HI*ABK:J20.9~", "LX*1~", SV1];

/** THE WHOLE CHANNEL. Never a membership test. */
function channel(sub: X12_837Submission): string[] {
  return sub.warnings.map((w) => w.code);
}

/**
 * Each case is an ST-03 value, the variant it must resolve to, and the
 * DISAGREEING body it is read against, so nothing here can pass on the
 * fall-back. `why` names the source outside this repository.
 */
interface IcrCase {
  readonly icr: string;
  readonly variant: X12Claim837Variant;
  readonly why: string;
}

const ADOPTED_BY_HIPAA: readonly IcrCase[] = [
  { icr: "005010X222", variant: "P", why: "45 CFR 162.1102(c) -> (b)(2)(iii), professional" },
  { icr: "005010X223", variant: "I", why: "45 CFR 162.1102(c) -> (b)(2)(iv), institutional" },
  {
    icr: "005010X223A1",
    variant: "I",
    why: "45 CFR 162.1102(c) -> (b)(2)(iv), Type 1 errata Oct 2007",
  },
  { icr: "005010X224", variant: "D", why: "45 CFR 162.1102(c) -> (b)(2)(ii), dental" },
  {
    icr: "005010X224A1",
    variant: "D",
    why: "45 CFR 162.1102(c) -> (b)(2)(ii), Type 1 errata Oct 2007",
  },
];

const REQUIRED_BY_COMPANION_GUIDES: readonly IcrCase[] = [
  {
    icr: "005010X222A1",
    variant: "P",
    why: "AHCCCS + LA Medicaid companion guides, ST-03 / GS-08",
  },
  {
    icr: "005010X223A2",
    variant: "I",
    why: "AHCCCS + LA Medicaid companion guides, ST-03 / GS-08",
  },
  {
    icr: "005010X224A2",
    variant: "D",
    why: "AHCCCS + LA Medicaid companion guides, ST-03 / GS-08",
  },
];

const LATER_PUBLISHED_ERRATA: readonly IcrCase[] = [
  {
    icr: "005010X222A2",
    variant: "P",
    why: "published errata guide named by X12 RFI #2334; NOT adopted",
  },
  {
    icr: "005010X223A3",
    variant: "I",
    why: "published errata guide named by X12 RFI #2334; NOT adopted",
  },
  {
    icr: "005010X224A3",
    variant: "D",
    why: "published errata guide named by X12 RFI #2334; NOT adopted",
  },
];

// ---------------------------------------------------------------------------
// 1. The headline: what a production 837P and 837I declare now resolves.
// ---------------------------------------------------------------------------

/**
 * Every case in this section reads a DISAGREEING body, so it can only pass
 * by reading ST-03. The declaration therefore wins over the segment, the
 * line's `SVx` does not match the resolved variant, and the line is left
 * undecoded and reported at its `LX`. That is the fourth consequence of
 * this change, and it is asserted on every one of these documents rather
 * than described: `charge` reads `undefined` where `0.0.13` decoded the
 * disagreeing segment's amount, and the channel gains a code the document
 * did not carry.
 *
 * **🩺 A first draft asserted these with `.not.toContain`, and that is what
 * hid the consequence** - a membership test cannot observe a case moving
 * ONTO a code. Every channel assertion here is `toEqual` on the whole array.
 */
function expectDeclarationWins(icr: string, variant: X12Claim837Variant): void {
  const disagreeing = variant === "P" ? SV2_ONLY : SV1_ONLY;
  const sub = parse837(icr, disagreeing);
  expect(sub.variant).toBe(variant);
  const line = sub.claims[0]?.serviceLines[0];
  expect(line).toBeDefined();
  // The money and the quantity are ABSENT, which is what `undefined` means on
  // a decimal slot here. The line's identity fields are NOT absent: an
  // undecoded line is seeded with `""`, which is pre-existing and unchanged,
  // and asserting `undefined` on them would be measuring the wrong shape.
  expect(line?.charge).toBeUndefined();
  expect(line?.units).toBeUndefined();
  expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED]);
}

describe("X12-VARIANT-ICR-UNGROUNDED: the references production 837s carry", () => {
  for (const { icr, variant, why } of REQUIRED_BY_COMPANION_GUIDES) {
    it(`🩺 ST-03 ${icr} resolves to ${variant} (${why})`, () => {
      expectDeclarationWins(icr, variant);
    });
  }

  for (const { icr, variant, why } of ADOPTED_BY_HIPAA) {
    it(`ST-03 ${icr} resolves to ${variant} (${why})`, () => {
      expectDeclarationWins(icr, variant);
    });
  }

  for (const { icr, variant, why } of LATER_PUBLISHED_ERRATA) {
    it(`ST-03 ${icr} resolves to ${variant} (${why})`, () => {
      expectDeclarationWins(icr, variant);
    });
  }

  /**
   * 🩺 The fourth consequence, spelled out on one document with the values
   * the refuter measured, because a census of three consequences was
   * published and was false. A mis-stamped envelope is an ordinary vendor
   * variant and this reader cannot tell one from a conformant document.
   */
  it("🩺 a line whose SVx kind disagrees with the declaration STOPS decoding and STARTS warning", () => {
    // At `0.0.13`: variant "I", charge "7300", units "2", revenueCode
    // "0300", `warnings: []`. The fallback typed the document off the very
    // segment that now fails to match, so the line decoded.
    const sub = parse837("005010X222A1", SV2_ONLY);
    expect(sub.variant).toBe("P");
    expect(sub.claims[0]?.serviceLines[0]?.charge).toBeUndefined();
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED]);

    // CONTROL, and it is what makes the reading above a loss rather than a
    // preference: the same bytes under an ST-03 this reader still turns
    // into nothing fall back to the segment and decode, exactly as before.
    const fellBack = parse837("004010X098A1", SV2_ONLY);
    expect(fellBack.variant).toBe("I");
    expect(fellBack.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("7300");
    expect(channel(fellBack)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. The behaviour change, pinned AS a change rather than left to be found.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-ICR-UNGROUNDED: what decodes differently from 0.0.13", () => {
  /**
   * The exact document `X12-837-AMBIGUOUS-VARIANT` shipped as its headline,
   * under the ST-03 a real 837P carries. At `0.0.13` `variant` read `"I"`,
   * the conformant `SV1` line decoded nothing, and the channel held
   * `X12_837_AMBIGUOUS_VARIANT` beside the line-level codes.
   */
  it("🩺 a stray SV2 no longer re-types a professional claim that DECLARED itself", () => {
    const sub = parse837("005010X222A1", [...HEADER, SV2, CLM, "HI*ABK:J20.9~", "LX*1~", SV1]);

    expect(sub.variant).toBe("P");
    expect(sub.claims[0]?.serviceLines[0]?.charge?.toString()).toBe("8500");
    expect(sub.claims[0]?.serviceLines[0]?.units?.toString()).toBe("4");
    expect(sub.claims[0]?.serviceLines[0]?.procedureCode).toBe("99213");
    // The orphan SV2 is still reported at itself, unchanged: this slice
    // touched the ICR table and nothing else on the walk.
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);
  });

  it("🩺 a declared 837P with no SVx at all is no longer called an unknown variant", () => {
    // At `0.0.13` this raised X12_837_UNKNOWN_VARIANT, which said a
    // conformant document's own implementation-convention reference was one
    // this reader could make nothing of. It was the table that was short.
    const sub = parse837("005010X222A1", [...HEADER, CLM, "HI*ABK:J20.9~"]);
    expect(sub.variant).toBe("P");
    expect(channel(sub)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. Controls. The widening is a LIST, never a pattern.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-ICR-UNGROUNDED: what still does NOT resolve", () => {
  /**
   * Each is a value a pattern-matching implementation would have swallowed.
   * The table is an enumeration of cited identifiers on purpose: a reader
   * that accepted any `005010X22n...` would be inventing guides that do not
   * exist and typing documents off a string shape.
   */
  const NOT_RECOGNISED: readonly (readonly [string, string])[] = [
    ["005010X221A1", "a real identifier, but the 835 remittance TR3 and not an 837 guide"],
    ["004010X098A1", "the 4010 professional addenda; pre-005010 is outside v1 scope"],
    ["005010X222A9", "an errata designation no source names; inventing one is the failure mode"],
    ["005010x222a1", "lowercase: ST-03 is read verbatim and nothing normalises case"],
    [" 005010X222A1", "leading whitespace: nothing trims the element"],
    ["005010X225", "a professional-looking stem that names no 837 guide"],
    ["constructor", "the prototype trap wireLookup exists to close"],
    ["__proto__", "the prototype trap wireLookup exists to close"],
  ];

  for (const [icr, why] of NOT_RECOGNISED) {
    it(`ST-03 ${JSON.stringify(icr)} does not resolve (${why})`, () => {
      // Body carries only an SV2, so a non-resolving ST-03 must fall back
      // to "I". Reading "P" would mean the string was matched somehow.
      const sub = parse837(icr, SV2_ONLY);
      expect(sub.variant).toBe("I");
    });
  }

  it("🩺 an ST-03 outside the set with NO SVx still raises X12_837_UNKNOWN_VARIANT", () => {
    const sub = parse837("005010X221A1", [...HEADER, CLM, "HI*ABK:J20.9~"]);
    expect(sub.variant).toBe("unknown");
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_UNKNOWN_VARIANT]);
  });

  it("an ABSENT ST-03 still falls back exactly as it did", () => {
    const sub = parse837("", SV2_ONLY);
    expect(sub.variant).toBe("I");
    expect(channel(sub)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 4. The fall-back itself, and the precedence around it, are untouched.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-ICR-UNGROUNDED: the SVx fall-back is not narrowed", () => {
  it("🩺 first-wins still takes an ORPHAN SVx ahead of a conformant one", () => {
    // The residual `X12-837-AMBIGUOUS-VARIANT` disclosed and deliberately
    // did not close. It is unchanged for every document that still reaches
    // the fall-back: a widening of the ICR table is not a narrowing of this.
    const sub = parse837("004010X098A1", [...HEADER, SV2, CLM, "HI*ABK:J20.9~", "LX*1~", SV1]);
    expect(sub.variant).toBe("I");
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_AMBIGUOUS_VARIANT,
      WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX,
      WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED,
    ]);
  });

  it("a resolving ST-03 still loses to a caller `type`", () => {
    const ix = parseX12(
      [
        ISA,
        "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A2~",
        "ST*837*0001*005010X222A1~",
        "BHT*0019*00*0123*20260601*1200*CH~",
        ...SV2_ONLY,
        `SE*${String(SV2_ONLY.length + 3)}*0001~`,
        "GE*1*1~",
        "IEA*1*000000001~",
      ].join("\n"),
    );
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no transaction set");
    const sub = get837Claims(ix.delimiters, tx, { type: "I" });
    expect(sub?.variant).toBe("I");
  });
});

// ---------------------------------------------------------------------------
// 5. The tripwire: no frozen message may carry a census of the table again.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-ICR-UNGROUNDED: no warning message enumerates the table", () => {
  /**
   * Both variant-resolution messages named the three keys literally through
   * `0.0.13`, so every one of them was wrong the moment the table was
   * grounded, in a string a consumer had already read. A message is frozen
   * and a table is not, so the messages describe the set and never list it.
   * This is the same rule the registry follows for the Tier-2 code count.
   */
  it("🩺 no message in the registry quotes a TR3 implementation-convention reference", () => {
    // `ALL_WARNING_MESSAGES` is a Set of the message STRINGS, not a record.
    // A first draft of this test read it with `Object.entries`, which gives
    // `[]` on a Set, so it passed while measuring nothing. The control
    // below is what makes this one non-vacuous.
    const offenders = [...ALL_WARNING_MESSAGES].filter((m) => /00\d{4}X\d{3}/.test(m));
    expect(offenders).toEqual([]);
  });

  it("CONTROL: the same scan over the same set DOES find a string that is there", () => {
    const found = [...ALL_WARNING_MESSAGES].filter((m) => m.includes("implementation convention"));
    expect(found.length).toBeGreaterThan(1);
  });

  it("the two variant messages still name the resolution they report", () => {
    const unknown = unknown837Variant({ segmentIndex: 0, transactionIndex: 0 }).message;
    const ambiguous = ambiguous837Variant({ segmentIndex: 0, transactionIndex: 0 }).message;
    expect(unknown).toContain("implementation convention reference");
    expect(ambiguous).toContain("implementation convention reference");
    expect(ALL_WARNING_MESSAGES.has(unknown)).toBe(true);
    expect(ALL_WARNING_MESSAGES.has(ambiguous)).toBe(true);
  });
});

/**
 * `X12-VARIANT-LOOKUP-PROTOTYPE`: a lookup table built as a bare object
 * literal inherits `Object.prototype`, so indexing one with a key that came
 * off the wire resolves TRUTHY for **every own property of
 * `Object.prototype`**. Say that, never a list: the set is engine- and
 * version-dependent, a first draft of this suite named eight when the
 * running engine had twelve, and the whole point of deriving the key list
 * below is that nobody has to keep one. `Object.freeze` does not help - it
 * seals the own properties and changes nothing about the prototype chain.
 *
 * 🩺 **What that cost, measured at `a33c208`.** An ST-03 of `constructor`
 * made `VARIANT_BY_ICR` answer the `Object` constructor, so
 * `submission.variant` was a FUNCTION, `X12_837_UNKNOWN_VARIANT` never
 * fired, `openServiceLine` answered `undefined` for a variant that is not
 * `P` / `I` / `D`, and **every Loop 2400 left the model with `warnings:
 * []`.** The same shape suppressed `X12_UNKNOWN_CARC` (handing back a
 * `reasonDescription` that was a function) and `X12_UNKNOWN_HI_QUALIFIER`,
 * and fabricated an `X12_HL_PARENT_LEVEL_INVALID` against an HL-03 the
 * walker has no expectation for.
 *
 * **▶ EVERY ASSERTION ON THE WARNING CHANNEL HERE IS `toEqual` ON THE WHOLE
 * ARRAY. No case tests a single code for membership or absence.** That is
 * the lesson `#67` paid for: its residual test pinned a value and the
 * absence of a *different* code, both of which stayed true when the leak
 * closed, so it could not observe the silence ending. A pin on "it is
 * silent" that never reads the whole channel is not a pin on silence. Other
 * matchers appear on other objects and that is fine; the property is
 * about the CHANNEL, so do not restate it as an absolute about a matcher name,
 * and do not count them either. Drafts did both, and were false each time.
 *
 * **Every lying document is paired with an honest control** - an ordinary
 * unrecognized value in the same slot - because the fix's whole claim is
 * that a prototype key now behaves *identically* to any other unrecognized
 * one. A guard that over-fired would pass the lying half and red the
 * control.
 *
 * Only bytes can produce these cases: no builder emits a `constructor` in
 * an ST-03. All data is synthetic.
 */

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  CLAIM_ADJUSTMENT_GROUP_CODES,
  WARNING_CODES,
  get837Claims,
  isClaimAdjustmentGroupCode,
  lookupCarc,
  lookupClaimStatus,
  lookupClaimStatusCategory,
  lookupClpStatus,
  lookupMaintenanceType,
  lookupRarc,
  lookupServiceType,
  parseX12,
  resolveHiQualifier,
} from "../src/index.js";
import type { X12ParseWarning, X12TransactionSet, X12_837Submission } from "../src/index.js";

const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       " +
  "*260601*1200*^*00501*000000001*0*P*:~";

/**
 * Every own property of `Object.prototype`, derived from the running engine
 * and **not filtered**: a future ECMAScript adding a member widens this
 * suite by itself, and a hand-maintained list is the thing that was wrong.
 * An earlier draft excluded three of the `__define*` / `__lookup*`
 * accessors for no stated reason and thereby covered 9 of 12; all twelve
 * behave identically at every site measured, at base and at head.
 */
const INHERITED_KEYS: readonly string[] = Object.getOwnPropertyNames(Object.prototype);

/** A marker planted in wire bytes, to prove no diagnostic quotes them back. */
const MARKER = "ZZMARKERZZ";

interface Parsed {
  readonly sub: X12_837Submission;
  readonly tx: X12TransactionSet;
}

function parse837(icr: string, body: readonly string[]): Parsed {
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
  const sub = get837Claims(ix.delimiters, tx);
  if (sub === undefined) throw new Error("get837Claims returned undefined");
  return { sub, tx };
}

/** 2000A + 2000B + a CLM, parameterised by what follows the claim header. */
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
    ...trailing,
  ];
}

/** 2000A + 2000B with NO claim, parameterised by what follows. */
function noClaimBody(trailing: readonly string[]): readonly string[] {
  return [
    "HL*1**20*1~",
    "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
    "HL*2*1*22*0~",
    "SBR*P*18*GROUP123******MB~",
    "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
    "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
    ...trailing,
  ];
}

const SV1 = "SV1*HC:99213*8500*UN*4***1~";

/** THE WHOLE CHANNEL. Never a membership test. */
function channel(sub: X12_837Submission): string[] {
  return sub.warnings.map((w) => w.code);
}

// ---------------------------------------------------------------------------
// 1. ST-03 -> VARIANT_BY_ICR. The headline.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-LOOKUP-PROTOTYPE: an inherited-key ST-03 resolves like any other unknown", () => {
  for (const key of INHERITED_KEYS) {
    it(`🩺 ST-03 "${key}" falls back to the SVx, keeps the line, and says nothing`, () => {
      const { sub } = parse837(key, claimBody(["LX*1~", SV1]));
      // At base `variant` was a function or `Object.prototype` itself.
      expect(typeof sub.variant).toBe("string");
      expect(sub.variant).toBe("P");
      // At base this was 0: the entire Loop 2400 left the model.
      expect(sub.claims[0]?.serviceLines).toHaveLength(1);
      expect(sub.claims[0]?.serviceLines[0]?.charge.toString()).toBe("8500");
      expect(sub.claims[0]?.serviceLines[0]?.units.toString()).toBe("4");
      // The whole channel, not one code. An unrecognized ST-03 that the SVx
      // fallback resolves has never warned, and still does not.
      expect(channel(sub)).toEqual([]);
      // The verbatim reference is still preserved, unchanged by the fix.
      expect(sub.implementationConventionReference).toBe(key);
    });
  }

  it("CONTROL: an ordinary unrecognized ST-03 answers identically", () => {
    // The claim the fix makes is that an inherited key is now indistinguishable
    // from this. If this control ever diverges from the cases above, the guard
    // has grown a behaviour of its own.
    const { sub } = parse837("005010XZZZZZ", claimBody(["LX*1~", SV1]));
    expect(sub.variant).toBe("P");
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines[0]?.charge.toString()).toBe("8500");
    expect(channel(sub)).toEqual([]);
  });

  it("CONTROL: a recognized ST-03 still resolves from ST-03, silently", () => {
    const { sub } = parse837("005010X223A3", claimBody(["LX*1~", "SV2*0300*HC:99213*8500*UN*4~"]));
    expect(sub.variant).toBe("I");
    expect(sub.claims[0]?.serviceLines[0]?.charge.toString()).toBe("8500");
    expect(channel(sub)).toEqual([]);
  });
});

describe("X12-VARIANT-LOOKUP-PROTOTYPE: with no SVx to fall back on, the variant is unknown", () => {
  for (const key of ["constructor", "valueOf", "__proto__", "toString"] as const) {
    it(`🩺 ST-03 "${key}" with no SVx anywhere raises X12_837_UNKNOWN_VARIANT`, () => {
      // The item's headline in one assertion: at base this channel was `[]`,
      // because the inherited key resolved truthy and the code never fired.
      const { sub } = parse837(key, claimBody(["LX*1~", "DTP*472*D8*20260601~"]));
      expect(sub.variant).toBe("unknown");
      expect(channel(sub)).toEqual([
        WARNING_CODES.X12_837_UNKNOWN_VARIANT,
        WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      ]);
    });
  }

  it("CONTROL: an ordinary unrecognized ST-03 with no SVx answers identically", () => {
    const { sub } = parse837("005010XZZZZZ", claimBody(["LX*1~", "DTP*472*D8*20260601~"]));
    expect(sub.variant).toBe("unknown");
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_UNKNOWN_VARIANT,
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
    ]);
  });

  it("CONTROL: an unknown variant with no LX at all raises only the variant code", () => {
    // Isolates the two codes from each other: no LX, no dropped line.
    const { sub } = parse837("005010XZZZZZ", claimBody([]));
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_UNKNOWN_VARIANT]);
  });
});

// ---------------------------------------------------------------------------
// 2. seg.id -> VARIANT_BY_SV_SEGMENT.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-LOOKUP-PROTOTYPE: the SVx fallback table is keyed by a wire segment id", () => {
  it("a segment id outside SV1 / SV2 / SV3 does not resolve a variant", () => {
    // `seg.id` is the segment's first element. The X12 segment-id grammar
    // makes an inherited key unreachable through a well-formed document
    // today, which is a property of another guard and not of this table -
    // so the table is null-prototype anyway, and this pins the honest case.
    const { sub } = parse837("005010XZZZZZ", claimBody(["ZZ*NOT-A-SERVICE-SEGMENT~"]));
    expect(sub.variant).toBe("unknown");
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_UNKNOWN_VARIANT]);
  });
});

// ---------------------------------------------------------------------------
// 3. HL-03 -> EXPECTED_PARENT_LEVEL.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-LOOKUP-PROTOTYPE: an inherited-key HL-03 gets no synthesized expectation", () => {
  function parseHl(levelCode: string): X12_837Submission {
    return parse837("005010X222A2", [
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      `HL*2*1*${levelCode}*0~`,
    ]).sub;
  }

  for (const key of ["constructor", "valueOf", "__proto__", "toString"] as const) {
    it(`🩺 HL-03 "${key}" raises nothing, exactly like an unknown level code`, () => {
      // At base this channel was ["X12_HL_PARENT_LEVEL_INVALID"]: the walker
      // compared the parent's level against a FUNCTION, which no parent can
      // equal, and reported a structural violation the document never made.
      expect(channel(parseHl(key))).toEqual([]);
    });
  }

  it("CONTROL: an ordinary unknown HL-03 is tolerated, with no warning", () => {
    expect(channel(parseHl("99"))).toEqual([]);
  });

  it("CONTROL: a REAL parent-level violation still fires", () => {
    // The half that makes the cases above a defect report rather than noise:
    // a guard that simply stopped warning would pass them and fail here.
    const { sub } = parse837("005010X222A2", [
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "HL*2*1*23*1~",
      "HL*3*2*23*0~",
    ]);
    // Both levels are dependents ("23"), which requires a subscriber ("22")
    // parent: the first is parented by the information source, the second by
    // another dependent, so each reports the same violation.
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_HL_PARENT_LEVEL_INVALID,
      WARNING_CODES.X12_HL_PARENT_LEVEL_INVALID,
    ]);
  });

  it("CONTROL: a top-level HL carrying a parent pointer still fires", () => {
    const { sub } = parse837("005010X222A2", [
      "HL*1*9*20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
    ]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_HL_PARENT_MISMATCH]);
  });
});

// ---------------------------------------------------------------------------
// 4. An LX that opens no Loop 2400 at all.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-LOOKUP-PROTOTYPE: an LX that opens no service line says so", () => {
  it("🩺 an LX + SV1 arriving before any CLM: the whole line is off the model", () => {
    // At base: `claims: []`, `warnings: []`. An $8,500 charge and 4 units
    // left the typed model with no diagnostic on any channel.
    const { sub } = parse837("005010X222A2", noClaimBody(["LX*1~", SV1]));
    expect(sub.claims).toEqual([]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_DROPPED]);
  });

  it("🩺 two orphan LXs warn once each", () => {
    const { sub } = parse837("005010X222A2", noClaimBody(["LX*1~", SV1, "LX*2~", SV1]));
    expect(sub.claims).toEqual([]);
    expect(channel(sub)).toEqual([
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
      WARNING_CODES.X12_837_SERVICE_LINE_DROPPED,
    ]);
  });

  it("CONTROL: the same LX + SV1 inside a CLM decodes and stays silent", () => {
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", SV1]));
    expect(sub.claims).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(sub.claims[0]?.serviceLines[0]?.charge.toString()).toBe("8500");
    expect(channel(sub)).toEqual([]);
  });

  it("the code is NOT raised for a line that is retained but undecoded", () => {
    // `X12_837_SERVICE_LINE_NOT_DECODED` and `X12_837_SERVICE_LINE_DROPPED`
    // report different losses and must never both fire for one LX: here the
    // line IS on the model, holding the seeded zeros `#67` disclosed.
    const { sub } = parse837("005010X222A2", claimBody(["LX*1~", "SV2*0300*HC:99213*8500*UN*4~"]));
    expect(sub.claims[0]?.serviceLines).toHaveLength(1);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_NOT_DECODED]);
  });
});

describe("X12-VARIANT-LOOKUP-PROTOTYPE: what X12_837_SERVICE_LINE_DROPPED says and where it points", () => {
  function dropped(sub: X12_837Submission): X12ParseWarning | undefined {
    return sub.warnings.find((w) => w.code === WARNING_CODES.X12_837_SERVICE_LINE_DROPPED);
  }

  it("`position.segmentIndex` resolves to the LX itself", () => {
    const { sub, tx } = parse837("005010X222A2", noClaimBody(["LX*1~", SV1]));
    const w = dropped(sub);
    expect(w).toBeDefined();
    // Same anchor as X12_837_SERVICE_LINE_NOT_DECODED, for the same reason:
    // the LX is the one segment present in every case this code covers.
    expect(tx.segments[w?.position.segmentIndex ?? -1]?.id).toBe("LX");
  });

  it("the message is a registry member and names no element", () => {
    const { sub } = parse837("005010X222A2", noClaimBody(["LX*1~", SV1]));
    const w = dropped(sub);
    expect(ALL_WARNING_MESSAGES.has(w?.message ?? "")).toBe(true);
    // Nothing was read, so there is no failing element to name.
    expect(w?.position.elementIndex).toBeUndefined();
  });

  it("🩺 the diagnostic quotes no byte of the line it dropped", () => {
    // The dropped SVx carries the procedure billed for a named patient, and
    // is exactly what a "helpful" message would echo back.
    const { sub } = parse837(
      "005010X222A2",
      noClaimBody([`LX*${MARKER}~`, `SV1*HC:${MARKER}*8500*UN*4***1~`]),
    );
    for (const w of sub.warnings) {
      expect(w.message).not.toContain(MARKER);
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. The same shape in the bundled code lists, reached through the 837.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-LOOKUP-PROTOTYPE: the code-list lookups answer undefined for an inherited key", () => {
  const lookups: readonly (readonly [string, (code: string) => unknown])[] = [
    ["lookupCarc", lookupCarc],
    ["lookupRarc", lookupRarc],
    ["lookupClaimStatus", lookupClaimStatus],
    ["lookupClaimStatusCategory", lookupClaimStatusCategory],
    ["lookupClpStatus", lookupClpStatus],
    ["lookupServiceType", lookupServiceType],
    ["lookupMaintenanceType", lookupMaintenanceType],
    ["resolveHiQualifier", resolveHiQualifier],
  ];

  for (const [name, fn] of lookups) {
    it(`🩺 ${name} answers undefined for every inherited key`, () => {
      // At base several of these handed back a FUNCTION, which then rode
      // onto the frozen model in a field typed `string` and suppressed the
      // caller's unknown-code warning.
      for (const key of INHERITED_KEYS) expect(fn(key)).toBeUndefined();
    });
  }

  it("CONTROL: the same helpers still resolve their real codes", () => {
    expect(lookupCarc("1")?.description).toEqual(expect.any(String));
    expect(resolveHiQualifier("ABK")?.system).toBe("ICD-10-CM");
  });

  it("🩺 isClaimAdjustmentGroupCode rejects every inherited key", () => {
    // `in` walks the prototype chain, so the base form narrowed these to
    // ClaimAdjustmentGroupCode. It is the safe-LOOKING form.
    for (const key of INHERITED_KEYS) expect(isClaimAdjustmentGroupCode(key)).toBe(false);
  });

  it("CONTROL: isClaimAdjustmentGroupCode still accepts every declared code and rejects a non-code", () => {
    // Driven off the exported table rather than a hand-typed list, so this
    // cannot go vacuous the way an `expect([true, false]).toContain(...)`
    // draft did - that form passes for any boolean.
    const declared = Object.keys(CLAIM_ADJUSTMENT_GROUP_CODES);
    expect(declared.length).toBeGreaterThan(0);
    for (const code of declared) expect(isClaimAdjustmentGroupCode(code)).toBe(true);
    expect(isClaimAdjustmentGroupCode("ZZ")).toBe(false);
    expect(isClaimAdjustmentGroupCode("")).toBe(false);
  });
});

describe("X12-VARIANT-LOOKUP-PROTOTYPE: reached through the 837 walker, on real bytes", () => {
  it("🩺 an HI qualifier of `constructor` warns, exactly like an unknown one", () => {
    // At base: `warnings: []`, and the diagnosis landed with
    // `codeSystem: "unknown"` and nothing to say so.
    const { sub } = parse837("005010X222A2", [
      "HL*1**20*1~",
      "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
      "HL*2*1*22*0~",
      "SBR*P*18*GROUP123******MB~",
      "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
      "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
      "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
      "HI*constructor:J20.9~",
      "LX*1~",
      SV1,
    ]);
    expect(sub.claims[0]?.otherHi[0]?.codeSystem).toBe("unknown");
    expect(sub.claims[0]?.otherHi[0]?.qualifier).toBe("constructor");
    expect(channel(sub)).toEqual([WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER]);
  });

  it("CONTROL: an ordinary unknown HI qualifier answers identically", () => {
    const { sub } = parse837("005010X222A2", claimBodyWithHi("ZQZ"));
    expect(sub.claims[0]?.otherHi[0]?.codeSystem).toBe("unknown");
    expect(channel(sub)).toEqual([WARNING_CODES.X12_UNKNOWN_HI_QUALIFIER]);
  });

  it("CONTROL: a known HI qualifier still resolves, silently", () => {
    const { sub } = parse837("005010X222A2", claimBodyWithHi("ABK"));
    expect(sub.claims[0]?.diagnoses[0]?.codeSystem).toBe("ICD-10-CM");
    expect(channel(sub)).toEqual([]);
  });

  it("🩺 a CAS reason code of `constructor` warns, and no description is fabricated", () => {
    // At base: `reasonDescription` was a FUNCTION on a field typed
    // `string | undefined`, and X12_UNKNOWN_CARC did not fire. A CARC
    // description is the human-readable reason a payer reduced a payment.
    const { sub } = parse837("005010X222A2", casBody("constructor"));
    const adj = sub.claims[0]?.serviceLines[0]?.adjudications[0]?.adjustments[0];
    expect(adj?.reasonCode).toBe("constructor");
    expect(adj?.reasonDescription).toBeUndefined();
    expect(channel(sub)).toEqual([WARNING_CODES.X12_UNKNOWN_CARC]);
  });

  it("CONTROL: an ordinary unknown CARC answers identically", () => {
    const { sub } = parse837("005010X222A2", casBody("ZZZ"));
    const adj = sub.claims[0]?.serviceLines[0]?.adjudications[0]?.adjustments[0];
    expect(adj?.reasonDescription).toBeUndefined();
    expect(channel(sub)).toEqual([WARNING_CODES.X12_UNKNOWN_CARC]);
  });

  it("CONTROL: a known CARC still resolves its description, silently", () => {
    const { sub } = parse837("005010X222A2", casBody("1"));
    const adj = sub.claims[0]?.serviceLines[0]?.adjudications[0]?.adjustments[0];
    expect(adj?.reasonDescription).toEqual(expect.any(String));
    expect(channel(sub)).toEqual([]);
  });
});

function claimBodyWithHi(qualifier: string): readonly string[] {
  return [
    "HL*1**20*1~",
    "NM1*85*2*BILLING CLINIC INC*****XX*1234567890~",
    "HL*2*1*22*0~",
    "SBR*P*18*GROUP123******MB~",
    "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
    "NM1*PR*2*PAYER ONE*****PI*PAYER01~",
    "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
    `HI*${qualifier}:J20.9~`,
    "LX*1~",
    SV1,
  ];
}

function casBody(reasonCode: string): readonly string[] {
  return claimBody(["LX*1~", SV1, "SVD*PAYER02*100*HC:99213**1~", `CAS*CO*${reasonCode}*50~`]);
}

// ---------------------------------------------------------------------------
// 6. What the dropped-line code does NOT promise. Each of these was a claim
//    this slice made and a refuter measured false; they are pinned so the
//    prose cannot drift back.
// ---------------------------------------------------------------------------

describe("X12-VARIANT-LOOKUP-PROTOTYPE: the bounds of X12_837_SERVICE_LINE_DROPPED", () => {
  /** Parse with a caller `type` a TypeScript caller could not write. */
  function parseWithForeignType(body: readonly string[], type: string): X12_837Submission {
    const segs = [
      ISA,
      "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A2~",
      "ST*837*0001*005010X222A2~",
      "BHT*0019*00*0123*20260601*1200*CH~",
      ...body,
      `SE*${String(body.length + 3)}*0001~`,
      "GE*1*1~",
      "IEA*1*000000001~",
    ];
    const ix = parseX12(segs.join("\n"));
    const tx = ix.groups[0]?.transactions[0];
    if (tx === undefined) throw new Error("no transaction set");
    // The cast is the point of the case: `opts.type` is typed `"P" | "I" | "D"`,
    // but a JavaScript or `JSON.parse`d caller can pass anything.
    const sub = get837Claims(ix.delimiters, tx, { type } as unknown as { type: "P" });
    if (sub === undefined) throw new Error("get837Claims returned undefined");
    return sub;
  }

  it("🩺 an out-of-enum caller `type` drops every line WITHOUT X12_837_UNKNOWN_VARIANT", () => {
    // The reason the message must not promise the two codes travel together,
    // and the reason it points at `submission.variant` instead. Lower-case
    // "p" is not the union member "P".
    const sub = parseWithForeignType(claimBody(["LX*1~", SV1]), "p");
    expect(sub.variant).toBe("p");
    expect(sub.claims[0]?.serviceLines).toEqual([]);
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_DROPPED]);
  });

  it("🩺 a dropped LX still clears the active entity, so a trailing N3/N4 attaches to nobody", () => {
    // The regression control for this slice's own near-miss: returning early
    // from the LX case skipped the `activeEntity` reset, and the address below
    // silently landed on whichever party the last NM1 left active. Trading a
    // warned omission for a silent mis-attribution is the wrong direction.
    const sub = parse837("005010XZZZZZ", [
      ...noClaimBody([]),
      "CLM*PT-ACCT-900*8500***11:B:1*Y*A*Y*Y~",
      "SBR*S*01*GRP2******CI~",
      "NM1*IL*1*OTHER*SUB****MI*OTHER1~",
      "LX*1~",
      "N3*999 LINE FACILITY RD~",
      "N4*SOMEWHERE*NY*10001~",
    ]).sub;
    expect(sub.claims[0]?.otherSubscribers[0]?.otherSubscriber?.address).toBeUndefined();
    expect(sub.claims[0]?.subscriber?.entity.address?.lines ?? []).not.toContain(
      "999 LINE FACILITY RD",
    );
  });

  it("a line-level DTP / AMT / NTE after a dropped LX lands on the ENCLOSING CLAIM", () => {
    // Pre-existing walker behaviour, identical at `a33c208`, pinned because
    // the first draft of this slice's disclosure called these values "absent"
    // and they are not: they are re-attributed, which is harder to notice.
    const sub = parse837(
      "005010XZZZZZ",
      claimBody(["LX*1~", "DTP*472*D8*20260615~", "AMT*T*77.77~", "NTE*ADD*LINE LEVEL NOTE~"]),
    ).sub;
    expect(sub.claims[0]?.serviceLines).toEqual([]);
    expect(sub.claims[0]?.dates.map((d) => d.qualifier)).toContain("472");
    expect(sub.claims[0]?.amounts.map((a) => a.qualifier)).toContain("T");
    expect(sub.claims[0]?.notes).toHaveLength(1);
  });

  it("with NO claim open, the same trailing segments are discarded and a REF lands on the last party", () => {
    // The other half of the route-dependent behaviour `KNOWN-LIMITATIONS.md`
    // states. Two drafts of this slice published the conditional unqualified,
    // in opposite directions, because each is true on exactly one route.
    // Pre-existing at `a33c208`; pinned so the disclosure cannot go stale.
    const sub = parse837("005010X222A2", [
      ...noClaimBody([
        "LX*1~",
        SV1,
        "DTP*472*D8*20260615~",
        "AMT*T*77.77~",
        "NTE*ADD*LINE LEVEL NOTE~",
        "REF*6R*LINE-CTRL-99~",
      ]),
      "CLM*PT-ACCT-901*8500***11:B:1*Y*A*Y*Y~",
    ]).sub;
    expect(channel(sub)).toEqual([WARNING_CODES.X12_837_SERVICE_LINE_DROPPED]);
    // The date, the amount and the note went nowhere at all.
    expect(sub.claims[0]?.dates).toEqual([]);
    expect(sub.claims[0]?.amounts).toEqual([]);
    expect(sub.claims[0]?.notes).toEqual([]);
    // The REF did not: it attached to whichever party the last NM1 left
    // active, which here is the payer of the claim that opens AFTER it.
    expect(sub.claims[0]?.payer?.references.map((r) => r.value)).toContain("LINE-CTRL-99");
  });

  it("🩺 an SVx with NO LX at all is reported by a DIFFERENT code, not by this one", () => {
    // This bound used to read "still dropped in SILENCE, disclosed not
    // fixed": `X12_837_SERVICE_LINE_DROPPED` is anchored at the LX, so a
    // service segment arriving with no LX had nothing to anchor to and
    // reported on no channel. `X12-837-LOOP-RESIDUALS` closed that with
    // `X12_837_SERVICE_SEGMENT_WITHOUT_LX`, anchored at the service segment
    // itself. The bound on THIS code is unchanged and is what the case
    // still pins: it is raised at an LX, so it is not the code that reports
    // a document which has none. Full coverage of the new one lives in
    // `test/transactions-claim-837-service-segment-without-lx.test.ts`.
    const withClaim = parse837("005010X222A2", claimBody([SV1])).sub;
    expect(withClaim.claims[0]?.serviceLines).toEqual([]);
    expect(channel(withClaim)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);

    const withoutClaim = parse837("005010X222A2", noClaimBody([SV1])).sub;
    expect(withoutClaim.claims).toEqual([]);
    expect(channel(withoutClaim)).toEqual([WARNING_CODES.X12_837_SERVICE_SEGMENT_WITHOUT_LX]);
  });
});

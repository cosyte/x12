/**
 * The three guarantees that sit BESIDE the AAA decode rather than inside it:
 *
 * - **Provenance.** A bundled AAA description ships only with a complete
 *   four-part record (source, capture date, maintaining organisation,
 *   redistribution terms), and that record is asserted by reading the bundled
 *   artifact alone, with no documentation read. Both lists ship EMPTY today,
 *   which is a legal state and not a degraded one.
 * - **Diagnostics.** Every string the AAA path can emit is a literal in the
 *   frozen registry, carries the level and the position and NOTHING the sender
 *   sent, and no factory this change added takes a document element.
 * - **Documentation.** No current shipped surface still claims the 271 AAA
 *   segments are an unsurfaced gap.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  AAA_FOLLOW_UP_ACTION_CODES,
  AAA_LEVEL_CONTEXTS,
  AAA_REJECT_REASON_CODES,
  ALL_WARNING_MESSAGES,
  WARNING_CODES,
  aaaLoopUnidentified,
  aaaProvenanceIsComplete,
  aaaRejectReasonAbsent,
  aaaSegmentMalformed,
  aaaUnknownCode,
  bundleAaaCodes,
  get271Eligibility,
  lookupAaaFollowUpAction,
  lookupAaaRejectReason,
  parseX12,
  type AaaCodeListMeta,
  type AaaCodeListSnapshot,
  type X12AaaLevelContext,
  type X12ParseWarning,
} from "../src/index.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const ALL_LEVELS: readonly X12AaaLevelContext[] = Object.values(AAA_LEVEL_CONTEXTS);

const BOTH_SNAPSHOTS: readonly (readonly [string, AaaCodeListSnapshot])[] = [
  ["AAA_REJECT_REASON_CODES", AAA_REJECT_REASON_CODES],
  ["AAA_FOLLOW_UP_ACTION_CODES", AAA_FOLLOW_UP_ACTION_CODES],
];

describe("AC-14 / AC-21: the four-part provenance record, read off the artifact alone", () => {
  it.each(BOTH_SNAPSHOTS)(
    "%s: every SHIPPED description implies all four parts and permission",
    (_name, snapshot) => {
      // The bar, stated as the implication AC-14 makes. Read off `snapshot`
      // alone: no documentation, no source comment, no separate prose file.
      // Vacuously true while the list ships empty, which is why the red
      // control below drives the same helper with a list that is NOT.
      if (Object.keys(snapshot.codes).length > 0) {
        expect(snapshot.meta.source.length).toBeGreaterThan(0);
        expect(snapshot.meta.snapshotDate.length).toBeGreaterThan(0);
        expect(snapshot.meta.maintainingOrganization).toBeDefined();
        expect(snapshot.meta.redistributionTerms).toBeDefined();
        expect(snapshot.meta.redistributionPermitsBundledDescriptions).toBe(true);
        expect(aaaProvenanceIsComplete(snapshot.meta)).toBe(true);
      }
    },
  );

  it.each(BOTH_SNAPSHOTS)("%s: ships EMPTY, which is the expected outcome", (_name, snapshot) => {
    expect(Object.keys(snapshot.codes)).toEqual([]);
    // Not empty by accident: the terms ARE recorded and they do not permit it.
    expect(snapshot.meta.maintainingOrganization).toBe("ASC X12");
    expect(snapshot.meta.redistributionTerms).toContain("X12 is the only organization authorized");
    expect(snapshot.meta.redistributionPermitsBundledDescriptions).toBe(false);
    expect(aaaProvenanceIsComplete(snapshot.meta)).toBe(false);
  });

  it.each(BOTH_SNAPSHOTS)("%s: the source names the retrieved reference", (_name, snapshot) => {
    expect(snapshot.meta.source).toContain("https://www.stedi.com/edi/x12-005010/segment/AAA");
    expect(snapshot.meta.source).toContain("2026-08-22");
    expect(snapshot.meta.snapshotDate).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
  });

  it.each(BOTH_SNAPSHOTS)("%s: meta and codes are frozen", (_name, snapshot) => {
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.meta)).toBe(true);
    expect(Object.isFrozen(snapshot.codes)).toBe(true);
  });

  it("a list missing ANY ONE of the four parts ships zero descriptions", () => {
    // The red control, and the reason the assertion above is not vacuous: the
    // factory enforces the bar, so a description cannot ship on the strength
    // of terms nobody recorded however it got into the source table.
    const complete: AaaCodeListMeta = {
      id: "TEST",
      description: "control",
      source: "a source",
      snapshotDate: "2026-08-22",
      maintainingOrganization: "an organisation",
      redistributionTerms: "terms that permit bundling",
      redistributionPermitsBundledDescriptions: true,
    };
    expect(Object.keys(bundleAaaCodes(complete, { "42": "described" }).codes)).toEqual(["42"]);

    const missing: readonly Partial<AaaCodeListMeta>[] = [
      { source: "" },
      { snapshotDate: "" },
      { maintainingOrganization: undefined },
      { redistributionTerms: undefined },
      { redistributionPermitsBundledDescriptions: false },
    ];
    for (const patch of missing) {
      const snapshot = bundleAaaCodes({ ...complete, ...patch }, { "42": "described" });
      expect(Object.keys(snapshot.codes)).toEqual([]);
    }
  });

  it("AC-4 / AC-13 / AC-15: with the snapshot empty every lookup is undefined", () => {
    for (const code of ["42", "72", "79", "C", "R", "constructor", "__proto__", ""]) {
      expect(lookupAaaRejectReason(code)).toBeUndefined();
      expect(lookupAaaFollowUpAction(code)).toBeUndefined();
    }
  });
});

describe("AC-16: every AAA diagnostic is a frozen literal carrying no document bytes", () => {
  /** Every message the AAA path can emit, across every level. */
  function everyAaaMessage(): readonly X12ParseWarning[] {
    const out: X12ParseWarning[] = [];
    for (const level of ALL_LEVELS) {
      out.push(aaaRejectReasonAbsent({ segmentIndex: 1, elementIndex: 3 }, level));
      out.push(aaaUnknownCode({ segmentIndex: 1, elementIndex: 3 }, level));
      out.push(aaaSegmentMalformed({ segmentIndex: 1, elementIndex: 5 }, level));
      out.push(aaaLoopUnidentified({ segmentIndex: 1 }, level));
    }
    return out;
  }

  it("the registry export gained this change's literals and stays a fixed set", () => {
    const messages = everyAaaMessage();
    expect(messages).toHaveLength(20);
    for (const w of messages) {
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
      expect(typeof w.message).toBe("string");
      // A template or a pattern would be a loosening this criterion forbids.
      expect(w.message).not.toContain("${");
      expect(w.message).not.toMatch(/%[sdo]/u);
    }
    // Distinct per level: the level really is carried, not dropped.
    expect(new Set(messages.map((w) => w.message)).size).toBe(20);
  });

  it("each message names the level it was built with, and no other level", () => {
    const phrase: Readonly<Record<X12AaaLevelContext, string>> = {
      [AAA_LEVEL_CONTEXTS.INFORMATION_SOURCE]: "information source level",
      [AAA_LEVEL_CONTEXTS.INFORMATION_RECEIVER]: "information receiver level",
      [AAA_LEVEL_CONTEXTS.SUBSCRIBER]: "subscriber level",
      [AAA_LEVEL_CONTEXTS.DEPENDENT]: "dependent level",
      [AAA_LEVEL_CONTEXTS.UNATTACHED]: "no identified hierarchical level",
    };
    for (const level of ALL_LEVELS) {
      for (const w of [
        aaaRejectReasonAbsent({ segmentIndex: 1 }, level),
        aaaUnknownCode({ segmentIndex: 1 }, level),
        aaaSegmentMalformed({ segmentIndex: 1 }, level),
      ]) {
        expect(w.message).toContain(phrase[level]);
      }
    }
  });

  it("no AAA warning factory takes a document element as a parameter", () => {
    // A source scan, because a signature is the only place this can be
    // enforced: a factory that never receives a value cannot leak one.
    const source = readFileSync(join(REPO_ROOT, "src", "parser", "warnings.ts"), "utf8");
    for (const name of [
      "aaaRejectReasonAbsent",
      "aaaUnknownCode",
      "aaaSegmentMalformed",
      "aaaLoopUnidentified",
    ]) {
      const match = new RegExp(`export function ${name}\\(([^)]*)\\): X12ParseWarning`, "u").exec(
        source,
      );
      expect(match, `${name} declaration not found`).not.toBeNull();
      const params = (match?.[1] ?? "")
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      expect(params).toEqual(["position: X12Position", "level: X12AaaLevelContext"]);
    }
  });

  it("a document planting distinctive values in every AAA slot leaks none of them", () => {
    // The marker sweep. Every slot the AAA path reads, plus the identifying
    // values beside it, carries a token that cannot occur in English prose.
    const rejectMarker = "ZZQXVMARKER1";
    const followMarker = "ZZQXVMARKER2";
    const memberMarker = "MBRZZQXVMARKER3";
    const raw = [
      "ISA*00*          *00*          *ZZ*MEDPAY         *ZZ*ANYTOWNCLINIC  *260601*1200*^*00501*000000001*0*P*:~",
      "GS*HB*MEDPAY*ANYTOWNCLINIC*20260601*1200*1*X*005010X279A1~",
      "ST*271*0001*005010X279A1~",
      "BHT*0022*11*TXN-REF-901*20260601*1200~",
      "HL*1**20*1~",
      "NM1*PR*2*MEDPAY INSURANCE*****PI*PAYER01~",
      "HL*2*1*21*1~",
      "NM1*1P*2*ANYTOWN CLINIC*****XX*1234567890~",
      "HL*3*2*22*0~",
      `NM1*IL*1*DOE*JANE****MI*${memberMarker}~`,
      "DMG*D8*19850515*F~",
      `AAA*N**${rejectMarker}*${followMarker}~`,
      "SE*11*0001~",
      "GE*1*1~",
      "IEA*1*000000001~",
    ].join("\n");
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    const elig = tx === undefined ? undefined : get271Eligibility(ix.delimiters, tx);

    // The markers DID reach the reader, so the sweep is not vacuous.
    expect(elig?.aaaConditions[0]?.rejectReasonCode?.code).toBe(rejectMarker);
    expect(elig?.aaaConditions[0]?.followUpActionCode?.code).toBe(followMarker);
    expect(elig?.subscribers[0]?.name?.idCode).toBe(memberMarker);

    const leaked = [rejectMarker, followMarker, memberMarker, "DOE", "JANE", "19850515"];
    for (const w of [...(elig?.warnings ?? []), ...ix.warnings]) {
      expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
      for (const value of leaked) expect(w.message).not.toContain(value);
    }
    expect((elig?.warnings ?? []).length).toBeGreaterThan(0);
  });

  it("the model level names and the diagnostic discriminant cannot drift apart", () => {
    // The model's four levels are DERIVED from the warning discriminant, so a
    // rename in one is a rename in both. Pinned so a future edit that copies
    // them apart fails here.
    expect(ALL_LEVELS).toEqual([
      "information-source",
      "information-receiver",
      "subscriber",
      "dependent",
      "unattached",
    ]);
    expect(Object.values(WARNING_CODES)).toContain("X12_271_AAA_LOOP_UNIDENTIFIED");
  });
});

describe("AC-18: no current shipped surface claims the 271 AAA gap this change closed", () => {
  /** A statement that AAA is not surfaced onto the typed model. */
  const GAP_RE = /AAA[\s\S]{0,200}?\bnot (?:yet )?(?:typed|enumerated?|surfaced)/iu;

  /**
   * Does `text` claim the 271 AAA gap anywhere? Sentences naming the 270 are
   * skipped whole: the inquiry direction is out of this change's scope and its
   * own deferral is still true, so sweeping it up would force a false edit.
   */
  function claimsTheGap(text: string): boolean {
    return text
      .split(/\n\s*\n/u)
      .flatMap((paragraph) => paragraph.replace(/\s+/gu, " ").split(/(?<=[.;])\s+/u))
      .filter((sentence) => !/\b270\b/u.test(sentence))
      .some((sentence) => GAP_RE.test(sentence));
  }

  /** Every doc comment block in a source file, as one text. */
  function docComments(text: string): string {
    return [...text.matchAll(/\/\*\*[\s\S]*?\*\//gu)].map((m) => m[0]).join("\n");
  }

  function filesUnder(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) out.push(...filesUnder(full));
      else if (entry.isFile()) out.push(full);
    }
    return out;
  }

  it("README, KNOWN-LIMITATIONS and the published docs carry no such claim", () => {
    const surfaces = [
      join(REPO_ROOT, "README.md"),
      join(REPO_ROOT, "KNOWN-LIMITATIONS.md"),
      ...filesUnder(join(REPO_ROOT, "docs-content")),
    ];
    const offenders = surfaces.filter((file) => claimsTheGap(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("no src doc comment carries it either, so dist type declarations are clean", () => {
    // `src/` JSDoc compiles into the shipped `.d.ts`, which is what a
    // consumer's editor shows on hover.
    const offenders = filesUnder(join(REPO_ROOT, "src"))
      .filter((f) => f.endsWith(".ts"))
      .filter((f) => claimsTheGap(docComments(readFileSync(f, "utf8"))));
    expect(offenders).toEqual([]);
  });

  it("CONTROL: the search really does detect such a claim", () => {
    // Without this the two assertions above could pass over a broken pattern.
    // The string is the one this change removed from the 271 reader.
    expect(
      claimsTheGap(
        "AAA request-validation segments are preserved on tx.segments verbatim but not yet typed onto the model.",
      ),
    ).toBe(true);
  });

  it("CONTROL: the search leaves the 270 direction alone, which still defers AAA", () => {
    // The 270 inquiry direction is out of this change's scope and its own
    // deferral is still true, so the pattern must not sweep it up.
    expect(
      claimsTheGap("On the 270 path AAA segments are preserved verbatim and not yet typed."),
    ).toBe(false);
  });
});

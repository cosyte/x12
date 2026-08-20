/**
 * Unit tests for the 005010X279A1 270 READ surface - `get270Inquiry` and
 * `parse270Inquiries`. Covers:
 *
 * - The transmitted hierarchy: source, receiver, subscriber and dependent
 *   levels in their parent-child relationship, each level's identity and
 *   demographics, the requested service types, the inquiry dates with the
 *   qualifier that says single-date or range, and the trace numbers.
 * - Fidelity: every value is the transmitted bytes of its element or
 *   component, and a composite comes back as separated components rather than
 *   one joined string.
 * - A dependent is presented at the dependent level with its OWN inquiries and
 *   traces, never flattened onto the subscriber it hangs under.
 * - Structural incompleteness: no hierarchy at all, a parent pointer naming a
 *   level that is not present, a subscriber with no inquiry. Each returns a
 *   model with the region absent, warns with a registered code and a position,
 *   fabricates nothing and throws nothing.
 * - Hierarchy hazards: a parent chain that returns to itself, and a duplicated
 *   HL-01 whose children attach to the FIRST level carrying it.
 * - Multiplicity: two 270s in one interchange are separately reachable in
 *   transmitted order; an interchange with none gives an empty result.
 * - The not-a-270 refusal, which matches the shipped readers' shape.
 *
 * Every fixture is synthetic. Provenance for each is recorded beside them in
 * `test/fixtures/eligibility/270-fixture-provenance.md`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  INQUIRY_270_LOOP_2000A,
  INQUIRY_270_LOOP_2000D,
  INQUIRY_270_LOOP_2110,
  WARNING_CODES,
  get270Inquiry,
  get271Eligibility,
  parse270Inquiries,
  parseX12,
} from "../src/index.js";
import type { X12Inquiry, X12TransactionSet } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "eligibility");

function fixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
}

function readInquiry(name: string): X12Inquiry {
  const raw = fixture(name);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "270");
  if (tx === undefined) throw new Error(`Fixture ${name} has no 270 transaction set`);
  const inquiry = get270Inquiry(ix.delimiters, tx);
  if (inquiry === undefined) throw new Error(`get270Inquiry returned undefined for ${name}`);
  return inquiry;
}

/** Every warning code raised on a model, in order. */
function codes(inquiry: X12Inquiry): string[] {
  return inquiry.warnings.map((w) => w.code);
}

describe("get270Inquiry - the canonical inquiry (X279A1)", () => {
  it("decodes the canonical 270 end to end with no warnings", () => {
    const inquiry = readInquiry("270-canonical.edi");
    expect(inquiry.warnings).toHaveLength(0);
    expect(inquiry.header?.purposeCode).toBe("13");
    expect(inquiry.header?.referenceId).toBe("REQ-0001");
    expect(inquiry.informationSources).toHaveLength(1);
  });

  it("exposes the four levels in their transmitted parent-child relationship", () => {
    const inquiry = readInquiry("270-canonical.edi");
    const source = inquiry.informationSources[0];
    expect(source?.hierarchy.levelCode).toBe("20");
    expect(source?.hierarchy.hlId).toBe("1");
    expect(source?.name?.lastNameOrOrganizationName).toBe("MEDPAY INSURANCE");
    expect(source?.name?.idCode).toBe("PAYER01");

    const receiver = source?.receivers[0];
    expect(receiver?.hierarchy.levelCode).toBe("21");
    expect(receiver?.hierarchy.parentHlId).toBe("1");
    expect(receiver?.name?.lastNameOrOrganizationName).toBe("ANYTOWN CLINIC");

    const subscriber = receiver?.subscribers[0];
    expect(subscriber?.hierarchy.levelCode).toBe("22");
    expect(subscriber?.hierarchy.parentHlId).toBe("2");
    expect(subscriber?.dependents).toHaveLength(0);
  });

  it("carries the subscriber identity, demographics, traces, dates and inquiries", () => {
    const subscriber =
      readInquiry("270-canonical.edi").informationSources[0]?.receivers[0]?.subscribers[0];

    expect(subscriber?.name?.entityIdentifierCode).toBe("IL");
    expect(subscriber?.name?.lastNameOrOrganizationName).toBe("DOE");
    expect(subscriber?.name?.firstName).toBe("JANE");
    expect(subscriber?.name?.middleName).toBe("A");
    expect(subscriber?.name?.idQualifier).toBe("MI");
    expect(subscriber?.name?.idCode).toBe("MBR0001");
    expect(subscriber?.name?.dateOfBirth).toBe("19850515");
    expect(subscriber?.name?.genderCode).toBe("F");
    expect(subscriber?.name?.address?.lines).toEqual(["100 MAIN ST"]);
    expect(subscriber?.name?.address?.city).toBe("COLUMBUS");
    expect(subscriber?.name?.address?.postalCode).toBe("43215");

    expect(subscriber?.traces).toHaveLength(1);
    expect(subscriber?.traces[0]?.traceTypeCode).toBe("1");
    expect(subscriber?.traces[0]?.referenceId).toBe("ELIG20260601001");
    expect(subscriber?.traces[0]?.originatingCompanyId).toBe("9SAMPLEORG");

    expect(subscriber?.dates).toHaveLength(1);
    expect(subscriber?.dates[0]?.qualifier).toBe("291");
    expect(subscriber?.dates[0]?.formatQualifier).toBe("D8");
    expect(subscriber?.dates[0]?.value).toBe("20260601");

    const request = subscriber?.inquiries[0];
    expect(subscriber?.inquiries).toHaveLength(1);
    expect(request?.serviceTypeCodes.map((s) => s.code)).toEqual(["30", "35"]);
    expect(request?.coverageLevelCode).toBe("IND");
  });

  it("resolves a service type description without ever replacing the code", () => {
    const request =
      readInquiry("270-canonical.edi").informationSources[0]?.receivers[0]?.subscribers[0]
        ?.inquiries[0];
    expect(request?.serviceTypeCodes[0]?.code).toBe("30");
    expect(request?.serviceTypeCodes[0]?.description).toBe("Health Benefit Plan Coverage");
  });

  it("exposes EQ-02 as separated components, never as one joined string", () => {
    const request =
      readInquiry("270-canonical.edi").informationSources[0]?.receivers[0]?.subscribers[0]
        ?.inquiries[0];
    expect(request?.procedure?.qualifier).toBe("HC");
    expect(request?.procedure?.code).toBe("99213");
    expect(request?.procedure?.modifiers).toEqual(["25"]);
    // The component separator is framing, so it appears in no value.
    expect(JSON.stringify(request)).not.toContain("HC:99213");
  });

  it("invents nothing for an element the sender left out", () => {
    const subscriber =
      readInquiry("270-minimal.edi").informationSources[0]?.receivers[0]?.subscribers[0];
    expect(subscriber?.name?.idCode).toBeUndefined();
    expect(subscriber?.name?.dateOfBirth).toBeUndefined();
    expect(subscriber?.name?.address).toBeUndefined();
    expect(subscriber?.traces).toEqual([]);
    expect(subscriber?.inquiries[0]?.procedure).toBeUndefined();
    expect(subscriber?.inquiries[0]?.coverageLevelCode).toBeUndefined();
  });

  it("decodes the minimal spec-clean inquiry with no warnings", () => {
    expect(readInquiry("270-minimal.edi").warnings).toHaveLength(0);
  });
});

describe("get270Inquiry - a dependent is its own level", () => {
  it("presents the dependent at the dependent level under its subscriber", () => {
    const subscriber =
      readInquiry("270-dependent.edi").informationSources[0]?.receivers[0]?.subscribers[0];
    expect(subscriber?.name?.firstName).toBe("JOHN");
    expect(subscriber?.dependents).toHaveLength(1);

    const dependent = subscriber?.dependents[0];
    expect(dependent?.hierarchy.levelCode).toBe("23");
    expect(dependent?.hierarchy.parentHlId).toBe("3");
    expect(dependent?.name?.firstName).toBe("BABY");
    expect(dependent?.name?.dateOfBirth).toBe("20240101");
  });

  it("keeps the dependent's own traces and inquiries off the subscriber", () => {
    const subscriber =
      readInquiry("270-dependent.edi").informationSources[0]?.receivers[0]?.subscribers[0];
    const dependent = subscriber?.dependents[0];

    expect(subscriber?.traces.map((t) => t.referenceId)).toEqual(["ELIG20260601003"]);
    expect(dependent?.traces.map((t) => t.referenceId)).toEqual(["ELIG20260601004"]);
    expect(subscriber?.inquiries.flatMap((q) => q.serviceTypeCodes.map((s) => s.code))).toEqual([
      "30",
    ]);
    expect(dependent?.inquiries.flatMap((q) => q.serviceTypeCodes.map((s) => s.code))).toEqual([
      "35",
    ]);
    expect(dependent?.inquiries[0]?.coverageLevelCode).toBe("CHD");
  });

  it("carries the format qualifier that says a date is a range and not a day", () => {
    const dependent =
      readInquiry("270-dependent.edi").informationSources[0]?.receivers[0]?.subscribers[0]
        ?.dependents[0];
    expect(dependent?.dates[0]?.formatQualifier).toBe("RD8");
    expect(dependent?.dates[0]?.value).toBe("20260101-20261231");
  });
});

describe("get270Inquiry - structurally incomplete documents", () => {
  it("reports a transaction set with no hierarchy at all, and returns a model", () => {
    const inquiry = readInquiry("270-missing-hierarchy.edi");
    expect(inquiry.informationSources).toEqual([]);
    expect(inquiry.hierarchies).toEqual([]);
    expect(codes(inquiry)).toEqual([WARNING_CODES.X12_MISSING_REQUIRED_LOOP]);
    expect(inquiry.warnings[0]?.position.segmentIndex).toBe(0);
    // The header the document DID carry is still decoded.
    expect(inquiry.header?.referenceId).toBe("REQ-0006");
  });

  it("reports a parent pointer naming a level that is not present, and drops nothing else", () => {
    const inquiry = readInquiry("270-dangling-parent.edi");
    expect(codes(inquiry)).toEqual([
      WARNING_CODES.X12_HL_PARENT_MISMATCH,
      WARNING_CODES.X12_270_LEVEL_DETACHED,
    ]);
    // The subscriber is absent from the tree, and its HL is still verbatim.
    expect(inquiry.informationSources[0]?.receivers[0]?.subscribers).toEqual([]);
    expect(inquiry.hierarchies.map((h) => h.hlId)).toEqual(["1", "2", "3"]);
    expect(inquiry.hierarchies[2]?.parentHlId).toBe("9");
    // Both warnings name the HL that could not attach. Segment indices are
    // 1-based within the transaction set (the ST is 0), so the subscriber HL
    // is the sixth: BHT, HL, NM1, HL, NM1, HL.
    for (const w of inquiry.warnings) expect(w.position.segmentIndex).toBe(6);
  });

  it("reports a subscriber level carrying no inquiry", () => {
    const inquiry = readInquiry("270-no-inquiry.edi");
    expect(codes(inquiry)).toEqual([WARNING_CODES.X12_MISSING_REQUIRED_LOOP]);
    const subscriber = inquiry.informationSources[0]?.receivers[0]?.subscribers[0];
    expect(subscriber?.inquiries).toEqual([]);
    // Nothing is defaulted in: the level is on the tree, short of its EQ.
    expect(subscriber?.name?.idCode).toBe("MBR0001");
  });

  it("reports a level with no name loop", () => {
    const raw = fixture("270-minimal.edi").replace("NM1*IL*1*DOE*JANE~", "");
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    const inquiry = tx === undefined ? undefined : get270Inquiry(ix.delimiters, tx);
    expect(codes(inquiry as X12Inquiry)).toEqual([WARNING_CODES.X12_MISSING_REQUIRED_LOOP]);
    expect(inquiry?.informationSources[0]?.receivers[0]?.subscribers[0]?.name).toBeUndefined();
  });

  /**
   * A DTP is a RECORD and not a slot, so a DTP short of one of the two elements
   * a row is built from loses the whole row: the qualifier that says what the
   * date is for, the format qualifier that says single date or range, and the
   * value. That loss is REPORTED, for the reason the sibling amount codes were
   * added: without a warning beside it, an empty `dates` list reads the same
   * whether the sender stated no date or stated one this reader dropped.
   *
   * The canonical fixture carries `DTP*291*D8*20260601` on its subscriber, so
   * each case below is that one segment cut back, and the fixture's own
   * warning stream is empty, which keeps every case non-vacuous.
   */
  const DTP_ROWS: readonly (readonly [string, string])[] = [
    ["short of its value (DTP-03)", "~DTP*291*D8~"],
    ["short of its qualifier (DTP-01)", "~DTP**D8*20260601~"],
    ["short of both", "~DTP~"],
  ];

  it.each(DTP_ROWS)("reports a DTP %s and builds no row from it", (_label, dtp) => {
    const raw = fixture("270-canonical.edi").replace("~DTP*291*D8*20260601~", dtp);
    const inquiry = parse270Inquiries(raw)[0];
    expect(codes(inquiry as X12Inquiry)).toEqual([WARNING_CODES.X12_270_DATE_ROW_DROPPED]);
    expect(inquiry?.informationSources[0]?.receivers[0]?.subscribers[0]?.dates).toEqual([]);
    // Anchored at the DTP itself, and its message is a registry lookup with
    // nothing from the document in it. Segment indices are 1-based within the
    // transaction set (the ST is 0), so the canonical fixture's DTP is the
    // twelfth: BHT, HL, NM1, HL, NM1, HL, TRN, NM1, N3, N4, DMG, DTP.
    const warning = inquiry?.warnings[0];
    expect(warning?.position.segmentIndex).toBe(12);
    expect(ALL_WARNING_MESSAGES.has(warning?.message ?? "")).toBe(true);
    for (const secret of ["MBR0001", "DOE", "JANE", "20260601", "ELIG2026"]) {
      expect(warning?.message).not.toContain(secret);
    }
  });

  it("keeps a dropped date row distinguishable from a date nobody sent", () => {
    // The whole point of the code. Both documents answer with an empty `dates`
    // list, so the model alone cannot separate them; the warning stream does.
    const canonical = fixture("270-canonical.edi");
    const dropped = parse270Inquiries(
      canonical.replace("~DTP*291*D8*20260601~", "~DTP*291*D8~"),
    )[0];
    const absent = parse270Inquiries(canonical.replace("~DTP*291*D8*20260601~", "~"))[0];
    const dates = (m: X12Inquiry | undefined): unknown =>
      m?.informationSources[0]?.receivers[0]?.subscribers[0]?.dates;

    expect(dates(dropped)).toEqual([]);
    expect(dates(absent)).toEqual([]);
    expect(codes(dropped as X12Inquiry)).toEqual([WARNING_CODES.X12_270_DATE_ROW_DROPPED]);
    expect(codes(absent as X12Inquiry)).toEqual([]);
  });

  it("nothing is fabricated to stand in for the row it dropped", () => {
    // The other half of the guarantee: reporting the loss must not become
    // inventing a partial row out of the element that IS present.
    const raw = fixture("270-canonical.edi").replace("~DTP*291*D8*20260601~", "~DTP*291*D8~");
    const inquiry = parse270Inquiries(raw)[0];
    const subscriber = inquiry?.informationSources[0]?.receivers[0]?.subscribers[0];
    expect(subscriber?.dates).toEqual([]);
    // Everything else the level carries is untouched by the drop.
    expect(subscriber?.name?.idCode).toBe("MBR0001");
    expect(subscriber?.inquiries).toHaveLength(1);
  });

  it("never throws on any of the incomplete fixtures", () => {
    for (const name of [
      "270-missing-hierarchy.edi",
      "270-dangling-parent.edi",
      "270-no-inquiry.edi",
      "270-hl-cycle.edi",
      "270-duplicate-hl-id.edi",
    ]) {
      expect(() => readInquiry(name)).not.toThrow();
    }
  });
});

describe("get270Inquiry - hierarchy hazards", () => {
  it("terminates on a parent chain that returns to itself, and reports it", () => {
    const inquiry = readInquiry("270-hl-cycle.edi");
    expect(codes(inquiry)).toContain(WARNING_CODES.X12_270_HIERARCHY_CYCLE);
    expect(codes(inquiry)).toContain(WARNING_CODES.X12_270_LEVEL_DETACHED);
    // Both cycling levels are off the tree; the source is still a root.
    expect(inquiry.informationSources).toHaveLength(1);
    expect(inquiry.informationSources[0]?.receivers).toEqual([]);
    // Every declared pointer is preserved verbatim.
    expect(inquiry.hierarchies.map((h) => [h.hlId, h.parentHlId])).toEqual([
      ["1", undefined],
      ["2", "3"],
      ["3", "2"],
    ]);
  });

  it("decodes the same bytes to the same model every time", () => {
    const first = readInquiry("270-hl-cycle.edi");
    const second = readInquiry("270-hl-cycle.edi");
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("attaches a child to the FIRST level carrying a duplicated identifier", () => {
    const inquiry = readInquiry("270-duplicate-hl-id.edi");
    expect(codes(inquiry)).toContain(WARNING_CODES.X12_270_DUPLICATE_HIERARCHY_ID);

    const subscribers = inquiry.informationSources[0]?.receivers[0]?.subscribers ?? [];
    expect(subscribers).toHaveLength(2);
    expect(subscribers[0]?.name?.firstName).toBe("JANE");
    expect(subscribers[1]?.name?.firstName).toBe("JOHN");
    // The dependent names "3", and the FIRST level carrying it takes it.
    expect(subscribers[0]?.dependents.map((d) => d.name?.firstName)).toEqual(["BABY"]);
    expect(subscribers[1]?.dependents).toEqual([]);
  });

  it("names the repeat and not the first occurrence when an identifier is duplicated", () => {
    const inquiry = readInquiry("270-duplicate-hl-id.edi");
    const duplicate = inquiry.warnings.find(
      (w) => w.code === WARNING_CODES.X12_270_DUPLICATE_HIERARCHY_ID,
    );
    // The ST is 0, so the tenth segment is the SECOND HL*3: BHT, HL, NM1,
    // HL, NM1, HL, TRN, NM1, EQ, HL.
    expect(duplicate?.position.segmentIndex).toBe(10);
  });

  it("settles a hierarchy that is ALL cycle without re-walking it per level", () => {
    // The hostile shape the bounded walk has to survive: every HL points at
    // the next and the last points back at the first, so no chain reaches a
    // root and none of them ends. The walk memoises the CYCLIC answer as well
    // as the acyclic one, which is what keeps the attachment pass linear in
    // the number of HL segments rather than quadratic - a few hundred
    // kilobytes of this used to cost seconds on a PHI-bearing parse path.
    //
    // This asserts the ANSWERS, not a duration: a timing assertion measures
    // the box, and this repo has a trap on record for reading `testTimeout` as
    // a liveness net. What the memo must not do is change a verdict, so every
    // level is required to be reported and every level to be off the tree.
    const levels = 400;
    const hls: string[] = [];
    for (let i = 1; i <= levels; i += 1) {
      const parent = i === levels ? 1 : i + 1;
      hls.push(`HL*${String(i)}*${String(parent)}*22*0~`);
      hls.push(`NM1*IL*1*DOE*JANE*A***MI*MBR000${String((i % 9) + 1)}~`);
      hls.push("EQ*30~");
    }
    const raw =
      fixture("270-canonical.edi").slice(0, fixture("270-canonical.edi").indexOf("HL*1")) +
      hls.join("") +
      "SE*0*0001~GE*1*1~IEA*1*000000001~";

    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    const inquiry = tx === undefined ? undefined : get270Inquiry(ix.delimiters, tx);
    expect(inquiry).toBeDefined();
    const model = inquiry as X12Inquiry;

    // No level reaches a root, so none of them is on the returned tree, and
    // every one is reported twice: the cycle, and the detachment it causes.
    expect(model.informationSources).toEqual([]);
    expect(model.hierarchies).toHaveLength(levels);
    const cycles = model.warnings.filter((w) => w.code === WARNING_CODES.X12_270_HIERARCHY_CYCLE);
    const detached = model.warnings.filter((w) => w.code === WARNING_CODES.X12_270_LEVEL_DETACHED);
    expect(cycles).toHaveLength(levels);
    expect(detached).toHaveLength(levels);
    // Deterministic: the same bytes decode to the same model every time.
    expect(JSON.stringify(get270Inquiry(ix.delimiters, tx as X12TransactionSet))).toBe(
      JSON.stringify(model),
    );
  });
});

describe("parse270Inquiries - multiplicity and emptiness", () => {
  it("makes each 270 in one interchange separately reachable, in transmitted order", () => {
    const inquiries = parse270Inquiries(fixture("270-two-transactions.edi"));
    expect(inquiries).toHaveLength(2);
    expect(inquiries[0]?.header?.referenceId).toBe("REQ-0011");
    expect(inquiries[1]?.header?.referenceId).toBe("REQ-0012");
  });

  it("gives each of them its own model and its own warnings", () => {
    const inquiries = parse270Inquiries(fixture("270-two-transactions.edi"));
    expect(inquiries[0]?.informationSources[0]?.receivers[0]?.subscribers[0]?.name?.firstName).toBe(
      "JANE",
    );
    expect(inquiries[1]?.informationSources[0]?.receivers[0]?.subscribers[0]?.name?.firstName).toBe(
      "JOHN",
    );
    expect(inquiries[0]?.warnings).toHaveLength(0);
    expect(codes(inquiries[1] as X12Inquiry)).toEqual([WARNING_CODES.X12_MISSING_REQUIRED_LOOP]);
  });

  it("reports an interchange holding no 270 as an empty result", () => {
    const inquiries = parse270Inquiries(fixture("271-canonical.edi"));
    expect(inquiries).toEqual([]);
  });

  it("does not throw on an interchange holding no 270", () => {
    expect(() => parse270Inquiries(fixture("271-canonical.edi"))).not.toThrow();
  });
});

/** The first transaction set of a fixture, which every 270 fixture has. */
function firstTransaction(name: string): X12TransactionSet {
  const tx = parseX12(fixture(name)).groups[0]?.transactions[0];
  if (tx === undefined) throw new Error(`Fixture ${name} has no transaction set`);
  return tx;
}

describe("get270Inquiry - the not-a-270 refusal", () => {
  it("answers undefined for a transaction set that is not a 270", () => {
    const ix = parseX12(fixture("271-canonical.edi"));
    const tx = firstTransaction("271-canonical.edi");
    expect(tx.st.elements[1]).toBe("271");
    expect(get270Inquiry(ix.delimiters, tx)).toBeUndefined();
  });

  it("uses the same refusal shape the shipped readers use", () => {
    // `get271Eligibility` answers `undefined` for a transaction that is not
    // its own, and every other per-transaction reader in this package agrees.
    // The 270 reader matches it rather than inventing an eleventh shape.
    const ix = parseX12(fixture("270-canonical.edi"));
    const tx = firstTransaction("270-canonical.edi");
    expect(get271Eligibility(ix.delimiters, tx)).toBeUndefined();
    expect(get270Inquiry(ix.delimiters, tx)).not.toBeUndefined();
  });

  it("is distinguishable from an interchange that holds no 270", () => {
    // A 271 handed to the 270 reader is `undefined`; an interchange with no
    // 270 in it is `[]`. Conflating them would make a mis-routed call look
    // like an empty inbox.
    const ix = parseX12(fixture("271-canonical.edi"));
    expect(get270Inquiry(ix.delimiters, firstTransaction("271-canonical.edi"))).toBeUndefined();
    expect(parse270Inquiries(fixture("271-canonical.edi"))).toEqual([]);
  });

  it("returns no model built from another transaction set's segments", () => {
    const inquiries = parse270Inquiries(fixture("271-canonical.edi"));
    expect(inquiries).toHaveLength(0);
  });
});

describe("270 warnings come from the frozen registry", () => {
  it("every message the 270 path raises is a member of ALL_WARNING_MESSAGES", () => {
    const names = [
      "270-canonical.edi",
      "270-minimal.edi",
      "270-dependent.edi",
      "270-missing-hierarchy.edi",
      "270-dangling-parent.edi",
      "270-no-inquiry.edi",
      "270-hl-cycle.edi",
      "270-duplicate-hl-id.edi",
      "270-quirk-delimiters.edi",
      "270-quirk-linebreaks.edi",
      "270-two-transactions.edi",
    ];
    let seen = 0;
    for (const name of names) {
      for (const inquiry of parse270Inquiries(fixture(name))) {
        for (const w of inquiry.warnings) {
          expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
          seen += 1;
        }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("interpolates no value from any document into a message", () => {
    for (const name of ["270-dangling-parent.edi", "270-hl-cycle.edi", "270-duplicate-hl-id.edi"]) {
      for (const inquiry of parse270Inquiries(fixture(name))) {
        for (const w of inquiry.warnings) {
          expect(w.message).not.toContain("MBR0001");
          expect(w.message).not.toContain("DOE");
          expect(w.message).not.toContain("ELIG2026");
        }
      }
    }
  });
});

describe("the 270 loop specs are authored through the public factory", () => {
  it("exposes the hierarchy the walker reads", () => {
    expect(INQUIRY_270_LOOP_2000A.trigger).toBe("HL");
    expect(INQUIRY_270_LOOP_2000D.children[0]?.id).toBe("2100D");
    expect(INQUIRY_270_LOOP_2110.trigger).toBe("EQ");
    expect(Object.isFrozen(INQUIRY_270_LOOP_2110)).toBe(true);
  });
});

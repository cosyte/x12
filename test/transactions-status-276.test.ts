/**
 * Unit tests for the 005010X212 276 READ surface - `get276StatusInquiry` and
 * `parse276StatusInquiries`. Covers:
 *
 * - The transmitted hierarchy: information source, information receiver,
 *   service provider, subscriber and dependent levels in their parent-child
 *   relationship, each level's identity and demographics, each claim's trace,
 *   identifiers, amount rows, date rows and service lines.
 * - Fidelity: every value is the transmitted bytes of its element or component,
 *   and a composite comes back as separated components rather than one joined
 *   string.
 * - A dependent is presented at the dependent level with its OWN trace and
 *   claim rows, never flattened onto the subscriber it hangs under.
 * - Hierarchy hazards: a pointer naming a level that is not present, a pointer
 *   naming a level of the WRONG KIND, and a parent chain that returns to
 *   itself. Each leaves that level and its whole subtree off the returned tree,
 *   warns with a registered code and a position, keeps the declared pointer and
 *   the segments verbatim, re-parents nothing and throws nothing.
 * - Rows short of what they are built from: a REF, a DTP and an AMT.
 * - Multiplicity: two 276s in one interchange are separately reachable in
 *   transmitted order; an interchange with none gives an empty result and no
 *   warning about the absence.
 * - The not-a-276 refusal, which matches the shipped readers' shape.
 *
 * Every fixture is synthetic. Provenance for each is recorded beside them in
 * `test/fixtures/status/276-fixture-provenance.md`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ALL_WARNING_MESSAGES,
  STATUS_276_LOOP_2000A,
  STATUS_276_LOOP_2000E,
  STATUS_276_LOOP_2200,
  STATUS_276_LOOP_2210,
  WARNING_CODES,
  get276StatusInquiry,
  get277Status,
  parse276StatusInquiries,
  parseX12,
} from "../src/index.js";
import type { X12StatusInquiry, X12TransactionSet } from "../src/index.js";

const FIXTURE_DIR = join(__dirname, "fixtures", "status");

function fixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), "utf8").trimEnd();
}

function readInquiry(name: string): X12StatusInquiry {
  const raw = fixture(name);
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "276");
  if (tx === undefined) throw new Error(`Fixture ${name} has no 276 transaction set`);
  const inquiry = get276StatusInquiry(ix.delimiters, tx);
  if (inquiry === undefined) throw new Error(`get276StatusInquiry returned undefined for ${name}`);
  return inquiry;
}

/** Every warning code raised on a model, in order. */
function codes(inquiry: X12StatusInquiry): string[] {
  return inquiry.warnings.map((w) => w.code);
}

/** The single subscriber of a fixture whose spine resolves end to end. */
function subscriberOf(inquiry: X12StatusInquiry) {
  return inquiry.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0];
}

describe("get276StatusInquiry - the canonical request (X212)", () => {
  it("decodes the canonical 276 end to end with no warnings", () => {
    const inquiry = readInquiry("276-canonical.edi");
    expect(inquiry.warnings).toHaveLength(0);
    expect(inquiry.header?.hierarchicalStructureCode).toBe("0010");
    expect(inquiry.header?.purposeCode).toBe("13");
    expect(inquiry.header?.referenceId).toBe("STATUS-0001");
    expect(inquiry.informationSources).toHaveLength(1);
  });

  it("exposes the full five-level spine in its transmitted parent-child relationship", () => {
    const inquiry = readInquiry("276-canonical.edi");
    const source = inquiry.informationSources[0];
    expect(source?.hierarchy.levelCode).toBe("20");
    expect(source?.hierarchy.hlId).toBe("1");
    expect(source?.hierarchy.parentHlId).toBeUndefined();
    expect(source?.name?.lastNameOrOrganizationName).toBe("MEDPAY INSURANCE");
    expect(source?.name?.idCode).toBe("PAYER01");

    const receiver = source?.receivers[0];
    expect(receiver?.hierarchy.levelCode).toBe("21");
    expect(receiver?.hierarchy.parentHlId).toBe("1");
    expect(receiver?.name?.idCode).toBe("RECVR01");

    const provider = receiver?.providers[0];
    expect(provider?.hierarchy.levelCode).toBe("19");
    expect(provider?.hierarchy.parentHlId).toBe("2");
    expect(provider?.name?.entityIdentifierCode).toBe("1P");
    expect(provider?.name?.idCode).toBe("1234567890");

    const subscriber = provider?.subscribers[0];
    expect(subscriber?.hierarchy.levelCode).toBe("22");
    expect(subscriber?.hierarchy.parentHlId).toBe("3");

    const dependent = subscriber?.dependents[0];
    expect(dependent?.hierarchy.levelCode).toBe("23");
    expect(dependent?.hierarchy.parentHlId).toBe("4");

    // Every declared HL is on `hierarchies` verbatim, in transmitted order.
    expect(inquiry.hierarchies.map((h) => h.levelCode)).toEqual(["20", "21", "19", "22", "23"]);
  });

  it("carries the subscriber identity, demographics and claim rows", () => {
    const subscriber = subscriberOf(readInquiry("276-canonical.edi"));

    expect(subscriber?.name?.entityIdentifierCode).toBe("IL");
    expect(subscriber?.name?.lastNameOrOrganizationName).toBe("DOE");
    expect(subscriber?.name?.firstName).toBe("JANE");
    expect(subscriber?.name?.middleName).toBe("A");
    expect(subscriber?.name?.idQualifier).toBe("MI");
    expect(subscriber?.name?.idCode).toBe("MBR0001");
    expect(subscriber?.name?.dateOfBirth).toBe("19850515");
    expect(subscriber?.name?.genderCode).toBe("F");

    expect(subscriber?.claims).toHaveLength(1);
    const claim = subscriber?.claims[0];
    expect(claim?.trace?.traceTypeCode).toBe("1");
    expect(claim?.trace?.referenceId).toBe("STATUS20260601001");
    expect(claim?.trace?.originatingCompanyId).toBe("9SAMPLEORG");
    expect(claim?.references.map((r) => [r.qualifier, r.value])).toEqual([["1K", "PCN0001"]]);
    expect(claim?.amounts.map((a) => [a.qualifier, a.amount.toString()])).toEqual([["T3", "150"]]);
    expect(claim?.dates.map((d) => [d.qualifier, d.formatQualifier, d.value])).toEqual([
      ["472", "D8", "20260520"],
    ]);
  });

  it("carries the service line with its own identifier and date rows", () => {
    const line = subscriberOf(readInquiry("276-canonical.edi"))?.claims[0]?.serviceLines[0];
    expect(line?.procedure?.qualifier).toBe("HC");
    expect(line?.procedure?.code).toBe("99213");
    expect(line?.procedure?.modifiers).toEqual(["25"]);
    expect(line?.lineChargeAmount?.toString()).toBe("150");
    expect(line?.unitsOfService?.toString()).toBe("1");
    expect(line?.references.map((r) => [r.qualifier, r.value])).toEqual([["FJ", "LINE001"]]);
    expect(line?.dates.map((d) => d.value)).toEqual(["20260520"]);
  });

  it("exposes SVC-01 as separated components, never as one joined string", () => {
    const line = subscriberOf(readInquiry("276-canonical.edi"))?.claims[0]?.serviceLines[0];
    // The component separator is framing, so it appears in no value.
    expect(JSON.stringify(line)).not.toContain("HC:99213");
  });

  it("invents nothing for an element the sender left out", () => {
    const subscriber = subscriberOf(readInquiry("276-minimal.edi"));
    expect(subscriber?.name?.idCode).toBeUndefined();
    expect(subscriber?.name?.dateOfBirth).toBeUndefined();
    expect(subscriber?.name?.genderCode).toBeUndefined();
    expect(subscriber?.claims[0]?.amounts).toEqual([]);
    expect(subscriber?.claims[0]?.dates).toEqual([]);
    expect(subscriber?.claims[0]?.serviceLines).toEqual([]);
  });

  it("decodes the minimal spec-clean request with no warnings", () => {
    expect(readInquiry("276-minimal.edi").warnings).toHaveLength(0);
  });

  it("returns a typed model rather than only segments and dot-paths", () => {
    // The regression this whole surface exists to close: before it, the only
    // route to a 276's trace was a dot-path into `tx.segments`.
    const claim = subscriberOf(readInquiry("276-minimal.edi"))?.claims[0];
    expect(typeof claim?.trace?.referenceId).toBe("string");
    expect(claim?.trace?.referenceId).toBe("STATUS20260601010");
  });
});

describe("get276StatusInquiry - a dependent is never flattened onto its subscriber", () => {
  it("presents the dependent at its own level with its own trace and claim rows", () => {
    const subscriber = subscriberOf(readInquiry("276-canonical.edi"));
    expect(subscriber?.dependents).toHaveLength(1);
    const dependent = subscriber?.dependents[0];
    expect(dependent?.name?.entityIdentifierCode).toBe("QC");
    expect(dependent?.name?.firstName).toBe("BABY");
    expect(dependent?.name?.idCode).toBe("MBR0002");
    expect(dependent?.name?.dateOfBirth).toBe("20240101");
    expect(dependent?.claims).toHaveLength(1);
    expect(dependent?.claims[0]?.trace?.referenceId).toBe("STATUS20260601002");
    expect(dependent?.claims[0]?.references.map((r) => r.value)).toEqual(["PCN0002"]);
    expect(dependent?.claims[0]?.dates[0]?.formatQualifier).toBe("RD8");
    expect(dependent?.claims[0]?.dates[0]?.value).toBe("20260501-20260503");
  });

  it("leaves the dependent's rows OFF the subscriber", () => {
    const subscriber = subscriberOf(readInquiry("276-canonical.edi"));
    expect(subscriber?.claims).toHaveLength(1);
    expect(subscriber?.claims.map((c) => c.trace?.referenceId)).toEqual(["STATUS20260601001"]);
    expect(JSON.stringify(subscriber?.claims)).not.toContain("STATUS20260601002");
  });
});

describe("get276StatusInquiry - a level whose parent does not resolve", () => {
  it("leaves a level with a dangling pointer, and its subtree, off the tree", () => {
    const inquiry = readInquiry("276-dangling-parent.edi");
    expect(codes(inquiry)).toEqual([
      WARNING_CODES.X12_HL_PARENT_MISMATCH,
      WARNING_CODES.X12_276_LEVEL_DETACHED,
    ]);
    const provider = inquiry.informationSources[0]?.receivers[0]?.providers[0];
    expect(provider?.subscribers).toEqual([]);
  });

  it("leaves a level whose parent is of the WRONG KIND off the tree", () => {
    const inquiry = readInquiry("276-wrong-kind-parent.edi");
    expect(codes(inquiry)).toEqual([
      WARNING_CODES.X12_HL_PARENT_LEVEL_INVALID,
      WARNING_CODES.X12_276_LEVEL_DETACHED,
    ]);
    // The pointer DID resolve, to the receiver. Nothing is re-parented onto it.
    const receiver = inquiry.informationSources[0]?.receivers[0];
    expect(receiver?.providers[0]?.subscribers).toEqual([]);
    expect(JSON.stringify(receiver)).not.toContain("STATUS20260601010");
  });

  it("reports a chain that returns to itself and detaches every level on it", () => {
    const inquiry = readInquiry("276-hl-cycle.edi");
    expect(codes(inquiry)).toContain(WARNING_CODES.X12_276_HIERARCHY_CYCLE);
    expect(codes(inquiry).filter((c) => c === WARNING_CODES.X12_276_LEVEL_DETACHED)).toHaveLength(
      2,
    );
    expect(inquiry.informationSources[0]?.receivers[0]?.providers).toEqual([]);
  });

  it("keeps the declared pointer and the segments verbatim, and throws nothing", () => {
    const raw = fixture("276-dangling-parent.edi");
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0] as X12TransactionSet;
    expect(() => get276StatusInquiry(ix.delimiters, tx)).not.toThrow();
    const inquiry = readInquiry("276-dangling-parent.edi");
    // The detached level's own HL is still on `hierarchies`, pointer and all.
    const detached = inquiry.hierarchies.find((h) => h.levelCode === "22");
    expect(detached?.hlId).toBe("4");
    expect(detached?.parentHlId).toBe("9");
    // And the segments the level carried are still on the transaction set.
    expect(tx.segments.some((s) => s.id === "TRN")).toBe(true);
  });

  it("anchors every warning at a position and draws every message from the registry", () => {
    for (const name of [
      "276-dangling-parent.edi",
      "276-wrong-kind-parent.edi",
      "276-hl-cycle.edi",
      "276-duplicate-hl-id.edi",
      "276-short-rows.edi",
    ]) {
      const inquiry = readInquiry(name);
      expect(inquiry.warnings.length).toBeGreaterThan(0);
      for (const w of inquiry.warnings) {
        expect(typeof w.position.segmentIndex).toBe("number");
        expect(ALL_WARNING_MESSAGES.has(w.message)).toBe(true);
        expect(Object.values(WARNING_CODES)).toContain(w.code);
      }
    }
  });

  it("reports a duplicated HL-01 and attaches a child to the FIRST level carrying it", () => {
    const inquiry = readInquiry("276-duplicate-hl-id.edi");
    expect(codes(inquiry)).toContain(WARNING_CODES.X12_276_DUPLICATE_HIERARCHY_ID);
    const subscribers = inquiry.informationSources[0]?.receivers[0]?.providers[0]?.subscribers;
    // BOTH levels keep their declared HL-01 and BOTH stay on the tree with
    // their own claims: nothing is re-numbered and nothing is merged.
    expect(subscribers).toHaveLength(2);
    expect(subscribers?.map((s) => s.claims[0]?.trace?.referenceId)).toEqual([
      "STATUS20260601030",
      "STATUS20260601031",
    ]);
    // What the duplication decides is where a CHILD naming that id lands, and
    // the rule is fixed: the FIRST level carrying it, in transmitted order.
    expect(subscribers?.[0]?.dependents).toHaveLength(1);
    expect(subscribers?.[0]?.dependents[0]?.claims[0]?.trace?.referenceId).toBe(
      "STATUS20260601032",
    );
    expect(subscribers?.[1]?.dependents).toEqual([]);
  });
});

describe("get276StatusInquiry - a row short of what it is built from", () => {
  it("builds no reference, date or amount row and reports each loss", () => {
    const inquiry = readInquiry("276-short-rows.edi");
    expect(codes(inquiry)).toEqual([
      WARNING_CODES.X12_276_REFERENCE_ROW_DROPPED,
      WARNING_CODES.X12_276_DATE_ROW_DROPPED,
      WARNING_CODES.X12_AMOUNT_ROW_DROPPED,
    ]);
    const claim = subscriberOf(inquiry)?.claims[0];
    // The one WELL-FORMED reference survives; nothing stands in for the rest.
    expect(claim?.references.map((r) => [r.qualifier, r.value])).toEqual([["1K", "PCN0040"]]);
    expect(claim?.dates).toEqual([]);
    expect(claim?.amounts).toEqual([]);
  });

  it("raises no X12_UNPARSEABLE_DECIMAL for an ABSENT amount, which is a different fact", () => {
    expect(codes(readInquiry("276-short-rows.edi"))).not.toContain(
      WARNING_CODES.X12_UNPARSEABLE_DECIMAL,
    );
  });
});

describe("parse276StatusInquiries - multiplicity and the absent case", () => {
  it("returns one model per 276, in transmitted order", () => {
    const inquiries = parse276StatusInquiries(fixture("276-two-transactions.edi"));
    expect(inquiries).toHaveLength(2);
    expect(inquiries[0]?.header?.referenceId).toBe("STATUS-0008");
    expect(inquiries[1]?.header?.referenceId).toBe("STATUS-0009");
    expect(
      inquiries[1]?.informationSources[0]?.receivers[0]?.providers[0]?.subscribers[0]?.name
        ?.lastNameOrOrganizationName,
    ).toBe("ROE");
  });

  it("yields nothing, and warns nothing, for an interchange carrying no 276", () => {
    // A 277 is the neighbouring transaction of this very pair, which is what
    // makes it the strong negative: nothing about it is decoded here.
    const raw = fixture("277-canonical.edi");
    const inquiries = parse276StatusInquiries(raw);
    expect(inquiries).toEqual([]);
    // The 277 itself still decodes on its own reader, so the fixture is not
    // vacuous: this interchange really does hold a claim-status transaction.
    const ix = parseX12(raw);
    const tx = ix.groups[0]?.transactions[0];
    expect(tx === undefined ? undefined : get277Status(ix.delimiters, tx)).toBeDefined();
  });

  it("returns undefined for a transaction set that is not a 276", () => {
    const ix = parseX12(fixture("277-canonical.edi"));
    const tx = ix.groups[0]?.transactions[0] as X12TransactionSet;
    expect(get276StatusInquiry(ix.delimiters, tx)).toBeUndefined();
  });

  it("does not claim a 276 out of an interchange the 277 reader claims", () => {
    const ix = parseX12(fixture("276-minimal.edi"));
    const tx = ix.groups[0]?.transactions[0] as X12TransactionSet;
    expect(get277Status(ix.delimiters, tx)).toBeUndefined();
    expect(get276StatusInquiry(ix.delimiters, tx)).toBeDefined();
  });
});

describe("the 276 loop specs are authored through the public defineLoopSpec API", () => {
  it("exposes the hierarchy a consumer can introspect", () => {
    expect(STATUS_276_LOOP_2000A.trigger).toBe("HL");
    expect(STATUS_276_LOOP_2000E.children[0]?.id).toBe("2200");
    expect(STATUS_276_LOOP_2200.trigger).toBe("TRN");
    expect(STATUS_276_LOOP_2200.children[0]?.id).toBe("2210");
    expect(STATUS_276_LOOP_2210.trigger).toBe("SVC");
  });

  it("freezes them, so a consumer cannot change what a later reader sees", () => {
    expect(Object.isFrozen(STATUS_276_LOOP_2200)).toBe(true);
    expect(Object.isFrozen(STATUS_276_LOOP_2200.segments)).toBe(true);
  });
});

/**
 * The FREEZE, and the one exemption from it.
 *
 * The AAA surface is an addition. The decoded model it was added to must not
 * have moved, and this file is the evidence: the benefit, subscriber,
 * dependent and hierarchy collections of every corpus document are compared,
 * per owner, against goldens captured at the commit this branch was cut from,
 * BEFORE any of the change existed.
 *
 * The WARNINGS collection is exempt, deliberately and by name, because adding
 * warnings is part of what this change is for. The exemption is not a hole:
 * a document that gains a warning must gain NOTHING ELSE, every added entry
 * must carry a warning code this change introduced, and every entry the
 * baseline held must still be present in its original relative order. That is
 * asserted here over documents derived from the real corpus, so the assertion
 * has content rather than passing over an empty diff.
 *
 * Baseline commit: `ccff9530d693bdb38074d4277d4c17736f74cd5e`. The goldens are
 * `test/fixtures/goldens/*.baseline.json` and are NEVER re-captured. There is
 * no script mode that rewrites them.
 */

import { describe, expect, it } from "vitest";

import { WARNING_CODES, get271Eligibility, parseX12 } from "../src/index.js";
import type { X12Eligibility, X12ParseWarning } from "../src/index.js";
import {
  GOLDEN_FILES,
  aaaSegmentCount,
  corpus271,
  frozenCollections,
  readGolden,
  warningsCollection,
  type Corpus271Document,
} from "./_helpers/eligibility-271-corpus.js";

/** The warning codes this change introduced. Nothing else may be added. */
const CODES_THIS_CHANGE_INTRODUCED: ReadonlySet<string> = new Set([
  WARNING_CODES.X12_271_AAA_REJECT_REASON_ABSENT,
  WARNING_CODES.X12_271_AAA_UNKNOWN_CODE,
  WARNING_CODES.X12_271_AAA_SEGMENT_MALFORMED,
  WARNING_CODES.X12_271_AAA_LOOP_UNIDENTIFIED,
]);

const docs = corpus271();
const byId: ReadonlyMap<string, Corpus271Document> = new Map(docs.map((d) => [d.id, d]));

const frozenBaseline = readGolden(GOLDEN_FILES.FROZEN_BASELINE) as Record<string, unknown>;
const warningsBaseline = readGolden(GOLDEN_FILES.WARNINGS_BASELINE) as Record<string, unknown>;
const aaaPartitionBaseline = readGolden(GOLDEN_FILES.AAA_PARTITION_BASELINE) as Record<
  string,
  number
>;

describe("AC-5 / AC-23: the four frozen collections did not move", () => {
  it("the baseline really covers the corpus it was taken from", () => {
    // A golden nobody can find is a freeze that never fires.
    expect(Object.keys(frozenBaseline).length).toBeGreaterThan(0);
    expect(Object.keys(frozenBaseline).sort()).toEqual(Object.keys(warningsBaseline).sort());
    expect(Object.keys(frozenBaseline).sort()).toEqual(Object.keys(aaaPartitionBaseline).sort());
  });

  it.each(Object.keys(frozenBaseline))(
    "%s: benefit, subscriber, dependent and hierarchy collections equal the baseline",
    (id) => {
      const doc = byId.get(id);
      expect(doc, `baseline document ${id} is no longer in the corpus`).toBeDefined();
      // Membership, ordering and length of all four, per owner. Benefits are
      // nested per subscriber and per dependent, so a benefit that moved
      // between owners changes this even though a flat list would not.
      expect(frozenCollections(doc?.elig as X12Eligibility)).toEqual(frozenBaseline[id]);
    },
  );

  it("the comparison excludes the warnings collection BY NAME, not by accident", () => {
    // The projection is what the freeze covers, and it has to be possible to
    // see that warnings are not in it.
    const projected = frozenCollections(docs[0]?.elig as X12Eligibility) as Record<string, unknown>;
    expect(Object.keys(projected).sort()).toEqual(["hierarchies", "subscribers"]);
    expect(Object.keys(projected)).not.toContain("warnings");
    expect(Object.keys(projected)).not.toContain("aaaConditions");
  });

  it("CONTROL: the comparison detects a moved benefit", () => {
    // Without this the sweep above could pass over a projection that dropped
    // the benefits entirely.
    const doc = docs.find((d) => d.elig.subscribers.some((s) => s.benefits.length > 0));
    expect(doc, "no corpus document carries a benefit").toBeDefined();
    const mutated = frozenCollections({
      ...(doc?.elig as X12Eligibility),
      subscribers: (doc?.elig.subscribers ?? []).map((s) => ({ ...s, benefits: [] })),
    });
    expect(mutated).not.toEqual(frozenBaseline[doc?.id ?? ""]);
  });
});

describe("AC-17: the AAA collection is present on every 271 result", () => {
  it("the corpus partition is READ off the corpus, never assumed", () => {
    const withAaa = docs.filter((d) => aaaSegmentCount(d.tx) > 0);
    const withoutAaa = docs.filter((d) => aaaSegmentCount(d.tx) === 0);
    // Both halves are non-empty, so neither branch below is vacuous.
    expect(withAaa.length).toBeGreaterThan(0);
    expect(withoutAaa.length).toBeGreaterThan(0);
    expect(withAaa.length + withoutAaa.length).toBe(docs.length);
  });

  it.each(docs.map((d) => d.id))("%s: the collection is present, never undefined", (id) => {
    const elig = byId.get(id)?.elig;
    expect(elig?.aaaConditions).toBeDefined();
    expect(Array.isArray(elig?.aaaConditions)).toBe(true);
    expect(Object.hasOwn(elig as object, "aaaConditions")).toBe(true);
  });

  it("every corpus 271 that carries NO AAA reports a present, EMPTY collection", () => {
    for (const doc of docs.filter((d) => aaaSegmentCount(d.tx) === 0)) {
      expect(doc.elig.aaaConditions, doc.id).toHaveLength(0);
    }
  });

  it("every corpus 271 that DOES carry an AAA reports one entry per segment, in order", () => {
    for (const doc of docs.filter((d) => aaaSegmentCount(d.tx) > 0)) {
      expect(doc.elig.aaaConditions, doc.id).toHaveLength(aaaSegmentCount(doc.tx));
      const segmentIndices = doc.elig.aaaConditions.map((c) => c.position.segmentIndex);
      expect(segmentIndices, doc.id).toEqual([...segmentIndices].sort((a, b) => a - b));
    }
  });

  it("no document without an AAA segment produces a condition, corpus-wide", () => {
    const offenders = docs
      .filter((d) => aaaSegmentCount(d.tx) === 0 && d.elig.aaaConditions.length > 0)
      .map((d) => d.id);
    expect(offenders).toEqual([]);
  });

  it("the baseline corpus carried no AAA at all, which is a fact and not an assumption", () => {
    // Recorded so the next reader does not have to re-derive it: at the
    // baseline commit every 271 fixture on disk was AAA-free, so AC-17's
    // no-AAA property covered the whole corpus as it stood then.
    expect(Object.values(aaaPartitionBaseline)).toEqual([0, 0, 0]);
  });
});

/**
 * The corpus document's own bytes with one AAA inserted right after its first
 * HL, and SE-01 corrected so the insertion raises no PRE-EXISTING count
 * warning. Deriving rather than editing the committed fixture is what keeps
 * the baseline goldens comparable: the input is byte-identical to the document
 * they were captured from, plus one segment that must change none of them.
 */
function withInsertedAaa(raw: string): string {
  const segments = raw.split("~");
  const hlAt = segments.findIndex((s) => s.trim().startsWith("HL*"));
  if (hlAt === -1) throw new Error("no HL segment to insert after");
  const prettyPrinted = segments[hlAt + 1]?.startsWith("\n") === true;
  segments.splice(hlAt + 1, 0, `${prettyPrinted ? "\n" : ""}AAA*N**42*C`);
  const seAt = segments.findIndex((s) => s.trim().startsWith("SE*"));
  if (seAt === -1) throw new Error("no SE segment to renumber");
  const parts = (segments[seAt] ?? "").split("*");
  parts[1] = String(Number(parts[1]) + 1);
  segments[seAt] = parts.join("*");
  return segments.join("~");
}

function decode271(raw: string): X12Eligibility {
  const ix = parseX12(raw);
  const tx = ix.groups[0]?.transactions.find((t) => t.st.elements[1] === "271");
  if (tx === undefined) throw new Error("derived document carries no 271");
  const elig = get271Eligibility(ix.delimiters, tx);
  if (elig === undefined) throw new Error("derived document did not decode");
  return elig;
}

describe("AC-23a: a document may gain warnings and nothing else", () => {
  const derivable = docs.filter((d) => Object.hasOwn(frozenBaseline, d.id));

  it("the derived documents exist, so nothing below is vacuous", () => {
    expect(derivable.length).toBeGreaterThan(0);
  });

  it.each(derivable.map((d) => d.id))(
    "%s + one AAA: warnings grow, the frozen four do not move",
    (id) => {
      const source = byId.get(id);
      const before = source?.elig as X12Eligibility;
      const after = decode271(withInsertedAaa(source?.raw ?? ""));

      // The four frozen collections are still exactly the baseline goldens.
      expect(frozenCollections(after)).toEqual(frozenCollections(before));
      expect(frozenCollections(after)).toEqual(frozenBaseline[id]);

      // Every entry the baseline held is still present, in its original
      // relative order, and every ADDED entry carries a NEW code.
      const baselineCodes = before.warnings.map((w: X12ParseWarning) => w.code);
      const afterCodes = after.warnings.map((w: X12ParseWarning) => w.code);
      expect(afterCodes.filter((c) => !CODES_THIS_CHANGE_INTRODUCED.has(c))).toEqual(baselineCodes);
      const added = afterCodes.filter((c) => CODES_THIS_CHANGE_INTRODUCED.has(c));
      expect(added.length).toBeGreaterThan(0);

      // The document really did gain warnings, which is what makes the
      // no-other-movement assertion above mean something.
      expect(warningsCollection(after)).not.toEqual(warningsCollection(before));

      // And its AAA collection holds one entry per AAA segment, in order.
      expect(after.aaaConditions).toHaveLength(1);
      expect(after.aaaConditions[0]?.rejectReasonCode?.code).toBe("42");
      expect(after.aaaConditions[0]?.followUpActionCode?.code).toBe("C");
    },
  );

  it("the RE-CAPTURED warnings goldens differ from the baseline only by new codes", () => {
    // The committed diff, asserted rather than eyeballed. The warnings golden
    // is the ONE collection this change re-captured, deliberately, and this is
    // what bounds that exemption.
    const current = readGolden(GOLDEN_FILES.WARNINGS_CURRENT) as Record<
      string,
      readonly { readonly code: string }[]
    >;

    for (const [id, baselineEntries] of Object.entries(warningsBaseline)) {
      const before = baselineEntries as readonly { readonly code: string }[];
      const after = current[id];
      expect(after, `${id} left the re-captured golden`).toBeDefined();
      // Every baseline entry survives, in its original relative order.
      expect((after ?? []).filter((w) => !CODES_THIS_CHANGE_INTRODUCED.has(w.code))).toEqual(
        before,
      );
    }

    // Documents the baseline never held are new fixtures this change added.
    // Every entry they carry must still be a code this change introduced.
    const addedIds = Object.keys(current).filter((id) => !Object.hasOwn(warningsBaseline, id));
    expect(addedIds.length).toBeGreaterThan(0);
    for (const id of addedIds) {
      for (const w of current[id] ?? []) {
        expect(CODES_THIS_CHANGE_INTRODUCED.has(w.code), `${id}: ${w.code}`).toBe(true);
      }
    }

    // The re-capture really did gain entries, so the assertions are not
    // passing over an empty diff.
    const total = Object.values(current).reduce((n, entries) => n + entries.length, 0);
    expect(total).toBeGreaterThan(0);
  });

  it("the re-captured warnings golden matches what the reader produces today", () => {
    // A stale golden is a golden that asserts nothing. This is what makes the
    // committed file evidence rather than decoration.
    const current = readGolden(GOLDEN_FILES.WARNINGS_CURRENT) as Record<string, unknown>;
    for (const doc of docs) {
      expect(current[doc.id], doc.id).toEqual(warningsCollection(doc.elig));
    }
    expect(Object.keys(current).sort()).toEqual(docs.map((d) => d.id).sort());
  });

  it("the insertion adds no PRE-EXISTING warning code anywhere in the interchange", () => {
    // The trap this guards: a naive insertion leaves SE-01 stale, which raises
    // `X12_SEGMENT_COUNT_MISMATCH`, a code that predates this change, and that
    // would itself be the regression this criterion forbids.
    for (const doc of derivable) {
      const ix = parseX12(withInsertedAaa(doc.raw));
      expect(
        ix.warnings.map((w) => w.code),
        doc.id,
      ).toEqual(parseX12(doc.raw).warnings.map((w) => w.code));
    }
  });
});

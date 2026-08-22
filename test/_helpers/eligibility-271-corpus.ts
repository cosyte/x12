/**
 * The 271 corpus, and the projections the non-regression goldens are taken
 * from. Shared by `scripts/capture-271-goldens.ts` (which WRITES the golden
 * files) and by the test suite (which READS them back and compares), so the
 * capture and the comparison can never drift apart in their idea of what a
 * collection is.
 *
 * **The corpus is discovered, never listed.** Every tracked `.edi` file under
 * `test/fixtures/` is read and every transaction set whose ST-01 is `271` is a
 * corpus document. A 271 fixture added later is therefore in scope with no
 * edit here, which is the point: the partition of the corpus into documents
 * that carry an AAA segment and documents that do not is READ off the corpus
 * at the moment it is needed and is never assumed.
 *
 * **Two golden sets, governed differently.** The FROZEN four (benefit,
 * subscriber, dependent and hierarchy collections) are captured once, before
 * the AAA surface existed, and are never re-captured: a mismatch against them
 * is a regression in the decoded model. The WARNINGS collection is captured
 * twice, once at that same baseline and once after, because the AAA surface
 * exists in order to add warnings and freezing them would freeze the
 * deliverable. Nothing else is ever re-captured.
 *
 * Benefits are nested per subscriber and per dependent, and dependents per
 * subscriber, so the projection enumerates them PER OWNER rather than
 * concatenating them: a benefit that moved from one subscriber to another
 * would leave a flat list identical and is exactly the drift the freeze exists
 * to catch.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { get271Eligibility, parseX12 } from "../../src/index.js";
import type {
  X12Eligibility,
  X12EligibilityBenefit,
  X12EligibilityDependent,
  X12EligibilitySubscriber,
  X12Hl,
  X12ParseWarning,
  X12TransactionSet,
} from "../../src/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));

/** `test/` - the corpus root's parent, and the base every id is relative to. */
export const TEST_ROOT = join(HERE, "..");

/** `test/fixtures/` - every `.edi` under it is a candidate corpus document. */
export const FIXTURE_ROOT = join(TEST_ROOT, "fixtures");

/** Where the captured golden JSON lives. */
export const GOLDEN_ROOT = join(FIXTURE_ROOT, "goldens");

/** One 271 transaction set found in the corpus, with its decoded result. */
export interface Corpus271Document {
  /** Stable id: the fixture path relative to `test/`, then `#<index>`. */
  readonly id: string;
  /** The transaction set as the shared parse framed it. */
  readonly tx: X12TransactionSet;
  /** The decoded eligibility result for that transaction set. */
  readonly elig: X12Eligibility;
}

/** Recursively collect every `.edi` file under `dir`, in sorted order. */
function ediFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...ediFilesUnder(full));
    else if (entry.isFile() && entry.name.endsWith(".edi")) out.push(full);
  }
  return out;
}

/**
 * Every 271 transaction set in the repository's fixture corpus, in a stable
 * order (path, then position within the interchange). Throws on a fixture that
 * declares a 271 the reader will not decode, so a corpus document can never
 * drop out of the comparison silently.
 */
export function corpus271(): readonly Corpus271Document[] {
  const docs: Corpus271Document[] = [];
  for (const file of ediFilesUnder(FIXTURE_ROOT)) {
    const raw = readFileSync(file, "utf8").trimEnd();
    if (!raw.includes("ST*271")) continue;
    const ix = parseX12(raw);
    const id = relative(TEST_ROOT, file).split(sep).join("/");
    let index = 0;
    for (const group of ix.groups) {
      for (const tx of group.transactions) {
        if (tx.st.elements[1] !== "271") continue;
        const elig = get271Eligibility(ix.delimiters, tx);
        if (elig === undefined) {
          throw new Error(`corpus271: get271Eligibility returned undefined for ${id}#${index}`);
        }
        docs.push({ id: `${id}#${index}`, tx, elig });
        index += 1;
      }
    }
  }
  return docs;
}

/** How many AAA segments the transaction set carries, in document order. */
export function aaaSegmentCount(tx: X12TransactionSet): number {
  return tx.segments.filter((seg) => seg.id === "AAA").length;
}

/** A benefit projected to plain JSON (decimals rendered verbatim as text). */
function projectBenefit(b: X12EligibilityBenefit): unknown {
  return {
    eligibilityCode: b.eligibilityCode,
    coverageLevelCode: b.coverageLevelCode ?? null,
    serviceTypeCodes: b.serviceTypeCodes.map((s) => ({
      code: s.code,
      description: s.description ?? null,
    })),
    insuranceTypeCode: b.insuranceTypeCode ?? null,
    planCoverageDescription: b.planCoverageDescription ?? null,
    timePeriodQualifier: b.timePeriodQualifier ?? null,
    monetaryAmount: b.monetaryAmount?.toString() ?? null,
    percent: b.percent?.toString() ?? null,
    quantityQualifier: b.quantityQualifier ?? null,
    quantity: b.quantity?.toString() ?? null,
    authorizationRequired: b.authorizationRequired ?? null,
    inPlanNetwork: b.inPlanNetwork ?? null,
    references: b.references.map((r) => ({
      qualifier: r.qualifier,
      value: r.value,
      description: r.description ?? null,
    })),
    dates: b.dates.map((d) => ({
      qualifier: d.qualifier,
      formatQualifier: d.formatQualifier,
      value: d.value,
    })),
    messages: [...b.messages],
    relatedEntities: b.relatedEntities.map((e) => ({
      entityIdentifierCode: e.entityIdentifierCode,
      entityTypeQualifier: e.entityTypeQualifier,
      name: e.name,
      idQualifier: e.idQualifier ?? null,
      idCode: e.idCode ?? null,
    })),
  };
}

/** An HL projected to plain JSON. */
function projectHierarchy(hl: X12Hl): unknown {
  return {
    hlId: hl.hlId,
    parentHlId: hl.parentHlId ?? null,
    levelCode: hl.levelCode,
    hasChild: hl.hasChild,
  };
}

/** A dependent projected with ITS OWN benefits, never a flattened list. */
function projectDependent(d: X12EligibilityDependent): unknown {
  return {
    hierarchyId: d.hierarchy?.hlId ?? null,
    memberIdCode: d.name?.idCode ?? null,
    benefits: d.benefits.map(projectBenefit),
  };
}

/** A subscriber projected with ITS OWN benefits and ITS OWN dependents. */
function projectSubscriber(s: X12EligibilitySubscriber): unknown {
  return {
    hierarchyId: s.hierarchy?.hlId ?? null,
    memberIdCode: s.name?.idCode ?? null,
    benefits: s.benefits.map(projectBenefit),
    dependents: s.dependents.map(projectDependent),
  };
}

/** A warning projected to plain JSON. */
function projectWarning(w: X12ParseWarning): unknown {
  return { code: w.code, message: w.message, position: { ...w.position } };
}

/**
 * The FOUR FROZEN COLLECTIONS of one document: the subscriber collection, the
 * dependent collection nested under each subscriber, the benefit collection
 * nested under each of those owners, and the hierarchy collection. Membership,
 * ordering and length of all four are visible in the result, per owner.
 */
export function frozenCollections(elig: X12Eligibility): unknown {
  return {
    hierarchies: elig.hierarchies.map(projectHierarchy),
    subscribers: elig.subscribers.map(projectSubscriber),
  };
}

/** The warnings collection of one document, in emitted order. */
export function warningsCollection(elig: X12Eligibility): unknown {
  return elig.warnings.map(projectWarning);
}

/** Project the whole corpus through `project`, keyed by document id. */
export function projectCorpus(
  docs: readonly Corpus271Document[],
  project: (elig: X12Eligibility) => unknown,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const doc of docs) out[doc.id] = project(doc.elig);
  return out;
}

/** Read a captured golden file back as parsed JSON. */
export function readGolden(name: string): unknown {
  return JSON.parse(readFileSync(join(GOLDEN_ROOT, name), "utf8")) as unknown;
}

/** The golden file names, so the script and the tests cannot disagree. */
export const GOLDEN_FILES = Object.freeze({
  /** The frozen four at the AC-5 baseline. NEVER re-captured. */
  FROZEN_BASELINE: "271-frozen-collections.baseline.json",
  /** The warnings collection at the AC-5 baseline. NEVER re-captured. */
  WARNINGS_BASELINE: "271-warnings.baseline.json",
  /** The warnings collection after the change. Re-captured deliberately. */
  WARNINGS_CURRENT: "271-warnings.current.json",
  /** Which corpus documents carried an AAA segment at the baseline. */
  AAA_PARTITION_BASELINE: "271-aaa-partition.baseline.json",
});

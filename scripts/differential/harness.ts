/**
 * The differential harness: read the same documents through this library and
 * through an independent open-source X12 reader, and record where the two
 * agree, where they disagree, and which transactions the oracle has no map for.
 *
 * The oracle sits outside this module's boundary - it is another process, in
 * another language - so it arrives as a {@link DifferentialOracle}. Everything
 * else runs for real: the read scope is derived from `X12_TR3_CONFORMANCE`, the
 * corpus is assigned by parsing each document with this library's own parser,
 * and the comparison walks this library's own published accessors.
 *
 * Three refusals are deliberately NOT treated as agreement. An oracle that
 * cannot be invoked aborts the run before a report exists. A document either
 * reader refuses is recorded as unevaluated against the side that refused it. A
 * compared transaction that put no document, or no element position, through
 * both readers fails the run, because an empty comparison and a clean one are
 * indistinguishable in a report that only counts disagreements.
 *
 * Every document handed to a run is accounted for: it is compared, or it is
 * recorded as unevaluated against the reader that refused it, or it is recorded
 * as skipped with what its own identifiers said it was. A document the run
 * considered and put nowhere would be invisible in the artifact, and an
 * invisible document is how a corpus quietly loses the case that discriminates
 * two readers.
 */

import {
  FATAL_CODES,
  getAllSegmentValues,
  getSegmentValue,
  parseX12,
  X12_TR3_CONFORMANCE,
  X12ParseError,
  type Delimiters,
  type X12FatalCode,
  type X12Segment,
  type X12Tr3Conformance,
} from "../../src/index.js";

/** The interchange control version number the comparison is scoped to. */
export const INTERCHANGE_CONTROL_VERSION = "00501";

/** One `(vriic, fic)` binding from the oracle's own map index. */
export interface OracleBinding {
  readonly icvn: string;
  readonly vriic: string;
  readonly fic: string;
  readonly tspc: string | null;
  readonly mapFile: string;
  readonly mapTransactionId: string | null;
  readonly mapTitle: string | null;
}

/** What the oracle says about itself, read from the oracle rather than assumed. */
export interface OracleDescription {
  readonly package: string;
  readonly version: string;
  readonly licence: string;
  readonly licenceClassifier: string | null;
  readonly mapIndex: string;
  readonly interchangeControlVersion: string;
  readonly bindings: readonly OracleBinding[];
}

/** The delimiter set the oracle detected for one document. */
export interface OracleDelimiters {
  readonly element: string;
  readonly component: string;
  readonly repetition: string;
  readonly segment: string;
}

/** One segment as the oracle framed it: the id, then each element's text. */
export interface OracleSegment {
  readonly id: string;
  readonly elements: readonly string[];
}

/** The oracle's reading of one document, or its refusal of it. */
export type OracleRead =
  | {
      readonly ok: true;
      readonly delimiters: OracleDelimiters;
      readonly segments: readonly OracleSegment[];
    }
  | { readonly ok: false; readonly refusal: { readonly kind: string; readonly detail: string } };

/** One document of the corpus. `id` is what a divergence record names. */
export interface CorpusDocument {
  readonly id: string;
  readonly text: string;
}

/**
 * The oracle, as the harness sees it. Both calls may throw
 * {@link OracleUnavailableError}; nothing else about the transport is visible
 * here.
 */
export interface DifferentialOracle {
  describe(): Promise<OracleDescription>;
  read(document: CorpusDocument): Promise<OracleRead>;
}

/**
 * The oracle could not be invoked at all. Distinct from a refusal, which is the
 * oracle answering that it will not read one document.
 */
export class OracleUnavailableError extends Error {
  readonly oracle: string;
  readonly invocation: string;

  constructor(oracle: string, invocation: string, detail: string) {
    super(`oracle ${oracle} could not be invoked: ${invocation}\n${detail}`);
    this.name = "OracleUnavailableError";
    this.oracle = oracle;
    this.invocation = invocation;
  }
}

/** Where a disagreement sits: a segment ordinal, its id, and an element path. */
export interface ElementPosition {
  readonly segmentOrdinal: number;
  readonly segment: string;
  readonly path: string;
}

/** What the two readers disagreed about. */
export type DivergenceKind = "segment-count" | "segment-id" | "element-count" | "element-value";

/** One disagreement, with both readings left exactly as each reader gave them. */
export interface Divergence {
  readonly kind: DivergenceKind;
  readonly document: string;
  readonly transaction: string;
  readonly variant: string | null;
  readonly position: ElementPosition | null;
  readonly library: string | null;
  readonly oracle: string | null;
}

/** A document neither counted as agreement nor as disagreement, and why. */
export interface Unevaluated {
  readonly document: string;
  readonly transaction: string | null;
  readonly variant: string | null;
  readonly refusedBy: "library" | "oracle";
  readonly reason: string;
}

/**
 * A corpus document the run looked at and did not compare, with what its own
 * identifiers said it was. Every document handed to the run lands in exactly one
 * of `compared`, `unevaluated` and `skipped`, so a document the corpus never
 * reached and one the run dropped are different things a reader can tell apart.
 */
export interface SkippedDocument {
  readonly document: string;
  /** The read-scope keys the document's own GS-08 and ST-01 resolve to. */
  readonly assigned: readonly string[];
  readonly reason: string;
}

/** One transaction and variant the run put through both readers. */
export interface ComparedEntry {
  readonly transaction: string;
  readonly variant: string | null;
  readonly title: string;
  readonly libraryTr3: string | null;
  readonly oracleTr3: string;
  readonly oracleFunctionalIdentifierCode: string;
  readonly oracleMapFile: string;
  readonly oracleMapTransactionId: string | null;
  readonly oracleMapTitle: string | null;
  readonly tr3RevisionDiffers: boolean;
  readonly documents: number;
  readonly documentIds: readonly string[];
  readonly elementPositions: number;
  readonly divergences: readonly Divergence[];
}

/** One transaction and variant the oracle has no map for, with the reason. */
export interface UncoveredEntry {
  readonly transaction: string;
  readonly variant: string | null;
  readonly title: string;
  readonly libraryTr3: string | null;
  readonly reason: string;
}

/** The committed artifact. */
export interface DifferentialReport {
  readonly schemaVersion: 1;
  readonly library: {
    readonly package: string;
    readonly commit: string;
    readonly workingTreeDirty: boolean;
  };
  readonly oracle: {
    readonly package: string;
    readonly version: string;
    readonly licence: string;
    readonly licenceClassifier: string | null;
    readonly mapIndex: string;
    readonly interchangeControlVersion: string;
  };
  readonly compared: readonly ComparedEntry[];
  readonly uncovered: readonly UncoveredEntry[];
  readonly unevaluated: readonly Unevaluated[];
  readonly skipped: readonly SkippedDocument[];
}

/** The outcome of one run: what to write, and every reason it failed. */
export interface DifferentialRun {
  readonly report: DifferentialReport;
  readonly failures: readonly string[];
}

/** A read-scope row paired with the oracle binding that covers it. */
interface CoveredTarget {
  readonly row: X12Tr3Conformance;
  readonly binding: OracleBinding;
}

/** The read scope, split into what the oracle maps and what it does not. */
export interface ScopePartition {
  readonly covered: readonly CoveredTarget[];
  readonly uncovered: readonly UncoveredEntry[];
}

/** The rows this library decodes: the set AC-2 and AC-9 are written against. */
export function readScope(): readonly X12Tr3Conformance[] {
  return X12_TR3_CONFORMANCE.filter((row) => row.directions.includes("read"));
}

/** The stable key for one read-scope row. */
export function scopeKey(row: { transaction: string; variant: string | null }): string {
  return `${row.transaction}/${row.variant ?? ""}`;
}

/**
 * Strip a published errata suffix from an implementation guide identifier, so
 * `005010X222A2` and `005010X222A1` are recognisably two revisions of one
 * document rather than two unrelated identifiers. AC-3 exists because that
 * difference must stay visible, so the full identifiers are carried alongside
 * and never replaced by this.
 */
export function tr3Base(identifier: string): string {
  return identifier.replace(/(?:A|E)\d+$/u, "");
}

/**
 * Partition the read scope against the oracle's own map index. A row is covered
 * when the index binds a map to the same implementation guide, revision suffix
 * aside; every other row is named as uncovered with the reason.
 */
export function partitionScope(description: OracleDescription): ScopePartition {
  const bindings = description.bindings.filter(
    (b) => b.icvn === description.interchangeControlVersion && b.vriic !== "",
  );
  const covered: CoveredTarget[] = [];
  const uncovered: UncoveredEntry[] = [];
  for (const row of readScope()) {
    const shared = { transaction: row.transaction, variant: row.variant, title: row.title };
    if (row.tr3 === null) {
      uncovered.push({
        ...shared,
        libraryTr3: null,
        reason:
          `This package implements no implementation guide identifier for ${row.title}, so ` +
          `${description.package}'s map index has no version or release identifier to bind a map to.`,
      });
      continue;
    }
    const base = tr3Base(row.tr3);
    const candidates = bindings.filter((b) => tr3Base(b.vriic) === base);
    const binding = candidates.find((b) => b.vriic === row.tr3) ?? candidates[0];
    if (binding === undefined) {
      uncovered.push({
        ...shared,
        libraryTr3: row.tr3,
        reason:
          `${description.package} ${description.version} binds no map in ${description.mapIndex} at ` +
          `interchange control version ${description.interchangeControlVersion} for implementation ` +
          `guide ${base}.`,
      });
      continue;
    }
    covered.push({ row, binding });
  }
  return { covered, uncovered };
}

/** A segment of the document as this library published it, with its role. */
interface LibrarySegment {
  readonly id: string;
  readonly elements: readonly string[];
  /** Envelope segments are compared at element depth; see {@link comparePair}. */
  readonly envelope: boolean;
  readonly decoded: X12Segment | null;
}

/**
 * The document's segments in the order this library placed them, each carrying
 * exactly the element split this library publishes for it. The envelope
 * segments publish RAW element text and the body publishes decoded segments,
 * and that asymmetry is this library's, not an artefact of the harness.
 */
function librarySegments(text: string): {
  segments: readonly LibrarySegment[];
  delimiters: Delimiters;
} {
  const ix = parseX12(text);
  const segments: LibrarySegment[] = [];
  const envelope = (id: string, elements: readonly string[]): LibrarySegment => ({
    id,
    elements,
    envelope: true,
    decoded: null,
  });
  segments.push(envelope("ISA", ix.isa.elements));
  for (const ta1 of ix.ta1Segments) segments.push(envelope("TA1", ta1.elements));
  for (const group of ix.groups) {
    segments.push(envelope("GS", group.gs.elements));
    for (const tx of group.transactions) {
      for (const seg of tx.segments) {
        segments.push({ id: seg.id, elements: seg.elements, envelope: false, decoded: seg });
      }
    }
    if (group.ge !== undefined) segments.push(envelope("GE", group.ge.elements));
  }
  if (ix.iea !== undefined) segments.push(envelope("IEA", ix.iea.elements));
  return { segments, delimiters: ix.delimiters };
}

/** Which conformance row a document's own GS and ST say it belongs to. */
function assignedKeys(text: string): Set<string> {
  const ix = parseX12(text);
  const keys = new Set<string>();
  for (const group of ix.groups) {
    const vriic = group.gs.elements[8];
    if (vriic === undefined || vriic === "") continue;
    for (const tx of group.transactions) {
      const setId = tx.st.elements[1];
      if (setId === undefined || setId === "") continue;
      for (const row of readScope()) {
        if (row.tr3 === null) continue;
        if (row.transaction !== setId) continue;
        if (tr3Base(row.tr3) !== tr3Base(vriic)) continue;
        keys.add(scopeKey(row));
      }
    }
  }
  return keys;
}

/** A leaf reading: the deepest value each reader publishes at one position. */
interface Leaf {
  readonly path: string;
  readonly value: string | null;
}

/** Split one element's text into repetitions, then each into components. */
function oracleLeaves(elementText: string, delimiters: OracleDelimiters, deep: boolean): Leaf[] {
  const index = (n: number): string => String(n).padStart(2, "0");
  if (!deep) return [{ path: "", value: elementText }];
  const repetitions =
    delimiters.repetition.length === 1 ? elementText.split(delimiters.repetition) : [elementText];
  const leaves: Leaf[] = [];
  repetitions.forEach((repetition, r) => {
    const marker = repetitions.length > 1 ? `[${String(r)}]` : "";
    const components =
      delimiters.component.length === 1 ? repetition.split(delimiters.component) : [repetition];
    if (components.length <= 1) {
      leaves.push({ path: marker, value: repetition });
      return;
    }
    components.forEach((component, c) => {
      leaves.push({ path: `${marker}-${index(c + 1)}`, value: component });
    });
  });
  return leaves;
}

/**
 * The same leaves as this library publishes them, through the same public
 * accessors a consumer would use: every repetition, then each component.
 */
function libraryLeaves(
  segment: LibrarySegment,
  elementIndex: number,
  delimiters: Delimiters,
  deep: boolean,
): Leaf[] {
  const index = (n: number): string => String(n).padStart(2, "0");
  const raw = segment.elements[elementIndex];
  if (!deep || segment.decoded === null) {
    return [{ path: "", value: raw ?? null }];
  }
  const decoded = segment.decoded;
  const element = index(elementIndex);
  const repetitions = getAllSegmentValues(decoded, element, delimiters);
  const leaves: Leaf[] = [];
  repetitions.forEach((_repetition, r) => {
    const marker = repetitions.length > 1 ? `[${String(r)}]` : "";
    const address = `${element}[${String(r)}]`;
    const components: string[] = [];
    for (let c = 1; ; c += 1) {
      const value = getSegmentValue(decoded, `${address}-${index(c)}`, delimiters);
      if (value === undefined) break;
      components.push(value);
    }
    if (components.length <= 1) {
      leaves.push({ path: marker, value: getSegmentValue(decoded, address, delimiters) ?? null });
      return;
    }
    components.forEach((component, c) => {
      leaves.push({ path: `${marker}-${index(c + 1)}`, value: component });
    });
  });
  return leaves;
}

/** One document's comparison outcome. */
interface PairResult {
  readonly elementPositions: number;
  readonly divergences: readonly Divergence[];
}

/**
 * Walk the two segment streams side by side. Neither reading is normalised,
 * trimmed or coerced on the way into a divergence record: the whole point of
 * the artifact is that a reader can see what each side actually returned.
 */
function comparePair(
  document: CorpusDocument,
  row: X12Tr3Conformance,
  library: { segments: readonly LibrarySegment[]; delimiters: Delimiters },
  oracle: { segments: readonly OracleSegment[]; delimiters: OracleDelimiters },
): PairResult {
  const divergences: Divergence[] = [];
  const shared = {
    document: document.id,
    transaction: row.transaction,
    variant: row.variant,
  };
  const count = Math.min(library.segments.length, oracle.segments.length);
  if (library.segments.length !== oracle.segments.length) {
    divergences.push({
      ...shared,
      kind: "segment-count",
      position: null,
      library: String(library.segments.length),
      oracle: String(oracle.segments.length),
    });
  }
  let positions = 0;
  for (let s = 0; s < count; s += 1) {
    const lib = library.segments[s];
    const orc = oracle.segments[s];
    if (lib === undefined || orc === undefined) break;
    const at = (path: string): ElementPosition => ({
      segmentOrdinal: s,
      segment: lib.id,
      path,
    });
    if (lib.id !== orc.id) {
      divergences.push({
        ...shared,
        kind: "segment-id",
        position: at(""),
        library: lib.id,
        oracle: orc.id,
      });
      // The streams have drifted apart; every later position would compare two
      // unrelated segments and report noise.
      break;
    }
    // This library keeps the segment id at index 0 of its element list; the
    // oracle keeps it apart. Compare the elements after the id on both.
    const libCount = Math.max(lib.elements.length - 1, 0);
    const orcCount = orc.elements.length;
    if (libCount !== orcCount) {
      divergences.push({
        ...shared,
        kind: "element-count",
        position: at(""),
        library: String(libCount),
        oracle: String(orcCount),
      });
    }
    const deep = !lib.envelope;
    for (let e = 1; e <= Math.min(libCount, orcCount); e += 1) {
      const libLeaves = libraryLeaves(lib, e, library.delimiters, deep);
      const orcLeaves = oracleLeaves(orc.elements[e - 1] ?? "", oracle.delimiters, deep);
      const element = String(e).padStart(2, "0");
      const leaves = Math.max(libLeaves.length, orcLeaves.length);
      for (let l = 0; l < leaves; l += 1) {
        const libLeaf = libLeaves[l];
        const orcLeaf = orcLeaves[l];
        const path = `${element}${libLeaf?.path ?? orcLeaf?.path ?? ""}`;
        positions += 1;
        if (libLeaf?.value === orcLeaf?.value) continue;
        divergences.push({
          ...shared,
          kind: "element-value",
          position: at(path),
          library: libLeaf?.value ?? null,
          oracle: orcLeaf?.value ?? null,
        });
      }
    }
  }
  return { elementPositions: positions, divergences };
}

/** The four Tier-3 codes are the whole of this library's refusal surface. */
function fatalCode(error: unknown): X12FatalCode | null {
  if (!(error instanceof X12ParseError)) return null;
  return Object.values(FATAL_CODES).includes(error.code) ? error.code : null;
}

/** What the run needs about the library itself, supplied by the caller. */
export interface LibraryProvenance {
  readonly package: string;
  readonly commit: string;
  readonly workingTreeDirty: boolean;
}

/** Everything the harness needs for one run. */
export interface DifferentialInput {
  readonly oracle: DifferentialOracle;
  readonly corpus: readonly CorpusDocument[];
  readonly library: LibraryProvenance;
}

/**
 * Run the comparison. Throws {@link OracleUnavailableError} before any report
 * exists when the oracle cannot be invoked; otherwise always returns a report,
 * with every reason the run failed listed beside it.
 */
export async function runDifferential(input: DifferentialInput): Promise<DifferentialRun> {
  const description = await input.oracle.describe();
  const { covered, uncovered } = partitionScope(description);
  const byKey = new Map(covered.map((target) => [scopeKey(target.row), target]));

  const documents = new Map<string, string[]>();
  const positions = new Map<string, number>();
  const divergences = new Map<string, Divergence[]>();
  for (const key of byKey.keys()) {
    documents.set(key, []);
    positions.set(key, 0);
    divergences.set(key, []);
  }
  const unevaluated: Unevaluated[] = [];
  const skipped: SkippedDocument[] = [];

  for (const document of input.corpus) {
    let assigned: Set<string>;
    let library: { segments: readonly LibrarySegment[]; delimiters: Delimiters };
    try {
      assigned = assignedKeys(document.text);
      library = librarySegments(document.text);
    } catch (error) {
      const code = fatalCode(error);
      if (code === null) throw error;
      unevaluated.push({
        document: document.id,
        transaction: null,
        variant: null,
        refusedBy: "library",
        reason: code,
      });
      continue;
    }
    // A document reaches the comparison only when its own identifiers name
    // exactly one transaction the oracle maps. Everything else is recorded
    // rather than dropped: a document the run considered and did not compare is
    // not a document the corpus never held.
    const targets = [...assigned].filter((key) => byKey.has(key));
    const target = targets.length === 1 ? byKey.get(targets[0] ?? "") : undefined;
    if (target === undefined) {
      skipped.push({
        document: document.id,
        assigned: [...assigned].sort(),
        reason:
          targets.length === 0
            ? `This document's own GS-08 and ST-01 name no transaction ${description.package} maps at interchange control version ${description.interchangeControlVersion}.`
            : `This document's own GS-08 and ST-01 name ${String(targets.length)} transactions ${description.package} maps, so it belongs to no single comparison.`,
      });
      continue;
    }
    const key = scopeKey(target.row);

    const read = await input.oracle.read(document);
    if (!read.ok) {
      unevaluated.push({
        document: document.id,
        transaction: target.row.transaction,
        variant: target.row.variant,
        refusedBy: "oracle",
        reason: `${read.refusal.kind}: ${read.refusal.detail}`,
      });
      continue;
    }
    const pair = comparePair(document, target.row, library, read);
    documents.get(key)?.push(document.id);
    positions.set(key, (positions.get(key) ?? 0) + pair.elementPositions);
    divergences.get(key)?.push(...pair.divergences);
  }

  const compared: ComparedEntry[] = covered.map((target) => {
    const key = scopeKey(target.row);
    const ids = documents.get(key) ?? [];
    return {
      transaction: target.row.transaction,
      variant: target.row.variant,
      title: target.row.title,
      libraryTr3: target.row.tr3,
      oracleTr3: target.binding.vriic,
      oracleFunctionalIdentifierCode: target.binding.fic,
      oracleMapFile: target.binding.mapFile,
      oracleMapTransactionId: target.binding.mapTransactionId,
      oracleMapTitle: target.binding.mapTitle,
      tr3RevisionDiffers: target.row.tr3 !== target.binding.vriic,
      documents: ids.length,
      documentIds: ids,
      elementPositions: positions.get(key) ?? 0,
      divergences: divergences.get(key) ?? [],
    };
  });

  const failures: string[] = [];
  for (const entry of compared) {
    const name = `${entry.transaction}${entry.variant === null ? "" : ` ${entry.variant}`}`;
    if (entry.documents === 0) {
      failures.push(`${name}: no document reached both readers, which is not agreement.`);
    } else if (entry.elementPositions === 0) {
      failures.push(`${name}: no element position reached both readers, which is not agreement.`);
    }
    for (const divergence of entry.divergences) {
      const where =
        divergence.position === null
          ? "whole document"
          : `${divergence.position.segment}[${String(divergence.position.segmentOrdinal)}] ` +
            `element ${divergence.position.path}`;
      failures.push(
        `${name}: ${divergence.kind} in ${divergence.document} at ${where}: ` +
          `this library read ${JSON.stringify(divergence.library)}, ` +
          `${description.package} read ${JSON.stringify(divergence.oracle)}.`,
      );
    }
  }

  return {
    report: {
      schemaVersion: 1,
      library: input.library,
      oracle: {
        package: description.package,
        version: description.version,
        licence: description.licence,
        licenceClassifier: description.licenceClassifier,
        mapIndex: description.mapIndex,
        interchangeControlVersion: description.interchangeControlVersion,
      },
      compared,
      uncovered,
      unevaluated,
      skipped,
    },
    failures,
  };
}

/**
 * The committed differential report, read against this library's own
 * conformance declaration at head.
 *
 * `report.json` is the artifact a consumer reads, so these tests grade IT and
 * not a live oracle: the covered and uncovered lists have to still describe this
 * library's read scope, and every compared entry has to carry enough for a
 * reader to tell agreement from an empty comparison.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";

import { describe, expect, it } from "vitest";

import {
  partitionScope,
  readScope,
  runDifferential,
  scopeKey,
  type ComparedEntry,
  type DifferentialOracle,
  type DifferentialReport,
  type OracleBinding,
  type OracleDescription,
  type ReportOracle,
} from "../../scripts/differential/harness.js";
import { X12_TR3_CONFORMANCE } from "../../src/index.js";

const REPORT: DifferentialReport = JSON.parse(
  readFileSync(join(process.cwd(), "test", "differential", "report.json"), "utf8"),
) as DifferentialReport;

const COMPARED_KEYS = REPORT.compared.map((entry) => scopeKey(entry));
const UNCOVERED_KEYS = REPORT.uncovered.map((entry) => scopeKey(entry));

/** The kinds a divergence record may carry, as the harness declares them. */
const DIVERGENCE_KINDS = ["segment-count", "segment-id", "element-count", "element-value"];

/** The first oracle, and the one the second oracle joins. */
const PYX12 = "pyx12";
const SECOND = "linuxforhealth-x12";

function oracleNamed(name: string): ReportOracle | undefined {
  return REPORT.oracles.find((oracle) => oracle.package === name);
}

/**
 * Every synthetic document under the fixture root, enumerated independently of
 * the harness's own walk so the two can disagree.
 */
function fixtureDocuments(): readonly string[] {
  const root = join(process.cwd(), "test", "fixtures");
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".edi"))
    .map((entry) => `test/fixtures/${entry.split(sep).join("/")}`)
    .sort();
}

/** The binding a compared entry records, as the oracle's own index held it. */
function bindingOf(entry: ComparedEntry, oracle: ReportOracle): OracleBinding {
  return {
    icvn: oracle.interchangeControlVersion,
    vriic: entry.oracleTr3,
    transactionSet: entry.oracleTransactionSet,
    fic: entry.oracleFunctionalIdentifierCode,
    tspc: null,
    model: entry.oracleModel,
    modelId: entry.oracleModelId,
    modelTitle: entry.oracleModelTitle,
  };
}

/**
 * Re-derive every oracle's description from the committed report alone: the
 * oracles it names, each holding the bindings its compared entries record,
 * less any `withdrawn` from the named oracle.
 */
function descriptionsFromReport(
  withdraw: { oracle: string; key: string } | null = null,
): OracleDescription[] {
  return REPORT.oracles.map((oracle) => ({
    ...oracle,
    bindings: REPORT.compared
      .filter((entry) => entry.oracle === oracle.package)
      .filter((entry) => !(withdraw?.oracle === oracle.package && scopeKey(entry) === withdraw.key))
      .map((entry) => bindingOf(entry, oracle)),
  }));
}

describe("differential report", () => {
  it("AC-9: covered plus uncovered still equals the read scope at head", () => {
    // The staleness gate. Add a transaction to `X12_TR3_CONFORMANCE` without
    // regenerating the report and this is what reds.
    const derived = X12_TR3_CONFORMANCE.filter((row) => row.directions.includes("read"))
      .map((row) => scopeKey(row))
      .sort();
    expect([...COMPARED_KEYS, ...UNCOVERED_KEYS].sort()).toEqual(derived);
  });

  it("AC-2: the two lists are disjoint and every uncovered entry states a reason", () => {
    expect(COMPARED_KEYS.length).toBeGreaterThan(0);
    expect(UNCOVERED_KEYS.length).toBeGreaterThan(0);
    const overlap = COMPARED_KEYS.filter((key) => UNCOVERED_KEYS.includes(key));
    expect(overlap).toEqual([]);
    expect(new Set(COMPARED_KEYS).size).toBe(COMPARED_KEYS.length);
    expect(new Set(UNCOVERED_KEYS).size).toBe(UNCOVERED_KEYS.length);
    for (const entry of REPORT.uncovered) {
      expect(entry.reason.length).toBeGreaterThan(0);
      for (const oracle of REPORT.oracles) expect(entry.reason).toContain(oracle.package);
    }
  });

  it("AC-2: every compared entry counts the documents and positions it compared", () => {
    for (const entry of REPORT.compared) {
      expect(entry.documents).toBeGreaterThan(0);
      expect(entry.documents).toBe(entry.documentIds.length);
      expect(entry.elementPositions).toBeGreaterThan(0);
    }
  });

  it("AC-2: the committed report accounts for every synthetic document in the tree", () => {
    // The corpus is the whole fixture tree and no directory is held out of it,
    // so every `.edi` this repository ships is in exactly one of the three
    // lists. A document quietly outside the run would leave no trace here, and
    // the awkward documents are the ones most likely to separate two readers.
    const accounted = [
      ...REPORT.compared.flatMap((entry) => entry.documentIds),
      ...REPORT.unevaluated.map((entry) => entry.document),
      ...REPORT.skipped.map((entry) => entry.document),
    ].sort();
    const fixtures = fixtureDocuments();
    expect(fixtures.length).toBeGreaterThan(0);
    expect(accounted).toEqual(fixtures);
    for (const entry of REPORT.skipped) {
      expect(entry.reason.length).toBeGreaterThan(0);
    }
  });

  it("AC-4: every divergence the committed report records keeps both readings", () => {
    for (const entry of REPORT.compared) {
      for (const divergence of entry.divergences) {
        expect(entry.documentIds).toContain(divergence.document);
        expect(DIVERGENCE_KINDS).toContain(divergence.kind);
        expect(divergence.transaction).toBe(entry.transaction);
        expect(divergence.variant).toBe(entry.variant);
        expect(divergence.otherReader).toBe(entry.oracle);
        if (divergence.kind !== "segment-count") {
          expect(divergence.position?.segment.length ?? 0).toBeGreaterThan(0);
        }
        // Neither side is dropped, and a record of two identical readings would
        // not be a disagreement at all.
        expect([divergence.library, divergence.oracle]).not.toEqual([null, null]);
        expect(divergence.library).not.toBe(divergence.oracle);
      }
    }
  });

  it("AC-2: an entry that compared nothing fails the run instead of reading as agreement", async () => {
    const description: OracleDescription = {
      package: "oracle-double",
      version: "0.0.0",
      licence: "BSD",
      licenceClassifier: null,
      bindingKind: "map",
      bindingSource: "maps.xml",
      interchangeControlVersion: "00501",
      python: null,
      companions: [],
      bindings: [
        {
          icvn: "00501",
          vriic: "005010X221A1",
          transactionSet: null,
          fic: "HP",
          tspc: null,
          model: "835.5010.X221.A1.xml",
          modelId: "835W1",
          modelTitle: "HIPAA Health Care Claim Payment/Advice 005010X221A1 835W1",
        },
      ],
    };
    const oracle: DifferentialOracle = {
      describe: () => Promise.resolve(description),
      read: () => Promise.reject(new Error("unreachable: the corpus is empty")),
    };
    const run = await runDifferential({
      oracles: [oracle],
      corpus: [],
      library: { package: "@cosyte/x12", commit: "0".repeat(40), workingTreeDirty: false },
    });
    const entry = run.report.compared.find((e) => e.transaction === "835");
    expect(entry?.documents).toBe(0);
    expect(entry?.elementPositions).toBe(0);
    expect(run.failures).toEqual([
      "835: no document reached both readers, which is not agreement.",
    ]);
  });

  it("AC-3: the report names the oracle, its version, its licence and this library's commit", () => {
    const first = REPORT.oracles[0];
    expect(first?.package.length).toBeGreaterThan(0);
    expect(first?.version).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(first?.licence.length).toBeGreaterThan(0);
    expect(first?.bindingSource.length).toBeGreaterThan(0);
    expect(first?.interchangeControlVersion).toBe("00501");
    expect(REPORT.library.package).toBe("@cosyte/x12");
    expect(REPORT.library.commit).toMatch(/^[0-9a-f]{40}$/u);
    expect(typeof REPORT.library.workingTreeDirty).toBe("boolean");
  });

  it("AC-3: every compared entry carries both TR3 identifiers and flags a revision difference", () => {
    for (const entry of REPORT.compared) {
      const row = readScope().find((r) => scopeKey(r) === scopeKey(entry));
      expect(entry.libraryTr3).toBe(row?.tr3 ?? null);
      expect(entry.oracleTr3.length).toBeGreaterThan(0);
      expect(entry.oracleModel.length).toBeGreaterThan(0);
      expect(entry.tr3RevisionDiffers).toBe(entry.libraryTr3 !== entry.oracleTr3);
    }
    // The oracle maps an earlier errata of the professional claim than this
    // library implements, and the report has to show that rather than imply it.
    const professional = REPORT.compared.find(
      (entry) => entry.transaction === "837" && entry.variant === "P",
    );
    expect(professional?.tr3RevisionDiffers).toBe(true);
    expect(professional?.libraryTr3).not.toBe(professional?.oracleTr3);
  });

  it("AC-2: the partition is derived from the oracle's index, not from a stored list", () => {
    // Re-derive the split from the same index the committed run used, with the
    // oracle's 005010X221A1 binding withdrawn: the 835 has to move lists.
    const partition = partitionScope(descriptionsFromReport({ oracle: PYX12, key: "835/" }));
    expect(partition.covered.map((target) => scopeKey(target.row))).not.toContain("835/");
    expect(partition.uncovered.map((entry) => scopeKey(entry))).toContain("835/");
    expect(partition.covered.length + partition.uncovered.length).toBe(readScope().length);
  });
});

describe("differential report, second oracle", () => {
  const SECOND_ROWS = ["270/", "271/", "276/", "277/"];

  it("S0382 AC-1: the 270, 271, 276 and 277 claim status rows are compared against the second oracle", () => {
    for (const key of SECOND_ROWS) {
      const entry = REPORT.compared.find((e) => scopeKey(e) === key);
      expect(entry?.oracle, key).toBe(SECOND);
      expect(entry?.documents ?? 0, key).toBeGreaterThan(0);
      expect(entry?.elementPositions ?? 0, key).toBeGreaterThan(0);
      expect(UNCOVERED_KEYS, key).not.toContain(key);
    }
    // The 277 compared here is the claim status response, not the acknowledgment.
    expect(REPORT.compared.find((e) => scopeKey(e) === "277/")?.oracleTr3).toBe("005010X212");
  });

  it("S0382 AC-2: the report records both oracles, the second with its licence, interpreter and every companion pin", () => {
    expect(REPORT.oracles.map((oracle) => oracle.package)).toEqual([PYX12, SECOND]);
    const first = oracleNamed(PYX12);
    expect(first?.version).toBe("4.0.0");
    expect(first?.licence).toBe("BSD");
    const second = oracleNamed(SECOND);
    expect(second?.version).toBe("0.57.0");
    // As the installed distribution declares it: `License: Apache 2.0`.
    expect(second?.licence).toBe("Apache 2.0");
    expect(second?.python).toMatch(/^3\.11\.\d+$/u);
    const pydantic = second?.companions.find((companion) => companion.package === "pydantic");
    expect(pydantic?.version).toMatch(/^1\.\d+\.\d+$/u);
    for (const companion of second?.companions ?? []) {
      expect(companion.version, companion.package).toMatch(/^\d+(\.\d+)+$/u);
    }
  });

  it("S0382 AC-2: the report carries each oracle's name, version, licence and companions as the oracle described them", async () => {
    // Nothing in the harness names an oracle: whatever the running oracles say
    // about themselves is what the report says about them.
    const described = (name: string): OracleDescription => ({
      package: name,
      version: "9.8.7",
      licence: `declared by ${name}`,
      licenceClassifier: null,
      bindingKind: "model",
      bindingSource: `${name}.models`,
      interchangeControlVersion: "00501",
      python: "3.11.99",
      companions: [{ package: `${name}-companion`, version: "1.2.3" }],
      bindings: [],
    });
    const oracles = ["reader-a", "reader-b"].map(
      (name): DifferentialOracle => ({
        describe: () => Promise.resolve(described(name)),
        read: () => Promise.reject(new Error("unreachable: the corpus is empty")),
      }),
    );
    const run = await runDifferential({
      oracles,
      corpus: [],
      library: { package: "@cosyte/x12", commit: "0".repeat(40), workingTreeDirty: false },
    });
    expect(run.report.oracles).toEqual(
      ["reader-a", "reader-b"].map((name): ReportOracle => {
        const d = described(name);
        return {
          package: d.package,
          version: d.version,
          licence: d.licence,
          licenceClassifier: d.licenceClassifier,
          bindingKind: d.bindingKind,
          bindingSource: d.bindingSource,
          interchangeControlVersion: d.interchangeControlVersion,
          python: d.python,
          companions: d.companions,
        };
      }),
    );
  });

  it("S0382 AC-3: every row is listed once, and each compared entry names one reporting oracle, its guide and its model", () => {
    const all = [...COMPARED_KEYS, ...UNCOVERED_KEYS];
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(
      readScope()
        .map((row) => scopeKey(row))
        .sort(),
    );
    const named = REPORT.oracles.map((oracle) => oracle.package);
    for (const entry of REPORT.compared) {
      expect(named.filter((name) => name === entry.oracle)).toHaveLength(1);
      expect(entry.oracleTr3.length).toBeGreaterThan(0);
      expect(entry.oracleModel.length).toBeGreaterThan(0);
    }
  });

  it("S0382 AC-3: a row both oracles bind is compared against the first and only the first", () => {
    // The committed run's own indexes, with the second oracle also binding
    // every row the first compares: nothing moves off the first oracle.
    const descriptions = descriptionsFromReport();
    const [first, second] = descriptions;
    if (first === undefined || second === undefined) throw new Error("two oracles expected");
    const both = [first, { ...second, bindings: [...second.bindings, ...first.bindings] }];
    const partition = partitionScope(both);
    for (const target of partition.covered) {
      const committed = REPORT.compared.find((e) => scopeKey(e) === scopeKey(target.row));
      expect(both[target.oracle]?.package, scopeKey(target.row)).toBe(committed?.oracle);
    }
    // And with the first oracle withdrawn from a row, the second takes it.
    const without = partitionScope([{ ...first, bindings: [] }, both[1] ?? second]);
    const remittance = without.covered.find((target) => scopeKey(target.row) === "835/");
    expect(remittance?.oracle).toBe(1);
  });

  it("S0382 AC-3: withdrawing one of the second oracle's bindings moves its row to the uncovered list", () => {
    for (const key of SECOND_ROWS) {
      const partition = partitionScope(descriptionsFromReport({ oracle: SECOND, key }));
      expect(
        partition.covered.map((target) => scopeKey(target.row)),
        key,
      ).not.toContain(key);
      const uncovered = partition.uncovered.find((entry) => scopeKey(entry) === key);
      expect(uncovered?.reason, key).toContain(SECOND);
      expect(partition.covered.length + partition.uncovered.length).toBe(readScope().length);
    }
  });

  it("S0382 AC-4: a row neither oracle maps is uncovered with a reason naming each oracle and its exact version", () => {
    expect(UNCOVERED_KEYS.sort()).toEqual(
      ["275/", "277/RFAI", "278/request", "278/response", "837/D", "TA1/"].sort(),
    );
    for (const entry of REPORT.uncovered) {
      for (const oracle of REPORT.oracles) {
        expect(entry.reason, scopeKey(entry)).toContain(`${oracle.package} ${oracle.version}`);
      }
    }
  });

  it("S0382 AC-10: exactly the rows pyx12 compared before the second oracle stay attributed to pyx12 4.0.0", () => {
    expect(oracleNamed(PYX12)?.version).toBe("4.0.0");
    expect(
      REPORT.compared
        .filter((entry) => entry.oracle === PYX12)
        .map((entry) => scopeKey(entry))
        .sort(),
    ).toEqual(["277/277CA", "820/", "834/", "835/", "837/I", "837/P", "999/"].sort());
  });
});

/**
 * The committed differential report, read against this library's own
 * conformance declaration at head.
 *
 * `report.json` is the artifact a consumer reads, so these tests grade IT and
 * not a live oracle: the covered and uncovered lists have to still describe this
 * library's read scope, and every compared entry has to carry enough for a
 * reader to tell agreement from an empty comparison.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  partitionScope,
  readScope,
  runDifferential,
  scopeKey,
  type DifferentialOracle,
  type DifferentialReport,
  type OracleDescription,
} from "../../scripts/differential/harness.js";
import { X12_TR3_CONFORMANCE } from "../../src/index.js";

const REPORT: DifferentialReport = JSON.parse(
  readFileSync(join(process.cwd(), "test", "differential", "report.json"), "utf8"),
) as DifferentialReport;

const COMPARED_KEYS = REPORT.compared.map((entry) => scopeKey(entry));
const UNCOVERED_KEYS = REPORT.uncovered.map((entry) => scopeKey(entry));

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
      expect(entry.reason).toContain(REPORT.oracle.package);
    }
  });

  it("AC-2: every compared entry counts the documents and positions it compared", () => {
    for (const entry of REPORT.compared) {
      expect(entry.documents).toBeGreaterThan(0);
      expect(entry.documents).toBe(entry.documentIds.length);
      expect(entry.elementPositions).toBeGreaterThan(0);
    }
  });

  it("AC-2: an entry that compared nothing fails the run instead of reading as agreement", async () => {
    const description: OracleDescription = {
      package: "oracle-double",
      version: "0.0.0",
      licence: "BSD",
      licenceClassifier: null,
      mapIndex: "maps.xml",
      interchangeControlVersion: "00501",
      bindings: [
        {
          icvn: "00501",
          vriic: "005010X221A1",
          fic: "HP",
          tspc: null,
          mapFile: "835.5010.X221.A1.xml",
          mapTransactionId: "835W1",
          mapTitle: "HIPAA Health Care Claim Payment/Advice 005010X221A1 835W1",
        },
      ],
    };
    const oracle: DifferentialOracle = {
      describe: () => Promise.resolve(description),
      read: () => Promise.reject(new Error("unreachable: the corpus is empty")),
    };
    const run = await runDifferential({
      oracle,
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
    expect(REPORT.oracle.package.length).toBeGreaterThan(0);
    expect(REPORT.oracle.version).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(REPORT.oracle.licence.length).toBeGreaterThan(0);
    expect(REPORT.oracle.mapIndex.length).toBeGreaterThan(0);
    expect(REPORT.oracle.interchangeControlVersion).toBe("00501");
    expect(REPORT.library.package).toBe("@cosyte/x12");
    expect(REPORT.library.commit).toMatch(/^[0-9a-f]{40}$/u);
    expect(typeof REPORT.library.workingTreeDirty).toBe("boolean");
  });

  it("AC-3: every compared entry carries both TR3 identifiers and flags a revision difference", () => {
    for (const entry of REPORT.compared) {
      const row = readScope().find((r) => scopeKey(r) === scopeKey(entry));
      expect(entry.libraryTr3).toBe(row?.tr3 ?? null);
      expect(entry.oracleTr3.length).toBeGreaterThan(0);
      expect(entry.oracleMapFile.length).toBeGreaterThan(0);
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
    const description: OracleDescription = {
      package: REPORT.oracle.package,
      version: REPORT.oracle.version,
      licence: REPORT.oracle.licence,
      licenceClassifier: REPORT.oracle.licenceClassifier,
      mapIndex: REPORT.oracle.mapIndex,
      interchangeControlVersion: REPORT.oracle.interchangeControlVersion,
      bindings: REPORT.compared
        .filter((entry) => entry.transaction !== "835")
        .map((entry) => ({
          icvn: REPORT.oracle.interchangeControlVersion,
          vriic: entry.oracleTr3,
          fic: entry.oracleFunctionalIdentifierCode,
          tspc: null,
          mapFile: entry.oracleMapFile,
          mapTransactionId: entry.oracleMapTransactionId,
          mapTitle: entry.oracleMapTitle,
        })),
    };
    const partition = partitionScope(description);
    expect(partition.covered.map((target) => scopeKey(target.row))).not.toContain("835/");
    expect(partition.uncovered.map((entry) => scopeKey(entry))).toContain("835/");
    expect(partition.covered.length + partition.uncovered.length).toBe(readScope().length);
  });
});

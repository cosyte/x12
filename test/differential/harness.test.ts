/**
 * Unhappy paths of the differential harness: a divergence, an oracle that
 * cannot be invoked, and a document one of the two readers refuses.
 *
 * The harness runs for real in every case here. What stands in is the ORACLE,
 * which is another process in another language and therefore outside this
 * module's boundary: a double supplies its readings so a disagreement, a
 * refusal and an outage can each be produced on demand. The live comparison
 * against the real oracle is `pnpm run differential`.
 *
 * SECURITY: the one subprocess call here uses spawnSync with array args. No
 * exec, no shell-form.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  OracleUnavailableError,
  runDifferential,
  type CorpusDocument,
  type DifferentialOracle,
  type OracleDescription,
  type OracleRead,
  type OracleSegment,
} from "../../scripts/differential/harness.js";
import {
  INTERPRETER_ENV,
  oracleInvocation,
  parseRequirement,
  pyx12Oracle,
} from "../../scripts/differential/pyx12-oracle.js";

const REPO_ROOT = process.cwd();
const TSX_BIN = join(REPO_ROOT, "node_modules", ".bin", "tsx");
const ENTRY_PATH = join(REPO_ROOT, "scripts", "differential.ts");
const REPORT_PATH = join(REPO_ROOT, "test", "differential", "report.json");
const REQUIREMENT = "pyx12==4.0.0";

const LIBRARY = { package: "@cosyte/x12", commit: "0".repeat(40), workingTreeDirty: false };

/**
 * A minimal synthetic remittance. Every identifier in it is a placeholder
 * already declared in `scripts/phi-allow-list.txt`, and it carries no name,
 * contact or date-of-birth element at all.
 */
const REMITTANCE = [
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260101*1200*^*00501*000000001*0*P*:~",
  "GS*HP*SENDER*RECEIVER*20260101*1200*1*X*005010X221A1~",
  "ST*835*0001~",
  "BPR*I*100.00*C*ACH*CCP*01*111111111*DA*222222222*1512345678**01*111111111*DA*222222222*20260101~",
  "TRN*1*0012345*1512345678~",
  "DTM*405*20260101~",
  "N1*PR*PAYER ONE~",
  "N1*PE*PROVIDER ONE~",
  "CLP*CLAIM1*1*100.00*100.00**12*0012345~",
  "SE*7*0001~",
  "GE*1*1~",
  "IEA*1*000000001~",
].join("");

const DESCRIPTION: OracleDescription = {
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

/** Decompose a document the way an X12 reader would, for the double to return. */
function echoSegments(text: string): OracleSegment[] {
  return text
    .split("~")
    .filter((raw) => raw.length > 0)
    .map((raw) => {
      const [id = "", ...elements] = raw.split("*");
      return { id, elements };
    });
}

function echoRead(text: string): OracleRead {
  return {
    ok: true,
    delimiters: { element: "*", component: ":", repetition: "^", segment: "~" },
    segments: echoSegments(text),
  };
}

/** A double for the oracle process: it answers, or it refuses, on demand. */
function doubleOracle(read: (document: CorpusDocument) => OracleRead): DifferentialOracle {
  return {
    describe: () => Promise.resolve(DESCRIPTION),
    read: (document) => Promise.resolve(read(document)),
  };
}

const CORPUS: CorpusDocument[] = [{ id: "remittance.edi", text: REMITTANCE }];

describe("differential harness", () => {
  it("AC-4: records a divergence with both readings and fails the run", async () => {
    const run = await runDifferential({
      library: LIBRARY,
      corpus: CORPUS,
      oracle: doubleOracle((document) => {
        const read = echoRead(document.text);
        if (!read.ok) return read;
        // Disagree about BPR-02, the payment amount, and about nothing else.
        const segments = read.segments.map((segment) =>
          segment.id === "BPR"
            ? { ...segment, elements: segment.elements.map((e, i) => (i === 1 ? "999.00" : e)) }
            : segment,
        );
        return { ...read, segments };
      }),
    });

    const entry = run.report.compared.find((e) => e.transaction === "835");
    expect(entry?.divergences).toHaveLength(1);
    const divergence = entry?.divergences[0];
    expect(divergence?.kind).toBe("element-value");
    expect(divergence?.document).toBe("remittance.edi");
    expect(divergence?.transaction).toBe("835");
    expect(divergence?.variant).toBeNull();
    expect(divergence?.position).toEqual({ segmentOrdinal: 3, segment: "BPR", path: "02" });
    // Both readings survive verbatim: neither is trimmed, rounded or dropped.
    expect(divergence?.library).toBe("100.00");
    expect(divergence?.oracle).toBe("999.00");
    expect(run.failures.length).toBeGreaterThan(0);
  });

  it("AC-4: reports agreement with no divergence when the two readings match", async () => {
    const run = await runDifferential({
      library: LIBRARY,
      corpus: CORPUS,
      oracle: doubleOracle((document) => echoRead(document.text)),
    });
    const entry = run.report.compared.find((e) => e.transaction === "835");
    expect(entry?.divergences).toEqual([]);
    expect(entry?.documents).toBe(1);
    expect(entry?.elementPositions).toBeGreaterThan(0);
    expect(run.failures).toEqual([]);
  });

  it("AC-5: an oracle that cannot be invoked aborts the run, naming it", async () => {
    const invocation = oracleInvocation(REQUIREMENT, ["describe", "00501"]).join(" ");
    const oracle: DifferentialOracle = {
      describe: () =>
        Promise.reject(new OracleUnavailableError(REQUIREMENT, invocation, "no such file")),
      read: () => Promise.reject(new Error("unreachable")),
    };
    const error = await runDifferential({ library: LIBRARY, corpus: CORPUS, oracle }).then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(OracleUnavailableError);
    expect((error as OracleUnavailableError).oracle).toBe(REQUIREMENT);
    expect((error as OracleUnavailableError).invocation).toBe(invocation);
    expect((error as OracleUnavailableError).message).toContain(REQUIREMENT);
  });

  it("AC-5: the real entry exits non-zero and leaves the report untouched", () => {
    const before = readFileSync(REPORT_PATH, "utf8");
    // SECURITY: array-form spawnSync, no shell.
    const result = spawnSync(TSX_BIN, [ENTRY_PATH, "--oracle", REQUIREMENT], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, [INTERPRETER_ENV]: join(REPO_ROOT, "no-such-interpreter") },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(REQUIREMENT);
    expect(result.stderr).toContain("no-such-interpreter");
    expect(result.stderr).toContain("No report was written");
    expect(readFileSync(REPORT_PATH, "utf8")).toBe(before);
  }, 30_000);

  it("AC-5: a requirement that is not an exact version is refused", () => {
    expect(() => parseRequirement("pyx12")).toThrow(/exact version/u);
    expect(() => parseRequirement("pyx12>=4")).toThrow(/exact version/u);
    expect(parseRequirement(REQUIREMENT)).toEqual({ name: "pyx12", version: "4.0.0" });
    expect(oracleInvocation(REQUIREMENT, ["describe", "00501"]).join(" ")).toContain(REQUIREMENT);
    expect(typeof pyx12Oracle(REQUIREMENT, "00501").describe).toBe("function");
  });

  it("AC-6: a document this library refuses is unevaluated, never agreement", async () => {
    const refused: CorpusDocument[] = [
      { id: "empty.edi", text: "" },
      { id: "no-isa.edi", text: "GS*HP*A*B*20260101*1200*1*X*005010X221A1~" },
      { id: "short-isa.edi", text: "ISA*00*" },
      { id: "bad-delimiters.edi", text: `ISA*00*${" ".repeat(90)}*00*~` },
    ];
    const run = await runDifferential({
      library: LIBRARY,
      corpus: [...CORPUS, ...refused],
      oracle: doubleOracle((document) => echoRead(document.text)),
    });

    expect(run.report.unevaluated.map((u) => u.document).sort()).toEqual([
      "bad-delimiters.edi",
      "empty.edi",
      "no-isa.edi",
      "short-isa.edi",
    ]);
    for (const unevaluated of run.report.unevaluated) {
      expect(unevaluated.refusedBy).toBe("library");
      expect(unevaluated.reason).toMatch(/^X12_/u);
    }
    // The refused documents are counted nowhere else.
    const entry = run.report.compared.find((e) => e.transaction === "835");
    expect(entry?.documents).toBe(1);
    expect(entry?.documentIds).toEqual(["remittance.edi"]);
  });

  it("AC-6: a document the oracle refuses is unevaluated, never agreement", async () => {
    const run = await runDifferential({
      library: LIBRARY,
      corpus: CORPUS,
      oracle: doubleOracle(() => ({
        ok: false,
        refusal: { kind: "X12Error", detail: "no map for this functional group" },
      })),
    });

    expect(run.report.unevaluated).toEqual([
      {
        document: "remittance.edi",
        transaction: "835",
        variant: null,
        refusedBy: "oracle",
        reason: "X12Error: no map for this functional group",
      },
    ]);
    const entry = run.report.compared.find((e) => e.transaction === "835");
    expect(entry?.documents).toBe(0);
    expect(entry?.elementPositions).toBe(0);
    expect(entry?.divergences).toEqual([]);
    // Zero of either is a failure, not silence that reads as agreement.
    expect(run.failures.join("\n")).toContain("which is not agreement");
  });
});

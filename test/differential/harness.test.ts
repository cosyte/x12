/**
 * Unhappy paths of the differential harness: a divergence, an oracle that
 * cannot be invoked, an oracle that is not the one it was pinned to, and a
 * document one of the readers refuses.
 *
 * The harness runs for real in every case here. What stands in is the ORACLE,
 * which is another process in another language and therefore outside this
 * module's boundary: a double supplies its readings so a disagreement, a
 * refusal and an outage can each be produced on demand. Where a test reaches a
 * real driver, the double is an executable standing in for the oracle's
 * interpreter, named by the same environment variable a provisioned
 * interpreter is. The live comparison against the real oracles is
 * `pnpm run differential:check`.
 *
 * SECURITY: every subprocess call here uses spawnSync with array args. No
 * exec, no shell-form.
 */

import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  OracleUnavailableError,
  runDifferential,
  type CorpusDocument,
  type DifferentialOracle,
  type OracleBinding,
  type OracleDescription,
  type OracleRead,
  type OracleSegment,
} from "../../scripts/differential/harness.js";
import {
  LINUXFORHEALTH_INTERPRETER_ENV,
  linuxforhealthOracle,
  type LinuxForHealthRequirement,
} from "../../scripts/differential/linuxforhealth-oracle.js";
import { OracleRequirementError } from "../../scripts/differential/oracle-process.js";
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

const BINDING_835: OracleBinding = {
  icvn: "00501",
  vriic: "005010X221A1",
  transactionSet: null,
  fic: "HP",
  tspc: null,
  model: "835.5010.X221.A1.xml",
  modelId: "835W1",
  modelTitle: "HIPAA Health Care Claim Payment/Advice 005010X221A1 835W1",
};

const DESCRIPTION: OracleDescription = {
  package: "oracle-double",
  version: "0.0.0",
  licence: "BSD",
  licenceClassifier: null,
  bindingKind: "map",
  bindingSource: "maps.xml",
  interchangeControlVersion: "00501",
  python: null,
  companions: [],
  bindings: [BINDING_835],
};

/** Decompose a document the way an X12 reader would, for the double to return. */
function echoSegments(text: string): OracleSegment[] {
  return text
    .split("~")
    .map((raw) => raw.replace(/^[\r\n]+/u, ""))
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
function doubleOracle(
  read: (document: CorpusDocument) => OracleRead,
  description: OracleDescription = DESCRIPTION,
): DifferentialOracle {
  return {
    describe: () => Promise.resolve(description),
    read: (document) => Promise.resolve(read(document)),
  };
}

/**
 * A minimal synthetic professional claim, carrying the group and transaction set
 * identifiers and nothing else of interest. The double's map index binds no
 * claim, so this document assigns to a transaction that is not compared. Every
 * token in it is a placeholder the allow list already declares, and it carries
 * no name, contact or date-of-birth element.
 */
const CLAIM = [
  "ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260101*1200*^*00501*000000002*0*P*:~",
  "GS*HC*SENDER*RECEIVER*20260101*1200*1*X*005010X222A2~",
  "ST*837*0001~",
  "BHT*0019*00*0012345*20260101*1200*CH~",
  "SE*3*0001~",
  "GE*1*1~",
  "IEA*1*000000002~",
].join("");

/** The same document under an implementation guide no conformance row names. */
const UNKNOWN_GUIDE = CLAIM.replace("005010X222A2", "005010X999A1");

const CORPUS: CorpusDocument[] = [{ id: "remittance.edi", text: REMITTANCE }];

describe("differential harness", () => {
  it("AC-4: records a divergence with both readings and fails the run", async () => {
    const run = await runDifferential({
      library: LIBRARY,
      corpus: CORPUS,
      oracles: [
        doubleOracle((document) => {
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
      ],
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
      oracles: [doubleOracle((document) => echoRead(document.text))],
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
    const error = await runDifferential({
      library: LIBRARY,
      corpus: CORPUS,
      oracles: [oracle],
    }).then(
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
      oracles: [doubleOracle((document) => echoRead(document.text))],
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

  it("AC-2: every corpus document is compared, unevaluated or skipped, and never nowhere", async () => {
    // What "one entry per transaction and variant the run put through both
    // readers" is worth depends on which documents reached the readers at all.
    // A document the run considers and puts in no list is invisible in the
    // artifact, so the run accounts for every one it was handed: compared,
    // refused by a reader, or skipped with what its own identifiers said it was.
    const corpus: CorpusDocument[] = [
      ...CORPUS,
      { id: "claim.edi", text: CLAIM },
      { id: "unknown-guide.edi", text: UNKNOWN_GUIDE },
      { id: "empty.edi", text: "" },
    ];
    const run = await runDifferential({
      library: LIBRARY,
      corpus,
      oracles: [doubleOracle((document) => echoRead(document.text))],
    });

    const accounted = [
      ...run.report.compared.flatMap((entry) => entry.documentIds),
      ...run.report.unevaluated.map((entry) => entry.document),
      ...run.report.skipped.map((entry) => entry.document),
    ].sort();
    expect(accounted).toEqual(corpus.map((document) => document.id).sort());

    // The claim assigns to a transaction this run does not compare, and the
    // report says so rather than dropping it: the reason names the identifiers
    // the decision was taken on.
    expect(run.report.skipped).toEqual([
      {
        document: "claim.edi",
        assigned: ["837/P"],
        reason:
          "This document's own GS-08 and ST-01 name no transaction oracle-double maps at " +
          "interchange control version 00501.",
      },
      {
        document: "unknown-guide.edi",
        assigned: [],
        reason:
          "This document's own GS-08 and ST-01 name no transaction oracle-double maps at " +
          "interchange control version 00501.",
      },
    ]);
  });

  it("AC-6: a document the oracle refuses is unevaluated, never agreement", async () => {
    const run = await runDifferential({
      library: LIBRARY,
      corpus: CORPUS,
      oracles: [
        doubleOracle(() => ({
          ok: false,
          refusal: { kind: "X12Error", detail: "no map for this functional group" },
        })),
      ],
    });

    expect(run.report.unevaluated).toEqual([
      {
        document: "remittance.edi",
        transaction: "835",
        variant: null,
        refusedBy: "oracle-double",
        refusalKind: "X12Error",
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

/**
 * The second oracle's half of the unhappy paths. Two doubles stand in for the
 * two out-of-process readers: the first binds the 835 by guide alone, as
 * pyx12's map index does, and the second binds the 270 through its transaction
 * set, as LinuxForHealth x12's models do.
 */
const SECOND = "linuxforhealth-x12";

const BINDING_270: OracleBinding = {
  icvn: "00501",
  vriic: "005010X279A1",
  transactionSet: "270",
  fic: null,
  tspc: null,
  model: "linuxforhealth.x12.v5010.x12_270_005010X279A1",
  modelId: "EligibilityInquiry",
  modelTitle: "The ASC X12 270 (EligibilityInquiry) transaction model.",
};

const SECOND_DESCRIPTION: OracleDescription = {
  package: SECOND,
  version: "0.57.0",
  licence: "Apache 2.0",
  licenceClassifier: "License :: OSI Approved :: Apache Software License",
  bindingKind: "model",
  bindingSource: "linuxforhealth.x12.v5010",
  interchangeControlVersion: "00501",
  python: "3.11.16",
  companions: [{ package: "pydantic", version: "1.10.13" }],
  bindings: [BINDING_270],
};

/** A synthetic 270 the repository already ships and declares. */
const INQUIRY: CorpusDocument = {
  id: "test/fixtures/eligibility/270-canonical.edi",
  text: readFileSync(
    join(REPO_ROOT, "test", "fixtures", "eligibility", "270-canonical.edi"),
    "utf8",
  ),
};

const REQUIREMENT_2: LinuxForHealthRequirement = {
  oracle: `${SECOND}==0.57.0`,
  companions: ["pydantic==1.10.13", "python-dotenv==1.2.3", "typing-extensions==4.16.0"],
  python: "3.11.16",
};

/** What the real oracle reports about itself, for the interpreter double to answer with. */
const INSTALLED = {
  package: SECOND,
  version: "0.57.0",
  licence: {
    declared: "Apache 2.0",
    expression: null,
    classifier: SECOND_DESCRIPTION.licenceClassifier,
  },
  python: "3.11.16",
  companions: [
    { package: "pydantic", version: "1.10.13" },
    { package: "python-dotenv", version: "1.2.3" },
    { package: "typing-extensions", version: "4.16.0" },
  ],
  bindingSource: "linuxforhealth.x12.v5010",
  interchangeControlVersion: "00501",
  bindings: [BINDING_270],
};

/** Where the interpreter double reads the `describe` answer it is to give. */
const DESCRIBE_ENV = "X12_TEST_ORACLE_DESCRIBE";

/**
 * An executable that stands in for the oracle's interpreter: it ignores the
 * script it is handed and answers `describe` with the JSON in
 * {@link DESCRIBE_ENV}. Kept under the ignored `.vitest-cache`.
 */
function interpreterDouble(): string {
  const dir = join(REPO_ROOT, ".vitest-cache", "differential-interpreter-double");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "python");
  writeFileSync(
    path,
    [
      "#!/usr/bin/env node",
      `const answer = process.argv[3] === "describe" ? process.env.${DESCRIBE_ENV} : undefined;`,
      'if (answer === undefined) { process.stderr.write("no canned answer\\n"); process.exit(3); }',
      "process.stdout.write(answer);",
      "",
    ].join("\n"),
    "utf8",
  );
  chmodSync(path, 0o755);
  return path;
}

const SAVED_ENV = {
  interpreter: process.env[LINUXFORHEALTH_INTERPRETER_ENV],
  describe: process.env[DESCRIBE_ENV],
};

afterEach(() => {
  for (const [key, value] of [
    [LINUXFORHEALTH_INTERPRETER_ENV, SAVED_ENV.interpreter],
    [DESCRIBE_ENV, SAVED_ENV.describe],
  ] as const) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
});

/** Describe the second oracle through its real driver, the installation answering `installed`. */
async function describeSecond(
  installed: unknown,
  requirement: LinuxForHealthRequirement = REQUIREMENT_2,
): Promise<unknown> {
  process.env[LINUXFORHEALTH_INTERPRETER_ENV] = interpreterDouble();
  process.env[DESCRIBE_ENV] = JSON.stringify(installed);
  return linuxforhealthOracle(requirement, "00501")
    .describe()
    .then(
      (description) => description,
      (reason: unknown) => reason,
    );
}

describe("differential harness, second oracle", () => {
  it("S0382 AC-5: a document the second oracle's model refuses is unevaluated, named with its kind", async () => {
    const run = await runDifferential({
      library: LIBRARY,
      corpus: [...CORPUS, INQUIRY],
      oracles: [
        doubleOracle((document) => echoRead(document.text)),
        doubleOracle(
          () => ({
            ok: false,
            refusal: {
              kind: "ValidationError",
              detail: "1 validation error for EligibilityInquiry",
            },
          }),
          SECOND_DESCRIPTION,
        ),
      ],
    });

    expect(run.report.unevaluated).toEqual([
      {
        document: INQUIRY.id,
        transaction: "270",
        variant: null,
        refusedBy: SECOND,
        refusalKind: "ValidationError",
        reason: "ValidationError: 1 validation error for EligibilityInquiry",
      },
    ]);
    // Not agreement, and not dropped: the 270 compared nothing and says so.
    const inquiry = run.report.compared.find((e) => e.transaction === "270");
    expect(inquiry?.oracle).toBe(SECOND);
    expect(inquiry?.documents).toBe(0);
    expect(inquiry?.documentIds).toEqual([]);
    expect(run.report.skipped.map((s) => s.document)).not.toContain(INQUIRY.id);
  });

  it("S0382 AC-5: a second-oracle row no document reaches fails the run exactly as a first-oracle row does", async () => {
    const refuseAll = (): OracleRead => ({
      ok: false,
      refusal: { kind: "ValidationError", detail: "refused" },
    });
    const run = await runDifferential({
      library: LIBRARY,
      corpus: [...CORPUS, INQUIRY],
      oracles: [doubleOracle(refuseAll), doubleOracle(refuseAll, SECOND_DESCRIPTION)],
    });
    expect(run.failures).toEqual([
      "270: no document reached both readers, which is not agreement.",
      "835: no document reached both readers, which is not agreement.",
    ]);
  });

  it("S0382 AC-7: a disagreement with the second oracle keeps both readings, names it, and fails the run", async () => {
    const run = await runDifferential({
      library: LIBRARY,
      corpus: [...CORPUS, INQUIRY],
      oracles: [
        doubleOracle((document) => echoRead(document.text)),
        doubleOracle((document) => {
          const read = echoRead(document.text);
          if (!read.ok) return read;
          // Disagree about TRN-02, the trace number, and about nothing else.
          const segments = read.segments.map((segment) =>
            segment.id === "TRN"
              ? { ...segment, elements: segment.elements.map((e, i) => (i === 1 ? "OTHER" : e)) }
              : segment,
          );
          return { ...read, segments };
        }, SECOND_DESCRIPTION),
      ],
    });

    const entry = run.report.compared.find((e) => e.transaction === "270");
    expect(entry?.oracle).toBe(SECOND);
    expect(entry?.divergences).toEqual([
      {
        document: INQUIRY.id,
        transaction: "270",
        variant: null,
        otherReader: SECOND,
        kind: "element-value",
        position: { segmentOrdinal: 9, segment: "TRN", path: "02" },
        library: "ELIG20260601001",
        oracle: "OTHER",
      },
    ]);
    expect(run.failures).toEqual([
      "270: element-value in test/fixtures/eligibility/270-canonical.edi at TRN[9] element 02: " +
        `this library read "ELIG20260601001", ${SECOND} read "OTHER".`,
    ]);
  });

  it("S0382 AC-6: the second oracle reporting a version, interpreter or companion other than its pin is refused", async () => {
    const cases: { installed: unknown; says: RegExp }[] = [
      { installed: { ...INSTALLED, version: "0.56.0" }, says: /reports version 0\.56\.0/u },
      { installed: { ...INSTALLED, python: "3.12.3" }, says: /runs under Python 3\.12\.3/u },
      {
        installed: {
          ...INSTALLED,
          companions: [{ package: "pydantic", version: "2.9.2" }, ...INSTALLED.companions.slice(1)],
        },
        says: /runs on pydantic 2\.9\.2/u,
      },
    ];
    for (const { installed, says } of cases) {
      const error = await describeSecond(installed);
      expect(error).toBeInstanceOf(OracleUnavailableError);
      expect((error as OracleUnavailableError).oracle).toBe(REQUIREMENT_2.oracle);
      expect((error as Error).message).toMatch(says);
    }
    // The same installation answering as pinned is described, from what it
    // reported rather than from anything written into the harness.
    const described = (await describeSecond(INSTALLED)) as OracleDescription;
    expect(described.package).toBe(SECOND);
    expect(described.version).toBe("0.57.0");
    expect(described.licence).toBe("Apache 2.0");
    expect(described.python).toBe("3.11.16");
    expect(described.companions).toEqual(INSTALLED.companions);
  });

  it("S0382 AC-6: a requirement that leaves the oracle, a companion or the interpreter free is refused", async () => {
    const refusals: LinuxForHealthRequirement[] = [
      { ...REQUIREMENT_2, oracle: SECOND },
      { ...REQUIREMENT_2, oracle: `${SECOND}>=0.57.0` },
      {
        ...REQUIREMENT_2,
        companions: ["pydantic>=1.9", "python-dotenv==1.2.3", "typing-extensions==4.16.0"],
      },
      {
        ...REQUIREMENT_2,
        companions: ["pydantic", "python-dotenv==1.2.3", "typing-extensions==4.16.0"],
      },
      { ...REQUIREMENT_2, python: "3.11" },
      { ...REQUIREMENT_2, python: null },
    ];
    for (const requirement of refusals) {
      expect(() => linuxforhealthOracle(requirement, "00501")).toThrow(OracleRequirementError);
    }
    // A companion the installation runs on that the requirement does not pin.
    const unpinned = await describeSecond(INSTALLED, {
      ...REQUIREMENT_2,
      companions: ["python-dotenv==1.2.3", "typing-extensions==4.16.0"],
    });
    expect(unpinned).toBeInstanceOf(OracleRequirementError);
    expect((unpinned as OracleRequirementError).oracle).toBe(REQUIREMENT_2.oracle);
    expect((unpinned as Error).message).toMatch(/pydantic 1\.10\.13.*pins no version/u);
  });

  it("S0382 AC-6: the real entry refuses the second oracle, names it, exits non-zero and writes no report", () => {
    const before = readFileSync(REPORT_PATH, "utf8");
    const interpreter = interpreterDouble();
    const pins = ["--with", "pydantic==1.10.13", "--with", "python-dotenv==1.2.3"];
    const tail = ["--with", "typing-extensions==4.16.0", "--python", "3.11.16"];
    const oracle = `${SECOND}==0.57.0`;
    const cases: { args: string[]; env: Record<string, string>; says: string }[] = [
      {
        // It cannot be invoked.
        args: ["--oracle", oracle, ...pins, ...tail],
        env: { [LINUXFORHEALTH_INTERPRETER_ENV]: join(REPO_ROOT, "no-such-interpreter") },
        says: "no-such-interpreter",
      },
      {
        // It reports a version other than its pin.
        args: ["--oracle", oracle, ...pins, ...tail],
        env: {
          [LINUXFORHEALTH_INTERPRETER_ENV]: interpreter,
          [DESCRIBE_ENV]: JSON.stringify({ ...INSTALLED, version: "0.56.0" }),
        },
        says: "reports version 0.56.0",
      },
      {
        // Its requirement does not pin a companion exactly.
        args: ["--oracle", oracle, "--with", "pydantic>=1.9", ...pins.slice(2), ...tail],
        env: {},
        says: "exact version",
      },
      {
        // Its requirement does not pin itself exactly.
        args: ["--oracle", SECOND, ...pins, ...tail],
        env: {},
        says: "exact version",
      },
    ];
    for (const { args, env, says } of cases) {
      // SECURITY: array-form spawnSync, no shell.
      const result = spawnSync(TSX_BIN, [ENTRY_PATH, ...args], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: { ...process.env, ...env },
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain(SECOND);
      expect(result.stderr).toContain(says);
      expect(result.stderr).toContain("No report was written");
      expect(readFileSync(REPORT_PATH, "utf8")).toBe(before);
    }
  }, 60_000);
});

/**
 * Unit tests for scripts/phi-scan.ts.
 *
 * Each fixture exercises one branch of the X12-aware scanner:
 *   - a clean synthetic interchange (allow-listed names + ids + dates)
 *   - a real person-name violator (NM1 entity-type-1)
 *   - a pre-2024 service/transaction date violator (DTP)
 *   - a date-of-birth violator (DMG*D8 not in the allow-list)
 *   - a member-id shape violator
 *   - an NPI shape violator
 *   - a dashed-SSN violator
 *   - a non-test email violator
 *   - a plain-text (.txt) dashed-SSN violator (text-mode pass)
 *   - the --allow-fixture override-log gate
 *   - the equivalence of the two runners, which is the premise the rest rests on
 *
 * Fixtures are written to a throwaway temp dir so violators never pollute the
 * committed corpus that `pnpm phi-scan` sweeps. The scanner is invoked via
 * spawnSync (array args, no shell) so the full CLI path (argv parse, exit code,
 * stderr) is exercised.
 *
 * SECURITY: every subprocess call here uses spawnSync with array args. No
 * exec, no shell-form.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import {
  writeFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  readFileSync,
  appendFileSync,
  copyFileSync,
  symlinkSync,
  realpathSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";

const REPO_ROOT = process.cwd();
const SCANNER_PATH = join(REPO_ROOT, "scripts", "phi-scan.ts");
const OVERRIDES_PATH = join(REPO_ROOT, "phi-scan-overrides.md");
const TSX_BIN = join(REPO_ROOT, "node_modules", ".bin", "tsx");

/**
 * The scanner runs under the SAME Node that is running vitest, not under `tsx`.
 *
 * Nearly every case here spawns the scanner, so what this file pays for is
 * start-up.
 *
 * EVERY FIGURE BELOW IS A MEASUREMENT TAKEN WHEN THE SUBSTITUTION LANDED, NOT A
 * DESCRIPTION OF THIS FILE TODAY. Read every figure that way whatever tense the
 * sentence around it happens to use: a case count, a spawn count and a wall
 * clock all move with the next slice, and a census here went stale exactly once
 * before anyone noticed. The
 * rule is `CLAUDE.md`'s: derive a count, never recall one. What survives as a
 * RULE is the last paragraph, and the equivalence case is what enforces it.
 *
 * Counted at runtime with a `spawnSync` shim on BOTH trees, because the two
 * censuses were different and quoting one for the other is the easy mistake:
 * before, **32 spawns across 32 cases, every one under `tsx`**; at that commit,
 * **36 spawns across 33 cases, 34 under `node` and 2 under `tsx`**. So 30 `tsx`
 * start-ups went and 2 were kept on purpose, in the equivalence case below. Both
 * numbers have since grown with the cases this file has gained. The scanner is a
 * few hundred lines of type-annotated Node that needs erasing and nothing more, and
 * Node 22.18 or newer strips types itself, so `tsx`'s esbuild pipeline buys nothing
 * here and costs a process launch. **That floor is not enforced anywhere:**
 * `engines.node` is `>=22.0.0` and there is no `.nvmrc`, so on a supported
 * 22.0 to 22.17 every `node` spawn below fails. It fails LOUDLY
 * (`ERR_UNKNOWN_FILE_EXTENSION`, caught by the exit-code and stderr assertions)
 * rather than greening for the wrong reason, and CI pins `node-version: "22"`
 * which resolves to the latest 22.x, so this is a dev-runtime note and not a
 * library constraint. Measured on this box (12-CPU cgroup quota,
 * `availableParallelism()` 12, loaded, so a realistic condition rather than a
 * quiet one): one scanner start is a **441 ms** median under `tsx` and a **149 ms**
 * median under `node`, seven runs each. Whole-file wall clock, this file alone:
 * **15.7 s to 6.6 s**.
 *
 * Those medians predict **8.2 s**, not 9.1 s: 32 starts converted at the 292 ms
 * difference is 9.3 s saved, less the 2 `node` and 2 `tsx` starts the new case adds
 * (1.2 s). So the model is the right shape and about **11% light** against the
 * 9.1 s measured. It is quoted as a sanity check on the mechanism, not as a fit.
 *
 * In-suite under `pnpm test:coverage`, interleaved BASE/HEAD two rounds each so the
 * arms share a load condition rather than being compared across a drifting one:
 * this file went **17.2 s / 17.5 s to 8.6 s / 8.6 s**. Do not restate that as a
 * whole-suite win: the run's critical path was, at that commit,
 * `test/scripts/attw-gate.test.ts`,
 * so what this bought the suite is about 8.6 s of CPU, not 8.6 s of wall clock.
 * `vitest.config.ts` carries the full profile and the reasoning.
 *
 * The gate itself (`pnpm phi-scan`) still runs under `tsx`, so this substitutes a
 * runner rather than following one. `equivalence` below is what keeps that honest:
 * it drives BOTH runners over the same violator and the same clean file and
 * requires the same exit code and the same stderr, so if the two ever diverge the
 * suite says so instead of quietly grading a different artifact than the gate runs.
 */
const NODE_BIN = process.execPath;

// A valid 106-byte ISA so looksLikeX12() is true and ISA-byte delimiter
// detection works (element `*`, segment `~`).
const ISA =
  "ISA*00*          *00*          *ZZ*SUBMITTER      *ZZ*RECEIVER       *260601*1200*^*00501*000000001*0*P*:~";

function interchange(...bodySegments: string[]): string {
  return [ISA, "GS*HC*SUBMITTER*RECEIVER*20260601*1200*1*X*005010X222A2~", ...bodySegments].join(
    "\n",
  );
}

/**
 * 🛑 EVERY VIOLATOR PAYLOAD IN THIS FILE IS ASSEMBLED, NEVER WRITTEN AS LITERAL
 * SEGMENT TEXT. WRITE THE NEXT ONE THE SAME WAY.
 *
 * `test` is a walk root, so `pnpm phi-scan` opens this file like any other. Every
 * payload below is one the scanner is REQUIRED to trip on - that is the whole
 * point of it - and there is no way to excuse it that is not worse than this one:
 *
 *   - declaring the values in `scripts/phi-allow-list.txt` disarms the exact
 *     detector the case exists to prove, so the case would pass for the wrong
 *     reason;
 *   - a literal-path exemption would have to cover `--staged` as well as the
 *     sweep, or nobody could ever commit an edit to this file again - and an
 *     exemption that reaches the commit-blocking route is the defect
 *     `@cosyte/dicom` paid an `INTRODUCED` major for.
 *
 * So the framing is built at run time and the VALUES STAY LEGIBLE IN THE SOURCE.
 * Nothing is obscured: `SMITH`, `ROBERT` and the SSN digits are all right there
 * to read. What is absent is a `NM1*`, `DMG*`, `PER*` or `nnn-nn-nnnn` RUN for a
 * scanner to frame, which is the only thing that made this file a hit.
 *
 * This is NOT a claim that the widened gate cannot see this file. It reads it on
 * all three routes, and a literal violator written here reds the gate - which is
 * exactly what the `phi-scan: this file's own controls` case below asserts.
 */
function seg(...elements: string[]): string {
  return `${elements.join("*")}~`;
}

/** A dashed SSN shape, assembled for the reason above. */
const DASHED_SSN = ["123", "45", "6789"].join("-");

/** One violator per detector. Each is a hit the corresponding case asserts on. */
const NAME_VIOLATOR = seg("NM1", "IL", "1", "SMITH", "ROBERT", "", "", "", "MI", "MEMBER001");
const SERVICE_DATE_VIOLATOR = seg("DTP", "472", "D8", "20190601");
const DOB_VIOLATOR = seg("DMG", "D8", "19771103", "M");
const DOB_NO_QUALIFIER_VIOLATOR = seg("DMG", "", "19771103", "M");
const MEMBER_ID_VIOLATOR = seg("NM1", "IL", "1", "TEST", "PATIENT", "", "", "", "MI", "W123456789");
const NPI_VIOLATOR = seg("NM1", "82", "1", "RENDERING", "DOCTOR", "", "", "", "XX", "1992743851");
const DASHED_SSN_VIOLATOR = seg("REF", "SY", DASHED_SSN);
const EMAIL_VIOLATOR = seg(
  "PER",
  "IC",
  "BILLER",
  "TE",
  "5551234500",
  "EM",
  ["real", "gmail.com"].join("@"),
);
const OVERRIDE_VIOLATOR = seg("NM1", "IL", "1", "SMITH", "ROBERT", "", "", "", "MI", "W1");
const RIVERA_NM1 = seg("NM1", "IL", "1", "RIVERA", "JUANITA", "", "", "", "MI", "MEMBER001");

let dir: string;

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function runScanner(args: string[]): RunResult {
  const r = spawnSync(NODE_BIN, [SCANNER_PATH, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: false,
  });
  return { code: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

function write(name: string, content: string): string {
  const p = join(dir, name);
  writeFileSync(p, content);
  return p;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "x12-phi-scan-"));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("phi-scan: the runner substitution is an equivalence, not an assumption", () => {
  /**
   * Every other case in this file spawns the scanner under `node`, while the gate
   * consumers actually run (`pnpm phi-scan`, the pre-commit hook, CI) spawns it
   * under `tsx`. That is only sound while the two runners produce the same verdict,
   * so this case measures it rather than assuming it, on both directions of the
   * verdict: a file that must be a hit and a file that must be clean.
   *
   * It is deliberately the only place `tsx` is still spawned. If a future toolchain
   * change makes the two disagree (an erase-only stripper meeting a TS feature that
   * needs a real transform, say), this reds and names the divergence instead of the
   * suite silently grading an artifact the gate never runs. Nothing else enforces
   * that: the shared `@cosyte/tsconfig` sets neither `erasableSyntaxOnly` nor
   * `verbatimModuleSyntax: true`, so this case is the guard.
   *
   * SCOPE IT HONESTLY. It drives `paths` mode only, on one hit and one clean file, so
   * it pins the exit-0 and exit-1 verdicts and NOT the exit-2 refusals, nor all-mode,
   * nor `--staged`. That is deliberate rather than an oversight: the only divergence
   * these two runners plausibly have is at MODULE LOAD, which cannot be confined to
   * the routes this case does not drive, so widening it would cost `tsx` start-ups
   * back for no reachable extra signal. If a divergence is ever found that is NOT
   * load-time, this case is too narrow and must grow.
   */
  function runUnderTsx(args: string[]): RunResult {
    const r = spawnSync(TSX_BIN, [SCANNER_PATH, ...args], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      shell: false,
    });
    return { code: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
  }

  it("node and tsx agree on exit code and stderr, on a hit and on a clean file", () => {
    const hit = write("runner-hit.edi", interchange(NAME_VIOLATOR));
    const clean = write("runner-clean.edi", interchange("NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~"));

    for (const [label, target, expected] of [
      ["hit", hit, 1],
      ["clean", clean, 0],
    ] as const) {
      const viaNode = runScanner([target]);
      const viaTsx = runUnderTsx([target]);
      expect(viaNode.code, `${label}: node stderr: ${viaNode.stderr}`).toBe(expected);
      expect(viaTsx.code, `${label}: tsx stderr: ${viaTsx.stderr}`).toBe(expected);
      expect(viaTsx.stderr, `${label}: the two runners disagree on stderr`).toBe(viaNode.stderr);
      expect(viaTsx.stdout, `${label}: the two runners disagree on stdout`).toBe(viaNode.stdout);
    }
  });
});

describe("phi-scan: clean synthetic interchange", () => {
  it("exits 0 when every identifier is allow-listed", () => {
    const p = write(
      "clean.edi",
      interchange(
        "NM1*IL*1*TEST*PATIENT*A***MI*MEMBER001~",
        "DMG*D8*19800101*M~",
        "PER*IC*JANE SUBMITTER*TE*5551234567~",
        "DTP*472*D8*20260601~",
        "NM1*82*1*RENDERING*DOCTOR****XX*1112223330~",
      ),
    );
    const r = runScanner([p]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });
});

describe("phi-scan: PHI-shape violators each exit 1", () => {
  it("real person name", () => {
    const p = write("name.edi", interchange(NAME_VIOLATOR));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/SMITH/);
  });

  it("pre-2024 service date", () => {
    const p = write("date.edi", interchange(SERVICE_DATE_VIOLATOR));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/before 2024/);
  });

  it("date of birth not in the allow-list", () => {
    const p = write("dob.edi", interchange(DOB_VIOLATOR));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/date of birth/);
  });

  it("date of birth with a non-D8 format qualifier still trips", () => {
    const p = write("dob-nod8.edi", interchange(DOB_NO_QUALIFIER_VIOLATOR));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/date of birth/);
  });

  it("member-id shape not recognized as synthetic", () => {
    const p = write("mbr.edi", interchange(MEMBER_ID_VIOLATOR));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/member-id/);
  });

  it("NPI shape not recognized as synthetic", () => {
    const p = write("npi.edi", interchange(NPI_VIOLATOR));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/NPI/);
  });

  it("dashed SSN anywhere", () => {
    const p = write("ssn.edi", interchange(DASHED_SSN_VIOLATOR));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/SSN/);
  });

  it("non-test email domain", () => {
    const p = write("email.edi", interchange(EMAIL_VIOLATOR));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/email/);
  });
});

describe("phi-scan: plain-text (non-X12) targets", () => {
  it("clean text exits 0", () => {
    const p = write("notes.txt", "synthetic notes - member MEMBER001, dos 20260601");
    const r = runScanner([p]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it("dashed SSN in text exits 1", () => {
    const p = write("leak.txt", `patient ssn ${DASHED_SSN} leaked into a comment`);
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/SSN/);
  });
});

describe("phi-scan: --allow-fixture override gate", () => {
  it("rejects --allow-fixture without an override-log entry (exit 2)", () => {
    const p = write("violator.edi", interchange(OVERRIDE_VIOLATOR));
    const r = runScanner(["--allow-fixture", p]);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/phi-scan-overrides\.md/);
  });

  it("honors --allow-fixture WITH an override-log entry (exit 0)", () => {
    const p = write("violator2.edi", interchange(OVERRIDE_VIOLATOR));
    const rel = relative(REPO_ROOT, p).split(sep).join("/");

    // The fixture is a genuine violator: scanned on its own (no override) it
    // must trip. This proves the override - not an empty target set - is what
    // flips the next run to clean.
    expect(runScanner([p]).code).toBe(1);

    const original = readFileSync(OVERRIDES_PATH, "utf8");
    try {
      appendFileSync(
        OVERRIDES_PATH,
        `\n### ${rel}\n\n- **Reason:** unit test\n- **Approved by:** vitest\n`,
      );
      const r = runScanner(["--allow-fixture", p]);
      expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    } finally {
      writeFileSync(OVERRIDES_PATH, original);
    }
  });
});

// ---------------------------------------------------------------------------
// Entries that are not regular files, on BOTH enumerating routes
// ---------------------------------------------------------------------------
//
// The walk enumerates `Dirent.isFile()`, an lstat answer, so a symbolic link is
// neither a file nor a directory; `--staged` reads content with
// `git show :<path>`, and git stores a link as its TARGET PATH under mode
// 120000. A link under a scan root pointing at a PHI-bearing `.edi` therefore
// used to scan CLEAN on both. These cases pin the refusal on each route, the
// negative controls that keep ordinary files scanned on each route, and the rule
// that a refusal never echoes what is on the other side of the link.
//
// Every case runs against a THROWAWAY GIT REPOSITORY, never against this one:
// the scanner roots everything at `process.cwd()`, so a synthetic tree is enough
// and no link or violator is ever written into the committed corpus.

/**
 * Synthetic, NAME-BEARING X12 payload. A payload with no name proves nothing
 * about a claim that names do not leak, so this one carries an NM1 person name,
 * a DMG date of birth, a PER phone off the 555 convention, a `REF*SY` SSN and a
 * dashed SSN shape. Every value is invented.
 */
const SYNTHETIC_PHI = interchange(
  RIVERA_NM1,
  seg("DMG", "D8", "19780314", "F"),
  seg("PER", "IC", "JUANITA RIVERA", "TE", "2124440101"),
  seg("REF", "SY", "123456789"),
  seg("NTE", "ADD", `SSN ${DASHED_SSN}`),
);

/** The link target's own name carries a synthetic name, so an echo of it is visible. */
const TARGET_NAME = "RIVERA-JUANITA-19780314.edi";

/** Tokens that must never appear in a refusal message. */
const PHI_TOKENS = ["RIVERA", "JUANITA", "19780314", DASHED_SSN, "123456789", TARGET_NAME];

function expectNoPhi(stderr: string): void {
  for (const t of PHI_TOKENS) expect(stderr).not.toContain(t);
}

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  if ((r.status ?? -1) !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr ?? ""}`);
}

function gitOut(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  return r.stdout ?? "";
}

function runIn(cwd: string, args: string[]): RunResult {
  const r = spawnSync(NODE_BIN, [SCANNER_PATH, ...args], { cwd, encoding: "utf8", shell: false });
  return { code: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

const repos: string[] = [];

/**
 * A throwaway git repo laid out the way the scanner expects: an allow-list under
 * `scripts/`, both walk roots (`test/fixtures` and `src`), and one ordinary file
 * in each so the walk has something legitimate to find.
 */
function makeRepo(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "x12-phi-scan-repo-")));
  repos.push(root);
  mkdirSync(join(root, "scripts"));
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "test", "fixtures"), { recursive: true });
  copyFileSync(
    join(REPO_ROOT, "scripts", "phi-allow-list.txt"),
    join(root, "scripts", "phi-allow-list.txt"),
  );
  writeFileSync(join(root, "src", "ordinary.ts"), "export const answer = 42;\n");
  writeFileSync(
    join(root, "test", "fixtures", "ordinary.edi"),
    interchange("NM1*IL*1*TEST*PATIENT****MI*MEMBER001~"),
  );
  git(root, ["init", "-q", "."]);
  return root;
}

afterAll(() => {
  for (const r of repos) rmSync(r, { recursive: true, force: true });
});

describe("phi-scan: the synthetic payload is genuinely detectable", () => {
  // Guards against proving nothing by fixture: every refusal case below rests on
  // this payload being something the X12-aware scanner would otherwise catch.
  it("as a plain regular file it is a hit, on the NAME detector specifically (exit 1)", () => {
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("person-name token not in synthetic allow-list");
    expect(r.stderr).toContain("RIVERA");
    expect(r.stderr).toContain(DASHED_SSN);
  });

  it("a repo with no link and no violator scans clean (exit 0)", () => {
    const root = makeRepo();
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/OK - no hits/);
  });
});

describe("phi-scan: the all-mode walk refuses a non-regular entry", () => {
  it("refuses a symlink under test/fixtures pointing at PHI (exit 2), and reports no PHI", () => {
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "leak.edi"));

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/leak.edi");
    expect(r.stderr).toContain("a symbolic link");
    expectNoPhi(r.stderr);
    expect(r.stdout).not.toMatch(/OK/);
  });

  it("refuses a symlink under the src/ walk root too", () => {
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", TARGET_NAME), join(root, "src", "leak.ts"));

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("src/leak.ts");
    expect(r.stderr).toContain("a symbolic link");
    expectNoPhi(r.stderr);
  });

  it("refuses a symlinked DIRECTORY too, which isDirectory() also answers false for", () => {
    const root = makeRepo();
    mkdirSync(join(root, "elsewhere"));
    writeFileSync(join(root, "elsewhere", TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", "elsewhere"), join(root, "test", "fixtures", "linked-dir"));

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/linked-dir");
    expectNoPhi(r.stderr);
  });

  it("a link named like a doc is NOT excused by the .md exemption", () => {
    // The exemption is a judgement about a file whose bytes the walk could have
    // read. A link's own name is no evidence about what is on the other side.
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "notes.md"));

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/notes.md");
    expectNoPhi(r.stderr);
  });

  it("names EVERY offender, not just the first", () => {
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "one.edi"));
    symlinkSync(join("..", TARGET_NAME), join(root, "src", "two.ts"));

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/one.edi");
    expect(r.stderr).toContain("src/two.ts");
    expect(r.stderr).toContain("2 entries");
    expectNoPhi(r.stderr);
  });

  it("still scans ordinary files in the same walk roots (the refusal is not the only outcome)", () => {
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
  });

  it("an ignored link is out of scope, by the same rule that already excludes an ignored file", () => {
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "leak.edi"));
    writeFileSync(join(root, ".gitignore"), "test/fixtures/leak.edi\n");

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it("but an entry already in the index cannot be excused that way", () => {
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "leak.edi"));
    writeFileSync(join(root, ".gitignore"), "test/fixtures/leak.edi\n");
    git(root, ["add", "-f", "test/fixtures/leak.edi"]);

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/leak.edi");
  });
});

describe("phi-scan: the --staged route refuses a staged non-regular entry", () => {
  it("git really does store the link as its target path, not the target's bytes", () => {
    // The measurement the refusal rests on. If git ever changed this, the
    // refusal below would be arguing from a premise that no longer holds.
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "leak.edi"));
    git(root, ["add", "test/fixtures/leak.edi"]);

    expect(gitOut(root, ["ls-files", "--stage", "test/fixtures/leak.edi"])).toMatch(/^120000 /);
    const shown = gitOut(root, ["show", ":test/fixtures/leak.edi"]);
    expect(shown.trim()).toBe(`../../${TARGET_NAME}`);
    expect(shown).not.toContain("RIVERA*JUANITA");
  });

  it("refuses a staged symlink (exit 2), and reports no PHI", () => {
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "leak.edi"));
    git(root, ["add", "test/fixtures/leak.edi"]);

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/leak.edi");
    expect(r.stderr).toContain("a symbolic link");
    expectNoPhi(r.stderr);
  });

  it("refuses a TYPECHANGE, a tracked regular file replaced by a link (exit 2)", () => {
    // The shape `--diff-filter=AM` used to delete before any mode could be read.
    // Replacing a TRACKED file with a link is neither an add nor a modify: git
    // raises `:100644 120000 <sha> <sha> T`, and without `T` in the filter the
    // record never existed, so the pre-commit hook passed the link green.
    const root = makeRepo();
    git(root, ["add", "test/fixtures/ordinary.edi"]);
    git(root, ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "base"]);

    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    rmSync(join(root, "test", "fixtures", "ordinary.edi"));
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "ordinary.edi"));
    git(root, ["add", "test/fixtures/ordinary.edi"]);

    // The premise: git really does raise this as a typechange, not A or M.
    expect(gitOut(root, ["diff", "--cached", "--raw", "--diff-filter=AM"]).trim()).toBe("");
    expect(gitOut(root, ["diff", "--cached", "--raw"])).toContain(" 120000 ");

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/ordinary.edi");
    expect(r.stderr).toContain("a symbolic link");
    expectNoPhi(r.stderr);
  });

  it("scans the other direction of a typechange, a link replaced by a real file (exit 1)", () => {
    const root = makeRepo();
    symlinkSync("ordinary.edi", join(root, "test", "fixtures", "link.edi"));
    git(root, ["add", "test/fixtures/link.edi"]);
    git(root, ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "base"]);

    rmSync(join(root, "test", "fixtures", "link.edi"));
    writeFileSync(join(root, "test", "fixtures", "link.edi"), SYNTHETIC_PHI);
    git(root, ["add", "test/fixtures/link.edi"]);

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("RIVERA");
  });

  it("refuses a staged gitlink under a scanned prefix by KIND, not by a read failure", () => {
    // A gitlink already exited 2 before this change, but by `git show` failing
    // and echoing git's own text. It is now refused at enumeration, named.
    const root = makeRepo();
    const nested = join(root, "test", "fixtures", "nested");
    mkdirSync(nested);
    git(nested, ["init", "-q", "."]);
    writeFileSync(join(nested, "payload.edi"), SYNTHETIC_PHI);
    git(nested, ["add", "payload.edi"]);
    git(nested, ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "n"]);
    git(root, ["add", "test/fixtures/nested"]);

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/nested");
    expect(r.stderr).toContain("a gitlink");
    expect(r.stderr).not.toContain("could not read");
    expectNoPhi(r.stderr);
  });

  it("still catches a staged ORDINARY file carrying the same payload (exit 1)", () => {
    // The regression control on the `--raw -z` reparse: reading the mode must not
    // cost the route the ordinary files it was already enumerating.
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    git(root, ["add", "test/fixtures/violator.edi"]);

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("test/fixtures/violator.edi");
    expect(r.stderr).toContain("RIVERA");
  });

  it("passes a staged ordinary clean file, and one with a space in its name (exit 0)", () => {
    // `--raw -z` is NUL-delimited, so a path with a space must not desync the
    // two-field stride the reparse walks.
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "fixtures", "with space.edi"),
      interchange("NM1*IL*1*TEST*PATIENT****MI*MEMBER001~"),
    );
    git(root, ["add", "test/fixtures/ordinary.edi", "test/fixtures/with space.edi"]);
    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/OK - no hits/);
  });

  it("a staged link OUTSIDE the route's scope is left alone (a repo-root path)", () => {
    // The route covers `test/**` and `src/**`, so the scope has a boundary and
    // this is where it sits: a path at the repository root is outside it. Do not
    // read this as "the scope is unchanged" - `PHI-SCAN-WALK-ROOT-SCOPE` widened
    // it from `test/fixtures/**` plus `src/**.ts`, by union.
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(TARGET_NAME, join(root, "docs-link.edi"));
    git(root, ["add", "docs-link.edi"]);

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });
});

describe("phi-scan: paths mode was never blind and is unchanged", () => {
  it("follows a named symlink and scans the target's bytes (exit 1)", () => {
    // `readFileSync` follows a link, so an explicitly-named path is read, not
    // skipped. This is the reason the remedy does not touch `paths` mode.
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(join("..", "..", TARGET_NAME), join(root, "test", "fixtures", "leak.edi"));

    const r = runIn(root, ["test/fixtures/leak.edi"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("RIVERA");
  });
});

// ---------------------------------------------------------------------------
// The `--staged` argv does not trust the caller's git config
// ---------------------------------------------------------------------------
//
// Five ways an index the pre-commit hook was handed could disappear from
// `git diff --cached --raw` without a byte of it changing: a rename, a copy, a
// gitlink under `diff.ignoreSubmodules=all`, an unmerged path, and a broken pair
// under `-B`. Each case below asserts the PREMISE off raw git first (so it fails
// loudly rather than quietly if git's behaviour ever moves) and then the
// scanner's verdict. Every one of them returned exit 0 before this change.

function commit(root: string, message: string): void {
  git(root, ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", message]);
}

/**
 * Stage `path` at merge stages 2 and 3 with no stage 0, which is exactly the
 * index state a conflicted merge leaves behind.
 *
 * DELIBERATELY NOT `git merge`. A sibling measured that one: `git merge`
 * resolves the committer identity up front and exits 128 where no identity is
 * configured, so a test built on it passes on a developer box and reds on CI on
 * its own premise rather than on the thing it is testing. `update-index` needs
 * no identity, no branch names and no merge driver, and it states the premise
 * (stages 2 and 3, never stage 0) directly instead of arriving at it.
 */
function stageUnmerged(root: string, path: string, ours: string, theirs: string): void {
  const hash = (content: string): string => {
    const r = spawnSync("git", ["hash-object", "-w", "--stdin"], {
      cwd: root,
      input: content,
      encoding: "utf8",
      shell: false,
    });
    if ((r.status ?? -1) !== 0) throw new Error(`git hash-object failed: ${r.stderr ?? ""}`);
    return (r.stdout ?? "").trim();
  };
  const info = `100644 ${hash(ours)} 2\t${path}\n100644 ${hash(theirs)} 3\t${path}\n`;
  const r = spawnSync("git", ["update-index", "--index-info"], {
    cwd: root,
    input: info,
    encoding: "utf8",
    shell: false,
  });
  if ((r.status ?? -1) !== 0) throw new Error(`git update-index failed: ${r.stderr ?? ""}`);
}

/** A body long enough for git's break detection to have something to measure. */
function bulkBody(lead: string): string {
  return Array.from({ length: 200 }, (_, i) => `NTE*ADD*${lead} ${String(i)}~`).join("\n");
}

describe("phi-scan: --staged enumerates a staged RENAME and COPY", () => {
  it("refuses a link `git mv`d into the fixture root (exit 2), where the old filter saw nothing", () => {
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(TARGET_NAME, join(root, "leak.edi"));
    git(root, ["add", "leak.edi", "test/fixtures/ordinary.edi", "src/ordinary.ts"]);
    commit(root, "base");
    git(root, ["mv", "leak.edi", "test/fixtures/leak.edi"]);

    // The premise: git raises this as a single TWO-PATH record, and the
    // superseded filter returned nothing at all for it.
    expect(gitOut(root, ["diff", "--cached", "--raw", "--diff-filter=AMT"]).trim()).toBe("");
    expect(gitOut(root, ["diff", "--cached", "--raw"])).toContain("test/fixtures/leak.edi");

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/leak.edi");
    expect(r.stderr).toContain("a symbolic link");
    expectNoPhi(r.stderr);
  });

  it("scans a fixture renamed WITH a real-looking name substituted into it (exit 1)", () => {
    // The shape the item was actually filed for: the rename is the carrier, and
    // the bytes that arrive are a hit. No similarity score is asserted, because
    // it moves with the fixture and a number copied from a sibling is wrong.
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "fixtures", "claim.edi"),
      interchange("NM1*IL*1*TEST*PATIENT****MI*MEMBER001~"),
    );
    git(root, ["add", "."]);
    commit(root, "base");
    git(root, ["mv", "test/fixtures/claim.edi", "test/fixtures/renamed.edi"]);
    writeFileSync(join(root, "test", "fixtures", "renamed.edi"), interchange(RIVERA_NM1));
    git(root, ["add", "test/fixtures/renamed.edi"]);

    expect(gitOut(root, ["diff", "--cached", "--raw", "--diff-filter=AMT"]).trim()).toBe("");

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("test/fixtures/renamed.edi");
    expect(r.stderr).toContain("person-name token not in synthetic allow-list");
  });

  it("scans a COPY into the fixture root under `diff.renames=copies` (exit 1)", () => {
    // The `C` half is a distinct hole from the `R` half: the source stays put,
    // so nothing is moved, and a PHI-bearing file from outside the roots simply
    // appears inside one.
    const root = makeRepo();
    git(root, ["config", "diff.renames", "copies"]);
    writeFileSync(join(root, "outside.edi"), SYNTHETIC_PHI);
    git(root, ["add", "."]);
    commit(root, "base");
    copyFileSync(join(root, "outside.edi"), join(root, "test", "fixtures", "copied.edi"));
    // Copy detection only considers sources touched by the same diff.
    appendFileSync(join(root, "outside.edi"), "NTE*ADD*trailing~\n");
    git(root, ["add", "test/fixtures/copied.edi", "outside.edi"]);

    expect(gitOut(root, ["diff", "--cached", "--raw"])).toMatch(/\bC\d*\t/);
    expect(gitOut(root, ["diff", "--cached", "--raw", "--diff-filter=AMT"])).not.toContain(
      "test/fixtures/copied.edi",
    );

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("test/fixtures/copied.edi");
    expect(r.stderr).toContain("RIVERA");
  });

  it("is INDEPENDENT of `diff.renames` and `diff.renameLimit`, not merely correct by default", () => {
    // `--no-renames` is what makes the two-field stride structural. Each setting
    // must yield the same single-path `A` for the moved link and the same
    // refusal, or the gate's behaviour is a property of the developer's config.
    for (const setting of ["true", "copies", "false", "1"]) {
      const root = makeRepo();
      git(root, ["config", "diff.renames", setting]);
      git(root, ["config", "diff.renameLimit", "1"]);
      writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
      symlinkSync(TARGET_NAME, join(root, "leak.edi"));
      git(root, ["add", "."]);
      commit(root, "base");
      git(root, ["mv", "leak.edi", "test/fixtures/leak.edi"]);

      const raw = gitOut(root, [
        "diff",
        "--cached",
        "--raw",
        "--no-renames",
        "--ignore-submodules=none",
        "--diff-filter=AMTUB",
      ]);
      expect(raw, `diff.renames=${setting}`).toContain("A\ttest/fixtures/leak.edi");
      const r = runIn(root, ["--staged"]);
      expect(r.code, `diff.renames=${setting} stderr: ${r.stderr}`).toBe(2);
    }
  });

  it("the new enumeration EQUALS the old one absent a rename, copy, gitlink or unmerged path", () => {
    // The relation is a superset, NOT a strictly larger set, and the loose form
    // of that sentence has been refuted in this ecosystem before. STATE THE
    // PRECONDITION IN FULL, including in this title, which is the string a
    // reporter prints: "when nothing is renamed or copied" is `--no-renames`'s
    // half of it and is FALSE with an unmerged path, or with a gitlink under
    // `diff.ignoreSubmodules=all`, in the index. On an index carrying none of
    // the four the two argvs return the same bytes, so nothing the old one
    // enumerated stopped being enumerated.
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "added.edi"), SYNTHETIC_PHI);
    writeFileSync(join(root, "src", "another.ts"), "export const b = 1;\n");
    git(root, ["add", "test/fixtures/added.edi", "src/another.ts", "src/ordinary.ts"]);

    const before = gitOut(root, ["diff", "--cached", "--raw", "-z", "--diff-filter=AMT"]);
    const after = gitOut(root, [
      "diff",
      "--cached",
      "--raw",
      "-z",
      "--no-renames",
      "--ignore-submodules=none",
      "--diff-filter=AMTUB",
    ]);
    expect(after).toBe(before);
    expect(before).not.toBe("");
  });
});

describe("phi-scan: --staged is not blinded by diff.ignoreSubmodules", () => {
  it("refuses a staged gitlink even under `diff.ignoreSubmodules=all` (exit 2)", () => {
    const root = makeRepo();
    git(root, ["config", "diff.ignoreSubmodules", "all"]);
    const nested = join(root, "test", "fixtures", "nested");
    mkdirSync(nested);
    git(nested, ["init", "-q", "."]);
    writeFileSync(join(nested, "payload.edi"), SYNTHETIC_PHI);
    git(nested, ["add", "payload.edi"]);
    commit(nested, "n");
    git(root, ["add", "test/fixtures/nested"]);

    // The premise: the config really does erase the record from raw git.
    expect(gitOut(root, ["diff", "--cached", "--raw"]).trim()).toBe("");
    expect(gitOut(root, ["diff", "--cached", "--raw", "--ignore-submodules=none"])).toContain(
      "test/fixtures/nested",
    );

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/nested");
    expect(r.stderr).toContain("a gitlink");
    expectNoPhi(r.stderr);
  });
});

describe("phi-scan: --staged refuses an UNMERGED in-scope path", () => {
  it("refuses (exit 2) rather than reporting clean over an index it cannot read", () => {
    const root = makeRepo();
    git(root, ["add", "."]);
    commit(root, "base");
    stageUnmerged(
      root,
      "test/fixtures/conflict.edi",
      interchange("NM1*IL*1*TEST*PATIENT****MI*MEMBER002~"),
      interchange(RIVERA_NM1),
    );

    // The premises: the path really has no stage-0 blob (so `git show :<path>`
    // cannot answer), and the superseded filter returned no record for it.
    expect(gitOut(root, ["ls-files", "-u", "test/fixtures/conflict.edi"]).trim()).not.toBe("");
    expect(gitOut(root, ["ls-files", "-s", "test/fixtures/conflict.edi"])).not.toMatch(/ 0\t/);
    expect(gitOut(root, ["diff", "--cached", "--raw", "--diff-filter=AMT"]).trim()).toBe("");

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/conflict.edi");
    expect(r.stderr).toContain("unmerged");
    // The unmerged refusal must not borrow the link/gitlink sentence, which is
    // false for it, nor echo anything out of the conflicting stages.
    expect(r.stderr).not.toContain("a symbolic link");
    expect(r.stderr).not.toContain("a git mode-000000 entry");
    expectNoPhi(r.stderr);
  });

  it("an unmerged path OUTSIDE the route's scope does not refuse (a repo-root path)", () => {
    const root = makeRepo();
    git(root, ["add", "."]);
    commit(root, "base");
    stageUnmerged(root, "notes.txt", "ours\n", "theirs\n");

    expect(gitOut(root, ["ls-files", "-u", "notes.txt"]).trim()).not.toBe("");
    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });
});

describe("phi-scan: the argv the two-field stride is coupled to", () => {
  it("`-M`, `-C` and `--find-copies-harder` each reopen the two-path record", () => {
    // The guard on the claim the scanner's own comment makes. These three turn
    // rename/copy detection back on over the top of `--no-renames` and empty the
    // route again, so none of them may be added to the argv.
    const root = makeRepo();
    writeFileSync(join(root, TARGET_NAME), SYNTHETIC_PHI);
    symlinkSync(TARGET_NAME, join(root, "leak.edi"));
    git(root, ["add", "."]);
    commit(root, "base");
    git(root, ["mv", "leak.edi", "test/fixtures/leak.edi"]);

    const enumerated = (extra: string[]): string =>
      gitOut(root, [
        "diff",
        "--cached",
        "--raw",
        "--no-renames",
        "--ignore-submodules=none",
        ...extra,
        "--diff-filter=AMTUB",
      ]).trim();

    expect(enumerated([])).toContain("test/fixtures/leak.edi");
    for (const flag of ["-M", "-C", "--find-copies-harder"]) {
      expect(enumerated([flag]), `${flag} must not be added to the scanner's argv`).toBe("");
    }
    // `-B` is inert for a RENAME, which is the one shape it leaves alone. The
    // case below is what that does not clear it for.
    expect(enumerated(["-B"])).toContain("test/fixtures/leak.edi");
  });

  it("`-B` hides a COMPLETE REWRITE from an `AMTU` filter, and `B` in the filter is why", () => {
    // The mechanism is sharper than "a `B` record the filter drops": the printed
    // status LETTER IS STILL `M`, one path, an `M` with a break score that
    // `RAW_RECORD` parses happily, so a reader checking raw git concludes `AMTU`
    // keeps it. It does not. The score itself is NOT asserted and no digits are
    // quoted, because it moves with how much of the old content survives.
    const root = makeRepo();
    const target = "test/fixtures/rewrite.edi";
    writeFileSync(join(root, "test", "fixtures", "rewrite.edi"), interchange(bulkBody("original")));
    git(root, ["add", "."]);
    commit(root, "base");
    writeFileSync(
      join(root, "test", "fixtures", "rewrite.edi"),
      interchange(bulkBody("replacement"), seg("NTE", "ADD", `SSN ${DASHED_SSN}`)),
    );
    git(root, ["add", target]);

    const raw = (extra: string[]): string =>
      gitOut(root, ["diff", "--cached", "--raw", "--no-renames", ...extra]).trim();
    expect(raw(["-B"]), "git must still break the pair for this premise to hold").toMatch(
      /\bM\d{3}\b/,
    );
    expect(raw(["-B", "--diff-filter=AMTU"]), "the superseded filter loses it").toBe("");
    expect(raw(["-B", "--diff-filter=AMTUB"])).toContain(target);

    // End to end. The shipped argv catches it because it passes no `-B` at all;
    // a copy of the scanner WITH `-B` injected catches it only because `B` is in
    // the filter, and the same copy on an `AMTU` filter exits 0 over the SSN.
    expect(runIn(root, ["--staged"]).code).toBe(1);

    const source = readFileSync(SCANNER_PATH, "utf8");
    expect(source).toContain('"--no-renames",');
    expect(source).toContain('"--diff-filter=AMTUB",');
    const withB = join(dir, "phi-scan-with-B.ts");
    writeFileSync(withB, source.replace('"--no-renames",', '"--no-renames",\n        "-B",'));
    const injected = spawnSync(NODE_BIN, [withB, "--staged"], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    });
    expect(injected.status, `stderr: ${injected.stderr ?? ""}`).toBe(1);
    expect(injected.stderr ?? "").toContain("dashed SSN pattern");

    const blinded = join(dir, "phi-scan-with-B-amtu.ts");
    writeFileSync(
      blinded,
      readFileSync(withB, "utf8").replace('"--diff-filter=AMTUB",', '"--diff-filter=AMTU",'),
    );
    const r = spawnSync(NODE_BIN, [blinded, "--staged"], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    });
    expect(r.status, "the superseded filter is blinded by `-B`").toBe(0);
    expect(r.stdout ?? "").toMatch(/OK - no hits/);
  });
});

// ---------------------------------------------------------------------------
// All mode owes an account of its roots, and existence is not observation
// ---------------------------------------------------------------------------
//
// Two rules, and the second is not implied by the first. A declared walk root
// must BE a directory, and every tracked, non-`.md`, non-gitignored file under
// one must actually have been enumerated by the walk. Both refuse at exit 2 and
// name every offender.
//
// SAY "A DIRECTORY", NEVER "AN ENUMERABLE DIRECTORY", HERE MOST OF ALL. The
// stronger wording was measured FALSE and cut back everywhere else, and a suite
// that keeps it tells a reader these cases cover a root that cannot be READ.
// THEY DO NOT: a root at mode `000` throws an uncaught `EACCES` at exit 1,
// identically at base and at head, and that class is disclosed and deliberately
// left open. Nothing below asserts it, on purpose.
//
// The cases split that way on purpose, because the two failures are different
// shapes with the same symptom. A MISSING root reads clean forever and no run
// looks wrong; an EMPTIED root passes the root check and still contributes
// nothing, which is why a count of what the sweep opened cannot separate them
// (an emptied root contributes zero and a total still looks like a total). Only
// naming the corpus from a source OUTSIDE the walk, the index, tells them apart.
//
// Every case runs against a throwaway git repository and every payload carries
// real identifier shapes, so a green here is never green by construction: the
// controls assert the same bytes are exit 1 when the sweep does open them.

describe("phi-scan: a declared walk root must be a directory", () => {
  it("refuses a root that does not exist, over PHI still in the index (exit 2)", () => {
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    git(root, ["add", "."]);
    commit(root, "base");

    // Non-vacuity: with the root present, this same index is a hit.
    expect(runIn(root, []).code, "premise: the committed payload is detectable").toBe(1);

    rmSync(join(root, "test"), { recursive: true });
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test (does not exist)");
    expect(r.stdout).not.toMatch(/OK/);
    expectNoPhi(r.stderr);
  });

  it("a link AT test/fixtures is now an ENTRY under the test root, and is REFUSED (exit 2)", () => {
    // WHAT THE WALK-ROOT WIDENING BOUGHT, PINNED FROM THE OTHER SIDE. Before
    // `test` became the root, `test/fixtures` WAS one, so a link there was
    // FOLLOWED and everything under it went unreconciled - the disclosed
    // residual below, which read `OK - no hits` at exit 0 once the link target
    // was emptied. It is not a root any more, so the entry rule applies to it
    // and the whole shape is refused outright. The residual did not vanish; it
    // MOVED UP ONE LEVEL, to a link at `test` itself, and that is what the case
    // below now pins.
    const root = makeRepo();
    mkdirSync(join(root, "elsewhere"));
    writeFileSync(join(root, "elsewhere", "violator.edi"), SYNTHETIC_PHI);
    rmSync(join(root, "test", "fixtures"), { recursive: true });
    symlinkSync(join("..", "elsewhere"), join(root, "test", "fixtures"));

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures");
    expect(r.stderr).toContain("a symbolic link");
    expectNoPhi(r.stderr);
  });

  it("refuses a root that NEVER existed, which is the shape that reads clean forever", () => {
    // A root a repository never had makes the gate print clean on every run it
    // ever makes, and nothing about that run looks wrong. Nothing is tracked
    // under it, so the reconciliation below is silent on it: this rule is what
    // catches it, which is why both rules ship together.
    const root = makeRepo();
    rmSync(join(root, "test"), { recursive: true });
    git(root, ["add", "."]);
    commit(root, "base");

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test (does not exist)");
    expect(r.stdout).not.toMatch(/OK - no hits/);

    // Non-vacuity: the root is a real scan root, so restoring it and putting the
    // payload back gives the hit its absence was suppressing.
    mkdirSync(join(root, "test", "fixtures"), { recursive: true });
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    expect(runIn(root, []).code).toBe(1);
  });

  it("refuses a root REPLACED BY A REGULAR FILE rather than dying on ENOTDIR (exit 2)", () => {
    // Measured on this package at `b07c367`: `readdirSync` threw an UNCAUGHT
    // `ENOTDIR` and the process ended at exit 1, which is this scanner's code
    // for "hits found", as a stack trace rather than a refusal. THAT NUMBER IS
    // NOT PORTABLE: `hl7` measures 2 for its version of this shape and
    // `terminology` 1 by a different mechanism. It is re-measured here rather
    // than carried over.
    const root = makeRepo();
    rmSync(join(root, "test"), { recursive: true });
    writeFileSync(join(root, "test"), SYNTHETIC_PHI);

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test (a regular file)");
    // A refusal, not a crash: no stack trace, and no engine internals.
    expect(r.stderr).not.toContain("ENOTDIR");
    expect(r.stderr).not.toContain("readdirSync");
    // The root's own bytes are the payload, and they are never echoed.
    expectNoPhi(r.stderr);
  });

  it("refuses the src root the same way", () => {
    const root = makeRepo();
    rmSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src"), SYNTHETIC_PHI);

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("src (a regular file)");
    expectNoPhi(r.stderr);
  });

  it("still FOLLOWS a root that is itself a symbolic link to a directory (exit 1)", () => {
    // The documented superset behaviour, held in place: `existsSync` and
    // `readdirSync` both follow, and the new check stats through the link for
    // exactly that reason.
    //
    // THE CORPUS IS COMMITTED, AND THAT IS THE POINT OF THE CASE. On an
    // uncommitted tree `git ls-files` is empty, so the reconciliation is
    // satisfied trivially and this case would be green by construction rather
    // than because the property holds. Committed, `git ls-files` returns the
    // LINK'S OWN path `test`, which the walk can never enumerate (it yields
    // `test/<name>`), so without the walk-root exemption in `reconcileObserved`
    // the sweep refuses at exit 2 and this documented superset scan is lost. The
    // premise is asserted off raw git first.
    const root = makeRepo();
    // `test/fixtures` must still resolve to a directory - it is a DECLARED
    // directory even though it is no longer a walk root - so the link target
    // carries one.
    mkdirSync(join(root, "elsewhere", "fixtures"), { recursive: true });
    writeFileSync(join(root, "elsewhere", "violator.edi"), SYNTHETIC_PHI);
    rmSync(join(root, "test"), { recursive: true });
    symlinkSync("elsewhere", join(root, "test"));
    git(root, ["add", "-A"]);
    commit(root, "base");

    expect(
      gitOut(root, ["ls-files", "--", "test"]).trim(),
      "premise: the index carries the link's OWN path, not a path under it",
    ).toBe("test");

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("RIVERA");
    expect(r.stderr).not.toContain("not opened by the sweep");
  });

  it("DISCLOSED RESIDUAL: nothing under a symlinked root is reconciled (exit 0)", () => {
    // 🔴 A refuter broke the universal "the sweep can no longer report clean
    // over a corpus it never opened" with this one tree, so it is pinned here
    // rather than left to be rediscovered.
    //
    // The exemption above spares the ROOT'S OWN index entry. It is not the whole
    // of it: everything the walk reads THROUGH the link lives under the target's
    // own names, which are outside the `git ls-files -- test src` pathspec, so
    // the index side of the comparison is empty for ALL of it. An emptied link
    // target is therefore the emptied-root shape these rules exist to close,
    // still reading clean.
    //
    // 🩺 `PHI-SCAN-WALK-ROOT-SCOPE` DID NOT CLOSE THIS AND WAS NEVER GOING TO -
    // IT MOVED IT UP ONE LEVEL. This case used to be written at `test/fixtures`,
    // which was a root then; that path is now an ENTRY and the case above pins
    // it as a refusal at exit 2. The residual survives verbatim at whatever the
    // OUTERMOST declared root is, which is `test` today. Closing it still means
    // reconciling against a second pathspec derived from the link target, which
    // no repo in the org has done. PRE-EXISTING, disclosed, still open.
    const root = makeRepo();
    // `test/fixtures` must still resolve to a directory - it is a DECLARED
    // directory even though it is no longer a walk root - so the link target
    // carries one.
    mkdirSync(join(root, "elsewhere", "fixtures"), { recursive: true });
    writeFileSync(join(root, "elsewhere", "violator.edi"), SYNTHETIC_PHI);
    rmSync(join(root, "test"), { recursive: true });
    symlinkSync("elsewhere", join(root, "test"));
    git(root, ["add", "-A"]);
    commit(root, "base");

    // Non-vacuity: read through the link, the payload really is a hit.
    expect(runIn(root, []).code, "premise: the payload is detectable").toBe(1);

    // Premise, off raw git: the target's files are NOT under the reconciled
    // pathspec, which is exactly why the reconciliation cannot see them go.
    expect(
      gitOut(root, ["ls-files", "--", "test", "src"])
        .split("\n")
        .filter((l) => l.length > 0),
      "premise: the index names the link, never a path under it",
    ).toEqual(["src/ordinary.ts", "test"]);

    rmSync(join(root, "elsewhere", "violator.edi"));
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/OK - no hits/);
  });
});

describe("phi-scan: the sweep is reconciled against the index, not merely counted", () => {
  it("refuses when a tracked in-scope file was never opened (exit 2)", () => {
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    git(root, ["add", "."]);
    commit(root, "base");

    // Non-vacuity, both directions: present, it is a hit on the NAME detector.
    const before = runIn(root, []);
    expect(before.code, `stderr: ${before.stderr}`).toBe(1);
    expect(before.stderr).toContain("person-name token not in synthetic allow-list");

    // Removed from disk, still in the index. The root still exists, so the root
    // check above passes and the walk simply finds one file fewer.
    rmSync(join(root, "test", "fixtures", "violator.edi"));
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/violator.edi");
    expect(r.stderr).toContain("not opened by the sweep");
    expect(r.stdout).not.toMatch(/OK - no hits/);
    expectNoPhi(r.stderr);
  });

  it("names EVERY unopened file, not just the first", () => {
    // Same rule as the non-regular-entry refusal: a developer who has to re-run
    // the gate once per file learns to distrust it.
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    git(root, ["add", "."]);
    commit(root, "base");

    rmSync(join(root, "test", "fixtures", "violator.edi"));
    rmSync(join(root, "test", "fixtures", "ordinary.edi"));
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/violator.edi");
    expect(r.stderr).toContain("test/fixtures/ordinary.edi");
    expect(r.stderr).toContain("2 tracked in-scope files");
  });

  it("refuses when git cannot list the index at all (exit 2)", () => {
    // "git could not tell me" and "git told me there is nothing" are the two
    // answers this whole reconciliation exists to keep apart, so the first is
    // never allowed to render as the second. `scripts/` is not in the published
    // tarball, so every caller is inside a checkout of this repository.
    const root = mkdtempSync(join(tmpdir(), "x12-phi-scan-nogit-"));
    repos.push(root);
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "src"));
    mkdirSync(join(root, "test", "fixtures"), { recursive: true });
    copyFileSync(
      join(REPO_ROOT, "scripts", "phi-allow-list.txt"),
      join(root, "scripts", "phi-allow-list.txt"),
    );
    writeFileSync(join(root, "src", "ordinary.ts"), "export const answer = 42;\n");

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("could not list the tracked files under the scan roots");
    expect(r.stdout).not.toMatch(/OK - no hits/);
    // The child's own stderr is NOT echoed. git's fatals in this class carry
    // absolute filesystem paths, and a diagnostic about a PHI gate is itself a
    // PHI surface, so only the engine-owned exit status is reported.
    expect(r.stderr).not.toContain("fatal:");
    expect(r.stderr).not.toContain(".git/");
    expectNoPhi(r.stderr);
  });

  it("names an UNMERGED path ONCE, not once per stage (exit 2)", () => {
    // `git ls-files` returns an unmerged path once per stage, so without
    // `--deduplicate` one conflicted fixture is three offenders and a count of
    // three, which falsifies "names every offender" in the direction that makes
    // a developer distrust the gate.
    //
    // DELIBERATELY NOT `git merge`, for the reason `stageUnmerged` documents: it
    // resolves the committer identity up front and reds on CI on its own premise,
    // and a sibling measured a staged real conflict NOT leaving the path unmerged
    // on a newer git at all. `update-index --index-info` is deterministic on any
    // version and needs no identity.
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "conflict.edi"), SYNTHETIC_PHI);
    git(root, ["add", "."]);
    commit(root, "base");

    // Non-vacuity: the committed payload is a hit while it is on disk.
    expect(runIn(root, []).code, "premise: the payload is detectable").toBe(1);

    stageUnmerged(root, "test/fixtures/conflict.edi", "ISA*ours~\n", "ISA*theirs~\n");
    rmSync(join(root, "test", "fixtures", "conflict.edi"));

    // Premise, off raw git: the path really is in the index more than once. The
    // exact number is the stage count and is deliberately not pinned.
    const staged = gitOut(root, ["ls-files", "--", "test/fixtures/conflict.edi"])
      .split("\n")
      .filter((l) => l.length > 0);
    expect(staged.length, "premise: unmerged, so once per stage").toBeGreaterThan(1);

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("1 tracked in-scope file is in the index");
    expect(r.stderr.match(/test\/fixtures\/conflict\.edi/g)).toHaveLength(1);
    expectNoPhi(r.stderr);
  });

  it("does not mask a hit: a corpus fully opened still reports its hits (exit 1)", () => {
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    git(root, ["add", "."]);
    commit(root, "base");

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("RIVERA");
    expect(r.stderr).not.toContain("not opened by the sweep");
  });

  it("a healthy committed corpus is still clean (exit 0)", () => {
    const root = makeRepo();
    git(root, ["add", "."]);
    commit(root, "base");

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/OK - no hits/);
  });

  it("an UNTRACKED extra file does not trip it: the check is one-directional", () => {
    const root = makeRepo();
    git(root, ["add", "."]);
    commit(root, "base");
    writeFileSync(
      join(root, "test", "fixtures", "untracked.edi"),
      interchange("NM1*IL*1*TEST*PATIENT****MI*MEMBER001~"),
    );

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it("a STAGED deletion does not trip it: it is out of the index", () => {
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "fixtures", "extra.edi"),
      interchange("NM1*IL*1*TEST*PATIENT****MI*MEMBER001~"),
    );
    git(root, ["add", "."]);
    commit(root, "base");
    git(root, ["rm", "-q", "test/fixtures/extra.edi"]);

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it("mirrors the walk's `.md` exemption: a tracked `.md` missing from disk is exempt", () => {
    // The expected set is the walk's admissions, not a second stricter boundary.
    // `.md` is exempt in the walk (docs may legitimately describe violators), so
    // it is exempt here. Getting it wrong would refuse a clean tree.
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "notes.md"), "# a doc, not a fixture\n");
    git(root, ["add", "."]);
    commit(root, "base");

    rmSync(join(root, "test", "fixtures", "notes.md"));
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/OK - no hits/);
  });

  it("an UNTRACKED gitignored file is exempt, because it is not in `git ls-files`", () => {
    const root = makeRepo();
    writeFileSync(join(root, ".gitignore"), "test/fixtures/ignored.edi\n");
    git(root, ["add", "."]);
    commit(root, "base");
    writeFileSync(join(root, "test", "fixtures", "ignored.edi"), SYNTHETIC_PHI);

    // The walk already skips it, so it is clean despite carrying the payload.
    // That is PRE-EXISTING behaviour, held in place rather than introduced.
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(0);
  });

  it("a TRACKED gitignored file is NOT exempt, and the pair is consistent on purpose", () => {
    // The short form of the ignore rule is false and it is worth pinning which
    // way. `git check-ignore` consults the index by default: measured here, it
    // answers NOT-IGNORED for a path that is tracked even when a `.gitignore`
    // rule names it. So the walk SCANS such a file, and this check must refuse
    // when it is missing. Both halves are asserted, because the consistency is
    // the claim, not either verdict on its own.
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "ignored.edi"), SYNTHETIC_PHI);
    writeFileSync(join(root, ".gitignore"), "test/fixtures/ignored.edi\n");
    git(root, ["add", "-f", "."]);
    commit(root, "base");

    // Premise, off raw git: check-ignore does not call the tracked path ignored.
    expect(gitOut(root, ["check-ignore", "--no-index", "test/fixtures/ignored.edi"])).toContain(
      "test/fixtures/ignored.edi",
    );
    expect(gitOut(root, ["check-ignore", "test/fixtures/ignored.edi"])).toBe("");

    // Half one: the walk scans it, so the payload is a hit.
    const present = runIn(root, []);
    expect(present.code, `stderr: ${present.stderr}`).toBe(1);
    expect(present.stderr).toContain("RIVERA");

    // Half two: removed from disk, the sweep never opened it, so it refuses.
    rmSync(join(root, "test", "fixtures", "ignored.edi"));
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures/ignored.edi");
    expectNoPhi(r.stderr);
  });
});

// ---------------------------------------------------------------------------
// PHI-SCAN-WALK-ROOT-SCOPE: the enumeration half and the recogniser half
// ---------------------------------------------------------------------------
//
// TWO SIDES, EACH "IN ADDITION TO" THE OTHER, NEVER "INSTEAD OF".
//
// Enumeration: the walk root moved from `test/fixtures` to `test`, and the
// `--staged` clauses from `test/fixtures/**` plus `src/**.ts` to `test/**` plus
// `src/**`. Both are UNIONS - the old scope is a subtree of the new one - so no
// path either route enumerated stops being enumerated. Measured on this package
// at `7d50305`: 306 tracked files, 163 opened by the walk, 143 opened by NEITHER
// route, and 85 of those 143 were tracked `.ts` files under `test/` outside
// `test/fixtures/`. Derive those figures with `git ls-files`; do not trust the
// numbers in this comment, which are a record of one commit.
//
// Recogniser: enumerating those files buys the `scanCommonShapes` floor and
// NOTHING ELSE, because they are `.ts` sources whose fixtures are string
// literals, so `looksLikeX12` is false for every one of them. NAME THE FLOOR AS
// THREE DETECTORS, NEVER TWO: dashed SSN, the `REF*SY` undashed nine-digit SSN
// and a non-test email all reach a bare literal already. The NM1 name, NM1
// member-id, NM1 NPI, PER contact-name, PER communication-number, DMG
// date-of-birth and service-date recognisers did not, and `scanEmbeddedSegments`
// is what closes that half.
//
// Every clean claim below sits BESIDE a positive the same detector does catch. A
// detector zero can be a gap rather than a clearance, and a case that only ever
// asserts exit 0 cannot tell them apart.

/** An inline-fixture source file: segment text inside a `.ts` string literal. */
function inlineFixtureSource(...bodySegments: string[]): string {
  return `export const FIXTURE = [\n${bodySegments.map((s) => `  ${JSON.stringify(s)},`).join("\n")}\n].join("");\n`;
}

describe("phi-scan: tracked files under test/ outside test/fixtures are enumerated", () => {
  it("all mode: a violator DIRECTLY under test/ is a hit (exit 1)", () => {
    const root = makeRepo();
    writeFileSync(join(root, "test", "direct.edi"), SYNTHETIC_PHI);

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("test/direct.edi");
    expect(r.stderr).toContain("person-name token not in synthetic allow-list");
  });

  it("all mode: every subdirectory under test/ is reached, not just the top level", () => {
    const root = makeRepo();
    for (const d of ["property", "scripts", "_helpers"]) {
      mkdirSync(join(root, "test", d), { recursive: true });
      writeFileSync(join(root, "test", d, "leak.edi"), SYNTHETIC_PHI);
    }

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("test/property/leak.edi");
    expect(r.stderr).toContain("test/scripts/leak.edi");
    expect(r.stderr).toContain("test/_helpers/leak.edi");
  });

  it("the reconciliation reaches under test/ too: a tracked file missing from disk refuses", () => {
    // The other half of the enumeration widening, and the one a count cannot buy:
    // a file the sweep never opened is not a file it found clean.
    const root = makeRepo();
    writeFileSync(join(root, "test", "direct.edi"), SYNTHETIC_PHI);
    git(root, ["add", "."]);
    commit(root, "base");

    // Non-vacuity: present, it is a hit.
    expect(runIn(root, []).code, "premise: the payload is detectable").toBe(1);

    rmSync(join(root, "test", "direct.edi"));
    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/direct.edi");
    expect(r.stderr).toContain("not opened");
    expectNoPhi(r.stderr);
  });

  it("--staged: a violator staged DIRECTLY under test/ is a hit (exit 1)", () => {
    // THE COMMIT-BLOCKING ROUTE. Widening it is additive by construction: the
    // clause is a prefix that strictly contains the one it replaced.
    const root = makeRepo();
    writeFileSync(join(root, "test", "direct.edi"), SYNTHETIC_PHI);
    git(root, ["add", "test/direct.edi"]);

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("test/direct.edi");
  });

  it("--staged: a non-`.ts` file under src/ is now in scope as well", () => {
    // The old clause was `src/**.ts`. A staged markdown file under `src/` is
    // outside it and inside the new one; the walk still skips a `.md` by name,
    // so the two routes stay deliberately asymmetric in the direction that costs
    // nothing.
    const root = makeRepo();
    writeFileSync(join(root, "src", "notes.md"), SYNTHETIC_PHI);
    git(root, ["add", "src/notes.md"]);

    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("src/notes.md");

    // Beside it, the walk's own `.md` exemption, unchanged.
    expect(runIn(root, []).code, "the walk still skips a .md by name").toBe(0);
  });
});

describe("phi-scan: the recogniser reaches segment text a string literal is holding", () => {
  it("an inline NM1 person name in a `.ts` fixture is a hit, and an allow-listed one is not", () => {
    const root = makeRepo();
    const leak = join(root, "test", "inline-leak.ts");
    writeFileSync(leak, inlineFixtureSource(seg("NM1", "IL", "1", "SMITH", "ROBERT")));

    const hit = runIn(root, ["test/inline-leak.ts"]);
    expect(hit.code, `stderr: ${hit.stderr}`).toBe(1);
    expect(hit.stderr).toContain("person-name token not in synthetic allow-list");
    expect(hit.stderr).toContain("SMITH");

    // The negative control, same shape, allow-listed tokens. Without it a green
    // here could mean the detector never ran.
    writeFileSync(leak, inlineFixtureSource(seg("NM1", "IL", "1", "DOE", "JANE")));
    expect(runIn(root, ["test/inline-leak.ts"]).code).toBe(0);
  });

  it("the file is NOT an interchange, which is exactly why the old dispatch missed it", () => {
    // `looksLikeX12` asks whether the FILE IS an interchange. Asserted here so a
    // future reader does not conclude the embedded pass is redundant.
    const root = makeRepo();
    const src = inlineFixtureSource(seg("NM1", "IL", "1", "SMITH", "ROBERT"));
    expect(src.startsWith("ISA")).toBe(false);
    writeFileSync(join(root, "test", "inline-leak.ts"), src);
    expect(runIn(root, ["test/inline-leak.ts"]).code).toBe(1);
  });

  it("each segment-aware detector reaches an inline literal", () => {
    const root = makeRepo();
    const cases: readonly (readonly [string, string, string])[] = [
      ["dob", seg("DMG", "D8", "19771103", "M"), "date of birth"],
      ["phone", seg("PER", "IC", "BILLER", "TE", "2124440101"), "phone/fax"],
      ["npi", seg("NM1", "82", "1", "RENDERING", "DOCTOR", "", "", "", "XX", "1992743851"), "NPI"],
      ["date", seg("DTP", "472", "D8", "20190601"), "before 2024"],
      [
        "member",
        seg("NM1", "IL", "1", "TEST", "PATIENT", "", "", "", "MI", "W123456789"),
        "member-id",
      ],
    ];
    for (const [label, segment, reason] of cases) {
      const p = join(root, "test", `inline-${label}.ts`);
      writeFileSync(p, inlineFixtureSource(segment));
      const r = runIn(root, [`test/inline-${label}.ts`]);
      expect(r.code, `${label}: stderr: ${r.stderr}`).toBe(1);
      expect(r.stderr, label).toContain(reason);
    }
  });

  it("a `.ts` file with no segment text and no shapes is clean, and that is not vacuous", () => {
    // ANTI-FABRICATION CONTROL. The clean verdict is only worth something next to
    // the hit above, taken by the same route on the same tree.
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "ordinary.ts"),
      "export const answer = 42;\n// no fixture here at all\n",
    );
    expect(runIn(root, ["test/ordinary.ts"]).code).toBe(0);
    writeFileSync(
      join(root, "test", "ordinary.ts"),
      inlineFixtureSource(seg("NM1", "IL", "1", "SMITH", "ROBERT")),
    );
    expect(runIn(root, ["test/ordinary.ts"]).code).toBe(1);
  });

  it("a whole-file interchange is NOT scanned twice", () => {
    // The embedded pass runs on the plain-text branch only. If it ran on both,
    // every hit in every `.edi` fixture would be reported twice.
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    const r = runIn(root, ["test/fixtures/violator.edi"]);
    expect(r.code).toBe(1);
    const rivera = r.stderr.split("\n").filter((l) => l.includes('value="RIVERA"'));
    expect(rivera.length, `stderr: ${r.stderr}`).toBe(2); // one NM1, one PER
  });

  it("all three routes get the embedded pass, not just the sweep", () => {
    // ENUMERATE THE ROUTES. `paths` runs the same `scanTarget`, and so does
    // `--staged`; a claim about one of them is not a claim about the other two.
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "inline-leak.ts"),
      inlineFixtureSource(seg("NM1", "IL", "1", "SMITH", "ROBERT")),
    );
    expect(runIn(root, []).code, "all").toBe(1);
    expect(runIn(root, ["test/inline-leak.ts"]).code, "paths").toBe(1);
    git(root, ["add", "test/inline-leak.ts"]);
    expect(runIn(root, ["--staged"]).code, "staged").toBe(1);
  });

  it("DISCLOSED COST: the embedded pass skips an element that is not name-shaped", () => {
    // The narrowing exists because a run found inside prose ends at whatever
    // punctuation comes first and can swallow the sentence around it. It applies
    // to the EMBEDDED pass only, and the `.edi` control proves the whole-file
    // path is not narrowed with it.
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "prose.ts"),
      '// NM1*IL*1*DOE? -> elements ["NM1","IL","1","DOE?"]\nexport const x = 1;\n',
    );
    expect(runIn(root, ["test/prose.ts"]).code, "embedded: skipped").toBe(0);

    writeFileSync(
      join(root, "test", "fixtures", "same-bytes.edi"),
      interchange(seg("NM1", "IL", "1", "DOE?")),
    );
    const r = runIn(root, ["test/fixtures/same-bytes.edi"]);
    expect(r.code, `whole-file is NOT narrowed: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("DOE?");
  });

  it("DISCLOSED COST: the embedded pass skips an id element carrying whitespace", () => {
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "table.ts"),
      "// build834          NM1*IL*1*DOE*JANE****34*A1        -> NM1*IL*1*DOE*JANE****34\n",
    );
    expect(runIn(root, ["test/table.ts"]).code, "embedded: skipped").toBe(0);

    writeFileSync(
      join(root, "test", "fixtures", "ssn-qual.edi"),
      interchange(seg("NM1", "IL", "1", "DOE", "JANE", "", "", "", "34", "A1 B2")),
    );
    expect(runIn(root, ["test/fixtures/ssn-qual.edi"]).code, "whole-file is NOT narrowed").toBe(1);
  });

  it("DISCLOSED GAP: an embedded segment under a NON-DEFAULT element separator is not reached", () => {
    // There is no ISA in an embedded run, so there is nothing to declare the
    // delimiters and the pass assumes `*`. Stated as a gap with its control
    // beside it rather than left to be discovered.
    const root = makeRepo();
    writeFileSync(join(root, "test", "piped.ts"), 'export const F = "NM1|IL|1|SMITH|ROBERT~";\n');
    expect(runIn(root, ["test/piped.ts"]).code, "not reached: disclosed").toBe(0);

    writeFileSync(
      join(root, "test", "piped.ts"),
      `export const F = ${JSON.stringify(seg("NM1", "IL", "1", "SMITH", "ROBERT"))};\n`,
    );
    expect(runIn(root, ["test/piped.ts"]).code, "the same segment under `*` IS reached").toBe(1);
  });

  it("🩺 an APOSTROPHE in a name does not truncate the run, and the whole segment is still read", () => {
    // 🛑 A REFUTER FOUND THIS AND IT WAS THE SHARPEST FINDING OF THE SLICE. The
    // first draft put `\'` in `EMBEDDED_RUN_STOP`, by symmetry with `"`, and also
    // allowed it in the name class - which made that branch DEAD. The failure was
    // not a skipped element: the run was TRUNCATED at the apostrophe, so every
    // element after it ceased to exist, and the member id, the qualifier-34 SSN
    // and the non-555 phone in the same segment went with the surname.
    const root = makeRepo();
    const p = join(root, "test", "apostrophe.ts");

    writeFileSync(
      p,
      `export const S = ${JSON.stringify(seg("NM1", "IL", "1", "O'BRIEN", "SEAN", "", "", "", "MI", "W123456789"))};\n`,
    );
    const name = runIn(root, ["test/apostrophe.ts"]);
    expect(name.code, `stderr: ${name.stderr}`).toBe(1);
    expect(name.stderr, "the surname").toContain("BRIEN");
    expect(name.stderr, "and the element AFTER the apostrophe").toContain("W123456789");

    writeFileSync(
      p,
      `export const S = ${JSON.stringify(seg("NM1", "IL", "1", "O'BRIEN", "SEAN", "", "", "", "34", "123456789"))};\n`,
    );
    expect(runIn(root, ["test/apostrophe.ts"]).stderr).toContain("SSN (NM1 qualifier 34)");

    writeFileSync(
      p,
      `export const S = ${JSON.stringify(seg("PER", "IC", "JOHN O'BRIEN", "TE", "2124440101"))};\n`,
    );
    expect(runIn(root, ["test/apostrophe.ts"]).stderr).toContain("phone/fax");
  });

  it("🩺 a surname is NOT an ASCII string: a non-ASCII name element is still checked", () => {
    // The name class is `\p{L}` plus combining marks. With `[A-Za-z]` both
    // elements below were skipped and the file reported clean.
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "unicode.ts"),
      `export const S = ${JSON.stringify(seg("NM1", "IL", "1", "NU\u00d1EZ", "JOS\u00c9"))};\n`,
    );
    const r = runIn(root, ["test/unicode.ts"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("person-name token");
  });

  it("DISCLOSED GAP: a segment split across a CONCATENATION is not reached", () => {
    // Named because the list of what this pass cannot see is NOT a closed census
    // and a draft published it as one. The control beside it is what makes the
    // zero a gap rather than a clearance.
    const root = makeRepo();
    const whole = seg("NM1", "IL", "1", "MCALLISTER", "BRENDAN");
    const cut = whole.indexOf("MCALLISTER");
    // Built, not written: this file is inside a walk root, so a literal here
    // would red the gate. That is the rule at the top, applying to itself.
    writeFileSync(
      join(root, "test", "split.ts"),
      `export const S = ${JSON.stringify(whole.slice(0, cut))} + ${JSON.stringify(whole.slice(cut))};\n`,
    );
    expect(runIn(root, ["test/split.ts"]).code, "not reached: disclosed").toBe(0);

    writeFileSync(join(root, "test", "split.ts"), `export const S = ${JSON.stringify(whole)};\n`);
    expect(runIn(root, ["test/split.ts"]).code, "the same bytes unsplit ARE reached").toBe(1);
  });

  it("DISCLOSED GAP: bytes inside a `${...}` placeholder leave this pass's view entirely", () => {
    // The strip keeps an interpolated fixture's ELEMENT POSITIONS, which is why
    // it is done - but say the other half too: what it removes is not checked.
    const root = makeRepo();
    const whole = seg("NM1", "IL", "1", "MCALLISTER", "BRENDAN");
    const interpolated = whole.replace(
      "MCALLISTER",
      ["${", JSON.stringify("MCALLISTER"), "}"].join(""),
    );
    writeFileSync(
      join(root, "test", "interp.ts"),
      ["export const S = `", interpolated, "`;\n"].join(""),
    );
    const r = runIn(root, ["test/interp.ts"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr, "the literal element IS checked").toContain("BRENDAN");
    expect(r.stderr, "the interpolated one is NOT: disclosed").not.toContain("MCALLISTER");
  });

  it("DISCLOSED GAP: a fixture expressed as a BUILDER SPEC OBJECT is segment text to nobody", () => {
    // 🩺 FOUND BY HAND-READING THE 85 FILES THE WIDENING OPENED, NOT BY THE GATE.
    // A name in `{ lastName: "…" }` becomes a segment only when the builder runs,
    // so no static pass can see it - not the embedded one, not the shape floor.
    // Measured in this repository: `test/transactions-premium-820-build.test.ts`
    // and `test/transactions-eligibility-271-build.test.ts` both carry `SMITH`
    // that way, as an org name and a placeholder surname. Neither is PHI and
    // both were read; what is pinned here is that the gate is SILENT on the
    // shape, so a future reader does not mistake its silence for coverage.
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "spec.ts"),
      'export const S = { lastName: "MARGUERITE", dateOfBirth: "19771103" };\n',
    );
    expect(runIn(root, ["test/spec.ts"]).code, "not reached: disclosed, not claimed").toBe(0);

    // The same two values AS SEGMENT TEXT are both hits, which is what makes the
    // zero above a gap rather than a clearance.
    writeFileSync(
      join(root, "test", "spec.ts"),
      `export const S = ${JSON.stringify(seg("NM1", "IL", "1", "MARGUERITE", "JANE"))};\n`,
    );
    expect(runIn(root, ["test/spec.ts"]).code).toBe(1);
    writeFileSync(
      join(root, "test", "spec.ts"),
      `export const S = ${JSON.stringify(seg("DMG", "D8", "19771103", "F"))};\n`,
    );
    expect(runIn(root, ["test/spec.ts"]).code).toBe(1);
  });

  it("the three-detector floor still reaches a bare literal, in addition to the new pass", () => {
    // The floor was never blind to a string literal; that is why enumerating
    // these files was only half the item. Pinned so a future narrowing of the
    // embedded pass cannot be mistaken for a narrowing of this.
    const root = makeRepo();
    for (const [name, body, reason] of [
      ["ssn.ts", `export const S = "${["123", "45", "6789"].join("-")}";\n`, "dashed SSN"],
      ["ref.ts", `export const S = ${JSON.stringify(seg("REF", "SY", "222334444"))};\n`, "REF"],
      ["mail.ts", `export const S = "${["real", "gmail.com"].join("@")}";\n`, "email"],
    ] as const) {
      writeFileSync(join(root, "test", name), body);
      const r = runIn(root, [`test/${name}`]);
      expect(r.code, `${name}: ${r.stderr}`).toBe(1);
      expect(r.stderr, name).toContain(reason);
    }
  });
});

describe("phi-scan: an allow-list entry is GLOBAL and ROUTE-BLIND, and that is its cost", () => {
  // `@cosyte/synth` shipped an `INTRODUCED` major here: a worker's grid and its
  // scope test were BOTH structurally blind to the fact that adding a token
  // clears that literal on the commit-blocking route too. These cases exist to
  // make the cost observable rather than argued.
  it("a declared member id clears on `--staged`, not only on the sweep", () => {
    const root = makeRepo();
    const declared = seg("NM1", "IL", "1", "DOE", "JANE", "", "", "", "MI", "OLD-MEM");
    const undeclared = seg("NM1", "IL", "1", "DOE", "JANE", "", "", "", "MI", "NEW-MEM");

    writeFileSync(join(root, "test", "fixtures", "declared.edi"), interchange(declared));
    git(root, ["add", "test/fixtures/declared.edi"]);
    expect(runIn(root, ["--staged"]).code, "staged: the entry clears here too").toBe(0);
    expect(runIn(root, []).code, "all: and here").toBe(0);

    // Beside it, the sibling nobody declared. Without this the clean verdict
    // above could mean the member-id check simply never ran.
    writeFileSync(join(root, "test", "fixtures", "undeclared.edi"), interchange(undeclared));
    git(root, ["add", "test/fixtures/undeclared.edi"]);
    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("NEW-MEM");
  });

  it("a declared NAME token clears on `--staged` too, and an undeclared one does not", () => {
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "fixtures", "declared.edi"),
      interchange(seg("NM1", "IL", "1", "OLDLAST", "OLDFIRST")),
    );
    writeFileSync(
      join(root, "test", "fixtures", "undeclared.edi"),
      interchange(seg("NM1", "IL", "1", "OLDLAST", "MARGUERITE")),
    );
    git(root, ["add", "test/fixtures/declared.edi"]);
    expect(runIn(root, ["--staged"]).code).toBe(0);

    git(root, ["add", "test/fixtures/undeclared.edi"]);
    const r = runIn(root, ["--staged"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("MARGUERITE");
  });

  it("declaring an id does NOT clear it as a person NAME: the tags are disjoint", () => {
    const root = makeRepo();
    writeFileSync(
      join(root, "test", "fixtures", "as-name.edi"),
      interchange(seg("NM1", "IL", "1", "OLD-MEM", "JANE")),
    );
    const r = runIn(root, ["test/fixtures/as-name.edi"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("person-name token");
  });
});

describe("phi-scan: this file's own controls are assembled, and the gate reads it", () => {
  it("the gate is clean over this file, and a literal violator in it would NOT be", () => {
    // 🛑 THE TRIPWIRE FOR THE RULE AT THE TOP OF THIS FILE. The clean verdict is
    // asserted BESIDE the failure a literal violator produces, so a future
    // author who writes one gets a red here as well as a red gate.
    const self = join("test", "scripts", "phi-scan.test.ts");
    expect(runScanner([self]).code, "this file is clean as committed").toBe(0);

    const root = makeRepo();
    const copy = join(root, "test", "self-copy.ts");
    copyFileSync(join(REPO_ROOT, self), copy);
    expect(runIn(root, ["test/self-copy.ts"]).code, "the copy is clean too").toBe(0);

    appendFileSync(copy, `\nconst LITERAL = ${JSON.stringify(NAME_VIOLATOR)};\n`);
    const r = runIn(root, ["test/self-copy.ts"]);
    expect(r.code, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("SMITH");
  });
});

describe("phi-scan: a DECLARED directory is a wider list than the walk roots", () => {
  // 🩺 FOUND BY THE BASE/HEAD GRID, NOT BY REASONING, AND IT IS THE ONE CELL OF
  // `PHI-SCAN-WALK-ROOT-SCOPE` THAT WAS NOT ADDITIVE. When `test/fixtures` was a
  // walk root, deleting it refused at exit 2. Widening the walk to `test` made it
  // an ordinary subdirectory, and on a tree whose corpus is not yet COMMITTED the
  // same deletion read `OK - no hits` at exit 0: the whole fixture corpus gone,
  // the gate clean. `reconcileObserved` covers the committed case and only the
  // committed case, so the declaration is kept separately from the walk.
  it("test/fixtures must still BE a directory, even though it is no longer walked", () => {
    const root = makeRepo();
    rmSync(join(root, "test", "fixtures"), { recursive: true });

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures (does not exist)");
    expect(r.stdout).not.toMatch(/OK/);
  });

  it("test/fixtures replaced by a regular file refuses rather than being scanned as one", () => {
    const root = makeRepo();
    rmSync(join(root, "test", "fixtures"), { recursive: true });
    writeFileSync(join(root, "test", "fixtures"), SYNTHETIC_PHI);

    const r = runIn(root, []);
    expect(r.code, `stderr: ${r.stderr}`).toBe(2);
    expect(r.stderr).toContain("test/fixtures (a regular file)");
    expectNoPhi(r.stderr);
  });

  it("but the walk roots themselves stay DISJOINT: no file is enumerated twice", () => {
    // The reason `test` REPLACES `test/fixtures` in the walk instead of joining
    // it. Nested roots enumerate a fixture twice and report every hit twice.
    const root = makeRepo();
    writeFileSync(join(root, "test", "fixtures", "violator.edi"), SYNTHETIC_PHI);
    const r = runIn(root, []);
    expect(r.code).toBe(1);
    const files = r.stderr.split("\n").filter((l) => l.startsWith("[phi-scan] HIT:"));
    expect(files.length, `stderr: ${r.stderr}`).toBe(1);
    expect(r.stderr).toMatch(/across 1 file/);
  });
});

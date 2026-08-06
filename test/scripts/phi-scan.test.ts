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
    const hit = write("runner-hit.edi", interchange("NM1*IL*1*SMITH*ROBERT****MI*MEMBER001~"));
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
    const p = write("name.edi", interchange("NM1*IL*1*SMITH*ROBERT****MI*MEMBER001~"));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/SMITH/);
  });

  it("pre-2024 service date", () => {
    const p = write("date.edi", interchange("DTP*472*D8*20190601~"));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/before 2024/);
  });

  it("date of birth not in the allow-list", () => {
    const p = write("dob.edi", interchange("DMG*D8*19771103*M~"));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/date of birth/);
  });

  it("date of birth with a non-D8 format qualifier still trips", () => {
    const p = write("dob-nod8.edi", interchange("DMG**19771103*M~"));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/date of birth/);
  });

  it("member-id shape not recognized as synthetic", () => {
    const p = write("mbr.edi", interchange("NM1*IL*1*TEST*PATIENT****MI*W123456789~"));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/member-id/);
  });

  it("NPI shape not recognized as synthetic", () => {
    const p = write("npi.edi", interchange("NM1*82*1*RENDERING*DOCTOR****XX*1992743851~"));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/NPI/);
  });

  it("dashed SSN anywhere", () => {
    const p = write("ssn.edi", interchange("REF*SY*123-45-6789~"));
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/SSN/);
  });

  it("non-test email domain", () => {
    const p = write("email.edi", interchange("PER*IC*BILLER*TE*5551234500*EM*real@gmail.com~"));
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
    const p = write("leak.txt", "patient ssn 123-45-6789 leaked into a comment");
    const r = runScanner([p]);
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/SSN/);
  });
});

describe("phi-scan: --allow-fixture override gate", () => {
  it("rejects --allow-fixture without an override-log entry (exit 2)", () => {
    const p = write("violator.edi", interchange("NM1*IL*1*SMITH*ROBERT****MI*W1~"));
    const r = runScanner(["--allow-fixture", p]);
    expect(r.code).toBe(2);
    expect(r.stderr).toMatch(/phi-scan-overrides\.md/);
  });

  it("honors --allow-fixture WITH an override-log entry (exit 0)", () => {
    const p = write("violator2.edi", interchange("NM1*IL*1*SMITH*ROBERT****MI*W1~"));
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
  "NM1*IL*1*RIVERA*JUANITA****MI*MEMBER001~",
  "DMG*D8*19780314*F~",
  "PER*IC*JUANITA RIVERA*TE*2124440101~",
  "REF*SY*123456789~",
  "NTE*ADD*SSN 123-45-6789~",
);

/** The link target's own name carries a synthetic name, so an echo of it is visible. */
const TARGET_NAME = "RIVERA-JUANITA-19780314.edi";

/** Tokens that must never appear in a refusal message. */
const PHI_TOKENS = ["RIVERA", "JUANITA", "19780314", "123-45-6789", "123456789", TARGET_NAME];

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
    expect(r.stderr).toContain("123-45-6789");
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

  it("a staged link OUTSIDE the route's scope is left alone (the scope is unchanged)", () => {
    // `--staged` only ever covered `test/fixtures/**` and `src/**.ts`. The mode
    // check narrows what that scope admits; it does not widen the scope, and
    // saying otherwise would overstate what this closes.
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
    writeFileSync(
      join(root, "test", "fixtures", "renamed.edi"),
      interchange("NM1*IL*1*RIVERA*JUANITA****MI*MEMBER001~"),
    );
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
      interchange("NM1*IL*1*RIVERA*JUANITA****MI*MEMBER001~"),
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

  it("an unmerged path OUTSIDE the route's scope does not refuse (the scope is unchanged)", () => {
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
      interchange(bulkBody("replacement"), "NTE*ADD*SSN 123-45-6789~"),
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

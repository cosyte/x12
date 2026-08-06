#!/usr/bin/env tsx
/**
 * `@cosyte/x12` PHI scanner - the CI / pre-commit half of the PHI commit-gate.
 *
 * Pure Node. Zero runtime deps. Walks the synthetic test fixtures (and a
 * conservative text pass over `src/`) and REFUSES anything that looks like real
 * PHI, so a developer cannot commit a real-looking X12 fixture by accident.
 *
 * X12 carries PHI by design (member ids, patient / subscriber names, dates of
 * service, SSNs, contact phones/emails). Unlike HL7 or JSON, an X12 `.edi` file
 * is byte-strict: the ISA segment must start at byte 0, so an inline
 * `# synthetic: true` header is impossible - it would break every parser test.
 * This is the same constraint DICOM hits with binary `.dcm` files, and we solve
 * it the same proven way: a **synthetic allow-list** (`scripts/phi-allow-list.txt`)
 * is the positive declaration that a fixture's identifiers are fake. Any
 * realistic-PHI-shaped token not covered by the allow-list is a hit. Adding a
 * new synthetic fixture therefore means either reusing known-synthetic tokens or
 * consciously extending the allow-list - a reviewed act, never silent.
 *
 * SECURITY: every subprocess is `git`, invoked via `execFileSync` with array
 * args only. Never shell-form spawn.
 *
 * Modes:
 *   --staged                 - scan only files staged in `git diff --cached`
 *   --allow-fixture <path>   - bypass one path; rejected unless logged in
 *                              phi-scan-overrides.md
 *   <path> [<path>...]       - scan specific paths
 *   (no args)                - scan all in-scope working-tree files
 *
 * Exit codes: 0 (clean), 1 (hits found), 2 (invocation error).
 *
 * ---------------------------------------------------------------------------
 * AN IN-SCOPE ENTRY THAT IS NOT A REGULAR FILE REFUSES THE SCAN (exit 2). It is
 * never silently skipped, because BOTH enumerating routes are blind to it in a
 * way that reads as clean. Measured on `5779542`, on a throwaway repo laid out
 * like this one, with an `.edi` payload whose NM1 person name, DMG date of
 * birth, PER phone and `REF*SY` SSN are all hits when the same bytes sit at a
 * regular file (exit 1):
 *
 *   - the walk enumerates `Dirent.isFile()`, which is an lstat answer, so a
 *     symbolic link is neither a file nor a directory and used to fall out of
 *     the loop silently, whatever it pointed at. A link under `test/fixtures`,
 *     a link under `src/`, and a linked DIRECTORY (taking a whole subtree with
 *     it) each reported `OK - no hits` at exit 0;
 *   - `--staged` reads content with `git show :<path>`, and git stores a
 *     symbolic link as its TARGET PATH under mode 120000, so that route is
 *     handed the path text and never the target's bytes. A staged link
 *     reported `OK - no hits` at exit 0, and `git show` returned the target
 *     path verbatim.
 *
 * Neither route is made to follow an ENTRY it enumerated: following would read
 * bytes the enumeration does not control (outside the repo, a loop, a device, a
 * FIFO that blocks the gate forever), and git does not carry those bytes anyway,
 * so a hit on them would be a claim about something no commit contains. Refusing
 * states the only true thing available: there is an entry here the scan cannot
 * account for, so the scan is not clean.
 *
 * That is a statement about an ENTRY, not about a scan ROOT, and the difference
 * is worth stating because the sentence reads absolute otherwise. A walk root
 * that is ITSELF a link is still followed, because `existsSync` and
 * `readdirSync` both follow: measured identically at base and head, with
 * `test/fixtures` pointing outside, the walk enumerates the target's files
 * under their `test/fixtures/*` names and HITS (exit 1). That direction is a
 * superset scan rather than a blind one, so it is left alone here.
 *
 * `--diff-filter=AMTUB` INCLUDES `T`, AND LEAVING IT OUT MAKES THE MODE CHECK
 * UNREACHABLE FOR AN ALREADY-TRACKED FILE. Replacing a TRACKED regular file
 * with a link is neither an add nor a modify: measured here, `git diff --cached
 * --raw --diff-filter=AM` returned ZERO rows for that change while the
 * unfiltered `--raw` showed `:100644 120000 ... T`. Admitting `T` also picks up
 * the reverse typechange, a link replaced by a real file bearing PHI.
 *
 * THE `--staged` ARGV DOES NOT TRUST THE CALLER'S GIT CONFIG, AND THAT IS ONE
 * RULE RATHER THAN THREE FIXES. A caller's `diff.renames`, `diff.renameLimit`
 * and `diff.ignoreSubmodules` could each empty this route's list without
 * changing a byte of the index, and the filter alone could not reach any of
 * them. So the argv pins all three: `--no-renames` (a `git mv` into a scan root
 * staged as a two-path `R` record that no filter admitting only single-path
 * statuses can return, whether it moved a link or a fixture with a real name
 * substituted into it, and a `C` record does the same under
 * `diff.renames=copies`), `--ignore-submodules=none` (with
 * `diff.ignoreSubmodules=all`, a staged gitlink vanished from `--raw` outright),
 * and `U` plus `B` in the filter (an unmerged path has no stage-0 blob to read
 * and was silently absent; a broken pair is classified `B` whatever letter it
 * prints, so `-B` blinds an `AMTU` filter). Every one of the five was measured
 * at exit 0 over a payload that hits as an ordinary add. The argv's own comment
 * carries each measurement.
 *
 * "In scope" is each route's own existing boundary, not a new one: the walk
 * still excludes a gitignored entry (the same rule that already excludes a
 * gitignored file, so links do not get a second, stricter boundary of their
 * own), and `--staged` still only looks at `test/fixtures/**` and `src/**.ts`.
 * This narrows what those scopes ADMIT; it does not widen the scopes.
 *
 * `paths` mode is deliberately unchanged, because it was never blind: it reads
 * with `readFileSync`, which FOLLOWS a link, so a named path that is a link to
 * a PHI-bearing file is scanned and hits (measured: exit 1 on the payload
 * above). A path is an explicit operand the caller chose, not something an
 * enumeration handed us.
 *
 * A refusal names the entry's own repo-relative path and an engine-owned token
 * for its kind. IT NEVER REPORTS THE LINK TARGET, which is text off the working
 * tree and can itself carry PHI. A target path of the shape
 * `<surname>-<given>-<dob>.edi` is the whole reason, and that shape is written
 * out rather than an example, because a diagnostic ABOUT a PHI leak is itself a
 * PHI surface, and that applies to the prose explaining it too. Measured at
 * base, the target text is not merely retained but SCANNED: a staged link whose
 * target name was a dashed-SSN shape exited 1 and printed that shape, because
 * `git show` handed the path text to `scanCommonShapes`.
 *
 * ALL MODE OWES AN ACCOUNT OF ITS ROOTS, AND EXISTENCE IS NOT OBSERVATION. Two
 * rules, and the second is not implied by the first. `refuseUnusableRoots`
 * requires each declared root to BE a directory; `reconcileObserved` requires
 * every tracked, non-`.md`, non-gitignored file under a root to have been one of
 * the files the walk actually enumerated. Both refuse at exit 2 and name every
 * offender. SAY "BE A DIRECTORY", NEVER "BE ENUMERABLE": an earlier wording said
 * the second and was measurably false, because a directory the process cannot
 * open passes the type check and then throws. Measured here on a throwaway repo
 * laid out like this one, against the same synthetic payload, all at exit 0 or a
 * crash before:
 *
 *   - with BOTH walk roots absent, and with `test/fixtures` alone absent, the
 *     walk returned immediately and all-mode printed `OK - no hits` at exit 0.
 *     A root that never existed is the worst shape of this, because the gate
 *     then reads clean on every run it ever makes and no run looks wrong;
 *   - with the roots present but EMPTIED on disk while their files were still in
 *     the index, all-mode printed `OK - no hits` at exit 0 over a corpus whose
 *     committed bytes are hits. That is why a count does not close this: an
 *     emptied root contributes zero and a total still looks like a total, so the
 *     only thing that separates "read it and found nothing" from "never opened
 *     it" is naming the corpus from the index and checking the walk against it;
 *   - with a walk root REPLACED BY A REGULAR FILE, `readdirSync` threw an
 *     UNCAUGHT `ENOTDIR` and the process ended at exit 1, which is this
 *     scanner's code for "hits found", as a stack trace rather than a refusal.
 *     A root that is a FIFO ended the same way. THAT NUMBER IS NOT PORTABLE:
 *     `hl7` measures 2 for its version of this shape and `terminology` 1 by a
 *     different mechanism, so re-measure per repo rather than carrying one over.
 *
 * A root that is itself a symbolic link to a directory is still followed, as
 * before: `rootProblem` stats through the link deliberately, and where that link
 * is TRACKED, `reconcileObserved` exempts its own index entry so the superset
 * scan completes instead of refusing. Both halves are pinned on a committed
 * corpus, because on an uncommitted one the reconciliation is vacuous.
 *
 * 🩺 SO SAY "WITHIN THE DECLARED ROOTS, AS GIT NAMES THEM", NEVER A UNIVERSAL
 * OVER ANY CORPUS. What the two rules close is a sweep reporting clean over the
 * files `git ls-files` returns for `test/fixtures` and `src`. A corpus reached
 * through a SYMLINKED root is not among them, and the first item below is the
 * measured counterexample. A draft stated the universal and a refuter broke it
 * with one tree.
 *
 * KNOWN AND NOT CLOSED HERE, so a reader does not mistake the above for more
 * than it is:
 *   - A SYMLINKED WALK ROOT'S TARGET CORPUS IS NOT RECONCILED AT ALL, not merely
 *     the root entry that `reconcileObserved` exempts. Everything the walk reads
 *     through the link lives under the target's own names, OUTSIDE the
 *     `git ls-files -- test/fixtures src` pathspec, so the index side of the
 *     comparison is empty for all of it. Measured at head with
 *     `test/fixtures -> ../elsewhere` and a committed `elsewhere/violator.edi`:
 *     present, exit 1; removed from disk but still in the index, `OK - no hits`
 *     at EXIT 0. That is the EMPTIED-ROOT shape these rules exist to close,
 *     alive through the exempted path. It is PRE-EXISTING (base is exit 0 over
 *     the same tree) and so not a regression, and closing it means reconciling
 *     against a second pathspec derived from the link target, which is the same
 *     scope decision as the two below. Disclosed rather than closed.
 *   - A ROOT THAT IS A DIRECTORY THE PROCESS CANNOT READ IS NOT CAUGHT, and this
 *     is the boundary of the first rule rather than a slip in it. Measured
 *     identically at base and at head, with `test/fixtures` at mode `000` over a
 *     committed PHI payload: `readdirSync` throws an UNCAUGHT `EACCES` and the
 *     process ends at exit 1, the same shape the regular-file root used to have.
 *     An unreadable SUBDIRECTORY under a root, and the window between
 *     `refuseUnusableRoots` and `walk`, end the same way. Closing the class means
 *     tolerating or classifying a failed directory read, which is the deferred
 *     enumerate-then-read remedy below pulling in the same direction, so it
 *     belongs there and not here. It is nonzero, so it is not a false clean.
 *   - the `--staged` route's scope is still `test/fixtures/**` plus `src/**.ts`,
 *     and the walk's roots are still `test/fixtures` and `src`. Two consequences
 *     were measured and are left open, both PRE-EXISTING and both a scope
 *     decision rather than this one: a tracked file directly under `test/` is
 *     enumerated by NEITHER route (exit 0 over a payload that hits as an
 *     ordinary fixture), and an index entry at exactly a scan root's own path
 *     (`test/fixtures`, `src`) matches no `--staged` clause, because every
 *     clause tests a `<root>/` PREFIX (exit 0 over the same payload staged
 *     there). NEITHER IS CLOSED BY THE RECONCILIATION ABOVE, and the reason is
 *     worth stating because it reads as though it should be: the reconciliation
 *     checks the walk against the index WITHIN the declared scope, so a path
 *     nothing declares in scope is absent from both sides of the comparison and
 *     the check is silent on it. Widening the scope is the remedy, and it is a
 *     slice of its own because ENUMERATING THOSE FILES BUYS ONLY THE
 *     `scanCommonShapes` FLOOR: they are `.ts` sources whose fixtures are string
 *     literals, so `looksLikeX12` is false for them and the NM1 name, DMG date
 *     of birth, PER phone and service-date recognisers never run. NAME THAT
 *     FLOOR AS THREE DETECTORS AND NEVER AS TWO. A draft of this header said
 *     "the dashed-SSN and email floor" and a refuter measured it false: the
 *     `REF*SY` undashed nine-digit SSN recogniser is NOT segment-aware either,
 *     and it fires on a bare string literal exactly as the other two do. The
 *     two-detector wording understated the deferred scope by precisely the
 *     shape a dashed-SSN regex cannot see, which is the worst direction for it
 *     to be wrong in. Widening the enumeration and widening the recogniser are
 *     two sides of it, each in addition to the other. Measured on this
 *     package's own corpus today, the
 *     current recogniser over the tracked non-fixture files under `test/` finds
 *     8 shapes in exactly one file, `test/scripts/phi-scan.test.ts`, which is
 *     this scanner's own negative-control corpus; excusing it needs an exclusion
 *     surface that does not exist, because a bare `--allow-fixture` seeds the
 *     positional path set and selects `paths` mode.
 *   - the enumerate-then-read window in `all` mode is untouched: this scan
 *     lists its roots first and reads each file afterwards, so a file deleted
 *     inside that window makes the read throw and the whole sweep refuse. That
 *     is a separate remedy pulling the opposite way (it TOLERATES a failed
 *     read) and it belongs in its own slice. The reconciliation above does not
 *     change its reachability: it runs on the enumeration, before any target is
 *     read, and it neither widens a root nor reads a file.
 * ---------------------------------------------------------------------------
 */

import { readFileSync, statSync, existsSync, readdirSync, type Dirent, type Stats } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, relative, sep, isAbsolute } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
const ALLOW_LIST_PATH = join(REPO_ROOT, "scripts", "phi-allow-list.txt");
const OVERRIDE_LOG_PATH = join(REPO_ROOT, "phi-scan-overrides.md");

// Roots walked in "all" mode. test/fixtures gets the full X12-aware scan;
// src gets the conservative `scanCommonShapes` text pass because it is
// hand-written code, not data - JSDoc `@example` snippets must not trip it.
// THAT PASS IS THREE DETECTORS, NOT TWO: dashed SSN, the `REF*SY` undashed
// nine-digit SSN, and a non-test email. This comment used to say "dashed-SSN +
// non-test email only" and it was measurably false - `REF*SY` is not
// segment-aware and fires on a bare string literal. Derive the set from
// `scanCommonShapes` rather than trusting any prose count of it, here included.
const FIXTURE_ROOT = join(REPO_ROOT, "test", "fixtures");
const SRC_ROOT = join(REPO_ROOT, "src");

/**
 * The declared walk roots, as (absolute, repo-relative) pairs. All-mode owes an
 * account of every one of them: see `refuseUnusableRoots` (each must BE a
 * directory) and `reconcileObserved` (every tracked file under one must actually
 * have been opened). The repo-relative half is what a refusal prints and what
 * the `git ls-files` pathspec uses.
 */
const WALK_ROOTS: readonly { abs: string; rel: string }[] = [
  { abs: FIXTURE_ROOT, rel: "test/fixtures" },
  { abs: SRC_ROOT, rel: "src" },
];

// Service / transaction-date segments. Their dates are CCYYMMDD and a real feed
// would carry a past date; synthetic fixtures use 2024+. DMG (date of birth) is
// deliberately NOT here - a synthetic DOB is legitimately decades old, so DOBs
// are gated by the allow-list instead (DOB: lines), not by this cutoff.
const DATE_SEGMENTS = new Set<string>(["DTP", "DTM", "BHT", "GS"]);
const SERVICE_DATE_CUTOFF_YEAR = 2024;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Hit {
  path: string;
  segment: string; // segment id or "(text)"
  value: string;
  reason: string;
}

interface AllowList {
  /** Uppercase synthetic person-name tokens (NM1 / PER name elements). */
  names: Set<string>;
  /** Synthetic dates of birth, raw CCYYMMDD. */
  dobs: Set<string>;
  /** Synthetic id values that legitimately match an SSN/EIN/9-digit shape. */
  ids: Set<string>;
  /** Allowed email domains (anything else is a hit). */
  emailDomains: Set<string>;
}

interface Args {
  mode: "all" | "staged" | "paths";
  paths: string[];
  allowFixtures: string[];
}

class InvocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvocationError";
  }
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Args {
  let staged = false;
  const paths: string[] = [];
  const allowFixtures: string[] = [];
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a === "--") {
      for (let j = i + 1; j < argv.length; j += 1) {
        const v = argv[j];
        if (v !== undefined) paths.push(v);
      }
      break;
    } else if (a === "--staged") {
      staged = true;
      i += 1;
    } else if (a === "--allow-fixture") {
      const next = argv[i + 1];
      if (next === undefined) {
        throw new InvocationError("--allow-fixture requires a path argument");
      }
      allowFixtures.push(next);
      i += 2;
    } else if (a !== undefined && a.startsWith("--")) {
      throw new InvocationError(`Unknown flag: ${a}`);
    } else if (a !== undefined) {
      paths.push(a);
      i += 1;
    } else {
      i += 1;
    }
  }

  if (staged && paths.length > 0) {
    throw new InvocationError("--staged cannot be combined with positional paths");
  }

  // An `--allow-fixture` path is a *subtractive* acknowledgement on a broader
  // scan, never a scan target on its own - so it also seeds the positional path
  // set. That makes `--allow-fixture X` mean "scan X, but allow it" (proving the
  // override gate actually subtracts a scanned target) instead of a silent no-op.
  const scanPaths = paths.length > 0 ? paths : [...allowFixtures];

  let mode: Args["mode"];
  if (staged) {
    mode = "staged";
  } else if (scanPaths.length > 0) {
    mode = "paths";
  } else {
    mode = "all";
  }
  return { mode, paths: scanPaths, allowFixtures };
}

// ---------------------------------------------------------------------------
// Allow-list + override log
// ---------------------------------------------------------------------------

function loadAllowList(): AllowList {
  if (!existsSync(ALLOW_LIST_PATH)) {
    throw new InvocationError(`allow-list not found at ${ALLOW_LIST_PATH}`);
  }
  const raw = readFileSync(ALLOW_LIST_PATH, "utf8");
  const names = new Set<string>();
  const dobs = new Set<string>();
  const ids = new Set<string>();
  const emailDomains = new Set<string>();
  for (const lineRaw of raw.split(/\r?\n/)) {
    const line = lineRaw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    const sp = line.indexOf(" ");
    if (sp < 0) continue;
    const tag = line.slice(0, sp);
    const value = line.slice(sp + 1).trim();
    if (value.length === 0) continue;
    switch (tag) {
      case "NAME":
        names.add(value.toUpperCase());
        break;
      case "DOB":
        dobs.add(value);
        break;
      case "ID":
        ids.add(value.toUpperCase());
        break;
      case "EMAILDOMAIN":
        emailDomains.add(value.toLowerCase());
        break;
      default:
        break;
    }
  }
  return { names, dobs, ids, emailDomains };
}

function normalizePath(p: string): string {
  const abs = isAbsolute(p) ? p : resolve(REPO_ROOT, p);
  const rel = relative(REPO_ROOT, abs);
  return rel.split(sep).join("/");
}

function loadOverrideLog(): Set<string> {
  if (!existsSync(OVERRIDE_LOG_PATH)) return new Set();
  const raw = readFileSync(OVERRIDE_LOG_PATH, "utf8");
  const out = new Set<string>();
  for (const lineRaw of raw.split(/\r?\n/)) {
    const m = /^###\s+(.+?)\s*$/.exec(lineRaw);
    if (m && m[1] !== undefined) out.add(normalizePath(m[1]));
  }
  return out;
}

function validateAllowFixtures(allowFixtures: string[]): void {
  if (allowFixtures.length === 0) return;
  const overrides = loadOverrideLog();
  const missing = allowFixtures.map(normalizePath).filter((p) => !overrides.has(p));
  if (missing.length > 0) {
    const lines = missing.map((p) => `  - ${p}`).join("\n");
    throw new InvocationError(
      `--allow-fixture rejected: no matching entry in phi-scan-overrides.md for:\n${lines}\n` +
        `Add a "### <path>" subsection to phi-scan-overrides.md and commit it.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Target enumeration
// ---------------------------------------------------------------------------

interface Target {
  path: string; // forward-slash repo-relative path for reporting
  read: () => Buffer;
}

/**
 * An entry the enumeration reached but cannot scan. Both fields are safe to
 * print: `path` is the entry's own repo-relative path (the same locus every hit
 * already carries) and `kind` is a token from the closed set below. Nothing off
 * the other side of a link is ever recorded here.
 */
interface Unscannable {
  path: string;
  kind: string;
}

/**
 * Closed-set, engine-owned description of what a path IS, from a follow-links
 * `stat`. The link-following is deliberate and matches `walk`: a scan ROOT that
 * is itself a symbolic link to a directory is still followed, which is the
 * documented superset behaviour. Only the target's kind is described, and the
 * link's target PATH is never recorded, exactly as at every other refusal here.
 */
function statKind(st: Stats): string {
  if (st.isFile()) return "a regular file";
  if (st.isFIFO()) return "a FIFO";
  if (st.isSocket()) return "a socket";
  if (st.isBlockDevice()) return "a block device";
  if (st.isCharacterDevice()) return "a character device";
  return "not a directory";
}

/**
 * Why a declared walk root cannot be enumerated, or `undefined` if it can.
 *
 * `existsSync` is not enough to ask this with, because it answers the wrong
 * question in both directions that matter: it is TRUE for a root that is a
 * regular file (which `readdirSync` then throws `ENOTDIR` on) and FALSE for a
 * dangling symbolic link (which is a missing root, not a present one). A single
 * `statSync` in a try/catch answers both, and `err.code` is an engine-owned
 * token, never anything off the working tree.
 */
function rootProblem(abs: string): string | undefined {
  let st: Stats;
  try {
    st = statSync(abs);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return "does not exist";
    if (code === "ENOTDIR") return "is unreachable: a component of its path is not a directory";
    return `cannot be inspected (${code ?? "unknown error"})`;
  }
  return st.isDirectory() ? undefined : statKind(st);
}

/**
 * Refuse (exit 2) when a declared walk root is not a directory.
 *
 * STATE THE CHECK, NOT A STRONGER ONE. This asks `isDirectory()`, so it is a
 * check on the root's TYPE and NOT on whether the root can be read. A directory
 * the process cannot open (mode `000`) passes here and then throws an uncaught
 * `EACCES` out of `readdirSync`, exactly as at base, which the header's KNOWN
 * AND NOT CLOSED list records. The wording used to say "enumerable" and that
 * was measurably false; it is cut back rather than the guard grown.
 *
 * A ROOT is not an ENTRY, and it fails in its own way: an entry the walk cannot
 * read is one file's worth of blindness, while a root the walk cannot enumerate
 * is EVERY file under it. Measured on this package, both failures read as
 * success: with `test/fixtures` absent the walk returns immediately and all-mode
 * prints `OK - no hits` at exit 0, and with `test/fixtures` replaced by a
 * regular file `readdirSync` threw an UNCAUGHT `ENOTDIR` that left the process
 * at exit 1, which is this scanner's code for "hits found" and is a stack trace
 * rather than anything a developer can act on.
 *
 * A missing root is the sharper half, because it is the shape that can be true
 * for the entire life of a repository: a root that never existed makes the gate
 * print clean on every run it ever makes, and nothing about that run looks
 * wrong. Existence is not observation, so this rule is only half the account and
 * `reconcileObserved` below is the other half.
 */
function refuseUnusableRoots(): void {
  const bad = WALK_ROOTS.map((r) => ({ rel: r.rel, problem: rootProblem(r.abs) })).filter(
    (r): r is { rel: string; problem: string } => r.problem !== undefined,
  );
  if (bad.length === 0) return;
  const lines = bad.map((r) => `  - ${r.rel} (${r.problem})`).join("\n");
  const noun = bad.length === 1 ? "root is" : "roots are";
  throw new InvocationError(
    `refusing the scan: ${String(bad.length)} declared scan ${noun} not a directory:\n` +
      `${lines}\n` +
      "A root that is not a directory contributes no files at all, so the sweep would report " +
      "clean over every file that root was supposed to cover. Restore it as a directory, or " +
      "update the roots in scripts/phi-scan.ts if the layout genuinely changed.",
  );
}

/**
 * Every path git has in the index under the walk roots. Refuses (exit 2) rather
 * than answering an empty list, because "git could not tell me" and "git told me
 * there is nothing" are the two answers this whole reconciliation exists to keep
 * apart. `scripts/` is not in the published tarball, so the only callers are
 * inside a checkout of this repository.
 */
function gitTrackedUnderRoots(): string[] {
  let out: Buffer;
  try {
    // SECURITY: array-form execFileSync, no shell. `--` separates the pathspecs.
    //
    // `--deduplicate` because an UNMERGED path is returned ONCE PER STAGE. Without
    // it a single conflicted fixture missing from disk is reported as three
    // offenders with a count of 3, which falsifies "names every offender" in the
    // direction that makes a developer distrust the gate. `--staged` learned the
    // same fact one commit earlier, from the other side of it.
    out = execFileSync(
      "git",
      ["ls-files", "-z", "--deduplicate", "--", ...WALK_ROOTS.map((r) => r.rel)],
      { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (err) {
    // NEVER INTERPOLATE THE CHILD'S MESSAGE. `execFileSync` appends git's stderr
    // verbatim, and git's fatals in this class carry absolute filesystem paths
    // ("bad config line 9 in file .git/config", ".git/index: index file smaller
    // than expected"). A diagnostic ABOUT a PHI gate is itself a PHI surface, so
    // only the engine-owned exit status is reported, which is the same rule
    // `rootProblem` follows with `err.code`.
    const status = (err as { status?: number }).status;
    throw new InvocationError(
      "refusing the scan: could not list the tracked files under the scan roots " +
        `(git ls-files exited ${status === undefined ? "abnormally" : String(status)}; ` +
        "run it by hand to see why - its output is deliberately not echoed here). " +
        "Without that list the sweep cannot tell a corpus it read and found clean from a corpus " +
        "it never opened, and reporting the first when it means the second is the failure this " +
        "check exists to prevent.",
    );
  }
  return out
    .toString("utf8")
    .split("\0")
    .filter((p) => p.length > 0);
}

/**
 * Refuse (exit 2) when a tracked in-scope file was NOT among the files the walk
 * enumerated.
 *
 * THIS IS THE HALF A DENOMINATOR DOES NOT BUY. Counting the files the sweep
 * opened, or comparing that count against a healthy one, measures the roots that
 * DID exist; an emptied root simply contributes zero and the total still looks
 * like a total. What separates "read it and found nothing" from "never opened
 * it" is naming the corpus from a source outside the walk and checking the walk
 * against it, which is what the index is for.
 *
 * The expected set mirrors the walk's own admissions rather than inventing a
 * second boundary: `.md` is exempt there, so it is exempt here.
 *
 * BE EXACT ABOUT THE IGNORE RULE, because the short form of it is false. The
 * `ignored` filter reads as "the walk skips gitignored paths, so this does too",
 * and that is NOT what either side does for a TRACKED path. `git check-ignore`
 * consults the index by default, and measured here it answers NOT-IGNORED for a
 * path that is tracked even when a `.gitignore` rule names it (only `--no-index`
 * reports it ignored, and this scanner does not pass it). So the walk SCANS a
 * tracked-and-ignored file, and this check correspondingly REFUSES when one is
 * missing from disk, which is the consistent pair. What the ignore rule really
 * exempts is the UNTRACKED ignored file, and such a path is never in
 * `git ls-files` at all, so it is out of the expected set on that ground rather
 * than on this filter. The filter is kept because it is the same rule the walk
 * applies and it must not diverge if git's default ever moves.
 *
 * AN INDEX ENTRY AT EXACTLY A ROOT'S OWN PATH IS THE ROOT, NOT A FILE UNDER IT,
 * AND IS EXEMPT. The walk enumerates `<root>/<name>` and never `<root>` itself,
 * so such an entry can never appear in `observed` and comparing it would refuse
 * unconditionally. The shape that makes this concrete is a walk root that is a
 * TRACKED symbolic link to a directory: `git ls-files` returns `test/fixtures`,
 * the walk follows the link and enumerates the target's files under their
 * `test/fixtures/*` names, and that is a documented SUPERSET scan which exits 1
 * over a PHI-bearing target at base. Without this exemption the sweep refused
 * (exit 2) over exactly that tree, which would have traded a working superset
 * scan for a refusal and falsified four surfaces that say it is unchanged. It is
 * also the same boundary the `--staged` route draws, where an entry at a root's
 * own path matches no clause; that residual stays open and is disclosed in the
 * header.
 *
 * 🩺 "IT OPENS NO CLEAN PATH" IS REFUTED, AND THE CUT-BACK CLAIM IS BELOW. A
 * draft said the exemption opened none, on the ground that a root which is a
 * tracked regular file, or a link to one, is refused by `refuseUnusableRoots`
 * first. That is true and it is not the whole of it. When a root is a tracked
 * link to a DIRECTORY, everything the walk reads through it lives OUTSIDE the
 * `git ls-files -- test/fixtures src` pathspec, under the target's own names, so
 * the entire link-target corpus is unreconciled rather than just the root entry.
 * Measured at head with `test/fixtures -> ../elsewhere` and a committed
 * `elsewhere/violator.edi`: present, exit 1; deleted from disk but still in the
 * index, `OK - no hits` at EXIT 0. That is verbatim the EMPTIED-ROOT shape this
 * function exists to close, surviving through the exempted path.
 *
 * It is PRE-EXISTING (base is exit 0 over the same tree) and it is NOT a
 * regression, so it is disclosed here and in the header rather than closed:
 * covering it means reconciling against a second pathspec derived from the link
 * target, which is a wider scope decision and belongs with the other scope work.
 * WHAT CHANGED IS THE CLAIM, NOT THE GUARD. State the closure as "within the
 * declared roots, as git names them" and never as a universal over any corpus.
 *
 * Anything the walk enumerated but could not READ has already refused above with
 * a more specific message, so this never fires second on the same path. All-mode
 * cannot carry `--allow-fixture` (a bare `--allow-fixture` seeds the positional
 * path set and selects `paths` mode), so an excused path is not a case here.
 */
function reconcileObserved(observed: Set<string>, ignored: Set<string>): void {
  const rootRels = new Set(WALK_ROOTS.map((r) => r.rel));
  const unopened = gitTrackedUnderRoots().filter(
    (p) =>
      !observed.has(p) && !ignored.has(p) && !rootRels.has(p) && !p.toLowerCase().endsWith(".md"),
  );
  if (unopened.length === 0) return;
  const lines = unopened.map((p) => `  - ${p}`).join("\n");
  const noun =
    unopened.length === 1
      ? "file is in the index but was not opened"
      : "files are in the index but were not opened";
  throw new InvocationError(
    `refusing the scan: ${String(unopened.length)} tracked in-scope ${noun} by the sweep:\n` +
      `${lines}\n` +
      "A scan that never opened a file has found nothing in it, which is not the same as finding " +
      "it clean, and reporting the second is an attestation over bytes nobody read. Restore the " +
      "file, or `git rm` it if it is genuinely gone, then re-run.",
  );
}

/** Closed-set, engine-owned description of a directory entry's kind. */
function direntKind(e: Dirent): string {
  if (e.isSymbolicLink()) return "a symbolic link";
  if (e.isFIFO()) return "a FIFO";
  if (e.isSocket()) return "a socket";
  if (e.isBlockDevice()) return "a block device";
  if (e.isCharacterDevice()) return "a character device";
  return "not a regular file";
}

/**
 * Enumerate a scan root. `Dirent`'s predicates are lstat answers and are not
 * exhaustive: an entry that is neither a directory nor a regular file is
 * collected into `unscannable` rather than dropped, so the caller can refuse
 * instead of reporting clean over it.
 */
function walk(dir: string, out: string[], unscannable: Unscannable[]): void {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, out, unscannable);
    } else if (e.isFile()) {
      // README/markdown docs may legitimately describe violator values; they
      // are documentation, not fixtures.
      if (e.name.toLowerCase().endsWith(".md")) continue;
      out.push(full);
    } else {
      // Deliberately NOT subject to the `.md` exemption above, and not subject
      // to any name-based rule. That exemption is a judgement about a file
      // whose bytes the walk could have read; a link's own name is no evidence
      // at all about what is on the other side of it.
      unscannable.push({ path: normalizePath(full), kind: direntKind(e) });
    }
  }
}

/**
 * Refuse (exit 2) over entries the enumeration reached and cannot scan. EVERY
 * offender is named, not just the first: a developer who has to re-run the gate
 * once per link learns to distrust it.
 */
function refuseUnscannable(entries: Unscannable[], why: string, remedy: string): void {
  if (entries.length === 0) return;
  const lines = entries.map((u) => `  - ${u.path} (${u.kind})`).join("\n");
  const noun =
    entries.length === 1 ? "entry is not a regular file" : "entries are not regular files";
  throw new InvocationError(
    `refusing the scan: ${String(entries.length)} ${noun}:\n${lines}\n${why} ${remedy}`,
  );
}

function gitIgnored(paths: string[]): Set<string> {
  const ignored = new Set<string>();
  if (paths.length === 0) return ignored;
  try {
    // SECURITY: array-form execFileSync, no shell. Default (Buffer) encoding -
    // `encoding: "buffer"` with `input` is rejected by Node.
    const out = execFileSync("git", ["check-ignore", "--stdin", "-z"], {
      input: paths.map(normalizePath).join("\0"),
      stdio: ["pipe", "pipe", "ignore"],
    });
    for (const p of out.toString("utf8").split("\0")) {
      if (p.length > 0) ignored.add(p);
    }
  } catch {
    // `git check-ignore` exits 1 when nothing matches - treat as none ignored.
  }
  return ignored;
}

function buildTargetsForAll(): Target[] {
  // Roots first: a root that is not a directory makes every check below vacuous,
  // and one of the two shapes used to crash the walk outright. Say "a directory"
  // and not "enumerable": this is a TYPE check, and a directory that cannot be
  // READ still throws uncaught, exactly as at base. See `refuseUnusableRoots`.
  refuseUnusableRoots();

  const files: string[] = [];
  const unscannable: Unscannable[] = [];
  for (const root of WALK_ROOTS) walk(root.abs, files, unscannable);

  // One `git check-ignore` over both lists. An ignored entry is already out of
  // scope for the file route, so applying the same rule to a link keeps a single
  // boundary rather than inventing a second, stricter one for links alone.
  const ignored = gitIgnored([...files.map(normalizePath), ...unscannable.map((u) => u.path)]);

  refuseUnscannable(
    unscannable.filter((u) => !ignored.has(u.path)),
    "The walk can neither read such an entry nor vouch for what is on the other side of it.",
    "Remove it, replace it with a regular file, or (if it is genuinely not part of the " +
      "corpus) untrack it and add it to .gitignore.",
  );

  const kept = files
    .map((abs) => ({ abs, rel: normalizePath(abs) }))
    .filter((f) => !ignored.has(f.rel));

  // The roots existed and every entry under them was readable. That still does
  // not say the sweep SAW the corpus, so check what it enumerated against the
  // index before any target is handed back.
  reconcileObserved(new Set(kept.map((f) => f.rel)), ignored);

  return kept.map(({ abs, rel }) => ({ path: rel, read: () => readFileSync(abs) }));
}

function buildTargetsForPaths(paths: string[]): Target[] {
  return paths.map((p) => {
    const abs = isAbsolute(p) ? p : resolve(REPO_ROOT, p);
    if (!existsSync(abs)) throw new InvocationError(`File not found: ${p}`);
    if (!statSync(abs).isFile()) throw new InvocationError(`Not a regular file: ${p}`);
    return { path: normalizePath(abs), read: () => readFileSync(abs) };
  });
}

/** git's file modes for a regular blob. Every other mode is not a file to read. */
const REGULAR_BLOB_MODES = new Set(["100644", "100755"]);

/** Closed-set, engine-owned description of a git file mode. */
function gitModeKind(mode: string): string {
  if (mode === "120000") return "a symbolic link";
  if (mode === "160000") return "a gitlink (a nested repository)";
  return `a git mode-${mode} entry`;
}

/** `:<srcmode> <dstmode> <srcsha> <dstsha> <status>` - the info half of a `--raw -z` record. */
const RAW_RECORD = /^:(?:\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ ([A-Z])\d*$/;

/**
 * Refuse (exit 2) over in-scope paths git reports as UNMERGED. Separate from
 * `refuseUnscannable` because the reason differs in kind: such a path is usually
 * an ordinary regular file, and what it lacks is a SINGLE staged blob rather
 * than a readable type. Its destination mode is `000000`, so routing it through
 * the mode check would name it with a sentence about links and gitlinks that is
 * false for it.
 */
function refuseUnmerged(paths: string[]): void {
  if (paths.length === 0) return;
  const lines = paths.map((p) => `  - ${p}`).join("\n");
  const noun = paths.length === 1 ? "path is unmerged" : "paths are unmerged";
  throw new InvocationError(
    `refusing the scan: ${String(paths.length)} in-scope ${noun}:\n${lines}\n` +
      "An unmerged path is recorded at one or more of stages 1/2/3 and never at stage 0, so " +
      "`git show :<path>` fails outright and there is no one staged blob for the scan to read. " +
      "Resolve the conflict and `git add` the result.",
  );
}

function buildTargetsForStaged(): Target[] {
  let listBuf: Buffer;
  try {
    // SECURITY: array-form execFileSync, no shell. `--raw` rather than
    // `--name-only` because the DESTINATION MODE is the only thing that
    // distinguishes a staged regular file from a staged symlink or gitlink, and
    // `git show :<path>` answers all three without complaint.
    //
    // `T` (TYPECHANGE) IS IN THE FILTER, AND LEAVING IT OUT MADE THE MODE CHECK
    // BELOW UNREACHABLE WHENEVER THE FILE WAS ALREADY TRACKED. Replacing a
    // TRACKED regular file with a link is not an add and not a modify: measured
    // on this tree, `--diff-filter=AM` returned zero rows for that change while
    // the unfiltered `--raw` showed `:100644 120000 <sha> <sha> T`, so the
    // record died before any mode could be read and the hook passed the link
    // green. Typechange carries a single path, exactly like `A` and `M`, so
    // admitting it costs the two-field stride below nothing.
    //
    // `--no-renames` CLOSES THE RENAME AND COPY HOLE, AND THE FILTER ALONE NEVER
    // COULD. Rename detection is on by default and neither `AM` nor `AMT`
    // returns `R` or `C`, so the record was deleted outright. Measured on this
    // package: `git mv <link> test/fixtures/<name>` staged as a single TWO-PATH
    // `R` record at mode 120000 and this route printed `OK - no hits` at exit 0;
    // renaming a fixture while SUBSTITUTING a real-looking surname staged as a
    // two-path `R` record and passed identically, over bytes that are TWO hits
    // as an ordinary add; and under `diff.renames=copies`, copying a PHI-bearing
    // file from outside the roots INTO `test/fixtures/` staged as a two-path `C`
    // record and passed the same way. NO SIMILARITY SCORE IS RECORDED ANYWHERE
    // IN THIS FILE: a score moves with how much of the old content survives, so
    // one carried over from another fixture is wrong here. What is load-bearing
    // is that the record carries TWO PATHS.
    //
    // Turning detection off makes each destination arrive as an ordinary
    // single-path `A` (`:000000 <mode> 0000000 <sha> A`) and each source a `D`
    // the filter drops, so no two-path record shape is needed and the stride
    // below is unchanged. Verified under `diff.renames=true|copies|false|1` and
    // `diff.renameLimit=1`. Be exact about the relation between the two
    // enumerations: they are EQUAL whenever nothing is renamed, copied, unmerged
    // or a gitlink hidden by `diff.ignoreSubmodules`, and larger only when one
    // of those is present. State that precondition in FULL, because
    // `--no-renames` alone buys only the rename and copy half of it. It is a
    // superset and NOT a strictly larger set: nothing the old argv enumerated
    // stops being enumerated.
    //
    // `--ignore-submodules=none` FOR THE SAME REASON: THE CALLER'S GIT CONFIG
    // MUST NOT BE ABLE TO EMPTY THIS LIST. With `diff.ignoreSubmodules=all` set,
    // a staged gitlink under `test/fixtures/` vanished from `--raw` entirely and
    // this route exited 0 over it, where the same index without that config is
    // refused at exit 2 by the mode check below. The flag pins the behaviour to
    // git's default instead of the caller's, which is the whole family rule
    // here: stop trusting the caller's git config.
    //
    // `U` (UNMERGED) IS IN THE FILTER SO IT CAN BE REFUSED, NOT SCANNED. Such a
    // path is recorded at one or more of stages 1/2/3 and never at stage 0, so
    // `git show :<path>` fails on it; it was returned by neither `AM` nor `AMT`,
    // and this route reported `OK - no hits` at exit 0 over an index it could
    // not read (measured, with a real-looking surname in one of the stages). Git
    // itself refuses to commit while a path is unmerged, so this was never a
    // route to a committed leak; what it was is a gate attesting clean over a
    // state it never observed, and `pnpm phi-scan --staged` is run by hand and
    // from scripts as well as from the hook. `U` carries a single path, so it
    // costs the stride nothing either.
    //
    // `B` (BROKEN PAIR) IS IN THE FILTER BECAUSE `-B` IS NOT INERT. The
    // mechanism is sharper than "a `B` record the filter drops": the record's
    // printed status LETTER IS STILL `M`, one path, an `M` with a break score
    // that `RAW_RECORD` parses happily, so a reader checking the raw output
    // concludes `AMTU` keeps it. It does not: `--diff-filter` classifies a
    // broken pair as `B` WHATEVER LETTER IT PRINTS. Measured here on a wholly
    // rewritten in-scope fixture carrying a staged dashed SSN, same index all
    // three ways: `-B --diff-filter=AMTU` returns EMPTY while `--diff-filter=B`
    // and `--diff-filter=AMTUB` each return the record, and the scanner with
    // `-B` injected exits 0 on the `AMTU` filter and 1 on this one. THE SCORE IS
    // NOT PINNED AND NO DIGITS ARE QUOTED, because it moves with how much of the
    // old content survives. Adding `B` costs the enumeration NOTHING today - git
    // only breaks a pair when `-B` is given, so with the flag absent the two
    // filters enumerate identically - which is why it is the remedy rather than
    // a warning: it stops the flag being a silent blindfold if anyone adds it.
    //
    // THE STRIDE BELOW IS COUPLED TO THIS ARGV, so read the coupling before
    // editing it. `--no-renames` is what makes a two-path record impossible, and
    // `-M`, `-C` and `--find-copies-harder` each turn detection back on over the
    // top of it: measured on a real rename stage, every one of the three empties
    // this route again. Do not add them. `-B` may be added without blinding the
    // route now that `B` is in the filter, but it still buys nothing.
    listBuf = execFileSync(
      "git",
      [
        "diff",
        "--cached",
        "--raw",
        "-z",
        "--no-renames",
        "--ignore-submodules=none",
        "--diff-filter=AMTUB",
      ],
      {
        encoding: "buffer",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (err) {
    throw new InvocationError(
      `git diff --cached failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // `--raw -z` emits `<info>\0<path>\0` per record. `R` (rename) and `C` (copy)
  // are the only statuses carrying a SECOND path, and `--no-renames` above means
  // git cannot emit either, whatever the caller's `diff.renames` says, so the
  // stride is two fields STRUCTURALLY rather than by the filter's leave. The
  // regex still admits a score-suffixed status: if a two-path record ever did
  // reach here the stride would desync and the next record would fail to parse,
  // which REFUSES - the same outcome as any other unparseable record, and the
  // safe one. That is a backstop, not the guarantee.
  //
  // What this route still does NOT enumerate, stated because the boundary is
  // narrower than the path prefix alone: the filter drops `D`, a deletion, which
  // has no staged blob to scan. That is PRE-EXISTING and deliberate. The only
  // other statuses git documents are `R`/`C` (which `--no-renames` makes
  // unemittable) and `X` (git's own "this is a bug" marker), so `A`/`M`/`T`/`U`/
  // `B` plus `D` accounts for every record this invocation can produce.
  const fields = listBuf.toString("utf8").split("\0");
  const staged: { path: string; mode: string; status: string }[] = [];
  let i = 0;
  while (i < fields.length) {
    const info = fields[i];
    if (info === undefined || info.length === 0) {
      i += 1;
      continue;
    }
    const m = RAW_RECORD.exec(info);
    const mode = m?.[1];
    const status = m?.[2];
    const path = fields[i + 1];
    if (mode === undefined || status === undefined || path === undefined || path.length === 0) {
      throw new InvocationError(
        "could not read the output of `git diff --cached --raw -z`: unrecognized record. " +
          "Refusing rather than scanning a list that may be short.",
      );
    }
    staged.push({ path, mode, status });
    i += 2;
  }

  const inScope = staged.filter(
    (s) =>
      s.path.startsWith("test/fixtures/") || (s.path.startsWith("src/") && s.path.endsWith(".ts")),
  );

  // Unmerged first: such a record's destination mode is `000000`, which the mode
  // check below would otherwise refuse with a sentence about symbolic links and
  // gitlinks that is false for it.
  refuseUnmerged(inScope.filter((s) => s.status === "U").map((s) => s.path));

  const list = inScope.filter((s) => s.status !== "U");

  refuseUnscannable(
    list
      .filter((s) => !REGULAR_BLOB_MODES.has(s.mode))
      .map((s) => ({ path: s.path, kind: gitModeKind(s.mode) })),
    // The `why` covers BOTH modes this refuses, so it must be true of both.
    // `git show` on a staged LINK hands back the target path; on a staged
    // GITLINK it hands back nothing at all (measured: `fatal: bad object`).
    // Naming only the first would assert of a gitlink something this repo
    // measured to be false.
    "For such an entry `git show :<path>` hands back its target path, or no content at all, " +
      "rather than anything the entry points at.",
    "Unstage it, or replace it with a regular file.",
  );

  return list.map(({ path: relPath }) => ({
    path: relPath,
    // SECURITY: array-form execFileSync, no shell. `:<path>` is a git pathspec.
    read: (): Buffer =>
      execFileSync("git", ["show", `:${relPath}`], {
        encoding: "buffer",
        stdio: ["ignore", "pipe", "pipe"],
      }),
  }));
}

// ---------------------------------------------------------------------------
// X12 segment-aware scanner
// ---------------------------------------------------------------------------

function looksLikeX12(text: string): boolean {
  const t = text.replace(/^\uFEFF/, "");
  return t.startsWith("ISA") && t.length >= 106;
}

/** Split raw X12 into segments → elements using ISA-declared delimiters. */
function splitSegments(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, "");
  const elementSep = t.charAt(3); // ISA byte 3 is always the element separator
  const segmentTerm = t.charAt(105); // ISA is exactly 106 bytes; terminator at 105
  return t
    .split(segmentTerm)
    .map((s) => s.replace(/[\r\n]+/g, "").trim())
    .filter((s) => s.length > 0)
    .map((s) => s.split(elementSep));
}

/** Word tokens (len >= 2, alphabetic) inside an X12 name element. */
function nameTokens(value: string): string[] {
  return value
    .split(/[\s,.'-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && /[A-Za-z]/.test(t));
}

function isSyntheticMemberId(id: string): boolean {
  const v = id.toUpperCase();
  // documented synthetic shapes: MEMBER- / MEM- / MBR / AV-MEMBER- / OTHER /
  // ORPHAN / GROUP prefixes, or an all-digit padded id.
  if (/^(AV-)?MEMBER[-_]?[0-9A-Z]*$/.test(v)) return true;
  if (/^(MEM|MBR|OTHER|ORPHAN|GROUP|SUB)[-_]?[0-9A-Z]*$/.test(v)) return true;
  if (/^[0-9]+$/.test(v)) return true;
  return false;
}

function isSyntheticNpi(npi: string, allow: AllowList): boolean {
  if (allow.ids.has(npi.toUpperCase())) return true;
  const distinct = new Set(npi.split("")).size;
  if (distinct <= 4) return true; // all-same / grouped-repeat synthetic patterns
  if (npi.startsWith("123456789")) return true; // sequential synthetic base
  return false;
}

function pushHit(hits: Hit[], path: string, segment: string, value: string, reason: string): void {
  hits.push({ path, segment, value, reason });
}

function checkNm1(path: string, elems: string[], allow: AllowList, hits: Hit[]): void {
  const entityType = elems[2] ?? "";
  const qualifier = elems[8] ?? "";
  const idValue = elems[9] ?? "";

  // SSN qualifier (34) must never appear in a synthetic fixture.
  if (qualifier === "34" && idValue.length > 0) {
    pushHit(hits, path, "NM1", idValue, "SSN (NM1 qualifier 34) in fixture");
  }

  if (entityType === "1") {
    // person - last / first / middle name elements
    for (const el of [elems[3], elems[4], elems[5]]) {
      if (el === undefined || el.length === 0) continue;
      for (const tok of nameTokens(el)) {
        if (!allow.names.has(tok.toUpperCase())) {
          pushHit(hits, path, "NM1", tok, "person-name token not in synthetic allow-list");
        }
      }
    }
    if (qualifier === "MI" && idValue.length > 0 && !isSyntheticMemberId(idValue)) {
      pushHit(hits, path, "NM1", idValue, "member-id shape not recognized as synthetic");
    }
  }

  if (qualifier === "XX" && /^[0-9]{10}$/.test(idValue) && !isSyntheticNpi(idValue, allow)) {
    pushHit(hits, path, "NM1", idValue, "NPI shape not recognized as synthetic");
  }
}

function checkPer(path: string, elems: string[], allow: AllowList, hits: Hit[]): void {
  // PER02 is a free-text contact name; PER04/06/08 are communication numbers.
  const name = elems[2];
  if (name !== undefined) {
    for (const tok of nameTokens(name)) {
      if (!allow.names.has(tok.toUpperCase())) {
        pushHit(hits, path, "PER", tok, "contact-name token not in synthetic allow-list");
      }
    }
  }
  for (const idx of [4, 6, 8]) {
    const comm = elems[idx];
    if (comm === undefined) continue;
    const digits = comm.replace(/[^0-9]/g, "");
    // 10+ digit comm number that lacks the 555 fake-exchange convention.
    if (digits.length >= 10 && !digits.includes("555")) {
      pushHit(hits, path, "PER", comm, "phone/fax without the 555 fake-exchange convention");
    }
  }
}

function checkDmg(path: string, elems: string[], allow: AllowList, hits: Hit[]): void {
  // DMG02 is the date of birth. Don't gate on DMG01 === "D8": a real feed can
  // ship an empty/odd format qualifier (or RD8 range), and DMG isn't in
  // DATE_SEGMENTS, so anything not caught here slips entirely. Take the first
  // 8-digit run and validate it as a plausible CCYYMMDD before flagging.
  const m = /\d{8}/.exec(elems[2] ?? "");
  if (m === null) return;
  const dob = m[0];
  const month = Number(dob.slice(4, 6));
  const day = Number(dob.slice(6, 8));
  if (month < 1 || month > 12 || day < 1 || day > 31) return;
  if (!allow.dobs.has(dob)) {
    pushHit(hits, path, "DMG", dob, "date of birth not in synthetic allow-list");
  }
}

function checkServiceDates(path: string, elems: string[], hits: Hit[]): void {
  for (const el of elems.slice(1)) {
    const re = /\d{8,}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(el)) !== null) {
      const d = m[0].slice(0, 8);
      const year = Number(d.slice(0, 4));
      const month = Number(d.slice(4, 6));
      const day = Number(d.slice(6, 8));
      if (month < 1 || month > 12 || day < 1 || day > 31) continue;
      if (year < SERVICE_DATE_CUTOFF_YEAR) {
        pushHit(
          hits,
          path,
          elems[0] ?? "?",
          d,
          `service/transaction date before ${String(SERVICE_DATE_CUTOFF_YEAR)}`,
        );
      }
    }
  }
}

function scanX12(target: Target, text: string, allow: AllowList, hits: Hit[]): void {
  for (const elems of splitSegments(text)) {
    const id = elems[0] ?? "";
    if (id === "NM1") checkNm1(target.path, elems, allow, hits);
    else if (id === "PER") checkPer(target.path, elems, allow, hits);
    else if (id === "DMG") checkDmg(target.path, elems, allow, hits);
    if (DATE_SEGMENTS.has(id)) checkServiceDates(target.path, elems, hits);
  }
  // Cross-cutting shape checks over the whole payload.
  scanCommonShapes(target, text, allow, hits);
}

// ---------------------------------------------------------------------------
// Shape checks shared by X12 and plain-text targets
// ---------------------------------------------------------------------------

function scanCommonShapes(target: Target, content: string, allow: AllowList, hits: Hit[]): void {
  // Dashed SSN anywhere.
  for (const m of content.matchAll(/\b\d{3}-\d{2}-\d{4}\b/g)) {
    pushHit(hits, target.path, "(ssn)", m[0], "dashed SSN pattern");
  }
  // REF*SY*<value> (SSN qualifier) - 9-digit value must be allow-listed.
  for (const m of content.matchAll(/REF.SY.([0-9]{9})\b/g)) {
    const v = m[1];
    if (v !== undefined && !allow.ids.has(v.toUpperCase())) {
      pushHit(hits, target.path, "REF", v, "SSN (REF qualifier SY) not in synthetic allow-list");
    }
  }
  // Emails whose domain is not an allow-listed reserved/test domain.
  for (const m of content.matchAll(/\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g)) {
    const domain = (m[1] ?? "").toLowerCase();
    if (!allow.emailDomains.has(domain)) {
      pushHit(hits, target.path, "(email)", m[0], "email with non-test domain");
    }
  }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

function scanTarget(target: Target, allow: AllowList, hits: Hit[]): void {
  let buf: Buffer;
  try {
    buf = target.read();
  } catch (err) {
    throw new InvocationError(
      `could not read ${target.path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const text = buf.toString("utf8");
  if (looksLikeX12(text)) {
    scanX12(target, text, allow, hits);
  } else {
    // Non-X12 target (hand-written src, plain-text notes): conservative shape
    // pass only - no segment model to lean on.
    scanCommonShapes(target, text, allow, hits);
  }
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function report(hits: Hit[]): void {
  if (hits.length === 0) {
    process.stdout.write("[phi-scan] OK - no hits\n");
    return;
  }
  const byPath = new Map<string, Hit[]>();
  for (const h of hits) {
    const arr = byPath.get(h.path);
    if (arr) arr.push(h);
    else byPath.set(h.path, [h]);
  }
  for (const [path, group] of byPath) {
    process.stderr.write(`[phi-scan] HIT: ${path}\n`);
    for (const h of group) {
      process.stderr.write(
        `  segment=${h.segment} value=${JSON.stringify(h.value)} (${h.reason})\n`,
      );
    }
  }
  process.stderr.write(
    `[phi-scan] ${String(hits.length)} hit(s) across ${String(byPath.size)} file(s). ` +
      `If a value is genuinely synthetic, declare it in scripts/phi-allow-list.txt OR ` +
      `run with --allow-fixture <path> AND log it in phi-scan-overrides.md.\n`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): number {
  let args: Args;
  try {
    args = parseArgs(process.argv.slice(2));
    validateAllowFixtures(args.allowFixtures);
  } catch (err) {
    if (err instanceof InvocationError) {
      process.stderr.write(`[phi-scan] ${err.message}\n`);
      return 2;
    }
    throw err;
  }

  const allow = loadAllowList();
  const allowed = new Set<string>(args.allowFixtures.map(normalizePath));

  let targets: Target[];
  try {
    if (args.mode === "staged") targets = buildTargetsForStaged();
    else if (args.mode === "paths") targets = buildTargetsForPaths(args.paths);
    else targets = buildTargetsForAll();
  } catch (err) {
    if (err instanceof InvocationError) {
      process.stderr.write(`[phi-scan] ${err.message}\n`);
      return 2;
    }
    throw err;
  }

  targets = targets.filter((t) => !allowed.has(t.path));

  const hits: Hit[] = [];
  for (const t of targets) {
    try {
      scanTarget(t, allow, hits);
    } catch (err) {
      if (err instanceof InvocationError) {
        process.stderr.write(`[phi-scan] ${err.message}\n`);
        return 2;
      }
      throw err;
    }
  }

  report(hits);
  return hits.length === 0 ? 0 : 1;
}

process.exit(main());

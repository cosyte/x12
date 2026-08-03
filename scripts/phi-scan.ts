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
 * `--diff-filter=AMT` INCLUDES `T`, AND LEAVING IT OUT MAKES THE MODE CHECK
 * UNREACHABLE FOR AN ALREADY-TRACKED FILE. Replacing a TRACKED regular file
 * with a link is neither an add nor a modify: measured here, `git diff --cached
 * --raw --diff-filter=AM` returned ZERO rows for that change while the
 * unfiltered `--raw` showed `:100644 120000 ... T`. Admitting `T` also picks up
 * the reverse typechange, a link replaced by a real file bearing PHI.
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
 * KNOWN AND NOT CLOSED HERE, so a reader does not mistake the above for more
 * than it is:
 *   - `R` (rename) and `C` (copy) are still not enumerated by `--staged` at
 *     all, which is PRE-EXISTING. Admitting them needs the two-path `--raw`
 *     record shape handled, a scope decision rather than this one. Measured, so
 *     the cost is not left to inference: renaming a fixture while substituting a
 *     real name stages as `:100644 100644 ... R080 <old> <new>`, which both
 *     `AM` and `AMT` return zero rows for, and `--staged` exits 0 over a payload
 *     that is a hit as an ordinary add. `git mv`-ing an already-committed link
 *     INTO `test/fixtures/` is `R100` and is likewise not refused. All-mode is
 *     the backstop for both (exit 1 and exit 2 respectively), so the gap is at
 *     pre-commit, not in CI.
 *   - a scan that observed NOTHING is still reported clean rather than refused.
 *   - the enumerate-then-read window in `all` mode is untouched: this scan
 *     lists its roots first and reads each file afterwards, so a file deleted
 *     inside that window makes the read throw and the whole sweep refuse. That
 *     is a separate remedy pulling the opposite way (it TOLERATES a failed
 *     read) and it belongs in its own slice.
 * ---------------------------------------------------------------------------
 */

import { readFileSync, statSync, existsSync, readdirSync, type Dirent } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve, relative, sep, isAbsolute } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
const ALLOW_LIST_PATH = join(REPO_ROOT, "scripts", "phi-allow-list.txt");
const OVERRIDE_LOG_PATH = join(REPO_ROOT, "phi-scan-overrides.md");

// Roots walked in "all" mode. test/fixtures gets the full X12-aware scan;
// src gets a conservative text pass (dashed-SSN + non-test email only) because
// it is hand-written code, not data - JSDoc `@example` snippets must not trip it.
const FIXTURE_ROOT = join(REPO_ROOT, "test", "fixtures");
const SRC_ROOT = join(REPO_ROOT, "src");

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
  const files: string[] = [];
  const unscannable: Unscannable[] = [];
  walk(FIXTURE_ROOT, files, unscannable);
  walk(SRC_ROOT, files, unscannable);

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

  return files
    .filter((abs) => !ignored.has(normalizePath(abs)))
    .map((abs) => ({ path: normalizePath(abs), read: () => readFileSync(abs) }));
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
const RAW_RECORD = /^:(?:\d{6}) (\d{6}) [0-9a-f]+ [0-9a-f]+ [A-Z]\d*$/;

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
    listBuf = execFileSync("git", ["diff", "--cached", "--raw", "-z", "--diff-filter=AMT"], {
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    throw new InvocationError(
      `git diff --cached failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // `--raw -z` emits `<info>\0<path>\0` per record. `R` (rename) and `C` (copy)
  // are the only statuses carrying a SECOND path, and the filter excludes both,
  // so the stride is two fields. If one ever reached here the stride would
  // desync and the next record would fail to parse, which REFUSES: the same
  // outcome as any other unparseable record, and the safe one.
  //
  // Excluding `R`/`C` also means this route does not enumerate a staged rename
  // at all. That is PRE-EXISTING and is not narrowed here: admitting them needs
  // the two-path record shape handled, which is a scope decision, not this one.
  // A record that does not parse REFUSES rather than being skipped: a silently
  // shortened list is exactly the shape this scan must never report clean over.
  const fields = listBuf.toString("utf8").split("\0");
  const staged: { path: string; mode: string }[] = [];
  let i = 0;
  while (i < fields.length) {
    const info = fields[i];
    if (info === undefined || info.length === 0) {
      i += 1;
      continue;
    }
    const m = RAW_RECORD.exec(info);
    const mode = m?.[1];
    const path = fields[i + 1];
    if (mode === undefined || path === undefined || path.length === 0) {
      throw new InvocationError(
        "could not read the output of `git diff --cached --raw -z`: unrecognized record. " +
          "Refusing rather than scanning a list that may be short.",
      );
    }
    staged.push({ path, mode });
    i += 2;
  }

  const inScope = staged.filter(
    (s) =>
      s.path.startsWith("test/fixtures/") || (s.path.startsWith("src/") && s.path.endsWith(".ts")),
  );

  refuseUnscannable(
    inScope
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

  return inScope.map(({ path: relPath }) => ({
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

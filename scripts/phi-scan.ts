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
 */

import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
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

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, out);
    } else if (e.isFile()) {
      // README/markdown docs may legitimately describe violator values; they
      // are documentation, not fixtures.
      if (e.name.toLowerCase().endsWith(".md")) continue;
      out.push(full);
    }
  }
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
  walk(FIXTURE_ROOT, files);
  walk(SRC_ROOT, files);
  const ignored = gitIgnored(files);
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

function buildTargetsForStaged(): Target[] {
  let listBuf: Buffer;
  try {
    // SECURITY: array-form execFileSync, no shell.
    listBuf = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=AM", "-z"], {
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    throw new InvocationError(
      `git diff --cached failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const list = listBuf
    .toString("utf8")
    .split("\0")
    .filter((p) => p.length > 0)
    .filter((p) => p.startsWith("test/fixtures/") || (p.startsWith("src/") && p.endsWith(".ts")));
  return list.map((relPath) => ({
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

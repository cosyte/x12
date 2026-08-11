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
 * the outermost root pointing outside, the walk enumerates the target's files
 * under their `<root>/*` names and HITS (exit 1). That direction is a superset
 * scan rather than a blind one, so it is left alone here. `test/fixtures` is no
 * longer a walk root, so a link AT that path is an ENTRY now and is refused.
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
 * "In scope" is each route's own existing boundary: the walk excludes a
 * gitignored entry (the same rule that already excludes a gitignored file, so
 * links do not get a second, stricter boundary of their own), and `--staged`
 * looks at `test/**` and `src/**`. The non-regular-entry rules NARROW what those
 * scopes admit and do not widen them; the scopes themselves were widened
 * separately, by `PHI-SCAN-WALK-ROOT-SCOPE`, and that is described below.
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
 *   - with BOTH walk roots absent, and with either one alone absent, the
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
 * files `git ls-files` returns for `test` and `src`. A corpus reached
 * through a SYMLINKED root is not among them, and the first item below is the
 * measured counterexample. A draft stated the universal and a refuter broke it
 * with one tree.
 *
 * KNOWN AND NOT CLOSED HERE, so a reader does not mistake the above for more
 * than it is:
 *   - A SYMLINKED WALK ROOT'S TARGET CORPUS IS NOT RECONCILED AT ALL, not merely
 *     the root entry that `reconcileObserved` exempts. Everything the walk reads
 *     through the link lives under the target's own names, OUTSIDE the
 *     `git ls-files -- test src` pathspec, so the index side of the
 *     comparison is empty for all of it. Measured at head with the outermost
 *     root linked outside and a committed violator behind it:
 *     present, exit 1; removed from disk but still in the index, `OK - no hits`
 *     at EXIT 0. That is the EMPTIED-ROOT shape these rules exist to close,
 *     alive through the exempted path. It is PRE-EXISTING (base is exit 0 over
 *     the same tree) and so not a regression, and closing it means reconciling
 *     against a second pathspec derived from the link target, which is the same
 *     scope decision as the two below. Disclosed rather than closed.
 *   - A ROOT THAT IS A DIRECTORY THE PROCESS CANNOT READ IS NOT CAUGHT, and this
 *     is the boundary of the first rule rather than a slip in it. Measured
 *     identically at base and at head, with a walk root at mode `000` over a
 *     committed PHI payload: `readdirSync` throws an UNCAUGHT `EACCES` and the
 *     process ends at exit 1, the same shape the regular-file root used to have.
 *     An unreadable SUBDIRECTORY under a root, and the window between
 *     `refuseUnusableRoots` and `walk`, end the same way. Closing the class means
 *     tolerating or classifying a failed directory read, which is the deferred
 *     enumerate-then-read remedy below pulling in the same direction, so it
 *     belongs there and not here. It is nonzero, so it is not a false clean.
 *   - AN INDEX ENTRY AT EXACTLY A WALK ROOT'S OWN PATH (`test`, `src`) MATCHES NO
 *     `--staged` CLAUSE, because every clause tests a `<root>/` PREFIX (exit 0
 *     over a payload staged there). PRE-EXISTING and still open. The
 *     reconciliation does not close it and the reason is worth stating because
 *     it reads as though it should: the reconciliation checks the walk against
 *     the index WITHIN the declared scope, so a path nothing declares in scope
 *     is absent from BOTH sides of the comparison and the check is silent on it.
 *     `PHI-SCAN-WALK-ROOT-SCOPE` moved this residual up a level rather than
 *     closing it - it used to be reachable at `test/fixtures` as well.
 *   - A FIXTURE EXPRESSED AS A BUILDER SPEC OBJECT IS SEGMENT TEXT TO NOBODY.
 *     `{ lastName: "…", dateOfBirth: "…" }` becomes a segment only when the
 *     builder runs, so no static pass reaches it - not `scanEmbeddedSegments`,
 *     not the shape floor. Found by hand-reading the files the widening opened,
 *     not by this gate, and pinned as a case so the silence is not read as
 *     coverage.
 *   - AN EMBEDDED SEGMENT UNDER A NON-DEFAULT ELEMENT SEPARATOR IS NOT REACHED.
 *     There is no ISA in an embedded run to declare the delimiters, so the pass
 *     assumes `*`. Narrower than the base state rather than wider than it.
 *   - THE EMBEDDED PASS SKIPS A NAME ELEMENT `EMBEDDED_NAME_SHAPED` REJECTS AND
 *     AN ID ELEMENT `EMBEDDED_ID_SHAPED` REJECTS. **READ THOSE TWO PREDICATES; DO
 *     NOT PARAPHRASE THEM HERE** - three successive paraphrases of the id one were
 *     published and all three were measured too narrow. A run found in prose ends
 *     at whatever punctuation comes first and can swallow the sentence around it;
 *     both narrowings apply to the EMBEDDED pass only and the whole-file `.edi`
 *     path keeps the base rules unchanged.
 *   - A NAME TOKEN WITH NO ASCII LETTER IN IT IS DROPPED BY `nameTokens`, ON BOTH
 *     ROUTES. So the `\p{L}` name class buys only elements in which `nameTokens`
 *     still finds one: a wholly non-Latin surname is skipped in a `.ts` literal AND in an
 *     `.edi` file, identically at base. PRE-EXISTING, disclosed, not closed here -
 *     widening `nameTokens` changes the whole-file path, which nothing else in
 *     this slice does.
 *
 * `PHI-SCAN-WALK-ROOT-SCOPE`, AND THE TWO SIDES IT HAS. The walk root moved from
 * `test/fixtures` to `test` and the `--staged` clauses from `test/fixtures/**`
 * plus `src/**.ts` to `test/**` plus `src/**`, both by UNION. That was only half
 * of it: ENUMERATING THOSE FILES BUYS ONLY THE `scanCommonShapes` FLOOR, because
 * they are `.ts` sources whose fixtures are string literals, so `looksLikeX12`
 * is false for every one of them and the NM1 name, NM1 member-id, NM1 NPI, PER
 * contact-name, PER communication-number, DMG date-of-birth and service-date
 * recognisers never ran. NAME THAT FLOOR AS THREE DETECTORS AND NEVER AS TWO: a
 * draft of this header said "the dashed-SSN and email floor" and a refuter
 * measured it false, because the `REF*SY` undashed nine-digit SSN recogniser is
 * not segment-aware either and fires on a bare string literal exactly as the
 * other two do. `scanEmbeddedSegments` is the other side, and each side is IN
 * ADDITION TO the other rather than instead of it.
 *
 * THE ONE CELL OF THAT WIDENING THAT WAS NOT ADDITIVE, AND IT WAS FOUND BY A
 * BASE/HEAD GRID RATHER THAN BY READING THE DIFF: `refuseUnusableRoots` used to
 * iterate the walk roots, so while `test/fixtures` WAS one, deleting it refused
 * at exit 2. Making `test` the root turned `test/fixtures` into an ordinary
 * subdirectory and, on a tree whose corpus was not yet COMMITTED, the same
 * deletion read `OK - no hits` at EXIT 0. `REQUIRED_DIRECTORIES` is the fix: what
 * must BE a directory is declared separately from what the sweep walks, because
 * the walk roots must stay disjoint and that list has no such constraint.
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
import { createHash } from "node:crypto";
import { join, resolve, relative, sep, isAbsolute } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPO_ROOT = process.cwd();
const ALLOW_LIST_PATH = join(REPO_ROOT, "scripts", "phi-allow-list.txt");
const OVERRIDE_LOG_PATH = join(REPO_ROOT, "phi-scan-overrides.md");

// ===========================================================================
// THE FIVE PER-REPO AXES, RE-DERIVED HERE AND NEVER PORTED
// ===========================================================================
//
// The shared template names five things that genuinely differ between the
// sibling scanners. A COUNT TAKEN ON ANOTHER TREE IS NOT AN ANSWER FOR THIS
// ONE, and neither is a count taken on this one last month: every figure below
// was measured on this repository and is re-derivable with the command beside
// it.
//
//   1. EXIT CODES. `EXIT_CLEAN` / `EXIT_HITS` / `EXIT_REFUSE`, immediately
//      below. This repo's numbers are 0 / 1 / 2, and 1 is NOT exclusive: the
//      residuals the header lists (an unreadable allow-list, an unreadable
//      directory under a walk root) still escape onto node's own exit 1, which
//      a caller reads as HITS. Named rather than claimed closed.
//   2. ROOTS + EXCLUSIONS. `WALK_ROOTS` is `test` + `src` and there is NO
//      exclusion list at all: nothing in this package is excused by literal
//      path on any route, and a class predicate is forbidden outright. The
//      union half below is scoped to the SAME roots, so it widens which BYTES
//      are read and never which PATHS are in scope.
//   3. `--staged` SCOPE. The `test/` + `src/` prefix clauses in
//      `buildTargetsForStaged`, unchanged by the union: widening what a COMMIT
//      is blocked on is a hook decision and is not this one.
//   4. GITLINKS. `REGULAR_BLOB_MODES` + `gitModeKind`, now read by BOTH
//      git-reading routes. Measured on this tree with
//      `git ls-files -s | awk '{print $1}' | sort | uniq -c`: 100644 and 100755
//      only, so this package carries no gitlink and no tracked symbolic link
//      today. That is the state the rule EXISTS for, not a reason to drop it.
//   5. EOL NORMALIZATION. `gitObjectHash` + `blobOid`. The union's dedupe is BY
//      CONTENT under git's own `blob <len>\0` framing, so where the index
//      carries LF and the working tree CRLF the two ids differ and BOTH forms
//      are scanned. Measured here: no `.gitattributes` exists and
//      `git config --get core.autocrlf` is unset, so the two copies do not
//      diverge on this box today. That makes the axis UNEXERCISED IN THE REAL
//      TREE, never inapplicable, and it is exactly why the dedupe is a content
//      comparison rather than a path comparison.
// ===========================================================================

/**
 * AXIS 1: the exit contract, as three names rather than three literals.
 *
 * 0 the scan ran, READ EVERY TARGET IT ENUMERATED, and found nothing. 1 HITS.
 * 2 every state this file RAISES in which the scan cannot account for
 * something: a bad argument, a missing allow-list, an unlogged bypass, a bypass
 * naming a path this run does not enumerate, a declared directory that is not
 * one, a tracked in-scope file the walk never opened, an in-scope entry that is
 * not a regular file, an unparseable git record, an index git cannot name or
 * names empty, an in-scope index entry that is not a regular blob, an in-scope
 * path with no stage-0 blob, a target whose bytes cannot be read, and a target
 * enumerated but never read.
 *
 * DO NOT PORT THESE NUMBERS INTO, OR OUT OF, A SIBLING. `hl7` answers 2 where
 * `terminology` answers 1 for the same shape by a different mechanism, and this
 * repo's own regular-file-root case moved from 1 to 2 when it was closed.
 */
const EXIT_CLEAN = 0;
const EXIT_HITS = 1;
const EXIT_REFUSE = 2;

// Roots walked in "all" mode. A file that IS an interchange gets the full
// X12-aware scan; every other file gets `scanCommonShapes` PLUS
// `scanEmbeddedSegments`, which reaches segment text a string literal is
// holding. That second pass is why `src/` and the `.ts` fixtures under `test/`
// are no longer covered by the shape floor alone.
// THAT PASS IS THREE DETECTORS, NOT TWO: dashed SSN, the `REF*SY` undashed
// nine-digit SSN, and a non-test email. This comment used to say "dashed-SSN +
// non-test email only" and it was measurably false - `REF*SY` is not
// segment-aware and fires on a bare string literal. Derive the set from
// `scanCommonShapes` rather than trusting any prose count of it, here included.
const TEST_ROOT = join(REPO_ROOT, "test");
const SRC_ROOT = join(REPO_ROOT, "src");

/**
 * The declared walk roots, as (absolute, repo-relative) pairs. All-mode owes an
 * account of every one of them: see `refuseUnusableRoots` (each must BE a
 * directory) and `reconcileObserved` (every tracked file under one must actually
 * have been opened). The repo-relative half is what a refusal prints and what
 * the `git ls-files` pathspec uses.
 *
 * `test` REPLACES `test/fixtures` AND THAT IS A UNION, NOT A SUBSTITUTION: the
 * old root is a subtree of the new one, so every file the walk opened before it
 * still opens. It is written as a replacement rather than an addition because
 * THE ROOTS MUST STAY DISJOINT - listing both would enumerate every fixture
 * twice and report each hit twice. Measured before this widening: 306 tracked
 * files, 163 opened, 143 opened by NEITHER the walk nor `--staged`, and 85 of
 * those were tracked `.ts` files sitting directly under `test/`, `test/property`,
 * `test/scripts` and `test/_helpers` - the inline-fixture corpus, which in an EDI
 * package is `.ts` string literals holding segment text rather than `.edi` files.
 * Derive both figures with `git ls-files`; never trust a number written down.
 */
const WALK_ROOTS: readonly { abs: string; rel: string }[] = [
  { abs: TEST_ROOT, rel: "test" },
  { abs: SRC_ROOT, rel: "src" },
];

/**
 * Directories that must EXIST AND BE DIRECTORIES. THIS IS A WIDER LIST THAN THE
 * WALK ROOTS, ON PURPOSE, AND SEPARATING THE TWO IS WHAT KEPT THE WIDENING FROM
 * COSTING A DETECTION.
 *
 * `refuseUnusableRoots` used to iterate the walk roots, so when `test/fixtures`
 * WAS a root, deleting it refused at exit 2. Widening the walk to `test` made
 * `test/fixtures` an ordinary subdirectory, and measured on a throwaway repo
 * whose corpus was not yet committed, deleting it went from exit 2 to
 * `OK - no hits` at EXIT 0 - the fixture corpus gone and the gate reporting
 * clean. `reconcileObserved` catches it once the corpus is COMMITTED, which is
 * the real repository's state, but "committed" is a precondition and a rule that
 * holds only under one is not the rule that was there before.
 *
 * So the declaration is kept and the walk is not. The two lists answer different
 * questions - "what does the sweep enumerate" and "what must be on disk for the
 * sweep to mean anything" - and conflating them is what made the widening look
 * additive when one cell of it was not. THE WALK ROOTS THEMSELVES MUST STAY
 * DISJOINT (nested roots enumerate a file twice and report every hit twice);
 * this list has no such constraint, because nothing walks it.
 */
const REQUIRED_DIRECTORIES: readonly { abs: string; rel: string }[] = [
  ...WALK_ROOTS,
  { abs: join(TEST_ROOT, "fixtures"), rel: "test/fixtures" },
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

  // THE MODE IS CHOSEN BY POSITIONAL PATHS ALONE, AND THE OLD SEED IS THE
  // DEFECT RATHER THAN A STYLE. A bypass is SUBTRACTIVE, so it must not also be
  // the thing that decides what gets scanned. The seed used to read
  // `paths.length > 0 ? paths : [...allowFixtures]`, and all four consequences
  // were measured on this scanner, in a throwaway repo laid out like this one,
  // over a corpus whose only violator carries a dashed SSN this file detects:
  //
  //   phi-scan --allow-fixture <violator>              `OK - no hits`, exit 0.
  //       The flag selected `paths` mode over exactly the file it then withdrew,
  //       and an empty target list reported clean. This is the worst of the four
  //       because it reads to a caller like a full-corpus sweep.
  //   phi-scan <clean> --allow-fixture <violator>      `OK - no hits`, exit 0.
  //       With a positional present the flag was a SILENT NO-OP: the violator
  //       was never ADMITTED to the run rather than withdrawn from it.
  //   phi-scan --staged --allow-fixture <violator>     `OK - no hits`, exit 0,
  //       on the route a commit is actually blocked on.
  //   phi-scan <violator> <clean> --allow-fixture <clean>   exit 1 with the
  //       violator's hit, and NOTHING said the withdrawn target was never read.
  //       Withdraw the violator instead and the same argv reports clean.
  //
  // With the mode decided here, a lone bypass leaves the run in `all` mode and
  // the two refusal tiers in `main` account for the flag.
  let mode: Args["mode"];
  if (staged) {
    mode = "staged";
  } else if (paths.length > 0) {
    mode = "paths";
  } else {
    mode = "all";
  }

  // UNCONDITIONAL, DEDUPED SEEDING, so the flag means the same thing in every
  // argv. Unioning admits the named path in every `paths` invocation, so the
  // withdrawal below is always a withdrawal of something ENUMERATED and is
  // therefore always caught by the completeness rule. Dedupe is by
  // repo-relative path, so `X --allow-fixture ./X` is one target and not two.
  const scanPaths = mode === "paths" ? dedupeByRepoPath([...paths, ...allowFixtures]) : paths;

  return { mode, paths: scanPaths, allowFixtures };
}

/**
 * Dedupe argument paths by the repo-relative path each resolves to, keeping the
 * caller's original spelling for the first occurrence: that spelling is what
 * `buildTargetsForPaths` resolves and what a diagnostic echoes back.
 */
function dedupeByRepoPath(paths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paths) {
    const key = normalizePath(p);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
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
  /**
   * Where these bytes came from, when it is not simply the file at `path`. Set
   * only by the index union, and it decorates THE REPORTED LOCUS ONLY: a hit in
   * a tracked blob whose working-tree copy differs must not read as a hit in
   * the file on disk, which a developer would open and find clean.
   *
   * `path` itself stays undecorated, because the read filters, the
   * `--allow-fixture` withdrawal and both completeness tiers are all keyed on
   * it: decorating it would silently re-SCOPE a target rather than re-label it.
   */
  origin?: string;
}

/**
 * AXIS 2, THE ROOT HALF OF SCOPE: is this path the scan's business at all?
 * Every non-regular and non-blob check keys on this and NEVER on the read
 * filter below. The bare root names are in scope because git records no index
 * entry for a directory, so `test` or `src` appearing AS an index entry can
 * only mean the root itself has been replaced by a blob or a link.
 */
function isUnderScanRoot(relPath: string): boolean {
  return WALK_ROOTS.some((r) => relPath === r.rel || relPath.startsWith(`${r.rel}/`));
}

/**
 * The walk roots' own repo-relative paths. AN INDEX ENTRY AT EXACTLY ONE OF
 * THESE IS THE ROOT, NOT A FILE UNDER IT, and every index-side rule exempts it
 * for the reason `reconcileObserved` sets out at length: the walk enumerates
 * `<root>/<name>` and never `<root>`, so such an entry can never be something
 * the walk observed, and a root that is a TRACKED symbolic link to a directory
 * is a documented SUPERSET scan rather than a blind one.
 */
const ROOT_RELS: ReadonlySet<string> = new Set(WALK_ROOTS.map((r) => r.rel));

/**
 * AXIS 2, THE READ HALF OF SCOPE FOR THE TWO SWEEPING ROUTES (the walk, and the
 * index union it is a union with). Markdown is documentation, not fixture data,
 * and may legitimately describe a violator value.
 *
 * THE TWO SWEEPING ROUTES SHARE THIS PREDICATE ON PURPOSE. The union exists to
 * read the bytes git carries at a path the walk did not read; it is the SAME
 * route by another door, so it inherits the same read filter. Giving the union
 * a wider filter of its own would make all-mode's verdict depend on which copy
 * of a file it happened to reach. The `--staged` route keeps its own,
 * pre-existing `.md` asymmetry, which is described where it lives.
 */
function isWalkReadable(relPath: string): boolean {
  return !relPath.toLowerCase().endsWith(".md");
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
 * success: with a declared directory absent the walk returns immediately and
 * all-mode prints `OK - no hits` at exit 0, and with a walk root replaced by a
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
  const bad = REQUIRED_DIRECTORIES.map((r) => ({ rel: r.rel, problem: rootProblem(r.abs) })).filter(
    (r): r is { rel: string; problem: string } => r.problem !== undefined,
  );
  if (bad.length === 0) return;
  const lines = bad.map((r) => `  - ${r.rel} (${r.problem})`).join("\n");
  const noun = bad.length === 1 ? "directory is" : "directories are";
  throw new InvocationError(
    `refusing the scan: ${String(bad.length)} declared scan ${noun} not a directory:\n` +
      `${lines}\n` +
      "A declared directory that is not one contributes no files at all, so the sweep would " +
      "report clean over every file it was supposed to cover. Restore it as a directory, or " +
      "update the declarations in scripts/phi-scan.ts if the layout genuinely changed.",
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
 * TRACKED symbolic link to a directory: `git ls-files` returns the root's own
 * path, the walk follows the link and enumerates the target's files under their
 * `<root>/*` names, and that is a documented SUPERSET scan which exits 1
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
 * `git ls-files -- test src` pathspec, under the target's own names, so
 * the entire link-target corpus is unreconciled rather than just the root entry.
 * Measured at head with the outermost root linked outside and a committed
 * violator behind it: present, exit 1; deleted from disk but still in the
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
  const unopened = gitTrackedUnderRoots().filter(
    (p) =>
      !observed.has(p) && !ignored.has(p) && !ROOT_RELS.has(p) && !p.toLowerCase().endsWith(".md"),
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
      // are documentation, not fixtures. This is the READ filter, shared with
      // the index union so the two sweeping routes cannot disagree about a
      // path, and the branch below is deliberately not subject to it.
      if (!isWalkReadable(normalizePath(full))) continue;
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
 * offender IN THE GROUP is named, not just the first: a developer who has to
 * re-run the gate once per link learns to distrust it. Each call is one group
 * and the first group that fires throws, so a tree with offenders in more than
 * one group names them a group per run.
 *
 * `noun` is overridable because the refusal must say something TRUE about what
 * it refused. An unmerged index path is not a non-regular file: it is a path
 * with no single blob, and reporting it as the former sends a developer looking
 * for a symbolic link that is not there. An index RECORD is not an entry on
 * disk either, and a gitlink's working tree may not exist at all.
 */
function refuseUnscannable(
  entries: Unscannable[],
  why: string,
  remedy: string,
  noun: { one: string; many: string } = {
    one: "entry is not a regular file",
    many: "entries are not regular files",
  },
): void {
  if (entries.length === 0) return;
  const lines = entries.map((u) => `  - ${u.path} (${u.kind})`).join("\n");
  const phrase = entries.length === 1 ? noun.one : noun.many;
  throw new InvocationError(
    `refusing the scan: ${String(entries.length)} ${phrase}:\n${lines}\n${why} ${remedy}`,
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

// ---------------------------------------------------------------------------
// The index half of `all` mode: the bytes git carries
// ---------------------------------------------------------------------------

/** The label a union hit carries. It decorates the LOCUS, never the path. */
const INDEX_ORIGIN = "as git carries it";

/** A stage-0 index entry: the mode git records, and the object it points at. */
interface IndexEntry {
  mode: string;
  oid: string;
}

/** `<mode> SP <oid> SP <stage> TAB <path>` - one `git ls-files -s -z` record. */
const INDEX_RECORD = /^(\d{6}) ([0-9a-f]+) (\d)\t([\s\S]+)$/;

/**
 * Every stage-0 index entry keyed by repo-relative path, plus the paths that
 * have a record and NO stage-0 record, or `null` when git could not answer.
 *
 * AN EMPTY ANSWER COUNTS AS NO ANSWER, and the two states that produce one
 * arrive through DIFFERENT branches, so a reader who merges them will delete
 * the wrong one. Measured here, on git 2.39.5:
 *
 *   - a directory that is NO repository at all FATALS (`fatal: not a git
 *     repository`, exit 128). THE `catch` IS WHAT TURNS THAT INTO `null`, so it
 *     is load-bearing rather than defensive: without it the throw escapes and
 *     the run takes node's own exit 1, which this file's contract reserves for
 *     HITS FOUND. `git ls-files` does not answer empty for this case;
 *   - a repository whose index is empty, and a directory inside a repository
 *     with nothing tracked under it, both print nothing and exit 0. That is
 *     what the size check at the end is for: an empty map would make every
 *     tracked path untracked, which is the one state in which the union
 *     silently stops existing.
 *
 * `-s` carries the MODE, which is the only thing separating a regular blob from
 * a symbolic link or a gitlink, and the OBJECT ID, which is what makes the
 * union's content deduplication exact. `-z` is NUL-separated and unquoted, so
 * the paths match the walk's forward-slash relative paths byte for byte.
 *
 * THE STAGE DIGIT IS READ, AND THE RULE IS THE ABSENCE OF STAGE 0. It is
 * neither re-derived from a record count nor ported from the `--staged` route:
 * that route spots an unmerged path from `--raw`'s status `U` and a destination
 * mode of `000000`, and NOTHING IN `ls-files -s` LOOKS LIKE THAT. Here an
 * unmerged path is reported only at stages 1, 2 and/or 3, with ORDINARY BLOB
 * MODES, so the mode rule below cannot see it at all. A sibling's draft took
 * the FIRST record per path and never looked at the stage: it scanned STAGE 1,
 * THE MERGE BASE, labelled it as the bytes git carries, and printed a clean
 * line over a marker living only in stage 3.
 */
function gitIndexEntries(): { entries: Map<string, IndexEntry>; unmerged: string[] } | null {
  let out: Buffer;
  try {
    // SECURITY: array-form execFileSync, no shell. `maxBuffer` is raised
    // because a TRUNCATED list is a SHORT list, and a short list is the
    // unscanned corpus this whole rule is about. Node throws `ENOBUFS` rather
    // than truncating, so the bound refuses either way; the headroom keeps a
    // legitimate repository from paying an opaque refusal for it.
    out = execFileSync("git", ["ls-files", "-s", "-z"], {
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
  const entries = new Map<string, IndexEntry>();
  const higherStages = new Set<string>();
  for (const rec of out.toString("utf8").split("\0")) {
    if (rec.length === 0) continue;
    const m = INDEX_RECORD.exec(rec);
    const mode = m?.[1];
    const oid = m?.[2];
    const stage = m?.[3];
    const path = m?.[4];
    if (mode === undefined || oid === undefined || stage === undefined || path === undefined) {
      // An unparseable record means the list may be SHORT in a way nothing here
      // can see, which is the one thing this sweep must never scan past.
      return null;
    }
    if (stage === "0") entries.set(path, { mode, oid });
    else higherStages.add(path);
  }
  // 🛑 THE TWO HALVES ARE NOT COMPLEMENTS, AND ASSUMING THEY ARE IS HOW THIS
  // REFUSAL GOES SILENT. The READ keys on the ABSENCE of stage 0, because only
  // a stage-0 record supplies one set of bytes. The REFUSAL keys on the
  // PRESENCE of ANY higher stage, and NO set difference is taken against
  // `entries`, because a path can carry BOTH. Measured on git 2.39.5:
  // `git update-index --index-info` adding stages 2 and 3 LEAVES STAGE 0 IN
  // PLACE, so `git ls-files -s` returns all three records while
  // `git diff --cached --raw` already reports that path as status `U`. Taking
  // the difference would hand such a path's stage-0 blob to the union and call
  // it the bytes git carries, over an index git itself will not let anyone
  // commit. A conflict git wrote itself has no stage 0 and is caught either
  // way; this shape is only caught by the wider half.
  const unmerged = [...higherStages];
  if (entries.size === 0 && unmerged.length === 0) return null;
  return { entries, unmerged };
}

/**
 * AXIS 5: the repository's object format as a Node hash name, or `null` when
 * git says something this file does not recognise. `null` disables the union's
 * content deduplication, which scans MORE, never less.
 *
 * WHEN GIT WILL NOT SAY AT ALL THE ANSWER IS `sha1`, NOT `null`, and the two
 * are stated apart because an auditor asking "can this silently assume sha1 in
 * a sha256 repository" deserves the right first answer. A git too old to know
 * `--show-object-format` predates sha256 repositories entirely, so the fallback
 * is a derivation rather than a guess; an answer this file does not recognise
 * comes from a git NEWER than it, and there the honest move is to stop
 * deduplicating and read both copies.
 */
function gitObjectHash(): string | null {
  let answer: string;
  try {
    // SECURITY: array-form execFileSync, no shell.
    answer = execFileSync("git", ["rev-parse", "--show-object-format"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString("utf8")
      .trim();
  } catch {
    return "sha1";
  }
  if (answer === "sha1") return "sha1";
  if (answer === "sha256") return "sha256";
  return null;
}

/**
 * AXIS 5: the object id git would record for these bytes, under its own
 * `blob <len>\0` framing. Used only to answer "did the walk already read
 * EXACTLY the bytes the index carries here", so a wrong answer can only ever
 * cost a second scan of the same content.
 *
 * THIS IS THE EOL AXIS. Where a `text` attribute or `core.autocrlf` makes the
 * index carry LF and the working tree CRLF, the two ids differ and BOTH copies
 * are scanned rather than one being assumed to stand for the other.
 */
function blobOid(algorithm: string, bytes: Buffer): string | null {
  try {
    return createHash(algorithm)
      .update(`blob ${String(bytes.length)}\0`)
      .update(bytes)
      .digest("hex");
  } catch {
    return null;
  }
}

/**
 * The in-scope tracked paths the union half is entitled to read: every stage-0
 * regular blob under a walk root that the read filter admits.
 *
 * IT IS COMPUTED BEFORE THE FIRST BYTE IS READ, AND THAT IS LOAD-BEARING
 * RATHER THAN A REFACTOR. This set is part of what `all` mode ENUMERATES, so
 * both completeness tiers in `main` see it: a bypass naming a tracked path
 * subtracts something real rather than being refused as naming nothing, and a
 * target that ends up unread is named by the unread refusal whichever route
 * would have read it.
 *
 * NO GITIGNORE FILTER, AND THAT IS DERIVED RATHER THAN FORGOTTEN. Every path
 * here is by construction TRACKED, and `git check-ignore` consults the index by
 * default, so it answers NOT-IGNORED for a tracked path even when a
 * `.gitignore` rule names it. Applying the walk's ignore set here would
 * therefore subtract nothing, and writing a filter that can never fire invites
 * the next reader to widen it into one that can.
 */
function unionCandidatePaths(index: Map<string, IndexEntry>): string[] {
  return [...index]
    .filter(([p, e]) => REGULAR_BLOB_MODES.has(e.mode) && isUnderScanRoot(p) && isWalkReadable(p))
    .filter(([p]) => !ROOT_RELS.has(p))
    .map(([p]) => p);
}

/**
 * THE UNION HALF of `all` mode: the bytes git carries at every in-scope tracked
 * path whose bytes the walk did not already read VERBATIM.
 *
 * `readOids` maps a path the walk actually READ to the object id of what it
 * read. A path absent from it was never opened, whatever the reason, so its
 * blob is scanned; a path present with a DIFFERENT id had a different copy
 * read, so its blob is scanned too. That second case is the EOL axis, and on
 * this tree it is the case that matters (see the header).
 *
 * WHY `cat-file blob` AND NOT A RE-READ OF THE PATH. Re-reading the path is
 * exactly what the walk already did, and the state where the path resolves to
 * something else entirely is the one a re-read cannot see. `cat-file blob`
 * names the OBJECT, so the bytes are the ones git carries whatever the working
 * tree currently says.
 */
function buildTargetsForGitIndex(
  index: Map<string, IndexEntry>,
  readOids: Map<string, string>,
): Target[] {
  const targets: Target[] = [];
  for (const path of unionCandidatePaths(index)) {
    const entry = index.get(path);
    if (entry === undefined) continue;
    if (readOids.get(path) === entry.oid) continue;
    targets.push({
      path,
      origin: INDEX_ORIGIN,
      // SECURITY: array-form execFileSync, no shell. The object id is git's own
      // output, and naming the OBJECT rather than the path is the whole point:
      // it cannot be redirected by whatever the working tree currently holds.
      // `execFileSync`'s default 1 MiB `maxBuffer` bounds this exactly as it
      // bounds the `git show` call `--staged` makes, and a blob past it FAILS
      // the read, which refuses (exit 2) rather than reporting a truncated scan
      // clean.
      read: (): Buffer =>
        execFileSync("git", ["cat-file", "blob", entry.oid], {
          encoding: "buffer",
          stdio: ["ignore", "pipe", "pipe"],
        }),
    });
  }
  return targets;
}

function buildTargetsForAll(): { targets: Target[]; index: Map<string, IndexEntry> } {
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

  // THE INDEX, READ ONCE. From here on `all` mode is a UNION of two routes and
  // no longer the walk's word alone. It is read AFTER `reconcileObserved`
  // deliberately: that rule refuses over a tracked in-scope path the walk never
  // enumerated at all, which is a discrepancy worth naming rather than papering
  // over by quietly reading git's copy instead. The union's own work begins
  // where that rule stops, at a path the walk DID enumerate and whose bytes are
  // not the bytes git carries.
  const listed = gitIndexEntries();
  if (listed === null) {
    throw new InvocationError(
      "refusing the sweep: git could not name this repository's index, or named it empty, so " +
        "the sweep would be the working-tree walk's word alone and could report clean over " +
        "tracked bytes it never opened. Run it inside a git repository with a readable index.",
    );
  }

  // Unmerged first, and under its OWN sentence: such a path is usually an
  // ordinary regular file and what it lacks is a SINGLE set of bytes, so
  // routing it through the mode rule below would name it with a sentence about
  // links and gitlinks that is false for it. The `--staged` route says the same
  // thing about `git show :<path>`; this one cannot, because it reads by object
  // id and there is no stage-0 entry to take an id from.
  refuseUnscannable(
    listed.unmerged
      .filter((p) => isUnderScanRoot(p) && !ROOT_RELS.has(p))
      .map((p) => ({ path: p, kind: "no stage-0 blob" })),
    "An unmerged path has no single merged blob, so there is no one set of bytes git carries " +
      "here for the sweep to read, only the conflicting sides and, where there is one, their base.",
    "Resolve the conflict and stage the result, then re-run.",
    { one: "in-scope index path is unmerged", many: "in-scope index paths are unmerged" },
  );

  // The index's own non-blob entries. Same rule and the same closed-set token
  // as the `--staged` route: git carries a link's TARGET PATH rather than any
  // content, and a gitlink carries another repository's commit id and no bytes
  // at this path at all. Scoped to `isUnderScanRoot`, which is AXIS 2's
  // business: a submodule outside the walk roots is none of this scan's.
  //
  // 🛑 IT IS A FAIL-CLOSED BACKSTOP AND IT CLOSES NO MEASURED HOLE IN THIS
  // REPOSITORY. STATE THAT RATHER THAN INHERITING THE SIBLING'S CLAIM. Every
  // cell it could own is already owned by an EARLIER and MORE SPECIFIC refusal
  // here, measured on a throwaway repo laid out like this one: a tracked
  // SYMBOLIC LINK under a root is refused by `refuseUnscannable` on the walk's
  // own entries, and a tracked GITLINK is refused by `reconcileObserved`,
  // whether its working tree is checked out or not (both exit 2, and both do so
  // at base as well as at head). It is kept because it costs one filter and
  // because those two refusals are the things that would have to stop firing
  // for it to matter, not because it was seen to fire.
  //
  // A WALK ROOT'S OWN INDEX ENTRY IS EXEMPT, EXACTLY AS IN `reconcileObserved`,
  // AND OMITTING THAT EXEMPTION COSTS A DOCUMENTED SCAN. Where a walk root is
  // itself a TRACKED symbolic link to a directory, `git ls-files` returns the
  // root's own path at mode 120000 while `existsSync` and `readdirSync` both
  // follow it, so the walk enumerates the target's files under their `<root>/*`
  // names and HITS over a PHI-bearing target (exit 1). Without the exemption
  // this refusal fires on that same tree and trades a working superset scan for
  // a refusal.
  refuseUnscannable(
    [...listed.entries]
      .filter(
        ([p, e]) => isUnderScanRoot(p) && !ROOT_RELS.has(p) && !REGULAR_BLOB_MODES.has(e.mode),
      )
      .map(([p, e]) => ({ path: p, kind: gitModeKind(e.mode) })),
    "Git records no readable content at such a path, so scanning it would prove nothing about " +
      "what it stands for.",
    "Untrack it, or replace it with a regular file.",
    // Its own noun: the offender is an INDEX RECORD, and a gitlink's working
    // tree may not exist at all, so "not a regular file" would send a developer
    // to look at a path where there is nothing to see.
    { one: "index entry is not a regular blob", many: "index entries are not regular blobs" },
  );

  return {
    targets: kept.map(({ abs, rel }) => ({ path: rel, read: () => readFileSync(abs) })),
    index: listed.entries,
  };
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

  // WIDENED BY UNION, NEVER BY REPLACEMENT. `test/` strictly contains the old
  // `test/fixtures/` clause and `src/` strictly contains the old `src/**.ts`
  // one, so every record this route enumerated before it still enumerates: this
  // can only ADD staged paths to the blocking route, never subtract one. There
  // is no exemption here and no predicate excusing anything, deliberately - a
  // corpus exemption that reaches the commit-blocking route is the defect
  // `@cosyte/dicom` paid an `INTRODUCED` major for, and the way to avoid
  // needing one is for the corpus to be clean rather than excused.
  //
  // The `.md` asymmetry with the walk is PRE-EXISTING and kept: the walk skips
  // a `.md` file by name, this route does not, so a staged markdown file under
  // one of these prefixes is scanned here and not there. That is the direction
  // that costs nothing (a staged `README` under a scan root carrying a name
  // exits 1) and removing it would subtract a detection.
  const inScope = staged.filter((s) => s.path.startsWith("test/") || s.path.startsWith("src/"));

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

function isSyntheticMemberId(id: string, allow: AllowList): boolean {
  const v = id.toUpperCase();
  // A DECLARED id clears here for the same reason it clears the `REF*SY` and NPI
  // checks: `ID <value>` in scripts/phi-allow-list.txt is the positive, reviewed
  // declaration that a value is synthetic, and this check had no route to it at
  // all - a member id that did not match one of the shapes below could only be
  // cleared by renaming it in every fixture that used it. Adding the route flips
  // NO cell this scanner already reported: every `ID` entry that predates it is
  // all-digit and so already matched the third shape.
  if (allow.ids.has(v)) return true;
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

/**
 * ELEMENT ELIGIBILITY IN AN EMBEDDED RUN, AND WHY IT EXISTS AT ALL.
 *
 * A whole-file `.edi` target has an ISA, so `splitSegments` knows where every
 * segment starts and ends and each element it produces IS an element. An
 * embedded run has neither: it is found by its segment id inside a `.ts` source
 * and ends at whatever punctuation comes first, so a run written in prose or in
 * a doc table can swallow the sentence around it and hand a "name" or an "id"
 * that is neither. These two predicates are the only difference between the
 * embedded checks and the whole-file ones, they apply to the EMBEDDED pass ONLY,
 * and they exist to stop the pass claiming a hit over text it mis-framed.
 *
 * Measured on this tree before they were added: an `NM1` inside a fenced doc
 * table in `test/builder-string-type.test.ts` reported its arrow column as an
 * SSN-qualified id, and an `NM1` quoted in a `//` comment in
 * `test/parser-segment.test.ts` reported the following English word as a person
 * name. Neither is PHI and neither is a fixture.
 *
 * SAY WHAT THIS COSTS, because it is a real narrowing of the EMBEDDED pass and
 * not a free win: a name element carrying anything but a letter, a combining
 * mark, a space, an apostrophe, a period or a hyphen is skipped there, and so is
 * an id element carrying anything but ASCII alphanumerics, `.`, `_` or `-`. The
 * whole-file `.edi` path is NOT narrowed - it does not take these predicates -
 * so nothing this scanner detected before detects less now.
 *
 * 🩺 "LETTER" IS `\p{L}` HERE, NOT `[A-Za-z]`, AND A REFUTER PAID FOR THAT - BUT
 * STATE WHAT IT BUYS AND NOTHING MORE. With the ASCII class, a name element
 * carrying a tilde-n or an acute accent was skipped outright and the file
 * reported clean. What this widening buys is MIXED-SCRIPT elements only:
 * `nameTokens` still drops any token with no ASCII letter in it, on BOTH routes,
 * so a wholly non-Latin surname is missed here and in an `.edi` file alike.
 * What this class buys is exactly the elements the ASCII class rejected while
 * `nameTokens` still finds an ASCII letter in them. That gap is PRE-EXISTING and
 * is disclosed in the header rather than closed. **NEVER WRITE THE UNQUALIFIED
 * FORM ("a surname is not an ASCII string, so this catches one") - a draft did,
 * in four places at once.**
 *
 * 🩺 AND THE APOSTROPHE IS IN THIS CLASS ONLY BECAUSE `EMBEDDED_RUN_STOP` NO
 * LONGER STOPS AT ONE - the two constants have to be read together. While `'`
 * was a run stop, this branch was DEAD and the failure was worse than a skip:
 * the run was TRUNCATED at the apostrophe, so every element after it ceased to
 * exist. Measured then, all clean: an `NM1` person name of the `O'Brien` shape
 * together with its `MI` member id; the same segment carrying a qualifier-34
 * SSN instead; and a `PER` contact name with a non-555 phone. `O'Brien`,
 * `D'Angelo` and `N'Diaye` are exactly the surnames a real de-identification
 * failure drops into a fixture, and the id, the SSN and the phone went with
 * them.
 */
const EMBEDDED_NAME_SHAPED = /^\p{L}[\p{L}\p{M}' .-]*$/u;
const EMBEDDED_ID_SHAPED = /^[0-9A-Za-z][0-9A-Za-z._-]*$/;

function nameElementEligible(el: string, embedded: boolean): boolean {
  return !embedded || EMBEDDED_NAME_SHAPED.test(el);
}

function idElementEligible(el: string, embedded: boolean): boolean {
  return !embedded || EMBEDDED_ID_SHAPED.test(el);
}

function checkNm1(
  path: string,
  elems: string[],
  allow: AllowList,
  hits: Hit[],
  embedded: boolean,
): void {
  const entityType = elems[2] ?? "";
  const qualifier = elems[8] ?? "";
  const idValue = elems[9] ?? "";

  // SSN qualifier (34) must never appear in a synthetic fixture.
  if (qualifier === "34" && idValue.length > 0 && idElementEligible(idValue, embedded)) {
    pushHit(hits, path, "NM1", idValue, "SSN (NM1 qualifier 34) in fixture");
  }

  if (entityType === "1") {
    // person - last / first / middle name elements
    for (const el of [elems[3], elems[4], elems[5]]) {
      if (el === undefined || el.length === 0) continue;
      if (!nameElementEligible(el, embedded)) continue;
      for (const tok of nameTokens(el)) {
        if (!allow.names.has(tok.toUpperCase())) {
          pushHit(hits, path, "NM1", tok, "person-name token not in synthetic allow-list");
        }
      }
    }
    if (
      qualifier === "MI" &&
      idValue.length > 0 &&
      idElementEligible(idValue, embedded) &&
      !isSyntheticMemberId(idValue, allow)
    ) {
      pushHit(hits, path, "NM1", idValue, "member-id shape not recognized as synthetic");
    }
  }

  if (qualifier === "XX" && /^[0-9]{10}$/.test(idValue) && !isSyntheticNpi(idValue, allow)) {
    pushHit(hits, path, "NM1", idValue, "NPI shape not recognized as synthetic");
  }
}

function checkPer(
  path: string,
  elems: string[],
  allow: AllowList,
  hits: Hit[],
  embedded: boolean,
): void {
  // PER02 is a free-text contact name; PER04/06/08 are communication numbers.
  const name = elems[2];
  if (name !== undefined && nameElementEligible(name, embedded)) {
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

function scanX12(locus: string, text: string, allow: AllowList, hits: Hit[]): void {
  for (const elems of splitSegments(text)) {
    const id = elems[0] ?? "";
    if (id === "NM1") checkNm1(locus, elems, allow, hits, false);
    else if (id === "PER") checkPer(locus, elems, allow, hits, false);
    else if (id === "DMG") checkDmg(locus, elems, allow, hits);
    if (DATE_SEGMENTS.has(id)) checkServiceDates(locus, elems, hits);
  }
  // Cross-cutting shape checks over the whole payload.
  scanCommonShapes(locus, text, allow, hits);
}

// ---------------------------------------------------------------------------
// Embedded X12 segments inside a file that is not itself an interchange
// ---------------------------------------------------------------------------

/**
 * THE RECOGNISER HALF OF THE WALK-ROOT WIDENING, AND IT IS "IN ADDITION TO", NEVER
 * "INSTEAD OF".
 *
 * Enumerating the tracked files under `test/` buys the `scanCommonShapes` floor
 * and NOTHING ELSE, because `looksLikeX12` asks whether the FILE IS an
 * interchange - it must start with `ISA` and be at least 106 bytes - and this
 * package's inline fixtures are `.ts` string literals holding segment text. So a
 * `.ts` file carrying `NM1*IL*1*<real surname>*<real given name>` went down the
 * plain-text branch, where the NM1 person-name, NM1 member-id, NM1 NPI, PER
 * contact-name, PER communication-number, DMG date-of-birth and service-date
 * recognisers never ran at all. NAME THE FLOOR AS THREE DETECTORS AND NEVER AS
 * TWO: dashed SSN, the `REF*SY` undashed nine-digit SSN and a non-test email are
 * all unanchored `matchAll` passes, so they DID reach a string literal already.
 * Everything else did not, and this pass is what closes that half.
 *
 * 🛑 WHAT IT DOES NOT DO. THIS IS A SYNTACTIC TRIPWIRE OVER SOURCE TEXT AND NOT A
 * PARSER, SO THE LIST BELOW IS WHAT HAS BEEN MEASURED AND IS EXPLICITLY NOT A
 * CLOSED CENSUS. A draft published it as "four bounds" in four places and a
 * refuter found two more in one pass; finding one more is EXPECTED and is not a
 * new finding. **Cut the claim back, never grow the guard**, and NEVER PUBLISH A
 * COUNT OF THESE - that is the same rule `X12-NUMERIC-VALUE-EMITS-EMPTY` was
 * refuted three times for breaking.
 *   - it infers NO delimiters, because there is no ISA to declare them. The
 *     element separator is taken to be `*`, which is what every fixture in this
 *     package uses and what X12 uses by overwhelming convention. A segment
 *     embedded in a `.ts` literal under a NON-DEFAULT element separator is not
 *     reached. Open, disclosed, and narrower than the base state rather than
 *     wider than it.
 *   - it recognises only the segment ids the checks below actually consume. A
 *     generic "any segment" recogniser over arbitrary source text is what
 *     produces a gate nobody believes; the rule here is cut back, never grow.
 *   - it does not run on a whole-file interchange. Those go through `scanX12`,
 *     which has real delimiters, and running both would report every hit twice.
 *   - a BRACE-FREE template placeholder is removed before the split
 *     (`/\$\{[^{}]*\}/g`). That keeps an interpolated fixture's ELEMENT
 *     POSITIONS, which truncating at the `$` would not - but say the other two
 *     halves too, because a draft named only the benefit: THE REMOVED BYTES LEAVE
 *     THIS PASS'S VIEW ENTIRELY, so a name an interpolation holds is never
 *     checked; and the strip is NOT recursive, so a placeholder containing braces
 *     survives and a `"` inside it then truncates the run.
 *   - A SEGMENT SPLIT ACROSS A CONCATENATION IS NOT REACHED. A segment id and its
 *     elements written as two adjacent string literals is clean where the same
 *     bytes unsplit are two hits. Nothing in this corpus is written that way
 *     today, which is what makes it latent rather than noise.
 *   - the run stops at the FIRST `"`, backtick, `~`, backslash or newline, so a
 *     segment carrying any of those inside an element is truncated there and
 *     every later element ceases to exist. `'` IS NOT IN THAT SET, and both what
 *     that buys and what it costs are written out at `EMBEDDED_RUN_STOP`.
 *   - the segment ids are matched CASE-SENSITIVELY, as `scanX12` matches them.
 */
const EMBEDDED_SEGMENT_IDS = ["NM1", "PER", "DMG", "DTP", "DTM", "BHT", "GS"] as const;
const EMBEDDED_SEGMENT_RE = new RegExp(
  `(?:^|[^0-9A-Za-z])(${EMBEDDED_SEGMENT_IDS.join("|")})\\*`,
  "g",
);
/**
 * Where an embedded run ends. `~` is the conventional segment terminator; `"` and
 * the backtick are where a `.ts` string literal ends; a backslash is where an
 * escape begins and the bytes stop being the fixture's own; and a newline ends
 * any of them. A run is NOT required to end at `~`: measured on this tree, three
 * real inline-fixture hits in `test/phi-diagnostic-surface.test.ts` are written
 * with no terminator at all, so requiring one would have been a hole a leak fits
 * through exactly.
 *
 * 🩺 `'` IS DELIBERATELY ABSENT AND MUST STAY ABSENT. It is a string-literal
 * delimiter in TypeScript, so it belongs here by symmetry with `"` - and putting
 * it here TRUNCATES every embedded run at the first apostrophe, which silently
 * dropped an `O'Brien`-shaped surname along with the member id, qualifier-34 SSN
 * or phone that followed it. A surname's apostrophe is worth more than a
 * single-quoted literal's boundary.
 *
 * 🛑 SAY WHAT THAT COSTS, BECAUSE A DRAFT SAID THE PREDICATES "ALREADY HANDLE"
 * IT AND THEY DO NOT - THEY DISCARD IT. A run inside a SINGLE-QUOTED literal now
 * overruns that literal's own closing delimiter and absorbs the surrounding
 * source into its LAST element, which the shape predicates then skip. So a
 * single-quoted fixture whose id is its final element is not checked at all:
 * measured, `'NM1*IL*1******34*<9 digits>'` and the `MI` equivalent each exit 0
 * where the double-quoted form exits 1, and a single-quoted name element in a
 * multi-declarator `const` loses its last token the same way. Both the qualifier-
 * 34 SSN and the member id are shapes `scanCommonShapes` does NOT cover. It is a
 * bound of this pass and NOT a regression - measured 0 at base on every route,
 * `src/**` included - it is listed with the others at `scanEmbeddedSegments`, and
 * the remedy is NEVER to put `'` back: that trades a rare literal style for every
 * apostrophe surname.
 */
const EMBEDDED_RUN_STOP = /["`~\\\n\r]/;

function scanEmbeddedSegments(locus: string, content: string, allow: AllowList, hits: Hit[]): void {
  const text = content.replace(/\$\{[^{}]*\}/g, "");
  for (const m of text.matchAll(EMBEDDED_SEGMENT_RE)) {
    const id = m[1];
    if (id === undefined) continue;
    // `m[0]` ends with the `*` separator; the run starts there so the split
    // below produces the segment id as element 0, exactly as `splitSegments`.
    let end = (m.index ?? 0) + m[0].length - 1;
    while (end < text.length && !EMBEDDED_RUN_STOP.test(text.charAt(end))) end += 1;
    const elems = (id + text.slice((m.index ?? 0) + m[0].length - 1, end)).split("*");
    if (id === "NM1") checkNm1(locus, elems, allow, hits, true);
    else if (id === "PER") checkPer(locus, elems, allow, hits, true);
    else if (id === "DMG") checkDmg(locus, elems, allow, hits);
    if (DATE_SEGMENTS.has(id)) checkServiceDates(locus, elems, hits);
  }
}

// ---------------------------------------------------------------------------
// Shape checks shared by X12 and plain-text targets
// ---------------------------------------------------------------------------

function scanCommonShapes(locus: string, content: string, allow: AllowList, hits: Hit[]): void {
  // Dashed SSN anywhere.
  for (const m of content.matchAll(/\b\d{3}-\d{2}-\d{4}\b/g)) {
    pushHit(hits, locus, "(ssn)", m[0], "dashed SSN pattern");
  }
  // REF*SY*<value> (SSN qualifier) - 9-digit value must be allow-listed.
  for (const m of content.matchAll(/REF.SY.([0-9]{9})\b/g)) {
    const v = m[1];
    if (v !== undefined && !allow.ids.has(v.toUpperCase())) {
      pushHit(hits, locus, "REF", v, "SSN (REF qualifier SY) not in synthetic allow-list");
    }
  }
  // Emails whose domain is not an allow-listed reserved/test domain.
  for (const m of content.matchAll(/\b[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g)) {
    const domain = (m[1] ?? "").toLowerCase();
    if (!allow.emailDomains.has(domain)) {
      pushHit(hits, locus, "(email)", m[0], "email with non-test domain");
    }
  }
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

/**
 * Scan one target and RETURN THE BYTES IT OBSERVED. The bytes are returned
 * rather than a boolean so `all` mode can ask whether the walk already read
 * exactly what the index carries at this path; see `buildTargetsForGitIndex`.
 *
 * SCOPE IS DECIDED ON `target.path`, AND ONLY THE REPORTED LOCUS CARRIES THE
 * ORIGIN LABEL, so a labelled target is never a differently-scoped one.
 */
function scanTarget(target: Target, allow: AllowList, hits: Hit[]): Buffer {
  let buf: Buffer;
  try {
    buf = target.read();
  } catch (err) {
    throw new InvocationError(
      `could not read ${target.path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const text = buf.toString("utf8");
  const locus = target.origin === undefined ? target.path : `${target.path} (${target.origin})`;
  if (looksLikeX12(text)) {
    scanX12(locus, text, allow, hits);
  } else {
    // Non-X12 target (hand-written src, a test holding inline fixtures,
    // plain-text notes). BOTH passes run, and the second is IN ADDITION TO the
    // first rather than instead of it: the shape pass is the only thing that
    // reaches text with no segment framing at all, and the embedded pass is the
    // only thing that reaches segment text a string literal is holding.
    scanCommonShapes(locus, text, allow, hits);
    scanEmbeddedSegments(locus, text, allow, hits);
  }
  return buf;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

/**
 * Print the hits. SPLIT FROM THE CLEAN LINE ON PURPOSE: `main` reports hits
 * BEFORE it can refuse for incompleteness, so a run that is both incomplete AND
 * carrying hits prints both rather than swallowing one. The clean line is
 * printed by `main` only once the completeness tiers have passed, so
 * `OK - no hits` can never appear beside a refusal.
 */
function reportHits(hits: Hit[]): void {
  if (hits.length === 0) return;
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
  // THE FOOTER NO LONGER ADVERTISES `--allow-fixture`, AND THAT IS A DECISION
  // RATHER THAN AN OMISSION. A bypass withdraws a file from the read set and
  // the completeness rule then refuses (exit 2) over a target enumerated and
  // never read, so a developer following the old printed remedy would be walked
  // out of exit 1 and into exit 2. A printed remedy that cannot reach the state
  // it promises is the same defect as one that reaches a false green, with the
  // sign flipped. The flag, the override log and the rejection gate all remain,
  // so an attempt is RECORDED AND REFUSED rather than silently honored.
  process.stderr.write(
    `[phi-scan] ${String(hits.length)} hit(s) across ${String(byPath.size)} file(s). ` +
      `If a value is genuinely synthetic, declare it in scripts/phi-allow-list.txt: ` +
      `a token-level, reviewed declaration is the only remedy that reaches a clean run. ` +
      `A whole-file --allow-fixture bypass is recorded and then REFUSED (exit 2), because ` +
      `a scan that never opened a file has no clean verdict to give about it.\n`,
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
      return EXIT_REFUSE;
    }
    throw err;
  }

  const allowed = new Set<string>(args.allowFixtures.map(normalizePath));

  let allow: AllowList;
  let targets: Target[];
  // `all` mode's index, read once: it is the union half's whole enumeration.
  // `null` in the other two modes, which are not sweeps and do not have one.
  let index: Map<string, IndexEntry> | null = null;
  try {
    // `loadAllowList()` IS INSIDE THIS HANDLER NOW, AND THE PLACEMENT IS THE
    // POINT. Outside it, a missing `scripts/phi-allow-list.txt` threw an
    // uncaught `InvocationError` and the run took node's own exit 1, which this
    // contract reserves for HITS FOUND: a caller that branches on the code, and
    // CI is one, read "this corpus contains PHI" from a run that never opened a
    // file. The live trigger is not a fresh checkout (the allow-list is
    // committed) but the scanner invoked from the wrong working directory,
    // since `REPO_ROOT` is `process.cwd()`.
    allow = loadAllowList();
    if (args.mode === "staged") targets = buildTargetsForStaged();
    else if (args.mode === "paths") targets = buildTargetsForPaths(args.paths);
    else {
      const built = buildTargetsForAll();
      targets = built.targets;
      index = built.index;
    }
  } catch (err) {
    if (err instanceof InvocationError) {
      process.stderr.write(`[phi-scan] ${err.message}\n`);
      return EXIT_REFUSE;
    }
    throw err;
  }

  // ENUMERATED: the set of paths this run DECLARED it would read. Everything
  // the read filters dropped upstream (a `.md` file on the sweeping routes, a
  // gitignored entry, a staged path outside the two prefix clauses) never
  // became a target and is not in here, which is why the completeness rule
  // below does not fire on them. ENUMERATION IS THIS RUN'S OWN DECLARATION,
  // never a universal claim about the corpus.
  //
  // IN `all` MODE IT IS THE WALK'S TARGETS UNION THE IN-SCOPE TRACKED PATHS.
  // The union half reads the second set minus whatever the walk already read
  // verbatim, and that dedupe collapses on the SAME path key: a path the union
  // skips is a path the walk already put in `read`, so the difference below
  // stays exact either way.
  const enumerated = new Set<string>(targets.map((t) => t.path));
  if (index !== null) for (const p of unionCandidatePaths(index)) enumerated.add(p);

  // TIER 1: A BYPASS MUST NAME A PATH THIS RUN ENUMERATES. Otherwise it
  // subtracts nothing, and a flag that subtracts nothing lets a developer
  // believe a file was acknowledged when the run never had it in scope.
  // Compared by DIFFERENCE against the enumerated set, and every offender is
  // named. It fires BEFORE any target is read, so there is no hit for it to
  // swallow.
  const unmatched = [...allowed].filter((p) => !enumerated.has(p));
  if (unmatched.length > 0) {
    process.stderr.write(
      `[phi-scan] --allow-fixture names ${String(unmatched.length)} path(s) this run does not ` +
        `enumerate, so the flag subtracts nothing:\n${unmatched.map((p) => `  - ${p}`).join("\n")}\n` +
        `Scan a corpus that contains the path, or drop the flag.\n`,
    );
    return EXIT_REFUSE;
  }

  const hits: Hit[] = [];
  // READ: filled in only after a target's bytes have been through `scanTarget`.
  // This is evidence of OBSERVATION, never a plan to observe.
  const read = new Set<string>();
  // Path -> object id of the bytes the walk actually read, so the union below
  // can skip a path whose content it would otherwise scan a second time.
  const readOids = new Map<string, string>();
  const objectHash = index === null ? null : gitObjectHash();

  const sweep = (batch: Target[]): number | null => {
    for (const t of batch) {
      if (allowed.has(t.path)) continue;
      let bytes: Buffer;
      try {
        bytes = scanTarget(t, allow, hits);
      } catch (err) {
        if (err instanceof InvocationError) {
          process.stderr.write(`[phi-scan] ${err.message}\n`);
          return EXIT_REFUSE;
        }
        throw err;
      }
      read.add(t.path);
      if (objectHash !== null && t.origin === undefined) {
        const oid = blobOid(objectHash, bytes);
        if (oid !== null) readOids.set(t.path, oid);
      }
    }
    return null;
  };

  const walkFailure = sweep(targets);
  if (walkFailure !== null) return walkFailure;

  // THE UNION. It runs AFTER the walk, not instead of it, and only over the
  // paths the walk did not already read verbatim. On a clean checkout it adds
  // ZERO reads and never invokes `git cat-file` at all.
  if (index !== null) {
    const unionFailure = sweep(buildTargetsForGitIndex(index, readOids));
    if (unionFailure !== null) return unionFailure;
  }

  // TIER 2, THE COMPLETENESS RULE: A SET DIFFERENCE, NEVER A SIZE COMPARISON.
  // A count counts the targets that DID get read, so `n read of n targets` is
  // exactly the arithmetic that hides which ones did not. Names every offender.
  const unread = [...enumerated].filter((p) => !read.has(p));

  // Hits FIRST, so the refusal below can never swallow one. THAT IS A GUARANTEE
  // ABOUT THIS REFUSAL AND NOT ABOUT REFUSALS IN GENERAL: a target whose bytes
  // cannot be read refuses from INSIDE `sweep`, which does discard the hits
  // found before it. That one is pre-existing and left alone deliberately, it
  // exits 2 rather than green, and salvaging a partial hit list would be a
  // claim about a corpus the scan just said it could not account for.
  reportHits(hits);

  if (unread.length > 0) {
    process.stderr.write(
      `[phi-scan] refusing the scan: ${String(unread.length)} target(s) were enumerated and ` +
        `never read:\n${unread.map((p) => `  - ${p}`).join("\n")}\n` +
        `A scan that did not open a file has no clean verdict to give about it. If the file is ` +
        `genuinely synthetic, declare its identifiers in scripts/phi-allow-list.txt rather than ` +
        `withdrawing the file from the scan.\n`,
    );
    return EXIT_REFUSE;
  }

  if (hits.length > 0) return EXIT_HITS;
  process.stdout.write("[phi-scan] OK - no hits\n");
  return EXIT_CLEAN;
}

process.exit(main());

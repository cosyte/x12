#!/usr/bin/env tsx
/**
 * `@cosyte/x12` PHI scanner: the CI / pre-commit half of the PHI commit-gate.
 *
 * ===========================================================================
 * WHAT IS IN THIS FILE, AND WHAT IS NOT.
 *
 * The MACHINERY is `@cosyte/script-utils/phi-scan`, a devDependency: argument
 * parsing, the allow-list and the override log, target enumeration on all three
 * routes, the union of the working-tree walk with the bytes git carries, content
 * deduplication, THE COMPLETENESS RULE, every refusal, and the cross-cutting
 * SSN/email FLOOR. Read that module's docblock for what each rule closes and
 * what it costs. Nothing of it is restated here, because a claim written down
 * twice is a claim that drifts, and this file used to carry both copies.
 *
 * IT IS A DEPENDENCY AND NOT A COPY, AND THAT IS THE POINT. The machinery was
 * hand-maintained here, and in twelve sibling repos, because
 * `scripts/parser-template/` in `cosyte/config` is a SCAFFOLD rather than a
 * dependency. A newly-found escape therefore cost one pull request and one
 * adversarial review PER REPO, and three escape classes have been paid for that
 * way already. Now it costs one pull request in `cosyte/config` and a version
 * bump here. It is a devDependency and never a runtime one: the zero-dep rule
 * governs what ships, and a dev-time gate does not ship.
 *
 * WHAT STAYS LOCAL is what genuinely differs: THE FIVE PER-REPO AXES below, and
 * the X12-SPECIFIC FIELD DETECTION in `detect` at the bottom of this file.
 * ===========================================================================
 *
 * ===========================================================================
 * EXIT CONTRACT, DEFINED HERE AND NOT INHERITED:
 *
 *   0  the scan ran, READ EVERY TARGET IT ENUMERATED, and found nothing.
 *   1  HITS. Reserved for "this corpus contains something that looks like PHI".
 *      It is NOT exclusive: an allow-list, or an override log, that EXISTS but
 *      cannot be READ throws a plain `Error` and takes node's own exit 1, which
 *      a caller reads as "hits found". The engine names that escape rather than
 *      claiming to have closed it.
 *   2  EVERY STATE THE ENGINE RAISES IN WHICH THE SCAN CANNOT ACCOUNT FOR
 *      SOMETHING. The full list is in the engine's `run()` docblock.
 *
 * 1 IS RESERVED BECAUSE CI AND THE PRE-COMMIT HOOK BRANCH ON THE CODE. A caller
 * must be able to tell "PHI was found here" from "this scan is not trustworthy".
 *
 * 🛑 DO NOT PORT THESE NUMBERS INTO, OR OUT OF, A SIBLING PARSER. The `@cosyte/*`
 * scanners do not agree on them and are not required to. A regular-file walk
 * root is 2 here, 2 in `hl7`, and 1 in `terminology` by a different mechanism.
 * That is why the engine has no default for them.
 * ===========================================================================
 *
 * ===========================================================================
 * WHAT THIS REPO USED TO DO THAT THE ENGINE HAS NO PARAMETER FOR, AND WHAT WAS
 * DECIDED ABOUT EACH. Every row was driven at base (the hand-maintained scanner
 * this file replaces) and at head, on throwaway repositories laid out like this
 * one, over a synthetic payload whose `NM1` person name, `DMG` date of birth,
 * `PER` phone, `REF*SY` SSN and dashed SSN are all hits at an ordinary file.
 *
 *   1. `REQUIRED_DIRECTORIES` - a list, WIDER than the walk roots, of paths that
 *      had to EXIST AND BE DIRECTORIES (`test`, `src`, and `test/fixtures`,
 *      which is not a walk root). NOT RE-IMPLEMENTED, and the ground is a
 *      measurement rather than a preference: the rule existed because an emptied
 *      or absent directory contributed zero files and a sweep still printed
 *      clean. The engine reads the index as a union with the walk, so the bytes
 *      git carries at every in-scope tracked path the walk did not read verbatim
 *      are scanned anyway. Driven at head with `test/fixtures` DELETED from disk
 *      while its committed violator was still in the index: exit 1, the hit
 *      labelled `(as git carries it)`. Base refused (exit 2) over the same tree.
 *      SAY WHAT THAT TRADE IS, because the two verdicts are not the same claim:
 *      base said "this layout is wrong", head says "here is the PHI in it". Both
 *      are non-zero; neither is a false clean. What is NOT carried over is a
 *      refusal over a declared directory that is missing AND has nothing tracked
 *      under it, which at head is a root the walk skips in silence. That state
 *      is named in the engine's `walkRoots` docblock as one it does not close.
 *
 *   2. A WALK ROOT THAT IS ITSELF A SYMBOLIC LINK. Base FOLLOWED it (`statSync`
 *      through the link) and called the result a documented superset scan, with
 *      a disclosed residual that nothing behind the link was reconciled, so an
 *      emptied link target read `OK - no hits` at exit 0. The engine `lstat`s at
 *      a root and REFUSES a link there instead. Driven: base exit 1 with the
 *      target's corpus scanned under `<root>/*` names, and exit 0 once that
 *      corpus was emptied; head exit 2 in both. THE SUPERSET SCAN IS GONE AND
 *      THE RESIDUAL WITH IT. That is a deliberate loss of reach in exchange for
 *      a state the gate can account for, and it is the engine's call rather than
 *      this file's: `scanRoots` is a `string[]` and a root's kind is derived.
 *
 *   3. `reconcileObserved` - the index reconciliation that refused when a
 *      tracked in-scope file was not among those the walk enumerated. Its work
 *      is done by the union, which SCANS those bytes rather than refusing over
 *      them. Driven with a tracked violator removed from disk: base exit 2
 *      naming the path, head exit 1 naming the same path plus the hit.
 *
 *   4. THE `--staged` ARGV. Base pinned `--no-renames --ignore-submodules=none
 *      --diff-filter=AMTUB`; the engine pins `--no-renames --diff-filter=d`.
 *      `d` is an EXCLUSION ("everything except deletions"), so every letter the
 *      old allow-list named is still enumerated and so is any letter nobody has
 *      thought of. 🔴 `--ignore-submodules=none` IS NOT PINNED BY THE ENGINE AND
 *      THIS ADOPTION LOSES IT. Driven at head on a repo with
 *      `diff.ignoreSubmodules=all` set and a gitlink staged under `test/`: the
 *      record is absent from `--raw`, so the route enumerates nothing for that
 *      path and exits 0, where base refused at exit 2. It is a REFUSAL that is
 *      lost, not a scan: a gitlink carries a commit id and no bytes at that
 *      path, so no PHI-bearing content goes unread through this route by that
 *      route alone. It is filed against the engine rather than worked around
 *      here, because the argv is the engine's and a local override of it would
 *      be the fork this adoption exists to end.
 *
 *   5. THE DASHED-SSN FLOOR NOW CONSULTS THE ALLOW-LIST, AND BASE'S DID NOT.
 *      The engine's floor clears a dashed SSN whose value, or whose digits with
 *      the separators removed, is declared `ID` in `scripts/phi-allow-list.txt`.
 *      This repo declares undashed nine-digit ids there for the `REF*SY` check,
 *      so the DASHED rendering of one of them now clears where base raised it.
 *      Driven on both: a dashed rendering of a declared id is exit 1 at base and
 *      exit 0 at head, while a dashed shape that is NOT declared is exit 1 on
 *      both. That is a real narrowing of this repo's detection, it is the
 *      engine's shared floor rather than a local choice, and the remedy if it
 *      ever matters is to remove the declaration, not to re-add a local branch.
 *
 *   6. THE `--allow-fixture` BYPASS CANNOT REACH EXIT 0 IN ANY MODE. Base
 *      honored a logged bypass and reported clean. The engine records it and
 *      then refuses, because a scan that did not open a file has no clean
 *      verdict to give about it. `phi-scan-overrides.md` is updated to say so;
 *      `scripts/phi-allow-list.txt` is the remedy that reaches a clean run.
 * ===========================================================================
 */

import {
  runPhiScan,
  type AllowList,
  type DetectContext,
} from "@cosyte/script-utils/phi-scan";

// ===========================================================================
// ██  THE FIVE PER-REPO AXES  ███████████████████████████████████████████████
// ===========================================================================
//
// A PORT IS NOT A COPY. Five things genuinely differ between the sibling
// `@cosyte/*` scanners, and every one of them is a PARAMETER of the shared
// engine rather than a fork of it. Every one is re-derived HERE, on this tree.
//
//   1. EXIT CODES        `EXIT_CODES`. No default exists, deliberately.
//   2. ROOTS+EXCLUSIONS  `SCAN_ROOTS`, the exclusion set, and the READ filter.
//   3. `--staged` SCOPE  `isStagedReadable`.
//   4. GITLINKS          `regularBlobModes`, defaulted by the engine to git's
//                        two regular-blob modes. Derived below and left unset.
//   5. EOL NORMALIZATION No parameter. Derived below; it must be CHECKED, not
//                        skipped.
// ===========================================================================

/** AXIS 1: this repo's exit contract, stated in the header block above. */
const EXIT_CODES = { clean: 0, hits: 1, refuse: 2 } as const;

/**
 * AXIS 2: the roots `all` mode walks, and the roots every index-keyed rule is
 * scoped to.
 *
 * `test` AND `src`, CARRIED OVER UNCHANGED FROM THE SCANNER THIS FILE REPLACES.
 * `test` replaced `test/fixtures` when the walk was widened, and that was a
 * UNION rather than a substitution: the old root is a subtree of the new one, so
 * every file the walk opened before it still opens. Derive the census from
 * `git ls-files` rather than from any number written down.
 *
 * 🛑 NEITHER ROOT IS `./`-PREFIXED, AND THAT IS CHECKED RATHER THAN ASSUMED. A
 * `./`-prefixed root walks correctly while matching NO index path, which empties
 * the union and both index refusals in silence. The engine normalises a root the
 * same way it normalises every other path, so `./test` and `test` are one root
 * there now, but the plain spelling is what this file declares.
 *
 * 🛑 NARROWING THIS IS A SCOPE DECISION AND IT IS THE AXIS MOST LIKELY TO BE
 * WRONG. Widening it is one too: a tracked path OUTSIDE `test` and `src` is read
 * by neither sweeping route, which is this axis's boundary and a decision of its
 * own. Derive that set (`git ls-files | grep -v '^test/\|^src/'`); do not quote
 * a figure from here. Widening the sweep to the whole repository is a change
 * that must be argued and measured on its own, and this slice did not make it.
 */
const SCAN_ROOTS: readonly string[] = ["test", "src"];

/**
 * AXIS 3: the READ half of scope for `--staged`, i.e. which regular blobs a
 * COMMIT is blocked on. `test/**` plus `src/**`, carried over unchanged.
 *
 * 🛑 IT MUST STAY INSIDE `SCAN_ROOTS`, AND THE ENGINE ENFORCES THAT RATHER THAN
 * ASSUMING IT: a staged path this admits and no scan root covers is REFUSED,
 * naming the path, because the checks that key on the ROOT half of scope never
 * ran for it. A reviewer measured what the missing containment cost elsewhere: a
 * staged mode-120000 entry outside every scan root was enumerated, read, had the
 * LINK'S TARGET PATH handed to the detector as if it were content, and reported
 * `OK: no hits` at exit 0. Here the containment holds by inspection - every path
 * this predicate admits starts `test/` or `src/`, and `test` and `src` are the
 * roots - and the engine's refusal is the check on that reading, not a
 * substitute for it.
 *
 * 🛑 THIS IS NOT THE SWEEP'S READ FILTER, AND THE ASYMMETRY IS DELIBERATE AND
 * PRE-EXISTING. The walk drops a `.md` file by name and this route does not, so
 * a staged markdown file under one of these prefixes is scanned here and not
 * there. That is the direction that costs nothing (a staged `README` under a
 * scan root carrying a person name exits 1) and applying `exemptsMarkdown` here
 * would SUBTRACT a detection from the commit-blocking route.
 *
 * @param relPath A repo-relative, forward-slashed path.
 * @returns `true` when a commit is blocked on this staged blob's contents.
 */
function isStagedReadable(relPath: string): boolean {
  return relPath.startsWith("test/") || relPath.startsWith("src/");
}

// AXIS 2, THE SUBTRACTIVE HALF: `excludedPaths` IS DELIBERATELY NOT SET, SO IT
// IS THE ENGINE'S EMPTY DEFAULT. NOTHING IN THIS PACKAGE IS EXCUSED BY LITERAL
// PATH ON ANY ROUTE, INCLUDING THIS GATE'S OWN TEST FILE. That file carries
// violator-shaped values, which in a sibling is exactly what earns a literal
// exclusion; here every one of them is ASSEMBLED at run time with `seg(...)`
// rather than written as literal segment text, so the gate reads the file on all
// three routes and finds nothing to raise. Excluding it instead would have to
// reach `--staged` as well as the sweep, or nobody could commit an edit to it
// again, and an exemption that reaches the commit-blocking route is the defect a
// sibling paid an `INTRODUCED` major for. 🛑 A CLASS PREDICATE ("skip binary
// blobs", "skip generated files") IS FORBIDDEN OUTRIGHT: a sibling measured that
// one would have dropped two of its own hand-written sources, which embed NUL
// bytes as HMAC domain separators.
//
// AXIS 2, THE READ HALF: `isWalkReadable` IS DELIBERATELY NOT SET EITHER. The
// engine's default is the shared Markdown exemption, which is what this repo's
// walk applied by hand, so leaving it unset is what makes that boundary move for
// every repo at once through a version bump. The consequence is route-dependent
// and is the engine's to state: a tracked `.md` is read by NEITHER sweeping
// route, while a `.md` named explicitly on argv IS scanned.
//
// AXIS 4, GITLINKS: `regularBlobModes` IS DELIBERATELY NOT SET, so it is the
// engine's default of git's two regular-blob modes. Re-derived on this tree
// rather than assumed: `git ls-files -s | cut -c1-6 | sort -u` returns `100644`
// and `100755` and nothing else, so this tree carries no gitlink and no tracked
// symbolic link today. That is the state the rule exists FOR, not a reason to
// drop it.
//
// AXIS 5, EOL NORMALIZATION: no parameter, and it is CHECKED rather than
// skipped. No `.gitattributes` is tracked and `core.autocrlf` is unset, so the
// two copies of a path do not diverge on this tree today. THAT MAKES THE AXIS
// UNEXERCISED HERE, NEVER INAPPLICABLE, and it is exactly why the engine's
// walk/index deduplication is a CONTENT comparison under git's own
// `blob <len>\0` framing rather than a path comparison: where a `text` attribute
// or `core.autocrlf` makes the index carry LF and the working tree CRLF, the two
// object ids differ and BOTH forms are scanned.

// ---------------------------------------------------------------------------
// X12 field detection: the half the shared engine deliberately does not own
// ---------------------------------------------------------------------------

// Service / transaction-date segments. Their dates are CCYYMMDD and a real feed
// would carry a past date; synthetic fixtures use 2024+. DMG (date of birth) is
// deliberately NOT here: a synthetic DOB is legitimately decades old, so DOBs
// are gated by the allow-list instead (DOB: lines), not by this cutoff.
const DATE_SEGMENTS = new Set<string>(["DTP", "DTM", "BHT", "GS"]);
const SERVICE_DATE_CUTOFF_YEAR = 2024;

/** Raise a hit against the locus the engine chose. Never build a path here. */
type Raise = (segment: string, value: string, reason: string) => void;

function looksLikeX12(text: string): boolean {
  const t = text.replace(/^﻿/, "");
  return t.startsWith("ISA") && t.length >= 106;
}

/** Split raw X12 into segments then elements, using ISA-declared delimiters. */
function splitSegments(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const elementSep = t.charAt(3); // ISA byte 3 is always the element separator
  const segmentTerm = t.charAt(105); // ISA is exactly 106 bytes; terminator at 105
  return t
    .split(segmentTerm)
    .map((s) => s.replace(/[\r\n]+/g, "").trim())
    .filter((s) => s.length > 0)
    .map((s) => s.split(elementSep));
}

/** Word tokens (len >= 2, carrying an ASCII letter) inside an X12 name element. */
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
  // all before that was added: a member id that did not match one of the shapes
  // below could only be cleared by renaming it in every fixture that used it.
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
 * is disclosed rather than closed. **NEVER WRITE THE UNQUALIFIED FORM ("a
 * surname is not an ASCII string, so this catches one") - a draft did, in four
 * places at once.**
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

function checkNm1(elems: string[], allow: AllowList, raise: Raise, embedded: boolean): void {
  const entityType = elems[2] ?? "";
  const qualifier = elems[8] ?? "";
  const idValue = elems[9] ?? "";

  // SSN qualifier (34) must never appear in a synthetic fixture.
  if (qualifier === "34" && idValue.length > 0 && idElementEligible(idValue, embedded)) {
    raise("NM1", idValue, "SSN (NM1 qualifier 34) in fixture");
  }

  if (entityType === "1") {
    // person: last / first / middle name elements
    for (const el of [elems[3], elems[4], elems[5]]) {
      if (el === undefined || el.length === 0) continue;
      if (!nameElementEligible(el, embedded)) continue;
      for (const tok of nameTokens(el)) {
        if (!allow.names.has(tok.toUpperCase())) {
          raise("NM1", tok, "person-name token not in synthetic allow-list");
        }
      }
    }
    if (
      qualifier === "MI" &&
      idValue.length > 0 &&
      idElementEligible(idValue, embedded) &&
      !isSyntheticMemberId(idValue, allow)
    ) {
      raise("NM1", idValue, "member-id shape not recognized as synthetic");
    }
  }

  if (qualifier === "XX" && /^[0-9]{10}$/.test(idValue) && !isSyntheticNpi(idValue, allow)) {
    raise("NM1", idValue, "NPI shape not recognized as synthetic");
  }
}

function checkPer(elems: string[], allow: AllowList, raise: Raise, embedded: boolean): void {
  // PER02 is a free-text contact name; PER04/06/08 are communication numbers.
  const name = elems[2];
  if (name !== undefined && nameElementEligible(name, embedded)) {
    for (const tok of nameTokens(name)) {
      if (!allow.names.has(tok.toUpperCase())) {
        raise("PER", tok, "contact-name token not in synthetic allow-list");
      }
    }
  }
  for (const idx of [4, 6, 8]) {
    const comm = elems[idx];
    if (comm === undefined) continue;
    const digits = comm.replace(/[^0-9]/g, "");
    // 10+ digit comm number that lacks the 555 fake-exchange convention.
    if (digits.length >= 10 && !digits.includes("555")) {
      raise("PER", comm, "phone/fax without the 555 fake-exchange convention");
    }
  }
}

function checkDmg(elems: string[], allow: AllowList, raise: Raise): void {
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
    raise("DMG", dob, "date of birth not in synthetic allow-list");
  }
}

function checkServiceDates(elems: string[], raise: Raise): void {
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
        raise(
          elems[0] ?? "?",
          d,
          `service/transaction date before ${String(SERVICE_DATE_CUTOFF_YEAR)}`,
        );
      }
    }
  }
}

/**
 * THE RECOGNISER HALF OF THE WALK-ROOT WIDENING, AND IT IS "IN ADDITION TO",
 * NEVER "INSTEAD OF".
 *
 * Enumerating the tracked files under `test/` buys the cross-cutting floor and
 * NOTHING ELSE, because `looksLikeX12` asks whether the FILE IS an interchange -
 * it must start with `ISA` and be at least 106 bytes - and this package's inline
 * fixtures are `.ts` string literals holding segment text. So a `.ts` file
 * carrying an `NM1` with a real surname went down the plain-text branch, where
 * the NM1 person-name, NM1 member-id, NM1 NPI, PER contact-name, PER
 * communication-number, DMG date-of-birth and service-date recognisers never ran
 * at all. This pass is what closes that half.
 *
 * 🛑 NAME THE FLOOR PRECISELY, BECAUSE A DRAFT NAMED IT WRONG AND A REFUTER
 * MEASURED THE ERROR. What reaches a bare string literal without this pass is:
 * the engine's dashed-SSN shape, the engine's non-allow-listed email shape, and
 * this file's own `REF*SY` undashed nine-digit SSN check, which is an unanchored
 * `matchAll` and is not segment-aware either. Everything else did not.
 *
 * 🛑 WHAT IT DOES NOT DO. THIS IS A SYNTACTIC TRIPWIRE OVER SOURCE TEXT AND NOT
 * A PARSER, SO THE LIST BELOW IS WHAT HAS BEEN MEASURED AND IS EXPLICITLY NOT A
 * CLOSED CENSUS. A draft published it as "four bounds" in four places and a
 * refuter found two more in one pass; finding one more is EXPECTED and is not a
 * new finding. **Cut the claim back, never grow the guard**, and NEVER PUBLISH A
 * COUNT OF THESE.
 *   - it infers NO delimiters, because there is no ISA to declare them. The
 *     element separator is taken to be `*`, which is what every fixture in this
 *     package uses and what X12 uses by overwhelming convention. A segment
 *     embedded in a `.ts` literal under a NON-DEFAULT element separator is not
 *     reached. Open, disclosed, and narrower than the base state rather than
 *     wider than it.
 *   - it recognises only the segment ids the checks below actually consume. A
 *     generic "any segment" recogniser over arbitrary source text is what
 *     produces a gate nobody believes; the rule here is cut back, never grow.
 *   - it does not run on a whole-file interchange. Those go through the
 *     `splitSegments` branch, which has real delimiters, and running both would
 *     report every hit twice.
 *   - a BRACE-FREE template placeholder is removed before the split
 *     (`/\$\{[^{}]*\}/g`). That keeps an interpolated fixture's ELEMENT
 *     POSITIONS, which truncating at the `$` would not - but say the other two
 *     halves too, because a draft named only the benefit: THE REMOVED BYTES
 *     LEAVE THIS PASS'S VIEW ENTIRELY, so a name an interpolation holds is never
 *     checked; and the strip is NOT recursive, so a placeholder containing
 *     braces survives and a `"` inside it then truncates the run.
 *   - A SEGMENT SPLIT ACROSS A CONCATENATION IS NOT REACHED. A segment id and
 *     its elements written as two adjacent string literals is clean where the
 *     same bytes unsplit are two hits. Nothing in this corpus is written that
 *     way today, which is what makes it latent rather than noise.
 *   - the run stops at the FIRST `"`, backtick, `~`, backslash or newline, so a
 *     segment carrying any of those inside an element is truncated there and
 *     every later element ceases to exist. `'` IS NOT IN THAT SET, and both what
 *     that buys and what it costs are written out at `EMBEDDED_RUN_STOP`.
 *   - the segment ids are matched CASE-SENSITIVELY, as the whole-file branch
 *     matches them.
 */
const EMBEDDED_SEGMENT_IDS = ["NM1", "PER", "DMG", "DTP", "DTM", "BHT", "GS"] as const;
const EMBEDDED_SEGMENT_RE = new RegExp(
  `(?:^|[^0-9A-Za-z])(${EMBEDDED_SEGMENT_IDS.join("|")})\\*`,
  "g",
);

/**
 * Where an embedded run ends. `~` is the conventional segment terminator; `"`
 * and the backtick are where a `.ts` string literal ends; a backslash is where
 * an escape begins and the bytes stop being the fixture's own; and a newline
 * ends any of them. A run is NOT required to end at `~`: measured on this tree,
 * three real inline-fixture hits in `test/phi-diagnostic-surface.test.ts` are
 * written with no terminator at all, so requiring one would have been a hole a
 * leak fits through exactly.
 *
 * 🩺 `'` IS DELIBERATELY ABSENT AND MUST STAY ABSENT. It is a string-literal
 * delimiter in TypeScript, so it belongs here by symmetry with `"` - and putting
 * it here TRUNCATES every embedded run at the first apostrophe, which silently
 * dropped an `O'Brien`-shaped surname along with the member id, qualifier-34 SSN
 * or phone that followed it. A surname's apostrophe is worth more than a
 * single-quoted literal's boundary.
 *
 * 🛑 SAY WHAT THAT COSTS, BECAUSE A DRAFT SAID THE PREDICATES "ALREADY HANDLE"
 * IT AND THEY DO NOT - THEY DISCARD IT. A run inside a SINGLE-QUOTED literal
 * overruns that literal's own closing delimiter and absorbs the surrounding
 * source into its LAST element, which the shape predicates then skip. So a
 * single-quoted fixture whose id is its final element is not checked at all:
 * measured, an `NM1` carrying a qualifier-34 nine-digit id and the `MI`
 * equivalent each exit 0 in that form where the double-quoted form exits 1, and
 * a single-quoted name element in a multi-declarator `const` loses its last
 * token the same way. Both the qualifier-34 SSN and the member id are shapes the
 * cross-cutting floor does NOT cover. It is a bound of this pass and NOT a
 * regression, it is listed with the others above, and the remedy is NEVER to put
 * `'` back: that trades a rare literal style for every apostrophe surname.
 */
const EMBEDDED_RUN_STOP = /["`~\\\n\r]/;

function scanEmbeddedSegments(content: string, allow: AllowList, raise: Raise): void {
  const text = content.replace(/\$\{[^{}]*\}/g, "");
  for (const m of text.matchAll(EMBEDDED_SEGMENT_RE)) {
    const id = m[1];
    if (id === undefined) continue;
    // `m[0]` ends with the `*` separator; the run starts there so the split
    // below produces the segment id as element 0, exactly as `splitSegments`.
    let end = (m.index ?? 0) + m[0].length - 1;
    while (end < text.length && !EMBEDDED_RUN_STOP.test(text.charAt(end))) end += 1;
    const elems = (id + text.slice((m.index ?? 0) + m[0].length - 1, end)).split("*");
    if (id === "NM1") checkNm1(elems, allow, raise, true);
    else if (id === "PER") checkPer(elems, allow, raise, true);
    else if (id === "DMG") checkDmg(elems, allow, raise);
    if (DATE_SEGMENTS.has(id)) checkServiceDates(elems, raise);
  }
}

/**
 * X12's own cross-cutting shape check, which the engine's floor does not carry.
 *
 * The engine already ran the dashed-SSN and non-allow-listed-email shapes over
 * `ctx.text` and reported them against the correct locus, so neither is repeated
 * here: doing so would report every one of them twice. What IS repeated nowhere
 * else is the `REF*SY` UNDASHED nine-digit SSN, which is an X12 qualifier and so
 * belongs to this repo rather than to the shared floor. It is unanchored, so it
 * reaches a bare string literal as well as a framed interchange, and it runs on
 * BOTH branches of `detect` for that reason.
 *
 * It consults `allow.ids`, which is the rule for every detector this file adds:
 * the `--allow-fixture` bypass cannot reach a clean run, so a detector that
 * consults nothing leaves a developer with a hit and no remedy at all.
 */
function checkRefSy(content: string, allow: AllowList, raise: Raise): void {
  for (const m of content.matchAll(/REF.SY.([0-9]{9})\b/g)) {
    const v = m[1];
    if (v !== undefined && !allow.ids.has(v.toUpperCase())) {
      raise("REF", v, "SSN (REF qualifier SY) not in synthetic allow-list");
    }
  }
}

/**
 * The X12-specific, field-level detection: the half the shared engine
 * deliberately does not own, because it differs per healthcare standard.
 *
 * The engine has already run the cross-cutting floor (dashed SSN + email shapes)
 * over `ctx.text` and reported any hits against the correct locus. Everything
 * here is this repo's.
 *
 * TWO BRANCHES, AND THEY ARE EXCLUSIVE ON PURPOSE. A target that IS an
 * interchange has ISA-declared delimiters, so it is framed properly; a target
 * that is not gets the syntactic embedded-segment tripwire instead. Running both
 * over an interchange would report every hit twice. `checkRefSy` is OUTSIDE the
 * branch because it is a whole-payload shape rather than a framing-dependent
 * one, exactly as it was before this file became a thin caller.
 *
 * @param ctx The target's text and bytes, the parsed allow-list, and `hit`.
 */
function detect(ctx: DetectContext): void {
  // 🛑 RAISE THROUGH `ctx.hit`, NEVER BY BUILDING A PATH. The sweep reads the
  // bytes git carries as a union with the working-tree walk, and a hit found in
  // a tracked blob whose disk copy differs is labelled `(as git carries it)`.
  // The engine fills that locus in, so a hit cannot be reported against a path a
  // developer would open and find clean.
  const raise: Raise = (segment, value, reason) => {
    ctx.hit({ segment, value, reason });
  };

  if (looksLikeX12(ctx.text)) {
    for (const elems of splitSegments(ctx.text)) {
      const id = elems[0] ?? "";
      if (id === "NM1") checkNm1(elems, ctx.allow, raise, false);
      else if (id === "PER") checkPer(elems, ctx.allow, raise, false);
      else if (id === "DMG") checkDmg(elems, ctx.allow, raise);
      if (DATE_SEGMENTS.has(id)) checkServiceDates(elems, raise);
    }
  } else {
    scanEmbeddedSegments(ctx.text, ctx.allow, raise);
  }

  checkRefSy(ctx.text, ctx.allow, raise);
}

process.exit(
  runPhiScan({
    exitCodes: EXIT_CODES,
    scanRoots: SCAN_ROOTS,
    isStagedReadable,
    detect,
    // `excludedPaths`, `isWalkReadable` and `regularBlobModes` are deliberately
    // NOT set. Each is derived in the axes block above; leaving them at the
    // engine's defaults is what makes a shared boundary one change in
    // `cosyte/config` plus a version bump here.
  }),
);

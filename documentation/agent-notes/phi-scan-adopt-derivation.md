# `PHI-SCAN-ADOPT` in `x12`: the parameters, derived, and what the engine must take

**🛑 THIS BRANCH IS NOT FOR MERGE.** It carries a working adoption of
`@cosyte/script-utils/phi-scan@0.0.2` as EVIDENCE for the derivation below, not as a shipped change.
There is no changeset and no `CHANGELOG.md` entry, deliberately. Founder directive, mid-slice,
2026-08-11: _"all updates go to script-utils to parameterize the process"_, so this repo's
`scripts/phi-scan.ts` is to become DECLARATIVE PARAMETERS and every piece of process is the engine's.
This file is the derivation and the engine specification that directive asks for.

Everything below was measured on this tree, or on throwaway repositories laid out like it, against a
synthetic payload whose `NM1` person name, `DMG` date of birth, `PER` phone, `REF*SY` SSN and dashed
SSN are all hits at an ordinary regular file. **BASE** is `origin/main`'s 1,544-line hand-maintained
scanner. **HEAD** is this branch, calling `runPhiScan(config)`.

---

## 0. The two pre-checks the item requires, answered

**1. Is any scan root `./`-prefixed?** **NO.** `origin/main` declares its roots as
`{ abs, rel }` pairs and the `rel` halves are `test`, `src` and (in the second list) `test/fixtures`.
Derived with two tools that agree exactly (`grep -n 'rel: "'` and `rg -n 'rel: "'` over
`git show main:scripts/phi-scan.ts`), and a search for `rel: "./` returns nothing under either. This
matters because a `./`-prefixed root walks correctly while matching no index path, which empties the
union and both index refusals in silence.

**2. Does `isStagedReadable` admit anything outside `scanRoots`?** **NO.** `origin/main`'s staged
clause is `path.startsWith("test/") || path.startsWith("src/")` and its roots are `test` and `src`,
so every path the clause admits is under a root by inspection. The engine enforces the containment
rather than assuming it, and across the whole base/head grid below no head run ever produced the
`staged path is readable but outside every scan root` refusal. The state that refusal exists for was
measured elsewhere and is worth restating: a staged mode-120000 entry outside every scan root was
enumerated, read, had the LINK'S TARGET PATH handed to the detector as if it were content, and
reported `OK: no hits` at exit 0.

---

## 1. Criterion 1: the completeness probe, against `origin/main`

🛑 **`pnpm drift` grades the WORKING TREE, so a repo with this branch checked out reports as
PASSING.** It was not used. The probe was called directly against each version's scanner, in the
drift check's own graded shape (name a violator and a decoy positionally, withdraw the decoy with a
logged `--allow-fixture`, and read the exit code against the repo's own derived hits code):

| scanner       | control: violator alone | control: decoy alone | graded     | verdict                                                                                     |
| ------------- | ----------------------- | -------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `origin/main` | exit 1, marker present  | exit 0               | **exit 1** | 🔴 **DRIFT**: reported only its HITS code (1) over a run that withdrew an enumerated target |
| this branch   | exit 1, marker present  | exit 0               | **exit 2** | ok: REFUSED a run that withdrew an enumerated target                                        |

**So `x12` on `origin/main` HAS the `phi-scan completeness probe` drift, and this branch does not
land the fix, because this branch is not being merged.** The drift stays open on `origin/main` until
the engine ships the parameterization below and this repo adopts it.

---

## 2. The parameters, as DATA

### AXIS 1: exit codes

```
exitCodes = { clean: 0, hits: 1, refuse: 2 }
```

`1` is reserved but NOT exclusive: an allow-list or an override log that EXISTS but cannot be READ
throws a plain `Error` and takes node's own exit 1. 🛑 **Never port these numbers in or out.** A
walk root replaced by a regular file is 2 here, 2 in `hl7`, and 1 in `terminology` by a different
mechanism.

### AXIS 2: roots, and the second list that is not a walk root

`origin/main` declares **two** path lists over three paths, and they answer different questions:

```
WALK_ROOTS          = [ { abs: <repo>/test, rel: "test" },
                        { abs: <repo>/src,  rel: "src"  } ]

REQUIRED_DIRECTORIES = WALK_ROOTS + [ { abs: <repo>/test/fixtures, rel: "test/fixtures" } ]
```

- **`test` and `src` carry the WALK role**: enumerate under them, and scope every index-keyed rule to
  them.
- **`test/fixtures` carries a REQUIRE role and NOT the walk role**: it must EXIST AND BE A DIRECTORY,
  and it is deliberately not walked, because `test` already contains it and `origin/main`'s walk
  roots had to stay disjoint or a nested root enumerated every file twice and reported every hit
  twice.

🩺 **THE `{ abs, rel }` PAIR IS NOT A PARAMETER AND MUST NOT BECOME ONE.** Both halves are process
(`abs` feeds `statSync`/`readdirSync`, `rel` feeds the `git ls-files` pathspec and the refusal text),
and `abs` is literally `join(REPO_ROOT, rel)` for all three entries. §4(a) has the derivation and the
correction. **What is genuinely declarative is the repo-relative name plus a ROLE:**

```
scanRoots = [
  "test",
  "src",
  { rel: "test/fixtures", walk: false, require: true },
]
```

**The subtractive half is EMPTY, deliberately**: `excludedPaths = []`. Nothing in this package is
excused by literal path on any route, including this gate's own test file: its violator payloads are
ASSEMBLED at run time rather than written as literal segment text, so the gate reads that file on all
three routes and finds nothing to raise. An exclusion would have to reach `--staged` as well as the
sweep or nobody could commit an edit to it again. 🛑 A CLASS predicate is forbidden outright.

**The read half is the shared Markdown exemption**, i.e. the engine's default: `exemptMarkdown =
true`.

**The boundary of this axis, stated because it is a scope decision and not a closure.** Derive it,
never quote it, and the derivation is `git ls-files -z` split on NUL:

```
git ls-files -z | python3 -c "import sys; ps=[p for p in sys.stdin.buffer.read().split(b'\0') if p]; \
  out=[p for p in ps if not (p.startswith(b'test/') or p.startswith(b'src/'))]; \
  print(len(ps), len(out), sum(1 for p in out if p.lower().endswith(b'.md')))"
```

At this commit: **355 tracked, 91 outside `test/` and `src/`, of which 59 are `.md`** (exempt on the
walk even under a widened root) **and 32 are not.**

🩺 **THAT FIGURE MOVED WHILE THIS FILE WAS BEING WRITTEN, AND THE MOVE IS THE LESSON.** A first
reading of `355/91` was `354/90`, taken before this document was committed: **this file is itself a
tracked `.md` outside the roots, so it incremented both.** Two tools agreed on the wrong-by-then
figure, and what caught it was the split not summing (59 + 32 against a recorded 90). **Two agreeing
tools do not make a number current. Re-derive it.**

**Would widening to `scanRoots: ["."]` be right for x12? MEASURED, AND NO.** Two siblings widened to
`["."]` and recommend it; `cli` measured that it breaks that repo. **It breaks x12 too, for a
different reason than `cli`'s, so neither recommendation was copied.** Driven on the real x12 tree
with the head scanner and `SCAN_ROOTS` set to `["."]`:

```
[phi-scan] HIT: package.json
  segment=(email) value="hello@cosyte.com" (email with non-test domain)
[phi-scan] 1 hit(s) across 1 file(s).                                    exit 1
```

`package.json`'s author address is a real address of a real organisation. The only remedies are to
declare `EMAILDOMAIN cosyte.com`, which clears our own domain on EVERY route including the
commit-blocking one and so weakens the email floor for actual fixtures, or to exclude
`package.json` by literal path, which buys a file the scan then has no verdict about. **Neither is
free, so narrow roots are load-bearing here and the widening is not proposed.** Bound the claim: this
says nothing about the other 31 non-`.md` paths outside the roots, which this run read and raised
nothing on; it is one run over one tree, not a clearance for them.

### AXIS 3: `--staged` scope

```
stagedReadable = prefixes ["test/", "src/"], markdown NOT exempt
```

Two properties, both load-bearing:

- It is exactly "everything under the scan roots", **minus a root's own path**. `origin/main`
  discloses that as an open residual: an index entry at exactly `test` or `src` matches no clause,
  because every clause tests a `<root>/` PREFIX.
- **Markdown is NOT exempt here, and the asymmetry with the walk is deliberate and pre-existing.** A
  staged `.md` under a scan root carrying a person name exits 1; applying the Markdown exemption
  here would SUBTRACT a detection from the commit-blocking route. Measured at head: a staged
  `test/notes.md` carrying the payload is exit 1.

### AXIS 4: gitlinks

`regularBlobModes` is the engine's default of git's two regular-blob modes. **Re-derived on this
tree** rather than assumed: `git ls-files -s` returns `100644` (353 records) and `100755` (2
records) and nothing else, agreeing across `cut -c1-6` and `awk '{print $1}'`, and summing to the 355
tracked paths above. **No gitlink and no tracked symbolic link exist here today. That is the state
the rule exists FOR, not a reason to drop it**, and see §4(b), where the one measured regression of
this adoption is precisely a gitlink refusal.

### AXIS 5: EOL normalization

No parameter, and it is CHECKED rather than skipped: **no `.gitattributes` is tracked and
`core.autocrlf` is unset**, so the two copies of a path do not diverge on this tree today. **That
makes the axis UNEXERCISED HERE, never inapplicable.** It is why the engine's walk/index
deduplication is a CONTENT comparison under git's own `blob <len>\0` framing.

---

## 3. The measured base/head grid

Each row is one throwaway repository driven against both scanners. `[reports]` means the run printed
the payload's own tokens, i.e. it found the PHI rather than merely failing.

| state                                                               | BASE         | HEAD            |
| ------------------------------------------------------------------- | ------------ | --------------- |
| violator as an ordinary regular file                                | 1 [reports]  | 1 [reports]     |
| clean repo                                                          | 0            | 0               |
| symlink ENTRY under `test/fixtures`                                 | 2            | 2               |
| staged symlink under `test/fixtures`                                | 2            | 2               |
| inline `.ts` fixture holding an embedded `NM1` name                 | 1 [reports]  | 1 [reports]     |
| staged ordinary violator under `test/`                              | 1 [reports]  | 1 [reports]     |
| staged `.md` under `test/` carrying a person name                   | 1 [reports]  | 1 [reports]     |
| not a git repository at all                                         | 2            | 2               |
| dashed shape NOT declared in the allow-list                         | 1 [reports]  | 1 [reports]     |
| **committed violator, scrubbed CLEAN on disk (copies differ)**      | 🔴 **0**     | **1** [reports] |
| **walk root `test` is a SYMLINK whose target corpus is EMPTIED**    | 🔴 **0**     | **2**           |
| **`--allow-fixture` over a LOGGED violator path**                   | 🔴 **0**     | **2**           |
| **the drift probe's graded argv**                                   | 🔴 **0 / 1** | **2**           |
| `test/fixtures` DELETED, committed violator still in the index      | 2            | 1 [reports]     |
| `test/fixtures` DELETED, nothing tracked under it                   | 2            | 1 [reports]     |
| tracked violator REMOVED from disk, still in the index              | 2            | 1 [reports]     |
| walk root `test` is a SYMLINK to a dir holding a violator (present) | 1 [reports]  | 2               |
| `git init` only, NOTHING committed, violator on disk                | 1 [reports]  | 2               |
| **dashed rendering of a DECLARED nine-digit `ID`**                  | **1**        | 🔴 **0**        |
| **staged GITLINK under `test/` with `diff.ignoreSubmodules=all`**   | **2**        | 🔴 **0**        |

**Read the last two rows as losses and the four bold zeros above them as gains.** Four states in
which `origin/main` reports a clean run over PHI it carries are closed. Two states in which
`origin/main` refuses, or raises, are not reproduced at head.

Four rows change from a refusal to a hit (`test/fixtures` deleted, a tracked file missing). **Both
verdicts are non-zero and neither is a false clean**, and the two are not the same claim: base said
"this layout is wrong", head says "here is the PHI in it".

---

## 4. What the engine must parameterize

### (a) `scanRoots` needs ONE addition, and it is NOT the `{ abs, rel }` pair

🩺 **A DRAFT OF THIS SECTION WAS WRONG AND IS CUT BACK RATHER THAN REWORDED.** It proposed a root
record carrying BOTH `abs` and `rel`, and a rule that the engine check the two for agreement. **The
`cli` worker measured that the pair was never a parameter at all, and the same decomposition
reproduces here exactly.** Every use of each half in `origin/main`, derived by search rather than by
reading:

| half   | every use in `origin/main`                                                       | what it is                     |
| ------ | -------------------------------------------------------------------------------- | ------------------------------ |
| `.abs` | `rootProblem(r.abs)` (a `statSync`), `walk(root.abs, ...)` (feeds `readdirSync`) | **process**                    |
| `.rel` | the `git ls-files` pathspec, the refusal text, the root-exemption set            | **process, plus a diagnostic** |

And `abs` carries no information `rel` does not: all three entries are literally
`join(REPO_ROOT, <rel>)` (`TEST_ROOT`, `SRC_ROOT`, `join(TEST_ROOT, "fixtures")`). **So x12's
`{ abs, rel }` is a PROCESS pair, not a declaration. The declarative form is the repo-relative names
alone, `scanRoots: readonly string[]` already accepts them, and no adapter is needed or wanted.**
This also RETIRES the "flattener" classification the item predicted for x12: there is nothing to
flatten, because there was never a second parameter.

**What survives, and it is one thing:** x12's SECOND list is a ROLE declaration that no `string[]`
expresses. `test/fixtures` must EXIST AND BE A DIRECTORY and must NOT be walked. This repo's
`CLAUDE.md` records the measurement behind it: _"`REQUIRED_DIRECTORIES` IS NOT `WALK_ROOTS`; NEVER
FOLD IT BACK IN ... folding them cost a grid cell."_

Minimal addition, and deliberately the smallest one that expresses it:

```ts
type ScanRootSpec =
  | string                   // "test" -- unchanged, and what every repo should write
  | {
      rel: string;           // repo-relative. THE ONLY path spelling. There is no `abs`.
      walk?: boolean;        // enumerate under it.         default true
      require?: boolean;     // must EXIST and be a directory. default FALSE
    };

scanRoots: readonly ScanRootSpec[];   // still REQUIRED, still no default
```

x12 then declares, as data:

```
scanRoots = ["test", "src", { rel: "test/fixtures", walk: false, require: true }]
```

**Two requirements, each grounded:**

1. **`walk: false` must still put the path IN SCOPE for the index-keyed rules**, or it is not a root
   at all. `require` and scope are different questions from enumeration.
2. **`require: true` must refuse with the caller's `refuse` code when the path is absent or is not a
   directory.** Today a missing root is SKIPPED IN SILENCE, which is the state
   `REQUIRED_DIRECTORIES` was built against. **Be exact about how much x12 still needs it:** the
   union already covers the state it was built FOR (an emptied or deleted `test/fixtures` whose
   corpus is tracked is exit 1 at head, not a clean run), so what `require` buys x12 today is the
   narrower case of a declared directory that is missing AND has nothing tracked under it. It is a
   weak need, it is x12's only use of the role, and it is offered as data rather than argued for.

**And the disjointness constraint that forced two lists is GONE, MEASURED HERE rather than read off
the engine's source.** A draft of this section asserted it from the `visited` set; x12's own
`CLAUDE.md` says folding the lists cost a grid cell, so it was driven instead. Same repo, same
committed violator under `test/fixtures`, two configurations of the head scanner:

| `scanRoots`                                     | exit | reported                    |
| ----------------------------------------------- | ---- | --------------------------- |
| `["test", "src"]` (as declared)                 | 1    | `2 hit(s) across 1 file(s)` |
| `["test", "test/fixtures", "src"]` (**nested**) | 1    | `2 hit(s) across 1 file(s)` |

**No double-report.** Say that in the parameter's docblock, or the next repo will keep two lists for
a reason that has gone away.

### (b) `--ignore-submodules=none` must be pinned in the engine's `--staged` argv

🔴 **The one measured REGRESSION of this adoption, and it is engine-owned.** The engine runs
`git diff --cached --raw -z --no-renames --diff-filter=d`. `origin/main` additionally pinned
`--ignore-submodules=none`, and it pinned it against a measurement. Reproduced here on both:

|                                                           | BASE  | HEAD     |
| --------------------------------------------------------- | ----- | -------- |
| staged gitlink under `test/`, no config                   | 2     | 2        |
| staged gitlink under `test/`, `diff.ignoreSubmodules=all` | **2** | 🔴 **0** |
| the same gitlink, `all` MODE, `diff.ignoreSubmodules=all` | 2     | 2        |

**The record vanishes from `--raw` entirely, so the route enumerates nothing for that path and
reports clean.** Bound the claim rather than inflating it: a gitlink carries a commit id and no bytes
at that path, so what is lost is a REFUSAL and not a scan, and the `all`-mode sweep still refuses
because `git ls-files -s` is not affected by `diff.ignoreSubmodules`. **The exposure is the
pre-commit route only.** The remedy is one flag in the engine's argv, and the rule behind it is the
one `origin/main` states: **the caller's git config must not be able to empty this list.**

### (c) The detector KINDS do not cover an X12 corpus

The five kinds named in the engine's docblock are names, DOB, MRN / member id, address and phone.
**x12's vocabulary is financial and administrative as much as clinical, and three of its detectors
are not instances of those five.** Named with their members, so the list falsifies itself:

| x12 detector                   | locus                                                  | synthetic convention                                                                                               | fits a kind?                                                                        |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| person name                    | `NM1-03/04/05` when `NM1-02 = 1`; `PER-02`             | allow-listed NAME tokens                                                                                           | ✅ names                                                                            |
| date of birth                  | `DMG-02`, first 8-digit run validated as CCYYMMDD      | allow-listed DOB values                                                                                            | ✅ DOB                                                                              |
| member id                      | `NM1-09` when `NM1-08 = MI`                            | declared `ID`, or a shape family (`(AV-)?MEMBER…`, `MEM`/`MBR`/`OTHER`/`ORPHAN`/`GROUP`/`SUB` prefixes, all-digit) | ✅ MRN / member id                                                                  |
| phone / fax                    | `PER-04/06/08`, 10+ digits                             | the `555` fake-exchange CONVENTION                                                                                 | ✅ phone                                                                            |
| **NPI**                        | `NM1-09` when `NM1-08 = XX`, exactly 10 digits         | declared `ID`, or ≤ 4 distinct digits, or a `123456789` prefix                                                     | ❌ **a PROVIDER identifier, not a patient one**                                     |
| **SSN, two spellings**         | `NM1-09` when `NM1-08 = 34`; `REF*SY*<9 digits>`       | declared `ID` (the `REF*SY` branch only)                                                                           | ❌ **UNDASHED and QUALIFIER-KEYED; the engine's floor knows only the dashed shape** |
| **service / transaction date** | `DTP`, `DTM`, `BHT`, `GS`, any 8-digit run as CCYYMMDD | a YEAR CUTOFF (2024), never an allow-list                                                                          | ❌ **a date that is not a DOB, gated by a cutoff rather than a declaration**        |
| **address**                    | :                                                      | :                                                                                                                  | 🩺 **x12 declares NONE. See below.**                                                |

So the engine needs, at minimum, **a provider-identifier kind, a qualifier-keyed identifier kind
that is not the dashed floor, and a non-DOB date kind gated by a cutoff.**

**And the vocabulary itself is more than token sets.** The engine's `AllowList` carries four:
`names`, `dobs`, `ids`, `emailDomains`. Four of x12's conventions are not token sets at all and
cannot be declared into one: the member-id SHAPE FAMILY, the NPI's `≤ 4 distinct digits` rule, the
phone's `555` SUBSTRING convention, and the service date's YEAR CUTOFF. **A parameterized engine needs
a per-kind `syntheticConventions` datum** carrying declared patterns and scalars as data, or every
repo keeps a predicate and the predicate is machinery again.

🩺 **A finding worth reporting on its own: `x12` has no ADDRESS detector.** Confirmed by search over
`origin/main`'s scanner: no `N3`, no `N4`, no address, postal or zip handling anywhere in it. The
837, 834 and 835 all carry street address and postal code in `N3`/`N4`, so this is a real hole in
this repo's own coverage that adopting a kind-based engine will surface. **It is named here and
deliberately NOT closed in this slice**: adding a detector is a widening, and this slice is a
derivation.

### (d) `--staged` scope, as data rather than a predicate

x12's clause is exactly "under the scan roots, markdown included". Under the directive that is data:

```
stagedReadable = { scope: "under-roots", exemptMarkdown: false }
```

**One caveat, because it is a behaviour change and not a spelling change:** x12's prefix clauses miss
an index entry at exactly a root's OWN path (`test`, `src`), which `origin/main` discloses as an open
residual. A `scope: "under-roots"` datum implemented as the engine's `isUnderScanRoot` would CLOSE
that residual as a side effect, because that predicate admits the bare root path. That is a widening
of what a commit is blocked on, which is a hook decision, so it should be taken deliberately and not
inherited from a spelling change.

---

## 5. What the parked branch `phi-scan-union-and-completeness` is, as engine specification

Branch `origin/phi-scan-union-and-completeness`, sha `024bf0f`. **It is UNGRADED: no refuter ever
passed on it, so nothing in it is evidence.** It was read and NOT cherry-picked, and nothing in it
was ported. What it derived, checked against the shipped engine:

**Already IN the engine, nothing to specify:**

- the union itself (`git ls-files -s -z`, `git cat-file blob <oid>`, deduplication BY CONTENT under
  git's own `blob <len>\0` framing so a clean checkout adds zero reads);
- the completeness rule as a SET DIFFERENCE and never a size, naming the paths;
- the `--allow-fixture` seeding fix (mode chosen by positional paths alone; the bypass unioned in
  unconditionally so the withdrawal is always of something enumerated);
- **the unmerged rule keyed on the ABSENCE OF STAGE 0, with the set difference taken rather than
  assumed**: the branch's sharpest finding, and the engine's `gitIndexEntries` already reads the
  stage digit and takes `higherStages \ entries`. It also carries the warning the branch paid for:
  do not port the reading from the `--staged` route, because an unmerged path appears in
  `ls-files -s` at ordinary blob modes;
- `git ls-files` FATALING at 128 for a non-repo, with the `catch` load-bearing;
- an empty index counting as no answer, through a different branch from the fatal;
- the 1 MiB `maxBuffer` bound on the blob read refusing rather than truncating.

**Superseded by the engine and NOT to be re-specified:**

- the branch's exemption of a walk root's OWN index entry from the index non-blob refusal. It
  existed to protect a documented SUPERSET scan through a tracked symlinked root. The engine
  `lstat`s at a root and refuses a link there, so that superset scan does not exist at head
  (measured: base exit 1 with the target's corpus scanned, head exit 2) and the exemption has
  nothing left to protect.

**Still open and still x12 data, not engine process:** the 90 tracked paths outside `test/` and
`src/` that neither sweeping route reads. That is AXIS 2's boundary and a scope decision of its own.

---

## 6. `test/scripts/phi-scan.test.ts` was NOT rewritten, and here is its measured state

The 2,027-line test file is **untouched on this branch, deliberately.** It was written against the
machinery this adoption deletes, so rewriting it now would be thrown away when the engine ships the
parameterization above and the config shape changes. It is characterized instead of forced.

Driven against the head scanner: **29 of 90 cases fail.** Two experiments bound the causes rather
than a reading of the diff:

- Patching `makeRepo()` to stage and commit its baseline (the engine refuses `all` mode over an
  index git names empty) moves it to **25 of 90**. So the empty-index premise accounts for four
  cases and is NOT the dominant cause, which is the opposite of what the parked branch's write-up
  would predict for this file.
- The remaining 25 are: **message wording** (`OK - no hits` became `OK: no hits`, and the refusal
  sentences are the engine's now: the "no link and no violator scans clean" case fails on the
  string alone at exit 0); **cases pinning machinery that is now the engine's** and asserted in the
  engine's own suite (the walk-root type check, the index reconciliation, the index-listing failure,
  the unmerged naming, the `--staged` argv coupling); and **the two genuine behaviour deltas
  measured in §3** (a logged `--allow-fixture` moving 0 to 2, and the gitlink under
  `diff.ignoreSubmodules=all` moving 2 to 0).

**What survives as this repo's own to keep** is the per-standard half: the detector cases, the
embedded-pass disclosed bounds, the allow-list route-blindness cases, and the case asserting this
file's own controls are assembled rather than literal. Those pass today.

## 7. Status

- The adoption on this branch **works** and the whole grid above was driven on it. The engine's
  current surface takes x12's WALK roots today with no adapter at all, because the `{ abs, rel }`
  pair was never a parameter (§4a). What it does NOT take is the second list's ROLE
  (`walk: false, require: true`), and it carries **one measured regression** (the gitlink, §4b) plus
  **three detector kinds it cannot express** (§4c).
- **BLOCKED on the engine.** Not merged, no PR, no changeset, no `CHANGELOG.md` entry.
- **MEASUREMENT PROVENANCE.** Every figure in this file was re-run from repo-namespaced scripts
  under `scratchpad/x12-only/` (`x12-grid.mjs`, `x12-probe.mjs`, `x12-gitlink.mjs`,
  `x12-nested.mjs`, `x12-base-scanner.ts`) after a fleet warning that the shared scratchpad was
  clobbering generically-named files between workers. The first pass used generic names
  (`drive.mjs`, `probe.mjs`); **every result reproduced identically on the namespaced re-run**, and
  the scripts were provenance-checked for x12-specific content (this repo's ISA, its `REF*SY`
  payload, `/workspace/x12`) before being trusted.
- **`X12-837-RESIDUALS` was not touched.** Nothing in this slice opens or closes any of X-R3 to
  X-R22.

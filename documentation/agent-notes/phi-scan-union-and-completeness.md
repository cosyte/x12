# `PHI-SCAN-UNION-AND-COMPLETENESS` (2026-08-11)

`scripts/phi-scan.ts` grew two independent halves in one slice: `all` mode now reads **the bytes git
carries** as a union with the working-tree walk, and **every mode refuses (exit 2) over a target it
enumerated and never read**. Both are behaviour changes to a gate, and neither touches the parser.

Everything below was measured on this tree or on a throwaway repository laid out like it
(`scripts/phi-allow-list.txt`, walk roots `test` and `src`, `test/fixtures` present), against a
synthetic payload whose `NM1` person name, `DMG` date of birth, `PER` phone, `REF*SY` SSN and dashed
SSN are all hits when the same bytes sit at an ordinary regular file. Nothing here is inherited from
a sibling's write-up.

---

## 1. What the sweep could not account for, before

### The union half: two false cleans, and two states that already refused

The walk answers "what is on disk under the scan roots". That is not the same question as "what does
this repository carry", and where the two disagree the walk was the only voice. Four states were
driven, each over a tracked file whose committed bytes are hits:

| state | base | head |
|---|---|---|
| the tracked path is occupied by a **directory** | **exit 2** (`reconcileObserved`) | exit 2, unchanged |
| the working tree is **short** of a tracked file | **exit 2** (`reconcileObserved`) | exit 2, unchanged |
| the two copies simply **differ** (committed dirty, scrubbed clean on disk) | 🔴 **`OK - no hits`, exit 0** | **exit 1**, locus labelled `(as git carries it)` |
| the path is **unmerged** and a clean working-tree copy is present | 🔴 **`OK - no hits`, exit 0** | **exit 2**, named once |

**🛑 DO NOT CARRY A SIBLING'S STORY ABOUT WHICH STATES WERE OPEN HERE.** The template's write-up
names three states, and in this repository the first two of them were **already closed**, at exit 2,
by the reconciliation `PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL` built. What this slice closed is the
third, plus one the template does not list at all: an unmerged path whose working-tree copy is
clean and **present**. That fourth one is the common shape of a real conflict, because a merge leaves
a file on disk, and it is precisely the state the reconciliation cannot see: the walk DID open that
path and found nothing in it.

### The completeness half: four argv shapes, all exit 0

`--allow-fixture` was a **subtractive** flag that also **selected the mode**. Driven on this
scanner, over a corpus whose only violator carries a dashed SSN:

| argv | base |
|---|---|
| `phi-scan --allow-fixture <violator>` | 🔴 `OK - no hits`, exit 0 |
| `phi-scan <clean> --allow-fixture <violator>` | 🔴 `OK - no hits`, exit 0 |
| `phi-scan --staged --allow-fixture <violator>` | 🔴 `OK - no hits`, exit 0 |
| `phi-scan <violator> <clean> --allow-fixture <clean>` | exit 1, and **nothing** said the withdrawn target was never read |

The seed read `paths.length > 0 ? paths : [...allowFixtures]`. With no positional it selected `paths`
mode over exactly the file it then withdrew, so the run reported a clean whole sweep having opened
nothing at all. With a positional present the flag was a **silent no-op**: the named file was never
ADMITTED to the run rather than withdrawn from it. Both readings end in the same place. **A scan that
did not open a file has no clean verdict to give about it.**

`cosyte/config`'s drift check measures the fourth row from outside, by RUNNING this scanner against a
throwaway corpus rather than matching its source. Before: `phi-scan reported only its HITS code (1)
over a run that withdrew test/fixtures/phi-scan-probe-decoy.txt after enumerating it`. After: the
probe reports nothing for this repo.

---

## 2. The five axes, as this repository derives them

**🛑 A PORT IS NOT A COPY, AND A COUNT TAKEN ON ANOTHER TREE IS NOT AN ANSWER FOR THIS ONE.** All
five are declared in one block at the top of `scripts/phi-scan.ts`.

1. **Exit codes.** 0 clean, 1 hits, 2 every state the file RAISES in which the scan cannot account
   for something. **1 is reserved but NOT exclusive**, and the escapes are named rather than claimed
   closed: an allow-list or an override log that EXISTS but cannot be READ throws a plain `Error`
   and takes node's own exit 1, and so does a directory under a walk root the process cannot open.
2. **Roots and exclusions.** `test` + `src`. **There is no exclusion list at all**, and that is
   deliberate: nothing in this package is excused by literal path on any route, and a class predicate
   ("skip binary blobs", "skip generated files") is forbidden outright. The union is scoped to the
   SAME roots, so it widens which **bytes** are read at an in-scope path and never which **paths**
   are in scope.
3. **`--staged` scope.** `test/` + `src/`, **unchanged by this slice**. Widening what a COMMIT is
   blocked on is a hook decision and is not this one.
4. **Gitlinks.** `git ls-files -s | awk '{print $1}' | sort | uniq -c` on this tree returns `100644`
   and `100755` only: no gitlink, no tracked symbolic link. That is the state the rule exists for,
   not a reason to drop it.
5. **EOL normalization.** No `.gitattributes` exists and `core.autocrlf` is unset, so the two copies
   of a path do not diverge here today. **That makes the axis UNEXERCISED IN THE REAL TREE, never
   inapplicable**, and it is exactly why the dedupe is a CONTENT comparison under git's own
   `blob <len>\0` framing rather than a path comparison: with a `text` attribute the index carries LF
   and the working tree CRLF, the two object ids differ, and **both** forms are read.

---

## 3. The rules, and what each one is entitled to claim

### `all` mode's union

`git ls-files -s -z` is read once for the whole index, and every in-scope tracked path whose bytes
the walk did not already read **verbatim** is scanned through `git cat-file blob <sha>`.

- **It is a UNION and never a replacement.** The walk still runs first and still reaches UNTRACKED
  files, which git cannot name at all.
- **`cat-file blob` names the OBJECT, not the path.** Re-reading the path is exactly what the walk
  already did.
- **Deduplication is BY CONTENT.** Measured on this repository: a clean checkout yields **0** union
  targets, so the union adds zero reads and **never invokes `git cat-file`**. Be exact about the
  fixed cost rather than saying "no subprocess": it adds one `git ls-files -s -z` and one
  `git rev-parse --show-object-format` per `all`-mode run, always, because the dedupe needs the
  algorithm before it can compare anything. The whole sweep still runs in about a third of a second.
- **A union hit is labelled `(as git carries it)`, on the REPORTED LOCUS ONLY.** The target's `path`
  stays undecorated, because the read filters, the `--allow-fixture` withdrawal and both completeness
  tiers are all keyed on it: decorating it would silently re-SCOPE a target rather than re-label it.
- **An empty index counts as no answer, and so does a `git` that cannot answer.** 🛑 The two arrive
  through DIFFERENT branches and a reader who merges them will delete the wrong one. Measured on git
  2.39.5: a directory that is no repository at all **FATALS** (exit 128), and it is the `catch` that
  turns that into `null`, so that handler is load-bearing rather than defensive; without it the throw
  escapes and the run takes **node's own exit 1**, which this contract reserves for HITS FOUND. A
  repository whose index is empty prints nothing and exits **0**, which is what the size check is
  for.

### The unmerged rule, and why its two halves are not complements

🛑 **THE READ KEYS ON THE ABSENCE OF STAGE 0; THE REFUSAL KEYS ON THE PRESENCE OF ANY HIGHER STAGE,
AND NO SET DIFFERENCE IS TAKEN BETWEEN THEM.** Measured on git 2.39.5: `git update-index
--index-info` adding stages 2 and 3 **LEAVES STAGE 0 IN PLACE**, so `git ls-files -s` returns all
three records while `git diff --cached --raw` already reports that path as status `U`. Taking the
difference would hand such a path's stage-0 blob to the union and call it the bytes git carries, over
an index git itself will not let anyone commit. A conflict git wrote itself has no stage 0 and is
caught either way; this shape is caught only by the wider half.

The axis is **re-derived here and not ported from `--staged`**: that route spots an unmerged path
from `--raw`'s status `U` and a destination mode of `000000`, and **nothing in `ls-files -s` looks
like that** (an unmerged path is reported there with ORDINARY blob modes, so the mode rule cannot see
it). A sibling's draft that ported the `--staged` reading took the FIRST record per path, scanned
**stage 1, the merge base**, and labelled it as the bytes git carries.

### The index's non-blob rule: a fail-closed backstop that closes nothing measured here

🛑 **STATE THIS AS A BACKSTOP AND DO NOT INHERIT THE SIBLING'S CLAIM FOR IT.** Every cell it could
own is already owned by an EARLIER and MORE SPECIFIC refusal in this repository, measured at base
and at head alike:

- a tracked **symbolic link** under a root is refused by `refuseUnscannable` on the walk's own
  entries (exit 2);
- a tracked **gitlink** is refused by `reconcileObserved` (exit 2), whether its working tree is
  checked out or not.

It is kept because it costs one filter and because those two refusals are what would have to stop
firing for it to matter, not because it was seen to fire.

**A walk root's OWN index entry is EXEMPT from it, and omitting that exemption costs a documented
scan.** Where a walk root is itself a TRACKED symbolic link to a directory, `git ls-files` returns
the root's own path at mode `120000` while `existsSync` and `readdirSync` both follow it, so the walk
enumerates the target's files under their `<root>/*` names and HITS over a PHI-bearing target (exit
1). Without the exemption this refusal fires on that same tree and trades a working superset scan for
a refusal. It is the same exemption `reconcileObserved` already carries, for the same reason.

### The completeness rule

- **It is a SET DIFFERENCE, NEVER A SIZE.** Counting reads against targets and comparing two numbers
  is a different and weaker test, because a count counts the targets that DID get read: a
  plausible-looking total hides exactly the paths that did not. The refusal **names the paths**
  because no number can.
- **Enumeration is this run's own declaration of what it will read**, so the read filters upstream of
  it are not violated by it and are not weakened by it: a `.md` file the walk skips, a gitignored
  entry, and a staged path outside the two prefix clauses are never enumerated in the first place.
  What the rule catches is a path that BECAME a target and then did not get opened.
- **A bypass naming a path this run does not enumerate ALSO refuses**, under its own sentence. That
  tier fires BEFORE any target is read, so there is no hit for it to swallow.
- **A hit is never swallowed by the unread refusal.** Hits are reported first and the refusal
  follows, so a run that is both incomplete AND carrying hits prints both; the code is 2, because the
  incompleteness is the larger claim. 🛑 **THAT IS A GUARANTEE ABOUT THAT REFUSAL AND NOT ABOUT
  REFUSALS IN GENERAL**: a target whose bytes cannot be READ refuses from INSIDE the loop, which does
  discard the hits found before it. Pre-existing, left alone deliberately (it exits 2, so it is loud
  rather than green), and salvaging a partial hit list would be a claim about a corpus the scan just
  said it could not account for.
- **What it costs, stated rather than left to be discovered: `--allow-fixture` CAN NO LONGER REACH
  EXIT 0 IN ANY MODE.** The flag, the override log and the rejection gate are all kept, so an attempt
  is **RECORDED AND REFUSED** rather than silently honored, and `scripts/phi-allow-list.txt` is the
  mechanism that reaches a clean run. The hit footer therefore **no longer advertises the flag as a
  remedy**: a printed remedy that leads to exit 2 is the same defect as one that leads to a false
  green, with the sign flipped.

---

## 4. Two behaviour changes that are not the headline, and are not cosmetic

1. **`all` mode now REFUSES in a repository whose index is empty.** At base, `git init` with nothing
   staged left `git ls-files` answering empty, the reconciliation vacuous, and the sweep reporting
   the walk's verdict. Nine cases in `test/scripts/phi-scan.test.ts` were sweeping exactly such a
   tree, which is why `makeRepo()` now stages its baseline: **staging is a premise, not tidiness.**
   In a fresh scaffold this means `git init` and a commit come before `pnpm phi-scan` means anything.
2. **`loadAllowList()` moved INSIDE `main`'s handler.** Outside it, a missing
   `scripts/phi-allow-list.txt` threw an uncaught `InvocationError` and the run took **node's own
   exit 1**, which this contract reserves for HITS FOUND, so a caller that branches on the code, and
   CI is one, read "this corpus contains PHI" from a run that never opened a file. The live trigger
   is not a fresh checkout (the allow-list is committed) but the scanner invoked from the wrong
   working directory, since `REPO_ROOT` is `process.cwd()`. **That is not the same as "nothing
   reaches node's default", and the wider claim is not made**: an allow-list that EXISTS but cannot
   be read still throws a plain `Error` and still lands on exit 1.

---

## 5. The controls, and the mutation that proves each is not vacuous

**🛑 EVERY VIOLATOR PAYLOAD IS ASSEMBLED WITH `seg(...)`, NEVER WRITTEN AS LITERAL SEGMENT TEXT.**
`test` is a walk root, so `pnpm phi-scan` opens this file like any other; declaring the values in the
allow-list would disarm the exact detector the case exists to prove, and a literal-path exemption
would have to reach `--staged` or nobody could commit an edit to the file again.

- **The union half.** Deleting the union sweep (`sweep(buildTargetsForGitIndex(index, readOids))` to
  `sweep([])`) reds **3** cases: the payload living only in the index, the staged-then-scrubbed
  variant, and the both-copies-scanned case.
- **The completeness half.** Deleting the difference (`const unread = [...enumerated].filter((p) =>
  !read.has(p));` to `const unread: string[] = [];`) reds **7** cases, across `paths`, `all` and
  `--staged`.

Both mutations were driven and restored; each figure is that run's own output.

---

## 6. Residuals, disclosed rather than closed

- **A SYMLINKED WALK ROOT'S TARGET CORPUS IS RECONCILED BY NOTHING, AND THE UNION DOES NOT CLOSE IT.**
  Everything the walk reads through the link lives under the target's own names, outside the
  `git ls-files -- test src` pathspec AND outside `isUnderScanRoot`, so both index-side sets are
  empty for all of it. An emptied link target still reads `OK - no hits` at exit 0. PRE-EXISTING,
  pinned as a case, still open. Closing it means reconciling against a second pathspec derived from
  the link target, which no repo in the org has done.
- **A tracked path OUTSIDE `test` and `src` is read by neither sweeping route.** Derive the figure,
  never quote one from here: `git ls-files | grep -cv '^test/\|^src/'`. That is AXIS 2's boundary and
  a scope decision of its own; the union deliberately did not move it, because widening the sweep to
  the whole repository is a change that must be argued and measured on its own.
- **An index entry at exactly a walk root's own path matches no `--staged` clause**, because every
  clause tests a `<root>/` PREFIX. PRE-EXISTING and still open on that route.
- **`git cat-file blob` runs through `execFileSync`, whose `maxBuffer` defaults to 1 MiB**, so a
  tracked blob larger than that fails the read and REFUSES (exit 2) rather than reporting a truncated
  scan clean. Identical bound, and identical trade, to the `git show` call `--staged` makes.
- **A directory under a walk root that the process cannot READ still throws uncaught** and ends the
  run at exit 1. PRE-EXISTING; `refuseUnusableRoots` is a TYPE check and says so.
- **The enumerate-then-read race is untouched.** The sweep lists its roots first and reads each file
  afterwards, so a file deleted inside that window makes the read throw and the whole sweep refuse.
  The union does not change its reachability, and the remedy pulls the opposite way (it TOLERATES a
  failed read), so it belongs in its own slice.

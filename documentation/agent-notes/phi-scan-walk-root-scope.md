# `PHI-SCAN-WALK-ROOT-SCOPE` in `@cosyte/x12` (2026-08-08)

The `x12` leg of the org-wide item. Two sides, each **in addition to** the other, never instead of
it: the **enumeration** (what the routes open) and the **recogniser** (what the scanner can see once
a file is open). Enumerating alone buys the `scanCommonShapes` floor and nothing else.

Also relocated here, under ADR 0023, is the narrative that used to sit in the `phi-scan` trap section
of `CLAUDE.md`. **Nothing was dropped.** The trap there keeps the imperative; this file carries the
measurement, the sources and the refutation history.

---

## The figures, and how to re-derive them

**Derive every one of these; never quote a sibling's.** Two `git ls-files` invocations give both
denominators, and the second is the one a draft of this note got wrong first time:

```
git ls-files | wc -l                                   # tracked
git ls-files -- src test | grep -iv '\.md$' | wc -l     # opened by the walk (head)
git ls-files -- src test/fixtures | grep -iv '\.md$' | wc -l   # opened by the walk (base)
```

At base `7d50305`:

|                                              |         |
| -------------------------------------------- | ------- |
| tracked                                      | **306** |
| opened by the walk (`test/fixtures` + `src`) | **163** |
| opened by **neither** route                  | **143** |
| of those, tracked under `test/`              | **85**  |
| `.md` under either walk root                 | **0**   |

At head, **and note the denominator MOVES because this slice adds tracked files of its own** - a
refuter caught a draft of this table quoting base's 306 at head:

|                                     |         |
| ----------------------------------- | ------- |
| tracked                             | **308** |
| opened by the walk (`test` + `src`) | **248** |
| opened by **neither** route         | **60**  |
| of those, tracked under `test/`     | **0**   |

The remaining 60 are outside both roots: `.changeset/`, `.claude/`, `.github/`, `docs-content/`,
`documentation/`, `scripts/`, the root dotfiles and the root markdown. **That is a scope decision and
not this item**, and widening to them is not free: `scripts/phi-scan.ts` and
`scripts/phi-allow-list.txt` are the gate's own source and its declaration file, and every value in
both is a PHI shape by construction.

**Files hand-read: 85** - every file the widening opened, by a class sweep (person names, contact
names, `N3`/`N4` addresses, 10-or-more-digit runs, pre-2024 dates, emails, URLs, org names, `REF`
qualifiers) and then by reading every identifier-bearing line in each. **Nothing patient-identifying
was found.**

## What an EDI segment looks like to this scanner, and why the recogniser needed widening

`looksLikeX12` asks whether the **file IS an interchange**: it must start with `ISA` and be at least
106 bytes. **This package's inline fixtures are `.ts` string literals holding segment text**, so
every one of the 85 files answered false and went down the plain-text branch. On that branch the
scanner ran `scanCommonShapes` and nothing else.

**NAME THE FLOOR AS THREE DETECTORS AND NEVER AS TWO.** `scanCommonShapes` is dashed SSN, the
`REF*SY` **undashed** nine-digit SSN, and a non-test email - all unanchored `matchAll` passes, so all
three DID already reach a bare string literal. A draft of the scanner header said "the dashed-SSN and
email floor" and a refuter measured it false. Everything else - NM1 person name, NM1 member id, NM1
NPI, PER contact name, PER communication number, DMG date of birth, and the pre-2024 service-date
cutoff - is segment-aware and reached none of them.

Measured: the floor alone, over the newly opened 85, found **8 shapes in exactly one file**,
`test/scripts/phi-scan.test.ts`. The segment-aware pass found **44 more across 9 files**. So the
enumeration half on its own would have closed about a sixth of what was there.

`scanEmbeddedSegments` closes it. It finds a segment id from a closed list followed by `*`, takes the
run to the first `~`, `"`, backtick, backslash or newline, removes `${...}` first so an interpolated
fixture keeps its **element positions**, and hands the result to the same checks.

**🛑 What it does not do. THIS IS A SYNTACTIC TRIPWIRE OVER SOURCE TEXT, NOT A PARSER, so the list
below is what has been MEASURED and is explicitly NOT a closed census.** A draft of this note
published it as "four bounds" in four places and pass 1 of the refuter found two more in a single
pass. **Finding one more is expected and is not a new finding. Cut the claim back, never grow the
guard, and publish no count of them** - the rule `X12-NUMERIC-VALUE-EMITS-EMPTY` was refuted three
times for breaking. Each below is pinned by a case:

- **It infers no delimiters.** There is no ISA in an embedded run, so the element separator is taken
  to be `*`. A segment embedded under a non-default separator is not reached.
- **It recognises only the ids the checks consume** (`NM1`, `PER`, `DMG`, `DTP`, `DTM`, `BHT`, `GS`).
- **It does not run on a whole-file interchange.** Those go through `scanX12`, which has real
  delimiters. Running both would report every hit twice, and there is a case asserting it does not.
- **A template placeholder is REMOVED before the split**, which keeps an interpolated fixture's
  element positions. **Say the other half too, because a draft named only the benefit: the removed
  bytes leave this pass's view entirely**, so a name an interpolation holds is never checked.
- **A segment split across a concatenation is not reached.** `"NM1*IL*1*" + "MCALLISTER*BRENDAN~"` is
  clean where the same bytes unsplit are two hits. Nothing in this corpus is written that way today,
  which is what makes it latent rather than noise.
- **The run stops at the first `"`, backtick, `~`, backslash or newline**, so a segment carrying any
  of those inside an element is truncated there and every later element ceases to exist.
- **It skips an element that is not name-shaped, and an id element carrying anything but ASCII
  alphanumerics, `.`, `_` or `-`.** A run found in prose ends at whatever punctuation comes first and
  can swallow the sentence around it: before these two predicates, a fenced doc table in
  `test/builder-string-type.test.ts` reported its arrow column as an SSN-qualified id, and an `NM1`
  quoted in a `//` comment in `test/parser-segment.test.ts` reported the following English word as a
  person name. **Both predicates apply to the EMBEDDED pass only** and the whole-file `.edi` path
  keeps the base rules unchanged, which is asserted with the same bytes on both sides.
- **A fixture expressed as a BUILDER SPEC OBJECT is segment text to nobody.** `{ lastName: "…" }`
  becomes a segment only when the builder runs. **Found by hand-reading, not by the gate**, and pinned
  as a case so the silence is not read as coverage.

## 🩺 Two things a refuter measured and a draft had backwards, both in the leak-hiding direction

**`'` MUST NOT BE A RUN STOP, AND "LETTER" MUST NOT BE `[A-Za-z]`.** The first draft put `'` in the
run-stop set (symmetry with `"`, since both delimit a TypeScript string) and wrote the name class as
`[A-Za-z][A-Za-z' .-]*`. The two contradict each other: nothing carrying an apostrophe could ever be
FRAMED, so the `'` branch of the name class was dead - and the failure was worse than a skip, because
the run was **truncated** at the apostrophe and every later element ceased to exist. Measured then,
every one of these reported clean in a `.ts` literal:

| input                                     | then  | now                          |
| ----------------------------------------- | ----- | ---------------------------- |
| `NM1*IL*1*O'BRIEN*SEAN****MI*W123456789~` | clean | name + member id             |
| `NM1*IL*1*O'BRIEN*SEAN****34*123456789~`  | clean | name + qualifier-34 SSN      |
| `PER*IC*JOHN O'BRIEN*TE*2124440101~`      | clean | contact name + non-555 phone |
| `NM1*IL*1*NUÑEZ*JOSÉ~`                    | clean | both name elements           |

`O'Brien`, `D'Angelo` and `N'Diaye` are exactly the surnames a real de-identification failure drops
into a fixture, and the `scanCommonShapes` floor covers neither the member id nor the qualifier-34
SSN. **A surname is not an ASCII string**, so the name class is `\p{L}` with combining marks. The
disclosure that shipped in the first draft said apostrophes were permitted, which was true of the
class and false of the pass.

## The one cell of the widening that was NOT additive, and the grid is what found it

`refuseUnusableRoots` iterated the **walk roots**, so while `test/fixtures` was one, deleting it
refused at exit 2. Making `test` the root turned `test/fixtures` into an ordinary subdirectory and,
on a tree whose corpus was **not yet committed**, the same deletion read `OK - no hits` at **EXIT 0**:
the whole fixture corpus gone and the gate clean. `reconcileObserved` covers the committed case and
**only** the committed case, and a rule that holds only under a precondition is not the rule that was
there before.

**`REQUIRED_DIRECTORIES` is the fix, and the shape of it is the lesson: what must BE a directory is a
different question from what the sweep walks, and conflating the two is what made the widening look
additive when one cell of it was not.** The walk roots must stay **disjoint** (nested roots enumerate
a file twice and report every hit twice); the declaration list has no such constraint, because
nothing walks it.

## The exit code for a regular-file root, derived from this repo's own contract

**2.** `refuseUnusableRoots` throws `InvocationError`, and `main`'s `try` around
`buildTargetsForAll` turns that class into `return 2`. **DO NOT PORT THIS.** It is 2 in `hl7`, `fhir`,
`cli` and `dicom`, **1** in `terminology` by a different mechanism, and in `ccda` the state is
**structurally unreachable** because that repo declares no scan-root list at all. Here it was **1**
before the root rules landed, from an uncaught `ENOTDIR` - the code this scanner reserves for "hits
found".

## The three routes, enumerated before anything was called additive

`ccda#103` lost a real detection by arguing an exemption was additive "because no route read a
`.md`", when `paths` ran the same structural predicate. So, for this slice:

| route                            | enumeration change                                   | recogniser change            |
| -------------------------------- | ---------------------------------------------------- | ---------------------------- |
| `all` (`pnpm phi-scan`)          | roots `test/fixtures`+`src` -> `test`+`src`          | gains `scanEmbeddedSegments` |
| `--staged` (pre-commit)          | `test/fixtures/**`+`src/**.ts` -> `test/**`+`src/**` | gains `scanEmbeddedSegments` |
| `paths` (`pnpm phi-scan <file>`) | unchanged (the caller names the file)                | gains `scanEmbeddedSegments` |

Both enumeration changes are **unions**: the old scope is a subtree of the new one, so no path either
route enumerated stops being enumerated. **No exemption was written, on any route.** That is
deliberate: `dicom#98` paid an `INTRODUCED` major for an exemption written as a **predicate** that
reached `--staged` and **subtracted a detection the base had**, and the way to avoid needing one is
for the corpus to be clean rather than excused.

## The base/head grid

35 tree shapes across all three routes, plus 28 allow-list cells, run against a base copy of
`scripts/phi-scan.ts` and `scripts/phi-allow-list.txt` taken by **file copy** from `7d50305`.

**Every base `1` is still non-zero. Nothing went `1 -> 0` except the declared allow-list clearances
below.** The changed cells:

| shape                                          | route      | base  | head  |
| ---------------------------------------------- | ---------- | ----- | ----- |
| violator `.edi` directly under `test/`         | all        | 0     | **1** |
| inline-segment `.ts` under `test/`             | all        | 0     | **1** |
| inline-segment `.ts` under `test/property/`    | all        | 0     | **1** |
| inline-segment `.ts` under `src/`              | all        | 0     | **1** |
| violator staged directly under `test/`         | `--staged` | 0     | **1** |
| inline-segment `.ts` staged under `test/`      | `--staged` | 0     | **1** |
| violator staged at `src/notes.md`              | `--staged` | 0     | **1** |
| `test/fixtures` a symlink to a dir holding PHI | all        | 1     | **2** |
| `test/fixtures` a symlink, target emptied      | all        | **0** | **2** |

The last two are the widening's other gain and they are worth stating separately: `test/fixtures`
stopped being a root, so the **entry** rule applies to it and the shape is refused outright instead
of scanned through. **The residual did not close - it moved up one level**, to a link at `test`
itself, and the case that pins it moved with it.

## 🛑 The allow-list additions, and their cost

**AN ALLOW-LIST ENTRY IS GLOBAL AND ROUTE-BLIND.** `synth#49` shipped an `INTRODUCED` major here
because both the author's grid and the scope test were structurally blind to it: adding a token
clears that literal on the **commit-blocking** route too. So the entries are enumerated, and the
route-blindness is pinned from both directions by cases rather than argued.

Twelve `NAME` tokens - `FIRST`, `MEMBER`, `DESK`, `CLINIC`, `SYNTHLAST`, `SYNTHFIRST`, `PROPLAST`,
`PROPFIRST`, `SUBLAST`, `SUBFIRST`, `OLDLAST`, `OLDFIRST` - and four `ID` values - `1987654320` (a
descending-digit NPI placeholder), `SYNTH-MBR-1`, `PROP-MEMBER`, `OLD-MEM`. **22 grid cells go
`1 -> 0`, and all 22 are these.** Every token is a role word or a `<ROLE><POSITION>` coinage from an
inline fixture, hand-read; none is a name anyone has. `LAST` was already declared and `FIRST` was
not, which is the shape of the oversight the widening surfaced.

`isSyntheticMemberId` now consults the declared ids, which it could not before - a member id that
matched none of its shapes could only be cleared by renaming it in every fixture. **That flips no
cell this scanner already reported**: every `ID` entry predating the change is all-digit and so
already matched the third shape.

## 🛑 The scanner's own negative controls are ASSEMBLED, and that is forced

`test/scripts/phi-scan.test.ts` is now inside a walk root. Its payloads are ones the scanner is
**required** to trip on, and there is no way to excuse them that is not worse:

- **declaring the values disarms the exact detector the case proves**, so the case would pass for the
  wrong reason - and the `SMITH` / `ROBERT` / dashed-SSN cases assert **exit 1**, so an allow-list
  entry would turn them red rather than green;
- **a literal-path exemption would have to cover `--staged`**, or nobody could ever commit an edit to
  that file again - and an exemption on the blocking route is `dicom#98`'s defect exactly.

So `seg(...)` builds the framing at run time and **the values stay legible in the source**. Nothing
is obscured: `SMITH`, `ROBERT`, `RIVERA`, `JUANITA` and the SSN digits are all still there to read.
What is absent is a `NM1*` / `DMG*` / `PER*` / `nnn-nn-nnnn` **run** for a scanner to frame. **This is
not a claim that the gate cannot see the file** - it reads it on all three routes, and a case appends
one literal violator to a copy and requires exit 1.

## What was found in the newly opened files

**Nothing patient-identifying.** The corpus is placeholders throughout: `DOE`/`JANE`/`JOHN`/`ROE`/
`BABY`/`JIMMY`/`JUNIOR`/`PARENT`/`CHILD`, `TEST`/`PATIENT`, `LAST`/`FIRST` and its `SUB`/`OLD`/
`SYNTH`/`PROP` variants, `RENDERING DOCTOR`, invented orgs (`BILLING CLINIC INC`, `MEDPAY INSURANCE`,
`PAYER ONE`, `UTILIZATION REVIEW CO`), 555-exchange phones, and addresses at `1 NOWHERE LANE` /
`PO BOX 1` in `SPRINGFIELD` / `SHELBYVILLE` / `ANYTOWN` / `PAYERTOWN`.

**Non-patient, publicly attributable strings are NAMED here rather than scrubbed:** the NDC drug
codes `00093721410` and `00378010401` (public labeler codes, in the 837 drug-identification
fixtures); the CMS test NPI `1234567893`; and `t@example.com`, the git identity a throwaway test repo
commits under. `SMITH` survives in two files as an org name (`SMITH CLINIC`) and a placeholder
surname in a **builder spec object**, both read and neither PHI - and the spec-object one is the
disclosed reach gap above, not a clearance. **`2124440101` belongs on this list too**, the fictional
biller's phone in the gate's own controls: it is off the 555 convention deliberately, because the
communication-number detector exists to flag exactly that, and assembling the control moved it out of
the gate's view. It is invented, and "nothing is obscured" was true of the names and the SSN digits
only.

## Residuals, all PRE-EXISTING and all disclosed

- **The path-set-not-bytes escape.** The reconciliation compares path **sets**, not the bytes git
  carries at those paths, so a root swapped for a directory mirroring the tracked names still exits 0
  over decoy contents. The widening makes it **narrower, not worse**: a decoy must now mirror 248
  names rather than 163.
- **A symlinked walk root's target corpus is not reconciled at all.** Moved up a level by this slice;
  not closed.
- **An index entry at exactly a walk root's own path matches no `--staged` clause**, because every
  clause tests a `<root>/` prefix.
- **A walk root that is a directory the process cannot READ** throws an uncaught `EACCES` at exit 1,
  identically at base and head.
- **The enumerate-then-read window** in `all` mode is untouched. `CLAUDE.md` used to say this repo
  escaped it "only by a scope accident of its walk roots" and that **any widening reintroduces it
  verbatim** - which this widening does, over 85 more files. Still deferred, and the reason is still
  direction: the remedy TOLERATES a failed read, which pulls against every other rule here.
- **60 tracked files remain outside both routes at head.** Named above, and **re-derive rather than trusting that number** - it moves with every file the next slice adds.

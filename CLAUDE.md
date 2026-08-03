# @cosyte/x12: Project Guide for Claude

## Project

**`@cosyte/x12`**: a developer-focused ASC X12 EDI parser + utility library for Node.js/TypeScript, published under the Cosyte brand. Open-source (MIT). The payer-side sibling of [`@cosyte/hl7`](../hl7): API shape, profile system, and lenient-parser philosophy are deliberately mirrored.

**North star:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line, without having read the X12 standard or any TR3 implementation guide.

## Status

- **🩺 A NUMBER IN A STRING ELEMENT NOW REFUSES INSTEAD OF EMITTING `""`
  (2026-08-03, `X12-NUMERIC-VALUE-EMITS-EMPTY`). THE DELIVERABLE IS A DECISION,
  AND THE DECISION IS _REFUSE, NEVER COERCE_.** `escapeRelease` read
  `value.length`, `undefined` on a number, so the early return did not fire, the
  loop never ran, and it returned its empty accumulator. **The value vanished
  with no warning and no error.** All nine builders now take their `esc` from
  `makeCallerEscaper` (`src/builder/caller-string.ts`), which type-checks first
  and refuses with the calling module's own typed, code-tagged error.

  **MEASURED AT BASE `143a6ea` BY DRIVING THE SHIPPED TABLE AGAINST A `143a6ea`
  WORKTREE, NOT ASSUMED.** Eight builders, one element each, string arm vs
  number arm: `BPR*A1*450.00 -> BPR**450.00`, `AK2*837*A1*… -> AK2*837**…`,
  `NM1*…*34*A1 -> NM1*…*34`, `ENT**2J*34*A1 -> ENT**2J*34`, `NM1*…*MI*A1 ->
NM1*…*MI`, `NM1*1P*2*A1 -> NM1*1P*2`, `UM*HS*I*A1 -> UM*HS*I`, and
  **`CLM*A1*150.00\*… -> CLM**150.00*…`**. Where the dropped element was
trailing, `seg`'s trailing-empty trim removed it outright, so it is not even
positionally recoverable. **The filed 835 case reproduces exactly**:
`CLP\*\*1*500.00*450.00*50.00*MB*ICN-9001\*11::1`with`warnings.length === 0`.

  **▶ THE 837's CLM-01 IS THE OTHER END OF THE SAME LINK AND WAS IN NO FILED
  RECORD.** CLP-01 reassociates a remittance back to CLM-01; one line could drop
  **both**.

  **▶ THE BUILDER'S OWN REQUIRED-FIELD GUARD WAS DEFEATED, WHICH IS THE SHARPEST
  PART.** `build-835.ts` refuses `patientControlNumber === ""` by name. A number
  is not `""`, so it passed the guard and became `""` one line later.

  **▶ WHY REFUSE AND NOT COERCE, WHICH IS THE WHOLE ITEM.** Coercion mints a
  _different_ identifier: a JSON payload that carried `"0012345"` as a number
  already lost the leading zeros, so `String(12345)` emits a well-formed id that
  is **not the one the caller sent**, and reassociating to the wrong claim is
  worse than failing to reassociate. `String(1e21)` is `"1e+21"`, `String(NaN)`
  is `"NaN"`. None are valid `AN`/`ID`/`Nn` content, and `X12Decimal` is
  already the sanctioned numeric route. No working caller breaks, because the
  numeric path did not work; it silently lost the field.

  **▶ THE `#51` ASYMMETRY IS DELIBERATE, NOT AN INCONSISTENCY.**
  `renderCallerValue` **coerces** for this same caller mistake because a refusal
  message that throws destroys the `code` surface consumers branch on; `esc`
  **refuses** because a document must invent nothing. _Survive anything_ vs
  _invent nothing_. Opposite duties, opposite answers.

  **▶ THE FIRST DRAFT CLAIMED THIS WAS "THE SINGLE ROUTE A CALLER-SUPPLIED
  ELEMENT VALUE TAKES INTO AN EMITTED SEGMENT" AND A REFUTER FALSIFIED IT TWICE.
  THE MECHANISM WAS RIGHT; THE CLAIM WAS TOO WIDE. Both classes are
  `PRE-EXISTING`, both outside the item's stated `esc()` scope, both now measured
  and pinned in the gate.**
  **(1) THIRTY-SIX `esc` SLOTS READ `.toString()` OFF AN `X12Decimal`**, so a raw
  `number` arrives at the chokepoint already a string: 12 in `build-837`, 12 in
  `build-835`, 4 in `build-820`, 4 in `build-277`, 3 in `build-271`, 1 in
  `build-834`. Head, `warnings.length === 0`: a `patientResponsibilityAmount` of
  `0.1+0.2` emits `CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…`, `1e21`
  emits `…*1e+21*…`, `NaN` emits `…*NaN*…` - **the exact three strings this
  slice's own prose names as disqualifying.**
  **(2) SEVEN STRING-TYPED POSITIONS NEVER CALL `esc` AT ALL:** `build999`'s
  `envelope.groupControlNumber` (GS-06/GE-02, `GE*1*12345`),
  `envelope.transactionSetControlNumber` (ST-02/SE-02, `ST*999*12345*…`),
  `functionalGroup.disposition` (AK9-01, `AK9*12345*1*1*1`),
  `transactionResponses[].disposition` (IK5-01), and `build278`'s
  `review.levelCode` (HL-03). **AK9-01 is the sharpest: an `ID` element bound to
  X12 code source 715, and `build999`'s own `X12_ACK_ACCEPT_WITH_ERRORS` guard
  compares `disposition === "A"`, which a number walks past exactly as it walked
  past `patientControlNumber === ""`.** Same mechanism, unfixed, in a builder
  this slice otherwise fixes. **Worth its own item, together with the
  `PRE-EXISTING` delimiter-injection those same raw slots admit
  (`groupControlNumber: "1*BOGUS"` shifts GS-07/GS-08 with zero warnings).**

  **ALSO NOT FIXED, PINNED AS RESIDUALS:** the fixed-width ISA/GS slots go
  through `pad`/`padControl`, not `esc`. `pad(1, 15)` throws an untyped
  `TypeError` and `padControl(1, 9)` throws a **typed but MISLEADING** "exceeds
  the 9-char spec limit" for a one-digit number. Neither is silent, so neither is
  this defect. `buildTA1` has no `esc` at all (every element fixed-width). And
  the refusal names the **builder, not the element position**: `esc` is unary and
  **invoked 411 times on 378 lines** (comment-stripped, `ctx.esc(...)` included,
  and the gate asserts both numbers). **The first draft published "378 call
  sites", which is the LINE count** - the same class of miscount this repo has
  now shipped twice. And **"no working caller is broken" was too absolute**: a
  boxed `new String("PT-ACCT-001")` built at base and is refused at head.

  **Public surface change:** exported `escapeRelease` now **throws `TypeError`**
  on a non-string instead of returning `""`. A `TypeError` on purpose: it is a
  pure text utility with no spec context to name, and nothing in the library can
  reach it because the builders refuse first.

- **THE SUITE'S START-UP TAX IS GONE AND `testTimeout` NOW STATES ITS OWN SCOPE
  (2026-08-03, `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX`). NO TIMEOUT VALUE
  CHANGED, AND THAT IS THE FINDING, NOT AN OMISSION.** Test + config only;
  `scripts/phi-scan.ts` and `scripts/attw.mjs` untouched.

  **TRIMMED, NOT BOUNDED.** `test/scripts/phi-scan.test.ts` went from **32 spawns
  across 32 cases, ALL under `tsx`**, to **36 spawns across 33 cases, 34 under
  `node` and 2 under `tsx`**: **30 `tsx` start-ups removed**, 2 kept on purpose in
  the equivalence case. **Counted at RUNTIME with a `spawnSync` shim, on BOTH
  trees.** **▶ AND THE FIRST DRAFT PUBLISHED "34, every one of them" IN FIVE
  PLACES, WHICH IS THE HEAD CENSUS PORTED ONTO THE BASE STATE** - the exact
  "a remedy's prose does not port with its code" trap the item names, committed
  while quoting the rule, and self-contradicted by this slice's own docblock. A
  refuter caught it. **Count both trees, and never reuse one census for the
  other.** The scanner is type-annotated Node that needs erasing and nothing more
  and **Node 22.18 or newer strips types itself**, so the spawns take
  `process.execPath`. Measured on this box (12-CPU cgroup quota,
  `availableParallelism()` **12**, other workers running, load average 8.9 to
  11.3 - **the item's 2.0-CPU / `nproc` 56 figure is STALE, re-derive it, do not
  inherit it**): one start is **441 ms** median under `tsx` against **149 ms**
  under `node`, seven runs each. **Interleaved BASE/HEAD, two rounds each**, so
  the arms share a load condition: that file goes **17.2 / 17.5 s to 8.6 / 8.6 s**
  in-suite, **15.7 s to 6.6 s** alone, and total CPU across workers **58.9 / 58.4 s
  to 50.5 / 49.5 s**. The first attempt at this measurement compared a base run
  and a head run taken an hour apart and showed a **2.4x** whole-suite win that
  was mostly the box getting quieter; **every figure here is interleaved.** Those
  medians **predict 8.2 s and not 9.1 s** (32 conversions at 292 ms, less the 4
  starts the new case adds), so the model is the right shape and **about 11%
  light**; the first draft claimed a 1% fit, which was the miscount again.

  **▶ THE SUBSTITUTION IS PINNED AS AN EQUIVALENCE, NOT ASSUMED.** `pnpm phi-scan`,
  the pre-commit hook and CI still run `tsx`, so one new case drives BOTH runners
  over the same violator and the same clean file and requires the same exit code,
  stdout and stderr. It is the only `tsx` spawn left in the file, and a simulated
  divergence reds it. Nothing else enforces erasable-only syntax: the shared
  `@cosyte/tsconfig` sets no `erasableSyntaxOnly`, and sets
  `verbatimModuleSyntax: FALSE`. **The Node 22.18 floor is likewise unenforced**
  (`engines.node` is `>=22.0.0`, no `.nvmrc`); it fails loudly rather than
  greening wrongly, and CI's `node-version: "22"` resolves past it.
  **SCOPE IT:** it drives `paths` mode only, so it pins exit 0 and exit 1 and
  **NOT** the exit-2 refusals, all-mode, or `--staged`. Deliberate: the only
  plausible divergence is at MODULE LOAD, which cannot be confined to the routes
  it skips. A non-load-time divergence would mean this case is too narrow.

  **▶ SAY WHAT IT BOUGHT AND WHAT IT DID NOT, BECAUSE THE TWO FIGURES DIVERGE.**
  It removed ~8.6 s of CPU and barely moved the critical path
  (**17.2 / 17.5 s to 16.3 / 16.7 s**), which is now `test/scripts/attw-gate.test.ts`.
  **Deliberately left alone, measured not asserted:** one `attw --pack` on a
  trivial two-file package is **1,596 ms** median, of which the real `npm pack` is
  **462 ms** and the rest is attw's own analysis. No runner to substitute, pinning
  the REAL binary is the point of that gate, and its cases already carry 60 s
  ceilings each.

  **▶ THE GLOBAL WAS LEFT AT 10 s ON PURPOSE, AND THE 834 STREAM IS WHY.** The
  three slowest suites already take **per-test** ceilings (834 stream 120 s,
  `attw-gate` 60 s/case, the 81-slot PHI sweep 120 s). The 10 MB+ 834 stream
  measured **8.9 / 10.0 / 9.3 / 9.1 s** across the four interleaved runs: it sits
  **AT the 10 s global**, and is green only on its own ceiling (**24.1 s** under
  heavier load, which is the unambiguous figure). **Do not upgrade the 10.0 s
  reading into a proven crossing** - the reporter rounds, so it is not evidence of
  which side it fell on, and a first draft asserted it anyway. Raising the global to fit
  it hands the same leash to all 1,100-odd tests and makes a genuinely hung test
  look slow rather than broken. The slowest test still under the global is ~1.2 s,
  about 8x headroom.

  **▶ AND IT IS NOT THE LIVENESS NET PEOPLE ASSUME.** Measured on this tree with
  vitest 4.1.4 under a deliberately tiny per-test ceiling: an **async** overrun
  reds at the ceiling; a **finite synchronous** overrun reds but only AFTER the
  work returns, so the verdict is late; an **infinite synchronous** loop gives
  **NO VERDICT AT ALL** and wedges the worker (killed from outside at 45 s, exit
  143, no pass/fail line). That is exactly what `X12-CALLER-VALUE-RESIDUALS` hit,
  where removing a `requireCallerArray` call spins a builder forever. **A liveness
  regression here reads as an ABSENT verdict, not a red one, and no value of
  `testTimeout` changes that** - the defence is the source scan in
  `test/builder-array-bounds.test.ts`.

- **🩺 THE PHI SCANNER WAS BLIND TO A SYMLINK ON BOTH ENUMERATING ROUTES, AND
  BOTH NOW REFUSE (2026-08-03, `PHI-SCAN-SYMLINK-BLIND-ON-BOTH-ROUTES`).**
  Ported from the graded `terminology#37`, re-measured here rather than copied.
  Measured on base `5779542` against a throwaway repo laid out like this one,
  with a synthetic name-bearing `.edi` payload (NM1 person name + DMG DOB + PER
  phone off the 555 convention + `REF*SY` SSN + a dashed SSN), which as a plain
  regular file is **exit 1 on the NM1 name detector specifically**:
  - **all mode**: `walk()` enumerates `Dirent.isFile()`, an **lstat** answer, so
    a link is neither a file nor a directory. A link under `test/fixtures`, a
    link under `src/`, and a **linked DIRECTORY** (a whole subtree) each printed
    `OK - no hits` at **exit 0**;
  - **`--staged`**: git stores a link as its **TARGET STRING** under mode
    `120000`, so `git show :<path>` handed back `../../<name>.edi` and never the
    bytes. **Exit 0.**

  Both refuse now (**exit 2**, the existing "could not complete" code), naming
  **every** offender with its own repo-relative path and a scanner-owned kind
  token. **Neither route FOLLOWS an ENTRY it enumerated** - following reads
  bytes the enumeration does not control, and git does not carry them, so a hit
  on them would be a claim about something no commit contains. **Say ENTRY, not
  "anything": a walk ROOT that is itself a link IS followed**, because
  `existsSync`/`readdirSync` both follow. Measured identically at base and head:
  with `test/fixtures` pointing outside, the walk enumerates the target's files
  under their `test/fixtures/*` names and **hits (exit 1)**. That is a superset
  scan, not a blind one, so it is left alone - but the absolute phrasing was
  wrong and a refuter caught it.

  **▶ THE ONE-LETTER BLOCKER, RE-DERIVED ON THIS TREE, NOT INHERITED:**
  `--diff-filter=AM` **drops status `T`**. Replacing a **tracked** regular file
  with a link is neither add nor modify: measured here, `--diff-filter=AM`
  returned **zero rows** while the unfiltered `--raw` showed
  `:100644 120000 <sha> <sha> T`, so the record died before any mode was read
  and the hook passed a mode-`120000` blob **green**. The filter is `AMT` and
  the route reads `--raw -z` rather than `--name-only`, because the destination
  mode is the only thing separating a staged regular file from a link or a
  gitlink. Admitting `T` also closes the reverse typechange (link → real file
  bearing PHI). **Both directions are pinned, and dropping the `T` reds exactly
  those two tests.**

  **A REFUSAL NEVER REPORTS THE LINK TARGET**, which is working-tree text that
  can itself carry PHI. **That is not hypothetical here:** measured at base, a
  staged link whose target NAME was a dashed-SSN shape exited **1 and printed
  that shape**, because `git show` fed the path text to `scanCommonShapes`. The
  target shape is written out in prose rather than exemplified, because a
  diagnostic ABOUT a PHI leak is itself a PHI surface.

  **SCOPE NARROWED, NOT WIDENED.** The walk still excludes a gitignored entry
  (one boundary, not a second stricter one for links); `--staged` still sees only
  `test/fixtures/**` and `src/**.ts`. **A gitlink already exited 2 at base** - by
  `git show` failing and echoing git's own text - so it is **renamed, not newly
  caught**, and the test asserts the kind token AND the absence of
  `could not read`. **`paths` mode is deliberately untouched because it was never
  blind:** `readFileSync` follows a link, so a named path is scanned and hits
  (measured, exit 1).

  **DELIBERATELY DEFERRED, and the reason is direction:** x12 still carries the
  **enumerate-then-read race** (closed so far in `ccda`/`hl7`/`mllp`/`ncpdp`/
  `synth`). Its remedy TOLERATES a failed read; this one NARROWS what the
  enumeration admits. Shipping both together would mean one commit that both
  widens and narrows the same gate. x12 is also not reachable through it today
  by the same **scope accident** the org survey recorded: the walk roots are
  `test/fixtures` and `src`, so a repo-root `tsup` transient is never enumerated,
  and **this repo's own `test/scripts/phi-scan.test.ts` mkdtemps under
  `os.tmpdir()`, not under a scan root** - unlike `mllp` and `ncpdp`/`synth`,
  which seeded transients inside theirs. Not a measured hang, and **any widening
  of a walk root reintroduces it verbatim.**

  **INHERITED AS DISCLOSURE, NOT SILENTLY RE-CLOSED:** `R`/`C` rename/copy are
  still **not enumerated by `--staged` at all** (pre-existing; admitting them
  needs the two-path record shape, a scope decision), and there is still **no
  refuse-a-scan-that-observed-nothing rule** (`ccda#80`'s, which `terminology`
  never had either). **Measure the R/C cost rather than inferring it, because it
  is a live pre-commit hole with a real PHI shape:** renaming a fixture while
  substituting a real name stages as `:100644 100644 ... R080 <old> <new>`,
  which **both `AM` and `AMT` return zero rows for**, and `--staged` exits **0**
  over a payload that is a hit as an ordinary add; `git mv`-ing an
  already-committed **link** into `test/fixtures/` is `R100` and is likewise not
  refused. **All-mode is the backstop for both** (exit 1 and exit 2), so the gap
  is at pre-commit, not in CI. Worth its own item now that the mode check exists
  to hang it on.

  **Negative controls both ways:** dropping the walk's non-regular branch reds 6
  tests, and `AMT` → `AM` reds the 2 typechange tests. No library code changed
  and no published type changed.

- **The two residuals `X12-BUILDER-BOUNDS` filed are closed: profile
  refusals are bounded, and a forged non-array REFUSES instead of HANGING
  (2026-08-02, `X12-CALLER-VALUE-RESIDUALS`).** Two parts, and **the second
  is the sharper one because it is a LIVENESS defect, not a disclosure one.**

  **(1)** `src/profiles/validate.ts` interpolated caller values into
  `X12ProfileError` verbatim. **Twelve refusal sites hold twenty-three
  caller-value holes**, and all twenty-three now route through
  `renderCallerValue` or the new `renderCallerJson`. **THE FILED FIGURE OF
  120,093 DID NOT REPRODUCE**, exactly as `#51`'s own filed figures did not:
  re-derived by driving the thirteen cases the suite ships against base
  `55ebc66`, the worst message is **360,181 characters**, at the `fixture`
  refusal. **THREE of the thirteen exceed 360,000**, and they are exactly the
  three that name THREE caller values rather than two (profile name + quirk id +
  a `JSON.stringify`d value). Head: the same case measures **431**.

  **▶ AND THE FIRST DRAFT OF THIS SLICE PUBLISHED 240,092, WHICH IS THE
  `sourceCategory` SITE AND NOT THE MAXIMUM.** It came from a side probe rather
  than from the table the suite runs, which is the same error class the item was
  filed to correct, one item later. **Drive the shipped table.** And **431 is a
  measurement at a 120,000-character value, not a maximum**: the
  ` (N characters)` suffix widens with the decimal width of the length, so the
  same refusal measures 434 at 1,000,000 and 437 at 10,000,000. That site's
  derived ceiling is **443**, and the suite asserts every site under 500. `renderCallerJson` exists because the value's
  TYPE is what is wrong at those sites - `null` and `"null"` are different
  mistakes and a coercing renderer flattens them - so it keeps `JSON.stringify`
  and bounds its OUTPUT; it never throws (circular, `BigInt`, hostile `toJSON`)
  and fabricates no closing quote, because JSON does not always open one.
  **`X12ProfileError.profileName` is deliberately NOT bounded** and that is
  asserted as a test: it exists so a consumer can pinpoint which of their
  definitions failed, and truncating it would stop it matching what they passed.

  **▶ AND THE `QUIRK_ID_RE` COMMENT CLAIMED A BOUND THE PATTERN NEVER HAD.**
  It said "2-64 lowercase-alphanumeric chars"; the regex accepts one character
  and accepts 120,000, which is in fact the path to the largest message on the
  tree. **The comment was corrected to the code, not the grammar tightened** -
  rejecting ids that define cleanly today is a separate decision from bounding a
  message.

  **(2) 🩺 THE DOMAIN BUILDERS TOOK THEIR LOOP BOUND FROM A CALLER-SUPPLIED
  `.length`.** A forged `{ length: "9".repeat(120000) }` coerces to `Infinity`
  in `m < spec.members.length`, every element read is `undefined`, every guard
  `continue`s, and the builder **spins forever instead of refusing**. Measured
  at base with a 20-second wall-clock timeout in a child process (a hang cannot
  be observed in-process), over the **nineteen** probes the suite ships:
  **16 HUNG** and 3 threw an untyped `TypeError`. All **32 indexed loops across
  7 builder modules** now take their bound from a `requireCallerArray` binding,
  and at head the same nineteen give **17 typed, code-tagged refusals** (169-194
  characters) and 2 untyped `TypeError`s. **`build835`'s `spec.traces` never
  hung** - it is a `for...of` residual this slice happens to close - and the
  first draft of the gate file claimed it did. **"14 of 16" was wrong too**: no
  shipped table yields sixteen probes.
  **`requireCallerArray` takes the module's `refuse` callback rather than
  throwing a shared error**, because each builder owns a distinct error class
  and code that consumers branch on, and a shared throw would quietly widen all
  nine contracts.

  **▶ A REGRESSION THE FIRST DRAFT CAUSED AND THE REFUTER CAUGHT, AND IT IS
  `#51`'s SHAPE AGAIN: THE FIX WAS WIDER THAN THE CLAIM.** Every site this
  replaced read its optional field as `x.dates ?? []`, and `??` treats `null`
  and `undefined` alike; guarding only `undefined` made `null` a refusal.
  Measured: `build834({ members: [{ ..., healthCoverages: null }] })` **emitted a
  valid 834 at base and drew `X12_834_BUILD_INVALID_SPEC` at the first head** -
  and _inconsistently_, since the same spec still accepted `references: null`,
  which is read with `for...of` and never moved onto the chokepoint. `null` is
  what a `JSON.parse`d payload carries for an absent list, from the exact caller
  class this module exists for. `requireCallerArray` now answers `null` as
  absent and base behaviour is restored; on a REQUIRED array it becomes the
  site's own "at least one X is required" refusal instead of base's untyped
  `TypeError` **for five of the six** (`build834` / `build820` / `build837` /
  `build271` / `build277`). **`build835`'s `claims` is the measured exception**,
  because `enforceBalance` reads `spec.claims.map` rather than the checked
  binding; it is no worse than base and is pinned by a test. The first draft of
  the remedy wrote that sentence unqualified, which is the same claim-width
  error one notch smaller, and pass 2 caught it.

  **▶ SCOPE THE CLAIM. This is a forged NON-ARRAY input, not a mis-read
  clinical value**, so it is not `STOP-THE-LINE`: nothing decodes a document
  differently, no dose / allergy / code system / patient identifier moves, and
  the reachable harm is **availability**. It is unreachable from TypeScript and
  reachable from JavaScript, JSON, and therefore `@cosyte/cli`.

  **▶ DISCLOSED, NOT FIXED, AND IDENTICAL AT BASE AND HEAD:** where a builder
  reads a caller array with `for...of` - `buildInterchange`'s `spec.groups`,
  `build999`'s `functionalGroup.transactionResponses`, and **every optional leaf
  array** (`claim.dates`, `member.references`, `header.references`) - a forged
  list throws `TypeError: ... is not iterable`. It **terminates**, so it is not
  the hang, but it carries **no `code`**. Pinned by tests so it cannot quietly
  become one, and in `KNOWN-LIMITATIONS.md`.

  **THE DELIVERABLE IS TWO SOURCE GATES, and `#51`'s was REUSED rather than
  copied.** `test/builder-refusal-bounds.test.ts` now also sweeps
  `src/profiles/*.ts` and matches `X12ProfileError`, so one allowlist governs
  both halves: **11 modules, 80 throw sites**, of which the builder half is
  **unchanged at 23 bounded sites / 28 holes** and the profile half is **12 / 23**.
  `test/builder-array-bounds.test.ts` is new and scans loop BOUNDS, requiring
  each to be a local produced by `requireCallerArray` - **it keys on the OPERAND,
  never on the property name**, which is the mistake `#51`'s allowlist made
  twice. Its scan strips comments first, because its own first draft flagged
  `caller-array.ts`'s docblock, which quotes the defect verbatim.

  **▶ THE NEGATIVE CONTROL FOUND SOMETHING WORSE THAN A RED.** Reverting one
  loop bound reds the scan by file and line, and reverting one profile
  interpolation reds the message gate by file and line. But **removing the
  `requireCallerArray` call outright does not fail the behavioural test - it
  WEDGES it.** A synchronous infinite loop never yields, so vitest's
  `testTimeout` cannot interrupt it; measured, the run had to be killed from
  outside at 60 seconds with no verdict. **The behavioural cases cannot report
  this regression**, which is the argument for keeping the source scan
  exhaustive rather than trusting the examples.

  **Known and NOT claimed away:** the same limits `#51` wrote down still hold.
  Bounding a message here **redacts nothing** (the caller passed the value in and
  still holds it), so this is not `PHI-WARNING-MESSAGE-LEAK`; the surviving
  characters are **not escaped**; the bound is on UTF-16 **code units, not
  bytes**; and both scans are syntactic tripwires for the shape this library
  uses, not proofs.

  **▶ TWO `PRE-EXISTING` FINDINGS THE REFUTER RAISED, MEASURED, FILED, NOT
  FIXED HERE.**
  **(a) 🩺 `escapeRelease` EMPTIES A NUMERIC CALLER VALUE SILENTLY, AND ONE OF
  THE SLOTS IS THE PATIENT CONTROL NUMBER.** `src/parser/release.ts` reads
  `value.length`; for a `number` that is `undefined`, `i < undefined` is false,
  the loop never runs, and it returns `""`. Reproduced **identically at base
  `55ebc66` and at head**: a `build835` spec with a numeric
  `patientControlNumber` and `payerClaimControlNumber` emits
  `CLP**1*500.00*450.00*50.00*MB**11::1` with **`warnings.length === 0`** and a
  frozen, "successful" interchange. CLP-01 is required by TR3 005010X221A1 Loop
  2100 and is the reassociation key back to the 837's CLM-01, so this is a
  **silently dropped patient identifier on the emit path**. The
  `claim.patientControlNumber === ""` guard does not catch a number. It is the
  same JS/JSON caller `renderCallerValue`'s own `coerce()` JSDoc names as real
  and reachable: `#51` coerced the **renderer** for that caller and left the
  **emitter** dropping the value. **Outside this item and NOT fixed here** - the
  remedy is a decision (coerce like the renderer, or refuse) across every
  `esc()` slot in nine builders, which is its own slice.
  **▶ CLOSED 2026-08-03 by `X12-NUMERIC-VALUE-EMITS-EMPTY`. The decision was
  REFUSE. See the top of this section.**
  **(b)** Neither new gate scans indexed loops outside the `build*` scope
  (`src/loops/define.ts`, `src/profiles/validate.ts`, the `get-*.ts` readers,
  `src/parser/envelope.ts`). Scope gap named, not a measured hang.

- **Builder refusal messages are BOUNDED, and the 835 remit-total warning
  points at the BPR (2026-08-02, `X12-BUILDER-BOUNDS`).** Two parts.
  **(1)** Caller-supplied values reached `build*` refusal messages verbatim.
  Every route now goes through `renderCallerValue`
  (`src/builder/caller-value.ts`), capping the rendered **fragment** at
  `BUILD_REFUSAL_VALUE_MAX_RENDERED` = **90**; all three names are public so a
  consumer can assert the ceiling.

  **▶ THE CENSUS IN THE ITEM WAS SIXTEEN AND THE TRUE NUMBER IS TWENTY-THREE.**
  Re-derived here: 59 `throw` sites across 10 modules. Sixteen carry a
  caller-supplied **string** (nine over-long control numbers, one per emitting
  module, where the branch fires BECAUSE the value is over-long; seven with no
  length gate at all: `build999`'s ST-02 trace twice, `buildInterchange`'s
  ST-01, `build837`'s line variant, `build834`'s INS-03 + HD-01, `buildTA1`'s
  note code). **SEVEN more are in `build999`, found only by adversarial review,
  over two passes.** Four are the AK9-02 / AK9-03 / AK9-04 counts: typed
  `number`, which is exactly why a census of string-typed slots missed them, and
  the type is not a runtime guarantee, so a `JSON.parse`d spec reached a
  **120,063-character** `AckBuildError.message`. Three are `.length` reads on
  caller-supplied arrays, which a forged `{ length: "9".repeat(120000) }` drove
  to **120,152 characters**, larger than the figure the item was filed on.
  **23 sites, 28 holes** (one refusal names all three counts).

  **▶ THREE PUBLISHED FIGURES WERE WRONG IN THE FIRST DRAFT OF THIS SLICE, IN
  THE SAME RUN THAT WAS TOLD TO RE-DERIVE THEM.** `BUILD_REFUSAL_VALUE_MAX_RENDERED`
  was published as 92 in seven places and evaluates to **90** (63 + 2 quotes +
  1 ellipsis + 14 + 10). And "now produces a 90-byte message" was a **category
  error**: 90 is the ceiling on the interpolated FRAGMENT, while the message is
  the fragment plus the site's own template text. Measured on this tree, the
  `buildInterchange` control-number refusal against a 120,000-character value
  is **120,066 characters at base and 150 now**; the fragment is 86. The filed
  figures of 120,155 / 120,069 did not reproduce at all: they depend on the
  probe payload and which site was hit. **State a ceiling as a ceiling and a
  measurement as a measurement.**

  **▶ MAKE THE CLAIM YOU CAN SUPPORT. This is NOT
  `PHI-WARNING-MESSAGE-LEAK` on the emit side.** There the value was the
  DOCUMENT's, so bounding it was redaction. Here the caller passed it in and
  still holds it, so bounding redacts nothing; what it buys is a fixed ceiling
  on anything reaching a log line, a crash report or a JSON error envelope.
  Escaping was considered and **deliberately not done**, so a refusal message
  is bounded but **not** guaranteed to be one log line. **And the caller-vs-
  document dichotomy is NOT categorical, which the first draft got wrong:** TR3
  005010X231A1 requires AK2-02 to be a verbatim copy of the acknowledged ST-02
  and `buildTA1` echoes an inbound ISA-13, so on the ack path a DOCUMENT's
  control numbers reach a refusal by the standard's own design. Envelope
  control numbers, not clinical content, bounded like the rest, and now said
  out loud in all four docs.

  **The deliverable is the source gate**, `test/builder-refusal-bounds.test.ts`:
  it walks every `throw new *BuildError` in every builder module, extracts every
  interpolation hole, and requires each to be library-computed or wrapped.
  **Its first allowlist was itself the defect it exists to catch** - it admitted
  any `String(...)` on the stated ground that such a hole is a library-computed
  index, while inspecting nothing about the argument, which is precisely how
  the four AK9 counts passed clean. **Its SECOND allowlist was the same mistake
  again:** it admitted `String(<expr>.length)` as "an array length", which
  inspects the property NAME and not the operand, so a forged `{length}` sailed
  through. The `.length` escape is gone and those holes are bounded too; what
  remains allowed is only a single-letter loop index and the `width` literal,
  where no caller expression appears in the hole at all. **Negative controls run
  both ways:** reintroducing an interpolation into `buildTA1` reds three tests
  naming file and line, and reverting one AK9 count reds two. All 23 slots also
  carry a behavioural 120,000-character probe.
  **Known and NOT claimed away:** the gate keys on `throw new *BuildError(` and
  on template holes, so a message composed in a helper, built by `+`
  concatenation, or thrown via a local binding would slip past it. It is a
  strong tripwire for the shape this library actually uses, not a proof. The
  bound is also on UTF-16 **code units**, not bytes (an all-astral value is 86
  units and 152 bytes, and a slice at the bound can split a surrogate pair), so
  every published figure says "characters" deliberately.

  **(2)** The remit-total balance warning's `position.segmentIndex` was a
  literal `0`. **`0` is NOT a neutral sentinel here: `tx.segments[0]` is the
  `ST`**, so a consumer resolving the position landed on the ST. It is now the
  BPR's own 1-based body index (`tx.segments[idx].id === "BPR"`), matching what
  claims and service lines already had; the only remaining `0` is a transaction
  with no BPR at all. **`balance.ts` had documented the old `0` as deliberate**
  ("not a CLP and not the BPR"), so that doc was corrected with the code.

  **▶ THE BUILD-SIDE HALF WAS FILED AS THE SAME DEFECT AND IS NOT ONE.**
  `build-835.ts` also passed `segmentIndex: 0`, but measured: the builder has no
  parsed segment stream to index into (the segments do not exist until after the
  guard has passed), and it consumes only the warning's `.message`, which since
  `#46` is a registry lookup keyed by the invariant and therefore
  position-independent. The position is **inert by construction**, not merely
  unused. Fabricating a plausible index would have named a segment no consumer
  can resolve. It is now `UNANCHORED_BUILD_POSITION`, named and documented, and
  the stale "messages are numeric-only" JSDoc `#46` left there is corrected.

  **A REGRESSION THE BOUND CAUSED AND THE REFUTER CAUGHT:** reading `.length`
  where the base interpolated into a template literal turned a typed,
  code-tagged refusal into an uncaught `TypeError` with no `code`, for any
  JS/JSON caller passing a number where the types say string (`@cosyte/cli` is
  such a caller). `renderCallerValue` now coerces and never throws.

  **SE-01 asserted outright rather than trusted**, per the tripwire this repo
  has hit three times: SE-01 recomputed from the emitted segments, GE-01 and
  IEA-01 from the group and transaction counts, no
  `X12_SEGMENT_COUNT_MISMATCH` under `specClean`, and recomputed counts
  byte-identical to the plain emit. The refuter independently confirmed
  `serializeX12(parseX12(f))` byte-identical at base and head across all 56
  fixtures.

  **PRE-EXISTING, filed not fixed HERE, and CLOSED by
  `X12-CALLER-VALUE-RESIDUALS` (see the entry above):**
  `src/profiles/validate.ts` interpolated caller values unbounded into
  `X12ProfileError`. **The 120,093 figure filed here did not reproduce** on
  re-derivation; the worst measured at base is 360,181.

- **The round-trip half is closed too: an orphan is re-emitted at a
  STRUCTURAL ANCHOR (2026-08-02, `X12-ORPHAN-REEMIT`).** The bullet below
  closed the model half and deliberately left this open, because the
  obvious remedy was refuted. **The fix is the anchor, not the
  re-emission.** `X12OrphanSegment.anchor` records which slot of the typed
  tree the segment sat in - `{kind:"interchange",groupIndex}`,
  `{kind:"group",groupIndex,transactionIndex}`, or
  `{kind:"transaction",groupIndex,transactionIndex,segmentOffset}` - and
  `serializeX12` places every orphan by that and **never** by
  `segmentIndex`. An index equal to the eventual length means "after the
  last one" (just before the `GE` or `IEA`); `segmentOffset` is never `0`
  because `rawSegments[0]` is the `ST`; and the `transaction` kind is
  reachable **only by a `TA1`**, since anything else arriving inside an
  open `ST..SE` is body content. An anchor survives both reorderings the
  emit performs (the `ta1Segments` hoist, the skipped zero-length segment)
  because it names a slot rather than a byte offset - which is exactly
  what a raw index could not do.
  **Measured, not asserted:** a stray segment inserted at every position
  of a two-group / three-transaction interchange, five segment ids (`ZZ`,
  `SE`, `GE`, `ST`, `TA1`) covering all five orphan `context` values and
  all three anchor kinds. **50 of 50** orphan-producing insertions
  round-trip **byte-exactly** on a base with no envelope `TA1`; on the same
  base _with_ one, **0 of 54** are byte-exact but **54 of 54** are
  byte-identical once the `TA1` is deleted from both sides - the only thing
  that moved is the `TA1`, which moves on that base with no orphan at all.
  Across all 104: transaction bodies, `orphanSegments` (raw + context +
  anchor), `ta1Segments`, `trailingBytes` and the warning multiset are
  unchanged by the round trip, and every emit is a fixed point.
  **The canonical list drops from SEVEN to SIX**, and the count of silent
  constructs stays five - because the construct that left the list is the
  one that _warned_. Only post-IEA `trailingBytes` warns now.
  **DELIBERATELY NOT IN SCOPE, and still on the list as case 6:** the
  empty-first-element segment (`*A*B~`) outside a transaction. It is
  skipped by the walker, so there is nothing on the model to re-emit;
  closing it is a RETENTION change to the `name.length > 0` guard, not a
  round-trip one, and it would mint `X12_UNEXPECTED_SEGMENT` warnings where
  there are none today. Unchanged and byte-identical on base.
  Retention and placement are still **not promotion**: no `get*` reader
  sees an orphan, and a `TA1` inside a group still does not join
  `ta1Segments`. Registry unchanged at 22 codes + 4 fatals; nothing became
  fatal. **The four regression tests from the refuted replay were kept
  verbatim and are green** - they assert an orphan never becomes
  transaction CONTENT (never joins `rawSegments`, which is what every
  `get*` reader walks), never corrupts SE-01 or SE-02, never fabricates or
  truncates a transaction, and never crosses the IEA into `trailingBytes`.
  **State that at the MODEL level, not the byte level:** a
  `ta1-inside-group` orphan IS written back between the `ST` and the `SE`,
  because that is where it came from, so "never lands inside a transaction"
  would be simply false.

  **▶ THE REFUTER FOUND ONE INTRODUCED DEFECT HERE, AND IT WAS SE-01
  AGAIN.** Pass 1 emitted the `TA1` back inside the `ST..SE` while
  `segCount` still counted only `tx.rawSegments`, which excludes the lifted
  `TA1`. So spec-clean mode described bytes it had not written: measured,
  `{specClean, recomputeCounts}` **rewrote a CORRECT `SE*4*` down to
  `SE*3*` over four emitted segments**, and the inverse input (`SE*3*`)
  drew no mismatch warning at all. Base was safe only because it dropped
  the segment, so the model count and the emitted count agreed by
  accident. **SE-01 is "segments included in the transaction set,
  including ST and SE" (X12.6), so it must count the bytes the serializer
  writes, not the model rows** - `segCount` now adds every orphan flushed
  between the `ST` and the `SE`, and an orphan flushed before the `ST` or
  after the `SE` is correctly not counted. Now idempotent under the
  library's own gate: recompute, re-parse, re-reconcile raises nothing and
  is byte-stable. GE-01 and IEA-01 are unaffected, because an orphan is
  never a `GS` and never opens a transaction set.

- **Silent data loss closed at the MODEL: a segment outside a transaction
  is retained, though still not re-emitted (2026-08-02,
  `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED`).** Two defects, one cause.
  **(1) The envelope walker raised `X12_UNEXPECTED_SEGMENT` for a segment
  it could not place and then DISCARDED it**, so the segment left the
  model, left the emit, and its warning did not recur on a re-parse of
  the emit: a consumer who serialized and re-derived warnings lost both
  the data and the signal. **(2) The line-break tolerance was exactly one
  optional CR then one optional LF**, which admitted **4 of the 15 CR/LF
  sequences of length 0 to 3**; the other 11 left a break in the stream
  that opened an unrecognized segment, so via defect (1) a uniformly
  **double-spaced file lost its ENTIRE interchange body** and returned
  `groups: []`. Measured on base `3017d88`: **4 of 15** sequences framed,
  and **0 of 10** orphan cases retained anything. After: **15/15 and
  10/10** (ten constructed cases over nine distinct positions; one case
  repeats a position with two segments). The fix is a new public surface,
  `X12Interchange.orphanSegments` (`X12OrphanSegment`: `raw`, decoded
  `segment`, `segmentIndex`, and the library-owned `context`
  discriminant), populated through a single `recordOrphan` chokepoint so
  the warning and the retained segment can never disagree.
  **`segmentIndex` is the documented join key** back to the warning's
  `position.segmentIndex`.

  **▶ THE REFUTER KILLED THE RE-EMIT HALF, AND IT WAS RIGHT.** Pass 1
  shipped a `serializeX12` that replayed each orphan at its recorded
  `segmentIndex`, making every enumerated position round-trip byte-exact
  with the warning surviving. **It was unsound.** `segmentIndex` indexes
  the INPUT stream, and the emit is NOT in input order: `ta1Segments` are
  hoisted ahead of the groups, and a doubled terminator's zero-length
  segment occupies an input index that is never emitted. Either shifts
  the output's indices, so replaying by index splices the orphan into
  whatever occupies that slot. **Measured:** on a two-group interchange
  with a TA1 after the first group, a stray `ZZ` landed INSIDE the 835's
  `ST..SE` body between `CLP` and `SE`, and the re-parse raised **no
  warning at all** (`get835` would walk it as claim content); a stray
  `SE` closed the transaction early and corrupted SE-01; with a doubled
  terminator ahead of it the orphan crossed the IEA and became
  `trailingBytes`. **Base merely dropped it.** Trading a warned,
  documented omission for silent structural corruption of a transaction
  body is the wrong direction under this repo's own invariant, so the
  replay was REMOVED rather than patched. Correct placement needs a
  STRUCTURAL anchor on the model (which group and transaction the segment
  followed), not a raw input index. **Filed, not shipped - and shipped in
  the bullet above, as an anchor.** Read the refutation before touching the
  emit again: the defect it names is in the _addressing scheme_, and it
  comes straight back if anyone reaches for `segmentIndex`.

  **▶ PASS 2 (NOT REFUTED) STILL MOVED THE CANONICAL COUNT, from six to
  SEVEN** (and `X12-ORPHAN-REEMIT` then took it back to six by removing a
  _different_ entry - this one stayed). A segment whose first element is
  empty (`*A*B~`), **outside** a
  transaction, has no id for the walker to dispatch on and is dropped from
  the model AND the emit with **no warning at all** - the only construct on
  the list with no diagnostic whatsoever. Long-standing and byte-identical on
  base; what was new was the inconsistency, since this slice disclosed it in
  prose while the numbered list still said six. Inside an open transaction
  the same segment round-trips normally, so the case is specific to the
  outside-a-transaction position. Silent constructs are now **five of
  seven**, not four of six.

  **This does NOT turn anything into a fatal and adds no warning code**
  (registry still 22 + 4 fatals); it removes warnings from double-spaced
  traffic, which previously produced 7 per file. **The five
  `X12_UNEXPECTED_SEGMENT` messages were corrected** - they said the
  segment was not retained, which is now false. Orphans are deliberately
  NOT decoded by any `get*` reader and a TA1 inside a group is
  deliberately NOT added to `ta1Segments`: retention is not placement.
  Neither a doubled terminator nor a segment with an empty first element
  is recorded, both long-standing and now stated rather than implied.

- **PHI diagnostic surface closed: warning messages come from a frozen
  registry (2026-07-31, `PHI-WARNING-MESSAGE-LEAK`).** The single
  distinguishing property from the ecosystem audit
  (`documentation/repos/phi-audit.md`) now holds here: **no warning factory
  takes a value parameter.** Each takes an `X12Position` plus, where one code
  covers several situations, a library-owned discriminant
  (`CONTROL_NUMBER_PAIRS` / `UNEXPECTED_SEGMENT_CONTEXTS` /
  `BALANCE_INVARIANTS` / `REQUIRED_LOOPS`), and `message` is a lookup into a
  frozen table exported as `ALL_WARNING_MESSAGES`. **The previous posture,
  shape-validate-then-echo with a `(non-spec)` fallback, held for the
  code-list slots and could not hold for a control number**, whose grammar is
  whatever the trading partner sent: `X12_CONTROL_NUMBER_MISMATCH` rendered
  BOTH sides verbatim and unbounded on all six ISA-13 / IEA-02 / GS-06 /
  GE-02 / ST-02 / SE-02 slots, and `IEA-01` / `GE-01` / `SE-01` / `ISA-12` /
  the three 835 balance amounts did the same. Also fixed: a strict-mode
  escalation carried 64 bytes of the interchange as `snippet` (now `""`;
  `snippet` stays on the four Tier-3 fatals, the one deliberate exception),
  `X12Segment.id` was an unbounded copy of the segment's first element (now
  bounded to the X12 segment-id grammar with a `NON_SPEC_SEGMENT_ID` sentinel,
  the `hl7`-to-`deid` layering lesson applied here), and
  `X12_INVALID_DELIMITERS` echoed the detected separator byte.
  **The deliverable is the slot table, not the fix**:
  `test/_helpers/phi-slots.ts` declares **81 consumer-controlled slots**
  across the envelope, all six control numbers, the counts, every code-list
  slot, the 835 / 837 / 271 / 277 / 277CA / 278 / 820 / 999 / TA1 bodies, and
  the model identifiers, driven by `assertNoDiagnosticPhiLeak` from
  `@cosyte/test-utils@0.0.2` (the manifest pin had to move off `^0.0.1`,
  which resolves EXACTLY on npm for a `0.0.x`). Measured one slot at a time
  against the base commit: **13 of 81 red**, and the 68 green ones are the
  point of writing it before the fix. Registry membership is asserted
  separately so a factory that starts interpolating again fails without
  anyone extending the table. **The shipped disclosure was wrong in five
  places** (README, `docs-content/troubleshooting.md`,
  `spec-notes-tolerance.md`, `cookbook.md`, `KNOWN-LIMITATIONS.md`): it
  called messages PHI-free by construction and told consumers to log the
  whole `.warnings` array, naming `.snippet` (not a field on a warning) as
  the exception. Corrected in the same commit as the fix that makes the new
  wording true. Warning registry unchanged at 22 codes; fatals at 4.

- **Phase 9: profile system + clearinghouse/payer companion-guide quirk
  attribution shipped (2026-06-28).** A `defineProfile()` API mirroring
  the sibling `@cosyte/hl7` profile shape, plus a `profiles` namespace of
  built-ins, in `src/profiles/`. **v1 profiles are DESCRIPTIVE**: the
  lenient parser is already lossless, so a profile NEVER alters the parse.
  It attaches attribution metadata to the returned interchange
  (`ix.profile`) and powers the one behavioural hook, `partitionWarnings`.
  Profile-on / profile-off divergence is attribution-only: `groups`,
  `warnings`, and `isa` are byte-identical with and without a profile
  (asserted by a divergence test). `defineProfile(spec)` validates
  (fail-fast name → Levenshtein "did you mean?" on unknown keys → quirk
  set), merges any `extends` lineage (flatten + dedupe first-occurrence;
  child wins on quirk-id collision keeping first-seen position; scalar
  `description` last-wins), re-validates the composed set, and returns a
  frozen `X12Profile` whose `describe()` yields a **structured**
  `X12ProfileDescription` bucketed by effect (`relaxes` / `adds` /
  `requires`), deliberately structured DATA, not hl7's formatted string.
  `setDefaultProfile()` / `getDefaultProfile()` hold a process-scoped
  default; an explicit `{ profile }` wins, `{ profile: null }` opts out for
  that call. **The locked HARD RULE ("a profile entry without a Tier-2
  fixture demonstrating the deviation is forbidden; no invented quirks")
  is enforced three ways:** the `fixture` field is required at the type
  level, `defineProfile()` rejects a missing/ill-formed fixture path, and
  the accuracy suite's per-quirk DEMONSTRATOR registry asserts each cited
  fixture actually exhibits its claimed deviation. A shipped quirk with no
  demonstrator FAILS the suite, so a real-but-irrelevant fixture cannot
  slip past. Built-ins ship ONLY where a Tier-2 fixture grounds them:
  `profiles.availity` (payer-loop `REF*2U` + service-line `REF*F8`,
  grounded in `remit/835-availity-quirk.edi`) and `profiles.bcbsCommon`
  (backslash component separator, grounded in
  `envelope/bcbs-subelement.edi`); a generic Medicare-FFS-style profile
  whose only "deviation" is the canonical `:` baseline is DEFERRED rather
  than invented. Built-ins are reachable only through the `profiles`
  namespace, never the top-level export (mirrors hl7). **API divergence
  from hl7, by design:** `describe()` returns structured data (not a
  string), the input type is `X12ProfileSpec`, and `partitionWarnings` is
  x12-only, conscious departures driven by x12's lossless-lenient reality.
  New public exports: `defineProfile`, `setDefaultProfile`,
  `getDefaultProfile`, `partitionWarnings`, `profiles`, `X12ProfileError`,
  and the `X12Profile` / `X12ProfileSpec` / `X12ProfileQuirk` /
  `X12ProfileDescription` / `X12ProfileEffect` / `X12WarningPartition` type
  tree. No new warning codes (registry unchanged at 22). Verify gate green
  across typecheck, lint, format, phi-scan, coverage (per-dir ≥90 incl. the
  new `profiles/` dir), build, attw, and verify:exports.
- **Phase 8f: domain builders `build820` (005010X218 Premium Payment)
  and `build834` (005010X220A1 Benefit Enrollment) shipped
  (2026-06-28). The v1 emit scope is now COMPLETE.** The emit
  counterparts to `get820Payments` and `get834Header` /
  `get834Enrollments`, layering on the Phase 8 general builder and
  mirroring the pure-function `build835` pattern: each NEVER
  auto-sends, opens a socket, or touches the filesystem, and returns a
  frozen `X12Interchange`. `build820(spec)` emits one GS..GE group
  (GS-01 `RA`) wrapping one ST..SE 820 (ST-03 `005010X218`) from a typed
  `Build820Spec` whose monetary fields are `X12Decimal` throughout
  (BigInt-exact, never `parseFloat`); segments emit in TR3 loop order
  (BPR → TRN → Loop 1000A receiver `N1*PE` → Loop 1000B remitter
  `N1*PR`/`N1*RM` → Loop 2000 remittances: ENT / NM1 → REF → DTM → RMR →
  ADX). `build834(spec)` emits one GS..GE group (GS-01 `BE`) wrapping one
  ST..SE 834 (ST-03 `005010X220A1`) from a typed `Build834Spec`
  (envelope + BGN header + sponsor `N1*P5` / payer `N1*IN` + the member
  roster); segments emit in TR3 loop order (BGN → N1 parties → REF → DTP,
  then per member: INS → NM1\*IL + DMG + N3/N4 → REF → DTP → COB → Loop
  2300 HD → DTP → AMT), with member DTPs emitted BEFORE the first HD so
  the read side binds them to the member. Each result round-trips through
  `parseX12` so its reader reproduces a well-formed spec field-for-field.
  **The 820 carries no TR3 balance equation** (BPR-02 is not required to
  equal Σ of the RMR open items), so the builder emits all monetary
  amounts VERBATIM and NEVER raises a balance-mismatch refusal, a
  deliberate contrast with `build835`. **Maintenance type is the 834's
  safety primitive. Emit verbatim, refuse the unknown:** the builder
  places the caller-supplied INS-03 / HD-01 code (X12 Code Source 875)
  into the segment VERBATIM and NEVER infers or normalizes it; where the
  lenient read side only WARNS on an unknown code, the builder REFUSES to
  EMIT an action it cannot name. **Refusal, not silent corruption:**
  `build820` REFUSES via a typed `Premium820BuildError`
  (`X12_820_BUILD_INVALID_SPEC`: no TRN trace, no remittance, a
  remittance with neither an `ENT` nor an `NM1` to open its loop, a
  remittance with no `RMR` open item, an open item with no identity, an
  over-long control number); `build834` REFUSES via a typed
  `Enrollment834BuildError` (`X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE`:
  an INS-03 / HD-01 code outside the X12 875 subset;
  `X12_834_BUILD_INVALID_SPEC`: no member loop, an empty required
  INS-03, an over-long control number). Both messages carry structural
  indices / counts only. `build834` additionally names the offending
  maintenance code (an X12 control code, never PHI), but never a member
  id or name (PHI discipline). New public exports: `build820`,
  `Premium820BuildError`, `PREMIUM_820_BUILD_ERROR_CODES`,
  `Premium820BuildErrorCode`, the `Build820Spec` type tree; `build834`,
  `Enrollment834BuildError`, `ENROLLMENT_834_BUILD_ERROR_CODES`,
  `Enrollment834BuildErrorCode`, and the `Build834Spec` type tree. Verify
  gate green across typecheck, lint, format, phi-scan, coverage (per-dir
  ≥90), build, attw, and verify:exports. **With this change the full v1
  emit scope is complete. Every v1 transaction now has a domain
  builder.**
- **Phase 8e: services-review builders `build278Request` (005010X217
  Request for Review) and `build278Response` (005010X216 Response) shipped
  (2026-06-28).** The emit counterparts to `get278Request` /
  `get278Response`, layering on the Phase 8 general builder and mirroring
  the pure-function `build277` / `build277CA` pattern: each NEVER
  auto-sends, opens a socket, or touches the filesystem, and returns a
  frozen `X12Interchange`. Both share one `buildServicesReview` body
  (GS-01 `HI`, ST-01 `278`) and differ only in ST-03 / GS-08 (`005010X217`
  vs `005010X216`) and the HCR direction gate. They assemble a complete
  interchange from a typed `Build278Spec` (envelope + BHT header + the
  UMO → requester → subscriber → (dependent) → reviews tree); segments
  emit in TR3 loop order (BHT → HL 20 UMO → HL 21 requester → HL 22
  subscriber NM1/DMG → [HL 23 dependent] → HL EV/SS review: TRN → UM →
  HCR → REF → DTP → HI → MSG → provider NM1s, recursing SS service
  reviews under their EV event), and each result round-trips through
  `parseX12` so its reader reproduces a well-formed spec field-for-field.
  **The certification decision is the safety-critical, response-only
  surface:** `build278Response` places the caller-supplied HCR-01
  `actionCode` (`A1` certified / `A3` not-certified / `A4` pended / `A6`
  modified / …) into the segment VERBATIM and NEVER infers, normalizes, or
  upgrades it. The round-tripped `decision.actionCode` is byte-for-byte
  the input; `build278Request` REFUSES a review carrying a decision (HCR is
  response-only) and `build278Response` refuses a decision with an empty
  action code. **The HL spine is computed, never caller-supplied:** the
  builder computes every HL-01 id, HL-02 parent pointer (`20 → 21 → 22 →
23 → EV/SS`), and HL-04 has-child flag from the nested input tree, so a
  structurally inconsistent hierarchy is _unrepresentable_ and SE-01 is
  correct by construction. **Refusal, not silent corruption:** the builder
  REFUSES via a typed `ServicesReview278BuildError`
  (`X12_278_BUILD_INVALID_HIERARCHY`: a subscriber with neither a review
  nor a dependent, a dependent with no review;
  `X12_278_BUILD_INVALID_SPEC`: a review with no request category code, a
  request review carrying an HCR decision, a response decision with an
  empty action code, an over-long control number). The thrown message
  carries structural locators only (`subscriber.review[0]`, level codes),
  never a member name, member id, trace, or diagnosis code (PHI
  discipline). New public exports: `build278Request`, `build278Response`,
  `ServicesReview278BuildError`, `AUTH_278_BUILD_ERROR_CODES`,
  `ServicesReview278BuildErrorCode`, and the `Build278Spec` type tree.
  Verify gate green (typecheck + lint + format + phi-scan + coverage
  per-dir ≥90 + build + attw + verify:exports). **Scope:** the remaining
  domain builders (`build820`, `build834`) layer on this same surface and
  are deferred to chained follow-ups (X12-8f).
- **Phase 8d: response builders `build271` (005010X279A1 Eligibility
  Benefit Response) and `build277` / `build277CA` (005010X212 Claim
  Status Response / 005010X214 Claim Acknowledgment) shipped
  (2026-06-28).** The response-side emit counterparts to
  `get271Eligibility` / `get277Status` / `get277CADisposition`, layering
  on the Phase 8 general builder and mirroring the pure-function
  `build835` / `build837` pattern: each NEVER auto-sends, opens a
  socket, or touches the filesystem, and returns a frozen
  `X12Interchange`. `build271(spec)` emits one GS..GE group (GS-01 `HB`)
  wrapping one ST..SE 271 (ST-03 `005010X279A1`); `build277` /
  `build277CA` share one `buildClaimStatus` body (GS-01 `HN`) and differ
  only in ST-03 / GS-08 (`005010X212` vs `005010X214`). Monetary /
  percent / quantity fields are `X12Decimal` throughout (BigInt-exact,
  never `parseFloat`). Segments emit in TR3 loop order (271: HL spine →
  TRN → NM1 → N3/N4 → DMG → REF → DTP → EB + nested NM1 / REF / DTP /
  MSG; 277: HL spine → NM1 member → Loop 2200 claim TRN → STC → REF →
  DTP → Loop 2220 SVC → STC / REF / DTP; STC-01/10/11 are C043
  category : status : entity composites), and each result round-trips
  through `parseX12` so its reader reproduces a well-formed spec
  field-for-field. **TRN echo is the safety-critical reassociation
  invariant:** the builder places the caller-supplied trace into TRN-02
  verbatim and NEVER fabricates, normalizes, or mutates it. A build-side
  property test feeds random trace tokens through all three builders and
  asserts the round-tripped `referenceId` is byte-for-byte the input.
  **The HL spine is computed, never caller-supplied:** the builder
  computes every HL-01 id, HL-02 parent pointer, and HL-04 has-child flag
  from the nested input tree (271 spine `20 → 21 → 22 → 23`; 277 / 277CA
  spine `20 → 21 → 19 → 22 → 23`), so a structurally inconsistent
  hierarchy is _unrepresentable_ and SE-01 is correct by construction.
  **Refusal, not silent corruption:** the builder REFUSES a structurally
  impossible spec via a typed `Eligibility271BuildError`
  (`X12_271_BUILD_INVALID_HIERARCHY`: no source / a childless source /
  receiver; `X12_271_BUILD_INVALID_SPEC`: over-long control number) or
  `ClaimStatus277BuildError` (`X12_277_BUILD_INVALID_HIERARCHY`: no
  source / a childless source / receiver / provider / a subscriber with
  neither claim nor dependent / a childless dependent;
  `X12_277_BUILD_INVALID_SPEC`: a claim with no trace / status / service
  line, an STC with no category code, an over-long control number). The
  thrown message carries structural locators only
  (`source[0].receiver[0].provider[0].subscriber[0]`, level codes,
  counts), never a member name, member id, or trace (PHI discipline).
  New public exports: `build271`, `Eligibility271BuildError`,
  `ELIGIBILITY_271_BUILD_ERROR_CODES`, `Eligibility271BuildErrorCode`,
  the `Build271Spec` type tree; `build277`, `build277CA`,
  `ClaimStatus277BuildError`, `CLAIM_STATUS_277_BUILD_ERROR_CODES`,
  `ClaimStatus277BuildErrorCode`, and the `Build277Spec` type tree.
  Verify gate green (typecheck + lint + format + phi-scan + coverage
  per-dir ≥90 + build + attw + verify:exports). **Scope:** the remaining
  domain builders (`build820`, `build834`) layer on this same surface and
  are deferred to chained follow-ups (X12-8f).
- **Phase 8c: claim-submission builders `build837P` / `build837I` /
  `build837D` (005010 837 Professional `X222A2` / Institutional `X223A3`
  / Dental `X224A2`) shipped (2026-06-28).** The emit counterpart to
  `get837Claims`, layering on the Phase 8 general builder and mirroring
  the pure-function `build835` pattern: each NEVER auto-sends, opens a
  socket, or touches the filesystem. `build837P/I/D(spec)` assembles a
  complete `X12Interchange` (one GS..GE functional group, GS-01 `HC`,
  wrapping one ST..SE 837, ST-03 per variant) from a typed `Build837Spec`
  whose monetary fields are `X12Decimal` throughout (BigInt-exact, never
  `parseFloat`). Segments emit in TR3 loop order (BHT → Loop 1000A/1000B
  parties → Loop 2000A/B/C HL spine → Loop 2300 claim: CLM / DTP / HI /
  NTE / AMT / REF / 2310 providers / 2320 other subscribers → Loop 2400
  service lines: LX / SVx / DTP / LIN+CTP / TOO / NTE / AMT / REF / 2420
  providers / 2430 SVD+CAS+DTP), one HI composite per HI segment, and
  consecutive same-group line-adjudication CAS triples pack into one
  segment (≤ 6 each); the envelope emits inline (not via
  `buildInterchange`) so a pre-composed composite is never
  double-escaped. The result round-trips through `parseX12` so
  `get837Claims` reproduces a well-formed spec field-for-field. **The HL
  spine is computed, never caller-supplied:** the builder OWNS the 837's
  safety primitive: it computes every HL-01 id, HL-02 parent pointer
  (20 → 22 → 23), HL-03 level, and HL-04 has-child flag from the nested
  billing-provider → subscriber → (claims | patient) tree, so a
  structurally inconsistent hierarchy is _unrepresentable_ and SE-01 is
  correct by construction. **Refusal, not silent corruption:** where the
  lenient read side only WARNS on a broken HL parent pointer, the builder
  REFUSES a structurally impossible spec via a typed `Claim837BuildError`:
  codes `X12_837_BUILD_INVALID_HIERARCHY` (no billing providers, a
  billing provider with no subscriber, a subscriber with neither a direct
  claim nor a dependent patient, a dependent patient with no claim) and
  `X12_837_BUILD_INVALID_SPEC` (empty `claimId`, a claim with no service
  line, a line whose `variant` mismatches the builder, an empty
  procedure / revenue code, an over-long control number). The thrown
  message carries structural locators only
  (`billing[0].subscriber[0].claim[0]`, level codes, counts), never the
  `claimId` (patient-account number) or a member id (PHI discipline). New
  public exports: `build837P`, `build837I`, `build837D`,
  `Claim837BuildError`, `CLAIM_837_BUILD_ERROR_CODES`,
  `Claim837BuildErrorCode`, and the `Build837Spec` type tree. Verify gate
  green (typecheck + lint + format + phi-scan + coverage per-dir ≥90 +
  build + attw + verify:exports). **Known limitation:** claim-/line-level
  provider addresses (Loop 2310/2420 N3/N4) are a documented read-side
  limitation. The NM1 fields round-trip, the address does not. **Scope:**
  the remaining domain builders (`build271`, `build277`, `build278`,
  `build820`, `build834`) layer on this same surface and are deferred to
  chained follow-ups (X12-8d → X12-8f).
- **Phase 8b: first domain builder `build835` (005010X221A1 ERA)
  shipped (2026-06-28).** The first per-transaction emit constructor,
  layering the safety-critical TR3 balance invariants on top of the
  Phase 8 general builder and mirroring the pure-function `build999` /
  `buildTA1` pattern: it NEVER auto-sends, opens a socket, or touches
  the filesystem. `build835(spec)` assembles a complete `X12Interchange`
  (one GS..GE functional group, GS-01 `HP`, wrapping one ST..SE 835,
  ST-03 `005010X221A1`) from a typed `Build835Spec` whose monetary
  fields are `X12Decimal` throughout (BigInt-exact, never `parseFloat`).
  Segments emit in TR3 loop order (BPR → TRN → Loop 1000A/1000B parties
  → LX → Loop 2100 claims → Loop 2110 service lines → PLB); composite
  elements (CLP-08, SVC-01, SVC-06, PLB) escape each component then join
  with the raw component separator (the envelope is emitted inline, not
  via `buildInterchange`, precisely to avoid double-escaping a
  pre-composed element); consecutive same-group CAS and same-provider /
  period PLB adjustments pack into one segment (≤ 6 triples / pairs). The
  result round-trips through `parseX12` so `get835` reproduces a balanced
  spec field-for-field. **Refusal, not silent corruption:** where the
  lenient read side only WARNS on an out-of-balance payer artifact, the
  builder REFUSES via a typed `Remit835BuildError`, reusing the
  authoritative read-side validators (`checkServiceLineBalance` /
  `checkClaimBalance` / `checkRemitTotalBalance`) against a materialized
  read model so the emit guard and the parse warning share one source of
  truth: error codes `X12_835_BUILD_BALANCE_MISMATCH` (any §1.10.2
  invariant) and `X12_835_BUILD_INVALID_SPEC` (no TRN trace, empty
  CLP-01, over-long ISA-13). The thrown message carries numeric totals
  only, never a patient-control number or member id (PHI discipline).
  New public exports: `build835`, `Remit835BuildError`,
  `REMIT_835_BUILD_ERROR_CODES`, `Remit835BuildErrorCode`, and the
  `Build835Spec` type tree. **Parser fix surfaced by the round-trip
  review:** `splitSegments` used a naive `indexOf` for the segment
  terminator and split mid-value on a `?`-release-escaped terminator
  (`?~`); it is now release-aware via `findUnescapedTerminator` (a
  degenerate terminator-is-release delimiter set falls back to the
  literal scan), underpinning both the `build835` round-trip and the
  Phase 8 `serialize(parse(s)) === s` fixed point; regression tests at
  the parser (`parser-envelope`) and builder level. Verify gate green
  (typecheck + lint + format + phi-scan + coverage per-dir ≥90,
  `build-835.ts` at 94.6% branches + build + attw + verify:exports).
  **Scope:** this slice is `build835` only. The remaining domain
  builders (`build837P/I/D`, `build271`, `build277` / `277CA`,
  `build278Request/Response`, `build820`, `build834`) layer on this same
  surface and are deferred to chained follow-ups (X12-8c → X12-8f).
- **Phase 8: spec-clean serializer + general interchange builder
  shipped (2026-06-28).** The emit half of the parser. `serializeX12(ix,
opts?)` reconstructs an `X12Interchange` back to bytes from the
  verbatim `.raw` strings: byte-faithful for the segments ON THE MODEL
  by default (`serialize(parse(s)) === s` is NOT guaranteed in general;
  line breaks, segments outside a transaction, a doubled terminator, a
  missing final terminator, post-IEA trailing bytes, and TA1 position are
  each not reproduced, and all but the line breaks fire on inputs with no
  line breaks at all; `KNOWN-LIMITATIONS.md` holds the canonical list.
  Segments outside a transaction are still not RE-EMITTED, but as of
  `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` they are no longer dropped
  from the MODEL; see the Status entry above), and
  with
  `{ specClean: true }` it reconciles the envelope (SE-01 / GE-01 /
  IEA-01 counts + the ISA-13↔IEA-02 / GS-06↔GE-02 / ST-02↔SE-02 control
  pairs), surfacing every mismatch via `onWarning` and NEVER silently
  correcting it. Corrected counts emit only with
  `{ recomputeCounts: true }`, and control NUMBERS are identity, never
  rewritten. `buildInterchange(spec)` is the general, segment-level
  builder: it owns the 106-byte fixed-width ISA, the GS/GE/SE/IEA
  control segments + their counts, escapes active delimiters in body
  values via `?`, and round-trips its output through `parseX12` so the
  result is bit-identical to the parsed form (an internal builder bug
  surfaces as a warning, not silent corruption). Structurally impossible
  specs are REFUSED with a typed `X12BuildError`
  (`X12_BUILD_INVALID_SPEC`: over-long ISA-13, body segment with no
  id). New warning `X12_SEGMENT_COUNT_MISMATCH` is a serializer-only
  diagnostic (the parser never validated SE-01); registry expands
  21 → 22, additions-only, bounded metadata only (H-PHI invariant).
  13 committed round-trip goldens (one per v1 transaction, regenerated
  by `test/scripts/gen-serialize-goldens.ts`) assert
  `serializeX12(parseX12(fixture))` reproduces the golden byte-for-byte;
  `roundTripProperty` (300 runs) + a builder property (200 runs) lock
  serialize idempotency + a self-consistent built envelope. The new
  reconciliation also caught + fixed four latent fixture defects the
  lenient parser never validated (SE-01 miscounts in 837i / 837d / 999;
  a GS-06/GE-02 mismatch in 278-response). Verify gate green across
  typecheck, lint, format, phi-scan, coverage (per-dir ≥90 incl. the new
  `serialize/` + `builder/` dirs), build, attw, verify:exports. 467
  tests total. **Deferred to a follow-up: domain per-transaction
  builders (`build835` / `build837P/I/D` / `build271` / …, the
  safety-critical emit code) layer on top of this general surface.**
- **Phase 7: 278 Services Review + 834 Enrollment + 820 Premium
  Payment shipped (2026-06-28).** Four read-side helpers round out the
  v1 transaction scope: `get278Request` / `get278Response` (TR3
  `005010X217` / `005010X216`) share one lenient HL-tree walk and differ
  only in the `direction` recorded on the result; `get820Payments` (TR3
  `005010X218`); and the streaming pair `get834Header` +
  `get834Enrollments` (TR3 `005010X220A1`). **Safety-critical fields are
  preserved verbatim and NEVER inferred**: the 278 response `HCR-01`
  certification action lands as-is on each event / service review, and
  the 834 `INS-03` / `HD-01` maintenance type (X12 0875) is preserved
  with an unknown code raising `X12_834_UNKNOWN_MAINTENANCE_TYPE` on the
  affected member only. `get834Enrollments` is an
  `AsyncIterable<X12Enrollment>`: one decoded member per `INS` loop, so
  a consumer holds one member at a time, not the whole roster (streaming
  property test over a 10MB+ synthetic file with early-break; honest
  v1 limitation: the file is still parsed into `tx.segments` up front).
  The 278 HL spine `20 → 21 → 22 → 23` is validated via the shared
  `validateHl`; the `EV` / `SS` event + service levels are deliberately
  tolerant (omitted from the expected-parent map). The 820 surfaces the
  BPR header, TRN traces, receiver (`N1*PE`) + remitter (`N1*PR` /
  `N1*RM`) parties with addresses, and both `ENT` organization-summary
  and bare-`NM1` individual remittances with RMR open items, DTM dates,
  and ADX adjustments. All monetary fields decode as `X12Decimal`. 12
  dogfooded `LoopSpec` artifacts via `defineLoopSpec()` (6 × 278 +
  3 × 820 + 3 × 834). Warning registry expanded by
  `X12_834_UNKNOWN_MAINTENANCE_TYPE` (additions-only), shape-validating
  the echoed code (H-PHI invariant). Synthetic fixtures across all three
  surfaces (278 request / response / comprehensive / edge; 820 canonical
  / edge / loop; 834 canonical / edge) + unit tests. Verify gate green
  across typecheck, lint, format, phi-scan, coverage (per-dir ≥90),
  build, attw, and verify:exports. 407 tests total. **Serialization
  (build side) for all v1 transactions is the next surface (Phase 8).**
- **Phase 6: 271 Eligibility + 277 / 277CA Claim Status shipped
  (2026-06-28).** `get271Eligibility(delimiters, tx)` (TR3
  `005010X279A1`), `get277Status(delimiters, tx)` (TR3 `005010X212`),
  and `get277CADisposition(delimiters, tx)` (TR3 `005010X214`). 277 and
  277CA share one internal walk disambiguated by `ST-03`:
  `get277CADisposition` admits only `005010X214`, `get277Status` admits
  either; both return `undefined` only on a mis-routed `ST-01`.
  **TRN echo is locked as the safety-critical reassociation property**:
  a 271 echoes the requesting 270's `TRN-02` verbatim onto its
  subscriber / dependent, a 277 echoes the 276's onto its claim, never
  mutated, normalized, or dropped (round-trip property test). STC
  status-code fidelity: STC-01 / STC-10 / STC-11 (C043) decode into
  verbatim CSCC (source 507) + CSC (source 508) + entity triples;
  unknown codes preserve their value and emit
  `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` / `X12_UNKNOWN_CLAIM_STATUS`. A
  277CA provider-level batch ack opens a claim on a standalone STC (no
  TRN). HL parent-pointer integrity via the shared `validateHl` (271
  spine `20→21→22→23`; 277 / 277CA spine `20→21→19→22→23`). Mismatches
  emit `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`, never
  silently re-numbered. New dated code-list snapshots
  `CLAIM_STATUS_CATEGORY_CODES` / `CLAIM_STATUS_CODES` /
  `SERVICE_TYPE_CODES` (+ lookups) alongside the CARC / RARC family. All
  monetary fields decode as `X12Decimal`. 13 dogfooded `LoopSpec`
  artifacts through `defineLoopSpec()` (7 eligibility + 7 status, Loop
  2200 / 2220 reused across subscriber + dependent). Warning registry
  expanded 18 → 20 (additions-only), both new factories shape-validate
  the echoed code (H-PHI invariant). Shared `X12Hl` exported for result
  types. Six synthetic fixtures (271 canonical + dependent; 277
  canonical + unknown-status; 277CA batch-ack + HL-orphan), unit tests,
  TRN-echo round-trip + byte-flip fuzz. Verify gate green: typecheck +
  lint + format + coverage (per-dir ≥90) + build + attw +
  verify:exports. 361 tests total. **Phase 7+ (278 services review, 834
  enrollment, 820 premium) is the next surface.**
- **Phase 5: 837 Healthcare Claim (Professional / Institutional / Dental)
  shipped (2026-06-27).** `get837Claims(delimiters, tx, opts?)` walks a
  parsed 837 transaction set into the typed `X12_837Submission` model
  across the three sibling TR3s (`005010X222A2` / `X223A3` / `X224A2`).
  Variant detection from ST-03 implementation-convention reference, with
  SVx-segment-id fallback and `X12_837_UNKNOWN_VARIANT` when neither
  resolves. HL hierarchy validated for parent-pointer integrity (`HL-02`
  must reference an earlier `HL-01`; level must match the TR3-required
  parent: `22` → `20`, `23` → `22`). Violations emit
  `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID` and the
  walker NEVER silently re-numbers. HI qualifier → code-system
  provenance via the new `src/code-lists/hi-qualifiers.ts` registry
  (ICD-10-CM principal `ABK` / other `ABF` / admitting `ABJ`;
  ICD-10-PCS `BBQ` / `BBR`; legacy ICD-9 / NUBC / DRG covered); unknown
  qualifiers emit `X12_UNKNOWN_HI_QUALIFIER`, verbatim qualifier + code
  preserved with `codeSystem: "unknown"`. Variant-specific service-line
  union (`X12_837ServiceLineProfessional` SV1 / `…Institutional` SV2 /
  `…Dental` SV3) with diagnosis pointers (P), revenue code + procedure
  (I), and TOO tooth / surface (D). Loop 2410 LIN + CTP drug
  identification (837P). Loop 2430 SVD + CAS + DTP line adjudication
  (COB), re-using `X12RemitAdjustment` + `lookupCarc` from the 835.
  Loop 2320 other-subscriber + other-payer captured at the surface
  level (detailed CAS / OI / MOA inside 2320 deferred to Phase 9). All
  monetary fields decode as `X12Decimal`. 11 dogfooded `LoopSpec`
  artifacts shipped through `defineLoopSpec()`. Five new warning codes
  (`X12_HL_PARENT_MISMATCH`, `X12_HL_PARENT_LEVEL_INVALID`,
  `X12_UNKNOWN_HI_QUALIFIER`, `X12_MISSING_REQUIRED_LOOP`,
  `X12_837_UNKNOWN_VARIANT`) all shape-validate echoed values (H-PHI
  invariant); the `missingRequiredLoop` rationale strings are
  hard-coded literals. Two new exported constants for safety +
  ergonomics: `HL_LEVEL_CODES` and `NM1_QUALIFIERS`. Six new shared
  element-read helpers in `parser/segment.ts` (`elementValue` /
  `elementOptional` / `componentOptional` / `elementDecimal` /
  `elementDecimalOrZero` / `collectElementValues`) hoisted out of both
  walkers. 10 synthetic fixtures (3 Tier-1 canonical per variant + 6
  Tier-2 quirk + 1 comprehensive). Property tests: HL parent-pointer
  verbatim preservation + never-throw + byte-flip fuzz (300 runs ×
  6 fixtures). Verify gate green: typecheck + lint + format + coverage
  (96.91% stmts / 90.61% branches / 97.67% funcs / 98.49% lines;
  per-dir ≥90) + build + attw + verify:exports. 325 tests total.
  **Phase 6 (eligibility + claim status) shipped 2026-06-28. See above.**
- **Phase 4: 835 Healthcare Claim Payment/Advice (ERA) shipped (2026-06-27).**
  `get835(delimiters, tx)` walks a parsed 835 transaction set into the
  typed `X12Remittance` model: BPR payment header, TRN trace numbers,
  Loop 1000A / 1000B payer + payee parties, Loop 2100 claims (with
  patient / subscriber / service-provider NM1s, CAS adjustments,
  MIA / MOA / LQ remarks, REF / AMT supplemental amounts), Loop 2110
  service lines (with HCPCS / CPT / NDC / revenue-code destructuring,
  line-level CAS / REF / AMT / LQ), and PLB provider-level adjustments.
  All monetary fields decode as the new `X12Decimal`: string-backed,
  `BigInt`-exact arithmetic, **NEVER `parseFloat`**. Three balance
  invariants run after the walk per TR3 X221A1 §1.10.2 (line, claim,
  top-of-remit) and emit `X12_835_REMIT_BALANCE_MISMATCH` on mismatch.
  The model is NEVER silently rebalanced; PLB amounts carry the raw
  EDI sign (positive = take-back, so the top equation is
  `BPR-02 == Σ(CLP-04) - Σ(PLB)`). Bundled WPC + X12-internal code-
  list snapshots ship as versioned data artifacts (`CARC` ~30 codes,
  `RARC` ~15 codes, `CLP_STATUS` 10 codes, `CLAIM_ADJUSTMENT_GROUP_CODES`
  as a frozen 4-value literal union); unknown codes preserve the
  verbatim value and emit `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC`.
  Three built-in `LoopSpec` artifacts (Loop 2000 / 2100 / 2110) ship
  through the public `defineLoopSpec()` API, the dogfooding gate.
  Warning registry expanded 10 → 13 (additions-only); shape-validated
  CARC / RARC echoes mirror the H-PHI invariant from `@cosyte/hl7`.
  Six fixtures (5 Tier-1 synthetic spec-clean + 1 Tier-2 synthetic
  Availity-quirk shape). Property tests: `X12Decimal` algebra invariants
  (round-trip / additive identity / commutativity / subtraction-by-
  addition / negation involution); balance-invariant property
  (balanced ⇒ no warning; imbalanced ⇒ warning + verbatim preservation);
  byte-level 835 fuzz target across every fixture (300 runs each).
  Verify gate green: typecheck + lint + format + coverage (97.7%
  stmts / 91.97% branches / 99.24% funcs / 99.38% lines, per-dir
  ≥90 on `parser/` / `loops/` / `transactions/` / `code-lists/`) +
  build + attw + verify:exports. 269 tests total.
- **Phase 3 acknowledgments shipped (2026-06-27).** Pure-function 999 + TA1
  parse + build. `parse999(raw)` decodes AK1 → AK2 → (IK3 [→ CTX] (IK4 [→
  CTX])\*)\* → IK5 → AK9 (lenient-accepts legacy `AK3`/`AK4`/`AK5`,
  normalizes onto X231A1). `build999(spec)` assembles a spec-clean
  X12Interchange around the 999; REFUSES `Accept` against a non-empty
  error list (`X12_ACK_ACCEPT_WITH_ERRORS`) and inconsistent AK9 counts
  (`X12_ACK_COUNT_MISMATCH`). Envelope walker captures TA1 verbatim onto
  `X12Interchange.ta1Segments`; `parseTA1(ix)` returns typed `X12AckTA1`;
  `buildTA1(spec)` emits a `Ta1Segment` and REFUSES `A` + non-`000` note
  (`X12_TA1_ACCEPT_WITH_NOTE`). Code-list registries shipped:
  `X12_ACK_DISPOSITION_CODES` (715), `IK3_SYNTAX_ERROR_CODES` (716),
  `IK4_SYNTAX_ERROR_CODES` (723), `TA1_ACK_CODES` (I13), `TA1_NOTE_CODES`
  (I18). Acks are structurally PHI-free by design; `IK4-04`
  (`copyOfBadDataElement`) is documented as a caller-supplied surface
  callers SHOULD omit when bytes are PHI. The library NEVER
  auto-populates it.
- **Phase 2 syntactic core shipped (2026-06-27).** Every body segment in a transaction is decoded
  into an immutable `X12Segment` (id + 1-indexed elements; raw text preserved on
  `X12TransactionSet.rawSegments`). The `?`-release-character escape is honored losslessly
  (`?~`→`~`, `?*`→`*`, `??`→`?`); dot-path traversal (`getSegmentValue(seg, "03-1")`) walks
  elements, composites (`-N` 1-indexed), and repetitions (`[N]` 0-indexed). Public
  `defineLoopSpec()` API ships. Phases 3+ author their built-in TR3 loops through it. Warning
  registry expanded 8 → 10 (`X12_DANGLING_RELEASE_CHAR`, `X12_UNEXPECTED_SEGMENT`).
- **Phase 1 envelope decoder shipped (2026-06-27).** `parseX12()` decodes ISA / GS / GE / IEA, detects
  all four delimiters from fixed ISA byte positions, surfaces stable warning codes + 4 Tier-3 fatal
  codes, and round-trips the ISA byte-exact.
- On the shared cosyte engineering standard (migrated Phase E): toolchain inherited from the
  published `@cosyte/*` config packages, CI/release are thin callers of `cosyte/.github`. Per-directory
  ≥90 coverage gate armed on `src/parser/`.
- **PHI commit-gate armed (2026-06-28).** A zero-dep, X12-shape-aware
  scanner (`scripts/phi-scan.ts`, `pnpm phi-scan`) refuses fixtures /
  `src/` carrying real-PHI-shaped tokens: NM1 person names + SSN
  qualifier `34`, MI member-id / XX NPI shapes, DMG dates of birth,
  pre-2024 DTP/DTM/BHT/GS dates, dashed SSN / `REF*SY` / non-test
  email. Synthetic tokens are positively declared in
  `scripts/phi-allow-list.txt` (X12 is byte-strict, so no inline header,
  same allow-list model as DICOM's binary `.dcm`); a whole-file
  bypass needs `--allow-fixture` **and** an audit entry in
  `phi-scan-overrides.md`. Runs at pre-commit (`simple-git-hooks
--staged`) and in CI (`run-phi-scan: true`); the `verify.sh` summary
  now shows `phi-scan ✓`.
- Pre-alpha `0.0.x`, **published** to npm from a public repo. Never quote a
  version here: `npm view @cosyte/x12 version` is the only source of truth.
  The **read** scope is decoded for 271, 277/277CA, 278, 820, 834, 835,
  837P/I/D, 999, and TA1. **The 270 and 276 inquiry directions have NO typed
  model on either side**: no `get270` / `get276` reader, no `build270` /
  `build276` builder, and no 270 or 276 dispatch anywhere in `src/`. They
  parse into segments and dot-paths like any other X12 input and nothing
  decodes them further, so do not describe the v1 read or emit scope as
  "270/271" or "276/277" complete: that claim was on the README and the
  docs site until ASSETS-P8 corrected it. The general **emit** surface
  (`serializeX12` + `buildInterchange`)
  shipped in Phase 8, and (with Phase 8f) the **domain emit**
  scope is complete for every transaction that has a reader: a per-TR3 domain builder
  (`build835` / `build837P/I/D` / `build271` / `build277` / `277CA` /
  `build278Request` / `build278Response` / `build820` / `build834`, plus
  the pure-function `build999` / `buildTA1` acknowledgments) layering the
  safety-critical per-TR3 invariants (balance, certification,
  maintenance-type fidelity, count reconciliation) on top of the general
  builder.

## v1 Scope Snapshot

HIPAA healthcare transaction sets at version **005010** (with errata hooks for `005010X279A1`, `005010X221A1`, etc.). **This is the v1 SCOPE declaration, not a list of what has SHIPPED** (see the Status section above: the 270 and 276 inquiry directions have no typed model on either side):

- **270 / 271** Eligibility Inquiry / Response
- **276 / 277** Claim Status Inquiry / Response (incl. 277CA)
- **278** Services Review (Request + Response)
- **820** Premium Payment
- **834** Benefit Enrollment & Maintenance
- **835** Healthcare Claim Payment/Advice (ERA)
- **837P / 837I / 837D** Professional / Institutional / Dental Claims
- **999** Implementation Acknowledgment (parse + build)
- **TA1** Interchange Acknowledgment (parse + build)

Non-healthcare (850/856/810/204), EDIFACT, AS2/SFTP transport, and pre-005010 are out of v1 scope.

## Tech Stack (the shared `@cosyte/*` standard)

x12 mirrors `@cosyte/hl7` (the reference parser) and inherits the canonical toolchain by depending on
the published `@cosyte/*` config packages, not by copying files. The source of truth is the meta-repo's
`documentation/conventions.md`. This is a summary.

- **Language:** TypeScript (strict, full rigor set incl. `noUncheckedIndexedAccess`) via
  `@cosyte/tsconfig`. **Target ES2023**. The shared base sets `verbatimModuleSyntax: false`.
- **Build:** dual ESM + CJS + `.d.ts` via `tsup` (`@cosyte/tsup-config`); `attw` is a publish gate
  (per-condition types: `.d.ts` for `import`, `.d.cts` for `require`). The `attw` script is
  **`scripts/attw.mjs`, not the bare CLI**: see the guardrail below, because the CLI reports a
  missing `dist/` as "does not contain types" and **exits 0**.
- **Node:** **>= 22** (CI matrix 22 + 24, via the reusable pipeline).
- **Package manager:** `pnpm@10`.
- **Lint/format:** **ESLint 10** + unified `typescript-eslint` (type-checked) via
  `@cosyte/eslint-config`; Prettier via `@cosyte/prettier-config`. Lint at `--max-warnings=0`.
- **Testing:** **Vitest 4** + v8 coverage (`@cosyte/vitest-config`), per-directory >= 90 gates
  (armed globally now; per-dir gates get listed in `vitest.config.ts` once parser code lands).
- **CI/CD:** thin callers of the reusable `cosyte/.github` workflows.
- **Runtime deps:** **Zero.** Node stdlib only.
- **License:** MIT

## Engineering Guardrails

- No `any`. No unjustified `as` casts. Use `unknown` and narrow.
- JSDoc (with `@example`) on every public export: feeds IntelliSense.
- Immutable by default. Mutation only via explicit methods (`setElement`, `addSegment`, `addLoopIteration`, `removeSegment`).
- No `console.*` in library code. Throw typed errors or return results.
- Short, testable functions over big parsing blobs.
- Postel's Law: parser is liberal (lenient default + warnings with stable codes and positional context); serializer is conservative. Be exact about what that means, because the README said it loosely until ASSETS-P8: the domain builders emit spec-clean X12 by construction, but `serializeX12` is **byte-faithful by default only for the segments the parser recorded on the model**, which is narrower than it sounds: `serialize(parse(s)) === s` is NOT guaranteed, and "my file has no line breaks" is not sufficient to make it hold (see `KNOWN-LIMITATIONS.md`, which holds the canonical list of what is not reproduced; most of it needs no line break, and most of it is silent). `{ specClean: true }` reconciles the envelope and warns; `{ specClean: true, recomputeCounts: true }` also emits the corrected counts. `recomputeCounts` is inert without `specClean`. Nothing is ever silently corrected.
- Fatal errors only for unrecoverable structural corruption (4 Tier-3 codes: `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`). Everything else is a warning.
- Coverage target: ≥ 90% on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/`.
- Built-in loop specs + profiles must be authored through the same public API (`defineLoopSpec()`, `defineProfile()`): dogfooding gate.
- HIPAA code lists ship as versioned data snapshots. Code-list updates are a release event, not a runtime fetch. `codeLists.meta.snapshotDate` is the runtime surface for snapshot-freshness checks.
- Acknowledgments (`build999`, `buildTA1`, `parse999`) are pure functions: they never auto-send, never open sockets, never touch the filesystem.
- **▶ `attw` SAYS "does not contain types" AND EXITS 0, SO THE `attw` SCRIPT IS A WRAPPER, NOT THE BARE CLI.** `getExitCode.js` in `@arethetypeswrong/cli` (0.18.4, the version pinned here) opens with `if (!analysis.types) return 0`. An untyped package is a legitimate npm package, so "no types at all" is a description rather than a problem, and the problem list is never consulted. No `--profile`, `--ignore-rules` or config setting reaches that early return. For a package that ships types it means the declarations were **not in the tarball**, which is a broken publish reported as a pass, and `verify.sh` propagates the step's status faithfully, so the step is what lies to it. **`scripts/verify.sh` needs no change; do not touch it.**
  **The timing supplies the condition, but the exit code is the defect.** Reproduced here on a quiet box with **zero concurrency**, both printing the sentence and exiting 0: `rm -rf dist && attw --pack .`, and `rm -f dist/index.d.ts dist/index.d.cts && attw --pack .`. The second is the realistic one, because `tsup` emits the JS in one pass and the declarations in a later one, so **every** build has an interval where `dist/` holds `.mjs`/`.cjs` and no `.d.ts`. **Measured on this package: 1.92 s** from the first JS entry point to the first declaration file, on one clean `pnpm build`. (The sibling that shipped this fix first measured 4.95 s on its own build. Re-measure per repo; do not carry the figure over.) A concurrent build or a `clean` in the same working tree lands `attw` in that interval. So the answer is **not** a lock, a lease or a build queue (ADR 0015): the gate has to be able to say its own inputs were missing, whatever removed them.
  `scripts/attw.mjs` carries **two nets that catch different things**, so keep both: a **preflight** that every relative path `package.json` promises (`main`, `module`, `types`, `typings`, every string leaf of `exports`) exists and is non-empty, which catches the build interval and **names the missing file**; and a **post-check** on the untyped sentence, which catches what the preflight structurally cannot, namely declarations present on disk but excluded from the tarball by `files`/`.npmignore`. **No instance of that second case has occurred in this repo** yet.
  **The post-check reads a string, so what would hide that string is refused rather than tolerated.** **Four routes were measured against this repo's own binary**, each handing back exit 0 with the sentence absent: `--quiet`, `--format json`, a `.attw.json` setting either (`readConfig()` applies it after argv), and `--config-path` pointed at a file that sets one of them. **The reference this was ported from refused `--config-path` by inference and said so; here it is measured.** Both forms were measured, and they differ: `--config-path` at a **nonexistent** path blinds nothing, because `readConfig()` swallows the `ENOENT` and carries on. The real-file form is the one that blinds, so the test uses it. That choice is belt-and-braces rather than strictly required, and an earlier draft of this line overstated it: the test's `refused wholesale` assertion pins the argv path independently of which form is passed, so either half alone would red with the refusal deleted. The refusal is **by option name, wholesale, not by value**: a harmless `--format` value blinds nothing and is refused anyway, which is the deliberate trade against value-parsing them.
  `test/scripts/attw-gate.test.ts` pins both nets against the real binary, **including the upstream exit-0 itself**, so an `attw` upgrade that rewords the sentence or fixes the exit code reds the suite instead of letting the net go quietly slack. It also pins a **negative control** on a well-formed package and that a real `attw` failure still fails, because a gate that only ever fails is not a gate and one that swallows the status is not one either. **11 of its 13 cases go red with `scripts/attw.mjs` removed** (verified); the two that do not are the upstream pin, which does not exercise the wrapper, and the attw-still-fails case, whose status comparison a missing wrapper happens to satisfy.
  **This is a per-repo script and porting it is not finished org-wide.** Every sibling still invoking the CLI directly carries the same false green, **including `config/scripts/parser-template/`, which `scaffold-parser.mjs` mints new parsers from**, so a port that skips the template leaves the defect being re-minted. Derive the current set rather than trusting a count: `/usr/bin/grep -rl '"attw":' --include=package.json --exclude-dir=node_modules /workspace`.
- **No em dashes (`U+2014`). Ever.** Founder directive, `knowledgebase/06-brand/voice-and-tone.md`. Gated by `pnpm check:no-emdash` (`scripts/check-no-emdash.sh`) and by `.github/workflows/no-emdash.yml`, which checks the tracked files **and your PR title, PR body, and commit messages**, because this repo squash-merges and those become the message that lands on `main`. The fix is never to re-encode the character: rewrite with a period, a colon, a comma, or parentheses.

## Sibling Project

**`@cosyte/hl7`** lives at `../hl7` and ships a matching API shape for HL7 v2. When in doubt on an API decision, check how `@cosyte/hl7` solved it. Symmetry is a feature, not an accident.

## Standing disciplines (every change)

These three bind every change in this repo (mirrored from the cosyte meta-repo's
`documentation/conventions.md`):

1. **Documentation follows code.** A public-surface / stack / status change isn't done until its
   docs are: this package's own docs (`docs-content/` + JSDoc), and (in the meta-repo) its
   `documentation/repos/<repo>.md` and the `ecosystem-map.md` status table.
2. **Version + changelog every meaningful change.** Add a Changeset (`pnpm changeset`, `patch`
   during pre-alpha) and keep `CHANGELOG.md`'s `[Unreleased]` current. Stay on `0.0.x` until first alpha.
3. **Crew + knowledgebase feedback loop.** When a standard, decision, or public surface changes,
   flag whether a `crew` skill or `knowledgebase` doc needs creating/updating, never silently skip.

Build, lint, format, and TypeScript settings come from the shared `@cosyte/*` config packages
(`@cosyte/tsconfig` · `@cosyte/eslint-config` · `@cosyte/prettier-config`; see
`documentation/conventions.md` → "Canonical toolchain (enforced)"). Node ≥ 22.

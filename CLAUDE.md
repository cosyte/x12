# @cosyte/x12: Project Guide for Claude

## Project

**`@cosyte/x12`**: a developer-focused ASC X12 EDI parser + utility library for Node.js/TypeScript, published under the Cosyte brand. Open-source (MIT). The payer-side sibling of [`@cosyte/hl7`](../hl7): API shape, profile system, and lenient-parser philosophy are deliberately mirrored.

**North star:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and pull useful fields out of it in one line, without having read the X12 standard or any TR3 implementation guide.

## ▶ Read this before you touch the parser: `documentation/agent-notes.md`

**This file used to be 106,994 bytes.** The narrative that made it that big - the per-incident
write-ups, the shipped-phase histories, the measurements, and every refutation that killed a remedy -
is now in **[`documentation/agent-notes.md`](documentation/agent-notes.md)**, verbatim and unedited,
under headings named for the item that produced them. Relocated 2026-08-04 under `CLAUDE-MD-AUDIT`
(meta-repo `documentation/decisions/0023-doc-budgets.md`, 2026-08-04 amendment). **This file's size is
bounded at write time by the umbrella's `.claude/hooks/doc-budget.mjs`. Never quote its number here -
read `REPO_CLAUDE` in the hook**, because the bound is a **per-repo ratchet** set at each file's
measured size **+2,000**, not a uniform cap. A uniform 90,000 was built first and reversed the same
day: it would have made five repos shrink-only while workers were mid-flight in them. **The +2,000 is
load-bearing, not slack - a new TRAP must always be addable in one line; a new essay must not.**
**The ratchet must be LOWERED as a relocation lands, or it is a rubber stamp** - lowering x12's entry
to fit this file is part of landing this change and belongs in the umbrella, not here.

**Nothing was deleted.** What stays here is the cursor, the rules, and every trap, each compressed to
one imperative line. **Every `###` heading in "Traps" below names the section of `agent-notes.md`
that carries that trap's measurement, its sources, and the reasoning - open it before you act on the
line.** These paragraphs each cost a defect or a refuted claim to learn, and several name a remedy
that was tried, shipped, and then refuted.

## Status

Pre-alpha `0.0.x`, **published** to npm from a public repo. **Never quote a version here:**
`npm view @cosyte/x12 version` is the only source of truth.

- **Read scope is decoded for** 271, 277 / 277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1.
- **Emit scope is complete for every transaction that has a reader**: general
  (`serializeX12` + `buildInterchange`, Phase 8) plus a per-TR3 domain builder (`build835`,
  `build837P/I/D`, `build271`, `build277` / `build277CA`, `build278Request` / `build278Response`,
  `build820`, `build834`) and the pure-function `build999` / `buildTA1` acknowledgments, each
  layering the safety-critical per-TR3 invariants (balance, certification, maintenance-type fidelity,
  count reconciliation) on the general builder.
- **🩺 The 270 and 276 inquiry directions have NO typed model on either side** - no `get270` /
  `get276`, no `build270` / `build276`, no 270 or 276 dispatch anywhere in `src/`. They parse into
  segments and dot-paths like any other input and nothing decodes them further. **Never describe the
  v1 read or emit scope as "270/271" or "276/277" complete** - that claim was on the README and the
  docs site until `ASSETS-P8` corrected it.
  Why: `documentation/agent-notes.md#published-scope-the-270-and-276-gap`
- **Warning registry: 23 codes + 4 Tier-3 fatals.** Additions-only. **Derive the count rather than
  trusting this line** - the codes are exported as `ALL_WARNING_MESSAGES`, and the four fatals are
  enumerated under Engineering Guardrails below.
- **Profile system** (`defineProfile()`, `profiles` namespace) shipped Phase 9. **PHI commit-gate**
  armed (`pnpm phi-scan`).
- **Shipped-phase histories (Phases 1 through 9) are in `documentation/agent-notes.md`.** Read the
  phase section before changing a surface it built.

## v1 Scope Snapshot

HIPAA healthcare transaction sets at version **005010** (with errata hooks for `005010X279A1`, `005010X221A1`, etc.). **This is the v1 SCOPE declaration, not a list of what has SHIPPED** (see Status above: the 270 and 276 inquiry directions have no typed model on either side):

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
  **`scripts/attw.mjs`, not the bare CLI**: see the trap below, because the CLI reports a
  missing `dist/` as "does not contain types" and **exits 0**.
- **Node:** **>= 22** (CI matrix 22 + 24, via the reusable pipeline).
- **Package manager:** `pnpm@10`.
- **Lint/format:** **ESLint 10** + unified `typescript-eslint` (type-checked) via
  `@cosyte/eslint-config`; Prettier via `@cosyte/prettier-config`. Lint at `--max-warnings=0`.
- **Testing:** **Vitest 4** + v8 coverage (`@cosyte/vitest-config`), per-directory >= 90 gates
  (armed globally now; per-dir gates get listed in `vitest.config.ts` once parser code lands).
- **CI/CD:** thin callers of the reusable `cosyte/.github` workflows. Migrated in Phase E; the
  per-directory ≥90 coverage gate was first armed on `src/parser/`.
  `documentation/agent-notes.md#phase-e-shared-engineering-standard`
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
- **No em dashes (`U+2014`). Ever.** Founder directive, `knowledgebase/06-brand/voice-and-tone.md`. Gated by `pnpm check:no-emdash` (`scripts/check-no-emdash.sh`) and by `.github/workflows/no-emdash.yml`, which checks the tracked files **and your PR title, PR body, and commit messages**, because this repo squash-merges and those become the message that lands on `main`. The fix is never to re-encode the character: rewrite with a period, a colon, a comma, or parentheses.

## Traps

**Every one of these was paid for.** Each `###` names its relocated section in
`documentation/agent-notes.md`; the anchor is on the heading, and the full measurement, the sources,
and the refutation history are there. **Do not act on a line here without reading its section.**
**🩺 marks a trap where getting it wrong mis-states a clinical or financial value on the wire.**

### 🩺 `X12-QUANTITY-SILENT-DEFAULTS` (2026-08-05) · `documentation/agent-notes.md#x12-quantity-silent-defaults-2026-08-05`

- **🩺 A PRESENT decimal that does not decode emits `X12_UNPARSEABLE_DECIMAL` at its
  `position.elementIndex`, in all six readers. An ABSENT one emits nothing** - the warning's value
  is that it is rare, and warning on absent would fire on nearly every real 835. Both pinned.
- **🩺 The model is UNCHANGED and that is the residual. Never write "an unparseable amount can no
  longer read as zero".** It can; it can no longer do so _silently_. Closing it means
  `X12Decimal | undefined` on every monetary slot: breaking, its own slice.
- **The warning is a property of the READ, not the USE**, so no control flow changed. The
  `CAS` / `PLB` skip still tests `amount === undefined`; a tri-state skip would mint a 0-amount
  adjustment row out of unparseable bytes.
- **ONE message, NO discriminant - a mid-build correction.** A `ZERO` / `NOT_DECODED` discriminant
  was measurably wrong at 835 `CAS`, 835 `PLB`, 837 `CAS`, which read with `elementDecimal` then
  `?? X12Decimal.ZERO`. State only what holds at every site.
- **The 835 balance invariant is NOT a net here: it names an equation, never an element, and exists
  in no other reader.** 7 of 9 base probes were wholly silent, 835 `SVC-05` among them.
- **The sink is an OPTIONAL 4th arg, so the public helpers stay silent without one.** The library's
  own silence is held by a source scan counting TOP-LEVEL ARGUMENTS, never a `, sink)` regex: the
  binding is named by its caller. Negative controls both ways, plus vacuity.
- **A green suite proved nothing: no fixture holds an unparseable decimal and a round trip CANNOT
  make one** (the builders refuse to emit it). Only bytes can.

### 🩺 `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (2026-08-04) · `documentation/agent-notes.md#x12-svc-element-map-off-by-one-2026-08-04`

- **🩺 The 835 SVC map is `revenueCode` -> SVC-04, `paidUnitsOfService` -> SVC-05,
  `originalUnitsOfService` -> SVC-07. Never move them back.** SVC-04 is the NUBC revenue code
  (element 234, a **string**); SVC-05 is Units of Service **PAID** Count (element 380, a
  **Quantity**); SVC-07 is **ORIGINAL** Units of Service Count (element 380). The old comment
  asserting "revenue code is SVC-05 in X221A1; SVC-04 unused" was wrong in both directions.
- **Never fix a mis-read position while leaving its sibling element unread.** Fixing only the two
  positions would have left SVC-07 unread and unwritten, converting a mis-read into a **fresh silent
  drop**. **Retention is non-decreasing, on purpose.**
- **🩺 A round trip cannot test an element map; only bytes can.** The suite stayed green through the
  fix: `transactions-remit-835-build.test.ts:532-560` is a `build835` -> `get835` round trip and is
  green for ANY pair of positions the two modules agree on, including a wrong one. The map is pinned
  literally in `test/transactions-remit-835-svc-element-map.test.ts` (11 red at `e3cdf49`, 11 green
  at head). **Never weaken those to round trips.**
- **🩺 Checking a spec claim against this repo's own implementation is NOT a check** - it only proves
  the two agree, which is exactly how the wrong map survived. Ground an element number in a source
  **outside** the repo (pyx12's `835.5010.X221.A1.xml`, X12 RFI #2163, the base 005010 element
  dictionary, published payer companion guides; all linked in `KNOWN-LIMITATIONS.md`). Agreement with
  the 277 was corroborating, not a source. **TR3 005010X221A1 is paid for and nobody here has read it.**
- **Never default an absent SVC-05 to one.** X221A1 is _reported_ to assume one (secondhand, from an
  RFI Description, not a clause read from the TR3). Fabricating a count the sender did not send is
  inventing.
- **`undefined` still means "not decoded", not "absent"** - but the unparseable case now warns and
  the absent case does not, which is what tells them apart (next trap).
- **The 277's SVC-07 is still not decoded and is usage R in X212**, so an **X212** 277 this library
  emits with a service line is short a required element. `PRE-EXISTING`, filed not fixed. **Do not
  widen it:** in **X214** the same element is usage `S`, so `build277CA` is unaffected.
- **🩺 835s this library emitted at `0.0.9` or earlier are non-conformant and should be re-emitted** -
  their revenue code sits in SVC-05, so head reads it back as a paid quantity (`0300` -> 300 units)
  with no warning.

### 🩺 `X12-DECIMAL-BYPASSES-THE-GUARD` (2026-08-04) · `documentation/agent-notes.md#x12-decimal-bypasses-the-guard-2026-08-04`

- **Every `X12Decimal` slot emits through the builder's `escDec` over `requireCallerDecimal`.** A raw
  `number` in an `X12Decimal` slot used to reach `esc` already stringified by `value.toString()`, so
  the caller guard never applied and `0.1+0.2`, `1e21` and `NaN` went out on the wire.
- **🩺 Refuse, never round. That is the decision.** `0.30` guesses cents, `0.3` guesses tenths, and
  guessing the scale of money is what `X12Decimal` exists to prevent.
- **Do not flatten this with `#60`.** `#60` existed because a required identifier VANISHED. Nothing
  vanishes here and nothing is mis-_read_; the exposure is float noise on the wire.
- **Type safety is structural; DELIMITER safety is per-slot. Never write the unqualified form.**
  `requireCallerSegment` type-checks every element of every segment emitted **through a builder's
  `seg`/`joinSeg` helper**. A `string` carrying an active delimiter in a slot that skipped `esc` is
  still emitted verbatim.
- **The raw slots that were routed through `esc`, and are therefore delimiter-safe and type-checked
  but NOT value-constrained:** `build999`'s GS-06/GE-02, ST-02/SE-02, AK9-01, IK5-01 and GS-07;
  `groupDate`/`groupTime` (GS-04/GS-05) in **all seven** domain builders, not just the 999;
  `build278`'s **HL-03**; `build837`'s LX-01. Routing closed their delimiter hole (a `"1*BOGUS"` 999
  `groupControlNumber` used to shift GS-07/GS-08 by one and now reads `1?*BOGUS`). **Only the slots
  named here were routed.** **The residual delimiter injection is NOT stop-the-line: these fail at
  the receiver, they do not mint a wrong clinical value.** Do not escalate it as if they did.
- **`buildTA1` uses NEITHER `seg` NOR `joinSeg`** - it joins its five caller-supplied elements
  directly, no `esc`, no `pad`. TA1-01 is data element I12, the reassociation key back to the
  acknowledged interchange. **This was the FOURTH iteration of the completeness claim; do not write
  the unqualified form again.**
- **The fixed-width ISA line is joined directly and is outside BOTH guards.** `pad(1, 15)` throws an
  untyped `TypeError`; `padControl(1, 9)` throws the misleading "exceeds the 9-char spec limit". Both
  terminate; neither is silent.
- **`build835`'s balance-equation amounts refuse UNTYPED, and every other `X12Decimal` field refuses
  TYPED.** `enforceBalance(spec)` runs BEFORE the escaper is built, so `requireCallerDecimal` is
  unreachable on anything it reads.
- **🩺 STATE THE RULE, AND NAME SPEC FIELDS - NEVER ELEMENT NUMBERS.** A slot refuses untyped exactly
  when the balance guard reads it as a term of one of the three §1.10.2 invariants (line, claim,
  top-of-remit) in `src/transactions/remit/balance.ts`. **The terms, enumerated, because a count
  without its list cannot self-correct:** `payment.totalActualPayment`, `claim.totalChargeAmount`,
  `claim.totalPaymentAmount`, every `adjustments[].amount` at claim and line level,
  `serviceLine.chargeAmount`, `serviceLine.paymentAmount`, `providerAdjustments[].amount`. Every
  other `X12Decimal` field refuses typed. Two successive remedies published a closed list and an
  element-number list and both were measured wrong; the second was wrong because it graded the prose
  against this repo's code. Field names cannot drift that way. Both arms are pinned on one fixture,
  so moving a slot between them reds the gate.
- **Assert the MESSAGE, not the class, in every builder-refusal test** - including the disclosure
  pins. `expect(run).toThrow(Remit835BuildError)` passes on an unrelated refusal; four of six new
  cases were vacuous that way.
- **Never bound a loop with `i < parts.length` over a caller array-like.** A forged
  `{ length: undefined }` runs **zero** iterations and reports every segment clean. Iterate with
  `for...of`, which throws. **The scanner is not comment-stripped for that rule**, so writing the bad
  shape in a comment reds it too.
- **Pinned counts:** `esc` **406** invocations on **377** lines; same-line `esc(x.toString())` is
  **5**, and those five are the `escDec` declarations. `build-837` also declares `decStr` (`escDec`
  without the escape) because HI's components go through `ctx.comp`, which maps `esc`, and escaping
  there would double-release.
- **"X12 code source 715" is wrong.** 715 is the _data element_ number and its values are a code
  **list**; `src/transactions/ack/codes.ts` had it right all along.

### 🩺 `X12-NUMERIC-VALUE-EMITS-EMPTY` (2026-08-03) · `documentation/agent-notes.md#x12-numeric-value-emits-empty-2026-08-03`

- **🩺 All nine builders take `esc` from `makeCallerEscaper` (`src/builder/caller-string.ts`), which
  type-checks first and refuses with the calling module's own typed, code-tagged error.**
  `escapeRelease` read `value.length`, `undefined` on a number, so the value vanished with no warning
  and no error - including `CLP-01`, the reassociation key back to the 837's `CLM-01`.
- **🩺 Refuse, never coerce, and that is the whole item.** Coercion mints a _different_ identifier: a
  payload carrying `"0012345"` as a number already lost its leading zeros, and reassociating to the
  wrong claim is worse than failing to reassociate.
- **The builder's own required-field guard is defeated by a number.** `build-835.ts` refuses
  `patientControlNumber === ""` by name; a number is not `""`, so it passed and became `""` one line
  later. Check the type, not the sentinel.
- **The `#51` asymmetry is deliberate, not an inconsistency.** `renderCallerValue` **coerces**;
  `esc` **refuses**. _Survive anything_ vs _invent nothing_. Opposite duties, opposite answers.
- **🩺 NEVER PUBLISH AN EXHAUSTIVE CENSUS OF WHAT BYPASSES THE CHOKEPOINT.** Three drafts did; a
  refuter measured all three false, each time by finding one more. The remedy on round three was to
  **cut the claim back, not grow the census**. **If you find one more, that is expected and is not a
  new finding. No total is published, on purpose.**
- **A gate that asserts a same-line REGEX pins against drift and says nothing about the property.**
  `build-837` alone has three off-line `.toString()` reads the regex misses.
- **Public surface:** exported `escapeRelease` now **throws `TypeError`** on a non-string instead of
  returning `""`. Nothing in the library can reach it, because the builders refuse first.
- **"No working caller is broken" was too absolute:** a boxed `new String(...)` built at base and is
  refused at head.

### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` (2026-08-03) · `documentation/agent-notes.md#parser-testtimeout-asserts-an-idle-box-2026-08-03`

- **No timeout value changed, and that is the finding, not an omission.**
- **Count BOTH trees, and never reuse one census for the other.** A first draft published the head
  census ported onto the base state in five places - the exact "a remedy's prose does not port with
  its code" trap, committed while quoting the rule.
- **Re-derive this box's capacity; never inherit a figure.** The item's 2.0-CPU / `nproc` 56 numbers
  are stale.
- **Interleave BASE/HEAD runs, two rounds each.** The first attempt compared runs an hour apart and
  showed a 2.4x win that was mostly the box getting quieter.
- **The `tsx` -> `node` substitution is pinned as an EQUIVALENCE, not assumed** (same violator, same
  clean file, same exit code / stdout / stderr). Nothing else enforces erasable-only syntax and the
  Node 22.18 floor is unenforced. **Scope it:** the case drives `paths` mode only.
- **The global `testTimeout` stays at 10 s on purpose.** The 10 MB+ 834 stream sits AT it and is green
  only on its own 120 s per-test ceiling. **Do not upgrade the `10.0 s` reading into a proven
  crossing** - the reporter rounds. Raising the global hands the same leash to all 1,100-odd tests.
- **🩺 `testTimeout` is NOT the liveness net people assume.** An **infinite synchronous** loop gives
  **NO VERDICT AT ALL** and wedges the worker. A liveness regression here reads as an ABSENT verdict,
  not a red one, and no value of `testTimeout` changes that. The defence is the source scan in
  `test/builder-array-bounds.test.ts`.
- **`test/scripts/attw-gate.test.ts` is deliberately left alone.** Pinning the REAL binary is the
  point of that gate.

### 🩺 `PHI-SCAN-SYMLINK-BLIND-ON-BOTH-ROUTES` (2026-08-03) · `documentation/agent-notes.md#phi-scan-symlink-blind-on-both-routes-2026-08-03`

- **🩺 Both enumerating routes REFUSE a symlink (exit 2), naming every offender.** `walk()` used
  `Dirent.isFile()` (an **lstat** answer) so a link was neither file nor directory; `--staged` got the
  link's **target string** back from `git show` under mode `120000`. Both exited 0 over PHI.
- **Neither route FOLLOWS an ENTRY it enumerated.** Say ENTRY, not "anything": **a walk ROOT that is
  itself a link IS followed**, because `existsSync`/`readdirSync` both follow. That is a superset
  scan, not a blind one, and is left alone.
- **The staged filter is `--diff-filter=AMT`, and the route reads `--raw -z`, not `--name-only`.**
  `AM` **drops status `T`**: replacing a tracked regular file with a link is neither add nor modify,
  so the record died before any mode was read. The destination mode is the only thing separating a
  staged regular file from a link or a gitlink. Dropping the `T` reds exactly two tests.
- **🩺 A refusal NEVER reports the link target.** That is working-tree text that can itself carry PHI:
  measured, a staged link whose target NAME was a dashed-SSN shape exited 1 and printed that shape. A
  diagnostic ABOUT a PHI leak is itself a PHI surface, so the shape is described in prose, never
  exemplified.
- **Scope was narrowed, not widened.** `paths` mode is deliberately untouched because it was never
  blind (`readFileSync` follows a link). A gitlink already exited 2 at base and is **renamed, not
  newly caught**.
- **The enumerate-then-read race is deliberately deferred, and the reason is direction:** its remedy
  TOLERATES a failed read; this one NARROWS what the enumeration admits. x12 is unreachable through it
  today only by a **scope accident** (walk roots are `test/fixtures` and `src`, and this repo's own
  test mkdtemps under `os.tmpdir()`). **Any widening of a walk root reintroduces it verbatim.**
- **`R`/`C` rename/copy are still not enumerated by `--staged` at all**, and there is still no
  refuse-a-scan-that-observed-nothing rule. Renaming a fixture while substituting a real name returns
  zero rows for both `AM` and `AMT`. **All-mode is the backstop**, so the gap is at pre-commit, not
  in CI.

### 🩺 `X12-CALLER-VALUE-RESIDUALS` (2026-08-02) · `documentation/agent-notes.md#x12-caller-value-residuals-2026-08-02`

- **All twenty-three caller-value holes across twelve `src/profiles/validate.ts` refusal sites route
  through `renderCallerValue` or `renderCallerJson`.** Worst message at base measured **360,181**
  characters; head measures **431**.
- **`renderCallerJson` keeps `JSON.stringify` and bounds its OUTPUT**, because the value's TYPE is
  what is wrong at those sites (`null` and `"null"` are different mistakes). It never throws
  (circular, `BigInt`, hostile `toJSON`) and fabricates no closing quote.
- **`X12ProfileError.profileName` is deliberately NOT bounded**, asserted as a test: truncating it
  would stop it matching what the consumer passed.
- **🩺 Every indexed loop bound in a builder comes from a `requireCallerArray` binding.** A forged
  `{ length: "9".repeat(120000) }` coerces to `Infinity` and the builder **spins forever instead of
  refusing** - 16 of 19 probes HUNG at base. 32 indexed loops across 7 builder modules.
- **`requireCallerArray` takes the module's own `refuse` callback, never a shared throw**, because
  each builder owns a distinct error class and code consumers branch on.
- **`requireCallerArray` answers `null` as ABSENT.** Every site it replaced read `x.dates ?? []`, and
  `??` treats `null` and `undefined` alike; guarding only `undefined` turned a valid 834 into a
  refusal. `null` is what a `JSON.parse`d payload carries for an absent list.
- **`build835`'s `claims` is the measured exception** to the required-array upgrade, because
  `enforceBalance` reads `spec.claims.map` rather than the checked binding. Pinned by a test.
- **Scope the claim: a forged non-array is availability, not `STOP-THE-LINE`.** Nothing decodes a
  document differently. Unreachable from TypeScript, reachable from JavaScript / JSON / `@cosyte/cli`.
- **`for...of` sites throw `TypeError: ... is not iterable` with NO `code`** (`buildInterchange`'s
  `spec.groups`, `build999`'s `transactionResponses`, every optional leaf array). Disclosed, pinned,
  in `KNOWN-LIMITATIONS.md`.
- **`test/builder-array-bounds.test.ts` keys on the OPERAND, never on the property NAME** - that is
  the mistake `#51`'s allowlist made twice. Its scan strips comments first.
- **🩺 The negative control found something worse than a red: removing a `requireCallerArray` call
  WEDGES the test rather than failing it.** A synchronous infinite loop never yields, so `testTimeout`
  cannot interrupt it. **That is the argument for keeping the source scan exhaustive rather than
  trusting the examples.**
- **Drive the shipped table, not a side probe.** A draft published 240,092 (the `sourceCategory`
  site) as the maximum; the filed 120,093 never reproduced at all.
- **431 is a measurement at a 120,000-character value, not a maximum** - the ` (N characters)` suffix
  widens with the decimal width. That site's derived ceiling is **443**; the suite asserts every site
  under 500.
- **The `QUIRK_ID_RE` comment claimed a bound the pattern never had.** Corrected the comment to the
  code, not the grammar to the comment.
- **Known and NOT claimed away:** bounding a message here **redacts nothing** (the caller passed the
  value in), the surviving characters are **not escaped**, the bound is on UTF-16 **code units, not
  bytes**, and both scans are syntactic tripwires for the shape this library uses, not proofs.
- **Scope gap, named not measured:** neither gate scans indexed loops outside the `build*` scope
  (`src/loops/define.ts`, `src/profiles/validate.ts`, the `get-*.ts` readers, `src/parser/envelope.ts`).

### `X12-BUILDER-BOUNDS` (2026-08-02) · `documentation/agent-notes.md#x12-builder-bounds-2026-08-02`

- **Every caller-supplied value in a `build*` refusal message goes through `renderCallerValue`**
  (`src/builder/caller-value.ts`), capping the rendered **fragment** at
  `BUILD_REFUSAL_VALUE_MAX_RENDERED` = **90**. All three names are public.
- **23 sites, 28 holes.** The census in the item was sixteen. Seven more were in `build999` and found
  only by adversarial review over two passes: four are `number`-typed AK9 counts (exactly why a census
  of string-typed slots missed them, and **a type is not a runtime guarantee**), three are `.length`
  reads on caller arrays.
- **State a ceiling as a ceiling and a measurement as a measurement.** 90 is the ceiling on the
  interpolated FRAGMENT; the message is the fragment plus the site's template text. Three published
  figures were wrong in the first draft, in the same run that was told to re-derive them.
- **This is NOT `PHI-WARNING-MESSAGE-LEAK` on the emit side.** There the value was the DOCUMENT's, so
  bounding it was redaction; here the caller passed it in and still holds it. Escaping was considered
  and **deliberately not done**, so a refusal message is bounded but **not** guaranteed to be one log
  line.
- **The caller-vs-document dichotomy is NOT categorical.** TR3 005010X231A1 requires AK2-02 to be a
  verbatim copy of the acknowledged ST-02 and `buildTA1` echoes an inbound ISA-13, so on the ack path
  a DOCUMENT's control numbers reach a refusal by the standard's own design.
- **`test/builder-refusal-bounds.test.ts` must never allow `String(...)` or `String(<expr>.length)`.**
  Its first allowlist admitted any `String(...)` (which is how the four AK9 counts passed clean); its
  second admitted `String(x.length)` by inspecting the property NAME and not the operand, so a forged
  `{length}` sailed through. What remains allowed is a single-letter loop index and the `width`
  literal only. **Negative controls run both ways.**
- **🩺 `segmentIndex: 0` is NOT a neutral sentinel: `tx.segments[0]` is the `ST`.** The remit-total
  balance warning now carries the BPR's own 1-based body index. `balance.ts` had documented the old
  `0` as deliberate, so that doc was corrected with the code.
- **The build-side `segmentIndex: 0` was filed as the same defect and is not one.** The builder has no
  parsed segment stream to index into and consumes only `.message`. The position is **inert by
  construction**, not merely unused; it is now `UNANCHORED_BUILD_POSITION`. Fabricating a plausible
  index would have named a segment no consumer can resolve.
- **`renderCallerValue` coerces and never throws.** A first draft read `.length` where the base
  interpolated into a template literal, turning a typed refusal into an uncaught `TypeError` with no
  `code` for any JS/JSON caller.
- **Assert SE-01 outright rather than trusting it** - a tripwire this repo has hit three times.

### 🩺 `X12-ORPHAN-REEMIT` (2026-08-02) · `documentation/agent-notes.md#x12-orphan-reemit-2026-08-02`

- **🩺 `serializeX12` places every orphan by `X12OrphanSegment.anchor` and NEVER by `segmentIndex`.**
  The fix is the anchor, not the re-emission. An anchor names a SLOT of the typed tree
  (`interchange` / `group` / `transaction`), so it survives both reorderings the emit performs (the
  `ta1Segments` hoist, the skipped zero-length segment); a raw input index cannot.
- **An index equal to the eventual length means "after the last one"; `segmentOffset` is never `0`
  because `rawSegments[0]` is the `ST`; the `transaction` kind is reachable only by a `TA1`**, since
  anything else arriving inside an open `ST..SE` is body content.
- **🩺 SE-01 must count the BYTES THE SERIALIZER WRITES, not the model rows** (X12.6: "segments
  included in the transaction set, including ST and SE"). Pass 1 counted only `tx.rawSegments`, so
  spec-clean mode **rewrote a CORRECT `SE*4*` down to `SE*3*`**. `segCount` now adds every orphan
  flushed between the `ST` and the `SE`. GE-01 and IEA-01 are unaffected: an orphan is never a `GS`.
- **The canonical not-reproduced list is SIX and silent constructs are FIVE.** `KNOWN-LIMITATIONS.md`
  holds it.
- **Case 6 (the empty-first-element segment `*A*B~` outside a transaction) is deliberately NOT in
  scope.** It is skipped by the walker, so there is nothing on the model to re-emit; closing it is a
  RETENTION change to the `name.length > 0` guard and would mint `X12_UNEXPECTED_SEGMENT` warnings
  where there are none today.
- **Retention and placement are still not PROMOTION:** no `get*` reader sees an orphan, and a `TA1`
  inside a group still does not join `ta1Segments`.
- **State the four kept regression assertions at the MODEL level, not the byte level.** A
  `ta1-inside-group` orphan IS written back between the `ST` and the `SE`, so "never lands inside a
  transaction" would be simply false.

### 🩺 `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` (2026-08-02) · `documentation/agent-notes.md#x12-segment-outside-transaction-dropped-2026-08-02`

- **🩺 A segment the envelope walker cannot place is RETAINED on `X12Interchange.orphanSegments`, not
  discarded.** It used to leave the model, leave the emit, and lose its warning on a re-parse. All
  orphans go through the single `recordOrphan` chokepoint so the warning and the retained segment can
  never disagree; `segmentIndex` is the documented join key back to `position.segmentIndex`.
- **🩺 Line-break tolerance is 15 of 15 CR/LF sequences of length 0 to 3.** It was exactly one
  optional CR then one optional LF, which admitted 4 of 15, so a uniformly **double-spaced file lost
  its ENTIRE interchange body** and returned `groups: []`.
- **🩺 NEVER replay an orphan at its recorded `segmentIndex`. Read the refutation before touching the
  emit again.** `segmentIndex` indexes the INPUT stream and the emit is not in input order, so replay
  splices the orphan into whatever occupies that slot: measured, a stray `ZZ` landed INSIDE an 835's
  `ST..SE` body with **no warning at all**, a stray `SE` closed the transaction early and corrupted
  SE-01, and with a doubled terminator ahead of it the orphan crossed the IEA. Trading a warned
  omission for silent structural corruption is the wrong direction under this repo's own invariant.
  **The defect is in the ADDRESSING SCHEME and comes straight back if anyone reaches for
  `segmentIndex`.**
- **A segment with an empty first element, outside a transaction, is dropped with NO warning at all** -
  the only construct on the list with no diagnostic whatsoever. Inside an open transaction the same
  segment round-trips normally.
- **Neither a doubled terminator nor a segment with an empty first element is recorded.**
- **The five `X12_UNEXPECTED_SEGMENT` messages were corrected** - they said the segment was not
  retained, which is now false. Registry unchanged at 22 + 4 fatals; nothing became fatal.

### 🩺 `PHI-WARNING-MESSAGE-LEAK` (2026-07-31) · `documentation/agent-notes.md#phi-warning-message-leak-2026-07-31`

- **🩺 NO warning factory takes a value parameter.** Each takes an `X12Position` plus, where one code
  covers several situations, a library-owned discriminant (`CONTROL_NUMBER_PAIRS` /
  `UNEXPECTED_SEGMENT_CONTEXTS` / `BALANCE_INVARIANTS` / `REQUIRED_LOOPS`), and `message` is a lookup
  into a frozen table exported as `ALL_WARNING_MESSAGES`.
- **🩺 Shape-validate-then-echo CANNOT hold for a control number**, whose grammar is whatever the
  trading partner sent. `X12_CONTROL_NUMBER_MISMATCH` rendered both sides verbatim and unbounded on
  all six ISA-13 / IEA-02 / GS-06 / GE-02 / ST-02 / SE-02 slots.
- **`snippet` stays on the four Tier-3 fatals and nowhere else** - a strict-mode escalation used to
  carry 64 bytes of the interchange.
- **`X12Segment.id` is bounded to the X12 segment-id grammar with a `NON_SPEC_SEGMENT_ID` sentinel.**
  It was an unbounded copy of the segment's first element. This is the `hl7`-to-`deid` layering lesson.
- **The deliverable is the slot table, not the fix.** `test/_helpers/phi-slots.ts` declares **81
  consumer-controlled slots**, driven by `assertNoDiagnosticPhiLeak` from `@cosyte/test-utils@0.0.2`.
  Measured one slot at a time against base: **13 of 81 red**, and **the 68 green ones are the point of
  writing the table before the fix.** Registry membership is asserted separately, so a factory that
  starts interpolating again fails without anyone extending the table.
- **`^0.0.1` resolves EXACTLY on npm for a `0.0.x`.** The `@cosyte/test-utils` pin had to move.
- **The shipped disclosure was wrong in five places** (README, `docs-content/troubleshooting.md`,
  `spec-notes-tolerance.md`, `cookbook.md`, `KNOWN-LIMITATIONS.md`): it called messages PHI-free by
  construction and told consumers to log the whole `.warnings` array, naming `.snippet` (**not a
  field on a warning**) as the exception. **Correct the disclosure in the same commit as the fix that
  makes the new wording true.**

### 🩺 Per-transaction invariants that shipped with the phases

Full detail in the phase sections of `documentation/agent-notes.md` (`#phase-9-profiles-and-quirk-attribution` through `#phase-1-envelope-decoder`).

- **🩺 v1 profiles are DESCRIPTIVE: a profile NEVER alters the parse.** `groups`, `warnings` and `isa`
  are byte-identical with and without one (asserted by a divergence test); it attaches attribution to
  `ix.profile` and powers the one behavioural hook, `partitionWarnings`.
  `documentation/agent-notes.md#phase-9-profiles-and-quirk-attribution`
- **🩺 HARD RULE, LOCKED: a profile quirk with no Tier-2 fixture demonstrating the deviation is
  FORBIDDEN. No invented quirks.** Enforced three ways: `fixture` is required at the type level,
  `defineProfile()` rejects a missing or ill-formed fixture path, and the accuracy suite's per-quirk
  DEMONSTRATOR registry asserts the cited fixture actually exhibits its claimed deviation - so a
  real-but-irrelevant fixture cannot slip past. A generic Medicare-FFS profile was DEFERRED rather
  than invented. Built-ins reach consumers only through the `profiles` namespace, never the top-level
  export. `documentation/agent-notes.md#phase-9-profiles-and-quirk-attribution`
- **The profile API DIVERGES from `hl7` by design, and the divergences are conscious, not drift.**
  `describe()` returns a structured `X12ProfileDescription` bucketed by effect
  (`relaxes` / `adds` / `requires`), **deliberately DATA and not hl7's formatted string**; the input
  type is `X12ProfileSpec`; and `partitionWarnings` is x12-only. Driven by x12's lossless-lenient
  reality. **"Symmetry is a feature" does not license collapsing these back onto hl7's shapes.**
  `documentation/agent-notes.md#phase-9-profiles-and-quirk-attribution`
- **🩺 The 820 carries no TR3 balance equation.** `build820` emits all monetary amounts VERBATIM and
  NEVER raises a balance-mismatch refusal - a deliberate contrast with `build835`.
  `documentation/agent-notes.md#phase-8f-build820-and-build834`
- **🩺 Maintenance type is the 834's safety primitive: emit verbatim, refuse the unknown.** The
  builder places the caller's INS-03 / HD-01 code (X12 code source 875) into the segment VERBATIM and
  NEVER infers or normalizes it. Where the lenient read side only WARNS
  (`X12_834_UNKNOWN_MAINTENANCE_TYPE` on the affected member only), the builder REFUSES to emit an
  action it cannot name. On the read side the code is preserved verbatim and the warning is scoped to
  the affected member only, so one unknown code never invalidates the roster.
  `documentation/agent-notes.md#phase-8f-build820-and-build834` and
  `#phase-7-278-834-820-readers`
- **🩺 The 278 certification decision is response-only and never inferred.** `build278Response` places
  HCR-01 VERBATIM and never normalizes or **upgrades** it; `build278Request` REFUSES a review carrying
  a decision. `documentation/agent-notes.md#phase-8e-build278request-and-build278response`
- **🩺 TRN echo is the safety-critical reassociation invariant.** A 271 echoes the 270's TRN-02 onto
  its subscriber / dependent, a 277 echoes the 276's onto its claim; the builders place the caller's
  trace into TRN-02 verbatim and NEVER fabricate, normalize, or mutate it. Locked by round-trip
  property tests on both sides. `documentation/agent-notes.md#phase-8d-build271-build277-build277ca`
  and `#phase-6-271-277-277ca-readers`
- **🩺 The HL spine is computed, never caller-supplied. Base stated this per builder and never as a
  blanket - keep it that way.** `build837P/I/D` OWNS the 837's safety primitive
  (`20 -> 22 -> 23`); `build271` (`20 -> 21 -> 22 -> 23`), `build277` / `build277CA`
  (`20 -> 21 -> 19 -> 22 -> 23`) and `build278Request` / `build278Response`
  (`20 -> 21 -> 22 -> 23 -> EV/SS`) own theirs. All four compute HL-01, HL-02 and HL-04 from the
  nested input tree and take HL-03 from a module-level `HL_LEVEL` constant selected by tree position,
  at every level **except** the 278's EV/SS review level. Where the builder owns the field, a
  structurally inconsistent hierarchy is
  _unrepresentable_ and SE-01 is correct by construction. **There is no level field on
  `Build271Spec` or `Build277Spec` and none should be added** - that would destroy the guarantee, not
  close a gap. `documentation/agent-notes.md#phase-8c-build837p-build837i-build837d`,
  `#phase-8d-build271-build277-build277ca`, `#phase-8e-build278request-and-build278response`
- **🩺 The one exception is the 278's EV/SS REVIEW level, whose HL-03 is caller-supplied**
  (`review.levelCode`, typed `"EV" | "SS"`, defaulted to `EV`, routed through `esc` as a raw slot -
  it is on the raw-slot list above as `build278`'s HL-03). `esc` type-checks for `string` and escapes
  delimiters; **it does not constrain the value to `EV`/`SS`**. Combined with the read side's
  deliberate tolerance below, an out-of-enum level from a JS/JSON caller emits without refusal and
  the review, **including its HCR-01 certification decision, silently does not decode.**
  `PRE-EXISTING`, identical at base and head, filed not fixed. **Do not restate this as a property of
  `build278`'s HL-03 generally, and do not write "every builder that has one" over it** - the UMO,
  requester, subscriber and dependent levels are library constants like every other builder's.
  `documentation/agent-notes.md#x12-decimal-bypasses-the-guard-2026-08-04`
- **🩺 On the READ side the walker NEVER silently re-numbers a broken HL pointer** - it emits
  `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`. The 278 `EV` / `SS` levels are
  deliberately tolerant (omitted from the expected-parent map), which is why nothing on the read side
  catches the out-of-enum HL-03 named above.
  `documentation/agent-notes.md#phase-5-837-pid-reader` and `#phase-7-278-834-820-readers`
- **Emit the envelope INLINE, not via `buildInterchange`, in any domain builder that composes a
  composite element** (835, 837), so a pre-composed composite is never double-escaped. Composites
  escape each component then join with the RAW component separator.
  `documentation/agent-notes.md#phase-8b-build835`
- **`splitSegments` is release-aware via `findUnescapedTerminator`.** A naive `indexOf` split
  mid-value on a `?`-release-escaped terminator (`?~`). A degenerate terminator-is-release delimiter
  set falls back to the literal scan. `documentation/agent-notes.md#phase-8b-build835`
- **Control NUMBERS are identity and are NEVER rewritten**, even under `{ specClean: true }`;
  corrected COUNTS emit only with `{ recomputeCounts: true }`, which is inert without `specClean`.
  Every mismatch surfaces via `onWarning` and is never silently corrected.
  `documentation/agent-notes.md#phase-8-serializer-and-general-builder`
- **🩺 All monetary / percent / quantity fields decode as `X12Decimal`: string-backed, `BigInt`-exact,
  NEVER `parseFloat`.** `documentation/agent-notes.md#phase-4-835-era-reader`
- **🩺 The 835 model is NEVER silently rebalanced.** Three TR3 X221A1 §1.10.2 invariants (line, claim,
  top-of-remit) run after the walk and emit `X12_835_REMIT_BALANCE_MISMATCH`. **PLB amounts carry the
  RAW EDI sign (positive = take-back), so the top equation is `BPR-02 == Σ(CLP-04) - Σ(PLB)`.**
  `documentation/agent-notes.md#phase-4-835-era-reader`
- **🩺 An unknown code preserves its verbatim value and warns; it is never dropped or normalized** -
  `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC` / `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` /
  `X12_UNKNOWN_CLAIM_STATUS` / `X12_UNKNOWN_HI_QUALIFIER` (verbatim qualifier + code, with
  `codeSystem: "unknown"`) / `X12_837_UNKNOWN_VARIANT`.
  `documentation/agent-notes.md#phase-5-837-pid-reader`
- **🩺 Acks are structurally PHI-free by design, and `IK4-04` (`copyOfBadDataElement`) is a
  caller-supplied surface callers SHOULD omit when the bytes are PHI. The library NEVER
  auto-populates it.** `documentation/agent-notes.md#phase-3-999-and-ta1-acknowledgments`
- **`build999` REFUSES `Accept` against a non-empty error list (`X12_ACK_ACCEPT_WITH_ERRORS`) and
  inconsistent AK9 counts (`X12_ACK_COUNT_MISMATCH`); `buildTA1` REFUSES `A` with a non-`000` note
  (`X12_TA1_ACCEPT_WITH_NOTE`).** `documentation/agent-notes.md#phase-3-999-and-ta1-acknowledgments`
- **🩺 Every DOMAIN builder's own refusal message carries structural locators, counts and numeric
  totals only** - never a `claimId` (patient-account number), member id, member name, trace, or
  diagnosis code. `build834` additionally names the offending maintenance code, which is an X12
  control code and never PHI. **State this per builder, as base did, and never as a property of every
  builder.** Two standing exceptions: the **ack path**, where `build999` interpolates the
  acknowledged ST-02 (AK2-02, verbatim by TR3 005010X231A1) and `buildTA1` its TA1-05 note code (see
  "the caller-vs-document dichotomy is NOT categorical" above); and the **shared segment guard**,
  where `requireCallerSegment` echoes a non-string primitive it refuses, so a `JSON.parse`d spec with
  a NUMERIC `claimId` or member id puts that identifier in the message
  (`build835: CLP-01 must be a string, but received a number (…)`) - bounded to 90, not redacted.
  `PRE-EXISTING`, identical at base and head, filed not fixed. **The negative list is not an absolute
  PHI guarantee; it is a guarantee about the builder's own templates.**
  `documentation/agent-notes.md#phase-8c-build837p-build837i-build837d`,
  `#phase-8b-build835`, `#phase-8d-build271-build277-build277ca`,
  `#phase-8e-build278request-and-build278response`, `#phase-8f-build820-and-build834`
- **The `?`-release escape is honored losslessly** (`?~`->`~`, `?*`->`*`, `??`->`?`); dot-path
  traversal walks elements, composites (`-N`, 1-indexed) and repetitions (`[N]`, 0-indexed).
  `documentation/agent-notes.md#phase-2-syntactic-core`
- **Known read-side limitations, documented not accidental:** claim-/line-level provider addresses
  (837 Loop 2310 / 2420 N3/N4) do not round-trip, though the NM1 fields do; and the 837's Loop 2320
  other-subscriber / other-payer is captured at the SURFACE level only, with the detailed CAS / OI /
  MOA inside 2320 deferred. `get834Enrollments` streams one member per `INS` loop, but **the file is
  still parsed into `tx.segments` up front** - an honest v1 limitation, not a streaming parser.
  `documentation/agent-notes.md#phase-8c-build837p-build837i-build837d`,
  `#phase-5-837-pid-reader`, `#phase-7-278-834-820-readers`

### 🩺 PHI commit-gate · `documentation/agent-notes.md#phi-commit-gate-armed-2026-06-28`

- **`scripts/phi-scan.ts` (`pnpm phi-scan`) refuses fixtures and `src/` carrying real-PHI-shaped
  tokens**: NM1 person names + SSN qualifier `34`, MI member-id / XX NPI shapes, DMG dates of birth,
  pre-2024 DTP/DTM/BHT/GS dates, dashed SSN / `REF*SY` / non-test email.
- **X12 is byte-strict, so synthetic tokens are positively declared in
  `scripts/phi-allow-list.txt`**, never with an inline header (same model as DICOM's binary `.dcm`).
- **A whole-file bypass needs `--allow-fixture` AND an audit entry in `phi-scan-overrides.md`.**
  Runs at pre-commit (`simple-git-hooks --staged`) and in CI (`run-phi-scan: true`).

### `ASSETS-P8`: the `attw` gate lies · `documentation/agent-notes.md#assets-p8-the-attw-wrapper`

- **🩺 `attw` prints "does not contain types" and EXITS 0, so the `attw` script is `scripts/attw.mjs`,
  a wrapper, NEVER the bare CLI.** `getExitCode.js` in `@arethetypeswrong/cli` 0.18.4 opens with
  `if (!analysis.types) return 0` and the problem list is never consulted. For a package that ships
  types it means the declarations were **not in the tarball**: a broken publish reported as a pass.
- **`scripts/verify.sh` needs no change; do not touch it.** It propagates the step's status
  faithfully. The step is what lies to it.
- **The timing supplies the condition; the exit code is the defect.** `tsup` emits JS in one pass and
  declarations in a later one, so **every** build has an interval where `dist/` holds `.mjs`/`.cjs`
  and no `.d.ts` (**1.92 s measured on this package**). **Re-measure per repo; do not carry a
  sibling's figure over.** The answer is **not** a lock, a lease or a build queue (ADR 0015): the
  gate has to be able to say its own inputs were missing, whatever removed them.
- **Keep BOTH nets in `scripts/attw.mjs`; they catch different things.** The **preflight** checks
  every relative path `package.json` promises exists and is non-empty, which catches the build
  interval and NAMES the missing file. The **post-check** on the untyped sentence catches what the
  preflight structurally cannot: declarations on disk but excluded from the tarball by
  `files`/`.npmignore`. No instance of that second case has occurred in this repo yet.
- **The post-check reads a string, so anything that could hide that string is REFUSED by option name,
  wholesale, not by value:** `--quiet`, `--format json`, a `.attw.json` setting, `--config-path`.
  All four were measured against this repo's own binary handing back exit 0 with the sentence absent.
  `--config-path` at a **nonexistent** path blinds nothing (`readConfig()` swallows the `ENOENT`), so
  the test uses the real-file form.
- **`test/scripts/attw-gate.test.ts` pins the upstream exit-0 itself**, so an `attw` upgrade that
  rewords the sentence or fixes the exit code reds the suite instead of letting the net go quietly
  slack. It also pins a negative control on a well-formed package and that a real `attw` failure still
  fails. 11 of its 13 cases go red with `scripts/attw.mjs` removed.
- **The port is NOT finished org-wide, including `config/scripts/parser-template/`, which
  `scaffold-parser.mjs` mints new parsers from** - a port that skips the template leaves the defect
  being re-minted. Derive the current set rather than trusting a count:
  `/usr/bin/grep -rl '"attw":' --include=package.json --exclude-dir=node_modules /workspace`.

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

**A fourth, added by `CLAUDE-MD-AUDIT`:** when an incident, a refutation, or a shipped phase produces
narrative, it goes in **`documentation/agent-notes.md`** and only its imperative comes back here.
The umbrella hook's ratchet is a ceiling, not a target; `hl7`, the reference parser this package
mirrors, is 8 KB. **Relocate, never delete: a trap deleted to hit a number is the one failure mode
this audit exists to prevent.**

Build, lint, format, and TypeScript settings come from the shared `@cosyte/*` config packages
(`@cosyte/tsconfig` · `@cosyte/eslint-config` · `@cosyte/prettier-config`; see
`documentation/conventions.md` → "Canonical toolchain (enforced)"). Node ≥ 22.

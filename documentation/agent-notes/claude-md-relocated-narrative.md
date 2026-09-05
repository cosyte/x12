# x12 - narrative relocated out of `CLAUDE.md` (2026-08-07)

Relocated to pay for **three** owed trap blocks at once: `X12-PAY-TO-FUSION` and
`X12-837-SV-UNDEFINED-DECIMAL`, which two consecutive slices left unpaid because the file stood at
**52,907 of a 52,912-byte entry** with five bytes of room, and `X12-AMT-ADX-ABSENT-AMOUNT`, the
slice that did the relocating. **A debt like that compounds: with no room, the next defect found
cannot be recorded either**, which is why it was cleared before the new trap was written rather than
after.

It landed here rather than in `documentation/agent-notes.md` for a measured reason: **that file was
itself at 249,982 of a 250,000-byte budget**, so relocating into it would have moved the same problem
one level down and the hook refused the write. This is the same split
`documentation/agent-notes/x12-pay-to-fusion.md` and `.../x12-837-sv-undefined-decimal.md` already
use.

**The imperatives all stayed behind in `CLAUDE.md`.** What moved is prose that either restates the
meta-repo's own `documentation/conventions.md` or restates the README's pitch. **Nothing was deleted
and no trap was touched** - a trap deleted to hit a number is the one failure mode the bound exists
to prevent (meta-repo `documentation/decisions/0023-doc-budgets.md`). The umbrella owes the matching
ratchet drop: it lives in `.claude/hooks/doc-budget.mjs`, not in this repo, and it is **LOWERED on a
shrink, never raised to meet a trap**.

Verbatim, five pieces.

## 1. `## Project` - the identity paragraph and the north star

What stayed behind is a one-line identity plus the pointer to this file.

> **`@cosyte/x12`**: a developer-focused ASC X12 EDI parser + utility library for Node.js/TypeScript,
> published under the Cosyte brand. Open-source (MIT). The payer-side sibling of
> [`@cosyte/hl7`](../hl7): API shape, profile system, and lenient-parser philosophy are deliberately
> mirrored.
>
> **North star:** A developer can parse a real-world, vendor-quirky X12 healthcare interchange and
> pull useful fields out of it in one line, without having read the X12 standard or any TR3
> implementation guide.

## 2. `## Sibling Project`

Folded into the identity line that stayed behind, because it said the same thing twice.

> **`@cosyte/hl7`** lives at `../hl7` and ships a matching API shape for HL7 v2. When in doubt on an
> API decision, check how `@cosyte/hl7` solved it. Symmetry is a feature, not an accident.

## 3. The Postel's-Law guardrail, long form

The load-bearing halves stayed behind in `CLAUDE.md`: `serialize(parse(s)) === s` is NOT guaranteed,
"my file has no line breaks" is not sufficient to make it hold, `KNOWN-LIMITATIONS.md` is the
canonical list of what is not reproduced, `recomputeCounts` is inert without `specClean`, and nothing
is ever silently corrected.

> - Postel's Law: parser is liberal (lenient default + warnings with stable codes and positional
>   context); serializer is conservative. Be exact about what that means, because the README said it
>   loosely until ASSETS-P8: the domain builders emit spec-clean X12 by construction, but
>   `serializeX12` is **byte-faithful by default only for the segments the parser recorded on the
>   model**. `serialize(parse(s)) === s` is NOT guaranteed, and "my file has no line breaks" is not
>   sufficient to make it hold - `KNOWN-LIMITATIONS.md` holds the canonical list of what is not
>   reproduced, most of which needs no line break and is silent. `{ specClean: true }` reconciles the
>   envelope and warns; `{ specClean: true, recomputeCounts: true }` also emits the corrected counts.
>   `recomputeCounts` is inert without `specClean`. Nothing is ever silently corrected.

## 4. `## Standing disciplines (every change)`, disciplines 1 through 3

These are mirrored from the meta-repo's `documentation/conventions.md`, which is the source of truth
for them, so the copy here was always a duplicate. **The fourth discipline stayed behind** and is the
one this repo owns: an incident's narrative goes into `documentation/agent-notes*`, and only its
imperative goes back to `CLAUDE.md`.

> These three bind every change in this repo (mirrored from the cosyte meta-repo's
> `documentation/conventions.md`):
>
> 1. **Documentation follows code.** A public-surface / stack / status change isn't done until its
>    docs are: this package's own docs (`docs-content/` + JSDoc), and (in the meta-repo) its
>    `documentation/repos/<repo>.md` and the `ecosystem-map.md` status table.
> 2. **Version + changelog every meaningful change.** Add a Changeset (`pnpm changeset`, `patch`
>    during pre-alpha) and keep `CHANGELOG.md`'s `[Unreleased]` current. Stay on `0.0.x` until first
>    alpha.
> 3. **Crew + knowledgebase feedback loop.** When a standard, decision, or public surface changes,
>    flag whether a `crew` skill or `knowledgebase` doc needs creating/updating, never silently skip.

## 5. Per-transaction-invariant bullets, long form

These are traps, not narrative, so **the imperative of every one of them stayed in `CLAUDE.md`** and
only the surrounding explanation moved. No count of them is given here: this repo has been wrong
about a census five separate times and the sections below are the list. They are reproduced whole here so nothing is lost. Full
detail for all of them is still in the phase sections of `documentation/agent-notes.md`,
`#phase-9-profiles-and-quirk-attribution` through `#phase-1-envelope-decoder`.

### The three profile bullets

> - **🩺 v1 profiles are DESCRIPTIVE: a profile NEVER alters the parse.** `groups`, `warnings` and
>   `isa` are byte-identical with and without one (asserted by a divergence test); it attaches
>   attribution to `ix.profile` and powers the one behavioural hook, `partitionWarnings`.
> - **🩺 HARD RULE, LOCKED: a profile quirk with no Tier-2 fixture demonstrating the deviation is
>   FORBIDDEN. No invented quirks.** Enforced three ways: `fixture` is required at the type level,
>   `defineProfile()` rejects a missing or ill-formed fixture path, and the accuracy suite's
>   per-quirk DEMONSTRATOR registry asserts the cited fixture actually exhibits its claimed
>   deviation, so a real-but-irrelevant fixture cannot slip past. A generic Medicare-FFS profile was
>   DEFERRED rather than invented. Built-ins reach consumers only through the `profiles` namespace,
>   never the top-level export.
> - **The profile API DIVERGES from `hl7` by design, and the divergences are conscious, not drift**
>   (`describe()` returning DATA and not hl7's formatted string, `X12ProfileSpec`, the x12-only
>   `partitionWarnings`), driven by x12's lossless-lenient reality. **"Symmetry is a feature" does
>   not license collapsing these back onto hl7's shapes.**

### The HL spine, with the four level chains

The chains are the part that moved; the rule and the "no level field on `Build271Spec` or
`Build277Spec`" prohibition stayed behind.

> - **🩺 The HL spine is computed, never caller-supplied. Base stated this per builder and never as a
>   blanket - keep it that way.** `build837P/I/D` OWNS the 837's safety primitive
>   (`20 -> 22 -> 23`); `build271` (`20 -> 21 -> 22 -> 23`), `build277` / `build277CA`
>   (`20 -> 21 -> 19 -> 22 -> 23`) and `build278Request` / `build278Response`
>   (`20 -> 21 -> 22 -> 23 -> EV/SS`) own theirs. All four compute HL-01, HL-02 and HL-04 from the
>   nested input tree and take HL-03 from a module-level `HL_LEVEL` constant selected by tree
>   position, at every level **except** the 278's EV/SS review level. Where the builder owns the
>   field, a structurally inconsistent hierarchy is _unrepresentable_ and SE-01 is correct by
>   construction. **There is no level field on `Build271Spec` or `Build277Spec` and none should be
>   added** - that would destroy the guarantee, not close a gap.

### The 834 maintenance type

> - **🩺 Maintenance type is the 834's safety primitive: emit verbatim, refuse the unknown.** The
>   builder places the caller's INS-03 / HD-01 code (X12 code source 875) into the segment VERBATIM
>   and NEVER infers or normalizes it. Where the lenient read side only WARNS
>   (`X12_834_UNKNOWN_MAINTENANCE_TYPE` on the affected member only), the builder REFUSES to emit an
>   action it cannot name. On the read side the code is preserved verbatim and the warning is scoped
>   to the affected member only, so one unknown code never invalidates the roster.

### The caller guards, long form

The rule, the "never re-add a value" prohibition and both of the two things it does NOT say stayed
behind. What moved is the worked example and the locator detail.

> - **🩺 NO CALLER GUARD ECHOES WHAT A CALLER PUT IN AN ELEMENT** - string/segment/decimal and the
>   array guard's PRIMITIVE arm report the TYPE only. A `JSON.parse`d spec used to put a NUMERIC
>   `claimId` or member id in the message, bounded to 90, NOT redacted. **The old disclosure named
>   `requireCallerSegment`; `requireCallerString` fires for `CLP-01`, and both echoed. Never re-add a
>   value, never fold the decimal one back out. And state what this does NOT say, drafted false
>   once:** the array guard STILL renders a forged array-like's `length` and class tag
>   (SHAPE, not element contents). The segment guard's locator admits
>   `parts[0]` by the segment-id GRAMMAR, never by length.

### The domain-builder refusal message

The enumerated negative list moved; the rule, the "state it PER BUILDER" instruction, the ack-path
exception and the "guarantee about the TEMPLATES" qualifier all stayed behind.

> - **🩺 Every DOMAIN builder's own refusal message carries structural locators, counts and numeric
>   totals only** - never a `claimId` (patient-account number), member id, member name, trace, or
>   diagnosis code. `build834` additionally names the offending maintenance code, an X12 control code
>   and never PHI. **State this per builder, as base did, never as a property of every builder.** One
>   standing exception, the **ack path**: `build999` interpolates the acknowledged ST-02 (AK2-02,
>   verbatim by TR3 005010X231A1) and `buildTA1` its TA1-05 note code (see "the caller-vs-document
>   dichotomy is NOT categorical" above). **The negative list is NOT an absolute PHI guarantee; it is
>   a guarantee about the builder's own TEMPLATES**, which still render control numbers and control
>   codes.

## 6. Trap-bullet explanation relocated by `X12-STATED-AMOUNT-DISCARDED` (2026-08-07)

A second round of relocation, to fund that slice's trap block from a file that stood at **52,730 of a
52,730-byte entry with zero room**. **Every imperative stayed behind in `CLAUDE.md`.** What moved is
measurement and incident history that the trap line no longer needs in order to be actionable, and
that is already carried in `documentation/agent-notes.md` or `documentation/repos/x12.md` in the
meta-repo. **No trap was deleted and no bullet lost its instruction.** Eight pieces, verbatim.

### `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` - the three measured corruption shapes

The bullet still says NEVER replay an orphan at its recorded `segmentIndex`, still says to read the
refutation first, and still names the addressing scheme as the defect. What moved is what was
measured when the replay was tried:

> measured, a stray `ZZ` landed INSIDE an 835's `ST..SE` body with **no warning at all**, a stray
> `SE` closed the transaction early and corrupted SE-01, and with a doubled terminator ahead of it
> the orphan crossed the IEA. Trading a warned omission for silent structural corruption is the
> wrong direction under this repo's own invariant.

### `X12-BUILDER-BOUNDS` - the four holes, and the coercion regression

> four holes the item's census missed were `number`-typed AK9 counts, found only by adversarial
> review.

> A draft read `.length` where the base interpolated into a template literal, turning a typed
> refusal into an uncaught `TypeError`.

### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` - three trailing measurements

The imperatives (count both trees; never reuse one census for the other; interleave BASE/HEAD runs,
two rounds each; do not upgrade the `10.0 s` reading into a proven crossing) all stayed.

> Raising the global hands the same leash to all 1,100-odd tests.

> a draft ported the head census onto the base state while quoting the rule against it.

> the agent-notes section measures what runs an hour apart showed instead.

### `ASSETS-P8` - what else the gate test pins

> It also pins a negative control on a well-formed package and that a real `attw` failure still
> fails.

### Per-transaction invariants - how the TRN echo is held

> Locked by round-trip property tests on both sides.

### `X12-QUANTITY-SILENT-DEFAULTS` - two base measurements

> 7 of 9 base probes were wholly silent, 835 `SVC-05` among them.

> A draft said three, a refuter measured four.

### `X12-837-LOOP-RESIDUALS` and `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` - two fragments

> Red control on both.

> The suite stayed green through the fix:

### Pass-1 remedy round, four more fragments

The refuter's `INTRODUCED` major forced a wider trap bullet, and it was funded the same way rather
than by deleting anything. Verbatim:

> `hl7` measured two ported residuals as NOT OPEN at all.

> Opposite duties, opposite answers.

> derive its size there.

> a tripwire this repo has hit repeatedly.

## 7. Trap-bullet narrative relocated by `X12-837-AMBIGUOUS-VARIANT` (2026-08-08)

A third round, to fund that slice's trap block from a file that stood at **52,728 of a
52,728-byte entry with ZERO room** - the entry having been lowered to meet the shrink round 6
bought, exactly as the rule says it should be. **Every imperative stayed behind in `CLAUDE.md`**;
what moved is mechanism and incident history that the trap line does not need in order to be
actionable. **No trap was deleted.** The umbrella still owes the matching ratchet drop, which lives
in `.claude/hooks/doc-budget.mjs` and is outside this repo. Four pieces, verbatim.

### The `documentation/agent-notes*` preamble - the mechanism half

What stayed behind is the instruction: open the section a `###` heading names before acting on its
line; the newest sections are their own files under `documentation/agent-notes/`; never quote the
byte number, read `REPO_CLAUDE` in the hook; a new trap is PAID FOR BY RELOCATING FIRST and the
entry is LOWERED as the relocation lands, never raised; and **a trap deleted to hit a number is the
one failure mode this bound exists to prevent**. What moved is the account of how the bound came to
be split in two:

> Most are in [`documentation/agent-notes.md`](documentation/agent-notes.md); **that file is now on
> its own 250,000-byte budget too**, so the newest ones are their own files under
> `documentation/agent-notes/`. The bound and the per-repo ratchet are at
> `documentation/agent-notes.md#claude-md-audit-2026-08-04`. **Nothing was deleted - a trap deleted
> to hit a number is the one failure mode this bound exists to prevent.** This file is bounded at
> write time by the umbrella's `.claude/hooks/doc-budget.mjs`.

### `X12-BUILDER-BOUNDS` - why it is not the PHI leak, long form

The bullet still says this is NOT `PHI-WARNING-MESSAGE-LEAK`, still says escaping was deliberately
not done, and still says the caller-vs-document dichotomy is NOT categorical. What moved is the
reasoning and the two counterexamples:

> there the value was the DOCUMENT's so bounding it was redaction; here the caller passed it in and
> still holds it. Escaping was **deliberately not done**, so a refusal message is bounded but
> **not** one log line. **The caller-vs-document dichotomy is NOT categorical** - TR3 005010X231A1
> has AK2-02 copy the acknowledged ST-02, and `buildTA1` echoes an inbound ISA-13.

### `X12-CALLER-VALUE-RESIDUALS` - why `null` is ABSENT, long form

The bullet still says `requireCallerArray` answers `null` as ABSENT and still names `build835`'s
`claims` as the measured exception. What moved is why:

> Every site it replaced read `x.dates ?? []`, so guarding only `undefined` turned a valid 834 into
> a refusal. `null` is what a `JSON.parse`d payload carries for an absent list.
> (`enforceBalance` reads `spec.claims.map`, not the checked binding); pinned by a test.

### `X12-CALLER-VALUE-RESIDUALS` - the 431-character measurement

The bullet still says to drive the shipped table rather than a side probe, and still says every
figure here is a measurement rather than a maximum. What moved is the figures themselves, which go
stale and are carried in the agent-notes section anyway:

> **431 is a measurement at a 120,000-character value, not a maximum** (that site's derived ceiling
> is 443; every site is asserted under 500). **The `QUIRK_ID_RE` comment claimed a bound the pattern
> never had.** Corrected the comment to the code, not the grammar to the comment.

### `X12-DECIMAL-BYPASSES-THE-GUARD` - the enumerated list of raw slots routed through `esc`

The bullet still says the routed raw slots are delimiter-safe and type-checked, still says **only
these were routed**, and still says the residual delimiter injection is NOT stop-the-line. What
moved is the enumeration itself, which is a census of the shape this repo's own rule says to keep
out of `CLAUDE.md`:

> `build999`'s GS-06/GE-02, ST-02/SE-02, AK9-01, IK5-01 and GS-07; `groupDate`/`groupTime`
> (GS-04/GS-05) in **all seven** domain builders, not just the 999; `build278`'s **HL-03** (the one
> that IS, `EV`/`SS`); `build837`'s LX-01.

### `ASSETS-P8` - the build-interval mechanism, and the second net's zero instances

The two bullets still say to re-measure the interval per repo rather than carrying a sibling's
figure, still say the answer is NOT a lock, a lease or a build queue (ADR 0015), and still say to
keep BOTH nets in `scripts/attw.mjs`. What moved is the mechanism and one piece of history:

> `tsup` emits JS in one pass and declarations in a later one, so **every** build has an interval
> where `dist/` holds `.mjs`/`.cjs` and no `.d.ts` (**1.92 s measured on this package**).

> No instance of that second case has occurred in this repo yet.

### `PHI-WARNING-MESSAGE-LEAK` - the five wrong places

The bullet still says to correct the disclosure in the same commit as the fix that makes the new
wording true. What moved is the count, which is history:

> **The shipped disclosure was wrong in five places at once** (the five are listed in the
> agent-notes section).

### `X12-ORPHAN-REEMIT` - what the SE-01 undercount actually did

The bullet still says SE-01 must count the bytes the serializer writes rather than the model rows,
and still cites X12.6. What moved is the incident:

> Pass 1 counted only `tx.rawSegments`, so spec-clean mode **rewrote a CORRECT `SE*4*` down to
> `SE*3*`**.

### `X12-NUMERIC-VALUE-EMITS-EMPTY` - how the required-field guard was defeated

The bullet still says the builder's own required-field guard is defeated by a number, and still says
to check the TYPE rather than the sentinel. What moved is the instance:

> `build-835.ts` refused `patientControlNumber === ""` by name, and a number is not `""`, so it
> passed and became `""` one line later.

## 8. Trap-bullet narrative relocated by `X12-837-SV1-OVERWRITE` (2026-08-08)

A fourth round, to fund that slice's trap block from a file that stood at **52,723 of a
52,723-byte entry with ZERO room**, the entry having been lowered to meet round 7's shrink.
**Every imperative stayed behind in `CLAUDE.md`**; what moved is mechanism, enumeration and
incident history that the trap line does not need in order to be actionable. **No trap was
deleted.** The umbrella still owes the matching ratchet drop, which lives in
`.claude/hooks/doc-budget.mjs` and is outside this repo. **No count of the pieces and no NEW byte figure is
published here** - both drifted once already, and a drifting number is deleted rather than
corrected. The subsections below are the list; derive the size with `wc -c x12/CLAUDE.md`.

### `X12-DECIMAL-BYPASSES-THE-GUARD` - the §1.10.2 balance terms, enumerated

The bullet still says to state the rule and name spec fields rather than element numbers, still
says a slot refuses untyped exactly where the balance guard reads it as a term of one of the three
§1.10.2 invariants in `src/transactions/remit/balance.ts`, and still records that two successive
remedies published a closed list and an element-number list and both were measured wrong. **What
moved is the list itself, which is the thing that lets a wrong count self-correct - read it here,
never re-derive it:**

> `payment.totalActualPayment`, `claim.totalChargeAmount`, `claim.totalPaymentAmount`, every
> `adjustments[].amount` at claim and line level, `serviceLine.chargeAmount`,
> `serviceLine.paymentAmount`, `providerAdjustments[].amount`.

And the reason the second of those two remedies was wrong:

> the second because it graded the prose against this repo's code. Field names cannot drift that way.

### `X12-DECIMAL-BYPASSES-THE-GUARD` - the fixed-width ISA line's two throws

The bullet still says the ISA line is joined directly and sits outside BOTH guards, and still says
both throws terminate and neither is silent. What moved is which throws what:

> `pad(1, 15)` throws an untyped `TypeError`; `padControl(1, 9)` throws the misleading "exceeds the
> 9-char spec limit".

### `X12-DECIMAL-BYPASSES-THE-GUARD` - how a raw number bypassed the caller guard

The bullet still says every `X12Decimal` slot emits through the builder's `escDec` over
`requireCallerDecimal`. What moved is the mechanism and what it put on the wire:

> A raw `number` in an `X12Decimal` slot used to reach `esc` already stringified by
> `value.toString()`, so the caller guard never applied and `0.1+0.2`, `1e21` and `NaN` went out on
> the wire.

### `X12-DECIMAL-BYPASSES-THE-GUARD` - refuse, never round

The bullet still says refuse rather than round, and still says guessing the scale of money is what
`X12Decimal` exists to prevent. What moved is the illustration:

> `0.30` guesses cents, `0.3` guesses tenths.

### `X12-VARIANT-LOOKUP-PROTOTYPE` - what the prototype hole destroyed

The bullet still says `in` is not the safe form and to reach for `Object.hasOwn`, and still points
at the four further sites in the agent-notes section. What moved is the incident:

> **🩺 It destroyed strictly more than `#67`: an ST-03 of `constructor` made `variant` a FUNCTION,
> so EVERY Loop 2400 left the model with `warnings: []`.**

### `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` - what 4 of 15 line-break sequences cost

The bullet still states the tolerance as 15 of 15 CR/LF sequences of length 0 to 3. What moved is
the incident:

> It admitted 4 of 15, so a uniformly **double-spaced file lost its ENTIRE interchange body** and
> returned `groups: []`.

### `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` - why a `0.0.9` 835 must be re-emitted

The bullet still says 835s this library emitted at `0.0.9` or earlier are non-conformant and should
be re-emitted. What moved is the mechanism:

> their revenue code sits in SVC-05, so head reads it back as a paid quantity (`0300` -> 300 units)
> with no warning.

### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` - the two measurements

The bullets still say the `tsx` -> `node` substitution is pinned as an EQUIVALENCE rather than
assumed and is scoped to `paths` mode only; that the global `testTimeout` stays at 10 s on purpose;
and that the `10.0 s` reading must not be upgraded into a proven crossing, because the reporter
rounds. What moved is why each holds:

> Nothing else enforces erasable-only syntax; the Node 22.18 floor is unenforced.

> The 10 MB+ 834 stream sits AT it and is green only on its own 120 s per-test ceiling.

### `X12-NUMERIC-VALUE-EMITS-EMPTY` - what `escapeRelease` read

The bullet still says every builder that declares an `esc` takes it from `makeCallerEscaper`, which
type-checks first and refuses with the calling module's own typed, code-tagged error. (It said
"nine" until `X12-TA1-EMIT-NOT-RELEASE-AWARE` made it ten; the count is deleted rather than
re-derived, and `test/builder-string-type.test.ts` holds it.) What moved is the
mechanism and the slot it cost:

> `escapeRelease` read `value.length`, `undefined` on a number, so the value vanished with no
> warning and no error - including `CLP-01`, the reassociation key back to the 837's `CLM-01`.

### `X12-CALLER-VALUE-RESIDUALS` - why the array-bounds control wedges

The bullet still says the negative control found something worse than a red, that removing a
`requireCallerArray` call WEDGES the test rather than failing it, and that this is the argument for
keeping the source scan exhaustive. What moved is the reason:

> A synchronous infinite loop never yields, so `testTimeout` cannot interrupt it.

### `X12-QUANTITY-SILENT-DEFAULTS` - where a `ZERO`/`NOT_DECODED` pair was wrong

The bullet still says ONE message, NO discriminant. What moved is the census:

> a `ZERO`/`NOT_DECODED` pair was wrong at 835 `CAS`, 835 `PLB`, 837 `CAS`.

### `ASSETS-P8` - the upstream line that returns 0

The bullet still says `attw` prints "does not contain types" and EXITS 0, that the `attw` script is
therefore `scripts/attw.mjs` and never the bare CLI, and that for a package which ships types it
means the declarations were not in the tarball. What moved is the upstream source:

> `getExitCode.js` in `@arethetypeswrong/cli` 0.18.4 opens with `if (!analysis.types) return 0` and
> the problem list is never consulted.

### `PHI-WARNING-MESSAGE-LEAK` - the two things that leaked

The bullets still say shape-validate-then-echo cannot hold for a control number, whose grammar is
whatever the trading partner sent, and still say `X12Segment.id` is bounded to the segment-id
grammar with a `NON_SPEC_SEGMENT_ID` sentinel. What moved is what each was:

> `X12_CONTROL_NUMBER_MISMATCH` rendered both sides verbatim and unbounded on all six
> control-number slots.

> it was an unbounded copy of the segment's first element.

### `X12-BUILDER-BOUNDS` - the two allowlists that leaked

The bullet still says `test/builder-refusal-bounds.test.ts` must never allow `String(...)` or
`String(<expr>.length)`, still says what remains allowed is a single-letter loop index and the
`width` literal only, and still says negative controls run both ways. What moved is the history:

> Its first allowlist admitted any `String(...)`; its second inspected the property NAME and not the
> operand, so a forged `{length}` sailed through.

### The `phi-scan` gate - what `-B` prints, and the parser envelope's naive split

The bullets still say to quote the classification and never the letter, because `--diff-filter`
classifies a broken pair as `B` whatever letter it prints; and still say `splitSegments` is
release-aware via `findUnescapedTerminator` and that a degenerate terminator-is-release delimiter
set falls back to the literal scan. What moved is what each looks like:

> `-B` prints **`M`** + a score, one path, which `RAW_RECORD` parses happily.

> A naive `indexOf` split mid-value on a `?`-release-escaped terminator (`?~`).

### The `phi-scan` gate - the allow-list's byte-strictness, compared

The bullet still says synthetic tokens are POSITIVELY DECLARED in `scripts/phi-allow-list.txt`,
byte-strict and with no inline header, and that a whole-file bypass needs `--allow-fixture` AND an
entry in `phi-scan-overrides.md`. What moved is the sibling it matches:

> as DICOM's `.dcm`

### `X12-ORPHAN-REEMIT` - why case 6 is out of scope

The bullet still says the empty-first-element segment outside a transaction is deliberately NOT in
scope. What moved is the reason:

> The walker skips it, so there is nothing to re-emit; closing it is a RETENTION change to the
> `name.length > 0` guard and would mint new `X12_UNEXPECTED_SEGMENT`s.

## 9. Trap-bullet narrative relocated by `X12-VARIANT-ICR-UNGROUNDED` (2026-08-08)

`x12/CLAUDE.md` was at 52,710 of 52,710 with zero headroom, and this slice owed a trap. Nine pieces
of narrative moved here **first**; no trap was deleted and the entry in the umbrella's
`.claude/hooks/doc-budget.mjs` was not raised. Each bullet still carries its imperative; what follows
is only the reasoning behind it.

### `X12-CALLER-VALUE-RESIDUALS` - why `renderCallerJson` keeps `JSON.stringify`, and why `profileName` is not bounded

The bullet still says `renderCallerJson` bounds its OUTPUT, never throws, fabricates no closing
quote, and that `X12ProfileError.profileName` is deliberately NOT bounded. The two reasons:

> The value's TYPE is what is wrong at those sites, and `null` and `"null"` are different mistakes,
> so the JSON rendering is the point rather than an implementation detail. It survives circular
> references, `BigInt` and a hostile `toJSON`. `profileName` is left unbounded because truncating it
> would stop it matching what the consumer passed, which is the one thing that field is for.

### `X12-CALLER-VALUE-RESIDUALS` - the `for...of` sites, and the reachability of a forged non-array

The bullet still scopes a forged non-array as availability rather than `STOP-THE-LINE`, and still
says the `for...of` sites throw with no `code`. What moved:

> Unreachable from TypeScript; reachable from JS, from a JSON payload, and from `@cosyte/cli`. The
> `for...of` sites are `buildInterchange`'s `spec.groups`, `build999`'s `transactionResponses`, and
> every optional leaf array; each throws `TypeError: ... is not iterable`. Disclosed, pinned.

### `X12-CALLER-VALUE-RESIDUALS` - the four scopes neither gate scans

The bullet still says neither gate scans indexed loops outside the `build*` scope. The four:

> `src/loops/define.ts`, `src/profiles/validate.ts`, the `get-*.ts` readers, `src/parser/envelope.ts`.

### `X12-BUILDER-BOUNDS` - why the build-side `segmentIndex: 0` is not the same defect

The bullet still says it was filed as the same defect and is not one. Why:

> The builder has no parsed segment stream, so the position is `UNANCHORED_BUILD_POSITION`, inert by
> construction. Fabricating an index would have named a segment no consumer can resolve.

### `ASSETS-P8` - what each of the two `attw` nets catches

The bullet still says to keep BOTH nets in `scripts/attw.mjs`. What each is for:

> The **preflight** checks that every relative path `package.json` promises exists and is non-empty,
> which catches the `tsup` build interval and NAMES the missing file. The **post-check** on the
> untyped sentence catches what the preflight structurally cannot: declarations on disk but excluded
> from the tarball by `files` / `.npmignore`.

### `X12-DECIMAL-BYPASSES-THE-GUARD` - what a `parts.length` bound over a caller array-like did

The bullet still says never to bound a loop that way and to iterate with `for...of`, which throws:

> A forged `{ length: undefined }` runs **zero** iterations and reports every segment clean.

### `X12-VARIANT-LOOKUP-PROTOTYPE` - why no source scan can ship for the prototype defence

The bullet still says NO SOURCE SCAN SHIPS, DELIBERATELY. The reason:

> A scan cannot separate a wire-keyed table from a discriminant-keyed one, and `warnings.ts` has four
> of the latter, so it would need a per-TABLE allowlist. That is `#51`'s failure mode.

### The `phi-scan` gate - why a walk root's own index entry is exempt

The bullet still says such a root's OWN index entry is EXEMPT and that its control must commit its
corpus. Why:

> The walk yields `<root>/<name>` and never `<root>`, so without the exemption the superset scan
> turns an exit 1 into a refusal.

### The `phi-scan` gate - why the enumerate-then-read race is deferred

The bullet still says the race is deferred and that the reason is DIRECTION:

> Its remedy TOLERATES a failed read; these two rules NARROW what the enumeration admits. Mixing the
> two directions in one change is what makes a widening reintroduce the race verbatim.

## 10. Per-transaction-invariant narrative relocated by `PHI-SCAN-WALK-ROOT-SCOPE` (2026-08-08)

Relocated to pay for that slice's trap block. `CLAUDE.md` stood at **52,708 of a 52,708-byte entry**
with **zero** headroom, and the walk-root-scope slice found a real defect (`REQUIRED_DIRECTORIES`)
that had to be recordable. **The imperatives all stayed behind.** What moved is the long-form
explanation of two bullets in `### 🩺 Per-transaction invariants that shipped with the phases`, a
section whose own header already says the full detail is in the phase sections of
`documentation/agent-notes.md`. **Nothing was deleted and no trap was touched.** The umbrella owes the
matching ratchet drop in `.claude/hooks/doc-budget.mjs`, which is **LOWERED on a shrink, never raised
to meet a trap** - and a drain worker may not write it, so it is reported rather than made.

Verbatim, two pieces.

### 10.1 The 278's EV/SS review level, the one caller-supplied HL-03

> - **🩺 The one caller-supplied HL-03 is the 278's EV/SS REVIEW level** (`review.levelCode`, default
>   `EV`; `esc` never constrained the value). **Both entry points now REFUSE anything else**
>   (`X12_278_BUILD_INVALID_SPEC`, no new code): the emit is well-formed but opens a loop no reader
>   opens, so the review **and its HCR-01 decision FAIL TO DECODE - they are NOT decoded WRONGLY**, and
>   never write the stronger form. **Resolve via the emitter's own `?? "EV"`, NEVER `!== undefined`** -
>   `null` is absent, and `undefined`-only refused a spec the emitter would have built. Reaches nested
>   and dependent reviews. **Do not restate this as a property of `build278`'s HL-03 generally, and do
>   not write "every builder that has one" over it** - its other four levels are library constants.

### 10.2 The read side never re-numbers a broken HL pointer

> - **🩺 On the READ side the walker NEVER silently re-numbers a broken HL pointer** - it emits
>   `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`. The 278 `EV` / `SS` levels are
>   deliberately tolerant (omitted from the expected-parent map), which is why nothing on the read side
>   catches an out-of-enum HL-03 on a document this library did not emit. Untouched; a warning needs a
>   new registry code.

### 10.3 Every DOMAIN builder's own refusal message, and the ack-path exception

> - **🩺 Every DOMAIN builder's own refusal message carries structural locators, counts and numeric
>   totals only** - never an identifier, a name, a trace or a clinical code. **State this PER BUILDER,
>   never as a property of every builder.** Standing exception, the **ack path**:
>   `build999` interpolates the acknowledged ST-02 and `buildTA1` its TA1-05 note code. **The negative
>   list is NOT an absolute PHI guarantee; it is one about the builder's own TEMPLATES**, which still
>   render control numbers and codes.

### 10.4 No caller guard echoes what a caller put in an element

> - **🩺 NO CALLER GUARD ECHOES WHAT A CALLER PUT IN AN ELEMENT** - string/segment/decimal and the
>   array guard's PRIMITIVE arm report the TYPE only. **Never re-add a value, never fold the decimal
>   one back out. And state what this does NOT say, drafted false once:** the array
>   guard STILL renders a forged array-like's `length` and class tag (SHAPE, not element contents).

### 10.5 The profile-quirk hard rule, and how it is enforced

> - **🩺 HARD RULE, LOCKED: a profile quirk with no Tier-2 fixture demonstrating the deviation is
>   FORBIDDEN. No invented quirks.** Enforced three ways, incl. a per-quirk DEMONSTRATOR registry, so a
>   real-but-irrelevant fixture cannot slip past. Built-ins reach consumers ONLY via `profiles`.

### 10.6 Why composing builders emit the envelope inline

> - Emit the envelope INLINE, not via `buildInterchange`, in any domain builder that composes a
>   composite element (835, 837), so a pre-composed composite is never double-escaped. Composites
>   escape each component then join with the RAW component separator.

### 10.7 The 278 certification decision, and the maintenance-type primitive

> - **🩺 Maintenance type is the 834's safety primitive: emit VERBATIM, refuse the unknown.** The
>   builder places the caller's INS-03 / HD-01 (code source 875) verbatim and NEVER infers or
>   normalizes; where the read side only WARNS (`X12_834_UNKNOWN_MAINTENANCE_TYPE`, **scoped to the
>   affected member only**) the builder REFUSES.
> - **🩺 The 278 certification decision is response-only and never inferred:** `build278Response`
>   places HCR-01 VERBATIM and never normalizes or **upgrades** it; `build278Request` REFUSES a review
>   carrying one.

### 10.8 Four `phi-scan` imperatives that left `CLAUDE.md` and were not landed anywhere (2026-08-08)

**PASTED VERBATIM FROM `7d50305`'s `CLAUDE.md`, NOT REWRITTEN.** A refuter measured that
`PHI-SCAN-WALK-ROOT-SCOPE`'s compression of that trap section dropped these four outright: they were
removed from `CLAUDE.md` and appeared in no agent-notes file, which is the exact trade ADR 0023
exists to prevent and which the note claiming "Nothing was dropped" asserted had not happened. They
govern the `--staged` commit-blocking route's own semantics.

> - **▶ 🩺 THE `--staged` ARGV IS THE GATE AND EVERY FLAG IN IT IS LOAD-BEARING; NEVER SHORTEN IT. ONE
>   RULE: DO NOT TRUST THE CALLER'S GIT CONFIG.** Five holes, all exit 0 over PHI, closed by
>   `--no-renames --ignore-submodules=none --diff-filter=AMTUB`. `T` is what
>   makes the mode check reachable. **`U` is closed by the FILTER, not `--no-renames`; never conflate
>   them**, and it refuses FIRST with its OWN message (mode `000000`). **ZERO stride work. Never add `-M`, `-C` or `--find-copies-harder`** - each
>   re-empties the route. **No test may run `git merge`** - it reds on CI on its own premise; stage the
>   conflict with `update-index`.
> - **▶ 🩺 QUOTE THE CLASSIFICATION, NEVER THE LETTER: `--diff-filter` classifies a broken pair as `B`
>   WHATEVER LETTER IT PRINTS** (what `-B` prints instead: relocated narrative §8). **A short fixture
>   does NOT break; the case needs bulk. NEVER RECORD A SIMILARITY
>   SCORE** - it drifts; **DELETE a drifting number, never correct it.**
>   **"Strict superset" REFUTED; EQUAL absent a rename/copy/gitlink/unmerged path.**
> - **🩺 Both enumerating routes REFUSE a symlink (exit 2), naming every offender**; neither FOLLOWS
>   an ENTRY it enumerated. Say ENTRY, not "anything": **a walk ROOT that is itself a link IS
>   followed** - a superset, not blind. **🔴 AND NOTHING UNDER SUCH A ROOT IS RECONCILED** (its files
>   are outside the `git ls-files` pathspec), so an EMPTIED link target reads **exit 0**.
>   PRE-EXISTING, OPEN: **the closure is "within the declared roots", NOT a universal.** **A refusal
>   NEVER reports the link target:** a diagnostic ABOUT a PHI leak is itself a PHI surface, so
>   describe the shape, never exemplify it.

## 11. The whole pre-compression `CLAUDE.md`, relocated by `S0262-x12-drift-check-phase-2` (2026-09-05)

The estate baseline (`config/drift-manifest.json`, `baselines.package.groups.agentDoc`) declares a
line ceiling for an agent-context doc and `config/scripts/drift-check.js` grades this repo against
it. This file was over that ceiling, so the traps were compressed to their imperatives, exactly as
the standing discipline requires: **narrative moves out and only the imperative comes back**.

**NOTHING WAS DROPPED, AND THIS SECTION IS THE PROOF RATHER THAN A CLAIM.** The whole file as it
stood at `5244254` is quoted below **byte for byte**, 573 lines, inside a fence so that a
reader can diff it against what came back rather than take a summary's word for it. **All 38 `###`
trap headings survived the compression with their own `agent-notes` pointers intact** - a trap
dropped to hit a number is the one failure mode the ceiling exists to prevent - and **every trap's
measurement, sources and refutation history were already in the note its heading names**, which is
why what moved here is CLAUDE.md's own restatement of them and not the measurements themselves.

The two brace-collapsed pointers below (`x12-{variant-icr-ungrounded,837-emit-identifier-fixed}.md`
and `x12-{amt-adx-absent-amount,stated-amount-discarded}.md`) are written out as explicit paths in
the compressed file. **A collapsed pointer resolves to nothing**, so it is a citation a reader cannot
follow and a checker cannot grade.

```markdown
# @cosyte/x12: Project Guide for Claude

## Project

**`@cosyte/x12`**: an ASC X12 EDI parser + utility library (Node/TS, MIT), the payer-side sibling of
**[`@cosyte/hl7`](../hl7)** at `../hl7` - API shape, profile system and lenient-parser philosophy are
deliberately mirrored, so **when in doubt on an API decision, check how `hl7` solved it.** The
identity paragraph, the north star and the sibling section are in
`documentation/agent-notes/claude-md-relocated-narrative.md`.

## ▶ Read this before you touch the parser: `documentation/agent-notes*`

**Every `###` heading in "Traps" below names the section carrying that trap's measurement, its
sources and its reasoning - open it before you act on the line.** Most are in
[`documentation/agent-notes.md`](documentation/agent-notes.md), itself budgeted, so the newest are
their own files under `documentation/agent-notes/` (mechanism: relocated narrative §7). **A trap
deleted to hit a number is the one failure mode this bound exists to prevent.** **Never quote this
file's number here, read `REPO_CLAUDE` in the umbrella's `.claude/hooks/doc-budget.mjs`.** **A new
trap here is PAID FOR BY RELOCATING FIRST**, and the entry is LOWERED as the relocation lands, never
raised to meet it.

## Status

Pre-alpha `0.0.x`, **published** to npm from a public repo. **Never quote a version here:**
`npm view @cosyte/x12 version` is the only source of truth.

- **Read scope is decoded for** 270, 271, 276, 277 / 277CA, 278, 820, 834, 835, 837P/I/D, 999, TA1.
- **Emit scope is complete for every transaction that has a reader**: general (`serializeX12` +
  `buildInterchange`) plus a per-TR3 domain builder for each, and the pure-function `build999` /
  `buildTA1`, each layering the safety-critical per-TR3 invariants (balance, certification,
  maintenance-type fidelity, count reconciliation) on the general builder.
- **🩺 BOTH inquiry directions now ship, read AND emit** (`get276StatusInquiry` /
  `parse276StatusInquiries` / `build276` beside the 270 trio). **Never re-add a "no typed model for
  the 276" claim and never write one paired label over two halves** - that is how the README and the
  docs site were wrong until `ASSETS-P8`. Derive the scope from `X12_TR3_CONFORMANCE`, never from
  prose. 🩺 The 270 and 276 readers each attach a level by its OWN HL-02 and by nothing else: a
  pointer that does not resolve leaves that level and its whole subtree OFF the tree, warned, never
  re-parented onto whichever level was open. Their warning codes and build-error classes are
  SIBLINGS, never one widened set.
  Why: `documentation/agent-notes.md#published-scope-the-270-and-276-inquiry-directions`
- **Warning registry: additions-only, and NEVER quote its size here** - the count on this line was
  stale twice. Derive it: the codes are exported as `ALL_WARNING_MESSAGES`, and the four Tier-3
  fatals are enumerated under Engineering Guardrails below.
- **Profile system** (`defineProfile()`, `profiles`) shipped Phase 9; **PHI commit-gate** armed
  (`pnpm phi-scan`). **Phase histories 1-9 are in `documentation/agent-notes.md`** - read the phase
  section before changing a surface it built.

## v1 Scope Snapshot

HIPAA sets at **005010** (errata hooks); list at `documentation/agent-notes.md#v1-scope-snapshot`.
Non-healthcare (850/856/810/204), EDIFACT, AS2/SFTP and pre-005010 are out. **It is the v1 SCOPE
declaration, NOT a list of what SHIPPED** - `X12_TR3_CONFORMANCE` is the derived answer to that.

## Tech Stack (the shared `@cosyte/*` standard)

**The toolchain is INHERITED by depending on the published `@cosyte/*` config packages, never by
copying files.** Source of truth: the meta-repo's `documentation/conventions.md`; per-tool summary:
`documentation/agent-notes.md#tech-stack-the-shared-cosyte-standard`. **The `attw` script is
`scripts/attw.mjs`, NEVER the bare CLI** (`ASSETS-P8` trap below). **Runtime deps: ZERO.**

## Engineering Guardrails

- No `any`, no unjustified `as` (use `unknown` and narrow). JSDoc with `@example` on every public export. Immutable by default; mutate only via `setElement` / `addSegment` / `addLoopIteration` / `removeSegment`. No `console.*` in library code - throw typed errors or return results. Short, testable functions over parsing blobs.
- Postel's Law: parser liberal (lenient default + stable codes with positional context), serializer conservative. **Be exact, because the README said it loosely until ASSETS-P8** (long form: `documentation/agent-notes/claude-md-relocated-narrative.md`). The domain builders emit spec-clean by construction, but `serializeX12` is byte-faithful **only for the segments the parser recorded on the model**: **`serialize(parse(s)) === s` is NOT guaranteed, and "my file has no line breaks" is NOT sufficient** - `KNOWN-LIMITATIONS.md` is the canonical list, most of it needing no line break and silent. `{ specClean: true }` reconciles the envelope and WARNS; `recomputeCounts` is **inert without `specClean`**. Nothing is ever silently corrected.
- Fatal only for unrecoverable structural corruption (4 Tier-3 codes: `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`). Everything else warns.
- Coverage target: ≥ 90% on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/`.
- Built-in loop specs + profiles are authored through the same public API (`defineLoopSpec()`, `defineProfile()`): dogfooding gate.
- HIPAA code lists ship as versioned data snapshots. An update is a release event, never a runtime fetch. `codeLists.meta.snapshotDate` is the freshness surface.
- Acknowledgments (`build999`, `buildTA1`, `parse999`) are pure: never auto-send, never open a socket, never touch the filesystem.
- **No em dashes (`U+2014`). Ever.** Founder directive. Gated by `pnpm check:no-emdash` and `.github/workflows/no-emdash.yml`, which scans tracked files **AND your PR title, PR body and commit messages** - this repo squash-merges, so those land on `main`. **Never re-encode the character**: rewrite with a period, colon, comma or parentheses.

## Traps

**Each was paid for; each `###` names the section carrying its measurement, sources and refutation
history. Do not act on a line here without reading it. 🩺 = getting it wrong mis-states a clinical
or financial value on the wire.**

### `X12-NO-INTERNAL-REFS-GATE` (2026-08-11) · `agent-notes/x12-no-internal-refs-gate.md`

**`pnpm check:no-internal-refs` now GATES the class every accuracy finding in this repo's review
history has belonged to: a claim in a prose carrier, which no test could fail on.**
**🛑 THE PORT WAS NOT A COPY AND YOU MUST NOT RE-TRANSCRIBE THE SIBLING FILE OVER IT.** Every sibling
excludes `X12-\d{3}[A-Z]?|X12-\d{6}` as a standards designation. **HERE `X12` IS ALSO OUR OWN ITEM
PREFIX AND THE TWO SPELLINGS OVERLAP** (`X12-837P` the guide, `X12-837-RESIDUALS` the item, sharing
the head `X12-837`), **so that exclusion swallows our identifiers whole. COUNTED, TWO TOOLS
AGREEING: all 141 tree-wide matches were INTERNAL IDS, the hyphenated standards spelling occurred
ZERO times, and the sibling line printed OK over SIX live violations on shipping carriers.** Bare
`837P` / `005010X222A1` is this corpus's spelling and the gate now REDS on the hyphenated form.
**🛑 A POSITIVE SELF-TEST SAMPLE IS DISJUNCTIVE AND THEREFORE VACUOUS BY DEFAULT** - `grep -q` stops
at the first match, so the control that restored the sibling exclusion printed OK because `CCDA-P7`
sat in the same sample. Rule 1's FIRST arm has five spellings asserted ALONE; **keep it that way, and
DO NOT READ THE SELF-TESTS AS PROVING "each rule still matches what it bans": MOST ALTERNATIVES,
INCLUDING RULE 1's SECOND ARM, ARE ASSERTED BY NOTHING - MEASURED, NAMED IN residual (xv), LIVE AND
NOT CLOSED. PUBLISH NO PROPORTION FOR IT** - a draft did and a second reviewer could not reproduce
it under any defensible way of counting an alternative. A NEGATIVE sample is conjunctive and has no
such failure mode. **🛑 `KNOWN-LIMITATIONS.md` IS IN `files` AND IS SCANNED.**
**🛑 REMEDIATE BY TRANSLATION, NEVER BY DELETING A DOC COMMENT** (JSDoc with `@example` on every
public export is a guardrail neither lint nor coverage protects), and repair the head when you strip
an identifier off the front. **🛑 THE GATE READS `src/` DOC COMMENTS, NEVER `dist/`, AND NEVER A
STRING LITERAL** - five code-list `meta.note` values ship build-order framing as an EXPORTED RUNTIME
VALUE, `PRE-EXISTING` and FILED; a runtime value is a different carrier from a comment. **ZERO ON
THE RULES IS NOT ZERO ON THE FOUNDER'S RULE:** six phase lines survived the first sweep with every
rule green, two of them the PLURAL `Phases`, which rule 2 cannot see. It catches identifiers, not
English about our process, so **the reviewer still owns half the rule.**
**🛑 QUOTE NO COUNT TAKEN ON ANOTHER REPO'S TREE, AND DELETE A DRIFTING ONE RATHER THAN CORRECT IT.**

### 🩺 `X12-PRE-005010-RUNTIME-MESSAGE` (2026-08-11) · `agent-notes/x12-pre-005010-runtime-message.md`

**🩺 Open it before you touch `WARNING_MESSAGES`, `pre005010` or the ISA-12 guard: the message
asserted what ISA-12 DECLARES while the guard reads the TWELFTH ELEMENT OF THE SPLIT, and THREE
constructions fire it with ISA-12 reading `00501` at its own fixed offset. 🛑 "THE DECLARED VERSION"
CARRIES THE SAME PRESUPPOSITION AND MOVED WITH IT - not style. 🛑 A RUNTIME MESSAGE IS A DIFFERENT
CARRIER: THE EMITTED JS CHANGES HERE, the inverse of the comment-only control, and it is the FIRST
row in this lineage A TEST GATES - the base message REDS the file, so KEEP THE NEGATIVE CONTROL.
🛑 NAME NO MECHANISM: the `ISA-13 carries *` row has an extra separator and stays SILENT. 🛑 THE
GUARD STILL READS THE SPLIT, NOT THE FIXED OFFSET - PRE-EXISTING AND FILED; moving it changes WHICH
interchanges raise the code. 🛑 ECHO NOTHING - a static registry lookup, and the census pins it.**

### 🩺 `X12-ISA-VALUE-POINTERS` (2026-08-11) · `agent-notes/x12-isa-value-pointers.md`

**🩺 Open it before you write ANY pointer at an `isa.elements[n]`: `IsaSegment`'s block and
`pre005010`'s JSDoc promised VALUES and handed back RAW BYTE TEXT in `dist/index.d.ts`, which SHIPS, and
`#116` deliberately left the ISA half of its own filed line for this slice. 🛑 DO NOT COPY THE FOUR
SIBLINGS' LABEL - `pre-?-unescape` is FALSE ON THE ISA, whose split is deliberately NOT release-aware
(`?` is content). 🛑 NAME NO MECHANISM AND NO CLOSED SET OF THEM: fixed-width padding and arity
displacement each falsify a cell alone, so neither is THE reason and a third is not ruled out. 🛑 THE
1-INDEXED MAPPING IS SCOPED, NEVER DELETED, AND NEVER QUANTIFIED. That diff is COMMENT-ONLY with
`dist/index.mjs`/`.cjs` BYTE-IDENTICAL; its run-time twin is the trap above.**

### 🩺 `X12-ENVELOPE-VALUE-EXAMPLES` (2026-08-10) · `agent-notes/x12-envelope-value-examples.md`

**🩺 Open it before you write ANY `@example` or prose pointer at an envelope `elements[n]`:
`Iea`/`Gs`/`Ge`/`Ta1` and `X12FunctionalGroup` PROMISED VALUES and hand back FRAMED BYTES, and the
carrier is `dist/index.d.ts`, which SHIPS - an example is the form a consumer COPIES, which is why a
backtick-anchored sweep never saw them. 🛑 EVERY DOCUMENTED NON-ISA CELL IN THE NOTE'S GRID IS
FALSIFIED BY ONE RELEASED VALUE - COUNT ITS ROWS, PUBLISH NO TOTAL (a draft published one, in four
carriers, and it was wrong), AND TELL NO STORY ABOUT WHICH IS SPECIAL: "`ta1.elements[1]` sharpest"
survives ONLY as a CONSEQUENCE (TA1-01 is the reassociation key and `parseTA1` already reads it
right, so the package disagrees with itself), NEVER as a mechanism. 🛑 DO NOT ATTACH `warnings: []`
TO THAT GRID - GE-01 and IEA-01 are ROWS IN IT and are the count slots, so that construction ALWAYS
warns; it is the TA1 ROUND TRIP that is silent. 🛑 THE ISA IS DELIBERATELY UNTOUCHED AND STAYS FILED
WITH `warnings.ts:482`, AND NO MECHANISM IS NAMED FOR IT: a draft attributed its cells to
`decodeIsa`'s ARITY CHECK and the gate falsified that with FIXED-WIDTH SPACE PADDING on a spec-clean
file, the FIFTH which-member-is-special story here. The remedy is the LABEL `X12Segment` already
carries; the diff is COMMENT-ONLY and `dist/index.mjs`/`.cjs` BYTE-IDENTICAL base to head.**

### 🩺 `X12-EMPTY-CONTROL-NUMBER-FABRICATED` (2026-08-09) · `agent-notes/x12-empty-control-number.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap two below.
**🩺 Open it before you touch `padControl`, `requireControlNumber` or any control-number slot:
`padControl("", 9)` FABRICATED `000000000` into ISA-13/IEA-02 and the interchange RECONCILED with
`warnings: []`, INVENT and LOSE are two mechanisms and not one, and 🛑 THERE IS NO TRIM - whitespace
still pads, DISCLOSED AND NOT FIXED, because a trim is a normalisation rule and no source states
one.**

### 🩺 `X12-BODY-DEGENERATE-RELEASE-SEPARATOR` (2026-08-09) · `agent-notes/x12-body-degenerate-release-separator.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap two below.
**🩺 Open it before you touch `decodeSegment`, `splitWithRelease` or any framing role: on
`elementSeparator: "?"` a BODY segment came back as ONE element with id `(non-spec)` while the
ENVELOPE framed correctly and every count reconciled, `warnings: []`. 🛑 PER ROLE, ON READ - DO NOT
HOIST IT INTO `splitWithRelease`; and `?~` STILL SWALLOWS THE TERMINATOR, `PRE-EXISTING` AND OPEN.**

### 🩺 `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` (2026-08-09) · `agent-notes/x12-emit-degenerate-release-delimiter.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ST03-READ-NOT-RELEASE-AWARE` trap below.
**🩺 Open it before you touch `makeCallerEscaper`, any builder's `refuseSpec` or the read side of a
degenerate set: a delimiter set with `?` in ANY of FOUR roles is refused on emit, there are TWO
mechanisms and the second needs NO caller value (`build837P` fused the procedure and diagnosis codes
on EVERY document), and 🛑 THE READ SIDE AND `serializeX12` ARE UNTOUCHED, DELIBERATELY.**

### 🩺 `X12-EMIT-DELIMITER-SHAPE-UNCHECKED` (2026-08-09) · `agent-notes/x12-emit-delimiter-shape-unchecked.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-POINTERS` trap below.
**🩺 Open it before you touch `requireWellShapedDelimiters`, any builder's delimiter handling or
`buildTA1`: a delimiter must be ONE VISIBLE CHARACTER and the four distinct, there are THREE
mechanisms filed as one (LENGTH, TYPE - the JOIN coerces where the ESCAPE does not - and `buildTA1`
having NO net at all, which read an Accept back as a REJECT), the rule counts UTF-16 CODE UNITS AND
NOT BYTES, and 🛑 PUBLISH NO ASYMMETRY ABOUT WHICH ROLES WERE SILENT - three drafts did and the gate
falsified every one.**

### 🩺 `X12-ENVELOPE-VALUE-POINTERS` (2026-08-09) · `agent-notes/x12-envelope-value-pointers.md`

**RELOCATED IN FULL 2026-08-09 to pay for the trap below, VERBATIM EXCEPT TWO CLAUSES THE TRAP BELOW
MEASURED FALSE - deleted inline and ON THE RECORD, because a revert re-publishes claims.**
**🩺 Open it before you point a consumer at any envelope `elements[n]`: those are RAW, so a pointer
promising "the values" hands over FRAMED BYTES; filed as 2 pointers in 1 file, CUT 11 pointers / 4
JSDoc blocks / 2 files; THE REMEDY IS DELETION, NEVER A CORRECTED POINTER; a pointer that LABELS its
surface raw is CORRECT and was left alone; and 🛑 `types.ts`'s `@example` indices are the EIGHTH
FLOOR, FILED NOT CLOSED - A GREP ANCHORED ON A BACKTICK MISSES THEM, they sit bare in the fences.**

### 🩺 `X12-ENVELOPE-VALUE-ROUTES` (2026-08-09) · `agent-notes/x12-envelope-value-routes.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-EXAMPLES` trap above.
**🩺 Open it before you point a doc at an envelope element, name a read route, or WIDEN AN ENVELOPE
READER'S SIGNATURE: NO DOC MAY NAME `getSegmentValue` AS THE READ OF AN ENVELOPE ELEMENT (all seven
envelope types declare only `raw`+`elements`, so the call is `TS2345`), 🛑 THE SIGNATURE WAS NOT
WIDENED AND THAT WAS THE DECISION - it is free and non-breaking and it would make a SILENTLY WRONG
ISA READ COMPILE, THERE ARE TWO ROUTES AND THEY DISAGREE ON A REPETITION so neither "is the route",
🛑 COUNT THE NOTE'S ROWS, DO NOT QUOTE A FIGURE, 🛑 ON THE ISA READ THE FOUR CELLS AND STATE NO RULE
OVER THEM IN EITHER DIRECTION, NOT EVERY REMEDY WAS A DELETION (check the `remedy` column against
the DIFF, never the summary word), A DELETION CAN STRAND THE SENTENCE'S SUBJECT IN BOTH TWINS, and
`parse-ta1.ts` / `KNOWN-LIMITATIONS.md` MIS-CITING `X12Segment.elements` is STILL FILED, NOT FOLDED
IN.**

### 🩺 `X12-ST03-READ-NOT-RELEASE-AWARE` (2026-08-09) · `agent-notes/x12-st03-read-not-release-aware.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-ROUTES` trap above, on that trap's SECOND relocation.
**🩺 Open it before you touch `decodeSt03`, any typed reader's `implementationConventionReference` or
an ST-03 key: every reader publishes it POST-`?`-unescape through ONE `decodeSt03`, filed as three
readers and measured as FOUR raw reads in THREE files reached by FIVE public readers, GROUNDED ON
THIS PACKAGE DISAGREEING WITH ITSELF and never on a TR3 clause; 🛑 THE THREE ST-03 TESTS STILL KEY ON
THE RAW TEXT, DELIBERATELY, and moving one is a different slice; NO NORMALISATION AND NO NEW WARNING,
THE SINK IS A NO-OP; and 🛑 PUBLISH THE CELLS, NEVER A STORY ABOUT WHICH READER IS SPECIAL.**

### 🩺 `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` (2026-08-08) · `agent-notes/x12-interchange-gs-escape.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-ROUTES` trap above.
**🩺 Open it before you touch `buildInterchange`, `esc` or any GS slot: GS-04 / GS-05 / GS-07 are
RELEASED on emit and GS-07 WAS THE SILENT ONE (`"X*Y"` took GS-08's slot, `warnings: []`), 🛑 NEVER
ESCAPE ELEMENT 0 BECAUSE A SEGMENT ID IS OURS AND NOT CALLER CONTENT, and TYPE-CHECK BEFORE
ESCAPING.**

### 🩺 `X12-TA1-RESIDUALS` (2026-08-09) · `agent-notes/x12-ta1-residuals.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-POINTERS` trap above.
**🩺 Open it before you touch `parseTA1`, `buildTA1`'s element guards or any TA1 slot: the five
decoded fields are POST-`?`-unescape while `raw` is the verbatim byte surface, an empty TA1-02..05 is
REFUSED on emit (FILED AS TWO SLOTS, MEASURED AS FOUR), 🛑 READ TA1-05's CELL AGAINST A NON-ACCEPT
DISPOSITION OR `enforceAcceptIsClean` REACHES IT FIRST, and PUBLISH THE CELLS, NEVER A STORY ABOUT
WHICH SLOT IS SPECIAL - whitespace still builds at all five, no source grounds a trim.**

### 🩺 `X12-TA1-EMIT-NOT-RELEASE-AWARE` (2026-08-08) · `agent-notes/x12-ta1-emit-escape.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, EXCEPT ONE CLAUSE THE SUCCESSOR MEASURED FALSE, WHICH IS
DELETED INLINE AND ON THE RECORD** - it paid for the trap above. **🩺 Open it before you touch
`buildTA1`, `BuildTA1Options` or any TA1 element: an unreleased delimiter shifted TA1-04 and an
Accept this library emitted read back as a REJECT, the INVERSE is the less safe one, and the
predicate moves BOTH ways - state the property, never the directions, and never total the cost.**

### 🩺 `X12-VARIANT-ICR-UNGROUNDED` + `X12-837-EMIT-IDENTIFIER-FIXED` (2026-08-08) · `agent-notes/x12-{variant-icr-ungrounded,837-emit-identifier-fixed}.md`

- **🩺 `VARIANT_BY_ICR` MISSED EVERY 45 CFR 162.1102 IDENTIFIER AND BOTH COMPANION-GUIDE ONES**, so
  the `SVx` fallback was the NORMAL path on production 837P/I and `X12_837_UNKNOWN_VARIANT` accused
  CONFORMANT files. **EVERY KEY NAMES ITS SOURCE; the later errata are the WEAKEST leg.**
- **🛑 A BEHAVIOUR CHANGE ON PUBLISHED DECODING. STATE IT AS ONE PROPERTY, NEVER A LIST OF
  CONSEQUENCES** - a draft published three, a refuter found a fourth; the set is in the notes. The
  property: **where ST-03 resolves, THE DECLARATION DECIDES, NOT THE FIRST `SVx`**, so a disagreeing
  line STOPS DECODING (`X12_837_SERVICE_LINE_NOT_DECODED`) and both variant codes STOP firing.
  Opposite call to `#87`/`#88`: **evidence was IN ST-03, ignored.** **The fallback is NOT
  narrowed, precedence unchanged** - only WHICH documents reach it did.
- **CITED IDENTIFIERS, NEVER A PATTERN, EITHER SIDE** - no trim/case-fold/prefix.
  **NO COUNT, NEVER ENUMERATE THE SET IN A MESSAGE** - a tripwire reds on a quoted TR3 id.
- **🩺 EMIT TAKES `Build837EnvelopeSpec.implementationConventionReference` INTO BOTH ST-03/GS-08;
  THE DEFAULTS DO NOT MOVE** (a PARTNER fact). **REFUSE ON DISAGREEMENT, NOT ON ABSENCE.**
  **🩺 A `?` BEFORE A GS/ST SEPARATOR IS ONE ELEMENT: A FIX IF ESCAPED, A REGRESSION IF LITERAL.
  ISA EXEMPT** - `agent-notes/x12-envelope-release-split.md`.

### 🩺 `X12-ISA-ELEMENT-ARITY` (2026-08-10) · `agent-notes/x12-isa-element-arity.md`

**🩺 Open it before you touch `decodeIsa`, the ISA split, or any read of an ISA `elements[n]`: 17 IS
A FLOOR AND NEVER THE COUNT (`detectDelimiters` bounds the split from BELOW only), so an ISA element
carrying the ELEMENT SEPARATOR displaces what follows it - 🛑 NEVER QUANTIFY THE SHIFT. Not "by
one", and NOT from `isa.elements.length` either: it is POSITION-DEPENDENT, and `isa.raw` plus the
fixed widths is the only route back. Each quantifier was a MAJOR (passes 1 and 2, the second INSIDE
the first's remedy) - DELETE, never substitute. 🛑 THE
FILED LINE NAMED ISA-13 AND 14 OF 16 REPRODUCE; the two that do not ARE the in-band
repetition/component declarations, so the plant collides with them - A BOUNDARY OF THE PROBE, NEVER A
PROPERTY OF THOSE ELEMENTS, AND TELL NO STORY ABOUT WHICH IS SPECIAL. 🛑 SCOPE THE ORDERING CLAIM TO
`ix.warnings`: `serializeX12` RECONCILES ISA-13 OFF `elements[13]` AND NEVER RAISES THIS CODE, so its
absence there is NOT evidence the header framed (pass-1 major, `PRE-EXISTING` behaviour, an
INTRODUCED overclaim). 🛑 IT IS A REPORT, NOT A REPAIR: nothing is re-framed, NO existing warning is
suppressed or narrowed, and `isa.raw` is the route back - the byte has TWO READINGS and no source
settles which. 🛑 THIS DOES NOT CLOSE THE `types.ts` `@example` CELLS: `#116`'s gate already
falsified attributing those to this check, and their mechanism is FIXED-WIDTH SPACE PADDING. THE
EMIT SIDE IS UNGUARDED AND FILED - the ISA slots never reach the caller escaper.**

### 🩺 `X12-837-SV1-OVERWRITE` (2026-08-08) · `agent-notes/x12-837-sv1-overwrite.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the trap above.
**🩺 Open it before you touch a service-line slot or `X12_837_SERVICE_SEGMENT_REPEATED`: a 2nd `SVx`
in an OPEN Loop 2400 REPLACES the 1st element for element, `warnings: []` through `0.0.13`, 🛑
LAST-WINS IS NOT NARROWED, the code is SCOPED TO THE LINE and fires DECODED OR NOT, and A BLIND
CONSUMER WAS THIS REPO'S OWN DOCS - SWEEP EVERY MONEY PAGE, NOT THE RECIPE ALONE.**

### 🩺 `X12-837-AMBIGUOUS-VARIANT` (2026-08-08) · `documentation/agent-notes/x12-837-ambiguous-variant.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ENVELOPE-VALUE-ROUTES` trap above.
**🩺 Open it before you touch `X12_837_AMBIGUOUS_VARIANT` or the `SVx` fallback: the fallback is NOT
narrowed and this closed ONLY the silence, 🛑 NEVER PICK A WINNER because a stray `SVx` and a
conformant one are indistinguishable, and ADDITIVITY HERE IS INVARIANCE, NEVER A LIST OF WHAT ELSE
YOU WILL SEE.**

### 🩺 `X12-AMT-ADX-ABSENT-AMOUNT` + `X12-STATED-AMOUNT-DISCARDED` (2026-08-07) · `documentation/agent-notes/x12-{amt-adx-absent-amount,stated-amount-discarded}.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED, THE PAIR KEPT WHOLE IN THE FIRST SLUG** -
it paid for the `X12-ISA-ELEMENT-ARITY` trap at the top of this list.
**🩺 Open it before you touch `AMT`/`ADX`/`RMR` handling, `X12_AMOUNT_ROW_DROPPED` or
`X12_STATED_AMOUNT_DISCARDED`: an `AMT`/`ADX` is a RECORD AND NOT A SLOT so an absent amount drops
the whole row, the TWO codes are DISJOINT and never one segment, 🛑 SAY ABSENT AND NEVER "does not
decode", 🛑 NEVER CLAIM THE BYTES ARE DECODABLE (the `RMR` guard is a PRESENCE test), and 🛑 STATE
THE BOUND AS A PROPERTY OF THE READ AND NEVER OF CONTROL FLOW - "nothing open means silent" is FALSE
and NO LOOP OPEN is a DIFFERENT loss that stays silent.**

### 🩺 `X12-837-SV-UNDEFINED-DECIMAL` (2026-08-07) · `documentation/agent-notes/x12-837-sv-undefined-decimal.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ISA-ELEMENT-ARITY` trap at the top of this list.
**🩺 Open it before you touch an `X12Decimal | undefined` slot, `X12_835_BALANCE_NOT_EVALUABLE` or
`Build837ServiceLineSpec.units`: an undecoded TERM makes a §1.10.2 equation UNEVALUABLE and never a
mismatch, an EMPTY adjustment list is NOT an absent term, PUBLISH NO SLOT CENSUS, 🛑 A WIDENING THAT
MOVES A CASE ONTO A NEW CODE BLINDS EVERY PREDICATE ON THE OLD ONE AND THIS PACKAGE'S OWN DOCS ARE
SUCH A CONSUMER - SWEEP EVERY RECIPE AND PIN IT, and SV3-06's TR3 usage is NOT grounded.**

### 🩺 `X12-PAY-TO-FUSION` (2026-08-07) · `documentation/agent-notes/x12-pay-to-fusion.md`

**RELOCATED IN FULL 2026-08-10, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ISA-ELEMENT-ARITY` trap at the top of this list.
**🩺 Open it before you touch `payToAddress`, `attachContact` or `X12_837_PAY_TO_ADDRESS_REPEATED`:
each `NM1*87` OPENS ITS OWN ACCUMULATOR and occurrences are NEVER MERGED, 🛑 AN EMPTIED SLOT IS NOT A
NEUTRAL ABSENCE BECAUSE THE EMIT SIDE READS IT, the code counts within ONE Loop 2000A and a LATCHING
counter flags a conformant second billing provider, and NEVER write "a second party's NAME".**

### 🩺 `X12-837-LOOP-RESIDUALS` (2026-08-05) · `agent-notes/x12-837-loop-residuals.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-PRE-005010-RUNTIME-MESSAGE` trap at the top of this list.
**🩺 Open it before you touch an `LX`, a service-line drop or `X12_837_UNKNOWN_VARIANT`: THREE codes
in ONE family separated by their ANCHOR (`NOT_DECODED` / `DROPPED` at the `LX`, `SERVICE_SEGMENT_WITHOUT_LX`
at the SEGMENT because it CANNOT anchor there, never one twice, one document CAN carry all three, and
its condition is "no line open" and NEVER "the file has no `LX`"), 🩺 NEVER DECODE THE ORPHAN `SVx`
BUT NEVER WRITE IT DOES NOT NAME THE VARIANT (measured false, `PRE-EXISTING`), the suppression is
SCOPED and a LATCHING one silences every later orphan, and 🩺 ANCHOR `X12_837_UNKNOWN_VARIANT` AT THE
`ST` WITH NO `elementIndex`; ROUTE 1s DISCARD IS A TRADE, NEVER WIDENED, and NEVER cite
`X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` - it WARNS and retains.**

### 🩺 `X12-277-SVC07-NOT-DECODED` (2026-08-05) · `documentation/agent-notes.md#x12-277-svc07-not-decoded-2026-08-05`

- **🩺 277 `SVC-07` is usage `R` in X212, `S` in X214.** Read + emitted as `unitsOfService`;
  `build277` REFUSES a line without it, `build277CA` takes the same spec. An EMPTY one is still
  short a required element; **defaulting a count is inventing.**
- **🩺 SVC-05 / SVC-06 are `N` in BOTH 277 TR3s: emitted empty, left UNREAD** (the 835's SVC-05 IS
  its paid count). The TR3s NAME SVC-07 differently; ONE field carries both.
- **🩺 ONE usage fixed; a line is NOT thereby conformant. PUBLISH NO CENSUS: `SVC-01`/`SVC-02` are
  `R` in X212 and STILL optional, `SVC-03` too, READ side silent. CUT BACK, NEVER GUARD MORE.**

### 🩺 `X12-VARIANT-LOOKUP-PROTOTYPE` (2026-08-05) · `agent-notes/x12-variant-lookup-prototype.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-ISA-VALUE-POINTERS` trap at the top of this list. **🩺 Open it before you touch any lookup keyed
by DOCUMENT BYTES, `X12_837_SERVICE_LINE_DROPPED`, the `LX` case or a warning-channel assertion: a
table literal inherits `Object.prototype` so EVERY OWN PROPERTY of it resolved TRUTHY,
`Object.freeze` DOES NOT HELP, `in` IS NOT THE SAFE FORM, 🛑 NAME THE SET AND NEVER THE MEMBERS, and
NO SOURCE SCAN SHIPS.**

### 🩺 `X12-837-SV-SILENT-ZERO` (2026-08-05) · `agent-notes/x12-837-sv-silent-zero.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-PRE-005010-RUNTIME-MESSAGE` trap at the top of this list, on that trap's SECOND relocation.
**🩺 Open it before you touch a Loop 2400 line, `X12_837_SERVICE_LINE_NOT_DECODED` or a charge/units
slot: a line closed with NO `SVx` decoded for the RESOLVED variant warns at its `LX` (BOTH causes: a
foreign `SVx`, and none at all), THIS CLOSED ONLY THE SILENCE, 🩺 NEVER decode the `SVx` that IS
present nor let it flip the variant (units are `SV1-04`/`SV2-05`/**`SV3-06`**, `SV3-05` is the
PROSTHESIS code and three comments said units), `opts.type` is a CALLER INSTRUCTION so the warning
ATTRIBUTES NOTHING, anchor the `LX` and never the `SVx`, and 🩺 THE RESIDUAL TEST DID NOT GO RED AND
THAT WAS THE FINDING - pin the WHOLE channel, BOTH sides, only BYTES make these.**

### 🩺 `X12-QUANTITY-SILENT-DEFAULTS` (2026-08-05) · `agent-notes/x12-quantity-silent-defaults.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-NO-INTERNAL-REFS-GATE` trap at the top of this list, on that trap's THIRD relocation.
**🩺 Open it before you touch a decimal read, `X12_UNPARSEABLE_DECIMAL` or the optional warning
sink: a PRESENT decimal that does not decode warns at its `position.elementIndex` in all six
readers and an ABSENT one warns nothing, both pinned. 🩺 NEVER INVERT IT INTO "an unwarned value is
one the sender sent" - a slot a reader never read CANNOT warn, and three shipped docs carried the
bare form; the guarantee is unwarned AT AN ELEMENT A READER DECODED. PUBLISH NO CENSUS OF THE
FALLBACK OUTCOMES, ONE message with NO discriminant, and assert nothing about what X12.6 type R
permits. The 835 balance invariant is NOT a net (it names an equation, never an element). The sink
is an OPTIONAL 4th arg and the public helpers stay silent without one, held by a source scan
counting TOP-LEVEL ARGS and never a `, sink)` regex - A GREEN SUITE PROVED NOTHING, because no
fixture holds an unparseable decimal and a round trip CANNOT make one.**

### 🩺 `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (2026-08-04) · `agent-notes/x12-svc-element-map-off-by-one.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list. **🩺 Open it before you touch the 835 `SVC` map, `paidUnitsOfService` or
`originalUnitsOfService`: a round trip cannot test an element map and only bytes can, and checking a
spec claim against this repo's own implementation is NOT a check.**

### 🩺 `X12-DECIMAL-BYPASSES-THE-GUARD` (2026-08-04) · `agent-notes/x12-decimal-bypasses-the-guard.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-NO-INTERNAL-REFS-GATE` trap below.
**🩺 Open it before you touch `escDec`, `requireCallerDecimal`, `requireCallerSegment`,
`enforceBalance` or any `X12Decimal` slot: every such slot emits through `escDec` over
`requireCallerDecimal`, and 🩺 REFUSE, NEVER ROUND - guessing the scale of money is what
`X12Decimal` exists to prevent. TYPE safety is STRUCTURAL and DELIMITER safety is PER-SLOT: never
write the unqualified form, and never re-publish the completeness claim (its FOURTH iteration was
still wrong). `build835`'s balance-equation amounts refuse UNTYPED and every other `X12Decimal`
field refuses TYPED. 🩺 STATE THE RULE AND NAME SPEC FIELDS, NEVER ELEMENT NUMBERS - two remedies
published a closed list and an element-number list and both were measured wrong. `buildTA1` uses
NEITHER `seg` NOR `joinSeg`, the fixed-width ISA line is outside BOTH guards, ASSERT THE MESSAGE and
never the class (four of six cases were vacuous that way), never bound a loop with
`i < parts.length` over a caller array-like, and the pinned `esc` counts are MEASUREMENTS, not
rules.**

### 🩺 `X12-NUMERIC-VALUE-EMITS-EMPTY` (2026-08-03) · `agent-notes/x12-numeric-value-emits-empty.md`

**RELOCATED IN FULL 2026-08-11, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-NO-INTERNAL-REFS-GATE` trap at the top of this list, on that trap's SECOND relocation.
**🩺 Open it before you touch `makeCallerEscaper`, `escapeRelease`, `renderCallerValue` or any
builder's `esc`: every builder that declares an `esc` takes it from `makeCallerEscaper`, which
type-checks first and refuses with the calling module's own typed, code-tagged error - NO COUNT
HERE, the gate holds it and "nine" outlived the ninth. 🩺 REFUSE, NEVER COERCE, and that is the
whole item: coercion mints a DIFFERENT identifier and reassociating to the wrong claim is worse than
failing to reassociate, so check the TYPE and never the sentinel. The `renderCallerValue` COERCES /
`esc` REFUSES asymmetry is DELIBERATE (survive anything vs invent nothing). 🛑 NEVER PUBLISH AN
EXHAUSTIVE CENSUS OF WHAT BYPASSES THE CHOKEPOINT - three drafts did and a refuter measured all
three false by finding one more each time; CUT THE CLAIM BACK, DO NOT GROW THE CENSUS, and finding
one more is expected rather than a new finding. A gate asserting a same-line REGEX pins against
drift and says nothing about the property. Exported `escapeRelease` THROWS `TypeError` on a
non-string now, and "no working caller is broken" was too absolute.**

### `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` (2026-08-03) · `agent-notes/parser-testtimeout-asserts-an-idle-box.md`

**RELOCATED IN FULL 2026-08-08, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list. **🩺 Open it before you touch `testTimeout`, a timing figure or `attw-gate`: it is NOT the
liveness net people assume** - an infinite synchronous loop gives NO verdict and wedges the worker.

### 🩺 The `phi-scan` gate · `PHI-SCAN-SYMLINK-BLIND-ON-BOTH-ROUTES` (2026-08-03), `PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT` + `PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL` (2026-08-06), `PHI-SCAN-WALK-ROOT-SCOPE` (2026-08-08) · one `agent-notes.md` section per id, the last `agent-notes/phi-scan-walk-root-scope.md`, + `#phi-commit-gate-armed-2026-06-28`

- **🩺 Both enumerating routes REFUSE a symlink (exit 2), naming every offender**; neither FOLLOWS an
  ENTRY it enumerated. Say ENTRY, not "anything": **a walk ROOT that is itself a link IS followed** -
  a superset - **🔴 and NOTHING under it is RECONCILED**, so an EMPTIED target reads **exit 0**.
  PRE-EXISTING, OPEN; `PHI-SCAN-WALK-ROOT-SCOPE` MOVED IT UP A LEVEL, not closed. **The closure is
  "within the declared roots", NOT a universal. A refusal NEVER reports the link target** - a
  diagnostic ABOUT a leak is a PHI surface.
- **▶ 🩺 THE `--staged` ARGV IS THE GATE, EVERY FLAG LOAD-BEARING; NEVER SHORTEN IT. ONE RULE: DO NOT
  TRUST THE CALLER'S GIT CONFIG.** Five holes, all exit 0 over PHI, closed by
  `--no-renames --ignore-submodules=none --diff-filter=AMTUB`. **`U` is closed by the FILTER, not
  `--no-renames`; never conflate them. Never add `-M`, `-C` or `--find-copies-harder`** - each
  re-empties it. **No test may run `git merge`**; stage the conflict with `update-index`.
  **QUOTE THE CLASSIFICATION, NEVER THE LETTER: a broken pair is `B` WHATEVER LETTER IT PRINTS.
  NEVER RECORD A SIMILARITY SCORE** - it drifts; **DELETE a drifting number, never correct it.**
  **"Strict superset" REFUTED; EQUAL absent a rename/copy/gitlink/unmerged path.**
- **▶ 🩺 ALL MODE OWES AN ACCOUNT OF ITS ROOTS. TWO RULES, NEITHER IMPLIES THE OTHER, BECAUSE
  EXISTENCE IS NOT OBSERVATION:** a declared directory must BE one, and every tracked non-`.md` file
  under a walk root must have been ENUMERATED against `git ls-files`. Both exit 2. **A COUNT CANNOT
  DO IT. 🛑 `REQUIRED_DIRECTORIES` IS NOT `WALK_ROOTS`; NEVER FOLD IT BACK IN** - walk roots must
  stay DISJOINT (nested ones double-report), that list need not be; folding them cost a grid cell.
  **SAY "A DIRECTORY", NEVER "ENUMERABLE"** - a TYPE check; an unreadable one throws uncaught at
  **exit 1** (PRE-EXISTING). **CUT THE CLAIM BACK, NEVER GROW THE GUARD.** A root's OWN index entry
  is EXEMPT (relocated narrative §9); **its control MUST COMMIT its corpus.** `git check-ignore`
  reads the INDEX: a TRACKED ignored file is SCANNED, its absence REFUSES; no git, REFUSE.
  **RE-DERIVE EVERY EXIT CODE PER REPO** - a regular-file root is **2** here (was **1**, uncaught),
  **2** in `hl7`, **1** in `terminology` by a DIFFERENT mechanism.
- **Synthetic tokens are POSITIVELY DECLARED in `scripts/phi-allow-list.txt`, byte-strict, no inline
  header; a whole-file bypass needs `--allow-fixture` AND an entry in `phi-scan-overrides.md`.
  🛑 AN ENTRY IS GLOBAL AND ROUTE-BLIND** - it clears that literal on `--staged`, the
  COMMIT-BLOCKING route, too. **Fix a plausible name in the FIXTURE, never by declaring it.**
- **▶ 🩺 `PHI-SCAN-WALK-ROOT-SCOPE` IS TWO SIDES, EACH "IN ADDITION TO", NEVER "INSTEAD OF".** Roots
  `test` + `src`, `--staged` `test/**` + `src/**`, both widened **BY UNION**; **NO exemption on any
  route** (`dicom#98`). Enumerating buys **only the `scanCommonShapes` floor - THREE detectors, not
  the two a draft named** (`REF*SY`'s **UNDASHED** SSN is not segment-aware).
  **DERIVE THE CENSUS FROM `git ls-files`; PUBLISH NO COUNT HERE.** **`looksLikeX12` asks whether the
  file _IS_ an interchange**, so inline `.ts` fixtures holding segment text reached NO segment-aware
  detector; `scanEmbeddedSegments` is the other side. **IT IS A TRIPWIRE, NOT A PARSER: NEVER PUBLISH
  A CLOSED COUNT OF WHAT IT MISSES** - a draft said "four bounds", a refuter found two more in one
  pass. **🩺 `'` MUST NOT BE A RUN STOP** - it TRUNCATED the run, losing a surname AND whatever
  followed it - **but its absence has a PRICE, so never write that the shape predicates "handle" the
  overrun.** **`\p{L}` buys MIXED-SCRIPT elements ONLY** - `nameTokens` still drops a token with no
  ASCII letter, on BOTH routes. Its narrowings are **EMBEDDED-ONLY; `.edi` is unchanged.**
  **A BUILDER SPEC OBJECT is segment text to nobody** - found by hand-reading, not by the gate.
- **▶ 🛑 THIS GATE'S OWN CONTROLS ARE ASSEMBLED WITH `seg(...)`, NEVER LITERAL SEGMENT TEXT; WRITE
  THE NEXT ONE THE SAME WAY.** Declaring them disarms the detector they prove; a literal-path
  exemption would have to reach `--staged` or the file could never be committed again. **STILL OPEN:
  the enumerate-then-read race, the reason being DIRECTION** (relocated narrative §9) - x12 escaped
  it by a **scope accident**, and **this widening reintroduced it.**

### 🩺 `X12-CALLER-VALUE-RESIDUALS` (2026-08-02) · `agent-notes/x12-caller-value-residuals.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of
this list. **🩺 Open it before you touch `renderCallerValue`, `renderCallerJson`,
`requireCallerArray` or any indexed loop bound in a `build*` module: a forged array-like coerces to
`Infinity` and the builder SPINS FOREVER instead of refusing, and removing a guard WEDGES its
negative control rather than reddening it.**

### `X12-BUILDER-BOUNDS` (2026-08-02) · `agent-notes/x12-builder-bounds.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list. **Open it before you touch `renderCallerValue`, `BUILD_REFUSAL_VALUE_MAX_RENDERED` or any
`build*` refusal message: a fragment is BOUNDED, NOT redacted, and `segmentIndex: 0` is the `ST`,
never a neutral sentinel.**

### 🩺 `X12-ORPHAN-REEMIT` (2026-08-02) · `agent-notes/x12-orphan-reemit.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list. **🩺 Open it before you touch orphan placement or `SE-01`: an orphan is placed by its ANCHOR
and NEVER by `segmentIndex`, and `SE-01` counts the BYTES THE SERIALIZER WRITES, not the model rows.**

### 🩺 `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` (2026-08-02) · `agent-notes/x12-segment-outside-transaction-dropped.md`

**RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of
this list. **🩺 Open it before you touch orphan placement or retention: an orphan is RETAINED on
`orphanSegments` and NEVER replayed at its recorded `segmentIndex`, which indexes the INPUT stream
and splices it into whatever occupies that slot on emit.**

### 🩺 `PHI-WARNING-MESSAGE-LEAK` (2026-07-31) · `documentation/agent-notes.md#phi-warning-message-leak-2026-07-31`

- **🩺 NO warning factory takes a value parameter.** Each takes an `X12Position` plus, where one code
  covers several situations, a library-owned discriminant (`CONTROL_NUMBER_PAIRS` /
  `UNEXPECTED_SEGMENT_CONTEXTS` / `BALANCE_INVARIANTS` / `REQUIRED_LOOPS`), and `message` is a lookup
  into a frozen table exported as `ALL_WARNING_MESSAGES`.
- **🩺 Shape-validate-then-echo CANNOT hold for a control number**, whose grammar is whatever the
  trading partner sent (what leaked, and where: relocated narrative §8).
- **`snippet` stays on the four Tier-3 fatals and nowhere else** - a strict-mode escalation used to
  carry 64 bytes of the interchange.
- **`X12Segment.id` is bounded to the segment-id grammar with a `NON_SPEC_SEGMENT_ID` sentinel**
  (what it was: relocated narrative §8).
- **The deliverable is the SLOT TABLE, not the fix.** `test/_helpers/phi-slots.ts` sweeps every
  consumer-controlled slot via `assertNoDiagnosticPhiLeak`; **the GREEN ones are the point of writing
  the table before the fix** (never quote its size - derive it). **Registry membership is asserted
  SEPARATELY**, which is what catches a factory nobody extended the table for.
- **`^0.0.1` resolves EXACTLY on npm for a `0.0.x`.**
- **The shipped disclosure was wrong in several places at once** (relocated narrative §7).
  **Correct the disclosure in the same commit as the fix that makes the new wording true.**

### 🩺 Per-transaction invariants that shipped with the phases · `agent-notes/per-transaction-invariants.md`

**RELOCATED IN FULL 2026-08-08, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-TA1-EMIT-NOT-RELEASE-AWARE` trap above, under this file's own ratchet (relocate first, lower the
entry as it lands, never raise). **Open that file before you change any surface a phase built; the
imperatives are live and they are THERE, not here.** What is in it, so you know when you need it:
v1 profiles are DESCRIPTIVE and a quirk with no Tier-2 fixture is FORBIDDEN; the profile API diverges
from `hl7` deliberately; the 820 carries no balance equation and `build820` never refuses one;
maintenance type is the 834's safety primitive and the 278 certification decision is response-only;
TRN echo is VERBATIM and never fabricated; the HL spine is COMPUTED per builder, with the 278's EV/SS
review level the ONE caller-supplied HL-03; the read side never silently re-numbers a broken HL
pointer; composite-emitting builders emit the envelope INLINE; `splitSegments` is release-aware;
control NUMBERS are identity and are never rewritten; every money / percent / quantity field is
`X12Decimal`; the 835 is NEVER silently rebalanced and PLB carries the RAW EDI sign; an unknown code
is preserved and warned, never normalized (NAME THE RULE, NEVER THE MEMBERS); acks are structurally
PHI-free and never auto-send; `build999` / `buildTA1` refusals; per-builder refusal messages carry
structural locators ONLY, stated PER BUILDER; NO caller guard echoes a caller's element value; the
`?`-release escape is honored losslessly; and `KNOWN-LIMITATIONS.md` is the canonical read-side list.

### `ASSETS-P8`: the `attw` gate lies · `agent-notes/assets-p8-attw-gate.md`

**RELOCATED IN FULL 2026-08-08, VERBATIM, NOTHING DROPPED** - it paid for the trap at the top of this
list, with the section above. **🩺 `attw` prints "does not contain types" and EXITS 0**, so the
`attw` script is `scripts/attw.mjs`, a wrapper, NEVER the bare CLI - a broken publish reported as a
pass. Open that file before you touch `scripts/attw.mjs`, `verify.sh` or the attw gate test.

## Standing disciplines (every change)

**Three are the meta-repo's, mirrored from its `documentation/conventions.md`, which is the source of
truth**: docs follow code; version + changelog (a Changeset, `patch`, `0.0.x`) every meaningful
change; and the crew / knowledgebase feedback loop. Their full text is in
`documentation/agent-notes/claude-md-relocated-narrative.md`.

**A fourth is this repo's own, added by `CLAUDE-MD-AUDIT`:** narrative from an incident, a refutation
or a shipped phase goes in **`documentation/agent-notes.md`**, or, once THAT file is on its own
budget, in **`documentation/agent-notes/<slug>.md`**; only its imperative comes back here. **The
ratchet is a ceiling, not a target** - `hl7`, the parser this one mirrors, is 8 KB. **Relocate BEFORE
you write the trap, and pay any trap the last slice left owed** - two consecutive slices did not, and
by the third there were five bytes left and three traps owed.
```

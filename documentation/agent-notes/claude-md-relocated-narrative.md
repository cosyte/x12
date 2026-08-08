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
>   value, never fold the decimal one back out. And state the two things this does NOT say, both
>   drafted false once:** the array guard STILL renders a forged array-like's `length` and class tag
>   (SHAPE, not element contents); and **only the SEGMENT guard names the slot** - `esc`/`escDec`
>   name the BUILDER, so there nothing replaces the value as a locator. Its locator admits
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
deleted.** The umbrella still owes the matching ratchet drop to **52,716**, which lives in
`.claude/hooks/doc-budget.mjs` and is outside this repo. **No count of the pieces is published here** - a
drifting number is deleted rather than corrected, and the subsections below are the list.

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

The bullet still says all nine builders take `esc` from `makeCallerEscaper`, which type-checks
first and refuses with the calling module's own typed, code-tagged error. What moved is the
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

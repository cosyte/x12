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

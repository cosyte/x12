# x12 - grounding `VARIANT_BY_ICR` (`X12-VARIANT-ICR-UNGROUNDED`, 2026-08-08)

The item `#87` and `#88` each said had to come before the next 837 slice. Base `668afea`, which is `main` at published `0.0.13`.

**This was commissioned as a GROUNDING unit with two acceptable outcomes: ground the key set from
publicly-citable information, or record with evidence that it cannot be grounded.** It could be
grounded, and the answer is that the shipped table was materially wrong.

## 🛑 What the record was before this, and what it is now

`#87` pass 2 named the ungrounded key set as the thing that most worried it and recorded its own
recollection as **`UNDETERMINED`, explicitly not a citation** - which was the right call. **Nothing
below restates that recollection.** Every identifier here has a source named beside it, and the two
that are weakest say so.

## What was searched

Searched, in this order, for a public statement of which ASC X12N 837 implementation-convention
references are adopted and which appear in ST-03 / GS-08 on real traffic:

1. **45 CFR 162.1102** (the HIPAA transaction-standards adoption record) - `ecfr.gov` redirected
   away; retrieved instead from Cornell LII's copy of the section, read paragraph by paragraph.
2. **govinfo.gov** CFR XML for the same section - 404, not used.
3. **x12.org** - the technical-reports index (does not enumerate identifiers) and
   `x12.org/examples/005010x222`, which does name the base guide.
4. **CMS.gov** companion guides - every direct PDF fetch returned HTTP 403; used only through
   search-result text, and **not relied on as a sole source for anything below**.
5. **Payer companion guides that could actually be retrieved and read**: the Arizona AHCCCS 837
   standard companion guide and the Louisiana Medicaid 5010 EDI general companion guide. Both were
   read as PDFs, not summaries.
6. **A public X12 HIPAA guide catalog** for which errata guides exist as published documents.

## What could be grounded

### Primary, regulatory - the adoption record

45 CFR 162.1102(c) adopts, for the period from January 1, 2012 through August 14, 2027, "the
standards identified in paragraph (b)(2) of this section". Those standards, quoted from (b)(2):

- **(iii) Professional health care claims.** "ASC X12 Standards for Electronic Data Interchange
  Technical Report Type 3, Health Care Claim: Professional (837), May 2006, **ASC X12N/005010X222**".
- **(iv) Institutional health care claims.** the same TR3 for Institutional, **ASC X12N/005010X223**,
  "and Type 1 Errata to Health Care Claim: Institutional (837) … October 2007,
  **ASC X12N/005010X223A1**".
- **(ii) Dental health care claims.** **ASC X12N/005010X224**, "and Type 1 Errata to Health Care
  Claim: Dental (837) … October 2007, **ASC X12N/005010X224A1**".

**🩺 Cite `(c)`, not `(e)`, and a pass-1 refuter caught this slice citing `(e)`.** Paragraph `(e)` is
prefaced "For the period from **August 14, 2027 through April 14, 2028**" and `(f)` follows it; both
name the same three guides, so the substance was right and the clause was not. The provision in force
on the date this was written is `(c)`, which adopts `(b)(2)`. For a unit whose whole deliverable is
grounding, the wrong paragraph is exactly the defect the unit exists to prevent.

**🛑 The section names no `A2` or `A3` guide anywhere, and it does not name `005010X222A1`.** So the
adoption record cannot ground any of the three keys the table shipped with, and **the shipped table
held none of the five identifiers this record does name.**

### Primary-adjacent, X12's own site

`x12.org/examples/005010x222` gives the base guide as "837, Health Care Claim: Professional",
identifier `005010X222`. That grounds the stem-to-claim-type mapping directly.

### What production traffic actually carries, read from payer companion guides

**Arizona AHCCCS 837 standard companion guide**, three separate transaction sections, verbatim:

| section | GS-08 "Version Identifier Code" | ST-03 "Implementation Convention Reference" |
| --- | --- | --- |
| Professional | `Expect 005010X222A1` | `Expect 005010X222A1` |
| Institutional | `Expect 005010X223A2` | `Expect 005010X223A2` |
| Dental | `Expect 005010X224A2` | `Expect 005010X224A2` |

**Louisiana Medicaid 5010 EDI general companion guide**, supported-transactions table, verbatim:
"Health Care Claim: Dental `ASC X12N 837-005010X224A2`; Health Care Claim: Professional
`ASC X12N 837-005010X222A1`; Health Care Claim: Institutional `ASC X12N 837-005010X223A2`."

Two independent payers, agreeing, both read from the source document rather than a summary.

### The weakest leg, and it is labelled as such in the code

`005010X222A2`, `005010X223A3` and `005010X224A3` exist as **published errata guides**. The first
draft of this note cited only a public guide catalog for them and called that the weakest leg; the
pass-1 refuter found a better source and it is used instead. **X12's own RFI #2334 ("5010 - 837
P,I,D-CLM limit") names all three together**, verbatim: "The CLM TR3 Notes in the 005010X222A2,
005010X223A3 and 005010X224A3 TR3s state …". That is X12 naming its own published guides, which is
the strongest available evidence that they exist and are the current errata of each family.

**It is still the weakest leg of the three, and for a different reason than the draft gave.** What it
establishes is existence, not use and not adoption: **these three are NOT adopted by 45 CFR 162.1102,
and no companion guide read for this unit requires any of them.** Two were already in the shipped
table; `005010X224A3` was added because the same RFI names it beside the other two, and never on the
strength of a pattern.

## What could NOT be grounded

- **No primary X12 publication record was reachable** listing every published 837 errata with its
  designation. `x12.org` does not enumerate them publicly and its Glass viewer was not used.
- **No source was found that makes the key set provably exhaustive.** The code therefore says the set
  is not claimed exhaustive, and neither the registry messages nor this note publish a count of it.
- **Nothing grounds a normalisation rule.** No source says an ST-03 may be lower-cased, trimmed or
  matched by prefix, so none of that is done: the table is a literal list and a control pins that
  `005010x222a1`, `" 005010X222A1"` and `005010X222A9` all still fall through.

## 🩺 The frequency claim, and it CHANGED

The item asked whether `X12_837_AMBIGUOUS_VARIANT` is the exception or the normal path. **Measured:
it was the NORMAL path on production professional and institutional traffic through `0.0.13`.** An
837P carrying the ST-03 that CMS and both companion guides above require - `005010X222A1` - resolved
to no variant, fell through to the `SVx` scan, and was typed by whichever service segment came first
in the body, orphans included. `X12_837_UNKNOWN_VARIANT` on such a file was **a fabricated
non-conformance claim about a document that was not non-conformant** - the same failure shape
`X12-VARIANT-LOOKUP-PROTOTYPE` fixed for `HL-03`, where an incomplete wire-keyed table made the
walker accuse a conformant document.

That is also why the fix is a table correction rather than a message re-wording: the honest remedy
for "this fires on the normal path" is to stop firing on the normal path.

## What shipped

`VARIANT_BY_ICR` now holds every identifier cited above: the three base guides, the two adopted
October 2007 errata, the three errata production traffic carries, and the three later published
errata. **Precedence is untouched** - resolution is still
`explicitType ?? variantFromIcr ?? variantFromSegment`, and the order was already right; only the
table was short.

Both frozen registry messages **stopped enumerating the set**. Each named the three keys literally,
so each was wrong the instant the table was grounded, in a string consumers had already read. They
now describe the set and never list it, and `test/transactions-claim-837-variant-icr-grounding.test.ts`
carries a tripwire that reds if any registry message quotes a TR3 identifier again. **That tripwire
has its own negative control**, because a first draft read `ALL_WARNING_MESSAGES` - a `Set` - with
`Object.entries`, which yields `[]`, so it passed while measuring nothing.

## 🛑 This IS a behaviour change on already-published decoding, and it is disclosed as one

The `SVx` fall-back is **not narrowed**: first-wins still takes the first service segment in the
body, orphans included, on every document that still reaches it. What changed is **which documents
reach it**.

**🩺 State it as ONE property and never as a census of consequences. A first draft published a closed
list of three and a pass-1 refuter measured it false by finding a fourth**, which is this repo's
recorded failure mode for exhaustive lists (`X12-NUMERIC-VALUE-EMITS-EMPTY`: three drafts, three
refutations, one more found each time). The property:

> **Where ST-03 is now recognised, the document's own declaration decides the variant instead of its
> first service segment**, and everything downstream follows from that one substitution.

What follows from it, listed as examples and not as a bound:

1. **`submission.variant` can differ** where the first `SVx` disagreed with the declaration. That
   case was a mis-read: the document declared itself and a stray segment overrode it.
2. **`X12_837_AMBIGUOUS_VARIANT` stops firing** on such a document - no guess is made, so there is no
   ambiguity to report.
3. **`X12_837_UNKNOWN_VARIANT` stops firing** on a declared file with no `SVx`.
4. **🩺 A service line whose `SVx` kind disagrees with the declaration is no longer DECODED, and a
   code STARTS firing.** Found by the pass-1 refuter; the readings below were re-measured here rather
   than quoted. Under ST-03 `005010X222A1` with a body whose only service segment is an `SV2`, base
   read `variant "I"`, `charge "7300"`, `units "2"` and `warnings: []`; head reads `variant "P"`,
   `charge` and `units` `undefined`, and `["X12_837_SERVICE_LINE_NOT_DECODED"]` at the line's `LX`.
   **A mis-stamped envelope is an ordinary vendor variant, and this reader can no more tell a
   mis-stamped ST-03 from a conformant one than it can tell a stray `SVx` from a conformant one.**
   The loss is warned rather than silent, and `docs-content/cookbook.md`'s post-a-line-amount gate
   already names `X12_837_SERVICE_LINE_NOT_DECODED` first, so a consumer following the shipped recipe
   catches it. Pinned with the charge value and a whole-channel `toEqual`.

   **🩺 STATE ONLY THE DECIMAL SLOTS AS `undefined`, AND THE POLARITY REVERSES BY VARIANT.** A pass-2
   refuter measured this and it cost four consumer-facing surfaces. An undecoded line SEEDS its
   identity fields, so on a **P** or **D** line `procedureCode` is **`""`** while `revenueCode` is
   absent, and on an **I** line `revenueCode` is **`""`** while `procedureCode` is a PRESENT SLOT
   READING `undefined` (`Object.hasOwn` is true for it, and false for `revenueCode` on P and D).
   **The word is load-bearing here** - `undefined` means not decoded, never absent. Only
   `charge` and `units` are `undefined` on all three. **`KNOWN-LIMITATIONS.md`'s standing sentence
   "`undefined`, not `""`, which on such a line is the `revenueCode`" is about the I case and DOES
   NOT PORT to P or D.** A consumer predicate of `procedureCode === undefined` detects this on
   neither of the two variants this slice is mostly about. Pinned per variant in
   `test/transactions-claim-837-variant-icr-grounding.test.ts`; the earlier draft was green over the
   false claim precisely because the helper asserted `charge` / `units` and nothing else.

   **🛑 And a claim about what a refuter measured is itself a claim.** The draft attributed
   `procedureCode undefined` to the pass-1 refuter "verbatim". The refuter had printed `charge`,
   `units` and `revenueCode` and never read `procedureCode` on that line, so an unmeasured value was
   laundered as measured, and attributed to the gate. **Never write "the refuter measured X" for
   anything you did not watch it print.**

Consequences 2 and 3 blind a consumer predicate written against those codes, and 4 moves a document
onto a code it did not carry, which is the hazard
`#83` was refuted for. It is taken deliberately here and in the opposite direction from `#87` and
`#88`: those two refused to narrow a fall-back because narrowing would change how published documents
decode on evidence the reader does not have. **Here the reader does have the evidence - it is in
ST-03 - and was ignoring it.** Continuing to ignore a document's own declaration to keep two warnings
firing would be preserving a mis-read for the sake of a predicate.

## What this slice did NOT close

- **🩺 The EMIT side is untouched, deliberately, and it is now a named residual.** `build837P` /
  `build837I` / `build837D` stamp `005010X222A2` / `005010X223A3` / `005010X224A2` into ST-03 and
  GS-08 from `VERSION_BY_VARIANT`, and **a caller cannot override it**. Two of those are not what the
  companion guides above require, so a partner that requires `005010X222A1` or `005010X223A2` will
  reject what this builder emits. **Not re-stamped here:** which published guide identifier a trading
  partner accepts is a partner fact, not a spec fact, and changing bytes this library already emitted
  would break the partners it works with today. Disclosed in `KNOWN-LIMITATIONS.md` and in
  `Build837EnvelopeSpec`'s own doc comment; the remedy is a caller-supplied override, which is a
  public-surface addition and its own slice.
- **`SV3-06`'s TR3 usage is still not grounded** and nothing here claims it is. Untouched.
- The five `PRE-EXISTING` residuals in `X12-837-RESIDUALS`. Untouched.
- **`documentation/agent-notes.md` was left alone.** Its `X12-837-LOOP-RESIDUALS (2026-08-05)`
  section measures a document with an ST-03 of `005010X222A1` on both trees. That is a dated archive
  snapshot of a measurement, true when taken, and the same judgement `#88`'s pass-3 refuter applied
  to the "still silent" sentences in that file applies to it. It is also at its budget.

## Census and controls

Head's new suite was run against a base `src/` restored from `668afea` **by file copy, never
`git checkout`**. **12 of 29 cases red at base; the 17 green are exactly the controls** - every "does
not resolve" case, the fall-back-not-narrowed case, the precedence case and the message-shape case.
Note that the three keys the table ALREADY held are red at base too, because every case in section 1
now also asserts the fourth consequence, which base does not produce. **Negative control:** the same
suite against `hl7`'s `src/` fails all 29 with `parseX12 is not a function`, so what was measured was
`x12` and not a stale scratch artifact. **Re-derive both figures by running, never by arithmetic.**

**Three test files stopped using `005010X222A1` as their non-resolving ST-03** and use
`004010X098A1` instead - the 4010 professional addenda reference, named at 45 CFR 162.1102(a)(3), of a
version this library's v1 scope deliberately excludes. **That substitution is the whole reason those
files' 14 cases went red**, and each file's constant carries the reason inline, because when a
document narrates a test, an edit to the test is an edit to the document.

**No census count, no partition of the whole suite and no suite total is published here beyond the
28-case file this slice added, which is a property of that file.** Derive the rest.

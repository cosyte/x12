# x12 - grounding `VARIANT_BY_ICR` (`X12-VARIANT-ICR-UNGROUNDED`, 2026-08-08)

The item `#87` and `#88` each said had to come before the next 837 slice. Base `668afea`
(published `0.0.16`).

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

45 CFR 162.1102(e)(2), quoted from its own text:

- **(iii) Professional health care claims.** "ASC X12 Standards for Electronic Data Interchange
  Technical Report Type 3, Health Care Claim: Professional (837), May 2006, **ASC X12N/005010X222**".
- **(iv) Institutional health care claims.** the same TR3 for Institutional, **ASC X12N/005010X223**,
  "and Type 1 Errata to Health Care Claim: Institutional (837) … October 2007,
  **ASC X12N/005010X223A1**".
- **(ii) Dental health care claims.** **ASC X12N/005010X224**, "and Type 1 Errata to Health Care
  Claim: Dental (837) … October 2007, **ASC X12N/005010X224A1**".

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

`005010X222A2`, `005010X223A3` and `005010X224A3` exist as **published errata guides** and appear in
payer guides, but the citation for their existence is a public guide catalog rather than a primary
X12 publication record. **They are not adopted by 45 CFR 162.1102 and this note does not claim they
are.** Two of them were already in the shipped table; `005010X224A3` was added for symmetry with
them, at the same strength of evidence, and never on the strength of a pattern.

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
it was the NORMAL path on production professional and institutional traffic through `0.0.16`.** An
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
reach it**. Three consequences, each pinned:

1. **`submission.variant` can differ** where ST-03 is now recognised and the first `SVx` disagrees
   with it. That case was a mis-read: the document declared itself and a stray segment overrode it.
2. **`X12_837_AMBIGUOUS_VARIANT` stops firing** on such a document - no guess is made, so there is no
   ambiguity to report.
3. **`X12_837_UNKNOWN_VARIANT` stops firing** on a declared file with no `SVx`.

Consequences 2 and 3 blind a consumer predicate written against those codes, which is the hazard
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
`git checkout`**. **11 of 28 cases red at base; the 17 green are exactly the controls** - the three
keys the table already held, every "does not resolve" case, the fall-back-not-narrowed case and the
precedence case. **Negative control:** the same suite against `hl7`'s `src/` fails all 28 with
`parseX12 is not a function`, so what was measured was `x12` and not a stale scratch artifact.

**Three test files stopped using `005010X222A1` as their non-resolving ST-03** and use
`004010X098A1` instead - the 4010 professional addenda reference, named at 45 CFR 162.1102(b), of a
version this library's v1 scope deliberately excludes. **That substitution is the whole reason those
files' 14 cases went red**, and each file's constant carries the reason inline, because when a
document narrates a test, an edit to the test is an edit to the document.

**No census count, no partition of the whole suite and no suite total is published here beyond the
28-case file this slice added, which is a property of that file.** Derive the rest.

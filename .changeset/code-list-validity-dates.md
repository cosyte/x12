---
"@cosyte/x12": patch
---

The bundled CARC and RARC snapshots now carry the maintainer's per-code dates,
and two new queries answer whether a code was valid on the day a document was
produced rather than only whether this package bundles it. Nothing about what
this package parses or emits moves with it.

**Why a date-aware answer is a different question.** 45 CFR 162.1011 scopes a
code set's validity to the dates the organisation maintaining it publishes, and
`x12.org` publishes a Start, a Last Modified and, for a retired code, a Stop
date for every code on both lists. Until now a code the maintainer retired years
before a remittance was produced came back with a confident description and no
signal at all. Bundled CARC 15 is exactly that case: it was stopped on
2018-05-01 and this subset has been shipping it as though it were current ever
since.

**What is new.** `CARC.dates` and `RARC.dates` map each bundled code to its
`start`, and to its `lastModified` and `stop` where the maintainer publishes
them, as ISO `YYYY-MM-DD` calendar days. The same dates ride onto the entry
`lookupCarc` and `lookupRarc` return. `checkCarcValidity(code, documentDate)`
and `checkRarcValidity(code, documentDate)` answer `valid`, `not-valid` or
`indeterminate`, with `CODE_VALIDITY`, `CODE_VALIDITY_REASONS`,
`CodeValidityResult`, `CodeListEntryDates`, `DatedCodeListMeta` and
`DatedCodeListSnapshot` exported alongside them.

**Three answers, and never `valid` for want of evidence.** `indeterminate` is a
real answer with a named reason: the code is outside the bundled subset, or it
is inside it with no published start date. An absent code comes back with its
own bytes echoed verbatim, no description, and no validity claim. An inherited
object-prototype key is an absent code on the new query exactly as it is on the
existing lookups.

**A document date is a calendar day.** `YYYY-MM-DD` and the wire form
`CCYYMMDD` are accepted and checked against the real calendar, so `20260631` and
`2026-02-30` are refused with the new typed `X12CodeListError` rather than
silently rolling over. A JavaScript `Date` is an instant, and turning one into a
calendar day needs a timezone this library will not guess, so it is refused too.
No comparison here builds a `Date` or reads a timezone.

**Where the Stop date's boundary is read.** The maintainer does not state
whether a published Stop date is the last valid day or the first invalid one.
This package reads it as the first invalid day, making the valid interval
half-open, and `KNOWN-LIMITATIONS.md` records that as a judgement rather than a
fact.

No code was added to or removed from either subset and no bundled description
changed, which the suite asserts code by code and string by string. Every other
bundled code list keeps the exported values and the lookup behaviour it had.

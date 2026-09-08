---
"@cosyte/x12": minor
---

Three new package-root exports, `toObject`, `toISO` and `toDate`, read a date
off any typed reader without the caller cutting the digits apart by hand at the
call site. Every `@cosyte/*` parser now exports the same three names with the
same return shapes and the same timezone rule, so moving between packages costs
nothing to relearn. `DateParts`, `ToDateOptions` and `X12DateValue` are exported
alongside them, from the package entry point, with no subpath import.

**It adds a read route and changes nothing that already exists.** No exported
name is removed, renamed or altered, `parseDocumentDate` keeps its own contract
including its throwing one, no parse and no emit behaviour moves, and there is
still not a single runtime dependency. The engine floor stays `>=22.0.0`.

**One surface over every date carrier.** The parameter is structural, so all
eight `X12*Date` types this package exports are accepted through the same three
names with no per-transaction variant: `X12ClaimDate`, `X12InquiryDate`,
`X12EligibilityDate`, `X12StatusInquiryDate`, `X12StatusDate`, `X12PremiumDate`,
`X12EnrollmentDate` and `X12AuthDate`. A ninth carrier added later needs no
change here.

**It decodes exactly what this package already parses or builds, `D8` and
`RD8`, and invents nothing.** Those are the only two DTP-02 values that appear
anywhere in `src/`. `D8` is a single `CCYYMMDD` day and converts to
`{ year, month, day }`, with `month` spec-native 1 to 12. A qualifier outside
that pair, an absent one, a value whose digits do not match the shape its own
qualifier declares, and a day that is not on the calendar all convert to
`undefined`. None of the three ever throws, so a lenient parse stays lenient all
the way to the value a consumer reads.

**`RD8` converts to `undefined` from all three, deliberately.** An interval is
not a point in time, so there is no single day, no single string and no single
instant for a service period or an eligibility span. Returning the first
endpoint would be a quiet wrong answer with a right-looking shape, which on a
service date is a clinical value read wrong. A caller who knows which end they
mean splits the range and converts that.

**`toDate` returns an instant only when the caller states the zone.** No X12
date element this package decodes carries a UTC offset, so
`assumeOffsetMinutes`, signed minutes east of UTC, is the only route one takes
into the result. Without it the answer is `undefined`: the host machine's
timezone is never read and UTC is never assumed. That is the stance
`parseDocumentDate` already took for the date-aware code-list queries, and this
extends it to the read side rather than softening it. A four-digit year below
100 stays that year, so `0050` is year 50 and never 1950.

**Backed by the conformance suite every sibling parser carries.** The same
eleven-row case table is exercised at `test/conversion-surface.test.ts`, so a
divergence between the packages is a failing test rather than something a
consumer discovers. Five of its rows are recorded as skips with a written
reason, because this package decodes no year-precision form, no time of day, no
fraction of a second and no UTC offset, and each of those reasons is backed by a
live test that measures the property rather than asserting it in a comment.

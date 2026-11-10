---
id: read-dates
title: Read a date off any typed reader
sidebar_label: Read dates
description: "Turn a D8 or RD8 date from any typed reader into calendar fields, an ISO string, or a Date at an offset you state."
---

# Read a date off any typed reader

You have a service date, a statement period, or an eligibility date on a parsed
model, and you need it as a `Date`, an ISO string, or a set of calendar fields. Every reader surfaces
its dates verbatim, as the qualifier the sender used plus the bytes it carried, so that nothing is
normalized behind your back.

`toObject`, `toISO`, and `toDate` are the three ways to read one. Every `@cosyte/*` parser exports
the same three names with the same return shapes and the same timezone rule, so an application
holding both an X12 date and an HL7 timestamp reads them the same way.

```ts runnable
import { toObject, toISO, toDate } from "@cosyte/x12";

// The shape every X12*Date carrier has: claim.dates[0], eligibility.dates[0], and so on.
const day = { formatQualifier: "D8", value: "20260601" };

toObject(day); // => { year: 2026, month: 6, day: 1 }
toISO(day); // => "2026-06-01"

// A calendar day is not an instant. Without a stated offset there is no answer.
toDate(day); // => undefined
toDate(day, { assumeOffsetMinutes: 0 })?.toISOString(); // => "2026-06-01T00:00:00.000Z"
toDate(day, { assumeOffsetMinutes: -300 })?.toISOString(); // => "2026-06-01T05:00:00.000Z"

// A range converts to nothing: an interval is not a point in time.
const span = { formatQualifier: "RD8", value: "20260601-20260605" };
toISO(span); // => undefined

// Split it yourself and convert whichever end you meant.
const [from, through] = span.value.split("-");
toISO({ formatQualifier: "D8", value: from ?? "" }); // => "2026-06-01"
toISO({ formatQualifier: "D8", value: through ?? "" }); // => "2026-06-05"

// Anything this library does not decode answers undefined, and never throws.
toISO({ formatQualifier: "D8", value: "20260230" }); // => undefined
toISO({ formatQualifier: "D6", value: "202606" }); // => undefined
toISO(undefined); // => undefined
```

**The decoded format qualifier set is `D8` and `RD8`, and nothing else.** Those are the two DTP-02
values this library already parses and builds: `D8` is a single `CCYYMMDD` day, `RD8` is a
`CCYYMMDD-CCYYMMDD` range. A qualifier outside that pair, an absent one, a value whose digits do not
match the shape its qualifier declares, and a day that is not on the calendar all convert to
`undefined`. Two carriers, `X12PremiumDate` and `X12EnrollmentDate`, do not surface a format
qualifier at all, so they convert to `undefined` too: the format is not knowable from what the model
holds, and guessing it would turn an eligibility span into a single date.

**`toDate` never guesses a timezone.** No X12 date element this library decodes carries a UTC
offset, so `assumeOffsetMinutes` (signed minutes east of UTC) is the only route one takes into the
result. Without it the answer is `undefined`: the host machine's timezone is never read and UTC is
never assumed. The same midnight is two different instants either side of a border, and a date of
birth read in the wrong zone is a day out.

**`toObject` returns only the components the value stated.** `month` is spec-native 1 to 12 rather
than the JavaScript `Date` 0 to 11, the names are singular, and there is no `precision`, `raw` or
`valid` key, so `Object.keys()` of the result tells you the precision. Delete `offsetMinutes` and
what is left is accepted by `Temporal.PlainDateTime.from` and by luxon's `DateTime.fromObject` with
no renaming. Neither library is a dependency here.

The date-aware code-list queries, `checkCarcValidity` and `checkRarcValidity`, keep their own
contract and still throw an `X12CodeListError` on a document date they refuse. That divergence is
deliberate: they answer a caller who asked a validity question and could not state the day, while
these three read a document that was already parsed leniently, where a warning has already been
raised.

## Related

- Reference: [`toObject`](./api/README.md#toobject), [`toISO`](./api/README.md#toiso),
  [`toDate`](./api/README.md#todate), [`checkCarcValidity`](./api/README.md#checkcarcvalidity).

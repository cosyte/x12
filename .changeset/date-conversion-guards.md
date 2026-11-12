---
"@cosyte/x12": patch
---

`toObject`, `toISO` and `toDate` return exactly what they returned before, through fewer checks: `toDate` now refuses an offset that is not a number with one type check and leaves a non-finite offset to the existing Invalid Date check, and a `D8` value that is not a string is refused by the date check the three already ran. Nothing you call changes. New tests pin both answers, and the date conversion tests now run in the mutation suite.

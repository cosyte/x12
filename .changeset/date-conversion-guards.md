---
"@cosyte/x12": patch
---

`toDate` returns what it returned before, through one check fewer: it refuses an offset that is not a number with one type check and leaves a non-finite or out-of-range offset to the Invalid Date check it already ran last, so it still answers `undefined` for each. Nothing you call changes. New tests pin that `toObject`, `toISO` and `toDate` answer `undefined`, and never throw, for an offset given as a numeric string and for a `D8` value that is not a string: a number, a symbol, an object with no prototype and an object whose `toString` throws. The date conversion tests now run in the mutation suite.

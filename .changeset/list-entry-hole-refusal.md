---
"@cosyte/x12": patch
---

Every builder now refuses a hole or a `null` inside a list it reads, at any depth, with its own `INVALID_SPEC` code; in a list of objects the message names the slot with a structural locator such as `subscriber.benefits[0]`. Before, only the hierarchy spine was checked, so a hole in a list below it (`build271`'s subscribers, dependents and benefits, and the leaf lists of every builder) threw an untyped `TypeError`, and a few were skipped in silence: a hole in `build271`'s `serviceTypeCodes`, `build837`'s adjudication `adjustments` or `build275`'s status `codes` was dropped, and one in `build837`'s `diagnosisPointers`, `oralCavityArea` or tooth `surfaces` went out as an empty component. A forged non-array in `buildInterchange`'s `groups`, `build999`'s `transactionResponses` or a leaf list now refuses with the typed code too, where it threw `TypeError: ... is not iterable`. A list sent as `null` is still read as absent.

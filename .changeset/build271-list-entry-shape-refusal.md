---
"@cosyte/x12": patch
---

`build271` now refuses an information source or receiver entry that is not an object, such as a hole in a sparse array or a `null` from a JSON spec, with `Eligibility271BuildError` code `X12_271_BUILD_INVALID_SPEC`; before, the entry passed the structural check and the build then threw an untyped `TypeError`.

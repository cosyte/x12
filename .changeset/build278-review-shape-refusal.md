---
"@cosyte/x12": patch
---

`build278Request` and `build278Response` now refuse a review list entry that is not an object, such as a hole in a sparse array or a `null` from a JSON spec, with `ServicesReview278BuildError` code `X12_278_BUILD_INVALID_SPEC`; before, the entry passed the structural check and the build then threw an untyped `TypeError`.

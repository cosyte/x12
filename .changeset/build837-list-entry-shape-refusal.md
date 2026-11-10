---
"@cosyte/x12": patch
---

`build837P`, `build837I` and `build837D` now refuse a billing provider, subscriber, dependent patient, claim or service line entry that is not an object, such as a hole in a sparse array or a `null` from a JSON spec, with `Claim837BuildError` code `X12_837_BUILD_INVALID_SPEC`; before, the entry passed the structural check and the build then threw an untyped `TypeError`.

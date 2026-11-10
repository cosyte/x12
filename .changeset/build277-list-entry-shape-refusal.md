---
"@cosyte/x12": patch
---

`build277` and `build277CA` now refuse an information source, receiver, provider, subscriber, dependent, claim, service line or claim status entry that is not an object, such as a hole in a sparse array or a `null` from a JSON spec, with `ClaimStatus277BuildError` code `X12_277_BUILD_INVALID_SPEC`; before, the entry passed the structural check and the build then threw an untyped `TypeError`.

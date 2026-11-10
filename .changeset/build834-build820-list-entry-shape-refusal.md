---
"@cosyte/x12": patch
---

`build834` and `build820` now refuse a member, health coverage, remittance or open item entry that is not an object, such as a hole in a sparse array or a `null` from a JSON spec, with code `X12_834_BUILD_INVALID_SPEC` or `X12_820_BUILD_INVALID_SPEC`; before, the entry passed the structural check and the build then threw an untyped `TypeError`.

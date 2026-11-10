---
"@cosyte/x12": patch
---

`build275` now refuses an attachment list with a hole in it, such as `[, attachment]`, with `X12_275_BUILD_INVALID_SPEC` and the slot's locator, the same as a `null` attachment. It used to skip the hole while checking the spec and then throw an untyped `TypeError` while writing it.

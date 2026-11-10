---
"@cosyte/x12": patch
---

`build835` now refuses a claim entry that is not an object, such as a hole in a sparse array or a `null` from a JSON spec, with `Remit835BuildError` code `X12_835_BUILD_INVALID_SPEC`; before, the entry passed the structural check and the balance check then threw an untyped `TypeError`.

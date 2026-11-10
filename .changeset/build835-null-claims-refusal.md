---
"@cosyte/x12": patch
---

`build835` now refuses a `claims` list that is `null` or left out, with `Remit835BuildError` code `X12_835_BUILD_INVALID_SPEC` and a message naming `spec.claims`; before, it threw an untyped `TypeError` from the balance check. An empty `claims` list still builds, as a remit with no claim payments.

---
"@cosyte/x12": patch
---

A repeated `NM1*87` in one 837 Loop 2000A no longer fuses two pay-to addresses into one the sender never sent (X12-PAY-TO-FUSION).

Through `0.0.12`, an 837 whose Loop 2000A named the pay-to address twice read back a single `payToAddress` holding a street line from **each** of the two addresses, plus a country code taken off the **first** `N4` on an address whose own `N4` named no country, with `warnings: []`. Re-emitted through `build837P` that became one Loop 2010AB stating a payment destination no sender had stated. If you read a repeated `NM1*87` on `0.0.12` or earlier, treat that claim's `payToAddress` as unreliable rather than as either sender's address.

Each `NM1*87` now opens its own accumulator, so values from two occurrences can never meet. The rule is stated in the emit side's own terms, because the emit side reads this slot: occurrences are never merged, the last occurrence that states an address of its own takes it, and an occurrence that states none (no `N3` or `N4` at all, or only a valueless one) does not blank one that did. "States an address" means exactly what `emitAddress` would write a segment for, and the reader and the writer share one predicate so they cannot drift apart.

**Added:** `X12_837_PAY_TO_ADDRESS_REPEATED`, the 28th Tier-2 warning code, plus the public factory `payToAddressRepeated(position)`. It is raised at the second and each subsequent `NM1*87` within one Loop 2000A, anchored at that segment, so the choice above is never made in silence. The model has one pay-to address slot and this code is the only thing that says the document named more than one.

A document with at most one `NM1*87` per Loop 2000A is unaffected in every respect, warning channel included. The cost of not fusing is recorded in `KNOWN-LIMITATIONS.md`: a repeat that states only part of an address now puts only that part on the model and re-emits only that part.

---
"@cosyte/x12": patch
---

`transactionSetType()` in `@cosyte/x12/arbitraries` now also draws the 275 (GS-01 `PI`, `006020X314`) and the 999 (GS-01 `FA`, `005010X231A1`), so `interchange()`, `interchangeText()` and `interchangeSpec()` build those two transaction set types too. The 997 and the TA1 are still never drawn, as neither names an implementation guide. Because the generator draws from more types, the same fast-check seed now gives different documents than before: if you pinned outputs drawn from these generators on a fixed seed (snapshots, golden files, recorded digests), capture them again, or filter the drawn type with `.filter()` if your code must only see the types it saw before. Nothing you call needs to change.

---
"@cosyte/x12": patch
---

BREAKING (read model): every monetary, percent and quantity slot the readers used to fill with a fabricated `X12Decimal.ZERO` is now `X12Decimal | undefined` (X12-837-SV-UNDEFINED-DECIMAL).

Through `0.0.12`, an **absent** `SV1-02` on an 837 claim service line read back as `X12Decimal.ZERO`. A consumer looking at the model could not tell "the sender stated zero" from "the sender stated nothing", and the parser presented the second as the first. The same fabrication sat on fourteen slots across the 837, 835 and 820 readers, including `CLM-02`, `SVD-02`, `CLP-03` / `CLP-04` / `CLP-05`, `SVC-02` / `SVC-03`, `BPR-02`, every `CAS` amount and every `PLB` amount. On any of them it read as a charge, a paid amount or a unit count nobody sent.

Those slots now read `undefined` where this library decoded no value from the element. **`undefined` means "not decoded", not "absent":** an element that is present and holds bytes that do not decode lands there too, and `X12_UNPARSEABLE_DECIMAL` at that `position.elementIndex` is what separates the two. A stated zero is unaffected and still reads `0`, keeping its lexical form.

**What to change.** Anywhere you read one of those slots, `x.toString()` becomes `x?.toString()` and you have a real decision to make at each site: an `undefined` amount is not zero. If you posted cash off a slot that read `0` on `0.0.12` or earlier without also checking `.warnings`, re-read those files.

**Added:** `X12_835_BALANCE_NOT_EVALUABLE`, the 29th Tier-2 warning code, plus the public factory `balanceNotEvaluable(position, invariant)`. Where any term of one of the three TR3 005010X221A1 §1.10.2 balance equations is `undefined`, the equation is not run and this code is emitted instead of `X12_835_REMIT_BALANCE_MISMATCH`. Nothing was measured out of balance; substituting `0` for the missing term is what produced the spurious mismatch through `0.0.12`. An empty list of adjustments is not an absent term: a claim carrying no `CAS` really did state no adjustments, and that sums to `X12Decimal.ZERO`.

**Gate on both codes.** A posting gate written against `X12_835_REMIT_BALANCE_MISMATCH` alone stops firing on those documents when you upgrade, because through `0.0.12` they raised the mismatch. This library warns either way; your gate has to look for both.

**BREAKING (emit side): `Build837ServiceLineSpec.units` is now required.** `build837P` / `build837I` / `build837D` emitted the literal `0` into SV1-04 / SV2-05 / SV3-06 when a caller omitted it, so the builder stated a service unit count nobody supplied. Measured on `0.0.12`: a line with no `units` emitted `SV1*HC:99213*8500*UN*0*11**1~`. It now refuses with `X12_837_BUILD_INVALID_SPEC`, naming the structural locator and no caller value, which is the stance `build277` already takes for `SVC-07`. A caller that supplies `units` is unaffected, including one that supplies a zero.

`build835` is otherwise unchanged: every term of its balance equations is a required `X12Decimal` on `Build835Spec`, so the new not-evaluable path is unreachable from TypeScript. A JS caller passing `undefined` there now gets `X12_835_BUILD_INVALID_SPEC` rather than an untyped `TypeError`, and deliberately not the build-side balance-mismatch code.

The public `elementDecimalOrZero` helper is unchanged and still substitutes `X12Decimal.ZERO`. No reader in this library calls it any more; a consumer walking segments itself can still opt into the substitution knowingly.

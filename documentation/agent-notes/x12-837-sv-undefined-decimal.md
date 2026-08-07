# X12-837-SV-UNDEFINED-DECIMAL (2026-08-07)

The breaking slice three earlier items deferred by name. Written here rather than in
`../agent-notes.md`, which was at **249,826** of its 250,000-byte budget when this landed, and
rather than in `../../CLAUDE.md`, which was at **52,903** of a 52,912 entry. The per-item shape
(`documentation/agent-notes/<item>.md`) is the one the umbrella's `.claude/hooks/doc-budget.mjs`
provides for exactly this, and it is bounded on its own.

## The defect, and what it was not

**An absent Required `SV1-02` read a confident `0`.** That is a monetary field on a claim service
line. A consumer looking only at the model could not tell "the sender stated zero" from "the sender
stated nothing", and this library presented the second as the first.

Three prior slices named it and each deliberately left it: `X12-QUANTITY-SILENT-DEFAULTS` warned an
unparseable decimal, `X12-837-SV-SILENT-ZERO` warned a service line whose `SVx` never decoded, and
`X12-837-LOOP-RESIDUALS` restated it as still open. Every one of those closed a **silence** on the
warning channel and left the **`0`** on the model, because closing the `0` is a breaking type
change. That is what this slice is.

## What actually moved: fourteen slots, one rule

The rule is uniform and states nothing about TR3 usage codes, deliberately: **a slot that could hold
a fabricated `X12Decimal.ZERO` is now `X12Decimal | undefined`, and reads `undefined` where this
library decoded no value from the element.** No slot is treated differently for being Required, and
no usage code is asserted anywhere in the change. A rule that had to know which elements are
Required would be a census, and this repo has been refuted for publishing one four times.

The fabrication census, which IS closed and IS enumerable because it is a property of this source
tree rather than of a spec:

| route | sites | model slots reached |
|---|---|---|
| `elementDecimalOrZero(...)` in a reader | 16 | 12 |
| `elementDecimal(...) ?? X12Decimal.ZERO` on a `CAS` / `PLB` triple | 3 | 2 |
| a seeded accumulator or an `EMPTY_HEADER` constant | 4 | 3 (all already above) |

Fourteen distinct model slots: `X12Claim.totalCharge` (CLM-02); `X12_837ServiceLineBase.charge` and
`.units` (SV1-02 / SV2-03 / SV3-02 and SV1-04 / SV2-05 / SV3-06);
`X12LineAdjudication.amountPaid` (SVD-02); `X12RemitClaim.totalChargeAmount`, `.totalPaymentAmount`
and `.patientResponsibilityAmount` (CLP-03 / 04 / 05); `X12RemitServiceLine.chargeAmount` and
`.paymentAmount` (SVC-02 / SVC-03); `X12RemitPaymentHeader.totalActualPayment` and
`X12PremiumPaymentHeader.totalPremiumAmount` (BPR-02); `X12PremiumOpenItem.amountPaid` (RMR-04);
`X12RemitAdjustment.amount` (a `CAS` triple, read by the 837 as well as the 835); and
`X12RemitProviderAdjustment.amount` (a `PLB` pair).

**`X12ClaimAmount.amount`, `X12RemitAmount.amount` and `X12PremiumAdjustment.amount` were NOT
widened**, and the reason is worth keeping: their decoders already drop the whole record when the
amount does not decode (`decodeAmt` / `decodeAdx` return `undefined`), so no fabricated zero could
reach them. Widening them would have been type churn with no defect behind it.

## The emit side, answered rather than mentioned

`#82`'s lesson was that a reader-side change which does not answer what the writer then reads is the
shape that gets refuted. Two emit-side facts were measured before deciding anything.

1. **`build837P/I/D` had the SAME defect, in the other direction.** `Build837ServiceLineSpec.units`
   was optional and the emitter did `line.units === undefined ? "0" : decStr(line.units)`. Measured
   on the base tree: a Professional line with no `units` emitted
   `SV1*HC:99213*8500*UN*0*11**1~` - a service unit count no caller supplied. `units` is now
   required and `enforceStructuralSpec` refuses a line without it with
   `X12_837_BUILD_INVALID_SPEC`, naming the structural locator and no caller value.

   **Refuse, not emit-empty.** An empty SV1-04 would round-trip honestly back to `units: undefined`
   as of this slice, which is a real argument for it. It loses to two things: this library's stated
   posture that the parser is liberal and the serializer conservative, and the direct precedent of
   `build277`, which already refuses a service line without `SVC-07` on the grounds that defaulting
   a count is inventing. Neither argument needs a usage code.

2. **Every other builder decimal slot was already required and routed through `escDec`**, so nothing
   else on the emit side changed. `Build835Spec` in particular keeps every balance term as a
   required `X12Decimal`, which is what makes the new not-evaluable path below unreachable from
   TypeScript.

## The 835 balance invariants, and the one new code

`src/transactions/remit/balance.ts` is shared: `get835` calls it on the read side and `build835`'s
`enforceBalance` calls it on the emit side. Widening the terms forced a decision there.

**A term that did not decode makes the equation unevaluable, which is a third outcome and not a
failure.** Reporting `X12_835_REMIT_BALANCE_MISMATCH` would assert a computed inequality that was
never computed; reporting nothing would be a REGRESSION in the warning channel, because through
`0.0.12` an absent `CLP-03` collapsed to zero and *did* raise a mismatch. So the third outcome got
its own code, `X12_835_BALANCE_NOT_EVALUABLE`, the 29th Tier-2 code, keyed by the same
`BALANCE_INVARIANTS` discriminant the mismatch uses.

- **An EMPTY list is not an absent term.** `sumOptional([])` is `X12Decimal.ZERO`: a claim carrying
  no `CAS` really did state no adjustments. Only a term this library decoded no value from stops the
  equation. Both halves are pinned, because collapsing them would silence every clean claim.
- **`enforceBalance` branches on the code, not on truthiness**, and raises
  `X12_835_BUILD_INVALID_SPEC` for the not-evaluable verdict rather than its balance-mismatch code.
  A JS caller passing `undefined` in a balance slot got an untyped `TypeError` off `undefined.add`
  through `0.0.12`; it is a typed refusal now. **A raw `number` in the same slot still throws the
  untyped `TypeError`**, unchanged, so the dichotomy
  `test/builder-decimal-type.test.ts` pins ("a slot refuses UNTYPED exactly when the balance guard
  reads it") did not move: that suite forges `0.1 + 0.2`, never `undefined`.
- The refusal was written as six explicit `throw`s rather than one helper taking a `scope` string.
  A helper would have put `${scope}` in a refusal template, and `test/builder-refusal-bounds.test.ts`
  sanctions holes by NAME - admitting a parameter there weakens a gate that has already gone slack
  twice. The pinned site count moved 86 -> 90 with its comment.

## The census, and the control on the census

**18 of 35 new cases red on `c8e81b4`, 17 green**, measured by restoring the base tree with
`git archive c8e81b4 | tar -x` into a scratch directory (a file copy, not a `git checkout` over the
working tree) and running the head suite against it. **The 17 green are every CONTROL plus the two
`elementDecimalOrZero` cases**, which is the shape that makes the 18 a defect report: a control that
went red on base would mean the fixture, not the reader, was what changed.

Negative control on the measurement itself: the same test file against a restored `hl7` tree
collects **no tests at all** (the imports do not resolve), so the run is demonstrably reading the
tree under test rather than `/workspace/x12`.

**The load-bearing shape is the PAIR, not the absence.** Every read case runs the same document with
the element absent, with the element carrying an explicit zero, and with a real amount. Asserting
only that the absent case answers `undefined` would not catch a reader that started answering
`undefined` for a stated zero as well - the same defect pointing the other way - and the stated-zero
half is green on both trees precisely so it can catch that later.

## What this did NOT close

- **`elementDecimalOrZero` is still exported and still substitutes `X12Decimal.ZERO`.** Its
  documented behaviour is unchanged; what changed is that no reader in this library calls it. Left
  deliberately: it is a public helper, a consumer walking segments itself may still want it, and
  removing it would break a caller for no correctness gain now that nothing in the library inherits
  it.
- **`undefined` still does not say WHY on its own.** Absent and unparseable both land there, and
  only `X12_UNPARSEABLE_DECIMAL` at that `elementIndex` separates them. Likewise an 837 line whose
  `SVx` never decoded reads `undefined` for the same reason a decoded `SVx` with an empty charge
  element does, and only `X12_837_SERVICE_LINE_NOT_DECODED` tells those apart. Never write that
  `undefined` means "the sender omitted it".
- **The five `PRE-EXISTING` defects filed under `X12-837-RESIDUALS` are untouched** and carried
  forward: the stray `SVx` that re-types a whole submission, the `NM1*87` with a `CLM` open landing
  in `claim.providers`, `attachContact`'s `/* v8 ignore */` `payToAddress` arm, the Loop 2010AB short
  a Required `N3`, and the `NM1*87` in a Loop 2000B with no claim open. ADR 0016 restriction 2: this
  slice is not obliged to fix what it merely fails to fix, and a type widening is exactly the kind of
  change that would have carried them in unnoticed.

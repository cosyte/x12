# X12-837-SV-UNDEFINED-DECIMAL (2026-08-07)

Provenance: this repo's own source tree at `c8e81b4` and at `674f616`, measured (every census, every
base/head reading and both emitted segments below are runs, not recollections); the registry text in
`src/parser/warnings.ts`; and the prior slices' sections in `../agent-notes.md`. **No TR3 was read
and no clause of one is cited here** - `005010X221A1` is named only where this repo's existing code
and docs already name it, and the two decisions that could have rested on a usage code
(`SV1-04` / `SV2-05` / `SV3-06`) deliberately do not.

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

| route                                                              | sites | model slots reached   |
| ------------------------------------------------------------------ | ----- | --------------------- |
| `elementDecimalOrZero(...)` in a reader                            | 16    | 12                    |
| `elementDecimal(...) ?? X12Decimal.ZERO` on a `CAS` / `PLB` triple | 3     | 2                     |
| a seeded accumulator or an `EMPTY_HEADER` constant                 | 4     | 3 (all already above) |

Fourteen distinct model slots: `X12Claim.totalCharge` (CLM-02); `X12_837ServiceLineBase.charge` and
`.units` (SV1-02 / SV2-03 / SV3-02 and SV1-04 / SV2-05 / SV3-06);
`X12LineAdjudication.amountPaid` (SVD-02); `X12RemitClaim.totalChargeAmount`, `.totalPaymentAmount`
and `.patientResponsibilityAmount` (CLP-03 / 04 / 05); `X12RemitServiceLine.chargeAmount` and
`.paymentAmount` (SVC-02 / SVC-03); `X12RemitPaymentHeader.totalActualPayment` and
`X12PremiumPaymentHeader.totalPremiumAmount` (BPR-02); `X12PremiumOpenItem.amountPaid` (RMR-04);
`X12RemitAdjustment.amount` (a `CAS` triple, read by the 837 as well as the 835); and
`X12RemitProviderAdjustment.amount` (a `PLB` pair).

**A required `X12Decimal` slot that was NOT widened is not an oversight, and NO LIST OF THEM IS
PUBLISHED.** The rule is the claim: a slot was widened exactly where a reader could substitute
`X12Decimal.ZERO` into it. Where a decoder instead drops the whole record when the amount does not
decode - the `AMT` / `ADX` shape, whose decoders return `undefined` for the row - no fabricated zero
could ever reach the slot, so widening it would have been type churn with no defect behind it.
**A first draft of this file named three such slots and pass 1 measured a fourth**
(`X12EnrollmentAmount.amount`), which is the census failure `CLAUDE.md` records four separate times.
Finding one more is expected and is not a new finding; the claim was cut back rather than the list
grown. **Those rows are dropped with no warning at all, on both trees** (`AMT*AU~` gives
`claim.amounts: []` and `warnings: []`), which is `PRE-EXISTING` and filed below.

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
`0.0.12` an absent `CLP-03` collapsed to zero and _did_ raise a mismatch. So the third outcome got
its own code, `X12_835_BALANCE_NOT_EVALUABLE`, the 29th Tier-2 code, keyed by the same
`BALANCE_INVARIANTS` discriminant the mismatch uses.

- **An EMPTY list is not an absent term.** `sumOptional([])` is `X12Decimal.ZERO`: a claim carrying
  no `CAS` really did state no adjustments. Only a term this library decoded no value from stops the
  equation. Both halves are pinned, because collapsing them would silence every clean claim.
- **`enforceBalance` branches on the code, not on truthiness**, and raises
  `X12_835_BUILD_INVALID_SPEC` for the not-evaluable verdict rather than its balance-mismatch code.
  A JS caller passing `undefined` in a balance slot got an untyped `TypeError` off `undefined.add`
  through `0.0.12`; it is a typed refusal now. **A raw `number` in the same slot still throws an
  untyped `TypeError`, so the dichotomy `test/builder-decimal-type.test.ts` pins ("a slot refuses
  UNTYPED exactly when the balance guard reads it") did not move** - that suite forges `0.1 + 0.2`,
  never `undefined`. **State it as "an untyped `TypeError`", not "the same one":** pass 1 measured
  that on some slots it now comes from `X12Decimal.state()` ("has no internal state - was it
  tampered with?") where base reached `.add is not a function`, because `sumOptional` calls
  `X12Decimal.add(term)` rather than `term.add(...)`. Both forms were already in that suite's
  message regex, which is why it stayed green; the arm a slot lands in is what the rule is about,
  and no slot changed arm.
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
- **An `AMT` / `ADX` row whose amount element is ABSENT is dropped with NO warning on any channel.**
  `AMT*AU~` gives `claim.amounts: []` and `warnings: []`, identically on both trees. **Say ABSENT,
  not "does not decode"** - a first draft of this bullet said the wider thing and pass 2 measured it
  false: `AMT*AU*N/A~` and `AMT*AU*1,234.56~` also give `claim.amounts: []` but DO emit
  `X12_UNPARSEABLE_DECIMAL` at `elementIndex` 2, because `decodeAmt` passes the sink. Only the
  absent element is silent, which is the same bound `X12-QUANTITY-SILENT-DEFAULTS` already states
  and which this file contradicted for one commit. `PRE-EXISTING`, and its own slice: closing it
  needs a retention decision and a registry code, neither of which belongs in a type widening.
- **SV3-06's TR3 usage is NOT grounded, and the emit-side refusal does not claim it is.** `units`
  became required for all three variants on one argument that needs no usage code (a serializer may
  not state a count nobody supplied), but nobody here has read X224A2. Pass 1 measured the cost:
  this repo's own `test/fixtures/golden/837d.edi` carries `SV3*AD:D2391**11*OC:MO:DO*5*1`, which
  reads `charge: undefined` and `units: 1`, so it cannot be fed straight back through `build837D`
  without inventing a charge - though `charge` was already a required spec field, so that half is
  unchanged here. An availability trade, recorded rather than argued away; worth a grounding item if
  anyone gets the X224A2 text.
- **The five `PRE-EXISTING` defects filed under `X12-837-RESIDUALS` are untouched** and carried
  forward: the stray `SVx` that re-types a whole submission, the `NM1*87` with a `CLM` open landing
  in `claim.providers`, `attachContact`'s `/* v8 ignore */` `payToAddress` arm, the Loop 2010AB short
  a Required `N3`, and the `NM1*87` in a Loop 2000B with no claim open. ADR 0016 restriction 2: this
  slice is not obliged to fix what it merely fails to fix, and a type widening is exactly the kind of
  change that would have carried them in unnoticed.

## Relocated from `x12/CLAUDE.md`, 2026-08-10, VERBATIM, NOTHING DROPPED

Moved here to pay for the `X12-ISA-ELEMENT-ARITY` trap's pass-1 corrections under this repo's
zero-headroom ratchet. The imperative stays in `CLAUDE.md`; the bullets are the text that was
there, unchanged.


- **🩺 A slot reads `X12Decimal | undefined` EXACTLY where a reader could substitute `ZERO`; a STATED
  zero still reads `0` and KEEPS ITS LEXICAL FORM. PUBLISH NO SLOT CENSUS.**
  **`X12_835_BALANCE_NOT_EVALUABLE`: an undecoded TERM makes a §1.10.2 equation UNEVALUABLE, NEVER a
  mismatch; an EMPTY adjustment list is NOT an absent term** - it sums to `ZERO`.
- **🛑 A WIDENING THAT MOVES A CASE ONTO A NEW CODE BLINDS EVERY PREDICATE ON THE OLD ONE, AND THIS
  PACKAGE'S OWN DOCS ARE SUCH A CONSUMER** - the "do NOT auto-post" recipe gated on
  `X12_835_REMIT_BALANCE_MISMATCH` alone went base `true` / head `false`. **Sweep every recipe, the
  troubleshooting table and `CHANGELOG.md`; PIN THE SWEEP.**
- **🩺 `Build837ServiceLineSpec.units` is REQUIRED and the builder REFUSES rather than emitting `0`.
  SV3-06's TR3 usage is NOT grounded - never claim it is.**


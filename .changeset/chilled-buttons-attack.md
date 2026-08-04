---
"@cosyte/x12": patch
---

Refuse a raw `number` in an `X12Decimal` slot instead of rendering it, and type-check every element
at the segment join (`X12-DECIMAL-BYPASSES-THE-GUARD`).

`makeCallerEscaper` type-checks what reaches `esc`, but an `X12Decimal` slot hands `esc` a
`value.toString()`, and a raw `number` answers that with a perfectly good string, so the guard never
applied. A `patientResponsibilityAmount` of `0.1 + 0.2` emitted
`CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…` with zero warnings; `1e21` and `NaN` emitted
renderings the library cannot parse back. Those slots now emit through `escDec`, which refuses rather
than rounding: choosing between `0.30` and `0.3` is a decision about the caller's money.

The string-typed slots that never called `esc` at all are routed through it (`build999`'s GS-06 /
GE-02 / ST-02 / SE-02 / AK9-01 / IK5-01 / GS-07, GS-04 / GS-05 in every domain builder, `build278`'s
HL-03, `build837`'s LX-01), which closes their delimiter hole too.

Underneath both, `requireCallerSegment` type-checks every element of every segment emitted through a
builder's `seg` / `joinSeg` helper, on every route in. Three earlier drafts published an exhaustive
census of the slots that bypass `esc` and all three were measured false; the join is the one place
every element must pass, so the statement is now a property rather than a list. It names the slot the
way the spec does (`build999: "AK9"-01 must be a string, …`).

Deliberately still not claimed, and unchanged here: delimiter safety is per-slot, not structural; the
fixed-width ISA slots go through `pad` / `padControl`; `buildTA1` uses no segment joiner at all, so a
non-string TA1-01 is still emitted silently; and `build835` refuses with an untyped `TypeError` for
any amount its balance guard reads as a term of one of the three TR3 X221A1 §1.10.2 invariants,
because that guard runs before the escaper is built. Named by spec field: `payment.totalActualPayment`,
`claim.totalChargeAmount`, `claim.totalPaymentAmount`, every `adjustments[].amount`,
`serviceLine.chargeAmount`, `serviceLine.paymentAmount`, `providerAdjustments[].amount`. Every other
`X12Decimal` field refuses typed.

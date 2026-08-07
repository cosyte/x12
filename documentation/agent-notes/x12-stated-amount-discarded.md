# x12 - a stated amount discarded anyway (2026-08-07)

The two silent monetary drops `X12-AMT-ADX-ABSENT-AMOUNT` (`#84`) surfaced, disclosed on five
surfaces and pinned by tests, and deliberately did not fix: **neither is that code's shape.** Both
reproduced on `9db104b` and on `93c1886`. Its own file under `documentation/agent-notes/` rather
than in `documentation/agent-notes.md`, which stands at 249,982 of a 250,000-byte budget and refuses
the write.

## The two defects, measured at `93c1886` before anything was designed

| the wire                                 | what left the model                                   | at base                                 |
| ---------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| 820 `RMR****150.00*150.00~`              | the whole open item: RMR-04 150.00, RMR-05 150.00     | `openItems: []`, `warnings: []`         |
| 820 `RMR***PI*150.00~`                   | the same, plus RMR-03's payment action code           | `openItems: []`, `warnings: []`         |
| 820 `RMR****1,234.56~`                   | the same, and **no `X12_UNPARSEABLE_DECIMAL` either** | `openItems: []`, `warnings: []`         |
| 837 `AMT*EAF*75.00~` under an open `SVD` | a decoded Remaining Patient Liability row             | line and claim `amounts: []`, no report |

**The two causes are different and the harm is one harm.** `decodeRmr` answers `undefined` on ONE
condition, RMR-01 and RMR-02 both empty, and it does so **before** `elementDecimal` is called on
RMR-04 or RMR-05 - so nothing failed to decode and nothing was even attempted. The 837's `AMT` case
is the opposite: `decodeAmt` runs first and succeeds, and the row is then skipped by
`if (currentAdjudication !== undefined) break;`, a v1 scope limit on the adjudication model rather
than a failed read.

## What "the report INVERTS there" turned out to mean, once measured

At base, under an open `SVD`, with a claim and a line open:

| the `AMT`         | what was lost                                       | base report                                          |
| ----------------- | --------------------------------------------------- | ---------------------------------------------------- |
| `AMT*EAF*75.00~`  | the qualifier **and** a stated 75.00                | **nothing**                                          |
| `AMT*EAF~`        | the qualifier only; no amount was ever stated       | `X12_AMOUNT_ROW_DROPPED`                             |
| `AMT*EAF*7,5.00~` | the qualifier; the amount was stated but unreadable | `X12_UNPARSEABLE_DECIMAL` + `X12_AMOUNT_ROW_DROPPED` |

So the channel's report was **monotonically decreasing in what was lost**: the ONLY case that
reached no channel at all was the one where the sender's money was fully legible and fully
discarded, and the two smaller losses each carried a code. That is the inversion, stated exactly.
It is not "the warning is wrong"; `X12_AMOUNT_ROW_DROPPED` is correct on every document it fires on.
It is that a consumer reading the warning channel to decide whether an amount row went missing got
the answer **backwards on the case that costs the most.**

## The decision: a new code, and why not `X12_AMOUNT_ROW_DROPPED`

Reusing the existing code keeps the consumer predicate surface small, which is the default answer
here, and the cause differing is **not** on its own a reason to add one. Two things decided against
it, and neither is "the cause differs":

1. **Reuse would have falsified a separator this package publishes, and that is the LOAD-BEARING
   reason.** The shipped
   `X12_AMOUNT_ROW_DROPPED` message tells a consumer that the presence or absence of an
   `X12_UNPARSEABLE_DECIMAL` at the same `position.segmentIndex` is what separates its two routes,
   so an unaccompanied instance means "the sender stated no amount". Folding `AMT*EAF*75.00~` in
   would make that reading **false on money**: unaccompanied, and a stated 75.00. Correcting a
   published separator is a bigger consumer break than adding a code beside it.
2. **A consumer does act differently, but ONLY on the `AMT` route, and this reason cannot carry the
   argument on its own.** There AMT-02 decoded before the row was skipped, so the value can be read
   back exactly. On the `RMR` route nothing of the kind is true: the row is refused before the
   decode is attempted, so the code lands on `RMR****1,234.56~` exactly as on
   `RMR****150.00*150.00~`. **A first draft published the recoverability reading as the code's
   MEANING, on six shipped surfaces including the changeset, and pass 1 refuted it with that one
   segment.** The remedy was to cut the claim back, not to grow the guard: decoding inside
   `statesAnAmount` to decide would mint `X12_UNPARSEABLE_DECIMAL` on documents that never raised
   it, which is the additivity break this whole lineage exists to avoid.

**One code for both routes, one message, no discriminant**, following this repo's own
`X12_837_SERVICE_LINE_DROPPED` precedent: the two routes call for the same action, so a discriminant
would be surface without a use. The property that covers both, stated as a property of the READ:

> the segment POPULATED its amount element, it arrived while the loop that would carry its row was
> OPEN, and the reader built no row anyway, for a reason that is not a failure to decode that amount.

**The two amount-row codes are disjoint by construction** - one requires an amount element that
decoded no value, the other one the sender populated - so they can never name the same segment, and
the code a consumer receives is itself the discriminant. Pinned.

## The bound, and why it stops where it does

The exclusion is **"no loop open to carry the row"**, and it is a real line rather than a
convenience. Those cases are a document putting an amount segment where this reader has nothing
open, which is a structural anomaly; the two closed here are a **fully open, ordinary context** in
which the reader still discards money. Still silent, unchanged, and disclosed:

- the 834's `AMT` with no `HD` coverage open, and the 820's `ADX` with no remittance open (both
  return before the amount is read);
- the 835's and the 837's `AMT` that DECODES with no claim and no service line open (both fall
  through the attachment chain).

**Do not widen this code into "a stated amount row is always reported".** Two more silences are
deliberate: a bare `RMR~` states nothing, so nothing was lost; and an identity-less `RMR` carrying
only RMR-03 loses a payment action code but no amount, and this code is about a stated AMOUNT.

## Two implementation notes that are load-bearing

- **The `RMR` guard is a PRESENCE test on RMR-04 / RMR-05, not a decode.** Reaching for the decimal
  sink to decide would raise `X12_UNPARSEABLE_DECIMAL` on documents that have never raised it -
  `RMR****1,234.56~` among them - which is precisely the additivity break this lineage was refuted
  for once. **The consequence is published rather than hidden, and it is the sentence pass 1 was
  refuted for getting backwards: on this route no `X12_UNPARSEABLE_DECIMAL` accompanies the report
  even where the bytes are unreadable, so an unaccompanied instance is NOT evidence that the amount
  is postable.** The code asserts nothing whatever about whether the amount would decode. Pinned by
  a case that asserts `X12Decimal.fromString("1,234.56")` is `undefined` beside the warning, so
  re-widening the prose into a promise of decodability reds the suite.
- **The 837 report is placed AFTER the `amount === undefined` branch, not before it.** An
  `AMT*EAF~` under an open `SVD` raised `X12_AMOUNT_ROW_DROPPED` at base and must keep raising
  exactly that; moving it onto the new code would be the "a widening that moves a case onto a new
  code" break. The ordering is what keeps it additive, and it is pinned by two ADDITIONS-ONLY cases
  rather than assumed.

## The census

**15 of 57 collected cases red** against a base tree restored from `93c1886` **by file copy**
(`git archive | tar -x` into a scratch directory, never `git checkout` in the live tree), with head's
three affected test files copied over it. The split:

- `test/transactions-stated-amount-discarded.test.ts`: **11 of 26 red.**
- `test/transactions-amount-row-dropped.test.ts`: **2 red**, both the disclosure pins `#84` wrote for
  these two defects, now inverted to assert the report.
- `test/warning-codes.snapshot.test.ts`: **2 red**, the code set and the additions-only count.

The 15 green in the new file are exactly the CONTROLs, the BOUNDs, the ADDITIONS-ONLY pins and the
one PRE-EXISTING disclosure pin, all of which must be green on both trees. Named, because a count
without its list cannot correct itself: the bare `RMR`; the RMR-03-only `RMR`; the `RMR` with no
remittance loop open; the identified `RMR` that builds a row; the identified `RMR` with no amount,
whose row survives; the `ADX` with no remittance loop open; the ABSENT `AMT-02` under an open `SVD`
keeping the old code alone; the UNPARSEABLE `AMT-02` under an open `SVD` keeping both old codes; the
same `AMT` with no `SVD` open, which lands on the line; the `SVD` row itself still decoding; the
decoded `AMT` with no claim and no line open; the 835's decoded `AMT` before any claim; the 834's
`AMT` with no `HD`; the 835's absent-amount document still raising the old code alone; and the
disclosure that the INVERSION survives at those excluded sites.

**An honest caveat about three of those greens.** The 837-no-claim, 835 and 834 exclusion BOUNDs
assert only the ABSENCE of the new code, and at base `WARNING_CODES.X12_STATED_AMOUNT_DISCARDED` is
`undefined`, so they pass there partly for a reason that does not exist on that tree. Their
load-bearing measurement is at head. The other eleven greens assert real code arrays with `toEqual`
and are load-bearing on both.

**Negative controls, one per guard, both red:** deleting the 820 `RMR` report reds **9** cases;
deleting the 837 adjudication report reds **7**. Three of those overlap, being the cases that sweep
both sites. Measured before the pass-1 remedy, on the 25-case form of the file; the remedy added two
cases and removed none, so the guards' controls are unchanged in kind.

**Wrong-package negative control:** the same file against an `hl7` tree restored the same way
collects every case and passes **none** of them, every one dying at `parseX12 is not a function`.
The apparatus is bound to this package's surface and cannot report green against another one.

## Deliberately not touched

The five other `PRE-EXISTING` findings carried in `X12-837-RESIDUALS` (a stray `SVx` re-typing a
submission; an `NM1*87` with a `CLM` open landing in `claim.providers`; `attachContact`'s
`/* v8 ignore */` arm; a Loop 2010AB short a Required `N3`; an `NM1*87` in Loop 2000B with no claim
open), and **SV3-06's TR3 usage, which is still not grounded** - do not claim it is.

**No TR3 usage code is asserted here either.** Nobody in this repo has read X218 for `RMR` usage or
X222A2 for the Loop 2430 `AMT`, and the argument does not need one: a row the sender wrote left the
model, which is true whatever the segment's usage is. `AMT*EAF` is named as Remaining Patient
Liability on the strength of this package's own dogfooded Loop 2430 spec, not of a TR3 clause.

**🔴 The INVERSION survives at the excluded sites, and that is disclosed rather than left to be
found.** With no claim open, an 835 `AMT*B6~` raises `X12_AMOUNT_ROW_DROPPED` while `AMT*B6*500.00~`
raises nothing at all: the same backwards reading this slice closed under an open `SVD`, one
loop-context over. `PRE-EXISTING`, identical on both trees, pinned by a case that asserts both
halves. Every published bound calls those sites "still silent", which is true; none of them may be
read as saying the channel reads the right way round there. Closing it is the same retention
decision as the rest of the no-loop-open family and belongs in its own slice.

**The model is unchanged.** No slot was widened and no row is retained that was not retained before.
This closes the SILENCE only. Retaining an identity-less `RMR` row, or modelling a Loop 2430 `AMT`,
are retention decisions with their own breaking-change cost and belong in their own slices.

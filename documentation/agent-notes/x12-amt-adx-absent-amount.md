# x12 - the `AMT` / `ADX` absent-amount silent drop (2026-08-07)

`X12-837-RESIDUALS`' `AMT` / `ADX` residual, filed by `#83`'s refuters and deferred there because
closing it needs a retention decision and a registry code, neither of which belongs in a type
widening. Split out of `documentation/agent-notes.md` under ADR 0023 because that file was at
**249,982 of a 250,000-byte budget** and the hook refused the write. **Nothing dropped.**

## The defect

`decodeAmt` (835, 837, 834) and `decodeAdx` (820) answer `undefined` for the **whole row** when the
amount element decodes no value, and every caller then dropped the row. An `AMT` and an `ADX` are not
slots on a bigger record: each one **is** a record, carrying an amount plus the thing the amount is
about. So the qualifier (`AMT-01`) or the adjustment reason code (`ADX-02`), and any reference
qualifier and id, went with the amount.

Reproduced on the base tree at `9db104b`, on all four readers, before anything was designed:

| reader              | segment                        | amount element | at base                              |
| ------------------- | ------------------------------ | -------------- | ------------------------------------ |
| `get835`            | `AMT` (claim and service line) | AMT-02         | `amounts: []`, `warnings: []`        |
| `get837Claims`      | `AMT` (claim and service line) | AMT-02         | `amounts: []`, `warnings: []`        |
| `get834Enrollments` | `AMT` (coverage)               | AMT-02         | `amounts: []`, member `warnings: []` |
| `get820Payments`    | `ADX`                          | ADX-01         | `adjustments: []`, `warnings: []`    |

**▶ 🩺 THE ABSENT / UNPARSEABLE DISTINCTION IS THE WHOLE FILING, AND THE WIDER FORM IS FALSE.** An
**ABSENT** amount element was silent on every channel. A **PRESENT** one holding bytes that do not
decode (`1,234.56`, `$120.00`, `-25.00USD`) was dropped **and warned**, because `decodeAmt` and
`decodeAdx` pass the decimal sink, so `X12_UNPARSEABLE_DECIMAL` fired at that `elementIndex`. Only
the absent route was silent. A first draft of `#83`'s bullet said "does not decode" and pass 2
measured it false; that cost a minor, and it is why this file says ABSENT.

Two of this repo's own fixtures already carried the case and the suite asserted the silence:
`test/fixtures/premium/820-edge.edi` line 17 is a bare `ADX~`, and
`test/fixtures/enrollment/834-edge.edi` line 24 is `AMT*P3~`. Both tests now assert the report.

## The remedy

`X12_AMOUNT_ROW_DROPPED`, the **30th** Tier-2 code (additions-only), plus the public factory
`amountRowDropped(position)`.

- **On the 835 and the 837 the row lost may be a LINE-level one.** Both attach an `AMT` to the open
  service line first and to the claim only when there is none. Pass 1 refuted the slice for calling
  the 837's site "claim-level" on six surfaces; this package's own dogfooded spec declares `AMT`
  situational in Loop 2400 (`src/transactions/claim/loop-spec.ts`), so an X222A1 sales-tax `AMT*T` or
  postage `AMT*F4` on a line is exactly the shape being lost. A consumer told to read `claim.amounts`
  would have found it unchanged and treated the warning as stale.
- **Anchored at the `AMT` / `ADX` itself, with NO `elementIndex`.** One of the two routes into it is
  an absent element, and an absent element has no index to name - the same reason
  `X12_837_UNKNOWN_VARIANT` carries none for an absent ST-03. The segment fixes which element was
  being read anyway (AMT-02 or ADX-01).
- **Raised for BOTH routes.** The report is about the ROW being lost, which is true either way. What
  separates the routes is whether an `X12_UNPARSEABLE_DECIMAL` accompanies it at the same
  `position.segmentIndex`.
- **The 834's lands on the MEMBER's own `warnings`**, following the per-member scoping the decimal
  sink beside it already used. A roster-level report would say a premium was lost without saying
  whose.
- **The call site is the walker, not the decoder.** `decodeAmt` / `decodeAdx` stay pure and the
  warning is pushed where the row would have been attached, so it fires on the decode failure and
  never on the separate attachment failure below.

## The constraint the previous slice paid for, applied here

**🛑 A WIDENING THAT MOVES A CASE ONTO A NEW CODE SILENTLY BLINDS EVERY CONSUMER PREDICATE WRITTEN
AGAINST THE OLD ONE, AND THIS PACKAGE'S OWN DOCS ARE SUCH A CONSUMER.** That is what refuted `#83`
on pass 1. Applied here, the answer is that **nothing moves**: the unparseable route keeps
`X12_UNPARSEABLE_DECIMAL` at the same element on the same document and merely gains a second code
beside it. That is asserted rather than assumed - `test/transactions-amount-row-dropped.test.ts` pins
both halves, that a one-code gate misses the absent-amount document **and** that it still fires
exactly where it always did, including on an unparseable `CLP-04`, which this slice does not touch at
all.

The sweep that goes with it, because "no case moved" is not the same as "no doc went stale":
`KNOWN-LIMITATIONS.md`, `docs-content/spec-notes-money.md`, `docs-content/troubleshooting.md` and
`docs-content/cookbook.md` each carried a sentence of the form _"an absent element does not warn"_ or
_"a row whose amount does not decode is sometimes dropped whole instead"_. Every one is now qualified
to say what it is actually about - `X12_UNPARSEABLE_DECIMAL` specifically, not silence generally.

**A `PRE-EXISTING` doc defect corrected in passing, disclosed rather than folded in:**
`docs-content/cookbook.md` said an undecoded 837 service line "ships `charge` and `units` as `0`".
`#83` made those `undefined` on the same unreleased version, so the page contradicted the money
spec-note it links to. One phrase, in a paragraph this slice was rewriting anyway.

## The census

**16 of 26 new cases red** against a base tree restored from `9db104b` **by file copy** (`git archive
| tar -x` into a scratch directory, never `git checkout` in the live tree - that has silently eaten
uncommitted work twice). The 10 green are exactly the CONTROLs, the BOUNDs, and the additions-only
pin that must be green on both trees:

- **5 CONTROLs**: a stated amount and a stated zero still build a row and still warn nothing, on the
  835, 837, 834 and 820. The **stated zero** half is the one that must not collapse into the absent
  case.
- **4 BOUNDs**: the 835's `AMT` that DOES decode with no claim open; the 834's `AMT` with no `HD`
  open; the 820's `RMR` that states an open item and no amount, whose row survives; and the 820's
  `RMR` that states an amount and NO open item, whose row is dropped whole and silently. All four
  are silent on both trees, deliberately.
- **1 additions-only pin**: the old one-code gate still fires where it fired.

The pass-1 remedy added four cases. Three are red at base, because they assert head behaviour: the
837's LINE-level `AMT`, the "with no claim open an ABSENT amount STILL warns" half of the bound, and
the Loop 2430 inversion, whose head-only half is the report on the undecoded `AMT`. The fourth, the
820 `RMR` with no identity, is a `PRE-EXISTING` disclosure pin and is green on both trees by
design. **No count of them is given without its list**, which is the defect pass 2 caught one
paragraph earlier in a first draft of this same section.

**Negative control:** the same file against an `hl7` tree restored the same way collects all 26 cases
and passes **none** of them - every one dies at `parseX12 is not a function`, because that package's
barrel has no such export. The apparatus is bound to this package's surface and cannot report green
against another one.

**One vacuous green was found and inverted before it shipped.** The "every reader reports it at the
segment and never at an element" sweep iterated a filtered array, and at base that array is empty, so
the `for` body never ran and the case passed having asserted nothing. It now asserts the length
first, which is what turned it red at base. That is the `#63` failure mode (four of six new cases
vacuous) caught by running the census rather than by reading the file.

## Bounds, stated because the wider reading is the tempting one

- **It reports a row whose AMOUNT was read and decoded no value. State it as a property of the READ,
  never of the walker's control flow** - that is what pass 1 refuted. A segment discarded BEFORE its
  amount is read is not on this channel (the 834's `AMT` with no `HD` open, the 820's `ADX` with no
  remittance open), and neither is one whose amount decoded and then found nothing to attach to. But
  **"nothing open means silent" is FALSE**: the 835 and the 837 decode first, so an `AMT` with an
  absent amount and no claim open does raise this code. Measured both ways at head.
- **🔴 An 820 `RMR` is not on this channel, and NOT because its row survives.** `decodeRmr` returns
  `undefined` when `RMR-01` and `RMR-02` are both empty, **before** `RMR-04` is read. So an `RMR`
  that states an open item and no amount keeps its row with `amountPaid` left `undefined` and there
  is nothing to report - but `RMR****150.00*150.00~` is dropped whole with `warnings: []`, taking a
  stated 150.00 payment, its payment-action code and its amount due. **The first draft of this bullet
  published the retention half as if it held for every `RMR`, and pass 1 falsified it with that one
  segment.** `PRE-EXISTING`, identical on both trees, filed as its own item: nothing failed to decode
  there, so covering it is a retention decision this slice defers. Both cases are now pinned.
- **A Loop 2430 `AMT` under an open `SVD` is discarded outright, and the report INVERTS there.** With
  a claim and a line open, the 837's adjudication skip drops an `AMT*EAF*75.00~` (Remaining Patient
  Liability, declared in this package's own Loop 2430 spec) in silence, while `AMT*EAF~` raises this
  code - the warning is present exactly where LESS was lost. A v1 scope limit on the adjudication
  model rather than a failed read. Disclosed and pinned, not widened.
- **The model is unchanged.** No slot was widened, no row is retained that was not retained before.
  This closes the SILENCE only, exactly as `X12-837-SV-SILENT-ZERO` did before
  `X12-837-SV-UNDEFINED-DECIMAL` closed the `0`. Retaining a row with an `amount` of `undefined`
  would be a breaking model change and belongs in its own slice if anyone wants it.
- **No TR3 usage code is asserted.** Nobody here has read X221A1, X222A2, X220A1 or X218 for `AMT` or
  `ADX` usage, and the code does not need one: the argument is that a row the sender wrote left the
  model, which is true whatever the segment's usage is.

## Deliberately not touched

The five other `PRE-EXISTING` findings carried in `X12-837-RESIDUALS` (a stray `SVx` re-typing a
submission; an `NM1*87` with a `CLM` open landing in `claim.providers`; `attachContact`'s
`/* v8 ignore */` arm; a Loop 2010AB short a Required `N3`; an `NM1*87` in Loop 2000B with no claim
open), and **SV3-06's TR3 usage, which is still not grounded** - do not claim it is.

## Relocated from `x12/CLAUDE.md`, 2026-08-10, VERBATIM, NOTHING DROPPED

Moved here to pay for the `X12-ISA-ELEMENT-ARITY` trap's pass-2 correction under this repo's
zero-headroom ratchet. The block covered BOTH this slug and `x12-stated-amount-discarded.md`, and
it is kept whole here rather than split. The imperative stays in `CLAUDE.md`; the bullets are the
text that was there, unchanged.


- **🩺 AN `AMT`/`ADX` IS A RECORD, NOT A SLOT: no decoded amount (AMT-02, ADX-01) = NO ROW, qualifier
  and reason code gone with it.** `X12_AMOUNT_ROW_DROPPED` at the SEGMENT, **NO `elementIndex`**; the
  834's goes on the **MEMBER's** `warnings`. **The 835 and 837 attach an `AMT` to the open LINE
  first, so the lost row is often LINE-level; never call that site "claim-level".**
- **🩺 SAY ABSENT, NEVER "does not decode"** (the wider form cost a pass-2 minor): only ABSENT was
  silent, UNPARSEABLE already warned. **Both raise it, NOTHING MOVED off `X12_UNPARSEABLE_DECIMAL`**,
  and whether one sits at the same `segmentIndex` separates them.
- **🩺 TWO AMOUNT-ROW CODES, DISJOINT, NEVER ONE SEGMENT.** The dropped one needs an amount element
  that DECODED NO VALUE; `X12_STATED_AMOUNT_DISCARDED` needs one the sender POPULATED, discarded for
  a reason that is NOT about the amount. Two routes, ONE message, NO discriminant: an 820 `RMR` with
  BOTH identity elements empty, and an 837 `AMT` under an open `SVD`. SEGMENT, no `elementIndex`.
  **SEPARATE BECAUSE REUSE WOULD FALSIFY A PUBLISHED SEPARATOR ON MONEY** (the dropped code's own
  message says an unaccompanied instance means the sender stated NO amount). It closed an INVERSION:
  under an open `SVD` the ABSENT amount warned and the STATED one did not, so the report sat exactly
  where LESS was lost.
- **🩺 NEVER CLAIM THE BYTES ARE DECODABLE - a pass-1 major.** The `RMR` guard is a
  PRESENCE test, never a decode, so **NO `X12_UNPARSEABLE_DECIMAL` even on unreadable bytes** and it
  fires on `1,234.56` too; deciding by decode would mint it where it never fired. Only the `AMT`
  route guarantees a value.
- **🩺 STATE THE BOUND AS A PROPERTY OF THE READ, NEVER OF CONTROL FLOW. "Nothing open means silent"
  is FALSE** - the 835/837 decode BEFORE looking for somewhere to attach, so an absent amount with no
  claim open DOES warn; the 834/820 return first and stay silent. **NO LOOP OPEN is a DIFFERENT loss
  and STAYS SILENT** (834 `AMT` no `HD`, 820 `ADX` no remittance, 835/837 `AMT` before any claim), so
  never widen to "a stated amount row is always reported"; a bare `RMR~` and one stating only RMR-03
  are silent too. **The INVERSION SURVIVES at the 835/837 sites ONLY**
  (`PRE-EXISTING`). **An empty filtered array asserts NOTHING.**


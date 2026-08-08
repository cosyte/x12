# `X12-837-AMBIGUOUS-VARIANT` (2026-08-08)

The `X12-837-RESIDUALS` slice that closed the **silence** around the stray-`SVx` re-typing, the
highest-blast-radius of that item's five `PRE-EXISTING` findings. Its own file rather than a section
in `documentation/agent-notes.md`, which stands at 249,982 of a 250,000-byte budget.

## The defect, and what it is NOT

`get837Claims` resolves the 837 variant **before the walk**, as
`explicitType ?? variantFromIcr ?? variantFromSegment`. Absent a caller `type` option, and where
`ST-03` names none of `005010X222A2` / `005010X223A3` / `005010X224A2`, `variantFromSegment` scans
the transaction body and takes the **first** `SV1` / `SV2` / `SV3` in it, **orphans included** - a
service segment with no Loop 2400 open is eligible for the fallback like any other.

So one stray `SV2` ahead of a conformant Professional claim re-types the whole submission
Institutional. `submission.variant` reads `"I"`; `decodeSv1` returns on its variant check, so every
`SV1` line reads `charge` `undefined`, `units` `undefined` and `procedureCode` `undefined`; and a
consumer routing on `submission.variant` sends a Professional claim down an Institutional path.

**That behaviour is `PRE-EXISTING`, reproduces at `0.0.10`, and is NOT changed here.** Which variant
a document resolves to, which lines decode and which warnings the walk raises are byte-for-byte what
they were at `c758bcd`. What was missing was any report of the **resolution** itself: the line-level
consequences were on the channel and the submission-level typing that produced them was not.

**Why the fallback was not narrowed.** Excluding orphans would change how already-published
documents decode, on a package consumers are running. `#71` reached the same conclusion about the
same code path and its remedy was to correct the claim on every surface rather than narrow the
fallback; this slice adds a report and leaves the decode alone for the same reason.

## The predicate, and why it is the conflict rather than the fallback

The code fires where **the fallback DECIDED** (`opts.type` absent and `ST-03` unresolving) **AND**
the body carries service segments naming more than one variant.

Not "whenever the fallback decides": with every `SVx` in the body naming one variant, the fallback
has nothing contradicting it and the guess is the only reading available. A conflict is exactly the
observable ambiguity, and it is what the reader can measure without deciding anything.

**Which segment is the stray one is deliberately NOT decided.** A stray service segment and a
conformant one are indistinguishable to this reader, first-wins takes the first whether or not a
Loop 2400 was open at it, and no TR3 rule makes a majority or an in-loop position authoritative.
Reporting the conflict is honest; picking a winner would be inventing.

## The anchor

`{ segmentIndex: 0, transactionIndex: 0 }` - the `ST`, which is `tx.segments[0]` and carries the
`ST-03` that would have settled the question. The same anchor as `X12_837_UNKNOWN_VARIANT`, and for
the same reason: the two codes are the two outcomes of one resolution.

**No `elementIndex`.** The conflict is a property of the body rather than of an element, and one
route into the code is an `ST-03` that is absent altogether, where `ST*837*0001~` has no element 3
to name. `segmentIndex: 0` is not a neutral sentinel in this library; a committed test asserts
`tx.segments[0]?.id === "ST"` rather than assuming it.

**Once per transaction**, because there is one resolution per transaction. The scan breaks at the
first disagreement, so the added work is bounded by the distance to it, and the scan is skipped
entirely where a caller `type` or a resolving `ST-03` means `variantFromSegment` would never be read.

## The additivity claim, and how it is pinned

**The rule this lineage was decided on: a widening that moves a case onto a NEW code silently breaks
every consumer predicate written against the OLD one, and the package's own docs are such a
consumer** (`#83` was refuted for exactly that). Nothing moves here. The walk never reads the
conflict flag; the variant every claim and line is decoded against is the one first-wins picked.

Pinned three ways in `test/transactions-claim-837-ambiguous-variant.test.ts`:

1. **Channel-wide `toEqual`** on every case. Never a membership test - a pin that reads one code can
   observe neither a silence ending nor a case moving.
2. **A parameterised additivity block** asserting, for three documents, that the channel with the new
   code _filtered out_ is exactly what `0.0.13` produced.
3. **Six honest controls** that must stay exactly as silent as they were: a single-variant body under
   an unresolvable `ST-03`; a resolving `ST-03` with a mixed body; a caller `type` with a mixed body;
   an out-of-enum caller `type`; no `SVx` at all; and a clean 837P.

## Census

**12 of 20 behavioural cases red** against a base `src/` restored from `c758bcd` **by file copy, not
`git checkout`** (that has silently eaten uncommitted work twice in this ecosystem). The 8 green are
exactly the controls plus the two cases that assert pre-existing behaviour - the recovery under
`{ type: "P" }`, and the pin that the resolved variant is unchanged. Two further cases (the factory
and its `ALL_WARNING_MESSAGES` membership) cannot exist on a base tree at all and are excluded from
the 20 rather than counted as red.

**Negative control: the same probe against `hl7`'s `src/` fails all 20 with
`TypeError: parseX12 is not a function`**, so the measurement is package-specific rather than an
artifact of a shared scratch path.

## One existing test went red, and that is the finding

`test/transactions-claim-837-service-segment-without-lx.test.ts` carried a case titled
`🩺 PRE-EXISTING: an orphan segment DOES feed the variant fallback when ST-03 resolves to nothing`,
pinning the channel as exactly `[WITHOUT_LX, NOT_DECODED]`. It is the test that pinned this silence,
so closing the silence turns it red - expected, not a regression, and the same shape `#67`'s
residual test had. It now pins all three codes, and the title's `PRE-EXISTING:` prefix is dropped
because the **silence** no longer is; the re-typing still is, and the comment says so.

The same test's trailing-`SV2` case (`LX*1~`, `SV1`, `SV2`) gained a channel assertion it did not
have. It is the sharpest document in the slice: the foreign `SV2` reaches a Loop 2400 the `SV1`
already decoded, so `decodeSv2` returns on the variant check and **nothing else reports it at all**.
The new code is the sole entry on that channel.

## Deferred, filed not fixed

- **A foreign or duplicate `SVx` inside an already-decoded Loop 2400 is still silent at the segment
  level.** A second `SV1` still overwrites the first's charge. `PRE-EXISTING`, its own slice.
- **Narrowing the fallback to skip orphans.** A decode change on a published package; its own slice,
  and it needs an argument this one does not make.
- **`transactionIndex` is hard-coded `0`** in `get-837.ts`. The new warning follows the file's
  existing convention rather than fixing it in passing.
- The four other `PRE-EXISTING` findings in `X12-837-RESIDUALS` are untouched, as is SV3-06's
  ungrounded TR3 usage.

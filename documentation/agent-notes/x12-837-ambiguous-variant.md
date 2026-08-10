# `X12-837-AMBIGUOUS-VARIANT` (2026-08-08)

Provenance: this repo's own source tree at `c758bcd` and at `b5dbfce`, measured (every census, every
channel, both trees). The three implementation-convention references are read out of
`VARIANT_BY_ICR` in `src/transactions/claim/get-837.ts`, which is this package's own table and
**not** a grounding of them against a TR3 - nobody here has read one, and this slice asserts no TR3
usage code. The claim that no TR3 rule makes a majority or an in-loop `SVx` authoritative is a
statement that no such grounding exists here, not a citation.

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

**That behaviour is `PRE-EXISTING` and is NOT changed here. It reproduces on the CURRENT release:
base `c758bcd` is `0.0.13` and the registry serves `0.0.13`**, and it reaches back at least to
`0.0.10`, where `#71` measured it. Never state the older bound alone - `#71`'s own version claim was
refuted for telling consumers on the current release they already had a fix they did not. Which variant
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
have. It was the sharpest document in the slice: the foreign `SV2` reaches a Loop 2400 the `SV1`
already decoded, so `decodeSv2` returned on the variant check and, **when this item landed**,
nothing else reported it: the new code was then the sole entry on that channel.
**`X12-837-SV1-OVERWRITE` has since closed that**, and the case now pins
`[X12_837_AMBIGUOUS_VARIANT, X12_837_SERVICE_SEGMENT_REPEATED]`.

## Pass 1: REFUTED, on a claim inside the frozen public message

**🩺 The `INTRODUCED` major, and it is the sixth consecutive finding in this lineage that was a claim
defect rather than a code defect.** The registry message's closing sentence enumerated what else a
contested document raises: _"a Loop 2400 carrying only a service segment for another variant still
raises `X12_837_SERVICE_LINE_NOT_DECODED` at its own LX, and a service segment arriving with no line
open still raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX` at itself."_ The second clause is **false**,
and false on a document that raises this very code: `reportOrphanServiceSegment` returns early on
`droppedLineReported`, so after a stray `LX` that opened no line, the service segments inside it are
**silent**. That suppression is deliberate, pre-existing and documented in `KNOWN-LIMITATIONS.md`;
the new sentence contradicted the package's own disclosure, in a table this repo treats as public
and frozen.

Measured at head, `ST-03` `005010X222A1`, an `LX` with no `CLM` open followed by `SV1` then `SV2`:
the channel is `[AMBIGUOUS, SERVICE_LINE_DROPPED]` and `X12_837_SERVICE_SEGMENT_WITHOUT_LX` appears
**nowhere**. Twenty whole-channel `toEqual` assertions missed it because no case exercised the
stray-`LX` route.

**Remedy: cut the claim back, do not grow the guard** - the same correction `#70` and `#80` were
forced into. The enumeration is deleted from the message and from the troubleshooting row and
replaced by the invariance statement alone: _whatever this reader raised on such a document before,
it still raises, at the same position, and this one is added beside them_ - explicitly **not** a list
of what else you will see. `CHANGELOG.md` and the changeset carry the same qualifier. **The
stray-`LX` document is now a committed case** pinning the whole channel and the absence of
`X12_837_SERVICE_SEGMENT_WITHOUT_LX` on it. No behaviour changed in the remedy; no guard was added.

Two further `INTRODUCED` minors from the same pass, both fixed here: this file carried no
`Provenance:` field where a sibling agent note does, and it said the defect "reproduces at `0.0.10`"
without saying it reproduces on the **current** release, which is `#71`'s own version trap in
miniature.

## Pass 2: NOT REFUTED

It re-measured the corrected claim rather than reading it - **a corrected claim is a new claim** -
and confirmed both halves on the remedy's own new document: `X12_837_SERVICE_SEGMENT_WITHOUT_LX`
appears on neither tree, and the replacement invariance sentence holds including the position
(`segmentIndex` 8, unmoved). It also swept for a half-deleted falsehood and found none:
`KNOWN-LIMITATIONS.md` and `docs-content/cookbook.md` never carried the enumeration.

One `INTRODUCED` minor, **inside the pass-1 remedy's own prose**, fixed in the ship commit and
therefore **UNGRADED**: this file said the repo's _fixtures_ use `005010X222A1`, which is false - it
is three test files, inline, and no fixture. Corrected below. No third pass was spent on it, per
ADR 0016 and pass 2's own recommendation to land.

## Filed by the refuters, `PRE-EXISTING`, not fixed here

- **🩺 A second `SV1` inside an already-open Loop 2400 silently overwrites the first's money and
  procedure code. PASS 2 RE-MEASURED IT AND ESCALATED IT TO STOP-THE-LINE.** Byte-identical on both
  trees under a resolving `ST-03` `005010X222A2`:
  `LX*1~ SV1*HC:99213*8500*UN*4***1~ SV1*HC:99999*12*UN*1***1~` leaves ONE service line reading
  `charge` `12`, `units` `1` and `procedureCode` `99999`, with **`warnings: []`**. `8500` off the
  wire becomes `12` on the model and CPT `99213` becomes `99999`, on no channel at all. It cannot
  block this slice - it reproduces at base - but **both refuters independently said it should not sit
  behind another disclosure-only slice on this item.** Already named in `X12-837-RESIDUALS` and in
  `documentation/repos/x12.md`; it wants its own item.
- **CLOSED by `X12-VARIANT-ICR-UNGROUNDED` (2026-08-08) -
  `documentation/agent-notes/x12-variant-icr-ungrounded.md`.** Pass 2's worry was **correct**: the key
  set held none of the identifiers 45 CFR 162.1102 adopts and was missing the two production 837P and
  837I traffic carries, so the `SVx` fallback WAS the normal path. The table is corrected and the
  three test files below now use `004010X098A1`. **This section is left as the dated record it is; read
  the successor note for what is true now.** The rest of this bullet is that record:
- **The `VARIANT_BY_ICR` key set is ungrounded, and pass 2 named it the thing that most worries it.**
  Three of this repo's own **test files** reach for `005010X222A1` inline as the real-world 837P
  `ST-03` that does **not** resolve; `005010X222A1` appears nowhere under `test/fixtures/`, and the
  golden corpus uses the resolving references (`837p.edi` -> `005010X222A2`, `837i.edi` ->
  `005010X223A3`, `837d.edi` -> `005010X224A2`). **Say it that way** - a first draft here said
  "fixtures" and pass 2 measured it false. The substantive worry survives the correction: if the key
  set misses the HIPAA-adopted errata, the `SVx` fallback is the **normal** path on production 837P
  traffic rather than the exception, which changes what this code's message ought to say. **No
  primary source was consulted in either direction and none is claimed** - pass 2 recorded its own
  recollection of the adopted set as `UNDETERMINED` rather than a citation, and the table is
  unchanged from base. Grounding the three references against the WPC / X12 TR3 listing is its own
  unit, and it should come before the next slice on this item.

## Deferred, filed not fixed

- **A foreign or duplicate `SVx` inside an already-decoded Loop 2400.** Deferred here, and **CLOSED
  by `X12-837-SV1-OVERWRITE`**: such a segment now raises `X12_837_SERVICE_SEGMENT_REPEATED` at
  itself, so this item's code is no longer the sole report on that document. The overwrite itself is
  unchanged - the second `SV1` still wins - and only the silence was closed.
- **Narrowing the fallback to skip orphans.** A decode change on a published package; its own slice,
  and it needs an argument this one does not make.
- **`transactionIndex` is hard-coded `0`** in `get-837.ts`. The new warning follows the file's
  existing convention rather than fixing it in passing.
- The four other `PRE-EXISTING` findings in `X12-837-RESIDUALS` are untouched, as is SV3-06's
  ungrounded TR3 usage.

## Relocated from `CLAUDE.md`, 2026-08-10, verbatim

Moved here in full to pay for the new `X12-ENVELOPE-VALUE-ROUTES` trap on deletion remedies. Nothing
is dropped and nothing is shortened; `CLAUDE.md` keeps only the imperative pointer.

- **🩺 THE `SVx` FALLBACK IS NOT NARROWED AND MUST NOT BE; THIS CLOSED ONLY THE SILENCE.**
  `X12_837_AMBIGUOUS_VARIANT` at the `ST`, NO `elementIndex`, ONCE per transaction, ONLY where the
  fallback DECIDED and the body names more than one variant. **A caller `type` or a resolving
  `ST-03` means NO guess, so it is NOT raised however mixed the body is: a property of the
  RESOLUTION, never of the document.**
- **🩺 NEVER PICK A WINNER: a stray `SVx` and a conformant one are indistinguishable here**, and
  first-wins takes the first, open Loop 2400 or not. Choosing would be inventing.
- **🩺 ADDITIVITY HERE IS INVARIANCE, NEVER A LIST OF WHAT ELSE YOU WILL SEE.** The frozen message
  said "a service segment with no line open still raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX`"; a
  refuter measured it FALSE - a stray `LX` suppresses it. Say only: whatever was raised is still
  raised, same position. Pinned CHANNEL-WIDE with this filtered out. **Never with
  `X12_837_UNKNOWN_VARIANT`.** **NO LONGER SOLE:** a foreign `SVx` inside an already-decoded Loop 2400
  raises `X12_837_SERVICE_SEGMENT_REPEATED` at itself (trap above).

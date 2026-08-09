# Changelog

All notable changes to `@cosyte/x12` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **🩺 `Build837EnvelopeSpec.implementationConventionReference` - the caller now states the ST-03 /
  GS-08 implementation convention reference `build837P` / `build837I` / `build837D` declares**
  (`X12-837-EMIT-IDENTIFIER-FIXED`). One value, **both elements**; omit it and the builders emit
  exactly what they always have.

  **What this fixes, and it is a rejected claim rather than a mis-read one.** The builders stamped
  `005010X222A2` / `005010X223A3` / `005010X224A2` with no way to change them. Two of those are not
  what CMS and several state Medicaid companion guides require in ST-03 and GS-08 on production
  professional and institutional claims, which ask for `005010X222A1` and `005010X223A2`, so **a
  partner on one of those guides rejected every 837 this library built and a caller had no remedy.**
  The read side of the same fact was grounded in the release before this one; this is the emit side.

  **🛑 The defaults are UNCHANGED, on purpose, and that is the whole shape of the fix.** Which
  published guide identifier a trading partner accepts is a **partner fact, not a spec fact**.
  Re-stamping the default would silently change bytes this library already puts on the wire and
  break the partners it works with today, so the default stays and the caller states what its own
  partner asked for. Nothing about an existing call changes.

  **What it refuses of its own, all `Claim837BuildError` with code `X12_837_BUILD_INVALID_SPEC`, and
  none of them echoes the value you passed.** These sit on top of the element-type guard every string
  slot in every builder already has, which refuses a non-string with the same code, so read the list
  as what this field adds and not as a closed account of everything that can refuse. No total is
  published.
  - **Empty.** A trailing empty element is not emitted at all, so an empty reference would remove
    ST-03 and GS-08 rather than send them empty - a silent structural loss on two required elements.
  - **Carrying an active delimiter or the release character.** The value is refused rather than
    escaped. A trading partner's parser is not obliged to honour the release escape, and a published
    guide identifier has no legitimate use for a delimiter, so the refusal is kept even now that
    this library's own reader would carry it (see the envelope-splitter entry below).
  - **A reference this library's own reader resolves to a DIFFERENT 837 variant** (`005010X223A2`
    handed to `build837P`). The emitted file would declare one variant and carry another's service
    segments, and `get837Claims` would decode none of its service lines. Same class as the existing
    refusal for a service line whose `variant` disagrees with the builder's. The message names the
    variant the builder emits and deliberately not the one the reference belongs to.

  **A reference outside the read table is emitted as given, and that is deliberate.** Nothing makes
  the published-errata set provably exhaustive, so refusing an unrecognised identifier would claim
  an exhaustiveness this library does not claim when reading either. The honest cost is pinned as a
  test: on such a file this library's own reader falls back to the `SVx` scan, exactly as it does
  for any unrecognised ST-03. The **length** is not bounded either, and the two elements' maxima
  differ: GS-08 is data element 480 (`AN 1/12`), ST-03 is element 1705 (`AN 1/35`).

  **🩺 A guard on this element cannot make the element trustworthy, and the disclosure above is
  therefore about the whole envelope segment rather than these two elements.** An **unescaped**
  active delimiter in a _different_ `GS` or `ST` element still ends its own element and shifts every
  element after it, so ST-03 and GS-08 are then read out of a neighbour's slot, and no refusal here
  can reach it. A **release-escaped** one no longer does - see the entry below, which landed after
  this one and retracts the part of it that said escaping could not help.

- **🩺 `X12_837_SERVICE_SEGMENT_REPEATED`, the 33rd Tier-2 warning code, plus the public factory
  `serviceSegmentRepeated(position)`** (`X12-837-SV1-OVERWRITE`). A **second** `SV1` / `SV2` / `SV3`
  arriving inside an **already-open** Loop 2400 now says so, at that repeated segment. Through
  `0.0.13` it said nothing at all.

  **🩺 What that cost, and it is money and a procedure code.** A service line carries **one** service
  segment's worth of slots, and every decoder writes **all** of the slots its kind writes. Under an
  `ST-03` of `005010X222A2`, `SV1*HC:99213*8500*UN*4***1~` followed by `SV1*HC:99999*12*UN*1***1~`
  inside one `LX` left ONE line reading `charge` **`12`** and `procedureCode` **`99999`**, with
  `warnings: []`. `8500` became `12`, CPT `99213` became `99999`, and nothing was raised on any
  channel. **The worst corner is a repeat whose own charge element is ABSENT:** it writes `undefined`
  over the amount the first one stated, and `X12_837_SERVICE_LINE_NOT_DECODED` does **not** fire
  there, because a service segment did decode.

  **🛑 THIS CLOSES ONLY THE SILENCE, AND THE RESTRAINT IS THE POINT.** The decode is **not** narrowed:
  last-wins is unchanged, element for element, so which values a document decodes to are byte-for-byte
  what they were at `0.0.13`. This reader cannot tell a stray service segment from a conformant one,
  so choosing the first would be inventing; and changing which occurrence wins changes how
  **already-published documents decode**. That is the same call made for the `SVx` variant fallback.

  **It fires on a repeat of ANY kind, decoded or not.** One whose kind does not match the resolved
  variant is read into nothing and overwrites nothing - what it carries reaches no part of the typed
  model - and it is reported the same way, before or after the matching one.

  **Anchored at the repeated service segment**, with **no `elementIndex`**: what is reported is a
  second occurrence of the segment, not a defect in an element of it. **Once per repeat**, and the
  count is scoped to the LINE and never latched, so a first service segment under a later `LX` is a
  first. It can never name the same segment as `X12_837_SERVICE_SEGMENT_WITHOUT_LX`, which requires
  that no Loop 2400 be open.

  **It is additive and nothing moved onto it**, pinned by committed tests asserting the whole warning
  channel with the new code filtered out. **No consumer predicate written against any existing code
  changes meaning.** Read that as invariance, not as a list of what else you will see.

  **🛑 The package's own documentation was a consumer, and it was blind.** The cookbook's "gate before
  you post a line amount" recipe named four codes and **none** of them fires on the overwrite
  document, so a consumer following it posted `12` for a line the sender also sent as `8500`. The
  cookbook, the troubleshooting table and `KNOWN-LIMITATIONS.md` now name this code beside the other
  four, and a committed test pins that the four-code gate misses what the five-code gate catches.
  **The recipe was not the only page:** `spec-notes-money` named `X12_837_SERVICE_LINE_NOT_DECODED`
  as "the known instance" of an 837 charge reading `undefined` from a slot no reader read, and the
  repeat corner is a second instance by a different route on which that code does not fire. It now
  says so.

- **🩺 `X12_837_AMBIGUOUS_VARIANT`, the 32nd Tier-2 warning code, plus the public factory
  `ambiguous837Variant(position)`** (`X12-837-RESIDUALS`). An 837 whose variant was decided by the
  `SVx` fallback, in a transaction body that carries service segments for **more than one variant**,
  now says so at the `ST`. Through `0.0.13` it said nothing at all about that resolution.

  **What that cost.** Variant resolution runs before the walk as
  `explicitType ?? variantFromIcr ?? variantFromSegment`. Absent a caller `type` option, and where
  `ST-03` names no implementation convention this reader recognises, the reader falls back to the
  **first** `SV1` / `SV2` / `SV3` in the body, orphans included. One stray `SV2` ahead of a conformant
  Professional claim therefore re-types the whole submission Institutional: `submission.variant` reads
  `"I"`, and a consumer routing on that field sends a Professional claim down an Institutional path.
  The line-level consequences were reported; **the submission-level typing that produced them was on
  no channel**, so `submission.variant` carried a confident value with nothing to contradict it.

  **🛑 THIS CLOSES ONLY THE SILENCE, AND THE RESTRAINT IS THE POINT.** The fallback is **not**
  narrowed and first-wins is unchanged, so on every document that reaches the fallback the variant
  resolved and the lines decoded are byte-for-byte what they were at `0.0.13`, and this code is added
  beside whatever the walk already raised. (`X12-VARIANT-ICR-UNGROUNDED`, in this same release,
  changed WHICH documents reach the fallback; read its entry for what decodes differently.) Excluding orphans from
  the fallback would change how already-published documents decode and is its own slice.

  **🩺 Which service segment is the stray one is NOT decided.** This reader cannot tell a stray
  service segment from a conformant one, and the fallback takes the first whether or not a Loop 2400
  was open at it. Reporting the conflict is honest; picking a winner would be inventing. Re-read with
  `get837Claims(delimiters, tx, { type })` to decode against a variant you trust.

  **It reports the RESOLUTION, never the document.** A caller `type`, or an `ST-03` naming a known
  convention, means no guess was made and this code is **not** raised however mixed the body is.

  **Anchored at the `ST`** (`tx.segments[0]`, which carries `ST-03`), with **no `elementIndex`**: the
  conflict is a property of the body rather than of an element, and one route into it is an `ST-03`
  that is absent altogether. Raised **once per transaction**, because there is one resolution per
  transaction, and it can never travel with `X12_837_UNKNOWN_VARIANT`, which is the other outcome of
  that same resolution.

  **🩺 It is additive, and nothing moved onto it.** `X12_837_SERVICE_LINE_NOT_DECODED`,
  `X12_837_SERVICE_SEGMENT_WITHOUT_LX` and `X12_837_SERVICE_LINE_DROPPED` fire on exactly the
  documents they fired on before **this code was added**, in the same positions, pinned by committed
  tests that assert the whole warning channel with the new code filtered out. **No consumer predicate
  changes meaning because of this code.** (`X12-VARIANT-ICR-UNGROUNDED`, in this same release, DID
  change which documents reach the `SVx` fallback; read its entry above.) Read that as **invariance and not as a list of what else you will
  see** on a contested document: it does not promise that any particular loss on one is reported at
  all, and one that is not was not reported before this code existed either. A stray `LX` that opened
  no line, for one, already suppressed `X12_837_SERVICE_SEGMENT_WITHOUT_LX` for the service segments
  inside it, and still does.

- **🩺 `X12_STATED_AMOUNT_DISCARDED`, the 31st Tier-2 warning code, plus the public factory
  `statedAmountDiscarded(position)`** (`X12-STATED-AMOUNT-DISCARDED`). The entry below reports a row
  whose amount this library could not read. This one is the opposite case: **the reader discarded
  the row for a reason that is not about the amount at all**, so the amount was never the problem
  and, on one of the two routes, was never even looked at. The bytes stay verbatim on
  `tx.segments[…].raw`; decode them yourself before posting. Through `0.0.12` both routes were
  silent on every channel.

  **The two routes, enumerated.** An **820 `RMR`** under an open remittance loop whose `RMR-01` and
  `RMR-02` are **both empty** while `RMR-04` or `RMR-05` is populated: `decodeRmr` refuses the open
  item on identity **before** either amount element is read, so `RMR****150.00*150.00~` gave
  `openItems: []` and `warnings: []`, taking a stated payment, a stated amount due and `RMR-03`'s
  payment action code together. And an **837 `AMT`** arriving while a Loop 2430 line adjudication
  (`SVD`) is open, whose `AMT-02` decoded: the v1 adjudication model carries no amount row, and
  attaching one to this submission's own service line would put another payer's figure on it, so
  `AMT*EAF*75.00~` (Remaining Patient Liability) was skipped in silence.

  **🩺 That second route is where the channel read BACKWARDS, and squaring it is the point.** Under
  an open `SVD`, `AMT*EAF~` raised `X12_AMOUNT_ROW_DROPPED` and `AMT*EAF*75.00~` raised nothing: the
  report was present exactly where **less** was lost. Both report now, and which code arrives is
  what says which loss it was.

  **It carries no `position.elementIndex`.** On the `RMR` route the loss spans `RMR-04` and
  `RMR-05` and no single element names it; on the `AMT` route the element is fixed by the segment.

  **🩺 It is additive, and nothing moved onto it.** `X12_AMOUNT_ROW_DROPPED` and
  `X12_UNPARSEABLE_DECIMAL` fire on exactly the documents they fired on before, pinned by committed
  tests. **The two amount-row codes are disjoint and can never name the same segment**, because this
  one requires an amount element the sender populated and the other requires one that decoded no
  value, so the code you get is the discriminant. **Gate on both.** `KNOWN-LIMITATIONS.md`, the
  money spec-note and the troubleshooting table were corrected with the code.

  **Bounds, stated as properties of the READ.** What is reported is a segment that populated its
  amount element and arrived **while the loop that would carry its row was open**. One reaching a
  reader with no such loop open is a different loss and is **still silent**: the 834's `AMT` with no
  `HD` open, the 820's `ADX` with no remittance open, and the 835's and the 837's `AMT` before any
  claim or service line. A bare `RMR~` states nothing and is silent, as is an identity-less `RMR`
  carrying only a payment action code. And this code says **nothing** about whether the amount would
  have decoded: the `RMR` route refuses the row before attempting the decode, so it is raised on
  `RMR****1,234.56~` exactly as on `RMR****150.00*150.00~`, with **no `X12_UNPARSEABLE_DECIMAL`
  beside it in either case**, on this release and on every earlier one. **Do not read an
  unaccompanied instance as evidence the bytes are postable.** Only the `AMT` route guarantees a
  decodable amount, because there `AMT-02` decoded before the row was skipped.

- **🩺 `X12_AMOUNT_ROW_DROPPED`, the 30th Tier-2 warning code, plus the public factory
  `amountRowDropped(position)`** (`X12-AMT-ADX-ABSENT-AMOUNT`). An `AMT` or `ADX` is not a slot on a
  bigger record: each one **is** a record, carrying an amount plus the thing the amount is about. So
  when the amount element (`AMT-02`, `ADX-01`) decodes no value there is no row to build, and
  `AMT-01`'s qualifier or `ADX-02`'s adjustment reason code is dropped with it. Through `0.0.12`
  that happened with **no diagnostic on any channel**: `AMT*B6~` gave `claim.amounts: []` and
  `warnings: []`, which reads exactly like a document that never carried the segment. It is now
  reported, at the `AMT` / `ADX` itself.

  Raised by four surfaces: the 835's `AMT`, the 837's `AMT`, the 834's coverage `AMT` and the 820's
  `ADX`. The 834's lands on that **member's** own `warnings`, the same per-member scoping the
  decimal sink beside it already used, because a roster-level report would say a premium was lost
  without saying whose. **On the 835 and the 837 the `AMT` attaches to the open SERVICE LINE first
  and to the claim only when there is none, so the row lost may be a line-level one** - an unchanged
  `claim.amounts` is not evidence the warning is stale.

  **It carries no `position.elementIndex`**, deliberately. One of its two routes is an absent
  element, and an absent element has no index to name; the segment fixes which element was being
  read anyway.

  **🩺 It is additive, and no case moved onto it.** An amount that is present and does not decode
  still raises `X12_UNPARSEABLE_DECIMAL` at its own `elementIndex`, now **alongside** this code
  rather than instead of it, so a gate you already wrote against that code fires on exactly the
  documents it fired on before. Whether one accompanies this code at the same `position.segmentIndex`
  is what separates the absent route from the unparseable one, since this code is raised for both
  and discriminates neither. What a one-code gate never caught, on any release, is the
  absent-amount row: **gate on both.** `KNOWN-LIMITATIONS.md`, the money spec-note and the
  troubleshooting table were corrected with the code, and a committed test pins both halves - that
  the one-code gate misses the absent-amount document, and that it still fires where it always did.

  **Bounds, stated because the wider reading is the tempting one, and stated as properties of the
  READ rather than of the walker's control flow.** What is reported is a row whose amount was read
  and decoded no value. A segment discarded **before** its amount is read is not on this channel
  (the 834's `AMT` with no `HD` open, the 820's `ADX` with no remittance open), and neither is one
  whose amount decoded and then found nothing open to attach the row to. **Do not shorten that to
  "nothing open means silent"** - the 835 and the 837 decode first, so an `AMT` with an absent
  amount and no claim open does raise this code. An 820 `RMR` is not on this channel either, and
  **not** because its row survives: `decodeRmr` drops on open-item identity (`RMR-01` and `RMR-02`
  both empty) **before** `RMR-04` is read, so an `RMR` stating an open item and no amount keeps its
  row with `amountPaid` left `undefined`, while one stating an amount and **no** open item is
  dropped whole. That second case, and the 837's Loop 2430 `AMT` which an open `SVD` discards
  outright, are separate losses: nothing failed to decode in either, so neither is this code's
  shape, and `X12_STATED_AMOUNT_DISCARDED` above is what reports them.

- **🩺 `X12_835_BALANCE_NOT_EVALUABLE`, the 29th Tier-2 warning code, plus the public factory
  `balanceNotEvaluable(position, invariant)`** (`X12-837-SV-UNDEFINED-DECIMAL`). Raised where a term
  of one of the three TR3 005010X221A1 §1.10.2 balance equations is `undefined` on the model, so the
  equation has nothing to compare on one side. `invariant` is the same library-owned
  `BALANCE_INVARIANTS` discriminant `X12_835_REMIT_BALANCE_MISMATCH` takes, and the message names the
  equation and carries no amount, like every other warning in this registry.

  **It is a different code from the mismatch on purpose.** The mismatch asserts a computed inequality
  between amounts the sender supplied; this one asserts only that the comparison could not be made.
  Through `0.0.12` an undecoded term collapsed to `X12Decimal.ZERO` and the equation then reported a
  mismatch between the payer's own amounts and a zero this library invented, which is the reading
  that made an absent `CLP-03` indistinguishable from a claim submitted at zero.

  **An EMPTY list of adjustments is NOT an absent term** and does not raise it: a claim carrying no
  `CAS` really did state no adjustments, so its sum is `X12Decimal.ZERO`. Only a term this library
  decoded no value from stops the equation. `build835` reaches the same verdict as
  `X12_835_BUILD_INVALID_SPEC` rather than as its balance-mismatch code, and is unreachable there
  from TypeScript because every balance term on `Build835Spec` is a required `X12Decimal`.

  **🩺 GATE ON BOTH CODES.** A posting gate written against `X12_835_REMIT_BALANCE_MISMATCH` alone
  **stops firing** on these documents when you upgrade, because through `0.0.12` the undecoded term
  collapsed to zero and raised the mismatch. This library warns either way; your gate has to look
  for both. The recipes in `docs-content/quickstart.md` and `docs-content/cookbook.md` and the
  triage table in `docs-content/troubleshooting.md` were corrected with the code, and a committed
  test pins that the one-code gate misses a document the two-code gate catches.

- **🩺 `X12_837_PAY_TO_ADDRESS_REPEATED`, the 28th Tier-2 warning code, plus the public factory
  `payToAddressRepeated(position)`** (`X12-PAY-TO-FUSION`). Raised at the **second and each
  subsequent `NM1*87` within one Loop 2000A**, where the TR3s allow Loop 2010AB at most once.
  `position.segmentIndex` names the repeated `NM1*87` itself and carries no `elementIndex`: what is
  reported is a second occurrence of the segment, not a defect in any element of it. The counter
  resets at the Loop 2000A `HL`, beside the pay-to slot it guards, so a first `NM1*87` under a later
  billing provider is a first and not a repeat.

  The model has **one** pay-to address slot, so it cannot carry two, and this code is the only thing
  that says the document named two. It reports that the **document** repeated the loop; it does not
  report that anything was mis-read, and it says nothing about the subjects of the other 837 codes.
  An `NM1*87` arriving while a `CLM` is open never reaches the pay-to route at all, so it neither
  warns nor arms the warning. **Where it lands instead is not stated as one destination, because two
  were measured:** with a Loop 2400 open it joins that line's `serviceLine.providers` (TR3 Loop
  2420), and with a claim but no line open it joins `claim.providers` (Loop 2310). Both are
  pre-existing and identical at `0.0.12`.

- **🩺 `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, the 27th Tier-2 warning code, plus the public
  factory `entitySegmentDiscardedAfterLx(position)`** (`X12-DISCARD-AFTER-STRAY-LX`). Raised for
  each 837 `N3` / `N4` / `PER` / `REF` that reached **no party at all** because an earlier `LX` with
  **no `CLM` open** dropped its Loop 2400 and closed the entity loop those segments belonged to.
  `position.segmentIndex` names the **discarded segment itself**, not the `LX`: the loss is per
  segment, so two `N3`s are two warnings, and the segment is what a consumer resolves back through
  `tx.segments`. It ends the silence disclosed under `### Fixed` by the change that introduced that
  discard, which is in this same unreleased block, so no published release ever had the discard
  without the warning.

  **🩺 Read its bound literally: this is NOT a general "entity segment reached no party" code**, and
  nothing about it should be restated that way. It reports only a segment discarded after such an
  `LX`, and only until the next `NM1` / `HL` / `CLM` opens a loop - a party named after that `LX` is
  outside this code's scope again, and stays silent whether or not this reader surfaces its trailing segments on it. Every other route to an
  unattached `N3` / `N4` / `PER` / `REF` is exactly as silent as before: no entity loop open at the
  `LX` at all, an `NM1` this reader cannot route, an intervening `HL` or `CLM`, and the other
  dropped-`LX` route where a claim **is** open. A `DTP` / `AMT` / `NTE` on that route is discarded
  too and is deliberately **not** reported, because those never attach to a party on any route.
  Each of those bounds is a test, and each is one a widened guard would fail.

  **It reports that a segment reached NO party, not that it would have reached one.** This reader
  does not surface every one of the four kinds on every party (a `PER` on a patient, or a pay-to
  address), so the code can fire where nothing this library's own reset lost. That is fail-safe and
  is stated rather than narrowed.

  Nothing about the model changed: the segments are still discarded, still verbatim on
  `tx.segments`, and the message carries positional metadata only, never a value off the wire.

- **🩺 `X12_837_SERVICE_SEGMENT_WITHOUT_LX`, the 26th Tier-2 warning code, plus the public factory
  `serviceSegmentWithoutLx(position)`** (`X12-837-LOOP-RESIDUALS`). Raised when an 837 `SV1` / `SV2`
  / `SV3` arrives with **no Loop 2400 open**, so there is no service line to decode it into and
  **nothing the segment carries is read** - not its charge, units, procedure code, modifiers, unit of measure or
  place of service. `position.segmentIndex` names the **service segment itself**, which is the whole
  reason it is a new code rather than a widening of an existing one: the two service-line codes this
  library already had are both anchored at an `LX`, and there is no `LX` in scope here to anchor to.
  **Read that condition literally - it is "no line open", not "the file contains no `LX`":** an `LX`
  in an earlier claim is still an `LX`. Nothing is fabricated to stand in and no line or claim is
  synthesized; the segments stay verbatim on `tx.segments`. See `### Fixed` for the silence it ends,
  and `KNOWN-LIMITATIONS.md` for the measured bounds, including what it does **not** say about how
  the submission's variant resolved.

- **🩺 `X12ServiceLineStatus.unitsOfService` and `Build277ServiceLineSpec.unitsOfService`, the 277
  Loop 2220 SVC-07 units of service count** (`X12-277-SVC07-NOT-DECODED`). X12 element 380
  (Quantity), decoded as an `X12Decimal` like every other quantity in this library and never via
  `parseFloat`. It had no representation on either side before, which is why an X212 277 this
  library emitted was short a required element; see `### Fixed`. `undefined` still means **not
  decoded** rather than absent, and an SVC-07 that is present but does not decode raises
  `X12_UNPARSEABLE_DECIMAL` at `position.elementIndex` 7 while an absent one raises nothing. **SVC-05
  stays unread on the 277 on purpose:** it is usage N in both 277 TR3s, unlike the 835 where it is
  the Units of Service **Paid** Count. The warning registry is unchanged at 25 codes plus 4 Tier-3
  fatals.

- **🩺 `X12_837_SERVICE_LINE_DROPPED`, the 25th Tier-2 warning code, plus the public factory
  `serviceLineDropped(position)`** (`X12-VARIANT-LOOKUP-PROTOTYPE`). Raised when an 837 `LX` opens
  no Loop 2400 at all, so the service line reaches **no claim's** `serviceLines` - either because no
  `CLM` is open at that point in the walk, or because the submission's variant never resolved to
  `P` / `I` / `D`. Distinct from `X12_837_SERVICE_LINE_NOT_DECODED`, where the line is retained and
  only its service segment went unread. `position.segmentIndex` names the `LX`, the same anchor and
  for the same reason: it is the one segment present in every case. Nothing is fabricated to stand
  in for the missing line and no claim is synthesized; the segments stay verbatim on `tx.segments`.
  The registry stays additions-only.

- **🩺 `X12_837_SERVICE_LINE_NOT_DECODED`, the 24th Tier-2 warning code, plus the public factory
  `serviceLineNotDecoded(position)`** (`X12-837-SV-SILENT-ZERO`). Raised when an 837 Loop 2400
  service line is closed without ever having decoded an `SV1` / `SV2` / `SV3` for the variant the
  submission resolved to; see `### Fixed` for what that line was reporting instead.
  `position.segmentIndex` names the `LX` that opened the line rather than the `SVx`, because the
  no-`SVx`-at-all case has no `SVx` to point at. The registry stays additions-only.

- **🩺 `X12_UNPARSEABLE_DECIMAL`, the 23rd Tier-2 warning code, plus `readElementDecimal` and
  `X12DecimalWarningSink`** (`X12-QUANTITY-SILENT-DEFAULTS`). A decimal element that is **present**
  and is not an X12 R-type decimal now says so; see `### Fixed` for what it was doing instead.
  `readElementDecimal(seg, n, delimiters)` is the pure primitive underneath both existing helpers and
  returns `{ value, status }` with `status` one of `"decoded"` / `"absent"` / `"unparseable"`, which
  is the distinction a bare `undefined` could not carry. `elementDecimal` and `elementDecimalOrZero`
  each gained an optional 4th `X12DecimalWarningSink` argument (`{ warnings, position }`); the helper
  narrows the position to the failing `elementIndex` itself, so a caller passes the position of the
  segment and never has to remember to do it per element. Existing 3-argument calls still compile and
  are still silent, on purpose.

- **`X12RemitServiceLine.originalUnitsOfService` / `Build835ServiceLineSpec.originalUnitsOfService`**,
  the 835 SVC-07 Original Units of Service Count: the units as **submitted**, which a payer sends only
  when they differ from the paid count in SVC-05. It is not a convenience field - without it the
  corrected SVC map (see `### Changed`) would have left SVC-07 unread and unwritten, converting a
  mis-read into a fresh silent drop. `undefined` means "same as paid", not "zero submitted".

- **`requireCallerString` / `makeCallerEscaper`** (internal), the single route a caller-supplied
  element value takes **through a builder's `esc` helper**. Read that scope literally: it is not
  every route into an emitted segment, and the `### Fixed` entry below says which positions bypass
  it. All nine builders now build their `esc` helper through
  `makeCallerEscaper`, which type-checks the value before escaping and refuses through the calling
  module's own `refuse` callback, so a wrong-typed element draws that builder's existing typed error
  and code rather than a new shared one. `buildInterchange`, `build999`, `build271` and `build278`
  each gained the one-line `refuseSpec` thrower they needed for it.

- **`renderCallerJson`** (internal), the type-preserving half of the caller-value bound, held to the
  same `BUILD_REFUSAL_VALUE_MAX_RENDERED` ceiling as `renderCallerValue`. It exists because
  `defineProfile()` reports a bad `name` / `id` / `effect` / `fixture` with `JSON.stringify`, and that
  distinction is diagnostically load-bearing: `null` and `"null"` are different mistakes, and a
  coercing renderer would flatten them together. It bounds the JSON **text** rather than the argument,
  never throws (a circular structure, a `BigInt`, a hostile `toJSON`), and fabricates no closing quote,
  because JSON does not always open one.
- **`requireCallerArray`** (internal), the single route a caller-supplied array takes into a builder
  loop. Each builder passes its own `refuse` callback, so a forged list draws that module's existing
  typed error and code rather than a new shared one.
- **`renderCallerValue`**, plus the `BUILD_REFUSAL_VALUE_MAX_LENGTH` (63) and
  `BUILD_REFUSAL_VALUE_MAX_RENDERED` (90) bounds. This is the single sanctioned route a
  caller-supplied value takes into a `build*` refusal message, and both ceilings are exported so a
  consumer can assert them rather than take them on trust - the builder-side counterpart to
  `ALL_WARNING_MESSAGES` on the parse side. `BUILD_REFUSAL_VALUE_MAX_RENDERED` bounds the rendered
  **fragment**, not the whole message: a message is that plus the site's own fixed template text.
- **`X12OrphanSegment.anchor`**, plus the `X12OrphanAnchor` / `X12OrphanAnchorKind` types. Every
  retained orphan now records **where it sat in the structure** rather than only where it sat in the
  byte stream: `{ kind: "interchange", groupIndex }` for a segment outside every functional group,
  `{ kind: "group", groupIndex, transactionIndex }` for one inside a group but outside every
  transaction set, and `{ kind: "transaction", groupIndex, transactionIndex, segmentOffset }` for one
  inside an open `ST..SE` - which only a `TA1` can be, since anything else arriving there is body
  content. An index equal to the eventual length means "after the last one" (immediately before the
  `GE` or the `IEA`), and `segmentOffset` is never `0` because `rawSegments[0]` is always the `ST`.
- **`X12Interchange.orphanSegments`** and the `X12OrphanSegment` type. Every segment that falls
  outside an `ST..SE` transaction set is now retained verbatim (`raw`, the decoded `segment`, its
  `segmentIndex`, and the library-owned `context` discriminant) instead of being discarded.
  `segmentIndex` equals the `position.segmentIndex` of that segment's `X12_UNEXPECTED_SEGMENT`
  warning, so the two surfaces join without string matching. Empty for a well-formed interchange.
  **Treat it as PHI when logging.** It sits on the model side of this library's diagnostic boundary:
  a warning `message` is a frozen-registry lookup with positional metadata only, but an orphan is
  document content, verbatim, exactly like `tx.rawSegments`. Log `context` and `segmentIndex`.

### Changed

- **🩺 `get837Claims` now recognises every published `ST-03` implementation-convention reference for
  the three 837 guides, and some already-published files therefore decode differently**
  (`X12-VARIANT-ICR-UNGROUNDED`). This is a grounding unit: the table `VARIANT_BY_ICR` had three keys
  and they were grounded against nothing.

  **🩺 What that cost, measured at `668afea`, which is `main` at published `0.0.13`.** The table held exactly
  `005010X222A2`, `005010X223A3` and `005010X224A2`. **It contained none of the identifiers HIPAA
  adopts at 45 CFR 162.1102** (`005010X222`; `005010X223` with its `005010X223A1` Type 1 errata;
  `005010X224` with `005010X224A1`), **and it was missing `005010X222A1` and `005010X223A2`**, which
  CMS and state Medicaid companion guides require in ST-03 and GS-08 on production professional and
  institutional claims. So a conformant, HIPAA-mandated 837P declaring `005010X222A1` resolved to no
  variant at all, fell through to the `SVx` scan, and one stray `SV2` anywhere in the body re-typed
  the whole submission Institutional. **The `SVx` fallback was the NORMAL path on production
  professional and institutional traffic rather than the exception**, and `X12_837_UNKNOWN_VARIANT`
  on such a file was a fabricated non-conformance claim about a document that was not
  non-conformant. The sources for every key are named beside the table and in
  `documentation/agent-notes/x12-variant-icr-ungrounded.md`; the three later published errata guides
  are the weakest leg and say so in place.

  **🛑 This IS a behaviour change on already-published decoding, and it is disclosed rather than
  buried.** On a file whose `ST-03` is now recognised: `submission.variant` can differ from what
  `0.0.13` read, wherever the first `SVx` in the body disagreed with the declaration; and
  **`X12_837_AMBIGUOUS_VARIANT` and `X12_837_UNKNOWN_VARIANT` no longer fire on it at all**, because
  no guess was made. **A predicate written against either code goes quiet on such a file.**

  **🩺 And a service line whose `SVx` kind disagrees with the declaration is no longer DECODED, so a
  code STARTS firing on a document that may have carried `warnings: []`.** Under an `ST-03` of
  `005010X222A1` with a body whose only service segment is an `SV2`, `0.0.13` read `variant` `"I"`,
  `charge` `7300`, `units` `2` and `warnings: []`; this release reads `variant` `"P"`, `charge` and
  `units` `undefined` with the rest of the service segment undecoded, and
  `X12_837_SERVICE_LINE_NOT_DECODED` at that line's `LX`. **Read only the decimal slots as
  `undefined`:** an undecoded line SEEDS its identity fields, so `procedureCode` is `""` on a P or D
  line and `revenueCode` is `""` on an I one. A predicate of `procedureCode === undefined` does NOT
  detect this.
  A mis-stamped envelope is an ordinary vendor variant and this reader can no more tell one from a
  conformant document than it can tell a stray `SVx` from a conformant one, so the loss is **warned
  rather than silent**, and the cookbook's post-a-line-amount gate already names that code first.

  **🛑 Read all of that as ONE property and never as a closed list of consequences:** where `ST-03`
  is now recognised, **the document's own declaration decides the variant instead of its first
  service segment**, and everything downstream follows from that single substitution. A first draft
  of this entry published a census of three and a refuter measured it false by finding a fourth.

  That is
  the hazard a widening onto a new code carries, taken here in the opposite direction from the two
  slices before it: they refused to narrow a fallback because the reader had no evidence beyond the
  segments, and here the reader had the evidence in ST-03 and was ignoring it. Re-check any routing
  driven off `submission.variant` for 837s you read on `0.0.13` or earlier.

  **🛑 The `SVx` fallback is NOT narrowed.** First-wins still takes the first `SV1` / `SV2` / `SV3` in
  the body, orphans included, on every document that still reaches it, and precedence is unchanged:
  a caller `type` still wins ahead of ST-03, and ST-03 ahead of the segments. What changed is which
  documents reach the fallback.

  **It is a LIST of cited identifiers, never a pattern.** A reference outside the set, in a different
  case, or carrying leading whitespace still falls through exactly as before. The set is **not
  claimed exhaustive and no count of it is published**: both variant-resolution messages named the
  three old keys literally, so both were wrong the moment the table was corrected, and neither
  enumerates the set any more. A committed tripwire reds if any registry message quotes a TR3
  identifier again.

  **🩺 OPEN, and deliberately not fixed here: the EMIT side still stamps the old three.** `build837P`
  / `build837I` / `build837D` write `005010X222A2` / `005010X223A3` / `005010X224A2` and a caller
  cannot override them, so **a partner that requires `005010X222A1` or `005010X223A2` will reject an
  837 this builder emits.** Which published guide identifier a partner accepts is a partner fact
  rather than a spec fact, and changing bytes this library already emitted would break the partners
  it works with today. `KNOWN-LIMITATIONS.md` carries it as an open residual.

- **🩺 BREAKING (read model): every monetary, percent and quantity slot the readers used to fill with
  a fabricated `X12Decimal.ZERO` is now `X12Decimal | undefined`** (`X12-837-SV-UNDEFINED-DECIMAL`).
  Through `0.0.12` an **absent** `SV1-02` - a monetary field on an 837 claim service line - read back
  as `X12Decimal.ZERO`, so a consumer could not tell "the sender stated zero" from "the sender stated
  nothing" and this library presented the second as the first. Fourteen model slots carried that
  fabrication: `X12Claim.totalCharge` (CLM-02), a service line's `charge` and `units` (SV1-02 /
  SV2-03 / SV3-02 and SV1-04 / SV2-05 / SV3-06), `X12LineAdjudication.amountPaid` (SVD-02),
  `X12RemitClaim.totalChargeAmount` / `totalPaymentAmount` / `patientResponsibilityAmount` (CLP-03 /
  04 / 05), `X12RemitServiceLine.chargeAmount` / `paymentAmount` (SVC-02 / SVC-03),
  `X12RemitPaymentHeader.totalActualPayment` and `X12PremiumPaymentHeader.totalPremiumAmount`
  (BPR-02), `X12PremiumOpenItem.amountPaid` (RMR-04), `X12RemitAdjustment.amount` (a `CAS` triple,
  read by both the 835 and the 837) and `X12RemitProviderAdjustment.amount` (a `PLB` pair).

  **`undefined` means "this library decoded no value from that element", NOT "the element was
  absent."** A present element holding bytes that do not decode lands there too, and
  `X12_UNPARSEABLE_DECIMAL` at that `position.elementIndex` is the only thing that separates them.
  Read it in exactly that direction. A **stated** zero is untouched: it still decodes, still reads
  `0`, and keeps its lexical form, so `0.00` is still `0.00`.

  **Migrating:** `x.toString()` becomes `x?.toString()` at every one of those slots, and each site is
  a decision rather than a rewrite - an `undefined` amount is not zero, and a `?? 0` reinstates the
  defect. If you posted cash off a slot that read `0` on `0.0.12` or earlier without also gating on
  `.warnings`, re-read those files.

  Two things this did **not** do. `elementDecimalOrZero` is a public export and is unchanged: it
  still substitutes `X12Decimal.ZERO`, because that is its documented behaviour and a consumer
  walking segments itself may still want it. What changed is that no reader in this library calls it
  any more. And the 837's `X12_837_SERVICE_LINE_NOT_DECODED` is still the only thing that says WHY a
  line's `charge` and `units` are empty: `undefined` alone does not separate "no `SVx` was decoded
  onto this line" from "an `SVx` was decoded and carried no charge element".

- **🩺 BREAKING (emit side): `Build837ServiceLineSpec.units` is now required, and `build837P` /
  `build837I` / `build837D` refuse a service line without it** (`X12-837-SV-UNDEFINED-DECIMAL`).
  Through `0.0.12` an omitted `units` was emitted as the literal `0` into SV1-04 / SV2-05 / SV3-06,
  so the builder stated a service unit count no caller supplied - the read-side fabrication above,
  running the other way. Measured on `0.0.12`: a Professional line with no `units` emitted
  `SV1*HC:99213*8500*UN*0*11**1~`. The refusal is `X12_837_BUILD_INVALID_SPEC`, naming the structural
  locator (`billing[0].subscriber[0].claim[0]`) and no caller value.

  **Refusing rather than emitting an empty element is the stance, and it is not new here:**
  `build277` already refuses a service line without `SVC-07` on the same grounds. The parser is
  liberal and the serializer conservative, and a count is not something a serializer may leave for
  the receiver to guess at. A caller that supplies `units` is unaffected in every respect, including
  one that supplies a zero, which is emitted because the caller did state it.

- **`build835` refuses a JS caller's `undefined` balance term as an invalid spec rather than throwing
  an untyped `TypeError`** (`X12-837-SV-UNDEFINED-DECIMAL`). Unreachable from TypeScript: every term
  of the three §1.10.2 invariants is a required `X12Decimal` on `Build835Spec`. Through `0.0.12` a JS
  caller passing `undefined` reached `undefined.add` inside the balance guard. It is now
  `X12_835_BUILD_INVALID_SPEC` with the registry text, and deliberately **not**
  `X12_835_BUILD_BALANCE_MISMATCH`: nothing was measured out of balance, a required amount is simply
  missing. Passing a raw `number` into a balance term still throws **an** untyped `TypeError` from
  the same guard, so the documented dichotomy did not move; on some slots the message is now
  `X12Decimal`'s own tampering text where it used to be `.add is not a function`, which the pinned
  regex already admitted. Still disclosed in `KNOWN-LIMITATIONS.md`.

- **`KNOWN-LIMITATIONS.md` now ships in the published tarball** (`X12-837-LOOP-RESIDUALS`). Two
  shipped warning messages, `X12_837_SERVICE_LINE_DROPPED` and
  `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, name that document ("see KNOWN-LIMITATIONS.md", each
  one clause before its close), but it was absent from `package.json`'s `files`. An installed copy
  therefore carried a runtime message naming a file that was not beside it. **The citation is what
  was kept and the packaging is what moved:** that document is the canonical account of what this
  reader does not reproduce, and a consumer holding a code, a `position` and a message is precisely
  the consumer who needs it. **The cost is named rather than argued away:** a file in the tarball is
  a published artifact, permanent at the version carrying it, so every claim in that document is now
  held to a published surface's bar. The line is drawn at what the library says to a caller **at
  runtime**, so `docs-content/` is deliberately still not in `files`; the shipped `README.md`'s
  relative links to `./docs-content/cookbook.md` and `./docs-content/troubleshooting.md` therefore
  still do not resolve inside an install, which is pre-existing, unchanged here, and its own
  decision. `test/package-files-cite.test.ts` refuses a shipped warning message that names a
  repo-root `.md` file `files` does not carry, and separately asserts the cited file is on disk, so
  the gate cannot pass on a `files` entry that names nothing. It reads the exported warning registry
  and nothing else, not JSDoc, not source comments, and not the `build*` refusal templates. No code,
  type, warning code or warning message changed.

- **A statement about pre-`0.0.10` behaviour that was false as written is cut back in the documents
  this package publishes** (`X12-837-LOOP-RESIDUALS`). "The trailing segments were filed against
  it", "they attached to whichever party the last `NM1` left active", and the counterfactual carried
  by "no longer attaches itself to the last named party" all read as all four of `N3` / `N4` /
  `PER` / `REF` having reached every party through `0.0.10`. They did not: `attachContact` has no
  route for a patient or a pay-to address and `attachReference` none for a pay-to address, so those
  segments reached no party on any release. That is why
  `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` reports a segment reached **no** party and never that
  it would otherwise have reached one. `KNOWN-LIMITATIONS.md` additionally carried, ninety lines
  from the entry contradicting it, a fourth wording of the same universal in the present tense: "a
  `NM1` arriving AFTER that `LX` names a party normally, and its own trailing segments attach".
  **That parenthetical is deleted rather than given a fifth wording**, and the past-tense copies
  either take the qualifier already written beside the code's own entry or are cut back to the
  measurement beside them, rather than being given a new wording. What a party named after such an
  `LX` does is unchanged, and that code's own entry still states its scope and says outright that
  whether a later party's trailing segments attach is a separate question it does not answer. **No
  per-kind, per-party map is published, here or in that entry.** Nothing about the
  parser changed, and the measured instances each statement rested on, every one of them on a payer,
  are unchanged and stay. **The same wording survives in `src/` comments and in test-file headers,
  neither of which this change swept or fixed.**

- **🩺 BREAKING: `build277` now REFUSES a Loop 2220 service line that carries no `unitsOfService`
  (`X12-277-SVC07-NOT-DECODED`).** SVC-07 is usage **R** in TR3 `005010X212`, so a service line
  without it cannot be emitted as a conformant 277. The refusal is the existing
  `ClaimStatus277BuildError` with code `X12_277_BUILD_INVALID_SPEC`, raised as a precondition before
  any segment is built, and its message names `SVC-07`, the TR3, and the structural locator of the
  offending line (indices only, never a member id, name, trace or claim id). **`build277CA` is
  deliberately unaffected:** in `005010X214` the same element is usage **S**, so the identical spec
  still builds and simply omits the element. **The count is never defaulted in either direction** -
  a quantity the caller did not supply is a quantity nobody sent, and a units figure is one a payer
  reprices against. If you emit X212 277s with service lines, the first build after upgrading throws
  until you supply the submitted count. Usage taken from the pyx12 005010 maps
  (`277.5010.X212.xml`, `277.5010.X214.xml`), outside this repository, rather than from this
  library's own reader.

- **The committed canonical 277 fixture and its serializer golden now carry SVC-07**
  (`test/fixtures/status/277-canonical.edi`, `test/fixtures/golden/277.edi`). The X212 fixture was
  itself short the required element, which is part of why nothing in the suite noticed. The other
  twelve goldens regenerate byte-identically.

- **🩺 BREAKING: the 835 Loop 2110 SVC element map is corrected, in both directions
  (`X12-SVC-ELEMENT-MAP-OFF-BY-ONE`).** Through `0.0.9` `get835` read `revenueCode` from **SVC-05**
  and `paidUnitsOfService` from **SVC-07**, and `build835` wrote them to those same two positions
  while hard-coding SVC-04 empty behind a comment asserting "revenue code is SVC-05 in X221A1;
  SVC-04 unused". That comment was wrong. SVC-04 is the NUBC revenue code (X12 element 234, a
  string), SVC-05 is the Units of Service **Paid** Count (element 380, a Quantity), and SVC-07 is
  the **Original** Units of Service Count (element 380) - a different quantity, sent only when the
  submitted count differs from the paid one. `revenueCode` now reads and writes **SVC-04** and
  `paidUnitsOfService` now reads and writes **SVC-05**.

  **The harm was a mis-read code system and a mis-read quantity, in both directions, silently.**
  Measured across the six committed remit fixtures plus the golden, **8 of 8 service lines** read
  back `revenueCode: "1"` at `0.0.9` - `1` is not a valid NUBC revenue code, it is the paid-unit
  count from SVC-05 - while `paidUnitsOfService` came back `undefined` because SVC-07 was absent.
  On emit, a line with revenue code `0300` and 2 paid units produced
  `SVC*HC:99213*600.00*550.00**0300*HC:99212*2`, putting a revenue code into a **Quantity**
  element, so a conformant receiver read `0300` as 300 units of service. It now produces
  `SVC*HC:99213*600.00*550.00*0300*2*HC:99212`.

  **Nothing in the suite could detect this and that is why it shipped.** Every existing assertion
  was a `build835` -> `get835` round trip, which is green for any pair of positions the two modules
  agree on. All 1,227 tests stayed green with the fix applied. The map is now pinned against literal
  bytes in `test/transactions-remit-835-svc-element-map.test.ts`; all 11 of its cases fail on
  `e3cdf49` and pass at head.

  **The repo already contradicted itself:** `build277` / `get277Status` read and write the revenue
  code at SVC-04, `build-277-types.ts` says so in prose, and every committed 835 fixture is written
  to the correct map (`SVC*…**1` is an empty SVC-04 and one unit paid). Only the 835 module
  disagreed, and only with itself.

  **Sources, and what was not read. TR3 005010X221A1 is a paid X12 document; nobody here has read
  it**, and every claim is traceable to something publicly checkable: pyx12's machine-readable
  `835.5010.X221.A1.xml`, an independent open-source implementation of the same guide, which carries
  the whole table and is **the source for SVC-04**; X12's own RFI #2163 for SVC-05; the base 005010
  element dictionary, where SVC-04 is a string and SVC-05/07 are Quantities, which rules out a
  revenue code at SVC-05 on type alone; and two published payer companion guides. **Agreement with
  this repo's own 277 modules is corroborating, not a source** - checking a spec claim against the
  implementation only proves the two agree, which is how the wrong map survived. Listed with links
  in `KNOWN-LIMITATIONS.md`.

  **Also disclosed rather than fixed:** `undefined` on either quantity means "not decoded", not
  "absent" - the element may have been present and unparseable, which raises no warning and is
  pre-existing at every quantity site. And **835s this library emitted at `0.0.9` or earlier are
  non-conformant on the wire and should be re-emitted**: their revenue code sits in SVC-05, so this
  release reads it back as a paid quantity and reports no revenue code.

- **`escapeRelease` now throws `TypeError` on a non-string instead of returning `""`.** Previously it
  gave three different wrong answers depending on what arrived: a number, a boolean or a plain object
  returned the empty string silently; `null` and `undefined` threw on the property read; an array or
  an array-like threw on `charAt`. All three now terminate the same way. A `TypeError` rather than a
  code-tagged library error is deliberate: it is a pure text utility with no spec, element or caller
  context to name. Nothing inside the library can reach it, because all nine builders refuse
  first with their own typed, code-tagged error.

### Security

- **🩺 A builder refusal no longer echoes the value it refused, so a `claimId` or a member id from a
  JSON-driven caller cannot reach `Error.message`** (`REFUSAL-MESSAGE-PHI-ECHO`). Every domain builder
  documents, on its own error codes, that its refusal message carries structural locators, counts and
  X12 control codes only and **never a `claimId` (patient-account number), member id, member name,
  trace or diagnosis code**. That held for the refusal TEMPLATES and did not hold underneath them. A
  guarantee that is true on one path and false on another is not a guarantee, so it was made true
  rather than reworded.

  **Measured in the source, not inferred from the prose.** The four shared caller guards
  (`caller-string.ts`, `caller-segment.ts`, `caller-decimal.ts`, `caller-array.ts`) described a
  wrong-typed value by rendering it through `renderCallerValue` - bounded to 90 characters, and **not
  redacted**. On `4a5a943`, with the kind of spec `@cosyte/cli` builds from `JSON.parse`:

  ```text
  build835({ claims: [{ patientControlNumber: 900412345678, ... }] })
    -> build835: every element value must be a string, but received a number ("900412345678"). ...
  build834({ members: [{ member: { idCode: 700998877, ... } }] })
    -> build834: every element value must be a string, but received a number ("700998877"). ...
  ```

  **The shipped disclosure named the wrong guard.** It said `requireCallerSegment` echoes the
  primitive and quoted `build835: CLP-01 must be a string, but received a number (...)`. CLP-01 routes
  through `esc`, so `requireCallerString` refuses first and its message names only the builder. The
  echo was on both, and on the two other guards as well.

  **The remedy is a property, not a list: no caller guard echoes what a caller put in a document
  ELEMENT.** The string, segment and decimal guards report the offending TYPE, and so does the array
  guard's primitive arm; the segment guard keeps its spec-shaped slot locator beside it
  (`build999: "AK9"-01 must be a string, but received a number.`). A guard standing on every element
  of every builder cannot know whether the primitive in front of it is a control number or a patient
  identifier, which is exactly why it may not echo one. The decimal guard went with them because an
  `X12Decimal` slot IS an element slot, and because its message's own fixed text already names
  `0.30000000000000004` / `1e+21` / `NaN` as what a raw number does, so no diagnosis was lost.
  "An `X12Decimal` slot holds no identifier today" would have been the wrong kind of argument: a fact
  about today's slots rather than a property of the guard.

  **Two things that property does NOT say, and both were drafted as absolutes first.** The array
  guard still renders a forged array-like's `length` and its class tag through `renderCallerValue`,
  bounded: those describe the SHAPE a caller forged rather than an element's contents, and they are
  the whole diagnostic for `{ length: "9".repeat(120000) }`. And **only the segment-join guard names
  the SLOT** - `esc` and `escDec` name the BUILDER, a limit `caller-string.ts` already recorded, so on
  those two the echoed value used to stand in for a locator and now nothing does. That is a real
  diagnostic cost and it is disclosed rather than argued away.

  **The segment guard's slot locator is now bounded by GRAMMAR rather than by length.** `parts[0]` is
  caller-supplied in `buildInterchange`, which takes `[segmentId, ...elements]` wholesale, so it is
  admitted only when it matches the X12 segment-id grammar (two or three uppercase alphanumerics
  opening with a letter) and otherwise degrades to `element N`. A length bound redacts nothing when
  the thing being bounded has a grammar.

  **What did NOT change, stated because deleting a claim leaves a new one in its place.** The caller
  values a builder's own template names by field are still rendered, still bounded, still not escaped,
  and still not redacted: control numbers, the 834's INS-03 / HD-01 maintenance type, the 837's
  service-line variant, the TA1-05 note code, the 999's AK9 counts and acknowledged ST-02. That has
  always been documented as robustness and log hygiene rather than redaction, and it remains so.
  `renderCallerValue`, `BUILD_REFUSAL_VALUE_MAX_LENGTH` and `BUILD_REFUSAL_VALUE_MAX_RENDERED` are
  unchanged and still exported. `X12ParseError.snippet` on the four Tier-3 fatals is unchanged and
  still the one deliberate place a document's bytes are copied.

  **Behaviour change for callers who read a value back out of one of those four messages.** Nothing in
  the library did; the values are gone from the message and unchanged on the spec the caller still
  holds.

- **The PHI scanner refuses an in-scope entry that is not a regular file, on both of its enumerating
  routes.** A symbolic link under a scan root pointing at a PHI-bearing file used to scan CLEAN on
  both, so the pre-commit gate and CI both reported "no hits" over a capture the scan never read.
  Measured on `5779542`, against a throwaway repository laid out like this one, using a synthetic
  `.edi` payload whose NM1 person name, DMG date of birth, PER phone and `REF*SY` SSN are all hits at
  exit 1 when the same bytes sit at a regular file:
  - the all-mode walk enumerates `Dirent.isFile()`, which is an lstat answer, so a link is neither a
    file nor a directory and fell out of the loop silently. A link under `test/fixtures`, a link
    under `src/`, and a linked DIRECTORY (which takes a whole subtree with it) each reported
    `OK - no hits` at exit 0;
  - `--staged` reads content with `git show :<path>`, and git stores a link as its TARGET PATH under
    mode `120000`, so that route was handed the path text and never the target's bytes. A staged
    link reported `OK - no hits` at exit 0.

  Both routes now refuse the scan (exit 2, the existing "could not complete" code) and name every
  offender, not just the first. Neither route is made to FOLLOW an ENTRY it enumerated: following
  would read bytes the enumeration does not control, and git does not carry those bytes anyway, so a
  hit on them would be a claim about something no commit contains. That is a statement about an
  entry, not about a scan ROOT: a walk root that is itself a link is still followed, because
  `existsSync` and `readdirSync` both follow. Measured identically before and after this change, that
  direction produces a superset scan rather than a blind one (the target's files are enumerated under
  their in-root names and hit, exit 1), so it is deliberately left alone.

  **A refusal names the entry's own repo-relative path and a scanner-owned token for its kind. It
  never reports the link target**, which is working-tree text that can itself carry PHI: a target
  path of the shape `<surname>-<given>-<dob>.edi` is the whole reason. That shape is written out
  rather than shown, because a diagnostic about a PHI leak is itself a PHI surface. The concern was
  not hypothetical here: measured at base, a staged link whose target name was a dashed-SSN shape
  exited 1 and printed that shape, because `git show` handed the path text straight to the
  cross-cutting shape pass.

  **`T` was added to the `--staged` filter, and it is the one letter that made the mode check
  reachable.** Replacing a TRACKED regular file with a link is neither an add nor a modify: measured
  on this tree, `git diff --cached --raw --diff-filter=AM` returned zero rows for that change while
  the unfiltered `--raw` showed `:100644 120000 <sha> <sha> T`. Without `T` the record died before
  any mode could be read and the hook passed a mode-`120000` blob green. Admitting `T` also covers
  the reverse typechange, a link replaced by a real file bearing PHI. The route reads
  `git diff --cached --raw -z` rather than `--name-only` because the destination mode is the only
  thing that distinguishes a staged regular file from a staged link or gitlink, and
  `git show :<path>` answers all three without complaint. A record that does not parse refuses rather
  than being skipped.

  **Each route keeps its own existing boundary**: the walk still excludes a gitignored entry (the same
  rule that already excludes a gitignored file), and `--staged` still looks only at
  `test/fixtures/**` and `src/**.ts`. This narrows what those scopes admit; it does not widen them.
  A gitlink under a scanned prefix already exited 2 before this change, but by `git show` failing and
  echoing git's own text; it is now refused at enumeration and named by kind.

  **`paths` mode is deliberately unchanged, because it was never blind**: it reads with
  `readFileSync`, which follows a link, so an explicitly named path that is a link to a PHI-bearing
  file is scanned and hits (measured, exit 1).

  **Not closed by THIS change, and stated rather than implied**: `R` (rename) and `C` (copy) were
  not enumerated by `--staged` at all, so a fixture renamed while a real name was substituted into
  it, and a `git mv` of an already-committed link into `test/fixtures/`, both passed at exit 0. **That
  gap was LIVE at pre-commit through `0.0.7`, `0.0.8`, `0.0.9` and `0.0.10`**, every version published
  after this change landed, with the all-mode sweep as the backstop. It is closed by the change below,
  which is unreleased alongside this one. **Do not read "the same unreleased block" as "no published
  release had it"**: this whole file sits under one `[Unreleased]` heading, so that inference is true
  of the file and false of the registry. Also unclosed at the time: a scan that observed nothing was
  reported clean rather than refused, which the last entry in this section closes, unreleased
  alongside this one and subject to the same warning about what "the same unreleased block" does and
  does not prove. Still open: the enumerate-then-read window in all mode is untouched, because
  tolerating a failed read pulls the opposite way from narrowing what the enumeration admits and
  belongs in its own change. No library code changed and no published type changed.

- **🩺 The PHI scanner's `--staged` route stops trusting the caller's git config, so five kinds of
  staged change can no longer disappear from the pre-commit gate's list without a byte of the index
  changing** (`PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT`). `pnpm phi-scan --staged` is the pre-commit hook.
  It enumerated the index with `git diff --cached --raw -z --diff-filter=AMT`, and each of the five
  below returned exit 0 and `OK - no hits`. Every one is measured on a throwaway repository laid out
  like this one, against a synthetic `.edi` payload whose NM1 person name, DMG date of birth, PER
  phone and `REF*SY` SSN are all hits at exit 1 when the same bytes arrive as an ordinary add:
  - **rename.** Detection is on by default and neither `AM` nor `AMT` returns `R`, so `git mv` of an
    already-committed symbolic link into `test/fixtures/` staged as a single TWO-PATH record at mode
    `120000` and the record was deleted before any mode could be read. Renaming a fixture while
    substituting a real-looking surname into it passed identically, over bytes that are two hits as
    an ordinary add. **No similarity score is recorded anywhere in this change**: a score moves with
    the fixture, so a number carried over from one is wrong for the next. What is load-bearing is
    that the record carries TWO PATHS;
  - **copy.** Under `diff.renames=copies`, copying a PHI-bearing file from outside the scan roots
    INTO `test/fixtures/` staged as a genuine two-path `C` record and was dropped the same way. It is
    a distinct hole rather than the same one, because nothing is moved and the source stays put;
  - **gitlink.** With `diff.ignoreSubmodules=all` in the caller's git config, a staged gitlink under
    `test/fixtures/` vanished from `--raw` outright, where the same index without that config is
    refused at exit 2 by the existing mode check;
  - **unmerged path.** Returned by neither `AM` nor `AMT`. Such a path is recorded at one or more of
    stages 1/2/3 and never at stage 0, so `git show :<path>` fails outright and the route attested
    clean over an index it could not read. Git refuses to commit while a path is unmerged, so this
    was never a route to a committed leak; what it was is a gate reporting on a state it never
    observed, and `pnpm phi-scan --staged` is run by hand and from scripts as well as from the hook;
  - **broken pair.** A pair broken by `-B` prints status letter **`M`** with a break score, one path,
    which the record parser reads happily, **but `--diff-filter` classifies a broken pair as `B`
    whatever letter it prints**, so an `AMTU` filter deletes it and a reader checking the raw output
    concludes the opposite.

  **The remedy is one rule rather than five fixes.** The argv is now
  `git diff --cached --raw -z --no-renames --ignore-submodules=none --diff-filter=AMTUB`.
  `--no-renames` makes a two-path record unemittable whatever `diff.renames` says, so both the rename
  and the copy destination arrive as an ordinary single-path `A` and the source as a `D` the filter
  drops; the two-field stride is therefore STRUCTURAL rather than conditional on the caller's
  configuration. Verified under `diff.renames=true|copies|false|1` and `diff.renameLimit=1`.
  `-M`, `-C` and `--find-copies-harder` each turn detection back on over the top of it and empty the
  route again, which is pinned as a test rather than left to a comment.

  **An unmerged path is refused (exit 2) with its own message**, separate from the not-a-regular-file
  refusal, because its destination mode is `000000` and that refusal's sentence about symbolic links
  and gitlinks would be false for it. `B` in the filter costs the enumeration nothing today, since
  git only breaks a pair when `-B` is given; it is there so the flag cannot become a silent
  blindfold later, which is why it is a remedy rather than a warning.

  **The two enumerations are EQUAL when nothing is renamed, copied, unmerged, or a gitlink under
  `diff.ignoreSubmodules`**, and larger only when one of those is present. State the precondition in
  full: `--no-renames` ALONE would make the equality hold on renames and copies only, and the other
  two flags widen it further. This is a superset and NOT a strictly larger set: nothing the previous
  argv
  enumerated stopped being enumerated, and that equality is asserted as a test.

  **Not closed here, and measured rather than assumed**: a scan that observed nothing was still
  reported clean, and an all-mode walk root replaced by a regular file still died on an unhandled
  directory read rather than refusing cleanly. Both are closed by the entry below, unreleased
  alongside this one. **Still open after both**: a tracked file directly under `test/` is enumerated
  by neither route, and an index entry at exactly a scan root's own path matches no `--staged`
  clause, because every clause tests a `<root>/` prefix. Each is a scope decision belonging in its
  own change. No library code changed and no published type changed.

- **🩺 The PHI scanner's all-mode sweep can no longer report clean over the files it never opened
  within its declared roots**
  (`PHI-SCAN-OBSERVED-NOTHING-IS-GLOBAL`). `pnpm phi-scan` with no arguments walks two roots,
  `test/fixtures` and `src`, and prints `OK - no hits` at exit 0 when it finds nothing. **Finding
  nothing and opening nothing were indistinguishable.** Each shape is measured on a throwaway
  repository laid out like this one, against a synthetic `.edi` payload whose NM1 person name, DMG
  date of birth, PER phone and `REF*SY` SSN are hits at exit 1 when the same bytes are read (the
  hit COUNT is deliberately not recorded: a refuter measured the drafted figure short, and this
  repo's rule is to delete a drifting number rather than correct it):
  - **a missing root.** With BOTH walk roots absent, and with `test/fixtures` alone absent, the walk
    returned immediately and the sweep printed `OK - no hits` at **exit 0**. **A root a repository
    never had is the worst shape of it**, because the gate then reads clean on every run it ever
    makes and no run looks wrong;
  - **an emptied root.** With the roots present but emptied on disk while their files stayed in the
    index, the sweep printed `OK - no hits` at **exit 0** over a corpus whose committed bytes are
    hits;
  - **a root that is not a directory.** With a walk root replaced by a regular file, `readdirSync`
    threw an **uncaught `ENOTDIR`** and the process ended at **exit 1**, which is this scanner's own
    code for "hits found", as a stack trace rather than a refusal. A root that is a FIFO ended the
    same way. **That exit code is NOT portable and neither is the mechanism** (`hl7` measures **2**
    for its version of this shape, `terminology` **1** by a different route), so it was re-measured
    here rather than carried over.

  **The remedy is two rules, and the second is not implied by the first, because existence is not
  observation.** A declared walk root must BE a directory (`refuseUnusableRoots`), and every
  tracked, non-`.md` file under a root must have been one of the files the walk actually enumerated
  (`reconcileObserved`). Both refuse at **exit 2** and name **every** offender, the same rule the
  not-a-regular-file refusal already follows. **Each is independently load-bearing**: of the 17 new
  cases, dropping the first reds **4** and dropping the second reds **5**, and the two sets are
  disjoint. `--deduplicate` on the `git ls-files` argv is pinned separately, by its own case: an
  unmerged path is returned once per STAGE, so without it one conflicted fixture is named three
  times and counted as three.

  **Naming every offender needs one thing more than the rule.** `git ls-files` returns an unmerged
  path **once per merge stage**, so the listing is taken with `--deduplicate`; without it a single
  conflicted fixture is named three times and counted as three, which falsifies "names every
  offender" in the direction that teaches a developer to distrust the gate. And a refusal here
  **never echoes git's own message**: `execFileSync` appends the child's stderr verbatim, and git's
  fatals in this class carry absolute filesystem paths, so only the engine-owned exit status is
  reported - the same rule `rootProblem` follows with `err.code`.

  **🩺 SAY "BE A DIRECTORY", NEVER "BE ENUMERABLE".** A draft of this entry said the second and a
  refuter measured it false: a root that IS a directory the process cannot open (mode `000`) passes
  the type check and then throws an **uncaught `EACCES`** out of `readdirSync`, at **exit 1**,
  identically at base and at head. An unreadable **subdirectory** under a root, and the window
  between the root check and the walk, end the same way. **That class is PRE-EXISTING, disclosed and
  NOT closed here**, because closing it means tolerating or classifying a failed directory read,
  which is the deferred enumerate-then-read remedy pulling the same way. The claim was **cut back to
  what the code checks**, not the guard grown.

  **A root that is itself a symbolic link to a directory is still followed**, as before, and where
  that link is TRACKED, `reconcileObserved` **exempts the root's own index entry**. Without that
  exemption the sweep refused (exit 2) over a tree the base scanner scans as a documented superset at
  exit 1, because `git ls-files` returns the link's own path `test/fixtures` while the walk only ever
  yields `test/fixtures/<name>`. **The case that holds this commits its corpus**, because on an
  uncommitted one `git ls-files` is empty and the case would be green by construction.

  **🩺 "IT OPENS NO CLEAN PATH" WAS DRAFTED AND IS REFUTED, SO THE CLAIM IS CUT BACK RATHER THAN THE
  GUARD GROWN.** The draft argued the exemption opened none, because a root that is a tracked regular
  file, or a link to one, is refused by the root check first. True, and not the whole of it: when a
  root is a tracked link to a DIRECTORY, everything the walk reads through it lives under the
  target's own names, OUTSIDE the `git ls-files -- test/fixtures src` pathspec, so the whole
  link-target corpus is unreconciled rather than just the root entry. Measured at head with
  `test/fixtures -> ../elsewhere` and a committed `elsewhere/violator.edi`: present, exit 1; removed
  from disk but still in the index, `OK - no hits` at **exit 0** - verbatim the emptied-root shape
  these rules exist to close. It is **PRE-EXISTING** (base is exit 0 over the same tree), so it is
  not a regression; it is **disclosed and not closed**, because covering it means reconciling against
  a second pathspec derived from the link target, which is the same scope decision as the two below.
  **State the closure as "within the declared roots, as git names them", never as a universal.**

  **A COUNT DOES NOT CLOSE THIS, WHICH IS WHY THE SECOND RULE READS THE INDEX.** An emptied root
  contributes zero and a total still looks like a total, so a denominator measures the roots that DID
  exist. Only naming the corpus from a source OUTSIDE the walk separates "read it and found nothing"
  from "never opened it".

  **The ignore rule is stated exactly, because its short form is false.** `git check-ignore` consults
  the index by default, so it answers NOT-ignored for a path that is tracked even when a `.gitignore`
  rule names it (only `--no-index` says otherwise, and this scanner does not pass it). So the walk
  SCANS a tracked-and-ignored file and this check correspondingly REFUSES when one is missing from
  disk. Both halves of that pair are asserted; what the rule really exempts is the UNTRACKED ignored
  file, which is never in `git ls-files` at all.

  **One behaviour outside a git checkout changed and is stated rather than buried**: where
  `git ls-files` cannot answer, the sweep now refuses at exit 2 instead of reporting clean, because
  "git could not tell me" and "git told me there is nothing" are the two answers this check exists to
  keep apart. `scripts/` is not in the published tarball, so every caller is inside a checkout.

  **Not closed here, measured rather than assumed, and both a scope decision rather than this one**:
  a tracked file directly under `test/` is enumerated by NEITHER route (exit 0 over a payload that
  hits as an ordinary fixture), and an index entry at exactly a scan root's own path matches no
  `--staged` clause (exit 0 over the same payload). **NEITHER IS CLOSED BY THE RECONCILIATION ABOVE,
  and the reason is worth stating because it reads as though it should be**: the reconciliation
  compares the walk against the index WITHIN the declared scope, so a path nothing declares in scope
  is absent from both sides of the comparison. Widening the scope is its own change, because
  **enumerating those files buys only the `scanCommonShapes` floor**: they are `.ts` sources whose
  fixtures are string literals, so `looksLikeX12` is false and the NM1 / DMG / PER / service-date
  recognisers never run. **🩺 NAME THAT FLOOR AS THREE DETECTORS AND NEVER AS TWO.** A draft of this
  entry said "the dashed-SSN and email floor" and a refuter measured it false: the `REF*SY` undashed
  nine-digit SSN recogniser is **not segment-aware either** and fires on a bare string literal
  exactly as the other two do. The two-detector wording understated the deferred scope by precisely
  the shape a dashed-SSN regex cannot see, which is the worst direction to be wrong in. Derive the
  set from `scanCommonShapes`, never from prose - this sentence included. **Widening the enumeration and widening the recogniser are two sides of it,
  each in addition to the other.** Measured on this package's own corpus, the current recogniser over
  the tracked non-fixture files under `test/` finds 8 shapes in exactly one file,
  `test/scripts/phi-scan.test.ts`, which is this scanner's own negative-control corpus; excusing it
  needs an exclusion surface that does not exist, because a bare `--allow-fixture` seeds the
  positional path set and selects `paths` mode. The **enumerate-then-read window** is likewise
  untouched, and the reconciliation does not change its reachability: it runs on the enumeration,
  before any target is read, and it neither widens a root nor reads a file. No library code changed
  and no published type changed.

### Fixed

- **🩺 A BODY segment in an interchange whose ELEMENT SEPARATOR is `?` now frames its elements,
  where it used to come back as ONE element with an id of `(non-spec)`**
  (`X12-BODY-DEGENERATE-RELEASE-SEPARATOR`). Reproduced on the base tree at `72bafc2`.
  `detectDelimiters` reads the element separator positionally out of ISA byte 4 and rejects only
  control characters, whitespace and a non-distinct set, so a sender may declare `?` there, and
  `buildInterchange` accepts `elementSeparator: "?"` from a caller. `src/parser/envelope.ts` guarded
  that degenerate set in both of its own splitters, once for the segment terminator and once for an
  envelope segment's elements. `decodeSegment` - which every BODY segment plus the `ST`, the `SE`
  and every retained orphan goes through - did not. It used the release-aware splitter, where a `?`
  consumes the byte after it, so on such an interchange no split ever happened:

  ```text
  ST?837?0001?005010X222A1                 id "(non-spec)", 1 element
  NM1?85?2?ACME CLINIC?????XX?1234567893   id "(non-spec)", 1 element
  SE?3?0001                                id "(non-spec)", 1 element
  warnings: []
  ```

  **🩺 The envelope framed correctly the whole time, which is what made it silent.** One group, one
  transaction, `GE-01`, `IEA-01`, `GS-06`/`GE-02` and `ST-02`/`SE-02` all reconciling, an empty
  warning array - and a transaction body no reader could see, because every reader in this package
  dispatches on `seg.id`. A consumer got an empty claim list out of a well-formed document.
  `buildInterchange` disagreed with itself the same way: it returns `parseX12` of the bytes it just
  wrote, so a caller passing `elementSeparator: "?"` got back a model holding none of the segments
  it had supplied. **It now reports the segments it wrote, for a value with no `?` in it - read that
  qualifier, it is load-bearing and the paragraph on the emit side below says why.**

  **🛑 It changes how an already-published document decodes, deliberately**, exactly as the envelope
  splitter did in the release before it, and on the same tiebreak: CONSISTENCY with the guard this
  package already carried twice, not a spec clause. 005010 does not transmit a release character at
  all, so nothing in it says what a `?` means once a sender has declared `?` as structure. **What is
  NOT the same: this class is not symmetric.** A one-element segment with an id of `(non-spec)` is
  not a second reading of `NM1?85?2?ACME CLINIC`, so unlike that slice there is no direction in
  which the old framing was the right one.

  **No warning code is added and no case moves onto a new code.** One is SUBTRACTED, in one place:
  `X12_DANGLING_RELEASE_CHAR` fired on any degenerate segment ending in an empty last element,
  because the check keys on a trailing `?`. With `?` as the separator that trailing byte is an empty
  element and not an unpaired escape, so `PER?IC?NAME?TE?5551234?` is silent now.

  **🛑 The guard is per ROLE, and the two roles left alone are a measurement rather than an
  oversight.** A `?` REPETITION or COMPONENT separator still does not split. `escapeRelease` writes
  `??` for a literal `?` whatever role `?` was declared in, so
  `buildInterchange({ componentSeparator: "?" })` emits `CLM*PATIENT??ACCT*150.00` today and
  `getSegmentValue(clm, "01")` reads `"PATIENT?ACCT"` back out of it. A literal split of those two
  roles would re-frame that as two empty components, trading a separator that never splits for a
  value this library itself emitted and could no longer read back. Deciding them means deciding the
  emit side with them, and that is its own change.

  **🩺 So do NOT declare `?` as the element separator on the emit side.** `buildInterchange` protects
  a value by prefixing `?` to the byte that needs protecting, so when `?` IS the element separator the
  protecting byte is itself a separator, and **no value containing any active delimiter or a literal
  `?` survives the round trip** - composites included, silently, with **no value-level workaround.**
  That is stated as a property rather than as a list of trigger bytes on purpose: two successive
  drafts named one trigger each and the gate falsified both by producing one more. What it costs is
  not always a truncation: a `HI-01` of `ABK:J45.50` is written `HI?ABK?:J45.50` and reads back as
  `HI-01 "ABK"` with the diagnosis code stranded in a phantom `HI-02`. Through `0.0.15` every one of
  these read as a single `(non-spec)` element and every dot-path answered `undefined`, so **a
  detectable absence became a confident wrong value.** All THREE roles therefore belong to the
  emit-side change, and none of them is closed here.

  **🩺 What else it does not close, pinned rather than left to be rediscovered.** On a degenerate set
  a `?~` still swallows the segment terminator: `findUnescapedTerminator` guards its own role only,
  so a segment ending in an empty last element puts a `?` immediately before the terminator and
  merges with its successor (`PER?IC?NAME?TE?5551234?EX?~SE?3?0001~` frames as one segment and raises
  `X12_MISSING_SE`). Framing is untouched - but the READ of that merged blob did move, so do not take
  it as "nothing moved": it now frames, so `~SE` and the SE's control number land in `PER`'s
  communication-number slots where at base they sat inside one `(non-spec)` element. Values are still
  RAW, `elements.join(sep)` still reproduces the segment byte for byte, and the ISA stays positional.

- **🩺 `buildInterchange` now release-escapes GS-04, GS-05 and GS-07, so the interchange it hands
  back reports the group date, group time and responsible agency code you passed**
  (`X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE`). Reproduced on the base tree at `837d4bc`. The
  builder mapped its escaper over GS-01, GS-02, GS-03, GS-06 and GS-08 and wrote `groupDate`,
  `groupTime` and `responsibleAgencyCode` raw, and it returns `parseX12` of the bytes it just wrote,
  so a value carrying an active delimiter in one of those three took a slot of its own and shifted
  every element after it down one - inside a single call. Measured on one group with
  `versionRelease: "005010X222A2"` and `groupControlNumber: "1"`:

  | spec field                     | read GS-06 | read GS-08 | warnings                                                |
  | ------------------------------ | ---------- | ---------- | ------------------------------------------------------- |
  | `groupDate: "2026*0601"`       | `"1200"`   | `"X"`      | `X12_CONTROL_NUMBER_MISMATCH`                           |
  | `groupTime: "12*00"`           | `"00"`     | `"X"`      | `X12_CONTROL_NUMBER_MISMATCH`                           |
  | `responsibleAgencyCode: "X*Y"` | `"1"`      | `"Y"`      | none                                                    |
  | `groupTime: "12~00"`           | absent     | absent     | `X12_UNEXPECTED_SEGMENT`, `X12_CONTROL_NUMBER_MISMATCH` |
  | `groupDate: "20260601?"`       | `"X"`      | absent     | `X12_CONTROL_NUMBER_MISMATCH`                           |

  **🩺 The `responsibleAgencyCode` row is the one to know about, because nothing was raised on any
  channel.** GS-06 kept its own slot, so it still reconciled against GE-02; what moved was GS-08, the
  version / release / industry identifier code, which is the element the entry above lets a caller
  state. All five rows now read the values the caller passed, with an empty warning array.

  **The grounding is inside this package rather than in a spec clause**, the same tiebreak the two
  entries below record: one function disagreed with itself. It returns `parseX12` of bytes it wrote
  and then answers a slot out of its neighbour's, and `SegmentSpec`'s documented contract already
  said the builder applies the release escape so an active delimiter inside a value survives.

  **🛑 It changes bytes this library already put on the wire, and that is the cost.** A value
  containing none of the four delimiters and no `?` is emitted byte-for-byte as before, which is
  every conformant GS-04 / GS-05 / GS-07.

  **🛑 No warning code is added and no case moves onto a new code. Read the property rather than a
  direction list:** the interchange the call returns now reports the values the caller passed, where
  before it reported whatever the shift left in each slot. **What is narrower here than in the two
  entries below, and is the part to carry away: no reader moved.** No executable line under
  `src/parser/` changed, so an inbound document from a trading partner decodes exactly as it did at
  `0.0.15`; what changed is what this library emits, and therefore how its own output reads back.
  **Say it that way rather than "the parser is untouched"** - this slice's own graded review forced a
  JSDoc correction in `src/parser/envelope.ts`, where a stale census of the released GS/ST slots had
  been published.

  **State the delimiter set by ROLE, never by byte.** `InterchangeSpec` lets you declare all four, so
  which BYTES shift is a property of the set you declared: with `elementSeparator: "|"` a GS-07 of
  `"X|Y"` is what took GS-08's slot and `"X*Y"` was inert. **Only the ELEMENT SEPARATOR and the
  SEGMENT TERMINATOR ever shifted the segment's own framing, plus a `?` immediately before the
  element separator.** The **repetition** and **component** separators moved the dot-path reader
  instead, and releasing them is a **gain** there: on the default set `getSegmentValue(gs, "07")`
  answered `"X"` for `"X^Y"`, truncating the value to repetition 0, and the composite read `"07-1"`
  answered `"X"` for `"X:Y"`. **The measured cost is a mid-string `?`, and only on the surfaces
  documented as raw** - `gs.elements[4]` reads `"2026??0601"` where it read `"2026?0601"`, while the
  dot-path read of that value unescapes and is unchanged. No total is published: that is what was
  measured, not a closed account. **A caller who was pre-releasing these values themselves is now
  escaping twice** and should drop the hand-rolled escape.

  **A wrong-typed GS element still names its slot.** The type check runs over the unescaped parts, so
  a numeric `groupDate` refuses with `buildInterchange: "GS"-04 must be a string` rather than
  degrading to the builder-named message the escaper alone would produce; the five slots that already
  escaped gained the slot name with it. Same class, same `X12_BUILD_INVALID_SPEC`, and still no echo
  of the value. **`null` and `undefined` in these three fields are ABSENT, not refused** - each
  resolves through a default before either guard sees it.

  **A LITERAL segment id this library writes is never escaped.** `esc` releases against the
  delimiter set the CALLER declared, and a `componentSeparator` of `"S"` is admissible, so mapping
  the escaper over element 0 would turn the literal `"GS"` into `G?S` and the group header would stop
  being a `GS`. `GE` / `ST` / `SE` / `IEA` already followed that rule. **Read "literal" strictly:** a
  `SegmentSpec` body segment carries a CALLER-supplied id, `buildTransaction` has released it since
  before this slice, and `SegmentSpec`'s own JSDoc still says it is emitted verbatim. That
  disagreement predates this slice, is unchanged by it, and is filed rather than closed here.

  **What this does not close:** `buildInterchange`'s IEA-02 is padded rather than escaped and has to
  stay byte-equal to the fixed-width ISA-13 it reconciles against, so that is a decision of its own;
  the ISA fixed-width slots remain outside both guards; and an unescaped active delimiter is still
  not safe anywhere, because that is what a delimiter is.

- **🩺 `buildTA1` now release-escapes its five caller-supplied elements, so an Accept acknowledgment
  this library emits no longer reads back as a Reject** (`X12-TA1-EMIT-NOT-RELEASE-AWARE`).
  Reproduced on the base tree at `e8f34b9`. `buildTA1` joined the five values with the element
  separator and escaped none of them, so a value carrying an active delimiter took a slot of its own
  and shifted every element after it down one. TA1-04 is the disposition, TA1-05 the note, and
  `parseTA1` narrows an out-of-enum TA1-04 to `R`. Measured with `parseX12` + `parseTA1` over
  `ISA … <what buildTA1 returned> … IEA`, `ackCode` `"A"` and `noteCode` `"000"` throughout:

  | `interchangeControlNumber` | emitted at `0.0.14`               | read `ackCode` | read TA1-01          | warnings                 |
  | -------------------------- | --------------------------------- | -------------- | -------------------- | ------------------------ |
  | `"000000001"`              | `TA1*000000001*260601*1200*A*000` | `"A"`          | `"000000001"`        | none                     |
  | `"00000001?"`              | `TA1*00000001?*260601*1200*A*000` | `"R"`          | `"00000001?*260601"` | none                     |
  | `"0000*0001"`              | `TA1*0000*0001*260601*1200*A*000` | `"R"`          | `"0000"`             | none                     |
  | `"0000~0001"`              | `TA1*0000~0001*260601*1200*A*000` | `"R"`          | `"0000"`             | `X12_UNEXPECTED_SEGMENT` |

  **An Accept acknowledgment this library emitted read back as a Reject**, on the element that
  reassociates it, with nothing raised on any channel. The `*` and `~` rows did that on every
  released version; the `?` row is the one the entry below opened. **🩺 The inverse exists and is the
  less safe direction:** the read narrows an out-of-enum TA1-04 to `R`, so a well-typed shift always
  lands on Reject, but `noteCode` is checked by the type system and by nothing at run time, so a
  `noteCode` of literally `"A"` shifted onto TA1-04 and made a **Reject read back as an Accept**, and
  a sender who reads an Accept does not resubmit. All four now read back the disposition emitted.

  **The grounding is inside this package rather than in a spec clause**, the same tiebreak the entry
  below records: `buildTA1` emitted bytes that this package's own reader decoded into a different
  disposition than the caller asked for, while every other builder already released the same class of
  element through the same helper.

  **🛑 It changes bytes this library already put on the wire, and that is the cost.** A value
  containing none of the four delimiters and no `?` is emitted byte-for-byte as before, which is
  every conformant TA1: TA1-01 echoes ISA-13, TA1-02 / TA1-03 echo ISA-09 / ISA-10, and TA1-04 /
  TA1-05 are code list values.

  **🛑 No warning code is added and no case moves onto a new code, but the consumer predicate MOVES
  IN BOTH DIRECTIONS.** `parseTA1` of a `buildTA1` output now reports the disposition and note the
  caller passed; before, it reported whatever element the shift left in TA1-04, which could be the
  caller's, a coincidental in-enum value, or an out-of-enum one narrowed to `"R"`. So
  `ackCode === "R"` **stops** firing where an Accept had been shifted onto it, and **starts** firing
  where a Reject had been shifted off it: `interchangeTime: "12*A"` with `ackCode: "R"` read `"A"`
  before and reads `"R"` now, with every field a valid member of its union. `ackCode === "A"` moves
  the same two ways. What is one-directional is the safety, which is a different statement: nothing
  now reports a disposition the caller did not ask for.

  **What releasing the rest of the set costs, and where it does not cost.** Only `*`, `~` and a `?`
  immediately before the separator ever shifted the segment's own element framing. **`^` and `:`
  moved the dot-path reader instead, and releasing them is a gain there:**
  `getSegmentValue(ta1, "01")` answered `"0000"` at `0.0.14` for a control number of `"0000^0001"`,
  silently truncating the reassociation key to the first repetition, and answers `"0000^0001"` now;
  the composite read `"01-1"` answered `"0000"` for `"0000:0001"` and answers the whole value now.
  **The measured pure cost is a mid-string `?`, and only on the surfaces documented as raw**: `raw`,
  `elements` and `parseTA1`'s fields read `"0000??0001"` where they read `"0000?0001"`, while every
  dot-path read unescapes and answered `"0000?0001"` on both. No total is published: that is what was
  measured, not a closed account. `getSegmentValue` takes an `X12Segment` and `Ta1Segment` carries no
  `id`, so add one to read a TA1 through it. If you were escaping the value yourself, as `KNOWN-LIMITATIONS.md`
  advised while this was open, drop that - you are now escaping twice on both kinds of surface
  (`"00000001??"` in, `TA1*00000001????*…` out, `getSegmentValue` answering `"00000001??"`).

  **The read half did not move.** `parseTA1` still reads elements RAW, pre-`?`-unescape, exactly as
  `X12Segment.elements` has always documented, so a control number of `"00000001?"` now reads back as
  `"00000001??"` rather than as `"00000001?*260601"`. Apply `unescapeRelease` if you need the value
  rather than the bytes; unescaping on the read side would move every TA1 a consumer already reads
  and is not done here.

  **`BuildTA1Options` gained `repetitionSeparator`, `componentSeparator` and `segmentTerminator`**
  beside the existing `elementSeparator`, the same four `build999` already takes. They exist for
  escaping and nothing else - `buildTA1` still emits no segment terminator, no repetition and no
  composite. Escaping against a guessed delimiter set is a value corruption rather than a safe
  default: `unescapeRelease` preserves `?X` verbatim for any `X` outside the reader's declared set,
  so a value released against the wrong delimiter comes back carrying a stray `?`. The defaults are
  unchanged and are the cosyte archetype, which this function cannot verify, so state the separators
  if you embed a TA1 in an envelope that declares different ones.

  **A non-string element now refuses** with `AckBuildError` and the existing `X12_ACK_INVALID_SPEC`
  code, and that is a prerequisite of the escape rather than a separate guard: releasing a value
  routes it through the escape helper, and the bare `escapeRelease` underneath it returns its empty
  accumulator for a `number`, so escaping without the type check would have replaced a shifted TA1-01
  with a vanished one. A numeric `interchangeControlNumber` emitted `TA1*12345*260601*1200*A*000`
  before, with the number surviving onto `elements` inside a value typed `readonly string[]`, and an
  absent one emitted `TA1**250101*1200*A*000`. The accept-with-note refusal still runs first and
  still reports `X12_TA1_ACCEPT_WITH_NOTE`, so no existing refusal moves code.

  **What this does not close:** `buildTA1` still uses no segment joiner, so its refusal names the
  builder and never `TA1-01`; `buildInterchange` still does not escape GS-04, GS-05 or GS-07; and an
  unescaped active delimiter is still not safe anywhere. Measured in `KNOWN-LIMITATIONS.md`.

- **🩺 A `?` immediately before the element separator inside an envelope segment now frames as ONE
  element, which fixes a released delimiter and is a SYMMETRIC change**
  (`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`). Reproduced on the base
  tree at `1b71733`. `src/parser/envelope.ts`'s `splitElements` - the splitter for `GS`, `GE`, `ST`,
  `SE`, `IEA` and `TA1` - was a plain `String.prototype.split` on the element separator, so a `?*`
  ended the element anyway and every element after it moved down a slot:

  ```text
  GS*HC*S*R*20260601*1200*1*X*005010?*X222A1~   ten elements, GS-08 read "005010?"
  applicationSenderCode "SEND*ER"               GS-08 read "X", the GS-07 agency code
  groupControlNumber    "1*2"                   GS-08 read "X";  warnings: []
  transactionSetControlNumber "00*01"           ST-03 read "01"; warnings: []
  CLM*PT?*ACCT*150.00~                          three elements - the BODY control, always correct
  ```

  **What made it a defect rather than a tolerance is that this package's own two halves disagreed
  inside a single call:** `buildInterchange` maps its release escaper over GS-02 / GS-03 / GS-06 /
  GS-08 and ST-01 / ST-02 / ST-03, then returns `parseX12` of the bytes it just wrote, so
  `applicationSenderCode: "SEND*ER"` emitted a correct `GS*HC*SEND?*ER*...` and handed back a model
  whose GS-08 answered `"X"`, with `warnings: []`.

  **🛑 READ THE CHANGE AS SYMMETRIC. IT IS NOT ONLY A CORRECTION.** A `?` before the separator has
  two readings and 005010 does not transmit which the sender meant. Where the sender **escaped** a
  delimiter, `0.0.14` framed it wrongly and this release frames it correctly: a correction, the rows
  above. Where the sender sent a **literal `?`** as the element's last byte, `0.0.14` framed it
  correctly and this release merges the element with its successor, so **the segment loses its LAST
  element**: a regression. `GS*HC*SUB1*RCV?*20260601*1200*000000123*X*005010X222A1~` read nine
  entries and reads **eight** here, GS-06 answering `"X"` and GS-08 gone. Every other release
  sequence in an envelope element (`??`, `?:`, `?^`, `?~`, `?A`) framed identically before and after
  and still does, pinned as invariance controls.

  **No warning code is added, and `X12_CONTROL_NUMBER_MISMATCH` moves in BOTH DIRECTIONS.** Where the
  old shift displaced a control number it stops firing, so **a consumer that rejects on that code
  will now accept such a document**; where a literal `?` newly displaces one it starts firing, so
  that same consumer **will now reject a document `0.0.14` accepted**. Both are pinned, alongside a
  genuine mismatch that raises it on either tree.

  **🩺 The regression direction reaches an 837's variant and its money, by one route.** `ST-03`
  decides the 837 variant, so an `ST-02` ending in a literal `?` destroys `ST-03` and the document
  falls back to the `SVx` scan. An 837 declaring `005010X222A1` whose only service segment is an
  `SV2` read `variant` `"P"`, `charge` `undefined` and `X12_837_SERVICE_LINE_NOT_DECODED` at
  `0.0.14`, and reads `variant` `"I"` with `charge` `150.00` and that warning silent here. **A warned
  non-decode becomes a decoded amount.** Re-check any routing driven off `submission.variant` if your
  partners send envelope elements that can end in a literal `?`.

  **Why it was taken anyway, and it is CONSISTENCY rather than a spec clause.** The two readings are
  mutually exclusive and nothing in 005010 picks between them. `decodeSegment` has read BODY elements
  the escape-wins way on every released version (`REF*EA*RCV?*NEXT` has always been two elements), so
  the envelope now obeys the one rule the rest of the package already obeyed.

  **🩺 The exposure is NOT inbound bytes only.** Envelope slots routed through the builders' release
  escaper are safe. Not every emit slot is routed through it, and no total is published: what follows
  is the routes measured to reach the regression direction, not a closed account of what bypasses the
  escaper. **`buildInterchange` does not escape GS-04, GS-05 or GS-07**: a `groupDate` of
  `"2026060?"` read nine GS elements at `0.0.14` and reads eight here, GS-08 gone. If you emit one
  of those, escape or reject a `?` yourself.

  **Values are still RAW, pre-`?`-unescape**, exactly as `X12Segment.elements` has always documented:
  `gs.elements[2]` reads `"SEND?*ER"`, not `"SEND*ER"`. `elements.join(separator)` therefore still
  reproduces the segment byte for byte, which is what `serializeX12` relies on when it substitutes a
  recomputed `SE-01` / `GE-01` / `IEA-01` into a control segment.

  **🩺 The ISA is deliberately exempt.** ASC X12 .5 makes it fixed-width, which is what lets the
  delimiter set be recovered from it before anything is parsed, so a `?` in an ISA element is content
  and never an escape; release-splitting it would collapse a well-formed ISA below its 17 entries.
  A degenerate delimiter set whose element separator IS `?` also falls back to the literal split,
  the same guard the segment-terminator scanner already carried. Both are pinned, each with a red
  negative control.

  **🛑 An UNESCAPED delimiter is still not safe and nothing here claims otherwise** - a bare active
  delimiter ends its element, because that is what a delimiter is. `build837`'s
  `implementationConventionReference` still refuses a value carrying one, deliberately not relaxed:
  a partner's parser is not obliged to be release-aware either, and widening an emit surface is its
  own decision rather than a side effect of a reader fix.

- **🩺 An `AMT` / `ADX` row whose amount decodes nothing is no longer dropped in silence**
  (`X12-AMT-ADX-ABSENT-AMOUNT`). Reproduced on the base tree at `9db104b` across all four readers,
  and the report it now raises is the `X12_AMOUNT_ROW_DROPPED` entry under **Added** above. The
  filing that named this defect stated the bound precisely and it is repeated here because the wider
  form is false: an **absent** amount element was silent on every channel, while a **present** one
  holding undecodable bytes was already reported by `X12_UNPARSEABLE_DECIMAL` at its own
  `elementIndex`. Both now also raise the new code; nothing moved off the old one.

- **A cookbook sentence said an undecoded 837 service line ships `charge` and `units` as `0`.** It
  reads `undefined` on the same release that made the rest of that page true, so the page contradicted
  the money spec-note it links to. Corrected in passing while sweeping that paragraph for the new
  code. This is a documentation correction only; no behaviour changed with it.

- **🩺 A repeated `NM1*87` in one 837 Loop 2000A no longer fuses two pay-to addresses into one the
  sender never sent** (`X12-PAY-TO-FUSION`). Reproduced at `0.0.12`: `payToAddress` is a bare
  accumulator with no entity object to own it, cleared only at the next Loop 2000A `HL`. Every other
  party gets a fresh object at its `NM1`, so a trailing `N3` / `N4` found `address === undefined` and
  its write replaced; the two pay-to arms had nothing replaced under them and wrote onto whatever the
  previous `NM1*87` left, `withLines` appending and `mergeAddress` falling back. Two `NM1*87`s each
  with an `N3` and an `N4` read back **a street line from each of two addresses** plus a
  `countryCode` taken off the **first** `N4`, on an address whose own `N4` names no country, with
  `warnings: []`. Re-emitted through `build837P` that became a single Loop 2010AB stating a payment
  destination no sender had stated.

  **The fix is the missing object identity, not a clear.** Each `NM1*87` now opens a fresh
  accumulator that the address arms read and write, so values from two occurrences can never meet.

  **🛑 Two earlier remedies were refuted, both for one reason, and it is why the emit side was in
  scope from the start: on this slot an emptied value is not a neutral absence, because the emit side
  reads it.** `build837P/I/D` gates Loop 2010AB on `payToAddress !== undefined` and `emitAddress`
  writes `N3` only for non-empty `lines` and `N4` only for a defined field. Clearing the accumulator
  at the `NM1*87` therefore erased an address a repeat carrying no `N3` / `N4` did state, re-emitting
  as **no pay-to loop at all**; a flag consumed by the first write after it did the same on a
  valueless `N3` or `N4`, re-emitting as a **bare `NM1*87`**. Both are positive statements about
  where a payment goes that no sender made. So the rule is stated in the emit side's own terms: the
  current occurrence takes the slot **only when it states an address the emit would write at least
  one segment for**, and an occurrence that states none leaves a stated one alone. The predicate is a
  single shared module (`src/transactions/claim/address-segments.ts`) that `emitAddress` also asks,
  so the reader and the writer cannot drift apart. This is the discipline the 835 already uses, where
  the emit guard reuses the read side's own balance validators.

  **A document with at most one `NM1*87` per Loop 2000A is byte-for-byte unaffected**, warning
  channel included, and that is pinned both ways.

  **🩺 The cost, stated rather than argued away: a repeat that states only part of an address now
  re-emits only that part.** A second `NM1*87` followed by an `N4` and no `N3` reads back that `N4`
  with `lines: []` and re-emits a Loop 2010AB with no `N3`. Keeping the earlier occurrence's street
  lines there **is** the fusion: one sender's street under another sender's city. The loop is still
  present, the warning is on the channel, and what is gone is the fabricated street.
  `KNOWN-LIMITATIONS.md` records it.

- **🩺 `build278Request` / `build278Response` refuse a review whose HL-03 level code is outside `EV`
  and `SS`, instead of emitting a review its own reader cannot decode**
  (`REFUSAL-MESSAGE-PHI-ECHO`). `Build278ReviewSpec.levelCode` is the **one** caller-supplied HL-03 in
  the library: every other level on every builder's spine is a module constant selected by tree
  position. It is typed `"EV" | "SS"`, but a JS or JSON caller reaches it with anything, and `esc`
  type-checks and escapes without constraining the value.

  **State the failure mode precisely rather than escalating it: it FAILS TO DECODE, it does not decode
  WRONGLY.** The read side is deliberately tolerant at these two levels (they attach under a
  subscriber or a dependent, so they are absent from the expected-parent map), so an out-of-enum HL-03
  falls to the walker's `else` arm, the review loop never opens, and `get278Response` returns the
  review **and its HCR-01 certification decision** as absent, with `warnings: []`. Nothing is
  mis-read: no decision comes back as a different decision, and the bytes stay on `tx.segments`. That
  is the better of the two failure modes. It is still not one to emit, because HCR-01 is a
  safety-critical field this library places verbatim and never infers, so the builder refuses exactly
  as `build834` refuses a maintenance type it cannot name. Reuses `X12_278_BUILD_INVALID_SPEC`; no
  error code was added.

  **The guard resolves the level through the same `?? "EV"` expression the emitter uses**, rather than
  testing `!== undefined`, so a `null` from a `JSON.parse`d spec is absent rather than forged. Testing
  `undefined` alone refused a spec the emitter would have defaulted and built, which is
  `X12-CALLER-VALUE-RESIDUALS`' recorded regression running the other way; the slice's own test caught
  it before it shipped. It reaches nested service reviews and dependent reviews, not only the first.

  **No caller who was getting the review into the document is broken.** An out-of-enum level never
  produced a decodable review, so there is no value that worked and stops working, and a TypeScript
  caller could not reach the arm at all. `PRE-EXISTING` at `4a5a943` and disclosed there as filed not
  fixed; this closes it.

- **🩺 A `REF`, `N3`, `N4` or `PER` after a dropped 837 `LX` does not attach itself to the last
  named party** (`X12-837-LOOP-RESIDUALS`). Through `0.0.10`, the release published as this was
  written, an `LX` arriving with **no `CLM` open** reported the dropped service line and then left
  the previous `NM1`'s party still addressable. Because the payer accumulator is what the **next**
  `CLM` opens against, the values surfaced on a **later claim**: measured, a line-item control
  number in `payer.references`, a street address in `payer.address`, and a contact in
  `payer.contacts`, none of which the sender put there. On that
  route all seven of `DTP` / `AMT` / `NTE` / `REF` / `N3` / `N4` / `PER` are discarded; the
  `DTP` / `AMT` / `NTE` already were at `0.0.10`, and the other four are what changed.
  **The route-dependence is unchanged and still matters:** with a `CLM` open, a trailing `DTP` /
  `AMT` / `NTE` / `REF` still lands on the enclosing claim.
  **If you parsed with `0.0.10` or earlier and read an entity's `address`, `contacts` or
  `references`, those slots could be carrying line-level values from a dropped Loop 2400.**

  **🩺 This is a trade, and the cost is that a conformant entity segment can now be dropped.** The
  TR3s nest Loop 2400 inside Loop 2300 and say nothing about an `LX` elsewhere, so which party a
  segment following a **stray** `LX` belongs to is not derivable from the spec in either direction.
  Where the `LX` was injected into an **entity** loop, the segments after it really were that
  entity's: measured, a payer that kept its `PO BOX` address, its `2U` secondary id and its contact
  at `0.0.10` now comes back with `address: undefined`, `references: []` and `contacts: []`. The
  direction was chosen because a mis-attribution puts a value on an object the sender never put it
  on and is indistinguishable from real data, whereas the bytes of a discarded segment are still on
  `tx.segments`. **That discard shipped SILENT in the change above and no longer is:** it now raises
  `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` at each discarded segment, listed under `### Added`
  and never released without it. `X12_837_SERVICE_LINE_DROPPED` at that `LX` still reports the
  **service line** and not an entity's address, id or contact, so it never named this loss. The loss
  itself is unchanged and is still pinned by tests; `KNOWN-LIMITATIONS.md` states both.

- **🩺 `X12_837_UNKNOWN_VARIANT` now anchors at the `ST` instead of the `BHT`**
  (`X12-837-LOOP-RESIDUALS`). The warning's `position.segmentIndex` was `1`, which in a
  transaction-scoped position is `tx.segments[1]` and in an 837 is the **BHT**, a segment with no
  part in resolving a variant. It is now `0`, the **ST**, which carries the ST-03 the resolution
  reads. A consumer joining this warning back to the document therefore gets a different segment
  than it did on `0.0.10`. No `elementIndex` is set, deliberately: one of the two routes into this
  warning is an ST-03 that is absent entirely, and on that route the `ST` has no element 3 to name.

- **🩺 An 837 service segment with no Loop 2400 open no longer takes a charge, a quantity and a
  procedure code off the model in silence** (`X12-837-LOOP-RESIDUALS`). Through `0.0.10` - the
  release published as this was written - an `SV1` / `SV2` / `SV3`
  arriving with no Loop 2400 open found no service line to decode into, was read into nothing, and
  reported on **no channel at all**: the claim came back with an empty `serviceLines` and
  `warnings: []`, indistinguishable from a claim that genuinely had no lines. It now raises
  `X12_837_SERVICE_SEGMENT_WITHOUT_LX` at the service segment itself.

  **The segment is still not decoded into any line, and that is deliberate.** `SV1-02` and `SV2-03`
  are both the line charge, so reading a service segment into a line the walker never opened
  mis-reads money. Refusing to read is the safe half; doing it silently was the defect. **This says
  nothing about how the variant resolved**, and `KNOWN-LIMITATIONS.md` now discloses why: a caller's
  `type` option wins first, and absent one, where `ST-03` names no implementation convention this
  reader recognises, the reader falls back to the first `SVx` in the transaction body,
  orphans included, so a stray `SV2` re-types the whole submission. That is pre-existing behaviour, measured identical at `0.0.10`, and is deliberately
  not narrowed here.

  **Nothing else about the walk changed, and the other two codes are unmoved.** An `LX` that opened
  no Loop 2400 still reports once, at the `LX`, and the service segments inside that dropped loop
  stay quiet rather than naming the same loss twice under two codes; the suppression is scoped to
  that loop, so a later orphan in the same transaction is still reported. A line that IS on the
  model with an undecoded `SVx` still raises `X12_837_SERVICE_LINE_NOT_DECODED` and nothing else.
  **This does not touch the model:** `charge` and `units` are still typed `X12Decimal`, and an
  absent `SV1-02` on a line that DID open still reads a confident `0`, which closes only with the
  deferred `X12Decimal | undefined` change.

- **🩺 An X212 277 this library emitted with a service line was short a required element, and every
  277 it read silently discarded the submitted units** (`X12-277-SVC07-NOT-DECODED`). `get277Status`
  read SVC-01 through SVC-04 and stopped; `build277` emitted exactly those four. SVC-07, the units of
  service count, is usage **R** in `005010X212`, so **every X212 277 this library produced with a
  Loop 2220 service line was non-conformant on the wire**, and the count a submitter sent never
  reached the model on the way back in. Both directions now carry it, and `build277` refuses rather
  than emit a line without it (see `### Changed`).

  **Only bytes could have caught this.** Every service-line assertion in the suite was a `build277`
  to `get277Status` round trip through one self-consistent four-element map, so it was green for any
  subset the two modules agreed on, including a subset missing a required element. A round trip
  cannot test an element map, and it cannot test an element usage at all. The new pins in
  `test/transactions-status-277-svc07.test.ts` parse literal EDI and compare literal segment strings:
  **16 of its 21 cases are red against a clean `c34770c` checkout**, and the five that are green are
  the negative pins that were already true (SVC-05 stays unread, an absent SVC-07 warns nothing, a
  277CA line with no units emits no placeholder).

  **🩺 Read the scope literally: ONE element's usage was fixed, and an emitted service line is NOT
  thereby conformant.** This was not a 277 usage audit and **no census of what remains is published**,
  on purpose: other required elements of the same `SVC` are still unguarded and finding another is
  expected rather than a new defect. To name two, `SVC-01` and `SVC-02` are both usage **R** in X212
  and both optional on `Build277ServiceLineSpec`, so a line supplying only `unitsOfService` still
  emits `SVC*******1~` with no refusal. **The missing guard is what is pre-existing, not that byte
  string** - at base the same spec emitted a bare `SVC~`, because the slot did not exist. `SVC-03` is usage **R**
  in X212 and usage **N** in X214 and is optional in both builders. And the read side still raises
  **no** warning for an X212 277 that arrives with no SVC-07, because a lenient reader saying so
  needs a new Tier-2 registry code. All of it is pre-existing and reproduces at `e3cdf49`; widening
  the guard would have turned this into that audit, which is its own item.
  `KNOWN-LIMITATIONS.md` carries the same statement.

- **🩺 A lookup keyed by document bytes can no longer be defeated by a key inherited from
  `Object.prototype` (`X12-VARIANT-LOOKUP-PROTOTYPE`).** Several lookup tables were plain object
  literals, which inherit `Object.prototype`, so an inbound value matching **any own property of
  `Object.prototype`** resolved TRUTHY against them. That set is engine- and version-dependent and
  is deliberately not enumerated here; on the Node 22 this package targets it is twelve members, and
  a draft of this entry listed eight. `Object.freeze` did not help: it seals the own properties and
  changes nothing about the prototype chain. What that cost, measured at `a33c208`:
  - **🩺 An ST-03 of `constructor` took every 837 service line off the model, silently.**
    `VARIANT_BY_ICR` answered the `Object` constructor, so `submission.variant` was a **function**
    rather than one of `P` / `I` / `D` / `unknown`, `X12_837_UNKNOWN_VARIANT` never fired, and
    `openServiceLine` - which answers `undefined` for anything that is not a known variant - dropped
    **every Loop 2400**, its charge, its units and its procedure code, with `warnings: []`.
  - **🩺 `lookupCarc("constructor")` answered a `CodeListEntry` whose `description` was a function**,
    on a field typed `string`, and suppressed `X12_UNKNOWN_CARC`. The guard is now in `makeLookup`,
    the single factory every bundled snapshot is read through, so the other bundled lists are
    covered by the same fix.
  - **🩺 An HI qualifier of `constructor` suppressed `X12_UNKNOWN_HI_QUALIFIER`** while still
    landing the code with `codeSystem: "unknown"` - an unresolvable code system on a diagnosis, with
    nothing on any channel to say so.
  - **An HL-03 of `constructor` raised `X12_HL_PARENT_LEVEL_INVALID`** against a level code the
    walker has no expectation for: a structural violation the document never made. The 271 / 277 /
    278 readers were never exposed - they share `src/transactions/shared/hl.ts`, which has always
    guarded this read with `hasOwnProperty`; the 837's local copy did not.
  - **`isClaimAdjustmentGroupCode("constructor")` answered `true`** and narrowed a non-code to
    `ClaimAdjustmentGroupCode`. It used `in`, which **walks the prototype chain**: the safe-looking
    form, not the safe form. It is now `Object.hasOwn`.

  Every one of these now behaves exactly as it does for any other unrecognized value, which is the
  whole of the claim: each fixed case is pinned against an honest-control case in the same slot, and
  the suite derives its key list from `Object.getOwnPropertyNames(Object.prototype)` at run time
  rather than from a list anyone maintains.
  Tables this package declares itself are built through the new internal
  `wireLookup` (`Object.create(null)`, then frozen), so the absent prototype protects future read
  sites too; tables it receives from a caller are guarded with `Object.hasOwn` at the read, the form
  `shared/hl.ts` already used. **No model shape and no message text changed**, and no code-list
  content changed.

- **🩺 An 837 `LX` that opens no Loop 2400 no longer drops the whole service line in silence
  (`X12-VARIANT-LOOKUP-PROTOTYPE`).** Two routes reached it: an `LX` arriving before any `CLM`,
  which produced `claims: []` and `warnings: []` even with a charge and units on the wire; and a
  submission whose variant is not one of `P` / `I` / `D`, where `openServiceLine` answers
  `undefined` and the line was never opened. Both now raise `X12_837_SERVICE_LINE_DROPPED` at the
  `LX`. **Retention is unchanged and nothing is invented**: no claim is synthesized to hold an
  orphan line and no variant is guessed, because either would put structure on the model that the
  sender did not send. The segments were, and remain, verbatim on `tx.segments`.
  **Read the scope of this code literally, because three things sit just outside it and all three
  are unchanged.** It is anchored at the `LX`, so an `SVx` arriving with **no `LX` at all** is still
  dropped in silence (`PRE-EXISTING`, disclosed not fixed). It does **not** travel with
  `X12_837_UNKNOWN_VARIANT`: a caller-supplied `type` outside `"P" | "I" | "D"`, which only a
  JavaScript or `JSON.parse`d caller can pass, reaches the second route without it, so read
  `submission.variant` to tell the routes apart. And what becomes of a `DTP` / `AMT` / `NTE` /
  `REF` following a dropped `LX` is route-dependent and is **not** simply "absent": see
  `KNOWN-LIMITATIONS.md`, which states both routes.

- **🩺 An 837 service line whose `SVx` never decoded no longer reads `0` / `0` in silence
  (`X12-837-SV-SILENT-ZERO`).** `get837Claims` resolves ONE variant for the whole submission (the
  caller's `type` option, else ST-03's implementation-convention reference, else the first `SVx`
  present). `openServiceLine` seeds a line's `charge` and `units` at `X12Decimal.ZERO`, and
  `decodeSv1` / `decodeSv2` / `decodeSv3` each **return before reading anything** when the line's
  variant is not theirs. So an `SV2` line on a submission that resolved to Professional read back as
  a `$0.00` charge for `0` units with `warnings: []`, with the procedure code, modifiers, unit of
  measure and place of service equally undecoded; a line carrying no `SVx` at all did the same. This
  is the residual `X12-QUANTITY-SILENT-DEFAULTS` disclosed rather than fixed, and it is the same
  fabrication one level up: a slot a reader never read cannot warn on the decimal channel.

  Measured against `d8b5085`: a conformant 837I whose ST-03 is flipped to `005010X222A2` read back
  `0` / `0` on both service lines with `warnings: []`, where the same bytes read with their own
  variant give `1500` / `1`. Three further probes were equally silent at base (the same file with
  `{ type: "P" }`, an `LX` with no `SVx` at all, and the 837D fixture with `{ type: "I" }`). All four
  now raise `X12_837_SERVICE_LINE_NOT_DECODED`; the honest 837P and 837I controls stay silent.

  **Not decoding the foreign `SVx` is unchanged and is not the defect.** `SV1-02` and `SV2-03` are
  both the line charge, so reading an `SV2` into a Professional-shaped line would mis-read money
  rather than fail to read it. **The model is unchanged too:** `charge` and `units` are still typed
  `X12Decimal` and still read `0`, so a consumer that never looks at `.warnings` sees what it saw
  before. Making those slots `X12Decimal | undefined` remains a breaking change and its own slice.
  The line is still retained, every segment stays verbatim on `tx.segments`, and a variant that
  resolves to nothing at all is still the separate `X12_837_UNKNOWN_VARIANT` case, where no line is
  opened and no `0` is fabricated. `KNOWN-LIMITATIONS.md` says how far that second case reaches.

- **🩺 An unparseable decimal no longer becomes a confident zero in silence
  (`X12-QUANTITY-SILENT-DEFAULTS`).** `elementDecimalOrZero` returned `X12Decimal.ZERO` for an
  element that was **present** and did not decode, with no warning on any channel. A payer amount of
  `1,234.56` (a thousands separator, which X12 forbids in an R-type element), `$450.00`, `450.00USD`
  or `N/A` read back as `0` and was indistinguishable from a payer that paid nothing. A fabricated
  amount presented as read is the same harm class as a mis-read quantity: a number nobody sent,
  arriving as though somebody had.

  The same root cause one type away: `elementDecimal` answered `undefined` for **both** "the sender
  omitted this element" and "the sender sent bytes this library could not read", also unwarned, so
  `undefined` at a quantity site meant "not decoded" rather than "absent" and no consumer could tell
  which.

  Every decimal read in all six transaction readers (835, 837P/I/D, 277 / 277CA, 271, 834, 820) now
  routes through a sink and emits `X12_UNPARSEABLE_DECIMAL` at the failing `position.elementIndex`.
  Measured on nine probes across those readers, one per site class, each substituting a single
  numeric token in a committed fixture: at `0.0.9` **seven of the nine were completely silent**, and
  the two that were not were the 835's `BPR-02` and `CLP-04`, which produced only
  `X12_835_REMIT_BALANCE_MISMATCH` - a warning that names an equation, never an element, and that
  exists in no other reader. All nine now carry `X12_UNPARSEABLE_DECIMAL` naming the element.

  **What did NOT change, deliberately.** The model is unchanged: a slot typed `X12Decimal` still
  reads `X12Decimal.ZERO`, an optional slot still reads `undefined`, and some rows are dropped whole.
  The warning is a property of the READ rather than of what the reader then does with the result, so
  every one of those outcomes carries it; no list of them is published, because a first draft
  enumerated three and a review measured a fourth. A slot typed `X12Decimal` cannot express "did not
  decode", and changing every such slot to `X12Decimal | undefined` is a breaking model change that
  belongs in its own slice. So a consumer that reads only the model and never looks at `.warnings`
  sees exactly what it saw before. **Gate on the warning.** Also unchanged: an **absent** element
  still returns `X12Decimal.ZERO` and still does **not** warn, because "missing means zero" is the
  documented convention of those slots. That does **not** make every unwarned `0` trustworthy: the
  guarantee is exactly that an unwarned `0` **at an element a reader decoded** is a zero the sender
  sent or omitted, and a slot a reader never read cannot warn. `KNOWN-LIMITATIONS.md` carries the
  residual and the one measured instance of that inversion in full.

- **A number passed where a builder's types say `string` no longer emits an EMPTY element. It is now
  REFUSED, and it is deliberately not coerced.** `escapeRelease` opened with
  `if (value.length === 0) return value;` and then looped to `value.length`. On a number `.length` is
  `undefined`, so the early return did not fire, `i < undefined` was false, the loop body never ran,
  and the function returned its empty accumulator. **The value vanished with no warning and no
  error.** The types say `string`, so a TypeScript caller could not reach it; a JavaScript or
  JSON-driven caller could, and `@cosyte/cli` is such a caller.

  Measured at `0.0.8` on an otherwise valid `build835` spec with only `patientControlNumber` changed:
  `CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1`, `ix.warnings.length === 0`, and a frozen interchange
  that looks successful. CLP-01 is required by TR3 005010X221A1 Loop 2100 and is the key that
  reassociates the remittance back to the 837's CLM-01. The builder's own
  `patientControlNumber === ""` guard did not catch it, because the value was not yet a string when it
  was checked.

  **The same one line reached every escaped slot in all nine builders**, including the 837's own
  CLM-01, the other end of that reassociation link. Measured at base by driving the shipped table
  against a `143a6ea` worktree, one element each: `BPR*A1*450.00` became `BPR**450.00`,
  `AK2*837*A1*005010X222A2` became `AK2*837**005010X222A2`, `NM1*IL*1*DOE*JANE****34*A1` became
  `NM1*IL*1*DOE*JANE****34`, `ENT**2J*34*A1` became `ENT**2J*34`, `NM1*1P*2*A1` became `NM1*1P*2`,
  `UM*HS*I*A1` became `UM*HS*I`, and `CLM*A1*150.00***11:B:1*Y*A*Y*Y` became
  `CLM**150.00***11:B:1*Y*A*Y*Y`. Where the dropped element was trailing, the trailing-empty trim
  removed it outright, so it is not even positionally recoverable.

  **It refuses rather than coercing, and that choice is the substance of the fix.** Coercion would
  mint a _different_ identifier: a JSON payload that carried `"0012345"` as a number has already lost
  the leading zeros, so `String(12345)` emits a well-formed identifier that is not the one the caller
  sent, and a remittance that reassociates to the wrong claim is worse than one that fails to
  reassociate at all. `String(1e21)` is `"1e+21"`, `String(NaN)` is `"NaN"` and `String(0.1 + 0.2)` is
  `"0.30000000000000004"`, none valid in an `AN`, `ID` or `Nn` element, and `X12Decimal` is already
  the sanctioned route for numeric content. No working caller is broken, because the numeric path did
  not work; it silently lost the field. The refusal message says why, so a caller is not nudged
  straight into `String(value)` at the wrong boundary.

  This is deliberately the OPPOSITE answer to `renderCallerValue`, which coerces for the same caller
  mistake. A refusal message that throws replaces a typed, code-tagged error with an uncaught
  `TypeError`, so its duty is to survive anything; an emitted document's duty is to invent nothing.

  **The guard is on values routed through the escape helper, and not every element position goes
  through it.** All of what follows was pre-existing, measured and unchanged here; it is **closed by
  the `X12-DECIMAL-BYPASSES-THE-GUARD` entry below**, in the same unreleased window, so the residual
  described here never reached a published version. **`esc` slots read `.toString()` off what the
  types say is an `X12Decimal`**, so a raw number arrives already a string and is passed through: a
  `patientResponsibilityAmount` of `0.1 + 0.2` still emits `…*0.30000000000000004*…`, `1e21` still
  emits `…*1e+21*…` and `NaN` still emits `…*NaN*…`, each with zero warnings, which are the exact
  three renderings this entry names as disqualifying, and an 837 service-line `units` reaches SV1-04
  the same way. **That is a set of examples too, not a count** - a draft of this entry said the class
  was exactly 36 slots and closed, and adversarial review measured it open. **Some string-typed
  positions never call the escape helper at all** and emit a
  number, or an unescaped delimiter, verbatim: the 999's `groupControlNumber` (GS-06 / GE-02),
  `transactionSetControlNumber` (ST-02 / SE-02) and `disposition` (AK9-01 and IK5-01), the 278's
  `levelCode` (HL-03), `groupDate` / `groupTime` (GS-04 / GS-05), and the 837's `lineNumber`
  (LX-01). **Those are examples and not a census, deliberately:** two drafts of this
  entry published an exhaustive count and adversarial review measured both incomplete, so the claim
  is cut back rather than grown a third time. AK9-01 is an `ID` element bound to X12 code list 715,
  and `build999`'s own accept-with-errors guard compares it against `"A"`, so a number walks past it
  the same way it walked past `patientControlNumber === ""`. **The fixed-width ISA slots** go through
  `pad` / `padControl`, so a number throws an untyped `TypeError` and a numeric
  `interchangeControlNumber` throws a typed refusal whose text misleadingly says "exceeds the 9-char
  spec limit"; `buildTA1` has no escape helper at all.

  **The "no working caller is broken" claim holds with one measured exception:** a boxed
  `new String("PT-ACCT-001")` built cleanly at `0.0.8` and is refused now, because `typeof` it is
  `"object"`.

- **A raw `number` in an `X12Decimal` slot is refused instead of rendered, and the type check now
  covers every element of every segment emitted through a builder's segment joiner**
  (`X12-DECIMAL-BYPASSES-THE-GUARD`). This closes the
  two classes the entry above disclosed and deliberately did not fix.

  **The decimal half.** `makeCallerEscaper` type-checks what reaches `esc`, but an `X12Decimal` slot
  hands `esc` a `value.toString()`, and a raw `number` answers that with a perfectly good string. So
  the value arrived already a string and the guard never applied. Measured at `15abbd4` with
  `warnings.length === 0` in every case: a `patientResponsibilityAmount` of `0.1 + 0.2` emitted
  `CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…`, `1e21` emitted `…*1e+21*…`, `NaN` emitted
  `…*NaN*…`, an 837 service-line `units` of `0.1 + 0.2` emitted
  `SV1*HC:99213*150.00*UN*0.30000000000000004***1`, and a diagnosis `monetaryAmount` reached
  `HI*ABK:J20.9:::0.30000000000000004`. **Two of those three renderings the library cannot parse
  back** - `X12_DECIMAL_RE` rejects exponent notation and `NaN` - so they did not round-trip; the
  IEEE-754 artifact is worse in the other direction, being well-formed enough that nothing downstream
  refuses it. Every such slot now emits through that builder's `escDec`, over `requireCallerDecimal`.

  **Why refuse and not round, which is the decision:** rounding `0.1 + 0.2` to `0.30` guesses cents
  and to `0.3` guesses tenths, and guessing the scale of a monetary amount is what `X12Decimal` exists
  to prevent. Same answer as the entry above, for a reason specific to this slot: every one of these
  is _typed_ `X12Decimal` already, so a raw `number` is a caller who defeated their own type checker
  and no supported numeric path is taken away.

  **The raw-slot half.** The string-typed positions that never called the escape helper at all are
  routed through it: `build999`'s `groupControlNumber` (GS-06 / GE-02), `transactionSetControlNumber`
  (ST-02 / SE-02), `disposition` (AK9-01 and IK5-01) and `groupResponsibleAgency` (GS-07);
  `groupDate` / `groupTime` (GS-04 / GS-05) in all seven domain builders; `build278`'s `levelCode`
  (HL-03); and `build837`'s `lineNumber` (LX-01). That closes the delimiter hole on them too -
  `build999` with a `groupControlNumber` of `"1*BOGUS"` emitted `GS*FA*…*1*BOGUS*X*005010X231A1`,
  shifting GS-07 and GS-08 by one, and now emits `1?*BOGUS`.

  **And the part that is a property rather than a list.** Three consecutive drafts of the entry above
  published an exhaustive counted census of the slots that bypass `esc`, and adversarial review
  measured all three false, each time by finding one more. Counting a fourth time would repeat that,
  so the check moved to the one place every element must pass: **the segment join**.
  `requireCallerSegment` type-checks every element of every segment emitted **through a builder's
  `seg` / `joinSeg` helper**, on every route in, `escDec` included. `esc` is optional on a slot; the
  join is not. It also names the slot the way the spec does - `build999: "AK9"-01 must be a
string, …` - which `esc` cannot, being unary.

  **What is deliberately still NOT claimed.** Type safety is structural here; **delimiter safety is
  per-slot**. A `string` carrying an active delimiter in a slot that skipped `esc` is still emitted
  verbatim, because the segment guard passes it - only the slots named above were routed. And the
  fixed-width ISA slots go through `pad` / `padControl` and not through the segment joiner either, so
  they remain as the entry above describes them: an untyped `TypeError`, or for
  `interchangeControlNumber` a typed refusal whose text misleadingly says "exceeds the 9-char spec
  limit". Both terminate; neither is silent; neither is improved here.

  **Two more exclusions, both found by the refuter against a draft that claimed more than the code
  did, both `PRE-EXISTING` and both now pinned by tests rather than argued away.** `buildTA1` uses no
  segment joiner and no escape helper - it joins its five caller-supplied elements directly - so a
  numeric or `undefined` `interchangeControlNumber` still emits silently as `TA1**250101*1200*A*000`;
  TA1-01 is the reassociation key back to the acknowledged interchange, so it is filed as its own
  item rather than widened into here. And **`build835`'s balance-equation amounts refuse UNTYPED**:
  `enforceBalance(spec)` runs before the escaper is built and calls `X12Decimal` methods on the
  caller's value, so `requireCallerDecimal` is unreachable on them and the caller gets a plain
  `TypeError` with no `code` (some saying the value was "tampered with") instead of the typed
  refusal. **The rule, rather than a list, because a first draft of this disclosure published a
  closed list of four and a refuter measured it incomplete:** a slot refuses untyped exactly when the
  balance guard reads it as a term of one of the three TR3 X221A1 §1.10.2 invariants in
  `src/transactions/remit/balance.ts`. **Named by SPEC FIELD and not by element number, because the
  next draft used element numbers and got one wrong:** `payment.totalActualPayment`,
  `claim.totalChargeAmount`, `claim.totalPaymentAmount`, every `adjustments[].amount` at claim and
  line level, `serviceLine.chargeAmount`, `serviceLine.paymentAmount` and
  `providerAdjustments[].amount`. Every other `X12Decimal` field refuses typed, including
  `claim.patientResponsibilityAmount`, `serviceLine.paidUnitsOfService` and every `amounts[].amount`.
  Both arms are pinned. Reordering the balance guard changes the refusal precedence of an
  out-of-balance remit, which is its own decision.

  **AK9-01 was the sharpest of the raw slots** - an `ID` element bound to X12 code list **715**
  (a data element number, and its values are a code _list_; this repo's own `src/transactions/ack/codes.ts`
  had it right and four other places said "code source"), so a number there told a receiver nothing
  about whether the functional group was accepted, and `build999`'s own `X12_ACK_ACCEPT_WITH_ERRORS`
  guard compares `disposition === "A"`, which a number walked past exactly as it walked past
  `patientControlNumber === ""`.

- **The `attw` publish gate no longer passes a tarball that carries no type declarations.** The
  `attw` script was the bare CLI, and `@arethetypeswrong/cli` returns 0 whenever its analysis found
  no types at all, before it reads the problem list. For a package that ships types, "This package
  does not contain types." means the declarations were missing from the tarball, which is a broken
  publish that the gate reported as a pass. Reproduced against this package with no concurrency
  involved: with `dist/` removed, and with only `dist/index.d.ts` and `dist/index.d.cts` removed,
  the CLI printed that sentence and exited 0 in both cases. The second is a state every build passes
  through, because `tsup` writes the JS before the declarations (measured at 1.92 seconds apart on
  one clean build here). `pnpm attw` now runs `scripts/attw.mjs`, which checks that every relative
  path `package.json` promises exists and is non-empty before invoking the CLI, and fails afterwards
  if the CLI still reports an untyped package. No change to the library or to any published type.

- **A `defineProfile()` refusal message no longer grows with the value you passed in.** Twelve
  refusal sites in `src/profiles/validate.ts` hold twenty-three caller-value holes between them, and
  every one now routes through `renderCallerValue` or `renderCallerJson`. Re-derived on this tree
  before the fix, driving the same thirteen cases the suite ships: the worst `X12ProfileError.message`
  was **360,181 characters**, at the `fixture` refusal. Three of the thirteen exceed 360,000, and they
  are the three that name **three** caller values (profile name + quirk id + a `JSON.stringify`d
  value) rather than two; a 120,000-digit quirk id reaches them because `QUIRK_ID_RE` carries no
  length bound. The same `fixture` refusal now measures **431 characters**.

  **431 is a measurement, not a maximum.** The ` (N characters)` suffix widens with the decimal width
  of the value's length, so the same refusal measures 434 at a 1,000,000-character value and 437 at
  10,000,000. The site's ceiling, derived from its fixed text plus its three fragment ceilings, is
  **443**; the suite asserts every one of the twelve under 500.

  **The figure this was filed on, 120,093, did not reproduce**, the same way `X12-BUILDER-BOUNDS`'s
  own filed figures did not: it depends on which site is hit and what the probe passes.

  Scope it the way the builder half is scoped. This is **not** `PHI-WARNING-MESSAGE-LEAK`, where the
  value was the document's: here you passed it in and still hold it, so bounding it **redacts
  nothing**. What it buys is a fixed ceiling on anything reaching a log line, a crash report or a JSON
  error envelope. The surviving characters are **not escaped**, and the bound is on UTF-16 **code
  units, not bytes**. **`X12ProfileError.profileName` is deliberately left unbounded**, so it still
  matches the name you passed.

- **A builder handed a forged non-array now refuses instead of hanging.** Every domain builder took
  its loop bound from a caller-supplied `.length`, so `{ length: "9".repeat(120000) }` coerced to
  `Infinity`, every element read `undefined`, every guard `continue`d, and the builder **spun forever
  rather than refusing**. Measured at base over the nineteen probes that drive a forged list at a
  builder ENTRY point (17 `FORGED_ARRAY_CASES` + 2 `RESIDUAL_CASES`), each in a child process under a
  20-second wall-clock timeout because a hang cannot be observed in-process: **16 of 19 hung** with no
  refusal and the other **3 threw an untyped `TypeError`**. The suite ships three further forged
  probes on optional LEAF arrays, which are `TypeError` at base and at head alike and move nothing:
  counting all 22, base is 16 hung / 6 untyped and head is 17 typed / 5 untyped. All **32 indexed
  loops across 7 builder modules** now take their bound from a `requireCallerArray` binding, and at
  head the same nineteen give **17 typed, code-tagged refusals** (messages 169 to 194 characters) and
  **2 untyped `TypeError`s**. `build835`'s `spec.traces` is the one that moved from the untyped group
  to the typed one, because its guard reads the list; it never hung, and this changelog does not claim
  it did.

  A hang is a worse failure than a refusal: a refusal hands control back with something to branch on,
  a hang takes the worker with it. But state the class correctly. This is a **forged non-array input,
  not a mis-read clinical value** - nothing decodes a document differently because of it, and the
  reachable harm is availability. It is unreachable from TypeScript and reachable from JavaScript,
  JSON, and therefore `@cosyte/cli`.

  **Disclosed rather than fixed, and identical at base and head:** where a builder reads a caller array
  with `for...of` - `buildInterchange`'s `spec.groups`, `build999`'s
  `functionalGroup.transactionResponses`, and every optional leaf array such as `claim.dates` - a
  forged list throws `TypeError: ... is not iterable`. That terminates, so it is not the hang, but it
  carries **no `code`**. Pinned by a test so it cannot quietly become a hang.

- **The `QUIRK_ID_RE` comment claimed a length bound the pattern never had.** It said "2-64
  lowercase-alphanumeric chars"; the regex accepts one character and it accepts 120,000, which was in
  fact the path to the largest profile error message on the tree. The comment was corrected to the
  code, not the grammar tightened: rejecting ids that define cleanly today is a separate decision from
  bounding a message.

- **A `build*` refusal message no longer grows with the value you passed in.** All twenty-three
  caller-value slots across the ten builder modules route through `renderCallerValue`, capping the
  rendered fragment at 90 characters. Nine are the `control number "…" exceeds the N-char spec limit`
  refusal, where the branch fires _because_ the value is over-long; seven had no length gate at all
  (`build999`'s ST-02 trace twice, `buildInterchange`'s transaction-set id, `build837`'s service-line
  variant, `build834`'s INS-03 and HD-01 maintenance types, `buildTA1`'s note code); and seven are in
  `build999`, found by adversarial review rather than by the census - the AK9-02 / AK9-03 / AK9-04
  counts, typed `number` but reachable with a string from a `JSON.parse`d spec at 120,063 characters,
  and three `.length` reads on caller-supplied arrays that a forged `{ length: … }` drove to 120,152.
  Measured: a 120,000-character control number produced a **120,066-character**
  `X12BuildError.message` from `buildInterchange` and now produces a **150-character** one. (150, not
  90: the 90 is the ceiling on the interpolated fragment, not on the message.) **This is robustness
  and log hygiene, not redaction, and the docs now say so** - you passed the value in and still hold
  it, so bounding it hides nothing from you; what it buys is a fixed ceiling on anything that reaches
  a log line or a JSON error envelope. The surviving characters are bounded but **not escaped**, and
  on the ack path the value is not always strictly your own (TR3 005010X231A1 has AK2-02 echo the
  acknowledged ST-02 verbatim). `err.code` remains the thing to branch on.
- **A builder refusal handed a non-string where the types say `string` stays a typed error.**
  `renderCallerValue` coerces rather than reading `.length` off whatever it is given, so a spec built
  from `JSON.parse` that carries a numeric control number still raises `X12BuildError` with its
  `code`, instead of an uncaught `TypeError` with none.
- **The 835 remit-total balance warning points at the BPR instead of at the ST.** Its
  `position.segmentIndex` was a literal `0`, which reads like "no segment" but is not one:
  `tx.segments[0]` is the `ST`, so a consumer resolving the position landed on a segment with nothing
  to do with the invariant. It is now the BPR's own 1-based body index, so
  `tx.segments[w.position.segmentIndex]` is the segment carrying the BPR-02 the equation compares
  against, matching the treatment claim-level and service-line warnings already had. The only
  remaining `0` is a transaction that carries no BPR at all. The corresponding position inside
  `build835` stays synthetic and is now named and documented as such: the builder has no parsed
  segment stream to index into, and it consumes only the warning's `message`, which is a
  registry lookup keyed by the invariant and therefore position-independent.
- **A segment outside a transaction now survives a round trip, and so does its warning.**
  `serializeX12` re-emits every entry of `ix.orphanSegments` at its structural `anchor`, so a
  consumer who serializes an interchange and re-derives warnings from the copy no longer loses the
  segment or the `X12_UNEXPECTED_SEGMENT` that described it. Placement is **by the anchor and never
  by `segmentIndex`** - that index addresses the _input_ stream, which the emit does not follow, and
  a replay keyed on it was measured splicing a stray segment into an 835's `ST..SE` body with no
  warning on the re-parse. An anchor names a slot in the typed tree, which is invariant under both
  the `ta1Segments` hoist and the skipped zero-length segment. Use `segmentIndex` to join an orphan
  to its warning, never to place it.

  Measured on a stray segment inserted at every position of a two-group, three-transaction
  interchange, over five segment ids (`ZZ`, `SE`, `GE`, `ST`, `TA1`) covering all five orphan
  `context` values and all three anchor kinds: **50 of the 50 insertions that produce an orphan
  round-trip byte-exactly** on a base with no envelope-level `TA1`. On the same base _with_ one, all
  **54** differ - and all 54 are byte-identical once the `TA1` is removed from both sides, so the
  only thing that moved is the `TA1`, which moves on that base with no orphan present at all. Across
  all 104: transaction bodies, `orphanSegments` (raw, context, anchor), `ta1Segments`,
  `trailingBytes` and the warning multiset are unchanged by the round trip, and every emit is a fixed
  point.

  **SE-01 now counts an orphan re-emitted between the `ST` and the `SE`.** A `TA1` that arrived
  inside an open transaction set is lifted off `tx.rawSegments` by the walker but is re-emitted
  where it came from, so it is a segment of that transaction set for SE-01 purposes ("segments
  included in the transaction set, including ST and SE", X12.6). Reconciling against the model alone
  would describe bytes the serializer did not write: `{ specClean: true, recomputeCounts: true }`
  would shrink a **correct** `SE*4*` to `SE*3*` over four emitted segments, and the inverse input
  would draw no mismatch warning at all. Both counts now come from the emitted range, so recompute
  is idempotent under the library's own reconciliation. An orphan emitted before the `ST` or after
  the `SE` is outside the range and is not counted, and GE-01 / IEA-01 are unaffected because an
  orphan is never a `GS` and never opens a transaction set.

  **`KNOWN-LIMITATIONS.md` is therefore down from seven constructs to six**, and the remaining five
  silent ones no longer include anything that loses a warning: line breaks, a doubled terminator, a
  missing final terminator, the `TA1` reorder, and a segment whose first element is empty outside a
  transaction (still the one construct that loses a value with no diagnostic at all - it is skipped
  by the walker, so there is nothing on the model to re-emit, and it is deliberately unchanged here).
  Retention and placement are still **not** promotion: no `get*` reader sees an orphan, and a `TA1`
  inside a group still does not join `ta1Segments`. No new warning code (registry unchanged at 22
  codes, 4 fatals), and no construct became fatal.

- **Silent data loss: a segment outside a transaction was dropped from the model, and a
  double-spaced file lost its entire interchange body.** Two defects with one cause. The envelope
  walker raised `X12_UNEXPECTED_SEGMENT` for a segment it could not place and then discarded it, so
  the segment's bytes were unrecoverable. Separately the line-break tolerance was exactly one
  optional CR then one optional LF, which admitted **4 of the 15** CR/LF sequences of length 0 to 3;
  the other 11 left a break in the stream that opened an unrecognized segment, so via the first
  defect a uniformly **double-spaced file returned `groups: []`**.

  The parser now absorbs any run of CR / LF bytes between segments (safe because a CR or LF in the
  segment-terminator position, the byte immediately after ISA-16, is refused as the Tier-3 fatal
  `X12_INVALID_DELIMITERS` (as it is at all four delimiter positions), so such a run is never
  structural), and every unplaceable segment is retained on `ix.orphanSegments` through a
  single chokepoint that raises the warning and records the segment together, so the two can never
  disagree. Measured before, then after: CR/LF sequences of length 0 to 3 that frame correctly, **4
  of 15 then 15 of 15**; orphan cases that retain the segment, **0 of 10 then 10 of 10** (ten
  constructed cases over nine distinct positions). Across the
  56 committed fixtures nothing changed: zero model divergences, zero warning divergences, zero
  fixed-point failures, and no fixture produces an orphan.

  **This fixed the model; the emit was closed separately, by anchor.** See the round-trip entry
  below. A positional replay keyed on `segmentIndex` was built and then removed during _this_ change
  because it was unsound: the emit is not in input order (it hoists `ta1Segments`) and skips the
  zero-length segment a doubled terminator produces, so replaying by input index spliced the orphan
  into whatever occupied that slot. Measured on a two-group interchange with a TA1 after the first
  group, that put a stray segment inside an 835's `ST..SE` body between `CLP` and `SE` with **no
  warning at all** on the re-parse, made a stray `SE` close the transaction early and corrupt SE-01,
  and carried an orphan across the IEA into `trailingBytes`. A documented omission was preferable to
  silent structural corruption, and there are regression tests fencing each of those shapes.

  **Retention is not placement.** An orphan is not decoded by any `get*` reader, and a `TA1` inside
  an open group is not added to `ta1Segments` (that surface means "envelope-level TA1", and is what
  `parseTA1` reads). Neither a doubled segment terminator nor a segment whose first element is empty
  is recorded as an orphan; both are long-standing behaviour, now stated rather than implied.

  Also in this change: a trailing CR/LF run after the final segment terminator is absorbed rather
  than surfacing as `trailingBytes` (previously `~\n\n` there produced a `trailingBytes` of `"\n~"`,
  a byte the input never contained, plus an `X12_TRAILING_GARBAGE` warning); a double-spaced file
  that previously produced 7 warnings now parses cleanly with none; and the five
  `X12_UNEXPECTED_SEGMENT` messages were rewritten, since each stated that the segment was not
  retained. No warning code was added or removed (registry unchanged at 22 warnings and 4 fatals) and
  nothing new throws.

### Documentation

> **Read the "Fixed" entry above first: it ships in the same release and supersedes two statements
> made below.** The entry below describes the state of the parser BEFORE that fix, and two of its
> present-tense sentences are no longer true as of this release: the parser now absorbs **any run of
> CR / LF** between segments, not "an optional CR then an optional LF"; and a segment outside a
> transaction is **retained on `ix.orphanSegments`**, not "discarded". What still holds from it, and
> is the reason it is kept, is the round-trip scope: `serialize(parse(s)) === s` is not guaranteed,
> the absence of line breaks is not sufficient, `KNOWN-LIMITATIONS.md` is the canonical list at
> **seven** constructs, and an orphan is still not re-emitted.

- **Corrected the round-trip claim: `serialize(parse(s)) === s` is NOT guaranteed, and the emit is
  byte-faithful only for the segments the parser recorded on the model.** The README described the
  default emit mode as "byte-faithful by default" with no qualification, and line-ending handling was
  absent from the entire consumer surface (zero mentions across the README, all nine `docs-content/`
  pages, and `KNOWN-LIMITATIONS.md`). Meanwhile the parser absorbs an optional CR then an optional LF
  after every segment terminator and the model has nowhere to record it. Re-measured against the
  committed corpus: **42 of the 56 fixtures do not return byte-identical, and all 42 differ from their
  source by line breaks and nothing else**; the remaining 14 carry no line breaks and do return
  byte-identical.

  Nothing about the emit changed. What changed is the claim. Line breaks turned out to be only the
  most common of **six** constructs the emit does not reproduce, and the other five fire on inputs
  containing no line breaks at all, so "my file is compact" is not sufficient grounds to expect byte
  equality: segments outside a transaction (raised as `X12_UNEXPECTED_SEGMENT` on the first parse, then
  discarded, so the segment **and its warning** are absent from the emit), a doubled segment terminator
  outside a transaction, a missing final terminator (the emit supplies one), post-IEA `trailingBytes`
  (re-joined from segment slices rather than preserved verbatim), and a **TA1 that followed a
  functional group**, which is collected onto `ix.ta1Segments` and emitted immediately after the ISA,
  so the emit **reorders** it (nothing is lost there: the model and warning stream round-trip
  identically, and no position is taken on where ASC X12 requires a TA1 to sit). **Four of the six are
  silent**, so a clean `ix.warnings` is not evidence that a round trip will be byte-exact.
  `KNOWN-LIMITATIONS.md` now holds the canonical list, and the other sites link to it and carry the
  load-bearing warnings rather than restating a count: `serialize(parse(s)) === s` is not guaranteed,
  the absence of line breaks is not sufficient, and `serializeX12(parseX12(source))` must not be used
  as a normalization step before comparing warnings.

  The properties that hold are now stated **as measured over the committed corpus** rather than as
  universals: every emit is a fixed point and re-parses to an identical model with an identical warning
  stream, the 14 line-break-free fixtures return byte-identical, and the other 42 differ by line breaks
  and nothing else. Two caveats bound that sweep and are stated with it: the corpus contains no
  instance of the five non-line-break cases, and 13 of the 14 byte-identical fixtures are
  `golden/*.edi`, which are serializer output by construction, leaving `envelope/no-trailing-crlf.edi`
  as the only independent witness.

  Also corrected: `KNOWN-LIMITATIONS.md` and `troubleshooting.md` both opened by promising the lenient
  parser "never silently drops or garbles data". Both now scope that to a **decoded value** and name
  the two things that are discarded. `spec-notes-tolerance.md` presented a three-tier taxonomy with no
  slot for a silent normalization; the tiers now name it, and note that a Tier-2 unexpected segment is
  warned about but not kept.

- **The universal about a stray 837 `LX` is cut back in the `src/` comments and 837 test-file headers
  the release before this one disclosed it in** (`X12-837-LOOP-RESIDUALS`). That release deleted it
  from the documents this package publishes and disclosed, rather than claimed closed, that it still
  stood in those two places; this is the rest of that sweep. **No count and no completeness claim is
  published**, because both are what went stale twice here: the sites swept are the `NM1` and `LX`
  case comments in `src/transactions/claim/get-837.ts`, and the headers, section comments and case
  titles of `test/transactions-claim-837-loop-residuals.test.ts`,
  `test/transactions-claim-837-discard-after-stray-lx.test.ts` and
  `test/transactions-claim-837-variant-lookup.test.ts`. Each said a trailing `N3` / `N4` / `PER` /
  `REF` "attached to" or "landed on" whichever party the last `NM1` left active, or that a party
  named after the `LX` "is addressable again", all of which read as all four kinds reaching every
  party. They do not: this reader does not surface every one of those kinds on every party. Each copy
  takes the qualifier already graded on the shipped surfaces, "wherever this reader surfaces that
  segment kind on that party at all", or is cut back to the measured instance beside it and that
  instance is named - a payer in every case but one, where it is a Loop 2320 other subscriber; no
  copy is given a new wording and **no per-kind, per-party map is published.** Counterfactual headings ("no longer attaches", "no longer leaves the last `NM1`
  addressable") lose the counterfactual only. The bullet in `documentation/agent-notes.md` beginning
  "RESIDUAL 1, MEASURED AT `93b2428`", and the identically-scoped paragraph in the test header it was
  written from, are **not** copies - both are scoped by "every trailing segment that attaches to a
  named party" - and are deliberately left alone. Nothing a consumer reads at runtime changed:
  neither the warning registry nor any `docs-content/` page nor the README carried the wording, and
  the executable behaviour of the swept comments is nil.

### Documented, not fixed

> **Superseded in part by the "Fixed" entry above, which ships in the same release.** The model half
> of the entry below is now fixed: the segment is retained on `ix.orphanSegments`, and a double-spaced
> file no longer loses its interchange body. The **round-trip** half still stands: `serializeX12` does
> not re-emit an orphan, so the warning still does not survive. The two entries are kept separate
> because they were separate changes, and the sentences below describe the release before this one.

- **🩺 A repeated `NM1*87` inside one 837 Loop 2000A fuses two pay-to addresses into one**
  (`X12-837-LOOP-RESIDUALS`). The `N3` line collector appends and the `N4` merge falls back, so
  `X12Claim.payToAddress` carries a street from each of two addresses and an `N4` field the second
  address omitted. Reproduces unchanged at `0.0.11` and is **not** fixed here: two remedies were
  built and both were refuted for moving the loss rather than removing it, so per ADR 0016 the unit
  was cut back rather than given a third. Clearing the accumulator at the `NM1*87` erases the
  address a repeat with no `N3` / `N4` of its own did state; replacing at the first following write
  erases it on a VALUELESS `N3~` / `N4~`. **Neither erasure is a neutral absence, and that is the
  constraint the next attempt starts from:** `build837P/I/D` emits Loop 2010AB only where the slot
  is defined, and `emitAddress` emits `N3` only for a non-empty `lines` and `N4` only for a defined
  field, so an emptied slot re-emits as **no pay-to loop at all** and a half-emptied one re-emits a
  bare `NM1*87` with neither. **The emit side is therefore in scope for that fix from the start**,
  which is what makes it its own unit. `documentation/agent-notes.md` carries the measurements.

- **A segment that falls outside a transaction is dropped from the model, and its warning does not
  survive a round trip.** The envelope walker keeps body segments only while an ST..SE transaction is
  open; anything else raises `X12_UNEXPECTED_SEGMENT` and is then discarded. A **blank** line between
  segments (`~\n\n`) exceeds the one-CR-plus-one-LF tolerance and triggers exactly this, so a uniformly
  double-spaced file loses its **entire interchange body** and parses to `groups: []`. The first parse
  does warn, so it is detectable rather than silent, but the warning is the only signal and it cannot
  be recovered from the emit. Long-standing behaviour, unchanged here and reproducing on the previous
  release; now disclosed in `README`, `KNOWN-LIMITATIONS.md`, `troubleshooting.md` and
  `spec-notes-envelope.md` rather than latent, and pinned by tests, while the fix is scoped as its own
  item.

### Tests

- **`test/builder-string-type.test.ts`**, the emit gate for the fix above and the third member of the
  builder-gate family (`builder-refusal-bounds` guards what a refusal says, `builder-array-bounds`
  guards whether a refusal happens, this one guards whether the caller's value reaches the document).
  The source scan is the exhaustive half: it requires every builder module's `esc` to be built by
  `makeCallerEscaper` and requires no builder module to call `escapeRelease` itself, so a tenth
  builder writing the old one-liner reds it without anyone adding a case. Negative-controlled by
  putting the defect back: reverting one module's `esc` reds the scan by file and line **and** reds
  the behavioural half, which is a cleaner control than the array gate gets, since there is no loop
  here to wedge the runner.

- **The PHI-scanner suite stopped paying 30 of its 32 `tsx` start-ups, and the global `testTimeout`
  now says what it does and does not cover.** No library code, no public surface and no timeout value
  changed; `scripts/phi-scan.ts` and `scripts/attw.mjs` are untouched.

  Nearly every case in `test/scripts/phi-scan.test.ts` spawns the scanner. Counted at runtime on
  both trees with a `spawnSync` shim: **32 spawns across 32 cases, all under `tsx`**, becoming
  **36 spawns across 33 cases, 34 under `node` and 2 under `tsx`**. So 30 `tsx` start-ups were
  removed and 2 were kept deliberately, in the equivalence case below. The scanner is type-annotated
  Node that needs erasing and nothing more, and Node 22.18 or newer strips types itself, so the
  spawns now use `process.execPath`. Measured on a 12-CPU cgroup quota with
  `availableParallelism()` 12 and other workers running (load average 8.9 to 11.3, a realistic
  condition rather than a quiet one): one scanner start is a 441 ms median under `tsx` against
  149 ms under `node`, seven runs each. Interleaved BASE/HEAD under `pnpm test:coverage`, two rounds
  each so the arms share a load condition, that file went 17.2 s / 17.5 s to 8.6 s / 8.6 s, and
  15.7 s to 6.6 s run on its own. Total CPU across all workers went 58.9 s / 58.4 s to
  50.5 s / 49.5 s. Those medians predict 8.2 s off this file (32 starts converted, less the 2 `node`
  and 2 `tsx` starts the new case adds) against 9.1 s measured, so the model is the right shape and
  about 11% light, not a match.

  **The substitution is pinned as an equivalence rather than assumed.** The gate consumers actually
  run (`pnpm phi-scan`, the pre-commit hook, CI) still invokes `tsx`, so one new case drives both
  runners over the same violator and the same clean file and requires the same exit code, stdout and
  stderr. It is the only place `tsx` is still spawned, and a simulated divergence reds it. **Scope it
  honestly:** that case drives `paths` mode on one hit and one clean file, so it pins the exit-0 and
  exit-1 verdicts and not the exit-2 refusals, nor all-mode, nor `--staged`. It is aimed at the only
  divergence these two runners plausibly have, which is at module load, and a load-time divergence
  cannot be confined to the routes it does not drive.

  **What this did not buy, stated because the two figures diverge:** it removed about 8.6 s of CPU
  but barely moved the suite's critical path (17.2 s / 17.5 s to 16.3 s / 16.7 s), which is now
  `test/scripts/attw-gate.test.ts`. That file is deliberately left alone: measured, one `attw --pack`
  on a trivial two-file package is 1,596 ms median, of which the real `npm pack` is 462 ms and the
  rest is attw's own analysis. There is no runner to substitute there, pinning the real binary is the
  point of that gate, and each of its cases already carries its own 60 s ceiling.

  **`vitest.config.ts` now documents the scope of `testTimeout: 10_000`, which is narrower than it
  looks in both directions.** It is a floor for ordinary tests, not where slow work gets its room:
  the three slowest suites already take per-test ceilings, and the 10 MB+ 834 stream measured
  8.9 s / 10.0 s / 9.3 s / 9.1 s across the four interleaved runs, so it sits AT the 10 s global on a
  merely-loaded box (a 10.0 s reading is not evidence of which side of the bar it fell), and measured
  24.1 s under heavier load on the same box. It is green only on its own 120 s ceiling. Raising the
  global to
  fit it would hand the same leash to all 1,100-odd tests and turn a genuinely hung test from broken
  into merely slow. It is also **not a liveness net**: measured on this tree with vitest 4.1.4, an
  async overrun reds at the ceiling, a finite synchronous overrun reds only after the work returns,
  and an infinite synchronous loop produces no verdict at all, wedging the worker until it is killed
  from outside (45 s, exit 143, no pass/fail line). That is the failure mode
  `X12-CALLER-VALUE-RESIDUALS` hit for real, and the defence against it is the source scan in
  `test/builder-array-bounds.test.ts`, not any timeout value.

- **The default emit mode's guarantees are locked against the whole committed corpus, not just the 13
  goldens.** The goldens are already in the serializer's image, so they could only ever demonstrate
  the easy half of the round trip. `test/serialize.test.ts` now discovers every `.edi` fixture from
  disk (so a fixture added later is covered without anyone remembering) and asserts four properties per
  fixture: the emit differs from its source by line breaks and nothing else, it re-parses to an
  identical model with an identical warning stream, it is a fixed point, and it is byte-identical to
  its source exactly when the source has no line breaks. A guard test asserts the corpus really
  contains both pretty-printed and compact fixtures, so the sweep cannot pass vacuously. Separate cases
  lock that LF, CRLF, and bare CR all normalize to one identical compact form.

- **A `round-trip escape hatches` suite pins the five inputs that falsify the corpus sweep's
  biconditional**, none of which contains a line break: a segment outside a transaction (asserting
  both that the value is gone from the emit and that its warning does not recur on re-parse), a
  doubled terminator, a missing final terminator, post-IEA trailing bytes, and a TA1 following a
  functional group (asserting it is reordered ahead of the GS but not lost, and still a fixed point).
  Each case asserts its own warning count rather than describing it, so the fact that three of them
  are silent is pinned rather than claimed. The committed corpus contains no instance of any of them,
  so without these the sweep would stay green while the prose around it claimed more than the sweep
  could see. The blank-line case now asserts the actual outcome (`groups: []` and an empty emit body)
  instead of only the warning; an earlier revision described that input as "reported not swallowed",
  which is exactly backwards.

### Security

- **Warning messages are built from a frozen registry instead of from the document, closing a PHI
  leak in every envelope control number and declared count.** Before this change
  `X12_CONTROL_NUMBER_MISMATCH` rendered **both** sides of the disagreeing pair into `message`
  verbatim and unbounded, on all six slots (`ISA-13`/`IEA-02`, `GS-06`/`GE-02`, `ST-02`/`SE-02`); a
  300,000-byte trailer control number produced a 300,062-byte `message`. `X12_GROUP_COUNT_MISMATCH`,
  `X12_TRANSACTION_COUNT_MISMATCH`, `X12_SEGMENT_COUNT_MISMATCH` and `X12_PRE_005010` did the same
  with `IEA-01`, `GE-01`, `SE-01` and `ISA-12`, and `X12_835_REMIT_BALANCE_MISMATCH` rendered three
  monetary amounts. Five of those six control-number slots are variable-width, so "it is only a
  control number" was never a bound: it is free-form trading-partner text that routinely carries a
  batch or patient-account identifier.

  **No warning factory takes a value parameter any more.** Each takes a `X12Position` plus, where one
  code covers several situations, a library-owned discriminant (`CONTROL_NUMBER_PAIRS`,
  `UNEXPECTED_SEGMENT_CONTEXTS`, `BALANCE_INVARIANTS`, `REQUIRED_LOOPS`), and `message` is a lookup
  into a frozen table. That replaces the previous posture, which shape-validated an echoed value
  against a spec grammar and substituted `(non-spec)` when it did not match. The shape test held for
  the code-list slots (CARC, RARC, HI qualifier, CSCC, CSC, maintenance type, 837 variant, segment
  id) and could not hold for a control number, whose grammar is whatever the sender sent. Taking no
  value at all is a property of the signature rather than a filter someone has to remember to apply.

  Nothing is discarded: every value is still preserved verbatim on the model, which is where a
  consumer that has decided it may handle PHI reads it.

- **A strict-mode escalation no longer carries a snippet.** `parseX12(raw, { strict: true })` turned
  the first Tier-2 warning into an `X12ParseError` carrying 64 bytes of the interchange, which put
  document bytes into `err.stack` and from there into any error reporter. The escalated error now
  carries `snippet: ""`; its `message` is the registry entry the warning carried and `position`
  locates it. `snippet` remains on the four Tier-3 structural fatals, which are raised before the
  envelope is readable, and remains the library's one deliberate exception.

- **`X12Segment.id` is bounded to the X12 segment-id grammar.** It is a derived structural
  identifier, the field a downstream package interpolates to say where something is, and it was a
  verbatim copy of the segment's first element. A sender that put a 300,000-byte value there had it
  copied into any locus built from `seg.id`. A first element outside the grammar now yields the
  exported `NON_SPEC_SEGMENT_ID` sentinel; `seg.raw` and `seg.elements[0]` keep the bytes, so
  round-trip stays byte-exact.

- **`X12_INVALID_DELIMITERS` no longer echoes the detected element separator byte.** The message names
  the fixed ISA position that broke instead.

### Added

- **`ALL_WARNING_MESSAGES`**, the frozen set of every message string the library can emit, so a
  consumer or a conformance gate can assert `ix.warnings.every((w) => ALL_WARNING_MESSAGES.has(w.message))`.
- **`CONTROL_NUMBER_PAIRS`, `UNEXPECTED_SEGMENT_CONTEXTS`, `BALANCE_INVARIANTS`, `REQUIRED_LOOPS`**
  and their `X12ControlNumberPair` / `X12UnexpectedSegmentContext` / `X12BalanceInvariant` /
  `X12RequiredLoop` types: the library-owned discriminants the warning factories now take in place of
  a value.
- **`NON_SPEC_SEGMENT_ID`**, the sentinel `X12Segment.id` takes when the first element is not a spec
  segment id.

### Changed

- **BREAKING (pre-alpha): every exported warning factory changed signature.**
  `controlNumberMismatch(position, pair)`, `unexpectedSegment(position, context)`,
  `remitBalanceMismatch(position, invariant)` and `missingRequiredLoop(position, loop)` now take a
  discriminant from the constants above; `pre005010`, `groupCountMismatch`,
  `transactionCountMismatch`, `segmentCountMismatch`, `trailingGarbage`, `unknownCarc`,
  `unknownRarc`, `hlParentMismatch`, `hlParentLevelInvalid`, `unknownHiQualifier`,
  `unknown837Variant`, `unknownClaimStatusCategory`, `unknownClaimStatus` and
  `unknownMaintenanceType` now take a `position` only.
- **Warning messages no longer carry the declared-versus-actual counts or the balance amounts.** Both
  sides of each are on the model (`iea.elements[1]` against `ix.groups.length`,
  `claim.totalChargeAmount` against `claim.totalPaymentAmount` and the CAS adjustments), so the
  information is one dereference away rather than rendered into a string a consumer logs by default.

### Fixed

- **Every out-of-balance claim and service line now gets a distinct warning position.** `CLP`
  segment positions were hard-coded to `0` (`clpSegmentIndex: 0, // populated in the future`), which
  was harmless while the message rendered the amounts and is not once the message names only the
  equation: two claims failing the same invariant produced byte-identical warnings at byte-identical
  positions. `position.segmentIndex` is now the CLP's own 1-based index in the transaction body, so
  `tx.segments[position.segmentIndex]` is that exact CLP. A service-line warning's is that index plus
  the line's zero-based ordinal plus one, which is a **unique locator rather than a pointer at the
  SVC**: read it as "the claim whose CLP is at `segmentIndex - (ordinal + 1)`, service line
  `ordinal`". Those cannot collide across claims: a claim with `n` service lines spans at least
  `n + 1` body segments.

- **Five `X12_UNEXPECTED_SEGMENT` messages claimed the segment was preserved; it is not.** A `GE`
  with no open `GS`, an `ST` with no open group, an `SE` with no open transaction set, a `TA1` inside
  a group, and a body segment outside any transaction set are all warned about and then dropped, so
  "preserved on the prior open container" (and, in the last case, "its bytes are on `seg.raw`") named
  a field that does not exist. Each message now says the segment is not retained and points at
  `position.segmentIndex` in the input.

- **The disclosure overclaimed on the builders, and the first correction of it still did.** It said
  builder refusals carry structural locators and numeric totals only. Measured against the source:
  at least **sixteen** refusal sites across **ten** `build*` modules interpolate a caller-supplied
  value verbatim and unbounded. Nine are the shared over-long-control-number template, where the
  branch fires **because** the value is over-long. Seven are not gated on length at all:
  `build999` echoes the supplied ST-02 transaction-set control number in two refusals,
  `buildInterchange` the supplied transaction-set id code, `build837` a service line's `variant`,
  `build834` an unrecognized INS-03 and an unrecognized HD-01 maintenance type, and `buildTA1` an
  unrecognized TA1-05 note code. Measured with a 120,000-byte value: a 120,155-byte
  `AckBuildError.message` from `build999` (with a longer `stack` still, whose exact size depends on
  the frame text and so is not quoted), and a 120,069-byte
  `X12BuildError.message` from `buildInterchange`. The README, `docs-content/troubleshooting.md` and
  `KNOWN-LIMITATIONS.md` now name the whole surface, including the ungated sites, and say to log
  `err.code` from a builder. Bounding the builders is a separate change.

- **The shipped PHI disclosure said the opposite of what the code did, in five places.**
  `README.md`, `docs-content/troubleshooting.md`, `docs-content/spec-notes-tolerance.md`,
  `docs-content/cookbook.md` and `KNOWN-LIMITATIONS.md` described warning messages as "bounded and
  PHI-free by construction" and told consumers "you can log the full `.warnings` array without
  leaking", naming `.snippet` as the one exception. The leak was in `.message`, and `.snippet` is not
  a field on a warning at all, so the disclosure was actively green-lighting bulk logging of the
  field that leaked. Each now describes the frozen registry, and `troubleshooting.md` states plainly
  what `0.0.3` and earlier did so a reader on an older version is not misled.
- **The PHI tests were green over unreachable space.** `test/transactions-remit-835.test.ts` swept a
  fixture whose CARC and RARC values were clean for shapes that could never have appeared there, and
  its balance-mismatch assertion **required** the leak (it matched `/spec="\d/` and `/computed=/`).
  `test/parser-envelope.test.ts` proved the hostile segment id was filtered and said nothing about
  the spec-shaped one. All three are replaced.

### Added

- **Brand lockup on the README, following the reader's colour scheme (ASSETS-P8).** The README now
  opens with the shared Cosyte lockup, above the `# @cosyte/x12` heading. It is a `<picture>`
  element: a `<source>` carrying the on-dark cut for `prefers-color-scheme: dark`
  (`https://cosyte.com/tile/cosyte-lockup-tile-on-dark-1200x300.png`) and an `<img>` carrying the
  on-light cut as the fallback (`https://cosyte.com/tile/cosyte-lockup-tile-on-light-1200x300.png`).
  Both were verified `200` / `image/png` before landing. On GitHub a dark-mode reader gets the dark
  cut; on npm the `<img>` is lifted out of the `<picture>` by the surrounding anchor so the light cut
  renders, which is correct there because npmjs.com has no dark mode. The heading and the blockquote
  under it are unchanged: the lockup reads "Cosyte" while the heading reads `@cosyte/x12`, so the two
  strings do not collide and nothing is duplicated. The alt text describes the artwork rather than
  the package, since that is what a screen reader announces on the npm page and what a reader gets if
  the image fails to load.

  **Recorded because it changed inside the unreleased window rather than after it.** This entry first
  landed describing a _per-package_ banner (`cosyte-banner-x12-1200x300.png`), which baked the
  package name and the tagline into pixels and duplicated the two lines beneath it. It explicitly
  chose a plain markdown image over an `<img>` or a `<picture>` pair, on the ground that whether
  npm's markdown sanitizer preserves `<picture>` was unverified. That was an accurate statement of
  what was known at the time. It has since been measured on a published package page: the sanitizer
  keeps the `<picture>`, and the anchor wrapper hoists the `<img>` out of it, so the light cut
  renders. The per-package banner was replaced before any release carried it, so no published
  version of this package ever had it, and this is written as one change rather than an addition
  followed by a replacement. The superseded reason is kept here rather than removed, because a
  record that quietly flips a stated reason is worse than one that shows the correction.

### Fixed

- **Stale version claim removed from five public pages (ASSETS-P8).** `README.md`,
  `KNOWN-LIMITATIONS.md`, `docs-content/intro.md`, `docs-content/installation.md`, and
  `docs-content/troubleshooting.md` all asserted the package was "published on npm at `0.0.1`". The registry says
  `0.0.2`. The literal was pinned by a previous docs sweep and went stale on the very next release,
  so it is now removed rather than re-pinned: the npm badge renders the live version on the README,
  and each page points at `npm view @cosyte/x12 version` as the source of truth. Docs only, no
  runtime or public-API change.
- **Scope claim corrected: the 270 and 276 inquiries have no typed model (ASSETS-P8).** The README
  status line and "What's inside" list, and `docs-content/intro.md`, claimed "the full v1 read scope
  (270/271, 276/277/277CA, …) and emit scope … are complete". There is no `get270` / `get276` reader
  and no `build270` / `build276` builder, and no 270 or 276 dispatch anywhere in `src/`;
  `get271Eligibility` and `get277Status` return `undefined` for any other `ST-01`. The inquiry
  directions parse into segments and dot-paths like any other X12 input but decode into no typed
  model. The claim is now stated per transaction on every page that made it: the README status line
  and "What's inside" list, `docs-content/intro.md` (both the status block **and** the "transaction
  sets it covers" list under it), `docs-content/spec-notes-transaction-sets.md` (the lead-in and the
  `270 / 271` + `276 / 277` rows of the reader/builder map), and `docs-content/cookbook.md`, which
  said the 270 was "a read-only surface" when it has no reader either. The gap is recorded in
  `KNOWN-LIMITATIONS.md`, `docs-content/troubleshooting.md`, and this repo's `CLAUDE.md`. Docs only,
  no runtime or public-API change.
- **Serializer description corrected to its actual defaults (ASSETS-P8).** The README described "a
  strict, spec-clean serializer with recomputed envelope counts", which reads as default behaviour,
  and `CLAUDE.md` said the serializer "always emits spec-clean X12". `serializeX12` is byte-faithful
  by default; `{ specClean: true }` reconciles the envelope, and the corrected counts need
  `{ specClean: true, recomputeCounts: true }` together, because `recomputeCounts` is inert on its
  own (`const recompute = specClean && opts.recomputeCounts === true`). A mismatch is always warned
  and never silently corrected. Docs only, no runtime or public-API change.
- **PHI claim narrowed to what the library actually guarantees (ASSETS-P8).** The README said
  "warnings/errors that carry codes and positions but never patient data". Warning messages and
  builder refusals are PHI-free by construction, but `X12ParseError.snippet` is a bounded (≤ 64
  character) copy of the offending input, so on real traffic it can carry PHI, and the library does
  not redact it. That was documented in the source JSDoc and nowhere a consumer reads. The README now
  states the exception, and it is written up in `KNOWN-LIMITATIONS.md` and
  `docs-content/troubleshooting.md`. Docs only, no runtime or public-API change.
- **Developer-docs publish status corrected to the published reality (README-ORG-SWEEP).** The
  docs.cosyte.com pages (`docs-content/intro.md`, `installation.md`, `troubleshooting.md`) and
  `KNOWN-LIMITATIONS.md` still said "not yet published to npm" / "gated on the coordinated public
  launch" (and `KNOWN-LIMITATIONS.md` still read `0.0.0`), contradicting the live `npm install`
  command already documented. Rewritten to state the package is published at `0.0.1`, public, still
  pre-alpha on the `0.0.x`-until-first-alpha ladder; the install command is now described as live
  rather than aspirational. Docs only, no runtime or public-API change.
- **README status line corrected to the published reality (README-ORG-SWEEP).** The status line still
  read "pre-alpha (`0.0.x`, not yet published to npm) … the first npm publish is gated on the
  coordinated public launch," which contradicted the npm-version badge and the `pnpm add @cosyte/x12`
  install line already in the same README. The package is published on npm at `0.0.1` from a public
  repo. Rewritten to state that it is published at `0.0.1`, in a public repo, still pre-alpha on the
  `0.0.x`-until-first-alpha ladder; the read/emit scope claim is unchanged. Docs only, no runtime or
  public-API change.

### Added

- **Em-dash brand gate in CI (`scripts/check-no-emdash.sh`, `pnpm check:no-emdash`,
  `.github/workflows/no-emdash.yml`; `EMDASH-CONFORMANCE`).** The founder directive of 2026-07-24
  (`knowledgebase/06-brand/voice-and-tone.md`) bans `U+2014` outright across every cosyte surface
  and names commit messages explicitly, and the meta-repo's `documentation/conventions.md` has
  described the rule as CI-gated; x12 was one of the repos where it was not. This ports
  `knowledgebase`'s scanner (the text-only variant, correct here because x12 tracks no binaries:
  all 264 tracked files decode as us-ascii or utf-8 and none holds a NUL byte, measured byte-level
  2026-07-27) and wires it to a dedicated workflow that checks **both** the tracked files and the
  **PR title, body, and branch commit messages**, the last of these on the non-default `edited`
  activity type so a description retitled after the final push is re-checked before a squash merge
  turns it into the commit message. It is a separate workflow rather than a job in `ci.yml` because
  `ci.yml` calls the shared reusable pipeline (which runs no arbitrary repo script) and its triggers
  drive the Node 22 + 24 matrix plus the `release-dry-run` job. x12 was already clean (0 of 21
  markdown files carried an em dash), so **no content changed**: this is regression prevention only.
  Dev tooling, no change to the published package surface, parser behavior, or warning codes.
  **Two limits stated rather than claimed away.** The new check is not yet one of the org ruleset's
  required contexts (`parser-ci-required-checks` requires `ci / verify (22|24, ubuntu-latest)` and
  `ci / actionlint`), so today it reds visibly but does not itself block a merge; making it required
  is an org-level change outside this repo. And a tracked text file holding a NUL byte **and a
  pattern match** fails this shape closed: grep 3.8 reports `binary file matches` on stderr and the
  scan refuses. The NUL alone does not trigger it, and the red is remediable by the same rewrite
  the brand rule already demands. x12 has no NUL-bearing tracked file at all today (zero of 264,
  measured byte-level).
- **`docs-content/` now ships the full canonical Diátaxis spine (DOCS-CONTENT-P4).** The sidebar was
  Overview-only, with `cookbook.md` authored but orphaned (invisible to every reader). This wires the
  cookbook into **Guides** and adds the rest of the spine every `@cosyte/*` package shares: four new
  **Core Concepts** pages (the envelope/loop model; the 80/20 transaction sets, mapping each shipped
  set to its reader/builder pair and the field it preserves verbatim; the tolerance tiers +
  warning-code model; and decimal-exact money via `X12Decimal`), **Installation** and **Quickstart**
  tutorials (parse an 835 and post the cash), and a **Troubleshooting & known limitations** page (the
  fatal-vs-warn model, a symptom→cause table, PHI-in-logs discipline, and the v1 non-goals). Depth is
  gated to the shipped surface: no unshipped API is documented. Synthetic-only fixtures throughout.
  Docs only, no runtime or public-API change.

### Fixed

- **`scripts/sync-version.mjs` hardened against two latent defects, and gated in CI
  (SYNC-VERSION-HARDENING).** Follow-up hardening on the VERSION-SYNC script; ported byte-identically
  across `hl7`, `x12`, and `mllp`. (1) The version was spliced into `src/index.ts` via
  `String.prototype.replace` with a _replacement string_, which interprets `$&`, `$1`, `` $` ``, etc.,
  so a version like `1.2.3-$&x` would inject the matched text and corrupt the `VERSION` constant while
  exiting 0. The replacement is now a replacer _function_, whose return value is inserted literally.
  (2) The declaration regex was non-global, so `.replace` silently rewrote the _first_ match; a
  column-0 decoy (e.g. inside a comment) ahead of the real declaration could be edited instead. The
  script now matches globally, asserts exactly one declaration, and exits non-zero loudly otherwise.
  Neither defect is reachable through Changesets today and both previously failed loud rather than
  shipping a lying `VERSION`, so this is hardening, not a fix for an observed break. The
  `format`/`format:check` globs now cover `scripts/**/*.mjs` so the script is prettier-gated in CI
  (the `.mjs` scripts were matched by no format glob before; `scripts/**/*.ts` was already gated).
  Build tooling only, no runtime or public-API change.
- **The `intro.md` status/roadmap section was stale**. It described Phase 1/2 as the frontier and
  listed the now-shipped read + emit + profile surfaces as "coming in later phases." Refreshed to the
  current shipped reality with an honest pre-alpha status banner.
- **A latent malformed-ISA fixture in `cookbook.md`.** The self-contained 835 example's ISA padded
  the sender/receiver IDs to 16 bytes instead of the fixed 15, so the 106-byte ISA was misaligned and
  delimiter detection would reject it. It went unnoticed because the cookbook block was illustrative,
  never executed; making the examples runnable under the doc/code-agreement harness surfaced it.

### Changed

- **Every runnable docs snippet is gated by the shared doc/code-agreement harness.**
  `test/docs-content.test.ts` runs `docSnippetSuite()` (from `@cosyte/vitest-config/snippets`) over
  `docs-content/`, extracting each ` ```ts runnable ` block, compiling it, executing it against the
  **built** ESM artifact, and asserting its inline `// =>` results, so a documented example can never
  silently drift from the shipped code. Bumps the `@cosyte/vitest-config` devDependency to `^0.0.2`
  for its `/snippets` export.

- **The Release workflow can actually start.** `.github/workflows/release.yml` calls the shared
  `cosyte/.github` pipeline, which requests `contents`/`id-token`/`pull-requests: write`, but declared
  no `permissions:` of its own, so it inherited the repo default of `contents: read`. A called
  workflow may only downgrade the caller's `GITHUB_TOKEN`, never escalate it, so GitHub rejected the
  workflow at startup (~1s, no jobs, no logs). Every Release run from June 2026 until now failed this
  way, unnoticed, because a `startup_failure` produces no logs to read. The caller job now declares
  the three scopes explicitly. CI-only, no runtime or API change.

- **The `VERSION` export now tracks `package.json`, and the missing `version`
  script is restored (VERSION-SYNC).** Two latent release bugs, both of which
  would have bitten at the first publish. (1) `VERSION` was hardcoded `"0.0.0"`
  in `src/index.ts` while `changeset version` bumps only `package.json`, so a
  published `0.0.1` would have shipped an export reading `"0.0.0"`. Every
  consumer asserting on or logging `VERSION` told the wrong version of the
  parser they were running. New `scripts/sync-version.mjs` rewrites the constant
  from `package.json` (idempotent; exits non-zero if the declaration is renamed
  rather than silently no-op'ing). (2) **No `version` script existed at all**.
  The shared `cosyte/.github` release workflow drives Changesets with
  `version: pnpm run version`, which would have failed with `ERR_PNPM_NO_SCRIPT`,
  so the "Version Packages" PR could never have been opened. The guard in
  `test/sanity.test.ts` was **inverted**: it asserted
  `expect(VERSION).toBe("0.0.0")` (literal against literal) which stays green
  through exactly this drift and goes red on a _correct_ bump. It now compares
  `VERSION` against `package.json` at test time. Ported from `@cosyte/mllp`
  (MLLP-10), in the canonical form `@cosyte/hl7` carries. No version bumped,
  nothing published, still `0.0.0`.

### Added

- **Trademark notice (`TRADEMARKS.md`).** This package names third-party systems to describe what it
  interoperates with; the notice records that cosyte is not affiliated with, endorsed by, or
  sponsored by any of them, that every reference is descriptive, and that the built-in profiles are
  authored from public sources only. Added to `files` so it ships inside the published tarball, not
  just on GitHub. Documentation only, no runtime or API change.

- **Phase 10: release hardening.** The v1 close-out; no new parser
  surface, just the gates, tooling, and docs that make the package
  trustworthy to publish.
  - **Publish-pipeline proof.** A new `release-dry-run` CI job proves a
    real release would succeed without burning a version or needing
    registry auth: `pnpm publish --dry-run` exercises the publish command
    path and `npm pack --dry-run` asserts the publishable tarball assembles
    with the right `files` set + built `dist/`. The real provenance publish
    stays gated on the public launch.
  - **Nightly amplified fuzz** (`.github/workflows/fuzz.yml`). Re-runs the
    byte-flip / never-throw property targets at a higher iteration count
    (`X12_FUZZ_RUNS`) with a rotating seed (`X12_FUZZ_SEED`), the deep
    search that would slow the per-commit run, and opens/auto-closes a
    sticky issue on failure. The per-commit suite is unchanged (pinned
    seed, base counts, coverage-stable); a finding is replayable via the
    printed seed. New test helper `fuzzRuns()` scales only the true fuzz
    targets.
  - **`pnpm refresh:code-lists`** (`scripts/refresh-code-lists.ts`). A
    release-event tool that validates every bundled code-list snapshot
    (well-formed `meta` ISO dates, non-empty unique codes + descriptions)
    and prints a freshness audit; its `validateCodeLists()` also runs on
    every `pnpm test`. Full regeneration from the canonical WPC / X12
    sources (`--fetch`) is a redistribution-terms-gated release step that
    prints the source manifest rather than fabricating unreviewed
    descriptions.
  - **Docs.** A task-oriented `docs-content/cookbook.md` and a
    `KNOWN-LIMITATIONS.md` do-not-over-trust statement; the README is now a
    real Quickstart. JSDoc `@example` completeness closed on the last three
    public value-exports (`ISA_MIN_LENGTH`, `DELIMITER_POSITIONS`,
    `RELEASE_CHAR`).
  - **Known limitation carried forward:** an external-oracle differential
    corpus (vs CMS Medicare 835) is not yet wired, pending a
    redistribution-terms review. See `KNOWN-LIMITATIONS.md`.

### Security

- **Dev-dependency advisory remediation (no runtime impact:
  `@cosyte/x12` ships zero runtime dependencies).** Added scoped
  `pnpm.overrides` pinning two transitive **dev/build-time** packages to
  their patched releases: `esbuild` (`>=0.27.3 <0.28.1` → `0.28.1`,
  GHSA dev-server path-traversal, unreachable here: a library build
  via `tsup`/`vitest`, never `esbuild serve`) and the
  `@changesets/parse` copy of `js-yaml` (`>=4.0.0 <4.2.0` → `4.2.0`,
  GHSA-h67p-54hq-rp68 merge-key DoS). The `js-yaml@3.14.2` pulled by
  `read-yaml-file@1.1.0` (via `@manypkg/get-packages` →
  `@changesets/cli`) is **intentionally left**. It calls
  `yaml.safeLoad`, removed/throwing in js-yaml 4, so it cannot be
  force-upgraded without breaking the release tooling; it only parses
  trusted local repo YAML at release time. Verify gate green on the
  upgraded tree.

### Fixed

- **Segment splitting now honours the `?`-release-escaped terminator.**
  `splitSegments` (the envelope tokenizer) used a naive `indexOf` for the
  segment terminator, so a value carrying a literal terminator byte (emitted by `escapeRelease` as `?~`) was split mid-value: the segment
  was truncated at the `?`, a phantom empty segment was injected, and the
  round-trip silently corrupted the value (the element splitter
  `splitWithRelease` had always been release-aware; only the segment
  splitter was not). The fix mirrors the element-splitter scan
  (`?` consumes the next byte) so an escaped terminator stays inside its
  value. The Phase 8 `serialize(parse(s)) === s` fixed point and the new
  `build835` round-trip both depend on this. A degenerate delimiter set
  where the terminator IS the release character falls back to the literal
  scan, preserving prior behaviour. Surfaced by the `build835` round-trip
  review.

### Added

- **Profile system: descriptive, fixture-grounded clearinghouse / payer
  companion-guide quirk attribution.** A `defineProfile()` API mirroring
  the sibling `@cosyte/hl7` profile shape, plus a `profiles` namespace of
  built-ins. The parser is already lenient and lossless, so a **v1 profile
  is DESCRIPTIVE**: it attaches attribution metadata to the returned
  `X12Interchange` (`ix.profile`) and powers `partitionWarnings`, but
  NEVER alters the parse: `groups`, `warnings`, and `isa` are
  byte-identical with and without a profile (proven by a divergence test).
  - **`defineProfile(spec)`** validates the spec (fail-fast on name, then
    Levenshtein "did you mean?" hints on unknown option keys, then the
    quirk set), merges any `extends` lineage (flatten + dedupe
    first-occurrence; child wins on quirk-id collision keeping first-seen
    position; scalar `description` last-wins), re-validates the composed
    set, and returns a frozen `X12Profile` whose `describe()` yields a
    structured `X12ProfileDescription` bucketed by effect
    (`relaxes` / `adds` / `requires`): structured DATA, not hl7's
    formatted string, so consumers can program against it.
  - **The locked HARD RULE: no invented quirks.** Every quirk MUST cite a
    `fixture` (a relative path under `test/fixtures/`) that actually
    EXHIBITS the deviation; the field is required at the type level and
    enforced in `defineProfile()`. The accuracy suite goes further: a
    per-quirk DEMONSTRATOR registry asserts each cited fixture exhibits its
    claimed deviation, and a shipped quirk with no demonstrator FAILS the
    suite, so a real-but-irrelevant fixture cannot slip past.
  - **`setDefaultProfile()` / `getDefaultProfile()`** set a process-scoped
    default applied when a `parseX12` call passes no `profile`. An explicit
    `{ profile }` wins; `{ profile: null }` opts out of the default for
    that call. `partitionWarnings(warnings, profile)` splits a parse's
    warnings into `{ expected, unexpected }` on the union of the profile's
    quirk `expectedWarnings`, the one behavioural hook a v1 profile
    offers.
  - **Built-ins ship ONLY where a Tier-2 fixture grounds them:**
    `profiles.availity` (payer-loop `REF*2U` + service-line `REF*F8`
    additions, grounded in `remit/835-availity-quirk.edi`) and
    `profiles.bcbsCommon` (backslash component separator, grounded in
    `envelope/bcbs-subelement.edi`). Profiles whose only "deviation" would
    be a canonical `:` baseline (e.g. a generic Medicare FFS profile) are
    deliberately DEFERRED rather than invented. Shipping them would
    violate the hard rule. Built-ins are reachable only through the
    `profiles` namespace, never the top-level export (mirrors hl7).
  - **API divergence from `@cosyte/hl7`, by design:** `describe()` returns
    structured data (not a string); the input type is `X12ProfileSpec`; and
    `partitionWarnings` is x12-only. These are conscious departures driven
    by x12's lossless-lenient reality, not drift.
  - New public exports: `defineProfile`, `setDefaultProfile`,
    `getDefaultProfile`, `partitionWarnings`, `profiles`, `X12ProfileError`,
    and the `X12Profile` / `X12ProfileSpec` / `X12ProfileQuirk` /
    `X12ProfileDescription` / `X12ProfileEffect` / `X12WarningPartition`
    type tree.
- **Domain builders: `build820` (005010X218 Premium Payment) and
  `build834` (005010X220A1 Benefit Enrollment and Maintenance).** The emit
  counterparts to `get820Payments` and `get834Header` /
  `get834Enrollments`, layered on the Phase 8 general builder and
  mirroring the pure-function `build835` pattern. They NEVER auto-send,
  open a socket, or touch the filesystem, and return a frozen
  `X12Interchange`. Completes the v1 emit scope: every v1 transaction now
  has a domain builder.
  - **`build820(spec)`** assembles a complete interchange (one GS..GE
    group, GS-01 `RA`; one ST..SE 820, ST-03 `005010X218`) from a typed
    `Build820Spec` whose monetary fields are `X12Decimal` throughout
    (BigInt-exact, never `parseFloat`). Segments emit in TR3 loop order
    (BPR → TRN → Loop 1000A receiver `N1*PE` → Loop 1000B remitter
    `N1*PR`/`N1*RM` → Loop 2000 remittances: ENT / NM1 → REF → DTM → RMR →
    ADX), and the output round-trips through `parseX12` so a well-formed
    spec is reproduced field-for-field. **The 820 carries no TR3 balance
    equation** (BPR-02 is not required to equal Σ of the RMR open items),
    so the builder emits all monetary amounts VERBATIM and never raises a
    balance-mismatch refusal, a deliberate contrast with `build835`.
  - **`build834(spec)`** assembles a complete interchange (one GS..GE
    group, GS-01 `BE`; one ST..SE 834, ST-03 `005010X220A1`) from a typed
    `Build834Spec` (envelope + BGN header + sponsor `N1*P5` / payer
    `N1*IN` + the member roster). Segments emit in TR3 loop order (BGN →
    N1 parties → REF → DTP, then per member: INS → NM1\*IL + DMG + N3/N4 →
    REF → DTP → COB → Loop 2300 HD → DTP → AMT). Member DTPs emit BEFORE
    the first HD so the read side binds them to the member, not the
    coverage loop. The output round-trips through `get834Header` /
    `get834Enrollments` field-for-field.
  - **Maintenance type is the 834's safety primitive: emit verbatim,
    refuse the unknown.** The builder places the caller-supplied INS-03 /
    HD-01 code (X12 Code Source 875) into the segment VERBATIM and NEVER
    infers or normalizes it; where the lenient read side only WARNS on an
    unknown code (it must surface what arrived), the builder REFUSES to
    EMIT an action it cannot name, rather than write a maintenance code a
    downstream enrollment system would mis-apply. A build-side property
    test asserts every known code round-trips byte-for-byte and every code
    outside the validated subset is refused.
  - **Refusal, not silent corruption.** `build820` REFUSES a structurally
    impossible spec via a typed `Premium820BuildError`
    (`X12_820_BUILD_INVALID_SPEC`: no TRN trace, no remittance, a
    remittance with neither an `ENT` nor an `NM1` to open its loop, a
    remittance with no `RMR` open item, an open item with no identity, an
    over-long control number). `build834` REFUSES via a typed
    `Enrollment834BuildError`
    (`X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE`: an INS-03 / HD-01 code
    outside the X12 875 subset; `X12_834_BUILD_INVALID_SPEC`: no member
    loop, an empty required INS-03, an over-long control number). Both
    messages carry structural indices / counts only. `build834`
    additionally names the offending maintenance code (an X12 control
    code, never PHI), but never a member id or name (PHI discipline).
  - New public exports: `build820`, `Premium820BuildError`,
    `PREMIUM_820_BUILD_ERROR_CODES`, `Premium820BuildErrorCode`, the
    `Build820Spec` type tree; `build834`, `Enrollment834BuildError`,
    `ENROLLMENT_834_BUILD_ERROR_CODES`, `Enrollment834BuildErrorCode`, and
    the `Build834Spec` type tree.
- **Domain builders: `build278Request` (005010X217 Health Care Services
  Review: Request for Review) and `build278Response` (005010X216 Services
  Review: Response).** The emit counterparts to `get278Request` /
  `get278Response`, layered on the Phase 8 general builder and mirroring
  the pure-function `build277` / `build277CA` pattern. They NEVER
  auto-send, open a socket, or touch the filesystem, and return a frozen
  `X12Interchange`.
  - **`build278Request(spec)` / `build278Response(spec)`** share one
    `buildServicesReview` body (GS-01 `HI`, ST-01 `278`) and differ only
    in ST-03 / GS-08 (`005010X217` vs `005010X216`) and the HCR direction
    gate. They assemble a complete interchange from a typed `Build278Spec`
    (envelope + BHT header + the UMO → requester → subscriber →
    (dependent) → reviews tree). Segments emit in TR3 loop order (BHT →
    HL 20 UMO → HL 21 requester → HL 22 subscriber NM1/DMG → [HL 23
    dependent] → HL EV/SS review: TRN → UM → HCR → REF → DTP → HI → MSG →
    provider NM1s, recursing SS service reviews under their EV event), and
    the output round-trips through `parseX12` so a well-formed spec is
    reproduced field-for-field.
  - **The certification decision is the safety-critical, response-only
    surface.** `build278Response` places the caller-supplied HCR-01
    `actionCode` (`A1` certified / `A3` not-certified / `A4` pended / `A6`
    modified / …) into the segment VERBATIM and NEVER infers, normalizes,
    or upgrades it. The round-tripped `decision.actionCode` is
    byte-for-byte the input. `build278Request` REFUSES a review carrying a
    decision (HCR is response-only); `build278Response` refuses a decision
    with an empty action code.
  - **The HL spine is computed, never caller-supplied.** The builder
    computes every HL-01 id, HL-02 parent pointer (`20 → 21 → 22 → 23 →
EV/SS`), and HL-04 has-child flag from the nested input tree, so an
    inconsistent hierarchy is unrepresentable and SE-01 is correct by
    construction.
  - **Refusal, not silent corruption.** The builder REFUSES a
    structurally impossible spec via a typed `ServicesReview278BuildError`
    (`X12_278_BUILD_INVALID_HIERARCHY`: a subscriber with neither a
    review nor a dependent, a dependent with no review;
    `X12_278_BUILD_INVALID_SPEC`: a review with no request category code,
    a request review carrying an HCR decision, a response decision with an
    empty action code, an over-long control number). The message carries
    structural locators only (`subscriber.review[0]`, level codes), never
    a member name, member id, trace, or diagnosis code (PHI discipline).
  - New public exports: `build278Request`, `build278Response`,
    `ServicesReview278BuildError`, `AUTH_278_BUILD_ERROR_CODES`,
    `ServicesReview278BuildErrorCode`, and the `Build278Spec` type tree.
- **Domain builders: `build271` (005010X279A1 Eligibility Benefit
  Response) and `build277` / `build277CA` (005010X212 Claim Status
  Response / 005010X214 Claim Acknowledgment).** The response-side emit
  counterparts to `get271Eligibility` / `get277Status` /
  `get277CADisposition`, layered on the Phase 8 general builder and
  mirroring the pure-function `build835` / `build837` pattern. They
  NEVER auto-send, open a socket, or touch the filesystem, and return a
  frozen `X12Interchange`.
  - **`build271(spec)`** assembles a complete interchange (one GS..GE
    group, GS-01 `HB`; one ST..SE 271, ST-03 `005010X279A1`) from a typed
    `Build271Spec` whose monetary / percent / quantity fields are
    `X12Decimal` throughout (BigInt-exact, never `parseFloat`).
    **`build277(spec)` / `build277CA(spec)`** share one `buildClaimStatus`
    body (GS-01 `HN`) and differ only in ST-03 / GS-08 (`005010X212` vs
    `005010X214`). Segments emit in TR3 loop order (271: HL spine → TRN →
    NM1 → N3/N4 → DMG → REF → DTP → EB + nested NM1 / REF / DTP / MSG;
    277: HL spine → NM1 member → Loop 2200 claim TRN → STC → REF → DTP →
    Loop 2220 SVC → STC / REF / DTP), STC C043 composites carry the
    category : status : entity triples, and the output round-trips
    through `parseX12` so a well-formed spec is reproduced field-for-field.
  - **TRN echo is the safety-critical reassociation invariant.** The
    builder places the caller-supplied trace into TRN-02 verbatim and
    NEVER fabricates, normalizes, or mutates it. A build-side property
    test feeds random trace tokens through all three builders and asserts
    the round-tripped `referenceId` is byte-for-byte the input.
  - **The HL spine is computed, never caller-supplied.** The builder
    computes every HL-01 id, HL-02 parent pointer, and HL-04 has-child
    flag from the nested input tree (271 spine `20 → 21 → 22 → 23`;
    277 / 277CA spine `20 → 21 → 19 → 22 → 23`), so an inconsistent
    hierarchy is unrepresentable and SE-01 is correct by construction.
  - **Refusal, not silent corruption.** The builder REFUSES a
    structurally impossible spec via a typed `Eligibility271BuildError`
    (`X12_271_BUILD_INVALID_HIERARCHY`: no source / a childless source /
    a childless receiver; `X12_271_BUILD_INVALID_SPEC`: over-long control
    number) or `ClaimStatus277BuildError`
    (`X12_277_BUILD_INVALID_HIERARCHY`: no source / a childless source /
    receiver / provider / a subscriber with neither claim nor dependent /
    a childless dependent; `X12_277_BUILD_INVALID_SPEC`: a claim with no
    trace / status / service line, an STC with no category code, an
    over-long control number). The message carries structural locators
    only (`source[0].receiver[0].provider[0].subscriber[0]`, level codes,
    counts), never a member name, member id, or trace (PHI discipline).
  - New public exports: `build271`, `Eligibility271BuildError`,
    `ELIGIBILITY_271_BUILD_ERROR_CODES`, `Eligibility271BuildErrorCode`,
    the `Build271Spec` type tree; `build277`, `build277CA`,
    `ClaimStatus277BuildError`, `CLAIM_STATUS_277_BUILD_ERROR_CODES`,
    `ClaimStatus277BuildErrorCode`, and the `Build277Spec` type tree.
- **Domain builders: `build837P` / `build837I` / `build837D` (005010
  837 Health Care Claim: Professional `X222A2`, Institutional `X223A3`,
  Dental `X224A2`).** The claim-submission emit counterpart to
  `get837Claims`, layered on the Phase 8 general builder and mirroring
  the pure-function `build835` pattern. They NEVER auto-send, open a
  socket, or touch the filesystem.
  - **`build837P/I/D(spec)`** each assemble a complete `X12Interchange`
    (one GS..GE group, GS-01 `HC`; one ST..SE 837, ST-03 per variant)
    from a typed `Build837Spec` whose monetary fields are `X12Decimal`
    throughout (BigInt-exact, never `parseFloat`). Segments emit in TR3
    loop order (BHT → Loop 1000A/1000B parties → Loop 2000A/B/C HL spine
    → Loop 2300 claim → Loop 2400 service lines, incl. 2410 drug / TOO /
    2430 line adjudication) and the output round-trips through `parseX12`
    so a well-formed spec is reproduced by `get837Claims`
    field-for-field. One HI composite emits per HI segment so the read
    side's per-bucket diagnosis/procedure order is preserved; same-group
    line-adjudication CAS triples pack into one CAS segment (≤ 6 each).
  - **The HL spine is computed, never caller-supplied.** The builder
    computes every HL-01 id, HL-02 parent pointer (20 → 22 → 23), and
    HL-04 has-child flag from the nested billing-provider → subscriber →
    (claims | patient) tree, so an inconsistent hierarchy is
    unrepresentable and SE-01 is correct by construction.
  - **Refusal, not silent corruption.** Where `get837Claims` only WARNS
    on a broken HL parent pointer, the builder REFUSES a structurally
    impossible spec via a typed `Claim837BuildError`. Codes:
    `X12_837_BUILD_INVALID_HIERARCHY` (no billing providers / a childless
    billing provider / a subscriber with neither claim nor dependent
    patient / a childless dependent patient) and
    `X12_837_BUILD_INVALID_SPEC` (empty `claimId`, no service line, a
    line whose `variant` mismatches the builder, an empty procedure /
    revenue code, an over-long control number). The message carries
    structural locators only (`billing[0].subscriber[0].claim[0]`, level
    codes, counts), never the `claimId` or a member id (PHI discipline).
  - New public exports: `build837P`, `build837I`, `build837D`,
    `Claim837BuildError`, `CLAIM_837_BUILD_ERROR_CODES`,
    `Claim837BuildErrorCode`, and the `Build837Spec` type tree.
  - Known limitation: claim-/line-level provider addresses (Loop
    2310/2420 N3/N4) are a documented read-side limitation: the NM1
    fields round-trip, the address does not.
- **Domain builder: `build835` (005010X221A1 ERA).** The first
  per-transaction emit helper layers the safety-critical TR3 invariants
  on top of the Phase 8 general builder, mirroring the pure-function
  `build999` / `buildTA1` pattern. It NEVER auto-sends, opens a socket,
  or touches the filesystem.
  - **`build835(spec)`** assembles a complete `X12Interchange` (one
    GS..GE group, GS-01 `HP`; one ST..SE 835, ST-03 `005010X221A1`) from
    a typed `Build835Spec` whose monetary fields are `X12Decimal`
    throughout (BigInt-exact, never `parseFloat`). Segments emit in TR3
    loop order (BPR → TRN\* → Loop 1000A/1000B parties → LX → Loop 2100
    claims → Loop 2110 service lines → PLB) and the output round-trips
    through `parseX12` so a balanced spec is reproduced by `get835`
    field-for-field. Composites (CLP-08, SVC-01, SVC-06, PLB) escape
    each component then join with the raw component separator. The
    envelope is emitted inline (not via `buildInterchange`) to avoid
    double-escaping a pre-composed element. Same-group CAS and
    same-provider/period PLB adjustments pack into one segment (≤ 6
    triples / pairs); PLB carries the raw EDI sign
    (`BPR-02 == Σ(CLP-04) − Σ(PLB)`).
  - **Refusal, not silent corruption.** Where `get835` only WARNS on an
    out-of-balance payer artifact, the builder REFUSES via a typed
    `Remit835BuildError`, reusing the authoritative read-side validators
    (`checkServiceLineBalance` / `checkClaimBalance` /
    `checkRemitTotalBalance`) against a materialized read model so emit
    guard and parse warning share one source of truth. Codes:
    `X12_835_BUILD_BALANCE_MISMATCH` (any §1.10.2 invariant: line,
    claim, or top-of-remit) and `X12_835_BUILD_INVALID_SPEC` (no TRN
    trace, an empty CLP-01, an over-long ISA-13). The thrown message
    carries numeric totals only, never a patient-control number or
    member id (PHI discipline).
  - **New exports.** `build835`, `Remit835BuildError`,
    `REMIT_835_BUILD_ERROR_CODES`, `Remit835BuildErrorCode`, and the
    `Build835Spec` type tree (`Build835EnvelopeSpec` / `…PaymentSpec` /
    `…TraceSpec` / `…PartySpec` / `…AddressSpec` / `…ReferenceSpec` /
    `…ContactSpec` / `…PersonSpec` / `…ProviderSpec` / `…AdjustmentSpec` /
    `…RemarkSpec` / `…AmountSpec` / `…ServiceLineSpec` / `…ClaimSpec` /
    `…ProviderAdjustmentSpec`).
  - **Known limitation (deferred).** The remaining domain builders
    (`build837P/I/D` / `build271` / `build277` / `build278` /
    `build820` / `build834`) layer on the same general surface and are
    NOT in this change.

- **Phase 8: spec-clean serializer + general interchange builder (the
  emit half lands).** Two new public surfaces close the read↔write loop.
  - **`serializeX12(interchange, opts?)`** turns any parsed
    `X12Interchange` back into an X12 byte stream. Default mode is
    byte-faithful: reconstructed purely from the verbatim `.raw`
    strings the parser preserved (ISA + terminator, then each
    TA1 / GS / segment / GE / IEA terminator-joined, then any
    `trailingBytes`), so for an input carrying none of the known
    unrecorded constructs catalogued in `KNOWN-LIMITATIONS.md` it
    reproduces the source bytes exactly. (As shipped, this
    entry said "for a Tier-1 input", which later proved too weak: a
    pretty-printed file is Tier 1 and does NOT reproduce exactly.)
    With `{ specClean: true }` it ALSO
    reconciles the envelope (SE-01 / GE-01 / IEA-01 counts + the
    ISA-13↔IEA-02 / GS-06↔GE-02 / ST-02↔SE-02 control pairs),
    surfacing every mismatch via `opts.onWarning` and NEVER silently
    correcting it. Corrected counts emit only with
    `{ recomputeCounts: true }`; control NUMBERS are identity and are
    NEVER rewritten, only flagged.
  - **`buildInterchange(spec)`** is the general-purpose, segment-level
    builder: given an `InterchangeSpec` it owns every envelope mechanic
    (the 106-byte fixed-width ISA, the GS/GE/SE/IEA control segments,
    and the SE-01 / GE-01 / IEA-01 counts), escapes active delimiters in
    body values via the `?` release char, and round-trips its output
    back through `parseX12` so the returned interchange is bit-identical
    to the parsed form. Structurally impossible specs are REFUSED with a
    typed `X12BuildError` (`X12_BUILD_INVALID_SPEC`): an over-long
    ISA-13, a body segment with no id.
  - **New warning + exports.** `X12_SEGMENT_COUNT_MISMATCH` is a
    serializer-only diagnostic (the parser never validated SE-01);
    registry expands 21 → 22, additions-only, bounded metadata only
    (H-PHI invariant). New public exports: `serializeX12`,
    `SerializeOptions`, `buildInterchange`, `InterchangeSpec`,
    `FunctionalGroupSpec`, `TransactionSetSpec`, `SegmentSpec`,
    `X12BuildError`, `X12_BUILD_ERROR_CODES`, `X12BuildErrorCode`, and
    the `segmentCountMismatch` factory.
  - **Round-trip goldens** lock the emit surface across all v1
    transactions: 13 committed `test/fixtures/golden/<name>.edi` files
    regenerated by `test/scripts/gen-serialize-goldens.ts`, asserting
    `serializeX12(parseX12(fixture))` reproduces the golden
    byte-for-byte. `roundTripProperty` (300 runs) + a builder property
    (200 runs) assert serialize idempotency and that the builder never
    emits a self-inconsistent envelope.
  - **Latent fixture defects caught + fixed.** The new reconciliation
    surfaced four hand-authored deviations the lenient parser never
    validated (it checks GE-01 / IEA-01 / control pairs but not SE-01):
    SE-01 miscounts in `837i-canonical` (30→33), `837d-canonical`
    (25→26), `999-accept` (5→6), and a GS-06/GE-02 mismatch in
    `278-response` (GS-06 2→1), an accuracy-gate win.
  - **Known limitation (deferred).** Domain per-transaction builders
    (`build835` / `build837P/I/D` / `build271` / …, the safety-critical
    emit code enforcing per-TR3 balance + certification invariants) are
    NOT in this phase; the general envelope surface they layer on top of
    is.

- **Phase 7: 278 services review + 834 enrollment + 820 premium
  payment (the v1 transaction scope rounds out).** Four new read-side
  helpers: `get278Request` / `get278Response` (TR3 `005010X217` /
  `005010X216`), `get820Payments` (TR3 `005010X218`), and the streaming
  pair `get834Header` + `get834Enrollments` (TR3 `005010X220A1`).
  - **Safety-critical fields preserved verbatim, never inferred.** The
    278 response `HCR-01` certification action (certified /
    not-certified / pended / modified) is captured as-is on each event /
    service review; the 834 `INS-03` / `HD-01` maintenance type (X12 0875) is preserved and an unknown code raises
    `X12_834_UNKNOWN_MAINTENANCE_TYPE` on the affected member only. No
    action is ever synthesized.
  - **834 streaming.** `get834Enrollments` is an
    `AsyncIterable<X12Enrollment>` yielding one member per `INS` loop;
    a streaming property test drives a 10MB+ synthetic roster with
    early-break. (Honest limitation: v1 still parses into `tx.segments`
    up front. A true file→iterator source is a v2 item.)
  - **278 HL spine** `20 → 21 → 22 → 23` validated via the shared
    `validateHl`; the `EV` / `SS` event + service levels are
    deliberately tolerant (omitted from the expected-parent map).
  - **820** surfaces the BPR payment header, TRN traces, receiver
    (`N1*PE`) + remitter (`N1*PR` / `N1*RM`) parties with addresses, and
    both `ENT` organization-summary and bare-`NM1` individual
    remittances with RMR open items, DTM dates, and ADX adjustments.
  - All monetary fields decode as `X12Decimal` (BigInt-exact, never
    `parseFloat`). 12 dogfooded `LoopSpec` artifacts ship through the
    public `defineLoopSpec()` (6 × 278 + 3 × 820 + 3 × 834). Warning
    registry expanded by `X12_834_UNKNOWN_MAINTENANCE_TYPE`
    (additions-only); its factory shape-validates the echoed code
    (H-PHI invariant). Synthetic fixtures across all three surfaces,
    unit tests, and the 834 streaming property. Serialization is
    Phase 8.
- **PHI commit-gate: a zero-dependency, X12-shape-aware PHI scanner
  (`scripts/phi-scan.ts`, run via `pnpm phi-scan`).** Guards the
  synthetic fixture corpus: it refuses any test fixture or `src/` file
  carrying real-PHI-shaped tokens so a developer cannot commit a
  real-looking interchange by accident. Wired into the pre-commit hook
  (`simple-git-hooks` → `phi-scan --staged`) and CI (the reusable
  `cosyte/.github` pipeline's `run-phi-scan: true`); flips the local
  `scripts/verify.sh` summary from `phi-scan SKIP` to `phi-scan ✓`.
  - **Synthetic allow-list, not an inline header.** X12 `.edi` is
    byte-strict (ISA must start at byte 0), so an inline
    `# synthetic: true` marker is impossible. It would break every
    parser test. Same constraint DICOM hits with binary `.dcm`, so the
    same proven solution: `scripts/phi-allow-list.txt` positively
    declares which names / dates-of-birth / ids / email-domains are
    fake. Any realistic-PHI token outside the allow-list is a hit.
  - **Segment-aware scan** for ISA-detected files: NM1 person-name
    tokens (entity-type-1) and SSN qualifier `34`, MI member-id and XX
    NPI shapes, DMG date-of-birth (any format qualifier, not just
    `D8`), and DTP / DTM / BHT / GS service/transaction dates before 2024. Every file also gets a cross-cutting shape pass (dashed SSN,
    `REF*SY` SSN, non-test email). Non-X12 targets (hand-written
    `src/`, plain text) get the conservative shape pass only, so JSDoc
    `@example` snippets don't trip it.
  - **Audited bypass.** A whole-file `--allow-fixture <path>` is
    rejected unless `phi-scan-overrides.md` carries a matching
    `### <path>` entry, so a silenced file is always a recorded act.
    Every subprocess is `git` via `execFileSync` array args, no shell
    form. Unit tests cover the clean interchange, each violator class,
    the plain-text pass, and both arms of the override gate.

- **Phase 6: 271 Eligibility Benefit Response + 277 / 277CA Claim
  Status, TR3s `005010X279A1` (270/271), `005010X212` (276/277),
  `005010X214` (277CA).** Three new public walkers:
  `get271Eligibility(delimiters, tx)`, `get277Status(delimiters, tx)`,
  and `get277CADisposition(delimiters, tx)`. 277 and 277CA share one
  internal walk disambiguated by the `ST-03` implementation-convention
  reference: `get277CADisposition` admits only `005010X214`;
  `get277Status` admits either. Each returns `undefined` only on a
  mis-routed call (wrong `ST-01`); every recoverable deviation is a
  warning, never a throw.
  - **TRN echo (safety-critical reassociation).** A 271 echoes the
    requesting 270's `TRN-02` trace verbatim onto its enclosing
    subscriber / dependent, and a 277 echoes the 276's onto its claim,
    so the provider can re-associate the answer with the request it
    sent. The walkers NEVER mutate, normalize, or drop the trace. A
    round-trip property test asserts byte-for-byte echo across an
    arbitrary trace grammar.
  - **Status-code fidelity (277 family).** Each STC composite
    (STC-01 / STC-10 / STC-11, C043) decodes into a verbatim CSCC
    (Claim Status Category Code, X12 source 507) + CSC (Claim Status
    Code, source 508) + responsible-entity triple. Bundled snapshot
    descriptions resolve when known; codes outside the subset preserve
    their verbatim value and emit `X12_UNKNOWN_CLAIM_STATUS_CATEGORY` /
    `X12_UNKNOWN_CLAIM_STATUS`. A 277CA provider-level batch
    acknowledgment opens a claim on a standalone STC (no TRN).
  - **HL parent-pointer integrity.** Enforced through the shared
    `validateHl` primitive: 271 spine `20 → 21 → 22 → 23`; 277 / 277CA
    spine `20 → 21 → 19 → 22 → 23`. A dangling or mis-levelled parent
    emits `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`; the
    walker NEVER silently re-numbers and the verbatim declared parent id
    is preserved.
  - **Bundled code-list snapshots.** `CLAIM_STATUS_CATEGORY_CODES`,
    `CLAIM_STATUS_CODES`, and `SERVICE_TYPE_CODES` ship as dated,
    versioned data artifacts alongside the CARC / RARC family, with
    `lookupClaimStatusCategory` / `lookupClaimStatus` /
    `lookupServiceType`.
  - All monetary fields (EB amounts, STC charge / payment, SVC line
    charge / payment) decode as `X12Decimal`, never `parseFloat`. 13
    dogfooded `LoopSpec` artifacts ship through `defineLoopSpec()`
    (7 eligibility + 7 status; Loop 2200 / 2220 reused across the
    subscriber + dependent branches). Warning registry expanded 18 → 20
    (additions-only); both new factories shape-validate the echoed code
    (H-PHI invariant). Shared `X12Hl` HL primitive exported for the
    result types. Six synthetic fixtures + unit tests + byte-flip fuzz
    (never-throw outside the 4 Tier-3 fatals) across every Phase 6
    fixture.
  - **Known limitations (deferred):** AAA request-validation segments,
    HSD detail, and III / LS / LE markers in the 271, plus QTY / AMT
    claim-summary roll-ups in a 277CA Loop 2200, are preserved on
    `tx.segments` verbatim but not yet typed onto the model.
- **Phase 5: 837 Healthcare Claim, TR3s `005010X222A2` (Professional),
  `005010X223A3` (Institutional), `005010X224A2` (Dental).** The
  claim-creation surface: the volume side of HIPAA EDI traffic.
  `get837Claims(delimiters, tx, opts?)` walks a parsed 837 transaction
  set into the typed `X12_837Submission` model: variant detection (from
  ST-03 implementation-convention reference, falling back to SVx
  segment id, then to `"unknown"` with `X12_837_UNKNOWN_VARIANT`),
  submitter (Loop 1000A NM1\*41) + receiver (Loop 1000B NM1\*40), the
  full HL hierarchy (Loops 2000A / 2000B / 2000C), every claim header
  (Loop 2300: CLM with patient account number, total charge,
  composite POS / facility-code-qualifier / claim-frequency-code,
  signature / assignment / benefits / release-of-information
  indicators), and every service line typed by variant (`SV1` →
  professional, `SV2` → institutional, `SV3` → dental).
  - **HL parent-pointer integrity.** The 837 family's safety primitive
    is the HL hierarchy (`HL-01` own id, `HL-02` parent id, `HL-03`
    level code: `20` Information Source / `22` Subscriber / `23`
    Dependent). An off-by-one in `HL-02` is THE #1 837 bug. The
    walker validates that every non-top-level HL's `HL-02` references
    an earlier-emitted `HL-01` AND that the parent's level matches the
    TR3-required parent for this level (`22` → parent `20`; `23` →
    parent `22`). Violations emit `X12_HL_PARENT_MISMATCH` or
    `X12_HL_PARENT_LEVEL_INVALID`. The parser NEVER silently
    re-numbers. The verbatim declared parent id stays on the
    `X12HierarchicalLevel` entry.
  - **HI qualifier → code-system provenance.** `HI` carries
    diagnoses, principal procedures, external cause of injury,
    condition codes, occurrence codes, value codes, and DRG / PR
    groupings under one segment id, with the qualifier (first
    component) governing the code system. The new
    `src/code-lists/hi-qualifiers.ts` ships a frozen `HI_QUALIFIERS`
    registry covering the qualifiers cited across the three TR3s
    (ICD-10-CM diagnoses: `ABK` principal / `ABF` other / `ABJ`
    admitting / `ABN` reason-for-visit / `APR` external-cause;
    legacy ICD-9-CM: `BK` / `BF` / `BJ` / `BN` / `BR`; ICD-10-PCS
    procedures: `BBQ` principal / `BBR` other; legacy ICD-9-PCS:
    `BQ` / `BBA`; DRG: `DR`; NUBC institutional code sets:
    `BG` condition / `BH` occurrence / `BI` occurrence-span / `BE`
    value / `PR` patient-reason). Each `X12ClaimHiCode` carries the
    verbatim qualifier AND the resolved {@link X12HiCodeSystem} +
    {@link X12HiCategory}; unknown qualifiers emit
    `X12_UNKNOWN_HI_QUALIFIER`, preserve the verbatim
    qualifier + code, and resolve to `codeSystem: "unknown"`. Helpers
    `resolveHiQualifier` / `isDiagnosisQualifier` /
    `isProcedureQualifier` ship in the public surface so consumers
    never re-derive the mapping.
  - **Money + identity discipline.** All monetary fields decode as
    `X12Decimal` (CLM-02 total charge, SV1-02 / SV2-03 / SV3-02 line
    charge, AMT amounts, SVD-02 adjudicated amount, CTP-04 drug
    quantity, line SV2-06 service-line rate, SV2-07 non-covered
    charge). All identifiers (NPI on `NM1*..*..*XX*<NPI>`, member id
    on `NM1*IL*..*MI*<MEMBER>`, claim id on CLM-01, patient/subscriber
    relationship code on PAT/SBR) are surfaced verbatim on the model;
    warnings NEVER echo their values (H-PHI invariant inherited from
    `@cosyte/hl7`). All dates carry their format qualifier (`D8`
    single-date `CCYYMMDD`, `RD8` date-range, `DT` for `DTP-435`/`096`
    admission/discharge timestamps) so a consumer can branch without
    re-parsing the literal.
  - **Variant-specific service-line types.** The
    {@link X12_837ServiceLine} discriminated union holds three shapes:
    - `X12_837ServiceLineProfessional`: `procedureQualifier` /
      `procedureCode` / `modifiers` from SV1-01 composite; 1-4
      `diagnosisPointers` from SV1-07; emergency / EPSDT / family-
      planning indicators; optional `drug` (Loop 2410 LIN + CTP NDC +
      UCUM unit).
    - `X12_837ServiceLineInstitutional`: `revenueCode` (NUBC 4-digit
      from SV2-01); optional procedure / modifiers from SV2-02
      composite; `serviceLineRate` (SV2-06); `nonCoveredCharge`
      (SV2-07).
    - `X12_837ServiceLineDental`: ADA CDT `procedureCode` from
      SV3-01; `oralCavityArea` composite from SV3-04; per-line
      `toothInformation` from `TOO*JP` (Universal Tooth Numbering)
      with surface codes from TOO-03's composite components;
      `prosthesisCrownInlayCode` (SV3-05).
  - **Loop 2430 Line Adjudication (COB).** SVD + CAS + DTP land on
    `serviceLine.adjudications` as `X12LineAdjudication[]`. Each
    adjudication ships the other-payer id (SVD-01), amount paid as
    `X12Decimal` (SVD-02), the other payer's procedure code, paid
    units, and any CAS adjustments, re-using `X12RemitAdjustment` /
    `lookupCarc` from the 835 helper since CAS semantics are
    identical.
  - **Loop 2320 Other Subscriber (COB).** Captured at the surface
    level: SBR-01 payer-responsibility code (`P` / `S` / `T`),
    individual relationship, claim filing indicator, and the
    other-subscriber + other-payer NM1 entities. Detailed CAS / OI /
    MOA breakdown inside Loop 2320 is deferred to Phase 9 (companion-
    guide tolerance). Verbatim segments remain on `tx.segments`.
  - **Eleven dogfooded `LoopSpec` artifacts** ship through the public
    `defineLoopSpec()` API, the dogfooding gate locked in Phase 2.
    `CLAIM_837_LOOP_1000A` / `_1000B` (submitter / receiver),
    `CLAIM_837_LOOP_2010AA` (billing provider name), `_2010BA`
    (subscriber name), `_2010BB` (payer name), `_2010CA` (patient
    name), `CLAIM_837P_LOOP_2410` (drug identification), `_LOOP_2430`
    (line adjudication), plus variant-specific
    `CLAIM_837{P,I,D}_LOOP_2000A` / `_2300` / `_2400` trees.
  - **Bundled HI qualifier registry under
    `src/code-lists/hi-qualifiers.ts`** alongside the existing CARC /
    RARC / CLP_STATUS / CAGC snapshots, formally part of the
    code-list family, not a transaction-local table.
  - **Two new exported constants for safety + ergonomics:**
    `HL_LEVEL_CODES` (`INFORMATION_SOURCE` `"20"` / `INFORMATION_RECEIVER`
    `"21"` / `SUBSCRIBER` `"22"` / `DEPENDENT` `"23"`) and
    `NM1_QUALIFIERS` (`SUBMITTER` `"41"` / `RECEIVER` `"40"` /
    `BILLING_PROVIDER` `"85"` / `PAY_TO_ADDRESS` `"87"` /
    `PAY_TO_PLAN` `"PE"` / `SUBSCRIBER` `"IL"` / `PAYER` `"PR"` /
    `PATIENT` `"QC"`), so the walker (and any consumer Phase 8
    builder) never has to magic-string the safety-critical
    discriminators.
  - **Six new shared element-read helpers in `parser/segment.ts`**:
    `elementValue` / `elementOptional` / `componentOptional` /
    `elementDecimal` / `elementDecimalOrZero` / `collectElementValues`,
    extracted out of the 835 and 837 walkers (both walkers had
    byte-identical copies). New transaction walkers (Phase 6+ 270/271,
    277, 834) inherit them. Public surface: exported via
    `@cosyte/x12`.
  - **Public-surface additions** to the warning stability snapshot:
    `X12_HL_PARENT_MISMATCH`, `X12_HL_PARENT_LEVEL_INVALID`,
    `X12_UNKNOWN_HI_QUALIFIER`, `X12_MISSING_REQUIRED_LOOP`,
    `X12_837_UNKNOWN_VARIANT` (13 → 18 Tier-2 codes; additions-only,
    fatal registry stays at 4). All new warning factories
    (`hlParentMismatch` / `hlParentLevelInvalid` /
    `unknownHiQualifier` / `missingRequiredLoop` /
    `unknown837Variant`) shape-validate echoed values through
    dedicated regex patterns (`/^[0-9]{1,4}$/u` for HL ids,
    `/^[0-9]{2}$/u` for level codes, `/^[A-Z][A-Z0-9]{1,2}$/u` for HI
    qualifiers, `/^[0-9A-Z]{3,6}$/u` for loop ids,
    `/^[0-9A-Z]{3,16}$/u` for ICR) and substitute `(non-spec)` for
    hostile inputs, the H-PHI invariant from `@cosyte/hl7`.
  - **PHI discipline.** Warnings NEVER echo field VALUES; the
    `missingRequiredLoop` rationale strings are hard-coded literals
    (no element interpolation). Patient names / member IDs / NPIs /
    claim numbers are surfaced verbatim on the typed model only, the
    documented consumer-redaction boundary (mirrors hl7 + the 835
    helper). The `X12ClaimNote` JSDoc explicitly flags NTE-02 as
    PHI-bearing (provider-supplied free text). Every Phase 5 fixture
    is synthetic (test names `TEST PATIENT` / `SUB LAST` / `PATIENT
CHILD`; sequential member IDs `MEMBER001`–`MEMBER011` etc.; NPI-
    shaped sequential numbers; obvious test addresses) and matches
    the established 835 fixture conventions.
  - **Known limitations after this phase** (deliberate v1 scope; none
    silent, verbatim segments remain on `tx.segments` for raw
    access):
    - Loop 2320/2330 Other Subscriber / Other Payer captured at the
      surface level only. Detailed CAS / OI / MOA inside Loop 2320
      deferred to Phase 9 (companion-guide profile system).
    - Loop 2420 service-line provider names captured verbatim on
      `serviceLine.providers`; per-provider PRV + address not yet
      typed at the line level.
    - CN1 contract information preserved verbatim on `tx.segments`,
      not typed onto the model.
    - Companion-guide enforcement (e.g. Availity's required `REF*EA`
      at the billing provider) deferred to Phase 9 (profile system).
    - 837 **builder** (`build837P` / `I` / `D`) deferred to Phase 8.
  - **Fixtures (10 synthetic).** Three Tier-1 canonical files (one per
    variant). Six Tier-2 quirk fixtures covering HL-orphan (parent id
    missing), unknown HI qualifier, patient HL (Loop 2000C with
    patient ≠ subscriber), institutional pay-to-plan (NM1\*PE),
    unknown variant (ST-03 outside snapshot), empty optionals (NTE /
    AMT / DTP with missing fields, 2320 SBR with empty payer-
    responsibility code), and one comprehensive fixture exercising
    every walker branch (pay-to-address, submitter PER + N3/N4/REF,
    subscriber DMG + REF + PER, 2310 rendering + referring providers,
    2320 other-subscriber + other-payer, 2410 LIN + CTP drug, 2430
    SVD + CAS + DTP adjudication).
  - **Tests.** 56 new tests across 4 new files: unit tests for the
    three Tier-1 variants + HL parent integrity + HI qualifier
    resolution; HI qualifier table unit tests (registry shape,
    diagnosis / procedure classification disjointness); HL hierarchy
    property tests (verbatim preservation, never-throw on every
    fixture); 837 byte-flip fuzz target (300 runs per fixture × 6
    claim fixtures = 1800 mutated inputs, never throws outside the
    four Tier-3 envelope fatals); comprehensive coverage tests
    exercising every walker branch on the comprehensive fixture +
    edge cases. **325 tests total** (up from 269).
  - **Coverage.** Verify gate green: typecheck + lint + format +
    coverage (96.91% stmts / 90.61% branches / 97.67% funcs / 98.49%
    lines globally; per-dir ≥90 on `parser/` + `loops/` +
    `transactions/` + `code-lists/`) + build + attw + verify:exports.
  - **`phi-scan` SKIP**, unchanged from Phase 4. The runtime H-PHI
    invariant is necessary but not sufficient; static fixture
    scanning is tracked as the `X12-PHI-SCAN` backlog follow-up.

### Changed

- **`parser/segment.ts` gains 6 element-read helpers** as Public API:
  `elementValue` / `elementOptional` / `componentOptional` /
  `elementDecimal` / `elementDecimalOrZero` / `collectElementValues`.
  Re-used by the 835 helper (`get835`) and the new 837 helper
  (`get837Claims`). Both walkers previously defined byte-identical
  copies of these inline. Additive; no breaking change.

- **`src/code-lists/` gains `hi-qualifiers.ts`** with `HI_QUALIFIERS`
  / `resolveHiQualifier` / `isDiagnosisQualifier` /
  `isProcedureQualifier` and the `X12HiCategory` / `X12HiCodeSystem`
  / `X12HiQualifier` types. Re-exported from `@cosyte/x12` root.

- **Phase 4: 835 Healthcare Claim Payment/Advice (ERA), TR3
  `005010X221A1`.** The cash-posting surface: money, the consultant ask.
  `get835(delimiters, tx)` walks a parsed 835 transaction set into the
  typed `X12Remittance` model: payment header (BPR), trace numbers (TRN),
  payer / payee parties (Loops 1000A / 1000B with address / contact /
  additional identifiers), every claim payment (Loop 2100: CLP plus
  patient / subscriber / service-provider NM1s, statement-period DTMs,
  CAS adjustments at both claim and service-line scope, MIA / MOA / LQ
  remarks, REF / AMT supplemental amounts), every service line (Loop
  2110: SVC with HCPCS / CPT / NDC / revenue-code / modifier
  destructuring, service-date DTMs, line-level CAS / REF / AMT / LQ),
  and provider-level adjustments (PLB with multi-pair flattening). The
  loop hierarchy ships as three frozen `LoopSpec` artifacts
  (`REMIT_835_LOOP_2000`, `REMIT_835_LOOP_2100`, `REMIT_835_LOOP_2110`)
  authored through the public `defineLoopSpec()` API, the **dogfooding
  gate** locked in Phase 2. Two payer-side loop specs (1000A / 1000B)
  also ship as introspection artifacts.
  - **Money discipline.** All monetary fields decode as the new
    `X12Decimal` (`src/decimal.ts`): a string-backed decimal type with
    `BigInt`-exact arithmetic. **NEVER `parseFloat`**: float
    representation silently destroys cents at scale; on an 835 a dropped
    decimal is the wrong dollar amount in someone's cash post.
    `X12Decimal` preserves the inbound lexical form for byte-exact
    round-trip (`X12Decimal.fromString("0050.00").toString()` →
    `"0050.00"`), exposes mathematical equality across scales
    (`"0.00".equals("0")` → true), and ships `add` / `subtract` /
    `compareTo` / `abs` / `negate` / `signum` / `isZero` plus a lossy
    `toNumber()` whose JSDoc warns about precision loss. `fromBigInt(value,
scale)` renders canonically with zero-padded fractions; the canonical
    `X12Decimal.ZERO` is the additive identity. Empty inbound element →
    `undefined` (not zero): "not supplied" and "zero dollars" are
    spec-distinct.
  - **Balance invariants (per TR3 X221A1 §1.10.2: "Balancing the 835").**
    Three checks run after the walk and emit
    `X12_835_REMIT_BALANCE_MISMATCH` on mismatch. The model is **NEVER
    silently rebalanced**: 1. Line: `SVC-02 === SVC-03 + Σ(line CAS)` per Loop 2110. 2. Claim: `CLP-03 === CLP-04 + Σ(all CAS in claim, claim AND line
level)`, the X12 spec balance. CLP-05 (patient responsibility)
    is informational, NOT part of the balance equation. The
    implementation matches the TR3 §1.10.2 text directly; an earlier
    roadmap sketch (`operations/roadmaps/x12.md` §4) used a slightly
    different decomposition. `src/transactions/remit/balance.ts`
    documents the divergence so the contract stays consistent. 3. Top-of-remit: `BPR-02 === Σ(CLP-04) - Σ(PLB amounts)`. PLB
    amounts are stored with the **raw EDI sign** (positive = take-back
    from provider; negative = credit to provider), so the equation
    _subtracts_ PLB to balance.
    Warning messages echo only the invariant label and `X12Decimal`
    decimal text, never patient identifiers, member ids, or account
    numbers (H-PHI invariant).
  - **CAS triple flattening.** A single CAS segment can carry up to 6
    `(reason, amount, quantity)` triples under one `CAS-01` group code;
    the walker flattens them into individual `X12RemitAdjustment`
    entries. Different group codes (CO / PR / OA / PI) require separate
    CAS segments (they cannot mix inside one) and the decoder honors
    that contract.
  - **Bundled WPC + X12-internal code-list snapshots** (initial
    subsets, pre-launch). Versioned data artifacts at
    `src/code-lists/`; the Phase 10 `pnpm refresh:code-lists` script
    will regen the full lists from canonical sources for the first real
    publish. Each snapshot ships `meta.id` / `meta.snapshotDate` /
    `meta.publishedDate` / `meta.source` so consumers can decide
    whether a stale description matters. Helpers `lookupCarc(code)` /
    `lookupRarc(code)` / `lookupClpStatus(code)` return `{ code,
description }` for known codes, `undefined` otherwise; unknown
    codes preserve the verbatim value on the parsed adjustment AND
    emit `X12_UNKNOWN_CARC` / `X12_UNKNOWN_RARC`. - `CARC` (Claim Adjustment Reason Codes): ~30 most commonly
    observed codes (WPC, snapshotDate 2026-06-27). - `RARC` (Remittance Advice Remark Codes): ~15 most commonly
    observed codes covering both `M`- and `N`-prefix conventions
    (WPC, snapshotDate 2026-06-27). - `CLP_STATUS` (CLP-02 Claim Status Code, X12 Code Source 65):
    10 dispositions (1 Processed as Primary, 4 Denied, 22 Reversal,
    …). X12-internal list, stable. - `CLAIM_ADJUSTMENT_GROUP_CODES`: the spec-fixed 4 values
    (`CO` / `PR` / `OA` / `PI`) as a frozen literal-union map,
    not a snapshot (this list never grows). `isClaimAdjustmentGroupCode`
    narrows inbound strings.
  - **Public-surface additions** to the warning / fatal stability
    snapshot: `X12_835_REMIT_BALANCE_MISMATCH`,
    `X12_UNKNOWN_CARC`, `X12_UNKNOWN_RARC` (10 → 13 Tier-2 codes;
    additions-only, fatal registry stays at 4). New warning factories
    `remitBalanceMismatch` / `unknownCarc` / `unknownRarc` carry the
    shape-validated echo discipline (CARC / RARC echoes pass
    `/^[A-Z0-9]{1,5}$/u` or collapse to `(non-spec)`).
  - **PHI discipline (H-PHI invariant holds suite-wide).** Warning
    messages never echo field VALUES, only positional context, the
    invariant label, the shape-validated CARC / RARC code, or numeric
    X12Decimal text. Patient names, member ids, NPIs, payer claim
    control numbers, and account numbers are held verbatim on the
    parsed model (consumer-redaction boundary, mirroring hl7's H-PHI
    posture) but never routed through warnings or errors. Every fixture
    is synthetic (Greek-letter patient names, `MEMBER-*` member ids,
    repetitive-digit NPIs); `phi-redaction-review` passed at commit time.
  - **Six fixtures under `test/fixtures/remit/`.** Five Tier-1
    synthetic spec-clean (`835-medicare-canonical.edi`,
    `835-multi-claim.edi`, `835-with-plb.edi`,
    `835-carc-rarc-mix.edi`, `835-imbalance.edi`) and one Tier-2
    synthetic quirk shape (`835-availity-quirk.edi`: REF*2U + REF*F8
    placements). The imbalance fixture is deliberately off-by-$10 to
    prove the balance warning fires and the model preserves the
    verbatim amounts.
  - **Property tests.** `decimal.property.test.ts` locks lexical
    round-trip + additive identity + commutativity + subtraction-by-
    addition + negation involution + sign-consistency invariants (over
    500 runs each). `remit-835-balance.property.test.ts` synthesizes
    balanced and deliberately-imbalanced single-line claims and asserts
    the balance warning fires iff out of balance (100 + 50 runs).
    `remit-835-fuzz.property.test.ts` byte-flips every committed
    fixture 300 times per fixture and asserts `get835` never throws
    outside the 4 Tier-3 fatals, the byte-level fuzz target the
    roadmap calls for.
  - **Coverage gates expanded** to per-directory ≥90 on `parser/`,
    `loops/`, `transactions/`, `code-lists/`. Phase 4 lands the gate
    at **97.7% statements / 91.97% branches / 99.24% functions /
    99.38% lines** globally.
  - **Spec traceability:** TR3 `005010X221A1` for the 835 itself; X12
    Code Source 65 for CLP-02; WPC public-domain lists for CARC / RARC;
    X12 Data Element 1033 for the Claim Adjustment Group Code.
  - **Known limitations after Phase 4:** no 835 _building_ yet (that's
    Phase 8: round-trip + spec-clean serializer + builder); the
    bundled CARC / RARC are an **initial subset** (`pnpm
refresh:code-lists` arrives in Phase 10); no per-payer profile
    yet (Phase 9); CPT / ICD-10 / NDC descriptions are deliberately
    NOT bundled (license-gated, see `operations/roadmaps/x12.md` §5);
    `X12Decimal` does not yet expose multiply / divide (no balance
    invariant needs them in v1). `phi-scan` script not yet wired for
    x12. The H-PHI property tests provide runtime coverage; an
    explicit pre-commit phi-scan ships in a future slice (tracked in
    `operations/prompts/x12-phi-scan.md`).

- **Phase 3: 999 + TA1 acknowledgments (TR3 005010X231A1).** Two
  pure-function ack surfaces ship side-by-side; neither auto-sends, opens
  a socket, or touches the filesystem. The cosyte ack archetype: the
  library MECHANICALLY builds the disposition it is told and REFUSES to
  fabricate an Accept against a non-empty error list. Mirrors hl7's
  upcoming `buildAck` boundary and mllp's commit-contract pattern.
  - **999 (Implementation Acknowledgment): TR3 005010X231A1.**
    `parse999(raw, opts?)` decodes the AK1 → AK2 → (IK3 [→ CTX] (IK4 [→
    CTX])\*)\* → IK5 → AK9 hierarchy into the typed `X12Ack999`. Standard
    X12 / pre-X231A1 legacy senders that emit `AK3`/`AK4`/`AK5` instead
    of `IK3`/`IK4`/`IK5` are lenient-accepted on parse (normalized onto
    the X231A1 names) per Postel's Law; `build999` always emits the
    X231A1 names. `build999(spec)` assembles a complete `X12Interchange`
    wrapping a single ISA → GS → ST..SE → GE → IEA with one 999 inside,
    spec-clean and round-trippable through `parseX12`.
  - **TA1 (Interchange Acknowledgment): ASC X12 standard, envelope
    level.** The Phase 1 envelope walker now captures envelope-level
    TA1 segments verbatim onto `X12Interchange.ta1Segments`. TA1
    between ISA and the first GS (the canonical position) is recognized
    as spec-conformant and NO `X12_UNEXPECTED_SEGMENT` warning fires;
    a TA1 inside an open functional group is still flagged as unexpected
    (non-spec). `parseTA1(interchange)` returns the typed `X12AckTA1`
    for the first captured TA1 (or `undefined`). `buildTA1(spec)` emits
    a fixed-position 5-element `Ta1Segment` (`TA101`–`TA105`). Caller
    wraps it in their preferred envelope. Both standalone TA1-only
    interchanges (ISA → TA1 → IEA, no GS) and embedded TA1s round-trip.
  - **Safety guards (refused via `AckBuildError`):** `build999` refuses
    a functional `AK9-01 = 'A'` paired with any per-transaction non-`A`
    response OR any error payload anywhere
    (`X12_ACK_ACCEPT_WITH_ERRORS`); refuses internally inconsistent AK9
    counts (`0 ≤ accepted ≤ received ≤ declared`,
    `responses.length == received`, ≤ 5 syntax error codes on IK5/AK9)
    (`X12_ACK_COUNT_MISMATCH`); refuses an ISA-13 longer than 9 chars
    (`X12_ACK_INVALID_SPEC`). `buildTA1` refuses `TA1-04 = 'A'` paired
    with a non-`000` TA1-05 note code (`X12_TA1_ACCEPT_WITH_NOTE`).
    Four stable `ACK_BUILD_ERROR_CODES` typed as `AckBuildErrorCode`
    discriminate the cases.
  - **Public code-list registries:** `X12_ACK_DISPOSITION_CODES`
    (code list 715: `A`/`E`/`P`/`R`/`M`/`W`/`X`),
    `IK3_SYNTAX_ERROR_CODES` (code list 716, 13 codes),
    `IK4_SYNTAX_ERROR_CODES` (code list 723, 18 codes),
    `TA1_ACK_CODES` (code list I13: `A`/`E`/`R`),
    `TA1_NOTE_CODES` (code list I18: `000`–`028`). String-literal
    unions are exported for exhaustive narrowing. The helper
    `isAcceptDisposition(code)` returns true for `A`/`E`/`P` and false
    for the four reject codes.
  - **PHI discipline (acks are structurally PHI-free by design):**
    Control numbers, segment IDs, position counters, and structural
    error codes ONLY. The one variable-shape surface that COULD carry
    PHI, `IK4-04` (`copyOfBadDataElement`), is documented on both the
    parsed-model type AND the build-spec type as a caller-supplied
    field that callers SHOULD omit when the offending bytes are PHI.
    The library NEVER auto-populates `IK4-04`. Error messages
    interpolate only control numbers, disposition codes, and count
    integers; no PHI-shape paths. The `phi-redaction-review` crew gate
    passed at commit time; locked `999: PHI safety` and `TA1: PHI
safety` test blocks assert no SSN / ISO-date / long-digit-run
    shapes appear in built output.
  - **Three Tier-1 999 fixtures** (`999-accept.edi`,
    `999-accept-with-errors.edi`,
    `999-reject-control-number-mismatch.edi`) and **three Tier-1 TA1
    fixtures** (`ta1-accept.edi`, `ta1-accept-with-errors.edi`,
    `ta1-reject-control-mismatch.edi`). All synthetic, no PHI.
  - **Property tests:** `parse999(build999(spec))` round-trips
    dispositions, counts, and AK1 echo on every clean accept (200
    runs); functional `A` + any non-`A` per-transaction disposition
    throws `AckBuildError` with code `X12_ACK_ACCEPT_WITH_ERRORS` (100
    runs); functional `A` + non-empty AK9 syntax error codes throws the
    same code (100 runs). Locks the Phase 3 safety invariant.
  - **Public-surface additions** to the warning / fatal stability
    snapshot: `Ta1Segment` type on the envelope-level surface;
    `X12Interchange.ta1Segments: readonly Ta1Segment[]` (additive, no
    rename); no new entries to `WARNING_CODES` or `FATAL_CODES`
    (Phase 3 keeps both registries at the Phase-2-locked sizes of 10
    and 4, additions-only thereafter).
  - **Spec traceability:** TR3 `005010X231A1` (999); ASC X12 standard §
    TA1 Interchange Acknowledgment; code lists 715 / 716 / 723 / I13 / I18.
  - **Known limitations after Phase 3:** Acks reference STRUCTURAL
    errors only. They cannot report semantic / payment errors (those
    live in `277CA` Phase 6 / `835` Phase 4). No multi-TA1 fan-out
    helper (consumers iterate `ta1Segments` directly when more than
    one inbound interchange is being acknowledged). The 999
    transaction-set surface does not yet expose a public Loop-spec
    artifact. Phase 3 hand-walks the AK1/AK2/IK3/IK4/IK5/AK9 hierarchy
    in `parse-999.ts`; the dogfooding gate for `defineLoopSpec` lands
    fully with Phase 4's 835 + Phase 5's 837 work.

- **Phase 2. Syntactic core: segment / element / composite / repetition
  decode + warning registry + `defineLoopSpec`.** Every body segment inside
  a transaction is now decoded into an immutable `X12Segment` carrying its
  id, raw text, and 1-indexed element array. The verbatim source survives
  on `X12TransactionSet.rawSegments` so a byte-exact round-trip is still
  achievable independently of any downstream consumer's reads.
  - **`?`-release-character escape** (`?~` → literal `~`, `?*` → literal
    `*`, `?:` → literal `:`, `?^` → literal `^`, `??` → literal `?`)
    implemented in `unescapeRelease` / `escapeRelease` / `splitWithRelease`
    (zero-dep, single-pass). Pair has a lossless round-trip property:
    `unescapeRelease(escapeRelease(v, d), d) === v` for any value `v` and
    any 4-distinct-delimiter set `d` (500 fast-check runs). An unpaired
    trailing `?` is preserved verbatim AND warned as
    `X12_DANGLING_RELEASE_CHAR`; a `?` followed by a non-delimiter is
    preserved verbatim with no warning (Postel's Law).
  - **Dot-path traversal**: `getSegmentValue(seg, "03-1")` resolves
    composite sub-element 1 of element 3 (both 1-indexed, matching TR3);
    `"03[2]"` resolves the 3rd repetition (0-indexed); `"03[2]-1"` combines
    them. Returns `undefined` for out-of-range paths, throws `TypeError`
    only on malformed path strings (consumer bug). `getAllSegmentValues`
    returns every repetition (or every Nth component) as `readonly string[]`.
  - **Public `defineLoopSpec()` API** for TR3 loop authoring, ships with
    structural validation + a typed `LoopSpecDefinitionError`. Phase 3+
    transaction extractors author their built-in 999 / TA1 / 835 / 837
    loops through the SAME public API consumers use for payer-specific
    loops, the dogfooding gate locked in `documentation/repos/x12.md`.
  - **Warning registry expanded 8 → 10** (additions-only):
    `X12_DANGLING_RELEASE_CHAR` (unpaired `?` at element/segment end;
    bytes are preserved on the parent element) and
    `X12_UNEXPECTED_SEGMENT` (a `GE` with no open `GS`, `SE` with no open
    `ST`, body segment outside any `ST..SE`, cases the Phase 1 walker
    dropped silently). The PUBLIC `WARNING_CODES` snapshot test is the
    breaking-change tripwire: renaming a code is breaking, additions
    are not.
  - **PHI discipline (mirrors hl7's H-PHI invariant):**
    `X12_UNEXPECTED_SEGMENT` SHAPE-VALIDATES the echoed segment id
    against `/^[A-Z][A-Z0-9]{1,2}$/u` and substitutes the literal
    `(non-spec)` for anything else, so hostile input that puts PHI in
    the first slot of a malformed "segment" never has those bytes
    echoed into a warning message. The bytes themselves are preserved
    on the parent container so consumers that want to inspect them can.
  - **Tier-1 fixture** (`syntactic-core-body.edi`) exercises every Phase 2
    surface end-to-end: composites (`HI*ABK:J45.50`), repetitions
    (`EQ*30^35^88`), `?`-release-character escape (`REF*EA*ID?*WITH?*STAR`),
    and straight-element segments (BHT, NM1). Real-world synthetic, no
    PHI. Parses with zero warnings.
  - **Properties:** release-escape round-trip (any value, any delimiters),
    escapeRelease output is fully decodable as `?<reserved>` pairs +
    non-reserved bytes (500 runs each), and a streaming-decode invariant
    (parser output is independent of input chunking, locks the v2
    streaming surface as a non-breaking future addition).
  - **`X12TransactionSet.segments` shape changed** from
    `readonly string[]` to `readonly X12Segment[]`; the raw form moves to
    `X12TransactionSet.rawSegments`. **Pre-alpha `0.0.x` consumers should
    migrate.** Library-internal change; no impact on `ix.warnings`,
    `ix.delimiters`, or the envelope-level accessors.

- **Phase 1: envelope decoder.** `parseX12()` decodes the ISA / GS / GE / IEA
  interchange envelope from a raw `string` or `Buffer`, detecting all four
  delimiters (`element` byte 4, `repetition` ISA-11, `component` ISA-16,
  `segment` post-ISA-16) from fixed positions inside the ISA itself. The parser
  NEVER assumes a delimiter. Transaction-set bodies inside each ST..SE are kept
  opaque at this phase (raw segment strings, terminator stripped); Phase 2 adds
  segment / element / composite / repetition decode on top.
  - 4 Tier-3 fatal codes (locked, additions-only thereafter): `X12_EMPTY_INPUT`,
    `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`.
  - 8 Tier-2 warning codes (additions-only): `X12_PRE_005010`,
    `X12_CONTROL_NUMBER_MISMATCH` (ISA-13↔IEA-02, GS-06↔GE-02, ST-02↔SE-02),
    `X12_GROUP_COUNT_MISMATCH`, `X12_TRANSACTION_COUNT_MISMATCH`,
    `X12_MISSING_IEA`, `X12_MISSING_GE`, `X12_MISSING_SE`, `X12_TRAILING_GARBAGE`
    (with verbatim `trailingBytes` preserved on the returned interchange).
  - `X12ParseError` carries `code`, `position` (interchange/group/transaction/
    segment/element indices), and a bounded `snippet` (≤ 64 chars) that is the
    documented consumer-redaction boundary. Warning messages NEVER echo field
    values. They carry positional context plus bounded metadata (counts,
    control-number pairs), mirroring the hl7 H-PHI invariant.
  - Strict mode (`parseX12(raw, { strict: true })`) escalates the first Tier-2
    warning into a thrown `X12ParseError` carrying the warning code.
  - 4 Tier-1 envelope fixtures committed under `test/fixtures/envelope/`
    (canonical Medicare `*^:~`, Availity `^` repetition, BCBS `\` sub-element,
    no-trailing-CRLF). Plus property tests (lenient never throws outside the 4
    fatals, round-trip ISA byte-exact preservation), warning-codes snapshot,
    and a byte-flip envelope fuzz target.
  - Per-directory ≥90 coverage gate armed on `src/parser/` (current: 100%
    statements / 98.75% branches / 100% functions / 100% lines).

### Changed

- Inherits `@cosyte/test-utils` and `fast-check` as devDependencies. The
  conformance-kit runners (`lenientNeverThrowsProperty`) and the property/fuzz
  arbitraries land alongside the Phase 1 envelope code.

### Previously

- Initial repo scaffolding: package metadata, dual ESM + CJS build via `tsup`,
  strict TypeScript, type-checked ESLint with a JSDoc/`@example` gate on public
  exports, Prettier, and Vitest.

### Changed

- Migrated onto the shared cosyte engineering standard (Phase E). The toolchain
  is now inherited from the published `@cosyte/*` config packages instead of
  per-repo copies: `tsup.config.ts` uses `cosyteTsup`, `vitest.config.ts` uses
  `cosyteVitest`, and `eslint.config.js` is the three-line `cosyte` wrapper.
  Bumped to ESLint 10, Vitest 4 (+ `@vitest/coverage-v8` 4), Vite 7, and
  `@types/node` 22; added `@arethetypeswrong/cli` with an `attw --pack .` gate
  wired into `prepublishOnly`. CI and release are now thin callers of the
  reusable `cosyte/.github` workflows (the shared pipeline runs the Node 22 + 24
  matrix). The shared `@cosyte/tsconfig` base sets `verbatimModuleSyntax: false`.
- Removed `.github/dependabot.yml`; org-wide dependency updates will be handled
  by Renovate when it is rolled out.

# Known limitations & non-goals

`@cosyte/x12` is built to be **correct and honest about its edges** rather than to claim more than it
delivers. Misreading a payer's remittance, a claim's diagnosis, or a member's coverage can cause real
financial or clinical harm, so this is the deliberate "do not over-trust" list. Everything here is a
documented, intentional boundary, not a bug. The lenient parser never silently drops or garbles a
**decoded value**: where a limitation applies, the raw value is preserved (often with a warning), it
is simply not further decoded. Three things it does discard are worth reading before you rely on a
round trip, and all three are **silent**: **line breaks between segments**, **a doubled segment
terminator** outside a transaction, and **a segment whose first element is empty** outside a
transaction. All three are in the first two entries below. A **segment outside a transaction** used
to belong on that list and no longer does: it is warned, kept on the model at `ix.orphanSegments`,
**and re-emitted at the structural anchor the walker recorded**, so it survives a round trip. The
empty-first-element case is now the sharpest of the three: no warning, and no copy anywhere on the
model.

## Data / decode boundaries

- **🩺 An unparseable decimal still lands on the model as a stand-in; what changed is that it warns.**
  A decimal element that is present and that this library cannot decode as a decimal (`1,234.56`,
  `$450.00`, `N/A`) yields no value, and the reader has to put something in its place: a slot typed
  `X12Decimal` gets `X12Decimal.ZERO`, an optional slot gets `undefined`, and some rows are dropped
  whole. **Every one of those outcomes now emits `X12_UNPARSEABLE_DECIMAL` at the failing
  `position.elementIndex`, because the warning is a property of the READ rather than of what the
  reader then does with it. No outcome is otherwise changed.** No list of the outcomes is published
  here, on purpose: a first draft enumerated three and a review measured a fourth, and the rule is
  what holds, not the census. So a consumer that reads only the model, and never looks at
  `.warnings`, sees exactly what it saw before: a `0` where the payer sent something unreadable.
  **That is the residual, stated plainly.** Closing it further means changing every `X12Decimal`
  model slot to `X12Decimal | undefined`, which is a breaking model change and is deliberately not in
  this slice. Gate on the warning, or read `readElementDecimal` yourself.

  Three scoping facts that are easy to get wrong in the other direction:
  - **An ABSENT element does not warn.** "Missing means zero" is the documented convention of the
    slots that use `elementDecimalOrZero` and is unchanged.
  - **🩺 That does NOT make an unwarned `0` trustworthy in general, and this is the one inversion to
    refuse.** The warning is a property of a decimal READ, not a property of a model slot. A slot
    the reader never read at all cannot warn, and it still holds whatever the accumulator was seeded
    with. **What this guarantees is narrower and exact: an unwarned `0` AT AN ELEMENT A READER
    DECODED is a zero the sender sent or omitted.** The known slot of the other kind, an 837 service
    line whose `SVx` never decoded, is covered by a warning of its own (next entry) rather than by
    this one. **No census of never-read slots is published**, on purpose: the rule is what holds.
  - **The public helpers are silent without a sink.** `elementDecimal` / `elementDecimalOrZero` take
    an optional 4th `X12DecimalWarningSink`. Every reader inside this library passes one, and a
    source scan in `test/parser-decimal-silent-defaults.test.ts` keeps it that way. **A consumer
    calling them directly and omitting it gets the old silent behaviour**, which is deliberate: it
    keeps the existing signature working. `readElementDecimal` is the sink-free way to get the
    distinction in-band.
  - **The scan is a syntactic tripwire, not a proof.** It counts the arguments of every
    `elementDecimal` / `elementDecimalOrZero` call under `src/transactions/` after stripping
    comments. It says nothing about a decimal decoded some other way, and no exhaustive census of
    such routes is published here, on purpose.

- **🩺 An 837 service line whose `SVx` never decoded still ships with `charge` and `units` at `0`;
  what changed is that it warns.** `get837Claims` resolves ONE variant for the submission, from the
  caller's `type` option, else ST-03's implementation-convention reference, else the first `SVx`
  segment present. A Loop 2400 line is then decoded only by the `SV1` / `SV2` / `SV3` that matches
  that variant. When none arrives, because the line carries an `SVx` for a different variant (an
  ST-03 of `005010X222A2` on a file whose lines are `SV2`, or a `{ type: "P" }` over the same) or
  because it carries no `SVx` at all, **nothing on the service segment is read**: the line's
  `charge` and `units` hold the accumulator's seeded `X12Decimal.ZERO`, and its procedure code,
  modifiers, unit of measure and place of service are equally undecoded. **That line now emits
  `X12_837_SERVICE_LINE_NOT_DECODED`, anchored at the `LX` that opened it.** Read the values off
  `tx.segments[…].raw` and decide which of the two disagreeing signals the sender meant.
  - **Ignoring the foreign `SVx` is deliberate and is not the limitation.** `SV1-02` and `SV2-03`
    are both the line charge, so decoding an `SV2` into a Professional line would mis-read money.
    Refusing to read is the safe half; doing it silently was the defect.
  - **The model is unchanged.** `charge` and `units` are still typed `X12Decimal`, so the stand-in
    `0` is still what a consumer that never reads `.warnings` sees. Making them
    `X12Decimal | undefined` is a breaking model change and is deliberately not in this slice.
  - **The line is still retained, and so are the bytes.** Nothing is dropped: the service line is
    on the claim, and every segment, decoded or not, stays verbatim on `tx.segments`.
  - **Neither cause is attributed to the sender.** A `type` option that disagrees with a perfectly
    conformant document produces the same warning as a document that disagrees with itself, and the
    library does not decide which side is wrong. A line with no `SVx` at all is short a Loop 2400
    segment the 837 TR3s require, but that judgement is yours to make from the bytes.
  - **An unresolvable variant is a different case, and it no longer goes unreported.** With no
    `type`, an ST-03 that resolves to no known variant **and no `SVx` anywhere in the transaction to
    fall back on**, no service line is opened and no `0` is fabricated on any line slot. That raises
    `X12_837_UNKNOWN_VARIANT` for the submission, and now also
    `X12_837_SERVICE_LINE_DROPPED` at each `LX` that consequently opened nothing - so the missing
    lines are reported per line and not inferred from a count. The earlier warning here, that the
    lookup was a plain object literal and its absence therefore proved nothing, is **withdrawn: that
    hole is closed** (see the next entry). Checking `submission.variant` against the set you expect
    is still worth doing, as a cheap assertion rather than as a defence.

- **🩺 An 837 `LX` that opens no Loop 2400 at all raises `X12_837_SERVICE_LINE_DROPPED`, the 25th
  Tier-2 warning code.** Distinct from `X12_837_SERVICE_LINE_NOT_DECODED` above, where the line IS
  on the model and only its service segment went unread: here the line reaches **no claim's**
  `serviceLines`, so its charge, units, procedure code and modifiers are read into nothing. Two
  causes: no Loop 2300 (`CLM`) is open at that `LX`, or the submission's variant is not one of
  `P` / `I` / `D`. Nothing is fabricated to stand in and no claim is synthesized; the segments stay
  verbatim on `tx.segments`. **Do not read an empty `serviceLines` as "the claim had no service
  lines" without checking the warning channel.** Three bounds on that code, each measured:
  - **It does not travel with `X12_837_UNKNOWN_VARIANT`.** A caller-supplied `type` outside
    `"P" | "I" | "D"` - which only a JavaScript or `JSON.parse`d caller can pass - reaches the second
    cause with no unknown-variant warning at all. Read `submission.variant`, not the other code.
  - **What becomes of a line-level `DTP` / `AMT` / `NTE` / `REF` after a dropped `LX` depends on
    the route, and is not simply "absent" on either. This is the only surface that states both,
    deliberately: two drafts stated it unqualified, in opposite directions, and both were wrong.**
    With a `CLM` open (the variant route), the line service date, amount and note land among the
    **claim-level** ones, indistinguishable from them. With **no** `CLM` open, the `DTP`, `AMT` and
    `NTE` are **discarded** and a trailing `REF` attaches to whichever party the last `NM1` left
    active, so a line-item control number can land on an entity's `references` - measured, in a
    _later_ claim's payer. Both are pre-existing walker behaviour, unchanged here and pinned by
    tests; the `REF` mis-attribution is owed its own item. **Read the segments off
    `tx.segments[…].raw` rather than inferring either outcome.**
  - **An `SVx` with no `LX` at all is still dropped in SILENCE.** The code is anchored at the `LX`,
    so a service segment that never had one reports nothing on any channel. `PRE-EXISTING`,
    identical at `0.0.9`, disclosed and not fixed. **The warning channel is therefore not a complete
    account of every way a service line can go missing.**

- **🩺 Through `0.0.9`, a lookup keyed by document bytes could be defeated by a key inherited from
  `Object.prototype`, and the affected code paths reported nothing.** The bundled code lists, the
  837's variant resolution, and the 837's HL parent-level map were built as plain object literals,
  which inherit `Object.prototype`. An inbound value matching **any own property of
  `Object.prototype`** therefore resolved TRUTHY. That set is engine- and version-dependent and is
  deliberately not enumerated here: on the Node 22 this package targets it is twelve members, and a
  draft of this entry listed eight. `Object.freeze` did not help: it seals the own properties and
  changes nothing about the prototype chain. Concretely, at `0.0.9`:
  - An ST-03 of `constructor` made `submission.variant` a **function**, suppressed
    `X12_837_UNKNOWN_VARIANT`, and took **every Loop 2400 off the model** with `warnings: []`.
  - `lookupCarc("constructor")` answered a `CodeListEntry` whose `description`, typed `string`, was
    a function, and suppressed `X12_UNKNOWN_CARC`. The same held for the other bundled lists.
  - An HI qualifier of `constructor` suppressed `X12_UNKNOWN_HI_QUALIFIER` while still landing the
    code with `codeSystem: "unknown"`.
  - An HL-03 of `constructor` raised `X12_HL_PARENT_LEVEL_INVALID` against a level the walker has
    no expectation for - a structural violation the document never made.
  - `isClaimAdjustmentGroupCode("constructor")` answered `true` and narrowed the type. It used the
    `in` operator, which **walks the prototype chain**; `in` is the safe-looking form and is not
    the safe form.

  Every one of these now behaves exactly as it does for any other unrecognized value. The 271 / 277
  / 278 readers were never exposed: their `EXPECTED_PARENT_LEVEL` tables have the same literal shape
  but are read only through `src/transactions/shared/hl.ts`, which has always guarded with
  `hasOwnProperty`. **What is not claimed:** there is no source-level scan enforcing this shape. A
  syntactic scan cannot tell a table keyed by document bytes from one keyed by a library-owned
  discriminant, and the message registries in `src/parser/warnings.ts` are legitimately the latter,
  so such a scan would need a per-table allowlist. The defence is behavioural instead: the suite
  derives its key list from `Object.getOwnPropertyNames(Object.prototype)` at run time, so a future
  engine adding an inherited member widens it without anyone editing a list.

- **🩺 BREAKING, in the release after `0.0.9`: the 835 Loop 2110 SVC element map was off by one, in
  BOTH directions, and is corrected.** Through `0.0.9` `get835` read the revenue code from **SVC-05**
  and the paid units from **SVC-07**, and `build835` wrote them to the same two places while leaving
  SVC-04 empty. The correct map, which the repo's own 277 modules already used:

  | Element | X12 element                        | Meaning                             |
  | ------- | ---------------------------------- | ----------------------------------- |
  | SVC-04  | 234, Product/Service ID (a string) | NUBC revenue code                   |
  | SVC-05  | 380, Quantity                      | Units of Service **Paid** Count     |
  | SVC-06  | C003 composite                     | original / submitted procedure      |
  | SVC-07  | 380, Quantity                      | **Original** Units of Service Count |

  **What changes for you.** On parse, `serviceLine.revenueCode` now comes from SVC-04 and is
  `undefined` on a professional line; through `0.0.9` it returned whatever sat in SVC-05, which on a
  conformant 835 is the paid-unit count - measured across all six committed remit fixtures plus the
  golden, **8 of 8 service lines returned `revenueCode: "1"`, which is not a valid NUBC revenue
  code**, while `paidUnitsOfService` came back `undefined`. `serviceLine.paidUnitsOfService` now
  comes from SVC-05; through `0.0.9` it read SVC-07, which is the _submitted_ count, so where a payer
  sent both the field named "paid" carried the original. **`serviceLine.originalUnitsOfService` is
  new** and carries SVC-07; without it the corrected map would have made SVC-07 unread, turning a
  fixed mis-read into a fresh silent drop. On emit, the same three fields move to the same three
  places: `build835` with a revenue code `0300` and 2 paid units emitted
  `SVC*HC:99213*600.00*550.00**0300*HC:99212*2` at `0.0.9` and emits
  `SVC*HC:99213*600.00*550.00*0300*2*HC:99212` now. **The old bytes put a revenue code in a Quantity
  element**, so a conformant receiver read `0300` as 300 units of service.

  **If you compensated for the old behaviour** - reading `paidUnitsOfService` off `revenueCode`, or
  writing the revenue code into `paidUnitsOfService` - that workaround must be removed. Code that
  only round-tripped through this library saw nothing wrong, because both halves were wrong together.

  **Sources, and what was NOT read. The TR3 005010X221A1 itself is a paid X12 document; nobody here
  has read it.** Sources 1, 2 and 4 below are free to check and are linked; source 3 is a paid X12
  document, named rather than linked, and every fact taken from it is independently carried by
  source 1 anyway. Read the qualifiers literally, because an unsourced assertion about this table
  baked into a code comment is exactly what shipped the defect:
  1. **The full X221A1 element table**, from [pyx12](https://github.com/azoner/pyx12)'s
     machine-readable map `pyx12/map/835.5010.X221.A1.xml` - an independent open-source
     implementation of this same guide: `SVC04 / 234 / "National Uniform Billing Committee Revenue
Code"`, `SVC05 / 380 / "Units of Service Paid Count"`, `SVC06 / C003`,
     `SVC07 / 380 / "Original Units of Service Count"`. **This is the source for SVC-04**, and the
     only one here that carries the whole map.
  2. **X12's own [RFI #2163](https://x12.org/resources/requests-for-interpretation/rfi-2163-835-svc05-vs-837-svd05)**,
     which names "the SVC05 'Units of Service Paid Count/Quantity' in the 835 guide" and states that
     "a default has been included for SVC05 in guide 005010X221A1". Primary, from X12, naming the
     guide - but it speaks only to SVC-05.
  3. **The base X12 005010 SVC element dictionary**: SVC-04 is element 234, a string, and SVC-05 and
     SVC-07 are both element 380, Quantity. This does not say what SVC-04 carries, but it **rules
     out a revenue code at SVC-05** on type alone.
  4. **Published payer companion guides implementing X221A1** ([Florida Health Care
     Plans](https://www.fhcp.com/documents/edi-forms/Florida-Health-Care-Plans-835.pdf) p.44 gives
     all three names; [South Dakota
     Medicaid](https://dss.sd.gov/docs/medicaid/providers/billingmanuals/HIPAA/835_Healthcare_Payment.pdf)
     p.9 gives SVC-04 and SVC-05).

  **Agreement inside this repo is NOT one of the sources.** The 277 modules use SVC-04 and every
  committed 835 fixture is written to the map above, which is corroborating and was what surfaced
  the defect - but checking a spec claim against this repo's own implementation only proves the two
  agree, which is precisely how the wrong map survived.

  **An absent SVC-05 is NOT defaulted to one.** X221A1 is reported to assume the value is one when
  not present - that is source 2's Description, quoted secondhand, not a clause read from the TR3.
  This reader leaves `paidUnitsOfService` `undefined` regardless, because fabricating a count the
  sender did not send is inventing data.

  **`undefined` on either quantity still means "not decoded", not "absent".** The element may have
  been missing, or present and unparseable as a decimal; the two share one `undefined` on the model.
  They no longer share a silence: as of `X12-QUANTITY-SILENT-DEFAULTS` the unparseable case raises
  `X12_UNPARSEABLE_DECIMAL` at that `position.elementIndex` and the absent case raises nothing, so a
  warning at the element is what tells them apart. The verbatim element is still on `tx.segments`.

  **If you archived 835s this library EMITTED at `0.0.9` or earlier, they are non-conformant on the
  wire and should be re-emitted.** Their revenue code sits in SVC-05, so this library now reads it
  back as a paid quantity (`0300` becomes 300 units) and reports no revenue code, silently and with
  no warning. Re-emitting from the model with this release produces conformant bytes.

  **The 277's SVC-07 (Units of Service Count) is still not decoded** - pre-existing, unchanged by
  this slice, and separate from the 835 field above.

- **Bundled code-list snapshots are pre-launch initial subsets, not the full WPC-published lists.**
  CARC, RARC, Claim-Status-Category (CSCC), Claim-Status (CSC), service-type, CLP-status, and
  maintenance-type ship as versioned data artifacts sized to the parser's Tier-1/Tier-2 fixtures plus
  the long-tail codes most workflows branch on. An inbound code **outside** a snapshot still parses:
  the verbatim code is preserved on the model and an `X12_UNKNOWN_*` warning is raised. Only the
  human-readable **description** is absent (`undefined`). A stale or partial snapshot therefore yields
  a missing description, **never a wrong code**. Run `pnpm refresh:code-lists` to audit snapshot
  freshness; regenerating the full lists (`--fetch`) is a redistribution-terms-gated release step (see
  below), not a runtime fetch.

- **`serialize(parse(s)) === s` is NOT guaranteed.** `serializeX12` rebuilds the interchange from the
  model, so every segment the parser recorded comes back verbatim (element padding, composites, and
  `?`-release escapes included), in the order the model holds it. Six constructs are known not to
  survive:
  1. **Line breaks between segments.** Most senders write one after each terminator; the parser
     absorbs any run of CR / LF bytes between segments, so a pretty-printed, double-spaced, or
     mixed-ending file all emit the same compact form. **Silent.**
  2. **A doubled segment terminator** outside a transaction. It delimits a zero-length segment
     carrying no elements, so there is nothing to retain. **Silent.**
  3. **A missing final segment terminator.** The emit supplies one. **Silent.**
  4. **Post-IEA `trailingBytes`**, re-joined from segment slices rather than preserved verbatim.
  5. **TA1 position.** A TA1 that appeared **after** a functional group is collected onto
     `ix.ta1Segments` and emitted immediately after the ISA, so the emit **reorders** it. **Silent**,
     and unlike the others nothing is lost: the model and the warning stream both round-trip
     identically. It is also the only construct that moves something _else_: a segment outside a
     transaction is placed correctly relative to the groups, but not relative to a TA1 hoisted past
     it. This library takes no position on where ASC X12 requires a TA1 to sit.
  6. **A segment whose first element is empty (`*A*B~`), outside a transaction.** It has no id for
     the envelope walker to dispatch on, so it is skipped: absent from the model, absent from the
     emit, and it does not even raise `X12_UNEXPECTED_SEGMENT`. **Silent**, and the only case here
     that loses a value with no diagnostic whatsoever. Inside an open transaction the same segment
     is kept and re-emitted normally, so this is specific to the outside-a-transaction position.

  **Cases 2 to 6 break the round trip on inputs containing no line breaks**, so "my file is compact"
  is not sufficient grounds to expect byte equality. **Five of the six (1, 2, 3, 5, 6) produce no
  warning at all**, so a clean `ix.warnings` is not evidence that a round trip will be byte-exact;
  only case 4 warns.

  **A segment outside a transaction is no longer on this list.** It used to be, in both halves: the
  segment was discarded from the model, and the emit could not reproduce what the model did not
  hold. It is now retained on `ix.orphanSegments` **and** re-emitted, so the bytes, the value and the
  `X12_UNEXPECTED_SEGMENT` warning all survive. Placement is by the **structural anchor** on
  `X12OrphanSegment.anchor` - which group, which transaction, which offset inside it - and never by
  `segmentIndex`. That distinction is the entire correctness argument, because `segmentIndex` indexes
  the **input** stream while the emit is not in input order (see case 5, and the zero-length segment
  in case 2 occupies an input index that is never emitted). Measured on a two-group interchange with
  a TA1 after the first group, an earlier attempt at _positional_ re-emit landed a stray segment
  inside an 835's `ST..SE` body between `CLP` and `SE`, with no warning at all on the re-parse, and a
  stray `SE` closed the transaction early and corrupted SE-01. An anchor names a slot in the typed
  tree, which is invariant under both reorderings. **Use `segmentIndex` to join an orphan to its
  warning, never to place it.** An anchor is a position into `groups` / `transactions` /
  `rawSegments` as they stand on the interchange you pass in, so reshaping those by hand invalidates
  it; an anchor that resolves to nothing is emitted at interchange level before the `IEA` rather
  than dropped.

  **One interaction with spec-clean mode is worth knowing.** A `TA1` that arrived between an `ST`
  and its `SE` is lifted off `tx.rawSegments` by the walker but re-emitted where it came from, so it
  IS a segment of that transaction set for SE-01 purposes ("segments included in the transaction
  set, including ST and SE", X12.6). `{ specClean: true }` therefore counts it, and
  `{ recomputeCounts: true }` writes the count that matches the emitted bytes. Counting the model
  alone would shrink a correct SE-01 by one per such segment, which is a count corruption rather
  than a correction. An orphan emitted before the `ST` or after the `SE` is outside the range and is
  not counted. GE-01 and IEA-01 are unaffected: an orphan is never a `GS` and never opens a
  transaction set.

  What is **measured** for the orphan round trip: a stray segment inserted at every position of a
  two-group, three-transaction interchange, over five segment ids - `ZZ`, `SE`, `GE`, `ST` and `TA1`,
  covering all five orphan `context` values and all three anchor kinds. **50 of the 50 insertions
  that produce an orphan round-trip byte-exactly** on a base with no envelope-level TA1. On the same
  base _with_ one, all **54** differ from their source - and all 54 are byte-identical once the TA1
  is removed from both sides, so the only thing that moved is the TA1 itself, which moves on that
  base with no orphan present at all. Across all 104, the transaction bodies, `orphanSegments` (raw,
  context and anchor), `ta1Segments`, `trailingBytes` and the warning multiset are unchanged by the
  round trip, and every emit is a fixed point.

  What is **measured** across the 56 committed fixtures: every emit is a fixed point (serializing it
  again is a byte-level no-op) and re-parses to an identical model with an identical warning stream;
  the 14 fixtures with no line breaks return byte-identical; and the other 42 differ from their source
  by **line breaks and nothing else**, with no element value lost, altered, reordered, or re-escaped.
  Two caveats on that corpus, both of which limit how far the sweep can be pushed: it contains **no
  instance of cases 2 to 6** (zero fixtures produce an `orphanSegments` entry, which is why the
  orphan sweep above is constructed rather than drawn from it), and **13 of the 14
  byte-identical fixtures are `golden/*.edi`**, which
  are serializer output by construction, leaving `envelope/no-trailing-crlf.edi` as the only
  independent witness. Preserving the original framing byte-for-byte would need the model to carry
  per-segment framing and TA1 position it does not have today; that is a tracked model change, not a
  behaviour to assume.

- **A segment that falls outside a transaction is not decoded into the typed tree, but it is neither
  dropped from the model nor dropped from the emit.** The envelope walker binds body segments
  to an ST..SE transaction and has nowhere in `groups` to put one that arrives outside: a stray
  segment between `GE` and `IEA`, a body segment between an `SE` and its group's `GE`, a body segment
  between `GS` and the first `ST`, an `ST` with no open group, an `SE` or `GE` that closes nothing,
  or a `TA1` inside an open group. Each raises `X12_UNEXPECTED_SEGMENT` **and** is retained verbatim
  on `ix.orphanSegments`, whose `segmentIndex` is the join key back to the warning's
  `position.segmentIndex`, and whose `anchor` is the structural slot `serializeX12` puts it back at.

  **One of those is not an "outside a transaction" case at all.** `TA1` is envelope-level by spec, so
  a `TA1` inside an open group goes to `ix.orphanSegments` even when it arrived **between an `ST` and
  its `SE`**, and it is lifted out of that transaction's `segments` / `rawSegments`. So for a document
  containing such a `TA1`, `ix.groups` is not the whole typed model. This is long-standing behaviour,
  unchanged here except that the segment is now retained instead of discarded.

  **One limitation remains, and it is decoding, not retention or re-emission.** No `get*` reader will
  see an orphan: retention and placement are not promotion into the typed tree, and a segment the
  envelope grammar could not place is not one a transaction reader should walk. Read these segments
  from `ix.orphanSegments`. That array is empty for a well-formed
  interchange, so a non-empty one is itself the signal that the sender's framing did not match the
  envelope grammar. **It carries the sender's bytes verbatim, so treat it as PHI**: unlike
  `ix.warnings`, whose messages come from a frozen registry and whose metadata is positional, an
  orphan is document content. Log `context` and `segmentIndex`, not the whole entry.

  Two related shapes are **not** captured here, both long-standing: a doubled segment terminator
  (a zero-length segment with no elements, so there is nothing to retain) and a segment whose first
  element is empty (`*A*B~`), which has no id for the walker to dispatch on and is skipped with no
  warning.

  This entry previously documented real silent data loss: the segment was discarded from the model
  entirely, and because a blank line between segments exceeded the old one-CR-plus-one-LF tolerance,
  a uniformly double-spaced file lost its **entire interchange body** and returned `groups: []`. Both
  of those are fixed. The tolerance now absorbs any run of CR / LF bytes between segments, so all 15
  CR/LF sequences of length 0 to 3 frame identically (the old bound admitted 4 of those 15).

- **837 claim-/line-level provider addresses (Loop 2310 / 2420 `N3`/`N4`) are not surfaced.** The
  provider **identities** (`NM1`) round-trip, but the street-address lines do not decode onto the
  model. Read them from the raw segments if you need them.

- **`get834Enrollments` streams members but still parses the whole file up front.** It yields one
  decoded member per `INS` loop (so a consumer holds one member at a time), but the underlying
  interchange is fully parsed into `tx.segments` before iteration begins. It is not a byte-streaming
  reader for arbitrarily large files.

- **A builder refusal message shows at most 63 characters of a value you passed in, and it is bounded
  but not escaped.** Twenty-three sites across ten builder modules interpolate such a value into the
  thrown message. Every one routes through `renderCallerValue`, so the rendered **fragment** never exceeds
  `BUILD_REFUSAL_VALUE_MAX_RENDERED` (**90** characters: 63 of your value, two quotes, an ellipsis, and
  the ` (N characters)` suffix at its widest). Both constants and the function are exported, so you can
  assert the ceiling rather than take it on trust.

  **The ceiling is on the fragment, not on the message.** A refusal message is that fragment plus the
  site's own fixed template text, which differs per site, so every message is bounded by a constant but
  not by _that_ constant. Measured: a 120,000-character control number produced a **120,066-character**
  `X12BuildError.message` from `buildInterchange` before this change and produces a **150-character**
  one now. Do not read 90 as a message length.

  Over-long values are the point of nine of the twenty-three sites (the `control number "…" exceeds the
N-char spec limit` refusal, one per emitting module, where the branch fires **because** the value is
  over-long). Seven more had no length gate at all: `build999`'s ST-02 trace twice, `buildInterchange`'s
  transaction-set id, `build837`'s service-line variant, `build834`'s INS-03 and HD-01 maintenance
  types, and `buildTA1`'s note code. The last seven are all in `build999` and were found by adversarial
  review rather than by the original census. Four are the AK9-02 / AK9-03 / AK9-04 counts, typed
  `number` and so missed by a census of string-typed fields, though a spec built from `JSON.parse` can
  still carry a string there (measured at 120,063 characters). Three read `.length` off a
  caller-supplied array, which a forged `{ length: … }` drove to 120,152 characters.

  **What this is and is not.** These are values **you** passed in, so bounding them redacts nothing:
  you already hold the value, and if you put patient data in a control number the refusal will show up
  to 63 characters of it. What the bound buys is that `Error.message` from a builder has a fixed
  ceiling instead of growing with your input, which matters for log lines, crash reports, and JSON
  error envelopes. The surviving characters are **not escaped** either: they are whatever you supplied,
  including a newline or a segment terminator, so a refusal message is bounded but not guaranteed to be
  a single log line.

- **`defineProfile()` refusals are bounded on the same terms, since `0.0.6`.** `X12ProfileError.message`
  used to interpolate your profile name, quirk id, effect, fixture path and expected-warning codes
  verbatim. Measured before the fix, the worst message was **360,181 characters**, at the `fixture`
  refusal, which names three caller values (the profile name, the quirk id, and the `JSON.stringify`d
  path). It reaches that size because the quirk-id pattern carries no length bound (its comment
  claimed "2-64 characters"; the regex never said so, and the comment was corrected to the code rather
  than the grammar tightened). Twelve refusal sites hold twenty-three such holes between them; all
  twenty-three now route through `renderCallerValue` or, where the value's **type** is what is wrong,
  `renderCallerJson`, which keeps `null` distinguishable from `"null"` and bounds the JSON text. The
  same `fixture` refusal now measures **431 characters**.

  **431 is a measurement at a 120,000-character value, not a maximum.** The ` (N characters)` suffix
  widens with the decimal width of the length, so the same refusal measures 434 at 1,000,000 and 437
  at 10,000,000 characters. That site's ceiling, derived from its fixed text plus its three fragment
  ceilings, is **443**, and the suite asserts every one of the twelve under 500.

  Everything the builder paragraph says about scope applies here unchanged: it redacts nothing (you
  passed the value in), the surviving characters are **not escaped**, and the bound is on UTF-16 code
  units rather than bytes.

  **`X12ProfileError.profileName` is deliberately NOT bounded.** It exists so you can pinpoint which
  of your definitions failed, and truncating it would stop it matching the name you passed. It is your
  own string and you still hold it. If you log a caught `X12ProfileError`, log `err.message` (bounded)
  rather than the whole error object.

- **A builder used to emit a NUMBER as an EMPTY element, silently. FIXED in `0.0.9`: it now
  REFUSES, and does not coerce.** The escape helper every builder ran values through read
  `value.length`, which is `undefined` for a number, so it returned the empty string. The types say
  `string`, so TypeScript callers could not reach it; a JavaScript or JSON-driven caller could, and
  one that reads a spec off `JSON.parse` did.

  Measured at `0.0.8` on an otherwise valid `build835` spec whose `patientControlNumber` was a number
  rather than a string:

  ```
  CLP**1*500.00*450.00*50.00*MB*ICN-9001*11::1     ix.warnings.length === 0
  ```

  CLP-01 is required by TR3 005010X221A1 Loop 2100 and is the key that reassociates the remittance
  back to the 837's CLM-01. It was dropped, **no warning was raised, no refusal was thrown**, and the
  builder returned a frozen interchange that looked successful. The `patientControlNumber === ""`
  guard did not catch a number, because the value was not yet a string when it was checked. The same
  one-line mechanism reached every `esc()`-rendered slot in all nine builders, including the 837's
  `CLM-01`, the other end of that same reassociation link.

  **From `0.0.9` a non-string reaching that escape helper draws that builder's own typed, code-tagged
  refusal** (`X12_835_BUILD_INVALID_SPEC` and its eight siblings) before anything is emitted. It
  covers `number`, `boolean`, `null`, `undefined`, arrays, objects, functions, symbols and bigints.

  **The library deliberately does NOT coerce, and you should know why before you reach for
  `String(value)`.** A JSON payload that carried `"0012345"` as a number has already lost the leading
  zeros; coercing would emit `12345`, a well-formed identifier that is **not the one you sent**, and a
  remittance that reassociates to the wrong claim is worse than one that fails to reassociate at all.
  `String(1e21)` is `"1e+21"`, `String(NaN)` is `"NaN"` and `String(0.1 + 0.2)` is
  `"0.30000000000000004"`. None are valid in an `AN`, `ID` or `Nn` element. **Convert at your own
  boundary, where you can still see whether the leading zeros mattered.**

  **THE TYPE CHECK IS NOW STRUCTURAL, AND THE DELIMITER ESCAPE IS NOT.** `0.0.9` guarded values
  routed through the escape helper, and not every element position went through it - two drafts of
  this entry published a counted enumeration of the gaps and **both were measured incomplete**.
  Rather than count a third time, the library moved the check to the one place every element must
  pass: **the segment join**. So the statement is now a property instead of a list:

  > **No non-string value reaches an element of a segment emitted through a builder's segment
  > joiner.** A number, `null`, `undefined`, a boolean or an object in an element slot draws that
  > builder's own typed, code-tagged refusal, naming the slot the way the spec does
  > (`build999: "AK9"-01 must be a string, …`).

  **Read the "through a builder's segment joiner" qualifier literally.** `buildTA1` does not use one,
  and is therefore **not covered**: it emits its five caller-supplied elements with a direct join, no
  escape and no padding, so a numeric or `undefined` `interchangeControlNumber` is emitted silently
  (`TA1**250101*1200*A*000`). TA1-01 is the reassociation key from the acknowledgment back to the
  interchange it acknowledges, so that matters. Unchanged from `0.0.9` and tracked as its own item.

  The monetary slots got their own guard on top of it: a slot typed `X12Decimal` refuses anything that
  is not one, rather than rendering `number.toString()` into the document.

  **What is still worth validating at your own boundary,** because it is a list and lists have the
  weakness described above:
  1. **A `string` carrying an active delimiter.** The segment guard passes it, because it is a
     string. Slots that route through the escape helper release it correctly (`"1*BOGUS"` emits as
     `1?*BOGUS`); the fixed-width ISA slots do not go through it at all.
  2. **Whether an `X12Decimal` carries the SCALE you meant.** `fromString("0.3")` and
     `fromString("0.30")` are both accepted and both emit verbatim. That choice is yours.
  3. **Anything `buildTA1` emits**, per the paragraph above.
  4. **`build835`'s balance-equation amounts, which refuse UNTYPED.** `build835` runs its balance
     guard before it builds the escape helper, and that guard calls `X12Decimal` methods on your
     value. So a raw `number` there throws a plain `TypeError` with **no `code`** - some saying the
     value "has no internal state - was it tampered with?", which is a misleading thing to be told
     when you passed a number. **The rule, not a list:** a slot refuses untyped exactly when the
     balance guard reads it as a term of one of the three TR3 X221A1 §1.10.2 invariants (the claim,
     service-line and remit-total equations). **Named by SPEC FIELD rather than element number,
     because a draft that used element numbers got one wrong:** the untyped set is
     `payment.totalActualPayment`, `claim.totalChargeAmount`, `claim.totalPaymentAmount`, every
     `adjustments[].amount` at claim and line level, `serviceLine.chargeAmount`,
     `serviceLine.paymentAmount` and `providerAdjustments[].amount`. Every other `X12Decimal` field
     refuses typed, including `claim.patientResponsibilityAmount`, `serviceLine.paidUnitsOfService`,
     every `amounts[].amount` and every `adjustments[].quantity`. Unchanged from `0.0.9`; `err.code` is still the thing to branch on, and the
     balance terms are the case where there is not one.

  **Closed in the release after `0.0.9`, and recorded because the behaviour changed for callers who
  were relying on it.** Each of these emitted silently before and refuses now:
  1. **Monetary and quantity slots read `.toString()`, so a raw number passed the check.** Measured
     with `warnings.length === 0` in every case: a `patientResponsibilityAmount` of `0.1 + 0.2`
     emitted `CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…`, `1e21` emitted `…*1e+21*…`,
     `NaN` emitted `…*NaN*…`, and an 837 service-line `units` of `0.1 + 0.2` emitted
     `SV1*HC:99213*150.00*UN*0.30000000000000004***1`. Two of those three the library **cannot parse
     back** - it rejects exponent notation and `NaN` outright - so they did not round-trip.
  2. **Some string-typed positions never called the escape helper at all**, so a number was emitted
     verbatim with no warning: `build999`'s `envelope.groupControlNumber` (GS-06 / GE-02),
     `envelope.transactionSetControlNumber` (ST-02 / SE-02), `functionalGroup.disposition` (AK9-01)
     and `transactionResponses[].disposition` (IK5-01); `build278`'s `review.levelCode` (HL-03);
     `envelope.groupDate` / `envelope.groupTime` (GS-04 / GS-05) in every domain builder; and
     `build837`'s `serviceLine.lineNumber` (LX-01). **AK9-01 was the one to know about:** it is an
     `ID` element bound to X12 code list 715, so a number there told the receiver nothing about
     whether the functional group was accepted, and the library's own accept-with-errors guard
     compares it against `"A"` and did not fire. These positions also admitted an **unescaped
     delimiter**: `build999` with a `groupControlNumber` of `"1*BOGUS"` emitted
     `GS*FA*…*1*BOGUS*X*005010X231A1`, shifting GS-07 and GS-08 by one. They are routed through the
     escape helper now, so that reads `1?*BOGUS`.
  3. **The fixed-width ISA slots** (`senderId`, `receiverId`, `interchangeControlNumber`, …) go
     through padding rather than escaping, and **are still not covered** - they do not pass through
     the segment join either. A number there throws an untyped `TypeError` with no `code`
     (`value.slice is not a function`), and a numeric `interchangeControlNumber` throws the builder's
     typed refusal with the **misleading** text "exceeds the 9-char spec limit". Both terminate
     rather than emitting silently, which is why they were the smaller hazard and why they are left
     alone. GS-04 and GS-05 were the counter-example that made this distinction worth stating - they
     are envelope elements and they WERE silent. They are covered now; ISA still is not.

  **One other change, and it is a behaviour change:** the exported `escapeRelease(value, delimiters)`
  now **throws `TypeError` on a non-string** rather than returning `""`. If you call it directly, it
  is a `TypeError` and not a code-tagged library error, because it is a pure text utility with no
  spec context to name. Nothing inside the library can reach it: the builders refuse first. A boxed
  `new String("…")` is also refused now, where it built at `0.0.8`.

- **A forged non-array in a builder spec refuses; in a few places it throws an untyped `TypeError`.**
  The types say `readonly T[]`, but a JavaScript or JSON caller can hand a builder something else. As
  of `0.0.6` every indexed loop in every builder takes its bound from a checked array (32 loops across
  7 modules), so an object like `{ length: "9".repeat(120000) }` draws that builder's own typed
  refusal - previously the length coerced to `Infinity` and the builder **looped forever instead of
  refusing**. Measured across the nineteen probes the suite ships: at base **16 hung** and 3 threw an
  untyped `TypeError`; at head **17 refuse with a typed, coded error** and 2 still throw the untyped
  `TypeError`.

  **`null` is treated as absent, not forged**, exactly as the `?? []` this replaced did, so an
  optional list you send as `null` still builds. On a required list `null` draws that builder's own
  "at least one X is required" refusal instead of an untyped `TypeError` for five of the six:
  `build834`, `build820`, `build837`, `build271` and `build277`. **`build835`'s `claims` is the
  exception** and still throws an untyped `TypeError`, as it did at base.

  Not covered, and disclosed rather than fixed: the places a builder reads a caller array with
  `for…of` - `buildInterchange`'s `spec.groups`, `build999`'s `functionalGroup.transactionResponses`,
  and every optional leaf array such as `claim.dates` or `member.references`. Those throw
  `TypeError: … is not iterable` immediately. They terminate, so they are not the hang, but they carry
  **no `code`**, so `err.code` is `undefined` and you cannot branch on it. Validate your spec shape at
  your own boundary if it comes from JSON.

  **One qualification worth stating precisely: on the acknowledgment path the value is not always
  strictly your own.** TR3 005010X231A1 requires AK2-02 to be a verbatim copy of the acknowledged
  transaction set's ST-02, and `buildTA1` exists to echo an inbound ISA-13, so a _document's_ control
  numbers reach those refusals by the standard's own design. They are envelope control numbers rather
  than clinical content, and they are bounded like everything else, but "the value is always the
  caller's own" would be false and this library does not claim it.

  Logging `err.code` rather than `err.message` remains the safest habit, and the parse side is stronger
  still, where no factory takes a value parameter at all.

- **`X12ParseError.snippet` on a Tier-3 fatal can carry PHI, by design, and the library does not
  redact it.** Warning messages come from a frozen registry and no factory takes a value parameter, so
  they cannot echo an element; the four structural fatals are different, because they are raised
  before the envelope is readable and each carries a bounded (≤ 64 character) copy of the start of
  the input so the error is actionable. On real traffic those bytes can be patient data. Redact at
  your call site, or log `err.code` and `err.position` and drop `err.snippet`. A **strict-mode
  escalation carries no snippet**: the error it raises wraps a registry-built warning, so `err.snippet`
  is `""`.

- **Two classes of locator-flavoured model field are left unbounded on purpose, and a downstream
  package should not interpolate them.** `X12HierarchicalLevel.hlId` / `.parentHlId` / `.levelCode` /
  `.hasChild` (and the shared `X12Hl`) stay byte-verbatim because collapsing two distinct
  non-conformant HL ids to one sentinel would make them compare equal and silently merge two
  subscribers' claims into one hierarchy; a wrong hierarchy is worse than a wide locator. The 999's
  error report is the other class: `X12Ack999Ak1.functionalIdCode`,
  `X12Ack999Ak2.transactionSetIdCode`, `X12Ack999Ik3.segmentIdCode` / `.loopIdentifier` and
  `X12Ack999Ik4.dataElementReferenceNumber` are the trading partner's report of
  where **they** found a problem, which is the content a 999 exists to deliver. `X12Segment.id` is
  bounded to the X12 segment-id grammar (a non-conformant first element yields
  `NON_SPEC_SEGMENT_ID`) precisely because it is a derived locator with no such argument; the bytes
  stay on `seg.raw` and `seg.elements[0]`. **No warning code is raised for that substitution, and no
  code distinguishes two different non-conformant ids through `seg.id`.** That is deliberate rather
  than an oversight: it bounds a derived field, it is not a parse deviation, and every walker
  dispatches on an exact segment-id match, so a first element outside the grammar could never have
  matched a walker in the first place. Compare `seg.id === NON_SPEC_SEGMENT_ID` when you need to
  detect one, and read `seg.elements[0]` for which one it was.

- **`X12Ack999Ik4.copyOfBadDataElement` is a copy of the offending bytes and can carry PHI.** It is
  whatever the sender put in IK4-04; the library never auto-populates it, and senders SHOULD omit it
  when the bytes are PHI.

- **Balance and integrity checks warn; they never rebalance or renumber.** The 835 TR3 §1.10.2 balance
  invariants, 837 HL parent-pointer integrity, and envelope-count reconciliation surface a warning on
  mismatch and preserve the inbound values verbatim. The library will not "fix" a payer artifact for
  you. Gate your own posting/adjudication on the warning.

## Conformance testing not yet wired

- **No external-oracle differential corpus yet.** A best-effort differential harness against CMS
  Medicare 835 public examples (and/or another external X12 reader) is planned for the first real
  release but is **not yet wired**, pending a redistribution-terms review of the CMS sample material.
  Conformance today rests on the three-tier synthetic corpus (spec-clean → vendor-quirk → round-trip
  goldens), property/round-trip tests, and a nightly amplified byte-flip fuzz job, not on parity with
  a third-party implementation. Do not assume byte-for-byte agreement with any specific vendor parser.

## Scope (non-goals for v1)

- **Healthcare HIPAA 005010 only.** Non-healthcare transaction sets (850/856/810/204, etc.), the
  EDIFACT syntax family, and pre-005010 versions are out of v1 scope. Pre-005010 input is tolerated
  and flagged (`X12_PRE_005010`), not decoded to those older field maps.
- **No transport.** AS2, SFTP, and MLLP-style delivery are out of scope. This is a parser/serializer,
  not a communications stack.
- **Published, still pre-alpha.** The package is published on npm as `@cosyte/x12` from a public
  repo, but it stays on the `0.0.x`-until-first-alpha ladder. `npm view @cosyte/x12 version` is the
  only source of truth for the current version, so this page does not restate one. Treat the API as
  pre-alpha and pin the exact version until the first alpha.
- **No typed model for the 270 and 276 inquiries.** Every other v1 transaction has both a
  per-transaction reader and a domain builder. The 270 eligibility inquiry and the 276 claim-status
  inquiry have neither: they parse into segments, composites, and dot-paths like any other X12 input,
  and the responses (271, 277) decode fully, but the inquiry directions have no typed surface yet.

## Code-list `--fetch` regeneration

`pnpm refresh:code-lists` (default) validates the bundled snapshots and prints a freshness audit,
offline and CI-safe. The `--fetch` mode that would **regenerate** the full lists from their canonical
WPC / X12 sources is deliberately **not** run in automation: redistributing the full WPC code
descriptions requires a redistribution-terms review that has not cleared, and it needs outbound
network. The tool prints the canonical source manifest and exits rather than fabricating descriptions
the maintainers have not reviewed.

---

For the phase-by-phase surface and the exact fields each helper decodes, see the package's
[`CLAUDE.md`](./CLAUDE.md) status section and the [Cookbook](./docs-content/cookbook.md).

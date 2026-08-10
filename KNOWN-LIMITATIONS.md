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

- **🩺 An ISA element carrying the element separator makes the header split into more than
  `ISA` + 16 elements. Through `0.0.16` no check saw that at all; it is now reported as
  `X12_ISA_EXTRA_ELEMENT_SEPARATOR`** (`X12-ISA-ELEMENT-ARITY`). **Nothing is
  re-framed: this is a report, not a repair, and no existing warning was suppressed or narrowed.**

  `detectDelimiters` verifies the element separator at all 16 fixed 005010 byte positions, so the
  ISA split can never come out SHORT. It was never bounded from ABOVE. An element value carrying
  that same byte splits again, so that element comes back a **prefix** and everything after it is
  **displaced**. **`isa.elements.length` is the only measure of how far, and more than one element
  can do it**: two such elements displace by two, and there is no bound on either. Measured on one
  conformant interchange, planting the element separator inside each of the 16 fixed elements in
  turn:

  ```text
  planted in   split parts   warnings through 0.0.16
  ISA-01..10   18            X12_PRE_005010, X12_CONTROL_NUMBER_MISMATCH
  ISA-11       -             X12_INVALID_DELIMITERS (Tier-3, thrown before any of this)
  ISA-12       18            X12_PRE_005010, X12_CONTROL_NUMBER_MISMATCH
  ISA-13       18            X12_CONTROL_NUMBER_MISMATCH
  ISA-14       18            (none)
  ISA-15       18            (none)
  ISA-16       -             X12_INVALID_DELIMITERS (Tier-3, thrown before any of this)
  ```

  ISA-11 and ISA-16 **are** the in-band repetition and component separator declarations, so planting
  the element separator there collides with them and the Tier-3 refusal reaches it first. That is a
  boundary of the probe, not a claim that those two elements are special.

  **What the displaced reads cost, on the rows that had a warning as much as on the rows that had
  none.** On the `ISA-01..10` and `ISA-12` rows the interchange declares `00501` at ISA-12's own
  fixed offset and `X12_PRE_005010` fires anyway, because `elements[12]` has become the repetition
  separator; `elements[13]`, the interchange control number and the reassociation key, answers
  `"00501"`; and `elements[15]`, the test/production usage indicator, answers `"0"` on a document
  whose ISA-15 says `P`. On the `ISA-13` row the control number is a prefix. **The `ISA-14` and
  `ISA-15` rows carried `warnings: []`** while the usage indicator read empty.

  **The route back is `isa.raw`**, which still carries all 106 bytes verbatim, and the ISA's fixed
  widths make the transmitted span of any element recoverable from it. Recovering it is **your**
  decision, not this library's: a byte that is both an element's content under those fixed widths and
  the separator the same segment declares in-band has two readings, the interchange is not
  005010-conformant either way, and nothing anyone here has read says which reading to take. So the
  parser reports that the header did not frame and leaves `isa.elements` exactly as the split
  produced it.

  **When this warning is present, treat every other ISA-derived diagnostic on that interchange as
  provisional.** `parseX12` raises it ahead of the ones it raises after it for that reason, which
  also means `{ strict: true }` escalates on it rather than on the displaced-value warning that
  follows. **🩺 Read that as a statement about `ix.warnings` and `onWarning`, and about nothing
  else.** `serializeX12(ix, { specClean: true })` reconciles ISA-13 against IEA-02 off
  `isa.elements[13]` with no arity awareness and **never raises this code at all**, so on that
  channel a lone `X12_CONTROL_NUMBER_MISMATCH` can be a displaced read of a control number that in
  fact matches byte for byte at its fixed span, and **the absence of this warning there is not
  evidence the header framed**. Pre-existing, disclosed, not fixed here.

  **The emit side is unchanged and is NOT guarded by this.** The fixed-width ISA slots go through
  `pad` / `padControl` and never through the caller escaper, so `buildInterchange` still writes a
  caller value carrying the element separator straight onto the wire. What changed is that
  `buildInterchange` returns `parseX12` of the bytes it just wrote, so the report now reaches that
  path too: `interchangeControlNumber: "0000*0001"` used to come back with ISA-13 reading `"0000"`,
  ISA-15 reading `"0"` instead of `"P"`, IEA-02 displaced the same way so the control-number
  reconciliation **agreed with the misreading**, and `warnings: []`. Refusing such a value on emit is
  a decision about the build side and is not taken here.

- **🩺 `parseTA1`'s five decoded fields are POST-`?`-unescape as of this release, and an EMPTY
  TA1-02 / TA1-03 / TA1-04 / TA1-05 is REFUSED on emit. Both are behaviour changes**
  (`X12-TA1-RESIDUALS`). They are one slice because they are the two ends of the same disagreement:
  this package's emit half releases a TA1 element and its read half decoded the escape rather than
  the value.

  **The read half.** `X12-TA1-EMIT-NOT-RELEASE-AWARE` made `buildTA1` release all five caller
  elements, and `parseTA1` kept reading `elements` verbatim, so a round trip through this package's
  own halves was not an identity for any value carrying a delimiter or the release character.
  Measured at `0.0.15`, over `parseX12` + `parseTA1` of what `buildTA1` had just emitted:

  ```text
  interchangeControlNumber   raw emitted                          parseTA1 read     dot-path read
  "00000001?"                TA1*00000001??*260601*1200*A*000     "00000001??"      "00000001?"
  "0000*0001"                TA1*0000?*0001*260601*1200*A*000     "0000?*0001"      "0000*0001"
  "0000~0001"                TA1*0000?~0001*260601*1200*A*000     "0000?~0001"      "0000~0001"
  "0000:0001"                TA1*0000?:0001*260601*1200*A*000     "0000?:0001"      "0000:0001"
  "0000^0001"                TA1*0000?^0001*260601*1200*A*000     "0000?^0001"      "0000^0001"
  ```

  Every row `warnings: []`. TA1-01 is the reassociation key, so the left column is a key that
  matches no ISA-13. The right column is the same element. The grounding is that
  disagreement and nothing else - no clause anyone here has read settles what a TA1 element may
  contain.

  **What that costs, stated rather than argued away.** A consumer who was applying `unescapeRelease`
  to `parseTA1`'s output themselves - the remedy this file used to prescribe - now has the library
  doing it, so **drop the hand-rolled call**. And a value with no `?` in it is unchanged on both
  surfaces, which is every conformant TA1. **`raw` is untouched and is still the verbatim byte
  surface**: read `ta1.raw.elements` when you want the bytes.

  **The emit half.** `escapeRelease` early-returns on `""` and `buildTA1` carried a required-field
  guard for TA1-01 alone, so the other four slots emitted an absent element with `warnings: []`:
  `interchangeDate: ""` gave `TA1*000000001**1200*A*000`, `interchangeTime: ""` gave
  `TA1*000000001*260601**A*000`, `ackCode: ""` gave `TA1*000000001*260601*1200**000` and
  `noteCode: ""` gave `TA1*000000001*260601*1200*R*`. **The item filed two of those four.** Each now
  draws `AckBuildError` / `X12_ACK_INVALID_SPEC` naming the slot and the spec property and never the
  value. **No new error code was minted and no warning code moved.** The grounding is again inside
  the package: `BuildTA1Spec` declares all five properties as required `string`s, `""` is what
  defeats that at run time, and the in-package answer to an empty required element is uniformly
  refusal (`patientControlNumber`, `claimId`, `maintenanceTypeCode`, `requestCategoryCode`, the
  277's `categoryCode`, and TA1-01 itself).
  - **🛑 It does NOT trim, at any of the five slots.** A whitespace-only element still builds -
    `TA1*000000001*260601*1200*R* ` is still emitted for `noteCode: " "`. Trimming is a
    normalisation rule and no source consulted for this package states one, exactly as at TA1-01.
  - **🛑 It does not narrow what a NON-empty element may contain, and the read half stays lenient.**
    An out-of-enum `ackCode: "X"` still builds and still reads back as `R` through the documented
    fail-safe narrow - the same answer an empty one gave. This guard bounds ABSENCE on the emit side
    and nothing else.
  - **🛑 Every guard that stood before it keeps its precedence.** `enforceAcceptIsClean` still runs
    first, so an `ackCode: "A"` with an empty note still reports `X12_TA1_ACCEPT_WITH_NOTE`; TA1-01
    still draws the control-number refusal; and every wrong-TYPED element still draws the escape
    helper's refusal, because all five escapes run before any emptiness test. **No spec that was
    refused before this slice is refused differently by it.**
  - **No census of other builders' required elements is published here.** This slice measured TA1.

- **🩺 `implementationConventionReference` is POST-`?`-unescape as of this release, in every typed
  reader that publishes it, and that is a behaviour change on documents whose `ST-03` carries a
  release escape** (`X12-ST03-READ-NOT-RELEASE-AWARE`). `tx.st.elements` is the ST segment as framed:
  post-element-split and PRE-unescape. Five public
  readers were handing one of those strings straight back on the model - `get837Claims`,
  `get277Status`, `get277CADisposition`, `get278Request` and `get278Response` - so a sender that
  escaped a delimiter inside `ST-03` got the escape rather than the value it stated. `parse999` has
  always decoded the identically-named `AK2-03`, and every dot-path read already unescaped; that
  disagreement inside this package is the whole grounding, and no TR3 clause is claimed. The cells
  that were run, on the ST-03 element text a sender framed: `A??B` now publishes `A?B`, `A?*B`
  publishes `A*B`, `A?:B` publishes `A:B`, `A?~B` publishes `A~B`, `A?^B` publishes `A^B`. Every one
  of those published the framed bytes before.
  - **🛑 What decides an outcome did NOT move, deliberately.** The 837 variant lookup, the 277 /
    277CA `transactionType` discriminator and `get277CADisposition`'s admission gate all still key on
    the RAW element text, so no document changes variant, discriminator or admission because of this
    entry. That matters because the two can differ: with `componentSeparator: "X"` - a letter is an
    admissible delimiter - an `ST-03` framed as `005010?X222A1` decodes to `005010X222A1`, an
    identifier the variant table holds. Keying on the decoded text would make the declaration beat
    the `SVx` fallback there, which on a document whose only service segment is an `SV2` stops that
    line decoding and raises `X12_837_SERVICE_LINE_NOT_DECODED`. That is a change to how an already
    published document decodes a service line rather than a decode fix, and it is **open**, not
    taken here. **The difference is one-way: no document that resolved or was admitted before stops
    doing so**, because no identifier any of the three tests is keyed on contains a delimiter or the
    release character, so raw text equal to one decodes to itself.
  - **🛑 The published reference can name a guide this reader did NOT resolve to, and nothing warns
    about the divergence.** On the `componentSeparator: "X"` document above,
    `submission.implementationConventionReference` reads `005010X222A1`, which the variant table
    holds, while `submission.variant` is `I` from the `SVx` fallback. **"Nothing warns" is NOT the
    boundary of it:** on the same delimiters a body with no `SVx` publishes `005010X222A1` with
    `variant: "unknown"` and raises `X12_837_UNKNOWN_VARIANT`, and a body naming more than one
    variant publishes it with `variant: "P"` and raises `X12_837_AMBIGUOUS_VARIANT` - each time the
    code that fired says `ST-03` named no identifier this reader recognises while the model field
    holds one it does. **`X12_837_UNKNOWN_VARIANT`'s closing pointer at the model is therefore
    deleted.** **Through `0.0.15` the published value WAS the keyed value, so the model could not
    disagree with itself. Gate on `variant` / `transactionType`, never on the published reference.**
  - **🛑 It introduces no normalisation and no new warning.** Nothing is trimmed, case-folded or
    prefix-matched; a whitespace-only `ST-03` is still published untrimmed. A dangling `?` at the end
    of the element still raises no `X12_DANGLING_RELEASE_CHAR` on these readers: the sink is a no-op,
    which is what `getSegmentValue` defaults to and what `parseTA1` and `parse999` do, so every other
    element these readers decode drops it too. That residual is **unchanged and open.**
  - **Each reader's own empty / absent mapping is unchanged.** `walk278` still collapses `""` to
    `undefined`; `get837Claims` and `walk277` still publish `""`. Decoding cannot reach those
    branches differently, because no non-empty element decodes to `""`.
  - **`tx.st.elements` is untouched and is still the verbatim framed surface.** If you were applying
    `unescapeRelease` to `submission.implementationConventionReference` yourself, drop that call.

- **🩺 An EMPTY control number is REFUSED on emit as of this release, where it used to be
  FABRICATED, and that is a behaviour change for any caller passing one**
  (`X12-EMPTY-CONTROL-NUMBER-FABRICATED`). Every builder that assembles an ISA zero-pads its control
  number to the nine characters ASC X12 .5 fixes ISA-13 at. `padControl("1", 9)` answering
  `"000000001"` is the point of that; `padControl("", 9)` answering `"000000000"` was not, and
  nothing stood in front of it, so `interchangeControlNumber: ""` produced a frozen, well-formed
  interchange carrying a nine-digit control number nobody supplied, with `warnings: []` and ISA-13
  reconciling perfectly against IEA-02. A control number is how an interchange is reconciled and
  acknowledged, so a fabricated one does not fail: it succeeds against the wrong thing.

  The other control numbers took the same input and were silent in a different way. They reach the
  wire through the escape helper, which early-returns on `""`, so the required element was lost.
  **The bytes are not the same in every builder**: `buildInterchange` and `build999` join without
  trimming, so the element goes out empty, while the seven domain builders share a segment helper
  that drops a trailing empty element, so the trailer loses it outright. Measured at `0.0.15`,
  through `buildInterchange` and `build834`:

  ```text
  buildInterchange  interchangeControlNumber: ""  ISA*…*00501*000000000*0*P*:~ … ~IEA*1*000000000~
  buildInterchange  groupControlNumber: ""        GS*HC*…*1200**X*005010X222A2~ … ~GE*1*~
  buildInterchange  transactionSetControlNumber:  ST*837**005010X222A2~ … ~SE*3*~
  build834          groupControlNumber: ""        GS*BE*…*1200**X*005010X220A1~ … ~GE*1~
  build834          transactionSetControlNumber:  ST*834**005010X220A1~ … ~SE*21~
  ```

  Every one of those emitted `warnings: []`, which is the property that holds across both families:
  no diagnostic on any channel separated an absent control number from a supplied one. The acknowledgment builders carried the same class at the slots
  where they **echo** the document being acknowledged, which is the whole reason a sender can match
  an ack to what they sent: `build999` emitted `AK1*HC**005010X222A2~` and `AK2*837*~`, and
  `buildTA1` emitted `TA1**260601*1200*A*000`. Every one of these now draws that builder's own typed,
  code-tagged refusal (`X12_BUILD_INVALID_SPEC` and its siblings; `X12_ACK_INVALID_SPEC` on the ack
  path) naming the slot and the spec property, before anything is emitted. **No new error code was
  minted and no warning code moved.** What changes is that a build that used to return a document now
  throws, and that a spec wrong in two ways can now report a different one of the two: see the
  precedence bullet below, which is the qualifier a draft of this entry left out.
  - **🛑 The guard does NOT trim, and a whitespace-only control number is
    still accepted**: `interchangeControlNumber: " "` still emits ISA-13 as `00000000 `, and
    `buildTA1` does no padding at all, so it emits whatever whitespace it was handed, verbatim. This
    is a real residual rather than an oversight. Trimming
    would be a normalisation rule, no source consulted for this package states one, and every
    empty-required-element guard this one mirrors (`patientControlNumber`, `claimId`,
    `maintenanceTypeCode`, `requestCategoryCode`, the 277's `categoryCode`) is byte-strict for the
    same reason. **Validate at your own boundary if your partner can send you blanks.**
  - **A SHORT control number still zero-pads.** The guard is not "ISA-13 must be nine characters":
    `interchangeControlNumber: "1"` still emits `000000001`, which is what `padControl` is for.
  - **🛑 Every guard sits at the envelope-assembly site, so every guard that runs BEFORE it keeps its
    precedence, and that is the whole claim.** `build835`'s balance equation, `build999`'s AK9
    counts, `buildTA1`'s accept-must-mean-accept check, the 837's and 277's hierarchy checks and
    `build834`'s unknown-maintenance-type refusal all still fire ahead of this one. **What it does
    NOT preserve is an ordering against a defect detected LATER**, during body assembly, which now
    reports the control-number refusal instead: `build999` with an empty `interchangeControlNumber`
    and six AK9 syntax error codes threw `X12_ACK_COUNT_MISMATCH` at `0.0.15` and throws
    `X12_ACK_INVALID_SPEC` now. If you branch on a specific builder error code, that pairing moved.

- **🩺 Which `ST-03` implementation-convention references resolve to an 837 variant CHANGED in this
  release, and some already-published files therefore decode differently** (`X12-VARIANT-ICR-UNGROUNDED`).
  Through `0.0.13` `get837Claims` recognised exactly three references: `005010X222A2`, `005010X223A3`
  and `005010X224A2`. **That set contained none of the identifiers HIPAA adopts at 45 CFR 162.1102**
  (`005010X222`, `005010X223` + `005010X223A1`, `005010X224` + `005010X224A1`), **and it was missing
  `005010X222A1` and `005010X223A2`**, which CMS and state Medicaid companion guides require in ST-03
  and GS-08 on production professional and institutional claims. A conformant 837P declaring
  `005010X222A1` therefore resolved to no variant at all and fell through to the `SVx` scan, where a
  single stray `SV2` anywhere in the body re-typed the whole submission, and
  `X12_837_UNKNOWN_VARIANT` accused a document that was not non-conformant. The reader now recognises
  each base guide and each of its published errata. Sources for every key are named beside the table
  in `src/transactions/claim/get-837.ts` and in
  `documentation/agent-notes/x12-variant-icr-ungrounded.md`.
  - **🛑 What this changes for a consumer, and it is a behaviour change on already-published
    decoding.** On a file whose `ST-03` is now recognised: `submission.variant` can differ from what
    `0.0.13` read, where the first `SVx` in the body disagreed with the declaration; and
    **`X12_837_AMBIGUOUS_VARIANT` and `X12_837_UNKNOWN_VARIANT` no longer fire at all**, because no
    guess was made. A predicate written against either code goes quiet on such a file. **🩺 And a
    service line whose `SVx` kind disagrees with the declaration is no longer DECODED, so a code
    STARTS firing on a document that may have carried `warnings: []`**: under `005010X222A1` with a
    body whose only service segment is an `SV2`, `0.0.13` read `variant` `"I"` and `charge` `7300`
    with no warnings, and this release reads `variant` `"P"`, `charge` `undefined`, and
    `X12_837_SERVICE_LINE_NOT_DECODED` at that line's `LX`. A mis-stamped envelope is an ordinary
    vendor variant and this reader cannot tell one from a conformant document; the loss is warned
    rather than silent. **Read all of this as ONE property and never as a closed list: where `ST-03`
    is now recognised the document's own declaration decides the variant instead of its first
    service segment, and everything downstream follows from that.** Re-check any routing driven off
    `submission.variant` for 837s read on `0.0.13` or earlier.
  - **🛑 The `SVx` fallback is NOT narrowed.** First-wins still takes the first service segment in the
    body, orphans included, on every document that still reaches it. What changed is which documents
    reach it.
  - **It is a LIST of cited identifiers, never a pattern.** A reference outside the set, in a
    different case, or carrying leading whitespace, still falls through exactly as before. Nothing
    trims, lower-cases or prefix-matches `ST-03`, because no source says to.
  - **The set is not claimed exhaustive and no count of it is published**, here or in any warning
    message. Both variant messages named the three old keys literally and were wrong the moment the
    table was corrected, so neither enumerates the set any more.
  - **🩺 CLOSED, in the slice after this one: the emit side takes a caller override**
    (`X12-837-EMIT-IDENTIFIER-FIXED`). `build837P` / `build837I` / `build837D` still DEFAULT to
    `005010X222A2` / `005010X223A3` / `005010X224A2` in ST-03 and GS-08, and
    **`Build837EnvelopeSpec.implementationConventionReference` now states another** - one value,
    both elements. Two of the defaults are not what the companion guides above require, so a partner
    asking for `005010X222A1` or `005010X223A2` used to reject what this builder emitted and there
    was no way to comply. **The default itself was deliberately NOT re-stamped:** which published
    guide identifier a partner accepts is a partner fact rather than a spec fact, and changing bytes
    this library already emitted would break the partners it works with today.
    - **What the override refuses of its own, all `X12_837_BUILD_INVALID_SPEC`, and none of it
      echoes your value back:** an empty reference (a trailing empty element is not emitted, so it
      would delete ST-03 and GS-08 rather than send them empty); one carrying an active delimiter or
      the release character; and one this library's own reader resolves to a **different** 837
      variant, which would emit a file declaring one variant and carrying another's service
      segments. **No total is published**, because those sit on top of the element-type guard every
      string slot in every builder already has, which refuses a non-string with the same code. Take
      the list as what this field adds, never as a closed account of everything that can refuse.
    - **🩺 It bounds the VALUE, not the length, and the two elements' maxima differ.** GS-08 is data
      element 480 (`AN 1/12`) and ST-03 is element 1705 (`AN 1/35`), so "one value, both elements"
      is true of the bytes and not of what each element may legally hold. Nothing here refuses an
      over-length reference, in line with every other envelope field this library takes.
    - **A reference outside the read table is emitted as given, deliberately.** The published-errata
      set is not provably exhaustive, so refusing an unrecognised identifier would claim an
      exhaustiveness nothing here supports. The honest cost, pinned as a test: this library's own
      reader falls back to the `SVx` scan on such a file, exactly as it does for any unrecognised
      ST-03.

- **🩺 A `?` immediately before the element separator inside an envelope segment now frames as ONE
  element, and that is a SYMMETRIC behaviour change on already-published decoding**
  (`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`).
  Through `0.0.14` the envelope segments' element splitter was a plain `String.prototype.split`, so a
  released element separator (`?*`) still ended the element and SHIFTED every element after it down a
  slot. It was a property of the whole envelope segment and never of one element, so the element a
  reader went looking for came back out of its neighbour's slot. Measured then, through `parseX12`:

  ```text
  GS*HC*S*R*20260601*1200*1*X*005010?*X222A1~   ten elements, GS-08 read "005010?"
  applicationSenderCode "SEND*ER"               GS-08 read "X", the GS-07 agency code
  groupControlNumber    "1*2"                   GS-08 read "X";  warnings: []
  transactionSetControlNumber "00*01"           ST-03 read "01"; warnings: []
  CLM*PT?*ACCT*150.00~                          three elements, CLM-01 held "PT?*ACCT"
  ```

  The body element was the control and was always correct. `splitElements` now honours the release
  character exactly as `decodeSegment` and the segment-terminator scanner already did, so every row
  above reads one element fewer and the value lands in its own slot.
  - **🛑 READ THE CHANGE AS SYMMETRIC. IT IS NOT ONLY A CORRECTION.** A `?` before the separator has
    two readings and 005010 does not transmit which the sender meant. Where the sender **escaped** a
    delimiter, the release before this one framed it wrongly and this one frames it correctly: a
    correction, the rows above. Where the sender sent a **literal `?`** as the element's last byte,
    the release before this one framed it correctly and this one merges the element with its
    successor, so **the segment loses its LAST element**: a regression.
    `GS*HC*SUB1*RCV?*20260601*1200*000000123*X*005010X222A1~` read nine entries through `0.0.14` and
    reads **eight** here, with GS-06 answering `"X"` and GS-08 gone.
  - **🛑 What this changes for a consumer.** One input class decodes differently: an envelope segment
    (`GS`, `GE`, `ST`, `SE`, `IEA`, `TA1`) carrying a `?` immediately before the element separator.
    Every other release sequence in an envelope element (`??`, `?:`, `?^`, `?~`, `?A`) framed
    identically before and after and still does. **No warning code is added, and
    `X12_CONTROL_NUMBER_MISMATCH` moves in BOTH DIRECTIONS.** Where the old shift displaced a control
    number it STOPS firing, so a consumer that rejects on that code will now **accept** such a
    document; where a literal `?` newly displaces one it STARTS firing, so that same consumer will
    now **reject** a document `0.0.14` accepted. A genuine mismatch still raises it.
  - **🩺 The regression direction reaches an 837's variant and its money, by one route.** `ST-03` is
    what decides the 837 variant, so an `ST-02` ending in a literal `?` destroys `ST-03` and the
    document falls back to the `SVx` scan. An 837 declaring `005010X222A1` whose only service segment
    is an `SV2` read `variant` `"P"`, `charge` `undefined` and `X12_837_SERVICE_LINE_NOT_DECODED`
    through `0.0.14`, and here reads `variant` `"I"` with `charge` `150.00` and that warning silent.
    **A warned non-decode becomes a decoded amount.** If you receive envelope elements that may end
    in a literal `?`, re-check any routing driven off `submission.variant`.
  - **Why it was taken anyway, and it is CONSISTENCY rather than a spec clause.** The two readings
    are mutually exclusive and nothing in 005010 picks between them. `decodeSegment` has read BODY
    elements the escape-wins way on **every released version** (`REF*EA*RCV?*NEXT` has always been
    two elements). The envelope now obeys the one rule the rest of the package already obeyed, and
    `buildInterchange` stops disagreeing with itself: at `0.0.14` it released GS-02 on emit and then
    answered GS-08 as `"X"` from its own return value.
  - **🩺 THE EXPOSURE IS NOT INBOUND BYTES ONLY.** Envelope slots routed through the builders'
    release escaper are safe. **Not every emit slot is routed through it, and no total is published
    here** - what follows is the routes measured to REACH the regression direction, not a closed
    account of what bypasses the escaper.

    **`buildInterchange` did not escape GS-04, GS-05 or GS-07** (`groupDate`, `groupTime`,
    `responsibleAgencyCode`) at this release. A `groupDate` of `"2026060?"` emitted
    `GS*HC*SENDER*RECEIVER*2026060?*1200*1*X*005010X222A1`, which its own return value read as nine
    elements with GS-08 intact through `0.0.14` and read as **eight** at `0.0.15`, GS-08 gone, plus
    `X12_CONTROL_NUMBER_MISMATCH`. **Closed by `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE`** - that
    entry is at the top of this section and it is the one that describes the current tree.

  - **An envelope element ending in a literal `?` is a dangling release character and is NOT warned.**
    `X12_DANGLING_RELEASE_CHAR` fires only for an odd run of `?` at the very END of a segment, so a
    mid-segment one reaches no check. That is true of body elements too and is unchanged here.
  - **Values are still RAW, pre-`?`-unescape**, exactly as `X12Segment.elements` has always
    documented: `gs.elements[2]` on the first row reads `"SEND?*ER"`, not `"SEND*ER"`. For the
    logical value, `unescapeRelease` the element string. `GsSegment` carries no `id`, so
    `getSegmentValue` does not accept a `gs` (`TS2345`); adding an `id` and taking the dot-path is
    the other route, and **the two answer different questions**: a bare dot-path splits on the
    repetition separator and answers repetition 0, so a GS-07 of `"A^B"` reads back `"A"` through it
    and `"A^B"` through `unescapeRelease`, `warnings: []`.
    `elements.join(separator)` therefore still
    reproduces the segment byte for byte, which is what `serializeX12` relies on when it substitutes
    a recomputed `SE-01` / `GE-01` / `IEA-01` into a control segment.
  - **🩺 The ISA is deliberately exempt and stays positional.** ASC X12 .5 makes the ISA fixed-width,
    which is what lets the delimiters be recovered from it before anything is parsed, so a `?` in an
    ISA element is content and never an escape. `buildInterchange` states the same rule from the emit
    side: it pads each ISA element and never escapes one.
  - **A degenerate delimiter set whose element separator IS `?` is unchanged by THIS entry.** `?`
    cannot both separate and escape, so `splitElements` falls back to the literal split, the same
    guard the segment-terminator scanner already carried. **Read that as the ENVELOPE splitter only:
    this sentence used to say "the splitter", and `decodeSegment` did NOT carry the guard**, so a
    degenerate interchange framed its envelope correctly and collapsed every BODY segment. The entry
    below closes that half.
  - **🩺 This does NOT make an UNESCAPED delimiter safe, and nothing here claims it does.** A bare
    active delimiter in an envelope element still ends that element, because that is what a delimiter
    is; only the sender escaping it is now honoured. `build837`'s
    `implementationConventionReference` still REFUSES a value carrying an active delimiter or the
    release character, and is deliberately not relaxed on the strength of this fix: a partner's
    parser is not obliged to be release-aware either. `buildInterchange` applies no domain guard to
    any envelope field and will still emit all of them, though it now reports back what it wrote -
    at `0.0.14` it released GS-02 on emit and then answered GS-08 as `"X"` from its own return value.

- **🩺 A BODY segment in an interchange whose ELEMENT SEPARATOR is `?` now frames its elements,
  where it used to come back as ONE element with an id of `(non-spec)`**
  (`X12-BODY-DEGENERATE-RELEASE-SEPARATOR`). `detectDelimiters` reads the element separator
  positionally out of ISA byte 4 and rejects only control characters, whitespace and a non-distinct
  set, so a sender may declare `?` there, and `buildInterchange` accepted `elementSeparator: "?"`
  from a caller when this was measured (it refuses now - see the emit-side entry below).
  `src/parser/envelope.ts` guarded that degenerate set in both of its own splitters;
  `decodeSegment`, which every BODY segment plus the `ST`, the `SE` and every retained orphan goes
  through, did not. It split with the release-aware splitter, where a `?` consumes the byte after it,
  so no split ever happened. Measured through `parseX12` at `0.0.15`:

  ```text
  ST?837?0001?005010X222A1                 id "(non-spec)", 1 element
  NM1?85?2?ACME CLINIC?????XX?1234567893   id "(non-spec)", 1 element
  SE?3?0001                                id "(non-spec)", 1 element
  warnings: []
  ```

  - **🩺 The envelope framed correctly the whole time, which is what made it silent.** One group,
    one transaction, `GE-01`, `IEA-01`, `GS-06`/`GE-02` and `ST-02`/`SE-02` all reconciling, an empty
    warning array - and a transaction body no reader could see, because every reader in this package
    dispatches on `seg.id`. A consumer got an empty claim list from a well-formed document.
  - **🛑 It changes how an already-published document decodes, deliberately, and the tiebreak is
    CONSISTENCY rather than a spec clause** - the same call the envelope-splitter entry above made.
    005010 does not transmit a release character at all, so nothing in it says what a `?` means once
    a sender has declared `?` as structure. **What is NOT the same as that entry: the class is not
    symmetric.** A one-element segment with an id of `(non-spec)` is not a second reading of
    `NM1?85?2?ACME CLINIC`; there is no direction in which the old framing was the right one.
  - **No warning code is added and nothing moves onto a new code.** One is SUBTRACTED, in one place:
    `X12_DANGLING_RELEASE_CHAR` fired on any degenerate segment ending in an empty last element,
    because the check keys on a trailing `?`. With `?` as the separator that trailing byte is an
    empty element, not an unpaired escape, so `PER?IC?NAME?TE?5551234?` is silent now.
  - **🛑 The guard is per ROLE, and it is a READ-side guard. A `?` REPETITION or COMPONENT separator
    still does not split, and that is deliberate and measured.** `escapeRelease` writes `??` for a
    literal `?` whatever role `?` was declared in, so documents this library emitted through `0.0.15`
    carry `CLM*PATIENT??ACCT*150.00` and `getSegmentValue(clm, "01")` reads `"PATIENT?ACCT"` back out
    of them. Splitting those two roles literally would re-frame that as two empty components, so it
    would stop reading a value this library itself wrote. **That reason survives the emit-side
    refusal below - those documents exist**, which is why the read side did not move with it.
  - **🟢 CLOSED, in the slice after this one, and WIDER than it was filed
    (`X12-EMIT-DEGENERATE-RELEASE-DELIMITER`): every builder REFUSES a delimiter set in which any of
    the four roles is `?`.** The entry as filed named the element separator and one mechanism - a
    caller VALUE the escape cannot protect, because the protecting `?` is itself the separator. Two
    things were measured wrong about that:
    - **The class is FOUR roles, not three.** The segment terminator does the same thing: a released
      byte inside a value ends the segment early, so a phantom segment appears mid-transaction.
    - **There is a SECOND mechanism, and it needs no caller value at all.** A builder joins
      composites with the component separator and repetitions with the repetition separator, so
      where either is `?` the library's own structural join is emitted as an escape. `build837P` on
      `componentSeparator: "?"` emitted `SV1-01-2` (the procedure code) and `HI-01-2` (the diagnosis
      code) fused into the preceding component **on every document, no trigger byte in any value**,
      `warnings: []`. That is the sharper of the two: a claim is adjudicated on those codes.

    A value-level mitigation was refused for a measured reason rather than a stylistic one: it
    cannot reach the second mechanism, and _"keep `?` out of your values"_ had already been refuted
    in this arc for protecting nobody. It refuses specs that built at `0.0.15`, some of which
    round-tripped through this library's own parser - **that round trip is not the bar**, because
    ISA-11 and ISA-16 transmit the declared set and a conformant receiver splits on it. Pinned in
    `test/builder-degenerate-release-delimiter.test.ts` and, per builder, in each build suite.

  - **🩺 A delimiter that is not SHAPED like one is refused on emit too, by every builder.** Each of
    the four roles must be a **string of exactly one visible character**, and the four must be
    **mutually distinct**. That is not a rule invented for emit: it is the predicate
    `detectDelimiters` already applies to an inbound ISA, where failing it is the Tier-3 fatal
    `X12_INVALID_DELIMITERS`. A builder composing a document its own parser refuses to read was
    disagreeing with itself. Nothing is trimmed, coerced or substituted - the set is refused.

    Three things it closed, and they are not one defect. A **multi-character** delimiter built with
    `warnings: []`: a `segmentTerminator` of `"~~"` put phantom segments on the model that `SE-01`
    never counted, and a `componentSeparator` of `":~"` read back through a well-formed ISA while the
    builder's own terminator became an uncounted empty segment. **No claim is made about which roles
    were affected**; declare one character per role. A **non-string** delimiter was coerced by the join but not by the
    escape, so the document framed on a byte no element value was protected from: an 837 with
    `componentSeparator: 1` read `SV1-01-2` back as `992` rather than the procedure code `99213`,
    `warnings: []`. And **`buildTA1` had no net at all** - it is the one builder with no trailing
    `parseX12`, so EVERY role and EVERY shape was silent there: `elementSeparator: ""` returned
    `TA10000000012606011200A000`, the reassociation key and the disposition fused into one blob, and
    `elementSeparator: "||"` returned `TA1||000000001||260601||1200||A||000`, which inside an ISA
    reads back with `TA1-01` empty and `ackCode: "R"` - an Accept emitted as a Reject.

    **🛑 Two things change for a caller.** A spec that failed at base with an `X12ParseError` /
    `X12_INVALID_DELIMITERS` escaping out of the `build*` call now refuses earlier with that
    builder's own typed error and its existing code, so a consumer catching the parse class stops
    catching and one catching the build class starts; no code is minted. And a
    `segmentTerminator` of `"~\r\n"` - asking for line-broken output - **built with `warnings: []`
    before and is refused now** (no count of such shapes is published; that is not the only one).
    The check also runs **before** the control-number guards, so a spec that is mis-shaped _and_
    carries an empty control number now reports the delimiter refusal rather than the control-number
    one, on the same code. A message moves; no code does. It never did what it looked like it did: `parseX12` tolerates CR/LF
    between segments, so the model recorded `~` and `serializeX12` emitted no line breaks. Reading a
    file that is written that way is unaffected; only declaring it on emit is.

  - **🩺 `PRE-EXISTING` and NOT closed by that refusal: it is a UTF-16 CODE-UNIT rule, not a byte
    rule.** A character that is one code unit but several bytes on the wire satisfies it and still
    displaces every ISA position after it, so `componentSeparator: "\u00a7"` builds with
    `warnings: []` and a byte-oriented receiver reads ISA-16 as `0xC2` and the terminator as `0xA7`.
    The smart quote `"\u2019"` a companion-guide PDF gives you instead of `'` does the same.
    Disclosed rather than guarded: the read side counts code units too (`charAt`), so moving one side
    alone would put emit and read back out of step, which is exactly what that refusal exists to
    prevent. **Declare delimiters from the basic single-byte set.**

  - **🩺 PRE-EXISTING and NOT closed here: on a degenerate set a `?~` still swallows the segment
    terminator.** `findUnescapedTerminator` guards its own role only, so with `?` as the element
    separator a segment that ends in an EMPTY LAST ELEMENT puts a `?` immediately before the
    terminator and the scanner reads it as an escape: `PER?IC?NAME?TE?5551234?EX?~SE?3?0001~` frames
    as ONE segment and raises `X12_MISSING_SE`. This slice does not touch framing. But **the READ of
    that merged blob did move, so do not take "framing is untouched" as "nothing about this residual
    moved"**: at `0.0.15` the merge produced one `(non-spec)` element no walker looked at, and here
    it frames, so `~SE` and the SE's own control number land in `PER`'s communication-number slots.
    `X12_MISSING_SE` still fires, so it is not silent. Both are pinned in
    `test/parser-segment-degenerate-release-separator.test.ts` so they cannot move unnoticed.
  - **Values are still RAW, pre-`?`-unescape**, and `elements.join(separator)` still reproduces the
    segment byte for byte, so `serializeX12`'s count substitution and the byte-exact round trip are
    unaffected. Both are pinned.
  - **The ISA is untouched and stays positional**, for the reason the envelope-splitter entry above
    gives: it is fixed-width, which is what lets the delimiters be recovered from it at all.

- **🩺 `buildInterchange` now RELEASES GS-04, GS-05 and GS-07, so the interchange it hands back
  reports the values you passed, and the bytes it writes for such a value CHANGED**
  (`X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE`). Through `0.0.15` it mapped its release escaper over
  GS-01, GS-02, GS-03, GS-06 and GS-08 and wrote `groupDate` (GS-04), `groupTime` (GS-05) and
  `responsibleAgencyCode` (GS-07) raw. It returns `parseX12` of the bytes it just wrote, so a value
  carrying an active delimiter in one of those three took a slot of its own and shifted every element
  after it down one, inside a single call. Measured on one group with
  `versionRelease: "005010X222A2"` and `groupControlNumber: "1"`:

  | spec field                     | read GS-06 | read GS-08 | warnings                                                |
  | ------------------------------ | ---------- | ---------- | ------------------------------------------------------- |
  | `groupDate: "2026*0601"`       | `"1200"`   | `"X"`      | `X12_CONTROL_NUMBER_MISMATCH`                           |
  | `groupTime: "12*00"`           | `"00"`     | `"X"`      | `X12_CONTROL_NUMBER_MISMATCH`                           |
  | `responsibleAgencyCode: "X*Y"` | `"1"`      | `"Y"`      | none                                                    |
  | `groupTime: "12~00"`           | absent     | absent     | `X12_UNEXPECTED_SEGMENT`, `X12_CONTROL_NUMBER_MISMATCH` |
  | `groupDate: "20260601?"`       | `"X"`      | absent     | `X12_CONTROL_NUMBER_MISMATCH`                           |

  **🩺 The `responsibleAgencyCode` row is the one to know about, because nothing was raised on any
  channel.** GS-06 kept its own slot, so it still reconciled against GE-02 and no control-number
  warning fired; what moved was GS-08, the version / release / industry identifier code. All five
  rows now read the values the caller passed, with an empty warning array.
  - **🛑 It changes bytes, and the bound is the same one the two entries below carry.** A value
    containing none of the four delimiters and no `?` is emitted byte-for-byte as before, which is
    every conformant GS-04 / GS-05 / GS-07. **Read the property rather than a direction list:** the
    interchange the call returns now reports the values you passed, where before it reported whatever
    the shift left in each slot. **What is narrower here than in the two entries below: no reader
    moved.** An inbound document from a trading partner decodes exactly as it did at `0.0.15`; what
    changed is what this library emits.
  - **Read the delimiter set by ROLE, never by byte.** `InterchangeSpec` lets you declare all four,
    so which BYTES shift is a property of the set you declared: with `elementSeparator: "|"` it was a
    GS-07 of `"X|Y"` that took GS-08's slot and `"X*Y"` that was inert. **Only the element separator
    and the segment terminator ever shifted the segment's own framing, plus a `?` immediately before
    the element separator.** The **repetition** and **component** separators moved the dot-path
    reader instead, and releasing them is a **gain** there: the
    composite read `"07-1"` answered `"X"` for `"X:Y"`. **The measured cost is a mid-string `?`,
    and only on the surfaces documented as raw** - `gs.elements[4]` reads `"2026??0601"` where it
    read `"2026?0601"`, while the dot-path read of that value unescapes and is unchanged. No total is
    published: that is what was measured, not a closed account.
  - **A caller who was pre-releasing these values themselves is now escaping twice.** `"2026?*0601"`
    in gives `2026???*0601` out and a dot-path read of `"2026?*0601"` where it read `"2026*0601"`.
    Drop the hand-rolled escape.
  - **A wrong-typed GS element now names its slot.** The type check runs over the unescaped parts, so
    a numeric `groupDate` still refuses with `buildInterchange: "GS"-04 must be a string` rather than
    degrading to the builder-named message the escaper alone would give. The five slots that already
    escaped gained the slot name with it. **`null` and `undefined` in these three fields are ABSENT,
    not refused** - each resolves through a default before either guard sees it.
  - **A LITERAL segment id this library writes is never escaped, and that is a rule rather than an
    omission.** `esc` releases against the delimiter set the CALLER declared, and a
    `componentSeparator` of `"S"` is admissible, so escaping element 0 would turn the literal `"GS"`
    into `G?S` and the group header would stop being a `GS`. `GE`, `ST`, `SE` and `IEA` already
    followed that rule. **Read "literal" strictly, and this one is `PRE-EXISTING` rather than
    anything this release changed:** a `SegmentSpec` body segment is `[segmentId, ...elements]`
    supplied wholesale, `buildInterchange` has released that caller-supplied id since before this
    release, and `SegmentSpec`'s JSDoc says it is emitted verbatim. The two disagree. It is noisy
    rather than silent - a `?`-prefixed id is rejected by the envelope walker as an orphan with
    `X12_UNEXPECTED_SEGMENT` - and which side is wrong is a decision, so it is recorded rather than
    changed here.
  - **What this does NOT close.** `buildInterchange`'s IEA-02 does not go through the escaper: it is
    padded and has to stay byte-equal to the fixed-width ISA-13 it reconciles against, so that is a
    decision of its own. The ISA fixed-width slots are still outside both guards. And an unescaped
    active delimiter is still not safe anywhere, because that is what a delimiter is.

- **🩺 `buildTA1` now RELEASES its five caller-supplied elements, so an Accept acknowledgment this
  library emits no longer reads back as a Reject, and the bytes it writes for such a value CHANGED**
  (`X12-TA1-EMIT-NOT-RELEASE-AWARE`). Through `0.0.14` `buildTA1` joined the five values with the
  element separator and escaped none of them, so a value carrying an active delimiter took a slot of
  its own and shifted every element after it down one. TA1-04 is the disposition and TA1-05 the note,
  and `parseTA1` narrows an out-of-enum TA1-04 to `R`. Measured with `parseX12` + `parseTA1` over
  `ISA … <what buildTA1 returned> … IEA`, `ackCode` `"A"` and `noteCode` `"000"` throughout:

  | `interchangeControlNumber` | emitted at `0.0.14`               | read `ackCode` | read TA1-01          | warnings                 |
  | -------------------------- | --------------------------------- | -------------- | -------------------- | ------------------------ |
  | `"000000001"`              | `TA1*000000001*260601*1200*A*000` | `"A"`          | `"000000001"`        | none                     |
  | `"00000001?"`              | `TA1*00000001?*260601*1200*A*000` | `"R"`          | `"00000001?*260601"` | none                     |
  | `"0000*0001"`              | `TA1*0000*0001*260601*1200*A*000` | `"R"`          | `"0000"`             | none                     |
  | `"0000~0001"`              | `TA1*0000~0001*260601*1200*A*000` | `"R"`          | `"0000"`             | `X12_UNEXPECTED_SEGMENT` |

  **An Accept acknowledgment this library emitted read back as a Reject, on the element that
  reassociates it, with nothing raised on any channel.** The `*` and `~` rows did that on every
  released version; the `?` row is the one the envelope-splitter entry above opened. **🩺 The inverse
  exists and is the less safe direction:** the read narrows an out-of-enum TA1-04 to `R`, so a
  well-typed shift always lands on Reject, but `noteCode` is checked by the type system and by
  nothing at run time, so a `noteCode` of literally `"A"` shifted onto TA1-04 and made a **Reject
  read back as an Accept** - and a sender who reads an Accept does not resubmit. All four now read
  back the disposition that was emitted.
  - **The grounding is inside this package, not in a spec clause**, the same tiebreak the
    envelope-splitter entry records. `buildTA1` emitted bytes that this package's own reader decoded
    into a different disposition than the caller asked for, while every other builder already
    released the same class of element through the same helper. Nobody here has read a clause that
    settles it, and nothing above claims one.
  - **🛑 It changes bytes this library already put on the wire, which is the cost.** A value
    containing none of the four delimiters and no `?` is emitted byte-for-byte as before, and that
    is every conformant TA1: TA1-01 echoes ISA-13, TA1-02 / TA1-03 echo ISA-09 / ISA-10, and
    TA1-04 / TA1-05 are code list values. A value containing one is now released.
  - **🛑 No warning code is added and no case moves onto a new code, but the consumer predicate
    MOVES IN BOTH DIRECTIONS.** `parseTA1` of a `buildTA1` output now reports the disposition and
    note the caller passed; before, it reported whatever element the shift left in TA1-04, which
    could be the caller's, a coincidental in-enum value, or an out-of-enum one narrowed to `"R"`. So
    `ackCode === "R"` **stops** firing where an Accept had been shifted onto it, and **starts**
    firing where a Reject had been shifted off it: `interchangeTime: "12*A"` with `ackCode: "R"`
    read `"A"` before and reads `"R"` now, with every field a valid member of its union.
    `ackCode === "A"` moves the same two ways. What is one-directional is the safety, which is a
    different statement: nothing now reports a disposition the caller did not ask for.
  - **What releasing the REST of the set costs, and where it does not cost.** Only `*`, `~` and a
    `?` immediately before the separator ever shifted the segment's own element framing. **`^` and
    `:` moved the dot-path reader instead, and releasing them is a gain there:**
    `getSegmentValue(ta1, "01")` answered `"0000"` through `0.0.14` for a control number of
    `"0000^0001"`, silently truncating the reassociation key to the first repetition, and answers
    `"0000^0001"` now; the composite read `"01-1"` answered `"0000"` for `"0000:0001"` and answers
    the whole value now. **The measured pure cost is a mid-string `?`, and only on the surfaces
    documented as raw**: `raw` and `elements` read `"0000??0001"` where they read `"0000?0001"`,
    while every dot-path read unescapes and answered `"0000?0001"` on both.
    No total is published: that is what was measured, not a closed account. (`getSegmentValue`
    takes an `X12Segment` and `Ta1Segment` carries no `id`, so add one to read a TA1 through it.)
    **🩺 A clause naming `parseTA1`'s fields as a third such surface stood here and is DELETED, not
    reworded** - `X12-TA1-RESIDUALS` made those fields post-unescape, so it is measured false.
  - **A caller who was hand-rolling the escape** (the remedy this file named while the defect was
    open) regresses on both kinds of surface: `"00000001??"` in, `TA1*00000001????*…` out, and
    `getSegmentValue` answering `"00000001??"` where it answered `"00000001?"`. The framing and the
    disposition stay correct, but **drop the hand-rolled escape.**
  - **An EMPTY control number was not refused by this slice, and is refused by the NEXT one.**
    `escapeRelease` early-returns on `""` and `buildTA1` carried no required-field guard, so
    `interchangeControlNumber: ""` emitted `TA1**260601*1200*A*000` with `warnings: []`, here and at
    every earlier release. `X12-EMPTY-CONTROL-NUMBER-FABRICATED` closed it across every builder; see
    the entry at the top of this file, including the whitespace-only residual it leaves open.
  - **🩺 The READ half did not move IN THIS SLICE, and `X12-TA1-RESIDUALS` is the one that moved
    it** - see the entry at the top of this file. A control number of `"00000001?"` read back as
    `"00000001?*260601"` before this slice and as `"00000001??"` after it; the clause that stood
    here telling callers to apply `unescapeRelease` themselves is **deleted, not reworded**, because
    the library now does it.
  - **The release is scoped to the delimiter set the CALLER states.** `BuildTA1Options` gained
    `repetitionSeparator` / `componentSeparator` / `segmentTerminator` beside the existing
    `elementSeparator`, the same four `build999` already takes, and they exist for escaping and
    nothing else - `buildTA1` still emits no terminator. Escaping against a guessed set is a value
    corruption rather than a safe default: `unescapeRelease` preserves `?X` verbatim for any `X`
    outside the declared set, so a value released against the wrong delimiter comes back carrying a
    stray `?`. **The defaults are the cosyte archetype and this function cannot verify them** - if
    you embed a TA1 in an envelope that declares different separators, state them.
  - **A non-string element now REFUSES** with `AckBuildError` / `X12_ACK_INVALID_SPEC`, and that is a
    prerequisite rather than a bonus. Releasing a value means routing it through the escape helper,
    and the bare `escapeRelease` underneath it returns its empty accumulator for a `number`, so
    escaping without the type check would have replaced a shifted TA1-01 with a vanished one. A
    numeric control number emitted `TA1*12345*…` at `0.0.14` (the number surviving onto `elements`,
    inside a value typed `readonly string[]`) and an absent one emitted `TA1**250101*…`; both refuse.
    **No existing refusal moves code:** `ackCode` `"A"` with a non-`000` note still reports
    `X12_TA1_ACCEPT_WITH_NOTE` and still runs first.
  - **What this does NOT close.** `buildTA1` still uses no segment joiner, so its refusal names the
    builder and never the slot; `buildInterchange` did not escape GS-04 / GS-05 / GS-07 at this
    release, which `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` then closed; and an unescaped active
    delimiter is still not safe anywhere, because that is what a delimiter is.

- **🩺 BREAKING for `build277` callers: a 277 service line now REQUIRES `unitsOfService`, because
  SVC-07 is a required element in `005010X212` and this library was not emitting it at all**
  (`X12-277-SVC07-NOT-DECODED`). Through the release before this one `get277Status` read SVC-01
  through SVC-04 and stopped, and `build277` emitted exactly those four, so **every X212 277 this
  library produced with a Loop 2220 service line was short a required element** and every 277 it read
  silently discarded the submitted units. Both sides are fixed: `X12ServiceLineStatus.unitsOfService`
  and `Build277ServiceLineSpec.unitsOfService` carry SVC-07 (X12 element 380, Quantity).

  **The two TR3s disagree about the usage and so do the two builders, on purpose.** In `005010X212`
  the element is usage **R**, so `build277` now throws `ClaimStatus277BuildError` with code
  `X12_277_BUILD_INVALID_SPEC` for a service line that omits it. In `005010X214` it is usage **S**,
  so `build277CA` accepts the identical spec and simply omits the element. Usage read from the pyx12
  005010 maps (`277.5010.X212.xml`, `277.5010.X214.xml`), which are outside this repository; the two
  TR3s also name it differently, "Units of Service Count" in X212 and "Original Units of Service
  Count" in X214, and one model field carries both.

  **The count is never defaulted, in either direction.** A quantity the caller did not supply is a
  quantity nobody sent, and a units figure is one a payer reprices against; supplying a `1` would be
  inventing data on the wire. If you are emitting X212 277s today, this is a compile-time-invisible,
  run-time refusal on the first build after upgrading, and that is the intended shape.

  **SVC-05 is deliberately still unread on the 277, and that is not the same gap.** It is usage **N**
  in both 277 TR3s. On the **835** SVC-05 is the Units of Service **Paid** Count and is read; reading
  it on a 277 "for symmetry" would put a quantity on the model that no 277 sender ever wrote. Same
  element number, different TR3.

  **🩺 Read the scope literally: ONE element's usage was fixed, and an emitted service line is NOT
  thereby conformant.** This was not a 277 usage audit, and **no census of what remains is published
  here**, on purpose: other required elements of the same `SVC` are still unguarded, and finding
  another is expected rather than a new defect. To name two, `SVC-01` (the composite procedure
  identifier) and `SVC-02` (Line Item Charge Amount) are both usage **R** in X212 and both optional
  on `Build277ServiceLineSpec`, so a spec supplying only `unitsOfService` still emits
  `SVC*******1~` with no refusal. **The missing guard is what is pre-existing, not that byte
  string** - at base the same spec emitted a bare `SVC~`, because the SVC-07 slot did not exist. `SVC-03` (Line Item Payment
  Amount) is usage **R** in X212 and usage **N** in X214 and is optional in both builders. And the
  read side is unchanged and still lenient: an X212 277 arriving with no SVC-07 raises **no
  warning**, because that would need a new Tier-2 registry code and the defect this slice closes is
  on the emit side. All of it is pre-existing and reproduces at `e3cdf49`; widening the guard would
  have turned this into that audit, which is its own item.

- **🩺 An unparseable decimal reads `undefined`, and it warns.** A decimal element that is present
  and that this library cannot decode as a decimal (`1,234.56`, `$450.00`, `N/A`) yields no value,
  and the reader has to put something in its place. **Through `0.0.12` a slot typed `X12Decimal` got
  `X12Decimal.ZERO`**, so a consumer that read only the model saw a `0` where the payer sent
  something unreadable; **as of `0.0.13` no reader substitutes `X12Decimal.ZERO` for a value it did
  not decode** - every slot that used to get one is `X12Decimal | undefined` and reads `undefined`,
  which is a breaking type change on the read model and is the point of it. **Read that as a rule
  about the substitution, not as a census of the model:** an optional slot already read `undefined`,
  and some rows are dropped whole, which is a different shape with a report of its own
  (`X12_AMOUNT_ROW_DROPPED`, the next entry). **Every one of those
  outcomes emits `X12_UNPARSEABLE_DECIMAL` at the failing `position.elementIndex`, because the
  warning is a property of the READ rather than of what the reader then does with it.** No list of
  the outcomes is published here, on purpose: a first draft enumerated three and a review measured a
  fourth, and the rule is what holds, not the census.

  Three scoping facts that are easy to get wrong in the other direction:
  - **An ABSENT element does not raise this code.** It reads `undefined` and
    `X12_UNPARSEABLE_DECIMAL` is not emitted for it, so `undefined` alone does not tell you which of
    the two happened - the warning at that `elementIndex` does, and `readElementDecimal` gives you
    the same distinction in band. Read that as a statement about **this code**, not as "an absent
    element is silent": where the absent element takes a whole `AMT` / `ADX` row off the model, the
    drop is reported by `X12_AMOUNT_ROW_DROPPED` at that segment (the next entry), which is
    raised for both routes and therefore separates neither.
  - **🩺 An unwarned value is not thereby trustworthy in general, and this is the one inversion to
    refuse.** The warning is a property of a decimal READ, not a property of a model slot. A slot
    the reader never read at all cannot warn, and it still holds whatever the accumulator was seeded
    with. **What this guarantees is narrower and exact: an unwarned value AT AN ELEMENT A READER
    DECODED is what the sender sent.** The known slot of the other kind, an 837 service
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

- **🩺 An `AMT` or `ADX` whose amount does not decode loses its WHOLE row, and says so as of
  `0.0.13`.** These segments carry an amount plus the thing the amount is about - AMT-01's qualifier,
  ADX-02's adjustment reason code, ADX-03 / ADX-04's reference. The readers build no row at all when
  the amount (AMT-02, ADX-01) decodes no value, so what the sender did state goes with it: through
  `0.0.12` `AMT*B6~` gave `claim.amounts: []` and `warnings: []`, which reads exactly like a document
  that never carried the segment. **`X12_AMOUNT_ROW_DROPPED` now reports it**, anchored at the
  `AMT` / `ADX` and carrying **no `elementIndex`**, because one of its two routes is an absent
  element and an absent element has no index to name. Four surfaces raise it: the 835's `AMT`, the
  837's `AMT`, the 834's coverage `AMT` (on that **member's** own `warnings`, exactly as the decimal
  sink beside it is scoped) and the 820's `ADX`. On the 835 and the 837 the `AMT` attaches to the
  open **service line** first and to the claim only when there is none, so **the row lost may be a
  line-level one** - do not read an unchanged `claim.amounts` as evidence the warning is stale. Four
  bounds worth stating:
  - **It is additive, and no case moved onto it.** A present-but-undecodable amount still raises
    `X12_UNPARSEABLE_DECIMAL` at its own `elementIndex`, now alongside this code rather than instead
    of it, so a predicate written against that code fires on exactly the documents it fired on
    before. Whether one accompanies this code at the same `segmentIndex` is what tells the absent
    route from the unparseable one, since this code is raised for both and discriminates neither.
  - **It reports a row whose AMOUNT was read and decoded no value, and nothing wider.** State it as
    a property of the READ, not of the walker's control flow. A segment discarded before its amount
    is read is not on this channel (the 834's `AMT` with no `HD` open, the 820's `ADX` with no
    remittance open), and neither is one whose amount decoded and then found nothing to attach to
    (the 835's and the 837's `AMT` before any claim). **Do not write it as "nothing open means
    silent":** the 835 and the 837 decode first, so an `AMT` with an absent amount and no claim open
    does raise this code.
  - **🔴 An 820 `RMR` is not on this channel, and the reason is NOT that its row survives.**
    `decodeRmr` drops on open-item identity (RMR-01 and RMR-02 both empty), **before** RMR-04 is
    read. So an `RMR` that states an open item and no amount keeps its row with `amountPaid` left
    `undefined` and there is nothing to report - but an `RMR` that states an **amount and no open
    item** is dropped whole, taking a stated payment, its payment-action code and its amount due
    with it. Nothing failed to decode there, so it is not this code's shape;
    `X12_STATED_AMOUNT_DISCARDED`, below, is what reports it.
  - **A Loop 2430 `AMT` under an open `SVD` is discarded outright, and this code is not what says
    so.** With a claim and a line open, the 837's adjudication skip drops an `AMT` that decoded
    perfectly well. Through `0.0.12` that was silent while one that decoded nothing raised this
    code, so the report was present exactly where less was lost;
    `X12_STATED_AMOUNT_DISCARDED`, below, closed that.

- **🩺 A row the sender DID state can still be discarded, and says so as of `0.0.13`.** The code
  above is about an amount this library could not read. This is the opposite case: **the reader
  discarded the row for a reason that is not about the amount at all**, so the amount was never the
  problem and, on one of the two routes, was never even looked at. The bytes stay verbatim on
  `tx.segments[…].raw`; decode them yourself. Through `0.0.12` both routes were silent on every
  channel. **`X12_STATED_AMOUNT_DISCARDED` reports them**, anchored at
  the segment and carrying **no `elementIndex`**. The two routes, enumerated:
  - An **820 `RMR`** under an open remittance loop whose RMR-01 and RMR-02 are **both empty** while
    RMR-04 or RMR-05 is populated. `decodeRmr` refuses the open item on identity before either
    amount element is read, so a stated payment, a stated amount due and RMR-03's payment action
    code leave the model together. A bare `RMR~` states nothing and stays silent.
  - An **837 `AMT`** arriving while a Loop 2430 line adjudication (`SVD`) is open, whose AMT-02
    decoded. The v1 adjudication model carries no amount row, and attaching one to this
    submission's own service line would put another payer's figure on it, so the row is skipped.
    `AMT*EAF` (Remaining Patient Liability) on a Loop 2430 is exactly the shape being lost.

  Three bounds worth stating:
  - **It is additive, and nothing moved onto it.** `X12_AMOUNT_ROW_DROPPED` and
    `X12_UNPARSEABLE_DECIMAL` fire on exactly the documents they fired on before, pinned by
    committed tests.
  - **The two amount-row codes are disjoint and can never name the same segment**, because this one
    requires an amount element the sender populated and the other requires one that decoded no
    value. The code you get is the discriminant.
  - **It reports a segment that arrived while the loop that would carry its row was open.** An
    `AMT` or `ADX` reaching a reader with **no such loop open** is a different loss and is **still
    silent**: the 834's `AMT` with no `HD` open, the 820's `ADX` with no remittance open, and the
    835's and the 837's `AMT` before any claim or service line is open. **🔴 Read "still silent"
    literally and no wider: at those last two sites the inversion above SURVIVES.** With no claim
    open an 835 `AMT*B6~` raises `X12_AMOUNT_ROW_DROPPED` while `AMT*B6*500.00~` raises nothing, so
    the channel still reports the smaller loss there. `PRE-EXISTING` and unchanged by this release. And on the `RMR` route this
    code says nothing about whether the amount would have decoded, because the row is refused before
    the decode is attempted, so **no `X12_UNPARSEABLE_DECIMAL` accompanies it even where the bytes
    are unreadable.** It is raised on `RMR****1,234.56~` exactly as on `RMR****150.00*150.00~`, so
    **never read an unaccompanied instance as evidence the bytes are postable**; only the `AMT`
    route guarantees a decodable amount, because there AMT-02 decoded before the row was skipped.

- **🩺 An 835 balance invariant with an undecoded term is reported as UNEVALUABLE, not as a
  mismatch.** The three TR3 005010X221A1 §1.10.2 equations (line, claim, top-of-remit) read amounts
  that are all `X12Decimal | undefined` as of `0.0.13`. Where any term of an equation is
  `undefined`, the equation is not run and `X12_835_BALANCE_NOT_EVALUABLE` is emitted instead of
  `X12_835_REMIT_BALANCE_MISMATCH`, because nothing was measured out of balance: substituting `0`
  for the missing term would be this library asserting a total nobody sent. **Through `0.0.12` that
  substitution is exactly what happened**, so an 835 with an absent `CLP-03` reported a mismatch
  between the payer's own amounts and an invented zero. Two bounds worth stating:
  - **An EMPTY list is not an absent term.** A claim carrying no `CAS` really did state no
    adjustments, and that sums to `X12Decimal.ZERO`. Only a term this library decoded no value from
    stops the equation.
  - **`build835` cannot reach it from TypeScript.** Every balance term on `Build835Spec` is a
    required `X12Decimal`. A JS caller passing `undefined` gets `X12_835_BUILD_INVALID_SPEC` (an
    untyped `TypeError` through `0.0.12`), deliberately NOT the build-side balance-mismatch code.

- **The public `elementDecimalOrZero` helper still substitutes `X12Decimal.ZERO`, and no reader in
  this library calls it any more.** Its documented behaviour is unchanged and it stays exported, so
  a consumer walking segments itself can still opt into the substitution - knowingly, rather than by
  inheriting a convention the `get*` readers no longer follow. `elementDecimal` and
  `readElementDecimal` are the honest routes.

- **🩺 An 837 service line whose `SVx` never decoded ships with `charge` and `units` `undefined`,
  and it warns.** `get837Claims` resolves ONE variant for the submission, from the
  caller's `type` option, else ST-03's implementation-convention reference, else the first `SVx`
  segment present. A Loop 2400 line is then decoded only by the `SV1` / `SV2` / `SV3` that matches
  that variant. When none arrives, because the line carries an `SVx` for a different variant (an
  ST-03 of `005010X222A2` on a file whose lines are `SV2`, or a `{ type: "P" }` over the same) or
  because it carries no `SVx` at all, **nothing on the service segment is read**: the line's
  `charge` and `units` hold the accumulator's seeded `undefined`, and its procedure code,
  modifiers, unit of measure and place of service are equally undecoded. **That line now emits
  `X12_837_SERVICE_LINE_NOT_DECODED`, anchored at the `LX` that opened it.** Read the values off
  `tx.segments[…].raw` and decide which of the two disagreeing signals the sender meant.
  - **Ignoring the foreign `SVx` is deliberate and is not the limitation.** `SV1-02` and `SV2-03`
    are both the line charge, so decoding an `SV2` into a Professional line would mis-read money.
    Refusing to read is the safe half; doing it silently was the defect.
  - **`undefined` does not say WHY, which is what the warning is for.** `charge` and `units` are
    `X12Decimal | undefined` as of `0.0.13` (`X12Decimal` reading a fabricated `0` through
    `0.0.12`), so a consumer that never reads `.warnings` at least sees that nothing was decoded -
    but it cannot tell this case, where no `SVx` was read at all, from an `SVx` that WAS read and
    carried no charge element. Only `X12_837_SERVICE_LINE_NOT_DECODED` separates them.
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
    **🩺 Its anchor moved, so a consumer joining on `position.segmentIndex` gets a different
    segment than it did on `0.0.10`.** `X12_837_UNKNOWN_VARIANT` now points at the **`ST`**
    (`tx.segments[0]`), which carries the ST-03 the resolution reads. Through `0.0.10` it pointed at
    `tx.segments[1]`, the **`BHT`** - a segment with no part in variant resolution. No
    `elementIndex` is set, deliberately: one of the two routes into this warning is an ST-03 that is
    absent entirely, and on that route the `ST` has no element 3 to name.

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
  - **What becomes of a `DTP` / `AMT` / `NTE` / `REF` / `N3` / `N4` / `PER` after a dropped `LX`
    depends on the route, and is not simply "absent" on either. Two drafts stated it unqualified,
    in opposite directions, and both were wrong.**
    With a `CLM` open (the variant route), the line service date, amount and note land among the
    **claim-level** ones, indistinguishable from them, and a trailing `REF` lands among the
    claim-level references. With **no** `CLM` open, **all seven are discarded**: nothing following
    that `LX` attaches to the party named BEFORE it. The `DTP` / `AMT` / `NTE` already were
    discarded on that route at `0.0.10`; the `REF` / `N3` / `N4` / `PER` are what changed. **Read
    the segments off `tx.segments[…].raw` rather than inferring either outcome.**
    **🩺 CHANGED, and the change moves values off the model that `0.0.10` put on it.** Through
    `0.0.10` - the current release as this was written, so a consumer on it has the old behaviour -
    the no-claim route did not discard these. Measured, on a payer: a line-item control number
    surfaced in a _later_ claim's `payer.references`, and an `N3` / `N4` / `PER` gave that payer a
    street address and a contact it never had. **Never read that as all four kinds on every party** -
    this reader does not surface every one of those kinds on every party, and a `PER` on a patient
    or a pay-to address reached the model on no release. **No per-kind, per-party map is published
    in this document, deliberately**, and the `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` entry
    below does not carry one either: it says outright that whether such a segment would have
    attached is a separate question it does not answer. `tx.segments` is what settles it for a
    given document. **If you read `0.0.10` or earlier and relied on an
    entity's `address`, `contacts` or `references`, those slots could carry line-level values from a
    dropped Loop 2400.**
  - **🩺 That change is a TRADE, and its cost is that a conformant entity segment can now be
    dropped.** The TR3s nest Loop 2400 inside Loop 2300 and say nothing about an `LX` elsewhere, so
    which party a segment following a **stray** `LX` belongs to is not derivable from the spec in
    either direction. Where the `LX` was injected into an **entity** loop, the `N3` / `N4` / `REF` /
    `PER` after it really were that entity's, and they are now discarded: measured, a payer that
    kept its `PO BOX` address, its `2U` secondary id and its contact at `0.0.10` comes back with
    `address: undefined`, `references: []` and `contacts: []`. The direction was chosen on this
    library's own invariant, not on a clause: a mis-attribution puts a value on an object the sender
    never put it on, indistinguishable from real data, whereas the bytes of a discarded segment are
    still on `tx.segments`.
    **🩺 The discard is REPORTED, by a code of its own, at the segment itself.** Each such
    `N3` / `N4` / `PER` / `REF` raises `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, so the loss is
    on the warning channel once per discarded segment. `X12_837_SERVICE_LINE_DROPPED` at that `LX`
    reports the **service line** and not the entity's address, id or contact, so it never named this
    loss and does not now. **The channel is still not a complete account of the document** -
    `tx.segments` is - and the loss itself is unchanged: reporting it did not restore it. Both are
    pinned by tests. **Read the new code's bound in its own entry below before restating it:** it is
    not a general "this segment reached no party" report.
  - **An `SVx` with no `LX` at all raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX`, the 26th Tier-2
    code, anchored at the service segment itself.** Through `0.0.10` it was dropped in SILENCE:
    both codes above are anchored at the `LX`, so a service segment that never had one had nothing
    to anchor to and reported on no channel. See the next entry for what that code says and what it
    still does not. **The general caveat stands even so: the warning channel is a report of the
    losses this library knows how to name, and `tx.segments` is the only complete account of the
    bytes.**

- **🩺 An `SV1` / `SV2` / `SV3` that arrives with no Loop 2400 open raises
  `X12_837_SERVICE_SEGMENT_WITHOUT_LX`, anchored at the service segment itself.** The third code in
  this family, and the one that needed a different anchor: the other two both name an `LX`, and this
  case is defined by there being no line open to name one. **Read that condition literally.** It is
  **not** "the file contains no `LX`" - an `LX` in an earlier claim is still an `LX`, and
  `CLM*1~ LX*1~ SV1~ CLM*2~ SV1~` raises this code on the second `SV1` while the first claim keeps
  its decoded line. Nothing the segment carries is read - not its charge, its
  units, its procedure code, its modifiers, its unit of measure or its place of service - no line
  reaches any claim's `serviceLines`, and nothing is fabricated to stand in. **Through `0.0.10` -
  the release published as this was written, so a consumer who has not upgraded still has it - that
  was the whole of the report: a charge, a quantity and a procedure code left the typed model with
  `warnings: []` and the claim read as one that simply had no service lines.** Five bounds, each
  measured:
  - **The three codes never report the SAME service segment**, because the other two are raised at
    an `LX` and this one only where no line is open. A document with several claims can still carry
    all three, on three distinct segments; that case is a committed test.
  - **An `LX` that opened nothing suppresses it for the segments inside that dropped loop**, which
    is deliberate: the loss is already named, once, at the `LX`. The suppression is scoped to the
    dropped loop and is cleared by the next flush, so a later orphan in the same transaction is
    still reported. Both halves have a red negative control.
  - **It reports once per service segment, not once per loop.** Two orphan `SVx` segments raise two
    warnings at two positions, so a consumer can name both rather than infer a count from one.
  - **The segment is NOT decoded into any line.** `SV1-02` and `SV2-03` are both the line charge, so
    reading a service segment into a line the walker never opened mis-reads money. Refusing to read
    is the safe half; doing it silently was the defect. **This does not change the `SV1-02` case
    above:** an absent `SV1-02` on a line that DID open reads `undefined` as of `0.0.13`, a
    confident `0` through `0.0.12`, and this code has nothing to do with either.
  - **🩺 IT SAYS NOTHING ABOUT THE VARIANT, AND A FIRST DRAFT OF THIS BOUND CLAIMED IT DID.** Variant
    resolution runs before the walk. A caller-supplied `type` option wins first; absent one, and
    where `ST-03` names no implementation convention this reader recognises, it **falls back to the
    first `SVx` segment id anywhere in the transaction body - orphans included**. So a stray `SV2`
    under an unrecognised `ST-03` re-types the whole submission as Institutional, and every
    conformant `SV1` line in it then reads `charge` `undefined`, `units` `undefined` (both a
    fabricated `0` through `0.0.12`) and an `undefined` procedure
    code - `undefined`, not `""`, which on such a line is the `revenueCode`. Passing
    `{ type: "P" }` reads the same document correctly. Measured, both trees: `PRE-EXISTING`,
    identical at `0.0.10`, **not** introduced or changed by this code, and **not** narrowed here - excluding
    orphans from the fallback would change how existing documents decode and is its own slice. It
    is warned rather than silent (`X12_837_SERVICE_LINE_NOT_DECODED` at each `LX`), and
    `submission.variant` is the field that tells you. **The resolution itself is now reported too
    wherever it was contested**, which is the entry below; the fallback is still not narrowed.

- **🩺 An 837 variant the `SVx` fallback resolved in a body that names more than one variant raises
  `X12_837_AMBIGUOUS_VARIANT`, anchored at the `ST`.** The fallback is unchanged and is deliberately
  NOT narrowed: it still takes the **first** `SV1` / `SV2` / `SV3` in the body, orphans included, so on
  every document that reaches it the variant resolved is byte-for-byte what it was through `0.0.13`.
  **WHICH documents reach it changed in this release** - see the ST-03 entry at the top of this list. What this code
  adds is that the resolution said so. Through `0.0.13` a stray `SV2` re-typed a whole Professional
  submission Institutional and **only the line-level consequences were on any channel** - a consumer
  routing on `submission.variant` saw a confident `"I"` with nothing to contradict it. Four bounds,
  each a committed test:
  - **It reports the RESOLUTION, never the document.** A caller-supplied `type` wins ahead of the
    fallback, and so does an `ST-03` this reader turns into a variant; in
    either case no guess was made and this code is not raised **however mixed the body is**. Never
    restate it as "the file carries more than one kind of service segment".
  - **🩺 Which service segment is the stray one is NOT decided, and nothing here should ever start
    deciding it.** This reader cannot tell a stray service segment from a conformant one, and the
    fallback takes the first whether or not a Loop 2400 was open at it, so an orphan decides the
    variant like any other. Reporting the conflict is honest; picking a winner would be inventing.
  - **It is ADDITIVE and nothing moved onto it.** `X12_837_SERVICE_LINE_NOT_DECODED`,
    `X12_837_SERVICE_SEGMENT_WITHOUT_LX` and `X12_837_SERVICE_LINE_DROPPED` fire on exactly the
    documents they fired on before **this code was added**, in the same positions, and no predicate
    changes meaning because of this code. **That is a claim about this code and NOT about the
    release:** the ST-03 entry at the top of this list changed which documents reach the fallback at
    all, and a line whose `SVx` kind disagrees with a now-recognised `ST-03` stops decoding and
    starts raising `X12_837_SERVICE_LINE_NOT_DECODED`. Read that entry beside this bound.
  - **It can never travel with `X12_837_UNKNOWN_VARIANT`**, which is the other outcome of the same
    resolution: a body with conflicting service segments has, by construction, at least one to fall
    back on. It fires **once per transaction**, because there is one resolution per transaction.
  - **What it does NOT close:** narrowing the fallback, which is deliberately left alone. It no
    longer leaves a second `SVx` inside an already-open Loop 2400 unreported: that was its own
    slice, and it is the entry below. **Read the earlier wording as withdrawn** - it said such a
    segment is "read into nothing", which was true only of one whose kind does not match the
    resolved variant; a DUPLICATE of the matching kind is read into the line and REPLACES what the
    first one wrote.

- **🩺 A second `SV1` / `SV2` / `SV3` inside an ALREADY-OPEN Loop 2400 raises
  `X12_837_SERVICE_SEGMENT_REPEATED`, anchored at the repeated service segment itself.** A service
  line carries **one** service segment's worth of slots, and every decoder writes **all** of the
  slots its kind writes, so the model holds what the **last** service segment matching the
  submission's resolved variant wrote and nothing of any earlier one. **Through `0.0.13` that
  happened in complete silence, and it is money and a procedure code:** under an `ST-03` of
  `005010X222A2`, `SV1*HC:99213*8500*UN*4***1~` followed by `SV1*HC:99999*12*UN*1***1~` inside one
  `LX` left ONE line reading `charge` `12` and `procedureCode` `99999`, with `warnings: []`. `8500`
  became `12`, CPT `99213` became `99999`, and nothing was raised on any channel. Six bounds, each a
  committed test:
  - **🛑 The decode is NOT narrowed, and that is deliberate.** Last-wins is unchanged, element for
    element, so which values a document decodes to are byte-for-byte what they were at `0.0.13`.
    This reader cannot tell a stray service segment from a conformant one, so choosing the first
    instead would be inventing; and changing which occurrence wins changes how **already-published
    documents decode**, the same call made about the variant fallback in the entry above. **This
    closes only the silence.**
  - **🩺 The worst corner is a repeat whose own charge element is ABSENT.** It writes `undefined`
    over the amount the first one stated, and `X12_837_SERVICE_LINE_NOT_DECODED` does **not** fire
    on that line, because a service segment _did_ decode. This code is then the only thing on the
    channel that says why the charge is empty.
  - **It fires on a repeat of ANY kind, decoded or not.** A service segment whose kind does not
    match the resolved variant is read into nothing and overwrites nothing - the loss there is that
    what it carries reaches no part of the typed model - and it is reported the same way, whether it
    arrives before or after the matching one. That case was silent at the segment through `0.0.13`
    too, and the entry above recorded it as a deferred residual.
  - **Once per repeat, and the count is scoped to the LINE, never latched.** Three service segments
    in one Loop 2400 are two warnings at two positions; a first service segment under a later `LX`,
    or in a later claim, is a first and never a repeat. A latching flag would report a conformant
    second line.
  - **It can never name the same segment as `X12_837_SERVICE_SEGMENT_WITHOUT_LX`**, which requires
    that NO Loop 2400 be open where this one requires that one is. It can travel with
    `X12_837_SERVICE_LINE_NOT_DECODED` (at the `LX`), with `X12_837_AMBIGUOUS_VARIANT` (at the
    `ST`), and with `X12_UNPARSEABLE_DECIMAL` raised by the repeat's own amount bytes. **That last
    pair sits at the SAME `position.segmentIndex`, separated only by the decimal code's own
    `position.elementIndex`** - measured, and pinned by a committed test. Never read a co-occurring
    pair here as two segments.
  - **It is ADDITIVE and nothing moved onto it.** Every code this reader raised on a document of
    this shape before **this code was added**, it still raises, at the same position, and no
    predicate changes meaning because of this code. Read that as invariance and **not** as a list of
    what else you will see, and **not** as a claim about the release: the ST-03 entry at the top of
    this list changed which documents reach the variant fallback.
    **The package's own documentation was a consumer that needed updating**: the cookbook's
    "gate before you post a line amount" recipe named four codes, none of which fires on the
    overwrite document, so it was blind to it - it now names this one too, and a committed test
    pins that the four-code gate misses what the five-code gate catches.

- **🩺 An `N3` / `N4` / `PER` / `REF` discarded after a stray `LX` raises
  `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, anchored at the discarded segment itself.** This is
  the code that names the trade recorded in the entry above: where an `LX` with **no `CLM` open**
  landed inside an entity loop, it closes that loop, so those four segment kinds reach no party on
  the model. Releases through `0.0.10` attached such a segment to whichever party the last `NM1`
  left active **wherever this reader surfaces that segment kind on that party at all** - never
  read that as all four kinds on every party, because a `PER` on a patient or a pay-to address
  reached the model on no release. Discarding them instead is what stopped a line-level value
  surfacing as a property of a party the sender never put it on, and this code is what stops that
  discard being silent. **It reports that the segment reached no party, NOT that it would have
  reached one**, so it can fire where nothing this library's own reset lost. The
  anchor is the segment and not the `LX`, because the loss is per segment: two `N3`s are two
  warnings at two positions, so a consumer can name both. Four bounds, each a committed test:
  - **🩺 It is NOT a general "this entity segment reached no party" report, and it must never be
    restated as one.** It reports one discarded after such an `LX`, and only until the next
    `NM1` / `HL` / `CLM` opens a loop. A party named after that `LX` is outside this code's
    scope again and its trailing segments are silent: the scope is a scope, not a latch.
    **Whether they ATTACH is a separate question this code does not answer**, and for some party
    and segment kinds the answer is no on every release - a `PER` reaches neither a patient nor a
    pay-to address on any of them. **This code reports that a segment reached NO party, never that
    it would otherwise have reached one.**
  - **Every other route to an unattached `N3` / `N4` / `PER` / `REF` is exactly as silent as it was
    before this code existed**, and that is deliberate rather than an oversight: no entity loop open
    at the stray `LX` at all (nothing was lost by this library's doing, since those segments reached
    no party at `0.0.10` either), an `NM1` this reader cannot route, an intervening `HL` or `CLM`,
    and the other dropped-`LX` route where a claim **is** open. Widening it to those is a guard
    change and would be its own decision.
  - **The `DTP` / `AMT` / `NTE` of the seven trailing kinds are NOT reported by it.** They are
    discarded on that route too, and were at `0.0.10` as well, because they never attach to a party
    on any route. This code says nothing about them; `X12_837_SERVICE_LINE_DROPPED` at the `LX` is
    what reports that loop's loss.
  - **It does not restore anything.** The segments are still discarded, and are still verbatim on
    `tx.segments`, which remains the only complete account of the document. Which party a segment
    following a **stray** `LX` belongs to is not derivable from the TR3s in either direction, so the
    reader refuses to attribute it rather than guessing.

- **🩺 An 837 Loop 2000A that names the pay-to address more than once has only ONE slot on the model
  to put it in, and the model carries one of the addresses rather than both.** The TR3s allow Loop
  2010AB at most once per Loop 2000A, so a repeated `NM1*87` is a non-conformant document. Each one
  raises `X12_837_PAY_TO_ADDRESS_REPEATED`, anchored at the repeated `NM1*87`, so the choice below is
  never made in silence.

  **🩺 Through `0.0.12` the two addresses were FUSED, and that is what changed.** `payToAddress` is a
  bare accumulator with no entity object to own it, so unlike every other party there was nothing to
  be replaced at the repeat: `withLines` appended and `mergeAddress` fell back, and two `NM1*87`s
  each carrying an `N3` and an `N4` read back a street line from **each** address plus a
  `countryCode` off the **first** `N4`, on an address whose own `N4` names no country, with
  `warnings: []`. Re-emitted through `build837P` that was one Loop 2010AB naming a payment
  destination no sender stated. **If you read a repeated `NM1*87` on `0.0.12` or earlier, treat that
  claim's `payToAddress` as unreliable rather than as either sender's address.**

  **The rule now applied, and it is stated in the emit side's terms because the emit side reads this
  slot:** occurrences are never merged; the **last occurrence that states an address of its own**
  takes the slot; and an occurrence that states none - one with no `N3` or `N4` at all, or only a
  valueless `N3` / `N4` whose elements are empty - **does not blank one that did**. "States an
  address" means exactly what `emitAddress` would write a segment for, and reader and writer share
  one predicate so they cannot disagree. That last clause is not a nicety: `build837P/I/D` gates Loop
  2010AB on `payToAddress !== undefined`, so a slot cleared or blanked by a repeat that stated
  nothing would re-emit as **no pay-to loop**, or as a **bare `NM1*87`** carrying neither `N3` nor
  `N4`. Both say something about where a payment goes that the sender did not.

  **🩺 The cost, which is real and is not argued away: a repeat that states only PART of an address
  puts only that part on the model, and re-emits only that part.** A second `NM1*87` followed by an
  `N4` and no `N3` reads back that `N4` with `lines: []` and re-emits a Loop 2010AB with no `N3`,
  where `0.0.12` emitted a complete-looking address assembled from two. Keeping the earlier street
  lines is the fusion itself, so they are not kept. **Which occurrence the sender meant is not
  derivable from the TR3s**, and the losing occurrence's address is **not on the model in any form** -
  `tx.segments` is where its bytes are, and remains the only complete account of the document.

  **Two bounds, both measured.** This is scoped to the pay-to route, which lives in Loop 2000A: an
  `NM1*87` arriving while a `CLM` is open never reaches that route, and is neither resolved nor
  warned by this code. **Where it lands instead depends on whether a service line is open, and this
  document does not state a single destination for it**, because two were measured: with a Loop 2400
  open it joins that line's `serviceLine.providers` (a line-level provider is TR3 Loop 2420), and
  with a claim but no line open it joins `claim.providers` (Loop 2310). Both are pre-existing and
  identical at `0.0.12`. And a document with **at most one** `NM1*87` per Loop 2000A is unaffected in
  every respect, warning channel included - including the pre-existing case of a lone `NM1*87` with a
  valueless `N3`, which still reads an address with no elements and still re-emits a bare `NM1*87`.

  **🩺 One thing the cost above shares with the shape that refuted remedy 2, stated so the two are
  not read as different in kind.** In Loop 2010AB the TR3s make `NM1`, `N3` **and** `N4` all Required,
  so a re-emitted loop carrying only the winning occurrence's `N4` is short a Required `N3`, exactly
  as a bare `NM1*87` is short both. The difference is not conformance, it is provenance: every
  element that IS emitted was stated by the occurrence the model kept, where the fused address
  contained elements no single occurrence stated. Emitting a Loop 2010AB short a Required segment is
  a pre-existing property of `emitAddress`, reachable at `0.0.12` from a lone `NM1*87` with an
  `N4` and no `N3`, and is not introduced here.

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

  **The 277's SVC-07 is a different element in a different TR3 and is now decoded and emitted in its
  own right** (`X12-277-SVC07-NOT-DECODED`, below). Do not read either field off the other.

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
  but not escaped.** Twenty-four sites across ten builder modules interpolate such a value into the
  thrown message. Every one routes through `renderCallerValue`, so the rendered **fragment** never exceeds
  `BUILD_REFUSAL_VALUE_MAX_RENDERED` (**90** characters: 63 of your value, two quotes, an ellipsis, and
  the ` (N characters)` suffix at its widest). Both constants and the function are exported, so you can
  assert the ceiling rather than take it on trust.

  **The ceiling is on the fragment, not on the message.** A refusal message is that fragment plus the
  site's own fixed template text, which differs per site, so every message is bounded by a constant but
  not by _that_ constant. Measured: a 120,000-character control number produced a **120,066-character**
  `X12BuildError.message` from `buildInterchange` before this change and produces a **150-character**
  one now. Do not read 90 as a message length.

  Over-long values are the point of nine of the twenty-four sites (the `control number "…" exceeds the
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

  **The sites that applies to are the ones whose own template names the field:** a control number, an
  X12 control code, a count. A refusal will not show you a `claimId`, a member id, a member name, a
  trace or a diagnosis code. That was true of the templates and **not** of the shared type guards
  underneath them until the release after `0.0.10`: those describe a wrong-typed element, they stand
  on **every element of every builder**, and they used to render the offending primitive
  (`a number ("900412345678")` for a `JSON.parse`d `patientControlNumber`) bounded to 90 characters
  and not redacted. A guard that cannot tell which slot it is standing on cannot decide that echoing
  is safe, so the string, segment and decimal guards report the TYPE and never the value, and so does
  the array guard's primitive arm. If you were reading a value back out of one of those messages, that
  is a behaviour change.

  **What that sentence does NOT say, and it is deliberate.** The array guard still reports the
  `length` and the class tag of a forged array-like, bounded through the same renderer: those describe
  the SHAPE you forged rather than the contents of a document element, and they are the whole
  diagnostic for `{ length: "9".repeat(120000) }`.

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

  The slot in that locator is itself admitted only when it matches the X12 segment-id grammar (two or
  three uppercase alphanumerics opening with a letter), because `buildInterchange` takes
  `[segmentId, ...elements]` from you wholesale. Free text in element 0 degrades to `element N` rather
  than reaching the message.

  **Read the "through a builder's segment joiner" qualifier literally.** `buildTA1` does not use one,
  and is therefore **not covered by the segment guard**. Through `0.0.14` that meant nothing checked
  its five elements at all, and a numeric or `undefined` `interchangeControlNumber` was emitted
  silently (`TA1**250101*1200*A*000`); `X12-TA1-EMIT-NOT-RELEASE-AWARE` closed that by routing them
  through the escape helper, which type-checks first and refuses with `AckBuildError` /
  `X12_ACK_INVALID_SPEC`. What being outside the segment guard still costs is the **slot** in the
  refusal message: it names `buildTA1`, never `TA1-01`.

  The monetary slots got their own guard on top of it: a slot typed `X12Decimal` refuses anything that
  is not one, rather than rendering `number.toString()` into the document.

  **What is still worth validating at your own boundary,** because it is a list and lists have the
  weakness described above:
  1. **A `string` carrying an active delimiter.** The segment guard passes it, because it is a
     string. Slots that route through the escape helper release it correctly (`"1*BOGUS"` emits as
     `1?*BOGUS`); the fixed-width ISA slots do not go through it at all.
  2. **Whether an `X12Decimal` carries the SCALE you meant.** `fromString("0.3")` and
     `fromString("0.30")` are both accepted and both emit verbatim. That choice is yours.
  3. **The delimiter set `buildTA1` releases against**, per the paragraph above. It defaults to the
     cosyte archetype and the function cannot verify it; state the separators on `BuildTA1Options`
     if you embed a TA1 in an envelope that declares different ones.
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

# Known limitations & non-goals

`@cosyte/x12` is built to be **correct and honest about its edges** rather than to claim more than it
delivers. Misreading a payer's remittance, a claim's diagnosis, or a member's coverage can cause real
financial or clinical harm, so this is the deliberate "do not over-trust" list. Everything here is a
documented, intentional boundary, not a bug. The lenient parser never silently drops or garbles a
**decoded value**: where a limitation applies, the raw value is preserved (often with a warning), it
is simply not further decoded. Five constructs the emit does not reproduce are worth reading
before you rely on a round trip, and four of them are **silent**: **line breaks between segments**,
**a doubled segment terminator** outside a transaction, **a missing final segment terminator** (the
emit supplies one) and **a TA1 that followed a functional group** (emitted right after the ISA, so
reordered, though nothing is lost). The fifth, **bytes after the IEA**, raises
`X12_TRAILING_GARBAGE` and comes back re-joined from segment slices rather than verbatim. All five
are in the `serialize(parse(s)) === s` entry below. A **segment outside a transaction**, including
one whose first element is empty (`*A*B~`), is not on that list: it is warned, kept on the model at
`ix.orphanSegments`, **and re-emitted at the structural anchor the walker recorded**, so it
survives a round trip.

The list below names each limit on one line and links to its detail further down. The page states
what holds today; [`CHANGELOG.md`](./CHANGELOG.md) records when each behaviour changed and what a
caller had to do about it.

## The list

### Data / decode boundaries

- [An ISA element carrying the element separator is reported, never re-framed](#an-isa-element-carrying-the-element-separator-is-reported-never-re-framed)
- [`parseTA1` decodes its fields, and `buildTA1` refuses an empty element](#parseta1-decodes-its-fields-and-buildta1-refuses-an-empty-element)
- [A typed reader returns no reading for a guide it does not implement](#a-typed-reader-returns-no-reading-for-a-guide-it-does-not-implement)
- [`implementationConventionReference` is published decoded, and decisions key on the raw ST-03](#implementationconventionreference-is-published-decoded-and-decisions-key-on-the-raw-st-03)
- [Every builder refuses an empty control number, and accepts a whitespace-only one](#every-builder-refuses-an-empty-control-number-and-accepts-a-whitespace-only-one)
- [The 837 variant comes from a list of cited ST-03 identifiers, and the builders take an override](#the-837-variant-comes-from-a-list-of-cited-st-03-identifiers-and-the-builders-take-an-override)
- [A `?` before the element separator in an envelope segment frames as one element](#a--before-the-element-separator-in-an-envelope-segment-frames-as-one-element)
- [On a delimiter set with `?` as the element separator, the body frames and every builder refuses](#on-a-delimiter-set-with--as-the-element-separator-the-body-frames-and-every-builder-refuses)
- [`buildInterchange` releases the GS elements it writes, and not the ISA or IEA-02](#buildinterchange-releases-the-gs-elements-it-writes-and-not-the-isa-or-iea-02)
- [`buildTA1` releases its five elements against the delimiter set you state](#buildta1-releases-its-five-elements-against-the-delimiter-set-you-state)
- [`build277` requires `unitsOfService`, and other required SVC elements are unguarded](#build277-requires-unitsofservice-and-other-required-svc-elements-are-unguarded)
- [An unparseable decimal reads `undefined`, and it warns](#an-unparseable-decimal-reads-undefined-and-it-warns)
- [An `AMT` or `ADX` whose amount does not decode loses its whole row, and says so](#an-amt-or-adx-whose-amount-does-not-decode-loses-its-whole-row-and-says-so)
- [A row the sender stated can still be discarded, and says so](#a-row-the-sender-stated-can-still-be-discarded-and-says-so)
- [An 835 balance equation with an undecoded term is reported as unevaluable](#an-835-balance-equation-with-an-undecoded-term-is-reported-as-unevaluable)
- [The public `elementDecimalOrZero` helper still substitutes zero](#the-public-elementdecimalorzero-helper-still-substitutes-zero)
- [An 837 service line whose service segment never decoded has no charge, and warns](#an-837-service-line-whose-service-segment-never-decoded-has-no-charge-and-warns)
- [An 837 `LX` that opens no service line raises `X12_837_SERVICE_LINE_DROPPED`](#an-837-lx-that-opens-no-service-line-raises-x12_837_service_line_dropped)
- [A service segment with no service line open raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX`](#a-service-segment-with-no-service-line-open-raises-x12_837_service_segment_without_lx)
- [A contested 837 variant raises `X12_837_AMBIGUOUS_VARIANT`](#a-contested-837-variant-raises-x12_837_ambiguous_variant)
- [A second service segment in one service line replaces the first, and warns](#a-second-service-segment-in-one-service-line-replaces-the-first-and-warns)
- [An entity segment discarded after a stray `LX` raises its own warning](#an-entity-segment-discarded-after-a-stray-lx-raises-its-own-warning)
- [A repeated 837 pay-to address keeps one occurrence, and warns](#a-repeated-837-pay-to-address-keeps-one-occurrence-and-warns)
- [A lookup keyed by document bytes ignores inherited object keys](#a-lookup-keyed-by-document-bytes-ignores-inherited-object-keys)
- [The 835 SVC map reads the revenue code from SVC-04 and the paid units from SVC-05](#the-835-svc-map-reads-the-revenue-code-from-svc-04-and-the-paid-units-from-svc-05)
- [Bundled code-list snapshots are subsets, not the full published lists](#bundled-code-list-snapshots-are-subsets-not-the-full-published-lists)
- [`serialize(parse(s)) === s` is not guaranteed](#serializeparses--s-is-not-guaranteed)
- [A segment outside a transaction is kept and re-emitted, but never decoded](#a-segment-outside-a-transaction-is-kept-and-re-emitted-but-never-decoded)
- [837 claim and line provider addresses are not surfaced](#837-claim-and-line-provider-addresses-are-not-surfaced)
- [`get834Enrollments` parses the whole file before it streams members](#get834enrollments-parses-the-whole-file-before-it-streams-members)
- [A builder refusal shows at most 63 characters of your value, unescaped](#a-builder-refusal-shows-at-most-63-characters-of-your-value-unescaped)
- [`defineProfile()` refusals are bounded the same way](#defineprofile-refusals-are-bounded-the-same-way)
- [A builder refuses a non-string element and never coerces it](#a-builder-refuses-a-non-string-element-and-never-coerces-it)
- [A builder refuses a forged non-array, and a hole or `null` inside a list](#a-builder-refuses-a-forged-non-array-and-a-hole-or-null-inside-a-list)
- [`X12ParseError.snippet` on a fatal can carry PHI](#x12parseerrorsnippet-on-a-fatal-can-carry-phi)
- [Two classes of locator-like model field are unbounded on purpose](#two-classes-of-locator-like-model-field-are-unbounded-on-purpose)
- [`X12Ack999Ik4.copyOfBadDataElement` can carry PHI](#x12ack999ik4copyofbaddataelement-can-carry-phi)
- [The 997 follows the base standard alone, and its codes are carried, not checked](#the-997-follows-the-base-standard-alone-and-its-codes-are-carried-not-checked)
- [A TA1 or 999 derived from a parse reports only what the parse checks](#a-ta1-or-999-derived-from-a-parse-reports-only-what-the-parse-checks)
- [Balance and integrity checks warn, and never rebalance or renumber](#balance-and-integrity-checks-warn-and-never-rebalance-or-renumber)

### Trading-partner profiles: what a conformance classification is, and is not

- [A profile never changes what this library emits](#a-profile-never-changes-what-this-library-emits)
- [A quirk's conformance classification is a recorded human judgement](#a-quirks-conformance-classification-is-a-recorded-human-judgement)
- [The conformance axis is 45 CFR 162.915, and it has three states](#the-conformance-axis-is-45-cfr-162915-and-it-has-three-states)
- [A `requires` quirk records a mandate, not that the standard allows it](#a-requires-quirk-records-a-mandate-not-that-the-standard-allows-it)

### What the differential corpus proves, and what it does not

- [Each synthetic document is compared with an independent reader where one maps it](#each-synthetic-document-is-compared-with-an-independent-reader-where-one-maps-it)
- [Each transaction is compared against one named reader](#each-transaction-is-compared-against-one-named-reader)
- [The second reader refuses much of the corpus, so its comparisons are narrower](#the-second-reader-refuses-much-of-the-corpus-so-its-comparisons-are-narrower)
- [This library and pyx12 disagree about the release character](#this-library-and-pyx12-disagree-about-the-release-character)
- [Transactions neither reader maps are compared against nothing](#transactions-neither-reader-maps-are-compared-against-nothing)
- [Two compared claims are mapped to different errata on each side](#two-compared-claims-are-mapped-to-different-errata-on-each-side)
- [Agreement with either reader is not conformance](#agreement-with-either-reader-is-not-conformance)
- [The corpus is our own synthetic fixtures and nothing else](#the-corpus-is-our-own-synthetic-fixtures-and-nothing-else)

### Scope (non-goals for v1)

- [We do not validate against implementation guides](#we-do-not-validate-against-implementation-guides)
- [No 4010 variants and no 277U](#no-4010-variants-and-no-277u)
- [No 278 notification (`005010X216`)](#no-278-notification-005010x216)
- [Healthcare 005010, and the 006020 claims attachments pair](#healthcare-005010-and-the-006020-claims-attachments-pair)
- [No transport](#no-transport)
- [Below 1.0](#below-10)
- [A 276 level whose declared parent does not resolve is left off the tree](#a-276-level-whose-declared-parent-does-not-resolve-is-left-off-the-tree)
- [A 276 REF, DTP or AMT short of its row loses the whole row, and says so](#a-276-ref-dtp-or-amt-short-of-its-row-loses-the-whole-row-and-says-so)
- [The 276 reader surfaces four SVC elements and no postal address](#the-276-reader-surfaces-four-svc-elements-and-no-postal-address)
- [A 270 level whose declared parent does not resolve is left off the tree](#a-270-level-whose-declared-parent-does-not-resolve-is-left-off-the-tree)
- [A 270 DTP short of its row loses the whole row, and says so](#a-270-dtp-short-of-its-row-loses-the-whole-row-and-says-so)
- [A 270's tolerated deviations are reported once per transaction set](#a-270s-tolerated-deviations-are-reported-once-per-transaction-set)
- [A space or a tab between segments costs the whole interchange](#a-space-or-a-tab-between-segments-costs-the-whole-interchange)
- [Binary data is framed by its declared octet count, and a bad count is reported](#binary-data-is-framed-by-its-declared-octet-count-and-a-bad-count-is-reported)

### Code-list validity dates

- [A published Stop date is read as the first day a code is no longer valid](#a-published-stop-date-is-read-as-the-first-day-a-code-is-no-longer-valid)

### Code-list descriptions

- [Only a list recorded as permitted ships description text](#only-a-list-recorded-as-permitted-ships-description-text)
- [A bundled code still resolves without its description](#a-bundled-code-still-resolves-without-its-description)
- [The derived description fields read `undefined` for those lists](#the-derived-description-fields-read-undefined-for-those-lists)
- [You can bring your own descriptions](#you-can-bring-your-own-descriptions)
- [A description cannot creep back in](#a-description-cannot-creep-back-in)

### Code-list `--fetch` regeneration

- [Full-list regeneration is a manual release step, answered per list](#full-list-regeneration-is-a-manual-release-step-answered-per-list)
- [A list whose descriptions may not be redistributed ships its codes and no description](#a-list-whose-descriptions-may-not-be-redistributed-ships-its-codes-and-no-description)
- [`--fetch` answers each list on its own terms](#--fetch-answers-each-list-on-its-own-terms)
- [Snapshot validation refuses an unlabelled list](#snapshot-validation-refuses-an-unlabelled-list)
- [`codeListRedistributionIsPermitted(meta)` is the single decision point](#codelistredistributionispermittedmeta-is-the-single-decision-point)

## Data / decode boundaries

### An ISA element carrying the element separator is reported, never re-framed

**An ISA element whose value carries the element separator splits the header into more than `ISA` +
16 elements, and `parseX12` reports it as `X12_ISA_EXTRA_ELEMENT_SEPARATOR`.** Nothing is
re-framed: this is a report, not a repair, and no other warning is suppressed or narrowed by it.

`detectDelimiters` verifies the element separator at all 16 fixed 005010 byte positions, so the ISA
split can never come out short. It is not bounded from above. An element value carrying that same
byte splits again, so that element comes back a **prefix** and everything after it is
**displaced**. **How far is not derivable from `isa.elements`, and no arithmetic on it works.** More
than one element can carry an extra separator, and an element sitting between two of them is
displaced less than one sitting after both; `isa.raw` plus the ISA's fixed widths is the only route
back. Measured on one conformant interchange, planting the element separator inside each of the 16
fixed elements in turn:

```text
planted in   split parts   other warnings raised beside it
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

**What the displaced reads cost.** On the `ISA-01..10` and `ISA-12` rows the interchange declares
`00501` at ISA-12's own fixed offset and `X12_PRE_005010` fires anyway, because `elements[12]` has
become the repetition separator; `elements[13]`, the interchange control number and the
reassociation key, answers `"00501"`; and `elements[15]`, the test/production usage indicator,
answers `"0"` on a document whose ISA-15 says `P`. On the `ISA-13` row the control number is a
prefix. **On the `ISA-14` and `ISA-15` rows this code is the only warning**, while the usage
indicator reads empty.

**The route back is `isa.raw`**, which still carries all 106 bytes verbatim, and the ISA's fixed
widths make the transmitted span of any element recoverable from it. Recovering it is **your**
decision, not this library's: a byte that is both an element's content under those fixed widths and
the separator the same segment declares in-band has two readings, the interchange is not
005010-conformant either way, and nothing anyone here has read says which reading to take. So the
parser reports that the header did not frame and leaves `isa.elements` exactly as the split
produced it.

**When this warning is present, treat every other ISA-derived diagnostic on that interchange as
provisional.** `parseX12` raises it ahead of the ones it raises after it for that reason, which also
means `{ strict: true }` escalates on it rather than on the displaced-value warning that follows.
**Read that as a statement about `ix.warnings` and `onWarning`, and about nothing else.**
`serializeX12(ix, { specClean: true })` reconciles ISA-13 against IEA-02 off `isa.elements[13]`
with no arity awareness and **never raises this code at all**, so on that channel a lone
`X12_CONTROL_NUMBER_MISMATCH` can be a displaced read of a control number that in fact matches byte
for byte at its fixed span, and **the absence of this warning there is not evidence the header
framed**. That is open.

**The emit side is not guarded by this.** The fixed-width ISA slots go through padding and never
through the caller escaper, so `buildInterchange` writes a caller value carrying the element
separator straight onto the wire. It returns `parseX12` of the bytes it just wrote, so the report
reaches that path: `interchangeControlNumber: "0000*0001"` comes back with this warning, ISA-13
reading `"0000"`, ISA-15 reading `"0"` instead of `"P"`, and IEA-02 displaced the same way, so the
control-number reconciliation **agrees with the misreading**. Refusing such a value on emit is a
decision about the build side and is not taken.

### `parseTA1` decodes its fields, and `buildTA1` refuses an empty element

**`parseTA1`'s five decoded fields are post-`?`-unescape, and `buildTA1` refuses an empty TA1-02,
TA1-03, TA1-04 or TA1-05.** They are the two ends of one rule: this package's emit half releases a
TA1 element, so its read half decodes the value rather than the escape, and a round trip through
the two halves is an identity for any value carrying a delimiter or the release character. **`raw`
is untouched and is still the verbatim byte surface**: read `ta1.raw.elements` when you want the
bytes. A value with no `?` in it reads the same on both surfaces, which is every conformant TA1.

**The emit half.** `BuildTA1Spec` declares all five properties as required `string`s, and `""` is
what defeats that at run time, so an empty one draws `AckBuildError` / `X12_ACK_INVALID_SPEC` naming
the slot and the spec property and never the value. The in-package answer to an empty required
element is uniformly refusal (`patientControlNumber`, `claimId`, `maintenanceTypeCode`,
`requestCategoryCode`, the 277's `categoryCode`, and TA1-01 itself).

- **It does not trim, at any of the five slots.** A whitespace-only element still builds:
  `TA1*000000001*260601*1200*R* ` is emitted for `noteCode: " "`. Trimming is a normalisation rule
  and no source consulted for this package states one, exactly as at TA1-01.
- **It does not narrow what a non-empty element may contain, and the read half stays lenient.** An
  out-of-enum `ackCode: "X"` still builds and reads back as `R` through the documented fail-safe
  narrow. This guard bounds absence on the emit side and nothing else.
- **Every other guard keeps its precedence.** `enforceAcceptIsClean` runs first, so an
  `ackCode: "A"` with an empty note reports `X12_TA1_ACCEPT_WITH_NOTE`; TA1-01 draws the
  control-number refusal; and every wrong-typed element draws the escape helper's refusal, because
  all five escapes run before any emptiness test.
- **No census of other builders' required elements is published here.** This was measured on the
  TA1.

### A typed reader returns no reading for a guide it does not implement

**Every typed reader checks the implementation guide a transaction set declares against the guides
that reader implements, and returns no reading where it declares one outside them.** The readers of
the 005010 transactions (`get835`, `get837Claims`, `get270Inquiry`, `parse270Inquiries`,
`get271Eligibility`, `get276StatusInquiry`, `parse276StatusInquiries`, `get277Status`,
`get277CADisposition`, `get278Request`, `get278Response`, `get834Header`, `get834Enrollments`,
`get820Payments`) answer such a transaction set as they answer one of another ST-01: `undefined`, a
list without it, or no yielded member, so no caller can trust values decoded against positions the
declared guide may place elsewhere. What still reads, and what it carries:

- **A padded or lower-cased 005010 declaration is read.** Whether to refuse is decided on the
  declaration trimmed of surrounding whitespace and upper-cased, so `005010X222A1` with a space
  either side, or `005010x221a1`, is read. The warning compares exactly, so such a reading carries
  `X12_GUIDE_NOT_IMPLEMENTED` at the ST (and a 277 reads `transactionType: "unrecognized-guide"`).
- **Nothing declared is read.** Where ST-03 and GS-08 are both absent, empty or whitespace alone, or
  no group header reached the transaction set, the reader cannot tell which guide the document
  follows, so it reads against its own guide and puts `X12_GUIDE_NOT_DECLARED` on the reading,
  anchored at the ST. A 4010 transaction set sent with an empty GS-08 is read this way;
  `X12_PRE_005010` on the interchange is then the only sign it is not 005010.
- **The 275 and 999 readers warn and return.** `get275Attachments` and `parse999` raise
  `X12_GUIDE_NOT_IMPLEMENTED` at the ST and return their reading. Every other reader raises that
  code only on the padded or lower-cased declaration above.
- **A refusal carries no reason, and no warning is raised for it.** `undefined` does not say whether
  ST-01 or the declared guide turned the transaction set away, and there is no reading to carry a
  warning. The one signal that exists is on the interchange: `X12_PRE_005010` in
  `parseX12(...).warnings` where ISA-12 does not read `00501`, which a 4010 interchange raises. A
  005010 interchange holding a transaction set that declares `005010X216` or `006020X313`, say,
  raises nothing at all. Read `tx.st.elements[1]`, `tx.st.elements[3]` and `tx.gs?.elements[8]`, and
  compare with `X12_TR3_CONFORMANCE`, to tell which. A caller who knows a document follows an
  implemented guide despite what it declares can hand the reader a copy of the transaction set whose
  ST-03 names that guide.

What the check keys on, exactly:

- **The declaration is `ST-03` decoded, then `GS-08` decoded.** `ST-03` is read post-`?`-unescape,
  exactly as `implementationConventionReference` is published. Only where `ST-03` is absent or
  decodes to `""` or to whitespace alone is GS-08 of the enclosing functional group read, decoded the
  same way, and a GS-08 of whitespace alone declares nothing; a parsed transaction set carries its
  group's GS header on `tx.gs` for this, and one assembled by hand without it is read as GS-08
  absent. The refusal compares the declaration trimmed and upper-cased; the warning compares it
  exactly; neither prefix-matches, so `005010X222` does not stand for `005010X222A1`.
- **`ST-03` and `GS-08` are not reconciled.** Where `ST-03` holds anything but whitespace it alone
  decides and GS-08 is never read, so a document whose two declarations disagree is judged on
  `ST-03` and nothing reports the disagreement.
- **The implemented set is `X12_TR3_CONFORMANCE`**, each of the reader's rows contributing its `tr3`
  and every `cfrAdopted` entry. **The 837 reader also recognises every identifier its variant table
  resolves**, which includes the companion-guide identifiers production claims carry, so a
  conformant claim declaring one is not refused. A 278 declaring `005010X216`, the 278 notification
  guide, gets no reading from either 278 reader.
- **What the check decides is whether there is a reading, plus one label.** A 277 that declares no
  guide, or an implemented one only padded or in another case, reads
  `transactionType: "unrecognized-guide"`. Everything else that keys on `ST-03` (the 837 variant, the
  choice between `claim-status` and `claim-acknowledgment`, and `get277CADisposition`'s admission)
  keys on the raw text, so the check and those decisions can read the same `ST-03` differently where
  a release escape is involved (see the next entry). The 837 variant falls back to the `SVx` scan
  only where the raw ST-03 keys no variant and the declared guide is implemented: ST-03 absent or
  empty under an implemented GS-08, or escaped.

### `implementationConventionReference` is published decoded, and decisions key on the raw ST-03

**`implementationConventionReference` is post-`?`-unescape in every typed reader that publishes it**
(`get837Claims`, `get277Status`, `get277CADisposition`, `get278Request` and `get278Response`), so a
sender that escaped a delimiter inside `ST-03` gets the value it stated: an ST-03 framed as `A??B`
publishes `A?B`, `A?*B` publishes `A*B`, `A?:B` publishes `A:B`, `A?~B` publishes `A~B`, `A?^B`
publishes `A^B`. `tx.st.elements` is the ST segment as framed, post-element-split and
pre-unescape, and stays the verbatim framed surface. The grounding is consistency inside this
package: `parse999` decodes the identically-named `AK2-03`, and every dot-path read unescapes. No
TR3 clause is claimed. Do not apply `unescapeRelease` to the published value yourself.

- **What decides an outcome keys on the raw text, deliberately.** The 837 variant lookup, the 277 /
  277CA `transactionType` choice between its two claim labels and `get277CADisposition`'s admission
  gate all key on the raw element text. The two can differ: with `componentSeparator: "X"` (a letter
  is an admissible delimiter) an `ST-03` framed as `005010?X222A1` decodes to `005010X222A1`, an
  identifier the variant table holds. Keying on the decoded text would make the declaration beat the
  `SVx` fallback there, which on a document whose only service segment is an `SV2` would stop that
  line decoding and raise `X12_837_SERVICE_LINE_NOT_DECODED`. That would change how a document
  decodes a service line rather than fix a decode, and it is **open**. No identifier any of the
  three tests is keyed on contains a delimiter or the release character, so raw text equal to one
  decodes to itself.
- **The published reference can name a guide this reader did not resolve to.** On the
  `componentSeparator: "X"` document above, `submission.implementationConventionReference` reads
  `005010X222A1`, which the variant table holds, while `submission.variant` is `I` from the `SVx`
  fallback, and nothing warns about the divergence. On the same delimiters a body with no `SVx`
  publishes `005010X222A1` with `variant: "unknown"` and raises `X12_837_UNKNOWN_VARIANT`, and a body
  naming more than one variant publishes it with `variant: "P"` and raises
  `X12_837_AMBIGUOUS_VARIANT`; each time the code that fired says `ST-03` named no identifier this
  reader recognises while the model field holds one it does. **Gate on `variant` /
  `transactionType`, never on the published reference.**
- **It introduces no normalisation and no warning.** Nothing is trimmed, case-folded or
  prefix-matched; a whitespace-only `ST-03` is published untrimmed. A dangling `?` at the end of the
  element raises no `X12_DANGLING_RELEASE_CHAR` on these readers: the sink is a no-op, which is what
  `getSegmentValue` defaults to and what `parseTA1` and `parse999` do, so every other element these
  readers decode drops it too. That residual is **open.**
- **Each reader keeps its own empty / absent mapping.** `walk278` collapses `""` to `undefined`;
  `get837Claims` and `walk277` publish `""`. No non-empty element decodes to `""`.

### Every builder refuses an empty control number, and accepts a whitespace-only one

**Every builder refuses an empty control number before anything is emitted.** A builder that
assembles an ISA zero-pads its control number to the nine characters ASC X12 .5 fixes ISA-13 at, so
`padControl("1", 9)` answers `"000000001"`. Padding an empty value would answer `"000000000"`, a
well-formed control number nobody supplied that reconciles perfectly against IEA-02; the other
control numbers reach the wire through the escape helper, where an empty value would lose the
required element. A control number is how an interchange is reconciled and acknowledged, so a
fabricated or missing one does not fail: it succeeds against the wrong thing. The acknowledgment
builders guard the slots where they **echo** the document being acknowledged (`build999`'s AK1 and
AK2, `buildTA1`'s TA1-01), which is the whole reason a sender can match an ack to what they sent.

Each refusal is that builder's own typed, code-tagged error (`X12_BUILD_INVALID_SPEC` and its
siblings; `X12_ACK_INVALID_SPEC` on the ack path), naming the slot and the spec property.

- **The guard does not trim, and a whitespace-only control number is accepted**:
  `interchangeControlNumber: " "` emits ISA-13 as `00000000 `, and `buildTA1` does no padding at
  all, so it emits whatever whitespace it was handed, verbatim. Trimming would be a normalisation
  rule, no source consulted for this package states one, and every empty-required-element guard
  this one mirrors (`patientControlNumber`, `claimId`, `maintenanceTypeCode`,
  `requestCategoryCode`, the 277's `categoryCode`) is byte-strict for the same reason. **Validate at
  your own boundary if your partner can send you blanks.**
- **A short ISA-13 still zero-pads.** The guard is not "ISA-13 must be nine characters":
  `interchangeControlNumber: "1"` emits `000000001`, which is what `padControl` is for. `buildTA1`
  pads nothing, so a TA1-01 of `"1"` goes out as `TA1*1*…`.
- **Every guard sits at the envelope-assembly site, so every guard that runs before it keeps its
  precedence.** `build835`'s balance equation, `build999`'s AK9 counts, `buildTA1`'s
  accept-must-mean-accept check, the 837's and 277's hierarchy checks and `build834`'s
  unknown-maintenance-type refusal all fire ahead of this one. **A defect detected later, during
  body assembly, is reported as the control-number refusal instead**: `build999` with an empty
  `interchangeControlNumber` and six AK9 syntax error codes throws `X12_ACK_INVALID_SPEC`, not
  `X12_ACK_COUNT_MISMATCH`.

### The 837 variant comes from a list of cited ST-03 identifiers, and the builders take an override

**`get837Claims` resolves an 837 variant from a list of cited `ST-03` implementation-convention
references: each base guide HIPAA adopts at 45 CFR 162.1102 (`005010X222`, `005010X223` +
`005010X223A1`, `005010X224` + `005010X224A1`) and each of its published errata, including
`005010X222A1` and `005010X223A2`, which CMS and state Medicaid companion guides require in ST-03
and GS-08 on production professional and institutional claims.** Sources for every key are named
beside the table in `src/transactions/claim/get-837.ts`. Where `ST-03` is recognised, the
document's own declaration decides the variant, so `X12_837_AMBIGUOUS_VARIANT` and
`X12_837_UNKNOWN_VARIANT` do not fire, and a service line whose `SVx` kind disagrees with the
declaration is not decoded: under `005010X222A1` with a body whose only service segment is an `SV2`,
the reader gives `variant` `"P"`, `charge` `undefined`, and `X12_837_SERVICE_LINE_NOT_DECODED` at
that line's `LX`. A mis-stamped envelope is an ordinary vendor variant and this reader cannot tell
one from a conformant document; the loss is warned rather than silent.

- **The `SVx` fallback is not narrowed.** First-wins takes the first service segment in the body,
  orphans included, on every document that reaches it.
- **It is a list of cited identifiers, never a pattern.** A reference outside the set, in a
  different case, or carrying leading whitespace, falls through to the `SVx` fallback. Nothing
  trims, lower-cases or prefix-matches `ST-03`, because no source says to.
- **The set is not claimed exhaustive and no count of it is published**, here or in any warning
  message, so neither variant message enumerates it.
- **The emit side takes a caller override.** `build837P` / `build837I` / `build837D` default to
  `005010X222A2` / `005010X223A3` / `005010X224A2` in ST-03 and GS-08, and
  `Build837EnvelopeSpec.implementationConventionReference` states another, one value for both
  elements. The default is deliberately not re-stamped: which published guide identifier a partner
  accepts is a partner fact rather than a spec fact, and changing bytes this library already emits
  would break the partners it works with today.
  - **What the override refuses of its own, all `X12_837_BUILD_INVALID_SPEC`, and none of it echoes
    your value back:** an empty reference (a trailing empty element is not emitted, so it would
    delete ST-03 and GS-08 rather than send them empty); one carrying an active delimiter or the
    release character; and one this library's own reader resolves to a **different** 837 variant,
    which would emit a file declaring one variant and carrying another's service segments. **No
    total is published**, because those sit on top of the element-type guard every string slot in
    every builder already has, which refuses a non-string with the same code.
  - **It bounds the value, not the length, and the two elements' maxima differ.** GS-08 is data
    element 480 (`AN 1/12`) and ST-03 is element 1705 (`AN 1/35`), so "one value, both elements" is
    true of the bytes and not of what each element may legally hold. Nothing here refuses an
    over-length reference, in line with every other envelope field this library takes.
  - **A reference outside the read table is emitted as given, deliberately.** The published-errata
    set is not provably exhaustive, so refusing an unrecognised identifier would claim an
    exhaustiveness nothing here supports. The cost, pinned as a test: this library's own reader
    falls back to the `SVx` scan on such a file, exactly as it does for any unrecognised ST-03.

### A `?` before the element separator in an envelope segment frames as one element

**A released element separator (`?*`) inside an envelope segment (`GS`, `GE`, `ST`, `SE`, `IEA`,
`TA1`) frames as one element.** `splitElements` honours the release character exactly as
`decodeSegment` and the segment-terminator scanner do, so an escaped delimiter lands in its own
element's slot and does not shift every element after it. Read the rule as symmetric, because a `?`
before the separator has two readings and 005010 does not transmit which the sender meant:

- **Where the sender escaped a delimiter, the value frames correctly.** `GS*HC*S*R*20260601*1200*1*X*005010?*X222A1~`
  reads nine elements with GS-08 `005010?*X222A1` as framed.
- **Where the sender sent a literal `?` as an element's last byte, the element merges with its
  successor and the segment loses its last element.**
  `GS*HC*SUB1*RCV?*20260601*1200*000000123*X*005010X222A1~` reads **eight** entries, with GS-06
  answering `"X"` and GS-08 gone. `X12_CONTROL_NUMBER_MISMATCH` fires where that displaces a
  control number, and no other code is raised.
- **The literal-`?` direction reaches an 837's variant and its money, by one route.** `ST-03` is
  what decides the 837 variant, so an `ST-02` ending in a literal `?` destroys `ST-03` and the
  document falls back to the `SVx` scan. An 837 declaring `005010X222A1` whose only service segment
  is an `SV2` then reads `variant` `"I"` with `charge` `150.00`, where the declaration would have
  given `"P"` and a warned non-decode. If you receive envelope elements that may end in a literal
  `?`, re-check any routing driven off `submission.variant`.
- **Why the escape reading wins: consistency, not a spec clause.** The two readings are mutually
  exclusive and nothing in 005010 picks between them. `decodeSegment` reads body elements the
  escape-wins way (`REF*EA*RCV?*NEXT` is two elements), and the envelope obeys the same rule, so
  `buildInterchange`, which releases what it writes, reads its own output back.
- **The exposure is not inbound bytes only.** Envelope slots routed through the builders' release
  escaper are safe. Not every emit slot is routed through it, and no total of those that bypass it
  is published here; the ISA's fixed-width slots and `buildInterchange`'s IEA-02 are two.
- **An envelope element ending in a literal `?` is a dangling release character and is not
  warned.** `X12_DANGLING_RELEASE_CHAR` fires only for an odd run of `?` at the very end of a
  segment, so a mid-segment one reaches no check. That is true of body elements too.
- **Values are raw, pre-`?`-unescape**, as `X12Segment.elements` documents: `gs.elements[2]` for an
  `applicationSenderCode` of `SEND*ER` reads `"SEND?*ER"`. For the logical value, `unescapeRelease`
  the element string. `GsSegment` carries no `id`, so `getSegmentValue` does not accept a `gs`
  (`TS2345`); adding an `id` and taking the dot-path is the other route, and **the two answer
  different questions**: a bare dot-path splits on the repetition separator and answers repetition
  0, so a GS-07 of `"A^B"` reads back `"A"` through it and `"A^B"` through `unescapeRelease`, with
  no warning. `elements.join(separator)` reproduces the segment byte for byte, which is what
  `serializeX12` relies on when it substitutes a recomputed `SE-01` / `GE-01` / `IEA-01` into a
  control segment.
- **The ISA is exempt and stays positional.** ASC X12 .5 makes the ISA fixed-width, which is what
  lets the delimiters be recovered from it before anything is parsed, so a `?` in an ISA element is
  content and never an escape. `buildInterchange` states the same rule from the emit side: it pads
  each ISA element and never escapes one.
- **Where the element separator is itself `?`**, `?` cannot both separate and escape, so the
  envelope splitter falls back to the literal split, the same guard the segment-terminator scanner
  carries. The next entry covers body segments on such a set.
- **This does not make an unescaped delimiter safe.** A bare active delimiter in an envelope
  element ends that element, because that is what a delimiter is; only the sender escaping it is
  honoured. `build837`'s `implementationConventionReference` refuses a value carrying an active
  delimiter or the release character, because a partner's parser is not obliged to be
  release-aware either. `buildInterchange` applies no domain guard to any envelope field and emits
  all of them, and reports back what it wrote.

### On a delimiter set with `?` as the element separator, the body frames and every builder refuses

**A body segment in an interchange whose element separator is `?` frames its elements.**
`detectDelimiters` reads the element separator positionally out of ISA byte 4 and rejects only
control characters, whitespace and a non-distinct set, so a sender may declare `?` there.
`decodeSegment`, which every body segment plus the `ST`, the `SE` and every retained orphan goes
through, splits literally on such a set, as both envelope splitters do, so `NM1?85?2?ACME CLINIC`
reads as an `NM1` with its elements in their slots and the readers, which dispatch on `seg.id`, see
the transaction body.

- **The tiebreak is consistency rather than a spec clause.** 005010 does not transmit a release
  character at all, so nothing in it says what a `?` means once a sender has declared `?` as
  structure. Unlike the envelope entry above, this is not a symmetric class: a one-element segment
  with an id of `(non-spec)` is not a second reading of `NM1?85?2?ACME CLINIC`.
- **`X12_DANGLING_RELEASE_CHAR` does not fire on such a segment ending in an empty last element.**
  With `?` as the separator that trailing byte is an empty element, not an unpaired escape, so
  `PER?IC?NAME?TE?5551234?` is silent.
- **The guard is per role, and it is a read-side guard. A `?` repetition or component separator
  does not split, and that is deliberate.** `escapeRelease` writes `??` for a literal `?` whatever
  role `?` was declared in, so documents this library emitted on such a set carry
  `CLM*PATIENT??ACCT*150.00`, and `getSegmentValue(clm, "01")` reads `"PATIENT?ACCT"` back out of
  them. Splitting those two roles literally would re-frame that as two empty components, so it
  would stop reading a value this library itself wrote. Those documents exist, which is why the
  read side does not follow the emit-side refusal below.
- **Every builder refuses a delimiter set in which any of the four roles is `?`.** Two mechanisms
  make such a set unsafe to emit. A caller value the escape cannot protect, because the protecting
  `?` is itself a delimiter: with `?` as the segment terminator a released byte inside a value ends
  the segment early, so a phantom segment appears mid-transaction. And the library's own structural
  join, which needs no caller value at all: a builder joins composites with the component separator
  and repetitions with the repetition separator, so where either is `?` the join is emitted as an
  escape. `build837P` on `componentSeparator: "?"` would emit `SV1-01-2` (the procedure code) and
  `HI-01-2` (the diagnosis code) fused into the preceding component on every document. A value-level
  mitigation cannot reach the second mechanism, so the set is refused. Round-tripping through this
  library's own parser is not the bar, because ISA-11 and ISA-16 transmit the declared set and a
  conformant receiver splits on it. Pinned in `test/builder-degenerate-release-delimiter.test.ts`
  and, per builder, in each build suite.
- **A delimiter that is not shaped like one is refused on emit too, by every builder.** Each of the
  four roles must be a **string of exactly one visible character**, and the four must be
  **mutually distinct**. That is the predicate `detectDelimiters` applies to an inbound ISA, where
  failing it is the Tier-3 fatal `X12_INVALID_DELIMITERS`, so a builder never composes a document
  its own parser refuses to read. Nothing is trimmed, coerced or substituted: the set is refused,
  with that builder's own typed error and its existing code. It guards three shapes: a
  **multi-character** delimiter (a `segmentTerminator` of `"~~"` would put phantom segments on the
  model that `SE-01` never counted), a **non-string** delimiter (coerced by the join but not by the
  escape, so the document would frame on a byte no element value was protected from), and any shape
  at all on `buildTA1`, the one builder with no trailing `parseX12` to catch it. A
  `segmentTerminator` of `"~\r\n"`, asking for line-broken output, is refused too; reading a file
  that is written that way is unaffected. The check runs **before** the control-number guards, so a
  spec that is mis-shaped and carries an empty control number reports the delimiter refusal, on the
  same code.
- **The shape rule counts UTF-16 code units, not bytes.** A character that is one code unit but
  several bytes on the wire satisfies it and still displaces every ISA position after it, so
  `componentSeparator: "§"` builds with no warning and a byte-oriented receiver reads ISA-16 as
  `0xC2` and the terminator as `0xA7`. The smart quote `"’"` a companion-guide PDF gives you
  instead of `'` does the same. It is disclosed rather than guarded: the read side counts code units
  too (`charAt`), so moving one side alone would put emit and read out of step. **Declare delimiters
  from the basic single-byte set.**
- **On a `?` element separator a `?~` still swallows the segment terminator.**
  `findUnescapedTerminator` guards its own role only, so a segment that ends in an empty last
  element puts a `?` immediately before the terminator and the scanner reads it as an escape:
  `PER?IC?NAME?TE?5551234?EX?~SE?3?0001~` frames as one segment, `~SE` and the SE's own control
  number land in `PER`'s communication-number slots, and `X12_MISSING_SE` fires, so it is not
  silent. Pinned in `test/parser-segment-degenerate-release-separator.test.ts`.
- **Values are raw, pre-`?`-unescape**, and `elements.join(separator)` reproduces the segment byte
  for byte, so `serializeX12`'s count substitution and the byte-exact round trip are unaffected.
- **The ISA stays positional**, for the reason the envelope entry above gives: it is fixed-width,
  which is what lets the delimiters be recovered from it at all.

### `buildInterchange` releases the GS elements it writes, and not the ISA or IEA-02

**`buildInterchange` releases every GS element it writes, GS-04 (`groupDate`), GS-05 (`groupTime`)
and GS-07 (`responsibleAgencyCode`) included, so the interchange it hands back, which is `parseX12`
of the bytes it just wrote, reports the values you passed.** A value carrying an active delimiter
would otherwise take a slot of its own and shift every element after it down one, and a GS-07 of
`"X*Y"` would move GS-08, the version / release / industry identifier code, with no warning on any
channel, because GS-06 keeps its slot and still reconciles against GE-02. A value containing none
of the four delimiters and no `?` is emitted byte for byte, which is every conformant GS-04, GS-05
and GS-07.

- **Read the delimiter set by role, never by byte.** `InterchangeSpec` lets you declare all four,
  so which bytes are released is a property of the set you declared. Only the element separator,
  the segment terminator and a `?` immediately before the element separator shift the segment's own
  framing. The **repetition** and **component** separators move the dot-path reader instead, where
  releasing them is a gain: the composite read `"07-1"` answers the whole value for `"X:Y"`. **The
  measured cost is a mid-string `?`, and only on the surfaces documented as raw**:
  `gs.elements[4]` reads `"2026??0601"` for a `groupDate` of `"2026?0601"`, while the dot-path read
  unescapes it. No total is published: that is what was measured, not a closed account.
- **Do not pre-release these values yourself.** `"2026?*0601"` in gives `2026???*0601` out and a
  dot-path read of `"2026?*0601"`.
- **A wrong-typed GS element names its slot.** The type check runs over the unescaped parts, so a
  numeric `groupDate` refuses with `buildInterchange: "GS"-04 must be a string`. **`null` and
  `undefined` in GS-04, GS-05 and GS-07 are absent, not refused**: each resolves through a default
  before either guard sees it.
- **A literal segment id this library writes is never escaped.** `esc` releases against the
  delimiter set the caller declared, and a `componentSeparator` of `"S"` is admissible, so escaping
  element 0 would turn the literal `"GS"` into `G?S`. `GE`, `ST`, `SE` and `IEA` follow the same
  rule. **Read "literal" strictly:** a `SegmentSpec` body segment is `[segmentId, ...elements]`
  supplied wholesale, `buildInterchange` releases that caller-supplied id, and `SegmentSpec`'s JSDoc
  says it is emitted verbatim. The two disagree. It is noisy rather than silent, since a
  `?`-prefixed id is rejected by the envelope walker as an orphan with `X12_UNEXPECTED_SEGMENT`, and
  which side is wrong is a decision, so it is recorded rather than changed.
- **What this does not cover.** `buildInterchange`'s IEA-02 does not go through the escaper: it is
  padded and has to stay byte-equal to the fixed-width ISA-13 it reconciles against. The ISA
  fixed-width slots are outside both guards. And an unescaped active delimiter is not safe anywhere,
  because that is what a delimiter is.

### `buildTA1` releases its five elements against the delimiter set you state

**`buildTA1` releases its five caller-supplied elements, so an acknowledgment this library emits
reads back with the disposition it was given.** TA1-04 is the disposition and TA1-05 the note, and
`parseTA1` narrows an out-of-enum TA1-04 to `R`. An unreleased value carrying an active delimiter
would take a slot of its own and shift every element after it down one: a TA1-01 of `"0000*0001"`
would put an Accept on the wire that reads back as a Reject, on the element that reassociates it,
and a `noteCode` of literally `"A"` shifted onto TA1-04 would make a Reject read back as an Accept,
which is the less safe direction, because a sender who reads an Accept does not resubmit.

- **The grounding is inside this package, not in a spec clause.** Every other builder releases the
  same class of element through the same helper, and the package's own reader has to decode what
  its builder wrote into the disposition the caller asked for. Nobody here has read a clause that
  settles it.
- **A value containing none of the four delimiters and no `?` is emitted byte for byte**, and that
  is every conformant TA1: TA1-01 echoes ISA-13, TA1-02 and TA1-03 echo ISA-09 and ISA-10, and
  TA1-04 and TA1-05 are code list values. A value containing one is released.
- **Only `*`, `~` and a `?` immediately before the separator shift the segment's own framing.**
  `^` and `:` move the dot-path reader instead, and releasing them is a gain there:
  `getSegmentValue(ta1, "01")` answers `"0000^0001"` for a control number of `"0000^0001"` rather
  than the first repetition, and the composite read `"01-1"` answers the whole of `"0000:0001"`.
  **The measured cost is a mid-string `?`, and only on the surfaces documented as raw**: `raw` and
  `elements` read `"0000??0001"` for `"0000?0001"`, while every dot-path read and `parseTA1`'s
  fields unescape it. No total is published: that is what was measured, not a closed account.
  (`getSegmentValue` takes an `X12Segment` and `Ta1Segment` carries no `id`, so add one to read a
  TA1 through it.)
- **Do not hand-roll the escape.** `"00000001??"` in gives `TA1*00000001????*…` out and a read of
  `"00000001??"`.
- **The release is scoped to the delimiter set the caller states.** `BuildTA1Options` takes
  `elementSeparator`, `repetitionSeparator`, `componentSeparator` and `segmentTerminator`, the same
  four `build999` takes, and they exist for escaping and nothing else: `buildTA1` emits no
  terminator. Escaping against a guessed set is a value corruption rather than a safe default:
  `unescapeRelease` preserves `?X` verbatim for any `X` outside the declared set, so a value released
  against the wrong delimiter comes back carrying a stray `?`. **The defaults are the Cosyte
  archetype and this function cannot verify them**: if you embed a TA1 in an envelope that declares
  different separators, state them.
- **A non-string element refuses** with `AckBuildError` / `X12_ACK_INVALID_SPEC`, which releasing
  requires: the bare `escapeRelease` underneath returns its empty accumulator for a `number`, so
  escaping without the type check would replace a value with nothing. `ackCode` `"A"` with a
  non-`000` note still reports `X12_TA1_ACCEPT_WITH_NOTE`, and that check runs first.
- **An empty element refuses too**, and an empty TA1-01 draws the control-number refusal; see the
  entries above.
- **What this does not cover.** `buildTA1` uses no segment joiner, so its refusal names the builder
  and never the slot; and an unescaped active delimiter is not safe anywhere, because that is what a
  delimiter is.

### `build277` requires `unitsOfService`, and other required SVC elements are unguarded

**A 277 service line requires `unitsOfService`, because SVC-07 is a required element in
`005010X212`.** `get277Status` reads SVC-01 through SVC-04 and SVC-07, and `build277` emits them;
`X12ServiceLineStatus.unitsOfService` and `Build277ServiceLineSpec.unitsOfService` carry SVC-07 (X12
element 380, Quantity).

**The two TR3s disagree about the usage and so do the two builders, on purpose.** In `005010X212`
the element is usage **R**, so `build277` throws `ClaimStatus277BuildError` with code
`X12_277_BUILD_INVALID_SPEC` for a service line that omits it. In `005010X214` it is usage **S**, so
`build277CA` accepts the identical spec and omits the element. Usage is read from the pyx12 005010
maps (`277.5010.X212.xml`, `277.5010.X214.xml`), which are outside this repository; the two TR3s
also name it differently, "Units of Service Count" in X212 and "Original Units of Service Count" in
X214, and one model field carries both.

**The count is never defaulted.** A quantity the caller did not supply is a quantity nobody sent,
and a units figure is one a payer reprices against; supplying a `1` would be inventing data on the
wire. The refusal is invisible at compile time and fires at run time.

**SVC-05 is deliberately unread on the 277.** It is usage **N** in both 277 TR3s. On the **835**
SVC-05 is the Units of Service **Paid** Count and is read; reading it on a 277 "for symmetry" would
put a quantity on the model that no 277 sender ever wrote. Same element number, different TR3.

**Read the scope literally: one element's usage is guarded, and an emitted service line is not
thereby conformant.** No census of what remains is published here, on purpose: other required
elements of the same `SVC` are unguarded. `SVC-01` (the composite procedure identifier) and `SVC-02`
(Line Item Charge Amount) are both usage **R** in X212 and both optional on
`Build277ServiceLineSpec`, so a spec supplying only `unitsOfService` emits `SVC*******1~` with no
refusal. `SVC-03` (Line Item Payment Amount) is usage **R** in X212 and usage **N** in X214 and is
optional in both builders. The read side is lenient: an X212 277 arriving with no SVC-07 raises no
warning, because that would need a new Tier-2 registry code. A full 277 usage audit is its own
piece of work.

### An unparseable decimal reads `undefined`, and it warns

**A decimal element that is present and that this library cannot decode as a decimal (`1,234.56`,
`$450.00`, `N/A`) yields no value, and no reader substitutes `X12Decimal.ZERO` for it.** Every slot
that could receive one is `X12Decimal | undefined` and reads `undefined`. **Read that as a rule
about the substitution, not as a census of the model:** an optional slot reads `undefined` too, and
some rows are dropped whole, which is a different shape with a report of its own
(`X12_AMOUNT_ROW_DROPPED`, the next entry). **Every one of those outcomes emits
`X12_UNPARSEABLE_DECIMAL` at the failing `position.elementIndex`, because the warning is a property
of the read rather than of what the reader then does with it.** No list of the outcomes is
published here, on purpose: the rule is what holds, not the census.

Scoping facts that are easy to get wrong in the other direction:

- **An absent element does not raise this code.** It reads `undefined` and `X12_UNPARSEABLE_DECIMAL`
  is not emitted for it, so `undefined` alone does not tell you which of the two happened: the
  warning at that `elementIndex` does, and `readElementDecimal` gives you the same distinction in
  band. Read that as a statement about **this code**, not as "an absent element is silent": where
  the absent element takes a whole `AMT` / `ADX` row off the model, the drop is reported by
  `X12_AMOUNT_ROW_DROPPED` at that segment (the next entry), which is raised for both routes and
  therefore separates neither.
- **An unwarned value is not thereby trustworthy in general.** The warning is a property of a
  decimal read, not of a model slot. A slot the reader never read at all cannot warn, and it holds
  whatever the accumulator was seeded with. **What this guarantees is narrower and exact: an
  unwarned value at an element a reader decoded is what the sender sent.** The known slot of the
  other kind, an 837 service line whose `SVx` never decoded, is covered by a warning of its own
  rather than by this one. No census of never-read slots is published, on purpose.
- **The public helpers are silent without a sink.** `elementDecimal` / `elementDecimalOrZero` take
  an optional 4th `X12DecimalWarningSink`. Every reader inside this library passes one, and a
  source scan in `test/parser-decimal-silent-defaults.test.ts` keeps it that way. **A consumer
  calling them directly and omitting it gets no warning**, which keeps their signature working.
  `readElementDecimal` is the sink-free way to get the distinction in band.
- **The scan is a syntactic tripwire, not a proof.** It counts the arguments of every
  `elementDecimal` / `elementDecimalOrZero` call under `src/transactions/` after stripping
  comments. It says nothing about a decimal decoded some other way, and no exhaustive census of such
  routes is published here, on purpose.

### An `AMT` or `ADX` whose amount does not decode loses its whole row, and says so

**These segments carry an amount plus the thing the amount is about: AMT-01's qualifier, ADX-02's
adjustment reason code, ADX-03 / ADX-04's reference.** The readers build no row at all when the
amount (AMT-02, ADX-01) decodes no value, so what the sender did state goes with it.
**`X12_AMOUNT_ROW_DROPPED` reports it**, anchored at the `AMT` / `ADX` and carrying **no
`elementIndex`**, because one of its two routes is an absent element and an absent element has no
index to name. Four surfaces raise it: the 835's `AMT`, the 837's `AMT`, the 834's coverage `AMT`
(on that **member's** own `warnings`, exactly as the decimal sink beside it is scoped) and the 820's
`ADX`. On the 835 and the 837 the `AMT` attaches to the open **service line** first and to the claim
only when there is none, so **the row lost may be a line-level one**: do not read an unchanged
`claim.amounts` as evidence the warning is stale. Bounds worth stating:

- **It travels with `X12_UNPARSEABLE_DECIMAL`, and does not replace it.** A present-but-undecodable
  amount raises `X12_UNPARSEABLE_DECIMAL` at its own `elementIndex` alongside this code. Whether one
  accompanies this code at the same `segmentIndex` is what tells the absent route from the
  unparseable one, since this code is raised for both and discriminates neither.
- **It reports a row whose amount was read and decoded no value, and nothing wider.** State it as a
  property of the read, not of the walker's control flow. A segment discarded before its amount is
  read is not on this channel (the 834's `AMT` with no `HD` open, the 820's `ADX` with no remittance
  open), and neither is one whose amount decoded and then found nothing to attach to (the 835's and
  the 837's `AMT` before any claim). **Do not write it as "nothing open means silent":** the 835 and
  the 837 decode first, so an `AMT` with an absent amount and no claim open does raise this code.
- **An 820 `RMR` is not on this channel, and the reason is not that its row survives.** `decodeRmr`
  drops on open-item identity (RMR-01 and RMR-02 both empty), **before** RMR-04 is read. So an `RMR`
  that states an open item and no amount keeps its row with `amountPaid` left `undefined` and there
  is nothing to report, but an `RMR` that states an **amount and no open item** is dropped whole,
  taking a stated payment, its payment-action code and its amount due with it. Nothing failed to
  decode there, so it is not this code's shape; `X12_STATED_AMOUNT_DISCARDED`, below, reports it.
- **A Loop 2430 `AMT` under an open `SVD` is discarded outright, and this code is not what says
  so.** With a claim and a line open, the 837's adjudication skip drops an `AMT` that decoded
  perfectly well; `X12_STATED_AMOUNT_DISCARDED`, below, reports it.

### A row the sender stated can still be discarded, and says so

**The code above is about an amount this library could not read. This is the opposite case: the
reader discards the row for a reason that is not about the amount at all**, so the amount was never
the problem and, on one of the two routes, was never even looked at. The bytes stay verbatim on
`tx.segments[…].raw`; decode them yourself. **`X12_STATED_AMOUNT_DISCARDED` reports them**, anchored
at the segment and carrying **no `elementIndex`**. The two routes, enumerated:

- An **820 `RMR`** under an open remittance loop whose RMR-01 and RMR-02 are **both empty** while
  RMR-04 or RMR-05 is populated. `decodeRmr` refuses the open item on identity before either amount
  element is read, so a stated payment, a stated amount due and RMR-03's payment action code leave
  the model together. A bare `RMR~` states nothing and stays silent.
- An **837 `AMT`** arriving while a Loop 2430 line adjudication (`SVD`) is open, whose AMT-02
  decoded. The adjudication model carries no amount row, and attaching one to this submission's own
  service line would put another payer's figure on it, so the row is skipped. `AMT*EAF` (Remaining
  Patient Liability) on a Loop 2430 is exactly the shape being lost.

Bounds worth stating:

- **It is additive.** `X12_AMOUNT_ROW_DROPPED` and `X12_UNPARSEABLE_DECIMAL` fire on the documents
  they fire on without it, pinned by committed tests.
- **The two amount-row codes are disjoint and can never name the same segment**, because this one
  requires an amount element the sender populated and the other requires one that decoded no value.
  The code you get is the discriminant.
- **It reports a segment that arrived while the loop that would carry its row was open.** An `AMT`
  or `ADX` reaching a reader with **no such loop open** is a different loss and is **silent**: the
  834's `AMT` with no `HD` open, the 820's `ADX` with no remittance open, and the 835's and the 837's
  `AMT` before any claim or service line is open. **At those last two sites the channel reports the
  smaller loss:** with no claim open an 835 `AMT*B6~` raises `X12_AMOUNT_ROW_DROPPED` while
  `AMT*B6*500.00~` raises nothing. And on the `RMR` route this code says nothing about whether the
  amount would have decoded, because the row is refused before the decode is attempted, so **no
  `X12_UNPARSEABLE_DECIMAL` accompanies it even where the bytes are unreadable.** It is raised on
  `RMR****1,234.56~` exactly as on `RMR****150.00*150.00~`, so **never read an unaccompanied
  instance as evidence the bytes are postable**; only the `AMT` route guarantees a decodable amount,
  because there AMT-02 decoded before the row was skipped.

### An 835 balance equation with an undecoded term is reported as unevaluable

**The three 835 balance equations (line, claim, top-of-remit) read amounts that are all
`X12Decimal | undefined`.** Where any term of an equation is `undefined`, the equation is not run
and `X12_835_BALANCE_NOT_EVALUABLE` is emitted instead of `X12_835_REMIT_BALANCE_MISMATCH`, because
nothing was measured out of balance: substituting `0` for the missing term would be this library
asserting a total nobody sent, and an 835 with an absent `CLP-03` would report a mismatch between
the payer's own amounts and an invented zero. Two bounds worth stating:

- **An empty list is not an absent term.** A claim carrying no `CAS` really did state no
  adjustments, and that sums to `X12Decimal.ZERO`. Only a term this library decoded no value from
  stops the equation.
- **`build835` cannot reach it from TypeScript.** Every balance term on `Build835Spec` is a required
  `X12Decimal`. A JavaScript caller passing `undefined` gets `X12_835_BUILD_INVALID_SPEC`,
  deliberately not the build-side balance-mismatch code.

### The public `elementDecimalOrZero` helper still substitutes zero

**The public `elementDecimalOrZero` helper substitutes `X12Decimal.ZERO`, and no reader in this
library calls it.** It stays exported with its documented behaviour, so a consumer walking segments
itself can opt into the substitution knowingly. `elementDecimal` and `readElementDecimal` are the
honest routes.

### An 837 service line whose service segment never decoded has no charge, and warns

**`get837Claims` resolves one variant for the submission, from the caller's `type` option, else
ST-03's implementation-convention reference, else the first `SVx` segment present.** A Loop 2400
line is then decoded only by the `SV1` / `SV2` / `SV3` that matches that variant. When none arrives,
because the line carries an `SVx` for a different variant (an ST-03 of `005010X222A2` on a file
whose lines are `SV2`, or a `{ type: "P" }` over the same) or because it carries no `SVx` at all,
**nothing on the service segment is read**: the line's `charge` and `units` hold the accumulator's
seeded `undefined`, and its procedure code, modifiers, unit of measure and place of service are
equally undecoded. **That line emits `X12_837_SERVICE_LINE_NOT_DECODED`, anchored at the `LX` that
opened it.** Read the values off `tx.segments[…].raw` and decide which of the two disagreeing
signals the sender meant.

- **Ignoring the foreign `SVx` is deliberate and is not the limitation.** `SV1-02` and `SV2-03` are
  both the line charge, so decoding an `SV2` into a Professional line would mis-read money. Refusing
  to read is the safe half; the warning is what keeps it from being silent.
- **`undefined` does not say why, which is what the warning is for.** `charge` and `units` are
  `X12Decimal | undefined`, so a consumer that never reads `.warnings` at least sees that nothing
  was decoded, but it cannot tell this case, where no `SVx` was read at all, from an `SVx` that was
  read and carried no charge element. Only `X12_837_SERVICE_LINE_NOT_DECODED` separates them.
- **The line is retained, and so are the bytes.** Nothing is dropped: the service line is on the
  claim, and every segment, decoded or not, stays verbatim on `tx.segments`.
- **Neither cause is attributed to the sender.** A `type` option that disagrees with a perfectly
  conformant document produces the same warning as a document that disagrees with itself, and the
  library does not decide which side is wrong. A line with no `SVx` at all is short a Loop 2400
  segment the 837 TR3s require, but that judgement is yours to make from the bytes.
- **An unresolvable variant is a different case, and it is reported.** With no `type`, an ST-03
  that resolves to no known variant **and no `SVx` anywhere in the transaction to fall back on**, no
  service line is opened and no value is fabricated on any line slot. That raises
  `X12_837_UNKNOWN_VARIANT` for the submission, and `X12_837_SERVICE_LINE_DROPPED` at each `LX` that
  consequently opened nothing, so the missing lines are reported per line and not inferred from a
  count. Checking `submission.variant` against the set you expect is worth doing, as a cheap
  assertion rather than as a defence. `X12_837_UNKNOWN_VARIANT` points at the **`ST`**
  (`tx.segments[0]`), which carries the ST-03 the resolution reads. No `elementIndex` is set,
  deliberately: one of the two routes into this warning is an ST-03 that is absent entirely, and on
  that route the `ST` has no element 3 to name.

### An 837 `LX` that opens no service line raises `X12_837_SERVICE_LINE_DROPPED`

**Distinct from `X12_837_SERVICE_LINE_NOT_DECODED` above, where the line is on the model and only
its service segment went unread: here the line reaches no claim's `serviceLines`**, so its charge,
units, procedure code and modifiers are read into nothing. Two causes: no Loop 2300 (`CLM`) is open
at that `LX`, or the submission's variant is not one of `P` / `I` / `D`. Nothing is fabricated to
stand in and no claim is synthesized; the segments stay verbatim on `tx.segments`. **Do not read an
empty `serviceLines` as "the claim had no service lines" without checking the warning channel.**
Bounds on that code, each measured:

- **It does not travel with `X12_837_UNKNOWN_VARIANT`.** A caller-supplied `type` outside
  `"P" | "I" | "D"`, which only a JavaScript or `JSON.parse`d caller can pass, reaches the second
  cause with no unknown-variant warning at all. Read `submission.variant`, not the other code.
- **What becomes of a `DTP` / `AMT` / `NTE` / `REF` / `N3` / `N4` / `PER` after a dropped `LX`
  depends on the route, and is not simply "absent" on either.** With a `CLM` open (the variant
  route), the line service date, amount and note land among the **claim-level** ones,
  indistinguishable from them, and a trailing `REF` lands among the claim-level references. With
  **no** `CLM` open, **all seven are discarded**: nothing following that `LX` attaches to the party
  named before it. **Read the segments off `tx.segments[…].raw` rather than inferring either
  outcome.** This reader does not surface every one of those kinds on every party (a `PER` on a
  patient or a pay-to address reaches the model on no route), and no per-kind, per-party map is
  published here; `tx.segments` is what settles it for a given document.
- **The discard on the no-claim route is a trade, and its cost is that a conformant entity segment
  can be dropped.** The TR3s nest Loop 2400 inside Loop 2300 and say nothing about an `LX`
  elsewhere, so which party a segment following a **stray** `LX` belongs to is not derivable from
  the spec in either direction. Where the `LX` was injected into an **entity** loop, the `N3` / `N4`
  / `REF` / `PER` after it really were that entity's, and they are discarded: measured, a payer
  carrying a `PO BOX` address, a `2U` secondary id and a contact after such an `LX` comes back with
  `address: undefined`, `references: []` and `contacts: []`. The direction rests on this library's
  own invariant, not on a clause: a mis-attribution puts a value on an object the sender never put
  it on, indistinguishable from real data, whereas the bytes of a discarded segment are still on
  `tx.segments`. Each such `N3` / `N4` / `PER` / `REF` raises
  `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX` (its own entry below); `X12_837_SERVICE_LINE_DROPPED`
  at the `LX` reports the **service line** and not the entity's address, id or contact. Reporting
  the loss does not restore it.
- **An `SVx` with no `LX` at all raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX`**, anchored at the
  service segment itself, because both codes above are anchored at an `LX`. See the next entry. **The
  warning channel is a report of the losses this library knows how to name, and `tx.segments` is
  the only complete account of the bytes.**

### A service segment with no service line open raises `X12_837_SERVICE_SEGMENT_WITHOUT_LX`

**An `SV1` / `SV2` / `SV3` that arrives with no Loop 2400 open raises
`X12_837_SERVICE_SEGMENT_WITHOUT_LX`, anchored at the service segment itself.** The other two codes
in this family both name an `LX`, and this case is defined by there being no line open to name one.
**Read that condition literally.** It is **not** "the file contains no `LX`": an `LX` in an earlier
claim is still an `LX`, and `CLM*1~ LX*1~ SV1~ CLM*2~ SV1~` raises this code on the second `SV1`
while the first claim keeps its decoded line. Nothing the segment carries is read (not its charge,
units, procedure code, modifiers, unit of measure or place of service), no line reaches any claim's
`serviceLines`, and nothing is fabricated to stand in. Bounds, each measured:

- **The three codes never report the same service segment**, because the other two are raised at an
  `LX` and this one only where no line is open. A document with several claims can carry all
  three, on three distinct segments; that case is a committed test.
- **An `LX` that opened nothing suppresses it for the segments inside that dropped loop**, which is
  deliberate: the loss is already named, once, at the `LX`. The suppression is scoped to the dropped
  loop and is cleared by the next flush, so a later orphan in the same transaction is still
  reported. Both halves have a red negative control.
- **It reports once per service segment, not once per loop.** Two orphan `SVx` segments raise two
  warnings at two positions, so a consumer can name both rather than infer a count from one.
- **The segment is not decoded into any line.** `SV1-02` and `SV2-03` are both the line charge, so
  reading a service segment into a line the walker never opened mis-reads money. An absent `SV1-02`
  on a line that did open reads `undefined`, and this code has nothing to do with it.
- **It says nothing about the variant.** Variant resolution runs before the walk. A caller-supplied
  `type` option wins first; absent one, and where `ST-03` names no implementation convention this
  reader recognises, it **falls back to the first `SVx` segment id anywhere in the transaction body,
  orphans included**. So a stray `SV2` under an unrecognised `ST-03` re-types the whole submission
  as Institutional, and every conformant `SV1` line in it then reads `charge` `undefined`, `units`
  `undefined` and an `undefined` procedure code (`undefined`, not `""`, which on such a line is the
  `revenueCode`). Passing `{ type: "P" }` reads the same document correctly. Excluding orphans from
  the fallback would change how existing documents decode and is not done. It is warned rather than
  silent (`X12_837_SERVICE_LINE_NOT_DECODED` at each `LX`, and `X12_837_AMBIGUOUS_VARIANT` where the
  resolution was contested, the entry below), and `submission.variant` is the field that tells you.

### A contested 837 variant raises `X12_837_AMBIGUOUS_VARIANT`

**An 837 variant the `SVx` fallback resolved in a body that names more than one variant raises
`X12_837_AMBIGUOUS_VARIANT`, anchored at the `ST`.** The fallback is deliberately not narrowed: it
takes the **first** `SV1` / `SV2` / `SV3` in the body, orphans included, and which documents reach
it is decided by the ST-03 list above. What this code adds is that the resolution says so, so a
consumer routing on `submission.variant` is not left with a confident `"I"` that a stray `SV2`
chose. Bounds, each a committed test:

- **It reports the resolution, never the document.** A caller-supplied `type` wins ahead of the
  fallback, and so does an `ST-03` this reader turns into a variant; in either case no guess was
  made and this code is not raised **however mixed the body is**. Never restate it as "the file
  carries more than one kind of service segment".
- **Which service segment is the stray one is not decided.** This reader cannot tell a stray
  service segment from a conformant one, and the fallback takes the first whether or not a Loop
  2400 was open at it, so an orphan decides the variant like any other. Reporting the conflict is
  honest; picking a winner would be inventing.
- **It is additive.** `X12_837_SERVICE_LINE_NOT_DECODED`, `X12_837_SERVICE_SEGMENT_WITHOUT_LX` and
  `X12_837_SERVICE_LINE_DROPPED` fire on the documents they fire on without it, in the same
  positions, and no predicate changes meaning because of it.
- **It can never travel with `X12_837_UNKNOWN_VARIANT`**, which is the other outcome of the same
  resolution: a body with conflicting service segments has, by construction, at least one to fall
  back on. It fires **once per transaction**, because there is one resolution per transaction.
- **What it does not cover:** narrowing the fallback, which is deliberately left alone. A second
  `SVx` inside an already-open Loop 2400 is the entry below: one whose kind does not match the
  resolved variant is read into nothing, and a duplicate of the matching kind is read into the line
  and replaces what the first one wrote.

### A second service segment in one service line replaces the first, and warns

**A second `SV1` / `SV2` / `SV3` inside an already-open Loop 2400 raises
`X12_837_SERVICE_SEGMENT_REPEATED`, anchored at the repeated service segment itself.** A service
line carries **one** service segment's worth of slots, and every decoder writes **all** of the
slots its kind writes, so the model holds what the **last** service segment matching the
submission's resolved variant wrote and nothing of any earlier one. That is money and a procedure
code: under an `ST-03` of `005010X222A2`, `SV1*HC:99213*8500*UN*4***1~` followed by
`SV1*HC:99999*12*UN*1***1~` inside one `LX` leaves one line reading `charge` `12` and
`procedureCode` `99999`, and this code is what says so. Bounds, each a committed test:

- **The decode is not narrowed, and that is deliberate.** Last-wins holds element for element. This
  reader cannot tell a stray service segment from a conformant one, so choosing the first instead
  would be inventing, and changing which occurrence wins would change how already-published
  documents decode, the same call made about the variant fallback in the entry above. **This
  closes only the silence.**
- **The worst corner is a repeat whose own charge element is absent.** It writes `undefined` over
  the amount the first one stated, and `X12_837_SERVICE_LINE_NOT_DECODED` does **not** fire on that
  line, because a service segment did decode. This code is then the only thing on the channel that
  says why the charge is empty.
- **It fires on a repeat of any kind, decoded or not.** A service segment whose kind does not match
  the resolved variant is read into nothing and overwrites nothing (the loss there is that what it
  carries reaches no part of the typed model), and it is reported the same way, whether it arrives
  before or after the matching one.
- **Once per repeat, and the count is scoped to the line, never latched.** Three service segments
  in one Loop 2400 are two warnings at two positions; a first service segment under a later `LX`, or
  in a later claim, is a first and never a repeat. A latching flag would report a conformant second
  line.
- **It can never name the same segment as `X12_837_SERVICE_SEGMENT_WITHOUT_LX`**, which requires
  that no Loop 2400 be open where this one requires that one is. It can travel with
  `X12_837_SERVICE_LINE_NOT_DECODED` (at the `LX`), with `X12_837_AMBIGUOUS_VARIANT` (at the `ST`),
  and with `X12_UNPARSEABLE_DECIMAL` raised by the repeat's own amount bytes. **That last pair sits
  at the same `position.segmentIndex`, separated only by the decimal code's own
  `position.elementIndex`**, measured and pinned by a committed test. Never read a co-occurring pair
  here as two segments.
- **It is additive.** Every other code this reader raises on a document of this shape, it raises at
  the same position with or without this one, and no predicate changes meaning because of it. Read
  that as invariance and **not** as a list of what else you will see. The cookbook's "gate before
  you post a line amount" recipe names this code beside the four others, and a committed test pins
  that a gate on the four alone misses the overwrite document.

### An entity segment discarded after a stray `LX` raises its own warning

**An `N3` / `N4` / `PER` / `REF` discarded after a stray `LX` raises
`X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, anchored at the discarded segment itself.** This is
the code that names the trade recorded in the `X12_837_SERVICE_LINE_DROPPED` entry above: where an
`LX` with **no `CLM` open** lands inside an entity loop, it closes that loop, so those four segment
kinds reach no party on the model. Discarding them is what stops a line-level value surfacing as a
property of a party the sender never put it on, and this code is what stops that discard being
silent. **It reports that the segment reached no party, not that it would have reached one**, so it
can fire where this library's own reset lost nothing. The anchor is the segment and not the `LX`,
because the loss is per segment: two `N3`s are two warnings at two positions, so a consumer can
name both. Bounds, each a committed test:

- **It is not a general "this entity segment reached no party" report, and must never be restated
  as one.** It reports one discarded after such an `LX`, and only until the next `NM1` / `HL` / `CLM`
  opens a loop. A party named after that `LX` is outside this code's scope again and its trailing
  segments are silent: the scope is a scope, not a latch. **Whether they attach is a separate
  question this code does not answer**, and for some party and segment kinds the answer is always
  no: a `PER` reaches neither a patient nor a pay-to address.
- **Every other route to an unattached `N3` / `N4` / `PER` / `REF` is silent**, deliberately: no
  entity loop open at the stray `LX` at all (nothing was lost by this library's doing, since those
  segments would reach no party anyway), an `NM1` this reader cannot route, an intervening `HL` or
  `CLM`, and the other dropped-`LX` route where a claim **is** open. Widening it to those is a guard
  change and would be its own decision.
- **The `DTP` / `AMT` / `NTE` of the seven trailing kinds are not reported by it.** They are
  discarded on that route too, because they never attach to a party on any route.
  `X12_837_SERVICE_LINE_DROPPED` at the `LX` is what reports that loop's loss.
- **It does not restore anything.** The segments are discarded, and are verbatim on `tx.segments`,
  which remains the only complete account of the document. Which party a segment following a stray
  `LX` belongs to is not derivable from the TR3s in either direction, so the reader refuses to
  attribute it rather than guessing.

### A repeated 837 pay-to address keeps one occurrence, and warns

**An 837 Loop 2000A that names the pay-to address more than once has only one slot on the model to
put it in, and the model carries one of the addresses rather than both.** The TR3s allow Loop 2010AB
at most once per Loop 2000A, so a repeated `NM1*87` is a non-conformant document. Each one raises
`X12_837_PAY_TO_ADDRESS_REPEATED`, anchored at the repeated `NM1*87`, so the choice below is never
made in silence.

**The rule, stated in the emit side's terms because the emit side reads this slot:** occurrences
are never merged; the **last occurrence that states an address of its own** takes the slot; and an
occurrence that states none (one with no `N3` or `N4` at all, or only a valueless `N3` / `N4` whose
elements are empty) **does not blank one that did**. "States an address" means exactly what
`emitAddress` would write a segment for, and reader and writer share one predicate so they cannot
disagree. That last clause matters: `build837P/I/D` gates Loop 2010AB on
`payToAddress !== undefined`, so a slot cleared or blanked by a repeat that stated nothing would
re-emit as **no pay-to loop**, or as a **bare `NM1*87`** carrying neither `N3` nor `N4`. Both say
something about where a payment goes that the sender did not. Merging is refused because a merged
address, street lines from one occurrence and a country from another, names a payment destination
no sender stated.

**The cost: a repeat that states only part of an address puts only that part on the model, and
re-emits only that part.** A second `NM1*87` followed by an `N4` and no `N3` reads back that `N4`
with `lines: []` and re-emits a Loop 2010AB with no `N3`. Keeping the earlier street lines would be
the merge, so they are not kept. **Which occurrence the sender meant is not derivable from the
TR3s**, and the losing occurrence's address is **not on the model in any form**: `tx.segments` is
where its bytes are, and remains the only complete account of the document.

**Two bounds, both measured.** This is scoped to the pay-to route, which lives in Loop 2000A: an
`NM1*87` arriving while a `CLM` is open never reaches that route, and is neither resolved nor warned
by this code. **Where it lands instead depends on whether a service line is open, and this document
does not state a single destination for it**, because two were measured: with a Loop 2400 open it
joins that line's `serviceLine.providers` (a line-level provider is TR3 Loop 2420), and with a claim
but no line open it joins `claim.providers` (Loop 2310). And a document with **at most one**
`NM1*87` per Loop 2000A is unaffected in every respect, warning channel included, including a lone
`NM1*87` with a valueless `N3`, which reads an address with no elements and re-emits a bare
`NM1*87`.

**A re-emitted loop can be short a required segment either way.** In Loop 2010AB the TR3s make
`NM1`, `N3` **and** `N4` all Required, so a re-emitted loop carrying only the winning occurrence's
`N4` is short a Required `N3`, exactly as a bare `NM1*87` is short both. The difference from a merge
is provenance, not conformance: every element that is emitted was stated by the occurrence the model
kept. Emitting a Loop 2010AB short a Required segment is a property of `emitAddress`, reachable from
a lone `NM1*87` with an `N4` and no `N3`.

### A lookup keyed by document bytes ignores inherited object keys

**A table keyed by document bytes answers only for its own keys, never for a key inherited from
`Object.prototype`.** The bundled code lists, the 837's variant resolution and the 837's HL
parent-level map resolve through own-property lookups, so an inbound value such as `constructor`
behaves exactly as any other unrecognised value does: a variant lookup resolves nothing, a code-list
lookup finds no entry and the reader raises the same unknown-code warning it raises for any other
unknown code, an HL-03 is treated as any other unrecognised level code, and
`isClaimAdjustmentGroupCode("constructor")` answers `false`. The `in` operator walks the prototype chain and `Object.freeze` changes nothing about it,
so the lookups rely on neither. The set of inherited members is engine- and version-dependent
and is deliberately not enumerated here. The 271 / 277 / 278 readers' `EXPECTED_PARENT_LEVEL`
tables are read only through `src/transactions/shared/hl.ts`, which guards with `hasOwnProperty`.

**What is not claimed:** there is no source-level scan enforcing this shape. A syntactic scan cannot
tell a table keyed by document bytes from one keyed by a library-owned discriminant, and the message
registries in `src/parser/warnings.ts` are legitimately the latter, so such a scan would need a
per-table allowlist. The defence is behavioural instead: the suite derives its key list from
`Object.getOwnPropertyNames(Object.prototype)` at run time, so a future engine adding an inherited
member widens it without anyone editing a list.

### The 835 SVC map reads the revenue code from SVC-04 and the paid units from SVC-05

**`get835` reads Loop 2110 SVC to this map, and `build835` writes to the same places:**

| Element | X12 element                        | Meaning                             | Model field              |
| ------- | ---------------------------------- | ----------------------------------- | ------------------------ |
| SVC-04  | 234, Product/Service ID (a string) | NUBC revenue code                   | `revenueCode`            |
| SVC-05  | 380, Quantity                      | Units of Service **Paid** Count     | `paidUnitsOfService`     |
| SVC-06  | C003 composite                     | original / submitted procedure      |                          |
| SVC-07  | 380, Quantity                      | **Original** Units of Service Count | `originalUnitsOfService` |

`serviceLine.revenueCode` is `undefined` on a professional line. `build835` with a revenue code
`0300` and 2 paid units emits `SVC*HC:99213*600.00*550.00*0300*2*HC:99212`. **An 835 that puts a
revenue code in SVC-05, a Quantity element, reads back as a paid quantity** (`0300` becomes 300
units) with no revenue code and no warning; the changelog says which releases of this library
emitted that shape, and re-emitting from the model produces conformant bytes.

**Sources, and what was not read. The TR3 005010X221A1 itself is a paid X12 document; nobody here
has read it.** Sources 1, 2 and 4 below are free to check and are linked; source 3 is a paid X12
document, named rather than linked, and every fact taken from it is independently carried by source
1 anyway. Read the qualifiers literally, because an unsourced assertion about this table baked into
a code comment is exactly how a wrong map ships:

1. **The full X221A1 element table**, from [pyx12](https://github.com/azoner/pyx12)'s
   machine-readable map `pyx12/map/835.5010.X221.A1.xml`, an independent open-source implementation
   of this same guide: `SVC04 / 234 / "National Uniform Billing Committee Revenue Code"`,
   `SVC05 / 380 / "Units of Service Paid Count"`, `SVC06 / C003`,
   `SVC07 / 380 / "Original Units of Service Count"`. **This is the source for SVC-04**, and the only
   one here that carries the whole map.
2. **X12's own [RFI #2163](https://x12.org/resources/requests-for-interpretation/rfi-2163-835-svc05-vs-837-svd05)**,
   which names "the SVC05 'Units of Service Paid Count/Quantity' in the 835 guide" and states that "a
   default has been included for SVC05 in guide 005010X221A1". Primary, from X12, naming the guide,
   but it speaks only to SVC-05.
3. **The base X12 005010 SVC element dictionary**: SVC-04 is element 234, a string, and SVC-05 and
   SVC-07 are both element 380, Quantity. This does not say what SVC-04 carries, but it **rules out a
   revenue code at SVC-05** on type alone.
4. **Published payer companion guides implementing X221A1** ([Florida Health Care
   Plans](https://www.fhcp.com/documents/edi-forms/Florida-Health-Care-Plans-835.pdf) p.44 gives all
   three names; [South Dakota
   Medicaid](https://dss.sd.gov/docs/medicaid/providers/billingmanuals/HIPAA/835_Healthcare_Payment.pdf)
   p.9 gives SVC-04 and SVC-05).

**Agreement inside this repo is not one of the sources.** The 277 modules use SVC-04 and every
committed 835 fixture is written to the map above, which is corroborating, but checking a spec claim
against this repo's own implementation only proves the two agree.

**An absent SVC-05 is not defaulted to one.** X221A1 is reported to assume the value is one when not
present; that is source 2's Description, quoted secondhand, not a clause read from the TR3. This
reader leaves `paidUnitsOfService` `undefined` regardless, because fabricating a count the sender
did not send is inventing data.

**`undefined` on either quantity means "not decoded", not "absent".** The element may have been
missing, or present and unparseable as a decimal; the two share one `undefined` on the model, and
the unparseable case raises `X12_UNPARSEABLE_DECIMAL` at that `position.elementIndex` while the
absent case raises nothing, so a warning at the element is what tells them apart. The verbatim
element is on `tx.segments`.

**The 277's SVC-07 is a different element in a different TR3 and is decoded and emitted in its own
right** (see the 277 entry above). Do not read either field off the other.

### Bundled code-list snapshots are subsets, not the full published lists

**Bundled code-list snapshots are pre-launch initial subsets, not the full WPC-published lists.**
CARC, RARC, Claim-Status-Category (CSCC), Claim-Status (CSC), service-type, CLP-status, and
maintenance-type ship as versioned data artifacts sized to the parser's Tier-1/Tier-2 fixtures plus
the long-tail codes most workflows branch on. An inbound code **outside** a snapshot still parses:
the verbatim code is preserved on the model and an `X12_UNKNOWN_*` warning is raised. Only the
human-readable **description** is absent (`undefined`). A stale or partial snapshot therefore yields
a missing description, **never a wrong code**. Every snapshot states which it is: `meta.completeness`
is `"cited-subset"` on all seven today, so a lookup miss means this package does not carry the code
and never that the publisher did not issue it. Run `pnpm refresh:code-lists` to audit snapshot
freshness; regenerating the full lists (`--fetch`) is a release step gated per list on that list's
own recorded redistribution terms (see below), not a runtime fetch.

### `serialize(parse(s)) === s` is not guaranteed

**`serializeX12` rebuilds the interchange from the model, so every segment the parser recorded comes
back verbatim (element padding, composites, and `?`-release escapes included), in the order the
model holds it.** Five constructs are known not to survive:

1. **Line breaks between segments.** Most senders write one after each terminator; the parser absorbs
   any run of CR / LF bytes between segments, so a pretty-printed, double-spaced, or mixed-ending
   file all emit the same compact form. **Silent.**
2. **A doubled segment terminator** outside a transaction. It delimits a zero-length segment carrying
   no elements, so there is nothing to retain. **Silent.**
3. **A missing final segment terminator.** The emit supplies one. **Silent.**
4. **Post-IEA `trailingBytes`**, re-joined from segment slices rather than preserved verbatim.
5. **TA1 position.** A TA1 that appeared **after** a functional group is collected onto
   `ix.ta1Segments` and emitted immediately after the ISA, so the emit **reorders** it. **Silent**,
   and unlike the others nothing is lost: the model and the warning stream both round-trip
   identically. It is also the only construct that moves something _else_: a segment outside a
   transaction is placed correctly relative to the groups, but not relative to a TA1 hoisted past
   it. This library takes no position on where ASC X12 requires a TA1 to sit.

**Cases 2 to 5 break the round trip on inputs containing no line breaks**, so "my file is compact"
is not sufficient grounds to expect byte equality. **Four of the five (1, 2, 3, 5) produce no warning
at all**, so a clean `ix.warnings` is not evidence that a round trip will be byte-exact; only case 4
warns.

**A segment outside a transaction is not on this list**, and neither is one whose first element is
empty (`*A*B~`), which is handled as any other segment outside a transaction with an empty
`segment.id`. Each raises `X12_UNEXPECTED_SEGMENT`, is retained on `ix.orphanSegments` **and** is
re-emitted, so the bytes, the value and the warning all survive. `{ strict: true }` refuses such a
segment like any other unexpected segment. Placement is by the **structural anchor** on
`X12OrphanSegment.anchor` (which group, which transaction, which offset inside it) and never by
`segmentIndex`. That distinction is the entire correctness argument, because `segmentIndex` indexes
the **input** stream while the emit is not in input order (see case 5, and the zero-length segment
in case 2 occupies an input index that is never emitted). Measured on a two-group interchange with a
TA1 after the first group, a _positional_ re-emit lands a stray segment inside an 835's `ST..SE`
body between `CLP` and `SE`, with no warning on the re-parse, and a stray `SE` closes the transaction
early and corrupts SE-01. An anchor names a slot in the typed tree, which is invariant under both
reorderings. **Use `segmentIndex` to join an orphan to its warning, never to place it.** An anchor
is a position into `groups` / `transactions` / `rawSegments` as they stand on the interchange you
pass in, so reshaping those by hand invalidates it; an anchor that resolves to nothing is emitted at
interchange level before the `IEA` rather than dropped.

**One interaction with spec-clean mode is worth knowing.** A `TA1` that arrived between an `ST` and
its `SE` is lifted off `tx.rawSegments` by the walker but re-emitted where it came from, so it IS a
segment of that transaction set for SE-01 purposes ("segments included in the transaction set,
including ST and SE", X12.6). `{ specClean: true }` therefore counts it, and
`{ recomputeCounts: true }` writes the count that matches the emitted bytes. Counting the model
alone would shrink a correct SE-01 by one per such segment, which is a count corruption rather than a
correction. An orphan emitted before the `ST` or after the `SE` is outside the range and is not
counted. GE-01 and IEA-01 are unaffected: an orphan is never a `GS` and never opens a transaction
set.

What is **measured** for the orphan round trip: a stray segment inserted at every position of a
two-group, three-transaction interchange, over five segment ids (`ZZ`, `SE`, `GE`, `ST` and `TA1`),
covering all five orphan `context` values and all three anchor kinds. **50 of the 50 insertions that
produce an orphan round-trip byte-exactly** on a base with no envelope-level TA1. On the same base
_with_ one, all **54** differ from their source, and all 54 are byte-identical once the TA1 is
removed from both sides, so the only thing that moved is the TA1 itself, which moves on that base
with no orphan present at all. Across all 104, the transaction bodies, `orphanSegments` (raw, context
and anchor), `ta1Segments`, `trailingBytes` and the warning multiset are unchanged by the round trip,
and every emit is a fixed point.

What is **measured** across every committed fixture: each emit is a fixed point (serializing it
again is a byte-level no-op) and re-parses to an identical model with an identical warning stream;
the fixtures with no line breaks return byte-identical; and the rest differ from their source by
**line breaks and nothing else**, with no element value lost, altered, reordered, or re-escaped. No
corpus size is quoted: it moves with every fixture added, and `test/serialize.test.ts` re-derives the
sweep from the tree on every run. Two caveats on that corpus, both of which limit how far the sweep
can be pushed: it contains **no instance of cases 2 to 5** (zero fixtures produce an
`orphanSegments` entry, which is why the orphan sweep above is constructed rather than drawn from
it), and **all but one of the byte-identical fixtures are `golden/*.edi`**, which are serializer
output by construction, leaving `envelope/no-trailing-crlf.edi` as the only independent witness.
Preserving the original framing byte for byte would need the model to carry per-segment framing and
TA1 position it does not have today; that is a tracked model change, not a behaviour to assume.

### A segment outside a transaction is kept and re-emitted, but never decoded

**The envelope walker binds body segments to an ST..SE transaction and has nowhere in `groups` to
put one that arrives outside:** a stray segment between `GE` and `IEA`, a body segment between an
`SE` and its group's `GE`, a body segment between `GS` and the first `ST`, an `ST` with no open
group, an `SE` or `GE` that closes nothing, or a `TA1` inside an open group. Each raises
`X12_UNEXPECTED_SEGMENT` **and** is retained verbatim on `ix.orphanSegments`, whose `segmentIndex`
is the join key back to the warning's `position.segmentIndex`, and whose `anchor` is the structural
slot `serializeX12` puts it back at.

**One of those is not an "outside a transaction" case at all.** `TA1` is envelope-level by spec, so
a `TA1` inside an open group goes to `ix.orphanSegments` even when it arrived **between an `ST` and
its `SE`**, and it is lifted out of that transaction's `segments` / `rawSegments`. So for a document
containing such a `TA1`, `ix.groups` is not the whole typed model.

**The limitation is decoding, not retention or re-emission.** No `get*` reader sees an orphan:
retention and placement are not promotion into the typed tree, and a segment the envelope grammar
could not place is not one a transaction reader should walk. Read these segments from
`ix.orphanSegments`. That array is empty for a well-formed interchange, so a non-empty one is itself
the signal that the sender's framing did not match the envelope grammar. **It carries the sender's
bytes verbatim, so treat it as PHI**: unlike `ix.warnings`, whose messages come from a frozen
registry and whose metadata is positional, an orphan is document content. Log `context` and
`segmentIndex`, not the whole entry.

One related shape is **not** captured here: a doubled segment terminator (a zero-length segment with
no elements, so there is nothing to retain). A segment whose first element is empty (`*A*B~`) **is**
captured, with an empty `segment.id`. Between segments the parser absorbs any run of CR / LF bytes,
so all 15 CR/LF sequences of length 0 to 3 frame identically and a uniformly double-spaced file
frames as a compact one does.

### 837 claim and line provider addresses are not surfaced

**837 claim-/line-level provider addresses (Loop 2310 / 2420 `N3`/`N4`) are not surfaced.** The
provider **identities** (`NM1`) round-trip, but the street-address lines do not decode onto the
model. Read them from the raw segments if you need them.

### `get834Enrollments` parses the whole file before it streams members

**`get834Enrollments` streams members but still parses the whole file up front.** It yields one
decoded member per `INS` loop (so a consumer holds one member at a time), but the underlying
interchange is fully parsed into `tx.segments` before iteration begins. It is not a byte-streaming
reader for arbitrarily large files.

### A builder refusal shows at most 63 characters of your value, unescaped

**Twenty-four sites across ten builder modules interpolate a value you passed in into the thrown
message, and every one routes through `renderCallerValue`**, so the rendered **fragment** never
exceeds `BUILD_REFUSAL_VALUE_MAX_RENDERED` (**90** characters: 63 of your value, two quotes, an
ellipsis, and the ` (N characters)` suffix at its widest). Both constants and the function are
exported, so you can assert the ceiling rather than take it on trust.

**The ceiling is on the fragment, not on the message.** A refusal message is that fragment plus the
site's own fixed template text, which differs per site, so every message is bounded by a constant
but not by _that_ constant. Measured: a 120,000-character control number produces a
**150-character** `X12BuildError.message` from `buildInterchange`. Do not read 90 as a message
length.

Over-long values are the point of nine of the twenty-four sites (the
`control number "…" exceeds the N-char spec limit` refusal, one per emitting module, where the
branch fires **because** the value is over-long). Seven more have no length gate of their own:
`build999`'s ST-02 trace twice, `buildInterchange`'s transaction-set id, `build837`'s service-line
variant, `build834`'s INS-03 and HD-01 maintenance types, and `buildTA1`'s note code. The remaining
seven are all in `build999`. Four are the AK9-02 / AK9-03 / AK9-04 counts, typed `number`, though a
spec built from `JSON.parse` can carry a string there. Three read `.length` off a caller-supplied
array, which a forged `{ length: … }` can drive to any size.

**What this is and is not.** These are values **you** passed in, so bounding them redacts nothing:
you already hold the value, and if you put patient data in a control number the refusal will show up
to 63 characters of it. What the bound buys is that `Error.message` from a builder has a fixed
ceiling instead of growing with your input, which matters for log lines, crash reports, and JSON
error envelopes. The surviving characters are **not escaped** either: they are whatever you
supplied, including a newline or a segment terminator, so a refusal message is bounded but not
guaranteed to be a single log line.

**The sites that applies to are the ones whose own template names the field:** a control number,
an X12 control code, a count. A refusal will not show you a `claimId`, a member id, a member name, a
trace or a diagnosis code. The shared type guards underneath the templates stand on **every element
of every builder** and cannot tell which slot they are standing on, so the string, segment and
decimal guards report the type and never the value, and so does the array guard's primitive arm.

**The array guard reports the `length` and the class tag of a forged array-like**, bounded through
the same renderer: those describe the shape you forged rather than the contents of a document
element, and they are the whole diagnostic for `{ length: "9".repeat(120000) }`.

### `defineProfile()` refusals are bounded the same way

**`X12ProfileError.message` bounds every caller value it names.** Twelve refusal sites name your
profile name, quirk id, effect, fixture path or expected-warning codes, twenty-three such values
between them, and all twenty-three route through `renderCallerValue` or, where the value's **type**
is what is wrong, `renderCallerJson`, which keeps `null` distinguishable from `"null"` and bounds the
JSON text. The quirk-id pattern carries no length bound, so a bound on the message is what keeps it
small: the `fixture` refusal, which names three caller values (the profile name, the quirk id, and
the `JSON.stringify`d path), measures **431 characters** at a 120,000-character value.

**431 is a measurement, not a maximum.** The ` (N characters)` suffix widens with the decimal width
of the length, so the same refusal measures 434 at 1,000,000 and 437 at 10,000,000 characters. That
site's ceiling, derived from its fixed text plus its three fragment ceilings, is **443**, and the
suite asserts every one of the twelve under 500.

Everything the builder entry says about scope applies here unchanged: it redacts nothing (you passed
the value in), the surviving characters are **not escaped**, and the bound is on UTF-16 code units
rather than bytes.

**`X12ProfileError.profileName` is deliberately not bounded.** It exists so you can pinpoint which
of your definitions failed, and truncating it would stop it matching the name you passed. It is your
own string and you still hold it. If you log a caught `X12ProfileError`, log `err.message` (bounded)
rather than the whole error object.

### A builder refuses a non-string element and never coerces it

**A non-string value in an element slot draws that builder's own typed, code-tagged refusal**
(`X12_835_BUILD_INVALID_SPEC` and its siblings) before anything is emitted. The types say `string`,
so TypeScript callers cannot reach it; a JavaScript or JSON-driven caller can, and one that reads a
spec off `JSON.parse` does. It covers `number`, `boolean`, `null`, `undefined`, arrays, objects,
functions, symbols, bigints and a boxed `new String("…")`. Without it a number would be emitted as
an empty element: `patientControlNumber` as a number would drop CLP-01, the key that reassociates a
remittance back to the 837's CLM-01, from a document that looked successful.

**The library deliberately does not coerce, and you should know why before you reach for
`String(value)`.** A JSON payload that carried `"0012345"` as a number has already lost the leading
zeros; coercing would emit `12345`, a well-formed identifier that is **not the one you sent**, and a
remittance that reassociates to the wrong claim is worse than one that fails to reassociate at all.
`String(1e21)` is `"1e+21"`, `String(NaN)` is `"NaN"` and `String(0.1 + 0.2)` is
`"0.30000000000000004"`. None are valid in an `AN`, `ID` or `Nn` element. **Convert at your own
boundary, where you can still see whether the leading zeros mattered.**

**The type check is structural, and the delimiter escape is not.** The check sits at the one place
every element must pass, **the segment join**, so the statement is a property instead of a list:

> **No non-string value reaches an element of a segment emitted through a builder's segment
> joiner.** A number, `null`, `undefined`, a boolean or an object in an element slot draws that
> builder's own typed, code-tagged refusal, naming the slot the way the spec does
> (`build999: "AK9"-01 must be a string, …`).

The slot in that locator is itself admitted only when it matches the X12 segment-id grammar (two or
three uppercase alphanumerics opening with a letter), because `buildInterchange` takes
`[segmentId, ...elements]` from you wholesale. Free text in element 0 degrades to `element N` rather
than reaching the message.

**Read the "through a builder's segment joiner" qualifier literally.** `buildTA1` does not use one,
and is therefore **not covered by the segment guard**; its five elements go through the escape
helper, which type-checks first and refuses with `AckBuildError` / `X12_ACK_INVALID_SPEC`.

The monetary and quantity slots have their own guard on top of it: a slot typed `X12Decimal`
refuses anything that is not one, rather than rendering `number.toString()` into the document,
where `0.1 + 0.2` would emit `0.30000000000000004` and `1e21` would emit `1e+21`, which this library
cannot parse back.

**The fixed-width ISA slots** (`senderId`, `receiverId`, `interchangeControlNumber`, …) go through
padding rather than escaping, and do not pass through the segment join either. They have a guard of
their own: a value that is not a string, or is longer than its slot, draws the builder's typed
refusal naming the field, rather than being cut to the slot's width. A short value pads with
spaces. `usageIndicator` (ISA-15) goes through the same guard, and an empty one refuses rather than
padding to a space. What the guard does not check is content: a value carrying the element separator
reaches the wire as that byte (see the ISA entry above), and `usageIndicator` is not checked against
`P` and `T`.

**What is worth validating at your own boundary,** because each is outside a structural check:

1. **A `string` carrying an active delimiter.** The segment guard passes it, because it is a string.
   Slots that route through the escape helper release it correctly (`"1*BOGUS"` emits as
   `1?*BOGUS`); the fixed-width ISA slots do not go through it at all.
2. **Whether an `X12Decimal` carries the scale you meant.** `fromString("0.3")` and
   `fromString("0.30")` are both accepted and both emit verbatim. That choice is yours.
3. **The delimiter set `buildTA1` releases against.** It defaults to the Cosyte archetype and the
   function cannot verify it; state the separators on `BuildTA1Options` if you embed a TA1 in an
   envelope that declares different ones.
4. **`build835`'s balance-equation amounts, which refuse untyped.** `build835` runs its balance
   guard before it builds the escape helper, and that guard calls `X12Decimal` methods on your
   value. So a raw `number` there throws a plain `TypeError` with **no `code`**, some saying the value
   "has no internal state - was it tampered with?", which is a misleading thing to be told when you
   passed a number. **The rule, not a list:** a slot refuses untyped exactly when the balance guard
   reads it as a term of one of the three 835 balance equations (the claim, service-line and
   remit-total equations). By spec field, the untyped set is `payment.totalActualPayment`,
   `claim.totalChargeAmount`, `claim.totalPaymentAmount`, every `adjustments[].amount` at claim and
   line level, `serviceLine.chargeAmount`, `serviceLine.paymentAmount` and
   `providerAdjustments[].amount`. Every other `X12Decimal` field refuses typed, including
   `claim.patientResponsibilityAmount`, `serviceLine.paidUnitsOfService`, every `amounts[].amount`
   and every `adjustments[].quantity`. `err.code` is the thing to branch on, and the balance terms
   are the case where there is not one.

**The exported `escapeRelease(value, delimiters)` throws `TypeError` on a non-string.** If you call
it directly, it is a `TypeError` and not a code-tagged library error, because it is a pure text
utility with no spec context to name. Nothing inside the library can reach it: the builders refuse
first.

### A builder refuses a forged non-array, and a hole or `null` inside a list

**The types say `readonly T[]`, but a JavaScript or JSON caller can hand a builder something
else.** Every indexed loop in every builder takes its bound from a checked array, so an object like
`{ length: "9".repeat(120000) }` draws that builder's own typed refusal rather than coercing its
length to `Infinity` and looping forever. The places a builder reads a caller array with `for…of`
(`buildInterchange`'s `spec.groups`, `build999`'s `functionalGroup.transactionResponses`, and the
optional leaf arrays such as `claim.dates` or `member.references`) go through the same checked-array
chokepoint and refuse with the builder's typed `INVALID_SPEC` code. No loop or probe count is quoted
here: both move with every builder added, and `test/builder-array-bounds.test.ts` re-derives them
from the source on every run.

**`null` is treated as absent, not forged**, so an optional list you send as `null` builds. On a
required list `null` draws that builder's own "at least one X is required" refusal for five of the
six: `build834`, `build820`, `build837`, `build271` and `build277`. The sixth, `build835`'s `claims`,
may be empty, so it has no "at least one" refusal: a `null` or absent `claims` is refused on its own
with `X12_835_BUILD_INVALID_SPEC`.

**A hole or a `null` inside a list refuses too, in every builder.** A real array with `undefined` or
`null` in a slot is a list and clears the chokepoint: that is the shape a JSON payload with a
dropped record carries. Each slot is checked, and a hole refuses with the builder's `INVALID_SPEC`
code rather than reaching an emitter as an untyped `TypeError`, being skipped (a hole in `build271`'s
`serviceTypeCodes`, `build837`'s adjudication `adjustments` or `build275`'s status `codes`), or going
out as an empty component (a hole in `build837`'s `diagnosisPointers`, `oralCavityArea` or tooth
`surfaces`). In a list of objects the refusal names the slot with a structural locator such as
`subscriber.benefits[0]`; in a list of strings it is the element type refusal. `build270` and
`build276` keep their own `INVALID_HIERARCHY` code for a hole in their spine. A list sent as `null`
is absent.

**`build270` is deliberately stricter than its siblings.** Every list slot on `Build270Spec`, the
spine (`informationSources`, `receivers`, `subscribers`, `dependents`, `inquiries`,
`serviceTypeCodes`) and the leaves (`traces`, `references`, `dates`, `address.lines`,
`diagnosisCodePointers`, `procedure.modifiers`) alike, is read through the same checked-array
chokepoint and checked for holes at the same point, so a forged array-like or a hole anywhere in a
270 spec draws a typed, code-tagged `Eligibility270BuildError`, naming the slot and nothing out of
the inquiry. A name loop sent as `null` is refused the same way, at every level.

**On the acknowledgment path the value is not always strictly your own.** TR3 005010X231A1 requires
AK2-02 to be a verbatim copy of the acknowledged transaction set's ST-02, and `buildTA1` exists to
echo an inbound ISA-13, so a _document's_ control numbers reach those refusals by the standard's own
design. They are envelope control numbers rather than clinical content, and they are bounded like
everything else, but "the value is always the caller's own" would be false and this library does
not claim it.

Logging `err.code` rather than `err.message` remains the safest habit, and the parse side is
stronger still, where no factory takes a value parameter at all.

### `X12ParseError.snippet` on a fatal can carry PHI

**`X12ParseError.snippet` on a Tier-3 fatal can carry PHI, by design, and the library does not
redact it.** Warning messages come from a frozen registry and no factory takes a value parameter, so
they cannot echo an element; the four structural fatals are different, because they are raised
before the envelope is readable and each carries a bounded (≤ 64 character) copy of the start of
the input so the error is actionable. On real traffic those bytes can be patient data. Redact at
your call site, or log `err.code` and `err.position` and drop `err.snippet`. A **strict-mode
escalation carries no snippet**: the error it raises wraps a registry-built warning, so `err.snippet`
is `""`.

### Two classes of locator-like model field are unbounded on purpose

**Two classes of locator-flavoured model field are left unbounded on purpose, and a downstream
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

### `X12Ack999Ik4.copyOfBadDataElement` can carry PHI

**`X12Ack999Ik4.copyOfBadDataElement` is a copy of the offending bytes and can carry PHI.** It is
whatever the sender put in IK4-04; the library never auto-populates it, and senders SHOULD omit it
when the bytes are PHI.

### The 997 follows the base standard alone, and its codes are carried, not checked

**The 997 is read and built to the ASC X12 base standard alone, and its codes are carried, not
checked.** No implementation guide names the 997, so `parse997` checks no declared guide and
`build997` writes GS-08 `005010` and an `ST` with no `ST-03`. The material used is the base
standard's segment layout (`AK1`, `AK2`, `AK3`, `AK4`, `AK5`, `AK9`, the same positions the 999
reader already reads) and the code values of lists 715 and 717 for the two dispositions; no guide
table and no code description is bundled. So:

- **`AK5-01` and `AK9-01` are typed; every other code is a string as sent.** `AK3-04`, `AK4-03` and
  the `AK5` and `AK9` syntax error codes are carried verbatim on read and written verbatim (escaped)
  on build. Nothing says whether a code is one the standard defines, and `build997` will write a
  code no receiver knows.
- **Nothing is filled in.** Unlike `parse999`, which reads a missing or unreadable disposition as a
  reject, `parse997` reads an absent `AK1`, `AK5` or `AK9` as `undefined`, and a disposition outside
  its list as an `undefined` `disposition` beside `dispositionRaw`, each with a warning. A caller
  that tests for a reject rather than for an accept reads those as accepted; test
  `disposition === "A"` (or `"E"`, `"P"`) instead.
- **A segment out of place is left unread, never repaired.** An `AK3` or `AK5` with no `AK2` open,
  an `AK4` with no `AK3` open, an `AK1` after an `AK2`, an `AK2` after the `AK9`, and a second
  `AK1` or `AK9` warn `X12_997_SEGMENT_OUT_OF_PLACE` and stay only on the transaction set; for a
  repeated `AK1` or `AK9` the first one stands. A segment the 997 does not define (a `CTX`, a
  999's `IK3`, `IK4` or `IK5`, anything else) warns `X12_997_SEGMENT_NOT_DEFINED` and is not read.
- **`build997` writes no `CTX`.** A 999 error list type-checks as a 997 one, `contexts` and all,
  so `build997` refuses any segment or element error that carries `contexts` rather than writing a
  segment the 997 does not have or dropping the caller's data.
- **`X12Ack997Ak4.copyOfBadDataElement` can carry PHI**, exactly as the 999's `IK4-04` can.

### A TA1 or 999 derived from a parse reports only what the parse checks

**A TA1 or 999 derived from a parse reports only what the parse checks.** `deriveTA1Spec` and
`derive999Spec` read `parseX12`'s warnings through `ACK_WARNING_MAPPINGS`, so they report the
envelope and the base-standard syntax we check, never implementation guide usage. So:

- **A derived accept says only that the envelope and the base syntax read clean.** It does not
  mean the file meets the implementation guide or any payer's companion guide: a transaction set
  that breaks either is accepted unless a warning we raise sits on it. Add your own guide findings
  to the spec before `build999`.
- **SE-01 is not checked against the segment count.** `parseX12` raises no warning for it
  (`serializeX12` does), so a derived 999 never writes IK5-02 `4`.
- **A TA1 carries one note**: the first interchange finding in parse order. The others are returned
  as `unreported`.
- **Every mapped finding rejects** (TA1 `R`, IK5 `R`, AK9 `R`); nothing derives `E`. An `E` tells
  the sender the data was taken and not to resend it, which is unsafe when a finding may mean data
  was lost or misread. Set it on the spec yourself if you know nothing was lost.
- **IK3-03 (the loop) is never written**, no CTX is written, and no value is copied into IK4-04.
- **A segment finding is located through the position `parseX12` recorded for its transaction set.**
  A transaction set built by hand or copied out of the parse has none: it is still rejected with
  IK5-02 `5`, but without an IK3, and the warning is returned as `unreported`.

### Balance and integrity checks warn, and never rebalance or renumber

**Balance and integrity checks warn; they never rebalance or renumber.** The 835 balance
invariants, 837 HL parent-pointer integrity, and envelope-count reconciliation surface a warning on
mismatch and preserve the inbound values verbatim. The library will not "fix" a payer artifact for
you. Gate your own posting/adjudication on the warning.

## Trading-partner profiles: what a conformance classification is, and is not

### A profile never changes what this library emits

**A profile never changes what this library emits.** A profile describes what a trading partner
SENDS. It attaches attribution to a parse and partitions that parse's warnings into expected and
unexpected, and that is the whole of its behaviour. It cannot loosen, tighten or otherwise touch
the emit side: `serializeX12`, `buildInterchange` and every `build*` domain builder produce
byte-identical output with any profile active and with none, and refuse the same specs with the
same error type, code and message. There is no opt-in flag that would change this, and
`test/profiles-emit-independence.test.ts` fails the build if the property is ever broken. The
reason it is a locked invariant rather than a convention: a profile that widened the emit would
put a non-conformant document on the wire, and 45 CFR 162.915 forbids the trading partner from
having asked for that in the first place.

### A quirk's conformance classification is a recorded human judgement

**Each quirk's conformance classification is a RECORDED HUMAN JUDGEMENT, not a check this
library performed.** `describe()` states, per quirk, whether the deviation is one a trading partner
may lawfully require. Read that as documentation someone wrote down, and confirm it against your
own copy of the relevant implementation guide before you rely on it. In particular, **a
classification that turns on an element being marked "not used" in an adopted TR3 rests on someone
having read that TR3.** This package bundles none: 45 CFR 162.920(a) states a fee is charged for
the implementation specifications, so "is this element marked not used?" is not a question the
library can answer at run time, and it does not pretend to. Nothing in the classification is
derived from your document, from the quirk's `effect`, or from any code list shipped here.

### The conformance axis is 45 CFR 162.915, and it has three states

**The axis is 45 CFR 162.915, and it has three states, not two.** `permitted` and `not-permitted`
are measured against that rule, which forbids a covered entity from entering a trading partner
agreement that would change the definition, data condition or use of a data element or segment in
a standard, add data elements or segments to the maximum defined data set, use any code or data
element marked "not used" in (or absent from) the standard's implementation specification, or
change the meaning or intent of that implementation specification. The third state,
`undetermined`, means **no judgement was recorded**, and it is the fail-safe default: a quirk that
says nothing about conformance renders as `undetermined`, never as `permitted`. Read
`undetermined` as "this package makes no claim", which is not the same as "harmless". Two of the
three quirks shipped by the built-in profiles are `undetermined` today for exactly the fee reason
above.

### A `requires` quirk records a mandate, not that the standard allows it

**A `requires` quirk is a record of what a partner MANDATES, never a claim that the standard
supports the mandate.** Those are two different statements and the buckets do not conflate them:
membership of `requires` confers nothing on the conformance axis, and a partner mandating an
element the adopted guide marks "not used" classifies as a deviation from the standard. If you
need to know whether your partner may lawfully require something, read `conformance`, not the
effect bucket.

## What the differential corpus proves, and what it does not

### Each synthetic document is compared with an independent reader where one maps it

**Every synthetic document this repository ships is read by this library and, where an independent
reader maps its transaction, by that reader too, and the two readings are compared element
position by element position.** Two independent, open-source X12 readers serve as oracles, each
pinned to one exact version and used only as a development tool: neither is ever a dependency of
this package, whose published runtime dependency set is empty. The first is pyx12, a BSD-licensed
HIPAA X12 parser and validator. The second is LinuxForHealth x12, an Apache-2.0-licensed X12
reader with a transaction model per implementation guide, pinned together with every package it
runs on and the Python version it runs under, because its own metadata leaves the Pydantic release
it needs free. A transaction is compared against the first oracle that maps it and against no
other. `pnpm run differential` runs the comparison and writes `test/differential/report.json`,
which carries each oracle's name, version and licence as the installed reader declares them (for
the second, also the Python version and every companion package version it ran with), the commit
this library was read from, which oracle each transaction was compared against with the
implementation guide and the map or model that oracle bound it to, the documents that went through
both readers, the number of element positions compared, every document the run looked at and did
not compare with the reason, and every disagreement found, with both readings left exactly as each
reader returned them. `pnpm run differential:check` runs the same comparison and succeeds only when
it reproduces the committed report. Which comparison a document belongs to is decided by the
document's own GS-08 and ST-01, never by where it is filed, so the awkward documents are in the
corpus rather than beside it.

### Each transaction is compared against one named reader

**Which reader compares what.** pyx12 compares the 277 claim acknowledgment (005010X214), the 820,
the 834, the 835, the professional claim, the institutional claim and the 999. LinuxForHealth x12
compares the 270, the 271, the 276 and the 277 claim status response (005010X212), for which pyx12
publishes no 005010 implementation guide map. LinuxForHealth x12 also models the 834, the 835 and
both claims, and those are still compared against pyx12 alone: no transaction here is read by both
oracles, so no row carries two readers' agreement.

### The second reader refuses much of the corpus, so its comparisons are narrower

**The second oracle reads a document only through its transaction model for the guide the
document declares, and that model refuses much of this corpus, so its comparisons are narrower than
the documents filed under them.** A document the model refuses is recorded in the report as
unevaluated, with the oracle and the kind of refusal, and never counted as agreement. Among the
documents here that it refuses are the ones that deliberately break the hierarchy or a row, 271
documents whose AAA rejection reasons fall outside the codes it enumerates for that loop, the 270
and 271 documents carrying a dependent level, and the 276 documents whose subscriber carries a
dependent level beside a claim of its own, as the canonical 276 fixture does. A model can also
accept a document and set one of its segments aside without raising, so a document is compared only
when the model kept every segment of every transaction set, ST through SE, that the oracle framed
for it; one whose model kept fewer is recorded as unevaluated with its own refusal kind, and none of
its positions is counted as agreement. The two readers place the 276 subscriber's demographics
segment (DMG) differently: that model reads it ahead of the subscriber's name and this library
after it. A document carrying one where this library puts it loses it to that model, which then
refuses the document; and this library's 276 reader keeps a DMG only after the name already read at
its level, so one sent ahead of the name is not on the decoded inquiry and no warning says so. Which
position the implementation guide specifies is not settled here, and nothing about either reader
moved to produce this. So the one 276 compared against it carries no subscriber DMG. Agreement on the
270, the 271, the 276 and the 277 claim status response is agreement over the documents that model
accepted whole, which the report lists by name, and nothing wider: in particular no document
compared against it carries a dependent level, and no 276 compared against it carries a DMG, so that
comparison says nothing about either.

### This library and pyx12 disagree about the release character

**This library and pyx12 disagree about the release character, and the report records the
disagreement rather than settling it.** One synthetic document escapes the element separator with
`?` inside a transaction set body. This library reads `?` as a release character there, so `REF*EA*ID?*WITH?*STAR` is two elements whose second value is
`ID*WITH*STAR`; pyx12 reads no release character, so the same segment is four elements whose second
value is `ID?`. 005010 transmits no release character at all and nothing in it picks between the
two readings, which is the same ambiguity the envelope-splitter entry above is about, and it is the
one input class in this corpus on which two conforming readers can genuinely differ. **The
disagreement is published, not resolved:** the report holds both readings verbatim for that
position, nothing about how this library reads the release character moved to produce it, and
`pnpm run differential` exits non-zero for as long as it stands. If you exchange documents that
escape a delimiter in a body element, do not assume your counterparty's parser frames that segment
the way this one does.

### Transactions neither reader maps are compared against nothing

**The rows of this library's read scope that neither oracle maps are compared against nothing, and
the report names every one with the reason.** Neither reader publishes a 005010 implementation
guide map or model for the 278 in either direction or for the dental claim, neither has one for the
275 (006020X314) or the 277 request for additional information (006020X313), and neither can bind
the TA1 interchange acknowledgment, which sits in the envelope rather than in a functional group
and carries no implementation guide identifier. Read that as a statement about the maps and models
those readers publish and not about what they can frame: what is missing is the implementation
guide, not the ability to read bytes. Either way this library's reading of those transactions is
compared against nothing here, and silence about them is silence, never agreement.

### Two compared claims are mapped to different errata on each side

**For two of the compared transactions the two implementations target different published errata of
the same implementation guide, and the report records both identifiers rather than implying one.**
pyx12 maps an earlier errata of the professional claim and of the institutional claim than this
library implements, so agreement there is agreement between two revisions of one guide.

### Agreement with either reader is not conformance

**Agreement with either reader is not conformance to a Technical Report Type 3, and it is not a
compliance statement.** Two parsers can agree and both be wrong about the same clause; neither
reader is the standard, and each transaction here is compared against one of them, never both. No
report produced here says anything about HIPAA compliance, which is a property of a deployment and
never of a library. Conformance still rests on the three-tier synthetic corpus (spec-clean,
vendor-quirk, round-trip goldens), property and round-trip tests, and a nightly amplified byte-flip
fuzz job. Do not assume byte-for-byte agreement with any specific vendor parser.

### The corpus is our own synthetic fixtures and nothing else

**The corpus is this repository's own synthetic fixtures and nothing else.** No CMS Medicare 835
public sample material is in it: the redistribution-terms review of that material is not cleared,
and it is not used here until it is. What that bounds is the evidence, not the claim: two readers
agreeing over synthetic documents have agreed over synthetic documents.

## Scope (non-goals for v1)

### We do not validate against implementation guides

**We do not validate against implementation guides.** The package checks the ASC X12 base standard
(the envelope, the delimiters, the control numbers and segment counts, the HL pointers), a few guide
facts each typed reader needs to build its model (the guide a transaction set declares, the loops it
requires, the 835 balancing equations), and one CAQH CORE rule, the CORE 360 Code Combinations, when
you call `checkCoreCodeCombination` with a table you supply. It also checks codes against the lists
it bundles: a reader keeps a code outside them verbatim and warns with `X12_UNKNOWN_CARC` (835 and
837 adjustments), `X12_UNKNOWN_RARC` (835 remarks), `X12_UNKNOWN_CLAIM_STATUS` and
`X12_UNKNOWN_CLAIM_STATUS_CATEGORY` (277 statuses), `X12_271_AAA_UNKNOWN_CODE` (271 AAA codes),
`X12_UNKNOWN_HI_QUALIFIER` (837 and 278 HI qualifiers) or `X12_834_UNKNOWN_MAINTENANCE_TYPE` (834
INS-03 and HD-01), and `build834` refuses a maintenance type outside its list with
`X12_834_BUILD_UNKNOWN_MAINTENANCE_TYPE`. Three bundled lists are code subsets of lists a TR3
prints, which we did not read: `MAINTENANCE_TYPE_CODES` (INS-03), `CLP_STATUS` (CLP-02, which the
835 reader carries but does not warn on) and `HI_QUALIFIERS`. We ship no TR3 usage tables, and the package does not check TR3 usage:
whether a segment or element is required, situational or not used where it sits, a guide's
situational rules, repeat counts, or which code values a guide allows at an element beyond those
bundled lists. Every TR3 is sold by X12, so a document that breaks its guide can parse with no
warning. What you can check with the typed readers: a reader returns no reading for a
transaction set that declares a guide it does not implement, and on the ones it reads
`implementationConventionReference` and the `X12_GUIDE_NOT_DECLARED` warning say what was declared; a
field the sender left out reads `undefined` and is never defaulted, so you can refuse a document that
lacks a field your guide or partner requires; qualifiers and codes are carried verbatim for you to
compare with your copy of the guide where no bundled list covers them, and `checkCarcValidity` and
`checkRarcValidity` date-check adjustment and remark codes; anything untyped stays verbatim on
`tx.segments`.

### No 4010 variants and no 277U

**No 4010 variants and no 277U.** We do not build readers or builders for the 004010 versions of
the 835, the 837, the 270/271, the 276/277, the 278, the 834 or the 820, or for the 4010 277U
unsolicited claim status. This is a decision, not a gap we plan to close. Their 005010
replacements are what we read and build: the 277 claim status response (`005010X212`) answers a
276, and the 277CA claim acknowledgment (`005010X214`) does the acknowledgment work the 277U was
used for. A 4010 interchange still parses, with `X12_PRE_005010`, and its segments stay verbatim
on the model. A typed reader returns no reading for a transaction set that declares a 4010 guide
(`004010X091A1`, `004010X098A1`, `004010X070` and the rest): `get277Status` and
`get277CADisposition` both answer `undefined` for a 277U. One that declares no guide at all is
read against the 005010 positions with `X12_GUIDE_NOT_DECLARED`, as described above. If you
still receive 4010 traffic, translate it to 005010 before it reaches this package, or use a
parser that reads 4010.

### No 278 notification (`005010X216`)

**No 278 notification (`005010X216`).** We read and build one 278 guide, `005010X217`, the Health
Care Services Review request and response. We do not read or build `005010X216`, the 278 notification
guide, and we do not plan to unless it is asked for. A 278 that declares it (in ST-03, or in GS-08
where ST-03 is empty) gets no reading: `get278Request` and `get278Response` both answer
`undefined`, the same as for the 4010 `004010X094A1`. Because no reading is returned, there is no
reading to carry a warning, so the `undefined` is the only signal. Route on the declared guide
yourself (`tx.st.elements[3]`) if you need to tell a notification from another refused guide. Its
segments stay verbatim on `tx.segments`. We have no figure for how much `005010X216` traffic there
is. If you need it read, tell us at [github.com/cosyte/x12/issues](https://github.com/cosyte/x12/issues).

### Healthcare 005010, and the 006020 claims attachments pair

**Healthcare HIPAA 005010, and two 006020 guides: the claims attachments pair.** Beside the
005010 transaction sets, the package reads and builds the 277 Health Care Claim Request for
Additional Information (`006020X313`) and the 275 Additional Information to Support a Health Care
Claim or Encounter (`006020X314`), which 45 CFR 162.920(a)(20) and (a)(19) name and 45 CFR
162.2002 adopts for the period on and after May 26, 2028. No other 006020 guide is read or built:
the services review pair the same rule proposed and did not adopt, the 278 `006020X315` and the
275 Additional Information to Support a Health Care Services Review `006020X316`, is out of
scope, and a 275 declaring `006020X316` is read as a guide the 275 reader does not implement.
Non-healthcare transaction sets
(850/856/810/204, etc.), the EDIFACT syntax family, and pre-005010 versions are out of v1 scope.
Pre-005010 input is tolerated and flagged (`X12_PRE_005010`), not decoded to those older field
maps. What the attachments pair leaves open, stated here beside it:

- **The base X12 006020 transaction sets are typed; no implementation-guide usage is asserted.**
  Both guides are sold and no source this package carries states which segments, qualifiers or
  codes they make required, situational or repeatable. So the readers carry every code and
  qualifier verbatim and decide nothing about whether it is valid for the guide, and the builders
  write every BHT code, HL level and child code, entity, reference and date qualifier exactly as
  given and supply none. `build277RequestForAdditionalInformation` refuses only the absences the
  base 006020 277 makes mandatory (no level, no claim-level request, a request with no TRN, an
  empty C043-01 or C043-02, a service line with no SVC); `build275` refuses only what would make a
  BDS-02 untrue or a BDS empty (no attachment, empty data, a filter code that is not three
  characters, a character above U+00FF). A document conformant to either guide can carry a segment
  or qualifier these models leave untyped: the 277's SBR, PAT, DMG, heading name loop, PWK loops
  and TOO, the 275's DTM, IN1, DMG, PRV, PER, NX1 and each line's NM1, HI, SVC, DTP, CAT, PID and
  OOI. They stay verbatim on the transaction set, and neither builder writes them: `build275`
  writes each BDS directly after its line's LX, TRN, STC and REF, with no DTP, CAT or OOI before
  it, so a trading partner whose guide places the BDS inside those loops needs them added by hand
  through `buildInterchange`.
- **The 277 request reader validates no hierarchy.** Each HL is carried with HL-01, HL-02, HL-03
  and HL-04 as sent; no parent pointer is checked and no level code is expected, because no
  carried source states the guide's hierarchy. A claim-level segment sent before the first HL
  reaches no level and stays on the transaction set.
- **ISA-12 is not decided here.** Which ISA-12 a 006020 interchange carries is an open question no
  carried source answers. Both builders write this package's default, `00501`, unless the caller
  supplies `interchangeControlVersion`, and both readers key on ST-03 and GS-08 and never on
  ISA-12.
- **`06020X314` is not an adopted identifier.** 45 CFR 162.2002(c) prints the 275's guide one digit
  short, as `06020X314`, where 162.920(a)(19) prints `006020X314`. The conformance row adopts the
  162.920 spelling and records the other on its note as a typographical variant, so a 275 declaring
  `06020X314` is warned `X12_GUIDE_NOT_IMPLEMENTED`. We re-read the current text of 45 CFR 162.2002(c) on eCFR on 2026-11-12 (title 45
  as issued 2026-11-09), and it still prints `06020X314`, so the typo stands as stated.
- **Only the attachment data refuses to print.** A 275 attachment's BDS-03 is held in
  `X12AttachmentData`, whose string, JSON and `util.inspect` forms carry its octet count and no
  octet. Every other field of both readings, the names, member and claim identifiers and trace
  numbers included, is a plain string, as on every other reading in this package.
- **An attachment is octets, and a string is not.** Pass an interchange carrying attachments to
  `parseX12` as a `Buffer`, which is read one character per octet. `serializeX12` of a built 275
  is a string of one character per octet: write it as latin1 (`Buffer.from(text, "latin1")`),
  because encoding a character above U+007F as UTF-8 makes two octets of one and BDS-02 stops being
  true of what was sent. Nothing inside an attachment is decoded; BDS-01 names a filter the sender
  applied and this package applies none.

### No transport

**No transport.** AS2, SFTP, and MLLP-style delivery are out of scope. This is a parser/serializer,
not a communications stack.

### Below 1.0

**Below 1.0.** The package is published on npm as `@cosyte/x12` from a public repo, at `0.1`. Its
exported readers, builders, types and warning codes are the surface we keep stable, and below 1.0
a breaking change bumps the minor version and is called out in the changelog with its migration.
`npm view @cosyte/x12 version` is the only source of truth for the current version.

### A 276 level whose declared parent does not resolve is left off the tree

**A 276 hierarchical level whose declared parent does not resolve is left off the returned tree.**
The 276 reader attaches a level by its own HL-02 and by nothing else, so a pointer naming a level
that is not present, a pointer naming a level of the wrong kind, and a parent chain that returns
to itself each leave that level, and everything transmitted beneath it, absent from the model. The
loss is reported (`X12_276_LEVEL_DETACHED`, beside the code for the pointer defect itself), the
declared pointer stays verbatim on `hierarchies`, and the segments stay verbatim on the
transaction set. Nothing is re-parented onto whichever level happened to be open, because that
would be this library inventing the one structure a 276 exists to state: which provider is asking
about which patient's claim.

### A 276 REF, DTP or AMT short of its row loses the whole row, and says so

**A 276 REF, DTP or AMT short of what its row is built from loses the whole row, and says so.**
Each is a record and not a slot. Without both REF-01 and REF-02 there is no reference row; without
both DTP-01 and DTP-03 there is no date row, and the format qualifier that says single date or
range goes with it; without a decodable AMT-02 there is no amount row. The reader builds none,
fabricates nothing to stand in, and reports the loss (`X12_276_REFERENCE_ROW_DROPPED`,
`X12_276_DATE_ROW_DROPPED`, `X12_AMOUNT_ROW_DROPPED`) at that segment. **The report is bounded to
the row the reader tried to build.** A segment that decoded and then found no claim or service
line open to sit on is a different loss, it stays silent, and it is not on any of those channels.

### The 276 reader surfaces four SVC elements and no postal address

**The 276 reader surfaces four of the SVC elements and no postal address.** SVC-01, SVC-02, SVC-04
and SVC-07 reach the typed service line; SVC-03, SVC-05 and SVC-06 are left unread, because this
is the request direction and a submitter states what it billed rather than what was paid. An N3 or
N4 a sender transmits under a 276 name loop reaches no typed field either, as it reaches none on
the 277 beside it. All of them stay verbatim on `tx.segments`; read them there.

### A 270 level whose declared parent does not resolve is left off the tree

**A 270 hierarchical level whose declared parent does not resolve is left off the returned tree.**
The 270 reader attaches a level by its own HL-02 and by nothing else, so a pointer naming a level
that is not present, a pointer naming a level of the wrong kind, and a parent chain that returns to
itself each leave that level, and everything transmitted beneath it, absent from the model. The
loss is reported (`X12_270_LEVEL_DETACHED`, beside the code for the pointer defect itself), the
declared pointer stays verbatim on `hierarchies`, and the segments stay verbatim on the transaction
set. Nothing is re-parented onto whichever level happened to be open, because that would be this
library inventing the one structure a 270 exists to state.

### A 270 DTP short of its row loses the whole row, and says so

**A 270 DTP short of what a date row is built from loses the whole row, and says so.** A DTP is a
record and not a slot: without both the qualifier that says what the date is for (DTP-01) and the
value itself (DTP-03) there is no row to build, and the format qualifier that says single date or
range goes with it. The reader builds none, fabricates nothing to stand in, and reports the loss
(`X12_270_DATE_ROW_DROPPED`) at that segment, so an empty `dates` list can be told apart from a
date the sender stated and this reader could build no row from. **The report is bounded to the row
the reader tried to build.** A segment that would have attached to a level or an inquiry but
arrives before the first HL opens one reaches no part of the model and stays SILENT, the date row
included, so an empty list is evidence about a level this reader did return and about nothing else.
The segments stay verbatim on the transaction set either way.

### A 270's tolerated deviations are reported once per transaction set

**A 270's tolerated deviations are reported once per transaction set, not once per occurrence.**
A declared non-conventional delimiter raises `X12_270_NON_CONVENTIONAL_DELIMITER` once however many
of the four roles deviate, and a line break between segments raises
`X12_270_INTER_SEGMENT_LINE_BREAK` once however many runs the document carries. Both anchor at the
ISA. The framing run is also consumed by the shared parse and recorded nowhere on the model, so
only `parse270Inquiries`, which receives the bytes, can report it: `get270Inquiry` is handed the
model and reports the delimiter half alone.

### A space or a tab between segments costs the whole interchange

**Between segments, only CR and LF are absorbed. A space or a tab there costs you the whole
interchange, on every transaction set.** The shared parse consumes a run of CR / LF before the next
segment opens; any other whitespace becomes the head of the next segment's identifier, so `GS` is
read as a non-spec segment id, no functional group frames, every segment after the ISA lands on
`ix.orphanSegments` with an `X12_UNEXPECTED_SEGMENT` warning, and the interchange also reports
`X12_MISSING_IEA`. Nothing is silent at the interchange level, but the typed readers see no
transaction set at all: `parse270Inquiries` answers the EMPTY list, which is the same value it uses
for an interchange that genuinely carries no 270, so **do not read an empty result as evidence the
sender sent no inquiry without checking `ix.warnings` first.** The 270 reader deliberately does
not widen this shared-parse behaviour: framing tolerance is shared by every
transaction set, and moving it is a change to all of them rather than to one reader.

### Binary data is framed by its declared octet count, and a bad count is reported

**A BDS or BIN segment's binary data is framed by the octet count its length element declares,
never by delimiters, and where that count cannot be honoured it is reported, never corrected.**
BDS-03 and BIN-02 are read as exactly the number of octets BDS-02 or BIN-01 declares, anywhere after
the ISA, so an element, repetition or component separator, a segment terminator, a `?`, a CR or an
LF inside the data is data: the segment is one segment, the data is one element, and the segments
after it frame as sent. **`?` has no effect inside the declared span**, not even immediately before
the terminator that follows it. `getSegmentValue`, `getAllSegmentValues` and `elementValue` return
the data element verbatim, with no release unescape and no split on the repetition or component
separator. **Nothing inside it is decoded**: BDS-01's filter (`B64`, for example) is not applied,
and no typed reader decodes an attachment. **The count is in octets.** A `Buffer` is read one character
per octet, so its count is exact; a string is counted one UTF-16 code unit per octet, which is exact
at or below U+00FF, and a span holding anything above that raises `X12_BINARY_LENGTH_UNVERIFIABLE`
and is still carried verbatim, so pass an interchange that carries attachments as a `Buffer`. The
three ways the count can fail, each warned at the segment:

- `X12_BINARY_LENGTH_INVALID`: the length element is absent, empty, or not 1 to 15 ASCII digits (a
  sign, a decimal point or whitespace is malformed; leading zeros are not). **No length is inferred,
  so this is the one case the count does not protect**: the segment is framed by its delimiters
  exactly as a segment of any other id is, and a delimiter inside its data splits it and can
  mis-frame every segment after it.
- `X12_BINARY_DATA_TRUNCATED`: the input ends inside the declared span. The data element holds
  only the octets present and nothing past the end is read, and because the span runs to the end
  of the input, the transaction, group and interchange trailers are reported missing.
- `X12_BINARY_LENGTH_MISMATCH`: the byte after the declared span is not the segment terminator (a
  length shorter or longer than the data), or the segment ends before a data element begins
  although a non-zero length was declared. The data element is exactly the declared span; the
  bytes from its end to the next terminator stay on the segment's `raw`, so a length longer than
  the data carries the start of the next segment into this one, and the default `serializeX12` emit
  still reproduces the input byte for byte.

**The length element is never rewritten on emit**, in either `serializeX12` mode, including where
it disagrees with the data: that would be a silent correction. A span that ends exactly at the end
of the input is complete and raises no binary warning; its missing terminator is supplied on emit,
as for any unterminated final segment, so where a truncated span fell exactly one octet short, a
re-parse of that emit reads the supplied terminator as the last octet of the data. Where `?` is the
declared element separator or segment terminator, the elements before the data element are split
literally, as that role's splitter already does.

## Code-list validity dates

### A published Stop date is read as the first day a code is no longer valid

**A published Stop date is read as the FIRST day the code is no longer valid, and the
maintainer does not say whether that is right.** `x12.org` renders a code's dates as
`Start: 01/01/1995 | Last Modified: 11/01/2017 | Stop: 05/01/2018` and states nowhere whether the
Stop date is the LAST day the code was valid or the FIRST day it was not. The two readings differ
by exactly one day, on exactly the boundary a document produced that day sits on.

This package reads it as the first day the code is NOT valid, so the valid interval is half-open:
a document date on or after the Stop date reports `not-valid`, and the day before it reports
`valid`. The ground is the shape of the source and not a statement by the maintainer: the
published dates are first-of-month publication-cycle dates, so the Stop date reads as the
publication on which the code left the list rather than the last day it was on it. **That is a
judgement, not a fact, and a consumer whose contract turns on the boundary day itself should
confirm it with the maintainer rather than with this package.** `CARC.dates` and `RARC.dates`
carry the published values unchanged, so a consumer who reads the boundary the other way has
everything needed to compute it.

Two further bounds on the same data, neither of them a defect:

- **A code with no published start date is `indeterminate`, never `valid` and never `not-valid`.**
  Validity is an interval and there is no interval without a start. No bundled code is in this
  state at the capture the dates were transcribed from; the answer exists because the fail-safe
  has to hold if one ever is.
- **The dates describe the bundled subset and nothing wider.** A code outside it answers
  `indeterminate` with the inbound value echoed verbatim, which is a statement about what this
  package bundles rather than about what the maintainer publishes.

## Code-list descriptions

### Only a list recorded as permitted ships description text

**Only a list whose own redistribution record says `permitted` ships description text.** Today that
is the Remittance Advice Remark Codes alone. The other six bundled lists (CARC, the two claim-status
lists, the service type codes, the CLP-02 dispositions and the INS-03 maintenance types) keep their
codes, their metadata and, for CARC, the published per-code dates, and map every code to `undefined`.
Their records, in the table below, say `licence-required` or `not-established`, and the package
treats both as not redistributable.

### A bundled code still resolves without its description

**Membership is unchanged.** A bundled code still resolves through its lookup, so every
unknown-code warning and the `build834` refusal fire exactly where they did. The entry comes back
as `{ code, description: undefined }`, plus `dates` on CARC.

### The derived description fields read `undefined` for those lists

**The derived description fields on the read models are `undefined`** for these lists:
`reasonDescription` on 835 and 837 adjustments, `claimStatusDescription` on an 835 claim,
`categoryDescription` and `statusDescription` on 277 and 277 RFAI status codes, `description` on
270 and 271 service types, and `maintenanceTypeDescription` on an 834 member or coverage. The
verbatim codes beside them are unchanged.

### You can bring your own descriptions

**Bring your own descriptions.** Every lookup takes `{ descriptions }`, a table of your own text
keyed by code, and answers from it: a bundled code gets your text, a code outside the bundled
subset that your table describes gets `{ code, description }`, and a code your table does not
describe gets the bundled answer. Only an own property holding a string counts.
[`examples/describe-codes-with-your-own-table.ts`](https://github.com/cosyte/x12/blob/main/examples/describe-codes-with-your-own-table.ts)
runs it end to end with made-up text.

### A description cannot creep back in

**A description cannot creep back in.** `pnpm refresh:code-lists` fails a list that is not
recorded as permitted and carries a description, and `test/code-lists-descriptions.test.ts` fails
on the same condition.

## Code-list `--fetch` regeneration

### Full-list regeneration is a manual release step, answered per list

`pnpm refresh:code-lists` (default) validates the bundled snapshots and prints a freshness audit,
offline and CI-safe. The `--fetch` mode that would **regenerate** the full lists from their canonical
sources is deliberately **not** run in automation: regeneration needs outbound network and is a human
release step, and the tool fetches nothing and fabricates no description a maintainer has not
published.

**Whether a bundled list's descriptions may be redistributed is answered PER LIST, and the lists do
not agree.** Each bundled snapshot carries its own maintaining organisation and its own
redistribution record on `meta`, so a consumer deciding whether a description is theirs to display,
cache or re-publish reads that list's answer rather than a single sentence covering all seven:

| Bundled list                          | External code list | Maintained by | Redistribution        | Approach for permission |
| ------------------------------------- | ------------------ | ------------- | --------------------- | ----------------------- |
| CARC (Claim Adjustment Reason Codes)  | 139                | ASC X12       | licence required      | ASC X12 (see below)     |
| RARC (Remittance Advice Remark Codes) | 411                | CMS           | permitted, no licence | none needed             |
| CSCC (Claim Status Category Codes)    | 507                | ASC X12       | licence required      | ASC X12 (see below)     |
| CSC (Claim Status Codes)              | 508                | ASC X12       | licence required      | ASC X12 (see below)     |
| Service type (EB-03)                  | 958                | ASC X12       | licence required      | ASC X12 (see below)     |
| CLP-02 claim status                   | none               | ASC X12       | **not established**   | ASC X12 (see below)     |
| INS-03 maintenance type               | none               | ASC X12       | **not established**   | ASC X12 (see below)     |

The **External code list** column is the list's id on the X12 External Code Lists index. It is the
column that decides the one beside it: a list with a row there is answered from that row, and only a
list with no row can be one the carried sources never name. `none` means exactly that the index
publishes no row for the list, not that the list is unimportant.

**The approach, for every row that needs one:** ASC X12, which publishes that it is the only
organisation authorised to grant permission for the use of X12 products. Permission to reproduce X12
intellectual property is requested through the licensing programme X12 publishes at
<https://x12.org/products/licensing-program>, by email to the intellectual-property address given
there, naming the requester and their organisation and describing both the artifact and its intended
distribution. Subscriptions to X12-maintained code lists are bought through the Code List Update
Subscription page linked from <https://x12.org/codes>.

The evidence behind each row is quoted on the list itself, at `meta.redistribution.terms`. In short:
the X12 External Code Lists index records CARC as external code list 139, the two claim-status lists
as 507 and 508, and the service type codes as 958, all maintained by an X12 code maintenance
committee group, under the statement that all X12 work products are copyrighted and that
subscriptions to X12-maintained code lists are purchased. X12's own intellectual-property policy,
reproduced in HL7's CARIN Consumer Directed Payer Data Exchange code system stubs, adds that all X12
products are subject to it and that X12 is the only organisation authorised to grant permission for
their use. The same index records RARC as external code list 411 maintained by CMS, and HL7's CARIN
terminology licensure page puts CARC among the code systems that require a purchased licence and RARC
among those requiring none.

**Where a list is printed is not evidence of a missing publisher.** Three bundled lists are printed
in a purchased Technical Report Type 3: the service type codes, the CLP-02 dispositions and the
INS-03 maintenance types. We did not read those guides, and their `meta.source` says that no source
for the bundled code values is recorded. Only the CLP-02 dispositions and the INS-03 maintenance
types are absent from the External Code Lists index; the service type codes have a row there, so
they are answered from it. Where a bundled subset came from is a different question from what the
publisher publishes, and only the second decides the terms.

**"Not established" is a recorded answer here, not a gap waiting to be tidied.** The last two lists,
the CLP-02 dispositions and the INS-03 maintenance types, are printed inside a purchased ASC X12
Technical Report Type 3 and have no row on the External Code Lists index at all, and no source
obtained for this package names them or states whether their descriptions may be redistributed. They
are therefore treated as **not redistributable** wherever a permission decision is made, exactly as a
licence-restricted list is: an unsettled question is never read as a permission.

### A list whose descriptions may not be redistributed ships its codes and no description

**A list whose descriptions may not be redistributed ships its codes and no description.**
Nothing is enlarged, refetched or relicensed by recording the terms, and the record names the
licensor who could change that.

### `--fetch` answers each list on its own terms

**`--fetch` answers each list on its own terms.** It reports each bundled list's regeneration
permission independently, refuses only the lists whose own record forbids it, prints the licensor
to approach beside each refusal, and never refuses a list because a different list is restricted.
It exits `2` while any list is refused and `0` when none is.

### Snapshot validation refuses an unlabelled list

**Snapshot validation refuses an unlabelled list.** A bundled list carrying no maintaining
organisation, or no redistribution record, fails `pnpm refresh:code-lists` with a message naming
that list, so it cannot reach a release unlabelled.

### `codeListRedistributionIsPermitted(meta)` is the single decision point

**`codeListRedistributionIsPermitted(meta)` is the single decision point**, and it is exported.
Only a recorded permission answers `true`; a licence requirement, an unsettled status and a missing
record all answer `false`.

---

For the per-transaction read and emit surface, and the exact fields each helper decodes, see
[`README.md`](./README.md) and the Cookbook on the documentation site.

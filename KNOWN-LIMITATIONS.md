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

  **KEEP VALIDATING SPEC TYPES AT YOUR OWN BOUNDARY ANYWAY. The fix guards values routed through the
  escape helper, and not every element position goes through it.** This paragraph replaces the blanket
  "coerce your spec values to strings at your own boundary" advice this page carried before `0.0.9`,
  and it is narrower rather than gone, because that advice is still correct for the positions below.
  Everything here is **pre-existing, measured, and unchanged by the fix**.

  **This is deliberately not an exhaustive list of the unguarded positions, and saying so is the
  honest thing:** two drafts of this entry published a counted enumeration and both were measured
  incomplete. Treat it as "some envelope, control-number and line-counter slots are emitted raw",
  validate at your boundary, and do not read a slot's absence here as a guarantee.
  1. **Monetary and quantity slots read `.toString()`, so a raw number passes the check.** 36 such
     slots across six builders (12 in the 837, 12 in the 835, 4 in the 820, 4 in the 277, 3 in the
     271, 1 in the 834). This count **is** exhaustive, because the test suite asserts it file by
     file. `X12Decimal` is the first-class route and the one you should use, but a bare `number` is
     **not** refused there. Measured with `warnings.length === 0` in every case: a
     `patientResponsibilityAmount` of `0.1 + 0.2` emits
     `CLP*PT-ACCT-001*1*500.00*450.00*0.30000000000000004*…`, `1e21` emits `…*1e+21*…`, and `NaN`
     emits `…*NaN*…`.
  2. **Some string-typed positions never call the escape helper at all**, so a number is still emitted
     verbatim with no warning. Known examples, not a complete set: `build999`'s
     `envelope.groupControlNumber` (GS-06 / GE-02), `envelope.transactionSetControlNumber` (ST-02 /
     SE-02), `functionalGroup.disposition` (AK9-01) and `transactionResponses[].disposition` (IK5-01);
     `build278`'s `review.levelCode` (HL-03); `envelope.groupDate` / `envelope.groupTime` (GS-04 /
     GS-05); and `build837`'s `serviceLine.lineNumber` (LX-01). **AK9-01 is the one
     to know about:** it is an `ID` element bound to X12 code source 715, so a number there tells the
     receiver nothing about whether the functional group was accepted, and the library's own
     accept-with-errors guard compares it against `"A"` and does not fire. These positions also admit
     an **unescaped delimiter**: `build999` with a `groupControlNumber` of `"1*BOGUS"` emits
     `GS*FA*…*1*BOGUS*X*005010X231A1`, shifting GS-07 and GS-08 by one, and `build837` with a
     `lineNumber` of `"1*BOGUS"` emits `LX*1*BOGUS`, both with zero warnings. (Where a slot DOES go
     through the escape helper the delimiter is escaped correctly: `build834`'s `groupControlNumber`
     gives `1?*BOGUS`. That is the difference the helper makes.)
  3. **The fixed-width ISA slots** (`senderId`, `receiverId`, `interchangeControlNumber`, …) go
     through padding rather than escaping. A number there throws an untyped `TypeError` with no
     `code` (`value.slice is not a function`), and a numeric `interchangeControlNumber` throws the
     builder's typed refusal with the **misleading** text "exceeds the 9-char spec limit". Those two
     terminate rather than emitting silently, which makes them a smaller hazard than 1 and 2 - but
     that is a property of those two slots, not of the envelope: GS-04 and GS-05 above are envelope
     elements and are silent.

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

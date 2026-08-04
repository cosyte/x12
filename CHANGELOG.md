# Changelog

All notable changes to `@cosyte/x12` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

  **Sources, and what was not read.** TR3 005010X221A1 is a paid X12 document and **no clause of it
  is quoted or claimed.** The map rests on X12's own RFI #2163 (which names "the SVC05 'Units of
  Service Paid Count/Quantity' in the 835 guide" and states "a default has been included for SVC05
  in guide 005010X221A1"), the base X12 005010 SVC element dictionary (SVC-04 is element 234, a
  string; SVC-05 and SVC-07 are both element 380, Quantity - which alone rules out a revenue code at
  SVC-05), and three published payer companion guides implementing X221A1. Four sources, no dissent.
  They are listed in `KNOWN-LIMITATIONS.md`.

- **`escapeRelease` now throws `TypeError` on a non-string instead of returning `""`.** Previously it
  gave three different wrong answers depending on what arrived: a number, a boolean or a plain object
  returned the empty string silently; `null` and `undefined` threw on the property read; an array or
  an array-like threw on `charAt`. All three now terminate the same way. A `TypeError` rather than a
  code-tagged library error is deliberate: it is a pure text utility with no spec, element or caller
  context to name. Nothing inside the library can reach it, because all nine builders refuse
  first with their own typed, code-tagged error.

### Security

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

  **The `--staged` filter is now `AMT`, and `T` is the one-letter difference that made the mode check
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

  **Not closed here, and stated rather than implied**: `R` (rename) and `C` (copy) are still not
  enumerated by `--staged` at all, which is pre-existing and needs the two-path `--raw` record shape
  handled. Measured, so the cost is not left to inference: renaming a fixture while substituting a
  real name stages as `:100644 100644 <sha> <sha> R080 <old> <new>`, which both `AM` and `AMT` return
  zero rows for, and `--staged` exits 0 over a payload that is a hit as an ordinary add; `git mv` of
  an already-committed link into `test/fixtures/` is `R100` and is likewise not refused. The all-mode
  sweep is the backstop for both (exit 1 and exit 2 respectively), so the gap is at pre-commit, not
  in CI. Also unclosed: a scan that observed nothing is still reported clean rather than refused; and
  the
  enumerate-then-read window in all mode is untouched, because tolerating a failed read pulls the
  opposite way from narrowing what the enumeration admits and belongs in its own change. No library
  code changed and no published type changed.

### Fixed

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

### Documented, not fixed

> **Superseded in part by the "Fixed" entry above, which ships in the same release.** The model half
> of the entry below is now fixed: the segment is retained on `ix.orphanSegments`, and a double-spaced
> file no longer loses its interchange body. The **round-trip** half still stands: `serializeX12` does
> not re-emit an orphan, so the warning still does not survive. The two entries are kept separate
> because they were separate changes, and the sentences below describe the release before this one.

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

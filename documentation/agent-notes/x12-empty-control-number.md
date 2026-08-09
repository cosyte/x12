# `X12-EMPTY-CONTROL-NUMBER-FABRICATED` (2026-08-09)

The narrative for the `CLAUDE.md` trap of the same name. Base commit `28b417f` (`0.0.15`).

Provenance: this repo's own source tree at `28b417f` and at the head of this slice, measured (every
byte string, every warning array and every base/head reading below is a run, not a recollection).
**No primary X12 record was read for this slice and it grounds nothing new.** The one spec-shaped
statement it repeats, that ISA-13 is nine characters wide "per ASC X12 .5", is a **pre-existing
in-package assertion** carried by `padControl`, by `build-interchange.ts`'s own ISA comment and by
`test/_helpers/envelope.ts`'s `ISA_WIDTHS`; this slice inherits it and does not verify it. The
refuse-versus-warn call rests on in-package CONSISTENCY, stated as such below, and **not** on any
005010 clause.

## Gate record, including the one UNGRADED commit

Three conformance-refuter passes, the ADR 0016 cap: **REFUTED, REFUTED, NOT REFUTED.**
**No pass found a defect in the CODE.** Every one of the twenty-plus findings was a claim defect,
which is this repo's recorded pattern for a parser slice and is why the prose here is longer than
the fix.

- **Pass 1** (major + five minors): "nothing a consumer branches on changes" was false, because a
  defect detected later in a builder now reports the control-number refusal instead. Plus a
  one-builder measurement published as a class, a fabricated `TA1*   *…`, an `undefined` route that
  does not behave as claimed, an over-sold drift pin, and a missing `Provenance:` field.
- **Pass 2** (major + minor): the finding-2 remedy reached seven surfaces and missed fourteen, and
  half-corrected the public troubleshooting page into a contradiction.
- **Pass 3** (four minors, none blocker or major): converged.

**🛑 One commit after pass 3 is UNGRADED and is disclosed here because it exists.** It is
**deletion only** apart from this section: it removes the "so the required element is LOST" lead-in
(false of GS-06 and ST-02, and the tripwire below it already said so) and the seven `SE*NN` figures
that had been hand-copied to fifteen sites. Nothing was added, no guard moved, no test changed, and
the working state therefore asserts strictly less than the state pass 3 graded, which is ADR 0027's
reason that a deletion-only commit cannot introduce what nobody checked.

## The filed line, and what re-measuring it found

`operations/BACKLOG.md`'s `X12-837-RESIDUALS` carried:

> **An EMPTY control number is not refused:** `padControl("", 9)` zero-pads, so an empty
> `interchangeControlNumber` emits ISA-13/IEA-02 as **`000000000` - a FABRICATED control number,
> silently, `warnings: []`.**

That reproduced exactly. It is also **one slot of a class**, and the class differs by slot, which is
the reason this slice is a census and not a site.

## The census, measured at `28b417f`

Through `buildInterchange`, one variable at a time on an otherwise clean spec:

```text
interchangeControlNumber: ""
  ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *250101*1200*^*00501*
  000000000*0*P*:~ … ~IEA*1*000000000~                                        warnings: []

groupControlNumber: ""
  GS*HC*SENDER*RECEIVER*20250101*1200**X*005010X222A2~ … ~GE*1*~               warnings: []

transactionSetControlNumber: ""
  ST*837**005010X222A2~ … ~SE*3*~                                             warnings: []
```

Two mechanisms, not one:

- **ISA-13 / IEA-02 FABRICATE.** `padControl` zero-pads to nine characters and nothing stood in front
  of it, so `""` became a nine-digit identifier the caller never supplied. The interchange is frozen,
  well-formed and reconciles.
- **GS-06 / GE-02 and ST-02 / SE-02 LOSE the element.** They reach the wire through `esc`, and
  `escapeRelease` early-returns on `""`.

**🛑 The second mechanism's BYTES differ by builder family, and a draft of this file published one
measurement as the class.** `buildInterchange` and `build999` join without trimming, so the element
goes out empty on both ends of the pair. The seven domain builders share a `seg` that drops a
trailing empty element, so the trailer loses it outright. Measured at the same commit through
`build834`:

```text
groupControlNumber: ""            GS*BE*EMPLOYERCO*MEDPAY*20260601*1200**X*005010X220A1 | GE*1
transactionSetControlNumber: ""   ST*834**005010X220A1 | SE*21
```

Both silent, `warnings: []`. **Say `warnings: []`, never "each pair reconciled against itself"** -
in the domain builders there is no second element to reconcile with. The property that holds across
both families is the silence: no diagnostic on any channel separated an absent control number from a
supplied one.

The fabrication is the worse of the two: an absent identifier fails loudly at the receiver; an
invented one reconciles against the wrong thing.

`#100` had already recorded the sibling half of this while picking its own slice
(`documentation/agent-notes/x12-body-degenerate-release-separator.md`, "What was re-measured").
This slice agrees with that measurement and extends it to the acknowledgment builders.

### The ack echoes carry the same class

`build999` and `buildTA1` do not only assemble an envelope; they carry the control numbers of the
document being acknowledged, which is the whole reason a sender can match an ack to what they sent.
Measured at the same commit:

```text
build999, functionalGroup.groupControlNumber: ""         AK1*HC**005010X222A2~
build999, transactionResponses[0].transactionSetControlNumber: ""   AK2*837*~
buildTA1, interchangeControlNumber: ""                   TA1**260601*1200*A*000
```

`buildTA1`'s was already disclosed in `KNOWN-LIMITATIONS.md` as "Unchanged and tracked as its own
item" - this is that item, so leaving it open would have left the disclosure pointing at nothing.
`AK1-02` and `AK2-02` were not disclosed anywhere.

## The decision: REFUSE, not warn

Both were on the table and the item did not settle it. Refusal wins on four grounds, in the order
they were weighed:

1. **The in-package precedent for an empty required element is uniform and it is refusal.**
   `build835` refuses `patientControlNumber === ""` (CLP-01), `build837` refuses `claimId === ""`
   (CLM-01), `build834` refuses `maintenanceTypeCode === ""`, `build278` refuses
   `requestCategoryCode === ""` and `build277` refuses `categoryCode === ""`. Each throws that
   builder's own typed, code-tagged error. A control number is the same kind of value as CLP-01, one
   level up the envelope. This is the same CONSISTENCY tiebreak `#96` used, and it is stated as a
   fact about this tree rather than as a clause anyone here has read: **005010 does not settle
   refuse-versus-warn and nothing in this slice claims it does.**
2. **Emit is the strict half of this library by standing convention.** Lenient on parse, spec-clean
   on emit. Zero-padding an absent value is not leniency, it is a silent correction, and `CLAUDE.md`
   says nothing is ever silently corrected.
3. **A warning would have to travel the READ channel.** A builder returns `parseX12` of the bytes it
   just wrote, so its `warnings` array is the read side's registry. Putting an emit-side caller
   mistake there would mint a code on the channel consumers use to grade **inbound** documents, and a
   widening that moves a case onto a new code blinds every predicate written against the old one -
   the rule `#83` was refuted for. A throw has no predicate to break.
4. **A warned document still goes out.** The failure being closed is a caller who did not notice a
   frozen, successful-looking interchange. A warning on that same interchange is what they did not
   notice the first time.

**What it costs, stated rather than argued away:** a caller relying on `""` to mean "pad me a control
number" is broken by this, deliberately. What they were shipping was `000000000`, a real value a
trading partner may already have assigned to something else.

**`KNOWN-LIMITATIONS.md` committed to neither disposition before this**, which was checked: its TA1
entry recorded the behaviour and named it open, and no page promised the zero-pad as a feature.

## The shape of the fix

One helper, `src/builder/caller-control-number.ts`, on the pattern `caller-string.ts` /
`caller-array.ts` / `caller-segment.ts` already set: it takes the calling module's own `refuse`
callback, so each builder keeps its distinct error class and code and **no new code is minted**.

Thirty call sites: three envelope pairs in each of the nine builders that assemble an ISA, plus
`AK1-02`, `AK2-02` and `TA1-01`. Each has its own red negative control - deleting any single guard
call reds at least one case in that builder's suite, verified by deleting them one at a time and
running the suite between each.

### Three bounds, all deliberate, all disclosed

- **Byte-strict `=== ""`. No trim.** `padControl(" ", 9)` still answers `"00000000 "`. `buildTA1`
  imports no `pad` at all, so it emits whatever whitespace it was handed, VERBATIM - never write it
  as padded. Trimming is a **normalisation rule** and no source consulted for this
  package states one; the five in-package guards this mirrors are all byte-strict for the same
  reason. Pinned as a test so it cannot quietly change, and disclosed in `KNOWN-LIMITATIONS.md` and
  in `docs-content/troubleshooting.md` as the one shape a caller should still screen for.
- **~~No type check~~ - 🛑 SUPERSEDED 2026-08-09 BY `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED`,
  AND THE REASONING BELOW WAS MEASURED FALSE. READ `agent-notes/x12-control-number-guard-type.md`
  BEFORE CITING THIS BULLET.** This bound was stated as "nothing about a non-string changed on any
  route", which was true, and justified as _"widening this guard into a type guard would have changed
  a documented message for a defect that is already loud"_ - which was **not**. At the nine ISA-13 /
  IEA-02 slots the defect was not loud: `[]` and `new String("")` emitted the same fabricated
  `000000000` with `warnings: []`, and `new String("ABC")` was silently coerced. The guard type-checks
  now. What is left of the original caution is real and is recorded in the successor note: several
  diagnostics DID move, including one off a bare `TypeError`, and the refusal message moved at every
  `esc`-routed control-number slot.
- **A SHORT control number still zero-pads.** The guard is not "ISA-13 must be nine characters":
  `"1"` still emits `000000001`, which is the entire point of `padControl`. Pinned in every suite the
  slice touches, because reading the guard the other way is the obvious mis-generalisation.

### Placement, and why precedence did not move

Every guard sits at the envelope-assembly site rather than at the top of its builder, so **every
guard that runs BEFORE it keeps its precedence.** Measured: `build835`'s `enforceBalance`,
`build999`'s AK9 count reconciliation, `buildTA1`'s `enforceAcceptIsClean`, the 837's and 277's
hierarchy checks and `build834`'s unknown-maintenance-type refusal all still fire ahead of this one.

**🛑 It does NOT preserve every ordering, and a draft of this file claimed it did.** A defect the
builder detects LATER, during body assembly, now reports the control-number refusal instead, on that
builder's own `*_INVALID_SPEC` code. Measured: `build999` with an empty `interchangeControlNumber`
and six AK9 syntax error codes threw `X12_ACK_COUNT_MISMATCH` at base and throws
`X12_ACK_INVALID_SPEC` at head, so a consumer predicate on that exported code goes base-true /
head-false. **The remedy for that is the CLAIM, never the guard**: moving guards earlier would
destroy the precedence that currently holds correctly. It is disclosed in `CHANGELOG.md`,
`KNOWN-LIMITATIONS.md`, the changeset and `docs-content/troubleshooting.md`.

## What is pinned, and the honest limit of the pin

- `test/builder-control-number-empty.test.ts` - `buildInterchange` (all three pairs), `build999` (all
  three pairs plus both echoes), the whitespace residual, the short-control-number control, and a
  green control fixture per builder so a red case cannot pass on a broken spec.
- Each domain builder's own build suite carries its three envelope cases against the valid spec that
  suite already maintains.
- `test/transactions-ack-ta1-escape.test.ts` - the case that pinned the OPPOSITE assertion now pins
  the refusal, beside the disclosure it replaces.
- **The message is asserted, never only the class.** `toThrow(SomeBuildError)` passes on any
  unrelated refusal in these specs, which is how four of six cases in an earlier slice were vacuous.

**The drift pin is a source regex and establishes nothing about the property.** It requires each of
the NINE named ISA builders to name all three slot literals and to import the guard, so it reds if
one of them loses a guard. **It buys nothing for a tenth builder in a new file** - `ISA_BUILDERS` is
a hand-maintained list, deliberately, so adding one is an edit to that list. A draft of this file and
of the test said the pin covered a tenth builder; it does not. The behavioural cases are the
evidence. This is written down because this repo has been caught before reading a same-line scan as a
proof.

**No census of the slots NOT routed through the guard is published**, here or in the module doc or in
`CLAUDE.md`. Three earlier slices published one and a refuter falsified each by finding one more. The
claim is the property: **a control number routed through `requireControlNumber` is refused when
empty.**

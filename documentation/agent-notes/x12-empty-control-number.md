# `X12-EMPTY-CONTROL-NUMBER-FABRICATED` (2026-08-09)

The narrative for the `CLAUDE.md` trap of the same name. Base commit `28b417f` (`0.0.15`).

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

- **ISA-13 / IEA-02 FABRICATE.** `padControl` zero-pads to the nine characters ASC X12 .5 fixes
  ISA-13 at, and nothing stood in front of it, so `""` became a nine-digit identifier the caller
  never supplied. The interchange is frozen, well-formed and reconciles.
- **GS-06 / GE-02 and ST-02 / SE-02 DROP.** They reach the wire through `esc`, and `escapeRelease`
  early-returns on `""`, so a required element goes out empty. Because it goes out empty at **both**
  ends of the pair, `X12_CONTROL_NUMBER_MISMATCH` does not fire either.

Both are silent. The first is the worse one: an absent identifier fails loudly at the receiver; an
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

- **Byte-strict `=== ""`. No trim.** `padControl(" ", 9)` still answers `"00000000 "` and `buildTA1`
  still emits `TA1*   *…`. Trimming is a **normalisation rule** and no source consulted for this
  package states one; the five in-package guards this mirrors are all byte-strict for the same
  reason. Pinned as a test so it cannot quietly change, and disclosed in `KNOWN-LIMITATIONS.md` and
  in `docs-content/troubleshooting.md` as the one shape a caller should still screen for.
- **No type check.** A non-string behaves exactly as before: `esc` refuses it, and `padControl`
  throws the typed refusal whose text misleadingly says "exceeds the 9-char spec limit". That wart is
  disclosed in `caller-string.ts` and untouched here. Widening this guard into a type guard would
  have changed a documented message for a defect that is already loud.
- **A SHORT control number still zero-pads.** The guard is not "ISA-13 must be nine characters":
  `"1"` still emits `000000001`, which is the entire point of `padControl`. Pinned in every suite the
  slice touches, because reading the guard the other way is the obvious mis-generalisation.

### Placement, and why precedence did not move

Every guard sits at the envelope-assembly site rather than at the top of its builder, so **every
guard that already ran keeps its precedence**: a spec that is wrong in two ways reports the same
first refusal it reported before. Measured: `build835`'s `enforceBalance`, `build999`'s AK9 count
reconciliation and `buildTA1`'s `enforceAcceptIsClean` all still fire ahead of this one.

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

**The drift pin is a source regex and establishes nothing about the property.** It requires every ISA
builder to name all three slot literals and to import the guard. That is drift protection for a tenth
builder copying the ISA block; the behavioural cases are the evidence. This is written down because
this repo has been caught before reading a same-line scan as a proof.

**No census of the slots NOT routed through the guard is published**, here or in the module doc or in
`CLAUDE.md`. Three earlier slices published one and a refuter falsified each by finding one more. The
claim is the property: **a control number routed through `requireControlNumber` is refused when
empty.**

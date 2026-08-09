# `X12-BODY-DEGENERATE-RELEASE-SEPARATOR` (2026-08-09)

The measurement, the sources and the reasoning behind the `CLAUDE.md` trap of the same name. Open
this before you touch `decodeSegment`, `splitWithRelease`, `findUnescapedTerminator` or
`splitElements`.

## What was measured at base (`72bafc2`, published `0.0.15` plus two unreleased fixes)

`detectDelimiters` reads the element separator positionally out of ISA byte 4. It rejects ASCII
control characters, DEL, anything matching `\s`, and a non-distinct set of four - and nothing else.
`?` is therefore admissible as ANY of the four delimiters, and `buildInterchange` exposes all four to
a caller under the same screening.

`src/parser/envelope.ts` already handled the degenerate case twice:

- `findUnescapedTerminator` - `if (term.length !== 1 || term === RELEASE_CHAR) return text.indexOf(...)`
- `splitElements` - `if (delimiters.element === RELEASE_CHAR) return segment.split(...)`

`src/parser/segment.ts`'s `decodeSegment` did not. It called `splitWithRelease(raw, delimiters.element)`,
whose loop consumes the byte after every `?` unconditionally, so with `?` AS the element separator no
split ever happened. Measured straight through `parseX12` on an interchange whose ISA declares
`element: "?"`:

```text
ST?837?0001?005010X222A1                 id "(non-spec)", 1 element
NM1?85?2?ACME CLINIC?????XX?1234567893   id "(non-spec)", 1 element
SE?3?0001                                id "(non-spec)", 1 element
warnings: []
```

`boundSegmentId` maps the blob onto `NON_SPEC_SEGMENT_ID` because it fails the segment-id grammar.

**The envelope framed correctly the whole time, and that is what made it silent.** `groups.length`
is 1, the transaction is present, `GE-01`, `IEA-01`, `GS-06`/`GE-02` and `ST-02`/`SE-02` all
reconcile, `warnings` is `[]` - because those all read `splitElements`' output, which was right. Only
the decoded body was wrong, and every reader in this package dispatches on `seg.id`, so a consumer
got an empty claim list out of a document `parseX12` reported as clean.

`buildInterchange` disagreed with itself the same way `#96`, `#97` and `#99` each found it doing: it
returns `parseX12` of the bytes it just wrote, so a caller passing `elementSeparator: "?"` and a
`CLM` got back a model containing no `CLM`.

## The fix, and its exact bound

Two lines in `decodeSegment`, both keyed on `delimiters.element === RELEASE_CHAR`:

1. the element split falls back to `raw.split(delimiters.element)`, and
2. the dangling-release check is skipped.

(2) is not cosmetic. The check keys on a trailing `?`, and with `?` as the separator that byte is an
EMPTY LAST ELEMENT. Without it, `PER?IC?NAME?TE?5551234?` - a well-formed segment - raised
`X12_DANGLING_RELEASE_CHAR` at the same moment the split started producing the right answer. Each
half has its own red control: removing (1) reds seven tests, removing (2) reds exactly one.

## 🛑 Why the guard is at the CALL SITES and not hoisted into `splitWithRelease`

A draft put one line in `splitWithRelease` - `if (sep === RELEASE_CHAR) return input.split(sep)` -
which is smaller and covers all three roles at once. It is wrong, and the reason is on the EMIT side.

`escapeRelease` protects a value by **prefixing `?`** to the byte that needs protecting, and it does
that **whatever role `?` was declared in** - so with `?` as a component separator a literal `?` in a
value is written `??`. At `0.0.15`:

```text
buildInterchange({ componentSeparator: "?" }) with CLM-01 "PATIENT?ACCT"
  emits  CLM*PATIENT??ACCT*150.00
  reads  getSegmentValue(clm, "01") === "PATIENT?ACCT"   warnings: []
```

**That builder call is REFUSED now** (`X12-EMIT-DEGENERATE-RELEASE-DELIMITER`, the emit-side slice
that followed this one) - but the argument for leaving the read side alone SURVIVES the refusal and
gets stronger, because those bytes were emitted and those documents exist. Hoisting the guard would
re-frame that `??` as two empty components and stop reading a value this library itself wrote. It is
the same shape as `#99`'s pass-1 code major (mapping `esc` over the whole parts array broke a spec
that built clean at `0.0.15`), reached from the other side. The repetition role behaves identically.

So: the ELEMENT role is fixed, because there the degenerate behaviour was catastrophic and had no
working counterpart to protect. The REPETITION and COMPONENT roles are left alone on READ, because
there the degenerate behaviour is merely a separator that never splits AND documents emitted at
`0.0.15` depend on it. Deciding those two on EMIT meant deciding `escapeRelease` with them, which is
the different slice named above and is now done: a builder refuses the set rather than the parser
re-reading it.

## 🩺 The refutations: the emit half reaches the ELEMENT role too, and TWO drafts named a trigger instead of the property

**Read this before you write the next sentence about `buildInterchange` and a degenerate set. Two
drafts were refuted here, the second by the correction to the first.**

- **Pass 1.** The "per ROLE" paragraph above rests on the escaper acting **in every role**, and the
  draft then drew the consequence for two of the three. The gate refuted it with a value one
  character away from the control the draft did pin.
- **Pass 2.** The pass-1 remedy named the trigger as _"a value carrying a literal `?`"_ and shipped a
  consumer instruction to _"keep `?` out of your values"_. The gate refuted that by producing one
  more trigger byte, and the instruction protected nobody.

**The property, which one more trigger byte cannot falsify.** `escapeRelease` protects a value by
**prefixing `?`** to the byte that needs protecting - any of `element | repetition | component |
segment | ?`. When `?` IS the element separator, that prefix is itself a separator, so the protection
becomes a split. **No value containing any active delimiter or a literal `?` survives a
`buildInterchange` round trip on `elementSeparator: "?"`, and there is no value-level workaround.**
**It is REFUSED now, in all four roles** - and read the mechanism sentence as one of TWO; the section
at the end of this file says what the other is.

Instances, measured at head, **not a census**:

```text
["CLM","PATIENT?ACCT","150.00"] -> CLM?PATIENT??ACCT?150.00  ["CLM","PATIENT","","ACCT","150.00"]
["HI","ABK:J45.50"]             -> HI?ABK?:J45.50            ["HI","ABK",":J45.50"]
["CLM","ACME^CLINIC","150.00"]  -> CLM?ACME?^CLINIC?150.00   ["CLM","ACME","^CLINIC","150.00"]
["REF","EA","A~B"]              -> REF?EA?A?~B               ["REF","EA","A","~B"]
warnings: [] on every row. At base 72bafc2 every row read ONE `(non-spec)` element,
every dot-path `undefined`.
```

**The round-trip failure is `PRE-EXISTING`; the DIRECTION is not.** A detectable absence became a
confident wrong value with an empty warning array - the one direction
`src/builder/caller-string.ts`'s own module doc forbids. **And it is not always a truncation:** the
`HI` row strands the diagnosis code in a phantom `HI-02`, so `getSegmentValue(hi, "01-2")` answers
`undefined` while `"02"` answers `":J45.50"`. `:` composites are routine in the 837 and the 835, so
this is not the exotic corner the `?` framing implied.

**It is corrected as a CLAIM and deliberately NOT guarded** (conventions.md rule 3, and both refuter
passes said so in as many words). A guard here means deciding `escapeRelease` for a degenerate set
inside a read-side slice, which is how a fix outgrows the thing it fixes. What changed instead: the
test that claimed the builder "no longer disagrees with itself" is retitled to the qualified claim it
can support, the property is pinned by a table of instances that states it is not a census, the
value-level mitigation is **deleted** rather than reworded, and every surface says **THREE** roles
need the emit side decided.

**Not measured, and flagged for that emit-side slice rather than for this one:** only the generic
`buildInterchange` segment-spec route (`buildTransaction`'s `segment.map(esc)`) was probed. The
per-TR3 domain builders were not.

**They were measured in the emit-side slice, and the flag was right to be there: they carry a SECOND
mechanism this section never saw.** A domain builder joins composites with the component separator
and repetitions with the repetition separator, so where either IS `?` the library's own structural
join is emitted as an escape - `build837P` fused `SV1-01-2` and `HI-01-2` into the preceding
component on EVERY document, with no trigger byte in any value. So the property stated above is one
of two, and the sentence _"no value containing any active delimiter or a literal `?` survives"_ is
true and INCOMPLETE: the second mechanism has no offending value at all. Full measurement:
`documentation/agent-notes/x12-emit-degenerate-release-delimiter.md`.

**The third refutation, smaller and the same shape (pass 1).** The `?~` residual control pinned `raw` and the id
list but not `elements`, and "framing is untouched" read as "nothing about this residual moved". The
read of the merged blob DID move: `PER?IC?NAME?TE?5551234?EX?~SE?3?0001` now frames as
`["PER","IC","NAME","TE","5551234","EX","~SE","3","0001"]`, so `~SE` and the SE's own control number
sit in `PER`'s communication-number slots, where at base they sat inside one `(non-spec)` element
that no walker touched. `X12_MISSING_SE` still fires, so it is not silent. `elements` is pinned now.

## 🩺 The residual this does NOT close, measured

`findUnescapedTerminator` guards its own role only. With `?` as the ELEMENT separator, a segment
ending in an empty last element puts a `?` immediately before the terminator, and the scanner reads
it as an escape:

```text
...ST?837?0001~PER?IC?NAME?TE?5551234?EX?~SE?3?0001~GE?1?1~IEA?1?000000001~

  segments: ST, PER   (PER.raw === "PER?IC?NAME?TE?5551234?EX?~SE?3?0001")
  warnings: [X12_MISSING_SE]
```

`PRE-EXISTING`, and framing rather than decoding, which is the `#96` class and its own call. It is
pinned in `test/parser-segment-degenerate-release-separator.test.ts` as an honest control so it
cannot move unnoticed, and it is disclosed in `KNOWN-LIMITATIONS.md` beside the fix.

## The behaviour-change call

**It changes how an already-published document decodes, deliberately.** The tiebreak is CONSISTENCY
with the two guards this package already carried, NOT a spec clause: 005010 does not transmit a
release character at all, so nothing in it says what a `?` means once a sender has declared `?` as
structure.

**But do not restate `#96`'s symmetry here - it does not hold.** `#96` moved a case between two
defensible readings and had to be reported as symmetric because a literal-`?` sender lost an element
by it. Here the base behaviour is not a reading: a one-element segment with an id of `(non-spec)` is
not an alternative parse of `NM1?85?2?ACME CLINIC`, and no reader in this package could act on it.
There is no direction in which base was right.

The other alternative considered and rejected: refusing the interchange as Tier-3
`X12_INVALID_DELIMITERS` when a delimiter is `?`. It would refuse documents this library currently
accepts AND documents `buildInterchange` currently emits, and it would contradict the two existing
guards, which both chose the literal-split fallback.

## Warning-channel accounting

No code is minted. One is subtracted, in one place - the spurious `X12_DANGLING_RELEASE_CHAR`
above - so the channel change is purely subtractive and only on the degenerate set. Every assertion
in the test file is `toEqual` on the WHOLE array, per the standing rule that pinning a value plus the
absence of a different code stays green through a real regression.

## What was re-measured while picking this slice

The `X12-837-RESIDUALS` "still open" list carried five items. Measured against `72bafc2`:

- **`splitWithRelease` degenerate-`?` guard for BODY segments** - OPEN. This slice.
- **`parseTA1` does not unescape** - OPEN **at `72bafc2`**, and **CLOSED since, by
  `X12-TA1-RESIDUALS`**: the five decoded fields are post-unescape and `raw` is the byte surface.
  This is a dated measurement, not a live claim; read it as one.
- **an EMPTY control number is still not refused** - OPEN, and sharper than "not refused":
  `padControl("", 9)` zero-pads it, so `interchangeControlNumber: ""` emits ISA-13 and IEA-02 as
  `000000000` - a FABRICATED control number, silently, with an empty warning array. An empty
  `groupControlNumber` emits an empty GS-06 / GE-02, and an empty `transactionSetControlNumber` an
  empty ST-02 / SE-02.
- **`buildInterchange` does not escape GS-04/05/07** - **STALE.** Closed by `#99` (`72bafc2`);
  `gs.elements` now reports the caller's values. The backlog item's own "CLOSED THIS ARC" line names
  it while its OPEN list still carried it.
- **a mid-segment dangling `?` raises no `X12_DANGLING_RELEASE_CHAR`** - **NOT REACHABLE AS STATED,
  and it should not be "fixed" without re-deriving it.** A `?` at the end of a non-final element is
  by definition escaping the separator that follows it, so it is never unpaired; and inside a
  terminated stream a segment cannot END with a bare `?` either, because that `?` would escape the
  terminator. The only reachable bare-`?`-with-no-target is at end of input, which `decodeSegment`
  already warns for. What genuinely raises nothing is the `?X` Postel case, which `release.ts`
  documents as deliberate and `KNOWN-LIMITATIONS.md` already records as unchanged - warning on it
  would fire on every literal `?` in an `NTE`.

## The `CLAUDE.md` imperatives, RELOCATED IN FULL 2026-08-09, VERBATIM, NOTHING DROPPED

Moved out of `CLAUDE.md` under that file's own ratchet to pay for the
`X12-EMIT-DELIMITER-SHAPE-UNCHECKED` trap: relocate first, lower the entry as the relocation
lands, never raise the ceiling. These are the live imperatives, unchanged; `CLAUDE.md` now carries
only a pointer to them.

- **🩺 `decodeSegment` FALLS BACK TO A LITERAL SPLIT WHEN THE ELEMENT SEPARATOR IS `?`, AND SKIPS
  THE DANGLING CHECK WITH IT** (a trailing `?` there is an EMPTY LAST ELEMENT). `?` is admissible at
  any delimiter position and `buildInterchange` takes all four, so a BODY segment came back as ONE
  element, id `(non-spec)`, **while the ENVELOPE framed correctly and every count reconciled -
  `warnings: []`, and readers dispatch on `seg.id`, so a clean document gave an EMPTY claim list.**
  THREE SITES NOW; KEEP THEM IN STEP.
- **🛑 PER ROLE, ON READ; DO NOT HOIST IT INTO `splitWithRelease`.** Splitting the other two breaks a
  value WE EMITTED at `0.0.15` (`#99`'s pass-1 major, inverted), and **THAT REASON SURVIVES THE EMIT
  REFUSAL - THOSE DOCUMENTS EXIST.** The emit half is the trap below; **STATE THE PROPERTY, NEVER A
  TRIGGER BYTE - TWO DRAFTS NAMED ONE AND THE GATE PRODUCED ONE MORE EACH TIME.**
- **⚖️ CHANGES PUBLISHED DECODING, ON CONSISTENCY, NOT SPEC - NEVER RESTATE `#96`'s SYMMETRY: A
  `(non-spec)` BLOB IS NOT A SECOND READING.** No code minted; ONE subtracted. **`PRE-EXISTING`,
  OPEN: `?~` still swallows the TERMINATOR. FRAMING UNTOUCHED - BUT THE MERGED BLOB'S READ MOVED
  (`~SE` lands in `PER-06`), SO NEVER SAY "NOTHING MOVED".**

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

`escapeRelease` writes `??` for a literal `?` **whatever role `?` was declared in**. So today:

```text
buildInterchange({ componentSeparator: "?" }) with CLM-01 "PATIENT?ACCT"
  emits  CLM*PATIENT??ACCT*150.00
  reads  getSegmentValue(clm, "01") === "PATIENT?ACCT"   warnings: []
```

That round trip works at `0.0.15`. Hoisting the guard would re-frame that `??` as two empty
components and break it - a value this library itself emitted and could no longer read back. It is
the same shape as `#99`'s pass-1 code major (mapping `esc` over the whole parts array broke a spec
that built clean at `0.0.15`), reached from the other side. The repetition role behaves identically.

So: the ELEMENT role is fixed, because there the degenerate behaviour was catastrophic and had no
working counterpart to protect. The REPETITION and COMPONENT roles are left alone, because there the
degenerate behaviour is merely a separator that never splits AND the emit half depends on it.
Deciding those two means deciding `escapeRelease` with them. That is a different slice.

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
- **`parseTA1` does not unescape** - OPEN. `parseTA1` reads `elements` verbatim, so a TA1-01 of
  `0000?*0001` reads back with its `?`. Unchanged and still disclosed in `parse-ta1.ts`.
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

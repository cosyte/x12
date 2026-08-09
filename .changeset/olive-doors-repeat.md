---
"@cosyte/x12": patch
---

🩺 A BODY segment in an interchange whose ELEMENT SEPARATOR is `?` now frames its elements, where it
used to come back as one element with an id of `(non-spec)`.

`detectDelimiters` reads the element separator positionally out of ISA byte 4 and rejects only
control characters, whitespace and a non-distinct set, so a sender may declare `?` there, and
`buildInterchange` accepts `elementSeparator: "?"` from a caller. The envelope decoder guarded that
degenerate set in both of its own splitters, once for the segment terminator and once for an
envelope segment's elements; `decodeSegment` - which every body segment plus the `ST`, the `SE` and
every retained orphan goes through - did not. It used the release-aware splitter, where a `?`
consumes the byte after it, so no split ever happened:

```text
ST?837?0001?005010X222A1                 id "(non-spec)", 1 element
NM1?85?2?ACME CLINIC?????XX?1234567893   id "(non-spec)", 1 element
SE?3?0001                                id "(non-spec)", 1 element
warnings: []
```

🩺 The envelope framed correctly the whole time, which is what made it silent: one group, one
transaction, every count and control-number pair reconciling, an empty warning array, and a
transaction body no reader could see, because every reader in this package dispatches on `seg.id`.
`buildInterchange` disagreed with itself the same way, since it returns `parseX12` of the bytes it
just wrote.

🛑 It changes how an already-published document decodes, deliberately, on a tiebreak of CONSISTENCY
with the guard this package already carried twice rather than on a spec clause: 005010 does not
transmit a release character at all, so nothing in it says what a `?` means once a sender has
declared `?` as structure. Unlike the envelope-splitter change before it, this class is not
symmetric - a one-element segment with an id of `(non-spec)` is not a second reading of the bytes,
and no reader could act on it.

No warning code is added and no case moves onto a new code. One is subtracted, in one place:
`X12_DANGLING_RELEASE_CHAR` fired on any degenerate segment ending in an empty last element, because
the check keys on a trailing `?`. With `?` as the separator that byte is an empty element, not an
unpaired escape.

🛑 The guard is per ROLE. A `?` repetition or component separator still does not split, and that is
measured rather than overlooked: `escapeRelease` writes `??` for a literal `?` whatever role `?` was
declared in, so `buildInterchange({ componentSeparator: "?" })` emits `CLM*PATIENT??ACCT*150.00`
today and reads `"PATIENT?ACCT"` back out of it. Splitting those roles literally would re-frame that
as two empty components, trading a separator that never splits for a value this library itself
emitted and could no longer read back.

What this does not close, pinned rather than left to be rediscovered: on a degenerate set a `?~`
still swallows the segment terminator, because `findUnescapedTerminator` guards its own role only,
so a segment ending in an empty last element merges with its successor and raises
`X12_MISSING_SE`. Framing is untouched here. Values are still raw, `elements.join(separator)` still
reproduces the segment byte for byte, and the ISA stays positional.

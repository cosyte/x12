---
"@cosyte/x12": patch
---

Retain segments that fall outside a transaction, and absorb any run of CR / LF between segments.

Two defects with one cause, both silent data loss. A segment the envelope grammar could not place
raised `X12_UNEXPECTED_SEGMENT` and was then discarded outright, so its bytes were unrecoverable.
Separately the line-break tolerance was exactly one optional CR then one optional LF, which admitted
4 of the 15 CR/LF sequences of length 0 to 3; the other 11 left a break in the stream that opened an
unrecognized segment, so a uniformly double-spaced file lost its entire interchange body and returned
`groups: []`.

New public surface `X12Interchange.orphanSegments`, an ordered `readonly X12OrphanSegment[]` carrying
each such segment's verbatim `raw`, its decoded `segment`, its `segmentIndex`, and the library-owned
`context` discriminant naming which structural rule it broke. `segmentIndex` equals the
`position.segmentIndex` of that segment's `X12_UNEXPECTED_SEGMENT` warning, so the two surfaces join
without string matching. The array is empty for a well-formed interchange. Retention runs through one
chokepoint rather than per call site, so it covers whatever reaches the envelope walker's
unexpected-segment paths; the positions measured are a body segment between `GE` and `IEA`, between
an `SE` and its group's `GE`, or between `GS` and the first `ST`; an `ST` with no open group; an `SE`
closing nothing; a `GE` closing nothing; and a `TA1` inside an open group.

This fixes the model, not the emit. `serializeX12` still does not reproduce an orphan, so neither the
segment nor its warning survives a round trip, and `KNOWN-LIMITATIONS.md` still lists the constructs
the default emit does not reproduce. Re-emitting one needs the model to carry a structural anchor
(which group and transaction it followed) rather than the raw input index it carries today, and that
is tracked separately. A positional replay keyed on `segmentIndex` was built and removed during this
change because it was unsound: the emit is not in input order (it hoists `ta1Segments`) and skips the
zero-length segment a doubled terminator produces, so replaying by input index spliced the orphan
into whatever occupied that slot. Measured, it put a stray segment inside an 835's `ST..SE` body with
no warning on the re-parse, made a stray `SE` close the transaction early and corrupt SE-01, and
carried an orphan across the IEA into `trailingBytes`.

Retention is not placement. An orphan is not decoded by any `get*` reader, and a `TA1` inside a group
is not added to `ta1Segments`, which means "envelope-level TA1" and is what `parseTA1` reads. Neither
a doubled segment terminator nor a segment whose first element is empty is recorded as an orphan;
both are long-standing behaviour.

Treat an orphan as PHI when logging. It sits on the model side of this library's diagnostic
boundary: a warning `message` is a frozen-registry lookup carrying positional metadata only, so the
whole `ix.warnings` array is safe to log, whereas an orphan carries the sender's bytes verbatim
exactly as `tx.rawSegments` and `isa.raw` do. Log `context` and `segmentIndex`, not `raw`.

Measured on the previous release, then after: CR/LF sequences of length 0 to 3 that frame correctly,
4 of 15 then 15 of 15; orphan cases that retain the segment, 0 of 10 then 10 of 10 (ten constructed
cases over nine distinct positions). Across the 56
committed fixtures nothing changed: same 42 pretty-printed and 14 compact, same byte-exact count,
zero model divergences, zero warning divergences, zero fixed-point failures, and no fixture produces
an orphan.

Behaviour changes worth knowing. A double-spaced file that previously produced 7 warnings and an
empty `groups` now parses cleanly with none. A trailing CR/LF run after the final terminator is
absorbed rather than surfacing as `trailingBytes` (previously `~\n\n` there yielded a `trailingBytes`
of `"\n~"`, a byte the input never contained, plus an `X12_TRAILING_GARBAGE` warning). No warning
code was added or removed (the registry is unchanged at 22 warnings and 4 fatals) and nothing new
throws. The five `X12_UNEXPECTED_SEGMENT` messages were rewritten, since each said the segment was
not retained.

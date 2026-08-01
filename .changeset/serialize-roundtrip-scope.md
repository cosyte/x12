---
"@cosyte/x12": patch
---

Correct the round-trip claim: `serialize(parse(s)) === s` is not guaranteed.

The README described the default emit mode as "byte-faithful by default" with no qualification, and
line-ending handling was absent from the whole consumer surface. The emit is byte-faithful only for
the segments the parser recorded on the model, in the order the model holds them, and six constructs
do not survive: line breaks between segments, segments outside a transaction (raised as
`X12_UNEXPECTED_SEGMENT` and then discarded, so the segment and its warning are both absent from the
emit), a doubled terminator outside a transaction, a missing final terminator, post-IEA
`trailingBytes`, and a TA1 that followed a functional group (emitted immediately after the ISA, so
reordered, though nothing is lost). The last five fire on inputs containing no line breaks, so a
compact file is not guaranteed to round-trip either; four of the six are silent, so a clean warnings
list is not evidence of byte-exactness; and `serializeX12(parseX12(source))` must not be used to
normalize before comparing warnings.

No behaviour changed. `KNOWN-LIMITATIONS.md` now holds the canonical list and the other sites link to
it, and the properties that hold are stated as measured over the committed corpus rather than as
universals:
across all 56 fixtures every emit is a fixed point and re-parses to an identical model with an
identical warning stream, the 14 with no line breaks return byte-identical (13 of those are
`golden/*.edi`, serializer output by construction), and the other 42 differ by line breaks and nothing
else. Tests now cover both the corpus sweep and the five cases the corpus does not contain.

Also newly disclosed rather than fixed: a segment outside a transaction is dropped from the model, so
a double-spaced file (`~\n\n`, which exceeds the one-CR-plus-one-LF tolerance) loses its entire
interchange body and parses to `groups: []`. Detectable on the first parse via
`X12_UNEXPECTED_SEGMENT`, but only there.

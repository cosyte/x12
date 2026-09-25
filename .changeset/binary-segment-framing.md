---
"@cosyte/x12": patch
---

A BDS or BIN segment's binary data is now framed by the octet count its length
element declares (BDS-02 / BIN-01) rather than by scanning for delimiters. Until
this release a BDS-03 or BIN-02 carrying the segment terminator ended the
segment inside the data, and one carrying the element or component separator
was split into elements and components, so an attachment came back as fragments
and every segment after it was mis-framed.

**What moves on the wire model.** The data element holds exactly the declared
octets, whatever delimiter, `?`, CR or LF bytes they include, and the segment is
one segment. `getSegmentValue`, `getAllSegmentValues` and `elementValue` return
that element verbatim, with no release unescape and no split. `serializeX12`
writes the segment back unchanged in both modes, and SE-01 counts it once.
Nothing inside the data is decoded: BDS-01's filter is not applied.

**Four new warning codes, additions only**, each anchored at the segment and
each built from the frozen registry, echoing no byte of the length or the data:

- `X12_BINARY_DATA_TRUNCATED`: the input ends inside the declared span. The
  data element holds only the octets present.
- `X12_BINARY_LENGTH_INVALID`: the length element is absent, empty, or not 1 to
  15 ASCII digits. No length is inferred; the segment is framed by its
  delimiters as any other segment is.
- `X12_BINARY_LENGTH_MISMATCH`: the byte after the declared span is not the
  segment terminator. The data element is the declared span, the bytes after it
  stay on the segment's `raw`, and the default emit reproduces the input.
- `X12_BINARY_LENGTH_UNVERIFIABLE`: a string input's span holds a character
  above U+00FF, so its octet count cannot be verified. A `Buffer` never raises
  it.

Their factories, `binaryDataTruncated`, `binaryLengthInvalid`,
`binaryLengthMismatch` and `binaryLengthUnverifiable`, take a position and
nothing else. The length element is never rewritten on emit, including where
it disagrees with the data. An interchange carrying no BDS or BIN parses and
serializes exactly as before.

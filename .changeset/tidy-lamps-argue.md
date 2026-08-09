---
"@cosyte/x12": patch
---

🩺 `buildInterchange` now release-escapes GS-04, GS-05 and GS-07, so the interchange it hands back
reports the group date, group time and responsible agency code you passed.

The builder mapped its escaper over GS-01, GS-02, GS-03, GS-06 and GS-08 and wrote `groupDate`,
`groupTime` and `responsibleAgencyCode` raw, and it returns `parseX12` of the bytes it just wrote, so
a value carrying an active delimiter in one of those three took a slot of its own and shifted every
element after it down one, inside a single call. Measured on one group with
`versionRelease: "005010X222A2"` and `groupControlNumber: "1"`:

| spec field                     | read GS-06 | read GS-08 | warnings                                                |
| ------------------------------ | ---------- | ---------- | ------------------------------------------------------- |
| `groupDate: "2026*0601"`       | `"1200"`   | `"X"`      | `X12_CONTROL_NUMBER_MISMATCH`                           |
| `groupTime: "12*00"`           | `"00"`     | `"X"`      | `X12_CONTROL_NUMBER_MISMATCH`                           |
| `responsibleAgencyCode: "X*Y"` | `"1"`      | `"Y"`      | none                                                    |
| `groupTime: "12~00"`           | absent     | absent     | `X12_UNEXPECTED_SEGMENT`, `X12_CONTROL_NUMBER_MISMATCH` |
| `groupDate: "20260601?"`       | `"X"`      | absent     | `X12_CONTROL_NUMBER_MISMATCH`                           |

🩺 The `responsibleAgencyCode` row is the one to know about, because nothing was raised on any
channel: GS-06 kept its own slot and still reconciled against GE-02, and what moved was GS-08, the
version / release / industry identifier code. All five rows now read the values the caller passed,
with an empty warning array.

The grounding is inside this package rather than in a spec clause: one function disagreed with
itself, and all seven domain builders already released these same three slots through their own
escaper.

🛑 It changes bytes this library already put on the wire, and that is the cost. A value containing
none of the four delimiters and no `?` is emitted byte-for-byte as before, which is every conformant
GS-04 / GS-05 / GS-07. No warning code is added and no case moves onto a new code. Read the property
rather than a direction list: the interchange the call returns now reports the values the caller
passed, where before it reported whatever the shift left in each slot. What is narrower here than in
the two release-escaping fixes before it: no reader moved. The parser is untouched, so an inbound
document decodes exactly as it did at `0.0.15`.

Only `*` and `~` ever shifted the segment's own framing, plus a `?` immediately before the separator.
`^` and `:` moved the dot-path reader instead, and releasing them is a gain there: `getSegmentValue`
answered `"X"` for a GS-07 of `"X^Y"`, truncating to repetition 0. The measured cost is a mid-string
`?`, and only on the surfaces documented as raw: `gs.elements[4]` reads `"2026??0601"` where it read
`"2026?0601"`, while the dot-path read of that value unescapes and is unchanged. No total is
published. A caller who was pre-releasing these values themselves is now escaping twice and should
drop the hand-rolled escape.

A wrong-typed GS element still names its slot. The type check runs over the unescaped parts, so a
numeric `groupDate` refuses with `buildInterchange: "GS"-04 must be a string` rather than degrading
to the builder-named message the escaper alone would produce, and the five slots that already escaped
gained the slot name with it. Same class, same `X12_BUILD_INVALID_SPEC`, still no echo of the value.
`null` and `undefined` in these three fields are absent, not refused: each resolves through a default
before either guard sees it.

What this does not close: `buildInterchange`'s IEA-02 is padded rather than escaped and has to stay
byte-equal to the fixed-width ISA-13 it reconciles against, so that is a decision of its own; the ISA
fixed-width slots remain outside both guards; and an unescaped active delimiter is still not safe
anywhere, because that is what a delimiter is.

---
"@cosyte/x12": patch
---

Eleven JSDoc pointers that sent a consumer to an envelope `elements[n]` for a value are deleted
(`X12-ENVELOPE-VALUE-POINTERS`). **Documentation only: the diff is comment-only and the emitted JS is
byte-identical, so no behaviour changed.**

`X12_CONTROL_NUMBER_MISMATCH`'s JSDoc told you to read `isa.elements[13]`, `iea.elements[2]`,
`gs.elements[6]`, `ge.elements[2]`, `st.elements[2]` and `se.elements[2]` "off the model when you need
the values". Envelope element values are stored RAW, pre-`?`-unescape, so on a document whose control
number carries a release escape those reads hand back the framed bytes and not the value:

```text
pointer              raw               value
iea.elements[2]      "0000?*001"       "0000*001"
gs.elements[6]       "000?*99"         "000*99"
ge.elements[2]       "000?*99"         "000*99"
st.elements[2]       "000?*11"         "000*11"
se.elements[2]       "000?*11"         "000*11"
```

The same shape sat in `X12_GROUP_COUNT_MISMATCH`'s and `X12_TRANSACTION_COUNT_MISMATCH`'s "both
numbers stay on the model (`iea.elements[1]` …)" parentheticals, and in `serializeX12`'s module doc,
which named three more. All of those are **deleted**; nothing was added to make one true, and no
accessor, guard or test assertion was minted. The surviving sentences still say the bytes stay on the
model, which is true.

Pointers that **label** their surface as raw are correct and are untouched: `raw.elements[5]` "is the
byte surface", `gs.elements[8]` gets "the sender's bytes rather than a normalization",
`seg.elements[0]` stays "verbatim".

**This does not bound the class.** `src/parser/types.ts` still names `iea.elements[2]`,
`gs.elements[6]`, `ge.elements[2]` and `ta1.elements[1]` for values in the `@example` blocks of the
envelope types, with no raw label; those are unchanged here and filed. `ta1.elements[1]` is the one to
know about: TA1-01 is the reassociation key, so a consumer following that example compares framed
bytes to the ISA-13 it acknowledges.

Two more pre-existing limits, unchanged and filed. **`getSegmentValue` cannot read an envelope
segment**: it takes an `X12Segment`, which requires `id`, and `IsaSegment`, `IeaSegment`, `GsSegment`,
`GeSegment`, `Ta1Segment` and the ST/SE types declare only `raw` and `elements`, so passing one is a
`TS2345`. `unescapeRelease` on the element string is the route. And **the ISA element split has no
arity check**: `decodeIsa` splits on the element separator, so an ISA-13 carrying a raw separator
yields 18 elements where 17 are documented and silently re-indexes ISA-14/15/16.

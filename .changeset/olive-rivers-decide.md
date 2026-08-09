---
"@cosyte/x12": patch
---

Nine documentation carriers that told you to read an envelope element's logical value through
`getSegmentValue` are corrected (`X12-ENVELOPE-VALUE-ROUTES`). **Documentation and tests only: no
runtime line changed and the emitted JS is byte-identical, so no behaviour moved.**

`getSegmentValue` takes an `X12Segment`, which requires `id`. `IsaSegment`, `IeaSegment`,
`GsSegment`, `GeSegment`, `Ta1Segment` and the inline ST/SE types on `X12TransactionSet` declare only
`raw` and `elements`, so passing any one of them is `TS2345`, "Property 'id' is missing". Filed as one
type and two prescriptions; measured as **seven types and nine prescriptions in six files**, including
`KNOWN-LIMITATIONS.md`'s *"Read through `getSegmentValue` if you want the logical value"* for a `gs`.

**Two routes reach the decoded text, both were already published in this package, and neither is
universal.** `unescapeRelease` on the element string is a public export. Adding an `id` and taking the
dot-path is what `buildTA1`'s own JSDoc prescribes ("add one to read a TA1 through it") and what this
repo's tests do. They are not interchangeable:

```text
element                     raw            unescapeRelease   add id + dot-path   transmitted
GS-04, a released `*`       "2026?*0601"   "2026*0601"       "2026*0601"         "2026*0601"
GS-07, a REAL repetition    "A^B"          "A^B"             "A"                 "A^B"
TA1-01, a released `^`      "0000?^0001"   "0000^0001"       "0000^0001"         "0000^0001"
```

Every row `warnings: []`. A bare dot-path means repetition 0, which is why the GS-07 row differs.

**The public signature was NOT widened, and that was the decision rather than the cheap way out.**
`getSegmentValue`'s body never reads `id`, so widening its parameter to an `elements`-only structural
type is free, non-breaking and emits nothing. It was refused because the function unescapes
unconditionally while the ISA is positional, where a `?` is content and never an escape. Widening
admits `IsaSegment` and makes a silently wrong read of ISA-13, the reassociation key, compile:

```text
transmitted ISA-13   arity   elements[13]   decoded (both routes)   elements[16]
"000000??1"          17      "000000??1"    "000000?1"              ":"
"0000?*001"          18      "0000?"        "0000?"                 "P"
"00000001?"          17      "00000001?"    "00000001?"             ":"
```

No route reads an ISA element correctly across those rows. On the middle one `decodeIsa` split on the
element separator, so `elements[13]` is a prefix and ISA-16 re-indexed onto ISA-15's value. **So no
route is prescribed for the ISA at all**, and the missing arity check on that split is filed rather
than fixed here. A capability that is right on six envelope types and silently wrong on the seventh is
not an ergonomic win, so the claim was cut instead and no code grew.

`test/parser-envelope-value-routes.test.ts` pins all of it. Seven `@ts-expect-error` assertions cover
the seven types, and `typecheck` runs over `test/`, so **they red if the signature is ever widened**:
widening is not forbidden, it is made loud, because the assertions have to be deleted and that is
where the ISA question gets answered. Under a mutation that widens the signature the file reports
seven unused directives, not one, which is what distinguishes it from a green vacuous test.

Two earlier statements are deleted rather than reworded, because both are measured false. *"There is
no decoded read for an envelope element; `unescapeRelease` on the string is the only route"*: there
are two, and the second is prescribed inside this package. *"A raw-vs-`unescapeRelease` cell on the
ISA is a tautology that detects nothing"*: `unescapeRelease` does not know the ISA is exempt, so on
`"000000??1"` the cell differs.

Unchanged and filed: `parse-ta1.ts` and `KNOWN-LIMITATIONS.md` still mis-cite `X12Segment.elements`
for types that are not one. That statement is true where these were false, and it has a twin, so it
stays its own slice. `docs-content`'s dot-path example is scoped to body segments and was already
correct.

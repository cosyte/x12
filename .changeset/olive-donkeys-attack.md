---
"@cosyte/x12": patch
---

`IsaSegment` and the `X12_PRE_005010` warning factory no longer document a raw ISA element as the
value it holds (`X12-ISA-VALUE-POINTERS`). Documentation only: the diff is comment-only and
`dist/index.mjs` / `dist/index.cjs` are byte-identical before and after, so no behaviour moved. The
corrected text ships in `dist/index.d.ts` and `dist/index.d.cts`.

`isa.elements` holds raw byte text. `IsaSegment` called it "the 16 ISA values" and its `@example`
handed out `isa.elements[12]` as "ISA-12 - version, expected 00501" and `isa.elements[13]` as
"ISA-13 - interchange control number", while `pre005010`'s JSDoc said the declared version stays on
`isa.elements[12]`. On an interchange whose ISA-06 carries the element separator, ISA-12 declares
`00501` at its own fixed offset, `X12_PRE_005010` fires anyway, and `elements[12]` answers `"^"`.

Two mechanisms falsify such a cell on their own: fixed-width padding, which needs no release
character and no anomaly, and the arity displacement `X12_ISA_EXTRA_ELEMENT_SEPARATOR` reports. No
mechanism is named as the reason, the set of them is not published as closed, and nothing says which
ISA element is special.

The `pre005010` pointer is deleted outright. `IsaSegment` gains the raw label, keeps ISA-12's and
ISA-13's semantics restated at segment level, and its `@example` keeps one indexed pointer plus
`.raw`, the shape the four sibling envelope types already carry. The label is deliberately not the
siblings' label, whose "pre-`?`-unescape" clause is false on the ISA. The 1-indexed mapping onto
ISA-01..ISA-16 is scoped to a 17-entry split rather than deleted, and no shift is quantified.

`WARNING_MESSAGES.X12_PRE_005010` is untouched: it carries the same overclaim at run time, it
reproduces on the base, and a runtime message is a different carrier from a comment.

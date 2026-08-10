---
"@cosyte/x12": patch
---

Documentation: `IeaSegment`, `GsSegment`, `GeSegment`, `Ta1Segment` and `X12FunctionalGroup` no
longer document a raw envelope element as the value it holds (`X12-ENVELOPE-VALUE-EXAMPLES`).

Element values on those segment types are stored RAW, pre-`?`-unescape. Their JSDoc named the index
and then named the value it holds, and repeated the promise inside an `@example` fence, which is the
form a consumer copies. Measured on one interchange where each documented non-ISA slot carries the
sender-intended value `A*B`, written on the wire in released form `A?*B`, every one of those cells
reads back `"A?*B"` and not `"A*B"`. The same correction is applied to `parseX12`'s own `@example`,
which handed out `// "HC"` at `gs.elements[1]`.

TA1-01 is the reassociation key, so a consumer following the shipped `@example` compared framed
bytes against the ISA-13 it was acknowledging, while `parseTA1` read the same bytes correctly. On a
TA1 round trip through `buildTA1` and `parseX12`, five of six stated control numbers came back from
`elements[1]` matching no ISA-13, every row `warnings: []`.

Each block now carries the label `X12Segment` has always carried, and the `@example` pointers keep
their index and lose the promise. The slot mapping was true and is kept, and so are the element
names, the formats and the code-list citations, restated as facts about the segment's fields rather
than about a raw element. The `IsaSegment` block is deliberately unchanged, and no rule about the
ISA is stated in either direction.

Documentation only. The diff is comment-only and `dist/index.mjs` and `dist/index.cjs` are
byte-identical before and after, so no behaviour moved. The corrected text ships in
`dist/index.d.ts`.

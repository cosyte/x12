---
"@cosyte/x12": patch
---

🩺 A release-escaped delimiter inside an envelope segment no longer splits it and no longer shifts
every element after it (`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`).

The splitter for `GS` / `GE` / `ST` / `SE` / `IEA` / `TA1` was a plain `String.prototype.split` on
the element separator, so a `?*` ended the element anyway and everything after it moved down a slot:
an `applicationSenderCode` of `SEND*ER` made GS-08 read `"X"`, the GS-07 responsible agency code,
with `warnings: []`. Nothing clinical or monetary was ever mis-read by this, because the body
splitter was already release-aware and the blast radius was envelope framing. What made it a defect
rather than a tolerance is that this package's own two halves disagreed inside a single call:
`buildInterchange` release-escapes GS-02 / GS-03 / GS-06 / GS-08 and ST-01 / ST-02 / ST-03 on emit,
then returns `parseX12` of the bytes it just wrote.

**This changes how already-published documents decode, and the class it changes is exactly one:** an
envelope segment carrying a `?` immediately before the element separator. Every other release
sequence in an envelope element (`??`, `?:`, `?^`, `?~`, `?A`) framed identically before and after
and still does. **No warning code is added.** One can stop firing: where the shift displaced a
control number, `X12_CONTROL_NUMBER_MISMATCH` was raised against a document whose control numbers
always did agree, so a consumer that rejects on that code will accept such a document from this
release on. A genuine mismatch still raises it.

Values are still RAW, pre-`?`-unescape, exactly as `X12Segment.elements` has always documented, so
`elements.join(separator)` still reproduces the segment byte for byte and `serializeX12`'s count
substitution is unaffected. The ISA is deliberately exempt and stays positional, because ASC X12 .5
makes it fixed-width and a `?` in an ISA element is content; a degenerate delimiter set whose
element separator IS `?` also falls back to the literal split.

An unescaped delimiter is still not safe and nothing here claims otherwise. `build837`'s
`implementationConventionReference` still refuses a value carrying one, deliberately not relaxed on
the strength of this fix. Measured in `KNOWN-LIMITATIONS.md`.

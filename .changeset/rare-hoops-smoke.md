---
"@cosyte/x12": patch
---

🩺 A `?` immediately before the element separator inside an envelope segment now frames as ONE
element (`X12-ENVELOPE-SPLITTER-NOT-RELEASE-AWARE`).

The splitter for `GS` / `GE` / `ST` / `SE` / `IEA` / `TA1` was a plain `String.prototype.split` on
the element separator, so a released separator still ended the element and shifted every element
after it down a slot: an `applicationSenderCode` of `SEND*ER` made GS-08 read `"X"`, the GS-07
responsible agency code, with `warnings: []`. What made it a defect rather than a tolerance is that
this package's own two halves disagreed inside a single call: `buildInterchange` release-escapes
GS-02 / GS-03 / GS-06 / GS-08 and ST-01 / ST-02 / ST-03 on emit, then returns `parseX12` of the
bytes it just wrote.

**🛑 Read the change as SYMMETRIC. It is not only a correction.** A `?` before the separator has two
readings and 005010 does not transmit which the sender meant. Where the sender escaped a delimiter,
the previous release framed it wrongly and this one frames it correctly. Where the sender sent a
literal `?` as the element's last byte, the previous release framed it correctly and this one merges
the element with its successor, so the segment loses its last element:
`GS*HC*SUB1*RCV?*20260601*1200*000000123*X*005010X222A1~` read nine entries and reads eight here,
GS-06 answering `"X"` and GS-08 gone. Every other release sequence in an envelope element (`??`,
`?:`, `?^`, `?~`, `?A`) framed identically before and after and still does.

**No warning code is added, and `X12_CONTROL_NUMBER_MISMATCH` moves in both directions:** it stops
firing where the old shift displaced a control number, and starts firing where a literal `?` newly
displaces one, so a consumer that rejects on that code will accept some documents it rejected and
reject some it accepted. The regression direction reaches an 837's variant and its money by one
route: an `ST-02` ending in a literal `?` destroys `ST-03`, the document falls back to the `SVx`
scan, and a service line that read `charge` `undefined` with `X12_837_SERVICE_LINE_NOT_DECODED` can
now decode an amount with that warning silent. Re-check any routing driven off
`submission.variant`.

It was taken anyway for consistency rather than a spec clause: `decodeSegment` has read body
elements the escape-wins way on every released version, and this library escapes a literal `?` as
`??` on emit, so its own output is unaffected and the exposure is inbound partner bytes only.

Values are still RAW, pre-`?`-unescape, so `elements.join(separator)` still reproduces the segment
byte for byte and `serializeX12`'s count substitution is unaffected. The ISA is deliberately exempt
and stays positional, because ASC X12 .5 makes it fixed-width; a degenerate delimiter set whose
element separator IS `?` also falls back to the literal split. `build837`'s
`implementationConventionReference` still refuses a value carrying an active delimiter or the
release character, deliberately not relaxed. Measured in `KNOWN-LIMITATIONS.md`.

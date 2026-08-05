---
"@cosyte/x12": patch
---

An 837 service line whose `SVx` never decoded no longer reads `0` / `0` in silence
(`X12-837-SV-SILENT-ZERO`).

`get837Claims` resolves ONE variant for the whole submission, from the caller's `type` option, else
ST-03's implementation-convention reference, else the first `SVx` segment present. `openServiceLine`
then seeds a Loop 2400 line's `charge` and `units` at `X12Decimal.ZERO`, and `decodeSv1` /
`decodeSv2` / `decodeSv3` each **return before reading anything** when the line's variant is not
theirs. So an `SV2` line on a submission that resolved to Professional read back as a `$0.00` charge
for `0` units, with `warnings: []` and every other field on the service segment (procedure code,
modifiers, unit of measure, place of service) equally undecoded. A line with no `SVx` at all did the
same. **This is a fabricated amount presented as read**, the same harm class the
`X12_UNPARSEABLE_DECIMAL` change closes at the element level, and it was the residual that change
disclosed rather than fixed.

Measured against `d8b5085` on the committed 837 fixtures: a conformant 837I whose ST-03 is flipped to
`005010X222A2` read back `charge` `0` / `units` `0` on both service lines with `warnings: []`, where
the same bytes read with their own variant give `1500` / `1`. Three further probes were equally
silent at base: the same file read with `{ type: "P" }`, an `LX` carrying no `SVx` at all, and the
837D fixture read with `{ type: "I" }`. All four now warn; the two honest controls (837P and 837I
read as themselves) stay silent, which is what makes the warning rare enough to gate on.

New Tier-2 code **`X12_837_SERVICE_LINE_NOT_DECODED`** (the 24th; the registry is additions-only),
with the public factory `serviceLineNotDecoded(position)`. `position.segmentIndex` names the `LX`
that opened the line rather than the `SVx`, because the no-`SVx`-at-all case has no `SVx` to point
at. One warning per undecoded line; lines that decoded are silent.

**Not decoding the foreign `SVx` remains correct and is not what changed.** `SV1-02` and `SV2-03` are
both the line charge, so reading an `SV2` into a Professional-shaped line would mis-read money rather
than fail to read it. Refusing to read is the safe half. Doing it without saying so was the defect.

**What did NOT change, deliberately.** The model is untouched: `charge` and `units` are still typed
`X12Decimal` and still read `0` on such a line, so a consumer that never looks at `.warnings` sees
exactly what it saw before. Making those slots `X12Decimal | undefined` is a breaking model change
that ripples into `balance.ts` and every builder, and it stays its own slice. No control flow changed
either: the line is still retained on the claim, the resolved variant still wins over a disagreeing
`SVx`, and every segment stays verbatim on `tx.segments`. A variant that resolves to nothing at all
is still the separate `X12_837_UNKNOWN_VARIANT` case, where no line is opened and no `0` is
fabricated; `KNOWN-LIMITATIONS.md` says how far that second case reaches, because an ST-03 that
collides with an inherited object key resolves to something and is not covered by it.

The message is a frozen-registry lookup like every other warning here and never quotes the segment it
refused to decode, which on a real 837 carries the procedure billed for a named patient. That is
asserted directly, and the ignored segment is now a slot in the PHI sweep.

---
"@cosyte/x12": patch
---

Added: `X12_ISA_EXTRA_ELEMENT_SEPARATOR`, the arity check the ISA element split never had
(`X12-ISA-ELEMENT-ARITY`). Additions-only. No decoding moved, no existing warning was suppressed or
narrowed, and nothing is re-framed.

`decodeIsa` splits the 105-byte ISA element area on the element separator, and its comment asserted
that this yields "exactly 17 entries by construction". The guard it cited verifies the separator at
all 16 fixed 005010 positions, which bounds the split from BELOW - it can never come out short - and
never bounded it from above. An ISA element value carrying that same byte splits again, so that
element comes back a prefix and everything after it is displaced. `isa.elements.length` is the only
measure of how far, and more than one element can do it: two such elements displace by two.

Planting the element separator inside each of the 16 fixed elements of one conformant interchange,
measured at `0.0.16`: ISA-01 through ISA-10 and ISA-12 split into 18 parts and warned
`X12_PRE_005010` plus `X12_CONTROL_NUMBER_MISMATCH`; ISA-13 split into 18 and warned
`X12_CONTROL_NUMBER_MISMATCH`; ISA-14 and ISA-15 split into 18 and warned nothing at all; ISA-11 and
ISA-16 ARE the in-band repetition and component separator declarations, so the plant collides with
them and the Tier-3 `X12_INVALID_DELIMITERS` refusal reaches it first, which is a boundary of the
probe rather than a property of those two elements.

On the rows that did warn, the warning named the wrong thing: the document declares `00501` at
ISA-12's own fixed offset and `X12_PRE_005010` fired anyway, `elements[13]` (the interchange control
number, the reassociation key) answered `"00501"`, and `elements[15]` (the test/production usage
indicator) answered `"0"` on a document whose ISA-15 says `P`.

`parseX12` raises the new warning before the ISA-derived checks that read `elements[12]` and
`elements[13]` by index, so `{ strict: true }` escalates on it rather than on a displaced-value
warning. That is a statement about `ix.warnings` and `onWarning` only: `serializeX12(ix,
{ specClean: true })` reconciles ISA-13 against IEA-02 off `isa.elements[13]` with no arity awareness
and never raises this code, so its absence there is not evidence the header framed. Pre-existing,
disclosed, not fixed.

It is a report, not a repair. A byte that is both an element's content under the ISA's fixed widths
and the separator that same segment declares in-band has two readings; the interchange is not
005010-conformant either way and nothing anyone here has read settles which reading to take, so
`isa.elements` is left exactly as the split produced it and `isa.raw` still carries all 106 bytes,
which is the route back.

The emit side is untouched and this is not a build-side guard: the fixed-width ISA slots go through
`pad` / `padControl` and never through the caller escaper, so `buildInterchange` still writes such a
value onto the wire. It does now surface there, because `buildInterchange` returns `parseX12` of the
bytes it just wrote - `interchangeControlNumber: "0000*0001"` came back with ISA-13 reading `"0000"`,
ISA-15 reading `"0"` instead of `"P"`, IEA-02 displaced the same way so the control-number
reconciliation agreed with the misreading, and `warnings: []`.

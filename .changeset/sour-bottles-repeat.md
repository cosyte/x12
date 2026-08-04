---
"@cosyte/x12": patch
---

Correct the 835 Loop 2110 SVC element map, in both directions
(`X12-SVC-ELEMENT-MAP-OFF-BY-ONE`).

Through `0.0.9` `get835` read `revenueCode` from **SVC-05** and `paidUnitsOfService` from **SVC-07**,
and `build835` wrote them to those same two positions while hard-coding SVC-04 empty behind a comment
asserting "revenue code is SVC-05 in X221A1; SVC-04 unused". That comment was wrong. SVC-04 is the
NUBC revenue code (X12 element 234, a string), SVC-05 is the Units of Service **Paid** Count (element
380, a Quantity), and SVC-07 is the **Original** Units of Service Count - a different quantity, sent
only when the submitted count differs from the paid one.

`revenueCode` now reads and writes SVC-04; `paidUnitsOfService` now reads and writes SVC-05; and
`originalUnitsOfService` is new on both `X12RemitServiceLine` and `Build835ServiceLineSpec`, carrying
SVC-07. The new field is required rather than convenient: without it the corrected map would have
left SVC-07 unread, turning a fixed mis-read into a fresh silent drop.

The harm was a mis-read code system and a mis-read quantity, silently, in both directions. Across the
six committed remit fixtures plus the golden, 8 of 8 service lines read back `revenueCode: "1"` at
`0.0.9` - not a valid NUBC revenue code, but the paid-unit count from SVC-05 - while
`paidUnitsOfService` came back `undefined`. On emit, a line with revenue code `0300` and 2 paid units
produced `SVC*HC:99213*600.00*550.00**0300*HC:99212*2`, putting a revenue code into a Quantity
element, so a conformant receiver read `0300` as 300 units of service. It now produces
`SVC*HC:99213*600.00*550.00*0300*2*HC:99212`.

If you compensated for the old behaviour - reading the paid count off `revenueCode`, or writing the
revenue code into `paidUnitsOfService` - remove that workaround. Callers that only round-tripped
through this library saw nothing wrong, because both halves were wrong together, which is also why
the suite never caught it: every existing assertion was a `build835` -> `get835` round trip, green
for any pair of positions the two modules agreed on. The map is now pinned against literal bytes.

An absent SVC-05 is still not defaulted to one, though X221A1 is reported to assume it is one
(secondhand, via X12's RFI #2163 - nobody here has read the TR3, which is a paid document).
Fabricating a count the sender did not send is inventing data. Note that `undefined` on either
quantity means "not decoded" rather than "absent": the element may also have been present and
unparseable, which is pre-existing behaviour at every quantity site and raises no warning.

The map is grounded on publicly checkable sources rather than on this repo's own 277 modules, which
would only prove the two agree: pyx12's machine-readable `835.5010.X221.A1.xml`, which carries the
whole table including SVC-04; X12's RFI #2163 for SVC-05; the base 005010 element dictionary, where
SVC-04 is a string and SVC-05/07 are Quantities; and two published payer companion guides. They are
listed with links in `KNOWN-LIMITATIONS.md`.

If you archived 835s this library EMITTED at 0.0.9 or earlier, they are non-conformant on the wire
and should be re-emitted: their revenue code sits in SVC-05, so this release reads it back as a paid
quantity and reports no revenue code.

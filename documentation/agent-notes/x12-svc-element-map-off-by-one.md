# `X12-SVC-ELEMENT-MAP-OFF-BY-ONE` (2026-08-04)

**RELOCATED IN FULL from `CLAUDE.md` 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-EMIT-DEGENERATE-RELEASE-DELIMITER` trap, under that file's own ratchet (relocate first, lower
the entry as the relocation lands, never raise it to meet the trap).

The measurement, the sources and the refutation history are in
`documentation/agent-notes.md#x12-svc-element-map-off-by-one-2026-08-04`. What follows are the
imperatives, exactly as they stood in `CLAUDE.md`.

- **🩺 The 835 SVC map is `revenueCode` -> SVC-04 (element 234, the NUBC revenue code, a **string**),
  `paidUnitsOfService` -> SVC-05 (element 380, Units of Service **PAID** Count) and
  `originalUnitsOfService` -> SVC-07 (element 380, **ORIGINAL** Units of Service Count). Never move
  them back.**
- **Never fix a mis-read position while leaving its sibling element unread** - that turns a mis-read
  into a **fresh silent drop**. **Retention is non-decreasing, on purpose.**
- **🩺 A round trip cannot test an element map; only bytes can** - it is green for ANY pair of
  positions the two modules agree on. `test/transactions-remit-835-svc-element-map.test.ts` pins the
  map literally. **Never weaken those to round trips.**
- **🩺 Checking a spec claim against this repo's own implementation is NOT a check** - it only proves
  the two agree, which is exactly how the wrong map survived. Ground an element number OUTSIDE the
  repo (sources in `KNOWN-LIMITATIONS.md`). **TR3 005010X221A1 is paid for and nobody here has read
  it.**
- **Never default an absent SVC-05 to one.** X221A1 is _reported_ to assume one, secondhand and from
  no clause anyone here read. Fabricating a count is inventing.
- **`undefined` still means "not decoded", not "absent"** - the next trap says what tells them apart.
- **🩺 835s this library emitted at `0.0.9` or earlier are non-conformant and should be re-emitted**
  (the mechanism: relocated narrative §8).

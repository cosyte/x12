---
"@cosyte/x12": patch
---

🩺 A repeated `NM1*87` inside one 837 Loop 2000A no longer fuses two pay-to addresses into one, and
the universal about a stray `LX` is cut back where it survived in `src/` comments and 837 test-file
headers (`X12-837-LOOP-RESIDUALS`).

**The pay-to address.** `NM1*87` names the pay-to address with no entity object to hold it:
`X12Claim.payToAddress` is a bare address accumulator. A route that assigns a fresh entity leaves
the trailing `N3` / `N4` no address on the new object to write onto, so their write replaces; these
two arms instead wrote onto whatever the previous `NM1*87` had left, the line collector **appending**
and the `N4` merge falling back. Measured at `0.0.11`, the current release as this was written: a
document naming two pay-to addresses in one Loop 2000A read back one address carrying **a street
line from each**, and a `countryCode` off the FIRST address's `N4` on a second address whose own `N4`
names no country. That is an address no sender sent, on a claim, and on the model it is
indistinguishable from one that was.

The first `N3` / `N4` after an `NM1*87` now starts from an empty address, so it **REPLACES** what an
earlier `NM1*87` in the same Loop 2000A left, and every write after it appends, exactly as two `N3`s
under one `NM1` do for any party. **Where that fires is the design.** Clearing the slot at the
`NM1*87` itself was the first remedy and is measurably worse: on a repeat carrying no `N3` / `N4` of
its own it erases the address the document DID state, and since `build837P/I/D` emits Loop 2010AB
only where the slot is defined, that erasure re-emits as **no pay-to loop at all** rather than as a
missing value. The accumulator moves only when a segment gives it one.

🩺 **This is not the entity parties' rule and must not be restated as one.** A repeated `NM1*PR` with
no `N3` leaves a payer object whose `address` is `undefined`; the pay-to slot has no object, so on it
"address unknown" and "no pay-to loop" are the same value. Bounds, each a committed test: two `N3`s
under one `NM1*87` still append, a single `NM1*87` is unchanged, an `N4` alone after a repeat
replaces the whole address, a repeat carrying only a `PER` moves nothing, and a new Loop 2000A `HL`
already cleared the accumulator. **No warning code was added and the repeat stays silent**, as every
other repeated party is at this reader; that silence is disclosed, not claimed closed. No warning
code, warning message, model shape or public type changed.

**The wording.** The release before this one deleted, from the documents this package publishes, a
universal reading that all four of `N3` / `N4` / `PER` / `REF` reached every party, and disclosed
that the same wording still stood in `src/` comments and 837 test-file headers. Each surviving copy
now takes the qualifier already graded on the shipped surfaces, "wherever this reader surfaces that
segment kind on that party at all", or is cut back to the measured instance beside it and that
instance is named. No copy is given a new wording, **no per-kind, per-party map is published**, and
the identically-scoped paragraphs that are not copies of it are deliberately left alone. Nothing a
consumer reads at runtime changed: neither the warning registry nor any `docs-content/` page nor the
README carried it.

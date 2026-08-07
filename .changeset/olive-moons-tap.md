---
"@cosyte/x12": patch
---

🩺 A repeated `NM1*87` inside one 837 Loop 2000A no longer fuses two pay-to addresses into one, and
the universal about a stray `LX` is cut back in the last two places it survived
(`X12-837-LOOP-RESIDUALS`).

**The pay-to address.** `NM1*87` was the one route in the walker's `NM1` case that named a party
without assigning that party's accumulator. Every other route replaces its entity there, so the
`N3` / `N4` that follow a repeated `NM1` write onto an empty address; `payToAddress` has no entity
object behind it, so a second `NM1*87` left the first one's value in place for the line collector to
**append** to and for the `N4` merge to fall back on. Measured at `0.0.11`, the current release as
this was written: a document naming two pay-to addresses in one Loop 2000A read back one address
carrying **a street line from each**, and a `countryCode` off the FIRST address's `N4` on a second
address whose own `N4` names no country. That is an address no sender sent, on a claim, and on the
model it is indistinguishable from one that was.

The later `NM1*87` now **REPLACES** the earlier, exactly as a repeated `NM1` replaces any other
party. A repeat carrying no `N3` / `N4` of its own therefore leaves `X12Claim.payToAddress`
**`undefined`** rather than the earlier address; holding the earlier one would put the first party's
street under the second party's name, which is the same fabrication one size smaller. The replaced
address reaches no other slot and its bytes stay verbatim on `tx.segments`. Two `N3`s under ONE
`NM1*87` still append, a single `NM1*87` is unchanged, and a new Loop 2000A `HL` already cleared the
accumulator - each a committed control. **No warning code was added and the repeat stays silent**,
because replacement warns for no party at this reader; that silence is disclosed, not claimed
closed. No warning code, warning message, model shape or public type changed.
`KNOWN-LIMITATIONS.md` records the version boundary for a consumer on `0.0.11`.

**The wording.** The release before this one deleted, from the documents this package publishes, a
universal reading that all four of `N3` / `N4` / `PER` / `REF` reached every party, and disclosed
that the same wording still stood in `src/` comments and 837 test-file headers. This is the rest of
that sweep. Each surviving copy takes the qualifier already graded on the shipped surfaces,
"wherever this reader surfaces that segment kind on that party at all", or is cut back to the
measured instance beside it, which is a payer in every case. No copy is given a new wording, **no
per-kind, per-party map is published**, and the identically-scoped paragraphs that are not copies of
it are deliberately left alone. Nothing a consumer reads at runtime changed: neither the warning
registry nor any `docs-content/` page nor the README carried it.

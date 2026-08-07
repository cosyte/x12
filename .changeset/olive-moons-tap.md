---
"@cosyte/x12": patch
---

The universal about a stray 837 `LX` is cut back where it survived in `src/` comments and 837
test-file headers (`X12-837-LOOP-RESIDUALS`). Documentation only: no code, type, warning code,
warning message or model shape changed, and the executable behaviour of the swept comments is nil.

The release before this one deleted, from the documents this package publishes, a universal reading
that all four of `N3` / `N4` / `PER` / `REF` reached every party through `0.0.10`, and disclosed
rather than claimed closed that the same wording still stood in `src/` comments and 837 test-file
headers. This is the rest of that sweep. **No count and no completeness claim is published**, because
both went stale here before: the sites swept are the `NM1` and `LX` case comments in
`src/transactions/claim/get-837.ts`, and the headers, section comments and case titles of
`test/transactions-claim-837-loop-residuals.test.ts`,
`test/transactions-claim-837-discard-after-stray-lx.test.ts` and
`test/transactions-claim-837-variant-lookup.test.ts`. Each said a trailing `N3` / `N4` / `PER` /
`REF` "attached to" or "landed on" whichever party the last `NM1` left active, or that a party named
after the `LX` "is addressable again", all of which read as all four kinds reaching every party. They
do not: this reader does not surface every one of those kinds on every party. Each copy takes the
qualifier already graded on the shipped surfaces, "wherever this reader surfaces that segment kind on
that party at all", or is cut back to the measured instance beside it and that instance is named, a
payer in every case but one, where it is a Loop 2320 other subscriber. No copy is given a new wording
and **no per-kind, per-party map is published.** Counterfactual headings lose the counterfactual only.
The paragraphs that are not copies of the universal, because they are scoped by "every trailing
segment that attaches to a named party", are deliberately left alone.

🩺 **The pay-to-address half of the same item was cut back out of this change and is still open.** A
repeated non-conformant `NM1*87` inside one Loop 2000A still fuses two pay-to addresses into one, at
`0.0.11` and here. Two remedies were built and both were refuted for moving the loss rather than
removing it, so the slice is cut back rather than given a third. The constraint the next attempt
starts from: `build837P/I/D` emits Loop 2010AB only where the slot is defined, and `emitAddress`
emits `N3` only for a non-empty `lines` and `N4` only for a defined field, so a remedy that can
empty the slot re-emits as no pay-to loop at all and one that can half-empty it re-emits a bare
`NM1*87` with neither. The emit side is in scope for that fix from the start.

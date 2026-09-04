---
"@cosyte/x12": minor
---

A new package-root export, `X12_TR3_CONFORMANCE`, states which implementation
guide this library implements for each transaction it reads or builds, and how
that identifier stands against the federal incorporation by reference at
45 CFR 162.920. It changes no parse and no emit behaviour: nothing about what
this package decodes or writes moves with it.

**What a consumer can now assert on.** One frozen array of rows, each carrying
the transaction set number as this package's own export names spell it, the
variant where a transaction has more than one document (`P` / `I` / `D`,
`277CA`, the 278 `request` and `response`), the identifier implemented with its
errata suffix, the directions actually implemented, an `adoption` of
`incorporated-by-reference`, `errata-in-practice` or `not-adopted`, the
identifiers 45 CFR 162.920 names for that transaction, and a note where the row
is not the simple case. `X12Tr3Conformance`, `X12Tr3Direction` and
`X12Tr3Adoption` are exported alongside it, from the package entry point, with
no subpath import.

**The identifiers come from the regulation, not from prose.** Every
`cfrAdopted` value is read from the official Government Publishing Office XML
of 45 CFR 162.920, title 45 volume 2, 2024 annual edition, retrieved
2026-08-25. Thirteen 005010 identifiers appear in that section and no others,
so each `not-adopted` row is a checkable negative over a complete list rather
than an absence of evidence: the 277CA (005010X214), the 999 (005010X231A1) and
the TA1 are named nowhere in it, and the TA1 carries a null identifier because
it is an envelope-level segment that no implementation guide identifier names
at all.

**Where the industry and the regulation disagree, both are carried.** The 270,
271, 834, 835 and the three 837 variants implement errata revisions the section
does not name, so each row carries the errata identifier it implements AND the
identifier the section does name, with a note rather than a silent substitution.
The 270 and 271 notes record that an operating rule the same section
incorporates, CAQH CORE 259, calls 005010X279A1 the adopted document while the
incorporation list names 005010X279, and they state no verdict on which reading
a regulator would enforce.

**The 278 declaration is corrected.** The package entry point declared the 278
as a request guide plus a separate response guide, 005010X216, which
45 CFR 162.920 does not adopt for that transaction or name anywhere. It now
declares 005010X217 for both directions, which is the document the section
adopts and which covers request and response by its own title. `build278Response`
still writes 005010X216 into ST-03 and GS-08: that emitted value is deliberately
unchanged, and the 278 response row records the divergence so a consumer can see
it as data instead of discovering it on the wire.

**Backed by a test that derives rather than transcribes.** The readers and
builders are enumerated from the package entry point, so a transaction that
gains one without gaining a row fails the suite naming the export, and a
transaction that arrives one-sided fails rather than implying a second
direction. Every build row is checked against the ST-03 its builder really
emits for a caller that states no implementation convention reference of its
own.

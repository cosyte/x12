---
"@cosyte/x12": minor
---

**This is 0.1.0, the first release whose public API we treat as settled.**

What is covered, and what you can build against:

- Typed read and typed emit for the HIPAA 005010 transaction sets this package covers: 270, 271,
  276, 277 and 277CA, 278 request and response, 820, 834, 835, 837P, 837I and 837D, 999 and TA1,
  each with a reader and a domain builder that enforces that guide's own invariants (balancing,
  counts, the hierarchy spine).
- The two claims attachments guides for the period on and after 26 May 2028: the 277 request for
  additional information (`006020X313`) and the 275 that answers it (`006020X314`), with the base
  006020 structure typed.
- Money as exact decimals: every amount, percent and quantity is an `X12Decimal`, never a float,
  and a slot the sender left empty reads `undefined`, not zero.
- A lenient parser: only four structural failures are fatal, and every tolerated deviation arrives
  on `warnings` as a stable code with its position. `X12_TR3_CONFORMANCE` states which
  implementation guide each transaction set follows.

What the version promises. The exported readers, builders, types and warning codes are the surface
we keep stable, and the warning registry only ever gains codes. While the package is below 1.0, a
breaking change bumps the minor version (0.1 to 0.2) and is called out in this changelog with its
migration; a fix that changes no public value ships as a patch. Upgrading from 0.0.x is itself
breaking in five places, listed in the entries below: `CodeListMeta`, `X12Eligibility` and
`X12ProfileDescription` each gain a required member, `X12ClaimStatusResponse` gains a third
`transactionType`, and `build278Response` declares `005010X217`.

What is not covered yet. A byte-exact round trip is not guaranteed in general, and
`KNOWN-LIMITATIONS.md` lists the cases. For the two 006020 attachments guides no implementation
guide usage is checked, and what an attachment carries is not decoded. Non-healthcare transaction
sets, EDIFACT, transport (AS2, SFTP), revisions before 005010 and other 006020 guides are out of
scope. No CORE Code Combinations table ships: you supply it.

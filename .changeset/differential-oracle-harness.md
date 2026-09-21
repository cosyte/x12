---
"@cosyte/x12": patch
---

A differential harness now reads this library's own synthetic corpus a second
time through an independent open-source X12 reader and records, as a committed
machine-readable artifact, where the two agree, where they disagree, and which
transactions the second reader has no 005010 map for at all. Nothing about what
this package parses or emits moves with it, and its published runtime dependency
set stays empty.

**What runs.** `pnpm run differential` compares every synthetic per-transaction
document in `test/fixtures/` element position by element position against pyx12,
a BSD-licensed HIPAA X12 parser and validator pinned to one exact version and
obtained only for the run. The comparison writes `test/differential/report.json`
and exits non-zero on a disagreement, on a compared transaction that put no
document or no element position through both readers, and on an oracle that
cannot be invoked, in which case nothing is written at all. The job is wired into
this repository's own CI, so the comparison is re-run on every push and pull
request rather than only at the commit that landed it.

**What the report carries.** The oracle's package name, the exact version it
reported about itself, its declared licence, and the commit of this library the
run was produced from. Per compared transaction: the implementation guide this
library implements AND the one the oracle's own map index binds, so the two
places where those differ by a published errata are visible rather than implied,
along with the documents compared, the element positions compared, and every
divergence with both readings left exactly as each reader returned them.

**What is named as not compared, and why that matters.** The covered and
uncovered sets are both derived from the `X12_TR3_CONFORMANCE` export rather than
from any hand-maintained list, and their union is asserted to equal this
library's read scope at head, so a transaction cannot be added without the report
being regenerated. Seven of the transactions this library reads have no map in
the oracle's index and are named individually with the reason: silence about the
270 must never read as agreement about the 270.

**What it does not prove.** Agreement with one other reader is not conformance to
a Technical Report Type 3 and it is not a compliance statement.
`KNOWN-LIMITATIONS.md` is rewritten in the same change to say so, replacing the
statement that no external-oracle corpus was wired.

Implements S0323-x12-10.

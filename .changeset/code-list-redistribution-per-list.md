---
"@cosyte/x12": patch
---

**Every bundled code list now publishes who maintains it and whether its
descriptions may be redistributed.** Until this release all seven bundled
snapshots sat behind one shared sentence saying regeneration was blocked on a
redistribution-terms review. That single answer was wrong in the direction that
matters: the two lists this package leans on hardest have different owners and
different answers. The Claim Adjustment Reason Codes are maintained by X12 and
their descriptions require a purchased licence; the Remittance Advice Remark
Codes are maintained by CMS and require none. One answer over both hid a
permission this package already had and hid a restriction it must respect.

**New public metadata on every `CodeListSnapshot`.** `meta.maintainingOrganization`
names the organisation that keeps the published list. `meta.redistribution`
carries the status (`"permitted"`, `"licence-required"` or `"not-established"`),
the terms it was read off, quoted or cited from the source that publishes them,
and the licensor to approach where the descriptions are not free to
redistribute. `meta.completeness` says whether the snapshot is the complete
published list or a cited part of it, so a code the lookup does not know can be
told from a code the publisher never issued. New exports:
`codeListRedistributionIsPermitted`, and the `CodeListRedistribution`,
`CodeListRedistributionStatus` and `CodeListCompleteness` types.

**"Not established" is a recorded answer, and it is not a permission.** Three
bundled lists are printed inside a purchased Technical Report Type 3 rather than
published on the X12 External Code Lists index, and no source obtained for this
package names them or states whether their descriptions may be redistributed.
Their status is recorded as unsettled and they are treated as not
redistributable wherever a permission decision is made, exactly as a
licence-restricted list is. `codeListRedistributionIsPermitted` answers `true`
only on a recorded permission: a licence requirement, an unsettled status and a
missing record all answer `false`, so a permission is never inferred from an
absence.

**`pnpm refresh:code-lists --fetch` now answers each list independently.** It
reports every bundled list's regeneration permission from that list's own
record, refuses only the lists whose own terms forbid it, prints the licensor to
approach beside each refusal, and never refuses a list because a different list
is restricted. It exits `2` while any list is refused and `0` when none is. The
default validating mode additionally refuses a bundled list that carries no
maintaining organisation or no redistribution record, naming the offending list,
so an unlabelled list cannot reach a release.

**No code and no description changed.** This release records terms and
redistributes nothing new: every bundled list returns exactly the codes and
exactly the descriptions it returned before, and a list that may not be
redistributed is still exactly the cited part it already shipped. The bundled
tables are pinned by digest in the test suite so an addition or an edit fails
the build.

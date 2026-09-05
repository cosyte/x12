---
"@cosyte/x12": patch
---

`phi-scan` now REFUSES a run that enumerated a target and never read it, after
reporting the hits it did find. No parse and no emit behaviour changes, and no
published surface moves: the scanner is a development gate and is not part of
the package tarball.

`--allow-fixture` is the only thing that produces such a target. It withdraws a
path from a list the run had already built, and that withdrawal used to be
silent, so the run reported on the targets it opened and said nothing about the
one it did not: a corpus whose only violator was withdrawn came back clean at
exit 0. A scan that did not open a file has no clean verdict about it, so such a
run now reports its hits and then exits with the same refusal code every other
refusal here uses.

The order is part of the rule: the violator that WAS read is printed with its
locus and its offending value before the refusal, because a refusal carrying no
evidence tells a caller nothing about the corpus. A run that carries no
`--allow-fixture` cannot reach the rule at all, so the all-mode sweep, the
`--staged` pre-commit route and explicit-path runs are byte-identical to before.

`phi-scan-overrides.md` is corrected with it. An override does not silence the
checks for a file; it withdraws the file, which now buys a refusal rather than a
pass. Declaring a fixture's synthetic tokens in `scripts/phi-allow-list.txt`
remains the way to make a run green.

The package manager pin moves to a pnpm 10 release that supports the publication
cooldown and trust policy the new `pnpm-workspace.yaml` declares, and the
`js-yaml` override is raised to the advisory's current ceiling.

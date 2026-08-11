---
"@cosyte/x12": patch
---

The PHI scanner's sweep now reads the bytes git carries as a union with the working-tree walk, and
every mode refuses over a target it enumerated and never read. Tooling only: no runtime code
changed and `dist/` is byte-identical.

The walk answers what is on disk under the scan roots, which is not the question of what the
repository carries. `git ls-files -s -z` is now read for the whole index and every in-scope tracked
path whose bytes the walk did not already read verbatim is scanned through `git cat-file blob`.
Measured on a throwaway repository: a tracked file scrubbed clean on disk but carrying a hit in the
index reported no hits at exit 0 and now exits 1 with its locus labelled as the copy git carries, and
an unmerged path with a clean working-tree copy reported no hits at exit 0 over a marker living only
in stage 3 and now refuses. Deduplication is by content under git's own blob framing, so a clean
checkout adds no extra reads while a repository whose index and working tree differ scans both forms.

A whole-file bypass used to be able to withdraw a file after the run had enumerated it, and report a
clean verdict about a file it never opened. The enumerated set is now compared against the read set
by difference, naming every path, so such a run refuses instead. The bypass flag and its audit log
are kept and an attempt is recorded and then refused, so declaring synthetic tokens in
`scripts/phi-allow-list.txt` is the remedy that reaches a clean run.

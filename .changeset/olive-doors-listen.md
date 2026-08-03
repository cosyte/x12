---
"@cosyte/x12": patch
---

The PHI scanner now refuses an in-scope entry that is not a regular file, on both of its enumerating routes. A symbolic link under a scan root pointing at a PHI-bearing file used to scan clean on both.

- The all-mode walk enumerates `Dirent.isFile()`, an lstat answer, so a link is neither a file nor a directory and fell out of the loop silently. Measured against a throwaway repository laid out like this one, with a synthetic `.edi` payload whose NM1 person name, DMG date of birth, PER phone and `REF*SY` SSN are all hits at exit 1 as a regular file: a link under `test/fixtures`, a link under `src/`, and a linked directory (which takes a whole subtree with it) each reported "OK - no hits" at exit 0.
- `--staged` reads content with `git show :<path>`, and git stores a link as its target path under mode `120000`, so that route was handed the path text and never the target's bytes. A staged link reported "OK - no hits" at exit 0.
- Both routes now refuse the scan (exit 2, the existing "could not complete" code) and name every offender rather than only the first. Neither route follows such an entry: following would read bytes the enumeration does not control, and git does not carry those bytes anyway.
- A refusal names the entry's own repo-relative path and a scanner-owned token for its kind. It never reports the link target, which is working-tree text that can itself carry PHI. Measured at base, a staged link whose target name was a dashed-SSN shape exited 1 and printed that shape, because `git show` handed the path text to the cross-cutting shape pass.
- The staged filter is now `AMT`. Replacing a tracked regular file with a link is neither an add nor a modify: measured here, `--diff-filter=AM` returned zero rows for that change while the unfiltered `--raw` showed `:100644 120000 <sha> <sha> T`, so without `T` the record died before any mode could be read. Admitting `T` also covers the reverse typechange, a link replaced by a real file bearing PHI. The route reads `--raw -z` rather than `--name-only` because the destination mode is the only thing that distinguishes a staged regular file from a staged link or gitlink.
- Each route keeps its own existing boundary: the walk still excludes a gitignored entry, and the staged route still looks only at `test/fixtures/**` and `src/**.ts`. This narrows what those scopes admit rather than widening them.
- `paths` mode is deliberately unchanged, because it was never blind: it reads with `readFileSync`, which follows a link, so a named path is scanned and hits.
- Not closed here: renames and copies are still not enumerated by the staged route at all; a scan that observed nothing is still reported clean; and the enumerate-then-read window in all mode is untouched.

No library code changed, and no published type changed. This is a commit-gate change only.

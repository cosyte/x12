---
"@cosyte/x12": patch
---

Repository PHI commit-gate only, with no runtime impact: the `phi-scan` pre-commit route no longer reports clean over a staged rename, a staged copy, a gitlink hidden by `diff.ignoreSubmodules`, an unmerged path, or a pair broken by `-B`.

No library code changed, no public type changed, and nothing a consumer installs behaves differently. This is `PHI-SCAN-RENAME-BLIND-AT-PRECOMMIT`, and it is recorded here because a gate that attests clean over bytes it never read is worth a changelog line even when the package is untouched.

`pnpm phi-scan --staged` is the pre-commit hook. It enumerated the index with `git diff --cached --raw -z --diff-filter=AMT`, and five kinds of staged change fell out of that list without a byte of the index changing. Each was measured on a throwaway repository laid out like this one, against a synthetic `.edi` payload whose NM1 person name, DMG date of birth, PER phone and `REF*SY` SSN are all hits at exit 1 when the same bytes arrive as an ordinary add:

- rename detection is on by default and neither `AM` nor `AMT` returns `R`, so `git mv` of an already-committed symbolic link into `test/fixtures/` staged as a single two-path `R100` record at mode `120000` and the route printed `OK - no hits` at exit 0. Renaming a fixture while substituting a real-looking surname into it passed the same way, over bytes that are two hits as an ordinary add. No similarity score is quoted anywhere in this change: it moves with the fixture, so a number copied from one is wrong for the next;
- under `diff.renames=copies` the same happened to a genuine `C100`, copying a PHI-bearing file from outside the scan roots into `test/fixtures/`. That is a distinct hole rather than the same one, because nothing is moved;
- with `diff.ignoreSubmodules=all` set in the caller's git config, a staged gitlink under `test/fixtures/` vanished from `--raw` entirely and the route exited 0, where the same index without that config is refused at exit 2;
- an unmerged path was returned by neither `AM` nor `AMT`. It has no stage-0 blob, so `git show :<path>` fails outright, and the route reported clean over an index it could not read;
- a pair broken by `-B` prints status letter `M` with a break score, one path, which the record parser reads happily, but `--diff-filter` classifies a broken pair as `B` whatever letter it prints. So an `AMTU` filter deletes it, and a reader checking the raw output concludes the opposite.

The remedy is one rule rather than five fixes: the argv stops trusting the caller's git config. It is now `git diff --cached --raw -z --no-renames --ignore-submodules=none --diff-filter=AMTUB`. `--no-renames` makes a two-path record unemittable, so the rename and copy destinations arrive as ordinary single-path `A` records, the source arrives as a `D` the filter drops, and the two-field stride is structural rather than conditional on `diff.renames`. An unmerged path is now refused (exit 2) with its own message, because its destination mode is `000000` and the existing refusal's sentence about symbolic links and gitlinks would be false for it. `B` costs the enumeration nothing today, since git only breaks a pair when `-B` is given; it is there so the flag cannot become a silent blindfold later.

The two enumerations are EQUAL when nothing is renamed or copied and larger only when something is, so this is a superset and not a strictly larger set: nothing the old argv enumerated stopped being enumerated. Verified under `diff.renames=true|copies|false|1` and `diff.renameLimit=1`.

Deliberately not closed here, and measured rather than assumed: a scan that observed nothing is still reported clean; a tracked file directly under `test/` is enumerated by neither route; an index entry at exactly a scan root's own path matches no `--staged` clause; and a walk root replaced by a regular file still dies on an unhandled directory read rather than refusing cleanly. Each is a scope decision that belongs in its own change.

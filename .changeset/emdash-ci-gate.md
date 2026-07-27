---
"@cosyte/x12": patch
---

Add the em-dash brand gate to CI (`scripts/check-no-emdash.sh`, `pnpm check:no-emdash`,
`.github/workflows/no-emdash.yml`).

The founder directive of 2026-07-24 (`knowledgebase/06-brand/voice-and-tone.md`) bans `U+2014`
outright across every cosyte surface and names commit messages explicitly, and the meta-repo's
`documentation/conventions.md` has described the rule as CI-gated. x12 was one of the repos where it
was not. This ports `knowledgebase`'s scanner, the TEXT-ONLY variant, which is the correct one here
because x12 tracks no binaries: all 264 tracked files decode as us-ascii or utf-8 and none holds a
NUL byte (measured byte-level 2026-07-27), so `website`'s NUL-partition variant would buy nothing
and would add a way for a text file to be classified out of the scan.

The gate checks both the tracked files and the PR title, body, and branch commit messages, the
latter on the non-default `edited` activity type so a description retitled after the final push is
re-checked before a squash merge turns it into the commit message. It lives in its own workflow
rather than in `ci.yml`: `ci.yml` calls the shared reusable pipeline, which runs a fixed ladder and
no arbitrary repo script, so there is nowhere in it to hang this, and adding a step to the shared
pipeline would land the gate on all 13 of its callers at once, six of which violate the ban
wholesale today (synth 143 files, deid 118, astm 103, cli 88, terminology 85, transform 77, counted
2026-07-27). `ci.yml`'s triggers also drive the Node 22 + 24 matrix plus the `release-dry-run` job,
which should not re-run on every PR-description edit.

Within the bytes it is designed to match, the scanner is built so that it cannot report green from a
scan it did not complete: it pins `LC_ALL=C.UTF-8` (without the pin GNU grep 3.8 aborts on
`\x{2014}` and a naive port prints OK having matched nothing), self-tests itself against a known em
dash before believing a clean result, treats any scanner stderr as a failure, refuses an empty file
list, builds its file list as its own command so a failed `git ls-files` stops the run, uses
NUL-separated paths because `git ls-files` C-quotes non-ASCII names, passes `-e` and `--` so a
tracked file named `-q` cannot silence a batch, and anchors at the repo top level so invocation from
a subdirectory cannot under-report. Each of those routes was seeded in a scratch repo and confirmed
RED before this landed, alongside a green control.

Five limits of the shared shape are measured and documented in the script rather than engineered
away, because they are one cross-repo fix across the copies in `knowledgebase`, `hl7`, `fhir` and
`pathways` rather than four local patches.

1. A tracked TEXT file holding a raw NUL byte **and a pattern match** fails this shape closed:
   GNU grep 3.8 writes `binary file matches` to stderr and the scan refuses. The NUL alone does
   not trigger it, and a NUL-bearing file with no match scans green. x12 has no NUL-bearing
   tracked file at all today (zero of 264, measured byte-level). The direction is worth stating
   because `website`'s NUL-exclusion shape inverts it and would silently exempt such a file
   instead, and because the red here is remediable by exactly the rewrite the brand rule already
   demands: `ccda/src/profiles/merge.ts` carries two functional raw NULs and one em dash and reds,
   and deleting that em dash while keeping both NULs turns it green. The settled cross-repo fix is
   neither shape but a `git check-attr binary` partition, which needs a `.gitattributes`
   declaration this repo does not have. Deliberately out of scope here.
2. The pattern matches `U+2014` as UTF-8 plus five textual encodings, so an em dash carried in a
   legacy-charset fixture (CP1252 `0x97`, or UTF-16) scans clean. There is none today, and if one
   lands it is a reviewer's job rather than the gate's: the ban is a rule about prose people write,
   and fixture bytes are grounded data, not brand copy.
3. Encoded-form matching is literal, so `%e2%80%94`, `&#X2014;`, `&#x2014` and `&#08212;` pass,
   while the literal character anyone actually types is always caught.
4. The stderr capture binds to the scanning `grep`, not to the exclusion filter ahead of it.
5. `-d skip` means a tracked path whose worktree entry is a directory is skipped with no
   diagnostic. Present in every copy of this shape.

One further limit is about where the gate sits rather than what it reads. The org ruleset
`parser-ci-required-checks` requires exactly `ci / verify (22, ubuntu-latest)`,
`ci / verify (24, ubuntu-latest)` and `ci / actionlint` on this repo; `Em-dash gate / no-emdash` is
not among them, so today a PR carrying an em dash reds this check visibly but is still mergeable.
Making it required is an org-level ruleset change, outside this repo.

x12 was already clean (0 of 21 markdown files carried an em dash), so no content changed. This is
regression prevention only. Dev tooling: no change to the published package surface, parser
behavior, or warning codes.

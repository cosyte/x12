#!/usr/bin/env bash
# scripts/check-no-emdash.sh
# Brand rule (founder directive, 2026-07-24): cosyte never uses the em dash.
# The em dash (U+2014) reads as an AI tell, so it is banned outright across
# every cosyte surface. Source of truth: `knowledgebase/06-brand/voice-and-tone.md`.
#
# Ported into x12 on 2026-07-27 from knowledgebase (PR #12, `f4b42f5`) by way of the
# hl7 copy (`235ff46`), which is the TEXT-ONLY variant of this gate: no NUL-byte
# partition, because this repo tracks no binaries. Verified byte-level before the
# port over all 264 tracked files: every one decodes as us-ascii or utf-8, none holds
# a NUL byte, and none carried an em dash (0 of 21 markdown files). So this gate
# changed no content. It exists purely to stop a regression, which is the only reason
# to add it to a clean repo.
#
# Do NOT swap in the website copy. That one partitions on the NUL byte to tolerate
# tracked rasters, and its extra machinery buys nothing here while adding a way for a
# text file to be classified out of the scan: any text file that later gains a NUL
# would be silently exempted from a ban the brand doc states has no exceptions.
#
# The fix is never to re-encode the character: rewrite the sentence with a
# period, a colon, a comma, or parentheses.
#
# Two modes:
#   check-no-emdash.sh                 scan every tracked file
#   check-no-emdash.sh --stdin LABEL   scan text on stdin (CI feeds it the PR
#                                      title, body, and commit messages: the
#                                      voice rule names commit messages, and a
#                                      commit-message em dash is the near-miss
#                                      that prompted the gate in knowledgebase)
#
# Note: this script itself is excluded from the tracked-file scan (it necessarily
# names the encodings it bans). It matches by codepoint and by encoding, so it
# never contains the literal character.
set -euo pipefail

# LOCALE PIN, load-bearing. `grep -P` compiles `\x{NNNN}` as a Unicode codepoint only
# in PCRE's UTF-8 mode, which GNU grep enables from the locale. Under LC_CTYPE=POSIX
# (a bare container, cron, `sh -c`, any shell that inherits no locale) GNU grep 3.8
# instead ABORTS with "character code point value in \x{} or \o{} is too large",
# verified in this repo's own container. The version this was ported from discarded
# that on stderr and `|| true`d the pipeline, so it printed OK having scanned nothing.
# Do not remove the pin, and do not restore the stderr redirect.
#
# The pin cannot be traded for a raw-byte pattern: `\xe2\x80\x94` matches the em dash
# under POSIX but NOT under a UTF-8 locale, where PCRE reads it as three characters.
# One pattern cannot cover both, so the locale is fixed and the pattern follows it.
export LC_ALL=C.UTF-8

# Matches U+2014 as the literal character and as its encodings: %E2%80%94 (URL),
# the JS backslash-u escape, and the &mdash; / &#8212; / &#x2014; HTML entities.
PATTERN='\x{2014}|%E2%80%94|\\u2014|&mdash;|&#8212;|&#x2014;'

# SELF-TEST: prove the scanner can still see what it is meant to catch before any
# clean result is believed. `printf` emits U+2014 as its UTF-8 bytes, so this file
# still never contains the literal character.
if ! printf 'a\xe2\x80\x94b\n' | grep -qP "$PATTERN"; then
  echo "ERROR: check-no-emdash - the scanner cannot match a known em dash." >&2
  echo "       grep -P is unavailable or not in UTF-8 mode (LC_ALL=${LC_ALL})." >&2
  echo "       Refusing to report a clean tree on a scanner that cannot see." >&2
  exit 1
fi

fail_with_hits() {
  local what="$1" hits="$2"
  echo "$hits" >&2
  echo "" >&2
  echo "ERROR: check-no-emdash - em dash (U+2014, or an encoded form) found in ${what}." >&2
  echo "       cosyte never uses em dashes (founder directive; 06-brand/voice-and-tone.md)." >&2
  echo "       Rewrite with a period, colon, comma, or parentheses." >&2
  exit 1
}

# Anything the scanner writes to stderr means it did not read everything it was
# given, and an incomplete scan must never print OK. Both modes route grep's stderr
# here and refuse to continue if it is non-empty, because exit status cannot carry
# that signal: grep exits 1 on "no match", which xargs in turn reports as 123, so
# "clean" and "died part way through the batch" are indistinguishable by code.
ERRLOG=$(mktemp)
FILELIST=$(mktemp)
trap 'rm -f "$ERRLOG" "$FILELIST"' EXIT

refuse_if_incomplete() {
  [ -s "$ERRLOG" ] || return 0
  cat "$ERRLOG" >&2
  echo "" >&2
  echo "ERROR: check-no-emdash - the scan reported errors, so it did not read all of" >&2
  echo "       its input. Refusing to report green from an incomplete scan." >&2
  exit 1
}

# ---- stdin mode: text that is not a file (commit messages, PR title and body) ----
if [ "${1:-}" = "--stdin" ]; then
  LABEL="${2:-stdin}"
  HITS=$(grep -nP -e "$PATTERN" - 2>>"$ERRLOG" || true)
  refuse_if_incomplete
  [ -n "$HITS" ] && fail_with_hits "$LABEL" "$HITS"
  echo "check-no-emdash: OK (no em dashes in ${LABEL})"
  exit 0
fi

# ---- default mode: every tracked file ----
#
# `git ls-files` is relative to the working directory, so from a subdirectory it
# lists a subtree and the scan would report OK having skipped the rest of the repo.
# Anchor at the top level, which also keeps the self-exclusion path below correct.
cd "$(git rev-parse --show-toplevel)"

# Several things this does differently from the docs and website copies, all of them
# closing a way for the scan to report green without having looked:
#
#   -0 -r on xargs, fed by `git ls-files -z`: -r drops the grep invocation entirely
#   when the file list is empty (without it, grep falls back to reading stdin and
#   prints OK), and the NUL separator is what makes the list verbatim. Unseparated,
#   `git ls-files` C-quotes any path holding a space, a quote, or a non-ASCII byte,
#   and grep is then handed a name no file has. No tracked path in x12 needs quoting today
#   (all 264 are bytes 0x21 to 0x7e, checked 2026-07-27), so this is hardening against a
#   future path, not a fix for a present one. Seeded and confirmed red before it landed.
#
#   the file list is built as its own command, not as the head of the pipeline, so a
#   `git ls-files` that fails (an unreadable or corrupt index) stops the run. Piped,
#   its status is erased by the `|| true` the no-match case needs, and the scan would
#   report OK over an empty list. An empty list is refused for the same reason.
#
#   -e before the pattern and -- after the file list, so neither a pattern nor a
#   tracked filename that starts with a dash is read as a grep option. A file named
#   `-q` would otherwise silence the whole batch and the gate would print OK.
#
#   no -I: -I skips any file grep reads as binary, which includes a text file holding
#   invalid UTF-8, so an em dash inside one would be skipped silently. This repo is
#   TypeScript, markdown, JSON, YAML, and X12 EDI text fixtures, with no binaries at
#   all (all 264 tracked files decode as us-ascii or utf-8 and none holds a NUL byte,
#   checked byte-level 2026-07-27). Losing -I makes a future binary a loud false
#   positive (grep prints "Binary file X matches", the gate goes red, a human looks)
#   instead of a silent miss. Fail closed, not open.
#
#   stderr is captured and any of it fails the run (see refuse_if_incomplete above).
#
# KNOWN LIMITS of the shared shape. These belong to the copy in knowledgebase, hl7, fhir and
# pathways as much as to this one. They are ONE cross-repo fix across those copies, not four
# fixes, so do not patch them here in isolation: a divergent copy is worse than a shared known
# limit. Each is MEASURED against this script, not inherited as prose.
#
#   (i) NUL-bearing TEXT FILES. The trigger is a NUL **and** a pattern match, never the NUL on
#   its own: GNU grep 3.8 then writes `binary file matches` to STDERR with empty stdout, and
#   refuse_if_incomplete turns that into a hard RED. A NUL-bearing file with no match scans
#   green and reports nothing. All three measured 2026-07-27 (match on the NUL's line, match on
#   a later line, no match at all). x12 has NO NUL-bearing tracked file today (0 of 264,
#   byte-level), so none of this is reachable here yet.
#   The direction matters because the other shape in the suite inverts it. Do NOT reach for
#   website's NUL-exclusion shape to soften this: that one classifies such a file OUT of the
#   scan and misses a real em dash inside it, silently exempting a shipping source file from a
#   ban the brand doc states has no exceptions. This shape fails loud instead, and the red is
#   remediable by exactly the fix the brand rule already demands. Measured on the real file:
#   `ccda/src/profiles/merge.ts` carries two FUNCTIONAL raw NULs (a composite-key separator) and
#   one em dash in a JSDoc line, and reds here; delete that em dash, keep both NULs, and it goes
#   green. `dicom/src/dataset/vr/charset.ts` carries a functional NUL and NO em dash, and is
#   already green under this shape. So this residual is NOT what blocks those two ports.
#   The settled cross-repo fix is neither shape: partition on `git check-attr binary`, a
#   declaration the repo maintains, which needs a `.gitattributes` this repo does not yet have.
#   Deliberately deferred, because the rule about what a text file IS is a cross-repo decision,
#   not a line in this file.
#
#   (ii) LEGACY CHARSETS, measured and not assumed: the pattern matches U+2014 as UTF-8 and as the
#   five textual encodings listed with it. It does NOT match an em dash encoded in some
#   other charset, and x12 is a parser repo where a fixture deliberately encoded in one
#   (an ISA-carried CP1252 0x97, or a UTF-16 document) is a plausible future artifact.
#   Such a file scans clean and this gate stays GREEN. There is none today. The -I
#   discussion above does not rescue it: GNU grep DOES classify such a file as binary
#   (any encoding error is enough, a NUL is not required), but it only surfaces that as
#   the "binary file matches" diagnostic when the pattern actually matches, and a pattern
#   written in UTF-8 never matches a CP1252 0x97. So nothing reaches refuse_if_incomplete
#   and the run stays quiet. This is not a wholesale skip of mixed-encoding files, though:
#   a UTF-8 em dash on another line of the same file is still caught normally. Accepted
#   rather than fixed: the ban is a rule about prose that people write, and fixture bytes
#   are grounded data, not brand copy. If a legacy-charset fixture ever lands, a reviewer
#   covers it, not this script. Do not widen the pattern to chase it, and do not re-add -I.
#
#   (iii) Encoded-form matching is LITERAL: case-sensitive and semicolon-required. Measured
#   2026-07-27: `%e2%80%94` (lowercase), `&#X2014;` (capital X), `&#x2014` (no semicolon) and
#   `&#08212;` (leading zero) all PASS this gate, while `%E2%80%94`, `&mdash;`, `&#8212;`,
#   `&#x2014;` and the literal character all go red. The literal UTF-8 character, which is what
#   anyone actually types or pastes, is caught in every case.
#
#   (iv) The stderr capture binds to the SCANNING grep, not to the `grep -zvxF` exclusion filter
#   ahead of it in the pipeline. A failure in the exclusion filter is therefore not captured by
#   refuse_if_incomplete.
#
#   (v) `-d skip` on the scanning grep. A tracked path whose worktree entry is a DIRECTORY is
#   skipped with no diagnostic, so the gate can print OK over a tracked blob that holds an em
#   dash. Measured 2026-07-27. Present in every copy of this shape; website removed the flag for
#   exactly this reason. Not fixed here because the flag is load-bearing the other way (without
#   it grep recurses or errors on the same input) and picking between those is the same
#   cross-repo call as (i). Reachable only through a path/directory swap, which is not a shape
#   x12 produces today.
#
# The one file the scan does not cover is this script, which has to name the encodings
# it bans. Nothing checks the checker, so keep it free of the literal character: it
# matches by codepoint and by encoding and never spells one out.
git ls-files -z > "$FILELIST"

if [ ! -s "$FILELIST" ]; then
  echo "ERROR: check-no-emdash - no tracked files to scan. Refusing to report green" >&2
  echo "       from a scan that read nothing." >&2
  exit 1
fi

HITS=$(grep -zvxF 'scripts/check-no-emdash.sh' < "$FILELIST" |
  xargs -0 -r grep -d skip -nP -e "$PATTERN" -- 2>>"$ERRLOG" || true)

refuse_if_incomplete

[ -n "$HITS" ] && fail_with_hits "the tracked files listed above" "$HITS"

echo "check-no-emdash: OK (no em dashes in the tracked files; this script is excluded)"

#!/usr/bin/env bash
# scripts/check-no-internal-refs.sh
#
# PORTED INTO x12 from the hl7 copy, which is this ecosystem's reference implementation of
# this gate. **IT IS A DERIVATION, NOT A COPY, AND THE DIFFERENCE IS LOAD-BEARING.** Two
# things were re-measured on THIS tree rather than inherited, and both changed the file:
#
#   1. THE `X12-` STANDARDS EXCLUSION IS REMOVED. Every sibling copy carries
#      `X12-\d{3}[A-Z]?|X12-\d{6}` as reference material to protect. In THIS repo `X12` is
#      also our own project prefix, and the two spellings overlap. Counted here: 141 matches
#      of that pattern across tracked files, ALL of them internal identifiers and NOT ONE a
#      standards designation. Carrying the sibling line verbatim printed OK over six live
#      violations on shipping carriers. The full count is at STANDARDS_DESIGNATION.
#   2. `KNOWN-LIMITATIONS.md` IS ADDED TO THE SCANNED SURFACE. It is in this package's
#      `files`, so it ships in the tarball, and it held most of what this gate first found.
#
# Every count in this file was taken on THIS repo's tree. The counts the hl7 copy carries
# were DELETED rather than carried across: a number a reader of this repo cannot re-derive
# is a claim, not a measurement.
#
# Founder directive, 2026-07-27: NO INTERNAL PROJECT BOOKKEEPING ON A PUBLIC SURFACE.
# Anything a consumer reads (a GitHub release body, README.md, docs-content/, the npm
# package description, a site page) describes what the software does and what changed.
# It must never carry our internal bookkeeping: item identifiers (`HL7-N`, `CCDA-P7`),
# "Phase U" / "roadmap Phase K", sweep and programme names, ADR numbers, internal repo
# paths, or process commentary about how the artifact came to exist. Source of truth:
# the meta-repo's `documentation/conventions.md`, "No internal project bookkeeping on a
# public surface". The founder's words: "The releases should also not speak on anything
# regarding phases, etc. That has no relevance to the user consuming it. This goes for
# readmes and documentation as well."
#
# WHY THIS IS A GATE AND NOT A MEMORY NOTE. Founder, same day: "it needs to not just be
# a memory note, but something that is addressed in the workflow accordingly. This needs
# to not happen again." A one-time sweep regresses the first time someone writes
# `(CCDA-P8)` into a README. A documented rule governs whoever reads it; a gate governs
# everyone.
#
# WHERE THE IDENTIFIERS DO BELONG, and therefore what this gate deliberately does NOT
# scan: the changeset, CHANGELOG.md, commit messages, the PR title and body, CLAUDE.md,
# source comments, and the meta-repo. The traceability is real and worth keeping; it just
# belongs on the inside. So this is a translation at the boundary, not a deletion, and the
# boundary is what SCAN SURFACE below defines.
#
# ---------------------------------------------------------------------------
# WHAT IS LIFTED FROM WHERE. Two sources, deliberately, and neither is re-derived here.
#
#   * THE DETECTION RULES are lifted from `cosyte/.github` `scripts/release-notes.mjs`
#     ([#18](https://github.com/cosyte/.github/pull/18), `0a759fe`), which is 915 lines
#     with a test suite and a real `hl7-v0.0.2` fixture asserting byte for byte against
#     the live release body, validated against all 14 published releases across 8 repos.
#     Its CONTENT_RULES are the prefix-keyed set below, transcribed to PCRE. THE REASONING
#     IS KEPT WITH THEM ON PURPOSE. Every one of the four traps recorded here shipped a
#     public defect before it was caught, and a reader who has not hit them will tidy the
#     guard away as over-complication.
#
#   * THE SCAN HARNESS is the shape that already works in this repo for
#     `scripts/check-no-emdash.sh`: its own CI job, a tracked-file scan, a refusal to
#     report green from a scan that did not read all of its input, and every known
#     silent-green route closed and checked RED rather than assumed. Specifically it takes
#     mllp's variant of that shape ([mllp#35](https://github.com/cosyte/mllp/pull/35),
#     `eb8b7de`): the scan list is built in a bash loop and `./`-prefixed there, so the
#     scan stays a SINGLE command with the stderr capture bound to all of it, and there is
#     no `sed -z` stage (GNU-only, and unlike `grep -P` it has no self-test, so on the
#     documented Homebrew `gnubin` setup a `sed`-prefixing copy prints OK over a live
#     violation). ncpdp's `sed -z 's|^|./|'` closes the same hole; this shape closes it
#     without adding a stage the stderr capture cannot see.
#
# ---------------------------------------------------------------------------
# THE FOUR TRAPS THAT BREAK A NAIVE DETECTOR. All four are why this file is not a
# one-line grep. Do not "simplify" past them.
#
#   (1) KEY ON KNOWN PROJECT PREFIXES, NEVER ON THE `WORD-N` SHAPE. This trap is sharpest
#       in THIS repo of all of them, because an X12 parser's documentation IS almost
#       entirely `WORD-N` tokens. `X12-ISA-ELEMENT-ARITY` is ours, but `ISA-06`, `ST-03`,
#       `TA1-02`, `SVC-07`, `CLM-05`, `SV1-02`, `HI-02`, `CLP-01` and `NM1-03` are 005010
#       data-element references and are exactly the reference material a consumer of this
#       package needs. A shape rule destroys the documentation it was added to protect. The cost of keying on
#       prefixes is that a NEW PROGRAMME MEANS ADDING ITS PREFIX to the list below, and
#       nothing will catch it until someone does. That is the cheaper of the two mistakes.
#
#   (2) DECAPITATION, which is a rule for the person REMEDIATING a hit, not for the
#       scanner. Stripping an identifier off the FRONT leaves the fragment behind:
#       "Phase 7 (thirteenth slice): builder emits X (CCDA-P7)" became "(thirteenth
#       slice): builder emits X" across 17 lines of ccda's published release notes, which
#       is worse than the text it replaced. Repair the head: drop a leading orphan
#       parenthetical, strip leading punctuation, recapitalise. Same mid-sentence: "(of
#       the v2.4 capability arc)" reads worse than no parenthetical at all.
#
#   (3) CASE SENSITIVITY. The identifier rule is case-SENSITIVE and the segment after the
#       hyphen must start uppercase, which is what lets `FHIR-bridge` and `docs-content/`
#       through: they are legitimate content, and a case-insensitive rule calls them
#       violations. Leading digits are fine too: `835`, `271` and `837` open X12 headlines
#       legitimately, so nothing here keys on a leading number.
#
#   (4) PHASE PATTERNS NEED A LETTER SUFFIX (`Phase 5b`) AND A LETTER-ONLY FORM
#       (`Phase W`): a digits-only pattern misses both. Ordinal `slice` and `wave` are
#       ours too ("thirteenth slice", "second wave"): "slice" is our word for a unit of
#       work and a reader does not have it. In prose it should read "change".
#
# ---------------------------------------------------------------------------
# SCAN SURFACE. This gate scans the PUBLIC surface only, which is the one substantive
# difference from check-no-emdash (that one scans every tracked file, because the em-dash
# ban has no inside/outside distinction: it covers commit messages too). Here the same
# identifier is REQUIRED on the inside and BANNED on the outside, so scanning every
# tracked file would red on CHANGELOG.md, `.changeset/`, CLAUDE.md and source comments,
# where the convention explicitly says the identifiers belong. A gate that reds on
# correct content is a gate someone deletes.
#
# In scope:
#   * README.md            the repo's front page, and shipped inside the npm tarball
#   * TRADEMARKS.md        shipped inside the npm tarball (`files` in package.json)
#   * LICENSE              shipped inside the npm tarball
#   * docs-content/        every tracked file, including sidebars.json: this is the
#                          content published to docs.cosyte.com
#   * package.json         the npm-visible metadata ONLY (`description`, `keywords`),
#                          extracted and scanned as text. Named explicitly by the
#                          convention. The rest of package.json is not public prose, and
#                          scanning it whole would red on a future dependency or script
#                          name that happens to match.
#
# Out of scope, each for a stated reason:
#   * CHANGELOG.md         SHIPS INSIDE THE NPM TARBALL, so it is genuinely public surface,
#                          and it currently carries internal identifiers across its
#                          history. It is excluded anyway because the convention names
#                          CHANGELOG.md as one of the places identifiers BELONG, and
#                          because rewriting a released changelog's history destroys the
#                          traceability the same convention preserves. That is a live
#                          contradiction in the standard, it is ECOSYSTEM-WIDE (every
#                          parser has it), and it is not for one repo to settle alone.
#                          Recorded here, and queued on PUBLIC-SURFACE-HYGIENE in the
#                          meta-repo, rather than silently decided in either direction.
#   * CLAUDE.md, .github/, .changeset/, scripts/, test/, documentation/
#                          internal by definition, or code rather than prose. `.changeset/`
#                          in particular: a changeset summary BECOMES the changelog entry,
#                          and the convention names the changelog as a place identifiers
#                          BELONG, so scanning it would red on correct work.
#   * src/ DOC COMMENTS    IN SCOPE, as a THIRD PASS at the bottom of this file, with its
#                          own rule array (SRC_RULE_PATTERN), its own self-tests, and its
#                          own extractor. `src/` JSDoc IS public: it is compiled into
#                          `dist/index.d.ts` and `dist/index.d.cts`, `dist` is the first
#                          entry in package.json's `files`, and it is what a consumer's
#                          editor shows on hover. MEASURED ON THIS TREE (not inherited from
#                          a sibling copy) at the commit that added this file, over the
#                          tracked `src/**/*.ts`: 212 doc-comment hits, of which 124 were
#                          the phase rule, 76 the identifier rule, 9 the jargon rule, 2 the
#                          repo-path rule and 1 the ADR rule. All are gone; the doc-comment
#                          surface is 0 on all six rules.
#   * src/ `//` COMMENTS   OUT of scope, deliberately, and this is the line the third pass
#                          draws. `//` and plain `/* */` comments do NOT reach `dist`
#                          (checked both directions: a doc comment's "Escape-fidelity
#                          overlay" appears in `dist/index.d.ts`, a `//` comment's
#                          "positional NTE grouping" does not appear at all). The convention
#                          names source comments as a place identifiers BELONG, so what only
#                          a maintainer reads stays internal and what a CONSUMER receives is
#                          swept. The `//` bookkeeping left in `src/` on that basis is
#                          deliberate, not an omission. NO COUNT IS PUBLISHED FOR IT, and
#                          that is this repo's rule rather than laziness: a draft of this
#                          file carried two different figures for it in two places, and a
#                          third measurement matched neither, because "a `//` comment
#                          carrying bookkeeping" has more than one defensible population.
#                          Delete a drifting number; never correct it. Derive it, with the
#                          population you mean, at the moment you need it.
#   * dist/                STILL NOT SCANNED, and this is the gate's stated ceiling rather
#                          than a hole that has been closed. `dist/` is untracked build
#                          output: neither this script nor CI can read it without building
#                          first, and this script does not build. What the third pass gates
#                          is dist's SOURCE, which is a proxy that holds only because the
#                          dts build copies doc text verbatim. A build that began
#                          transforming comments would decouple the two silently.
#
# ---------------------------------------------------------------------------
# NO STDIN / PR-TEXT MODE, deliberately, and this is the other difference from
# check-no-emdash. That gate scans the PR title, body and commit messages because the
# brand rule names commit messages explicitly. This rule says the opposite: identifiers
# BELONG in the commit, the PR and the changeset. A PR-text half here would red on correct
# work. If you are looking for the half that keeps identifiers out of a published RELEASE
# BODY, it exists and it is not here: `cosyte/.github` `scripts/release-notes.mjs assert`
# runs inside the shared release pipeline and refuses to publish a violating body.
#
# ---------------------------------------------------------------------------
# DISCLOSED RESIDUALS. Known and stated rather than discovered later.
#
#   (i)   THE PREFIX LIST IS DUPLICATED. It is copied from release-notes.mjs because a
#         bash gate inside a parser repo cannot import from `cosyte/.github`, and vendoring
#         that 915-line Node script into every repo is worse. So the two lists can drift: a
#         prefix added there does not appear here. The cross-repo fix is one shared list
#         (published as data by `cosyte/.github`, or as a `@cosyte/*` package), and it is
#         ONE fix across every copy rather than one per repo. Do not patch this copy alone;
#         a divergent variant is worse than a known shared limit.
#   (ii)  The scan reads file CONTENTS, never file NAMES. A tracked path that itself
#         carries an identifier passes green. Shared with check-no-emdash.
#   (iii) An identifier inside a fenced code block, a URL, or a link target is treated
#         exactly like prose. That is deliberate (a reader sees it either way), but it
#         means a legitimate quotation of an internal path in an example would have to be
#         rewritten rather than escaped.
#   (iv)  This gate does not check the em dash. `scripts/check-no-emdash.sh` owns that
#         rule and scans a wider surface; duplicating it here would put the same red in
#         two places with two wordings.
#   (v)   IT CATCHES IDENTIFIERS, NOT PROSE ABOUT OUR PROCESS. The founder's rule bans
#         both. "All confirmed 3-0 (pass 5) against primary Ch. 2A", "all verified 3-0 in
#         the research pass", "Assumption logged", and a README pointing the reader at "the
#         roadmap's known-limitations" were all live on this repo's public pages and were
#         removed by hand alongside this gate. No pattern would have found them: they are
#         ordinary English sentences whose only fault is that they describe how the artifact
#         came to exist. Two of them were found by a refuter AFTER the sweep claimed to be
#         complete, which is the honest measure of how much of this rule the gate carries.
#         The gate raises the floor; it does not replace the reviewer's half of the rule.
#   (vi)  SINGLE-LETTER-PREFIXED DECISION NUMBERS (`D-01`) ARE NOT CAUGHT, deliberately.
#         hl7's copy carries this residual because that repo numbers its design decisions
#         that way. RE-DERIVED HERE RATHER THAN INHERITED: `\bD-\d{2}\b` matches ZERO
#         times across every tracked file in this repo, so the residual is not live today.
#         It is kept written down because the reason for NOT adding such a rule is
#         permanent and clinical: legacy SNOMED RT codes are axis-prefixed in exactly that
#         shape (`D-13000` topography, `T-32000`, `M-80003`), so a `D-\d+` rule in a
#         healthcare parser's docs is one careless widening away from corrupting a code.
#         If this repo ever mints such a convention, that is the argument against gating it
#         by shape.
#   (vii) `phase` AT THE END OF A CLAUSE IS NOT CAUGHT. Measured rather than assumed: rule 1
#         DOES catch the running-prose forms, because it keys on `phase` plus a following
#         word, so `phase guards`, `phase are` and `phase adds` all red. What escapes is
#         `phase` with nothing after it but punctuation or a line end, which is the shape of
#         "the non-goals of this phase". A rule for the determiner form was written,
#         measured and REMOVED (see rule 3) because of what it cost in clinical phrasing, so
#         this one is a reviewer's catch.
#  (viii) RULE 1 HAS A KNOWN FALSE POSITIVE ON DICOM MR VOCABULARY: `phase encoding`.
#         `InPlanePhaseEncodingDirection` is a real DICOM attribute and "the phase encoding
#         direction" is correct reference material, but rule 1 sees `phase` plus a following
#         word and reds, telling the author to rewrite something that was right. RE-DERIVED
#         HERE: `phase encoding` occurs ZERO times in this tree, and an X12 EDI parser has
#         no reason to document an MR acquisition parameter, so it is even less reachable
#         here than in the copy this was lifted from. It is NOT fixed: adding `encoding` to
#         the field-name lookahead is a rule change and would need its own negative
#         self-test. Recorded, not carried as if it were live here.
#   (ix)  A VIOLATION SPLIT BY INLINE MARKUP REJOINS IN NEITHER PASS. `phase **K**` and
#         `phase [K](...)` put markup between the two tokens, and neither the line scan nor
#         the paragraph join strips it, so a multi-token rule does not match. Closing it
#         needs a markdown renderer, not a bigger regex. Stated because a reader of the
#         second pass could otherwise assume it normalises markup as well as whitespace.
#   (x)   A WRAP AFTER TRAILING WHITESPACE. A line ending in a space or two (a markdown hard
#         break) joins with an extra separator that the squeeze removes, so this one is
#         actually covered; but a line ending in a backslash hard break keeps the backslash
#         in the joined text and would sit between the two tokens, like (ix). Zero instances
#         in this corpus today.
#   (xi)  THE THIRD PASS CANNOT SEE `dist/`, only its source. Stated at length in the pass
#         itself and in SCAN SURFACE above, and repeated here because it is the single most
#         important thing to know about what this gate does and does not prove. The `164
#         lines of dist/index.d.ts` figure that motivated the pass is a SNAPSHOT taken by
#         hand from a local build; no checked-in gate can re-derive it.
#  (xii)  RULE 4 (`slice`) FALSE-POSITIVES WHERE `slice` IS A VERB OR MEANS PORTION, and is
#         nobody's jargon. ONE live instance was found by this pass on the tree it shipped
#         with, in `src/builder/caller-value.ts`: "a 120,000-element array is still walked
#         by `JSON.stringify` before this slices the result". IT WAS REWRITTEN
#         ("truncates"), and the rule was NOT narrowed: a narrowing has no self-test to hold
#         it, and "truncates" is the clearer word anyway. If an instance appears where no
#         rewrite reads well, that is the signal to narrow the rule and assert the phrasing
#         in SRC_NEGATIVE[3], not to widen an exclusion quietly.
# (xiii)  WHAT `dist/` CARRIED BEFORE THIS LANDED, AND WHAT IT CARRIES NOW. This is the only
#         figure in this file about the thing a consumer actually receives, so it is the one
#         worth having. Counted on a local build of the base commit `a3e081d` and of the
#         commit that added this file, with TWO tools (`grep -cP` and `rg -cP`) that agreed
#         exactly on every cell:
#
#             rule                          base dist/index.d.ts   head
#             item identifier (`X12-...`)                     13      0
#             phase / wave language                           64      0
#             internal jargon ("slice")                        2      0
#             internal repo path                               1      0
#             ADR reference                                    0      0
#
#         `dist/index.d.cts` is BYTE-IDENTICAL to `dist/index.d.ts` in both trees (checked
#         with `cmp`, both directions), so one clean source covers both consumer conditions.
#         `dist/index.mjs` and `dist/index.cjs` are BYTE-IDENTICAL base to head: the sweep
#         that made those cells zero touched doc comments only and moved no runtime byte.
#
#         QUOTE A COUNT WITH THE TREE IT WAS TAKEN ON, OR NOT AT ALL. The copy this file was
#         lifted from carries a long list of counts taken on a DIFFERENT repo's tree, and
#         every one of them was deleted here rather than carried across, because a number
#         that no reader of THIS repo can re-derive is a claim, not a measurement. Two of
#         them (`D-NN` decision numbers, nine extra item prefixes) name conventions this
#         repo does not have at all: re-derived here, `\bD-\d{2}\b` matches zero tracked
#         files, and the only project prefix that fires anywhere on this repo's scanned
#         surface is `X12`.
#
#         MEASURE ANY SUCH LIST ON THE REFLOWED TEXT, NOT LINE BY LINE. A sweep done with a
#         line scan reports itself complete while an instance survives across a wrap, which
#         is the same wrap blindness this gate's second and third passes exist for, arriving
#         in the REMEDIATION rather than in the detection: a hand sweep needs the paragraph
#         view just as much as a rule does.
#  (xiv)  THE THIRD PASS SWEEPS DOC COMMENTS THAT NEVER REACH AN EXPORTED DECLARATION, so it
#         is broader than `dist/` strictly requires. Deliberate: which comments survive the
#         dts rollup is a property of the BUILD, and a gate whose answer depends on tsup
#         inlining decisions would change colour when the bundler is upgraded.
#   (xv)  A POSITIVE SELF-TEST SAMPLE IS DISJUNCTIVE, SO MOST RULE ALTERNATIVES ARE ASSERTED
#         BY NOTHING. `grep -q` stops at the first match, so one sample holding several
#         banned spellings proves only that ONE of them still matches. A NEGATIVE sample
#         does not have this shape: it asserts that nothing matches, so every entry in it is
#         independently load-bearing.
#
#         MEASURED, NOT REASONED, and found by a reviewer against the version of this file
#         that shipped it. Deleting a single alternative from a rule and re-running against
#         a seeded live violation: for NINE of the twelve alternatives across rules 2 to 6
#         (`wave \d+`, `documentation residual`, the `P\d+ safety|documentation` arm,
#         `conventions\.md`, `ecosystem-map\.md`, `operations/plans/`, `BACKLOG\.md`, the
#         `open-question` arm, and narrowing the ADR rule to the hyphen form) the gate
#         printed OK over the violation with every self-test green.
#
#         RULE 1 IS THE EXCEPTION AND IT IS NOT SPECIAL, IT IS JUST THE ONE THAT WAS PAID
#         FOR: RULE1_MUST_MATCH_ALONE asserts its spellings individually, because a control
#         run restored the sibling `X12-` exclusion and this file reported OK, `CCDA-P7`
#         having matched first. The same shape is LIVE in rules 2 to 6 and is NOT closed
#         here. Closing it means a per-alternative positive sample per rule, which is its
#         own change with its own review; it is not smuggled in on the back of a port.
#         DO NOT READ THE SELF-TESTS AS PROVING "each rule still matches what it bans."
#         They prove each rule still matches SOMETHING it bans, plus, for rule 1, five
#         named spellings.
#  (xvi)  SOURCE STRING LITERALS ARE NOT SCANNED, AND SOME OF THEM SHIP AS RUNTIME VALUES.
#         The third pass extracts `/** */` blocks only. A `Phase 10` inside an EXPORTED
#         STRING is invisible to it, reaches `dist/index.mjs` and `dist/index.cjs` rather
#         than the declarations, and is read by a consumer at run time rather than on hover.
#         MEASURED at the commit that added this file: the `meta.note` field of five bundled
#         code-list snapshots carries exactly that, and `CodeListSnapshot.note` is an
#         exported typed field. The boundary this gate draws is therefore NOT "everything a
#         consumer receives"; it is the markdown surface, the npm metadata, and the doc
#         comments. Say it that way. The remedy for those five strings is a change of its
#         own: a runtime value has a different carrier and a different review path from a
#         comment, which is the same call this repo made when it declined to fold a warning
#         message into a comment-only correction.
#
# Run it locally with `pnpm check:no-internal-refs`.
set -euo pipefail

# LOCALE PIN, load-bearing, and inherited from check-no-emdash for the same measured
# reason: `grep -P` compiles PCRE in UTF-8 mode only when the locale says so. Under
# LC_CTYPE=POSIX (a bare container, cron, `sh -c`) GNU grep's handling of non-ASCII in the
# input and of `\w` in the pattern changes, and the docs scanned here contain non-ASCII
# (the `·` separator, `§`, curly quotes). A gate whose matching depends on an inherited
# environment is a gate that reports green somewhere and red elsewhere.
export LC_ALL=C.UTF-8

# ---------------------------------------------------------------------------
# THE BANNED SET, transcribed from release-notes.mjs CONTENT_RULES
# ---------------------------------------------------------------------------

# Known project and programme prefixes. THE KEYING IS ON THESE, NEVER ON THE `WORD-N`
# SHAPE: see trap (1) above. Order matters only for readability. Kept in the same order as
# the source list so a diff between the two is legible.
# THE LIST IS KEPT BYTE-FOR-BYTE AS THE SIBLINGS CARRY IT, deliberately, so a diff between
# the copies stays legible: residual (i) below says a prefix added in one place does not
# appear in the others, and a divergence invented here would make that worse rather than
# better. RE-DERIVED before keeping it: of these prefixes, `X12` is the ONLY one that fires
# anywhere on this repo's scanned surface (82 matches). Checked for the trap-(1) collision
# in the other direction too, because this repo's vocabulary is segment ids: no 005010
# segment id in this package's readers collides with an entry above. `PWK` is the near miss
# and it is safe, because the rule requires a `-` immediately after the prefix and `PWK-01`
# offers a `K`. That is asserted, not argued: `PWK-01` is in the NEGATIVE sample.
PROJECT_PREFIXES='PARSERS-PUBLIC|DOCS-CONTENT|KNOWLEDGEBASE|TERMINOLOGY|PATHWAYS|TRANSFORM|WEBSITE|STAGING|SUPPLY|NCPDP|ASSETS|EMDASH|README|CONFIG|DICOM|SYNTH|DEID|CCDA|ASTM|MLLP|FHIR|CREW|DOCS|PERF|SYNC|VERSION|PUBLIC|HL7|X12|IAC|CLI|KB|PW|PUB|CI|REAL|TERM|WF|VERIFY'

# STANDARDS DESIGNATIONS THAT COLLIDE WITH THE PREFIX LIST, excluded explicitly. Eight of
# the prefixes above (`HL7`, `X12`, `DICOM`, `FHIR`, `NCPDP`, `CCDA`, `ASTM`, `MLLP`) are
# the names of standards this ecosystem parses as well as the names of our projects, and a
# consumer of a toolkit needs to read `HL7-V2`, `FHIR-R4`, `DICOM-SR` and `NCPDP-SCRIPT` in
# the docs. Those are reference material; `HL7-N` and `MLLP-10` are ours. There is no shape
# that separates them, so the separation is an explicit, reviewable exclusion list, which is
# the same bargain as keying on prefixes in the first place: it must be extended by hand, and
# that is the cheaper mistake. Every entry here is asserted in this rule's NEGATIVE sample.
#
# ===========================================================================
# THE `X12-` FORMS ARE DELIBERATELY ABSENT, AND THIS IS THE ONE PLACE THIS COPY MUST NOT
# TRACK ITS SIBLINGS. IT IS A MEASUREMENT, NOT A PREFERENCE. DO NOT RESTORE THEM.
# ===========================================================================
# Every other copy of this gate carries `X12-\d{3}[A-Z]?|X12-\d{6}` here, and in every other
# repo that is right: there, `X12-837P` is reference material and `X12` is nobody's item
# prefix. THIS is the repo where `X12` is BOTH the standard and our own programme prefix, and
# the two spellings are not disjoint the way ccda's are (`CCDA-R2.1` the standard vs
# `CCDA-P7` the item: different second characters, so a narrow exclusion separates them).
# `X12-837P` the standard and `X12-837-RESIDUALS` the item share the head `X12-837`, and
# `\b` sits between the `7` and the following `-`, so the sibling exclusion swallows the item
# identifier whole.
#
# COUNTED ON THIS TREE at the commit that added this file, with two independent tools
# (`grep -oP` over `git ls-files -z | xargs -0`, and `rg`, agreeing exactly):
#   * `X12-\d{3}[A-Z]?` matches 141 times across tracked files. ALL 141 ARE INTERNAL ITEM
#     IDENTIFIERS, in eight spellings and not one standards designation:
#     `X12-837-LOOP-RESIDUALS` (30), `X12-837-SV-UNDEFINED-DECIMAL` (22),
#     `X12-837-SV-SILENT-ZERO` (21), `X12-837-RESIDUALS` (19),
#     `X12-837-EMIT-IDENTIFIER-FIXED` (14), `X12-837-AMBIGUOUS-VARIANT` (13),
#     `X12-837-SV1-OVERWRITE` (11), `X12-277-SVC07-NOT-DECODED` (11).
#   * `X12-\d{6}` matches ZERO times anywhere in the tree.
#   * Six of those 141 sit on surfaces this gate scans: 3 on the public surface
#     (`KNOWN-LIMITATIONS.md`, which `files` ships) and 3 in `src/` doc comments, which
#     compile into `dist/index.d.ts` and `dist/index.d.cts`.
#   * The hyphenated standards spelling this exclusion exists to protect occurs ZERO times.
#     This tree writes transaction sets and guides BARE: `837P`, `005010X222A1`, `835`,
#     `271` (`005010[A-Z]\d{3}` alone: 77 on the public surface, 265 in `src/`).
#
# So carrying the sibling line verbatim would have printed OK over six live violations on
# the shipping surface while reporting that it had scanned it. That is not a hypothetical:
# it was measured on this tree before this file was written.
#
# THE COST OF DROPPING THEM, stated rather than discovered: a future page that writes
# `X12-837P` or `X12-005010` with a hyphen now REDS, and the remedy is to write the bare
# form the rest of this corpus already uses. That is the same trade rule 2 makes on a bare
# `Phase III`: a loud red on a spelling with zero instances beats a silent hole over a
# spelling with 141. `X12-837P` is therefore asserted in POSITIVE[0], not NEGATIVE[0], and
# the bare forms are asserted in NEGATIVE[0] so a later "simplification" that restores the
# sibling line reds here instead of going quiet on the surface again.
STANDARDS_DESIGNATION='HL7-(?:V2|V3|CDA|FHIR|OMG|\d{3,4}[A-Z]?)|FHIR-R\d[A-Z]?|DICOM-(?:SR|RT|SEG|DIR|PS\d)|NCPDP-(?:SCRIPT|TELECOM|D\.\d)|CCDA-R\d(?:\.\d)?|ASTM-E\d+'

# Rule 1: internal project identifier. CASE SENSITIVE, and the segment after the hyphen
# must start with an uppercase letter or a digit, which is what lets `FHIR-bridge` and
# `HL7-defined` through (trap 3). The second alternative is our internal priority label,
# and it matches its own trailing word rather than looking ahead for one: an earlier
# version keyed on `P\d+` followed by end-of-string or a comma, which is the shape rule
# this file exists to avoid. It deleted the ICD-10-CM code in "Map ICD-10 P07, P22 and P29
# to SNOMED CT" and truncated the code range "P00-P96". Corrupting a diagnosis code to
# remove an internal label is not a trade worth making.
#
# The collisions this rule has to survive are not hypothetical, and both were found by a
# refuter against an earlier draft of this file rather than by design. An HL7 v2 TABLE
# reference is a three- or four-digit number (Table 0396 code systems, Table 0003 event
# types, Table 0076 message types) and written with a hyphen it is typographically
# identical to one of our item identifiers; and `HL7-V2`, `FHIR-R4`, `DICOM-SR`,
# `NCPDP-SCRIPT` and `X12-837P` are standards designations a consumer needs. Both are
# excluded by name above, and both are asserted in NEGATIVE[0] so a later "simplification"
# cannot quietly drop them.
RULE_NAME[0]='internal project identifier'
RULE_PATTERN[0]='\b(?!(?:'"$STANDARDS_DESIGNATION"')\b)(?:'"$PROJECT_PREFIXES"')(?:-[A-Z0-9][A-Z0-9.]*)+\b|\bP\d+ (?:safety|documentation)\b'

# Rule 2: phase and wave language. CASE INSENSITIVE via the inline `(?i)`, because the
# rules do not share a case policy and one `grep -i` for all of them would break trap (3).
# `Phase 5b` and `Phase W` are both covered (trap 4). The negative lookahead keeps ordinary
# English off the list, so "in phase with the source system" and "out of phase" survive.
#
# TWO GUARDS THAT ARE NOT IN THE SOURCE RULE, both inherited from the hl7 copy where
# `phase` is live clinical vocabulary: HL7 v2's Chapter 7 **Clinical Study Phase** segment
# has field names that read literally `CSP-1 Study Phase Identifier`, `CSP-2 Study Phase
# Start Date/Time`, `CSP-3 Study Phase End Date/Time` and `CSP-4 Study Phase Evaluability`,
# and a rule that flags those tells the remediator to rewrite a spec field name, which is
# trap (1) arriving through the phase rule instead of the identifier rule.
#
# THE GUARDS ARE KEPT HERE THOUGH `CSP` IS AN HL7 SEGMENT AND NOT AN X12 ONE, and that is a
# choice rather than an oversight. They cost this repo nothing (they only ever NARROW the
# rule, and the narrowing is asserted in NEGATIVE[1]), they keep this copy diffable against
# the siblings, and the ordinary clinical senses they protect (`acute phase`, `chronic
# phase`, `the phase of the trial`) are English an X12 parser's docs can reach for as
# readily as an HL7 one's. Removing them would be a rule change with no measurement behind
# it. So:
#   * the lookbehinds drop `study|clinical|trial` and the ordinary clinical senses
#     (`acute|chronic|luteal|follicular|liquid|gas`) before `phase`;
#   * the lookahead drops the CSP field-name tails and the clinical-trial roman numerals
#     when they are followed by trial vocabulary (`Phase III oncology trial`).
# A BARE `Phase III` is still flagged, because it is genuinely ambiguous with our own
# single-letter items and a loud red on a rare line beats a silent hole. `phase[ -]` rather
# than `phase ` is the other change: `Phase-L` was live in this repo's own docs and slipped
# a space-only rule.
ORDINAL='(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-first|twenty-second|twenty-third|twenty-fourth|\d+(?:st|nd|rd|th))'
PHASE_NOT_CLINICAL='(?<!study )(?<!clinical )(?<!trial )(?<!acute )(?<!chronic )(?<!luteal )(?<!follicular )(?<!liquid )(?<!gas )'
PHASE_NOT_FIELD='(?!of\b|with\b|in\b|out\b|the\b|and\b|is\b|for\b|to\b|identifier\b|start\b|end\b|evaluability\b|number\b|(?:I{1,3}|IV)\s+(?:trial|stud|clinical|oncolog))'
RULE_NAME[1]='phase or wave language'
RULE_PATTERN[1]='(?i)\b(?:roadmap phase\b[ ]?[A-Za-z0-9]*|'"$PHASE_NOT_CLINICAL"'phase[ -]'"$PHASE_NOT_FIELD"'[A-Za-z0-9]+[a-z]?\b|wave \d+\b|the \w+ and final phase\b|documentation residual\b|'"$ORDINAL"' (?:slice|wave)\b)'

# Rule 3: ADR references. An ADR number is a pointer into a repo the reader cannot open.
RULE_NAME[2]='ADR reference'
RULE_PATTERN[2]='(?i)\bADR[ -]?\d{3,4}\b'

# Rule 4: `slice`, our internal word for a unit of work. It is ALSO real clinical
# vocabulary: a DICOM study has slices, with a slice thickness, a slice location and slice
# spacing, and this package's own docs reach for imaging vocabulary where an 837 carries a
# radiology service line. So this keys on the
# determiner forms that are unambiguously ours ("this slice", "the final slice") and
# excludes the imaging nouns. A bare `slice` is deliberately NOT flagged: across this
# corpus that word is more often the reader's than ours. The imaging-noun list is grounded
# in @cosyte/dicom's generated tag dictionary (SliceThickness, SliceLocation,
# SpacingBetweenSlices, SliceVector, NumberOfSlices, TimeSliceVector,
# SliceProgressionDirection, SliceSensitivityFactor). A modifier may sit between the
# determiner and the noun ("the misfiling-prevention slice") but a preposition may not:
# "the Number of Slices" is a DICOM attribute, not one of our units of work.
#
# `phase` IS DELIBERATELY NOT MATCHED HERE, and it was, for one revision. A refuter pass
# added it to catch "non-goals of this phase"; the next pass measured what it cost and the
# answer was ordinary clinical English: "the phase of the clinical study", "the phase of
# illness" and "each phase of the trial". No modifier exclusion list rescues that, because
# the collision is with the
# HEAD noun rather than the modifier. So this rule is back to the lifted `slice` form and
# the determiner-plus-`phase` construction is a STATED RESIDUAL, not a covered case: rule 1
# still catches `phase X`, and "of this phase" with no following identifier is a reviewer's
# catch. That is the trade this file makes everywhere. When the collision is with clinical
# reference material, the reference material wins, and a gate that is narrower than the rule
# it enforces is worth more than one that quietly corrupts an HL7 page.
IMAGING_NOUNS='thickness|location|spacing|position|interval|order|number|index|gap|count|data|pixel|orientation|plane|direction|width|vector|sensitivity|progression|factor'
RULE_NAME[3]='internal jargon ("slice")'
RULE_PATTERN[3]='(?i)\b(?:this|that|the|each|another|previous|next|final|current)\s+(?:(?!(?:of|in|on|between|per|for|to|with|at)\s)[\w-]+\s+){0,2}slices?\b(?!\s+(?:'"$IMAGING_NOUNS"'))'

# Rule 5: internal repo paths. This is the ONE rule not present in release-notes.mjs, and
# it is added rather than lifted because a release body is prose while a docs page carries
# citations. Live in this repo when the gate landed: `src/transactions/remit/balance.ts`
# cited `operations/roadmaps/x12.md` inside a doc comment that compiles into
# `dist/index.d.ts`, and a reader who installs @cosyte/x12 has no such file and no such
# repo. Keyed on the known meta-repo
# paths, not on a `dir/file.md` shape, for exactly the reason trap (1) gives.
RULE_NAME[4]='internal repo path'
RULE_PATTERN[4]='\boperations/(?:BACKLOG\.md|roadmaps/|plans/)|\bdocumentation/(?:decisions/|ecosystem-map\.md|conventions\.md)|\bBACKLOG\.md\b'

# Rule 6: internal traceability markers. Also added rather than lifted, and found by
# reading this repo's own docs rather than by design: the spec notes carried bracketed
# spec-trace tags (`[S-DTM-IMPL]`, `[S-NTE]`) that key into the roadmap's traceability
# table, and an "Open-question #12" that points at a decision log the reader cannot open.
# Both are DELIMITER-ANCHORED rather than shape-keyed, which is the only reason they are
# safe: the tag rule requires a literal `[S-` opening bracket and at least two characters
# after it, so a documented character range like `[S-Z]` does not match, and neither does
# a value set written `[SNOMED]`.
RULE_NAME[5]='internal traceability marker'
RULE_PATTERN[5]='\[S-[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*\]|(?i:\bopen[- ]question #?\d+\b)'

RULE_COUNT=6

# ---------------------------------------------------------------------------
# THE `src/` DOC-COMMENT RULE SET, deliberately a SEPARATE ARRAY
# ---------------------------------------------------------------------------
#
# WHY A SECOND SURFACE EXISTS AT ALL. The block above scans markdown a reader browses.
# This one scans the JSDoc a consumer's EDITOR renders: `src/` doc comments are compiled
# into `dist/index.d.ts` and `dist/index.d.cts` by tsup, `dist` is the first entry in
# package.json's `files`, and every `npm i @cosyte/x12` receives them. MEASURED ON THIS
# TREE at the commit that added this file: tracked `src/**/*.ts` carried 212 doc-comment
# hits against these rules, and a local build of the base commit had already put 80 lines
# of that bookkeeping into `dist/index.d.ts` -- 13 item identifiers, 64 lines of phase and
# wave framing, 2 of "slice" jargon and 1 meta-repo path, on the declarations a consumer's
# editor renders on hover. `dist/index.d.cts` carried the same bytes. That is the argument
# for this pass in one line: the twins ship, and internal framing is where stale claims
# hide.
#
# WHY A SEPARATE ARRAY RATHER THAN REUSING RULE_PATTERN. Code comments are not markdown.
# The two surfaces have different collision profiles (TypeScript prose says `.slice()`
# and "a slice of the map"; markdown says "the thirteenth slice"), different wrap shapes,
# and different self-test material. Sharing one array would mean a fix for one surface
# silently retunes the other, and the negative self-test that caught it would be in the
# wrong file's language. They START identical. They are ALLOWED to diverge, and when they
# do, each side's NEGATIVE sample is what stops the divergence from being a widening.
#
# WHAT IS SCANNED, precisely: only text inside `/** ... */` blocks. NOT `//` line
# comments and NOT `/* */` block comments, and that boundary is the whole point rather
# than a convenience. `/** */` is what the dts build carries into `dist`; `//` is not
# (checked: "Escape-fidelity overlay" survives into `dist/index.d.ts` from a doc comment,
# while "positional NTE grouping" from a `//` comment does not appear at all). The
# convention names source comments as a place identifiers BELONG. So the line this draws
# is exactly the founder's line: what a CONSUMER receives is public and is swept; what
# only a maintainer reads stays internal. The `//` and trailing-comment bookkeeping left
# in `src/` on that basis is deliberate; see SCAN SURFACE above for why no count is
# published for it.
SRC_RULE_NAME[0]="${RULE_NAME[0]}"; SRC_RULE_PATTERN[0]="${RULE_PATTERN[0]}"
SRC_RULE_NAME[1]="${RULE_NAME[1]}"; SRC_RULE_PATTERN[1]="${RULE_PATTERN[1]}"
SRC_RULE_NAME[2]="${RULE_NAME[2]}"; SRC_RULE_PATTERN[2]="${RULE_PATTERN[2]}"
SRC_RULE_NAME[3]="${RULE_NAME[3]}"; SRC_RULE_PATTERN[3]="${RULE_PATTERN[3]}"
SRC_RULE_NAME[4]="${RULE_NAME[4]}"; SRC_RULE_PATTERN[4]="${RULE_PATTERN[4]}"
SRC_RULE_NAME[5]="${RULE_NAME[5]}"; SRC_RULE_PATTERN[5]="${RULE_PATTERN[5]}"
SRC_RULE_COUNT=6

# ---------------------------------------------------------------------------
# SELF-TESTS. A gate is believed only after it has shown it can still see.
# ---------------------------------------------------------------------------
#
# Two halves, and the second is the one that is unusual. POSITIVE samples prove each rule
# still matches what it bans (the check-no-emdash property: refuse to report a clean tree
# from a scanner that cannot see). NEGATIVE samples prove each rule still lets through the
# reference material it was most likely to destroy, which is trap (1) turned into an
# assertion: if someone "simplifies" the identifier rule to a `WORD-N` shape, the negative
# self-test reds here instead of silently deleting `ISA-06` from this parser's docs on the
# next sweep. Both halves run on every invocation, local and CI, and both refuse rather
# than warn.

self_test_fail() {
  echo "ERROR: check-no-internal-refs - SELF-TEST FAILED: $1" >&2
  echo "       The scanner is not behaving as specified, so no result from it can be" >&2
  echo "       believed. Refusing to report on the tree." >&2
  exit 1
}

# rule index -> text that MUST match.
#
# `X12-837P` AND `X12-005010` ARE IN THIS POSITIVE SAMPLE AND ARE IN THE NEGATIVE SAMPLE IN
# EVERY SIBLING COPY. That inversion is the whole of this port's divergence, it is argued
# with counts at STANDARDS_DESIGNATION above, and it is asserted here so that restoring the
# sibling exclusion reds this self-test instead of going quiet over the surface again. The
# two item spellings beside them are REAL identifiers out of this repo's own history, and
# both were live on a shipping carrier when this gate landed: a copy carrying the sibling
# exclusion matches NEITHER of them.
POSITIVE[0]='Item X12-837-RESIDUALS is done, X12-277-SVC07-NOT-DECODED and CCDA-P7 with it, and X12-837P and X12-005010 are ours to spell bare'
POSITIVE[1]='Phase 5b closes it (Phase W, Phase-L and the thirteenth slice landed earlier, in wave 2)'
POSITIVE[2]='Decided in ADR 0015 and restated in ADR-0021'
POSITIVE[3]='This slice adds the helper and the final slice removes it'
POSITIVE[4]='Roadmap operations/roadmaps/x12.md and documentation/decisions/0015-x.md'
POSITIVE[5]='Repeating [S-NTE], and Open-question #12 resolves the direction'

# rule index -> text that must NOT match. Every entry is real reference material a consumer
# of an X12 parser needs, or ordinary English that collides with our jargon.
#
# THE SEGMENT-FIELD LIST IS THIS REPO'S OWN VOCABULARY, not hl7's. `ISA-06`, `ST-03`,
# `TA1-02`, `SVC-07`, `SV1-02`, `CLM-05`, `HI-02`, `CLP-01`, `PLB-03`, `IK3-04` and the rest
# are 005010 data-element references, and a rule widened into the `WORD-N` shape deletes them
# from the docs this package exists to provide. `PWK-01` is here on purpose: `PW` is a
# project prefix, and this asserts that the prefix does not eat a segment id that merely
# starts with it. The bare transaction-set and guide spellings this corpus actually uses
# (`837P`, `005010X222A1`, `835`, `271`) are asserted here for the same reason: they are what
# the hyphenated designation was traded away for.
NEGATIVE[0]='ISA-06 and ISA-12 header slots, GS-08 version, ST-03 implementation reference, SE-01 count, TA1-02 date, NM1-03 name, CLM-05 composite, SV1-02 charge, SV2-03 and SV3-06 units, HI-02 diagnosis, DTP-03 date, REF-02 identifier, CAS-03 amount, SVC-01 and SVC-07 service, AMT-02 monetary, PWK-01 report type, CLP-01 claim identifier, PLB-03 adjustment, IK3-04 and IK4-03 syntax notes, AK9-01 status, BPR-02 amount, TRN-02 trace, PER-04 contact, N4-03 postal, HL-01 identifier, PRV-03 taxonomy, SBR-09 filing, MOA-01 and MIA-05 outpatient, LX-01 line, K3-01 file information, CTX-01 context, EB-03 benefit, EQ-01 inquiry, AAA-03 reason, III-02 industry, QTY-02 quantity, ADX-01 adjustment; ICD-10-CM P00-P96, X12-aware and X12-internal helpers, docs-content/ layout, HL7-V2 and HL7-CDA, FHIR-R4, DICOM-SR and DICOM-RT, NCPDP-SCRIPT and NCPDP-D.0; 837P and 837I and 837D guides, 005010X222A1 and 005010X221A1, 835 remittance, 271 and 277CA and 999 responses'
NEGATIVE[1]='CSP-1 Study Phase Identifier, CSP-2 Study Phase Start Date/Time, CSP-3 Study Phase End Date/Time, CSP-4 Study Phase Evaluability; a Phase III oncology trial and a Phase II study; the acute phase reactant; the adapter stays in phase with the source system and is out of phase'
NEGATIVE[2]='ADR is not a segment, and 0015 alone is a value'
NEGATIVE[3]='The slice thickness and the number of slices are DICOM attributes, each slice location is too, and the phase of the clinical study, the phase of illness and each phase of the trial are the reader words this rule must not touch'
NEGATIVE[4]='Parser operations are documented in the README, and documentation for the API is generated'
NEGATIVE[5]='A character range like [S-Z], a value set written [SNOMED], and open questions about the feed'

# ---------------------------------------------------------------------------
# PER-SPELLING POSITIVE ASSERTIONS FOR RULE 1. This block exists because the
# POSITIVE/NEGATIVE pair above is NOT symmetric, and the asymmetry was measured here rather
# than reasoned about.
#
# A NEGATIVE sample is CONJUNCTIVE: it asserts that NOTHING in it matches, so every entry in
# it is independently load-bearing and dropping a rule's coverage of any one of them reds.
# A POSITIVE sample is DISJUNCTIVE: `grep -q` is satisfied by the FIRST match, so every entry
# after it is decoration. Put four spellings in one positive sample and three of them are
# asserting nothing.
#
# THAT IS NOT HYPOTHETICAL, AND IT IS THE REASON THIS BLOCK EXISTS. The control run for this
# port restored the sibling `X12-\d{3}[A-Z]?|X12-\d{6}` exclusion and expected a red. The
# gate printed OK: `CCDA-P7` sat in the same positive sample, matched first, and the four
# `X12-` spellings the whole divergence is about were silently uncovered. The divergence
# argued at length at STANDARDS_DESIGNATION was, at that moment, guarded by nothing.
#
# So each spelling is asserted ALONE, one sample one token. `X12-837-RESIDUALS` and
# `X12-277-SVC07-NOT-DECODED` are real identifiers from this repo's history and are the two
# shapes the sibling exclusion swallows; `X12-837P` and `X12-005010` are the hyphenated
# standards spellings this copy deliberately reds on. If someone restores the sibling line,
# all four fail here, by name, instead of the tree going quiet.
RULE1_MUST_MATCH_ALONE=('X12-837-RESIDUALS' 'X12-277-SVC07-NOT-DECODED' 'X12-837P' 'X12-005010' 'CCDA-P7')

for sample in "${RULE1_MUST_MATCH_ALONE[@]}"; do
  if ! printf '%s\n' "$sample" | grep -qP -e "${RULE_PATTERN[0]}"; then
    self_test_fail "rule '${RULE_NAME[0]}' no longer matches '${sample}' on its own. In THIS repo \`X12\` is both the standard and our own project prefix, so the sibling copies' \`X12-\\d{3}\`/\`X12-\\d{6}\` standards exclusion swallows our item identifiers whole. Read the counted argument at STANDARDS_DESIGNATION before changing that line."
  fi
  if ! printf '%s\n' "$sample" | grep -qP -e "${SRC_RULE_PATTERN[0]}"; then
    self_test_fail "src rule '${SRC_RULE_NAME[0]}' no longer matches '${sample}' on its own, so the doc-comment surface that compiles into dist/ is uncovered for it."
  fi
done

# `X12-` FOLLOWED BY LOWERCASE MUST STILL PASS, asserted alone for the same reason: these are
# ordinary English compounds live in this tree (`X12-aware`, `X12-internal`) and the case rule
# in trap (3) is the only thing letting them through.
for sample in 'X12-aware' 'X12-internal' 'X12-maintained' 'X12-shape-aware'; do
  if printf '%s\n' "$sample" | grep -qP -e "${RULE_PATTERN[0]}"; then
    self_test_fail "rule '${RULE_NAME[0]}' now matches '${sample}', which is ordinary prose in this tree. The identifier rule is CASE SENSITIVE after the hyphen (trap 3); a case-insensitive widening destroys it."
  fi
done

i=0
while [ "$i" -lt "$RULE_COUNT" ]; do
  if ! printf '%s\n' "${POSITIVE[$i]}" | grep -qP -e "${RULE_PATTERN[$i]}"; then
    self_test_fail "rule '${RULE_NAME[$i]}' no longer matches its own positive sample."
  fi
  if printf '%s\n' "${NEGATIVE[$i]}" | grep -qP -e "${RULE_PATTERN[$i]}"; then
    hit=$(printf '%s\n' "${NEGATIVE[$i]}" | grep -oP -e "${RULE_PATTERN[$i]}" | head -1)
    self_test_fail "rule '${RULE_NAME[$i]}' now matches legitimate reference material (matched: '${hit}'). This is the WORD-N trap: it destroys the 005010 segment-field references this parser's docs exist to provide."
  fi
  i=$((i + 1))
done

# The `src/` set gets its OWN self-tests, in the language of the surface it guards. The
# NEGATIVE samples are built from material that is actually present in this package's
# source: 005010 segment-field references in doc comments, DICOM imaging vocabulary the
# service-line docs reach for, and TypeScript that reads like our jargon
# (`elements.slice()`, `raw.slice(4, 8)`). If someone widens the `src` rules into the
# WORD-N shape, this reds instead of deleting `ISA-06` from an exported function's
# IntelliSense on the next sweep.
SRC_POSITIVE[0]='Item X12-837-RESIDUALS is done, X12-277-SVC07-NOT-DECODED and CCDA-P7 with it, and X12-837P and X12-005010 are ours to spell bare'
SRC_POSITIVE[1]='Phase 5b closes it (Phase W, Phase-L and the thirteenth slice landed earlier, in wave 2)'
SRC_POSITIVE[2]='Decided in ADR 0015 and restated in ADR-0021'
SRC_POSITIVE[3]='This slice adds the helper and the final slice removes it'
SRC_POSITIVE[4]='Roadmap operations/roadmaps/x12.md and documentation/decisions/0015-x.md'
SRC_POSITIVE[5]='Repeating [S-NTE], and Open-question #12 resolves the direction'

SRC_NEGATIVE[0]='ISA-06 and ISA-12 header slots, GS-08 version, ST-03 implementation reference, SE-01 count, TA1-02 date, NM1-03 name, CLM-05 composite, SV1-02 charge, SV2-03 and SV3-06 units, HI-02 diagnosis, DTP-03 date, REF-02 identifier, CAS-03 amount, SVC-01 and SVC-07 service, AMT-02 monetary, PWK-01 report type, CLP-01 claim identifier, PLB-03 adjustment, IK3-04 and IK4-03 syntax notes, AK9-01 status, BPR-02 amount, TRN-02 trace, PER-04 contact, N4-03 postal, HL-01 identifier, PRV-03 taxonomy, SBR-09 filing, MOA-01 and MIA-05 outpatient, LX-01 line, K3-01 file information, CTX-01 context, EB-03 benefit, EQ-01 inquiry, AAA-03 reason, III-02 industry, QTY-02 quantity, ADX-01 adjustment; ICD-10-CM P00-P96, X12-aware and X12-internal helpers, HL7-V2 and HL7-CDA, FHIR-R4, DICOM-SR, NCPDP-SCRIPT; 837P and 837I and 837D guides, 005010X222A1 and 005010X221A1, 835 remittance, 271 and 277CA and 999 responses'
SRC_NEGATIVE[1]='CSP-1 Study Phase Identifier, CSP-2 Study Phase Start Date/Time, CSP-3 Study Phase End Date/Time, CSP-4 Study Phase Evaluability; a Phase III oncology trial and a Phase II study; the acute phase reactant; the adapter stays in phase with the source system and is out of phase'
SRC_NEGATIVE[2]='ADR is not a segment, and 0015 alone is a value'
SRC_NEGATIVE[3]='The slice thickness and the number of slices are DICOM attributes, each slice location is too; subcomponents.slice() and path.slice(4, 8) are TypeScript; and the phase of the clinical study, the phase of illness and each phase of the trial are the reader words this rule must not touch'
SRC_NEGATIVE[4]='Parser operations are documented in the README, and documentation for the API is generated'
SRC_NEGATIVE[5]='A character range like [S-Z], a value set written [SNOMED], and open questions about the feed'

i=0
while [ "$i" -lt "$SRC_RULE_COUNT" ]; do
  if ! printf '%s\n' "${SRC_POSITIVE[$i]}" | grep -qP -e "${SRC_RULE_PATTERN[$i]}"; then
    self_test_fail "src rule '${SRC_RULE_NAME[$i]}' no longer matches its own positive sample."
  fi
  if printf '%s\n' "${SRC_NEGATIVE[$i]}" | grep -qP -e "${SRC_RULE_PATTERN[$i]}"; then
    hit=$(printf '%s\n' "${SRC_NEGATIVE[$i]}" | grep -oP -e "${SRC_RULE_PATTERN[$i]}" | head -1)
    self_test_fail "src rule '${SRC_RULE_NAME[$i]}' now matches legitimate reference material (matched: '${hit}'). This is the WORD-N trap, arriving through the source-comment surface: it destroys the 005010 segment-field references this parser's IntelliSense exists to provide."
  fi
  i=$((i + 1))
done

# ---------------------------------------------------------------------------
# Refusals. Anything the scanner writes to stderr means it did not read everything it was
# given, and an incomplete scan must never print OK. Exit status cannot carry that signal:
# grep exits 1 on "no match", which xargs reports as 123, so "clean" and "died part way
# through the batch" are indistinguishable by code. A match inside input grep classifies
# as binary also arrives on stderr with empty stdout.
# ---------------------------------------------------------------------------
ERRLOG=$(mktemp)
FILELIST=$(mktemp)
SCANLIST=$(mktemp)
NPMBUF=$(mktemp)
REFLOWBUF=$(mktemp)
RAWBUF=$(mktemp)
SRCLIST=$(mktemp)
SRCSCAN=$(mktemp)
DOCLINES=$(mktemp)
DOCMAP=$(mktemp)
DOCFLOW=$(mktemp)
DOCFLOWMAP=$(mktemp)
trap 'rm -f "$ERRLOG" "$FILELIST" "$SCANLIST" "$NPMBUF" "$REFLOWBUF" "$RAWBUF" \
      "$SRCLIST" "$SRCSCAN" "$DOCLINES" "$DOCMAP" "$DOCFLOW" "$DOCFLOWMAP"' EXIT

refuse_if_incomplete() {
  [ -s "$ERRLOG" ] || return 0
  cat "$ERRLOG" >&2
  echo "" >&2
  # GNU grep >= 3.5 prints "grep: FILE: binary file matches" on STDERR with nothing on
  # stdout, so a match in input it cannot read as text arrives here rather than in the hit
  # list. Name that case, or the run reds blaming an I/O failure that never happened and
  # sends a reader hunting it. This branch only chooses the wording; every path exits 1.
  if grep -qi 'binary file' "$ERRLOG"; then
    echo "ERROR: check-no-internal-refs - the input named above MATCHED a banned pattern," >&2
    echo "       but grep classifies it as binary, so the hit has no line number. Treat it" >&2
    echo "       as a real violation, and repair the file's encoding (it should be UTF-8)." >&2
  fi
  if grep -qiv 'binary file' "$ERRLOG"; then
    echo "ERROR: check-no-internal-refs - the scan reported errors, so it did not read all" >&2
    echo "       of its input. Refusing to report green from an incomplete scan." >&2
  fi
  exit 1
}

fail_with_hits() {
  local what="$1" hits="$2"
  echo "$hits" >&2
  echo "" >&2
  echo "ERROR: check-no-internal-refs - internal project bookkeeping found in ${what}." >&2
  echo "       A consumer reads this surface. Item identifiers, phase and wave language," >&2
  echo "       ADR numbers and meta-repo paths belong in the changeset, CHANGELOG.md, the" >&2
  echo "       commit, the PR and the roadmap. Translate at the boundary: say what the" >&2
  echo "       software does and what changed." >&2
  echo "       When you strip an identifier off the FRONT of a line, repair the head too:" >&2
  echo "       drop a leading orphan parenthetical, strip leading punctuation, recapitalise." >&2
  echo "       Leaving the fragment behind is worse than the text it replaced." >&2
  echo "       Rule: documentation/conventions.md, 'No internal project bookkeeping on a" >&2
  echo "       public surface'." >&2
  exit 1
}

# ---------------------------------------------------------------------------
# Build the scan list
# ---------------------------------------------------------------------------
#
# `git ls-files` is relative to the working directory, so from a subdirectory it lists a
# subtree and the scan would report OK having skipped the rest of the surface. Anchor at
# the top level.
cd "$(git rev-parse --show-toplevel)"

# The public surface, as paths. Each is justified in the SCAN SURFACE note at the top.
#
# `KNOWN-LIMITATIONS.md` IS THE ENTRY THE HL7 COPY DOES NOT HAVE, and it is the one that
# earned this port most of its hits. It is the FOURTH entry in this package's `files`, so
# every `npm i @cosyte/x12` receives it, this repo's own guidance calls it "the canonical
# read-side list", and it is where a reader is sent for what the parser will not do. Counted
# when this gate landed: of the internal identifiers this rule found on the whole public
# surface, all but two were in that one file. Dropping it to match the sibling list would
# have left the gate green over the largest prose payload the tarball carries.
SURFACE_PATHS=(README.md TRADEMARKS.md LICENSE KNOWN-LIMITATIONS.md docs-content)

# Every named surface path must still be tracked. Without this, renaming or deleting
# README.md makes the gate scan less and still print OK, which is the same silent-green
# failure the routes below close, arriving through the file list instead of through grep.
for p in "${SURFACE_PATHS[@]}"; do
  if [ -z "$(git ls-files -- "$p")" ]; then
    echo "ERROR: check-no-internal-refs - the public surface path '$p' is not tracked." >&2
    echo "       Either it was renamed or removed (update SURFACE_PATHS in this script," >&2
    echo "       deliberately), or the scan is about to cover less than it claims." >&2
    echo "       Refusing to report green from a shrunken surface." >&2
    exit 1
  fi
done

# DRIFT TRIPWIRE on the npm tarball. `files` in package.json decides what a consumer
# actually receives, so anything added there is new public surface this gate would not know
# about. Rather than let that pass silently, refuse until someone puts it in SURFACE_PATHS
# or names it below as deliberately excluded.
#
# EVERY entry is checked, not just the prose-looking ones. An earlier version filtered
# `files` down to `*.md`/`*.txt`/`LICENSE` first, which discarded `dist` before checking and
# so structurally could not see the tarball's largest prose payload: the compiled JSDoc in
# `dist/index.d.ts`. A tripwire that cannot see the thing it was built to catch is the
# `CI-REQUIRED-CHECKS` defect in miniature. The two standing exclusions are named with their
# reasons in SCAN SURFACE above: `CHANGELOG.md` (contested, queued) and `dist` (untracked
# build output this script cannot read; its SOURCE is gated by the third pass instead).
command -v node >/dev/null || {
  echo "ERROR: check-no-internal-refs - node is required (to read package.json) and is not" >&2
  echo "       on PATH. Refusing to skip the npm-surface half of this gate." >&2
  exit 1
}
UNKNOWN_TARBALL_DOCS=$(node -e '
  const pkg = JSON.parse(require("fs").readFileSync("package.json", "utf8"));
  // Scanned by this gate:            README.md, TRADEMARKS.md, LICENSE, KNOWN-LIMITATIONS.md
  // Excluded deliberately, reasons in SCAN SURFACE: CHANGELOG.md, dist
  const known = new Set(["README.md", "TRADEMARKS.md", "LICENSE", "KNOWN-LIMITATIONS.md", "CHANGELOG.md", "dist"]);
  process.stdout.write((pkg.files ?? []).filter((f) => !known.has(f)).join(" "));
')
if [ -n "$UNKNOWN_TARBALL_DOCS" ]; then
  echo "ERROR: check-no-internal-refs - package.json 'files' ships something this gate does" >&2
  echo "       not cover: $UNKNOWN_TARBALL_DOCS" >&2
  echo "       That is public surface a consumer receives in the tarball. Add it to" >&2
  echo "       SURFACE_PATHS, or record it as a deliberate exclusion in this script." >&2
  exit 1
fi

git ls-files -z -- "${SURFACE_PATHS[@]}" > "$FILELIST"

if [ ! -s "$FILELIST" ]; then
  echo "ERROR: check-no-internal-refs - no tracked public-surface files to scan. Refusing" >&2
  echo "       to report green from a scan that read nothing." >&2
  exit 1
fi

# THE SILENT-GREEN ROUTES, all closed here and every one of them checked RED against a
# seeded violation before this landed rather than inherited on faith. This list is NOT a
# claim of exhaustiveness: route (8) was found by a refuter against a copy whose own
# comment implied it was already closed.
#
#   (1) THE SCANNER CANNOT SEE. NARROWED, NOT CLOSED, and the difference is measured in
#       residual (xv) below. The locale pin, the negative self-tests, and the per-spelling
#       assertions for rule 1 are real; the per-rule POSITIVE samples are NOT, because a
#       positive sample is disjunctive. Do not read this route as shut.
#   (2) AN EMPTY FILE LIST. `xargs` without `-r` runs grep anyway, and grep with no file
#       operand reads STDIN, finds nothing, and exits 0. Closed by `-r` AND by refusing an
#       empty list outright, above and again after the loop.
#   (3) `git ls-files` FAILS (unreadable or corrupt index) AND ITS STATUS IS ERASED. The
#       list is built as its OWN command, not as the head of the pipeline: piped, its
#       status is swallowed by the `|| true` the no-match case needs, and the scan reports
#       OK over an empty list.
#   (4) A PATH THE SCANNER NEVER RECEIVES. `git ls-files` C-quotes any path holding a
#       space, a quote or a non-ASCII byte, so unseparated, grep is handed a name no file
#       has. Closed by `-z` here and `-0` on xargs.
#   (5) A FILENAME PARSED AS AN OPTION. A tracked file named `-q` would silence the whole
#       batch and the gate would print OK. Closed by `-e` before the pattern and `--`
#       after it.
#   (6) A FILENAME READ AS STANDARD INPUT, which `--` does NOT close and which every
#       earlier copy of this shape still has. `--` stops `-` being parsed as an OPTION;
#       grep then reads the bare operand `-` as STDIN, and xargs points its child's stdin
#       at /dev/null, so a tracked file literally named `-` (a `cmd > -` typo, which
#       `git add -A` stages without complaint) is NEVER OPENED and the gate prints OK and
#       exits 0 over a live violation. Closed by `./`-prefixing every path AS THE LIST IS
#       BUILT, in the loop below rather than through `sed -z`, so the scan stays a single
#       command with the stderr capture bound to all of it and there is no GNU-only stage
#       that has no self-test of its own.
#       BE PRECISE ABOUT REACHABILITY HERE, because inheriting the claim unexamined is how
#       this route survived in five repos. grep treats only a BARE `-` operand as stdin,
#       and every path this gate scans is emitted by `git ls-files` under a listed surface
#       path. None of those is the repo root today, so the worst a file named `-` can
#       produce is `docs-content/-`, which grep opens normally (checked: it reds). The
#       route becomes live the moment SURFACE_PATHS gains a root-level entry (`.`, `*.md`,
#       a new root file). That was checked rather than argued: with `-` added to
#       SURFACE_PATHS and a root file named `-` holding a live identifier, the shipped
#       shape reds naming `./-`, and the same script with the prefix removed prints
#       "check-no-internal-refs: OK" and exits 0. The prefix is therefore kept as the
#       thing that makes widening the surface safe, not as decoration.
#   (7) AN UNREAD ENTRY THAT IS NOT A MISSED MATCH. `-d skip` silently skips a tracked
#       symlink to a directory: no stderr, so nothing refuses, and the gate goes green
#       having never opened it. `-d skip` is NOT used. The loop refuses a tracked entry
#       that is not a regular file BY NAME instead, which is louder. The `! -L` guard
#       matters: `-d` follows symlinks, so a symlink to a directory tests true and would
#       be skipped as if it were a gitlink.
#   (8) A SCAN THAT DIED PART WAY THROUGH AND REPORTED CLEAN. grep's exit status cannot
#       distinguish that from no-match. Closed by capturing stderr and refusing on any of
#       it; see refuse_if_incomplete.
#   (9) A VIOLATION THAT STRADDLES A LINE WRAP. Not inherited from the em-dash family at
#       all: that gate matches a single character, so line anchoring costs it nothing. Every
#       rule here except the bare identifier is multi-token, and this repo hard-wraps its
#       markdown, so `A future phase` / `may add ...` was live in `docs-content/` with the
#       gate printing OK over it. Closed by the paragraph-joined second pass at the bottom
#       of this file. Found by a refuter, against a version of this file whose own route
#       list said it was complete, which is the reason route (6) above is written the way
#       it is.
#
# Also, and not a route so much as a standing choice: NO `-I`. `-I` skips anything grep's
# heuristic calls binary, which includes a genuine TEXT file with a broken encoding, so a
# violation inside one would be skipped in silence. This repo's public surface is markdown
# and JSON with no binaries (checked: no tracked file under it holds a NUL byte), so losing
# `-I` makes a future binary a loud red instead of a silent miss. Fail closed, not open.
# `-H` is set so every hit carries its filename: grep omits the name when handed exactly
# one file, which an xargs batch boundary can produce.
: > "$SCANLIST"
gitlinks=0
scanned=0
while IFS= read -r -d '' f; do
  if [ -d "$f" ] && [ ! -L "$f" ]; then
    gitlinks=$((gitlinks + 1))
    continue
  fi
  if [ ! -r "$f" ]; then
    echo "ERROR: check-no-internal-refs - tracked file is not readable: $f" >&2
    echo "       Refusing to report green from a scan that could not open its input." >&2
    exit 1
  fi
  if [ ! -f "$f" ]; then
    echo "ERROR: check-no-internal-refs - tracked entry is not a regular file: $f" >&2
    echo "       Refusing to report green from a scan that skipped one of its inputs." >&2
    exit 1
  fi
  printf './%s\0' "$f" >> "$SCANLIST"
  scanned=$((scanned + 1))
done < "$FILELIST"

if [ ! -s "$SCANLIST" ]; then
  echo "ERROR: check-no-internal-refs - no public-surface files survived list building." >&2
  echo "       Refusing to report green from a scan that read nothing." >&2
  exit 1
fi

# The npm metadata is public surface that is not a file of its own. Extract the two fields
# the convention names and scan them as text. Written with a real newline between fields so
# a hit reports a usable line number.
node -e '
  const pkg = JSON.parse(require("fs").readFileSync("package.json", "utf8"));
  const lines = ["description: " + (pkg.description ?? ""), "keywords: " + (pkg.keywords ?? []).join(", ")];
  process.stdout.write(lines.join("\n") + "\n");
' > "$NPMBUF"
if [ ! -s "$NPMBUF" ]; then
  echo "ERROR: check-no-internal-refs - could not read the npm metadata from package.json." >&2
  echo "       Refusing to report green from a scan that read nothing." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Scan, one rule at a time so a hit can name the rule it broke
# ---------------------------------------------------------------------------
#
# Each rule is its own single command with its own stderr capture, rather than one merged
# pattern: a merged pattern cannot report WHICH rule fired, and "phase language" and
# "internal identifier" want different remediation advice. The cost is N passes over a
# handful of markdown files, which is nothing.
ALL_HITS=""
i=0
while [ "$i" -lt "$RULE_COUNT" ]; do
  : > "$ERRLOG"
  HITS=$(xargs -0 -r grep -H -nP -e "${RULE_PATTERN[$i]}" -- < "$SCANLIST" 2>>"$ERRLOG" || true)
  refuse_if_incomplete

  : > "$ERRLOG"
  NPM_HITS=$(grep -H -nP -e "${RULE_PATTERN[$i]}" -- "$NPMBUF" 2>>"$ERRLOG" || true)
  refuse_if_incomplete
  # Report the npm metadata under a name a reader can act on, not a temp path.
  [ -n "$NPM_HITS" ] && NPM_HITS=$(printf '%s\n' "$NPM_HITS" | sed "s|^${NPMBUF}|package.json (npm metadata)|")

  for block in "$HITS" "$NPM_HITS"; do
    [ -n "$block" ] || continue
    ALL_HITS="${ALL_HITS}[${RULE_NAME[$i]}]"$'\n'"${block}"$'\n'
  done
  i=$((i + 1))
done

# ---------------------------------------------------------------------------
# Second pass: the same rules over PARAGRAPH-JOINED text
# ---------------------------------------------------------------------------
#
# WHY THIS EXISTS, and it is the route that made the first version of this gate print OK
# over a live violation. Every rule above except the bare identifier is MULTI-TOKEN
# (`phase X`, `wave N`, `this slice`, `roadmap phase K`, `P3 safety`), grep matches within a
# line, and this repo hard-wraps its markdown at ~100 columns by house style. So a violation
# that happens to straddle a wrap is invisible to the line scan. It was not hypothetical:
# `docs-content/spec-notes-charset.md` read "... A future phase" / "may add opt-in decode
# ...", the gate printed `check-no-internal-refs: OK`, and a reader of the rendered page
# sees "A future phase may add" because markdown folds a soft line break into a space.
#
# So the file is joined the way markdown renders it (consecutive non-blank lines in a
# paragraph become one line, blank lines stay blank) and scanned again. Line numbers are
# lost by construction, so this pass reports the FILE and the MATCHED TEXT, and it reports
# only matches the line pass did not already produce, which keeps a wrapped hit from being
# printed twice in the same run.
#
# It cannot replace the line pass: that one gives line numbers, which is what a remediator
# actually needs. It is additive, and its cost is a second grep per file per rule over a
# handful of markdown files.
while IFS= read -r -d '' f; do
  # WHITESPACE IS SQUEEZED, and that is the whole difference between this pass working and
  # this pass looking as though it works. The first version joined lines verbatim, which
  # left the continuation line's own indentation in the joined text: an indented wrap
  # produced `phase   may`, and every rule here is written with single spaces, so it did not
  # match. Indented continuations are the DOMINANT wrap shape in this corpus (RE-DERIVED ON
  # THIS TREE, two tools agreeing: 1,999 of them across the 14 scanned public-surface files,
  # because the pages and KNOWN-LIMITATIONS.md are mostly bulleted), so the pass would have
  # missed the very case it was added for while reporting that it had run.
  # Squeezing runs of whitespace to one space is also what markdown itself does to a
  # paragraph, so this models the rendered page rather than approximating it.
  : > "$ERRLOG"
  awk '
    /^[[:space:]]*$/ { print ""; next }
    { line = $0; gsub(/[[:space:]]+/, " ", line); sub(/^ /, "", line); printf "%s ", line }
    END { print "" }
  ' "$f" > "$REFLOWBUF" 2>>"$ERRLOG"
  refuse_if_incomplete

  i=0
  while [ "$i" -lt "$RULE_COUNT" ]; do
    : > "$ERRLOG"
    grep -oP -e "${RULE_PATTERN[$i]}" -- "$f" > "$RAWBUF" 2>>"$ERRLOG" || true
    refuse_if_incomplete

    : > "$ERRLOG"
    FLOW_HITS=$(grep -oP -e "${RULE_PATTERN[$i]}" -- "$REFLOWBUF" 2>>"$ERRLOG" || true)
    refuse_if_incomplete

    if [ -n "$FLOW_HITS" ]; then
      # Only what the line pass could not see. An empty RAWBUF means no line-pass match, and
      # `grep -f` with no patterns selects nothing, so -v then keeps every wrapped hit.
      EXTRA=$(printf '%s\n' "$FLOW_HITS" | grep -Fxv -f "$RAWBUF" | sort -u || true)
      if [ -n "$EXTRA" ]; then
        while IFS= read -r m; do
          [ -n "$m" ] || continue
          ALL_HITS="${ALL_HITS}[${RULE_NAME[$i]} / wrapped across lines]"$'\n'"${f}: ${m}"$'\n'
        done <<< "$EXTRA"
      fi
    fi
    i=$((i + 1))
  done
done < "$SCANLIST"

# ---------------------------------------------------------------------------
# THIRD PASS: `src/` DOC COMMENTS, the prose that compiles into `dist/`
# ---------------------------------------------------------------------------
#
# THE CEILING, STATED FIRST, because it is the honest frame for everything below.
# `dist/` is UNTRACKED BUILD OUTPUT. No checked-in gate can scan it without building
# first, and this script deliberately does not build. So the thing a consumer actually
# receives is NOT what is checked here. What is checked is its SOURCE: the `/** */`
# blocks the dts build copies verbatim. That is a PROXY, and it is a good one only
# because the copy is verbatim -- tsup rewrites declarations, not doc text. A rewrite of
# the build that started transforming comments would silently decouple the two, and
# nothing here would notice. This pass therefore raises the floor on `dist/`; it does not
# observe `dist/`.
#
# Two consequences worth naming rather than discovering:
#   * A doc comment that never reaches an exported declaration is swept anyway. That is
#     deliberate: which comments survive the dts rollup is a property of the BUILD, not of
#     the source, and gating on it would make the gate's answer depend on tsup's inlining
#     decisions.
#   * `dist/index.d.cts` is the same text as `dist/index.d.ts`, so one clean source
#     covers both conditions. Checked, not assumed.

# The `src/` surface must still be tracked, for the same reason SURFACE_PATHS is checked:
# a rename that empties this list must red, not shrink the scan in silence.
git ls-files -z -- 'src/*.ts' 'src/**/*.ts' > "$SRCLIST"
if [ ! -s "$SRCLIST" ]; then
  echo "ERROR: check-no-internal-refs - no tracked src/*.ts files to scan for doc" >&2
  echo "       comments. Either the source moved (update this pass, deliberately) or the" >&2
  echo "       scan is about to cover less than it claims. Refusing to report green." >&2
  exit 1
fi

# Same list-building discipline as the public-surface pass: `./`-prefixed as the list is
# built (route 6), a non-regular-file entry refused by name rather than skipped (route 7),
# an unreadable entry refused (not silently missed).
: > "$SRCSCAN"
src_scanned=0
while IFS= read -r -d '' f; do
  if [ -d "$f" ] && [ ! -L "$f" ]; then continue; fi
  if [ ! -r "$f" ]; then
    echo "ERROR: check-no-internal-refs - tracked source file is not readable: $f" >&2
    echo "       Refusing to report green from a scan that could not open its input." >&2
    exit 1
  fi
  if [ ! -f "$f" ]; then
    echo "ERROR: check-no-internal-refs - tracked source entry is not a regular file: $f" >&2
    echo "       Refusing to report green from a scan that skipped one of its inputs." >&2
    exit 1
  fi
  printf './%s\0' "$f" >> "$SRCSCAN"
  src_scanned=$((src_scanned + 1))
done < "$SRCLIST"

if [ ! -s "$SRCSCAN" ]; then
  echo "ERROR: check-no-internal-refs - no source files survived list building." >&2
  echo "       Refusing to report green from a scan that read nothing." >&2
  exit 1
fi

# EXTRACT THE DOC COMMENTS. Two buffers per pass, and the reason for the second one is
# line numbers: the rules must run over doc text ALONE (so a rule cannot match a line
# number, a path, or the code on the far side of a `*/`), which means the location has to
# travel beside the text rather than inside it. DOCLINES holds one doc line of text per
# line; DOCMAP holds `file:lineno` at the SAME line index. A hit at index N in one is
# located by index N in the other.
#
# The leaders are stripped the way an IDE strips them: `/**`, a leading `*`, and `*/`
# disappear, because none of them is part of what the reader sees on hover. `//` and
# plain `/* */` are NOT extracted -- see the boundary argument at SRC_RULE_NAME above.
: > "$DOCLINES"; : > "$DOCMAP"; : > "$DOCFLOW"; : > "$DOCFLOWMAP"
: > "$ERRLOG"
while IFS= read -r -d '' f; do
  awk -v file="$f" -v dl="$DOCLINES" -v dm="$DOCMAP" -v df="$DOCFLOW" -v dfm="$DOCFLOWMAP" '
    function emit() {
      gsub(/[[:space:]]+/, " ", joined); sub(/^ /, "", joined); sub(/ $/, "", joined)
      if (joined != "") { print joined >> df; print file ":" blockstart >> dfm }
      joined = ""
    }
    # End of a paragraph inside a block: emit it, keep the block open, keep reporting the
    # location as the block start (a paragraph index would be a number no reader can use).
    function flush2() { if (blockstart > 0) emit() }
    # End of the block.
    function flush() { if (blockstart > 0) emit(); blockstart = 0 }
    {
      line = $0
      if (!indoc) {
        if (line !~ /^[[:space:]]*\/\*\*/) { next }
        indoc = 1; blockstart = FNR; joined = ""
        sub(/^[[:space:]]*\/\*\*/, "", line)
      }
      # THE TERMINATOR IS TESTED BEFORE THE LEADER IS STRIPPED, and that ordering is the
      # whole correctness of this extractor. Stripping first turns a closing " */" into
      # "/" (the leader pattern eats the asterisk of the terminator), the block never
      # closes, and every `//` comment and line of CODE after it is scanned as doc text.
      # That is not a hypothetical: it is what the first draft of this pass did, and it
      # reported 60 violations that were all real bookkeeping sitting in `//` comments
      # this surface deliberately does not cover. A gate that over-reports is not "safe":
      # it would have forced a sweep of the wrong 61 lines.
      # TESTING THE TERMINATOR AGAINST DOC TEXT IS CORRECT, NOT A SHORTCUT, and it was
      # challenged: a doc comment whose prose contains `*/` (a glob like `src/**/*.ts`, a
      # regex ending `*/`) would close the block early and drop the rest of it from the
      # scan, printing OK over a violation below. THE CONSTRUCT IS UNREACHABLE IN VALID
      # TYPESCRIPT: block comments do not nest and cannot contain `*/`, so the compiler
      # ends the comment at exactly the same character this does. Checked rather than
      # argued: a file with `src/**/*.ts` inside a doc comment is rejected by `tsc
      # --noEmit --strict` with TS1109/TS1005 on the following lines, and `typecheck` runs
      # ahead of this gate in the ladder. The extractor mirrors the language; it does not
      # approximate it.
      closed = 0
      if (line ~ /\*\//) { closed = 1; sub(/\*\/.*$/, "", line) }
      # Exactly ONE leading asterisk, never `\*+`: a greedy leader would swallow the
      # opening `**` of markdown bold ("* **Fail-safe:**") and alter the scanned text.
      sub(/^[[:space:]]*\*[[:space:]]?/, "", line)
      sub(/^[[:space:]]+/, "", line)
      # The LINE pass sees the doc text with its location beside it.
      print line >> dl; print file ":" FNR >> dm
      # The FLOW pass accumulates a PARAGRAPH, not the whole block, and squeezes it the way
      # a tooltip reflows one. A BLANK doc line is a paragraph break and ends the run, for
      # the same reason the markdown pass above prints an empty line rather than joining
      # through it: a list item ending "(this module)" followed by a blank line and a new
      # sentence starting "The ..." is not the text "(this module) The ...", and joining
      # through the break invents adjacencies that no reader ever sees. Left unbroken, a
      # doc line ending in "phase" followed by a blank line and a paragraph opening with a
      # capital letter would red as "phase X". That is an over-report rather than a silent
      # green, but a gate that reds on correct content is a gate someone deletes.
      if (line ~ /^[[:space:]]*$/) { flush2() } else { joined = joined " " line }
      if (closed) { flush(); indoc = 0 }
    }
    END { if (indoc) flush() }
  ' "$f" 2>>"$ERRLOG"
done < "$SRCSCAN"
refuse_if_incomplete

# An extraction that produced nothing from a non-empty, JSDoc-heavy source tree means the
# extractor broke, not that the tree is clean. Same class as the empty-file-list refusal.
if [ ! -s "$DOCLINES" ]; then
  echo "ERROR: check-no-internal-refs - extracted no doc-comment text from ${src_scanned}" >&2
  echo "       tracked source file(s). Every public export in this package carries JSDoc," >&2
  echo "       so an empty extraction means the extractor is broken, not that the source" >&2
  echo "       is clean. Refusing to report green from a scan that read nothing." >&2
  exit 1
fi

# SCAN. Line pass first (it can name a file and a line), then the reflowed pass for
# violations that straddle a wrap. Wraps are not hypothetical here: remediating this
# surface is wrap-prone: this repo hard-wraps doc comments, so an identifier or a
# `phase` / `N` pair routinely straddles a line break, and `A future phase` / `may add` is
# exactly as invisible to a line scan in JSDoc as it was in markdown. Measured on the sweep
# this file shipped with: 52 of the 124 phase-rule hits and 29 of the 76 identifier hits in
# `src/` were visible ONLY to the reflowed pass. The reflow models a hover
# tooltip: whitespace squeezed, `*` leaders already gone.
SRC_HITS=""
i=0
while [ "$i" -lt "$SRC_RULE_COUNT" ]; do
  : > "$ERRLOG"
  LINE_IDX=$(grep -nP -e "${SRC_RULE_PATTERN[$i]}" -- "$DOCLINES" 2>>"$ERRLOG" | cut -d: -f1 || true)
  refuse_if_incomplete
  if [ -n "$LINE_IDX" ]; then
    while IFS= read -r n; do
      [ -n "$n" ] || continue
      loc=$(sed -n "${n}p" "$DOCMAP")
      txt=$(sed -n "${n}p" "$DOCLINES")
      SRC_HITS="${SRC_HITS}[${SRC_RULE_NAME[$i]} / src doc comment]"$'\n'"${loc}: ${txt}"$'\n'
    done <<< "$LINE_IDX"
  fi

  : > "$ERRLOG"
  FLOW_IDX=$(grep -nP -e "${SRC_RULE_PATTERN[$i]}" -- "$DOCFLOW" 2>>"$ERRLOG" | cut -d: -f1 || true)
  refuse_if_incomplete
  if [ -n "$FLOW_IDX" ]; then
    while IFS= read -r n; do
      [ -n "$n" ] || continue
      # Report only what the line pass could not see, so a wrapped hit is not printed
      # twice. A block whose violation is on one line is already reported above.
      blockloc=$(sed -n "${n}p" "$DOCFLOWMAP")
      # DELIMITED, not a bare substring. An unanchored `*"$blockloc"*` makes
      # `./src/x.ts:1` a substring of an existing hit at `./src/x.ts:12`, so a real wrapped
      # violation in the block starting at line 1 is suppressed by an unrelated hit at
      # line 12. It never loses the RED (SRC_HITS is non-empty either way) but it loses the
      # REPORT, which is the line a remediator needs. The trailing ':' is what a location
      # is always followed by in SRC_HITS.
      case "$SRC_HITS" in
        *"${blockloc}: "*|*"${blockloc} (block): "*) continue ;;
      esac
      m=$(sed -n "${n}p" "$DOCFLOW" | grep -oP -e "${SRC_RULE_PATTERN[$i]}" | head -1)
      SRC_HITS="${SRC_HITS}[${SRC_RULE_NAME[$i]} / src doc comment, wrapped across lines]"$'\n'"${blockloc} (block): ${m}"$'\n'
    done <<< "$FLOW_IDX"
  fi
  i=$((i + 1))
done

[ -n "$ALL_HITS" ] && fail_with_hits "the public surface listed above" "$ALL_HITS"
[ -n "$SRC_HITS" ] && fail_with_hits "src/ doc comments, which compile into dist/ and render in every consumer's editor" "$SRC_HITS"

echo "check-no-internal-refs: OK (${scanned} public-surface file(s) and the npm metadata scanned against ${RULE_COUNT} rules, line by line and paragraph-joined; ${src_scanned} source file(s) scanned for doc-comment bookkeeping against ${SRC_RULE_COUNT} rules, line by line and paragraph-reflowed; ${gitlinks} gitlink(s) skipped)"

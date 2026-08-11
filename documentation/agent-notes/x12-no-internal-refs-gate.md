# `X12-NO-INTERNAL-REFS-GATE` (2026-08-11)

Ported `check:no-internal-refs` into x12. Eleven sibling repos ran this gate and x12 did not, and it
is the only thing in this ecosystem that would fail a build on the defect class this package's
review history is made of: a claim in a prose carrier, remedied by hand every time, gated by
nothing.

Base commit `a3e081d`. Everything below was measured on this tree, with two independent tools
(`grep -oP` driven by `git ls-files -z | xargs -0`, and `rg`) that agreed on every figure. The
cross-check is not ceremony: a count from a single tool is how this lineage has published sweeps
that had not read the whole corpus.

---

## 1. Re-measurement of the filed line, before building to it

The ledger row said the gate is not ported here, that eleven siblings run it, and that it is the
only thing that would gate this defect class. **All three held.**

| claim | re-measured | result |
|---|---|---|
| eleven siblings run it | `check:no-internal-refs` present in `package.json` scripts | hl7, mllp, ccda, ncpdp, astm, fhir, terminology, transform, deid, synth, cli = **11** |
| x12 does not | same probe on x12 | absent |
| nothing else gates the class | x12's script table + workflows | `check:no-emdash` gates one character; nothing reads prose claims |

`dicom` and `config` do not run it either. That is a fact about them and is not this change's
business; it is written down here so the next reader does not re-derive it as if it were a finding.

## 2. The port is not a copy. What the counts forced

The one place this copy must not track its siblings.

**Every sibling excludes `X12-\d{3}[A-Z]?|X12-\d{6}` from the identifier rule**, as a standards
designation a consumer legitimately reads. In every other repo that is correct. In this one `X12` is
*also* the prefix on our own work items, and unlike ccda's case the two are **not disjoint**:
`CCDA-R2.1` (standard) and `CCDA-P7` (item) differ at the character after the hyphen, so a narrow
exclusion separates them; `X12-837P` (guide) and `X12-837-RESIDUALS` (item) share the head
`X12-837`, and `\b` sits between the `7` and the following `-`, so the sibling exclusion consumes
the item identifier whole.

Counted across every tracked file:

| spelling | matches | what they actually are |
|---|---|---|
| `X12-\d{3}[A-Z]?` | **141** | **all 141 internal item identifiers**, in 8 spellings |
| `X12-\d{6}` | **0** | nothing |
| `005010[A-Z]\d{3}` bare | 77 public surface / 265 `src/` | the spelling this corpus really uses |
| `X12-005010`, `X12-837P` hyphenated | **0** | the spelling the exclusion protects |

The eight identifier spellings: `X12-837-LOOP-RESIDUALS` (30), `X12-837-SV-UNDEFINED-DECIMAL` (22),
`X12-837-SV-SILENT-ZERO` (21), `X12-837-RESIDUALS` (19), `X12-837-EMIT-IDENTIFIER-FIXED` (14),
`X12-837-AMBIGUOUS-VARIANT` (13), `X12-837-SV1-OVERWRITE` (11), `X12-277-SVC07-NOT-DECODED` (11).

**Six of them sat on surfaces this gate scans** (3 in `KNOWN-LIMITATIONS.md`, which `files` ships;
3 in `src/` doc comments, which compile into both declaration twins). A verbatim port matched
**none** of the six and would have printed OK over them.

So the `X12-` forms are dropped from `STANDARDS_DESIGNATION` here. **The cost is stated rather than
discovered:** a future page writing `X12-837P` with a hyphen now reds, and the remedy is the bare
form 342 other occurrences already use. That is the same trade rule 2 makes on a bare `Phase III`.

**Zero from a form refuses rather than passes.** `X12-\d{6}` measures zero *and* protects nothing,
so it is gone. The non-`X12` designations (`HL7-V2`, `FHIR-R4`, `DICOM-SR`, `NCPDP-SCRIPT`,
`CCDA-R\d`, `ASTM-E\d+`) also measure zero here, and are **kept** on purpose: they are the shared
org list, they only ever narrow, and diverging from the siblings on them would make the documented
drift residual worse rather than better. Keeping them is a decision, not an omission.

### The second forced divergence

`SURFACE_PATHS` gains **`KNOWN-LIMITATIONS.md`**. It is the fourth entry in this package's `files`,
so every install receives it, and it held all but two of the identifier hits the gate first found.
`ncpdp` is the only sibling whose surface list already had it.

## 3. The anchor, and what it cannot see

**The pattern.** Six rules, each its own `grep -P` command, over `git ls-files -z`-enumerated paths,
each `./`-prefixed as the list is built, with `-e` before the pattern and `--` after it, stderr
captured per command and any stderr at all refusing the run. `LC_ALL=C.UTF-8` is pinned. Every rule
runs twice: once line by line, once over paragraph-joined and whitespace-squeezed text.

**Cross-checked with a second tool, because `grep -c` has been measured lying in this container.**
Every figure in this note was produced by `grep -oP` and by `rg` independently and they agreed.

**What it cannot see, stated as part of the claim:**

- **`dist/` itself.** Untracked build output; the script does not build. It gates the *source* of the
  published declarations. The proxy holds only because the dts build copies doc text verbatim, and a
  build that began transforming comments would decouple the two silently.
- **`//` and plain `/* */` comments.** They do not reach `dist`. Identifiers are welcome there, by
  the convention. 32 such lines are left in `src/` deliberately.
- **`CHANGELOG.md` and `.changeset/`.** Both ship or become shipped text, and both are excluded
  because the convention names them as where identifiers belong. That contradiction is
  ecosystem-wide and is not for one repo to settle.
- **File *names*.** The scan reads contents only.
- **English sentences about our process.** No pattern finds "verified in the research pass". The
  gate raises the floor; the reviewer owns the rest of the rule.
- **A violation split by inline markup** (`phase **K**`) rejoins in neither pass.
- **`documentation/agent-notes/...` paths** in doc comments. Rule 5 keys on meta-repo paths only.
  One such citation is live in `src/transactions/claim/get-837.ts`. **Filed, not absorbed:** adding a
  path is a rule change and needs its own negative self-tests.
- **Prefixes not on the list.** A new programme prefix is invisible until someone adds it by hand.
  That is trap (1)'s stated price.

## 4. The cells run, and what they proved

Eight controls. **No story about which is special**; the set is not published as closed.

| # | control | seeded in | result |
|---|---|---|---|
| C1 | item id a sibling copy is blind to | `KNOWN-LIMITATIONS.md` (ships) | RED |
| C2 | item id a sibling copy is blind to | `src/parser/types.ts` doc comment | RED |
| C3 | `X12-837P`, the hyphenated form this port reds on | `docs-content/intro.md` | RED |
| C4 | `phase` / `W` split across a line wrap | `docs-content/intro.md` | RED |
| C5 | identifier in the npm `description` | `package.json` | RED |
| C6 | new unscanned entry in `files` | `package.json` | RED (tripwire) |
| C7 | restore the sibling `X12-` exclusion | the script itself | **see below** |
| C8 | widen rule 1 to case-insensitive | the script itself | RED (self-test) |

Every seeded tree was restored **by file copy from a pre-seed backup, never `git checkout --`**.

### C7 failed the first time, and that is the most useful thing in this note

Restoring the sibling exclusion **printed OK**. The gate was green while the divergence the whole
port exists for was uncovered.

The cause: **a positive self-test sample is disjunctive.** `grep -q` is satisfied by the first match
and stops. `POSITIVE[0]` held five spellings; `CCDA-P7` matched first; the four `X12-` spellings
after it were asserting nothing. A negative sample does not have this failure mode, because it
asserts that *nothing* matches and every entry is therefore independently load-bearing.

The remedy is `RULE1_MUST_MATCH_ALONE`: each spelling asserted on its own, one sample one token,
against both the markdown rule array and the `src/` one. C7 and C8 now red by name. **This is the
vacuous-positive-control shape, caught in this repo's own new gate rather than in someone else's.**

## 5. Remediation, and the proof it moved no behaviour

| carrier | before | after |
|---|---|---|
| public surface (14 files) | 22 identifier, 2 phase, 9 jargon | 0 |
| `src/` doc comments (108 files) | 212 hits: 124 phase, 76 identifier, 9 jargon, 2 path, 1 ADR | 0 |
| `dist/index.d.ts` (built) | 13 identifier, 64 phase, 2 jargon, 1 path | 0 |
| `dist/index.d.cts` | byte-identical to `.d.ts` | byte-identical to `.d.ts` |
| `dist/index.mjs` | | **byte-identical base to head** |
| `dist/index.cjs` | | **byte-identical base to head** |

`cmp` in both directions, on builds of `a3e081d` and of head. The `src/` half of the diff is
comment-only and moved no runtime byte.

**52 of the 124 phase hits and 29 of the 76 identifier hits in `src/` were visible only to the
reflowed pass.** A line-scan-only gate would have reported itself complete over 81 live violations.

**Nothing was deleted to get green.** Every hit was translated into what the software does; where an
identifier came off the front of a line the head was repaired. Two pages pointed the reader at the
package's `CLAUDE.md`, which `files` does not ship, and now point at `README.md` and the Cookbook.

## 6. Filed, not absorbed

Found while doing this, reproducing on base, each its own change:

1. **`documentation/agent-notes/...` cited inside a doc comment** that compiles into both declaration
   twins (`src/transactions/claim/get-837.ts`). A consumer cannot open it. Rule 5 does not cover it;
   widening rule 5 is a rule change needing its own negatives.
2. **`KNOWN-LIMITATIONS.md` links `./docs-content/cookbook.md`**, which `files` does not ship, so the
   link dangles inside every installed copy. A dangling-relative-link class, not an
   internal-bookkeeping one, and nothing gates it.
3. **The gate is not a required check.** The org ruleset pins this repo's required contexts and
   `Public-surface gate / no-internal-refs` is not among them, so it reds visibly without blocking a
   merge. Making it required is an org-level change, outside this repo.

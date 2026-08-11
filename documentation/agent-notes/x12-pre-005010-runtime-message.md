# `X12-PRE-005010-RUNTIME-MESSAGE` (2026-08-11)

Closes the runtime half of the overclaim `#119` corrected in comments and **deliberately left
standing at run time**, in agreement with `pre005010`'s docblock twin rather than corrected in one
carrier only. That was the right call and it is this slice's starting point.

Provenance: this repo's own source tree at `84c6f11` and at the head of this slice, measured with
`tsx` and with `vitest` against `src/`, never inferred. The only spec statements the diff carries are
that the interchange control version number is ISA-12 with `00501` the HIPAA baseline and that the
ISA is a fixed-width header whose 16 element separators sit at declared byte positions; both were
already in this tree at base (`envelope.ts`, `types.ts`, `KNOWN-LIMITATIONS.md`,
`detectDelimiters`), and neither is newly derived here. **No TR3 is cited and none is needed** - the
defect rests on this package disagreeing with itself.

**Read side. Nothing on the build side moved. No guard, code, position or control flow moved. The
emitted JS is NOT byte-identical here, and that is the point: the carrier is a runtime value.**

## The re-measurement, which held

The filed line reproduces on the base. `parseX12` on one interchange per row, reading ISA-12 at its
own fixed byte offset and again off the element split:

```text
construction             ISA-12 at its fixed offset  elements[12]  X12_PRE_005010  other codes
spec-clean               "00501"                     "00501"       silent          -
ISA-12 declares 00401    "00401"                     "00401"       FIRES           -
ISA-05 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-06 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-08 carries `*`       "00501"                     "^"           FIRES           X12_ISA_EXTRA_ELEMENT_SEPARATOR, X12_CONTROL_NUMBER_MISMATCH
ISA-13 carries `*`       "00501"                     "00501"       silent          X12_ISA_EXTRA_ELEMENT_SEPARATOR
```

`#119` published the `ISA-06` row. **Two further constructions falsify the cell on their own and are
not the same element**, which is why no member is named. The `ISA-13 carries *` row is the control
that forbids the shortcut "an extra element separator falsifies the cell": it carries one, and the
code stays silent.

## The defect

The guard is `el(isa.elements, 12) !== "00501"` (`envelope.ts`). The message a consumer reads off
`w.message` was:

> ISA-12 declares a version other than the HIPAA baseline "00501", so the input may diverge from
> 005010 semantics. The declared version is preserved verbatim on the model.

Both halves presuppose a header that framed. The first asserts what ISA-12 declares; on the three
falsifying rows ISA-12 declares `00501` at its own fixed offset and the code fires anyway. The
second calls what the guard read "the declared version"; on those rows it read `"^"`, the in-band
repetition separator, which is not a version at all. **The second half carries the same
presupposition as the first, which is why it moves too and not as a matter of style.**

## 🛑 No mechanism is named, and no closed set of them

Fixed-width padding and arity displacement each falsify a cell on their own, on documents that share
nothing. **Two are measured, a third is not ruled out, and the replacement names none of them**: it
states the condition (`X12_ISA_EXTRA_ELEMENT_SEPARATOR` also present, the header did not split into
`ISA` plus 16 elements) and leaves the account of that condition to the code that owns it. Nothing
here says which ISA element is special, which mechanism is the reason, or that the set is closed.
That story has been falsified five times in this repo and a sixth is not written.

## The remedy

| carrier                                                                | what the diff does                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `warnings.ts`, `WARNING_MESSAGES.X12_PRE_005010`                       | the assertion about ISA-12 and the phrase "the declared version" both go. The replacement names the element the guard read, states that raising the code does NOT establish that the header split into `ISA` plus 16 elements, and points at `isa.raw`. |
| `warnings.ts`, `pre005010` docblock                                    | the twin clause moves with it, so the two carriers stay in agreement.                                                                                                                                                                                   |
| `docs-content/troubleshooting.md`                                      | a THIRD spelling of the same assertion, "ISA-12 declares a version family other than `00501`", on a carrier that ships. Corrected.                                                                                                                      |
| `CHANGELOG.md` `[Unreleased]` and `.changeset/olive-donkeys-attack.md` | `#119`'s "`WARNING_MESSAGES.X12_PRE_005010` is untouched" is falsified by this slice and lands in the SAME release. **Deleted from both**, following `#119`'s own handling of `#116`'s stranded claim.                                                  |

**Deletion to nothing was not available on the message.** The falsified clause is the sentence's
subject, and a message with no subject is the failure mode the envelope-value-routes note names
("a deletion can strand the sentence's subject"). It is SCOPED to what the guard read, the same
remedy `#119` applied to the 1-indexed mapping, and no shift is quantified.

**What is NOT done:**

- **The guard is not moved to the fixed offset.** That is a behaviour change on published decoding:
  it would change which interchanges raise this code, and this row is a message defect. Filed below.
- **No warning is suppressed, narrowed or re-framed, and no code was added.** The census pins that
  the same interchanges raise the same codes at the same positions as before.
- **No value is echoed.** The message stays a static table lookup, asserted by the census.

## The test, which is the difference from every prior slice in this lineage

`test/parser-pre-005010-message.test.ts`. Every accuracy finding in this repo's review history has
been a claim in a prose carrier that no test could fail on. **A runtime message can be failed on.**
The file pins the six cells, pins that more than one construction falsifies the claim, asserts the
message matches none of the three falsified spellings, asserts registry membership, asserts the
position is unchanged, and asserts no consumer byte reaches the message.

**Negative control, run:** the base message copied back over the head one reds the file
(1 failed, 9 passed) on the `ISA-12 declares` assertion; restoring the head greens it (10 passed).
The base file was restored **by file copy, never `git checkout --`**.

## The sweep, and what its anchor cannot see

Anchors, tree-wide over `git ls-files` with `dist/` excluded (untracked here in any case):

```
declares a version | declares any version | declares .{0,20}other than
HIPAA baseline | HIPAA-mandated baseline
```

Every line those anchors return at base is triaged below, because a result whose triage is
unpublished cannot be reconciled by whoever re-runs it. **Count the rows rather than trusting a summary figure; no total is
published**, in this note or anywhere. A draft published one and it was wrong. One row spans two
lines, which the row itself discloses.

| line at base                                              | disposition                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/parser/warnings.ts:278`                              | CARRIER, the runtime message. Corrected.                                                                                       |
| `src/parser/warnings.ts:479-480`                          | CARRIER, the docblock twin, one clause across a hard wrap. Corrected.                                                          |
| `docs-content/troubleshooting.md:80`                      | CARRIER, ships. A third spelling ("version family"). Corrected.                                                                |
| `CHANGELOG.md:179`                                        | CARRIER, `[Unreleased]`, freezes on release. Deleted.                                                                          |
| `documentation/agent-notes/x12-isa-value-pointers.md:183` | RECORD, not a carrier: it QUOTES the base text as the filed residual. Left standing.                                           |
| `documentation/agent-notes/x12-isa-value-pointers.md:10`  | NOT a carrier: names `00501` as the HIPAA-mandated baseline, which is true and is not a claim about what any element declares. |
| `src/parser/types.ts:132`                                 | NOT a carrier: `#119`'s own remedy, ISA-12's semantics restated at segment level, where they are true.                         |

`.changeset/` was swept separately and by name, because prose anchors do not reach it:
`olive-donkeys-attack.md` carried the same claim and freezes on release.

**🛑 That is a result about clause literals, not about the defect.** `#116`'s gate found a carrier
its ten-literal sweep never named. **No claim is made that the errata set is exhaustive, and no
count is published as a closed total. Finding one more is expected and is not a new finding.**

**What the anchors CANNOT see, stated as part of the claim:**

- a claim about ISA-12 that never writes "declares" or "baseline" ("the version element", "ISA-12 is
  not 005010");
- the same claim in a code comment introduced with `//`, which no anchor here reads;
- a claim carried by a variable or function NAME rather than by text;
- a claim in the built `dist/` twins, which are derived and untracked, and any untracked file;
- a claim split across a hard wrap between "declares" and its object;
- anything outside this submodule.

**🩺 `grep -c` against a file has been measured in this container to report no match on a file `rg`
finds hits in.** Every count above was taken with `rg` and re-taken with a `node` read, and both
agreed.

## Controls

- **The emitted JS DOES change**, unlike `#119`. `dist/index.mjs` `4898ca0cccd204345ae1c2254d7c21bc`
  -> `2336aacd519e280dd315ace390cd44b9`, `dist/index.cjs` `7b544863ba4e79c5a4b08dfcd0cbd91b` ->
  `3a3b908e7e0e80d1d6d59094c3b7d3a2`, built from both trees. **The base pair reproduces `#119`'s
  published hashes exactly**, which is what establishes that this is its base. **This is the control
  that has force here**: the inverse of `#119`'s, and the reason the row was a different carrier.
- **The change is ONE LINE in each emitted twin** and it is the message string: line 197 of
  `dist/index.mjs`, line 199 of `dist/index.cjs`. Each twin has the same line count at head as at
  base. No guard, no branch and no position moved, which is the diff-level form of "nothing was
  re-framed".
- **The `.d.ts` / `.d.cts` twins are byte-identical to each other** at base
  (`4452179d6c8e91245e3fc22e0388c50a`) and at head (`37613399fb38179adefce20425d9663e`), so the
  corrected docblock reached both.
- **The falsified spellings are gone from all four shipping carriers.** `ISA-12 declares`: 1 -> 0 in
  each of `index.d.ts`, `index.d.cts`, `index.mjs`, `index.cjs`. `the declared version`: 1 -> 0 in
  `index.mjs` and `index.cjs` (0 at base in the declaration twins, where the docblock never carried
  that phrase). Taken with `rg` and re-taken with a `node` read, both agreeing on every zero.
- **The base tree was restored by file copy, never `git checkout --`.**

## Filed, not absorbed (ADR 0016 rule 2)

- **The guard still reads the split rather than the fixed offset.** Moving it is a behaviour change
  on published decoding and needs its own slice, with the `X12_ISA_EXTRA_ELEMENT_SEPARATOR` ordering
  in scope. **PRE-EXISTING**, reproduces on the base, untouched here. **The direction that matters is
  the MISS, not the over-fire**, and it is measured rather than reasoned: **an interchange declaring
  `00401` at ISA-12's own fixed offset can read `elements[12] = "00501"` and leave
  `X12_PRE_005010` SILENT**, with `X12_ISA_EXTRA_ELEMENT_SEPARATOR` and
  `X12_CONTROL_NUMBER_MISMATCH` raised. **The recipe is deliberately not written here**, because a
  draft wrote one that under-determined the plant. Build it the way the census above was built, with
  `parseX12` over a hand-assembled header. Not stop-the-line: the header is loudly non-conformant on
  two other codes and no clinical or financial value is mis-read. **Do not read this as a rule over
  which elements do it, and no mechanism is named.**
- **🩺 `docs-content/cookbook.md` ships the CONVERSE of what this slice corrected**, on a
  consumer-facing surface: a `X12_PRE_005010` branch commented _"sender is on a pre-005010 version
  family: tolerated, not fatal"_. False two independent ways, each alone: the displacement rows above
  (the sender is on 005010 and it fires), and the guard being an inequality, so a LATER family
  (`00602`, `00700`) raises it too, which `pre005010`'s own docblock states. **PRE-EXISTING**,
  reproduces on base, and **the anchors above cannot see it** (it writes neither "declares" nor
  "baseline"), which is that disclosed blind spot paying out. **Its own row.**
- **`src/parser/envelope.ts:344`**, the `// Pre-005010 detection` comment three lines above the guard,
  and the local `const isa12`. Same overclaim, same function. **PRE-EXISTING**, and confirmed NOT in
  the built twins, so it does not ship; `//` comments are a disclosed blind spot of both the anchors
  and `check:no-internal-refs`.
- **`CHANGELOG.md:172`**, `#119`'s own "Measured on 005010 interchanges, one per row", carries the
  same qualifier slip this slice deleted from its own three carriers. It is in `[Unreleased]` and
  freezes on release. **PRE-EXISTING and deliberately NOT absorbed** (ADR 0016 rule 2).
- **`KNOWN-LIMITATIONS.md`'s ISA census** already states the correct account and is a MEASUREMENT.
  Left alone deliberately.
- The `docs-content/` value comments, `spec-notes-envelope.md:74`, the `parse-ta1.ts` /
  `KNOWN-LIMITATIONS.md` `X12Segment.elements` mis-citation, the ST-03 keys, `caller-string.ts:493`,
  the TA1-02 refusal message, the `noop` sink, `?~`, the TA1 whitespace slots, the `specClean` and
  BUILD halves of the ISA arity, the five `meta.note` runtime strings, the disjunctive gate samples,
  the `agent-notes/` path in a shipped doc comment, the `cookbook.md` dead link and the org-ruleset
  gap all remain their own rows, and the `PRE-EXISTING` lines in the umbrella's `repos/x12.md` are untouched.

## The budget

`x12/CLAUDE.md` was AT its ratchet with zero headroom (derived: file size equalled `REPO_CLAUDE.x12`
in the umbrella's `.claude/hooks/doc-budget.mjs`). Paid by **deleting the clause this slice
falsifies** from the `X12-ISA-VALUE-POINTERS` trap, which is a correction owed anyway and not a
shortening for budget, plus a **verbatim relocation** where that was not enough. **No trap deleted,
no claim weakened, the ratchet not raised.** Derive the current figure; do not trust one written
here. **`REPO_CLAUDE.x12` is owed a lowering to match** - this slice is scoped to the submodule and
did not touch the umbrella, so that is left to the coordinator, as `#110`, `#111`, `#116` and `#119`
also left it.

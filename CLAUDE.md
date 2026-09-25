# @cosyte/x12: Project Guide for Claude

## Project

**`@cosyte/x12`**: an ASC X12 EDI parser + utility library (Node/TS, MIT), the payer-side sibling of **[`@cosyte/hl7`](../hl7)**, whose
API shape, profile system and lenient-parser philosophy are deliberately mirrored, so **when in doubt on an API decision, check how
`hl7` solved it.** Identity, north star and siblings: `documentation/agent-notes/claude-md-relocated-narrative.md`.

## ▶ Read this before you touch the parser: `documentation/agent-notes*`

**Every `###` in "Traps" names the section carrying that trap's measurement, sources and reasoning. Open it before you act on the line,
because ONLY THE IMPERATIVE COMES BACK HERE.** Most are in [`documentation/agent-notes.md`](documentation/agent-notes.md), itself
budgeted, so the newest are their own files under `documentation/agent-notes/`. **A trap deleted to hit a number is the one failure
mode this bound exists to prevent. Never quote this file's line ceiling here** - it is declared in the config repo's
`drift-manifest.json` (`baselines.package.groups.agentDoc`) and graded by `drift-check.js`. **A new trap is PAID FOR BY RELOCATING
FIRST**; the pre-compression file is verbatim at relocated narrative §11.

## Status

Pre-alpha `0.0.x`, **published** to npm from a public repo. **Never quote a version here:** `npm view @cosyte/x12 version` is the only
source of truth.

- **Read scope is decoded for** 270, 271, 275 (006020X314), 276, 277 / 277CA / 277 RFAI (006020X313), 278, 820, 834, 835, 837P/I/D, 999, TA1.
- **Emit scope is complete for every transaction that has a reader**: general (`serializeX12` + `buildInterchange`) plus a per-TR3
  domain builder for each, and the pure-function `build999` / `buildTA1`, each layering the safety-critical per-TR3 invariants
  (balance, certification, maintenance-type fidelity, count reconciliation) on the general builder.
- **🩺 BOTH inquiry directions ship, read AND emit** (`get276StatusInquiry` / `parse276StatusInquiries` / `build276` beside the 270
  trio). **Never re-add a "no typed model for the 276" claim and never write one paired label over two halves**; derive scope from
  `X12_TR3_CONFORMANCE`, never from prose. **🩺 The 270 and 276 readers each attach a level by its OWN HL-02 and nothing else**, so an
  unresolved pointer leaves that level and its subtree OFF the tree, warned, never re-parented, and their warning codes and build-error
  classes are SIBLINGS, never one widened set. Why: `documentation/agent-notes.md#published-scope-the-270-and-276-inquiry-directions`
- **Warning registry: additions-only, and NEVER quote its size here** (stale twice) - derive it from `ALL_WARNING_MESSAGES`. **Profile
  system** shipped Phase 9; **PHI commit-gate** armed. **Phase histories 1-9 are in `documentation/agent-notes.md`** - read the phase
  section before changing a surface it built.

## v1 Scope Snapshot

HIPAA sets at **005010** (errata hooks); list at `documentation/agent-notes.md#v1-scope-snapshot`. Non-healthcare (850/856/810/204),
EDIFACT, AS2/SFTP and pre-005010 are out. **It is the v1 SCOPE declaration, NOT a list of what SHIPPED** - `X12_TR3_CONFORMANCE` is the
derived answer to that.

## Tech Stack (the shared `@cosyte/*` standard)

**The toolchain is INHERITED by depending on the published `@cosyte/*` config packages, never by copying files.** Source of truth: the
meta-repo's `documentation/conventions.md`; per-tool summary: `documentation/agent-notes.md#tech-stack-the-shared-cosyte-standard`.
**The `attw` script is `scripts/attw.mjs`, NEVER the bare CLI** (`ASSETS-P8` below). **Runtime deps: ZERO.**

## Engineering Guardrails

- No `any`, no unjustified `as` (use `unknown` and narrow). JSDoc with `@example` on every public export. Immutable by default; mutate only via `setElement` / `addSegment` / `addLoopIteration` / `removeSegment`. No `console.*` in library code - throw typed errors or return results. Short, testable functions over parsing blobs.
- Postel's Law: parser liberal (lenient default + stable codes with positional context), serializer conservative. **Be exact, because the README said it loosely until ASSETS-P8** (long form: `documentation/agent-notes/claude-md-relocated-narrative.md`). The domain builders emit spec-clean by construction, but `serializeX12` is byte-faithful **only for the segments the parser recorded on the model**: **`serialize(parse(s)) === s` is NOT guaranteed, and "my file has no line breaks" is NOT sufficient** - `KNOWN-LIMITATIONS.md` is the canonical list, most of it needing no line break and silent. `{ specClean: true }` reconciles the envelope and WARNS; `recomputeCounts` is **inert without `specClean`**. Nothing is ever silently corrected.
- Fatal only for unrecoverable structural corruption (4 Tier-3 codes: `X12_NO_ISA_HEADER`, `X12_ISA_TOO_SHORT`, `X12_INVALID_DELIMITERS`, `X12_EMPTY_INPUT`). Everything else warns. Coverage target: ≥ 90% on `src/parser/`, `src/envelope/`, `src/transactions/`, `src/helpers/`.
- Built-in loop specs + profiles are authored through the same public API (`defineLoopSpec()`, `defineProfile()`): dogfooding gate. HIPAA code lists ship as versioned data snapshots; an update is a release event, never a runtime fetch, and `codeLists.meta.snapshotDate` is the freshness surface. Acknowledgments (`build999`, `buildTA1`, `parse999`) are pure: never auto-send, never open a socket, never touch the filesystem.
- **No em dashes (`U+2014`). Ever.** Founder directive. Gated by `pnpm check:no-emdash` and `.github/workflows/no-emdash.yml`, which scans tracked files **AND your PR title, PR body and commit messages** - this repo squash-merges, so those land on `main`.

## Traps

**Each was paid for, and each `###` names the file carrying that trap's measurement, sources and reasoning. 🩺 = getting it wrong
mis-states a clinical or financial value on the wire. READ THEM BEFORE YOU TOUCH THE PARSER**, in
[`documentation/agent-notes/claude-md-relocated-traps.md`](documentation/agent-notes/claude-md-relocated-traps.md), which holds this
section's text and every `###` under it unchanged. **A trap deleted to hit a number is the one failure mode that bound exists to
prevent**, so this was a relocation and nothing was dropped.

## Standing disciplines (every change)

**Three are the meta-repo's, mirrored from its `documentation/conventions.md`, which is the source of truth**: docs follow code;
version + changelog (a Changeset, `patch`, `0.0.x`) every meaningful change; and the crew / knowledgebase feedback loop. Full text:
`documentation/agent-notes/claude-md-relocated-narrative.md`.

**A fourth is this repo's own, added by `CLAUDE-MD-AUDIT`:** narrative from an incident, a refutation or a shipped phase goes in
**`documentation/agent-notes.md`**, or, once THAT file is on its own budget, in **`documentation/agent-notes/<slug>.md`**; only its
imperative comes back here. **The ratchet is a ceiling, not a target** - `hl7`, the parser this one mirrors, is 8 KB. **Relocate BEFORE
you write the trap, and pay any trap the last slice left owed.**

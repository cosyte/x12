# `X12-NUMERIC-VALUE-EMITS-EMPTY` (2026-08-03)

> **RELOCATED IN FULL from `CLAUDE.md` on 2026-08-11, VERBATIM, NOTHING DROPPED.** It paid for the
> `X12-NO-INTERNAL-REFS-GATE` trap, on that trap's SECOND relocation: the hook refused the first
> correction by 70 bytes, and the answer to that is another relocation, never a shorter claim. The
> narrative it points at stays where it was, in
> `documentation/agent-notes.md#x12-numeric-value-emits-empty-2026-08-03`; this file is the
> imperative set that used to sit in `CLAUDE.md` and it is unchanged below.

- **🩺 EVERY builder that declares an `esc` takes it from `makeCallerEscaper`
  (`src/builder/caller-string.ts`), which type-checks first and refuses with the calling module's own
  typed, code-tagged error. NO COUNT HERE - the gate holds it, and "nine" outlived the ninth.**
  What `escapeRelease` read, and the `CLP-01` reassociation key it vanished: relocated narrative §8.
- **🩺 Refuse, never coerce, and that is the whole item.** Coercion mints a _different_ identifier: a
  payload carrying `"0012345"` as a number already lost its leading zeros, and reassociating to the
  wrong claim is worse than failing to reassociate. **The builder's own required-field guard is
  defeated by a number** (the instance: relocated narrative §7). Check the type, not the sentinel.
- **The `#51` asymmetry is deliberate, not an inconsistency.** `renderCallerValue` **coerces**;
  `esc` **refuses**. _Survive anything_ vs _invent nothing_.
- **🩺 NEVER PUBLISH AN EXHAUSTIVE CENSUS OF WHAT BYPASSES THE CHOKEPOINT.** Three drafts did; a
  refuter measured all three false, each time by finding one more. **Cut the claim back, do not grow
  the census. Finding one more is expected and is not a new finding. No total is published.**
- **A gate that asserts a same-line REGEX pins against drift and says nothing about the property.**
  `build-837` alone has three off-line `.toString()` reads the regex misses.
- **Public surface:** exported `escapeRelease` now **throws `TypeError`** on a non-string instead of
  returning `""`; nothing in the library can reach it, because the builders refuse first. **"No
  working caller is broken" was too absolute:** a boxed `new String(...)` built at base, refused now.

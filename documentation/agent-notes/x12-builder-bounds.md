# `X12-BUILDER-BOUNDS` (2026-08-02)

**RELOCATED FROM `CLAUDE.md` 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-BODY-DEGENERATE-RELEASE-SEPARATOR` trap, under that file's own ratchet (relocate first, lower
the entry as the relocation lands, never raise it to meet a new trap).

The imperatives below are LIVE. Open this file before you touch `renderCallerValue`,
`BUILD_REFUSAL_VALUE_MAX_RENDERED`, `test/builder-refusal-bounds.test.ts`, or any refusal message in
a `build*` entry point. The narrative, the measurements and the refutation history stay in
`documentation/agent-notes.md#x12-builder-bounds-2026-08-02`; this file is the imperative half that
used to sit in `CLAUDE.md`.

- **Every caller-supplied value in a `build*` refusal message goes through `renderCallerValue`**
  (`src/builder/caller-value.ts`), capping the rendered **fragment** at
  `BUILD_REFUSAL_VALUE_MAX_RENDERED` = **90**. All three names are public.
- **A type is NOT a runtime guarantee** (the four holes the item's census missed: relocated
  narrative). **State a ceiling as a ceiling and a measurement as a
  measurement:** 90 is the ceiling on the FRAGMENT, and three published figures were wrong once.
- **This is NOT `PHI-WARNING-MESSAGE-LEAK` on the emit side; escaping was deliberately NOT done, so
  a refusal message is bounded but one log line is not; and the caller-vs-document dichotomy is NOT
  categorical.** Long form + the two counterexamples: relocated narrative §7.
- **`test/builder-refusal-bounds.test.ts` must never allow `String(...)` or `String(<expr>.length)`;
  what remains allowed is a single-letter loop index and the `width` literal only** (the two
  allowlists that leaked: relocated narrative §8). **Negative controls run both ways.**
- **🩺 `segmentIndex: 0` is NOT a neutral sentinel: `tx.segments[0]` is the `ST`.** The remit-total
  balance warning now carries the BPR's own 1-based body index, and `balance.ts`'s doc was corrected
  with the code. **The build-side `segmentIndex: 0` was filed as the same defect and is not one**
  (why, and what fabricating one would have named: relocated narrative §9).
- **`renderCallerValue` coerces and never throws** (the draft that did not: relocated narrative).
- **Assert SE-01 outright, never trust it**: a repeatedly-hit tripwire.

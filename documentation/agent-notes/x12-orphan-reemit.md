# `X12-ORPHAN-REEMIT` (2026-08-02)

**RELOCATED FROM `CLAUDE.md` 2026-08-09, VERBATIM, NOTHING DROPPED** - it paid for the
`X12-BODY-DEGENERATE-RELEASE-SEPARATOR` trap's pass-1 correction, under that file's own ratchet
(relocate first, lower the entry as the relocation lands, never raise it to meet a new trap).

The imperatives below are LIVE. Open this file before you touch `serializeX12`'s orphan placement,
`X12OrphanSegment.anchor`, or the `SE-01` count. The narrative, the measurements and the refutation
history stay in `documentation/agent-notes.md#x12-orphan-reemit-2026-08-02`; this file is the
imperative half that used to sit in `CLAUDE.md`.

- **🩺 `serializeX12` places every orphan by `X12OrphanSegment.anchor` and NEVER by `segmentIndex`.
  The fix is the ANCHOR, not the re-emission.** An anchor names a SLOT of the typed tree, so it
  survives both reorderings the emit performs; a raw input index cannot. The three corners are in the
  agent-notes section.
- **🩺 SE-01 must count the BYTES THE SERIALIZER WRITES, not the model rows** (X12.6: "segments
  included in the transaction set, including ST and SE"). What the undercount did: relocated narrative
  §7. `segCount` now adds every orphan
  flushed between the `ST` and the `SE`. GE-01/IEA-01 are unaffected: an orphan is never a `GS`.
- **`KNOWN-LIMITATIONS.md` holds the canonical not-reproduced list; derive its size.**
- **Case 6 (the empty-first-element segment `*A*B~` outside a transaction) is deliberately NOT in
  scope** (why, and what closing it would mint: relocated narrative §8).
- **Retention and placement are NOT promotion:** no `get*` reader sees an orphan, and a `TA1` in a
  group still does not join `ta1Segments`.
- **State the four kept regression assertions at the MODEL level, not the byte level.** A
  `ta1-inside-group` orphan IS written back between the `ST` and the `SE`, so "never lands inside a
  transaction" would be simply false.


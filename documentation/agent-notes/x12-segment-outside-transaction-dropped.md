# `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` (2026-08-02)

**Relocated VERBATIM out of `CLAUDE.md` on 2026-08-09, nothing dropped**, to pay for the
`X12-EMPTY-CONTROL-NUMBER-FABRICATED` trap at the top of that file's list. The imperatives below
are LIVE; the narrative they point at is
`documentation/agent-notes.md#x12-segment-outside-transaction-dropped-2026-08-02` and
`documentation/agent-notes/claude-md-relocated-narrative.md`.

Open this before you touch orphan retention, `recordOrphan`, line-break tolerance, or the
`X12_UNEXPECTED_SEGMENT` messages.

- **🩺 A segment the envelope walker cannot place is RETAINED on `X12Interchange.orphanSegments`, not
  discarded.** All orphans go through one `recordOrphan` chokepoint so the warning and the retained
  segment can never disagree; `segmentIndex` is the join key back to `position.segmentIndex`.
- **🩺 Line-break tolerance is 15 of 15 CR/LF sequences of length 0 to 3.** What 4 of 15 cost:
  relocated narrative §8.
- **🩺 NEVER replay an orphan at its recorded `segmentIndex`. Read the refutation before touching the
  emit again.** `segmentIndex` indexes the INPUT stream and the emit is not in input order, so replay
  splices the orphan into whatever occupies that slot; the three corruption shapes measured, and why
  trading a warned omission for silent structural corruption is the wrong direction here: relocated
  narrative.
  **The defect is in the ADDRESSING SCHEME and comes straight back if anyone reaches for
  `segmentIndex`.**
- **A segment with an empty first element, outside a transaction, is dropped with NO warning at all** -
  the only construct on the list with no diagnostic whatsoever. Inside an open transaction the same
  segment round-trips normally.
- **Neither a doubled terminator nor a segment with an empty first element is recorded.**
- **The `X12_UNEXPECTED_SEGMENT` messages were corrected** - they said the segment was not retained,
  now false. Nothing became fatal.

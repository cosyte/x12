# `X12-837-LOOP-RESIDUALS` (2026-08-05)

> **RELOCATED VERBATIM from `CLAUDE.md` on 2026-08-11 to pay for the
> `X12-PRE-005010-RUNTIME-MESSAGE` trap, nothing dropped.** The narrative it summarises is in
> `documentation/agent-notes.md#x12-837-loop-residuals-2026-08-05`; the imperatives are HERE and are
> live. `CLAUDE.md` keeps only the cursor.

### 🩺 `X12-837-LOOP-RESIDUALS` (2026-08-05) · `documentation/agent-notes.md#x12-837-loop-residuals-2026-08-05`

- **🩺 THREE CODES, ONE FAMILY; THE ANCHOR SEPARATES THEM.** `NOT_DECODED` = line IS on the model,
  seeded zeros; `DROPPED` = an `LX` put it on NO claim; **`SERVICE_SEGMENT_WITHOUT_LX` = an
  `SVx` with NO LINE OPEN**. The first two anchor at the `LX`; the third **cannot**, so it takes
  the segment. **Never one twice - one document CAN carry all three.**
  **Its condition is "no line open", NEVER "the file has no `LX`"** - an earlier claim's `LX` is one.
- **🩺 NEVER DECODE THE ORPHAN `SVx`** (reading one into a line never opened mis-READS money).
  **But NEVER write it does not name the VARIANT - measured false:** the fallback scans the whole
  body, orphans included, so a stray `SV2` re-types it. `PRE-EXISTING`, not narrowed.
- **The suppression is SCOPED, not latched** - a flag beside each `serviceLineDropped`, cleared in
  `flushServiceLine`. **A latching one silences every later orphan.**
- **🩺 ANCHOR `X12_837_UNKNOWN_VARIANT` AT THE `ST` (`tx.segments[0]`), NEVER THE `BHT`; NO
  `elementIndex` (an absent ST-03 has no element 3). ROUTE 1's DISCARD IS A TRADE: a stray `LX` in
  an ENTITY loop LOSES its `N3`/`N4`/`REF`/`PER`, each WARNED AT ITSELF
  (`X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`); NEVER WIDEN IT, other unattached routes stay
  SILENT. NEVER write "nothing after an `LX` addresses the last party", and NEVER cite
  `X12-SEGMENT-OUTSIDE-TRANSACTION-DROPPED` - it WARNS and retains.**

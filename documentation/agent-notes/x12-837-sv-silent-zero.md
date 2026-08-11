# `X12-837-SV-SILENT-ZERO` (2026-08-05)

> **RELOCATED VERBATIM from `CLAUDE.md` on 2026-08-11 to pay for the
> `X12-PRE-005010-RUNTIME-MESSAGE` trap, nothing dropped.** The narrative it summarises is in
> `documentation/agent-notes.md#x12-837-sv-silent-zero-2026-08-05`; the imperatives are HERE and are
> live. `CLAUDE.md` keeps only the cursor.

### 🩺 `X12-837-SV-SILENT-ZERO` (2026-08-05) · `documentation/agent-notes.md#x12-837-sv-silent-zero-2026-08-05`

- **🩺 An 837 Loop 2400 line closed with NO `SVx` decoded for the resolved variant warns
  `X12_837_SERVICE_LINE_NOT_DECODED` at its `LX`.** BOTH causes: a foreign `SVx`, and none at all.
- **🩺 THIS slice closed only the SILENCE.** `charge`/`units` read `undefined`, and this warning
  still says WHY - `undefined` alone does NOT separate it from a decoded `SVx` whose charge element
  was absent.
- **🩺 NEVER decode the `SVx` that IS present, nor let it flip the line's variant.** The charge is
  `SV1-02`/`SV2-03` and the units `SV1-04`/`SV2-05`/**`SV3-06`** (`SV3-05` is the prosthesis code -
  three comments said units and were corrected), so that mis-READS money. `opts.type` is a caller
  instruction, so **the warning attributes nothing**: a `type` can disagree with a clean document.
- **Anchor the `LX`, never the `SVx`** (the no-`SVx` case has none); no `elementIndex`.
- **🩺 THE RESIDUAL TEST DID NOT GO RED, AND THAT IS THE FINDING.** **Pin the WHOLE channel, BOTH
  sides.**
- **Only bytes make these; no round trip can.** 4 leak probes + 2 controls, both ways: deleting one
  flag-set reds a control.
- **🩺 `X12-837-SV-UNDEFINED-DECIMAL` CLOSED THE `0`** - its own trap above.

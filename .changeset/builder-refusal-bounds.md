---
"@cosyte/x12": patch
---

Bound the caller-supplied values that reach a `build*` refusal message, and anchor the 835
remit-total balance warning at the BPR.

All sixteen caller-value slots across the ten builder modules now route through the new
`renderCallerValue`, capping the rendered fragment at `BUILD_REFUSAL_VALUE_MAX_RENDERED` (92
characters, of which up to `BUILD_REFUSAL_VALUE_MAX_LENGTH` = 63 are your value). All three are
exported so the ceiling can be asserted rather than trusted. Nine of the sixteen are the over-long
control number, where the branch fires because the value is over-long; the other seven had no length
gate at all. Measured: a 120,000-character control number produced a 120,066-byte
`X12BuildError.message` and now produces a 90-byte one. This is robustness and log hygiene, not
redaction: the value is the caller's own, and the surviving characters are bounded but not escaped.

The 835 remit-total balance warning's `position.segmentIndex` was a literal `0`. That is not a
neutral sentinel, because `tx.segments[0]` is the `ST`. It now carries the BPR's own 1-based body
index, so the position resolves to the segment holding the BPR-02 the invariant compares against.

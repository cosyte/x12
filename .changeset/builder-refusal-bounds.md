---
"@cosyte/x12": patch
---

Bound the caller-supplied values that reach a `build*` refusal message, and anchor the 835
remit-total balance warning at the BPR.

All twenty caller-value slots across the ten builder modules now route through the new
`renderCallerValue`, capping the rendered fragment at `BUILD_REFUSAL_VALUE_MAX_RENDERED` (90
characters, of which up to `BUILD_REFUSAL_VALUE_MAX_LENGTH` = 63 are your value). All three are
exported so the ceiling can be asserted rather than trusted. Nine are the over-long control number,
where the branch fires because the value is over-long; seven had no length gate at all; four are the
AK9 counts, typed `number` and reachable with a string from a `JSON.parse`d spec. Measured: a
120,000-character control number produced a 120,066-character `X12BuildError.message` and now
produces a 150-character one. The 90 is the ceiling on the interpolated fragment, not on the message.

This is robustness and log hygiene, not redaction: you passed the value in and still hold it, and the
surviving characters are bounded but not escaped. On the acknowledgment path the value is not always
strictly your own, since TR3 005010X231A1 has AK2-02 echo the acknowledged ST-02 verbatim.

`renderCallerValue` also coerces a non-string rather than reading `.length` off it, so a spec from
`JSON.parse` carrying a numeric control number still raises a typed, code-tagged error.

The 835 remit-total balance warning's `position.segmentIndex` was a literal `0`. That is not a
neutral sentinel, because `tx.segments[0]` is the `ST`. It now carries the BPR's own 1-based body
index, so the position resolves to the segment holding the BPR-02 the invariant compares against.

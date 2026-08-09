---
"@cosyte/x12": patch
---

🩺 `parseTA1`'s five decoded fields are POST-`?`-unescape, and an empty TA1-02 / TA1-03 / TA1-04 /
TA1-05 is refused on emit (`X12-TA1-RESIDUALS`). Both are behaviour changes, and they are the two
ends of one disagreement: this package's emit half releases a TA1 element and its read half decoded
the escape rather than the value.

`X12-TA1-EMIT-NOT-RELEASE-AWARE` made `buildTA1` release all five caller elements; `parseTA1` kept
reading `elements` verbatim. Measured at `0.0.15`, over `parseX12` + `parseTA1` of what `buildTA1`
had just emitted:

```text
interchangeControlNumber   raw emitted                          parseTA1 read     dot-path read
"00000001?"                TA1*00000001??*260601*1200*A*000     "00000001??"      "00000001?"
"0000*0001"                TA1*0000?*0001*260601*1200*A*000     "0000?*0001"      "0000*0001"
"0000~0001"                TA1*0000?~0001*260601*1200*A*000     "0000?~0001"      "0000~0001"
"0000:0001"                TA1*0000?:0001*260601*1200*A*000     "0000?:0001"      "0000:0001"
"0000^0001"                TA1*0000?^0001*260601*1200*A*000     "0000?^0001"      "0000^0001"
```

Every row `warnings: []`. TA1-01 is the reassociation key, so the left column is a key matching no
ISA-13. The right column is the same element through a dot-path, which already unescaped, and
`parse999` does the same on its IK4-01 composite. `raw` is untouched and is still the verbatim byte
surface. If you were applying `unescapeRelease` to `parseTA1`'s output yourself, drop that call.

On the emit half, `escapeRelease` early-returns on `""` and `buildTA1` carried a required-field guard
for TA1-01 alone, so `interchangeDate: ""` emitted `TA1*000000001**1200*A*000`, `interchangeTime: ""`
emitted `TA1*000000001*260601**A*000`, `ackCode: ""` emitted `TA1*000000001*260601*1200**000` and
`noteCode: ""` emitted `TA1*000000001*260601*1200*R*`, all `warnings: []`. Each now draws
`AckBuildError` with the existing `X12_ACK_INVALID_SPEC`, naming the slot and the spec property and
never the value. No error code is minted and no warning code moves.

🛑 It does NOT trim at any slot - a whitespace-only element still builds, as at TA1-01, because
trimming is a normalisation rule and no source consulted for this package states one. 🛑 It does not
narrow what a NON-empty element may contain: an out-of-enum `ackCode: "X"` still builds and the read
half still applies its documented fail-safe narrow to `R`. 🛑 Every guard that stood before it keeps
its precedence - `enforceAcceptIsClean` still runs first, TA1-01 still draws the control-number
refusal, and every wrong-TYPED element still draws the escape helper's refusal, because all five
escapes run before any emptiness test.

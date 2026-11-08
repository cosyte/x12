---
"@cosyte/x12": patch
---

`KNOWN-LIMITATIONS.md` and the troubleshooting guide now match what the builders do with a control number: a numeric `interchangeControlNumber` draws a typed refusal saying it must be a string, not an "exceeds the 9-char spec limit" one, and `buildTA1`'s refusal for an empty or non-string TA1-01 names `TA1-01`. Zero-padding a short control number happens at ISA-13 only; `buildTA1` emits TA1-01 as supplied, so `"1"` goes out as `TA1*1*…`. No behavior changed.

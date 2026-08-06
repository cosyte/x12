---
"@cosyte/x12": patch
---

🩺 A builder refusal no longer echoes the value it refused, so a numeric `claimId` or member id from a JSON-driven caller cannot reach `Error.message`. The shared caller guards report the offending TYPE instead, and only the segment-join guard names the slot alongside it; the values a builder's own template names by field, such as a control number or an X12 control code, are unchanged, as is the `length` of a forged array-like.

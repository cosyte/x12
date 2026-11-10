---
"@cosyte/x12": patch
---

`parse999` now warns when a 999 has no AK1. The reading already filled in an empty `ak1` (empty `functionalIdCode` and `groupControlNumber`, undefined `versionRelease`), but `warnings` came back empty, so a 999 that named no functional group looked like one that named an empty one. The new warning code `X12_999_AK1_ABSENT` says so at the ST. Adds `WARNING_CODES.X12_999_AK1_ABSENT` and its factory `ack999Ak1Absent`; the model reads as before.

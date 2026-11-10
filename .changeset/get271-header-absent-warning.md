---
"@cosyte/x12": patch
---

`get271Eligibility` now warns when a 271 has no BHT segment. The guide requires one right after the ST, but a 271 without it read with `warnings` empty, so a payer response missing it was accepted with no sign. The new warning code `X12_271_HEADER_ABSENT` says so at the ST, and the rest of the transaction set reads as before. Adds `WARNING_CODES.X12_271_HEADER_ABSENT` and its factory `eligibility271HeaderAbsent`.

---
"@cosyte/x12": patch
---

`parse999` now warns when it fills in a disposition. A response whose IK5 never arrived, and a 999 with no AK9, already read as a reject (`R`), but `warnings` came back empty, so a reject the reader made up looked the same as one the sender sent. Two new warning codes say so: `X12_999_IK5_ABSENT` at the AK2 whose IK5 is missing, and `X12_999_AK9_ABSENT` at the ST when the AK9 is. Adds `WARNING_CODES.X12_999_IK5_ABSENT`, `WARNING_CODES.X12_999_AK9_ABSENT` and their factories `ack999Ik5Absent` and `ack999Ak9Absent`; the model reads as before.

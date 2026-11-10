---
"@cosyte/x12": patch
---

`parse999` now warns when it cannot read a disposition. An IK5-01 (or legacy AK5-01) or AK9-01 that is absent, empty or not one of the seven codes of code list 715 already read as a reject (`R`), but `warnings` came back empty, though the reader's doc comment said it warned, so a reject the reader made up looked the same as one the sender sent. Two new warning codes say so at that segment, element 1: `X12_999_IK5_DISPOSITION_UNKNOWN` and `X12_999_AK9_DISPOSITION_UNKNOWN`. Adds those two `WARNING_CODES` entries and their factories `ack999Ik5DispositionUnknown` and `ack999Ak9DispositionUnknown`; the model reads as before.

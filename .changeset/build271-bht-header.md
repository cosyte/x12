---
"@cosyte/x12": patch
---

`build271` now writes the BHT segment the 005010X279A1 guide requires right after the ST of every 271; before, it went straight from the ST to the first HL, so a trading partner checking against the guide could reject every 271 it built. The new optional `header` field (type `Build271HeaderSpec`) sets the BHT: `hierarchicalStructureCode` defaults to `0022`, `purposeCode` to `11` (response), `date` and `time` to the group date and time, and `referenceId` (BHT-03, the 270's own identifier to echo back) has no default and is written empty when left out. An empty BHT-01, BHT-02, BHT-04 or BHT-05, given or defaulted, is refused with `X12_271_BUILD_INVALID_SPEC`. SE-01 counts the new segment, so a built 271 has one more segment than before.

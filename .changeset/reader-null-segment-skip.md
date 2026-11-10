---
"@cosyte/x12": patch
---

`get834Header`, `get275Attachments` and `get277RequestForAdditionalInformation` now skip a hole in a caller-built `segments` list, as every other reader already did, where they threw an untyped `TypeError`. Every reader now also skips a `null` in that list, the shape a JSON round trip leaves for a hole, where each one threw. A position on the reading still indexes the caller's own `segments`.

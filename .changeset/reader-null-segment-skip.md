---
"@cosyte/x12": patch
---

`get834Header`, `get275Attachments` and `get277RequestForAdditionalInformation` now skip a hole in a caller-built `segments` list, as the other readers already did, where they threw an untyped `TypeError`. So does `get837Claims` when no ST-03 or `type` option names the variant and it reads the variant from the service segments, where it threw the same. Every reader now also skips a `null` in that list, the shape a JSON round trip leaves for a hole, where each one threw. A position on the reading still indexes the caller's own `segments`.

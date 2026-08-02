---
"@cosyte/x12": patch
---

Re-emit segments that fall outside a transaction at their structural anchor, so both the segment and its `X12_UNEXPECTED_SEGMENT` warning survive a round trip.

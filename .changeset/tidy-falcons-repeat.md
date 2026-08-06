---
"@cosyte/x12": patch
---

🩺 `build278Request` and `build278Response` now refuse a review whose HL-03 level code is outside `EV` and `SS`, because such a level emitted a well-formed document whose review and its HCR-01 certification decision no reader decodes. An omitted level still defaults to `EV`.

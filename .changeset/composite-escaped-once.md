---
"@cosyte/x12": patch
---

Nothing you call or receive changes: `build835` and `build837P`, `build837I` and `build837D` write the same bytes as before. The source now records why these builders write the envelope themselves rather than through `buildInterchange` (which would escape each composite element a second time, so SVC-01 `HC:99213` would go out as `HC?:99213`), and new tests fail if that changes. Only the source maps in `dist` differ from the last release.

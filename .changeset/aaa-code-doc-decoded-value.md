---
"@cosyte/x12": patch
---

Nothing you call or receive changes. The documentation of `X12AaaCode` no longer says `code` is exactly the bytes the payer sent: it is the decoded AAA-03 value with the release character removed, as every decoded field is, so an AAA-03 sent as `7?*2` reads `7*2`, and `tx.segments` keeps the framed bytes. Only the type declarations and source maps in `dist` differ from the last release.

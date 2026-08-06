---
"@cosyte/x12": patch
---

🩺 An 837 `N3` / `N4` / `PER` / `REF` discarded after a stray `LX` now says so: `X12_837_ENTITY_SEGMENT_DISCARDED_AFTER_LX`, the 27th Tier-2 warning code, raised at the discarded segment itself (`X12-DISCARD-AFTER-STRAY-LX`).

This closes the silence disclosed by the change above it in this same unreleased window. There, an `LX` arriving with **no `CLM` open** was made to close the entity loop it interrupted, which stopped a line-item control number, a street address and a contact surfacing on a **later** claim's payer. The cost, stated at the time rather than argued away, is that where the `LX` was stray **inside** an entity loop, that entity's own conformant `N3` / `N4` / `REF` / `PER` are discarded. That discard is what this code names, so no published release ever carried the discard without the warning.

**The anchor is the discarded segment, not the `LX`.** The loss is per segment, so two `N3`s are two warnings at two positions, and the segment is what a consumer resolves back through `tx.segments` to read the bytes. `X12_837_SERVICE_LINE_DROPPED`, raised at that same `LX`, reports the **service line** and names no entity segment, so the two codes report different things about the same stretch of the document and both can be on one channel.

**🩺 Read the bound literally: this is not a general "entity segment reached no party" report.** It fires only after such an `LX`, and only until the next `NM1` / `HL` / `CLM` opens a loop, so a party named after that `LX` is addressable again and its own trailing segments attach and stay silent. Every other route to an unattached `N3` / `N4` / `PER` / `REF` is exactly as silent as before: no entity loop open at the `LX` at all, an `NM1` this reader cannot route, an intervening `HL` or `CLM`, and the other dropped-`LX` route where a claim **is** open. A `DTP` / `AMT` / `NTE` on that route is discarded too and is deliberately not reported, because those never attach to a party on any route. Each bound is a test, and each is one a widened guard would fail.

**It reports that a segment reached no party, not that it would have reached one.** This reader does not surface every one of the four kinds on every party (a `PER` on a patient, or a pay-to address), so the code can fire where nothing this library's own reset lost; that is fail-safe, and it is stated rather than narrowed.

**Nothing about the model changed.** The segments are still discarded and still verbatim on `tx.segments`; reporting a loss does not restore it. Which party a segment following a **stray** `LX` belongs to is still not derivable from the TR3s in either direction, so the reader still refuses to attribute it rather than guessing. The public factory `entitySegmentDiscardedAfterLx(position)` is exported alongside the code, takes a position and nothing else, and its message is a lookup into the frozen registry table like every other, so no document bytes can reach a diagnostic.

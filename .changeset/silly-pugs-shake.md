---
"@cosyte/x12": patch
---

🩺 A lookup keyed by document bytes can no longer be defeated by a key inherited from `Object.prototype` (`X12-VARIANT-LOOKUP-PROTOTYPE`).

Several lookup tables were plain object literals, which inherit `Object.prototype`, so an inbound value matching **any own property of `Object.prototype`** resolved truthy against them. That set is engine- and version-dependent and is deliberately not enumerated here. `Object.freeze` does not help: it seals the own properties and changes nothing about the prototype chain.

The worst of it: an 837 `ST-03` of `constructor` made `submission.variant` a **function** rather than one of `P` / `I` / `D` / `unknown`, `X12_837_UNKNOWN_VARIANT` never fired, and **every Loop 2400 service line left the model** with an empty warning channel. The same shape made `lookupCarc("constructor")` answer a `CodeListEntry` whose `description` was a function while suppressing `X12_UNKNOWN_CARC`, suppressed `X12_UNKNOWN_HI_QUALIFIER` on an HI qualifier, fabricated an `X12_HL_PARENT_LEVEL_INVALID` against an HL-03 the walker has no expectation for, and made `isClaimAdjustmentGroupCode("constructor")` answer `true` (it used `in`, which walks the prototype chain).

Every one of these now behaves exactly as it does for any other unrecognized value. Tables this package declares are built through the new internal `wireLookup` (`Object.create(null)`, then frozen); tables it receives from a caller are guarded with `Object.hasOwn` at the read. No model shape, message text or code-list content changed.

Adds `X12_837_SERVICE_LINE_DROPPED`, the 25th Tier-2 warning code, plus the public factory `serviceLineDropped(position)`: an `LX` that opens no Loop 2400 at all, because no `CLM` is open or because the submission's variant is not one of `P` / `I` / `D`, no longer takes the whole service line off the model in silence. It is distinct from `X12_837_SERVICE_LINE_NOT_DECODED`, where the line is retained and only its service segment went unread. Nothing is fabricated to stand in and no claim is synthesized. The registry stays additions-only.

Read that code's scope literally. It is anchored at the `LX`, so an `SVx` arriving with **no `LX` at all** is still dropped silently (pre-existing, disclosed not fixed). It does **not** travel with `X12_837_UNKNOWN_VARIANT`, because a caller-supplied `type` outside `"P" | "I" | "D"` reaches the same route without it: read `submission.variant` to tell the two causes apart. And a `DTP` / `AMT` / `NTE` / `REF` following a dropped `LX` attaches to the **enclosing claim** rather than being discarded, so a line-level date, amount or note can land among the claim-level ones.

---
"@cosyte/x12": patch
---

An `AMT` or `ADX` row whose amount decodes nothing is no longer dropped in silence (X12-AMT-ADX-ABSENT-AMOUNT).

An `AMT` and an `ADX` are not slots on a bigger record: each one **is** a record, carrying an amount plus the thing the amount is about. So when the amount element (`AMT-02`, `ADX-01`) decodes no value, there is no row to build, and `AMT-01`'s qualifier or `ADX-02`'s adjustment reason code is dropped with it. Through `0.0.12` that happened with no diagnostic on any channel: `AMT*B6~` gave `claim.amounts: []` and `warnings: []`, which reads exactly like a document that never carried the segment at all.

**Added:** `X12_AMOUNT_ROW_DROPPED`, the 30th Tier-2 warning code, plus the public factory `amountRowDropped(position)`. It is raised at the `AMT` / `ADX` itself by the 835's claim-level and service-line `AMT`, the 837's claim-level `AMT`, the 834's coverage `AMT` and the 820's `ADX`. The 834's lands on that **member's** own `warnings`, the same per-member scoping the decimal sink beside it already used, because a roster-level report would say a premium was lost without saying whose. It carries **no** `position.elementIndex`: one of its two routes is an absent element, and an absent element has no index to name.

**Gate on both codes.** This is additive and no case moved onto the new one. An amount that is present and does not decode still raises `X12_UNPARSEABLE_DECIMAL` at its own `elementIndex`, now alongside this code rather than instead of it, so a gate you already wrote against that code fires on exactly the documents it fired on before. What such a gate never caught, on any release, is the absent-amount row above. Whether an `X12_UNPARSEABLE_DECIMAL` accompanies the new code at the same `position.segmentIndex` is what separates the two routes, since the new code is raised for both and discriminates neither.

**Two bounds.** A row dropped because no claim, service line, coverage or remittance was open to attach it to is a different loss, is still silent, and was not widened here. And an 820 `RMR` is not on this channel at all: `decodeRmr` drops on open-item identity (`RMR-01` and `RMR-02` both empty), never on the amount, so an `RMR` with no `RMR-04` keeps its row with `amountPaid` left `undefined` and there is no dropped row to report.

If you read 835, 837, 834 or 820 files on `0.0.12` or earlier and treated an empty `amounts` or `adjustments` list as "the sender stated no such amount", re-read those files: the list is empty on that reading too, and only the warning channel now tells the two apart.

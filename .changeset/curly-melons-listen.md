---
"@cosyte/x12": patch
---

An 837 whose variant was decided by a contested `SVx` fallback no longer says so on no channel at all (X12-837-RESIDUALS).

Variant resolution in `get837Claims` runs before the walk as `explicitType ?? variantFromIcr ?? variantFromSegment`. Absent a caller `type` option, and where `ST-03` names none of `005010X222A2` / `005010X223A3` / `005010X224A2`, the reader falls back to the **first** `SV1` / `SV2` / `SV3` in the transaction body, **orphans included**. So one stray `SV2` ahead of a conformant Professional claim re-types the whole submission Institutional: `submission.variant` reads `"I"`, every `SV1` line is left undecoded, and a consumer routing on that field sends a Professional claim down an Institutional path. Through `0.0.13` the line-level consequences were reported and **the submission-level typing that produced them was not**, so `submission.variant` carried a confident value with nothing to contradict it.

**Added:** `X12_837_AMBIGUOUS_VARIANT`, the 32nd Tier-2 warning code, plus the public factory `ambiguous837Variant(position)`. It is raised where the fallback resolved the variant **and** the body carries service segments naming more than one, anchored at the `ST` (`tx.segments[0]`, which is what carries `ST-03`) and carrying **no** `position.elementIndex`: the conflict is a property of the body rather than of an element, and one route into it is an `ST-03` that is absent altogether.

**This closes only the silence, and the restraint is the point.** The fallback is **not** narrowed and first-wins is unchanged. Which variant a document resolves to, which lines decode, and which warnings the walk raises are byte-for-byte what they were on `0.0.13`. Excluding orphans from the fallback would change how already-published documents decode, and that is its own slice.

**Which service segment is the stray one is not decided, and this reader cannot decide it.** A stray service segment and a conformant one are indistinguishable to it, and the fallback takes the first whether or not a Loop 2400 was open at that segment. Reporting the conflict is honest; picking a winner would be inventing. Re-read with `get837Claims(delimiters, tx, { type })` to decode the document against a variant you trust.

**It reports the resolution, never the document.** A caller `type` wins ahead of the fallback and so does a resolving `ST-03`, and in either case no guess was made, so this code is **not** raised however mixed the body is. Read the bound that way rather than as "the file carries more than one kind of service segment". It fires **once per transaction**, because there is one resolution per transaction, and it can never travel with `X12_837_UNKNOWN_VARIANT`, which is the other outcome of that same resolution: nothing to fall back on at all.

**It is additive and nothing moved onto it.** `X12_837_SERVICE_LINE_NOT_DECODED`, `X12_837_SERVICE_SEGMENT_WITHOUT_LX` and `X12_837_SERVICE_LINE_DROPPED` fire on exactly the documents they fired on before, in the same positions, pinned by committed tests that assert the whole warning channel with the new code filtered out. **No consumer predicate written against any existing code changes meaning.** Read that as **invariance, not as a list of what else you will see** on a contested document: it does not promise that any particular loss on one is reported at all, and one that is not was not reported before this code existed either. A stray `LX` that opened no line, for one, already suppressed `X12_837_SERVICE_SEGMENT_WITHOUT_LX` for the service segments inside it, and still does.

**What it does not close.** Narrowing the fallback, which is deliberately left alone and is its own slice.

If you read 837 files on `0.0.13` or earlier from senders whose `ST-03` you do not control, re-check any routing you drove off `submission.variant`: the value is unchanged on this release, and only the warning channel now tells you it was a guess.

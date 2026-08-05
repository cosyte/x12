---
"@cosyte/x12": patch
---

🩺 An 837 service segment with no Loop 2400 open no longer takes a charge, a quantity and a procedure code off the model in silence (`X12-837-LOOP-RESIDUALS`).

Through `0.0.10`, the release published as this was written, an `SV1` / `SV2` / `SV3` arriving with no Loop 2400 open found no service line to decode into, was read into nothing, and reported on **no channel at all**. The claim came back with an empty `serviceLines` and an empty `warnings`, indistinguishable from a claim that genuinely had no service lines. This was the last of the three ways an 837 service line could go missing that had no diagnostic.

Adds `X12_837_SERVICE_SEGMENT_WITHOUT_LX`, the 26th Tier-2 warning code, plus the public factory `serviceSegmentWithoutLx(position)`. `position.segmentIndex` names the **service segment itself**, which is why it is a new code rather than a widening of an existing one: the two service-line codes this library already had are both anchored at an `LX`, and there is no `LX` in scope here to anchor to. Read the condition literally - it is "no line open", not "the file contains no `LX`": an `LX` in an earlier claim is still an `LX`. It reports once per service segment rather than once per loop. The registry stays additions-only.

**The segment is still not decoded into any line, and that is deliberate.** `SV1-02` and `SV2-03` are both the line charge, so reading a service segment into a line the walker never opened mis-reads money. Refusing to read is the safe half; doing it silently was the defect. Nothing is fabricated to stand in and no line or claim is synthesized; the segments stay verbatim on `tx.segments`.

The other two codes are unmoved. An `LX` that opened no Loop 2400 still raises `X12_837_SERVICE_LINE_DROPPED` once, at the `LX`, and the service segments inside that dropped loop stay quiet rather than naming the same loss twice under two codes; that suppression is scoped to the dropped loop, so a later orphan in the same transaction is still reported. A line that IS on the model with an undecoded `SVx` still raises `X12_837_SERVICE_LINE_NOT_DECODED` and nothing else. A file with several claims can carry all three, on three distinct segments.

It says nothing about how the submission's variant resolved. A caller-supplied `type` option wins first; absent one, and where `ST-03` names none of the three known implementation conventions, the reader falls back to the first `SVx` in the transaction body, orphans included, so a stray `SV2` re-types the whole submission and every conformant line in it then reads `0`. That is pre-existing behaviour, measured identical at `0.0.10`, warned rather than silent, and deliberately not narrowed here; `KNOWN-LIMITATIONS.md` states it.

No model shape changed: `charge` and `units` are still typed `X12Decimal`, and an absent `SV1-02` on a line that DID open still reads a confident `0`. That closes only with the deferred `X12Decimal | undefined` change and is untouched here. `KNOWN-LIMITATIONS.md` states the measured bounds.

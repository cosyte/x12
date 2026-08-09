---
"@cosyte/x12": patch
---

🩺 `implementationConventionReference` is POST-`?`-unescape in every typed reader that publishes it
(`X12-ST03-READ-NOT-RELEASE-AWARE`). A behaviour change on any document whose `ST-03` carries a
release escape.

`X12TransactionSet.st.elements` is the ST segment as framed - post-element-split and PRE-unescape -
and five public readers were handing one of those strings straight back on the model:
`get837Claims`, `get277Status`, `get277CADisposition`, `get278Request` and `get278Response`. A
sender that escaped a delimiter inside `ST-03` got the escape rather than the value it stated. An
`ST-03` framed as `A?*B` published `A?*B` and now publishes `A*B`; likewise `A??B` -> `A?B`, `A?:B`
-> `A:B`, `A?~B` -> `A~B`, `A?^B` -> `A^B`. The grounding is this package disagreeing with itself:
every dot-path read already unescaped and `parse999` already decoded `AK2-03`, the identically-named
field. No TR3 clause is claimed.

**🛑 What DECIDES an outcome did not move.** The 837 variant lookup, the 277 / 277CA
`transactionType` discriminator and `get277CADisposition`'s admission gate all still key on the RAW
element text, so no document changes variant, discriminator or admission because of this. They can
differ - a letter is an admissible delimiter, so with `componentSeparator: "X"` an `ST-03` framed as
`005010?X222A1` decodes to `005010X222A1`, which the variant table holds, and keying on the decoded
text would make the declaration beat the `SVx` fallback and stop an `SV2` line decoding. That is
left open. The difference is one-way: nothing that resolved a variant, or was admitted by
`get277CADisposition`, stops doing so.

Nothing is trimmed or case-folded; a whitespace-only `ST-03` is still published untrimmed, and a
dangling `?` still raises no warning on these readers. `tx.st.elements` is untouched and is still
the verbatim framed surface: if you were applying `unescapeRelease` to
`submission.implementationConventionReference` yourself, drop that call.

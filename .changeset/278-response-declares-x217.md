---
"@cosyte/x12": patch
---

`build278Response` now declares `005010X217` in GS-08 and ST-03, where it
declared `005010X216`. This changes what goes on the wire: a trading partner
that routed a built 278 response on either element sees the new value.

`005010X217` is the one guide 45 CFR 162.920 names for the 278 in both
directions, and it is the guide `build278Request` already wrote. `005010X216` is
the 278 notification guide, so a receiver routing on it could file a prior
authorization decision as an admission or discharge notification.

Only those two identifiers move. The 278 body the builder writes is unchanged:
the HL spine, the HCR certification decision and every segment other than GS
and ST are what they were. The read side is unchanged too: a 278 declaring
`005010X216` still carries `X12_GUIDE_NOT_IMPLEMENTED` on both 278 readers. The
builder's own output now reads back through `get278Response` with no
guide-mismatch warning, where it carried that code before.

The 278 response row of `X12_TR3_CONFORMANCE` no longer records a divergence
between the guide it names and the guide the builder emits, because they are now
the same: its `note` is `null`, like the request row's.

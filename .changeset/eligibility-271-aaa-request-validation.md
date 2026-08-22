---
"@cosyte/x12": patch
---

**A rejected 271 no longer reads as a member with no benefits.** `AAA`
request-validation segments are typed onto the 271 model, at the information
source, information receiver, subscriber and dependent levels, on a new
`aaaConditions` collection. Through this release those two answers had the same
shape through the typed surface: the payer's rejection survived on
`tx.segments` and the DISTINCTION did not survive into the reading, so a caller
that trusted the model reported "no coverage" where the payer had actually said
"I could not process your inquiry, and here is why".

This supersedes the deferral a previous release recorded for the 271, which
listed AAA request-validation segments among those it carried on `tx.segments`
alone. AAA on the 270 inquiry direction is unchanged and still untyped, and
`HSD` detail and the `III` / `LS` / `LE` markers stay as they were.

**Always present, never absent.** `X12Eligibility.aaaConditions` is on every
271 result this library returns and is EMPTY for a document carrying no `AAA`.
A present, empty collection is a stated zero; an `undefined` field could not be
told from a reader that does not look, which is the exact ambiguity this
collection exists to remove. A document with no AAA produces no entry, and no
rejection is ever synthesised from an absent benefit list.

**Each entry names the loop it came from.** The key is three parts: the level,
the hierarchical identifier the document assigned that loop (HL-01, as
`hierarchies` already reports it), and the zero-based index of that loop
occurrence among occurrences of the same level, counted DOCUMENT-WIDE in
transmitted order and never restarted per parent. So the third dependent loop
in a document is index 2 whether it is the first dependent of the second
subscriber or the third dependent of the first, and a caller can say WHICH
dependent of WHICH subscriber the payer rejected. Where a loop states no
HL-01, or no level of a named kind encloses the segment, that part of the key
is left absent rather than synthesised, the AAA is still surfaced, and
`X12_271_AAA_LOOP_UNIDENTIFIED` reports it.

**Two AAA are two conditions.** Nothing is de-duplicated: two segments at one
level carrying the same reject reason code both surface, in transmitted order.
An `AAA` under a level whose loop carries nothing else surfaces against that
level, and creates no subscriber, no dependent and no hierarchy entry, so a
caller counting subscribers sees the same count as before this release.

**Only two element positions are read, and both have a recorded source.** The
reject reason code and the follow-up action code are taken from positions
established by a third-party EDI reference reproducing the 005010 AAA layout,
recorded with its URL, its retrieval date and the sha256 of the bytes read, so
the citation names one document rather than whatever that page says next. It is
NOT the paid ASC X12 Technical Report Type 3, which was not purchased, so the
mapping is single-source rather than verified. Nothing beyond those two is
assigned a meaning: an element past them raises
`X12_271_AAA_SEGMENT_MALFORMED`, which reports that a position is occupied and
says nothing whatever about what occupies it. The segment's true maximum
element count is neither sourced nor asserted anywhere.

**The bundled description snapshots ship EMPTY, deliberately.**
`AAA_REJECT_REASON_CODES` and `AAA_FOLLOW_UP_ACTION_CODES` carry a four-part
provenance record in the artifact itself (source, capture date, maintaining
organisation, redistribution terms) and `bundleAaaCodes` refuses to bundle a
description while any part is unestablished or the terms do not permit it. The
maintaining organisation requires permission for the use of its work products
and none has been obtained, so this package ships the verbatim inbound code
with no description rather than a description whose terms nobody recorded. Every
inbound AAA code is therefore unrecognised today and raises exactly one
`X12_271_AAA_UNKNOWN_CODE` per occurrence. No existing bundled code list is
touched, enlarged, re-fetched or re-licensed by this change.

**Fail-safe, unchanged.** The four Tier-3 fatal codes are unchanged and AAA
content never makes reading a 271 fatal. A missing or empty reject reason code
surfaces as ABSENT with no placeholder and raises
`X12_271_AAA_REJECT_REASON_ABSENT`, which is a DIFFERENT code from the
unrecognised-code one so "no reason given" and "a reason this package cannot
describe" stay distinguishable. An absent follow-up action code is left absent
with no empty-string stand-in. Every diagnostic is a literal in the frozen
`ALL_WARNING_MESSAGES` registry carrying the level and the position and nothing
the sender sent; no factory added here takes a document element.

**A level code is document bytes, and the table that reads it has no
prototype.** HL-03 reaches the level lookup verbatim off the wire, so that
lookup is built with a null prototype: an HL-03 naming a member of
`Object.prototype` leaves the level ABSENT and raises
`X12_271_AAA_LOOP_UNIDENTIFIED`, exactly as any other level code this reader
cannot name does, rather than resolving through the prototype chain to a value
that is not a level at all.

Warning registry 40 to 44, additions-only. `tx.segments` is untouched: every
`AAA` is still preserved verbatim, with the same element values, element order
and segment order, and nothing was moved off it to build the typed surface.

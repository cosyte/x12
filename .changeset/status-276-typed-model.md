---
"@cosyte/x12": patch
---

Typed read and emit support for the 276 Health Care Claim Status Request
(TR3 `005010X212`), which closes the 276 half of the inquiry gap and, with the
270 half already shipped, leaves no v1 transaction needing raw segment and
dot-path work. The 270, 271, 277 and 277CA surfaces are unchanged: nothing is
renamed, widened or re-identified, and the 276 is added beside them.

**Read.** `get276StatusInquiry(delimiters, tx)` decodes one 276 transaction set
and answers `undefined` when the transaction set is not a 276, which is the
refusal shape every other per-transaction reader in this package uses.
`parse276StatusInquiries(raw)` decodes every 276 in an interchange, in
transmitted order, one model each with its own warnings, and answers an EMPTY
list when the interchange carries none, with no warning about the absence: an
interchange full of 277s is not a defective 276.

The model exposes the information source, information receiver, service
provider, subscriber and dependent levels NESTED in the parent-child
relationship the sender transmitted - a five-level spine, one level deeper than
the 270's, because the claim-status family carries the service provider between
the receiver and the patient. Each level carries its name, identifiers and
demographics; each claim carries the trace the answering 277 echoes back, its
REF identifiers, its AMT amount rows, its DTP date rows with the DTP-02
qualifier that says whether a value is a single date or a range, and its Loop
2210 service lines. A composite comes back as its separated components and never
as one joined string, so two documents differing only in their declared
delimiters decode to equal models. A dependent is its own level with its own
claims and is never merged onto the subscriber it hangs under.

**A level attaches by its own HL-02 and by nothing else.** A pointer that names
no present level, one that names a level of the wrong kind, and a parent chain
that returns to itself each leave that level, and everything transmitted beneath
it, off the returned tree, reported by `X12_276_LEVEL_DETACHED` beside the code
for the defect itself. Nothing is re-parented onto whichever level happened to
be open and no pointer is ever re-numbered: the declared pointer stays verbatim
on `hierarchies` and the segments stay verbatim on the transaction set. Where
two levels are transmitted with the same HL-01, a child naming it attaches to
the FIRST in transmitted order, so the same bytes always decode to the same
model.

**Emit.** `build276(spec)` emits a spec-clean 276 by construction: it owns the
HL spine, computing every HL-01, HL-02 and HL-04 from the nested spec, so a
structurally inconsistent hierarchy is unrepresentable and SE-01 is correct by
construction. It stamps ST-01 `276` and `005010X212` into GS-08 and ST-03, and
takes GS-01 from a new cited data element 479 table
(`src/code-lists/functional-identifier.ts`) rather than restating a code from a
TR3 this package has not purchased. That table records the reference it was read
from, with the retrieval date and content digest, and bundles code values only:
descriptions ship from it no more than they do from the AAA snapshots beside it,
because the redistribution terms recorded there do not permit it. Eight of its
nine rows are cross-checked against the GS-01 this package's other builders
already declare, so the row the 276 uses arrives with the same eight-way
agreement behind it. The resulting GS-01 is `HR`, which is not the 277's
response identifier `HN`.

It refuses, with the typed `ClaimStatus276BuildError` and its own stable
`CLAIM_STATUS_276_BUILD_ERROR_CODES`, anything it cannot make spec-clean: no
information source, a source with no receiver, a receiver with no service
provider, a provider with no subscriber, a level with no name loop at ANY of the
five levels, a subscriber that asks about no claim and carries no dependent that
does, a dependent with no claim, a claim carrying nothing a payer could find it
by, a claim with no trace, a service line identifying no service, an empty or
over-long control number, a non-string element value, a non-`X12Decimal` amount,
a forged array-like where a list belongs, and a real list left with an empty slot
in it. The error class is a SIBLING of `ClaimStatus277BuildError` and not a
widening of it: a consumer catching a `277` error out of `build276` would be
reading a name that lies about which direction refused. Refusal messages name
structural indices and counts, never a member identifier, a member name, a
patient name, a trace, a claim number or a diagnosis code, and the one caller
value any of them renders goes through the package's bounded renderer.

**Warning codes are added as siblings, and nothing is renamed, removed or
renumbered.** `X12_276_DUPLICATE_HIERARCHY_ID`, `X12_276_HIERARCHY_CYCLE` and
`X12_276_LEVEL_DETACHED` report the hierarchy hazards above.
`X12_276_DATE_ROW_DROPPED` and `X12_276_REFERENCE_ROW_DROPPED` report a DTP or a
REF that reached the reader short of the elements its row is built from: each is
a record and not a slot, so the whole row goes and the loss is reported rather
than left to look like something the sender never stated. They are siblings of
the 270's codes rather than a widening of them, so a consumer narrowing on
`X12_270_LEVEL_DETACHED` does not start seeing claim-status requests. The 276's
AMT loss takes the EXISTING `X12_AMOUNT_ROW_DROPPED`, which already names that
loss for every AMT this library reads. Every 276 code is raised on the 276 path
only, so no fixture of any other transaction set gains a warning it did not
have.

**`X12_TR3_CONFORMANCE` gains a 276 row** naming `005010X212` with its errata
`005010X212E1`, beside the 277 row that names the same guide: they are two halves
of one document and each half now carries a row. The 277 row's note said this
package implemented that half alone; it no longer does, so both notes now say
the pair is covered.

**No external oracle is claimed.** Nothing reachable maps a 276 request at
005010, so the evidence for this surface is the build-then-read round trip, the
committed golden at `test/fixtures/golden/276.edi`, the property suite over a
delimiter-safe grammar, and the 277's own declarations in this package. Nothing
here promises or implies differential conformance.

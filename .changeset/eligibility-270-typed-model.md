---
"@cosyte/x12": patch
---

Typed read and emit support for the 270 Health Care Eligibility Benefit Inquiry
(TR3 `005010X279A1`), which closes the 270 half of the inquiry gap. The 276
claim status inquiry is unchanged and still has no typed model on either side.

**Read.** `get270Inquiry(delimiters, tx)` decodes one 270 transaction set, and
answers `undefined` when the transaction set is not a 270, which is the refusal
shape every other per-transaction reader in this package uses.
`parse270Inquiries(raw)` decodes every 270 in an interchange, in transmitted
order, one model each with its own warnings, and answers an EMPTY list when the
interchange carries none. The two answers are deliberately different values: a
mis-routed call and an interchange with nothing to read are different facts.

The model exposes the information source, information receiver, subscriber and
dependent levels NESTED in the parent-child relationship the sender
transmitted, each level's name, identifiers, address and demographics, its
trace numbers, its dates with the DTP-02 qualifier that says whether a value is
a single date or a range, and its `EQ` eligibility inquiries with their
requested Service Type Codes. A composite comes back as its separated
components and never as one joined string, so two documents differing only in
their declared delimiters decode to equal models. A dependent is its own level
with its own traces and inquiries and is never merged onto the subscriber it
hangs under.

**A level attaches by its own HL-02 and by nothing else.** A pointer that names
no present level, one that names a level of the wrong kind, and a parent chain
that returns to itself each leave that level, and everything transmitted
beneath it, off the returned tree, reported by `X12_270_LEVEL_DETACHED` beside
the code for the defect itself. Nothing is re-parented onto whichever level
happened to be open and no pointer is ever re-numbered: the declared pointer
stays verbatim on `hierarchies` and the segments stay verbatim on the
transaction set. Where two levels are transmitted with the same HL-01, a child
naming it attaches to the FIRST in transmitted order, so the same bytes always
decode to the same model.

**Emit.** `build270(spec)` emits a spec-clean 270 by construction: it owns the
HL spine, computing every HL-01, HL-02 and HL-04 from the nested spec, so a
structurally inconsistent hierarchy is unrepresentable and SE-01 is correct by
construction. It refuses, with the typed `Eligibility270BuildError`, anything it
cannot make spec-clean: no information source, a source with no receiver, a
receiver with no subscriber, a level with no name loop at ANY of the four
levels, a level that asks nothing, an inquiry carrying neither a service type
nor a procedure, an empty or over-long control number, a non-string element
value, a forged array-like where a list belongs, and a real list left with an
empty slot in it. The last is the shape a JSON payload with a dropped record
carries, and it is refused wherever it stands rather than dereferenced for an
untyped `TypeError` a consumer cannot branch on. Refusal messages name
structural indices and counts, never a member identifier, a member name, a
patient name, a trace or a diagnosis code.

**Warning codes are added, and nothing is renamed, removed or renumbered.**
`X12_270_NON_CONVENTIONAL_DELIMITER` and `X12_270_INTER_SEGMENT_LINE_BREAK`
report the two tolerances the 270 path accepts without changing a value, once
per transaction set each, anchored at the ISA. The framing one is CR and LF and
nothing else, because that is the whole of what the shared parse absorbs: a
space or a tab between segments is not absorbed, the functional group does not
frame, and no typed reader sees a transaction set. That is unchanged
shared-parse behaviour, and `KNOWN-LIMITATIONS.md` now states it.
`X12_270_DUPLICATE_HIERARCHY_ID`, `X12_270_HIERARCHY_CYCLE` and
`X12_270_LEVEL_DETACHED` report the hierarchy hazards above.
`X12_270_DATE_ROW_DROPPED` reports a DTP that reached the reader short of the
qualifier (DTP-01) or the value (DTP-03) a date row is built from: a DTP is a
record and not a slot, so the whole row goes, the format qualifier with it, and
the loss is reported rather than left to look like a date the sender never
stated. Every one of them is raised on the 270 path only, so no fixture of any
other transaction set gains a warning it did not have, and
`X12_MISSING_REQUIRED_LOOP` carries the 270's structural regions through new
library-owned discriminants rather than more codes.

Nothing in the shared interchange parse changed. The 270 path takes the declared
delimiters and the segment framing from the parse this package already performs
for every transaction set; it adds no delimiter or framing tolerance, narrows
none, and emits no warning from shared code.

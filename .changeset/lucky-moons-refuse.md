---
"@cosyte/x12": patch
---

🩺 A delimiter set in which the release character `?` is also a delimiter is REFUSED on emit, by
every builder, in all FOUR roles.

`escapeRelease` protects a byte by PREFIXING `?` to it, in whatever role `?` was declared, so when
`?` is one of the four delimiters the protection is emitted as structure. The inverse holds at the
same time: a builder joins composites with the component separator and repetitions with the
repetition separator, so where either of those IS `?` the library's own structural join is emitted
as an escape sequence.

Two mechanisms, and only the first involves a caller's value. The filed defect named the first and
reached three roles; measured, the class is four roles, and the second mechanism fires on documents
in which no value carries any trigger byte at all:

```text
elementSeparator "?"     buildInterchange ["CLM","PATIENT?ACCT","150.00"]
                           reads ["CLM","PATIENT","","ACCT","150.00"]
segmentTerminator "?"    buildInterchange ["CLM","PAT*ACCT","150.00"]
                           CLM-01 reads "PAT", a phantom segment follows
componentSeparator "?"   build837P, EVERY document, no trigger byte:
                           SV1-01-2 (the procedure code) reads undefined
                           HI-01-2 (the diagnosis code) reads undefined
repetitionSeparator "?"  build271, EVERY document, no trigger byte:
                           EB-03 "30" + "1" reads back as one code "30?1"
warnings: [] on every row.
```

🩺 The second mechanism is the sharper one: a procedure code and a diagnosis code are what a claim is
adjudicated on, and neither the caller nor the receiver had any signal that they were fused.

⚖️ Refuse rather than warn, and the whole SET rather than the values that trip. 005010 does not
transmit a release character at all and settles none of this, so the tiebreak is consistency with the
guards this package already carries on emit and with emit being the strict half of Postel's Law here.
A value-level guard cannot reach the second mechanism at all. No warning code is minted and no case
moves onto a new code: each builder refuses with its own existing typed error.

🛑 It refuses specs that built at `0.0.15`, including ones that round-tripped through this library's
own parser. That round trip is not the bar: ISA-11 and ISA-16 transmit the declared set, so a
conformant receiver splits on it.

🛑 One report moved, and it is a message rather than a code. The check runs where a builder resolves
its delimiters, so every guard a builder runs earlier keeps precedence (`build999`'s AK9 counts and
`buildTA1`'s `enforceAcceptIsClean` both still report first) and a defect detected later now reports
this refusal instead: `buildInterchange` with a degenerate set AND an empty
`interchangeControlNumber` reported the empty-control-number refusal at base and reports this one at
head, both `X12_BUILD_INVALID_SPEC`.

🛑 The read side is deliberately untouched, and so is `serializeX12`. `parseX12` still accepts every
degenerate set and still frames a degenerate body segment; `serializeX12` re-emits one byte for byte,
because it works from a model a sender's bytes produced. Documents this library emitted before this
guard exist.

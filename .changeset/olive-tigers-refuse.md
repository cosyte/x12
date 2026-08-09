---
"@cosyte/x12": patch
---

🩺 An EMPTY control number is now REFUSED on emit, where ISA-13 / IEA-02 used to be FABRICATED out of
it.

Every builder that assembles an ISA zero-pads its control number to the nine characters ASC X12 .5
fixes ISA-13 at. `padControl("1", 9)` answering `"000000001"` is the point of that helper;
`padControl("", 9)` answering `"000000000"` was not, and nothing stood in front of it. So
`interchangeControlNumber: ""` produced a frozen, well-formed interchange carrying a nine-digit
control number the caller never supplied, ISA-13 reconciling perfectly against IEA-02, with an empty
warning array. A control number is how an interchange is reconciled and acknowledged, so a fabricated
one does not fail: it succeeds against the wrong thing, and the sender gets no signal.

The class is wider than that slot and it has two mechanisms rather than one. The group and
transaction-set control numbers reach the wire through the release escaper, which early-returns on
`""`, so an empty one went out as an EMPTY required element at both ends of its pair, which means
each pair still reconciled against itself and `X12_CONTROL_NUMBER_MISMATCH` did not fire either.
Measured through `buildInterchange` at `0.0.15`, one variable at a time:

```text
interchangeControlNumber: ""       ISA*…*00501*000000000*0*P*:~ … ~IEA*1*000000000~
groupControlNumber: ""             GS*HC*…*1200**X*005010X222A2~ … ~GE*1*~
transactionSetControlNumber: ""    ST*837**005010X222A2~ … ~SE*3*~
```

All three emitted `warnings: []`. The acknowledgment builders carried the same class at the slots
where they echo the document being acknowledged, which is the whole reason a sender can match an ack
to what they sent: `build999` emitted `AK1*HC**005010X222A2~` and `AK2*837*~`, and `buildTA1` emitted
`TA1**260601*1200*A*000`. The `buildTA1` case was already disclosed in `KNOWN-LIMITATIONS.md` as
tracked and open; the two `build999` echoes were not disclosed anywhere.

All of them now draw that builder's own typed, code-tagged refusal before anything is emitted, naming
the slot and the spec property. No new error code is minted and no warning code moves, so nothing a
consumer branches on changes. What changes is that a call which used to hand you a document now
throws.

🛑 Why refuse rather than warn, stated as a decision because the standard does not settle it. 005010
says nothing about what a builder should do with an absent control number. The tiebreak is
CONSISTENCY inside this package: every other empty required element on the emit side is already
refused by name (`build835`'s `patientControlNumber`, `build837`'s `claimId`, `build834`'s
`maintenanceTypeCode`, `build278`'s `requestCategoryCode`, `build277`'s `categoryCode`), emit is the
deliberately strict half of this library, and a warning would have had to travel the parse channel a
builder returns, which is the registry consumers use to grade INBOUND documents. What it costs is a
real break: a caller relying on `""` to mean "pad me a control number" is broken deliberately, and
what they were shipping was `000000000`, a real value a trading partner may already have assigned to
something else.

🛑 The guard is byte-strict `=== ""` and does NOT trim. A whitespace-only control number is still
accepted and still padded: `" "` emits ISA-13 as `00000000 `, and `buildTA1` emits `TA1*   *…`.
Trimming would be a normalisation rule, no source consulted for this package states one, and the five
in-package guards this mirrors are byte-strict for the same reason. It also does not type-check, so
nothing about a non-string changed: through the escaper it draws the type refusal, and at the ISA
slots `padControl` still throws the typed refusal whose text misleadingly says "exceeds the 9-char
spec limit". And a SHORT control number still zero-pads, because that is what the padding is for:
`"1"` still emits `000000001`.

Every guard sits at the envelope-assembly site, so every guard that already ran keeps its precedence:
`build835`'s balance equation, `build999`'s AK9 count reconciliation and `buildTA1`'s
accept-must-mean-accept check all still fire ahead of this one. No census of the slots that are NOT
routed through the guard is published; the claim is the property, that a control number routed
through it is refused when empty.

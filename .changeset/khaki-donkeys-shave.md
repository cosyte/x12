---
"@cosyte/x12": patch
---

🩺 A control number that is not a STRING is refused on emit, so
`interchangeControlNumber: []` and `new String("")` no longer fabricate ISA-13 as `000000000`
(`X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED`).

The empty-control-number guard is byte-strict, and byte-strict means a value that is not a string is
not `""`. A non-string walked past it and reached `padControl`, which reads `.length` and then
concatenates. Measured at base `a226595` through `buildInterchange`, identically in all nine builders
that assemble an ISA:

```text
interchangeControlNumber: []                 ISA-13 = 000000000   warnings: []
interchangeControlNumber: new String("")     ISA-13 = 000000000   warnings: []
interchangeControlNumber: new String("ABC")  ISA-13 = 000000ABC   warnings: []
interchangeControlNumber: new String(" ")    ISA-13 = 00000000    warnings: []
```

The first two are the same fabricated `000000000` the empty guard closed, reached through a different
input type: a frozen, well-formed interchange whose ISA-13 reconciles against its IEA-02 on nine
digits the caller never supplied. The other two are silent coercions of a boxed string, a value this
library refuses by name wherever it escapes one, so the same `new String("ABC")` was refused at GS-06
and accepted at ISA-13 in one call.

The class is NINE slots, not thirty, and the split is by route. The slots that reach the wire through
the escape helper were already type-checked and refused every non-string probed at base; the
ISA-13 / IEA-02 slots were not, because the ISA is fixed-width, joined directly, and outside both the
escaper and the segment guard. The test went into the guard both routes already share.

🛑 No error code is minted and no warning code moves, and each refusal is the builder's own typed
error. But several diagnostics DO move, and one moves off a JavaScript builtin: `undefined` and
`null` threw a bare `TypeError` with no `code` and now throw the builder's typed refusal, so a
consumer catching `TypeError` there no longer catches. An array-like used to build a malformed ISA
that the builder's own re-parse rejected as `X12_INVALID_DELIMITERS`, a parse error naming delimiters
for a caller mistake in one named spec field. A number, a plain object or a boolean was told it
"exceeds the 9-char spec limit", which was false; same code, corrected sentence.

🛑 The MESSAGE changed on the escape-routed control-number slots too, so "nothing else changed" would
be false. GS-06 / GE-02, ST-02 / SE-02, AK1-02, AK2-02 and TA1-01 now refuse a non-string from this
guard one step ahead of the escaper, naming the slot and the spec property where the escaper's
refusal could only name the builder. Same class, same code. If you match on message text at a
control-number slot, re-read it; if you branch on `err.code`, nothing moved.

The refusal reports the TYPE only and never echoes the value, through the same describer the escaper
uses, because a slot-generic guard cannot know whether the primitive it is about to echo is a control
number or a patient identifier.

It narrows what a control number may BE, never what it may CONTAIN. A whitespace-only control number
is still accepted and still padded, unchanged and by design: trimming would be a normalisation rule
and no source consulted for this package states one. The asymmetry that creates is stated rather than
smoothed over: `new String(" ")` is refused because it is not a string, and the primitive `" "` is
not. A SHORT control number still zero-pads. The ISA's other fixed-width slots (`senderId`,
`receiverId`, `interchangeDate`, `interchangeTime`) go through `pad` rather than `padControl`, are
guarded by no control-number test, and a numeric one still throws a bare `TypeError`; that residual
is disclosed rather than closed.

Every guard that already ran before it keeps its precedence, because the test went into the guard the
empty test already occupied rather than a new site. Thirty slots have a red case; the nine that
fabricated or coerced are the ones this closes.

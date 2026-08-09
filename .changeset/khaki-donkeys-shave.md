---
"@cosyte/x12": patch
---

🩺 A control number that is not a STRING is refused on emit, so `interchangeControlNumber: []` and
`new String("")` no longer fabricate ISA-13 as `000000000`
(`X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED`).

The empty-control-number guard is byte-strict, and byte-strict means a value that is not a string is
not `""`. A non-string walked past it and reached `padControl`, which reads `.length` and then
concatenates. Measured at base `a226595` through `buildInterchange`:

```text
interchangeControlNumber: []                 ISA-13 = 000000000   warnings: []
interchangeControlNumber: new String("")     ISA-13 = 000000000   warnings: []
interchangeControlNumber: new String("ABC")  ISA-13 = 000000ABC   warnings: []
interchangeControlNumber: new String(" ")    ISA-13 = 00000000    warnings: []
```

The first two are the same fabricated `000000000` the empty guard closed, reached through a different
input type. The other two are silent coercions of a boxed string, a value this library refuses by
name wherever it escapes one. `requireControlNumber` refuses a non-string ahead of the empty test
now, reporting the TYPE through `caller-string.ts`'s describer and never echoing the value.

🛑 No error code is minted and no warning code moves, but diagnostics DO move, so "nothing else
changed" would be false. `undefined` and `null` threw a bare `TypeError` with no `code` and now throw
the builder's typed refusal, so a consumer catching `TypeError` there no longer catches. Shapes that
used to make the builder write a malformed fixed-width ISA its own re-parse rejected as
`X12_INVALID_DELIMITERS` refuse before anything is written now, so a predicate on that code stops
firing for them. And the MESSAGE moved at the control-number slots that already refused a non-string,
because they refuse from this guard one step earlier: same class, same code, wording that names the
slot and the spec property. Read that as the property and not as a claim about what the old message
said. If you match on message text at a control-number slot, re-read it.

It narrows what a control number may BE, never what it may CONTAIN. A whitespace-only control number
is still accepted and still padded, unchanged and by design: trimming would be a normalisation rule
and no source consulted for this package states one. The asymmetry that creates is stated rather than
smoothed over: `new String(" ")` is refused because it is not a string, and the primitive `" "` is
not. A SHORT control number still zero-pads. The ISA's other fixed-width slots go through `pad`
rather than `padControl`, are guarded by no control-number test, and a numeric one still throws a
bare `TypeError`; disclosed rather than closed.

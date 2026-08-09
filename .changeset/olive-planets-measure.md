---
"@cosyte/x12": patch
---

🩺 A delimiter that is not SHAPED like a delimiter is REFUSED on emit, by every builder. Each of the
four roles must be a **string of exactly one visible character**, and the four must be **mutually
distinct**.

That rule is not invented for emit. `detectDelimiters` already decides what a delimiter is for this
package and decides it as a Tier-3 fatal: one character at each of four fixed ISA positions, each visible,
the four distinct, else `X12_INVALID_DELIMITERS` thrown even in lenient mode. The predicate is now
imported by the builders rather than restated, so the emit refusal and the read fatal cannot drift
apart. A builder composing a document its own parser refuses to read was disagreeing with itself.
Nothing is trimmed, coerced or substituted: the set is refused.

Three mechanisms, and they are not one defect:

```text
LENGTH. No claim is made about which roles were silent: two drafts published an
asymmetry and both were measured false, so what follows is what was run.
  build837P { segmentTerminator: "~~" }        warnings: []
    31 segment rows in a transaction whose SE-01 declares 16, every other row a
    phantom the caller never wrote.
  buildInterchange { componentSeparator: ":~" } warnings: []
    a two-character value that reads back through a well-formed ISA, leaving the
    builder's own terminator as an uncounted empty segment - and escapeRelease
    compared against the declared TWO-character value, so no element value was
    escaped against ":" or "~" either.

TYPE, where the JOIN coerces and the ESCAPE does not
  build837P { componentSeparator: 1 }    warnings: []
    the join coerced 1 to "1" and framed on it; escapeRelease compares with ===,
    so no element value was escaped against it.
    SV1*HC199213 read SV1-01-2 back as "992", not the procedure code 99213, and
    CLM-05's place-of-service composite emitted as "111B11".
  build271  { repetitionSeparator: 1 }   warnings: []
    EB*1**3011 - EB-03's two service type codes stopped reading back as two.

NO NET AT ALL, at buildTA1
  buildTA1 { elementSeparator: "" } RETURNED
    TA10000000012606011200A000 - the reassociation key, the date, the time, the
    disposition and the note code in one undelimited blob. It is the only
    builder with no trailing parseX12, so EVERY role and EVERY shape was silent
    here: { elementSeparator: "||" } returned
    TA1||000000001||260601||1200||A||000, which inside an ISA reads back with
    TA1-01 empty and ackCode "R" - an Accept emitted as a Reject.
```

🩺 The TYPE mechanism needs no unusual value: `99213`, `11`, `30` and `1` are ordinary, and a length
rule cannot reach it at all.

⚖️ Refuse rather than warn, following the two guards that shipped before it: a warning would have to
travel the READ registry a builder returns. No code is minted, and each builder refuses with its own
existing typed error. The check runs after the release-character guard, so nothing that guard pinned
moves and its equality test is unchanged.

🛑 What a caller catches MOVES, in both directions. At base most mis-shaped sets failed as an
`X12ParseError` with `X12_INVALID_DELIMITERS` escaping out of the `build*` call, from the builder's
own trailing `parseX12`. They now refuse earlier with that builder's own error, so a consumer
catching the parse class stops catching and one catching the build class starts.

🛑 It refuses shapes that built with `warnings: []`, and no count of them is published. The
plausible one is `segmentTerminator: "~\r\n"`. If you declared that to get line-broken output, it never produced any:
CR/LF between segments is tolerated on READ, so the model recorded `~` and `serializeX12` emitted no
line breaks. Reading a file written that way is unaffected; only declaring it on emit is.

🛑 It is a UTF-16 code-unit rule and not a byte rule. A character that is one code unit but several
bytes on the wire satisfies it and still displaces every ISA position after it, so
`componentSeparator: "\u00a7"` still builds. Disclosed, not guarded: the read side counts code units
too, so moving one side alone would put them back out of step.

🛑 The read side and `serializeX12` are untouched. `parseX12` accepts everything it accepted before,
because documents declaring these sets exist and Postel's Law puts them on the lenient half. A letter
or digit is still an admissible delimiter: ASC X12 constrains a delimiter by position, not by
character class.

# `X12-EMIT-DELIMITER-SHAPE-UNCHECKED` (2026-08-09)

The wider delimiter-validation family, filed from `X12-EMIT-DEGENERATE-RELEASE-DELIMITER`'s pass 2
and closed here. Item `X12-837-RESIDUALS`. Base `a21f8ea`.

The filed line said: *no builder validates a delimiter's shape or length at all, and it is not
`?`-specific - `segmentTerminator: "~~"` desyncs SE-01 with `warnings: []`.* That is one mechanism.
The census found three.

## The census, and it is what separated the mechanisms

10 builders x 4 delimiter roles x 8 shapes, plus a valid control per builder, run against base
`a21f8ea` and again against head. Outcome classes: **REFUSED** (a typed `*BuildError`),
**PARSE-FATAL** (an `X12ParseError` / `X12_INVALID_DELIMITERS` escaping out of the `build*` call from
the builder's own trailing `parseX12`), **BUILT-WARNED**, **BUILT-SILENT** (`warnings: []`).

At base, for the nine builders that end in `parseX12`:

| role | multi-char | empty | whitespace | duplicate | control `\n` | number `1` | array `[]` | `null` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| element | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | BUILT-WARNED | PARSE-FATAL | default |
| repetition | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | **BUILT-SILENT** | PARSE-FATAL | default |
| component | PARSE-FATAL | BUILT-WARNED | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | **BUILT-SILENT** | BUILT-WARNED | default |
| segment | **BUILT-SILENT** | BUILT-WARNED | PARSE-FATAL | PARSE-FATAL | PARSE-FATAL | BUILT-WARNED | BUILT-WARNED | default |

`buildTA1` is its own row and its own finding: **BUILT on all 32 cells**, with no warnings channel at
all. `null` and `undefined` are the `?? default` and are NOT a defect - they are the control that
stops the type arm from being written as "not a string".

🛑 **THE GRID IS A MEASUREMENT, NOT A CLOSED SET OF SHAPES.** The gate reached a ninth shape this
census had not enumerated - a boxed `new String("|")`, which built silently at base in most cells and
is refused at head by the type arm. **Finding one more shape is expected and is not a new finding**;
publish no total of what built silently, and never read the eight columns as exhaustive.

**REFUSED appears nowhere at base. No builder validated a delimiter's shape in any role.** At head
every non-`null` cell is REFUSED, with each builder's own error class and its own existing code.

## Three mechanisms, and they must never be written as one

**1. LENGTH. Among the NINE builders that end in `parseX12`, silent at the segment terminator
alone.** `build837P` with `segmentTerminator: "~~"` built with `warnings: []` and put **31 segment
rows on a transaction whose SE-01 declares 16** - every other row a phantom with `id: ""`. The
asymmetry is structural: the terminator is appended AFTER the fixed-width ISA, so it displaces no ISA
position and `detectDelimiters` reads a perfectly well-formed header. A multi-character value in the
other three roles moves ISA-11, ISA-16 or the fixed element positions, and those nine builders' own
`parseX12` fatals.

🛑 **NEVER WRITE THAT AS AN ABSOLUTE ABOUT ROLES.** A draft said *"silent at that role and nowhere
else"* and the gate falsified it in one probe: `buildTA1` ends in no parse, so the LENGTH mechanism
was silent there at EVERY role, and `{ elementSeparator: "||" }` returned
`TA1||000000001||260601||1200||A||000` - which, inside an ISA that can declare only `|`, reads back
with **TA1-01 EMPTY and `ackCode: "R"`, parse warnings 0. An Accept emitted as a Reject**, which is
`X12-TA1-EMIT-NOT-RELEASE-AWARE`'s safety class reached by this mechanism. The correct bound names
the nine, and `buildTA1` is mechanism 3.

**2. TYPE, where the JOIN coerces and the ESCAPE does not.** `Array.prototype.join` coerces a
non-string delimiter to its digits and the document frames on that byte; `escapeRelease` compares
delimiters with `===`, and a number never equals a character, so **no caller value is escaped against
it**. Measured, `warnings: []` on both rows:

```text
build837P { componentSeparator: 1 }
  SV1*HC199213*150.00*UN*1***1   SV1-01-2 reads "992", not the procedure code 99213
  CLM*CLAIM0001*150.00***111B11*Y*A*Y*Y   CLM-05's place-of-service composite destroyed
build271  { repetitionSeparator: 1 }
  EB*1**3011   EB-03's two service type codes stop reading back as two
```

🩺 No unusual caller value is involved - `99213`, `11`, `30` and `1` are ordinary - and **a length
rule cannot reach this at all**, because `String(1)` is one visible character. Two defects, two arms.

**3. `buildTA1` had NO net, not even the accidental one.** It is the only builder that does not end
in `parseX12`; it returns a `Ta1Segment`. So `elementSeparator: ""` **returned**
`TA10000000012606011200A000` - the reassociation key (data element I12), the date, the time, the
disposition and the note code fused into one undelimited blob - and `elementSeparator: "\n"` returned
a TA1 carrying raw newlines. It reaches the guard only because it takes its `esc` from the same
chokepoint every other builder does.

## What shipped, and why it is a SECOND guard rather than a bigger first one

`requireWellShapedDelimiters` in `src/builder/caller-string.ts`, called from `makeCallerEscaper`
immediately after `requireEscapableDelimiters`. Per role: must be a **string**, of **exactly one**
character, and that character must satisfy **`isVisibleDelimiterChar`**; then the four must be
**mutually distinct**.

**The rule is not invented here - it is the READ side's, imported.** `detectDelimiters` already
decides what a delimiter is for this package, and decides it as a Tier-3 fatal: one character at
each of four fixed ISA positions, each visible, the four distinct, else `X12_INVALID_DELIMITERS`
thrown even
in lenient mode. That predicate was a closure inside `detectDelimiters`; it is now a module-level
`isVisibleDelimiterChar` with two callers and **the read side's behaviour is unchanged** - the
expression is the same. Hoisting it is what stops the emit refusal and the read fatal from drifting
into two different ideas of what a delimiter is, and it is the only reason the emit guard may
describe itself in terms of what this library's own reader accepts. **A builder composing a document
its own parser refuses to read was disagreeing with itself**, and that is the whole argument.

**No normalisation rule is invented and none is needed.** Nothing is trimmed, coerced, substituted or
padded. This matters because the standing limit on this item is that no source states a normalisation
rule - whitespace-only control numbers still pad, unfixed by design, for exactly that reason. A
refusal needs no such source.

**The one-character requirement is structural, not conventional.** The ISA is fixed-width per ASC
X12 .5: ISA-11, ISA-16 and the terminator each occupy one fixed position, and `Delimiters` records
exactly one character per role. A multi-character value cannot be transmitted as a delimiter at all;
the only question was whether the caller was told.

🛑 **IT IS A UTF-16 CODE-UNIT RULE, NOT A BYTE RULE, AND THE DIFFERENCE IS AN UNCLOSED RESIDUAL.**
`String.prototype.length` here and `charAt` on read both count code units, so a character that is one
code unit but several BYTES on the wire passes and still displaces every ISA position after it.
Measured at head, `warnings: []`: `buildInterchange({ componentSeparator: "\u00a7" })` builds, and a
byte-oriented receiver reads ISA-16 as `0xC2` and the terminator as `0xA7`, framing the whole
interchange as one segment. `"\u2019"` - the smart quote a companion-guide PDF hands you instead of
`'` - does the same. **DISCLOSED, NOT GUARDED, and do not grow this guard to reach it:** an
encoding-width rule is a decision nobody here has made, and the read side counts code units too, so
moving one side alone re-opens the drift this guard exists to close. **Never restate the bound in
BYTES** - the first draft of every carrier did, and every one was measured false the same way.

**⚖️ Refuse rather than warn**, following `X12-EMPTY-CONTROL-NUMBER-FABRICATED` and
`X12-EMIT-DEGENERATE-RELEASE-DELIMITER`: a warning would have to travel the READ registry a builder
returns, which `#83` was refuted for. **No code is minted** - each builder refuses with its own.

**It runs AFTER the `?` check, deliberately.** A set with `?` in two roles is both degenerate AND
non-distinct. Running the release-character check first keeps the message that names the sharper
defect and means **nothing `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` pinned moves**; its equality test
is byte-for-byte unchanged. Growing that guard to reach the length family would have been the
"fix outgrows the thing it fixes" runaway ADR 0016 exists to stop.

**No refusal echoes the declared value.** The role is named and the defect described;
`describeCallerValue` supplies type alone on the non-string arm, exactly as every other caller guard
in this package does. The one number a message states is the declared value's LENGTH, which is
bounded, cannot carry an identifier, and is what makes "exactly one character" actionable.

## 🛑 What changes for a caller, in BOTH directions

**The error class moves.** At base, most mis-shaped sets failed as `X12ParseError` /
`X12_INVALID_DELIMITERS` escaping out of a `build*` call - the wrong class for a spec defect, and it
carried a 64-byte `snippet` of the interchange just composed (measured:
`"ISA**00**          **00**          **ZZ**MEDICARE       **ZZ**S…"`). At head those cells refuse
earlier with the builder's own typed error. **A consumer catching `X12ParseError` around a `build*`
call STOPS catching; one catching that builder's own error STARTS.** No new code. Both directions are
pinned, because `#83`'s lesson is that a moved predicate is stated in both or not at all.

**🛑 It refuses shapes that built with `warnings: []`, and NO COUNT OF THEM IS PUBLISHED.** A draft
said "two"; the gate found more as soon as it tried a shape the census had not enumerated (a boxed
`new String("|")`, which `typeof` reports as an object and which head refuses). That is this
package's standing rule about censuses of what bypasses a chokepoint: finding one more is expected
and is not a new finding. The one worth naming is `segmentTerminator: "~\r\n"`, a caller asking for
line-broken output. Measured at base: it built
clean **and the CRLF was never on the wire.** `parseX12` tolerates a run of CR/LF between segments,
so the model recorded `segment: "~"` and `serializeX12` re-emitted with no line breaks. The caller
declared one thing and the library silently did another. Refusing is the same call the previous slice
made about specs that built at `0.0.15`: what this library happens to read back was never the bar.
**Reading a file written that way is unaffected** - only declaring it on emit is.

## 🛑 What is deliberately NOT changed

- **The read side.** `parseX12` still accepts everything it accepted, `detectDelimiters` behaves
  identically, and a document already written with a doubled terminator or CR/LF between segments
  still reads. Postel's Law puts it on the lenient half, and documents this library emitted before
  this guard exist. Pinned from BYTES, never through a builder - routing a read-side pin through a
  builder now asserts the refusal instead of the read.
- **`serializeX12`.** It re-emits a set a SENDER declared, out of a model that was parsed, so
  refusing there would refuse round-tripping an inbound document.
- **A delimiter that is a plain letter or digit.** `componentSeparator: "S"` is one visible character
  and distinct, and `X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` already pinned it as a case this
  library must handle. ASC X12 constrains a delimiter by POSITION, not by character class, and
  nothing here decides otherwise. A letter that also appears in the data is a **collision**, not a
  shape defect, and it is not this slice's; `elementSeparator: "1"` warned at base and warns now.
- **The seven `PRE-EXISTING` in the umbrella's `repos/x12.md`**, per ADR 0016 rule 2.

## Still open, each its own slice

- `parseTA1` does not unescape; `TA1-02`/`TA1-03` drop silently on `""`.
- **Encoding width.** The rule above counts UTF-16 code units, so a multi-BYTE single-code-unit
  delimiter still builds. Disclosed above; not guarded here, and not guardable on one side alone.
- Whitespace-only control numbers still pad, unfixed BY DESIGN - a trim is a normalisation rule and
  no source states one.

## The claim sweep

By WORDING across the whole tree, not by file, per the `#102` lesson. The falsified claim was *"no
builder checks that a delimiter is one byte / a length rule is a different slice"*, and it had **nine
carriers in eight files**: `src/builder/caller-string.ts`, `src/parser/release.ts`,
`KNOWN-LIMITATIONS.md`, `docs-content/spec-notes-envelope.md` (**ships**),
`test/builder-degenerate-release-delimiter.test.ts` (its module doc AND a test that asserted the
false behaviour), `documentation/agent-notes/x12-emit-degenerate-release-delimiter.md`, `CLAUDE.md`,
and **two pending carriers**: `.changeset/lucky-moons-refuse.md` and its `[Unreleased]` `CHANGELOG.md`
entry. **Both pending carriers were corrected BY DELETION, never reworded** - a changeset freezes
permanently into `CHANGELOG.md`. Re-grepped clean.

**The umbrella's `documentation/repos/x12/emit-degenerate-release-delimiter.md` carries the same
claim and was NOT edited here** - this slice is scoped to the submodule. It is owed a correction.

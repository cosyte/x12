# `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` (2026-08-09)

The measurement, the sources and the reasoning behind the `CLAUDE.md` trap of the same name. Open
this before you touch `makeCallerEscaper`, `escapeRelease`, or any builder's delimiter resolution.

This is the EMIT half of `X12-BODY-DEGENERATE-RELEASE-SEPARATOR` (`#100`), which fixed the read half
and flagged the emit half as its own slice, in three roles and one mechanism. **Both of those figures
were understated, and re-measuring is what found it.**

## The census, at base `51de7b2`

Every row `warnings: []`, every row through a builder that returns `parseX12` of the bytes it just
wrote, so the builder disagreed with itself in each case.

| `?` declared as      | caller value with a trigger byte                                  | the library's OWN structural join |
| -------------------- | ----------------------------------------------------------------- | --------------------------------- |
| element separator    | CORRUPT: value truncated, remainder shifted into phantom elements | (same)                            |
| segment terminator   | CORRUPT: segment ends early, a phantom segment follows            | n/a                               |
| component separator  | scalar value round-trips                                          | **CORRUPT on every document**     |
| repetition separator | scalar value round-trips                                          | **CORRUPT on every document**     |

Verbatim, from the probes:

```text
elementSeparator "?"     buildInterchange ["CLM","PATIENT?ACCT","150.00"]
                           reads ["CLM","PATIENT","","ACCT","150.00"]
segmentTerminator "?"    buildInterchange ["CLM","PAT*ACCT","150.00"]
                           CLM-01 reads "PAT"; the transaction gains segments
                           with ids "" and "(non-spec)" that SE-01 never counted
componentSeparator "?"   build837P, canonical P spec, NO trigger byte anywhere:
                           HI  raw "HI*ABK?J20.9"     01-1 "ABK?J20.9"  01-2 undefined
                           SV1 raw "SV1*HC?99213…"    01-2 undefined
repetitionSeparator "?"  build271, canonical spec, NO trigger byte anywhere:
                           EB  raw "EB*1*IND*30?1…"   03 "30?1"  (two codes, one read)
```

## The two mechanisms, which are not one defect

1. **A caller VALUE the escape cannot protect.** `escapeRelease` protects a byte by PREFIXING `?` to
   it, in whatever role `?` was declared. When `?` is a delimiter, the protection is structure. This
   is the mechanism `#100` named, and it reaches the element separator and the segment terminator.
2. **The library's OWN structural join.** A builder joins composites with the component separator
   and repetitions with the repetition separator. When either IS `?`, the join is emitted as an
   escape sequence and the read side (correctly, for mechanism 1's sake) swallows it. **No caller
   value is involved.** This is the mechanism nobody had measured, because `#100` probed only the
   generic `buildInterchange` segment-spec route and said so.

🩺 Mechanism 2 is the sharper one. `SV1-01-2` is the procedure code and `HI-01-2` is the diagnosis
code; a claim is adjudicated on both. Neither the caller (who reads the builder's own return value)
nor the receiver had any signal.

**They are not one defect and must not be written as one.** Mechanism 1 has an offending value you
can point at; mechanism 2 has none, which is exactly why the value-level mitigation this arc already
refuted could never have worked. Same shape as `#101`'s INVENT / LOSE pair.

## The decision: refuse the SET, at emit only

Four options were on the table.

|                                     | why not                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| warn                                | a warning has to travel the READ registry a builder returns - the inbound-grading widening `#83` was refuted for         |
| guard the values that trip          | cannot reach mechanism 2 at all; leaves a caller an instruction they cannot act on                                       |
| make the read side literal per role | breaks values this library ITSELF emitted through `0.0.15`; `#100` measured that and it is why the read side is per role |
| refuse the set on emit              | taken                                                                                                                    |

**⚖️ REFUSE, not warn, on CONSISTENCY rather than spec.** 005010 does not transmit a release
character at all, so it settles none of this - the same honest position `#96`, `#100` and `#101` each
had to take. What tips it is in-package consistency: emit is the strict half of this library's
Postel's Law by standing convention, and `requireControlNumber` made exactly this call one slice
earlier.

**No code is minted.** Each builder refuses through its own `refuseSpec`, with the code it already
had (`X12_BUILD_INVALID_SPEC`, `X12_ACK_INVALID_SPEC`, `X12_837_BUILD_INVALID_SPEC`, …). Adding one
because the CAUSE differs is what `#85` refused and what moves cases off predicates consumers wrote.

## Where the guard sits, and what that costs

Inside `makeCallerEscaper` (`src/builder/caller-string.ts`), which every builder calls ONCE when it
resolves its delimiters. `test/builder-string-type.test.ts` already requires every builder to build
its `esc` there, so the coverage is structural rather than a hand-list - **but a source gate
establishes nothing about behaviour** (this repo's own recorded finding), so every one of the ten
builders has a behavioural case: `buildInterchange`, `build999` and `buildTA1` in
`test/builder-degenerate-release-delimiter.test.ts`, and the seven domain builders beside the valid
specs they mutate in their own suites. Deleting the one call reds 16 tests across 8 files.

**Precedence, measured base vs head.** Every guard a builder runs earlier keeps precedence -
`build835`'s balance equations, `build837`'s spine, `build999`'s AK9 count invariants and
`buildTA1`'s `enforceAcceptIsClean` all still report first. Everything a builder checks LATER yields
to this refusal. **A MESSAGE moves, never a code**, because each builder's `refuseSpec` is the same
one both guards already used.

**🛑 NEVER COUNT WHAT MOVED. A draft of this section said "one report moved" and the gate measured it
false in one pass.** `requireControlNumber` runs after the escaper in EVERY builder that has one, so
on a degenerate set both mechanisms that arc shipped - `#101`'s empty control number and `#102`'s
non-string one - are preempted at every one of their slots, in builders nobody had probed. That is
this item's own standing trap arriving one slice later: _the filed line has understated the class
every time_, and `build-835.ts` already carries the identical warning from `#99`. **The remedy is the
CLAIM: state which guards keep precedence and that everything later yields, which is a property of
the ordering. A total of the sites is a census and drifts with the next builder.**

## 🛑 It refuses specs that BUILT, and one of them round-tripped

`componentSeparator: "?"` with a scalar value carrying a literal `?` built at `0.0.15` and read back
correctly through this library's own parser. It is refused now.

**That round trip was never the bar.** ISA-11 and ISA-16 transmit the declared set, so a conformant
receiver splits repetitions and components on `?` - and the `??` this library wrote for a literal `?`
reads to that receiver as two empty components. Checking a claim against this repo's own
implementation is not a check; it only proves the two halves agree, which is how the wrong answer
survived. The same is true of the repetition role, where scalar values round-tripped for the simpler
reason that nothing ever split.

## 🛑 The guard is an EQUALITY TEST, and the bound must be stated as one

`delimiters[role] === RELEASE_CHAR`. That is a property of the VALUE A CALLER DECLARES and **not** a
guarantee about what this library can compose - two drafts said the latter (_"no NEW document of that
shape is composed here"_, _"what you cannot do is have this library compose a document against one"_)
and the gate falsified both with one line:

```text
buildInterchange({ segmentTerminator: "??" })  -> BUILDS
  ix.delimiters  { element:"*", repetition:"^", component:":", segment:"?" }   warnings: []
  a ["HI","ABK:J45.50"] segment spec comes back as, in order:
    id "ST"          ["ST","837","0001"]
    id ""            [""]
    id "HI"          ["HI","ABK"]          <- the qualifier alone
    id "(non-spec)"  [":J45.50"]           <- the ICD-10 code, where no reader looks
    id ""            [""]
    id "SE"          ["SE","3","0001"]
build837P({ envelope: { segmentTerminator: "??" } }) -> BUILDS; SE-01 declares 22 against 43
  framed segments, 21 of them phantoms, warnings: []
```

Nothing in any builder checks that a delimiter is a single byte, and the ISA line writes the declared
string straight in, so the transmitted set is degenerate by another route. **Identical at base, so
the BEHAVIOUR is `PRE-EXISTING` and the guard must NOT be grown to reach it** - a delimiter-length
rule is a decision nobody here has made, and growing a guard to make an overclaim true is the runaway
ADR 0016 exists to stop. What was wrong is the sentence, and the sentence is what changed. It is
disclosed in `KNOWN-LIMITATIONS.md`, `docs-content/spec-notes-envelope.md` and both source modules,
and pinned as an honest control in `test/builder-degenerate-release-delimiter.test.ts`.

The wider family this belongs to - **no builder validates the SHAPE of a delimiter at all**, and it
is not `?`-specific (`segmentTerminator: "~~"` does the identical thing) - is out of this slice's
scope per ADR 0016 rule 2. **It is OWED an item in `operations/BACKLOG.md` and did not have one when
this landed**; do not read the classification as evidence that one exists.

## 🛑 What is deliberately NOT changed

- **The read side.** `parseX12` still accepts every degenerate set, `decodeSegment` still frames a
  degenerate body segment, and `splitWithRelease` is still per role. Documents emitted before this
  guard exist; Postel's Law puts them on the lenient half. The read-side pins in
  `test/parser-segment-degenerate-release-separator.test.ts` are asserted straight from BYTES now,
  not through a builder, because routing them through one would assert the refusal instead of the
  read.
- **`serializeX12`.** It re-emits a set a SENDER declared, out of a model that was parsed, so
  refusing there would refuse round-tripping an inbound document. Measured: a degenerate interchange
  still serializes byte-identically.
- **`escapeRelease` itself.** It is a pure text utility with no builder context, and its behaviour on
  a degenerate set is what the read side depends on. The refusal is at the builder, not in it.

## What was corrected as a CLAIM rather than guarded

The claim swept by wording rather than by file, per `#102`'s finding. Carriers that asserted the
falsified form - _"`buildInterchange({ componentSeparator: "?" })` … today"_, _"do NOT declare `?` as
the ELEMENT separator"_, _"all THREE roles"_: `CLAUDE.md`, `KNOWN-LIMITATIONS.md`,
`docs-content/spec-notes-envelope.md` (**which SHIPS**), `src/parser/release.ts`'s `splitWithRelease`
JSDoc (**source only, and the REASON matters: `src/index.ts` re-exports just `escapeRelease`,
`RELEASE_CHAR` and `unescapeRelease` from this module, so `splitWithRelease` never reaches the public
surface. It is NOT because of `@internal` - nothing sets `stripInternal`, and `RELEASE_CHAR`'s
`@internal` docblock ships verbatim. Two drafts of this parenthesis were wrong: the first said it
DOES ship, the second blamed `@internal`. Check the re-export list, never the tag.**
`escapeRelease`'s JSDoc in the same file DOES ship, so the distinction is real and worth keeping),
`documentation/agent-notes/x12-body-degenerate-release-separator.md`,
`test/parser-segment-degenerate-release-separator.test.ts`, the pending changeset
`.changeset/olive-doors-repeat.md` and its `[Unreleased]` `CHANGELOG.md` entry. **The two pending
ones were corrected by DELETION, never reworded**, per `documentation/conventions.md` rule 2.

## What this does NOT claim

- **No census of what a degenerate set can do to a document is published.** The table above is
  INSTANCES. Two drafts in `#100` published a trigger byte and were falsified by one more; the form
  that survives is the two mechanisms, and finding a third route through either is expected and is
  not a new finding.
- **Nothing is claimed about what X12 says.** 005010 does not transmit a release character. There is
  no clause behind any of this, on either side.

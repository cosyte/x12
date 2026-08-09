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
`build999`'s AK9 count invariants and `buildTA1`'s `enforceAcceptIsClean` both still report first.
**One report moved and it is a MESSAGE, not a code:** `buildInterchange` with a degenerate set AND an
empty `interchangeControlNumber` reported the empty-control-number refusal at base and reports this
one at head, both `X12_BUILD_INVALID_SPEC`, because the escaper is built before
`requireControlNumber` runs. Same trade `#101` recorded, one layer up.

## 🛑 It refuses specs that BUILT, and one of them round-tripped

`componentSeparator: "?"` with a scalar value carrying a literal `?` built at `0.0.15` and read back
correctly through this library's own parser. It is refused now.

**That round trip was never the bar.** ISA-11 and ISA-16 transmit the declared set, so a conformant
receiver splits repetitions and components on `?` - and the `??` this library wrote for a literal `?`
reads to that receiver as two empty components. Checking a claim against this repo's own
implementation is not a check; it only proves the two halves agree, which is how the wrong answer
survived. The same is true of the repetition role, where scalar values round-tripped for the simpler
reason that nothing ever split.

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
JSDoc (**which ships in `dist`**), `documentation/agent-notes/x12-body-degenerate-release-separator.md`,
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

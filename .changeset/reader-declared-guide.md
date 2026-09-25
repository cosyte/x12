---
"@cosyte/x12": patch
---

Every typed reader now checks the implementation guide a transaction set
declares against the guides that reader implements, and says so when they
differ. Until this release each reader admitted a transaction set on ST-01
alone, so a 277 declaring `006020X313` (the claim request for additional
information, a payer asking for documentation) came back from `get277Status`
labelled `claim-status`, and a 004010, 006020 or 008020 document of any other
type was decoded against 005010 element positions with nothing on the warning
channel.

**Two new warning codes, additions only.** `X12_GUIDE_NOT_IMPLEMENTED` is
raised where the declared guide is outside the reader's set, and
`X12_GUIDE_NOT_DECLARED` where nothing is declared at all. Both are anchored at
the ST (`segmentIndex: 0`, no `elementIndex`), both messages are frozen registry
literals that echo nothing the sender wrote, and both factories,
`guideNotImplemented` and `guideNotDeclared`, take a position and nothing else.
The reading is still decoded and returned exactly as before: nothing is refused,
dropped or re-decoded, and on a document declaring an implemented guide nothing
changes at all.

**What is declared.** ST-03, decoded of any release escape exactly as
`implementationConventionReference` is published. Where ST-03 is absent or
empty, GS-08 of the enclosing functional group, decoded the same way. Nothing is
trimmed, case-folded or prefix-matched, so a whitespace-only declaration is
compared as it stands. Where ST-03 is non-empty it alone decides; a
disagreement between ST-03 and GS-08 is not reconciled.

**What is implemented.** Derived from `X12_TR3_CONFORMANCE`, never from a
second list: for each reader, the `tr3` and every `cfrAdopted` entry of its
rows. The 837 reader also accepts every identifier its variant table resolves,
so the companion-guide identifiers `005010X222A1` and `005010X223A2` do not
warn.

**GS-08 now reaches a reader.** A parsed `X12TransactionSet` carries an
optional `gs` member, the enclosing group's GS header by reference, raw like
every envelope element. Every reader keeps its `(delimiters, tx)` call; a
transaction set assembled by hand without `gs` is read as one whose GS-08 is
absent. `parseX12` raises no new warning and changes no existing field.

**What a consumer will see move.**

- `X12ClaimStatusResponse.transactionType` gains a third value,
  `"unrecognized-guide"`, set where the declared guide is outside
  `get277Status`'s set or nothing is declared. An exhaustive `switch` over the
  old two values stops compiling. Every implemented declaration keeps the
  existing derivation, which still keys on ST-03 as framed.
  `get277CADisposition` admits exactly what it admitted before.
- A 278 declaring `005010X216` now carries `X12_GUIDE_NOT_IMPLEMENTED` on both
  278 readers, because the regulation names `005010X217` for both directions.
  `build278Response` still writes `005010X216`, so reading back its own output
  carries the code until that builder is corrected.
- A 999 declaring the base `005010X231` carries `X12_GUIDE_NOT_IMPLEMENTED`,
  because the conformance row names only the errata `005010X231A1`.
- On the 834, the code is on the header reading and on every streamed
  enrollment, because each member was decoded against the declared guide.

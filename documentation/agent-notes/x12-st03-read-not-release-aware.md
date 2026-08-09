# `X12-ST03-READ-NOT-RELEASE-AWARE` - the ST-03 readers published the escape

Item `X12-837-RESIDUALS`, slice `X12-ST03-READ-NOT-RELEASE-AWARE`. Base `49e7ac8` (`#108`). Last
verified 2026-08-09.

Filed by `#108`'s gate as `PRE-EXISTING` and left deliberately untouched there: it is what falsified
that slice's *"only typed reader"* claim, and the claim was CUT rather than the readers changed. This
is the slice that changes them.

## The census - re-measured at base, and the filed line was a FLOOR for the SIXTH time running

The backlog filed **three readers**: `get837Claims`, `get277Status`, `get278Request`.

Measured on the base tree: **four raw reads of `tx.st.elements[3]`, in three files, reached by five
public readers.** `walk277` is shared by `get277Status` and `get277CADisposition`; `walk278` is
shared by `get278Request` and `get278Response`; `get277CADisposition` carries a fourth read of its
own, which is an ADMISSION GATE and not a publish.

| # | site | reached by | role at base | in this slice |
|---|---|---|---|---|
| 1 | `claim/get-837.ts:286` | `get837Claims` | PUBLISH + KEY (`VARIANT_BY_ICR`) | publish decoded; key unmoved |
| 2 | `status/get-277.ts:142` (`walk277`) | `get277Status`, `get277CADisposition` | PUBLISH + KEY (`transactionType`) | publish decoded; key unmoved |
| 3 | `status/get-277.ts:130` | `get277CADisposition` | KEY only (admission gate) | untouched |
| 4 | `auth/get-278.ts:257` (`walk278`) | `get278Request`, `get278Response` | PUBLISH only | publish decoded |
| - | `ack/parse-999.ts:220` | `parse999` | PUBLISH, already decoded | the in-tree control, untouched |

**⚠ THE COLUMNS BELOW ARE THE SHAPES THAT WERE RUN, NOT SHAPE CLASSES.** Base and head, from bytes,
on one interchange per transaction set. Every cell `warnings: []` except where the body's own
`X12_MISSING_REQUIRED_LOOP` is present at both.

| ST-03 as framed | base publish (all 5 readers) | head publish | 837 `variant` | 277 `transactionType` | 277CA admitted |
|---|---|---|---|---|---|
| `005010X222A1` | `005010X222A1` | `005010X222A1` | unmoved | unmoved | unmoved |
| absent | `undefined` | `undefined` | unmoved | unmoved | unmoved |
| `""` | `""` / `undefined` (278) | `""` / `undefined` (278) | unmoved | unmoved | unmoved |
| `A??B` | `A??B` | **`A?B`** | unmoved | unmoved | unmoved |
| `A?*B` | `A?*B` | **`A*B`** | unmoved | unmoved | unmoved |
| `A?:B` | `A?:B` | **`A:B`** | unmoved | unmoved | unmoved |
| `A?~B` | `A?~B` | **`A~B`** | unmoved | unmoved | unmoved |
| `A?^B` | `A?^B` | **`A^B`** | unmoved | unmoved | unmoved |
| `A?XB` | `A?XB` | `A?XB` | unmoved | unmoved | unmoved |
| `AB?` (trailing) | `AB?~BHT` | **`AB~BHT`** | unmoved | unmoved | unmoved |
| `005010X21?4`, component `4` | `005010X21?4` | **`005010X214`** | unmoved | unmoved | unmoved |
| `005010?X222A1`, component `X` | `005010?X222A1` | **`005010X222A1`** | unmoved | unmoved | unmoved |

**No story about which reader is special is published.** The `""` row is a cell, not a claim: `""`
collapses to `undefined` in `walk278` and publishes as `""` in the other two, at base and at head
alike. The `AB?` row is the pre-existing `?~`-swallows-the-terminator framing residual showing
through - the element genuinely framed as `AB?~BHT` at base too, and that residual is
`X12-BODY-DEGENERATE-RELEASE-SEPARATOR`'s, still open and NOT absorbed here.

## The grounding, and the limit that stays unclaimed

**This package disagreeing with itself, exactly as `X12-TA1-RESIDUALS` was grounded.** Every
dot-path read - `elementValue`, `elementOptional`, `componentOptional`, all through
`getSegmentValue` - already unescapes, and `parse999` already decodes `AK2-03`, which is the
identically-named field in a sibling reader in the same tree. **No TR3 clause is claimed on either
side, and nothing here asserts what `ST-03` may contain.**

**No source exists for any normalisation rule** and none is introduced: nothing is trimmed,
case-folded or prefix-matched, and a whitespace-only `ST-03` publishes untrimmed. That is the same
reasoning that leaves whitespace-only control numbers padding by design.

## ⚖️ READ SIDE, and which precedent was followed

These are READ-side consumers. The nearest precedent is `#108`'s read half, which **unescaped**, and
that is what was done. `#101`'s *refuse over warn* call is a BUILD-side one and does not transfer: a
warning there would travel the parse channel a builder returns. Nothing is refused here and nothing
warns.

**The sink is a no-op.** `X12_DANGLING_RELEASE_CHAR` is dropped, exactly as `getSegmentValue`'s
default sink, `parseTA1` and `parse999` drop it - so every other element these readers decode drops
it too, and forwarding one at `ST-03` alone would make it the single element in the reader that
reports one. `PRE-EXISTING` and open; **not absorbed** (ADR 0016 rule 2).

## 🛑 The variant question, answered by measurement rather than by argument

`X12-VARIANT-ICR-UNGROUNDED` is what made `ST-03` decide an 837's variant, so the item required this
slice to say whether it moves one. **It does not, and that is a deliberate scope call rather than an
accident.** The three tests that DECIDE - `VARIANT_BY_ICR`, `walk277`'s `transactionType`, and
`get277CADisposition`'s admission gate - still key on the RAW element text.

What was measured, on an 837 whose only service segment is an `SV2` (so the `SVx` fallback resolves
`I`) and whose `ST-03` names the professional guide:

```text
delimiters                 ST-03 framed     decoded          base variant   if the key moved
conventional (* ^ : ~)     005010X222?A1    005010X222?A1    I              I  (no difference)
componentSeparator "X"     005010?X222A1    005010X222A1     I              P
componentSeparator "2"     005010X?222A1    005010X222A1     I              P
repetitionSeparator "A"    005010X222?A1    005010X222A1     I              P
```

On the `P` rows the `SV2` line **stops decoding** and `X12_837_SERVICE_LINE_NOT_DECODED` is raised -
that is the `X12-VARIANT-ICR-UNGROUNDED` property reaching a new set of documents, which is a change
to how an already published document decodes a service line and **materially bigger than a decode
fix.** The 277CA gate behaves the same way: with `componentSeparator: "4"`, `005010X21?4` decodes to
`005010X214`, so keying on the decoded text would admit through `get277CADisposition` a transaction
that returns `undefined` today, and flip `transactionType`.

**The reachability is precise and is worth stating exactly.** Raw and decoded differ only where the
sender escaped a byte the ISA declared as a delimiter, so a keyed decision could move only where a
declared delimiter is itself a character of a keyed identifier - which a letter or digit delimiter
makes admissible (`X12-EMIT-DELIMITER-SHAPE-UNCHECKED` deliberately left those admissible). On the
conventional set it can never move, measured in row 1 above.

**And the direction is one-way.** No identifier in `VARIANT_BY_ICR`, and not `ICR_277CA`, contains a
delimiter or the release character, so raw text equal to one decodes to itself: **nothing that
resolved a variant, or was admitted, at base stops doing so.** Moving the keys can only ADD
resolutions. That is what makes it a separate, weighable slice rather than a regression risk.

## What shipped

One `@internal` helper, `decodeSt03` in `src/transactions/shared/st03.ts`, called at the three
PUBLISH sites. **No warning code minted, no error code minted, no public TYPE changed, and the 277CA
admission gate is not touched at all** - but `X12_837_UNKNOWN_VARIANT`'s frozen MESSAGE TEXT does
change: the word *"verbatim"* is deleted from it, because this slice made it false. A message text is
consumer-visible, so it is disclosed in the changeset, `CHANGELOG.md` and `KNOWN-LIMITATIONS.md`
rather than treated as internal. **The code did not move and none was minted** - which is this repo's
own rule about what may change in a message.

**Mutation controls, by running:**

- Replacing `decodeSt03`'s body with `return raw` **reds 17 tests, all in
  `test/transactions-st03-release-decode.test.ts`.** The other 88 test files stay green, which is
  itself the finding: nothing in the suite pinned the raw-escape behaviour.
- Keying `VARIANT_BY_ICR` and `transactionType` on the DECODED text instead **reds exactly the two
  invariance tests** and nothing else. The invariance assertions are behaviour-sensitive, not
  vacuous.
- Negative control: the census harness run against `hl7`'s `src/` fails with
  `parseX12 is not a function`.

Suite at head: **89 files / 2,284 tests**, `tsc` exit 0.

## The claim sweep

**By WORDING across the whole tree, not file by file**, which is the `#102` lesson and what `#108`
needed.

**🛑 AND THE FIRST DRAFT OF THIS SECTION WAS ITSELF OVERSTATED, WHICH IS THE PASS-1 FINDING.** It
swept only for the PREDECESSOR's clause and never for clauses the NEW behaviour falsifies, while
claiming a whole-tree sweep. **A sweep is over the wording your change makes false, not over the
wording that made your change necessary.** The gate found four such carriers, three of which SHIP:

- `src/parser/warnings.ts:332`, the frozen `X12_837_UNKNOWN_VARIANT` message, said *"The **verbatim**
  reference is preserved on the model"* - and it fires **preferentially** on the very documents this
  slice changed, because the lookup keys on the raw text so an escaped `ST-03` is almost never in the
  table.
- `src/parser/warnings.ts:902`, the exported `unknown837Variant` JSDoc, which ships in the `.d.ts`.
- Two test comments, in `transactions-claim-837-variant-lookup.test.ts` and
  `transactions-claim-837-ambiguous-variant.test.ts`.
- `CHANGELOG.md` + `KNOWN-LIMITATIONS.md` cited *"exactly as `X12Segment.elements` documents"* for a
  type that is NOT an `X12Segment`, and whose own JSDoc says its elements *"IS decoded at envelope
  time"* - which reads as release-decoded. The citation is deleted and `types.ts` now says what
  "decoded" means there.

**Every remedy is a deletion of the falsified word**, plus one added disclosure sentence naming the
consequence the gate said was never stated: the published reference can name a guide this reader did
not resolve to, and nothing warns.

The predecessor's clause was *"three more readers publish ST-03 raw"*. It was carried by `CLAUDE.md`,
`src/transactions/ack/parse-ta1.ts`, `test/transactions-ack-ta1-residuals.test.ts` and
`documentation/agent-notes/x12-ta1-residuals.md`. **It is false in two ways now** - the readers no
longer publish raw, and the count was three where the measurement is four sites / five readers - so
each carrier is corrected, and the count is **deleted rather than restated**, because a live count
goes stale and this repo has been caught by exactly that.

The pending `[Unreleased]` `CHANGELOG.md` entry and the seven pending changesets were checked and
carry none of it, so **nothing had to be corrected by deletion in a frozen carrier this time**. The
shipped `docs-content/` pages were swept for the clause and carry none; `troubleshooting.md` gains
the disclosure because the behaviour is consumer-visible.

## The ratchet

`x12/CLAUDE.md` was at **49,897** with the umbrella's `REPO_CLAUDE.x12` lowered to match, so there
was **zero headroom**. The `X12-EMIT-DEGENERATE-RELEASE-DELIMITER` `###` section was **relocated in
full, verbatim, nothing dropped** into `agent-notes/x12-emit-degenerate-release-delimiter.md` first,
with a header recording that its "below" / "above" wording refers to `CLAUDE.md`'s ordering at the
time of the move. Nothing in it was measured false, so nothing in it is corrected. **No trap was
deleted and the entry was not raised.** Derive both numbers rather than trusting one written here.
**The ratchet lowering is OWED** and is an umbrella edit, so it is left to the coordinator.

## 🔴 Open, each its own slice - `PRE-EXISTING`, NOT absorbed (ADR 0016 rule 2)

- **The three ST-03 KEYS still read the raw text.** The measurement above is the case for and
  against moving them; it is a decision, not a defect to be swept up here.
- The `noop` sink drops `X12_DANGLING_RELEASE_CHAR` on these readers, matching `parseTA1` and
  `parse999`.
- `?~` still swallows the segment terminator, so an `ST-03` ending in a bare `?` frames long
  (`X12-BODY-DEGENERATE-RELEASE-SEPARATOR`).
- `src/builder/caller-string.ts:493`'s qualified role-asymmetry line; the TA1-02 usage-vs-type
  refusal message; whitespace building at the five TA1 slots; and the seven `PRE-EXISTING` in the
  umbrella's `repos/x12.md`.

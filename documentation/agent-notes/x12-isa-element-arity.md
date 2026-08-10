# `X12-ISA-ELEMENT-ARITY` - the ISA split had no arity check (2026-08-10)

`X12-837-RESIDUALS`. Read side. The residual was filed by `#111` as *"`decodeIsa`'s split has no
arity check"* and promoted there to **the blocking question for any future widening of an envelope
reader**, so it is closed here before any such widening is considered.

## The claim that was false, and where it lived

`src/parser/envelope.ts`, above the split:

```
// Split into ["ISA", e1, e2, …, e16] - exactly 17 entries by construction
// because the element-separator-position guard in delimiters.ts already
// verified the layout.
```

The cited guard (`detectDelimiters`) verifies the element separator at all 16 fixed 005010 byte
positions. That bounds the split **from below** - it can never come out short - and it never bounded
it from above. An ISA element **value** carrying that same byte splits again, so that element comes
back a **prefix** and every element after it is **displaced by one**.

`parts.length < 17` is therefore unreachable while `detectDelimiters` is what it is, and the check
shipped is `!== 17` rather than `> 17` so that it does not silently depend on that.

## The census - 16 cells, all run, and the anchor stated

**Instrument.** One conformant interchange from `test/_helpers/envelope.ts`. For each fixed ISA
element `n` in 1..16, **overwrite** (never insert - the ISA has to stay 106 bytes, or
`X12_ISA_TOO_SHORT` is what is being measured) the **last byte of that element's fixed span** with
the element separator `*`, then `parseX12`. Measured against `0.0.16`, which is what npm serves.

| planted in | split parts | warnings at `0.0.16`                              |
| ---------- | ----------- | ------------------------------------------------- |
| ISA-01     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-02     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-03     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-04     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-05     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-06     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-07     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-08     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-09     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-10     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-11     | -           | `X12_INVALID_DELIMITERS` (Tier-3, thrown first)   |
| ISA-12     | 18          | `X12_PRE_005010`, `X12_CONTROL_NUMBER_MISMATCH`   |
| ISA-13     | 18          | `X12_CONTROL_NUMBER_MISMATCH`                     |
| ISA-14     | 18          | none                                              |
| ISA-15     | 18          | none                                              |
| ISA-16     | -           | `X12_INVALID_DELIMITERS` (Tier-3, thrown first)   |

**🛑 THE FILED LINE WAS A FLOOR AGAIN.** It named ISA-13 and the consequence *"ISA-14/15/16
re-index silently"*. **14 of the 16 fixed elements reproduce**, and the two that do not **are** the
in-band repetition (ISA-11) and component (ISA-16) separator declarations, so planting the element
separator there collides with a delimiter and `detectDelimiters` refuses at Tier-3 before the split
is ever reached. **That is a boundary of the probe, not a property of those two elements, and no
story is told here about which member is special** - that story has been falsified repeatedly in
this lineage.

**🛑 The silence is not where the filed line put it either.** Exactly two rows carried
`warnings: []` at `0.0.16` (ISA-14 and ISA-15), and eleven rows carried a warning that **named the
wrong thing**, which is a different defect from silence and is the more interesting half:

- The document declares `00501` at ISA-12's **own** fixed byte offset and `X12_PRE_005010` fires
  anyway, because `elements[12]` has become the repetition separator.
- `elements[13]` - the interchange control number, the **reassociation key** - answers `"00501"`.
- `elements[15]` - the **test/production usage indicator** - answers `"0"` (ISA-14's
  acknowledgment-requested value) on a document whose ISA-15 says `P`.

Pinned cells, from `test/parser-isa-element-arity.test.ts`: on the ISA-06 row `elements[12] === "^"`,
`elements[13] === "00501"`, `elements[15] === "0"`; on the ISA-13 row `elements[13] === "00000000"`
and `elements[14] === ""`.

**The census is not measuring adjacency.** Planting at an element's last byte puts the plant next to
the real separator that follows it. A plant in the **middle** of ISA-13 (`"0000*0001"`) behaves
identically: 18 parts, `elements[13] === "0000"`. Pinned separately.

## What shipped

`X12_ISA_EXTRA_ELEMENT_SEPARATOR`, a Tier-2 warning, plus `isaExtraElementSeparator(position)` and
the registry message. `decodeEnvelope` raises it when `isa.elements.length !== 17`, at
`{ segmentIndex: 0, interchangeIndex: 0 }` with **no `elementIndex`**: naming an element index would
be a claim about which fixed element the extra separator belongs to, which is the question that
cannot be answered.

**Additions-only. Nothing is re-framed and no existing warning is suppressed or narrowed.** The
displaced-value rows above are pinned as tests *because* they still happen - the pins are what stops
a later slice from re-framing the ISA without noticing it changed how published documents decode.

**🛑 The reason it re-frames nothing, and it is not timidity.** A byte that is both an element's
content under the ISA's fixed widths and the separator that same segment declares in-band has **two
readings**. The interchange is not 005010-conformant either way, and **no source anyone here has
read says which reading to take** - the same symmetry `#96` recorded for the envelope release split,
where the tiebreaker was consistency with `decodeSegment` and explicitly **not** spec. Choosing here
would be a normalisation rule this package has refused to invent four times.

**The route back is `isa.raw`**, unchanged: all 106 bytes, verbatim, and the ISA's fixed widths make
the transmitted span of any element recoverable from it. Recovering it is the **caller's** decision.

**Ordering is load-bearing.** The new warning is pushed **before** the ISA-12 and ISA-13 checks,
because when it fires those two may be reading a displaced element rather than the one they name.
`{ strict: true }` escalates the **first** warning, so this also means strict mode now throws
`X12_ISA_EXTRA_ELEMENT_SEPARATOR` on such an interchange instead of the displaced-value warning that
follows it. That is a behaviour change, on non-conformant input only, and it is disclosed rather
than glossed.

## ⚖️ Read side, and what the build side does and does not get

**This is a READ-side slice.** `buildInterchange` is untouched: the fixed-width ISA slots go through
`pad` / `padControl` and **never** through `makeCallerEscaper`, so a caller value carrying the
element separator still reaches the wire exactly as before. Refusing one on emit is a build-side
decision and is **not** taken here.

What the read-side check does reach, because `buildInterchange` returns `parseX12` of the bytes it
just wrote, is the sharpest cell in the whole slice and it needs no inbound document at all:

```
buildInterchange({ …, interchangeControlNumber: "0000*0001" })
  at 0.0.16 → isa.elements[13] === "0000",  isa.elements[15] === "0",  warnings: []
  at head   → the same two reads, plus X12_ISA_EXTRA_ELEMENT_SEPARATOR
```

`IEA-02` is written from the **same** caller value, so it is displaced the same way and
`X12_CONTROL_NUMBER_MISMATCH` **agrees with the misreading**. The package emitted bytes, misread its
own bytes, and its own reconciliation check confirmed the misreading - `warnings: []`. Same shape of
grounding as `#96`: one package disagreeing with itself, never a spec clause.

**`senderId: "AB*CD"` and `receiverId: "AB*CD"` do the same thing** and are pinned as unguarded.

## 🛑 What this does NOT close, stated because a draft would claim it

- **It does not close `src/parser/types.ts`'s `@example` indices.** `#116`'s gate already falsified
  attributing those ISA cells to this check: their mechanism is **fixed-width space padding on a
  spec-clean file**, which needs no separator in a value at all. Two different mechanisms, and that
  was the fifth which-member-is-special story in this lineage. That residual stays filed.
- **It does not close the emit side.** Filed above.
- **It states no rule about how to read an ISA element**, in either direction, and prescribes no
  route. `#110`'s and `#111`'s falsified stories are why.
- **The grounding limit stays unclaimed.** No count of the errata set is published anywhere here, no
  source is cited for any normalisation rule, and **no source scan was proposed**.

## Evidence

- **Full suite green at head:** 91 files, 2,308 tests.
- **Mutation control on the guard alone** (the `if` in `decodeEnvelope` disabled, everything else at
  head, restored afterwards **by file copy**, never `git checkout`): **6 of the 13 new tests red**,
  plus the registry-size test, which reds for the code addition rather than for the guard. The 7 new
  tests that stay green under the mutation are the ones measuring base behaviour on purpose - the
  conformant control, the displaced-value pins, `isa.raw` preservation, the helper, and the two
  build-side rows that assert the emit side is **not** guarded.
- **Sweep anchor, and what it cannot see.** `git ls-files | grep -v '^dist/' | xargs grep -ni "17
  entries\|17 parts\|exactly 17\|16 elements\|fixed-width\|fixed width"` over the tracked tree. Two
  live carriers of the falsified arity claim were found and corrected: `src/parser/envelope.ts`'s
  comment and `test/_helpers/envelope.ts`'s *"split on `delimiters.element` it has 17 entries"*
  (**corrected by deleting the falsified clause**, not by rewording it). **It cannot see:** prose
  that states the arity without any of those words; `dist/` and untracked files; a claim split across
  a line wrap; and any claim phrased as a count in words rather than digits. `CHANGELOG.md`'s
  historical entries were left alone - they are dated statements about earlier releases, and one of
  them (`"release-splitting it would collapse a well-formed ISA below its 17 entries"`) is about the
  **release** splitter and is still true.

## Budget

`x12/CLAUDE.md` entered this slice at its ratchet with **zero headroom**. The trap was paid for by
**two verbatim relocations, first**: the `X12-837-SV1-OVERWRITE` bullets into
`agent-notes/x12-837-sv1-overwrite.md` and the `X12-PAY-TO-FUSION` bullets into
`agent-notes/x12-pay-to-fusion.md`. **Nothing was dropped, no trap was deleted, no ceiling was
raised, and no existing sentence was reworded to buy bytes.** The file leaves this slice smaller than
it entered it. **No byte figure is published here** - derive it with `wc -c x12/CLAUDE.md`. **The
umbrella still owes the matching ratchet drop of `REPO_CLAUDE.x12` in `.claude/hooks/doc-budget.mjs`,
which is outside this repo.**

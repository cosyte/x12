# `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED` (2026-08-09)

The measurement, the sources and the decisions behind the guard. Open this before you touch
`src/builder/caller-control-number.ts`, `padControl`, or any refusal message at a control-number
slot.

> ## The slice was CUT BACK by a founder-directed re-scope, and the pass count did not reset silently
>
> **Cumulative `conformance-refuter` passes across this lineage before the re-scope: three, all
> `REFUTED`** (`61d9af1`, `cd3f963`, `70e494a`), which is the ADR 0016 ceiling. **No pass ever found
> a defect in the guard.** Every finding was a CLAIM defect, and one sentence ate all three passes by
> surviving in a carrier the previous remedy had not opened.
>
> The founder authorised a **strictly smaller** re-scope under ADR 0016's 2026-07-29 amendment: the
> guard, its tests, and a short **count-free** changeset, with **one sweep that greps the SENTENCE
> rather than the reported site.** That reset the budget; this line records the count so the reset is
> not silent.
>
> **What was cut out of the slice rather than qualified again:** the broad documentation correction.
> `CLAUDE.md`, `README.md`, `docs-content/troubleshooting.md`, `KNOWN-LIMITATIONS.md` and
> `CHANGELOG.md` were returned to base and then touched **only** to delete claims. **No `CLAUDE.md`
> trap was written for this item** and no trap was relocated to pay for one; the trap is filed as its
> own follow-up. **Read this file before you touch the guard, because nothing in `CLAUDE.md` will
> send you here yet.**
>
> **Returning `CLAUDE.md` to base is NOT a no-op, and pass 1 of the fresh budget caught it as a
> major.** `#101`'s own trap there asserted *"NO TYPE CHECK"*, *"a non-string is UNCHANGED ON EVERY
> ROUTE"*, and a parenthetical that `padControl(undefined)` throws a bare `TypeError` with no `code` -
> all three true at base and **all three made false by this guard**, in the file every session in this
> repo loads first. The parenthetical was the sharpest, because it exists to correct an
> already-refuted draft and so reads as hard-won. **All three clauses are DELETED**, which is the same
> "touched only to delete claims" operation and is not the deferred trap. **The lesson generalises: a
> revert to base re-publishes every claim the base made, and a slice that falsifies one of them owns
> the deletion.**
>
> **The sweep, and how the carrier list was derived.** The disputed sentence was *"only the
> segment-join guard names the SLOT; `esc`/`escDec` name only the builder"* - true at base, falsified
> by this guard, because the control-number guard names the slot too. Grepping the **claim's wording**
> rather than the reported file found it at base in `README.md`, `KNOWN-LIMITATIONS.md`,
> `CHANGELOG.md`, `docs-content/troubleshooting.md` (which **ships**),
> `test/builder-refusal-phi.test.ts`, `agent-notes/claude-md-relocated-narrative.md` (twice) and
> `agent-notes/per-transaction-invariants.md`. **Every one was DELETED rather than reworded**, and
> the enumerating framing around it ("two things this does NOT say") was made count-free rather than
> decremented. **Re-run the grep before you re-add any sentence about which guard names a slot.**
>
> **Not a carrier, checked and left alone:** `CHANGELOG.md` and `documentation/agent-notes.md` each
> say `requireCallerString` refuses first at **`CLP-01`** and names only the builder. `CLP-01` is not
> routed through `requireControlNumber`, so that statement is still true.

## What was filed, and what it measured

`#101` (`a226595`) closed `interchangeControlNumber: ""` at thirty slots and left two
`PRE-EXISTING` findings behind, both re-measured byte-identical at base and head. Its pass 3 rated
the first a **major**:

> `interchangeControlNumber: []` and `new String("")` STILL emit `000000000` with `warnings: []`,
> because the guard is `=== ""` and does not type-check.

That is the item. It is the same fabrication `#101` closed, reached through a different input type.

## The census, at base `a226595`

Probed every one of `#101`'s thirty routed slots against fourteen non-string shapes, plus five more
added after the first sweep to reach the length-9 boundary. The result is uniform across builders and
splits cleanly by **route**, not by builder:

| route                             | slots | base behaviour on a non-string                   |
| --------------------------------- | ----- | ------------------------------------------------ |
| ISA-13 / IEA-02, via `padControl` | 9     | **EXPOSED**, the shapes below emitted a document |
| GS-06 / GE-02, ST-02 / SE-02      | 18    | already refused, typed, the builder's own code   |
| `AK1-02`, `AK2-02`                | 2     | already refused, typed                           |
| `TA1-01`                          | 1     | already refused, typed                           |

**The class is nine, not thirty.** Every non-string probed at the other 21 was already refused at
base, with that builder's own typed error. **Do not compress WHICH guard did it** - `makeCallerEscaper`
is the usual one, `requireCallerSegment` reaches at least one of them first, and a draft that named a
single mechanism was refuted in one probe. What the nine ISA slots have in common is what matters:
the ISA is fixed-width and joined directly, so it is outside both.

### What the nine slots did, shape by shape

Measured through `buildInterchange` and identical in all nine:

| input                                                           | base                                                        | why                                                                                     |
| --------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `[]`                                                            | ISA-13 `000000000`, `warnings: []`                          | `.length === 0`, pad branch, concatenates to `""`                                       |
| `new String("")`                                                | ISA-13 `000000000`, `warnings: []`                          | same                                                                                    |
| `new String("ABC")`                                             | ISA-13 `000000ABC`, `warnings: []`                          | `.length === 3`, pad branch, coerced                                                    |
| `new String(" ")`                                               | ISA-13 `00000000 `, `warnings: []`                          | same                                                                                    |
| `[""]`, `["12345"]`, `["1","2"]`, `["000000001"]`, `{length:0}` | `X12ParseError` / `X12_INVALID_DELIMITERS`                  | a malformed fixed-width ISA the builder's OWN re-parse rejected                         |
| `0`, `{}`, `true`, `Object.create(null)`                        | `X12_BUILD_INVALID_SPEC`, _"exceeds the 9-char spec limit"_ | no `.length`, both comparisons false, fell to the over-long branch                      |
| `undefined`, `null`                                             | bare `TypeError`, no `code`                                 | `.length` read off nothing                                                              |
| `new String("000000001")`, `{length:9}`, 9-element array        | `X12_BUILD_INVALID_SPEC` naming `"IEA"-02`                  | `padControl` returned the object unchanged; `requireCallerSegment` caught it at the IEA |

**Two of those rows fabricate, two coerce, and the rest fail loudly with a misdirected diagnostic.**
Only the first four are safety findings; the rest are why the fix improves more than it fixes.

## The decision: what "not a control number" means

`#101` settled **refuse over warn** on in-package consistency, and that is not reopened here. The
open question was the **predicate**, and there were three candidates: accept only `string`; coerce
then test; or test the coerced form for emptiness.

**Chosen: `typeof value !== "string"` refuses, then `value === ""` refuses.** The tiebreak is the same
one `#101` used, in-package consistency rather than spec: `requireCallerString` on the `esc` route
already refuses a non-string by name and refuses to coerce, with the reason written out at length -
coercion mints a _different_ identifier, and `String(1e21)` is `"1e+21"`. Accepting a boxed string at
ISA-13 while refusing it at GS-06, in the same call, was the inconsistency the measurement exposed.

**What the predicate does NOT cover, stated precisely:**

- **It narrows what a control number may BE, never what it may CONTAIN.** A whitespace-only
  _primitive_ still builds. Trimming would be a normalisation
  rule and **no source consulted for this package states one** - the same grounding limit that
  governs every identifier slice here.
- **The asymmetry that creates is real and must be stated, never smoothed over:** `new String(" ")`
  is refused because it is not a string, and the primitive `" "` is not. Do not describe the type
  test as having closed "whitespace".
- **It does not bound length either way.** A short control number still zero-pads; a long one still
  draws `padControl`'s own refusal.
- **The ISA's other fixed-width slots are not in this class.** `senderId`, `receiverId`,
  `interchangeDate` and `interchangeTime` go through `pad`, not `padControl`, and are guarded by no
  control-number test. `pad(1, 15)` still reaches `value.slice` and throws a bare `TypeError`.
  Measured, unchanged, and left as its own backlog line - it terminates rather than emitting, which
  is a different defect from the silent one this closes.

## The implementation, and why it went in the shared guard

`requireControlNumber` takes the type test, ahead of the empty test. The describer is
`caller-string.ts`'s `describeCallerValue`, **exported rather than copied**: it reports the type and
never echoes the value, which is `REFUSAL-MESSAGE-PHI-ECHO`'s decision, and a third describer beside
that one and `caller-array.ts`'s `describeShape` would have re-decided it per guard.

Putting the test in the shared guard rather than at the nine `padControl` sites is what makes the
refusal name the slot. It also has a consequence on the other 21, below.

## What moved, in both directions

**No error code was minted and no warning code moved.** Every refusal is the class and code that
builder already raised, through its own `refuseSpec` - the same call `#101` made, for the same reason
(`#83` was refuted for a widening that moved a case onto a new code). What did move:

1. **`undefined` / `null` left a JavaScript builtin.** Bare `TypeError` with no `code` at base; the
   builder's typed refusal now. **A consumer catching `TypeError` at that slot stops catching.** This
   is the sharpest move in the slice and the only one that crosses an error _family_.
2. **The ENUMERATED shapes in the table above left `X12_INVALID_DELIMITERS`**, and nothing wider. At
   base the builder wrote a malformed fixed-width ISA and its own `parseX12` of those bytes rejected
   them: a _parse_ error, naming delimiters, for a caller mistake in one named spec field. Nothing is
   written now. 🛑 **NEVER GENERALISE THIS TO "AN ARRAY-LIKE", AND NEVER PUBLISH A COUNT OF THE
   SHAPES.** Two drafts generalised it and one then counted them, and each was refuted on the same
   sentence: `[]` did not reach this route at all and is the FABRICATING case; `{length:9}` and a
   9-element array reached a different refusal again, naming `"IEA"-02`; and the probe set was never
   exhaustive to begin with. The table is the claim; there is no rule and no total.
3. **`0` / `{}` / `true` stop being told they are too long.** Same code, corrected sentence.
4. **The MESSAGE moved at the control-number slots that already refused a non-string.** GS-06 /
   GE-02, ST-02 / SE-02, AK1-02, AK2-02 and TA1-01 now refuse from this guard one step earlier, with
   a message naming the slot and the spec property. **"Nothing else changed" would be false.**
   🛑 **State that as the property and do NOT state what the old message was.** The guards standing
   at those slots are not uniform: `buildInterchange`'s GS-06 sits inside the `gsParts` array
   `requireCallerSegment` holds, so it already answered `buildInterchange: "GS"-06 must be a string`
   at base, while its own ST-02 and every `build999` and `buildTA1` slot answered the escaper's
   builder-only wording. A draft published the escaper reading as the class and pass 1 refuted it in
   one probe. Three existing suites went red on exactly this and were re-pinned:
   `test/transactions-ack-ta1-escape.test.ts`, `test/builder-segment-type.test.ts` and
   `test/builder-string-type.test.ts`. The escaper's own wording is kept pinned on elements that are
   **not** control numbers, so the move reads as a message move at one family of slots rather than as
   the escaper's guard having been replaced.

One existing test pinned the _misleading_ over-length message as a disclosed `PRE-EXISTING`; it now
pins the closure, beside the ISA-06 `pad` case that is **not** closed. Keeping the two side by side is
deliberate.

## Precedence

The test went into the guard the empty test already occupied, at the same site, so it inherits that
precedence rather than establishing a new one. `build999`'s count reconciliation runs ahead of **both**
control-number guards and still wins over both, measured at the envelope slot and at AK1-02. Do not
restate `#101`'s `X12_ACK_COUNT_MISMATCH` -> `X12_ACK_INVALID_SPEC` pairing as though it applied here:
that one turns on a _later_ body-assembly defect, and the count reconciliation is an _earlier_ guard.

## Evidence

Thirty slots, one red case each: the nine ISA-13 / IEA-02 ones plus the fourteen domain GS-06 / ST-02
ones live in the seven domain build suites and in `test/builder-control-number-type.test.ts`; TA1-01
is in `test/transactions-ack-ta1-escape.test.ts`.

**No red/green total is published here, and no list of the files that go red either.** Both were
published once and both were wrong within the same slice, the total twice. The rule this repo already
carries applies: **re-derive the red set by deleting the `typeof` block and RUNNING the suite, never
by arithmetic and never from a figure in prose.** The re-pinned assertions in
`test/builder-string-type.test.ts` and `test/builder-segment-type.test.ts` are part of that set,
which is exactly what a hand-kept list kept missing.

**The claim is the property - a control number routed through `requireControlNumber` is refused
unless it is a non-empty string - and no census of what is NOT routed is published anywhere.**

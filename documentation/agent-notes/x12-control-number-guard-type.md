# `X12-CONTROL-NUMBER-GUARD-NOT-TYPE-CHECKED` (2026-08-09)

The measurement, the sources and the decisions behind the `CLAUDE.md` trap of the same name. Open
this before you touch `src/builder/caller-control-number.ts`, `padControl`, or any refusal message at
a control-number slot.

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

| route | slots | base behaviour on a non-string |
|---|---|---|
| ISA-13 / IEA-02, via `padControl` | 9 | **EXPOSED**, four shapes emitted a document |
| GS-06 / GE-02, ST-02 / SE-02, via `esc` | 18 | already refused, `makeCallerEscaper`, typed |
| `AK1-02`, `AK2-02`, via `esc` | 2 | already refused, typed |
| `TA1-01`, via `esc` | 1 | already refused, typed |

**The class is nine, not thirty.** The 21 escaped slots reach the wire through `makeCallerEscaper`,
which type-checks before escaping and refuses with the builder's own typed error; every non-string
probed at those slots was already refused at base. The nine ISA slots are outside both
`makeCallerEscaper` and `requireCallerSegment`, because the ISA is fixed-width and joined directly.

### What the nine slots did, shape by shape

Measured through `buildInterchange` and identical in all nine:

| input | base | why |
|---|---|---|
| `[]` | ISA-13 `000000000`, `warnings: []` | `.length === 0`, pad branch, concatenates to `""` |
| `new String("")` | ISA-13 `000000000`, `warnings: []` | same |
| `new String("ABC")` | ISA-13 `000000ABC`, `warnings: []` | `.length === 3`, pad branch, coerced |
| `new String(" ")` | ISA-13 `00000000 `, `warnings: []` | same |
| `[""]`, `["12345"]`, `["1","2"]`, `{length:0}` | `X12ParseError` / `X12_INVALID_DELIMITERS` | a malformed fixed-width ISA the builder's OWN re-parse rejected |
| `0`, `{}`, `true`, `Object.create(null)` | `X12_BUILD_INVALID_SPEC`, *"exceeds the 9-char spec limit"* | no `.length`, both comparisons false, fell to the over-long branch |
| `undefined`, `null` | bare `TypeError`, no `code` | `.length` read off nothing |
| `new String("000000001")`, `{length:9}`, 9-element array | `X12_BUILD_INVALID_SPEC` naming `"IEA"-02` | `padControl` returned the object unchanged; `requireCallerSegment` caught it at the IEA |

**Two of those rows fabricate, two coerce, and the rest fail loudly with a misdirected diagnostic.**
Only the first four are safety findings; the rest are why the fix improves more than it fixes.

## The decision: what "not a control number" means

`#101` settled **refuse over warn** on in-package consistency, and that is not reopened here. The
open question was the **predicate**, and there were three candidates: accept only `string`; coerce
then test; or test the coerced form for emptiness.

**Chosen: `typeof value !== "string"` refuses, then `value === ""` refuses.** The tiebreak is the same
one `#101` used, in-package consistency rather than spec: `requireCallerString` on the `esc` route
already refuses a non-string by name and refuses to coerce, with the reason written out at length -
coercion mints a *different* identifier, and `String(1e21)` is `"1e+21"`. Accepting a boxed string at
ISA-13 while refusing it at GS-06, in the same call, was the inconsistency the measurement exposed.

**What the predicate does NOT cover, stated precisely:**

- **It narrows what a control number may BE, never what it may CONTAIN.** A whitespace-only
  *primitive* still pads (`" "` -> `00000000 `) and still builds. Trimming would be a normalisation
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
   is the sharpest move in the slice and the only one that crosses an error *family*.
2. **Array-likes left `X12_INVALID_DELIMITERS`.** At base the builder wrote a malformed fixed-width
   ISA and its own `parseX12` of those bytes rejected them - a *parse* error, naming delimiters, for
   a caller mistake in one named spec field. Nothing is written now.
3. **`0` / `{}` / `true` stop being told they are too long.** Same code, corrected sentence.
4. **The MESSAGE moved on the `esc`-routed control-number slots too.** GS-06 / GE-02, ST-02 / SE-02,
   AK1-02, AK2-02 and TA1-01 now refuse from this guard one step ahead of `esc`, and name the slot
   and the spec property where `esc`'s refusal can only name the builder. **"Nothing else changed"
   would be false.** Three existing suites went red on exactly this and were re-pinned:
   `test/transactions-ack-ta1-escape.test.ts`, `test/builder-segment-type.test.ts` and
   `test/builder-string-type.test.ts`. The escaper's own wording is kept pinned on elements that are
   **not** control numbers, so the move reads as a message move at one family of slots rather than as
   the escaper's guard having been replaced.

One existing test pinned the *misleading* over-length message as a disclosed `PRE-EXISTING`; it now
pins the closure, beside the ISA-06 `pad` case that is **not** closed. Keeping the two side by side is
deliberate.

## Precedence

The test went into the guard the empty test already occupied, at the same site, so it inherits that
precedence rather than establishing a new one. `build999`'s count reconciliation runs ahead of **both**
control-number guards and still wins over both, measured at the envelope slot and at AK1-02. Do not
restate `#101`'s `X12_ACK_COUNT_MISMATCH` -> `X12_ACK_INVALID_SPEC` pairing as though it applied here:
that one turns on a *later* body-assembly defect, and the count reconciliation is an *earlier* guard.

## Evidence

Thirty slots, one red case each: the nine ISA-13 / IEA-02 ones plus the fourteen domain GS-06 / ST-02
ones live in the seven domain build suites and in
`test/builder-control-number-type.test.ts`; TA1-01 is in
`test/transactions-ack-ta1-escape.test.ts`. Reverting the type test alone reddens 37 cases across
9 files and nothing else in the suite. **The claim is the property - a control number routed through
`requireControlNumber` is refused unless it is a non-empty string - and no census of what is NOT
routed is published anywhere.**

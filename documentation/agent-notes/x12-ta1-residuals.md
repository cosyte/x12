# x12 - the two TA1 residuals the acknowledgment arc left open (`X12-TA1-RESIDUALS`)

The successor to `X12-TA1-EMIT-NOT-RELEASE-AWARE` (`#97`, `agent-notes/x12-ta1-emit-escape.md`) and
`X12-EMPTY-CONTROL-NUMBER-FABRICATED` (`#101`). Read both first; this file is the extension, not a
restatement. The two halves ship as one slice because they are the two ends of one disagreement:
**this package's emit half releases a TA1 element and its read half decoded the escape rather than
the value**, and the same `escapeRelease("") === ""` early return that hid an empty TA1-01 hid four
more slots.

## 🛑 The census, base `67f1831`, and the filed line was a FLOOR for the fifth slice running

Re-measured before building, per this item's standing rule. The backlog filed **two** slots
(TA1-02, TA1-03). It is **four**.

### Emit half - `buildTA1`, 5 slots x 7 shapes, every BUILT cell `warnings: []`

| slot                              | `""`             | `" "`     | `undefined`      | `null`  | `1`     | `[]`    | `new String("")` |
| --------------------------------- | ---------------- | --------- | ---------------- | ------- | ------- | ------- | ---------------- |
| TA1-01 `interchangeControlNumber` | REFUSED (`#101`) | **BUILT** | REFUSED (`#102`) | REFUSED | REFUSED | REFUSED | REFUSED          |
| TA1-02 `interchangeDate`          | **BUILT**        | **BUILT** | REFUSED          | REFUSED | REFUSED | REFUSED | REFUSED          |
| TA1-03 `interchangeTime`          | **BUILT**        | **BUILT** | REFUSED          | REFUSED | REFUSED | REFUSED | REFUSED          |
| TA1-04 `ackCode`                  | **BUILT**        | **BUILT** | REFUSED          | REFUSED | REFUSED | REFUSED | REFUSED          |
| TA1-05 `noteCode`                 | **BUILT**        | **BUILT** | REFUSED          | REFUSED | REFUSED | REFUSED | REFUSED          |

⚠ **The columns are the shapes that were RUN, not shape classes** - the `#107` rule. The TA1-05 row
has to be probed against a NON-Accept disposition or `enforceAcceptIsClean` reaches it first and the
cell measures that guard instead; a first pass of this census read TA1-05 as REFUSED for exactly
that reason and it was wrong. The bytes for the four `""` cells:

```text
interchangeDate: ""   TA1*000000001**1200*A*000       interchangeTime: ""  TA1*000000001*260601**A*000
ackCode: ""           TA1*000000001*260601*1200**000  noteCode: ""         TA1*000000001*260601*1200*R*
```

**One mechanism, not several.** `escapeRelease` early-returns on `""`, and `buildTA1` carried a
required-field guard at TA1-01 alone.

### Read half - `parseTA1` vs. the dot-path read, from BYTES

```text
raw element content        parseTA1 field   getSegmentValue   warnings
00000001?? (release char)  "00000001??"     "00000001?"       []
0000?*0001 (element sep)   "0000?*0001"     "0000*0001"       []
0000?~0001 (segment term)  "0000?~0001"     "0000~0001"       []
0000?:0001 (component)     "0000?:0001"     "0000:0001"       []
0000?^0001 (repetition)    "0000?^0001"     "0000^0001"       []
0000?X0001 (non-delimiter) "0000?X0001"     "0000?X0001"      []
```

All **five** fields, not TA1-01 alone: the same escape in TA1-02, TA1-03, TA1-04 and TA1-05 read
back carrying its `?` too. Round-tripped through `buildTA1` -> `parseX12` -> `parseTA1`, **six of
six values were not equal to what the caller passed**, `warnings: []` on every row. TA1-01 is the
reassociation key, so those are keys matching no ISA-13.

## ⚖️ The grounding, and what it deliberately is NOT

**Both halves stand on this package disagreeing with itself.** Not on a TR3 usage clause - nobody
here has read one that settles what a TA1 element may contain, and nothing shipped claims one.

- **Read half:** every dot-path read (`getSegmentValue`, and therefore `elementValue` and every
  typed transaction reader that goes through it) already unescaped, and `parse999` unescapes its
  IK4-01 composite **in this same directory**. **🛑 A clause here called `parseTA1` "the only typed
  reader in the package that did not" and is DELETED, not reworded** - see the `PRE-EXISTING` below.
- **Emit half:** `BuildTA1Spec` declares all five properties as required `string`s, `""` is the
  shape that defeats that declaration at run time, and the in-package answer to an empty required
  element is uniformly refusal (`build835` `patientControlNumber`, `build837` `claimId`, `build834`
  `maintenanceTypeCode`, `build278` `requestCategoryCode`, `build277` `categoryCode`, and TA1-01
  itself). **REFUSE and not warn**, for `#101`'s fourth reason unchanged: a builder's `warnings`
  array is the PARSE channel, so a warning would mint an emit-side caller mistake onto the registry
  consumers grade INBOUND documents with - the widening `#83` was refuted for.

## 🛑 What the slice does NOT claim, and each was a live way to overreach

- **No story about which slot is special.** An out-of-enum `ackCode: "X"` reads back as `R` exactly
  as the empty one does. The readback is therefore not what separates them, and the claim published
  is **absence on the emit side and nothing else**. This is the `#107` rule applied before the gate
  rather than after it.
- **No normalisation.** Whitespace still builds at all five slots. A trim is a normalisation rule
  and no source consulted for this package states one - the same call `#101` made at TA1-01, held
  here so the two guards cannot drift apart. Pinned.
- **The read half stays lenient.** The fail-safe narrow of an out-of-enum TA1-04 to `R` is untouched.
  Only the bytes it narrows from moved.
- **No census of other builders' required elements.** This slice measured TA1.
- **Ordering was chosen to move nothing.** All five `esc` calls run before any emptiness test, in
  base's order, so **no spec that was refused at base is refused differently at head** - only four
  cells that BUILT now refuse. Pinned by a case pairing an empty TA1-02 with a numeric TA1-04, which
  still reports the TYPE refusal. **Never count what moved.**
- **The `noop` sink is a disclosed limit, not an oversight.** `parseTA1` returns no warnings channel,
  so `X12_DANGLING_RELEASE_CHAR` from the unescape is dropped. `parse999` drops the same warning from
  the same helper for the same reason.

## 🩺 The carrier sweep, by WORDING across the whole tree

The `#102` lesson, applied. **Three** clauses were falsified, and each carrier found was corrected
BY DELETION, never reworded. **🛑 No completeness claim is published here, and the reason is that
one was and it was refuted:** a draft of this section said every carrier had been corrected while
clause 3 below was still standing in the very file the remedy had just edited. **The sweep is a
discipline, not a proof.** Grep the WORDING, tree-wide, every time - and note that clause 3 was
found by the GATE and not by the sweep that claimed to be complete.

1. _"the READ half did not move / `parseTA1` is still pre-`?`-unescape"_ - `CLAUDE.md`,
   `KNOWN-LIMITATIONS.md`, `CHANGELOG.md` (the whole file is still `[Unreleased]`, so it is a
   PENDING carrier that freezes on release), `src/transactions/ack/build-ta1.ts`,
   `src/transactions/ack/parse-ta1.ts`, `documentation/agent-notes/x12-ta1-emit-escape.md`, and
   `test/transactions-ack-ta1-escape.test.ts`.
2. _"`raw`, `elements` and `parseTA1`'s fields"_ as the enumeration of the raw surfaces - the same
   file set. **This one was found only by grepping the CLAUSE rather than the reported file**, which
   is the whole point of the `#102` rule; a file-by-file sweep would have left it in two places.
3. _"`noteCodeRaw` is preserved VERBATIM"_ - `src/transactions/ack/types.ts`,
   `src/transactions/ack/codes.ts` (both of which ship in the emitted `.d.ts`) and
   `src/transactions/ack/parse-ta1.ts`. The unescape moved that field, so the word is false at head.
   **The first two were found by pass 1 and the third by pass 2, three lines below the line that
   falsifies it and inside the file the pass-1 remedy had just edited** - which is the whole reason
   no completeness claim is published above.

`docs-content/` **ships**: `troubleshooting.md` carries the caller-facing statement and was updated
with the code. Every other page under `docs-content/` was swept for all three clauses and carries
none of them. **No page count is published - derive it from `docs-content/sidebars.json`;** a draft
published one and it was wrong.

## 🔴 `PRE-EXISTING` from the gate - backlog lines, each its own slice, NOT absorbed

ADR 0016 rule 2. Both reproduce at base `67f1831` and neither is a refutation of this slice.

1. **🩺 Three more typed readers publish a decoded field PRE-`?`-unescape, and it is the same defect
   shape this slice closed at `parseTA1`.** `get837Claims`, `get277Status` and `get278Request` read
   `tx.st.elements[3]` raw and publish it as the model field `implementationConventionReference`
   (`src/transactions/claim/get-837.ts`, `status/get-277.ts`, `auth/get-278.ts`). Measured at head,
   on `ST*837*0001*005010?*X222A1~`: the model field reads `"005010?*X222A1"` while
   `getSegmentValue(tx.st, "03", d)` reads `"005010*X222A1"`. **This is what falsified the "only
   typed reader" clause, and the clause was cut rather than the readers changed** - widening this
   slice to reach them is exactly the growth ADR 0016 rule 2 exists to stop. ST-03 is the
   implementation convention reference the variant resolver keys on
   (`X12-VARIANT-ICR-UNGROUNDED`), so weigh it there.
2. **The refusal message says "TA1-02 is a required element", which reads as a usage assertion**
   while every grounding this package publishes for the guard is the TYPE declaration and not a TR3
   clause. Base's own `requireControlNumber` says "TA1-01 is a required control number" in the same
   voice, so the class predates the slice. **Nobody on this box has grounded TA1-02..05's
   mandatory-or-situational status in a primary source, and nothing here claims one either way.**

## The ratchet

`CLAUDE.md` was at **50,163** on `main` with the umbrella's `REPO_CLAUDE.x12` lowered to match, so
there was zero headroom. The `X12-TA1-EMIT-NOT-RELEASE-AWARE` `###` section was relocated in full
into `agent-notes/x12-ta1-emit-escape.md` first - verbatim except the one clause above, deleted
inline and on the record, because **a revert re-publishes claims**. **Derive both numbers; do not
trust a figure written here.**

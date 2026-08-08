# `X12-837-SV1-OVERWRITE` (2026-08-08) - a second service segment replaced the first, silently

The section behind the `CLAUDE.md` trap of the same name. Its own file rather than a section of
`documentation/agent-notes.md`, because that file is on its own budget with almost nothing left.

Base: `159a62c` (`#87`). Byte-identical at `c758bcd` before it, so `#87` neither caused this nor
closed it; it was escalated out of `#87`'s pass 2 as `STOP-THE-LINE` by both refuters.

## The defect, reproduced before anything was changed

Under a resolving `ST-03` of `005010X222A2`, one `LX` followed by

```
SV1*HC:99213*8500*UN*4***1~
SV1*HC:99999*12*UN*1***1~
```

left **one** service line reading `charge` `12`, `units` `1` and `procedureCode` `99999`, with
`warnings: []`. `8500` became `12`. CPT `99213` became `99999`. Nothing was raised on any channel.

Measured the same way on both trees, with a probe that reads the slots off
`submission.claims[].serviceLines[]` exactly as the published model nests them - the `#73` lesson
that a probe disagreeing with the model's own shape measures nothing. **Negative control:** the same
probe against `hl7`'s `src/` fails with `parseX12 is not a function`, so the measurement was of
`x12` and not a stale scratch artifact. Base trees were restored **by file copy** (`git archive`
into a scratch directory), never by `git checkout`.

## The mechanism, and why it is total rather than a merge

`ServiceLineAccumulator` carries **one** service segment's worth of slots, and `decodeSv1` /
`decodeSv2` / `decodeSv3` each assign **every** slot their kind writes - unconditionally, from the
segment in hand. So a second matching service segment does not fill blanks left by the first; it
replaces the lot.

Three corners, each measured and each a committed test:

- **A repeat whose own charge element is ABSENT writes `undefined` over a stated amount.** Post
  `X12-837-SV-UNDEFINED-DECIMAL`, `elementDecimal` answers `undefined` for an absent element, and
  the assignment is unconditional, so `SV1*HC:99214**UN*1***1~` following an `8500` leaves the line
  with no charge at all. **`X12_837_SERVICE_LINE_NOT_DECODED` does NOT fire there**, because
  `serviceSegmentDecoded` is true: a service segment *did* decode. That makes the new code the only
  thing on the channel that explains the empty slot.
- **A service segment whose kind does not match the resolved variant is read into nothing.**
  `decodeSvN` returns on its variant check, so it overwrites nothing and what it carries reaches no
  part of the typed model. That case was `#87`'s explicitly deferred residual ("a foreign `SVx`
  INSIDE an already-decoded Loop 2400 is silent at the segment").
- **All three variants reach it** on their own segment (`SV1` under P, `SV2` under I, `SV3` under
  D), and so does the caller-`type` route with no `ST-03` at all.

## 🛑 What shipped, and what deliberately did not

`X12_837_SERVICE_SEGMENT_REPEATED`, the 33rd Tier-2 code (additions-only), plus the public factory
`serviceSegmentRepeated(position)`. Raised at the **repeated service segment itself**, carrying **no
`elementIndex`**, **once per repeat**, and only where a Loop 2400 is **open**.

**The decode is NOT narrowed and last-wins is unchanged, element for element.** Which values a
document decodes to are byte-for-byte what they were at `0.0.13`.

- Switching to first-wins would change how **already-published documents decode** - the same call
  `#87` and `#71` made on this same segment family.
- **Which occurrence the sender meant is deliberately not decided**, because a stray service segment
  and a conformant one are indistinguishable to this reader. Disclosing is honest; picking a winner
  would be inventing.
- **Nothing moves onto the new code.** Every existing code fires on exactly the documents it fired
  on before, at the same position, pinned by whole-channel `toEqual` assertions with the new code
  filtered out.

## 🛑 The consumer that was blind, and it was this package's own documentation

`#83` was refuted for a widening that moved a case **off** a code a published recipe gated on. The
mirror-image hazard bit here: the cookbook's "gate before you post a line amount" recipe named
**four** codes (`X12_837_SERVICE_LINE_NOT_DECODED`, `X12_UNPARSEABLE_DECIMAL`,
`X12_AMOUNT_ROW_DROPPED`, `X12_STATED_AMOUNT_DISCARDED`) and **none** of them fires on the overwrite
document. A consumer following it posted `12` for a line the sender also sent as `8500`. Nothing had
moved - the gap was a code that had never existed.

The cookbook, the troubleshooting table and `KNOWN-LIMITATIONS.md` now name this code beside the
other four, and **a committed test pins that the four-code gate misses what the five-code gate
catches**, with a clean single-segment control on which neither fires.

## The message asserts no TR3 usage, and depends on no variant resolving

**`VARIANT_BY_ICR`'s three keys are still grounded against nothing** (`#87` pass 2 recorded its own
recollection as `UNDETERMINED`, not a citation), so nothing in this slice's wording may depend on
which implementation-convention reference resolves. It does not: the message names no ICR, and the
condition is a property of the segment stream inside an open Loop 2400.

It also **asserts no TR3 usage code for the service segment**. The claim is about this reader -
"this reader's line carries one service segment's worth of slots" - in the same spirit as
`X12-QUANTITY-SILENT-DEFAULTS`' rule that nothing here may assert what X12.6 permits, because nobody
here has read it. `X12_837_PAY_TO_ADDRESS_REPEATED`'s message does make a TR3 structural claim; this
one deliberately does not.

## Census and controls

**18 of 31** behavioural cases red against a base `src/` restored from `159a62c` by file copy; the
**13 green are exactly the controls and the invariance pins** (six paired controls, six
filtered-channel additivity cases, and the decoded-value invariance case). Two existing tests went
red - `transactions-claim-837-service-segment-without-lx.test.ts`'s trailing-`SV2` case and
`transactions-claim-837-ambiguous-variant.test.ts`'s "loser inside an already-decoded line"
additivity case - **and those were the two pins ON this silence, so that is the finding rather than
a regression.** Both were corrected to say what is now true; the second grew an
`ADDED_SINCE_0_0_13` set so the next additive slice does not red it for being additive.

**Two guard negative controls, each run and each red exactly where predicted:**

- keying the report on `serviceSegmentDecoded` instead of "a service segment arrived" re-silences
  the foreign-then-matching pair (2 red);
- latching the flag walk-wide instead of scoping it to the line flags a conformant second line
  (3 red, including the two-`LX` control).

Verify: **11 of 11 steps in `ran:`** (audit, licenses, typecheck, lint, format:check, phi-scan,
check:no-emdash, test:coverage, build, attw, verify:exports), 77 files / **1,669 tests** (base 76 /
1,636), lines 98.97%.

## Budget

`x12/CLAUDE.md` went **52,723 (zero room) -> 52,716**, paid for by relocating **fifteen** pieces of
narrative into `documentation/agent-notes/claude-md-relocated-narrative.md` §8 **first**. No trap
was deleted. `agent-notes.md` untouched, its 18 bytes intact. **The umbrella still owes the matching
ratchet drop of `REPO_CLAUDE.x12` to 52,716 in `.claude/hooks/doc-budget.mjs`**, which is outside
this repo.

## 🔴 What this slice did NOT close

- **`VARIANT_BY_ICR`'s three keys are still ungrounded.** This slice was written so that nothing in
  it depends on them, but the grounding unit `#87` asked for is still owed.
- **The variant fallback is still not narrowed**, deliberately, and neither is last-wins here.
- The other `PRE-EXISTING` residuals in `X12-837-RESIDUALS`: `transactionIndex` hard-coded `0` in
  `get-837.ts`; an `NM1*87` with a `CLM` open landing in `claim.providers`; `attachContact`'s
  "structurally unreachable" `payToAddress` arm; a Loop 2010AB short a Required `N3`; SV3-06's
  ungrounded TR3 usage.

# `X12-837-EMIT-IDENTIFIER-FIXED` (2026-08-08)

The emit half of `X12-VARIANT-ICR-UNGROUNDED`. `#89` grounded which `ST-03` implementation
convention references the READER resolves and deliberately left the writer alone; this slice gave
the writer a caller override. Read `x12-variant-icr-ungrounded.md` first: it carries the sources for
the identifiers, and the reason no count of them is published anywhere.

## What was measured at base

Probed on the base tree with `tsx` against `src/index.ts`, reading the SEGMENT ELEMENTS of the
interchange the builder returns rather than a model slot, because the reference is not a model slot
the builder's output exposes:

```text
build837P default                                      -> GS-08=005010X222A2 ST-03=005010X222A2
build837P + envelope.implementationConventionReference -> GS-08=005010X222A2 ST-03=005010X222A2
build837P + envelope.versionRelease                    -> GS-08=005010X222A2 ST-03=005010X222A2
build837I default                                      -> GS-08=005010X223A3 ST-03=005010X223A3
build837D default                                      -> GS-08=005010X224A2 ST-03=005010X224A2
```

Both plausible field names were silently ignored: the value never reached the wire under either. The
same probe run against `hl7` reports `PROBE-INAPPLICABLE`, which is what makes it a measurement of
this package rather than of a spec object.

Two of the three defaults are not what CMS and several state Medicaid companion guides require in
ST-03 and GS-08 on production professional and institutional claims, which ask for `005010X222A1`
and `005010X223A2`. So a partner on one of those guides rejected every 837 this library built, and
the caller had no remedy at all.

## The shape of the fix, and why it is an addition rather than a re-stamp

**Which published guide identifier a trading partner accepts is a PARTNER fact, not a SPEC fact.**
That sentence is the whole item, and it decides everything below:

- **The defaults do not move.** Re-stamping would silently change bytes this library already puts on
  the wire and break the partners it works with today. An existing call is byte-for-byte unchanged,
  and the first test block asserts exactly that, per variant.
- **One field, both elements.** `Build837EnvelopeSpec.implementationConventionReference` writes ST-03
  and GS-08. This builder has always written the same reference to both, and nothing grounds a
  caller making them differ, so the surface does not offer it. `buildInterchange` still takes the two
  separately, because it applies no domain guard at all and never has.
- **Refuse on DISAGREEMENT, never on ABSENCE.** A reference the read table does not carry is emitted
  as given. Nothing makes the published-errata set provably exhaustive - the read side says so and
  publishes no count of it - so refusing an unrecognised identifier would import an exhaustiveness
  claim this package refuses to make on the read side. The honest cost is pinned as a test: on such
  a file this library's own reader falls back to the `SVx` scan, exactly as it does for any
  unrecognised ST-03.

## The three refusals, all `X12_837_BUILD_INVALID_SPEC`

No new error code was minted. The trap from `#83` governs: a code is added when a consumer must ACT
differently, never because the cause differs, and a caller who handed over a bad reference acts the
same way in all three cases.

1. **Empty.** `seg` strips trailing empty elements, so an empty reference does not emit an empty
   ST-03 and GS-08 - it emits segments that do not carry those elements at all. Two required
   elements lost in silence. There is a control test for the mechanism itself: a defaulted `ST` has
   four elements and a defaulted `GS` has nine, so the last element of each is exactly the one at
   risk.
2. **Carrying an active delimiter or the release character.** Detected as "the escaper had to change
   it" rather than by scanning for characters, so it tracks the delimiter set the CALLER chose - a
   `|` is inert under the default delimiters and refused under `elementSeparator: "|"`, and both
   directions are pinned.
3. **A reference this library's own reader resolves to a DIFFERENT variant.** The emitted file would
   declare one variant and carry another's service segments, and `get837Claims` reads the
   declaration ahead of the segments since `#89`, so every service line would come back undecoded
   with `X12_837_SERVICE_LINE_NOT_DECODED`. Same class as the per-claim guard that already refuses a
   service line whose `variant` disagrees with the builder's. It reuses `VARIANT_BY_ICR` itself,
   newly exported `@internal` from `get-837.ts`, so the guard cannot drift from the table it speaks
   for.

**The cross-variant message names the variant THIS BUILDER emits and deliberately not the one the
reference belongs to.** Naming the other one means interpolating a table read with a caller-supplied
KEY into a refusal message, which is the shape `test/builder-refusal-bounds.test.ts` exists to keep
out (`variant` is sanctioned there precisely because it is fixed by the entry point). The caller
chose both the builder and the reference, so the variant the builder emits is enough to act on. A
test pins the absence, so a future edit cannot quietly add the other name back.

**No message quotes a TR3 identifier**, and a test in this slice's file scans all three refusal
messages for the pattern with its own positive control beside it. The registry tripwire from `#89`
scans `ALL_WARNING_MESSAGES` and would not have seen these, because a build refusal is not a
warning.

## 🩺 The finding this slice paid for: escaping does NOT protect ST-03 or GS-08

The first draft escaped the caller's reference through the builder's `esc` and asserted it
round-tripped. It does not. Measured straight through `parseX12`, so it is grounded on the reader
and not on the builder that now refuses:

```text
GS*HC*S*R*20260601*1200*1*X*005010?*X222A1~  ->  10 elements, GS-08 = "005010?"
ST*837*0001*005010?*X222A1~                  ->   5 elements, ST-03 = "005010?"
CLM*PT?*ACCT*150.00~                         ->   3 elements, CLM-01 = "PT?*ACCT"
ix.warnings                                  ->  []
```

The released element separator still splits the ENVELOPE segments, while the identical construct in
a BODY element holds as one. The envelope segments are read by a splitter that is not
release-aware, and nothing is raised on any channel.

**PRE-EXISTING and deliberately NOT fixed here.** Changing how envelope segments split changes how
already-published documents decode, which is the same call this package makes everywhere else. The
new surface refuses the input it cannot carry; `buildInterchange`'s `versionRelease` and
`implementationConventionReference` still emit it, which is consistent with that builder applying no
domain guard to anything. Recorded in `KNOWN-LIMITATIONS.md` as its own entry.

## 🩺 The other finding: a probe that disagrees with the model's own shape

The first draft of the test file walked `sub.billingProviders[0].subscribers[0].claims[0]` to reach a
service line. That is the BUILD SPEC's shape. `X12_837Submission` is FLAT (`claims`, `hierarchies`),
and the walk threw rather than measuring anything. The same mistake is on record in this repo
already, with `patient.address` against a model that nests it under `patient.entity`. **Read the
model's own type before writing the probe, every time.**

The model does expose `implementationConventionReference`, so the round-trip assertions read the
declaration back through `get837Claims` in the model's own shape, not only off the segments.

## Gates this slice legitimately reddened, and what was re-derived

Both are source scans that pin a count, and both say in their own comments that a legitimate builder
edit will red them and that the remedy is to update the number and the prose that publishes it in
the same commit.

- `test/builder-refusal-bounds.test.ts`: throw sites **90 -> 93** (the three refusals above), module
  count unchanged at 11. Its prose said "EIGHTY-SIX sites, ten builder modules with 74" while the
  assertion said 90; both were re-derived from the scan itself, per module, and are now 93 and 81.
- `test/builder-string-type.test.ts`: `esc` invocations **406 -> 407** on **377 -> 378** lines. Its
  prose figure "72 of `build-837`'s 82 are `ctx.esc(`" was true of neither this tree nor the
  previous one; re-derived with the test's own `code()` helper, it is **61 of 75**. **Note the
  coincidence recorded in that file: an anecdote there quotes 378 as a historical mistake, and 378
  is now the true line count again. Do not "correct" either into the other.**

`documentation/agent-notes.md` carried "Threading a locator through 406 unary `esc` invocations" in
a completed slice's narrative. The number was deleted rather than corrected, per this repo's
standing rule for a figure that drifts.

## Negative controls

Every guard reds a control. Measured by mutating the source and re-running this slice's file:

```text
override never read (base behaviour)  -> 22 of 30 fail
delimiter refusal removed             ->  7 of 30 fail
cross-variant refusal removed         ->  6 of 30 fail
empty refusal removed                 ->  2 of 30 fail
restored                              -> 30 pass
```

## What was NOT done

- **The envelope splitter is untouched.** See above; it is a decode-behaviour change on published
  documents, and it wants its own slice with its own grounding.
- **`buildInterchange` gains no domain guard.** It is the documented escape hatch for reproducing a
  knowingly-malformed artifact, and adding one there would take that away.
- **No normalisation of the reference.** No trim, no case-fold, no prefix match, on either side. The
  read table is a list of cited identifiers and no source says to normalise, so a lower-cased
  reference is emitted exactly as handed over, and a test pins that.
- **No count of the errata set is published anywhere**, including in the new refusal messages.

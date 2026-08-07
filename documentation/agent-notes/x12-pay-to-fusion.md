# X12-PAY-TO-FUSION (2026-08-07)

Relocated out of `../agent-notes.md`, which was at **249,525** of its 250,000-byte budget when this
landed. The archive file keeps the cursor; this file carries the measurement and the reasoning. The
per-item shape (`documentation/agent-notes/<item>.md`) is the one the umbrella's
`.claude/hooks/doc-budget.mjs` provides for exactly this, and it is bounded on its own.

**The fusion filed by the slice above is CLOSED.** Read that section first: it is the record of the
defect and of the two remedies that were refuted, and this one does not repeat it. Nothing there
became false; what changed is that the third remedy shipped.

- **THE DEFECT REPRODUCED AT `0.0.12` BEFORE ANYTHING WAS TOUCHED, on the same shape the prior slice
  filed.** Two `NM1*87`s in one Loop 2000A, each with an `N3` and an `N4`, read back
  `{"lines":["1 FIRST PAY TO WAY","2 SECOND PAY TO WAY"],"city":"SHELBYVILLE","state":"IL",`
  `"postalCode":"62565","countryCode":"US"}` with `warnings: []`. **The `countryCode` is the sharp
  half**: it comes off the FIRST `N4`, on an address whose own `N4` has four elements and names no
  country, so the fused value is not even a superset of either sender's address.

- **THE EMIT SIDE WAS MEASURED AT BASE TOO, WHICH IS WHAT MADE THE ARGUMENT.** Fed back through
  `build837P` + `serializeX12`, base emits
  `NM1*87*2~N3*1 FIRST PAY TO WAY*2 SECOND PAY TO WAY~N4*SHELBYVILLE*IL*62565*US~` - one Loop 2010AB,
  well-formed, naming a payment destination no sender stated. A defect that only existed on the model
  would be milder than that.

- **🩺 THE REMEDY IS THE MISSING OBJECT IDENTITY, NOT A CLEAR, AND THAT IS WHY IT SURVIVES THE TWO
  REFUTATIONS.** Every other party gets a fresh entity object at its `NM1`, so a trailing `N3` / `N4`
  finds `current.address === undefined` and REPLACES. The pay-to slot had no object, so the two arms
  wrote onto whatever the previous `NM1*87` left. A `pendingPayToAddress` binding, reset at each
  `NM1*87` and read by `getCurrentPayToAddress`, IS that object. **The committed slot is never
  cleared** - which is exactly what remedy 1 did and was refuted for.

- **🩺 THE COMMIT RULE IS STATED IN THE EMIT SIDE'S TERMS, AND THAT IS THE WHOLE ANSWER TO THE
  CONSTRAINT THE TWO REFUTATIONS BOUGHT.** The current occurrence takes the slot when
  `statesAnAddress(next) || payToAddress === undefined`. `statesAnAddress` is defined as "`emitAddress`
  would write at least one segment for this", in `src/transactions/claim/address-segments.ts`, and
  `emitAddress` asks the same module for its own two conditions. So the reader cannot decide an
  address is worth keeping on a rule the writer does not use, and there is no second copy to forget.
  This is the discipline `build835` already uses, where the emit guard reuses the read side's balance
  validators. **Remedy 2 failed precisely because its condition was "a write happened", which is a
  property of the DOCUMENT's segment stream rather than of what the emit would write.**

- **THE `payToAddress === undefined` ARM IS NOT A CONVENIENCE; IT IS WHAT KEEPS THE CONFORMANT CASE
  BYTE-IDENTICAL.** A lone `NM1*87` with a valueless `N3~` reads `{ lines: [] }` at base and re-emits
  a bare `NM1*87*2~`. That is a pre-existing shape, not this item's, and a content-only rule would
  have silently changed it to no pay-to loop at all. Pinned as a control.

- **🩺 THE COST, MEASURED AND DISCLOSED RATHER THAN ARGUED AWAY: a repeat that states only PART of an
  address re-emits only that part.** A second `NM1*87` followed by an `N4` and no `N3` reads
  `{lines: [], city: "SHELBYVILLE", ...}` and emits `NM1*87*2~N4*SHELBYVILLE*IL*62565~`, a Loop 2010AB
  with no `N3`, where base emitted a complete-looking address assembled from two. **Keeping the
  earlier occurrence's street lines there IS the fusion** - one sender's street under another
  sender's city - so a future reader must not "finish the job" by restoring them. In
  `KNOWN-LIMITATIONS.md`, the troubleshooting row and the `CHANGELOG`.

- **THE WARNING IS WHAT MAKES ANY RESOLUTION DEFENSIBLE.** `X12_837_PAY_TO_ADDRESS_REPEATED`, the
  28th Tier-2 code (additions-only), factory `payToAddressRepeated(position)`. The model has ONE slot
  and the document named two addresses, so whatever rule is applied loses one of them; both refuted
  remedies lost one SILENTLY, and that is the word the refutations turned on. Anchored at the
  repeated `NM1*87`, no `elementIndex` (a second occurrence of a segment is not a defect in an element
  of it). Once per repeat. **The counter resets at the Loop 2000A `HL`, beside the slot it guards** -
  a latching one reports a conformant second billing provider as a repeat, and that has its own red
  control.

- **CENSUS, RUN NOT DERIVED: 13 of 27 red** with head's new file run against a base checkout of the
  walker (`src/parser/warnings.ts`, `src/index.ts` and the new `address-segments.ts` copied in so the
  imports resolve; `get-837.ts` and `build-837.ts` left at base). **The 14 green are all labelled
  controls**, and six of them are the "does not erase" model and emit assertions, which MUST be green
  on base: they exist to prove the remedy does not reproduce remedy 1's and remedy 2's refutations,
  so a red there would mean the fix had reintroduced the erasure. **Both figures are the CORRECTED
  file's** - the first version of them, 12 of 26, was measured on a file carrying the vacuous test a
  refuter then found. Re-run, never adjusted by arithmetic.

- **EVERY GUARD HAS ITS OWN RED NEGATIVE CONTROL, and the four are not interchangeable.** Removing
  the per-occurrence reset reds **7**; committing unconditionally reds **4**; latching the counter
  reds **1**; pointing `getCurrentPayToAddress` back at the committed slot reds **7**.

- **🩺 THE ANCHOR PROBE WAS WRONG ON ITS FIRST RUN AND THE MODEL CORRECTED IT** - this repo's
  standing "a probe that disagrees with the model's own shape measures nothing", hit again. It
  asserted `tx.segments[segmentIndex - 1]` and read an `N4`. The walker iterates
  `tx.segments.slice(1)` (the `ST` is dropped) and anchors at `i + 1`, so `segmentIndex` indexes
  `tx.segments` DIRECTLY. Measured against the source, not assumed, and the corrected assertion also
  pins `elements[1] === "87"` so it cannot pass on the wrong segment kind.

- **NOT DONE, AND THE REASON IS THE BYTE BUDGET RATHER THAN A JUDGEMENT ABOUT THE TRAP: this item
  added NO `CLAUDE.md` trap.** That file measured **52,903** against a hook entry of **52,912**, so a
  trap of this one's size had to be paid for by relocating roughly 1,150 bytes first, and the only
  passages carried here verbatim sit inside four unrelated traps - including the `build835` balance
  terms, which `CLAUDE.md` itself says are enumerated "because a count without its list cannot
  self-correct". **Cutting four traps to buy room for a fifth is the exact failure mode the bound
  exists to prevent**, and lowering the entry is an umbrella-owned act outside this slice's scope.
  The imperatives are here instead. **The next agent to work this area should read this section
  before the pay-to route**, and a trap line here is owed the next time that file has room.

- **Two `PRE-EXISTING` findings carried forward UNCHANGED, both filed by `#80`'s refuters and neither
  this item's:** an `NM1*87` arriving while a `CLM` is open never reaches the pay-to route (the
  `context.kind === "loop2000A"` guard) and lands among provider roles, at a level the bullet below
  says never to state as one; and `attachContact`'s `/* v8 ignore */` comment still calls
  its `payToAddress` arm "structurally unreachable in v1", which a `PER` after an `NM1*87` reaches.
  **Neither is warned by the new code and the new code does not claim to reach them.**

- **🩺 THE FIRST OF THOSE TWO HAS A DESTINATION THIS SLICE PUBLISHED WRONG ON TWO SHIPPING SURFACES,
  AND A REFUTER MEASURED IT. NEVER RESTATE IT AS ONE DESTINATION.** The backlog item and the prior
  slice both say the `CLM`-open `NM1*87` "lands in `claim.providers`". Measured here, head and base:
  that holds only where **no Loop 2400 is open**. With one open it lands on that line's
  `serviceLine.providers` instead - `get-837.ts` tests `currentServiceLine` FIRST and only falls to
  `currentClaim` when no line is open - and a provider at line level is TR3 Loop **2420**, not
  2310. **NAME THE LOOP, NEVER ITS LETTER SPAN:** a remedy draft wrote `2420A-H`, which is 837P's
  range, on a sentence generalized over P/I/D whose I and D ranges are shorter - the census shape
  `X12-VARIANT-LOOKUP-PROTOTYPE` forbids, committed while fixing a different overclaim. Cut back to
  `2420`, which is how the rest of this repo already writes it.
  The unqualified form was corrected on `KNOWN-LIMITATIONS.md`, `docs-content/troubleshooting.md`
  and the `CHANGELOG` **after** it had shipped in the branch, which is the fifth consecutive slice in
  this lineage where the parser graded correct and the prose did not. **A pre-existing behaviour
  re-described more confidently than it is true is an INTRODUCED defect**, because the confidence is
  new even where the behaviour is not.

- **DEFERRED, EXPLICITLY, AND NOT STARTED HERE: the `X12Decimal | undefined` breaking slice.** An
  absent required `SV1-02` still reads a confident `0`. It is its own unit and touching it inside
  this one is what the item forbids.


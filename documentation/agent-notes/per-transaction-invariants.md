# x12 - per-transaction invariants that shipped with the phases

**Relocated VERBATIM out of `CLAUDE.md` on 2026-08-08, nothing dropped**, to pay for the
`X12-TA1-EMIT-NOT-RELEASE-AWARE` trap under the ratchet that file states: a new trap is paid for by
relocating first, and the entry is LOWERED as the relocation lands, never raised. This is the
standing discipline's own destination for narrative from a shipped phase. `CLAUDE.md` keeps the
pointer and the list of what is in here; **every imperative below is live and none of it was
softened.**

Full detail for EVERY bullet below is in the phase sections of `documentation/agent-notes.md`, `#phase-9-profiles-and-quirk-attribution` through `#phase-1-envelope-decoder`. Open the phase that shipped the surface before you change it.

- **🩺 v1 profiles are DESCRIPTIVE: a profile NEVER alters the parse.** `groups` / `warnings` / `isa`
  are byte-identical with and without one (divergence test); `partitionWarnings` is the one hook.
- **🩺 HARD RULE, LOCKED: a profile quirk with no Tier-2 fixture demonstrating the deviation is
  FORBIDDEN. No invented quirks.** Enforced three ways; built-ins reach consumers ONLY via
  `profiles` - relocated narrative §10.5.
- **The profile API DIVERGES from `hl7` DELIBERATELY** (`describe()` returns DATA, `X12ProfileSpec`,
  the x12-only `partitionWarnings`). **"Symmetry is a feature" does NOT license collapsing them
  back.** Long form for all three: `claude-md-relocated-narrative.md`.
- **🩺 The 820 carries no TR3 balance equation:** `build820` emits every amount VERBATIM and NEVER
  raises a balance-mismatch refusal, a deliberate contrast with `build835`.
- **🩺 Maintenance type is the 834's safety primitive: emit VERBATIM, refuse the unknown** (the read
  side only WARNS, scoped to the affected member; the builder REFUSES). **🩺 The 278 certification
  decision is response-only and never inferred** - relocated narrative §10.7.
- **🩺 TRN echo is the safety-critical reassociation invariant: the builders place the caller's trace
  into TRN-02 VERBATIM and NEVER fabricate, normalize or mutate it.** Which echoes which: the phase
  sections.
- **🩺 The HL spine is COMPUTED, never caller-supplied. State it PER BUILDER, never as a blanket.**
  All four compute HL-01/02/04 from the nested tree and take HL-03 from a module-level `HL_LEVEL`
  constant, at every level EXCEPT the 278's EV/SS review level, so an inconsistent hierarchy is
  _unrepresentable_. **There is no level field on `Build271Spec` or `Build277Spec` and none should be
  added** - that destroys the guarantee rather than closing a gap. The four level chains: relocated
  narrative.
- **🩺 The one caller-supplied HL-03 is the 278's EV/SS REVIEW level** (`review.levelCode`, default
  `EV`). **Both entry points REFUSE anything else** (`X12_278_BUILD_INVALID_SPEC`, no new code): the
  review **and its HCR-01 decision FAIL TO DECODE - they are NOT decoded WRONGLY**. **Resolve via the
  emitter's own `?? "EV"`, NEVER `!== undefined`.** Reaches nested and dependent reviews. **Do not
  restate it as a property of `build278`'s HL-03 generally, nor write "every builder that has one"
  over it** - long form: relocated narrative §10.1.
- **🩺 On the READ side the walker NEVER silently re-numbers a broken HL pointer** - it emits
  `X12_HL_PARENT_MISMATCH` / `X12_HL_PARENT_LEVEL_INVALID`. The 278 `EV` / `SS` levels are
  deliberately tolerant, so nothing on the read side catches an out-of-enum HL-03 on a document this
  library did not emit. Untouched; a warning needs a new code - relocated narrative §10.2.
- **Emit the envelope INLINE, not via `buildInterchange`, in any domain builder that composes a
  composite element** (835, 837), so a pre-composed composite is never double-escaped - relocated
  narrative §10.6.
- **`splitSegments` is release-aware via `findUnescapedTerminator`** (what a naive `indexOf` split
  did: relocated narrative §8). A degenerate terminator-is-release delimiter set falls back to the
  literal scan.
- **Control NUMBERS are identity and are NEVER rewritten** even under `{ specClean: true }`;
  corrected COUNTS emit only with `{ recomputeCounts: true }`, inert without `specClean`. Every
  mismatch surfaces via `onWarning`, never silently corrected.
- **🩺 All monetary / percent / quantity fields decode as `X12Decimal`: string-backed, `BigInt`-exact,
  never `parseFloat`.**
- **🩺 The 835 model is NEVER silently rebalanced.** Three TR3 X221A1 §1.10.2 invariants (line, claim,
  top-of-remit) run after the walk and emit `X12_835_REMIT_BALANCE_MISMATCH`. **PLB amounts carry the
  RAW EDI sign (positive = take-back), so the top equation is `BPR-02 == Σ(CLP-04) - Σ(PLB)`.**
- **🩺 An unknown code preserves its verbatim value and warns; it is never dropped or normalized.**
  **NAME THE RULE, NEVER THE MEMBERS** - derive the codes from `WARNING_CODES`. The HI one keeps the
  verbatim qualifier AND code with `codeSystem: "unknown"`.
- **🩺 Acks are structurally PHI-free by design; `IK4-04` is a caller surface callers SHOULD omit
  when the bytes are PHI, and the library NEVER auto-populates it.**
- **`build999` REFUSES `Accept` with a non-empty error list (`X12_ACK_ACCEPT_WITH_ERRORS`) and bad
  AK9 counts (`X12_ACK_COUNT_MISMATCH`); `buildTA1` REFUSES `A` with a non-`000` note.**
- **🩺 Every DOMAIN builder's own refusal message carries structural locators, counts and numeric
  totals only** - never an identifier, name, trace or clinical code. **State this PER BUILDER, never
  as a property of every builder.** Standing exception, the **ack path** (`build999`, `buildTA1`).
  **It is NOT an absolute PHI guarantee, only one about TEMPLATES** - relocated narrative §10.3.
- **🩺 NO CALLER GUARD ECHOES WHAT A CALLER PUT IN AN ELEMENT** - they report the TYPE only.
  **Never re-add a value, never fold the decimal one back out. What this does NOT say, drafted
  false once:** the array guard STILL renders a forged array-like's `length` and class tag -
  relocated narrative §10.4.
- **The `?`-release escape is honored losslessly**; dot-path traversal walks elements, composites
  (`-N`, 1-indexed) and repetitions (`[N]`, 0-indexed).
- **Known read-side limitations are documented, not accidental, and `KNOWN-LIMITATIONS.md`
  enumerates them.** One worth knowing here: `get834Enrollments` streams per `INS` loop over a file
  **still parsed into `tx.segments` up front** - an honest v1 limitation, not a streaming parser.

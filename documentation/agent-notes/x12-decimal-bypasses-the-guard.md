# `X12-DECIMAL-BYPASSES-THE-GUARD` (2026-08-04)

> **RELOCATED IN FULL from `CLAUDE.md` on 2026-08-11, VERBATIM, NOTHING DROPPED.** It paid for the
> `X12-NO-INTERNAL-REFS-GATE` trap, under this repo's own ratchet: relocate first, lower the entry as
> the relocation lands, never raise it. The narrative it points at stays where it was, in
> `documentation/agent-notes.md#x12-decimal-bypasses-the-guard-2026-08-04`; this file is the
> imperative set that used to sit in `CLAUDE.md` and it is unchanged below.

- **Every `X12Decimal` slot emits through the builder's `escDec` over `requireCallerDecimal`.** How a raw
  `number` in such a slot used to bypass that guard, and what went out on the wire: relocated
  narrative §8.
- **🩺 Refuse, never round:** guessing the scale of money is what `X12Decimal` exists to prevent
  (relocated narrative §8).
- **Do not flatten this with `#60`.** `#60` existed because a required identifier VANISHED. Nothing
  vanishes here and nothing is mis-_read_; the exposure is float noise on the wire.
- **Type safety is structural; DELIMITER safety is per-slot. Never write the unqualified form.**
  `requireCallerSegment` type-checks every element of every segment emitted **through a builder's
  `seg`/`joinSeg` helper**. A `string` carrying an active delimiter in a slot that skipped `esc` is
  still emitted verbatim.
- **The raw slots routed through `esc`: delimiter-safe and type-checked, value-constrained only where
  a trap below says so. ONLY these were routed** (the enumeration: relocated narrative §7). **The
  residual delimiter injection is NOT stop-the-line** - it fails at the receiver and mints no wrong
  clinical value. Do not escalate it as if it did.
- **`buildTA1` uses NEITHER `seg` NOR `joinSeg`; it DOES use `esc` now** (trap above), and no `pad`.
  TA1-01 is data element I12, the reassociation key. **This was the FOURTH iteration of the
  completeness claim; do not write the unqualified form again.**
- **The fixed-width ISA line is joined directly and is outside BOTH guards.** Both throws terminate and
  neither is silent (which throws what: relocated narrative §8).
- **`build835`'s balance-equation amounts refuse UNTYPED, and every other `X12Decimal` field refuses
  TYPED.** `enforceBalance(spec)` runs BEFORE the escaper is built, so `requireCallerDecimal` is
  unreachable on anything it reads.
- **🩺 STATE THE RULE, AND NAME SPEC FIELDS - NEVER ELEMENT NUMBERS.** A slot refuses untyped exactly
  when the balance guard reads it as a term of one of the three §1.10.2 invariants (line, claim,
  top-of-remit) in `src/transactions/remit/balance.ts`. **The terms are ENUMERATED in relocated narrative §8, because a count
  without its list cannot self-correct; read them there and never re-derive them.** Two successive
  remedies published a closed list and an element-number list and both were measured wrong. Both arms are pinned on one fixture, so moving a slot between them reds the gate.
- **Assert the MESSAGE, not the class, in every builder-refusal test** - including the disclosure
  pins. `expect(run).toThrow(Remit835BuildError)` passes on an unrelated refusal; four of six new
  cases were vacuous that way.
- **Never bound a loop with `i < parts.length` over a caller array-like; iterate with `for...of`,
  which throws** (the forged shape and what it reported: relocated narrative §9). **The scanner is
  not comment-stripped for that rule**, so writing the bad shape in a comment reds it too.
- **The pinned `esc` counts, and why "X12 code source 715" was wrong, are MEASUREMENTS and not
  rules** - agent-notes section; read them there before quoting either.

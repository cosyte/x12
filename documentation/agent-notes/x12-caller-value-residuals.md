# `X12-CALLER-VALUE-RESIDUALS` (2026-08-02)

**Relocated VERBATIM out of `CLAUDE.md` on 2026-08-09, nothing dropped**, to pay for the
`X12-EMPTY-CONTROL-NUMBER-FABRICATED` trap at the top of that file's list. The imperatives below
are LIVE; the narrative they point at is `documentation/agent-notes.md#x12-caller-value-residuals-2026-08-02`
and `documentation/agent-notes/claude-md-relocated-narrative.md`.

Open this before you touch `renderCallerValue`, `renderCallerJson`, `requireCallerArray`, any
indexed loop bound in a `build*` module, or either of the two source scans that hold them.

- **Every caller-value hole across the `src/profiles/validate.ts` refusal sites routes through
  `renderCallerValue` or `renderCallerJson`. Derive both counts; never quote them here.**
- **`renderCallerJson` keeps `JSON.stringify` and bounds its OUTPUT; it never throws and fabricates
  no closing quote. `X12ProfileError.profileName` is deliberately NOT bounded**, asserted as a test
  (both reasons: relocated narrative §9).
- **🩺 Every indexed loop bound in a builder comes from a `requireCallerArray` binding.** A forged
  `{ length: "9".repeat(120000) }` coerces to `Infinity` and the builder **spins forever instead of
  refusing**; most probes HUNG at base. Both censuses are in the agent-notes section.
- **`requireCallerArray` takes the module's own `refuse` callback, never a shared throw** - each
  builder owns a distinct error class and code consumers branch on.
- **`requireCallerArray` answers `null` as ABSENT** (why: relocated narrative §7). **`build835`'s
  `claims` is the measured exception**, pinned by a test.
- **Scope the claim: a forged non-array is availability, not `STOP-THE-LINE`** - nothing decodes a
  document differently. **`for...of` sites throw `TypeError: ... is not iterable` with NO `code`**;
  those sites and the reachability: relocated narrative §9. Disclosed, pinned.
- **`test/builder-array-bounds.test.ts` keys on the OPERAND, never on the property NAME** - that is
  the mistake `#51`'s allowlist made twice. Its scan strips comments first.
- **🩺 The negative control found something worse than a red: removing a `requireCallerArray` call
  WEDGES the test rather than failing it** (why: relocated narrative §8). **That is the argument for
  keeping the source scan exhaustive rather than trusting the examples.**
- **Drive the shipped table, not a side probe**, and **every figure this area publishes is a
  MEASUREMENT, not a maximum** (the figures and the `QUIRK_ID_RE` correction: relocated narrative §7).
- **Known and NOT claimed away:** bounding a message here **redacts nothing**, the survivors are
  **not escaped**, the bound is UTF-16 **code units, not bytes**, both scans are syntactic tripwires
  and not proofs, and **neither gate scans indexed loops outside the `build*` scope** (the four
  places: relocated narrative §9).

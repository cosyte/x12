# `PARSER-TESTTIMEOUT-ASSERTS-AN-IDLE-BOX` (2026-08-03)

**RELOCATED VERBATIM FROM `CLAUDE.md` 2026-08-08, NOTHING DROPPED**, to pay for the
`X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` trap under that file's own ratchet: relocate first, never
delete a trap, never raise the ceiling. The measurement, sources and refutation history stay in
`documentation/agent-notes.md#parser-testtimeout-asserts-an-idle-box-2026-08-03`; the imperatives are
below and they are LIVE.

- **No timeout value changed; that is the finding, not an omission.**
- **Count BOTH trees; never reuse one census for the other.**
- **Re-derive this box's capacity; never inherit a figure.** The item's numbers are stale.
- **Interleave BASE/HEAD runs, two rounds each. Never one.**
- **The `tsx` -> `node` substitution is pinned as an EQUIVALENCE, not assumed. Scope it:** `paths`
  mode only (why: relocated narrative §8).
- **The global `testTimeout` stays at 10 s on purpose**, and **do not upgrade the `10.0 s` reading
  into a proven crossing** - the reporter rounds. The 834 stream's figures: relocated narrative §8.
- **🩺 `testTimeout` is NOT the liveness net people assume.** An **infinite synchronous** loop gives
  **NO VERDICT AT ALL** and wedges the worker. A liveness regression here reads as an ABSENT verdict,
  not a red one, and no value of `testTimeout` changes that. The defence is the source scan in
  `test/builder-array-bounds.test.ts`.
- **`test/scripts/attw-gate.test.ts` is deliberately left alone** - pinning the REAL binary is the
  point of it.

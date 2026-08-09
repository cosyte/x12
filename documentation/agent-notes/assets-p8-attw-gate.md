# `ASSETS-P8`: the `attw` gate lies

**RELOCATED VERBATIM FROM `CLAUDE.md` 2026-08-08, NOTHING DROPPED**, to pay for the
`X12-INTERCHANGE-GS-EMIT-NOT-RELEASE-AWARE` trap under that file's own ratchet: relocate first, never
delete a trap, never raise the ceiling. The measurement, sources and refutation history stay in
`documentation/agent-notes.md#assets-p8-the-attw-wrapper`; the imperatives are below and they are
LIVE.

- **🩺 `attw` prints "does not contain types" and EXITS 0, so the `attw` script is `scripts/attw.mjs`,
  a wrapper, NEVER the bare CLI** (the upstream line that does it: relocated narrative §8). For a
  package that ships types it means the declarations were **not in the tarball**: a broken publish reported as a pass.
- **`scripts/verify.sh` needs no change; do not touch it** - it propagates the step's status
  faithfully; the step is what lies to it.
- **The timing supplies the condition; the exit code is the defect** (the `tsup` build interval:
  relocated narrative §7). **Re-measure per repo; do not carry a sibling's figure over.** The answer
  is **not** a lock, a lease or a build queue (ADR 0015): the gate has to be able to say its own
  inputs were missing, whatever removed them.
- **Keep BOTH nets in `scripts/attw.mjs`; they catch different things** - the preflight and the
  post-check, and what each one catches that the other structurally cannot: relocated narrative §9.
- **The post-check reads a string, so anything that could hide it is REFUSED by option name,
  wholesale, not by value** (four routes; a nonexistent `--config-path` blinds nothing).
- **`test/scripts/attw-gate.test.ts` pins the upstream exit-0 itself**, so an `attw` upgrade reds the
  suite instead of letting the net go quietly slack.
- **The port is NOT finished org-wide, including `config/scripts/parser-template/`, which
  `scaffold-parser.mjs` mints new parsers from.** Derive the set; never trust a count.

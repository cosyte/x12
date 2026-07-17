---
"@cosyte/x12": patch
---

Harden `scripts/sync-version.mjs` against two latent defects, and gate it in CI (SYNC-VERSION-HARDENING).

Follow-up hardening on the VERSION-SYNC script; ported byte-identically across `hl7`, `x12`, and `mllp`.

- **`$`-pattern injection.** The version was spliced into `src/index.ts` via `String.prototype.replace` with a _replacement string_, which interprets `$&`, `$1`, `` $` ``, etc. A version like `1.2.3-$&x` would inject the matched text and corrupt the `VERSION` constant while exiting 0. Fixed by passing a replacer _function_, whose return value is inserted literally.
- **Decoy-declaration match.** The declaration regex was non-global, so `.replace` silently rewrote the _first_ match; a column-0 decoy (e.g. inside a comment) ahead of the real declaration could be edited instead. Fixed by matching globally, asserting exactly one declaration, and exiting non-zero (loudly) otherwise.
- **CI gate.** The `format`/`format:check` globs now cover `scripts/**/*.mjs`, so the script is prettier-gated in CI (the `.mjs` scripts were matched by no format glob before; `scripts/**/*.ts` was already gated).

Neither defect is reachable through Changesets today and both previously failed loud rather than shipping a lying `VERSION` — this is hardening. Build tooling only; no runtime or public-API change.

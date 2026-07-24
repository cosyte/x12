---
"@cosyte/x12": patch
---

Correct the README status line to match the published reality (README-ORG-SWEEP).

`@cosyte/x12` is published on npm at `0.0.1` from a public repo, but the README's status line still
claimed it was "not yet published to npm" with "the first npm publish gated on the coordinated public
launch", directly contradicting the npm-version badge and the `pnpm add @cosyte/x12` install line
already in the same file. Rewritten to state it is published at `0.0.1`, in a public repo, still
pre-alpha on the `0.0.x`-until-first-alpha ladder. The read/emit scope claim is unchanged. Docs only,
no runtime or public-API change.

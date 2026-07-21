---
"@cosyte/x12": patch
---

Correct the publish-status drift in the user-facing docs to match the published reality (README-ORG-SWEEP).

`@cosyte/x12` is published on npm at `0.0.1` from a public repo, but the developer docs that render on
docs.cosyte.com (`docs-content/intro.md`, `docs-content/installation.md`,
`docs-content/troubleshooting.md`) and `KNOWN-LIMITATIONS.md` still claimed it was "not yet published
to npm" / "gated on the coordinated public launch" (and `KNOWN-LIMITATIONS.md` still said `0.0.0`).
Rewritten to state it is published at `0.0.1`, public, still pre-alpha on the `0.0.x`-until-first-alpha
ladder; `installation.md` now describes the `npm install` line as live rather than aspirational. The
read/emit scope claims are unchanged. Docs only — no runtime or public-API change.

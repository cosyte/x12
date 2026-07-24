---
"@cosyte/x12": patch
---

Bring `docs-content/` to the full canonical Diátaxis spine (DOCS-CONTENT-P4).

The sidebar was Overview-only, with `cookbook.md` authored but orphaned (invisible to every reader).
This wires the cookbook into Guides and adds the rest of the spine every `@cosyte/*` package shares:

- **Core Concepts**. Four new Explanation pages: the envelope/loop model, the 80/20 transaction sets
  (the reader/builder pair each shipped set exposes and the field it preserves verbatim), the
  tolerance tiers + warning-code model, and decimal-exact money (`X12Decimal`).
- **Installation** and **Quickstart** tutorials (parse an 835 remittance and post the cash).
- **Troubleshooting & known limitations**: the fatal-vs-warn model, a symptom→cause table, PHI-in-logs
  discipline, and the v1 non-goals, gated to the shipped surface.
- Refreshed the stale `intro.md` status/roadmap section to the current shipped reality (full v1 read +
  emit + profiles) with an honest status banner; no unshipped API is documented.
- Every runnable snippet is gated by the shared doc/code-agreement harness
  (`test/docs-content.test.ts`, `docSnippetSuite()` over the built ESM artifact), so a documented
  example cannot silently drift from the code. Fixed a latent malformed-ISA fixture in `cookbook.md`
  (sender/receiver IDs padded to 16 bytes, not 15) surfaced by making the examples executable.
- Bump `@cosyte/vitest-config` devDependency to `^0.0.2` for its `/snippets` export.

Synthetic-only fixtures throughout. Docs and tests only, no runtime or public-API change.

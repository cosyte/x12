---
"@cosyte/x12": patch
---

Phase 10 — release hardening. The v1 close-out: no new parser surface, just the gates, tooling, and docs that make the package trustworthy to publish.

- **Publish-pipeline proof (dry-run).** A new `release-dry-run` CI job proves a real release would succeed without burning a version or needing registry auth: `pnpm publish --dry-run` exercises the publish command path and `npm pack --dry-run` asserts the publishable tarball assembles with the right file set + built `dist/`. The real provenance publish stays gated on the public launch.
- **Nightly amplified fuzz.** A scheduled `fuzz.yml` workflow re-runs the byte-flip / never-throw property targets at a higher iteration count (`X12_FUZZ_RUNS`) with a rotating seed (`X12_FUZZ_SEED`) — the deep search that would slow the per-commit run — and opens/auto-closes a sticky issue on failure. The per-commit suite is unchanged (pinned seed, base counts, coverage-stable); a finding is replayable via the printed seed.
- **`pnpm refresh:code-lists`.** A release-event tool that validates every bundled code-list snapshot (well-formed `meta` ISO dates, non-empty unique codes + descriptions) and prints a freshness audit; its validator also runs on every `pnpm test`. Full regeneration from the canonical WPC / X12 sources (`--fetch`) is a redistribution-terms-gated release step and prints the source manifest rather than fabricating unreviewed descriptions.
- **Docs.** A task-oriented `docs-content/cookbook.md` (post an 835, route 277CA rejections, round-trip a 271 with the TRN echo, walk an 837, read a 999, handle warnings) and a `KNOWN-LIMITATIONS.md` do-not-over-trust statement; the README is now a real Quickstart. JSDoc `@example` completeness closed (`ISA_MIN_LENGTH`, `DELIMITER_POSITIONS`, `RELEASE_CHAR`).

Known limitation carried forward: an external-oracle differential corpus (vs CMS Medicare 835) is not yet wired, pending a redistribution-terms review — see `KNOWN-LIMITATIONS.md`.

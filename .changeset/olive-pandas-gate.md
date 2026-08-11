---
"@cosyte/x12": patch
---

The public surface and the shipped JSDoc no longer carry internal project bookkeeping, and a gate
now keeps it that way. Documentation and tooling only: the diff is comment-only in `src/`, and
`dist/index.mjs` / `dist/index.cjs` are byte-identical before and after, so no behaviour moved.

What a consumer receives changes in two places. `KNOWN-LIMITATIONS.md` and the documentation pages
no longer carry internal item identifiers, "phase" build-order framing, or "slice" as a word for a
unit of work; each was translated into what the software does and what changed, never deleted, and
where an identifier was stripped off the front of a line the head was repaired. Two pages pointed
the reader at the package's `CLAUDE.md`, which the tarball does not ship, and now point at
`README.md` and the Cookbook instead. `dist/index.d.ts` and `dist/index.d.cts`, which every install
receives and every editor renders on hover, carried the same bookkeeping on the exported
declarations; measured on a local build of the base commit, 13 lines carried item identifiers, 64
carried phase and wave framing, 2 carried "slice" jargon and 1 cited a repository path a consumer
cannot open. All are gone.

`pnpm check:no-internal-refs` is the gate, with its own workflow. It scans `README.md`,
`TRADEMARKS.md`, `LICENSE`, `KNOWN-LIMITATIONS.md`, `docs-content/`, the npm `description` and
`keywords`, and the `/** */` doc comments under `src/`, line by line and again over
paragraph-joined text so a violation that straddles a line wrap cannot hide. It refuses to report
OK from a scan that did not read all of its input, and it self-tests both directions before it
reports: that each rule still matches what it bans, and that each still lets through the 005010
segment-field references this package's documentation exists to provide.

It is derived from the sibling parsers' copy of this gate rather than transcribed from it, because
in this package `X12` is both the name of the standard and the prefix on our own work items. The
siblings exclude `X12-<three digits>` as reference material; here that pattern matches only internal
identifiers, so the exclusion is dropped and transaction sets and guides are written bare, as
`837P` and `005010X222A1`, the spelling the documentation already used. `KNOWN-LIMITATIONS.md` is
scanned because this package ships it in the tarball.

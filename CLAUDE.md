# @cosyte/x12

Our ASC X12 EDI parser for Node.js and TypeScript, public on npm under MIT with zero runtime
dependencies. It reads the 005010 healthcare transaction sets leniently and emits each through a
builder that refuses what it cannot write exactly, mirroring the API of `@cosyte/hl7`.

@AGENTS.md

## Gate

Required checks: `ci / verify (22)`, `ci / verify (24)`, `ci / actionlint` and
`no-emdash / tracked-files`. Run from the repo root after `git add`, with pnpm 10.34.5 (the
`packageManager` pin) first on PATH: pnpm 12 refuses the frozen install, and tests run `pnpm`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm format:check && pnpm phi-scan
pnpm test && pnpm test:coverage && pnpm build && pnpm attw
pnpm typecheck:examples && pnpm lint:examples && pnpm examples && pnpm phi-scan:examples
pnpm check:no-emdash && pnpm check:no-internal-refs
pnpm differential:check
```

The shared `ci` job runs lines 1 to 3 on Node 22, 24 and 26; the rest are jobs of their own.
`differential:check` needs `uv` on PATH and the network. Detail:
documentation/agent-notes.md#the-gate-in-full.

## Hazard

An X12 file carries patients' identities, coverage and claims. A segment read one element off
still parses and looks plausible, and downstream it is a wrong claim amount, eligibility answer or
posted payment, with nothing to flag it. When a value is in doubt, warn rather than guess, and keep
document bytes out of errors, warnings and logs.

## Rules

Each names its failure; the full text: documentation/agent-notes.md#the-rules-in-full.

- Warnings carry no value: `message` comes from `ALL_WARNING_MESSAGES`, and a `build*` refusal
  bounds what it names (#46, #75).
- Never fabricate a value: absent stays undefined and warns; a builder refuses an empty one
  (#66, #83, #101).
- A repeated or contested segment never resolves in silence (#87, #88).
- Builders refuse what they cannot emit exactly: never coerce, round or drop (#60, #63).
- Escape caller values with the release character on emit, and split release-aware on read
  (#96, #97, #99).
- Tables keyed by document bytes resolve through `wireLookup` or `Object.hasOwn`, never `in` (#69).
- Check element maps against the guide and literal bytes, never this repo's reader (#64).
- Envelope `raw` and `elements[n]` are raw text; no doc promises a value from them
  (#110, #116, #119).
- Derive what is read and emitted from `X12_TR3_CONFORMANCE`, never from memory (#127).
- Orphan segments re-emit at their `anchor` (#48, #49); bound loops over caller values (#53, #58).
- `scripts/phi-scan.ts` keeps its `--staged` argv and takes no exemption (#76, #77, #90).
- `pnpm attw` stays `node scripts/attw.mjs`: bare `attw` exits 0 on a tarball with no types (#55).
- No internal identifiers or phase words in `README.md`, `KNOWN-LIMITATIONS.md`, `docs-content/`
  or `src/` doc comments: translate, never delete; `X12-` is also our item prefix (#120).
- Changesets are patches (D56, 2026-11-07), first sentence for a consumer (#93, #114). Never
  hand-edit `CHANGELOG.md`.
- `release.yml` grants every scope the shared release pipeline declares (#27, #129, #133).
- In `docs-content/`, link outside files by GitHub URL and keep the sidebar spine (#125, #159).

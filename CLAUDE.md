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
pnpm check:documents
pnpm differential:check
```

The shared `ci` job runs lines 1 to 3 on Node 22, 24 and 26 and the rest are jobs of their own;
`differential:check` fetches its two pinned Python oracles through `uv`, so it needs the network.

## Hazard

An X12 file carries patients' identities, coverage and claims. A segment read one element off
still parses and looks plausible, and downstream it is a wrong claim amount, eligibility answer or
posted payment, with nothing to flag it. When a value is in doubt, warn rather than guess, and keep
document bytes out of errors, warnings and logs.

## Rules

- Warnings carry no value: `message` comes from `ALL_WARNING_MESSAGES`, and a `build*` refusal
  bounds what it names: warnings rendered control numbers (#46), a refusal its claim id (#75).
- Never fabricate a value: absent stays undefined and warns; a builder refuses an empty one: an
  absent SV1-02 read as a 0 charge (#83), an empty control number emitted `000000000` (#101).
- A repeated or contested segment never resolves in silence: a second `SVx` replaced the first
  (#88), and a contested 837 variant was picked with no warning (#87).
- Builders refuse what they cannot emit exactly: never coerce, round or drop (#60, #63).
- Escape caller values with the release character on emit, and split release-aware on read
  (#96, #97, #99).
- Tables keyed by document bytes resolve through `wireLookup` or `Object.hasOwn`, never `in` (#69).
- Check element maps against the guide and literal bytes, never this repo's reader (#64).
- Envelope `raw` and `elements[n]` are raw text; no doc promises a value from them
  (#110, #116, #119).
- Derive what is read and emitted from `X12_TR3_CONFORMANCE`, never from memory (#127).
- Orphan segments re-emit at their `anchor` (#48, #49); bound loops over caller values (#53, #58).
- `scripts/phi-scan.ts` keeps its `--staged` argv and takes no exemption: a rename passed it
  unseen (#76), and it reported clean over files it never opened (#77, #90).
- `pnpm attw` is the shared gate: bare `attw` exits 0 on a tarball with no types (#55).
- No internal ids or phase words in `README.md`, `KNOWN-LIMITATIONS.md`, `docs-content/` or `src/`
  doc comments; translate, never delete. X12 stays a prefix in `scripts/internal-refs.json` (#120).
- Changesets are patches (D56, 2026-11-07) with no internal id, first sentence for a consumer: the
  release refused 0.0.14 and 0.0.16 over one (#93, #114). Never hand-edit `CHANGELOG.md`.
- `release.yml` grants every scope the shared release pipeline declares (#27, #129, #133).
- In `docs-content/`, link outside files by GitHub URL and keep the sidebar spine (#125, #159).

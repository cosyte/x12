# @cosyte/x12

`@cosyte/x12` is our ASC X12 EDI parser and utility library for Node.js and TypeScript, published to npm under MIT. It is the payer-side sibling of `@cosyte/hl7` and mirrors its API: it reads the 005010 healthcare transaction sets (eligibility, claim status, claims, remittance, enrollment, acknowledgments) leniently, a warning rather than a throw for anything short of structural corruption, and emits them through a builder per transaction that refuses what it cannot write exactly. It has zero runtime dependencies, and this repository is public.

## Gate

From the repo root, in this order, with pnpm 10.34.5 (the `packageManager` pin). pnpm 12 ignores `pnpm.overrides` and refuses the frozen install, and tests shell out to bare `pnpm`, so where `pnpm --version` prints another version put the pinned one first on PATH: `mkdir -p ~/.pnpm10 && corepack enable --install-directory ~/.pnpm10 pnpm && export PATH="$HOME/.pnpm10:$PATH"`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm phi-scan
pnpm test
pnpm test:coverage
pnpm build
pnpm attw
pnpm typecheck:examples
pnpm lint:examples
pnpm examples
pnpm phi-scan:examples
pnpm check:no-emdash
pnpm check:no-internal-refs
pnpm differential:check
```

The first nine are the shared `cosyte/.github` CI ladder, run on Node 22 and 24. The examples steps and `differential:check` are jobs in `.github/workflows/ci.yml`, and the two `check:` scripts run in workflows of their own. `differential:check` fetches its two pinned Python oracles through `uv` (on PATH), so it needs the network. CI alone also loads `dist/` as ESM and as CJS, runs actionlint (installed by its action) and CodeQL, dry-runs the publish and the pack, and installs the packed tarball into a clean directory.

## Hazard

An X12 file carries patients' identities, coverage and claims. A segment read one element off still parses and still looks plausible, and downstream it is a wrong claim amount, a wrong eligibility answer or a payment posted to the wrong line, with nothing to flag it. When a value is in doubt, warn rather than guess, and keep document bytes out of errors, warnings and logs.

## Rules that bind here

Each names the failure that put it here.

- A warning's `message` is a lookup in `ALL_WARNING_MESSAGES`, no warning factory takes a value, and a `build*` refusal bounds the caller value it names: warnings once rendered control numbers verbatim (#46), and a refusal echoed the claim id it refused (#75).
- Never fabricate a value. An absent or undecodable element stays undefined and warns, and a builder refuses an empty one rather than pad it: an unparseable decimal read as 0 (#66), an absent SV1-02 as a confident 0 charge (#83), and an empty control number was emitted as `000000000` (#101).
- A repeated or contested segment never resolves in silence: a second `SVx` in one Loop 2400 replaced the first (#88), and a contested 837 variant was picked with no warning (#87).
- Builders refuse a value they cannot emit exactly; never coerce, round or drop it: a number in a string slot emitted as an empty element (#60), and a raw number in an `X12Decimal` slot emitted `0.30000000000000004` (#63).
- Escape every caller value with the release character on emit, and split release-aware on read: an emitted TA1 Accept read back as a Reject (#97), `buildInterchange` emitted GS elements unescaped (#99), and a released delimiter split an envelope segment on read (#96).
- A table keyed by document bytes resolves through `wireLookup` (`src/parser/lookup.ts`) or `Object.hasOwn`, never a plain read or `in`: ST-03 `constructor` resolved the 837 variant to a function (#69).
- Check an element map against the implementation guide and literal bytes, never against this repo's own reader: the 835 `SVC` map was off by one in both directions and its round trip passed (#64).
- Envelope `raw` and `elements[n]` are raw text, not decoded values, and no doc may promise a value from them: three PRs took such promises back out of the shipped `.d.ts` (#110, #116, #119).
- Derive what the package reads and emits from `X12_TR3_CONFORMANCE`, never from prose or memory: the entry point declared a second 278 guide the package does not conform to (#127).
- A segment outside a transaction stays on `orphanSegments` and re-emits at its `anchor`, never at its input `segmentIndex`: such segments were dropped on read and on emit (#48, #49).
- Bound every loop over a caller value before it runs: a forged array-like `length` coerced to `Infinity` and a builder spun forever (#53), and `testTimeout` cannot catch such a loop because it wedges the worker (#58).
- The `--staged` git argv in `scripts/phi-scan.ts` keeps `--no-renames --ignore-submodules=none --diff-filter=AMTUB`, and the scan takes no path or file-type exemption: a rename, copy or gitlink passed it unseen (#76), and all mode reported clean over files it never opened (#77, #90).
- `pnpm attw` stays `node scripts/attw.mjs`: bare `attw` exits 0 on a tarball that carries no types (#55).
- `README.md`, `KNOWN-LIMITATIONS.md`, `docs-content/` and `/** */` comments in `src/` (they ship in `dist/*.d.ts`) carry no internal identifiers or phase language; translate a hit, never delete the comment: `dist/index.d.ts` shipped 13 item identifiers (#120).
- Never add the sibling repos' `X12-\d{3}[A-Z]?|X12-\d{6}` exclusion to `scripts/check-no-internal-refs.sh`: `X12-` is also our item prefix, and that pattern matched 141 internal identifiers and no standards designation (#120).
- A changeset's first sentence becomes the release headline, so write it for a consumer with no internal identifier: the release gate refused 0.0.14 and 0.0.16 over one and published nothing (#93, #114).
- The caller job in `.github/workflows/release.yml` grants every scope the shared release pipeline declares (`pnpm check:release-caller-permissions`): a short grant failed every Release at startup with no logs (#27, #129, #133).
- In `docs-content/`, link a file outside it by its GitHub URL, and keep top-level sidebar categories on the docs site's spine: an escaping relative link broke the site build for eight nights (#125), and two extra categories blocked the 0.1.0 deploy (#159).

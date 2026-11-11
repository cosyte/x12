# AGENTS.md

`@cosyte/x12` is our ASC X12 EDI parser and utility library for Node.js and TypeScript, published on
npm under MIT with zero runtime dependencies. It reads the 005010 healthcare transaction sets
leniently and emits them through a builder per transaction that refuses what it cannot write
exactly.

## Build and test

Use Node.js 22 or later and the pnpm that `packageManager` in `package.json` pins.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm test
```

## The gate

Run all of these from the repository root, in this order, before you push. CI runs the same checks.
`differential:check` fetches two pinned Python oracles through `uv`, so it needs the network.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm phi-scan
pnpm test
pnpm test:coverage
pnpm test:perf
pnpm build
pnpm attw
pnpm typecheck:examples
pnpm lint:examples
pnpm examples
pnpm phi-scan:examples
pnpm check:no-emdash
pnpm check:no-internal-refs
pnpm check:documents
pnpm check:process
pnpm differential:check
```

`pnpm test:perf` is the scaling gate (`test/perf/scaling-gate.perf.ts`): it fails when `parseX12`,
or the typed reader or builder of any shape the benchmarks measure (835, 837P, 837I, 270, 271, 999
and 275), grows faster than its input. It runs apart from `pnpm test` and never under coverage.

## Benchmarks

`bench/x12.bench.mjs` measures the built package on synthetic documents in the shapes real traffic
has (an 835 remittance, 837P and 837I batches, a 270 and its 271, a 999, and a 275 attachment),
each parsed, read and built, from the small document a feed carries all day to several megabytes.
`bench/corpus.mjs` builds every document in code; `test/perf/bench-corpus.test.ts` holds that each
reads with no warning.

```sh
pnpm build
pnpm bench:reading --out bench-results/reading.json --summary bench-results/reading.md
pnpm bench:compare --base <base checkout>/dist/index.mjs --head dist/index.mjs
pnpm bench:profile --out bench-results/profile
```

A reading reports throughput, latency p50/p95/p99, allocations, peak heap, a long run for leaks,
and the cold import with its gzip size. On a pull request CI compares the base build with the head
at the small sizes, and `.github/workflows/bench.yml` takes a reading and a profile on a hosted
runner when `bench/` changes. Both are advisory.

## Rules

- Synthetic data only. Real patient data never enters this repository: not in a fixture, a test, a
  log, an issue, or a commit. `pnpm phi-scan` runs on every commit.
- A change a consumer can see carries a changeset (`pnpm changeset`); `.changeset/README.md` says
  which bump to pick.
- No em or en dashes anywhere, commit messages included.

`CLAUDE.md` holds the rules that bind changes here and the failure behind each. Contributions follow
the organization's [contributing guide](https://github.com/cosyte/.github/blob/main/CONTRIBUTING.md).

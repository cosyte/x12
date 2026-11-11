---
id: testing-and-quality
title: Testing and quality
sidebar_label: Testing and quality
description: "How we test @cosyte/x12: unit tests, fixtures, properties, fuzzing, differential tests, coverage and mutation floors and the PHI scan, and what each catches."
---

# Testing and quality

This page describes how we test `@cosyte/x12`, what each technique catches, and what it cannot.
The shared rules every Cosyte package follows (the coverage and mutation floors, the property-based
runners, what a pull request must prove) are written down in the testing standard in
[cosyte/config's decision records](https://github.com/cosyte/config/tree/main/documentation/decisions).
The numbers for the current release are in [Current numbers](#current-numbers) below.

The failure we test hardest against is the quiet one. A segment read one element off still parses
and looks plausible, and downstream it is a wrong claim amount, a wrong eligibility answer or a
wrongly posted payment, with nothing to flag it. So most of what follows checks values, not only
that the parser did not throw.

## What we run, and what each technique catches

| Technique               | What it catches                                                                                                                                                                                                                                                                                                                                                                                                                                             | What it cannot catch                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests              | each documented behavior and each failure path of the parser, the readers, the builders, the serializer, the code lists and the profiles, run against the source                                                                                                                                                                                                                                                                                            | an input nobody thought to write down                                                                                                           |
| Fixture corpora         | a regression on a known document shape: synthetic canonical, edge-case and vendor-quirk documents for every transaction set under `test/fixtures/`, and serializer output kept as golden files                                                                                                                                                                                                                                                              | a shape the corpus does not hold; behavior on real payer traffic, since every fixture is synthetic                                              |
| Conformance declaration | a reader or builder that drifts from the implementation guide `X12_TR3_CONFORMANCE` says it follows: each build row is checked against the `ST-03` the builder really emits, and the rows are derived from the public exports, so a new reader or builder without a row fails                                                                                                                                                                               | whether the guide itself is followed clause by clause                                                                                           |
| Property-based tests    | a whole class of input breaking a stated rule: a built 999, 276, 278, 275 or 277 request for additional information reads back with what its spec stated, a built 271 or 277 echoes the trace verbatim, a serialized interchange is a fixed point, normalizing twice changes nothing a first pass did not, the lenient parse never throws outside the four fatal codes, an unbalanced 835 always warns and is never rebalanced, decimal arithmetic is exact | a rule nobody stated; a case outside the cases run; a gap in what the generators produce                                                        |
| Fuzzing                 | a crash, a hang or a runaway allocation on hostile input: flipped bytes through the envelope parser, and a byte flipped anywhere in every committed 835, 837, 271, 277, 997, 278, 275 and 277 request for additional information fixture through its reader                                                                                                                                                                                                 | a wrong but plausible result, unless a property states what right is                                                                            |
| Differential testing    | a value this library decodes differently from an independent reader: each synthetic document is also read by pyx12 or LinuxForHealth x12, each pinned to one version, and compared element position by element position                                                                                                                                                                                                                                     | a bug both readers share; the 278, the dental claim, the 275, the 277 request for additional information and the TA1, which neither reader maps |
| Coverage gate           | code no test runs: lines, branches, functions and statements, held at the floor in `quality-floor.json`, for `src/` and for each directory below it, and every line a pull request changes                                                                                                                                                                                                                                                                  | a test that runs code without checking what it returns                                                                                          |
| Mutation testing        | a test that runs code but would not notice it changing: each mutant is a small change to the source (a condition flipped, a value swapped), and a mutant no test fails on is a gap                                                                                                                                                                                                                                                                          | a mutant that changes nothing a caller can see; code that runs once when a module loads, which the run leaves out                               |
| Doc samples             | a documentation sample that no longer matches the code: every TypeScript sample on these pages is compiled against the package's types and run against the built package, and its `// =>` values are checked                                                                                                                                                                                                                                                | prose that is wrong beside a sample that is right                                                                                               |
| PHI scan                | a realistic patient identifier in a fixture or a staged file, against a declared allow list of synthetic values                                                                                                                                                                                                                                                                                                                                             | anything outside the shapes it knows; it detects after a write, it does not prevent one                                                         |

## How each one runs

- **Unit tests, corpora, the conformance declaration, properties and doc samples** run in one Vitest
  suite on every pull request and on `main`, on Node.js 22, 24 and 26, on Linux, Windows and macOS,
  and again under Bun and under Deno. A test that cannot run on one of them is skipped there by
  name, with its reason in the test file.
- **Property tests** run against a pinned global seed (`test/setup.fast-check.ts`), so coverage is
  reproducible and a failure replays exactly; a test may pass a seed of its own. The properties
  every Cosyte parser proves (round trip, idempotent normalize, and never throws in lenient mode)
  run on the generators we publish at `@cosyte/x12/arbitraries`, and for the 278 request and
  response, the 275 and the 277 request for additional information on generated build specs. They
  run 100 cases each on a pull request and 10,000 each every night, `COSYTE_PROPERTY_RUNS` sets the
  depth of a run, and a failure prints the seed and path that replay it.
  [Property-test your code](./property-test-your-code.md) shows those generators on code of your
  own.
- **Fuzzing** runs at its committed case counts in that suite, and every night for a time budget
  with a seed that changes each run. Each case has a CPU-time budget that grows with its input, so a
  path slower than linear fails the run, and a cap on how much memory one case may allocate. A
  failure prints the seed, and `X12_FUZZ_SEED=<seed> pnpm fuzz` replays it.
- **The coverage gate** runs with the suite. Coverage is held to the floor in `quality-floor.json`,
  which only rises, and on a pull request every changed line that coverage counts must have run. A
  line no input can reach takes an inline exception naming its reason rather than a lower floor.
- **Mutation testing** runs on every pull request over the source files it changes, and every mutant
  in the changed lines must be killed. The full run, over every source file, runs twice a week,
  shared out across sixteen runners, and its score is held to the mutation floor in
  `quality-floor.json`. It runs the suite without the tests that cannot judge a mutant: the scaling
  gate, the tests of this repository's own tooling, the tests that run a build or another process,
  and the fuzz targets, whose per-case time budget a slower mutant fails for its speed rather than
  for what it returns.
- **Differential testing** runs on every pull request and on `main`, in its own job: the comparison
  is run for real against both readers, and the job passes only when it reproduces the committed
  report, the one recorded disagreement included. That disagreement is about the release character
  in a transaction set body, which this library reads and pyx12 does not.
- **The PHI scan** runs on every commit (a pre-commit hook) and in CI, over the fixtures and `src/`.

[KNOWN-LIMITATIONS.md](https://github.com/cosyte/x12/blob/main/KNOWN-LIMITATIONS.md) says what the
differential corpus proves and what it does not, reader by reader.

## Run them yourself

```bash
pnpm install --frozen-lockfile
pnpm test               # unit tests, corpora, conformance, properties and doc samples
pnpm test:coverage      # the same suite with the coverage gate
pnpm quality:check --base origin/main   # coverage against the floor, and every changed line run
pnpm fuzz               # the property and fuzz layer on its own
pnpm phi-scan           # the PHI scan

# The property suites at the nightly depth, and one failing case replayed from its seed and path.
COSYTE_PROPERTY_RUNS=10000 pnpm test:property
COSYTE_PROPERTY_SEED=<seed> COSYTE_PROPERTY_PATH=<path> pnpm exec vitest run <test file>

# Mutation testing: the source files a change touched, then the full run (on one machine it
# takes the time CI shares out across sixteen runners).
pnpm mutate changed --base origin/main && pnpm quality:mutation --base origin/main
pnpm mutate:full && pnpm quality:mutation

# Differential testing fetches its two pinned Python readers through uv:
pnpm differential:check
```

## Current numbers

The numbers for this section are measured on `main` at each release and filled in when the release
is built. They are never typed by hand.

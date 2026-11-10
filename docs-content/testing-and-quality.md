---
id: testing-and-quality
title: Testing and quality
sidebar_label: Testing and quality
description: "How we test @cosyte/x12: unit tests, fixture corpora, property-based tests, fuzzing, differential testing and the PHI scan, with what each catches."
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

| Technique               | What it catches                                                                                                                                                                                                                                                                                                                                                                                           | What it cannot catch                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests              | each documented behavior and each failure path of the parser, the readers, the builders, the serializer, the code lists and the profiles, run against the source                                                                                                                                                                                                                                          | an input nobody thought to write down                                                                                                           |
| Fixture corpora         | a regression on a known document shape: synthetic canonical, edge-case and vendor-quirk documents for every transaction set under `test/fixtures/`, and serializer output kept as golden files                                                                                                                                                                                                            | a shape the corpus does not hold; behavior on real payer traffic, since every fixture is synthetic                                              |
| Conformance declaration | a reader or builder that drifts from the implementation guide `X12_TR3_CONFORMANCE` says it follows: each build row is checked against the `ST-03` the builder really emits, and the rows are derived from the public exports, so a new reader or builder without a row fails                                                                                                                             | whether the guide itself is followed clause by clause                                                                                           |
| Property-based tests    | a whole class of input breaking a stated rule: a built 999 or 276 reads back with what its spec stated, a built 271 or 277 echoes the trace verbatim, a serialized interchange is a fixed point, normalizing twice changes nothing a first pass did not, the lenient parse never throws outside the four fatal codes, an unbalanced 835 always warns and is never rebalanced, decimal arithmetic is exact | a rule nobody stated; a case outside the cases run; a gap in what the generators produce                                                        |
| Fuzzing                 | a crash, a hang or a runaway allocation on hostile input: flipped bytes through the envelope parser, and a byte flipped anywhere in every committed 835, 837, 271 and 277 fixture through its reader                                                                                                                                                                                                      | a wrong but plausible result, unless a property states what right is                                                                            |
| Differential testing    | a value this library decodes differently from an independent reader: each synthetic document is also read by pyx12 or LinuxForHealth x12, each pinned to one version, and compared element position by element position                                                                                                                                                                                   | a bug both readers share; the 278, the dental claim, the 275, the 277 request for additional information and the TA1, which neither reader maps |
| Coverage gate           | code no test runs: lines, branches, functions and statements, held at a floor for `src/` and for each directory below it                                                                                                                                                                                                                                                                                  | a test that runs code without checking what it returns                                                                                          |
| Mutation testing        | a test that runs code but would not notice it changing                                                                                                                                                                                                                                                                                                                                                    | not yet run on this package; the numbers below say "not measured" until it is                                                                   |
| Doc samples             | a documentation sample that no longer matches the code: every TypeScript sample on these pages is compiled against the package's types and run against the built package, and its `// =>` values are checked                                                                                                                                                                                              | prose that is wrong beside a sample that is right                                                                                               |
| PHI scan                | a realistic patient identifier in a fixture or a staged file, against a declared allow list of synthetic values                                                                                                                                                                                                                                                                                           | anything outside the shapes it knows; it detects after a write, it does not prevent one                                                         |

## How each one runs

- **Unit tests, corpora, the conformance declaration, properties and doc samples** run in one Vitest
  suite on every pull request and on `main`, on Node.js 22, 24 and 26. Property tests run against a
  pinned global seed (`test/setup.fast-check.ts`), so coverage is reproducible and a failure replays
  exactly; a test may pass a seed of its own. Nine of them prove the three properties every Cosyte
  parser proves (round trip, idempotent normalize, and never throws in lenient mode) on the
  generators we publish at `@cosyte/x12/arbitraries`: they run 100 cases each,
  `COSYTE_PROPERTY_RUNS` sets a deeper run, and a failure prints the seed and path that replay it.
  [Property-test your code](./property-test-your-code.md) shows those generators on code of your
  own.
- **Fuzzing** runs at its committed case counts in that suite, and every night for a time budget
  with a seed that changes each run. A failure prints the seed, and `X12_FUZZ_SEED=<seed> pnpm fuzz`
  replays it.
- **The coverage gate** runs with the suite. A floor that is not met fails the pull request, and a
  line no input can reach takes an inline exception naming its reason rather than a lower floor.
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
pnpm fuzz               # the property and fuzz layer on its own
pnpm phi-scan           # the PHI scan

# Differential testing fetches its two pinned Python readers through uv:
pnpm differential:check
```

## Current numbers

The numbers for this section are measured on `main` at each release and filled in when the release
is built. They are never typed by hand.

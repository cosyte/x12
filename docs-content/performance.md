---
id: performance
title: Performance
sidebar_label: Performance
description: "What we measure on @cosyte/x12 and how, the resource limits the fuzz cases hold the parser to, and what is not measured yet."
---

# Performance

This page describes what we measure on `@cosyte/x12`, how, and what we do not measure yet. The
shared method every Cosyte package follows (throughput, latency percentiles, memory, import time
and bundle size, and how a pull request is compared with `main`) is written down in the performance
standard in
[cosyte/config's decision records](https://github.com/cosyte/config/tree/main/documentation/decisions).
The numbers for the current release are in [Current numbers](#current-numbers) below.

## What runs today

A benchmark suite measures the built package on synthetic documents in the shapes real traffic has:
an 835 remittance, 837P and 837I claim batches, a 270 and the 271 that answers it, a 999, a 997, and
a 275 attachment with one large payload. Each is parsed with `parseX12`, read with its typed reader (which
checks the loops, the balances and the code lists), and built with its builder, from the small
document a feed carries all day up to several megabytes. A reading reports throughput, latency
p50/p95/p99, allocations per operation, peak heap, whether the heap stays flat over a long run, and
the cold import with its gzipped size. On a pull request, CI times the base build against the head
build at the small sizes, interleaved on one runner; that comparison is advisory and fails nothing.

Beside it, a scaling gate fails a pull request when `parseX12`, any of the typed readers above or
any of their builders starts to cost more than its input grows: four times the documents, or
documents four times as large (four times the claims, the benefit lines, the acknowledged sets or
the payload octets), must cost close to four times as long. The 270 is one fixed question, so its
size axis is a batch of four times the inquiries. A self-check proves each gate's fixtures are
large enough to catch a quadratic path. The 276, 277, 278, 820, 834, 837D and TA1 readers and
builders have no benchmark shape and no scaling gate yet; the large 834 below is the one guard on
any of them.

The other guards fail on a class of slowdown rather than describe speed:

- **A time and memory budget on every fuzz case.** Each hostile input the fuzz targets generate
  must finish within a CPU-time budget that grows linearly with its length (250 ms plus 1 ms per 64
  bytes) and must not grow the heap and `ArrayBuffer` memory by more than 256 MiB. A case over
  either limit is run again, and fails when it is over on every run, so a garbage collection landing
  in one run is not mistaken for a hang. It is CPU time rather than wall-clock time, so a busy
  machine does not fail a case that was only waiting for a core.
- **A liveness scan of the builders.** Every indexed loop in every builder takes its bound from a
  checked array, and a source-level test holds every builder to that, because a builder that looped
  over a forged length would hang rather than fail, and a hang produces no test verdict at all.
- **A large 834.** `get834Enrollments` is read over a generated 834 of more than 10 MB (90,000
  members), and the test checks that it yields every member once, in order, and that a consumer can
  stop after the first few without draining the rest.

These catch a super-linear path, a hang and a runaway allocation; the benchmark suite is what
measures throughput, latency, peak memory, import time and bundle size.

## Large documents and the lazy parse

`parseX12` frames every segment and finds every warning during the parse, and splits a transaction
set's segments into elements the first time `segments` is read; `{ lazy: false }` splits them
during the parse. `readTransactionSets` reads an interchange as it arrives and yields one
transaction set at a time, holding about one set rather than the file.
[Read large files](./read-large-files.md) shows both.

- **Large documents, base and head.** `pnpm bench:large` (`bench/large.mjs`) times a 10,000-claim
  835 and 837P parsed, parsed and read by their typed readers, and read through
  `readTransactionSets`, with the peak heap of each, on two builds side by side in fresh processes.
  The bench workflow runs it on a pull request that changes `bench/`, the base build against the
  head, and shows every round in the job summary.
- **Bounded heap while streaming.** A test streams a generated interchange ten times larger than
  its heap budget through `readTransactionSets`, reading every transaction set with `get835`, and
  fails when the heap held after a forced collection grows past the budget. A control run that
  keeps every set shows the measurement sees retained heap.
- **A scaling gate on the lazy parse**, beside the gates on the parse that splits every segment.

## The cold import budget

Importing the package costs a process time before it parses anything, which matters most to a
short-lived process: a command-line tool, a serverless function, a test worker.
`pnpm check:cold-import` starts a new Node.js process twenty times, each timing one
`await import()` of the built `dist/index.mjs`, and fails when the median is over 15 ms. CI runs it
on a GitHub-hosted runner after every build, interleaved with imports of an empty module so a slow
runner shows as a slow empty import. Most of the import is compiling the one bundle; the built-in
profiles are built on first read rather than at import.

## What these are not

- **Not a guarantee for every input.** The benchmarks cover the shapes above, up to about 3 MiB of
  claims and a 4 MiB attachment; adversarial nesting is not characterized here.
- **Not a byte-streaming reader of one transaction set.** `readTransactionSets` holds one
  transaction set at a time, so a single transaction set as large as the file (a 10,000-claim 835)
  is held whole. `get834Enrollments` yields one member at a time from a transaction set already
  read, so the memory it saves is on the result side, not the input side.
- **Not a comparison with other libraries.** That is a separate suite with its own written method.

## Run the guards yourself

```bash
pnpm install --frozen-lockfile
pnpm fuzz                                        # the property and fuzz layer, with the case budgets
X12_FUZZ_SEED=12345 X12_FUZZ_SECONDS=60 pnpm fuzz  # a longer search with a seed of your choosing
pnpm test test/transactions-enrollment-834.test.ts
pnpm test:perf                                   # the scaling gate and its self-check
pnpm build && pnpm bench:reading                 # a reading of every benchmark, on this machine
pnpm build && pnpm bench:profile                 # a CPU and heap profile of the hottest paths
pnpm build && pnpm check:cold-import             # the cold import budget, on this machine
```

## Current numbers

The numbers for this section are measured on `main` at each release and filled in when the release
is built. They are never typed by hand.

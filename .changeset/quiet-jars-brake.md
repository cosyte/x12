---
"@cosyte/x12": patch
---

Stop the PHI-scanner suite paying 30 of its 32 `tsx` start-ups, and document what the global `testTimeout` does and does not cover. Test and config only: no library code, no public surface and no timeout value changed.

`test/scripts/phi-scan.test.ts` went from 32 spawns across 32 cases, all under `tsx`, to 36 spawns across 33 cases, 34 under `node` and 2 under `tsx`, counted at runtime on both trees. The scanner is type-annotated Node that needs erasing and nothing more and Node 22.18 or newer strips types itself, so the spawns now use `process.execPath`: a 441 ms median start becomes 149 ms, and that file goes 17.2 s to 8.6 s in-suite under coverage (interleaved BASE/HEAD, two rounds each, on a loaded 12-CPU box). The two `tsx` spawns that remain are one new case that keeps the substitution honest, driving both runners over the same violator and the same clean file and requiring the same exit code, stdout and stderr, since the gate consumers run still invokes `tsx`.

`vitest.config.ts` now records the measured scope of `testTimeout: 10_000`: the three slowest suites already carry per-test ceilings and one of them sits at the 10 s global, so a global raise would trade a false red for a false green; and a timeout is not a liveness net here, because an infinite synchronous loop wedges the worker with no verdict at all rather than failing it.

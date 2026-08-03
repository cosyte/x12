import { cosyteVitest } from "@cosyte/vitest-config";

/**
 * Vitest config for @cosyte/x12 from the shared @cosyte/vitest-config standard.
 *
 * Per-directory coverage gates (≥ 90 lines/branches/functions/statements):
 *   - `parser/` - envelope + segment + release-char (Phases 1 + 2)
 *   - `loops/` - defineLoopSpec (Phase 2)
 *   - `transactions/` - ack 999/TA1 (Phase 3) + remit 835 (Phase 4)
 *   - `code-lists/` - bundled WPC + X12-internal snapshots (Phase 4)
 *   - `serialize/` - spec-clean serializer (Phase 8)
 *   - `builder/` - general-purpose interchange builder (Phase 8)
 *   - `profiles/` - trading-partner profile system (Phase 9)
 */
export default cosyteVitest({
  coverageDirs: [
    "parser",
    "loops",
    "transactions",
    "code-lists",
    "serialize",
    "builder",
    "profiles",
  ],
  test: {
    globals: false,
    environment: "node",
    setupFiles: ["test/setup.fast-check.ts"],
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
    exclude: ["node_modules", "dist", "coverage", "test/fixtures/**"],
    /**
     * A GLOBAL FLOOR FOR ORDINARY TESTS. IT IS NOT WHERE SLOW WORK GETS ITS ROOM,
     * AND IT IS NOT A LIVENESS NET. Both halves of that were measured, not assumed.
     *
     * The shared `@cosyte/vitest-config` sets no timeout at all, so vitest's own
     * 5 s default would apply; this raises that floor to 10 s and nothing more.
     *
     * WHAT IT IS NOT FOR. A test that is genuinely slow takes a ceiling of its own,
     * as the third argument to `it`, and NEVER by raising this number. Raising the
     * global to fit the slowest test trades a false red for a false green: it hands
     * the same leash to all 1,100-odd tests, so a test that starts genuinely hanging
     * looks slow instead of broken. Three suites already carry their own, and they
     * are the three slowest things here:
     *   - `test/transactions-enrollment-834.test.ts` 120 s, the 10 MB+ stream
     *   - `test/scripts/attw-gate.test.ts`           60 s per case, each a real `npm pack`
     *   - `test/phi-diagnostic-surface.test.ts`      120 s, the 81-slot PHI sweep
     *
     * THE 834 STREAM IS THE PROOF THAT THIS NUMBER IS THE WRONG PLACE TO PUT ROOM,
     * AND IT IS NOT A HYPOTHETICAL. Under `pnpm test:coverage` on this box (12-CPU
     * cgroup quota, `availableParallelism()` 12, other workers running, load average
     * 8.9 to 11.3), across four interleaved runs it measured 8.9 s / 10.0 s / 9.3 s /
     * 9.1 s. That is AT this 10 s number, not comfortably under it. Do not read the
     * 10.0 s as a proven crossing: the reporter rounds, so it is not evidence of which
     * side of the bar that run fell on, and the point stands without it. Under heavier
     * load on the same box the same test measured 24.1 s, which is unambiguous. It is
     * green only because it carries its own 120 s ceiling. So the honest reading is
     * that the global has already been proven insufficient for the work that is
     * genuinely slow, and the remedy that worked was per-test, exactly as it should be.
     * The other two, same condition: attw's slowest case 3.9 s to 4.2 s, the PHI sweep
     * 2.7 s to 3.5 s (that suite's own comment carries an older, much larger figure for
     * the same test; see the note there, which was re-measured with this change).
     *
     * The slowest test left under THIS number is about 1.2 s, so the headroom is
     * roughly 8x and a global raise would buy nothing the per-test ceilings do not.
     *
     * WHAT IT CANNOT DO, WHICH IS THE PART PEOPLE ASSUME BACKWARDS. Vitest implements
     * a timeout as a timer racing the test, so it needs the event loop back to fire.
     * Measured on this tree with vitest 4.1.4, three probes under a deliberately tiny
     * per-test ceiling:
     *   - an ASYNC overrun         reds promptly, at the ceiling;
     *   - a FINITE SYNCHRONOUS overrun reds, but only AFTER the work returns, so the
     *     verdict is late and the wall clock is the work's, not the ceiling's;
     *   - an INFINITE SYNCHRONOUS loop produces NO VERDICT AT ALL. The worker wedges;
     *     the run had to be killed from outside (45 s, exit 143, no pass/fail line).
     * That last one is not hypothetical here: `X12-CALLER-VALUE-RESIDUALS` hit it for
     * real, where removing a `requireCallerArray` call spins a builder forever, and
     * the run had to be killed from outside at 60 s. So a liveness regression in this
     * library reads as an ABSENT verdict, not a red one, and no value of this number
     * changes that. The defence against it is the source-level scan in
     * `test/builder-array-bounds.test.ts`, not a timeout.
     *
     * WHEN THIS SUITE FLAKES, TRIM BEFORE YOU BOUND. A ceiling is for genuinely slow
     * work; it is not the answer to a repeated start-up tax, and it would have HIDDEN
     * this one. `test/scripts/phi-scan.test.ts` paid a `tsx` launch 32 times and now
     * pays it twice (Node 22.18 or newer strips types itself, so the rest spawn
     * `node`). Interleaved BASE/HEAD,
     * two rounds each, same condition as above: that file went 17.2 s / 17.5 s to
     * 8.6 s / 8.6 s in-suite, and 15.7 s to 6.6 s run on its own. Total CPU across all
     * workers (the sum of every file's duration) went 58.9 s / 58.4 s to 50.5 s / 49.5 s,
     * so about 8.6 s of CPU left the run. No ceiling anywhere was touched to get it.
     *
     * BE PRECISE ABOUT WHAT THAT DID AND DID NOT BUY, because the two diverge here.
     * It removed CPU, which is what matters when several workers share the box, but it
     * barely moved the suite's CRITICAL PATH: 17.2 s / 17.5 s to 16.3 s / 16.7 s, because
     * the longest file is now `attw-gate.test.ts` at 16.3 s / 16.6 s. That one is NOT a
     * start-up tax and is deliberately left alone: measured, one `attw --pack` on a
     * trivial two-file package is 1,596 ms median, of which the real `npm pack` is
     * 462 ms and the rest is attw's own analysis. There is no runner to substitute,
     * and pinning the REAL binary's behaviour is the entire point of that gate.
     */
    testTimeout: 10_000,
    hookTimeout: 10_000,
  },
});

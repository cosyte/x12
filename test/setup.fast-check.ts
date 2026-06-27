/**
 * Pin a global fast-check seed for the whole suite. The property/fuzz tests
 * (byte-flip fuzz, round-trip, lenient-parse) contribute to branch coverage,
 * so an unpinned seed makes coverage non-deterministic — the same code can
 * clear the per-directory 90% gate on one run and miss it on the next, and
 * the gap widens across V8 versions (CI runs Node 22 + 24). Pinning the seed
 * makes coverage reproducible and a failure replayable. Individual `fc.assert`
 * calls may still pass their own `seed` to override this default.
 */
import fc from "fast-check";

fc.configureGlobal({ seed: 0x12c0de });

/**
 * Pin a global fast-check seed for the whole suite. The property/fuzz tests
 * (byte-flip fuzz, round-trip, lenient-parse) contribute to branch coverage,
 * so an unpinned seed makes coverage non-deterministic - the same code can
 * clear the per-directory 90% gate on one run and miss it on the next, and
 * the gap widens across V8 versions (CI runs Node 22 + 24). Pinning the seed
 * makes coverage reproducible and a failure replayable. Individual `fc.assert`
 * calls may still pass their own `seed` to override this default.
 */
import fc from "fast-check";

/**
 * Default to a pinned seed for reproducible per-commit coverage. The
 * nightly fuzz workflow (`fuzz.yml`) sets `X12_FUZZ_SEED` to a rotating
 * value so each run explores a different slice of the input space; a
 * non-numeric override is ignored (falls back to the pinned seed) so a
 * malformed env var can never silently unpin the coverage-critical run.
 * A failure prints the counterexample and the effective seed, so any
 * nightly finding is replayable by re-running with the same
 * `X12_FUZZ_SEED`.
 */
const seedRaw = process.env["X12_FUZZ_SEED"];
const seedOverride = Number(seedRaw);
// Honor a non-blank, INTEGER override only. `Number("")` / `Number(" ")` are a
// finite `0` and `Number("12.5")` a non-integer, so a bare `Number.isFinite`
// guard would silently unpin the coverage seed on a blank or fractional env
// var - this mirrors `fuzzRuns()`'s rigor so a malformed value always falls
// back to the pinned seed rather than quietly changing it.
const useSeedOverride =
  seedRaw !== undefined && seedRaw.trim() !== "" && Number.isInteger(seedOverride);
fc.configureGlobal({ seed: useSeedOverride ? seedOverride : 0x12c0de });

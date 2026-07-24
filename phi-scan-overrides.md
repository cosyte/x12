# PHI-scan overrides

This log is the audit trail for `phi-scan --allow-fixture <path>` bypasses. A
bypass is **rejected** by `scripts/phi-scan.ts` unless this file contains a
matching `### <path>` subsection justifying why the fixture is safe despite
tripping the scanner.

Prefer extending `scripts/phi-allow-list.txt` (declaring the synthetic tokens)
over a whole-file override: an override silences _every_ check for that file.

There are no overrides at this time.

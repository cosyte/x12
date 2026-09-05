# PHI-scan overrides

This log is the audit trail for `phi-scan --allow-fixture <path>` bypasses. A
bypass is **rejected** by `scripts/phi-scan.ts` unless this file contains a
matching `### <path>` subsection justifying why the fixture is safe despite
tripping the scanner.

Prefer extending `scripts/phi-allow-list.txt` (declaring the synthetic tokens)
over a whole-file override.

**An override does not silence a check. It WITHDRAWS the file from the scan,
and since 2026-09-05 a run that enumerated a target and never read it REFUSES
(exit 2) after reporting the hits it did find.** So a bypass makes the run
report on the rest of the corpus and then decline to give any verdict at all,
which is the honest answer about a file nobody opened: a scan that did not read
a file has not found it clean. An entry here therefore buys a refusal rather
than a pass, and the way to make a run green is to declare the file's synthetic
tokens in `scripts/phi-allow-list.txt`.

**An entry is GLOBAL and ROUTE-BLIND:** it clears that path on `--staged`, the
commit-blocking route, exactly as it does on an explicit-path run.

There are no overrides at this time.

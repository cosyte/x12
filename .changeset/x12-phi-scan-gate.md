---
"@cosyte/x12": patch
---

PHI commit-gate — a zero-dependency, X12-shape-aware PHI scanner
(`scripts/phi-scan.ts`, run via `pnpm phi-scan`) now guards the synthetic
fixture corpus. It refuses any test fixture or `src/` file carrying
real-PHI-shaped tokens so a developer cannot commit a real-looking
interchange by accident. The scanner is wired into the pre-commit hook
(`simple-git-hooks` → `phi-scan --staged`) and into CI (the reusable
`cosyte/.github` pipeline's `run-phi-scan: true`), and it flips the local
`scripts/verify.sh` summary from `phi-scan SKIP` to `phi-scan ✓`.

X12 `.edi` files are byte-strict — the ISA segment must start at byte 0, so
an inline `# synthetic: true` header is impossible (it would break every
parser test). This mirrors the constraint DICOM hits with binary `.dcm`
files, so the same proven solution is used: a **synthetic allow-list**
(`scripts/phi-allow-list.txt`) is the positive declaration that a fixture's
names / dates-of-birth / ids / email-domains are fake. Any realistic-PHI
token outside the allow-list is a hit. ISA-detected files get a full
segment-aware scan — NM1 person-name tokens (entity-type-1) and SSN
qualifier `34`, MI member-id and XX NPI shapes, DMG date-of-birth (any
format qualifier, not just `D8`), and DTP / DTM / BHT / GS
service/transaction dates before 2024; every file additionally gets a
cross-cutting shape pass (dashed SSN, `REF*SY` SSN, non-test email domains).
Non-X12 targets (hand-written `src/`, plain text) get the conservative shape
pass only, so JSDoc `@example` snippets don't trip it.

A whole-file bypass requires `--allow-fixture <path>` **and** a matching
`### <path>` entry in the audit log `phi-scan-overrides.md`, so a silenced
file is always a reviewed, recorded act. Every subprocess is `git` invoked
through `execFileSync` with array args only — no shell form. Unit tests
cover a clean synthetic interchange, each violator class (real name,
pre-2024 date, off-allow-list DOB incl. a non-`D8` qualifier, member-id /
NPI / SSN shapes, non-test email), the plain-text pass, and both arms of the
override gate.

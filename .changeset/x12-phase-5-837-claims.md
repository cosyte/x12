---
"@cosyte/x12": patch
---

Phase 5 — 837 Healthcare Claim across the three HIPAA TR3s: `005010X222A2`
(Professional), `005010X223A3` (Institutional), `005010X224A2` (Dental). The
volume side of claims traffic. `get837Claims(delimiters, tx, opts?)` walks a
parsed 837 transaction set into the typed `X12_837Submission`: variant
detected from ST-03's implementation-convention reference (with SVx fall-back
and `X12_837_UNKNOWN_VARIANT` when neither resolves); submitter (Loop 1000A
NM1\*41); receiver (Loop 1000B NM1\*40); the full HL hierarchy (Loops 2000A
billing-provider / 2000B subscriber / 2000C patient); every claim header
(Loop 2300 CLM with patient-account number, total charge as `X12Decimal`,
composite POS/facility/frequency, signature/assignment/benefits/release-of-
information indicators); and every service line typed by variant
(`X12_837ServiceLineProfessional` SV1 with diagnosis pointers, modifiers,
emergency/EPSDT/family-planning indicators / `…Institutional` SV2 with
revenue code, optional procedure, line rate, non-covered charge / `…Dental`
SV3 with ADA CDT procedure + TOO tooth + surface codes). Loop 2410 LIN + CTP
drug identification (NDC + UCUM quantity, 837P). Loop 2430 SVD + CAS + DTP
line adjudication (COB) re-uses `X12RemitAdjustment` + `lookupCarc` from the
835 since CAS semantics are identical. Loop 2320 other-subscriber +
other-payer captured at the surface (detailed CAS / OI / MOA inside 2320
deferred to Phase 9, companion-guide profile system).

**HL parent-pointer integrity is the safety primitive.** Every HL with a
22 / 23 level code is validated: `HL-02` must reference an earlier-emitted
`HL-01`, AND that parent's `HL-03` level must match the TR3-required parent
(`22` → `20`, `23` → `22`). Violations emit `X12_HL_PARENT_MISMATCH` /
`X12_HL_PARENT_LEVEL_INVALID` — the parser NEVER silently re-numbers; the
verbatim declared parent id stays on the `X12HierarchicalLevel` entry.

**HI qualifier → code-system provenance** ships via the new
`src/code-lists/hi-qualifiers.ts` registry (ICD-10-CM principal `ABK` / other
`ABF` / admitting `ABJ` / reason-for-visit `ABN` / external-cause `APR`;
legacy ICD-9-CM `BK` / `BF` / `BJ` / `BN` / `BR`; ICD-10-PCS principal `BBQ`
/ other `BBR`; legacy ICD-9-PCS `BQ` / `BBA`; DRG `DR`; NUBC institutional
families `BG` condition / `BH` occurrence / `BI` occurrence-span / `BE`
value / `PR` patient-reason). Each `X12ClaimHiCode` ships the verbatim
qualifier AND resolved `X12HiCodeSystem` + `X12HiCategory`. Unknown
qualifiers emit `X12_UNKNOWN_HI_QUALIFIER` and resolve to `"unknown"` with
verbatim qualifier + code preserved. Helpers `resolveHiQualifier` /
`isDiagnosisQualifier` / `isProcedureQualifier` ship in the public surface.

Eleven dogfooded `LoopSpec` artifacts authored through the public
`defineLoopSpec()` API. Two new exported constants: `HL_LEVEL_CODES` and
`NM1_QUALIFIERS`. Five new warning factories (`hlParentMismatch`,
`hlParentLevelInvalid`, `unknownHiQualifier`, `missingRequiredLoop`,
`unknown837Variant`) each shape-validate echoed values through dedicated
regex patterns and substitute `(non-spec)` for hostile input — the H-PHI
invariant from `@cosyte/hl7`. The `missingRequiredLoop` rationale strings are
hard-coded literals; the typed model surfaces patient names / member IDs /
NPIs / claim numbers verbatim as the documented consumer-redaction boundary.

Six new shared element-read helpers in `src/parser/segment.ts` — `elementValue`
/ `elementOptional` / `componentOptional` / `elementDecimal` /
`elementDecimalOrZero` / `collectElementValues` — hoisted out of both the 835
and 837 walkers (which previously held byte-identical inline copies).
Additive public surface; no breaking change. The new `hi-qualifiers.ts`
joins the existing CARC / RARC / CLP_STATUS / CAGC family under
`src/code-lists/` and is re-exported from `@cosyte/x12` root.

Warning registry expanded 13 → 18 (additions-only): `X12_HL_PARENT_MISMATCH`,
`X12_HL_PARENT_LEVEL_INVALID`, `X12_UNKNOWN_HI_QUALIFIER`,
`X12_MISSING_REQUIRED_LOOP`, `X12_837_UNKNOWN_VARIANT`. Fatal registry
stays at 4. 10 synthetic fixtures land (3 Tier-1 canonical per variant + 6
Tier-2 quirk + 1 comprehensive). 56 new tests across 4 new files (Tier-1
unit, HI qualifier table, HL parent-integrity property, byte-flip fuzz at
300 runs × 6 fixtures = 1800 mutated inputs); 325 tests total (up from 269).
Verify gate green: typecheck + lint + format + coverage (96.91% stmts /
90.61% branches / 97.67% funcs / 98.49% lines; per-dir ≥90 on `parser/` +
`loops/` + `transactions/` + `code-lists/`) + build + attw + verify:exports.
`phi-scan` SKIP — unchanged from Phase 4, tracked as the `X12-PHI-SCAN`
backlog follow-up. Known v1 limitations called out in CHANGELOG (Loop
2320/2330 surface-only, Loop 2420 verbatim, no companion-guide enforcement,
no 837 builder — Phase 8).

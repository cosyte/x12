/**
 * **RARC — Remittance Advice Remark Codes.** Lives on 835 `MIA-05/MIA-20`,
 * `MOA-03..MOA-09`, `LQ-02` (when `LQ-01 = "HE"`), and `NTE` remittance
 * notes. Where CARC says *why* an adjustment was made, RARC adds *which
 * specific rule fired* — diagnostic granularity for appeals + cash-posting
 * triage. Misreading a code drives the wrong remediation path (appeal vs
 * write-off vs patient call).
 *
 * Source: **WPC (Washington Publishing Company)** — `x12.org/codes/
 * remittance-advice-remark-codes`. WPC updates monthly. Two prefix
 * conventions: `M`-prefix (legacy / fee-schedule-related, e.g. `M1`) and
 * `N`-prefix (introduced 2003+, e.g. `N4`). Both shapes co-exist in real
 * traffic; the parser treats them as one alphabetic-prefixed code space.
 *
 * **Pre-launch initial subset.** This snapshot covers ~15 of the most
 * commonly observed RARC codes. Unknown codes still parse fine
 * (verbatim); only the description is unavailable, and the 835 walker
 * emits `X12_UNKNOWN_RARC`.
 */

import { makeLookup, type CodeListEntry, type CodeListSnapshot } from "./meta.js";

/**
 * Bundled RARC snapshot. Companion to {@link "./carc.js".CARC}; same
 * freshness + safety posture. Use {@link lookupRarc} for the ergonomic
 * lookup.
 *
 * @example
 * ```ts
 * import { RARC } from "@cosyte/x12";
 * RARC.codes["N4"];   // "Missing/incomplete/invalid prior insurance carrier(s) EOB."
 * RARC.codes["MA01"]; // (or undefined if outside this subset)
 * ```
 */
export const RARC: CodeListSnapshot = Object.freeze({
  meta: Object.freeze({
    id: "RARC",
    description: "Remittance Advice Remark Codes",
    source: "WPC (Washington Publishing Company) — x12.org/codes/remittance-advice-remark-codes",
    publishedDate: "2026-03-01",
    snapshotDate: "2026-06-27",
    note: "Pre-launch initial subset (~15 most commonly observed codes). Phase 10 ships a full-regen script.",
  }),
  codes: Object.freeze({
    M1: "X-ray not taken within the past 12 months or near enough to the start of treatment.",
    M86: "Service denied because payment already made for same/similar procedure within set time frame.",
    M127: "Missing patient medical record for this service.",
    MA01: "Alert: If you do not agree with what we approved for these services, you may appeal our decision.",
    MA15: "Alert: Your claim has been separated to expedite handling. You will receive a separate notice for the other services reported.",
    N4: "Missing/incomplete/invalid prior insurance carrier(s) EOB.",
    N30: "Patient ineligible for this service.",
    N122: "Add-on code cannot be billed by itself.",
    N130: "Consult plan benefit documents/guidelines for information about restrictions for this service.",
    N179: "Additional information has been requested from the member. The charges will be reconsidered upon receipt of that information.",
    N522: "Duplicate of a previously processed claim/line.",
    N657: "This should be billed with the appropriate code for these services.",
  }),
});

/**
 * Look up a RARC code's bundled description. Same fail-safe semantics as
 * {@link "./carc.js".lookupCarc}: unknown codes return `undefined`, the
 * verbatim code is preserved on the parsed model, and the 835 walker
 * emits `X12_UNKNOWN_RARC`.
 *
 * @example
 * ```ts
 * import { lookupRarc } from "@cosyte/x12";
 * lookupRarc("N4")?.description; // "Missing/incomplete/invalid prior insurance carrier(s) EOB."
 * ```
 */
export const lookupRarc: (code: string) => CodeListEntry | undefined = makeLookup(RARC);
